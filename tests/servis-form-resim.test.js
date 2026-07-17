// @vitest-environment jsdom
// Servis formu çıktısına eklenen servis resimleri: fabrika notunun ALTINDA, satırda 3 tane,
// aralarında ve bölümün etrafında boşluk, boy A4'ün 1/5'i.
import { describe, it, expect } from "vitest";
import { buildServiceFormHtml } from "../src/lib/printTemplates";

const sv = { id: 5, customerId: 1, date: "2026-07-17", type: "Periyodik Bakım", fabrikaNotu: "Fabrika notu metni" };
const customers = [{ id: 1, name: "Konya Endüstri A.Ş.", serialNo: "SN-1012", model: "AM-60" }];
const resim = (n) => ({ dataUrl: "data:image/png;base64,AAA" + n, ad: "resim" + n + ".png" });

describe("servis formu çıktısı — resimler", () => {
  it("resim yoksa bölüm hiç çıkmaz", () => {
    // Not: stil bloğu her zaman var; asıl bakılacak olan bölümün kendisi.
    const h = buildServiceFormHtml(sv, customers, {}, {});
    expect(h).not.toContain('<div class="servis-resimler">');
    expect(h).not.toContain("SERVİS RESİMLERİ");
    expect(h).not.toContain("sr-hucre\"><img");
  });

  it("resimler fabrika notunun ALTINA gelir", () => {
    const h = buildServiceFormHtml(sv, customers, {}, { resimler: [resim(1)] });
    expect(h.indexOf("FABRİKA NOTU")).toBeGreaterThan(-1);
    expect(h.indexOf("SERVİS RESİMLERİ")).toBeGreaterThan(h.indexOf("FABRİKA NOTU"));
  });

  it("her resim çıktıya gömülür (yazdırma penceresi dosya yolunu göremez)", () => {
    const h = buildServiceFormHtml(sv, customers, {}, { resimler: [resim(1), resim(2), resim(3), resim(4)] });
    for (const n of [1, 2, 3, 4]) expect(h).toContain("data:image/png;base64,AAA" + n);
    expect((h.match(/class="sr-hucre"/g) || []).length).toBe(4);
  });

  it("satıra 3 resim sığar ve aralarında boşluk var", () => {
    const h = buildServiceFormHtml(sv, customers, {}, { resimler: [resim(1)] });
    expect(h).toContain("width: calc((100% - 12mm) / 3)");   // 3 sütun, iki boşluk payı düşülmüş
    expect(h).toMatch(/\.servis-resimler \{[^}]*gap: 6mm/);   // aralarında boşluk
  });

  it("bölümün altında ve üstünde boşluk var", () => {
    const h = buildServiceFormHtml(sv, customers, {}, { resimler: [resim(1)] });
    expect(h).toMatch(/\.servis-resimler \{[^}]*margin: 6mm 0 10mm/);
  });

  it("resim boyu A4'ün beşte biri (297mm / 5 = 59.4mm)", () => {
    const h = buildServiceFormHtml(sv, customers, {}, { resimler: [resim(1)] });
    expect(h).toContain("height: 59.4mm");
    expect(h).toContain("object-fit: contain");   // oran bozulmasın
  });

  it("İngilizce çıktıda başlık İngilizce", () => {
    const h = buildServiceFormHtml(sv, customers, {}, { resimler: [resim(1)], translations: { _lang: "EN" } });
    expect(h).toContain("SERVICE PHOTOS");
  });

  it("resim adı kaçırılır: HTML özniteliğinden çıkılamaz", () => {
    // Resim adı alt="..." özniteliğinin içinde. Tırnak kaçmazsa öznitelikten çıkılıp
    // onerror=... eklenebiliyordu; yazdırma penceresi ayrı bir pencere olduğu için
    // orada çalışan betik basılan belgeyi değiştirebilir ya da dışarı sızdırabilir.
    // Doğru soru "bu metin çıktıda geçiyor mu" değil ("onerror=" kaçırılmış hâlde öznitelik
    // DEĞERİNİN içinde durabilir, zararsız), "öznitelikten çıkılabiliyor mu". O yüzden HTML
    // gerçekten ayrıştırılıp soruluyor.
    const yukler = [
      '"><script>alert(1)</script>',
      'x" onerror="alert(1)',
      "x' onerror='alert(1)",
      "</title><script>alert(1)</script>",
    ];
    for (const ad of yukler) {
      const h = buildServiceFormHtml(sv, customers, {}, { resimler: [{ dataUrl: "data:image/png;base64,X", ad }] });
      const doc = new DOMParser().parseFromString(h, "text/html");
      const img = doc.querySelector(".sr-hucre img");
      expect(img, ad).toBeTruthy();
      // Ad tek parça bir öznitelik değeri olarak kalmalı: bölünmemiş, olay işleyicisi doğmamış
      expect(img.getAttribute("alt"), ad).toBe(ad);
      expect(img.hasAttribute("onerror"), ad).toBe(false);
      // Şablonun kendi otomatik-yazdırma betiği var; olmaması gereken YÜKTEN doğan betik.
      const yukBetigi = [...doc.querySelectorAll("script")].some((x) => /alert\(1\)/.test(x.textContent));
      expect(yukBetigi, ad).toBe(false);
    }
  });
});
