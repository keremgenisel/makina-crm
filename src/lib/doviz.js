// Spec 0152: döviz hesaptan gider ödemesi ve bozdurma. Kur, çevrim, öneri ve döviz alanlarının TEK yeri (React ve saat okumaz).
// - Ödeme (R2/2): `tutar` TL kalır (kalemi kapatan), `dovizTutar` hesaptan çıkan, `kur` "1 birim = X TL", `paraBirimi` hesabın.
// - Bozdurma (R10/2, P4): `tutar` çıkan bacak, `karsiTutar` giren bacak, `kur` "1 çıkan birim = X giren birim", `paraBirimi`
//   çıkan, `karsiParaBirimi` giren bacağın para birimi. Aynı para birimindeki virmanda alanlar yazılmaz.
// - Kur kendi ayrıştırıcısıyla okunur (R5/2, Karar 8): virgül ve nokta ondalık; elle yazılan kur en çok dört, öneriden gelen ve
//   türetilen kur en çok altı ondalık (P3). Tutar ayrıştırıcısı kur için kullanılmaz (nokta orada binliktir).
// - Çevrim bir kez kuruşa yuvarlanır (C4/2); TL tutar ile döviz tutar asıl değerlerdir, kur bilgidir (P2).
import { tutarCoz } from "./gider";
import { KUR_ALINMADI, KUR_CEVRIMDISI, dovizMi, kurOnerisi, ONERI_BUGUN_IBARESI, KUR_KAYNAK, KUR_ONDALIK_ELLE, KUR_ONDALIK_EN_COK,
  KUR_BOS_HATASI, KUR_SAYI_HATASI, KUR_POZITIF_HATASI, kurOndalikHatasi, kurCoz, kurGirdisi, dovizKurusu, karsiKurusu, kurTuret,
  paraMetni, kurMetni, kurSatiriMetni, kurSapmaUyarisi, ondalikYuvarla as yuvarla } from "./kur";
// Spec 0153 C9/2: kur ilkelleri yaprak modülde (kur.js); 0152'nin adlarıyla buradan da dışa verilir.
export { KUR_ALINMADI, KUR_CEVRIMDISI, dovizMi, kurOnerisi, ONERI_BUGUN_IBARESI, KUR_KAYNAK, KUR_ONDALIK_ELLE, KUR_ONDALIK_EN_COK,
  KUR_BOS_HATASI, KUR_SAYI_HATASI, KUR_POZITIF_HATASI, kurOndalikHatasi, kurCoz, kurGirdisi, dovizKurusu, karsiKurusu, kurTuret,
  paraMetni, kurMetni, kurSatiriMetni, kurSapmaUyarisi };

export const IKI_DOVIZ_NEDENI = "İki döviz hesap arasında günün kuru önerilmez; kuru (1 çıkan birim kaç giren birim) elle yazın.";
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

// ── Çevrim (C4/2) ───────────────────────────────────────────────────────────────────────────────────────────────────────
// Ödeme: TL kuruşu ÷ kur = döviz kuruşu. Bozdurma: çıkan kuruşu × kur = giren kuruşu. Türetilen kur altı ondalık (P2).
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
// Spec 0155 R22/2: "bu hareket dövizdir" yüklemi türden bağımsız (döviz ödeme, döviz avans, dövizli mahsup); bozdurma kendi
// alanını (`karsiTutar`) taşır. Eski ad 0152 taramalarında geçtiği için aynı fonksiyon olarak yeniden dışa verilir.
export const dovizHareketMi = (m) => !!m && m.tur !== "virman" && m.dovizTutar != null;
export const dovizOdemeMi = dovizHareketMi;
export const bozdurmaMi = (m) => m?.tur === "virman" && m.karsiTutar != null;

// ── Metinler (R15/3, AC-49) ─────────────────────────────────────────────────────────────────────────────────────────────
export const BOZDURMA_IBARESI = "Bozdurma";
export const dovizOdemeIbaresi = (m) => (dovizOdemeMi(m) ? `${paraMetni(m.dovizTutar, m.paraBirimi)} · kur ${kurMetni(m.kur)} · TL karşılığı ${paraMetni(m.tutar, "TRY")}` : "");
export const bozdurmaIbaresi = (m) => (bozdurmaMi(m) ? `${BOZDURMA_IBARESI}: ${paraMetni(m.tutar, m.paraBirimi)} → ${paraMetni(m.karsiTutar, m.karsiParaBirimi)} · kur ${kurMetni(m.kur)}` : "");
export const CEK_DOVIZ_NEDENI = "Döviz hesapta çek yöntemleri seçilemez; çekle ödeme yalnız TL hesaptan yapılır.";
export const YALNIZ_TL_NEDENI = "Bu ödeme yalnız TL hesaptan yapılır.";
export const HESAP_YOK_NOTU = "Açık hesap yok. Ödeme hesapsız kaydedilir ve hiçbir bakiyeye girmez.";
// İz ayrıntısı (R14/4, AC-52).
export const dovizIzAyrintisi = (m) => (dovizOdemeMi(m) ? { dovizTutar: m.dovizTutar, kur: m.kur, paraBirimi: m.paraBirimi }
  : bozdurmaMi(m) ? { karsiTutar: m.karsiTutar, kur: m.kur, paraBirimi: m.paraBirimi, karsiParaBirimi: m.karsiParaBirimi } : {});
