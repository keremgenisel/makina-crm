// Spec 0132: malzeme kataloğu ve malzemeden türeyen parça maliyeti. Saf modül: React almaz, saat okumaz (C2), tarih parametredir.
// C1: malzemeden ağırlık ve tutar türeten çarpımlar kaynakta YALNIZ bu dosyadadır (kaynak taraması). Maliyetin tek okuma yolu
// `urunAgaci.parcaMaliyetKurus` kalır; o, malzeme satırı olan parçada `malzemeParcaKurus`'u çağırır.
//
// Malzeme kaydı (bölüm `malzemeler`, C5/2): { id, ad, alasim, ozgulAgirlik (g/cm³), kiloFiyati, paraBirimi (TRY|USD|EUR), kur
// (1 birim kaç TL), bantlar: [{ alt, fiyat }], boyFiyati, geldigiBoy (metre, R2/2), tedarikciId, asgariSiparis (kilogram, R2/2),
// fire (yüzde), fiyatGecmisi: [{ gecerli, kiloFiyati, paraBirimi, kur, bantlar, boyFiyati }], deletedAt }. Boş alan kayda yazılmaz.
// Parçanın malzeme satırı (Karar 28, tek satır): parts[].malzemeSatiri = { malzemeId, bicim, yontem, cap, et, kalinlik, genislik,
// en, boy, payCap, payKalinlik, payGenislik, payEn, payBoy, fire }.
import { tutarCoz, kurus } from "./gider";
import { trLower } from "./utils";
import { BELIRSIZ_DESEN, BELIRSIZ_HATASI } from "./tutarGirdisi";
import { gecerliGunMu, gecerlilikTarihiDogrula, tarihteGecerliIndeks } from "./gecerlilik";
// Triyaj (bulgu 3): etki önizlemesi maliyetin TEK okuma yolundan geçer. urunAgaci bu modülü içe aldığı için döngüdür; ikisi de
// yalnız çağrı anında kullanılır (modül yüklenirken okunmaz).
import { parcaMaliyetKurus, setKatalogu } from "./urunAgaci";
import { kalemMalzemeIdleri } from "./maliyetKalemleri";
import { disIslemKatalogu } from "./disIslem";
import { parcaSatisFiyati, fiyatAyariOf } from "./parcaFiyati"; // spec 0133 R16/2 (döngü: çağrı anında okunur)

// ── Sabitler ve biçimler ──────────────────────────────────────────────────────────────────────────────────────────────────
export const PARA_BIRIMLERI = ["TRY", "USD", "EUR"];
export const PARA_ADI = { TRY: "TL", USD: "USD", EUR: "EUR" };
export const PARA_SIMGE = { TRY: "₺", USD: "$", EUR: "€" };
export const dovizMi = (pb) => pb === "USD" || pb === "EUR";
const paraOf = (m) => (m?.paraBirimi == null || m.paraBirimi === "" ? "TRY" : m.paraBirimi);

// R11, R10/2: biçim ölçüleri ve hangi ölçüye işleme payı eklendiği. `pay` alanı ölçü adıyla eşlenir (boruda et kalınlığına
// pay yoktur, AC-82). `capli` = bant uygulanabilir biçim (R3/2).
export const OLCU_ADLARI = { cap: "Çap", et: "Et kalınlığı", kalinlik: "Kalınlık", genislik: "Genişlik", en: "En", boy: "Boy" };
export const PAY_ALANI = { cap: "payCap", kalinlik: "payKalinlik", genislik: "payGenislik", en: "payEn", boy: "payBoy" };
export const BICIMLER = {
  mil: { ad: "Yuvarlak mil", olculer: ["cap", "boy"], paylar: ["cap", "boy"], capli: true },
  boru: { ad: "Boru", olculer: ["cap", "et", "boy"], paylar: ["cap", "boy"], capli: true },
  lama: { ad: "Lama", olculer: ["kalinlik", "genislik", "boy"], paylar: ["kalinlik", "genislik", "boy"], capli: false },
  sac: { ad: "Sac", olculer: ["kalinlik", "en", "boy"], paylar: ["kalinlik", "en", "boy"], capli: false },
};
export const BICIM_SIRASI = ["mil", "boru", "lama", "sac"];
export const YONTEMLER = { kilo: "Kilo fiyatından", boy: "Boy fiyatından" };

// ── Sayı yardımcıları ───────────────────────────────────────────────────────────────────────────────────────────────────
// Triyaj (bulgu 2): `tutarCoz` virgülsüz "2.955"i binlik sayar (2955). Kilo fiyatı ve özgül ağırlık 3-4 ondalıkla yazılır; bu
// alanlarda tek noktalı ve noktadan sonra üç ya da daha çok haneli virgülsüz metin BELİRSİZDİR ve reddedilir (0087
// `MALIYET_BELIRSIZ_HATASI` emsali). Kural tutarCoz'a yazılmaz (gider tarafıyla ortak).
// Spec 0137 Karar 38: belirsiz sayı kuralı döngüsüz `tutarGirdisi.js`'e taşındı (dış işlem motoru da okur); adlar aynen.
export { BELIRSIZ_DESEN, BELIRSIZ_HATASI };
const belirsizMi = (v) => typeof v === "string" && BELIRSIZ_DESEN.test(v);
const sayiOf = (v) => {
  if (v == null || v === "") return null;
  if (belirsizMi(v)) return null;
  const r = tutarCoz(v);
  return r.bos || r.gecersiz ? null : r.deger;
};
const pozitifMi = (v) => { const n = sayiOf(v); return n != null && n > 0; };
// R15, R15/2, AC-90: üç ondalık gösterim, tam yarım yukarı. Ara hesap tam değerle sürer; bu yalnız ekran içindir.
export const ucOndalik = (x) => {
  if (x == null || !Number.isFinite(x)) return null;
  const temiz = Number(Number(x).toPrecision(12));
  return Math.round(Number((temiz * 1000).toPrecision(12))) / 1000;
};
const ucHane = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
export const kgMetni = (kg) => (kg == null ? "—" : `${ucHane.format(ucOndalik(kg))} kg`);
const ikiHane = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
export const fiyatMetni = (fiyat, pb) => (fiyat == null || fiyat === "" ? "—" : `${ikiHane.format(Number(fiyat))} ${PARA_SIMGE[pb] || pb}`);

