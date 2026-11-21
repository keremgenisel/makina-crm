// Spec 0153: gider kalemi döviz cinsinden girilir ve dövizle ödenir. Saf motor (doğrulayıcı ve tek yazıcı, lira karşılığı,
// kilit, ödeme yönü ve kırpma, grup kırpması, çek ve mahsup reddi, taksit, borç/açık kalem/rapor/arama) ve kaynak taramaları.
// Veri `0059-veri.js` (USD hesap 53, EUR hesap 56, TL hesap 51). Test adları AC-<n> taşır.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as G from "../src/lib/gider";
import * as K from "../src/lib/kasa";
import * as KUR from "../src/lib/kur";
import { ciroAdaylari } from "../src/lib/cek";
import { acikKalemler } from "../src/lib/acikKalemler";
import { formOdemeHedefleri, hepsiniOde, odemeGirisiHazirla } from "../src/lib/formOdemesi";
import { aramaSorgusu, kalemEslesmesi, kalemMeta } from "../src/lib/aramaGider";
import { giderKasaRaporu, buildGiderKasaRaporuHtml } from "../src/lib/giderRaporu";
import { fmtCur } from "../src/lib/utils";
import { girdi, H, HESAPLAR, GIDERLER, turler, turMap, tedarikciler } from "./fixtures/0059-veri";

let n = 9000;
const uid = () => ++n;
const dogrula = (form, o = {}) => G.giderKalemDogrula({ tarih: "2026-09-10", turId: 1, kdvOrani: 20, tedarikciId: 11, aciklama: "İthal rulman", ...form }, { turMap, tedarikciler, uid, ...o });
const kalem = (form = {}) => { const r = dogrula({ id: 801, tutar: "1.200", paraBirimi: "USD", kur: "40", kdvOrani: 0, ...form }); if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar)); return r.kayit; };
const zengin = (k, hareketler = []) => G.odemeleriUygula([k], hareketler, turMap)[0];
const odeme = (k, form, hareketler = []) => K.odemeDogrula({ tarih: "2026-09-20", yontem: "Havale", ...form }, { kalem: zengin(k, hareketler), turMap, hesaplar: HESAPLAR });
const hata = (r, alan) => r.hatalar.find(h => h.alan === alan)?.mesaj;
const yorumsuz = (f) => fs.readFileSync(f, "utf8").split("\n").filter(l => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).map(l => l.replace(/\s\/\/.*$/, "")).join("\n");
const dosyalar = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? dosyalar(path.join(d, e.name)) : /\.(jsx?|cjs|mjs)$/.test(e.name) ? [path.join(d, e.name)] : []));

