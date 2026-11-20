// Spec 0152: döviz hesaptan gider ödemesi ve bozdurma. Kur, çevrim, öneri ve döviz alanlarının TEK yeri (React ve saat okumaz).
// - Ödeme (R2/2): `tutar` TL kalır (kalemi kapatan), `dovizTutar` hesaptan çıkan, `kur` "1 birim = X TL", `paraBirimi` hesabın.
// - Bozdurma (R10/2, P4): `tutar` çıkan bacak, `karsiTutar` giren bacak, `kur` "1 çıkan birim = X giren birim", `paraBirimi`
//   çıkan, `karsiParaBirimi` giren bacağın para birimi. Aynı para birimindeki virmanda alanlar yazılmaz.
// - Kur kendi ayrıştırıcısıyla okunur (R5/2, Karar 8): virgül ve nokta ondalık; elle yazılan kur en çok dört, öneriden gelen ve
//   türetilen kur en çok altı ondalık (P3). Tutar ayrıştırıcısı kur için kullanılmaz (nokta orada binliktir).
// - Çevrim bir kez kuruşa yuvarlanır (C4/2); TL tutar ile döviz tutar asıl değerlerdir, kur bilgidir (P2).
import { CUR_SYM } from "./constants";
import { tutarCoz } from "./gider";

// ── Kur önerisi (0132'den taşındı; malzeme.js yeniden dışa verir, P9) ─────────────────────────────────────────────────────
export const KUR_ALINMADI = "Günün kuru henüz alınmadı; kuru elle yazabilirsiniz.";
export const KUR_CEVRIMDISI = "Çevrimdışı olduğu için günün kuru alınamadı; kuru elle yazabilirsiniz.";
export const dovizMi = (pb) => pb === "USD" || pb === "EUR";
// `rates` = { usd, eur } (App, "1 birim kaç TL"), `ratesErr` çevrimdışı. Dönüş { deger, neden }. Öneri her zaman bugünün kurudur.
export const kurOnerisi = (pb, rates, ratesErr) => {
  if (!dovizMi(pb)) return { deger: null, neden: null };
  const v = rates ? rates[pb === "USD" ? "usd" : "eur"] : null;
  if (v > 0) return { deger: v, neden: null };
  return { deger: null, neden: ratesErr ? KUR_CEVRIMDISI : KUR_ALINMADI };
};
export const IKI_DOVIZ_NEDENI = "İki döviz hesap arasında günün kuru önerilmez; kuru (1 çıkan birim kaç giren birim) elle yazın.";
export const ONERI_BUGUN_IBARESI = "Önerilen kur bugünün kurudur; işlem başka bir güne aitse o günün kurunu yazın.";
const yuvarla = (n, h) => Math.round(n * 10 ** h) / 10 ** h;
// R10/3, Karar 7: bozdurmada kur "1 çıkan birim = X giren birim". TL'ye bozdurmada günün kuru, TL'den dövize tersi (altı
// ondalık, P3), iki döviz arasında öneri yok.
export const bozdurmaKurOnerisi = (cikanPb, girenPb, rates, ratesErr) => {
  const c = cikanPb || "TRY", g = girenPb || "TRY";
  if (c === g) return { deger: null, neden: null };
  if (c !== "TRY" && g !== "TRY") return { deger: null, neden: IKI_DOVIZ_NEDENI };
  if (g === "TRY") return kurOnerisi(c, rates, ratesErr);
  const o = kurOnerisi(g, rates, ratesErr);
  return o.deger ? { deger: yuvarla(1 / o.deger, 6), neden: null } : o;
};

// ── Kur ayrıştırıcısı (R5/2, AC-37) ─────────────────────────────────────────────────────────────────────────────────────
export const KUR_KAYNAK = { ELLE: "elle", ONERI: "oneri", TURETILEN: "turetilen" };
export const KUR_ONDALIK_ELLE = 4;
export const KUR_ONDALIK_EN_COK = 6;
export const KUR_BOS_HATASI = "Kur girilmedi; kur olmadan kaydedilmez.";
export const KUR_SAYI_HATASI = "Kur sayıya çevrilemedi. Örnek: 35,5";
export const KUR_POZITIF_HATASI = "Kur sıfırdan büyük olmalı.";
export const kurOndalikHatasi = (n) => `Kur en çok ${n} ondalık hane taşır.`;
export const kurCoz = (ham, { kaynak = KUR_KAYNAK.ELLE } = {}) => {
  const ondalik = kaynak === KUR_KAYNAK.ONERI || kaynak === KUR_KAYNAK.TURETILEN ? KUR_ONDALIK_EN_COK : KUR_ONDALIK_ELLE;
  if (typeof ham === "number") return Number.isFinite(ham) && ham > 0 ? { deger: ham, hata: null } : { deger: null, hata: KUR_POZITIF_HATASI };
  const t = String(ham ?? "").replace(/\s/g, "");
  if (!t) return { deger: null, hata: KUR_BOS_HATASI };
  if (t.startsWith("-")) return { deger: null, hata: KUR_POZITIF_HATASI };
  const m = /^(\d+)(?:[.,](\d+))?$/.exec(t);
  if (!m) return { deger: null, hata: KUR_SAYI_HATASI };
  if (m[2] && m[2].length > ondalik) return { deger: null, hata: kurOndalikHatasi(ondalik) };
  const n = Number(`${m[1]}.${m[2] || "0"}`);
  return n > 0 ? { deger: n, hata: null } : { deger: null, hata: KUR_POZITIF_HATASI };
};
export const kurGirdisi = (n) => (n == null || !(n > 0) ? "" : String(yuvarla(n, KUR_ONDALIK_EN_COK)).replace(".", ","));

