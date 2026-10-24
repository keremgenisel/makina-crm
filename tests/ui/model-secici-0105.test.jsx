// @vitest-environment jsdom
// Spec 0105: müşteri formunun model seçicisi üretimdeki modelleri ve stok adedini gösterir. Gerçek form ve gerçek Customers.
// Customers düzeneği tests/ui/serisiz-seri-0104.test.jsx'ten kopyalandı (o dosyaya dokunulmaz); `ertele: false`.
import { describe, it, expect, afterEach, vi } from "vitest";
import { useState } from "react";
import { render, fireEvent, screen, cleanup } from "@testing-library/react";
import { Customers } from "../../src/components/Customers";
import { CustomerAddEditForm, MODEL_BOS_KATALOG, MODEL_BOS_URETIMDE } from "../../src/components/customers/CustomerAddEditForm";
import { ALTUNMAK_MODELS } from "../../src/lib/constants";
import * as stokDurumu from "../../src/lib/stokDurumu";

// AC-30'un çağrı casusu: modülün kendi fonksiyonunu sarar, davranış aynı.
vi.mock("../../src/lib/stokDurumu", async (orijinal) => {
  const m = await orijinal();
  return { ...m, modelStokSayaci: vi.fn(m.modelStokSayaci) };
});

afterEach(() => { cleanup(); delete window.crmLocks; vi.useRealTimers(); });

const M0 = ALTUNMAK_MODELS[0].model;
function kur({ customers = [], stock = [], appSettings, models, openNewPrefill = null, showToast = vi.fn() } = {}) {
  const durum = { customers, stock, partStockLog: [], services: [], partSales: [], payments: [], partStock: [] };
  const uygula = (k, u) => { durum[k] = typeof u === "function" ? u(durum[k]) : u; };
  const setter = (k) => vi.fn((u) => uygula(k, u));
  const setters = {
    setCustomers: setter("customers"), setStock: setter("stock"), setPartStockLog: setter("partStockLog"), setServices: setter("services"),
    setPartSales: setter("partSales"), setPayments: setter("payments"), setPartStock: setter("partStock"),
  };
  const ek = {};
  if (appSettings !== undefined) ek.appSettings = appSettings;
  if (models !== undefined) ek.models = models;
  if (openNewPrefill) ek.openNewPrefill = openNewPrefill;
  const ciz = () => (
    <Customers customers={durum.customers.filter(c => !c.deletedAt)} stock={durum.stock.filter(s => !s.deletedAt)} partStockLog={durum.partStockLog}
      services={durum.services} partSales={durum.partSales} payments={durum.payments} partStock={durum.partStock} giderYetki={false}
      uretimPartileri={[]} rates={{ usd: 41.5, eur: 45.25 }} showToast={showToast} {...ek} {...setters} />
  );
  const u = render(ciz());
  return { durum, setters, rerender: () => u.rerender(ciz()) };
}
const bekle = () => new Promise(r => setTimeout(r, 0));
// Formun model alanı: aç/kapa oku olan kutu (müşteri tablosundaki model etiketleriyle karışmasın).
const izgaraAc = () => {
  const ok = screen.getAllByText(/^[▼▲]$/).find(e => e.previousElementSibling?.tagName === "SPAN" && e.parentElement.style.userSelect === "none");
  fireEvent.click(ok.parentElement);
};
const kartAdlari = () => screen.queryAllByText((_, e) => e.tagName === "DIV" && e.style.fontWeight === "700" && e.parentElement?.style.cursor === "pointer")
  .map(e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join("").trim());
const kart = (m) => screen.getAllByText(m).find(e => e.tagName === "DIV" && e.style.fontWeight === "700");
const yeniMusteri = (ad = "Yeni AŞ") => {
  fireEvent.click(screen.getByText("Yeni Müşteri"));
  fireEvent.change(screen.getByPlaceholderText("Satın alan firma / kişi"), { target: { value: ad } });
};

