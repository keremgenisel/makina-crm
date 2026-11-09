import { useState, useMemo } from "react";
import { logAction } from "../lib/audit";
import { Field, Input, Btn, Modal } from "./ui";
import { HataMetni, Ipucu, BolumBasligi } from "./tasarim";
import { malzemeFormu, malzemeDogrula, fiyatGecmisiYaz, fiyatEtkisi, kurOnerisi, dovizMi } from "../lib/malzeme";
import { FiyatAlanlari } from "./MalzemeManager";
import { MalzemeEtkiOzeti } from "./MalzemeEtkiOzeti";

// Spec 0132 R5, R6, R6/2, R17 (AC-9, AC-10, AC-21–AC-23, AC-48–AC-50, AC-79, AC-80, AC-95): fiyat kümesinin tarihli güncellemesi.
// Etki önizlemesi uygulamadan önce bağlı parçalardan hesaplanır; yazım yalnız malzemeye (parçaya dokunulmaz, R16). Panelin
// `ayar:malzemeler` kilidi altında açılır (Karar 31); parça panelinin kilidine bakmaz çünkü parçaya yazmaz.
export const FIYAT_PENCERE_BASLIGI = "Malzeme Fiyatını Güncelle";
export const GECERLILIK_IPUCU = "Bu tarihten önceki tarihli maliyet sorguları eski fiyatla kalır; bugünden sonraki tarih seçilemez.";

export const MalzemeFiyatPenceresi = ({ malzeme, malzemeler = [], setMalzemeler, parts = [], rates = null, ratesErr = false, bugun, onClose, fiyatAyarlari = null, showToast = () => {}, serverPermissions = null }) => {
  const [form, setForm] = useState(() => {
    const f = malzemeFormu(malzeme);
    // R5, AC-9, AC-10 (triyaj bulgu 1, Karar 41): kur alanı KAYITLI kurla açılır; kuru değiştirmek bir zamdır ve yalnız kullanıcı
    // yazınca ya da "Günün kurunu kullan"a basınca olur. Kayıtlı kur yoksa günün kuru öneri olarak gelir; o da bilinmiyorsa boş.
    if (!dovizMi(f.paraBirimi) || String(f.kur || "").trim()) return f;
    const o = kurOnerisi(f.paraBirimi, rates, ratesErr);
    return { ...f, kur: o.deger ? String(o.deger).replace(".", ",") : "" };
  });
  const [tarih, setTarih] = useState(bugun || "");
  const [hatalar, setHatalar] = useState({});
  const set = (alan, v) => setForm(f => ({ ...f, [alan]: v }));
  const v = useMemo(() => malzemeDogrula(form, malzemeler, malzeme.id), [form, malzemeler, malzeme.id]);
  // `v` forma bağlı önbellekte; `yeni` ve etki ondan türer (eski hâldeki satır içi eslint susturması kalktı, triyaj bulgu 9).
  const yeni = useMemo(() => (v.gecerli ? tanimsizSiz({ ...malzeme, ...fiyatAlanlari(v.kayit) }) : null), [v, malzeme]);
  const etki = useMemo(() => (yeni ? fiyatEtkisi(malzeme, yeni, parts, malzemeler, { fiyatAyarlari }) : null), [yeni, malzeme, parts, malzemeler, fiyatAyarlari]);

  const kaydet = () => {
    if (!v.gecerli) { setHatalar(v.hatalar); return; }
    const r = fiyatGecmisiYaz(malzeme, yeni, { tarih, bugun });
    if (r.hata) { setHatalar({ tarih: r.hata }); return; }
    const kayit = { ...yeni, ...(r.gecmis.length ? { fiyatGecmisi: r.gecmis } : {}) };
    if (!r.gecmis.length) delete kayit.fiyatGecmisi;
    setMalzemeler(p => p.map(m => (String(m.id) === String(malzeme.id) ? kayit : m)));
    logAction({ serverPermissions, action: "fiyat_guncellendi", entity: "malzeme", entityId: malzeme.id, entityName: malzeme.ad, detail: { gecerli: tarih, degisen: etki?.degisen ?? 0 } });
    onClose();
    showToast(etki?.degisen ? `Fiyat güncellendi; ${etki.degisen} parçanın maliyeti yeni fiyatla okunuyor.` : "Fiyat güncellendi.");
  };

  return (
    <Modal title={FIYAT_PENCERE_BASLIGI} onClose={onClose} wide
      footer={<><Btn variant="ghost" onClick={onClose}>Vazgeç</Btn><Btn onClick={kaydet}>Fiyatı Kaydet</Btn></>}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{malzeme.ad}{malzeme.alasim ? ` · ${malzeme.alasim}` : ""}</div>
      <FiyatAlanlari form={form} set={set} hatalar={hatalar} rates={rates} ratesErr={ratesErr} />
      <Field label="Geçerlilik tarihi">
        <Input type="date" value={tarih} max={bugun} onChange={e => setTarih(e.target.value)} aria-label="Geçerlilik tarihi" />
        <HataMetni>{hatalar.tarih}</HataMetni>
        <Ipucu>{GECERLILIK_IPUCU}</Ipucu>
      </Field>
      <BolumBasligi ust>Etkisi</BolumBasligi>
      {!etki ? <Ipucu>Alanlardaki hata düzelince etki burada görünür.</Ipucu> : (
        <MalzemeEtkiOzeti etki={etki} />
      )}
    </Modal>
  );
};

// Doğrulanmış kayıttan yalnız fiyat kümesinin alanları (öteki kart alanları pencerede değişmez). Boş alan anahtar taşımaz.
const FIYAT_ANAHTARLARI = ["kiloFiyati", "paraBirimi", "kur", "bantlar", "boyFiyati"];
const fiyatAlanlari = (k) => {
  const o = {};
  for (const a of FIYAT_ANAHTARLARI) o[a] = k[a];
  return o;
};
// AC-61: tanımsız (boşaltılmış) alan kayıtta anahtar olarak kalmaz.
const tanimsizSiz = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
