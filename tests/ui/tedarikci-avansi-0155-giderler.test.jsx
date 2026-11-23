// @vitest-environment jsdom
// Spec 0155: Giderler tarafı (ödeme penceresinin mahsup kipi, Tedarikler listesinin alacak satırı, silme pencereleri, iki yönlü
// ekstre) ve Çöp Kutusu (avans satırının adı, avanslı tedarikçinin kalıcı silinmemesi). Gerçek bileşenler. Test adları AC-<n>.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { useState } from "react";
import { Giderler } from "../../src/components/Giderler";
import { SettingsTrash } from "../../src/components/settings/SettingsTrash";
import { EKSTRE_METIN as EM } from "../../src/components/gider/EkstrePenceresi";
import { MAHSUP_KOVA_ETIKETI, MAHSUP_KILITLI_HATASI_TEDARIKCI } from "../../src/components/gider/OdemeGirisi";
import { ALACAK_ETIKETI, AVANSLI_SILME_NOTU } from "../../src/components/gider/Tedarikciler";
import { AVANSLI_TEDARIKCI_NEDENI } from "../../src/lib/kasa";

afterEach(() => { cleanup(); vi.useRealTimers(); delete window.crmLocks; });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-28T10:00:00")); });

const TUR = [{ id: 4, ad: "Hammadde", davranis: "normal" }, { id: 2, ad: "Kira", davranis: "kira" }];
const TED = [{ id: 11, ad: "Demir Bant" }, { id: 12, ad: "Yıldız" }];
const HESAP = [{ id: 1, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 20000, kapali: false }, { id: 2, ad: "Dolar", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 1000, kapali: false }];
const SAC = { id: 6, tarih: "2026-09-10", turId: 4, tutar: 10000, kdvOrani: 0, tedarikciId: 11, aciklama: "Sac levha", sonOdemeTarihi: "2026-09-30" };
const BANT = { id: 7, tarih: "2026-09-11", turId: 4, tutar: 500, kdvOrani: 0, tedarikciId: 12, aciklama: "Bant" };
const TL_AVANS = { id: 71, tur: "avans", tarih: "2026-09-12", tutar: 5000, tedarikciId: 11, hesapId: 1 };
const USD_AVANS = { id: 72, tur: "avans", tarih: "2026-09-13", tutar: 4000, dovizTutar: 100, kur: 40, paraBirimi: "USD", tedarikciId: 11, hesapId: 2 };

function GH({ h0 = [], onState, perms = null, ted = TED, onTed }) {
  const [giderler, setGiderler] = useState([SAC, BANT]);
  const [hesapHareketleri, setHesapHareketleri] = useState(h0);
  const [tedarikciler, setTedarikciler] = useState(ted);
  onState?.(hesapHareketleri); onTed?.(tedarikciler);
  return <Giderler giderler={giderler} setGiderler={setGiderler} giderTanimlari={[]} setGiderTanimlari={vi.fn()} giderTurleri={TUR}
    tedarikciler={tedarikciler} setTedarikciler={setTedarikciler} calisanlar={[]} standardModels={[]} customModels={[]}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} serverPermissions={perms} showToast={vi.fn()} kasaHesaplari={HESAP} kasaYetki
    hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri} rates={{ usd: 41, eur: 45 }} ratesErr={false} cekler={[]} setCekler={vi.fn()} payments={[]}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} />;
}
const kalemSatiri = (metin) => within(screen.getByTestId("kalem-listesi")).getAllByRole("row").find(r => r.textContent.includes(metin));
const pencereAc = (metin) => { fireEvent.click(within(kalemSatiri(metin)).getByTitle(/Ödeme kaydet|Ödemeleri görüntüle/)); return screen.getByTestId("odeme-kayit-penceresi"); };
const tedarikler = () => fireEvent.click(screen.getByText("Tedarikler ve Ekstre"));
const tedSatiri = (ad) => screen.getAllByRole("row").find(r => r.textContent.includes(ad) && r.querySelector("td"));

