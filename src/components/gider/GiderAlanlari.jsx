import { useState, useRef, useLayoutEffect } from "react";
import { Icon, Select } from "../ui";
import { Segment, HataMetni, Ipucu, UyariSeridi } from "../tasarim";
import { ATAMA, DAVRANIS, HEDEF, HEDEF_SIRASI, EK_ODEME_TURLERI, modelSatirlariDogrula, modelSatirTutari, tutarCoz, odemeHedefleri, tl } from "../../lib/gider";
import { fmtCur, fmtTR, trLower } from "../../lib/utils";
import { tutarGosterim, tutarGirdisiIsle } from "../../lib/tutarGirdisi";
// Spec 0059 R20, R31: hedef ad zinciri ve tutar biçimi saf kitaplıkta (rapor React almadan kullanır); burada aynı adlarla
// yeniden dışa verilir, çağıranlar değişmez. TEK tanım odemeYontemi.js'tedir.
import { tl2, HEDEF_AD, hedefAdi, cokHedefliSatirlar, cokHedefliMi, hedefEtiketi } from "../../lib/odemeYontemi";
export { tl2, HEDEF_AD, hedefAdi, cokHedefliSatirlar, cokHedefliMi, hedefEtiketi };

// Gider kalemi ve tekrarlayan tanım formlarının paylaştığı alanlar (spec 0001). İki form aynı
// atama/tutar bileşenlerini kullanır ki kalem ile tanım birbirinden ayrışmasın.

// Kuruşlu tutar girişi: MoneyInput yalnız tam sayı aldığı için (ör. 39.223,13 işveren maliyeti) ayrı
// bileşen. Durum ham metni tutar; sayıya çevirme ve doğrulama kayıtta tutarCoz ile yapılır (AC-2).
// Spec 0045: görünüm binlik noktalıdır, imleç korunur (lib/tutarGirdisi.js, tek yer). Oran alanı (sym "%") ayraç
// almaz ve bugünkü gibi ham çalışır (R9, Q3).
export const TutarInput = ({ value, onChange, placeholder = "0,00", sym = "₺", invalid = false, id, ariaLabel, disabled }) => {
  const oran = sym === "%";
  const ref = useRef(null);
  const tusRef = useRef(null);
  const imlecRef = useRef(null);
  const [, yenile] = useState(0); // reddedilen tuşta da imleç geri konsun diye çizimi zorlar
  const gosterim = oran ? (value ?? "") : tutarGosterim(value);
  useLayoutEffect(() => {
    const el = ref.current;
    if (imlecRef.current == null || !el || document.activeElement !== el) return;
    el.setSelectionRange(imlecRef.current, imlecRef.current);
    imlecRef.current = null;
  });
  const degisti = (e) => {
    if (oran) { onChange(e.target.value); return; }
    const r = tutarGirdisiIsle({ yeni: e.target.value, onceki: gosterim, imlec: e.target.selectionStart, tus: tusRef.current });
    tusRef.current = null;
    imlecRef.current = r.imlec;
    yenile(n => n + 1);
    onChange(r.ham);
  };
  return (
    <div style={{ position: "relative" }}>
      <input ref={ref} id={id} aria-label={ariaLabel} value={gosterim} disabled={disabled} inputMode="decimal"
        onKeyDown={e => { tusRef.current = e.key; }} onChange={degisti} placeholder={placeholder} className="input"
        style={{ paddingRight: 28, textAlign: "right", fontWeight: 600, ...(invalid ? { borderColor: "var(--red500, #ef4444)", background: "var(--redBg, #fef2f2)" } : {}) }} />
      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--n400, #94a3b8)", fontSize: 14, pointerEvents: "none" }}>{sym}</span>
    </div>
  );
};
// Saklanan sayıyı forma ham metin olarak geri koymak için (düzenleme açılışı).
export const tutarMetni = (n) => (n == null || n === "" ? "" : String(n).replace(".", ","));

export const AyInput = ({ value, onChange, id, ariaLabel }) => (
  <input type="month" id={id} aria-label={ariaLabel} className="input" value={value || ""} onChange={e => onChange(e.target.value || null)} />
);

