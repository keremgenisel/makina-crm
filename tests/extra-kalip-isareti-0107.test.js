// Spec 0107: Extra Kalıp'ın üretim formu işareti kaybolmaz. Saf ölçüt, ibare, başlangıç tarihi ve kaynak taramaları.
import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  musteriKalibiBekliyorMu, aynaUretimFormuMetni, extraKalipGrupla, uretimFormHaritasi,
  URETIM_FORMU_GONDERILDI, URETIM_FORMU_GONDERILMEDI,
} from "../src/lib/musteriDurumu.js";
import { enEskiBekleyenKalipTarihi } from "../src/components/stock/UretimFormu.jsx";
import { kalipSatisiEkle } from "../src/lib/kalipSatisi.js";
import { BLOB_SECTIONS, EYLEM_IDLERI, AYAR_ALAN_SEKMELERI } from "../electron/serverAuth.cjs";
import { MERGE_KEYS } from "../src/lib/merge.js";

const kok = path.join(__dirname, "..");
const oku = (f) => readFileSync(path.join(kok, f), "utf-8");
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

// Spec 0108 ile (R3/2, R18): ölçüt artık bağ anahtarını ve haritayı alır; yönler aynı, bağlı kalıp canlı formda satırıyla.
describe("Spec 0107: musteriKalibiBekliyorMu (R16)", () => {
  const harita = uretimFormHaritasi([{ id: 9, satirlar: [{ kaynakTip: "musteri", kaynakId: 1, kalipIdx: 0 }] }]);
  it("işaretli ve bağsız müşteri kalıbı bekler; ayna, bağlı ya da işaretsiz kalıp beklemez", () => {
    expect(musteriKalibiBekliyorMu({ ad: "Y55", uretimFormGonder: true }, 1, 0, harita)).toBe(true);
    expect(musteriKalibiBekliyorMu({ ad: "Y55", uretimFormGonder: true, uretimFormId: 9 }, 1, 0, harita)).toBe(false);
    expect(musteriKalibiBekliyorMu({ ad: "Y55" }, 1, 0, harita)).toBe(false);
    expect(musteriKalibiBekliyorMu({ ad: "Y45", uretimFormGonder: true, partSaleId: 710 }, 1, 0, harita)).toBe(false);
    expect(musteriKalibiBekliyorMu(null, 1, 0, harita)).toBe(false);
  });
});

describe("Spec 0107: ayna satırın ibaresi (R6–R6/3, R17)", () => {
  const MUSTERI = { id: 610 };
  const k = { ad: "Y45", partSaleId: 710 };
  const grup = (ps) => extraKalipGrupla([{ id: 710, customerId: 610, tur: "Kalıp", ...ps }]);
  it("AC-12 / AC-27: işaret ya da bağ doluysa gönderildi, ikisi boşsa gönderilmedi", () => {
    expect(aynaUretimFormuMetni(k, MUSTERI, grup({ uretimFormGonder: true }))).toBe(URETIM_FORMU_GONDERILDI);
    expect(aynaUretimFormuMetni(k, MUSTERI, grup({ uretimFormId: 900 }))).toBe(URETIM_FORMU_GONDERILDI);
    expect(aynaUretimFormuMetni(k, MUSTERI, grup({}))).toBe(URETIM_FORMU_GONDERILMEDI);
  });
  it("AC-16: satış bulunamazsa (taşınmış, çöpte) ya da bağlam yoksa '—'", () => {
    expect(aynaUretimFormuMetni(k, MUSTERI, extraKalipGrupla([{ id: 710, customerId: 999, tur: "Kalıp", uretimFormGonder: true }]))).toBe("—");
    expect(aynaUretimFormuMetni(k, MUSTERI, extraKalipGrupla([{ id: 710, customerId: 610, tur: "Kalıp", deletedAt: "2026-10-01" }]))).toBe("—");
    expect(aynaUretimFormuMetni(k, MUSTERI, undefined)).toBe("—");
  });
});

