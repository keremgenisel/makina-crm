// @vitest-environment jsdom
// Spec 0133: parça kartının fiyat bölümü, katalog listesi, kip süzgeci, toplu kip, set düğmesi ve Fiyat Ayarları paneli (gerçek
// Settings, durumlu kap; kaydedilen gövde ölçülür).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { Settings } from "../../src/components/Settings";
import { NEDEN_MALIYET_YOK, NEDEN_KAT_YOK, DOVIZ_NOTU, ZARAR_UYARISI, KAT_UST_HATASI, KAT_POZITIF_HATASI,
  maliyetsizUyariMetni, TOPLU_KAT_YOK_NEDENI } from "../../src/lib/parcaFiyati";
import { FIYAT_KIPI_ETIKETI, KAT_ETIKETI, SET_FIYAT_MALIYET_NEDENI } from "../../src/components/PartManager";
import { SettingsFiyat, FIYAT_AYAR_IPUCU, VARSAYILAN_KAT_ETIKETI, KAT_ONERI_METNI } from "../../src/components/settings/SettingsFiyat";
import { SET_FIYAT_DUGMESI } from "../../src/lib/urunAgaci";
import { BELIRSIZ_HATASI } from "../../src/lib/malzeme";
import { PARCALAR, MALZEMELER } from "../fixtures/0133-veri.js";

const logs = [];
vi.mock("../../src/lib/audit", async (orig) => ({ ...(await orig()), logAction: (x) => logs.push(x) }));
afterEach(() => { cleanup(); logs.length = 0; });

const BASE = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.56.0", factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(),
  calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem",
  standardModels: [], setStandardModels: vi.fn(), customModels: [], setCustomModels: vi.fn(), rawCustomModels: [], tedarikciler: [], setTedarikciler: vi.fn(),
};
const BAGLI = PARCALAR.map(p => (p.id === 65 ? { ...p, fiyatKipi: "maliyet" } : p.id === 63 ? { ...p, fiyatKipi: "maliyet" } : p));
let durum;
function Katalog({ p0 = BAGLI, ayar = { fiyatAyarlari: { varsayilanKat: 2.4 } }, initialTab = "yedekparca", factory = BASE.factory, serverPermissions = null }) {
  const [parts, setParts] = useState(structuredClone(p0));
  const [appSettings, setAppSettings] = useState(ayar);
  durum = { parts, appSettings };
  return <Settings {...BASE} factory={factory} serverPermissions={serverPermissions} initialTab={initialTab} appSettings={appSettings} setAppSettings={setAppSettings}
    parts={parts.filter(p => !p.deletedAt)} setParts={setParts} rawParts={parts} malzemeler={MALZEMELER} giderYetki />;
}
const satir = (ad) => screen.getAllByText(ad).map(e => e.closest("tr")).find(Boolean);
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getByTitle("Düzenle"));
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
const kayit = (id) => durum.parts.find(p => p.id === id);
const kipSec = (ad) => fireEvent.click(within(screen.getByRole("radiogroup", { name: FIYAT_KIPI_ETIKETI })).getByRole("radio", { name: ad }));

