// Spec 0086: yedekleme paketleri geri yükledikleri bölümleri tek kaynaktan söyler. Saf paket listesi ve cümle üretimi;
// iki tarama (geri yükleme dalı ↔ paket listesi satır bazlı ve iki yönlü, paketlerin birleşimi = bütün veri bölümleri);
// iki sözlüğün eşitliği; kimlik sayacı kuralı; değişmeyen katmanlar.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { YEDEK_PAKETLERI, restorePaketleri, paketNotlari, GIDER_AYAR_NOTU, KASASIZ_NOTU, YEREL_AYAR_NOTU, DOSYA_NOTU } from "../src/lib/yedekPaketleri";
import { BOLUM_ADLARI, EK_ADLARI, paketCumlesi, girdiBolumu } from "../src/lib/bolumAdlari";
import { BACKUP_SCHEMA_VERSION } from "../src/lib/constants";
import { YEREL_AYAR_ALANLARI } from "../src/lib/utils";

const KOK = path.resolve(__dirname, "..");
const oku = (p) => fs.readFileSync(path.join(KOK, p), "utf8");
const YEDEK_DOSYA = "src/components/settings/SettingsBackup.jsx";
const kaynak = oku(YEDEK_DOSYA);
const satirlar = kaynak.split("\n");
// Sunucunun işlem kaydı sözlüğü (server.cjs Electron ister; nesne metinden ayrıştırılır).
const sunucuAdlari = (() => {
  const s = oku("electron/server.cjs"); const i = s.indexOf("const BOLUM_ADLARI = {");
  return new Function(`return ${s.slice(s.indexOf("{", i), s.indexOf("};", i) + 1)}`)();
})();
const BLOB = Object.keys(sunucuAdlari);
const paketBolumleri = (p) => (p.bolumler || []).map(girdiBolumu);
const BIRLESIM = [...new Set(YEDEK_PAKETLERI.flatMap(paketBolumleri))];
const pk = (id) => YEDEK_PAKETLERI.find(p => p.id === id);