describe("Spec 0107: yeni formun başlangıç tarihi (R10)", () => {
  it("AC-21: işaretli ayna makinanın satış tarihini çekmez; satışın tarihi ve gerçek kalıpların makina tarihi sayılır", () => {
    const ayna = { id: 1, installDate: "2020-01-01", kaliplar: [{ ad: "Y45", partSaleId: 710, uretimFormGonder: true }] };
    const ps = [{ id: 710, customerId: 1, tur: "Kalıp", tarih: "2026-04-10", uretimFormGonder: true }];
    expect(enEskiBekleyenKalipTarihi([ayna], ps)).toBe("2026-04-10");
    const gercek = { id: 2, installDate: "2025-05-01", kaliplar: [{ ad: "Y55", uretimFormGonder: true }] };
    expect(enEskiBekleyenKalipTarihi([ayna, gercek], ps)).toBe("2025-05-01");
  });
  it("AC-32: satışı bulunamayan işaretli ayna başlangıç tarihini çekmez", () => {
    const ayna = { id: 1, installDate: "2020-01-01", kaliplar: [{ ad: "Y45", partSaleId: 999, uretimFormGonder: true }] };
    expect(enEskiBekleyenKalipTarihi([ayna], [])).toBe("");
  });
});

describe("Spec 0107: ekleme kolu değişmez (R13)", () => {
  it("AC-23: iki kalıplı satışta işaret yalnız kutusu işaretlenen satırın kaydına yazılır", () => {
    let partSales = []; let customers = [{ id: 1, name: "A", kaliplar: [] }];
    let n = 100;
    const r = kalipSatisiEkle({ customerId: 1, currency: "TRY", tarih: "2026-10-01", kaliplar: [
      { ad: "Y55", olcu: "55x125", fiyat: 100 }, { ad: "K40", olcu: "40x40", fiyat: 200, uretimFormGonder: true },
    ] }, { customers, setPartSales: (u) => { partSales = u(partSales); }, setCustomers: (u) => { customers = u(customers); },
      uid: () => ++n, simdi: () => "2026-10-01T10:00:00", bugun: "2026-10-01", kkAyar: null, kdvRates: null });
    expect(r.hata).toBeFalsy();
    expect(partSales.map(p => [p.ad, !!p.uretimFormGonder])).toEqual([["Y55", false], ["K40", true]]);
  });
});

