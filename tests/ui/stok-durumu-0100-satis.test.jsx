// @vitest-environment jsdom
// Spec 0100: satış formu ve stoktan düşüm (R6–R7/3). Gerçek Customers, App gibi bağlanır: ekrana çöpü süzülmüş stok, setter'a
// TAM dizi (çöptekiler dahil). Motor kriterleri tests/stok-durumu-0100.test.js'te.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, within } from "@testing-library/react";
import { Customers } from "../../src/components/Customers";
import * as satisKaydi from "../../src/lib/satisKaydi";
import { PANO_SEKME_ADI } from "../../src/lib/stokDurumu";
import { ALTUNMAK_MODELS } from "../../src/lib/constants";

// Spec 0103 Karar 29 (AC-23): damgalamaya casus; davranış aynen (orijinal çağrılır).
vi.mock("../../src/lib/satisKaydi", async (orijinal) => {
  const m = await orijinal();
  return { ...m, partiDamgala: vi.fn(m.partiDamgala) };
});

afterEach(cleanup);

// `ertele`: güncelleyici React'taki gibi olay bittikten sonra çalışır (ekleme kolu partiyi ve kaynağı setCustomers çağrısından
// sonra damgalar; anında çalışan düzenek damgadan önceki kaydı görürdü). Varsayılan anında (eski testler aynen).
function kur({ customers = [], stock = [], giderYetki = true, uretimPartileri = [], ertele = false } = {}) {
  const durum = { customers, stock, partStockLog: [], services: [], partSales: [], payments: [], partStock: [] };
  const uygula = (k, u) => { durum[k] = typeof u === "function" ? u(durum[k]) : u; };
  const setter = (k) => vi.fn((u) => { if (ertele) queueMicrotask(() => uygula(k, u)); else uygula(k, u); });
  const setters = {
    setCustomers: setter("customers"), setStock: setter("stock"), setPartStockLog: setter("partStockLog"), setServices: setter("services"),
    setPartSales: setter("partSales"), setPayments: setter("payments"), setPartStock: setter("partStock"),
  };
  const ciz = () => (
    <Customers customers={durum.customers.filter(c => !c.deletedAt)} stock={durum.stock.filter(s => !s.deletedAt)} partStockLog={durum.partStockLog}
      services={durum.services} partSales={durum.partSales} payments={durum.payments} partStock={durum.partStock} giderYetki={giderYetki}
      uretimPartileri={uretimPartileri} rates={{ usd: 41.5, eur: 45.25 }} {...setters} />
  );
  const u = render(ciz());
  return { durum, setters, rerender: () => u.rerender(ciz()) };
}
const satir = (ad) => screen.getByText(ad).closest("tr");
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getAllByRole("button").find(b => b.querySelector("svg") && b.className.includes("ghost")));
const kaydet = () => fireEvent.click(screen.getByText("Kaydet"));
const stokSecici = () => screen.getByText(/Stoktan seçin/).closest("select");
const BEKLEYEN = { id: 1, name: "Bekleyen Seri", model: "AK100", serialNo: "", seriNoBekliyor: true, installDate: "2026-05-01" };

describe("Spec 0100 plan P4: serisiz düşüm çöpteki satırı değil canlı satırı düşer", () => {
  it("çöpte aynı modelden serisiz satır öndeyken satış canlı satırı düşer, çöpteki yerinde kalır", () => {
    const COPTE = { id: 90, model: "AK100", serialNo: "", addedDate: "2026-01-01", deletedAt: "2026-10-01T10:00:00.000Z" };
    const CANLI = { id: 91, model: "AK100", serialNo: "", addedDate: "2026-02-01" };
    const { durum } = kur({ customers: [BEKLEYEN], stock: [COPTE, CANLI] });
    duzenle("Bekleyen Seri");
    fireEvent.change(stokSecici(), { target: { value: "__serisiz__" } });
    kaydet();
    expect(durum.customers[0].sourceStockId).toBe(91);
    expect(durum.stock).toEqual([COPTE]);
  });
});

