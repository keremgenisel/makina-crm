// @vitest-environment jsdom
// Spec 0054: ek ödeme maaştan ayrı bir ödeme hedefi (arayüz). Gerçek Giderler bileşeni ve durumlu düzenek: düzenleme formunda
// ödenmiş maaşa prim eklenmesi (Intent), ek hedefin formdan ve pencereden ödenmesi, bölünmezlik nedeni, adlar, vade alanları.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { Giderler } from "../../src/components/Giderler";
import { odemeleriUygula, odemeDurumu, turHaritasi, PERSONEL_EK_BOLUNMEZ_NEDENI } from "../../src/lib/gider";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); });

const TURLER = [{ id: 3, ad: "Personel", davranis: "personel" }];
const turMap = turHaritasi(TURLER);
const CAL = [{ id: 21, ad: "Hasan Çelik", resmiMaliyet: 30000 }];
const HESAP = [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, kapali: false }];

function H({ g0 = [], h0 = [], onState }) {
  const [giderler, setGiderler] = useState(g0);
  const [hesapHareketleri, setHesapHareketleri] = useState(h0);
  const [giderTanimlari, setGiderTanimlari] = useState([]);
  const [tedarikciler, setTedarikciler] = useState([]);
  const [standartGiderler, setStandartGiderler] = useState([]);
  onState?.({ giderler, hesapHareketleri });
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri}
    giderTanimlari={giderTanimlari} setGiderTanimlari={setGiderTanimlari} giderTurleri={TURLER} tedarikciler={tedarikciler} setTedarikciler={setTedarikciler}
    standartGiderler={standartGiderler} setStandartGiderler={setStandartGiderler} calisanlar={CAL} standardModels={[]} customModels={[]}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-06" } }} serverPermissions={null}
    kasaHesaplari={HESAP} kasaYetki cekler={[]} setCekler={vi.fn()} payments={[]}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
}
const degis = (el, value) => fireEvent.change(el, { target: { value } });
const L = (ad) => screen.getByLabelText(ad);
const liste = () => screen.getByTestId("kalem-listesi");
const personelAc = () => { const ac = within(liste()).queryByText(/Çalışanları göster/); if (ac) fireEvent.click(ac); };
const duzenle = () => { personelAc(); fireEvent.click(within(liste()).getAllByTitle("Düzenle")[0]); };
const kaydetBtn = () => fireEvent.click(screen.getAllByText("Kaydet").filter(e => e.closest("button")).pop());
const durum = (hedef) => screen.getAllByTestId("form-odeme-durum-satiri").find(s => s.dataset.hedef === hedef);
const hedefler = () => screen.queryAllByTestId("form-odeme-durum-satiri").map(s => s.dataset.hedef);
const ekEkle = (resmi, elden) => {
  fireEvent.click(screen.getByText("Ek ödeme ekle"));
  const i = screen.getAllByTestId("ek-odeme-satiri").length;
  if (resmi) degis(L(`Ek ödeme resmi ${i}`), resmi);
  if (elden) degis(L(`Ek ödeme elden ${i}`), elden);
};
const satir = (id, hedef, tutar) => ({ id, hedef, sira: 1, vade: "2026-09-30", tutar });
const od = (id, tutar, taksitId) => ({ id, tur: "odeme", tarih: "2026-09-15", tutar, hesapId: 51, giderId: 10, taksitId, yontem: "Havale" });
// Maaşı tamamen ödenmiş, satırlı iki hedefli personel kalemi (0042'den beri yeni kayıtların normali).
const PERS = { id: 10, tarih: "2026-09-01", turId: 3, calisanId: 21, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 20000, ekOdemeler: [],
  sonOdemeTarihi: "2026-09-30", modelSatirlari: [], taksitler: [satir(1, "ana", 30000), satir(2, "elden", 20000)] };
const MAAS_ODENDI = [od(700, 30000, 1), od(701, 20000, 2)];
const kalemDurumu = (st) => odemeDurumu(odemeleriUygula(st.giderler, st.hesapHareketleri, turMap)[0]);

