// @vitest-environment jsdom
// Spec 0102: Makina Stoğu sayfalanmaz (R1–R9/2) ve Parti Üretim Panosu'nun beşinci sayısı "Planlanandan kalan" (R10–R15).
// Gerçek Stock bileşeni, App gibi bağlanır; hız ölçümü MakinaStokTab'ı doğrudan çizer (R9/2). Kaynak taramaları
// tests/sayfalama-stok-0102.test.js'te.
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Stock } from "../../src/components/Stock";
import { MakinaStokTab } from "../../src/components/stock/MakinaStokTab";
import { FAZLA_IBARESI, PANO_BOS_PARTI, PANO_BOS_VERI } from "../../src/lib/stokDurumu";

afterEach(cleanup);

const MODELLER = [{ model: "AK100" }, { model: "AK120_DSC" }];
const ACIK = { id: 902, ad: "2026-2", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK100: 6, AK120_DSC: 3 } };
const stk = (id, o = {}) => ({ id, model: "AK100", serialNo: `U-${id}`, addedDate: "2026-09-01", note: "", parcalar: [], ...o });
// Sayfa boyutu (10) üstünde on dört satır (Karar 20): dört AK120_DSC, beşi montajda.
const ON_DORT = Array.from({ length: 14 }, (_, i) => stk(101 + i, { model: i % 3 ? "AK100" : "AK120_DSC", ...(i % 3 === 1 ? { uretimDurumu: "montaj" } : {}) }));

function Ekran({ s0 = ON_DORT, partiler = [ACIK], alt = "makina", musteriler = [] }) {
  const [stock, setStock] = useState(structuredClone(s0));
  return <Stock stock={stock.filter(x => !x.deletedAt)} setStock={setStock} customers={musteriler} setCustomers={() => {}} parts={[]} dealers={[]}
    yedekParcaSatislar={[]} models={MODELLER} showToast={() => {}} uretimPartileri={partiler} giderYetki defaultSubTab={alt}
    setPartStock={() => {}} setPartStockLog={() => {}} />;
}
const govde = () => [...document.querySelectorAll("tbody tr")];
const seriler = () => govde().map(tr => tr.querySelectorAll("td")[3]?.textContent);
const sayfaOgesiYok = () => {
  expect(document.querySelector(".page-btn, .page-num")).toBeNull();
  for (const m of ["‹ Önceki", "Sonraki ›", "…"]) expect(document.body.textContent).not.toContain(m);
};
const suzgec = (ad) => within(screen.getByRole("group", { name: "Üretim durumu süzgeci" })).getByRole("button", { name: new RegExp(`^${ad} \\(\\d+\\)$`) });
const ara = () => screen.getByPlaceholderText("Model veya seri no ara...");

