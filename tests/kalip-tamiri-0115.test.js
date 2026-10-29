// Spec 0115: kalıp tamiri saf motoru (src/lib/kalipTamiri.js), göç planı (electron/kalipTamiriGocuSaf.mjs) ve kaynak taramaları.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as KT from "../src/lib/kalipTamiri";
import { kalipAdDeseni, kalipTamiriGocPlani, GOC_TIP_ADI, PALET_ANAHTARLARI } from "../electron/kalipTamiriGocuSaf.mjs";
import { PART_TYPE_PALETTE_KEYS } from "../src/lib/constants";
import { uretimFormHaritasi } from "../src/lib/musteriDurumu";
import { emptyRow } from "../src/components/stock/uretimFormModel";
import { PART_TYPES, PARTS, CUSTOMERS, SERVICES } from "./fixtures/0115-veri";

const kok = path.resolve(__dirname, "..");
const oku = (f) => fs.readFileSync(path.join(kok, f), "utf8");
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const dosyalar = (dir) => fs.readdirSync(path.join(kok, dir), { withFileTypes: true }).flatMap(e => {
  const f = path.join(dir, e.name);
  if (e.isDirectory()) return f.startsWith(path.join("src", "lib", "map")) ? [] : dosyalar(f);
  return /\.(jsx?|mjs|cjs)$/.test(e.name) ? [f] : [];
});

const TIP = { id: "tip_1", ad: "Kalıp Revize", renk: "blu", makinaSecici: false, stokDus: false, raporGoster: false, kalipIsi: true, sistem: false };
const TIPLER = [...PART_TYPES, TIP];
const parca = (o) => ({ id: 1, ad: "100_ERKEK KALIPLAR REVİZE", tip: "Kalıp Revize", ...o });

describe("Spec 0115 dedektör (R1–R3/2)", () => {
  it("AC-2: bayrak işaretli tipe atanmış parça kalıp işi sayılır", () => {
    expect(KT.parcaKalipIsiMi(parca(), TIPLER)).toBe(true);
  });
  it("AC-3: bayrak işaretsiz tipe atanmış, adında KALIP REVİZE geçen parça kalıp işi sayılmaz", () => {
    expect(KT.parcaKalipIsiMi(parca({ tip: "Standart" }), TIPLER)).toBe(false);
    expect(KT.parcaKalipIsiMi(parca({ tip: "" }), TIPLER)).toBe(false); // boş tip Standart
  });
  it("AC-4: iki ayrı kullanıcı tipi aynı bayrağı taşıyabilir; çöpteki ya da listede olmayan tip kalıp işi değildir (Karar 33)", () => {
    const iki = [...TIPLER, { ...TIP, id: "tip_2", ad: "Kalıp Yeni Yapım" }];
    expect(KT.parcaKalipIsiMi(parca({ tip: "Kalıp Yeni Yapım" }), iki)).toBe(true);
    expect(KT.parcaKalipIsiMi(parca(), [...PART_TYPES, { ...TIP, deletedAt: "2026-10-01" }])).toBe(false);
    expect(KT.parcaKalipIsiMi(parca({ tip: "Yok" }), TIPLER)).toBe(false);
    expect(KT.parcaKalipIsiMi(parca(), null)).toBe(false);
  });
  it("R11, R13: kalıp işi kalemleri adı bütün taşır, ölçü boş; miktar girişi çoğaltmaz (Karar 51)", () => {
    const parts = PARTS.map(p => (p.id === 81 ? { ...p, tip: "Kalıp Revize" } : p));
    const k = KT.kalipIsiKalemleri([...SERVICES[0].degisenParcalar, { partId: "81", ad: "x", miktar: 3 }], parts, TIPLER);
    expect(k).toEqual([{ ad: "100_ERKEK KALIPLAR REVİZE", olcu: "" }, { ad: "100_ERKEK KALIPLAR REVİZE", olcu: "" }]);
    expect(KT.kalipIsiKalemleri(SERVICES[1].degisenParcalar, parts, TIPLER)).toEqual([]); // KALIP MİLİ Standart
    expect(KT.kalipIsiKalemleri(SERVICES[0].degisenParcalar, parts, null)).toEqual([]); // R11/2: prop yoksa öneri yok
  });
});

