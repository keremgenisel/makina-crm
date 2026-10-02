// Gider kaydı ve dönemsel gider takibi: saf hesap motoru (spec 0001, plan K1–K38).
// React'sız; tüm tutarlar TL (C2), gider toplamlarına KDV hariç tutar girer (C1). Tarihler projenin
// konvansiyonuyla düz string ("YYYY-MM-DD", ay "YYYY-MM") karşılaştırılır, Date'e çevrilmez.
// Para hesabı kuruş tamsayısıyla yapılır (K32): kayan noktada 3 × 33.333,33 gibi toplamlar sahte
// "aşım" üretirdi. Dışarı TL (kuruş / 100) döner.
import { trLower, getKdvRateForDate, uid as varsayilanUid } from "./utils";

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
// Türkçe biçimde tek istisna: virgülsüz "12.5" / "1234.56" gibi tek nokta ve ardından 1–2 hane ondalıktır
// (yapıştırılan İngilizce biçim); "12.500" binliktir. tutarCoz ve tutar girdisinin yapıştırma kolu paylaşır (0045 C2).
export const noktaOndalikMi = (t) => !String(t).includes(",") && /^\d+\.\d{1,2}$/.test(String(t));
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
  if (noktaOndalikMi(t)) t = t.replace(".", ",");
  const n = parseFloat(t.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n)) return { bos: false, deger: 0, gecersiz: true };
  return { bos: false, deger: eksi ? -n : n, gecersiz: false };
};

// ── Kalem hesapları ───────────────────────────────────────────────────────────
export const turHaritasi = (turler = []) => new Map((turler || []).map(t => [String(t.id), t]));
export const davranisOf = (kalem, turMap) => turMap?.get(String(kalem?.turId))?.davranis || DAVRANIS.NORMAL;
// Atama kuralı (spec 0020 R1, R5): yalnız kira ortağa zorlanır; personel normal kalemle aynı atamaları alır.
export const atanabilirMi = (davranis) => davranis !== DAVRANIS.KIRA;
// Makina bazlı çıktılarda kalemin görünen adı (spec 0020 R8): personel kaleminin açıklaması çoğunlukla çalışanın
// adıdır (tekrarlayan üretim `t.ad || c.ad`), bu yüzden her zaman sabit etiket basılır.
export const PERSONEL_ETIKETI = "Personel gideri";
export const kalemGorunenAd = (k, davranis) => (davranis === DAVRANIS.PERSONEL ? PERSONEL_ETIKETI : (k?.aciklama || ""));

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

