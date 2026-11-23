// @vitest-environment jsdom
// Spec 0158 A: parça kartı (üç bilgi alanı), parça listesi satırı ve genel arama. Test adları AC-<n> taşır.
import { describe, it, expect, afterEach, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { PartManager } from "../../src/components/PartManager";
import { GlobalSearch } from "../../src/components/GlobalSearch";

vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: () => {} }));
afterEach(() => cleanup());

const BILGI = { olcu: "M8 × 40", hammaddeAdi: "Paslanmaz A2", cins: "DIN 933" };
const PARCALAR = [{ id: 1, ad: "Cıvata", kod: "CV-8", ...BILGI }, { id: 2, ad: "Rulman", kod: "RL-1" }];
const kur = (ilk = PARCALAR) => {
  const kayit = { parts: ilk };
  const Kap = () => { const [parts, setParts] = useState(ilk); kayit.parts = parts; return <PartManager parts={parts} setParts={setParts} showToast={() => {}} />; };
  render(<Kap />);
  return kayit;
};
const kartAlanlari = () => within(screen.getByTestId("parca-bilgi-alanlari"));
const satir = (ad) => screen.getAllByRole("row").find(r => r.querySelector("span")?.textContent === ad);

describe("Spec 0158 A: parça kartı", () => {
  it("AC-1 / AC-4: kodun ardından ölçü, hammadde ve cins; cins parça tipi seçicisinden ayrı bir alan", () => {
    kur();
    fireEvent.click(screen.getByRole("button", { name: /Parça\/Yedek Parça Ekle/ }));
    const etiketler = [...document.querySelectorAll("label")].map(l => l.textContent.trim());
    const kod = etiketler.indexOf("Kod");
    expect(etiketler.slice(kod, kod + 4)).toEqual(["Kod", "Ölçü", "Hammadde", "Cins"]);
    expect(kartAlanlari().getByLabelText("Cins").tagName).toBe("INPUT");
    expect(etiketler).toContain("Parça Tipi");
  });
  it("AC-2: üçü boş bırakılarak kayıt yapılır, kayıt gövdesinde anahtarlar yok", () => {
    const k = kur();
    fireEvent.click(screen.getByRole("button", { name: /Parça\/Yedek Parça Ekle/ }));
    fireEvent.change(screen.getByPlaceholderText("Örn: Kesme Bıçağı Seti"), { target: { value: "Pul" } });
    fireEvent.click(screen.getByRole("button", { name: /^Kaydet$/ }));
    const yeni = k.parts.find(p => p.ad === "Pul");
    for (const a of ["olcu", "hammaddeAdi", "cins"]) expect(yeni, a).not.toHaveProperty(a);
  });
  it("AC-3 / AC-70: dolu alanlar kırpılıp kaydedilir, yeniden açılınca aynen görünür; boşaltılan alan geri gelmez", () => {
    const k = kur();
    fireEvent.click(screen.getByRole("button", { name: /Parça\/Yedek Parça Ekle/ }));
    fireEvent.change(screen.getByPlaceholderText("Örn: Kesme Bıçağı Seti"), { target: { value: "Saplama" } });
    fireEvent.change(kartAlanlari().getByLabelText("Ölçü"), { target: { value: "  M10 × 60 " } });
    fireEvent.change(kartAlanlari().getByLabelText("Hammadde"), { target: { value: "Çelik 8.8" } });
    fireEvent.change(kartAlanlari().getByLabelText("Cins"), { target: { value: "DIN 976" } });
    fireEvent.click(screen.getByRole("button", { name: /^Kaydet$/ }));
    expect(k.parts.find(p => p.ad === "Saplama")).toMatchObject({ olcu: "M10 × 60", hammaddeAdi: "Çelik 8.8", cins: "DIN 976" });
    fireEvent.click(within(satir("Saplama")).getByTitle("Düzenle"));
    expect(kartAlanlari().getByLabelText("Ölçü").value).toBe("M10 × 60");
    fireEvent.change(kartAlanlari().getByLabelText("Hammadde"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /^Kaydet$/ }));
    const p = k.parts.find(x => x.ad === "Saplama");
    expect(p).not.toHaveProperty("hammaddeAdi"); expect(p.olcu).toBe("M10 × 60");
  });
});

describe("Spec 0158 A: parça listesi", () => {
  it("AC-5 / AC-78: dolu alanlar adın altında ölçü, hammadde, cins sırasıyla, etiketsiz ve kendi kimliğiyle", () => {
    kur();
    expect(within(satir("Cıvata")).getByTestId("parca-bilgi-satiri").textContent).toBe("M8 × 40 · Paslanmaz A2 · DIN 933");
  });
  it("AC-6: üçü de boş parçada satır çizilmez", () => {
    kur();
    expect(within(satir("Rulman")).queryByTestId("parca-bilgi-satiri")).toBeNull();
  });
});

describe("Spec 0158 A: genel arama", () => {
  const BOS = Object.fromEntries(["customers", "services", "teklifler", "dealers", "stock", "yedekParcaSatislar", "partSales", "notes", "uretimFormlari", "dosyalar", "calisanlar",
    "giderler", "giderTurleri", "tedarikciler", "giderTanimlari", "uretimPartileri", "kasaHesaplari", "cekler", "kalipDefs"].map(k => [k, []]));
  const ac = (sorgu) => {
    render(<GlobalSearch {...BOS} parts={PARCALAR} allowedTabs={["settings"]} onGoKatalog={vi.fn()} />);
    fireEvent.click(screen.getByTitle("Genel arama (Ctrl+K)"));
    fireEvent.change(screen.getByPlaceholderText(/Müşteri, seri no/), { target: { value: sorgu } });
  };
  const sonuclar = () => [...document.querySelectorAll("button[data-sel]")].map(b => b.textContent.replace(/\s+/g, " ").trim());
  it("AC-7: ölçüyle aranınca parça bulunur", () => { ac("M8"); expect(sonuclar().some(t => t.startsWith("Cıvata"))).toBe(true); });
  it("AC-8: hammadde ve cins ile aranınca parça bulunur", () => {
    ac("paslanmaz"); expect(sonuclar().some(t => t.startsWith("Cıvata"))).toBe(true);
    cleanup(); ac("din 933"); expect(sonuclar().some(t => t.startsWith("Cıvata"))).toBe(true);
  });
  it("AC-9: adında geçmeyen kelime bu alanlarda geçince sonuç satırı nedenini yazar; adda geçen kelimede neden yok", () => {
    ac("cıvata paslanmaz");
    expect(sonuclar().find(t => t.startsWith("Cıvata"))).toContain("↳ hammadde: Paslanmaz A2");
    cleanup(); ac("cıvata");
    expect(sonuclar().find(t => t.startsWith("Cıvata"))).not.toContain("↳");
  });
});
