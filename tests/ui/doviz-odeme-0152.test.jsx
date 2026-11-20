// @vitest-environment jsdom
// Spec 0152 A: döviz hesaptan gider ödemesi, arayüz. Gerçek Giderler (ödeme penceresi ve gider formu), durumlu düzenek; günün
// kuru prop'la (App'in dört yolu `doviz-odeme-0152-app`'te). Test adları AC-<n> taşır.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { Giderler } from "../../src/components/Giderler";
import * as D from "../../src/lib/doviz";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); });

const TURLER = [{ id: 1, ad: "Kira", davranis: "kira" }, { id: 4, ad: "Hammadde", davranis: "normal" }];
const TED = [{ id: 11, ad: "Yıldız Gayrimenkul" }];
const HESAP = [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, kapali: false },
  { id: 53, ad: "Dolar", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 1000, kapali: false },
  { id: 54, ad: "Kapalı Dolar", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 0, kapali: true },
  { id: 55, ad: "Dolar 2", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 0, kapali: false }];
const NORMAL = { id: 20, tarih: "2026-09-01", turId: 4, tutar: 3550, kdvOrani: 0, tedarikciId: 11, sonOdemeTarihi: "2026-09-30", modelSatirlari: [] };
const RATES = { usd: 35.5, eur: 38 };

function H({ g0 = [NORMAL], h0 = [], rates = RATES, ratesErr = false, onState }) {
  const [giderler, setGiderler] = useState(g0);
  const [hesapHareketleri, setHesapHareketleri] = useState(h0);
  const [cekler, setCekler] = useState([]);
  const [giderTanimlari, setGiderTanimlari] = useState([]);
  const [tedarikciler, setTedarikciler] = useState(TED);
  onState?.({ giderler, hesapHareketleri });
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri}
    giderTanimlari={giderTanimlari} setGiderTanimlari={setGiderTanimlari} giderTurleri={TURLER} tedarikciler={tedarikciler} setTedarikciler={setTedarikciler}
    calisanlar={[]} standardModels={[]} customModels={[]} rates={rates} ratesErr={ratesErr}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-06", stopajOrani: 20 } }} serverPermissions={null}
    kasaHesaplari={HESAP} kasaYetki cekler={cekler} setCekler={setCekler} payments={[]}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
}
const degis = (el, value) => fireEvent.change(el, { target: { value } });
const L = (ad) => screen.getByLabelText(ad);
const liste = () => screen.getByTestId("kalem-listesi");
const pencere = () => { fireEvent.click(within(liste()).getAllByTitle(/Ödeme kaydet|Ödemeleri görüntüle/)[0]); return screen.getByTestId("odeme-kayit-penceresi"); };
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /Ödemeyi Kaydet|Değişikliği Kaydet/ }));
const secenekler = (el) => [...el.querySelectorAll("option")].map(o => o.textContent);