// Makina seçici (R7): Makina Stoğu ve müşteri makinaları; değer "stok:ID" / "musteri:ID".
export const MakinaSecici = ({ makinaTur, makinaId, onChange, stock = [], customers = [], id }) => {
  const deger = makinaId != null && makinaTur ? `${makinaTur}:${makinaId}` : "";
  const etiket = (m) => [m.model, m.serialNo].filter(Boolean).join(" · ") || "Makina";
  return (
    <Select id={id} aria-label="Makina" value={deger} onChange={e => {
      const v = e.target.value;
      if (!v) { onChange({ makinaTur: null, makinaId: null }); return; }
      const i = v.indexOf(":");
      const tur = v.slice(0, i), raw = v.slice(i + 1);
      onChange({ makinaTur: tur, makinaId: /^\d+$/.test(raw) ? Number(raw) : raw });
    }}>
      <option value="">Makina seçin</option>
      <optgroup label="Makina Stoğu">
        {stock.filter(s => !s.deletedAt).map(s => <option key={`s${s.id}`} value={`stok:${s.id}`}>{etiket(s)}</option>)}
      </optgroup>
      <optgroup label="Müşteri Makinaları">
        {customers.filter(c => !c.deletedAt).map(c => <option key={`m${c.id}`} value={`musteri:${c.id}`}>{etiket(c)} · {c.name || ""}</option>)}
      </optgroup>
    </Select>
  );
};

// Çok satırlı model dağılımı (R21, K31, K32): model + birim maliyet + adet; satır toplamı gösterimdir.
export const ModelSatirlari = ({ satirlar = [], onChange, modeller = [], tutar, personel = false }) => {
  const d = modelSatirlariDogrula(tutarCoz(tutar).deger, satirlar);
  const set = (i, patch) => onChange(satirlar.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const hataOf = (i, alan) => d.hatalar.find(h => h.satir === i && h.alan === alan)?.mesaj;
  const kullanilan = new Set(satirlar.map(s => trLower(s.modelAd)));
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) 90px 110px 34px", gap: 8, fontSize: 11, fontWeight: 700, color: "var(--n500, #64748b)", textTransform: "uppercase", letterSpacing: .4, marginBottom: 6 }}>
        <span>Model</span><span>Makina başına</span><span>Adet</span><span style={{ textAlign: "right" }}>Satır toplamı</span><span />
      </div>
      {satirlar.map((s, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) 90px 110px 34px", gap: 8, alignItems: "center" }}>
            <Select aria-label={`Model ${i + 1}`} value={s.modelAd || ""} onChange={e => set(i, { modelAd: e.target.value })}>
              <option value="">Model seçin</option>
              {modeller.map(m => (
                <option key={m.model} value={m.model} disabled={m.model !== s.modelAd && kullanilan.has(trLower(m.model))}>{m.model}</option>
              ))}
            </Select>
            <TutarInput ariaLabel={`Birim maliyet ${i + 1}`} value={s.birimMaliyet} onChange={v => set(i, { birimMaliyet: v })} invalid={!!hataOf(i, "birimMaliyet")} />
            <input aria-label={`Adet ${i + 1}`} className="input" inputMode="numeric" value={s.adet ?? ""} onChange={e => set(i, { adet: e.target.value })}
              style={{ textAlign: "right", ...(hataOf(i, "adet") ? { borderColor: "var(--red500, #ef4444)" } : {}) }} />
            <div style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", fontSize: 13 }}>{tl2(modelSatirTutari(s))}</div>
            <button type="button" aria-label={`Satır ${i + 1} sil`} onClick={() => onChange(satirlar.filter((_, j) => j !== i))}
              style={{ border: "1px solid var(--n200, #e2e8f0)", background: "var(--surface, #ffffff)", borderRadius: 7, height: 32, cursor: "pointer", color: "var(--red600, #dc2626)" }}>
              <Icon name="trash" size={13} />
            </button>
          </div>
          <HataMetni>{hataOf(i, "modelAd") || hataOf(i, "birimMaliyet") || hataOf(i, "adet")}</HataMetni>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...satirlar, { modelAd: "", birimMaliyet: "", adet: "" }])}
        style={{ border: "1px dashed var(--n300, #cbd5e1)", background: "transparent", borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", color: "var(--n600, #475569)", display: "inline-flex", gap: 6, alignItems: "center" }}>
        <Icon name="plus" size={13} /> Model satırı ekle
      </button>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, fontSize: 12.5 }}>
        <div><div style={{ color: "var(--n500, #64748b)" }}>Dağıtılan</div><b>{tl2(d.dagitilan)}</b></div>
        <div><div style={{ color: "var(--n500, #64748b)" }}>Kalem tutarı</div><b>{tl2(tutarCoz(tutar).deger)}</b></div>
        <div><div style={{ color: "var(--n500, #64748b)" }}>{d.asim > 0 ? "Aşım" : "Fark → ortak gider"}</div>
          <b style={{ color: d.asim > 0 ? "var(--red700, #b91c1c)" : d.fark > 0 ? "var(--amb700, #b45309)" : "inherit" }}>{tl2(d.asim > 0 ? d.asim : d.fark)}</b></div>
      </div>
      {personel && <Ipucu>Personel kaleminde birim maliyet, o modelin bir makinasına düşen işçiliktir; adet, kaç makina.</Ipucu>}
      {d.asim > 0 && <HataMetni>Satır toplamı kalem tutarını {tl2(d.asim)} aşıyor. Kayıt yapılamaz.</HataMetni>}
      {d.asim === 0 && d.fark > 0 && satirlar.length > 0 && <Ipucu>Dağıtılmayan {tl2(d.fark)} ortak gidere yazılır. Bu bir uyarıdır, kaydı engellemez.</Ipucu>}
    </div>
  );
};

