import { Icon, Select, Field, TutarInput, Input } from "../ui";
import { HataMetni, Ipucu } from "../tasarim";
import { HEDEF, HEDEF_SIRASI, EK_ODEME_TURLERI, KISIT_KUTU_ETIKETI, KISIT_FORM_NOTU, KAPSAM_ETIKETI, KAPSAM_IPUCU, KAPSAM_ANAHTARI } from "../../lib/gider";
import { fmtCur, fmtTR } from "../../lib/utils";
// Spec 0059 R20, R31: hedef ad zinciri ve tutar biçimi saf kitaplıkta (rapor React almadan kullanır); burada aynı adlarla
// yeniden dışa verilir, çağıranlar değişmez. TEK tanım odemeYontemi.js'tedir.
import { tl2, HEDEF_AD, HEDEF_ADLARI, hedefAdi, hedefBasligi, taksitAdi, cokHedefliSatirlar, cokHedefliMi, hedefEtiketi } from "../../lib/odemeYontemi";
export { tl2, HEDEF_AD, HEDEF_ADLARI, hedefAdi, hedefBasligi, taksitAdi, cokHedefliSatirlar, cokHedefliMi, hedefEtiketi };

// Gider kalemi ve tekrarlayan tanım formlarının paylaştığı alanlar (spec 0001). İki form aynı
// tutar ve kısıt bileşenlerini kullanır ki kalem ile tanım birbirinden ayrışmasın.

// Spec 0087 R3 (revizyon 3): kuruşlu `TutarInput` ui.jsx'e, `tutarMetni` lib/tutarGirdisi.js'e taşındı (katalog paneli
// gider bileşeni içe almasın); burada aynı adlarla yeniden dışa verilir, gider/ klasörünün çağrıları değişmez.
export { TutarInput };
export { tutarMetni } from "../../lib/tutarGirdisi";

export const AyInput = ({ value, onChange, id, ariaLabel }) => (
  <input type="month" id={id} aria-label={ariaLabel} className="input" value={value || ""} onChange={e => onChange(e.target.value || null)} />
);

// Spec 0090 R38: makina seçici, model satırları ve atama alanı kalktı (gider formunda atama yok, tek maliyet modeli).

