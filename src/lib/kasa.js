// Kasa, banka ve kredi kartı hesapları (spec 0024 A; R1, R2, R6–R8, R15, R16; C1, C3, C5): saf motor. React'sız.
// Bakiye saklanmaz, hareketlerden türetilir (C1). Bir para hareketi ya gideri doğurur ya bir borcu kapatır: ödeme,
// virman ve tahsilat hiçbir gider üretmez (C3). Çift kayıt defteri değildir (C2).
// Hareket (bölüm `hesapHareketleri`): {id, tur: "odeme"|"virman", tarih, tutar, yontem, hesapId, karsiHesapId, giderId,
// taksitId, tamKapatir, kaynak, gocKaynak, aciklama}. Müşteri tahsilatı `payments[].hesapId` ile bakiyeye girer (R6).
import { cekDurumuOf } from "./utils";
import { kurus, tl, satirliMi, odemeHedefKalaniK, davranisOf, odemeleriUygula, odemeHedefleri, turHaritasi, maasKurus, ekOdemeKurus, DAVRANIS, HEDEF } from "./gider";

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

// Spec 0040 R6 (AC-22): para bir hesaba girdi mi. Çekte yalnız "tahsil edildi"; ciro edilen çek gelire girer ama bankaya hiç
// girmediği için hiçbir hesabın bakiyesini artırmaz (bayrağı çevirmek bu hatayı üretirdi).
const tahsilatSayilirMi = (p) => !p.deletedAt && p.hesapId != null && (p.yontem !== "Çek" || cekDurumuOf(p) === "tahsil");

