// @vitest-environment jsdom
// Spec 0100: Anasayfa'nın "Satışa Hazır Makina" kutusu ve penceresi (R25–R30/2) ve StatCard'ın ek satır yuvası (C12).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { Dashboard } from "../../src/components/Dashboard";
import { StatCard } from "../../src/components/ui";
import { KUTU_ETIKETI, ORTUSME_CUMLESI, STOK_BOS_METNI } from "../../src/lib/stokDurumu";

afterEach(cleanup);

const KAPALI = { id: 901, ad: "Yaz Partisi", baslangicAy: "2026-06", bitisAy: "2026-08" };
const ACIK = { id: 902, ad: "Güz Partisi", baslangicAy: "2026-09", bitisAy: null };
const stk = (id, model, o = {}) => ({ id, model, serialNo: `S-${id}`, addedDate: "2026-09-01", ...o });
const STOK = [
  stk(1, "AK100"), stk(2, "AK100", { partiId: 901 }), stk(3, "AK100", { uretimDurumu: "montaj" }),
  stk(4, "AK200"), stk(5, "AK200"), stk(6, "AK200"),
  stk(7, "AK300", { partiId: 901, uretimDurumu: "montaj" }), stk(8, "AK300"),
  stk(9, "AK400"), stk(10, "AK500", { uretimDurumu: "montaj" }),
];
const ciz = (o = {}) => {
  const onGoStock = vi.fn();
  render(<Dashboard customers={[]} dealers={[]} services={[]} payments={[]} rates={null} factory={{ name: "Altuntaş" }} onGoStock={onGoStock} {...o} />);
  return { onGoStock };
};
const kutu = () => [...document.querySelectorAll(".stat-card")].find(k => k.firstChild.textContent === KUTU_ETIKETI);
const pencereAc = () => fireEvent.click(kutu());
const pencere = () => screen.getByTestId("stok-penceresi");

describe("Spec 0100: Anasayfa kutusu (R25–R26/2)", () => {
  it("AC-28 / AC-58: büyük sayı satışa hazır adedi; etiket anlamını söyler", () => {
    ciz({ stock: STOK, uretimPartileri: [KAPALI, ACIK] });
    expect(KUTU_ETIKETI).toBe("Satışa Hazır Makina");
    expect(kutu().textContent.startsWith("Satışa Hazır Makina7")).toBe(true);
    expect(screen.queryByText("Stoktaki Makina")).toBeNull();
  });
  it("AC-29: alt satır montajdaki adedi ve önceki partiden kalan adedi yazar", () => {
    ciz({ stock: STOK, uretimPartileri: [KAPALI, ACIK] });
    expect(within(kutu()).getByText("3 montajda · 2 önceki partiden")).toBeTruthy();
  });
  it("AC-30 / AC-58 (Karar 8, 9): en çok üç model, satışa hazıra göre azalan, eşitlikte ada; kalan sayısı; sıfır hazırlı model yok", () => {
    ciz({ stock: STOK, uretimPartileri: [KAPALI, ACIK] });
    const modeller = within(kutu()).getAllByTestId("stok-kutu-model").map(e => e.textContent);
    expect(modeller).toEqual(["AK2003", "AK1002", "AK3001"]);
    expect(within(kutu()).getByTestId("stok-kutu-kalan").textContent).toBe("1 model daha");
    expect(kutu().textContent).not.toContain("AK500");
  });
  it("AC-31: üçten az modelde kalan satırı çizilmez", () => {
    ciz({ stock: [stk(1, "AK100"), stk(2, "AK200")] });
    expect(within(kutu()).getAllByTestId("stok-kutu-model")).toHaveLength(2);
    expect(within(kutu()).queryByTestId("stok-kutu-kalan")).toBeNull();
  });
  it("AC-35: stok boşken kutu sıfır yazar, model satırı yok; pencere boş durum gösterir", () => {
    ciz({ stock: [] });
    expect(kutu().textContent).toBe("Satışa Hazır Makina00 montajda · 0 önceki partiden");
    pencereAc();
    expect(within(pencere()).getByTestId("stok-penceresi-bos").textContent).toBe(STOK_BOS_METNI);
  });
  it("AC-60 (R30/2): parti listesi verilmediğinde kutu çizilir (önceki partiden sıfır)", () => {
    ciz({ stock: STOK });
    expect(within(kutu()).getByText("3 montajda · 0 önceki partiden")).toBeTruthy();
  });
});

