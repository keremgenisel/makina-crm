// @vitest-environment jsdom
// Spec 0045: tutar alanında binlik ayracı (bileşen ve ekranlar). İmleç gerçek alanda selectionStart ile ölçülür.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { TutarInput } from "../../src/components/gider/GiderAlanlari";
import { GiderForm } from "../../src/components/GiderForm";
import { SettingsGider } from "../../src/components/settings/SettingsGider";
import { OdemeKayitPenceresi } from "../../src/components/gider/OdemeKayitPenceresi";
import { Kasa } from "../../src/components/Kasa";
import { cekleriUygula } from "../../src/lib/cek";
import { odemeleriUygula, turHaritasi } from "../../src/lib/gider";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-28T10:00:00")); });

// Gerçek alanda bir düzenleme: yeni metin ve imleç kurulur, input olayı yollanır (React onChange).
const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
const duzenle = (el, metin, imlec, tus = null) => {
  el.focus();
  if (tus) fireEvent.keyDown(el, { key: tus });
  setter.call(el, metin);
  el.setSelectionRange(imlec, imlec);
  fireEvent.input(el);
};
const yaz = (el, tuslar) => { for (const t of tuslar) { const i = el.selectionStart ?? el.value.length; duzenle(el, el.value.slice(0, i) + t + el.value.slice(i), i + 1); } };

function Alan({ ilk = "", sym, onState }) {
  const [v, setV] = useState(ilk);
  onState?.(v);
  return <TutarInput ariaLabel="Tutar" sym={sym} value={v} onChange={setV} />;
}

describe("Spec 0045: TutarInput", () => {
  it("AC-1 / AC-9: \"80000\" yazılınca alanda \"80.000\", durumda ham \"80000\"; boş alan boş", () => {
    let st;
    render(<Alan onState={v => { st = v; }} />);
    const el = screen.getByLabelText("Tutar");
    expect(el.value).toBe("");
    yaz(el, "80000");
    expect(el.value).toBe("80.000");
    expect(st).toBe("80000");
  });
  it("AC-2 / AC-4: \"1234,56\" → \"1.234,56\"; yarım \"80000,\" virgülü korur", () => {
    render(<Alan />);
    const el = screen.getByLabelText("Tutar");
    yaz(el, "1234,56");
    expect(el.value).toBe("1.234,56");
    cleanup();
    render(<Alan />);
    const el2 = screen.getByLabelText("Tutar");
    yaz(el2, "80000,");
    expect(el2.value).toBe("80.000,");
  });
  it("AC-3: sayının ortasına rakam eklenince imleç eklenen rakamın sağında kalır (gerçek alan)", () => {
    render(<Alan ilk="80000" />);
    const el = screen.getByLabelText("Tutar");
    expect(el.value).toBe("80.000");
    duzenle(el, "805.000", 3);
    expect(el.value).toBe("805.000");
    expect(el.selectionStart).toBe(3);
    duzenle(el, "8905.000", 2); // ayraç kayar: "8.905.000", imleç 9'un sağında
    expect(el.value).toBe("8.905.000");
    expect(el.value.slice(0, el.selectionStart)).toBe("8.9");
  });
  it("AC-6: geri silme ayracın üzerinden geçerken tek vuruşta bir rakam siler (gerçek alan)", () => {
    let st;
    render(<Alan ilk="80000" onState={v => { st = v; }} />);
    const el = screen.getByLabelText("Tutar");
    duzenle(el, "80000", 2, "Backspace"); // "80.000" imleç 3'teyken noktayı silen tuş
    expect(el.value).toBe("8.000");
    expect(st).toBe("8000");
    expect(el.selectionStart).toBe(1);
  });
  it("AC-5: yapıştırılan \"1.234,56\" ve \"1234.56\" aynı tutar", () => {
    let st;
    render(<Alan onState={v => { st = v; }} />);
    const el = screen.getByLabelText("Tutar");
    fireEvent.change(el, { target: { value: "1234.56" } });
    expect([el.value, st]).toEqual(["1.234,56", "1234,56"]);
    fireEvent.change(el, { target: { value: "" } });
    fireEvent.change(el, { target: { value: "1.234,56" } });
    expect([el.value, st]).toEqual(["1.234,56", "1234,56"]);
  });
  it("AC-11: oran alanı (sym %) ayraç almaz", () => {
    render(<Alan sym="%" />);
    const el = screen.getByLabelText("Tutar");
    fireEvent.change(el, { target: { value: "1000" } });
    expect(el.value).toBe("1000");
  });
});

const TURLER = [{ id: 1, ad: "Fabrika kirası", davranis: "kira" }, { id: 4, ad: "Hammadde", davranis: "normal" }];
const formAc = (props = {}) => {
  const onSave = vi.fn();
  render(<GiderForm giderTurleri={TURLER} tedarikciler={[{ id: 11, ad: "Kiraya veren" }]} calisanlar={[]} modeller={[]} stock={[]} customers={[]}
    giderAyarlari={{ stopajOrani: 20 }} onSave={onSave} onCancel={vi.fn()} {...props} />);
  return onSave;
};
const tur = (id) => fireEvent.change(screen.getByLabelText("Gider türü *"), { target: { value: String(id) } });

