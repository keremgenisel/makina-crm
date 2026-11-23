// Spec 0156 AC-31, AC-38 (C2, C2/2): iki ekstre motorunun sonucu, bu spec'in koşulsuz eklediği dört alan ayıklandıktan sonra
// spec öncesi altınla birebir aynı: satırlar, sıraları, tutarları, bakiyeleri, devir ve son bakiye, çalışanda açık avans.
// Altın `tests/fixtures/0156-once.json` spec ÖNCESİ koddan `YAZ_0156=1` ile üretildi.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { tedarikciEkstresi, calisanEkstresi } from "../src/lib/kasa";
import { ARALIKLAR, secenek } from "./fixtures/0156-veri.js";
import { ayiklaEkstre0156 } from "./fixtures/0156-ayikla.js";

const DOSYA = "tests/fixtures/0156-once.json";
const js = (x) => JSON.parse(JSON.stringify(x));
const uret = () => js({
  tedarikci: ARALIKLAR.map(a => tedarikciEkstresi(11, secenek(a))),
  bos: tedarikciEkstresi(12, secenek()),
  calisan: ARALIKLAR.map(a => calisanEkstresi(21, secenek(a))),
});

describe("Spec 0156 kıyas", () => {
  it("AC-31 / AC-38: ekstre motorları dört yeni alan ayıklandıktan sonra spec öncesi altınla birebir", () => {
    const s = uret();
    if (process.env.YAZ_0156 === "1") { fs.writeFileSync(DOSYA, JSON.stringify(s) + "\n"); return; }
    const a = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    expect(s.tedarikci.map(ayiklaEkstre0156)).toEqual(a.tedarikci.map(ayiklaEkstre0156));
    expect(ayiklaEkstre0156(s.bos)).toEqual(ayiklaEkstre0156(a.bos));
    expect(s.calisan.map(ayiklaEkstre0156)).toEqual(a.calisan.map(ayiklaEkstre0156));
    // Altın boş değil: tedarikçi ekstresinde dokuz kalemin borç satırları ve ödemeleri, çalışanda dört satır türü var.
    expect(a.tedarikci[0].satirlar.filter(x => x.tur === "borc").length).toBe(9);
    expect(new Set(a.calisan[0].satirlar.map(x => x.tur))).toEqual(new Set(["maas", "odeme", "mahsup", "avans"]));
    expect(a.tedarikci[1].devirK).not.toBeNull();
  });
});