describe("Spec 0054: asıl senaryo, ödenmiş maaşa prim (Intent)", () => {
  it("AC-7 / AC-8 / AC-9 / AC-11 / AC-6: maaş 'Ödendi' kalır, prim kendi hedefinde açık doğar ve aynı yazımda tek başına ödenir", () => {
    let st;
    render(<H g0={[PERS]} h0={MAAS_ODENDI} onState={s => { st = s; }} />);
    expect(kalemDurumu(st)).toBe("odendi");
    duzenle();
    ekEkle("9500", "");
    expect(hedefler()).toEqual(["ana", "elden", "ekResmi"]);
    expect(durum("ana").textContent).toMatch(/Maaş \(resmi\) · 30\.000 ₺Ödendi/);
    expect(durum("elden").textContent).toMatch(/Maaş \(elden\) · 20\.000 ₺Ödendi/);
    expect(durum("ekResmi").textContent).toMatch(/Ek ödeme \(resmi\) · 9\.500 ₺Ödenmedi/);
    expect(screen.queryByTestId("form-odeme-ek-bolunmez")).toBeNull();
    fireEvent.click(L("Ek ödeme (resmi) ödendi"));
    expect(L("Ek ödeme (resmi) ödeme tutarı").value).toBe("9.500");
    degis(L("Ek ödeme (resmi) ödeme yöntemi"), "Nakit");
    kaydetBtn();
    const yeni = st.giderler[0].taksitler.find(t => t.hedef === "ekResmi");
    expect(yeni.tutar).toBe(9500);
    expect(st.giderler[0].taksitler.find(t => t.hedef === "ana").id).toBe(1);
    expect(st.hesapHareketleri).toHaveLength(3);
    expect(st.hesapHareketleri.slice(0, 2)).toEqual(MAAS_ODENDI); // maaş hareketlerine dokunulmadı
    expect(st.hesapHareketleri[2]).toMatchObject({ giderId: 10, taksitId: yeni.id, tutar: 9500, yontem: "Nakit" });
    expect(kalemDurumu(st)).toBe("odendi");
  });
  it("R22: ek hedefin yöntem listesinde çek yok; ana hedefte var", () => {
    render(<H g0={[{ ...PERS, ekOdemeler: [{ tur: "prim", aciklama: "", resmiTutar: 5000, eldenTutar: null }], taksitler: [...PERS.taksitler, satir(3, "ekResmi", 5000)] }]} />);
    duzenle();
    fireEvent.click(L("Ek ödeme (resmi) ödendi"));
    const sec = [...L("Ek ödeme (resmi) ödeme yöntemi").querySelectorAll("option")].map(o => o.textContent);
    expect(sec.some(s => /Çek \(ciro\)|Çek \(kendi\)/.test(s))).toBe(false);
    fireEvent.click(L("Maaş (resmi) ödendi"));
    expect(screen.getAllByText(/Ek ödeme çekle yapılmaz/).length).toBeGreaterThan(0);
  });
});

describe("Spec 0054: ödeme penceresi (AC-10)", () => {
  it("AC-10: kaydedilmiş kalemde ek hedef Ödeme planından açılan pencereyle ödenir; aynı hareket şekli", () => {
    let st;
    const k = { ...PERS, ekOdemeler: [{ tur: "prim", aciklama: "", resmiTutar: 9500, eldenTutar: null }], taksitler: [...PERS.taksitler, satir(3, "ekResmi", 9500)] };
    render(<H g0={[k]} h0={MAAS_ODENDI} onState={s => { st = s; }} />);
    personelAc();
    const tr = within(liste()).getByText("Hasan Çelik").closest("tr");
    fireEvent.click(within(tr).getByText("Ödeme planı"));
    const plan = screen.getByTestId("odeme-plani-satirlari");
    expect(plan.textContent).toMatch(/Ek ödeme \(resmi\) · ödenmedi/);
    const dugmeler = within(plan).getAllByText("Ödeme gir");
    expect(dugmeler).toHaveLength(1); // maaş hedefleri ödendi
    fireEvent.click(dugmeler[0]);
    const p = screen.getByTestId("odeme-kayit-penceresi");
    expect(within(p).getByLabelText("Ödeme tutarı").value).toBe("9.500");
    degis(within(p).getByLabelText("Ödeme yöntemi"), "Nakit");
    fireEvent.click(screen.getByText("Ödemeyi Kaydet"));
    expect(st.hesapHareketleri[2]).toMatchObject({ giderId: 10, taksitId: 3, tutar: 9500, yontem: "Nakit" });
    expect(kalemDurumu(st)).toBe("odendi");
  });
});

