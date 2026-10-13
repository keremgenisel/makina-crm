// Spec 0081 R16, C7 (plan P3): Dönem Raporu'nun yan kutuları kapalı başlar. Kutu içeriğini okuyan her test önce kutuyu bu
// yardımcıyla açar. Yardımcı açıldığını aria-expanded ile KANITLAR: kapalı kutuda her iç öğe "yok" göründüğü için bir yokluk
// iddiası kutu kapalıyken yanlış nedenle geçerdi. Döndürdüğü değer kutunun kabıdır (data-testid taşıyan kart).
import { screen, fireEvent, within } from "@testing-library/react";
import { expect } from "vitest";

const kacis = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const kutuAc = (baslik, kap = null) => {
  const q = kap ? within(kap) : screen;
  const dugme = q.getByRole("button", { name: new RegExp(`^${kacis(baslik)}`) });
  if (dugme.getAttribute("aria-expanded") !== "true") fireEvent.click(dugme);
  expect(dugme.getAttribute("aria-expanded"), `${baslik} açılmadı`).toBe("true");
  return dugme.closest("[data-testid]");
};
