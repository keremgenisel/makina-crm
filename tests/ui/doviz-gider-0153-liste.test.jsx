// @vitest-environment jsdom
// Spec 0153 L: döviz kalemin listelerde görünüşü. Dönem Raporu kalem listesi ve borç özeti, açık kalemler, tedarikçi ekstresi
// (gerçek Giderler), Anasayfa ödeme hatırlatma penceresi, Kasa'nın hareket ve hesapsız listesi. Test adları AC-<n> taşır.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { Giderler } from "../../src/components/Giderler";
import { Kasa } from "../../src/components/Kasa";
import { OdemeHatirlatmaPenceresi } from "../../src/components/gider/OdemeHatirlatma";
import { odemeHatirlatmalari } from "../../src/lib/odemeHatirlatma";
import * as G from "../../src/lib/gider";
import { paraMetni } from "../../src/lib/doviz";
import { tl2 } from "../../src/lib/odemeYontemi";
import { fmtCur } from "../../src/lib/utils";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); });

const TURLER = [{ id: 4, ad: "Hammadde", davranis: "normal" }];
const turMap = G.turHaritasi(TURLER);
const TED = [{ id: 11, ad: "Rulman AG" }, { id: 12, ad: "Demir Bant" }];
const HESAP = [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, acilisTarihi: "2026-01-01", kapali: false },
  { id: 53, ad: "Dolar", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 5000, acilisTarihi: "2026-01-01", kapali: false }];
let nid = 7000;
const kalem = (o) => G.giderKalemDogrula({ tarih: "2026-09-01", turId: 4, kdvOrani: 0, sonOdemeTarihi: "2026-09-25", ...o }, { turMap, tedarikciler: TED, uid: () => ++nid }).kayit;
const DOVIZ = kalem({ id: 20, tutar: "1.200", tedarikciId: 11, aciklama: "İthal rulman", paraBirimi: "USD", kur: "40" });
const TL = kalem({ id: 21, tutar: "5.000", tedarikciId: 12, aciklama: "Bant" });
const ODEME = { id: 1, tur: "odeme", tarih: "2026-09-10", tutar: 20000, yontem: "Havale", hesapId: 53, giderId: 20, taksitId: null, dovizTutar: 500, kur: 40, paraBirimi: "USD" };

function GH({ g0 = [DOVIZ, TL], h0 = [ODEME] }) {
  const [giderler, setGiderler] = useState(g0);
  const [hesapHareketleri, setHesapHareketleri] = useState(h0);
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri}
    giderTanimlari={[]} setGiderTanimlari={vi.fn()} giderTurleri={TURLER} tedarikciler={TED} setTedarikciler={vi.fn()}
    calisanlar={[]} standardModels={[]} customModels={[]} rates={{ usd: 45, eur: 50 }} ratesErr={false}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-06" } }} serverPermissions={null}
    kasaHesaplari={HESAP} kasaYetki cekler={[]} setCekler={vi.fn()} payments={[]}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
}
const satir = (metin) => within(screen.getByTestId("kalem-listesi")).getAllByRole("row").find(r => r.textContent.includes(metin));

describe("Spec 0153 L: Giderler", () => {
  it("AC-14 / AC-54: kalem listesinde döviz kalemin tutarı kendi para biriminde, altında lira; alt toplam lira kalır; TL satır aynı", () => {
    render(<GH />);
    const d = satir("İthal rulman");
    expect(within(d).getByTestId("kalem-doviz-tutari").textContent).toBe(paraMetni(1200, "USD"));
    expect(within(d).getByTestId("kalem-lira-karsiligi").textContent).toBe(tl2(48000));
    expect(within(satir("Bant")).queryByTestId("kalem-doviz-tutari")).toBeNull();
    expect(screen.getByTestId("kalem-listesi").textContent).toContain(tl2(53000));
  });
  it("AC-27 / AC-57 / R22/3: borç özetinin tedarikçi satırı lira toplar ve 'döviz kalem içerir' der; açılınca kalemin döviz kalanı görünür; TL satırda düğme yok", () => {
    render(<GH />);
    const ozet = screen.getByTestId("borc-ozeti");
    const listeler = within(ozet).getAllByTestId("borc-doviz-kalemleri");
    expect(listeler).toHaveLength(1);
    expect(ozet.textContent).toContain(tl2(28000));
    expect(within(ozet).queryByTestId("borc-doviz-kalemi")).toBeNull();
    fireEvent.click(within(listeler[0]).getByRole("button", { name: /Kalemleri göster/ }));
    expect(within(ozet).getByTestId("borc-doviz-kalemi").textContent).toContain(paraMetni(700, "USD"));
  });
  it("AC-27 / AC-57: açık kalemler satırı kalemin para birimindeki kalanı yazar, toplam lira", () => {
    render(<GH />);
    fireEvent.click(screen.getByTestId("acik-kalemler-dugmesi"));
    expect(screen.getByTestId("acik-doviz-tutari").textContent).toBe(paraMetni(700, "USD"));
    expect(screen.getByTestId("acik-toplam").textContent).toBe(tl2(33000));
  });
  it("AC-28: tedarikçi ekstresinde döviz kalemin borç ve ödeme satırı kendi para birimindeki tutarı taşır, bakiye lira yürür", () => {
    render(<GH />);
    fireEvent.click(screen.getByText("Tedarikler ve Ekstre"));
    const sat = screen.getAllByRole("row").find(r => r.textContent.includes("Rulman AG"));
    fireEvent.click(within(sat).getByText("Ekstre"));
    const e = screen.getByTestId("ekstre-penceresi");
    expect(within(e).getAllByTestId("ekstre-doviz-tutari").map(x => x.textContent)).toEqual([paraMetni(1200, "USD"), paraMetni(500, "USD")]);
    expect(within(e).getByTestId("ekstre-ozet").textContent).toContain(tl2(28000));
  });
});