describe("Spec 0054: koruma ve alanlar", () => {
  it("AC-15 / AC-26: ödenmiş ana satırı primi içeriyorsa (39.500) ek ödeme ayrılmaz; neden kutuda, tek sabitten", () => {
    const k = { ...PERS, resmiTutar: 39500, eldenTutar: 0, taksitler: [satir(1, "ana", 39500)] };
    render(<H g0={[k]} h0={[od(700, 39500, 1)]} />);
    duzenle();
    degis(L("Resmi işveren maliyeti"), "30000");
    ekEkle("9500", "");
    expect(hedefler()).toEqual(["ana"]);
    expect(durum("ana").textContent).toMatch(/39\.500 ₺Ödendi/);
    expect(screen.getByTestId("form-odeme-ek-bolunmez").textContent).toBe(PERSONEL_EK_BOLUNMEZ_NEDENI);
    expect(screen.queryByTestId("form-odeme-plan-hatasi")).toBeNull();
  });
  it("AC-25 / AC-27: 'Elden vadesi' yalnız elden maaşı varken; ek ödeme için vade alanı yok", () => {
    render(<H g0={[{ ...PERS, eldenTutar: 0, taksitler: [] }]} />);
    duzenle();
    ekEkle("", "4000"); // resmi maaş + elden prim: çok hedefli ama elden maaşı yok
    expect(hedefler()).toEqual(["ana", "ekElden"]);
    expect(screen.queryByLabelText("Elden vadesi")).toBeNull();
    degis(L("Elden ödenen"), "20000");
    expect(L("Elden vadesi")).toBeTruthy();
    expect(screen.queryByLabelText(/Ek ödeme.*vade/i)).toBeNull();
  });
  it("AC-28: resmi maaş taksitliyken ek hedef tek satır kalır ve formdan ödenebilir", () => {
    let st;
    render(<H g0={[{ ...PERS, eldenTutar: 0, taksitler: [] }]} onState={s => { st = s; }} />);
    duzenle();
    degis(L("Taksit sayısı"), "3");
    ekEkle("6000", "");
    kaydetBtn();
    expect(st.giderler[0].taksitler.filter(t => t.hedef === "ana")).toHaveLength(3);
    expect(st.giderler[0].taksitler.filter(t => t.hedef === "ekResmi").map(t => t.tutar)).toEqual([6000]);
    duzenle();
    expect(screen.queryByLabelText("Maaş (resmi) ödendi")).toBeTruthy();
    fireEvent.click(L("Ek ödeme (resmi) ödendi"));
    expect(L("Ek ödeme (resmi) ödeme tutarı").value).toBe("6.000");
    expect(screen.queryByLabelText("Ek ödeme (resmi) taksiti")).toBeNull();
  });
  it("AC-5 / AC-30: tek hedefli personelde ve yalnız ek ödemeli ayda ad 'Çalışana'", () => {
    render(<H g0={[{ ...PERS, eldenTutar: 0, taksitler: [] }]} />);
    duzenle();
    expect(L("Çalışana ödendi")).toBeTruthy();
    degis(L("Resmi işveren maliyeti"), "");
    ekEkle("2000", "");
    expect(hedefler()).toEqual(["ana"]);
    expect(L("Çalışana ödendi")).toBeTruthy();
    expect(screen.queryByText(/Ek ödeme \(resmi\)/)).toBeNull();
  });
});
