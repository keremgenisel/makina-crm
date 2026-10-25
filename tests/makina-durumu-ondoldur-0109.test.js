// Spec 0109: makina durumu stoktan ön doldurulur. Saf yardımcı, iki sözlüğün eşitliği, damgalayıcının değişmeyen imzası ve
// kaynak taramaları.
import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { makinaDurumuOnDoldur, makinaDurumuDamgala, MAKINA_DURUMU_KAYNAK } from "../src/lib/satisKaydi.js";
import { URETIM_DURUMU } from "../src/lib/stokDurumu.js";
import { MAKINA_DURUMU } from "../src/lib/musteriDurumu.js";
import { BLOB_SECTIONS, EYLEM_IDLERI, AYAR_ALAN_SEKMELERI } from "../electron/serverAuth.cjs";
import { MERGE_KEYS } from "../src/lib/merge.js";

const kok = path.join(__dirname, "..");
const oku = (f) => readFileSync(path.join(kok, f), "utf-8");
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

describe("Spec 0109: ön doldurma yardımcısı (R2, R11/2)", () => {
  it("AC-30 / R2: montajda → montaj, satışa hazır ya da alanı boş → hazir; satır yoksa boş nesne", () => {
    expect(makinaDurumuOnDoldur({ uretimDurumu: "montaj" })).toEqual({ makinaDurumu: "montaj" });
    expect(makinaDurumuOnDoldur({ uretimDurumu: "hazir" })).toEqual({ makinaDurumu: "hazir" });
    expect(makinaDurumuOnDoldur({})).toEqual({ makinaDurumu: "hazir" });
    expect(makinaDurumuOnDoldur(null)).toEqual({});
    expect(makinaDurumuOnDoldur(undefined)).toEqual({});
  });
  it("AC-35: iki sözlüğün montaj ve hazir değerleri birebir eşit", () => {
    expect(URETIM_DURUMU.MONTAJ).toBe(MAKINA_DURUMU.MONTAJ);
    expect(URETIM_DURUMU.HAZIR).toBe(MAKINA_DURUMU.HAZIR);
  });
  it("AC-29: damgalayıcının imzası ve 'dolu alana dokunmaz' kuralı aynen", () => {
    expect(makinaDurumuDamgala.length).toBe(2);
    expect(makinaDurumuDamgala({ makinaDurumu: "teslim" }, { uretimDurumu: "montaj" })).toEqual({ makinaDurumu: "teslim" });
    expect(makinaDurumuDamgala({}, { uretimDurumu: "montaj" })).toEqual({ makinaDurumu: "montaj" });
    expect(makinaDurumuDamgala({ a: 1 }, null)).toEqual({ a: 1 });
  });
  it("R17: işaretin üç değeri (yokluk, ondoldu, elle) tek yerde", () => {
    expect(MAKINA_DURUMU_KAYNAK).toEqual({ ALAN: "_makinaDurumuKaynak", ONDOLDU: "ondoldu", ELLE: "elle" });
  });
});

describe("Spec 0109: kaynak taramaları", () => {
  const kayit = yorumsuz(oku("src/lib/satisKaydi.js"));
  const form = yorumsuz(oku("src/components/customers/CustomerAddEditForm.jsx"));
  const musteriler = yorumsuz(oku("src/components/Customers.jsx"));
  it("AC-30 / AC-17: damgalayıcı ve form aynı yardımcıyı çağırır; form uretimDurumuOf çağırmaz", () => {
    const govde = kayit.slice(kayit.indexOf("export const makinaDurumuDamgala"), kayit.indexOf("export const makinaDurumuOnDoldur"));
    expect(govde).toMatch(/makinaDurumuOnDoldur\(stokSatiri\)/);
    expect(govde).not.toMatch(/uretimDurumuOf/);
    expect(form).toMatch(/import \{ makinaDurumuOnDoldur, MAKINA_DURUMU_KAYNAK \} from "..\/..\/lib\/satisKaydi"/);
    expect(form).not.toMatch(/uretimDurumuOf/);
  });
  it("R18: işaretin dört noktası (iki ayıklama, iki çağrı) ve kapı deductMachineStock içinde", () => {
    expect(musteriler.match(/_kitTipler, _makinaDurumuKaynak, \.\.\.temiz \} = form;/g)).toHaveLength(2);
    expect(musteriler.match(/deductMachineStock\(clean, \{ _stokSerisiz, _manualSerial, _makinaDurumuKaynak \}\)/g)).toHaveLength(2);
    const dms = musteriler.slice(musteriler.indexOf("const deductMachineStock"), musteriler.indexOf("const doAdd"));
    expect(dms).toMatch(/MAKINA_DURUMU_KAYNAK\.ONDOLDU\) delete clean\.makinaDurumu/);
    expect(dms).toMatch(/MAKINA_DURUMU_KAYNAK\.ELLE \?/);
    expect(musteriler.match(/MAKINA_DURUMU_KAYNAK\./g)).toHaveLength(2); // kapı başka yerde kurulmaz
  });
  it("R7/2: model değişimindeki temizlik serisiz koşulun dışında", () => {
    expect(form).toMatch(/\.\.\.\(p\.model !== m\.model \? makinaDurumuTemizle\(p\) : p\)/);
  });
  it("AC-24: yeni bölüm, birleştirme anahtarı, izin ya da ayar alanı yok (anlamsal tarama, YAZ_0109=1 yeniden yazar)", () => {
    const simdi = () => JSON.parse(JSON.stringify({ BLOB_SECTIONS, MERGE_KEYS, EYLEM_IDLERI, AYAR_ALAN_SEKMELERI }));
    if (process.env.YAZ_0109 === "1") writeFileSync(path.join(kok, "tests/fixtures/0109-tarama-once.json"), JSON.stringify(simdi(), null, 2) + "\n");
    expect(simdi()).toEqual(JSON.parse(oku("tests/fixtures/0109-tarama-once.json")));
    for (const f of ["electron/db.cjs", "electron/serverAuth.cjs", "electron/server.cjs", "src/lib/merge.js"]) {
      expect(oku(f), f).not.toMatch(/_makinaDurumuKaynak|makinaDurumuOnDoldur/);
    }
  });
});

