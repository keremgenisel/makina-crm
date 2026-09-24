// Spec 0011: sözlük belgesindeki serbest içerik kuralı (AC-7, R5) ve tek şerit tanımı (AC-8, R6).
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const kok = path.join(__dirname, "..");
const oku = (f) => readFileSync(path.join(kok, f), "utf-8");
const tumDosyalar = (dir) => readdirSync(dir).flatMap(ad => {
  const p = path.join(dir, ad);
  return statSync(p).isDirectory() ? tumDosyalar(p) : [p];
});

describe("sözlük: uyarı şeridinin serbest içeriği", () => {
  const doc = oku("docs/tasarim-sozlugu.md");
  const bas = doc.indexOf("\n## UyariSeridi\n");
  const bolum = doc.slice(bas, doc.indexOf("\n## ", bas + 4));
  const serbest = bolum.slice(bolum.indexOf("### Serbest içerik"));

  it("AC-7: Sözlük belgesi serbest içeriğin ne zaman kullanılacağını ve ne zaman kullanılmayacağını yazar; varsayılan biçimin başlık artı açıklama olduğu belirtilir", () => {
    expect(bas).toBeGreaterThan(-1);
    expect(bolum).toContain("### Serbest içerik");
    expect(serbest).toContain("**Varsayılan biçim başlık artı açıklamadır.**");
    expect(serbest).toContain("**Ne zaman kullanılır:**");
    expect(serbest).toContain("**Ne zaman kullanılmaz:**");
    expect(serbest).toMatch(/cümlenin ortasında/);
    expect(serbest).toMatch(/düzen kapısı değildir/); // C5: her ekranın kendi düzenini kurması için değil
    expect(bolum).toMatch(/`children`/);
  });
  it("R4: iki biçim birlikte verilince tanımlı davranış belgede yazılı", () => {
    expect(serbest).toMatch(/`baslik` ve `metin` \*\*yok sayılır\*\*/);
  });
  it("S8: gerçek kullanım olmadığı için serbest içerik uydurma bir dosya:satır örneği taşımaz, ilk kullanımı 0010 diye adlandırır", () => {
    expect(serbest).not.toMatch(/\*\*Örnek:\*\*/);
    expect(serbest).toMatch(/İlk kullanım: spec 0010/);
  });
  it("AC-12: Sözlükteki serbest içerik notu ilk kullanımı kalıcı olarak adlandırır ve sonraki bir işe zorunlu sözlük değişikliği bırakmaz", () => {
    expect(serbest).not.toMatch(/eklenir\.|eklenecek|güncellenecek|güncellenmeli/);
  });
  it("AC-11: sözlük, yeni kullanan ekranın kanıtının veri dosyasına eklendiğini ve test dosyasına dokunulmadığını söyler", () => {
    expect(doc).toContain("docs/evidence/kanit-eslemesi.json");
    expect(doc).toMatch(/Test dosyasına dokunulmaz/);
  });
});

describe("AC-8: Uygulamada ikinci bir uyarı şeridi tanımı bulunmaz", () => {
  const SRC = tumDosyalar(path.join(kok, "src")).filter(f => /\.(js|jsx)$/.test(f));
  it("UyariSeridi yalnız tasarim.jsx'te tanımlı ve tek bir kök çiziyor", () => {
    const tanim = SRC.filter(f => /(?:const|function)\s+UyariSeridi\b/.test(readFileSync(f, "utf-8"))).map(f => path.relative(kok, f));
    expect(tanim).toEqual([path.join("src", "components", "tasarim.jsx")]);
    const s = oku("src/components/tasarim.jsx");
    const govde = s.slice(s.indexOf("export const UyariSeridi"), s.indexOf("// ── Hata metni ve ipucu"));
    expect(govde.match(/role="status"/g)?.length).toBe(1);
  });
  it("üç ailenin renk tablosu (bilgi, uyarı, başarı zeminleri) başka hiçbir dosyada şerit olarak tanımlanmıyor", () => {
    const aileTablosu = SRC.filter(f => {
      const s = readFileSync(f, "utf-8");
      return /--bluBg\b/.test(s) && /--ambBg\b/.test(s) && /--grnBg\b/.test(s) && /role="status"/.test(s);
    }).map(f => path.relative(kok, f));
    expect(aileTablosu).toEqual([path.join("src", "components", "tasarim.jsx")]);
  });
});

// AC-2 görsel kanıtı (plan S6): Giderler'deki altı çağrının her biri kanıt raporunda iki temada çizilmiş ve önce/sonra
// 0 piksel fark. Rapor, görüntü aracının her ekranda çizilen role=status şeritlerinin metnini tutar (scripts/evidence).
describe("AC-2: Bugünkü altı çağrı dönüşümden sonra aynı görünür (piksel kanıtı)", () => {
  const rapor = JSON.parse(oku("docs/evidence/0011-piksel-raporu.json"));
  const CAGRILAR = [
    ["tür tanımsız (bilgi)", "Henüz gider türü tanımlı değil."],
    ["üretim sonucu (bilgi)", "Eylül 2026: 0 kalem eklendi"],
    ["üretim sonucu (başarı)", "Eylül 2026: 1 kalem eklendi"],
    ["geçersiz aralık (uyarı)", "Başlangıç tarihi bitişten sonra olamaz."],
    ["hatırlatma kapsamı (uyarı)", "Hatırlatma kapsamı:"],
    ["kapsam dışı (uyarı)", "arası kapsam dışı."],
    ["mükerrer tanım (uyarı)", "Aynı tanımdan bu dönemde birden fazla kalem var."],
  ];
  it.each(CAGRILAR)("%s: iki temada çizildi, 0 piksel fark, JPEG depoda", (_ad, metin) => {
    for (const tema of ["aydinlik", "karanlik"]) {
      const kayitlar = rapor.filter(r => r.ad.endsWith(`-${tema}.png`) && (r.seritler || []).some(s => s.includes(metin)));
      expect(kayitlar.length, `${metin} / ${tema}`).toBeGreaterThan(0);
      for (const r of kayitlar) {
        expect(r.piksel, r.ad).toBe(0);
        expect(r.cizimHatasi, r.ad).toBeUndefined();
        expect(readdirSync(path.join(kok, "docs/evidence"))).toContain(`0011-${r.ad.replace(/\.png$/, ".jpg")}`);
      }
    }
  });
  it("serbest içerik örneği yalnız 'sonra' olarak kanıtta (önceki bileşen children almıyordu), iki temada", () => {
    for (const tema of ["aydinlik", "karanlik"]) {
      const r = rapor.find(x => x.ad === `sozluk-serbest-icerik-${tema}.png`);
      expect(r?.fark).toBe("önce görüntüsü yok");
      expect(r.seritler.length).toBe(3);
    }
  });
  it("raporda önce görüntüsü olan hiçbir ekranda fark ya da çizim hatası yok", () => {
    expect(rapor.filter(r => r.fark !== "önce görüntüsü yok" && (r.piksel !== 0 || r.cizimHatasi))).toEqual([]);
  });
});
