// @vitest-environment jsdom
// Spec 0152 B ve C: Kasa'da "Virman / Bozdurma" penceresi, hareket listesinin döviz ibaresi, hesapsız liste, hesap silme, Çöp
// Kutusu ve avans. Gerçek Kasa (durumlu düzenek, 0151 emsali). Test adları AC-<n> taşır.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import fs from "node:fs";
import { Kasa } from "../../src/components/Kasa";
import { SettingsTrash } from "../../src/components/settings/SettingsTrash";
import { odemeleriUygula, turHaritasi } from "../../src/lib/gider";
import * as K from "../../src/lib/kasa";
import * as D from "../../src/lib/doviz";
import { fmtCur, fmtTR } from "../../src/lib/utils";

let audit = [];
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-20T10:00:00"));
  audit = [];
  window.auditLog = { log: vi.fn((e) => { audit.push(e); }) };
});
afterEach(() => { cleanup(); vi.useRealTimers(); delete window.auditLog; });

const TUR = [{ id: 4, ad: "Elektrik", davranis: "normal" }];
const turMap = turHaritasi(TUR);
const hesap = (id, ad, o = {}) => ({ id, ad, tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 10000, acilisTarihi: "2026-01-01", kapali: false, ...o });
const HESAPLAR = [hesap(1, "Akbank"), hesap(2, "Merkez Kasa", { tur: "kasa", acilisBakiyesi: 500 }), hesap(3, "Dolar", { paraBirimi: "USD", acilisBakiyesi: 1000 }),
  hesap(6, "Euro", { paraBirimi: "EUR", acilisBakiyesi: 500 }), hesap(7, "Dolar 2", { paraBirimi: "USD", acilisBakiyesi: 0 })];
const GIDER = [{ id: 20, tarih: "2026-11-01", turId: 4, tutar: 10000, kdvOrani: 0, aciklama: "Kasım elektrik", sonOdemeTarihi: "2026-11-30", modelSatirlari: [], taksitler: [] }];
const DOVIZ_ODEME = { id: 800, tur: "odeme", tarih: "2026-11-10", tutar: 1775, yontem: "Havale", hesapId: 3, giderId: 20, taksitId: null, aciklama: "", dovizTutar: 50, kur: 35.5, paraBirimi: "USD" };
const RATES = { usd: 35.5, eur: 38 };

function Harness({ h0 = HESAPLAR, m0 = [], onState, ham = null, ayar = { denemeDonemiBitis: "" }, rates = RATES, ratesErr = false }) {
  const [kasaHesaplari, setKasaHesaplari] = useState(h0);
  const [hesapHareketleri, setHesapHareketleri] = useState(m0);
  const [cekler, setCekler] = useState([]);
  const [kasaKapsamDisi, setKasaKapsamDisi] = useState([]);
  onState?.({ hesapHareketleri, kasaHesaplari });
  return <Kasa aktifKullanici="kerem" kasaHesaplari={kasaHesaplari} setKasaHesaplari={setKasaHesaplari} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri}
    payments={[]} setPayments={vi.fn()} customers={[]} giderler={odemeleriUygula(GIDER, hesapHareketleri, turMap)} giderTurleri={TUR} tedarikciler={[]}
    calisanlar={[{ id: 21, ad: "Ali" }]} yururlukAy="2026-01" cekler={cekler} setCekler={setCekler} serverPermissions={null} showToast={vi.fn()}
    giderAyarlari={ayar} kasaKapsamDisi={kasaKapsamDisi} setKasaKapsamDisi={setKasaKapsamDisi} hamKasaHesaplari={ham} rates={rates} ratesErr={ratesErr} />;
}
const hesapSec = (ad) => fireEvent.click(screen.getAllByTestId("hesap-satiri").find(s => s.textContent.trim().startsWith(ad) || s.querySelector("b,strong,span")?.textContent === ad));
const virmanAc = () => { fireEvent.click(screen.getByRole("button", { name: /^Virman/ })); return screen.getByTestId("virman-formu"); };
const sec = (f, etiket, deger) => {
  const s = [...f.querySelectorAll("select")].find(x => x.closest("label, div")?.textContent.includes(etiket)) || within(f).getByLabelText(etiket);
  fireEvent.change(s, { target: { value: String(deger) } });
};
const selectOf = (f, i) => f.querySelectorAll("select")[i];
const bakiye = (st, id) => K.hesapBakiyeleri(st.kasaHesaplari, st.hesapHareketleri.filter(m => !m.deletedAt), {}).get(String(id)).bakiyeK;
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /Virmanı Kaydet|Değişiklikleri Kaydet/ }));