describe("Spec 0152 A: ödeme penceresi", () => {
  it("AC-1 / AC-30 / AC-2 / AC-6 / AC-44: USD hesap listede; seçilince kur günün kuruyla dolu, döviz tutar kaydetmeden görünür, 'bugünün kuru' ibaresi", () => {
    render(<H />);
    const p = pencere();
    expect(secenekler(within(p).getByLabelText("Hesap"))).toEqual(["Hesap belirtilmedi", "Ziraat (Banka)", "Dolar (Banka · USD)", "Dolar 2 (Banka · USD)"]);
    expect(within(p).queryByTestId("doviz-kur")).toBeNull(); // AC-11: TL hesapta kur yok
    degis(within(p).getByLabelText("Hesap"), "53");
    expect(within(p).getByLabelText("Kur").value).toBe("35,5");
    expect(within(p).getByLabelText("Döviz tutar").value).toMatch(/^100(,00)?$/);
    expect(within(p).getByTestId("kur-bugun-ibaresi").textContent).toBe(D.ONERI_BUGUN_IBARESI);
  });
  it("AC-3 / AC-44: kur alınamadıysa ya da para biriminin kuru boşsa alan boş gelir ve nedeni yazar", () => {
    render(<H rates={null} ratesErr />);
    let p = pencere();
    degis(within(p).getByLabelText("Hesap"), "53");
    expect(within(p).getByLabelText("Kur").value).toBe("");
    expect(within(p).getByTestId("kur-oneri-nedeni").textContent).toBe(D.KUR_CEVRIMDISI);
    cleanup();
    render(<H rates={{ usd: null, eur: 38 }} />);
    p = pencere();
    degis(within(p).getByLabelText("Hesap"), "53");
    expect(within(p).getByTestId("kur-oneri-nedeni").textContent).toBe(D.KUR_ALINMADI);
  });
  it("AC-4 / AC-5: kur boşken ya da geçersizken kayıt yapılmaz, nedeni kur alanının altında", () => {
    let st;
    render(<H rates={null} onState={s => { st = s; }} />);
    const p = pencere();
    degis(within(p).getByLabelText("Hesap"), "53");
    kaydet();
    expect(st.hesapHareketleri).toEqual([]);
    expect(within(p).getByText(D.KUR_BOS_HATASI)).toBeTruthy();
    degis(within(p).getByLabelText("Kur"), "0");
    kaydet();
    expect(st.hesapHareketleri).toEqual([]);
    expect(within(p).getByText(D.KUR_POZITIF_HATASI)).toBeTruthy();
  });
  it("AC-7 / AC-8 / AC-34 / AC-52: döviz tutar yazılınca kur güncellenir; kayıt ekrandaki TL, döviz tutar ve kurla; iz ayrıntısında döviz", () => {
    let st;
    const audit = [];
    window.auditLog = { log: vi.fn((e) => { audit.push(e); }) };
    render(<H onState={s => { st = s; }} />);
    const p = pencere();
    degis(within(p).getByLabelText("Hesap"), "53");
    degis(within(p).getByLabelText("Döviz tutar"), "99,5");
    const kur = within(p).getByLabelText("Kur").value;
    expect(kur).toBe("35,678392");
    kaydet();
    expect(st.hesapHareketleri).toHaveLength(1);
    expect(st.hesapHareketleri[0]).toMatchObject({ tur: "odeme", tutar: 3550, dovizTutar: 99.5, kur: 35.678392, paraBirimi: "USD", hesapId: 53 });
    expect(JSON.parse(audit.find(a => a.action === "odendi").detail)).toMatchObject({ tutar: 3550, dovizTutar: 99.5, kur: 35.678392, paraBirimi: "USD" });
    delete window.auditLog;
  });
  it("AC-39 / R1/3: hesap boşaltılınca kur alanı çizilmez ve kaydedilen hesapsız ödemede döviz alanı yok", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    const p = pencere();
    degis(within(p).getByLabelText("Hesap"), "53");
    degis(within(p).getByLabelText("Hesap"), "");
    expect(within(p).queryByTestId("doviz-kur")).toBeNull();
    kaydet();
    const m = st.hesapHareketleri[0];
    expect(m).toMatchObject({ tutar: 3550, hesapId: null });
    for (const a of D.DOVIZ_ALANLARI) expect(m).not.toHaveProperty(a);
  });
  it("AC-46: döviz hesap seçili satırda çek yöntemleri listede yok ve nedeni yazar; TL'de var", () => {
    render(<H />);
    const p = pencere();
    const yontem = within(p).getByLabelText("Ödeme yöntemi");
    expect(secenekler(yontem)).toContain("Çek (ciro)");
    degis(within(p).getByLabelText("Hesap"), "53");
    expect(secenekler(within(p).getByLabelText("Ödeme yöntemi"))).not.toContain("Çek (ciro)");
    expect(secenekler(within(p).getByLabelText("Ödeme yöntemi"))).not.toContain("Çek (kendi)");
    expect(within(p).getByTestId("cek-doviz-nedeni").textContent).toBe(D.CEK_DOVIZ_NEDENI);
  });
  it("AC-13 / AC-41: döviz ödemenin düzenlemesi kayıtlı kurla açılır (günün kuru farklı olsa da); TL hesaba çevrilince döviz alanları silinir", () => {
    let st;
    const m = { id: 700, tur: "odeme", tarih: "2026-09-10", tutar: 1775, yontem: "Havale", hesapId: 53, giderId: 20, taksitId: null, aciklama: "", dovizTutar: 50, kur: 35.5, paraBirimi: "USD" };
    render(<H h0={[m]} rates={{ usd: 40, eur: 42 }} onState={s => { st = s; }} />);
    const p = pencere();
    fireEvent.click(within(p).getByTitle("Ödemeyi düzenle"));
    const d = screen.getByTestId("odeme-kayit-penceresi");
    expect(within(d).getByLabelText("Kur").value).toBe("35,5");
    expect(within(d).getByLabelText("Döviz tutar").value).toMatch(/^50(,00)?$/);
    degis(within(d).getByLabelText("Hesap"), "51");
    kaydet();
    const g = st.hesapHareketleri.find(x => x.id === 700);
    expect(g).toMatchObject({ hesapId: 51, tutar: 1775 });
    for (const a of D.DOVIZ_ALANLARI) expect(g).not.toHaveProperty(a);
  });
  it("AC-41 / AC-13 / R14 (triyaj): düzenlemede aynı para birimindeki başka hesaba geçince kayıtlı kur ve döviz tutar korunur (günün kuru varken de, çevrimdışıyken de)", () => {
    const m = { id: 701, tur: "odeme", tarih: "2026-09-10", tutar: 1775, yontem: "Havale", hesapId: 53, giderId: 20, taksitId: null, aciklama: "", dovizTutar: 50.03, kur: 35.478713, paraBirimi: "USD" };
    for (const [rates, ratesErr] of [[{ usd: 42, eur: 44 }, false], [null, true]]) {
      let st;
      render(<H h0={[m]} rates={rates} ratesErr={ratesErr} onState={s => { st = s; }} />);
      fireEvent.click(within(pencere()).getByTitle("Ödemeyi düzenle"));
      const d = screen.getByTestId("odeme-kayit-penceresi");
      degis(within(d).getByLabelText("Hesap"), "55");
      expect(within(d).getByLabelText("Kur").value).toBe("35,478713");
      expect(within(d).getByLabelText("Döviz tutar").value).toBe("50,03");
      kaydet();
      expect(st.hesapHareketleri.find(x => x.id === 701)).toMatchObject({ hesapId: 55, tutar: 1775, dovizTutar: 50.03, kur: 35.478713, paraBirimi: "USD" });
      cleanup();
    }
  });
  it("AC-52 / R14/4 (triyaj): ödeme penceresinden silinen döviz ödemenin izi döviz ayrıntısını taşır", () => {
    const audit = [];
    window.auditLog = { log: vi.fn((e) => { audit.push(e); }) };
    const m = { id: 702, tur: "odeme", tarih: "2026-09-10", tutar: 1775, yontem: "Havale", hesapId: 53, giderId: 20, taksitId: null, aciklama: "", dovizTutar: 50, kur: 35.5, paraBirimi: "USD" };
    render(<H h0={[m]} />);
    fireEvent.click(within(pencere()).getByTitle("Ödemeyi sil"));
    fireEvent.click(screen.getByRole("button", { name: "Ödemeyi Sil" }));
    expect(JSON.parse(audit.find(a => a.action === "odeme_iptal").detail)).toMatchObject({ tutar: 1775, dovizTutar: 50, kur: 35.5, paraBirimi: "USD" });
    delete window.auditLog;
  });
});

describe("Spec 0152 A: gider formu", () => {
  it("AC-30 / AC-45 / AC-33: formun ödeme bölümünde USD hesap var; 'Hepsini ödendi işaretle' döviz satırın kurunu öneriyle doldurur", () => {
    render(<H g0={[]} />);
    fireEvent.click(screen.getAllByRole("button", { name: /Yeni Gider/ })[0]);
    degis(L("Gider türü *"), "4");
    degis(L("Tutar"), "3.550");
    fireEvent.click(L("Tedarikçiye ödendi"));
    const hesap = L("Tedarikçiye hesabı");
    expect(secenekler(hesap)).toContain("Dolar (Banka · USD)");
    degis(hesap, "53");
    degis(L("Tedarikçiye ödeme tutarı"), "");
    fireEvent.click(screen.getByRole("button", { name: /Hepsini ödendi işaretle/ }));
    expect(L("Tedarikçiye kuru").value).toBe("35,5");
    expect(L("Tedarikçiye döviz tutarı").value).toMatch(/^120(,00)?$/); // KDV dahil 4.260 TL ÷ 35,5
  });
});