describe("Spec 0133: parça kartının fiyat bölümü", () => {
  it("AC-2: maliyete bağlı seçiliyken TL alanı pasif ve türetilmiş değeri gösterir", () => {
    render(<Katalog />);
    duzenle("Kesme mili");
    const tl = screen.getByLabelText("TL fiyatı (türetilen)");
    expect(tl.disabled).toBe(true);
    expect(tl.value).toBe("4.082,69 ₺");
  });
  it("AC-32 / AC-87: döviz notu tek sabitle kartta", () => {
    render(<Katalog />);
    duzenle("Kesme mili");
    expect(screen.getByTestId("doviz-notu").textContent).toBe(DOVIZ_NOTU);
  });
  it("AC-23 / AC-86 (kart): maliyetsiz maliyete bağlı parçada alan boş, altında tam cümle", () => {
    render(<Katalog />);
    duzenle("Pim");
    expect(screen.getByLabelText("TL fiyatı (türetilen)").value).toBe("");
    expect(screen.getByTestId("fiyat-neden").textContent).toBe(NEDEN_MALIYET_YOK);
  });
  it("AC-9 (kart): varsayılan kat yoksa nedeni yazar", () => {
    render(<Katalog ayar={{}} />);
    duzenle("Kesme mili");
    expect(screen.getByTestId("fiyat-neden").textContent).toBe(NEDEN_KAT_YOK);
  });
  it("AC-28 / AC-14 (Karar 37): kip değiştirilirken elle girilen ile türetilen farklıysa fark kartta", () => {
    render(<Katalog />);
    duzenle("Rulman"); // elle 450, maliyet 100 → 240,00
    expect(screen.queryByTestId("fiyat-fark")).toBeNull();
    kipSec("Maliyete bağlı");
    expect(screen.getByTestId("fiyat-fark").textContent).toBe("Elle girilen 450,00 ₺, türetilen 240,00 ₺.");
  });
  it("AC-26 / AC-79: maliyete bağlı kipe alınıp kaydedilince elle TL değeri kayıtta kalır; türetilen değer gövdeye sızmaz", () => {
    render(<Katalog />);
    duzenle("Rulman");
    // R13/2: elle kipte TL alanına yazılan değer, kip maliyete bağlıya çevrilince formdan OKUNMAZ (pasif alanın arkasında kalır).
    fireEvent.change(within(screen.getByTestId("fiyat-bolumu")).getAllByRole("textbox")[0], { target: { value: "999" } });
    kipSec("Maliyete bağlı");
    kaydet();
    expect(kayit(61)).toMatchObject({ fiyatTRY: 450, fiyatKipi: "maliyet" });
    expect(kayit(61)).not.toHaveProperty("karKati");
  });
  it("AC-27 / AC-80: elle sabite dönünce eski fiyat görünür, gövdede kip alanı hiç yok", () => {
    render(<Katalog />);
    duzenle("Kesme mili");
    kipSec("Elle sabit");
    kaydet();
    expect(kayit(65).fiyatTRY).toBe(4500);
    expect("fiyatKipi" in kayit(65)).toBe(false);
    expect(satir("Kesme mili").textContent).toMatch(/4\.500/);
  });
  it("AC-5 (kart): parçanın katı kaydedilir ve varsayılanın önüne geçer; liste yeniden hesaplar", () => {
    render(<Katalog />);
    duzenle("Kesme mili");
    fireEvent.change(screen.getByLabelText(KAT_ETIKETI), { target: { value: "3" } });
    expect(screen.getByLabelText("TL fiyatı (türetilen)").value).toBe("5.103,36 ₺");
    kaydet();
    expect(kayit(65).karKati).toBe(3);
    expect(satir("Kesme mili").textContent).toMatch(/5\.103,36/);
  });
  it("AC-6 / AC-60 / AC-61 / AC-63: geçersiz kat kaydı reddeder, nedeni alanın altında", () => {
    render(<Katalog />);
    duzenle("Kesme mili");
    for (const [v, h] of [["2.400", BELIRSIZ_HATASI], ["150", KAT_UST_HATASI], ["0", KAT_POZITIF_HATASI]]) {
      fireEvent.change(screen.getByLabelText(KAT_ETIKETI), { target: { value: v } });
      kaydet();
      expect(screen.getByRole("alert").textContent).toBe(h);
      expect(kayit(65)).not.toHaveProperty("karKati");
    }
  });
  it("AC-7 / AC-88 / AC-89: 0,90 kaydedilir, uyarı hata biçiminde değil; listede rozet yok", () => {
    render(<Katalog />);
    duzenle("Kesme mili");
    fireEvent.change(screen.getByLabelText(KAT_ETIKETI), { target: { value: "0,90" } });
    const u = screen.getByTestId("kat-zarar");
    expect(u.getAttribute("role")).toBe("status");
    expect(u.textContent).toBe(ZARAR_UYARISI);
    kaydet();
    expect(kayit(65).karKati).toBe(0.9);
    expect(satir("Kesme mili").textContent).not.toMatch(/zarar/i);
  });
  it("AC-64 (ekran): dört ondalık üç ondalığa yuvarlanıp saklanır ve kartta aynı görünür", () => {
    render(<Katalog />);
    duzenle("Kesme mili");
    fireEvent.change(screen.getByLabelText(KAT_ETIKETI), { target: { value: "2,4567" } });
    kaydet();
    expect(kayit(65).karKati).toBe(2.457);
    duzenle("Kesme mili");
    expect(screen.getByLabelText(KAT_ETIKETI).value).toBe("2,457");
  });
});

