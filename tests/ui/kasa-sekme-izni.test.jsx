// @vitest-environment jsdom
// Spec 0058 R9 ile güncellendi: kasa_hesap etiketi "ve kasa iş listesini düzenleme" ibaresini taşır.
// Spec 0052: Kasa sekmesinin kendi izni. İzin ekranı (UserManager: kutu, kayıt, ipucu, oran) ve gerçek App üzerinden
// kasasız kullanıcının menüsü, Mali İşler grubu, gider formu ve tahsilat formu; yedek geri yüklemesinin hesap tanımlarına
// dokunmaması.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, screen, fireEvent, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { UserManager } from "../../src/components/settings/UserManager";
import { ALL_TABS } from "../../src/components/settings/serverPermissionDefs";
import { gorunurSekmeler } from "../../src/lib/permissions";
import { yerelBugun } from "../../src/lib/utils";

const perde = vi.hoisted(() => ({ indi: false }));
vi.mock("../../src/lib/yayinPerdesi", () => ({ GIDER_PERDESI: true, giderPerdesiIndi: () => perde.indi }));
const { default: App } = await import("../../src/App");

afterEach(() => { cleanup(); delete window.crmStorage; delete window.appServer; vi.unstubAllGlobals(); localStorage.clear(); perde.indi = false; });

// ── İzin ekranı ───────────────────────────────────────────────────────────────────────────────────────────
const ESKI = { id: 1, username: "ali", role: "user", is_active: 1, permissions: JSON.stringify({ tabs: ["dashboard", "gider", "finance", "kasa"] }) };
const KASASIZ = { id: 2, username: "veli", role: "user", is_active: 1, permissions: JSON.stringify({ tabs: ["dashboard", "gider", "finance"], giderActions: ["kasa_hesap", "virman"] }) };
const yonetici = (users = [ESKI, KASASIZ]) => {
  const istekler = [];
  window.appServer = { apiRequest: vi.fn(async (r) => { istekler.push(r); return r.method === "GET" ? { ok: true, data: users } : { ok: true, data: {} }; }) };
  render(<UserManager flash={vi.fn()} />);
  return istekler;
};
const satir = (ad) => screen.getByText(ad).closest("tr");
const duzenle = async (ad) => {
  await waitFor(() => expect(screen.getByText(ad)).toBeTruthy());
  fireEvent.click(within(satir(ad)).getByText("Düzenle"));
};
const kasaKutusu = () => screen.getByLabelText(/^Kasa/);
// Spec 0066 R1 ile güncellendi: kasa kutuları ve etkisizlik ipucu artık kendi "Kasa işlemleri" akordeonunda.
const kasaAkordeonu = () => fireEvent.click(screen.getByText("Kasa işlemleri"));
const kaydedilenSekmeler = (istekler) => JSON.parse(istekler.filter(r => r.method === "PATCH").pop().body.permissions).tabs;

