// @vitest-environment jsdom
// Spec 0101: Makina Stoğu'nun kalıp çapı (form, liste, yazım). Gerçek Stock bileşeni, App gibi bağlanır: ekrana çöpü
// süzülmüş stok, setter'a tam dizi. Saf kurallar ve taramalar tests/kalip-capi-0101.test.js'te.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";

const { logAction } = vi.hoisted(() => ({ logAction: vi.fn() }));
vi.mock("../../src/lib/audit", async (orijinal) => ({ ...(await orijinal()), logAction }));
import { Stock } from "../../src/components/Stock";

afterEach(() => { cleanup(); logAction.mockClear(); });

const MODELLER = [{ model: "AK100", kalip: "14 cm" }, { model: "AK120_DSC" }];
const PARTI = { id: 902, ad: "2026-2", baslangicAy: "2026-09", bitisAy: null };
const stk = (id, o = {}) => ({ id, model: "AK100", serialNo: `S-${id}`, addedDate: "2026-09-01", note: "", parcalar: [], ...o });
const KC = { en: "50", yukseklik: "80", boy: "115" };
const STOK = [stk(1, { kalipCapi: KC }), stk(2), stk(3, { model: "AK120_DSC", kalipCapi: { en: " 50 ", yukseklik: "  ", boy: "" } })];

let durum;
function Ekran({ s0 = STOK, giderYetki = true }) {
  const [stock, setStock] = useState(structuredClone(s0));
  durum = { stock };
  const canli = (a) => a.filter(x => !x.deletedAt);
  return <Stock stock={canli(stock)} setStock={setStock} customers={[]} setCustomers={() => {}} parts={[]} dealers={[]} yedekParcaSatislar={[]}
    models={MODELLER} showToast={() => {}} uretimPartileri={[PARTI]} giderYetki={giderYetki} defaultSubTab="makina" setPartStock={() => {}} setPartStockLog={() => {}} />;
}
const satir = (seri) => screen.getByText(seri).closest("tr");
const duzenle = (seri) => fireEvent.click(within(satir(seri)).getAllByRole("button")[0]);
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
const kayit = (id) => durum.stock.find(s => s.id === id);
const kutu = (ad) => screen.getByRole("textbox", { name: ad });
const yaz = (ad, deger) => fireEvent.change(kutu(ad), { target: { value: deger } });
const yeniAc = () => {
  fireEvent.click(screen.getByRole("button", { name: /Stoğa Makina Ekle/ }));
  fireEvent.change(screen.getByDisplayValue("Model seçin..."), { target: { value: "AK100" } });
};
const capHucresi = (seri) => within(satir(seri)).getByTestId("stok-kalip-capi").textContent;

describe("Spec 0101: veri ve yazım (R1–R5)", () => {
  it("AC-1: çap kutuları boş bırakılıp eklenen makinanın gövdesinde kalipCapi anahtarı yok", () => {
    render(<Ekran s0={[]} />);
    yeniAc();
    kaydet();
    expect(durum.stock).toHaveLength(1);
    expect("kalipCapi" in durum.stock[0]).toBe(false);
  });
  it("AC-1 / AC-36: bir hane yazılıp silinen çap kayıtta temizlenir (onChange'de değil, kayıtta)", () => {
    render(<Ekran s0={[]} />);
    yeniAc();
    yaz("Çap", "5");
    expect(kutu("Çap").value).toBe("5");
    yaz("Çap", "");
    kaydet();
    expect("kalipCapi" in durum.stock[0]).toBe(false);
  });
  it("AC-2: üç kutudan biri doluyken gövde {en, yukseklik, boy} değerlerini kırpmadan taşır", () => {
    render(<Ekran s0={[]} />);
    yeniAc();
    yaz("Çap", " 50 ");
    yaz("Arka Ölçü", "80");
    yaz("Boy", "115 ");
    kaydet();
    expect(durum.stock[0].kalipCapi).toEqual({ en: " 50 ", yukseklik: "80", boy: "115 " });
  });
  it("AC-3: üç kutuya da yalnız boşluk yazılırsa çap boş sayılır, anahtar yazılmaz", () => {
    render(<Ekran s0={[]} />);
    yeniAc();
    yaz("Çap", "  "); yaz("Arka Ölçü", " "); yaz("Boy", "   ");
    kaydet();
    expect("kalipCapi" in durum.stock[0]).toBe(false);
  });
  it("AC-37: bir parçası dolu, ötekileri boşluk olan nesne birebir saklanır ve hücre fmtKalipCapi çıktısını yazar", () => {
    render(<Ekran />);
    expect(capHucresi("S-3")).toBe("50 x  x ");
    duzenle("S-3");
    kaydet();
    expect(kayit(3).kalipCapi).toEqual({ en: " 50 ", yukseklik: "  ", boy: "" });
  });
  it("AC-7: çapı olmayan satırın yalnız notu değişip kaydedilince gövdesine kalipCapi girmez", () => {
    render(<Ekran />);
    duzenle("S-2");
    fireEvent.change(screen.getByPlaceholderText("İsteğe bağlı not..."), { target: { value: "Yeni not" } });
    kaydet();
    expect(kayit(2).note).toBe("Yeni not");
    expect("kalipCapi" in kayit(2)).toBe(false);
  });
  it("AC-36: düzenlemede çap boşaltılınca alan kayıttan silinir, öteki alanlar aynen", () => {
    render(<Ekran />);
    duzenle("S-1");
    yaz("Çap", ""); yaz("Arka Ölçü", ""); yaz("Boy", "");
    kaydet();
    expect("kalipCapi" in kayit(1)).toBe(false);
    expect(kayit(1)).toMatchObject({ id: 1, model: "AK100", serialNo: "S-1", addedDate: "2026-09-01" });
  });
});

