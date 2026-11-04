// Spec 0044: servis, Extra Kalıp ve yedek parça tahsilatının hesabı. İki parça: formlarda "Ödendi" kutusunun
// altındaki seçici (TahsilatHesapAlani) ve tek tıklık "Ödendi" anahtarının açtığı küçük pencere
// (TahsilatHesapPenceresi). Hangi kaydın hesap sorduğu ve tutarı saf motordan gelir (satisTahsilat.js).
import { useState, useEffect } from "react";
import { Field, Select, Btn, Modal, Icon, Input } from "../ui";
import { Ipucu, HataMetni } from "../tasarim";
import { fmtCur, parseMoney, yerelBugun } from "../../lib/utils";
import { TAHSILAT_GUNU_ETIKETI, TAHSILAT_GUNU_BELIRTILMEDI, tahsilatGunuDogrula, tahsilatGunuNedeni, tahsilatGunuAta, tahsilatGunuFormHatasi } from "../../lib/satisTahsilat";
import { secilebilirHesaplar, HESAP_TUR_AD } from "../../lib/kasa";

// Triyaj: kaydın para birimine uyan mevcut hesap (yoksa null). Uyumsuz hesap seçili gösterilmez, formda temizlenir.
export const uyumluHesapId = (hesaplar = [], id, pb = "TRY") => {
  if (id == null || id === "") return null;
  const h = hesaplar.find(x => String(x.id) === String(id));
  return h && (h.paraBirimi || "TRY") === (pb || "TRY") ? h.id : null;
};

// R3, C5 (1): kaydın para biriminde açık hesaplar; kapanmış mevcut hesap (aynı para biriminde) görünür kalır.
const hesapSecenekleri = (hesaplar, pb, mevcutId) => {
  const uygun = secilebilirHesaplar(hesaplar, pb);
  const mevcutUyumlu = uyumluHesapId(hesaplar, mevcutId, pb);
  const mevcut = mevcutUyumlu != null ? hesaplar.find(h => String(h.id) === String(mevcutUyumlu)) : null;
  return { uygun, secenekler: mevcut && !uygun.includes(mevcut) ? [...uygun, mevcut] : uygun };
};

const HesapSelect = ({ hesaplar, pb, value, onChange }) => {
  const { secenekler } = hesapSecenekleri(hesaplar, pb, value);
  return (
    <Select aria-label="Tahsilat hesabı" value={value ?? ""} onChange={e => onChange(e.target.value === "" ? null : secenekler.find(h => String(h.id) === e.target.value)?.id ?? null)}>
      <option value="">Hesap belirtilmedi</option>
      {secenekler.map(h => <option key={h.id} value={h.id}>{h.ad} ({HESAP_TUR_AD[h.tur] || h.tur}){h.kapali ? " · kapalı" : ""}</option>)}
    </Select>
  );
};

// Spec 0063 R14, R22: makina tahsilatı (ilk ödeme ve müşteri detayının ödeme satırları) satış tahsilatı motorunun kaynağı
// değildir; durum çağıranda kurulur. Tutarı sıfır satırda alan çizilmez. Hesapsız makina tahsilatı hiçbir iş listesinde
// görünmediği için ipucu "listede bekler" demez (R4, X3).
export const makinaTahsilatDurumu = (tutar, currency) => {
  const t = parseMoney(tutar);
  return { sor: t > 0, currency: currency || "TRY", tutar: t, listedeBekler: false };
};

