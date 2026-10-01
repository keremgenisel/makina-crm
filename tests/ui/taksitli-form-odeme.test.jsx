// @vitest-environment jsdom
// Spec 0057: taksitli hedefin taksiti gider formundan ödenir (gerçek Giderler bileşeni, durumlu düzenek): yeni kalem,
// düzenleme, çek satırı, "Hepsini işaretle", ödeme penceresiyle eşitlik ve mahsup.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { Giderler } from "../../src/components/Giderler";
import { cekleriUygula } from "../../src/lib/cek";
import { odemeleriUygula, turHaritasi } from "../../src/lib/gider";
import { PASIF_TAKSIT_NEDENI } from "../../src/lib/formOdemesi";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); });

const TURLER = [{ id: 1, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Hammadde", davranis: "normal" }];
const turMap = turHaritasi(TURLER);
const CAL = [{ id: 21, ad: "Hasan Çelik", resmiMaliyet: 30000 }];
const TED = [{ id: 11, ad: "Yıldız Gayrimenkul" }];
const HESAP = [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, kapali: false }];
const P = [{ id: 100, customerId: 1, tarih: "2026-09-01", tutar: 12000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-10-15" }];
const C = [{ id: 200, paymentId: 100, no: "123456", banka: "Ziraat", kesideci: "Ali", tur: "hamiline", durum: "portfoy", gecmis: [] }];

function H({ g0 = [], h0 = [], onState }) {
  const [giderler, setGiderler] = useState(g0);
  const [hesapHareketleri, setHesapHareketleri] = useState(h0);
  const [cekler, setCekler] = useState(C);
  const [giderTanimlari, setGiderTanimlari] = useState([]);
  const [tedarikciler, setTedarikciler] = useState(TED);
  const [standartGiderler, setStandartGiderler] = useState([]);
  onState?.({ giderler, hesapHareketleri, cekler });
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri}
    giderTanimlari={giderTanimlari} setGiderTanimlari={setGiderTanimlari} giderTurleri={TURLER} tedarikciler={tedarikciler} setTedarikciler={setTedarikciler}
    standartGiderler={standartGiderler} setStandartGiderler={setStandartGiderler} calisanlar={CAL} standardModels={[]} customModels={[]}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-06", stopajOrani: 20 } }} serverPermissions={null}
    kasaHesaplari={HESAP} kasaYetki cekler={cekler} setCekler={setCekler} payments={cekleriUygula(P, cekler)}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
}
const degis = (el, value) => fireEvent.change(el, { target: { value } });
const L = (ad) => screen.getByLabelText(ad);
const kaydetBtn = () => fireEvent.click(screen.getAllByText("Kaydet").filter(e => e.closest("button")).pop());
const yeniAlti = () => {
  fireEvent.click(screen.getAllByRole("button", { name: /Yeni Gider/ })[0]);
  degis(L("Gider türü *"), "4");
  degis(L("Tutar"), "60000");
  degis(L("KDV oranı"), "0");
  degis(L("Tedarikçi"), "11");
  degis(L("Taksit sayısı"), "6");
  degis(L("İlk taksitin vadesi"), "2026-09-30");
};
const liste = () => screen.getByTestId("kalem-listesi");
const duzenle = () => fireEvent.click(within(liste()).getAllByTitle("Düzenle")[0]);
const vade = (i) => `2026-${String(8 + i).padStart(2, "0")}-30`;
// Kayıtlı altı taksitli kalem (her taksit 10.000 ₺).
const ALTI = { id: 20, tarih: "2026-09-10", turId: 4, tutar: 60000, kdvOrani: 0, tedarikciId: 11, sonOdemeTarihi: "2026-09-30", modelSatirlari: [],
  taksitler: [1, 2, 3, 4, 5, 6].map(i => ({ id: 600 + i, hedef: "ana", sira: i, vade: vade(i), tutar: 10000 })) };
const ILK_ODENDI = [{ id: 700, tur: "odeme", tarih: "2026-09-15", tutar: 10000, hesapId: 51, giderId: 20, taksitId: 601, yontem: "Havale" }];

describe("Spec 0057: yeni kalemde taksitli hedef (AC-1–AC-5, AC-7, AC-13, AC-19, AC-25)", () => {
  it("AC-1 / AC-2 / AC-3 / AC-4 / AC-25: altı taksitli yeni giderde satır çizilir, varsayılan 1. taksit ve tutarı; kayıtta gerçek 1. taksite bağlanır", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    yeniAlti();
    expect(screen.queryByTestId("form-odeme-hepsi-taksitli")).toBeNull();
    fireEvent.click(L("Tedarikçiye ödendi"));
    expect(L("Tedarikçiye taksiti").value).toBe("1");
    expect(L("Tedarikçiye ödeme tutarı").value).toBe("10.000");
    degis(L("Tedarikçiye ödeme yöntemi"), "Havale");
    degis(L("Tedarikçiye hesabı"), "51");
    kaydetBtn();
    const k = st.giderler[0];
    expect(st.hesapHareketleri).toHaveLength(1);
    expect(st.hesapHareketleri[0]).toMatchObject({ giderId: k.id, taksitId: k.taksitler.find(r => r.sira === 1).id, tutar: 10000 });
    expect(String(st.hesapHareketleri[0].taksitId)).not.toMatch(/onizleme/);
    const z = odemeleriUygula(st.giderler, st.hesapHareketleri, turMap)[0];
    expect(z.taksitler.map(t => t._odenenK)).toEqual([1000000, 0, 0, 0, 0, 0]);
  });
  it("AC-5: ikinci satırla ikinci taksit de ödenir; iki ayrı hareket", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    yeniAlti();
    fireEvent.click(L("Tedarikçiye ödendi"));
    fireEvent.click(L("Tedarikçiye için başka yöntemle satır ekle"));
    degis(L("Tedarikçiye taksiti 2"), "2");
    expect(L("Tedarikçiye ödeme tutarı 2").value).toBe("10.000");
    degis(L("Tedarikçiye ödeme yöntemi 2"), "Nakit");
    kaydetBtn();
    const ids = st.giderler[0].taksitler.map(r => r.id);
    expect(st.hesapHareketleri.map(h => [h.taksitId, h.tutar])).toEqual([[ids[0], 10000], [ids[1], 10000]]);
  });
  it("AC-7 / AC-13: taksidin kalanından fazla tutar satırda hata; gider kalemi de kaydedilmez", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    yeniAlti();
    fireEvent.click(L("Tedarikçiye ödendi"));
    degis(L("Tedarikçiye ödeme tutarı"), "10000,01");
    kaydetBtn();
    expect(st.giderler).toEqual([]);
    expect(st.hesapHareketleri).toEqual([]);
    expect(screen.getByTestId("form-odeme").textContent).toMatch(/Kalandan fazla ödeme kaydedilemez/);
  });
  it("AC-19: 'Hepsini ödendi işaretle' en yakın açık taksidi o taksidin kalanıyla doldurur; kayıt hatasız", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    yeniAlti();
    fireEvent.click(L("Hepsini ödendi işaretle"));
    expect(L("Tedarikçiye taksiti").value).toBe("1");
    expect(L("Tedarikçiye ödeme tutarı").value).toBe("10.000");
    kaydetBtn();
    expect(st.giderler).toHaveLength(1);
    expect(st.hesapHareketleri.map(h => h.tutar)).toEqual([10000]);
  });
});

