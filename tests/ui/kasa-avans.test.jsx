// @vitest-environment jsdom
// Spec 0024 B: çalışan avansı (Kasa), avanstan mahsup (ödeme penceresi), tedarikçi ve çalışan ekstresi, silme uyarıları.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Kasa } from "../../src/components/Kasa";
import { Giderler } from "../../src/components/Giderler";
import { CalisanManager } from "../../src/components/CalisanManager";
import { odemeleriUygula, turHaritasi } from "../../src/lib/gider";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-28T10:00:00")); });

const TUR = [{ id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Elektrik", davranis: "normal" }];
const TED = [{ id: 12, ad: "Bölge Elektrik" }];
const CAL = [{ id: 7, ad: "Hasan Çelik" }, { id: 8, ad: "Eski Usta", deletedAt: "2026-09-01T00:00:00Z" }];
const HESAP = [{ id: 1, ad: "Merkez Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 20000, kapali: false }];
// 30.000 + 20.000 = 50.000 maaş
const MAAS = { id: 5, tarih: "2026-09-01", turId: 3, calisanId: 7, calisanAd: "Hasan Çelik", resmiTutar: 30000, eldenTutar: 20000, sonOdemeTarihi: "2026-09-30", odendi: false };
const ELEKTRIK = { id: 6, tarih: "2026-09-10", turId: 4, tutar: 1000, kdvOrani: 20, tedarikciId: 12, aciklama: "Eylül elektrik", sonOdemeTarihi: "2026-09-25", odendi: false };
const AVANS = { id: 61, tur: "avans", tarih: "2026-08-15", tutar: 8000, calisanId: 7, hesapId: 1 };
const turMap = turHaritasi(TUR);

function KasaHarness({ h0 = [], perms = null, onState }) {
  const [hesapHareketleri, setHesapHareketleri] = useState(h0);
  onState?.(hesapHareketleri);
  return <Kasa kasaHesaplari={HESAP} setKasaHesaplari={vi.fn()} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri}
    payments={[]} customers={[]} giderler={odemeleriUygula([MAAS], hesapHareketleri, turMap)} giderTurleri={TUR} tedarikciler={TED}
    calisanlar={CAL} yururlukAy="2026-01" serverPermissions={perms} showToast={vi.fn()} />;
}
function GiderHarness({ h0 = [], onState }) {
  const [giderler, setGiderler] = useState([MAAS, ELEKTRIK]);
  const [hesapHareketleri, setHesapHareketleri] = useState(h0);
  onState?.(hesapHareketleri);
  return <Giderler giderler={giderler} setGiderler={setGiderler} giderTanimlari={[]} setGiderTanimlari={vi.fn()} giderTurleri={TUR}
    tedarikciler={TED} setTedarikciler={vi.fn()} standartGiderler={[]} setStandartGiderler={vi.fn()} calisanlar={CAL} standardModels={[]} customModels={[]}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} serverPermissions={null} showToast={vi.fn()} kasaHesaplari={HESAP} kasaYetki
    hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} />;
}
const avansSatiri = (ad) => screen.getAllByTestId("avans-satiri").find(s => s.textContent.includes(ad));

describe("Spec 0024 B: Kasa › Çalışan avansları (R9, R11, C8)", () => {
  it("AC-13: avans verilince hesap bakiyesi düşer, açık avans doğar; gider kalemi doğmaz", () => {
    let h;
    render(<KasaHarness onState={s => { h = s; }} />);
    fireEvent.click(screen.getByText("Avans Ver"));
    const f = screen.getByTestId("avans-formu");
    fireEvent.change(screen.getByLabelText("Avans tutarı"), { target: { value: "8.000" } });
    fireEvent.change(within(f).getByLabelText("Hesap"), { target: { value: "1" } });
    fireEvent.click(screen.getByText("Avansı Kaydet"));
    expect(h).toEqual([expect.objectContaining({ tur: "avans", calisanId: 7, tutar: 8000, hesapId: 1, tarih: "2026-09-28" })]);
    expect(h[0].giderId).toBeUndefined();
    expect(avansSatiri("Hasan Çelik").textContent).toMatch(/8\.000/);
    expect(screen.getAllByTestId("hesap-satiri")[0].textContent).toMatch(/12\.000/);
  });
  it("C8 / AC-34: silinmiş çalışanın avansı rozetle görünür; avans verilen listede yalnız canlı çalışanlar", () => {
    render(<KasaHarness h0={[{ ...AVANS, id: 62, calisanId: 8 }]} />);
    expect(within(avansSatiri("Eski Usta")).getByText("Silinmiş")).toBeTruthy();
    fireEvent.click(screen.getByText("Avans Ver"));
    expect([...within(screen.getByTestId("avans-formu")).getByLabelText("Çalışan").querySelectorAll("option")].map(o => o.textContent)).toEqual(["Hasan Çelik"]);
  });
  it("AC-17: çalışan ekstresi avans ve maaşı tek net sütunda verir; avans ekstreden silinir", () => {
    let h;
    render(<KasaHarness h0={[AVANS]} onState={s => { h = s; }} />);
    fireEvent.click(within(avansSatiri("Hasan Çelik")).getByText("Ekstre"));
    const e = screen.getByTestId("ekstre-penceresi");
    expect(within(e).getAllByTestId("ekstre-satiri").map(s => s.textContent)).toEqual([
      expect.stringMatching(/Avans.*−.*8\.000.*-8\.000|Avans.*−.*8\.000/), expect.stringMatching(/Maaş.*resmi.*30\.000.*elden.*20\.000/),
    ]);
    expect(within(e).getByTestId("ekstre-ozet").textContent).toMatch(/Çalışana borcumuz.*42\.000.*Açık avans.*8\.000/);
    fireEvent.click(within(e).getByTitle("Avansı sil"));
    fireEvent.click(screen.getByText("Avansı Sil"));
    expect(h).toEqual([]);
  });
  it("B3: avans izni olmayan kullanıcı avans veremez; ekstreyi görür", () => {
    const perms = { role: "user", permissions: JSON.stringify({ tabs: ["gider", "finance"], giderActions: ["gider_odeme"] }) };
    render(<KasaHarness h0={[AVANS]} perms={perms} />);
    expect(screen.queryByText("Avans Ver")).toBeNull();
    fireEvent.click(within(avansSatiri("Hasan Çelik")).getByText("Ekstre"));
    expect(screen.queryByTitle("Avansı sil")).toBeNull();
  });
});

describe("Spec 0024 B: avanstan mahsup (R10, B1, B2)", () => {
  it("AC-14: personel kaleminin ödeme penceresinde mahsup; tutar kalan ile açık avansın küçüğüyle dolar, kalem kısmen ödenir, avans kapanır", () => {
    let h;
    render(<GiderHarness h0={[AVANS]} onState={s => { h = s; }} />);
    const liste = screen.getByTestId("kalem-listesi");
    fireEvent.click(within(liste).getByText(/Çalışanları göster/));
    const maasSatiri = () => within(screen.getByTestId("kalem-listesi")).getByText("Hasan Çelik").closest("tr");
    fireEvent.click(within(maasSatiri()).getByTitle("Ödeme kaydet"));
    expect(screen.getByTestId("acik-avans").textContent).toMatch(/8\.000/);
    fireEvent.click(screen.getByRole("button", { name: "Avanstan mahsup" }));
    expect(screen.getByLabelText("Ödeme tutarı").value).toBe("8.000"); // spec 0045 R1: görünüm binlik noktalı
    expect(screen.queryByText("Ödeme yöntemi")).toBeNull();
    fireEvent.click(screen.getByText("Mahsubu Kaydet"));
    expect(h[1]).toMatchObject({ tur: "mahsup", calisanId: 7, giderId: 5, tutar: 8000, hesapId: null });
    // Borç özeti ödenecek − ödeme − mahsup ile kalanı gösterir (42.000).
    expect(screen.getByTestId("borc-ozeti").textContent).toMatch(/42\.000/);
    fireEvent.click(within(maasSatiri()).getByTitle("Ödeme kaydet"));
    expect(screen.queryByRole("button", { name: "Avanstan mahsup" })).toBeNull(); // açık avans kalmadı
    expect(within(screen.getByTestId("odeme-kayit-listesi")).getByText(/Avanstan mahsup/)).toBeTruthy();
  });
  it("B2: açık avans yokken ve personel dışı kalemde mahsup kipi yok", () => {
    render(<GiderHarness />);
    fireEvent.click(within(screen.getByTestId("kalem-listesi")).getAllByTitle("Ödeme kaydet")[0]);
    expect(screen.queryByRole("button", { name: "Avanstan mahsup" })).toBeNull();
  });
});

describe("Spec 0024 B: tedarikçi ekstresi ve silme uyarıları (R12, C8, B10)", () => {
  it("AC-16: Tedarikçiler satırından ekstre; borç, ödeme ve kalan bakiye", () => {
    const h0 = [{ id: 71, tur: "odeme", tarih: "2026-09-15", tutar: 500, giderId: 6, hesapId: 1 }];
    render(<GiderHarness h0={h0} />);
    fireEvent.click(screen.getByText("Tedarikçiler"));
    fireEvent.click(screen.getByText("Ekstre"));
    const e = screen.getByTestId("ekstre-penceresi");
    expect(within(e).getAllByTestId("ekstre-satiri").map(s => s.textContent)).toEqual([
      expect.stringMatching(/10\/09\/2026Borç doğdu.*1\.200/), expect.stringMatching(/15\/09\/2026Ödeme.*Merkez Kasa.*700/),
    ]);
    expect(within(e).getByTestId("ekstre-ozet").textContent).toMatch(/Kalan borç.*700/);
    // Tarih aralığı: önceki hareketler devreden bakiye olur.
    fireEvent.change(within(e).getByLabelText("Başlangıç"), { target: { value: "2026-09-12" } });
    expect(within(e).getByTestId("ekstre-devir").textContent).toMatch(/1\.200/);
    fireEvent.click(screen.getByText("Kapat"));
    fireEvent.click(screen.getByTitle("Sil"));
    expect(screen.getByTestId("tedarikci-kalan-borc").textContent).toMatch(/700.*kalan borç/);
  });
  it("AC-34: açık avansı olan çalışanın silme onayında güçlü uyarı; gider yetkisi yoksa sızdırılmaz", () => {
    const ciz = (giderYetki) => render(<CalisanManager calisanlar={[CAL[0]]} setCalisanlar={vi.fn()} giderYetki={giderYetki} hesapHareketleri={[AVANS]} giderler={[MAAS]} />);
    ciz(true);
    fireEvent.click(document.querySelector("button.btn--danger"));
    expect(screen.getByText(/DİKKAT: Bu çalışanın .*8\.000.* açık avans borcu var/)).toBeTruthy();
    cleanup();
    ciz(false);
    fireEvent.click(document.querySelector("button.btn--danger"));
    expect(screen.queryByText(/açık avans borcu/)).toBeNull();
  });
});

describe("Spec 0024 B triyaj", () => {
  it("bulgu 1: mahsup edilmiş avans ekstreden silinemez; engelleyen mahsup listelenir, kayıt değişmez", () => {
    let h;
    const MAHSUP = { id: 62, tur: "mahsup", tarih: "2026-09-20", tutar: 8000, calisanId: 7, giderId: 5 };
    render(<KasaHarness h0={[AVANS, MAHSUP]} onState={s => { h = s; }} />);
    fireEvent.click(within(avansSatiri("Hasan Çelik")).getByText("Ekstre"));
    fireEvent.click(within(screen.getByTestId("ekstre-penceresi")).getByTitle("Avansı sil"));
    expect(screen.getByTestId("avans-silinemez").textContent).toMatch(/8\.000/);
    expect(screen.getAllByTestId("engelleyen-mahsup")).toHaveLength(1);
    expect(screen.queryByText("Avansı Sil")).toBeNull();
    fireEvent.click(screen.getByText("Tamam"));
    expect(h).toEqual([AVANS, MAHSUP]);
  });
  it("bulgu 2: gelecek tarihli maaş kaleminin ödeme penceresinde mahsup kipi yok", () => {
    const GELECEK = { ...MAAS, id: 9, tarih: "2026-10-01", sonOdemeTarihi: "2026-10-30" };
    function H() {
      const [hesapHareketleri, setHesapHareketleri] = useState([AVANS]);
      return <Giderler giderler={[GELECEK]} setGiderler={vi.fn()} giderTanimlari={[]} setGiderTanimlari={vi.fn()} giderTurleri={TUR}
        tedarikciler={TED} setTedarikciler={vi.fn()} standartGiderler={[]} setStandartGiderler={vi.fn()} calisanlar={CAL} standardModels={[]} customModels={[]}
        appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} serverPermissions={null} showToast={vi.fn()} kasaHesaplari={HESAP} kasaYetki
        hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri}
        satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} />;
    }
    render(<H />);
    fireEvent.click(screen.getByLabelText("Sonraki ay"));
    fireEvent.click(within(screen.getByTestId("kalem-listesi")).getByText(/Çalışanları göster/));
    fireEvent.click(within(screen.getByTestId("kalem-listesi")).getByTitle("Ödeme kaydet"));
    expect(screen.getByTestId("acik-avans")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Avanstan mahsup" })).toBeNull();
  });
});