describe("Spec 0155: ödeme penceresinde tedarikçi avansından mahsup", () => {
  it("AC-11 / AC-19 (R9): tedarikçinin açık avansı varsa kip açılır; mahsup kaydedilir, hesap bakiyesi değişmez", () => {
    let h;
    render(<GH h0={[TL_AVANS]} onState={s => { h = s; }} />);
    const p = pencereAc("Sac levha");
    expect(within(p).getByTestId("acik-avans").textContent).toMatch(/₺5\.000,00/);
    fireEvent.click(within(p).getByRole("button", { name: "Avanstan mahsup" }));
    expect(within(p).getByLabelText("Ödeme tutarı").value).toBe("5.000");
    fireEvent.change(within(p).getByLabelText("Ödeme tutarı"), { target: { value: "3.000" } });
    fireEvent.click(screen.getByText("Mahsubu Kaydet"));
    expect(h.at(-1)).toMatchObject({ tur: "mahsup", tutar: 3000, tedarikciId: 11, giderId: 6, hesapId: null });
  });
  it("AC-59 / P2: iki kovada seçici çizilir; dolar kovasında birim USD, kur alanı günün kuruyla, varsayılan avansın biriminde", () => {
    let h;
    render(<GH h0={[TL_AVANS, USD_AVANS]} onState={s => { h = s; }} />);
    const p = pencereAc("Sac levha");
    fireEvent.click(within(p).getByRole("button", { name: "Avanstan mahsup" }));
    fireEvent.change(within(p).getByLabelText(MAHSUP_KOVA_ETIKETI), { target: { value: "USD" } });
    expect(within(p).getByText("Tutar (USD)")).toBeTruthy();
    expect(within(p).getByLabelText("Mahsup kuru").value).toBe("41");
    expect(within(p).getByLabelText("Ödeme tutarı").value).toBe("100");
    expect(within(p).getByTestId("mahsup-sinir-ipucu").textContent).toMatch(/Açık avans \$100,00; kalan ₺10\.000,00/);
    fireEvent.change(within(p).getByLabelText("Ödeme tutarı"), { target: { value: "50" } });
    fireEvent.click(screen.getByText("Mahsubu Kaydet"));
    expect(h.at(-1)).toMatchObject({ tur: "mahsup", dovizTutar: 50, kur: 41, paraBirimi: "USD", tutar: 2050 });
  });
  it("AC-60 (R9/2): mahsup kipi tedarikçinin kilidini alır; başkasındaysa çakışma ve tedarikçi metni", async () => {
    window.crmLocks = {
      acquire: vi.fn(async (t, id, force) => (t === "tedarikci" && String(id) === "11" && !force ? { ok: false, lockedBy: "ayse", lockedAt: "2026-09-28T09:00:00" } : { ok: true })),
      release: vi.fn(async () => {}), list: vi.fn(async () => []), releaseAll: vi.fn(async () => {}),
    };
    render(<GH h0={[TL_AVANS]} />);
    const p = pencereAc("Sac levha");
    fireEvent.click(within(p).getByRole("button", { name: "Avanstan mahsup" }));
    await screen.findByTestId("mahsup-kilitli");
    expect(window.crmLocks.acquire.mock.calls.some(c => c[0] === "tedarikci" && String(c[1]) === "11")).toBe(true);
    fireEvent.click(screen.getByText("Mahsubu Kaydet"));
    expect(screen.getByText(MAHSUP_KILITLI_HATASI_TEDARIKCI)).toBeTruthy();
  });
  // Triyaj bulgu 1 (R24, R25, AC-38): döviz avanstan lira kaleme mahsubun düzenlemesi kendi kovası, döviz tutarı ve kuruyla açılır.
  const USD_MAHSUP = { id: 81, tur: "mahsup", tarih: "2026-09-20", tutar: 2000, dovizTutar: 50, kur: 40, paraBirimi: "USD", tedarikciId: 11, giderId: 6, taksitId: null, hesapId: null, aciklama: "" };
  for (const [ad, h0] of [["TL avansı da varken", [TL_AVANS, USD_AVANS, USD_MAHSUP]], ["yalnız dolar avansıyla", [USD_AVANS, USD_MAHSUP]]]) {
    it(`bulgu 1: döviz avanstan mahsup düzenlenince dolar kovasında kalır (${ad})`, () => {
      let h;
      render(<GH h0={h0} onState={x => { h = x; }} />);
      const p = pencereAc("Sac levha");
      fireEvent.click(within(p).getByRole("button", { name: "Mahsubu düzenle" }));
      expect(within(p).queryByLabelText(MAHSUP_KOVA_ETIKETI)).toBeNull();
      expect(within(p).getByText("Tutar (USD)")).toBeTruthy();
      expect(within(p).getByLabelText("Ödeme tutarı").value).toBe("50");
      expect(within(p).getByLabelText("Mahsup kuru").value).toBe("40");
      fireEvent.change(within(p).getByPlaceholderText("İsteğe bağlı"), { target: { value: "Düzeltme" } });
      fireEvent.click(screen.getByText("Değişikliği Kaydet"));
      expect(h.find(m => m.id === 81)).toMatchObject({ tur: "mahsup", tutar: 2000, dovizTutar: 50, kur: 40, paraBirimi: "USD", aciklama: "Düzeltme", tedarikciId: 11 });
    });
  }
  it("R9: başka tedarikçinin avansı kalemde mahsup kipini açmaz", () => {
    render(<GH h0={[{ ...TL_AVANS, tedarikciId: 12 }]} />);
    const p = pencereAc("Sac levha");
    expect(within(p).queryByRole("button", { name: "Avanstan mahsup" })).toBeNull();
  });
});