describe("Spec 0045: gider formu", () => {
  it("AC-7: aynı giriş aynı değeri kaydeder (\"80000\" ve \"1234,56\")", () => {
    for (const [g, beklenen] of [["80000", 80000], ["1234,56", 1234.56]]) {
      const onSave = formAc();
      tur(4);
      yaz(screen.getByLabelText("Tutar"), g);
      fireEvent.click(screen.getByText("Kaydet"));
      expect(onSave.mock.calls[0][0].tutar, g).toBe(beklenen);
      cleanup();
    }
  });
  it("AC-8: düzenlemeye açılan kalemde tutar biçimli görünür, değiştirmeden kayıtta değer aynı", () => {
    const onSave = formAc({ kalem: { id: 7, tarih: "2026-09-10", turId: 4, tutar: 39223.13, kdvOrani: 20, modelSatirlari: [] } });
    expect(screen.getByLabelText("Tutar").value).toBe("39.223,13");
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0].tutar).toBe(39223.13);
  });
  it("AC-10: geçersiz giriş bugünkü hata metnini aynen üretir", () => {
    const onSave = formAc();
    tur(4);
    const el = screen.getByLabelText("Tutar");
    yaz(el, "12a");
    expect(el.value).toBe("12a");
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Tutar sayıya çevrilemedi. Örnek: 14.800,00")).toBeTruthy();
  });
  it("AC-11: kirada stopaj ve KDV oranı ayraç almaz; ayarlardaki varsayılan stopaj oranı da", () => {
    formAc();
    tur(1);
    for (const ad of ["Stopaj oranı", "KDV oranı"]) {
      fireEvent.change(screen.getByLabelText(ad), { target: { value: "1500" } });
      expect(screen.getByLabelText(ad).value, ad).toBe("1500");
    }
    cleanup();
    render(<SettingsGider appSettings={{ giderAyarlari: { stopajOrani: 20 } }} setAppSettings={vi.fn()} serverPermissions={null} showToast={vi.fn()} />);
    const s = screen.getByLabelText("Varsayılan kira stopaj oranı");
    fireEvent.change(s, { target: { value: "1500" } });
    expect(s.value).toBe("1500");
  });
});

// AC-12: tutar alanı olan pencerelerin hepsi basamaklı görünür.
const TUR = [{ id: 1, ad: "Hammadde", davranis: "normal" }];
const turMap = turHaritasi(TUR);
const GIDER = [{ id: 1, tarih: "2026-09-01", turId: 1, tutar: 25000, kdvOrani: 20, tedarikciId: 10, sonOdemeTarihi: "2026-09-20", aciklama: "Sac", odendi: false }];
const HESAP = [{ id: 97, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, kapali: false }];
function KasaH() {
  const [hareketler, setHareketler] = useState([]);
  const odeme = { id: 100, customerId: 1, tarih: "2026-09-10", tutar: 30000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-10-15", tahsilEdildi: false };
  const cekler = [{ id: 200, paymentId: 100, no: "123456", banka: "Ziraat", kesideci: "Ali", tur: "hamiline", durum: "portfoy", gecmis: [] }];
  return <Kasa kasaHesaplari={HESAP} setKasaHesaplari={vi.fn()} hesapHareketleri={hareketler} setHesapHareketleri={setHareketler}
    payments={cekleriUygula([odeme], cekler)} customers={[{ id: 1, name: "Kutu Gıda" }]} giderler={odemeleriUygula(GIDER, hareketler, turMap)} giderTurleri={TUR}
    tedarikciler={[{ id: 10, ad: "Demir Bant" }]} calisanlar={[{ id: 21, ad: "Hasan" }]} cekler={cekler} setCekler={vi.fn()} giderAyarlari={{}} serverPermissions={null} showToast={vi.fn()} />;
}

describe("Spec 0045: AC-12 bütün tutar pencereleri", () => {
  it("AC-12: gider kalemi formu, ödeme penceresi, Kasa hesap formu, çalışan avansı ve çek ciro penceresi basamaklı", () => {
    formAc();
    tur(4);
    yaz(screen.getByLabelText("Tutar"), "25000");
    expect(screen.getByLabelText("Tutar").value).toBe("25.000");
    cleanup();
    render(<OdemeKayitPenceresi kalem={odemeleriUygula(GIDER, [], turMap)[0]} davranis="normal" turAd="Hammadde" turMap={turMap} hareketler={[]} odemeYetkisi bugun="2026-09-28"
      onKaydet={vi.fn()} onSil={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByLabelText("Ödeme tutarı").value).toBe("30.000"); // kalan ön dolu
    cleanup();
    render(<KasaH />);
    fireEvent.click(screen.getByText("Yeni Hesap"));
    yaz(screen.getByLabelText("Açılış bakiyesi"), "150000");
    expect(screen.getByLabelText("Açılış bakiyesi").value).toBe("150.000");
    fireEvent.click(screen.getByText("İptal"));
    fireEvent.click(screen.getByText("Avans Ver"));
    yaz(screen.getByLabelText("Avans tutarı"), "12500");
    expect(screen.getByLabelText("Avans tutarı").value).toBe("12.500");
    fireEvent.click(screen.getByText("İptal"));
    fireEvent.click(screen.getByRole("tab", { name: "Çek Portföyü" }));
    fireEvent.click(within(screen.getAllByTestId("cek-satiri")[0]).getByText("Ciro Et"));
    fireEvent.change(screen.getByDisplayValue("Tedarikçi seçin"), { target: { value: "10" } });
    expect(within(screen.getAllByTestId("ciro-kalemi")[0]).getByRole("textbox").value).toBe("30.000");
  });
});
