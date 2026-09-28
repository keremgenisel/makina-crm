// @vitest-environment jsdom
// Spec 0040: Kasa › Çek Portföyü; ciro, karşılıksız, ciro iptali, geçmiş (gerçek bileşen, durumlu düzenek).
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Kasa } from "../../src/components/Kasa";
import { OdemeKayitPenceresi } from "../../src/components/gider/OdemeKayitPenceresi";
import { cekleriUygula } from "../../src/lib/cek";
import { odemeleriUygula, turHaritasi } from "../../src/lib/gider";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-28T10:00:00")); });

const TUR = [{ id: 1, ad: "Hammadde", davranis: "normal" }];
const turMap = turHaritasi(TUR);
const TED = [{ id: 10, ad: "Demir Bant" }];
const MUSTERI = [{ id: 1, name: "Kutu Gıda" }];
const HESAP = [{ id: 97, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, kapali: false }];
const odeme = (id, tutar, o = {}) => ({ id, customerId: 1, tarih: "2026-09-10", tutar, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-10-15", tahsilEdildi: false, ...o });
const cek = (id, paymentId, no, o = {}) => ({ id, paymentId, no, banka: "Ziraat", kesideci: "Ali", tur: "hamiline", durum: "portfoy", gecmis: [{ tarih: "2026-09-10", durum: "portfoy", not: "Alındı" }], ...o });
// 5.000 + %20 = 6.000 ve 4.000 + %20 = 4.800; ikisi Demir Bant.
const GIDER = [{ id: 1, tarih: "2026-09-01", turId: 1, tutar: 5000, kdvOrani: 20, tedarikciId: 10, sonOdemeTarihi: "2026-09-20", aciklama: "Sac", odendi: false },
  { id: 2, tarih: "2026-09-05", turId: 1, tutar: 4000, kdvOrani: 20, tedarikciId: 10, sonOdemeTarihi: "2026-09-25", aciklama: "Bant", odendi: false }];

function H({ c0 = [cek(200, 100, "123456")], p0 = [odeme(100, 12000)], h0 = [], perms = null, onState }) {
  const [cekler, setCekler] = useState(c0);
  const [hareketler, setHareketler] = useState(h0);
  onState?.({ cekler, hareketler });
  return <Kasa kasaHesaplari={HESAP} setKasaHesaplari={vi.fn()} hesapHareketleri={hareketler} setHesapHareketleri={setHareketler}
    payments={cekleriUygula(p0, cekler)} customers={MUSTERI} giderler={odemeleriUygula(GIDER, hareketler, turMap)} giderTurleri={TUR} tedarikciler={TED}
    calisanlar={[]} cekler={cekler} setCekler={setCekler} giderAyarlari={{ hatirlatmaEsikGun: 7 }} serverPermissions={perms} showToast={vi.fn()} />;
}
const portfoy = () => fireEvent.click(screen.getByRole("tab", { name: "Çek Portföyü" }));
const satir = (no) => screen.getAllByTestId("cek-satiri").find(s => s.textContent.includes(no));
const ciroAc = (no = "123456") => { fireEvent.click(within(satir(no)).getByText("Ciro Et")); fireEvent.change(screen.getByDisplayValue("Tedarikçi seçin"), { target: { value: "10" } }); };

describe("Spec 0040: portföy ekranı (R10)", () => {
  it("AC-3 / AC-4 / AC-5: elde çekler vade sırasıyla ve toplamıyla; vadesi geçmiş işaretli; tür ve durum süzgeci", () => {
    render(<H c0={[cek(200, 100, "123456"), cek(201, 101, "777", { tur: "resmi" }), cek(202, 102, "888", { durum: "tahsil" })]}
      p0={[odeme(100, 12000), odeme(101, 3000, { vadeTarihi: "2026-09-20" }), odeme(102, 500)]} />);
    portfoy();
    expect(screen.getAllByTestId("cek-satiri").map(s => s.textContent.match(/(777|123456|888)/)[1])).toEqual(["777", "123456"]);
    expect(within(satir("777")).getByText("Vadesi geçti")).toBeTruthy();
    expect(screen.getByTestId("portfoy-toplam").textContent).toMatch(/15\.000/);
    fireEvent.change(screen.getByLabelText("Çek türü süzgeci"), { target: { value: "resmi" } });
    expect(screen.getAllByTestId("cek-satiri")).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Çek türü süzgeci"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Tahsil edildi" }));
    expect(screen.getAllByTestId("cek-satiri").map(s => s.textContent.includes("888"))).toEqual([true]);
  });
});

