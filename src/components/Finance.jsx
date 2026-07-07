import { useState, useMemo, useEffect } from "react";
import { CURRENCIES, DEFAULT_KDV_RATES } from "../lib/constants";
import { fmt, fmtCur, fmtTR, parseMoney, kalipCountAtSale, calcKDV, isAltuntasServisi, isServisUcretliMi, isParcaUcretliMi, isPartSaleBorcluMu, resolveSatisYapan, altuntasParcaBedeli } from "../lib/utils";
import { usePagination } from "../hooks/usePagination";
import { Modal, Pagination, Icon, Btn } from "./ui";
import { buildAylikRaporHtml } from "../lib/printTemplates";
import { customerHasAnyDebt, isCekVadesiGecmis, taksitGecikmisMi } from "../lib/utils";
import { makeCanDo } from "../lib/permissions";

const RANGE_LABELS = { all: "Tüm Zamanlar", thisMonth: "Bu Ay", thisYear: "Bu Yıl", lastYear: "Geçen Yıl", custom: "Özel Tarih" };

export const Finance = ({ customers, services, dealers = [], partSales = [], factory = null, kdvRates = DEFAULT_KDV_RATES, rates, payments = [], teklifler = [], serverPermissions = null }) => {
  const canDoFin = makeCanDo(serverPermissions, "financeActions");
  // Tarih aralığı pilleri kullanıcı iznine bağlı — izinli aralık listesi
  const izinliAraliklar = Object.keys(RANGE_LABELS).filter(k => canDoFin("fin_range_" + k));
  const factoryName = factory?.name || "Altuntaş Makina";
  const [range, setRange] = useState("all"); // all | thisMonth | thisYear | lastYear | custom
  // Aktif aralık izinli değilse ilk izinli aralığa düş (hiç izin yoksa Bu Ay'a)
  useEffect(() => {
    if (izinliAraliklar.includes(range)) return;
    setRange(izinliAraliklar[0] || "thisMonth");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [izinliAraliklar.join(","), range]);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [moneyVisible, setMoneyVisible] = useState(false);
  // ── Aylık Faaliyet Raporu (yazdırma önizlemesi / PDF) ──
  const oncekiAy = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();
  const [raporAy, setRaporAy] = useState(oncekiAy);
  const aylikRapor = () => {
    const [yil, ay] = raporAy.split("-").map(Number);
    const ayIci = (t) => t && t.slice(0, 7) === raporAy;
    const paraEkle = (obj, cur, v) => { const k = cur || "TRY"; obj[k] = (obj[k] || 0) + (parseMoney(v) || 0); };

    const satislar = customers.filter(c => !c.isResale && ayIci(c.installDate));
    const satisTutar = {}; satislar.forEach(c => paraEkle(satisTutar, c.currency, c.fabrikaSatisBedeli));
    const modelMap = {}; satislar.forEach(c => { const k = c.model || "Belirtilmemiş"; modelMap[k] = (modelMap[k] || 0) + 1; });

    const ayOdemeler = payments.filter(p => !p.deletedAt && ayIci(p.tarih));
    const tahsilatTutar = {}; ayOdemeler.forEach(p => paraEkle(tahsilatTutar, p.currency, p.tutar));

    const borclular = customers.filter(c => customerHasAnyDebt(c, services, partSales, factoryName));
    const acikBorc = {}; customers.forEach(c => { if (parseMoney(c.kalanBorc) > 0) paraEkle(acikBorc, c.currency, c.kalanBorc); });

    const aySevisler = services.filter(sv => !sv.deletedAt && ayIci(sv.date));
    const servisTutar = {}; aySevisler.forEach(sv => { paraEkle(servisTutar, sv.currency, sv.servisUcreti); if (!sv.parcaUcretsizMi) paraEkle(servisTutar, sv.parcaCurrency || sv.currency, sv.parcaUcreti); });
    const servisTipMap = {}; aySevisler.forEach(sv => { const k = sv.type || "Diğer"; servisTipMap[k] = (servisTipMap[k] || 0) + 1; });

    const rapor = {
      ayEtiketi: new Date(yil, ay - 1, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
      olusturmaTarihi: new Date().toLocaleDateString("tr-TR"),
      satisAdet: satislar.length, satisTutar,
      modelKirilimi: Object.entries(modelMap).sort((a, b) => b[1] - a[1]).map(([model, adet]) => ({ model, adet })),
      tahsilatAdet: ayOdemeler.length, tahsilatTutar,
      cekTahsilAdet: ayOdemeler.filter(p => p.yontem === "Çek" && p.tahsilEdildi).length,
      borcluFirma: borclular.length, acikBorc,
      gecikenCek: payments.filter(p => !p.deletedAt && isCekVadesiGecmis(p)).length,
      gecikenTaksit: customers.filter(c => taksitGecikmisMi(c)).length,
      servisAdet: aySevisler.length, servisTutar,
      servisKirilimi: Object.entries(servisTipMap).map(([tip, adet]) => ({ tip, adet })),
      teklifAdet: teklifler.filter(t => !t.deletedAt && t.type === "teklif" && ayIci(t.tarih)).length,
      bekleyenTeklif: teklifler.filter(t => !t.deletedAt && t.type === "teklif" && t.durum === "gonderildi").length,
    };
    const html = buildAylikRaporHtml(rapor, factory);
    if (window.appPrint?.printHtml) window.appPrint.printHtml(html, null, `Aylik-Rapor-${raporAy}.pdf`);
  };
  const M = v => moneyVisible ? v : "———";

  // Yaklaşık TL karşılığı — döviz kurları App.jsx'te tek noktadan çekilip prop olarak gelir,
  // bir {TRY,USD,EUR} nesnesini TL'ye çevirip toplar. Hesaplama dışında render'da da (MultiCard) kullanılıyor.
  const toTL = (obj) => {
    let sum = obj.TRY || 0;
    if (rates) {
      if (rates.usd) sum += (obj.USD || 0) * rates.usd;
      if (rates.eur) sum += (obj.EUR || 0) * rates.eur;
    }
    return sum;
  };

  // Tüm ağır hesaplamalar burada toplanıp memoize ediliyor — customers/services/partSales
  // büyüdükçe (binlerce kayıt) her render'da yeniden hesaplanmasın diye. İç mantık değişmedi,
  // sadece bir useMemo içine taşındı.
  const {
    totalMakina, totalKalip, satilanExtraKalipSayisi, satilanYedekParcaSayisi,
    gercekCiro, komisyon, toplamCiro, servisUcreti, parcaUcreti, toplamExtraKalip,
    toplamCiromuz, odenmesiMuhtemel, alacak, modelRows, sellerRows, monthly, maxMonthly,
    toplamCiromuzNet, servisUcretiNet, parcaUcretiNet, toplamExtraKalipNet, faturaBedeliToplam,
    anlasmaliParcaSatisiNet, kdvAnlasmaliParca,
    kdvMakina, kdvServis, kdvParca, kdvKalip,
  } = useMemo(() => {
    // Tarih aralığı sınırlarını hesapla — tarihler "YYYY-MM-DD" string olarak saklanıyor
    // (<input type="date"> formatı); bunu new Date(iso) ile parse edip getFullYear()/getMonth()
    // kullanmak, tarihsiz-saat ISO string'lerinin UTC olarak yorumlanması yüzünden yerel saat dilimine
    // göre (özellikle UTC'nin gerisindeki dilimlerde) bir gün kayma riski taşıyordu — ay/yıl sınırındaki
    // bir kayıt yanlış aya/yıla sayılabilirdi. Bunun yerine string'in kendisi üzerinde (saat dilimine
    // bağlı olmayan) doğrudan karşılaştırma yapılıyor.
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-indeksli (yerel tarih — Date nesnesinin kendisi UTC'ye çevrilmiyor)
    const thisMonthKey = `${y}-${String(m + 1).padStart(2, "0")}`;
    const inRange = (iso) => {
      if (!iso) return range === "all";
      const s = String(iso);
      if (range === "all") return true;
      if (range === "thisMonth") return s.slice(0, 7) === thisMonthKey;
      if (range === "thisYear") return s.slice(0, 4) === String(y);
      if (range === "lastYear") return s.slice(0, 4) === String(y - 1);
      if (range === "custom") {
        if (customStart && s < customStart) return false;
        if (customEnd && s > customEnd) return false;
        return true;
      }
      return true;
    };

    // Satışları tarihe göre filtrele (installDate baz alınır) — 2. el devir olsa bile orijinal
    // satışın bedeli/adedi sayılmaya devam eder (isResale finans hesaplarını etkilemiyor)
    const sales = customers.filter(c => inRange(c.installDate));
    const svcInRange = services.filter(s => inRange(s.date));
    const kalipSatisInRange = partSales.filter(p => p.tur === "Kalıp" && inRange(p.tarih)); // Extra Kalıp sekmesindeki satışlar
    const yedekParcaSatisInRange = partSales.filter(p => p.tur === "YedekParca" && inRange(p.tarih)); // Bağımsız yedek parça satışları

    // ── ADETLER ──
    const totalMakina = sales.length;
    // Satıştaki ilk kaliplar listesi extra sayılmaz (kalipCountAtSale partSaleId'li satırları hariç tutar) —
    // yoksa Extra Kalıp Satışı'ndan eklenen kalıp hem burada hem satilanExtraKalipSayisi'de çift sayılırdı.
    const totalKalip = sales.reduce((sum, c) => sum + kalipCountAtSale(c), 0);
    const satilanExtraKalipSayisi = kalipSatisInRange.length;
    // Servis kayıtlarındaki değişen parçalar + bağımsız yedek parça satışları (miktar toplamı)
    const satilanYedekParcaSayisi = svcInRange.reduce((sum, s) => sum + (s.degisenParcalar?.length || 0), 0)
      + yedekParcaSatisInRange.reduce((sum, p) => sum + (parseInt(p.miktar) || 1), 0);

    // ── PARA (TUTAR) — para birimi başına ayrı topla ──
    const empty3 = () => ({ TRY: 0, USD: 0, EUR: 0 });
    const cur = (x) => (CURRENCIES.includes(x) ? x : "TRY"); // eski kayıtlar TRY
    const gercekCiro = empty3();   // gerçek satış bedelleri (fiili ciro)
    const komisyon = empty3(), toplamCiro = empty3();
    const faturaBedeliToplam = empty3(); // resmi faturada yazan tutar (KDV hariç — KDV'si kdvMakina'da)
    // Faturalı Yurtiçi satış/servis/parça/kalıplardan doğan KDV — "Ödenmesi Muhtemel" kartının bileşenleri
    const kdvMakina = empty3(), kdvServis = empty3(), kdvParca = empty3(), kdvKalip = empty3();
    // Faturasız satışlarda fatura bedeli kasıtlı olarak gerçek satış bedelinden daha düşük tutulabiliyor
    // (bkz. müşteri formundaki "Gerçek bedelden farklı olabilir" notu) — bu yüzden "gelir" sayılırken
    // her zaman gerçek bedel (Fabrika Satış Bedeli, yoksa faturaya düş) kullanılmalı, ham faturaBedeli değil.
    const gercekBedel = (c) => parseMoney(c.fabrikaSatisBedeli) || parseMoney(c.faturaBedeli);
    sales.forEach(c => {
      const k = cur(c.currency);
      const gercek = gercekBedel(c);
      const kdvTutar = calcKDV(c.faturali, c.faturaBedeli, c.installDate, kdvRates);
      gercekCiro[k] += gercek;
      // Komisyon Toplam Bedel'e hiç dahil edilmez (ne eklenir ne çıkarılır) — kendi ayrı "Toplam Ödenen
      // Komisyon" kartında gösterilir. calcCiro() kasıtlı olarak kullanılmıyor: o, Kalan Borç tabanı için
      // ayrı bir amaçla komisyonu EKLER (bkz. utils.js calcCiro yorum satırı) — burada Toplam Bedel/ciro hesabı farklı.
      toplamCiro[k] += parseMoney(c.fabrikaSatisBedeli) + kdvTutar;
      komisyon[k] += parseMoney(c.komisyon);
      faturaBedeliToplam[k] += parseMoney(c.faturaBedeli);
      kdvMakina[k] += kdvTutar;
    });
    // Anlaşmalı bir firma yaptıysa servis ücretini müşteri o firmaya öder, Altuntaş'a değil —
    // bu yüzden bu ciroya hiç dahil edilmez (ücret yine de geçmişte/kayıtta bilgi amaçlı görünür).
    const servisUcreti = empty3();
    svcInRange.filter(s => (s.type === "Garanti Dışı" || s.type === "Periyodik Bakım") && isAltuntasServisi(s, factoryName)).forEach(s => {
      const kdv = calcKDV(s.faturaTipi, s.servisUcreti, s.date, kdvRates);
      servisUcreti[cur(s.currency)] += parseMoney(s.servisUcreti) + kdv;
      kdvServis[cur(s.currency)] += kdv;
    });
    // isParcaUcretliMi kullanılıyor (ham !parcaUcretsizMi yerine) — anlaşmalı serviste dışarıdan
    // tedarik edilen parçalara girilen ücret (geçmişte görünsün diye serbestçe girilebilir) burada
    // hiç sayılmamalı, parça gerçekten Altuntaş'tan alınmadıysa Altuntaş'ın geliri değildir.
    // Ayrıca isAltuntasServisi kontrolü de var: anlaşmalı firmaya satılan parçalar (Altuntaş'tan
    // alınmış olsalar da) burada değil, ayrı "Anlaşmalı Servislere Satılan Parça Bedeli" kartında
    // sayılır — aksi halde aynı satış iki karta birden girip toplamı şişirirdi.
    const parcaUcreti = empty3();
    // Anlaşmalı servis firmalarına satılan parça bedeli — Toplam Parça Ücreti Bedeli'nden ayrı,
    // çift sayılmayan bir kırılım (anlaşmalı firma Altuntaş'tan gerçekten parça satın aldıysa, bkz. isAltuntasServisi).
    const anlasmaliParcaSatisi = empty3();
    const kdvAnlasmaliParca = empty3();
    svcInRange.forEach(s => {
      if (isParcaUcretliMi(s)) {
        const bedel = altuntasParcaBedeli(s);
        const kdv = calcKDV(s.faturaTipi, bedel, s.date, kdvRates);
        if (isAltuntasServisi(s, factoryName)) {
          parcaUcreti[cur(s.parcaCurrency)] += bedel + kdv;
          kdvParca[cur(s.parcaCurrency)] += kdv;
        } else {
          anlasmaliParcaSatisi[cur(s.parcaCurrency)] += bedel + kdv;
          kdvAnlasmaliParca[cur(s.parcaCurrency)] += kdv;
        }
      }
    });
    const kalipSatisi = empty3(); // Extra Kalıp sekmesinde sonradan verilen kalıplar
    kalipSatisInRange.forEach(p => {
      const kdv = calcKDV(p.faturaTipi, p.ucret, p.tarih, kdvRates);
      kalipSatisi[cur(p.currency)] += parseMoney(p.ucret) + kdv;
      kdvKalip[cur(p.currency)] += kdv;
    });
    const toplamExtraKalip = kalipSatisi;


    // ── 3 büyük özet kartı ──
    const sumObj = (...objs) => {
      const r = empty3();
      objs.forEach(o => CURRENCIES.forEach(k => { r[k] += o[k] || 0; }));
      return r;
    };
    const subObj = (a, b) => {
      const r = empty3();
      CURRENCIES.forEach(k => { r[k] = (a[k] || 0) - (b[k] || 0); });
      return r;
    };
    // anlasmaliParcaSatisi/kdvAnlasmaliParca de dahil — Toplam Parça Ücreti Bedeli kartında ayrı
    // gösteriliyor olması bu satışın Altuntaş cirosu olmadığı anlamına gelmiyor, sadece tahsilatın
    // müşteriden değil anlaşmalı firmadan yapıldığı anlamına geliyor (bkz. isAltuntasServisi).
    const toplamCiromuz = sumObj(toplamCiro, servisUcreti, parcaUcreti, anlasmaliParcaSatisi, kalipSatisi);
    const odenmesiMuhtemel = sumObj(kdvMakina, kdvServis, kdvParca, kdvAnlasmaliParca, kdvKalip);

    // KDV'siz görünüm: kartların ana rakamı KDV hariç, KDV kartın altında ayrıca gösterilir
    // (Ödenmesi Muhtemel KDV ve Toplam Alacak hariç — ikisi de kapsam dışı, ayrı sebeplerle:
    // ilki zaten KDV'nin kendisi, ikincisi müşterinin kendi kalanBorc'undaki KDV payı ödemeler
    // ana para/KDV ayrımı yapmadan düşüldüğü için tam doğru ayrıştırılamıyor).
    const toplamCiromuzNet = subObj(toplamCiromuz, odenmesiMuhtemel);
    const servisUcretiNet = subObj(servisUcreti, kdvServis);
    const parcaUcretiNet = subObj(parcaUcreti, kdvParca);
    const toplamExtraKalipNet = subObj(kalipSatisi, kdvKalip);
    const anlasmaliParcaSatisiNet = subObj(anlasmaliParcaSatisi, kdvAnlasmaliParca);

    // Toplam Alacağımız — tarih filtresinden bağımsız, her zaman güncel/anlık bakiye
    const alacak = empty3();
    customers.forEach(c => { alacak[cur(c.currency)] += Math.max(parseMoney(c.kalanBorc), 0); });
    // Toplam Alacak — kime borçlu olunduğundan bağımsız, Altuntaş'a ödenmemiş her tutar (işçilik
    // sadece Altuntaş'ın kendi serviysiyse, parça ücreti ise kim yaptıysa yapsın — bkz. isServisBorcluMu'nun
    // müşteri-odaklı tanımından farklı olarak burada anlaşmalı firmanın üstlendiği parça borcu da dahildir).
    services.filter(s => (isServisUcretliMi(s, factoryName) || isParcaUcretliMi(s)) && s.odendi === false).forEach(s => {
      const servisVar = isServisUcretliMi(s, factoryName) ? parseMoney(s.servisUcreti) : 0;
      const parcaVar = isParcaUcretliMi(s) ? altuntasParcaBedeli(s) : 0;
      const toplam = servisVar + parcaVar;
      alacak[cur(s.currency)] += toplam + calcKDV(s.faturaTipi, toplam, s.date, kdvRates);
    });
    partSales.filter(isPartSaleBorcluMu).forEach(p => {
      alacak[cur(p.currency)] += parseMoney(p.ucret) + calcKDV(p.faturaTipi, p.ucret, p.tarih, kdvRates);
    });

    // ── MODEL BAZLI KIRILIM (gelir ≈ TL karşılığı) ──
    const byModel = {};
    sales.forEach(c => {
      const k = c.model || "Belirtilmemiş";
      if (!byModel[k]) byModel[k] = { adet: 0, gelir: 0 };
      byModel[k].adet += 1;
      const o = empty3(); o[cur(c.currency)] = gercekBedel(c);
      byModel[k].gelir += toTL(o);
    });
    const modelRows = Object.entries(byModel).sort((a, b) => b[1].gelir - a[1].gelir);

    // ── SATICI/BAYİ BAZLI KIRILIM (gelir ≈ TL karşılığı) ──
    const bySeller = {};
    sales.forEach(c => {
      const k = resolveSatisYapan(c.satisYapan, factory) || "Belirtilmemiş";
      if (!bySeller[k]) bySeller[k] = { adet: 0, gelir: 0 };
      bySeller[k].adet += 1;
      const g = empty3(); g[cur(c.currency)] = gercekBedel(c);
      bySeller[k].gelir += toTL(g);
    });
    const sellerRows = Object.entries(bySeller).sort((a, b) => b[1].gelir - a[1].gelir);

    // ── AYLIK TREND (son 12 ay, satış geliri ≈ TL karşılığı) ──
    const monthly = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(y, m - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
      let gelir = 0;
      customers.forEach(c => {
        if (c.installDate && c.installDate.slice(0, 7) === key) {
          const o = empty3(); o[cur(c.currency)] = gercekBedel(c);
          gelir += toTL(o);
        }
      });
      monthly.push({ label, gelir });
    }
    const maxMonthly = Math.max(...monthly.map(x => x.gelir), 1);

    return {
      totalMakina, totalKalip, satilanExtraKalipSayisi, satilanYedekParcaSayisi,
      gercekCiro, komisyon, toplamCiro, servisUcreti, parcaUcreti, toplamExtraKalip,
      toplamCiromuz, odenmesiMuhtemel, alacak, modelRows, sellerRows, monthly, maxMonthly,
      toplamCiromuzNet, servisUcretiNet, parcaUcretiNet, toplamExtraKalipNet, faturaBedeliToplam,
      anlasmaliParcaSatisiNet, kdvAnlasmaliParca,
      kdvMakina, kdvServis, kdvParca, kdvKalip,
    };
     
  }, [customers, services, partSales, range, customStart, customEnd, kdvRates, rates, factoryName]);

  const { page: modelPage, setPage: setModelPage, paged: modelRowsPaged, perPage: MODEL_PER_PAGE } = usePagination(modelRows, 10);
  const { page: sellerPage, setPage: setSellerPage, paged: sellerRowsPaged, perPage: SELLER_PER_PAGE } = usePagination(sellerRows, 10);

  const [showAnlasmaliModal, setShowAnlasmaliModal] = useState(false);
  const [anlasmaliSearch, setAnlasmaliSearch] = useState("");

  const anlasmaliServisDetay = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const thisMonthKey = `${y}-${String(m + 1).padStart(2, "0")}`;
    const inR = (iso) => {
      if (!iso) return range === "all";
      const s = String(iso);
      if (range === "all") return true;
      if (range === "thisMonth") return s.slice(0, 7) === thisMonthKey;
      if (range === "thisYear") return s.slice(0, 4) === String(y);
      if (range === "lastYear") return s.slice(0, 4) === String(y - 1);
      if (range === "custom") {
        if (customStart && s < customStart) return false;
        if (customEnd && s > customEnd) return false;
        return true;
      }
      return true;
    };
    return services
      .filter(s => !s.deletedAt && inR(s.date) && isParcaUcretliMi(s) && !isAltuntasServisi(s, factoryName))
      .map(s => {
        const cust = customers.find(c => String(c.id) === String(s.customerId));
        const ucret = altuntasParcaBedeli(s);
        const kdv = calcKDV(s.faturaTipi, ucret, s.date, kdvRates);
        return {
          id: s.id,
          tarih: s.date || "",
          firmaAdi: cust?.name || "—",
          islemFirma: s.islemFirma || "—",
          parcaUcreti: ucret,
          kdv,
          currency: s.parcaCurrency || "TRY",
          odendi: s.odendi,
        };
      })
      .sort((a, b) => b.tarih.localeCompare(a.tarih));
  }, [services, customers, range, customStart, customEnd, factoryName, kdvRates]);

  const anlasmaliFiltered = useMemo(() => {
    if (!anlasmaliSearch.trim()) return anlasmaliServisDetay;
    const q = anlasmaliSearch.toLocaleLowerCase("tr-TR");
    return anlasmaliServisDetay.filter(r =>
      r.firmaAdi.toLocaleLowerCase("tr-TR").includes(q) ||
      r.islemFirma.toLocaleLowerCase("tr-TR").includes(q)
    );
  }, [anlasmaliServisDetay, anlasmaliSearch]);

  const { page: anlasmaliPage, setPage: setAnlasmaliPage, paged: anlasmaliPaged, perPage: ANLASMALI_PER_PAGE } = usePagination(anlasmaliFiltered, 10);

  // Tarih aralığı değişince listeler yeniden hesaplanıp kısalabilir — sayfa numarası eski/yüksek
  // kalmasın diye aralık değiştiğinde her ikisi de baştan başlar.
  useEffect(() => { setModelPage(1); setSellerPage(1); setAnlasmaliPage(1); }, [range, customStart, customEnd]);

  // KDV artık tek bir sayı değil, tarihe bağlı dönemler listesi — bu yüzden kartlarda sabit bir
  // "%20" göstermek yerine, seçili tarih aralığında geçerli olan dönem(ler) burada listelenir.
  // Sadece başlangıç tarihleri gösterilir (bir dönem, bir sonraki dönem başlayana kadar geçerlidir).
  const kdvDonemleri = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const thisMonthKey = `${y}-${String(m + 1).padStart(2, "0")}`;
    let rangeStart = "0000-01-01", rangeEnd = "9999-12-31";
    if (range === "thisMonth") { rangeStart = `${thisMonthKey}-01`; rangeEnd = `${thisMonthKey}-31`; }
    else if (range === "thisYear") { rangeStart = `${y}-01-01`; rangeEnd = `${y}-12-31`; }
    else if (range === "lastYear") { rangeStart = `${y - 1}-01-01`; rangeEnd = `${y - 1}-12-31`; }
    else if (range === "custom") { rangeStart = customStart || "0000-01-01"; rangeEnd = customEnd || "9999-12-31"; }
    const sorted = [...(kdvRates || [])].sort((a, b) => (a.from || "").localeCompare(b.from || ""));
    return sorted
      .map((p, i) => ({ from: p.from, rate: p.rate, nextFrom: sorted[i + 1]?.from || "9999-12-31" }))
      .filter(p => p.from <= rangeEnd && p.nextFrom > rangeStart);
  }, [kdvRates, range, customStart, customEnd]);

  // Excel'e aktar (CSV)
  const AdetCard = ({ label, value, color, icon }) => (
    <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color }}>{value}</div>
    </div>
  );
  // Çok-dövizli kart: her dövizi ayrı satır + yaklaşık TL karşılığı.
  // size="large" → sayfanın en üstündeki 3 özet kartı için daha büyük/öne çıkan görünüm.
  // kdvObj verilirse: obj artık KDV HARİÇ ana rakamı temsil eder, kdvObj kartın altında ayrıca
  // gösterilir (örn. "100.000" ana rakam, altında "KDV (%20): 20.000"). KDV toplamı 0 ise satır
  // hiç gösterilmez (uygulamanın genelinde sıfır değerli alanlar gizlenir, aynı desen).
  const MultiCard = ({ label, obj, kdvObj, color, sub, size = "normal" }) => {
    const large = size === "large";
    const nonzero = CURRENCIES.filter(k => (obj[k] || 0) !== 0);
    const showCur = nonzero.length ? nonzero : ["TRY"];
    const hasFx = nonzero.some(k => k !== "TRY");
    const kdvCur = kdvObj ? CURRENCIES.filter(k => (kdvObj[k] || 0) > 0) : [];
    return (
      <div style={{
        background: large ? "linear-gradient(135deg,#fff,#fff7ed)" : "#fff",
        borderRadius: 12, padding: large ? "22px 24px" : "16px 20px",
        boxShadow: large ? "0 4px 14px rgba(0,0,0,.10)" : "0 1px 4px rgba(0,0,0,.08)",
        borderTop: large ? `4px solid ${color || "#e85d1a"}` : undefined,
      }}>
        <div style={{ fontSize: large ? 14 : 12, color: "#64748b", fontWeight: 700, marginBottom: large ? 8 : 6 }}>{label}</div>
        {showCur.map(k => (
          <div key={k} style={{ fontSize: large ? 34 : 20, fontWeight: 800, color: moneyVisible ? (color || "#0f172a") : "#94a3b8", lineHeight: 1.25 }}>{M(fmtCur(obj[k] || 0, k))}</div>
        ))}
        {hasFx && rates && moneyVisible && (
          <div style={{ fontSize: large ? 12 : 11, color: "#94a3b8", marginTop: 4 }}>≈ {fmt(toTL(obj))} (yaklaşık)</div>
        )}
        {kdvCur.length > 0 && (
          <div style={{ fontSize: large ? 13 : 11.5, color: moneyVisible ? "#0d9488" : "#94a3b8", fontWeight: 700, marginTop: large ? 8 : 5, paddingTop: large ? 8 : 5, borderTop: "1px solid #f1f5f9" }}>
            KDV: {M(kdvCur.map(k => fmtCur(kdvObj[k], k)).join(" + "))}
          </div>
        )}
        {sub && <div style={{ fontSize: large ? 12 : 11, color: "#94a3b8", marginTop: large ? 6 : 3 }}>{sub}</div>}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Finans</h2>
        {canDoFin("fin_rapor") && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
          <input type="month" value={raporAy} onChange={e => setRaporAy(e.target.value)}
            style={{ padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#f8fafc" }} />
          <Btn small variant="ghost" onClick={aylikRapor} title="Seçili ayın faaliyet raporunu yazdır/PDF kaydet"><Icon name="print" size={13} /> Aylık Rapor</Btn>
        </div>
        )}
        <button onClick={() => setMoneyVisible(v => !v)} title={moneyVisible ? "Tutarları gizle" : "Tutarları göster"}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 20, border: "1px solid #e2e8f0", background: moneyVisible ? "#f0fdf4" : "#f8fafc", color: moneyVisible ? "#16a34a" : "#94a3b8", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          <Icon name={moneyVisible ? "eye" : "eyeOff"} size={15} />
          {moneyVisible ? "Gizle" : "Göster"}
        </button>
      </div>

      {/* Tarih aralığı filtresi */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
        {Object.entries(RANGE_LABELS).filter(([k]) => izinliAraliklar.includes(k)).map(([k, l]) => (
          <button key={k} onClick={() => setRange(k)}
            style={{ padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: "1px solid", borderColor: range === k ? "#e85d1a" : "#e2e8f0",
              background: range === k ? "#e85d1a" : "#fff", color: range === k ? "#fff" : "#64748b" }}>
            {l}
          </button>
        ))}
      </div>
      {range === "custom" && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>Başlangıç:</span>
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
            style={{ padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13 }} />
          <span style={{ fontSize: 13, color: "#64748b" }}>Bitiş:</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
            style={{ padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13 }} />
        </div>
      )}
      <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>
        Gösterilen dönem: <b style={{ color: "#e85d1a" }}>{RANGE_LABELS[range]}</b> · {totalMakina} satış kaydı
      </div>
      {/* KDV Dönemleri: seçili aralıkta birden fazla dönem varsa hangi tarihten itibaren hangi oranın geçerli olduğu gösterilir */}
      <div style={{ fontSize: 12, color: "#0d9488", fontWeight: 600, marginBottom: 20 }}>
        {kdvDonemleri.length > 1 ? (
          <>KDV dönemleri: {kdvDonemleri.map((p, i) => `${fmtTR(p.from)}'ten itibaren %${p.rate}`).join(" · ")}</>
        ) : kdvDonemleri.length === 1 ? (
          <>Geçerli KDV oranı: %{kdvDonemleri[0].rate} ({fmtTR(kdvDonemleri[0].from)}'ten itibaren)</>
        ) : null}
      </div>

      {/* ÖZET KARTLARI — diğer kartlardan daha büyük, her zaman yan yana 3'lü */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
        <MultiCard label="Toplam Bedel" obj={toplamCiromuzNet} kdvObj={odenmesiMuhtemel} color="#e85d1a" sub="Fabrika Satış Bedeli + Servis + Parça + Extra Kalıp (KDV hariç)" size="large" />
        <MultiCard label="Toplam Alacak" obj={alacak} color="#dc2626" sub="Tarih filtresinden bağımsız, her zaman güncel bakiye" size="large" />
        <MultiCard label="Ödenmesi Muhtemel KDV" obj={odenmesiMuhtemel} color="#0d9488" sub="Faturalı Yurtiçi satışlardan doğan KDV toplamı" size="large" />
      </div>

      {/* ADET KARTLARI */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>Adetler</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 28 }}>
        <AdetCard label="Toplam Satılan Makina" value={totalMakina} color="#e85d1a" />
        <AdetCard label="Toplam Satılan Kalıp" value={totalKalip + satilanExtraKalipSayisi} color="#3b82f6" />
        <AdetCard label="İlk Satışta Verilen Toplam Kalıp" value={totalKalip} color="#60a5fa" />
        <AdetCard label="Satılan Extra Kalıp" value={satilanExtraKalipSayisi} color="#db2777" />
        <AdetCard label="Satılan Yedek Parça" value={satilanYedekParcaSayisi} color="#0ea5e9" />
      </div>

      {/* PARA KARTLARI */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>Gelir & Tahsilat</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 20 }}>
        <MultiCard label="Toplam Fabrika Satış Bedeli" obj={gercekCiro} color="#16a34a" sub="Müşterilerden gelen gerçek satış bedeli" />
        <MultiCard label="Toplam Fatura Bedeli" obj={faturaBedeliToplam} kdvObj={kdvMakina} color="#6366f1" sub="Resmi faturada yazan tutar (KDV hariç)" />
        <MultiCard label="Toplam Servis Ücreti Bedeli" obj={servisUcretiNet} kdvObj={kdvServis} color="#f59e0b" sub="Garanti dışı servisler (KDV hariç)" />
        <MultiCard label="Toplam Parça Ücreti Bedeli" obj={parcaUcretiNet} kdvObj={kdvParca} color="#0ea5e9" sub="Servis kayıtlarındaki Altuntaş Makina tarafından değişen parça ücretleri (KDV hariç)" />
        <div onClick={canDoFin("fin_anlasmali_detay") ? () => setShowAnlasmaliModal(true) : undefined} style={{ cursor: "pointer" }} title="Detay için tıklayın">
          <MultiCard label="Toplam Anlaşmalı Servislere Satılan Parça Bedeli" obj={anlasmaliParcaSatisiNet} kdvObj={kdvAnlasmaliParca} color="#a855f7" sub="Anlaşmalı servis firmalarına satılan parçalar (KDV hariç) · detay için tıklayın" />
        </div>
        <MultiCard label="Toplam Extra Kalıp Satış Bedeli" obj={toplamExtraKalipNet} kdvObj={kdvKalip} color="#db2777" sub="Extra Kalıp sekmesi satışları (KDV hariç)" />
        <MultiCard label="Toplam Ödenen Komisyon" obj={komisyon} color="#dc2626" sub="Gider (düşülür)" />
      </div>

      {/* AYLIK TREND */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.08)", marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 16 }}>Son 12 Ay Satış Geliri Trendi <span style={{ fontWeight: 400, color: "#94a3b8" }}>(≈ TL karşılığı)</span></div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140 }}>
          {monthly.map((mo, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600 }}>{mo.gelir > 0 && moneyVisible ? Math.round(mo.gelir / 1000) + "k" : ""}</div>
              <div style={{ width: "100%", height: `${(mo.gelir / maxMonthly) * 100}px`, minHeight: mo.gelir > 0 ? 4 : 0, background: "linear-gradient(180deg, #e85d1a, #f59e0b)", borderRadius: "4px 4px 0 0" }} />
              <div style={{ fontSize: 9, color: "#64748b" }}>{mo.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* MODEL & BAYİ KIRILIMI */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "auto" }}>
          <div style={{ padding: "14px 18px", fontSize: 13, fontWeight: 700, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>Model Bazlı Satış <span style={{ fontWeight: 400, color: "#94a3b8" }}>(gelir ≈ TL)</span></div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#f8fafc" }}>
              {["Model", "Adet", "Gelir"].map(h => <th key={h} style={{ padding: "8px 16px", textAlign: h === "Model" ? "left" : "right", fontSize: 11, fontWeight: 700, color: "#475569" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {modelRowsPaged.map(([k, v]) => (
                <tr key={k} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600 }}>{k}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, textAlign: "right" }}>{v.adet}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, textAlign: "right", fontWeight: 600, color: moneyVisible ? "#16a34a" : "#94a3b8" }}>{M(fmt(v.gelir))}</td>
                </tr>
              ))}
              {modelRows.length === 0 && <tr><td colSpan={3} style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>Veri yok</td></tr>}
            </tbody>
          </table>
          <Pagination total={modelRows.length} page={modelPage} setPage={setModelPage} perPage={MODEL_PER_PAGE} />
        </div>
        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "auto" }}>
          <div style={{ padding: "14px 18px", fontSize: 13, fontWeight: 700, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>Satış Yapan Bazlı</div>
          {/* Gelir kolonu BİLEREK yok (kullanıcı kararı): satıcı bazında ciro gösterilmek
              istenmiyor, yalnızca adet. bySeller.gelir yine de hesaplanır çünkü satırlar
              gelire göre sıralanıyor — kolonu "eksik" sanıp geri ekleme. */}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "#f8fafc" }}>
              {["Satış Yapan", "Adet"].map(h => <th key={h} style={{ padding: "8px 16px", textAlign: h === "Satış Yapan" ? "left" : "right", fontSize: 11, fontWeight: 700, color: "#475569" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {sellerRowsPaged.map(([k, v]) => (
                <tr key={k} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600 }}>{k}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, textAlign: "right" }}>{v.adet}</td>
                </tr>
              ))}
              {sellerRows.length === 0 && <tr><td colSpan={2} style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>Veri yok</td></tr>}
            </tbody>
          </table>
          <Pagination total={sellerRows.length} page={sellerPage} setPage={setSellerPage} perPage={SELLER_PER_PAGE} />
        </div>
      </div>

      {showAnlasmaliModal && (
        <Modal title="Anlaşmalı Servislere Satılan Parça Detayı" onClose={() => { setShowAnlasmaliModal(false); setAnlasmaliSearch(""); }}>
          <div style={{ marginBottom: 12 }}>
            <input
              value={anlasmaliSearch}
              onChange={e => { setAnlasmaliSearch(e.target.value); setAnlasmaliPage(1); }}
              placeholder="Müşteri firma veya servis firması ara..."
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }}
            />
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Tarih", "Müşteri Firma", "Servis Firması", "Parça Ücreti", "KDV", "Durum"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: ["Parça Ücreti", "KDV"].includes(h) ? "right" : "left", fontSize: 11, fontWeight: 700, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {anlasmaliPaged.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "9px 12px", fontSize: 13, color: "#64748b" }}>{fmtTR(r.tarih) || "—"}</td>
                  <td style={{ padding: "9px 12px", fontSize: 13, fontWeight: 600 }}>{r.firmaAdi}</td>
                  <td style={{ padding: "9px 12px", fontSize: 13, color: "#64748b" }}>{r.islemFirma}</td>
                  <td style={{ padding: "9px 12px", fontSize: 13, textAlign: "right", fontWeight: 700, color: moneyVisible ? "#a855f7" : "#94a3b8" }}>{M(fmtCur(r.parcaUcreti, r.currency))}</td>
                  <td style={{ padding: "9px 12px", fontSize: 13, textAlign: "right", color: moneyVisible ? "#0d9488" : "#94a3b8" }}>{r.kdv > 0 ? M(fmtCur(r.kdv, r.currency)) : "—"}</td>
                  <td style={{ padding: "9px 12px", fontSize: 13 }}>
                    <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: r.odendi ? "#dcfce7" : "#fee2e2", color: r.odendi ? "#16a34a" : "#dc2626" }}>
                      {r.odendi ? "Ödendi" : "Ödenmedi"}
                    </span>
                  </td>
                </tr>
              ))}
              {anlasmaliFiltered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>Kayıt bulunamadı</td></tr>
              )}
            </tbody>
          </table>
          <Pagination total={anlasmaliFiltered.length} page={anlasmaliPage} setPage={setAnlasmaliPage} perPage={ANLASMALI_PER_PAGE} />
        </Modal>
      )}
    </div>
  );
};