// ── Bantlar (R3, R3/2, Karar 26) ────────────────────────────────────────────────────────────────────────────────────────
export const bantlarOf = (m) => (Array.isArray(m?.bantlar) ? m.bantlar : [])
  .filter(b => b && b.alt != null && b.alt !== "").map(b => ({ alt: Number(b.alt), fiyat: b.fiyat == null || b.fiyat === "" ? null : Number(b.fiyat) }));
// AC-11: en üst bant açık uçludur.
export const bantMetni = (bantlar, i) => {
  const b = bantlar[i]; const s = bantlar[i + 1];
  return s ? `Ø${fmtSayi(b.alt)} – Ø${fmtSayi(s.alt)} altı` : `Ø${fmtSayi(b.alt)} ve üstü`;
};
const fmtSayi = (n) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 3 }).format(n);
// R3/2, AC-70: bandı seçen değer ham çaptır; alt sınırı ham çaptan büyük olmayan en son bant.
export const bantSec = (bantlar, hamCap) => {
  let sec = null;
  for (const b of bantlar) if (b.alt <= hamCap) sec = b;
  return sec;
};

// ── Fiyat kümesi ve tarihli geçmiş (R6, R6/2, Karar 25, C3) ──────────────────────────────────────────────────────────────
// Kümenin alanları; geçmişin bir satırı bu alanların anlık görüntüsüdür.
export const FIYAT_ALANLARI = ["kiloFiyati", "paraBirimi", "kur", "bantlar", "boyFiyati"];
export const fiyatKumesi = (m) => {
  const k = {};
  if (sayiOf(m?.kiloFiyati) != null) k.kiloFiyati = sayiOf(m.kiloFiyati);
  k.paraBirimi = paraOf(m);
  if (sayiOf(m?.kur) != null) k.kur = sayiOf(m.kur);
  const b = bantlarOf(m); if (b.length) k.bantlar = b;
  if (sayiOf(m?.boyFiyati) != null) k.boyFiyati = sayiOf(m.boyFiyati);
  return k;
};
const kumeAnahtari = (k) => JSON.stringify([k.kiloFiyati ?? null, k.paraBirimi || "TRY", k.kur ?? null, k.bantlar || [], k.boyFiyati ?? null]);
const kumeBosMu = (k) => k.kiloFiyati == null && !(k.bantlar && k.bantlar.length) && k.boyFiyati == null;
export const fiyatGecmisiOf = (m) => (Array.isArray(m?.fiyatGecmisi) ? m.fiyatGecmisi : [])
  .map(x => ({ ...fiyatKumesi(x), gecerli: x?.gecerli || "" }))
  .sort((a, b) => (a.gecerli < b.gecerli ? -1 : a.gecerli > b.gecerli ? 1 : 0));
