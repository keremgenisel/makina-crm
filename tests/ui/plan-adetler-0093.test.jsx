// @vitest-environment jsdom
// Spec 0093: Parti Hesabı'nın "Planlanan adetler" penceresi yalnız üretimdeki modelleri listeler. Gerçek MakinaMaliyeti
// (işaret appSettings.uretimdeOlmayanModeller'den motorla satırlara iner, pencere satırın `uretimde` alanını okur).
// Veri: üç standart (AK100, AK200_ESKI, AK300) ve üç özel model (OZ1, OZ2_ESKI, OZ3_ESKI); "_ESKI" adlılar üretimde değil.
// Parti 1 "Yaz": planlanan {AK100: 3, AK200_ESKI: 4, OZ2_ESKI: 2, SILINEN: 5}, OZ3_ESKI'nin partiye bağlı bir makinası var.
// Parti 2 "Olcum": spec'in ölçüm 1 kurulumu (AK200_ESKI planlanan 4, birim direkt 3.000 + pay 500 = 3.500 → 14.000,00 TL).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { useState } from "react";
import { MakinaMaliyeti } from "../../src/components/MakinaMaliyeti";
import { Settings } from "../../src/components/Settings";
import { PartiHesabi, PLAN_SUZGEC_CUMLESI, planGizliEki, PLAN_GERI_KOYMA_CUMLESI, PLAN_GIZLI_BASLIK, PLAN_GIZLI_KALDIRMA, PLAN_BOS_MODEL, PLAN_BOS_URETIMDE } from "../../src/components/maliyet/PartiHesabi";
import { URETIM_DEGIL_IBARESI, URETIM_ISARETI_IPUCU } from "../../src/lib/uretimdekiModeller";
import { modelMaliyetleri, PLAN_ADET_HATASI } from "../../src/lib/makinaStandartMaliyet";

afterEach(() => { cleanup(); vi.useRealTimers(); delete window.crmLocks; });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-19T10:00:00")); });

const mdl = (model) => ({ model, defaultParcalar: [], ekMaliyetler: [{ ad: "İşçilik", tutar: 3000 }], karKatsayisi: 2 });
const STD = ["AK100", "AK200_ESKI", "AK300"].map(mdl);
const OZEL = ["OZ1", "OZ2_ESKI", "OZ3_ESKI"].map(mdl);
const GIZLI = ["AK200_ESKI", "OZ2_ESKI", "OZ3_ESKI"];
const TUMU = [...STD, ...OZEL].map(m => m.model);
const PLAN1 = { AK100: 3, AK200_ESKI: 4, OZ2_ESKI: 2, SILINEN: 5 };
const PARTILER = [
  { id: 1, ad: "Yaz", baslangicAy: "2026-01", bitisAy: "2026-12", planlananAdetler: PLAN1 },
  { id: 2, ad: "Olcum", baslangicAy: "2026-01", bitisAy: "2026-12", planlananAdetler: { AK200_ESKI: 4 } },
];
const STOCK = [{ id: 11, model: "OZ3_ESKI", serialNo: "S11", uretimTarihi: "2026-03-01", partiId: 1 }, { id: 12, model: "AK200_ESKI", serialNo: "S12", uretimTarihi: "2026-03-01", partiId: 2 }];
const TURLER = [{ id: 1, ad: "Genel", davranis: "normal", maliyetRolu: "genel" }];
const GIDERLER = [{ id: 1, tarih: "2026-02-10", turId: 1, tutar: 10000, kdvOrani: 0, modelSatirlari: [], taksitler: [] }];
const AYAR = { baslangicAy: "2026-01", bitisAy: "2026-12", varsayilanAdet: 20 }; // pay 10.000 / 20 = 500 TL

