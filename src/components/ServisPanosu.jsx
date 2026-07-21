import { useMemo, useState, useEffect } from "react";
import { today, fmtTR, uid, bumpId, parseMoney, normalizeSaleType, simdiYerel, sureDk, sureBicim, fmtZaman, fmtZamanTam } from "../lib/utils";
import { servisSureleri } from "../lib/servisAnaliz";
import { servisParcaDus, servisParcaGeriAl } from "../lib/servisStok";
import { logAction, getAuditUsername } from "../lib/audit";
import { makeCanDo } from "../lib/permissions";
import { Icon, Btn, Modal } from "./ui";
import { ServiceForm } from "./ServiceForm";
import { printServiceForm as printServiceFormTemplate } from "../lib/printTemplates";

// Servis Panosu (Kanban) — servisin iş durumu: Bekliyor / Yapılıyor / Tamamlandı. Kartlar
// sürükle-bırakla sütun değiştirir (durum), her kartta teknisyen (firma çalışanı) seçilir.
// Servis katı bilgisayarında "kiosk" olarak tam ekran açılır; ana uygulamada normal sekmedir.
// Yalnız `durum`u olan servisler panoda görünür (eski/durumsuz kayıtlar müşteri kartında yönetilir).

// key = saklanan `durum` değeri (değiştirilemez; sürükle-bırak, geçmiş rozetleri, DB'ye bağlı).
// baslik = sütunda görünen ad (serbestçe değişebilir).
const DURUMLAR = [
  { key: "Bekliyor", baslik: "Bekliyor / Fabrikaya Giriş", renk: "var(--amb600, #d97706)", bg: "var(--ambBg, #fffbeb)", br: "var(--ambBr, #fde68a)", bos: "Yeni servisler burada belirir." },
  { key: "Yapılıyor", baslik: "Bakım Onarım Yapılıyor", renk: "var(--blu600, #2563eb)", bg: "var(--bluBg, #eff6ff)", br: "var(--bluBr, #bfdbfe)", bos: "Kart yok. Buraya sürükle." },
  { key: "Tamamlandı", baslik: "Bakım Onarım Tamamlandı", renk: "var(--grn600, #16a34a)", bg: "var(--grnBg, #f0fdf4)", br: "var(--grnBr, #bbf7d0)", bos: "Kart yok. Buraya sürükle." },
];
const [DURUM_BEK, DURUM_YAP, DURUM_TAM] = DURUMLAR;
// Aşama zaman kutusu — "Periyodik Bakım" rozetiyle aynı biçim, ilgili aşamanın renginde.
const pilStil = (d) => ({ fontSize: 11, fontWeight: 700, borderRadius: 7, padding: "3px 8px", color: d.renk, background: d.bg, border: `1px solid ${d.br}` });

const TUR_STIL = {
  "Periyodik Bakım": { fg: "var(--n600, #475569)", bg: "var(--n150, #f1f5f9)", br: "var(--n200, #e2e8f0)" },
  "Garanti İçi": { fg: "var(--grn700, #15803d)", bg: "var(--grnBg, #f0fdf4)", br: "var(--grnBr, #bbf7d0)" },
  "Garanti Dışı": { fg: "var(--amb700, #b45309)", bg: "var(--ambBg, #fffbeb)", br: "var(--ambBr, #fde68a)" },
  "İlk Çalıştırma": { fg: "var(--blu700, #1d4ed8)", bg: "var(--bluBg, #eff6ff)", br: "var(--bluBr, #bfdbfe)" },
};

// Yeni servis formu başlangıcı — müşteri detayındaki openAddService ile birebir aynı alanlar,
// tek fark customerId boş (pano herhangi bir müşteriyi form içindeki seçiciden seçtirir).
const bosForm = (factoryName) => ({
  customerId: "", type: "Periyodik Bakım", repairPlace: "Yerinde Onarım", yapilanIsler: "",
  musteriTalimati: "", fabrikaNotu: "", servisUcreti: "", date: today(), tech: "",
  islemFirma: factoryName, islemFirmaAd: "", islemFirmaYetkili: "", islemFirmaTel: "",
  islemFirmaUlke: "", islemFirmaSehir: "", odendi: false, degisenParcalar: [], parcaUcreti: "",
  currency: "TRY", parcaGarantiDisi: false, durum: "Bekliyor", faturaTipi: "",
});

