// Spec 0114: ihraç kayıtlı teslim (KDV Kanunu 11/1-c). İmalatçı kendi ürettiği malı yurt içindeki ihracatçıya ihraç edilmek
// şartıyla satar; fatura KDV'li kesilir, KDV tahsil edilmez (vergi dairesi tecil eder). Satış tipi "Faturalı Yurtiçi" kalır,
// işaret ayrı alandır (R1, C1: SALE_TYPES dört değerde kalır). Kapı, seçim çevrimi, tek yazıcı, doğrulama ve bütün ekran
// metinleri burada; hesabın kendisi utils.js `satisKdvBolumu`'ndadır (C3, tek kapı). Gider motoruna bağlanmaz, React almaz (R5/2).
// Tevkifatla karıştırmayın (C4): tevkifatta KDV'nin bir kısmını alıcı beyan eder, burada KDV'nin tamamı ertelenir.
import { SALE_TYPES } from "./constants";
import { isFaturali, isYurtIci, normalizeSaleType, satisKdvBolumu, satisUcretsizMi } from "./utils";
import { TEVKIFAT_ALANLARI } from "./satisTevkifat";

const FY = "Faturalı Yurtiçi";
export const IHRAC_SECENEK = "İhraç Kayıtlı";
export const IHRAC_ALANI = "ihracKayitli";

// R6: işaret ancak satış tipi faturalı yurtiçi iken anlamlıdır (utils.js `ihracKayitliEtkinMi` ile aynı ifade, test sabitler).
export const ihracKayitliSecilebilirMi = (saleType) => isFaturali(saleType) && isYurtIci(saleType);
const tipOf = (kayit) => kayit?.faturaTipi ?? kayit?.faturali;
const etkinMi = (kayit, saleType = tipOf(kayit)) => kayit?.ihracKayitli === true && ihracKayitliSecilebilirMi(saleType);

// R3, R4: seçicinin seçenekleri. Servis formu `ihracDahil: false` ile dört seçenek görür.
export const satisTipiSecenekleri = (ihracDahil = true) => (ihracDahil ? [...SALE_TYPES, IHRAC_SECENEK] : [...SALE_TYPES]);

// R5: kayıttan ya da form durumundan beş değerli seçim. Tip `faturaTipi` (Extra Kalıp, yedek parça, servis) ya da `faturali`
// (makina); boş tip faturalı yurtiçidir (normalizeSaleType, plan Ö-10).
export const satisTipiSecimi = (kayit) => (etkinMi(kayit) ? IHRAC_SECENEK : normalizeSaleType(tipOf(kayit)));

// R5, R7/2 (1. katman), R22/2: seçimden form anahtarları. Yalnız satış tipi ve işaret; "İhraç Kayıtlı" seçilince formun üç
// tevkifat anahtarı da temizlenir (pasif kutu kullanıcıyı kilitlemesin, AC-56). Formun kendi yan etkileri (müşteri formunun
// faturaBedeli temizliği) formda kalır. `alan` formun tip anahtarıdır (plan Ö-3).
export const satisTipiUygula = (secim, alan = "faturaTipi") => (secim === IHRAC_SECENEK
  ? { [alan]: FY, ihracKayitli: true, tevkifatli: false, tevkifatPay: null, tevkifatPayda: null }
  : { [alan]: secim, ihracKayitli: false });

// R6/2, C12: alanın TEK yazıcısı. Kayıttan önce siler, yalnız kapı açık, form işaretli ve satış ücretsiz değilken `true` yazar
// (kapalı değer yazılmaz, C5). İşaret açıkken tevkifat alanları da silinir (R7/2, 2. katman). Ücretsiz yedek parçada fatura yoktur
// ve işaret silinir (R8, plan Ö-4: ucretsizUygula C12 gereği alanı silemez, bu yüzden kural burada). Yedek parça zincirinde
// ucretsizUygula'dan ÖNCE çağrılır (0095'in son adım kuralı korunur).
export const ihracKayitliUygula = (rec, form, saleType) => {
  const r = { ...rec };
  delete r.ihracKayitli;
  if (!form?.ihracKayitli || form?.ucretsizMi || !ihracKayitliSecilebilirMi(saleType)) return r;
  for (const a of TEVKIFAT_ALANLARI) delete r[a];
  return { ...r, ihracKayitli: true };
};

// AC-7, AC-64: alan alan kurulan düzenleme formlarına (toplu yedek parça, Extra Kalıp) işaret kayıttan taşınır; taşınmazsa
// tek yazıcı işareti siler. Kaydı yayarak açılan formlar (makina, tek yedek parça) işareti zaten taşır.
export const ihracKayitliFormu = (kayit) => (etkinMi(kayit) ? { ihracKayitli: true } : {});

// R12, R12/2: işaret ve tevkifat aynı kayıtta bulunamaz. Form bu durumu üretemez (satisTipiUygula temizler); ret formdan gelmeyen
// veri bir kurucudan geçerse devreye girer (plan Ö-5). Okumada işaret zaten kazanır (utils.js). Dönüş: hata metni | null.
export const IHRAC_TEVKIFAT_HATASI = "İhraç kayıtlı teslimde tevkifat uygulanmaz; kayıtta ikisi birlikte bulunamaz.";
export const ihracKayitliDogrula = (form, saleType) =>
  (form?.ihracKayitli === true && form?.tevkifatli && ihracKayitliSecilebilirMi(saleType) ? IHRAC_TEVKIFAT_HATASI : null);