describe("Spec 0153: kayıt şekli ve tek yazıcı", () => {
  it("AC-8 / AC-35: 1.200 USD ve kur 40 → döviz tutar 1.200, kur 40, lira karşılığı 48.000; TL kalemde üç alan yok", () => {
    const k = kalem();
    expect(k).toMatchObject({ tutar: 48000, dovizTutar: 1200, kur: 40, paraBirimi: "USD" });
    const tl = dogrula({ tutar: "1.200" }).kayit;
    for (const a of G.DOVIZ_KALEM_ALANLARI) expect(tl, a).not.toHaveProperty(a);
    expect(tl).not.toHaveProperty("kurKaynak");
  });
  it("AC-36 / R1/3: döviz kalem TL'ye çevrilince üç alan düşer; formda eski değer dursa da TL kipinde yazılmaz; TL kalem dövize alınınca üçü birden yazılır", () => {
    const k = kalem();
    const tl = dogrula({ ...k, tutar: "1.200", paraBirimi: "TRY" }).kayit;
    for (const a of G.DOVIZ_KALEM_ALANLARI) expect(tl, a).not.toHaveProperty(a);
    expect(tl.tutar).toBe(1200); // AC-13, P5: rakam aynen kalır
    const geri = dogrula({ ...tl, tutar: "1.200", paraBirimi: "EUR", kur: "38" }).kayit;
    expect(geri).toMatchObject({ dovizTutar: 1200, kur: 38, paraBirimi: "EUR", tutar: 45600 });
  });
  it("AC-37 / R4/2: lira karşılığı bir kez kuruşa yuvarlanır; formdan yeniden kaydedilen kalem birebir aynı", () => {
    const k = kalem({ tutar: "1.000", kur: "35,4787" });
    expect(k.tutar).toBe(35478.7);
    const tekrar = dogrula({ ...k, tutar: "1.000", kur: KUR.kurGirdisi(k.kur), kurKaynak: KUR.KUR_KAYNAK.TURETILEN }).kayit;
    expect(tekrar).toMatchObject({ tutar: k.tutar, dovizTutar: k.dovizTutar, kur: k.kur });
    expect(G.dovizdenLiraK(1000.01, 35.4787)).toBe(Math.round(100001 * 35.4787));
    expect(kalem({ tutar: "0,01", kur: "35,5" }).tutar).toBe(0.36); // yarım kuruş yukarı (35,5 kuruş → 36)
  });
  it("AC-10 / AC-43 / R6/2: %20 KDV dâhil 1.200 USD → hariç 1.000 USD, lira 40.000, KDV 8.000 lira (lira tabandan)", () => {
    const k = kalem({ kdvOrani: 20, kdvYonu: "dahil" });
    expect(k).toMatchObject({ dovizTutar: 1000, tutar: 40000, kdvYonu: "dahil" });
    expect(G.kalemKdv(k)).toBe(8000);
    expect(k).not.toHaveProperty("dovizKdv");
  });
  it("AC-11 / C1: KDV, tevkifat, kısıt ve ödenecek tutar lira cinsinden eşdeğer kalemle birebir aynı", () => {
    const ek = { kdvOrani: 20, tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10, kisitliGider: true, indirilebilirOran: 70 };
    const d = kalem(ek);
    const t = dogrula({ id: 802, tutar: "48.000", ...ek }).kayit;
    expect(G.kalemKdv(d)).toBe(G.kalemKdv(t));
    expect(G.kalemTevkifat(d)).toBe(G.kalemTevkifat(t));
    expect(G.kisitHesabi(d)).toEqual(G.kisitHesabi(t));
    expect(G.odenecekTutar(d)).toBe(G.odenecekTutar(t));
  });
  it("AC-9 / R5: kur kayıtta donar; günün kuru farklı olsa da kalemin lira karşılığı, KDV'si ve dönem toplamındaki yeri aynı", () => {
    const k = kalem({ kdvOrani: 20 });
    const r1 = G.hesaplaGiderRaporu({ giderler: [k], turler, tedarikciler }, { baslangic: "2026-09-01", bitis: "2026-09-30" });
    expect(KUR.kurOnerisi("USD", { usd: 45 }, false).deger).toBe(45); // günün kuru değişti; kalem okumaz
    expect(G.kalemTutari(k)).toBe(48000);
    expect(G.hesaplaGiderRaporu({ giderler: [k], turler, tedarikciler }, { baslangic: "2026-09-01", bitis: "2026-09-30" })).toEqual(r1);
    expect(r1.toplam).toBe(48000);
  });
  it("AC-15: dönem toplamı, tür ve tedarikçi kırılımı ve indirilecek KDV döviz kalemi lira karşılığıyla sayar", () => {
    const r = G.hesaplaGiderRaporu({ giderler: [kalem({ kdvOrani: 20 })], turler, tedarikciler }, { baslangic: "2026-09-01", bitis: "2026-09-30" });
    expect(r.toplam).toBe(48000);
    expect(r.indirilecekKdv).toBe(9600);
  });
  it("AC-59 / C6/2: tanınmayan para birimi, kursuz ya da döviz tutarsız kayıt lira sayılır, neden yazılmaz", () => {
    expect(G.kalemParaBirimi({ paraBirimi: "GBP", kur: 40, dovizTutar: 1 })).toBe("TRY");
    expect(G.kalemParaBirimi({ paraBirimi: "USD", dovizTutar: 1 })).toBe("TRY");
    expect(G.dovizKalemMi({ paraBirimi: "USD", kur: 40 })).toBe(false);
    expect(G.kalemDovizMetni({ paraBirimi: "GBP", kur: 40, dovizTutar: 1 }, 100)).toBe("");
    expect(G.odenecekTutar({ tutar: 100, kdvOrani: 0, paraBirimi: "GBP", kur: 40, dovizTutar: 1 })).toBe(100);
  });
});

