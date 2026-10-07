// Spec 0061 (R2–R9, R11, R17, R27, R28, R35): geçmiş aylardan kalan borçların açık kalemler listesi ve yaşlandırması. Saf,
// React'sız, zaman okumaz (`bugun` çağırandan: ekranda yerel bugün, raporda ay sonu). Kapsam borç özetiyle AYNI kuraldır
// (gider.borcKapsamindaMi) ve vade şartı yoktur; ödeme hatırlatıcısından tek ayrımı budur. Satır ödeme HEDEFİ başınadır;
// kovalar ve çapraz sayılar KALEM sayar, toplam hedef kalanlarının toplamıdır. Yaş gider tarihinden `gunFarki` ile sayılır.
// Bu dosya `gider.js`'te değil, çünkü `gunFarki` odemeHatirlatma.js'tedir ve o dosya gider.js'i içe alır (R27).
import { turHaritasi, davranisOf, odemeHedefleri, hedefGecti, borcKapsamindaMi, kalemGorunenAd, sgkDavranisiMi, DAVRANIS, HEDEF, VERGI_DAIRESI, SGK } from "./gider";
import { gunFarki } from "./odemeHatirlatma";
import { YAS_KOVALARI, yasKovaAdi } from "./yaslandirma";

export const SECILMEMIS_AD = "Tedarikçi seçilmemiş";
export const CALISANLAR_AD = "Çalışanlar";
const bosKovalar = () => Object.fromEntries(YAS_KOVALARI.map(k => [k.ad, 0]));

// R28: vadeli satırlar önce (vade artan; eşitlikte yaş azalan, sonra kalem kimliği), vadesizler sonra (yaş azalan).
export const acikSatirSirasi = (a, b) => {
  if (!!a.vade !== !!b.vade) return a.vade ? -1 : 1;
  if (a.vade && b.vade && a.vade !== b.vade) return a.vade < b.vade ? -1 : 1;
  if (a.yas !== b.yas) return b.yas - a.yas;
  return String(a.kalemId).localeCompare(String(b.kalemId), "tr", { numeric: true }) || String(a.hedef).localeCompare(String(b.hedef));
};

/**
 * giderler: ödeme durumu uygulanmış kalemler (odemeleriUygula). Dönüş:
 * - satirlar: [{ kalemId, hedef, davranis, cokHedef, tarafTur, tarafId, tarafAd, calisanId, calisanAd, personel, turAd, aciklama, tarih, vade,
 *   yas, kova, kalanK, gecti, vadesiz }] (R28 sırasıyla)
 * - kovalar: [{ ad, kalemAdet, kalanK }] (dört kova, sırayla), gecmisAdet, vadesizAdet (kalem), toplamK, kalemAdet
 * - taraflar: [{ tur, id, ad, kovalar: { ad: kalanK }, toplamK, kalemAdet, kisi? }]; çalışanlar TEK satırdır (adsız) ve
 *   kişi kırılımı yalnız ekran için `ayrinti`'dedir (rapor onu okumaz).
 */
