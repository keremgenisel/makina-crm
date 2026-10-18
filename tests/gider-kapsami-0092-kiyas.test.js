// Spec 0092 AC-18 (C15, C18): yayılmış kalem bulunmayan fikstürlerde yeni havuzun aylık tablosu, dönem havuzu ve parti payları
// spec 0092'den ÖNCEKİ kodun ürettiği rakamla birebir aynıdır. Altın (tests/fixtures/0092-havuz-once.json) spec öncesi kodla
// YAZ_0092=1 ile üretildi; o kodda havuz ay başına bir rapor çağrısıyla (rolHavuzlari) kuruluyordu. Yeni kodun eklediği
// alanlar (havuz nesnesinde `yayilanAdet`, parti sonucunda `yayilanAdet`) karşılaştırmadan önce ayıklanır; geri kalan her
// alan birebir aynı olmalıdır. 0088 ve 0090 verisinde kapsamı birden çok ay olan kalem yoktur (ölçüm 6).
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { rolHavuzlari, aylikGenelHavuzlar, partiGenelPaylari, partiHesabi, genelGiderPayi, modelMaliyetleri } from "../src/lib/makinaStandartMaliyet";
import * as V88 from "./fixtures/0088-veri";
import * as V90 from "./fixtures/0090-veri";

const DOSYA = "tests/fixtures/0092-havuz-once.json";
const YAZ = process.env.YAZ_0092 === "1";
const YENI_ALANLAR = ["yayilanAdet"];
const ayikla = (o) => {
  if (Array.isArray(o)) return o.map(ayikla);
  if (o instanceof Map) return Object.fromEntries([...o.entries()].map(([k, v]) => [k, ayikla(v)]));
  if (o && typeof o === "object") return Object.fromEntries(Object.entries(o).filter(([k]) => !YENI_ALANLAR.includes(k)).map(([k, v]) => [k, ayikla(v)]));
  return o;
};
const aylar = (bas, bit) => { const r = []; for (let a = bas; a <= bit; ) { r.push(a); const [y, m] = a.split("-").map(Number); a = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`; } return r; };
const DONEMLER = [["2025-12", "2027-01"], ["2026-01", "2026-03"], ["2026-04", "2026-06"], ["2026-02", "2026-02"], ["2025-01", "2025-06"]];

const olc = (veri, bugun, ayar) => {
  const sonuc = {};
  sonuc.aylik = ayikla(aylikGenelHavuzlar(veri, aylar("2025-11", "2027-02"), bugun));
  sonuc.donemler = Object.fromEntries(DONEMLER.map(([b, s]) => [`${b}|${s}`, ayikla(rolHavuzlari(veri, b, s, bugun))]));
  sonuc.partiPaylari = ayikla(partiGenelPaylari(veri, bugun));
  const pay = genelGiderPayi(veri, ayar, bugun);
  sonuc.genelGiderPayi = ayikla(pay);
  const modeller = modelMaliyetleri({ standardModels: veri.modeller || [{ model: "AK100", defaultParcalar: [] }], customModels: [], parts: veri.parts || [] }, pay.payK);
  sonuc.partiHesabi = Object.fromEntries((veri.uretimPartileri || []).filter(p => !p.deletedAt).map(p => [p.id, ayikla(partiHesabi(p, veri, { payK: pay.payK, modeller, bugun }))]));
  return sonuc;
};
const olcum = () => ({
  "0088": olc(V88.veri({ modeller: V88.MODELLER, parts: V88.PARCALAR }), V88.BUGUN, V88.AYAR),
  "0090": olc(V90.veri(), V90.BUGUN, { baslangicAy: "2026-02", bitisAy: "2026-06", varsayilanAdet: 7 }),
});

describe("Spec 0092: yayılmamış veride havuz spec öncesiyle birebir aynı", () => {
  it("AC-18: aylık havuz tablosu, dönem havuzları ve parti payları spec öncesi altınla birebir", () => {
    const simdi = JSON.parse(JSON.stringify(olcum()));
    if (YAZ) { fs.writeFileSync(DOSYA, `${JSON.stringify(simdi, null, 1)}\n`); return; }
    const once = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    expect(simdi).toEqual(once);
  });
});
