import { useState, useMemo, useEffect, useRef } from "react";
import { today, fmtTR, fmtCur, parseMoney, parcaAdi, totalMiktar, aramaNormalize, yedekParcaBedeli, isYedekParcaBorcluMu, calcKDV } from "../../lib/utils";
import { DEFAULT_KDV_RATES } from "../../lib/constants";
import { Icon, Btn, Input, Pagination, ConfirmDialog, Modal, LockConflict } from "../ui";
import { useLock } from "../../hooks/useLock";
import { YedekParcaSatisForm } from "../YedekParcaSatisForm";
import { TahsisModal, tahsisToplam, aliciAd, aliciRozet } from "./TahsisModal";
import { yedekParcaDus, yedekParcaGeriAl } from "../../lib/yedekParcaStok";
import { yedekParcaRec, yeniYedekParcaSatisCoklu } from "../../lib/yedekParcaSatis";
import { yansitilanKomisyon } from "../../lib/krediKarti";
import { yedekParcaEtiketYazdir } from "../../lib/printTemplates";
import { logAction } from "../../lib/audit";

// Satışın makina-bağ durumu (bekliyor / kısmi / tam).
const durumBilgi = (s) => {
  const alloc = tahsisToplam(s), m = parseInt(s.miktar) || 0;
  if (alloc <= 0) return { key: "bekliyor", label: "Bayi stoğu (bekliyor)", renk: "var(--amb700, #b45309)", bg: "var(--ambBg, #fffbeb)", br: "var(--ambBr, #fde68a)" };
  if (alloc < m) return { key: "kismi", label: `Kısmi bağlı (${alloc}/${m})`, renk: "var(--blu700, #1d4ed8)", bg: "var(--bluBg, #eff6ff)", br: "var(--bluBr, #bfdbfe)" };
  return { key: "tam", label: `Tam bağlı (${alloc}/${m})`, renk: "var(--grn700, #15803d)", bg: "var(--grnBg, #f0fdf4)", br: "var(--grnBr, #bbf7d0)" };
};

// Bir satışın alıcı grup anahtarı: müşteri / anlaşmasız dış firma / bayi (legacy = bayi).
export const aliciAnahtar = (s) =>
  s?.aliciTipi === "musteri" ? `m:${s.musteriId}`
  : s?.disFirma ? `x:${String(s.disFirmaAd || "").trim().toLowerCase()}`
  : `b:${s?.dealerId}`;

// Satışları alıcıya göre grupla + özet çıkar (satış sayısı, adet, para-birimi bazlı tutar/borç, eksik tahsis).
// Gruplar en son satış tarihine göre (yeni → eski); grup içi satırlar da yeni → eski sıralı.
export const gruplaSatislar = (kayitlar, { dealers = [], customers = [], kdvRates = DEFAULT_KDV_RATES } = {}) => {
  const map = new Map();
  for (const s of kayitlar) {
    const k = aliciAnahtar(s);
    if (!map.has(k)) map.set(k, { key: k, ad: aliciAd(s, dealers, customers), rozet: aliciRozet(s), records: [] });
    map.get(k).records.push(s);
  }
  const arr = [...map.values()].map(g => {
    let adet = 0, eksik = 0, sonTarih = "";
    const tutarCur = {}, borcCur = {};
    for (const s of g.records) {
      const m = parseInt(s.miktar) || 0; adet += m;
      if (tahsisToplam(s) < m) eksik++;
      const cur = s.currency || "TRY", bedel = yedekParcaBedeli(s);
      tutarCur[cur] = (tutarCur[cur] || 0) + bedel;
      if (isYedekParcaBorcluMu(s)) { const kdv = calcKDV(s.faturaTipi, bedel, s.tarih, kdvRates); borcCur[cur] = (borcCur[cur] || 0) + bedel + kdv; }
      if (String(s.tarih || "") > sonTarih) sonTarih = String(s.tarih || "");
    }
    g.records.sort((a, b) => String(b.tarih || "").localeCompare(String(a.tarih || "")));
    return { ...g, adet, eksik, tutarCur, borcCur, sonTarih };
  });
  arr.sort((a, b) => b.sonTarih.localeCompare(a.sonTarih));
  return arr;
};

// Para-birimi bazlı tutar haritasını "48.500 ₺ + 1.200 $" gibi metne çevir.
const curOzet = (m) => Object.entries(m).filter(([, v]) => v > 0).map(([c, v]) => fmtCur(v, c)).join(" + ");