describe("Spec 0086 R1, R2: paket listesi ve cümle", () => {
  it("AC-1: her paket bolumler taşır; girdi düz kimlik ya da { bolum, metin }; özel biçim üç yerde (cekler iki pay, teklifler)", () => {
    expect(YEDEK_PAKETLERI.map(p => p.id)).toEqual(["musteri", "evrak", "stok", "bayi", "dosyalar", "tanim", "not", "gider", "ayar"]);
    for (const p of YEDEK_PAKETLERI) { expect(Array.isArray(p.bolumler) && p.bolumler.length > 0, p.id).toBe(true); }
    const ozel = YEDEK_PAKETLERI.flatMap(p => p.bolumler.filter(g => typeof g !== "string").map(g => `${p.id}:${g.bolum}`));
    expect(ozel).toEqual(["musteri:cekler", "evrak:teklifler", "gider:cekler"]);
    for (const g of YEDEK_PAKETLERI.flatMap(p => p.bolumler)) {
      if (typeof g === "string") expect(BLOB, g).toContain(g); else expect(Object.keys(g).sort()).toEqual(["bolum", "metin"]);
    }
  });
  it("AC-2: ekler yalnız mailConfig ve mailLog, ikisi de blob bölümü değil", () => {
    expect(YEDEK_PAKETLERI.flatMap(p => p.ekler || [])).toEqual(["mailConfig", "mailLog"]);
    expect(pk("ayar").ekler).toEqual(["mailConfig", "mailLog"]);
    for (const e of ["mailConfig", "mailLog"]) { expect(BLOB).not.toContain(e); expect(BOLUM_ADLARI[e]).toBeUndefined(); expect(EK_ADLARI[e]).toBeTruthy(); }
  });
  it("AC-3, AC-8, AC-9: dokuz paketin cümlesi listeden üretilir ve kendi bölümlerinin adlarını taşır", () => {
    expect(Object.fromEntries(YEDEK_PAKETLERI.map(p => [p.id, paketCumlesi(p)]))).toEqual({
      musteri: "müşteriler, servisler, kalıp/parça satışları, ödemeler, tahsilata bağlı çekler, görüşmeler",
      evrak: "teklifler ve proformalar, faturalar",
      stok: "makina stoğu, parça stoğu, stok hareketleri, üretim formları, yedek parça satışları",
      bayi: "bayiler",
      dosyalar: "dosyalar",
      tanim: "özel modeller, standart modeller, kalıp tanımları, parça tipleri, yedek parça tanımları, firma çalışanları",
      not: "notlar",
      gider: "giderler, tekrarlayan giderler, gider türleri, tedarikçiler, üretim partileri, kasa ve banka hesapları, hesap hareketleri, bağsız ve verilen çekler, kasa iş listesi (kapsam dışı)",
      ayar: "firma bilgileri, uygulama ayarları, e-posta yapılandırması, e-posta geçmişi",
    });
  });
  it("AC-5: küçültme trLower ile (\"kasa iş listesi\", bozuk i̇ yok); cümle üretiminde toLowerCase yok", () => {
    expect(paketCumlesi({ bolumler: ["kasaKapsamDisi"] })).toBe("kasa iş listesi (kapsam dışı)");
    expect(paketCumlesi(pk("gider"))).not.toMatch(/i̇/);
    for (const f of ["src/lib/bolumAdlari.js", "src/lib/yedekPaketleri.js", YEDEK_DOSYA]) expect(oku(f), f).not.toContain("toLowerCase(");
  });
  it("AC-6: çek iki pakette kendi payıyla; \"çekler\" tek başına iki pakette birden geçmez", () => {
    const cumleler = YEDEK_PAKETLERI.map(paketCumlesi);
    expect(cumleler.filter(c => /(^|, )çekler(,|$)/.test(c))).toEqual([]);
    expect(paketCumlesi(pk("musteri"))).toContain("tahsilata bağlı çekler");
    expect(paketCumlesi(pk("gider"))).toContain("bağsız ve verilen çekler");
  });
  it("R6: gider paketi yalnız gider yetkisiyle; diğerlerinin kimliği, sırası ve sayısı aynı", () => {
    expect(restorePaketleri({ giderYetki: true }).map(p => p.id)).toEqual(YEDEK_PAKETLERI.map(p => p.id));
    expect(restorePaketleri({ giderYetki: false }).map(p => p.id)).toEqual(["musteri", "evrak", "stok", "bayi", "dosyalar", "tanim", "not", "ayar"]);
  });
});

