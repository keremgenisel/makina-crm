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
