// Sıralı kayıt kuyruğu (lib/kayitSirasi.js): önceki kayıt yoldayken gelen ikinci kayıt eski sürümle
// gitmemeli (sahte çakışma → "Değişiklikler kaydedilemedi!"). Sürüm gönderim anında ref'ten okunur.
import { describe, it, expect, vi } from "vitest";
import { kayitSirasiOlustur } from "../src/lib/kayitSirasi";

// Sahte sunucu: sürüm eşleşmezse reddeder (yerel/sunucu modun davranışı), eşleşirse artırır.
function sahteSunucu({ gecikmeMs = 30 } = {}) {
  const s = { version: 1, kayitlar: [] };
  s.save = vi.fn((d) => new Promise(res => setTimeout(() => {
    if (d.__dataVersion !== s.version) { s.kayitlar.push({ ok: false, v: d.__dataVersion }); return res(false); }
    s.version += 1; s.kayitlar.push({ ok: true, v: d.__dataVersion }); res(true);
  }, gecikmeMs)));
  s.getVersion = vi.fn(async () => s.version);
  return s;
}

describe("kayitSirasiOlustur", () => {
  it("önceki kayıt yoldayken planlanan ikinci kayıt güncel sürümle gider (ikisi de kabul)", async () => {
    const sunucu = sahteSunucu();
    const versionRef = { current: 1 };
    const kaydet = kayitSirasiOlustur({ save: sunucu.save, getVersion: sunucu.getVersion, versionRef });
    const a = kaydet({ x: 1 });                 // yolda (30 ms)
    const b = kaydet({ x: 2 });                 // hemen ardından — eskiden __dataVersion:1 ile giderdi
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra.ok).toBe(true);
    expect(rb.ok).toBe(true);
    expect(sunucu.kayitlar).toEqual([{ ok: true, v: 1 }, { ok: true, v: 2 }]);
    expect(versionRef.current).toBe(3);
    expect(rb.veri).toMatchObject({ x: 2, __dataVersion: 2 });
  });

  it("gövdedeki bayat __dataVersion ezilir; ref dışarıdan güncellenirse (yeniden yükleme) sıradaki kayıt onu kullanır", async () => {
    const sunucu = sahteSunucu({ gecikmeMs: 5 });
    const versionRef = { current: 1 };
    const kaydet = kayitSirasiOlustur({ save: sunucu.save, getVersion: sunucu.getVersion, versionRef });
    await kaydet({ __dataVersion: 999 });      // bayat değer → 1 ile gider
    sunucu.version = 7; versionRef.current = 7; // dış değişiklik + yeniden yükleme senkronu
    const r = await kaydet({});
    expect(r.ok).toBe(true);
    expect(sunucu.kayitlar).toEqual([{ ok: true, v: 1 }, { ok: true, v: 7 }]);
  });

  it("gerçek dış değişiklik yine çakışır: ref eskiyse kayıt reddedilir ve sürüm senkronlanmaz", async () => {
    const sunucu = sahteSunucu({ gecikmeMs: 5 });
    const versionRef = { current: 1 };
    const kaydet = kayitSirasiOlustur({ save: sunucu.save, getVersion: sunucu.getVersion, versionRef });
    sunucu.version = 5; // başka PC yazdı
    const r = await kaydet({});
    expect(r.ok).toBe(false);
    expect(versionRef.current).toBe(1);
    expect(sunucu.getVersion).not.toHaveBeenCalled();
  });

  it("save reject ederse ok=false döner ve zincir kopmaz; getVersion yoksa sorun olmaz", async () => {
    const versionRef = { current: 1 };
    let sayac = 0;
    const save = vi.fn(async () => { sayac += 1; if (sayac === 1) throw new Error("patladı"); return true; });
    const kaydet = kayitSirasiOlustur({ save, getVersion: undefined, versionRef });
    const r1 = await kaydet({});
    expect(r1.ok).toBe(false);
    const r2 = await kaydet({});
    expect(r2.ok).toBe(true);
    expect(versionRef.current).toBe(1);
  });
});

// Spec 0077 R1 (B-1), R38, AC-51: kaydın NEDENİ zincirden geçer. Köprü { ok, sebep } döner; nesneyi `if (ok)` koşuluna koymak
// başarısızlık dalını hiç çalıştırmazdı. Eski köprü (boolean) da tanınır; save() reject ederse neden "yerel".
describe("Spec 0077: kayitSirasi nedeni taşır", () => {
  const kur = (donus) => kayitSirasiOlustur({ save: vi.fn(async () => donus), getVersion: vi.fn(async () => 5), versionRef: { current: 1 } });
  it("AC-51: başarısız kayıtta ok yanlış ve sebep dolu; nesne dönüşü başarısızlık dalını atlamaz", async () => {
    const r = await kur({ ok: false, sebep: "sinir" })({ x: 1 });
    expect(r).toMatchObject({ ok: false, sebep: "sinir" });
    expect(r.veri).toMatchObject({ x: 1, __dataVersion: 1 });
  });
  it("AC-51: başarılı nesne dönüşü ok doğru, sebep null; sürüm eşitlenir", async () => {
    const versionRef = { current: 1 };
    const k = kayitSirasiOlustur({ save: vi.fn(async () => ({ ok: true, sebep: null })), getVersion: vi.fn(async () => 9), versionRef });
    expect(await k({})).toMatchObject({ ok: true, sebep: null });
    expect(versionRef.current).toBe(9);
  });
  it("AC-51: eski köprü (boolean) ve reject edilen save tanınır", async () => {
    expect(await kur(false)({})).toMatchObject({ ok: false, sebep: "bilinmiyor" });
    expect(await kur(true)({})).toMatchObject({ ok: true });
    const k = kayitSirasiOlustur({ save: vi.fn(async () => { throw new Error("disk"); }), getVersion: vi.fn(), versionRef: { current: 1 } });
    expect(await k({})).toMatchObject({ ok: false, sebep: "yerel" });
  });
});
