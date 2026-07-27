import { describe, it, expect } from "vitest";
import { yeniBekleyenler, panoDisiBildirimVerilsinMi, servisPlanlandiMi, yeniKargolar } from "../src/lib/servisAlarm.js";

// Servis Panosu alarmı: uzaktan gelen yeni "Bekliyor" servisin tespiti. Bu saf fonksiyon,
// bilinen id kümesinde OLMAYAN + durum "Bekliyor" + panoda gizli olmayan servisleri döner.
describe("yeniBekleyenler", () => {
  it("bilinende olmayan Bekliyor servisi yeni sayar", () => {
    const bilinen = new Set([1, 2]);
    const services = [
      { id: 1, durum: "Bekliyor" },
      { id: 2, durum: "Yapılıyor" },
      { id: 3, durum: "Bekliyor" }, // yeni
    ];
    expect(yeniBekleyenler(bilinen, services)).toEqual([3]);
  });

  it("taban çizgisinde (tüm id'ler bilinen) hiç yeni yoktur — backlog ötmez", () => {
    const services = [
      { id: 1, durum: "Bekliyor" },
      { id: 2, durum: "Bekliyor" },
    ];
    const bilinen = new Set(services.map(s => s.id));
    expect(yeniBekleyenler(bilinen, services)).toEqual([]);
  });

  it("Bekliyor olmayan yeni servis alarm vermez (yalnız Bekliyor)", () => {
    const bilinen = new Set([1]);
    const services = [
      { id: 1, durum: "Bekliyor" },
      { id: 2, durum: "Yapılıyor" }, // yeni ama Bekliyor değil
      { id: 3, durum: "Tamamlandı" }, // yeni ama Bekliyor değil
    ];
    expect(yeniBekleyenler(bilinen, services)).toEqual([]);
  });

  it("panoda gizli (arşivli) yeni Bekliyor sayılmaz", () => {
    const bilinen = new Set();
    const services = [{ id: 5, durum: "Bekliyor", panoGizli: true }];
    expect(yeniBekleyenler(bilinen, services)).toEqual([]);
  });

  it("id'siz / bozuk kayıtları atlar, dizi olmayana boş döner", () => {
    expect(yeniBekleyenler(new Set(), [null, { durum: "Bekliyor" }, { id: 7, durum: "Bekliyor" }])).toEqual([7]);
    expect(yeniBekleyenler(new Set(), null)).toEqual([]);
  });

  it("bilinen küme dizi olarak da verilebilir", () => {
    expect(yeniBekleyenler([1], [{ id: 1, durum: "Bekliyor" }, { id: 2, durum: "Bekliyor" }])).toEqual([2]);
  });

  it("planlanmış (ileri zamanlı) yeni Bekliyor servisi HENÜZ yeni sayılmaz", () => {
    const now = "2026-07-26T10:00:00";
    const services = [{ id: 9, durum: "Bekliyor", fabrikaGirisZamani: "2026-07-28T08:00" }]; // ileri
    expect(yeniBekleyenler(new Set(), services, now)).toEqual([]);
  });

  it("planlanan servis giriş anı geçince yeni sayılır (düşüş anında alarm)", () => {
    const services = [{ id: 9, durum: "Bekliyor", fabrikaGirisZamani: "2026-07-28T08:00" }];
    expect(yeniBekleyenler(new Set(), services, "2026-07-28T07:59:00")).toEqual([]); // henüz değil
    expect(yeniBekleyenler(new Set(), services, "2026-07-28T08:00:30")).toEqual([9]); // düştü
  });
});

