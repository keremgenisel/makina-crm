// Bayiye yedek parça (kargo) satışı stok yardımcısı (src/lib/yedekParcaStok.js). servisStok.js'in
// kardeşi; fark stok hareketi tipinin "bayi_satis" olması. Regresyon: satışta stok DÜŞER, silme/
// düzenlemede geri alınır (çift düşme / stok kaçağı olmamalı); "servis" hareketleriyle karışmaz.
import { describe, it, expect } from "vitest";
import { yedekParcaDus, yedekParcaGeriAl } from "../src/lib/yedekParcaStok.js";

const holder = (init) => {
  let s = init;
  const set = (u) => { s = typeof u === "function" ? u(s) : u; };
  return { set, get: () => s };
};

describe("yedekParcaDus / yedekParcaGeriAl", () => {
  it("satışta parçayı stoktan düşer ve 'bayi_satis' log kaydı yazar", () => {
    const stock = holder([{ id: 1, partId: "7", miktar: 10 }]);
    const log = holder([]);
    yedekParcaDus("7", 5, 900, stock.set, log.set); // 5 dişli sat
    expect(stock.get().find(x => x.partId === "7").miktar).toBe(5);
    const kayit = log.get().filter(l => l.referansId === 900 && l.tip === "bayi_satis");
    expect(kayit).toHaveLength(1);
    expect(kayit[0].partId).toBe("7");
    expect(kayit[0].miktar).toBe(-5);
  });

  it("geçersiz miktar/partId sessizce atlanır", () => {
    const stock = holder([{ id: 1, partId: "7", miktar: 10 }]);
    const log = holder([]);
    yedekParcaDus("7", 0, 1, stock.set, log.set);
    yedekParcaDus(null, 3, 2, stock.set, log.set);
    expect(stock.get()[0].miktar).toBe(10);
    expect(log.get()).toHaveLength(0);
  });

  it("geri alma stoğu iade eder ve o satışın loglarını siler", () => {
    const stock = holder([{ id: 1, partId: "7", miktar: 5 }]);
    const log = holder([{ id: 9, partId: "7", miktar: -5, tip: "bayi_satis", referansId: 900 }]);
    yedekParcaGeriAl(900, stock.set, log.set);
    expect(stock.get().find(x => x.partId === "7").miktar).toBe(10);
    expect(log.get().filter(l => l.referansId === 900)).toHaveLength(0);
  });

  it("düzenleme akışı (geri al → yeniden düş) stok kaçağı yaratmaz", () => {
    const stock = holder([{ id: 1, partId: "7", miktar: 10 }]);
    const log = holder([]);
    yedekParcaDus("7", 5, 42, stock.set, log.set); // 5 kaldı
    expect(stock.get()[0].miktar).toBe(5);
    yedekParcaGeriAl(42, stock.set, log.set);      // 10'a döndü
    yedekParcaDus("7", 3, 42, stock.set, log.set); // yeni miktar 3 → 7
    expect(stock.get()[0].miktar).toBe(7);
    expect(log.get().filter(l => l.referansId === 42)).toHaveLength(1);
  });

  it("aynı parçanın 'servis' hareketini geri almaz (yalnız bayi_satis)", () => {
    const stock = holder([{ id: 1, partId: "7", miktar: 4 }]);
    const log = holder([{ id: 1, partId: "7", miktar: -3, tip: "servis", referansId: 42 }]);
    yedekParcaGeriAl(42, stock.set, log.set); // referans aynı ama tip "servis" → dokunulmaz
    expect(stock.get()[0].miktar).toBe(4);
    expect(log.get()).toHaveLength(1);
  });

  it("setter yoksa sessizce hiçbir şey yapmaz", () => {
    expect(() => yedekParcaDus("7", 1, 1, null, null)).not.toThrow();
    expect(() => yedekParcaGeriAl(1, null, null)).not.toThrow();
  });
});
