// JWT imza anahtarı göç kararı: safeStorage dosyası > DB'deki eski anahtar (korunarak taşınır) > yeni üretilen.
import { describe, it, expect } from "vitest";
import { planSecret } from "../electron/jwtSecret.cjs";

describe("planSecret — jwtSecret göç kararı", () => {
  it("safeStorage dosyasındaki anahtar varsa onu kullanır, hiçbir yere yazmaz", () => {
    const p = planSecret({ fileSecret: "DOSYA", dbSecret: "ESKI", generated: "YENI", canEncrypt: true });
    expect(p).toEqual({ secret: "DOSYA", writeFile: false, clearDb: false, dbFallback: false });
  });

  it("dosya yok ama DB'de eski anahtar var: onu KORUYARAK dosyaya taşır ve DB'yi temizler", () => {
    const p = planSecret({ fileSecret: null, dbSecret: "ESKI", generated: "YENI", canEncrypt: true });
    expect(p.secret).toBe("ESKI");   // token'lar geçersiz olmasın diye eski anahtar korunur
    expect(p.writeFile).toBe(true);
    expect(p.clearDb).toBe(true);
  });

  it("hiç anahtar yok: yeni üretileni dosyaya yazar, DB temizlemez", () => {
    const p = planSecret({ fileSecret: null, dbSecret: null, generated: "YENI", canEncrypt: true });
    expect(p.secret).toBe("YENI");
    expect(p.writeFile).toBe(true);
    expect(p.clearDb).toBe(false);
  });

  it("safeStorage kullanılamıyorsa eski davranışa düşer (DB'de tut), dosyaya yazmaz", () => {
    const p = planSecret({ fileSecret: null, dbSecret: null, generated: "YENI", canEncrypt: false });
    expect(p).toEqual({ secret: "YENI", writeFile: false, clearDb: false, dbFallback: true });
    const p2 = planSecret({ fileSecret: null, dbSecret: "ESKI", generated: "YENI", canEncrypt: false });
    expect(p2.secret).toBe("ESKI"); // mevcut anahtar yine korunur
    expect(p2.writeFile).toBe(false);
  });
});