describe("Spec 0086 R5, R8, R11: notlar", () => {
  it("AC-10: gider ayarları notu sekiz ayarı sayar ve Firma ve ayarlar paketini söyler", () => {
    for (const ad of ["gider takibi yürürlük ayı", "varsayılan kira stopaj oranı", "kira stopajı beyan dönemi", "stopaj ödeme günü",
      "ödeme hatırlatma eşiği", "binek araç giderlerinde indirilebilir oran", "hesapsız kayıt başlangıç tarihi", "deneme dönemi bitiş tarihi"]) {
      expect(GIDER_AYAR_NOTU, ad).toContain(ad);
    }
    expect(GIDER_AYAR_NOTU).toContain("\"Firma ve ayarlar\" paketinde");
    // Sekiz alanın her biri SettingsGider'de bu etiketle duruyor (etiket değişirse not da değişmeli).
    const sg = oku("src/components/settings/SettingsGider.jsx");
    for (const e of ["Varsayılan kira stopaj oranı", "Kira stopajı beyan dönemi", "Stopaj ödeme günü", "Binek araç giderlerinde indirilebilir oran",
      "Gider takibi yürürlük ayı", "Ödeme hatırlatma eşiği", "Deneme dönemi bitiş tarihi", "Hesapsız kayıt başlangıç tarihi"]) expect(sg, e).toContain(`label="${e}`);
  });
  it("AC-11: makinaya özgü alanların notu YEREL_AYAR_ALANLARI'nın dördünü anlatır", () => {
    expect(YEREL_AYAR_ALANLARI).toEqual(["autoBackup", "backupFolder", "frequency", "lastBackup"]);
    for (const ad of ["otomatik yedek", "yedek klasörü", "yedekleme sıklığı", "son yedek tarihi", "geri yüklenmez"]) expect(YEREL_AYAR_NOTU).toContain(ad);
  });
  // Triyaj bulgu 1: dosyaların kendisi yedek açılırken (paket seçiminden ve Vazgeç'ten bağımsız) depoya yazılır; kutu yalnız
  // dosya listesini geri yükler. Notun doğruluğu bu iki köprü çağrısına ve üzerine yazan yazıma bağlı: değişirse not da değişmeli.
  it("Dosyalar notu: dosyaların yedek açılırken yazıldığı (iki köprü yolu, üzerine yazma) ve kutunun yalnız listeyi geri yüklediği", () => {
    expect(paketNotlari(pk("dosyalar"), { kasaVeriYetki: true })).toEqual([DOSYA_NOTU]);
    expect(DOSYA_NOTU).toContain("yedek açılırken depoya eklenir");
    expect(DOSYA_NOTU).toContain("yalnız müşteri, makina, servis ve bayi kayıtlarına bağlı dosya listesini");
    const data = oku("electron/ipc/data.cjs");
    expect(data).toContain("files.geriYukleDosyalar(app, bekleyenSifreliRestoreYolu, password)"); // şifreli: parola girilince
    expect(data).toContain("files.geriYukleDosyalar(app, yol); // düz yedek → dosyalar hemen geri gelir");
    const files = oku("electron/files.cjs");
    const yaz = files.slice(files.indexOf("function yedekDosyaYaz("), files.indexOf("function", files.indexOf("function yedekDosyaYaz(") + 10));
    expect(yaz).toContain("fs.writeFileSync(hedefYol, Buffer.from(buf));"); // aynı adlı dosyanın üzerine yazar
    expect(kaynak).not.toMatch(/geriYukleDosyalar|appFiles/); // Dosyalar kutusu fiziksel dosyalara dokunmaz
  });
  // Triyaj bulgu 2: SettingsBackup kasa hesaplarını ve kasa iş listesini Kasa iznine bakmadan yazar; KASASIZ_NOTU'nun "korunur"
  // iddiası yalnız App'in bu iki setter'ı Kasa sekmesiyle vermesi sayesinde doğrudur. Üç satır birlikte taranır.
  it("KASASIZ_NOTU'nun dayanağı: App kasa hesabı ve iş listesi setter'larını ve kasaVeriYetki'yi Kasa sekmesine bağlar", () => {
    const app = oku("src/App.jsx");
    const ayar = app.slice(app.indexOf('{activeTab === "settings"'), app.indexOf("\n", app.indexOf('{activeTab === "settings"')));
    expect(ayar).toContain("setKasaHesaplari={kasaSekmesi ? setKasaHesaplari : null}");
    expect(ayar).toContain("setKasaKapsamDisi={kasaSekmesi ? setKasaKapsamDisi : null}");
    expect(ayar).toContain("kasaVeriYetki={kasaSekmesi}");
  });
  it("AC-12: Kasa notu yalnız Kasa yetkisi olmayan kullanıcıda; gider notu her zaman", () => {
    expect(paketNotlari(pk("gider"), { kasaVeriYetki: true })).toEqual([GIDER_AYAR_NOTU]);
    expect(paketNotlari(pk("gider"), { kasaVeriYetki: false })).toEqual([GIDER_AYAR_NOTU, KASASIZ_NOTU]);
    expect(paketNotlari(pk("ayar"), { kasaVeriYetki: false })).toEqual([YEREL_AYAR_NOTU]);
    expect(paketNotlari(pk("musteri"), { kasaVeriYetki: false })).toEqual([]);
  });
});