describe("Spec 0153: giriş ve sınırlar", () => {
  it("AC-5 / AC-40 / R2/2: kur boşsa kayıt yok ve hata kur alanında; beş ondalık reddedilir, dört kabul; yüzde elliden fazla sapma uyarıdır", () => {
    expect(hata(dogrula({ tutar: "100", paraBirimi: "USD", kur: "" }), "kur")).toBe(KUR.KUR_BOS_HATASI);
    expect(hata(dogrula({ tutar: "100", paraBirimi: "USD", kur: "40,12345" }), "kur")).toBe(KUR.kurOndalikHatasi(4));
    expect(dogrula({ tutar: "100", paraBirimi: "USD", kur: "40,1234" }).kayit.kur).toBe(40.1234);
    expect(KUR.kurSapmaUyarisi(61, 40)).toMatch(/yüzde 50/);
    expect(KUR.kurSapmaUyarisi(59, 40)).toBeNull();
    expect(KUR.kurSapmaUyarisi(100, null)).toBeNull(); // P10: günün kuru yoksa uyarı yok
  });
  it("AC-41 / R2/3: döviz kipinde sıfır ve boş reddedilir; tanımdan üretilmiş TL kalemde sıfır serbest", () => {
    expect(hata(dogrula({ tutar: "0", paraBirimi: "USD", kur: "40" }), "tutar")).toBe(G.DOVIZ_TUTAR_SIFIR_HATASI);
    expect(hata(dogrula({ tutar: "", paraBirimi: "USD", kur: "40", tanimId: 3 }), "tutar")).toBe(G.DOVIZ_TUTAR_SIFIR_HATASI);
    expect(dogrula({ tutar: "", tanimId: 3 }).kayit.tutar).toBe(0);
  });
  it("AC-2 / R10: kira, personel ve SGK davranışında para birimi yazılmaz (tek yazıcının davranış kapısı)", () => {
    const kira = dogrula({ turId: 2, girisYonu: "brut", tutar: "10.000", stopajOrani: 20, kdvOrani: 0, paraBirimi: "USD", kur: "40" }).kayit;
    for (const a of G.DOVIZ_KALEM_ALANLARI) expect(kira, a).not.toHaveProperty(a);
    expect(kira.tutar).toBe(10000);
    expect(G.dovizSecilebilirMi(G.DAVRANIS.KIRA)).toBe(false);
    expect(G.dovizSecilebilirMi(G.DAVRANIS.SGK)).toBe(false);
    expect(G.dovizSecilebilirMi(G.DAVRANIS.PERSONEL)).toBe(false);
  });
  it("AC-12 / AC-44 / R7/2: ödeme almış kalemde para birimi ve kur kilitli; ödeme silinince (çöpteki saymaz) yeniden açılır", () => {
    const k = kalem();
    const o = { id: 1, tur: "odeme", tarih: "2026-09-20", tutar: 20000, giderId: 801, taksitId: null, dovizTutar: 500, kur: 40, paraBirimi: "USD" };
    expect(G.kalemOdemeAlmisMi(zengin(k, [o]))).toBe(true);
    expect(G.kalemOdemeAlmisMi(zengin(k, []))).toBe(false);
    const tk = kalem({ taksitSayisi: 2, sonOdemeTarihi: "2026-10-01" });
    const to = { ...o, taksitId: tk.taksitler[0].id, tutar: 24000, dovizTutar: 600 };
    expect(G.kalemOdemeAlmisMi(zengin(tk, [to]))).toBe(true);
    expect(G.kalemOdemeAlmisMi(zengin(tk, []))).toBe(false);
    const kilit = { paraBirimi: "USD", kur: 40 };
    expect(hata(dogrula({ ...k, tutar: "1.200", kur: "41" }, { kilit }), "kur")).toBe(G.DOVIZ_KILIT_NEDENI);
    expect(hata(dogrula({ ...k, tutar: "1.200", paraBirimi: "TRY" }, { kilit }), "paraBirimi")).toBe(G.DOVIZ_KILIT_NEDENI);
    expect(dogrula({ ...k, tutar: "1.300", kur: "40" }, { kilit }).kayit.tutar).toBe(52000); // tutar kilitli değil
  });
});

