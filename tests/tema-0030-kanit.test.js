// Spec 0030 AC-7 / AC-21 (plan B10): renk düzeltmeleri aydınlık temayı değiştirmez. kanit-eslemesi.json ekran başına tek
// beklenti taşıdığı için ("aydınlık aynı, karanlık değişti" yazılamıyor) ölçüt doğrudan 0030 piksel raporundan okunur.
// Tablo (R8) ve etiket düğmesi (R5) ekranları bilerek iki temada da değişir; onlar bu listede değildir.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const rapor = Object.fromEntries(JSON.parse(readFileSync(path.join(__dirname, "..", "docs", "evidence", "0030-piksel-raporu.json"), "utf-8")).map(r => [r.ad, r]));
const RENK_EKRANLARI = [
  "gider-formu-personel", "gider-formu", "giderler-rapor", "katalog-calisan", "anasayfa-kart-rozetleri", "servis-pano-kalip",
  "stok-tahsis-modali", "servis-formu-odendi", "kalip-formu-odendi", "yedek-parca-formu-odendi", "yedek-parca-formu-kargo",
];
const IKI_TEMADA_DEGISEN = ["ayarlar-gidertanim", "gider-tanim-tablo", "musteri-detay-tahsis"];

describe("AC-7: renk düzeltmeleri aydınlık temada 0 piksel fark", () => {
  it.each(RENK_EKRANLARI)("%s: aydınlık 0 piksel, karanlık değişti", (e) => {
    const a = rapor[`${e}-aydinlik.png`], k = rapor[`${e}-karanlik.png`];
    expect(a, e).toBeTruthy();
    expect(a.cizimHatasi).toBeUndefined();
    expect(a.piksel).toBe(0);
    expect(k.piksel).toBeGreaterThan(0);
  });
  it("rapor yalnız bu ekranları taşır (tablo ve etiket ekranları bilerek iki temada değişir)", () => {
    const ekranlar = [...new Set(Object.keys(rapor).map(a => a.replace(/-(aydinlik|karanlik)\.png$/, "")))].sort();
    expect(ekranlar).toEqual([...RENK_EKRANLARI, ...IKI_TEMADA_DEGISEN].sort());
    for (const e of IKI_TEMADA_DEGISEN) expect(rapor[`${e}-aydinlik.png`].piksel, e).toBeGreaterThan(0);
  });
});
