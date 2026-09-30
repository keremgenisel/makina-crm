// Spec 0046: gider formundan hedef bazlı ödeme ve çek cirosu. Saf, React'sız. Hareketleri ödeme penceresiyle AYNI
// fonksiyonlar üretir (C2, AC-29): normal satırlar kasa.cokluOdemeDogrula'dan (her satır odemeDogrula), ciro satırı
// cek.ciroAdaylari + cek.ciroPlani'dan (R25). Form doğrulamayı geçici kalem kimliğiyle, Giderler kaydı gerçek kimlikle
// aynı fonksiyondan yapar (Q1); bu yüzden fonksiyon girdiden başka hiçbir şeye bakmaz.
import { cokluOdemeDogrula } from "./kasa";
import { ciroAdaylari, ciroPlani, CIRO_YONTEMI, portfoySatirlari, CEK_DURUM } from "./cek";
import { tl, kurus, satirliMi, davranisOf, odemeHedefleri, personelHedefKirilimi, personelBolunmezMi, DAVRANIS, HEDEF, HEDEF_SIRASI } from "./gider";

export const PASIF_TAKSIT_NEDENI = "Bu bölüm taksitli; taksitler kayıttan sonra ödeme penceresinden ödenir.";
export const HEPSI_TAKSITLI_NOTU = "Bu kalemin bütün ödemeleri taksitli; taksitler kayıttan sonra listedeki ödeme penceresinden girilir.";
export const CIRO_YALNIZ_ANA_NEDENI = { [HEDEF.STOPAJ]: "Vergi dairesine çekle ödeme yapılmaz; çek yalnız ana alacaklıya ciro edilir.",
  [HEDEF.ELDEN]: "Elden ödeme çekle yapılmaz; çek yalnız ana alacaklıya ciro edilir." };
export const CEK_YOK_NOTU = "Portföyde ciro edilebilecek (TL, portföyde duran) çek yok; başka bir yöntem seçin.";

// R1, R5, R6, R26: çizilecek hedef satırları, HEDEF_SIRASI sırasıyla. Tutarı sıfır olan hedef yoktur; iki ya da daha çok
// taksitli hedef pasiftir. taksitId: formdan ödenebilen hedefin tek satırı (satırsız kalemde null, Q2).
// Spec 0048 (R12, R13, C2): nesne ham ödenen tutarı (odenenK: satırda `_odenenK`, satırsızda `_odenen`; kırpılmaz),
// hedefin satır sayısını (satirSayisi) ve personelde maaş/ek ödeme kırılımını (maasK, ekOdemeK; diğerlerinde null) da taşır.
// Mevcut alanlar değişmedi (AC-28).
export const formOdemeHedefleri = (kalem, turMap) => {
  if (!kalem) return [];
  const dav = davranisOf(kalem, turMap);
  const satirli = satirliMi(kalem);
  const hedefler = odemeHedefleri(kalem, dav).filter(h => h.toplamK > 0);
  const ikiHedef = hedefler.some(h => h.hedef === HEDEF.ELDEN);
  return hedefler
    .sort((a, b) => HEDEF_SIRASI.indexOf(a.hedef) - HEDEF_SIRASI.indexOf(b.hedef))
    .map(h => {
      const satirlar = satirli ? kalem.taksitler.filter(r => (r.hedef || HEDEF.ANA) === h.hedef) : [];
      const pasif = satirlar.length > 1;
      const odenenK = satirli ? satirlar.reduce((a, r) => a + (r._odenenK != null ? r._odenenK : (r.odendi ? kurus(r.tutar) : 0)), 0)
        : (kalem._odenen ? (kalem._odenen[h.hedef] || 0) : (kalem.odendi ? h.toplamK : 0));
      const kirilim = dav === DAVRANIS.PERSONEL && h.hedef !== HEDEF.STOPAJ ? personelHedefKirilimi(kalem, h.hedef, ikiHedef) : { maasK: null, ekOdemeK: null };
      return { hedef: h.hedef, taksitId: satirli && !pasif ? satirlar[0]?.id ?? null : null, toplamK: h.toplamK, kalanK: h.kalanK,
        odendi: h.odendi, pasif, neden: pasif ? PASIF_TAKSIT_NEDENI : null, ciroOlur: h.hedef === HEDEF.ANA && !pasif,
        odenenK, satirSayisi: satirlar.length, ...kirilim };
    });
};

