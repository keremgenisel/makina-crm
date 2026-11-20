// @vitest-environment jsdom
// Spec 0150 A: sipariş penceresinde işlem kalemleri (gerçek SiparisPenceresi). Kartta "İşlemler" tablosu (para yok), yalnız işlemi
// olan firmanın kartı, belirtilmemiş kutusunda tedarikçisiz işlemler, seçici fason firmayı listeler; kapatma ve hata işlemi düşürür.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import fs from "node:fs";
import { SiparisPenceresi } from "../../src/components/stock/SiparisPenceresi";
import * as S from "../../src/lib/siparisIhtiyaci";
import { BELGE_SUTUNLARI } from "../../src/lib/siparisRaporu";
import { PARCALAR, MALZEMELER, TEDARIKCILER, MODELLER, STOK } from "../fixtures/0150-veri.js";

afterEach(() => { cleanup(); delete window.appPrint; });

const PARTI = [{ id: 901, ad: "Güz", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK100: 10 } }];
const VERI = (o = {}) => ({ parts: PARCALAR.filter(p => !p.deletedAt), hamParts: PARCALAR, partStock: STOK, malzemeler: MALZEMELER,
  tedarikciler: TEDARIKCILER.filter(t => !t.deletedAt), hamTedarikciler: TEDARIKCILER, standardModels: MODELLER, customModels: [],
  uretimPartileri: PARTI, appSettings: {}, factory: { name: "Altuntaş" }, ...o });
const ciz = (o) => render(<SiparisPenceresi veri={VERI(o)} bugun="2026-11-20" onClose={vi.fn()} />);
const kart = (ad) => screen.getAllByTestId("siparis-tedarikci-bolumu").find(b => within(b).getByTestId("siparis-tedarikci-adi").textContent === ad);
const islemSatirlari = (k) => within(k).queryAllByTestId("siparis-islem-satiri").map(tr => [...tr.querySelectorAll("td")].map(td => td.textContent));

