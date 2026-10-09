// Spec 0079: tevkifatlı satış faturası (gelir tarafı). Kutunun kapısı, doğrulama, alan yazımı, kart tabanı ve ekran metinleri tek
// yerde. Hesabın kendisi utils.js'tedir (satisKdvBolumu / tahsilEdilecekKdv / tahsilKdvOrani); bu modül gider motoruna bağlanmaz
// (gelir motorları gider.js'i içe almaz, R4). Alan adları 0075'in gider tarafıyla bilerek aynıdır (R34): tevkifatli, tevkifatPay,
// tevkifatPayda. Gider tarafıyla karıştırmayın: orada tevkifatı biz beyan ederiz (KDV2), burada alıcı beyan eder.
import { TEVKIFAT_ORANLARI } from "./constants";
import { isFaturali, isYurtIci, satisTevkifati, satisKdvBolumu, parseMoney, tahsilKdvOrani } from "./utils";
import { kartYansitmaAyrim } from "./krediKarti";

export { TEVKIFAT_ORANLARI };
export const TEVKIFAT_ALANLARI = ["tevkifatli", "tevkifatPay", "tevkifatPayda"];
export const satisTevkifatOranEtiketi = (o) => (o && o.pay && o.payda ? `${o.pay}/${o.payda}` : "");

// R2: kutu yalnız faturalı yurtiçide çizilir. Kapı normalleştirilmiş yardımcı çiftidir, dize karşılaştırması DEĞİL: alanı hiç
// olmayan kayıt (normalizeSaleType(undefined) = "Faturalı Yurtiçi") ve eski biçimli değerler ("Faturalı Yurt İçi", düz
// "Faturalı") da doğru sınıflanır. Dizeyle yazılsaydı kutu eski kayıtta çıkmaz, R5'in temizliği işaretlenen tevkifatı silerdi.
export const satisTevkifatSecilebilirMi = (saleType) => isFaturali(saleType) && isYurtIci(saleType);

// R6: oran seçilmemiş, payı sıfır ya da paydadan büyük kayıt reddedilir. Kutu kapalıysa ya da kapı kapalıysa hata yok (alanlar
// R5 ile silinecek). Dönüş: hata metni | null.
export const TEVKIFAT_ORAN_SECILMEDI = "Tevkifat oranını seçin.";
export const TEVKIFAT_ORAN_GECERSIZ = "Tevkifat oranı geçersiz: pay sıfırdan büyük olmalı ve paydayı aşmamalı.";
export const satisTevkifatDogrula = (form, saleType) => {
  if (!form?.tevkifatli || !satisTevkifatSecilebilirMi(saleType)) return null;
  const bos = (v) => v == null || v === "";
  if (bos(form.tevkifatPay) || bos(form.tevkifatPayda)) return TEVKIFAT_ORAN_SECILMEDI;
  return satisTevkifati(form) ? null : TEVKIFAT_ORAN_GECERSIZ;
};

// R5, R7: alanlar kayda yazılır ya da SİLİNİR (false/null yazılmaz: blob'da alan yokken false göndermek sunucu karşılaştırmasında
// hayalet fark üretir). Çok satırlı formda (Extra Kalıp, yedek parça) her satır aynı ayarı alır. Formun geçici `_kartYeniTaban`
// işareti de burada düşer.
export const satisTevkifatUygula = (rec, form, saleType) => {
  const r = { ...rec };
  for (const a of TEVKIFAT_ALANLARI) delete r[a];
  delete r._kartYeniTaban;
  const t = satisTevkifatSecilebilirMi(saleType) && form?.tevkifatli ? satisTevkifati(form) : null;
  return t ? { ...r, tevkifatli: true, tevkifatPay: t.pay, tevkifatPayda: t.payda } : r;
};

