// Kasa, banka ve kredi kartı hesapları (spec 0024 A; R1, R2, R6–R8, R15, R16; C1, C3, C5): saf motor. React'sız.
// Bakiye saklanmaz, hareketlerden türetilir (C1). Bir para hareketi ya gideri doğurur ya bir borcu kapatır: ödeme,
// virman ve tahsilat hiçbir gider üretmez (C3). Çift kayıt defteri değildir (C2).
// Hareket (bölüm `hesapHareketleri`): {id, tur: "odeme"|"virman", tarih, tutar, yontem, hesapId, karsiHesapId, giderId,
// taksitId, tamKapatir, kaynak, gocKaynak, aciklama}. Müşteri tahsilatı `payments[].hesapId` ile bakiyeye girer (R6).
import { kurus, tl, satirliMi, odemeHedefKalaniK, davranisOf } from "./gider";

export const HESAP_TURLERI = [{ value: "kasa", label: "Kasa" }, { value: "banka", label: "Banka" }, { value: "kart", label: "Kredi kartı" }];
export const HESAP_TUR_AD = Object.fromEntries(HESAP_TURLERI.map(t => [t.value, t.label]));
export const HESAPSIZ_NOTU = "Bakiye yalnız kaydı olan hareketleri sayar. Servis, Extra Kalıp ve yedek parça bedellerinin “ödendi” işareti ile hesabı belirtilmemiş ödemeler hiçbir hesaba girmez.";

const PARA = ["TRY", "USD", "EUR"];

// R1, C5: ad zorunlu ve benzersiz; tür ve para birimi sabit listeden; hareketi olan hesabın para birimi değişmez.
export const hesapDogrula = (form, hesaplar = [], { hareketVar = false } = {}) => {
  const hatalar = {};
  const ad = String(form?.ad || "").trim();
  if (!ad) hatalar.ad = "Hesap adı girilmedi.";
  else if (hesaplar.some(h => String(h.id) !== String(form?.id) && String(h.ad || "").trim().toLocaleLowerCase("tr") === ad.toLocaleLowerCase("tr"))) hatalar.ad = `“${ad}” adında bir hesap zaten var.`;
  if (!HESAP_TUR_AD[form?.tur]) hatalar.tur = "Hesap türü seçilmedi.";
  if (!PARA.includes(form?.paraBirimi)) hatalar.paraBirimi = "Para birimi seçilmedi.";
  const eski = hesaplar.find(h => String(h.id) === String(form?.id));
  if (eski && hareketVar && eski.paraBirimi !== form?.paraBirimi) hatalar.paraBirimi = "Hareketi olan hesabın para birimi değiştirilemez.";
  const acilis = Number(String(form?.acilisBakiyesi ?? "").replace(/\./g, "").replace(",", ".")) || 0;
  if (Object.keys(hatalar).length) return { hatalar, kayit: null };
  // C5: kredi kartında açılış tutarı BORÇ olarak girilir, bakiye negatif saklanır.
  const acilisBakiyesi = form.tur === "kart" ? -Math.abs(acilis) : acilis;
  return { hatalar, kayit: { ...form, ad, acilisBakiyesi, kapali: !!form.kapali } };
};

const tahsilatSayilirMi = (p) => !p.deletedAt && p.hesapId != null && !(p.yontem === "Çek" && !p.tahsilEdildi);