let durum;
function H({ gizli = GIZLI, std = STD, ozel = OZEL, partiler = PARTILER, perms = null, toast = vi.fn(), gorunum = "parti" }) {
  const [uretimPartileri, setUretimPartileri] = useState(structuredClone(partiler));
  const [appSettings, setAppSettings] = useState({ giderAyarlari: { yururlukAy: "2026-01" }, maliyetAyarlari: AYAR, ...(gizli.length ? { uretimdeOlmayanModeller: gizli } : {}) });
  durum = { uretimPartileri };
  return <MakinaMaliyeti aktifKullanici="kerem" giderler={GIDERLER} giderTurleri={TURLER} setGiderTurleri={vi.fn()} tedarikciler={[]}
    stock={STOCK} customers={[]} tumMusteriler={[]} partStockLog={[]} parts={[]} standardModels={std} customModels={ozel}
    setStandardModels={vi.fn()} setCustomModels={vi.fn()} uretimPartileri={uretimPartileri} setUretimPartileri={setUretimPartileri}
    appSettings={appSettings} setAppSettings={setAppSettings} rates={{}} serverPermissions={perms} showToast={toast} baslangicGorunum={gorunum} />;
}
const parti = (id) => fireEvent.change(screen.getByLabelText("Üretim partisi"), { target: { value: String(id) } });
const pencereAc = (id = 1) => { parti(id); fireEvent.click(screen.getByRole("button", { name: /Planlanan adetler/ })); };
const kaydet = () => fireEvent.click(screen.getByRole("button", { name: /Kaydet/ }));
const ad = (m) => `${m} planlanan adedi`;
const gizliAd = (m) => `${m} planlanan adedi (${URETIM_DEGIL_IBARESI})`;
const izgaraAdlari = () => screen.queryAllByRole("textbox").map(e => e.getAttribute("aria-label")).filter(a => /planlanan adedi$/.test(a));
const kayitli = (id = 1) => durum.uretimPartileri.find(p => p.id === id).planlananAdetler;

describe("Spec 0093: ızgara yalnız üretimdeki modeller (R1, R2)", () => {
  it("AC-1: üretimde işareti kaldırılmış model ızgarada alan olarak çizilmez", () => {
    render(<H />); pencereAc();
    for (const m of GIZLI) expect(screen.queryByLabelText(ad(m)), m).toBeNull();
  });
  it("AC-1/3: `uretimde` alanını hiç taşımayan satır çizilir (motorun seçeneksiz çıktısı)", () => {
    const modeller = modelMaliyetleri({ standardModels: STD, customModels: [], parts: [] }, 0).map(({ uretimde, ...m }) => m); // eslint-disable-line no-unused-vars
    expect(modeller.every(m => !("uretimde" in m))).toBe(true);
    render(<PartiHesabi pay={{ payK: 0 }} modeller={modeller} canDo={() => true} showToast={vi.fn()} veri={{ giderler: [], giderTurleri: [], stock: [], customers: [], partStockLog: [], uretimPartileri: [] }}
      rates={{}} bugun="2026-10-19" uretimPartileri={[{ id: 9, ad: "P", baslangicAy: "2026-01", planlananAdetler: { AK100: 1 } }]} setUretimPartileri={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Planlanan adetler/ }));
    expect(izgaraAdlari()).toEqual(["AK100", "AK200_ESKI", "AK300"].map(ad));
  });
  it("AC-2: üretimdeki modellerin hepsi çizilir, katalog sırasıyla (önce standart, sonra özel)", () => {
    render(<H gizli={["AK200_ESKI", "OZ2_ESKI"]} />); pencereAc();
    expect(izgaraAdlari()).toEqual(["AK100", "AK300", "OZ1", "OZ3_ESKI"].map(ad));
  });
  it("AC-19 / AC-19/2: harf büyüklüğüyle ayrılan iki addan yalnız işaretli olan gizlenir (pencere motorun kararını kullanır)", () => {
    render(<H std={[mdl("AK100")]} ozel={[mdl("ak100")]} gizli={["AK100"]} partiler={[{ id: 1, ad: "Yaz", baslangicAy: "2026-01", bitisAy: "2026-12" }]} />); pencereAc();
    expect(izgaraAdlari()).toEqual([ad("ak100")]);
    expect(screen.queryByTestId("plan-gizli-listesi")).toBeNull();
  });
});

