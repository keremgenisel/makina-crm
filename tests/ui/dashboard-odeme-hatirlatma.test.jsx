// @vitest-environment jsdom
// Spec 0003: Anasayfa ödeme hatırlatıcısı kartı ve liste penceresi (R2–R4, R6, R9, R10).
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, fireEvent, within, act } from "@testing-library/react";
import { Dashboard } from "../../src/components/Dashboard";
import { Giderler } from "../../src/components/Giderler";

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] }); vi.setSystemTime(new Date(2026, 8, 24, 10, 0, 0)); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

const TUR = [{ id: 1, ad: "Genel", davranis: "normal" }, { id: 3, ad: "Personel", davranis: "personel" }];
const TED = [{ id: 11, ad: "Demir Bant" }];
const AYAR = { yururlukAy: "2026-01", hatirlatmaEsikGun: 7 };
const k = (id, o = {}) => ({ id, tarih: "2026-09-01", turId: 1, tutar: 10000, kdvOrani: 20, odendi: false, tedarikciId: 11, sonOdemeTarihi: "2026-09-27", ...o });
const ortak = { customers: [], dealers: [], services: [], stock: [], payments: [], partSales: [], yedekParcaSatislar: [], rates: null, teklifler: [] };

function Harness({ g0, giderYetki = true, perms = null, onGit, onState }) {
  const [giderler, setGiderler] = useState(g0);
  onState?.(giderler);
  return <Dashboard {...ortak} serverPermissions={perms} giderYetki={giderYetki} giderler={giderYetki ? giderler : []} setGiderler={setGiderler}
    giderTurleri={TUR} tedarikciler={TED} giderAyarlari={AYAR} onGoGiderHatirlatma={onGit} />;
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
  it("AC-6: pencerede Ödendi → kart sayısı bir azalır, satır düşer, ödeme tarihi yazılır", () => {
    let st;
    render(<Harness g0={[k(1), k(2)]} onState={s => { st = s; }} />);
    expect(sayilar()).toEqual([0, 2]);
    ac();
    fireEvent.click(within(screen.getAllByTestId("hatirlatma-satiri")[0]).getByTitle("Ödendi olarak işaretle"));
    expect(screen.getAllByTestId("hatirlatma-satiri")).toHaveLength(1);
    expect(sayilar()).toEqual([0, 1]);
    expect(st.find(x => x.id === 1)).toMatchObject({ odendi: true, odemeTarihi: "2026-09-24" });
  });
  it("triyaj bulgu 3: Ödendi durumu çevirmez; kalem arada başka yoldan ödenmişse ödenmiş kalır, tarihi korunur", () => {
    const setGiderler = vi.fn();
    render(<Dashboard {...ortak} giderYetki giderler={[k(1)]} setGiderler={setGiderler} giderTurleri={TUR} tedarikciler={TED} giderAyarlari={AYAR} />);
    ac();
    fireEvent.click(screen.getByTitle("Ödendi olarak işaretle"));
    const guncelle = setGiderler.mock.calls[0][0];
    // Ekrandaki satır eskiyken sunucudan gelen yeniden yükleme kalemi zaten ödemiş olsun.
    expect(guncelle([{ ...k(1), odendi: true, odemeTarihi: "2026-09-20" }])[0]).toMatchObject({ odendi: true, odemeTarihi: "2026-09-20" });
    expect(guncelle([k(1)])[0]).toMatchObject({ odendi: true, odemeTarihi: "2026-09-24" });
  });
  it("AC-24: gider_odeme izni yoksa liste görünür, Ödendi düğmesi görünmez", () => {
    const perms = { role: "user", permissions: JSON.stringify({ tabs: ["dashboard", "gider"], giderActions: ["gider_add"] }) };
    render(<Harness g0={[k(1)]} perms={perms} />);
    ac();
    expect(screen.getByTestId("hatirlatma-satiri")).toBeTruthy();
    expect(screen.queryByTitle("Ödendi olarak işaretle")).toBeNull();
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
    render(<Harness g0={veri} />);
    const [gecmis, yaklasan] = sayilar();
    cleanup();
    giderlerCiz();
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