describe("Spec 0115 servis kaydı (R7–R9, R14, Karar 52)", () => {
  it("AC-23, AC-25: işaret listeden türer; kutu kapalıysa liste ve geçici alanlar kayıttan silinir", () => {
    expect(KT.kalipAtolyedeMi({})).toBe(false);
    expect(KT.kalipAtolyedeMi({ atolyeKaliplari: [{ id: 1, ad: "A", olcu: "" }] })).toBe(true);
    const form = { id: 41, atolyeKaliplari: [{ ad: "A", olcu: "" }], _kalipAtolye: false, _tamirHatalari: {} };
    const kayit = KT.tamirYaz(form, KT.tamirListesiKur(form, () => 99));
    expect(kayit).toEqual({ id: 41 });
  });
  it("AC-75: kimlikler kurucuda verilir; kimliği olan giriş korunur, yenisi yeniId alır, değerler kırpılır", () => {
    let n = 500;
    const form = { _kalipAtolye: true, atolyeKaliplari: [{ id: 7, ad: " A ", olcu: " 1 " }, { _anahtar: "y1", ad: "B", olcu: "" }] };
    const liste = KT.tamirListesiKur(form, () => ++n);
    expect(liste).toEqual([{ id: 7, ad: "A", olcu: "1" }, { id: 501, ad: "B", olcu: "" }]);
    expect(KT.tamirYaz({ x: 1, _kalipAtolye: true }, liste)).toEqual({ x: 1, atolyeKaliplari: liste });
  });
  it("AC-24, AC-88: açık kutu ve boş liste reddedilir; yinelenen kalıp ve boş ölçü serbest; boş ad satır hatası", () => {
    expect(KT.tamirDogrula({ _kalipAtolye: true, atolyeKaliplari: [] })).toMatchObject({ gecerli: false, hata: KT.TAMIR_BOS_HATASI });
    expect(KT.tamirDogrula({ _kalipAtolye: true, atolyeKaliplari: [{ _anahtar: "a", ad: "A", olcu: "" }, { _anahtar: "b", ad: "A", olcu: "" }] }).gecerli).toBe(true);
    const d = KT.tamirDogrula({ _kalipAtolye: true, atolyeKaliplari: [{ _anahtar: "a", ad: "A" }, { _anahtar: "b", ad: "  " }] });
    expect(d.gecerli).toBe(false);
    expect(d.satirHatalari).toEqual({ b: KT.TAMIR_AD_HATASI });
    expect(KT.tamirDogrula({ _kalipAtolye: false, atolyeKaliplari: [] }).gecerli).toBe(true);
    expect(KT.tamirDogrula({}).gecerli).toBe(true);
  });
  it("Karar 51: kayıtlı kalıp kutusu ad + ölçü ile eşlenir; işaretlemek ekler, kaldırmak ilk eşleşeni çıkarır", () => {
    const k = { ad: "HAMBURGER", olcu: "Ø98" };
    let l = KT.kayitliDegistir([], k, "y1");
    expect(KT.kayitliSeciliMi(l, k)).toBe(true);
    l = [...l, { _anahtar: "y2", ad: "HAMBURGER", olcu: "Ø98" }];
    l = KT.kayitliDegistir(l, k, "y3");
    expect(l).toEqual([{ _anahtar: "y2", ad: "HAMBURGER", olcu: "Ø98" }]);
  });
});

