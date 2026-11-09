// Spec 0133: parçanın satış fiyatının TEK okuma yolu (R10, R10/2). Saf modül: React almaz, saat okumaz (AC-51).
// Satış ekranları fiyatı yalnız buradan okur; maliyeti ve maliyet motorunun adını hiç okumaz (C2/2, 0087 AC-6'nın dosya listesi).
// Maliyete bağlı parçanın TL fiyatı okuma anında türer: bugünkü maliyet (tarih verilmez, R2/2) × kâr katı, kuruşa bir kez
// yuvarlanır, isteğe bağlı yukarı yuvarlama. Hiçbir yere kaydedilmez (C1). Elle sabit parçada ve dövizde değer bugünkü gibi
// `partFiyatForCurrency`'den gelir, birebir (C4). C3, C3/2: kat ve yuvarlama çarpımı kaynakta YALNIZ bu dosyadadır.
import { partFiyatForCurrency } from "./utils";
import { parcaMaliyetKurus, setKatalogu } from "./urunAgaci";
import { malzemeKatalogu, BELIRSIZ_DESEN, BELIRSIZ_HATASI } from "./malzeme";
import { tutarCoz } from "./gider";

// ── Kip (R1, R1/2, AC-94) ───────────────────────────────────────────────────────────────────────────────────────────────
export const KIP_MALIYET = "maliyet";
export const KIP_ELLE = "elle";
export const KIP_ADLARI = { [KIP_MALIYET]: "Maliyete bağlı", [KIP_ELLE]: "Elle sabit" };
// Tanınmayan ya da boş değer elle sabittir; kalıcı alan yalnız "maliyet" değerini taşır.
export const fiyatKipiOf = (p) => (p?.fiyatKipi === KIP_MALIYET ? KIP_MALIYET : KIP_ELLE);
export const maliyeteBagliMi = (p) => fiyatKipiOf(p) === KIP_MALIYET;

// ── Kâr katı (R6, R7, R7/2, AC-6, AC-60–AC-64, Karar 36) ───────────────────────────────────────────────────────────────
export const KAT_UST = 100;
export const KAT_ONDALIK = 3;
export const ONERILEN_KAT = 2.77; // R6/2: yalnız öneri; ayar boş doğar (AC-66)
export const KAT_SAYI_HATASI = "Kâr katı sayı olmalı.";
export const KAT_POZITIF_HATASI = "Kâr katı sıfırdan büyük olmalı.";
export const KAT_UST_HATASI = `Kâr katı en çok ${KAT_UST} olabilir.`;
// Belirsiz sayının metni 0132'nin tek sabitidir (`malzeme.BELIRSIZ_HATASI`). Modül düzeyinde takma adla dışa VERİLMEZ: malzeme.js bu
// modülü içe aldığı için (döngü) yükleme sırasına göre takma ad `undefined` kalıyor ve belirsiz kat sessizce kabul ediliyordu; sabit
// çağrı anında okunur.
export const ZARAR_UYARISI = "Kâr katı 1'den küçük: türetilen fiyat maliyetin altında kalır (zararına satış).";
// TEK doğrulayıcı: varsayılan kat (Fiyat Ayarları) ve parçanın katı (parça kartı) aynı fonksiyonu çağırır (AC-62). Boş serbest.
// Fazla ondalık reddedilmez, üç ondalığa en yakına yuvarlanır (AC-64). Birden küçük kat geçerlidir, `zarar` işaretlidir (R7).
export const katDogrula = (ham) => {
  if (ham == null || String(ham).trim() === "") return { bos: true, deger: null, hata: null, zarar: false };
  if (typeof ham === "string" && BELIRSIZ_DESEN.test(ham)) return { bos: false, deger: null, hata: BELIRSIZ_HATASI, zarar: false };
  const r = tutarCoz(ham);
  if (r.gecersiz || r.bos) return { bos: false, deger: null, hata: KAT_SAYI_HATASI, zarar: false };
  if (!(r.deger > 0)) return { bos: false, deger: null, hata: KAT_POZITIF_HATASI, zarar: false };
  if (r.deger > KAT_UST) return { bos: false, deger: null, hata: KAT_UST_HATASI, zarar: false };
  const deger = Math.round(r.deger * 10 ** KAT_ONDALIK) / 10 ** KAT_ONDALIK;
  return { bos: false, deger, hata: null, zarar: deger < 1 };
};
export const karKatiOf = (p) => { const d = katDogrula(p?.karKati); return d.hata ? null : d.deger; };
const katMetinHane = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: KAT_ONDALIK, useGrouping: false });
export const katMetni = (k) => (k == null || k === "" ? "" : katMetinHane.format(Number(k)));

