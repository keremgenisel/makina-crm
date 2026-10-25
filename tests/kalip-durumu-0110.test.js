// Spec 0110: kalıp durumu geçmişi susar, pil yalnız açık işi sayar. Saf türetme, pil, iki okumanın çaprazı ve taramalar.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import * as MD from "../src/lib/musteriDurumu.js";

const K = MD.KALIP_DURUMU;
const kok = path.join(__dirname, "..");
const oku = (f) => readFileSync(path.join(kok, f), "utf-8");
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const govde = (s, bas, son) => s.slice(s.indexOf(bas), s.indexOf(son, s.indexOf(bas)));

// Form 90 canlı: müşteri 1'in 0. (bitmemiş) ve 1. (tamamlanmış) kalıbı, Extra Kalıp 7 (bitmemiş). Form 91 kapalı, tamamlanmış satır.
// Form 92 çöpte.
const FORMLAR = [
  { id: 90, satirlar: [{ kaynakTip: "musteri", kaynakId: 1, kalipIdx: 0, tamamlandi: false }, { kaynakTip: "musteri", kaynakId: 1, kalipIdx: 1, tamamlandi: true },
    { kaynakTip: "extra_kalip", kaynakId: 7, tamamlandi: false }] },
  { id: 91, kapali: true, satirlar: [{ kaynakTip: "musteri", kaynakId: 2, kalipIdx: 0, tamamlandi: true }] },
  { id: 92, deletedAt: "2026-10-20", satirlar: [{ kaynakTip: "musteri", kaynakId: 1, kalipIdx: 2, tamamlandi: false }] },
];
const H = MD.uretimFormHaritasi(FORMLAR);
const A = (i, m = 1) => MD.musteriKalipAnahtari(m, i);
const pil = (durumlar) => MD.kalipPili(durumlar);

describe("Spec 0110: türetme (R1–R7)", () => {
  it("AC-1: işaretsiz, damgasız müşteri kalıbı teslim türetir ve kayda alan yazılmaz", () => {
    const k = Object.freeze({ ad: "Y55", olcu: "55x125" });
    expect(MD.kalipDurumuTuret(k, A(5), H)).toBe(K.TESLIM);
    expect(MD.kalipDurumuOf(k, A(5), H)).toBe(K.TESLIM);
    expect(k).toEqual({ ad: "Y55", olcu: "55x125" });
  });
  it("AC-2: işaretsiz, damgasız Extra Kalıp satışı teslim türetir (R1/2)", () => {
    expect(MD.kalipDurumuTuret({ id: 8, tur: "Kalıp" }, MD.extraKalipAnahtari(8), H)).toBe(K.TESLIM);
  });
  it.each([
    ["form çöpte, işaretsiz", { uretimFormId: 92 }, A(2), K.BEKLIYOR],
    ["form yok, işaretsiz", { uretimFormId: 999 }, A(2), K.BEKLIYOR],
    ["formda satırı yok, işaretsiz", { uretimFormId: 90 }, A(4), K.BEKLIYOR],
    ["form çöpte, işaretli", { uretimFormGonder: true, uretimFormId: 92 }, A(2), K.GONDERILDI],
    ["form yok, işaretli", { uretimFormGonder: true, uretimFormId: 999 }, A(2), K.GONDERILDI],
    ["işaretli, damgasız", { uretimFormGonder: true }, A(2), K.GONDERILDI],
  ])("AC-3: damga taşıyan ya da işaretli kalıp teslim türetmez (%s)", (_, k, a, beklenen) => {
    expect(MD.kalipDurumuTuret(k, a, H)).toBe(beklenen);
  });
  it("AC-4: canlı bağ ve bitmemiş satır üretimde, tamamlanmış satır hazır", () => {
    expect(MD.kalipDurumuTuret({ uretimFormId: 90 }, A(0), H)).toBe(K.URETIMDE);
    expect(MD.kalipDurumuTuret({ uretimFormId: 90 }, A(1), H)).toBe(K.HAZIR);
    expect(MD.kalipDurumuTuret({ id: 7, uretimFormId: 90 }, MD.extraKalipAnahtari(7), H)).toBe(K.URETIMDE);
  });
  it("AC-5: kapalı formun tamamlanmış satırı da hazır; türetme ve harita 'kapali' okumaz", () => {
    expect(MD.kalipDurumuTuret({ uretimFormId: 91 }, A(0, 2), H)).toBe(K.HAZIR);
    const s = yorumsuz(oku("src/lib/musteriDurumu.js"));
    expect(govde(s, "export const kalipDurumuTuret", "\n};")).not.toMatch(/kapali/);
    expect(govde(s, "export const uretimFormHaritasi", "\n};")).not.toMatch(/kapali/);
  });
  it("AC-6: elle yazılan bekliyor türetilenin önüne geçer ve amber pil çizer", () => {
    expect(MD.kalipDurumuOf({ kalipDurumu: K.BEKLIYOR }, A(5), H)).toBe(K.BEKLIYOR);
    expect(pil([K.BEKLIYOR])).toMatchObject({ durum: K.BEKLIYOR, metin: "KALIP SİPARİŞİ BEKLİYOR", renk: "var(--amb700, #b45309)" });
  });
  it("AC-30: 0106 X11 sapmasında satırı düşen kalıp bekliyor türetir ve pille görünür (R7/2)", () => {
    const F = { id: 950, satirlar: [0, 1, 2].map(i => ({ kaynakTip: "musteri", kaynakId: 9, kalipIdx: i, tamamlandi: i === 0 })) };
    const h = MD.uretimFormHaritasi([F]);
    const B = { ad: "B", uretimFormId: 950 }, C = { ad: "C", uretimFormId: 950 }, D = { ad: "D", uretimFormId: 950 };
    // A silindi: B, C, D kayar; D konum 2'yi okur (var), ama dört kalıptan biri silinince son konumun satırı hiçbir kalıba düşmez.
    const kume = MD.kalipKumesi({ id: 9, kaliplar: [B, C, D, { ad: "E", uretimFormId: 950 }] }, new Map(), h);
    expect(kume[3]).toBe(K.BEKLIYOR);
    expect(kume).not.toContain(K.TESLIM);
    expect(pil(kume).durum).toBe(K.BEKLIYOR);
  });
});

