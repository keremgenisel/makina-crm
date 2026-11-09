// Spec 0140: tedarikçi odaklı, düzenlenebilir sipariş listesi. Motor (`siparisIhtiyaci(veri, { tedarikciOdakli, duzenleme,
// secilenTedarikciler })`), doğrulayıcılar, seçici seçenekleri, boş durum nedenleri ve kaynak taramaları.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import * as S from "../src/lib/siparisIhtiyaci";
import { parcaMaliyetKurus, setKatalogu } from "../src/lib/urunAgaci";
import { malzemeKatalogu } from "../src/lib/malzeme";
import * as F from "./fixtures/0134-veri";
import { BELIRSIZ_HATASI } from "../src/lib/tutarGirdisi";

const kod = (f) => fs.readFileSync(f, "utf8");
const yorumsuz = (k) => k.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
const PENCERE = "src/components/stock/SiparisPenceresi.jsx";
const TED = [...F.TED, { id: 14, ad: "Kargo Ltd." }, { id: 15, ad: "Rulmancı", hammadde: false }, { id: 16, ad: "Çöpteki", hammadde: true, deletedAt: "2026-09-01" }];
const veri = (o = {}) => F.veri({ tedarikciler: TED, ...o });
const parcalar = (ek = {}) => [{ ...F.KESME, ...(ek[41] || {}) }, { ...F.PUL, ...(ek[42] || {}) }, { ...F.SOMUN, ...(ek[43] || {}) }, { ...F.SET, ...(ek[44] || {}) }];
const tb = (v, sec = {}) => S.siparisIhtiyaci(v, { tedarikciOdakli: true, ...sec }).tedarikciBolumleri;
const bolum = (t, id) => t.bolumler.find(b => b.tedarikciId === String(id));
const hazir = (t, id, partId) => bolum(t, id)?.hazirParcalar.find(x => x.partId === String(partId));