// R7: hesap başına açılış, giren, çıkan, bakiye ve yürüyen bakiyeli hareket satırları (tarih sırası).
export const hesapBakiyeleri = (hesaplar = [], hareketler = [], payments = []) => {
  const r = new Map();
  for (const h of hesaplar) r.set(String(h.id), { hesap: h, acilisK: kurus(h.acilisBakiyesi), girenK: 0, cikanK: 0, satirlar: [] });
  const ekle = (hesapId, satir) => { const x = r.get(String(hesapId)); if (x) x.satirlar.push(satir); };
  for (const m of hareketler) {
    if (!m || m.hesapId == null) continue; // R8: hesapsız hareket hiçbir bakiyeye girmez
    const t = kurus(m.tutar);
    if (m.tur === "odeme") ekle(m.hesapId, { tarih: m.tarih, tur: "odeme", hareket: m, girenK: 0, cikanK: t });
    // Spec 0024 B (R9): avans hesaptan çıkar; mahsup para hareketi değildir, hiçbir bakiyeye girmez (R10).
    else if (m.tur === "avans") ekle(m.hesapId, { tarih: m.tarih, tur: "avans", hareket: m, girenK: 0, cikanK: t });
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
  // Spec 0040 R18: ciro hareketleri kasıtlı olarak hesapsızdır (çek portföyden çıkar); eksik veri listesine girmez.
  const l = hareketler.filter(m => m && m.tur === "odeme" && m.hesapId == null && m.cekId == null);
  // Spec 0024 B4: hesapsız avans da hiçbir bakiyeye girmez ve ayrıca sayılır.
  const avansAdet = hareketler.filter(m => m && m.tur === "avans" && m.hesapId == null).length;
  return { adet: l.length, gocAdet: l.filter(m => m.kaynak === "goc").length, avansAdet };
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
export const odemeDogrula = (form, { kalem, turMap, hesaplar = [], ciro = false } = {}) => {
  const hatalar = {};
  // Spec 0040 R19, AC-37: "Çek (ciro)" yöntemi elle seçilemez; yalnız portföyden çek ciro edilirken atanır.
  if (!ciro && form?.yontem === "Çek (ciro)") hatalar.yontem = "“Çek (ciro)” elle seçilemez; müşteri çekiyle ödemek için Kasa › Çek Portföyü'nden ciro edin.";
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

// ── Avans, mahsup ve ekstre (spec 0024 B; R9–R13, C8; plan B1–B11) ─────────────
const idEsit = (a, b) => a != null && b != null && String(a) === String(b);
const hesapHatasi = (hesapId, hesaplar) => {
  if (hesapId == null || hesapId === "") return null;
  const h = hesaplar.find(x => String(x.id) === String(hesapId));
  if (!h) return "Hesap bulunamadı.";
  if (h.kapali) return "Kapatılmış hesaba hareket girilemez.";
  if (h.paraBirimi !== "TRY") return "Avans yalnız TL hesaptan verilir.";
  return null;
};
const paraMetni = (k) => tl(k).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// B1, B5: çalışan başına avans borcu = verilen avanslar − mahsuplar. Mahsubun bağlı olduğu maaş kalemi canlı değilse
// (çöpte ya da yok) mahsup sayılmaz; kalem geri alınınca döner. giderler: ham dizi.
export const avansBorclari = (hareketler = [], giderler = []) => {
  const canli = new Set(giderler.filter(k => k && !k.deletedAt).map(k => String(k.id)));
  const r = new Map();
  const al = (id) => { const k = String(id); if (!r.has(k)) r.set(k, { calisanId: id, verilenK: 0, mahsupK: 0, borcK: 0 }); return r.get(k); };
  for (const m of hareketler || []) {
    if (!m || m.calisanId == null) continue;
    if (m.tur === "avans") al(m.calisanId).verilenK += kurus(m.tutar);
    else if (m.tur === "mahsup" && canli.has(String(m.giderId))) al(m.calisanId).mahsupK += kurus(m.tutar);
  }
  for (const x of r.values()) x.borcK = Math.max(0, x.verilenK - x.mahsupK);
  return r;
};
export const avansBorcuK = (calisanId, hareketler, giderler) => avansBorclari(hareketler, giderler).get(String(calisanId))?.borcK || 0;

// Triyaj bulgu 1: avans silinince kalan avans toplamı mahsup edilmiş tutarın altına inerse silme engellenir; yoksa mahsup
// arkasında avans olmadan maaşın bir kısmını kapatmış sayılır (açık avans, borç özeti ve ekstre üç ayrı rakam verir).
// Dönüş: { ok, eksikK, mahsuplar: [canlı kaleme bağlı mahsup hareketleri] }.
export const avansSilinebilirMi = (avans, hareketler = [], giderler = []) => {
  const b = avansBorclari(hareketler, giderler).get(String(avans?.calisanId)) || { verilenK: 0, mahsupK: 0 };
  const eksikK = b.mahsupK - (b.verilenK - kurus(avans?.tutar));
  const canli = new Set(giderler.filter(k => k && !k.deletedAt).map(k => String(k.id)));
  const mahsuplar = (hareketler || []).filter(m => m && m.tur === "mahsup" && idEsit(m.calisanId, avans?.calisanId) && canli.has(String(m.giderId)));
  return { ok: eksikK <= 0, eksikK: Math.max(0, eksikK), mahsuplar };
};

// R9, B4: avans bir çalışana verilir; hesap isteğe bağlı (verilirse açık ve TL). Gider üretmez (R11, C3).
export const avansDogrula = (form, { calisanlar = [], hesaplar = [] } = {}) => {
  const hatalar = {};
  const c = calisanlar.find(x => idEsit(x.id, form?.calisanId));
  if (!c) hatalar.calisanId = "Çalışan seçilmedi.";
  else if (c.deletedAt) hatalar.calisanId = "Silinmiş çalışana avans verilemez.";
  if (!form?.tarih) hatalar.tarih = "Tarih girilmedi.";
  const t = tutarOku(form?.tutar);
  if (!Number.isFinite(t)) hatalar.tutar = "Tutar sayıya çevrilemedi. Örnek: 5.000,00";
  else if (t <= 0) hatalar.tutar = "Tutar sıfırdan büyük olmalı.";
  const hh = hesapHatasi(form?.hesapId, hesaplar);
  if (hh) hatalar.hesapId = hh;
  if (Object.keys(hatalar).length) return { hatalar, kayit: null };
  return { hatalar, kayit: { tur: "avans", tarih: form.tarih, tutar: t, calisanId: c.id, hesapId: form.hesapId == null || form.hesapId === "" ? null : form.hesapId,
    yontem: form.yontem || "", aciklama: String(form.aciklama || "").trim() } };
};

// R10, B2: mahsup aynı çalışanın personel kalemine yapılır; sınır kalem (taksitliyse taksit) kalanı ile açık avans
// borcunun küçüğüdür. kalem: odemeleriUygula'dan geçmiş kalem; giderler: ham dizi (avans borcu için).
// Triyaj bulgu 2: mahsup yalnız ekstre ve borç özetinin kapsamındaki kaleme yapılır (gider tarihi bugün veya öncesi,
// yürürlük ayı veya sonrası); yoksa açık avans düşer ama ekstre o kalemi görmez ve iki rakam ayrışır.
export const mahsupKapsamda = (kalem, { bugun = null, yururlukAy = null } = {}) => kapsamda(kalem, yururlukAy ? `${yururlukAy}-01` : "", bugun);
export const mahsupDogrula = (form, { kalem, turMap, hareketler = [], giderler = [], bugun = null, yururlukAy = null } = {}) => {
  const hatalar = {};
  if (!kalem) return { hatalar: { hedef: "Mahsup edilecek kalem bulunamadı." }, kayit: null };
  if (davranisOf(kalem, turMap) !== DAVRANIS.PERSONEL || kalem.calisanId == null) return { hatalar: { hedef: "Avans yalnız personel kalemine mahsup edilir." }, kayit: null };
  if (!mahsupKapsamda(kalem, { bugun, yururlukAy })) return { hatalar: { hedef: "Gelecek tarihli ya da yürürlük öncesi maaş kalemine mahsup yapılamaz." }, kayit: null };
  const satirli = satirliMi(kalem);
  if (satirli && form?.taksitId == null) hatalar.hedef = "Taksitli kalemde mahsup bir taksite bağlanır.";
  if (!form?.tarih) hatalar.tarih = "Tarih girilmedi.";
  const t = tutarOku(form?.tutar);
  const kalanK = odemeHedefKalaniK(kalem, DAVRANIS.PERSONEL, satirli ? form?.taksitId : null);
  const borcK = avansBorcuK(kalem.calisanId, hareketler, giderler);
  if (!Number.isFinite(t)) hatalar.tutar = "Tutar sayıya çevrilemedi.";
  else if (t <= 0) hatalar.tutar = "Tutar sıfırdan büyük olmalı.";
  else if (kurus(t) > borcK) hatalar.tutar = `Açık avans borcundan fazla mahsup edilemez (açık avans ${paraMetni(borcK)} ₺).`;
  else if (kurus(t) > kalanK) hatalar.tutar = `Kalandan fazla mahsup edilemez (kalan ${paraMetni(kalanK)} ₺).`;
  if (Object.keys(hatalar).length) return { hatalar, kayit: null };
  return { hatalar, kayit: { tur: "mahsup", tarih: form.tarih, tutar: t, calisanId: kalem.calisanId, giderId: kalem.id, taksitId: satirli ? form.taksitId : null,
    hesapId: null, aciklama: String(form.aciklama || "").trim() } };
};

// B6: ekstre borç özetiyle aynı kapsam: canlı, tarihli, yürürlük ayından sonra ve bugünden önce doğan kalemler.
function kapsamda(k, esik, bugun) { return !!k && !k.deletedAt && !!k.tarih && !(esik && k.tarih < esik) && !(bugun && k.tarih > bugun); }
const anaHedef = (k, dav) => odemeHedefleri(k, dav).find(h => h.hedef === HEDEF.ANA) || { toplamK: 0, kalanK: 0 };
// Kalemin ana hedefine (kiraya veren / tedarikçi / çalışan) giden ödeme ve mahsuplar, tarih sırasıyla ve her birinin ana
// hedefe düşen payı: hareketler sırayla eklenip motor yeniden çalıştırılır, kalan farkı o hareketin payıdır (B7: tutarsız
// göç hareketi o anki kalanı kapatır). Stopaja giden pay tedarikçi ekstresine girmez.
const anaPaylari = (k, hareketler, turMap) => {
  const dav = davranisOf(k, turMap);
  const hs = (hareketler || []).filter(h => h && (h.tur === "odeme" || h.tur === "mahsup") && idEsit(h.giderId, k.id))
    .sort((a, b) => (a.tarih || "").localeCompare(b.tarih || "") || Number(a.id) - Number(b.id));
  const kalan = (liste) => anaHedef(odemeleriUygula([k], liste, turMap)[0], dav).kalanK;
  const r = [];
  let once = kalan([]);
  hs.forEach((h, i) => { const sonra = kalan(hs.slice(0, i + 1)); const pay = once - sonra; once = sonra; if (pay > 0 || h.tamKapatir) r.push({ hareket: h, payK: pay }); });
  return r;
};
const sirala = (satirlar) => satirlar.sort((a, b) => (a.tarih || "").localeCompare(b.tarih || "") || a.sira - b.sira);
const yuru = (satirlar, baslangicK = 0) => { let b = baslangicK; for (const s of satirlar) { b += s.etkiK; s.bakiyeK = b; } return b; };
// Tarih aralığı: aralıktan önceki satırlar "Devreden bakiye" olur, sonrası çıkar.
const araliga = (satirlar, aralik) => {
  const bas = aralik?.bas || "", bit = aralik?.bit || "";
  const once = bas ? satirlar.filter(s => (s.tarih || "") < bas) : [];
  const ic = satirlar.filter(s => (!bas || (s.tarih || "") >= bas) && (!bit || (s.tarih || "") <= bit));
  const devirK = once.reduce((a, s) => a + s.etkiK, 0);
  const son = yuru(ic, devirK);
  return { devirK: bas ? devirK : null, satirlar: ic, bakiyeK: son, bakiye: tl(son) };
};

// R12, AC-16: tedarikçi ekstresi. Borç = kalemin ana hedef tutarı (KDV dâhil; kirada kiraya verene giden kısım).
export const tedarikciEkstresi = (tedarikciId, { giderler = [], hareketler = [], turler = [], yururlukAy = null, bugun = null, aralik = null } = {}) => {
  const turMap = turHaritasi(turler);
  const esik = yururlukAy ? `${yururlukAy}-01` : "";
  const satirlar = [];
  for (const k of giderler) {
    if (!kapsamda(k, esik, bugun) || !idEsit(k.tedarikciId, tedarikciId)) continue;
    const dav = davranisOf(k, turMap);
    if (dav === DAVRANIS.PERSONEL) continue;
    const toplamK = anaHedef(k, dav).toplamK;
    if (toplamK <= 0) continue;
    satirlar.push({ tarih: k.tarih, sira: 0, tur: "borc", kalem: k, etkiK: toplamK, tutarK: toplamK });
    for (const p of anaPaylari(k, hareketler, turMap)) satirlar.push({ tarih: p.hareket.tarih || k.tarih, sira: 1, tur: "odeme", kalem: k, hareket: p.hareket, etkiK: -p.payK, tutarK: p.payK, goc: p.hareket.kaynak === "goc" });
  }
  return araliga(sirala(satirlar), aralik);
};

// R13, AC-17, B8: çalışan ekstresi, tek net sütun: + çalışana borcumuz, − çalışandan alacağımız. Maaş kalemi borç doğurur,
// ödeme borcu düşer, avans alacak doğurur (net −), mahsup borcu ve alacağı birlikte kapatır (net 0; tutar ayrıca yazar).
export const calisanEkstresi = (calisanId, { giderler = [], hareketler = [], turler = [], yururlukAy = null, bugun = null, aralik = null } = {}) => {
  const turMap = turHaritasi(turler);
  const esik = yururlukAy ? `${yururlukAy}-01` : "";
  const satirlar = [];
  for (const k of giderler) {
    if (!kapsamda(k, esik, bugun) || !idEsit(k.calisanId, calisanId) || davranisOf(k, turMap) !== DAVRANIS.PERSONEL) continue;
    const toplamK = anaHedef(k, DAVRANIS.PERSONEL).toplamK;
    satirlar.push({ tarih: k.tarih, sira: 0, tur: "maas", kalem: k, etkiK: toplamK, tutarK: toplamK,
      kirilim: { resmiK: kurus(k.resmiTutar), eldenK: kurus(k.eldenTutar), ekK: ekOdemeKurus(k), maasK: maasKurus(k) } });
    for (const p of anaPaylari(k, hareketler, turMap)) {
      const mahsup = p.hareket.tur === "mahsup";
      satirlar.push({ tarih: p.hareket.tarih || k.tarih, sira: 1, tur: mahsup ? "mahsup" : "odeme", kalem: k, hareket: p.hareket,
        etkiK: mahsup ? 0 : -p.payK, tutarK: p.payK, goc: p.hareket.kaynak === "goc" });
    }
  }
  for (const m of hareketler || []) if (m && m.tur === "avans" && idEsit(m.calisanId, calisanId)) {
    satirlar.push({ tarih: m.tarih, sira: 2, tur: "avans", hareket: m, etkiK: -kurus(m.tutar), tutarK: kurus(m.tutar) });
  }
  const r = araliga(sirala(satirlar), aralik);
  return { ...r, avansBorcK: avansBorcuK(calisanId, hareketler, giderler) };
};
