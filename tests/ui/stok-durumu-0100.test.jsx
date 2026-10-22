// @vitest-environment jsdom
// Spec 0100: Makina Stoğu (durum sütunu, rozetler, özet satırı, durum süzgeci, form) ve Parti Üretim Panosu. Gerçek Stock bileşeni,
// App gibi bağlanır: ekrana çöpü süzülmüş stok, setter'a tam dizi. Motor kriterleri tests/stok-durumu-0100.test.js'te.
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Stock } from "../../src/components/Stock";
import { ONCEKI_PARTI_ADI, PANO_BOS_PARTI, PANO_BOS_VERI, FAZLA_IBARESI, PANO_SEKME_ADI } from "../../src/lib/stokDurumu";

afterEach(cleanup);

const KAPALI = { id: 901, ad: "2026-1", baslangicAy: "2026-06", bitisAy: "2026-08" };
const ACIK = { id: 902, ad: "2026-2", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK100: 6, AK120_DSC: 3 } };
const COPTE = { id: 903, ad: "Çöpte", baslangicAy: "2026-01", bitisAy: "2026-02", deletedAt: "2026-10-01T10:00:00.000Z" };
const MODELLER = [{ model: "AK100" }, { model: "AK120_DSC" }];
const stk = (id, o = {}) => ({ id, model: "AK100", serialNo: `S-${id}`, addedDate: "2026-09-01", note: "", parcalar: [], ...o });
const STOK = [
  stk(1, { uretimDurumu: "montaj", partiId: 902 }), stk(2, { uretimDurumu: "hazir", partiId: 902 }), stk(3, { model: "AK120_DSC", partiId: 902 }),
  stk(4, { partiId: 901 }), stk(5, { model: "AK120_DSC", partiId: 901, uretimDurumu: "montaj" }), stk(6, { partiId: 903 }),
];
const MUS = [{ id: 50, name: "Satılan A", model: "AK100", partiId: 902 }, { id: 51, name: "Satılan B", model: "AK100", partiId: 902, oncekiSahipler: [{ name: "Eski" }] }];

let durum;
function Ekran({ s0 = STOK, partiler = [KAPALI, ACIK, COPTE], giderYetki = true, alt = "makina", musteriler = MUS }) {
  const [stock, setStock] = useState(structuredClone(s0));
  durum = { stock };
  const canli = (a) => a.filter(x => !x.deletedAt);
  return <Stock stock={canli(stock)} setStock={setStock} customers={musteriler} setCustomers={() => {}} parts={[]} dealers={[]} yedekParcaSatislar={[]}
    models={MODELLER} showToast={() => {}} uretimPartileri={canli(partiler)} giderYetki={giderYetki} defaultSubTab={alt} setPartStock={() => {}} setPartStockLog={() => {}} />;
}
const satir = (seri) => screen.getByText(seri).closest("tr");
const duzenle = (seri) => fireEvent.click(within(satir(seri)).getAllByRole("button")[0]);
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
const kayit = (id) => durum.stock.find(s => s.id === id);
const durumSeci = (ad) => fireEvent.click(within(screen.getByRole("group", { name: "Üretim durumu" })).getByRole("button", { name: ad }));
const suzgec = (ad) => within(screen.getByRole("group", { name: "Üretim durumu süzgeci" })).getByRole("button", { name: new RegExp(`^${ad} \\(\\d+\\)$`) });
// spec 0101 ile: "Kalıp Çapı" sütunu Durum'un sağına girdiği için Seri Numarası dördüncü hücre (indeks 3).
const listeSerileri = () => [...document.querySelectorAll("tbody tr")].map(tr => tr.querySelectorAll("td")[3]?.textContent);
const rozet = (seri) => within(satir(seri)).getByTestId("stok-durum-rozeti").textContent;
const oncekiVar = (seri) => !!within(satir(seri)).queryByTestId("stok-onceki-rozeti");