export const YedekParcaSatisTab = ({
  yedekParcaSatislar = [], setYedekParcaSatislar,
  dealers = [], parts = [], customers = [], calisanlar = [], factory = null,
  partStock = [], setPartStock, partStockLog = [], setPartStockLog,
  kdvRates = DEFAULT_KDV_RATES, showToast = () => {}, canDoStock = () => true, serverPermissions = null,
  odakId = null, onOdakConsumed = null,
  geoData = null, loadingGeo = false, krediKartiKomisyonlari = null,
}) => {
  const audit = (action, id, rec, detail) => logAction({ serverPermissions, action, entity: "yedek_parca_satis", entityId: id, entityName: aliciAd(rec, dealers, customers), detail });
  const [modal, setModal] = useState(null);   // "add" | {edit: rec}
  const [form, setForm] = useState({});
  // Eşzamanlı düzenleme kilidi: aynı yedek parça satışını iki kullanıcı aynı anda düzenleyemesin.
  const { lockConflict: ypLock, forceAcquire: forceYpLock } = useLock("yedek_parca", modal?.edit?.id ?? null);
  const [tahsisSv, setTahsisSv] = useState(null); // tahsis modalı açık satış
  // Makinaya tahsis de aynı "yedek_parca" alanını kilitler — satış düzenleme / kargo detay / pano ile
  // ortak, böylece aynı satış iki yerden aynı anda tahsis/düzenleme yapılamaz (kalan miktar yarışı).
  const { lockConflict: tahsisLock, forceAcquire: forceTahsisLock } = useLock("yedek_parca", tahsisSv?.id ?? null);
  const [silOnay, setSilOnay] = useState(null);
  const [filtre, setFiltre] = useState("hepsi"); // "hepsi" | "eksik" — ikisi de alıcıya göre gruplu (varsayılan katlı)
  const [arama, setArama] = useState("");
  const [sayfa, setSayfa] = useState(1);
  const [acik, setAcik] = useState(() => new Set()); // açık (genişletilmiş) alıcı grup anahtarları
  const perPage = 10;
  const toggleAcik = (key) => setAcik(p => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const partMap = useMemo(() => { const m = {}; for (const p of parts) m[String(p.id)] = p; return m; }, [parts]);
  const custMap = useMemo(() => { const m = {}; for (const c of customers) m[c.id] = c; return m; }, [customers]);

  const liste = useMemo(() => {
    const arr = [...yedekParcaSatislar].sort((a, b) => String(b.tarih || "").localeCompare(String(a.tarih || "")));
    return filtre === "eksik" ? arr.filter(s => tahsisToplam(s) < (parseInt(s.miktar) || 0)) : arr;
  }, [yedekParcaSatislar, filtre]);
  // Arama: alıcı adı, parça adı, kargo firma/takip no, tarih, kargo durumu.
  const aranmis = useMemo(() => {
    const q = aramaNormalize(arama.trim());
    if (!q) return liste;
    return liste.filter(s => {
      const part = partMap[String(s.partId)];
      const hay = aramaNormalize([aliciAd(s, dealers, customers), parcaAdi(part), s.kargoTakipNo, s.kargoFirma, s.tarih, s.kargoDurum].filter(Boolean).join(" "));
      return hay.includes(q);
    });
  }, [liste, arama, partMap, dealers, customers]);
  // Her iki filtre de alıcıya göre gruplu gösterilir (varsayılan katlı, akordeon). "Tahsisi eksik" modda
  // `liste` zaten eksik satırlara indirgenmiş olur → gruplar yalnız eksik satışları taşır.
  const gruplar = useMemo(() => gruplaSatislar(aranmis, { dealers, customers, kdvRates }), [aranmis, dealers, customers, kdvRates]);
  const sayfalanmisGrup = useMemo(() => gruplar.slice((sayfa - 1) * perPage, sayfa * perPage), [gruplar, sayfa]);
  const toplamAdet = gruplar.length;
  useEffect(() => { setSayfa(1); }, [arama, filtre]); // filtre/arama değişince ilk sayfaya dön
  // Arama yapılınca eşleşen gruplar otomatik açılsın (parça/kargo no ile arayınca satır görünsün).
  useEffect(() => { if (arama.trim()) setAcik(new Set(gruplar.map(g => g.key))); }, [arama, gruplar]);

  // Bayi detayından "Yedek Parça Satışına git" → hedef satışa odaklan: filtre/arama temizle, sayfasına git,
  // satırı vurgula ve görünüme kaydır. odakRef, arama/filtre sıfırlama effect'inin sayfayı ezmemesi için.
  const [vurgulu, setVurgulu] = useState(null);
  const odakRef = useRef(null);
  const rowRef = useRef(null);
  useEffect(() => {
    if (odakId == null) return;
    const hedef = yedekParcaSatislar.find(s => s.id === odakId);
    odakRef.current = odakId;
    setFiltre("hepsi"); setArama("");
    if (hedef) setAcik(p => new Set(p).add(aliciAnahtar(hedef))); // hedefin grubunu aç ki satır görünsün
    setVurgulu(odakId);
    onOdakConsumed?.();
  }, [odakId]);
  useEffect(() => { // arama/filtre sıfırlama effect'inden SONRA çalışır → hedef grubun sayfasını kesin uygular
    if (odakRef.current == null) return;
    const hedef = yedekParcaSatislar.find(s => s.id === odakRef.current);
    if (hedef) {
      const gs = gruplaSatislar(yedekParcaSatislar, { dealers, customers, kdvRates });
      const idx = gs.findIndex(g => g.key === aliciAnahtar(hedef));
      if (idx >= 0) setSayfa(Math.floor(idx / perPage) + 1);
    }
    odakRef.current = null;
  }, [vurgulu]);
  useEffect(() => { // sayfa hazır olunca satırı kaydır + bir süre sonra vurguyu kaldır
    if (vurgulu == null || !rowRef.current) return;
    rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setVurgulu(null), 2600);
    return () => clearTimeout(t);
  }, [vurgulu, sayfa]);
  const eksikSayi = useMemo(() => yedekParcaSatislar.filter(s => tahsisToplam(s) < (parseInt(s.miktar) || 0)).length, [yedekParcaSatislar]);

  const openAdd = () => {
    if (!canDoStock("yedek_parca_add")) return;
    setForm({ aliciTipi: "bayi", dealerId: "", musteriId: "", satirlar: [{ partId: "", miktar: "", birimFiyat: "" }], currency: "TRY", tarih: today(), faturaTipi: "Faturalı Yurtiçi", odendi: false });
    setModal("add");
  };
  const openEdit = (rec) => {
    if (!canDoStock("yedek_parca_edit")) return;
    // Komisyon yansıtıldıysa kayıtta birimFiyat = KDV matrahı/miktar; formda kalem göster (komisyon payını çıkar).
    const komisyon = yansitilanKomisyon(rec);
    const mik = parseInt(rec.miktar) || 0;
    const kalemBirim = (komisyon > 0 && mik > 0) ? parseMoney(rec.birimFiyat) - komisyon / mik : (rec.birimFiyat ?? "");
    setForm({ ...rec, miktar: String(rec.miktar ?? ""), birimFiyat: kalemBirim, kkYansit: !!(rec.kartKomisyonu && rec.kartKomisyonu.yansitildi), kartTarihi: rec.kartKomisyonu?.bazTarih || "" });
    setModal({ edit: rec });
  };

  const kaydet = () => {
    if (modal === "add") {
      // Çoklu satır: her parça satırı ayrı kayıt (stok kontrolü eksiye düşmez, alıcı müşteriyse otomatik tahsis).
      const r = yeniYedekParcaSatisCoklu(form, { setYedekParcaSatislar, setPartStock, setPartStockLog, partStock, ayar: krediKartiKomisyonlari, kdvRates });
      if (!r.ok) { showToast(r.hata, "err"); return; }
      r.ids.forEach(id => audit("olusturuldu", id, form));
      showToast(r.n > 1 ? `${r.n} yedek parça satışı kaydedildi, stoktan düşüldü.` : "Yedek parça satışı kaydedildi, stoktan düşüldü.");
    } else {
      const sonuc = yedekParcaRec(form, krediKartiKomisyonlari, kdvRates);
      if (!sonuc.ok) { showToast(sonuc.hata, "err"); return; }
      const rec = sonuc.rec, eski = modal.edit;
      // Parça/miktar değişmiş olabilir → eski stok hareketini geri al, yenisini düş.
      yedekParcaGeriAl(eski.id, setPartStock, setPartStockLog);
      // Stok eksiye düşmesin: kullanılabilir = mevcut stok + bu satışın (aynı parça) GERİ GELEN düşümü
      // (log'daki gerçek düşüm; eski.miktar değil, çünkü eski satış da kırpılmış olabilir).
      const eskiDusum = (partStockLog || []).filter(l => l.referansId === eski.id && l.tip === "bayi_satis" && String(l.partId) === String(rec.partId)).reduce((s, l) => s + Math.abs(l.miktar), 0);
      const kullanilabilir = totalMiktar(partStock, rec.partId) + eskiDusum;
      const dusulen = Math.min(rec.miktar, Math.max(0, kullanilabilir));
      yedekParcaDus(rec.partId, dusulen, eski.id, setPartStock, setPartStockLog);
      setYedekParcaSatislar(p => p.map(s => s.id === eski.id ? { ...s, ...rec } : s));
      audit("duzenlendi", eski.id, rec);
      showToast("Satış güncellendi.");
    }
    setModal(null);
  };

  const sil = (rec) => {
    if (!canDoStock("yedek_parca_delete")) return;
    yedekParcaGeriAl(rec.id, setPartStock, setPartStockLog);
    setYedekParcaSatislar(p => p.map(s => s.id === rec.id ? { ...s, deletedAt: new Date().toISOString() } : s));
    audit("silindi", rec.id, rec);
    setSilOnay(null);
    showToast("Satış silindi, stok geri alındı.");
  };

  const odendiToggle = (rec) => {
    if (!canDoStock("yedek_parca_edit")) return;
    setYedekParcaSatislar(p => p.map(s => s.id === rec.id ? { ...s, odendi: !s.odendi } : s));
    audit(rec.odendi ? "odeme_iptal" : "odendi", rec.id, rec);
  };

  const tahsisEkle = (satisId, t) => {
    setYedekParcaSatislar(p => p.map(s => s.id === satisId ? { ...s, tahsisler: [...(s.tahsisler || []), t] } : s));
    audit("tahsis_edildi", satisId, yedekParcaSatislar.find(s => s.id === satisId), { miktar: t.miktar });
  };
  const tahsisSil = (satisId, idx) => {
    setYedekParcaSatislar(p => p.map(s => s.id === satisId ? { ...s, tahsisler: (s.tahsisler || []).filter((_, i) => i !== idx) } : s));
    audit("tahsis_kaldirildi", satisId, yedekParcaSatislar.find(s => s.id === satisId));
  };

  // Tek satış satırı kartı. grupIci=true iken alıcı adı/rozet başlığı gizlenir (grup başlığında zaten var).
  const satirKart = (s, grupIci = false) => {
    const d = durumBilgi(s);
    const part = partMap[String(s.partId)];
    const toplam = (parseInt(s.miktar) || 0) * parseMoney(s.birimFiyat);
    const kalan = (parseInt(s.miktar) || 0) - tahsisToplam(s);
    const odakli = s.id === vurgulu;
    return (
      <div key={s.id} ref={odakli ? rowRef : null}
        className={odakli ? "servis-alarm-yanip" : undefined}
        style={{ border: odakli ? "1px solid var(--cyan, #0891b2)" : "1px solid var(--n200, #e2e8f0)", borderLeft: `3px solid ${d.renk}`, borderRadius: 12, padding: "12px 14px", background: "var(--surface, #fff)", boxShadow: odakli ? "0 0 0 2px var(--cyan, #0891b2)" : "none" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            {!grupIci && (
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--n900, #0f172a)", display: "flex", alignItems: "center", gap: 7 }}>
                {aliciAd(s, dealers, customers)}
                {(() => { const r = aliciRozet(s); return (
                  <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: .3, borderRadius: 5, padding: "2px 6px", background: r.bg, color: r.color }}>{r.label}</span>
                ); })()}
              </div>
            )}
            <div style={{ fontSize: grupIci ? 13.5 : 12.5, fontWeight: grupIci ? 700 : 400, color: grupIci ? "var(--n900, #0f172a)" : "var(--n600, #475569)", marginTop: grupIci ? 0 : 2 }}>
              {parcaAdi(part) || "(parça yok)"} · <strong>{s.miktar} adet</strong> · {fmtCur(toplam, s.currency || "TRY")}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--n400, #94a3b8)", marginTop: 2 }}>
              {fmtTR(s.tarih)}{s.kargoDurum ? ` · 📦 ${s.kargoDurum}` : ""}{s.kargoTakipNo ? ` · ${s.kargoFirma || "Kargo"} ${s.kargoTakipNo}` : ""}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: d.renk, background: d.bg, border: `1px solid ${d.br}`, borderRadius: 999, padding: "2px 10px" }}>{d.label}</span>
            <button onClick={() => odendiToggle(s)} disabled={!canDoStock("yedek_parca_edit")}
              style={{ fontSize: 11.5, fontWeight: 700, cursor: canDoStock("yedek_parca_edit") ? "pointer" : "default", border: "none", borderRadius: 999, padding: "2px 10px",
                color: s.odendi ? "var(--grn700, #15803d)" : "var(--amb800, #92400e)", background: s.odendi ? "var(--grnBg, #f0fdf4)" : "var(--ambBg, #fffbeb)" }}>
              {s.odendi ? "Ödendi" : "Ödenmedi"}
            </button>
          </div>
        </div>

        {/* Tahsisler listesi */}
        {(s.tahsisler || []).length > 0 && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            {s.tahsisler.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--n600, #475569)", background: "var(--n100, #f8fafc)", borderRadius: 8, padding: "5px 10px" }}>
                <span>🔗 <strong>{t.miktar} adet</strong> → {custMap[t.customerId]?.name || t.makinaSerbest || "(makina)"}{custMap[t.customerId]?.serialNo ? ` · S/N ${custMap[t.customerId].serialNo}` : t.serialNo ? ` · S/N ${t.serialNo}` : ""}{t.tarih ? ` · ${fmtTR(t.tarih)}` : ""}</span>
                {canDoStock("yedek_parca_edit") && (
                  <button onClick={() => tahsisSil(s.id, i)} title="Tahsisi kaldır"
                    style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--n400, #94a3b8)" }}><Icon name="close" size={15} /></button>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {canDoStock("yedek_parca_edit") && kalan > 0 && (
            <button onClick={() => setTahsisSv(s)} style={{ fontSize: 12, fontWeight: 600, color: "var(--brand, #e85d1a)", background: "none", border: "1px solid var(--ambBr, #fde68a)", borderRadius: 8, cursor: "pointer", padding: "5px 11px" }}>
              🔗 Makinaya tahsis et ({kalan} kaldı)
            </button>
          )}
          <Btn small variant="ghost" title="Kargo Etiketi Yazdır" onClick={() => {
            // Aynı batch'teki (toplu satış) tüm satırlar tek etikette (tek sevkiyat).
            const grup = s.batchId != null ? yedekParcaSatislar.filter(x => x.batchId === s.batchId && !x.deletedAt) : [s];
            yedekParcaEtiketYazdir(grup, { parts, dealers, customers, factory });
          }}><Icon name="print" size={14} /></Btn>
          {canDoStock("yedek_parca_edit") && <Btn small variant="ghost" title="Düzenle" onClick={() => openEdit(s)}><Icon name="edit" size={14} /></Btn>}
          {canDoStock("yedek_parca_delete") && <Btn small variant="danger" title="Sil" onClick={() => setSilOnay(s)}><Icon name="trash" size={14} /></Btn>}
        </div>
      </div>
    );
  };

  // Alıcı grup başlığı (özet + aç/kapa).
  const grupBasligi = (g) => {
    const acikMi = acik.has(g.key) || gruplar.length === 1; // tek alıcı varsa katlamanın anlamı yok → hep açık
    const borc = curOzet(g.borcCur);
    return (
      <div key={g.key} style={{ border: "1px solid var(--n200, #e2e8f0)", borderRadius: 12, background: "var(--surface, #fff)", overflow: "hidden" }}>
        <button onClick={() => toggleAcik(g.key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left", flexWrap: "wrap" }}>
          <span style={{ color: "var(--n400, #94a3b8)", fontSize: 13, width: 12, flexShrink: 0 }}>{acikMi ? "▾" : "▸"}</span>
          <span style={{ fontSize: 14.5, fontWeight: 800, color: "var(--n900, #0f172a)" }}>{g.ad}</span>
          <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: .3, borderRadius: 5, padding: "2px 6px", background: g.rozet.bg, color: g.rozet.color }}>{g.rozet.label}</span>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span style={{ fontSize: 12, color: "var(--n500, #64748b)" }}>{g.records.length} satış · {g.adet} adet · {curOzet(g.tutarCur) || "—"}</span>
            {borc && <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--amb800, #92400e)", background: "var(--ambBg, #fffbeb)", border: "1px solid var(--ambBr, #fde68a)", borderRadius: 999, padding: "2px 10px" }}>Ödenmemiş {borc}</span>}
            {g.eksik > 0 && <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--amb700, #b45309)", background: "var(--ambBg, #fffbeb)", border: "1px solid var(--ambBr, #fde68a)", borderRadius: 999, padding: "2px 10px" }}>Tahsis eksik {g.eksik}</span>}
          </span>
        </button>
        {acikMi && (
          <div style={{ padding: "0 14px 14px 14px", display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--n100, #f1f5f9)" }}>
            <div style={{ height: 4 }} />
            {g.records.map(s => satirKart(s, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {[["hepsi", `Tümü (${yedekParcaSatislar.length})`], ["eksik", `Tahsisi eksik (${eksikSayi})`]].map(([v, l]) => (
          <button key={v} onClick={() => setFiltre(v)} style={{
            padding: "6px 14px", borderRadius: 999, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
            border: `1px solid ${filtre === v ? "var(--brand, #e85d1a)" : "var(--n200, #e2e8f0)"}`,
            background: filtre === v ? "var(--brand, #e85d1a)" : "transparent", color: filtre === v ? "#fff" : "var(--n500, #64748b)",
          }}>{l}</button>
        ))}
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180, maxWidth: 340 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--n400, #94a3b8)", pointerEvents: "none" }}><Icon name="search" size={14} /></span>
          <input value={arama} onChange={e => setArama(e.target.value)} placeholder="Alıcı, parça, kargo no ile ara..."
            style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 13.5, background: "var(--n100, #f8fafc)", boxSizing: "border-box", outline: "none" }} />
        </div>
        {canDoStock("yedek_parca_add") && <span style={{ marginLeft: "auto" }}><Btn onClick={openAdd}><Icon name="plus" size={14} /> Yeni Satış</Btn></span>}
      </div>

      {toplamAdet === 0 ? (
        <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--n400, #94a3b8)", fontSize: 13.5 }}>
          {arama.trim() ? "Aramanıza uyan satış yok." : filtre === "eksik" ? "Tahsisi eksik satış yok." : "Henüz yedek parça satışı yok. \"Yeni Satış\" ile ekleyin."}
        </div>
      ) : (
        // Her iki filtre de alıcıya göre gruplu — bayi/müşteri/anlaşmasız servis kartı, tıklayınca satışlar açılır (katlı).
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sayfalanmisGrup.map(g => grupBasligi(g))}
          <Pagination total={gruplar.length} page={sayfa} setPage={setSayfa} perPage={perPage} />
        </div>
      )}

      {modal && ((ypLock && modal?.edit) ? (
        <Modal title="Yedek Parça Satışını Düzenle" onClose={() => setModal(null)}>
          <LockConflict lockedBy={ypLock.lockedBy} lockedAt={ypLock.lockedAt} onForce={forceYpLock} onCancel={() => setModal(null)} />
        </Modal>
      ) : (
        <YedekParcaSatisForm
          title={modal === "add" ? "Yeni Yedek Parça Satışı" : "Yedek Parça Satışını Düzenle"}
          form={form} setForm={setForm} dealers={dealers} customers={customers} parts={parts} partStock={partStock} calisanlar={calisanlar}
          kdvRates={kdvRates} krediKartiKomisyonlari={krediKartiKomisyonlari} geoData={geoData} loadingGeo={loadingGeo} onSave={kaydet} onCancel={() => setModal(null)} />
      ))}

      {tahsisSv && (tahsisLock ? (
        <Modal title="Makinaya Tahsis" onClose={() => setTahsisSv(null)}>
          <LockConflict lockedBy={tahsisLock.lockedBy} lockedAt={tahsisLock.lockedAt}
            onForce={forceTahsisLock} onCancel={() => setTahsisSv(null)} />
        </Modal>
      ) : (
        <TahsisModal customers={customers}
          kalan={(parseInt(tahsisSv.miktar) || 0) - tahsisToplam(tahsisSv)}
          onEkle={(t) => { tahsisEkle(tahsisSv.id, t); setTahsisSv(null); }}
          onClose={() => setTahsisSv(null)} showToast={showToast} />
      ))}

      {silOnay && (
        <ConfirmDialog title="Satışı sil" message={`Bu yedek parça satışı silinecek ve düşülen ${silOnay.miktar} adet stoğa geri eklenecek. Makina tahsisleri de kaldırılır.`}
          onConfirm={() => sil(silOnay)} onCancel={() => setSilOnay(null)} />
      )}
    </div>
  );
};