describe("Spec 0115 üretim formu haritası ve rozet (R17/2, R18, R20/2, R25/2)", () => {
  const sv = { id: 41, customerId: 1, date: "2026-10-12", atolyeKaliplari: [{ id: 1, ad: "A", olcu: "" }, { id: 2, ad: "B", olcu: "x" }, { id: 3, ad: "C", olcu: "" }] };
  const satir = (kalipId, tamamlandi = false) => KT.tamirSatiriKur({ ...emptyRow(), id: 900 + kalipId }, sv, sv.atolyeKaliplari.find(g => g.id === kalipId), CUSTOMERS[0]);
  it("AC-74: adlar sabittir (bayrak, alan, kaynak türü, satır alanları)", () => {
    const r = satir(1);
    expect(r).toMatchObject({ tur: "tamir", kaynakTip: "servis_tamir", kaynakId: 41, kaynakKalipId: 1, kalipIdx: null, servisTarihi: "2026-10-12",
      kalipAdi: "A", musteriId: 1, musteriAdi: "Anadolu Köfte", makinaKodu: "AK100" });
    expect(emptyRow()).toMatchObject({ tur: "uretim", kaynakKalipId: null, servisTarihi: "" });
    for (const ad of ["parcaKalipIsiMi", "kalipAdDeseni", "tamirListesi", "kalipAtolyedeMi", "tamirAnahtari", "tamirSatirHaritasi", "bekleyenTamirler", "tamirOzeti", "tamirYaz"]) {
      expect(typeof KT[ad], ad).toBe("function");
    }
    expect(KT.tamirAnahtari(41, 2)).toBe("servis_tamir:41:2");
    expect(KT.TAMIR_KAYNAK_TIPI).toBe("servis_tamir");
  });
  it("AC-78: tamir satırı kalıp durumu haritasına girmez (C1 mekanizması)", () => {
    const h = uretimFormHaritasi([{ id: 31, satirlar: [satir(1)] }]);
    expect(h.get("31").size).toBe(0);
  });
  it("AC-91, AC-44, AC-45: biten = canlı formda tamamlandı satırı; satırı olmayan giriş bitmemiştir; metin tek sabitten", () => {
    const formlar = [{ id: 31, satirlar: [{ ...satir(1), tamamlandi: true }, satir(2)] }, { id: 32, deletedAt: "2026-10-01", satirlar: [{ ...satir(3), tamamlandi: true }] }];
    const oz = KT.tamirOzeti(sv, KT.tamirSatirHaritasi(formlar));
    expect(oz).toEqual({ toplam: 3, biten: 1, bitmemis: 2, formaGirmemis: 1 });
    expect(KT.tamirRozetMetni(oz)).toBe("KALIP ATÖLYEDE 2/3");
    const hepsi = [{ id: 31, satirlar: [1, 2, 3].map(i => ({ ...satir(i), tamamlandi: true })) }];
    expect(KT.tamirOzeti(sv, KT.tamirSatirHaritasi(hepsi)).bitmemis).toBe(0);
  });
  it("AC-30, AC-31, AC-36, AC-37: bekleyen = hiçbir canlı formda satırı olmayan; tarih süzgeci yok; çöpteki form sayılmaz", () => {
    const eski = { ...sv, id: 50, date: "2014-01-01" };
    const formlar = [{ id: 31, satirlar: [satir(1)] }];
    const b = KT.bekleyenTamirler([sv, eski, { ...sv, id: 60, deletedAt: "x" }], KT.tamirSatirHaritasi(formlar));
    expect(b.map(x => `${x.servis.id}:${x.giris.id}`)).toEqual(["41:2", "41:3", "50:1", "50:2", "50:3"]);
    const copte = [{ ...formlar[0], deletedAt: "2026-10-02" }];
    expect(KT.bekleyenTamirler([sv], KT.tamirSatirHaritasi(copte))).toHaveLength(3);
  });
  it("AC-50, AC-94: düğmenin yazımı servisin bütün formlarındaki var olan satırlarını işaretler, başka satıra dokunmaz", () => {
    const formlar = [
      { id: 31, satirlar: [satir(1), { ...emptyRow(), id: 1, kalipAdi: "X" }] },
      { id: 32, satirlar: [satir(2)] },
      { id: 33, satirlar: [{ ...emptyRow(), id: 2 }] },
    ];
    expect(KT.tamirFormIdleri(sv, KT.tamirSatirHaritasi(formlar)).sort()).toEqual([31, 32]);
    const yeni = KT.tamirlariTamamla(formlar, sv);
    expect(yeni[0].satirlar.map(r => r.tamamlandi)).toEqual([true, false]);
    expect(yeni[1].satirlar[0].tamamlandi).toBe(true);
    expect(yeni[2]).toBe(formlar[2]);
  });
  it("Karar 48: kaynak metni servisten canlı okunur; servis çöpte ya da yoksa ibare", () => {
    const r = satir(1);
    expect(KT.tamirKaynakMetni(r, [sv])).toMatch(/^Servis · /);
    expect(KT.tamirKaynakMetni(r, [{ ...sv, deletedAt: "x" }])).toBe(KT.KAYNAK_YOK);
    expect(KT.tamirKaynakMetni(r, [])).toBe(KT.KAYNAK_YOK);
    // R15/2 (AC-89): giriş listeden çıkarılınca satır kaynağını kaybeder
    expect(KT.tamirKaynakMetni(r, [{ ...sv, atolyeKaliplari: sv.atolyeKaliplari.filter(g => g.id !== 1) }])).toBe(KT.KAYNAK_YOK);
  });
});

