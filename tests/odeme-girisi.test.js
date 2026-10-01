// Spec 0053: ödeme girişinin saf motoru (formOdemesi.odemeGirisiHazirla, kasa.sonKullanilanYontem, hepsiniOde,
// odemeGirisiYaz) ve korunan gider tarafı. Test adları AC-<n> taşır.
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { odemeGirisiHazirla, odemeGirisiYaz, hepsiniOde, formOdemeHedefleri, duzenlemeOdemeDurumu, ciroCekleri, TEK_CEK_HATASI, satirTaksitId } from "../src/lib/formOdemesi";
import { sonKullanilanYontem, cokluOdemeDogrula, hesapBakiyeleri, COKLU_ODEME_MAX_SATIR } from "../src/lib/kasa";
import { giderKalemDogrula, turHaritasi, odemeleriUygula, odemeDurumu, hesaplaGiderRaporu, tekrarlayanUret, HEDEF } from "../src/lib/gider";
import { hesaplaMakinaMaliyetleri } from "../src/lib/makinaMaliyeti";
import { odemeHatirlatmalari } from "../src/lib/odemeHatirlatma";
import { ODEME_SECENEKLERI } from "../src/components/gider/GiderAlanlari";

const turler = [{ id: 1, ad: "Hammadde", davranis: "normal" }, { id: 2, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }];
const turMap = turHaritasi(turler);
const tedarikciler = [{ id: 11, ad: "Yıldız" }];
let n = 5000;
const uid = () => ++n;
const kayit = (form) => { const r = giderKalemDogrula(form, { turMap, tedarikciler, uid }); expect(r.hatalar).toEqual([]); return r.kayit; };
const normal = (o = {}) => kayit({ id: 1, tarih: "2026-09-10", turId: 1, tutar: 100000, kdvOrani: 0, tedarikciId: 11, sonOdemeTarihi: "2026-09-30", ...o });
const personel = (o = {}) => kayit({ id: 3, tarih: "2026-09-01", turId: 3, calisanId: 7, calisanAd: "Hasan", resmiTutar: 30000, eldenTutar: 20000, sonOdemeTarihi: "2026-09-30", ...o });
const kira = (o = {}) => kayit({ id: 2, tarih: "2026-09-01", turId: 2, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 11, sonOdemeTarihi: "2026-09-05", ...o });
const H = [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 200000, acilisTarihi: "2026-01-01" },
  { id: 52, ad: "Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 100000, acilisTarihi: "2026-01-01" }];
const T = "2026-09-20";
let a = 0;
const sat = (hedef, tutar, o = {}) => ({ anahtar: `s${++a}`, hedef, sira: null, tutar, yontem: "Havale", hesapId: 51, aciklama: "", ...o });
const hazirla = (k, satirlar, o = {}) => odemeGirisiHazirla(k, { turMap, tarih: T, satirlar, hesaplar: H, hedefAdi: (h) => ({ ana: "Ana", elden: "Elden", stopaj: "Stopaj" }[h]), ...o });
const zengin = (k, hareketler = []) => odemeleriUygula([k], hareketler, turMap)[0];

describe("Spec 0053 A: yöntem satırın alanı", () => {
  it("AC-38: sonKullanilanYontem en son ödemenin yöntemi; ciro ve kendi çek ve boş yöntem atlanır", () => {
    const h = [
      { id: 1, tur: "odeme", tarih: "2026-09-01", yontem: "Nakit" },
      { id: 2, tur: "odeme", tarih: "2026-09-10", yontem: "Havale" },
      { id: 3, tur: "odeme", tarih: "2026-09-15", yontem: "Çek (ciro)", cekId: 9 },
      { id: 4, tur: "odeme", tarih: "2026-09-16", yontem: "Çek (kendi)", cekId: 10 },
      { id: 5, tur: "odeme", tarih: "2026-09-17", yontem: "" },
      { id: 6, tur: "avans", tarih: "2026-09-18", yontem: "Kredi Kartı" },
    ];
    expect(sonKullanilanYontem(h)).toBe("Havale");
    // Triyaj bulgu 3: aynı gün girilen ödemeler arasında dizideki giriş sırası belirler, kimlik değil (uid rastgele).
    const ayniGun = [{ id: 900, tur: "odeme", tarih: "2026-09-20", yontem: "Havale" }, { id: 12, tur: "odeme", tarih: "2026-09-20", yontem: "Nakit" }];
    expect(sonKullanilanYontem(ayniGun)).toBe("Nakit"); // sonra girilen, kimliği küçük olsa da
    expect(sonKullanilanYontem([...ayniGun].reverse())).toBe("Havale");
    expect(sonKullanilanYontem([...h, { id: 1, tur: "odeme", tarih: "2026-09-09", yontem: "Kredi Kartı" }])).toBe("Havale"); // daha eski tarih kazanamaz
  });
  it("AC-39: hiç ödeme hareketi yoksa yöntem boş", () => {
    expect(sonKullanilanYontem([])).toBe("");
    expect(sonKullanilanYontem([{ id: 1, tur: "odeme", tarih: "2026-09-01", yontem: "Çek (ciro)" }])).toBe("");
  });
  it("AC-46: tekrarlayan tanımdan üretilen kalemin yöntem alanı boş kalır (tanımdaki eski değer kopyalanmaz)", () => {
    const u = tekrarlayanUret([{ id: 9, turId: 1, ad: "İnternet", tutar: 500, odemeYontemi: "Havale", baslangicAy: "2026-06", uretilenAylar: [] }], [], "2026-09", { turMap, giderAyarlari: {}, uid });
    expect(u.yeniKalemler).toHaveLength(1);
    expect(u.yeniKalemler[0].odemeYontemi).toBe("");
  });
  it("AC-34: ödeme yöntemi listesinde 'Elden' diye bir seçenek yok (C7)", () => {
    expect(ODEME_SECENEKLERI.map(o => o.label)).not.toContain("Elden");
    expect(ODEME_SECENEKLERI.map(o => o.value)).not.toContain("Elden");
  });
});

describe("Spec 0053 B: hedef başına birden çok ödeme satırı", () => {
  it("AC-6 / AC-31: 100.000 TL normal kalem yarısı havale yarısı nakit iki satırla ödenir; iki hareket, kalem ödendi", () => {
    const k = normal();
    const r = hazirla(k, [sat("ana", "50000"), sat("ana", "50000", { yontem: "Nakit", hesapId: 52 })]);
    expect(r.hatalar.hedefler).toEqual([]);
    expect(r.hareketler.map(h => [h.tutar, h.yontem, h.hesapId])).toEqual([[50000, "Havale", 51], [50000, "Nakit", 52]]);
    expect(odemeDurumu(zengin(k, r.hareketler.map((h, i) => ({ ...h, id: i + 1 }))))).toBe("odendi");
  });
  it("AC-7: iki satır iki farklı hesaptan; iki hesabın bakiyesi ayrı ayrı azalır", () => {
    const r = hazirla(normal(), [sat("ana", "30000"), sat("ana", "20000", { yontem: "Nakit", hesapId: 52 })]);
    const b = hesapBakiyeleri(H, r.hareketler.map((h, i) => ({ ...h, id: i + 1 })), { payments: [] });
    expect([b.get("51").bakiye, b.get("52").bakiye]).toEqual([170000, 80000]);
  });
  it("AC-8 / AC-32 / AC-33: personelin elden hedefi iki satırla (nakit + havale); elden havaleyle, resmi nakitle ödenebilir", () => {
    const k = personel();
    const r = hazirla(k, [sat("ana", "30000", { yontem: "Nakit", hesapId: 52 }), sat("elden", "15000", { yontem: "Nakit", hesapId: 52 }), sat("elden", "5000", { yontem: "Havale" })]);
    expect(r.hatalar.satirlar).toEqual({});
    const eldenId = satirTaksitId(k, HEDEF.ELDEN), resmiId = satirTaksitId(k, HEDEF.ANA);
    expect(r.hareketler.map(h => [h.taksitId, h.tutar, h.yontem])).toEqual([[resmiId, 30000, "Nakit"], [eldenId, 15000, "Nakit"], [eldenId, 5000, "Havale"]]);
  });
  it("AC-9 / AC-42: bir hedefteki satırların toplamı kalanı aşarsa kayıt yok; hata o hedefin adıyla", () => {
    const r = hazirla(personel(), [sat("elden", "15000"), sat("elden", "6000")]);
    expect(r.hareketler).toBeNull();
    expect(r.hatalar.hedefler.join(" ")).toMatch(/^Elden için girilen toplam kalanı aşıyor \(kalan 20\.000,00 ₺\)/);
    const r2 = hazirla(normal(), [sat("ana", "60000"), sat("ana", "50000")]);
    expect(r2.hatalar.hedefler.join(" ")).toMatch(/^Ana: satırların toplamı kalemin kalanını aşıyor/);
  });
  it("AC-10 / AC-41: satır sınırı pencereyle aynı sabit ve hedef başına; 11. satır reddedilir, üç hedefte toplam 30'a izin", () => {
    expect(COKLU_ODEME_MAX_SATIR).toBe(10);
    const k = normal();
    const on1 = Array.from({ length: 11 }, () => sat("ana", "100"));
    expect(hazirla(k, on1).hatalar.hedefler.join(" ")).toMatch(/Ana: en çok 10 satır/);
    expect(hazirla(k, on1.slice(0, 10)).hareketler).toHaveLength(10);
    const kp = personel();
    const yirmi = [...Array.from({ length: 10 }, () => sat("ana", "100")), ...Array.from({ length: 10 }, () => sat("elden", "100"))];
    expect(hazirla(kp, yirmi).hareketler).toHaveLength(20);
  });
  it("AC-11 / R29: form yolu ve pencere yolu aynı girdiyle alan alan aynı hareketi üretir; ikisi de aynı fonksiyonu çağırır", () => {
    const k = personel();
    const girdi = [sat("ana", "30000"), sat("elden", "20000", { yontem: "Nakit", hesapId: 52 })];
    const form = hazirla(k, girdi).hareketler;
    const pencere = hazirla(k, girdi, { bosAtla: true }).hareketler;
    expect(form).toEqual(pencere);
    const eski = cokluOdemeDogrula({ tarih: T, satirlar: [
      { taksitId: satirTaksitId(k, HEDEF.ANA), tutar: "30000", yontem: "Havale", hesapId: 51, aciklama: "" }] }, { kalem: k, turMap, hesaplar: H }).kayitlar;
    expect(form[0]).toEqual(eski[0]);
    for (const f of ["src/components/GiderForm.jsx", "src/components/gider/OdemeKayitPenceresi.jsx", "src/components/Giderler.jsx"]) {
      const src = readFileSync(f, "utf8");
      expect(src, f).toMatch(/odemeGirisiHazirla\(/);
      expect(src, f).not.toMatch(/cokluOdemeDogrula\(|ciroPlani\(|kendiCekPlani\(|mahsupDogrula\(/);
    }
  });
  // Spec 0054 R1 ile güncellendi (0053 X1 bu spec'e devredildi): ek ödeme maaştan ayrı hedeftir.
  it("AC-20: ek ödemeler resmi/elden bileşeni başına ayrı hedef; hatırlatıcı kalem sayar", () => {
    const k = personel({ ekOdemeler: [{ tur: "prim", aciklama: "", resmiTutar: 0, eldenTutar: 4000 }, { tur: "fazlaCalisma", aciklama: "", resmiTutar: 2000, eldenTutar: 0 }] });
    expect(formOdemeHedefleri(k, turMap).map(h => [h.hedef, h.toplamK])).toEqual([[HEDEF.ANA, 3000000], [HEDEF.ELDEN, 2000000], [HEDEF.EK_RESMI, 200000], [HEDEF.EK_ELDEN, 400000]]);
    // Hatırlatıcı ve borç özeti bu işten önceki fonksiyonlardır; satır sayısı kalem başına bir (Q6, 0042).
    const hat = odemeHatirlatmalari([k], { turler, tedarikciler, yururlukAy: "2026-01", esikGun: 30 }, "2026-09-25");
    expect(hat.sayilar.gecmis + hat.sayilar.yaklasan).toBe(1);
  });
  it("AC-21: gider toplamları, KDV ve makina maliyeti ödeme girişinden bağımsız (ödemeli ve ödemesiz aynı)", () => {
    const k = kira();
    const r = hazirla(k, [sat("ana", "8000"), sat("ana", "8000", { yontem: "Nakit" }), sat("stopaj", "4000")]);
    const hareketler = r.hareketler.map((h, i) => ({ ...h, id: i + 1 }));
    const rapor = (g) => hesaplaGiderRaporu({ giderler: g, turler, tedarikciler }, { baslangic: "2026-09-01", bitis: "2026-09-30" }, { bugun: "2026-09-25" });
    const once = rapor([k]), sonra = rapor(odemeleriUygula([k], hareketler, turMap));
    expect(once.toplam).toBe(20000);
    expect([sonra.toplam, sonra.indirilecekKdv, sonra.stopajToplam]).toEqual([once.toplam, once.indirilecekKdv, once.stopajToplam]);
    // Makina maliyeti: makinaya atanmış normal kalem, iki satırla ödenmiş ve ödenmemiş.
    const n1 = normal({ tutar: 12000, atamaTur: "makina", makinaTur: "stok", makinaId: 501 });
    const h1 = hazirla(n1, [sat("ana", "6000"), sat("ana", "6000", { yontem: "Nakit" })]).hareketler.map((h, i) => ({ ...h, id: i + 1 }));
    const mm = (g) => hesaplaMakinaMaliyetleri({ giderler: g, giderTurleri: turler, stock: [{ id: 501, model: "AK100", serialNo: "S1", tarih: "2026-09-12" }], giderAyarlari: { yururlukAy: "2026-01" } }, { bugun: "2026-09-25" }).liste;
    const m0 = mm([n1]);
    expect(m0).toHaveLength(1);
    expect(JSON.stringify(m0)).toMatch(/1200000|12000/); // kalemin tutarı makinaya yüklendi (boş karşılaştırma değil)
    expect(JSON.stringify(mm(odemeleriUygula([n1], h1, turMap)))).toBe(JSON.stringify(m0));
  });
  it("AC-45: hepsiniOde her hedefin yalnız ilk satırını doldurur; dolu ilk satır ve ek satırlar değişmez", () => {
    const hedefler = formOdemeHedefleri(personel(), turMap);
    const ilk = hepsiniOde([], hedefler, { yontem: "Havale", hesapId: 51, yeniAnahtar: () => "x" });
    expect(ilk.map(r => [r.hedef, r.tutar, r.yontem])).toEqual([["ana", "30000", "Havale"], ["elden", "20000", "Havale"]]);
    const elle = [{ ...ilk[0], yontem: "Nakit", tutar: "1000" }, { anahtar: "e1", hedef: "elden", tutar: "", yontem: "" }, { anahtar: "e2", hedef: "elden", tutar: "", yontem: "Kredi Kartı" }];
    const ikinci = hepsiniOde(elle, hedefler, { yontem: "Havale", hesapId: 51 });
    expect(ikinci.map(r => [r.hedef, r.tutar, r.yontem])).toEqual([["ana", "1000", "Nakit"], ["elden", "20000", "Havale"], ["elden", "", "Kredi Kartı"]]);
  });
});

describe("Spec 0053 C: çek her ödeme yolundan", () => {
  const P = [{ id: 100, customerId: 1, tarih: "2026-09-01", tutar: 30000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-10-15" }];
  const C = [{ id: 200, paymentId: 100, no: "1", banka: "Ziraat", kesideci: "Ali", tur: "hamiline", durum: "portfoy", gecmis: [] }];
  const cekli = (k, satirlar, o = {}) => hazirla(k, satirlar, { cekler: C, payments: P, alacakliAd: "Yıldız", ...o });
  it("AC-14: ciro hareketi hesapsız; hiçbir hesabın bakiyesi değişmez", () => {
    const r = cekli(normal({ tutar: 20000 }), [sat("ana", "", { yontem: "Çek (ciro)", cekId: 200, hesapId: "" })]);
    expect(r.hareketler.every(h => h.hesapId == null && h.cekId === 200)).toBe(true);
    const b = hesapBakiyeleri(H, r.hareketler.map((h, i) => ({ ...h, id: i + 1 })), { payments: [] });
    expect([b.get("51").bakiye, b.get("52").bakiye]).toEqual([200000, 100000]);
  });
  it("Q3: çek satırı aynı hedefteki diğer satırlardan sonra kalanı kapatır (ciro tutarı = çek ile kalan − diğer satırların küçüğü)", () => {
    const r = cekli(normal({ tutar: 40000 }), [sat("ana", "15000"), sat("ana", "", { yontem: "Çek (ciro)", cekId: 200 })]);
    expect(r.hatalar.satirlar).toEqual({});
    expect(r.hareketler.map(h => [h.tutar, h.yontem])).toEqual([[15000, "Havale"], [25000, "Çek (ciro)"]]);
    const kapali = cekli(normal({ tutar: 10000 }), [sat("ana", "10000"), sat("ana", "", { yontem: "Çek (ciro)", cekId: 200 })]);
    expect(Object.values(kapali.hatalar.satirlar)[0].cek).toMatch(/kalanı diğer satırlarla kapanıyor/);
  });
  it("AC-16: stopaj ve elden hedeflerinde çek satırı reddedilir, nedeni yazılır", () => {
    expect(Object.values(cekli(kira(), [sat("stopaj", "", { yontem: "Çek (ciro)", cekId: 200 })]).hatalar.satirlar)[0].cek).toMatch(/Vergi dairesine çekle ödeme yapılmaz/);
    expect(Object.values(cekli(personel(), [sat("elden", "100", { yontem: "Çek (kendi)" })]).hatalar.satirlar)[0].cek).toMatch(/yalnız ana alacaklıya/);
  });
  it("AC-17 / AC-43: bir kayıtta ikinci bir çek satırı (ciro + kendi çek dahil) girilemez", () => {
    const r = cekli(normal(), [sat("ana", "", { yontem: "Çek (ciro)", cekId: 200 }), sat("ana", "1000", { yontem: "Çek (kendi)", cekNo: "B", cekHesapId: 51 })]);
    expect(r.hareketler).toBeNull();
    expect(Object.values(r.hatalar.satirlar).map(e => e.yontem)).toContain(TEK_CEK_HATASI);
  });
  it("AC-19: portföyde uygun çek yokken ciro listesi boş; çek satırı olmadan diğer satırlar kaydedilir", () => {
    expect(ciroCekleri([], [])).toEqual([]);
    expect(cekli(normal(), [sat("ana", "1000")], { cekler: [] }).hareketler).toHaveLength(1);
  });
});

describe("Spec 0053 D/E: düzenleme, mahsup, yazım", () => {
  it("AC-40 / R24 / R30: formda kaydedince-ödenebilir kısıtı kalktı (yalnız pencere bağlamının bilgisi); taksit planı değişen hedef işaretlenir", () => {
    const kayitli = personel({ eldenTutar: 0 });
    const canli = personel({ eldenTutar: 9500 });
    const d = duzenlemeOdemeDurumu({ canliKalem: zengin(canli), kayitliKalem: zengin(kayitli), turMap });
    const elden = d.hedefler.find(h => h.hedef === HEDEF.ELDEN);
    expect(elden.kaydedinceOdenir).toBe(true); // pencere bağlamı (0048 R5) motorda korunur
    expect(elden.taksitPlaniDegisti).toBe(false); // form bu hedefi açar (AC-40)
    const tek = normal(), taksitli = normal({ taksitSayisi: 3 });
    const dt = duzenlemeOdemeDurumu({ canliKalem: zengin(taksitli), kayitliKalem: zengin(tek), turMap });
    expect(dt.hedefler[0].taksitPlaniDegisti).toBe(true);
  });
  it("AC-24 / R24: düzenlemede yeni doğan hedefe ödeme kalemle aynı hazırlıkta geçer (gerçek kalemin taksit kimliğiyle)", () => {
    const k = personel({ eldenTutar: 9500 });
    const r = hazirla(zengin(k), [sat("elden", "9500", { yontem: "Nakit" })]);
    expect(r.hareketler[0].taksitId).toBe(satirTaksitId(k, HEDEF.ELDEN));
  });
  it("AC-47: mahsup tek satırlık kip; satır listesine karışmaz", () => {
    const k = personel();
    const avans = { id: 1, tur: "avans", tarih: "2026-09-01", tutar: 5000, calisanId: 7, hesapId: null };
    const r = odemeGirisiHazirla(k, { turMap, tarih: T, kip: "mahsup", satirlar: [sat("ana", "30000")], mahsup: { hedef: "elden", tutar: "4000" }, hareketler: [avans], giderler: [k], bugun: "2026-09-25" });
    expect(r.hareketler).toEqual([expect.objectContaining({ tur: "mahsup", tutar: 4000, taksitId: satirTaksitId(k, HEDEF.ELDEN), hesapId: null })]);
  });
  it("AC-29 / Q8: ortak yazım silinenleri düşer, yeni hareketleri ve çeki tek güncellemeyle yazar", () => {
    let h = [{ id: 1, tur: "odeme" }, { id: 2, tur: "odeme" }];
    let c = [{ id: 200, durum: "portfoy" }];
    const setHesapHareketleri = vi.fn(f => { h = f(h); }), setCekler = vi.fn(f => { c = f(c); });
    let i = 100;
    const yazilan = odemeGirisiYaz({ hareketler: [{ tur: "odeme", tutar: 5 }], cek: { id: 200, durum: "ciro" }, silinenler: [1] }, { setHesapHareketleri, setCekler, uid: () => ++i });
    expect(setHesapHareketleri).toHaveBeenCalledTimes(1);
    expect(h.map(x => x.id)).toEqual([2, 101]);
    expect(yazilan).toEqual([{ tur: "odeme", tutar: 5, id: 101 }]);
    expect(c).toEqual([{ id: 200, durum: "ciro" }]);
  });
});