describe("Spec 0110: iki okumanın çaprazı (R6, R6/2, C4, C4/2)", () => {
  it("AC-24: damgası dolu ama bağı kopmuş işaretsiz kalıp hem bekleyen hem bekliyor türetir", () => {
    const k = { uretimFormId: 92 };
    expect(MD.kalipBekliyorMu(k, A(2), H)).toBe(true);
    expect(MD.musteriKalibiBekliyorMu(k, 1, 2, H)).toBe(true);
    expect(MD.kalipDurumuTuret(k, A(2), H)).toBe(K.BEKLIYOR);
    const ps = { id: 9, tur: "Kalıp", uretimFormId: 999 };
    expect(MD.extraKalipBekliyorMu(ps, H)).toBe(true);
    expect(MD.kalipDurumuTuret(ps, MD.extraKalipAnahtari(9), H)).toBe(K.BEKLIYOR);
  });
  it("AC-25: hiçbir girdide kalipBekliyorMu true iken türetilen teslim olmaz", () => {
    const isaretler = [undefined, false, true];
    const damgalar = [undefined, "", 90, 91, 92, 999];
    const anahtarlar = [A(0), A(1), A(2), A(4), A(0, 2)];
    const elle = [undefined, "", ...MD.KALIP_SIRASI, "abc"];
    let bekleyen = 0;
    for (const g of isaretler) for (const d of damgalar) for (const a of anahtarlar) for (const e of elle) {
      const k = { uretimFormGonder: g, uretimFormId: d, kalipDurumu: e };
      if (!MD.kalipBekliyorMu(k, a, H)) continue;
      bekleyen++;
      expect(MD.kalipDurumuTuret(k, a, H), JSON.stringify({ k, a })).not.toBe(K.TESLIM);
      expect(MD.kalipDurumuOf(k, a, H), JSON.stringify({ k, a })).not.toBe(K.TESLIM);
    }
    expect(bekleyen).toBeGreaterThan(50);
  });
  it("AC-7 (C4): kalipBekliyorMu'nun gövdesi spec öncesiyle aynı", () => {
    const s = oku("src/lib/musteriDurumu.js");
    expect(govde(s, "export const kalipBekliyorMu", "\n};")).toBe([
      "export const kalipBekliyorMu = (k, anahtar, harita) => {",
      "  if (!k || ELLE_BITTI.has(elleKalipDurumu(k))) return false;",
      "  if (!k.uretimFormGonder && !doluMu(k.uretimFormId)) return false;",
      "  return !bagCanliMi(k, anahtar, harita);",
    ].join("\n"));
  });
});