describe("Spec 0152 B: Virman / Bozdurma penceresi", () => {
  it("AC-51 / AC-14 / AC-35 / AC-16 / AC-15: pencerenin adı 'Virman / Bozdurma'; farklı para biriminde kur bölümü öneriyle açılır, iki tutar görünür, kur değişince karşı tutar güncellenir; kayıt virman türüyle, bakiyeler kendi para biriminde", () => {
    let st;
    render(<Harness onState={s => { st = s; }} />);
    const f = virmanAc();
    expect(screen.getByText("Virman / Bozdurma")).toBeTruthy();
    fireEvent.change(selectOf(f, 0), { target: { value: "3" } });
    expect([...selectOf(f, 1).querySelectorAll("option")].map(o => o.textContent)).toEqual(["Hesap seçin", "Akbank (TRY)", "Merkez Kasa (TRY)", "Euro (EUR)", "Dolar 2 (USD)"]);
    fireEvent.change(within(f).getByLabelText("Virman tutarı"), { target: { value: "100" } });
    expect(within(f).queryByTestId("bozdurma-kur")).toBeNull();
    fireEvent.change(selectOf(f, 1), { target: { value: "1" } });
    expect(within(f).getByLabelText("Bozdurma kuru").value).toBe("35,5");
    expect(within(f).getByLabelText("Giren tutar").value).toMatch(/^3\.550(,00)?$/);
    fireEvent.change(within(f).getByLabelText("Bozdurma kuru"), { target: { value: "36" } });
    expect(within(f).getByLabelText("Giren tutar").value).toMatch(/^3\.600(,00)?$/);
    const [usd, tl] = [bakiye(st, 3), bakiye(st, 1)];
    kaydet();
    const m = st.hesapHareketleri[0];
    expect(m).toMatchObject({ tur: "virman", tutar: 100, karsiTutar: 3600, kur: 36, paraBirimi: "USD", karsiParaBirimi: "TRY", hesapId: 3, karsiHesapId: 1 });
    expect([bakiye(st, 3), bakiye(st, 1)]).toEqual([usd - 10000, tl + 360000]);
    // AC-52: iz ayrıntısında karşı bacak.
    expect(JSON.parse(audit.find(a => a.entity_type === "virman" || a.entity === "virman").detail)).toMatchObject({ tutar: 100, karsiTutar: 3600, kur: 36, karsiParaBirimi: "TRY" });
  });
  it("AC-41 / R14 (triyaj): giren hesap aynı para biriminde başka bir hesaba değişince kur ve giren tutar korunur; çift değişince öneri gelir", () => {
    render(<Harness />);
    const f = virmanAc();
    fireEvent.change(selectOf(f, 0), { target: { value: "3" } });
    fireEvent.change(selectOf(f, 1), { target: { value: "1" } });
    fireEvent.change(within(f).getByLabelText("Virman tutarı"), { target: { value: "100" } });
    fireEvent.change(within(f).getByLabelText("Bozdurma kuru"), { target: { value: "36" } });
    fireEvent.change(selectOf(f, 1), { target: { value: "2" } }); // TRY → başka TRY
    expect(within(f).getByLabelText("Bozdurma kuru").value).toBe("36");
    expect(within(f).getByLabelText("Giren tutar").value).toMatch(/^3\.600(,00)?$/);
    fireEvent.change(selectOf(f, 1), { target: { value: "6" } }); // USD → EUR: çift değişti
    expect(within(f).getByLabelText("Bozdurma kuru").value).not.toBe("36");
  });
  it("AC-41 / R14 (triyaj): kayıtlı bozdurmanın düzenlemesinde aynı cinsten giren hesaba geçiş kayıtlı kuru korur", () => {
    let st;
    const bz = { id: 810, tur: "virman", tarih: "2026-11-12", tutar: 100, hesapId: 3, karsiHesapId: 1, aciklama: "", karsiTutar: 3547.87, kur: 35.4787, paraBirimi: "USD", karsiParaBirimi: "TRY" };
    render(<Harness m0={[bz]} rates={{ usd: 42, eur: 44 }} onState={s => { st = s; }} />);
    hesapSec("Dolar");
    fireEvent.click(within(screen.getAllByTestId("hareket-satiri").find(s => s.textContent.includes("Bozdurma"))).getByTitle(/Düzenle/));
    const f = screen.getByTestId("virman-formu");
    fireEvent.change(selectOf(f, 1), { target: { value: "2" } });
    expect(within(f).getByLabelText("Bozdurma kuru").value).toBe("35,4787");
    kaydet();
    expect(st.hesapHareketleri.find(m => m.id === 810)).toMatchObject({ karsiHesapId: 2, karsiTutar: 3547.87, kur: 35.4787 });
  });
  it("AC-36: USD ile EUR arasında kur önerisi yok, nedeni yazar; kur girilmeden kayıt yapılmaz", () => {
    let st;
    render(<Harness onState={s => { st = s; }} />);
    const f = virmanAc();
    fireEvent.change(selectOf(f, 0), { target: { value: "3" } });
    fireEvent.change(selectOf(f, 1), { target: { value: "6" } });
    fireEvent.change(within(f).getByLabelText("Virman tutarı"), { target: { value: "100" } });
    expect(within(f).getByLabelText("Bozdurma kuru").value).toBe("");
    expect(within(f).getByTestId("bozdurma-kur-nedeni").textContent).toBe(D.IKI_DOVIZ_NEDENI);
    kaydet();
    expect(st.hesapHareketleri).toEqual([]);
    expect(within(f).getByText(D.KUR_BOS_HATASI)).toBeTruthy();
  });
  it("AC-17 / AC-27: aynı para birimindeki virmanda kur bölümü yok, kayıtta karşı bacak alanı yok", () => {
    let st;
    render(<Harness onState={s => { st = s; }} />);
    const f = virmanAc();
    fireEvent.change(selectOf(f, 0), { target: { value: "1" } });
    fireEvent.change(selectOf(f, 1), { target: { value: "2" } });
    fireEvent.change(within(f).getByLabelText("Virman tutarı"), { target: { value: "100" } });
    expect(within(f).queryByTestId("bozdurma-kur")).toBeNull();
    kaydet();
    for (const a of D.DOVIZ_ALANLARI) expect(st.hesapHareketleri[0]).not.toHaveProperty(a);
  });
});

