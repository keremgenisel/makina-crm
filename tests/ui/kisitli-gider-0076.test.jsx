// @vitest-environment jsdom
// Spec 0076: kısmen indirilebilen gider (binek araç), arayüz. Gider formu (kutu, oran, birleşik özet, doğrulama), Dönem
// Raporu kalem listesi (tutar, rozet, KDV hücresi, iki alt toplam), Giderler başlığı ve kartları, KDV kartının bilgi satırları,
// maliyet notları, Ayarlar varsayılan oranı, tekrarlayan tanım formu ve listesi.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { GiderForm } from "../../src/components/GiderForm";
import { Giderler } from "../../src/components/Giderler";
import { SettingsGider } from "../../src/components/settings/SettingsGider";
import { SettingsGiderTanimlari } from "../../src/components/settings/SettingsGiderTanimlari";
import { MaliyetNotlari } from "../../src/components/gider/MakinaMaliyetDetay";
import { KISIT_KAPSAM_IPUCU } from "../../src/components/gider/GiderAlanlari";
import { KISITLI_NOTU, KISITLI_STANDART_NOTU } from "../../src/lib/makinaMaliyeti";
import { giderKalemDogrula, turHaritasi, KISIT_KUTU_ETIKETI, KISIT_ORAN_HATASI, KISIT_FORM_NOTU, KKEG_ETIKETI, VERGI_MATRAHI_NOTU, GIDER_TOPLAMI_CUMLESI } from "../../src/lib/gider";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-08T10:00:00")); });

const TURLER = [{ id: 1, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Yakıt", davranis: "normal" }, { id: 5, ad: "SGK", davranis: "sgk" }];
const turMap = turHaritasi(TURLER);
const TED = [{ id: 11, ad: "Akaryakıt A.Ş." }];
let m = 7800;
const k = (f) => { const r = giderKalemDogrula(f, { turMap, tedarikciler: TED, uid: () => ++m }); if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar)); return r.kayit; };
const KIS = k({ id: 90, tarih: "2026-09-10", turId: 4, tutar: "1000", kdvOrani: "20", tedarikciId: 11, aciklama: "Binek yakıt", kisitliGider: true, indirilebilirOran: "70", dagitimAy: "3" });
const NORMAL = k({ id: 91, tarih: "2026-09-12", turId: 4, tutar: "500", kdvOrani: "20", tedarikciId: 11, aciklama: "Kamyonet yakıt" });

const formAc = (props = {}) => {
  const onSave = vi.fn();
  render(<GiderForm giderTurleri={TURLER} tedarikciler={TED} calisanlar={[]} giderAyarlari={{}} onSave={onSave} onCancel={vi.fn()} {...props} />);
  return onSave;
};
const tur = (id) => fireEvent.change(screen.getByLabelText("Gider türü *"), { target: { value: String(id) } });
const tutarGir = (v = "1000") => fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: v } });
const kutu = () => screen.getByRole("checkbox", { name: KISIT_KUTU_ETIKETI });
const oranAlani = () => screen.getByLabelText("İndirilebilir oran");