// C3: sorgu tarihinde geçerli küme. Tarihsiz, biçimsiz ya da son kaydın aralığına düşen sorgu BUGÜNKÜ kümeyi verir (0097 R3/2).
export const fiyatKumesiTarihte = (m, tarih) => {
  const bugunku = fiyatKumesi(m);
  if (tarih === undefined) return bugunku;
  const g = fiyatGecmisiOf(m);
  const i = tarihteGecerliIndeks(g, tarih);
  if (i < 0) return bugunku;
  const { gecerli: _g, ...k } = g[i];
  return k;
};
// R6, R6/2, AC-21–AC-23, AC-79, AC-80: TEK yazıcı. `eski` kayıttaki malzeme (yeni malzemede null: geçmiş yazılmaz), `yeni`
// kaydedilecek malzeme, `tarih` girilen geçerlilik tarihi, `bugun` yerel gün. Küme değişmediyse geçmiş aynen kalır; eski küme
// boşsa (ilk fiyat girişi) kayıt yazılmaz (AC-22); aynı güne ikinci değişiklik son kaydın üstüne yazar (AC-23). Dönüş
// `{ gecmis, hata }`; hata varsa geçmiş eski hâlidir ve kayıt yapılmamalıdır.
export const fiyatGecmisiYaz = (eski, yeni, { tarih, bugun } = {}) => {
  const g = fiyatGecmisiOf(eski);
  if (!eski) return { gecmis: [], hata: null };
  const eskiK = fiyatKumesi(eski); const yeniK = fiyatKumesi(yeni);
  if (kumeAnahtari(eskiK) === kumeAnahtari(yeniK)) return { gecmis: g, hata: null };
  if (!gecerliGunMu(bugun)) throw new Error("fiyatGecmisiYaz: bugun (YYYY-AA-GG) gerekli");
  if (!g.length && kumeBosMu(eskiK)) return { gecmis: g, hata: null };
  // Son kayıt bugünkü değere eşitlenir (0097 P5); geçmiş boşsa eski küme "başlangıçtan beri".
  const taban = g.length ? [...g.slice(0, -1), { ...eskiK, gecerli: g[g.length - 1].gecerli }] : [{ ...eskiK, gecerli: "" }];
  const son = taban[taban.length - 1];
  const hata = gecerlilikTarihiDogrula(tarih, bugun, son.gecerli);
  if (hata) return { gecmis: g, hata };
  if (tarih === son.gecerli) return { gecmis: [...taban.slice(0, -1), { ...yeniK, gecerli: tarih }], hata: null };
  return { gecmis: [...taban, { ...yeniK, gecerli: tarih }], hata: null };
};
// AC-27: kartın salt okunur listesi, en yeni üstte. Son kaydın değeri bugünkü kümedir.
export const fiyatGecmisiSatirlari = (m) => {
  const g = fiyatGecmisiOf(m);
  return g.map((x, i) => {
    const k = i === g.length - 1 ? fiyatKumesi(m) : x;
    return { gecerli: x.gecerli, tarihMetni: x.gecerli ? x.gecerli.split("-").reverse().join(".") : "başlangıçtan beri", ozet: kumeOzeti(k) };
  }).reverse();
};
export const kumeOzeti = (k) => {
  const pb = k.paraBirimi || "TRY";
  const parcalar = [];
  if (k.kiloFiyati != null) parcalar.push(`${fiyatMetni(k.kiloFiyati, pb)}/kg`);
  if (k.bantlar?.length) parcalar.push(`${k.bantlar.length} bant`);
  if (k.boyFiyati != null) parcalar.push(`boy ${fiyatMetni(k.boyFiyati, pb)}`);
  if (dovizMi(pb)) parcalar.push(k.kur != null ? `kur ${fmtSayi(k.kur)}` : "kur girilmedi");
  return parcalar.length ? parcalar.join(" · ") : "fiyat girilmedi";
};

// ── Eksiklik (R7, R7/2, Karar 27, AC-5, AC-91) ──────────────────────────────────────────────────────────────────────────
export const EKSIK_OZGUL = "özgül ağırlık girilmedi";
export const EKSIK_KILO = "kilo fiyatı girilmedi";
export const EKSIK_KUR = "kur girilmedi";
export const EKSIK_PARA = "para birimi tanınmıyor";
export const EKSIK_BOY_FIYATI = "boy fiyatı girilmedi";
export const EKSIK_BOY = "malzemenin geldiği boy girilmedi";
// Triyaj (bulgu 4, Karar 44): bant varken çaplı biçim tek kilo fiyatına bakmaz (her ham çap bir banda düşer, Karar 26); tek fiyat
// yalnız bantsız malzemede ya da lama ve sacda gerekir. Rozet bu durumda dar metni yazar.
export const EKSIK_KILO_LAMA = "lama ve sac için tek kilo fiyatı girilmedi";
// Kümenin (bugünkü ya da tarihli) eksikleri; özgül ağırlık kümede değil karttadır. `capli` parçanın biçimi çaplıysa true, kartın
// rozetinde (biçim yok) null.
const kumeEksikleri = (k, { kilo = true, capli = null } = {}) => {
  const e = [];
  if (!PARA_BIRIMLERI.includes(k.paraBirimi)) { e.push(EKSIK_PARA); return e; }
  const bantli = !!(k.bantlar && k.bantlar.length);
  if (kilo && k.kiloFiyati == null && !(bantli && capli === true)) e.push(bantli ? EKSIK_KILO_LAMA : EKSIK_KILO);
  if (dovizMi(k.paraBirimi) && !(k.kur > 0)) e.push(EKSIK_KUR);
  return e;
};
// Listede "eksik" rozeti: kilo yönteminin ihtiyaçları (R7 malzemenin kendi eksiği).
export const malzemeEksikleri = (m) => {
  if (!m) return [EKSIK_KILO];
  const e = [];
  if (!pozitifMi(m.ozgulAgirlik)) e.push(EKSIK_OZGUL);
  return [...e, ...kumeEksikleri(fiyatKumesi(m))];
};
export const malzemeEksikMi = (m) => malzemeEksikleri(m).length > 0;
export const eksikMalzemeSayisi = (malzemeler = []) => (malzemeler || []).filter(m => m && !m.deletedAt && malzemeEksikMi(m)).length;

// ── Parçanın malzeme kalemleri (0132'nin tek satırı, spec 0135 ile kalem listesinin malzeme kalemleri) ──────────────────────
// C1/2: katalog = Map(String(id) → malzeme), yalnız CANLI malzemeler (çöpteki malzemeye bağlı parça "girilmedi", AC-43).
export const malzemeKatalogu = (malzemeler = []) => new Map((malzemeler || []).filter(m => m && !m.deletedAt).map(m => [String(m.id), m]));
const fireOf = (satir, m) => {
  const s = sayiOf(satir?.fire);
  if (s != null) return s;
  const v = sayiOf(m?.fire);
  return v == null ? 0 : v; // R13, AC-36, AC-37
};
// R10/2, R12/2: satın alınan (ham) ölçüler. Eksik ölçü null.
export const hamOlculer = (satir) => {
  const b = BICIMLER[satir?.bicim];
  if (!b) return null;
  const o = {};
  for (const ad of b.olculer) {
    const v = sayiOf(satir[ad]);
    if (v == null || v <= 0) return null;
    const payAd = b.paylar.includes(ad) ? PAY_ALANI[ad] : null;
    o[ad] = v + (payAd ? (sayiOf(satir[payAd]) || 0) : 0);
  }
  return o;
};
// AC-30–AC-34: hacim (mm³) biçime göre; ağırlık kg = mm³ × ρ (g/cm³) / 1e6.
const hacimMm3 = (bicim, o) => {
  switch (bicim) {
    case "mil": return Math.PI * (o.cap / 2) ** 2 * o.boy;
    case "boru": return (Math.PI / 4) * (o.cap ** 2 - Math.max(0, o.cap - 2 * o.et) ** 2) * o.boy;
    case "lama": return o.kalinlik * o.genislik * o.boy;
    case "sac": return o.kalinlik * o.en * o.boy;
    default: return null;
  }
};
export const agirlikKg = (bicim, olculer, ozgulAgirlik) => {
  const h = olculer ? hacimMm3(bicim, olculer) : null;
  const ro = sayiOf(ozgulAgirlik);
  return h == null || ro == null || ro <= 0 ? null : (h * ro) / 1e6;
};