// Form alanı. durum = tahsilatHesapDurumu(...) çıktısı (ya da makinaTahsilatDurumu); sorulmayan kayıtta seçici yerine
// nedeni yazar (R14, AC-22, AC-27). Spec 0063 R21: varsayilan(pb) verilince ve değer hiç seçilmemişken (undefined) uyumlu
// ön seçim yazılır; kullanıcının boşalttığı (null) değer yeniden doldurulmaz. testId satır başına alanı ayırır.
export const TahsilatHesapAlani = ({ durum, hesaplar = [], value, onChange, varsayilan = null, etiket = "Tahsilatın girdiği hesap", testId }) => {
  // Triyaj: para birimi değişince uyumsuz kalan mevcut hesap temizlenir (bakiyeye giremeyecek hesap seçili görünmesin).
  const uyumsuz = !!durum?.sor && value != null && uyumluHesapId(hesaplar, value, durum.currency) == null;
  useEffect(() => { if (uyumsuz) onChange(null); }, [uyumsuz]);
  const onSecimGerekli = !!durum?.sor && value === undefined && typeof varsayilan === "function";
  useEffect(() => { if (onSecimGerekli) onChange(uyumluHesapId(hesaplar, varsayilan(durum.currency), durum.currency)); }, [onSecimGerekli]);
  if (!durum?.sor) return durum?.neden ? <div data-testid="tahsilat-hesap-neden"><Ipucu>{durum.neden}</Ipucu></div> : null;
  const { uygun } = hesapSecenekleri(hesaplar, durum.currency, value);
  // Spec 0098 C12/2 (bilinen sınır, triyaj bulgu 4): bu ipucu Kasa'yı anar; spec 0098'den beri alanı Kasa'yı görmeyen kullanıcı da
  // görür. C8 metnin değişmemesini istediği için bilerek aynen bırakıldı; nötrleştirmek ayrı iştir.
  const bosMetni = durum.listedeBekler === false ? "seçilmezse hiçbir bakiyeye girmez." : "boş bırakılırsa Kasa'da hesabı belirtilmemiş tahsilatlar arasında bekler.";
  return (
    <div data-testid={testId}>
      <Field label={etiket}>
        <HesapSelect hesaplar={hesaplar} pb={durum.currency} value={value} onChange={onChange} />
        <Ipucu>{uygun.length ? `Tahsilat seçilen hesabın bakiyesine girer; ${bosMetni}` : `${durum.currency} para biriminde açık hesap yok; tahsilat ${durum.listedeBekler === false ? "hiçbir bakiyeye girmez" : "hesapsız kalır"}.`}</Ipucu>
      </Field>
    </div>
  );
};

// Spec 0063 R1, R13, R15, R23: ödeme satırı düzenleyicisinin (PaymentRowsEditor) yuvasına verilen satır hesabı. Tutarı
// sıfır satırda hiçbir şey çizmez (AC-23). onChange(i, hesapId) çağıranın durumunu işlevsel güncelleyiciyle yazmalıdır:
// aynı anda ön seçim yapan iki satır kapanıştaki diziyi paylaşırsa birbirini ezer.
export const OdemeSatiriHesap = ({ satir, i, currency, hesaplar, varsayilan, onChange }) => {
  const durum = makinaTahsilatDurumu(satir?.tutar, currency);
  if (!durum.sor) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <TahsilatHesapAlani testId={`odeme-satiri-hesap-${i + 1}`} durum={durum} hesaplar={hesaplar} value={satir.hesapId}
        varsayilan={varsayilan} onChange={v => onChange(i, v)} />
    </div>
  );
};

// Spec 0131 R8, R8/3, C2/2: tahsilat günü alanı (pencere, üç form ve Kasa aynı bileşeni çizer). Hesap alanından ve
// tahsilat hesabı izninden bağımsızdır. Boşken "gün belirtilmedi" ipucu (R3/2), ileri gün seçilemez (C4, AC-32), hata alanın
// altında (R2/2). Değer YYYY-AA-GG ya da "".
export const TahsilatGunuAlani = ({ value, onChange, hata = null, testId = "tahsilat-gunu", etiket = true, onBlur, onKeyDown }) => {
  const kutu = (
    <>
      <Input type="date" aria-label={TAHSILAT_GUNU_ETIKETI} max={yerelBugun()} value={value || ""} data-testid={testId} onChange={e => onChange(e.target.value)} onBlur={onBlur} onKeyDown={onKeyDown} />
      {!value && <Ipucu>{TAHSILAT_GUNU_BELIRTILMEDI}</Ipucu>}
      <HataMetni>{hata}</HataMetni>
    </>
  );
  return etiket ? <Field label={TAHSILAT_GUNU_ETIKETI}>{kutu}</Field> : <div>{kutu}</div>;
};

// Spec 0131 R8, R8/2, R8/3, R12/3: üç paylaşılan formun gün alanı. Ödendi işaretliyken çizilir; çek ve kartta alan yerine
// neden. Tahsilat hesabı iznine bağlı değildir (formlar bunu kasaHesaplari kapısının dışında çağırır). Hata canlıdır;
// kayıt düğmesi aynı denetimi (tahsilatGunuFormHatasi) çağırır.
export const FormTahsilatGunu = ({ form, setForm, testId = "form-tahsilat-gunu" }) => {
  if (!form?.odendi || form?.ucretsizMi) return null;
  const neden = tahsilatGunuNedeni(form);
  if (neden) return <div data-testid="tahsilat-gunu-neden" style={{ marginTop: 8 }}><Ipucu>{neden}</Ipucu></div>;
  return (
    <div style={{ marginTop: 8 }}>
      <TahsilatGunuAlani value={form.tahsilatTarihi} onChange={v => setForm(p => tahsilatGunuAta(p, v))}
        hata={tahsilatGunuFormHatasi(form, yerelBugun())} testId={testId} />
    </div>
  );
};

