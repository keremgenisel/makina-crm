// @vitest-environment jsdom
// Spec 0084 (arayüz): Giderler başlığındaki "Kira stopajı (N dönem açık)" düğmesi, Stopaj Dönemleri penceresi, toplu ödeme,
// satırsız kalemin salt okunur satırı, izin, kilit ve Anasayfa hatırlatma penceresinin stopaj grup satırı. Gerçek Giderler
// bileşeni; saat ve saat dilimi sabit.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { useState } from "react";
import { Giderler } from "../../src/components/Giderler";
import { OdemeHatirlatmaPenceresi } from "../../src/components/gider/OdemeHatirlatma";
import { giderKalemDogrula, odemeleriUygula, HEDEF } from "../../src/lib/gider";
import { odemeHatirlatmalari } from "../../src/lib/odemeHatirlatma";
import { GIDERLER, TURLER, TEDARIKCILER, HAREKETLER, HESAPLAR, turMap, uid, stopajSatirlari, K2, K3 } from "../fixtures/0084-veri";

afterEach(() => { cleanup(); vi.useRealTimers(); delete window.crmLocks; delete window.appServer; });
const saat = (t) => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(`${t}T10:00:00`)); };
beforeEach(() => saat("2026-05-10"));

const ODEMESIZ = { role: "user", permissions: JSON.stringify({ tabs: ["gider"], giderActions: ["gider_edit"] }) };
function H({ g0 = GIDERLER, h0 = HAREKETLER, perms = null, ayar = {}, aktifKullanici = "kerem", onState }) {
  const [giderler, setGiderler] = useState(g0);
  const [hesapHareketleri, setHesapHareketleri] = useState(h0);
  onState?.({ hesapHareketleri });
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
    giderTurleri={TURLER} tedarikciler={TEDARIKCILER} setTedarikciler={vi.fn()} calisanlar={[]} standardModels={[]} customModels={[]} aktifKullanici={aktifKullanici}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-01", ...ayar } }} serverPermissions={perms} kasaHesaplari={HESAPLAR} kasaYetki
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
}
const dugme = () => screen.queryByTestId("stopaj-donemleri-dugmesi");
const pencereyiAc = () => fireEvent.click(dugme());
const donemSatiri = (anahtar) => screen.getByTestId(`stopaj-donem-${anahtar}`);

describe("Spec 0084: başlık düğmesi (R12)", () => {
  // Spec 0088 ile: Üretim Partileri Giderler'den taşındı. Spec 0089 ile (C7 0084 AC-38): diğer görünüm yalnız Tedarikler ve Ekstre.
  it("AC-15: düğme yalnız Dönem Raporu'nda ve açık dönem varken; sayı dönem sayar, diğer görünümlerde yok", () => {
    render(<H />);
    expect(dugme().textContent).toBe("Kira stopajı (1 dönem açık)");
    for (const ad of ["Tedarikler ve Ekstre"]) {
      fireEvent.click(screen.getByRole("radio", { name: ad }));
      expect(dugme(), ad).toBeNull();
    }
    cleanup();
    saat("2026-12-01"); // 1. dönem (dört kalem) ve 4. dönem (Kasım kirası) açık: iki DÖNEM
    render(<H />);
    expect(dugme().textContent).toBe("Kira stopajı (2 dönem açık)");
  });
  it("AC-15: açık dönem yoksa düğme çizilmez", () => {
    render(<H g0={GIDERLER.filter(k => k.id === 1)} />); // yalnız stopajı ödenmiş Ocak kirası
    expect(dugme()).toBeNull();
  });
});

