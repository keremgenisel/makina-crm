// @vitest-environment jsdom
// Spec 0042: personelin iki ödeme hedefi (arayüz). Gerçek Giderler bileşeni ve durumlu düzenek: liste rozeti, Ödeme
// planı, çok satırlı ödeme penceresinde Resmi/Elden, avanstan mahsupta hedef seçimi, borç özeti ayrıntısı.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Giderler } from "../../src/components/Giderler";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); });

const TURLER = [{ id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Elektrik", davranis: "normal" }];
const CAL = [{ id: 21, ad: "Hasan Çelik" }];
function Harness({ g0 = [], h0 = [], onState }) {
  const [giderler, setGiderler] = useState(g0);
  const [hesapHareketleri, setHesapHareketleri] = useState(h0);
  const [giderTanimlari, setGiderTanimlari] = useState([]);
  const [tedarikciler, setTedarikciler] = useState([]);
  const [standartGiderler, setStandartGiderler] = useState([]);
  onState?.({ giderler, hesapHareketleri });
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri} giderTanimlari={giderTanimlari} setGiderTanimlari={setGiderTanimlari}
    giderTurleri={TURLER} tedarikciler={tedarikciler} setTedarikciler={setTedarikciler} standartGiderler={standartGiderler} setStandartGiderler={setStandartGiderler}
    calisanlar={CAL} standardModels={[]} customModels={[]} appSettings={{ giderAyarlari: { yururlukAy: "2026-06" } }} serverPermissions={null}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
}
const satir = (id, hedef, tutar) => ({ id, hedef, sira: 1, vade: "2026-09-30", tutar, odendi: false, odemeTarihi: null });
// Resmi 30.000 (ana) + elden 20.000: iki hedefli, satırlı personel kalemi.
const P = { id: 610, tarih: "2026-09-10", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 20000, sonOdemeTarihi: "2026-09-30",
  taksitler: [satir(1, "ana", 30000), satir(2, "elden", 20000)] };
const liste = () => screen.getByTestId("kalem-listesi");
const personelAc = () => fireEvent.click(within(liste()).getByText(/Çalışanları göster/));
const satirOf = () => within(liste()).getByText("Hasan Çelik").closest("tr");
// Spec 0053 plan Q5: Ödeme Planı satırından açılan pencere o satırın hedefine iner (0 = Resmi, 1 = Elden).
const pencereAc = (i = 0) => {
  if (!screen.queryByText("Hasan Çelik")) personelAc();
  fireEvent.click(within(satirOf()).getByText("Ödeme planı"));
  const dugmeler = within(screen.getByTestId("odeme-plani-satirlari")).getAllByText("Ödeme gir");
  fireEvent.click(i === 1 ? dugmeler[dugmeler.length - 1] : dugmeler[0]);
  return screen.getByTestId("odeme-kayit-penceresi");
};
const degis = (el, value) => fireEvent.change(el, { target: { value } });
const secenekler = (el) => [...el.querySelectorAll("option")].map(o => o.textContent.split(" · ")[0]);

describe("Spec 0042: iki hedefli personel arayüzü", () => {
  it("AC-4: yalnız resmi ödenince listede 'Kısmen ödendi 1/2'; Ödeme planında hedefler Resmi ve Elden adıyla", () => {
    render(<Harness g0={[P]} h0={[{ id: 1, tur: "odeme", tarih: "2026-09-20", tutar: 30000, yontem: "Havale", giderId: 610, taksitId: 1 }]} />);
    personelAc();
    expect(within(satirOf()).getByText("Kısmen ödendi 1/2")).toBeTruthy();
    fireEvent.click(within(satirOf()).getByText("Ödeme planı"));
    const plan = screen.getByTestId("odeme-plani-satirlari");
    expect(plan.textContent).toMatch(/Resmi · ödendi/);
    expect(plan.textContent).toMatch(/Elden · ödenmedi/);
  });
  // Spec 0053 Q5/R17: pencere bir hedefe iner; iki hedef iki pencereden (ya da tek kayıtta düzenleme formundan, R15) ödenir.
  it("AC-21 / AC-3: iki hedef (Resmi, Elden) iki yöntemle; her pencere kendi hedefini çizer", () => {
    let st;
    render(<Harness g0={[P]} onState={s => { st = s; }} />);
    let p = pencereAc(0);
    expect(p.textContent).not.toMatch(/Elden/);
    degis(within(p).getByLabelText("Ödeme yöntemi"), "Havale");
    fireEvent.click(screen.getByText("Ödemeyi Kaydet"));
    p = pencereAc(1);
    expect(within(p).getByLabelText("Ödeme tutarı").value).toBe("20.000"); // spec 0045 R1: görünüm binlik noktalı
    degis(within(p).getByLabelText("Ödeme yöntemi"), "Nakit");
    fireEvent.click(screen.getByText("Ödemeyi Kaydet"));
    expect(st.hesapHareketleri.map(h => [h.taksitId, h.tutar, h.yontem])).toEqual([[1, 30000, "Havale"], [2, 20000, "Nakit"]]);
    expect(within(satirOf()).getByText(/^Ödendi/)).toBeTruthy(); // AC-5
  });
  it("AC-20: tutar seçili hedefin (Elden) kalanını aşamaz", () => {
    let st;
    render(<Harness g0={[P]} onState={s => { st = s; }} />);
    const p = pencereAc(1);
    degis(within(p).getByLabelText("Ödeme tutarı"), "25.000");
    fireEvent.click(screen.getByText("Ödemeyi Kaydet"));
    expect(st.hesapHareketleri).toEqual([]);
    expect(p.textContent).toMatch(/Kalandan fazla ödeme kaydedilemez \(kalan 20\.000,00 ₺\)/);
  });
  it("AC-22: avanstan mahsup pencerenin hedefine (Elden) bağlanır; avans sınırı değişmez", () => {
    let st;
    render(<Harness g0={[P]} h0={[{ id: 9, tur: "avans", tarih: "2026-09-01", tutar: 5000, calisanId: 21, hesapId: null }]} onState={s => { st = s; }} />);
    const p = pencereAc(1);
    fireEvent.click(within(p).getByRole("button", { name: "Avanstan mahsup" }));
    // Spec 0053 R27: mahsup tek satır; pencere tek hedefe indiği için yer seçicisi çizilmez.
    expect(within(p).queryByLabelText("Mahsup bölümü")).toBeNull();
    degis(within(p).getByLabelText("Ödeme tutarı"), "6.000");
    fireEvent.click(screen.getByText("Mahsubu Kaydet"));
    expect(p.textContent).toMatch(/Açık avans borcundan fazla mahsup edilemez/);
    degis(within(p).getByLabelText("Ödeme tutarı"), "5.000");
    fireEvent.click(screen.getByText("Mahsubu Kaydet"));
    expect(st.hesapHareketleri.find(h => h.tur === "mahsup")).toMatchObject({ taksitId: 2, tutar: 5000 });
  });
  it("AC-8: borç özetinde resmi/elden kırılımı varsayılan kapalı, adlar açılınca görünür", () => {
    render(<Harness g0={[P]} />);
    const b = screen.getByTestId("borc-ozeti");
    expect(within(b).queryByTestId("calisan-hedef-kirilimi")).toBeNull();
    fireEvent.click(within(b).getByText(/Adları göster/));
    expect(within(b).getByTestId("calisan-hedef-kirilimi").textContent).toBe("Resmi 30.000 ₺ · Elden 20.000 ₺");
  });
});