describe("Spec 0076 A, E: gider formu", () => {
  it("AC-1 / AC-2: kutu var ve varsayılan kapalı; kapalıyken oran, kısıtlama özeti ve notlar çizilmez, normal özet bugünkü üç satır", () => {
    formAc();
    tur(4); tutarGir();
    expect(kutu().checked).toBe(false);
    expect(screen.queryByLabelText("İndirilebilir oran")).toBeNull();
    expect(screen.queryByTestId("kisit-ozet")).toBeNull();
    expect(screen.queryByText(KISIT_FORM_NOTU)).toBeNull();
    const oz = screen.getByTestId("normal-ozet");
    expect(oz.textContent).toBe("KDV200 ₺Ödenecek1.200 ₺Gider toplamına 1.000 ₺ girer.");
  });
  it("AC-3: kutu açılınca oran Ayarlar'daki varsayılanla (70) dolu gelir ve değiştirilebilir; ayar 88 ise 88", () => {
    formAc();
    tur(4); tutarGir();
    fireEvent.click(kutu());
    expect(oranAlani().value).toBe("70");
    fireEvent.change(oranAlani(), { target: { value: "60" } });
    expect(oranAlani().value).toBe("60");
    cleanup();
    formAc({ giderAyarlari: { indirilebilirOran: 88 } });
    tur(4); tutarGir();
    fireEvent.click(kutu());
    expect(oranAlani().value).toBe("88");
    expect(screen.getByText(KISIT_FORM_NOTU)).toBeTruthy();
    expect(screen.getByText(KISIT_KAPSAM_IPUCU)).toBeTruthy();
  });
  it("AC-29 / AC-44: tek özet bloğu yedi satırı kaydedilecek değerlerle gösterir; KKEG açık adıyla", () => {
    const onSave = formAc();
    tur(4); tutarGir(); fireEvent.click(kutu());
    const oz = screen.getByTestId("normal-ozet");
    const deger = (id) => within(oz).getByTestId(id).textContent;
    expect([deger("ozet-kdv-haric"), deger("ozet-kdv"), deger("ozet-indirilebilir-kdv"), deger("ozet-indirilemeyen-kdv"), deger("ozet-gider-tutari"), deger("ozet-kkeg"), deger("ozet-odenecek")])
      .toEqual(["1.000 ₺", "200 ₺", "140 ₺", "60 ₺", "1.060 ₺", "360 ₺", "1.200 ₺"]);
    expect(oz.textContent).toContain(KKEG_ETIKETI);
    expect(oz.textContent).toContain("Gider toplamına 1.060 ₺ girer.");
    expect(screen.queryByTestId("tevkifat-ozet")).toBeNull();
    fireEvent.click(screen.getByText("Kaydet"));
    const [kayit] = onSave.mock.calls[0];
    expect(kayit).toMatchObject({ tutar: 1000, kisitliGider: true, indirilebilirOran: 70 });
  });
  it("AC-29: tevkifat kutusu da açıkken tek blok iki kutunun satırlarını taşır; iki ayrı blok çizilmez", () => {
    formAc();
    tur(4); tutarGir(); fireEvent.click(kutu());
    fireEvent.click(screen.getByRole("checkbox", { name: "Bu fatura tevkifatlı" }));
    fireEvent.change(screen.getByLabelText("Tevkifat oranı"), { target: { value: "5/10" } });
    expect(screen.queryByTestId("normal-ozet")).toBeNull();
    const oz = screen.getByTestId("tevkifat-ozet");
    expect(within(oz).getByTestId("ozet-tevkifat").textContent).toBe("− 100 ₺");
    expect(within(oz).getByTestId("ozet-indirilebilir-kdv").textContent).toBe("140 ₺");
    expect(within(oz).getByTestId("ozet-gider-tutari").textContent).toBe("1.060 ₺");
    expect(within(oz).getByTestId("ozet-tedarikciye").textContent).toBe("1.100 ₺");
    expect(screen.getAllByTestId("kisit-ozet")).toHaveLength(1);
  });
  it("AC-4: 0–100 dışı ya da tam sayı olmayan oranda kayıt yapılmaz ve neden alanın altında yazılır", () => {
    for (const v of ["101", "70,5"]) {
      const onSave = formAc();
      tur(4); tutarGir(); fireEvent.click(kutu());
      fireEvent.change(oranAlani(), { target: { value: v } });
      fireEvent.click(screen.getByText("Kaydet"));
      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByText(KISIT_ORAN_HATASI)).toBeTruthy();
      cleanup();
    }
  });
  it("AC-5: kutu kapatılınca oran temizlenir ve kayda yazılmaz", () => {
    const onSave = formAc();
    tur(4); tutarGir(); fireEvent.click(kutu());
    fireEvent.change(oranAlani(), { target: { value: "60" } });
    fireEvent.click(kutu());
    fireEvent.click(screen.getByText("Kaydet"));
    const [kayit] = onSave.mock.calls[0];
    expect("kisitliGider" in kayit || "indirilebilirOran" in kayit).toBe(false);
  });
  it("AC-6: kira, personel ve SGK türünde kutu yok", () => {
    formAc();
    for (const id of [1, 3, 5]) { tur(id); expect(screen.queryByRole("checkbox", { name: KISIT_KUTU_ETIKETI })).toBeNull(); }
  });
  it("AC-7: KDV oranı sıfır olan kısıtlı kalem kaydedilir; özet KKEG matrahını (300) gösterir", () => {
    const onSave = formAc();
    tur(4); tutarGir();
    fireEvent.change(screen.getByLabelText("KDV oranı"), { target: { value: "0" } });
    fireEvent.click(kutu());
    expect(within(screen.getByTestId("normal-ozet")).getByTestId("ozet-kkeg").textContent).toBe("300 ₺");
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0]).toMatchObject({ kdvOrani: 0, kisitliGider: true, indirilebilirOran: 70 });
  });
  it("AC-30: KDV dâhil girişte (1.200) saklanan tutar matrah (1.000), gider tutarı 1.060", () => {
    const onSave = formAc();
    tur(4); tutarGir("1200");
    fireEvent.click(screen.getByRole("radio", { name: "KDV dâhil" }));
    fireEvent.click(kutu());
    expect(within(screen.getByTestId("normal-ozet")).getByTestId("ozet-gider-tutari").textContent).toBe("1.060 ₺");
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0]).toMatchObject({ tutar: 1000, kdvYonu: "dahil", kisitliGider: true });
  });
  it("AC-39: oran 100'de kısıtlama özet satırları çizilmez (bayraksızla aynı)", () => {
    formAc();
    tur(4); tutarGir(); fireEvent.click(kutu());
    fireEvent.change(oranAlani(), { target: { value: "100" } });
    expect(screen.queryByTestId("kisit-ozet")).toBeNull();
    expect(screen.getByTestId("normal-ozet").textContent).toContain("Gider toplamına 1.000 ₺ girer.");
  });
  it("AC-1 (düzenleme): kayıtlı kısıtlı kalem kutu açık ve oranıyla açılır", () => {
    formAc({ kalem: KIS });
    expect(kutu().checked).toBe(true);
    expect(oranAlani().value).toBe("70");
  });
});