describe("Spec 0100: Anasayfa penceresi (R27–R30)", () => {
  it("AC-32 / AC-34: model başına üç sayı ve toplam; kutudaki sayılarla birebir", () => {
    ciz({ stock: STOK, uretimPartileri: [KAPALI, ACIK] });
    pencereAc();
    const satirlar = within(pencere()).getAllByTestId("stok-penceresi-satir").map(tr => [...tr.querySelectorAll("td")].map(td => td.textContent));
    expect(satirlar).toEqual([["AK200", "3", "0", "0"], ["AK100", "2", "1", "1"], ["AK300", "1", "1", "1"], ["AK400", "1", "0", "0"], ["AK500", "0", "1", "0"]]);
    const toplam = [...within(pencere()).getByTestId("stok-penceresi-toplam").querySelectorAll("td")].map(td => td.textContent);
    expect(toplam).toEqual(["Toplam", "7", "3", "2"]);
    expect(kutu().textContent).toContain("7");
    expect(within(kutu()).getByText("3 montajda · 2 önceki partiden")).toBeTruthy();
  });
  it("AC-33 (R28): örtüşme cümlesi", () => {
    ciz({ stock: STOK, uretimPartileri: [KAPALI, ACIK] });
    pencereAc();
    expect(within(pencere()).getByTestId("stok-ortusme").textContent).toBe(ORTUSME_CUMLESI);
  });
  it("AC-59 (R27/2): 'Stokta Görüntüle' Stok ekranını açar; kutu tıklaması doğrudan gitmez", () => {
    const { onGoStock } = ciz({ stock: STOK });
    pencereAc();
    expect(onGoStock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Stokta Görüntüle/ }));
    expect(onGoStock).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("stok-penceresi")).toBeNull();
  });
  it("triyaj bulgu 5 (spec 0015): pencerenin düğmeleri gövdede değil Modal'ın footer yuvasında", () => {
    ciz({ stock: STOK });
    pencereAc();
    const govde = pencere().parentElement;
    for (const ad of [/Kapat/, /Stokta Görüntüle/]) expect(govde.contains(screen.getByRole("button", { name: ad }))).toBe(false);
    expect(screen.getByRole("button", { name: /Stokta Görüntüle/ }).parentElement.style.gap).toBe("8px");
  });
  it("AC-36 / AC-60 (R30, C13): kutuda ve pencerede parti adı geçmez", () => {
    ciz({ stock: STOK, uretimPartileri: [KAPALI, ACIK] });
    pencereAc();
    expect(document.body.textContent).not.toMatch(/Yaz Partisi|Güz Partisi/);
  });
});

describe("Spec 0100: StatCard ek satır yuvası (C12, R25/3)", () => {
  it("AC-61: yuva verilmediğinde kartın çizimi spec öncesi biçimle birebir", () => {
    const { container } = render(<StatCard label="Toplam Bayi" value={3} sub="Görmek için tıkla" color="red" onClick={() => {}} />);
    // Spec öncesi `StatCard`'ın çıktısı (src/components/ui.jsx, 530ae98): etiket, değer ve alt satır, başka öğe yok.
    expect(container.innerHTML).toBe('<div class="stat-card stat-card--clickable" style="border-left: 4px solid red;"><div style="font-size: 13px; color: var(--n500, #64748b); font-weight: 500; margin-bottom: 6px;">Toplam Bayi</div><div style="font-size: 26px; font-weight: 700; color: var(--n900, #0f172a);">3</div><div style="font-size: 12px; color: var(--n400, #94a3b8); margin-top: 4px;">Görmek için tıkla</div></div>');
  });
  it("AC-61: Anasayfa'nın diğer dokuz kutusu aynı etiketlerle (0079 ve 0095 kıyasları metni birebir sabitler)", () => {
    ciz({ stock: STOK });
    const etiketler = [...document.querySelectorAll(".stat-card")].map(k => k.firstChild.textContent);
    expect(etiketler).toEqual(["Toplam Müşteri", "Toplam Bayi", "Satışa Hazır Makina", "Servis Kayıtları", "Garanti Süresi Dolan", "Borçlu Firma",
      "Borçlu Bayi/Servis", "Garantisi Devam Eden", "Seri No Bekleyen", "Üretimde Bekleyen Kalıplar"]);
  });
});