// Spec 0076 R1, R2, R6, R30, R35: gider kısıtlaması (binek araç) kutusu ve indirilebilir oran. Kalem formu ve tekrarlayan
// tanım formu aynı alanı kullanır (tanımda oran boş bırakılabilir: "ayardaki oran", R8/3). Kutu açılınca oran ayardaki
// varsayılanla dolar (R9'un tek yardımcısı); kapanınca temizlenir. Kapı (kisitliGiderMi) çağıranda.
export const KISIT_KAPSAM_IPUCU = "Binek otomobilin yakıt, bakım, onarım, sigorta, kasko, otopark ve lastik giderleri. Ruhsatında \"ticari\" yazan kamyonet ve panelvan için işaretlemeyin.";
export const KisitAlani = ({ acik, oran, onChange, varsayilanOran, hata = null, tanim = false }) => (
  <div data-testid="kisit-alani" style={{ borderTop: "1px dashed var(--n300, #cbd5e1)", paddingTop: 10, marginBottom: 10 }}>
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
      <input type="checkbox" aria-label={KISIT_KUTU_ETIKETI} checked={!!acik}
        onChange={e => onChange(e.target.checked ? { kisitliGider: true, indirilebilirOran: tanim ? "" : String(varsayilanOran) } : { kisitliGider: false, indirilebilirOran: "" })}
        style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--brand, #e85d1a)" }} />
      <span style={{ fontSize: 13, fontWeight: 700 }}>{KISIT_KUTU_ETIKETI}</span>
    </label>
    {acik && (
      <div style={{ marginTop: 8 }}>
        <div style={{ maxWidth: 200 }}>
          <Field label={tanim ? "İndirilebilir oran" : "İndirilebilir oran *"}>
            <TutarInput sym="%" ariaLabel="İndirilebilir oran" value={oran} onChange={v => onChange({ indirilebilirOran: v })} invalid={!!hata} />
            <HataMetni>{hata}</HataMetni>
          </Field>
        </div>
        {tanim && <Ipucu>Boş bırakılırsa her ay üretilen kaleme Ayarlar'daki oran (şu an %{varsayilanOran}) yazılır.</Ipucu>}
        <Ipucu>{KISIT_KAPSAM_IPUCU}</Ipucu>
        <Ipucu>{KISIT_FORM_NOTU}</Ipucu>
      </div>
    )}
  </div>
);

// Spec 0092 R1–R5: kalemin kapsadığı ay sayısı (kalem formu ve tanım formu aynı bileşeni çizer; KisitAlani emsali). Yalnız normal
// ve kira davranışında çizilir (çağıran kapıyı `kapsamSecilebilirMi` ile verir). Metin alanıdır: harf de yazılabilsin ve kayıt
// doğrulaması nedenini yazsın (R4). Kalıcı anahtar 0072'den kalma `dagitimAy` (X10).
export const KapsamAlani = ({ deger, onChange, hata = null }) => (
  <div data-testid="kapsam-alani" style={{ maxWidth: 260, marginBottom: 10 }}>
    <Field label={KAPSAM_ETIKETI}>
      <Input aria-label={KAPSAM_ETIKETI} inputMode="numeric" value={deger ?? ""} onChange={e => onChange({ [KAPSAM_ANAHTARI]: e.target.value })} aria-invalid={!!hata} />
      <HataMetni>{hata}</HataMetni>
    </Field>
    <Ipucu>{KAPSAM_IPUCU}</Ipucu>
  </div>
);

export const ODEME_SECENEKLERI = [
  { value: "", label: "Belirtilmemiş" }, { value: "Nakit", label: "Nakit" }, { value: "Havale", label: "Havale" },
  { value: "Çek", label: "Çek" }, { value: "Kredi Kartı", label: "Kredi Kartı" },
];
export const DAVRANIS_AD = { normal: "Normal", kira: "Kira", personel: "Personel", sgk: "SGK" }; // spec 0074 R2
export const DavranisRozeti = ({ davranis }) => {
  const r = { kira: ["var(--orTx, #c2410c)", "var(--ambBg3, #fff7ed)", "var(--ambBr3, #fed7aa)"], personel: ["var(--pur700, #6d28d9)", "var(--purBg, #f5f3ff)", "var(--purBr, #ddd6fe)"],
    sgk: ["var(--blu700, #1d4ed8)", "var(--bluBg, #eff6ff)", "var(--bluBr, #bfdbfe)"], normal: ["var(--n600, #475569)", "var(--n150, #f1f5f9)", "var(--n200, #e2e8f0)"] }[davranis] || [];
  return <span style={{ display: "inline-flex", fontSize: 11, fontWeight: 700, color: r[0], background: r[1], border: `1px solid ${r[2]}`, borderRadius: 999, padding: "1px 8px", whiteSpace: "nowrap" }}>{DAVRANIS_AD[davranis] || "Normal"}</span>;
};
export const fmtTL = (n) => fmtCur(n, "TRY");

// ── Ödeme planı (spec 0021) ───────────────────────────────────────────────────
// R11: kiraya veren şahıssa stopaj olur KDV olmaz, şirketse tersi; ikisi birlikte istisnadır (engel değil).
export const STOPAJ_KDV_NOTU = "Stopaj ve KDV birlikte girildi. Kiraya veren şahıssa stopaj olur, KDV olmaz; şirketse KDV olur, stopaj olmaz. İkisi birlikte istisnai bir durumdur; doğruysa kaydedebilirsiniz.";
// AC-14, R15: kalıcı bilgi satırı; sistem tespit yapmaz.
// Spec 0075 R13 (AC-15): tevkifatlı faturanın üç kalıcı notu, her biri tek sabit.
export const TEVKIFAT_AYRI_KALEM_NOTU = "KDV tevkifatını ayrı gider kalemi olarak girmeyin: matrah ve tam KDV bu kalemdedir, vergi dairesine giden tevkifat bu kalemin vergi dairesi bölümünden ödenir.";
export const TEVKIFAT_KDV_DAHIL_NOTU = "Tevkifatlı faturada \u201cKDV dâhil\u201d seçilirse girilen rakam matrah artı TAM KDV'dir (faturanın ödenecek genel toplamı değildir); uygulama tevkifatı ayrılan matrahtan hesaplar.";
export const TEVKIFAT_ALT_SINIR_NOTU = "Tevkifat alt sınırı (2026'da fatura başına KDV dâhil 12.000 TL) satıcının sorumluluğundadır; uygulama tutarı denetlemez, faturadaki oranı girin.";
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