describe("Spec 0140 C: tedarikçi bölümleri", () => {
  it("AC-18: parti seçilince satırlar partinin planlanan adetlerinden (bugünkü kural)", () => {
    expect(S.partidenSatirlar({ planlananAdetler: { ak100_ds: 7 } }, [F.AK100]).satirlar).toEqual([{ model: "AK100_DS", adet: "7" }]);
  });
  it("AC-19 / AC-22 / AC-24: seçim yokken bütün tedarikçiler; Ana tedarikçisi olan hazır parça kendi bölümünde, kesit malzemenin tedarikçisinde", () => {
    const t = tb(veri({ parts: parcalar({ 42: { tedarikciId: 13 } }) }));
    expect(t.bolumler.map(b => b.ad)).toEqual(["Ana Çelik", "Beta Metal"]);
    expect(hazir(t, 13, 42)).toMatchObject({ ad: "Pul", siparis: 700, oneri: 700 });
    const eski = S.siparisIhtiyaci(veri({ parts: parcalar({ 42: { tedarikciId: 13 } }) })).kesitler[0];
    expect(bolum(t, 12).malzemeler[0]).toMatchObject({ anahtar: eski.anahtar, siparisKg: eski.siparisKg, boyAdedi: eski.boyAdedi, tutarTLK: eski.tutarTLK });
  });
  it("AC-20 / AC-75: iki tedarikçi seçilince yalnız onların bölümleri; satırsız seçilen sayılır", () => {
    const v = veri({ parts: parcalar({ 42: { tedarikciId: 13 } }) });
    expect(tb(v, { secilenTedarikciler: ["12"] }).bolumler.map(b => b.ad)).toEqual(["Ana Çelik"]);
    const t = tb(v, { secilenTedarikciler: ["12", "13", "15"] });
    expect(t.bolumler.map(b => b.ad)).toEqual(["Ana Çelik", "Beta Metal"]);
    expect(t.satirsizSecilen).toEqual(["15"]);
    expect(S.satirsizSecilenMetni(3, 1)).toBe("Seçilen 3 firmanın 1 tanesinde satır yok.");
  });
  it("AC-21 / AC-76: seçicide hammadde işaretli ya da Ana tedarikçi olan canlı tedarikçiler; kargo ve çöpteki yok", () => {
    const ad = (o) => S.tedarikciSecenekleri({ tedarikciler: TED, ...o }).map(t => t.ad);
    expect(ad({ parts: [], malzemeler: [] })).toEqual(["Ana Çelik", "Beta Metal"]);
    expect(ad({ parts: [{ id: 1, ad: "x", tedarikciId: 15 }], malzemeler: [] })).toEqual(["Ana Çelik", "Beta Metal", "Rulmancı"]);
    expect(ad({ parts: [], malzemeler: [{ id: 1, ad: "m", tedarikciId: 14 }] })).toContain("Kargo Ltd.");
    expect(ad({ parts: [{ id: 1, ad: "x", tedarikciId: 16 }] })).not.toContain("Çöpteki");
  });
  it("AC-23: stok ihtiyacı karşılayan parça tedarikçi bölümünde yok, tam tabloda sıfır adediyle", () => {
    const v = veri({ parts: parcalar({ 43: { tedarikciId: 13 } }), partStock: [{ id: 1, partId: 43, miktar: 100000 }] });
    const r = S.siparisIhtiyaci(v, { tedarikciOdakli: true });
    expect(bolum(r.tedarikciBolumleri, 13)).toBeUndefined();
    expect(r.parcalar.find(p => p.partId === "43").siparis).toBe(0);
  });
  it("AC-25 / C-R8: hem Ana tedarikçisi hem malzemesinin tedarikçisi olan parça iki bölümde; tutar malzemeli parçada yazılmaz (AC-73)", () => {
    const t = tb(veri({ parts: parcalar({ 41: { tedarikciId: 13 } }) }));
    expect(hazir(t, 13, 41)).toMatchObject({ malzemeli: true, tutarK: null, tutarNeden: S.MALZEMESI_ASAGIDA });
    expect(bolum(t, 12).malzemeler).toHaveLength(1);
    expect(S.CIFT_SAYIM_DEGIL).toMatch(/çift sayım değildir/);
  });
  it("AC-26 / AC-78 (karar 33): Ana tedarikçisiz hazır parça belirtilmemiş bölümünde; Ana tedarikçisiz malzemeli parça yalnız sayılır", () => {
    const t = tb(veri({ parts: parcalar() }));
    expect(t.belirtilmemis.parcalar.map(x => x.ad).sort()).toEqual(["Pul", "Somun"]);
    expect(t.belirtilmemis.anasizMalzemeli).toBe(1);
    expect(t.belirtilmemis.parcalar.some(x => x.partId === "41")).toBe(false);
    const tSiz = tb(veri({ parts: parcalar(), malzemeler: [{ ...F.P304, tedarikciId: undefined }] }));
    expect(tSiz.belirtilmemis.kesitler).toHaveLength(1);
    expect(S.TEDARIKCI_BELIRTILMEMIS).toBe("Tedarikçisi belirtilmemiş");
    expect(tb(veri({ parts: parcalar() }), { secilenTedarikciler: ["12"] }).belirtilmemis.parcalar).toEqual([]);
  });
  it("AC-27: çöpteki tedarikçinin satırları adının yanında durumuyla; bölüm silinmiş işaretli", () => {
    const t = tb(veri({ parts: parcalar(), tedarikciler: [], hamTedarikciler: [{ id: 12, ad: "Ana Çelik", deletedAt: "2026-09-01" }] }));
    expect(bolum(t, 12)).toMatchObject({ ad: "Ana Çelik (silinmiş tedarikçi)", silinmis: true });
  });
  it("AC-28: boş durumun üç nedeni metin sabitlerinden", () => {
    const kitBos = S.siparisIhtiyaci(veri({ modeller: [F.model("AK100_DS", [])] }), { tedarikciOdakli: true });
    expect(S.bosDurumNedeni(kitBos)).toBe(S.BOS_KIT);
    const stokYeter = S.siparisIhtiyaci(veri({ modeller: [F.model("AK100_DS", [[42, 1]])], partStock: [{ id: 1, partId: 42, miktar: 1000 }] }), { tedarikciOdakli: true });
    expect(S.bosDurumNedeni(stokYeter)).toBe(S.BOS_STOK_YETIYOR);
    const secim = S.siparisIhtiyaci(veri(), { tedarikciOdakli: true, secilenTedarikciler: ["15"] });
    expect(S.bosDurumNedeni(secim)).toBe(S.BOS_SECIM);
    expect(S.bosDurumNedeni(S.siparisIhtiyaci(veri(), { tedarikciOdakli: true }))).toBeNull();
  });
  it("AC-74: tedarikçi toplamı hazır parça tutarları + malzeme tutarları; aynı malzeme iki kez toplanmaz", () => {
    const t = tb(veri({ parts: parcalar({ 41: { tedarikciId: 12 }, 42: { tedarikciId: 12 } }) }));
    const b = bolum(t, 12);
    const pul = b.hazirParcalar.find(x => x.partId === "42");
    expect(pul.birimK).toBe(500); expect(pul.tutarK).toBe(500 * 700);
    expect(b.tutarTLK).toBe(pul.tutarK + b.malzemeler[0].tutarTLK);
  });
  it("AC-6: Ana tedarikçi parçanın maliyetini değiştirmez", () => {
    const mk = malzemeKatalogu([F.P304]);
    for (const p of [F.KESME, F.PUL]) expect(parcaMaliyetKurus({ ...p, tedarikciId: 12 }, undefined, setKatalogu([p]), mk)).toBe(parcaMaliyetKurus(p, undefined, setKatalogu([p]), mk));
  });
});