// ── Taramalar ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
describe("Spec 0107: kaynak taramaları", () => {
  it("AC-10: kayıt yolunun kalıp satırından okuduğu alanlar = ön doldurmanın yazdığı anahtarlar", () => {
    const s = oku("src/components/customers/CustomerDetailModal.jsx");
    const kayit = s.slice(s.indexOf("const savePartSale = () => {"), s.indexOf("const togglePartSaleOdendi"));
    const okunan = new Set([...kayit.matchAll(/\bk\.(\w+)/g)].map(m => m[1]));
    const acilis = s.slice(s.indexOf("const openEditPartSale = (ps) => {"), s.indexOf("const savePartSale = () => {"));
    const satir = acilis.match(/kaliplar: \[\{([^\]]*)\}\]/)[1];
    const yazilan = new Set([...satir.matchAll(/(\w+):/g)].map(m => m[1]));
    expect([...okunan].sort()).toEqual([...yazilan].sort());
    expect([...okunan].sort()).toEqual(["ad", "fiyat", "olcu", "uretimFormGonder"]);
  });
  it("AC-22 / AC-30: üç okuyucu kendi ayna ya da bekleyen ölçütünü yazmaz, musteriKalibiBekliyorMu'yu çağırır", () => {
    const uretim = yorumsuz(oku("src/components/stock/UretimFormu.jsx"));
    const dash = yorumsuz(oku("src/components/Dashboard.jsx"));
    for (const [ad, s] of [["UretimFormu", uretim], ["Dashboard", dash]]) {
      expect(s, ad).not.toMatch(/partSaleId/);
      expect(s, ad).not.toMatch(/\bk\.uretimForm(Gonder|Id)\b/);
    }
    expect((uretim.match(/musteriKalibiBekliyorMu\b/g) || []).length).toBe(3); // içe alma + iki çağrı
    expect((dash.match(/musteriKalibiBekliyorMu\b/g) || []).length).toBe(2);   // içe alma + bir çağrı
  });
  // Triyaj bulgu 1: dosya baytı değil anlam sabitlenir (0093 emsali). Sunucu bölümleri, birleştirme anahtarları, eylem izinleri
  // ve ayar alanları listesi ile ekleme kolunun işareti yazan satırları spec öncesiyle aynı; ilgisiz bir değişiklik testi kırmaz.
  // Fikstür `YAZ_0107=1` ile yeniden yazılır.
  it("AC-25 / AC-35: yeni bölüm, birleştirme anahtarı, izin ya da ayar alanı yok; ekleme kolunun işaret satırları aynı", () => {
    const isaretSatirlari = (f) => oku(f).split("\n").filter(l => l.includes("uretimFormGonder")).map(l => l.trim());
    const simdi = () => JSON.parse(JSON.stringify({ BLOB_SECTIONS, MERGE_KEYS, EYLEM_IDLERI, AYAR_ALAN_SEKMELERI,
      kalipSatisiIsaret: isaretSatirlari("src/lib/kalipSatisi.js"), partSaleFormIsaret: isaretSatirlari("src/components/PartSaleForm.jsx") }));
    if (process.env.YAZ_0107 === "1") writeFileSync(path.join(kok, "tests/fixtures/0107-tarama-once.json"), JSON.stringify(simdi(), null, 2) + "\n");
    expect(simdi()).toEqual(JSON.parse(oku("tests/fixtures/0107-tarama-once.json")));
    // Bu işin adları sunucu, veritabanı, birleştirme ve izin dosyalarına girmez.
    for (const f of ["electron/db.cjs", "electron/serverAuth.cjs", "electron/server.cjs", "src/lib/merge.js", "src/lib/permissions.js", "src/components/settings/serverPermissionDefs.js"]) {
      expect(oku(f), f).not.toMatch(/musteriKalibiBekliyorMu|aynaUretimFormuMetni|URETIM_FORMU_GONDERIL/);
    }
  });
  it("AC-33: iki yeni metin src altında yalnız musteriDurumu.js'te yazılı", async () => {
    const { readdirSync, statSync } = await import("node:fs");
    const gez = (d) => readdirSync(d).flatMap(f => { const y = path.join(d, f); return statSync(y).isDirectory() ? gez(y) : [y]; });
    const bulunan = gez(path.join(kok, "src")).filter(f => /\.(jsx?|mjs)$/.test(f))
      .filter(f => /Üretim formuna gönderil(di|medi)/.test(readFileSync(f, "utf-8"))).map(f => path.relative(kok, f));
    expect(bulunan).toEqual(["src/lib/musteriDurumu.js"]);
  });
  it("AC-36: ızgara şablonu altı sütun aynen, ibare nowrap ve kendi kimliğinde", () => {
    const s = oku("src/components/customers/CustomerAddEditForm.jsx");
    expect(s).toContain('gridTemplateColumns: "auto 1fr 1fr auto auto 36px"');
    const oge = s.slice(s.indexOf('data-testid="ayna-uretim-formu"'), s.indexOf('data-testid="ayna-uretim-formu"') + 200);
    expect(oge).toContain('whiteSpace: "nowrap"');
    expect(oge).toContain("aynaUretimFormuMetni(");
  });
});