// Triyaj bulgusu: taksit sayısı 1 iken eklenen satırın sırası boştur; sayı sonra artırılınca satır en yakın açık taksite
// eşlenmeli (seçicinin gösterdiği = kaydın bağlandığı), yoksa kayıt "taksite bağlanır" + "kalan 0,00" hatasıyla duruyordu.
describe("Spec 0057 triyaj: satır eklendikten sonra taksit sayısı artırılır", () => {
  it("'Hepsini işaretle' ile eklenen satır taksit sayısı 6'ya çıkınca 1. taksite bağlanır; seçici ile kayıt aynı", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Yeni Gider/ })[0]);
    degis(L("Gider türü *"), "4");
    degis(L("Tutar"), "60000");
    degis(L("KDV oranı"), "0");
    degis(L("Tedarikçi"), "11");
    fireEvent.click(L("Hepsini ödendi işaretle"));
    expect(screen.queryByLabelText("Tedarikçiye taksiti")).toBeNull(); // taksitsiz: seçici yok
    degis(L("Taksit sayısı"), "6");
    degis(L("İlk taksitin vadesi"), "2026-09-30");
    const secici = L("Tedarikçiye taksiti");
    expect(secici.value).toBe("1");
    expect(secici.selectedIndex).toBe(0);
    degis(L("Tedarikçiye ödeme tutarı"), "2000");
    kaydetBtn();
    expect(screen.queryByText(/Taksitli kalemde ödeme bir taksite bağlanır/)).toBeNull();
    const k = st.giderler[0];
    expect(st.hesapHareketleri).toHaveLength(1);
    expect(st.hesapHareketleri[0]).toMatchObject({ taksitId: k.taksitler.find(r => r.sira === 1).id, tutar: 2000 });
  });
});

