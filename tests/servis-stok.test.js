// Paylaşılan servis-parça stok yardımcısı (src/lib/servisStok.js). Hem müşteri detay modalı hem
// Servis Panosu aynı ServiceForm'u kullandığından stok düşme/geri alma tek kaynaktan çalışır.
// Regresyon koruması: panoda serviste parça seçilince stok düşmeli; düzenlemede önce geri alınıp
// yeniden düşülmeli (çift düşme / stok kaçağı olmamalı).
import { describe, it, expect } from "vitest";
import { servisParcaDus, servisParcaGeriAl } from "../src/lib/servisStok.js";

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
      555, stock.set, log.set
    );
    // partId boş / miktar 0 geçersiz → yalnız 7 düşer
    expect(stock.get().find(x => x.partId === "7").miktar).toBe(7);
    const kayit = log.get().filter(l => l.referansId === 555 && l.tip === "servis");
    expect(kayit).toHaveLength(1);
    expect(kayit[0].partId).toBe("7");
    expect(kayit[0].miktar).toBe(-3);
  });

  it("geri alma stoğu iade eder ve o servisin loglarını siler", () => {
    const stock = holder([{ id: 1, partId: "7", miktar: 7 }]);
    const log = holder([{ id: 9, partId: "7", miktar: -3, tip: "servis", referansId: 555 }]);
    servisParcaGeriAl(555, stock.set, log.set);
    expect(stock.get().find(x => x.partId === "7").miktar).toBe(10);
    expect(log.get().filter(l => l.referansId === 555)).toHaveLength(0);
  });

  it("düzenleme akışı (geri al → yeniden düş) stok kaçağı yaratmaz", () => {
    const stock = holder([{ id: 1, partId: "7", miktar: 10 }]);
    const log = holder([]);
    servisParcaDus([{ partId: "7", miktar: 4 }], 42, stock.set, log.set); // ilk kayıt: 6 kaldı
    expect(stock.get()[0].miktar).toBe(6);
    // düzenleme: önce eskiyi geri al (10), sonra yeni miktarı (2) düş → 8
    servisParcaGeriAl(42, stock.set, log.set);
    servisParcaDus([{ partId: "7", miktar: 2 }], 42, stock.set, log.set);
    expect(stock.get()[0].miktar).toBe(8);
    expect(log.get().filter(l => l.referansId === 42)).toHaveLength(1);
  });

  it("setter yoksa (stok yönetimi kapalı) sessizce hiçbir şey yapmaz", () => {
    expect(() => servisParcaDus([{ partId: "7", miktar: 1 }], 1, null, null)).not.toThrow();
    expect(() => servisParcaGeriAl(1, null, null)).not.toThrow();
  });
});