const KAPALI = { id: 901, ad: "2026-1", baslangicAy: "2026-06", bitisAy: "2026-08" };
const ACIK = { id: 902, ad: "2026-2", baslangicAy: "2026-09", bitisAy: null };
const PARTILER = [KAPALI, ACIK];
const yeniMusteri = (ad) => {
  fireEvent.click(screen.getByText("Yeni Müşteri"));
  fireEvent.change(screen.getByPlaceholderText("Satın alan firma / kişi"), { target: { value: ad } });
};
const partiSecici = () => screen.queryByLabelText("Üretim partisi");

describe("Spec 0100: stoktan seçim listesi (R6, R6/2, R6/3)", () => {
  const STOK = [
    { id: 70, model: "AK100", serialNo: "S-70", addedDate: "2026-09-10", uretimDurumu: "montaj", partiId: 902 },
    { id: 71, model: "AK100", serialNo: "S-71", addedDate: "2026-09-01" },
    { id: 72, model: "AK100", serialNo: "", addedDate: "2026-09-12", uretimDurumu: "montaj" },
    { id: 73, model: "AK100", serialNo: "", addedDate: "2026-09-08" },
    { id: 74, model: "AK100", serialNo: "", addedDate: "2026-09-02", uretimDurumu: "montaj" },
  ];
  it("AC-18 / AC-52: serili montajdaki makina durumuyla görünür; serisiz seçenek kırılımı yazar", () => {
    kur({ customers: [BEKLEYEN], stock: STOK, uretimPartileri: PARTILER });
    duzenle("Bekleyen Seri");
    const secenekler = [...stokSecici().options].map(o => o.textContent);
    expect(secenekler).toContain("S-70 · Montajda");
    expect(secenekler).toContain("S-71 · Satışa hazır");
    expect(secenekler).toContain("Seri no'suz stoktan düş: 1 satışa hazır, 2 montajda");
  });
  it("AC-19: montajdaki makina satılınca stok satırı düşer, müşteri kaydı partiyi ve üretim tarihini taşır", () => {
    const { durum } = kur({ customers: [BEKLEYEN], stock: STOK, uretimPartileri: PARTILER });
    duzenle("Bekleyen Seri");
    fireEvent.change(stokSecici(), { target: { value: "S-70" } });
    kaydet();
    expect(durum.customers[0]).toMatchObject({ serialNo: "S-70", sourceStockId: 70, partiId: 902, uretimTarihi: "2026-09-10" });
    expect(durum.stock.map(s => s.id)).toEqual([71, 72, 73, 74]);
  });
  it("AC-51: serisiz satış satışa hazır olanların en eskisini düşer (montajdaki daha eski olsa da)", () => {
    const { durum } = kur({ customers: [BEKLEYEN], stock: STOK, uretimPartileri: PARTILER });
    duzenle("Bekleyen Seri");
    fireEvent.change(stokSecici(), { target: { value: "__serisiz__" } });
    kaydet();
    expect(durum.customers[0].sourceStockId).toBe(73);
    expect(durum.stock.map(s => s.id)).toEqual([70, 71, 72, 74]);
  });
});