describe("Spec 0040: ciro (R4–R9)", () => {
  it("AC-6 / AC-7 / AC-12 / AC-17: tam ciro hatırlatması; ciro iki kalemi iki hesapsız hareketle kapatır, çek listeden çıkar", () => {
    let st;
    render(<H p0={[odeme(100, 10800)]} onState={s => { st = s; }} />);
    portfoy();
    ciroAc();
    expect(screen.getByTestId("tam-ciro-notu").textContent).toMatch(/tam ciro/);
    expect(screen.getAllByTestId("ciro-kalemi")).toHaveLength(2);
    fireEvent.click(within(screen.getByTestId("ciro-penceresi").closest("div[style]").parentElement).getAllByText("Ciro Et").pop());
    expect(st.hareketler).toEqual([
      expect.objectContaining({ giderId: 1, tutar: 6000, cekId: 200, hesapId: null, yontem: "Çek (ciro)" }),
      expect.objectContaining({ giderId: 2, tutar: 4800, cekId: 200, hesapId: null }),
    ]);
    expect(st.cekler[0]).toMatchObject({ durum: "ciro" });
    expect(screen.getByTestId("bos-cek-portfoyu")).toBeTruthy();
  });
  it("AC-13: fark uyarı olarak görünür ve ciroyu engellemez", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    portfoy();
    ciroAc();
    expect(screen.getByTestId("ciro-fark").textContent).toMatch(/1\.200/);
    fireEvent.click(screen.getAllByText("Ciro Et").pop());
    expect(st.cekler[0].durum).toBe("ciro");
    expect(st.hareketler.reduce((a, h) => a + h.tutar, 0)).toBe(10800);
  });
  it("AC-29: TL dışı çekte ciro düğmesi kapalı ve nedeni yazılı", () => {
    render(<H p0={[odeme(100, 1000, { currency: "USD" })]} />);
    portfoy();
    expect(within(satir("123456")).getByText("Ciro Et").closest("button").disabled).toBe(true);
    expect(satir("123456").textContent).toMatch(/yalnız TL çek/);
  });
  it("AC-34: gider_odeme izni olmayan kullanıcıda Ciro Et düğmesi yok", () => {
    render(<H perms={{ role: "user", permissions: JSON.stringify({ tabs: ["gider", "finance"], giderActions: ["gider_edit"] }) }} />);
    portfoy();
    expect(within(satir("123456")).queryByText("Ciro Et")).toBeNull();
  });
});

