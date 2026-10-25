// Spec 0108: üretim formundan çıkan kalıp yeniden bekleyen olur. Saf ölçüt, silme sayısı, dönem metni ve taramalar.
import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  kalipBekliyorMu, musteriKalibiBekliyorMu, extraKalipBekliyorMu, bagCanliMi, uretimFormHaritasi, kalipDurumuTuret, kalipDurumuOf,
  musteriKalipAnahtari, extraKalipAnahtari, formSilinceDonenSayisi, formSilmeDonusMetni, KALIP_DURUMU as K,
} from "../src/lib/musteriDurumu.js";
import { enEskiBekleyenKalipTarihi } from "../src/components/stock/UretimFormu.jsx";
import { uretimFormDonemMetni } from "../src/components/stock/uretimFormPrint.js";
import { BLOB_SECTIONS, EYLEM_IDLERI, AYAR_ALAN_SEKMELERI } from "../electron/serverAuth.cjs";
import { MERGE_KEYS } from "../src/lib/merge.js";

const kok = path.join(__dirname, "..");
const oku = (f) => readFileSync(path.join(kok, f), "utf-8");
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

// Form 90 canlı: müşteri 1'in 0. kalıbı ve Extra Kalıp 7 satırlı. Form 91 çöpte, müşteri 1'in 1. kalıbı orada.
const FORMLAR = [
  { id: 90, satirlar: [{ kaynakTip: "musteri", kaynakId: 1, kalipIdx: 0 }, { kaynakTip: "extra_kalip", kaynakId: 7 }] },
  { id: 91, deletedAt: "2026-10-20", satirlar: [{ kaynakTip: "musteri", kaynakId: 1, kalipIdx: 1 }] },
];
const H = uretimFormHaritasi(FORMLAR);
const A0 = musteriKalipAnahtari(1, 0);

