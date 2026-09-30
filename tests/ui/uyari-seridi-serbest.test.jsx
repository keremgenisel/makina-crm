// @vitest-environment jsdom
// Spec 0011: uyarı şeridine serbest içerik (children). Bugünkü başlık + açıklama biçimi birebir korunur (AC-2: HTML,
// değişiklikten ÖNCE bugünkü bileşenden alınıp aşağıya sabitlendi); serbest içerik ailenin 800 tonuyla, aynı kapta çizilir.
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { UyariSeridi } from "../../src/components/tasarim";

afterEach(cleanup);

// Değişiklik öncesi (spec 0009 hâli) UyariSeridi çıktısı: aile|açıklama → innerHTML.
const ONCE_HTML = {
  "bilgi|metinsiz": "<div role=\"status\" data-testid=\"t\" style=\"background: var(--bluBg, #eff6ff); border: 1px solid var(--bluBr, #bfdbfe); border-radius: 10px; padding: 10px 14px; font-size: 13px;\"><b style=\"color: var(--blu700, #1d4ed8);\">Başlık metni.</b></div>",
  "bilgi|metinli": "<div role=\"status\" data-testid=\"t\" style=\"background: var(--bluBg, #eff6ff); border: 1px solid var(--bluBr, #bfdbfe); border-radius: 10px; padding: 10px 14px; font-size: 13px;\"><b style=\"color: var(--blu700, #1d4ed8);\">Başlık metni.</b><div style=\"margin-top: 2px; color: var(--n700, #334155);\">Açıklama satırı.</div></div>",
  "uyari|metinsiz": "<div role=\"status\" data-testid=\"t\" style=\"background: var(--ambBg, #fffbeb); border: 1px solid var(--ambBr, #fde68a); border-radius: 10px; padding: 10px 14px; font-size: 13px;\"><b style=\"color: var(--amb700, #b45309);\">Başlık metni.</b></div>",
  "uyari|metinli": "<div role=\"status\" data-testid=\"t\" style=\"background: var(--ambBg, #fffbeb); border: 1px solid var(--ambBr, #fde68a); border-radius: 10px; padding: 10px 14px; font-size: 13px;\"><b style=\"color: var(--amb700, #b45309);\">Başlık metni.</b><div style=\"margin-top: 2px; color: var(--n700, #334155);\">Açıklama satırı.</div></div>",
  "basari|metinsiz": "<div role=\"status\" data-testid=\"t\" style=\"background: var(--grnBg, #f0fdf4); border: 1px solid var(--grnBr, #bbf7d0); border-radius: 10px; padding: 10px 14px; font-size: 13px;\"><b style=\"color: var(--grn700, #15803d);\">Başlık metni.</b></div>",
  "basari|metinli": "<div role=\"status\" data-testid=\"t\" style=\"background: var(--grnBg, #f0fdf4); border: 1px solid var(--grnBr, #bbf7d0); border-radius: 10px; padding: 10px 14px; font-size: 13px;\"><b style=\"color: var(--grn700, #15803d);\">Başlık metni.</b><div style=\"margin-top: 2px; color: var(--n700, #334155);\">Açıklama satırı.</div></div>",
  "kirmizi|metinsiz": "<div role=\"status\" data-testid=\"t\" style=\"background: var(--bluBg, #eff6ff); border: 1px solid var(--bluBr, #bfdbfe); border-radius: 10px; padding: 10px 14px; font-size: 13px;\"><b style=\"color: var(--blu700, #1d4ed8);\">Başlık metni.</b></div>",
  "kirmizi|metinli": "<div role=\"status\" data-testid=\"t\" style=\"background: var(--bluBg, #eff6ff); border: 1px solid var(--bluBr, #bfdbfe); border-radius: 10px; padding: 10px 14px; font-size: 13px;\"><b style=\"color: var(--blu700, #1d4ed8);\">Başlık metni.</b><div style=\"margin-top: 2px; color: var(--n700, #334155);\">Açıklama satırı.</div></div>",
  "varsayilan|kimliksiz": "<div role=\"status\" style=\"background: var(--bluBg, #eff6ff); border: 1px solid var(--bluBr, #bfdbfe); border-radius: 10px; padding: 10px 14px; font-size: 13px;\"><b style=\"color: var(--blu700, #1d4ed8);\">B</b></div>"
};

const CUMLE = <>Firmaya göre gruplu görünüm: <b>12 firma</b> (15 makina kaydı). Birden fazla makinası olan firmaya tıklayınca tüm makinaları listelenir.</>;
const TON = { bilgi: "var(--blu800, #1e40af)", uyari: "var(--amb800, #92400e)", basari: "var(--grn800, #065f46)" };