describe("Spec 0086 R3, R10, R9: taramalar", () => {
  // applyRestore gövdesinin satırları (geri yükleme dalı).
  const bas = satirlar.findIndex(l => l.includes("const applyRestore = async () => {"));
  const son = satirlar.findIndex((l, i) => i > bas && l.includes("setRestoreData(null);"));
  const dal = satirlar.slice(bas, son).map((l, i) => ({ no: bas + i + 1, l }));
  const eslesmeler = dal.flatMap(({ no, l }) => {
    const m = /\bsec\("(\w+)"\)/.exec(l); if (!m) return [];
    return [...l.matchAll(/restoreData\??\.([A-Za-z]+)/g)].map(x => ({ no, paket: m[1], bolum: x[1] }));
  });
  // R3 revizyon 3 (P3): tek gerçek istisna. Müşteri paketinin çek payı `payments` koşuluna bağlıdır (AC-7, R4), hiçbir satırda
  // sec("musteri") ile restoreData?.cekler birlikte geçmez. Satır kaynakla birlikte değişirse test düşer (tam yol + satır).
  const ISTISNALAR = [{ dosya: YEDEK_DOSYA, paket: "musteri", bolum: "cekler", metin: 'const cekMusteri = sec("musteri") && Array.isArray(restoreData?.payments);',
    gerekce: "çek bölümünün tahsilata bağlı payı; koşulu payments dizisi" }];

  it("AC-14: dalın her satırındaki bölüm o paketin listesinde (bölüm ya da ek)", () => {
    expect(eslesmeler.length).toBeGreaterThan(30);
    const yanlis = eslesmeler.filter(e => { const p = pk(e.paket); return !p || ![...paketBolumleri(p), ...(p.ekler || [])].includes(e.bolum); })
      .map(e => `${YEDEK_DOSYA}:${e.no} sec("${e.paket}") ${e.bolum}`);
    expect(yanlis).toEqual([]);
  });
  it("AC-14: paketin her bölümü dalda bir satırda geçer; tek istisna tam yol ve satırla yazılı", () => {
    for (const ist of ISTISNALAR) {
      const no = satirlar.findIndex(l => l.trim() === ist.metin) + 1;
      expect(no, `${ist.dosya}: ${ist.metin}`).toBeGreaterThan(0);
      expect(fs.existsSync(path.join(KOK, ist.dosya))).toBe(true);
    }
    const eksik = YEDEK_PAKETLERI.flatMap(p => [...paketBolumleri(p), ...(p.ekler || [])].map(b => ({ p: p.id, b })))
      .filter(({ p, b }) => !eslesmeler.some(e => e.paket === p && e.bolum === b) && !ISTISNALAR.some(i => i.paket === p && i.bolum === b))
      .map(({ p, b }) => `${p}:${b}`);
    expect(eksik).toEqual([]);
  });
  it("AC-15 (R10): paketlerin bolumler birleşimi bütün veri bölümlerine (sunucu BOLUM_ADLARI = BLOB_SECTIONS, 32) eşit", () => {
    expect(BLOB).toHaveLength(32);
    expect([...BIRLESIM].sort()).toEqual([...BLOB].sort());
  });
  it("AC-16 (R9): renderer ve sunucu sözlüğü 32 blob bölümünde aynı anahtar ve adlar; iki e-posta alanı eşitliğin dışında", () => {
    expect(BOLUM_ADLARI).toEqual(sunucuAdlari);
    expect(Object.keys(EK_ADLARI)).toEqual(["mailConfig", "mailLog"]);
  });
  it("AC-17 (C6): kimlik sayacı listesi kimlikli bütün bölümleri kapsar (kimliksiz üç bölüm ve bilinen eksik partTypeDefs hariç)", () => {
    const i = kaynak.indexOf("bumpId(");
    const liste = JSON.parse(kaynak.slice(kaynak.indexOf("[", i), kaynak.indexOf("]", i) + 1));
    // factory/appSettings tekil nesne, standardModels model listesi: kimliksiz. partTypeDefs: X7, açık bulgu (specs/README.md).
    const KIMLIKSIZ = ["factory", "appSettings", "standardModels"], BILINEN_EKSIK = ["partTypeDefs"];
    expect(liste).toHaveLength(28);
    expect([...liste].sort()).toEqual(BIRLESIM.filter(b => !KIMLIKSIZ.includes(b) && !BILINEN_EKSIK.includes(b)).sort());
    const claude = oku("CLAUDE.md");
    expect(claude).toContain("üç senkron noktası");
    expect(claude).toMatch(/geri yükleme dalı[^\n]*`bolumler`[^\n]*kimlik sayacı/);
    expect(oku("specs/README.md")).toMatch(/partTypeDefs[^\n]*kimlik sayacı/);
  });
  it("AC-4 (C4): boş cümle koruması yerinde", () => {
    expect(kaynak).toContain("{pk.aciklama && <span style={{ fontSize: 11.5, color: \"var(--n400, #94a3b8)\" }}>({pk.aciklama})</span>}");
    expect(kaynak).toContain("restorePaketleri({ giderYetki }).map(pk => ({ ...pk, aciklama: paketCumlesi(pk) }))");
  });
});

