// @vitest-environment jsdom
// Spec 0003: Anasayfa ödeme hatırlatıcısı kartı ve liste penceresi (R2–R4, R6, R9, R10).
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent, within, act } from "@testing-library/react";
import { Dashboard } from "../../src/components/Dashboard";
import { Giderler } from "../../src/components/Giderler";
import { odemeleriUygula, turHaritasi } from "../../src/lib/gider";

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] }); vi.setSystemTime(new Date(2026, 8, 24, 10, 0, 0)); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

const TUR = [{ id: 1, ad: "Genel", davranis: "normal" }, { id: 3, ad: "Personel", davranis: "personel" }];
const TED = [{ id: 11, ad: "Demir Bant" }];
const AYAR = { yururlukAy: "2026-01", hatirlatmaEsikGun: 7 };
const k = (id, o = {}) => ({ id, tarih: "2026-09-01", turId: 1, tutar: 10000, kdvOrani: 20, odendi: false, tedarikciId: 11, sonOdemeTarihi: "2026-09-27", ...o });
const ortak = { customers: [], dealers: [], services: [], stock: [], payments: [], partSales: [], yedekParcaSatislar: [], rates: null, teklifler: [] };

// Spec 0024: App gibi, ödeme durumu hareketlerden türetilmiş kalemler verilir; ödeme bir hareket kaydıdır.
function Harness({ g0, h0 = [], giderYetki = true, perms = null, onGit, onState, turler = TUR }) {
  const [giderler] = useState(g0);
  const [hareketler, setHareketler] = useState(h0);
  onState?.(giderler, hareketler);
  return <Dashboard {...ortak} serverPermissions={perms} giderYetki={giderYetki} giderler={giderYetki ? odemeleriUygula(giderler, hareketler, turHaritasi(turler)) : []}
    hesapHareketleri={hareketler} setHesapHareketleri={setHareketler}
    giderTurleri={turler} tedarikciler={TED} giderAyarlari={AYAR} onGoGiderHatirlatma={onGit} />;
}
const kart = () => screen.getByTestId("odeme-hatirlatma-karti");
const sayilar = () => [within(kart()).getByTestId("hatirlatma-gecmis-sayi"), within(kart()).getByTestId("hatirlatma-yaklasan-sayi")].map(e => Number(e.firstChild.textContent));
const ac = () => fireEvent.click(kart());

