// Spec 0143 D-R3–D-R4/2, D-R3/4, C4 (AC-27–AC-30, AC-56, AC-59, AC-64): boy fiyatı yönteminin göçünün saf çekirdeği
// (electron/boyGocuSaf.mjs). Yazım, yedek ve ikinci açılış Electron betiğinde (scripts/tests/boy-gocu.cjs).
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { boyKalemiCevir, boyParcaCevir, boyGocPlani, geldigiBoyHaritasi } from "../electron/boyGocuSaf.mjs";
import { malzemeOzeti, malzemeKatalogu } from "../src/lib/malzeme";

const H = new Map([["501", 6], ["503", "2,5"]]);
const BOY = { tur: "malzeme", malzemeId: 501, bicim: "mil", yontem: "boy", cap: 30, boy: 400, adet: 1 };

describe("Spec 0143 göç çekirdeği", () => {
  it("AC-27: boy yöntemli kalem işaretlenir, çubuk boyu geldiği boydan (metre → mm), yontem silinir", () => {
    const { yontem: _y, ...rest } = BOY;
    expect(boyKalemiCevir(BOY, H)).toEqual({ ...rest, boydanSiparis: true, cubukBoyu: 6000 });
    expect(boyKalemiCevir({ ...BOY, malzemeId: 503 }, H).cubukBoyu).toBe(2500); // virgüllü metin de okunur
  });
  it("AC-28: kartında geldiği boy olmayan kalem yalnız kilo kalemi olur", () => {
    const { yontem: _y, ...rest } = BOY;
    expect(boyKalemiCevir({ ...BOY, malzemeId: 999 }, H)).toEqual({ ...rest, malzemeId: 999 });
    expect(boyKalemiCevir(BOY, new Map([["501", 0]]))).not.toHaveProperty("boydanSiparis");
  });
  it("AC-29 / AC-30: çevrilecek kalem yoksa plan boştur; çevrilmiş kalem ikinci kez değişmez", () => {
    const { yontem: _y, ...anahtarsiz } = BOY;
    expect(boyKalemiCevir(anahtarsiz, H)).toBe(anahtarsiz);
    expect(boyGocPlani([{ id: 1, maliyetKalemleri: JSON.stringify([anahtarsiz]) }, { id: 2, maliyetKalemleri: null, malzemeSatiri: null }], H)).toEqual([]);
    const bir = boyParcaCevir({ maliyetKalemleri: [BOY] }, H);
    expect(boyParcaCevir(bir, H)).toBe(bir);
  });
  // Triyaj (bulgu 3): 0139'un içe aktarmasının yazdığı `yontem: "kilo"` ölü anahtarı da silinir; işaret yazılmaz.
  it("triyaj bulgu 3: yontem anahtarı her değerde silinir; kilo kaleminde işaret yazılmaz", () => {
    const { yontem: _y, ...anahtarsiz } = BOY;
    expect(boyKalemiCevir({ ...BOY, yontem: "kilo" }, H)).toEqual(anahtarsiz);
    expect(boyGocPlani([{ id: 3, maliyetKalemleri: JSON.stringify([{ ...BOY, yontem: "kilo" }]) }], H).map(p => JSON.parse(p.maliyetKalemleri))).toEqual([[anahtarsiz]]);
  });
  it("AC-56 / D-R3/2: eski malzemeSatiri alanı da çevrilir; plan yalnız değişen sütunu taşır", () => {
    const plan = boyGocPlani([{ id: 7, maliyetKalemleri: null, malzemeSatiri: JSON.stringify(BOY) }, { id: 8, maliyetKalemleri: JSON.stringify([BOY, { tur: "islem", ad: "T", tutar: 1 }]), malzemeSatiri: null }], H);
    expect(plan.map(p => p.id)).toEqual([7, 8]);
    expect(plan[0].maliyetKalemleri).toBeUndefined(); expect(JSON.parse(plan[0].malzemeSatiri)).toMatchObject({ boydanSiparis: true, cubukBoyu: 6000 });
    expect(plan[1].malzemeSatiri).toBeUndefined(); expect(JSON.parse(plan[1].maliyetKalemleri)[1]).toEqual({ tur: "islem", ad: "T", tutar: 1 });
  });
  it("çevrilen kalemin maliyeti kilodan (eski boy fiyatıyla değil)", () => {
    const kat = malzemeKatalogu([{ id: 501, ad: "304", ozgulAgirlik: 7.9, kiloFiyati: 200, boyFiyati: 1600, geldigiBoy: 6 }]);
    const { yontem: _y, ...kilo } = BOY;
    expect(malzemeOzeti(boyKalemiCevir(BOY, H), kat)).toEqual(malzemeOzeti(kilo, kat));
  });
  it("AC-64 / D-R3/4: yedekten geri yükleme aynı çekirdeği yedeğin malzemelerinden kurulan haritayla çağırır", () => {
    const h = geldigiBoyHaritasi([{ id: 501, geldigiBoy: 6 }, { id: 502 }, null]);
    expect([...h.entries()]).toEqual([["501", 6]]);
    const kaynak = fs.readFileSync("src/components/settings/SettingsBackup.jsx", "utf8");
    expect(kaynak).toMatch(/import \{ boyParcaCevir, geldigiBoyHaritasi \} from "\.\.\/\.\.\/\.\.\/electron\/boyGocuSaf\.mjs";/);
    expect(kaynak).toMatch(/const h = geldigiBoyHaritasi\(restoreData\.malzemeler\); setParts\?\.\(restoreData\.parts\.map\(p => boyParcaCevir\(p, h\)\)\);/);
  });
  it("C4 / AC-59: çekirdek saf ES modülüdür ve kaynak klasörünü okumaz", () => {
    const k = fs.readFileSync("electron/boyGocuSaf.mjs", "utf8");
    expect(k).not.toMatch(/^import /m); expect(k).not.toMatch(/require\(/); expect(k).not.toMatch(/src\//);
  });
});