describe("Spec 0086: değişmeyenler", () => {
  it("AC-22: yedek dosyası biçimi aynı: şema 3, yazılan bölümler = 32 blob + iki e-posta eki + dört başlık", () => {
    expect(BACKUP_SCHEMA_VERSION).toBe(3);
    const satir = satirlar.find(l => l.trim().startsWith("return { app: BACKUP_APP_TAG, schemaVersion: BACKUP_SCHEMA_VERSION, version,"));
    const anahtarlar = satir.trim().replace(/^return \{|\};$/g, "").split(",").map(x => x.trim().split(":")[0].trim()).filter(Boolean);
    expect([...anahtarlar].sort()).toEqual(["app", "schemaVersion", "version", "exportDate", ...BLOB, "mailConfig", "mailLog"].sort());
  });
  it("AC-23 (C3): sunucu, birleştirme ve veritabanı paket listesini ve sözlüğü bilmez", () => {
    for (const f of ["electron/server.cjs", "electron/serverAuth.cjs", "electron/db.cjs", "src/lib/merge.js"]) {
      expect(oku(f), f).not.toMatch(/yedekPaketleri|bolumAdlari|paketCumlesi/);
    }
  });
});

// Triyaj bulgu 3 ve 4: belgelerin uygulamayla çelişmemesi (spec done'a taşınınca yolu değişir, iki yol da aranır).
describe("Spec 0086 triyaj: belgeler", () => {
  const specYolu = ["specs/0086-yedekleme-paketleri-tek-kaynaktan.md", "specs/done/0086-yedekleme-paketleri-tek-kaynaktan.md"]
    .find(f => fs.existsSync(path.join(KOK, f)));
  it("bulgu 3: spec R1 notlar biçimini yazar, DoD üç yeni ekranı sayar, eski kanıt tablosu tarihseldir", () => {
    const spec = oku(specYolu);
    expect(spec).toContain("`notlar: [{ metin, yalnizKasasiz? }]`");
    expect(spec).not.toContain("ekler: [...], not? }");
    expect(spec).not.toContain("dört ekranla (`ayarlar-backup`, `kilit-geri-yukleme` ve iki");
    expect(spec).toMatch(/### Görsel kanıt \(R12'nin dayanağı\)\n\n\*\*Tarihseldir/);
  });
  it("bulgu 4: README'de 0086 satırı önceki paragrafa yapışık değil (önünde boş satır)", () => {
    const r = oku("specs/README.md").split("\n");
    const i = r.findIndex(l => /^\*\*0086 (uygulanıyor|tamamlandı)/.test(l));
    if (i >= 0) expect(r[i - 1]).toBe("");
  });
});
