// Spec 0095 AC-27: işaret alanı olmayan eski kayıtların bedeli, borcu, geliri, tahsilatı, aylık raporu (+HTML), dışa
// aktarma satırı, bayi silme onayı ve Anasayfa son satışları spec öncesi kodla birebir aynı. "Önce" dosyası spec
// 0095'ten ÖNCEKİ kodla YAZ_0095=1 ile üretildi (tests/fixtures/0095-ucretsizsiz-once.json).
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "node:fs";
import { motorCiktilari } from "./fixtures/0095-veri";

const ONCE = "tests/fixtures/0095-ucretsizsiz-once.json";
beforeAll(() => vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-20T10:00:00") }));
afterAll(() => vi.useRealTimers());

// R19: yedek parça satırına "Ücretsiz mi?" sütunu "Ürün Bedeli (Komisyon Hariç)"in ardına (indis 8) girer; eski
// sütunlar aynı kalır. Kıyas yeni sütunu çıkarıp yapılır; sütunun kendisi tests/yedek-parca-export.test.js'te.
export const UCRETSIZ_SUTUN = 8;
const sutunsuz = (satir) => satir.filter((_, i) => i !== UCRETSIZ_SUTUN);

describe("Spec 0095 AC-27: işaretsiz eski kayıtlar spec öncesiyle aynı", () => {
  it("AC-27: bedel, borçluluk, tahsilat kalemleri, hesap sorusu, müşteri borcu, aylık rapor ve HTML'i, dışa aktarma, bayi silme onayı, son satışlar", () => {
    const simdi = motorCiktilari();
    if (process.env.YAZ_0095 === "1") { fs.writeFileSync(ONCE, JSON.stringify(simdi, null, 1)); return; }
    const once = JSON.parse(fs.readFileSync(ONCE, "utf8"));
    const { yedekExport: yOnce, ...oDiger } = once;
    const { yedekExport: ySimdi, ...sDiger } = simdi;
    expect(sDiger).toEqual(oDiger);
    expect(ySimdi.length).toBe(yOnce.length);
    ySimdi.forEach((s, i) => {
      expect(s[UCRETSIZ_SUTUN], `satır ${i}`).toBe("Hayır");
      expect(sutunsuz(s), `satır ${i}`).toEqual(yOnce[i]);
    });
  });
});