describe("Spec 0133: katalog listesi, süzgeç ve toplu kip", () => {
  it("AC-18 / AC-86 (liste): türetilmiş fiyat listede; türetilemeyende '—' ve açıklayıcı başlık", () => {
    render(<Katalog />);
    expect(within(satir("Kesme mili")).getByTestId("parca-fiyat-turetilen").textContent).toMatch(/^₺4\.082,69/);
    const pim = within(satir("Pim")).getByTestId("parca-fiyat-turetilen");
    expect(pim.textContent).toMatch(/^—/);
    expect(pim.getAttribute("title")).toBe(NEDEN_MALIYET_YOK);
  });
  it("AC-30 / AC-84: kip süzgeci üç seçenek; maliyete bağlı ve elle sabit süzer", () => {
    render(<Katalog />);
    const g = screen.getByRole("group", { name: "Fiyat kipi süzgeci" });
    expect(within(g).getAllByRole("button").map(b => b.getAttribute("aria-label"))).toEqual(["Tümü (6)", "Maliyete bağlı (2)", "Elle sabit (4)"]);
    fireEvent.click(within(g).getByRole("button", { name: "Maliyete bağlı (2)" }));
    expect(screen.queryByText("Rulman")).toBeNull();
    expect(satir("Kesme mili")).toBeTruthy();
    fireEvent.click(within(g).getByRole("button", { name: "Elle sabit (4)" }));
    expect(screen.queryByText("Kesme mili")).toBeNull();
  });
  it("AC-29 / AC-49 / AC-77 / AC-50: toplu işlem süzülmüş listenin bütününe; maliyetsiz uyarısı; yine uygulanır", () => {
    render(<Katalog />);
    fireEvent.click(within(screen.getByRole("group", { name: "Fiyat kipi süzgeci" })).getByRole("button", { name: "Elle sabit (4)" }));
    fireEvent.click(screen.getByRole("button", { name: "Listedeki 4 parçayı maliyete bağla" }));
    const onay = screen.getByTestId("toplu-kip-onay").textContent;
    expect(onay).toMatch(/Listedeki 4 parçanın 4 tanesinin/);
    expect(onay).toMatch(new RegExp(maliyetsizUyariMetni(2).replace(/[.;]/g, ".")));
    fireEvent.click(screen.getByRole("button", { name: "Uygula" }));
    expect([61, 62, 64, 66].map(id => kayit(id).fiyatKipi)).toEqual(["maliyet", "maliyet", "maliyet", "maliyet"]);
    expect(kayit(62).fiyatTRY).toBe("1250"); // AC-26: elle değer silinmez
    expect(logs.at(-1)).toMatchObject({ action: "fiyat_kipi_degisti", entity: "parca_tanimi" });
    fireEvent.click(within(screen.getByRole("group", { name: "Fiyat kipi süzgeci" })).getByRole("button", { name: /^Tümü/ }));
    const kayis = within(satir("Kayış")).getByTestId("parca-fiyat-turetilen");
    expect(kayis.textContent).toMatch(/^—/);
    expect(kayis.getAttribute("title")).toBe(NEDEN_MALIYET_YOK);
  });
  it("AC-80 (toplu) / triyaj bulgu 5: elle sabite toplu dönüşte kip ve parçanın katı gövdeden silinir (kartla aynı kural)", () => {
    render(<Katalog p0={BAGLI.map(p => (p.id === 65 ? { ...p, karKati: 2.5 } : p))} />);
    fireEvent.click(screen.getByRole("button", { name: "Listedeki 6 parçayı elle sabite al" }));
    fireEvent.click(screen.getByRole("button", { name: "Uygula" }));
    expect(durum.parts.some(p => "fiyatKipi" in p)).toBe(false);
    expect("karKati" in kayit(65)).toBe(false);
  });
  it("Triyaj bulgu 1: varsayılan kat boşken toplu 'maliyete bağla' pasif ve nedenli; elle sabite al etkin kalır", () => {
    render(<Katalog p0={PARCALAR} ayar={{}} />);
    expect(screen.getByRole("button", { name: "Listedeki 6 parçayı maliyete bağla" }).disabled).toBe(true);
    expect(screen.getByTestId("toplu-kat-yok").textContent).toBe(TOPLU_KAT_YOK_NEDENI);
    cleanup();
    render(<Katalog p0={PARCALAR} />);
    expect(screen.queryByTestId("toplu-kat-yok")).toBeNull();
    expect(screen.getByRole("button", { name: "Listedeki 6 parçayı maliyete bağla" }).disabled).toBe(false);
  });
  it("Triyaj bulgu 3 (AC-77): toplu işlem sayfa dışındaki parçalara da yazılır (14 parça, sayfa boyu 10)", () => {
    const cok = Array.from({ length: 14 }, (_, i) => ({ id: 200 + i, ad: `Parça ${String(i + 1).padStart(2, "0")}`, models: [], maliyet: 10, fiyatTRY: 30 }));
    render(<Katalog p0={cok} />);
    expect(screen.queryByText("Parça 14")).toBeNull(); // ikinci sayfada
    fireEvent.click(screen.getByRole("button", { name: "Listedeki 14 parçayı maliyete bağla" }));
    fireEvent.click(screen.getByRole("button", { name: "Uygula" }));
    expect(durum.parts.filter(p => p.fiyatKipi === "maliyet")).toHaveLength(14);
  });
  it("Triyaj bulgu 4 (R17/2): fiyat listesi firma bilgisiyle basılır", () => {
    const printHtml = vi.fn();
    window.appPrint = { printHtml };
    try {
      render(<Katalog factory={{ name: "Deneme Makina A.Ş.", adres: "Organize Sanayi 5. Cadde", phone: "0332 000 00 00" }} />);
      fireEvent.click(screen.getByRole("button", { name: /Fiyat Listesi/ }));
      const html = printHtml.mock.calls[0][0];
      expect(html).toContain("Deneme Makina A.Ş.");
      expect(html).toContain("Organize Sanayi 5. Cadde");
    } finally { delete window.appPrint; }
  });
  it("Triyaj bulgu 2: toplu kip işlem geçmişi kaydı serverPermissions taşır (istemcide /api/audit'e gider)", () => {
    const izin = JSON.stringify({ tabs: ["settings"] });
    render(<Katalog serverPermissions={izin} />);
    fireEvent.click(screen.getByRole("button", { name: "Listedeki 6 parçayı elle sabite al" }));
    fireEvent.click(screen.getByRole("button", { name: "Uygula" }));
    expect(logs.at(-1)).toMatchObject({ action: "fiyat_kipi_degisti", serverPermissions: izin });
  });
  it("AC-78: liste satırlarında onay kutusu yok", () => {
    render(<Katalog />);
    expect(satir("Rulman").querySelector('input[type="checkbox"]')).toBeNull();
  });
});

