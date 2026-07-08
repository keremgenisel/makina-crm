// Mükerrer kayıt tespiti: benzerKayitBul sinyalleri (seri no, telefon, firma+model).
import { describe, it, expect } from "vitest";
import { benzerKayitBul, firmaAnahtar } from "../src/lib/utils";

const kayitlar = [
  { id: 1, name: "Genisel Catering A.Ş.", model: "AK100_DS", serialNo: "AK-2026-01", phone: "0532 111 22 33", yetkili1Tel: "0500 000 00 01" },
  { id: 2, name: "Genisel Catering A.Ş.", model: "AK140_DSC", serialNo: "AK-2026-02", phone: "0532 111 22 33" },
  { id: 3, name: "Başka Firma", model: "AK100_DS", serialNo: "", phone: "0212 999 88 77" },
  { id: 4, name: "Silinmiş Firma", model: "AK100_DS", serialNo: "SIL-1", phone: "0555 555 55 55", deletedAt: "2026-01-01" },
];

describe("firmaAnahtar", () => {
  it("şirket eklerini ve noktalamayı atar", () => {
    expect(firmaAnahtar("Genisel Catering A.Ş.")).toBe(firmaAnahtar("GENİSEL CATERING LTD. ŞTİ."));
  });
});

describe("benzerKayitBul", () => {
  it("seri no eşleşmesi en güçlü sinyal", () => {
    const out = benzerKayitBul(kayitlar, { name: "Bambaşka", serialNo: "ak-2026-01" });
    expect(out).toHaveLength(1);
    expect(out[0].kayit.id).toBe(1);
    expect(out[0].sebep).toBe("seri no aynı");
  });

  it("telefon farklı biçimde yazılsa da eşleşir (+90/0 farkı)", () => {
    const out = benzerKayitBul(kayitlar, { name: "Yeni Firma", phone: "+90 532 111 22 33" });
    expect(out.map(b => b.kayit.id)).toEqual([1, 2]);
    expect(out[0].sebep).toBe("telefon aynı");
  });

  it("yetkili telefonu da çapraz kontrol edilir", () => {
    const out = benzerKayitBul(kayitlar, { name: "Yeni", yetkili2Tel: "05000000001" });
    expect(out.map(b => b.kayit.id)).toEqual([1]);
  });

  it("aynı firma adı TEK başına uyarı üretmez (ikinci makina meşru)", () => {
    const out = benzerKayitBul(kayitlar, { name: "Genisel Catering", model: "AK80_D" });
    expect(out).toHaveLength(0);
  });

  it("aynı firma + aynı model uyarı üretir", () => {
    const out = benzerKayitBul(kayitlar, { name: "genisel catering ltd şti", model: "AK100_DS" });
    expect(out.map(b => b.kayit.id)).toEqual([1]);
    expect(out[0].sebep).toBe("aynı firma + aynı model");
  });

  it("modelsiz kayıtlarda (bayi) isim eşleşmesi yeterli", () => {
    const bayiler = [{ id: 9, name: "Ege Bayi Ltd.", phone: "0300" }];
    const out = benzerKayitBul(bayiler, { name: "EGE BAYİ", phone: "0400" });
    expect(out.map(b => b.kayit.id)).toEqual([9]);
    expect(out[0].sebep).toBe("firma adı aynı");
  });

  it("silinmiş kayıtlar hiç eşleşmez", () => {
    const out = benzerKayitBul(kayitlar, { name: "X", serialNo: "SIL-1" });
    expect(out).toHaveLength(0);
  });

  it("hiç sinyal yoksa boş döner", () => {
    const out = benzerKayitBul(kayitlar, { name: "Tamamen Yeni", model: "AK200", phone: "0111 111 11 11" });
    expect(out).toHaveLength(0);
  });
});
