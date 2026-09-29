// Spec 0046: gider formundan hedef bazlı ödeme ve çek cirosu. Saf, React'sız. Hareketleri ödeme penceresiyle AYNI
// fonksiyonlar üretir (C2, AC-29): normal satırlar kasa.cokluOdemeDogrula'dan (her satır odemeDogrula), ciro satırı
// cek.ciroAdaylari + cek.ciroPlani'dan (R25). Form doğrulamayı geçici kalem kimliğiyle, Giderler kaydı gerçek kimlikle
// aynı fonksiyondan yapar (Q1); bu yüzden fonksiyon girdiden başka hiçbir şeye bakmaz.
import { cokluOdemeDogrula } from "./kasa";
import { ciroAdaylari, ciroPlani, CIRO_YONTEMI, portfoySatirlari, CEK_DURUM } from "./cek";
import { tl, satirliMi, davranisOf, odemeHedefleri, DAVRANIS, HEDEF, HEDEF_SIRASI } from "./gider";

export const PASIF_TAKSIT_NEDENI = "Bu bölüm taksitli; taksitler kayıttan sonra ödeme penceresinden ödenir.";
export const HEPSI_TAKSITLI_NOTU = "Bu kalemin bütün ödemeleri taksitli; taksitler kayıttan sonra listedeki ödeme penceresinden girilir.";
export const CIRO_YALNIZ_ANA_NEDENI = { [HEDEF.STOPAJ]: "Vergi dairesine çekle ödeme yapılmaz; çek yalnız ana alacaklıya ciro edilir.",
  [HEDEF.ELDEN]: "Elden ödeme çekle yapılmaz; çek yalnız ana alacaklıya ciro edilir." };
export const CEK_YOK_NOTU = "Portföyde ciro edilebilecek (TL, portföyde duran) çek yok; başka bir yöntem seçin.";

// R1, R5, R6, R26: çizilecek hedef satırları, HEDEF_SIRASI sırasıyla. Tutarı sıfır olan hedef yoktur; iki ya da daha çok
// taksitli hedef pasiftir. taksitId: formdan ödenebilen hedefin tek satırı (satırsız kalemde null, Q2).
export const formOdemeHedefleri = (kalem, turMap) => {
  if (!kalem) return [];
  const dav = davranisOf(kalem, turMap);
  const satirli = satirliMi(kalem);
  return odemeHedefleri(kalem, dav)
    .filter(h => h.toplamK > 0)
    .sort((a, b) => HEDEF_SIRASI.indexOf(a.hedef) - HEDEF_SIRASI.indexOf(b.hedef))
    .map(h => {
      const satirlar = satirli ? kalem.taksitler.filter(r => (r.hedef || HEDEF.ANA) === h.hedef) : [];
      const pasif = satirlar.length > 1;
      return { hedef: h.hedef, taksitId: satirli && !pasif ? satirlar[0]?.id ?? null : null, toplamK: h.toplamK, kalanK: h.kalanK,
        odendi: h.odendi, pasif, neden: pasif ? PASIF_TAKSIT_NEDENI : null, ciroOlur: h.hedef === HEDEF.ANA && !pasif };
    });
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
