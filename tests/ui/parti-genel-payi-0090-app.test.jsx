// @vitest-environment jsdom
// Spec 0090: parti payı yeni hesaptan, ekran düzeyi. Makina Maliyeti › Üretim Partileri gerçek bileşeniyle (ekran parti hesabını
// kendi kurar, R37/3, K8): neden ve kaynak hücreleri (AC-31–AC-35, AC-37, AC-38), başlık ve boş metin (AC-38/6, AC-50), Parti
// Hesabı ayrım ibaresi (AC-38/5), kapanış anlık görüntüsü (AC-39–AC-43, AC-45/2), izin (AC-49); gerçek App'te kapanış ve
// eski motorun hiç çağrılmaması (AC-39, AC-47).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { useState } from "react";

const casus = vi.hoisted(() => ({ n: 0 }));
vi.mock("../../src/lib/makinaMaliyeti", async (orijinal) => {
  const m = await orijinal();
  return { ...m, hesaplaMakinaMaliyetleri: (...a) => { casus.n++; return m.hesaplaMakinaMaliyetleri(...a); } };
});
const { MakinaMaliyeti } = await import("../../src/components/MakinaMaliyeti");
const { UretimPartileri, PARTI_BASLIK_CUMLESI, PARTI_BOS_METNI } = await import("../../src/components/gider/UretimPartileri");
const { PAY_AYRIM_IBARESI } = await import("../../src/components/maliyet/PartiHesabi");
const { PARTI_NEDEN, PARTI_KAYNAK_IBARESI } = await import("../../src/lib/makinaStandartMaliyet");
const { KAPANIS_HARITA_YOK } = await import("../../src/lib/uretimPartisi");

afterEach(() => { cleanup(); vi.useRealTimers(); casus.n = 0; delete window.crmStorage; vi.unstubAllGlobals(); localStorage.clear(); });

const GENEL = { id: 1, ad: "Elektrik", davranis: "normal", maliyetRolu: "genel" };
const k = (id, tarih, tutar, turId = 1) => ({ id, tarih, turId, tutar, kdvOrani: 0, modelSatirlari: [], taksitler: [] });
const stk = (id, o = {}) => ({ id, model: "AK100", serialNo: `T${id}`, ...o });
const AYAR = { giderAyarlari: { yururlukAy: "2026-01" } };
function MH({ p0 = [], stock = [], customers = [], giderler = [], turler = [GENEL], appSettings = AYAR, perms = null, showToast = vi.fn(), onState }) {
  const [uretimPartileri, setUretimPartileri] = useState(p0);
  onState?.(uretimPartileri);
  return <MakinaMaliyeti giderler={giderler} giderTurleri={turler} setGiderTurleri={vi.fn()} tedarikciler={[]} uretimPartileri={uretimPartileri} setUretimPartileri={setUretimPartileri}
    stock={stock} customers={customers} tumMusteriler={customers} parts={[]} standardModels={[{ model: "AK100" }]} customModels={[]} setStandardModels={vi.fn()} setCustomModels={vi.fn()}
    appSettings={appSettings} setAppSettings={vi.fn()} serverPermissions={perms} showToast={showToast} />;
}
const sekme = (ad) => fireEvent.click(screen.getByRole("radio", { name: ad }));
const satir = (ad) => screen.getAllByTestId("parti-satiri").find(s => s.textContent.includes(ad));