// R7: hesap başına açılış, giren, çıkan, bakiye ve yürüyen bakiyeli hareket satırları (tarih sırası).
export const hesapBakiyeleri = (hesaplar = [], hareketler = [], payments = []) => {
  const r = new Map();
  for (const h of hesaplar) r.set(String(h.id), { hesap: h, acilisK: kurus(h.acilisBakiyesi), girenK: 0, cikanK: 0, satirlar: [] });
  const ekle = (hesapId, satir) => { const x = r.get(String(hesapId)); if (x) x.satirlar.push(satir); };
  for (const m of hareketler) {
    if (!m || m.hesapId == null) continue; // R8: hesapsız hareket hiçbir bakiyeye girmez
    const t = kurus(m.tutar);
    if (m.tur === "odeme") ekle(m.hesapId, { tarih: m.tarih, tur: "odeme", hareket: m, girenK: 0, cikanK: t });
    else if (m.tur === "virman") {
      ekle(m.hesapId, { tarih: m.tarih, tur: "virman", hareket: m, girenK: 0, cikanK: t });
      ekle(m.karsiHesapId, { tarih: m.tarih, tur: "virman", hareket: m, girenK: t, cikanK: 0 });
    }
  }
  for (const p of payments) if (tahsilatSayilirMi(p)) ekle(p.hesapId, { tarih: p.tarih, tur: "tahsilat", tahsilat: p, girenK: kurus(p.tutar), cikanK: 0 });
  for (const x of r.values()) {
    x.satirlar.sort((a, b) => (a.tarih || "").localeCompare(b.tarih || ""));
    let b = x.acilisK;
    for (const s of x.satirlar) { x.girenK += s.girenK; x.cikanK += s.cikanK; b += s.girenK - s.cikanK; s.bakiyeK = b; }
    x.bakiyeK = b;
    x.acilis = tl(x.acilisK); x.giren = tl(x.girenK); x.cikan = tl(x.cikanK); x.bakiye = tl(b);
    // C5: kredi kartında bakiye borç yönlüdür; ekranda "borç" etiketi.
    x.borc = x.hesap.tur === "kart" ? tl(Math.max(0, -b)) : null;
  }
  return r;
};

// R8, AC-32: hesabı belirtilmemiş ödemeler (göç dahil) ayrıca sayılır.
export const hesapsizOdemeler = (hareketler = []) => {
  const l = hareketler.filter(m => m && m.tur === "odeme" && m.hesapId == null);
  return { adet: l.length, gocAdet: l.filter(m => m.kaynak === "goc").length };
};

// R16, AC-24: hareketi (ödeme, virman, tahsilat) olan hesap silinemez.
export const hesapKullanimi = (hesapId, hareketler = [], payments = []) =>
  hareketler.filter(m => m && (String(m.hesapId) === String(hesapId) || String(m.karsiHesapId) === String(hesapId))).length
  + payments.filter(p => !p.deletedAt && String(p.hesapId) === String(hesapId)).length;

// C5 (1): harekete yalnız aynı para biriminde ve açık hesap seçilebilir.
export const secilebilirHesaplar = (hesaplar = [], paraBirimi = "TRY") => hesaplar.filter(h => !h.kapali && h.paraBirimi === (paraBirimi || "TRY"));

const tutarOku = (v) => {
  if (typeof v === "number") return v;
  const t = String(v ?? "").trim();
  if (!t) return NaN;
  return Number(t.replace(/\./g, "").replace(",", "."));
};

// R2, R3, R18, AC-7, AC-28: ödeme tek hedefi kapatır (bir kalem ya da taksitli kalemde bir taksit); kalandan fazla
// olamaz; hesap açık ve TL olmalı (gider TL'dir). kalem: odemeleriUygula'dan geçmiş (zenginleştirilmiş) kalem.
export const odemeDogrula = (form, { kalem, turMap, hesaplar = [] } = {}) => {
  const hatalar = {};
  if (!kalem) return { hatalar: { hedef: "Ödenecek kalem bulunamadı." }, kayit: null };
  const satirli = satirliMi(kalem);
  if (Array.isArray(form?.giderIdler) && form.giderIdler.length > 1) hatalar.hedef = "Bir ödeme yalnız bir kalemi kapatır; her kalem için ayrı ödeme girin.";
  if (satirli && form?.taksitId == null) hatalar.hedef = "Taksitli kalemde ödeme bir taksite bağlanır.";
  if (!form?.tarih) hatalar.tarih = "Ödeme tarihi girilmedi.";
  const t = tutarOku(form?.tutar);
  const kalanK = odemeHedefKalaniK(kalem, davranisOf(kalem, turMap), satirli ? form?.taksitId : null);
  if (!Number.isFinite(t)) hatalar.tutar = "Tutar sayıya çevrilemedi. Örnek: 12.500,00";
  else if (t <= 0) hatalar.tutar = "Tutar sıfırdan büyük olmalı.";
  else if (kurus(t) > kalanK) hatalar.tutar = `Kalandan fazla ödeme kaydedilemez (kalan ${tl(kalanK).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺).`;
  if (form?.hesapId != null && form.hesapId !== "") {
    const h = hesaplar.find(x => String(x.id) === String(form.hesapId));
    if (!h) hatalar.hesapId = "Hesap bulunamadı.";
    else if (h.kapali) hatalar.hesapId = "Kapatılmış hesaba hareket girilemez.";
    else if (h.paraBirimi !== "TRY") hatalar.hesapId = "Gider ödemesi yalnız TL hesaptan yapılır.";
  }
  if (Object.keys(hatalar).length) return { hatalar, kayit: null };
  return {
    hatalar,
    kayit: {
      tur: "odeme", tarih: form.tarih, tutar: t, yontem: form.yontem || "", hesapId: form.hesapId == null || form.hesapId === "" ? null : form.hesapId,
      giderId: kalem.id, taksitId: satirli ? form.taksitId : null, aciklama: String(form.aciklama || "").trim(),
    },
  };
};

