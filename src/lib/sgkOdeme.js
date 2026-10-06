// Spec 0070 R15, R16, C6, X8: ayın SGK borcunun tek işlemde ödenmesi (saf). Mevcut tek kalem doğrulayıcısının
// (kasa.cokluOdemeDogrula) üstüne yazılmış sarmalayıcıdır; o fonksiyonun ve odemeDogrula / odemeGirisiHazirla'nın imzası ve
// davranışı değişmez. Kullanıcı tek işlem yapar, veride her kalemin SGK hedefine bir hareket doğar (kalan borç kalem başına).
import { odemeHedefleri, davranisOf, ayOf, borcKapsamindaMi, kalemGorunenAd, tl, DAVRANIS, HEDEF } from "./gider";
import { cokluOdemeDogrula } from "./kasa";
import { fmtTR } from "./utils";

// Triyaj: SGK satırı olmayan (satırsız) kalem: güncellenmemiş istemcinin kaydettiği ya da yedekten gelen kalem. Satırsız
// dağıtım ödemeyi hedef sırasıyla (önce çalışan, SGK en son) doldurduğu için böyle kaleme yazılan "SGK" ödemesi çalışan
// hedefine düşerdi. Toplu ödeme bu kalemi reddeder; kalem açılıp kaydedilince SGK satırı kurulur.
export const SGK_SATIRSIZ_HATASI = "SGK satırı yok (eski sürümde kaydedilmiş); kalemi açıp kaydedin, sonra ödeyin.";

// Açık SGK hedefleri ay bazında (R15, Q4). Kapsam borç özetiyle aynı tek kuraldır (borcKapsamindaMi), böylece ayların
// toplamı borç özetindeki SGK satırına eşittir. Kişi adı taşınmaz; yalnız kişi sayısı (R13, R17).
// Dönen: [{ ay, kisi, toplamK, kalemler: [{ kalem, taksitId, kalanK }] }], eski aydan yeniye.
export const sgkAylari = (giderler = [], { turMap, yururlukAy = null, bugun = null } = {}) => {
  const esik = yururlukAy ? `${yururlukAy}-01` : "";
  const aylar = new Map();
  for (const k of giderler || []) {
    if (!borcKapsamindaMi(k, { esik, bugun })) continue;
    const dav = davranisOf(k, turMap);
    if (dav !== DAVRANIS.PERSONEL) continue;
    const h = odemeHedefleri(k, dav).find(x => x.hedef === HEDEF.SGK);
    if (!h || h.kalanK <= 0) continue;
    const ay = ayOf(k.tarih);
    if (!aylar.has(ay)) aylar.set(ay, { ay, kisiler: new Set(), toplamK: 0, kalemler: [] });
    const a = aylar.get(ay);
    a.kisiler.add(String(k.calisanId));
    a.toplamK += h.kalanK;
    const taksitId = (k.taksitler || []).find(r => r.hedef === HEDEF.SGK)?.id ?? null;
    a.kalemler.push({ kalem: k, taksitId, kalanK: h.kalanK, satirsiz: taksitId == null });
  }
  // Toplam borç özetindeki SGK satırıyla aynı kalır (satırsız kalem de sayılır); `satirsiz` kaç kalemin ödenemeyeceğini söyler.
  return [...aylar.values()].sort((x, y) => x.ay.localeCompare(y.ay))
    .map(({ kisiler, ...a }) => ({ ...a, kisi: kisiler.size, satirsiz: a.kalemler.filter(x => x.satirsiz).length }));
};

// Hata metninde kalemin adı gizlilik etiketiyle ("Personel gideri") ve tarihiyle; çalışan adı yazılmaz (R13, AC-19).
const kalemEtiketi = (k, turMap) => `${kalemGorunenAd(k, davranisOf(k, turMap))} · ${fmtTR(k.tarih)}`;

// R15, R16: seçilen ayın bütün SGK hedeflerine kalan tutarları kadar ödeme. Her kalem bugünkü doğrulayıcıdan geçer (kalandan
// fazla ödeme, TL dışı ya da kapalı hesap, taksit bağı); bir kalem bile geçmezse hiçbir hareket dönmez (ya hep ya hiç).
// Dönen: { hatalar: string[], hareketler: [...] | null }.
export const sgkToplamOdeme = (ayKaydi, { turMap, hesaplar = [], tarih, hesapId = null, yontem = "", aciklama = "" } = {}) => {
  const hatalar = [];
  const kalemler = ayKaydi?.kalemler || [];
  if (!kalemler.length) return { hatalar: ["Bu ayda açık SGK borcu yok."], hareketler: null };
  if (!tarih) return { hatalar: ["Ödeme tarihi girilmedi."], hareketler: null };
  const hareketler = [];
  for (const { kalem, taksitId, kalanK, satirsiz } of kalemler) {
    if (satirsiz) { hatalar.push(`${kalemEtiketi(kalem, turMap)}: ${SGK_SATIRSIZ_HATASI}`); continue; }
    const v = cokluOdemeDogrula({ tarih, satirlar: [{ tutar: tl(kalanK), yontem, hesapId, taksitId, aciklama }] }, { kalem, turMap, hesaplar });
    if (v.kayitlar) { hareketler.push(...v.kayitlar); continue; }
    const mesajlar = [v.hatalar?.genel, v.hatalar?.tarih, ...Object.values(v.hatalar?.satirlar || {}).flatMap(x => Object.values(x || {})), ...(v.hatalar?.hedefler || [])].filter(Boolean);
    hatalar.push(`${kalemEtiketi(kalem, turMap)}: ${[...new Set(mesajlar)].join(" ")}`);
  }
  return hatalar.length ? { hatalar, hareketler: null } : { hatalar: [], hareketler };
};
