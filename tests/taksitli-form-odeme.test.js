// Spec 0057: taksitli hedefin ilk taksiti formdan ödenebilsin. Saf motor: formOdemesi (formOdemeHedefleri pasif üretmez,
// duzenlemeOdemeDurumu pasif kararı, hepsiniOde, odemeGirisiHazirla çek dağıtımı) ve korunan gider tarafı. Test adları AC-<n>.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { formOdemeHedefleri, duzenlemeOdemeDurumu, odemeGirisiHazirla, hepsiniOde, satirTaksitId, satirSiralariniEsle, PASIF_TAKSIT_NEDENI } from "../src/lib/formOdemesi";
import { giderKalemDogrula, turHaritasi, odemeleriUygula, odemeDurumu, HEDEF } from "../src/lib/gider";

const turler = [{ id: 1, ad: "Hammadde", davranis: "normal" }, { id: 2, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }];
const turMap = turHaritasi(turler);
const tedarikciler = [{ id: 11, ad: "Yıldız" }];
let n = 57000;
const uid = () => ++n;
const kayit = (form) => { const r = giderKalemDogrula(form, { turMap, tedarikciler, uid }); expect(r.hatalar).toEqual([]); return r.kayit; };
// Altı taksitli normal kalem: 60.000 ₺, her taksit 10.000 ₺, ilk vade 30/09.
const alti = (o = {}) => kayit({ id: 1, tarih: "2026-09-10", turId: 1, tutar: 60000, kdvOrani: 0, tedarikciId: 11, sonOdemeTarihi: "2026-09-30", taksitSayisi: 6, ...o });
const kira = (o = {}) => kayit({ id: 2, tarih: "2026-09-01", turId: 2, girisYonu: "brut", tutar: 30000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 11, sonOdemeTarihi: "2026-09-30", taksitSayisi: 3, ...o });
const H = [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 200000, acilisTarihi: "2026-01-01" }];
const T = "2026-09-20";
let a = 0;
const sat = (sira, tutar, o = {}) => ({ anahtar: `s${++a}`, hedef: HEDEF.ANA, sira, tutar, yontem: "Havale", hesapId: 51, aciklama: "", ...o });
const hazirla = (k, satirlar, o = {}) => odemeGirisiHazirla(k, { turMap, tarih: T, satirlar, hesaplar: H, ...o });
const zengin = (k, hareketler = []) => odemeleriUygula([k], hareketler, turMap)[0];
const idli = (hs) => hs.map((h, i) => ({ ...h, id: 9000 + i }));
const anaSat = (k) => k.taksitler.filter(r => (r.hedef || HEDEF.ANA) === HEDEF.ANA);
// Yeni kalemde formun önizleme kalemi: kimliği ve taksit kimlikleri geçicidir (gerçekleri kayıtta doğar).
const onizleme = (k) => ({ ...k, id: "__yeni__", taksitler: k.taksitler.map((r, i) => ({ ...r, id: `onizleme-${i + 1}` })) });

