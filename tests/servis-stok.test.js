// Paylaşılan servis-parça stok yardımcısı (src/lib/servisStok.js). Hem müşteri detay modalı hem
// Servis Panosu aynı ServiceForm'u kullandığından stok düşme/geri alma tek kaynaktan çalışır.
// Regresyon koruması: panoda serviste parça seçilince stok düşmeli; düzenlemede önce geri alınıp
// yeniden düşülmeli (çift düşme / stok kaçağı olmamalı). KIRPMA: stok hiçbir zaman eksiye düşmez.
import { describe, it, expect } from "vitest";
import { servisParcaDus, servisParcaGeriAl, servisParcaYenile, servisParcalariYenidenDus } from "../src/lib/servisStok.js";
import { netDusum } from "../src/lib/stokHareketi.js";

// setState(updater) davranışını taklit eden basit tutucu
const holder = (init) => {
  let s = init;
  const set = (u) => { s = typeof u === "function" ? u(s) : u; };
  return { set, get: () => s };
};

describe("servisParcaDus / servisParcaGeriAl", () => {
  it("geçerli parçaları stoktan düşer ve 'servis' log kaydı yazar", () => {
    const stock = holder([{ id: 1, partId: "7", miktar: 10 }]);
    const log = holder([]);
    servisParcaDus(
      [{ partId: "7", miktar: 3 }, { partId: "", miktar: 2 }, { partId: "8", miktar: 0 }],
      555, stock.set, log.set, stock.get(), log.get()
    );
    // partId boş / miktar 0 geçersiz → yalnız 7 düşer
    expect(stock.get().find(x => x.partId === "7").miktar).toBe(7);
    const kayit = log.get().filter(l => l.referansId === 555 && l.tip === "servis");
    expect(kayit).toHaveLength(1);
    expect(kayit[0].partId).toBe("7");
    expect(kayit[0].miktar).toBe(-3);
  });

  // Spec 0065 R6 ile güncellendi: geri alma log satırını SİLMEZ, servis_iade karşı hareketi yazar.
  it("AC-8: geri alma stoğu iade eder ve log'a karşı hareket yazar (satır silinmez)", () => {
    const stock = holder([{ id: 1, partId: "7", miktar: 7 }]);
    const log = holder([{ id: 9, partId: "7", miktar: -3, tip: "servis", referansId: 555 }]);
    servisParcaGeriAl(555, stock.set, log.set);
    expect(stock.get().find(x => x.partId === "7").miktar).toBe(10);
    expect(log.get().find(l => l.id === 9)).toBeTruthy();
    expect(log.get().filter(l => l.tip === "servis_iade")).toEqual([expect.objectContaining({ partId: "7", miktar: 3, referansId: 555, notlar: expect.stringMatching(/silindi/) })]);
    expect(netDusum(log.get(), 555, "servis", "7")).toBe(0);
  });
  it("AC-11: ikinci geri alma etkisizdir; aynı kaydın stoğu iki kez geri alınmaz", () => {
    const stock = holder([{ id: 1, partId: "7", miktar: 7 }]);
    const log = holder([{ id: 9, partId: "7", miktar: -3, tip: "servis", referansId: 555 }]);
    servisParcaGeriAl(555, stock.set, log.set);
    servisParcaGeriAl(555, stock.set, log.set);
    expect(stock.get()[0].miktar).toBe(10);
    expect(log.get()).toHaveLength(2);
  });
  it("AC-11: parçalar aynı ve tam düşülmüşse düzenleme stok hareketi yazmaz; değişince yalnız fark yansır", () => {
    const stock = holder([{ id: 1, partId: "7", miktar: 10 }]);
    const log = holder([]);
    servisParcaDus([{ partId: "7", miktar: 4 }], 42, stock.set, log.set, stock.get(), log.get());
    servisParcaYenile([{ partId: "7", miktar: 4 }], 42, stock.set, log.set, stock.get(), log.get());
    expect(stock.get()[0].miktar).toBe(6);
    expect(log.get()).toHaveLength(1);
    servisParcaYenile([{ partId: "7", miktar: 5 }], 42, stock.set, log.set, stock.get(), log.get());
    expect(stock.get()[0].miktar).toBe(5);
    expect(netDusum(log.get(), 42, "servis", "7")).toBe(5);
  });
  it("AC-24 (R17): çöpten geri alınan servisin iade edilmiş parçaları yeniden düşülür; log'u olmayan eski kayıtta düşülmez", () => {
    const stock = holder([{ id: 1, partId: "7", miktar: 10 }]);
    const log = holder([]);
    const sv = { id: 77, degisenParcalar: [{ partId: "7", miktar: 2 }] };
    servisParcaDus(sv.degisenParcalar, sv.id, stock.set, log.set, stock.get(), log.get());
    servisParcaGeriAl(sv.id, stock.set, log.set);
    expect(stock.get()[0].miktar).toBe(10);
    servisParcalariYenidenDus([sv], stock.set, log.set, stock.get(), log.get());
    expect(stock.get()[0].miktar).toBe(8);
    expect(netDusum(log.get(), 77, "servis", "7")).toBe(2);
    servisParcalariYenidenDus([sv], stock.set, log.set, stock.get(), log.get()); // net düşüm var → ikinci kez düşmez
    expect(stock.get()[0].miktar).toBe(8);
    servisParcalariYenidenDus([{ id: 78, degisenParcalar: [{ partId: "7", miktar: 3 }] }], stock.set, log.set, stock.get(), log.get());
    expect(stock.get()[0].miktar).toBe(8);
  });

  it("düzenleme akışı (geri al → yeniden düş) stok kaçağı yaratmaz", () => {
    const stock = holder([{ id: 1, partId: "7", miktar: 10 }]);
    const log = holder([]);
    servisParcaDus([{ partId: "7", miktar: 4 }], 42, stock.set, log.set, stock.get(), log.get()); // 6 kaldı
    expect(stock.get()[0].miktar).toBe(6);
    // düzenleme: gerçek uygulamada düş çağrısına geçen prop snapshot'ı geri-alma ÖNCESİ haldir → yakala.
    const psSnap = stock.get();  // 6 (geri-al öncesi, prop gibi)
    const logSnap = log.get();   // [-4] (geri-al öncesi, prop gibi)
    servisParcaGeriAl(42, stock.set, log.set);                 // canlı: 10, log [-4, +4 iade] (spec 0065 R6)
    servisParcaDus([{ partId: "7", miktar: 2 }], 42, stock.set, log.set, psSnap, logSnap);
    // taban = 6 + geri gelen 4 = 10; kırpılmış düş = 2; canlı 10 - 2 = 8
    expect(stock.get()[0].miktar).toBe(8);
    expect(log.get().filter(l => l.referansId === 42).map(l => [l.tip, l.miktar])).toEqual([["servis", -4], ["servis_iade", 4], ["servis", -2]]);
    expect(netDusum(log.get(), 42, "servis", "7")).toBe(2);
  });

  it("stok yetersizse eksiye düşmez, sıfırda kalır; log yalnız MEVCUT kadarını yazar", () => {
    const stock = holder([{ id: 1, partId: "7", miktar: 5 }]);
    const log = holder([]);
    // 8 parça değişti ama stokta 5 var → 5 düşer, stok 0, log -5. Servis yine tam kaydedilir (çağıran).
    servisParcaDus([{ partId: "7", miktar: 8 }], 77, stock.set, log.set, stock.get(), log.get());
    expect(stock.get()[0].miktar).toBe(0);
    const kayit = log.get().filter(l => l.referansId === 77);
    expect(kayit).toHaveLength(1);
    expect(kayit[0].miktar).toBe(-5);
  });

  it("stok sıfırken düşüş hiçbir şey yapmaz (log yazılmaz) ama çökmemeli — satış/servis yine kaydedilir", () => {
    const stock = holder([{ id: 1, partId: "7", miktar: 0 }]);
    const log = holder([]);
    servisParcaDus([{ partId: "7", miktar: 3 }], 88, stock.set, log.set, stock.get(), log.get());
    expect(stock.get()[0].miktar).toBe(0);
    expect(log.get()).toHaveLength(0);
  });

  it("kırpılmış düşüşün geri-alması tutarlı: 0'a kırpılan servis geri alınınca stok başa döner", () => {
    const stock = holder([{ id: 1, partId: "7", miktar: 5 }]);
    const log = holder([]);
    servisParcaDus([{ partId: "7", miktar: 8 }], 99, stock.set, log.set, stock.get(), log.get()); // stok 0, log -5
    expect(stock.get()[0].miktar).toBe(0);
    servisParcaGeriAl(99, stock.set, log.set); // gerçek düşen 5 geri gelir
    expect(stock.get()[0].miktar).toBe(5);     // 8 değil 5 (fantom 3 iade edilmez → şişme yok)
    expect(log.get().map(l => l.miktar)).toEqual([-5, 5]); // spec 0065 R6: karşı hareket, satır silinmez
  });

  it("Triyaj 2 (AC-24): aynı parçayı kullanan iki servis müşteriyle geri alınınca taban birikimlidir; stok 1 → 0, log'a tek −1", () => {
    const stock = holder([{ id: 1, partId: "7", miktar: 1 }]);
    const log = holder([
      { id: 1, partId: "7", miktar: -1, tip: "servis", referansId: 61 }, { id: 2, partId: "7", miktar: 1, tip: "servis_iade", referansId: 61 },
      { id: 3, partId: "7", miktar: -1, tip: "servis", referansId: 62 }, { id: 4, partId: "7", miktar: 1, tip: "servis_iade", referansId: 62 },
    ]);
    const svler = [{ id: 61, degisenParcalar: [{ partId: "7", miktar: 1 }] }, { id: 62, degisenParcalar: [{ partId: "7", miktar: 1 }] }];
    servisParcalariYenidenDus(svler, stock.set, log.set, stock.get(), log.get());
    expect(stock.get()[0].miktar).toBe(0);
    const yeni = log.get().slice(4);
    expect(yeni).toEqual([expect.objectContaining({ partId: "7", miktar: -1, tip: "servis", referansId: 61 })]);
  });

  it("setter yoksa (stok yönetimi kapalı) sessizce hiçbir şey yapmaz", () => {
    expect(() => servisParcaDus([{ partId: "7", miktar: 1 }], 1, null, null)).not.toThrow();
    expect(() => servisParcaGeriAl(1, null, null)).not.toThrow();
  });
});