// ── Çevrim (C4/2) ───────────────────────────────────────────────────────────────────────────────────────────────────────
// Ödeme: TL kuruşu ÷ kur = döviz kuruşu. Bozdurma: çıkan kuruşu × kur = giren kuruşu. Türetilen kur altı ondalık (P2).
export const dovizKurusu = (tlK, kur) => (kur > 0 ? Math.round(tlK / kur) : 0);
export const karsiKurusu = (cikanK, kur) => (kur > 0 ? Math.round(cikanK * kur) : 0);
export const kurTuret = (payK, paydaK) => (payK > 0 && paydaK > 0 ? yuvarla(payK / paydaK, KUR_ONDALIK_EN_COK) : null);
export const DOVIZ_SIFIR_HATASI = "Hesaptan çıkacak döviz tutar kuruşta sıfıra iniyor; tutarı ya da kuru düzeltin.";
export const KARSI_SIFIR_HATASI = "Giren hesaba eklenecek tutar kuruşta sıfıra iniyor; tutarı ya da kuru düzeltin.";
export const DOVIZ_TUTAR_HATASI = "Döviz tutar sayıya çevrilemedi. Örnek: 1.250,00";
export const DOVIZ_EKSI_HATASI = "Döviz tutar sıfırdan büyük olmalı.";
export const KARSI_EKSI_HATASI = "Giren tutar sıfırdan büyük olmalı.";
// tutarCoz { deger, bos, gecersiz } döndürür (form durumu ham metin, binlik nokta).
const kurusOf = (v) => { const t = tutarCoz(v); return !t.gecersiz && t.deger > 0 ? Math.round(t.deger * 100) : 0; };
const hamMetin = (k) => (k > 0 ? String(k / 100).replace(".", ",") : ""); // form durumu ham metin (0045)

// Satırın döviz bölümü (R3/2, AC-34): TL tutar çapadır; kur yazılınca döviz tutar, döviz tutar yazılınca kur türetilir; TL
// tutar değişince döviz tutar kurdan yeniden hesaplanır. Dönüş satıra uygulanacak yama. Ekran çevrim yazmaz (DoD taraması).
export const dovizSatirYamasi = (r, alan, deger) => {
  const s = { ...r, [alan]: deger };
  if (alan === "dovizTutar") {
    const k = kurTuret(kurusOf(s.tutar), kurusOf(deger));
    return k ? { dovizTutar: deger, kur: kurGirdisi(k), kurKaynak: KUR_KAYNAK.TURETILEN } : { dovizTutar: deger };
  }
  const kaynak = alan === "kur" ? KUR_KAYNAK.ELLE : s.kurKaynak;
  const kur = kurCoz(s.kur, { kaynak }).deger;
  const tlK = kurusOf(s.tutar);
  return { [alan]: deger, ...(alan === "kur" ? { kurKaynak: KUR_KAYNAK.ELLE } : {}), dovizTutar: kur && tlK ? hamMetin(dovizKurusu(tlK, kur)) : "" };
};
// Hesap değişince (R14/2, R1/3): TL ya da hesapsız satırda döviz alanları silinir; döviz hesapta kur önerisi (varsa) gelir.
// Triyaj (R14, AC-13): eski ve yeni hesap aynı döviz cinsindeyse yalnız hesap değişir, kayıtlı kur ve döviz tutar korunur
// (yanlış seçilmiş bankayı düzelten kullanıcı geçmiş kaydın kurunu sessizce değiştirmesin).
export const dovizHesapYamasi = (r, hesap, oneri, eskiHesap = null) => {
  const temiz = { kur: "", kurKaynak: null, dovizTutar: "" };
  if (!hesap || (hesap.paraBirimi || "TRY") === "TRY") return temiz;
  if (eskiHesap && (eskiHesap.paraBirimi || "TRY") === hesap.paraBirimi && String(r.kur ?? "").trim() !== "") return {};
  if (!(oneri?.deger > 0)) return temiz;
  const t = { kur: kurGirdisi(oneri.deger), kurKaynak: KUR_KAYNAK.ONERI };
  return { ...t, ...dovizSatirYamasi({ ...r, ...t }, "tutar", r.tutar) };
};
// Bozdurma penceresi (R11, AC-16): çıkan tutar çapadır; kur ya da karşı tutar yazılınca öteki türetilir.
export const bozdurmaYamasi = (f, alan, deger) => {
  const s = { ...f, [alan]: deger };
  if (alan === "karsiTutar") {
    const k = kurTuret(kurusOf(deger), kurusOf(s.tutar));
    return k ? { karsiTutar: deger, kur: kurGirdisi(k), kurKaynak: KUR_KAYNAK.TURETILEN } : { karsiTutar: deger };
  }
  const kaynak = alan === "kur" ? KUR_KAYNAK.ELLE : s.kurKaynak;
  const kur = kurCoz(s.kur, { kaynak }).deger;
  const cK = kurusOf(s.tutar);
  return { [alan]: deger, ...(alan === "kur" ? { kurKaynak: KUR_KAYNAK.ELLE } : {}), karsiTutar: kur && cK ? hamMetin(karsiKurusu(cK, kur)) : "" };
};
// Doğrulayıcıların ortak döviz okuması: { kur, kuruslar, hatalar }. ham: kullanıcının yazdığı türetilen değer (boşsa kurdan).
export const cevrimOku = ({ kur, kurKaynak, ham }, tabanK, yon) => {
  const k = kurCoz(kur, { kaynak: kurKaynak || KUR_KAYNAK.ELLE });
  if (k.hata) return { hata: { kur: k.hata } };
  let sonucK;
  if (String(ham ?? "").trim() !== "") {
    const t = tutarCoz(ham);
    if (t.gecersiz || t.deger == null) return { hata: { dovizTutar: DOVIZ_TUTAR_HATASI } };
    // Triyaj: eksi işaretli tutar (TutarInput eksiye izin verir) "kuruşta sıfıra iniyor" değil, kendi nedeniyle reddedilir.
    if (t.deger < 0) return { hata: yon === "bol" ? { dovizTutar: DOVIZ_EKSI_HATASI } : { karsiTutar: KARSI_EKSI_HATASI } };
    sonucK = Math.round(t.deger * 100);
  } else sonucK = yon === "bol" ? dovizKurusu(tabanK, k.deger) : karsiKurusu(tabanK, k.deger);
  if (!(sonucK > 0)) return { hata: yon === "bol" ? { dovizTutar: DOVIZ_SIFIR_HATASI } : { karsiTutar: KARSI_SIFIR_HATASI } };
  return { kur: k.deger, sonucK };
};