describe("Spec 0101: stok formu ve listesi (R6–R10)", () => {
  it("AC-9 / AC-40: ekleme penceresinde başlık ve üç kutu; erişilebilir adlar ve yer tutucular Çap, Arka Ölçü, Boy", () => {
    render(<Ekran s0={[]} />);
    yeniAc();
    expect(screen.getByText("Makina Kalıp Çapı")).toBeTruthy();
    for (const ad of ["Çap", "Arka Ölçü", "Boy"]) {
      expect(kutu(ad).getAttribute("placeholder")).toBe(ad);
      expect(kutu(ad).value).toBe("");
    }
  });
  it("AC-10: düzenleme penceresinde kayıtlı çap üç kutuya dolu gelir", () => {
    render(<Ekran />);
    duzenle("S-1");
    expect([kutu("Çap").value, kutu("Arka Ölçü").value, kutu("Boy").value]).toEqual(["50", "80", "115"]);
  });
  it("AC-39: alan sırası Model, Seri Numarası, Makina Kalıp Çapı, Stoğa Giriş Tarihi, Üretim durumu, Üretim partisi, Not, Kullanılan Parçalar", () => {
    render(<Ekran s0={[]} />);
    yeniAc();
    const dialog = screen.getByText("Makina Kalıp Çapı").closest("[role=dialog]") || document.body;
    const etiketler = [...dialog.querySelectorAll("label")].map(l => l.textContent.trim()).filter(Boolean);
    const sira = ["Makina Modeli", "Seri Numarası (opsiyonel)", "Makina Kalıp Çapı", "Stoğa Giriş Tarihi", "Üretim durumu", "Üretim partisi", "Not"];
    expect(etiketler.filter(e => sira.includes(e))).toEqual(sira);
    const not = screen.getByPlaceholderText("İsteğe bağlı not...");
    const parcalar = screen.getByText(/Kullanılan Parçalar/);
    expect(not.compareDocumentPosition(parcalar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("AC-39 / C6: gider yetkisi yokken parti seçicisi yok, çap alanı yine çizilir", () => {
    render(<Ekran s0={[]} giderYetki={false} />);
    yeniAc();
    expect(screen.queryByLabelText("Üretim partisi")).toBeNull();
    expect(kutu("Çap")).toBeTruthy();
  });
  it("AC-12: başlıklar yedi sütun ve çaplı satırın hücresi '50 x 80 x 115'", () => {
    render(<Ekran />);
    const basliklar = [...document.querySelectorAll("thead th")].map(th => th.textContent);
    expect(basliklar).toEqual(["Model", "Durum", "Kalıp Çapı", "Seri Numarası", "Stoğa Giriş", "Not", ""]);
    expect(capHucresi("S-1")).toBe("50 x 80 x 115");
  });
  it("AC-13: çapı olmayan satırın hücresinde '—'", () => {
    render(<Ekran />);
    expect(capHucresi("S-2")).toBe("—");
  });
  it("AC-14: stok hiç boşken ve arama hiçbir satır bırakmazken tablo çizilmez", () => {
    render(<Ekran s0={[]} />);
    expect(screen.getByTestId("bos-makina-stok").textContent).toContain("Stokta makina yok.");
    expect(document.querySelector("thead")).toBeNull();
    cleanup();
    render(<Ekran />);
    fireEvent.change(screen.getByPlaceholderText("Model veya seri no ara..."), { target: { value: "yok-boyle-bir-seri" } });
    expect(screen.getByTestId("bos-makina-stok").textContent).toContain("Aramanıza uyan makina yok.");
    expect(document.querySelector("thead")).toBeNull();
  });
  it("AC-46: çap aramaya girmez", () => {
    render(<Ekran />);
    fireEvent.change(screen.getByPlaceholderText("Model veya seri no ara..."), { target: { value: "115" } });
    expect(screen.getByTestId("bos-makina-stok")).toBeTruthy();
  });
});

describe("Spec 0101: denetim izi (X5, Karar 22)", () => {
  it("AC-47: ekleme kaydının detayı yalnız seri no; düzenleme kaydının onceki anlık görüntüsü çapı taşır", () => {
    render(<Ekran />);
    fireEvent.click(screen.getByRole("button", { name: /Stoğa Makina Ekle/ }));
    fireEvent.change(screen.getByDisplayValue("Model seçin..."), { target: { value: "AK100" } });
    fireEvent.change(screen.getByPlaceholderText("Boş bırakılabilir — sonra atanır"), { target: { value: "S-9" } });
    yaz("Çap", "60");
    kaydet();
    const ekleme = logAction.mock.calls.map(c => c[0]).find(a => a.action === "olusturuldu");
    expect(ekleme.detail).toEqual({ serialNo: "S-9" });
    duzenle("S-1");
    yaz("Boy", "120");
    kaydet();
    const duzen = logAction.mock.calls.map(c => c[0]).find(a => a.action === "duzenlendi");
    expect(duzen.detail.onceki.kalipCapi).toEqual(KC);
    expect(kayit(1).kalipCapi).toEqual({ ...KC, boy: "120" });
  });
});