// Spec 0048: düzenleme kipindeki ödeme kutusunun kararları (R4, R5, R12, R14, R15, R16; plan Q2–Q6). Saf; form yalnız çizer.
// canliKalem: formun canlı önizleme kalemi, kaydın motorundan (odemeleriUygula) geçmiş (Q1). kayitliKalem: kayıttaki
// zenginleştirilmiş kalem. Dönüş { hedefler, kaybolanlar, planHatasi, turDegisti, bolunmez }.
export const KAYDEDINCE_ODENIR = "Kaydedince ödenebilir";
export const PLAN_HATASI_NOTU = "Ödeme planında hata var; aşağıdaki durum kayıtlı hâli gösteriyor.";
export const TUR_DEGISTI_UYARISI = "Bu kalemin kayıtlı ödemesi var; türü değiştirmek hedefleri ve ödeme bağlarını etkiler.";
export const duzenlemeOdemeDurumu = ({ canliKalem, kayitliKalem, turMap, planHatasi = false }) => {
  const kayitli = formOdemeHedefleri(kayitliKalem, turMap);
  const kayitliDav = kayitliKalem ? davranisOf(kayitliKalem, turMap) : null;
  const bolunmez = !!kayitliKalem && personelBolunmezMi(kayitliKalem.taksitler, kayitliDav);
  // R14: plan hatalıyken kutu kayıtlı hâli gösterir (taksitli kalem tek hedefe düşmesin); düğme bugünkü kuralla.
  if (planHatasi || !canliKalem) {
    return { hedefler: kayitli.map(h => ({ ...h, dugme: h.kalanK > 0, kaydedinceOdenir: false, asimK: 0 })), kaybolanlar: [], planHatasi: !!planHatasi, turDegisti: false, bolunmez };
  }
  const canli = formOdemeHedefleri(canliKalem, turMap);
  const hedefler = canli.map(h => {
    const k = kayitli.find(x => x.hedef === h.hedef);
    // R5 (Q3): düğme yalnız hedef kayıtta aynı satır yapısıyla varsa; pencere kayıtlı kalemi öder (X5).
    // Triyaj: satırsız hedef (0 satır) tek satırlı hedefle eşdeğerdir. Göçsüz eski kalemler (0042 öncesi iki hedefli
    // personel, 0021 öncesi stopajlı kira) önizlemede ilk kayıtta satırlıya döner; hiçbir şey değişmemişken yapı
    // "değişmiş" sayılıp düğme kaybolmasın. Ölçüt taksit sayısıdır.
    const taksitSayisi = (n) => Math.max(1, n || 0);
    const yapiAyni = !!k && taksitSayisi(k.satirSayisi) === taksitSayisi(h.satirSayisi);
    const dugme = h.kalanK > 0 && yapiAyni;
    // R4, R12 (Q4): aşım, kayıtlı hedefin ham ödenen tutarı ile canlı toplamın farkı.
    const asimK = k ? Math.max(0, k.odenenK - h.toplamK) : 0;
    return { ...h, dugme, kaydedinceOdenir: h.kalanK > 0 && !dugme, asimK, kayitliOdenenK: k ? k.odenenK : 0 };
  });
  // R16 (Q5): canlıda kalmamış ama kayıtta ödeme almış hedef görünür kalır.
  const kaybolanlar = kayitli.filter(k => k.odenenK > 0 && !canli.some(h => h.hedef === k.hedef)).map(k => ({ hedef: k.hedef, odenenK: k.odenenK, toplamK: 0 }));
  // R15 (Q6): davranış değişti ve kayıtlı ödeme var.
  const turDegisti = kayitliDav != null && davranisOf(canliKalem, turMap) !== kayitliDav && kayitli.some(k => k.odenenK > 0);
  return { hedefler, kaybolanlar, planHatasi: false, turDegisti, bolunmez };
};

// R21, Q10: "Hepsini ödendi işaretle" — çizilebilen bütün satırlar tam tutar, varsayılan yöntem ve hesapla (ciro asla).
export const hepsiniOde = (hedefler, { yontem = "", hesapId = "" } = {}) => Object.fromEntries(hedefler.filter(h => !h.pasif && h.kalanK > 0)
  .map(h => [h.hedef, { isaretli: true, tutar: tl(h.kalanK), yontem, hesapId, cekId: null }]));

// Q5: ciro edilebilecek çekler (portföyde, TL), vade sırasıyla.
export const ciroCekleri = (cekler = [], payments = []) => portfoySatirlari(cekler, payments, { durumlar: new Set([CEK_DURUM.PORTFOY]) }).satirlar
  .filter(s => s.currency === "TRY");