// ── Ekran metinleri (R22–R28, plan Ö-8) ─────────────────────────────────────────────────────────────────────────────
export const IHRAC_ACIKLAMA = "Fatura KDV'li kesilir ama KDV müşteriden tahsil edilmez. Yalnız kendi ürettiğimiz malı ihracatçı bir firmaya, ihraç edilmek şartıyla sattığımızda kullanılır.";
// R23/2: faturaya yazılacak zorunlu ibare (spec'te sabitlendi, Karar 26).
export const IHRAC_IBARE = "3065 sayılı KDV Kanunu'nun 11/1-c maddesi hükümlerine göre ihraç edilmek şartıyla teslim edildiğinden KDV tahsil edilmemiştir.";
export const IHRAC_FATURA_NOTU = "Uygulama yurt içi fatura basmaz; bu ibareyi e-fatura yazılımında faturanın açıklamasına ekleyin.";
export const IHRAC_KOPYALA = "Kopyala";
export const IHRAC_KOPYALANDI = "İbare kopyalandı.";
export const IHRAC_KOPYALANAMADI = "Kopyalanamadı, metni seçip kopyalayın.";
export const IHRAC_PARCA_SINIRI = "Yalnız kendi ürettiğimiz parçada kullanılır; hazır alıp sattığımız parçada kullanılmaz. Bu kararı uygulama veremez, siz verirsiniz.";
// R7/3, AC-9: pasif tevkifat kutusunun nedeni.
export const IHRAC_TEVKIFAT_NEDENI = "İhraç kayıtlı teslimde tevkifat uygulanmaz.";
// R25: formun KDV kutusundaki beş satırın etiketleri.
export const IHRAC_OZET_ETIKETLERI = { matrah: "Matrah", toplamKdv: "Faturadaki toplam KDV", ertelenenKdv: "Ertelenen KDV",
  tahsilKdv: "Tahsil edilecek KDV", faturaToplami: "Tahsil edilecek fatura toplamı" };
// R26, Karar 11: rozet.
export const ihracKayitliRozeti = (ertelenenMetni) => `İHRAÇ KAYITLI · tecil edilen KDV ${ertelenenMetni}`;
// R27: müşteri detayının Kalan Borç kartı (yalnız makina kaydı, R27/2).
export const ihracKayitliBorcMetni = (ertelenenMetni) => `İhraç kayıtlı fatura: ${ertelenenMetni} KDV tahsil edilmez, borca girmez.`;
// Triyaj 2 (plan turu Karar 42, R9): müşteri detayının "KDV Miktarı" hücresinde tahsil edilecek KDV sıfırdır; faturadaki ham
// KDV alt satırda görünür kalır (0079'un "Toplam … · alıcı beyan eder …" emsali).
export const ihracKdvHucreMetni = (hamKdvMetni) => `Faturada ${hamKdvMetni} · ertelenir`;
// R18: KDV Karşılaştırması kartının bilgi satırı (Finans ve Giderler).
export const IHRAC_KART_ETIKETI = "İhraç kayıtlı teslimde ertelenen KDV";
export const IHRAC_KART_NOTU = "Bilgi: farka eklenmez. Bu KDV müşteriden tahsil edilmez, vergi dairesince tecil edilir.";
// R29–R30/2, R33/2: aylık rapor kutusu ve iki dipnot.
export const IHRAC_RAPOR_BASLIK = "İHRAÇ KAYITLI TESLİMLER";
export const ihracRaporAdet = (adet) => `${adet} teslim`;
export const IHRAC_RAPOR_SATIRLARI = { matrah: "Matrah (KDV hariç)", toplamKdv: "Faturadaki toplam KDV", ertelenenKdv: "Ertelenen KDV",
  faturaToplami: "Tahsil edilecek fatura toplamı" };
export const IHRAC_RAPOR_DIPNOTU = "Ertelenen KDV bilgi amaçlıdır; KDV özetine ve açık alacağa girmez. Tahsil edilecek fatura toplamı matraha eşittir, çünkü KDV tahsil edilmez. Fatura tipi kırılımındaki \"Faturalı Yurtiçi\" satırının KDV'si ertelenen KDV'yi içermez.";
export const IHRAC_KDV_OZETI_DIPNOTU = "İhraç kayıtlı teslim var: yukarıdaki KDV rakamları ertelenen KDV'yi içermez; tutarı için \"İhraç Kayıtlı Teslimler\" kutusuna bakın.";
// R34: dışa aktarma sütunları (müşteri, Extra Kalıp, yedek parça raporlarının sonunda; işaretsizde boş).
export const IHRAC_EXPORT_HEAD = ["İhraç Kayıtlı", "Ertelenen KDV"];
export const ihracKayitliExportHucreleri = (saleType, bedel, tarih, kdvRates, kayit) => {
  const b = satisKdvBolumu(saleType, bedel, tarih, kdvRates, kayit);
  return b.ihracKayitli ? ["Evet", b.ertelenenKdv] : ["", ""];
};
// R8/2, AC-66: ücretsiz Extra Kalıp rozet taşımaz, rapor kutusuna matrah katmaz (aylikRapor.js zaten atlar).
export const ihracRozetGosterilirMi = (kayit, saleType) => etkinMi(kayit, saleType) && !satisUcretsizMi(kayit);