// R13: kredi kartı komisyonu tabanı. Yeni kayıtta ve kart bilgisi yeniden girildiğinde (formda "yeni tabanla hesapla") taban
// formun tevkifatıdır; kart komisyonu kayıtlı bir kayıtta ise anlık görüntü HANGİ tevkifatla hesaplandıysa o kalır (0002'nin
// dondurulmuş anlık görüntüsü geriye dönük oynamaz). Anlık görüntü tabanını `tevkifatTaban` ("5/10") alanında taşır; alan
// yoksa taban tevkifatsızdır (bu spec'ten önceki bütün anlık görüntüler). Dönüş: kart hesabına verilecek "kayıt" (yalnız
// tevkifat alanları okunur).
const tabanKaydi = (kk) => {
  const m = /^(\d+)\/(\d+)$/.exec(String(kk?.tevkifatTaban || ""));
  return m ? { tevkifatli: true, tevkifatPay: Number(m[1]), tevkifatPayda: Number(m[2]) } : null;
};
// Düzenleme formu kaydın kendisinden açılır ve kayıtlı anlık görüntüyü (kartKomisyonu) taşır; "önceki" varsayılan olarak formdur.
// Yeni taban (form) fatura tipi kapısından geçer (triyaj bulgu 1): kapı kapalıyken form tevkifat alanlarını hâlâ taşıyabilir
// (R5 temizliği yalnız kayda uygulanır), taban ve anlık görüntü işareti o durumda tevkifatsızdır. Tip formun faturaTipi'si
// (servis, Extra Kalıp, yedek parça) ya da faturali'si (makina).
export const kartTabanKaydi = (form, onceki = form) => {
  if (onceki?.kartKomisyonu && !form?._kartYeniTaban) return tabanKaydi(onceki.kartKomisyonu);
  return satisTevkifatSecilebilirMi(form?.faturaTipi ?? form?.faturali) ? form : null;
};
export const kartTabanIsaretle = (kartKomisyonu, tabanKayit) => {
  const t = satisTevkifati(tabanKayit);
  return kartKomisyonu && t ? { ...kartKomisyonu, tevkifatTaban: satisTevkifatOranEtiketi(t) } : kartKomisyonu;
};
// Formdaki tevkifat (kapıdan geçmiş) ile kayıtlı anlık görüntünün tabanı farklı mı (R13/2 uyarısının koşulu).
const etkinEtiket = (kayit, saleType) => (satisTevkifatSecilebilirMi(saleType) ? satisTevkifatOranEtiketi(satisTevkifati(kayit)) : "");
export const kartTabaniEskiMi = (form, saleType, onceki = form) => !!onceki?.kartKomisyonu && !form?._kartYeniTaban
  && form?.yontem === "Kredi Kartı" && etkinEtiket(form, saleType) !== satisTevkifatOranEtiketi(satisTevkifati(tabanKaydi(onceki.kartKomisyonu)));
// Makina satışı: tevkifat müşteri kaydında, kart anlık görüntüleri tahsilatlarda. Eski tabanlı kartlı tahsilat var mı.
export const makinaKartTabaniEskiMi = (form, payments = []) => {
  const istenen = etkinEtiket(form, form?.faturali);
  return (payments || []).some(p => p && !p.deletedAt && p.customerId === form?.id && p.yontem === "Kredi Kartı" && p.kartKomisyonu
    && satisTevkifatOranEtiketi(satisTevkifati(tabanKaydi(p.kartKomisyonu))) !== istenen);
};

// R24: üç kalıcı not ve koşullu dördüncü (kart) uyarısı. Her biri tek sabit.
export const SATIS_TEVKIFAT_NOTU_TAHSIL = "Tevkifat müşteriden tahsil edilecek KDV'yi düşürür; düşülen kısmı alıcı kendisi vergi dairesine beyan eder ve öder.";
export const SATIS_TEVKIFAT_NOTU_CIRO = "Satış bedeli ve ciro değişmez; tevkifat yalnız KDV'nin bölünmesidir.";
export const SATIS_TEVKIFAT_NOTU_SINIR = "Tevkifat alt sınırı (2026'da KDV dâhil 12.000 TL) satıcı olarak bizim sorumluluğumuzdadır. Uygulama bu sınırı denetlemez; kararı muhasebeniz verir.";
export const SATIS_TEVKIFAT_KART_UYARISI = "Kredi kartı komisyonu tevkifattan önceki tabanla hesaplanmış ve kayıtlı haliyle kalır. Gerekiyorsa kart bilgilerini yeniden girin.";