// Personel ek ödemeleri (spec 0023): fazla mesai, prim, ikramiye; her satır resmi + elden. Kimliksiz alt satır (C7).
// Adlandırma bilinçli: "mesai" sözcüğü kodda servis işçilik süresi içindir (utils.mesaiDk, calismaSaatleri); bordro
// fazla mesaisi `fazlaCalisma` koduyla tutulur, iki kavram hiçbir alanı paylaşmaz (R10).
export const EK_ODEME_TURLERI = [
  { value: "fazlaCalisma", label: "Fazla mesai" }, { value: "prim", label: "Prim" }, { value: "ikramiye", label: "İkramiye" },
];
export const EK_ODEME_TUR_AD = Object.fromEntries(EK_ODEME_TURLERI.map(t => [t.value, t.label]));
const ekSatirKurus = (e) => kurus(e?.resmiTutar) + kurus(e?.eldenTutar);
export const maasKurus = (k) => kurus(k?.resmiTutar) + kurus(k?.eldenTutar);
export const ekOdemeKurus = (k) => (Array.isArray(k?.ekOdemeler) ? k.ekOdemeler : []).reduce((a, e) => a + ekSatirKurus(e), 0);
// Tek toplam (C5): personel kalemi = maaş + ek ödemeler. Ödenecek tutar, borç, hatırlatıcı, ödeme hedefleri ve makina
// maliyeti bu fonksiyondan okur; ikinci bir toplama yazılmaz.
const kalemKurus = (k, dav) => {
  if (dav === DAVRANIS.PERSONEL) return maasKurus(k) + ekOdemeKurus(k);
  return kurus(k.tutar);
};
// Spec 0042 R2: personel kaleminin iki ödeme hedefi. resmi = resmiTutar + ek ödemelerin resmi kısmı, elden = eldenTutar
// + ek ödemelerin elden kısmı; toplamları kalemKurus'un personel dalına tam eşittir (C1, AC-6). İkisi de sıfırdan büyükse
// kalem iki hedeflidir (R4); biri sıfırsa tek hedef, kalem bugünkü gibi satırsız kalır (R3).
export const personelHedefKurus = (k) => {
  const ek = Array.isArray(k?.ekOdemeler) ? k.ekOdemeler : [];
  return {
    resmiK: kurus(k?.resmiTutar) + ek.reduce((a, e) => a + kurus(e?.resmiTutar), 0),
    eldenK: kurus(k?.eldenTutar) + ek.reduce((a, e) => a + kurus(e?.eldenTutar), 0),
  };
};
// Spec 0054 R1, R18 (0048 R13'ü genişletir): personelin dört ödeme hedefi (maaş resmi = ANA, maaş elden = ELDEN, ek ödeme
// resmi = EK_RESMI, ek ödeme elden = EK_ELDEN) ve her hedefin maaş/ek ödeme kırılımı. TEK kaynak: hedef tutarı bu
// fonksiyondan okunur (C2). ayrim: hangi bileşenin kendi hedefi olduğu ({ elden, ekResmi, ekElden }; true = ayrı hedef).
// Ayrılmayan bileşen kendi tarafının maaş hedefine katılır (R21, Q2): ek resmi → ANA, ek elden → ELDEN (elden ayrı değilse
// ANA), maaş elden → ANA. ayrim true = hepsi ayrı (TAM), false = hepsi ANA'da (tek hedef; 0048'in eski boolean çağrısı).
export const PERSONEL_TAM_AYRIM = { elden: true, ekResmi: true, ekElden: true };
const PERSONEL_TEK = { elden: false, ekResmi: false, ekElden: false };
const ayrimOf = (a) => (a === true || a == null ? PERSONEL_TAM_AYRIM : a === false ? PERSONEL_TEK : a);
export const personelHedefKirilimi = (k, hedef, ayrim = true) => {
  const a = ayrimOf(ayrim);
  const ek = Array.isArray(k?.ekOdemeler) ? k.ekOdemeler : [];
  const maasR = kurus(k?.resmiTutar), maasE = kurus(k?.eldenTutar);
  const ekR = ek.reduce((t, e) => t + kurus(e?.resmiTutar), 0), ekE = ek.reduce((t, e) => t + kurus(e?.eldenTutar), 0);
  const eldenTarafi = a.elden ? HEDEF.ELDEN : HEDEF.ANA;
  const r = { [HEDEF.ANA]: { maasK: maasR, ekOdemeK: 0 }, [HEDEF.ELDEN]: { maasK: 0, ekOdemeK: 0 }, [HEDEF.EK_RESMI]: { maasK: 0, ekOdemeK: 0 }, [HEDEF.EK_ELDEN]: { maasK: 0, ekOdemeK: 0 } };
  r[eldenTarafi].maasK += maasE;
  r[a.ekResmi ? HEDEF.EK_RESMI : HEDEF.ANA].ekOdemeK += ekR;
  r[a.ekElden ? HEDEF.EK_ELDEN : eldenTarafi].ekOdemeK += ekE;
  return r[hedef] || { maasK: 0, ekOdemeK: 0 };
};
// Hedef tutarları (kuruş), PERSONEL_HEDEFLERI sırasıyla; personelHedefKirilimi'nden (R18).
export const personelHedefTutarlari = (k, ayrim = true) => Object.fromEntries(PERSONEL_HEDEFLERI.map(h => {
  const x = personelHedefKirilimi(k, h, ayrim);
  return [h, x.maasK + x.ekOdemeK];
}));
// Spec 0054 R15: satırlı doğmanın kapısı sıfırdan büyük hedef sayısıdır (yalnız resmi maaş + resmi prim de iki hedeftir).
// personelIkiHedef anlamı değişmeden kalır (resmi ve elden toplamları ikisi de > 0).
export const personelCokHedef = (k, dav) => dav === DAVRANIS.PERSONEL && Object.values(personelHedefTutarlari(k)).filter(t => t > 0).length >= 2;
export const personelIkiHedef = (k, dav) => {
  if (dav !== DAVRANIS.PERSONEL) return false;
  const p = personelHedefKurus(k);
  return p.resmiK > 0 && p.eldenK > 0;
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
// ── Taksit ve ödeme hedefleri (spec 0021, plan T1–T12) ────────────────────────
// Taksit bir ÖDEME kavramıdır (R5): gider tarihi, dönem raporu, KDV, kova ve makina maliyeti taksitten etkilenmez.
// Ödeme satırları `taksitler` dizisinde durur: {id, hedef, sira, vade, tutar, odendi, odemeTarihi}. Satır yalnız
// taksitli kalemde (ana hedefte ≥ 2) ve stopajı olan kira kaleminde (iki hedef, taksitsiz hedef tek satır) vardır.
// Satırı olan kalemde `odendi`, `odemeTarihi`, `sonOdemeTarihi` satırlardan türetilip yazılır (R3): vadesiGectiMi,
// sunucunun `odendi` alan denetimi ve dönem raporu süzgeci değişmeden çalışır.
// Spec 0042 C9: personelin elden kısmı ayrı hedef (ELDEN); resmi kısım ANA olarak kalır (kimlik değişmez, ad görünümde).
// Spec 0054 R14: ek ödeme maaştan ayrı iki hedef (resmi, elden). Sıra R9'un doğruluk kaynağıdır: satırsız kalemde ödeme bu
// sırayla dolar, maaş önce kapanır, sonradan çıkan ek ödeme en sona düşer.
export const HEDEF = { ANA: "ana", ELDEN: "elden", EK_RESMI: "ekResmi", EK_ELDEN: "ekElden", STOPAJ: "stopaj" };
export const HEDEF_SIRASI = [HEDEF.ANA, HEDEF.ELDEN, HEDEF.EK_RESMI, HEDEF.EK_ELDEN, HEDEF.STOPAJ];
export const PERSONEL_HEDEFLERI = [HEDEF.ANA, HEDEF.ELDEN, HEDEF.EK_RESMI, HEDEF.EK_ELDEN];
export const VERGI_DAIRESI = "Vergi dairesi";
export const satirliMi = (k) => Array.isArray(k?.taksitler) && k.taksitler.length > 0;
const gunSayisi = (y, m) => new Date(y, m, 0).getDate();
// R12 (T4): ilk vadenin gününden n ay sonrası; ay o güne yetmiyorsa ay sonuna kırpılır. Zincirleme eklenmez.
export const ayEkleGun = (tarih, n) => {
  if (!tarih) return null;
  const [y, m, d] = String(tarih).split("-").map(Number);
  const t = y * 12 + (m - 1) + n;
  const yy = Math.floor(t / 12), mm = (t % 12) + 1;
  return `${yy}-${String(mm).padStart(2, "0")}-${String(Math.min(d, gunSayisi(yy, mm))).padStart(2, "0")}`;
};
// Eşit bölüm, kuruş artığı SON taksite (R1, AC-2). Toplam kuruşu kuruşuna korunur (C1).
export const esitBol = (toplamKurus, adet) => {
  if (adet <= 0) return [];
  const taban = Math.floor(toplamKurus / adet);
  return Array.from({ length: adet }, (_, i) => (i === adet - 1 ? toplamKurus - taban * (adet - 1) : taban));
};
export const taksitPlaniOlustur = (toplamKurus, sayi, ilkVade, { hedef = HEDEF.ANA, uid = varsayilanUid } = {}) =>
  esitBol(toplamKurus, sayi).map((t, i) => ({ id: uid(), hedef, sira: i + 1, vade: ayEkleGun(ilkVade, i), tutar: tl(t), odendi: false, odemeTarihi: null }));

// Spec 0054: personelde çok hedefli kalem hedeflerini personelHedefKirilimi'nden (ayrim ile) okur; tek hedefte hepsi ANA.
const hedefToplamKurus = (k, dav, hedef, { ayrim = true } = {}) => {
  if (hedef === HEDEF.STOPAJ) return stopajKurus(k, dav);
  if (dav === DAVRANIS.PERSONEL && personelCokHedef(k, dav)) return personelHedefTutarlari(k, ayrim)[hedef] || 0;
  return hedef === HEDEF.ANA ? odenecekKurus(k, dav) : 0;
};
// Satırsız kalemin hedefleri (okuma anı, R13 / 0042 Q1): ana (vadesi kalemin vadesi) + personelde elden (Q5: vadesi
// resmi vadesi; yoksa eski kalemin elden kısmı hatırlatıcıdan düşerdi) + kirada stopaj (vadesi bilinmez, eski).
// Spec 0054 R9 (satırsız dal): çok hedefli personel okuma anında dört hedefle (tutarı sıfır olan yok), HEDEF_SIRASI ile.
const satirsizHedefler = (k, dav) => {
  const l = [];
  if (personelCokHedef(k, dav)) {
    const t = personelHedefTutarlari(k);
    for (const h of PERSONEL_HEDEFLERI) if (t[h] > 0) l.push({ hedef: h, toplamK: t[h], vade: k.sonOdemeTarihi || null, eski: false });
  } else l.push({ hedef: HEDEF.ANA, toplamK: odenecekKurus(k, dav), vade: k.sonOdemeTarihi || null, eski: false });
  const stK = stopajKurus(k, dav);
  if (stK > 0) l.push({ hedef: HEDEF.STOPAJ, toplamK: stK, vade: null, eski: true });
  return l;
};
const siraliSatirlar = (satirlar) => [...satirlar].sort((a, b) => (Number(a.sira) || 0) - (Number(b.sira) || 0));

// R10 (T11): planı yeniden kurar. Ödenmiş satırlar olduğu gibi kalır; ödenmemişler kalan tutara yeniden bölünür.
// Dönen: { satirlar } ya da { hata }. eski: aynı hedefin mevcut satırları.
export const planYenidenBol = (eski = [], toplamKurus, sayi, ilkVade, { hedef = HEDEF.ANA, uid = varsayilanUid } = {}) => {
  const sirali = siraliSatirlar(eski);
  // Spec 0024 R18: ödeme almış taksit (kısmen de olsa) korunur; ödeme hareketten türetilmiş `_odenenK` taşır.
  const odemeAlmis = (r) => r.odendi || (r._odenenK || 0) > 0;
  const odenmis = sirali.filter(odemeAlmis);
  const odenmemisEski = sirali.filter(r => !odemeAlmis(r));
  const n = Math.max(1, Math.floor(Number(sayi) || 1));
  if (n < odenmis.length) return { hata: `Taksit sayısı ödenmiş taksit sayısının (${odenmis.length}) altına indirilemez.` };
  const odenmisK = odenmis.reduce((a, r) => a + kurus(r.tutar), 0);
  const kalanK = toplamKurus - odenmisK;
  if (kalanK < 0) return { hata: `Ödenmiş taksitlerin toplamı (${tl(odenmisK).toLocaleString("tr-TR")} ₺) yeni ödenecek tutarı aşıyor.` };
  let u = n - odenmis.length;
  if (kalanK > 0 && u === 0) u = 1; // kalan var, ödenmemiş taksit yok: bir taksit eklenir
  if (kalanK === 0) u = 0;          // kalan yok: ödenmemiş taksitler düşer
  const tutarlar = esitBol(kalanK, u);
  const yeni = tutarlar.map((t, j) => {
    const idx = odenmis.length + j;
    const vade = ilkVade ? ayEkleGun(ilkVade, idx)
      : (odenmemisEski[j]?.vade ?? (odenmis.length ? ayEkleGun(odenmis[odenmis.length - 1].vade, j + 1) : null));
    return { id: odenmemisEski[j]?.id ?? uid(), hedef, sira: idx + 1, vade, tutar: tl(t), odendi: false, odemeTarihi: null };
  });
  return { satirlar: [...odenmis.map((r, i) => ({ ...r, hedef, sira: i + 1 })), ...yeni] };
};

// Tek saf hedef hesabı (DoD): borç özeti, tedarikçi borcu, hatırlatıcı ve liste aynı fonksiyonu kullanır.
// Her hedef: { hedef, toplamK, kalanK, vade (en yakın ödenmemiş), odendi, odenenAdet, toplamAdet, taksitli, eski }.
// Satırsız eski kira kaleminde stopaj hedefi okuma anında kalemi izler (R13, T5); vadesi bilinmez.
export const odemeHedefleri = (k, dav = DAVRANIS.NORMAL) => {
  if (satirliMi(k)) {
    const hedefler = [];
    for (const h of HEDEF_SIRASI) {
      const sat = siraliSatirlar(k.taksitler.filter(r => (r.hedef || HEDEF.ANA) === h));
      if (!sat.length) continue;
      const acik = sat.filter(r => !r.odendi);
      // Spec 0024: kısmen ödenmiş taksitin kalanı (hareketlerden türetilen `_odenenK`).
      hedefler.push({
        hedef: h, toplamK: sat.reduce((a, r) => a + kurus(r.tutar), 0), kalanK: acik.reduce((a, r) => a + Math.max(0, kurus(r.tutar) - (r._odenenK || 0)), 0),
        vade: acik.map(r => r.vade).filter(Boolean).sort()[0] || null, odendi: acik.length === 0,
        odenenAdet: sat.length - acik.length, toplamAdet: sat.length, taksitli: sat.length > 1, eski: false,
      });
    }
    return hedefler;
  }
  // Spec 0024 R3, R14: satırsız kalemde kısmi ödeme; ödenen tutar hareketlerden türetilen `_odenen` (kuruş, hedef başına).
  const od = k._odenen || {};
  return satirsizHedefler(k, dav).map(h => {
    const kalanK = k.odendi ? 0 : Math.max(0, h.toplamK - (od[h.hedef] || 0));
    return { ...h, kalanK, odendi: kalanK === 0, odenenAdet: kalanK === 0 ? 1 : 0, toplamAdet: 1, taksitli: false };
  });
};
// Spec 0060 R11, R16, C2 (AC-13, AC-35): ek ödemelerin TÜR bazında toplamı (resmi + elden tek tutar; kişi, açıklama ve
// resmi/elden ayrımı yok). Kalem listesinin satırı ([k]) ve Aylık Gider ve Kasa Raporu (dönemin kalemleri) bu fonksiyonu
// çağırır; ikinci bir toplama yazılmaz. Sıra EK_ODEME_TURLERI'nin sırasıdır (deterministik), toplamı 0 olan tür dönmez.
// Triyaj (bulgu 1): `bilesen` ("resmi" | "elden") verilirse yalnız o bileşen toplanır; ek ödeme hedeflerinin rozeti (resmi /
// elden) kendi kapattığı türleri böyle gösterir. Verilmezse resmi + elden (rapor ve kalem satırı).
export const ekOdemeTurToplamlari = (kalemler, { bilesen = null } = {}) => {
  const t = new Map();
  const tutarOf = (e) => (bilesen === "resmi" ? kurus(e?.resmiTutar) : bilesen === "elden" ? kurus(e?.eldenTutar) : ekSatirKurus(e));
  for (const k of kalemler || []) for (const e of Array.isArray(k?.ekOdemeler) ? k.ekOdemeler : []) {
    if (!EK_ODEME_TUR_AD[e?.tur]) continue;
    t.set(e.tur, (t.get(e.tur) || 0) + tutarOf(e));
  }
  return EK_ODEME_TURLERI.filter(x => (t.get(x.value) || 0) > 0).map(x => ({ tur: x.value, ad: x.label, toplamK: t.get(x.value) }));
};
// Spec 0060 R12, R31, C2 (AC-14, AC-30, AC-41): kira kalemlerinin stopajı; kesilen = ödenen + açık. Kapsam verilen kalemlerdir
// (rapor ayın kalemlerini ay sonu ödeme durumuyla verir). Açık, stopaj hedefinin kalanıdır (odemeHedefleri).
export const stopajOzeti = (kalemler, turMap) => {
  let kesilenK = 0, acikK = 0;
  for (const k of kalemler || []) {
    const dav = davranisOf(k, turMap);
    if (dav !== DAVRANIS.KIRA) continue;
    const kes = stopajKurus(k, dav);
    if (!(kes > 0)) continue;
    kesilenK += kes;
    const h = odemeHedefleri(k, dav).find(x => x.hedef === HEDEF.STOPAJ);
    acikK += Math.min(kes, h ? h.kalanK : kes);
  }
  return { kesilenK, odenenK: kesilenK - acikK, acikK };
};
export const hedefGecti = (h, bugun) => !h.odendi && !!h.vade && !!bugun && h.vade < bugun;
// R3: "odendi" | "kismen" | "odenmedi". Satırsız kalemde ikili.
export const odemeDurumu = (k) => {
  if (!satirliMi(k)) return k?.odendi ? "odendi" : Object.values(k?._odenen || {}).reduce((a, v) => a + (v || 0), 0) > 0 ? "kismen" : "odenmedi";
  const odenen = k.taksitler.filter(r => r.odendi).length;
  return odenen === k.taksitler.length ? "odendi" : odenen > 0 || k.taksitler.some(r => (r._odenenK || 0) > 0) ? "kismen" : "odenmedi";
};
// R3, AC-25: kalem alanları satırlardan tek yönlü türetilir.
export const taksitDurumuTuret = (k) => {
  if (!satirliMi(k)) return k;
  const sat = k.taksitler;
  const odendi = sat.every(r => r.odendi);
  const acikVadeler = sat.filter(r => !r.odendi).map(r => r.vade).filter(Boolean).sort();
  const tumVadeler = sat.map(r => r.vade).filter(Boolean).sort();
  const odemeTarihleri = sat.map(r => r.odemeTarihi).filter(Boolean).sort();
  return { ...k, odendi, odemeTarihi: odendi ? (odemeTarihleri[odemeTarihleri.length - 1] || null) : null,
    sonOdemeTarihi: acikVadeler[0] || (odendi ? tumVadeler[tumVadeler.length - 1] || null : null) };
};
// Spec 0024 triyaj bulgu 3: ödeme işaretleyen eski yardımcılar (odemeDurumuDegistir, odendiIsaretle, taksitIsaretle,
// hedefIsaretle, hedefDurumuDegistir) kaldırıldı; ödeme bir hareket kaydıdır, durum odemeleriUygula ile türer.
// Kalemin ödeme satırlarını kurar (kayıt anı ve tekrarlayan üretim). plan: { taksitSayisi, ilkVade, stopajTaksitSayisi,
// stopajVade }. Satırsız eski kalemde ödenmiş durum yeni satırlara taşınır (R13). Dönen: { satirlar } | { hata, alan }.
// Taksit sayısı 1–60 arası tam sayıdır (triyaj bulgu 3): boş = 1 (taksitsiz). Formdaki üst sınır yalnız ipucudur;
// kural burada, önizleme ve kayıt aynı yerden geçer.
export const TAKSIT_SAYISI_MAX = 60;
export const taksitSayisiCoz = (v) => {
  const t = String(v ?? "").trim();
  if (t === "") return { deger: 1 };
  const n = Number(t);
  if (!Number.isInteger(n) || n < 1 || n > TAKSIT_SAYISI_MAX) return { hata: `Taksit sayısı 1 ile ${TAKSIT_SAYISI_MAX} arasında tam sayı olmalı.` };
  return { deger: n };
};
const satirOdemeAlmis = (x) => x.odendi || (x._odenenK || 0) > 0;
// Spec 0042 Q4: elden satırı olmayan eski satırlı personel kaleminin ana satırı ödeme almışsa kalem ikiye bölünmez.
// Spec 0048 R7: nedeni formda iki yerde (vade alanları, ödeme kutusu) aynı sabitten yazılır.
export const PERSONEL_BOLUNMEZ_NEDENI = "Bu kalem eski planla ödendiği için resmi ve elden olarak ayrılmaz.";
export const personelBolunmezMi = (eskiSatirlar, dav) => dav === DAVRANIS.PERSONEL && Array.isArray(eskiSatirlar) && eskiSatirlar.length > 0
  && !eskiSatirlar.some(x => x.hedef === HEDEF.ELDEN) && eskiSatirlar.some(x => (x.hedef || HEDEF.ANA) === HEDEF.ANA && satirOdemeAlmis(x));
// Spec 0054 R10, R21 (Q1): ek ödeme taraf başına ayrılır; bir tarafın (resmi = ANA, elden = ELDEN) ödeme almış satırlarının
// tutarları yeni maaş hedefini aşıyorsa o satırlar ek ödemeyi zaten içeriyordur (eski plan) ve ayrılmaz: ayırmak satırı
// ödenenin altına düşürür (planYenidenBol hatası). Ek hedef satırı zaten varsa (ayrılmış kalem) ayrım korunur.
export const PERSONEL_EK_BOLUNMEZ_NEDENI = "Bu kalemin ödenmiş maaş satırı ek ödemeyi de içeriyor; ek ödeme ayrı bir bölüm olarak ödenmez.";
export const personelAyrimi = (kayit, eskiSatirlar, dav) => {
  if (dav !== DAVRANIS.PERSONEL) return PERSONEL_TAM_AYRIM;
  const eski = Array.isArray(eskiSatirlar) ? eskiSatirlar : [];
  const elden = !personelBolunmezMi(eski, dav);
  const maasR = kurus(kayit?.resmiTutar), maasE = kurus(kayit?.eldenTutar);
  const odenmisK = (h) => eski.filter(x => (x.hedef || HEDEF.ANA) === h && satirOdemeAlmis(x)).reduce((t, x) => t + kurus(x.tutar), 0);
  const varMi = (h) => eski.some(x => x.hedef === h);
  const anaAsar = odenmisK(HEDEF.ANA) > maasR + (elden ? 0 : maasE);
  const ekResmi = varMi(HEDEF.EK_RESMI) || !anaAsar;
  const ekElden = varMi(HEDEF.EK_ELDEN) || (elden ? odenmisK(HEDEF.ELDEN) <= maasE : !anaAsar);
  return { elden, ekResmi, ekElden };
};
// Kayıtlı (ya da önizleme) kalemin bugünkü yapısı: satırlı kalemde hangi hedeflerin satırı varsa onlar ayrıdır; satırsız
// kalemde çok hedefliyse hepsi ayrı (okuma anı, R9), tek hedefliyse hepsi ANA'da. Kırılım (0048 R13) bununla okunur.
export const kalemPersonelAyrimi = (k, dav) => {
  if (dav !== DAVRANIS.PERSONEL) return PERSONEL_TAM_AYRIM;
  if (satirliMi(k)) { const v = (h) => k.taksitler.some(x => x.hedef === h); return { elden: v(HEDEF.ELDEN), ekResmi: v(HEDEF.EK_RESMI), ekElden: v(HEDEF.EK_ELDEN) }; }
  return personelCokHedef(k, dav) ? PERSONEL_TAM_AYRIM : PERSONEL_TEK;
};
// Formun ve ödeme kutusunun nedeni: kalemin ek ödemesi olan bir taraf R21 gereği ayrılamıyor mu.
export const personelEkBolunmezMi = (kayit, eskiSatirlar, dav) => {
  if (dav !== DAVRANIS.PERSONEL) return false;
  const a = personelAyrimi(kayit, eskiSatirlar, dav);
  const ek = Array.isArray(kayit?.ekOdemeler) ? kayit.ekOdemeler : [];
  const ekR = ek.reduce((t, e) => t + kurus(e?.resmiTutar), 0), ekE = ek.reduce((t, e) => t + kurus(e?.eldenTutar), 0);
  return (ekR > 0 && !a.ekResmi) || (ekE > 0 && !a.ekElden);
};
export const odemeSatirlariKur = (kayit, dav, plan = {}, { uid = varsayilanUid, eskiSatirlar = null, eskiOdendi = false, eskiOdemeTarihi = null } = {}) => {
  const anaCoz = taksitSayisiCoz(plan.taksitSayisi);
  if (anaCoz.hata) return { hata: anaCoz.hata, alan: "taksitSayisi" };
  const anaSayi = anaCoz.deger;
  const stK = stopajKurus(kayit, dav);
  const kiraIkiHedef = dav === DAVRANIS.KIRA && stK > 0;
  const eski = Array.isArray(eskiSatirlar) ? eskiSatirlar : [];
  // Spec 0042 R4, Q4 + 0054 R15, R21: çok hedefli personel kalemi maaş resmi (ANA, taksitlenebilir), maaş elden ve iki ek
  // ödeme hedefiyle (üçü tek satır) doğar; taraf başına ayrılamayan bileşen maaş hedefinin içinde kalır (personelAyrimi).
  const odemeAlmis = satirOdemeAlmis;
  const personelCok = personelCokHedef(kayit, dav);
  const ayrim = personelCok ? personelAyrimi(kayit, eski, dav) : PERSONEL_TEK;
  const hedefTop = (h) => hedefToplamKurus(kayit, dav, h, { ayrim });
  // R17: ek ödeme hedeflerinin vadesi kalemin ilk vadesidir (ayrı vade alanı yok, X2).
  const vadeOf = (h) => (h === HEDEF.STOPAJ ? plan.stopajVade : h === HEDEF.ELDEN ? (plan.eldenVade || plan.ilkVade)
    : h === HEDEF.EK_RESMI || h === HEDEF.EK_ELDEN ? plan.ilkVade : plan.ilkVade) || null;
  const eskiHedef = (h) => {
    // Satırsız eski kalem ödenmişse (R13) yeni hedef satırları ödenmiş doğar; vade kalemin eski vadesidir
    // (triyaj bulgu 1: silinmesin).
    if (!eski.length && eskiOdendi) return [{ id: uid(), hedef: h, sira: 1, vade: vadeOf(h), tutar: tl(hedefTop(h)), odendi: true, odemeTarihi: eskiOdemeTarihi }];
    return eski.filter(x => (x.hedef || HEDEF.ANA) === h);
  };
  // Ana hedefte satır gerekir: kira iki hedefliyse, taksit istenmişse ya da daha önce ödenmiş bir ana satırı varsa
  // (triyaj bulgu 2: stopaj sıfıra çekilince kiraya verene yapılmış ödeme kaybolmasın).
  const anaOdenmisVar = eski.some(x => (x.hedef || HEDEF.ANA) === HEDEF.ANA && x.odendi);
  const anaGerekli = kiraIkiHedef || personelCok || anaSayi >= 2 || anaOdenmisVar;
  const satirlar = [];
  if (anaGerekli) {
    const r = planYenidenBol(eskiHedef(HEDEF.ANA), hedefTop(HEDEF.ANA), anaSayi, vadeOf(HEDEF.ANA), { hedef: HEDEF.ANA, uid });
    if (r.hata) return { hata: r.hata, alan: "taksitSayisi" };
    satirlar.push(...r.satirlar);
  }
  // X7 + 0054 R6: elden ve ek ödeme hedefleri taksitlendirilmez, tek satırdır; ödeme almış eski satır korunur (tutar sıfıra
  // çekilse de). planYenidenBol her hedefi kendi satırlarıyla böler, yani resmi maaşın taksitleri ek ödemeyi etkilemez.
  for (const h of [HEDEF.ELDEN, HEDEF.EK_RESMI, HEDEF.EK_ELDEN]) {
    if (!((personelCok && hedefTop(h) > 0) || eski.some(x => x.hedef === h && odemeAlmis(x)))) continue;
    const r = planYenidenBol(eskiHedef(h), hedefTop(h), 1, vadeOf(h), { hedef: h, uid });
    if (r.hata) return { hata: r.hata, alan: h === HEDEF.ELDEN ? "eldenTutar" : "ekOdemeler" };
    satirlar.push(...r.satirlar);
  }
  if (kiraIkiHedef) {
    const stCoz = taksitSayisiCoz(plan.stopajTaksitSayisi);
    if (stCoz.hata) return { hata: stCoz.hata, alan: "stopajTaksitSayisi" };
    const r = planYenidenBol(eskiHedef(HEDEF.STOPAJ), stK, stCoz.deger, vadeOf(HEDEF.STOPAJ), { hedef: HEDEF.STOPAJ, uid });
    if (r.hata) return { hata: r.hata, alan: "stopajTaksitSayisi" };
    satirlar.push(...r.satirlar);
  }
  return { satirlar };
};

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
export const giderKalemDogrula = (form, { turMap, tedarikciler = [], uid = varsayilanUid } = {}) => {
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
    // Ek ödeme satırları (spec 0023 R9, P3): tamamen boş satır (iki tutar ve açıklama boş) atılır; negatif, sayıya
    // çevrilemeyen ya da toplamı sıfır olan satır hata verir. Hata satır numarasını taşır.
    const ekler = [];
    let ekHata = false;
    (Array.isArray(form.ekOdemeler) ? form.ekOdemeler : []).forEach((x, i) => {
      const er = tutarCoz(x?.resmiTutar), ee = tutarCoz(x?.eldenTutar);
      const aciklama = String(x?.aciklama || "").trim();
      if (er.bos && ee.bos && !aciklama) return;
      const sat = (mesaj) => { hatalar.push({ alan: "ekOdemeler", satir: i, mesaj }); ekHata = true; };
      if (er.gecersiz || ee.gecersiz) return sat(`Ek ödeme satırında tutar sayıya çevrilemedi (${i + 1}. satır).`);
      if (er.deger < 0 || ee.deger < 0) return sat(`Ek ödeme satırında tutar negatif olamaz (${i + 1}. satır).`);
      if (kurus(er.deger) + kurus(ee.deger) <= 0) return sat(`Ek ödeme satırında tutar sıfırdan büyük olmalı (${i + 1}. satır).`);
      const tur = EK_ODEME_TUR_AD[x?.tur] ? x.tur : "prim";
      ekler.push({ tur, aciklama, resmiTutar: er.bos ? null : er.deger, eldenTutar: ee.bos ? null : ee.deger });
    });
    // R11: "sıfırdan büyük" şartı kalemin genel toplamına (maaş + ek ödemeler) uygulanır; hata maaş alanında (P4).
    if (!r.gecersiz && !e.gecersiz && r.deger >= 0 && e.deger >= 0 && !ekHata && kurus(r.deger) + kurus(e.deger) + ekler.reduce((a, x) => a + ekSatirKurus(x), 0) <= 0) hata("resmiTutar", "Tutar sıfırdan büyük olmalı.");
    kayit.resmiTutar = r.bos ? null : r.deger;
    kayit.eldenTutar = e.bos ? null : e.deger;
    kayit.ekOdemeler = ekler;
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
    kayit.resmiTutar = null; kayit.eldenTutar = null; kayit.calisanId = null; kayit.calisanAd = null; kayit.ekOdemeler = [];
  } else {
    const t = tutarCoz(form.tutar);
    if (t.gecersiz) hata("tutar", "Tutar sayıya çevrilemedi. Örnek: 14.800,00");
    else if (t.bos || t.deger <= 0) hata("tutar", "Tutar sıfırdan büyük olmalı.");
    else kayit.tutar = t.deger;
    kayit.stopajOrani = null; kayit.girisYonu = null; kayit.netTutar = null;
    kayit.resmiTutar = null; kayit.eldenTutar = null; kayit.calisanId = null; kayit.calisanAd = null; kayit.ekOdemeler = [];
  }

  if (dav !== DAVRANIS.PERSONEL) {
    const k = tutarCoz(form.kdvOrani);
    if (k.gecersiz || k.deger < 0 || k.deger > 100) hata("kdvOrani", "KDV oranı 0 ile 100 arasında olmalı.");
    else kayit.kdvOrani = k.deger;
    if (form.tedarikciId && !tedarikciler.some(t => String(t.id) === String(form.tedarikciId))) hata("tedarikciId", "Seçilen tedarikçi bulunamadı.");
  }

  // Vade (R18, AC-71): tek alan; Çek'te etiket değişir.
  if (form.sonOdemeTarihi && form.tarih && form.sonOdemeTarihi < form.tarih) {
    hata("sonOdemeTarihi", "Son ödeme tarihi gider tarihinden önce olamaz."); // spec 0053 R31: vade kalemin borç vadesidir, yöntemden türemez
  }
  // Spec 0024 R3 (Q2): kalemin ödeme durumu saklanmaz, hareketten okunur (odemeleriUygula). Formdaki türetilmiş
  // durum yalnız satırsız eski kalemin tek satırını tohumlar (aşağıda eskiOdendi), kayda yazılmaz.
  delete kayit._odenen;
  kayit.odendi = false;
  kayit.odemeTarihi = null;

  // Ödeme planı (spec 0021 R1, R6, R10): form alanları kayda yazılmaz, satırlara çevrilir. Satırı olan kalemde
  // ödeme durumu satırlardan türetilir (R3); formdaki durum yalnız satırsız eski kalemin satırlarını tohumlar (R13).
  const plan = { taksitSayisi: form.taksitSayisi, ilkVade: form.sonOdemeTarihi || null, stopajTaksitSayisi: form.stopajTaksitSayisi, stopajVade: form.stopajVade || null, eldenVade: form.eldenVade || null };
  delete kayit.taksitSayisi; delete kayit.stopajTaksitSayisi; delete kayit.stopajVade; delete kayit.eldenVade;
  // Spec 0042 R14: elden vadesi yeni sütun değil, elden satırının vadesidir.
  if (dav === DAVRANIS.PERSONEL && form.eldenVade && form.tarih && form.eldenVade < form.tarih) hata("eldenVade", "Elden vadesi gider tarihinden önce olamaz.");
  if (Number(form.taksitSayisi) >= 2 && !form.sonOdemeTarihi) hata("sonOdemeTarihi", "İlk taksitin vadesi girilmedi.");
  if (dav === DAVRANIS.KIRA && Number(form.stopajTaksitSayisi) >= 2 && !form.stopajVade) hata("stopajVade", "İlk stopaj taksitinin vadesi girilmedi.");
  if (dav === DAVRANIS.KIRA && form.stopajVade && form.tarih && form.stopajVade < form.tarih) hata("stopajVade", "Stopaj vadesi gider tarihinden önce olamaz.");
  if (!hatalar.length) {
    const eskiSatirlar = Array.isArray(form.taksitler) ? form.taksitler : [];
    const r = odemeSatirlariKur(kayit, dav, plan, { uid, eskiSatirlar, eskiOdendi: !eskiSatirlar.length && !!form.odendi, eskiOdemeTarihi: form.odemeTarihi || null });
    if (r.hata) hata(r.alan, r.hata);
    else {
      // Spec 0024 R3 (Q2): ödeme durumu satıra yazılmaz, hareketten okunur; saklanan satır yalnız planı taşır.
      kayit.taksitler = r.satirlar.map(({ _odenenK, ...x }) => ({ ...x, odendi: false, odemeTarihi: null }));
      if (kayit.taksitler.length) Object.assign(kayit, taksitDurumuTuret(kayit));
    }
  }

  // Atama (K25, K38; spec 0020 R1, R5): kira her zaman ortak; personel normal kalemle aynı atamaları alır.
  if (!atanabilirMi(dav)) {
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
      // Dağıtım tabanı kalem tutarıdır; personelde resmi + elden (spec 0020 R2).
      const d = modelSatirlariDogrula(dav === DAVRANIS.PERSONEL ? tl(kalemKurus(kayit, dav)) : (kayit.tutar ?? 0), satirlar);
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
  if (!atanabilirMi(davranis)) r.ortak = top;
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
  const makina = atanabilirMi(davranis) && k.atamaTur === ATAMA.MAKINA && makinaCoz ? makinaCoz(k) : null;
  return { ...kovaKurus(k, davranis, !!makina, canliModeller), makinaCozum: makina };
};
export const kovaDagilimi = (k, { davranis = DAVRANIS.NORMAL, stock = [], customers = [], canliModeller = new Set() } = {}) => {
  const cozuldu = atanabilirMi(davranis) && k.atamaTur === ATAMA.MAKINA && !!makinaGideriCoz(k, { stock, customers });
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
      // Spec 0053 R26: yöntem ödemenin alanıdır; tanımdaki eski değer kopyalanmaz (veride kalır, okunmaz).
      odendi: false, odemeTarihi: null, odemeYontemi: "", sonOdemeTarihi: null,
      tedarikciId: dav === DAVRANIS.PERSONEL ? null : (t.tedarikciId ?? null),
      atamaTur: "", makinaTur: null, makinaId: null, modelSatirlari: [],
    };
    if (dav === DAVRANIS.PERSONEL) {
      const c = calisanlar.find(x => String(x.id) === String(t.calisanId) && !x.deletedAt);
      const r = tutarCoz(c?.resmiMaliyet), e = tutarCoz(c?.eldenMaliyet);
      if (!c) { atlanan.push({ tanim: t, neden: "Çalışan bulunamadı." }); guncelTanimlar.push(t); continue; }
      if (kurus(r.deger) + kurus(e.deger) <= 0) { atlanan.push({ tanim: t, neden: `${c.ad} için aylık maliyet girilmemiş.` }); guncelTanimlar.push(t); continue; }
      // Spec 0023 R4: ek ödemeler her ay elle girilir; üretim boş başlatır, önceki ayın tutarı taşınmaz.
      Object.assign(kalem, { calisanId: c.id, calisanAd: c.ad, aciklama: t.ad || c.ad, resmiTutar: r.bos ? null : r.deger, eldenTutar: e.bos ? null : e.deger, tutar: null, kdvOrani: 0, ekOdemeler: [] });
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
    // Stopajlı kira iki ödeme hedefiyle doğar (spec 0021 R6); satırlar kalemle birlikte kurulur.
    const odeme = odemeSatirlariKur(kalem, dav, {}, uid ? { uid } : {});
    kalem.taksitler = odeme.satirlar || [];
    if (kalem.taksitler.length) Object.assign(kalem, taksitDurumuTuret(kalem));
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
      if (!tr.calisanlar.has(ck)) tr.calisanlar.set(ck, { calisanId: k.calisanId, ad: k.calisanAd || "", resmi: 0, elden: 0, ek: 0, toplam: 0, ekSatirlari: [] });
      const c = tr.calisanlar.get(ck);
      // Spec 0023 R7 (P2): resmi ve elden yalnız maaş; ek ödemeler ayrı sütun ve satır satır.
      c.resmi += kurus(k.resmiTutar); c.elden += kurus(k.eldenTutar); c.ek += ekOdemeKurus(k); c.toplam += tut;
      for (const e of (k.ekOdemeler || [])) c.ekSatirlari.push({ kalemId: k.id, tarih: k.tarih, tur: e.tur, aciklama: e.aciklama || "", tutar: tl(ekSatirKurus(e)) });
    }

    const cz = atanabilirMi(dav) && k.atamaTur === ATAMA.MAKINA ? makinaCoz(k) : null;
    const kv = kovaKurus(k, dav, !!cz, canliModeller);
    for (const key of Object.keys(kova)) { kova[key] += kv[key]; if (kv[key] > 0) kovaKatki[key]++; }
    if (kv.makina > 0) {
      const key = `${cz.tur}:${cz.id}`;
      if (!makinaMap.has(key)) makinaMap.set(key, { anahtar: key, makina: cz, toplam: 0, kalemler: [] });
      const m = makinaMap.get(key); m.toplam += kv.makina; m.kalemler.push(k);
    }
    if (atanabilirMi(dav) && k.atamaTur === ATAMA.MAKINA && kv.makina === 0) dusenAtamalar.push({ kalem: k, neden: "makina" });
    if (atanabilirMi(dav) && k.atamaTur === ATAMA.MODEL) {
      (k.modelSatirlari || []).forEach(s => {
        const st = kurus(s.birimMaliyet) * (Number(s.adet) || 0);
        if (!canliModeller.has(trLower(s.modelAd))) { dusenAtamalar.push({ kalem: k, neden: "model", modelAd: s.modelAd, tutar: tl(st) }); return; }
        const mk = trLower(s.modelAd);
        if (!modelMap.has(mk)) modelMap.set(mk, { model: s.modelAd, toplam: 0, satirlar: [] });
        const mm = modelMap.get(mk);
        mm.toplam += st;
        mm.satirlar.push({ kalemId: k.id, tarih: k.tarih, aciklama: kalemGorunenAd(k, dav), birimMaliyet: Number(s.birimMaliyet) || 0, adet: Number(s.adet) || 0, tutar: tl(st) });
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
    // Spec 0021 R4: yalnız ana hedefin kalanı (stopaj vergi dairesine gider, tedarikçi borcu değildir).
    const ana = odemeHedefleri(k, dav).find(h => h.hedef === HEDEF.ANA);
    const o = ana ? ana.kalanK : 0;
    if (k.tedarikciId && tedMap.has(String(k.tedarikciId))) {
      tedBorc.set(String(k.tedarikciId), (tedBorc.get(String(k.tedarikciId)) || 0) + o);
      if (bugun && ana && hedefGecti(ana, bugun)) tedVade.add(String(k.tedarikciId));
    } else secilmemisBorc += o;
  }
  const tedIds = new Set([...tedHarcama.keys(), ...tedBorc.keys()]);
  const tedSatirlari = [...tedIds].map(id => ({
    tedarikciId: id, ad: tedAdi(tedMap, id), harcama: tl(tedHarcama.get(id) || 0), acikBorc: tl(tedBorc.get(id) || 0), vadesiGecti: tedVade.has(id),
  })).sort((a, b) => (b.harcama - a.harcama) || a.ad.localeCompare(b.ad, "tr"));

  const turKirilimi = [...turKir.values()].map(t => ({
    ...t, toplam: tl(t.toplam),
    calisanlar: t.calisanlar ? [...t.calisanlar.values()].map(c => ({ ...c, resmi: tl(c.resmi), elden: tl(c.elden), ek: tl(c.ek), toplam: tl(c.toplam) })).sort((a, b) => a.ad.localeCompare(b.ad, "tr")) : null,
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
// Spec 0061 R2, R17 (AC-27): borç kapsamının TEK tanımı. borcOzeti ve açık kalemler motoru bunu çağırır; çöpteki, ödenmiş,
// tarihsiz, yürürlük öncesi ve gider tarihi `bugun`den sonra olan kalem kapsam dışıdır (ödenecek 0 hedef düzeyinde düşer).
export const borcKapsamindaMi = (k, { esik = "", bugun = null } = {}) => !(k.deletedAt || k.odendi || !k.tarih || k.tarih < esik || (bugun && k.tarih > bugun));
export const borcOzeti = (giderler = [], { turler = [], tedarikciler = [], yururlukAy = null } = {}, bugun) => {
  const turMap = turHaritasi(turler);
  const tedMap = new Map(tedarikciler.map(t => [String(t.id), t]));
  const esik = yururlukAy ? `${yururlukAy}-01` : "";
  const ted = new Map();
  const cal = new Map();
  const secilmemis = { tutar: 0, adet: 0, vadesiGecti: false, kalemler: [] };
  const vergi = { tutar: 0, adet: 0, vadesiGecti: false, kalemler: [] };
  for (const k of giderler) {
    if (!borcKapsamindaMi(k, { esik, bugun })) continue;
    const dav = davranisOf(k, turMap);
    // Spec 0021 R4, R8: ödeme hedefi başına kalan tutar; stopaj vergi dairesi satırına gider.
    for (const h of odemeHedefleri(k, dav)) {
      const o = h.kalanK;
      if (o <= 0) continue;
      const gecti = bugun ? hedefGecti(h, bugun) : false;
      if (h.hedef === HEDEF.STOPAJ) { vergi.tutar += o; vergi.adet++; vergi.vadesiGecti = vergi.vadesiGecti || gecti; vergi.kalemler.push(k); continue; }
      if (dav === DAVRANIS.PERSONEL) {
        const ck = String(k.calisanId);
        if (!cal.has(ck)) cal.set(ck, { calisanId: k.calisanId, ad: k.calisanAd || "", tutar: 0, resmi: 0, elden: 0, hedefler: {}, vadesiGecti: false, kalemler: [] });
        // Spec 0042 R6, Q6: iki hedef aynı kalemi iki kez listelemez; resmi/elden kırılımı yalnız ayrıntıda gösterilir.
        const c = cal.get(ck); c.tutar += o; c.vadesiGecti = c.vadesiGecti || gecti;
        if (h.hedef === HEDEF.ELDEN || h.hedef === HEDEF.EK_ELDEN) c.elden += o; else c.resmi += o;
        c.hedefler[h.hedef] = (c.hedefler[h.hedef] || 0) + o; // spec 0054 R20: dört hedefin kırılımı (ayrıntı açıkken)
        if (!c.kalemler.includes(k)) c.kalemler.push(k);
      } else if (k.tedarikciId && tedMap.has(String(k.tedarikciId))) {
        const tk = String(k.tedarikciId);
        if (!ted.has(tk)) ted.set(tk, { tedarikciId: k.tedarikciId, ad: tedMap.get(tk).ad, tutar: 0, vadesiGecti: false, kalemler: [] });
        const t = ted.get(tk); t.tutar += o; t.vadesiGecti = t.vadesiGecti || gecti; t.kalemler.push(k);
      } else { secilmemis.tutar += o; secilmemis.adet++; secilmemis.vadesiGecti = secilmemis.vadesiGecti || gecti; secilmemis.kalemler.push(k); }
    }
  }
  const satirlar = [...ted.values()].map(t => ({ tur: "tedarikci", ...t, tutar: tl(t.tutar) }));
  if (secilmemis.tutar > 0) satirlar.push({ tur: "secilmemis", ad: "Tedarikçi seçilmemiş", ...secilmemis, tutar: tl(secilmemis.tutar) });
  // Sentetik satır (R8): tedarikçi kaydı açtırmaz; genel toplama girer, tedarikçi kartına girmez.
  if (vergi.tutar > 0) satirlar.push({ tur: "vergiDairesi", ad: VERGI_DAIRESI, ...vergi, tutar: tl(vergi.tutar) });
  if (cal.size) {
    const ayrinti = [...cal.values()].map(c => ({ ...c, tutar: tl(c.tutar), resmi: tl(c.resmi), elden: tl(c.elden), hedefler: Object.fromEntries(Object.entries(c.hedefler).map(([h, v]) => [h, tl(v)])) })).sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
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

// ── Ödeme hareketleri (spec 0024 A; R2, R3, R18; plan Q1, Q2, Q3) ─────────────
// Ödeme hareketi TEK doğruluk kaynağıdır. Kalemin ve taksidin ödeme durumu okuma anında türetilir; saklanan
// `odendi`/`odemeTarihi` ve 0021 satır bayrakları göçten sonra okunmaz. App bu fonksiyonu bir kez çağırır, gider
// ekranları, borç özeti ve hatırlatıcı zenginleştirilmiş kalemleri okur. Hareket: {tur: "odeme", giderId, taksitId?,
// tutar, tarih, tamKapatir?}. Taksitli/kira kalemde ödeme taksite bağlıdır; kaleme bağlı eski (göç) hareket satırlı
// kalemde taksitlere vadesi en yakından başlayarak dağılır, `tamKapatir` hepsini kapatır.
const satirSirasi = (a, b) => ((a.vade || "9999") < (b.vade || "9999") ? -1 : (a.vade || "9999") > (b.vade || "9999") ? 1 : (a.sira || 0) - (b.sira || 0));
export const KALEM_KAPATAN_TURLER = new Set(["odeme", "mahsup"]);
export const odemeleriUygula = (giderler = [], hareketler = null, turMap = new Map()) => {
  if (!Array.isArray(hareketler)) return giderler;
  const byGider = new Map();
  for (const h of hareketler) {
    // Spec 0024 B (R10): mahsup da kalemin kalanını düşer (kalan = ödenecek − ödemeler − mahsuplar); para hareketi değildir.
    if (!h || !KALEM_KAPATAN_TURLER.has(h.tur) || h.giderId == null) continue;
    const key = String(h.giderId);
    if (!byGider.has(key)) byGider.set(key, []);
    byGider.get(key).push(h);
  }
  return giderler.map(k => {
    const hs = (byGider.get(String(k.id)) || []).slice().sort((a, b) => (a.tarih || "").localeCompare(b.tarih || ""));
    const sonTarih = (liste) => liste.map(h => h.tarih).filter(Boolean).sort().pop() || null;
    const dav = davranisOf(k, turMap);
    if (satirliMi(k)) {
      const rows = k.taksitler.map(r => ({ ...r, _odenenK: 0, _tarihler: [] }));
      // Spec 0042 Q3: personelde kaleme bağlı hareket önce resmi, sonra elden hedefine (okuma anındaki satırsız dağıtımla
      // aynı sıra); kirada vade sırası değişmez.
      const hedefSira = (r) => HEDEF_SIRASI.indexOf(r.hedef || HEDEF.ANA);
      const dagitimSirasi = dav === DAVRANIS.PERSONEL ? (a, b) => hedefSira(a) - hedefSira(b) || satirSirasi(a, b) : satirSirasi;
      const byId = new Map(rows.map(r => [String(r.id), r]));
      for (const h of hs) {
        if (h.taksitId != null && byId.has(String(h.taksitId))) {
          const r = byId.get(String(h.taksitId));
          r._odenenK += h.tamKapatir ? kurus(r.tutar) : kurus(h.tutar); r._tarihler.push(h.tarih);
        } else {
          // kaleme bağlı hareket: tamKapatir hepsini, tutarlı olan vadesi en yakından başlayarak dağılır
          let kalan = h.tamKapatir ? Infinity : kurus(h.tutar);
          for (const r of rows.slice().sort(dagitimSirasi)) {
            if (kalan <= 0) break;
            const acik = Math.max(0, kurus(r.tutar) - r._odenenK);
            if (!acik) continue;
            const pay = Math.min(acik, kalan);
            r._odenenK += pay; r._tarihler.push(h.tarih); kalan -= pay;
          }
        }
      }
      const taksitler = rows.map(({ _tarihler, ...r }) => {
        const odendi = kurus(r.tutar) > 0 && r._odenenK >= kurus(r.tutar);
        return { ...r, odendi, odemeTarihi: odendi ? (_tarihler.filter(Boolean).sort().pop() || null) : null };
      });
      return taksitDurumuTuret({ ...k, taksitler });
    }
    // Satırsız kalem: ödenen tutar hedef sırasıyla dağılır (ana; personelde resmi → elden; kirada → stopaj; C9).
    const hedefler = satirsizHedefler(k, dav);
    const odenen = Object.fromEntries(hedefler.map(h => [h.hedef, 0]));
    let tam = false;
    for (const h of hs) {
      if (h.tamKapatir) { tam = true; continue; }
      let t = kurus(h.tutar);
      for (const hd of hedefler) {
        if (t <= 0) break;
        const a = Math.min(t, Math.max(0, hd.toplamK - odenen[hd.hedef])); odenen[hd.hedef] += a; t -= a;
      }
    }
    if (tam) for (const hd of hedefler) odenen[hd.hedef] = hd.toplamK;
    const topK = hedefler.reduce((a, hd) => a + hd.toplamK, 0);
    const odendi = tam || (topK > 0 && hedefler.every(hd => odenen[hd.hedef] >= hd.toplamK));
    return { ...k, odendi, odemeTarihi: odendi ? sonTarih(hs) : null, _odenen: odenen };
  });
};
// Bir ödeme hedefinin kalanı (kuruş): taksitli kalemde taksit, taksitsiz kalemde kalem. Kalem zenginleştirilmiş olmalı.
export const odemeHedefKalaniK = (k, dav, taksitId = null) => {
  if (!k) return 0;
  if (satirliMi(k)) {
    const r = k.taksitler.find(x => String(x.id) === String(taksitId));
    return r ? Math.max(0, kurus(r.tutar) - (r._odenenK || 0)) : 0;
  }
  return odemeHedefleri(k, dav).reduce((a, h) => a + h.kalanK, 0);
};
// Bir hedefin kayıtlı ödemeleri (pencere listesi): taksitte o taksite bağlı olanlar, kalemde kaleme bağlı hepsi.
export const hedefOdemeleri = (hareketler = [], giderId, taksitId = null) => (hareketler || [])
  .filter(h => h && KALEM_KAPATAN_TURLER.has(h.tur) && String(h.giderId) === String(giderId) && (taksitId == null || String(h.taksitId) === String(taksitId)))
  .sort((a, b) => (a.tarih || "").localeCompare(b.tarih || ""));