describe("Spec 0155: Tedarikler ve ekstre", () => {
  it("AC-30 / AC-63 / AC-31: alacak 'Açık borç' hücresinin altında, sütun eklenmez; kart rakamı değişmez", () => {
    render(<GH h0={[TL_AVANS, USD_AVANS]} />);
    const kartOnce = screen.getByText(/Tedarikçilere açık borç/).closest("div").parentElement.textContent;
    tedarikler();
    const s = tedSatiri("Demir Bant");
    expect(within(s).getByTestId("tedarikci-alacak").textContent).toBe(`${ALACAK_ETIKETI} ₺5.000,00 · $100,00`);
    expect(within(s).getByTestId("tedarikci-alacak").closest("td").textContent).toMatch(/10\.000/);
    expect(within(tedSatiri("Yıldız")).queryByTestId("tedarikci-alacak")).toBeNull();
    expect(screen.getAllByRole("columnheader").length).toBe(6);
    cleanup();
    render(<GH h0={[]} />);
    expect(screen.getByText(/Tedarikçilere açık borç/).closest("div").parentElement.textContent).toBe(kartOnce);
  });
  it("AC-29 / AC-50 / AC-55: ekstrede mahsup kendi satırı, net etkisiz, 'Kalemde göster' çizilir; sütun 'Net bakiye'", () => {
    const m = { id: 80, tur: "mahsup", tarih: "2026-09-20", tutar: 2000, tedarikciId: 11, giderId: 6 };
    render(<GH h0={[TL_AVANS, m]} />);
    tedarikler();
    fireEvent.click(within(tedSatiri("Demir Bant")).getByText("Ekstre"));
    const e = screen.getByTestId("ekstre-penceresi");
    const sat = within(e).getAllByTestId("ekstre-satiri").find(x => x.getAttribute("data-ad") === "20/09/2026 Avanstan mahsup");
    expect(sat.textContent).toMatch(/net etkisiz/);
    expect(within(sat.closest('[data-testid="ekstre-kayit"]')).getByText(EM.kalemdeGoster)).toBeTruthy();
    expect(e.textContent).toMatch(/Net bakiye/);
    expect(within(e).getByTestId("ekstre-ozet").textContent).toMatch(/Bu tedarikçiye borcumuz 5\.000/);
  });
  it("AC-54: döviz avansın ekstre ayrıntısı hesaptan çıkan dövizi ve kuru yazar", () => {
    render(<GH h0={[USD_AVANS]} />);
    tedarikler();
    fireEvent.click(within(tedSatiri("Demir Bant")).getByText("Ekstre"));
    const s = within(screen.getByTestId("ekstre-penceresi")).getAllByTestId("ekstre-satiri").find(x => x.getAttribute("data-ad") === "13/09/2026 Avans");
    fireEvent.click(s);
    const a = s.closest('[data-testid="ekstre-kayit"]').querySelector('[data-testid="ekstre-ayrinti"]');
    expect(a.textContent).toMatch(/Hesaptan çıkan\$100,00/);
    expect(a.textContent).toMatch(/Kur1 USD = 40,00 TL/);
  });
  it("AC-37: yalnız avansı olan tedarikçi çöpe atılabilir, onay avansı söyler", () => {
    let t;
    render(<GH h0={[{ ...TL_AVANS, tedarikciId: 13 }]} ted={[...TED, { id: 13, ad: "Avanslı" }]} onTed={x => { t = x; }} />);
    tedarikler();
    fireEvent.click(within(tedSatiri("Avanslı")).getByTitle("Sil"));
    expect(screen.getByText(new RegExp(AVANSLI_SILME_NOTU.slice(0, 30)))).toBeTruthy();
    fireEvent.click(screen.getByText("Evet, Sil"));
    expect(t.find(x => x.id === 13).deletedAt).toBeTruthy();
  });
  it("AC-65: silinemez penceresinde bakiye alacak yönündeyse kendi cümlesi", () => {
    render(<GH h0={[{ ...TL_AVANS, tutar: 20000 }]} />);
    tedarikler();
    fireEvent.click(within(tedSatiri("Demir Bant")).getByTitle("Sil"));
    expect(screen.getByTestId("tedarikci-alacak-cumlesi").textContent).toMatch(/Bu tedarikçiden 10\.000 ₺ alacağımız var/);
  });
  it("AC-56: Giderler'de tedarikçi ekstresinden avans silinebilir; avans izni yoksa düğme yok", () => {
    let h;
    render(<GH h0={[TL_AVANS]} onState={s => { h = s; }} />);
    tedarikler();
    fireEvent.click(within(tedSatiri("Demir Bant")).getByText("Ekstre"));
    const e = screen.getByTestId("ekstre-penceresi");
    fireEvent.click(within(e).getByTitle("Avansı sil"));
    fireEvent.click(screen.getByText("Avansı Sil"));
    expect(h.find(m => m.id === 71).deletedAt).toBeTruthy();
    cleanup();
    render(<GH h0={[TL_AVANS]} perms={{ role: "user", permissions: JSON.stringify({ tabs: ["gider", "finance", "kasa"], giderActions: ["gider_odeme"] }) }} />);
    tedarikler();
    fireEvent.click(within(tedSatiri("Demir Bant")).getByText("Ekstre"));
    expect(within(screen.getByTestId("ekstre-penceresi")).queryByTitle("Avansı sil")).toBeNull();
  });
});