// Spec 0134 C2/2, Karar 43: bir tam boyun ağırlığı AYNI ağırlık fonksiyonuyla; ölçü nesnesinin boyu malzemenin geldiği boyuyla
// (metre → mm) değiştirilir. Sipariş motoru özgül ağırlığa dokunmaz, bu yardımcıyı çağırır. Eksik veride null.
export const tamBoyKg = (satir, malzeme) => {
  const o = hamOlculer(satir);
  const boyM = sayiOf(malzeme?.geldigiBoy);
  if (!o || boyM == null || boyM <= 0) return null;
  return agirlikKg(satir.bicim, { ...o, boy: boyM * 1000 }, malzeme?.ozgulAgirlik);
};
// Spec 0134 R12/2: satırın kesit anahtarı için ham ölçüler (boy hariç) biçimin sırasıyla.
export const hamKesit = (satir) => {
  const b = BICIMLER[satir?.bicim]; const o = hamOlculer(satir);
  return b && o ? b.olculer.filter(ad => ad !== "boy").map(ad => o[ad]) : null;
};
// R12/2, R14/2, AC-38, AC-44: TEK hesap. Dönüş: { maliyetK, eksik (neden dizisi), hamKg, fireliKg, fire, fiyat, bant, kur,
// paraBirimi, yontem, oran }. maliyetK null = "girilmedi" (asla sıfır, R7). Ara değerler yuvarlanmaz; yalnız kuruşa (Karar 30).
export const malzemeOzeti = (satir, malzemeKat, tarih) => {
  const bos = (eksik) => ({ maliyetK: null, eksik, hamKg: null, fireliKg: null });
  if (!(malzemeKat instanceof Map)) return bos(["malzeme listesi verilmedi"]);
  const m = satir ? malzemeKat.get(String(satir.malzemeId)) : null;
  if (!m) return bos(["malzeme bulunamadı ya da çöpte"]);
  const b = BICIMLER[satir.bicim];
  if (!b) return bos(["biçim seçilmedi"]);
  const o = hamOlculer(satir);
  const yontem = satir.yontem === "boy" ? "boy" : "kilo";
  const fire = fireOf(satir, m);
  const k = fiyatKumesiTarihte(m, tarih);
  const pb = k.paraBirimi;
  const eksik = [];
  if (!o) eksik.push("ölçü eksik");
  if (yontem === "boy") {
    eksik.push(...kumeEksikleri(k, { kilo: false }));
    if (k.boyFiyati == null) eksik.push(EKSIK_BOY_FIYATI);
    if (!pozitifMi(m.geldigiBoy)) eksik.push(EKSIK_BOY);
    if (eksik.length) return { ...bos(eksik), yontem, fire };
    const kur = dovizMi(pb) ? k.kur : 1;
    const oran = o.boy / (sayiOf(m.geldigiBoy) * 1000);
    const tl = oran * (1 + fire / 100) * k.boyFiyati * kur;
    return { maliyetK: kurus(tl), eksik: [], hamKg: null, fireliKg: null, fire, oran, fiyat: k.boyFiyati, kur, paraBirimi: pb, yontem };
  }
  if (!pozitifMi(m.ozgulAgirlik)) eksik.push(EKSIK_OZGUL);
  eksik.push(...kumeEksikleri(k, { capli: b.capli }));
  if (eksik.length) {
    const hamKg = o ? agirlikKg(satir.bicim, o, m.ozgulAgirlik) : null;
    return { maliyetK: null, eksik, hamKg, fireliKg: hamKg == null ? null : hamKg * (1 + fire / 100), fire, yontem };
  }
  const hamKg = agirlikKg(satir.bicim, o, m.ozgulAgirlik);
  const fireliKg = hamKg * (1 + fire / 100);
  const bantlar = k.bantlar || [];
  const bant = b.capli && bantlar.length ? bantSec(bantlar, o.cap) : null;
  const fiyat = bant && bant.fiyat != null ? bant.fiyat : k.kiloFiyati;
  const kur = dovizMi(pb) ? k.kur : 1;
  return { maliyetK: kurus(fireliKg * fiyat * kur), eksik: [], hamKg, fireliKg, fire, fiyat, bant, kur, paraBirimi: pb, yontem };
};
export const malzemeParcaKurus = (satir, malzemeKat, tarih) => malzemeOzeti(satir, malzemeKat, tarih).maliyetK;

