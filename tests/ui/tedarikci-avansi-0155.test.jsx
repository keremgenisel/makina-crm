// @vitest-environment jsdom
// Spec 0155: Kasa › Tedarikçi avansları (bölüm, avans formu, geri ödeme, ekstre, silme) ve Kasa hareket listesinin tedarikçi
// dalı. Gerçek Kasa bileşeni. Test adları AC-<n> taşır.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { useState } from "react";

const loglar = [];
vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: (x) => { loglar.push(x); } }));
const { Kasa } = await import("../../src/components/Kasa");
const { TEDARIKCI_AVANSLARI_METIN: M } = await import("../../src/components/kasa/TedarikciAvanslari");
const { TEDARIKCI_AVANS_METIN: TA } = await import("../../src/components/kasa/CalisanAvanslari");
const { odemeleriUygula, turHaritasi } = await import("../../src/lib/gider");

afterEach(() => { cleanup(); vi.useRealTimers(); loglar.length = 0; delete window.crmLocks; });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-28T10:00:00")); });

const TUR = [{ id: 4, ad: "Hammadde", davranis: "normal" }];
const TED = [{ id: 11, ad: "Demir Bant" }, { id: 12, ad: "Eski Firma", deletedAt: "2026-09-01T00:00:00Z" }];
const HESAP = [{ id: 1, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 20000, kapali: false },
  { id: 2, ad: "Dolar", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 1000, kapali: false }];
const KALEM = { id: 6, tarih: "2026-09-10", turId: 4, tutar: 1000, kdvOrani: 0, tedarikciId: 11, aciklama: "Sac" };
const turMap = turHaritasi(TUR);
const AVANS = { id: 71, tur: "avans", tarih: "2026-09-12", tutar: 5000, tedarikciId: 11, hesapId: 1, yontem: "Havale" };

function KasaH({ h0 = [], onState, perms = null }) {
  const [hesapHareketleri, setHesapHareketleri] = useState(h0);
  onState?.(hesapHareketleri);
  return <Kasa kasaHesaplari={HESAP} setKasaHesaplari={vi.fn()} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri}
    payments={[]} customers={[]} giderler={odemeleriUygula([KALEM], hesapHareketleri, turMap)} giderTurleri={TUR} tedarikciler={TED.filter(t => !t.deletedAt)} tumTedarikciler={TED}
    calisanlar={[]} yururlukAy="2026-01" baslangicHesapId={1} serverPermissions={perms} showToast={vi.fn()} rates={{ usd: 40, eur: 45 }} ratesErr={false} />;
}
const bolum = () => screen.getByTestId("tedarikci-avanslari");
const satir = (pb) => within(bolum()).getAllByTestId("tedarikci-avans-satiri").find(s => s.textContent.includes(pb));