describe("Spec 0084: Stopaj Dönemleri penceresi (R13, R17)", () => {
  it("AC-16 / AC-17: satır kesilen, ödenen, açık ve dönem tarihini yazar; farklı kalem vadesi işaretli; vadesi geçti", () => {
    render(<H />);
    pencereyiAc();
    const s = donemSatiri("2026-Q1");
    expect(s.textContent).toMatch(/2026 1\. dönem \(Ocak-Mart\)/);
    expect(s.textContent).toMatch(/16\.000[\s\S]*5\.000[\s\S]*11\.000/); // kesilen 16.000 = ödenen 4.000 + 1.000 + açık 11.000
    expect(s.textContent).toContain("26/04/2026");
    expect(within(s).getByText("kalem vadeleri farklı")).toBeTruthy();
    expect(within(s).getByTestId("stopaj-donem-durum").textContent).toBe("Vadesi geçti");
    expect(screen.getByTestId("stopaj-donem-toplam").textContent).toMatch(/Kesilen 16\.000[\s\S]*Ödenen 5\.000[\s\S]*Açık 11\.000/);
  });
  it("AC-18: içinde bulunulan dönem listelenir, 'dönem henüz kapanmadı' işaretlidir ve ödenebilir", () => {
    saat("2026-03-10");
    render(<H />);
    pencereyiAc();
    const s = donemSatiri("2026-Q1");
    expect(within(s).getByText("dönem henüz kapanmadı")).toBeTruthy();
    expect(within(s).getByRole("button", { name: "Dönemi öde" })).toBeTruthy();
  });
  it("AC-19: kapanmış dönemler varsayılan gizli, 'Kapanmış dönemleri göster' ile listelenir", () => {
    render(<H ayar={{ stopajBeyanDonemi: "aylik", stopajOdemeGunu: 26 }} />);
    pencereyiAc();
    expect(screen.queryByTestId("stopaj-donem-2026-01")).toBeNull(); // Ocak kirası: stopajı ödenmiş
    expect(donemSatiri("2026-02")).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/Kapanmış dönemleri göster \(1\)/));
    expect(within(donemSatiri("2026-01")).getByTestId("stopaj-donem-durum").textContent).toBe("Ödendi");
    // Triyaj bulgu 5 (R13): "Satır" ödenmiş satırları da sayar; kapanmış dönemde 0 değil.
    expect(within(donemSatiri("2026-01")).getByTestId("stopaj-donem-satir").textContent).toBe("1");
  });
  it("AC-22: satırsız (eski) kalemin stopajı dönem satırında salt okunur görünür, nedeni yazılı; ödeme kipinde seçilemez", () => {
    render(<H />);
    pencereyiAc();
    expect(within(donemSatiri("2026-Q1")).getByTestId("stopaj-satirsiz").textContent).toMatch(/Eski depo kirası[\s\S]*kalemi bir kez kaydedin/);
    fireEvent.click(within(donemSatiri("2026-Q1")).getByRole("button", { name: "Dönemi öde" }));
    const satir = screen.getAllByTestId("stopaj-odeme-satiri").find(x => x.textContent.includes("Eski depo kirası"));
    expect(within(satir).getByText("Seçilemez")).toBeTruthy();
    expect(within(satir).queryByRole("textbox")).toBeNull();
  });
});

