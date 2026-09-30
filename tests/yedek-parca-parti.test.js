// Spec 0030 AC-11 (plan B7): tahsis satırının satış kimliğinden kargo partisi çözülür; etiket partinin tamamını kapsar.
import { describe, it, expect } from "vitest";
import { satisPartisi } from "../src/lib/yedekParcaSatis";

const S = [
  { id: 1, batchId: 10, partId: 7 }, { id: 2, batchId: 10, partId: 8 }, { id: 3, batchId: 10, partId: 9, deletedAt: "2026-09-01T00:00:00Z" },
  { id: 4, partId: 7 }, { id: 5, batchId: 11, partId: 7 },
];

describe("satisPartisi", () => {
  it("AC-11: toplu satışta partinin silinmemiş bütün kalemleri (hangi kalem tahsis edilmiş olursa olsun)", () => {
    expect(satisPartisi(S, 1).map(s => s.id)).toEqual([1, 2]);
    expect(satisPartisi(S, 2).map(s => s.id)).toEqual([1, 2]);
  });
  it("AC-11: tek satış yalnız kendisi; kimlik metin olarak da çözülür", () => {
    expect(satisPartisi(S, 4).map(s => s.id)).toEqual([4]);
    expect(satisPartisi(S, "5").map(s => s.id)).toEqual([5]);
  });
  it("silinmiş ya da olmayan satış boş dizi verir (yazdırma yapılmaz)", () => {
    expect(satisPartisi(S, 3)).toEqual([]);
    expect(satisPartisi(S, 99)).toEqual([]);
    expect(satisPartisi(null, 1)).toEqual([]);
  });
});