// ── Ayar (R6, R8, Karar 33) ─────────────────────────────────────────────────────────────────────────────────────────────
export const YUVARLAMA_SECENEKLERI = [
  { value: "", label: "Kapalı" },
  { value: "yukari10", label: "Yukarı 10 TL" },
  { value: "yukari50", label: "Yukarı 50 TL" },
];
const YUVARLAMA_ADIMI = { yukari10: 10, yukari50: 50 };
// `appSettings.fiyatAyarlari` = { varsayilanKat, yuvarlama }; yoksa kat boş, yuvarlama kapalı (AC-15, AC-66).
export const fiyatAyariOf = (fa) => {
  const kat = katDogrula(fa?.varsayilanKat);
  return { varsayilanKat: kat.hata ? null : kat.deger, yuvarlama: YUVARLAMA_ADIMI[fa?.yuvarlama] ? fa.yuvarlama : "" };
};

// ── Bağlam (R10/3, Karar 32, AC-55) ─────────────────────────────────────────────────────────────────────────────────────
// Ekran bağlamı BİR KEZ kurar (useMemo); formlar yalnız bağlamı alır. `fiyatAyarlari` uygulama ayarının alt nesnesi.
export const fiyatBaglamiKur = ({ parts = [], malzemeler = [], fiyatAyarlari = null } = {}) => ({
  setKat: setKatalogu(parts), malzemeKat: malzemeKatalogu(malzemeler), ayar: fiyatAyariOf(fiyatAyarlari),
});

// ── Nedenler (R11, R11/2, AC-85: tek sabit kümesi) ──────────────────────────────────────────────────────────────────────
export const NEDEN_MALIYET_YOK = "Maliyeti girilmediği için fiyat türetilemedi.";
export const NEDEN_KAT_YOK = "Varsayılan kâr katı girilmediği için fiyat türetilemedi (Ayarlar › Uygulama › Fiyat Ayarları).";
export const DOVIZ_NOTU = "Dolar ve euro fiyatı maliyetten türetilmez, elle girilir: maliyet TL'dir ve bir parçanın tek bir kuru yoktur.";
export const TURETILEMEDI = "fiyat türetilemedi";

// ── Türetme (R2, R2/2, R2/3, R8, R9, AC-3, AC-10–AC-13, AC-65, AC-68, AC-93) ───────────────────────────────────────────
// Dönüş { fiyatK (kuruş | null), neden, kat }. Maliyet tarih verilmeden okunur (bugünkü). Çarpım kuruşa bir kez yuvarlanır;
// yuvarlama yukarı ve yalnız türetilmiş fiyata.
export const turetilmisFiyat = (p, baglam) => {
  const maliyetK = parcaMaliyetKurus(p, undefined, baglam?.setKat, baglam?.malzemeKat);
  const kat = karKatiOf(p) ?? baglam?.ayar?.varsayilanKat ?? null;
  if (maliyetK == null) return { fiyatK: null, neden: NEDEN_MALIYET_YOK, kat };
  if (kat == null) return { fiyatK: null, neden: NEDEN_KAT_YOK, kat: null };
  // Triyaj (bulgu 6): çarpım önce altı haneye sabitlenir, sonra yarım yukarı yuvarlanır (7,50 TL × 2,002 = 15,015 → 15,02;
  // kayan noktada 1501.4999… çıkıp 15,01 veriyordu; 0134'ün `toFixed` dersi).
  let fiyatK = Math.round(Number((maliyetK * kat).toFixed(6)));
  const adim = YUVARLAMA_ADIMI[baglam?.ayar?.yuvarlama];
  if (adim) fiyatK = Math.ceil(fiyatK / (adim * 100)) * adim * 100;
  return { fiyatK, neden: null, kat };
};