describe("Spec 0052: izin ekranı", () => {
  it("AC-1 / AC-8: yeni kullanıcı formunda 'Kasa' kutusu var, varsayılanda işaretsiz ve 'varsayılan kapalı' ibaresiyle", async () => {
    yonetici();
    fireEvent.click(await screen.findByText("+ Ekle"));
    const kutu = kasaKutusu();
    expect(kutu.checked).toBe(false);
    expect(kutu.closest("label").textContent).toMatch(/Kasa\(varsayılan kapalı\)/);
    expect(screen.getByLabelText(/^Giderler/).checked).toBe(false);
  });
  it("AC-7: geri doldurulmuş kullanıcıda kutu işaretli gelir, kaydedince hak korunur; kutu kaldırılıp kaydedilirse kalıcı gider", async () => {
    const istekler = yonetici();
    await duzenle("ali");
    expect(kasaKutusu().checked).toBe(true);
    fireEvent.click(screen.getByText("Kaydet"));
    await waitFor(() => expect(istekler.some(r => r.method === "PATCH")).toBe(true));
    expect(kaydedilenSekmeler(istekler)).toContain("kasa");
    await duzenle("ali");
    fireEvent.click(kasaKutusu());
    fireEvent.click(screen.getByText("Kaydet"));
    await waitFor(() => expect(istekler.filter(r => r.method === "PATCH")).toHaveLength(2));
    const yeni = kaydedilenSekmeler(istekler);
    expect(yeni).toEqual(["dashboard", "gider", "finance"]);
    // Yokluk kuralı yok: kaydedilen liste Kasa'yı göstermez.
    const perm = { role: "user", permissions: JSON.stringify({ tabs: yeni }) };
    expect(gorunurSekmeler(ALL_TABS, "active", perm).some(t => t.id === "kasa")).toBe(false);
  });
  it("AC-24: Kasa'sı olmayan kullanıcıda kasa_hesap / virman / avans kutuları çizilir ve etkisizlik ipucu görünür", async () => {
    yonetici();
    await duzenle("veli");
    kasaAkordeonu();
    expect(screen.getByText("Hesap ekle, düzenle, kapat ve sil ve kasa iş listesini düzenleme")).toBeTruthy();
    expect(screen.getByText("Hesaplar arası virman")).toBeTruthy();
    expect(screen.getByText("Çalışana avans ver ve sil")).toBeTruthy();
    expect(screen.getByLabelText("Hesap ekle, düzenle, kapat ve sil ve kasa iş listesini düzenleme").checked).toBe(true);
    expect(screen.getByTestId("kasa-etkisiz-ipucu").textContent).toBe("Kasa sekmesi olmayan kullanıcıda bu eylemler kullanılmaz.");
    // Kutular işaretlenebilir; Kasa açılınca ipucu kalkar, izinler hazırdır.
    fireEvent.click(screen.getByLabelText("Çalışana avans ver ve sil"));
    expect(screen.getByLabelText("Çalışana avans ver ve sil").checked).toBe(true);
    fireEvent.click(kasaKutusu());
    expect(screen.queryByTestId("kasa-etkisiz-ipucu")).toBeNull();
  });
  it("AC-24: Kasa'sı olan kullanıcıda ipucu yok", async () => {
    yonetici([{ ...ESKI, permissions: JSON.stringify({ tabs: ["gider", "finance", "kasa"], giderActions: ["kasa_hesap"] }) }]);
    await duzenle("ali");
    kasaAkordeonu();
    expect(screen.getByText("Hesap ekle, düzenle, kapat ve sil ve kasa iş listesini düzenleme")).toBeTruthy();
    expect(screen.queryByTestId("kasa-etkisiz-ipucu")).toBeNull();
  });
  it("AC-26: izin özetindeki oran yeni sekmeyle güncellenir; admin rolüne geçirilen kullanıcının listesine 'kasa' yazılır", async () => {
    yonetici();
    await waitFor(() => expect(screen.getByText("ali")).toBeTruthy());
    expect(ALL_TABS).toHaveLength(13);
    expect(within(satir("ali")).getByText("4 / 13")).toBeTruthy();
    expect(within(satir("veli")).getByText("3 / 13")).toBeTruthy();
    // Rol seçici admin'e geçince listeyi ALL_TABS'ten yazar (R18, zararsız: admin'in izni null kaydedilir).
    const src = readFileSync("src/components/settings/UserManager.jsx", "utf-8");
    expect(src).toMatch(/tabs: e\.target\.value === "admin" \? ALL_TABS\.map\(t => t\.id\)/);
  });
});

// ── Gerçek App ────────────────────────────────────────────────────────────────────────────────────────────
const buAy = yerelBugun().slice(0, 7);
const veri = () => ({
  customers: [{ id: 700, name: "TAHSİLATLI FİRMA", model: "AK120", serialNo: "S-9", installDate: "2026-01-10", currency: "TRY" }],
  giderTurleri: [{ id: 1, ad: "Malzeme", davranis: "normal" }],
  tedarikciler: [{ id: 11, ad: "Demir Bant" }],
  giderler: [],
  kasaHesaplari: [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 50000, acilisTarihi: `${buAy}-01`, kapali: false }],
  hesapHareketleri: [], cekler: [],
  giderTanimlari: [], standartGiderler: [],
  appSettings: { giderAyarlari: { yururlukAy: "2026-01", hatirlatmaEsikGun: 7 } },
  dataVersion: 1,
});
const baslat = async (sunucu) => {
  const kayitlar = [];
  window.crmStorage = {
    load: vi.fn(async () => structuredClone(veri())),
    save: vi.fn(async (d) => { kayitlar.push(structuredClone(d)); return true; }),
    getVersion: vi.fn(async () => 1),
  };
  const t = { getConfig: async () => ({ serverUrl: "http://10.0.0.2:3000", isActive: true, role: "user", permissions: JSON.stringify(sunucu), username: "u" }) };
  window.appServer = new Proxy(t, { get: (o, k) => o[k] ?? (String(k).startsWith("on") ? () => () => {} : async () => null) });
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  render(<App />);
  await waitFor(() => expect(window.crmStorage.load).toHaveBeenCalled());
  await waitFor(() => expect(screen.getAllByText("Anasayfa").length).toBeGreaterThan(0));
  await new Promise(r => setTimeout(r, 800)); // App yüklemeden sonraki 700 ms kaydı bastırır
  return { kayitlar };
};
const menudeMi = (ad) => screen.queryAllByText(ad).some(e => e.closest("nav"));
const menu = (ad) => fireEvent.click(screen.getAllByText(ad).find(e => e.closest("nav")));
const KASASIZ_SEKMELER = { tabs: ["dashboard", "customers", "gider", "finance"] };
const KASALI_SEKMELER = { tabs: ["dashboard", "customers", "gider", "finance", "kasa"] };

