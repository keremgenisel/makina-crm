// @vitest-environment jsdom
// Spec 0008: gider modülü yayın perdesi (GEÇİCİ). Gerçek App üzerinden: perde tek kapıdan (App.giderYetki) bütün
// türev görünümlere ulaşıyor mu, izin kuralını eziyor mu, veriye dokunuyor mu. "Perde inik" kurulu sürümü,
// "perde kalkık" işaretin kaldırıldığı hâli (AC-13) temsil eder; ikisi aynı veriyle aynı adımları koşar.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, screen, fireEvent, within } from "@testing-library/react";
import { yerelBugun } from "../../src/lib/utils";

const perde = vi.hoisted(() => ({ indi: true }));
vi.mock("../../src/lib/yayinPerdesi", () => ({ GIDER_PERDESI: true, giderPerdesiIndi: () => perde.indi }));
const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; delete window.appServer; vi.unstubAllGlobals(); localStorage.clear(); });

const gunSonra = (n) => { const d = new Date(`${yerelBugun()}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const simdiIso = new Date().toISOString();
const buAy = yerelBugun().slice(0, 7);

const veri = () => ({
  customers: [{ id: 700, name: "GİDERLİ FİRMA", model: "AK120", serialNo: "S-9", installDate: "2026-01-10", currency: "TRY" }],
  stock: [{ id: 88, model: "AK100_DS", serialNo: "2026-121", parcalar: [] }],
  calisanlar: [{ id: 5, ad: "Hasan Usta", resmiMaliyet: 30000, eldenMaliyet: 5000 }],
  notes: [{ id: 900, title: "çöp not", text: "x", date: "2026-09-01", deletedAt: simdiIso }],
  giderTurleri: [{ id: 1, ad: "Malzeme", davranis: "normal" }],
  tedarikciler: [{ id: 11, ad: "Demir Bant" }],
  giderler: [
    { id: 1, tarih: `${buAy}-01`, turId: 1, tutar: 10000, kdvOrani: 20, odendi: false, tedarikciId: 11, sonOdemeTarihi: gunSonra(2), atamaTur: "makina", makinaTur: "musteri", makinaId: 700 },
    { id: 2, tarih: `${buAy}-01`, turId: 1, tutar: 5000, kdvOrani: 20, odendi: false, tedarikciId: 11, atamaTur: "makina", makinaTur: "stok", makinaId: 88 },
    { id: 3, tarih: `${buAy}-01`, turId: 1, tutar: 700, kdvOrani: 20, odendi: true, deletedAt: simdiIso },
  ],
  giderTanimlari: [], standartGiderler: [],
  appSettings: { giderAyarlari: { yururlukAy: "2026-01", hatirlatmaEsikGun: 7 } },
  dataVersion: 1,
});
const GIDER_ANAHTARLARI = ["giderler", "giderTanimlari", "giderTurleri", "tedarikciler", "standartGiderler"];

const baslat = async ({ sunucu = null } = {}) => {
  const kayitlar = [];
  const yuklenen = veri();
  window.crmStorage = {
    load: vi.fn(async () => structuredClone(yuklenen)),
    save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }),
    getVersion: vi.fn(async () => 1),
  };
  if (sunucu) {
    // LAN istemcisi: user rolü, verilen izinlerle. Diğer appServer çağrıları etkisiz.
    const t = { getConfig: async () => ({ serverUrl: "http://10.0.0.2:3000", isActive: true, role: "user", permissions: JSON.stringify(sunucu), username: "u" }) };
    window.appServer = new Proxy(t, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
  }
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(window.crmStorage.load).toHaveBeenCalled());
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800)); // App yüklemeden sonraki 700 ms kaydı bastırır
  return { kayitlar, yuklenen };
};
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const menuDisi = (ad) => screen.queryAllByText(ad).filter(e => !e.closest("nav"));
// Ayarlar sol menüsü akordeon: önce grup başlığı, sonra bölüm.
const ayar = (grup, ad) => { fireEvent.click(menuDisi(grup)[0]); fireEvent.click(screen.getAllByText(ad).pop()); };
const sonDugme = (satirMetni) => { const b = within(screen.getByText(satirMetni).closest("tr")).getAllByRole("button"); fireEvent.click(b[b.length - 1]); };

describe.each([
  ["inik (kurulu sürüm)", true],
  ["kalkık (AC-13: işaret kaldırıldı, perde öncesi davranış)", false],
])("Gider perdesi %s", (_ad, inik) => {
  const gorunur = (x) => (inik ? expect(x).toBeNull() : expect(x).toBeTruthy());

  it("AC-1: Kurulu sürümde Giderler sekmesine girildiğinde çalışmanın sürdüğünü anlatan sayfa görünür; gider ekranları açılmaz", async () => {
    perde.indi = inik;
    await baslat();
    menu("Giderler");
    await waitFor(() => expect(!!screen.queryByTestId("gider-perdesi")).toBe(inik));
    gorunur(screen.queryByText("Dönem Raporu"));
    for (const alt of ["Makina ve Model", "Tedarikçiler", "Standart Genel Giderler"]) gorunur(screen.queryAllByText(alt)[0] ?? null);
  });

  it("AC-2: Kurulu sürümde Anasayfa'da ödeme hatırlatma kartı görünmez", async () => {
    perde.indi = inik;
    await baslat();
    gorunur(screen.queryByTestId("odeme-hatirlatma-karti"));
  });

  it("AC-3: Kurulu sürümde Finans ekranında KDV karşılaştırması kartı görünmez", async () => {
    perde.indi = inik;
    await baslat();
    menu("Finans");
    await waitFor(() => expect(screen.getAllByText(/Finans/).length).toBeGreaterThan(0));
    gorunur(screen.queryByText("KDV Karşılaştırması"));
  });

  it("AC-4: Kurulu sürümde Ayarlar'da Giderler grubu ve alt bölümleri görünmez", async () => {
    perde.indi = inik;
    await baslat();
    menu("Ayarlar");
    await waitFor(() => expect(screen.getByText("Uygulama Ayarları")).toBeTruthy());
    gorunur(menuDisi("Giderler")[0] ?? null); // grup başlığı
    if (!inik) fireEvent.click(menuDisi("Giderler")[0]);
    for (const ad of ["Gider Türleri", "Tekrarlayan Giderler", "Gider Ayarları"]) gorunur(screen.queryAllByText(ad)[0] ?? null);
  });

  it("AC-5: Kurulu sürümde Firma Çalışanları ekranında maliyet sütunları görünmez", async () => {
    perde.indi = inik;
    await baslat();
    menu("Ayarlar");
    ayar("Firma", "Firma Çalışanları");
    await waitFor(() => expect(screen.getByText("Hasan Usta")).toBeTruthy());
    gorunur(screen.queryByText(/Gider tutarı = resmi \+ elden/));
    gorunur(screen.queryByLabelText("Resmi işveren maliyeti"));
  });

  it("AC-6 / AC-14: Kurulu sürümde Çöp Kutusu'nda gider satırları görünmez, 'çöpü boşalt' gider verisine dokunmaz; hiçbir gider kaydı değişmez", async () => {
    perde.indi = inik;
    const { kayitlar, yuklenen } = await baslat();
    menu("Ayarlar");
    ayar("Veri Yönetimi", "Çöp Kutusu");
    await waitFor(() => expect(screen.getByText("Çöp Kutusunu Boşalt")).toBeTruthy());
    gorunur(screen.queryByText(/^Malzeme ·/));
    fireEvent.click(screen.getByText("Çöp Kutusunu Boşalt"));
    const onay = screen.getAllByRole("button").filter(b => /Boşalt|Evet/.test(b.textContent)).pop();
    fireEvent.click(onay);
    await waitFor(() => expect(kayitlar.some(k => !k.notes?.some(n => n.id === 900))).toBe(true), { timeout: 3000 });
    const son = kayitlar[kayitlar.length - 1];
    if (inik) {
      for (const k of GIDER_ANAHTARLARI) expect(son[k], k).toEqual(yuklenen[k]); // AC-14: birebir aynı
    } else {
      expect(son.giderler.map(g => g.id)).toEqual([1, 2]); // perde öncesi davranış: çöpteki gider kalıcı silinir
    }
  });

  it("AC-7: Kurulu sürümde müşteri veya makina silme onayında bağlı gider sayısı yazmaz", async () => {
    perde.indi = inik;
    await baslat();
    menu("Müşteriler");
    await waitFor(() => expect(screen.getByText("GİDERLİ FİRMA")).toBeTruthy());
    sonDugme("GİDERLİ FİRMA");
    const musteriOnay = screen.getByText(/Çöp Kutusu'na taşınacak/).textContent;
    if (inik) expect(musteriOnay).not.toMatch(/gider/); else expect(musteriOnay).toMatch(/atanmış 1 gider kalemi/);
    fireEvent.click(screen.getByText("Vazgeç"));
    menu("Stok");
    await waitFor(() => expect(screen.getByText("2026-121")).toBeTruthy());
    sonDugme("2026-121");
    const stokOnay = screen.getByText(/stoktan silinecek/).textContent;
    if (inik) expect(stokOnay).not.toMatch(/gider/); else expect(stokOnay).toMatch(/atanmış 1 gider kalemi/);
  });

  it("R2 (K5): müşteri formundaki üretim tarihi alanı da perdeyle kapanır", async () => {
    perde.indi = inik;
    await baslat();
    menu("Müşteriler");
    fireEvent.click(await screen.findByText("Yeni Müşteri"));
    await waitFor(() => expect(screen.getAllByText(/Garanti Başlangıç/).length).toBeGreaterThan(0));
    gorunur(screen.queryByLabelText("Üretim tarihi"));
  });
});

describe("AC-11: Gider sekmesini görme yetkisi olmayan bir kullanıcıda sekme yine hiç görünmez; perde bu kuralı ezmez", () => {
  it.each([
    ["sekme listesi tanımsız", {}],
    ["sekme listesinde gider yok", { tabs: ["dashboard", "finance"] }],
  ])("%s: perde inikken menüde Giderler ve perde sayfası yok", async (_ad, izin) => {
    perde.indi = true;
    await baslat({ sunucu: izin });
    expect(screen.queryAllByText("Giderler").filter(e => e.closest("nav"))).toEqual([]);
    expect(screen.queryByTestId("gider-perdesi")).toBeNull();
  });
  it("gider sekmesi açıkça verilmiş kullanıcıda perde inikken sekme durur ve perde sayfası görünür", async () => {
    perde.indi = true;
    await baslat({ sunucu: { tabs: ["dashboard", "gider"] } });
    menu("Giderler");
    await waitFor(() => expect(screen.getByTestId("gider-perdesi")).toBeTruthy());
  });
});

describe("AC-12: Sayfa metni hiçbir tarih veya süre taahhüdü içermez", () => {
  it("rakam, ay adı ve süre/tarih sözü yok", async () => {
    perde.indi = true;
    await baslat();
    menu("Giderler");
    const metin = (await screen.findByTestId("gider-perdesi")).textContent;
    expect(metin).toMatch(/çalışma sürüyor/);
    expect(metin).not.toMatch(/\d/);
    expect(metin).not.toMatch(/yakında|yakın zamanda|gün|hafta|ay içinde|aylar|yıl|sürüm|tarih|ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık/i);
  });
});