// Bu blok spec'ten ÖNCEKİ kodla (fb0e902) yazıldı ve yeşil görüldü; nesne o kodun ürettiği kayıttır.
describe("Spec 0105 önkoşul (eski kodla yazıldı ve yeşil görüldü)", () => {
  it("AC-3 / AC-31: ayar verilmeyen formda ızgara katalogun bütün kartlarını katalog sırasıyla çizer", () => {
    kur();
    yeniMusteri();
    izgaraAc();
    expect(kartAdlari()).toEqual(ALTUNMAK_MODELS.map(m => m.model));
  });
  it("AC-22: aynı model seçilip kaydedilen kayıt tam nesne olarak spec öncesiyle aynı", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-24T09:00:00"));
    const { durum } = kur({ appSettings: { uretimdeOlmayanModeller: [ALTUNMAK_MODELS[1].model] } });
    yeniMusteri("Kıyas AŞ");
    izgaraAc();
    fireEvent.click(kart(M0));
    fireEvent.change(screen.getByPlaceholderText("AK140-2026-001"), { target: { value: "S-105" } });
    fireEvent.click(screen.getByText("Kaydet"));
    await bekle();
    const { id, ...kayit } = durum.customers[0];
    expect(typeof id).toBe("number");
    expect(kayit).toEqual({
      kalipSayisi: 0, satisYapan: "Altuntaş Makina", name: "Kıyas AŞ", phone: "", email: "", yetkili1Ad: "", yetkili1Tel: "",
      yetkili2Ad: "", yetkili2Tel: "", adres: "", city: "", country: "Türkiye", model: M0, kaliplar: [], bantlar: [],
      installDate: "2026-10-24", warrantyEnd: "2028-10-24", faturali: "Faturalı Yurtiçi", faturaBedeli: "", fabrikaSatisBedeli: "",
      komisyon: "", serialNo: "S-105", satisKuru: null, kalanBorc: 0,
    });
  });
});

// Doğrudan çizilen form (0091 AC-33 düzeneği). `ilk` formun başlangıç durumu; prop'lar rerender ile değişir.
const KAT = [
  { model: "AK100", sogutma: "Hava", kapasite: "100", kalip: "50" }, { model: "AK120", sogutma: "Hava", kapasite: "120", kalip: "50" },
  { model: "AKF3701", sogutma: "Su", kapasite: "370", kalip: "60" }, { model: "ÖZEL", sogutma: "Su", kapasite: "—", kalip: "—" },
  { model: "AK140", sogutma: "Su", kapasite: "140", kalip: "55" },
];
const AYAR = { uretimdeOlmayanModeller: ["AKF3701", "ÖZEL"] };
function Form({ ilk = { name: "A", kaliplar: [] }, modal = "add", ...p }) {
  const [form, setForm] = useState(ilk);
  return (
    <>
      <span data-testid="form-durum">{JSON.stringify({ model: form.model ?? null, _stokSerisiz: !!form._stokSerisiz, serialNo: form.serialNo ?? "" })}</span>
      <CustomerAddEditForm modal={modal} form={form} setForm={setForm} save={vi.fn()} onClose={vi.fn()} stock={[]} models={KAT}
        dealers={[]} factory={{ name: "Altuntaş" }} kdvRates={{}} payments={[]} geoData={null} loadingGeo={false} entity="customer" {...p} />
    </>
  );
}
const ciz = (p) => { const u = render(<Form {...p} />); return { rerender: (q) => u.rerender(<Form {...p} {...q} />) }; };
const formAc = () => fireEvent.click(screen.getByText(/^(Model seçin\.\.\.|AK100|AK120|AKF3701|ÖZEL|AK140|SILINMIS)$/, { selector: "span" }));
const durum = () => JSON.parse(screen.getByTestId("form-durum").textContent);
const ibareli = (m) => kart(m).textContent.includes("· üretimde değil");
const stokMetni = (m) => screen.getByTestId(`model-stok-${m}`).textContent;