describe("Spec 0090: Üretim Partileri satırı (R17–R22, R31)", () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-06-15T10:00:00")); });
  const PARTILER = [
    { id: 1, ad: "Bahar", baslangicAy: "2026-02", bitisAy: "2026-03" },
    { id: 2, ad: "Yaz", baslangicAy: "2026-04", bitisAy: null },
    { id: 3, ad: "Boş", baslangicAy: "2026-02", bitisAy: "2026-02" },
    { id: 4, ad: "Güz", baslangicAy: "2026-09", bitisAy: null },
  ];
  const STOK = [stk(1, { partiId: 1, uretimTarihi: "2026-02-05" }), stk(2, { partiId: 1, uretimTarihi: "2026-02-20" }), stk(3, { partiId: 2, uretimTarihi: "2026-04-10" }), stk(4, { partiId: 4 })];
  const GID = [k(1, "2026-02-10", 1000.01), k(2, "2026-03-10", 2000), k(3, "2026-04-10", 500)];
  const ciz = (o = {}) => { render(<MH p0={PARTILER} stock={STOK} giderler={GID} {...o} />); sekme("Üretim Partileri"); };

  it("AC-37 / AC-38: havuz ve makina başı pay TL biçiminde, kaynak ibaresiyle; kur ve başka para birimi yok", () => {
    ciz();
    const s = satir("Bahar");
    expect(within(s).getByTestId("parti-havuz").textContent).toBe(`3.000,01 ₺${PARTI_KAYNAK_IBARESI}`);
    expect(within(s).getByTestId("parti-kaynak").textContent).toBe("Partinin aylarındaki genel gider");
    expect(within(s).getByTestId("parti-makina-basi").textContent).toBe("1.500,00 ₺");
    expect(within(s).getByTestId("parti-adet").textContent).toBe("2");
    for (const r of screen.getAllByTestId("parti-satiri")) expect(r.textContent).not.toMatch(/\$|€|USD|EUR|kur/i);
  });
  it("AC-31: başlangıcı gelecek ayda olan partide havuz yerine 'başlamadı' nedeni", () => {
    ciz();
    const s = satir("Güz");
    expect(within(s).getByTestId("parti-neden").textContent).toBe(PARTI_NEDEN.baslamadi);
    expect(within(s).getByTestId("parti-makina-basi").textContent).toBe("—");
  });
  it("AC-32: makinası olmayan partide havuz sıfır, makina başı pay yerine bugünkü ipucu", () => {
    ciz();
    const s = satir("Boş");
    expect(within(s).getByTestId("parti-adet").textContent).toBe(`0${PARTI_NEDEN.makinaYok}`);
    expect(within(s).getByTestId("parti-havuz").textContent).toMatch(/^0,00 ₺/);
    expect(within(s).getByTestId("parti-makina-basi").textContent).toBe("—");
  });
  it("AC-33: açık partide durum rozeti ve makina başı payın altında 'geçici'", () => {
    ciz();
    const s = satir("Yaz");
    expect(within(s).getByText("Açık · geçici")).toBeTruthy();
    expect(within(s).getByTestId("parti-makina-basi").textContent).toBe("500,00 ₺geçici");
    expect(within(satir("Bahar")).getByText("Kapalı")).toBeTruthy();
  });
  it("AC-34: hiçbir canlı türün rolü genel değilse havuz hücresi rakam yerine nedeni yazar", () => {
    ciz({ turler: [{ ...GENEL, maliyetRolu: "yok" }] });
    expect(within(satir("Bahar")).getByTestId("parti-neden").textContent).toBe(PARTI_NEDEN.rolYok);
    expect(within(satir("Bahar")).queryByTestId("parti-kaynak")).toBeNull();
  });
  it("AC-35: hesap ayarlarında dönem ve varsayılan adet hiç girilmemişken parti havuzu yine hesaplanır", () => {
    ciz({ appSettings: { giderAyarlari: { yururlukAy: "2026-01" } } });
    expect(within(satir("Bahar")).getByTestId("parti-havuz").textContent).toMatch(/^3\.000,01 ₺/);
    cleanup();
    ciz({ appSettings: { giderAyarlari: { yururlukAy: "2026-01" }, maliyetAyarlari: { baslangicAy: "2026-05", bitisAy: "2026-05", varsayilanAdet: 50 } } });
    expect(within(satir("Bahar")).getByTestId("parti-havuz").textContent).toMatch(/^3\.000,01 ₺/);
  });
  it("AC-38/6: başlık cümlesi havuzun kapısının tür rolü olduğunu söyler, 'ortak gider' demez", () => {
    ciz();
    expect(screen.getByText(PARTI_BASLIK_CUMLESI)).toBeTruthy();
    expect(PARTI_BASLIK_CUMLESI).toMatch(/Genel gidere girer/);
    expect(PARTI_BASLIK_CUMLESI).not.toMatch(/ortak gider/i);
  });
  it("AC-38/5: Parti Hesabı'nın 'Genel gider payı (birim)' sütununda ayrım ibaresi; iki rakam toplanmaz", () => {
    render(<MH p0={PARTILER} stock={STOK} giderler={GID} appSettings={{ giderAyarlari: { yururlukAy: "2026-01" }, maliyetAyarlari: { baslangicAy: "2026-01", bitisAy: "2026-12", varsayilanAdet: 10 } }} />);
    sekme("Parti Hesabı");
    const ibare = screen.getByTestId("pay-ayrim-ibaresi");
    expect(ibare.textContent).toBe(PAY_AYRIM_IBARESI);
    expect(ibare.closest("th").textContent).toMatch(/^Genel gider payı \(birim\)/);
    expect(PAY_AYRIM_IBARESI).toMatch(/toplanmaz/);
  });
  it("AC-50: partisiz veride boş durum metni partisiz makinaların bölünmede sayıldığını söyler", () => {
    render(<MH />);
    sekme("Üretim Partileri");
    expect(within(screen.getByTestId("bos-uretim-partileri")).getByText(PARTI_BOS_METNI)).toBeTruthy();
    expect(PARTI_BOS_METNI).toMatch(/Partisiz makinalar da .* pay alır/);
  });
  it("AC-49: gider_tanim yoksa tanım, kapatma ve silme düğmeleri yok (yeni izin yok)", () => {
    ciz({ perms: { role: "user", permissions: JSON.stringify({ tabs: ["gider", "maliyet"], giderActions: ["gider_add"] }) } });
    expect(screen.queryByText("Yeni Üretim Partisi")).toBeNull();
    expect(within(satir("Bahar")).queryByTitle("Düzenle")).toBeNull();
    expect(within(satir("Bahar")).queryByTitle("Sil")).toBeNull();
  });
});

