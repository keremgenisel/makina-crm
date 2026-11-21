// @vitest-environment jsdom
// Spec 0153 F ve U: gider formunun para birimi ve kur alanları, ödeme girişinin döviz kalem kipi. Gerçek Giderler (ödeme
// penceresi, gider formu, ödeme planı), durumlu düzenek; günün kuru prop'la. Test adları AC-<n> taşır.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { useState } from "react";
import fs from "node:fs";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { Giderler } from "../../src/components/Giderler";
import { OdemeGirisi, ilkGiris } from "../../src/components/gider/OdemeGirisi";
import { formOdemeHedefleri } from "../../src/lib/formOdemesi";
import * as G from "../../src/lib/gider";
import * as K from "../../src/lib/kasa";
import { paraMetni, KUR_CEVRIMDISI, ONERI_BUGUN_IBARESI, KUR_BOS_HATASI } from "../../src/lib/doviz";

afterEach(() => { cleanup(); vi.useRealTimers(); delete window.auditLog; });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); });

const TURLER = [{ id: 1, ad: "Kira", davranis: "kira" }, { id: 4, ad: "Hammadde", davranis: "normal" }];
const turMap = G.turHaritasi(TURLER);
const TED = [{ id: 11, ad: "Rulman AG" }];
const HESAP = [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, kapali: false },
  { id: 53, ad: "Dolar", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 5000, kapali: false },
  { id: 56, ad: "Euro", tur: "banka", paraBirimi: "EUR", acilisBakiyesi: 5000, kapali: false }];
const RATES = { usd: 35.5, eur: 38 };
let nid = 7000;
const dovizKalem = (o = {}) => G.giderKalemDogrula({ id: 20, tarih: "2026-09-01", turId: 4, tutar: "1.200", kdvOrani: 0, tedarikciId: 11, aciklama: "İthal rulman",
  sonOdemeTarihi: "2026-09-30", paraBirimi: "USD", kur: "40", ...o }, { turMap, tedarikciler: TED, uid: () => ++nid }).kayit;

