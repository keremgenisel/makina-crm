// Yedek parça satışı ortak kayıt mantığı (src/lib/yedekParcaSatis.js). Stok sekmesi + müşteri detay
// modalı + bayi detay modalı bunu paylaşır; doğrulama ve stok düşümü tek kaynaktan çalışsın.
import { describe, it, expect } from "vitest";
import { yedekParcaRec, yeniYedekParcaSatis, yeniYedekParcaSatisCoklu, musteriTahsisi, kargoPlanlandiMi } from "../src/lib/yedekParcaSatis.js";
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

  it("Diğer (anlaşmasız dış firma) alıcı: disFirma + firma bilgileri kayda geçer, dealerId null", () => {
    const r = yedekParcaRec({ aliciTipi: "bayi", disFirma: true, disFirmaAd: "Harici Ltd", disFirmaYetkili: "Ali", disFirmaTel: "0555", disFirmaUlke: "Türkiye", disFirmaSehir: "Bursa", partId: "7", miktar: "2" });
    expect(r.ok).toBe(true);
    expect(r.rec.disFirma).toBe(true);
    expect(r.rec.disFirmaAd).toBe("Harici Ltd");
    expect(r.rec.dealerId).toBe(null);
  });

  it("Diğer alıcıda firma adı boşsa hata döner", () => {
    const r = yedekParcaRec({ aliciTipi: "bayi", disFirma: true, disFirmaAd: "  ", partId: "7", miktar: "2" });
    expect(r.ok).toBe(false);
    expect(r.hata).toMatch(/Dış firma adı/);
  });

  it("farklı teslimat adresi: teslimatFarkli true ise alanlar kayda geçer (alıcı türünden bağımsız)", () => {
    const r = yedekParcaRec({ aliciTipi: "bayi", dealerId: "5", partId: "7", miktar: "1", teslimatFarkli: true,
      teslimatAd: "Şantiye", teslimatTel: "0312", teslimatAdres: "OSB No:8", teslimatUlke: "Türkiye", teslimatSehir: "Ankara", teslimatIlce: "Sincan" });
    expect(r.ok).toBe(true);
    expect(r.rec.teslimatFarkli).toBe(true);
    expect(r.rec.teslimatAd).toBe("Şantiye");
    expect(r.rec.teslimatAdres).toBe("OSB No:8");
    expect(r.rec.teslimatSehir).toBe("Ankara");
    expect(r.rec.teslimatIlce).toBe("Sincan");
  });

  it("farklı teslimat adresi: teslimatFarkli yoksa alanlar boşlanır (sızıntı olmasın)", () => {
    // Kutu işaretlenmeden alanlarda değer kalmışsa (kullanıcı işaretleyip vazgeçti) normalize temizler.
    const r = yedekParcaRec({ aliciTipi: "bayi", dealerId: "5", partId: "7", miktar: "1", teslimatAd: "Kalmış", teslimatAdres: "Eski adres" });
    expect(r.rec.teslimatFarkli).toBe(false);
    expect(r.rec.teslimatAd).toBe("");
    expect(r.rec.teslimatAdres).toBe("");
  });

  it("kargoDurum OPT-IN: verilmezse boş (panoya düşmez); verilirse korunur", () => {
    // Panoya gönderme artık formdaki checkbox ile opt-in. Checkbox kapalıyken kargoDurum boş → panoda görünmez.
    const r = yedekParcaRec({ aliciTipi: "bayi", dealerId: "5", partId: "7", miktar: "1" });
    expect(r.rec.kargoDurum).toBe("");
    // Checkbox açıkken (kargoDurum verilir) korunur:
    expect(yedekParcaRec({ aliciTipi: "bayi", dealerId: "5", partId: "7", miktar: "1", kargoDurum: "Hazırlanıyor" }).rec.kargoDurum).toBe("Hazırlanıyor");
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

describe("yedekParcaRec — kredi kartı komisyonu yansıtma (düzenlemede kalem geri çıkar)", () => {
  const AYAR = { bsmv: 5, satirlar: [{ taksit: 3, oran: 7.47, katkiPayi: 0.5, blokajGun: 0 }] };
  const KDV = { "2020-01-01": 20 };
  it("yansıt: birimFiyat=matrah/miktar saklanır, yansitildi=true; (matrah − komisyon)/miktar = girilen kalem", () => {
    const miktar = 5, kalemBirim = 2000; // kalem toplam 10.000
    const rec = yedekParcaRec({ aliciTipi: "bayi", dealerId: "5", partId: "7", miktar: String(miktar), birimFiyat: kalemBirim,
      currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-08-12", odendi: true, yontem: "Kredi Kartı", taksitSayisi: 3, kkYansit: true }, AYAR, KDV).rec;
    expect(rec.kartKomisyonu.yansitildi).toBe(true);                 // düzenlemede kutu seçili gelmeli
    expect(rec.birimFiyat).toBeGreaterThan(kalemBirim);              // matrah/miktar > kalem (komisyon eklendi)
    const matrahToplam = miktar * rec.birimFiyat;
    const kalemGeri = (matrahToplam - rec.kartKomisyonu.toplamKesinti) / miktar;
    expect(kalemGeri).toBeCloseTo(kalemBirim, 0);                    // fiyat kalem'e döner (değişmez)
  });
  it("yansıt yok: birimFiyat = kalem (değişmez), yansitildi=false", () => {
    const rec = yedekParcaRec({ aliciTipi: "bayi", dealerId: "5", partId: "7", miktar: "2", birimFiyat: 3000,
      currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-08-12", odendi: true, yontem: "Kredi Kartı", taksitSayisi: 3, kkYansit: false }, AYAR, KDV).rec;
    expect(rec.birimFiyat).toBe(3000);
    expect(rec.kartKomisyonu.yansitildi).toBe(false);
  });
  it("kartTarihi (kart işlem tarihi) verilince blokaj/bazTarih o tarihten; boşsa satış tarihi", () => {
    const AYAR40 = { bsmv: 5, satirlar: [{ taksit: 1, oran: 3.1, katkiPayi: 0.5, blokajGun: 40 }] };
    // kartTarihi 2026-01-01 → hesaba geçiş 2026-02-10; satış tarihi (08-12) baz alınmaz
    const rec = yedekParcaRec({ aliciTipi: "bayi", dealerId: "5", partId: "7", miktar: "1", birimFiyat: 100000,
      currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-08-12", kartTarihi: "2026-01-01", odendi: true, yontem: "Kredi Kartı", taksitSayisi: 1, kkYansit: false }, AYAR40, KDV).rec;
    expect(rec.kartKomisyonu.bazTarih).toBe("2026-01-01");
    expect(rec.kartKomisyonu.hesabaGecis).toBe("2026-02-10");
    // kartTarihi boş → satış tarihine (08-12) düşer
    const rec2 = yedekParcaRec({ aliciTipi: "bayi", dealerId: "5", partId: "7", miktar: "1", birimFiyat: 100000,
      currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-08-12", odendi: true, yontem: "Kredi Kartı", taksitSayisi: 1, kkYansit: false }, AYAR40, KDV).rec;
    expect(rec2.kartKomisyonu.bazTarih).toBe("2026-08-12");
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

describe("yeniYedekParcaSatisCoklu (çoklu satır → çoklu kayıt)", () => {
  it("her parça satırı için ayrı kayıt oluşturur ve ortak alanları uygular", () => {
    setIdCounter(3000);
    const satislar = holder([]);
    const stock = holder([{ id: 1, partId: "7", miktar: 10 }, { id: 2, partId: "8", miktar: 10 }]);
    const log = holder([]);
    const r = yeniYedekParcaSatisCoklu(
      { aliciTipi: "bayi", dealerId: "5", currency: "USD", odendi: true,
        satirlar: [{ partId: "7", miktar: "3", birimFiyat: "100" }, { partId: "8", miktar: "2", birimFiyat: "50" }] },
      { setYedekParcaSatislar: satislar.set, setPartStock: stock.set, setPartStockLog: log.set, partStock: stock.get() }
    );
    expect(r.ok).toBe(true);
    expect(r.n).toBe(2);
    expect(satislar.get()).toHaveLength(2);
    // Ortak alanlar her kayıtta
    expect(satislar.get().every(s => s.dealerId === 5 && s.currency === "USD" && s.odendi === true)).toBe(true);
    // Stok her parçadan düştü
    expect(stock.get().find(x => x.partId === "7").miktar).toBe(7); // 10 - 3
    expect(stock.get().find(x => x.partId === "8").miktar).toBe(8); // 10 - 2
  });

  it("aynı parçadan iki satır → stok toplamdan düşer (yerel görünüm tükenir)", () => {
    const satislar = holder([]);
    const stock = holder([{ id: 1, partId: "7", miktar: 10 }]);
    const log = holder([]);
    const r = yeniYedekParcaSatisCoklu(
      { aliciTipi: "bayi", dealerId: "5", satirlar: [{ partId: "7", miktar: "4" }, { partId: "7", miktar: "3" }] },
      { setYedekParcaSatislar: satislar.set, setPartStock: stock.set, setPartStockLog: log.set, partStock: stock.get() }
    );
    expect(r.ok).toBe(true);
    expect(stock.get().find(x => x.partId === "7").miktar).toBe(3); // 10 - 4 - 3
  });

  it("hiç geçerli satır yoksa hata döner, kayıt/stok değişmez", () => {
    const satislar = holder([]);
    const stock = holder([{ id: 1, partId: "7", miktar: 10 }]);
    const r = yeniYedekParcaSatisCoklu(
      { aliciTipi: "bayi", dealerId: "5", satirlar: [{ partId: "", miktar: "3" }, { partId: "7", miktar: "0" }] },
      { setYedekParcaSatislar: satislar.set, setPartStock: stock.set, setPartStockLog: holder([]).set, partStock: stock.get() }
    );
    expect(r.ok).toBe(false);
    expect(satislar.get()).toHaveLength(0);
    expect(stock.get()[0].miktar).toBe(10);
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
  it("geçmiş tarihli satışta tahsis tarihi SATIŞ tarihini alır (bugünü değil) — makina raporu bugünü göstermesin", () => {
    const t = musteriTahsisi({ aliciTipi: "musteri", musteriId: 7, miktar: 4, tarih: "2025-03-14" });
    expect(t[0].tarih).toBe("2025-03-14");
  });
});
