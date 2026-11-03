// @vitest-environment jsdom
// Spec 0126: Evrak satırında parça ve kalıp seçimi pencereyle (arama kutusu), set satırı tanınır.
import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { useState } from "react";
import { render, cleanup, screen, fireEvent, within } from "@testing-library/react";
import { Documents } from "../../src/components/Documents";
import { SENARYOLAR, KALIPLAR, PARCALAR, teklif } from "../fixtures/0126-senaryo.js";
import ALTIN from "../fixtures/0126-govde-once.json";
import { PARCA_YER_TUTUCU } from "../../src/components/stock/SetRozeti";
import { LISTEDE_OLMAYAN_PARCA } from "../../src/lib/urunAgaci";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

const alt = (id, type, o) => ({ id, type, kod: "", makinaAdi: "", tanim: "", miktar: "1", birimFiyat: "", tlKarsiligi: "", ...o });
const belge = (satirlar, o = {}) => ({ id: 900, type: "teklif", no: "2026-00001", tarih: "2026-09-20", createdAt: "2026-09-20", dil: "TR", currency: "TRY",
  durum: "taslak", firma: "Kutu Gıda", satirlar, ...o });
const parcaSatiri = (rowId, partId, o = {}) => ({ rowId, pickTip: "parca", selectedModel: "", selectedKalip: "", selectedPart: partId,
  subItems: [alt(`p-${rowId}`, "parca", o)] });
const kalipSatiri = (rowId, ad, o = {}) => ({ rowId, pickTip: "kalip", selectedModel: "", selectedKalip: ad, selectedPart: "",
  subItems: [alt(`k-${rowId}`, "kalip", o)], ...(o.rol ? { kalipRolu: o.rol } : {}) });

function H({ t0, onState, parts = PARCALAR, kalipDefs = KALIPLAR }) {
  const [teklifler, setTeklifler] = useState([t0]);
  onState?.(teklifler);
  return <Documents teklifler={teklifler} setTeklifler={setTeklifler} faturalar={[]} setFaturalar={vi.fn()} customers={[]} partSales={[]}
    allModels={[{ model: "AK100" }]} factory={{ name: "Altuntaş" }} appSettings={{}} showToast={vi.fn()} kalipDefs={kalipDefs} parts={parts}
    geoData={{}} loadingGeo={false} serverPermissions={null} dealers={[]} yedekParcaSatislar={[]} onEvrakKaydet={vi.fn()} />;
}
const ac = () => fireEvent.click(screen.getByText("2026-00001").closest("tr"));
const pencere = () => screen.queryByTestId("kalem-sec-penceresi");
const secenekler = () => [...document.querySelectorAll(".sp-option")].map(o => o.textContent);
const sec = (bas) => {
  const o = [...document.querySelectorAll(".sp-option")].find(x => x.textContent.startsWith(bas));
  fireEvent.mouseDown(o);
};
const kaydet = () => fireEvent.click(screen.getByText("Kaydet"));
const satirlar = () => [...document.querySelectorAll("tbody tr")].filter(tr => tr.querySelector('[data-testid^="secim-"]'));