describe("Spec 0052: kasasız kullanıcı gerçek uygulamada", () => {
  it("AC-2 / AC-14: Kasa kutusu kaldırılınca Kasa menüde yok; Finans ve Giderler 'Mali İşler' grubunda kalır", async () => {
    await baslat(KASASIZ_SEKMELER);
    expect(menudeMi("Kasa")).toBe(false);
    expect(menudeMi("Mali İşler")).toBe(true);
    expect(menudeMi("Finans")).toBe(true);
    expect(menudeMi("Giderler")).toBe(true);
  });
  it("AC-5: üç izni birden olan kullanıcı Kasa'yı menüde görür", async () => {
    await baslat(KASALI_SEKMELER);
    expect(menudeMi("Kasa")).toBe(true);
  });
  it("AC-15: süzmeden sonra grupta tek ekran kalırsa düz satır (grup başlığı yok)", async () => {
    await baslat({ tabs: ["dashboard", "finance", "kasa"] });
    expect(menudeMi("Mali İşler")).toBe(false);
    expect(menudeMi("Finans")).toBe(true);
    expect(menudeMi("Kasa")).toBe(false);
  });
  const odemeSatiri = () => {
    menu("Giderler");
    fireEvent.click(screen.getAllByText("Yeni Gider").find(e => e.closest("button")));
    fireEvent.change(screen.getByLabelText("Gider türü *"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Tutar"), { target: { value: "1000" } });
    fireEvent.click(screen.getByLabelText("Tedarikçiye ödendi"));
    return [...screen.getByLabelText("Tedarikçiye ödeme yöntemi").querySelectorAll("option")].map(o => o.textContent);
  };
  it("AC-12 / AC-13: gider formunda hesap seçici ve çek seçenekleri yok; kayıt hesapsız", async () => {
    const { kayitlar } = await baslat(KASASIZ_SEKMELER);
    const secenekler = odemeSatiri();
    expect(secenekler).not.toContain("Çek (ciro)");
    expect(secenekler).not.toContain("Çek (kendi)");
    expect(screen.queryByLabelText("Tedarikçiye hesabı")).toBeNull();
    fireEvent.click(screen.getByText("Kaydet"));
    await waitFor(() => expect(kayitlar.some(k => k.hesapHareketleri?.length === 1)).toBe(true), { timeout: 3000 });
    expect(kayitlar[kayitlar.length - 1].hesapHareketleri[0]).toMatchObject({ tur: "odeme", hesapId: null });
  });
  it("AC-13 (karşıt): Kasa'lı kullanıcıda aynı satırda çek seçenekleri ve hesap seçici var", async () => {
    await baslat(KASALI_SEKMELER);
    const secenekler = odemeSatiri();
    expect(secenekler).toContain("Çek (ciro)");
    expect(secenekler).toContain("Çek (kendi)");
    expect(screen.getByLabelText("Tedarikçiye hesabı")).toBeTruthy();
  });
  it("AC-12: müşteri tahsilat formunda hesap seçici çizilmez (Kasa'lıda çizilir)", async () => {
    const tahsilatFormu = async () => {
      menu("Müşteriler");
      await waitFor(() => expect(screen.getByText("TAHSİLATLI FİRMA")).toBeTruthy());
      fireEvent.click(screen.getByText("TAHSİLATLI FİRMA"));
      await waitFor(() => expect(screen.getAllByText("Ödeme Ekle").length).toBeGreaterThan(0));
      fireEvent.click(screen.getAllByText("Ödeme Ekle")[0]);
      await waitFor(() => expect(screen.getByText("Kapora/Ödeme Ekle")).toBeTruthy());
    };
    await baslat(KASASIZ_SEKMELER);
    await tahsilatFormu();
    fireEvent.click(screen.getByText("+ Ödeme Ekle"));
    fireEvent.change(screen.getAllByDisplayValue("Nakit").pop().parentElement.querySelector("input"), { target: { value: "7000" } });
    expect(screen.queryByLabelText("Tahsilat hesabı")).toBeNull();
    cleanup();
    await baslat(KASALI_SEKMELER);
    await tahsilatFormu();
    // Spec 0063 R13 ile güncellendi: hesap satırın alanıdır, tutarı girilmiş satırda çizilir.
    fireEvent.click(screen.getByText("+ Ödeme Ekle"));
    fireEvent.change(screen.getAllByDisplayValue("Nakit").pop().parentElement.querySelector("input"), { target: { value: "7000" } });
    expect(await screen.findByLabelText("Tahsilat hesabı")).toBeTruthy();
  });
  it("R7 (yedek): Kasa'sı olmayan kullanıcıda geri yükleme hesap tanımlarına dokunmaz; App ayarlayıcıyı vermez", () => {
    const app = readFileSync("src/App.jsx", "utf-8");
    expect(app).toMatch(/setKasaHesaplari=\{kasaSekmesi \? setKasaHesaplari : null\}/);
    const yedek = readFileSync("src/components/settings/SettingsBackup.jsx", "utf-8");
    expect(yedek).toMatch(/Array\.isArray\(restoreData\?\.kasaHesaplari\) && setKasaHesaplari\)/);
  });
});
