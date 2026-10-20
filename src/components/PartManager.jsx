import { useState } from "react";
import { parcaAdi, parseMoney, fmtCur } from "../lib/utils";
import { CUR_SYM, tipRenk } from "../lib/constants";
import { Icon, Field, Input, MoneyInput, TutarInput, Btn, Modal, ConfirmDialog, Pagination, ImageUpload, Select } from "./ui";
import { HataMetni, Ipucu, UyariSeridi, BolumBasligi } from "./tasarim";
import { kilitRedMesaji } from "../lib/kilitAlanlari";
import { MALIYET_ETIKETI, MALIYET_IPUCU, KIT_ADET_IPUCU, KITTEN_DUSECEK_IPUCU, maliyetGirildiMi, parcaMaliyetDogrula,
  kitAdediDogrula, parcaKitAdetleri, parcaKitPlani, kitleriGuncelle, isaretsizKitteMetni,
  parcaMaliyetKurus, parcaMaliyetMetni, elleMaliyetMetni, maliyetKaynagi, KAYNAK_ELLE, kaynakListeMetni, kaynakKartMetni, KAYNAK_KIRILIM_YETKISIZ, kirilimdanGeliyorMetni,
  HAMMADDE_BOS_METNI, HAMMADDE_BOLUM_BASLIGI, HAMMADDE_IPUCU, HAMMADDE_TUTARSIZ_UYARI, hammaddeTedarikciAdi, hammaddeSecilebilirMi,
  hammaddeFormu, hammaddeDogrula, maliyetGecmisiYaz, gecmisliKayit, maliyetGecmisiSatirlari, GECERLILIK_ETIKETI, GECERLILIK_IPUCU, GECMIS_BASLIGI } from "../lib/urunAgaci";
import { useBugun } from "../hooks/useBugun";
import { useSimpleDefList } from "../hooks/useSimpleDefList";
import { useFilteredList } from "../hooks/useFilteredList";

const PER_PAGE = 10;

// PartManager içinde tanımlanırsa her render'da yeni bir component referansı oluşur ve React
// içindeki input'ları unmount/remount eder — bu da her tuşa basışta focus kaybına yol açar
const PriceFields = ({ value, onChange }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
    <MoneyInput value={value.fiyatTRY} sym={CUR_SYM.TRY} onChange={v => onChange({ ...value, fiyatTRY: v })} />
    <MoneyInput value={value.fiyatUSD} sym={CUR_SYM.USD} onChange={v => onChange({ ...value, fiyatUSD: v })} />
    <MoneyInput value={value.fiyatEUR} sym={CUR_SYM.EUR} onChange={v => onChange({ ...value, fiyatEUR: v })} />
  </div>
);

const ModelChips = ({ selected = [], allModels = [], onChange }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
    {allModels.length === 0 && (
      <span style={{ fontSize: 12, color: "var(--n400, #94a3b8)" }}>Henüz makina modeli tanımlanmamış.</span>
    )}
    {allModels.map(m => {
      const name = typeof m === "string" ? m : m.model;
      const active = selected.includes(name);
      return (
        <button key={name} type="button" onClick={() => onChange(active ? selected.filter(x => x !== name) : [...selected, name])}
          style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid",
            background: active ? "var(--ambBg3, #fff7ed)" : "var(--n100, #f8fafc)",
            borderColor: active ? "#fb923c" : "var(--n200, #e2e8f0)",
            color: active ? "var(--orTx, #c2410c)" : "var(--n500, #64748b)",
          }}>
          {name}
        </button>
      );
    })}
  </div>
);

const ModelBadges = ({ models = [] }) => {
  if (!models.length) return <span style={{ color: "var(--n300, #cbd5e1)", fontSize: 12 }}>—</span>;
  const show = models.slice(0, 3);
  const rest = models.length - show.length;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {show.map(m => (
        <span key={m} style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "var(--ambBg3, #fff7ed)", color: "var(--orTx, #c2410c)", border: "1px solid var(--ambBr3, #fed7aa)" }}>{m}</span>
      ))}
      {rest > 0 && <span style={{ fontSize: 11, color: "var(--n400, #94a3b8)" }}>+{rest}</span>}
    </div>
  );
};

