import { useState, useEffect, useMemo } from "react";
import { today, fmtTR, fmtCur, parseMoney, trLower, isServisBorcluMu, isPartSaleBorcluMu, isServisUcretliMi, isParcaUcretliMi, isParcaBorcluAnlasmaliFirmaya, isCekVadesiGecmis, effectiveTeklifTur, teklifKullanildiMi, servisKanali, calcKDV, isYedekParcaBorcluMu, yedekParcaBedeli, parcaAdi, calcKalanBorc, calcCiro, sumPayments } from "../lib/utils";
import { kartTahsilEdildiMi, yansitilanKomisyon } from "../lib/krediKarti";
import { makeCanDo } from "../lib/permissions";
import { sonSatislar } from "../lib/dashboardStats";
import { StatCard, Modal, Btn, Icon } from "./ui";

export const Dashboard = ({ customers, dealers, services, stock = [], partSales = [], yedekParcaSatislar = [], parts = [], payments = [], rates, ratesErr, factory = null, onGoStock, onGoCustomers, onGoDealers, onGoDealerDebtors, onGoExpired, onGoDebtors, onGoCustomerDetail, onGoWarrantyActive, onGoSerialPending, teklifler = [], onDonusturTeklif = null, onDonusturMakina = null, onKaydetSatis = null, onDismissTeklif = null, serverPermissions = null, uretimFormlari = [], onGoUretim = null, gorusmeler = [], setGorusmeler = null, teklifTakipGun = 7, onOpenTeklif = null, onDismissTakip = null, kdvRates = [], onGoYedekParca = null }) => {
  const canCust = makeCanDo(serverPermissions, "customerActions");
  const canEvrak = makeCanDo(serverPermissions, "evrakActions");
  const [showDebtors, setShowDebtors] = useState(false);
  const [showDealerDebtors, setShowDealerDebtors] = useState(false);
  const [teklifBusy, setTeklifBusy]       = useState(new Set()); // kilit kontrolü devam eden teklif id'leri
  const [teklifConflict, setTeklifConflict] = useState({});      // { [id]: "kullanıcı adı" }

  // Butona tıklandığında kilidi dene; başkası işliyorsa engelle, başarılıysa action'ı çalıştır
  const withLock = (teklifId, action) => async () => {
    if (!window.crmLocks) { action(); return; }
    setTeklifBusy(s => new Set(s).add(teklifId));
    try {
      const result = await window.crmLocks.acquire("teklif", String(teklifId));
      if (result?.ok) {
        setTeklifConflict(m => { const n = { ...m }; delete n[teklifId]; return n; });
        action();
      } else {
        setTeklifConflict(m => ({ ...m, [teklifId]: result?.lockedBy || "başka kullanıcı" }));
      }
    } catch {
      action(); // bağlantı yoksa devam et (fail-open)
    } finally {
      setTeklifBusy(s => { const n = new Set(s); n.delete(teklifId); return n; });
    }
  };

  // Anlaşmalı servis ayrımı için (isServisUcretliMi/isServisBorcluMu'ya geçilir) — bkz. utils.js
  const factoryName = factory?.name || "Altuntaş Makina";

  // ── Canlı saat & tarih ──
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const saat = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const tarih = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;
  const todayStr = today(); // saat her saniye değiştiği için bu da gün değişiminde otomatik güncellenir (memo bağımlılığı)

  // Müşteri/servis/Extra Kalıp dizileri büyüdükçe (binlerce kayıt) bu taramalar her render'da
  // tekrarlanmasın diye memoize ediliyor — iç mantık aynı, sadece bir useMemo'ya taşındı.
  const { expiredCount, seriNoBekleyenCount, garantiDevamCount, borcluMusteriler, borcluServisler, borcluKaliplar, borcluYedekParcalar, borcluCount, dealerBorcMap, borcluBayiCount, recentSales, recentServices } = useMemo(() => {
    const expiredCount = customers.filter(c => c.warrantyEnd && c.warrantyEnd < todayStr).length;

    // ── Aksiyon gerektiren uyarılar ──
    const realCustomers = customers.filter(c => !c.isResale);
    const seriNoBekleyenCount = realCustomers.filter(c => c.seriNoBekliyor && !c.serialNo).length;
    // Garantisi hâlâ devam eden (henüz bitmemiş) makineler
    const garantiDevamCount = realCustomers.filter(c => c.warrantyEnd && c.warrantyEnd >= todayStr).length;

    // ── Borçlu firmalar — müşteri borcu + servis/parça borcu + Extra Kalıp borcu (3 ayrı kaynak) ──
    // isResale (2. el devir) burada hariç tutulmuyor — devir öncesi ödenmemiş bakiye varsa
    // Müşteriler sayfasıyla tutarlı olarak burada da borçlu sayılır.
    // Kalan borç = max(kayıtlı, CANLI). Canlı hesap blokajlı kredi kartı / tahsil edilmemiş çeki borçta
    // gösterir (ör. ilk satış kredi kartı tek çekim — kayıtlı kalanBorc yanlışlıkla 0 kalmış olabilir);
    // max() ise kayıtlı kalanBorc'u olan ama ciro alanı olmayan (içe aktarılmış/eski) kayıtları gizlemez.
    const musteriKalan = (c) => Math.max(parseMoney(c.kalanBorc), calcKalanBorc(c, payments, kdvRates));
    const borcluMusteriler = customers.filter(c => musteriKalan(c) > 0);
    const borcluServisler = services.filter(s => isServisBorcluMu(s, factoryName));
    const borcluKaliplar = partSales.filter(isPartSaleBorcluMu);
    // Müşteriye yapılan yedek parça (kargo VEYA fabrika teslim) satışı ödenmemişse müşteri borcudur
    // (alıcı bayi olanlar Borçlu Bayi/Servis kutusuna gider, burada değil).
    const borcluYedekParcalar = (yedekParcaSatislar || []).filter(s => s.aliciTipi === "musteri" && isYedekParcaBorcluMu(s));
    const custNameLocal = (id) => customers.find(c => c.id === id)?.name || "—";
    // Aynı firmanın birden çok makinası (customer kaydı) veya birden çok servis/parça borcu
    // olabilir — bunlar farklı "firma" sayılmasın diye firma adına (case-insensitive) göre tekilleştir.
    const borcluFirmaKeys = new Set([
      ...borcluMusteriler.map(c => trLower(c.name)),
      ...borcluServisler.map(s => trLower(custNameLocal(s.customerId))),
      ...borcluKaliplar.map(p => trLower(custNameLocal(p.customerId))),
      ...borcluYedekParcalar.map(s => trLower(custNameLocal(Number(s.musteriId)))),
    ]);
    const borcluCount = borcluFirmaKeys.size;

    // ── Borçlu Bayi/Servis — bir bayinin/anlaşmalı servis firmasının Altuntaş'a ödenmemiş borcu,
    // ÜÇ kaynaktan: (1) serviste üstlendiği parça borcu, (2) satın aldığı yedek parça (kargo),
    // (3) sattığı Extra Kalıp bedeli (satisFirma = firma; borç satıcı firmaya atfedilir). Firma adına göre gruplanır.
    const dealerBorcMap = {};
    // byCur = net+komisyon (gross), kdvByCur = KDV. Firma başlığındaki toplam = byCur + kdvByCur (KDV+komisyon dahil).
    const ensureBayi = (name) => (dealerBorcMap[name] = dealerBorcMap[name] || { byCur: {}, kdvByCur: {}, servisler: [], yedekler: [], kaliplar: [] });
    services.forEach(s => {
      if (!isParcaBorcluAnlasmaliFirmaya(s, factoryName)) return;
      const m = ensureBayi(s.islemFirma);
      const curK = s.parcaCurrency || s.currency || "TRY";
      m.byCur[curK] = (m.byCur[curK] || 0) + parseMoney(s.parcaUcreti);
      m.kdvByCur[curK] = (m.kdvByCur[curK] || 0) + calcKDV(s.faturaTipi, parseMoney(s.parcaUcreti), s.date, kdvRates);
      m.servisler.push(s);
    });
    (yedekParcaSatislar || []).forEach(s => {
      if (s.aliciTipi === "musteri" || !isYedekParcaBorcluMu(s)) return;
      const bayi = (dealers || []).find(d => d.id === Number(s.dealerId));
      if (!bayi?.name) return;
      const m = ensureBayi(bayi.name);
      const curK = s.currency || "TRY";
      m.byCur[curK] = (m.byCur[curK] || 0) + yedekParcaBedeli(s);
      m.kdvByCur[curK] = (m.kdvByCur[curK] || 0) + calcKDV(s.faturaTipi, yedekParcaBedeli(s), s.tarih, kdvRates);
      m.yedekler.push(s);
    });
    partSales.forEach(p => {
      if (p.tur !== "Kalıp" || !isPartSaleBorcluMu(p)) return;
      const firma = p.satisFirma === "Diğer" ? (p.satisFirmaAd || "Diğer") : p.satisFirma;
      if (!firma || firma === factoryName) return; // fabrika satışı → müşteri borcu, bayi borcu değil
      const m = ensureBayi(firma);
      const curK = p.currency || "TRY";
      m.byCur[curK] = (m.byCur[curK] || 0) + parseMoney(p.ucret);
      m.kdvByCur[curK] = (m.kdvByCur[curK] || 0) + calcKDV(p.faturaTipi, parseMoney(p.ucret), p.tarih, kdvRates);
      m.kaliplar.push(p);
    });
    const borcluBayiCount = Object.keys(dealerBorcMap).length;

    // Son Satışlar: makina + Extra Kalıp + yedek parça (kargo) satışları birlikte.
    const recentSales = sonSatislar(customers, partSales, yedekParcaSatislar, dealers, parts, 20);
    const recentServices = [...services].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 20);

    return { expiredCount, seriNoBekleyenCount, garantiDevamCount, borcluMusteriler, borcluServisler, borcluKaliplar, borcluYedekParcalar, borcluCount, dealerBorcMap, borcluBayiCount, recentSales, recentServices };
  }, [customers, services, partSales, yedekParcaSatislar, dealers, parts, payments, kdvRates, todayStr, factoryName]);

  const donusturBekleyenlar = useMemo(() => {
    const bekleyenler = teklifler.filter(t => {
      if (t.durum !== "onaylandi" || t.deletedAt || teklifKullanildiMi(t, customers, partSales)) return false;
      if (!t.customerId) return true; // müşteri bağlanmamış → her zaman göster
      const tur = effectiveTeklifTur(t);
      return tur === "makina" || tur === "parca" || tur === "kalip"; // bağlı + işlem gerektiren tur
    });
    // Teklif + ondan türeyen proforma ikisi birden bekliyorsa yalnız proforma gösterilir
    // (belge zincirinin son hali); proforma listede yoksa teklif görünmeye devam eder
    const proformaParentIds = new Set(bekleyenler.filter(t => t.type === "proforma" && t.parentTeklifId).map(t => t.parentTeklifId));
    return bekleyenler.filter(t => !(t.type !== "proforma" && proformaParentIds.has(t.id)));
  }, [teklifler, customers, partSales]);

  const pendingKaliplarCount = useMemo(() => {
    let count = 0;
    for (const c of customers) {
      for (const k of (c.kaliplar || [])) {
        if (k.uretimFormGonder && !k.uretimFormId) count++;
      }
    }
    for (const ps of partSales) {
      if (ps.uretimFormGonder && !ps.uretimFormId && !ps.deletedAt) count++;
    }
    return count;
  }, [customers, partSales]);

  // Aranacaklar: takip tarihi gelmiş/geçmiş, tamamlanmamış görüşmeler (F7)
  const aranacaklar = useMemo(() =>
    gorusmeler
      .filter(g => !g.deletedAt && g.takipTarihi && !g.tamamlandi && g.takipTarihi <= todayStr)
      .sort((a, b) => (a.takipTarihi || "").localeCompare(b.takipTarihi || "")),
  [gorusmeler, todayStr]);

  // Takip edilecek teklifler: gönderildi durumunda X günden uzun süredir cevapsız (F5)
  const takipTeklifler = useMemo(() => {
    const esik = new Date(); esik.setDate(esik.getDate() - (teklifTakipGun || 7));
    const esikStr = esik.toISOString().slice(0, 10);
    return teklifler
      .filter(t => t.type === "teklif" && t.durum === "gonderildi" && !t.deletedAt && !t.takipKapali && t.tarih && t.tarih <= esikStr)
      .sort((a, b) => (a.tarih || "").localeCompare(b.tarih || ""));
  }, [teklifler, teklifTakipGun]);
  const gunFarki = (tarih) => Math.max(0, Math.floor((new Date(todayStr) - new Date(tarih)) / 86400000));

  // Beklenen tahsilat: tahsil edilmemiş ÇEKLERİN HEPSİ + açık TAKSİTLERİN HEPSİ + BLOKE KREDİ KARTI
  // (tek çekimde para blokaj süresince hesaba geçmez → hesaba geçiş tarihine kadar beklenen tahsilat).
  // Kullanıcı isteğiyle gün penceresi kısıtlaması yok — vadesi olan tüm bekleyenler görünür. (F3+F10)
  const beklenenTahsilat = useMemo(() => {
    const items = [];
    const kdvli = (tutar, faturaTipi, tarih) => parseMoney(tutar) + calcKDV(faturaTipi, tutar, tarih, kdvRates);
    // Tahsil edilmemiş çekler — makina ödemesi + Extra Kalıp + Yedek Parça (vade tarihi olmasa da göster).
    payments.forEach(p => {
      if (p.yontem === "Çek" && !p.tahsilEdildi && !p.deletedAt)
        items.push({ key: `cek-${p.id}`, tip: "Çek", kaynak: "payment", recId: p.id, customerId: p.customerId, vade: p.vadeTarihi || "", tutar: parseMoney(p.tutar), currency: p.currency });
    });
    partSales.forEach(ps => {
      if (ps.yontem === "Çek" && !ps.tahsilEdildi && !ps.deletedAt)
        items.push({ key: `cekps-${ps.id}`, tip: "Çek", kaynak: "kalip", recId: ps.id, customerId: ps.customerId, vade: ps.vadeTarihi || "", tutar: kdvli(ps.ucret, ps.faturaTipi, ps.tarih), currency: ps.currency });
    });
    yedekParcaSatislar.forEach(s => {
      if (!(s.yontem === "Çek" && !s.tahsilEdildi && !s.deletedAt)) return;
      const bedel = (parseInt(s.miktar) || 0) * parseMoney(s.birimFiyat);
      const base = { key: `cekyp-${s.id}`, tip: "Çek", kaynak: "yedek", recId: s.id, vade: s.vadeTarihi || "", tutar: bedel + calcKDV(s.faturaTipi, bedel, s.tarih, kdvRates), currency: s.currency };
      if (s.aliciTipi === "musteri") items.push({ ...base, customerId: s.musteriId });
      else items.push({ ...base, customerId: null, firmaAd: s.disFirma ? (s.disFirmaAd || "Dış firma") : (dealers.find(d => d.id === Number(s.dealerId))?.name || "Bayi") });
    });
    services.forEach(s => {
      if (!(s.yontem === "Çek" && !s.tahsilEdildi && !s.deletedAt)) return;
      const bedel = parseMoney(s.servisUcreti) + (s.parcaUcretsizMi ? 0 : parseMoney(s.parcaUcreti)); // servis + ücretli parça
      items.push({ key: `ceksv-${s.id}`, tip: "Çek", kaynak: "servis", recId: s.id, customerId: s.customerId, vade: s.vadeTarihi || "", tutar: bedel + calcKDV(s.faturaTipi, bedel, s.date, kdvRates), currency: s.currency });
    });
    customers.forEach(c => (c.odemePlani || []).forEach(r => {
      if (!r.odemeId && r.vadeTarihi)
        items.push({ key: `tk-${c.id}-${r.id}`, tip: "Taksit", kaynak: "taksit", recId: r.id, customerId: c.id, vade: r.vadeTarihi, tutar: r.tutar, currency: c.currency });
    }));
    // Bloke kredi kartı: blokajGun>0 ve henüz hesaba geçmemiş (kartTahsilEdildiMi false) → hesaba geçiş tarihi vade.
    const bloke = (kk) => kk && Number(kk.blokajGun) > 0 && !kartTahsilEdildiMi(kk, todayStr);
    const kartTutar = (kk) => (Number(kk?.netTutar) || 0) + (Number(kk?.toplamKesinti) || 0); // çekilen kart tutarı (KDV dahil)
    payments.forEach(p => {
      if (p.yontem === "Kredi Kartı" && !p.deletedAt && bloke(p.kartKomisyonu))
        // Çekilen kart tutarı (Bloke = net + komisyon) — kalıp/yedek/servis kredi kartı satırlarıyla tutarlı.
        items.push({ key: `kk-${p.id}`, tip: "Kredi Kartı", kaynak: "payment", recId: p.id, customerId: p.customerId, vade: p.kartKomisyonu.hesabaGecis, tutar: kartTutar(p.kartKomisyonu), currency: p.currency });
    });
    partSales.forEach(ps => {
      if (ps.yontem === "Kredi Kartı" && ps.odendi && !ps.deletedAt && bloke(ps.kartKomisyonu))
        items.push({ key: `kkps-${ps.id}`, tip: "Kredi Kartı", kaynak: "kalip", recId: ps.id, customerId: ps.customerId, vade: ps.kartKomisyonu.hesabaGecis, tutar: kartTutar(ps.kartKomisyonu), currency: ps.currency });
    });
    yedekParcaSatislar.forEach(s => {
      if (!(s.yontem === "Kredi Kartı" && s.odendi && !s.deletedAt && bloke(s.kartKomisyonu))) return;
      const base = { key: `kkyp-${s.id}`, tip: "Kredi Kartı", kaynak: "yedek", recId: s.id, vade: s.kartKomisyonu.hesabaGecis, tutar: kartTutar(s.kartKomisyonu), currency: s.currency };
      if (s.aliciTipi === "musteri") items.push({ ...base, customerId: s.musteriId });
      else items.push({ ...base, customerId: null, firmaAd: s.disFirma ? (s.disFirmaAd || "Dış firma") : (dealers.find(d => d.id === Number(s.dealerId))?.name || "Bayi") });
    });
    services.forEach(s => {
      if (!(s.yontem === "Kredi Kartı" && s.odendi && !s.deletedAt && bloke(s.kartKomisyonu))) return;
      items.push({ key: `kksv-${s.id}`, tip: "Kredi Kartı", kaynak: "servis", recId: s.id, customerId: s.customerId, vade: s.kartKomisyonu.hesabaGecis, tutar: kartTutar(s.kartKomisyonu), currency: s.currency });
    });
    return items.sort((a, b) => (a.vade || "9999").localeCompare(b.vade || "9999")); // vadesiz olanlar sona
  }, [payments, customers, partSales, yedekParcaSatislar, services, dealers, todayStr, kdvRates]);

  const custName = (id) => customers.find(c => c.id === id)?.name || "—";
  const goToCustomer = (id, odak) => { setShowDebtors(false); setShowDealerDebtors(false); onGoCustomerDetail && onGoCustomerDetail(id, odak); };

  // Ödeme tipi pili (Borçlu Firmalar): tip → renk. Beklenen Tahsilat rozetleriyle aynı renk düzeni.
  const PIL_BASE = { display: "inline-flex", alignItems: "center", fontSize: 10, fontWeight: 800, borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" };
  const yontemRenk = (yontem, gecikti = false) => {
    if (yontem === "Çek") return gecikti ? { background: "var(--redBg2, #fee2e2)", color: "var(--red800, #991b1b)" } : { background: "var(--ambBg2, #fef3c7)", color: "var(--amb800, #92400e)" };
    if (yontem === "Kredi Kartı") return { background: "var(--purBg2, #ede9fe)", color: "var(--purTx, #7c3aed)" };
    if (yontem === "Taksit" || yontem === "Havale") return { background: "var(--bluBg2, #dbeafe)", color: "var(--blu700, #1d4ed8)" };
    return { background: "var(--n150, #f1f5f9)", color: "var(--n600, #475569)" }; // Nakit vb.
  };
  // Borçlu Bayi/Servis kart içi kayıt satırı (servis/yedek parça/kalıp) ortak stili.
  const BORC_SATIR = { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: 12, padding: "5px 0", borderTop: "1px solid var(--ambBr, #fde68a)" };
  const BORC_LINK = { color: "var(--amb800, #92400e)", fontWeight: 600, textDecoration: "underline", textDecorationColor: "var(--ambBr, #fde68a)" };
  // Müşteri kalan borcunun içindeki bekleyen ödeme kalemleri — tutarlı + tıklanınca ilgili kayda highlight.
  // Çek/Kredi Kartı → payment (odemeId), Taksit → ödeme planı satırı (taksitId).
  const musteriBorcKalemleri = (c) => {
    const kalemler = [];
    payments.filter(p => p.customerId === c.id && !p.deletedAt && p.yontem === "Çek" && !p.tahsilEdildi)
      .forEach(p => kalemler.push({ tip: "Çek", tutar: parseMoney(p.tutar), currency: p.currency || c.currency, odak: { odemeId: p.id }, gecikti: isCekVadesiGecmis(p) }));
    (c.odemePlani || []).filter(r => !r.odemeId && r.vadeTarihi)
      .forEach(r => kalemler.push({ tip: "Taksit", tutar: parseMoney(r.tutar), currency: c.currency, odak: { taksitId: r.id } }));
    payments.filter(p => p.customerId === c.id && !p.deletedAt && p.yontem === "Kredi Kartı" && p.kartKomisyonu && Number(p.kartKomisyonu.blokajGun) > 0 && !kartTahsilEdildiMi(p.kartKomisyonu, todayStr))
      .forEach(p => {
        // Makina net + KDV kırılımı (bbbb servisi gibi): p.tutar = borçtan düşen (KDV dahil, yansıtılan
        // komisyon hariç). k=KDV oranı, kom=yansıtılan komisyon → makina=(dahil−kom·k)/(1+k) her iki modda tam.
        const kdvOran = calcKDV(c.faturali, 100, c.installDate, kdvRates); // faturalı yurtiçi → oran%, değilse 0
        const dahil = parseMoney(p.tutar);
        const kom = p.kartKomisyonu.yansitildi ? (Number(p.kartKomisyonu.toplamKesinti) || 0) : 0;
        const kk = kdvOran / 100;
        const makina = (dahil - kom * kk) / (1 + kk); // net makina bedeli (KDV + yansıtılan komisyon hariç)
        const kdv = dahil - makina;
        kalemler.push({ tip: "Kredi Kartı", tutar: dahil, makina, kdv, currency: p.currency || c.currency, odak: { odemeId: p.id }, kk: p.kartKomisyonu });
      });
    return kalemler;
  };
  // Kredi kartı borç kaleminin müşteri-modeli gibi kırılımı: bloke tutar → hesaba geçiş tarihi, komisyon, taksit.
  const KK_DETAY = { background: "var(--purBg, #f5f3ff)", color: "var(--purTx, #7c3aed)" };
  const KDV_RENK = { background: "var(--bluBg, #eff6ff)", color: "var(--blu600, #2563eb)" }; // faturalı satışta ayrı KDV pili
  const kkDetayPilleri = (kk, currency) => {
    if (!kk) return [];
    const arr = [];
    const komisyon = Number(kk.toplamKesinti) || 0;
    const bloke = (Number(kk.netTutar) || 0) + komisyon; // çekilen (bloke edilen) kart tutarı
    // Komisyon YALNIZ müşteriye yansıtıldıysa gösterilir (o zaman fiyat pilinden ayrılmış net tutarı tamamlar);
    // biz üstlendiysek komisyon müşterinin borcu değil, ayrı pil olarak göstermeyiz.
    if (komisyon > 0 && kk.yansitildi) arr.push({ metin: `Komisyon: ${fmtCur(komisyon, currency)}`, renk: KK_DETAY });
    if (Number(kk.taksit) > 1) arr.push({ metin: `${kk.taksit}× taksit`, renk: KK_DETAY });
    // Bloke (hesaba geçiş) EN SONA: tutar/komisyon/KDV kırılımından sonra, tahsilat zamanlaması bilgisi.
    if (Number(kk.blokajGun) > 0 && kk.hesabaGecis && !kartTahsilEdildiMi(kk, todayStr))
      arr.push({ metin: `Bloke: ${fmtCur(bloke, currency)} → ${fmtTR(kk.hesabaGecis)}`, renk: { background: "var(--ambBg2, #fef3c7)", color: "var(--amb800, #92400e)" } });
    return arr;
  };

  return (
    <div>
      {/* Üst şerit: solda döviz kurları (yan yana), sağda tarih & saat */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "stretch", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ background: "var(--surface, #ffffff)", borderRadius: 12, padding: "10px 18px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--n400, #94a3b8)", letterSpacing: .5, textTransform: "uppercase" }}>Döviz Kurları</span>
          {rates ? (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                <span style={{ fontSize: 11, color: "var(--n500, #64748b)", fontWeight: 600 }}>💵 USD / TL</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: "var(--grn600, #16a34a)", fontVariantNumeric: "tabular-nums" }}>{rates.usd.toFixed(2)} ₺</span>
              </div>
              {rates.eur && (
                <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                  <span style={{ fontSize: 11, color: "var(--n500, #64748b)", fontWeight: 600 }}>💶 EUR / TL</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "var(--blu600, #2563eb)", fontVariantNumeric: "tabular-nums" }}>{rates.eur.toFixed(2)} ₺</span>
                </div>
              )}
            </>
          ) : ratesErr ? (
            <span style={{ fontSize: 12, color: "var(--n400, #94a3b8)" }}>Kurlar şu an alınamadı.</span>
          ) : (
            <span style={{ fontSize: 12, color: "var(--n400, #94a3b8)" }}>Yükleniyor...</span>
          )}
        </div>
        <div style={{ background: "linear-gradient(135deg, #1f0d02, #3d1c06)", borderRadius: 12, padding: "10px 20px", boxShadow: "0 4px 16px rgba(0,0,0,.2)", display: "flex", alignItems: "center", gap: 14 }}>
          {/* Eşit genişlikli (monospace) yazı tipi: her rakam aynı genişlikte olsun ki saniye
              değişince metin genişliği (ve kutu) oynamasın. tabular-nums tek başına Windows'ta
              (Segoe UI) yeterli olmuyordu. */}
          <span style={{ fontSize: 18, fontWeight: 800, color: "#ff9d5c", fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace", fontVariantNumeric: "tabular-nums", letterSpacing: 1 }}>{saat}</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#d4a584", fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace", fontVariantNumeric: "tabular-nums", letterSpacing: 1 }}>{tarih}</span>
        </div>
      </div>

      {/* 10 sayı kutusu — 5 üstte, 5 altta (tasarım: revize 2) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard label="Toplam Müşteri"    value={customers.length}  sub="Görmek için tıkla" color="var(--brand, #e85d1a)" onClick={onGoCustomers} />
        <StatCard label="Toplam Bayi"       value={dealers.length}    sub="Görmek için tıkla" color="var(--blu500, #3b82f6)" onClick={onGoDealers} />
        <StatCard label="Stoktaki Makina"   value={stock.length}      sub="Görmek için tıkla" color="#8b5cf6" onClick={onGoStock} />
        <StatCard label="Servis Kayıtları"  value={services.length}   color="#f59e0b" />
        <StatCard label="Garanti Süresi Dolan" value={expiredCount}    sub="Görmek için tıkla" color="var(--red500, #ef4444)" onClick={onGoExpired} />
        <StatCard label="Borçlu Firma"       value={borcluCount}       sub="Görmek için tıkla" color="var(--red600, #dc2626)" onClick={() => setShowDebtors(true)} />
        <StatCard label="Borçlu Bayi/Servis" value={borcluBayiCount}   sub="Görmek için tıkla" color="#f59e0b" onClick={() => setShowDealerDebtors(true)} />
        <StatCard label="Garantisi Devam Eden" value={garantiDevamCount} sub="Görmek için tıkla" color="var(--grn600, #16a34a)" onClick={onGoWarrantyActive} />
        <StatCard label="Seri No Bekleyen"   value={seriNoBekleyenCount} sub="Görmek için tıkla" color="var(--cyan, #0891b2)" onClick={onGoSerialPending} />
        <StatCard label="Üretimde Bekleyen Kalıplar" value={pendingKaliplarCount} sub={onGoUretim ? "Forma git" : undefined} color="var(--purTx, #7c3aed)" onClick={onGoUretim || undefined} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Son Satışlar */}
        <div style={{ background: "var(--surface, #ffffff)", borderRadius: 12, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, color: "var(--n900, #0f172a)" }}>Son Satışlar</div>
            <div style={{ fontSize: 10.5, color: "var(--n400, #94a3b8)", marginTop: 3 }}>Makina, Extra Kalıp ve Yedek Parça satışlarını gösterir.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 5 }}>
              <span style={{ fontSize: 9, fontWeight: 800, borderRadius: 5, padding: "1px 6px", color: "var(--orTx, #c2410c)", background: "var(--ambBg3, #fff7ed)", border: "1px solid var(--ambBr, #fde68a)" }}>Makina</span>
              <span style={{ fontSize: 9, fontWeight: 800, borderRadius: 5, padding: "1px 6px", color: "var(--blu700, #1d4ed8)", background: "var(--bluBg, #eff6ff)", border: "1px solid var(--bluBr, #bfdbfe)" }}>Extra Kalıp</span>
              <span style={{ fontSize: 9, fontWeight: 800, borderRadius: 5, padding: "1px 6px", color: "var(--grn700, #15803d)", background: "var(--grnBg, #f0fdf4)", border: "1px solid var(--grnBr, #bbf7d0)" }}>Yedek Parça</span>
            </div>
          </div>
          {recentSales.map(r => {
            // Aramadaki gibi ilgili kayda git: kalıp → müşteri detayında highlight, yedek parça → Stok'taki satış,
            // makina → müşteri detayı. Böylece anasayfa satırları da menü aramasıyla aynı davranır.
            const tiklanabilir = r.tip === "yedek" ? (!!onGoYedekParca || r.custId != null) : r.custId != null;
            const git = () => {
              if (r.tip === "yedek") { if (onGoYedekParca) onGoYedekParca(r.recId); else if (r.custId != null) goToCustomer(r.custId); }
              else if (r.custId != null) goToCustomer(r.custId, r.tip === "kalip" ? { kalipId: r.recId } : undefined);
            };
            return (
              <div key={r.key} onClick={tiklanabilir ? git : undefined} title={tiklanabilir ? (r.tip === "yedek" ? "Yedek parça satışına git" : "Müşteri detayını aç") : undefined}
                style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--n150, #f1f5f9)", cursor: tiklanabilir ? "pointer" : "default" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--n100, #f8fafc)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    {/* Tür rozeti: Makina turuncu, Extra Kalıp mavi, Yedek Parça yeşil */}
                    <span style={{ fontSize: 10, fontWeight: 800, borderRadius: 6, padding: "2px 7px", flexShrink: 0,
                      color: r.tip === "makina" ? "var(--orTx, #c2410c)" : r.tip === "yedek" ? "var(--grn700, #15803d)" : "var(--blu700, #1d4ed8)",
                      background: r.tip === "makina" ? "var(--ambBg3, #fff7ed)" : r.tip === "yedek" ? "var(--grnBg, #f0fdf4)" : "var(--bluBg, #eff6ff)",
                      border: `1px solid ${r.tip === "makina" ? "var(--ambBr, #fde68a)" : r.tip === "yedek" ? "var(--grnBr, #bbf7d0)" : "var(--bluBr, #bfdbfe)"}` }}>
                      {r.tip === "makina" ? "Makina" : r.tip === "yedek" ? "Yedek Parça" : "Extra Kalıp"}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.ad}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2 }}>{r.detay}</div>
                </div>
                <div style={{ textAlign: "right", alignSelf: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--brand, #e85d1a)" }}>{fmtTR(r.tarih)}</div>
                  <div style={{ fontSize: 11, color: "var(--n400, #94a3b8)" }}>{(r.tip === "kalip" || r.tip === "yedek") ? fmtCur(r.tutar, r.currency) : r.konum}</div>
                </div>
              </div>
            );
          })}
          {recentSales.length === 0 && <div style={{ color: "var(--n400, #94a3b8)", fontSize: 13 }}>Henüz satış kaydı yok.</div>}
        </div>

        {/* Son Servisler */}
        <div style={{ background: "var(--surface, #ffffff)", borderRadius: 12, padding: 22, boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, color: "var(--n900, #0f172a)" }}>Son Servis Talepleri</div>
            <div style={{ fontSize: 10.5, color: "var(--n400, #94a3b8)", marginTop: 3 }}>Rozet servisi kimin yaptığını gösterir; parça ikonu (🔧) o serviste bizden yedek parça satıldığını belirtir.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 5 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 800, borderRadius: 5, padding: "1px 6px", color: "var(--grn700, #15803d)", background: "var(--grnBg, #f0fdf4)", border: "1px solid var(--grnBr, #bbf7d0)" }}>Fabrika</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 800, borderRadius: 5, padding: "1px 6px", color: "var(--teal, #0d9488)", background: "var(--tealBg, #f0fdfa)", border: "1px solid var(--tealBr, #99f6e4)" }}>Anlaşmalı Servis</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 800, borderRadius: 5, padding: "1px 6px", color: "var(--amb700, #b45309)", background: "var(--ambBg, #fffbeb)", border: "1px solid var(--ambBr, #fde68a)" }}>Dış Servis</span>
            </div>
          </div>
          {recentServices.map(sv => {
            const cust = customers.find(x => x.id === sv.customerId);
            // Servisi kimin yaptığı — HER serviste göster (fabrika servisleri de). Parça ikonu yalnız
            // o serviste bizden yedek parça satıldıysa görünür.
            const yp = servisKanali(sv, factoryName);
            const parcaSatildi = isParcaUcretliMi(sv);
            const ypStil = {
              bizim:          { et: "Fabrika",          fg: "var(--grn700, #15803d)", bg: "var(--grnBg, #f0fdf4)", br: "var(--grnBr, #bbf7d0)" },
              anlasmaliServis:{ et: "Anlaşmalı Servis", fg: "var(--teal, #0d9488)",                 bg: "var(--tealBg, #f0fdfa)",              br: "var(--tealBr, #99f6e4)" },
              disServis:      { et: "Dış Servis",       fg: "var(--amb700, #b45309)", bg: "var(--ambBg, #fffbeb)", br: "var(--ambBr, #fde68a)" },
            }[yp];
            return (
              <div key={sv.id} onClick={() => goToCustomer(sv.customerId, { servisId: sv.id })} title="Müşteri detayını aç"
                style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--n150, #f1f5f9)", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--n100, #f8fafc)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    {ypStil && (
                      <span title={parcaSatildi ? "Servisi yapan · bu serviste bizden yedek parça satıldı" : "Servisi yapan"} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 800, borderRadius: 6, padding: "2px 7px", flexShrink: 0, color: ypStil.fg, background: ypStil.bg, border: `1px solid ${ypStil.br}` }}>
                        {parcaSatildi && <Icon name="parts" size={10} />} {ypStil.et}
                      </span>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cust?.name || "—"}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--n500, #64748b)" }}>{cust?.model ? `${cust.model} · ` : ""}{sv.type}</div>
                </div>
                <div style={{ textAlign: "right", alignSelf: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--brand, #e85d1a)" }}>{fmtTR(sv.date)}</div>
                  <div style={{ fontSize: 11, color: "var(--n400, #94a3b8)" }}>{cust?.country || ""}{cust?.city ? ` / ${cust.city}` : ""}</div>
                </div>
              </div>
            );
          })}
          {services.length === 0 && <div style={{ color: "var(--n400, #94a3b8)", fontSize: 13 }}>Henüz servis kaydı yok.</div>}
        </div>
      </div>

      {/* Sıra 2: İşlem Bekleyen Onaylı Teklifler | Takip Edilecek Teklifler (50/50) — boş olsa da göster */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20, alignItems: "start" }}>
        <div style={{ background: "var(--surface, #ffffff)", borderTop: "3px solid var(--brand, #e85d1a)", borderRadius: 12, padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--amb800, #92400e)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            İşlem Bekleyen Onaylı Teklifler ({donusturBekleyenlar.length})
          </div>
          {donusturBekleyenlar.map(t => {
            const tur = effectiveTeklifTur(t);
            const busy     = teklifBusy.has(t.id);
            const conflict = teklifConflict[t.id];
            return (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                <div onClick={onOpenTeklif ? () => onOpenTeklif(t.id) : undefined} title={onOpenTeklif ? "Teklifi Aç" : undefined} style={{ cursor: onOpenTeklif ? "pointer" : "default", flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--n900, #0f172a)" }}>{t.firma || "—"}</span>
                  <span style={{ fontSize: 11, color: "var(--amb800, #92400e)", marginLeft: 8 }}>{t.no || ""}</span>
                  {t.tarih && <span style={{ fontSize: 11, color: "var(--amb700, #b45309)", marginLeft: 6 }}>· {fmtTR(t.tarih)}</span>}
                  <span style={{ fontSize: 10, marginLeft: 8, padding: "1px 6px", borderRadius: 6, background: "var(--ambBr3, #fed7aa)", color: "var(--amb800, #92400e)", fontWeight: 700 }}>
                    {tur === "makina" ? "Makina" : tur === "parca" ? "Yedek Parça" : tur === "kalip" ? "Kalıp" : "Diğer"}
                  </span>
                  {t.type === "proforma" && (
                    <span style={{ fontSize: 10, marginLeft: 6, padding: "1px 6px", borderRadius: 6, background: "var(--bluBg2, #dbeafe)", color: "var(--blu700, #1d4ed8)", fontWeight: 700 }}>Proforma</span>
                  )}
                  {conflict && (
                    <span style={{ fontSize: 11, marginLeft: 10, color: "var(--red700, #b91c1c)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Icon name="lock" size={11} /> {conflict} işliyor
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                  {tur === "makina" && !t.customerId && onDonusturTeklif && canCust("cust_add") && (
                    <Btn small disabled={busy || !!conflict} onClick={withLock(t.id, () => onDonusturTeklif(t))} style={{ background: conflict ? "var(--n200b, #e5e7eb)" : "var(--brand, #e85d1a)", color: conflict ? "#9ca3af" : "var(--surface, #ffffff)", border: "none" }}>
                      {busy ? "..." : "Müşteri Ekle"}
                    </Btn>
                  )}
                  {tur === "makina" && t.customerId && onDonusturMakina && canCust("cust_detail_add_machine") && (
                    <Btn small disabled={busy || !!conflict} onClick={withLock(t.id, () => onDonusturMakina(t))} style={{ background: conflict ? "var(--n200b, #e5e7eb)" : "var(--brand, #e85d1a)", color: conflict ? "#9ca3af" : "var(--surface, #ffffff)", border: "none" }}>
                      {busy ? "..." : "Makina Ekle"}
                    </Btn>
                  )}
                  {(tur === "parca" || tur === "kalip") && t.customerId && onKaydetSatis && canCust("cust_kalip_add") && (
                    <Btn small disabled={busy || !!conflict} onClick={withLock(t.id, () => onKaydetSatis(t))} style={{ background: conflict ? "var(--n200b, #e5e7eb)" : "var(--cyan, #0891b2)", color: conflict ? "#9ca3af" : "var(--surface, #ffffff)", border: "none" }}>
                      {busy ? "..." : "Satışa Dönüştür"}
                    </Btn>
                  )}
                  {(tur === "parca" || tur === "kalip") && !t.customerId && (
                    <span style={{ fontSize: 11, color: "var(--amb700, #b45309)", fontWeight: 600 }}>Müşteri bağlayın</span>
                  )}
                </div>
              </div>
            );
          })}
          {donusturBekleyenlar.length === 0 && <div style={{ color: "var(--n400, #94a3b8)", fontSize: 13, padding: "8px 0" }}>İşlem bekleyen onaylı teklif yok.</div>}
        </div>
        <div style={{ background: "var(--surface, #ffffff)", borderTop: "3px solid var(--blu700, #1d4ed8)", borderRadius: 12, padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--blu700, #1d4ed8)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 10 }}>
            Takip Edilecek Teklifler ({takipTeklifler.length}) <span style={{ fontWeight: 500, textTransform: "none" }}>· {teklifTakipGun} günden eski, cevapsız</span>
          </div>
          {takipTeklifler.map(t => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--n150, #f1f5f9)" }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{t.firma || "—"}</span>
                <span style={{ fontSize: 11, color: "var(--blu700, #1d4ed8)", marginLeft: 8 }}>{t.no || ""}</span>
                <span style={{ fontSize: 11, color: "var(--n500, #64748b)", marginLeft: 6 }}>· {gunFarki(t.tarih)} gün önce gönderildi</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {onOpenTeklif && <Btn small variant="ghost" onClick={() => onOpenTeklif(t.id)}>Teklifi Aç</Btn>}
                {onDismissTakip && canEvrak("evrak_teklif_edit") && <Btn small variant="ghost" onClick={() => onDismissTakip(t)} title="Bu teklif için bir daha hatırlatma">Takipten Kaldır</Btn>}
              </div>
            </div>
          ))}
          {takipTeklifler.length === 0 && <div style={{ color: "var(--n400, #94a3b8)", fontSize: 13, padding: "8px 0" }}>Takip edilecek teklif yok.</div>}
        </div>
      </div>

      {/* Sıra 3: Aranacaklar | Beklenen Tahsilat (50/50) — boş olsa da göster */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20, alignItems: "start" }}>
        <div style={{ background: "var(--surface, #ffffff)", borderTop: "3px solid var(--purTx, #7c3aed)", borderRadius: 12, padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--purTx, #7c3aed)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 10 }}>
            Aranacaklar ({aranacaklar.length})
          </div>
          {aranacaklar.map(g => {
            const gecikmeGun = gunFarki(g.takipTarihi);
            return (
              <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                <div style={{ cursor: "pointer", flex: 1 }} onClick={() => goToCustomer(g.customerId, { gorusmeId: g.id })} title="Müşteri detayını aç">
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{custName(g.customerId)}</span>
                  <span style={{ fontSize: 12, color: "var(--n500, #64748b)", marginLeft: 8 }}>{(g.not || "").slice(0, 80)}{(g.not || "").length > 80 ? "…" : ""}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 8, color: gecikmeGun > 0 ? "var(--red700, #b91c1c)" : "var(--purTx, #7c3aed)" }}>
                    {gecikmeGun > 0 ? `${gecikmeGun} gün gecikti` : "bugün"}
                  </span>
                </div>
                {setGorusmeler && canCust("cust_gorusme_add") && (
                  <Btn small variant="ghost" title="Takibi tamamlandı işaretle"
                    onClick={() => setGorusmeler(p => p.map(x => x.id === g.id ? { ...x, tamamlandi: true } : x))}>✓</Btn>
                )}
              </div>
            );
          })}
          {aranacaklar.length === 0 && <div style={{ color: "var(--n400, #94a3b8)", fontSize: 13, padding: "8px 0" }}>Aranacak (takip) kaydı yok.</div>}
        </div>
        <div style={{ background: "var(--surface, #ffffff)", borderTop: "3px solid var(--grn600, #16a34a)", borderRadius: 12, padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--grn700, #15803d)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 10 }}>
            Beklenen Tahsilat ({beklenenTahsilat.length}) <span style={{ fontWeight: 500, textTransform: "none" }}>· tahsil edilmemiş tüm çekler + açık taksitler + bloke kredi kartı</span>
          </div>
          {beklenenTahsilat.map(item => {
            const gecikti = item.vade && item.vade < todayStr;
            const isKart = item.tip === "Kredi Kartı";
            const rozetBg = item.tip === "Çek" ? "var(--ambBg2, #fef3c7)" : isKart ? "var(--purBg2, #ede9fe)" : "var(--bluBg2, #dbeafe)";
            const rozetFg = item.tip === "Çek" ? "var(--amb800, #92400e)" : isKart ? "var(--purTx, #7c3aed)" : "var(--blu700, #1d4ed8)";
            const ad = item.firmaAd || custName(item.customerId);
            // Aramadaki gibi ilgili kayda git: servis/kalıp müşteri detayında highlight, yedek parça Stok'a,
            // makina ödemesi/taksit müşteri detayı (bu ikisi için satır-bazlı highlight hedefi yok).
            const gitTahsilat = () => {
              if (item.kaynak === "yedek") { if (onGoYedekParca) onGoYedekParca(item.recId); else if (item.customerId != null) goToCustomer(item.customerId); }
              else if (item.customerId != null) goToCustomer(item.customerId, item.kaynak === "servis" ? { servisId: item.recId } : item.kaynak === "kalip" ? { kalipId: item.recId } : item.kaynak === "taksit" ? { taksitId: item.recId } : undefined);
            };
            const tahsilatTiklanabilir = item.kaynak === "yedek" ? (!!onGoYedekParca || item.customerId != null) : item.customerId != null;
            return (
              <div key={item.key} onClick={tahsilatTiklanabilir ? gitTahsilat : undefined} title={tahsilatTiklanabilir ? (item.kaynak === "yedek" ? "Yedek parça satışına git" : "Müşteri detayını aç") : undefined}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--n150, #f1f5f9)", cursor: tahsilatTiklanabilir ? "pointer" : "default" }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{ad}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, marginLeft: 8, padding: "1px 6px", borderRadius: 6, background: rozetBg, color: rozetFg }}>{item.tip}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 8, color: gecikti ? "var(--red700, #b91c1c)" : "var(--grn700, #15803d)" }}>
                    {!item.vade ? "vade belirtilmemiş" : gecikti ? `⚠ ${fmtTR(item.vade)} (gecikti)` : `${fmtTR(item.vade)}${isKart ? " (hesaba geçiş)" : ""}`}
                  </span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--grn700, #15803d)" }}>{fmtCur(item.tutar, item.currency)}</span>
              </div>
            );
          })}
          {beklenenTahsilat.length === 0 && <div style={{ color: "var(--n400, #94a3b8)", fontSize: 13, padding: "8px 0" }}>Bekleyen tahsilat yok.</div>}
        </div>
      </div>


      {/* Borçlu Firmalar */}
      {showDebtors && (
        <Modal wide title="Borçlu Firmalar" onClose={() => setShowDebtors(false)}>
          <div style={{ maxHeight: 480, overflowY: "auto" }}>
            {borcluMusteriler.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--n600, #475569)", marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>
                  Müşteriler ({borcluMusteriler.length})
                </div>
                {borcluMusteriler.map(c => {
                  const kalemler = musteriBorcKalemleri(c);
                  // Yansıtılan kart komisyonu (bloke kalemlerden) — sağdaki toplam bbbb servisi gibi net + KDV +
                  // KOMİSYON'u kapsasın (çekilen kart tutarı). Yansıtılmayan komisyon müşteri borcu değil → 0.
                  const komToplam = kalemler.reduce((s, k) => s + (k.kk && k.kk.yansitildi ? (Number(k.kk.toplamKesinti) || 0) : 0), 0);
                  // Yuvarlanmamış canlı kalan borç (ciro − alınan) + komisyon → Beklenen Tahsilat / müşteri modalıyla
                  // birebir aynı çıksın (calcKalanBorc'un Math.round'u ile komisyonu toplamak 1 TL saptırıyordu).
                  const sagToplam = Math.max(parseMoney(c.kalanBorc), calcCiro(c, kdvRates, payments) - sumPayments(c.id, payments)) + komToplam;
                  return (
                    <div key={c.id} onClick={() => goToCustomer(c.id)} title="Müşteri detayını aç"
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "var(--redBg, #fef2f2)", border: "1px solid var(--redBr, #fecaca)", marginBottom: 6, cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--redBg2, #fee2e2)"}
                      onMouseLeave={e => e.currentTarget.style.background = "var(--redBg, #fef2f2)"}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--n900, #0f172a)" }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: "var(--n400, #94a3b8)" }}>{c.model || "—"}{c.serialNo ? ` · ${c.serialNo}` : ""}</div>
                        {kalemler.length > 0 && (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                            {kalemler.flatMap((k, i) => {
                              const kkKalem = k.tip === "Kredi Kartı";
                              const base = (
                                <span key={`b${i}`} onClick={e => { e.stopPropagation(); goToCustomer(c.id, k.odak); }} title={`${k.tip} — kayda git`}
                                  style={{ ...PIL_BASE, ...yontemRenk(k.tip, k.tip === "Çek" && k.gecikti), cursor: "pointer" }}>
                                  {kkKalem ? "Kredi Kartı" : `${k.tip === "Çek" && k.gecikti ? "⚠ Çek" : k.tip}: ${fmtCur(k.tutar, k.currency)}`}
                                </span>
                              );
                              // Kredi Kartı kaleminde: Makina (net) → KDV → (komisyon/taksit/bloke), bbbb servisi gibi.
                              const detay = kkKalem ? [
                                <span key={`mk${i}`} style={{ ...PIL_BASE, ...yontemRenk("Kredi Kartı") }}>Makina: {fmtCur(k.makina, k.currency)}</span>,
                                ...(k.kdv > 0 ? [<span key={`kdv${i}`} style={{ ...PIL_BASE, ...KDV_RENK }}>KDV: {fmtCur(k.kdv, k.currency)}</span>] : []),
                                ...kkDetayPilleri(k.kk, k.currency).map((d, j) => (
                                  <span key={`d${i}-${j}`} style={{ ...PIL_BASE, ...d.renk }}>{d.metin}</span>
                                )),
                              ] : [];
                              return [base, ...detay];
                            })}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--red600, #dc2626)", flexShrink: 0, marginLeft: 10 }}>{fmtCur(sagToplam, c.currency)}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {borcluServisler.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--n600, #475569)", marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>
                  Servis ve Yedek Parça ({borcluServisler.length})
                </div>
                {borcluServisler.map(s => {
                  // Kayıt zaten borçlu listesinde (isServisBorcluMu). Tutarları göster — ödeme yöntemine bakma:
                  // kredi kartında odendi=true (kart çekildi) ama para bloke → yine borçlu, tutar görünmeli.
                  const servisBorclu = isServisUcretliMi(s, factoryName);
                  const parcaBorclu = isParcaUcretliMi(s);
                  // Komisyon müşteriye yansıtıldıysa servisUcreti/parcaUcreti komisyon DAHİL saklanır;
                  // pilde net (komisyonsuz) fiyatı göster, komisyonu ayrı pilde (kkDetayPilleri). Oransal böl.
                  const svKomisyon = yansitilanKomisyon(s);
                  const stServis = parseMoney(s.servisUcreti), stParca = parseMoney(s.parcaUcreti);
                  const stToplam = stServis + (s.parcaUcretsizMi ? 0 : stParca);
                  const netServis = svKomisyon > 0 && stToplam > 0 ? stServis - svKomisyon * stServis / stToplam : stServis;
                  const netParca = svKomisyon > 0 && stToplam > 0 ? stParca - svKomisyon * stParca / stToplam : stParca;
                  const svKdv = calcKDV(s.faturaTipi, stToplam, s.date, kdvRates); // faturalı yurtiçi → matrah×oran, değilse 0
                  const svToplam = (servisBorclu ? netServis : 0) + (parcaBorclu ? netParca : 0); // net (komisyonsuz, KDV hariç); sağdaki toplam bunun üzerine komisyon + KDV ekler
                  return (
                    <div key={s.id} onClick={() => goToCustomer(s.customerId, { servisId: s.id })} title="Servisi müşteri detayında aç"
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "var(--redBg, #fef2f2)", border: "1px solid var(--redBr, #fecaca)", marginBottom: 6, cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--redBg2, #fee2e2)"}
                      onMouseLeave={e => e.currentTarget.style.background = "var(--redBg, #fef2f2)"}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--n900, #0f172a)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          {custName(s.customerId)}
                          {s.yontem && <span style={{ ...PIL_BASE, ...yontemRenk(s.yontem, s.yontem === "Çek" && isCekVadesiGecmis(s)) }}>{s.yontem === "Çek" && isCekVadesiGecmis(s) ? "⚠ Çek" : s.yontem}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--n400, #94a3b8)" }}>{s.type} · {fmtTR(s.date)}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                          {servisBorclu && <span style={{ ...PIL_BASE, ...yontemRenk(s.yontem || "") }}>Servis: {fmtCur(netServis, s.currency)}</span>}
                          {parcaBorclu && <span style={{ ...PIL_BASE, ...yontemRenk(s.yontem || "") }}>Parça: {fmtCur(netParca, s.parcaCurrency)}</span>}
                          {svKdv > 0 && <span style={{ ...PIL_BASE, ...KDV_RENK }}>KDV: {fmtCur(svKdv, s.currency)}</span>}
                          {s.yontem === "Kredi Kartı" && kkDetayPilleri(s.kartKomisyonu, s.currency).map((d, j) => (
                            <span key={j} style={{ ...PIL_BASE, ...d.renk }}>{d.metin}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--red600, #dc2626)", flexShrink: 0, marginLeft: 10 }}>{fmtCur(svToplam + svKomisyon + svKdv, s.currency)}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {borcluKaliplar.length > 0 && (
              <div style={{ marginBottom: borcluYedekParcalar.length > 0 ? 20 : 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--n600, #475569)", marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>
                  Extra Kalıp ({borcluKaliplar.length})
                </div>
                {borcluKaliplar.map(p => (
                  <div key={p.id} onClick={() => goToCustomer(p.customerId, { kalipId: p.id })} title="Kalıbı müşteri detayında aç"
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "var(--redBg, #fef2f2)", border: "1px solid var(--redBr, #fecaca)", marginBottom: 6, cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--redBg2, #fee2e2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "var(--redBg, #fef2f2)"}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--n900, #0f172a)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {custName(p.customerId)}
                        {p.yontem && <span style={{ ...PIL_BASE, ...yontemRenk(p.yontem, p.yontem === "Çek" && isCekVadesiGecmis(p)) }}>{p.yontem === "Çek" && isCekVadesiGecmis(p) ? "⚠ Çek" : p.yontem}</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--n400, #94a3b8)" }}>{p.ad}{p.olcu ? ` (${p.olcu})` : ""} · {fmtTR(p.tarih)}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                        <span style={{ ...PIL_BASE, ...yontemRenk(p.yontem || "") }}>Kalıp: {fmtCur(parseMoney(p.ucret) - yansitilanKomisyon(p), p.currency)}</span>
                        {calcKDV(p.faturaTipi, p.ucret, p.tarih, kdvRates) > 0 && <span style={{ ...PIL_BASE, ...KDV_RENK }}>KDV: {fmtCur(calcKDV(p.faturaTipi, p.ucret, p.tarih, kdvRates), p.currency)}</span>}
                        {p.yontem === "Kredi Kartı" && kkDetayPilleri(p.kartKomisyonu, p.currency).map((d, j) => (
                          <span key={j} style={{ ...PIL_BASE, ...d.renk }}>{d.metin}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--red600, #dc2626)", flexShrink: 0, marginLeft: 10 }}>{fmtCur(parseMoney(p.ucret) + calcKDV(p.faturaTipi, p.ucret, p.tarih, kdvRates), p.currency)}</div>
                  </div>
                ))}
              </div>
            )}

            {borcluYedekParcalar.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--n600, #475569)", marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>
                  Yedek Parça (Kargo) ({borcluYedekParcalar.length})
                </div>
                {borcluYedekParcalar.map(s => {
                  const bedel = yedekParcaBedeli(s);
                  const komisyon = yansitilanKomisyon(s); // yansıtıldıysa bedel brüt (komisyon dahil) → pilde net göster
                  const kdv = calcKDV(s.faturaTipi, bedel, s.tarih, kdvRates);
                  const mid = Number(s.musteriId);
                  return (
                    <div key={s.id} onClick={() => { if (onGoYedekParca) onGoYedekParca(s.id); }} title={onGoYedekParca ? "Yedek parça satışına git" : undefined}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "var(--redBg, #fef2f2)", border: "1px solid var(--redBr, #fecaca)", marginBottom: 6, cursor: onGoYedekParca ? "pointer" : "default" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--redBg2, #fee2e2)"}
                      onMouseLeave={e => e.currentTarget.style.background = "var(--redBg, #fef2f2)"}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--n900, #0f172a)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          {custName(mid)}
                          {s.yontem && <span style={{ ...PIL_BASE, ...yontemRenk(s.yontem, s.yontem === "Çek" && isCekVadesiGecmis(s)) }}>{s.yontem === "Çek" && isCekVadesiGecmis(s) ? "⚠ Çek" : s.yontem}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--n400, #94a3b8)" }}>📦 {parcaAdi((parts || []).find(p => String(p.id) === String(s.partId))) || "Yedek parça"} ×{s.miktar} · {fmtTR(s.tarih)}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                          <span style={{ ...PIL_BASE, ...yontemRenk(s.yontem || "") }}>Yedek parça: {fmtCur(bedel - komisyon, s.currency)}</span>
                          {kdv > 0 && <span style={{ ...PIL_BASE, ...KDV_RENK }}>KDV: {fmtCur(kdv, s.currency)}</span>}
                          {s.yontem === "Kredi Kartı" && kkDetayPilleri(s.kartKomisyonu, s.currency).map((d, j) => (
                            <span key={j} style={{ ...PIL_BASE, ...d.renk }}>{d.metin}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--red600, #dc2626)", flexShrink: 0, marginLeft: 10 }}>{fmtCur(bedel + kdv, s.currency)}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {borcluCount === 0 && (
              <div style={{ padding: "30px 0", textAlign: "center", color: "var(--n400, #94a3b8)" }}>Borçlu firma yok.</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setShowDebtors(false)}>Kapat</Btn>
            <Btn onClick={() => { setShowDebtors(false); onGoDebtors && onGoDebtors(); }}>Müşterilerde Görüntüle →</Btn>
          </div>
        </Modal>
      )}

      {/* Borçlu Bayi/Servis — bayinin/firmanın ödenmemiş servis parça + yedek parça (kargo) + Extra Kalıp borcu */}
      {showDealerDebtors && (
        <Modal wide title="Borçlu Bayi/Servis" onClose={() => setShowDealerDebtors(false)}>
          <div style={{ maxHeight: 480, overflowY: "auto" }}>
            {Object.entries(dealerBorcMap).length === 0 ? (
              <div style={{ padding: "30px 0", textAlign: "center", color: "var(--n400, #94a3b8)" }}>Borçlu bayi/servis yok.</div>
            ) : (
              Object.entries(dealerBorcMap).map(([name, info]) => (
                <div key={name} style={{ padding: "12px 14px", borderRadius: 10, background: "var(--ambBg, #fffbeb)", border: "1px solid var(--ambBr, #fde68a)", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--n900, #0f172a)" }}>{name}</div>
                    <div>
                      {Object.entries(info.byCur).filter(([, v]) => v > 0).map(([k, v]) => (
                        <span key={k} style={{ fontSize: 13, fontWeight: 800, color: "var(--red600, #dc2626)" }}>{fmtCur(v + (info.kdvByCur[k] || 0), k)}</span>
                      ))}
                    </div>
                  </div>
                  {(info.servisler || []).map(s => (
                    <div key={"sv" + s.id} onClick={() => goToCustomer(s.customerId, { servisId: s.id })} title="Servisi müşteri detayında aç"
                      style={{ ...BORC_SATIR, cursor: "pointer" }}>
                      <span style={BORC_LINK}>🔧 {custName(s.customerId)} · {fmtTR(s.date)}</span>
                      {s.yontem && <span style={{ ...PIL_BASE, ...yontemRenk(s.yontem, s.yontem === "Çek" && isCekVadesiGecmis(s)) }}>{s.yontem === "Çek" && isCekVadesiGecmis(s) ? "⚠ Çek" : s.yontem}</span>}
                      <span style={{ ...PIL_BASE, background: "var(--ambBg2, #fef3c7)", color: "var(--amb800, #92400e)" }}>Servis parça: {fmtCur(parseMoney(s.parcaUcreti), s.parcaCurrency || s.currency)}</span>
                      {calcKDV(s.faturaTipi, parseMoney(s.parcaUcreti), s.date, kdvRates) > 0 && <span style={{ ...PIL_BASE, ...KDV_RENK }}>KDV: {fmtCur(calcKDV(s.faturaTipi, parseMoney(s.parcaUcreti), s.date, kdvRates), s.parcaCurrency || s.currency)}</span>}
                      {s.yontem === "Kredi Kartı" && kkDetayPilleri(s.kartKomisyonu, s.currency).map((d, j) => (<span key={j} style={{ ...PIL_BASE, ...d.renk }}>{d.metin}</span>))}
                    </div>
                  ))}
                  {(info.yedekler || []).map(s => (
                    <div key={"yp" + s.id} onClick={() => { if (onGoYedekParca) onGoYedekParca(s.id); }} title={onGoYedekParca ? "Yedek parça satışına git" : undefined}
                      style={{ ...BORC_SATIR, cursor: onGoYedekParca ? "pointer" : "default" }}>
                      <span style={BORC_LINK}>📦 {parcaAdi((parts || []).find(p => String(p.id) === String(s.partId))) || "Yedek parça"} ×{s.miktar} · {fmtTR(s.tarih)}</span>
                      {s.yontem && <span style={{ ...PIL_BASE, ...yontemRenk(s.yontem, s.yontem === "Çek" && isCekVadesiGecmis(s)) }}>{s.yontem === "Çek" && isCekVadesiGecmis(s) ? "⚠ Çek" : s.yontem}</span>}
                      <span style={{ ...PIL_BASE, background: "var(--bluBg2, #dbeafe)", color: "var(--blu700, #1d4ed8)" }}>Yedek parça: {fmtCur(yedekParcaBedeli(s), s.currency)}</span>
                      {calcKDV(s.faturaTipi, yedekParcaBedeli(s), s.tarih, kdvRates) > 0 && <span style={{ ...PIL_BASE, ...KDV_RENK }}>KDV: {fmtCur(calcKDV(s.faturaTipi, yedekParcaBedeli(s), s.tarih, kdvRates), s.currency)}</span>}
                      {s.yontem === "Kredi Kartı" && kkDetayPilleri(s.kartKomisyonu, s.currency).map((d, j) => (<span key={j} style={{ ...PIL_BASE, ...d.renk }}>{d.metin}</span>))}
                    </div>
                  ))}
                  {(info.kaliplar || []).map(p => (
                    <div key={"kl" + p.id} onClick={() => goToCustomer(p.customerId, { kalipId: p.id })} title="Kalıbı müşteri detayında aç"
                      style={{ ...BORC_SATIR, cursor: "pointer" }}>
                      <span style={BORC_LINK}>{p.ad}{p.olcu ? ` (${p.olcu})` : ""} · {custName(p.customerId)} · {fmtTR(p.tarih)}</span>
                      {p.yontem && <span style={{ ...PIL_BASE, ...yontemRenk(p.yontem, p.yontem === "Çek" && isCekVadesiGecmis(p)) }}>{p.yontem === "Çek" && isCekVadesiGecmis(p) ? "⚠ Çek" : p.yontem}</span>}
                      <span style={{ ...PIL_BASE, background: "var(--redBg2, #fee2e2)", color: "var(--red700, #b91c1c)" }}>Kalıp: {fmtCur(parseMoney(p.ucret) - yansitilanKomisyon(p), p.currency)}</span>
                      {calcKDV(p.faturaTipi, p.ucret, p.tarih, kdvRates) > 0 && <span style={{ ...PIL_BASE, ...KDV_RENK }}>KDV: {fmtCur(calcKDV(p.faturaTipi, p.ucret, p.tarih, kdvRates), p.currency)}</span>}
                      {p.yontem === "Kredi Kartı" && kkDetayPilleri(p.kartKomisyonu, p.currency).map((d, j) => (<span key={j} style={{ ...PIL_BASE, ...d.renk }}>{d.metin}</span>))}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setShowDealerDebtors(false)}>Kapat</Btn>
            <Btn onClick={() => { setShowDealerDebtors(false); (onGoDealerDebtors || onGoDealers)?.(); }}>Bayilerde Görüntüle →</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