describe("Spec 0076 C, D: Giderler ve Dönem Raporu", () => {
  function GH({ g0 = [KIS, NORMAL] }) {
    const [giderler, setGiderler] = useState(g0);
    const [hesapHareketleri, setHesapHareketleri] = useState([]);
    return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
      giderTurleri={TURLER} tedarikciler={TED} setTedarikciler={vi.fn()} standartGiderler={[]} setStandartGiderler={vi.fn()} calisanlar={[]} standardModels={[]} customModels={[]}
      appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} serverPermissions={null} kasaHesaplari={[]} kasaYetki aktifKullanici="kerem" baslangicAy="2026-09"
      satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
  }
  const satir = (aciklama) => screen.getByText(aciklama).closest("tr");
  it("AC-18: tutar sütunu gider tutarı (1.060), tutar hücresinde oran ve indirilemeyen KDV rozeti; dağıtım rozeti atama hücresinde birlikte", () => {
    render(<GH />);
    const tr = satir("Binek yakıt");
    const roz = within(tr).getByTestId("kisitli-rozeti");
    expect(roz.textContent).toBe("%70 indirilebilir · indirilemeyen KDV 60,00");
    expect(roz.closest("td").textContent).toMatch(/^1\.060 ₺/);
    expect(within(tr).getByTestId("dagitim-rozeti").closest("td")).not.toBe(roz.closest("td"));
    expect(within(satir("Kamyonet yakıt")).queryByTestId("kisitli-rozeti")).toBeNull();
  });
  it("AC-18 / AC-43: alt toplam gider tutarlarının toplamı; KDV hücresi tam KDV + indirilebilir, alt toplam iki rakam", () => {
    render(<GH />);
    const liste = screen.getByTestId("kalem-listesi");
    const ayak = liste.querySelector("tfoot");
    expect(ayak.textContent).toMatch(/1\.560 ₺/);
    expect(within(ayak).getByTestId("kdv-indirilebilir-toplam").textContent).toBe("indirilebilir 240 ₺");
    expect(ayak.textContent).toMatch(/300 ₺/);
    expect(within(satir("Binek yakıt")).getByTestId("kdv-indirilebilir").textContent).toBe("indirilebilir 140 ₺");
  });
  it("AC-43 (plan Q8): kısıtlı kalem yokken KDV alt toplamında ikinci rakam yok", () => {
    render(<GH g0={[NORMAL]} />);
    expect(screen.queryByTestId("kdv-indirilebilir-toplam")).toBeNull();
    expect(screen.queryByTestId("kdv-indirilebilir")).toBeNull();
  });
  it("AC-42 / AC-27: tutar sütunu başlığı ve iki kart 'KDV hariç' demez; başlık cümlesi indirilemeyen KDV'yi ve vergi matrahı notunu yazar", () => {
    render(<GH />);
    const basliklar = [...screen.getByTestId("kalem-listesi").querySelectorAll("thead th")].map(th => th.textContent);
    expect(basliklar).toContain("Tutar");
    expect(basliklar).not.toContain("KDV hariç");
    expect(screen.getByText("Toplam gider")).toBeTruthy();
    expect(screen.getByText("Ödenmemiş gider")).toBeTruthy();
    expect(screen.queryByText(/gider \(KDV hariç\)/)).toBeNull();
    expect(document.body.textContent).toContain(GIDER_TOPLAMI_CUMLESI);
    expect(screen.getByTestId("vergi-matrahi-notu").textContent).toBe(VERGI_MATRAHI_NOTU);
    expect(screen.getByText("Toplam gider").parentElement.textContent).toMatch(/1\.560 ₺/);
  });
  it("AC-23 / AC-25: İndirilecek KDV kartı 240 (140 + 100); KDV kartında indirilemeyen KDV ve KKEG satırları", () => {
    render(<GH />);
    expect(screen.getByText("İndirilecek KDV").parentElement.textContent).toMatch(/240 ₺/);
    const bilgi = screen.getByTestId("kisit-kdv-bilgi");
    expect(bilgi.textContent).toMatch(/İndirilemeyen KDV \(kısıtlı giderler\)60 ₺/);
    expect(bilgi.textContent).toMatch(new RegExp(`${KKEG_ETIKETI.replace(/[()]/g, "\\$&")} · matrah300 ₺`));
    expect(bilgi.textContent).toMatch(/KKEG · KDV60 ₺/);
    expect(bilgi.textContent).toMatch(/KKEG · toplam360 ₺/);
  });
  it("AC-25: kısıtlı kalem yoksa KDV kartında bilgi satırları çizilmez", () => {
    render(<GH g0={[NORMAL]} />);
    expect(screen.queryByTestId("kisit-kdv-bilgi")).toBeNull();
    expect(screen.getByTestId("vergi-matrahi-notu")).toBeTruthy(); // not kısıtlı kalem olmasa da görünür (R26)
  });
});