describe("Spec 0126: seçim penceresi", () => {
  it("AC-1: parça satırında açılır liste yoktur; \"Seç\" düğmesi pencere açar", () => {
    render(<H t0={belge([parcaSatiri("r1", "")])} />);
    ac();
    const tr = satirlar()[0];
    // Hücrede yalnız tür seçicisi açılır listedir; parça seçimi düğmedir.
    expect([...tr.cells[0].querySelectorAll("select")].map(s => s.options[0].textContent)).toEqual(["— Tür Seç —"]);
    expect(screen.queryByText("— Yedek Parça Seç —")).toBeNull();
    const dugme = screen.getByLabelText("Parça seç");
    expect(dugme.textContent).toBe("Seç");
    expect(pencere()).toBeNull();
    fireEvent.click(dugme);
    expect(pencere()).not.toBeNull();
    expect(screen.getByText("Parça Kataloğundan Seç")).toBeTruthy();
  });

  it("AC-2: pencerede yazılan metin parça adına göre arar; tıklanan parça satıra girer ve pencere kapanır", () => {
    let st;
    render(<H t0={belge([parcaSatiri("r1", "")])} onState={s => { st = s; }} />);
    ac();
    fireEvent.click(screen.getByLabelText("Parça seç"));
    fireEvent.change(screen.getByPlaceholderText("Parça ara..."), { target: { value: "rul" } });
    expect(secenekler()).toEqual(["Rulman · R-7"]);
    sec("Rulman");
    expect(pencere()).toBeNull();
    expect(screen.getByTestId("secili-parca").textContent).toBe("Rulman");
    kaydet();
    expect(st[0].satirlar[0].selectedPart).toBe("7");
    expect(st[0].satirlar[0].subItems[0].makinaAdi).toBe("Rulman");
  });

  it("AC-3: aynı akış kalıp için çalışır, başlık katalogu söyler; makina satırının kalıp slotu da pencereyle (R3/5)", () => {
    let st;
    const makina = { rowId: "m", pickTip: "makina", selectedModel: "AK100", selectedKalip: "", selectedPart: "", subItems: [alt("m1", "makina"), alt("mk", "kalip")] };
    render(<H t0={belge([kalipSatiri("r1", ""), makina])} onState={s => { st = s; }} />);
    ac();
    const dugmeler = screen.getAllByLabelText("Kalıp seç");
    expect(dugmeler).toHaveLength(2);
    fireEvent.click(dugmeler[0]);
    expect(screen.getByText("Kalıp Kataloğundan Seç")).toBeTruthy();
    expect(screen.queryByText("Parça Kataloğundan Seç")).toBeNull();
    fireEvent.change(screen.getByPlaceholderText("Kalıp ara..."), { target: { value: "köf" } });
    expect(secenekler()).toEqual(["Köfte"]);
    sec("Köfte");
    expect(pencere()).toBeNull();
    fireEvent.click(screen.getAllByLabelText("Kalıp seç")[1]);
    sec("Hamburger");
    kaydet();
    expect(st[0].satirlar[0].selectedKalip).toBe("Köfte");
    expect(st[0].satirlar[1].selectedKalip).toBe("Hamburger");
    expect(st[0].satirlar[1].subItems.find(i => i.type === "kalip").kod).toBe("K-H");
  });

  it("AC-4: seçili ad satırın kendi verisinden (kataloğu terk etmiş kalıp ve parça dahil); kaldır alt kalemi siler", () => {
    let st;
    render(<H t0={belge([kalipSatiri("r1", "Eski Kalıp"), parcaSatiri("r2", "99", { makinaAdi: "Eski Rulman" })])} onState={s => { st = s; }} />);
    ac();
    expect(screen.getByTestId("secili-kalip").textContent).toBe("Eski Kalıp");
    expect(screen.getByTestId("secili-parca").textContent).toBe("Eski Rulman");
    fireEvent.click(screen.getByLabelText("Kalıp seçimini kaldır"));
    fireEvent.click(screen.getByLabelText("Parça seçimini kaldır"));
    kaydet();
    expect(st[0].satirlar[0]).toMatchObject({ selectedKalip: "", subItems: [] });
    expect(st[0].satirlar[1]).toMatchObject({ selectedPart: "", subItems: [] });
  });

  it("AC-4 (triyaj): katalogda da alt kalemde de adı olmayan parçada yer tutucu, metin tek kaynaktan", () => {
    render(<H t0={belge([parcaSatiri("r1", "99")])} />);
    ac();
    expect(screen.getByTestId("secili-parca").textContent).toBe(PARCA_YER_TUTUCU);
    expect(PARCA_YER_TUTUCU).toBe(`(${LISTEDE_OLMAYAN_PARCA})`);
  });

  it("AC-4 / Karar 25: katalogdaki parçanın adı belge dili EN olsa da Türkçe ad", () => {
    render(<H t0={belge([parcaSatiri("r1", "7", { makinaAdi: "Bearing" })], { dil: "EN" })} />);
    ac();
    expect(screen.getByTestId("secili-parca").textContent).toBe("Rulman");
  });

  it("AC-20: kaldır düğmesi yalnız seçili kalem varken çizilir, adı türünü söyler", () => {
    render(<H t0={belge([kalipSatiri("r1", ""), parcaSatiri("r2", "")])} />);
    ac();
    expect(screen.queryByLabelText("Kalıp seçimini kaldır")).toBeNull();
    expect(screen.queryByLabelText("Parça seçimini kaldır")).toBeNull();
    expect(screen.queryByTestId("secili-kalip")).toBeNull();
    fireEvent.click(screen.getByLabelText("Parça seç"));
    sec("Rulman");
    expect(screen.getByLabelText("Parça seçimini kaldır")).toBeTruthy();
    expect(screen.queryByLabelText("Kalıp seçimini kaldır")).toBeNull();
  });
});

