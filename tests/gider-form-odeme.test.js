// Spec 0046: gider formundan hedef bazlı ödeme ve çek cirosu (saf motor, lib/formOdemesi.js).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { formOdemeHedefleri, odemeGirisiHazirla, hepsiniOde, ciroCekleri, CIRO_YALNIZ_ANA_NEDENI, PASIF_TAKSIT_NEDENI } from "../src/lib/formOdemesi";
import { cokluOdemeDogrula, hesapBakiyeleri } from "../src/lib/kasa";
import { ciroAdaylari, ciroPlani } from "../src/lib/cek";
import { giderKalemDogrula, turHaritasi, odemeleriUygula, odemeDurumu, hesaplaGiderRaporu, HEDEF } from "../src/lib/gider";
import { hesaplaMakinaMaliyetleri } from "../src/lib/makinaMaliyeti";

const turler = [{ id: 1, ad: "Hammadde", davranis: "normal" }, { id: 2, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }];
const turMap = turHaritasi(turler);
const tedarikciler = [{ id: 11, ad: "Yıldız Gayrimenkul" }];
let n = 9000;
const uid = () => ++n;
const kayit = (form) => { const r = giderKalemDogrula(form, { turMap, tedarikciler, uid }); expect(r.hatalar).toEqual([]); return r.kayit; };
const normal = (o = {}) => kayit({ id: 1, tarih: "2026-09-10", turId: 1, tutar: 10000, kdvOrani: 20, tedarikciId: 11, sonOdemeTarihi: "2026-09-30", ...o });
const kira = (o = {}) => kayit({ id: 2, tarih: "2026-09-01", turId: 2, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 11, sonOdemeTarihi: "2026-09-05", ...o });
const personel = (o = {}) => kayit({ id: 3, tarih: "2026-09-01", turId: 3, calisanId: 7, calisanAd: "Hasan", resmiTutar: 30000, eldenTutar: 20000, sonOdemeTarihi: "2026-09-30", ...o });
const H = [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000 }, { id: 52, ad: "Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 50000 },
  { id: 53, ad: "Dolar", tur: "banka", paraBirimi: "USD" }, { id: 54, ad: "Eski", tur: "banka", paraBirimi: "TRY", kapali: true }];
