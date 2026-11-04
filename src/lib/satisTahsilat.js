// Spec 0044 (Q2, C2): servis, Extra Kalıp ve yedek parça tahsilatının TEK tanımı. Aylık faaliyet raporunun tahsilat
// kalemi ve kasa bakiyesi aynı fonksiyonu çağırır; "hangi bedel bizim, ne kadar, hangi gün" ikinci bir yerde yazılmaz.
// Saf, React'sız. Tutar brüttür: bize ait bedel + KDV'si (R13); tarih tahsilatTarihiOf (R5, Q3).
import { gecerliGunMu } from "./urunAgaci";
import { parseMoney, isServisUcretliMi, isParcaUcretliMi, altuntasParcaBedeli, tahsilatTarihiOf, isAltuntasServisi, tahsilEdilecekKdv, yedekParcaBedeli, satisUcretsizMi } from "./utils";

export const SATIS_KAYNAK = { SERVIS: "servis", KALIP: "kalip", YEDEK: "yedekParca" };

// ── Tahsilat günü (spec 0131) ─────────────────────────────────────────────────────────────────────────────────────────
// TEK yazım yeri (C2): kaynakta `tahsilatTarihi` ataması yalnız bu bölümde geçer (tarama). Saf; saat okumaz, "bugün"
// (yerel gün, C3) parametredir. Okuma sırası değişmez: utils.tahsilatTarihiOf (C1).
export const TAHSILAT_GUNU_ETIKETI = "Tahsilat tarihi";
export const TAHSILAT_GUNU_GECERSIZ = "Tahsilat tarihi takvimde var olan bir gün olmalı.";
export const TAHSILAT_GUNU_GELECEK = "Tahsilat tarihi bugünden sonra olamaz.";
export const TAHSILAT_GUNU_BELIRTILMEDI = "Gün belirtilmedi; tahsilat satış ya da servis tarihinde sayılır.";
export const TAHSILAT_GUNU_CEK_NEDENI = "Çekte tahsilat günü, çekin tahsil edildiği gündür; ayrıca sorulmaz.";
export const TAHSILAT_GUNU_KART_NEDENI = "Kredi kartında tahsilat günü, paranın hesaba geçtiği gündür; ayrıca sorulmaz.";
const cekMi = (k) => k?.yontem === "Çek";
const kartMi = (k) => k?.yontem === "Kredi Kartı";
// R12, R12/3: gün alanının sorulduğu yöntemler (Çek ve Kart'ta sorulmaz, nedeni yazılır).
export const tahsilatGunuSorulurMu = (k) => !cekMi(k) && !kartMi(k);
export const tahsilatGunuNedeni = (k) => (cekMi(k) ? TAHSILAT_GUNU_CEK_NEDENI : kartMi(k) ? TAHSILAT_GUNU_KART_NEDENI : null);
// R3, R3/2, R3/3: boş gün geçer (null yazılır), takvimde olmayan ya da bugünden sonraki gün reddedilir; alt sınır yok.
export const tahsilatGunuDogrula = (gun, bugun) => {
  const g = String(gun ?? "").trim();
  if (!g) return null;
  if (!gecerliGunMu(g)) return TAHSILAT_GUNU_GECERSIZ;
  if (bugun && g > bugun) return TAHSILAT_GUNU_GELECEK;
  return null;
};
// Kayıttan alanı kaldırır (C5: kapalı değer null).
export const tahsilatGunuTemizle = (kayit) => ({ ...kayit, tahsilatTarihi: null });
// Karar 19: formun gün alanının hatası (ödendi işaretli, yöntem gün soruyor ve gün geçersiz). Formlar ve kurucular aynı denetimi çağırır.
export const tahsilatGunuFormHatasi = (form, bugun) => (form?.odendi && !form?.ucretsizMi && tahsilatGunuSorulurMu(form) ? tahsilatGunuDogrula(form.tahsilatTarihi, bugun) : null);
// R1/2 hâl 1, Karar 17: formdaki "Ödendi" kutusu işaretlenince gün alanı bugünle dolar, kaldırılınca boşalır (form durumu).
export const tahsilatGunuIsareti = (isaretli, bugun) => ({ tahsilatTarihi: isaretli ? (bugun ?? null) : null });
// R1–R12, Karar 17: kaydın tahsilat günü. `kayit` yazılacak yeni kayıt (ödeme işareti ve yöntem onun üstünde), `eski` önceki
// hâli (yeni kayıtta yok), `gun` formdan/pencereden gelen gün (undefined = hiç sorulmadı: pencere açılmayan anahtar, R5).
//   Kredi Kartı                          → null (gün kartKomisyonu.hesabaGecis'ten okunur, R12)
//   Çek                                  → "çek tahsil edildi" işaretsizden işaretliye geçerken bugün, kalkınca null, durursa eski (R12/2)
//   ödeme işareti yok                    → null (R6)
//   işaretsizden işaretliye geçiş        → gun (undefined ise bugün, boş ise null) (R1, R1/2 hâl 1, R5)
//   işaret zaten duruyor                 → gun eski günle aynıysa ya da hiç verilmediyse kayda dokunulmaz, farklıysa yazılır (R7, R7/2)
export const tahsilatGunuYaz = (kayit, { eski = null, bugun, gun } = {}) => {
  if (!kayit) return kayit;
  if (kartMi(kayit)) return tahsilatGunuTemizle(kayit);
  if (cekMi(kayit)) {
    if (!kayit.odendi || !kayit.tahsilEdildi) return tahsilatGunuTemizle(kayit);
    const oncedenTahsil = !!(eski && eski.odendi && eski.tahsilEdildi && cekMi(eski));
    return oncedenTahsil ? { ...kayit, tahsilatTarihi: eski.tahsilatTarihi ?? null } : { ...kayit, tahsilatTarihi: bugun ?? null };
  }
  if (!kayit.odendi) return tahsilatGunuTemizle(kayit);
  const norm = (g) => (String(g ?? "").trim() || null);
  const oncedenOdendi = !!(eski && eski.odendi && !cekMi(eski) && !kartMi(eski));
  if (!oncedenOdendi) return { ...kayit, tahsilatTarihi: gun === undefined ? (bugun ?? null) : norm(gun) };
  const eskiGun = eski.tahsilatTarihi ?? null;
  if (gun === undefined || norm(gun) === norm(eskiGun)) {
    const k = { ...kayit };
    if (eski.tahsilatTarihi === undefined) delete k.tahsilatTarihi; else k.tahsilatTarihi = eskiGun;
    return k;
  }
  return { ...kayit, tahsilatTarihi: norm(gun) };
};
// R9, R13/2, Karar 25: kayıt grubunun (yedek parça partisi ya da tek kayıt) gösterilen günü. Ücretli, ödenmiş ve günü
// sorulan (çek/kart değil) satırların günü; satırlar farklıysa ya da hiçbiri yoksa null (hiç yazılmaz).
export const topluTahsilatGunu = (kayitlar = []) => {
  const u = (kayitlar || []).filter(k => k && !satisUcretsizMi(k) && k.odendi && tahsilatGunuSorulurMu(k));
  if (!u.length) return null;
  const g = u[0].tahsilatTarihi || null;
  return u.every(k => (k.tahsilatTarihi || null) === g) ? g : null;
};
// R1/2 hâl 2–3, R9: düzenleme formunun gün alanının açılış değeri (form durumu, kayıt değil). Tek kayıtta kaydın kendi günü,
// partide topluTahsilatGunu ve dokunulup dokunulmadığını ölçmek için _tahsilatGunuAcilis.
export const tahsilatGunuFormu = (kayit) => ({ tahsilatTarihi: kayit?.tahsilatTarihi ?? null });
export const topluTahsilatGunuFormu = (kayitlar) => { const g = topluTahsilatGunu(kayitlar); return { tahsilatTarihi: g, _tahsilatGunuAcilis: g }; };
// R11, R11/2: Kasa'nın hesap hareketleri listesinde günü girilmemiş tahsilat satırı. Ölçüt dar: kaynak servis, Extra Kalıp
// ya da yedek parça, yöntem çek ya da kart değil, kayıtta gün yok. Makina tahsilatı ve verilen çek satırı hiç girmez.
export const TAHSILAT_GUNU_EKSIK = "Tahsilat tarihi girilmemiş";
export const TAHSILAT_GUNU_DUZELTILDI = "Tahsilat tarihi düzeltildi.";
export const tahsilatGunuEksikMi = (satir) => {
  const k = satir?.tahsilat;
  if (!k || !Object.values(SATIS_KAYNAK).includes(satir?.kaynak)) return false;
  return tahsilatGunuSorulurMu(k) && !k.tahsilatTarihi;
};
// R10, R11, Karar 20: Kasa'dan yalnız günün düzeltilmesi (hesap ve işaret değişmez). Gün eskisiyle aynıysa kayıt aynen döner.
export const tahsilatGunuAta = (kayit, gun) => {
  const g = String(gun ?? "").trim() || null;
  if ((kayit?.tahsilatTarihi ?? null) === g) return kayit;
  return { ...kayit, tahsilatTarihi: g };
};
export const SATIS_KAYNAK_AD = { servis: "Servis tahsilatı", kalip: "Extra Kalıp tahsilatı", yedekParca: "Yedek parça tahsilatı" };