describe("Spec 0152 C: listeler, silme, çöp ve avans", () => {
  it("AC-21 / AC-49: döviz ödemenin Çıkan hücresi hesabın para biriminde, Açıklama tek ibarede döviz tutar, kur ve TL karşılığı; bozdurma satırı 'Bozdurma'", () => {
    const bz = { id: 801, tur: "virman", tarih: "2026-11-11", tutar: 10, hesapId: 3, karsiHesapId: 1, karsiTutar: 355, kur: 35.5, paraBirimi: "USD", karsiParaBirimi: "TRY", aciklama: "" };
    render(<Harness m0={[DOVIZ_ODEME, bz]} />);
    hesapSec("Dolar");
    const satirlar = within(screen.getByTestId("hesap-hareketleri")).getAllByTestId("hareket-satiri");
    const od = satirlar.find(s => s.textContent.includes("Gider ödemesi"));
    expect(od.textContent).toContain(D.dovizOdemeIbaresi(DOVIZ_ODEME));
    expect(od.textContent).toContain(fmtCur(50, "USD").replace("$", ""));
    const b = satirlar.find(s => s.textContent.includes("Bozdurma"));
    expect(b.textContent).toContain(D.bozdurmaIbaresi(bz));
  });
  it("AC-42 / R14/3: hesabı kalıcı silinmiş döviz ödeme hesapsız listede kendi para biriminin sembolüyle", () => {
    render(<Harness h0={HESAPLAR.filter(h => h.id !== 3)} m0={[DOVIZ_ODEME]} />);
    fireEvent.click(screen.getByRole("button", { name: "Ödemeleri göster" }));
    const s = screen.getAllByTestId("hesapsiz-odeme")[0];
    expect(within(s).getByText(fmtCur(50, "USD"))).toBeTruthy(); // tutar hücresi (TL karşılığı yalnız açıklamada)
    expect(within(s).queryByText(fmtCur(1775, "TRY"))).toBeNull();
  });
  it("AC-40: hesap silme penceresinde döviz ödeme varken hesapsız bırakma nedenle engellenir; taşıma hedefi yalnız aynı para birimi", () => {
    render(<Harness m0={[DOVIZ_ODEME]} ayar={{ denemeDonemiBitis: "2027-01-01" }} />);
    fireEvent.click(screen.getByLabelText("Hesabı sil: Dolar"));
    const p = screen.getByTestId("hesap-sil-penceresi");
    const hedefler = [...within(p).getByLabelText("Taşınacak hesap").querySelectorAll("option")].map(o => o.textContent).filter(t => !/seçin/i.test(t));
    expect(hedefler).toHaveLength(1);
    expect(hedefler[0]).toContain("Dolar 2");
    fireEvent.click(within(p).getByRole("button", { name: "Hesapsız bırak" }));
    expect(within(p).getByTestId("hesap-sil-engel").textContent).toMatch(/döviz ödeme .*hesapsız bırakılamaz/);
  });
  it("AC-48: Çöp Kutusu döviz ödemeyi döviz tutar ve kendi sembolüyle gösterir", () => {
    const silinmis = { ...DOVIZ_ODEME, deletedAt: "2026-11-19T10:00:00.000Z" };
    const bos = [], noop = () => {};
    // Hesap kalıcı silinmiş (rawKasaHesaplari'nda yok): sembol kayıttaki para biriminden (R14/3).
    render(<SettingsTrash rawCustomers={bos} rawServices={bos} rawPartSales={bos} rawPayments={bos} rawDealers={bos} rawStock={bos} rawNotes={bos}
      rawKalipDefs={bos} rawParts={bos} rawCustomModels={bos} rawTeklifler={bos} rawFaturalar={bos} rawUretimFormlari={bos} rawGorusmeler={bos} rawDosyalar={bos}
      setCustomers={noop} setServices={noop} setPartSales={noop} setPayments={noop} setDealers={noop} setStock={noop} setNotes={noop} setKalipDefs={noop}
      setParts={noop} setCustomModels={noop} setTeklifler={noop} setFaturalar={noop} setUretimFormlari={noop} setGorusmeler={noop} setDosyalar={noop}
      appSettings={{}} showToast={noop} giderYetki rawGiderler={GIDER} setGiderler={noop} giderTurleri={TUR}
      rawTedarikciler={bos} setTedarikciler={noop} rawUretimPartileri={bos} setUretimPartileri={noop} serverPermissions={null}
      rawHesapHareketleri={[silinmis]} setHesapHareketleri={noop} cekler={bos} setCekler={noop}
      rawGiderTanimlari={bos} setGiderTanimlari={noop} setGiderTurleri={noop}
      rawKasaHesaplari={HESAPLAR.filter(h => h.id !== 3)} setKasaHesaplari={noop} kasaVeriYetki />);
    expect(screen.getByText(`${fmtTR("2026-11-10")} · ${fmtCur(50, "USD")}`)).toBeTruthy();
  });
  it("AC-47 / X1: avans penceresinin hesap listesinde döviz hesap yok (avans yalnız TL)", () => {
    expect(fs.readFileSync("src/components/kasa/CalisanAvanslari.jsx", "utf8")).toMatch(/secilebilirHesaplar\(hesaplar, "TRY"\)/);
  });
  it("AC-31 / P5: stopaj dönem ödemesinin hesap listesi TL kalır (kaynak taraması; motor tarafı doviz-odeme-0152 AC-46)", () => {
    expect(fs.readFileSync("src/components/gider/StopajDonemleri.jsx", "utf8")).toMatch(/secilebilirHesaplar\(hesaplar, "TRY"\)/);
  });
});