describe("Spec 0153: ödeme", () => {
  it("AC-45 / AC-20 / R13/2, R15: satırın tutarı dövizdir, lira kalemin donmuş kurundan; kalan 700 USD; hesap 500 USD azalır", () => {
    const k = kalem();
    const r = odeme(k, { tutar: "500", hesapId: 53 });
    expect(r.kayit).toMatchObject({ tutar: 20000, dovizTutar: 500, kur: 40, paraBirimi: "USD", hesapId: 53, giderId: 801 });
    const z = zengin(k, [{ ...r.kayit, id: 1 }]);
    expect(formOdemeHedefleri(z, turMap)[0]).toMatchObject({ paraBirimi: "USD", dovizKalanK: 70000, kalanK: 2800000 });
    const b = (l) => K.hesapBakiyeleri(HESAPLAR, l, {}).get("53").bakiyeK;
    expect(b([{ ...r.kayit, id: 1 }])).toBe(b([]) - 50000); // AC-29 / AC-51 çaprazı (0152'nin okuyucusu)
  });
  it("AC-21 / AC-49 / R16/2: kalanı dövizde tam kapatan ödeme lira kalanını da sıfırlar; garip kurda kuruş artığı kalmaz", () => {
    const k = kalem({ tutar: "1.000", kur: "35,4787" });
    const l = [];
    for (const t of ["333,33", "333,33"]) l.push({ ...odeme(k, { tutar: t, hesapId: "" }, l).kayit, id: l.length + 1 });
    const kalanD = formOdemeHedefleri(zengin(k, l), turMap)[0].dovizKalanK;
    const son = odeme(k, { tutar: String(kalanD / 100).replace(".", ","), hesapId: "" }, l);
    expect(son.kayit).toBeTruthy();
    l.push({ ...son.kayit, id: 9 });
    expect(G.odemeHedefKalaniK(zengin(k, l), G.DAVRANIS.NORMAL)).toBe(0);
    expect(zengin(k, l).odendi).toBe(true);
  });
  it("AC-21 / AC-49 / triyaj: kısmi ödeme dövizde sıfıra inen lira artığı bırakmaz (4.791,85 USD, kur 38,2421, KDV %10; 5.271,03 $ ödenince kalem kapanır)", () => {
    const k = kalem({ tutar: "4.791,85", kur: "38,2421", kdvOrani: 10 });
    expect(formOdemeHedefleri(zengin(k), turMap)[0].dovizKalanK).toBe(527104);
    const r = odeme(k, { tutar: "5.271,03", hesapId: "" });
    expect(r.kayit).toBeTruthy();
    const z = zengin(k, [{ ...r.kayit, id: 1 }]);
    expect(G.odemeHedefKalaniK(z, G.DAVRANIS.NORMAL)).toBe(0);
    expect(z.odendi).toBe(true);
    // Aynı kural iki satırlı grup kırpmasında: toplam 5.271,03 $ lira kalanı da kapatır.
    const v = K.cokluOdemeDogrula({ tarih: "2026-09-20", satirlar: [{ tutar: "3.000" }, { tutar: "2.271,03" }] }, { kalem: zengin(k), turMap, hesaplar: HESAPLAR });
    expect(v.kayitlar.reduce((a, x) => a + G.kurus(x.tutar), 0)).toBe(G.kurus(G.odenecekTutar(k)));
  });
  it("AC-22: kalanından fazla döviz ödeme reddedilir ve hata kalemin para biriminde kalanı yazar", () => {
    const r = odeme(kalem(), { tutar: "1.200,01", hesapId: 53 });
    expect(r.kayit).toBeNull();
    expect(r.hatalar.tutar).toBe(`Kalandan fazla ödeme kaydedilemez (kalan ${KUR.paraMetni(1200, "USD")}).`);
  });
  it("AC-23 / AC-47 / R14/2: hesapsız döviz ödeme kalemi kapatır, üç alanı taşır, hiçbir bakiyeye girmez ve hesapsız listede", () => {
    const k = kalem();
    const r = odeme(k, { tutar: "1.200", hesapId: "" });
    expect(r.kayit).toMatchObject({ hesapId: null, dovizTutar: 1200, kur: 40, paraBirimi: "USD", tutar: 48000 });
    expect(zengin(k, [{ ...r.kayit, id: 1 }]).odendi).toBe(true);
    const once = [...K.hesapBakiyeleri(HESAPLAR, [], {}).values()].map(x => x.bakiyeK);
    expect([...K.hesapBakiyeleri(HESAPLAR, [{ ...r.kayit, id: 1 }], {}).values()].map(x => x.bakiyeK)).toEqual(once);
    expect(K.hesapsizOdemeler([{ ...r.kayit, id: 1 }], { bas: "2026-09-01", bit: "2026-09-30" }).liste.map(m => m.id)).toEqual([1]);
  });
  it("AC-48 / R14: döviz kalem yalnız kendi para birimindeki hesaptan; TL ya da başka döviz hesap nedenle reddedilir", () => {
    const k = kalem();
    expect(odeme(k, { tutar: "100", hesapId: 51 }).hatalar.hesapId).toBe(K.DOVIZ_KALEM_HESAP_NEDENI);
    expect(odeme(k, { tutar: "100", hesapId: 56 }).hatalar.hesapId).toBe(K.DOVIZ_KALEM_HESAP_NEDENI);
    expect(odeme(k, { tutar: "100", hesapId: 53 }).kayit).toBeTruthy();
  });
  it("AC-45 (TL yarısı) / R14/3: TL kalemin ödemesi 0152'deki gibi lira girilir; döviz hesap seçilince kur elle sorulur", () => {
    const tl = dogrula({ id: 803, tutar: "1.000", kdvOrani: 0 }).kayit;
    const r = K.odemeDogrula({ tarih: "2026-09-20", tutar: "400", hesapId: 53 }, { kalem: zengin(tl), turMap, hesaplar: HESAPLAR });
    expect(r.hatalar.kur).toBe(KUR.KUR_BOS_HATASI);
    const r2 = K.odemeDogrula({ tarih: "2026-09-20", tutar: "400", hesapId: 53, kur: "40" }, { kalem: zengin(tl), turMap, hesaplar: HESAPLAR });
    expect(r2.kayit).toMatchObject({ tutar: 400, dovizTutar: 10, kur: 40, paraBirimi: "USD" });
    expect(formOdemeHedefleri(zengin(tl), turMap)[0]).not.toHaveProperty("paraBirimi");
  });
  it("AC-24 / AC-50 / R18/2: döviz kalem çek adayı değildir; çok kaleme dağıtım ve çek yöntemli satır nedenle reddedilir", () => {
    const k = zengin(kalem());
    expect(ciroAdaylari([k], { tur: "tedarikci", id: 11 }, turMap)).toEqual([]);
    const ck = K.cokKalemOdemeleri({ satirlar: [{ anahtar: "a", tutarK: 100 }], adaylar: [{ anahtar: "a", kalem: k, taksitId: null }], tarih: "2026-09-20", hesapId: null, hesaplar: HESAPLAR, yontem: "Çek (ciro)", aciklama: "", turMap, bayrak: { ciro: true } });
    expect(ck.hatalar).toEqual([K.DOVIZ_KALEM_CEK_NEDENI]);
    expect(odeme(kalem(), { tutar: "100", hesapId: "", yontem: "Çek (kendi)" }).hatalar.yontem).toBe(K.DOVIZ_KALEM_CEK_NEDENI);
    const g = odemeGirisiHazirla(k, { turMap, tarih: "2026-09-20", satirlar: [{ anahtar: "a", hedef: "ana", tutar: "100", yontem: "Çek (ciro)", cekId: 1 }], hesaplar: HESAPLAR, hareketler: [], giderler: [] });
    expect(g.hatalar.satirlar.a.cek).toBe(K.DOVIZ_KALEM_CEK_NEDENI);
  });
  it("AC-25 / AC-53 / R21/2: döviz kaleme avans mahsubu bugünkü ret metniyle engellenir", () => {
    const r = K.mahsupDogrula({ tarih: "2026-09-20", tutar: "100" }, { kalem: zengin(kalem()), turMap, hareketler: [], giderler: [] });
    expect(r.hatalar.hedef).toBe("Avans yalnız personel kalemine mahsup edilir.");
  });
  it("AC-26 / AC-52 / R20/2: üç taksitli 1.200 USD kalemin taksitleri 400 USD; bir taksidin dövizle ödenmesi onu kapatır; garip kurda son taksit de kapanır", () => {
    const k = kalem({ taksitSayisi: 3, sonOdemeTarihi: "2026-10-01" });
    const h = formOdemeHedefleri(zengin(k), turMap)[0];
    expect(h.acikTaksitler.map(t => t.dovizKalanK)).toEqual([40000, 40000, 40000]);
    const t1 = h.acikTaksitler[0].id;
    const r = odeme(k, { tutar: "400", taksitId: t1, hesapId: 53 });
    expect(r.kayit).toMatchObject({ tutar: 16000, taksitId: t1 });
    expect(zengin(k, [{ ...r.kayit, id: 1 }]).taksitler.find(x => x.id === t1)._odenenK).toBe(1600000);
    // Garip kur: plan lirada bölünür, döviz türetilir; her taksit kendi döviz kalanıyla tam kapanır.
    const g = kalem({ tutar: "1.000", kur: "35,4787", taksitSayisi: 3, sonOdemeTarihi: "2026-10-01" });
    const l = [];
    for (const t of formOdemeHedefleri(zengin(g), turMap)[0].acikTaksitler) {
      const x = odeme(g, { tutar: String(t.dovizKalanK / 100).replace(".", ","), taksitId: t.id, hesapId: "" }, l);
      l.push({ ...x.kayit, id: l.length + 1 });
    }
    expect(zengin(g, l).odendi).toBe(true);
  });
  it("R16/3 (plan P3): çok satırlı ödemede döviz toplamı kalana eşitse son satır lira kalanı kapatır (300 + 400 = 700, garip kur)", () => {
    const k = kalem({ tutar: "700", kur: "35,4787" });
    const v = K.cokluOdemeDogrula({ tarih: "2026-09-20", satirlar: [{ tutar: "300", hesapId: 53 }, { tutar: "400", hesapId: "" }] }, { kalem: zengin(k), turMap, hesaplar: HESAPLAR });
    expect(v.kayitlar.reduce((a, x) => a + G.kurus(x.tutar), 0)).toBe(G.kurus(k.tutar));
    expect(v.kayitlar.map(x => x.dovizTutar)).toEqual([300, 400]);
    // İki satırın ayrı ayrı yuvarlanan lirası (36 + 36) kalemin lirasını (71) aşar; grup kırpması son satırı 35'e indirir.
    const kk = kalem({ tutar: "0,02", kur: "35,5" });
    const v2 = K.cokluOdemeDogrula({ tarih: "2026-09-20", satirlar: [{ tutar: "0,01" }, { tutar: "0,01" }] }, { kalem: zengin(kk), turMap, hesaplar: HESAPLAR });
    expect(v2.kayitlar.map(x => G.kurus(x.tutar))).toEqual([36, 35]);
    const fazla = K.cokluOdemeDogrula({ tarih: "2026-09-20", satirlar: [{ tutar: "300" }, { tutar: "400,01" }] }, { kalem: zengin(k), turMap, hesaplar: HESAPLAR });
    expect(fazla.kayitlar).toBeNull();
  });
  it("AC-46 / R13/3: 'Hepsini ödendi işaretle' döviz kalemde kalemin para birimindeki kalanla doldurur; öneri kuru ve uyumsuz hesap girmez", () => {
    const hs = formOdemeHedefleri(zengin(kalem()), turMap);
    const [r] = hepsiniOde([], hs, { yontem: "Havale", hesapId: 51, yeniAnahtar: () => "a", hesaplar: HESAPLAR, kurOner: () => ({ deger: 45 }) });
    expect(r).toMatchObject({ tutar: "1200", hesapId: "" });
    expect(r).not.toHaveProperty("kur");
    const [r2] = hepsiniOde([], hs, { yontem: "Havale", hesapId: 51, yeniAnahtar: () => "a", hesaplar: HESAPLAR, hesapIdOf: () => 53 });
    expect(r2.hesapId).toBe(53);
  });
  it("R14/4 (plan P1): tevkifatlı döviz kalemin tevkifat hedefi lira kalır (TL hesaptan lira tutarla)", () => {
    const k = kalem({ kdvOrani: 20, tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10 });
    const tv = k.taksitler.find(t => t.hedef === G.HEDEF.TEVKIFAT);
    expect(G.hedefDovizKipi(k, tv.id)).toBeNull();
    const r = odeme(k, { tutar: String(tv.tutar).replace(".", ","), taksitId: tv.id, hesapId: 51 });
    expect(r.kayit).toMatchObject({ tutar: tv.tutar, hesapId: 51 });
    expect(r.kayit).not.toHaveProperty("dovizTutar");
    const hs = formOdemeHedefleri(zengin(k), turMap);
    expect(hs.find(h => h.hedef === G.HEDEF.TEVKIFAT)).not.toHaveProperty("paraBirimi");
    expect(hs.find(h => h.hedef === G.HEDEF.ANA).paraBirimi).toBe("USD");
  });
  it("P6: döviz kalemin ön seçili hesabı kalemin para birimindeki son hesap; parametresiz çağrı TL davranışı", () => {
    const l = [...H, { id: 900, tur: "odeme", tarih: "2026-09-29", tutar: 1, hesapId: 53, giderId: 1 }];
    expect(K.sonKullanilanHesap(l, HESAPLAR, "USD")).toBe(53);
    expect(K.sonKullanilanHesap(l, HESAPLAR, "EUR")).toBeNull();
    expect(K.sonKullanilanHesap(H, HESAPLAR)).toBe(K.sonKullanilanHesap(H, HESAPLAR, "TRY"));
  });
  it("triyaj: çöpten geri alınan döviz ödemenin doğrulaması kendi döviz tutarıyla yapılır", () => {
    const k = kalem();
    const o = { ...odeme(k, { tutar: "1.200", hesapId: 53 }).kayit, id: 5, deletedAt: "2026-09-21" };
    expect(K.copHareketGeriAlmaNedeni(o, { giderler: [k], hareketler: [o], turMap })).toBeNull();
  });
});

