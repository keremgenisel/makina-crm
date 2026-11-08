// @vitest-environment jsdom
// Spec 0136 C6, C6/2, AC-28, AC-30, AC-31, AC-32, AC-38, AC-79: maliyet görüntüsü (`kapanisMaliyeti`) olmayan veride parti payı,
// parti hesabı (her parti), kâr özeti, sapma kutusu ve iki ekranın metni spec öncesi kodla birebir aynıdır. Altın
// `tests/fixtures/0136-once.json` spec öncesi koddan `YAZ_0136=1` ile üretildi. Ekran metninde yalnız bu spec'in iki yeni ibaresi
// (kapanma tarihi ve "dondurulmadı") ayıklanır (plan turu Karar 39).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { readFileSync, writeFileSync } from "node:fs";
import { MakinaMaliyeti } from "../src/components/MakinaMaliyeti";
import { partiGenelPaylari, partiHesabi, modelMaliyetleri } from "../src/lib/makinaStandartMaliyet";
import * as V from "./fixtures/0136-veri";

vi.mock("../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-06-15T10:00:00")); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const ALTIN = "tests/fixtures/0136-once.json";
// Plan turu Karar 39: bu spec'in ekrana eklediği ibareler (spec öncesi kodda yok) karşılaştırmadan önce ayıklanır.
export const ayikla = (m) => String(m).replace(/Kapanış \d{2}\.\d{2}\.\d{4}/g, "").replace(/dondurulmadı/g, "")
  .replace(/Bu parti maliyet dondurmasından önce kapandı[^.]*\.[^.]*\./g, "").replace(/Parti kapandı; planlanan adetler kapanmış partide değiştirilmez\./g, "");

const ekran = (gorunum, partiId) => {
  render(<MakinaMaliyeti giderler={V.GIDERLER} giderTurleri={V.TURLER} setGiderTurleri={vi.fn()} tedarikciler={[]} uretimPartileri={V.PARTILER} setUretimPartileri={vi.fn()}
    stock={V.STOCK} customers={V.CUSTOMERS} tumMusteriler={V.CUSTOMERS} parts={V.PARCALAR} standardModels={V.STANDART} customModels={V.OZEL} setStandardModels={vi.fn()} setCustomModels={vi.fn()}
    appSettings={{ giderAyarlari: { yururlukAy: V.YURURLUK }, maliyetAyarlari: V.AYAR }} setAppSettings={vi.fn()} rates={{}} showToast={vi.fn()} baslangicGorunum={gorunum} />);
  if (partiId != null) fireEvent.change(screen.getByLabelText("Üretim partisi"), { target: { value: String(partiId) } });
  const m = document.body.textContent; cleanup(); return m;
};
const uret = () => {
  const v = V.veri();
  const pay = partiGenelPaylari(v, V.BUGUN);
  const modeller = modelMaliyetleri({ standardModels: V.STANDART, customModels: V.OZEL, parts: V.PARCALAR }, 65000);
  return {
    pay,
    hesap: V.PARTILER.map(p => partiHesabi(p, v, { payK: 65000, modeller, bugun: V.BUGUN, katalog: V.katalog(), partiPay: pay.partiler.find(x => x.id === p.id) })),
    partilerEkrani: ekran("partiler"),
    partiEkrani: V.PARTILER.map(p => ekran("parti", p.id)),
  };
};
const temiz = (x) => JSON.parse(JSON.stringify(x, (k, v) => (v instanceof Map ? [...v] : v)));

describe("Spec 0136 kıyas (C6)", () => {
  it("AC-28 / AC-30 / AC-31 / AC-32 / AC-38 / AC-79: görüntüsüz veride motor çıktıları ve iki ekranın metni spec öncesi altınla birebir", () => {
    const s = temiz(uret());
    if (process.env.YAZ_0136 === "1") { writeFileSync(ALTIN, JSON.stringify(s, null, 1)); return; }
    const a = JSON.parse(readFileSync(ALTIN, "utf8"));
    expect(s.pay).toEqual(a.pay);
    expect(s.hesap).toEqual(a.hesap);
    expect(ayikla(s.partilerEkrani)).toBe(ayikla(a.partilerEkrani));
    expect(s.partiEkrani.map(ayikla)).toEqual(a.partiEkrani.map(ayikla));
  });
});
