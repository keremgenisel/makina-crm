// İzin sistemi: makeCanDo semantiği (eksik anahtar = serbest, [] = engelli).
import { describe, it, expect } from "vitest";
import { makeCanDo, READONLY_SERVER_PERMISSIONS } from "../src/lib/permissions";

describe("makeCanDo", () => {
  it("yerel mod (izin nesnesi yok) her şeye izinli", () => {
    expect(makeCanDo(null, "evrakActions")("evrak_teklif_edit")).toBe(true);
  });
  it("admin rolü her şeye izinli", () => {
    const p = { role: "admin", permissions: JSON.stringify({ evrakActions: [] }) };
    expect(makeCanDo(p, "evrakActions")("evrak_teklif_edit")).toBe(true);
  });
  it("grup anahtarı hiç yoksa izinli (geriye uyumluluk)", () => {
    const p = { role: "user", permissions: JSON.stringify({ customerActions: ["cust_add"] }) };
    expect(makeCanDo(p, "evrakActions")("evrak_teklif_edit")).toBe(true);
  });
  it("boş dizi o gruptaki her eylemi engeller", () => {
    const p = { role: "user", permissions: JSON.stringify({ evrakActions: [] }) };
    expect(makeCanDo(p, "evrakActions")("evrak_teklif_edit")).toBe(false);
  });
  it("listedeki eylem izinli, olmayan engelli", () => {
    const p = { role: "user", permissions: JSON.stringify({ evrakActions: ["evrak_teklif_print"] }) };
    const can = makeCanDo(p, "evrakActions");
    expect(can("evrak_teklif_print")).toBe(true);
    expect(can("evrak_teklif_edit")).toBe(false);
  });
  it("bozuk JSON izinli sayılır (fail-open)", () => {
    const p = { role: "user", permissions: "{bozuk" };
    expect(makeCanDo(p, "evrakActions")("x")).toBe(true);
  });
  it("salt okunur set tüm eylem gruplarını kapatır", () => {
    expect(makeCanDo(READONLY_SERVER_PERMISSIONS, "customerActions")("cust_add")).toBe(false);
    expect(makeCanDo(READONLY_SERVER_PERMISSIONS, "evrakActions")("evrak_teklif_edit")).toBe(false);
  });
});
