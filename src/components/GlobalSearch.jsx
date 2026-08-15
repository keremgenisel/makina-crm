import { useState, useEffect, useMemo, useRef } from "react";
import { aramaNormalize, fmtTR, parcaAdi, fmtCur } from "../lib/utils";
import { aliciAd } from "./stock/TahsisModal";
import { Icon } from "./ui";

// ── Genel arama (komut paleti) ───────────────────────────────────────────────
// Sidebar'daki kutu ve Ctrl/Cmd+K kısayolu aynı paleti açar. Müşteri/makina
// (ad, seri no, telefon, yetkili, model, eski sahip adı), teklif/proforma (no, firma), bayi,
// makina stoğu, yedek parça (kargo) satışları (+ farklı teslimat adresi), Extra Kalıp satışları,
// servis kayıtları (teknisyen/tip/notlar), notlar, üretim formları, dosyalar ve firma çalışanları
// üzerinde arar; sonuca tıklayınca ilgili ekran doğrudan açılır. Tüm gruplar limitsiz (.slice yok).
// Klavye: ↑/↓ gezinme, ↵ seçili sonucu aç, esc kapat; üstte kategori çipleri (sayılı) listeyi daraltır.
// allowedTabs: kullanıcının erişebildiği sekme id'leri — izinli olmayan sekmenin
// verisi aramada hiç gösterilmez (kısıtlı kullanıcı aramadan o alana sızamaz).

// Kategori sırası + görsel kimliği (ikon rozeti renkleri tema token'larından → koyu tema uyumlu).
const KAT_SIRA = ["musteriler", "servisler", "belgeler", "bayiler", "makinalar", "yedekParcalar", "kaliplar", "uretimler", "dosyalar", "notlar", "calisanlar"];
const KAT = {
  musteriler:    { baslik: "Müşteriler / Makinalar",     kisa: "Müşteriler",   ikon: "🏢", bg: "var(--ambBg3)", fg: "var(--orTx)" },
  servisler:     { baslik: "Servis Kayıtları",           kisa: "Servis",       ikon: "🔧", bg: "var(--ambBg)",  fg: "var(--amb700)" },
  belgeler:      { baslik: "Teklif / Proforma",          kisa: "Teklif",       ikon: "📄", bg: "var(--bluBg)",  fg: "var(--blu600)" },
  bayiler:       { baslik: "Bayiler",                    kisa: "Bayiler",      ikon: "🏪", bg: "var(--grnBg)",  fg: "var(--grn700)" },
  makinalar:     { baslik: "Stok Makinaları",            kisa: "Stok",         ikon: "📦", bg: "var(--purBg)",  fg: "var(--purTx)" },
  yedekParcalar: { baslik: "Yedek Parça (Kargo)",        kisa: "Yedek Parça",  ikon: "🚚", bg: "var(--bluBg2)", fg: "var(--cyan)" },
  kaliplar:      { baslik: "Extra Kalıp",                kisa: "Kalıp",        ikon: "🧩", bg: "var(--redBg)",  fg: "var(--red600)" },
  uretimler:     { baslik: "Üretim Formları",            kisa: "Üretim",       ikon: "🏭", bg: "var(--warnBg)", fg: "var(--warnTx)" },
  dosyalar:      { baslik: "Dosyalar",                   kisa: "Dosyalar",     ikon: "📎", bg: "var(--n150)",   fg: "var(--slate500c)" },
  notlar:        { baslik: "Notlar",                     kisa: "Notlar",       ikon: "📝", bg: "var(--grnBg3)", fg: "var(--teal2)" },
  calisanlar:    { baslik: "Çalışanlar",                 kisa: "Çalışanlar",   ikon: "👤", bg: "var(--grnBg2)", fg: "var(--emerald2)" },
};

const nokta = (parcalar) => parcalar.filter(Boolean).join(" · ");