describe("Uyarı şeridi: bugünkü biçim korunur", () => {
  it.each(Object.keys(ONCE_HTML).filter(k => k !== "varsayilan|kimliksiz"))("AC-2: %s çıktısı değişiklik öncesiyle birebir aynı", (anahtar) => {
    const [aile, tur] = anahtar.split("|");
    const { container } = render(<UyariSeridi aile={aile} baslik="Başlık metni." metin={tur === "metinli" ? "Açıklama satırı." : undefined} testId="t" />);
    expect(container.innerHTML).toBe(ONCE_HTML[anahtar]);
  });
  it("AC-2: varsayılan aile ve kimliksiz çağrı değişiklik öncesiyle birebir aynı", () => {
    const { container } = render(<UyariSeridi baslik="B" />);
    expect(container.innerHTML).toBe(ONCE_HTML["varsayilan|kimliksiz"]);
  });
  it("R2 / S3: boş children (null, undefined, false, boş metin) bugünkü biçimi bozmaz", () => {
    for (const bosIcerik of [null, undefined, false, ""]) {
      const { container } = render(<UyariSeridi aile="uyari" baslik="Başlık metni." metin="Açıklama satırı." testId="t">{bosIcerik}</UyariSeridi>);
      expect(container.innerHTML).toBe(ONCE_HTML["uyari|metinli"]);
      cleanup();
    }
  });
});

describe("Uyarı şeridi: serbest içerik", () => {
  it("AC-1: Serbest içerik verilen bir uyarı şeridi, verilen içeriği olduğu gibi çizer; cümlenin ortasındaki kalın parça kalın kalır", () => {
    render(<UyariSeridi aile="bilgi" testId="s">{CUMLE}</UyariSeridi>);
    const s = screen.getByTestId("s");
    expect(s.textContent).toBe("Firmaya göre gruplu görünüm: 12 firma (15 makina kaydı). Birden fazla makinası olan firmaya tıklayınca tüm makinaları listelenir.");
    const b = s.querySelector("b");
    expect(b.textContent).toBe("12 firma");
    expect(b.parentElement).toBe(s); // vurgu cümlenin içinde, ayrı satırda değil
    expect(b.getAttribute("style")).toBeNull(); // rengini kaptan miras alır
    expect(s.style.color).toBe(TON.bilgi);
  });
  it("AC-3: Serbest içerikli şerit de role=status taşır ve dışarıdan verilen test kancasını korur", () => {
    const { container, rerender } = render(<UyariSeridi aile="uyari" testId="kanca">x <b>y</b></UyariSeridi>);
    expect(screen.getByTestId("kanca").getAttribute("role")).toBe("status");
    rerender(<UyariSeridi aile="uyari">x <b>y</b></UyariSeridi>);
    expect(container.querySelectorAll("[data-testid]").length).toBe(0);
    expect(screen.getByRole("status")).toBeTruthy();
  });
  it.each(["bilgi", "uyari", "basari"])("AC-4: %s ailesinde serbest içerikli ve başlıklı şeridin zemin, kenarlık, köşe ve dolgusu aynı; metin rengi ailenin 800 tonu", (aile) => {
    render(<><UyariSeridi aile={aile} baslik="B" testId="a" /><UyariSeridi aile={aile} testId="b">Serbest <b>vurgu</b></UyariSeridi></>);
    const [a, b] = [screen.getByTestId("a"), screen.getByTestId("b")];
    for (const k of ["background", "border", "borderRadius", "padding", "fontSize"]) expect(b.style[k], k).toBe(a.style[k]);
    expect(b.style.color).toBe(TON[aile]);
    expect(a.style.color).toBe(""); // bugünkü biçimde kapta renk yok
  });
  it("AC-5: Serbest içerikli bir çağrıda tanımsız bir renk ailesi verildiğinde şerit hata vermez, bilgi ailesiyle çizilir", () => {
    render(<><UyariSeridi aile="kirmizi" testId="k">a <b>b</b></UyariSeridi><UyariSeridi aile={undefined} testId="u">c</UyariSeridi></>);
    for (const id of ["k", "u"]) {
      expect(screen.getByTestId(id).style.background).toBe("var(--bluBg, #eff6ff)");
      expect(screen.getByTestId(id).style.color).toBe(TON.bilgi);
    }
  });
  it("AC-6: Aynı çağrıda hem serbest içerik hem başlık ve açıklama verildiğinde serbest içerik çizilir, başlık ve açıklama yok sayılır", () => {
    render(<UyariSeridi aile="uyari" baslik="YOK SAYILAN BAŞLIK" metin="YOK SAYILAN AÇIKLAMA" testId="s">Serbest <b>cümle</b>.</UyariSeridi>);
    const s = screen.getByTestId("s");
    expect(s.textContent).toBe("Serbest cümle.");
    expect(s.textContent).not.toMatch(/YOK SAYILAN/);
    expect(s.querySelectorAll("div").length).toBe(0); // açıklama satırı yok
  });
  it("S3: sayı 0 çizilebilir değerdir ve serbest içerik olarak gösterilir", () => {
    render(<UyariSeridi baslik="B" testId="s">{0}</UyariSeridi>);
    expect(screen.getByTestId("s").textContent).toBe("0");
  });
});