describe("Spec 0100: satış formunun üretim partisi seçicisi (R7/2–R7/2b, C13)", () => {
  it("AC-39: stoktan makina seçilmeden açılan satışta seçici çizilir ve seçilen parti kayda yazılır", () => {
    const { durum } = kur({ uretimPartileri: PARTILER });
    yeniMusteri("Ön Sipariş AŞ");
    const secenekler = [...partiSecici().options].map(o => o.textContent);
    expect(secenekler).toEqual(["Partisiz", "2026-1", "2026-2 (açık)"]);
    fireEvent.change(partiSecici(), { target: { value: "902" } });
    kaydet();
    expect(durum.customers[0]).toMatchObject({ name: "Ön Sipariş AŞ", partiId: 902 });
  });
  it("AC-40: parti seçilmeden kaydedilen satış partisiz kalır, gövdede alan yok; seçip geri boşaltmak da alanı siler", () => {
    const { durum } = kur({ uretimPartileri: PARTILER });
    yeniMusteri("Partisiz AŞ");
    fireEvent.change(partiSecici(), { target: { value: "902" } });
    fireEvent.change(partiSecici(), { target: { value: "" } });
    kaydet();
    expect(durum.customers[0].name).toBe("Partisiz AŞ");
    expect("partiId" in durum.customers[0]).toBe(false);
  });
  it("AC-42 / AC-54: önce parti seçilip sonra stoktan satır seçilince seçici kaybolur ve parti stok satırından gelir", () => {
    const STOK = [{ id: 80, model: "AK100", serialNo: "S-80", addedDate: "2026-07-01", partiId: 901 }, { id: 81, model: "AK100", serialNo: "S-81", addedDate: "2026-07-02" }];
    const { durum } = kur({ customers: [BEKLEYEN], stock: STOK, uretimPartileri: PARTILER });
    duzenle("Bekleyen Seri");
    fireEvent.change(partiSecici(), { target: { value: "902" } });
    fireEvent.change(stokSecici(), { target: { value: "S-80" } });
    expect(partiSecici()).toBeNull();
    kaydet();
    expect(durum.customers[0]).toMatchObject({ sourceStockId: 80, partiId: 901 });
  });
  it("AC-54: partisiz stok satırı seçilince formda seçilmiş parti kayda girmez (anahtar yok)", () => {
    const STOK = [{ id: 81, model: "AK100", serialNo: "S-81", addedDate: "2026-07-02" }];
    const { durum } = kur({ customers: [BEKLEYEN], stock: STOK, uretimPartileri: PARTILER });
    duzenle("Bekleyen Seri");
    fireEvent.change(partiSecici(), { target: { value: "902" } });
    fireEvent.change(stokSecici(), { target: { value: "S-81" } });
    kaydet();
    expect(durum.customers[0].sourceStockId).toBe(81);
    expect("partiId" in durum.customers[0]).toBe(false);
  });
  it("AC-53 (R7/2a): gider yetkisi olmayan kullanıcıda seçici çizilmez", () => {
    kur({ giderYetki: false, uretimPartileri: PARTILER });
    yeniMusteri("Yetkisiz AŞ");
    expect(partiSecici()).toBeNull();
  });
  // spec 0103 ile (Karar 1, AC-1, AC-2): 0100 X8 / R7/2a'nın kip yarısı / R7/3 ters çevrildi; satılmış kaydın düzenlemesinde
  // seçici çizilir ve mevcut parti seçili gelir.
  it("R7/2a (spec 0103 ile): satılmış (seri no'su olan) kaydın düzenlemesinde seçici çizilir, mevcut parti seçili", () => {
    kur({ customers: [{ id: 2, name: "Satılmış", model: "AK100", serialNo: "S-1", installDate: "2026-05-01", partiId: 901 }], uretimPartileri: PARTILER });
    duzenle("Satılmış");
    expect(partiSecici().value).toBe("901");
  });
});

describe("Spec 0100 triyaj: stoktan düşümün kenar durumları", () => {
  it("bulgu 3 (R7/2b): serisiz stok seçildikten sonra satır yarışta kaybolursa formdaki parti yine kayda girmez", () => {
    const { durum, rerender } = kur({ customers: [BEKLEYEN], stock: [{ id: 95, model: "AK100", serialNo: "", addedDate: "2026-09-01" }], uretimPartileri: PARTILER });
    duzenle("Bekleyen Seri");
    fireEvent.change(partiSecici(), { target: { value: "902" } });
    fireEvent.change(stokSecici(), { target: { value: "__serisiz__" } });
    durum.stock = []; // başka bilgisayar aynı makinayı az önce sattı
    rerender();
    kaydet();
    expect("partiId" in durum.customers[0]).toBe(false);
  });
  it("bulgu 4: serili düşüm çöpte aynı model ve seriyle duran satırı silmez, yalnız canlı satırı düşer", () => {
    const COPTE = { id: 96, model: "AK100", serialNo: "S-96", addedDate: "2026-01-01", deletedAt: "2026-10-01T10:00:00.000Z" };
    const CANLI = { id: 97, model: "AK100", serialNo: "S-96", addedDate: "2026-02-01" };
    const { durum } = kur({ customers: [BEKLEYEN], stock: [COPTE, CANLI], uretimPartileri: PARTILER });
    duzenle("Bekleyen Seri");
    fireEvent.change(stokSecici(), { target: { value: "S-96" } });
    kaydet();
    expect(durum.customers[0].sourceStockId).toBe(97);
    expect(durum.stock).toEqual([COPTE]);
  });
  it("bulgu 3 sınırı: stok hiç yokken elle yazılan seriyle yapılan satışın seçilmiş partisi korunur (AC-39)", () => {
    const { durum } = kur({ customers: [BEKLEYEN], uretimPartileri: PARTILER });
    duzenle("Bekleyen Seri");
    fireEvent.change(partiSecici(), { target: { value: "901" } });
    kaydet();
    expect(durum.customers[0].partiId).toBe(901);
  });
});