describe("Spec 0155: Kasa › Tedarikçi avansları", () => {
  it("AC-1 / AC-70: bölüm çizilir, açık avansı olan tedarikçiyi listeler ve Çalışan avanslarından sonra, hesapsız bloğun önünde durur", () => {
    render(<KasaH h0={[AVANS]} />);
    expect(satir("TRY").textContent).toMatch(/Demir Bant[\s\S]*₺5\.000,00/);
    const cal = screen.getByTestId("calisan-avanslari"), ted = bolum(), not = screen.getByTestId("hesapsiz-notu");
    expect(cal.compareDocumentPosition(ted) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(ted.compareDocumentPosition(not) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("AC-1 (boş): tedarikçi avansı yokken boş durum", () => {
    render(<KasaH />);
    expect(within(bolum()).getByTestId("bos-tedarikci-avans")).toBeTruthy();
  });
  it("AC-2 / AC-39: formdan TL avans kaydedilir, bakiye düşer; iz tedarikçi, tutar ve yönü taşır", () => {
    let h;
    render(<KasaH onState={s => { h = s; }} />);
    fireEvent.click(within(bolum()).getByText(M.avansVer));
    fireEvent.change(screen.getByLabelText(TA.tedarikci), { target: { value: "11" } });
    fireEvent.change(screen.getByLabelText("Avans tutarı"), { target: { value: "5.000" } });
    fireEvent.change(screen.getByLabelText("Avans hesabı"), { target: { value: "1" } });
    fireEvent.click(screen.getByText("Avansı Kaydet"));
    expect(h).toEqual([expect.objectContaining({ tur: "avans", tedarikciId: 11, tutar: 5000, hesapId: 1 })]);
    expect(h[0]).not.toHaveProperty("calisanId"); expect(h[0]).not.toHaveProperty("yon");
    expect(screen.getAllByTestId("hesap-satiri").find(x => x.textContent.includes("Ziraat")).textContent).toMatch(/15\.000/);
    expect(loglar.at(-1)).toMatchObject({ action: "olusturuldu", entity: "avans", entityName: "Demir Bant", detail: { tedarikci: "Demir Bant", tutar: 5000, yon: "cikan" } });
  });
  it("AC-9 / AC-10 / AC-39: döviz hesapta kur alanı günün kuruyla dolar, elle değişir; kayıt döviz alanlarını taşır, iz kuru yazar", () => {
    let h;
    render(<KasaH onState={s => { h = s; }} />);
    fireEvent.click(within(bolum()).getByText(M.avansVer));
    fireEvent.change(screen.getByLabelText(TA.tedarikci), { target: { value: "11" } });
    fireEvent.change(screen.getByLabelText("Avans hesabı"), { target: { value: "2" } });
    expect(screen.getByLabelText("Avans kuru").value).toBe("40");
    fireEvent.change(screen.getByLabelText("Avans kuru"), { target: { value: "41" } });
    fireEvent.change(screen.getByLabelText("Avans tutarı"), { target: { value: "100" } });
    fireEvent.click(screen.getByText("Avansı Kaydet"));
    expect(h[0]).toMatchObject({ tutar: 4100, dovizTutar: 100, kur: 41, paraBirimi: "USD", hesapId: 2 });
    expect(loglar.at(-1).detail).toMatchObject({ dovizTutar: 100, kur: 41, paraBirimi: "USD" });
    expect(satir("USD").textContent).toMatch(/\$100,00/);
  });
  it("AC-21 / AC-22 / AC-45: geri ödeme kovanın satırından girilir, hesap zorunlu, açık avansı aşamaz", () => {
    let h;
    render(<KasaH h0={[AVANS]} onState={s => { h = s; }} />);
    fireEvent.click(within(satir("TRY")).getByText(M.geriOdeme));
    expect(screen.getByText(TA.baslikGeri)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Avans tutarı"), { target: { value: "2.000" } });
    fireEvent.click(screen.getByText("Avansı Kaydet"));
    expect(screen.getByText("Geri ödeme bir hesaba girer; hesap seçin.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Avans hesabı"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Avans tutarı"), { target: { value: "6.000" } });
    fireEvent.click(screen.getByText("Avansı Kaydet"));
    expect(screen.getByText(/Geri ödeme açık avanstan fazla olamaz/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Avans tutarı"), { target: { value: "2.000" } });
    fireEvent.click(screen.getByText("Avansı Kaydet"));
    expect(h.at(-1)).toMatchObject({ tur: "avans", yon: "giren", tutar: 2000, hesapId: 1, tedarikciId: 11 });
    expect(within(satir("TRY")).getByTestId("tedarikci-acik-avans").textContent).toBe("₺3.000,00");
  });
  it("AC-68: çöpteki tedarikçinin avansı 'silinmiş' rozetiyle listelenir; geri ödeme düğmesi çizilmez", () => {
    render(<KasaH h0={[{ ...AVANS, tedarikciId: 12 }]} />);
    const s = satir("TRY");
    expect(s.textContent).toMatch(/Eski Firma[\s\S]*Silinmiş/);
    expect(within(s).queryByText(M.geriOdeme)).toBeNull();
  });
  it("AC-64: hareket listesinde tedarikçi avansı adıyla; düzenleme tedarikçi formunu açar, silme tedarikçi kuralıyla", async () => {
    const mahsup = { id: 72, tur: "mahsup", tarih: "2026-09-20", tutar: 4000, tedarikciId: 11, giderId: 6 };
    render(<KasaH h0={[AVANS, mahsup]} />);
    const row = screen.getAllByTestId("hareket-satiri").find(r => r.textContent.includes("Tedarikçi avansı"));
    expect(row.textContent).toMatch(/Demir Bant/);
    fireEvent.click(within(row).getByTitle("Düzenle"));
    expect(screen.getByText(TA.baslikDuzenle)).toBeTruthy();
    expect(screen.getByLabelText(TA.tedarikci).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Avans tutarı"), { target: { value: "3.000" } });
    fireEvent.click(screen.getByText("Değişiklikleri Kaydet"));
    expect(screen.getByText(/Bu avans en az ₺4\.000,00 olmalı/)).toBeTruthy();
  });
  it("AC-52 / AC-53 / AC-56: ekstrede geri ödeme kendi adıyla, özet iki yönlü ve açık avansı yazar, avans silinebilir", () => {
    const geri = { id: 73, tur: "avans", yon: "giren", tarih: "2026-09-15", tutar: 1000, tedarikciId: 11, hesapId: 1 };
    render(<KasaH h0={[AVANS, geri]} />);
    fireEvent.click(within(satir("TRY")).getByText(M.ekstre));
    const e = screen.getByTestId("ekstre-penceresi");
    expect(within(e).getAllByTestId("ekstre-satiri").map(x => x.getAttribute("data-ad"))).toEqual(expect.arrayContaining(["12/09/2026 Avans", "15/09/2026 Avans geri ödemesi"]));
    expect(within(e).getByTestId("ekstre-ozet").textContent).toMatch(/Bu tedarikçiden alacağımız 3\.000/);
    expect(within(e).getByTestId("ekstre-acik-avans").textContent).toMatch(/₺4\.000,00/);
    expect(e.textContent).toMatch(/Net bakiye/);
    expect(e.textContent).toMatch(/Mahsup borcu ve avansı birlikte kapatır/);
    const kayit = within(e).getAllByTestId("ekstre-satiri").find(x => x.getAttribute("data-ad") === "15/09/2026 Avans geri ödemesi").closest('[data-testid="ekstre-kayit"]');
    fireEvent.click(within(kayit).getByTitle("Avansı sil"));
    expect(screen.getByText(M.silBaslik)).toBeTruthy();
  });
  it("AC-56: avans izni yoksa ekstrede silme düğmesi çizilmez", () => {
    render(<KasaH h0={[AVANS]} perms={{ role: "user", permissions: JSON.stringify({ tabs: ["gider", "finance", "kasa"], giderActions: ["gider_odeme"] }) }} />);
    fireEvent.click(within(satir("TRY")).getByText(M.ekstre));
    expect(within(screen.getByTestId("ekstre-penceresi")).queryByTitle("Avansı sil")).toBeNull();
  });
  it("AC-72 (C13): avans formu tedarikçi kilidini alır", async () => {
    const c = [];
    window.crmLocks = { acquire: vi.fn(async (t, id) => { c.push([t, String(id)]); return { ok: true }; }), release: vi.fn(async () => {}), list: vi.fn(async () => []), releaseAll: vi.fn(async () => {}) };
    render(<KasaH />);
    fireEvent.click(within(bolum()).getByText(M.avansVer));
    fireEvent.change(screen.getByLabelText(TA.tedarikci), { target: { value: "11" } });
    await waitFor(() => expect(c).toContainEqual(["tedarikci", "11"]));
  });
});

// Triyaj bulgu 5: ekstrenin "bugün"ü yerel gündür (Kasa'nın useBugun'u); UTC today() gece 00:00–03:00 arası dünü verirdi ve
// bugün tarihli kalem ekstreye girmezdi. Çalışan avansları da aynı değeri alır.
describe("Spec 0155 triyaj: avans bölümlerinde yerel gün", () => {
  const tz = process.env.TZ;
  afterEach(() => { process.env.TZ = tz; });
  it("gece 01:30'da (İstanbul) bugün tarihli kalem tedarikçi ekstresine girer", () => {
    process.env.TZ = "Europe/Istanbul";
    vi.setSystemTime(new Date("2026-09-28T01:30:00+03:00"));
    function H() {
      const [h, setH] = useState([{ id: 71, tur: "avans", tarih: "2026-09-20", tutar: 500, tedarikciId: 11, hesapId: 1 }]);
      const k = { ...KALEM, id: 9, tarih: "2026-09-28", aciklama: "Bugünkü fatura" };
      return <Kasa kasaHesaplari={HESAP} setKasaHesaplari={vi.fn()} hesapHareketleri={h} setHesapHareketleri={setH} payments={[]} customers={[]}
        giderler={odemeleriUygula([k], h, turMap)} giderTurleri={TUR} tedarikciler={TED.filter(t => !t.deletedAt)} tumTedarikciler={TED}
        calisanlar={[]} yururlukAy="2026-01" baslangicHesapId={1} serverPermissions={null} showToast={vi.fn()} rates={null} ratesErr={false} />;
    }
    render(<H />);
    fireEvent.click(within(bolum()).getByText("Ekstre"));
    expect(screen.getByTestId("ekstre-penceresi").textContent).toMatch(/Bugünkü fatura/);
  });
  it("Kasa iki avans bölümüne de günü geçirir; bileşenlerin varsayılanı UTC today() değil", async () => {
    const fs = await import("node:fs");
    const kasa = fs.readFileSync("src/components/Kasa.jsx", "utf-8");
    expect(kasa).toMatch(/<CalisanAvanslari bugun=\{bugun\}/);
    expect(kasa).toMatch(/<TedarikciAvanslari bugun=\{bugun\}/);
    for (const f of ["src/components/kasa/TedarikciAvanslari.jsx", "src/components/kasa/CalisanAvanslari.jsx"])
      expect(fs.readFileSync(f, "utf-8"), f).not.toMatch(/bugun = today\(\)/);
  });
});