describe("Spec 0084: toplu ödeme (R14–R16, R18, R19)", () => {
  it("AC-20 / AC-24: satır başına bir hareket; tur odeme, kendi taksitId'si, aynı tarih ve hesap; boş açıklama dönemin adı", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    pencereyiAc();
    fireEvent.click(within(donemSatiri("2026-Q1")).getByRole("button", { name: "Dönemi öde" }));
    expect(screen.getAllByTestId("stopaj-odeme-satiri")).toHaveLength(4); // K2, K3'ün iki taksiti, satırsız K5
    expect(screen.getByTestId("stopaj-odeme-toplam").textContent).toMatch(/9\.000/); // 4.000 + 2.000 + 3.000
    fireEvent.change(screen.getByLabelText("Hesap"), { target: { value: "51" } });
    fireEvent.click(screen.getByText("Ödemeyi kaydet"));
    const yeni = st.hesapHareketleri.slice(HAREKETLER.length);
    expect(yeni).toHaveLength(3);
    expect(yeni.map(h => h.taksitId).sort()).toEqual([stopajSatirlari(K2)[0].id, ...stopajSatirlari(K3).map(t => t.id)].sort());
    // Triyaj bulgu 2: hesap kimliği seçicinin dizesi değil, hesabın kendi kimliği (sayı) olarak yazılır.
    for (const h of yeni) expect(h).toMatchObject({ tur: "odeme", tarih: "2026-05-10", hesapId: 51, aciklama: "2026 1. dönem kira stopajı" });
    expect(screen.queryByTestId("stopaj-donem-odeme")).toBeNull();
  });
  it("AC-21: bir satır kalanı aşarsa hiçbir hareket yazılmaz, hata o satırda görünür", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    pencereyiAc();
    fireEvent.click(within(donemSatiri("2026-Q1")).getByRole("button", { name: "Dönemi öde" }));
    fireEvent.change(screen.getByLabelText("Şubat kirası ödenecek tutar"), { target: { value: "5.000" } });
    fireEvent.click(screen.getByText("Ödemeyi kaydet"));
    expect(st.hesapHareketleri).toHaveLength(HAREKETLER.length);
    const satir = screen.getAllByTestId("stopaj-odeme-satiri").find(x => x.textContent.includes("Şubat kirası"));
    expect(within(satir).getByRole("alert").textContent).toMatch(/Kalandan fazla ödeme/);
  });
  it("AC-27: gider_odeme izni yoksa pencere açılır, 'Dönemi öde' çizilmez", () => {
    render(<H perms={ODEMESIZ} />);
    pencereyiAc();
    expect(donemSatiri("2026-Q1")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Dönemi öde" })).toBeNull();
  });
  it("AC-28 / AC-29: başka kullanıcının kilidindeki kalem varsa ödeme bütünüyle reddedilir (kalem adıyla); kendi kilidi engellemez", async () => {
    window.crmLocks = { list: vi.fn(() => Promise.resolve([{ entity_type: "gider", entity_id: "2", locked_by: "ayse" }])) };
    let st;
    render(<H onState={s => { st = s; }} />);
    await waitFor(() => expect(window.crmLocks.list).toHaveBeenCalled());
    pencereyiAc();
    fireEvent.click(within(donemSatiri("2026-Q1")).getByRole("button", { name: "Dönemi öde" }));
    fireEvent.click(screen.getByText("Ödemeyi kaydet"));
    expect(st.hesapHareketleri).toHaveLength(HAREKETLER.length);
    expect(screen.getByText(/Şubat kirası[\s\S]*"ayse" tarafından düzenleniyor; işlem yapılmadı\./)).toBeTruthy();
    cleanup();
    window.crmLocks = { list: vi.fn(() => Promise.resolve([{ entity_type: "gider", entity_id: "2", locked_by: "kerem" }])) };
    render(<H aktifKullanici="kerem" onState={s => { st = s; }} />);
    await waitFor(() => expect(window.crmLocks.list).toHaveBeenCalled());
    pencereyiAc();
    fireEvent.click(within(donemSatiri("2026-Q1")).getByRole("button", { name: "Dönemi öde" }));
    fireEvent.click(screen.getByText("Ödemeyi kaydet"));
    expect(st.hesapHareketleri).toHaveLength(HAREKETLER.length + 3);
  });
  it("AC-23: satırsız kalem bir kez kaydedilip satırlanınca aynı dönemden ödenir", () => {
    const k5 = GIDERLER.find(k => k.id === 5);
    const kayitli = giderKalemDogrula({ ...k5, stopajTaksitSayisi: "1" }, { turMap, tedarikciler: TEDARIKCILER, uid }).kayit;
    render(<H g0={GIDERLER.map(k => (k.id === 5 ? kayitli : k))} />);
    pencereyiAc();
    expect(within(donemSatiri("2026-Q1")).queryByTestId("stopaj-satirsiz")).toBeNull();
    fireEvent.click(within(donemSatiri("2026-Q1")).getByRole("button", { name: "Dönemi öde" }));
    expect(screen.getByLabelText("Eski depo kirası ödenecek tutar")).toBeTruthy();
  });
});

