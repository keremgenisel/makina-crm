// Gider kaydı ve dönemsel gider takibi: saf hesap motoru (spec 0001, plan K1–K38).
// React'sız; tüm tutarlar TL (C2), gider toplamlarına KDV hariç tutar girer (C1). Tarihler projenin
// konvansiyonuyla düz string ("YYYY-MM-DD", ay "YYYY-MM") karşılaştırılır, Date'e çevrilmez.
// Para hesabı kuruş tamsayısıyla yapılır (K32): kayan noktada 3 × 33.333,33 gibi toplamlar sahte
// "aşım" üretirdi. Dışarı TL (kuruş / 100) döner.
import { trLower, getKdvRateForDate } from "./utils";

export const DAVRANIS = { NORMAL: "normal", KIRA: "kira", PERSONEL: "personel" };
export const ATAMA = { ORTAK: "", MAKINA: "makina", MODEL: "model", DAGITMA: "dagitma" };

export const kurus = (x) => Math.round((Number(x) || 0) * 100);
export const tl = (k) => k / 100;
export const ayOf = (tarih) => String(tarih || "").slice(0, 7);

// ── Ay yardımcıları ───────────────────────────────────────────────────────────
export const ayEkle = (ay, n) => {
  const [y, m] = String(ay).split("-").map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
};
export const ayinSonGunu = (ay) => {
  const [y, m] = String(ay).split("-").map(Number);
  return `${ay}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
};
// Aralık tam aylardan oluşuyorsa ay listesini, değilse null döner (K1: KDV karşılaştırması ay bazlı).
export const tamAylar = (baslangic, bitis) => {
  if (!baslangic || !bitis || baslangic > bitis) return null;
  if (baslangic.slice(8) !== "01" || bitis !== ayinSonGunu(ayOf(bitis))) return null;
  const aylar = [];
  for (let a = ayOf(baslangic); a <= ayOf(bitis); a = ayEkle(a, 1)) aylar.push(a);
  return aylar;
};

// ── Tutar girişi ──────────────────────────────────────────────────────────────
// Serbest metin tutarı çözer. parseMoney'den farkı: harf içeren metni "geçersiz" sayar (AC-2: sayıya
// çevrilemeyen metin sıfır gibi sessizce kabul edilmez) ve eksi işaretini korur (negatif tutar reddi).
export const tutarCoz = (raw) => {
  if (raw == null || raw === "") return { bos: true, deger: 0, gecersiz: false };
  if (typeof raw === "number") return Number.isFinite(raw) ? { bos: false, deger: raw, gecersiz: false } : { bos: false, deger: 0, gecersiz: true };
  let t = String(raw).replace(/₺|TL|tl/g, "").replace(/\s/g, "");
  if (!t) return { bos: true, deger: 0, gecersiz: false };
  const eksi = t.startsWith("-");
  if (eksi) t = t.slice(1);
  if (!/^[0-9.,]+$/.test(t)) return { bos: false, deger: 0, gecersiz: true };
  // Türkçe biçim: nokta binlik, virgül ondalık. Yalnız noktalı "12.5" gibi girişte tek nokta ve ardından
  // 1–2 hane ondalık kabul edilir; "12.500" binliktir.
  if (!t.includes(",") && /^\d+\.\d{1,2}$/.test(t)) t = t.replace(".", ",");
  const n = parseFloat(t.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n)) return { bos: false, deger: 0, gecersiz: true };
  return { bos: false, deger: eksi ? -n : n, gecersiz: false };
};

// ── Kalem hesapları ───────────────────────────────────────────────────────────
export const turHaritasi = (turler = []) => new Map((turler || []).map(t => [String(t.id), t]));
export const davranisOf = (kalem, turMap) => turMap?.get(String(kalem?.turId))?.davranis || DAVRANIS.NORMAL;

// Kira (R6): stopaj ve KDV her zaman KDV hariç BRÜT üzerinden; nakit = brüt − stopaj + KDV.
export const kiraHesapla = ({ girisYonu = "brut", tutar, netTutar, stopajOrani = 0, kdvOrani = 0 }) => {
  const s = Number(stopajOrani) || 0;
  let brut, net;
  if (girisYonu === "net") {
    net = kurus(netTutar);
    brut = s >= 100 ? net : Math.round(net / (1 - s / 100));
  } else {
    brut = kurus(tutar);
    net = brut - Math.round(brut * s / 100);
  }
  const stopaj = brut - net;
  const kdv = Math.round(brut * (Number(kdvOrani) || 0) / 100);
  return { brut: tl(brut), stopaj: tl(stopaj), net: tl(net), kdv: tl(kdv), nakit: tl(net + kdv) };
};

const kalemKurus = (k, dav) => {
  if (dav === DAVRANIS.PERSONEL) return kurus(k.resmiTutar) + kurus(k.eldenTutar);
  return kurus(k.tutar);
};
const kdvKurus = (k, dav) => (dav === DAVRANIS.PERSONEL ? 0 : Math.round(kurus(k.tutar) * (Number(k.kdvOrani) || 0) / 100));
const stopajKurus = (k, dav) => (dav === DAVRANIS.KIRA ? Math.round(kurus(k.tutar) * (Number(k.stopajOrani) || 0) / 100) : 0);

// Gider toplamlarına giren tutar (KDV hariç; kira brüt; personel resmi + elden) — K19.
export const kalemTutari = (k, dav = DAVRANIS.NORMAL) => tl(kalemKurus(k, dav));
export const kalemKdv = (k, dav = DAVRANIS.NORMAL) => tl(kdvKurus(k, dav));
export const kalemStopaj = (k, dav = DAVRANIS.NORMAL) => tl(stopajKurus(k, dav));
// "Ödenecek tutar" (R14, K18): normal tutar + KDV; kira brüt − stopaj + KDV; personel resmi + elden.
// Stopaj vergi dairesine gider, tedarikçiye ödenecek tutara hiç girmez.
const odenecekKurus = (k, dav) => kalemKurus(k, dav) - stopajKurus(k, dav) + kdvKurus(k, dav);
export const odenecekTutar = (k, dav = DAVRANIS.NORMAL) => tl(odenecekKurus(k, dav));

export const vadesiGectiMi = (k, bugun) => !k?.odendi && !!k?.sonOdemeTarihi && k.sonOdemeTarihi < bugun;
// Ödeme durumu çevirme (spec 0003 plan H8): Giderler ve Anasayfa hatırlatma penceresi aynı kayıt dönüşümünü kullanır.
export const odemeDurumuDegistir = (k, bugun) => { const odendi = !k.odendi; return { ...k, odendi, odemeTarihi: odendi ? bugun : null }; };
// Yalnız "ödendi" yönü (Anasayfa hatırlatma penceresi, spec 0003 triyaj bulgu 3): durum çevrilmez, ayarlanır.
// Satır ekrandayken kalem başka yoldan (yeniden yükleme/birleştirme) zaten ödenmişse tıklama ödemeyi geri almaz,
// mevcut ödeme tarihi korunur.
export const odendiIsaretle = (k, bugun) => ({ ...k, odendi: true, odemeTarihi: k.odemeTarihi || bugun });

// ── Model satırları (R21, K31, K32) ──────────────────────────────────────────
export const modelSatirlariDogrula = (tutar, satirlar = []) => {
  const hatalar = [];
  const gorulen = new Set();
  let dagitilan = 0;
  (satirlar || []).forEach((s, i) => {
    const ad = String(s?.modelAd || "").trim();
    const birim = tutarCoz(s?.birimMaliyet);
    const adetRaw = s?.adet;
    const adet = typeof adetRaw === "number" ? adetRaw : Number(String(adetRaw ?? "").trim());
    if (!ad) hatalar.push({ satir: i, alan: "modelAd", mesaj: "Model seçilmedi." });
    else if (gorulen.has(trLower(ad))) hatalar.push({ satir: i, alan: "modelAd", mesaj: `“${ad}” modeli için zaten bir satır var. Bir modelden yalnız bir satır olabilir.` });
    if (ad) gorulen.add(trLower(ad));
    if (birim.gecersiz) hatalar.push({ satir: i, alan: "birimMaliyet", mesaj: "Birim maliyet sayıya çevrilemedi." });
    else if (birim.bos || birim.deger <= 0) hatalar.push({ satir: i, alan: "birimMaliyet", mesaj: "Birim maliyet sıfırdan büyük olmalı." });
    if (adetRaw === "" || adetRaw == null || !Number.isFinite(adet) || adet <= 0) hatalar.push({ satir: i, alan: "adet", mesaj: "Kaç makinalık olduğu sıfırdan büyük olmalı." });
    else if (!Number.isInteger(adet)) hatalar.push({ satir: i, alan: "adet", mesaj: "Makina adedi tam sayı olmalı." });
    if (!birim.gecersiz && birim.deger > 0 && Number.isInteger(adet) && adet > 0) dagitilan += kurus(birim.deger) * adet;
  });
  const tutarK = kurus(tutar);
  const asim = Math.max(0, dagitilan - tutarK);
  const fark = Math.max(0, tutarK - dagitilan);
  if (asim > 0) hatalar.push({ satir: null, alan: "toplam", mesaj: `Satır toplamı kalem tutarını ${tl(asim).toLocaleString("tr-TR")} ₺ aşıyor.` });
  return { hatalar, dagitilan: tl(dagitilan), fark: tl(fark), asim: tl(asim) };
};
export const modelSatirTutari = (s) => tl(kurus(tutarCoz(s?.birimMaliyet).deger) * (Number(s?.adet) || 0));

// ── Kalem doğrulama ve normalleştirme ─────────────────────────────────────────
// form: formdaki ham değerler (tutarlar metin olabilir). Dönen `kayit` saklanacak biçimdir; hata varsa null.
export const giderKalemDogrula = (form, { turMap, tedarikciler = [] } = {}) => {
  const hatalar = [];
  const uyarilar = [];
  const hata = (alan, mesaj) => hatalar.push({ alan, mesaj });
  const tur = form?.turId != null && form.turId !== "" ? turMap?.get(String(form.turId)) : null;
  if (!tur) hata("turId", "Gider türü seçilmedi.");
  if (!form?.tarih) hata("tarih", "Tarih girilmedi.");
  const dav = tur?.davranis || DAVRANIS.NORMAL;
  const kayit = { ...form };
  delete kayit._manual;

  if (dav === DAVRANIS.PERSONEL) {
    if (!form.calisanId) hata("calisanId", "Çalışan seçilmedi.");
    const r = tutarCoz(form.resmiTutar), e = tutarCoz(form.eldenTutar);
    if (r.gecersiz) hata("resmiTutar", "Tutar sayıya çevrilemedi. Örnek: 39.223,13");
    if (e.gecersiz) hata("eldenTutar", "Tutar sayıya çevrilemedi. Örnek: 15.000,00");
    if (!r.gecersiz && r.deger < 0) hata("resmiTutar", "Tutar negatif olamaz.");
    if (!e.gecersiz && e.deger < 0) hata("eldenTutar", "Tutar negatif olamaz.");
    if (!r.gecersiz && !e.gecersiz && r.deger >= 0 && e.deger >= 0 && kurus(r.deger) + kurus(e.deger) <= 0) hata("resmiTutar", "Tutar sıfırdan büyük olmalı.");
    kayit.resmiTutar = r.bos ? null : r.deger;
    kayit.eldenTutar = e.bos ? null : e.deger;
    kayit.tutar = null;
    kayit.kdvOrani = 0;
    kayit.tedarikciId = null;
    kayit.stopajOrani = null; kayit.girisYonu = null; kayit.netTutar = null;
  } else if (dav === DAVRANIS.KIRA) {
    const yon = form.girisYonu === "net" ? "net" : "brut";
    const raw = tutarCoz(yon === "net" ? form.netTutar : form.tutar);
    const alan = yon === "net" ? "netTutar" : "tutar";
    if (raw.gecersiz) hata(alan, "Tutar sayıya çevrilemedi. Örnek: 20.000,00");
    else if (raw.bos || raw.deger <= 0) hata(alan, "Tutar sıfırdan büyük olmalı.");
    const s = tutarCoz(form.stopajOrani);
    if (s.gecersiz || s.deger < 0 || s.deger >= 100) hata("stopajOrani", "Stopaj oranı 0 ile 100 arasında olmalı.");
    if (!raw.gecersiz && raw.deger > 0 && !s.gecersiz && s.deger >= 0 && s.deger < 100) {
      const h = kiraHesapla({ girisYonu: yon, tutar: raw.deger, netTutar: raw.deger, stopajOrani: s.deger });
      kayit.tutar = h.brut; kayit.netTutar = h.net;
    }
    kayit.girisYonu = yon;
    kayit.stopajOrani = s.gecersiz ? form.stopajOrani : s.deger;
    kayit.resmiTutar = null; kayit.eldenTutar = null; kayit.calisanId = null; kayit.calisanAd = null;
  } else {
    const t = tutarCoz(form.tutar);
    if (t.gecersiz) hata("tutar", "Tutar sayıya çevrilemedi. Örnek: 14.800,00");
    else if (t.bos || t.deger <= 0) hata("tutar", "Tutar sıfırdan büyük olmalı.");
    else kayit.tutar = t.deger;
    kayit.stopajOrani = null; kayit.girisYonu = null; kayit.netTutar = null;
    kayit.resmiTutar = null; kayit.eldenTutar = null; kayit.calisanId = null; kayit.calisanAd = null;
  }

  if (dav !== DAVRANIS.PERSONEL) {
    const k = tutarCoz(form.kdvOrani);
    if (k.gecersiz || k.deger < 0 || k.deger > 100) hata("kdvOrani", "KDV oranı 0 ile 100 arasında olmalı.");
    else kayit.kdvOrani = k.deger;
    if (form.tedarikciId && !tedarikciler.some(t => String(t.id) === String(form.tedarikciId))) hata("tedarikciId", "Seçilen tedarikçi bulunamadı.");
  }

  // Vade (R18, AC-71): tek alan; Çek'te etiket değişir.
  if (form.sonOdemeTarihi && form.tarih && form.sonOdemeTarihi < form.tarih) {
    hata("sonOdemeTarihi", `${form.odemeYontemi === "Çek" ? "Çek vade tarihi" : "Son ödeme tarihi"} gider tarihinden önce olamaz.`);
  }
  kayit.odendi = !!form.odendi;
  if (!kayit.odendi) kayit.odemeTarihi = null;

  // Atama (K25, K38): yalnız normal davranışta; kira ve personel her zaman ortak.
  if (dav !== DAVRANIS.NORMAL) {
    kayit.atamaTur = ""; kayit.makinaTur = null; kayit.makinaId = null; kayit.modelSatirlari = [];
  } else {
    const at = form.atamaTur || "";
    kayit.atamaTur = at;
    if (at !== ATAMA.MAKINA) { kayit.makinaTur = null; kayit.makinaId = null; }
    if (at !== ATAMA.MODEL) kayit.modelSatirlari = [];
    if (at === ATAMA.MAKINA && !form.makinaId) hata("makinaId", "Makina seçilmedi.");
    if (at === ATAMA.MODEL) {
      const satirlar = form.modelSatirlari || [];
      if (!satirlar.length) hata("modelSatirlari", "En az bir model satırı girin.");
      const d = modelSatirlariDogrula(kayit.tutar ?? 0, satirlar);
      d.hatalar.forEach(h => hatalar.push({ alan: "modelSatirlari", satir: h.satir, mesaj: h.mesaj }));
      if (!d.hatalar.length && d.fark > 0) uyarilar.push({ alan: "modelSatirlari", mesaj: `Dağıtılmayan ${d.fark.toLocaleString("tr-TR")} ₺ ortak gidere yazılacak.` });
      kayit.modelSatirlari = satirlar.map(s => ({ modelAd: String(s.modelAd || "").trim(), birimMaliyet: tutarCoz(s.birimMaliyet).deger, adet: Number(s.adet) }));
    }
  }
  return { hatalar, uyarilar, kayit: hatalar.length ? null : kayit };
};

// ── Makina ve model çözümü (K3, K26, K35) ─────────────────────────────────────
// Makina bağı okuma anında çözülür: stok satırı satıldıysa (stoktan fiziken silinir) müşteri kaydının
// sourceStockId'si üzerinden takip edilir. Çöpteki veya bulunamayan makina → null (kalem ortak).
export const makinaGideriCoz = (k, { stock = [], customers = [] } = {}) => {
  if (!k?.makinaId) return null;
  const id = String(k.makinaId);
  if (k.makinaTur === "stok") {
    const s = stock.find(x => String(x.id) === id);
    if (s && !s.deletedAt) return { tur: "stok", id: s.id, model: s.model, seri: s.serialNo || s.seriNo || "", ad: "Makina Stoğu" };
    const c = customers.find(x => x.sourceStockId != null && String(x.sourceStockId) === id);
    if (c && !c.deletedAt) return { tur: "musteri", id: c.id, model: c.model, seri: c.serialNo || "", ad: c.name || c.firma || "", stoktanTakip: true };
    return null;
  }
  const c = customers.find(x => String(x.id) === id);
  if (c && !c.deletedAt) return { tur: "musteri", id: c.id, model: c.model, seri: c.serialNo || "", ad: c.name || c.firma || "" };
  return null;
};
// Rapor gibi çok kalemli hesaplar için: stok ve müşteriler BİR KEZ haritaya alınır, her kalem sabit
// zamanda çözülür (makinaGideriCoz her çağrıda diziyi doğrusal tarar). Sonuç makinaGideriCoz ile aynıdır.
export const makinaCozucuOlustur = ({ stock = [], customers = [] } = {}) => {
  const stokMap = new Map(stock.map(x => [String(x.id), x]));
  const musteriMap = new Map(customers.map(x => [String(x.id), x]));
  const kaynakMap = new Map();
  customers.forEach(x => { if (x.sourceStockId != null && !kaynakMap.has(String(x.sourceStockId))) kaynakMap.set(String(x.sourceStockId), x); });
  const musteriOzet = (c, ek) => ({ tur: "musteri", id: c.id, model: c.model, seri: c.serialNo || "", ad: c.name || c.firma || "", ...ek });
  return (k) => {
    if (!k?.makinaId) return null;
    const id = String(k.makinaId);
    if (k.makinaTur === "stok") {
      const st = stokMap.get(id);
      if (st && !st.deletedAt) return { tur: "stok", id: st.id, model: st.model, seri: st.serialNo || st.seriNo || "", ad: "Makina Stoğu" };
      const c = kaynakMap.get(id);
      return c && !c.deletedAt ? musteriOzet(c, { stoktanTakip: true }) : null;
    }
    const c = musteriMap.get(id);
    return c && !c.deletedAt ? musteriOzet(c) : null;
  };
};
export const canliModelSeti = (standardModels = [], customModels = []) =>
  new Set([...(standardModels || []), ...(customModels || []).filter(m => !m.deletedAt)].map(m => trLower(m.model)));

// Tutar bazlı kova bölmesi (K33, AC-82). Dönen değerler TL; toplamları kalem tutarına kuruşu kuruşuna eşittir.
// İç hesap: kuruş cinsinden kovalar. makinaCozuldu = kalemin makinası çözülebildi mi (çağıran bir kez çözer).
const kovaKurus = (k, davranis, makinaCozuldu, canliModeller) => {
  const top = kalemKurus(k, davranis);
  const r = { makina: 0, model: 0, dagitma: 0, ortak: 0 };
  if (davranis !== DAVRANIS.NORMAL) r.ortak = top;
  else if (k.atamaTur === ATAMA.DAGITMA) r.dagitma = top;
  else if (k.atamaTur === ATAMA.MAKINA && makinaCozuldu) r.makina = top;
  else if (k.atamaTur === ATAMA.MODEL) {
    let m = 0;
    (k.modelSatirlari || []).forEach(s => {
      if (canliModeller.has(trLower(s.modelAd))) m += kurus(s.birimMaliyet) * (Number(s.adet) || 0);
    });
    r.model = Math.min(m, top);
    r.ortak = top - r.model;
  } else r.ortak = top;
  return r;
};
// Makina maliyeti motoru (spec 0002 R2) için kuruş cinsinden aynı kova bölmesi: 0001'in kuralı burada tek
// kaynaktır, 0002 yeniden türetmez. makinaCoz = makinaCozucuOlustur(...) çıktısı; dönen `makina` çözülen makina.
export const kalemKovalariKurus = (k, { davranis = DAVRANIS.NORMAL, makinaCoz, canliModeller = new Set() } = {}) => {
  const makina = davranis === DAVRANIS.NORMAL && k.atamaTur === ATAMA.MAKINA && makinaCoz ? makinaCoz(k) : null;
  return { ...kovaKurus(k, davranis, !!makina, canliModeller), makinaCozum: makina };
};
export const kovaDagilimi = (k, { davranis = DAVRANIS.NORMAL, stock = [], customers = [], canliModeller = new Set() } = {}) => {
  const cozuldu = davranis === DAVRANIS.NORMAL && k.atamaTur === ATAMA.MAKINA && !!makinaGideriCoz(k, { stock, customers });
  const r = kovaKurus(k, davranis, cozuldu, canliModeller);
  return { makina: tl(r.makina), model: tl(r.model), dagitma: tl(r.dagitma), ortak: tl(r.ortak) };
};

// ── Yürürlük ayı (R10) ────────────────────────────────────────────────────────
export const yururlukKapsami = ({ baslangic, bitis }, yururlukAy) => {
  if (!yururlukAy) return { durum: "tam", etkinBaslangic: baslangic, kapsamDisi: null };
  const esik = `${yururlukAy}-01`;
  if (bitis < esik) return { durum: "oncesi", etkinBaslangic: null, kapsamDisi: { baslangic, bitis } };
  if (baslangic < esik) {
    const gun = new Date(`${esik}T00:00:00`); gun.setDate(gun.getDate() - 1);
    const onceki = `${gun.getFullYear()}-${String(gun.getMonth() + 1).padStart(2, "0")}-${String(gun.getDate()).padStart(2, "0")}`;
    return { durum: "kismi", etkinBaslangic: esik, kapsamDisi: { baslangic, bitis: onceki } };
  }
  return { durum: "tam", etkinBaslangic: baslangic, kapsamDisi: null };
};
export const esikAltiKalemSayisi = (giderler = [], yururlukAy) =>
  yururlukAy ? giderler.filter(k => !k.deletedAt && k.tarih && k.tarih < `${yururlukAy}-01`).length : 0;

// ── Tekrarlayan kalem üretimi (R3, R4, K2, K8, K9, K17, K36) ──────────────────
export const tanimAyaUyarMi = (t, ay) => !!t?.baslangicAy && t.baslangicAy <= ay && (!t.bitisAy || ay <= t.bitisAy);

export const tekrarlayanUret = (tanimlar = [], giderler = [], ay, { turMap, calisanlar = [], giderAyarlari = {}, kdvRates, uid } = {}) => {
  const yeniKalemler = [];
  const guncelTanimlar = [];
  let eklenen = 0, zatenVardi = 0;
  const aralikDisi = [];
  const atlanan = [];
  const tarih = `${ay}-01`;
  for (const t of tanimlar) {
    if (!tanimAyaUyarMi(t, ay)) { aralikDisi.push(t); guncelTanimlar.push(t); continue; }
    const uretilen = Array.isArray(t.uretilenAylar) ? t.uretilenAylar : [];
    const kalemVar = giderler.some(k => !k.deletedAt && String(k.tanimId) === String(t.id) && k.donem === ay);
    if (uretilen.includes(ay) || kalemVar) {
      zatenVardi++;
      guncelTanimlar.push(uretilen.includes(ay) ? t : { ...t, uretilenAylar: [...uretilen, ay].sort() });
      continue;
    }
    const dav = turMap?.get(String(t.turId))?.davranis || DAVRANIS.NORMAL;
    const kalem = {
      id: uid ? uid() : undefined, tarih, turId: t.turId, aciklama: t.ad || "", tanimId: t.id, donem: ay,
      odendi: false, odemeTarihi: null, odemeYontemi: t.odemeYontemi || "", sonOdemeTarihi: null,
      tedarikciId: dav === DAVRANIS.PERSONEL ? null : (t.tedarikciId ?? null),
      atamaTur: "", makinaTur: null, makinaId: null, modelSatirlari: [],
    };
    if (dav === DAVRANIS.PERSONEL) {
      const c = calisanlar.find(x => String(x.id) === String(t.calisanId) && !x.deletedAt);
      const r = tutarCoz(c?.resmiMaliyet), e = tutarCoz(c?.eldenMaliyet);
      if (!c) { atlanan.push({ tanim: t, neden: "Çalışan bulunamadı." }); guncelTanimlar.push(t); continue; }
      if (kurus(r.deger) + kurus(e.deger) <= 0) { atlanan.push({ tanim: t, neden: `${c.ad} için aylık maliyet girilmemiş.` }); guncelTanimlar.push(t); continue; }
      Object.assign(kalem, { calisanId: c.id, calisanAd: c.ad, aciklama: t.ad || c.ad, resmiTutar: r.bos ? null : r.deger, eldenTutar: e.bos ? null : e.deger, tutar: null, kdvOrani: 0 });
    } else if (dav === DAVRANIS.KIRA) {
      const stopaj = Number(giderAyarlari?.stopajOrani) || 0;
      const yon = t.girisYonu === "net" ? "net" : "brut";
      const h = kiraHesapla({ girisYonu: yon, tutar: t.tutar, netTutar: t.tutar, stopajOrani: stopaj });
      Object.assign(kalem, { girisYonu: yon, tutar: h.brut, netTutar: h.net, stopajOrani: stopaj, kdvOrani: t.kdvOrani ?? getKdvRateForDate(tarih, kdvRates) });
    } else {
      Object.assign(kalem, { tutar: Number(t.tutar) || 0, kdvOrani: t.kdvOrani ?? getKdvRateForDate(tarih, kdvRates) });
      if (t.atamaTur === ATAMA.MAKINA) Object.assign(kalem, { atamaTur: t.atamaTur, makinaTur: t.makinaTur, makinaId: t.makinaId });
      else if (t.atamaTur === ATAMA.DAGITMA) kalem.atamaTur = t.atamaTur;
      else if (t.atamaTur === ATAMA.MODEL) Object.assign(kalem, { atamaTur: t.atamaTur, modelSatirlari: (t.modelSatirlari || []).map(s => ({ ...s })) });
    }
    yeniKalemler.push(kalem);
    guncelTanimlar.push({ ...t, uretilenAylar: [...uretilen, ay].sort() });
    eklenen++;
  }
  return { yeniKalemler, guncelTanimlar, eklenen, zatenVardi, aralikDisi, atlanan };
};

// Çalışan silinince açık tanım kapatılır (R5, K28): bitiş = son üretilen ay; hiç üretilmemişse boş aralık.
export const tanimKapat = (t) => {
  const u = (t.uretilenAylar || []).slice().sort();
  return { ...t, bitisAy: u.length ? u[u.length - 1] : ayEkle(t.baslangicAy, -1), kapatildi: true };
};
export const acikTanimMi = (t, buAy) => !t.bitisAy || t.bitisAy >= buAy;

// ── Mükerrer ve kullanım kontrolleri ──────────────────────────────────────────
export const personelMukerrer = (giderler = [], { calisanId, tarih, id }) =>
  calisanId && tarih ? giderler.filter(k => !k.deletedAt && String(k.calisanId) === String(calisanId) && ayOf(k.tarih) === ayOf(tarih) && String(k.id) !== String(id)) : [];

export const turKullanim = (turId, giderler = [], tanimlar = []) => ({
  kalem: giderler.filter(k => String(k.turId) === String(turId)).length,
  cop: giderler.filter(k => String(k.turId) === String(turId) && k.deletedAt).length,
  tanim: tanimlar.filter(t => String(t.turId) === String(turId)).length,
});
export const tedarikciKullanim = (tedId, giderler = [], tanimlar = []) => ({
  kalem: giderler.filter(k => String(k.tedarikciId) === String(tedId)).length,
  cop: giderler.filter(k => String(k.tedarikciId) === String(tedId) && k.deletedAt).length,
  tanim: tanimlar.filter(t => String(t.tedarikciId) === String(tedId)).length,
});
export const tedarikciAdHatasi = (ad, tedarikciler = [], haricId = null) => {
  const a = String(ad || "").trim();
  if (!a) return "Tedarikçi adı boş olamaz.";
  const var_ = tedarikciler.find(t => String(t.id) !== String(haricId) && trLower(String(t.ad).trim()) === trLower(a));
  return var_ ? `Bu adda bir tedarikçi zaten var: “${var_.ad}”.` : null;
};
export const modelKullanim = (modelAd, giderler = [], tanimlar = []) => {
  const m = trLower(modelAd);
  const has = (x) => (x.modelSatirlari || []).some(s => trLower(s.modelAd) === m);
  return { kalem: giderler.filter(k => !k.deletedAt && has(k)).length, tanim: tanimlar.filter(has).length };
};
// Silme onayı için: bu makinaya atanmış canlı gider kalemi sayısı (R7). Müşteri makinası hem kendi id'si
// hem de stoktan satıldıysa kaynak stok satırının id'si üzerinden bağlanmış olabilir (K3).
export const makinaGiderSayisi = (giderler = [], { musteriId = null, stokId = null, sourceStockId = null } = {}) => {
  const e = (a, b) => a != null && b != null && String(a) === String(b);
  return giderler.filter(g => !g.deletedAt && g.atamaTur === ATAMA.MAKINA && (
    (g.makinaTur === "musteri" && e(g.makinaId, musteriId)) ||
    (g.makinaTur === "stok" && (e(g.makinaId, stokId) || e(g.makinaId, sourceStockId)))
  )).length;
};
export const modelAdiTasi = (liste = [], eski, yeni) =>
  liste.map(x => ((x.modelSatirlari || []).some(s => s.modelAd === eski)
    ? { ...x, modelSatirlari: x.modelSatirlari.map(s => (s.modelAd === eski ? { ...s, modelAd: yeni } : s)) } : x));

// ── Dönem raporu (R8, R12–R17, R20, R21) ──────────────────────────────────────
const tedAdi = (tedMap, id) => tedMap.get(String(id))?.ad || "";

export const hesaplaGiderRaporu = (
  { giderler = [], turler = [], tedarikciler = [], stock = [], customers = [], canliModeller = new Set(), yururlukAy = null },
  { baslangic, bitis },
  { bugun } = {},
) => {
  const turMap = turHaritasi(turler);
  const tedMap = new Map(tedarikciler.map(t => [String(t.id), t]));
  const makinaCoz = makinaCozucuOlustur({ stock, customers });
  const kapsam = yururlukKapsami({ baslangic, bitis }, yururlukAy);
  const bos = { yururlukOncesi: kapsam.durum === "oncesi", kapsamDisi: kapsam.kapsamDisi, bos: true };
  if (kapsam.durum === "oncesi") return { ...bos, kalemler: [] };
  const bas = kapsam.etkinBaslangic;
  const canli = giderler.filter(k => !k.deletedAt);
  const kalemler = canli.filter(k => k.tarih >= bas && k.tarih <= bitis);

  const turKir = new Map();
  let toplam = 0, odenen = 0, odenmeyen = 0, odenmeyenAdet = 0, stopaj = 0, indKdv = 0;
  const kova = { makina: 0, model: 0, dagitma: 0, ortak: 0 };
  const kovaKatki = { makina: 0, model: 0, dagitma: 0, ortak: 0 };
  const stopajSatirlari = [];
  const makinaMap = new Map();
  const modelMap = new Map();
  const dagitmaKalemleri = [];
  const kismiOrtak = [];
  const dusenAtamalar = [];
  const tedHarcama = new Map();
  let secilmemisHarcama = 0, secilmemisAdet = 0;
  const mukerrer = new Map();

  for (const k of kalemler) {
    const dav = davranisOf(k, turMap);
    const tut = kalemKurus(k, dav);
    toplam += tut;
    if (k.odendi) odenen += tut; else { odenmeyen += tut; odenmeyenAdet++; }
    indKdv += kdvKurus(k, dav);
    if (dav === DAVRANIS.KIRA) {
      const s = stopajKurus(k, dav);
      stopaj += s;
      stopajSatirlari.push({ kalemId: k.id, tarih: k.tarih, aciklama: k.aciklama, brut: tl(tut), stopajOrani: Number(k.stopajOrani) || 0, stopaj: tl(s), girisYonu: k.girisYonu });
    }
    const tur = turMap.get(String(k.turId));
    const tk = String(k.turId);
    if (!turKir.has(tk)) turKir.set(tk, { turId: k.turId, ad: tur?.ad || "(türsüz)", davranis: dav, toplam: 0, adet: 0, calisanlar: dav === DAVRANIS.PERSONEL ? new Map() : null });
    const tr = turKir.get(tk);
    tr.toplam += tut; tr.adet++;
    if (tr.calisanlar) {
      const ck = String(k.calisanId);
      if (!tr.calisanlar.has(ck)) tr.calisanlar.set(ck, { calisanId: k.calisanId, ad: k.calisanAd || "", resmi: 0, elden: 0, toplam: 0 });
      const c = tr.calisanlar.get(ck);
      c.resmi += kurus(k.resmiTutar); c.elden += kurus(k.eldenTutar); c.toplam += tut;
    }

    const cz = dav === DAVRANIS.NORMAL && k.atamaTur === ATAMA.MAKINA ? makinaCoz(k) : null;
    const kv = kovaKurus(k, dav, !!cz, canliModeller);
    for (const key of Object.keys(kova)) { kova[key] += kv[key]; if (kv[key] > 0) kovaKatki[key]++; }
    if (kv.makina > 0) {
      const key = `${cz.tur}:${cz.id}`;
      if (!makinaMap.has(key)) makinaMap.set(key, { anahtar: key, makina: cz, toplam: 0, kalemler: [] });
      const m = makinaMap.get(key); m.toplam += kv.makina; m.kalemler.push(k);
    }
    if (dav === DAVRANIS.NORMAL && k.atamaTur === ATAMA.MAKINA && kv.makina === 0) dusenAtamalar.push({ kalem: k, neden: "makina" });
    if (dav === DAVRANIS.NORMAL && k.atamaTur === ATAMA.MODEL) {
      (k.modelSatirlari || []).forEach(s => {
        const st = kurus(s.birimMaliyet) * (Number(s.adet) || 0);
        if (!canliModeller.has(trLower(s.modelAd))) { dusenAtamalar.push({ kalem: k, neden: "model", modelAd: s.modelAd, tutar: tl(st) }); return; }
        const mk = trLower(s.modelAd);
        if (!modelMap.has(mk)) modelMap.set(mk, { model: s.modelAd, toplam: 0, satirlar: [] });
        const mm = modelMap.get(mk);
        mm.toplam += st;
        mm.satirlar.push({ kalemId: k.id, tarih: k.tarih, aciklama: k.aciklama, birimMaliyet: Number(s.birimMaliyet) || 0, adet: Number(s.adet) || 0, tutar: tl(st) });
      });
      if (kv.ortak > 0) kismiOrtak.push({ kalem: k, tutar: tl(kv.ortak) });
    }
    if (kv.dagitma > 0) dagitmaKalemleri.push(k);

    if (dav !== DAVRANIS.PERSONEL) {
      if (k.tedarikciId && tedMap.has(String(k.tedarikciId))) tedHarcama.set(String(k.tedarikciId), (tedHarcama.get(String(k.tedarikciId)) || 0) + tut);
      else { secilmemisHarcama += tut; secilmemisAdet++; }
    }
    if (k.tanimId != null && k.donem) {
      const mk = `${k.tanimId}|${k.donem}`;
      mukerrer.set(mk, [...(mukerrer.get(mk) || []), k]);
    }
  }

  // Açık borç dönemden bağımsızdır (R14, AC-59): yürürlük ayından bugüne kadarki ödenmemiş kalemler.
  const esik = yururlukAy ? `${yururlukAy}-01` : "";
  const borcKalemleri = canli.filter(k => !k.odendi && k.tarih >= esik && (!bugun || k.tarih <= bugun));
  const tedBorc = new Map();
  const tedVade = new Set();
  let secilmemisBorc = 0;
  for (const k of borcKalemleri) {
    const dav = davranisOf(k, turMap);
    if (dav === DAVRANIS.PERSONEL) continue;
    const o = odenecekKurus(k, dav);
    if (k.tedarikciId && tedMap.has(String(k.tedarikciId))) {
      tedBorc.set(String(k.tedarikciId), (tedBorc.get(String(k.tedarikciId)) || 0) + o);
      if (bugun && vadesiGectiMi(k, bugun)) tedVade.add(String(k.tedarikciId));
    } else secilmemisBorc += o;
  }
  const tedIds = new Set([...tedHarcama.keys(), ...tedBorc.keys()]);
  const tedSatirlari = [...tedIds].map(id => ({
    tedarikciId: id, ad: tedAdi(tedMap, id), harcama: tl(tedHarcama.get(id) || 0), acikBorc: tl(tedBorc.get(id) || 0), vadesiGecti: tedVade.has(id),
  })).sort((a, b) => (b.harcama - a.harcama) || a.ad.localeCompare(b.ad, "tr"));

  const turKirilimi = [...turKir.values()].map(t => ({
    ...t, toplam: tl(t.toplam),
    calisanlar: t.calisanlar ? [...t.calisanlar.values()].map(c => ({ ...c, resmi: tl(c.resmi), elden: tl(c.elden), toplam: tl(c.toplam) })).sort((a, b) => a.ad.localeCompare(b.ad, "tr")) : null,
  })).sort((a, b) => b.toplam - a.toplam);

  return {
    yururlukOncesi: false,
    kapsamDisi: kapsam.kapsamDisi,
    bos: kalemler.length === 0,
    kalemler,
    toplam: tl(toplam), odenen: tl(odenen), odenmeyen: tl(odenmeyen), odenmeyenAdet,
    stopajToplam: tl(stopaj), stopajSatirlari, indirilecekKdv: tl(indKdv),
    kovalar: { makina: tl(kova.makina), model: tl(kova.model), dagitma: tl(kova.dagitma), ortak: tl(kova.ortak) },
    kovaKatki,
    makinaBazli: [...makinaMap.values()].map(m => ({ ...m, toplam: tl(m.toplam) })).sort((a, b) => b.toplam - a.toplam),
    modelBazli: [...modelMap.values()].map(m => ({ ...m, toplam: tl(m.toplam) })).sort((a, b) => b.toplam - a.toplam),
    dagitmaKalemleri, kismiOrtak, dusenAtamalar,
    turKirilimi,
    tedarikciKirilimi: {
      satirlar: tedSatirlari,
      secilmemis: { harcama: tl(secilmemisHarcama), adet: secilmemisAdet, acikBorc: tl(secilmemisBorc) },
      toplamHarcama: tl([...tedHarcama.values()].reduce((a, b) => a + b, 0) + secilmemisHarcama),
      // tedarikciBorcu: yalnız tedarikçisi seçilmiş kalemler ("Tedarikçilere açık borç" kartı). toplamBorc:
      // "tedarikçi seçilmemiş" grubu dahil (kırılım tablosunun alt toplamı, satırlarla tutarlı).
      tedarikciBorcu: tl([...tedBorc.values()].reduce((a, b) => a + b, 0)),
      toplamBorc: tl([...tedBorc.values()].reduce((a, b) => a + b, 0) + secilmemisBorc),
    },
    mukerrerUyari: [...mukerrer.values()].filter(v => v.length > 1).map(v => ({ tanimId: v[0].tanimId, donem: v[0].donem, aciklama: v[0].aciklama, kalemler: v })),
  };
};

// "Kime ne kadar borçluyuz" (R19, K30): dönemden bağımsız, tutara göre çoktan aza.
export const borcOzeti = (giderler = [], { turler = [], tedarikciler = [], yururlukAy = null } = {}, bugun) => {
  const turMap = turHaritasi(turler);
  const tedMap = new Map(tedarikciler.map(t => [String(t.id), t]));
  const esik = yururlukAy ? `${yururlukAy}-01` : "";
  const ted = new Map();
  const cal = new Map();
  const secilmemis = { tutar: 0, adet: 0, vadesiGecti: false, kalemler: [] };
  for (const k of giderler) {
    if (k.deletedAt || k.odendi || !k.tarih || k.tarih < esik || (bugun && k.tarih > bugun)) continue;
    const dav = davranisOf(k, turMap);
    const o = odenecekKurus(k, dav);
    if (o <= 0) continue;
    const gecti = bugun ? vadesiGectiMi(k, bugun) : false;
    if (dav === DAVRANIS.PERSONEL) {
      const ck = String(k.calisanId);
      if (!cal.has(ck)) cal.set(ck, { calisanId: k.calisanId, ad: k.calisanAd || "", tutar: 0, vadesiGecti: false, kalemler: [] });
      const c = cal.get(ck); c.tutar += o; c.vadesiGecti = c.vadesiGecti || gecti; c.kalemler.push(k);
    } else if (k.tedarikciId && tedMap.has(String(k.tedarikciId))) {
      const tk = String(k.tedarikciId);
      if (!ted.has(tk)) ted.set(tk, { tedarikciId: k.tedarikciId, ad: tedMap.get(tk).ad, tutar: 0, vadesiGecti: false, kalemler: [] });
      const t = ted.get(tk); t.tutar += o; t.vadesiGecti = t.vadesiGecti || gecti; t.kalemler.push(k);
    } else { secilmemis.tutar += o; secilmemis.adet++; secilmemis.vadesiGecti = secilmemis.vadesiGecti || gecti; secilmemis.kalemler.push(k); }
  }
  const satirlar = [...ted.values()].map(t => ({ tur: "tedarikci", ...t, tutar: tl(t.tutar) }));
  if (secilmemis.tutar > 0) satirlar.push({ tur: "secilmemis", ad: "Tedarikçi seçilmemiş", ...secilmemis, tutar: tl(secilmemis.tutar) });
  if (cal.size) {
    const ayrinti = [...cal.values()].map(c => ({ ...c, tutar: tl(c.tutar) })).sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
    satirlar.push({ tur: "calisanlar", ad: `Çalışanlar · ${cal.size} kişi`, kisi: cal.size, tutar: tl([...cal.values()].reduce((a, c) => a + c.tutar, 0)), vadesiGecti: ayrinti.some(c => c.vadesiGecti), ayrinti });
  }
  satirlar.sort((a, b) => b.tutar - a.tutar);
  return { satirlar, toplam: tl(satirlar.reduce((a, s) => a + kurus(s.tutar), 0)) };
};

// ── KDV karşılaştırması (R9, C10, K1) ─────────────────────────────────────────
// hesaplananKdvObj: aylık rapor motorunun toplamKdv'si ({TRY, USD, EUR}); satış KDV'si burada YENİDEN
// HESAPLANMAZ. Yalnız TL karşılaştırılır, diğer para birimleri ayrıca listelenir (AC-15).
export const kdvKarsilastir = (hesaplananKdvObj = {}, indirilecekTL = 0) => {
  const hesaplanan = kurus(hesaplananKdvObj?.TRY);
  const ind = kurus(indirilecekTL);
  const fark = hesaplanan - ind;
  const haricTutarlar = Object.entries(hesaplananKdvObj || {})
    .filter(([cur, v]) => cur !== "TRY" && Math.abs(Number(v) || 0) > 0.004)
    .map(([cur, v]) => ({ para: cur, tutar: Math.round((Number(v) || 0) * 100) / 100 }));
  return { hesaplananTL: tl(hesaplanan), indirilecek: tl(ind), fark: tl(fark), odenecek: tl(Math.max(0, fark)), devreden: tl(Math.max(0, -fark)), haricTutarlar };
};
export const kdvObjTopla = (...objs) => {
  const r = {};
  objs.forEach(o => { for (const k in (o || {})) r[k] = (r[k] || 0) + (Number(o[k]) || 0); });
  return r;
};

// ── Aylık standart genel gider (R22, K37) ─────────────────────────────────────
// Bütçe/varsayım rakamıdır; dönem gider raporu bu listeyi HİÇ almaz (AC-93). Yalnız 0002 tüketir.
// Bir grubun o ayda geçerli TEK sürümü: aralığa uyanlardan başlangıcı en geç olan. Çoklu kullanıcı
// birleştirmesi yalnız eklemeleri taşıdığından (eski sürümün kapatılması bir düzenlemedir, kaybolabilir)
// bir grupta iki açık sürüm kalabilir; o ay yine yalnız bir kez sayılır.
const aydaGecerliSurum = (surumler, ay) => surumler
  .filter(s => s.baslangicAy && s.baslangicAy <= ay && (!s.bitisAy || ay <= s.bitisAy))
  .reduce((en, s) => (!en || s.baslangicAy > en.baslangicAy ? s : en), null);
const grupla = (liste) => {
  const g = new Map();
  for (const s of liste || []) { const k = String(s.grupId ?? s.id); if (!g.has(k)) g.set(k, []); g.get(k).push(s); }
  return g;
};
export const standartGiderAyi = (liste = [], ay) => {
  const satirlar = [...grupla(liste).values()].map(sr => aydaGecerliSurum(sr, ay)).filter(Boolean);
  return { satirlar, toplam: tl(satirlar.reduce((a, s) => a + kurus(s.tutar), 0)) };
};
const grupSurumleri = (liste, grupId) => liste.filter(s => String(s.grupId) === String(grupId)).sort((a, b) => a.baslangicAy.localeCompare(b.baslangicAy));

export const standartYeni = (liste = [], { ad, tutar, baslangicAy }, uid) => {
  const a = String(ad || "").trim();
  const t = tutarCoz(tutar);
  if (!a) return { hata: "Ad boş olamaz." };
  if (t.gecersiz) return { hata: "Tutar sayıya çevrilemedi." };
  if (t.bos || t.deger <= 0) return { hata: "Tutar sıfırdan büyük olmalı." };
  if (!baslangicAy) return { hata: "Geçerlilik başlangıç ayı seçilmedi." };
  const id = uid();
  return { liste: [...liste, { id, grupId: id, ad: a, tutar: t.deger, baslangicAy, bitisAy: null }] };
};
// Tutar değişikliği her zaman yeni sürümdür (AC-96): önceki sürüm bir önceki ayda kapanır.
export const standartTutarDegistir = (liste = [], grupId, { tutar, baslangicAy }, uid) => {
  const surumler = grupSurumleri(liste, grupId);
  const acik = surumler.find(s => !s.bitisAy) || surumler[surumler.length - 1];
  if (!acik) return { hata: "Kayıt bulunamadı." };
  const t = tutarCoz(tutar);
  if (t.gecersiz) return { hata: "Tutar sayıya çevrilemedi." };
  if (t.bos || t.deger <= 0) return { hata: "Tutar sıfırdan büyük olmalı." };
  if (!baslangicAy || baslangicAy <= acik.baslangicAy) return { hata: `Yeni geçerlilik ayı ${acik.baslangicAy} sonrasında olmalı.` };
  const yeni = { id: uid(), grupId: acik.grupId, ad: acik.ad, tutar: t.deger, baslangicAy, bitisAy: acik.bitisAy && acik.bitisAy >= baslangicAy ? acik.bitisAy : null };
  // Önceki sürüm yeni başlangıçtan bir ay önce kapanır; zaten daha erken sona erdiyse bitişine dokunulmaz
  // (sona erdirilmiş kalem geriye doğru yeniden açılmasın).
  const onceki = ayEkle(baslangicAy, -1);
  const eskiBitis = acik.bitisAy && acik.bitisAy < onceki ? acik.bitisAy : onceki;
  return { liste: [...liste.map(s => (s.id === acik.id ? { ...s, bitisAy: eskiBitis } : s)), yeni] };
};
export const standartSonSurumuGeriAl = (liste = [], grupId) => {
  const surumler = grupSurumleri(liste, grupId);
  if (surumler.length < 2) return { hata: "Geri alınacak önceki sürüm yok." };
  const son = surumler[surumler.length - 1];
  const onceki = surumler[surumler.length - 2];
  return { liste: liste.filter(s => s.id !== son.id).map(s => (s.id === onceki.id ? { ...s, bitisAy: son.bitisAy || null } : s)) };
};
export const standartSonaErdir = (liste = [], grupId, bitisAy) => {
  const surumler = grupSurumleri(liste, grupId);
  const acik = surumler.find(s => !s.bitisAy);
  if (!acik) return { hata: "Açık sürüm yok." };
  if (!bitisAy || bitisAy < acik.baslangicAy) return { hata: `Bitiş ayı ${acik.baslangicAy} veya sonrası olmalı.` };
  return { liste: liste.map(s => (s.id === acik.id ? { ...s, bitisAy } : s)) };
};
export const standartAdDegistir = (liste = [], grupId, ad) => {
  const a = String(ad || "").trim();
  if (!a) return { hata: "Ad boş olamaz." };
  return { liste: liste.map(s => (String(s.grupId) === String(grupId) ? { ...s, ad: a } : s)) };
};
export const standartGrupSil = (liste = [], grupId) => ({ liste: liste.filter(s => String(s.grupId) !== String(grupId)) });
export const standartGruplar = (liste = [], buAy) => {
  const g = new Map();
  for (const s of liste) { if (!g.has(String(s.grupId))) g.set(String(s.grupId), []); g.get(String(s.grupId)).push(s); }
  return [...g.values()].map(surumler => {
    surumler.sort((a, b) => a.baslangicAy.localeCompare(b.baslangicAy));
    const gecerli = buAy ? aydaGecerliSurum(surumler, buAy) : null;
    const son = surumler[surumler.length - 1];
    return { grupId: surumler[0].grupId, ad: son.ad, surumler, gecerli, son, sonaErdi: !!son.bitisAy && (!buAy || son.bitisAy < buAy) };
  }).sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
};