// ── Spec 0103: satılmış makinanın partisi sonradan düzeltilir (R1–R17). Kayıt yolu ve stok tarafı değişmez.
const SATILMIS = { id: 2, name: "Satılmış AŞ", model: "AK100", serialNo: "S-1", installDate: "2026-05-01", currency: "TRY",
  uretimTarihi: "2026-04-10", sourceStockId: 77, kaliplar: [{ olcu: "10" }], kalipSayisi: 1, kalanBorc: 0, satisKuru: null };
const IPUCU_0103 = `Stoktan makina seçilmeden yapılan satış partiye buradan bağlanır. Kaydedilmiş bir satışın partisi de buradan düzeltilir; seçilmezse satış partisiz kalır ve ${PANO_SEKME_ADI}'nun satılan adedinde görünmez.`;
// Ekleme formunun model seçicisi Customers'ın varsayılan kataloğundan (bu düzenek models vermiyor).
const M0 = ALTUNMAK_MODELS[0].model;
const modelSec = () => {
  fireEvent.click(screen.getByText("Model seçin..."));
  fireEvent.click(screen.getAllByText(M0).find(e => e.tagName === "DIV" && e.style.fontWeight === "700"));
};
const kilitKur = () => {
  const cagrilar = [];
  window.crmLocks = { acquire: vi.fn(async (t, id) => { cagrilar.push([t, String(id)]); return { ok: true }; }), release: vi.fn(async () => {}) };
  return cagrilar;
};