describe("Spec 0108: bekleyen kalıp ölçütü (R1–R5)", () => {
  it.each([
    ["AC-1: işaret dolu, kimlik boş", { uretimFormGonder: true }, true],
    ["AC-2: kimlik dolu, canlı formda satırı var", { uretimFormGonder: true, uretimFormId: 90 }, false],
    ["AC-3: kimlikte hiç form yok", { uretimFormGonder: true, uretimFormId: 999 }, true],
    ["AC-4: form çöpte", { uretimFormGonder: true, uretimFormId: 91 }, true],
    ["AC-6: elle hazır, bağ kopmuş", { uretimFormGonder: true, uretimFormId: 999, kalipDurumu: K.HAZIR }, false],
    ["AC-7: elle teslim, bağ kopmuş", { uretimFormGonder: true, uretimFormId: 999, kalipDurumu: K.TESLIM }, false],
    ["AC-9: ne işaret ne kimlik", {}, false],
    ["AC-33: kimlik dolu, işaret boş, bağ kopmuş", { uretimFormId: 999 }, true],
    ["AC-40: bağsız, işaretli, elle hazır", { uretimFormGonder: true, kalipDurumu: K.HAZIR }, false],
    ["AC-40: bağsız, işaretli, elle teslim", { uretimFormGonder: true, kalipDurumu: K.TESLIM }, false],
    ["AC-41: elle üretimde, öteki şartlar sağlanıyor", { uretimFormGonder: true, kalipDurumu: K.URETIMDE }, true],
    ["AC-41: elle gönderildi", { uretimFormGonder: true, uretimFormId: 999, kalipDurumu: K.GONDERILDI }, true],
    ["AC-41: elle bekliyor", { uretimFormId: 999, kalipDurumu: K.BEKLIYOR }, true],
  ])("%s", (_ad, k, beklenen) => {
    expect(kalipBekliyorMu(k, A0, H)).toBe(beklenen);
    expect(musteriKalibiBekliyorMu(k, 1, 0, H)).toBe(beklenen);
  });
  it("AC-5: form canlı ama o formda bu kalıbın satırı yok", () => {
    expect(musteriKalibiBekliyorMu({ uretimFormGonder: true, uretimFormId: 90 }, 1, 3, H)).toBe(true);
    expect(musteriKalibiBekliyorMu({ uretimFormGonder: true, uretimFormId: 90 }, 2, 0, H)).toBe(true);
  });
  it("AC-8: türetilmiş 'hazır' kalıbı bekleyen olmaktan çıkarmaz (yalnız elle yazılan çıkarır)", () => {
    const h = uretimFormHaritasi([{ id: 95, satirlar: [{ kaynakTip: "musteri", kaynakId: 1, kalipIdx: 0, tamamlandi: true }] }]);
    const k = { uretimFormGonder: true, uretimFormId: 95 };
    expect(kalipDurumuTuret(k, A0, h)).toBe(K.HAZIR);
    expect(kalipBekliyorMu(k, A0, h)).toBe(false); // bağ canlı
    expect(kalipBekliyorMu(k, A0, new Map())).toBe(true); // bağ koptu: türetilmiş hazır onu tutmaz
  });
  it("AC-10: Extra Kalıp satışında aynı hâller aynı sonucu verir", () => {
    const ps = (o) => ({ id: 7, ...o });
    expect(extraKalipBekliyorMu(ps({ uretimFormGonder: true }), H)).toBe(true);
    expect(extraKalipBekliyorMu(ps({ uretimFormGonder: true, uretimFormId: 90 }), H)).toBe(false);
    expect(extraKalipBekliyorMu(ps({ uretimFormGonder: true, uretimFormId: 999 }), H)).toBe(true);
    expect(extraKalipBekliyorMu(ps({ uretimFormGonder: true, uretimFormId: 91 }), H)).toBe(true);
    expect(extraKalipBekliyorMu({ id: 8, uretimFormGonder: true, uretimFormId: 90 }, H)).toBe(true); // satırı yok
    expect(extraKalipBekliyorMu(ps({ uretimFormId: 999, kalipDurumu: K.TESLIM }), H)).toBe(false);
    expect(bagCanliMi(ps({ uretimFormId: 90 }), extraKalipAnahtari(7), H)).toBe(true);
  });
  it("AC-11: ayna satır hiçbir hâlde bekleyen değil", () => {
    for (const k of [{ uretimFormGonder: true }, { uretimFormId: 999 }, { uretimFormGonder: true, uretimFormId: 91 }]) {
      expect(musteriKalibiBekliyorMu({ ...k, partSaleId: 7 }, 1, 0, H)).toBe(false);
    }
  });
  it("AC-38: haritayı almayan çağıranda bütün damgalı kalıplar bekleyen görünür (bilinen sınır)", () => {
    expect(musteriKalibiBekliyorMu({ uretimFormGonder: true, uretimFormId: 90 }, 1, 0)).toBe(true);
    expect(extraKalipBekliyorMu({ id: 7, uretimFormId: 90 }, undefined)).toBe(true);
  });
  it("AC-42: konum kayması sonrası bağ kopmuş sayılır ve kalıp bekleyen olur (bilinen sınır, C4/2)", () => {
    // Form 90 müşteri 1'in 1. kalıbını gösteriyor; listenin başından bir kalıp silinince o kalıp 0. konuma kayar.
    const kaliplar = [{ ad: "Önceki" }, { ad: "Y55", uretimFormGonder: true, uretimFormId: 90 }];
    const h = uretimFormHaritasi([{ id: 90, satirlar: [{ kaynakTip: "musteri", kaynakId: 1, kalipIdx: 1 }] }]);
    expect(musteriKalibiBekliyorMu(kaliplar[1], 1, 1, h)).toBe(false);
    const kaymis = kaliplar.slice(1); // "Önceki" silindi; Y55 artık konum 0
    expect(musteriKalibiBekliyorMu(kaymis[0], 1, 0, h)).toBe(true);
  });
});

describe("Spec 0108: 0106'nın türetmesi aynı canlılığı okur (R15, U1)", () => {
  it("AC-43: damga dolu, bağ canlı değil: işaretsizse bekliyor, işaretliyse gönderildi; elle değer kazanır", () => {
    expect(kalipDurumuTuret({ uretimFormId: 91 }, musteriKalipAnahtari(1, 1), H)).toBe(K.BEKLIYOR);
    expect(kalipDurumuTuret({ uretimFormGonder: true, uretimFormId: 91 }, musteriKalipAnahtari(1, 1), H)).toBe(K.GONDERILDI);
    expect(kalipDurumuOf({ uretimFormId: 91, kalipDurumu: K.URETIMDE }, musteriKalipAnahtari(1, 1), H)).toBe(K.URETIMDE);
    // Bekleyen ölçütü ile türetme aynı bağı söyler: bekleyen kalıp ne "üretimde" ne "hazır".
    for (const k of [{ uretimFormId: 91 }, { uretimFormGonder: true, uretimFormId: 91 }, { uretimFormGonder: true }]) {
      expect(kalipBekliyorMu(k, musteriKalipAnahtari(1, 1), H)).toBe(true);
      expect([K.BEKLIYOR, K.GONDERILDI]).toContain(kalipDurumuTuret(k, musteriKalipAnahtari(1, 1), H));
    }
  });
});

