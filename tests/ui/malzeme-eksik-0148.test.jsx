// @vitest-environment jsdom
// Spec 0148: Malzemeler listesinde fiyatı hiç girilmemiş malzeme rozet, neden satırı ve başlık sayısı almaz; yarım girişler ve
// özgül ağırlık eksikliği uyarmayı sürdürür. Gerçek `MalzemeManager`.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { MalzemeManager } from "../../src/components/MalzemeManager";
import * as M from "../../src/lib/malzeme";
import { FIYATSIZ, FIYATSIZ_OZGULSUZ, DOVIZ_FIYATSIZ, BANT_LAMASIZ, KURSUZ, GBP, TAM } from "../fixtures/0148-veri.js";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
afterEach(cleanup);

const ciz = (malzemeler) => render(<MalzemeManager malzemeler={malzemeler} setMalzemeler={vi.fn()} parts={[]} bugun="2026-11-16" />);
const satir = (ad) => screen.getAllByTestId("malzeme-satiri").find(r => r.querySelector("b").textContent === ad);
const rozet = (ad) => within(satir(ad)).queryByTestId("malzeme-eksik");
const neden = (ad) => satir(ad).querySelector("td").querySelector("div")?.textContent ?? null;
const baslik = () => screen.getByTestId("malzeme-eksik-sayisi").textContent;

describe("Spec 0148: Malzemeler listesi", () => {
  it("AC-1 / AC-2: fiyatsız malzemede rozet ve neden satırı yok", () => {
    ciz([FIYATSIZ, KURSUZ]);
    expect(rozet("Beyaz derlin")).toBeNull(); expect(neden("Beyaz derlin")).toBeNull();
    expect(rozet("EUR çelik")).not.toBeNull();
  });
  it("AC-3: fiyatsız malzeme başlıktaki eksik sayısına girmez", () => {
    ciz([FIYATSIZ, KURSUZ, TAM]);
    expect(baslik()).toBe(M.eksikSayiMetni(1));
  });
  it("AC-4: bütün eksiklikler bu türdense başlık malzeme sayısını yazar", () => {
    ciz([FIYATSIZ, DOVIZ_FIYATSIZ, TAM]);
    expect(baslik()).toBe("3 malzeme");
  });
  it("AC-5: özgül ağırlığı ve fiyatı girilmemiş malzemede rozet, neden yalnız özgül ağırlık", () => {
    ciz([FIYATSIZ_OZGULSUZ]);
    expect(rozet("Kestamid").textContent).toBe(M.EKSIK_ROZETI);
    expect(neden("Kestamid")).toBe(M.EKSIK_OZGUL);
  });
  it("AC-6 / AC-7 / AC-9: yarım fiyat girişi ve tanınmayan para birimi bugünkü rozet ve nedeni korur", () => {
    ciz([BANT_LAMASIZ, KURSUZ, GBP]);
    expect(neden("304")).toBe(M.EKSIK_KILO_LAMA);
    expect(neden("EUR çelik")).toBe(M.EKSIK_KUR);
    expect(neden("GBP çelik")).toBe(M.EKSIK_PARA);
    expect(baslik()).toBe(M.eksikSayiMetni(3));
  });
  it("AC-8: dövizli ama fiyatsız, kursuz malzeme rozet almaz", () => {
    ciz([DOVIZ_FIYATSIZ]);
    expect(rozet("Pirinç")).toBeNull(); expect(neden("Pirinç")).toBeNull();
  });
  it("AC-10: fiyatsız malzemenin Fiyat hücresi 'fiyat girilmedi' yazar", () => {
    ciz([FIYATSIZ]);
    expect(within(satir("Beyaz derlin")).getByTestId("malzeme-fiyat").textContent).toBe("fiyat girilmedi");
  });
  it("AC-13: hiç malzeme yokken boş durum", () => {
    ciz([]);
    expect(screen.getByTestId("bos-malzeme")).toBeTruthy(); expect(baslik()).toBe("0 malzeme");
  });
  it("AC-14: çöpteki eksik malzeme başlık sayısına girmez", () => {
    ciz([KURSUZ, { ...FIYATSIZ_OZGULSUZ, deletedAt: "2026-11-01" }]);
    expect(baslik()).toBe(M.eksikSayiMetni(1));
  });
});