// Q6: ciroda alacaklı kalemden türer (tedarikçi / çalışan / serbest).
export const ciroAlacaklisi = (kalem, turMap) => {
  const dav = davranisOf(kalem, turMap);
  if (dav === DAVRANIS.PERSONEL) return { tur: "calisan", id: kalem.calisanId };
  return kalem.tedarikciId != null ? { tur: "tedarikci", id: kalem.tedarikciId } : { tur: "serbest" };
};

// R17, R18, R22, R25: işaretli satırları doğrular ve hareketleri üretir. satirlar: { [hedef]: {isaretli, tutar, yontem,
// hesapId, cekId} }. Dönüş { hatalar: { satir: {[hedef]: mesaj}, genel: [] }, hareketler, cek, uyari }; hata varsa
// hareketler null (ya hep ya hiç).
export const formOdemesiHazirla = (kalem, { turMap, tarih, satirlar = {}, hesaplar = [], cekler = [], payments = [], alacakliAd = "" } = {}) => {
  const hatalar = { satir: {}, genel: [] };
  const hedefler = formOdemeHedefleri(kalem, turMap);
  const isaretli = hedefler.filter(h => !h.pasif && satirlar[h.hedef]?.isaretli);
  if (!isaretli.length) return { hatalar, hareketler: [], cek: null, uyari: null };
  if (!tarih) hatalar.genel.push("Ödeme tarihi girilmedi.");
  const normal = isaretli.filter(h => satirlar[h.hedef].yontem !== CIRO_YONTEMI);
  const ciro = isaretli.find(h => satirlar[h.hedef].yontem === CIRO_YONTEMI);
  let hareketler = [];
  if (normal.length) {
    // R22: işaretli satırda boş tutar sessizce atılmaz; "0" ile doğrulanır → "Tutar sıfırdan büyük olmalı."
    const liste = normal.map(h => { const s = satirlar[h.hedef]; return { taksitId: h.taksitId, tutar: String(s.tutar ?? "").trim() === "" ? "0" : s.tutar, yontem: s.yontem || "", hesapId: s.hesapId ?? "", aciklama: "" }; });
    const r = cokluOdemeDogrula({ tarih: tarih || "2000-01-01", satirlar: liste }, { kalem, turMap, hesaplar });
    if (!r.kayitlar) {
      for (const [i, h] of Object.entries(r.hatalar.satirlar || {})) hatalar.satir[normal[Number(i)].hedef] = Object.values(h)[0];
      hatalar.genel.push(...(r.hatalar.hedefler || []), ...(r.hatalar.genel ? [r.hatalar.genel] : []));
    } else hareketler = r.kayitlar.map(k => ({ ...k, tarih }));
  }
  let cek = null, uyari = null;
  if (ciro) {
    const s = satirlar[ciro.hedef];
    const secili = ciroCekleri(cekler, payments).find(x => String(x.cek.id) === String(s.cekId));
    if (!ciro.ciroOlur) hatalar.satir[ciro.hedef] = CIRO_YALNIZ_ANA_NEDENI[ciro.hedef] || "Bu bölüm çekle ödenemez.";
    else if (!secili) hatalar.satir[ciro.hedef] = "Ciro edilecek çek seçilmedi.";
    else {
      const aday = ciroAdaylari([kalem], ciroAlacaklisi(kalem, turMap), turMap).find(a => String(a.taksitId ?? "") === String(ciro.taksitId ?? ""));
      if (!aday) hatalar.satir[ciro.hedef] = "Bu bölüm çekle kapatılamaz.";
      else {
        const p = ciroPlani({ cek: secili.cek, odeme: secili.odeme, adaylar: [aday], dagitim: [{ anahtar: aday.anahtar, tutarK: Math.min(secili.tutarK, aday.kalanK) }], tarih, alacakliAd, turMap });
        if (p.hatalar.length) hatalar.satir[ciro.hedef] = p.hatalar[0];
        else { hareketler = [...hareketler, ...p.hareketler]; cek = p.cek; uyari = p.uyari; }
      }
    }
  }
  const hataVar = hatalar.genel.length || Object.keys(hatalar.satir).length;
  return hataVar ? { hatalar, hareketler: null, cek: null, uyari } : { hatalar, hareketler, cek, uyari };
};

// Ciro satırının salt okunur tutarı (Q5): çek tutarı ile hedef kalanının küçüğü; fark uyarısı ciroPlani'dan.
export const ciroTutariK = (cekSatiri, hedef) => (cekSatiri && hedef ? Math.min(cekSatiri.tutarK, hedef.kalanK) : 0);
