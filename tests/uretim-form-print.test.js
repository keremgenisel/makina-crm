// UretimFormu'ndan ayrılan saf yazdırma yardımcıları (uretimFormPrint.js).
// Artık bağımsız modül olduğu için birim-test edilebilir (bileşen içinde inline iken değildi).
import { describe, it, expect } from "vitest";
import { fmtDate, groupByMusteri, buildPrintHtml } from "../src/components/stock/uretimFormPrint.js";

describe("fmtDate", () => {
  it("YYYY-MM-DD → DD.MM.YYYY, boşta —", () => {
    expect(fmtDate("2026-07-12")).toBe("12.07.2026");
    expect(fmtDate("")).toBe("—");
    expect(fmtDate(null)).toBe("—");
  });
});

describe("groupByMusteri", () => {
  it("satırları müşteriye göre ilk görülme sırasını koruyarak gruplar", () => {
    const rows = [
      { musteriId: 1, musteriAdi: "A", sehir: "İst", makinaKodu: "M1", kalipAdi: "k1" },
      { musteriId: 2, musteriAdi: "B", kalipAdi: "k2" },
      { musteriId: 1, musteriAdi: "A", kalipAdi: "k3" },
    ];
    const g = groupByMusteri(rows);
    expect(g.length).toBe(2);
    expect(g[0].musteriAdi).toBe("A");
    expect(g[0].rows.length).toBe(2); // k1 + k3 aynı müşteride
    expect(g[1].musteriAdi).toBe("B");
    expect(g[1].rows.length).toBe(1);
  });
  it("musteriId yoksa ada göre gruplar", () => {
    const g = groupByMusteri([{ musteriAdi: "X" }, { musteriAdi: "X" }, { musteriAdi: "Y" }]);
    expect(g.length).toBe(2);
    expect(g[0].rows.length).toBe(2);
  });
});

describe("buildPrintHtml", () => {
  it("geçerli HTML belgesi üretir, başlık ve dönem içerir", () => {
    const form = {
      baslangicTarihi: "2026-07-01", bitisTarihi: "2026-07-31", not: "Temmuz",
      satirlar: [{ musteriId: 1, musteriAdi: "Firma A", kalipKodu: "K-01", kalipAdi: "Kalıp 1", tamamlandi: true }],
    };
    const html = buildPrintHtml(form);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("KALIP ÜRETİM FORMU");
    expect(html).toContain("01.07.2026 – 31.07.2026"); // tarih aralığı
    expect(html).toContain("Firma A");
    expect(html).toContain("K-01");
    expect(html).toContain("✓"); // tamamlandı işareti
  });
  it("satır yoksa 'Satır yok' gösterir", () => {
    const html = buildPrintHtml({ baslangicTarihi: "2026-07-01", bitisTarihi: "2026-07-01", satirlar: [] });
    expect(html).toContain("Satır yok");
  });
  it("Spec 0115 triyajı: kullanıcı metinleri kaçışlı basılır (tamir satırının adı serbest girişten gelir)", () => {
    const X = '<img src=x onerror="alert(1)">';
    const html = buildPrintHtml({ baslangicTarihi: "2026-07-01", bitisTarihi: "2026-07-01", not: X, satirlar: [{
      musteriId: 1, musteriAdi: X, sehir: X, makinaKodu: X, kalipKodu: X, kalipAdi: X, kalipOlcusu: X, makinaKalipCapi: X,
      kalipResim: 'x" onerror="alert(2)', tur: "tamir", kaynakTip: "servis_tamir" }] });
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain('onerror="alert');
    expect(html.split("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;").length - 1).toBe(8);
  });
});