describe("Spec 0115 göç planı (R4–R4/3, Karar 49)", () => {
  const P = [
    { id: 1, ad: "100_ERKEK KALIPLAR REVİZE", tip: "Standart" },
    { id: 2, ad: "44*80 dişi kalıplar revize", tip: "" },
    { id: 3, ad: "KALIP MİLİ REVİZE", tip: "Standart" },
    { id: 4, ad: "KALIP RULMANI REVİZE" },
    { id: 5, ad: "Kalıp yatağı revize" },
    { id: 6, ad: "KAZAN REVİZE" },
    { id: 7, ad: "KARIŞTIRICI REVİZE" },
    { id: 8, ad: "ERKEK KALIP REVİZE", tip: "Bant" },
    { id: 9, ad: "DİŞİ KALIP REVİZE", deletedAt: "2026-01-01" },
    { id: 10, ad: "x", adEN: "MOLD KALIP REVİZE", kod: "KALIP REVİZE", tanim: "KALIP REVİZE" },
  ];
  it("AC-5, AC-84: KALIP ve REVİZE birlikte, Türkçe katlamayla; yalnız ad okunur", () => {
    const p = kalipTamiriGocPlani(PART_TYPES, P, { simdi: 1000 });
    expect(p.parcalar).toEqual([1, 2]);
    expect(kalipAdDeseni("kalıp revize")).toBe(true);
    expect(kalipAdDeseni("KALIP REVİZE")).toBe(true);
  });
  it("AC-6, AC-7: kalıp mili / rulmanı / yatağı ve kalıp dışı revize kalemleri dışarıda", () => {
    for (const ad of ["KALIP MİLİ REVİZE", "kalıp rulmanı revize", "KALIP YATAĞI REVİZE", "KAZAN REVİZE", "KARIŞTIRICI REVİZE"]) expect(kalipAdDeseni(ad), ad).toBe(false);
  });
  it("AC-85: çöpteki parçaya ve tipi Standart olmayan parçaya dokunulmaz", () => {
    const p = kalipTamiriGocPlani(PART_TYPES, P, { simdi: 1000 });
    expect(p.parcalar).not.toContain(8);
    expect(p.parcalar).not.toContain(9);
  });
  it("AC-82: tip listesi yoksa ya da boşsa hiçbir şey yazılmaz (bayrak da)", () => {
    expect(kalipTamiriGocPlani(null, P)).toEqual({ yaz: false });
    expect(kalipTamiriGocPlani([], P)).toEqual({ yaz: false });
  });
  it("AC-83: yeni tip listenin sonuna eklenir, var olan tipler aynen; kullanıcı tipi, paletin sıradaki rengi, yalnız kalipIsi", () => {
    const eski = [...PART_TYPES, { id: "tip_9", ad: "Motor", renk: "blu", sistem: false }];
    const p = kalipTamiriGocPlani(eski, P, { simdi: 1234 });
    expect(p.tipler.slice(0, eski.length)).toEqual(eski);
    expect(p.tipler.at(-1)).toEqual({ id: "tip_1234", ad: GOC_TIP_ADI, renk: "grn", makinaSecici: false, stokDus: false, raporGoster: false, kalipIsi: true, sistem: false });
  });
  it("Karar 49: aynı adda tip varsa (Türkçe katlama) tip yazılmaz, parça taşınmaz, yalnız bayrak", () => {
    expect(kalipTamiriGocPlani([...PART_TYPES, { id: "t", ad: "KALIP REVİZE" }], P)).toEqual({ yaz: true, tipler: null, parcalar: [] });
  });
  it("Karar 49: palet anahtarları constants.js ile birebir aynı", () => {
    expect(PALET_ANAHTARLARI).toEqual(PART_TYPE_PALETTE_KEYS);
  });
});