describe("Spec 0108: başlangıç tarihi (R10, R18/2)", () => {
  it("AC-22 / AC-34: üçüncü argüman uretimFormlari; bağı kopmuş geçmiş tarihli kalıp başlangıcı çeker", () => {
    const customers = [{ id: 1, installDate: "2025-02-02", kaliplar: [{ uretimFormGonder: true, uretimFormId: 91 }] }];
    expect(enEskiBekleyenKalipTarihi(customers, [], FORMLAR)).toBe("2025-02-02");
    const bagli = [{ id: 1, installDate: "2025-02-02", kaliplar: [{ uretimFormGonder: true, uretimFormId: 90 }] }];
    expect(enEskiBekleyenKalipTarihi(bagli, [], FORMLAR)).toBe("");
    expect(enEskiBekleyenKalipTarihi([], [{ id: 7, tarih: "2025-03-03", uretimFormId: 91 }], FORMLAR)).toBe("2025-03-03");
    expect(enEskiBekleyenKalipTarihi.length).toBe(0); // üç parametre de varsayılanlı
  });
});

describe("Spec 0108: silme onayının sayısı (R13/2)", () => {
  const FORM = { id: 90, satirlar: [
    { kaynakTip: "musteri", kaynakId: 1, kalipIdx: 0 },  // döner
    { kaynakTip: "extra_kalip", kaynakId: 7 },           // döner
    { kaynakTip: null, kalipAdi: "Elle" },               // elle eklenen: sayılmaz
    { kaynakTip: "musteri", kaynakId: 1, kalipIdx: 1 },  // başka forma (92) damgalı: sayılmaz
    { kaynakTip: "musteri", kaynakId: 2, kalipIdx: 0 },  // kaynağı silinmiş müşteri: sayılmaz
    { kaynakTip: "musteri", kaynakId: 1, kalipIdx: 2 },  // elle hazır: sayılmaz
    { kaynakTip: "extra_kalip", kaynakId: 8 },           // elle teslim: sayılmaz
    // Triyaj bulgu 2 (X7'nin hayalet satır yolu): kalıp zaten bekliyor, damgası çöpteki 93'ü ya da olmayan 94'ü gösteriyor;
    // bu formun silinmesi onu "döndürmez". Şart (damga bu formu göstermeli) kaldırılırsa sayı 4 olur.
    { kaynakTip: "musteri", kaynakId: 3, kalipIdx: 0 },
    { kaynakTip: "extra_kalip", kaynakId: 9 },
  ] };
  const veri = {
    customers: [
      { id: 1, kaliplar: [{ uretimFormGonder: true, uretimFormId: 90 }, { uretimFormGonder: true, uretimFormId: 92 }, { uretimFormGonder: true, uretimFormId: 90, kalipDurumu: K.HAZIR }] },
      { id: 2, deletedAt: "2026-10-01", kaliplar: [{ uretimFormGonder: true, uretimFormId: 90 }] },
      { id: 3, kaliplar: [{ uretimFormGonder: true, uretimFormId: 93 }] },
    ],
    partSales: [{ id: 7, uretimFormId: 90 }, { id: 8, uretimFormGonder: true, uretimFormId: 90, kalipDurumu: K.TESLIM }, { id: 9, uretimFormGonder: true, uretimFormId: 94 }],
    uretimFormlari: [FORM, { id: 92, satirlar: [{ kaynakTip: "musteri", kaynakId: 1, kalipIdx: 1 }] },
      { id: 93, deletedAt: "2026-10-22", satirlar: [{ kaynakTip: "musteri", kaynakId: 3, kalipIdx: 0 }] }],
  };
  it("AC-24 / AC-36: dokuz satırdan yalnız iki kalıp döner; dört sapma ve başka (çöpteki ya da olmayan) forma damgalı satırlar dışlanır", () => {
    expect(formSilinceDonenSayisi(FORM, veri)).toBe(2);
  });
  it("AC-25: dönecek kalıp yoksa 0", () => {
    expect(formSilinceDonenSayisi({ id: 50, satirlar: [{ kaynakTip: null }] }, veri)).toBe(0);
    expect(formSilinceDonenSayisi(null, veri)).toBe(0);
  });
  it("R13/3: metin hemen dönüşü ve geri almayı birlikte söyler", () => {
    expect(formSilmeDonusMetni(2)).toBe("Formdaki 2 kalıp hemen bekleyen kalıplar listesine döner; formu geri alırsanız listeden yeniden çıkar.");
  });
});