describe("Spec 0103: parti seçicisinin çizilmesi (R1–R8/2)", () => {
  it("AC-1 / AC-2 / AC-12: seri no'su dolu kaydın düzenlemesinde seçici görünür, mevcut parti seçili, ipucu Karar 8 cümlesi", () => {
    kur({ customers: [{ ...SATILMIS, partiId: 902 }], uretimPartileri: PARTILER });
    duzenle("Satılmış AŞ");
    expect(partiSecici().value).toBe("902");
    expect(screen.getByText(IPUCU_0103)).toBeTruthy();
    expect(IPUCU_0103).toContain("Parti Üretim Panosu'nun satılan adedinde görünmez.");
  });
  it("AC-3: partisi olmayan kayıtta seçici 'Partisiz' seçili açılır", () => {
    kur({ customers: [SATILMIS], uretimPartileri: PARTILER });
    duzenle("Satılmış AŞ");
    expect(partiSecici().value).toBe("");
    expect(partiSecici().selectedOptions[0].textContent).toBe("Partisiz");
  });
  it("AC-4: gider yetkisi olmayan kullanıcı düzenlemede de seçiciyi görmez", () => {
    kur({ customers: [{ ...SATILMIS, partiId: 902 }], uretimPartileri: PARTILER, giderYetki: false });
    duzenle("Satılmış AŞ");
    expect(partiSecici()).toBeNull();
  });
  it("AC-5: ekleme kipinde seçici bütün canlı partileri '(açık)' ekiyle listeler (bugünkü gibi)", () => {
    kur({ uretimPartileri: PARTILER });
    yeniMusteri("Yeni AŞ");
    expect([...partiSecici().options].map(o => o.textContent)).toEqual(["Partisiz", "2026-1", "2026-2 (açık)"]);
    expect(screen.getByText(IPUCU_0103)).toBeTruthy(); // AC-12: ekleme kipinde de aynı cümle
  });
  it("AC-6 / AC-8: seri bekleyen düzenlemede seçici çizilir, serisiz stok seçilince kaybolur ve form partisi kayda girmez", () => {
    const { durum } = kur({ customers: [BEKLEYEN], stock: [{ id: 60, model: "AK100", serialNo: "", addedDate: "2026-07-01" }], uretimPartileri: PARTILER });
    duzenle("Bekleyen Seri");
    fireEvent.change(partiSecici(), { target: { value: "902" } });
    fireEvent.change(stokSecici(), { target: { value: "__serisiz__" } });
    expect(partiSecici()).toBeNull();
    kaydet();
    expect("partiId" in durum.customers[0]).toBe(false);
  });
  it("AC-7: ekleme kipinde serili stok satırı seçilince seçici kaybolur ve parti satırdan gelir", async () => {
    const { durum } = kur({ stock: [{ id: 61, model: M0, serialNo: "S-61", addedDate: "2026-07-01", partiId: 901 }], uretimPartileri: PARTILER, ertele: true });
    yeniMusteri("Seri AŞ");
    modelSec();
    fireEvent.change(partiSecici(), { target: { value: "902" } });
    fireEvent.change(stokSecici(), { target: { value: "S-61" } });
    expect(partiSecici()).toBeNull();
    kaydet();
    await Promise.resolve();
    expect(durum.stock).toEqual([]);
    expect(durum.customers[0].partiId).toBe(901); // triyaj (bulgu 1): parti formdan (902) değil stok satırından
  });
  it("AC-9 (Karar 35): stokta aynı model ve seriyle hayalet satır dursa da seçici çizilir; stok seçicisi çizilmez", () => {
    kur({ customers: [SATILMIS], stock: [{ id: 99, model: "AK100", serialNo: "S-1", addedDate: "2026-07-01" }], uretimPartileri: PARTILER });
    duzenle("Satılmış AŞ");
    expect(partiSecici()).toBeTruthy();
    expect(screen.queryByText(/Stoktan seçin/)).toBeNull();
  });
  it("AC-10: çöpteki partiye bağlı satışta 'Silinmiş parti' değeri korur; canlı liste boşken de; terk edilince geri gelmez (X11)", () => {
    kur({ customers: [{ ...SATILMIS, partiId: 950 }], uretimPartileri: [] });
    duzenle("Satılmış AŞ");
    expect(partiSecici().value).toBe("950");
    expect([...partiSecici().options].map(o => o.textContent)).toEqual(["Partisiz", "Silinmiş parti"]);
    fireEvent.change(partiSecici(), { target: { value: "" } });
    expect([...partiSecici().options].map(o => o.textContent)).toEqual(["Partisiz"]);
  });
  it("AC-11: partisi olmayan kayıtta ve canlı parti yokken yalnız 'Partisiz'; kayıt partiId kazanmaz", () => {
    const { durum } = kur({ customers: [SATILMIS], uretimPartileri: [] });
    duzenle("Satılmış AŞ");
    expect([...partiSecici().options].map(o => o.textContent)).toEqual(["Partisiz"]);
    kaydet();
    expect("partiId" in durum.customers[0]).toBe(false);
  });
  it("AC-27: seri numarası boş ve seriNoBekliyor işareti olmayan kayıtta da seçici çizilir, mevcut parti seçili; stok seçicisi yok", () => {
    kur({ customers: [{ ...SATILMIS, serialNo: "", seriNoBekliyor: false, partiId: 901 }], stock: [{ id: 62, model: "AK100", serialNo: "", addedDate: "2026-07-01" }], uretimPartileri: PARTILER });
    duzenle("Satılmış AŞ");
    expect(partiSecici().value).toBe("901");
    expect(screen.queryByText(/Stoktan seçin/)).toBeNull();
  });
});