// R23: formun KDV kutusundaki satırlar. Rakamlar kaydedilecek motorun kendisinden (satisKdvBolumu). Blok faturayı temsil eder,
// tahsilat kapsamını değil (R23/1): "bize ait tahsilat" satırı yoktur.
export const satisTevkifatOzeti = (saleType, bedel, tarih, kdvRates, kayit) => {
  const matrah = parseMoney(bedel);
  const b = satisKdvBolumu(saleType, matrah, tarih, kdvRates, kayit);
  return { matrah, toplamKdv: b.toplamKdv, tevkifat: b.tevkifat, bizKdv: b.bizKdv, faturaToplami: matrah + b.bizKdv, tevkifatli: b.tevkifatli };
};

// R31: KDV Karşılaştırması kartının bilgi satırı (Finans ve Giderler). Gider tarafının "Tevkifatla beyan edilecek KDV (KDV2)"
// satırıyla yan yana ve zıt anlamdadır: orada biz beyan ederiz, burada alıcı. Metin bu yüzden uzun ve ayrıdır.
export const SATIS_TEVKIFAT_KART_ETIKETI = "Tevkifatlı satışta alıcının beyan edeceği KDV";
export const SATIS_TEVKIFAT_KART_NOTU = "Bilgi: farka eklenmez. Bu KDV'yi alıcılar kendileri beyan eder; hesaplanan KDV yalnız bizim beyan edeceğimiz kısımdır.";

// R32: dışa aktarma sütunları (müşteri, servis, Extra Kalıp, yedek parça raporlarının sonunda). Tevkifatsızda boş.
export const SATIS_TEVKIFAT_EXPORT_HEAD = ["Tevkifat Oranı", "Alıcının Beyan Edeceği KDV"];
export const satisTevkifatExportHucreleri = (saleType, bedel, tarih, kdvRates, kayit) => {
  const b = satisKdvBolumu(saleType, bedel, tarih, kdvRates, kayit);
  return b.tevkifatli ? [satisTevkifatOranEtiketi(b), b.tevkifat] : ["", ""];
};

// Formun KDV kutusu için özet: komisyon müşteriye yansıtılıyorsa faturanın matrahı kalem + komisyondur (kayıt kurucusunun
// sakladığı matrah); kart hesabı kart tabanıyla, faturanın tevkifatı formun kendisiyle.
export const satisTevkifatFormOzeti = (saleType, kalem, tarih, kdvRates, form, { kkAyar = null, yansit = false, kartTarihi } = {}) => {
  let matrah = parseMoney(kalem);
  if (yansit && form?.taksitSayisi && matrah > 0) {
    const a = kartYansitmaAyrim(matrah, form.taksitSayisi, kkAyar, tahsilKdvOrani(saleType, tarih, kdvRates, kartTabanKaydi(form)), kartTarihi || tarih);
    if (a) matrah = a.kdvMatrah;
  }
  return satisTevkifatOzeti(saleType, matrah, tarih, kdvRates, form);
};

// R26: liste rozeti (müşteri detayının zaman çizelgesi, Stok › Yedek Parça Satışı). Oran ve alıcının beyan edeceği tutar.
export const satisTevkifatRozeti = (kayit, aliciBeyanMetni) => {
  const t = satisTevkifati(kayit);
  return t ? `Tevkifat ${satisTevkifatOranEtiketi(t)} · alıcı beyan eder: ${aliciBeyanMetni}` : "";
};
// R27: müşteri detayında borç satırının açıklaması (borç neden fatura toplamından küçük).
export const satisTevkifatBorcMetni = (kayit, aliciBeyanMetni) => {
  const t = satisTevkifati(kayit);
  return t ? `Tevkifatlı fatura (${satisTevkifatOranEtiketi(t)}): KDV'nin ${aliciBeyanMetni} tutarındaki kısmını alıcı kendisi beyan eder, borca girmez.` : "";
};