describe("Spec 0140 D: düzenleme (girdi motora)", () => {
  const v = () => veri({ parts: parcalar({ 41: { tedarikciId: 13 }, 42: { tedarikciId: 13 } }) });
  const hesap = (duzenleme, o = v()) => S.siparisIhtiyaci(o, { tedarikciOdakli: true, duzenleme });
  it("AC-29 / AC-30 / AC-31: adet değişir; sıfır ve kapatılan satır basılacaklardan ve toplamdan düşer", () => {
    const r = hesap({ parca: { 42: { adet: "100" } } });
    expect(hazir(r.tedarikciBolumleri, 13, 42)).toMatchObject({ siparis: 100, oneri: 700, duzenlendi: true });
    const s0 = hesap({ parca: { 42: { adet: "0" } } });
    expect(hazir(s0.tedarikciBolumleri, 13, 42).siparis).toBe(0);
    const k = hesap({ parca: { 42: { kapali: true } } });
    expect(hazir(k.tedarikciBolumleri, 13, 42)).toMatchObject({ kapali: true, siparis: 0 });
    expect(bolum(k.tedarikciBolumleri, 13).tutarTLK).toBeNull();
  });
  it("AC-32 / AC-33: parçanın satırı kapatılınca kesiti düşer; adedi yarıya inince kilosu azalır", () => {
    const tam = hesap(null).kesitler[0];
    expect(hesap({ parca: { 41: { kapali: true } } }).kesitler).toEqual([]);
    const yari = hesap({ parca: { 41: { adet: String(Math.round(tam.parcalar[0].adet / 2)) } } }).kesitler[0];
    expect(yari.netKg).toBeCloseTo(tam.netKg / 2, 6);
  });
  it("Triyaj bulgu 4: üç ondalıkta öneriye eşit kilo düzenleme sayılmaz (öneri yuvarlanmadan, asgari farkı yerinde); farklı değer sayılır", () => {
    const tam = hesap(null).kesitler[0];
    const yazilan = Number(tam.siparisKg.toFixed(3)).toLocaleString("tr-TR", { maximumFractionDigits: 3 });
    const r = hesap({ kesit: { [tam.anahtar]: { deger: yazilan } } });
    expect(r.kesitler[0]).toMatchObject({ siparisKg: tam.siparisKg, boyAdedi: tam.boyAdedi, asgariFark: tam.asgariFark });
    expect(r.kesitler[0].elle).toBeFalsy();
    expect(r.tedarikciBolumleri.duzen.duzenlenen).toBe(0);
    const farkli = hesap({ kesit: { [tam.anahtar]: { deger: "772" } } });
    expect(farkli.kesitler[0]).toMatchObject({ elle: true, siparisKg: 772 });
    expect(farkli.tedarikciBolumleri.duzen.duzenlenen).toBe(1);
  });
  it("AC-34 / AC-84 / AC-85: elle kilo korunur, asgari farkı uygulanmaz ama altındaysa uyarı; boy ve artan yok; tutar elle kilo × fiyat", () => {
    const m = { ...F.P304, asgariSiparis: 2000 };
    const o = veri({ parts: parcalar({ 41: { tedarikciId: 13 } }), malzemeler: [m] });
    const an = S.siparisIhtiyaci(o).kesitler[0].anahtar;
    const r = S.siparisIhtiyaci(o, { tedarikciOdakli: true, duzenleme: { kesit: { [an]: { deger: "500,5" } }, parca: { 41: { adet: "10" } } } });
    const k = r.kesitler[0];
    expect(k).toMatchObject({ elle: true, siparisKg: 500.5, boyAdedi: null, artanKg: null, asgariFark: null, boyNeden: S.ELLE_KILO_NEDENI });
    expect(k.asgariUyari).toBe(S.asgariAltiMetni(2000));
    expect(k.tutarTLK).toBe(Math.round(500.5 * 2.95 * 50 * 100));
    expect(k.oneriSiparisKg).toBeGreaterThan(0);
  });
  it("AC-88: bütün parçaları kapatılan kesitin elle kilosu satır olarak kalır ve işaretlidir", () => {
    const an = hesap(null).kesitler[0].anahtar;
    const r = hesap({ parca: { 41: { kapali: true } }, kesit: { [an]: { deger: "300" } } });
    expect(r.kesitler).toHaveLength(1);
    expect(r.kesitler[0]).toMatchObject({ parcalarKapali: true, elle: true, siparisKg: 300 });
    expect(bolum(r.tedarikciBolumleri, 12).malzemeler).toHaveLength(1);
  });
  it("Triyaj bulgu 2 (D-R5/2 > AC-86): kapatılan setin malzemeli bileşeninin kesitine yazılan elle kilo satır olarak kalır; elle değer yoksa kesit düşer", () => {
    const SETM = { id: 45, ad: "Mil seti", models: [], setIcerigi: [{ partId: 46, miktar: 2 }] };
    const SETMIL = { id: 46, ad: "Set mili", models: [], malzemeSatiri: F.KESME.malzemeSatiri };
    const o = veri({ modeller: [F.model("AK100_DS", [[45, 1]])], parts: [SETMIL, SETM] });
    const r0 = S.siparisIhtiyaci(o, { tedarikciOdakli: true });
    expect(r0.kesitler).toHaveLength(1);
    const an = r0.kesitler[0].anahtar;
    const kapali = S.siparisIhtiyaci(o, { tedarikciOdakli: true, duzenleme: { parca: { 45: { kapali: true } } } });
    expect(kapali.kesitler).toHaveLength(0); // AC-86: elle değer yoksa malzeme düşer
    const r = S.siparisIhtiyaci(o, { tedarikciOdakli: true, duzenleme: { parca: { 45: { kapali: true } }, kesit: { [an]: { deger: "500" } } } });
    expect(r.kesitler).toHaveLength(1);
    expect(r.kesitler[0]).toMatchObject({ anahtar: an, parcalarKapali: true, elle: true, siparisKg: 500 });
    expect(r.tedarikciBolumleri.duzen.duzenlenen).toBeGreaterThanOrEqual(1);
    expect(bolum(r.tedarikciBolumleri, 12).malzemeler.map(k => k.anahtar)).toEqual([an]);
  });
  it("AC-86 / AC-87 (D-R4/2): kapatılan set patlatılmaz; yarıya inen set bileşenlerin ihtiyacını azaltır", () => {
    const o = veri({ parts: parcalar() });
    const pul = (d) => S.siparisIhtiyaci(o, { tedarikciOdakli: true, duzenleme: d }).parcalar.find(p => p.partId === "42");
    const once = pul(null);
    const kapali = pul({ parca: { 44: { kapali: true } } });
    expect(kapali.ihtiyac).toBeLessThan(once.ihtiyac);
    expect(kapali.kaynaklar.some(k => k.tur === "set")).toBe(false);
    const yari = pul({ parca: { 44: { adet: "35" } } });
    expect(yari.ihtiyac).toBeGreaterThan(kapali.ihtiyac);
    expect(yari.ihtiyac).toBeLessThan(once.ihtiyac);
    const set = S.siparisIhtiyaci(o, { tedarikciOdakli: true, duzenleme: { parca: { 44: { kapali: true } } } });
    expect(set.parcalar.find(p => p.partId === "44").patlatildi).toBe(false);
  });
  it("AC-38 / AC-39 / AC-82: sipariş adedi 0–1.000.000 tam sayı, boş sıfır; negatif reddedilir; belirsiz yazılmış elle kilo reddedilir", () => {
    expect(S.siparisAdediDogrula("")).toEqual({ deger: 0, hata: null });
    expect(S.siparisAdediDogrula("0")).toEqual({ deger: 0, hata: null });
    expect(S.siparisAdediDogrula("1000000").deger).toBe(1000000);
    for (const x of ["-1", "1000001", "2,5", "abc"]) expect(S.siparisAdediDogrula(x).hata, x).toBe(S.SIPARIS_ADET_HATASI);
    expect(S.siparisAdediDogrula("1.250").hata).toBe(S.SIPARIS_ADET_HATASI); // tam sayı alanı: belirsiz kuralı aranmaz
    expect(S.elleKiloDogrula("1.250").hata).toBe(BELIRSIZ_HATASI);
    expect(S.elleKiloDogrula("12,5").deger).toBe(12.5);
    const r = hesap({ parca: { 42: { adet: "-3" } } });
    expect(hazir(r.tedarikciBolumleri, 13, 42)).toMatchObject({ hata: S.SIPARIS_ADET_HATASI, siparis: 700 });
    expect(r.tedarikciBolumleri.duzen.hata).toBe(1);
  });
  it("AC-41 / AC-89: başlıktaki iki sayı parça ve malzeme satırlarını birlikte sayar, tek cümlede", () => {
    const an = hesap(null).kesitler[0].anahtar;
    const r = hesap({ parca: { 42: { adet: "10" }, 43: { kapali: true } }, kesit: { [an]: { deger: "100", kapali: true } } });
    expect(r.tedarikciBolumleri.duzen).toMatchObject({ duzenlenen: 2, kapatilan: 2 });
    expect(S.duzenlemeSayiMetni(r.tedarikciBolumleri.duzen)).toBe("2 satır düzenlendi · 2 satır kapatıldı");
  });
  it("D-R6, karar 36: girdi değişince görünmeyen anahtarın düzenlemesi etkisiz ve sayılmaz", () => {
    const r = hesap({ parca: { 999: { adet: "5" } } });
    expect(r.tedarikciBolumleri.duzen).toMatchObject({ duzenlenen: 0, kapatilan: 0 });
  });
});