describe("Spec 0093: kayıtlı adedi olan gizli model kendi bölümünde (R3)", () => {
  it("AC-3: kayıtlı adedi olmayan gizli model hiçbir yerde görünmez", () => {
    render(<H />); pencereAc();
    expect(screen.queryByLabelText(ad("OZ3_ESKI"))).toBeNull();
    expect(screen.queryByLabelText(gizliAd("OZ3_ESKI"))).toBeNull();
    expect(screen.getByTestId("plan-gizli-listesi").textContent).not.toContain("OZ3_ESKI");
  });
  it("AC-4 / AC-26 / AC-27 / AC-28: bölümde ad, adet ve ibare; katalog sırası; başlık ve kaldırma cümlesi", () => {
    render(<H />); pencereAc();
    const b = screen.getByTestId("plan-gizli-listesi");
    expect(b.textContent).toContain(PLAN_GIZLI_BASLIK);
    expect(b.textContent).toContain(PLAN_GIZLI_KALDIRMA);
    expect(b.textContent).toContain(URETIM_DEGIL_IBARESI);
    expect(within(b).getAllByRole("textbox").map(e => e.getAttribute("aria-label"))).toEqual([gizliAd("AK200_ESKI"), gizliAd("OZ2_ESKI")]);
    expect(screen.getByLabelText(gizliAd("AK200_ESKI")).value).toBe("4");
    expect(screen.getByLabelText(gizliAd("OZ2_ESKI")).value).toBe("2");
  });
  it("AC-4/2: bölümün erişilebilir adı ızgaranınkinden ayrı; aynı model iki bölümde birden çizilmez", () => {
    render(<H />); pencereAc();
    expect(screen.queryByLabelText(ad("AK200_ESKI"))).toBeNull();
    expect(screen.getAllByLabelText(gizliAd("AK200_ESKI"))).toHaveLength(1);
    expect(screen.getAllByLabelText(ad("AK100"))).toHaveLength(1);
    expect(screen.queryByLabelText(gizliAd("AK100"))).toBeNull();
  });
  it("AC-4/3: saklı 0 ve boş değer çizilmez; geçersiz saklı değer çizilir, hatası görünür ve düzeltilebilir", () => {
    render(<H partiler={[{ id: 1, ad: "Yaz", baslangicAy: "2026-01", bitisAy: "2026-12", planlananAdetler: { AK200_ESKI: 0, OZ2_ESKI: "", OZ3_ESKI: "abc" } }]} />); pencereAc();
    expect(screen.queryByLabelText(gizliAd("AK200_ESKI"))).toBeNull();
    expect(screen.queryByLabelText(gizliAd("OZ2_ESKI"))).toBeNull();
    expect(screen.getByLabelText(gizliAd("OZ3_ESKI")).value).toBe("abc");
    kaydet();
    expect(screen.getByTestId("plan-gizli-listesi").textContent).toContain(PLAN_ADET_HATASI);
    expect(kayitli().OZ3_ESKI).toBe("abc");
    fireEvent.change(screen.getByLabelText(gizliAd("OZ3_ESKI")), { target: { value: "5" } });
    kaydet();
    expect(kayitli().OZ3_ESKI).toBe(5);
  });
  it("AC-5: bölümdeki adet düzeltilip kaydedilir", () => {
    render(<H />); pencereAc();
    fireEvent.change(screen.getByLabelText(gizliAd("AK200_ESKI")), { target: { value: "7" } });
    kaydet();
    expect(kayitli()).toEqual({ ...PLAN1, AK200_ESKI: 7 });
  });
  it("AC-6 / AC-6/2: alan boşaltılıp kaydedilince ad düşer; bölümde 'Kaldır' düğmesi yok (ölçüm 3'ün dördüncü satırı oluşmaz)", () => {
    render(<H />); pencereAc();
    expect(within(screen.getByTestId("plan-gizli-listesi")).queryAllByRole("button")).toHaveLength(0);
    fireEvent.change(screen.getByLabelText(gizliAd("OZ2_ESKI")), { target: { value: "" } });
    expect(screen.getByLabelText(gizliAd("OZ2_ESKI"))).toBeTruthy(); // satır düzenleme sırasında kaybolmaz
    kaydet();
    const { OZ2_ESKI, ...kalan } = PLAN1; // eslint-disable-line no-unused-vars
    expect(kayitli()).toEqual(kalan);
  });
  it("AC-7: değişiklik yapmadan kaydetmek hiçbir adedi düşürmez ve eklemez (çizilmeyen ve bulunamayan adlar dahil)", () => {
    render(<H />); pencereAc();
    kaydet();
    expect(kayitli()).toEqual(PLAN1);
  });
  it("AC-7/2: gizli modelin alanına geçersiz değer yazılırsa kayıt olmaz ve hata görünür", () => {
    render(<H />); pencereAc();
    fireEvent.change(screen.getByLabelText(gizliAd("AK200_ESKI")), { target: { value: "x" } });
    kaydet();
    expect(screen.getByTestId("plan-gizli-listesi").textContent).toContain(PLAN_ADET_HATASI);
    expect(kayitli()).toEqual(PLAN1);
  });
});