// Spec 0087 R1, R3, R14: TL alış maliyeti (KDV hariç), kuruşlu `TutarInput`; hata kayıt öncesinde alanın altında.
// Spec 0096 R21: kırılımda tutar varken alan çizilir ama pasiftir ve nedenini yazar (`kirilimK`); R9: kaynak ibaresi (`kaynak`).
const MaliyetAlani = ({ value, onChange, hata, kirilimK = null, kaynak = null, giderYetki = false }) => (
  <Field label={MALIYET_ETIKETI}>
    {/* Pasifken eski elle değer gösterilmez (kayıtta R7 gereği silinecek; "kırılımdan geliyor" satırıyla çelişmesin). */}
    <TutarInput value={kirilimK != null ? "" : value ?? ""} onChange={onChange} placeholder="Girilmedi" invalid={!!hata && kirilimK == null} ariaLabel="Alış maliyeti" disabled={kirilimK != null} />
    <HataMetni>{kirilimK == null ? hata || "" : ""}</HataMetni>
    {kirilimK != null && <div data-testid="maliyet-kirilimdan" style={{ fontSize: 12, fontWeight: 600, color: "var(--blu700, #1d4ed8)", marginTop: 4 }}>{kirilimdanGeliyorMetni(kirilimK)}</div>}
    {kaynak && <div data-testid="maliyet-kaynagi" style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2 }}>{kaynak.tur === "kirilim" ? (giderYetki ? kaynakKartMetni(kaynak.n) : KAYNAK_KIRILIM_YETKISIZ) : KAYNAK_ELLE}</div>}
    <Ipucu>{MALIYET_IPUCU}</Ipucu>
  </Field>
);
// Spec 0097 R5, R5/3: geçerlilik tarihi yalnız düzenlemede ve kırılımlı parçada da ETKİN (pasif maliyet alanının komşusu);
// gider yetkisi istemez. `elle` bayrağı (R7/2) kullanıcının alanı değiştirip değiştirmediğidir, kayda yazılmaz.
const GecerlilikAlani = ({ tarih, setTarih, hata }) => (
  <Field label={GECERLILIK_ETIKETI}>
    <Input type="date" aria-label={GECERLILIK_ETIKETI} value={tarih.deger} onChange={e => setTarih({ deger: e.target.value, elle: true })} />
    <HataMetni>{hata || ""}</HataMetni>
    <Ipucu>{GECERLILIK_IPUCU}</Ipucu>
  </Field>
);
// R8, R8/2, R8/3 (AC-16, AC-17, AC-43): salt okunur geçmiş, en yeni üstte; boşken bölüm çizilmez. Kayıttan okunur (form değil).
const MaliyetGecmisi = ({ parca }) => {
  const satirlar = maliyetGecmisiSatirlari(parca);
  if (!satirlar.length) return null;
  return (
    <div data-testid="maliyet-gecmisi" style={{ marginBottom: 12 }}>
      <BolumBasligi>{GECMIS_BASLIGI}</BolumBasligi>
      <div style={{ display: "grid", gap: 2, maxWidth: 360 }}>
        {satirlar.map((r, i) => (
          <div key={`${r.gecerli}-${i}`} data-testid="maliyet-gecmisi-satiri" style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "3px 0", borderBottom: "1px solid var(--n150, #f1f5f9)" }}>
            <span style={{ color: "var(--n600, #475569)" }}>{r.tarihMetni}</span>
            <span style={{ fontWeight: 600 }}>{r.tutarMetni}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Spec 0096 R3–R4/2, R8, R11, R12, R17/2, R23: parçanın hammadde tedarikçisi satırları. Seçici yalnız hammadde işaretli canlı
// tedarikçileri listeler (bir parçada bir kez); satırın kendi tedarikçisinin adı HAM diziden çözülür (çöpteki / bulunamayan).
// Satırlar form biçimindedir (tutar metin); kayıt `hammaddeDogrula`'dan geçer. Parça kartı tedarikçi kaydına yazmaz (C7).
const HammaddeAlani = ({ satirlar = [], setSatirlar, tedarikciler = [], hatalar = {} }) => {
  const secilebilir = tedarikciler.filter(hammaddeSecilebilirMi);
  const secili = new Set(satirlar.map(s => String(s.tedarikciId)).filter(Boolean));
  const kalan = secilebilir.filter(t => !secili.has(String(t.id)));
  const tutarsiz = hammaddeDogrula(satirlar).tutarsizVar;
  const guncelle = (i, alan, deger) => setSatirlar(satirlar.map((s, j) => (j === i ? { ...s, [alan]: deger } : s)));
  return (
    <div data-testid="hammadde-bolumu" style={{ marginTop: 4, marginBottom: 12 }}>
      <BolumBasligi>{HAMMADDE_BOLUM_BASLIGI}</BolumBasligi>
      {secilebilir.length === 0 && satirlar.length === 0 ? (
        <div data-testid="hammadde-bos" style={{ fontSize: 12.5, color: "var(--n500, #64748b)", padding: "6px 0" }}>{HAMMADDE_BOS_METNI}</div>
      ) : (<>
        <div style={{ display: "grid", gap: 6 }}>
          {satirlar.map((s, i) => {
            const id = String(s.tedarikciId ?? "");
            const secenekler = secilebilir.filter(t => String(t.id) === id || !secili.has(String(t.id)));
            const kayitliDisi = id && !secenekler.some(t => String(t.id) === id);
            return (
              <div key={i} data-testid="hammadde-satiri">
                <div style={{ display: "grid", gridTemplateColumns: "minmax(160px, 2fr) minmax(120px, 1fr) auto", gap: 8, alignItems: "center" }}>
                  <Select aria-label={`Hammadde tedarikçisi ${i + 1}`} value={id} onChange={e => guncelle(i, "tedarikciId", e.target.value)}>
                    <option value="">Tedarikçi seçin…</option>
                    {kayitliDisi && <option value={id}>{hammaddeTedarikciAdi(id, tedarikciler)}</option>}
                    {secenekler.map(t => <option key={t.id} value={String(t.id)}>{t.ad}</option>)}
                  </Select>
                  <TutarInput value={s.tutar ?? ""} onChange={v => guncelle(i, "tutar", v)} placeholder="Tutar girilmedi" invalid={!!hatalar[i]} ariaLabel={`Hammadde tutarı ${i + 1}`} />
                  <Btn small variant="ghost" title="Satırı sil" onClick={() => setSatirlar(satirlar.filter((_, j) => j !== i))}><Icon name="trash" size={12} /></Btn>
                </div>
                <HataMetni>{hatalar[i] || ""}</HataMetni>
              </div>
            );
          })}
        </div>
        {kalan.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <Btn small variant="ghost" onClick={() => setSatirlar([...satirlar, { tedarikciId: "", tutar: "" }])}><Icon name="plus" size={12} /> Tedarikçi ekle</Btn>
          </div>
        )}
        {tutarsiz && <div style={{ marginTop: 6 }}><UyariSeridi aile="uyari" testId="hammadde-tutarsiz">{HAMMADDE_TUTARSIZ_UYARI}</UyariSeridi></div>}
        <Ipucu>{HAMMADDE_IPUCU}</Ipucu>
      </>)}
    </div>
  );
};
// Formdaki satırlardan canlı maliyet (kuruş) ve kaynak: kayıtla aynı yol (doğrulayıcı + tek okuma yolu).
const formMaliyeti = (f) => {
  const kayit = hammaddeDogrula(f?.hammaddeler).kayit;
  const p = { hammaddeler: kayit, maliyet: parcaMaliyetDogrula(f?.maliyet).deger };
  return { kirilimK: kayit.some(h => h.tutar != null) ? parcaMaliyetKurus(p) : null, kaynak: maliyetKaynagi(p) };
};

// Spec 0087 R5, R7 (plan P7, P8): işaretli canlı modeller için "Model · Adet" satırları. Adet makina kitine yazılır, boşsa
// yalnız işaret kalır. Bu düzenlemede işareti kaldırılan ve kitinde bu parça olan model için ipucu (onay penceresi yok).
// Triyaj (bulgu 1): ipucu yalnız GERÇEKTEN düşecek modellere çıkar, yani kayıttaki işaretten (`eskiModeller`) bu düzenlemede
// kaldırılan ve kitinde bu parça olan modellere (urunAgaci.kitleriGuncelle'nin kuralı). İşareti hiç olmayan ama kitinde bu parça
// olan model (0087 öncesi yeniden adlandırılmış modellerde olur) ayrı bilgi satırıdır; kayıt o kite dokunmaz.
const ModelAdetleri = ({ selected = [], allModels = [], adetler, setAdetler, hatalar = {}, kittekiler = {}, eskiModeller = [] }) => {
  const isaretli = allModels.map(m => (typeof m === "string" ? m : m.model)).filter(ad => selected.includes(ad));
  const canli = (ad) => allModels.some(m => (typeof m === "string" ? m : m.model) === ad);
  const dusecek = Object.keys(kittekiler).filter(ad => !selected.includes(ad) && eskiModeller.includes(ad) && canli(ad));
  const isaretsizKitte = Object.keys(kittekiler).filter(ad => !selected.includes(ad) && !eskiModeller.includes(ad) && canli(ad));
  if (!isaretli.length && !dusecek.length && !isaretsizKitte.length) return null;
  return (
    <div data-testid="model-adetleri" style={{ marginTop: 8, display: "grid", gap: 6 }}>
      {isaretli.map(ad => {
        const deger = adetler[ad] ?? "";
        return (
          <div key={ad} style={{ display: "grid", gridTemplateColumns: "minmax(120px, 1fr) 96px minmax(120px, 2fr)", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{ad}</span>
            <Input value={deger} inputMode="numeric" aria-label={`${ad} adedi`} placeholder="Adet"
              onChange={e => setAdetler(p => ({ ...p, [ad]: e.target.value }))} />
            <div style={{ fontSize: 12, color: "var(--n400, #94a3b8)" }}>
              {hatalar[ad] ? <HataMetni>{hatalar[ad]}</HataMetni> : (String(deger).trim() === "" ? "kitte yok" : "makina kitinde")}
            </div>
          </div>
        );
      })}
      {dusecek.map(ad => <Ipucu key={ad}>{`${ad}: ${KITTEN_DUSECEK_IPUCU}`}</Ipucu>)}
      {isaretsizKitte.map(ad => <Ipucu key={ad}>{isaretsizKitteMetni(ad, kittekiler[ad])}</Ipucu>)}
      <Ipucu>{KIT_ADET_IPUCU}</Ipucu>
    </div>
  );
};

// Parça tipi seçici — tipler kullanıcı-tanımlı partTypeDefs listesinden gelir.
const TipSelector = ({ value, onChange, partTypeDefs = [] }) => (
  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
    {partTypeDefs.map(t => {
      const active = (value || "Standart") === t.ad;
      const c = tipRenk(t.ad, partTypeDefs);
      return (
        <button key={t.id} type="button" onClick={() => onChange(t.ad)}
          style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
            border: `1px solid ${active ? c.border : "var(--n200, #e2e8f0)"}`,
            background: active ? c.bg : "var(--n100, #f8fafc)",
            color: active ? c.color : "var(--n400, #94a3b8)" }}>
          {t.ad}
        </button>
      );
    })}
  </div>
);

// Spec 0087 R15/1: panel iki model dizisini (canlı) ve yazıcılarını alır; kit yazımı yalnız urunAgaci'nden geçer (AC-19).
// `baskasiKilitli` Settings'in canlı kilit listesidir (R16).
// Spec 0096 R17, R17/2, C11: `tedarikciler` HAM dizidir ve Settings'te gider yetkisiyle kapatılarak gelir; `giderYetki` yoksa
// hammadde bölümü, süzgeç ve tedarikçi adları hiç çizilmez (kırılım formda taşınır ve aynen geri yazılır, R17/3).
export const SUZGEC_TUMU = "";
export const SUZGEC_GIRILMEMIS = "__girilmemis__";
export const SUZGEC_BOS_METNI = "Bu süzgece uyan parça yok.";
export const PartManager = ({ parts = [], setParts, showToast = () => {}, setServices = null, standardModels = [], customModels = [],
  setStandardModels = null, setCustomModels = null, partTypeDefs = [], baskasiKilitli = null, rawCustomModels = null, tedarikciler = [], giderYetki = false }) => {
  const allModels = [...standardModels, ...customModels];
  const emptyForm = { ad: "", adEN: "", kod: "", tanim: "", tanimEN: "", fiyatTRY: "", fiyatUSD: "", fiyatEUR: "", models: [], tip: "Standart", resim: "", maliyet: "", hammaddeler: [] };
  // Spec 0087 R4, C4 (plan P4): maliyetin ham metni kayıtta sayıya çevrilir; boşsa alan gövdeye hiç yazılmaz.
  // Spec 0096 R7, R7/2, C12: kırılım da HER çağrıda ayrıştırılır (düzenleme `{ ...x, ...editForm }` birleştirmesidir; boşaltılan
  // kırılım eski kayıttan geri gelmesin) ve yalnız doluyken yazılır; kırılımda tutar varsa `maliyet` anahtarı her çağrıda silinir.
  const hazirlaTemel = (kayit) => {
    const { maliyet, hammaddeler, maliyetGecmisi: _formKopyasi, ...geri } = kayit;
    const kirilim = hammaddeDogrula(hammaddeler).kayit;
    const kirilimli = kirilim.some(h => h.tutar != null);
    const d = parcaMaliyetDogrula(maliyet);
    return { ...geri, ...(kirilimli || d.bos || d.hata ? {} : { maliyet: d.deger }), ...(kirilim.length ? { hammaddeler: kirilim } : {}) };
  };
  // Spec 0097 R4, C13, C13/2 (tuzak 2, 3, 9): formdan gelen geçmiş kopyası atılır; geçmiş güncelleyicinin içindeki ESKİ kayıttan
  // (`eski`) ve yeni kaydın ÇÖZÜLMÜŞ maliyetinden (kırılım toplamı dahil) tek karar motoruyla yazılır. Tarih ve bugün `ek` ile
  // kaydın başında bir kez çözülmüş gelir; bu fonksiyon saat okumaz. Yeni parçada (`eski` yok) geçmiş yazılmaz (R5/2).
  // Triyaj (bulgu 4): karar hata dönerse kayıt hiç değişmez (eski kayıt aynen döner).
  const hazirla = (kayit, eski = null, ek = null) => gecmisliKayit(hazirlaTemel(kayit), eski, ek) ?? eski;
  const { form, setForm, editId, editForm, setEditForm, confirmDel, add, startEdit, cancelEdit, saveEdit, requestDelete, cancelDelete, confirmDelete } =
    useSimpleDefList({
      items: parts,
      setItems: setParts,
      genId: () => Date.now(),
      showToast,
      emptyForm,
      addMsg: "Yedek parça tanımı kaydedildi.",
      editMsg: "Yedek parça düzenlendi.",
      deleteMsg: "Yedek parça tanımı silindi.",
      hazirla,
      onRename: (oldAd, newAd) => setServices?.(p => p.map(s =>
        Array.isArray(s.degisenParcalar) && s.degisenParcalar.some(x => parcaAdi(x) === oldAd)
          ? { ...s, degisenParcalar: s.degisenParcalar.map(x => parcaAdi(x) === oldAd ? (typeof x === "string" ? newAd : { ...x, ad: newAd }) : x) }
          : s
      )),
    });
  const [addOpen, setAddOpen] = useState(false);
  // Spec 0096 R10, R10/2, R22, C14: tedarikçi süzgeci (gider yetkisiyle). Seçenek kümesi canlı parçaların kırılımında geçen
  // tedarikçiler (sayılı) ve "girilmemiş"; sayfa sıfırlaması süzgeci yazan fonksiyonda (kancanın imzası değişmez).
  const [suzgec, setSuzgecRaw] = useState(SUZGEC_TUMU);
  const suzgecFn = (p) => {
    if (!giderYetki || suzgec === SUZGEC_TUMU) return true;
    const h = p.hammaddeler || [];
    if (suzgec === SUZGEC_GIRILMEMIS) return h.length === 0;
    return h.some(x => String(x.tedarikciId) === suzgec);
  };
  const { search, setSearch, page, setPage, filtered, paged } = useFilteredList(parts, { searchFields: ["ad"], filterFn: suzgecFn, perPage: PER_PAGE });
  const setSuzgec = (v) => { setSuzgecRaw(v); setPage(1); };
  const suzgecSecenekleri = (() => {
    const say = new Map();
    for (const p of parts) for (const h of p.hammaddeler || []) { const k = String(h.tedarikciId); say.set(k, (say.get(k) || 0) + 1); }
    return [...say].map(([id, n]) => ({ id, n, ad: hammaddeTedarikciAdi(id, tedarikciler) })).sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  })();
  const girilmemisSayi = parts.filter(p => !(p.hammaddeler || []).length).length;

  const priceSummary = (p) => {
    const bits = [];
    if (parseMoney(p.fiyatTRY) > 0) bits.push(fmtCur(parseMoney(p.fiyatTRY), "TRY"));
    if (parseMoney(p.fiyatUSD) > 0) bits.push(fmtCur(parseMoney(p.fiyatUSD), "USD"));
    if (parseMoney(p.fiyatEUR) > 0) bits.push(fmtCur(parseMoney(p.fiyatEUR), "EUR"));
    return bits.length ? bits.join(" · ") : "—";
  };

  // Formun kit adetleri kancanın formunda TUTULMAZ (gövdeye sızmasın, plan P4): model adı → ham metin.
  const [adetler, setAdetler] = useState({});
  const [kittekiler, setKittekiler] = useState({});
  const [hatalar, setHatalar] = useState({ maliyet: null, adet: {}, hammadde: {}, tarih: null });
  // Spec 0097 R5/4: varsayılan tarih yerel gün (`useBugun`), `today()` değil.
  const bugun = useBugun();
  const [tarih, setTarih] = useState({ deger: "", elle: false });
  // R10, AC-8, AC-9: kümesi bütün canlı parçalar (arama ve sayfadan bağımsız; `parts` App'ten çöpü süzülmüş gelir).
  const maliyetsizSayi = parts.filter(p => !maliyetGirildiMi(p)).length;

  const openAdd = () => { setForm(emptyForm); setAdetler({}); setKittekiler({}); setHatalar({ maliyet: null, adet: {}, hammadde: {}, tarih: null }); setAddOpen(true); };
  const openEdit = (k) => {
    const kit = parcaKitAdetleri(k.id, [standardModels, customModels]);
    setKittekiler(kit);
    setAdetler(Object.fromEntries(Object.entries(kit).map(([m, n]) => [m, String(n)])));
    setHatalar({ maliyet: null, adet: {}, hammadde: {}, tarih: null });
    setTarih({ deger: bugun, elle: false }); // Spec 0097 AC-10: alan bugünün tarihiyle gelir
    // Spec 0096 R17/3: kırılım formda hep form biçiminde (tutar metin), yetkisiz kullanıcıda da (bölüm çizilmese de taşınır).
    // Spec 0097 C13: geçmiş forma kopyalanmaz (kayıt fonksiyonu onu kayıttan okur).
    const { maliyetGecmisi: _g, ...kayit } = k;
    startEdit({ ...kayit, maliyet: elleMaliyetMetni(k), hammaddeler: hammaddeFormu(k.hammaddeler) });
  };

  // R7, R14–R16, plan P5: doğrula → karşı bölüme yazılacaksa kilide anlık bak (reddedilirse kayıt bütünüyle yazılmaz) →
  // parçayı kancayla yaz → kancanın döndürdüğü kimlikle kiti iki model dizisine aynı `kit` nesnesiyle yaz.
  const kaydet = (kip) => {
    const f = kip === "ekle" ? form : editForm;
    // Spec 0096 R23: kırılım doğrulaması aynı erken dönüşe katılır (hata hâlinde parça da kit de yazılmaz, AC-14); kırılımda
    // tutar varken elle maliyet alanı pasiftir ve doğrulanmaz (R21).
    const h = hammaddeDogrula(f.hammaddeler);
    const m = h.kayit.some(x => x.tutar != null) ? { hata: null } : parcaMaliyetDogrula(f.maliyet);
    const isaretli = allModels.map(x => x.model).filter(ad => (f.models || []).includes(ad));
    const adetHata = {}; const adetMap = {};
    for (const ad of isaretli) { const d = kitAdediDogrula(adetler[ad]); if (d.hata) adetHata[ad] = d.hata; else adetMap[ad] = d.deger; }
    const eski = kip === "ekle" ? null : parts.find(x => x.id === editId);
    // Spec 0097 R5/4, R6, R6/3, R7/2: tarih kaydın başında BİR KEZ çözülür; doğrulama yazımla aynı motordan (önizleme).
    const ek = kip === "ekle" ? null : { tarih: tarih.deger, bugun, tarihElle: tarih.elle };
    const tarihHata = eski && !m.hata && h.gecerli ? maliyetGecmisiYaz(eski, parcaMaliyetKurus(hazirlaTemel({ ...eski, ...f })), ek).hata : null;
    setHatalar({ maliyet: m.hata, adet: adetHata, hammadde: h.hatalar, tarih: tarihHata });
    if (m.hata || Object.keys(adetHata).length || !h.gecerli || tarihHata) return;
    const kitGirdisi = { partId: kip === "ekle" ? "__yeni__" : editId, ad: (f.ad || "").trim(), models: f.models || [], eskiModeller: eski?.models || [], adetler: adetMap };
    // Triyaj (bulgu 3): yazma kararı TAM özel model dizisiyle verilir; kit satırı yalnız çöpteki bir modelde duruyorsa ad
    // taşıması da yazılsın (geri alınan model eski adı basmasın). Canlı dizi yalnız ekranda çizilenleri taşır.
    const plan = parcaKitPlani(kitGirdisi, standardModels, rawCustomModels || customModels);
    const kilit = plan.karsiBolumeYazar ? baskasiKilitli?.("ayar", "models") : null;
    if (kilit) { showToast(kilitRedMesaji(kilit), "err"); return; }
    const id = kip === "ekle" ? add() : saveEdit(ek);
    if (!id) return;
    if (kip === "ekle") setAddOpen(false);
    if (!plan.karsiBolumeYazar) return;
    const kit = { ...plan.kit, partId: id };
    setStandardModels?.(p => kitleriGuncelle(p, kit));
    setCustomModels?.(p => kitleriGuncelle(p, kit));
  };
  const submitAdd = () => kaydet("ekle");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn onClick={openAdd}><Icon name="plus" size={14} /> Parça/Yedek Parça Ekle</Btn>
      </div>
      {maliyetsizSayi > 0 && (
        <div style={{ marginBottom: 12 }}>
          <UyariSeridi aile="uyari" testId="maliyetsiz-parca">
            <b>{maliyetsizSayi}</b> parçanın alış maliyeti girilmedi; makina maliyeti hesabı bu parçaları eksik sayar.
          </UyariSeridi>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
      <div style={{ position: "relative", flex: 1 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--n400, #94a3b8)" }}><Icon name="search" size={15} /></span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Yedek parça ara..."
          style={{ padding: "9px 12px 9px 36px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "var(--n100, #f8fafc)", outline: "none" }} />
      </div>
      {/* Spec 0096 C14: süzgeç Select'tir (tasarım sözlüğünde adıyla istisna); yalnız gider yetkisiyle (R10/2). */}
      {giderYetki && (
        <div style={{ width: 280 }} data-testid="tedarikci-suzgeci">
          <Select aria-label="Hammadde tedarikçisi süzgeci" value={suzgec} onChange={e => setSuzgec(e.target.value)}>
            <option value={SUZGEC_TUMU}>Tüm parçalar</option>
            {suzgecSecenekleri.map(o => <option key={o.id} value={o.id}>{`${o.ad} (${o.n})`}</option>)}
            <option value={SUZGEC_GIRILMEMIS}>{`Hammadde tedarikçisi girilmemiş (${girilmemisSayi})`}</option>
          </Select>
        </div>
      )}
      </div>

      <div style={{ border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, overflow: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--n400, #94a3b8)", fontSize: 13 }}>
            {parts.length === 0 ? "Henüz yedek parça tanımı yok." : giderYetki && suzgec !== SUZGEC_TUMU ? SUZGEC_BOS_METNI : "Arama sonucu bulunamadı."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--n100, #f8fafc)" }}>
                <th style={{ padding: "8px 14px", width: 52 }}></th>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)" }}>Yedek Parça Adı</th>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)" }}>Tip</th>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)" }}>Kod</th>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)" }}>Ad / Tanım</th>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)" }}>Modeller</th>
                <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)" }}>Fiyat</th>
                <th style={{ padding: "8px 14px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)" }}>Maliyet</th>
                <th style={{ padding: "8px 14px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)" }}></th>
              </tr>
            </thead>
            <tbody>
              {paged.map(k => (
                <tr key={k.id} style={{ borderBottom: "1px solid var(--n150, #f1f5f9)" }}>
                  <td style={{ padding: "10px 14px" }}>
                    {k.resim
                      ? <img src={k.resim} alt={k.ad} style={{ width: 40, height: 30, objectFit: "contain", borderRadius: 4, border: "1px solid var(--n200, #e2e8f0)" }} />
                      : <div style={{ width: 40, height: 30, borderRadius: 4, border: "1px dashed var(--n200, #e2e8f0)", background: "var(--n100, #f8fafc)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "var(--n300, #cbd5e1)" }}>—</div>
                    }
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{k.ad}</span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {(() => { const t = k.tip || "Standart"; const c = tipRenk(t, partTypeDefs); return (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: "nowrap" }}>{t}</span>
                    ); })()}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--n500, #64748b)" }}>{k.kod || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 11 }}>
                    <span style={{ color: k.adEN ? "var(--grn600, #16a34a)" : "var(--n300, #cbd5e1)" }}>TR</span>
                    {" · "}
                    <span style={{ color: k.adEN ? "var(--grn600, #16a34a)" : "var(--n300, #cbd5e1)" }}>EN</span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <ModelBadges models={k.models || []} />
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontSize: 13, color: "var(--n600, #475569)" }}>{priceSummary(k)}</span>
                  </td>
                  <td data-testid="parca-maliyet" style={{ padding: "10px 14px", textAlign: "right", fontSize: 13, whiteSpace: "nowrap", color: maliyetGirildiMi(k) ? "var(--n700, #334155)" : "var(--n300, #cbd5e1)" }}>
                    {parcaMaliyetMetni(k)}
                    {/* Spec 0096 R9/2: ikinci satır yalnız kırılımdan gelen maliyette (gider yetkisiyle; AC-45). */}
                    {giderYetki && maliyetKaynagi(k)?.tur === "kirilim" && <div data-testid="parca-maliyet-kaynak" style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>{kaynakListeMetni(maliyetKaynagi(k).n)}</div>}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <Btn small variant="ghost" title="Düzenle" onClick={() => openEdit(k)}><Icon name="edit" size={12} /></Btn>
                      <Btn small variant="danger" onClick={() => requestDelete(k)}><Icon name="trash" size={12} /></Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination total={filtered.length} page={page} setPage={setPage} perPage={PER_PAGE} />

      {confirmDel && (
        <ConfirmDialog
          message={`"${confirmDel.ad}" yedek parça tanımı Çöp Kutusu'na taşınacak (30 gün içinde geri alınabilir). Daha önce verilmiş kayıtlar geçmişte kalır.`}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}

      {addOpen && (
        <Modal wide title="Yeni Yedek Parça Ekle" onClose={() => setAddOpen(false)}
          footer={<div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setAddOpen(false)}>İptal</Btn>
            <Btn onClick={submitAdd}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Yedek Parça Adı (TR)">
            <Input value={form.ad} onChange={e => setForm(p => ({ ...p, ad: e.target.value }))} placeholder="Örn: Kesme Bıçağı Seti" />
            <HataMetni>{!form.ad.trim() ? "Yedek parça adı girilmedi" : ""}</HataMetni>
          </Field>
          <Field label="Yedek Parça Adı (EN)">
            <Input value={form.adEN || ""} onChange={e => setForm(p => ({ ...p, adEN: e.target.value }))} placeholder="Örn: Cutting Blade Set" />
          </Field>
          <Field label="Kod">
            <Input value={form.kod || ""} onChange={e => setForm(p => ({ ...p, kod: e.target.value }))} placeholder="Örn: KES-001" />
          </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Tanım (TR)">
            <textarea value={form.tanim || ""} onChange={e => setForm(p => ({ ...p, tanim: e.target.value }))}
              placeholder="Teknik özellikler, boyutlar vb."
              className="input" style={{ fontSize: 13, resize: "vertical", minHeight: 72 }} />
          </Field>
          <Field label="Tanım (EN)">
            <textarea value={form.tanimEN || ""} onChange={e => setForm(p => ({ ...p, tanimEN: e.target.value }))}
              placeholder="Technical specifications, dimensions etc."
              className="input" style={{ fontSize: 13, resize: "vertical", minHeight: 72 }} />
          </Field>
          </div>
          <Field label="Fiyat (TL / USD / EUR — opsiyonel)">
            <PriceFields value={form} onChange={setForm} />
          </Field>
          <MaliyetAlani value={form.maliyet} onChange={v => setForm(p => ({ ...p, maliyet: v }))} hata={hatalar.maliyet} {...formMaliyeti(form)} giderYetki={giderYetki} />
          {giderYetki && <HammaddeAlani satirlar={form.hammaddeler || []} setSatirlar={v => setForm(p => ({ ...p, hammaddeler: v }))} tedarikciler={tedarikciler} hatalar={hatalar.hammadde} />}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Parça Tipi">
            <TipSelector value={form.tip || "Standart"} onChange={v => setForm(p => ({ ...p, tip: v }))} partTypeDefs={partTypeDefs} />
          </Field>
          <Field label="Resim">
            <ImageUpload value={form.resim || ""} onChange={v => setForm(p => ({ ...p, resim: v }))} label={form.ad} />
          </Field>
          </div>
          <Field label="Kullanıldığı Modeller ve Kit Adetleri">
            <ModelChips selected={form.models || []} allModels={allModels}
              onChange={models => setForm(p => ({ ...p, models }))} />
            <ModelAdetleri selected={form.models || []} allModels={allModels} adetler={adetler} setAdetler={setAdetler} hatalar={hatalar.adet} />
          </Field>
        </Modal>
      )}

      {editId !== null && (
        <Modal wide title="Yedek Parçayı Düzenle" onClose={cancelEdit}
          footer={<div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" onClick={cancelEdit}>İptal</Btn>
            <Btn onClick={() => kaydet("duzenle")}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Yedek Parça Adı (TR)">
            <Input value={editForm.ad || ""} onChange={e => setEditForm(p => ({ ...p, ad: e.target.value }))} placeholder="Örn: Kesme Bıçağı Seti" />
            <HataMetni>{!(editForm.ad || "").trim() ? "Yedek parça adı girilmedi" : ""}</HataMetni>
          </Field>
          <Field label="Yedek Parça Adı (EN)">
            <Input value={editForm.adEN || ""} onChange={e => setEditForm(p => ({ ...p, adEN: e.target.value }))} placeholder="Örn: Cutting Blade Set" />
          </Field>
          <Field label="Kod">
            <Input value={editForm.kod || ""} onChange={e => setEditForm(p => ({ ...p, kod: e.target.value }))} placeholder="Örn: KES-001" />
          </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Tanım (TR)">
            <textarea value={editForm.tanim || ""} onChange={e => setEditForm(p => ({ ...p, tanim: e.target.value }))}
              placeholder="Teknik özellikler, boyutlar vb."
              className="input" style={{ fontSize: 13, resize: "vertical", minHeight: 72 }} />
          </Field>
          <Field label="Tanım (EN)">
            <textarea value={editForm.tanimEN || ""} onChange={e => setEditForm(p => ({ ...p, tanimEN: e.target.value }))}
              placeholder="Technical specifications, dimensions etc."
              className="input" style={{ fontSize: 13, resize: "vertical", minHeight: 72 }} />
          </Field>
          </div>
          <Field label="Fiyat (TL / USD / EUR — opsiyonel)">
            <PriceFields value={editForm} onChange={setEditForm} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <MaliyetAlani value={editForm.maliyet} onChange={v => setEditForm(p => ({ ...p, maliyet: v }))} hata={hatalar.maliyet} {...formMaliyeti(editForm)} giderYetki={giderYetki} />
            <GecerlilikAlani tarih={tarih} setTarih={setTarih} hata={hatalar.tarih} />
          </div>
          <MaliyetGecmisi parca={parts.find(x => x.id === editId)} />
          {giderYetki && <HammaddeAlani satirlar={editForm.hammaddeler || []} setSatirlar={v => setEditForm(p => ({ ...p, hammaddeler: v }))} tedarikciler={tedarikciler} hatalar={hatalar.hammadde} />}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Parça Tipi">
            <TipSelector value={editForm.tip || "Standart"} onChange={v => setEditForm(p => ({ ...p, tip: v }))} partTypeDefs={partTypeDefs} />
          </Field>
          <Field label="Resim">
            <ImageUpload value={editForm.resim || ""} onChange={v => setEditForm(p => ({ ...p, resim: v }))} label={editForm.ad} />
          </Field>
          </div>
          <Field label="Kullanıldığı Modeller ve Kit Adetleri">
            <ModelChips selected={editForm.models || []} allModels={allModels}
              onChange={models => setEditForm(p => ({ ...p, models }))} />
            <ModelAdetleri selected={editForm.models || []} allModels={allModels} adetler={adetler} setAdetler={setAdetler} hatalar={hatalar.adet} kittekiler={kittekiler}
              eskiModeller={parts.find(x => x.id === editId)?.models || []} />
          </Field>
        </Modal>
      )}
    </div>
  );
};