describe("Spec 0057: pasif kararı çağıranda (R1, R21, AC-16)", () => {
  it("AC-16: formOdemeHedefleri pasif üretmez; taksitli hedef 'taksitli' alanıyla işaretli, açık taksitleriyle", () => {
    const h = formOdemeHedefleri(alti(), turMap);
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ hedef: "ana", pasif: false, neden: null, taksitli: true, taksitId: null, satirSayisi: 6, ciroOlur: true });
    expect(h[0].acikTaksitler.map(t => [t.sira, t.kalanK])).toEqual([1, 2, 3, 4, 5, 6].map(s => [s, 1000000]));
    const kaynak = readFileSync("src/lib/formOdemesi.js", "utf-8");
    expect(kaynak).not.toMatch(/const pasif = satirlar\.length/);
    expect(kaynak).toMatch(/pasif: false, neden: null, ciroOlur: h\.hedef === HEDEF\.ANA,/);
  });
  it("AC-21: taksitli ANA'da çek olur (ciroOlur yalnız hedefe bakar); stopajda olmaz", () => {
    expect(formOdemeHedefleri(kira(), turMap).map(h => [h.hedef, h.ciroOlur, h.taksitli])).toEqual([["ana", true, true], ["stopaj", false, false]]);
  });
  it("AC-18: 0053 R30'un parçaları yeniden yazılmadı (acikTaksitler, taksit seçici, taksit bazlı kalan, satırın sira'sı tek yerde)", () => {
    const f = readFileSync("src/lib/formOdemesi.js", "utf-8");
    const g = readFileSync("src/components/gider/OdemeGirisi.jsx", "utf-8");
    expect(f.match(/const acikTaksitler = /g)).toHaveLength(1);
    expect(g.match(/lbl\(h\.hedef, "taksit", n\)/g)).toHaveLength(1);
    expect(g.match(/const yerKalaniK = /g)).toHaveLength(1);
    for (const s of ["src/components/GiderForm.jsx", "src/components/gider/OdemeKayitPenceresi.jsx", "src/components/Giderler.jsx"]) {
      expect(readFileSync(s, "utf-8"), s).not.toMatch(/acikTaksitler\.(map|find)/);
    }
  });
  it("AC-25: 'bütün ödemeler taksitli' notu hiçbir yerde yok; tek neden metni plan değişikliğini anlatır", () => {
    for (const s of ["src/lib/formOdemesi.js", "src/components/gider/OdemeGirisi.jsx", "src/components/GiderForm.jsx"]) {
      const kod = readFileSync(s, "utf-8").split("\n").filter(l => !/^\s*(\/\/|\{\/\*)/.test(l)).join("\n"); // yorumlar hariç
      expect(kod, s).not.toMatch(/HEPSI_TAKSITLI_NOTU|hepsi-taksitli|TAKSIT_PLANI_DEGISTI_NEDENI/);
    }
    expect(PASIF_TAKSIT_NEDENI).toBe("Bu bölümün taksit planı bu düzenlemede değişti; ödemeyi kaydettikten sonra girin.");
  });
});

describe("Spec 0057: yeni kalemde taksit ödemesi (R2–R6, AC-1–AC-8, AC-27)", () => {
  it("AC-1 / AC-2: yeni kalemde taksitli hedef açık; varsayılan birinci taksit ve onun tutarı", () => {
    const [h] = formOdemeHedefleri(onizleme(alti()), turMap);
    expect(h.pasif).toBe(false);
    expect(h.acikTaksitler[0]).toMatchObject({ sira: 1, kalanK: 1000000 });
  });
  it("AC-3 / AC-4: ödeme gerçek taksite sıra ile bağlanır (geçici kimlik değil); ilk taksit ödenir, diğerleri açık", () => {
    const k = alti();
    const satirlar = [sat(1, "10000")];
    expect(hazirla(onizleme(k), satirlar).hareketler[0].taksitId).toBe("onizleme-1"); // formun doğrulaması geçici kimlikle
    const r = hazirla(k, satirlar); // Giderler.kaydet gerçek kalemle yeniden çağırır
    expect(r.hareketler[0]).toMatchObject({ taksitId: anaSat(k)[0].id, tutar: 10000 });
    expect(satirTaksitId(k, HEDEF.ANA, 1)).toBe(anaSat(k)[0].id);
    const z = zengin(k, idli(r.hareketler));
    expect(z.taksitler.map(t => t._odenenK)).toEqual([1000000, 0, 0, 0, 0, 0]);
    expect(odemeDurumu(z)).toBe("kismen");
  });
  it("AC-5: ikinci satır ikinci taksidi öder; iki ayrı hareket", () => {
    const k = alti();
    const r = hazirla(k, [sat(1, "10000"), sat(2, "10000", { yontem: "Nakit" })]);
    expect(r.hareketler.map(h => [h.taksitId, h.tutar, h.yontem])).toEqual([[anaSat(k)[0].id, 10000, "Havale"], [anaSat(k)[1].id, 10000, "Nakit"]]);
  });
  it("AC-6: bir taksit kısmen ödenir, kalan o taksitte durur", () => {
    const k = alti();
    const z = zengin(k, idli(hazirla(k, [sat(1, "4000")]).hareketler));
    expect(formOdemeHedefleri(z, turMap)[0].acikTaksitler[0]).toMatchObject({ sira: 1, kalanK: 600000 });
  });
  it("AC-7: taksidin kalanından fazla tutar satırda hata; hareket yok", () => {
    const s = sat(1, "10000,01");
    const r = hazirla(alti(), [s]);
    expect(r.hareketler).toBeNull();
    expect(r.hatalar.satirlar[s.anahtar].tutar).toMatch(/Kalandan fazla ödeme kaydedilemez/);
  });
  it("AC-8: satırların toplamı kalemin kalanını aşamaz (ödenmiş taksite giden satır reddedilir)", () => {
    const k = alti();
    const once = idli(hazirla(k, [1, 2, 3, 4, 5].map(i => sat(i, "10000"))).hareketler);
    const z = zengin(k, once);
    expect(hazirla(z, [sat(6, "10000")]).hareketler).toHaveLength(1);
    expect(hazirla(z, [sat(6, "10000"), sat(5, "1")]).hareketler).toBeNull();
  });
  it("AC-27: aynı taksit iki yöntemle iki satırda ödenir; toplam taksit kalanını aşamaz", () => {
    const k = alti();
    expect(hazirla(k, [sat(1, "6000"), sat(1, "4000", { yontem: "Nakit" })]).hareketler.map(h => [h.taksitId, h.tutar])).toEqual([[anaSat(k)[0].id, 6000], [anaSat(k)[0].id, 4000]]);
    expect(hazirla(k, [sat(1, "6000"), sat(1, "5000", { yontem: "Nakit" })]).hareketler).toBeNull();
  });
});

