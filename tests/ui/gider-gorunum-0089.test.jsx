// @vitest-environment jsdom
// Spec 0089: Giderler'in iki görünümü kalkar, gerçek bileşenler. Çubuk ve açılış (AC-1–AC-4), Dönem Raporu'nun kutuları ve
// kopmuş atama satırı (AC-10, AC-13), Tedarikler ve Ekstre (AC-11), gider formunun atama alanları (AC-12), dağıtım rozeti
// (AC-17) ve yeni ekranın tarihsiz makina ipucu (AC-27). Veri tests/fixtures/0089-veri.js (kıyas testiyle ortak).
// Spec 0090 ile (R1, R10, R11): kovalar kutusu, kopmuş atama satırı, dağıtım rozeti ve formun atama/dağıtım alanları kalktı;
// AC-10 dört kutu, AC-13/AC-17/AC-12 yokluk ve "eski veri korunur" iddiasına çevrildi.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { kutuAc } from "./kutuAc";
import { Giderler } from "../../src/components/Giderler";
import { GiderForm } from "../../src/components/GiderForm";
import { PayOzeti, URETIM_TARIHI_DUZELTME } from "../../src/components/maliyet/PayOzeti";
import { hesaplaGiderRaporu } from "../../src/lib/gider";
import { TURLER, TED, STANDART, OZEL, STOCK, KALEMLER, HAREKET, KDV, SATIS, DONEM, BUGUN, raporGirdisi } from "../fixtures/0089-veri";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(`${BUGUN}T10:00:00`)); });

function GH({ g0 = KALEMLER, baslangicGorunum }) {
  const [giderler, setGiderler] = useState(g0);
  const [hesapHareketleri, setHesapHareketleri] = useState(HAREKET);
  const [ted, setTed] = useState(TED);
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
    giderTurleri={TURLER} tedarikciler={ted} setTedarikciler={setTed} calisanlar={[]} stock={STOCK} customers={[]} standardModels={STANDART} customModels={OZEL}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-01" }, kdvRates: KDV }} kdvRates={KDV} kasaHesaplari={[]} satisVerisi={SATIS} showToast={vi.fn()} canDo={() => true}
    baslangicGorunum={baslangicGorunum} />;
}
const cubuk = () => within(screen.getByRole("radiogroup", { name: "Görünüm" })).getAllByRole("radio");
const KALKAN = ["Makina Kârlılığı", "Makina ve Model", "Üretim Partileri"];
const yok = () => { for (const ad of KALKAN) expect(screen.queryByRole("radio", { name: ad }), ad).toBeNull(); };
const KUTULAR = ["Gider Türü Kırılımı", "KDV Karşılaştırması", "Tedarikçi Kırılımı", "Ödeme Yöntemi Kırılımı"];