// Triyaj bulgu 2: üç yeni kayıt açıkça `ayni` ve son kodla çekilmiş taban raporuna bağlı; iş raporu (eski ↔ yeni) yalnız bu üç
// ekranı değişmiş gösterir (C7), yani taban raporu eski kodun (işaretsiz kutunun) görüntüsünü taşımaz.
describe("Spec 0107: kanıt kayıtları (triyaj bulgu 2)", () => {
  const YENI = ["musteri-formu-0107-ayna", "musteri-formu-0107-ayna-dar", "kalip-formu-0107-duzenle"];
  // Spec 0110 ile (plan turu Karar 24): üç ekranın arkasındaki müşteri listesi değişti; kayıtlar 0110 raporuna taşındı
  // (uygulamada `degisti`, kapanışta 0110 tabanıyla `ayni`). 0107 tabanının kendisi 0 fark kalır.
  it("üç kayıt eşlemede; 0107 tabanında 0 fark, kayıt 0107 tabanında 'ayni' ya da 0110 raporlarında (spec 0110 ile)", () => {
    const { dosyalar } = JSON.parse(oku("docs/evidence/kanit-eslemesi.json"));
    const kayitlar = Object.values(dosyalar).flat().filter(k => YENI.includes(k.ekran));
    expect(kayitlar.map(k => k.ekran).sort()).toEqual([...YENI].sort());
    for (const k of kayitlar) {
      expect(k.rapor === "docs/evidence/0107-taban-piksel-raporu.json" ? k.beklenen : "0110", k.ekran).toMatch(/^(ayni|0110)$/);
      if (k.rapor !== "docs/evidence/0107-taban-piksel-raporu.json") expect(k.rapor).toMatch(/^docs\/evidence\/0110-(taban-)?piksel-raporu\.json$/);
    }
    const taban = JSON.parse(oku("docs/evidence/0107-taban-piksel-raporu.json"));
    expect(taban.filter(r => YENI.some(e => r.ad.startsWith(e + "-"))).every(r => r.piksel === 0)).toBe(true);
  });
  it("iş raporunda yalnız üç yeni ekran değişti; tabanın 'önce'si son kod (ikisi aynı görüntü kümesi)", () => {
    const is = JSON.parse(oku("docs/evidence/0107-piksel-raporu.json"));
    const taban = JSON.parse(oku("docs/evidence/0107-taban-piksel-raporu.json"));
    const degisen = [...new Set(is.filter(r => r.piksel !== 0).map(r => r.ad.replace(/-(aydinlik|karanlik)\.png$/, "")))].sort();
    expect(degisen).toEqual([...YENI].sort());
    expect(taban.map(r => r.ad).sort()).toEqual(is.map(r => r.ad).sort());
  });
});

// Triyaj bulgu 3: kapanış adımları. Plan specs/done'a taşındığında CLAUDE.md'nin 0107 bölümü commit satırını taşır ve
// spec atıf testinin taşınacaklar listesi boşalır. Taşınmadan önce koşul sınanmaz.
describe("Spec 0107: kapanış belge düzeni (triyaj bulgu 3)", () => {
  it("plan done'daysa: CLAUDE.md 0107 bölümünde 'Tamamlandı: commit' ve TASINACAK'ta 0107 yok; ana dizinde eski spec kopyası yok", async () => {
    const { existsSync } = await import("node:fs");
    if (!existsSync(path.join(kok, "specs/done/0107-uygulama-plani.md"))) return;
    const claude = oku("CLAUDE.md");
    const bolum = claude.slice(claude.indexOf("(spec 0107, plan"), claude.indexOf("(spec 0106, plan"));
    expect(bolum).toMatch(/Tamamlandı: commit `[0-9a-f]{7}`/);
    expect(oku("tests/spec-atiflari.test.js")).not.toMatch(/TASINACAK = \[[^\]]*0107/);
    expect(existsSync(path.join(kok, "specs/0107-extra-kalip-uretim-formu-isareti.md"))).toBe(false);
  });
});