// R15, AC-12, AC-30: virman aynı para biriminde iki farklı, açık hesap arasında; gider ya da gelir değildir.
export const virmanDogrula = (form, hesaplar = []) => {
  const hatalar = {};
  const a = hesaplar.find(x => String(x.id) === String(form?.hesapId));
  const b = hesaplar.find(x => String(x.id) === String(form?.karsiHesapId));
  if (!a) hatalar.hesapId = "Çıkan hesap seçilmedi.";
  if (!b) hatalar.karsiHesapId = "Giren hesap seçilmedi.";
  if (a && b && String(a.id) === String(b.id)) hatalar.karsiHesapId = "Aynı hesaba virman yapılamaz.";
  if (a && b && a.paraBirimi !== b.paraBirimi) hatalar.karsiHesapId = "Farklı para birimindeki hesaplar arasında virman yapılamaz.";
  if ((a && a.kapali) || (b && b.kapali)) hatalar.hesapId = "Kapatılmış hesaba hareket girilemez.";
  if (!form?.tarih) hatalar.tarih = "Tarih girilmedi.";
  const t = tutarOku(form?.tutar);
  if (!Number.isFinite(t)) hatalar.tutar = "Tutar sayıya çevrilemedi.";
  else if (t <= 0) hatalar.tutar = "Tutar sıfırdan büyük olmalı.";
  if (Object.keys(hatalar).length) return { hatalar, kayit: null };
  return { hatalar, kayit: { tur: "virman", tarih: form.tarih, tutar: t, hesapId: a.id, karsiHesapId: b.id, aciklama: String(form.aciklama || "").trim() } };
};

// Son kullanılan hesap (R17): en son tarihli ödeme hareketinin açık hesabı.
export const sonKullanilanHesap = (hareketler = [], hesaplar = []) => {
  const son = hareketler.filter(m => m && m.tur === "odeme" && m.hesapId != null).sort((a, b) => (b.tarih || "").localeCompare(a.tarih || "") || Number(b.id) - Number(a.id))[0];
  const h = son && hesaplar.find(x => String(x.id) === String(son.hesapId) && !x.kapali && x.paraBirimi === "TRY");
  return h ? h.id : null;
};

// R17: yeni kalem "ödendi olarak kaydet" ile kaydedilince kalemin tamamını kapatan ödeme hareketleri (kimliksiz).
// Satırlı kalemde her satıra kendi tutarıyla bir hareket; satırsız kalemde ödenecek tutarın tamamı (ana + stopaj).
export const tamOdemeHareketleri = (kalem, turMap, { tarih, hesapId = null, yontem = "" } = {}) => {
  if (!kalem) return [];
  const ortak = { tur: "odeme", tarih, yontem: yontem || "", hesapId: hesapId == null || hesapId === "" ? null : hesapId, giderId: kalem.id, aciklama: "" };
  if (satirliMi(kalem)) return kalem.taksitler.filter(r => kurus(r.tutar) > 0).map(r => ({ ...ortak, taksitId: r.id, tutar: r.tutar }));
  const k = odemeHedefKalaniK({ ...kalem, odendi: false, _odenen: null }, davranisOf(kalem, turMap), null);
  return k > 0 ? [{ ...ortak, taksitId: null, tutar: tl(k) }] : [];
};
