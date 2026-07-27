// Yedek parça satışı ortak kayıt mantığı (src/lib/yedekParcaSatis.js). Stok sekmesi + müşteri detay
// modalı + bayi detay modalı bunu paylaşır; doğrulama ve stok düşümü tek kaynaktan çalışsın.
import { describe, it, expect } from "vitest";
import { yedekParcaRec, yeniYedekParcaSatis, musteriTahsisi, kargoPlanlandiMi } from "../src/lib/yedekParcaSatis.js";
import { setIdCounter } from "../src/lib/utils.js";
import { yerelServisMi } from "../src/lib/yerelServis.js";

const holder = (init) => { let s = init; return { set: (u) => { s = typeof u === "function" ? u(s) : u; }, get: () => s }; };

describe("yedekParcaRec (doğrulama + normalize)", () => {
  it("kargo sorumlusu + panoya düşme zamanı + NOT kayda geçer", () => {
    const r = yedekParcaRec({ aliciTipi: "bayi", dealerId: "5", partId: "7", miktar: "3", kargoSorumlusu: "Ali", panoDusmeZamani: "2099-01-01T08:00", notlar: "Acil gönder" });
    expect(r.rec.kargoSorumlusu).toBe("Ali");
    expect(r.rec.panoDusmeZamani).toBe("2099-01-01T08:00");
    expect(r.rec.notlar).toBe("Acil gönder"); // regresyon: not kayda geçmiyordu
  });

  it("kargoDurum verilmezse 'Hazırlanıyor' varsayılır (her satış panoya/Bekliyor'a düşsün)", () => {
    // Regresyon: müşteri/bayi detayından girilen satış kargoDurum'suz kalıp panoya düşmüyordu.
    const r = yedekParcaRec({ aliciTipi: "bayi", dealerId: "5", partId: "7", miktar: "1" });
    expect(r.rec.kargoDurum).toBe("Hazırlanıyor");
    // Açıkça verilen değer korunur:
    expect(yedekParcaRec({ aliciTipi: "bayi", dealerId: "5", partId: "7", miktar: "1", kargoDurum: "Teslim Edildi" }).rec.kargoDurum).toBe("Teslim Edildi");
  });

  it("bayi alıcı: geçerli kayıt üretir", () => {
    const r = yedekParcaRec({ aliciTipi: "bayi", dealerId: "5", partId: "7", miktar: "3", birimFiyat: "120" });
    expect(r.ok).toBe(true);
    expect(r.rec.aliciTipi).toBe("bayi");
    expect(r.rec.dealerId).toBe(5);
    expect(r.rec.musteriId).toBeNull();
    expect(r.rec.miktar).toBe(3);
    expect(r.rec.birimFiyat).toBe(120);
  });

  it("müşteri alıcı: musteriId dolu, dealerId boş", () => {
    const r = yedekParcaRec({ aliciTipi: "musteri", musteriId: "9", partId: "7", miktar: "2" });
    expect(r.ok).toBe(true);
    expect(r.rec.aliciTipi).toBe("musteri");
    expect(r.rec.musteriId).toBe(9);
    expect(r.rec.dealerId).toBeNull();
  });

  it("alıcı seçilmemişse hata (bayi ve müşteri tipine göre mesaj)", () => {
    expect(yedekParcaRec({ aliciTipi: "bayi", partId: "7", miktar: "1" })).toEqual({ ok: false, hata: "Alıcı bayi seçin." });
    expect(yedekParcaRec({ aliciTipi: "musteri", partId: "7", miktar: "1" })).toEqual({ ok: false, hata: "Alıcı müşteri seçin." });
  });

  it("parça yok / miktar 0 → hata", () => {
    expect(yedekParcaRec({ aliciTipi: "bayi", dealerId: "5", miktar: "1" }).hata).toMatch(/parça/i);
    expect(yedekParcaRec({ aliciTipi: "bayi", dealerId: "5", partId: "7", miktar: "0" }).hata).toMatch(/Miktar/);
  });
});

