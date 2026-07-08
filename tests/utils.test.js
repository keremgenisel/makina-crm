// Saf yardımcı fonksiyon testleri (src/lib/utils.js) — framework'süz, Node ortamında koşar.
import { describe, it, expect } from "vitest";
import {
  parseMoney, normalizeSaleType, calcKDV, customerHasAnyDebt, purgeOldTrash, numberToWordsEN, parseKurRate, calcTL, applyKurToForm, aramaNormalize,
} from "../src/lib/utils";

describe("parseMoney", () => {
  it("Türkçe biçimli parayı sayıya çevirir", () => {
    expect(parseMoney("450.000 ₺")).toBe(450000);
    expect(parseMoney("1.250,50")).toBe(1250.5);
  });
  it("boş/geçersiz girdide 0 döner", () => {
    expect(parseMoney("")).toBe(0);
    expect(parseMoney(null)).toBe(0);
    expect(parseMoney("—")).toBe(0);
  });
  it("sayı girdisini olduğu gibi kabul eder", () => {
    expect(parseMoney(850)).toBe(850);
  });
});

describe("normalizeSaleType", () => {
  it("güncel değerleri olduğu gibi tanır", () => {
    expect(normalizeSaleType("Faturalı Yurtiçi")).toBe("Faturalı Yurtiçi");
    expect(normalizeSaleType("Faturasız Yurtdışı")).toBe("Faturasız Yurtdışı");
  });
  it("eski üçlü sistemi eşler", () => {
    expect(normalizeSaleType("Faturalı Yurt İçi")).toBe("Faturalı Yurtiçi");
    expect(normalizeSaleType("Faturalı İhracat")).toBe("Faturalı Yurtdışı");
  });
  it("nitelemesiz eski Faturasız → Faturasız Yurtiçi", () => {
    expect(normalizeSaleType("Faturasız")).toBe("Faturasız Yurtiçi");
  });
});

describe("calcKDV", () => {
  const rates = [{ from: "2000-01-01", rate: 20 }];
  it("Faturalı Yurtiçi satışta KDV hesaplar", () => {
    expect(calcKDV("Faturalı Yurtiçi", 100000, "2026-01-01", rates)).toBe(20000);
  });
  it("Faturasız ve yurtdışı satışta KDV 0", () => {
    expect(calcKDV("Faturasız Yurtiçi", 100000, "2026-01-01", rates)).toBe(0);
    expect(calcKDV("Faturalı Yurtdışı", 100000, "2026-01-01", rates)).toBe(0);
  });
});

describe("customerHasAnyDebt", () => {
  const c = { id: 1, kalanBorc: 0 };
  it("kalan borç varsa borçlu", () => {
    expect(customerHasAnyDebt({ id: 1, kalanBorc: 5000 }, [], [])).toBe(true);
  });
  it("ödenmemiş ücretli servis borç sayılır", () => {
    const sv = [{ customerId: 1, type: "Garanti Dışı", servisUcreti: 1000, odendi: false, islemFirma: "Altuntaş Makina" }];
    expect(customerHasAnyDebt(c, sv, [])).toBe(true);
  });
  it("hiçbir kaynak yoksa borçlu değil", () => {
    expect(customerHasAnyDebt(c, [], [])).toBe(false);
  });
});

describe("purgeOldTrash", () => {
  it("30 günden eski silinmişleri temizler, yenileri ve silinmemişleri korur", () => {
    const eski = new Date(Date.now() - 40 * 86400000).toISOString();
    const yeni = new Date(Date.now() - 5 * 86400000).toISOString();
    const out = purgeOldTrash([
      { id: 1 },
      { id: 2, deletedAt: eski },
      { id: 3, deletedAt: yeni },
    ]);
    expect(out.map(x => x.id)).toEqual([1, 3]);
  });
});

describe("numberToWordsEN", () => {
  it("tutarı İngilizce yazıya çevirir", () => {
    const s = numberToWordsEN(1250).toLowerCase();
    expect(s).toContain("one thousand");
    expect(s).toContain("two hundred");
    expect(s).toContain("fifty");
  });
});