// Spec 0131 R10, R10/2, R10/3, R11/3, Karar 20: Kasa'nın satır içi gün girdisi. Kaydın bugün geçerli günüyle dolu gelir;
// yalnız geçerli ve farklı bir gün seçilince onYaz çağrılır (dokunulmayan alan yazılmaz). Boş ya da geçersiz değer yazılmaz.
// Triyaj: yazım odak kaybında ya da Enter'da yapılır, değişimde değil (tarih kutusuna klavyeyle yıl yazılırken "0202-05-03"
// gibi ara değerler de değişim olayı üretir ve geçerli bir gündür; değişimde yazmak onu kaydederdi).
export const KasaTahsilatGunu = ({ deger, onYaz, testId = "kasa-tahsilat-gunu" }) => {
  const [v, setV] = useState(deger || "");
  const [hata, setHata] = useState(null);
  const degis = (yeni) => { setV(yeni); setHata(yeni ? tahsilatGunuDogrula(yeni, yerelBugun()) : null); };
  const yaz = () => {
    const e = v ? tahsilatGunuDogrula(v, yerelBugun()) : null;
    setHata(e);
    if (!e && v && v !== (deger || "")) onYaz(v);
  };
  return <TahsilatGunuAlani value={v} onChange={degis} hata={hata} testId={testId} etiket={false}
    onBlur={yaz} onKeyDown={e => { if (e.key === "Enter") yaz(); }} />;
};

// "Ödendi" anahtarının penceresi (R2, Q6). Spec 0131 R2, R2/2, R4, Karar 21: tahsilat gününü de sorar (bugünle dolu gelir);
// onKaydet(hesapId | null, gun). "Hesapsız kaydet" null gönderir; iki düğme de aynı doğrulamadan geçer ve hatada pencere açık
// kalır. Çek ve kartta gün sorulmaz, nedeni yazılır (gunNedeni; onKaydet'e gün gitmez).
export const TahsilatHesapPenceresi = ({ baslik = "Tahsilat Bilgisi", currency = "TRY", tutar = 0, hesaplar = [], varsayilan = null, gunNedeni = null, onKaydet, onVazgec }) => {
  const [hesapId, setHesapId] = useState(varsayilan);
  const [gun, setGun] = useState(() => yerelBugun());
  const [hata, setHata] = useState(null);
  const kaydet = (h) => {
    if (gunNedeni) { onKaydet(h, undefined); return; }
    const e = tahsilatGunuDogrula(gun, yerelBugun());
    if (e) { setHata(e); return; }
    onKaydet(h, gun || "");
  };
  return (
    <Modal title={baslik} onClose={onVazgec}
      footer={(
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="ghost" onClick={onVazgec}>Vazgeç</Btn>
          <Btn variant="ghost" onClick={() => kaydet(null)}>Hesapsız kaydet</Btn>
          <Btn onClick={() => kaydet(hesapId)}><Icon name="check" size={14} /> Ödendi olarak kaydet</Btn>
        </div>
      )}>
      <div data-testid="tahsilat-hesap-penceresi" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 13, color: "var(--n700)" }}>Tahsil edilen tutar: <b>{fmtCur(tutar, currency)}</b></div>
        <Field label="Tahsilatın girdiği hesap">
          <HesapSelect hesaplar={hesaplar} pb={currency} value={hesapId} onChange={setHesapId} />
          <Ipucu>Hesap bilinmiyorsa boş bırakın; kayıt Kasa'da hesabı belirtilmemiş tahsilatlar arasında bekler.</Ipucu>
        </Field>
        {gunNedeni ? <div data-testid="tahsilat-gunu-neden"><Ipucu>{gunNedeni}</Ipucu></div>
          : <TahsilatGunuAlani value={gun} onChange={v => { setGun(v); setHata(null); }} hata={hata} testId="pencere-tahsilat-gunu" />}
      </div>
    </Modal>
  );
};

// Formdaki "Ödendi" kutusu işaretlenirken ön seçim (R2, Q8): kaydın kendi hesabı varsa dokunulmaz, yoksa aynı para
// birimindeki son tahsilatın hesabı. Kutu kaldırılınca hesap korunur (R9).
// Uyumsuz para birimindeki mevcut hesap korunmaz (triyaj).
export const tahsilatOnSecim = (p, isaretli, durum, hesapVarsayilan, hesaplar = []) => {
  if (!isaretli || !durum?.sor) return {};
  if (p.hesapId != null && uyumluHesapId(hesaplar, p.hesapId, durum.currency) != null) return {};
  const h = typeof hesapVarsayilan === "function" ? hesapVarsayilan(durum.currency) : null;
  return h != null ? { hesapId: h } : p.hesapId != null ? { hesapId: null } : {};
};
