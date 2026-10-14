// Spec 0084: kira stopajının beyan dönemi. Saf, React'sız. Dönem anahtarı, ödeme tarihi ve üç adlandırıcı YALNIZ burada
// hesaplanır (C3; kaynak taraması `stopaj-donemi-0084` AC-8). Ay sonuna kırpma gider.js'in ayEkleGun'undadır (R4);
// bu dosya kırpmayı ikinci kez yazmaz, gunSayisi'ni içe almaz.
//
// Vade türetilmez, saklanır (R7, C2): bu modül gider formunun ön doldurmasına ve tekrarlayan üretimin `stopajVadeOf`
// seçeneğine tarih verir; odemeHedefleri vadeyi kayıttan okumaya devam eder. Pencerenin dönem gruplaması ise canlıdır
// (R10): ayar değişince dönemler yeniden kurulur, toplam açık stopaj aynı kalır.
// stopajKurus modül içidir; dışa verilen kalemStopaj aynı hesabın TL hâlidir (kuruşa geri çevrilir).
import { ayEkleGun, davranisOf, odemeHedefleri, kalemStopaj, stopajOzeti, satirliMi, borcKapsamindaMi, kurus, turHaritasi, DAVRANIS, HEDEF } from "./gider";

export const BEYAN_DONEMI = { AYLIK: "aylik", UC_AYLIK: "ucAylik" };
export const BEYAN_DONEMI_AD = { aylik: "Aylık", ucAylik: "Üç aylık" };
export const STOPAJ_BEYAN_VARSAYILAN = { donem: BEYAN_DONEMI.UC_AYLIK, gun: 26 };
const AY_ADLARI = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const iki = (n) => String(n).padStart(2, "0");

const gunGecerli = (g) => Number.isInteger(g) && g >= 1 && g <= 31;
// R2: TEK okuma yolu. Alan yoksa ya da bozuksa varsayılan (üç aylık, 26); kaynakta ikinci bir varsayılan yazılmaz.
export const stopajBeyanAyari = (giderAyarlari) => {
  const d = giderAyarlari?.stopajBeyanDonemi;
  const g = Number(giderAyarlari?.stopajOdemeGunu);
  return {
    donem: d === BEYAN_DONEMI.AYLIK || d === BEYAN_DONEMI.UC_AYLIK ? d : STOPAJ_BEYAN_VARSAYILAN.donem,
    gun: gunGecerli(g) ? g : STOPAJ_BEYAN_VARSAYILAN.gun,
  };
};
// R2, AC-2: dönem iki değerden biri, gün 1–31 tam sayı (metin olarak girilir). Geçersizse { hata }.
export const stopajBeyanDogrula = ({ donem, gun } = {}) => {
  if (donem !== BEYAN_DONEMI.AYLIK && donem !== BEYAN_DONEMI.UC_AYLIK) return { hata: "Kira stopajı beyan dönemi Aylık ya da Üç aylık olmalı." };
  const t = String(gun ?? "").trim();
  if (!/^\d+$/.test(t) || !gunGecerli(Number(t))) return { hata: "Stopaj ödeme günü 1 ile 31 arasında tam sayı olmalı." };
  return { deger: { donem, gun: Number(t) } };
};

// R3, R4, R6: kalemin gider tarihinden beyan dönemi. ayar: stopajBeyanAyari'nın sonucu (verilmezse varsayılan).
// Ödeme tarihi = dönemin SON ayı + ayarlı gün dizesinden ayEkleGun(…, 1): izleyen ay, gün yoksa ay sonuna kırpılır (R4).
// Dönemin son günü ayEkleGun(…, 0) ile (aynı kırpma, ikinci kez yazılmaz).
export const stopajDonemi = (tarih, ayar = STOPAJ_BEYAN_VARSAYILAN) => {
  if (!tarih) return null;
  const [y, m] = String(tarih).split("-").map(Number);
  if (!y || !m) return null;
  const a = ayar || STOPAJ_BEYAN_VARSAYILAN;
  const aylik = a.donem === BEYAN_DONEMI.AYLIK;
  const ceyrek = Math.floor((m - 1) / 3) + 1;
  const basAy = aylik ? m : (ceyrek - 1) * 3 + 1;
  const sonAy = aylik ? m : ceyrek * 3;
  const odemeTarihi = ayEkleGun(`${y}-${iki(sonAy)}-${iki(a.gun)}`, 1);
  const bitis = ayEkleGun(`${y}-${iki(sonAy)}-31`, 0);
  const etiket = aylik ? `${AY_ADLARI[m - 1]} ${y}` : `${y} ${ceyrek}. dönem`;
  return {
    anahtar: aylik ? `${y}-${iki(m)}` : `${y}-Q${ceyrek}`,
    yil: y, ceyrek: aylik ? null : ceyrek, basAy, sonAy, odemeTarihi, bitis,
    donemAdi: aylik ? etiket : `${etiket} (${AY_ADLARI[basAy - 1]}-${AY_ADLARI[sonAy - 1]})`,
    odemeAciklamasi: `${etiket} kira stopajı`,
    hatirlatmaAdi: `${etiket} kira stopajı`,
  };
};
// R7/1, R9: ön doldurma ve tekrarlayan üretim için tek giriş (yalnız tarih).
export const stopajOdemeTarihi = (tarih, ayar) => stopajDonemi(tarih, ayar)?.odemeTarihi || null;