// Spec 0137 R13, R14, R14/2, R28, AC-37, AC-93–AC-96: işlenmiş ağırlık (biten parçanın ağırlığı: işleme payı ve fire HARİÇ). Ağırlık
// çarpımları yalnız bu dosyada kalır (0132 C1). Ad "net" değildir: 0134 `netKg`'yi ham ağırlıklar toplamı anlamında kullanıyor
// (Ölçüm E). Üç çözülemeyen hâlin nedeni ayrı metindir; ağırlık asla sessizce 0 alınmaz.
export const NEDEN_BOY_AGIRLIK = "boy fiyatından hesaplanan malzemenin ağırlığı yok";
export const NEDEN_OLCU_EKSIK = "ölçü eksik";
export const NEDEN_MALZEME_KALEMI_YOK = "parçanın malzeme kalemi yok";
export const NEDEN_ADET_GECERSIZ = "malzeme kaleminin adedi geçersiz";
export const netOlculer = (satir) => {
  const b = BICIMLER[satir?.bicim];
  if (!b) return null;
  const o = {};
  for (const ad of b.olculer) { const v = sayiOf(satir[ad]); if (v == null || v <= 0) return null; o[ad] = v; }
  return o;
};
export const islenmisKg = (satir, malzemeKat) => {
  if (!(malzemeKat instanceof Map)) return { kg: null, neden: "malzeme listesi verilmedi" };
  const m = satir ? malzemeKat.get(String(satir.malzemeId)) : null;
  if (!m) return { kg: null, neden: "malzeme bulunamadı ya da çöpte" };
  if (!BICIMLER[satir.bicim]) return { kg: null, neden: "biçim seçilmedi" };
  if (satir.yontem === "boy") return { kg: null, neden: NEDEN_BOY_AGIRLIK };
  if (!pozitifMi(m.ozgulAgirlik)) return { kg: null, neden: EKSIK_OZGUL };
  const o = netOlculer(satir);
  if (!o) return { kg: null, neden: NEDEN_OLCU_EKSIK };
  return { kg: agirlikKg(satir.bicim, o, m.ozgulAgirlik), neden: null };
};
// Parçanın kilo tabanı: malzeme kalemlerinin işlenmiş ağırlığı × kalem adedi (yuvarlanmamış; Karar 35'in üç ondalığı tek yerde, dış işlem
// motorunda). Bir kalem çözülemezse tamamı çözülemez (R14/2); malzeme kalemi yoksa R14.
export const parcaIslenmisKg = (malzemeKalemleri = [], malzemeKat) => {
  if (!(malzemeKalemleri || []).length) return { kg: null, neden: NEDEN_MALZEME_KALEMI_YOK };
  let toplam = 0;
  for (const k of malzemeKalemleri) {
    const adet = Number(k?.adet ?? 1);
    if (!Number.isInteger(adet) || adet < 1) return { kg: null, neden: NEDEN_ADET_GECERSIZ };
    const r = islenmisKg(k, malzemeKat);
    if (r.kg == null) return r;
    toplam += r.kg * adet;
  }
  return { kg: toplam, neden: null };
};