describe("Spec 0153: liste, rapor, arama, iz", () => {
  const k = () => kalem({ kdvOrani: 0 });
  it("AC-27 / AC-57 / R22/2: borç özetinin tedarikçi satırı lira toplar ve döviz kalemleri taşır; açık kalemler satırı kalemin para biriminde; TL satırlarda anahtar yok", () => {
    const z = [zengin(k()), ...G.odemeleriUygula(GIDERLER, H, turMap)];
    const b = G.borcOzeti(z, { turler, tedarikciler, yururlukAy: "2026-01" }, "2026-09-30");
    const s = b.satirlar.find(x => x.tedarikciId === 11);
    expect(s.dovizKalemleri).toEqual([expect.objectContaining({ kalemId: 801, dovizKalanK: 120000, metin: KUR.paraMetni(1200, "USD") })]);
    expect(b.satirlar.filter(x => x.tedarikciId !== 11).every(x => !("dovizKalemleri" in x))).toBe(true);
    const a = acikKalemler(z, { turler, tedarikciler, yururlukAy: "2026-01" }, "2026-09-30");
    expect(a.satirlar.find(x => x.kalemId === 801)).toMatchObject({ dovizMetni: KUR.paraMetni(1200, "USD"), kalanK: 4800000 });
    expect(a.satirlar.filter(x => x.kalemId !== 801).every(x => !("dovizMetni" in x))).toBe(true);
  });
  it("AC-16 / AC-55 / R9/2: raporun kalem satırı döviz tutarı, kuru ve lirayı tek hücrede taşır; sütun sayısı değişmez", () => {
    const g = girdi();
    const veri = { ...g, giderler: [...g.giderler, k()] };
    const html = buildGiderKasaRaporuHtml(giderKasaRaporu(veri, "2026-09"));
    // Kalem iki tabloda: tedarikçinin bu ayın kalemleri (5 sütun) ve KALEMLER (6 sütun); ikisinde de tek hücre, sütun sayısı aynı.
    const satirlar = html.split("<tr").filter(x => x.includes("İthal rulman"));
    expect(satirlar.map(x => (x.match(/<td/g) || []).length).sort()).toEqual([5, 6]);
    for (const satir of satirlar) { expect(satir).toContain("kur 40"); expect(satir).toContain(fmtCur(1200, "USD")); expect(satir).toContain(fmtCur(48000, "TRY")); }
  });
  it("AC-30 / AC-56 / R12/2: faturanın kendi rakamı (1.200) ve lira karşılığı (48.000) döviz kalemi bulur; neden para birimiyle", () => {
    const tedMap = new Map(tedarikciler.map(t => [String(t.id), t]));
    const z = zengin(k());
    expect(kalemEslesmesi(z, aramaSorgusu("1.200"), { turMap, tedMap }).neden).toBe(`tutar: ${KUR.paraMetni(1200, "USD")}`);
    expect(kalemEslesmesi(z, aramaSorgusu("48.000"), { turMap, tedMap }).neden).toContain(`(${KUR.paraMetni(1200, "USD")})`);
    expect(kalemMeta(z, { turMap, tedMap }).at(-1)).toContain(KUR.paraMetni(1200, "USD"));
  });
  it("AC-31 / AC-58 / R24/2: iz ayrıntısı döviz kalemde para birimi, döviz tutar ve kur; TL kalemde boş", () => {
    expect(G.dovizKalemIzAyrintisi(k())).toEqual({ paraBirimi: "USD", dovizTutar: 1200, kur: 40 });
    expect(G.dovizKalemIzAyrintisi(GIDERLER[0])).toEqual({});
  });
});