describe("Spec 0089: görünüm çubuğu (R1, R3)", () => {
  it("AC-1: çubukta iki düğme, sırayla Dönem Raporu ve Tedarikler ve Ekstre", () => {
    render(<GH />);
    expect(cubuk().map(r => r.textContent)).toEqual(["Dönem Raporu", "Tedarikler ve Ekstre"]);
  });
  it("AC-2: Giderler açılınca Dönem Raporu çizilir", () => {
    render(<GH />);
    expect(screen.getByRole("radio", { name: "Dönem Raporu" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("kalem-listesi")).toBeTruthy();
  });
  it("AC-3: kalkan üç görünüm adı çubukta hiçbir kipte yok (normal, hatırlatma, açık kalemler, Tedarikler ve Ekstre)", () => {
    render(<GH />);
    yok();
    fireEvent.click(screen.getByTestId("acik-kalemler-dugmesi"));
    yok();
    fireEvent.click(screen.getByTestId("acik-kalemler-dugmesi"));
    fireEvent.click(screen.getByTestId("hatirlatma-dugmesi"));
    yok();
    fireEvent.click(screen.getByRole("radio", { name: "Tedarikler ve Ekstre" }));
    yok();
    expect(document.body.textContent).not.toMatch(/Makina Kârlılığı|Makina ve Model/);
  });
  it("AC-4: kaldırılmış görünüm adıyla açılınca Dönem Raporu çizilir ve hata çıkmaz", () => {
    for (const g of ["karlilik", "makina", "partiler"]) {
      const { unmount } = render(<GH baslangicGorunum={g} />);
      expect(screen.getByRole("radio", { name: "Dönem Raporu" }).getAttribute("aria-checked"), g).toBe("true");
      expect(screen.getByTestId("kalem-listesi")).toBeTruthy();
      unmount();
    }
  });
});

describe("Spec 0089: Dönem Raporu (R7, R12, C4)", () => {
  it("AC-10 (spec 0090 ile dört kutu): yan kutular kapalı başlar ve açılır; kalem listesi, borç özeti ve özet kartları çizilir; süzgeç çalışır", () => {
    render(<GH />);
    for (const ad of KUTULAR) expect(screen.getByRole("button", { name: new RegExp(`^${ad}`) }).getAttribute("aria-expanded"), ad).toBe("false");
    for (const ad of KUTULAR) kutuAc(ad);
    expect(screen.getByText("Kime Ne Kadar Borçluyuz")).toBeTruthy();
    for (const e of ["Toplam gider", "Ödenmemiş gider", "İndirilecek KDV"]) expect(screen.getAllByText(e).length, e).toBeGreaterThan(0);
    const liste = screen.getByTestId("kalem-listesi");
    expect(within(liste).getByText("Rulman")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Açıklama ara"), { target: { value: "Motor" } });
    expect(within(liste).queryByText("Rulman")).toBeNull();
    expect(within(liste).getByText("Motor")).toBeTruthy();
  });
  it("AC-13 (spec 0090 ile): kovalar kutusu ve kopmuş atama satırı yok; motor listesi değişmedi (C4)", () => {
    const r = hesaplaGiderRaporu(raporGirdisi(), DONEM, { bugun: BUGUN });
    expect(r.dusenAtamalar).toHaveLength(3);
    render(<GH />);
    expect(screen.queryByRole("button", { name: /^Makina Maliyeti Kovaları/ })).toBeNull();
    expect(screen.queryByTestId("kova-karti")).toBeNull();
    expect(screen.queryByTestId("dusen-atama-sayisi")).toBeNull();
  });
  it("AC-17 (spec 0090 ile): aylara dağıtılmış kalemde rozet yok; tam tutarı listede değişmez", () => {
    render(<GH />);
    expect(screen.queryByTestId("dagitim-rozeti")).toBeNull();
    const satir = within(screen.getByTestId("kalem-listesi")).getByText("Yıllık sigorta", { exact: false }).closest("tr");
    expect(satir.textContent).toMatch(/1\.200 ₺/);
  });
});

describe("Spec 0089: değişmeyen ekranlar (R6, R8)", () => {
  it("AC-11: Tedarikler ve Ekstre görünümü, tedarikçi formu ve ekstre penceresi çalışır", () => {
    render(<GH />);
    fireEvent.click(screen.getByRole("radio", { name: "Tedarikler ve Ekstre" }));
    const liste = screen.getByTestId("tedarikciler");
    expect(liste.textContent).toMatch(/Tedarikler ve Ekstre · 2/);
    fireEvent.click(within(screen.getByText("Demir Bant").closest("tr")).getByText("Ekstre"));
    expect(screen.getByText("Tedarikçi Ekstresi")).toBeTruthy();
  });
  it("AC-12 (spec 0090 ile): gider formunda atama ve dağıtım alanı yok; eski kalemin dağıtımı kayıtta korunur", () => {
    const onSave = vi.fn();
    render(<GiderForm giderTurleri={TURLER} tedarikciler={TED} calisanlar={[]} giderAyarlari={{}} onSave={onSave} onCancel={vi.fn()}
      kalem={{ id: 40, turId: 1, tarih: "2026-10-05", tutar: 1200, kdvOrani: 20, tedarikciId: 11, aciklama: "Yıllık sigorta", dagitimAy: 12 }} />);
    for (const ad of ["Makina", "Model", "Dağıtılmasın"]) expect(screen.queryByRole("radio", { name: ad }), ad).toBeNull();
    expect(screen.queryByLabelText("Maliyete dağıtım (ay)")).toBeNull();
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0]).toMatchObject({ dagitimAy: 12, tutar: 1200 });
  });
});

describe("Spec 0089: yeni ekranın ipucu (R16)", () => {
  it("AC-27: tarihsiz makina ipucu üretim tarihinin nereden girileceğini söyler", () => {
    const pay = { durum: "tamam", baslangicAy: "2026-01", bitisAy: "2026-12", havuzK: 100000, varsayilanAdet: 10, aylik: null, payK: 10000, roller: { rolsuzTurSayisi: 0 }, havuz: { tursuzAdet: 0 } };
    render(<PayOzeti pay={pay} gercek={{ adet: 3, cozulemeyen: 2, payK: 33333 }} />);
    expect(screen.getByText(/2 makinanın üretim tarihi çözülemediği için gerçek adede girmedi\./).textContent).toContain(URETIM_TARIHI_DUZELTME);
    expect(URETIM_TARIHI_DUZELTME).toBe("Makina düzenleme formundan üretim tarihi girilebilir.");
  });
});