const ATAMA_SECENEKLERI = [
  { value: ATAMA.ORTAK, label: "Ortak gider" },
  { value: ATAMA.MAKINA, label: "Makina" },
  { value: ATAMA.MODEL, label: "Model" },
  { value: ATAMA.DAGITMA, label: "Dağıtılmasın" },
];
const ATAMA_AD = { makina: "Makina", model: "Model", dagitma: "Dağıtılmasın" };

// Atama seçici (R7, R20, R21, K25): üç seçenek birbirini dışlar. Seçim değişince önceki atama
// temizlenir ve tek satırlık bilgi gösterilir (AC-76, AC-77). Kira kaleminde çizilmez (K38; spec 0020 R5).
// Personelde makina seçilince kalemin tamamının o makinaya yükleneceği söylenir, kayıt engellenmez (spec 0020 R3).
export const AtamaAlani = ({ value, onChange, stock, customers, modeller, tutar, davranis = DAVRANIS.NORMAL }) => {
  const [bilgi, setBilgi] = useState("");
  const at = value.atamaTur || "";
  const degistir = (yeni) => {
    if (yeni === at) return;
    const doluMu = (at === ATAMA.MAKINA && value.makinaId != null) || (at === ATAMA.MODEL && (value.modelSatirlari || []).length > 0) || at === ATAMA.DAGITMA;
    setBilgi(doluMu ? `${ATAMA_AD[at]} seçimi kaldırıldı. Bir kalemde makina, model veya “dağıtılmasın” seçimlerinden yalnız biri olabilir.` : "");
    onChange({ atamaTur: yeni, makinaTur: null, makinaId: null, modelSatirlari: yeni === ATAMA.MODEL ? [{ modelAd: "", birimMaliyet: "", adet: "" }] : [] });
  };
  return (
    <div>
      <Segment ariaLabel="Makina maliyeti ataması" options={ATAMA_SECENEKLERI} value={at} onChange={degistir} />
      {bilgi && <div role="status" style={{ fontSize: 12, color: "var(--n600, #475569)", background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, padding: "7px 10px", marginTop: 8 }}>{bilgi}</div>}
      {at === ATAMA.ORTAK && <Ipucu>Ortak gider, makina maliyeti hesabında (0002) makinalara dağıtılır.</Ipucu>}
      {at === ATAMA.DAGITMA && <Ipucu>Makina maliyetine hiç girmez (ör. satılmak üzere yedek parça stoğuna alınan mal). Gider toplamında ve borç özetinde normal görünür.</Ipucu>}
      {at === ATAMA.MAKINA && (
        <div style={{ marginTop: 10 }}>
          {davranis === DAVRANIS.PERSONEL && <div style={{ marginBottom: 10 }}><UyariSeridi aile="uyari" baslik="Bu kalemin tamamı seçilen makinaya yüklenecek." testId="personel-makina-uyari" /></div>}
          <MakinaSecici makinaTur={value.makinaTur} makinaId={value.makinaId} stock={stock} customers={customers}
            onChange={p => onChange({ ...p })} />
          <Ipucu>Stoktaki makinaya yapılan atama, makina stoktan seçilerek satıldığında o satışa takip edilir.</Ipucu>
        </div>
      )}
      {at === ATAMA.MODEL && (
        <div style={{ marginTop: 10 }}>
          <ModelSatirlari satirlar={value.modelSatirlari || []} onChange={m => onChange({ modelSatirlari: m })} modeller={modeller} tutar={tutar} personel={davranis === DAVRANIS.PERSONEL} />
        </div>
      )}
    </div>
  );
};

