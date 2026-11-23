// @vitest-environment jsdom
// Spec 0154 C4, C4/2, C4/3 (AC-1, AC-29, AC-51, AC-57): Model kırılımının motor çıktısı (dört alan) ve Model görünümünün ekran
// metni spec öncesi kodla birebir aynı. Altın `tests/fixtures/0154-once.json` spec öncesi koddan ve `dealers` verilmeden
// üretildi (`YAZ_0154=1`); yeni alan altına girmez.
import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { hesaplaAnaliz } from "../../src/lib/analiz";
import { Analiz } from "../../src/components/Analiz";
import { VERI, ARALIK } from "../fixtures/0154-veri";

afterEach(cleanup);
const ONCE = path.resolve("tests/fixtures/0154-once.json");
const DORT = (v) => v.parcalar.map(p => ({ key: p.key, modeller: p.modeller, servis: p.servis, kargo: p.kargo, toplam: p.toplam }));

// Kutunun gövdesi: "Parça:" etiketinden sonrası (başlık satırı AC-1'in dışında, R1/2).
const govde = () => {
  const kutu = [...document.querySelectorAll("section")].find(s => s.textContent.includes("Seçilen parça en çok hangi modele gitti?"));
  const t = kutu.textContent;
  return t.slice(t.indexOf("Parça:"));
};
const ekranMetni = () => {
  render(<Analiz {...VERI} appSettings={{}} />);
  const sonuc = {};
  for (const ad of hesaplaAnaliz(VERI, {}).parcalar.map(p => p.ad)) {
    fireEvent.click(screen.getByLabelText("Parça seç"));
    const satir = screen.getAllByRole("button").find(b => b.querySelector("span")?.textContent === ad);
    fireEvent.click(satir);
    sonuc[ad] = govde();
  }
  cleanup();
  return sonuc;
};

const simdi = () => JSON.parse(JSON.stringify({ tum: DORT(hesaplaAnaliz(VERI, {})), aralik: DORT(hesaplaAnaliz(VERI, ARALIK)), ekran: ekranMetni() }));

describe("Spec 0154: Model kırılımı spec öncesiyle aynı", () => {
  it("AC-29 / AC-57 / AC-1 / AC-51: motorun dört alanı ve Model görünümünün ekran metni altınla birebir", () => {
    const s = simdi();
    if (process.env.YAZ_0154 === "1") { fs.writeFileSync(ONCE, JSON.stringify(s, null, 1)); return; }
    const once = JSON.parse(fs.readFileSync(ONCE, "utf8"));
    expect(s).toEqual(once);
    expect(JSON.stringify(once)).not.toMatch(/musteriler/);
  });
});