const kalanOf = (t) => Math.max(0, kurus(t.tutar) - (t._odenenK || 0));
// R15/3: STOPAJ hedefinin açık ödeme satırları, dönem anahtarıyla. kalemler: odemeleriUygula'dan geçmiş kalemler.
// Satırsız (eski) kalem aday üretmez (R17: ödeme hedefe bağlanamaz); dönem satırında salt okunur görünür.
export const stopajAdaylari = (kalemler = [], turMap = new Map(), ayar) => {
  const r = [];
  for (const k of kalemler) {
    if (!k || k.deletedAt || davranisOf(k, turMap) !== DAVRANIS.KIRA || !satirliMi(k)) continue;
    const d = stopajDonemi(k.tarih, ayar);
    const stp = k.taksitler.filter(t => t.hedef === HEDEF.STOPAJ);
    for (const t of stp) {
      const kalanK = kalanOf(t);
      if (kalanK > 0) r.push({ anahtar: `${k.id}:${t.id}`, giderId: k.id, taksitId: t.id, kalanK, vade: t.vade || null, kalem: k,
        sira: t.sira, toplamAdet: stp.length, donemAnahtari: d?.anahtar || null });
    }
  }
  return r.sort((a, b) => (a.vade || "9999").localeCompare(b.vade || "9999") || String(a.kalem.tarih).localeCompare(String(b.kalem.tarih)) || (a.sira || 0) - (b.sira || 0));
};