describe("Spec 0102: Makina Stoğu sayfalanmaz (R1–R7)", () => {
  it("AC-1 / AC-2: sayfa boyutunun üstündeki stokta bütün satırlar çizilir, sayfa öğeleri yok", () => {
    render(<Ekran />);
    expect(govde()).toHaveLength(14);
    expect(seriler()).toEqual(ON_DORT.map(s => s.serialNo));
    sayfaOgesiYok();
  });
  it("AC-3: arama yalnız eşleşen satırları bırakır, sayfa düğmesi yine yok", () => {
    render(<Ekran />);
    fireEvent.change(ara(), { target: { value: "U-11" } });
    expect(seriler()).toEqual(["U-110", "U-111", "U-112", "U-113", "U-114"]);
    sayfaOgesiYok();
  });
  it("AC-4 / AC-38: model süzgeci yalnız o modeli bırakır; seçili karta ikinci tıklama süzgeci kaldırır", () => {
    render(<Ekran />);
    fireEvent.click(screen.getByText("AK120_DSC", { selector: "div" }));
    expect(seriler()).toEqual(ON_DORT.filter(s => s.model === "AK120_DSC").map(s => s.serialNo));
    fireEvent.click(screen.getByText("AK120_DSC", { selector: "div" }));
    expect(govde()).toHaveLength(14);
  });
  it("AC-5 / AC-38: Montajda süzgeci montajdakilerin tamamını çizer ve süzgeç değerini yazar; sayfa boyutunun üstünde de", () => {
    const COK = Array.from({ length: 12 }, (_, i) => stk(201 + i, { uretimDurumu: "montaj" })).concat([stk(300)]);
    render(<Ekran s0={COK} />);
    fireEvent.click(suzgec("Montajda"));
    expect(suzgec("Montajda").getAttribute("aria-pressed")).toBe("true");
    expect(govde()).toHaveLength(12);
    sayfaOgesiYok();
    fireEvent.click(suzgec("Tümü"));
    expect(govde()).toHaveLength(13);
  });
  it("AC-8 / AC-9: iki boş durum değişmez, tablo çizilmez", () => {
    render(<Ekran s0={[]} />);
    expect(screen.getByTestId("bos-makina-stok").textContent).toContain("Stokta makina yok.");
    expect(document.querySelector("table")).toBeNull();
    cleanup();
    render(<Ekran />);
    fireEvent.change(ara(), { target: { value: "yok-boyle-seri" } });
    expect(screen.getByTestId("bos-makina-stok").textContent).toContain("Aramanıza uyan makina yok.");
    expect(document.querySelector("table")).toBeNull();
  });
  it("AC-10: sütunlar ve sırası aynı", () => {
    render(<Ekran />);
    expect([...document.querySelectorAll("thead th")].map(th => th.textContent)).toEqual(["Model", "Durum", "Kalıp Çapı", "Seri Numarası", "Stoğa Giriş", "Not", ""]);
  });
  it("AC-11: düzenleme ve silme düğmeleri eski ikinci sayfadaki satırlarda da; izin yoksa hiçbir satırda", () => {
    render(<Ekran />);
    for (const tr of [govde()[10], govde()[13]]) expect(within(tr).getAllByRole("button")).toHaveLength(2);
    cleanup();
    // İzin Stock içinde kurulur (serverPermissions); izinsiz dal MakinaStokTab'ın kendi prop'uyla ölçülür.
    render(<MakinaStokTab stock={ON_DORT} setStock={() => {}} models={MODELLER} showToast={() => {}} uretimPartileri={[]} canDoStock={() => false} />);
    expect(govde().every(tr => within(tr).queryAllByRole("button").length === 0)).toBe(true);
  });
});

// Ölçülen (2026-10-22, M serisi Mac): 300 satır çizim ~146 ms + arama sonrası yeniden çizim ~39 ms; eşik spec'teki gibi 10 sn (Karar 32).
const ESIK_MS = 10000;
describe("Spec 0102 AC-19 / AC-20 (jsdom vekil ölçüm, R9/2)", () => {
  it("AC-19 / AC-20: üç yüz satır tek seferde çizilir; çizim + arama sonrası yeniden çizim eşiğin altında", () => {
    const UCYUZ = Array.from({ length: 300 }, (_, i) => stk(1000 + i, { serialNo: `H-${i}`, model: i % 2 ? "AK100" : "AK120_DSC", ...(i % 5 === 0 ? { uretimDurumu: "montaj" } : {}) }));
    const t0 = performance.now();
    render(<MakinaStokTab stock={UCYUZ} setStock={() => {}} models={MODELLER} showToast={() => {}} uretimPartileri={[]} />);
    const t1 = performance.now();
    expect(govde()).toHaveLength(300);
    // Arama kutusu ölçümden ÖNCE bulunur (spec 0080'in dersi: sorgu ölçümün içinde kalırsa ölçülen şey test kütüphanesidir).
    const kutu = document.querySelector('input[placeholder="Model veya seri no ara..."]');
    const t2a = performance.now();
    fireEvent.change(kutu, { target: { value: "H-2" } });
    const t2 = performance.now();
    expect(govde().length).toBe(UCYUZ.filter(s => s.serialNo.includes("H-2")).length);
    console.log(`Spec 0102 AC-19/AC-20 (jsdom): 300 satır çizim ${Math.round(t1 - t0)} ms, arama ${Math.round(t2 - t2a)} ms`);
    expect((t1 - t0) + (t2 - t2a)).toBeLessThan(ESIK_MS);
  }, 60000);
});