describe("Spec 0115 kaynak taramaları", () => {
  const src = dosyalar("src");
  it("AC-10, AC-86 (C8, C14): ad deseni yalnız electron/kalipTamiriGocuSaf.mjs'te; ekranlar ad metninde kalıp araması yazmaz", () => {
    const desen = /rev\[[iı]|\b[Rr]evize\b|REVİZE|kal\[[ıi]/;
    const bulunan = [...src, "electron/db.cjs"].filter(f => desen.test(yorumsuz(oku(f))));
    expect(bulunan).toEqual([]);
    expect(yorumsuz(oku("electron/kalipTamiriGocuSaf.mjs"))).toMatch(/rev\[iı\]ze/);
    const arama = /(includes|indexOf|startsWith|test|match)\(\s*["'`/][^)]*kal[ıi]p/i;
    expect(src.filter(f => arama.test(yorumsuz(oku(f))))).toEqual([]);
    expect(oku("src/lib/kalipTamiri.js")).toMatch(/import \{ kalipAdDeseni \} from "\.\.\/\.\.\/electron\/kalipTamiriGocuSaf\.mjs"/);
    expect(oku("src/components/PartManager.jsx")).toMatch(/kalipAdDeseni\(kayit\?\.ad\)/);
  });
  it("C3: tek dedektör ve tek yazıcı; iki kurucu aynı üç adımı çağırır", () => {
    // Kayda yazan tek yer tamirYaz (kalipTamiri.js); formun geçici durumunu yalnız servis formunun kalıp bölümü düzenler.
    const yazici = src.filter(f => /atolyeKaliplari\s*:/.test(yorumsuz(oku(f)))).sort();
    expect(yazici).toEqual([path.join("src", "components", "KalipAtolyeAlani.jsx"), path.join("src", "lib", "kalipTamiri.js")]);
    // Bayrağı okuyan yalnız dedektör ve onu düzenleyen tip paneli (panel bir tipin bayrağını gösterir, parçayı sınıflamaz).
    expect(src.filter(f => /\.kalipIsi\b/.test(yorumsuz(oku(f)))).sort()).toEqual([path.join("src", "components", "PartTypeManager.jsx"), path.join("src", "lib", "kalipTamiri.js")]);
    for (const f of ["src/components/customers/CustomerDetailModal.jsx", "src/components/ServisPanosu.jsx"]) {
      const k = oku(f);
      expect(k, f).toMatch(/tamirDogrula\(/);
      expect(k, f).toMatch(/tamirYaz\(recTevkifat, tamirListesiKur\(/);
    }
  });
  it("AC-66 (R39): rozet, öneri, ipucu ve bildirim metinleri ekran dosyalarında düz metin olarak geçmez", () => {
    const metinler = ["KALIP ATÖLYEDE", KT.KALIP_ISI_ONERISI, KT.KALIP_KUTU_IPUCU, KT.KALIP_KUTU_ETIKETI, KT.TAMIR_BOS_HATASI, "atölyede henüz bitmedi", "Bekleyen Tamirleri Getir"];
    const ekran = src.filter(f => f.startsWith(path.join("src", "components")));
    for (const m of metinler) expect(ekran.filter(f => yorumsuz(oku(f)).includes(m)), m).toEqual([]);
  });
  it("AC-95, C13: köprünün yazılabilir listesi altı bölüm; üretim formları ve parça tipleri salt okunur", () => {
    const k = oku("src/components/ServisPencere.jsx");
    expect(k).toMatch(/const YAZILABILIR = \["services", "yedekParcaSatislar", "partSales", "partStock", "partStockLog", "dosyalar"\];/);
    expect(k).toMatch(/uretimFormlari=\{snap\.uretimFormlari\} partTypeDefs=\{snap\.partTypeDefs\}/);
    expect(k).not.toMatch(/setUretimFormlari/);
    const app = oku("src/App.jsx");
    expect((app.match(/setUretimFormlari=\{setUretimFormlari\}/g) || []).length).toBe(3); // Stock, pano sekmesi, Ayarlar
    expect(app).toMatch(/<ServisPanosu kiosk[\s\S]*?uretimFormlari=\{liveUretimFormlari\} partTypeDefs=\{livePartTypeDefs\} \/>/);
  });
  it("AC-103: KILIT_ALANLARI.uretim_formu pencereler listesi ServisPanosu.jsx'i içerir", async () => {
    const { KILIT_ALANLARI } = await import("../src/lib/kilitAlanlari");
    expect(KILIT_ALANLARI.uretim_formu.pencereler).toContain("src/components/ServisPanosu.jsx");
  });
  it("C12, AC-79 (kaynak): üretim formu servis bölümüne yazıcı almaz", () => {
    const k = oku("src/components/stock/UretimFormu.jsx");
    expect(k).not.toMatch(/setServices/);
    expect(oku("src/components/Stock.jsx")).not.toMatch(/setServices/);
  });
  it("C1: kalıp durumu makinesi dokunulmadı (musteriDurumu.js bu spec'te değişmedi)", () => {
    expect(oku("src/lib/musteriDurumu.js")).not.toMatch(/servis_tamir|kalipTamiri/);
  });
  it("C6: yeni eylem izni ve sunucu kuralı yok", () => {
    // Spec 0117 ile (R31, AC-52): beş sevk alanı da sunucuda anılmaz.
    expect(oku("electron/serverAuth.cjs")).not.toMatch(/atolyeKaliplari|kalipIsi|servis_tamir|kalipFabrikaTeslim|kalipKargoFirma|kalipKargoTakipNo|kalipKargoTarih|kalipKargoSorumlusu/);
    expect(oku("src/components/settings/serverPermissionDefs.js")).not.toMatch(/tamir/i);
  });
});

// Kapanış belge düzeni (0114 emsali). Plan specs/done'a taşındığında CLAUDE.md'nin 0115 bölümü commit satırını taşır,
// TASINACAK'ta 0115 yok, eski spec kopyası kalmaz, kanıt kayıtları tabanda `ayni`dır, README satırı Tamamlandı.
describe("Spec 0115: kapanış belge düzeni", () => {
  it("plan done'daysa: 'Tamamlandı: commit', TASINACAK'ta 0115 yok, eski kopya yok, kanıt tabanda ayni, README Tamamlandı", () => {
    if (!fs.existsSync("specs/done/0115-uygulama-plani.md")) return;
    const claude = oku("CLAUDE.md");
    const bolum = claude.slice(claude.indexOf("(spec 0115, plan"), claude.indexOf("(spec 0113, plan"));
    expect(bolum).toMatch(/Tamamlandı: commit `[0-9a-f]{7}`/);
    expect(bolum).not.toMatch(/specs\/0115-/);
    expect(oku("tests/spec-atiflari.test.js")).not.toMatch(/TASINACAK = \[[^\]]*0115/);
    expect(fs.existsSync("specs/0115-kalip-tamiri-atolye-is-listesi.md")).toBe(false);
    const kayitlar = Object.values(JSON.parse(oku("docs/evidence/kanit-eslemesi.json")).dosyalar).flat().filter(k => k.rapor.includes("/0115-"));
    expect(kayitlar.length).toBeGreaterThan(0);
    expect(kayitlar.filter(k => k.beklenen === "degisti" || k.onay)).toEqual([]);
    const spec = oku("specs/done/0115-kalip-tamiri-atolye-is-listesi.md");
    expect(spec).toMatch(/\| \*\*Durum\*\* \| Tamamlandı/);
    expect(oku("specs/README.md")).toMatch(/\| \*\*0115\*\* \| [^|]*\(Tamamlandı\)/);
  });
});