// Bize ait bedel (KDV hariç). Serviste ücretli işçilik (yalnız kendi servisimiz) + Altuntaş parçası (anlaşmalı servise
// satılan dahil, Q1); kalıpta ücretsiz değilse ücret (bayi aracılı dahil, 0007: borçlu bayi, alacaklı fabrika);
// yedek parçada miktar × birim fiyat (tek okuma yolu `yedekParcaBedeli`, spec 0095 C1; ücretsizde sıfır).
const servisKaleme = (s, factoryName) => isServisUcretliMi(s, factoryName) || isParcaUcretliMi(s);
const servisBedeli = (s, factoryName) => (isServisUcretliMi(s, factoryName) ? parseMoney(s.servisUcreti) : 0) + (isParcaUcretliMi(s) ? altuntasParcaBedeli(s) : 0);

// R3, AC-27: servisin parça bedeli farklı para birimindeyse tek hesaba yazılamaz.
export const paraBirimiUyumluMu = (kaynak, r) => kaynak !== SATIS_KAYNAK.SERVIS || !r?.parcaCurrency || !isParcaUcretliMi(r)
  || (r.parcaCurrency || "TRY") === (r.currency || "TRY");

// Tek kalem: { kaynak, kayit, bedel, kdv, tutar (brüt), currency, tarih, yontem } ya da null (kapsam dışı).
export const satisTahsilatKalemi = (kaynak, r, { factoryName = "Altuntaş Makina", kdvRates } = {}) => {
  if (!r) return null;
  if (kaynak === SATIS_KAYNAK.SERVIS) {
    if (!servisKaleme(r, factoryName)) return null;
    const bedel = servisBedeli(r, factoryName);
    const kdv = tahsilEdilecekKdv(r.faturaTipi, bedel, r.date, kdvRates, r);
    return { kaynak, kayit: r, bedel, kdv, tutar: bedel + kdv, currency: r.currency, tarih: tahsilatTarihiOf(r, r.date), yontem: r.yontem || "Nakit" };
  }
  if (kaynak === SATIS_KAYNAK.KALIP) {
    if (r.ucretsizMi) return null;
    const kdv = tahsilEdilecekKdv(r.faturaTipi, r.ucret, r.tarih, kdvRates, r);
    return { kaynak, kayit: r, bedel: parseMoney(r.ucret), kdv, tutar: parseMoney(r.ucret) + kdv, currency: r.currency, tarih: tahsilatTarihiOf(r, r.tarih), yontem: r.yontem || "Nakit" };
  }
  if (r.ucretsizMi) return null; // spec 0095 C8: Extra Kalıp dalının emsali (bedel zaten sıfır; niyet okunur olsun)
  const bedel = yedekParcaBedeli(r);
  if (!(bedel > 0)) return null;
  const kdv = tahsilEdilecekKdv(r.faturaTipi, bedel, r.tarih, kdvRates, r);
  return { kaynak, kayit: r, bedel, kdv, tutar: bedel + kdv, currency: r.currency, tarih: tahsilatTarihiOf(r, r.tarih), yontem: r.yontem || "Nakit" };
};