describe("Spec 0140 taramaları", () => {
  const pencere = yorumsuz(kod(PENCERE));
  it("C1 / DoD: pencere aritmetik yazmaz; motoru tek useMemo ile çağırır", () => {
    expect(pencere).not.toMatch(/yukari\(|Math\.(ceil|floor|round)|\.reduce\(/);
    expect((pencere.match(/siparisIhtiyaci\(/g) || []).length).toBe(1);
  });
  it("AC-64: pencere tek dosyadır; iki giriş noktası aynı bileşeni içe alır", () => {
    for (const f of ["src/components/PartManager.jsx", "src/components/stock/PartStokTab.jsx"]) expect(kod(f)).toMatch(/import \{ SiparisPenceresi, SIPARIS_DUGMESI \} from "\.\/?(stock\/)?SiparisPenceresi"/);
    expect(fs.existsSync("src/components/maliyet/SiparisIhtiyaci.jsx")).toBe(false);
  });
  it("AC-66: pencere yazdırma API'sini doğrudan çağırmaz; düğme rapor/ altında", () => {
    expect(pencere).not.toMatch(/printHtml|appPrint/);
    expect(kod("src/components/rapor/SiparisRaporuDugmesi.jsx")).toMatch(/printHtml/);
  });
  it("AC-69: pencere makina maliyeti motorunu çağırmaz; gider verisi prop olarak inmez", () => {
    expect(pencere).not.toMatch(/makinaStandartMaliyet|makinaMaliyeti|giderler|giderTurleri|maliyetAyarlari/);
  });
  it("AC-81 / C-R12: boş durum ve düzenleme cümleleri motordan; pencere dosyasında yazılı değil", () => {
    for (const t of [S.BOS_KIT, S.BOS_STOK_YETIYOR, S.BOS_SECIM, S.CIFT_SAYIM_DEGIL, S.GECICI_DUZENLEME, S.HAMMADDE_SUZGEC_NEDENI]) expect(kod(PENCERE)).not.toContain(t);
  });
  it("C4 / B-R5: pencere hiçbir veri bölümüne yazmaz, kilit almaz, işlem geçmişine yazmaz", () => {
    expect(pencere).not.toMatch(/\bset(Parts|Malzemeler|PartStock|StandardModels|CustomModels|UretimPartileri|Tedarikciler)\b|useLock|logAction/);
  });
  it("DoD: sunucuda yeni bölüm kuralı yok; yeni eylem kimliği yalnız izin tanımlarında", () => {
    expect(kod("electron/serverAuth.cjs")).not.toMatch(/stock_siparis_listesi/);
    expect(kod("src/components/settings/serverPermissionDefs.js")).toMatch(/\{ id: "stock_siparis_listesi", label: "Sipariş listesini aç" \}/);
  });
});