describe("Spec 0057: çek satırı (AC-12, AC-20, AC-21)", () => {
  it("AC-20 / AC-21 / AC-12: taksitli ANA'da çek seçeneği var; çek satırında taksit seçici yok, dağıtım notu var; çek en eski vadeden dağıtılır", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    yeniAlti();
    fireEvent.click(L("Tedarikçiye ödendi"));
    const y = L("Tedarikçiye ödeme yöntemi");
    expect([...y.querySelectorAll("option")].map(o => o.textContent)).toEqual(expect.arrayContaining(["Çek (ciro)", "Çek (kendi)"]));
    degis(y, "Çek (ciro)");
    expect(screen.queryByLabelText("Tedarikçiye taksiti")).toBeNull();
    expect(screen.getByTestId("cek-dagitim-notu").textContent).toMatch(/açık taksitlerine en eski vadeden dağıtılır/);
    degis(L("Tedarikçiye çek"), "200");
    expect(L("Tedarikçiye ödeme tutarı").textContent).toBe("12.000 ₺");
    kaydetBtn();
    const ids = st.giderler[0].taksitler.map(r => r.id);
    expect(st.hesapHareketleri.map(h => [h.taksitId, h.tutar, h.cekId])).toEqual([[ids[0], 10000, 200], [ids[1], 2000, 200]]);
    expect(st.cekler[0].durum).toBe("ciro");
  });
  it("AC-21: planı değişen hedefte satır ve çek çizilmez", () => {
    render(<H g0={[ALTI]} />);
    duzenle();
    degis(L("Taksit sayısı"), "4");
    expect(screen.queryByLabelText("Tedarikçiye ödendi")).toBeNull();
    expect(screen.queryByLabelText("Tedarikçiye ödeme yöntemi")).toBeNull();
  });
});

describe("Spec 0057: düzenleme (AC-9, AC-10, AC-22–AC-24)", () => {
  it("AC-9: plan değişmiyorsa taksitli hedef formdan ödenir; varsayılan en yakın açık taksit (2.)", () => {
    let st;
    render(<H g0={[ALTI]} h0={ILK_ODENDI} onState={s => { st = s; }} />);
    duzenle();
    fireEvent.click(L("Tedarikçiye ödendi"));
    expect(L("Tedarikçiye taksiti").value).toBe("2");
    expect([...L("Tedarikçiye taksiti").querySelectorAll("option")].map(o => o.value)).toEqual(["2", "3", "4", "5", "6"]); // AC-26
    kaydetBtn();
    expect(st.hesapHareketleri[1]).toMatchObject({ taksitId: 602, tutar: 10000 });
  });
  it("AC-22 / AC-23: yalnız vade ya da tutar değişince hedef pasif olmaz", () => {
    render(<H g0={[ALTI]} />);
    duzenle();
    degis(L("İlk taksitin vadesi"), "2026-10-15");
    expect(L("Tedarikçiye ödendi")).toBeTruthy();
    degis(L("Tutar"), "72000");
    expect(L("Tedarikçiye ödendi")).toBeTruthy();
  });
  it("AC-10 / AC-24: taksit sayısı değişince hedef pasif; neden plan değişikliğini anlatır", () => {
    render(<H g0={[ALTI]} />);
    duzenle();
    degis(L("Taksit sayısı"), "4");
    expect(screen.queryByLabelText("Tedarikçiye ödendi")).toBeNull();
    expect(screen.getByTestId("form-odeme-durumu").textContent).toContain(PASIF_TAKSIT_NEDENI);
  });
});

