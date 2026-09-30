// Spec 0044 (Q2, C2): servis, Extra Kalıp ve yedek parça tahsilatının TEK tanımı. Aylık faaliyet raporunun tahsilat
// kalemi ve kasa bakiyesi aynı fonksiyonu çağırır; "hangi bedel bizim, ne kadar, hangi gün" ikinci bir yerde yazılmaz.
// Saf, React'sız. Tutar brüttür: bize ait bedel + KDV'si (R13); tarih tahsilatTarihiOf (R5, Q3).
import { parseMoney, calcKDV, isServisUcretliMi, isParcaUcretliMi, altuntasParcaBedeli, tahsilatTarihiOf, isAltuntasServisi } from "./utils";

export const SATIS_KAYNAK = { SERVIS: "servis", KALIP: "kalip", YEDEK: "yedekParca" };
export const SATIS_KAYNAK_AD = { servis: "Servis tahsilatı", kalip: "Extra Kalıp tahsilatı", yedekParca: "Yedek parça tahsilatı" };

// Bize ait bedel (KDV hariç). Serviste ücretli işçilik (yalnız kendi servisimiz) + Altuntaş parçası (anlaşmalı servise
// satılan dahil, Q1); kalıpta ücretsiz değilse ücret (bayi aracılı dahil, 0007: borçlu bayi, alacaklı fabrika);
// yedek parçada miktar × birim fiyat.
const servisKaleme = (s, factoryName) => isServisUcretliMi(s, factoryName) || isParcaUcretliMi(s);
const servisBedeli = (s, factoryName) => (isServisUcretliMi(s, factoryName) ? parseMoney(s.servisUcreti) : 0) + (isParcaUcretliMi(s) ? altuntasParcaBedeli(s) : 0);
const yedekBedeli = (s) => (parseInt(s.miktar) || 0) * parseMoney(s.birimFiyat);

// R3, AC-27: servisin parça bedeli farklı para birimindeyse tek hesaba yazılamaz.
export const paraBirimiUyumluMu = (kaynak, r) => kaynak !== SATIS_KAYNAK.SERVIS || !r?.parcaCurrency || !isParcaUcretliMi(r)
  || (r.parcaCurrency || "TRY") === (r.currency || "TRY");

// Tek kalem: { kaynak, kayit, bedel, kdv, tutar (brüt), currency, tarih, yontem } ya da null (kapsam dışı).
export const satisTahsilatKalemi = (kaynak, r, { factoryName = "Altuntaş Makina", kdvRates } = {}) => {
  if (!r) return null;
  if (kaynak === SATIS_KAYNAK.SERVIS) {
    if (!servisKaleme(r, factoryName)) return null;
    const bedel = servisBedeli(r, factoryName);
    const kdv = calcKDV(r.faturaTipi, bedel, r.date, kdvRates);
    return { kaynak, kayit: r, bedel, kdv, tutar: bedel + kdv, currency: r.currency, tarih: tahsilatTarihiOf(r, r.date), yontem: r.yontem || "Nakit" };
  }
  if (kaynak === SATIS_KAYNAK.KALIP) {
    if (r.ucretsizMi) return null;
    const kdv = calcKDV(r.faturaTipi, r.ucret, r.tarih, kdvRates);
    return { kaynak, kayit: r, bedel: parseMoney(r.ucret), kdv, tutar: parseMoney(r.ucret) + kdv, currency: r.currency, tarih: tahsilatTarihiOf(r, r.tarih), yontem: r.yontem || "Nakit" };
  }
  const bedel = yedekBedeli(r);
  if (!(bedel > 0)) return null;
  const kdv = calcKDV(r.faturaTipi, bedel, r.tarih, kdvRates);
  return { kaynak, kayit: r, bedel, kdv, tutar: bedel + kdv, currency: r.currency, tarih: tahsilatTarihiOf(r, r.tarih), yontem: r.yontem || "Nakit" };
};

// Bütün kalemler (servis, kalıp, yedek parça sırasıyla); süzgeç (tahsil edildi mi, ay, silinmiş) çağırana aittir.
export const satisTahsilatKalemleri = ({ services = [], partSales = [], yedekParcaSatislar = [] } = {}, ops = {}) => [
  ...services.map(s => satisTahsilatKalemi(SATIS_KAYNAK.SERVIS, s, ops)),
  ...partSales.map(p => satisTahsilatKalemi(SATIS_KAYNAK.KALIP, p, ops)),
  ...yedekParcaSatislar.map(s => satisTahsilatKalemi(SATIS_KAYNAK.YEDEK, s, ops)),
].filter(Boolean);

// R2, R14, AC-22, AC-27: "ödendi" işaretlenirken hesap sorulur mu, sorulmazsa neden.
export const tahsilatHesapDurumu = (kaynak, r, ops = {}) => {
  const k = satisTahsilatKalemi(kaynak, r, ops);
  if (!paraBirimiUyumluMu(kaynak, r)) return { sor: false, neden: "Parça bedelinin para birimi servisle aynı değil; bu tahsilat bir hesaba bağlanamaz." };
  if (!k || !(k.tutar > 0)) {
    const disServis = kaynak === SATIS_KAYNAK.SERVIS && !isAltuntasServisi(r, ops.factoryName || "Altuntaş Makina") && parseMoney(r.servisUcreti) > 0;
    return { sor: false, neden: disServis ? "Bu bedel anlaşmalı firmaya ait, kasaya girmez." : "Kasaya girecek tutar yok." };
  }
  return { sor: true, neden: null, currency: k.currency || "TRY", tutar: k.tutar };
};
