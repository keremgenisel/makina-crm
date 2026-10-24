// @vitest-environment jsdom
// Spec 0104: serisiz stok satırı düşülürken seri numarası girilebilir. Gerçek Customers, App gibi bağlanır: ekrana çöpü süzülmüş
// diziler, setter'a TAM dizi. Düzenek tests/ui/stok-durumu-0100-satis.test.jsx'ten kopyalandı (Karar 33; o dosyaya dokunulmaz).
// `ertele` varsayılan açık: güncelleyici olaydan sonra çalışır. Bu kip ekleme kolunun SIRA hatasını göremez (Karar 36 geri
// alınsa da ertelenen güncelleyici damgalı kaydı görür). Sıra hatasını React'ın hemen hesaplamasına en yakın kip olan
// `ertele: false` ile koşan tek ekleme testi ("Karar 36 bekçisi") ve gerçek App testleri (stok-durumu-0100-app) yakalar.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, within } from "@testing-library/react";
import { Customers } from "../../src/components/Customers";
import { ALTUNMAK_MODELS } from "../../src/lib/constants";
import { SERI_BEKLEYEN_CIFT_DUSUM_IPUCU } from "../../src/components/customers/CustomerAddEditForm";

afterEach(() => { cleanup(); delete window.crmLocks; });

const M0 = ALTUNMAK_MODELS[0].model;
const M1 = ALTUNMAK_MODELS[1].model;
function kur({ customers = [], stock = [], giderYetki = true, uretimPartileri = [], ertele = true, showToast = vi.fn() } = {}) {
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
      uretimPartileri={uretimPartileri} rates={{ usd: 41.5, eur: 45.25 }} showToast={showToast} {...setters} />
  );
  const u = render(ciz());
  return { durum, setters, showToast, rerender: () => u.rerender(ciz()) };
}
const bekle = () => new Promise(r => setTimeout(r, 0));
const stokSecici = () => screen.getByText(/Stoktan seçin/).closest("select");
const sec = (v) => fireEvent.change(stokSecici(), { target: { value: v } });
const kaydet = () => fireEvent.click(screen.getByText("Kaydet"));
const modelSec = (m = M0) => {
  // Formun model alanı: aç/kapa oku olan kutu (müşteri tablosundaki model etiketleriyle karışmasın).
  const ok = screen.getAllByText(/^[▼▲]$/).find(e => e.previousElementSibling?.tagName === "SPAN" && e.parentElement.style.userSelect === "none");
  fireEvent.click(ok.parentElement);
  fireEvent.click(screen.getAllByText(m).find(e => e.tagName === "DIV" && e.style.fontWeight === "700"));
};
const yeniMusteri = (ad = "Yeni AŞ") => {
  fireEvent.click(screen.getByText("Yeni Müşteri"));
  fireEvent.change(screen.getByPlaceholderText("Satın alan firma / kişi"), { target: { value: ad } });
};
const PARTI = { id: 902, ad: "2026-2", baslangicAy: "2026-09", bitisAy: null };
// Motorun seçimi (spec 0100 R6/3): önce satışa hazırın en eskisi (73), sonra montajdakinin.
const STOK = [
  { id: 72, model: M0, serialNo: "", addedDate: "2026-09-02", uretimDurumu: "montaj", partiId: 902, parcalar: [] },
  { id: 73, model: M0, serialNo: "", addedDate: "2026-09-08", partiId: 902, uretimTarihi: "2026-09-05", parcalar: [] },
  { id: 74, model: M0, serialNo: "S-74", addedDate: "2026-09-12", partiId: 902, parcalar: [] },
];

describe("Spec 0104 AC-6 (önkoşul, Karar 32): boş numaralı serisiz satış spec öncesiyle birebir", () => {
  // Bu test spec'ten ÖNCEKİ kodla (d9033b6) yazıldı ve yeşil görüldü; nesne o kodun ürettiği kayıttır.
  afterEach(() => vi.useRealTimers());
  it("AC-6: kaydın gövdesi tam nesne olarak aynı", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-23T09:00:00"));
    const { durum } = kur({ stock: structuredClone(STOK), uretimPartileri: [PARTI] });
    yeniMusteri("Kıyas AŞ");
    modelSec();
    sec("__serisiz__");
    kaydet();
    await bekle();
    const { id, ...kayit } = durum.customers[0];
    expect(typeof id).toBe("number");
    expect(kayit).toEqual({
      kalipSayisi: 0, satisYapan: "Altuntaş Makina", name: "Kıyas AŞ", phone: "", email: "", yetkili1Ad: "", yetkili1Tel: "",
      yetkili2Ad: "", yetkili2Tel: "", adres: "", city: "", country: "Türkiye", model: M0, kaliplar: [], bantlar: [],
      installDate: "2026-10-23", warrantyEnd: "2028-10-23", faturali: "Faturalı Yurtiçi", faturaBedeli: "", fabrikaSatisBedeli: "",
      komisyon: "", serialNo: "", seriNoBekliyor: true, satisKuru: null, kalanBorc: 0, sourceStockId: 73, uretimTarihi: "2026-09-05", partiId: 902,
      makinaDurumu: "hazir", // Spec 0106 ile (R2, R2/2): stoktan satışta satırın görünen durumu damgalanır (73 alanı boş → satışa hazır)
    });
    expect(durum.stock.map(x => x.id)).toEqual([72, 74]);
  });
});