describe("Spec 0102: Parti Üretim Panosu'nun beşinci sayısı (R10–R15)", () => {
  const pano = () => screen.getByTestId("parti-uretim-panosu");
  const PANO_STOK = [stk(1, { partiId: 902, uretimDurumu: "montaj" }), stk(2, { partiId: 902 }), stk(3, { model: "AK120_DSC", partiId: 902 })];
  const MUS = [{ id: 50, name: "Satılan", model: "AK100", partiId: 902 }];
  it("AC-21 / AC-22 / AC-30: kart ve tablo başlığı 'Planlanandan kalan', sayı aynı; ölçüm kimlikleri yerinde", () => {
    render(<Ekran alt="pano" s0={PANO_STOK} musteriler={MUS} />);
    expect(within(pano()).getByTestId("pano-sayi-kalan").textContent).toBe("Planlanandan kalan5");
    const basliklar = [...pano().querySelectorAll("thead th")].map(th => th.textContent);
    expect(basliklar.slice(1)).toEqual(["Planlanan", "Montajda", "Satışa hazır", "Satıldı", "Planlanandan kalan"]);
    expect(within(pano()).getAllByTestId("pano-satir").length).toBeGreaterThan(0);
    expect(within(pano()).getByTestId("pano-toplam")).toBeTruthy();
  });
  it("AC-23: ipucu cümlesi birebir, eksi işareti '−'", () => {
    render(<Ekran alt="pano" s0={PANO_STOK} musteriler={MUS} />);
    expect(pano().textContent).toContain("Planlanandan kalan = planlanan − (montajda + satışa hazır + satıldı). Satılan makina partiye bağlı müşteri kayıtlarından sayılır.");
  });
  it("AC-24 (Karar 26): panoda 'Kalan' tek başına bir başlık ya da etiket olarak geçmez", () => {
    render(<Ekran alt="pano" s0={PANO_STOK} musteriler={MUS} />);
    // Triyaj (bulgu 1): panonun metni bitişik geldiği için (…Satıldı1Kalan5…) kelime sınırı oluşmaz; ölçüt tek tek öğelerdir.
    const yapraklar = [...pano().querySelectorAll("*")].filter(e => e.children.length === 0).map(e => e.textContent.trim());
    expect(yapraklar.filter(t => /^Kalan\d*$/.test(t))).toEqual([]);
    const etiketler = [...pano().querySelectorAll("thead th"), ...pano().querySelectorAll('[data-testid^="pano-sayi-"]')].map(e => e.textContent.trim());
    expect(etiketler.filter(t => /^Kalan\d*$/.test(t))).toEqual([]);
    expect(yapraklar).toContain("Planlanandan kalan");
  });
  it("AC-26: öteki dört ad aynı", () => {
    render(<Ekran alt="pano" s0={PANO_STOK} musteriler={MUS} />);
    const sayi = (k) => within(pano()).getByTestId(`pano-sayi-${k}`).textContent;
    expect(["planlanan", "montajda", "hazir", "satildi"].map(sayi)).toEqual(["Planlanan9", "Montajda1", "Satışa hazır2", "Satıldı1"]);
  });
  it("AC-27: plandan fazla üretilen model satırında sayı 0 ve ibare", () => {
    const fazla = Array.from({ length: 8 }, (_, i) => stk(400 + i, { partiId: 902 }));
    render(<Ekran alt="pano" s0={fazla} />);
    const ak100 = within(pano()).getAllByTestId("pano-satir").find(tr => tr.querySelector("td").textContent === "AK100");
    expect(ak100.querySelectorAll("td")[5].textContent).toBe(`0${FAZLA_IBARESI}`);
    expect(within(ak100).getByTestId("pano-fazla")).toBeTruthy();
  });
  it("AC-31: panonun iki boş durumu değişmez", () => {
    render(<Ekran alt="pano" partiler={[]} />);
    expect(document.body.textContent).toContain(PANO_BOS_PARTI);
    cleanup();
    render(<Ekran alt="pano" s0={[]} partiler={[{ id: 905, ad: "Boş", baslangicAy: "2026-09", bitisAy: null }]} />);
    expect(document.body.textContent).toContain(PANO_BOS_VERI);
  });
});