// TEK okuma yolu (AC-55). Dönüş { deger, kip, neden, turetilmis }: `deger` elle sabitte ve dövizde bugünkü ham değerdir
// (`partFiyatForCurrency`, birebir); maliyete bağlı parçanın TL fiyatında sayı (TL, kuruşlu) ya da "" (neden dolu).
export const parcaSatisFiyati = (p, pb = "TRY", baglam = null) => {
  const kip = fiyatKipiOf(p);
  if (kip !== KIP_MALIYET || pb !== "TRY") return { deger: partFiyatForCurrency(p, pb), kip, neden: null, turetilmis: false };
  const t = turetilmisFiyat(p, baglam);
  return { deger: t.fiyatK == null ? "" : t.fiyatK / 100, kip, neden: t.neden, turetilmis: true, kat: t.kat };
};
// Karar 29: tam liralık fiyat girdisi (`MoneyInput`) olan formlar (servis sepeti, yedek parça satırı) için değer. Türetilmiş fiyat
// yukarı tam liraya yuvarlanır; elle sabit ve döviz değeri birebir aynı (kıyas).
export const formSatisFiyati = (p, pb = "TRY", baglam = null) => {
  const r = parcaSatisFiyati(p, pb, baglam);
  return r.turetilmis && r.deger !== "" ? Math.ceil(Number(r.deger.toFixed(2))) : r.deger;
};
// Setin "TL fiyatı toplamına eşitle" okuyucusu (Karar 30): bileşenin yürürlükteki TL fiyatı (`urunAgaci.setOzeti`'ye verilir).
export const setFiyatOkuyucu = (baglam) => (b) => parcaSatisFiyati(b, "TRY", baglam).deger;

// ── Gösterim (R2/3, AC-68, AC-69: tek yardımcı) ─────────────────────────────────────────────────────────────────────────
const ikiHane = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const turetilmisFiyatSayisi = (deger) => (deger === "" || deger == null ? "" : ikiHane.format(Number(deger)));
export const turetilmisFiyatMetni = (deger) => (deger === "" || deger == null ? "—" : `${ikiHane.format(Number(deger))} ₺`);

// ── Toplu kip (R4, R4/2, AC-29, AC-49, AC-77) ──────────────────────────────────────────────────────────────────────────
// Kipi yazan TEK yazıcı: "maliyet" değerinde alanı yazar, elle sabitte alanı SİLER (R1/2, AC-80).
// Triyaj (bulgu 5): elle sabite geçerken parçanın katı da silinir (R13/2; parça kartının kayıt fonksiyonuyla aynı kural, yoksa toplu
// yoldan geri dönülünce eski kat sessizce geri gelirdi). Maliyete bağlıya geçerken kayıttaki kat korunur.
export const kipYaz = (p, kip) => {
  const { fiyatKipi: _k, ...geri } = p;
  if (kip === KIP_MALIYET) return { ...geri, fiyatKipi: KIP_MALIYET };
  const { karKati: _kat, ...elle } = geri;
  return elle;
};
export const topluKipOzeti = (liste = [], kip, baglam) => {
  const hedef = (liste || []).filter(p => p && !p.deletedAt);
  const degisecek = hedef.filter(p => fiyatKipiOf(p) !== kip);
  const maliyetsiz = kip === KIP_MALIYET ? degisecek.filter(p => turetilmisFiyat(p, baglam).neden === NEDEN_MALIYET_YOK).length : 0;
  // Triyaj (bulgu 1): kendi katı da varsayılan kat da olmayan parça; maliyete bağlanınca fiyatı boşalır.
  const katsiz = kip === KIP_MALIYET ? degisecek.filter(p => karKatiOf(p) == null && baglam?.ayar?.varsayilanKat == null).length : 0;
  return { toplam: hedef.length, degisecek: degisecek.length, maliyetsiz, katsiz, idler: hedef.map(p => String(p.id)) };
};
export const topluKipMetni = (n, kip) => `Listedeki ${n} parçayı ${kip === KIP_MALIYET ? "maliyete bağla" : "elle sabite al"}`;
export const maliyetsizUyariMetni = (n) => `${n} parçanın maliyeti girilmemiş; maliyete bağlanınca fiyatları boş görünür ve nedeni yazar.`;
// Triyaj (bulgu 1): varsayılan kat boşken toplu "maliyete bağla" pasif ve nedenli (ayar boş doğar, R6/2; ilk gün bütün fiyatlar
// boşalırdı). Kendi katı olan parça tek tek, kartından bağlanabilir.
export const TOPLU_KAT_YOK_NEDENI = "Varsayılan kâr katı girilmeden toplu bağlama yapılamaz (Ayarlar › Uygulama › Fiyat Ayarları); kendi katı olan parça kartından bağlanabilir.";
export const katsizUyariMetni = (n) => `${n} parçanın kendi katı yok ve varsayılan kat girilmemiş; fiyatları boş görünür.`;
export const farkMetni = (elle, turetilen) => `Elle girilen ${elle} ₺, türetilen ${turetilen}.`;