// ── Tek yazıcı (R14/2, Karar 12) ─────────────────────────────────────────────────────────────────────────────────────────
export const DOVIZ_ALANLARI = ["dovizTutar", "kur", "paraBirimi", "karsiTutar", "karsiParaBirimi"];
// Alanları her çağrıda siler, yalnız dolu değerleri yazar (`{ ...eski, ...yeni }` eski değeri taşımasın).
export const dovizAlanlariYaz = (kayit, alanlar = null) => {
  const r = { ...kayit };
  for (const a of DOVIZ_ALANLARI) delete r[a];
  if (alanlar) for (const a of DOVIZ_ALANLARI) if (alanlar[a] != null && alanlar[a] !== "") r[a] = alanlar[a];
  return r;
};
export const dovizAlanlariOf = (k) => Object.fromEntries(DOVIZ_ALANLARI.filter(a => k?.[a] != null).map(a => [a, k[a]]));
export const dovizOdemeMi = (m) => m?.tur === "odeme" && m.dovizTutar != null;
export const bozdurmaMi = (m) => m?.tur === "virman" && m.karsiTutar != null;

// ── Metinler (R15/3, AC-49) ─────────────────────────────────────────────────────────────────────────────────────────────
export const paraMetni = (n, pb = "TRY") => `${CUR_SYM[pb] || `${pb} `}${Number(n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const kurMetni = (kur) => Number(kur || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: KUR_ONDALIK_EN_COK });
export const BOZDURMA_IBARESI = "Bozdurma";
export const dovizOdemeIbaresi = (m) => (dovizOdemeMi(m) ? `${paraMetni(m.dovizTutar, m.paraBirimi)} · kur ${kurMetni(m.kur)} · TL karşılığı ${paraMetni(m.tutar, "TRY")}` : "");
export const bozdurmaIbaresi = (m) => (bozdurmaMi(m) ? `${BOZDURMA_IBARESI}: ${paraMetni(m.tutar, m.paraBirimi)} → ${paraMetni(m.karsiTutar, m.karsiParaBirimi)} · kur ${kurMetni(m.kur)}` : "");
export const CEK_DOVIZ_NEDENI = "Döviz hesapta çek yöntemleri seçilemez; çekle ödeme yalnız TL hesaptan yapılır.";
export const YALNIZ_TL_NEDENI = "Bu ödeme yalnız TL hesaptan yapılır.";
export const HESAP_YOK_NOTU = "Açık hesap yok. Ödeme hesapsız kaydedilir ve hiçbir bakiyeye girmez.";
// İz ayrıntısı (R14/4, AC-52).
export const dovizIzAyrintisi = (m) => (dovizOdemeMi(m) ? { dovizTutar: m.dovizTutar, kur: m.kur, paraBirimi: m.paraBirimi }
  : bozdurmaMi(m) ? { karsiTutar: m.karsiTutar, kur: m.kur, paraBirimi: m.paraBirimi, karsiParaBirimi: m.karsiParaBirimi } : {});