// ── Doğrulayıcılar ──────────────────────────────────────────────────────────────────────────────────────────────────────
export const AD_BOS_HATASI = "Malzeme adı boş olamaz.";
export const AD_AYNI_HATASI = "Bu adda bir malzeme zaten var.";
export const FIRE_HATASI = "Fire 0 ile 100 arasında olmalı.";
export const POZITIF_HATASI = "Sıfırdan büyük bir sayı olmalı.";
export const NEGATIF_HATASI = "Negatif olamaz.";
export const SAYI_HATASI = "Sayı olmalı.";
export const PARA_HATASI = "Para birimi TL, USD ya da EUR olmalı.";
export const BANT_SIRA_HATASI = "Bantların alt sınırları artan sırada olmalı; iki bant aynı sınırla başlayamaz.";
export const BANT_FIYAT_HATASI = "Her bandın kilo fiyatı girilmeli.";
// Ortak sayı alanı denetimi: boş serbest. `pozitif` sıfırı da reddeder.
const alanDogrula = (ham, { pozitif = false, ust = null, ustHata = FIRE_HATASI } = {}) => {
  if (ham == null || String(ham).trim() === "") return { deger: null, hata: null };
  if (belirsizMi(ham)) return { deger: null, hata: BELIRSIZ_HATASI };
  const r = tutarCoz(ham);
  if (r.gecersiz) return { deger: null, hata: SAYI_HATASI };
  if (r.deger < 0) return { deger: null, hata: ust != null ? ustHata : NEGATIF_HATASI };
  if (pozitif && r.deger === 0) return { deger: null, hata: POZITIF_HATASI };
  if (ust != null && r.deger > ust) return { deger: null, hata: ustHata };
  return { deger: r.deger, hata: null };
};
// R13/2, AC-16, AC-84: fire doğrulayıcısı TEK; malzeme kartı ve parça satırı aynı fonksiyonu çağırır.
export const fireDogrula = (ham) => alanDogrula(ham, { ust: 100 });
// Spec 0134 R9, R9/2, C4, AC-21 (Karar 28): emniyet payı yüzdesi, malzeme kartında ve parça kartında AYNI doğrulayıcıdan. Boş
// serbest (gövdeye yazılmaz), 0 ile 100 arası. Yalnız siparişi etkiler, maliyete girmez.
export const EMNIYET_PAYI_HATASI = "Emniyet payı 0 ile 100 arasında olmalı.";
export const emniyetPayiDogrula = (ham) => alanDogrula(ham, { ust: 100, ustHata: EMNIYET_PAYI_HATASI });
export const EMNIYET_PAYI_ETIKETI = "Emniyet payı (%)";
export const EMNIYET_PAYI_IPUCU = "Yalnız sipariş ihtiyacını büyütür (Makina Maliyeti › Sipariş İhtiyacı); maliyete girmez. Parçanın payı varsa malzemeninki okunmaz.";
// AC-12, Karar 26: ilk bandın alt sınırı 0'dır; alt sınırlar kesin artan; her bandın fiyatı girilir.
export const bantlarDogrula = (satirlar = []) => {
  const dolu = (satirlar || []).filter(b => b && !(String(b.alt ?? "").trim() === "" && String(b.fiyat ?? "").trim() === ""));
  const kayit = []; let hata = null;
  dolu.forEach((b, i) => {
    const alt = i === 0 ? { deger: 0, hata: null } : alanDogrula(b.alt);
    const f = alanDogrula(b.fiyat);
    if (alt.hata === BELIRSIZ_HATASI || f.hata === BELIRSIZ_HATASI) { hata = hata || BELIRSIZ_HATASI; return; }
    if (alt.hata || alt.deger == null) { hata = hata || BANT_SIRA_HATASI; return; }
    if (f.hata || f.deger == null) { hata = hata || BANT_FIYAT_HATASI; return; }
    if (kayit.length && alt.deger <= kayit[kayit.length - 1].alt) { hata = hata || BANT_SIRA_HATASI; return; }
    kayit.push({ alt: alt.deger, fiyat: f.deger });
  });
  return { kayit, hata };
};
// C7/2, AC-4, AC-93: ad karşılaştırması trLower; kayıtta kullanıcının yazdığı biçim korunur.
export const adCakisiyorMu = (ad, malzemeler = [], haricId = null) => {
  const a = trLower(String(ad || "").trim());
  return !!a && (malzemeler || []).some(m => m && !m.deletedAt && String(m.id) !== String(haricId) && trLower(String(m.ad || "").trim()) === a);
};
// Malzeme kartının doğrulaması. `form` metin alanlarıdır. Dönüş { kayit, hatalar, gecerli }; kayıt boş alan taşımaz.
export const malzemeDogrula = (form = {}, malzemeler = [], haricId = null) => {
  const h = {}; const k = {};
  const ad = String(form.ad || "").trim();
  if (!ad) h.ad = AD_BOS_HATASI; else if (adCakisiyorMu(ad, malzemeler, haricId)) h.ad = AD_AYNI_HATASI;
  k.ad = ad;
  const alasim = String(form.alasim || "").trim(); if (alasim) k.alasim = alasim;
  const pb = form.paraBirimi == null || form.paraBirimi === "" ? "TRY" : form.paraBirimi;
  if (!PARA_BIRIMLERI.includes(pb)) h.paraBirimi = PARA_HATASI; else if (pb !== "TRY") k.paraBirimi = pb;
  const alanlar = [
    ["ozgulAgirlik", { pozitif: true }], ["kiloFiyati", {}], ["boyFiyati", {}], ["geldigiBoy", { pozitif: true }],
    ["asgariSiparis", {}], ["fire", { ust: 100 }], ["emniyetPayi", { ust: 100, ustHata: EMNIYET_PAYI_HATASI }],
  ];
  for (const [ad2, o] of alanlar) {
    const r = alanDogrula(form[ad2], o);
    if (r.hata) h[ad2] = r.hata; else if (r.deger != null) k[ad2] = r.deger;
  }
  if (dovizMi(pb)) { const r = alanDogrula(form.kur, { pozitif: true }); if (r.hata) h.kur = r.hata; else if (r.deger != null) k.kur = r.deger; }
  const bant = bantlarDogrula(form.bantlar);
  if (bant.hata) h.bantlar = bant.hata; else if (bant.kayit.length) k.bantlar = bant.kayit;
  const ted = form.tedarikciId == null ? "" : String(form.tedarikciId).trim();
  if (ted) k.tedarikciId = /^\d+$/.test(ted) ? Number(ted) : ted;
  return { kayit: k, hatalar: h, gecerli: Object.keys(h).length === 0 };
};
// Karttan forma (düzenleme açılışı): sayılar metne.
const metin = (v) => (v == null ? "" : String(v).replace(".", ","));
export const sayiMetni = metin;
export const malzemeFormu = (m = {}) => ({
  ad: m.ad || "", alasim: m.alasim || "", ozgulAgirlik: metin(m.ozgulAgirlik), kiloFiyati: metin(m.kiloFiyati), paraBirimi: m.paraBirimi || "TRY",
  kur: metin(m.kur), boyFiyati: metin(m.boyFiyati), geldigiBoy: metin(m.geldigiBoy), asgariSiparis: metin(m.asgariSiparis), fire: metin(m.fire), emniyetPayi: metin(m.emniyetPayi),
  tedarikciId: m.tedarikciId == null ? "" : String(m.tedarikciId),
  bantlar: bantlarOf(m).map(b => ({ alt: metin(b.alt), fiyat: metin(b.fiyat) })),
});