describe("Spec 0105: süzme (R1–R8/2)", () => {
  it("AC-1 / AC-2 / AC-8: işaretli model çizilmez, işaretsiz çizilir ve ibare taşımaz", () => {
    ciz({ appSettings: AYAR });
    formAc();
    expect(kartAdlari()).toEqual(["AK100", "AK120", "AK140"]);
    expect(screen.queryByText("AKF3701")).toBeNull();
    for (const m of ["AK100", "AK120", "AK140"]) expect(ibareli(m), m).toBe(false);
  });
  it("AC-3 / AC-31: prop verilmeyen, boş, listesiz ve değeri undefined ayarla bütün kartlar çizilir", () => {
    for (const p of [{}, { appSettings: {} }, { appSettings: { uretimdeOlmayanModeller: [] } }, { appSettings: { uretimdeOlmayanModeller: undefined } }]) {
      ciz(p);
      formAc();
      expect(kartAdlari(), JSON.stringify(p)).toEqual(KAT.map(m => m.model));
      cleanup();
    }
  });
  it("AC-4: düzenleme kipinde kaydın üretimde olmayan modeli çizilir ve '· üretimde değil' taşır", () => {
    ciz({ appSettings: AYAR, modal: { edit: { id: 1, model: "AKF3701" } }, ilk: { id: 1, name: "A", model: "AKF3701", kaliplar: [] } });
    formAc();
    expect(kartAdlari()).toEqual(["AK100", "AK120", "AKF3701", "AK140"]);
    expect(ibareli("AKF3701")).toBe(true);
    const ibare = [...kart("AKF3701").querySelectorAll("span")].find(e => e.textContent === " · üretimde değil");
    expect(ibare.style.fontWeight).toBe("400");
    expect(ibare.style.color).toBe("var(--n500, #64748b)");
  });
  it("AC-27: düzenlemede başka modele geçince özgün model ızgarada kalır ve geri seçilebilir", () => {
    ciz({ appSettings: AYAR, modal: { edit: { id: 1, model: "AKF3701" } }, ilk: { id: 1, name: "A", model: "AKF3701", kaliplar: [] } });
    formAc();
    fireEvent.click(kart("AK100"));
    expect(durum().model).toBe("AK100");
    formAc();
    expect(kartAdlari()).toContain("AKF3701");
    fireEvent.click(kart("AKF3701"));
    expect(durum().model).toBe("AKF3701");
  });
  it("AC-28: katalogda olmayan model çizilmez, kapalı seçici kaydın adını yazar", () => {
    ciz({ appSettings: AYAR, modal: { edit: { id: 1, model: "SILINMIS" } }, ilk: { id: 1, name: "A", model: "SILINMIS", kaliplar: [] } });
    expect(screen.getByText("SILINMIS", { selector: "span" })).toBeTruthy();
    formAc();
    expect(kartAdlari()).toEqual(["AK100", "AK120", "AK140"]);
  });
  it("AC-6: stokta canlı satırı olan üretimde olmayan model (anahtar normalize) çizilir, ibareyle", () => {
    ciz({ appSettings: AYAR, stock: [{ id: 1, model: " akf3701 ", uretimDurumu: "montaj" }] });
    formAc();
    expect(kartAdlari()).toEqual(["AK100", "AK120", "AKF3701", "AK140"]);
    expect(ibareli("AKF3701")).toBe(true);
    expect(stokMetni("AKF3701")).toBe("1 montajda");
  });
  it("AC-7: yalnız çöpteki stok satırı istisna doğurmaz", () => {
    ciz({ appSettings: AYAR, stock: [{ id: 1, model: "AKF3701", deletedAt: "2026-10-01" }] });
    formAc();
    expect(kartAdlari()).toEqual(["AK100", "AK120", "AK140"]);
  });
  it("AC-9: katalog doluyken hepsi süzülmüşse 'Üretimde' kutusunu adres gösteren boş durum", () => {
    ciz({ appSettings: { uretimdeOlmayanModeller: KAT.map(m => m.model) } });
    formAc();
    const k = screen.getByTestId("bos-model-secici-uretimde");
    expect(k.textContent).toContain(MODEL_BOS_URETIMDE.baslik);
    expect(k.textContent).toContain("Ayarlar › Katalog › Makina Modelleri");
    expect(k.textContent).toContain("\"Üretimde\" kutusu");
    expect(screen.queryByTestId("bos-model-secici")).toBeNull();
    expect(kartAdlari()).toEqual([]);
  });
  it("AC-29: katalog boşken ayrı kimlikli ikinci boş durum; 'Üretimde' kutusunu adres göstermez", () => {
    ciz({ appSettings: AYAR, models: [] });
    formAc();
    const k = screen.getByTestId("bos-model-secici");
    expect(k.textContent).toContain(MODEL_BOS_KATALOG.baslik);
    expect(k.textContent).toContain("tanımlanır");
    expect(k.textContent).not.toMatch(/Üretimde"? kutusu/);
    expect(screen.queryByTestId("bos-model-secici-uretimde")).toBeNull();
  });
});

describe("Spec 0105: stok adedi (R9–R17)", () => {
  const STOK = [
    { id: 1, model: "AK100" }, { id: 2, model: "AK100", serialNo: "S2" }, { id: 3, model: "AK100", uretimDurumu: "montaj" },
    { id: 4, model: "AK120", uretimDurumu: "montaj" }, { id: 5, model: "AK140", deletedAt: "2026-10-01" },
  ];
  it("AC-10 / AC-12 / AC-13 / AC-14 / AC-15 / AC-16: kartlar ekranda iki parçalı metni ve 'Stokta yok'u yazar", () => {
    ciz({ stock: STOK });
    formAc();
    expect(stokMetni("AK100")).toBe("2 satışa hazır · 1 montajda");
    expect(stokMetni("AK120")).toBe("1 montajda");
    expect(stokMetni("AK140")).toBe("Stokta yok");
    expect(stokMetni("AKF3701")).toBe("Stokta yok");
  });
  it("AC-11 / AC-17: stock prop'u değişince sayı okuma anında yenilenir", () => {
    const { rerender } = ciz({ stock: STOK });
    formAc();
    rerender({ stock: [{ id: 9, model: "AK100" }] });
    expect(stokMetni("AK100")).toBe("1 satışa hazır");
    expect(stokMetni("AK120")).toBe("Stokta yok");
  });
  it("AC-18: kart sırası katalog sırasıdır; stok adedi sırayı değiştirmez", () => {
    ciz({ stock: [{ id: 1, model: "AK140" }, { id: 2, model: "AK140" }, { id: 3, model: "AKF3701" }] });
    formAc();
    expect(kartAdlari()).toEqual(KAT.map(m => m.model));
  });
  it("AC-19: karta tıklayınca model seçilir, ızgara kapanır, model değişince serisiz işareti sıfırlanır", () => {
    ciz({ ilk: { name: "A", kaliplar: [], model: "AK100", _stokSerisiz: true, serialNo: "X1" } });
    formAc();
    fireEvent.click(kart("AK120"));
    expect(durum()).toEqual({ model: "AK120", _stokSerisiz: false, serialNo: "" });
    expect(kartAdlari()).toEqual([]);
  });
  it("AC-30: sayaç çizim başına bir kez, yalnız { stock } ile çağrılır (açma ve kart seçimi yeniden hesaplatmaz)", () => {
    stokDurumu.modelStokSayaci.mockClear();
    ciz({ stock: STOK });
    formAc();
    fireEvent.click(kart("AK120"));
    formAc();
    expect(stokDurumu.modelStokSayaci).toHaveBeenCalledTimes(1);
    expect(stokDurumu.modelStokSayaci.mock.calls[0]).toEqual([{ stock: STOK }]);
  });
});

describe("Spec 0105: gerçek Customers", () => {
  it("AC-5: Evrak'tan gelen ön doldurma ekleme kipinde; üretimde olmayan model ibareyle çizilir", () => {
    kur({ appSettings: { uretimdeOlmayanModeller: [ALTUNMAK_MODELS[2].model] }, openNewPrefill: { name: "Belge AŞ", model: ALTUNMAK_MODELS[2].model, fromTeklifId: 900 } });
    izgaraAc();
    expect(kartAdlari()).toEqual(ALTUNMAK_MODELS.map(m => m.model));
    expect(kart(ALTUNMAK_MODELS[2].model).textContent).toContain("· üretimde değil");
  });
  it("AC-1 / R24: Customers ayarı forma iletir", () => {
    kur({ appSettings: { uretimdeOlmayanModeller: [ALTUNMAK_MODELS[1].model] } });
    yeniMusteri();
    izgaraAc();
    expect(kartAdlari()).toEqual(ALTUNMAK_MODELS.filter((_, i) => i !== 1).map(m => m.model));
  });
});