function H({ g0 = [dovizKalem()], h0 = [], rates = RATES, ratesErr = false, onState }) {
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
const yeniForm = (tur = "4") => { fireEvent.click(screen.getAllByRole("button", { name: /Yeni Gider/ })[0]); degis(L("Gider türü *"), tur); };
const formuKaydet = () => fireEvent.click(screen.getByRole("button", { name: /^Kaydet$|Gideri Kaydet|Değişiklikleri Kaydet/ }));
const duzenle = () => fireEvent.click(within(liste()).getAllByTitle(/Düzenle/)[0]);
const secenekler = (el) => [...el.querySelectorAll("option")].map(o => o.textContent);

describe("Spec 0153 F: gider formu", () => {
  it("AC-1 / AC-2: normal davranışta TL, USD, EUR seçenekli para birimi seçici (varsayılan TL); kirada çizilmez", () => {
    render(<H g0={[]} />);
    yeniForm("4");
    expect(secenekler(L("Para birimi"))).toEqual(["TL", "USD", "EUR"]);
    expect(L("Para birimi").value).toBe("TRY");
    expect(screen.queryByTestId("kalem-kur-alani")).toBeNull();
    degis(L("Gider türü *"), "1");
    expect(screen.queryByLabelText("Para birimi")).toBeNull();
  });
  it("AC-3 / R11: tekrarlayan tanım formunda para birimi seçici yok (tanım lira kalır)", () => {
    expect(fs.readFileSync("src/components/settings/SettingsGiderTanimlari.jsx", "utf8")).not.toMatch(/Para birimi|paraBirimi/);
  });
  it("AC-4 / AC-6 / AC-42: USD seçilince 'Kur (1 USD = ? TL)' günün kuruyla dolu, 'bugünün kuru' ibaresi; tarih değişince öneri değişmez", () => {
    render(<H g0={[]} />);
    yeniForm();
    degis(L("Para birimi"), "USD");
    expect(within(screen.getByTestId("kalem-kur-alani")).getByText("Kur (1 USD = ? TL) *")).toBeTruthy();
    expect(L("Kalemin kuru").value).toBe("35,5");
    expect(screen.getByTestId("kalem-kur-bugun-ibaresi").textContent).toBe(ONERI_BUGUN_IBARESI);
    degis(L("Tarih *"), "2026-08-01");
    expect(L("Kalemin kuru").value).toBe("35,5");
  });
  it("AC-7 / AC-8 / AC-35: çevrimdışıyken kur boş ve nedeni yazar; elle yazılan kurla kaydedilir: 1.200 USD, kur 40, lira 48.000", () => {
    let st;
    render(<H g0={[]} rates={null} ratesErr onState={s => { st = s; }} />);
    yeniForm();
    degis(L("Para birimi"), "USD");
    expect(L("Kalemin kuru").value).toBe("");
    expect(screen.getByTestId("kalem-kur-oneri-nedeni").textContent).toBe(KUR_CEVRIMDISI);
    degis(L("Tutar"), "1.200");
    degis(L("Kalemin kuru"), "40");
    expect(screen.getByTestId("kalem-lira-karsiligi").textContent).toContain("48.000");
    formuKaydet();
    expect(st.giderler).toHaveLength(1);
    expect(st.giderler[0]).toMatchObject({ tutar: 48000, dovizTutar: 1200, kur: 40, paraBirimi: "USD" });
    expect(st.giderler[0]).not.toHaveProperty("kurKaynak");
    expect(st.giderler[0]).not.toHaveProperty("_kurDokunuldu");
  });
  it("AC-5 / AC-40: kur boş bırakılan döviz kalem kaydedilmez, hata kur alanında; yüzde elliden fazla sapan kur uyarı verir ve kaydı engellemez", () => {
    let st;
    render(<H g0={[]} rates={null} onState={s => { st = s; }} />);
    yeniForm();
    degis(L("Para birimi"), "USD");
    degis(L("Tutar"), "100");
    formuKaydet();
    expect(st.giderler).toHaveLength(0);
    expect(within(screen.getByTestId("kalem-kur-alani")).getByText(KUR_BOS_HATASI)).toBeTruthy();
    cleanup();
    render(<H g0={[]} onState={s => { st = s; }} />);
    yeniForm();
    degis(L("Para birimi"), "USD");
    degis(L("Tutar"), "100");
    degis(L("Kalemin kuru"), "60");
    expect(screen.getByTestId("kalem-kur-sapma").textContent).toMatch(/yüzde 50/);
    formuKaydet();
    expect(st.giderler[0]).toMatchObject({ kur: 60, tutar: 6000 });
  });
  it("AC-10 / AC-43: KDV dâhil 1.200 USD %20 → hariç 1.000 USD, lira 40.000, KDV 8.000; yuvarlama farkı kalemin para biriminde", () => {
    let st;
    render(<H g0={[]} onState={s => { st = s; }} />);
    yeniForm();
    degis(L("Para birimi"), "USD");
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "KDV yönü" })).getByText("KDV dâhil"));
    degis(L("KDV oranı"), "20");
    degis(L("Tutar"), "0,03");
    degis(L("Kalemin kuru"), "40");
    expect(screen.getByTestId("kdv-yuvarlama-farki").textContent).toContain(paraMetni(0.03, "USD"));
    degis(L("Tutar"), "1.200");
    expect(screen.getByTestId("ozet-kdv-haric").textContent).toContain("40.000");
    expect(screen.getByTestId("ozet-kdv").textContent).toContain("8.000");
    formuKaydet();
    expect(st.giderler[0]).toMatchObject({ dovizTutar: 1000, tutar: 40000, kdvYonu: "dahil" });
  });
  it("AC-12 / AC-44: ödeme almış döviz kalemde para birimi ve kur pasif ve nedenli; ödemesiz kalemde açık", () => {
    const o = { id: 1, tur: "odeme", tarih: "2026-09-10", tutar: 20000, yontem: "Havale", hesapId: 53, giderId: 20, taksitId: null, dovizTutar: 500, kur: 40, paraBirimi: "USD" };
    render(<H h0={[o]} />);
    duzenle();
    expect(L("Para birimi").disabled).toBe(true);
    expect(L("Kalemin kuru").disabled).toBe(true);
    expect(screen.getByTestId("doviz-kilit-nedeni").textContent).toBe(G.DOVIZ_KILIT_NEDENI);
    cleanup();
    render(<H h0={[{ ...o, deletedAt: "2026-09-11" }].filter(m => !m.deletedAt)} />);
    duzenle();
    expect(L("Para birimi").disabled).toBe(false);
  });
  it("AC-13 / AC-36: ödemesiz döviz kalem TL'ye çevrilip kaydedilince döviz tutar ve kur düşer, lira tutar formdaki rakam olur", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    duzenle();
    expect(L("Tutar").value).toBe("1.200");
    expect(L("Kalemin kuru").value).toBe("40");
    degis(L("Para birimi"), "TRY");
    formuKaydet();
    const k = st.giderler[0];
    expect(k.tutar).toBe(1200);
    for (const a of G.DOVIZ_KALEM_ALANLARI) expect(k, a).not.toHaveProperty(a);
  });
});