describe("Spec 0150: pencere", () => {
  it("AC-1 / AC-2 / AC-3 / AC-17: yalnız işlemi olan firmanın kartı ve İşlemler tablosu; parça, işlem, adet; para yok", () => {
    ciz();
    const k = kart("Kaplamacı");
    expect(within(k).queryByTestId("siparis-hazir-tablosu")).toBeNull();
    const t = within(k).getByTestId("siparis-islemler");
    expect(t.textContent).toContain(S.ISLEMLER_BASLIGI);
    expect([...t.querySelectorAll("th")].map(x => x.textContent)).toEqual(BELGE_SUTUNLARI.islem);
    expect(islemSatirlari(k)).toEqual([["Boydan", "Kaplama", "10"], ["Mil A", "Kaplama", "10"], ["Mil B", "Kaplama", "10"],
      ["Özel", "Nikel <kaplama> & cila", "10"], ["Mil A", "Taşlama", "10"]]);
    expect(t.textContent).not.toMatch(/₺|TL/);
  });
  it("AC-14: Ana tedarikçisi farklı parçanın işlemi işlem firmasının kartında; Ana tedarikçinin kartında İşlemler tablosu yok", () => {
    ciz();
    expect(islemSatirlari(kart("Isıl İşlem"))).toEqual([["Kırılımlı", "Hammadde alımı", "10"], ["Hazır C", "Isıl işlem", "20"]]); // AC-27
    expect(within(kart("Hazırcı")).queryByTestId("siparis-islemler")).toBeNull();
  });
  it("AC-16 / AC-39: tedarikçisiz işlem belirtilmemiş kutusunda kendi ibaresi ve tablosuyla; başlıktaki sayı parça sayısı", () => {
    ciz();
    const kutu = screen.getByTestId("siparis-belirtilmemis");
    fireEvent.click(within(kutu).getByRole("button", { name: new RegExp(`^${S.TEDARIKCI_BELIRTILMEMIS}`) }));
    expect(within(kutu).getByRole("button", { name: new RegExp(`^${S.TEDARIKCI_BELIRTILMEMIS}`) }).textContent).toContain(`${S.TEDARIKCI_BELIRTILMEMIS} (0)`);
    expect(within(kutu).getByTestId("siparis-tedarikcisiz-islem").textContent).toBe(S.tedarikcisizIslemMetni(1));
    expect(islemSatirlari(kutu)).toEqual([["Tedarikçisiz işlemli", "Torna", "10"]]);
  });
  it("AC-39: tedarikçi seçimi varken belirtilmemiş kutusu çizilmez", () => {
    ciz();
    fireEvent.click(screen.getByTestId("siparis-tedarikci-secici").querySelector("button") || screen.getByLabelText("Tedarikçi seçimi"));
    const kutu = screen.getByTestId("siparis-tedarikci-secici");
    const secenek = within(kutu).queryByLabelText("Kaplamacı") || within(kutu).getByText("Kaplamacı");
    fireEvent.click(secenek);
    expect(screen.queryByTestId("siparis-belirtilmemis")).toBeNull();
  });
  it("AC-25: yalnız işlem kaleminde geçen firma seçicide; seçilince kartı kalır ve ibare fason firmayı söyler", () => {
    ciz();
    const kutu = screen.getByTestId("siparis-tedarikci-secici");
    expect(kutu.textContent).toContain("Kaplamacı");
    fireEvent.click(within(kutu).queryByLabelText("Kaplamacı") || within(kutu).getByText("Kaplamacı"));
    expect(screen.getAllByTestId("siparis-tedarikci-bolumu").map(b => within(b).getByTestId("siparis-tedarikci-adi").textContent)).toEqual(["Kaplamacı"]);
    expect(screen.getByTestId("siparis-suzgec-nedeni").textContent).toBe(S.HAMMADDE_SUZGEC_NEDENI); // AC-26
  });
  it("AC-10 / R10: işlem satırı salt okunur; parçayı kapatmak işlemini düşürür", () => {
    ciz();
    expect(within(kart("Kaplamacı")).queryAllByRole("textbox")).toHaveLength(0);
    expect(within(kart("Kaplamacı")).queryAllByRole("checkbox")).toHaveLength(0);
    fireEvent.click(within(kart("Hazırcı")).getByLabelText("Hazır C sipariş etme"));
    expect(islemSatirlari(kart("Isıl İşlem"))).toEqual([["Kırılımlı", "Hammadde alımı", "10"]]);
  });
  it("AC-29 / R10/2: düzenlenen adet işlem satırına geçer ve rozet taşır; hatalı adetli parçanın işlemi çizilmez", () => {
    ciz();
    fireEvent.change(within(kart("Hazırcı")).getByLabelText("Hazır C sipariş adedi"), { target: { value: "30" } });
    const s = within(kart("Isıl İşlem")).getAllByTestId("siparis-islem-satiri").find(tr => tr.textContent.includes("Hazır C"));
    expect(s.querySelectorAll("td")[2].textContent).toBe("30");
    expect(within(s).getByTestId("siparis-islem-duzenlendi")).toBeTruthy();
    fireEvent.change(within(kart("Hazırcı")).getByLabelText("Hazır C sipariş adedi"), { target: { value: "x" } });
    expect(islemSatirlari(kart("Isıl İşlem"))).toEqual([["Kırılımlı", "Hammadde alımı", "10"]]);
  });
  it("Triyaj (bulgu 2): kanıt ekranı 'siparis-0150-tek-tedarikci' seçimi onay kutusunun aria-label'ıyla yapar ve seçim gerçekten olur", () => {
    const sayfa = fs.readFileSync("scripts/evidence/0009-sayfa.jsx", "utf8");
    const satir = sayfa.split("\n").find(l => l.includes('"siparis-0150-tek-tedarikci":'));
    expect(satir).toContain('"etiket:Kaplamacı"');
    expect(satir).not.toContain("tikla:");
    ciz();
    const hedef = document.querySelector('[aria-label="Kaplamacı"]'); // aracın `etiket:` adımının seçicisi birebir
    expect(hedef.tagName).toBe("INPUT"); expect(hedef.type).toBe("checkbox");
    hedef.click();
    expect(screen.getAllByTestId("siparis-tedarikci-bolumu").map(b => within(b).getByTestId("siparis-tedarikci-adi").textContent)).toEqual(["Kaplamacı"]);
  });
  it("R10/3 (triyaj bulgu 1): seçim yalnız fason firmadayken hatalı adet belgeyi kilitler ve pencere hatalı parçayı adıyla ve kartıyla söyler", () => {
    ciz();
    fireEvent.change(within(kart("Alfa Çelik")).getByLabelText("Mil B sipariş adedi"), { target: { value: "abc" } });
    expect(screen.queryByTestId("siparis-gizli-hata")).toBeNull(); // satır görünürken ibare yok
    document.querySelector('[aria-label="Kaplamacı"]').click();
    expect(screen.getByTestId("siparis-gizli-hata").textContent).toBe(S.gizliHataMetni("Mil B", "Alfa Çelik"));
    expect(screen.getByRole("button", { name: /Yazdır/ }).disabled).toBe(true);
  });
  it("AC-9: stoktan karşılanan parçanın işlemi görünmez", () => {
    ciz();
    expect(screen.getAllByTestId("siparis-islem-satiri").some(tr => tr.textContent.includes("Stokta yeten"))).toBe(false);
  });
  it("AC-28: yalnız işlemli bölüm basılabilir belgeye girer (gerçek düğme)", () => {
    const yazdir = vi.fn(); window.appPrint = { printHtml: yazdir };
    ciz();
    fireEvent.click(screen.getByRole("button", { name: /Yazdır|Sipariş Listesi/ }));
    const nusha = screen.queryByRole("button", { name: /Fiyatsız/ });
    if (nusha) fireEvent.click(nusha);
    const html = yazdir.mock.calls[0][0];
    expect(html).toContain("Kaplamacı · ");
    expect(html).toContain("Nikel &lt;kaplama&gt; &amp; cila");
  });
});
