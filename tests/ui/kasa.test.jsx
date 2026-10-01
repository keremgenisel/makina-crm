// @vitest-environment jsdom
// Spec 0024 A: Kasa ekranı (hesaplar, yürüyen bakiye, virman, kapatma ve silme kuralları). Durumlu düzenek, gerçek bileşen.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Kasa } from "../../src/components/Kasa";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-28T10:00:00")); });

const TUR = [{ id: 4, ad: "Elektrik", davranis: "normal" }];
const TED = [{ id: 12, ad: "Bölge Elektrik" }];
const GIDER = [{ id: 7, tarih: "2026-09-01", turId: 4, tutar: 1000, kdvOrani: 20, tedarikciId: 12, aciklama: "Eylül faturası" }];
const MUSTERI = [{ id: 70, name: "Örnek Gıda" }];

function Harness({ h0 = [], m0 = [], p0 = [], perms = null, onState }) {
  const [kasaHesaplari, setKasaHesaplari] = useState(h0);
  const [hesapHareketleri, setHesapHareketleri] = useState(m0);
  onState?.({ kasaHesaplari, hesapHareketleri });
  return <Kasa kasaHesaplari={kasaHesaplari} setKasaHesaplari={setKasaHesaplari} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri}
    payments={p0} customers={MUSTERI} giderler={GIDER} giderTurleri={TUR} tedarikciler={TED} serverPermissions={perms} showToast={vi.fn()}
    giderAyarlari={{ denemeDonemiBitis: "" }} />; // spec 0056 ile güncellendi: 0024'ün koruması deneme dönemi kapalıyken sınanır
}
const hesap = (id, ad, o = {}) => ({ id, ad, tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: "2026-09-01", kapali: false, ...o });
const satirOf = (ad) => screen.getAllByTestId("hesap-satiri").find(s => s.textContent.includes(ad));