describe("aramaNormalize — Türkçe karakter katlamalı arama", () => {
  const eslesir = (veri, sorgu) => aramaNormalize(veri).includes(aramaNormalize(sorgu));

  it("altı Türkçe harfi ASCII karşılığına indirir", () => {
    expect(aramaNormalize("Çığöşü ÇIĞÖŞÜ")).toBe("cigosu cigosu");
  });

  it("Türkçe karakter yazılmadan da eşleşir (ve tersi)", () => {
    expect(eslesir("Şişli", "sisli")).toBe(true);
    expect(eslesir("Altuntaş", "altuntas")).toBe(true);
    expect(eslesir("Çetin", "cetin")).toBe(true);
    expect(eslesir("Güneş", "gunes")).toBe(true);
    expect(eslesir("Öztürk", "ozturk")).toBe(true);
    expect(eslesir("IŞIK MAKİNA", "isik")).toBe(true);
    expect(eslesir("altuntas", "Altuntaş")).toBe(true);
  });

  it("büyük I / İ ayrımından kaynaklı sorunları da çözer", () => {
    expect(eslesir("ISTANBUL", "istanbul")).toBe(true);
    expect(eslesir("İstanbul", "istanbul")).toBe(true);
  });

  it("alakasız sorgu eşleşmez", () => {
    expect(eslesir("Şişli", "kadikoy")).toBe(false);
  });
});

describe("parseKurRate", () => {
  it("'1 EUR = 38,50 TL (tarih)' metninden kuru çıkarır (baştaki 1'i yutmaz)", () => {
    expect(parseKurRate("1 EUR = 38,50 TL (08.07.2026)")).toBe(38.5);
  });
  it("binlik ayraçlı kuru çözer", () => {
    expect(parseKurRate("1 USD = 1.234,56 TL")).toBe(1234.56);
  });
  it("sadece sayı yazıldığında da çalışır", () => {
    expect(parseKurRate("40")).toBe(40);
    expect(parseKurRate("38,75")).toBe(38.75);
  });
  it("geçerli kur yoksa null döner", () => {
    expect(parseKurRate("")).toBeNull();
    expect(parseKurRate(null)).toBeNull();
    expect(parseKurRate("kur bilinmiyor")).toBeNull();
  });
});

describe("applyKurToForm — kur elle değişince TL karşılıkları yeniden hesaplanır", () => {
  const form = () => ({
    currency: "USD", kur: "1 USD = 46,85 TL", kurRate: 46.85,
    satirlar: [{ subItems: [{ birimFiyat: "90.000", tlKarsiligi: "4.216.500" }] }],
  });

  it("dövizli belgede yeni kurla kurRate ve satır TL karşılığı güncellenir", () => {
    const out = applyKurToForm(form(), "1 USD = 10 TL (08.07.2026)");
    expect(out.kur).toBe("1 USD = 10 TL (08.07.2026)");
    expect(out.kurRate).toBe(10);
    expect(out.satirlar[0].subItems[0].tlKarsiligi).toBe(calcTL("90.000", 10)); // 900.000
    expect(out.satirlar[0].subItems[0].tlKarsiligi).toBe("900.000");
  });

  it("TRY belgede yalnızca metin güncellenir, hesap değişmez", () => {
    const tryForm = { ...form(), currency: "TRY", kurRate: undefined };
    const out = applyKurToForm(tryForm, "1 EUR = 40 TL");
    expect(out.kur).toBe("1 EUR = 40 TL");
    expect(out.kurRate).toBeUndefined();
    expect(out.satirlar[0].subItems[0].tlKarsiligi).toBe("4.216.500"); // dokunulmadı
  });

  it("geçersiz kur metninde hesap eski kalır (yalnızca metin yazılır)", () => {
    const out = applyKurToForm(form(), "kur belli değil");
    expect(out.kur).toBe("kur belli değil");
    expect(out.kurRate).toBe(46.85); // değişmedi
    expect(out.satirlar[0].subItems[0].tlKarsiligi).toBe("4.216.500");
  });
});