export const acikKalemler = (giderler = [], { turler = [], tedarikciler = [], yururlukAy = null } = {}, bugun) => {
  const turMap = turHaritasi(turler);
  const tedMap = new Map(tedarikciler.map(t => [String(t.id), t]));
  const esik = yururlukAy ? `${yururlukAy}-01` : "";
  const satirlar = [];
  for (const k of giderler || []) {
    if (!borcKapsamindaMi(k, { esik, bugun })) continue;
    const dav = davranisOf(k, turMap);
    const yas = gunFarki(k.tarih, bugun);
    const kova = yasKovaAdi(yas);
    // Triyaj (bulgu 2): hedef listesi kalem başına bir kez; çok hedeflilik ondan türer.
    const hedefler = odemeHedefleri(k, dav);
    const cokHedef = hedefler.filter(x => x.toplamK > 0).length > 1;
    for (const h of hedefler) {
      if (!(h.kalanK > 0)) continue;
      // Spec 0074 R19 (Ö-10): SGK davranışlı kalem kurum satırına gider; tarafı davranıştan.
      const sgkHedef = sgkDavranisiMi(dav);
      const personel = dav === DAVRANIS.PERSONEL;
      const ted = k.tedarikciId != null ? tedMap.get(String(k.tedarikciId)) : null;
      // Spec 0075 R22 (B-3): tevkifat vergi dairesinin; dal yazılmazsa tedarikçinin KENDİ satırına düşerdi.
      const tarafTur = h.hedef === HEDEF.STOPAJ || h.hedef === HEDEF.TEVKIFAT ? "vergiDairesi" : sgkHedef ? "sgk" : personel ? "calisanlar" : ted ? "tedarikci" : "secilmemis";
      satirlar.push({
        kalemId: k.id, hedef: h.hedef, davranis: dav, cokHedef, tarafTur,
        tarafId: tarafTur === "tedarikci" ? ted.id : null,
        tarafAd: tarafTur === "tedarikci" ? ted.ad : tarafTur === "vergiDairesi" ? VERGI_DAIRESI : tarafTur === "sgk" ? SGK : tarafTur === "calisanlar" ? CALISANLAR_AD : SECILMEMIS_AD,
        calisanId: personel ? k.calisanId : null, calisanAd: personel ? (k.calisanAd || "") : "", personel,
        turAd: turMap.get(String(k.turId))?.ad || "(türsüz)", aciklama: kalemGorunenAd(k, dav),
        tarih: k.tarih, vade: h.vade || null, yas, kova, kalanK: h.kalanK,
        gecti: bugun ? hedefGecti(h, bugun) : false, vadesiz: !h.vade,
      });
    }
  }
  satirlar.sort(acikSatirSirasi);
  return { ...acikOzet(satirlar), satirlar };
};

// Satır listesinden kova, çapraz sayı ve taraf kırılımı (kova süzmesi açıkken ekran da aynı fonksiyonu çağırır).
export const acikOzet = (satirlar) => {
  const kovaKalem = new Map(YAS_KOVALARI.map(k => [k.ad, new Set()]));
  const kovaTutar = bosKovalar();
  const gecmis = new Set(), vadesiz = new Set(), hepsi = new Set();
  const taraf = new Map();
  for (const s of satirlar) {
    const kid = String(s.kalemId);
    kovaKalem.get(s.kova).add(kid);
    kovaTutar[s.kova] += s.kalanK;
    hepsi.add(kid);
    if (s.gecti) gecmis.add(kid);
    if (s.vadesiz) vadesiz.add(kid);
    const anahtar = `${s.tarafTur}:${s.tarafId ?? ""}`;
    if (!taraf.has(anahtar)) taraf.set(anahtar, { tur: s.tarafTur, id: s.tarafId, ad: s.tarafAd, kovalar: bosKovalar(), toplamK: 0, kalemler: new Set(), kisiler: new Map() });
    const t = taraf.get(anahtar);
    t.kovalar[s.kova] += s.kalanK; t.toplamK += s.kalanK; t.kalemler.add(kid);
    if (s.personel) {
      const ck = String(s.calisanId);
      if (!t.kisiler.has(ck)) t.kisiler.set(ck, { calisanId: s.calisanId, ad: s.calisanAd, kovalar: bosKovalar(), toplamK: 0 });
      const c = t.kisiler.get(ck); c.kovalar[s.kova] += s.kalanK; c.toplamK += s.kalanK;
    }
  }
  const taraflar = [...taraf.values()].map(t => ({
    tur: t.tur, id: t.id, ad: t.ad, kovalar: t.kovalar, toplamK: t.toplamK, kalemAdet: t.kalemler.size,
    ...(t.tur === "calisanlar" ? { kisi: t.kisiler.size, ayrinti: [...t.kisiler.values()].sort((a, b) => a.ad.localeCompare(b.ad, "tr")) } : {}),
  })).sort((a, b) => b.toplamK - a.toplamK || a.ad.localeCompare(b.ad, "tr"));
  return {
    kovalar: YAS_KOVALARI.map(k => ({ ad: k.ad, kalemAdet: kovaKalem.get(k.ad).size, kalanK: kovaTutar[k.ad] })),
    gecmisAdet: gecmis.size, vadesizAdet: vadesiz.size, kalemAdet: hepsi.size,
    toplamK: satirlar.reduce((a, s) => a + s.kalanK, 0), taraflar,
  };
};