export const ODEME_SECENEKLERI = [
  { value: "", label: "Belirtilmemiş" }, { value: "Nakit", label: "Nakit" }, { value: "Havale", label: "Havale" },
  { value: "Çek", label: "Çek" }, { value: "Kredi Kartı", label: "Kredi Kartı" },
];
export const DAVRANIS_AD = { normal: "Normal", kira: "Kira", personel: "Personel" };
export const DavranisRozeti = ({ davranis }) => {
  const r = { kira: ["var(--orTx, #c2410c)", "var(--ambBg3, #fff7ed)", "var(--ambBr3, #fed7aa)"], personel: ["var(--pur700, #6d28d9)", "var(--purBg, #f5f3ff)", "var(--purBr, #ddd6fe)"], normal: ["var(--n600, #475569)", "var(--n150, #f1f5f9)", "var(--n200, #e2e8f0)"] }[davranis] || [];
  return <span style={{ display: "inline-flex", fontSize: 11, fontWeight: 700, color: r[0], background: r[1], border: `1px solid ${r[2]}`, borderRadius: 999, padding: "1px 8px", whiteSpace: "nowrap" }}>{DAVRANIS_AD[davranis] || "Normal"}</span>;
};
export const fmtTL = (n) => fmtCur(n, "TRY");