describe("Spec 0110: pil (R8–R12)", () => {
  it("AC-9: ham veriyle altı kalıplı kayıt (biri canlı bağlı ve bitmemiş, beşi işaretsiz) 'KALIP ÜRETİMDE' yazar", () => {
    const m = { id: 1, kaliplar: [{ uretimFormGonder: true, uretimFormId: 90 }, { ad: "a" }, { ad: "b" }, { ad: "c" }, { ad: "d" }, { ad: "e" }] };
    const kume = MD.kalipKumesi(m, new Map(), H);
    expect(kume).toEqual([K.URETIMDE, K.TESLIM, K.TESLIM, K.TESLIM, K.TESLIM, K.TESLIM]);
    expect(MD.satirDurumu(m, { harita: H, grup: new Map() }).piller.map(p => p.metin)).toEqual(["KALIP ÜRETİMDE"]);
  });
  it("AC-10: {2 üretimde, 1 hazır} 'KALIP ÜRETİMDE 2/3'", () => {
    expect(pil([K.URETIMDE, K.HAZIR, K.URETIMDE]).metin).toBe("KALIP ÜRETİMDE 2/3");
  });
  it("AC-11: {7 üretimde, 1 teslim} 'KALIP ÜRETİMDE'", () => {
    expect(pil([...Array(7).fill(K.URETIMDE), K.TESLIM]).metin).toBe("KALIP ÜRETİMDE");
  });
  it("AC-12: hepsi teslim ise pil yok", () => { expect(pil([K.TESLIM, K.TESLIM, K.TESLIM])).toBeNull(); });
  it("AC-13: küme boşsa pil yok", () => {
    expect(pil([])).toBeNull();
    expect(pil(undefined)).toBeNull();
    expect(MD.satirDurumu({ id: 1, kaliplar: [] }, { harita: H, grup: new Map() }).piller).toEqual([]);
  });
  it("AC-14: makina durumu boş kayıtta elle bekliyor yazılmış kalıp pil çizer (kapı kalktı)", () => {
    const m = { id: 1, kaliplar: [{ kalipDurumu: K.BEKLIYOR }, { ad: "eski" }] };
    expect(MD.satirDurumu(m, { harita: H, grup: new Map() }).piller.map(p => p.metin)).toEqual(["KALIP SİPARİŞİ BEKLİYOR"]);
  });
  it("AC-15: kalipPili tek parametreli, satirDurumu tek argüman geçirir, 0106 testinin yardımcısı da tek argümanlı", () => {
    expect(MD.kalipPili.length).toBe(1);
    const s = yorumsuz(oku("src/lib/musteriDurumu.js"));
    expect(s).toMatch(/export const kalipPili = \(durumlar\) =>/);
    expect(govde(s, "export const satirDurumu", "\n};")).toMatch(/kalipPili\(durumlar\)\]/);
    const cagrilar = [...yorumsuz(oku("tests/musteri-durumu-0106.test.js")).matchAll(/kalipPili\(([^\n]*)\);?/g)].map(m => m[1]);
    expect(cagrilar).toEqual(["MD.kalipKumesi(m, grup, harita)"]);
  });
  it("AC-16: 'Teslim bekliyor' ölçütü değişmedi: makina hazır ya da en az bir kalıp hazır", () => {
    expect(MD.satirDurumu({ id: 1, makinaDurumu: "hazir", kaliplar: [{}] }, { harita: H }).teslimBekliyor).toBe(true);
    expect(MD.satirDurumu({ id: 1, kaliplar: [{}, { uretimFormId: 90 }] }, { harita: H }).teslimBekliyor).toBe(true);
    expect(MD.satirDurumu({ id: 1, kaliplar: [{}, { uretimFormId: 90 }].slice(0, 1) }, { harita: H }).teslimBekliyor).toBe(false);
    expect(MD.satirDurumu({ id: 1, makinaDurumu: "montaj", kaliplar: [{ kalipDurumu: K.TESLIM }] }, { harita: H }).teslimBekliyor).toBe(false);
  });
});