describe("Spec 0057: pencere eşitliği ve mahsup (AC-15, AC-17, AC-28)", () => {
  const formdan = () => {
    let st;
    render(<H g0={[ALTI]} h0={ILK_ODENDI} onState={s => { st = s; }} />);
    duzenle();
    expect(screen.getAllByTestId("odeme-girisi")).toHaveLength(1);
    fireEvent.click(L("Tedarikçiye ödendi"));
    degis(L("Tedarikçiye ödeme yöntemi"), "Nakit");
    degis(L("Tedarikçiye hesabı"), "51");
    kaydetBtn();
    cleanup();
    return st.hesapHareketleri.at(-1);
  };
  const penceredan = () => {
    let st;
    render(<H g0={[ALTI]} h0={ILK_ODENDI} onState={s => { st = s; }} />);
    fireEvent.click(within(liste()).getByText("Ödeme planı"));
    fireEvent.click(within(screen.getByTestId("odeme-plani-satirlari")).getAllByText("Ödeme gir")[0]);
    const p = screen.getByTestId("odeme-kayit-penceresi");
    expect(within(p).getAllByTestId("odeme-girisi")).toHaveLength(1); // aynı bileşen
    expect(within(p).getByLabelText("Taksit").value).toBe("2"); // AC-17: pencerede seçici bugünkü gibi
    degis(within(p).getByLabelText("Ödeme yöntemi"), "Nakit");
    degis(within(p).getByLabelText("Hesap"), "51");
    fireEvent.click(screen.getByText("Ödemeyi Kaydet"));
    cleanup();
    return st.hesapHareketleri.at(-1);
  };
  it("AC-15 / AC-17: formdan ve pencereden aynı taksit ödemesi alan alan aynı hareket", () => {
    const { id: _a, ...f } = formdan();
    const { id: _b, ...p } = penceredan();
    expect(f).toMatchObject({ taksitId: 602, tutar: 10000, yontem: "Nakit", hesapId: 51 });
    expect(p).toEqual(f);
  });
  it("AC-28: mahsup kipinde taksit yeri seçimi bugünkü gibi", () => {
    const pers = { id: 30, tarih: "2026-09-01", turId: 3, calisanId: 21, resmiTutar: 30000, eldenTutar: 0, ekOdemeler: [], sonOdemeTarihi: "2026-09-30", modelSatirlari: [],
      taksitler: [1, 2].map(i => ({ id: 800 + i, hedef: "ana", sira: i, vade: vade(i), tutar: 15000 })) };
    let st;
    render(<H g0={[pers]} h0={[{ id: 710, tur: "avans", tarih: "2026-09-05", tutar: 5000, calisanId: 21, hesapId: 51 }]} onState={s => { st = s; }} />);
    const ac = within(liste()).queryByText(/Çalışanları göster/);
    if (ac) fireEvent.click(ac);
    duzenle();
    fireEvent.click(screen.getByRole("button", { name: "Avanstan mahsup" }));
    degis(L("Mahsup bölümü"), "ana:2");
    kaydetBtn();
    expect(st.hesapHareketleri.find(h => h.tur === "mahsup")).toMatchObject({ taksitId: 802, tutar: 5000 });
  });
});
