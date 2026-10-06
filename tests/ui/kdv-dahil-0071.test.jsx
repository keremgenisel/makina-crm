// @vitest-environment jsdom
// Spec 0071 (arayüz): gider formunda KDV dâhil giriş, kalem listesinde "Tutar girilmedi" rozeti ve süzgeci.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { GiderForm } from "../../src/components/GiderForm";
import { Giderler } from "../../src/components/Giderler";
import { giderKalemDogrula, turHaritasi } from "../../src/lib/gider";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-06T10:00:00")); });

const TURLER = [{ id: 1, ad: "Fabrika kirası", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Elektrik", davranis: "normal" }];
const TED = [{ id: 11, ad: "Yıldız Gayrimenkul" }, { id: 12, ad: "Enerjisa" }];
const CAL = [{ id: 21, ad: "Hasan", resmiMaliyet: 30000, eldenMaliyet: 0 }];
const ac = (props = {}) => {
  const onSave = vi.fn();
  render(<GiderForm giderTurleri={TURLER} tedarikciler={TED} calisanlar={CAL} giderAyarlari={{ stopajOrani: 20 }} onSave={onSave} onCancel={vi.fn()} {...props} />);
  return onSave;
};
const tur = (id) => fireEvent.change(screen.getByLabelText("Gider türü *"), { target: { value: String(id) } });
const yon = () => screen.queryByRole("radiogroup", { name: "KDV yönü" });
const yonSec = (etiket) => fireEvent.click(within(yon()).getByRole("radio", { name: etiket }));
const yaz = (etiket, deger) => fireEvent.change(screen.getByLabelText(etiket), { target: { value: deger } });
const kaydet = () => fireEvent.click(screen.getByText("Kaydet"));

describe("Spec 0071 A: gider formunda KDV dâhil giriş", () => {
  it("AC-1: normal kalemde seçici var, varsayılan KDV hariç", () => {
    ac();
    tur(4);
    expect(yon()).toBeTruthy();
    expect(within(yon()).getByRole("radio", { name: "KDV hariç" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("Tutar (KDV hariç) *")).toBeTruthy();
  });
  it("AC-2, AC-39: dâhil seçilince alan rakamı aynı kalır, kutu üç rakamı (hariç, KDV, ödenecek) gösterir", () => {
    ac();
    tur(4);
    yaz("Tutar", "1180");
    yonSec("KDV dâhil");
    expect(screen.getByLabelText("Tutar").value).toBe("1.180");
    expect(screen.getByText("Tutar (KDV dâhil) *")).toBeTruthy();
    expect(screen.getByTestId("ozet-kdv-haric").textContent).toBe("983,33 ₺");
    expect(screen.getByTestId("ozet-kdv").textContent).toBe("196,67 ₺");
    expect(screen.getByTestId("ozet-odenecek").textContent).toBe("1.180 ₺");
    expect(screen.queryByTestId("kdv-yuvarlama-farki")).toBeNull();
  });
  it("AC-3, AC-4: kaydedilen tutar KDV hariçtir; yön kayda yazılır", () => {
    const onSave = ac();
    tur(4);
    yonSec("KDV dâhil");
    yaz("Tutar", "1180");
    kaydet();
    expect(onSave.mock.calls[0][0]).toMatchObject({ tutar: 983.33, kdvOrani: 20, kdvYonu: "dahil" });
  });
  it("AC-5: 0,03 ve %20 sınırında yuvarlama farkı yazılır; gösterilen KDV motorun KDV'si", () => {
    ac();
    tur(4);
    yonSec("KDV dâhil");
    yaz("Tutar", "0,03");
    expect(screen.getByTestId("ozet-kdv").textContent).toBe("0,01 ₺");
    expect(screen.getByTestId("ozet-odenecek").textContent).toBe("0,04 ₺");
    expect(screen.getByTestId("kdv-yuvarlama-farki").textContent).toMatch(/girilen 0,03 ₺ tutarından 0,01 ₺ fazla/);
  });
  it("AC-6: düzenlemede kullanıcı girdiği biçimi görür; dâhil tutar hariç + KDV ile yeniden kurulur", () => {
    ac({ kalem: { id: 9, tarih: "2026-10-01", turId: 4, tutar: 983.33, kdvOrani: 20, kdvYonu: "dahil" } });
    expect(within(yon()).getByRole("radio", { name: "KDV dâhil" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByLabelText("Tutar").value).toBe("1.180");
  });
  it("AC-7: dâhil kalemin oranı değişmişse gösterilen dâhil tutar da değişir (saklanmaz, yeniden kurulur)", () => {
    ac({ kalem: { id: 9, tarih: "2026-10-01", turId: 4, tutar: 983.33, kdvOrani: 10, kdvYonu: "dahil" } });
    expect(screen.getByLabelText("Tutar").value).toBe("1.081,66");
  });
  it("AC-43: kdvYonu alanı olmayan eski kalem hariç seçili ve tutarı aynen açılır", () => {
    ac({ kalem: { id: 8, tarih: "2026-10-01", turId: 4, tutar: 500, kdvOrani: 20 } });
    expect(within(yon()).getByRole("radio", { name: "KDV hariç" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByLabelText("Tutar").value).toBe("500");
  });
  it("AC-11: oran sıfırken seçici pasif değil ve ipucu görünür", () => {
    ac();
    tur(4);
    yaz("KDV oranı", "0");
    expect(screen.getByText("KDV oranı sıfır olduğu için dâhil ve hariç aynı tutarı verir.")).toBeTruthy();
    expect(within(yon()).getByRole("radio", { name: "KDV dâhil" }).disabled).toBe(false);
  });
  it("AC-12: kira özeti hariç girişte bugünkü dört satırı ve ödenecek tutarı yazar", () => {
    ac({ kalem: { id: 7, tarih: "2026-10-01", turId: 1, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 20 } });
    const o = screen.getByTestId("kira-ozet").textContent;
    for (const t of ["Brüt kira20.000 ₺", "Stopaj− 4.000 ₺", "Net kira16.000 ₺", "KDV+ 4.000 ₺"]) expect(o).toContain(t);
    expect(o).toMatch(/ödenecek.*20\.000 ₺/);
  });
  it("AC-13: kira + brüt + dâhil önce KDV'yi ayırır; net girişte seçici yok, ipucu var", () => {
    const onSave = ac();
    tur(1);
    yonSec("KDV dâhil");
    yaz("Brüt kira", "24000");
    yaz("KDV oranı", "20");
    expect(screen.getByTestId("kira-ozet").textContent).toContain("Brüt kira20.000 ₺");
    kaydet();
    expect(onSave.mock.calls[0][0]).toMatchObject({ tutar: 20000, netTutar: 16000, kdvYonu: "dahil" });
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Giriş yönü" })).getByRole("radio", { name: "Net ödenen kira" }));
    expect(yon()).toBeNull();
    expect(screen.getByText("Net ödenen kira KDV hariç girilir; KDV dâhil seçimi yalnız brüt kira girişinde vardır.")).toBeTruthy();
  });
  it("AC-14: personel kaleminde seçici çizilmez, kayıtta kdvYonu null", () => {
    const onSave = ac();
    tur(3);
    expect(yon()).toBeNull();
    fireEvent.change(screen.getByLabelText("Çalışan *"), { target: { value: "21" } });
    kaydet();
    expect(onSave.mock.calls[0][0].kdvYonu).toBeNull();
  });
});

describe("Spec 0071 R25 (triyaj): model dağılımı önizlemesi KDV hariç tutarla", () => {
  it("1.200 KDV dâhil, %20, model satırı 1.100: önizleme kalem tutarını 1.000 yazar ve 100 aşım gösterir; kayıt da reddeder", () => {
    const onSave = ac({ modeller: [{ model: "AK100_DS" }] });
    tur(4);
    yonSec("KDV dâhil");
    yaz("Tutar", "1200");
    yaz("KDV oranı", "20");
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Makina maliyeti ataması" })).getByRole("radio", { name: "Model" }));
    fireEvent.change(screen.getByLabelText("Model 1"), { target: { value: "AK100_DS" } });
    yaz("Birim maliyet 1", "1100");
    yaz("Adet 1", "1");
    const kalemTutari = screen.getByText("Kalem tutarı").nextSibling;
    expect(kalemTutari.textContent).toBe("1.000 ₺");
    expect(screen.getByText("Aşım").nextSibling.textContent).toBe("100 ₺");
    kaydet();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("Spec 0071 B: tutarı sonra girilen kalem formda", () => {
  const SIFIR = { id: 30, tarih: "2026-10-01", turId: 4, tutar: 0, kdvOrani: 20, kdvYonu: "haric", tedarikciId: 12, aciklama: "Elektrik", tanimId: 60, donem: "2026-10" };
  it("AC-31, AC-20: sıfır kalemin ödeme kutusu satır çizmez; kalem 0 ile kaydedilir", () => {
    const onSave = ac({ kalem: SIFIR });
    expect(screen.queryAllByLabelText(/ödeme tutarı/i)).toHaveLength(0);
    kaydet();
    expect(onSave.mock.calls[0][0]).toMatchObject({ tutar: 0, tanimId: 60 });
  });
  it("AC-40: tanım kaleminde boş tutar 0 olarak kaydedilir", () => {
    const onSave = ac({ kalem: SIFIR });
    yaz("Tutar", "");
    kaydet();
    expect(onSave.mock.calls[0][0].tutar).toBe(0);
  });
  it("AC-25: elle açılan kalemde sıfır tutar reddedilir", () => {
    const onSave = ac();
    tur(4);
    yaz("Tutar", "0");
    kaydet();
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Tutar sıfırdan büyük olmalı.")).toBeTruthy();
  });
});

// ── Kalem listesi (gerçek Giderler) ────────────────────────────────────────
const turMap = turHaritasi(TURLER);
let n = 9000;
const k = (f) => { const r = giderKalemDogrula(f, { turMap, tedarikciler: TED, uid: () => ++n }); if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar)); return r.kayit; };
const SIFIR_TANIMLI = k({ id: 1, tarih: "2026-10-02", turId: 4, tutar: "0", kdvOrani: 20, tedarikciId: 12, aciklama: "Elektrik Ekim", tanimId: 60, donem: "2026-10" });
// Tanımı silinmiş / içe aktarılmış eski sıfır kalem: ölçüt tanım bağı değil, ödenecek tutar (AC-21).
const SIFIR_ESKI = { id: 2, tarih: "2026-10-03", turId: 4, tutar: 0, kdvOrani: 20, tedarikciId: 12, aciklama: "Su Ekim", tanimId: null, atamaTur: "", modelSatirlari: [], taksitler: [] };
const DOLULAR = Array.from({ length: 11 }, (_, i) => k({ id: 100 + i, tarih: `2026-10-${String(5 + i).padStart(2, "0")}`, turId: 4, tutar: String(100 + i), kdvOrani: 0, tedarikciId: 12, aciklama: `Sarf ${i + 1}` }));
function H({ g0 = [SIFIR_TANIMLI, SIFIR_ESKI, ...DOLULAR] }) {
  const [giderler, setGiderler] = useState(g0);
  const [hesapHareketleri, setHesapHareketleri] = useState([]);
  return <Giderler giderler={giderler} setGiderler={setGiderler} hesapHareketleri={hesapHareketleri} setHesapHareketleri={setHesapHareketleri} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
    giderTurleri={TURLER} tedarikciler={TED} setTedarikciler={vi.fn()} standartGiderler={[]} setStandartGiderler={vi.fn()} calisanlar={CAL} standardModels={[]} customModels={[]}
    appSettings={{ giderAyarlari: { yururlukAy: "2026-01" } }} kasaHesaplari={[]}
    satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />;
}
const odemeSuzgeci = () => screen.getByLabelText("Ödeme filtresi");
const suz = (v) => fireEvent.change(odemeSuzgeci(), { target: { value: v } });
const satir = (metin) => screen.getByText(metin).closest("tr");

describe("Spec 0071 B: kalem listesi rozeti ve süzgeci", () => {
  it("AC-21: sıfır kalemler 'Tutar girilmedi' rozetiyle görünür; tanımı olmayan eski sıfır kalem de", () => {
    render(<H />);
    expect(within(satir("Elektrik Ekim")).getByTestId("tutar-girilmedi").textContent).toBe("Tutar girilmedi");
    expect(within(satir("Su Ekim")).getByTestId("tutar-girilmedi")).toBeTruthy();
  });
  it("AC-42: sıfır kalemin ödeme hücresi '—' yazar, 'Ödendi' ya da ödeme düğmesi çizmez", () => {
    render(<H />);
    const s = satir("Elektrik Ekim");
    expect(within(s).getByTestId("odeme-hucre-tutarsiz").textContent).toBe("—");
    expect(within(s).queryByText(/Ödendi|Ödenmedi/)).toBeNull();
  });
  it("AC-22: süzgecin altıncı değeri sayıyla etiketlenir ve yalnız sıfır kalemleri getirir", () => {
    render(<H />);
    const secenek = within(odemeSuzgeci()).getByRole("option", { name: "Tutar girilmedi (2)" });
    expect(secenek.value).toBe("tutarsiz");
    suz("tutarsiz");
    expect(screen.getByText("Elektrik Ekim")).toBeTruthy();
    expect(screen.getByText("Su Ekim")).toBeTruthy();
    expect(screen.queryByText("Sarf 1")).toBeNull();
  });
  it("AC-23: süzgeç değişince kalem listesi 1. sayfaya döner; hatırlatma kipiyle çakışmaz", () => {
    render(<H />);
    fireEvent.click(screen.getByText("Sonraki ›"));
    expect(screen.getByText("‹ Önceki").disabled).toBe(false);
    suz("tutarsiz");
    expect(screen.queryByText("‹ Önceki")).toBeNull(); // iki kalem, tek sayfa
    // Hatırlatma kipinden süzgece geçilince kip kapanır ve süzgeç uygulanır.
    suz("hatirlatma");
    suz("tutarsiz");
    expect(odemeSuzgeci().value).toBe("tutarsiz");
    expect(screen.getByText("Elektrik Ekim")).toBeTruthy();
  });
  it("AC-33: ölçülen durum: sıfır kalem 'Ödenmemiş' süzgecinde görünür, 'Ödenmiş'te görünmez (hücre yine '—', R26)", () => {
    render(<H />);
    suz("odenmedi");
    expect(screen.getByText("Elektrik Ekim")).toBeTruthy();
    suz("odendi");
    expect(screen.queryByText("Elektrik Ekim")).toBeNull();
  });
  it("AC-24: tutar girilince rozet kalkar", () => {
    render(<H />);
    fireEvent.click(within(satir("Elektrik Ekim")).getByTitle("Düzenle"));
    yaz("Tutar", "850");
    kaydet();
    expect(within(satir("Elektrik Ekim")).queryByTestId("tutar-girilmedi")).toBeNull();
    expect(within(odemeSuzgeci()).getByRole("option", { name: "Tutar girilmedi (1)" })).toBeTruthy();
  });
});