// Karar 16 (AC-33): üç yeni kayıt ve değişen tek mevcut ekran (`musteri-formu-0104-stok`, seçici artık "Hazır") son kodla çekilmiş
// taban raporuna `ayni` bağlı; iş raporunda (eski ↔ yeni) yalnız bu ekran ile iki ön doldurma ekranı değişti, "Manuel gir"
// ekranı eskisiyle aynı ("Seçilmedi"); öteki müşteri formu ve liste ekranları 0 fark.
describe("Spec 0109: kanıt kayıtları (AC-33, Karar 16)", () => {
  const KAYIT = ["musteri-formu-0104-stok", "musteri-formu-0109-montaj", "musteri-formu-0109-hazir", "musteri-formu-0109-manuel"];
  it("dört kayıt beklenen 'ayni' ile 0109 taban raporuna bağlı ve taban 0 fark", () => {
    const { dosyalar } = JSON.parse(oku("docs/evidence/kanit-eslemesi.json"));
    // 0104-stok'un 0105 ve 0106 tabanlarına bağlı öteki iki kaydı o raporların (eski kod) görüntüsüyle yerinde kalır.
    const kayitlar = dosyalar["src/components/customers/CustomerAddEditForm.jsx"].filter(k => KAYIT.includes(k.ekran) && k.rapor.includes("0109"));
    expect(kayitlar.map(k => k.ekran).sort()).toEqual([...KAYIT].sort());
    for (const k of kayitlar) expect(k).toMatchObject({ rapor: "docs/evidence/0109-taban-piksel-raporu.json", beklenen: "ayni" });
    expect(JSON.parse(oku("docs/evidence/0109-taban-piksel-raporu.json")).every(r => r.piksel === 0)).toBe(true);
  });
  it("iş raporunda değişen ekranlar yalnız 0104-stok ve iki ön doldurma ekranı", () => {
    const is = JSON.parse(oku("docs/evidence/0109-piksel-raporu.json"));
    const degisen = [...new Set(is.filter(r => r.piksel !== 0).map(r => r.ad.replace(/-(aydinlik|karanlik)\.png$/, "")))].sort();
    expect(degisen).toEqual(["musteri-formu-0104-stok", "musteri-formu-0109-hazir", "musteri-formu-0109-montaj"]);
  });
});

// Triyaj bulgu 2: CLAUDE.md'nin 0106 bölümü kendisiyle çelişmez (eski "önizleme göstermez" cümlesi kalmadı).
describe("Spec 0109 triyaj: belge", () => {
  it("CLAUDE.md 0106 bölümü ön doldurmayı ve 'dokunmadıysa' kuralını söyler, eski cümle yok", () => {
    const c = oku("CLAUDE.md");
    const bolum = c.slice(c.indexOf("(spec 0106, plan"), c.indexOf("(spec 0105, plan"));
    expect(bolum).not.toMatch(/önizleme göstermez/);
    expect(bolum).toMatch(/stok satırından ön doldurur; kayıt anında damga yalnız kullanıcı dokunmadıysa yazar/);
  });
  it("Karar 21: temizlik yalnız ONDOLDU işaretinde", () => {
    const form = yorumsuz(oku("src/components/customers/CustomerAddEditForm.jsx"));
    expect(form).toMatch(/const makinaDurumuTemizle = \(p\) => \(p\[MAKINA_DURUMU_KAYNAK\.ALAN\] === MAKINA_DURUMU_KAYNAK\.ONDOLDU/);
  });
});
