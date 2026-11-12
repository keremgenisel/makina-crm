// Spec 0143 C3 (AC-6, AC-11, AC-33, AC-34, AC-66): boy yöntemi kullanmayan veride maliyet zinciri, satış fiyatı, Model Maliyetleri,
// Parti Hesabı ve Excel dışa aktarma spec öncesi altınla birebir aynı (`0143-once.json`, veri `0143-veri.js`; altın YAZ_0143=1 ile
// spec ÖNCESİ koddan). Sipariş ihtiyacı kıyasın dışındadır (B-R6/2: işaretsiz satırın sipariş kilosu bilinçli değişti). Ayıklama
// yalnız `0143-ayikla.js`'in dar listesi (C2/3).
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { malzemeOzeti, malzemeKatalogu } from "../src/lib/malzeme";
import { parcaMaliyetKurus, setKatalogu } from "../src/lib/urunAgaci";
import { parcaDisaAktarmaSatiri } from "../src/lib/parcaAktarma";
import { parcaSatisFiyati, fiyatBaglamiKur } from "../src/lib/parcaFiyati";
import { modelMaliyetleri, partiHesabi } from "../src/lib/makinaStandartMaliyet";
import { ayikla0143 } from "./fixtures/0143-ayikla.js";
import { MALZEMELER, PARCALAR, MODELLER, TARIHLER, FIYAT_AYARLARI } from "./fixtures/0143-veri.js";

const DOSYA = "tests/fixtures/0143-once.json";
const ciktilar = () => {
  const mk = malzemeKatalogu(MALZEMELER);
  const kat = setKatalogu(PARCALAR);
  const baglam = fiyatBaglamiKur({ parts: PARCALAR, malzemeler: MALZEMELER, fiyatAyarlari: FIYAT_AYARLARI });
  const parti = { id: 1, ad: "P1", baslangicAy: "2026-01", bitisAy: null, planlananAdetler: { AK100_DS: 10 } };
  const mm = modelMaliyetleri({ ...MODELLER, parts: PARCALAR, malzemeler: MALZEMELER }, 12345);
  const stock = [{ id: 71, model: "AK100_DS", seriNo: "S1", tarih: "2026-02-10", partiId: 1 }];
  return JSON.parse(JSON.stringify({
    ozet: PARCALAR.flatMap(p => [...(p.maliyetKalemleri || []), ...(p.malzemeSatiri ? [p.malzemeSatiri] : [])].filter(k => k.tur !== "islem").map(k => TARIHLER.map(t => malzemeOzeti(k, mk, t)))),
    maliyet: PARCALAR.map(p => TARIHLER.map(t => parcaMaliyetKurus(p, t, kat, mk))),
    fiyat: PARCALAR.map(p => ["TRY", "USD"].map(pb => parcaSatisFiyati(p, pb, baglam))),
    disa: PARCALAR.map(p => parcaDisaAktarmaSatiri(p, kat, mk, FIYAT_AYARLARI)),
    modeller: mm,
    parti: partiHesabi(parti, { stock, customers: [] }, { payK: 1000, modeller: mm, bugun: "2026-11-12", katalog: { ...MODELLER, parts: PARCALAR, malzemeler: MALZEMELER } }),
  }));
};

describe("Spec 0143 kıyas (C3)", () => {
  it("AC-6 / AC-11 / AC-33: maliyet zinciri, satış fiyatı, Model Maliyetleri, Parti Hesabı ve Excel spec öncesi altınla birebir", () => {
    const s = ciktilar();
    if (process.env.YAZ_0143 === "1") { fs.writeFileSync(DOSYA, JSON.stringify(s, null, 1) + "\n"); return; }
    expect(ayikla0143(s)).toEqual(ayikla0143(JSON.parse(fs.readFileSync(DOSYA, "utf8"))));
  });
  it("kıyas boş geçmez: boy fiyatı dolu kartın kilo kalemleri maliyet üretir", () => {
    const a = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    expect(a.maliyet[0][0]).toBeGreaterThan(0); // Kalın mil, 501 (boy fiyatı dolu kart)
    expect(a.maliyet.flat().filter(x => x != null).length).toBeGreaterThan(15);
    expect(a.modeller.length).toBeGreaterThan(0);
  });
});

// AC-34, C2/3: altı altın 0143'ün hazırlık adımında (fikstürlerden geldiği boy ve boy fiyatı kalktı, boy kalemi kiloya çevrildi,
// 504'e özgül ağırlık ve kilo fiyatı) KALDIRMADAN ÖNCE eski kodla yenilendi; kaldırmadan sonra bayt bayt değişmez. 0143 yeni altın.
describe("Spec 0143 AC-34: altınların kaderi", () => {
  const ozet = (f) => createHash("sha256").update(fs.readFileSync(`tests/fixtures/${f}-once.json`)).digest("hex");
  it("AC-34: altı altın hazırlık adımındaki baytlarıyla, 0143 kendi altınıyla", () => {
    expect(Object.fromEntries(["0135", "0138", "0139", "0140", "0141", "0142", "0143"].map(f => [f, ozet(f)]))).toEqual({
      "0135": "b08198c7bf7b6248ad7e1ea24b77592b8195d00e5a291c05ad4a56b3429e5647",
      "0138": "b2a2ae7bf6450e4c83daed10deb23592b89644d3bfecaa8989c7c0e443037512",
      "0139": "b0b2995b45b8a1e0df3aa3101f01bc3b7d004702b8796313eae895a5f256269a",
      "0140": "aabc19089dd7dd71a18c3b61d6f6366a180b3b0e95145218968b196cc646238d",
      "0141": "6d8f548c7fa823ad16b3c5b7495ed010fb8edb00b500d96d090c60b93dc4fa62",
      "0142": "c5df8addc213441e3bff9599a0e7cbf8668de669554fee230c61366167d8cb24",
      "0143": "ced66f839d2a20d91fefd47acfd2eb78a77c9232af9bc8cba8cc0cc8ce30bdb0",
    });
  });
  it("AC-34: yenilenen altılarda boy yöntemi ve boy adedi izi yok (hazırlık geldiği boyu kaldırdı)", () => {
    for (const f of ["0135", "0138", "0139", "0140", "0141", "0142"]) {
      const m = fs.readFileSync(`tests/fixtures/${f}-once.json`, "utf8");
      expect(m, f).not.toMatch(/"yontem": "boy"/); expect(m, f).not.toMatch(/"boyAdedi": [0-9]/);
    }
  });
  it("AC-66: ortak ayıklama sayısal alanlara dokunmaz; yalnız adı değişen ya da kalkan alanlar", () => {
    const x = { anahtar: "501|kilo|mil|62", yontem: "kilo", artanKg: null, kgNeden: null, oran: null, cubukBoyu: null, tamKg: null, boydanSiparis: false,
      boyNeden: "Malzemenin geldiği boy girilmedi; boy adedi hesaplanmaz.", siparisKg: 12.5, netKg: 10, fireKg: 2.5, boyAdedi: null, tutarK: 100, asgariFark: null };
    expect(ayikla0143(x)).toEqual({ anahtar: "501|kilo||mil|62", boyNeden: null, siparisKg: 12.5, netKg: 10, fireKg: 2.5, boyAdedi: null, tutarK: 100, asgariFark: null });
    expect(ayikla0143({ boyNeden: "başka neden" }).boyNeden).toBe("başka neden");
  });
});