describe("Spec 0153 U: ödeme girişi", () => {
  it("AC-17 / AC-19: tutar kalemin para biriminde ve kalan o para biriminde; kur elle sorulmaz, kalemin kuru gösterilir", () => {
    render(<H />);
    const p = pencere();
    expect(screen.getByTestId("odeme-kayit-ozet").textContent).toContain(paraMetni(1200, "USD"));
    expect(within(p).getByLabelText("Ödeme tutarı").value).toBe("1.200");
    expect(within(p).queryByLabelText("Kur")).toBeNull();
    expect(within(p).getByTestId("doviz-kalem-kuru").textContent).toContain("1 USD = 40");
  });
  it("AC-18 / AC-48: döviz kalemde hesap listesi yalnız o para birimi ve hesapsız; neden yazar; TL kalem bütün açık hesapları görür", () => {
    render(<H />);
    let p = pencere();
    expect(secenekler(within(p).getByLabelText("Hesap"))).toEqual(["Hesap belirtilmedi", "Dolar (Banka · USD)"]);
    expect(within(p).getByTestId("doviz-kalem-hesap-nedeni").textContent).toBe(K.DOVIZ_KALEM_HESAP_NEDENI);
    cleanup();
    render(<H g0={[dovizKalem({ paraBirimi: "TRY", tutar: "1.000" })]} />);
    p = pencere();
    expect(secenekler(within(p).getByLabelText("Hesap"))).toEqual(["Hesap belirtilmedi", "Ziraat (Banka)", "Dolar (Banka · USD)", "Euro (Banka · EUR)"]);
    expect(within(p).queryByTestId("doviz-kalem-hesap-nedeni")).toBeNull();
  });
  it("AC-19 / triyaj: döviz kalemin satırında hesap seçilince 0152'nin kur alanları satıra yazılmaz (yalnız hesap)", () => {
    const kalem = G.odemeleriUygula([dovizKalem()], [], turMap)[0];
    const hedefler = formOdemeHedefleri(kalem, turMap);
    let giris;
    function OH() {
      const [g, setG] = useState(() => ilkGiris(hedefler, { tarih: "2026-09-23", kalem }));
      giris = g;
      return <OdemeGirisi kapsam="pencere" kalem={kalem} hedefler={hedefler} davranis="normal" turMap={turMap} giris={g} setGiris={setG}
        hesaplar={HESAP} hesapSecimi rates={{ usd: 45, eur: 50 }} />;
    }
    render(<OH />);
    degis(screen.getByLabelText("Hesap"), "53");
    expect(giris.satirlar[0].hesapId).toBe(53);
    for (const a of ["kur", "kurKaynak", "dovizTutar"]) expect(giris.satirlar[0], a).not.toHaveProperty(a);
  });
  it("AC-20 / AC-45: 500 USD ödeme → hareket lira 20.000 (kalemin kuru), döviz 500; kalan 700 USD", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    const p = pencere();
    degis(within(p).getByLabelText("Ödeme tutarı"), "500");
    degis(within(p).getByLabelText("Hesap"), "53");
    fireEvent.click(screen.getByRole("button", { name: /Ödemeyi Kaydet/ }));
    expect(st.hesapHareketleri[0]).toMatchObject({ tutar: 20000, dovizTutar: 500, kur: 40, paraBirimi: "USD", hesapId: 53 });
    pencere();
    expect(screen.getByTestId("odeme-kayit-ozet").textContent).toContain(paraMetni(700, "USD"));
    expect(within(screen.getByTestId("odeme-kayit-listesi")).getByText(paraMetni(500, "USD"))).toBeTruthy();
  });
  it("AC-23 / AC-47: hesapsız döviz ödeme kalemi kapatır ve üç alanı taşır", () => {
    let st;
    render(<H onState={s => { st = s; }} />);
    const p = pencere();
    degis(within(p).getByLabelText("Hesap"), "");
    fireEvent.click(screen.getByRole("button", { name: /Ödemeyi Kaydet/ }));
    expect(st.hesapHareketleri[0]).toMatchObject({ hesapId: null, tutar: 48000, dovizTutar: 1200, kur: 40, paraBirimi: "USD" });
    expect(G.odemeleriUygula(st.giderler, st.hesapHareketleri, turMap)[0].odendi).toBe(true);
  });
  it("AC-24: döviz kalemde 'Çek (ciro)' ve 'Çek (kendi)' seçilemez ve nedeni yazar", () => {
    render(<H />);
    const p = pencere();
    const y = secenekler(within(p).getByLabelText("Ödeme yöntemi"));
    expect(y).not.toContain("Çek (ciro)");
    expect(y).not.toContain("Çek (kendi)");
    expect(within(p).getByTestId("cek-doviz-nedeni").textContent).toBe(K.DOVIZ_KALEM_CEK_NEDENI);
  });
  it("AC-46: formda 'Hepsini ödendi işaretle' döviz kalemde kalemin para birimindeki kalanla doldurur; günün kuru satıra girmez", () => {
    render(<H g0={[]} rates={{ usd: 45, eur: 50 }} />);
    yeniForm();
    degis(L("Para birimi"), "USD");
    degis(L("Tutar"), "1.200");
    degis(L("Kalemin kuru"), "40");
    fireEvent.click(screen.getByRole("button", { name: "Hepsini ödendi işaretle" }));
    expect(L("Tedarikçiye ödeme tutarı").value).toBe("1.440"); // KDV hariç 1.200 + %20 KDV: ödenecek kalemin para biriminde (P7)
    expect(screen.queryByLabelText("Tedarikçiye kuru")).toBeNull();
  });
  it("AC-26 / AC-52: üç taksitli 1.200 USD kalemin taksitleri 400 USD görünür; bir taksidin dövizle ödenmesi o taksidi kapatır", () => {
    let st;
    render(<H g0={[dovizKalem({ taksitSayisi: 3, sonOdemeTarihi: "2026-10-01" })]} onState={s => { st = s; }} />);
    fireEvent.click(within(liste()).getByText("Ödeme planı"));
    const plan = screen.getByTestId("odeme-plani-satirlari");
    expect(within(plan).getAllByText(paraMetni(400, "USD"))).toHaveLength(3);
    fireEvent.click(within(plan).getAllByTitle("Ödeme kaydet")[0]);
    const p = screen.getByTestId("odeme-kayit-penceresi");
    expect(within(p).getByLabelText("Ödeme tutarı").value).toBe("400");
    fireEvent.click(screen.getByRole("button", { name: /Ödemeyi Kaydet/ }));
    const ilk = st.giderler[0].taksitler.find(t => t.sira === 1);
    expect(st.hesapHareketleri[0]).toMatchObject({ tutar: 16000, dovizTutar: 400, taksitId: ilk.id });
    expect(G.odemeleriUygula(st.giderler, st.hesapHareketleri, turMap)[0].taksitler.find(t => t.id === ilk.id)._odenenK).toBe(1600000);
  });
});