export const ServisPanosu = ({
  services = [], setServices, customers = [], calisanlar = [], factory = null,
  parts = [], dealers = [], kdvRates = null, geoData = null, loadingGeo = false,
  setPartStock = null, setPartStockLog = null,
  dosyalar = [], setDosyalar = null, dosyaCevrimdisi = false, appSettings = null,
  showToast = () => {}, serverPermissions = null, kiosk = false, onKilitle = null,
}) => {
  const canDo = makeCanDo(serverPermissions, "customerActions");
  const [svModal, setSvModal] = useState(null);   // null | "add" | { edit: sv }
  const [form, setForm] = useState(bosForm(factory?.name || "Altuntaş Makina"));
  const [hoverDurum, setHoverDurum] = useState(null);
  const [arsivAcik, setArsivAcik] = useState(false);

  // ── Canlı saat & tarih (Anasayfa ile aynı) ──
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const saat = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const tarih = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  // Canlı işçilik sayacı için `now`u yerel ISO'ya çevir (servisSureleri'ye verilir).
  const nowIso = (() => { const p = (n) => String(n).padStart(2, "0"); return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}:${p(now.getSeconds())}`; })();
  const [analizSv, setAnalizSv] = useState(null); // per-servis süre analizi modalı

  const custMap = useMemo(() => { const m = {}; for (const c of customers) m[c.id] = c; return m; }, [customers]);
  const factoryName = factory?.name || "Altuntaş Makina";

  // Yalnız durumu olan VE panodan kaldırılmamış (arşivlenmemiş) servisler; sütunlara göre grupla.
  const sutunlar = useMemo(() => {
    const g = { "Bekliyor": [], "Yapılıyor": [], "Tamamlandı": [] };
    for (const s of services) if (s.durum && g[s.durum] && !s.panoGizli) g[s.durum].push(s);
    for (const k of Object.keys(g)) g[k].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    return g;
  }, [services]);

  // Arşivlenenler: "Panodan Kaldır" ile gizlenen (servis kaydı duran) Tamamlandı kartları.
  const arsivlenenler = useMemo(
    () => services.filter(s => s.panoGizli && s.durum).sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))),
    [services]
  );

  const durumDegistir = (id, durum) => {
    if (!setServices || !canDo("cust_service_edit")) return;
    const ts = simdiYerel();
    // Tamamlandı dışına geri sürüklenirse arşiv bayrağını da temizle (kart yeniden panoda görünsün).
    setServices(p => p.map(s => {
      if (s.id !== id) return s;
      const u = { ...s, durum, panoGizli: durum === "Tamamlandı" ? s.panoGizli : false };
      // Aşama zaman damgaları: giriş/başlangıç boşsa doldurulur (ilk zaman korunur, geri-ileri
      // sürüklemede bozulmaz); Tamamlandı bitişi her girişte güncellenir (en son bitiş anlamlı).
      if (durum === "Bekliyor" && !u.fabrikaGirisZamani) u.fabrikaGirisZamani = ts;
      if (durum === "Yapılıyor" && !u.bakimBaslangicZamani) u.bakimBaslangicZamani = ts;
      if (durum === "Tamamlandı") u.bitisZamani = ts;
      return u;
    }));
  };
  const teknisyenDegistir = (id, tech) => {
    if (!setServices || !canDo("cust_service_edit")) return;
    setServices(p => p.map(s => s.id === id ? { ...s, tech } : s));
  };
  const panoGizle = (id, gizli) => {
    // Kaldır (arşivle) ve geri-al ayrı izinler: Servis Panosu işlemleri altında (Kullanıcı Yönetimi).
    if (!setServices || !canDo(gizli ? "cust_service_pano_kaldir" : "cust_service_pano_arsiv")) return;
    setServices(p => p.map(s => s.id === id ? { ...s, panoGizli: gizli } : s));
    showToast(gizli ? "Kart panodan kaldırıldı (servis kaydı duruyor)." : "Kart panoya geri alındı.");
  };
  const arsivGorebilir = canDo("cust_service_pano_arsiv");

  // Servis Formu yazdır — müşteri detayındaki printServiceForm ile birebir aynı (aynı şablon,
  // aynı çeviri/kaşe/resim bağlamı), böylece iki çıktı asla ayrışmaz.
  const servisT = (lang = "TR") => ({ ...((appSettings?.translations?.servis) || {}), _lang: lang });
  const kaseResmi = appSettings?.kaseResmi || "";
  const servisResimleri = async (sv) => {
    if (!window.appFiles?.dataUrl) return [];
    const RESIM = /\.(jpg|jpeg|png|gif|webp)$/i;
    const ekler = (dosyalar || []).filter(d => !d.deletedAt && d.refType === "servis" && d.refId === sv.id && RESIM.test(d.dosyaAdi || ""));
    const sonuc = [];
    for (const d of ekler) {
      try { const r = await window.appFiles.dataUrl(d.dosyaAdi); if (r?.ok && r.dataUrl) sonuc.push({ dataUrl: r.dataUrl, ad: d.ad || d.dosyaAdi }); }
      catch { /* okunamayan resim çıktıyı engellemesin */ }
    }
    return sonuc;
  };
  const printServiceForm = async (sv, lang = "TR") =>
    printServiceFormTemplate(sv, customers, kdvRates, servisT(lang), kaseResmi, factory, await servisResimleri(sv));

  // Müşteri detayındaki servis ekle/düzenle ile birebir aynı: tam ServiceForm + aynı kayıt/stok mantığı.
  const acEkle = () => { setForm(bosForm(factoryName)); setSvModal("add"); };
  const acDuzenle = (sv) => {
    const eski = (sv.degisenParcalar || []).some(p => typeof p === "string");
    const degisenParcalar = eski
      ? sv.degisenParcalar.map(ad => ({ ad, fiyat: sv.degisenParcalar.length ? parseMoney(sv.parcaUcreti) / sv.degisenParcalar.length : 0 }))
      : (sv.degisenParcalar || []);
    const cust = customers.find(c => c.id === sv.customerId);
    setForm({ parcaUcreti: "", parcaGarantiDisi: false, faturaTipi: normalizeSaleType(cust?.faturali), ...sv, degisenParcalar });
    setSvModal({ edit: sv });
  };

  // Servis formunda eklenen dosya taslaklarını (fiziksel dosya zaten yüklendi) servise bağla —
  // müşteri detayındaki bindServisDosyalari ile birebir aynı.
  const bindServisDosyalari = (servisId, taslaklar) => {
    if (!setDosyalar || !servisId || !taslaklar?.length) return;
    const cust = customers.find(c => c.id === Number(form.customerId));
    bumpId(dosyalar);
    const yeni = taslaklar.map(f => ({ id: uid(), customerId: Number(form.customerId), refType: "servis", refId: servisId, ad: f.ad, dosyaAdi: f.dosyaAdi, boyut: f.boyut, tur: f.tur, tarih: today(), ekleyen: getAuditUsername() }));
    setDosyalar(p => [...yeni, ...p]);
    yeni.forEach(d => logAction({ serverPermissions, action: "olusturuldu", entity: "dosya", entityId: d.id, entityName: cust?.name, detail: { ad: d.ad } }));
  };

  const kaydet = (parcaUcretsizMi, dosyaTaslaklari = []) => {
    if (!setServices) return;
    const cust = customers.find(c => c.id === Number(form.customerId));
    const parcaUcreti = (form.degisenParcalar || []).reduce((s, p) => s + parseMoney(typeof p === "string" ? 0 : p.fiyat), 0);
    const parcaUcretiAltuntastan = (form.degisenParcalar || []).filter(p => typeof p !== "string" && !p.disTedarik).reduce((s, p) => s + parseMoney(p.fiyat), 0);
    const rec = { ...form, customerId: form.customerId ? Number(form.customerId) : null, parcaUcretsizMi, parcaUcreti, parcaUcretiAltuntastan, parcaCurrency: form.currency };
    if (svModal === "add") {
      bumpId(customers, services);
      const newId = uid();
      // Yeni servis "Bekliyor" ile açılır → fabrikaya giriş anı damgalanır (elle girilmişse korunur).
      const yeniRec = { ...rec, id: newId };
      if (yeniRec.durum === "Bekliyor" && !yeniRec.fabrikaGirisZamani) yeniRec.fabrikaGirisZamani = simdiYerel();
      setServices(p => p.some(s => s.id === newId) ? p : [yeniRec, ...p]);
      servisParcaDus(rec.degisenParcalar, newId, setPartStock, setPartStockLog);
      bindServisDosyalari(newId, dosyaTaslaklari);
      logAction({ serverPermissions, action: "olusturuldu", entity: "servis", entityId: newId, entityName: cust?.name, detail: { type: rec.type } });
      showToast(dosyaTaslaklari.length ? `Servis talebi kaydedildi (${dosyaTaslaklari.length} dosya eklendi).` : "Servis talebi kaydedildi → Bekliyor.");
    } else {
      restoreThenSave(rec);
      bindServisDosyalari(form.id, dosyaTaslaklari);
      logAction({ serverPermissions, action: "duzenlendi", entity: "servis", entityId: form.id, entityName: cust?.name });
      showToast("Servis talebi düzenlendi.");
    }
    setSvModal(null);
  };
  const restoreThenSave = (rec) => {
    servisParcaGeriAl(form.id, setPartStock, setPartStockLog);
    setServices(p => p.map(s => s.id === form.id ? rec : s));
    servisParcaDus(rec.degisenParcalar, form.id, setPartStock, setPartStockLog);
  };

  // Teknisyen seçenekleri (form.tech listede yoksa onu da göster ki eski/serbest değer kaybolmasın)
  const tekAdlari = calisanlar.map(c => c.ad).filter(Boolean);

  const Kart = ({ sv, arsiv = false }) => {
    const c = custMap[Number(sv.customerId)] || {};
    const stil = TUR_STIL[sv.type] || TUR_STIL["Periyodik Bakım"];
    const durumRenk = (DURUMLAR.find(d => d.key === sv.durum) || DURUMLAR[0]).renk;
    const teksBos = !sv.tech;
    const teknListe = sv.tech && !tekAdlari.includes(sv.tech) ? [sv.tech, ...tekAdlari] : tekAdlari;
    const surukle = canDo("cust_service_edit") && !arsiv;
    const tamamlandi = sv.durum === "Tamamlandı";
    return (
      <article draggable={surukle}
        onDragStart={surukle ? (e => { e.dataTransfer.setData("text/plain", String(sv.id)); e.dataTransfer.effectAllowed = "move"; }) : undefined}
        onClick={() => acDuzenle(sv)}
        style={{ background: arsiv ? "var(--n100, #f8fafc)" : "var(--surface, #fff)", border: "1px solid var(--n200, #e2e8f0)", borderLeft: `3px solid ${durumRenk}`, borderRadius: 12, padding: arsiv ? "10px 12px" : "12px 13px 11px", boxShadow: arsiv ? "none" : "0 1px 3px rgba(20,20,30,.07)", opacity: arsiv ? 0.9 : 1, cursor: surukle ? "grab" : "pointer" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: arsiv ? 13 : 14, lineHeight: 1.25, color: "var(--n900, #0f172a)", flex: 1 }}>{c.name || "(müşteri yok)"}</div>
          {!arsiv && <span style={{ color: "var(--n300, #cbd5e1)", fontSize: 14, letterSpacing: -2, userSelect: "none" }}>⠿</span>}
        </div>
        <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{c.model || "Model yok"}{c.serialNo ? ` · S/N ${c.serialNo}` : ""}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 7, padding: "3px 8px", color: stil.fg, background: stil.bg, border: `1px solid ${stil.br}` }}>{sv.type}</span>
          {sv.repairPlace && <span style={{ fontSize: 11.5, color: "var(--n400, #94a3b8)" }}>{sv.repairPlace}</span>}
          <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--n400, #94a3b8)", fontVariantNumeric: "tabular-nums" }}>{sv.date ? `Talep ${fmtTR(sv.date)}` : "—"}</span>
        </div>
        {/* Aşama zaman göstergesi: giriş (Bekliyor) / canlı işçilik (Yapılıyor) / bitiş+işçilik (Tamamlandı) */}
        {!arsiv && (() => {
          const s = servisSureleri(sv, nowIso);
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7, fontSize: 11, fontVariantNumeric: "tabular-nums", flexWrap: "wrap" }}>
              {/* "Periyodik Bakım" rozeti gibi renkli kutular: her aşama zamanı kendi renginde.
                  Giriş (amber) her sütunda kalır; Başlangıç (mavi) ve Bitiş (yeşil) varsa görünür. */}
              {s.giris && <span style={pilStil(DURUM_BEK)}>Giriş {fmtZamanTam(s.giris)}</span>}
              {s.baslangic && <span style={pilStil(DURUM_YAP)}>Başlangıç {fmtZamanTam(s.baslangic)}</span>}
              {s.bitis && <span style={pilStil(DURUM_TAM)}>Bitiş {fmtZamanTam(s.bitis)}</span>}
              {/* Canlı sayaç: Bekliyor = bekleme, Yapılıyor = işçilik; Tamamlandı = kesin işçilik süresi. */}
              {sv.durum === "Bekliyor" && s.giris && <span style={pilStil(DURUM_BEK)}>⏱ {sureBicim(sureDk(s.giris, nowIso))}</span>}
              {sv.durum === "Yapılıyor" && s.devamEdiyor && <span style={pilStil(DURUM_YAP)}>⏱ {sureBicim(s.isclikDk)}</span>}
              {tamamlandi && s.isclikDk != null && <span style={pilStil(DURUM_TAM)}>İşçilik {sureBicim(s.isclikDk)}</span>}
            </div>
          );
        })()}
        {/* Servis Süre Analizi — "Periyodik Bakım" gibi kutu, kolayca tıklanır (ikon yerine tam kutu) */}
        {!arsiv && (
          <button type="button" onClick={e => { e.stopPropagation(); setAnalizSv(sv); }}
            style={{ display: "block", width: "100%", marginTop: 8, padding: "6px 10px", fontSize: 11.5, fontWeight: 700, borderRadius: 8, cursor: "pointer",
              color: "var(--n600, #475569)", background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)" }}>
            Servis Süre Analizi
          </button>
        )}
        {arsiv ? (
          arsivGorebilir && (
            <div style={{ marginTop: 9, paddingTop: 8, borderTop: "1px dashed var(--n200, #e2e8f0)" }} onClick={e => e.stopPropagation()}>
              <button type="button" onClick={() => panoGizle(sv.id, false)}
                style={{ fontSize: 12, fontWeight: 600, color: "var(--blu600, #2563eb)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>↩ Panoya Geri Al</button>
            </div>
          )
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10, paddingTop: 9, borderTop: "1px dashed var(--n200, #e2e8f0)" }} onClick={e => e.stopPropagation()}>
            <select value={sv.tech || ""} disabled={!canDo("cust_service_edit")}
              onChange={e => teknisyenDegistir(sv.id, e.target.value)}
              style={{ flex: 1, minWidth: 0, font: "inherit", fontSize: 12.5, fontWeight: teksBos ? 500 : 600, color: teksBos ? "var(--n400, #94a3b8)" : "var(--n800, #1e293b)", background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, padding: "5px 8px", cursor: "pointer" }}>
              <option value="">Kim yapıyor?</option>
              {teknListe.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {tamamlandi && (
              <button type="button" title="Servis Formu yazdır" onClick={() => printServiceForm(sv)}
                style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 600, color: "var(--n600, #475569)", background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, padding: "5px 9px", cursor: "pointer", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="print" size={12} /> Yazdır</button>
            )}
            {tamamlandi && canDo("cust_service_pano_kaldir") && (
              <button type="button" title="Kartı panodan kaldır (servis kaydı silinmez)" onClick={() => panoGizle(sv.id, true)}
                style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 600, color: "var(--n500, #64748b)", background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, padding: "5px 9px", cursor: "pointer", whiteSpace: "nowrap" }}>🗄 Kaldır</button>
            )}
          </div>
        )}
      </article>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: kiosk ? "100%" : "calc(100vh - 0px)", minHeight: 0 }}>
      {/* Araç çubuğu */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: kiosk ? "12px 18px" : "0 0 14px", flexShrink: 0,
        ...(kiosk ? { background: "linear-gradient(95deg,#160900 0%,#241205 55%,#33180a 100%)", boxShadow: "0 2px 14px rgba(0,0,0,.28)" } : {}) }}>
        {kiosk && <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(150deg,#f07a2c,#e85d1a)", display: "grid", placeItems: "center", flexShrink: 0 }}><Icon name="service" size={17} /></div>}
        <div>
          <h2 style={{ margin: 0, fontSize: kiosk ? 15 : 20, fontWeight: 750, letterSpacing: kiosk ? ".08em" : "-.01em", color: kiosk ? "#fff" : "var(--n900, #0f172a)" }}>SERVİS PANOSU</h2>
          {kiosk && <div style={{ fontSize: 11, color: "#c9ab95" }}>{factoryName} · Servis Katı</div>}
        </div>
        <div style={{ flex: 1 }} />
        {/* Sağda dikey istif: üstte tarih & saat (Anasayfa ile aynı, başlıkla aynı hizada), altında butonlar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          <div style={{ background: "linear-gradient(135deg, #1f0d02, #3d1c06)", borderRadius: 12, padding: "8px 16px", boxShadow: "0 4px 16px rgba(0,0,0,.2)", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: "#ff9d5c", fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace", fontVariantNumeric: "tabular-nums", letterSpacing: 1 }}>{saat}</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: "#d4a584", fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace", fontVariantNumeric: "tabular-nums", letterSpacing: 1 }}>{tarih}</span>
          </div>
          {(canDo("cust_service_add") || (kiosk && onKilitle)) && (
            <div style={{ display: "flex", gap: 8 }}>
              {canDo("cust_service_add") && <Btn small onClick={acEkle}><Icon name="plus" size={14} /> Yeni Servis Talebi</Btn>}
              {kiosk && onKilitle && <Btn small variant="ghost" onClick={onKilitle} title="Kilitle"><Icon name="lock" size={14} /></Btn>}
            </div>
          )}
        </div>
      </div>

      {/* Sütunlar */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, padding: kiosk ? 14 : 0, minHeight: 0 }}>
        {DURUMLAR.map(d => {
          const kartlar = sutunlar[d.key];
          const hover = hoverDurum === d.key;
          return (
            <section key={d.key}
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (hoverDurum !== d.key) setHoverDurum(d.key); }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setHoverDurum(h => h === d.key ? null : h); }}
              onDrop={e => { e.preventDefault(); setHoverDurum(null); const id = Number(e.dataTransfer.getData("text/plain")); if (id) durumDegistir(id, d.key); }}
              style={{ background: hover ? d.bg : "var(--n100, #f8fafc)", border: `1px solid ${hover ? d.br : "var(--n150, #f1f5f9)"}`, borderRadius: 14, display: "flex", flexDirection: "column", minHeight: 0, boxShadow: hover ? `inset 0 0 0 2px ${d.br}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "14px 16px 12px", flexShrink: 0 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: d.renk }} />
                <h3 style={{ margin: 0, fontSize: 12.5, fontWeight: 750, letterSpacing: ".08em", textTransform: "uppercase", color: d.renk }}>{d.baslik}</h3>
                <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: d.renk, background: d.bg, border: `1px solid ${d.br}`, borderRadius: 999, padding: "1px 9px", fontVariantNumeric: "tabular-nums" }}>{kartlar.length}</span>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "2px 12px 14px", display: "flex", flexDirection: "column", gap: 11 }}>
                {kartlar.map(sv => <Kart key={sv.id} sv={sv} />)}
                {!kartlar.length && !(d.key === "Tamamlandı" && arsivGorebilir && arsivlenenler.length) && <div style={{ margin: "auto", color: "var(--n400, #94a3b8)", fontSize: 12.5, textAlign: "center", padding: "24px 10px", lineHeight: 1.6 }}>{d.bos}</div>}
                {d.key === "Tamamlandı" && arsivGorebilir && arsivlenenler.length > 0 && (
                  <div style={{ marginTop: kartlar.length ? 4 : 0 }}>
                    <button type="button" onClick={() => setArsivAcik(a => !a)}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "var(--n500, #64748b)", background: "none", border: "none", cursor: "pointer", padding: "6px 2px" }}>
                      <span>🗄</span>
                      <span>Arşivlenenler ({arsivlenenler.length})</span>
                      <span style={{ marginLeft: "auto", fontSize: 11 }}>{arsivAcik ? "gizle ▲" : "göster ▼"}</span>
                    </button>
                    {arsivAcik && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 4 }}>
                        {arsivlenenler.map(sv => <Kart key={sv.id} sv={sv} arsiv />)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Yeni / Düzenle servis — müşteri kartındaki servis formunun BİREBİR AYNISI (tam ServiceForm) */}
      {svModal && (
        <ServiceForm
          title={svModal === "add" ? "Yeni Servis Talebi" : "Servis Talebini Düzenle"}
          form={form} setForm={setForm} customers={customers} parts={parts} dealers={dealers} factory={factory} kdvRates={kdvRates}
          geoData={geoData} loadingGeo={loadingGeo} calisanlar={calisanlar}
          onSave={kaydet} onCancel={() => setSvModal(null)}
          dosyalar={dosyalar} dosyaEkleyebilir={!!setDosyalar && canDo("cust_dosya_add")} dosyaCevrimdisi={dosyaCevrimdisi} showToast={showToast}
        />
      )}

      {/* Per-servis süre analizi — o kartın kendi zaman çizelgesi ve süreleri */}
      {analizSv && (() => {
        const s = servisSureleri(analizSv, nowIso);
        const c = custMap[Number(analizSv.customerId)] || {};
        const adim = (ikon, ad, zaman, renk) => (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0" }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: zaman ? renk : "var(--n150, #f1f5f9)", color: zaman ? "#fff" : "var(--n400, #94a3b8)", display: "grid", placeItems: "center", fontSize: 13, flexShrink: 0 }}>{ikon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--n700, #334155)", flex: 1 }}>{ad}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: zaman ? "var(--n900, #0f172a)" : "var(--n400, #94a3b8)", fontVariantNumeric: "tabular-nums" }}>{zaman ? fmtZaman(zaman) : "—"}</span>
          </div>
        );
        const sureKart = (etiket, dk, renk, canli) => (
          <div style={{ flex: 1, minWidth: 96, background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "var(--n500, #64748b)", marginBottom: 3 }}>{etiket}{canli ? " (devam)" : ""}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: renk, fontVariantNumeric: "tabular-nums" }}>{sureBicim(dk)}</div>
          </div>
        );
        return (
          <Modal title="Servis Süre Analizi" onClose={() => setAnalizSv(null)}>
            <div style={{ fontSize: 13, color: "var(--n600, #475569)", marginBottom: 4, fontWeight: 700 }}>{c.name || "(müşteri yok)"}</div>
            <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginBottom: 14 }}>
              {c.model || "Model yok"}{c.serialNo ? ` · S/N ${c.serialNo}` : ""} · {analizSv.type}{analizSv.tech ? ` · ${analizSv.tech}` : ""}
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              {sureKart("Bekleme", s.beklemeDk, "var(--amb600, #d97706)", false)}
              {sureKart("İşçilik", s.isclikDk, "var(--blu600, #2563eb)", s.devamEdiyor)}
              {sureKart("Toplam", s.toplamDk, "var(--n800, #1e293b)", s.devamEdiyor && !s.bitis)}
            </div>
            <div style={{ border: "1px solid var(--n200, #e2e8f0)", borderRadius: 12, padding: "4px 14px" }}>
              {adim("🏭", "Fabrikaya Giriş", s.giris, "var(--amb600, #d97706)")}
              <div style={{ borderTop: "1px solid var(--n150, #f1f5f9)" }} />
              {adim("🔧", "Bakım Onarım Başladı", s.baslangic, "var(--blu600, #2563eb)")}
              <div style={{ borderTop: "1px solid var(--n150, #f1f5f9)" }} />
              {adim("✔", "Tamamlandı", s.bitis, "var(--grn600, #16a34a)")}
            </div>
            {s.devamEdiyor && <div style={{ fontSize: 11.5, color: "var(--blu600, #2563eb)", marginTop: 10, textAlign: "center" }}>İşçilik süresi canlı olarak sayılıyor…</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <Btn variant="ghost" onClick={() => setAnalizSv(null)}>Kapat</Btn>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};