// R12, R13, AC-15–AC-19, AC-26: Stopaj Dönemleri penceresinin satırları. Kapsam borç özetiyle aynı tek kural
// (borcKapsamindaMi: çöp, tarihsiz, yürürlük öncesi, gelecek tarihli hariç; tam ödenmiş kalem dahil, aşağıdaki not). Satır başına kesilen,
// ödenen ve açık stopaj stopajOzeti'nin aynı kuralıyla (kesilen = ödenen + açık; toplam stopajOzeti ile eşit, AC-16).
// giderler: odemeleriUygula'dan geçmiş kalemler. Dönüş: { donemler (ödeme tarihine göre), acikDonemSayisi, toplam }.
export const stopajDonemleri = (giderler = [], { turler = [], yururlukAy = null, ayar } = {}, bugun) => {
  const turMap = turHaritasi(turler);
  const esik = yururlukAy ? `${yururlukAy}-01` : "";
  const map = new Map();
  for (const k of giderler) {
    // Spec revizyon 4 (R13, AC-16): borç özetinin tek kuralı, "tam ödenmiş kalem" şartı hariç. Aksi hâlde stopajı ve kirası
    // ödenmiş kalem dönemden düşer: dönemin kesilen rakamı eksik görünür ve "kapanmış dönemler" (R13) hiç oluşmaz. Açık tutar
    // ve toplamın açık kısmı stopajOzeti(borç kapsamındaki kalemler) ile aynı kalır (ödenmiş kalemin açığı sıfırdır, AC-16).
    if (!borcKapsamindaMi({ ...k, odendi: false }, { esik, bugun })) continue;
    const dav = davranisOf(k, turMap);
    if (dav !== DAVRANIS.KIRA) continue;
    const kes = kurus(kalemStopaj(k, dav));
    if (!(kes > 0)) continue;
    const d = stopajDonemi(k.tarih, ayar);
    if (!d) continue;
    if (!map.has(d.anahtar)) map.set(d.anahtar, { ...d, kesilenK: 0, acikK: 0, kalemSayisi: 0, satirSayisi: 0, satirlar: [], vadeFarkli: false });
    const s = map.get(d.anahtar);
    const h = odemeHedefleri(k, dav).find(x => x.hedef === HEDEF.STOPAJ);
    s.kesilenK += kes;
    s.acikK += Math.min(kes, h ? h.kalanK : kes);
    s.kalemSayisi += 1;
    if (satirliMi(k)) {
      const stp = k.taksitler.filter(t => t.hedef === HEDEF.STOPAJ);
      // Triyaj bulgu 5 (R13): "Satır" sütunu dönemin bütün stopaj ödeme satırlarını sayar (ödenmişler dahil).
      s.satirSayisi += stp.length;
      if (stp.some(t => t.vade && t.vade !== d.odemeTarihi)) s.vadeFarkli = true;
      // Triyaj bulgu 4 (R15/3): ödenebilir satırlar tek aday üreticisinden (stopajAdaylari); ikinci kopya yok.
      for (const a of stopajAdaylari([k], turMap, ayar)) s.satirlar.push({ ...a, satirsiz: false });
    } else {
      s.satirSayisi += 1; // satırsız kalemin stopajı tek hedeftir
      // R17: satırsız kalemin stopajı salt okunur satır (ödenemez, nedeni pencerede).
      if (h && h.kalanK > 0) s.satirlar.push({ anahtar: `${k.id}:`, giderId: k.id, taksitId: null, kalanK: Math.min(kes, h.kalanK), vade: null, kalem: k, sira: 0, toplamAdet: 1, satirsiz: true });
    }
  }
  const donemler = [...map.values()].map(s => {
    const odenenK = s.kesilenK - s.acikK;
    // R13/1: "vadesi geçti" satırın kendi vadesine, vadesi yoksa hesaplanan dönem tarihine göre.
    const gecti = !!bugun && s.satirlar.some(x => (x.vade || s.odemeTarihi) < bugun);
    const durum = s.acikK === 0 ? "odendi" : gecti ? "gecti" : odenenK > 0 ? "kismen" : "acik";
    s.satirlar.sort((a, b) => (a.vade || s.odemeTarihi).localeCompare(b.vade || s.odemeTarihi) || String(a.kalem.tarih).localeCompare(String(b.kalem.tarih)) || (a.sira || 0) - (b.sira || 0));
    return { ...s, odenenK, durum, kapanmadi: !!bugun && bugun <= s.bitis };
  }).sort((a, b) => a.odemeTarihi.localeCompare(b.odemeTarihi) || a.anahtar.localeCompare(b.anahtar));
  const toplam = donemler.reduce((t, d) => ({ kesilenK: t.kesilenK + d.kesilenK, odenenK: t.odenenK + d.odenenK, acikK: t.acikK + d.acikK }), { kesilenK: 0, odenenK: 0, acikK: 0 });
  return { donemler, acikDonemSayisi: donemler.filter(d => d.acikK > 0).length, toplam };
};
export const STOPAJ_DURUM_AD = { odendi: "Ödendi", kismen: "Kısmen ödendi", acik: "Açık", gecti: "Vadesi geçti" };
export const SATIRSIZ_STOPAJ_NEDENI = "Bu kalemin ödeme satırları yok; kalemi bir kez kaydedin, stopaj ayrı ödenebilir hâle gelir.";
export const DONEM_KAPANMADI = "dönem henüz kapanmadı";
export const VADE_FARKLI = "kalem vadeleri farklı";

// R21/1, AC-33: raporun "GİDER · STOPAJ" kutusundaki beyan dönemi tablosu. aykalemler: ayın kalemleri (dönemler buradan seçilir);
// tumKalemler: dönemin bütün kalemleri (çağıran kapsamı verir: ay sonu durumu, çöp ve yürürlük öncesi hariç, ay sonundan sonra
// tarihli değil). Her dönemin kesilen/ödenen/açık rakamı stopajOzeti'nden (yeniden hesap yok).
export const stopajDonemOzetleri = (aykalemler = [], tumKalemler = [], turMap = new Map(), ayar) => {
  const anahtarlar = new Map();
  for (const k of aykalemler) {
    const dav = davranisOf(k, turMap);
    if (dav !== DAVRANIS.KIRA || !(kurus(kalemStopaj(k, dav)) > 0)) continue;
    const d = stopajDonemi(k.tarih, ayar);
    if (d && !anahtarlar.has(d.anahtar)) anahtarlar.set(d.anahtar, d);
  }
  return [...anahtarlar.values()].sort((a, b) => a.odemeTarihi.localeCompare(b.odemeTarihi)).map(d => {
    const o = stopajOzeti(tumKalemler.filter(k => stopajDonemi(k.tarih, ayar)?.anahtar === d.anahtar), turMap);
    return { anahtar: d.anahtar, donemAdi: d.donemAdi, odemeTarihi: d.odemeTarihi, kesilenK: o.kesilenK, odenenK: o.odenenK, acikK: o.acikK };
  });
};