describe("Spec 0103: kayıt (R9–R11, C5, C7)", () => {
  it("AC-13 / AC-15 / AC-16 / AC-17: parti seçilip kaydedilir; kaydın öteki alanları ve stok tarafı değişmez", () => {
    const { durum, setters } = kur({ customers: [SATILMIS], uretimPartileri: PARTILER });
    satisKaydi.partiDamgala.mockClear();
    duzenle("Satılmış AŞ");
    fireEvent.change(partiSecici(), { target: { value: "902" } });
    kaydet();
    const yeni = durum.customers[0];
    expect(yeni.partiId).toBe(902);
    expect(yeni).toMatchObject({ sourceStockId: 77, uretimTarihi: "2026-04-10", serialNo: "S-1", kaliplar: [{ olcu: "10" }], kalipSayisi: 1 });
    for (const k of ["setStock", "setPartStockLog", "setPartStock"]) expect(setters[k], k).not.toHaveBeenCalled();
    // Karar 31: fark yalnız partiId ve bugünkü kayıt yolunun normalleştirmeleri.
    const IZINLI = new Set(["partiId", "satisKuru", "kalanBorc", "kaliplar", "kalipSayisi", "tevkifatli", "tevkifatPay", "tevkifatPayda"]);
    const anahtarlar = new Set([...Object.keys(SATILMIS), ...Object.keys(yeni)]);
    const fark = [...anahtarlar].filter(k => JSON.stringify(SATILMIS[k]) !== JSON.stringify(yeni[k]));
    expect(fark).toContain("partiId");
    expect(fark.filter(k => !IZINLI.has(k))).toEqual([]);
    expect(satisKaydi.partiDamgala).not.toHaveBeenCalled(); // AC-23 (Karar 29)
  });
  it("AC-14: 'Partisiz'e çekilip kaydedilince partiId anahtarı silinir, null kalmaz", () => {
    const { durum } = kur({ customers: [{ ...SATILMIS, partiId: 902 }], uretimPartileri: PARTILER });
    duzenle("Satılmış AŞ");
    fireEvent.change(partiSecici(), { target: { value: "" } });
    kaydet();
    expect("partiId" in durum.customers[0]).toBe(false);
  });
  it("AC-23 (Karar 29): seri bekleyen düzenlemede stoktan düşümde partiDamgala çağrılır (kayıt yolu değişmedi)", () => {
    kur({ customers: [BEKLEYEN], stock: [{ id: 63, model: "AK100", serialNo: "S-63", addedDate: "2026-07-01", partiId: 901 }], uretimPartileri: PARTILER });
    satisKaydi.partiDamgala.mockClear();
    duzenle("Bekleyen Seri");
    fireEvent.change(stokSecici(), { target: { value: "S-63" } });
    kaydet();
    expect(satisKaydi.partiDamgala).toHaveBeenCalled();
  });
});

describe("Spec 0103: stok-seri kilidi genişlemez (R17, Karar 13)", () => {
  afterEach(() => { delete window.crmLocks; });
  it("AC-29: seri no'su dolu kaydın düzenlemesinde yalnız customer kilidi istenir", async () => {
    const cagrilar = kilitKur();
    kur({ customers: [{ ...SATILMIS, partiId: 902 }], uretimPartileri: PARTILER });
    duzenle("Satılmış AŞ");
    await screen.findByLabelText("Üretim partisi");
    expect(cagrilar.map(c => c[0])).toEqual(["customer"]);
  });
  it("AC-29: ekleme ve seri bekleyen düzenlemede stoktan seri seçilince stok-seri kilidi bugünkü gibi istenir", async () => {
    const cagrilar = kilitKur();
    kur({ customers: [BEKLEYEN], stock: [{ id: 64, model: "AK100", serialNo: "S-64", addedDate: "2026-07-01" }], uretimPartileri: PARTILER });
    duzenle("Bekleyen Seri");
    fireEvent.change(await waitForStokSecici(), { target: { value: "S-64" } });
    await vi.waitFor(() => expect(cagrilar).toContainEqual(["stok-seri", "AK100::S-64"]));
    cleanup();
    const ek = kilitKur();
    kur({ stock: [{ id: 65, model: M0, serialNo: "S-65", addedDate: "2026-07-01" }], uretimPartileri: PARTILER });
    yeniMusteri("Kilit AŞ");
    modelSec();
    fireEvent.change(stokSecici(), { target: { value: "S-65" } });
    await vi.waitFor(() => expect(ek).toContainEqual(["stok-seri", `${M0}::S-65`]));
  });
});
const waitForStokSecici = async () => (await screen.findByText(/Stoktan seçin/)).closest("select");