const T = "2026-09-20";
const s = (tutar, o = {}) => ({ isaretli: true, tutar, yontem: "Havale", hesapId: 51, cekId: null, ...o });
// Spec 0053: 0046'nın hedef haritası biçimi ({ [hedef]: {isaretli, ...} }) yeni satır listesine çevrilir ve AYNI motor
// (odemeGirisiHazirla) çağrılır; 0046'nın beklentileri aynen sınanır. Satır hatası hedefin ilk mesajına indirilir.
const listeye = (harita) => (Array.isArray(harita) ? harita : Object.entries(harita).filter(([, x]) => x?.isaretli !== false).map(([hedef, x]) => ({ anahtar: hedef, hedef, sira: null, ...x })));
const sonucu = (r) => ({ ...r, hatalar: { ...r.hatalar, satir: Object.fromEntries(Object.entries(r.hatalar.satirlar).map(([a, h]) => [a, Object.values(h)[0]])) } });
const hazirla = (k, satirlar, o = {}) => sonucu(odemeGirisiHazirla(k, { turMap, tarih: T, satirlar: listeye(satirlar), hesaplar: H, ...o }));
// Çek: portföyde 12.000 TL.
const odeme = (id, tutar, o = {}) => ({ id, customerId: 1, tarih: "2026-09-01", tutar, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-10-15", ...o });
const cek = (id, paymentId, o = {}) => ({ id, paymentId, no: "123456", banka: "Ziraat", kesideci: "Ali", tur: "hamiline", durum: "portfoy", gecmis: [], ...o });

describe("Spec 0046: hedef satırları", () => {
  it("AC-1 / AC-38: personelde resmi ve elden iki satır, HEDEF_SIRASI sırasıyla", () => {
    expect(formOdemeHedefleri(personel(), turMap).map(h => [h.hedef, h.kalanK])).toEqual([[HEDEF.ANA, 3000000], [HEDEF.ELDEN, 2000000]]);
  });
  it("AC-4 / AC-38: kirada kiraya veren ve stopaj iki satır; ANA önce", () => {
    expect(formOdemeHedefleri(kira(), turMap).map(h => [h.hedef, h.kalanK, h.ciroOlur])).toEqual([[HEDEF.ANA, 1600000, true], [HEDEF.STOPAJ, 400000, false]]);
  });
  it("AC-6 / AC-7 / AC-8: stopajsız kira, eldensiz personel ve normal kalem tek satır", () => {
    expect(formOdemeHedefleri(kira({ stopajOrani: 0 }), turMap).map(h => h.hedef)).toEqual([HEDEF.ANA]);
    expect(formOdemeHedefleri(personel({ eldenTutar: 0 }), turMap).map(h => h.hedef)).toEqual([HEDEF.ANA]);
    expect(formOdemeHedefleri(normal(), turMap).map(h => [h.hedef, h.kalanK, h.taksitId])).toEqual([[HEDEF.ANA, 1200000, null]]);
  });
  it("AC-11 / AC-32: taksitli hedef pasif ve nedenli; bütün hedefler taksitliyse çizilebilir satır yok", () => {
    const k = kira({ taksitSayisi: 3 });
    expect(formOdemeHedefleri(k, turMap).map(h => [h.hedef, h.pasif, h.neden])).toEqual([[HEDEF.ANA, true, PASIF_TAKSIT_NEDENI], [HEDEF.STOPAJ, false, null]]);
    expect(formOdemeHedefleri(normal({ taksitSayisi: 4 }), turMap).every(h => h.pasif)).toBe(true);
  });
});

describe("Spec 0046: ödeme hareketleri", () => {
  it("AC-2 / AC-3 / AC-5: her hedef kendi hesabı ve yöntemiyle ayrı hareket; hesap bakiyeleri ayrı düşer", () => {
    const k = personel();
    const r = hazirla(k, { ana: s(30000), elden: s(20000, { yontem: "Nakit", hesapId: 52 }) });
    expect(r.hareketler.map(h => [h.taksitId != null, h.tutar, h.yontem, h.hesapId])).toEqual([[true, 30000, "Havale", 51], [true, 20000, "Nakit", 52]]);
    const b = hesapBakiyeleri(H, r.hareketler.map((h, i) => ({ ...h, id: i + 1 })), {});
    expect([b.get("51").bakiye, b.get("52").bakiye]).toEqual([70000, 30000]);
    const kr = kira();
    const r2 = hazirla(kr, { stopaj: s(4000, { hesapId: 52 }) });
    expect(r2.hareketler).toHaveLength(1);
    const sonra = odemeleriUygula([kr], r2.hareketler.map((h, i) => ({ ...h, id: i + 1 })), turMap)[0];
    expect(formOdemeHedefleri(sonra, turMap).find(h => h.hedef === HEDEF.STOPAJ).odendi).toBe(true);
  });
  it("AC-9 / AC-10: işaretsiz satır hareket üretmez; eksik tutar kalemi kısmen bırakır", () => {
    const k = normal();
    expect(hazirla(k, {}).hareketler).toEqual([]);
    const r = hazirla(k, { ana: s(5000) });
    const sonra = odemeleriUygula([k], r.hareketler.map((h, i) => ({ ...h, id: i + 1 })), turMap)[0];
    expect(odemeDurumu(sonra)).toBe("kismen");
    expect(formOdemeHedefleri(sonra, turMap)[0].kalanK).toBe(700000);
  });
  it("AC-12 / AC-31: kalandan fazla, boş, sıfır ya da negatif tutar o satırda hata; hiçbir hareket yok", () => {
    const k = personel();
    expect(hazirla(k, { ana: s(40000), elden: s(20000) })).toMatchObject({ hareketler: null, hatalar: { satir: { [HEDEF.ANA]: expect.stringMatching(/Kalandan fazla/) } } });
    for (const t of ["", "0", "-5"]) {
      const r = hazirla(k, { elden: s(t) });
      expect(r.hareketler, t).toBeNull();
      expect(r.hatalar.satir[HEDEF.ELDEN], t).toMatch(/sıfırdan büyük|sayıya çevrilemedi/);
    }
  });
  it("AC-14 / AC-35: hesapsız ödeme geçer ve hiçbir bakiyeye girmez; TL dışı ve kapalı hesap reddedilir", () => {
    const k = normal();
    const r = hazirla(k, { ana: s(12000, { hesapId: "" }) });
    expect(r.hareketler[0].hesapId).toBeNull();
    const b = hesapBakiyeleri(H, r.hareketler.map((h, i) => ({ ...h, id: i + 1 })), {});
    expect(b.get("51").bakiye).toBe(100000);
    expect(hazirla(k, { ana: s(12000, { hesapId: 53 }) }).hatalar.satir[HEDEF.ANA]).toBe("Gider ödemesi yalnız TL hesaptan yapılır.");
    expect(hazirla(k, { ana: s(12000, { hesapId: 54 }) }).hatalar.satir[HEDEF.ANA]).toBe("Kapatılmış hesaba hareket girilemez.");
  });
  it("AC-29: form yolu ile ödeme penceresi yolu aynı girdiyle alan alan aynı hareketi üretir; iki yol aynı fonksiyonu çağırır", () => {
    const k = personel();
    const form = hazirla(k, { ana: s(30000), elden: s(5000, { yontem: "Nakit", hesapId: 52 }) }).hareketler;
    const hedef = formOdemeHedefleri(k, turMap);
    const pencere = cokluOdemeDogrula({ tarih: T, satirlar: [
      { taksitId: hedef[0].taksitId, tutar: 30000, yontem: "Havale", hesapId: 51, aciklama: "" },
      { taksitId: hedef[1].taksitId, tutar: 5000, yontem: "Nakit", hesapId: 52, aciklama: "" }] }, { kalem: k, turMap, hesaplar: H }).kayitlar;
    expect(form).toEqual(pencere);
    const motor = readFileSync("src/lib/formOdemesi.js", "utf8");
    expect(motor).toMatch(/cokluOdemeDogrula\(/);
    // Spec 0053 R29: pencere ve form aynı giriş fonksiyonunu (odemeGirisiHazirla) çağırır; o da cokluOdemeDogrula'yı.
    expect(readFileSync("src/components/gider/OdemeKayitPenceresi.jsx", "utf8")).toMatch(/odemeGirisiHazirla\(/);
    expect(readFileSync("src/components/GiderForm.jsx", "utf8")).toMatch(/odemeGirisiHazirla\(/);
  });
  it("AC-40: 'Hepsini ödendi' yolu 0024 R17'yi korur: satırlı kalemde her satıra kendi tutarı, satırsızda ödenecek tutarın tamamı", () => {
    const tam = (k) => odemeGirisiHazirla(k, { turMap, tarih: T, satirlar: hepsiniOde([], formOdemeHedefleri(k, turMap), { yontem: "Havale", hesapId: 51 }), hesaplar: H }).hareketler;
    // Eski tamOdemeHareketleri'nin beklenen çıktıları (0024 R17): {tur, tarih, tutar, yontem, hesapId, giderId, taksitId, aciklama}.
    const kr = kira();
    expect(tam(kr)).toEqual(kr.taksitler.map(r => ({ tur: "odeme", tarih: T, tutar: r.tutar, yontem: "Havale", hesapId: 51, giderId: 2, taksitId: r.id, aciklama: "" })));
    expect(tam(normal())).toEqual([{ tur: "odeme", tarih: T, tutar: 12000, yontem: "Havale", hesapId: 51, giderId: 1, taksitId: null, aciklama: "" }]);
    expect(readFileSync("src/lib/kasa.js", "utf8")).not.toMatch(/tamOdemeHareketleri/);
  });
});

describe("Spec 0046: çek cirosu", () => {
  const P = [odeme(100, 12000), odeme(101, 5000, { currency: "USD" }), odeme(102, 8000)];
  const C = [cek(200, 100), cek(201, 101), cek(202, 102, { durum: "tahsil" })];
  const ciro = (k, satirlar, o = {}) => hazirla(k, satirlar, { cekler: C, payments: P, alacakliAd: "Yıldız Gayrimenkul", ...o });
  it("AC-15: ciro edilebilecek çekler yalnız portföydeki TL çeklerdir", () => {
    expect(ciroCekleri(C, P).map(x => x.cek.id)).toEqual([200]);
  });
  it("AC-16 / AC-17 / AC-18 / AC-20 / AC-39: çekle ANA hedef kapanır, hareket hesapsız ve çek bağlı; çek ciro edildi, geçmişe alacaklı yazılır; fark uyarısı motorun metni", () => {
    const k = normal({ tutar: 10000, kdvOrani: 0 }); // 10.000; çek 12.000
    const r = ciro(k, { ana: s("", { yontem: "Çek (ciro)", cekId: 200, hesapId: "" }) });
    expect(r.hareketler).toEqual([expect.objectContaining({ tur: "odeme", tutar: 10000, yontem: "Çek (ciro)", hesapId: null, cekId: 200, giderId: 1 })]);
    expect(r.cek).toMatchObject({ id: 200, durum: "ciro", gecmis: [expect.objectContaining({ durum: "ciro", not: "Ciro: Yıldız Gayrimenkul" })] });
    const aday = ciroAdaylari([k], { tur: "tedarikci", id: 11 }, turMap);
    const beklenen = ciroPlani({ cek: C[0], odeme: P[0], adaylar: aday, dagitim: [{ anahtar: aday[0].anahtar, tutarK: 1000000 }], tarih: T, alacakliAd: "Yıldız Gayrimenkul", turMap });
    expect(r.uyari).toBe(beklenen.uyari);
    expect(r.uyari).toMatch(/2\.000,00 ₺ fazla/);
    // AC-17: ciro hiçbir hesabın bakiyesini değiştirmez.
    const b = hesapBakiyeleri(H, r.hareketler.map((h, i) => ({ ...h, id: i + 1 })), {});
    expect([...b.values()].map(x => x.bakiye)).toEqual([100000, 50000, 0, 0]);
    expect(odemeDurumu(odemeleriUygula([k], r.hareketler.map((h, i) => ({ ...h, id: i + 1 })), turMap)[0])).toBe("odendi");
  });
  it("AC-19: stopaj ve elden hedefinde ciro kabul edilmez; nedeni motordan", () => {
    expect(ciro(kira(), { stopaj: s("", { yontem: "Çek (ciro)", cekId: 200 }) }).hatalar.satir[HEDEF.STOPAJ]).toBe(CIRO_YALNIZ_ANA_NEDENI[HEDEF.STOPAJ]);
    expect(ciro(personel(), { elden: s("", { yontem: "Çek (ciro)", cekId: 200 }) }).hatalar.satir[HEDEF.ELDEN]).toBe(CIRO_YALNIZ_ANA_NEDENI[HEDEF.ELDEN]);
  });
  it("AC-21 / AC-33: çek seçilmeden ya da tedarikçisiz kalemde ad boşken ciro kaydedilmez, neden o satırda", () => {
    expect(ciro(normal(), { ana: s("", { yontem: "Çek (ciro)", cekId: null }) }).hatalar.satir[HEDEF.ANA]).toBe("Ciro edilecek çek seçilmedi.");
    const serbest = normal({ tedarikciId: null });
    expect(ciro(serbest, { ana: s("", { yontem: "Çek (ciro)", cekId: 200 }) }, { alacakliAd: "" }).hatalar.satir[HEDEF.ANA]).toBe("Kime ciro edildiği girilmedi.");
    expect(ciro(serbest, { ana: s("", { yontem: "Çek (ciro)", cekId: 200 }) }, { alacakliAd: "Serbest Usta" }).cek.gecmis[0].not).toBe("Ciro: Serbest Usta");
  });
  it("personelde çekle resmi, nakitle elden aynı kayıtta", () => {
    const r = ciro(personel(), { ana: s("", { yontem: "Çek (ciro)", cekId: 200 }), elden: s(20000, { yontem: "Nakit", hesapId: 52 }) }, { alacakliAd: "Hasan" });
    expect(r.hareketler.map(h => [h.yontem, h.tutar, h.cekId ?? null])).toEqual([["Nakit", 20000, null], ["Çek (ciro)", 12000, 200]]);
  });
  it("R25, C2: formda ikinci ciro üretimi yok; motor ciroAdaylari ve ciroPlani'yı çağırır", () => {
    const m = readFileSync("src/lib/formOdemesi.js", "utf8");
    expect(m).toMatch(/ciroAdaylari\(/);
    expect(m).toMatch(/ciroPlani\(/);
    for (const f of ["src/components/GiderForm.jsx", "src/components/gider/OdemeGirisi.jsx", "src/components/gider/OdemeKayitPenceresi.jsx", "src/components/Giderler.jsx"]) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(/ciroPlani\(|CEK_DURUM\.CIRO|durum: "ciro"/);
    }
  });
});

describe("Spec 0046: gider tarafı değişmez (C5)", () => {
  it("AC-28: dönem raporu ve makina maliyeti ödemeli ve ödemesiz aynı", () => {
    const k = kira();
    const hareketler = hazirla(k, hepsiniOde([], formOdemeHedefleri(k, turMap), { yontem: "Havale", hesapId: 51 })).hareketler.map((h, i) => ({ ...h, id: i + 1 }));
    const rapor = (g) => hesaplaGiderRaporu({ giderler: g, turler, tedarikciler }, { baslangic: "2026-09-01", bitis: "2026-09-30" }, { bugun: "2026-09-25" });
    const odenmis = odemeleriUygula([k], hareketler, turMap);
    const a = rapor([k]), b = rapor(odenmis);
    expect(a.toplam).toBe(20000);
    expect([b.toplam, b.indirilecekKdv, b.stopajToplam]).toEqual([a.toplam, a.indirilecekKdv, a.stopajToplam]);
    // Makina maliyeti: makinaya atanmış normal kalem, ödemeli ve ödemesiz.
    const n1 = normal({ atamaTur: "makina", makinaTur: "stok", makinaId: 501 });
    const h1 = hazirla(n1, { ana: s(12000) }).hareketler.map((h, i) => ({ ...h, id: i + 1 }));
    const mm = (g) => hesaplaMakinaMaliyetleri({ giderler: g, giderTurleri: turler, stock: [{ id: 501, model: "AK100", serialNo: "S1", tarih: "2026-09-12" }], giderAyarlari: { yururlukAy: "2026-01" } }, { bugun: "2026-09-25" }).liste;
    const once = mm([n1]);
    expect(once.length).toBe(1);
    expect(JSON.stringify(mm(odemeleriUygula([n1], h1, turMap)))).toBe(JSON.stringify(once));
  });
});