describe("Spec 0153 L: Anasayfa ve Kasa", () => {
  it("AC-27 / AC-57: ödeme hatırlatıcısının satırı kalemin para birimindeki tutarı yazar, altında lira", () => {
    const z = G.odemeleriUygula([DOVIZ, TL], [ODEME], turMap);
    const sonuc = odemeHatirlatmalari(z, { turler: TURLER, tedarikciler: TED, yururlukAy: "2026-06" }, "2026-09-23");
    render(<OdemeHatirlatmaPenceresi sonuc={sonuc} odendiYetkisi={false} onOdendi={vi.fn()} onGiderlereGit={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getAllByTestId("hatirlatma-doviz-tutari").map(x => x.textContent)).toEqual([paraMetni(700, "USD")]);
  });
  function KH({ h0 }) {
    const [kasaHesaplari, setKasaHesaplari] = useState(HESAP);
    const [hesapHareketleri, setHesapHareketleri] = useState(h0);
    return <Kasa aktifKullanici="kerem" kasaHesaplari={kasaHesaplari} setKasaHesaplari={setKasaHesaplari} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri}
      payments={[]} setPayments={vi.fn()} customers={[]} giderler={G.odemeleriUygula([DOVIZ], hesapHareketleri, turMap)} giderTurleri={TURLER} tedarikciler={TED}
      calisanlar={[]} yururlukAy="2026-01" cekler={[]} setCekler={vi.fn()} serverPermissions={null} showToast={vi.fn()}
      giderAyarlari={{ denemeDonemiBitis: "" }} kasaKapsamDisi={[]} setKasaKapsamDisi={vi.fn()} rates={{ usd: 45, eur: 50 }} ratesErr={false} />;
  }
  it("AC-29 / AC-51: Kasa hareket listesinde döviz kalemin ödemesi hesabın para biriminde çıkan tutar ve kuruyla; bakiye 500 USD azalır", () => {
    render(<KH h0={[ODEME]} />);
    fireEvent.click(screen.getAllByTestId("hesap-satiri").find(s => s.textContent.includes("Dolar")));
    const r = within(screen.getByTestId("hesap-hareketleri")).getAllByTestId("hareket-satiri").find(x => x.textContent.includes("kur"));
    expect(r.textContent).toContain(paraMetni(500, "USD"));
    expect(r.textContent).toContain("kur 40");
    expect(screen.getAllByTestId("hesap-satiri").find(s => s.textContent.includes("Dolar")).textContent).toMatch(/4\.500/);
  });
  it("AC-47 / AC-23: hesapsız döviz ödeme hesapsız listede kalemin para biriminde görünür ve hiçbir bakiyeye girmez", () => {
    render(<KH h0={[{ ...ODEME, hesapId: null }]} />);
    fireEvent.click(screen.getByRole("button", { name: /Ödemeleri göster/ }));
    expect(screen.getByText(fmtCur(500, "USD"))).toBeTruthy(); // Kasa listesinin 0152 biçimi
    expect(screen.getAllByTestId("hesap-satiri").find(s => s.textContent.includes("Dolar")).textContent).toMatch(/5\.000/);
  });
});
