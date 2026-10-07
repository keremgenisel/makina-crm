// @vitest-environment jsdom
// Spec 0077 A, B, C (gerçek App): nedenli kayıt mesajları, 429'da yeniden deneme, çevrimiçine dönüşteki deneme, yoklamanın
// kendi kaydımızı dış değişiklik saymaması ve peş peşe silmelerin birleştirmede korunması. Zamanlayıcılar sahte (spec DoD).
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, screen, fireEvent, act, within } from "@testing-library/react";
import App from "../../src/App";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
  vi.setSystemTime(new Date("2026-10-07T10:00:00"));
});
afterEach(() => { cleanup(); vi.useRealTimers(); delete window.crmStorage; delete window.appServer; vi.unstubAllGlobals(); localStorage.clear(); });

const ilerle = async (ms) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };

// Sahte depo + sunucu. kaydet(b, d) köprünün dönüşünü verir ({ ok, sebep } ya da boolean); başarılı kayıt sürümü artırır.
function kur({ sunucuModu = false, kaydet = null, veri = {} } = {}) {
  const d = { surum: 1, kayitlar: [], cakisma: null, versiyonOk: true, rol: null, izin: null, digerSurum: null, veri };
  window.crmStorage = {
    load: vi.fn(async () => JSON.parse(JSON.stringify({ ...d.veri, dataVersion: d.surum }))),
    save: vi.fn(async (b) => {
      d.kayitlar.push(b);
      const r = kaydet ? await kaydet(b, d) : { ok: true, sebep: null };
      if (r === true || r?.ok) d.surum += 1;
      return r;
    }),
    getVersion: vi.fn(async () => d.surum),
  };
  const t = {
    getConfig: async () => (sunucuModu ? { serverUrl: "http://10.0.0.2:3000", isActive: true, role: "admin", username: "kerem" } : {}),
    onConflict: (cb) => { d.cakisma = cb; return () => {}; },
    onDataChanged: (cb) => { d.itme = cb; return () => {}; },
    apiRequest: async ({ path }) => (path === "/api/version"
      ? (d.versiyonOk ? { ok: true, data: { role: d.rol ?? "admin", permissions: d.izin ?? null, dataVersion: d.digerSurum ?? d.surum } } : { ok: false })
      : { ok: true, data: {} }),
  };
  window.appServer = new Proxy(t, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  return d;
}
const baslat = async () => { render(<App />); await ilerle(50); await ilerle(800); };
const notlaraGit = () => fireEvent.click(screen.getAllByText("Notlar")[0]);
const notEkle = (metin) => {
  fireEvent.click(screen.getByText("Yeni Not"));
  fireEvent.change(screen.getByPlaceholderText("Notunuzu yazın... (ilk satır başlık olur)"), { target: { value: metin } });
  fireEvent.click(screen.getByText("Kaydet"));
};
const metin = () => document.body.textContent;

describe("Spec 0077 A: nedenli mesajlar (gerçek App)", () => {
  it("AC-1: çakışmada tek mesaj, bilgi tonunda ve sonucu söyler; 'kaydedilemedi' ve 'kapatıp yeniden açın' geçmez", async () => {
    const d = kur({ kaydet: () => ({ ok: false, sebep: "cakisma" }) });
    await baslat();
    notlaraGit(); notEkle("çakışan not");
    await ilerle(600);
    expect(d.kayitlar).toHaveLength(1);
    expect(metin()).not.toMatch(/kaydedilemedi|kapatıp yeniden/i);
    await act(async () => { await d.cakisma(); });
    expect(metin()).toMatch(/değişiklikleriniz birleştirildi/);
    expect(metin()).not.toMatch(/kaydedilemedi|kapatıp yeniden/i);
  });
  it("AC-2: oturum düştüğünde kayıt yolu ikinci bir hata mesajı üretmez", async () => {
    kur({ kaydet: () => ({ ok: false, sebep: "oturum" }) });
    await baslat();
    notlaraGit(); notEkle("not");
    await ilerle(600);
    expect(metin()).not.toMatch(/kaydedilemedi|kapatıp yeniden|yetkiniz/i);
  });
  it("AC-3: yetki hatasında yetki mesajı; kapatma önerisi yok", async () => {
    kur({ kaydet: () => ({ ok: false, sebep: "yetki" }) });
    await baslat();
    notlaraGit(); notEkle("not");
    await ilerle(600);
    expect(metin()).toMatch(/değiştirme yetkiniz yok/);
    expect(metin()).not.toMatch(/kapatıp yeniden/i);
  });
  it("AC-4, AC-5: bağlantı hatasında bağlantı mesajı; kapatma önerisi yalnız yerel yazma hatasında", async () => {
    kur({ kaydet: () => ({ ok: false, sebep: "baglanti" }) });
    await baslat();
    notlaraGit(); notEkle("not");
    await ilerle(600);
    expect(metin()).toMatch(/Sunucuya ulaşılamıyor/);
    expect(metin()).not.toMatch(/kapatıp yeniden/i);
    cleanup();
    kur({ kaydet: () => ({ ok: false, sebep: "yerel" }) });
    await baslat();
    notlaraGit(); notEkle("not");
    await ilerle(600);
    expect(metin()).toMatch(/Uygulamayı kapatıp yeniden açın/);
  });
  it("AC-6, AC-53: 429 iki kez, sonra başarı; 1 sn ve 4 sn beklemeyle yeniden denenir, kayıt kaybolmaz", async () => {
    let n = 0;
    const d = kur({ kaydet: () => (++n <= 2 ? { ok: false, sebep: "sinir" } : { ok: true }) });
    await baslat();
    notlaraGit(); notEkle("429 notu");
    await ilerle(510);           // debounce 500 ms: ilk gönderim
    expect(d.kayitlar).toHaveLength(1);
    expect(metin()).toMatch(/kısa süre sonra yeniden denenecek/);
    await ilerle(980); expect(d.kayitlar).toHaveLength(1);
    await ilerle(30); expect(d.kayitlar).toHaveLength(2);   // 1 sn sonra
    await ilerle(3960); expect(d.kayitlar).toHaveLength(2);
    await ilerle(60); expect(d.kayitlar).toHaveLength(3);   // 4 sn sonra
    expect(d.kayitlar[2].notes.map(x => x.content)).toContain("429 notu");
    expect(d.surum).toBe(2);
    expect(metin()).not.toMatch(/kaydedilemedi/i);
  });
  it("AC-7: denemeler tükenince (dört gönderim) nedenli hata; gövde korunur ve çevrimiçine dönüşte yeniden gönderilir", async () => {
    let red = true;
    const d = kur({ sunucuModu: true, kaydet: () => (red ? { ok: false, sebep: "sunucu" } : { ok: true }) });
    await baslat();
    notlaraGit(); notEkle("korunacak not");
    await ilerle(600 + 1000 + 4000 + 10000 + 50);
    expect(d.kayitlar).toHaveLength(4);
    expect(metin()).toMatch(/sunucu yanıt vermedi/);
    // Bağlantı kopup gelince saklanan gövde yeniden gönderilir.
    red = false;
    d.versiyonOk = false; await ilerle(10000);
    d.versiyonOk = true; await ilerle(10000);
    expect(d.kayitlar).toHaveLength(5);
    expect(d.kayitlar[4].notes.map(x => x.content)).toContain("korunacak not");
  });
  it("AC-53: deneme beklerken yeni gövde oluşursa eski gövde yeniden gönderilmez", async () => {
    let n = 0;
    const d = kur({ kaydet: () => (++n === 1 ? { ok: false, sebep: "sinir" } : { ok: true }) });
    await baslat();
    notlaraGit(); notEkle("A");
    await ilerle(600);
    notEkle("B");
    await ilerle(600 + 1000 + 4000 + 10000);
    const govdeler = d.kayitlar.map(b => b.notes.map(x => x.content).sort().join(","));
    expect(govdeler).toEqual(["A", "A,B"]);
  });
  it("AC-52: çevrimiçine dönüşte yeniden denenen kayıt başarısız olursa 'kaydedildi' denmez ve gövde yeniden saklanır", async () => {
    let sebep = "baglanti";
    const d = kur({ sunucuModu: true, kaydet: () => ({ ok: false, sebep }) });
    await baslat();
    notlaraGit(); notEkle("bekleyen not");
    await ilerle(600);
    sebep = "sunucu";
    d.versiyonOk = false; await ilerle(10000);
    d.versiyonOk = true; await ilerle(10000);
    expect(d.kayitlar).toHaveLength(2);
    expect(metin()).not.toMatch(/değişiklikler kaydedildi/i);
    sebep = null;
    window.crmStorage.save.mockImplementation(async (b) => { d.kayitlar.push(b); d.surum += 1; return { ok: true }; });
    d.versiyonOk = false; await ilerle(10000);
    d.versiyonOk = true; await ilerle(10000);
    expect(d.kayitlar).toHaveLength(3);
    expect(d.kayitlar[2].notes.map(x => x.content)).toContain("bekleyen not");
    expect(metin()).toMatch(/değişiklikler kaydedildi/i);
  });
});

describe("Spec 0077 B: yoklama kendi kaydımızı dış değişiklik saymaz (gerçek App)", () => {
  it("AC-10, AC-54: kayıt beklerken yoklama sürüm farkı görse de yüklemez; bekleyen kayıt kendi akışını tamamlar", async () => {
    const d = kur({ sunucuModu: true });
    await baslat();
    const yukleme = window.crmStorage.load.mock.calls.length;
    notlaraGit();
    // İstemci yoklaması 10 sn'de bir: bir sonraki tur debounce (500 ms) içine düşsün diye saat tura yaklaştırılır.
    await ilerle(10000 - 850 - 300);
    notEkle("bekleyen");
    d.digerSurum = 9;
    await ilerle(400);           // tur kayıt beklerken geçti
    expect(window.crmStorage.load.mock.calls.length).toBe(yukleme);
    await ilerle(200);
    expect(d.kayitlar.at(-1).notes.map(x => x.content)).toContain("bekleyen");
  });
  it("AC-11, AC-12, AC-17: kayıt yoldayken ve bittikten sonraki 500 ms'de yoklama yüklemez; on işlem kaybolmaz", async () => {
    const d = kur({ sunucuModu: true, kaydet: (b, dd) => new Promise(res => { dd.digerSurum = dd.surum + 1; setTimeout(() => res({ ok: true }), 9500); }) });
    await baslat();
    const yukleme = window.crmStorage.load.mock.calls.length;
    notlaraGit();
    for (let i = 0; i < 10; i++) { notEkle(`hızlı ${i}`); await ilerle(50); }
    await ilerle(600);           // kayıt yolda (9,5 sn), sunucu sürümü önden artmış
    await ilerle(10000);         // en az bir yoklama turu yolda iken geçti
    expect(window.crmStorage.load.mock.calls.length).toBe(yukleme);
    d.digerSurum = null;
    await ilerle(20000);
    expect(window.crmStorage.load.mock.calls.length).toBe(yukleme);
    expect(d.kayitlar.at(-1).notes.length).toBe(10);
  });
  it("AC-13: atlanan turda izin ve rol güncellemesi yine yapılır", async () => {
    const d = kur({ sunucuModu: true, kaydet: () => new Promise(() => {}) }); // kayıt hiç bitmez: tur hep atlanır
    await baslat();
    notlaraGit(); notEkle("x");
    await ilerle(600);
    d.digerSurum = 50;
    d.rol = "user"; d.izin = JSON.stringify({ tabs: ["dashboard", "notes"] });
    await ilerle(10000);
    expect(screen.queryByText("Müşteriler")).toBeNull();
  });
  it("AC-14, R9: açılış bastırması sürerken ve kayıt beklerken sunucu PC itmesi yüklemez; sonra yükler", async () => {
    const d = kur();
    render(<App />); await ilerle(50);
    const yukleme = window.crmStorage.load.mock.calls.length;
    await act(async () => { await d.itme?.(); });          // bastırma (700 ms) içinde
    expect(window.crmStorage.load.mock.calls.length).toBe(yukleme);
    await ilerle(800);
    notlaraGit(); notEkle("bekleyen");
    await act(async () => { await d.itme?.(); });          // kayıt bekliyor (debounce)
    expect(window.crmStorage.load.mock.calls.length).toBe(yukleme);
    await ilerle(1200);                                    // kayıt bitti + 500 ms
    await act(async () => { await d.itme?.(); });
    expect(window.crmStorage.load.mock.calls.length).toBe(yukleme + 1);
    expect(d.kayitlar.at(-1).notes.map(x => x.content)).toContain("bekleyen");
  });
  it("AC-15: dışarıdan gelen gerçek değişiklik, kayıt bittikten sonraki ilk turda yüklenir", async () => {
    const d = kur({ sunucuModu: true });
    await baslat();
    notlaraGit(); notEkle("y");
    await ilerle(1200);          // kayıt bitti + 500 ms
    const yukleme = window.crmStorage.load.mock.calls.length;
    d.digerSurum = d.surum + 3;
    await ilerle(10000);
    expect(window.crmStorage.load.mock.calls.length).toBe(yukleme + 1);
  });
});

describe("Spec 0077 C: peş peşe silmeler birleştirmede korunur (gerçek App)", () => {
  const kalemler = Array.from({ length: 10 }, (_, i) => ({ id: 900 + i, tarih: "2026-10-02", turId: 4, tutar: 100 + i, kdvOrani: 20, aciklama: `Kalem ${i}`,
    ekOdemeler: [], modelSatirlari: [], taksitler: [], atamaTur: "" }));
  const VERI = { giderTurleri: [{ id: 4, ad: "Elektrik", davranis: "normal" }], giderler: kalemler, appSettings: { giderAyarlari: { yururlukAy: "2026-01" } } };
  it("AC-20: on gider kalemi silinir, araya başka kullanıcının kaydı girer; birleştirmeden sonra hiçbiri geri gelmez", async () => {
    let ilk = true;
    const d = kur({ veri: VERI, kaydet: () => (ilk ? (ilk = false, { ok: false, sebep: "cakisma" }) : { ok: true }) });
    await baslat();
    fireEvent.click(screen.getAllByText("Giderler")[0]);
    await ilerle(50);
    for (let i = 0; i < 10; i++) {
      const sat = screen.getByText(`Kalem ${i}`).closest("tr");
      fireEvent.click(within(sat).getByTitle("Sil"));
      fireEvent.click(screen.getByText("Çöp Kutusuna Taşı"));
    }
    await ilerle(600);
    expect(d.kayitlar).toHaveLength(1);
    // Başka kullanıcı araya bir kalem ekledi, sunucu sürümü ilerledi; çakışma birleştirmesi.
    d.veri = { ...VERI, giderler: [...kalemler, { ...kalemler[0], id: 990, aciklama: "Başkasının kalemi" }] };
    d.surum = 5;
    await act(async () => { await d.cakisma(); });
    await ilerle(1500); await ilerle(1000); // birleştirme gecikmesi (750 ms), sonra debounce (efekt act sonunda kurulur)
    const son = d.kayitlar.at(-1);
    expect(d.kayitlar.length).toBeGreaterThan(1);              // birleştirmeden sonra gerçekten kaydedildi
    expect(son.giderler.some(g => g.id === 990)).toBe(true);   // gövde sunucunun yeni verisini içeriyor
    expect(son.giderler.filter(g => g.id < 990).every(g => g.deletedAt)).toBe(true);
    expect(son.giderler.find(g => g.id === 990)?.deletedAt ?? null).toBeNull();
  });
});

describe("Spec 0077 C: peş peşe silinen evrak kayıtları (gerçek App)", () => {
  const belgeler = Array.from({ length: 5 }, (_, i) => ({ id: 800 + i, type: "teklif", no: `T-${i}`, firma: `Evrak Firma ${i}`, tarih: "2026-10-01",
    satirlar: [], durum: "taslak", currency: "TRY" }));
  it("AC-21: peş peşe silinen beş teklif, araya başka kullanıcının kaydı girince birleştirmeden sonra geri gelmez", async () => {
    let ilk = true;
    const VERI = { teklifler: belgeler };
    const d = kur({ veri: VERI, kaydet: () => (ilk ? (ilk = false, { ok: false, sebep: "cakisma" }) : { ok: true }) });
    await baslat();
    fireEvent.click(screen.getAllByText("Evrak Yönetimi")[0]);
    await ilerle(50);
    for (let i = 0; i < 5; i++) {
      const sat = screen.getByText(`Evrak Firma ${i}`).closest("tr");
      fireEvent.click(within(sat).getAllByRole("button").at(-1));
      fireEvent.click(screen.getByText("Evet, Sil"));
    }
    await ilerle(600);
    expect(d.kayitlar).toHaveLength(1);
    expect(d.kayitlar[0].teklifler.filter(t => t.deletedAt)).toHaveLength(5);
    d.veri = { teklifler: [...belgeler, { ...belgeler[0], id: 890, no: "T-9", firma: "Başkasının belgesi" }] };
    d.surum = 5;
    await act(async () => { await d.cakisma(); });
    await ilerle(1500); await ilerle(1000); // birleştirme gecikmesi (750 ms), sonra debounce (efekt act sonunda kurulur)
    const son = d.kayitlar.at(-1);
    expect(d.kayitlar.length).toBeGreaterThan(1);
    expect(son.teklifler.some(t => t.id === 890)).toBe(true);
    expect(son.teklifler.filter(t => t.id < 890).every(t => t.deletedAt)).toBe(true);
    expect(son.teklifler.find(t => t.id === 890)?.deletedAt ?? null).toBeNull();
  });
});

describe("Spec 0077 R14: başka PC'nin geri alması diriltilmez (gerçek App)", () => {
  it("AC-19, R14: bu PC'de silinmiş görünen teklif başka PC'de çöpten geri alınırsa, bu PC dokunmadığı için birleştirme onu yeniden silmez", async () => {
    let ilk = true;
    const silinmis = { id: 850, type: "teklif", no: "T-50", firma: "Geri Alınan", tarih: "2026-10-01", satirlar: [], durum: "taslak", currency: "TRY", deletedAt: "2026-10-01" };
    const VERI = { teklifler: [silinmis], notes: [] };
    const d = kur({ veri: VERI, kaydet: () => (ilk ? (ilk = false, { ok: false, sebep: "cakisma" }) : { ok: true }) });
    await baslat();
    notlaraGit(); notEkle("araya giren not");
    await ilerle(600);
    expect(d.kayitlar[0].teklifler[0].deletedAt).toBe("2026-10-01");   // bu PC tabanla aynı değeri taşıyor
    d.veri = { teklifler: [{ ...silinmis, deletedAt: null }], notes: [] };
    d.surum = 5;
    await act(async () => { await d.cakisma(); });
    await ilerle(1500); await ilerle(1000);
    const son = d.kayitlar.at(-1);
    expect(d.kayitlar.length).toBeGreaterThan(1);
    expect(son.notes.map(x => x.content)).toContain("araya giren not");
    expect(son.teklifler.find(t => t.id === 850).deletedAt ?? null).toBeNull();
  });
});

describe("Spec 0077: yerel mod", () => {
  it("AC-50: tek kullanıcılı yerel modda kayıt bozulmaz, mesaj çıkmaz", async () => {
    const d = kur();
    await baslat();
    notlaraGit(); notEkle("yerel not");
    await ilerle(700);
    expect(d.kayitlar).toHaveLength(1);
    expect(metin()).not.toMatch(/kaydedilemedi|yeniden denenecek/i);
  });
});