describe("Spec 0133: set düğmesi (R22)", () => {
  it("AC-70: maliyete bağlı kipte 'TL fiyatı toplamına eşitle' pasif ve nedenli; elle sabitte etkin", () => {
    render(<Katalog />);
    duzenle("Bağlantı seti");
    expect(screen.getByRole("button", { name: SET_FIYAT_DUGMESI }).disabled).toBe(false);
    kipSec("Maliyete bağlı");
    expect(screen.getByRole("button", { name: SET_FIYAT_DUGMESI }).disabled).toBe(true);
    expect(screen.getByTestId("set-fiyat-pasif").textContent).toBe(SET_FIYAT_MALIYET_NEDENI);
  });
  it("AC-22 (ekran): elle sabit setin toplamı bileşenin türetilmiş fiyatıyla", () => {
    const p0 = BAGLI.map(p => (p.id === 61 ? { ...p, fiyatKipi: "maliyet" } : p));
    render(<Katalog p0={p0} />);
    duzenle("Bağlantı seti");
    fireEvent.click(screen.getByRole("button", { name: SET_FIYAT_DUGMESI }));
    kaydet();
    expect(kayit(64).fiyatTRY).toBe(String(240 * 2 + 1250));
  });
});

describe("Spec 0133: Fiyat Ayarları paneli", () => {
  it("AC-66 / AC-67: ayar boş açılır; 2,77 öneri, 'Öneriyi kullan' yalnız alanı doldurur", () => {
    render(<Katalog ayar={{}} initialTab="fiyat" />);
    const k = screen.getByLabelText(VARSAYILAN_KAT_ETIKETI);
    expect(k.value).toBe("");
    expect(screen.getByTestId("kat-oneri").textContent).toContain(KAT_ONERI_METNI);
    fireEvent.click(screen.getByRole("button", { name: "Öneriyi kullan" }));
    expect(k.value).toBe("2,77");
    expect(durum.appSettings.fiyatAyarlari).toBeUndefined();
  });
  it("AC-83 / AC-65 / AC-84: ipucu, yuvarlama Segment dugme ve yönü söyleyen metin", () => {
    render(<Katalog initialTab="fiyat" />);
    expect(screen.getByTestId("fiyat-ayar-ipucu").textContent).toBe(FIYAT_AYAR_IPUCU);
    const g = screen.getByRole("group", { name: "Yuvarlama" });
    expect(within(g).getAllByRole("button").map(b => b.textContent)).toEqual(["Kapalı", "Yukarı 10 TL", "Yukarı 50 TL"]);
  });
  it("AC-8 / AC-97 / C8: varsayılan kat ve yuvarlama değişince parça kayıtları aynı referans; fiyat yeniden hesaplanır", () => {
    render(<Katalog initialTab="fiyat" />);
    const once = durum.parts;
    fireEvent.change(screen.getByLabelText(VARSAYILAN_KAT_ETIKETI), { target: { value: "3" } });
    fireEvent.click(within(screen.getByRole("group", { name: "Yuvarlama" })).getByRole("button", { name: "Yukarı 50 TL" }));
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(durum.appSettings.fiyatAyarlari).toEqual({ varsayilanKat: 3, yuvarlama: "yukari50" });
    expect(durum.parts).toBe(once);
    const { parts, appSettings } = durum;
    cleanup();
    render(<Katalog p0={parts} ayar={appSettings} />);
    expect(within(satir("Kesme mili")).getByTestId("parca-fiyat-turetilen").textContent).toMatch(/^₺5\.150,00/);
  });
  it("AC-62 (ekran): panel aynı doğrulayıcıyla belirsiz katı reddeder", () => {
    render(<Katalog initialTab="fiyat" />);
    fireEvent.change(screen.getByLabelText(VARSAYILAN_KAT_ETIKETI), { target: { value: "2.400" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(screen.getByRole("alert").textContent).toBe(BELIRSIZ_HATASI);
    expect(durum.appSettings.fiyatAyarlari).toEqual({ varsayilanKat: 2.4 });
  });
  it("Triyaj bulgu 7: başka bilgisayarın kaydı aynı değerli yeni nesne getirince yazılmış ama kaydedilmemiş kat silinmez", () => {
    const set = vi.fn();
    const { rerender } = render(<SettingsFiyat appSettings={{ fiyatAyarlari: { varsayilanKat: 2.4 } }} setAppSettings={set} flash={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(VARSAYILAN_KAT_ETIKETI), { target: { value: "3,1" } });
    rerender(<SettingsFiyat appSettings={{ fiyatAyarlari: { varsayilanKat: 2.4 } }} setAppSettings={set} flash={vi.fn()} />);
    expect(screen.getByLabelText(VARSAYILAN_KAT_ETIKETI).value).toBe("3,1");
    rerender(<SettingsFiyat appSettings={{ fiyatAyarlari: { varsayilanKat: 2.6 } }} setAppSettings={set} flash={vi.fn()} />);
    expect(screen.getByLabelText(VARSAYILAN_KAT_ETIKETI).value).toBe("2,6"); // kayıtlı değer gerçekten değişince form izler
  });
  it("Triyaj ölçümü (0091 R24/4 emsali): iki alan boşaltılınca anahtar silinmez, değeri undefined olur", () => {
    render(<Katalog initialTab="fiyat" />);
    fireEvent.change(screen.getByLabelText(VARSAYILAN_KAT_ETIKETI), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect("fiyatAyarlari" in durum.appSettings).toBe(true);
    expect(durum.appSettings.fiyatAyarlari).toBeUndefined();
  });
});