describe("Anasayfa ödeme hatırlatıcısı", () => {
  it("AC-25: kart vadesi geçmiş ve yaklaşan sayılarını iki ayrı rakam olarak gösterir", () => {
    render(<Harness g0={[k(1, { sonOdemeTarihi: "2026-09-20" }), k(2), k(3)]} />);
    expect(sayilar()).toEqual([1, 2]);
    expect(kart().textContent).toMatch(/Vadesi geçmiş/);
    expect(kart().textContent).toMatch(/Yaklaşan \(7 gün içinde\)/);
  });
  it("AC-3 / AC-4 / AC-26: geçmiş ve yaklaşan ayrı bölümlerde; bugün vadeli 'bugün' etiketiyle yaklaşanda", () => {
    render(<Harness g0={[k(1, { sonOdemeTarihi: "2026-09-23" }), k(2, { sonOdemeTarihi: "2026-09-24" })]} />);
    ac();
    const gecmis = screen.getByTestId("hatirlatma-bolum-gecmis"), yaklasan = screen.getByTestId("hatirlatma-bolum-yaklasan");
    expect(within(gecmis).getByText("1 gün geçti")).toBeTruthy();
    expect(within(yaklasan).getByText("bugün")).toBeTruthy();
    expect(gecmis.getAttribute("style")).not.toBe(yaklasan.getAttribute("style"));
  });
  it("AC-10 / AC-18: satırda taraf, ödenecek tutar (başlıkta yazar), vade ve gün farkı", () => {
    render(<Harness g0={[k(1)]} />);
    ac();
    const b = screen.getByTestId("hatirlatma-bolum-yaklasan");
    expect(within(b).getByText("Ödenecek tutar")).toBeTruthy();
    const satir = within(b).getByTestId("hatirlatma-satiri");
    expect(within(satir).getByText("Demir Bant")).toBeTruthy();
    expect(within(satir).getByText("12.000 ₺")).toBeTruthy();
    expect(satir.textContent).toMatch(/27[./]09[./]2026/);
    expect(within(satir).getByText("3 gün kaldı")).toBeTruthy();
  });
  it("AC-8: Çek yöntemli kalemde tarih 'Çek vadesi' olarak adlandırılır", () => {
    render(<Harness g0={[k(1, { odemeYontemi: "Çek" })]} />);
    ac();
    expect(within(screen.getByTestId("hatirlatma-satiri")).getByText("Çek vadesi")).toBeTruthy();
  });
  // Spec 0024 R17 (Q5, onaylı istisna): "Ödendi" tutarı kalanla dolu ödeme penceresini açar; kayıt bir harekettir.
  it("AC-6 / R17: Ödendi → pencere kalanla dolu; kaydedince kart sayısı bir azalır, satır düşer, hareket yazılır", () => {
    let hs;
    render(<Harness g0={[k(1), k(2)]} onState={(g, h) => { hs = h; }} />);
    expect(sayilar()).toEqual([0, 2]);
    ac();
    fireEvent.click(within(screen.getAllByTestId("hatirlatma-satiri")[0]).getByTitle("Ödeme kaydet"));
    expect(screen.getByLabelText("Ödeme tutarı").value).toBe("12.000"); // spec 0045 R1: görünüm binlik noktalı
    fireEvent.click(screen.getByText("Ödemeyi Kaydet"));
    expect(screen.getAllByTestId("hatirlatma-satiri")).toHaveLength(1);
    expect(sayilar()).toEqual([0, 1]);
    expect(hs).toEqual([expect.objectContaining({ tur: "odeme", giderId: 1, taksitId: null, tutar: 12000, tarih: "2026-09-24", hesapId: null })]);
  });
  it("R17 / AC-5: kısmi ödeme kalemi hatırlatıcıda tutar, ödenecek kalanla kalır", () => {
    render(<Harness g0={[k(1)]} />);
    ac();
    fireEvent.click(screen.getByTitle("Ödeme kaydet"));
    fireEvent.change(screen.getByLabelText("Ödeme tutarı"), { target: { value: "2.000" } });
    fireEvent.click(screen.getByText("Ödemeyi Kaydet"));
    expect(sayilar()).toEqual([0, 1]);
    expect(screen.getByTestId("hatirlatma-satiri").textContent).toMatch(/10\.000 ₺/);
  });
  it("AC-24: gider_odeme izni yoksa liste görünür, Ödendi düğmesi görünmez", () => {
    const perms = { role: "user", permissions: JSON.stringify({ tabs: ["dashboard", "gider"], giderActions: ["gider_add"] }) };
    render(<Harness g0={[k(1)]} perms={perms} />);
    ac();
    expect(screen.getByTestId("hatirlatma-satiri")).toBeTruthy();
    expect(screen.queryByTitle("Ödeme kaydet")).toBeNull();
  });
  it("AC-13: kapsam boşsa kart 0 · 0, pencerede boş durum", () => {
    render(<Harness g0={[k(1, { sonOdemeTarihi: "" })]} />);
    expect(sayilar()).toEqual([0, 0]);
    ac();
    expect(screen.getByTestId("hatirlatma-bos").textContent).toMatch(/Hatırlatılacak ödeme yok/);
  });
  it("AC-17: personel kalemleri tek satırda, adlar yalnız açınca", () => {
    render(<Harness g0={[k(1, { turId: 3, calisanId: 7, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 5000, tedarikciId: null }),
      k(2, { turId: 3, calisanId: 8, calisanAd: "Ayşe Kaya", resmiTutar: 20000, eldenTutar: 0, tedarikciId: null })]} />);
    ac();
    const p = screen.getByTestId("hatirlatma-personel");
    expect(p.textContent).toMatch(/Çalışanlar · 2 kalem/);
    expect(p.textContent).toMatch(/55\.000 ₺/);
    expect(screen.queryByText("Hasan Çelik")).toBeNull();
    fireEvent.click(within(p).getByText(/Çalışanları göster/));
    expect(screen.getByText("Hasan Çelik")).toBeTruthy();
    expect(screen.getByText("Ayşe Kaya")).toBeTruthy();
  });
  it("AC-16: gider yetkisi yoksa kart ve sayılar hiç çizilmez", () => {
    render(<Harness g0={[k(1)]} giderYetki={false} />);
    expect(screen.queryByTestId("odeme-hatirlatma-karti")).toBeNull();
    expect(document.body.textContent).not.toMatch(/Gider Ödemeleri|Vadesi geçmiş/);
  });
  it("AC-15: ses çalmaz, açılışta pencere açmaz, bildirim göndermez", () => {
    const audio = vi.fn(), notification = vi.fn(), acPencere = vi.fn();
    vi.stubGlobal("Audio", audio); vi.stubGlobal("Notification", notification);
    const eskiOpen = window.open; window.open = acPencere;
    render(<Harness g0={[k(1, { sonOdemeTarihi: "2026-09-01" }), k(2)]} />);
    act(() => { vi.advanceTimersByTime(5 * 60 * 1000); });
    expect(screen.queryByTestId("odeme-hatirlatma-listesi")).toBeNull();
    expect(audio).not.toHaveBeenCalled();
    expect(notification).not.toHaveBeenCalled();
    expect(acPencere).not.toHaveBeenCalled();
    window.open = eskiOpen;
  });
  it("R2: 'Giderlerde Görüntüle' pencereyi kapatıp hatırlatma süzgeciyle Giderler'e götürür", () => {
    const git = vi.fn();
    render(<Harness g0={[k(1)]} onGit={git} />);
    ac();
    fireEvent.click(screen.getByText("Giderlerde Görüntüle"));
    expect(git).toHaveBeenCalled();
    expect(screen.queryByTestId("odeme-hatirlatma-listesi")).toBeNull();
  });
  it("AC-22: uygulama açıkken gün dönünce kart kendiliğinden güncellenir (bugün → vadesi geçmiş)", () => {
    vi.setSystemTime(new Date(2026, 8, 24, 23, 59, 30));
    render(<Harness g0={[k(1, { sonOdemeTarihi: "2026-09-24" })]} />);
    expect(sayilar()).toEqual([0, 1]);
    act(() => { vi.setSystemTime(new Date(2026, 8, 25, 0, 0, 40)); vi.advanceTimersByTime(60 * 1000); });
    expect(sayilar()).toEqual([1, 0]);
  });
  it("C3: pencere odaklanınca gün yenilenir", () => {
    render(<Harness g0={[k(1, { sonOdemeTarihi: "2026-09-24" })]} />);
    act(() => { vi.setSystemTime(new Date(2026, 8, 25, 8, 0, 0)); window.dispatchEvent(new Event("focus")); });
    expect(sayilar()).toEqual([1, 0]);
  });
});