// Planlanmış servis: ileri zamana alınmış, henüz panoya düşmemiş Bekliyor servisi.
describe("servisPlanlandiMi", () => {
  const now = "2026-07-26T10:00:00";
  it("ileri fabrikaGirisZamani + Bekliyor → planlanmış (true)", () => {
    expect(servisPlanlandiMi({ durum: "Bekliyor", fabrikaGirisZamani: "2026-07-28T08:00" }, now)).toBe(true);
  });
  it("geçmiş/şimdi giriş → planlanmış değil (false)", () => {
    expect(servisPlanlandiMi({ durum: "Bekliyor", fabrikaGirisZamani: "2026-07-25T08:00" }, now)).toBe(false);
    expect(servisPlanlandiMi({ durum: "Bekliyor", fabrikaGirisZamani: "2026-07-26T10:00:00" }, now)).toBe(false);
  });
  it("Bekliyor olmayan durum planlanmış sayılmaz (Yapılıyor/Tamamlandı görünür)", () => {
    expect(servisPlanlandiMi({ durum: "Yapılıyor", fabrikaGirisZamani: "2026-07-28T08:00" }, now)).toBe(false);
  });
  it("giriş zamanı yoksa / nowIso yoksa / bozuksa false", () => {
    expect(servisPlanlandiMi({ durum: "Bekliyor" }, now)).toBe(false);
    expect(servisPlanlandiMi({ durum: "Bekliyor", fabrikaGirisZamani: "2026-07-28T08:00" }, null)).toBe(false);
    expect(servisPlanlandiMi(null, now)).toBe(false);
  });
});

// Kargo, servisle AYNI alarmı paylaşır: "Hazırlanıyor" (ilk sütun) durumunda düşen kargo "yeni" sayılır.
describe("yeniKargolar", () => {
  const now = "2026-07-26T10:00:00";
  it("bilinende olmayan 'Hazırlanıyor' kargo yeni sayılır", () => {
    const sat = [
      { id: 10, kargoDurum: "Hazırlanıyor" },        // yeni
      { id: 11, kargoDurum: "Kargoya Verildi" },      // ilk sütun değil → sayılmaz
      { id: 12, kargoDurum: "" },                     // durumsuz → sayılmaz
    ];
    expect(yeniKargolar(new Set(), sat, now)).toEqual([10]);
  });
  it("bilinen / silinmiş / planlanmış (ileri düşme) kargo sayılmaz", () => {
    expect(yeniKargolar(new Set([10]), [{ id: 10, kargoDurum: "Hazırlanıyor" }], now)).toEqual([]);
    expect(yeniKargolar(new Set(), [{ id: 13, kargoDurum: "Hazırlanıyor", deletedAt: "x" }], now)).toEqual([]);
    expect(yeniKargolar(new Set(), [{ id: 14, kargoDurum: "Hazırlanıyor", panoDusmeZamani: "2099-01-01T08:00" }], now)).toEqual([]);
  });
  it("planlanan kargo düşme zamanı geçince yeni sayılır", () => {
    const sat = [{ id: 15, kargoDurum: "Hazırlanıyor", panoDusmeZamani: "2026-07-28T08:00" }];
    expect(yeniKargolar(new Set(), sat, "2026-07-28T07:59:00")).toEqual([]);
    expect(yeniKargolar(new Set(), sat, "2026-07-28T08:00:30")).toEqual([15]);
  });
});

// Uygulama geneli (pano dışı) bildirim kararı: panodayken çıkmaz, alarm kapalıysa çıkmaz.
describe("panoDisiBildirimVerilsinMi", () => {
  it("pano dışı sekmede + alarm açık + yeni varsa bildirim verilir", () => {
    expect(panoDisiBildirimVerilsinMi("customers", true, 1)).toBe(true);
    expect(panoDisiBildirimVerilsinMi("dashboard", true, 3)).toBe(true);
  });

  it("Servis ve Kargo Panosu'ndayken (tab servis) genel bildirim VERİLMEZ", () => {
    expect(panoDisiBildirimVerilsinMi("servis", true, 5)).toBe(false);
  });

  it("alarm kapalıysa veya yeni yoksa verilmez", () => {
    expect(panoDisiBildirimVerilsinMi("customers", false, 2)).toBe(false);
    expect(panoDisiBildirimVerilsinMi("customers", true, 0)).toBe(false);
  });
});