// ── Ödeme planı (spec 0021) ───────────────────────────────────────────────────
// R11: kiraya veren şahıssa stopaj olur KDV olmaz, şirketse tersi; ikisi birlikte istisnadır (engel değil).
export const STOPAJ_KDV_NOTU = "Stopaj ve KDV birlikte girildi. Kiraya veren şahıssa stopaj olur, KDV olmaz; şirketse KDV olur, stopaj olmaz. İkisi birlikte istisnai bir durumdur; doğruysa kaydedebilirsiniz.";
// AC-14, R15: kalıcı bilgi satırı; sistem tespit yapmaz.
export const STOPAJ_AYRI_KALEM_NOTU = "Kira stopajını ayrı gider kalemi olarak girmeyin: brüt kira zaten gider toplamındadır, vergi dairesine ödenen stopaj kira kaleminin vergi dairesi bölümünde izlenir.";
// Ödeme satırları tablosu (form önizlemesi ve Ödeme Planı penceresi aynı tabloyu kullanır). onIsaretle verilirse
// satırın durum hücresi düğmedir (gider_odeme).
// Spec 0024 R18: taksit kısmen ödenebilir; _odenenK okuma anında hareketlerden gelir (odemeleriUygula).
const kismenMi = (r) => !r.odendi && (r._odenenK || 0) > 0;
const satirKalani = (r) => Math.max(0, Math.round((Number(r.tutar) || 0) * 100) - (r._odenenK || 0)) / 100;
export const OdemeSatirlari = ({ satirlar = [], davranis, onIsaretle, testId }) => {
  const hedefler = HEDEF_SIRASI.filter(h => satirlar.some(r => (r.hedef || HEDEF.ANA) === h));
  const ikiHedef = cokHedefliSatirlar(satirlar);
  const izgara = { display: "grid", gridTemplateColumns: "44px minmax(0, 1fr) minmax(0, 1fr) 130px", gap: 10, alignItems: "center" };
  return (
    <div data-testid={testId}>
      {hedefler.map(h => {
        const sat = satirlar.filter(r => (r.hedef || HEDEF.ANA) === h).sort((a, b) => (a.sira || 0) - (b.sira || 0));
        const odenen = sat.filter(r => r.odendi).length;
        return (
          <div key={h} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--n700, #334155)", marginBottom: 4 }}>
              {hedefAdi(h, davranis, ikiHedef)} <span style={{ fontWeight: 500, color: "var(--n500, #64748b)" }}>· {sat.length > 1 ? `${sat.length} taksit, ${odenen} ödendi` : odenen ? "ödendi" : "ödenmedi"}</span>
            </div>
            <div style={{ ...izgara, fontSize: 11, fontWeight: 700, color: "var(--n500, #64748b)", padding: "0 0 4px" }}><span>#</span><span>Vade</span><span style={{ textAlign: "right" }}>Tutar</span><span>Durum</span></div>
            {sat.map(r => (
              <div key={r.id} data-testid="odeme-satiri" style={{ ...izgara, fontSize: 13, padding: "5px 0", borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                <span style={{ color: "var(--n500, #64748b)" }}>{r.sira}</span>
                <span>{r.vade ? fmtTR(r.vade) : <span style={{ color: "var(--n500, #64748b)" }}>Vade girilmemiş</span>}</span>
                <b style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{tl2(r.tutar)}</b>
                <span>{onIsaretle
                  ? <button type="button" onClick={() => onIsaretle(r)} title={r.odendi ? "Ödemeleri görüntüle" : "Ödeme kaydet"}
                    style={{ border: "1px solid var(--n200, #e2e8f0)", background: r.odendi ? "var(--grnBg, #f0fdf4)" : "var(--surface, #ffffff)", color: r.odendi ? "var(--grn700, #15803d)" : kismenMi(r) ? "var(--orTx, #c2410c)" : "var(--n700, #334155)", borderRadius: 7, padding: "3px 9px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    {r.odendi ? `Ödendi${r.odemeTarihi ? ` ${fmtTR(r.odemeTarihi).slice(0, 5)}` : ""}` : kismenMi(r) ? `Kısmen · kalan ${tl2(satirKalani(r))}` : "Ödeme gir"}</button>
                  : <span style={{ fontSize: 12, fontWeight: 700, color: r.odendi ? "var(--grn700, #15803d)" : "var(--n600, #475569)" }}>{r.odendi ? "Ödendi" : kismenMi(r) ? `Kısmen · kalan ${tl2(satirKalani(r))}` : "Ödenmedi"}</span>}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

// ── Personel ek ödemeleri (spec 0023) ──────────────────────────────────────────
// Satır: tür (Fazla mesai / Prim / İkramiye), açıklama, resmi, elden. Doğrulama motorda (giderKalemDogrula); burada
// satırın hatası motorun satır numarasıyla gösterilir. Aynı türden iki satır serbesttir (R9).
export const BOS_EK_ODEME = { tur: "prim", aciklama: "", resmiTutar: "", eldenTutar: "" };
export const EkOdemeSatirlari = ({ satirlar = [], onChange, hatalar = [] }) => {
  const set = (i, patch) => onChange(satirlar.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const izgara = { display: "grid", gridTemplateColumns: "130px minmax(0, 1fr) 130px 130px 34px", gap: 8, alignItems: "center" };
  return (
    <div data-testid="ek-odemeler">
      {satirlar.length > 0 && (
        <div style={{ ...izgara, fontSize: 11, fontWeight: 700, color: "var(--n500, #64748b)", textTransform: "uppercase", letterSpacing: .4, marginBottom: 6 }}>
          <span>Tür</span><span>Açıklama</span><span>Resmi</span><span>Elden</span><span />
        </div>
      )}
      {satirlar.map((x, i) => (
        <div key={i} style={{ marginBottom: 8 }} data-testid="ek-odeme-satiri">
          <div style={izgara}>
            <Select aria-label={`Ek ödeme türü ${i + 1}`} value={x.tur || "prim"} onChange={e => set(i, { tur: e.target.value })}>
              {EK_ODEME_TURLERI.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
            <input aria-label={`Ek ödeme açıklaması ${i + 1}`} className="input" value={x.aciklama || ""} placeholder="Opsiyonel" onChange={e => set(i, { aciklama: e.target.value })} />
            <TutarInput ariaLabel={`Ek ödeme resmi ${i + 1}`} value={x.resmiTutar} onChange={v => set(i, { resmiTutar: v })} invalid={hatalar.some(h => h.satir === i)} />
            <TutarInput ariaLabel={`Ek ödeme elden ${i + 1}`} value={x.eldenTutar} onChange={v => set(i, { eldenTutar: v })} invalid={hatalar.some(h => h.satir === i)} />
            <button type="button" aria-label={`Ek ödeme ${i + 1} sil`} onClick={() => onChange(satirlar.filter((_, j) => j !== i))}
              style={{ border: "1px solid var(--n200, #e2e8f0)", background: "var(--surface, #ffffff)", borderRadius: 7, height: 32, cursor: "pointer", color: "var(--red600, #dc2626)" }}>
              <Icon name="trash" size={13} />
            </button>
          </div>
          <HataMetni>{hatalar.find(h => h.satir === i)?.mesaj}</HataMetni>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...satirlar, { ...BOS_EK_ODEME }])}
        style={{ border: "1px dashed var(--n300, #cbd5e1)", background: "transparent", borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", color: "var(--n600, #475569)", display: "inline-flex", gap: 6, alignItems: "center" }}>
        <Icon name="plus" size={13} /> Ek ödeme ekle
      </button>
    </div>
  );
};
