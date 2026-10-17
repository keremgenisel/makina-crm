// @vitest-environment jsdom
// Spec 0020: personel giderinin atanabilmesi, arayüz tarafı (form, Makina ve Model, dönem raporu kalem listesi,
// maliyet detayı, kârlılık listesi). Gizlilik: makina bazlı ekranlarda çalışan adı ve resmi/elden kırılımı yok (AC-9).
// Spec 0089 ile (C7 0020 AC-9, AC-15; R10, R11): Makina ve Model, maliyet detayı ve kârlılık listesi ekrandan kalktı. Etiket ve
// gizlilik iddiaları onları besleyen motor çıktılarında ölçülür (rapor ve makina maliyeti); kopmuş atama Dönem Raporu'nun kovalar
// kutusunda sayı olarak kalır (0089 R12).
// Spec 0090 ile (R1, R10, R11): formda atama bölümü, kovalar kutusu ve kalem listesinin atama sütunu kalktı. Form blokları
// "alan yok, eski atama korunur" iddiasına, kutu ve sütun blokları yokluk iddiasına çevrildi; motor blokları aynen durur.
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { GiderForm } from "../../src/components/GiderForm";
import { KalemListesi } from "../../src/components/gider/DonemRaporu";
import { hesaplaGiderRaporu, canliModelSeti } from "../../src/lib/gider";
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

  it("AC-1 / AC-3 / AC-13 (spec 0090 ile): personel kaleminde atama bölümü, uyarı ve işçilik ipucu yok; yeni kalem atama yazmaz", () => {
    const onSave = ac(); personel();
    expect(screen.queryByText("Makina maliyeti ataması")).toBeNull();
    expect(screen.queryByText(UYARI)).toBeNull();
    expect(screen.queryByText(/birim maliyet, o modelin bir makinasına düşen işçiliktir/)).toBeNull();
    fireEvent.click(screen.getByText("Kaydet"));
    expect(onSave.mock.calls[0][0]).toMatchObject({ resmiTutar: 30000, eldenTutar: 20000 });
    expect(onSave.mock.calls[0][0]).not.toHaveProperty("atamaTur");
  });
  it("AC-6 (spec 0090 ile): personelden kiraya geçişte de atama bölümü yok; kira kalemi atama anahtarı taşımaz", () => {
    const onSave = ac(); personel();
    tur(1);
    expect(screen.queryByText("Makina maliyeti ataması")).toBeNull();
    fireEvent.change(screen.getByLabelText("Brüt kira"), { target: { value: "20.000" } });
    fireEvent.click(screen.getByText("Kaydet"));
    for (const a of ["atamaTur", "makinaTur", "makinaId"]) expect(onSave.mock.calls[0][0]).not.toHaveProperty(a);
  });
});

// ── Makina bazlı ekranlar ───────────────────────────────────────────────────
const TUR = [{ id: 1, ad: "Genel", davranis: "normal" }, { id: 2, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }];
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
const maliyet = () => hesaplaMakinaMaliyetleri({ customers: CUSTOMERS, stock: [], partStockLog: [], giderler: GIDERLER, giderTurleri: TUR,
  standardModels: MOD, customModels: [], giderAyarlari: { yururlukAy: "2026-01" } }, { bugun: "2026-09-24" });

describe("Makina ve Model'i besleyen rapor çıktısı (R8, R9; spec 0089 ile motor düzeyinde)", () => {
  it("AC-15 (spec 0089 ile): model kırılımı satırı 'Personel gideri' etiketiyle; rapor çıktısının görünen adlarında çalışan adı yok", () => {
    const r = rapor();
    expect(r.modelBazli.flatMap(m => m.satirlar).map(x => x.aciklama)).toEqual(["Personel gideri"]);
    expect(JSON.stringify(r.modelBazli)).not.toMatch(AD);
  });
  it("AC-14 / AC-9 (spec 0090 ile): kovalar kutusu kalktı; kopmuş atama ve kısmi dağıtım rapor çıktısında kalır, ad yazmaz", () => {
    const r = rapor();
    expect(r.kismiOrtak.map(x => x.kalem.id)).toEqual([3]);
    expect(JSON.stringify(r.kismiOrtak.map(x => ({ id: x.kalem.id, tutar: x.ortak })))).not.toMatch(AD);
  });
});

describe("Dönem raporu kalem listesi (R10; spec 0090 ile atama sütunu kalktı)", () => {
  it("R10 (spec 0090 ile): atanmış personel ve kira kaleminde atama sütunu ve makina adı yok", () => {
    const kira = { id: 8, tarih: "2026-03-15", turId: 2, tutar: 30000, kdvOrani: 20, stopajOrani: 20, girisYonu: "brut", aciklama: "Fabrika kirası", atamaTur: "makina", makinaTur: "musteri", makinaId: 1, odendi: false };
    render(<KalemListesi kalemler={[GIDERLER[0], kira]} giderTurleri={TUR} tedarikciler={[]}
      bugun="2026-09-24" canDo={() => true} onDuzenle={vi.fn()} onSil={vi.fn()} onOdendi={vi.fn()} />);
    expect(screen.queryByRole("columnheader", { name: "Atama" })).toBeNull();
    fireEvent.click(screen.getByText(/Çalışanları göster/));
    expect(screen.getByText("Hasan Yılmaz", { selector: "div" })).toBeTruthy();
    expect(screen.queryByText("AK100 · S1")).toBeNull();
    expect(screen.queryByText("Ortak gider")).toBeNull();
  });
});

describe("Makina maliyeti motoru (R6, R8, R11; spec 0089 ile ekranlar kalktı)", () => {
  it("AC-8 (spec 0089 ile): makinaya atanmış personel kalemi doğrudan gider satırında 'Personel gideri' adıyla", () => {
    const d = makinaKarlilik(maliyet(), "musteri:1");
    expect(d.dogrudanKalemler.map(x => [x.tarih, x.aciklama])).toEqual([["2026-03-15", "Personel gideri"], ["2026-03-15", "Personel gideri"]]);
    expect(d.dogrudanKalemler.reduce((t, x) => t + x.tutar, 0)).toBe(100000);
  });
  it("AC-9 (spec 0089 ile): makina maliyeti sonucunda çalışan adı yok", () => {
    const s = maliyet();
    expect(JSON.stringify(makinaKarlilik(s, "musteri:1"))).not.toMatch(AD);
    expect(JSON.stringify(s)).not.toMatch(AD);
  });
});