describe("Spec 0108: dönem metni (R14/2)", () => {
  it("AC-44 / AC-28: tek gün, aralık, eski tek alan ve '—'", () => {
    expect(uretimFormDonemMetni({ baslangicTarihi: "2026-10-01", bitisTarihi: "2026-10-31" })).toBe("01.10.2026 – 31.10.2026");
    expect(uretimFormDonemMetni({ baslangicTarihi: "2026-10-01", bitisTarihi: "2026-10-01" })).toBe("01.10.2026");
    expect(uretimFormDonemMetni({ tarih: "2025-05-05" })).toBe("05.05.2025");
    expect(uretimFormDonemMetni({})).toBe("—");
  });
});

// ── Taramalar ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
describe("Spec 0108: kaynak taramaları", () => {
  const uretim = yorumsuz(oku("src/components/stock/UretimFormu.jsx"));
  const dash = yorumsuz(oku("src/components/Dashboard.jsx"));
  it("AC-12 / AC-35: iki dosya bekleyen ölçütünü kendi yazmaz (uretimFormId / uretimFormGonder okuması yok; damga yazımı istisna)", () => {
    for (const [ad, s] of [["UretimFormu", uretim], ["Dashboard", dash]]) {
      expect(s, ad).not.toMatch(/\.uretimFormGonder\b/);
      expect(s.replace(/uretimFormId: form\.id/g, ""), ad).not.toMatch(/uretimFormId/);
    }
    expect((uretim.match(/uretimFormId: form\.id/g) || []).length).toBe(2); // AC-30: damgalama adımı (müşteri + Extra Kalıp)
  });
  it("AC-34 / AC-38 / C2/2: üç çağrı yeri haritayı geçer; harita çağrı başına bir kez kurulur", () => {
    expect(uretim).toMatch(/enEskiBekleyenKalipTarihi\(customers, partSales, uretimFormlari\)/);
    expect(uretim.match(/musteriKalibiBekliyorMu\(k, c\.id, i, harita\)/g)).toHaveLength(2);
    expect(uretim.match(/extraKalipBekliyorMu\(ps, harita\)/g)).toHaveLength(2);
    expect(uretim.match(/uretimFormHaritasi\(uretimFormlari\)/g)).toHaveLength(2); // başlangıç tarihi + getirme
    expect(dash).toMatch(/musteriKalibiBekliyorMu\(k, c\.id, i, harita\)/);
    expect(dash).toMatch(/extraKalipBekliyorMu\(ps, harita\)/);
    expect(dash).toMatch(/\}, \[customers, partSales, uretimFormlari\]\);/); // R19
    // Harita döngü içinde kurulmaz.
    for (const s of [uretim, dash]) expect(s).not.toMatch(/for \([^)]*\) \{[^}]*uretimFormHaritasi/);
  });
  it("AC-44: dönem metni tek yardımcıdan; form listesi ve Çöp Kutusu onu çağırır", () => {
    expect(uretim).toMatch(/uretimFormDonemMetni\(f\)/);
    expect(uretim).not.toMatch(/bas === bit \?/);
    expect(oku("src/components/settings/SettingsTrash.jsx")).toMatch(/uretimFormDonemMetni\(u\)/);
  });
  it("AC-31: yeni bölüm, birleştirme anahtarı, izin ya da ayar alanı yok (anlamsal tarama, YAZ_0108=1 yeniden yazar)", () => {
    const simdi = () => JSON.parse(JSON.stringify({ BLOB_SECTIONS, MERGE_KEYS, EYLEM_IDLERI, AYAR_ALAN_SEKMELERI }));
    if (process.env.YAZ_0108 === "1") writeFileSync(path.join(kok, "tests/fixtures/0108-tarama-once.json"), JSON.stringify(simdi(), null, 2) + "\n");
    expect(simdi()).toEqual(JSON.parse(oku("tests/fixtures/0108-tarama-once.json")));
    for (const f of ["electron/db.cjs", "electron/serverAuth.cjs", "electron/server.cjs", "src/lib/merge.js", "src/lib/permissions.js", "src/components/settings/serverPermissionDefs.js"]) {
      expect(oku(f), f).not.toMatch(/kalipBekliyorMu|bagCanliMi|formSilinceDonenSayisi|uretimFormDonemMetni/);
    }
  });
});