describe("Spec 0090: kapanış anlık görüntüsü ekranda (R23–R26, R37)", () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-06-15T10:00:00")); });
  const STOK = [stk(1, { partiId: 1, uretimTarihi: "2026-02-05" })];
  const GID = [k(1, "2026-02-10", 1000), k(2, "2026-03-10", 2000)];
  const duzenle = (ad) => fireEvent.click(within(satir(ad)).getByTitle("Düzenle"));
  it("AC-39: açık parti kapatılınca her ayın o anki genel havuzu yazılır; eski alan yazılmaz", () => {
    let st;
    render(<MH p0={[{ id: 1, ad: "P", baslangicAy: "2026-02", bitisAy: null }]} stock={STOK} giderler={GID} onState={s => { st = s; }} />);
    sekme("Üretim Partileri");
    duzenle("P");
    fireEvent.change(screen.getByLabelText("Bitiş ayı"), { target: { value: "2026-03" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st[0]).toMatchObject({ bitisAy: "2026-03", kapanmaZamani: "2026-06-15T10:00:00", kapanisGenelHavuzlari: { "2026-02": 100000, "2026-03": 200000 } });
    expect(st[0]).not.toHaveProperty("kapanisOrtaklari");
  });
  it("AC-40 / AC-41: aralığı değişmeyen yeniden kayıt görüntüyü korur; bitiş silinince anahtar silinir", () => {
    let st;
    const g = { "2026-02": 1, "2026-03": 2 };
    render(<MH p0={[{ id: 1, ad: "P", baslangicAy: "2026-02", bitisAy: "2026-03", kapanmaZamani: "2026-04-01T09:00:00", kapanisGenelHavuzlari: g }]} stock={STOK} giderler={GID} onState={s => { st = s; }} />);
    sekme("Üretim Partileri");
    duzenle("P");
    fireEvent.change(screen.getByLabelText("Açıklama"), { target: { value: "not" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st[0]).toMatchObject({ aciklama: "not", kapanmaZamani: "2026-04-01T09:00:00", kapanisGenelHavuzlari: g });
    duzenle("P");
    fireEvent.change(screen.getByLabelText("Bitiş ayı"), { target: { value: "" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(st[0]).not.toHaveProperty("kapanisGenelHavuzlari");
    expect(st[0].bitisAy).toBeNull();
  });
  it("AC-42 / AC-43: eski alanlı parti değişim kutusunda yok; yeni alanlı partinin değişen ayı tek satır, üç tutarla", () => {
    render(<MH p0={[{ id: 1, ad: "Eski", baslangicAy: "2026-02", bitisAy: "2026-03", kapanisOrtaklari: { "2026-02": 1, "2026-03": 1 } },
      { id: 2, ad: "Yeni", baslangicAy: "2026-02", bitisAy: "2026-03", kapanisGenelHavuzlari: { "2026-02": 100000, "2026-03": 150000 } }]}
      stock={[...STOK, stk(2, { partiId: 2, uretimTarihi: "2026-02-06" })]} giderler={GID} />);
    sekme("Üretim Partileri");
    const satirlar = within(screen.getByTestId("parti-degisimleri")).getAllByTestId("parti-degisim-satiri");
    expect(satirlar).toHaveLength(1);
    expect(satirlar[0].textContent).toBe("2026-03Yeni · kapanışta 1.500,00 ₺, bugün 2.000,00 ₺+ 500,00 ₺");
  });
  it("triyaj bulgu 2: yürürlük boşken ve bitişi gelecekte olan yeni kapalı parti ekrandan kaydedilir", () => {
    let st;
    const showToast = vi.fn();
    render(<MH appSettings={{ giderAyarlari: {} }} giderler={GID} showToast={showToast} onState={s => { st = s; }} />);
    sekme("Üretim Partileri");
    fireEvent.click(screen.getByText("Yeni Üretim Partisi"));
    fireEvent.change(screen.getByLabelText("Parti adı"), { target: { value: "Bahar" } });
    fireEvent.change(screen.getByLabelText("Başlangıç ayı"), { target: { value: "2026-02" } });
    fireEvent.change(screen.getByLabelText("Bitiş ayı"), { target: { value: "2026-08" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(showToast).not.toHaveBeenCalledWith(KAPANIS_HARITA_YOK, "err");
    expect(st).toHaveLength(1);
    expect(st[0].kapanisGenelHavuzlari).toEqual({ "2026-02": 100000, "2026-03": 200000, "2026-04": 0, "2026-05": 0, "2026-06": 0, "2026-07": 0, "2026-08": 0 });
  });
  it("AC-45/2: ay tablosu verilmezse kapanış kaydı yapılmaz ve nedeni bildirimle söylenir", () => {
    const setUretimPartileri = vi.fn(), showToast = vi.fn();
    render(<UretimPartileri uretimPartileri={[{ id: 1, ad: "P", baslangicAy: "2026-02", bitisAy: null }]} setUretimPartileri={setUretimPartileri} partiSonucu={null} showToast={showToast} />);
    duzenle("P");
    fireEvent.change(screen.getByLabelText("Bitiş ayı"), { target: { value: "2026-03" } });
    fireEvent.click(screen.getByText("Kaydet"));
    expect(setUretimPartileri).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(KAPANIS_HARITA_YOK, "err");
  });
});

describe("Spec 0090: gerçek App (R27, R37/3)", () => {
  const veri = () => ({
    customers: [], stock: [stk(501, { partiId: 801, uretimTarihi: "2026-01-15" })], standardModels: [{ model: "AK100", defaultParcalar: [] }],
    giderTurleri: [GENEL], giderler: [k(1, "2026-01-10", 1000)], uretimPartileri: [{ id: 801, ad: "P1", baslangicAy: "2026-01", bitisAy: null }],
    giderTanimlari: [], tedarikciler: [], hesapHareketleri: [],
    appSettings: { giderAyarlari: { yururlukAy: "2026-01" } }, dataVersion: 1,
  });
  it("AC-39 / AC-47: parti App'te kapatılır, kapanış görüntüsü kaydın gövdesinde; bugünkü maliyet motoru hiç çağrılmaz", async () => {
    const { default: App } = await import("../../src/App");
    const kayitlar = [];
    window.crmStorage = { load: vi.fn(async () => structuredClone(veri())), save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }), getVersion: vi.fn(async () => 1) };
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
    render(<App />);
    await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
    await new Promise(r => setTimeout(r, 800));
    fireEvent.click(screen.getAllByText("Makina Maliyeti").find(e => e.closest("nav")));
    sekme("Üretim Partileri");
    fireEvent.click(within(satir("P1")).getByTitle("Düzenle"));
    fireEvent.change(screen.getByLabelText("Bitiş ayı"), { target: { value: "2026-01" } });
    fireEvent.click(screen.getByText("Kaydet"));
    await waitFor(() => expect(kayitlar.some(d => d.uretimPartileri?.[0]?.bitisAy === "2026-01")).toBe(true));
    const p = kayitlar.filter(d => d.uretimPartileri?.[0]?.bitisAy === "2026-01").pop().uretimPartileri[0];
    expect(p.kapanisGenelHavuzlari).toEqual({ "2026-01": 100000 });
    expect(within(satir("P1")).getByTestId("parti-havuz").textContent).toMatch(/^1\.000,00 ₺/);
    expect(casus.n).toBe(0);
  });
});
