// @vitest-environment jsdom
// Yazdırma çıktısına giren kullanıcı verisi (XSS).
//
// Yazdırma HTML'i şablon dizeleriyle ham olarak üretilip AYRI bir Electron penceresinde
// açılıyor. O pencerede nodeIntegration kapalı, yani kod yürütmeye dönüşmüyor; ama orada
// çalışan bir betik basılan belgeyi sessizce tahrif edebilir (ör. proformadaki IBAN) ya da
// içeriği dışarı sızdırabilir. En kolay yol el yapımı istek bile gerektirmiyor: kısıtlı bir
// kullanıcı normal formdan müşteri adı yazar, admin yazdırınca admin'in makinesinde çalışır.
//
// Kök neden: şablona NESNE yerine AYRI PARAMETRE olarak giren her alan (resimler, kaseResmi)
// derin kaçış süpürmesinin dışında doğuyor. Bu test o alanları tek tek kilitler.
import { describe, it, expect } from "vitest";
import { buildServiceFormHtml, guvenliKase } from "../src/lib/printTemplates";

const sv = { id: 5, customerId: 1, date: "2026-07-17", type: "Periyodik Bakım", fabrikaNotu: "not" };
const musteri = (ad) => [{ id: 1, name: ad, serialNo: "SN-1", model: "AM-60" }];

const YUKLER = [
  '"><script>alert(1)</script>',
  'x" onerror="alert(1)',
  "</title><script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
];

describe("guvenliKase", () => {
  it("resim data-URL'ini geçirir", () => {
    const v = "data:image/png;base64,iVBORw0KGgo=";
    expect(guvenliKase(v)).toBe(v);
    expect(guvenliKase("data:image/jpeg;base64,AAAA")).toBeTruthy();
  });

  it("data-URL olmayan her şeyi düşürür", () => {
    for (const v of [
      "javascript:alert(1)",
      'x" onerror="alert(1)',
      "data:text/html;base64,PHNjcmlwdD4=",     // resim değil
      "https://kotu.example/x.png",             // dış kaynak
      "data:image/png;base64,AAA\" onload=\"alert(1)",  // tırnakla öznitelikten çıkma
    ]) expect(guvenliKase(v), v).toBe("");
  });

  it("boş/eksik değerde patlamaz", () => {
    for (const v of ["", null, undefined, 0]) expect(guvenliKase(v)).toBe("");
  });
});

describe("servis formu — müşteri adı", () => {
  it("müşteri adı hiçbir yükle betik doğuramaz", () => {
    for (const yuk of YUKLER) {
      const h = buildServiceFormHtml(sv, musteri(yuk), {}, {});
      const doc = new DOMParser().parseFromString(h, "text/html");
      // Şablonun kendi otomatik-yazdırma betiği var; olmaması gereken YÜKTEN doğan betik.
      const yukBetigi = [...doc.querySelectorAll("script")].some((x) => /alert\(1\)/.test(x.textContent));
      expect(yukBetigi, yuk).toBe(false);
      expect(doc.querySelector("img[onerror]"), yuk).toBeNull();
    }
  });
});

describe("servis formu — kaşe resmi", () => {
  it("kötü kaşe değeri çıktıya hiç girmez", () => {
    const h = buildServiceFormHtml(sv, musteri("Firma"), {}, { kaseResmi: 'x" onerror="alert(1)' });
    expect(h).not.toContain("onerror");
    const doc = new DOMParser().parseFromString(h, "text/html");
    expect([...doc.querySelectorAll("img")].some((i) => i.hasAttribute("onerror"))).toBe(false);
  });

  it("geçerli kaşe çıktıda görünmeye devam eder (meşru kullanım kırılmasın)", () => {
    const v = "data:image/png;base64,iVBORw0KGgo=";
    const h = buildServiceFormHtml(sv, musteri("Firma"), {}, { kaseResmi: v });
    expect(h).toContain(v);
  });
});