describe("Spec 0126: set tanınır", () => {
  it("AC-5 / AC-21: listede set rozet metniyle ve bileşen sayısıyla (etikette); görsel rozet yok; kodla da aranır", () => {
    render(<H t0={belge([parcaSatiri("r1", "")])} />);
    ac();
    fireEvent.click(screen.getByLabelText("Parça seç"));
    expect(secenekler()).toEqual(["Rulman · R-7", "Bıçak Seti · BS-1 · SET · 2 bileşen", "Bıçak · B-9"]);
    expect(within(pencere()).queryByTestId("set-rozeti")).toBeNull();
    fireEvent.change(screen.getByPlaceholderText("Parça ara..."), { target: { value: "bs-1" } });
    expect(secenekler()).toEqual(["Bıçak Seti · BS-1 · SET · 2 bileşen"]);
  });

  it("AC-6: set seçilince içerik satırı parça hücresinde; yeni <tr> yok, rowSpan aynı", () => {
    render(<H t0={belge([parcaSatiri("r1", ""), parcaSatiri("r2", "7")])} />);
    ac();
    const trOnce = document.querySelectorAll("tbody tr").length;
    expect(screen.queryAllByTestId("set-icerik-satiri")).toHaveLength(0);
    fireEvent.click(screen.getAllByLabelText("Parça seç")[0]);
    sec("Bıçak Seti");
    const icerik = screen.getAllByTestId("set-icerik-satiri");
    expect(icerik).toHaveLength(1);
    expect(icerik[0].textContent).toBe("Set · 2 bileşen: 2 × Rulman, 1 × Bıçak");
    const tr = satirlar()[0];
    expect(tr.cells[0].contains(icerik[0])).toBe(true);
    expect(document.querySelectorAll("tbody tr").length).toBe(trOnce);
    expect([...tr.cells].find(td => td.rowSpan > 1)).toBeUndefined();
  });

  it("AC-6: bulunamayan bileşen ibareyle; setin kendisi katalogda yoksa içerik satırı yok, ad alt kalemden", () => {
    const setEksik = { id: 8, ad: "Bıçak Seti", kod: "BS-1", setIcerigi: [{ partId: 7, miktar: 2 }, { partId: 404, miktar: 1 }] };
    const { unmount } = render(<H t0={belge([parcaSatiri("r1", "8", { makinaAdi: "Bıçak Seti" })])} parts={[PARCALAR[0], setEksik]} />);
    ac();
    expect(screen.getAllByTestId("set-icerik-satiri")[0].textContent).toBe("Set · 2 bileşen: 2 × Rulman, 1 × listede olmayan parça");
    unmount();
    render(<H t0={belge([parcaSatiri("r1", "8", { makinaAdi: "Bıçak Seti" })])} parts={[PARCALAR[0]]} />);
    ac();
    expect(screen.queryAllByTestId("set-icerik-satiri")).toHaveLength(0);
    expect(screen.getByTestId("secili-parca").textContent).toBe("Bıçak Seti");
  });
});

describe("Spec 0126: kaydedilen gövde (C1)", () => {
  it("AC-7 / AC-13: pencereyle kaydedilen satırlar spec öncesi kodun <select> yoluyla birebir aynı", () => {
    const cikti = {};
    for (const sn of SENARYOLAR) {
      let st;
      render(<H t0={teklif(sn)} onState={s => { st = s; }} />);
      ac();
      if (sn.deger === "") fireEvent.click(screen.getByLabelText(sn.tur === "kalip" ? "Kalıp seçimini kaldır" : "Parça seçimini kaldır"));
      else if (sn.deger !== undefined) {
        fireEvent.click(screen.getByLabelText(sn.tur === "kalip" ? "Kalıp seç" : "Parça seç"));
        const k = sn.tur === "kalip" ? KALIPLAR.find(x => x.ad === sn.deger) : PARCALAR.find(x => String(x.id) === sn.deger);
        sec(k.ad);
      }
      kaydet();
      cikti[sn.ad] = st[0].satirlar;
      cleanup();
    }
    expect(cikti).toEqual(ALTIN);
  });
});