describe("Spec 0076 R27: maliyet notları", () => {
  it("AC-28: not yalnız kısıtlı kalem varken; standart kaynakta ortak kısmın girmediğini söyler", () => {
    render(<MaliyetNotlari kaynak="gercek" />);
    expect(screen.queryByTestId("kisitli-maliyet-notu")).toBeNull();
    cleanup();
    render(<MaliyetNotlari kaynak="gercek" kisitliVar />);
    expect(screen.getByTestId("kisitli-maliyet-notu").textContent).toBe(KISITLI_NOTU);
    cleanup();
    render(<MaliyetNotlari kaynak="standart" kisitliVar />);
    expect(screen.getByTestId("kisitli-maliyet-notu").textContent).toBe(KISITLI_STANDART_NOTU);
  });
});

describe("Spec 0076 F: Ayarlar ve tekrarlayan tanım", () => {
  it("AC-8 / AC-41: varsayılan oran alanı ayar yokken 70; geçersiz değerde kayıt yok ve neden yazılır; gider_tanim olmadan pasif", () => {
    const set = vi.fn();
    render(<SettingsGider appSettings={{ giderAyarlari: {} }} setAppSettings={set} giderler={[]} />);
    const alan = screen.getByLabelText("Binek araç giderlerinde indirilebilir oran");
    expect(alan.value).toBe("70");
    fireEvent.change(alan, { target: { value: "120" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(set).not.toHaveBeenCalled();
    expect(screen.getByText(KISIT_ORAN_HATASI)).toBeTruthy();
    fireEvent.change(alan, { target: { value: "88" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(set.mock.calls[0][0]({ giderAyarlari: {} }).giderAyarlari.indirilebilirOran).toBe(88);
    fireEvent.change(alan, { target: { value: "" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(set.mock.calls[1][0]({ giderAyarlari: { indirilebilirOran: 88 } }).giderAyarlari.indirilebilirOran).toBeNull(); // boş = 70'e dönüş (R9)
    cleanup();
    render(<SettingsGider appSettings={{ giderAyarlari: { indirilebilirOran: 88 } }} setAppSettings={vi.fn()} giderler={[]} canDo={() => false} />);
    expect(screen.getByLabelText("Binek araç giderlerinde indirilebilir oran").disabled).toBe(true);
    expect(screen.getByLabelText("Binek araç giderlerinde indirilebilir oran").value).toBe("88");
  });
  it("AC-34: tanım formunda kutu ve oran (boş serbest); kayıt bayrağı taşır, oran boşsa yazılmaz; listede durum ibaresi", () => {
    const set = vi.fn();
    render(<SettingsGiderTanimlari giderTanimlari={[]} setGiderTanimlari={set} giderTurleri={TURLER} tedarikciler={TED} calisanlar={[]} showToast={vi.fn()} giderAyarlari={{ indirilebilirOran: 88 }} />);
    fireEvent.click(screen.getByText("Yeni Tanım"));
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Tanım adı *"), { target: { value: "Binek yakıt" } });
    fireEvent.click(kutu());
    expect(oranAlani().value).toBe("");
    expect(screen.getByText(/şu an %88/)).toBeTruthy();
    fireEvent.click(screen.getByText("Kaydet"));
    const t = set.mock.calls[0][0]([])[0];
    expect(t).toMatchObject({ turId: 4, kisitliGider: true });
    expect("indirilebilirOran" in t).toBe(false);
    cleanup();
    render(<SettingsGiderTanimlari giderTanimlari={[{ ...t, tutar: 1000, kdvOrani: 20 }, { ...t, id: 999, ad: "Binek bakım", indirilebilirOran: 60 }]} setGiderTanimlari={vi.fn()}
      giderTurleri={TURLER} tedarikciler={TED} calisanlar={[]} showToast={vi.fn()} />);
    expect(screen.getAllByTestId("tanim-kisitli").map(x => x.textContent).sort()).toEqual(["Kısıtlı %60", "Kısıtlı (ayardaki oran)"]);
  });
  it("AC-34: tanımda geçersiz oran reddedilir; kutu kapalıysa alanlar yazılmaz", () => {
    const set = vi.fn();
    render(<SettingsGiderTanimlari giderTanimlari={[]} setGiderTanimlari={set} giderTurleri={TURLER} tedarikciler={TED} calisanlar={[]} showToast={vi.fn()} />);
    fireEvent.click(screen.getByText("Yeni Tanım"));
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Tanım adı *"), { target: { value: "Binek yakıt" } });
    fireEvent.click(kutu());
    fireEvent.change(oranAlani(), { target: { value: "150" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(set).not.toHaveBeenCalled();
    expect(screen.getByText(KISIT_ORAN_HATASI)).toBeTruthy();
    fireEvent.click(kutu());
    fireEvent.click(screen.getByText("Kaydet"));
    const t = set.mock.calls[0][0]([])[0];
    expect("kisitliGider" in t || "indirilebilirOran" in t).toBe(false);
  });
});