describe("Spec 0040: durum, karşılıksız, ciro iptali, geçmiş (R3, R11, R12, R15)", () => {
  const ciroluCek = cek(200, 100, "123456", { durum: "ciro", gecmis: [{ tarih: "2026-09-10", durum: "portfoy", not: "Alındı" }, { tarih: "2026-10-02", durum: "ciro", not: "Ciro: Demir Bant" }] });
  const ciroH = [{ id: 900, tur: "odeme", tarih: "2026-10-02", tutar: 6000, giderId: 1, hesapId: null, cekId: 200, yontem: "Çek (ciro)" }];
  const ciroluAc = () => { portfoy(); fireEvent.click(screen.getByRole("button", { name: "Ciro edildi" })); };
  it("AC-26: ciro edilmiş çekte 'tahsil edildi' nedeni yazan hatayla reddedilir, durum değişmez", () => {
    let st;
    render(<H c0={[ciroluCek]} h0={ciroH} onState={s => { st = s; }} />);
    ciroluAc();
    fireEvent.click(within(satir("123456")).getByText("Durum"));
    fireEvent.click(within(screen.getByTestId("cek-durum-penceresi")).getByRole("button", { name: "Tahsil edildi" }));
    expect(screen.getByText(/Ciro edilmiş çek tahsil edildi yapılamaz/)).toBeTruthy();
    expect(st.cekler[0].durum).toBe("ciro");
  });
  it("AC-15 / AC-28: ciro edilmiş çek karşılıksız: hareketler silinir, çek karşılıksız olur", () => {
    let st;
    render(<H c0={[ciroluCek]} h0={ciroH} onState={s => { st = s; }} />);
    ciroluAc();
    fireEvent.click(within(satir("123456")).getByText("Durum"));
    fireEvent.click(within(screen.getByTestId("cek-durum-penceresi")).getByRole("button", { name: "Karşılıksız" }));
    fireEvent.click(screen.getByText("Karşılıksız İşaretle"));
    expect(st.hareketler).toEqual([]);
    expect(st.cekler[0].durum).toBe("karsiliksiz");
    expect(st.cekler[0].gecmis.at(-1).not).toBe("Karşılıksız, ciro geri alındı");
  });
  it("AC-27: ciro iptali hareketleri siler ve çeki portföye döndürür", () => {
    let st;
    render(<H c0={[ciroluCek]} h0={ciroH} onState={s => { st = s; }} />);
    ciroluAc();
    fireEvent.click(within(satir("123456")).getByText("Durum"));
    fireEvent.click(within(screen.getByTestId("cek-durum-penceresi")).getByRole("button", { name: "Ciroyu İptal Et" }));
    fireEvent.click(screen.getAllByText("Ciroyu İptal Et").pop());
    expect(st.hareketler).toEqual([]);
    expect(st.cekler[0].durum).toBe("portfoy");
  });
  it("AC-16 / AC-35: geçmiş kimden alındığını, durum değişikliklerini ve ciro ile kapatılan kalemleri gösterir", () => {
    render(<H c0={[ciroluCek]} h0={ciroH} />);
    ciroluAc();
    fireEvent.click(within(satir("123456")).getByText("Geçmiş"));
    const g = screen.getByTestId("cek-gecmisi");
    expect(g.textContent).toMatch(/Kimden: Kutu Gıda/);
    expect(within(g).getAllByTestId("cek-gecmis-satiri").map(s => s.textContent)).toEqual([
      expect.stringMatching(/10\/09\/2026Portföyde.*Alındı/), expect.stringMatching(/02\/10\/2026Ciro edildi.*Ciro: Demir Bant/),
    ]);
    expect(within(g).getByTestId("cek-ciro-kalemleri").textContent).toMatch(/Sac.*6\.000/);
  });
  it("Q9 / AC-37: ödeme penceresinde ciro hareketi silinemez; yöntem listesinde 'Çek (ciro)' yok", () => {
    const kalem = odemeleriUygula(GIDER, ciroH, turMap)[0];
    render(<OdemeKayitPenceresi kalem={kalem} davranis="normal" turAd="Hammadde" turMap={turMap} hareketler={ciroH} odemeYetkisi bugun="2026-09-28"
      onKaydet={vi.fn()} onSil={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByTestId("ciro-hareketi")).toBeTruthy();
    expect(within(screen.getByTestId("odeme-kayit-listesi")).queryByTitle("Ödemeyi sil")).toBeNull();
  });
  it("AC-37: kalanı olan kalemin ödeme penceresinde yöntem listesi 'Çek (ciro)' içermez; düz 'Çek' ipucu verir", () => {
    const kalem = odemeleriUygula(GIDER, [], turMap)[0];
    render(<OdemeKayitPenceresi kalem={kalem} davranis="normal" turAd="Hammadde" turMap={turMap} hareketler={[]} odemeYetkisi bugun="2026-09-28"
      onKaydet={vi.fn()} onSil={vi.fn()} onClose={vi.fn()} />);
    const sec = screen.getByLabelText("Ödeme yöntemi");
    expect([...sec.querySelectorAll("option")].map(o => o.value)).not.toContain("Çek (ciro)");
    fireEvent.change(sec, { target: { value: "Çek" } });
    expect(screen.getByText(/Düz “Çek” takip edilmeyen bir nottur/)).toBeTruthy();
  });
});