// R10, R10/2, AC-45, AC-46, AC-84: parçanın malzeme satırı. Malzeme seçilmemişse satır yoktur (null). Eksik ölçü kaydı engellemez,
// sıfır ya da negatif ölçü/pay reddedilir. Yalnız biçimin istediği ölçü ve paylar yazılır, boşlar yazılmaz.
export const OLCU_HATASI = "Ölçü sıfırdan büyük olmalı.";
export const PAY_HATASI = "İşleme payı negatif olamaz.";
export const BICIM_HATASI = "Biçim seçilmeli.";
// Triyaj (bulgu 7): boruda et kalınlığı çapın yarısından küçük olmalı (yoksa iç çap sıfıra kırpılır ve boru dolu mil gibi hesaplanırdı).
export const ET_HATASI = "Et kalınlığı çapın yarısından küçük olmalı.";
export const malzemeSatiriDogrula = (form) => {
  if (!form || form.malzemeId == null || String(form.malzemeId).trim() === "") return { kayit: null, hatalar: {}, gecerli: true };
  const h = {}; const id = String(form.malzemeId).trim();
  const k = { malzemeId: /^\d+$/.test(id) ? Number(id) : id };
  const b = BICIMLER[form.bicim];
  if (!b) h.bicim = BICIM_HATASI; else k.bicim = form.bicim;
  if (form.yontem === "boy") k.yontem = "boy";
  if (b) {
    for (const ad of b.olculer) {
      const r = alanDogrula(form[ad], { pozitif: true });
      if (r.hata) h[ad] = r.hata === SAYI_HATASI || r.hata === BELIRSIZ_HATASI ? r.hata : OLCU_HATASI; else if (r.deger != null) k[ad] = r.deger;
    }
    if (form.bicim === "boru" && k.cap != null && k.et != null && !h.et && k.et * 2 >= k.cap) h.et = ET_HATASI;
    for (const ad of b.paylar) {
      const pa = PAY_ALANI[ad]; const r = alanDogrula(form[pa]);
      if (r.hata) h[pa] = r.hata === SAYI_HATASI || r.hata === BELIRSIZ_HATASI ? r.hata : PAY_HATASI; else if (r.deger != null && r.deger !== 0) k[pa] = r.deger;
    }
  }
  const f = fireDogrula(form.fire);
  if (f.hata) h.fire = f.hata; else if (f.deger != null) k.fire = f.deger;
  return { kayit: k, hatalar: h, gecerli: Object.keys(h).length === 0 };
};
const SATIR_ALANLARI = ["cap", "et", "kalinlik", "genislik", "en", "boy", "payCap", "payKalinlik", "payGenislik", "payEn", "payBoy", "fire"];
export const malzemeSatiriFormu = (s) => {
  const f = { malzemeId: s?.malzemeId == null ? "" : String(s.malzemeId), bicim: s?.bicim || "mil", yontem: s?.yontem === "boy" ? "boy" : "kilo" };
  for (const a of SATIR_ALANLARI) f[a] = metin(s?.[a]);
  return f;
};

// ── Kullanım, çöp, etki önizlemesi ──────────────────────────────────────────────────────────────────────────────────────
// R8, AC-17, AC-19: malzemeyi kullanan parçalar; `canli` silme onayı için, `cop` kalıcı silme koruması için (çöpteki parça geri
// alınınca malzemesini arar, 0123 emsali).
// Spec 0135 R31, R31/2 (AC-104): bütün malzeme kalemleri okunur (yalnız birinci değil); parça bir kez sayılır.
export const malzemeKullanimi = (malzemeId, parts = []) => {
  let canli = 0, cop = 0;
  for (const p of parts || []) {
    if (!kalemMalzemeIdleri(p).includes(String(malzemeId))) continue;
    if (p.deletedAt) cop++; else canli++;
  }
  return { canli, cop };
};
export const malzemeKullanimdaMi = (malzemeId, parts = []) => { const k = malzemeKullanimi(malzemeId, parts); return k.canli + k.cop > 0; };
export const kullanilanMalzemeler = (parts = []) => new Set((parts || []).flatMap(kalemMalzemeIdleri));
// Spec 0135 R31/2 (AC-104): metin kalem dilinde.
export const kullanimMetni = (k) => (k.canli + k.cop === 0 ? "Hiçbir parçanın maliyet kaleminde kullanılmıyor."
  : `${k.canli} parçanın maliyet kaleminde kullanılıyor${k.cop ? ` (${k.cop} parça çöpte)` : ""}.`);
// C7/2, AC-94: çöp satırının etiketi tek yardımcıdan.
export const malzemeCopEtiketi = (m) => (m?.alasim ? `${m.ad} · ${m.alasim}` : (m?.ad || ""));
// Spec 0135 R31/2, R39/3: metin kalem dilinde (eski "malzeme satırı" metinleri kalktı).
export const KALEMDE_MALZEME_NEDENI = "Bir parçanın maliyet kaleminde geçiyor; kalıcı silinemez.";
export const KALEMDE_MALZEME_RED = "Bu malzeme bir parçanın maliyet kaleminde geçtiği için kalıcı silinemez.";