describe("AC-14: Giderler süzgeci ile Anasayfa kartı aynı sayıyı verir", () => {
  const veri = [k(1, { sonOdemeTarihi: "2026-09-20", tarih: "2026-03-10" }), k(2), k(3, { sonOdemeTarihi: "2026-10-20" }), k(4, { odendi: true, sonOdemeTarihi: "2026-09-01" }),
    k(5, { turId: 3, calisanId: 7, calisanAd: "Hasan", resmiTutar: 1000, eldenTutar: 0, tedarikciId: null, sonOdemeTarihi: "2026-09-25" })];
  const giderlerCiz = (o = {}) => render(<Giderler giderler={veri} setGiderler={vi.fn()} giderTanimlari={[]} setGiderTanimlari={vi.fn()} giderTurleri={TUR}
    tedarikciler={TED} setTedarikciler={vi.fn()} standartGiderler={[]} setStandartGiderler={vi.fn()} calisanlar={[]} stock={[]} customers={[]}
    standardModels={[]} customModels={[]} appSettings={{ giderAyarlari: AYAR }} showToast={vi.fn()}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} {...o} />);
  it("süzgeç seçilince satırlar vurgulu, dönem seçici pasif ve açıklamalı, kalem sayısı = kartın iki sayısının toplamı", () => {
    // Spec 0024: 4 numaralı kalemin ödemesi harekettir; iki ekran aynı hareketlerden türetir.
    const H4 = [{ id: 904, tur: "odeme", giderId: 4, taksitId: null, tamKapatir: true, tarih: "2026-09-01", hesapId: null }];
    render(<Harness g0={veri} h0={H4} />);
    const [gecmis, yaklasan] = sayilar();
    cleanup();
    giderlerCiz({ hesapHareketleri: H4 });
    fireEvent.change(screen.getByLabelText("Ödeme filtresi"), { target: { value: "hatirlatma" } });
    const liste = screen.getByTestId("kalem-listesi");
    expect(liste.textContent).toContain(`· ${gecmis + yaklasan} kalem`);
    expect(screen.getByTestId("hatirlatma-modu").textContent).toMatch(/dönem filtresi devre dışı/);
    expect(screen.getByLabelText("Dönem ayı").closest("fieldset").disabled).toBe(true);
    expect(liste.querySelectorAll('tr[data-hatirlatma="gecmis"]').length).toBe(gecmis);
    // Mart tarihli (seçili ay dışında) vadesi geçmiş kalem de listede: dönemden bağımsız.
    expect(liste.textContent).toMatch(/10[./]03[./]2026/);
  });
  it("triyaj bulgu 1: seçili ay boşken (ayın başı) liste çizilmese de hatırlatma kapsamı Giderler'den açılır", () => {
    // Eylül'de hiç kalem yok: Mart'ta girilmiş, vadesi geçmiş ve yaklaşan iki kalem.
    const g = [k(1, { tarih: "2026-03-10", sonOdemeTarihi: "2026-09-20" }), k(2, { tarih: "2026-03-11", sonOdemeTarihi: "2026-09-27" })];
    giderlerCiz({ giderler: g });
    expect(screen.queryByTestId("kalem-listesi")).toBeNull();
    expect(screen.getByTestId("gider-bos-durum")).toBeTruthy();
    fireEvent.click(screen.getByTestId("hatirlatma-dugmesi"));
    expect(screen.getByTestId("hatirlatma-modu").textContent).toMatch(/2 kalem \(1 vadesi geçmiş, 1 yaklaşan\)/);
    expect(screen.getByTestId("kalem-listesi").textContent).toContain("· 2 kalem");
    fireEvent.click(screen.getByTestId("hatirlatma-dugmesi"));
    expect(screen.queryByTestId("hatirlatma-modu")).toBeNull();
  });
  it("triyaj bulgu 1: seçili dönem yürürlük ayından önceyken de düğme çalışır", () => {
    giderlerCiz();
    fireEvent.change(screen.getByLabelText("Dönem ayı"), { target: { value: "2025-06" } });
    expect(screen.getAllByText(/Gider verisi girilmemiş/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByTestId("hatirlatma-dugmesi"));
    expect(screen.getByTestId("hatirlatma-modu")).toBeTruthy();
    expect(screen.getByTestId("kalem-listesi")).toBeTruthy();
  });
  it("Anasayfa'dan gelince süzgeç açık başlar; başka seçenek seçilince dönem görünümüne döner", () => {
    giderlerCiz({ baslangicOdemeFiltresi: "hatirlatma" });
    expect(screen.getByTestId("hatirlatma-modu")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Ödeme filtresi"), { target: { value: "" } });
    expect(screen.queryByTestId("hatirlatma-modu")).toBeNull();
    expect(screen.getByLabelText("Dönem ayı").closest("fieldset")).toBeNull();
  });
});

// Spec 0021 R4, R14, AC-8/9/24: satır ödeme hedefi başına; "Ödendi" o hedefin en yakın taksitini işaretler.
describe("Spec 0021: taksitli kalem ve kiranın iki hedefi (Anasayfa)", () => {
  const TUR_KIRA = [...TUR, { id: 2, ad: "Kira", davranis: "kira" }];
  const sat = (id, hedef, sira, vade, tutar, odendi = false) => ({ id, hedef, sira, vade, tutar, odendi, odemeTarihi: odendi ? "2026-09-01" : null });
  // Spec 0024: taksit 101'in ödemesi bir harekettir (satır bayrağı doğruluk kaynağı değil).
  const H101 = [{ id: 901, tur: "odeme", giderId: 1, taksitId: 101, tutar: 4000, tarih: "2026-09-01", hesapId: null }];
  const KiraHarness = ({ g0, onState }) => <Harness g0={g0} h0={H101} onState={onState} turler={TUR_KIRA} onGit={vi.fn()} />;
  const taksitli = k(1, { sonOdemeTarihi: "", taksitler: [sat(101, "ana", 1, "2026-08-26", 4000, true), sat(102, "ana", 2, "2026-09-26", 4000), sat(103, "ana", 3, "2026-10-26", 4000)] });
  const kira = k(2, { turId: 2, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 0, sonOdemeTarihi: "2026-09-20",
    taksitler: [sat(201, "ana", 1, "2026-09-20", 16000), sat(202, "stopaj", 1, "2026-09-26", 4000)] });
  it("AC-9 / AC-24: taksitli kalem tek satır (Taksit 2/3), kira iki satır; kart kalem sayar", () => {
    render(<KiraHarness g0={[taksitli, kira]} />);
    expect(sayilar()).toEqual([1, 1]); // kira geçmişte (kiraya veren), taksitli yaklaşanda
    ac();
    const satirlar = screen.getAllByTestId("hatirlatma-satiri");
    expect(satirlar).toHaveLength(3);
    expect(satirlar.map(s => s.textContent).join("|")).toMatch(/Vergi dairesi/);
    expect(within(screen.getByTestId("hatirlatma-bolum-yaklasan")).getByText(/Taksit 2\/3/)).toBeTruthy();
  });
  it("AC-8 / R18: Ödendi o hedefin en yakın açık taksitine bağlı ödeme penceresini açar", () => {
    let hs;
    render(<KiraHarness g0={[taksitli, kira]} onState={(g, h) => { hs = h; }} />);
    ac();
    const vergi = screen.getAllByTestId("hatirlatma-satiri").find(s => /Vergi dairesi/.test(s.textContent));
    fireEvent.click(within(vergi).getByText(/Ödendi/));
    fireEvent.click(screen.getByText("Ödemeyi Kaydet"));
    expect(hs.slice(1)).toEqual([expect.objectContaining({ giderId: 2, taksitId: 202, tutar: 4000 })]);
    expect(screen.getAllByTestId("hatirlatma-satiri").some(s => /Vergi dairesi/.test(s.textContent))).toBe(false);
    const tak = screen.getAllByTestId("hatirlatma-satiri").find(s => /Taksit 2\/3/.test(s.textContent));
    fireEvent.click(within(tak).getByText(/Ödendi/));
    fireEvent.click(screen.getByText("Ödemeyi Kaydet"));
    expect(hs.slice(2)).toEqual([expect.objectContaining({ giderId: 1, taksitId: 102, tutar: 4000 })]);
  });
});