describe("Spec 0057: Hepsini işaretle ve ödenmiş taksit (R12, R13, R23, AC-19, AC-26)", () => {
  it("AC-19 / R23: taksitli hedefte en yakın açık taksit, o taksidin kalanıyla; hedef başına; doğrulama hatasız", () => {
    const k = kira();
    const h = formOdemeHedefleri(k, turMap);
    const s = hepsiniOde([], h, { yontem: "Havale", hesapId: 51, yeniAnahtar: () => `h${++a}` });
    expect(s.map(r => [r.hedef, r.sira, r.tutar])).toEqual([["ana", 1, "8000"], ["stopaj", null, "6000"]]);
    expect(hazirla(k, s).hatalar).toEqual({ satirlar: {}, hedefler: [], genel: [], mahsup: {} });
    const z = zengin(alti(), idli(hazirla(alti(), [sat(1, "10000"), sat(2, "3000")]).hareketler));
    expect(hepsiniOde([], formOdemeHedefleri(z, turMap), { yeniAnahtar: () => "x" }).map(r => [r.sira, r.tutar])).toEqual([[2, "7000"]]);
  });
  it("AC-26: ödenmiş taksit seçicide yok; hepsi ödenmişse hedefin açık taksidi ve satırı yok", () => {
    const k = alti();
    const z1 = zengin(k, idli(hazirla(k, [sat(1, "10000")]).hareketler));
    expect(formOdemeHedefleri(z1, turMap)[0].acikTaksitler.map(t => t.sira)).toEqual([2, 3, 4, 5, 6]);
    const z6 = zengin(k, idli(hazirla(k, [1, 2, 3, 4, 5, 6].map(i => sat(i, "10000"))).hareketler));
    const [h] = formOdemeHedefleri(z6, turMap);
    expect(h.kalanK).toBe(0);
    expect(h.acikTaksitler).toEqual([]);
    expect(hepsiniOde([], [h], { yeniAnahtar: () => "x" })).toEqual([]);
  });
});