// Bütün kalemler (servis, kalıp, yedek parça sırasıyla); süzgeç (tahsil edildi mi, ay, silinmiş) çağırana aittir.
export const satisTahsilatKalemleri = ({ services = [], partSales = [], yedekParcaSatislar = [] } = {}, ops = {}) => [
  ...services.map(s => satisTahsilatKalemi(SATIS_KAYNAK.SERVIS, s, ops)),
  ...partSales.map(p => satisTahsilatKalemi(SATIS_KAYNAK.KALIP, p, ops)),
  ...yedekParcaSatislar.map(s => satisTahsilatKalemi(SATIS_KAYNAK.YEDEK, s, ops)),
].filter(Boolean);

// Spec 0095 C8, AC-46: ücretsiz verilen yedek parçada nedenin ücretsize özel hâli.
export const UCRETSIZ_HESAP_NEDENI = "Garanti kapsamında verildi, kasaya girecek tutar yok.";
// R2, R14, AC-22, AC-27: "ödendi" işaretlenirken hesap sorulur mu, sorulmazsa neden.
export const tahsilatHesapDurumu = (kaynak, r, ops = {}) => {
  const k = satisTahsilatKalemi(kaynak, r, ops);
  if (!paraBirimiUyumluMu(kaynak, r)) return { sor: false, neden: "Parça bedelinin para birimi servisle aynı değil; bu tahsilat bir hesaba bağlanamaz." };
  if (!k || !(k.tutar > 0)) {
    const disServis = kaynak === SATIS_KAYNAK.SERVIS && !isAltuntasServisi(r, ops.factoryName || "Altuntaş Makina") && parseMoney(r.servisUcreti) > 0;
    if (kaynak === SATIS_KAYNAK.YEDEK && satisUcretsizMi(r)) return { sor: false, neden: UCRETSIZ_HESAP_NEDENI };
    return { sor: false, neden: disServis ? "Bu bedel anlaşmalı firmaya ait, kasaya girmez." : "Kasaya girecek tutar yok." };
  }
  return { sor: true, neden: null, currency: k.currency || "TRY", tutar: k.tutar };
};