// R17, AC-48–AC-50: fiyat güncellemesinin etkisi. `eski` ve `yeni` aynı malzemenin iki hâli; bugünkü maliyet iki hâlle okunur.
// Triyaj (bulgu 3): maliyet TEK okuma yolundan (`parcaMaliyetKurus`, set kataloğuyla) okunur ve BÜTÜN canlı parçalar karşılaştırılır:
// set içeriği dolu parçanın malzeme satırı okunmaz (değişmez), bileşeni bu malzemeden olan set değişir. `bagli` malzeme satırında
// bu malzeme geçen canlı parça sayısıdır; satırlar maliyeti DEĞİŞEN canlı parçalardır.
// Spec 0133 R16, R16/2 (AC-38–AC-40, AC-73, AC-74): beşinci parametre İSTEĞE BAĞLI fiyat ayarı (`{ fiyatAyarlari }`). Verilmezse
// dönüş birebir aynıdır (altın `0133-etki-once.json`); verilince her satıra eski ve yeni satış fiyatı (`oncekiFiyat`, `yeniFiyat`;
// TL, türetilmemişse "") ve sonuca fiyatı değişen parça sayısı (`fiyatDegisen`) eklenir. Fiyat tek okuma yolundan; burada çarpım yok.
// Spec 0137 R32, AC-109, AC-110: seçenek nesnesinin `disIslemler` anahtarı dış işlem kataloğunu verir (konumlu liste büyümez); hem
// malzeme hem katalog bağlı işlem kalemi taşıyan parça artık iki hâlde de çözülür. Seçeneksiz çıktı birebir eskidir. Anahtar
// yalnız `disIslemler` ise (fiyat ayarı yok) dönüş yine fiyatsız şekildedir.
export const fiyatEtkisi = (eski, yeni, parts = [], malzemeler = [], fiyatSecenegi = undefined) => {
  const katEski = malzemeKatalogu(malzemeler.map(m => (String(m.id) === String(eski.id) ? eski : m)));
  const katYeni = malzemeKatalogu(malzemeler.map(m => (String(m.id) === String(eski.id) ? yeni : m)));
  const canli = (parts || []).filter(p => p && !p.deletedAt);
  const setKat = setKatalogu(canli);
  const islemKat = fiyatSecenegi?.disIslemler ? disIslemKatalogu(fiyatSecenegi.disIslemler) : undefined;
  // Spec 0135 R33 (AC-62): bağlı parça, malzemeyi HERHANGİ bir kaleminde kullanan parçadır.
  const bagli = canli.filter(p => kalemMalzemeIdleri(p).includes(String(eski.id))).length;
  const satirlar = [];
  for (const p of canli) {
    const once = parcaMaliyetKurus(p, undefined, setKat, katEski, islemKat);
    const sonra = parcaMaliyetKurus(p, undefined, setKat, katYeni, islemKat);
    if (once !== sonra) satirlar.push({ id: p.id, ad: p.ad, once, sonra });
  }
  if (fiyatSecenegi === undefined || (fiyatSecenegi && !("fiyatAyarlari" in fiyatSecenegi))) return { bagli, degisen: satirlar.length, satirlar };
  const bEski = { setKat, malzemeKat: katEski, islemKat, ayar: fiyatAyariOf(fiyatSecenegi?.fiyatAyarlari) };
  const bYeni = { ...bEski, malzemeKat: katYeni };
  const fiyatli = satirlar.map(r => {
    const p = canli.find(x => String(x.id) === String(r.id));
    return { ...r, oncekiFiyat: parcaSatisFiyati(p, "TRY", bEski).deger, yeniFiyat: parcaSatisFiyati(p, "TRY", bYeni).deger };
  });
  return { bagli, degisen: satirlar.length, satirlar: fiyatli, fiyatDegisen: fiyatli.filter(r => r.oncekiFiyat !== r.yeniFiyat).length };
};
export const ORNEK_SATIR = 5;
export const BAGLI_PARCA_YOK = "Bu malzemeye bağlı parça yok.";
export const fiyatEtkiMetni = (e) => (e.fiyatDegisen ? `${e.fiyatDegisen} parçanın satış fiyatı değişecek.` : "Satış fiyatı değişecek parça yok (bağlı parçaların fiyatı elle sabit).");
export const etkiMetni = (e) => (e.bagli === 0 ? BAGLI_PARCA_YOK : `${e.degisen} parçanın maliyeti değişecek (${e.bagli} bağlı parça).`);

// ── Kur önerisi (R5, R5/2, AC-9, AC-10, AC-95) ──────────────────────────────────────────────────────────────────────────
export const KUR_ALINMADI = "Günün kuru henüz alınmadı; kuru elle yazabilirsiniz.";
export const KUR_CEVRIMDISI = "Çevrimdışı olduğu için günün kuru alınamadı; kuru elle yazabilirsiniz.";
// `rates` = { usd, eur } (App), `ratesErr` çevrimdışı. Dönüş { deger, neden }.
export const kurOnerisi = (pb, rates, ratesErr) => {
  if (!dovizMi(pb)) return { deger: null, neden: null };
  const v = rates ? rates[pb === "USD" ? "usd" : "eur"] : null;
  if (v > 0) return { deger: v, neden: null };
  return { deger: null, neden: ratesErr ? KUR_CEVRIMDISI : KUR_ALINMADI };
};

// ── Ekran metinleri ─────────────────────────────────────────────────────────────────────────────────────────────────────
export const PANEL_BASLIGI = "Malzemeler";
export const PANEL_IPUCU = "Parçaların yapıldığı malzemeler, özgül ağırlıkları ve kilo fiyatları (KDV hariç). Fiyat değişince bu malzemeden yapılan parçaların maliyeti kendiliğinden güncellenir.";
export const BOS_BASLIK = "Henüz malzeme yok";
export const BOS_METNI = "Kullandığınız malzemeleri \"Yeni Malzeme\" ile ekleyin; parça kartında malzemeden maliyet hesaplamak için önce malzeme gerekir.";
export const eksikSayiMetni = (n) => `${n} malzemenin bilgisi eksik`;
export const EKSIK_ROZETI = "eksik";
export const BANT_LAMA_NOTU = "Bant yalnız yuvarlak mil ve boruda uygulanır; lama ve sacda tek kilo fiyatı kullanılır.";