describe("Spec 0057: düzenleme (R7, R22, AC-9–AC-11, AC-22–AC-24)", () => {
  const durum = (kayitli, canli) => duzenlemeOdemeDurumu({ canliKalem: canli, kayitliKalem: kayitli, turMap });
  it("AC-9: plan değişmiyorsa taksitli hedef açık; varsayılan en yakın vadeli açık taksit", () => {
    const k = alti();
    const z = zengin(k, idli(hazirla(k, [sat(1, "10000")]).hareketler));
    const [h] = durum(z, z).hedefler;
    expect(h).toMatchObject({ pasif: false, neden: null, taksitPlaniDegisti: false });
    expect(h.acikTaksitler[0].sira).toBe(2);
  });
  it("AC-22: yalnız vade değişince hedef pasif olmaz", () => {
    const k = alti();
    expect(durum(k, kayit({ ...k, sonOdemeTarihi: "2026-10-15", taksitSayisi: 6 })).hedefler[0]).toMatchObject({ pasif: false });
  });
  it("AC-23: yalnız tutar değişince (taksit sayısı aynı) hedef pasif olmaz", () => {
    const k = alti();
    expect(durum(k, kayit({ ...k, tutar: 72000, taksitSayisi: 6 })).hedefler[0]).toMatchObject({ pasif: false, toplamK: 7200000 });
  });
  it("AC-10 / AC-24: taksit sayısı değişince hedef pasif, neden plan değişikliğini anlatır", () => {
    const k = alti();
    expect(durum(k, kayit({ ...k, taksitSayisi: 4 })).hedefler[0]).toMatchObject({ pasif: true, neden: PASIF_TAKSIT_NEDENI, taksitPlaniDegisti: true });
  });
  it("R22: plan hatasında taksitli hedef pasif, taksitsiz hedef değil", () => {
    const r = duzenlemeOdemeDurumu({ canliKalem: null, kayitliKalem: kira(), turMap, planHatasi: true });
    expect(r.hedefler.map(h => [h.hedef, h.pasif])).toEqual([["ana", true], ["stopaj", false]]);
  });
  it("AC-11: ödeme almış taksit, tutar değişince plan yeniden kurulurken korunur", () => {
    const k = alti();
    const hs = idli(hazirla(k, [sat(1, "10000")]).hareketler);
    const y = kayit({ ...zengin(k, hs), tutar: 72000, taksitSayisi: 6 });
    expect(anaSat(y)[0]).toMatchObject({ id: anaSat(k)[0].id, tutar: 10000 });
    expect(anaSat(y).reduce((t, r) => t + r.tutar, 0)).toBe(72000);
    expect(zengin(y, hs).taksitler[0]._odenenK).toBe(1000000);
  });
});