describe("Spec 0110: kaynak taramaları", () => {
  it("AC-17 / AC-28 (R13, R13/2): detay penceresinde kalıp durumu çizilmez, durumBaglami zinciri durur", () => {
    const s = yorumsuz(oku("src/components/customers/CustomerDetailModal.jsx"));
    for (const ad of ["KalipDurumuSecici", "kalipDurumuTuret", "aynaDurumu", "aynaSatirMi", "musteriKalipAnahtari", "KALIP_DURUM_ADLARI", "AYNA_SATIR_IBARESI", "detay-kalip-satiri", "ayna-kalip-durumu"]) {
      expect(s, ad).not.toContain(ad);
    }
    expect(s).toMatch(/durumBaglami = null,/);
    expect(s).toMatch(/durumBaglami=\{durumBaglami\}/);
    expect(s).toMatch(/MakinaDurumuSecici/);
  });
  it("AC-20 (R17): müşteri formunda kalıp seçicisi ve iki ayna öğesi durur", () => {
    const s = yorumsuz(oku("src/components/customers/CustomerAddEditForm.jsx"));
    expect(s).toMatch(/KalipDurumuSecici/);
    expect(s).toMatch(/data-testid="ayna-kalip-durumu"/);
    expect(s).toMatch(/data-testid="ayna-uretim-formu"/);
  });
  it("C1, C2: sunucu, veritabanı, birleştirme ve kilit dosyaları türetilen kalıp durumunu bilmez; kütüphane saf", () => {
    for (const f of ["electron/db.cjs", "electron/serverAuth.cjs", "src/lib/merge.js", "src/lib/kilitAlanlari.js"]) {
      expect(oku(f), f).not.toMatch(/kalipDurumuTuret|kalipPili/);
    }
    const s = yorumsuz(oku("src/lib/musteriDurumu.js"));
    expect(s).not.toMatch(/from "react"|Date\.now|new Date\(/);
  });
});

// Kapanış belge düzeni (0107, 0108 ve 0109 emsali). Plan specs/done'a taşındığında CLAUDE.md'nin 0110 bölümü commit satırını
// taşır, spec atıf testinin taşınacaklar listesi boşalır ve ana dizinde eski spec kopyası kalmaz. Taşınmadan önce sınanmaz.
describe("Spec 0110: kapanış belge düzeni", () => {
  it("plan done'daysa: CLAUDE.md 0110 bölümünde 'Tamamlandı: commit', TASINACAK'ta 0110 yok, eski spec kopyası yok", async () => {
    const { existsSync } = await import("node:fs");
    if (!existsSync(path.join(kok, "specs/done/0110-uygulama-plani.md"))) return;
    const claude = oku("CLAUDE.md");
    const bolum = claude.slice(claude.indexOf("(spec 0110, plan"), claude.indexOf("(spec 0109, plan"));
    expect(bolum).toMatch(/Tamamlandı: commit `[0-9a-f]{7}`/);
    expect(oku("tests/spec-atiflari.test.js")).not.toMatch(/TASINACAK = \[[^\]]*0110/);
    expect(existsSync(path.join(kok, "specs/0110-kalip-durumu-gecmisi-susar.md"))).toBe(false);
  });
  it("CLAUDE.md 0106 bölümü eski pil ve kart cümlelerini taşımaz", () => {
    const c = oku("CLAUDE.md");
    const bolum = c.slice(c.indexOf("(spec 0106, plan"), c.indexOf("(spec 0105, plan"));
    expect(bolum).not.toMatch(/payda bastırılanları da sayar|kalıplar satır listesi|"bekliyor" yalnız makina durumu doluyken/);
    expect(bolum).toMatch(/spec 0110/);
  });
});

// Triyaj bulgu 1: türetilen etiket metninin değişimi (R18) iki kanıt ekranında görünür; fikstürün kalıpları elle değersiz kalır.
describe("Spec 0110 triyaj: etiket değişiminin kanıtı (R18, AC-22, AC-26)", () => {
  const EKRANLAR = { "musteri-formu-0110-teslim": "src/components/customers/CustomerAddEditForm.jsx", "musteri-detay-0110-cizelge": "src/components/customers/detail/MachineTimeline.jsx" };
  it("iki ekran iş raporunda değişti, tabanda 0 fark; kayıtları kendi dosyalarında (uygulamada R18 onayıyla)", () => {
    const is = JSON.parse(oku("docs/evidence/0110-piksel-raporu.json"));
    const taban = JSON.parse(oku("docs/evidence/0110-taban-piksel-raporu.json"));
    const { dosyalar } = JSON.parse(oku("docs/evidence/kanit-eslemesi.json"));
    for (const [ekran, dosya] of Object.entries(EKRANLAR)) {
      const r = is.filter(x => x.ad.startsWith(ekran + "-"));
      expect(r.length, ekran).toBe(2);
      expect(r.every(x => x.piksel > 0), ekran).toBe(true);
      expect(taban.filter(x => x.ad.startsWith(ekran + "-")).every(x => x.piksel === 0), ekran).toBe(true);
      const k = dosyalar[dosya].find(x => x.ekran === ekran);
      // Uygulamada iş raporunda `degisti` + R18 onayı; kapanışta 0110 tabanında `ayni` (onay düşer, AC-11c).
      const tabanda = k.rapor.endsWith("0110-taban-piksel-raporu.json");
      expect(k.beklenen, ekran).toBe(tabanda ? "ayni" : "degisti");
      if (!tabanda) expect(k.onay, ekran).toMatch(/spec 0110 R18$/);
    }
  });
  it("fikstür: FLORYA UN'un ilk üç kalıbı ve ekranın Extra Kalıp'ı elle değersiz, işaretsiz ve damgasız (türetilen etiket çizilir)", () => {
    const s = oku("scripts/evidence/0009-sayfa.jsx");
    const florya = s.split("\n").find(l => l.includes("id: 863, name: \"FLORYA UN\""));
    const kaliplar = [...florya.matchAll(/k0106\("(\w+)", "[^"]+"(, \{[^}]*\})?\)/g)].map(m => ({ ad: m[1], ek: m[2] || "" }));
    expect(kaliplar.slice(0, 3).map(k => k.ad)).toEqual(["Y50", "Y55", "K40"]);
    expect(kaliplar.slice(0, 3).every(k => k.ek === "")).toBe(true);
    expect(s).toMatch(/"musteri-detay-0110-cizelge": \[musteri0106\(\{ initialDetailId: 862, partSales: \[\{ \.\.\.PS_0106\[0\], uretimFormId: undefined \}\] \}\)/);
    expect(s.split("\n").find(l => l.startsWith("const PS_0106"))).not.toMatch(/uretimFormGonder|kalipDurumu/);
  });
});

// Triyaj bulgu 2 ve 3: spec'in sayımları kendi kararlarıyla, README dalın belgeleriyle tutarlı.
describe("Spec 0110 triyaj: belge tutarlılığı", () => {
  const { existsSync } = require("node:fs");
  const specYolu = ["specs/done/0110-kalip-durumu-gecmisi-susar.md", "specs/0110-kalip-durumu-gecmisi-susar.md"].find(f => existsSync(path.join(kok, f)));
  const planYolu = ["specs/done/0110-uygulama-plani.md", "specs/0110-uygulama-plani.md"].find(f => existsSync(path.join(kok, f)));
  it("bulgu 2: AC-7, AC-23, başlık ve DoD yirmi iki beklentiyi ve dokunulmayan 0108 UI testini söyler; plan §4 toplamı 22", () => {
    const s = oku(specYolu);
    const satir = (bas) => s.split("\n").find(l => l.startsWith(bas));
    expect(satir("- **AC-23.**")).toMatch(/yirmi ikidir\*\* ve beş dosyadadır/);
    expect(satir("- **AC-23.**")).toMatch(/tests\/ui\/uretim-formu-bagi-0108\.test\.jsx` \*\*listede değildir/);
    expect(satir("- **AC-7.**")).not.toMatch(/AC-29'u ise pil metni yüzünden ters çevrilir/);
    expect(satir("| **Ters çevrilen kriterler**")).toMatch(/yirmi iki beklenti, beş dosya/);
    expect(satir("| **Ters çevrilen kriterler**")).not.toMatch(/AC-28; 0108 AC-29;|On sekiz beklenti, altı dosya \|/);
    const dokunulan = satir("- **Dokunulan testler:**");
    expect(dokunulan).toMatch(/`tests\/ui\/uretim-formu-bagi-0108\.test\.jsx` dokunulmaz/);
    expect(satir("- **Kanıt turu:**")).toMatch(/on bir kayıt/);
    const { dosyalar } = JSON.parse(oku("docs/evidence/kanit-eslemesi.json"));
    const kayit0110 = Object.values(dosyalar).flat().filter(k => /0110-(taban-)?piksel-raporu\.json$/.test(k.rapor));
    expect(kayit0110).toHaveLength(11);
    const plan = oku(planYolu);
    const sayilar = [...plan.slice(plan.indexOf("## 4."), plan.indexOf("## 5.")).matchAll(/^\| `tests\/[^`]+` \((\d+)\) \|/gm)].map(m => +m[1]);
    expect(sayilar.reduce((a, b) => a + b, 0)).toBe(22);
    expect(sayilar).toHaveLength(5);
  });
  it("bulgu 3: dalın README'si 0110 satırını ve 'Teslim edildi'ye geçiş elle' açık bulgusunu taşır", () => {
    const r = oku("specs/README.md");
    expect(r.split("\n").find(l => l.startsWith("| **0110** |"))).toMatch(/\((Uygulandı, kapanış bekliyor|Tamamlandı)\)/);
    const bulgular = r.slice(r.indexOf("## Açık bulgular"));
    expect(bulgular).toMatch(/\| \*\*Üretimi biten kalıbın "Teslim edildi"ye geçişi elle:\*\*.*Spec 0110 ölçüm 9, Karar 2, X2/);
    expect(oku("CLAUDE.md")).toMatch(/elle \(X2, README açık bulgu\)/);
  });
});