describe("Kasa: hesaplar (R1, C5)", () => {
  it("AC-1 / AC-33: hesap eklenir; ad zorunlu ve benzersiz; kredi kartı açılışı borç olarak görünür", () => {
    let st;
    render(<Harness h0={[hesap(1, "Ziraat")]} onState={s => { st = s; }} />);
    fireEvent.click(screen.getByText("Yeni Hesap"));
    fireEvent.click(screen.getByText("Kaydet"));
    expect(screen.getByText("Hesap adı girilmedi.")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText(/Merkez Kasa/), { target: { value: "ziraat" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(screen.getByText(/“ziraat” adında bir hesap zaten var/)).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText(/Merkez Kasa/), { target: { value: "Şirket Kartı" } });
    fireEvent.click(screen.getByRole("button", { name: "Kredi kartı" }));
    fireEvent.change(screen.getByLabelText("Açılış borcu"), { target: { value: "3.000" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st.kasaHesaplari[1]).toMatchObject({ ad: "Şirket Kartı", tur: "kart", paraBirimi: "TRY", acilisBakiyesi: -3000, kapali: false });
    expect(satirOf("Şirket Kartı").textContent).toMatch(/Borç\s*₺?3\.000/);
  });
  it("AC-8 / AC-9 / AC-10 / AC-11: bakiye açılış + tahsilat − ödeme; yürüyen bakiye tarih sırasıyla; tahsil edilmemiş çek girmez", () => {
    const m0 = [{ id: 51, tur: "odeme", tarih: "2026-09-10", tutar: 1200, hesapId: 1, giderId: 7, taksitId: null }];
    const p0 = [{ id: 61, customerId: 70, tarih: "2026-09-05", tutar: 5000, currency: "TRY", yontem: "Havale", hesapId: 1 },
      { id: 62, customerId: 70, tarih: "2026-09-06", tutar: 999, currency: "TRY", yontem: "Çek", tahsilEdildi: false, hesapId: 1 }];
    render(<Harness h0={[hesap(1, "Ziraat", { acilisBakiyesi: 10000 })]} m0={m0} p0={p0} />);
    expect(satirOf("Ziraat").textContent).toMatch(/13\.800/);
    const satirlar = within(screen.getByTestId("hesap-hareketleri")).getAllByTestId("hareket-satiri");
    expect(satirlar.map(s => s.textContent)).toEqual([
      expect.stringMatching(/05\/09\/2026Tahsilat.*Örnek Gıda.*15\.000/),
      expect.stringMatching(/10\/09\/2026Gider ödemesi.*Bölge Elektrik.*Eylül faturası.*13\.800/),
    ]);
  });
  it("AC-24: hareketi olan hesap silinemez, kapatılabilir; kapalı hesap listede kalır; hareketsiz hesap silinir", () => {
    let st;
    const m0 = [{ id: 51, tur: "odeme", tarih: "2026-09-10", tutar: 100, hesapId: 1, giderId: 7 }];
    render(<Harness h0={[hesap(1, "Ziraat"), hesap(2, "Boş Hesap")]} m0={m0} onState={s => { st = s; }} />);
    expect(within(satirOf("Ziraat")).queryByTitle("Sil")).toBeNull();
    expect(within(satirOf("Ziraat")).getByText("1 hareket")).toBeTruthy();
    fireEvent.click(within(satirOf("Ziraat")).getByText("Kapat"));
    expect(st.kasaHesaplari[0].kapali).toBe(true);
    expect(within(satirOf("Ziraat")).getByText("Kapalı")).toBeTruthy();
    fireEvent.click(within(satirOf("Boş Hesap")).getByTitle("Sil"));
    fireEvent.click(screen.getByText("Hesabı Sil"));
    expect(st.kasaHesaplari.map(h => h.id)).toEqual([1]);
  });
  it("C5: hareketi olan hesabın para birimi değiştirilemez", () => {
    render(<Harness h0={[hesap(1, "Ziraat")]} m0={[{ id: 51, tur: "odeme", tarih: "2026-09-10", tutar: 100, hesapId: 1, giderId: 7 }]} />);
    fireEvent.click(within(satirOf("Ziraat")).getByTitle("Düzenle"));
    expect(within(screen.getByTestId("hesap-formu")).getByDisplayValue("TL").disabled).toBe(true);
    expect(screen.getByText("Hareketi olan hesabın para birimi değiştirilemez.")).toBeTruthy();
  });
  it("AC-32 / R8: hesapsız ödemeler bakiyeye girmez ve notta sayılır", () => {
    const m0 = [{ id: 51, tur: "odeme", tarih: "2026-09-10", tutar: 100, hesapId: null, giderId: 7 },
      { id: 52, tur: "odeme", tarih: "2026-06-05", tamKapatir: true, hesapId: null, giderId: 7, kaynak: "goc" }];
    render(<Harness h0={[hesap(1, "Ziraat", { acilisBakiyesi: 500 })]} m0={m0} />);
    expect(screen.getByTestId("hesapsiz-odeme-satiri").textContent).toBe("Hesabı belirtilmemiş ödemeler: 2 (1 tanesi eski kayıtlardan aktarıldı)"); // spec 0044 AC-24: sayı ayrı satırda
    expect(satirOf("Ziraat").textContent).toMatch(/500/);
  });
  it("hesap yokken boş durum", () => {
    render(<Harness />);
    expect(screen.getByTestId("bos-kasa")).toBeTruthy();
  });
});

describe("Kasa: virman (R15)", () => {
  it("AC-12: virman bir hesaptan düşer, diğerine girer; gider ya da gelir değildir", () => {
    let st;
    render(<Harness h0={[hesap(1, "Ziraat", { acilisBakiyesi: 1000 }), hesap(2, "Merkez Kasa", { tur: "kasa" })]} onState={s => { st = s; }} />);
    fireEvent.click(screen.getByText("Virman"));
    const f = screen.getByTestId("virman-formu");
    fireEvent.change(within(f).getByDisplayValue("Ziraat (TRY)"), { target: { value: "2" } });
    fireEvent.change(within(f).getByDisplayValue("Hesap seçin"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Virman tutarı"), { target: { value: "400" } });
    fireEvent.click(screen.getByText("Virmanı Kaydet"));
    expect(st.hesapHareketleri).toEqual([expect.objectContaining({ tur: "virman", hesapId: 2, karsiHesapId: 1, tutar: 400 })]);
    expect(st.hesapHareketleri[0].giderId).toBeUndefined();
    expect(satirOf("Ziraat").textContent).toMatch(/1\.400/);
    expect(satirOf("Merkez Kasa").textContent).toMatch(/-400|−400/);
  });
  it("AC-30: giren hesap listesinde yalnız aynı para birimindeki açık hesaplar; tek hesapta virman düğmesi yok", () => {
    render(<Harness h0={[hesap(1, "Ziraat"), hesap(2, "Dolar Hesabı", { paraBirimi: "USD" }), hesap(3, "Kapalı TL", { kapali: true }), hesap(4, "Garanti")]} />);
    fireEvent.click(screen.getByText("Virman"));
    const f = screen.getByTestId("virman-formu");
    const giren = within(f).getByDisplayValue("Hesap seçin");
    expect([...giren.querySelectorAll("option")].map(o => o.textContent)).toEqual(["Hesap seçin", "Garanti (TRY)"]);
    cleanup();
    render(<Harness h0={[hesap(1, "Ziraat"), hesap(2, "Kapalı", { kapali: true })]} />);
    expect(screen.queryByText("Virman")).toBeNull();
  });
  it("C6: kasa_hesap ve virman izni olmayan kullanıcı yalnız görür", () => {
    const perms = { role: "user", permissions: JSON.stringify({ tabs: ["gider", "finance"], giderActions: ["gider_odeme"] }) };
    render(<Harness h0={[hesap(1, "Ziraat"), hesap(2, "Garanti")]} perms={perms} />);
    expect(screen.queryByText("Yeni Hesap")).toBeNull();
    expect(screen.queryByText("Virman")).toBeNull();
    expect(within(satirOf("Ziraat")).queryByText("Kapat")).toBeNull();
  });
});