describe("Spec 0057: çek taksitli ANA'da (R8, R19, AC-12, AC-20)", () => {
  const P = [{ id: 100, customerId: 1, tarih: "2026-09-01", tutar: 30000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-10-15" }];
  const C = [{ id: 200, paymentId: 100, no: "1", banka: "Ziraat", kesideci: "Ali", tur: "hamiline", durum: "portfoy", gecmis: [] }];
  const cekli = (k, satirlar, o = {}) => hazirla(k, satirlar, { cekler: C, payments: P, alacakliAd: "Yıldız", ...o });
  it("AC-12 / AC-20: ciro edilen 30.000 ₺ çek açık taksitlere en eski vadeden dağıtılır (sıra seçimi yok sayılır)", () => {
    const k = alti();
    const r = cekli(k, [sat(4, "", { yontem: "Çek (ciro)", cekId: 200, hesapId: "" })]);
    expect(r.hatalar.satirlar).toEqual({});
    expect(r.hareketler.map(h => [h.taksitId, h.tutar, h.cekId, h.hesapId ?? null])).toEqual([0, 1, 2].map(i => [anaSat(k)[i].id, 10000, 200, null]));
    expect(r.cek).toMatchObject({ id: 200, durum: "ciro" });
  });
  it("R19 (plan Q3): aynı hedefe giden normal satır önce düşülür; çek kalanları en eski vadeden kapatır", () => {
    const k = alti();
    const r = cekli(k, [sat(1, "4000"), sat(null, "", { yontem: "Çek (ciro)", cekId: 200, hesapId: "" })]);
    const ids = anaSat(k).map(x => x.id);
    expect(r.hareketler.map(h => [h.taksitId, h.tutar, h.cekId ?? null])).toEqual([[ids[0], 4000, null], [ids[0], 6000, 200], [ids[1], 10000, 200], [ids[2], 10000, 200], [ids[3], 4000, 200]]);
  });
  it("AC-12: kendi çekimiz girilen tutarla dağıtılır; kalan aşımı satırda hata", () => {
    const k = alti();
    const kendi = (tutar) => cekli(k, [sat(null, tutar, { yontem: "Çek (kendi)", cekNo: "K1", cekHesapId: 51, cekVade: "2026-11-01" })]);
    const r = kendi("25000");
    expect(r.hareketler.map(h => h.tutar)).toEqual([10000, 10000, 5000]);
    expect(r.cek).toMatchObject({ yon: "verilen", tutar: 25000 });
    expect(Object.values(kendi("60000,01").hatalar.satirlar)[0].cek).toMatch(/kalanını aşıyor/);
  });
  it("AC-12: satırsız (taksitsiz) kalemde çek davranışı değişmedi", () => {
    const k = kayit({ id: 3, tarih: "2026-09-10", turId: 1, tutar: 20000, kdvOrani: 0, tedarikciId: 11, sonOdemeTarihi: "2026-09-30" });
    const r = cekli(k, [sat(null, "", { yontem: "Çek (ciro)", cekId: 200, hesapId: "" })]);
    expect(r.hareketler.map(h => [h.taksitId, h.tutar])).toEqual([[null, 20000]]);
  });
});

describe("Spec 0057: gider tarafı (R10, AC-14)", () => {
  it("AC-14: kalemin tutarı, planı ve vadeleri ödeme girişinden etkilenmez", () => {
    const k = alti();
    const once = JSON.stringify(k);
    hazirla(k, [sat(1, "10000"), sat(2, "5000")]);
    hepsiniOde([], formOdemeHedefleri(k, turMap));
    expect(JSON.stringify(k)).toBe(once);
    expect(anaSat(k).map(r => [r.sira, r.tutar])).toEqual([1, 2, 3, 4, 5, 6].map(s => [s, 10000]));
    expect(anaSat(k)[0].vade).toBe("2026-09-30");
    expect(anaSat(k)[1].vade).toBe("2026-10-30");
  });
});

describe("Spec 0057 triyaj: satırın taksit sırası açık taksitlerle eşlenir", () => {
  it("sırası boş ya da kapanmış taksite bakan satır en yakın açık taksite; geçerli satır, çek satırı ve taksitsiz hedef aynen", () => {
    const k = alti();
    const z = zengin(k, idli(hazirla(k, [sat(1, "10000")]).hareketler)); // 1. taksit ödendi
    const h = formOdemeHedefleri(z, turMap);
    const bos = sat(null, "2000"), kapali = sat(1, "2000"), gecerli = sat(4, "2000"), cek = sat(null, "", { yontem: "Çek (ciro)", cekId: 200 });
    const r = satirSiralariniEsle([bos, kapali, gecerli, cek], h);
    expect(r.map(x => x.sira)).toEqual([2, 2, 4, null]);
    expect(hazirla(z, r.slice(0, 1)).hareketler[0].taksitId).toBe(anaSat(k)[1].id); // eskiden: hareketler null, iki hata
    const ayni = [gecerli];
    expect(satirSiralariniEsle(ayni, h)).toBe(ayni);
    const tek = [sat(null, "1000")];
    expect(satirSiralariniEsle(tek, formOdemeHedefleri(kayit({ id: 9, tarih: "2026-09-10", turId: 1, tutar: 5000, kdvOrani: 0, tedarikciId: 11 }), turMap))).toBe(tek);
  });
});