describe("Spec 0126: pencere davranışı", () => {
  it("AC-12: arama paneli pencerede kırpılmaz (panelin hiçbir atası taşmayı kesmiyor)", () => {
    render(<H t0={belge([parcaSatiri("r1", "")])} />);
    ac();
    fireEvent.click(screen.getByLabelText("Parça seç"));
    const panel = document.querySelector(".sp-option").parentElement;
    const kesenler = [];
    for (let el = panel.parentElement; el && el !== document.body; el = el.parentElement) {
      const s = el.style;
      if (["auto", "hidden", "scroll"].some(v => [s.overflow, s.overflowY, s.overflowX].includes(v))) kesenler.push(el.outerHTML.slice(0, 80));
    }
    expect(kesenler).toEqual([]);
  });

  it("AC-14: id'si olmayan iki kalıp tanımı anahtar çakıştırmaz", () => {
    const hata = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<H t0={belge([kalipSatiri("r1", "")])} kalipDefs={[{ ad: "Burger" }, { ad: "Kroket" }]} />);
    ac();
    fireEvent.click(screen.getByLabelText("Kalıp seç"));
    expect(secenekler()).toEqual(["Burger", "Kroket"]);
    // Anahtar yoksa ("Each child … unique key") ya da çakışırsa ("same key") React uyarır; ikisi de olmamalı.
    expect(hata.mock.calls.filter(c => /unique "key"|same key/.test(String(c[0])))).toEqual([]);
    hata.mockRestore();
  });

  it("AC-15: kalıp rolü seçicisi yerinde ve kaydediliyor; hücre sırası tür, Seç ve ad, kalıp rolü", () => {
    let st;
    render(<H t0={belge([kalipSatiri("r1", "Hamburger")])} onState={s => { st = s; }} />);
    ac();
    const td = satirlar()[0].cells[0];
    const tur = td.querySelector("select");
    const ad = within(td).getByTestId("secili-kalip");
    const dugme = within(td).getByLabelText("Kalıp seç");
    const rol = within(td).getByLabelText("Kalıp rolü");
    const once = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(once(tur, ad) && once(ad, dugme) && once(dugme, rol)).toBe(true);
    fireEvent.change(rol, { target: { value: "makinayla" } });
    kaydet();
    expect(st[0].satirlar[0].kalipRolu).toBe("makinayla");
  });

  it("AC-18: Escape yalnız seçim penceresini kapatır; belge formu açık kalır, ikinci Escape formu kapatır", () => {
    render(<H t0={belge([parcaSatiri("r1", "")])} />);
    ac();
    fireEvent.click(screen.getByLabelText("Parça seç"));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(pencere()).toBeNull();
    expect(screen.getByText("Kaydet")).toBeTruthy();
    expect(screen.getByLabelText("Parça seç")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("Kaydet")).toBeNull();
  });

  it("R3/6 (triyaj): seçim penceresi açıkken form başka yoldan kapanırsa seçim düşer; belge yeniden açılınca pencere açılmaz", () => {
    render(<H t0={belge([parcaSatiri("r1", "")])} />);
    ac();
    fireEvent.click(screen.getByLabelText("Parça seç"));
    expect(pencere()).not.toBeNull();
    fireEvent.click(screen.getByText("Vazgeç"));
    expect(screen.queryByText("Kaydet")).toBeNull();
    expect(pencere()).toBeNull();
    ac();
    expect(screen.getByText("Kaydet")).toBeTruthy();
    expect(pencere()).toBeNull();
  });

  it("AC-19: pencere açılınca arama kutusu odaktadır ve liste görünür", () => {
    render(<H t0={belge([parcaSatiri("r1", "")])} />);
    ac();
    fireEvent.click(screen.getByLabelText("Parça seç"));
    expect(document.activeElement).toBe(screen.getByPlaceholderText("Parça ara..."));
    expect(secenekler()).toHaveLength(3);
  });
});