describe("yeniYedekParcaSatis (oluştur + stok düş)", () => {
  it("satış kaydı ekler (tahsisler boş) ve parçayı stoktan düşer", () => {
    setIdCounter(2000);
    const satislar = holder([]);
    const stock = holder([{ id: 1, partId: "7", miktar: 10 }]);
    const log = holder([]);
    const r = yeniYedekParcaSatis(
      { aliciTipi: "bayi", dealerId: "5", partId: "7", miktar: "5", birimFiyat: "100" },
      { setYedekParcaSatislar: satislar.set, setPartStock: stock.set, setPartStockLog: log.set, partStock: stock.get() }
    );
    expect(r.ok).toBe(true);
    expect(satislar.get()).toHaveLength(1);
    expect(satislar.get()[0].miktar).toBe(5);
    expect(satislar.get()[0].tahsisler).toEqual([]); // bayi alıcı → tahsissiz
    expect(stock.get().find(x => x.partId === "7").miktar).toBe(5); // 10 - 5
    expect(log.get().filter(l => l.tip === "bayi_satis")).toHaveLength(1);
  });

  it("stok yetersiz olsa da KAYDEDER; stok eksiye düşmez (yalnız mevcut kadar düşer)", () => {
    const satislar = holder([]);
    const stock = holder([{ id: 1, partId: "7", miktar: 3 }]);
    const log = holder([]);
    const r = yeniYedekParcaSatis({ aliciTipi: "bayi", dealerId: "5", partId: "7", miktar: "5" },
      { setYedekParcaSatislar: satislar.set, setPartStock: stock.set, setPartStockLog: log.set, partStock: stock.get() });
    expect(r.ok).toBe(true);                                         // yine kaydeder
    expect(satislar.get()[0].miktar).toBe(5);                        // satış tam miktarla kayıtlı
    expect(stock.get().find(x => x.partId === "7").miktar).toBe(0);  // eksiye düşmedi (3 → 0)
    expect(log.get().filter(l => l.tip === "bayi_satis")[0].miktar).toBe(-3); // yalnız mevcut (3) düşüldü
  });

  it("hiç stok yoksa satış yine kaydedilir, stok hareketi oluşmaz", () => {
    const satislar = holder([]);
    const stock = holder([]);
    const log = holder([]);
    const r = yeniYedekParcaSatis({ aliciTipi: "bayi", dealerId: "5", partId: "7", miktar: "5" },
      { setYedekParcaSatislar: satislar.set, setPartStock: stock.set, setPartStockLog: log.set, partStock: [] });
    expect(r.ok).toBe(true);
    expect(satislar.get()[0].miktar).toBe(5);
    expect(log.get()).toHaveLength(0); // düşülecek stok yok → hareket yok
  });

  it("alıcı müşteri ise parçayı otomatik o makinaya tam tahsis eder (nereden eklenirse eklensin)", () => {
    const satislar = holder([]);
    const stock = holder([{ id: 1, partId: "7", miktar: 10 }]);
    const log = holder([]);
    const r = yeniYedekParcaSatis(
      { aliciTipi: "musteri", musteriId: "42", partId: "7", miktar: "4", birimFiyat: "100" },
      { setYedekParcaSatislar: satislar.set, setPartStock: stock.set, setPartStockLog: log.set, partStock: stock.get() }
    );
    expect(r.ok).toBe(true);
    const t = satislar.get()[0].tahsisler;
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ miktar: 4, customerId: 42 });
  });

  it("planlanmış kargo 'kendi ekledik' işaretlenmez (düşünce alarm gelsin); hemen düşen işaretlenir", () => {
    const noop = () => {};
    const partStock = [{ id: 1, partId: "7", miktar: 100 }];
    const mk = (over) => yeniYedekParcaSatis({ aliciTipi: "bayi", dealerId: 5, partId: "7", miktar: "1", ...over }, { setYedekParcaSatislar: noop, setPartStock: noop, setPartStockLog: noop, partStock });
    const hemen = mk({});
    expect(yerelServisMi(hemen.id)).toBe(true);                          // hemen düşen → susturulur
    const planli = mk({ panoDusmeZamani: "2099-01-01T08:00" });
    expect(yerelServisMi(planli.id)).toBe(false);                        // planlanmış → düşünce öter
  });

  it("doğrulama başarısızsa kayıt/stok'a dokunmaz", () => {
    const satislar = holder([]);
    const stock = holder([{ id: 1, partId: "7", miktar: 10 }]);
    const log = holder([]);
    const r = yeniYedekParcaSatis({ aliciTipi: "bayi", partId: "7", miktar: "5" }, { setYedekParcaSatislar: satislar.set, setPartStock: stock.set, setPartStockLog: log.set });
    expect(r.ok).toBe(false);
    expect(satislar.get()).toHaveLength(0);
    expect(stock.get()[0].miktar).toBe(10);
    expect(log.get()).toHaveLength(0);
  });
});

describe("kargoPlanlandiMi (panoya düşme zamanı)", () => {
  const now = "2026-07-26T10:00:00";
  it("panoya düşme zamanı ileri → planlanmış (true)", () => {
    expect(kargoPlanlandiMi({ panoDusmeZamani: "2026-07-28T08:00" }, now)).toBe(true);
  });
  it("geçmiş / yok / nowIso yok → false", () => {
    expect(kargoPlanlandiMi({ panoDusmeZamani: "2026-07-25T08:00" }, now)).toBe(false);
    expect(kargoPlanlandiMi({}, now)).toBe(false);
    expect(kargoPlanlandiMi({ panoDusmeZamani: "2026-07-28T08:00" }, null)).toBe(false);
  });
});

describe("musteriTahsisi (alıcı müşteriyse otomatik tam tahsis)", () => {
  it("alıcı müşteri → o makinaya (musteriId) tam-tahsis üretir", () => {
    const t = musteriTahsisi({ aliciTipi: "musteri", musteriId: 7, miktar: 4 });
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ miktar: 4, customerId: 7, makinaSerbest: "" });
  });
  it("alıcı bayi / musteriId yok / miktar yok → boş (elle tahsis)", () => {
    expect(musteriTahsisi({ aliciTipi: "bayi", dealerId: 5, miktar: 4 })).toEqual([]);
    expect(musteriTahsisi({ aliciTipi: "musteri", miktar: 4 })).toEqual([]);
    expect(musteriTahsisi({ aliciTipi: "musteri", musteriId: 7, miktar: 0 })).toEqual([]);
  });
});
