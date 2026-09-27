// @vitest-environment jsdom
// Spec 0020: personel giderinin atanabilmesi, arayüz tarafı (form, Makina ve Model, dönem raporu kalem listesi,
// maliyet detayı, kârlılık listesi). Gizlilik: makina bazlı ekranlarda çalışan adı ve resmi/elden kırılımı yok (AC-9).
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { GiderForm } from "../../src/components/GiderForm";
import { MakinaModelGorunumu } from "../../src/components/gider/MakinaModelGorunumu";
import { KalemListesi } from "../../src/components/gider/DonemRaporu";
import { MakinaMaliyetDetay } from "../../src/components/gider/MakinaMaliyetDetay";
import { MakinaKarliligi } from "../../src/components/gider/MakinaKarliligi";
import { hesaplaGiderRaporu, turHaritasi, canliModelSeti } from "../../src/lib/gider";
import { hesaplaMakinaMaliyetleri, makinaKarlilik } from "../../src/lib/makinaMaliyeti";

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); });

const UYARI = "Bu kalemin tamamı seçilen makinaya yüklenecek.";
const AD = /Hasan|Yılmaz/;

describe("GiderForm: personel ataması (R1, R2, R3, R5)", () => {
  const TURLER = [{ id: 1, ad: "Fabrika kirası", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Hammadde", davranis: "normal" }];
  const ac = () => {
    const onSave = vi.fn();
    render(<GiderForm giderTurleri={TURLER} tedarikciler={[]} calisanlar={[{ id: 21, ad: "Hasan", resmiMaliyet: 30000, eldenMaliyet: 20000 }]}
      modeller={[{ model: "AK120_DSC" }, { model: "AK100_DS" }]} stock={[{ id: 501, model: "AK100_DS", serialNo: "2026-121" }]}
      customers={[{ id: 601, name: "Örnek Gıda", model: "AK120_DSC", serialNo: "2026-118" }]} giderAyarlari={{ stopajOrani: 20 }}
      onSave={onSave} onCancel={vi.fn()} />);
    return onSave;
  };
  const tur = (id) => fireEvent.change(screen.getByLabelText("Gider türü *"), { target: { value: String(id) } });
  const personel = () => { tur(3); fireEvent.change(screen.getByLabelText("Çalışan *"), { target: { value: "21" } }); };
  const secenekler = () => within(screen.getByRole("radiogroup", { name: "Makina maliyeti ataması" })).getAllByRole("radio").map(r => r.textContent);

  it("AC-1: personel kaleminde ortak, makina, model ve dağıtılmasın seçenekleri görünür", () => {
    ac(); personel();
    expect(screen.getByText("Makina maliyeti ataması")).toBeTruthy();
    expect(secenekler()).toEqual(["Ortak gider", "Makina", "Model", "Dağıtılmasın"]);
  });
  it("AC-3: makinaya atama seçilince sabit uyarı gösterilir ve kayıt engellenmez", () => {
    const onSave = ac(); personel();
    expect(screen.queryByText(UYARI)).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Makina" }));
    expect(screen.getByText(UYARI)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Makina"), { target: { value: "musteri:601" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ atamaTur: "makina", makinaTur: "musteri", makinaId: 601, resmiTutar: 30000, eldenTutar: 20000 });
    fireEvent.click(screen.getByRole("radio", { name: "Model" }));
    expect(screen.queryByText(UYARI)).toBeNull();
  });
  it("AC-3: uyarı normal kalemde çıkmaz", () => {
    ac(); tur(4);
    fireEvent.click(screen.getByRole("radio", { name: "Makina" }));
    expect(screen.queryByText(UYARI)).toBeNull();
  });
  it("AC-13: model dağılımında kalem tutarı resmi + elden; eksik kısım ortak gider bilgisi, aşımda kayıt yok; personel ipucu", () => {
    const onSave = ac(); personel();
    fireEvent.click(screen.getByRole("radio", { name: "Model" }));
    expect(screen.getByText(/birim maliyet, o modelin bir makinasına düşen işçiliktir/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Model 1"), { target: { value: "AK120_DSC" } });
    fireEvent.change(screen.getByLabelText("Birim maliyet 1"), { target: { value: "20.000" } });
    fireEvent.change(screen.getByLabelText("Adet 1"), { target: { value: "2" } });
    expect(screen.getAllByText("50.000 ₺").length).toBeGreaterThan(0);
    expect(screen.getByText(/Dağıtılmayan 10\.000 ₺ ortak gidere yazılır/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Adet 1"), { target: { value: "3" } });
    expect(screen.getByText(/aşıyor/)).toBeTruthy();
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Birim maliyet 1"), { target: { value: "25.000" } });
    fireEvent.change(screen.getByLabelText("Adet 1"), { target: { value: "2" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0]).toMatchObject({ atamaTur: "model", modelSatirlari: [{ modelAd: "AK120_DSC", birimMaliyet: 25000, adet: 2 }] });
  });
  it("AC-6: kira türünde atama bölümü çizilmez; personelden kiraya geçince atama temizlenir (regresyon koruması)", () => {
    const onSave = ac(); personel();
    fireEvent.click(screen.getByRole("radio", { name: "Dağıtılmasın" }));
    tur(1);
    expect(screen.queryByText("Makina maliyeti ataması")).toBeNull();
    fireEvent.change(screen.getByLabelText("Brüt kira"), { target: { value: "20.000" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0]).toMatchObject({ atamaTur: "", makinaId: null, modelSatirlari: [] });
  });
});

// ── Makina bazlı ekranlar ───────────────────────────────────────────────────
const TUR = [{ id: 1, ad: "Genel", davranis: "normal" }, { id: 2, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }];
const turMap = turHaritasi(TUR);
const MOD = [{ model: "AK100" }, { model: "AK200" }];
const per = (id, o = {}) => ({ id, tarih: "2026-03-15", turId: 3, calisanId: 7, calisanAd: "Hasan Yılmaz", aciklama: "Hasan Yılmaz", resmiTutar: 30000, eldenTutar: 20000, tutar: null, kdvOrani: 0, odendi: false, ...o });
const mus = (id, o = {}) => ({ id, name: `Firma ${id}`, model: "AK100", serialNo: `S${id}`, installDate: "2026-03-20", fabrikaSatisBedeli: 500000, currency: "TRY", uretimTarihi: "2026-03-05", ...o });
const GIDERLER = [
  per(1, { atamaTur: "makina", makinaTur: "musteri", makinaId: 1 }),
  per(2, { aciklama: "", atamaTur: "makina", makinaTur: "musteri", makinaId: 1 }),
  per(3, { tarih: "2026-03-01", atamaTur: "model", modelSatirlari: [{ modelAd: "AK100", birimMaliyet: 10000, adet: 2 }] }),
  per(4, { atamaTur: "dagitma" }),
  per(5, { atamaTur: "makina", makinaTur: "musteri", makinaId: 9 }), // makinası çöpte
];
const CUSTOMERS = [mus(1), mus(2), mus(9, { deletedAt: "2026-04-01" })];
const rapor = () => hesaplaGiderRaporu({ giderler: GIDERLER, turler: TUR, tedarikciler: [], customers: CUSTOMERS, canliModeller: canliModelSeti(MOD, []), yururlukAy: "2026-01" },
  { baslangic: "2026-03-01", bitis: "2026-03-31" }, { bugun: "2026-09-24" });
const maliyet = () => hesaplaMakinaMaliyetleri({ customers: CUSTOMERS, stock: [], partStockLog: [], giderler: GIDERLER, giderTurleri: TUR, standartGiderler: [],
  standardModels: MOD, customModels: [], giderAyarlari: { yururlukAy: "2026-01" } }, { bugun: "2026-09-24" });

describe("Makina ve Model görünümü (R8, R9, R10)", () => {
  it("AC-15: atanmış personel kalemi 'Personel gideri' etiketiyle; boş açıklamada '—' yok, çalışan adı yok", () => {
    render(<MakinaModelGorunumu rapor={rapor()} turMap={turMap} />);
    const govde = document.body.textContent;
    expect(govde).not.toMatch(AD);
    // makina ×2, model satırı, dağıtılmasın, düşen atama, kısmi dağıtım metni
    expect(govde.match(/Personel gideri/g)).toHaveLength(6);
    expect(screen.queryByText("—")).toBeNull();
  });
  it("AC-14: makinası silinmiş personel kalemi 'Ortak gidere düşen atamalar' kutusunda görünür", () => {
    render(<MakinaModelGorunumu rapor={rapor()} turMap={turMap} />);
    const tam = (metin) => (_, el) => el?.tagName === "SPAN" && el.textContent === metin;
    expect(screen.getByText(tam("Personel gideri · makina silinmiş veya takip edilemiyor"))).toBeTruthy();
  });
  it("R10: 'Ortak gider' kartının alt yazısı yeni kurala uyar", () => {
    render(<MakinaModelGorunumu rapor={rapor()} turMap={turMap} />);
    expect(screen.getByText("Kira ve atanmamış personel dahil")).toBeTruthy();
    expect(screen.queryByText("Kira ve personel dahil")).toBeNull();
  });
  it("AC-9: kısmi dağıtım metninde personel kalemi etiketle yazılır", () => {
    render(<MakinaModelGorunumu rapor={rapor()} turMap={turMap} />);
    expect(screen.getByText(/Kısmi dağıtım:/).parentElement.textContent).toMatch(/Personel gideri \(30\.000/);
  });
});

describe("Dönem raporu kalem listesi (R10)", () => {
  it("atanmış personel kaleminin atama sütunu makinayı gösterir; kira ortak kalır", () => {
    const kira = { id: 8, tarih: "2026-03-15", turId: 2, tutar: 30000, kdvOrani: 20, stopajOrani: 20, girisYonu: "brut", aciklama: "Fabrika kirası", atamaTur: "makina", makinaTur: "musteri", makinaId: 1, odendi: false };
    render(<KalemListesi kalemler={[GIDERLER[0], kira]} giderTurleri={TUR} tedarikciler={[]} stock={[]} customers={CUSTOMERS} standardModels={MOD} customModels={[]}
      bugun="2026-09-24" canDo={() => true} onDuzenle={vi.fn()} onSil={vi.fn()} onOdendi={vi.fn()} />);
    const kiraSatir = screen.getByText("Fabrika kirası", { selector: "div" }).closest("tr");
    expect(within(kiraSatir).getByText("Ortak gider")).toBeTruthy();
    fireEvent.click(screen.getByText(/Çalışanları göster/));
    const perSatir = screen.getByText("Hasan Yılmaz", { selector: "div" }).closest("tr");
    expect(within(perSatir).getByText("AK100 · S1")).toBeTruthy();
    expect(within(perSatir).queryByText("Ortak gider")).toBeNull();
  });
});

describe("Makina maliyeti ekranları (R6, R8, R11)", () => {
  it("AC-8: makinaya atanmış personel kalemi maliyet detayının doğrudan gider satırında görünür", () => {
    render(<MakinaMaliyetDetay detay={makinaKarlilik(maliyet(), "musteri:1")} />);
    const satir = screen.getByText("Doğrudan giderler").parentElement;
    expect(satir.textContent).toMatch(/15\/03\/2026 Personel gideri, 15\/03\/2026 Personel gideri/);
    expect(satir.textContent).toMatch(/100\.000/);
  });
  it("R11: model havuzu satırının etiketi işçiliği de kapsar", () => {
    render(<MakinaMaliyetDetay detay={makinaKarlilik(maliyet(), "musteri:1")} />);
    expect(screen.getByText("Model havuzu payları (malzeme ve işçilik)")).toBeTruthy();
    expect(screen.queryByText("Malzeme payları (model havuzları)")).toBeNull();
  });
  it("AC-9: maliyet detayı ve kârlılık listesinde çalışan adı ve resmi/elden kırılımı yok", () => {
    const s = maliyet();
    render(<MakinaMaliyetDetay detay={makinaKarlilik(s, "musteri:1")} />);
    expect(document.body.textContent).not.toMatch(AD);
    expect(document.body.textContent).not.toMatch(/resmi|elden/i);
    cleanup();
    render(<MakinaKarliligi sonuc={s} baslangic="2026-03-01" bitis="2026-03-31" bugun="2026-09-24" modeller={MOD} />);
    expect(document.body.textContent).not.toMatch(AD);
    expect(document.body.textContent).not.toMatch(/resmi|elden/i);
  });
});