describe("Spec 0084 triyaj: varsayılan yöntem ve satır sayısı", () => {
  it("triyaj bulgu 1: son gider ödemesi düz 'Çek' ise seçici 'Belirtilmemiş' gösterir ve kayda da boş yöntem yazılır", () => {
    let st;
    const cekli = [...HAREKETLER, { id: 960, tur: "odeme", tarih: "2026-05-01", tutar: 100, yontem: "Çek", hesapId: 51, giderId: 7, taksitId: null }];
    render(<H h0={cekli} onState={s => { st = s; }} />);
    pencereyiAc();
    fireEvent.click(within(donemSatiri("2026-Q1")).getByRole("button", { name: "Dönemi öde" }));
    expect(screen.getByLabelText("Yöntem").value).toBe("");
    fireEvent.click(screen.getByText("Ödemeyi kaydet"));
    const yeni = st.hesapHareketleri.slice(cekli.length);
    expect(yeni).toHaveLength(3);
    expect(yeni.every(h => h.yontem === "")).toBe(true);
  });
  it("triyaj bulgu 1: son yöntem listedeyse (Havale) ön seçili gelir ve aynen yazılır", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    pencereyiAc();
    fireEvent.click(within(donemSatiri("2026-Q1")).getByRole("button", { name: "Dönemi öde" }));
    expect(screen.getByLabelText("Yöntem").value).toBe("Havale");
    fireEvent.click(screen.getByText("Ödemeyi kaydet"));
    expect(st.hesapHareketleri.slice(HAREKETLER.length).every(h => h.yontem === "Havale")).toBe(true);
  });
  it("triyaj bulgu 5: kısmen ödenmiş dönemde 'Satır' bütün stopaj ödeme satırlarını sayar (K1 1 + K2 1 + K3 2 + K5 1)", () => {
    render(<H />);
    pencereyiAc();
    expect(within(donemSatiri("2026-Q1")).getByTestId("stopaj-donem-satir").textContent).toBe("5");
  });
});

describe("Spec 0084: Anasayfa hatırlatma penceresi (R20, P2)", () => {
  it("AC-30: aynı dönem ve vadedeki stopajlar tek satır; satır açılınca alt satırlar kendi 'Ödendi' düğmesini taşır", () => {
    const kira = (o) => giderKalemDogrula({ turId: 2, girisYonu: "brut", tutar: 10000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 12, sonOdemeTarihi: "2026-04-25", ...o }, { turMap, tedarikciler: TEDARIKCILER, uid }).kayit;
    const veri = [kira({ id: 81, tarih: "2026-01-05", aciklama: "Ocak", stopajVade: "2026-04-26" }), kira({ id: 82, tarih: "2026-02-05", aciklama: "Şubat", stopajVade: "2026-04-26" })];
    const sonuc = odemeHatirlatmalari(odemeleriUygula(veri, [], turMap), { turler: TURLER, tedarikciler: TEDARIKCILER, yururlukAy: "2026-01", esikGun: 10 }, "2026-04-20");
    const onOdendi = vi.fn();
    render(<OdemeHatirlatmaPenceresi sonuc={sonuc} odendiYetkisi onOdendi={onOdendi} onGiderlereGit={vi.fn()} onClose={vi.fn()} />);
    const grup = screen.getByTestId("hatirlatma-stopaj");
    expect(grup.textContent).toMatch(/2026 1\. dönem kira stopajı · 2 kalem/);
    expect(within(grup).queryByText(/Ödendi/)).toBeNull();
    fireEvent.click(within(grup).getByRole("button", { name: /Kalemleri göster/ }));
    const bolum = screen.getByTestId("hatirlatma-bolum-yaklasan");
    const odendiler = within(bolum).getAllByRole("button", { name: /Ödendi/ });
    expect(odendiler).toHaveLength(4); // iki ANA satırı + iki stopaj alt satırı
    fireEvent.click(odendiler[odendiler.length - 1]);
    expect(onOdendi.mock.calls[0][1]).toBe(HEDEF.STOPAJ);
  });
});