describe("Spec 0153: kaynak taramaları", () => {
  it("AC-38 / C9/2: kur ilkelleri yaprak modülde; gider motoru 0152'nin modülünü içe almaz; kur.js yalnız sabitleri alır", () => {
    const gider = yorumsuz("src/lib/gider.js");
    expect(gider).toMatch(/from "\.\/kur"/);
    expect(gider).not.toMatch(/from "\.\/doviz"/);
    const kur = yorumsuz("src/lib/kur.js");
    expect([...kur.matchAll(/from "([^"]+)"/g)].map(m => m[1])).toEqual(["./constants"]);
    expect(yorumsuz("src/lib/doviz.js")).toMatch(/from "\.\/kur"/);
  });
  it("AC-34 / R4/2 / DoD: lira karşılığının çarpımı tek yerde (dovizdenLiraK); ekranlar kur çarpımı ya da bölümü yazmaz", () => {
    const tanim = dosyalar("src").filter(f => /export const dovizdenLiraK/.test(yorumsuz(f)));
    expect(tanim).toEqual([path.join("src", "lib", "gider.js")]);
    for (const f of dosyalar("src/components")) {
      const s = yorumsuz(f);
      expect(s, f).not.toMatch(/\bkur\b\s*[*/]|[*/]\s*\bkur\b|\.kur\s*[*/]|[*/]\s*\w+\.kur\b/);
      expect(s, f).not.toMatch(/\b(karsiKurusu|dovizKurusu)\(/);
    }
  });
  it("AC-39 / C9/3: kalemin para birimi tek yardımcıdan; ekran dosyalarında kalemin `paraBirimi` alanı doğrudan okunmaz", () => {
    for (const f of dosyalar("src/components")) expect(yorumsuz(f), f).not.toMatch(/\b(k|kalem|kk|kayit)\.paraBirimi\b/);
    expect(yorumsuz("src/lib/gider.js").match(/export const kalemParaBirimi/g)).toHaveLength(1);
  });
  it("C4: yeni izin, hareket türü ve veri bölümü yok; sunucu kuralı değişmedi", () => {
    const sa = fs.readFileSync("electron/serverAuth.cjs", "utf8");
    expect(sa).not.toMatch(/paraBirimi|dovizTutar|0153/);
    expect(yorumsuz("src/lib/gider.js")).not.toMatch(/tur: "doviz/);
  });
});