// Karar 22: üç yeni kayıt açıkça `ayni` ve son kodla çekilmiş taban raporuna bağlı; iş raporu (eski ↔ yeni) yalnız iki ekranı
// değişmiş gösterir (boş onay eski kodla aynıdır, cümle yok), mevcut ekranların hiçbiri değişmez (C7).
describe("Spec 0108: kanıt kayıtları (Karar 22, C7)", () => {
  const YENI = ["uretim-formu-0108-sil-onay", "uretim-formu-0108-sil-onay-bos", "ayarlar-cop-0108-uretim"];
  it("üç kayıt beklenen 'ayni' ile 0108 taban raporuna bağlı ve orada 0 fark", () => {
    const { dosyalar } = JSON.parse(oku("docs/evidence/kanit-eslemesi.json"));
    const kayitlar = Object.values(dosyalar).flat().filter(k => YENI.includes(k.ekran));
    expect(kayitlar.map(k => k.ekran).sort()).toEqual([...YENI].sort());
    for (const k of kayitlar) expect(k).toMatchObject({ rapor: "docs/evidence/0108-taban-piksel-raporu.json", beklenen: "ayni" });
    const taban = JSON.parse(oku("docs/evidence/0108-taban-piksel-raporu.json"));
    expect(taban.every(r => r.piksel === 0)).toBe(true);
  });
  it("triyaj bulgu 1: 'boş' onay ekranı dönecek kalıbı olmayan formu açar (liste tarihe göre sıralı); iki görüntü farklı", () => {
    const sayfa = oku("scripts/evidence/0009-sayfa.jsx");
    expect(sayfa).toMatch(/"uretim-formu-0108-sil-onay": \[uretim0108\(\[FORM_0108_DOLU, FORM_0108_BOS\]\), \["satir-son-dugme:1"\]\]/);
    expect(sayfa).toMatch(/"uretim-formu-0108-sil-onay-bos": \[uretim0108\(\[FORM_0108_DOLU, FORM_0108_BOS\]\), \["satir-son-dugme:2"\]\]/);
    // FORM_0108_DOLU daha yeni (01.10) olduğu için listede 1. satırda; boş form 2. satırda.
    expect(sayfa).toMatch(/FORM_0108_DOLU = \{ id: 880, baslangicTarihi: "2026-10-01"/);
    expect(sayfa).toMatch(/FORM_0108_BOS = \{ id: 881, baslangicTarihi: "2026-09-15"/);
    for (const tema of ["aydinlik", "karanlik"]) {
      const a = readFileSync(path.join(kok, `docs/evidence/0108-taban-uretim-formu-0108-sil-onay-${tema}.jpg`));
      const b = readFileSync(path.join(kok, `docs/evidence/0108-taban-uretim-formu-0108-sil-onay-bos-${tema}.jpg`));
      expect(a.equals(b), tema).toBe(false);
    }
  });
  it("iş raporunda yalnız silme onayı ve Çöp Kutusu ekranı değişti", () => {
    const is = JSON.parse(oku("docs/evidence/0108-piksel-raporu.json"));
    const degisen = [...new Set(is.filter(r => r.piksel !== 0).map(r => r.ad.replace(/-(aydinlik|karanlik)\.png$/, "")))].sort();
    expect(degisen).toEqual(["ayarlar-cop-0108-uretim", "uretim-formu-0108-sil-onay"]);
  });
});

// Triyaj bulgu 3: kapanış adımları. Plan specs/done'a taşındığında CLAUDE.md'nin 0108 bölümü commit satırını taşır, spec atıf
// testinin taşınacaklar listesi boşalır ve ana dizindeki eski (revizyon 2) spec kopyası kalmaz. Taşınmadan önce sınanmaz.
describe("Spec 0108: kapanış belge düzeni (triyaj bulgu 3)", () => {
  it("plan done'daysa: commit satırı, boş TASINACAK, eski kopya yok; değilse TASINACAK 0108 planını taşır", async () => {
    const { existsSync } = await import("node:fs");
    const atif = oku("tests/spec-atiflari.test.js");
    if (!existsSync(path.join(kok, "specs/done/0108-uygulama-plani.md"))) {
      expect(atif).toMatch(/TASINACAK = \["0108-uygulama-plani\.md"\]/);
      return;
    }
    const claude = oku("CLAUDE.md");
    const bolum = claude.slice(claude.indexOf("(spec 0108, plan"), claude.indexOf("(spec 0107, plan"));
    expect(bolum).toMatch(/Tamamlandı: commit `[0-9a-f]{7}`/);
    expect(atif).not.toMatch(/TASINACAK = \[[^\]]*0108/);
    expect(existsSync(path.join(kok, "specs/0108-uretim-formu-bagi-kopunca-kalip-bekleyen-olur.md"))).toBe(false);
  });
});