describe("Spec 0093: süzgeç satırı ve boş durumlar (R4, R7)", () => {
  it("AC-8 / AC-8/2 / AC-8/3: taban cümle, sayı eki ve geri koyma cümlesi; alan anlamı ipucusu aynen", () => {
    render(<H />); pencereAc();
    const s = screen.getByTestId("plan-suzgec-ibaresi").textContent;
    expect(s).toContain(PLAN_SUZGEC_CUMLESI);
    expect(s).toContain(planGizliEki(3));
    expect(s).toContain(PLAN_GERI_KOYMA_CUMLESI);
    expect(screen.getByText(/Planlanan adet girilen model hesapta bu adetle kullanılır/)).toBeTruthy();
  });
  it("AC-8/2: gizli model yokken sayı eki hiç yazılmaz, taban cümle yine çizilir", () => {
    render(<H gizli={[]} />); pencereAc();
    const s = screen.getByTestId("plan-suzgec-ibaresi").textContent;
    expect(s).toBe(`${PLAN_SUZGEC_CUMLESI} ${PLAN_GERI_KOYMA_CUMLESI}`);
    expect(screen.queryByTestId("plan-gizli-listesi")).toBeNull();
    expect(izgaraAdlari()).toEqual(TUMU.map(ad));
  });
  it("AC-9 / AC-28: hepsi gizliyken boş ızgara yok, sayılı boş durum metni", () => {
    render(<H gizli={TUMU} />); pencereAc();
    expect(izgaraAdlari()).toEqual([]);
    const b = screen.getByTestId("bos-plan-uretimde");
    expect(b.textContent).toContain(PLAN_BOS_URETIMDE.baslik);
    expect(b.textContent).toContain(PLAN_BOS_URETIMDE.metin(6));
    expect(screen.queryByTestId("bos-plan-model")).toBeNull();
  });
  it("AC-10 / AC-11/2: hepsi gizliyken iki bölüm, ipucular ve Kaydet çalışır; kaldırma ve düzeltme yazılır", () => {
    render(<H gizli={TUMU} />); pencereAc();
    expect(screen.getByTestId("plan-gizli-listesi")).toBeTruthy();
    expect(screen.getByTestId("plan-bulunamayan-listesi")).toBeTruthy();
    expect(screen.getByTestId("plan-suzgec-ibaresi")).toBeTruthy();
    expect(screen.getByText(/Planlanan adet girilen model hesapta/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "SILINEN planlanan adedini kaldır" }));
    fireEvent.change(screen.getByLabelText(gizliAd("AK200_ESKI")), { target: { value: "7" } });
    kaydet();
    expect(kayitli()).toEqual({ AK100: 3, AK200_ESKI: 7, OZ2_ESKI: 2 });
  });
  it("AC-11 / AC-11/2 / AC-28: katalog boşken 'Tanımlı makina modeli yok'; sayılı metin yok; bulunamayan bölümü ve Kaydet çizilir", () => {
    render(<H std={[]} ozel={[]} gizli={[]} partiler={[{ id: 1, ad: "Yaz", baslangicAy: "2026-01", bitisAy: "2026-12", planlananAdetler: { SILINEN: 5 } }]} />); pencereAc();
    const b = screen.getByTestId("bos-plan-model");
    expect(b.textContent).toContain(PLAN_BOS_MODEL.baslik);
    expect(b.textContent).toContain(PLAN_BOS_MODEL.metin);
    expect(screen.queryByTestId("bos-plan-uretimde")).toBeNull();
    expect(screen.getByTestId("plan-suzgec-ibaresi").textContent).toBe(`${PLAN_SUZGEC_CUMLESI} ${PLAN_GERI_KOYMA_CUMLESI}`); // sayı eki yok
    expect(screen.getByTestId("plan-bulunamayan-listesi")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "SILINEN planlanan adedini kaldır" }));
    kaydet();
    expect(kayitli()).toBeFalsy();
  });
  it("AC-11: 'Üretim partisi yok' boş durumu ayrı kavram, değişmedi", () => {
    render(<H partiler={[]} />);
    expect(screen.getByTestId("bos-parti-hesabi").textContent).toContain("Üretim partisi yok");
  });
});