describe("Spec 0155: Çöp Kutusu", () => {
  const bos = [], noop = () => {};
  function TH({ hareketler: h0, tedarikciler: t0, showToast = noop, onTed }) {
    const [hareketler, setHareketler] = useState(h0);
    const [tedarikciler, setTedarikciler] = useState(t0);
    onTed?.(tedarikciler);
    return <SettingsTrash rawCustomers={bos} rawServices={bos} rawPartSales={bos} rawPayments={bos} rawDealers={bos} rawStock={bos} rawNotes={bos}
      rawKalipDefs={bos} rawParts={bos} rawCustomModels={bos} rawTeklifler={bos} rawFaturalar={bos} rawUretimFormlari={bos} rawGorusmeler={bos} rawDosyalar={bos}
      setCustomers={noop} setServices={noop} setPartSales={noop} setPayments={noop} setDealers={noop} setStock={noop} setNotes={noop} setKalipDefs={noop}
      setParts={noop} setCustomModels={noop} setTeklifler={noop} setFaturalar={noop} setUretimFormlari={noop} setGorusmeler={noop} setDosyalar={noop}
      appSettings={{}} showToast={showToast} giderYetki rawGiderler={[SAC]} setGiderler={noop} giderTurleri={TUR}
      rawTedarikciler={tedarikciler} setTedarikciler={setTedarikciler} rawUretimPartileri={bos} setUretimPartileri={noop} serverPermissions={null}
      rawHesapHareketleri={hareketler} setHesapHareketleri={setHareketler} cekler={bos} setCekler={noop}
      rawGiderTanimlari={bos} setGiderTanimlari={noop} setGiderTurleri={noop} rawKasaHesaplari={HESAP} setKasaHesaplari={noop} kasaVeriYetki />;
  }
  it("AC-36 (R20/2): çöpteki tedarikçi avansı satırı tedarikçinin adını ve kendi para birimini yazar; ödeme satırı adsız", () => {
    render(<TH hareketler={[{ ...USD_AVANS, deletedAt: "2026-09-20T00:00:00Z" }, { id: 90, tur: "odeme", tarih: "2026-09-14", tutar: 10, giderId: 6, deletedAt: "2026-09-20T00:00:00Z" }]} tedarikciler={TED} />);
    expect(screen.getByText("Demir Bant · 13/09/2026 · $100")).toBeTruthy();
    expect(screen.getByText("14/09/2026 · ₺10")).toBeTruthy();
  });
  it("AC-67: avanslı tedarikçi kalıcı silinemez (satırda neden, düğme yok); çöpü boşaltma onu korur", async () => {
    let t;
    const ted = [{ id: 11, ad: "Demir Bant", deletedAt: "2026-09-20T00:00:00Z" }, { id: 12, ad: "Yıldız", deletedAt: "2026-09-20T00:00:00Z" }];
    render(<TH hareketler={[TL_AVANS]} tedarikciler={ted} onTed={x => { t = x; }} />);
    const s = screen.getAllByRole("row").find(r => r.textContent.includes("Demir Bant"));
    expect(s.textContent).toContain(AVANSLI_TEDARIKCI_NEDENI);
    expect(within(s).queryByText("Kalıcı Sil")).toBeNull();
    fireEvent.click(screen.getByText(/Çöp Kutusunu Boşalt/));
    fireEvent.click(screen.getByText("Evet, Sil"));
    await waitFor(() => expect(t.map(x => x.id)).toEqual([11]));
  });
});