const seriKutusu = () => screen.getByRole("textbox", { name: "Seri numarası" });
const yaz = (v) => fireEvent.change(seriKutusu(), { target: { value: v } });
const satir = (ad) => screen.getByText(ad).closest("tr");
const duzenle = (ad) => fireEvent.click(within(satir(ad)).getAllByRole("button").find(b => b.querySelector("svg") && b.className.includes("ghost")));
const partiSecici = () => screen.queryByLabelText("Üretim partisi");
const METIN_0104 = "Stoktan 1 adet düşülecek. Seri numarasını şimdi girebilir ya da boş bırakıp sonra 'Müşteriyi Düzenle' bölümünden girebilirsiniz.";
const serisizAc = (ek = {}) => {
  const k = kur({ stock: structuredClone(STOK), uretimPartileri: [PARTI], ...ek });
  yeniMusteri("Seri AŞ");
  modelSec();
  sec("__serisiz__");
  return k;
};

describe("Spec 0104: serisiz düşümde seri numarası (R1–R5)", () => {
  it("AC-1 / AC-2: serisiz seçenekte alan çizilir, boş gelir; sıra seçici → alan → metin", () => {
    serisizAc();
    expect(seriKutusu().value).toBe("");
    const metin = screen.getByText(METIN_0104);
    expect(stokSecici().compareDocumentPosition(seriKutusu()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(seriKutusu().compareDocumentPosition(metin) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("AC-1: serisiz seçilmeden (boş seçenek, serili satır) alan çizilmez", () => {
    kur({ stock: structuredClone(STOK), uretimPartileri: [PARTI] });
    yeniMusteri();
    modelSec();
    expect(screen.queryByRole("textbox", { name: "Seri numarası" })).toBeNull();
    sec("S-74");
    expect(screen.queryByRole("textbox", { name: "Seri numarası" })).toBeNull();
  });
  it("AC-8: numara dolunca seçici serisiz seçenekte kalır", () => {
    serisizAc();
    yaz("AK-2026-501");
    expect(stokSecici().value).toBe("__serisiz__");
    expect(seriKutusu().value).toBe("AK-2026-501");
  });
  it("AC-7: serisizden boş, serili ve manuel seçeneğe geçince numara temizlenir", () => {
    serisizAc();
    yaz("X-1");
    sec("");
    expect(stokSecici().value).toBe("");
    sec("__serisiz__");
    expect(seriKutusu().value).toBe("");
    yaz("X-2");
    sec("S-74");
    expect(stokSecici().value).toBe("S-74");
    sec("__serisiz__");
    yaz("X-3");
    sec("__manual__");
    expect(screen.getByPlaceholderText("AK140-2026-001").value).toBe("");
  });
});

describe("Spec 0104: kayıt yolu (R6–R10)", () => {
  it("AC-3 / AC-4 / AC-9 / AC-11 / AC-12: numara kayda girer, bekleyen olmaz; motorun satırı düşer ve damgalanır", async () => {
    const { durum, rerender } = serisizAc();
    yaz("AK-2026-501");
    kaydet();
    await bekle();
    const k = durum.customers[0];
    expect(k).toMatchObject({ serialNo: "AK-2026-501", sourceStockId: 73, uretimTarihi: "2026-09-05", partiId: 902 });
    expect("seriNoBekliyor" in k).toBe(false);
    expect(durum.stock.map(x => x.id)).toEqual([72, 74]);
    expect(durum.stock.every(x => x.serialNo !== "AK-2026-501")).toBe(true);
    rerender();
    expect(screen.getByRole("button", { name: "Seri No Bekleyen (0)" })).toBeTruthy();
  });
  it("AC-5: boş bırakılınca kayıt seriNoBekliyor ile doğar ve süzgeçte görünür", async () => {
    const { durum, rerender } = serisizAc();
    kaydet();
    await bekle();
    expect(durum.customers[0]).toMatchObject({ serialNo: "", seriNoBekliyor: true, sourceStockId: 73 });
    rerender();
    expect(screen.getByRole("button", { name: "Seri No Bekleyen (1)" })).toBeTruthy();
  });
  it("AC-10 / AC-24: numara serili stok satırında duruyorsa ipucu çizilir, motorun seçimi ve kayıt değişmez", async () => {
    const { durum } = serisizAc();
    expect(screen.queryByText(/Bu seri numarası stokta duruyor/)).toBeNull();
    yaz(" s-74 ");
    expect(screen.getByText("Bu seri numarası stokta duruyor; o makinayı satmak için listeden serili satırı seçin.")).toBeTruthy();
    expect(stokSecici().value).toBe("__serisiz__");
    kaydet();
    await bekle();
    expect(durum.customers[0]).toMatchObject({ serialNo: " s-74 ", sourceStockId: 73 });
    expect(durum.stock.map(x => x.id)).toEqual([72, 74]);
  });
  it("AC-13: kit ve kalıp çapı seçimde motorun satırından gelir; numara yazmak ikisini değiştirmez", () => {
    const capli = structuredClone(STOK);
    capli[1].kalipCapi = { en: "50", yukseklik: "80", boy: "115" };
    capli[0].kalipCapi = { en: "10", yukseklik: "10", boy: "10" };
    kur({ stock: capli, uretimPartileri: [PARTI] });
    yeniMusteri();
    modelSec();
    sec("__serisiz__");
    const cap = () => ["Çap", "Arka Ölçü", "Boy"].map(a => screen.getByRole("textbox", { name: a }).value);
    expect(cap()).toEqual(["50", "80", "115"]);
    yaz("AK-1");
    expect(cap()).toEqual(["50", "80", "115"]);
  });
  it("AC-14: serisiz seçimde parti seçicisi yok ve formdaki parti kayda girmez", async () => {
    const { durum } = kur({ stock: structuredClone(STOK), uretimPartileri: [PARTI, { id: 903, ad: "2026-3", baslangicAy: "2026-10", bitisAy: null }] });
    yeniMusteri();
    fireEvent.change(partiSecici(), { target: { value: "903" } });
    modelSec();
    sec("__serisiz__");
    expect(partiSecici()).toBeNull();
    yaz("AK-2");
    kaydet();
    await bekle();
    expect(durum.customers[0].partiId).toBe(902);
  });
  it("AC-15 / AC-25: satır yarışında bildirim çıkar; kayıt numaralı, damgasız ve bekleyen değil, stok dizisine dokunulmaz", async () => {
    const showToast = vi.fn();
    const { durum, rerender } = kur({ stock: structuredClone(STOK), uretimPartileri: [PARTI], showToast });
    yeniMusteri("Yarış AŞ");
    modelSec();
    sec("__serisiz__");
    yaz("AK-9");
    durum.stock = durum.stock.filter(x => x.serialNo); // başka bilgisayar serisiz satırları az önce sattı
    rerender();
    kaydet();
    await bekle();
    expect(showToast).toHaveBeenCalledWith("Stoktan düşülecek satır bulunamadı, satış stok bağı olmadan kaydedildi", "warn");
    const k = durum.customers[0];
    expect(k.serialNo).toBe("AK-9");
    for (const a of ["sourceStockId", "uretimTarihi", "partiId", "seriNoBekliyor"]) expect(a in k, a).toBe(false);
    expect(durum.stock.map(x => x.id)).toEqual([74]);
  });
  it("AC-25: satır bulunduğunda bildirim çıkmaz", async () => {
    const showToast = vi.fn();
    serisizAc({ showToast });
    kaydet();
    await bekle();
    expect(showToast.mock.calls.filter(c => /düşülecek satır bulunamadı/.test(c[0]))).toEqual([]);
  });
});

describe("Spec 0104: değişmeyenler (R11, R12, R12/2)", () => {
  it("AC-17: serili seçim ve stok-seri kilidi bugünkü gibi", async () => {
    const cagrilar = [];
    window.crmLocks = { acquire: vi.fn(async (t, id) => { cagrilar.push([t, String(id)]); return { ok: true }; }), release: vi.fn(async () => {}) };
    const { durum } = kur({ stock: structuredClone(STOK), uretimPartileri: [PARTI] });
    yeniMusteri();
    modelSec();
    sec("S-74");
    expect(screen.queryByRole("textbox", { name: "Seri numarası" })).toBeNull();
    await vi.waitFor(() => expect(cagrilar).toContainEqual(["stok-seri", `${M0}::S-74`]));
    kaydet();
    await bekle();
    expect(durum.customers[0]).toMatchObject({ serialNo: "S-74", sourceStockId: 74 });
  });
  it("AC-18 / AC-19: manuel girişte stok düşülmez; ipucu Karar 5 cümlesi, son cümle stok varken; parti seçicisi çizilir", async () => {
    const { durum } = kur({ stock: structuredClone(STOK), uretimPartileri: [PARTI] });
    yeniMusteri("Manuel AŞ");
    modelSec();
    sec("__manual__");
    const ipucu = screen.getByText(/^Manuel girilen seri no stoktan düşülmez/);
    expect(ipucu.textContent).toBe("Manuel girilen seri no stoktan düşülmez; stok dışı makina ve eski müşteri kaydı için uygundur. Stoktaki bir makinayı satıyorsanız 'Stoktan seçime dön' düğmesine basın.");
    expect(screen.getByText("Stoktan seçime dön")).toBeTruthy();
    expect(partiSecici()).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("AK140-2026-001"), { target: { value: "ESKI-1" } });
    kaydet();
    await bekle();
    expect(durum.customers[0].serialNo).toBe("ESKI-1");
    expect("sourceStockId" in durum.customers[0]).toBe(false);
    expect(durum.stock).toHaveLength(3);
  });
  it("AC-18 (R12/2): stoksuz modelde manuel ipucusunun son cümlesi yok", () => {
    // Stoksuz modelde stok seçicisi hiç çizilmez; manuel kip stok varken açılır, sonra stoksuz modele geçilir.
    kur({ stock: structuredClone(STOK), uretimPartileri: [PARTI] });
    yeniMusteri();
    modelSec();
    sec("__manual__");
    modelSec(M1);
    expect(screen.getByText(/^Manuel girilen seri no stoktan düşülmez/).textContent).toBe("Manuel girilen seri no stoktan düşülmez; stok dışı makina ve eski müşteri kaydı için uygundur.");
    expect(screen.queryByText("Stoktan seçime dön")).toBeNull();
  });
});

describe("Spec 0104: seri bekleyen düzenleme (R16, R16/2, Karar 27)", () => {
  const BAGLI = { id: 6, name: "Bağlı Bekleyen", model: M0, serialNo: "", seriNoBekliyor: true, installDate: "2026-09-20", sourceStockId: 70, partiId: 902, uretimTarihi: "2026-09-01" };
  it("AC-22: sourceStockId'siz seri bekleyen kayıtta stok seçicisi çizilir ve serisiz dalda alan çalışır", async () => {
    const { durum } = kur({ customers: [{ ...BAGLI, sourceStockId: undefined }], stock: structuredClone(STOK), uretimPartileri: [PARTI] });
    duzenle("Bağlı Bekleyen");
    sec("__serisiz__");
    yaz("AK-77");
    kaydet();
    await bekle();
    expect(durum.customers[0]).toMatchObject({ serialNo: "AK-77", sourceStockId: 73, seriNoBekliyor: false });
  });
  it("AC-23: sourceStockId'li seri bekleyen kayıtta stok seçicisi yok, düz giriş var; ikinci satır düşülmez", async () => {
    const { durum } = kur({ customers: [BAGLI], stock: structuredClone(STOK), uretimPartileri: [PARTI] });
    duzenle("Bağlı Bekleyen");
    expect(screen.queryByText(/Stoktan seçin/)).toBeNull();
    fireEvent.change(screen.getByPlaceholderText("AK140-2026-001"), { target: { value: "AK-88" } });
    expect(screen.queryByText(/^Manuel girilen seri no/)).toBeNull();
    expect(screen.queryByText("Stoktan seçime dön")).toBeNull();
    kaydet();
    await bekle();
    expect(durum.customers[0]).toMatchObject({ serialNo: "AK-88", sourceStockId: 70, partiId: 902 });
    expect(durum.stock).toHaveLength(3);
  });
  it("Karar 27: düz girişe serili stok satırının numarası yazılsa da o satır düşülmez, kaynak ve parti seçicisi korunur, kilit alınmaz", async () => {
    const cagrilar = [];
    window.crmLocks = { acquire: vi.fn(async (t, id) => { cagrilar.push([t, String(id)]); return { ok: true }; }), release: vi.fn(async () => {}) };
    const { durum } = kur({ customers: [BAGLI], stock: structuredClone(STOK), uretimPartileri: [PARTI] });
    duzenle("Bağlı Bekleyen");
    fireEvent.change(await screen.findByPlaceholderText("AK140-2026-001"), { target: { value: "S-74" } });
    expect(partiSecici()).toBeTruthy();
    kaydet();
    await bekle();
    expect(durum.customers[0]).toMatchObject({ serialNo: "S-74", sourceStockId: 70, partiId: 902 });
    expect(durum.stock.map(x => x.id)).toEqual([72, 73, 74]);
    expect(cagrilar.map(c => c[0])).not.toContain("stok-seri");
    expect("_manualSerial" in durum.customers[0]).toBe(false);
  });
});

describe("Spec 0104: model değişimi (R17/a, Karar 28)", () => {
  it("AC-26: serisizden sonra stoksuz modele geçilince işaret ve numara sıfırlanır; kayıt stok bağı taşımaz", async () => {
    const { durum } = serisizAc();
    yaz("AK-5");
    modelSec(M1);
    expect(screen.getByPlaceholderText("AK140-2026-001").value).toBe("");
    kaydet();
    await bekle();
    const k = durum.customers[0];
    expect(k.model).toBe(M1);
    expect("sourceStockId" in k).toBe(false);
    expect(k.seriNoBekliyor).toBe(true);
    expect(durum.stock).toHaveLength(3);
  });
  it("Karar 28: düzenlemede model değiştirmek var olan seri numarasını silmez", async () => {
    const { durum } = kur({ customers: [{ id: 7, name: "Model Düzelt", model: M0, serialNo: "AK-OLD", installDate: "2026-05-01" }] });
    duzenle("Model Düzelt");
    modelSec(M1);
    kaydet();
    await bekle();
    expect(durum.customers[0]).toMatchObject({ model: M1, serialNo: "AK-OLD" });
  });
});

describe("Spec 0104: mükerrer kayıt uyarısı (ölçüm 22)", () => {
  it("AC-29: girilen numara başka canlı müşteride varsa uyarı çıkar, 'Yine de Kaydet' ile kaydedilir", async () => {
    const { durum } = kur({ customers: [{ id: 8, name: "Önceki Sahip", model: M0, serialNo: "AK-DUP", installDate: "2026-01-01" }], stock: structuredClone(STOK), uretimPartileri: [PARTI] });
    yeniMusteri("Yeni Sahip");
    modelSec();
    sec("__serisiz__");
    yaz("ak-dup ");
    kaydet();
    expect(screen.getByText("Yine de Kaydet")).toBeTruthy();
    fireEvent.click(screen.getByText("Yine de Kaydet"));
    await bekle();
    expect(durum.customers.find(c => c.name === "Yeni Sahip")).toMatchObject({ serialNo: "ak-dup ", sourceStockId: 73 });
  });
});

describe("Spec 0104 triyaj", () => {
  it("bulgu 3 (Karar 36 bekçisi): güncelleyici hemen çalışırken de ekleme kolunun damgaları kayda girer", () => {
    const { durum } = kur({ stock: structuredClone(STOK), uretimPartileri: [PARTI], ertele: false });
    yeniMusteri("Hemen AŞ");
    modelSec();
    sec("__serisiz__");
    yaz("AK-H1");
    kaydet();
    expect(durum.customers[0]).toMatchObject({ serialNo: "AK-H1", sourceStockId: 73, partiId: 902, uretimTarihi: "2026-09-05" });
  });
  it("bulgu 1: sourceStockId'siz seri bekleyen düzenlemede stok seçicisinin üstünde çift düşüm uyarısı; eklemede yok", () => {
    kur({ customers: [{ id: 9, name: "Eski Serisiz", model: M0, serialNo: "", seriNoBekliyor: true, installDate: "2026-09-20" }], stock: structuredClone(STOK), uretimPartileri: [PARTI] });
    duzenle("Eski Serisiz");
    const ipucu = screen.getByText(SERI_BEKLEYEN_CIFT_DUSUM_IPUCU);
    expect(ipucu.compareDocumentPosition(stokSecici()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(SERI_BEKLEYEN_CIFT_DUSUM_IPUCU).toBe("Bu kayıt stoktan seri no'suz satıldıysa stok zaten düşülmüştür; numarayı 'Manuel gir' ile yazın, stoktan yeniden düşmeyin.");
    cleanup();
    kur({ stock: structuredClone(STOK), uretimPartileri: [PARTI] });
    yeniMusteri();
    modelSec();
    expect(screen.queryByText(SERI_BEKLEYEN_CIFT_DUSUM_IPUCU)).toBeNull();
  });
});