describe("Spec 0100: durum alanı ve form (R1–R4/2)", () => {
  it("AC-1 (R2): stoğa yeni eklenen makina Montajda doğar ve gövdesinde 'montaj' bulunur", () => {
    render(<Ekran s0={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Stoğa Makina Ekle/ }));
    expect(within(screen.getByRole("group", { name: "Üretim durumu" })).getByRole("button", { name: "Montajda" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.change(screen.getByDisplayValue("Model seçin..."), { target: { value: "AK100" } });
    kaydet();
    expect(durum.stock).toHaveLength(1);
    expect(durum.stock[0].uretimDurumu).toBe("montaj");
  });
  it("AC-2 / AC-43: durumsuz kayıt Satışa hazır görünür, dokunulmadan kaydedilince gövdesine durum yazılmaz", () => {
    render(<Ekran />);
    expect(rozet("S-3")).toBe("Satışa hazır");
    expect(rozet("S-2")).toBe("Satışa hazır");
    duzenle("S-3");
    expect(within(screen.getByRole("group", { name: "Üretim durumu" })).getByRole("button", { name: "Satışa hazır" }).getAttribute("aria-pressed")).toBe("true");
    kaydet();
    expect("uretimDurumu" in kayit(3)).toBe(false);
    expect(kayit(2).uretimDurumu).toBe("hazir");
  });
  it("AC-3 / AC-43: Satışa hazır seçilip kaydedilen makina yeşil rozetle görünür ve gövdesine 'hazir' yazılır", () => {
    render(<Ekran />);
    expect(rozet("S-1")).toBe("Montajda");
    duzenle("S-1");
    durumSeci("Satışa hazır");
    kaydet();
    expect(kayit(1).uretimDurumu).toBe("hazir");
    const r = within(satir("S-1")).getByTestId("stok-durum-rozeti");
    expect(r.textContent).toBe("Satışa hazır");
    expect(r.getAttribute("style")).toContain("var(--grn700, #15803d)");
  });
  it("AC-44 (R4/2): durumsuz kaydın notu ve seri no'su değişip kaydedilince gövdeye durum yazılmaz", () => {
    render(<Ekran />);
    duzenle("S-3");
    fireEvent.change(screen.getByPlaceholderText("İsteğe bağlı not..."), { target: { value: "Yeni not" } });
    fireEvent.change(screen.getByPlaceholderText("Boş bırakılabilir — sonra atanır"), { target: { value: "S-33" } });
    kaydet();
    expect(kayit(3)).toMatchObject({ note: "Yeni not", serialNo: "S-33" });
    expect("uretimDurumu" in kayit(3)).toBe(false);
  });
});

describe("Spec 0100: liste, rozetler ve özet (R13–R17/2)", () => {
  // spec 0101 ile (R9/2, AC-41): "Durum Model'in hemen sağında" korunur; tablo altı yerine yedi sütun ("Kalıp Çapı" Durum'un sağında).
  it("AC-4: Durum sütunu Model'in hemen sağında, tablo yedi sütun (spec 0101 ile)", () => {
    render(<Ekran />);
    const basliklar = [...document.querySelectorAll("thead th")].map(th => th.textContent);
    expect(basliklar.indexOf("Durum")).toBe(basliklar.indexOf("Model") + 1);
    expect(basliklar).toEqual(["Model", "Durum", "Kalıp Çapı", "Seri Numarası", "Stoğa Giriş", "Not", ""]);
  });
  it("AC-5 / AC-49: rozet adını yazar ve rengi tema değişkeninden gelir", () => {
    render(<Ekran />);
    const r = within(satir("S-1")).getByTestId("stok-durum-rozeti");
    expect(r.textContent).toBe("Montajda");
    expect(r.getAttribute("style")).toContain("var(--pur700, #6d28d9)");
    expect(within(satir("S-4")).getByTestId("stok-onceki-rozeti").getAttribute("style")).toContain("var(--blu700, #1d4ed8)");
  });
  it("AC-11 / AC-12 / AC-13 / AC-14 / AC-17: kapanmış partide rozet; açık, partisiz ve çöpteki partide yok; montajda iki işaret", () => {
    render(<Ekran s0={[...STOK, stk(7)]} />);
    expect(oncekiVar("S-4")).toBe(true);
    expect(within(satir("S-4")).getByTestId("stok-onceki-rozeti").textContent).toBe(ONCEKI_PARTI_ADI);
    expect(oncekiVar("S-1")).toBe(false);
    expect(oncekiVar("S-7")).toBe(false);
    expect(oncekiVar("S-6")).toBe(false);
    expect(rozet("S-5")).toBe("Montajda");
    expect(oncekiVar("S-5")).toBe(true);
  });
  it("AC-16 (R11): rozet parti adını yazmaz; gider yetkisi olmayan kullanıcıda da görünür, parti adı satırı çizilmez", () => {
    render(<Ekran giderYetki={false} />);
    expect(oncekiVar("S-4")).toBe(true);
    expect(satir("S-4").textContent).not.toContain("2026-1");
    expect(document.body.textContent).not.toMatch(/Parti: /);
  });
  it("AC-10 (R16/2): özet satırı süzgeçsiz bütün stoğu sayar; model süzgeci açılınca değişmez", () => {
    render(<Ekran />);
    const ozet = () => screen.getByTestId("stok-ozet").textContent;
    expect(ozet()).toBe("Toplam 6Montajda 2Satışa hazır 4Önceki partiden kaldı 2");
    fireEvent.click(screen.getByText("AK120_DSC", { selector: "div" }));
    expect(listeSerileri()).toEqual(["S-3", "S-5"]);
    expect(ozet()).toBe("Toplam 6Montajda 2Satışa hazır 4Önceki partiden kaldı 2");
  });
  it("AC-6 / AC-7 / AC-48: Montajda süzgeci yalnız montajdakileri bırakır; model süzgeciyle birlikte uygulanır; erişilebilir ad 'Etiket (n)'", () => {
    render(<Ekran />);
    fireEvent.click(suzgec("Montajda"));
    expect(listeSerileri()).toEqual(["S-1", "S-5"]);
    expect(suzgec("Montajda").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByText("AK100", { selector: "div" }));
    expect(listeSerileri()).toEqual(["S-1"]);
    expect(screen.getByRole("button", { name: "Tümü (4)" })).toBeTruthy();
  });
  it("AC-8 (R15/3): rozet sayıları arama ve model süzgecinden sonraki kümeyi sayar ve sayfalanmamış listenin tamamını", () => {
    const COK = Array.from({ length: 12 }, (_, i) => stk(100 + i, { uretimDurumu: i % 3 ? "hazir" : "montaj" }));
    render(<Ekran s0={[...COK, stk(200, { model: "AK120_DSC", uretimDurumu: "montaj" })]} />);
    expect(screen.getByRole("button", { name: "Tümü (13)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Montajda (5)" })).toBeTruthy();
    fireEvent.click(screen.getByText("AK100", { selector: "div" }));
    expect(screen.getByRole("button", { name: "Tümü (12)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Montajda (4)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Satışa hazır (8)" })).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Model veya seri no ara..."), { target: { value: "S-10" } });
    // "S-10" → S-100 … S-109 (on satır)
    expect(screen.getByRole("button", { name: "Tümü (10)" })).toBeTruthy();
  });
  // spec 0102 ile (Karar 11, AC-39): 0100'ün R15/4 ve AC-46'sı ("süzgeç değişince birinci sayfaya döner") düştü, liste
  // artık sayfalanmıyor. Yerine: süzgeç değişince eşleşen bütün satırlar görünür, sayfa düğmesi yok.
  it("AC-39 / 0100 AC-46 (spec 0102 ile): durum süzgeci değişince eşleşen bütün satırlar görünür, sayfa düğmesi yok", () => {
    const COK = Array.from({ length: 25 }, (_, i) => stk(300 + i, { addedDate: `2026-09-${String(i + 1).padStart(2, "0")}`, uretimDurumu: i < 13 ? "montaj" : "hazir" }));
    render(<Ekran s0={COK} />);
    expect(listeSerileri()).toHaveLength(25);
    fireEvent.click(suzgec("Montajda"));
    expect(listeSerileri()).toEqual(COK.slice(0, 13).map(s => s.serialNo));
    expect(document.querySelector(".page-btn, .page-num")).toBeNull();
  });
  it("AC-9 / AC-47 (R17/2): süzgeçten boş dönen liste 'Aramanıza uyan makina yok.'; boş stok 'Stokta makina yok.'", () => {
    render(<Ekran s0={[stk(1, { uretimDurumu: "hazir" })]} partiler={[]} />);
    fireEvent.click(suzgec("Montajda"));
    expect(screen.getByTestId("bos-makina-stok").textContent).toContain("Aramanıza uyan makina yok.");
    cleanup();
    render(<Ekran s0={[]} />);
    expect(screen.getByTestId("bos-makina-stok").textContent).toContain("Stokta makina yok.");
    expect(screen.queryByTestId("stok-ozet")).toBeNull();
    expect(screen.queryByRole("group", { name: "Üretim durumu süzgeci" })).toBeNull();
  });
  it("AC-15: parti yeniden açılınca rozet kayıt değişmeden kalkar", () => {
    render(<Ekran />);
    expect(oncekiVar("S-4")).toBe(true);
    cleanup();
    render(<Ekran partiler={[{ ...KAPALI, bitisAy: null }, ACIK]} />);
    expect(oncekiVar("S-4")).toBe(false);
    expect(kayit(4)).toEqual(STOK[3]);
  });
});

describe("Spec 0100: Parti Üretim Panosu (R18–R24)", () => {
  const pano = () => screen.getByTestId("parti-uretim-panosu");
  it("AC-26 (R22): gider yetkisi olmayan kullanıcı alt sekmeyi görmez; yetkili görür", () => {
    render(<Ekran giderYetki={false} />);
    expect(screen.queryByRole("tab", { name: PANO_SEKME_ADI })).toBeNull();
    cleanup();
    render(<Ekran />);
    expect(screen.getByRole("tab", { name: PANO_SEKME_ADI })).toBeTruthy();
    const sekmeler = screen.getAllByRole("tab").map(t => t.textContent);
    expect(sekmeler.indexOf(PANO_SEKME_ADI)).toBe(sekmeler.indexOf("Makina Stoğu") + 1);
  });
  it("AC-21 / AC-22 / AC-56: açılışta en son başlayan açık parti; beş sayı; devredilmiş makina bir kez", () => {
    render(<Ekran alt="pano" />);
    expect(screen.getByLabelText("Üretim partisi").value).toBe("902");
    const sayi = (k) => within(pano()).getByTestId(`pano-sayi-${k}`).textContent;
    // spec 0102 ile (R10, AC-21): beşinci sayının adı "Planlanandan kalan"; sayı ve öteki dört metin aynı.
    expect(["planlanan", "montajda", "hazir", "satildi", "kalan"].map(sayi)).toEqual(["Planlanan9", "Montajda1", "Satışa hazır2", "Satıldı2", "Planlanandan kalan4"]);
  });
  it("AC-57 / AC-24: model satırları planlanana göre azalan; planı olmayan model üretilenlerden çizilir", () => {
    render(<Ekran alt="pano" s0={[...STOK, stk(8, { model: "AK300", partiId: 902 }), stk(9, { model: "", partiId: 902 })]} />);
    const satirlar = within(pano()).getAllByTestId("pano-satir").map(tr => tr.querySelector("td").textContent);
    expect(satirlar).toEqual(["AK100", "AK120_DSC", "AK300", "model girilmemiş"]);
  });
  it("AC-23 / AC-55: plandan fazla üretilen model satırı kalan 0 ve işaretli; toplam işaretli ve eksik modelin kalanını gösterir", () => {
    const fazla = Array.from({ length: 8 }, (_, i) => stk(400 + i, { partiId: 902 }));
    render(<Ekran alt="pano" s0={fazla} musteriler={[]} />);
    const ak100 = within(pano()).getAllByTestId("pano-satir").find(tr => tr.querySelector("td").textContent === "AK100");
    expect(ak100.querySelectorAll("td")[5].textContent).toBe(`0${FAZLA_IBARESI}`);
    expect(within(pano()).getByTestId("pano-toplam").querySelectorAll("td")[5].textContent).toBe(`3${FAZLA_IBARESI}`);
  });
  it("AC-25 / AC-56: plansız ve makinasız partide boş durum; hiç parti yokken seçici yerine boş durum", () => {
    render(<Ekran alt="pano" partiler={[{ id: 909, ad: "Boş", baslangicAy: "2026-10", bitisAy: null }]} />);
    expect(screen.getByTestId("bos-parti-panosu").textContent).toContain(PANO_BOS_VERI);
    cleanup();
    render(<Ekran alt="pano" partiler={[]} />);
    expect(screen.getByTestId("bos-parti-panosu").textContent).toContain(PANO_BOS_PARTI);
    expect(screen.queryByLabelText("Üretim partisi")).toBeNull();
  });
  it("AC-27 (R23): panoda para tutarı yazmaz", () => {
    render(<Ekran alt="pano" />);
    expect(pano().textContent).not.toMatch(/[₺$€]|\bTL\b|\d+,\d{2}/);
  });
  it("R19: parti değiştirilince sayılar o partiden", () => {
    render(<Ekran alt="pano" />);
    fireEvent.change(screen.getByLabelText("Üretim partisi"), { target: { value: "901" } });
    expect(within(pano()).getByTestId("pano-sayi-montajda").textContent).toBe("Montajda1");
    expect(within(pano()).getByTestId("pano-sayi-satildi").textContent).toBe("Satıldı0");
  });
});