describe("Spec 0093: Parti Hesabı'nın geri kalanı süzülmez (R5, C1)", () => {
  it("AC-12: gizli modelin partiye bağlı makinası tabloda sayılır", () => {
    render(<H />); parti(1);
    expect(within(screen.getByTestId("parti-satiri-OZ3_ESKI")).getAllByRole("cell")[1].textContent).toBe("1");
  });
  it("AC-13: ölçüm 1 kurulumu işaretli ve işaretsiz birebir aynı (spec 0097 ile 32.000,00 TL)", () => {
    const { container } = render(<H />); parti(2);
    const isaretli = container.textContent;
    // Spec 0097 ile (R16): pay partinin kendi aylarından gelir (eskiden hesap ayarlarının payıyla 14.000,00); AC-13'ün asıl iddiası,
    // işaretli ve işaretsiz çizimin birebir aynı olması, aynen geçerli.
    expect(screen.getByTestId("ozet-standart").textContent).toContain("32.000,00");
    expect(screen.getByTestId("ozet-ciro").textContent).toContain("64.000,00"); // spec 0097 ile (eskiden 28.000,00)
    cleanup();
    const r2 = render(<H gizli={[]} />); parti(2);
    expect(r2.container.textContent).toBe(isaretli);
  });
  it("AC-14 / AC-15: gizli ama var olan model iki uyarıda ve bulunamayan bölümünde yok; gerçekten bulunamayan ad orada", () => {
    render(<H />); parti(1);
    const uyari = screen.getByTestId("plan-bulunamayan").textContent;
    expect(uyari).toContain("SILINEN");
    for (const m of GIZLI) expect(uyari, m).not.toContain(m);
    expect(screen.queryByTestId("model-bulunamayan")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Planlanan adetler/ }));
    const l = screen.getByTestId("plan-bulunamayan-listesi").textContent;
    expect(l).toContain("SILINEN");
    for (const m of GIZLI) expect(l, m).not.toContain(m);
    fireEvent.click(screen.getByRole("button", { name: "SILINEN planlanan adedini kaldır" }));
    kaydet();
    expect(kayitli()).toEqual({ AK100: 3, AK200_ESKI: 4, OZ2_ESKI: 2 });
  });
  it("AC-18: Üretim Partileri ve Hesap Ayarları görünümleri işaretli ve işaretsiz birebir aynı", () => {
    for (const gorunum of ["partiler", "ayarlar"]) {
      const a = render(<H gorunum={gorunum} />).container.textContent;
      cleanup();
      const b = render(<H gorunum={gorunum} gizli={[]} />).container.textContent;
      cleanup();
      expect(b, gorunum).toBe(a);
    }
  });
});

describe("Spec 0093: yetki ve kilit değişmedi (R10)", () => {
  it("AC-20: gider_tanim izni yoksa düğme yok", () => {
    render(<H perms={{ role: "user", permissions: JSON.stringify({ tabs: ["gider", "maliyet"], giderActions: ["gider_add"] }) }} />);
    expect(screen.queryByRole("button", { name: /Planlanan adetler/ })).toBeNull();
  });
  it("AC-20: başkası partiyi tutuyorsa gizli modelin düzeltmesi de bugünkü red mesajıyla reddedilir", async () => {
    window.crmLocks = { acquire: vi.fn(async () => ({ ok: true })), release: vi.fn(async () => {}), releaseAll: vi.fn(async () => {}),
      list: vi.fn(async () => [{ entity_type: "uretim_partisi", entity_id: "1", locked_by: "ayse" }]) };
    const toast = vi.fn();
    render(<H toast={toast} />);
    await waitFor(() => expect(window.crmLocks.list).toHaveBeenCalled());
    await new Promise(r => setTimeout(r, 0));
    pencereAc();
    fireEvent.change(screen.getByLabelText(gizliAd("AK200_ESKI")), { target: { value: "9" } });
    kaydet();
    expect(kayitli()).toEqual(PLAN1);
    expect(toast.mock.calls.find(c => c[1] === "err")?.[0]).toMatch(/ayse/);
  });
});

describe("Spec 0093: Ayarlar'ın kapsam ipucusu (R8)", () => {
  const BASE = {
    customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
    version: "3.46.0", factory: { name: "Altuntaş" }, setFactory: vi.fn(), kalipDefs: [], setKalipDefs: vi.fn(), parts: [], setParts: vi.fn(), rawParts: [],
    calisanlar: [], setCalisanlar: vi.fn(), partTypeDefs: [], setPartTypeDefs: vi.fn(), onInitialTabConsumed: vi.fn(), aktifKullanici: "kerem", showToast: vi.fn(),
  };
  it("AC-16: panelde ipucu yeni kapsamı (planlanan adetler penceresi) ve etkilenmeyenleri söyler", () => {
    render(<Settings {...BASE} initialTab="models" appSettings={{}} setAppSettings={vi.fn()} standardModels={STD} setStandardModels={vi.fn()}
      customModels={OZEL} setCustomModels={vi.fn()} rawCustomModels={OZEL} />);
    const t = screen.getByTestId("uretim-isareti-ipucu").textContent;
    expect(t).toBe(URETIM_ISARETI_IPUCU);
    expect(t).toMatch(/planlanan adetler penceresini süzer/);
    expect(t).toMatch(/model seçicileri, Analiz ve makina kayıtları etkilenmez/);
  });
});
