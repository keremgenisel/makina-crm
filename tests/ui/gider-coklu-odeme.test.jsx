// @vitest-environment jsdom
// Spec 0041: bir giderin birden çok ödeme yöntemiyle ödenmesi (arayüz). Gerçek Giderler bileşeni ve durumlu düzenek:
// ödeme penceresinde çok satır, listede türetilen yöntem, Dönem Raporu'nda yöntem kırılımı kartı.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Giderler } from "../../src/components/Giderler";
import { GOC_YONTEM_NOTU } from "../../src/lib/odemeYontemi";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); });

const TURLER = [{ id: 1, ad: "Fabrika kirası", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Elektrik", davranis: "normal" }];
const TED = [{ id: 12, ad: "Bölge Elektrik" }];
const CAL = [{ id: 21, ad: "Hasan Çelik" }];
const HESAPLAR = [{ id: 1, ad: "Merkez Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 0 }, { id: 2, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0 }];
function Harness({ g0 = [], h0 = [], onState }) {
  const [giderler, setGiderler] = useState(g0);
  const [hesapHareketleri, setHesapHareketleri] = useState(h0);
  const [giderTanimlari, setGiderTanimlari] = useState([]);
  const [tedarikciler, setTedarikciler] = useState(TED);
  const [standartGiderler, setStandartGiderler] = useState([]);
  onState?.({ giderler, hesapHareketleri });
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri} giderTanimlari={giderTanimlari} setGiderTanimlari={setGiderTanimlari}
    giderTurleri={TURLER} tedarikciler={tedarikciler} setTedarikciler={setTedarikciler} standartGiderler={standartGiderler} setStandartGiderler={setStandartGiderler}
    calisanlar={CAL} standardModels={[]} customModels={[]} appSettings={{ giderAyarlari: { yururlukAy: "2026-06", stopajOrani: 20 } }} serverPermissions={null}
    kasaHesaplari={HESAPLAR} kasaYetki
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
}
// 10.000 + %20 = 12.000 ödenecek; varsayılan yöntem Havale.
const KALEM = { id: 601, tarih: "2026-09-10", turId: 4, tutar: 10000, kdvOrani: 20, tedarikciId: 12, aciklama: "Kompresör", odemeYontemi: "Havale" };
const sat = (id, sira, vade, tutar) => ({ id, hedef: "ana", sira, vade, tutar, odendi: false, odemeTarihi: null });
const TAKSITLI = { id: 602, tarih: "2026-09-10", turId: 4, tutar: 6000, kdvOrani: 0, tedarikciId: 12, aciklama: "Pres", sonOdemeTarihi: "2026-09-15",
  taksitler: [sat(1, 1, "2026-09-15", 2000), sat(2, 2, "2026-10-15", 2000), sat(3, 3, "2026-11-15", 2000)] };
const od = (id, tutar, yontem, o = {}) => ({ id, tur: "odeme", tarih: "2026-09-12", tutar, yontem, hesapId: null, giderId: 601, ...o });
const liste = () => screen.getByTestId("kalem-listesi");
const satirOf = (metin) => within(liste()).getByText(metin).closest("tr");
const pencereAc = (metin) => { fireEvent.click(within(satirOf(metin)).getByTitle(/Ödeme kaydet|Ödemeleri görüntüle/)); return screen.getByTestId("odeme-kayit-penceresi"); };
const pencereAcPlan = (metin) => {
  fireEvent.click(within(satirOf(metin)).getByText("Ödeme planı"));
  fireEvent.click(within(screen.getByTestId("odeme-plani-satirlari")).getAllByText("Ödeme gir")[0]);
  return screen.getByTestId("odeme-kayit-penceresi");
};
const degis = (el, value) => fireEvent.change(el, { target: { value } });

describe("Spec 0041: çok satırlı ödeme penceresi (R5, R6, R12–R14)", () => {
  it("AC-1 / AC-2 / AC-7 / AC-25: iki satır tek kayıtta iki hareket; varsayılan yöntem ön seçili, ikinci satır kalanla dolu; tarih tek, açıklama satırda", () => {
    let st;
    render(<Harness g0={[KALEM]} onState={s => { st = s; }} />);
    const p = pencereAc("Kompresör");
    // Spec 0053 R2, R23 (AC-39): ön yöntem son kullanılan ödemeden gelir; kalemin eski yöntem alanı (Havale) artık okunmaz.
    // Bu kalemin hiç ödemesi olmadığı için boştur ("Belirtilmemiş"). 0041 AC-7'nin "kalemin varsayılanı" beklentisi böyle değişti.
    expect(within(p).getByLabelText("Ödeme yöntemi").value).toBe("");
    degis(within(p).getByLabelText("Ödeme tutarı"), "7.000");
    degis(within(p).getByLabelText("Ödeme yöntemi"), "Nakit");
    degis(within(p).getByLabelText("Hesap"), "1");
    fireEvent.click(within(p).getByText(/Başka yöntemle satır ekle/));
    expect(within(p).getByLabelText("Ödeme tutarı 2").value).toBe("5.000"); // spec 0045 R1: görünüm binlik noktalı
    degis(within(p).getByLabelText("Ödeme yöntemi 2"), "Kredi Kartı");
    degis(within(p).getByLabelText("Açıklama 2"), "karttan");
    expect(within(p).getAllByLabelText(/Ödeme tarihi/)).toHaveLength(1);
    fireEvent.click(screen.getByText("Ödemeyi Kaydet"));
    expect(st.hesapHareketleri.map(h => [h.tutar, h.yontem, h.tarih, h.aciklama])).toEqual([[7000, "Nakit", "2026-09-23", ""], [5000, "Kredi Kartı", "2026-09-23", "karttan"]]);
    expect(within(satirOf("Kompresör")).getByText(/^Ödendi/)).toBeTruthy(); // kalan sıfır
  });
  it("AC-3 / AC-24: satırların toplamı kalanı aşarsa hiçbir hareket yazılmaz, pencere açık kalır, hata görünür", () => {
    let st;
    render(<Harness g0={[KALEM]} onState={s => { st = s; }} />);
    const p = pencereAc("Kompresör");
    degis(within(p).getByLabelText("Ödeme tutarı"), "7.000");
    fireEvent.click(within(p).getByText(/Başka yöntemle satır ekle/));
    degis(within(p).getByLabelText("Ödeme tutarı 2"), "6.000");
    fireEvent.click(screen.getByText("Ödemeyi Kaydet"));
    expect(st.hesapHareketleri).toEqual([]);
    expect(screen.getByTestId("odeme-kayit-penceresi").textContent).toMatch(/satırların toplamı kalemin kalanını aşıyor/); // spec 0053 R6: hedefin adıyla
    cleanup();
    render(<Harness g0={[KALEM]} onState={s => { st = s; }} />);
    const p2 = pencereAc("Kompresör");
    fireEvent.click(within(p2).getByText(/Başka yöntemle satır ekle/));
    degis(within(p2).getByLabelText("Ödeme tutarı 2"), "abc");
    fireEvent.click(screen.getByText("Ödemeyi Kaydet"));
    expect(st.hesapHareketleri).toEqual([]);
    expect(within(screen.getAllByTestId("odeme-satiri")[1]).getByText(/sayıya çevrilemedi/)).toBeTruthy();
  });
  it("AC-3 / AC-10: taksitli kalemde aynı taksidi aşan iki satır hedef adıyla reddedilir; iki farklı taksite satır kaydedilir", () => {
    let st;
    render(<Harness g0={[TAKSITLI]} onState={s => { st = s; }} />);
    let p = pencereAcPlan("Pres");
    degis(within(p).getByLabelText("Ödeme tutarı"), "1.500");
    fireEvent.click(within(p).getByText(/Başka yöntemle satır ekle/));
    degis(within(p).getByLabelText("Ödeme tutarı 2"), "1.000");
    fireEvent.click(screen.getByText("Ödemeyi Kaydet"));
    expect(st.hesapHareketleri).toEqual([]);
    expect(screen.getByTestId("odeme-kayit-penceresi").textContent).toMatch(/Tedarikçiye 1\/3\. taksit için girilen toplam kalanı aşıyor \(kalan 2\.000,00 ₺\)/);
    degis(within(p).getByLabelText("Taksit 2"), "2");
    expect(within(p).getByLabelText("Ödeme tutarı 2").value).toBe("2.000"); // spec 0045 R1: görünüm binlik noktalı
    fireEvent.click(screen.getByText("Ödemeyi Kaydet"));
    expect(st.hesapHareketleri.map(h => [h.taksitId, h.tutar])).toEqual([[1, 1500], [2, 2000]]);
  });
  it("AC-22: tutarı boş satır atılır; 10 satırdan fazlası eklenemez", () => {
    let st;
    render(<Harness g0={[KALEM]} onState={s => { st = s; }} />);
    const p = pencereAc("Kompresör");
    degis(within(p).getByLabelText("Ödeme tutarı"), "1.000");
    for (let i = 0; i < 12; i++) fireEvent.click(within(p).getByText(/Başka yöntemle satır ekle/));
    expect(within(p).getAllByTestId("odeme-satiri")).toHaveLength(10);
    expect(within(p).getByText(/En çok 10 satır/)).toBeTruthy();
    for (let i = 2; i <= 10; i++) degis(within(p).getByLabelText(`Ödeme tutarı ${i}`), "");
    fireEvent.click(screen.getByText("Ödemeyi Kaydet"));
    expect(st.hesapHareketleri.map(h => h.tutar)).toEqual([1000]);
  });
  // Spec 0053 R10, R14: çek yöntemleri satırın yöntemidir ve yalnız kasa yetkisiyle çizilir; eski "Çek Portföyü'nden ciro edin"
  // yönlendirmesi ve "Kendi çekiyle öde" düğmesi kalktı. Bu harness kasa yetkisi vermez.
  it("AC-11: kasa yetkisi yokken yöntem listesinde 'Çek (ciro)' ve 'Çek (kendi)' yok; eski yönlendirme ve düğme yok", () => {
    render(<Harness g0={[KALEM]} />);
    const p = pencereAc("Kompresör");
    expect([...within(p).getByLabelText("Ödeme yöntemi").querySelectorAll("option")].map(o => o.value)).not.toContain("Çek (ciro)");
    expect([...within(p).getByLabelText("Ödeme yöntemi").querySelectorAll("option")].map(o => o.value)).not.toContain("Çek (kendi)");
    expect(p.textContent).not.toMatch(/Kasa › Çek Portföyü'nden çeki ciro edin|Kendi çekiyle öde/);
  });
  it("AC-21: 'Avanstan mahsup' kipi tek satırlıdır (satır ekleme yok)", () => {
    const P = { id: 610, tarih: "2026-09-10", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 0 };
    render(<Harness g0={[P]} h0={[{ id: 1, tur: "avans", tarih: "2026-09-01", tutar: 5000, calisanId: 21, hesapId: null }]} />);
    fireEvent.click(within(liste()).getByText(/Çalışanları göster/));
    const p = pencereAc("Hasan Çelik");
    expect(within(p).getByText(/Başka yöntemle satır ekle/)).toBeTruthy();
    fireEvent.click(within(p).getByRole("button", { name: "Avanstan mahsup" }));
    expect(within(p).queryByText(/Başka yöntemle satır ekle/)).toBeNull();
    expect(within(p).queryByLabelText("Ödeme yöntemi")).toBeNull();
  });
});

describe("Spec 0041: türetilen yöntem listede ve pencerede (R3, R4, R11, R15)", () => {
  it("AC-16 / AC-17: ödemesi olmayan kalemde yöntem yazmaz; kalemin varsayılan alanı listede gösterilmez", () => {
    render(<Harness g0={[KALEM]} />);
    expect(within(satirOf("Kompresör")).queryByTestId("kalem-yontem")).toBeNull();
    expect(within(satirOf("Kompresör")).queryByText(/Havale|Belirtilmemiş/)).toBeNull();
  });
  it("AC-4: tek yöntemle ödenen kalemde o yöntem yazar", () => {
    render(<Harness g0={[KALEM]} h0={[od(1, 12000, "Nakit")]} />);
    expect(within(satirOf("Kompresör")).getByTestId("kalem-yontem").textContent).toBe("Nakit");
  });
  it("AC-5 / AC-6 / AC-8: iki yöntemle ödenen kalemde 'Karma' ve kırılım; pencerede her ödemenin yöntemi ve tutarı", () => {
    render(<Harness g0={[{ ...KALEM, odemeYontemi: "Çek" }]} h0={[od(1, 7000, "Nakit"), od(2, 5000, "Kredi Kartı")]} />);
    const s = satirOf("Kompresör");
    expect(within(s).getByTestId("kalem-yontem").textContent).toBe("Karma");
    expect(within(s).getByTestId("kalem-yontem-kirilimi").textContent).toBe("Nakit 7.000 ₺ · Kredi Kartı 5.000 ₺");
    const p = pencereAc("Kompresör");
    expect(within(p).getByTestId("odeme-yontem-kirilimi").textContent).toMatch(/Karma.*Nakit 7\.000 ₺.*Kredi Kartı 5\.000 ₺/);
    expect(within(p).getAllByTestId("odeme-kaydi").map(e => e.textContent)).toEqual([expect.stringMatching(/Nakit.*7\.000 ₺/), expect.stringMatching(/Kredi Kartı.*5\.000 ₺/)]);
  });
  it("AC-9 / AC-18 / AC-19: göçten gelen tutarsız hareket kapattığı tutarla 'Belirtilmemiş' satırında; göç notu", () => {
    render(<Harness g0={[KALEM]} h0={[od(1, 2000, "Nakit"), od(2, null, null, { tamKapatir: true, kaynak: "goc", tarih: "2026-09-13" })]} />);
    expect(within(satirOf("Kompresör")).getByTestId("kalem-yontem-kirilimi").textContent).toBe("Belirtilmemiş 10.000 ₺ · Nakit 2.000 ₺");
    const p = pencereAc("Kompresör");
    expect(within(p).getByTestId("goc-yontem-notu").textContent).toBe(GOC_YONTEM_NOTU);
    expect(within(p).getAllByTestId("odeme-kaydi")[1].textContent).toMatch(/10\.000 ₺/);
  });
  it("AC-20: avanstan mahsup kırılımda ayrı satır ve Karma sayılır", () => {
    const P = { id: 610, tarih: "2026-09-10", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: 3000, eldenTutar: 0 };
    render(<Harness g0={[P]} h0={[{ id: 1, tur: "odeme", tarih: "2026-09-12", tutar: 2000, yontem: "Nakit", giderId: 610 }, { id: 2, tur: "mahsup", tarih: "2026-09-12", tutar: 1000, giderId: 610, calisanId: 21 }]} />);
    fireEvent.click(within(liste()).getByText(/Çalışanları göster/));
    const s = satirOf("Hasan Çelik");
    expect(within(s).getByTestId("kalem-yontem").textContent).toBe("Karma");
    expect(within(s).getByTestId("kalem-yontem-kirilimi").textContent).toBe("Nakit 2.000 ₺ · Avanstan mahsup 1.000 ₺");
  });
});

describe("Spec 0041: Dönem Raporu yöntem kırılımı (R10, R18)", () => {
  const P = { id: 610, tarih: "2026-09-10", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: 3000, eldenTutar: 0 };
  const H = [od(1, 7000, "Nakit"), od(2, 5000, "Kredi Kartı"), { id: 3, tur: "odeme", tarih: "2026-09-12", tutar: 3000, yontem: "Nakit", giderId: 610 }];
  it("AC-12 / AC-26: kart yöntem bazında tutarları gösterir; personel ödemeleri ayrıntı kapalıyken tek satır, açılınca yöntemlere dağılır", () => {
    render(<Harness g0={[KALEM, P]} h0={H} />);
    const k = screen.getByTestId("yontem-kirilimi");
    expect(within(k).getAllByTestId("yontem-kirilimi-satiri").map(e => e.textContent)).toEqual(["Nakit7.000 ₺", "Kredi Kartı5.000 ₺"]);
    expect(within(k).getByTestId("yontem-kirilimi-personel").textContent).toBe("Personel ödemeleri3.000 ₺");
    expect(k.textContent).toMatch(/Toplam ödenen15\.000 ₺/);
    fireEvent.click(within(k).getByText(/Personel ödemelerini yöntemlere dağıt/));
    expect(within(k).queryByTestId("yontem-kirilimi-personel")).toBeNull();
    expect(within(k).getAllByTestId("yontem-kirilimi-satiri").map(e => e.textContent)).toEqual(["Nakit10.000 ₺", "Kredi Kartı5.000 ₺"]);
  });
});