export const GlobalSearch = ({ customers = [], teklifler = [], dealers = [], stock = [], yedekParcaSatislar = [], parts = [], partSales = [], services = [], notes = [], uretimFormlari = [], dosyalar = [], calisanlar = [], onOpenCustomer, onOpenDoc, onOpenDealer, onGoStock, onGoYedekParca, onGoNotes, onGoUretim, onGoCalisanlar, allowedTabs = null }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [aktif, setAktif] = useState("all"); // seçili kategori çipi
  const [sel, setSel] = useState(0);          // klavye ile seçili sonuç (düz liste indexi)
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const results = useMemo(() => {
    const query = aramaNormalize(q.trim());
    if (query.length < 2) return null;
    const has = (v) => aramaNormalize(String(v || "")).includes(query);
    const izinli = (tabId) => !Array.isArray(allowedTabs) || allowedTabs.includes(tabId);
    const partMap = {}; for (const p of parts) partMap[String(p.id)] = p;
    const custMap = {}; for (const c of customers) custMap[c.id] = c;
    const custAd = (id) => custMap[id]?.name || "";
    // Tüm gruplar LİMİTSİZ — kaç eşleşme varsa hepsi gösterilir (hiçbir grupta .slice yok).
    return {
      musteriler: izinli("customers") ? customers.filter(c => !c.deletedAt && (has(c.name) || has(c.serialNo) || has(c.phone) || has(c.yetkili1Ad) || has(c.yetkili1Tel) || has(c.yetkili2Tel) || has(c.model) || (c.prevOwners || []).some(o => has(o.name)))) : [],
      belgeler:   izinli("evrak") ? teklifler.filter(t => !t.deletedAt && (has(t.no) || has(t.firma))) : [],
      bayiler:    izinli("dealers") ? dealers.filter(d => !d.deletedAt && (has(d.name) || has(d.contact) || has(d.city))) : [],
      makinalar:  izinli("stock") ? stock.filter(sx => !sx.deletedAt && (has(sx.serialNo) || has(sx.model))) : [],
      // Yedek parça (kargo) satışları — alıcı, parça, kargo firma/takip no VE farklı teslimat adresi (ad/şehir/ilçe/adres) ile aranır; Stok'a gider.
      yedekParcalar: (izinli("stock") && onGoYedekParca) ? yedekParcaSatislar.filter(s => !s.deletedAt && (has(aliciAd(s, dealers, customers)) || has(parcaAdi(partMap[String(s.partId)])) || has(s.kargoTakipNo) || has(s.kargoFirma) || has(s.kargoDurum) || (s.teslimatFarkli && (has(s.teslimatAd) || has(s.teslimatSehir) || has(s.teslimatIlce) || has(s.teslimatAdres) || has(s.teslimatTel))))) : [],
      // Extra Kalıp satışları — müşteri, kalıp adı/ölçü ile aranır; müşteri detayına gider.
      kaliplar: izinli("customers") ? (partSales || []).filter(p => !p.deletedAt && p.tur === "Kalıp" && (has(p.ad) || has(p.olcu) || has(custAd(p.customerId)))) : [],
      // Servis kayıtları — teknisyen, tip, müşteri talimatı/fabrika notu/yapılan işler, müşteri adı/seri no ile aranır; müşteri detayına gider.
      servisler: izinli("customers") ? services.filter(s => !s.deletedAt && (has(s.tech) || has(s.type) || has(s.musteriTalimati) || has(s.fabrikaNotu) || has(s.yapilanIsler) || has(s.durum) || has(custAd(s.customerId)) || has(custMap[s.customerId]?.serialNo))) : [],
      // Notlar — serbest not içeriği ile aranır; Notlar sekmesine gider.
      notlar: (izinli("notes") && onGoNotes) ? notes.filter(n => !n.deletedAt && has(n.content)) : [],
      // Üretim formları — dönem notu/tarihi ve satırlardaki kalıp adı/kodu/ölçü/müşteri ile aranır; Stok > Üretim'e gider.
      uretimler: (izinli("stock") && onGoUretim) ? uretimFormlari.filter(u => !u.deletedAt && (has(u.not) || has(u.baslangicTarihi) || (u.satirlar || []).some(r => has(r.kalipAdi) || has(r.kalipKodu) || has(r.kalipOlcusu) || has(r.musteriAdi)))) : [],
      // Dosya arşivi — dosya etiketi/dosya adı ile aranır; ilgili müşteri detayına gider.
      dosyalar: izinli("customers") ? dosyalar.filter(d => !d.deletedAt && (has(d.ad) || has(d.dosyaAdi) || has(d.aciklama)) && d.customerId) : [],
      // Firma çalışanları (teknisyenler) — ad ile aranır; Ayarlar > Firma'ya gider.
      calisanlar: (izinli("settings") && onGoCalisanlar) ? calisanlar.filter(cx => !cx.deletedAt && has(cx.ad)) : [],
    };
  }, [q, customers, teklifler, dealers, stock, yedekParcaSatislar, parts, partSales, services, notes, uretimFormlari, dosyalar, calisanlar, onGoYedekParca, onGoNotes, onGoUretim, onGoCalisanlar, allowedTabs]);

  const pick = (fn, ...args) => { setOpen(false); fn?.(...args); };

  // Kategori sonuçlarını tek biçime indir: {uid, baslik, meta, ekstra?, onOpen}
  // (useMemo değil — palet için ucuz; onOpen closure'ları hep taze kalır)
  const gruplar = (() => {
    if (!results) return [];
    const nq = aramaNormalize(q.trim());
    const custMap = {}; for (const c of customers) custMap[c.id] = c;
    // Müşteri kaydı ADI dışında bir alandan yakalandıysa nedenini göster ("neden çıktı?" — telefon/yetkili/eski sahip vb.).
    // Aranan alan sırasıyla aynı öncelik (results filtresiyle birebir): yetkili, telefon, yetkili tel, seri no, model, eski sahip.
    const eslesmeNedeni = (c) => {
      if (aramaNormalize(String(c.name || "")).includes(nq)) return null; // ad zaten görünüyor
      const alanlar = [["yetkili", c.yetkili1Ad], ["telefon", c.phone], ["yetkili tel", c.yetkili1Tel], ["yetkili tel", c.yetkili2Tel], ["seri no", c.serialNo], ["model", c.model]];
      for (const [ad, deger] of alanlar) if (deger && aramaNormalize(String(deger)).includes(nq)) return `${ad}: ${deger}`;
      const eski = (c.prevOwners || []).find(o => aramaNormalize(String(o.name || "")).includes(nq));
      return eski ? `eski sahibi: ${eski.name}` : null;
    };
    const yap = {
      musteriler: c => ({ uid: `c${c.id}`, baslik: c.name || "—", meta: nokta([c.model, c.serialNo && `S/N ${c.serialNo}`, c.installDate && fmtTR(c.installDate)]), ekstra: eslesmeNedeni(c), onOpen: () => pick(onOpenCustomer, c.id) }),
      servisler: s => { const c = custMap[s.customerId]; return { uid: `sv${s.id}`, baslik: `${s.type || "Servis"}${s.tech ? ` · ${s.tech}` : ""}`, meta: nokta([c?.name || "—", c?.serialNo && `S/N ${c.serialNo}`, s.date && fmtTR(s.date), s.durum]), onOpen: () => pick(onOpenCustomer, s.customerId, s.id) }; },
      belgeler: t => ({ uid: `t${t.id}`, baslik: t.no || "—", meta: nokta([t.firma, t.type === "proforma" ? "Proforma" : "Teklif", t.tarih && fmtTR(t.tarih)]), onOpen: () => pick(onOpenDoc, t.id) }),
      bayiler: d => ({ uid: `d${d.id}`, baslik: d.name || "—", meta: nokta([d.contact, d.city]), onOpen: () => pick(onOpenDealer, d.id) }),
      makinalar: sx => ({ uid: `s${sx.id}`, baslik: sx.model || "—", meta: nokta([sx.serialNo ? `S/N ${sx.serialNo}` : "seri no'suz", sx.addedDate && fmtTR(sx.addedDate)]), onOpen: () => pick(onGoStock) }),
      yedekParcalar: s => { const part = parts.find(p => String(p.id) === String(s.partId)); return { uid: `yp${s.id}`, baslik: `${parcaAdi(part) || "Yedek parça"} ×${s.miktar}`, meta: nokta([aliciAd(s, dealers, customers), s.tarih && fmtTR(s.tarih), s.kargoTakipNo && `${s.kargoFirma || "Kargo"} ${s.kargoTakipNo}`, s.teslimatFarkli && s.teslimatSehir && `Teslimat: ${s.teslimatSehir}`]), onOpen: () => pick(onGoYedekParca, s.id) }; },
      kaliplar: p => { const c = custMap[p.customerId]; return { uid: `k${p.id}`, baslik: `${p.ad || "Kalıp"}${p.olcu ? ` (${p.olcu})` : ""}`, meta: nokta([c?.name || "—", p.tarih && fmtTR(p.tarih), p.ucret && fmtCur(p.ucret, p.currency)]), onOpen: () => pick(onOpenCustomer, p.customerId, null, p.id) }; },
      uretimler: u => ({ uid: `u${u.id}`, baslik: `Üretim ${u.baslangicTarihi ? fmtTR(u.baslangicTarihi) : ""}${u.bitisTarihi ? ` – ${fmtTR(u.bitisTarihi)}` : ""}`.trim(), meta: nokta([`${(u.satirlar || []).length} kalıp`, u.not, u.kapali && "kapalı"]), onOpen: () => pick(onGoUretim, u.id) }),
      dosyalar: d => { const c = custMap[d.customerId]; return { uid: `f${d.id}`, baslik: d.ad || d.dosyaAdi || "Dosya", meta: nokta([c?.name || "—", d.tarih && fmtTR(d.tarih)]), onOpen: () => pick(onOpenCustomer, d.customerId) }; },
      notlar: n => ({ uid: `n${n.id}`, baslik: String(n.content || "").split("\n")[0].trim().slice(0, 60) || "Not", meta: n.updatedAt ? fmtTR(new Date(n.updatedAt).toISOString().slice(0, 10)) : "", onOpen: () => pick(onGoNotes, n.id) }),
      calisanlar: cx => ({ uid: `emp${cx.id}`, baslik: cx.ad || "—", meta: "Firma çalışanı", onOpen: () => pick(onGoCalisanlar, cx.id) }),
    };
    return KAT_SIRA.filter(k => results[k]?.length).map(k => ({ key: k, ...KAT[k], items: results[k].map(yap[k]) }));
  })();

  // Çip filtresi + düz liste (klavye navigasyonu bunun üzerinden döner)
  const aktifGecerli = aktif === "all" || gruplar.some(g => g.key === aktif);
  const eff = aktifGecerli ? aktif : "all";
  const gorunenGruplar = eff === "all" ? gruplar : gruplar.filter(g => g.key === eff);
  const flat = gorunenGruplar.flatMap(g => g.items);
  const tumSayi = gruplar.reduce((s, g) => s + g.items.length, 0);
  const selIdx = flat.length ? Math.min(sel, flat.length - 1) : 0;

  // Klavye erişimi için canlı ref'ler (keydown effect'i bunları okur)
  const openRef = useRef(false); openRef.current = open;
  const flatRef = useRef([]); flatRef.current = flat;
  const selRef = useRef(0); selRef.current = selIdx;

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true); return; }
      if (!openRef.current) return;
      if (e.key === "Escape") { setOpen(false); return; }
      const n = flatRef.current.length;
      if (e.key === "ArrowDown") { e.preventDefault(); if (n) setSel(s => (Math.min(s, n - 1) + 1) % n); }
      else if (e.key === "ArrowUp") { e.preventDefault(); if (n) setSel(s => (Math.min(s, n - 1) - 1 + n) % n); }
      else if (e.key === "Enter") { e.preventDefault(); flatRef.current[selRef.current]?.onOpen(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    // Kapanınca sorguyu KORU: kullanıcı bir sonuca tıklayıp (ör. müşteri modalı) geri döndüğünde
    // aynı arama sonuçları dursun, sıfırdan yazmak gerekmesin. Açılışta metni seçili getir ki
    // istenirse tek tuşla değiştirilebilsin.
    if (open) setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 50);
    else setSel(0);
  }, [open]);

  // Seçili satırı görünür alana kaydır
  useEffect(() => { listRef.current?.querySelector('[data-sel="1"]')?.scrollIntoView?.({ block: "nearest" }); }, [sel, q, aktif]);

  // Aranan metni sonuç içinde vurgula (ilk eşleşme). Normalize uzunluğu değiştirdiyse (İ→i̇) güvenli fallback.
  const vurgu = (text) => {
    const t = String(text ?? "");
    const nq = aramaNormalize(q.trim());
    if (!nq) return t;
    const norm = aramaNormalize(t);
    if (norm.length !== t.length) return t;
    const i = norm.indexOf(nq);
    if (i < 0) return t;
    return <>{t.slice(0, i)}<mark style={S.mark}>{t.slice(i, i + nq.length)}</mark>{t.slice(i + nq.length)}</>;
  };

  return (
    <>
      {/* Sidebar kutusu — tıklanınca palet açılır */}
      <button onClick={() => setOpen(true)} title="Genel arama (Ctrl+K)"
        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", marginBottom: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 9, color: "#a3846f", fontSize: 12.5, cursor: "pointer" }}>
        <Icon name="search" size={13} />
        <span style={{ flex: 1, textAlign: "left" }}>Ara...</span>
        <span style={{ fontSize: 10, opacity: .7, border: "1px solid rgba(255,255,255,.15)", borderRadius: 5, padding: "1px 5px" }}>Ctrl K</span>
      </button>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.42)", zIndex: 1200, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: "7vh" }}>
          <div onClick={e => e.stopPropagation()} style={S.palet}>
            {/* Arama satırı */}
            <div style={S.head}>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: 15, color: "var(--n400, #94a3b8)", display: "flex", pointerEvents: "none" }}><Icon name="search" size={17} /></span>
                <input ref={inputRef} value={q} onChange={e => { setQ(e.target.value); setSel(0); }}
                  placeholder="Müşteri, seri no, teklif no, servis, bayi, not ara..." autoComplete="off" spellCheck={false}
                  style={S.input} />
                <span style={S.escChip}>esc</span>
              </div>
            </div>

            {/* Kategori çipleri */}
            {results && flat.length > 0 && (
              <div style={S.chips} className="gs-chips">
                <button onClick={() => { setAktif("all"); setSel(0); }} style={S.chip(eff === "all")}>
                  Tümü <span style={S.chipN(eff === "all")}>{tumSayi}</span>
                </button>
                {gruplar.map(g => (
                  <button key={g.key} onClick={() => { setAktif(g.key); setSel(0); }} style={S.chip(eff === g.key)}>
                    {g.kisa} <span style={S.chipN(eff === g.key)}>{g.items.length}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Sonuç listesi */}
            <div ref={listRef} style={S.list} className="gs-list">
              {!results && <div style={S.bos}>En az 2 karakter yazın.</div>}
              {results && flat.length === 0 && <div style={S.bos}><div style={S.bosBig}>🔍</div>Sonuç bulunamadı.</div>}
              {gorunenGruplar.map(g => (
                <div key={g.key}>
                  <div style={S.grpHead}>
                    <span>{g.baslik}</span>
                    <span style={{ color: "var(--n400, #94a3b8)", fontWeight: 700 }}>· {g.items.length}</span>
                    <span style={{ flex: 1, height: 1, background: "var(--n150, #f1f5f9)", marginLeft: 4 }} />
                  </div>
                  {g.items.map(it => {
                    const secili = flat[selIdx]?.uid === it.uid;
                    return (
                      <button key={it.uid} data-sel={secili ? "1" : "0"} onClick={it.onOpen}
                        onMouseMove={() => { const gi = flat.findIndex(x => x.uid === it.uid); if (gi >= 0 && gi !== selIdx) setSel(gi); }}
                        style={S.row(secili)}>
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span style={S.rowT(secili)}>{vurgu(it.baslik)}{it.ekstra ? <span style={S.ekstra}> ↳ {vurgu(it.ekstra)}</span> : null}</span>
                          {it.meta ? <span style={S.rowM}>{vurgu(it.meta)}</span> : null}
                        </span>
                        <span style={{ ...S.go, opacity: secili ? 1 : 0, color: secili ? "var(--orTx, #c2410c)" : "var(--n400, #94a3b8)" }}><Icon name="arrowRight" size={15} /></span>
                      </button>
                    );
                  })}
                </div>
              ))}
              <div style={{ height: 6 }} />
            </div>

            {/* Alt bilgi çubuğu */}
            <div style={S.foot}>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <span style={S.kbGrp}><kbd style={S.kbd}>↑</kbd><kbd style={S.kbd}>↓</kbd> gez</span>
                <span style={S.kbGrp}><kbd style={S.kbd}>↵</kbd> aç</span>
                <span style={S.kbGrp}><kbd style={S.kbd}>esc</kbd> kapat</span>
              </div>
              <div style={{ fontWeight: 700, color: "var(--n700, #334155)", fontVariantNumeric: "tabular-nums" }}>{flat.length} sonuç</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Inline stil sözlüğü (uygulamada CSS framework yok — tema token'larıyla, koyu tema uyumlu).
const S = {
  palet: { display: "flex", flexDirection: "column", background: "var(--surface, #ffffff)", borderRadius: 16, width: "min(94vw, 920px)", maxHeight: "80vh", border: "1px solid var(--n150, #f1f5f9)", boxShadow: "0 24px 70px rgba(20,26,40,.28), 0 4px 14px rgba(20,26,40,.10)", overflow: "hidden" },
  head: { flexShrink: 0, padding: "14px 16px 12px", borderBottom: "1px solid var(--n150, #f1f5f9)" },
  input: { width: "100%", boxSizing: "border-box", padding: "13px 84px 13px 46px", border: "2px solid #e85d1a", borderRadius: 12, fontSize: 17, outline: "none", background: "var(--surface, #ffffff)", color: "var(--n900, #0f172a)" },
  escChip: { position: "absolute", right: 13, fontSize: 11, fontWeight: 600, color: "var(--n400, #94a3b8)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 6, padding: "3px 7px", background: "var(--n100, #f8fafc)" },
  chips: { flexShrink: 0, display: "flex", gap: 7, padding: "12px 16px 2px", overflowX: "auto" },
  chip: (on) => ({ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", cursor: "pointer", fontSize: 12.5, fontWeight: 600, padding: "6px 12px", borderRadius: 999, border: `1px solid ${on ? "#e85d1a" : "var(--n200, #e2e8f0)"}`, background: on ? "#e85d1a" : "var(--n100, #f8fafc)", color: on ? "#fff" : "var(--n500, #64748b)" }),
  chipN: (on) => ({ fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums", borderRadius: 999, padding: "1px 7px", minWidth: 20, textAlign: "center", background: on ? "rgba(255,255,255,.24)" : "var(--surface, #fff)", color: on ? "#fff" : "var(--n400, #94a3b8)" }),
  list: { flex: 1, minHeight: 0, overflowY: "auto", padding: "6px 0", scrollPaddingTop: 34, scrollPaddingBottom: 8 },
  grpHead: { position: "sticky", top: 0, zIndex: 2, background: "var(--surface, #ffffff)", display: "flex", alignItems: "center", gap: 6, padding: "9px 16px 5px", fontSize: 10.5, fontWeight: 800, letterSpacing: .6, textTransform: "uppercase", color: "var(--n400, #94a3b8)" },
  row: (on) => ({ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "8px 16px", cursor: "pointer", textAlign: "left", border: "none", borderLeft: `3px solid ${on ? "#e85d1a" : "transparent"}`, background: on ? "var(--ambBg3, #fff7ed)" : "none", font: "inherit" }),
  badge: { flex: "0 0 auto", width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 },
  rowT: (on) => ({ display: "block", fontSize: 13.5, fontWeight: 600, color: on ? "var(--orTx, #c2410c)" : "var(--n900, #0f172a)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }),
  rowM: { display: "block", fontSize: 12, color: "var(--n500, #64748b)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 },
  ekstra: { color: "var(--amb700, #b45309)", fontWeight: 500, fontSize: 11.5 },
  go: { flex: "0 0 auto", display: "flex" },
  mark: { background: "var(--ambBr, #fde68a)", color: "inherit", borderRadius: 3, padding: "0 1px", fontWeight: 700 },
  bos: { padding: "44px 20px", textAlign: "center", color: "var(--n500, #64748b)", fontSize: 14 },
  bosBig: { fontSize: 30, marginBottom: 8, opacity: .5 },
  foot: { flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "9px 16px", borderTop: "1px solid var(--n150, #f1f5f9)", background: "var(--n100, #f8fafc)", fontSize: 11.5, color: "var(--n500, #64748b)" },
  kbGrp: { display: "inline-flex", alignItems: "center", gap: 5 },
  kbd: { fontSize: 10.5, fontWeight: 600, lineHeight: 1, background: "var(--surface, #fff)", border: "1px solid var(--n200, #e2e8f0)", borderBottomWidth: 2, borderRadius: 5, padding: "3px 6px", color: "var(--n500, #64748b)", minWidth: 16, textAlign: "center" },
};
