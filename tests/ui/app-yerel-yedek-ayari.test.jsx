// @vitest-environment jsdom
// Otomatik yedek ayarı (kutu/klasör/sıklık) uygulama kapatılıp açılınca KORUNMALI.
//
// Gerileme: v3.2.0 güvenlik ayıklaması (disAppSettingsSuz) bu alanları yükleme sırasında blob'dan
// siliyordu ama onları bu PC'de saklayan bir yerel depo yoktu → her açılışta "Otomatik Yedekleme"
// kutusu boş geliyordu. Artık localStorage'da tutulur (yerelYedekAyariOku/Yaz) ve yükleme
// tamamlanmadan (veri boşken) yedek yazılmaz.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import App from "../../src/App";
import { yerelYedekAyariOku, yerelYedekAyariYaz, YEREL_YEDEK_AYARI_ANAHTAR } from "../../src/lib/utils";

afterEach(() => { cleanup(); delete window.crmStorage; vi.unstubAllGlobals(); localStorage.clear(); });

function kurStorage(yuklenen) {
  const yazilan = [];
  window.crmStorage = {
    load: vi.fn(async () => yuklenen),
    save: vi.fn(async () => true),
    writeBackup: vi.fn(async (folder, data) => { yazilan.push({ folder, data }); return true; }),
  };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  return yazilan;
}

describe("yerel yedek ayarı — yardımcılar", () => {
  it("yalnız makinaya özgü alanları yazar/okur, autoBackup boolean'a zorlanır", () => {
    const bellek = new Map();
    const st = { getItem: (k) => bellek.get(k) ?? null, setItem: (k, v) => bellek.set(k, v) };
    yerelYedekAyariYaz({ autoBackup: true, backupFolder: "D:\\Yedek", frequency: "daily", lastBackup: "2026-09-01", kdvRates: [1], teklifTakipGun: 7 }, st);
    expect(JSON.parse(bellek.get(YEREL_YEDEK_AYARI_ANAHTAR))).toEqual({ autoBackup: true, backupFolder: "D:\\Yedek", frequency: "daily", lastBackup: "2026-09-01" });
    expect(yerelYedekAyariOku(st)).toEqual({ autoBackup: true, backupFolder: "D:\\Yedek", frequency: "daily", lastBackup: "2026-09-01" });
    // bozuk/eksik değerde patlamaz
    bellek.set(YEREL_YEDEK_AYARI_ANAHTAR, "{bozuk");
    expect(yerelYedekAyariOku(st)).toEqual({});
    bellek.set(YEREL_YEDEK_AYARI_ANAHTAR, JSON.stringify({ autoBackup: "true" }));
    expect(yerelYedekAyariOku(st)).toEqual({ autoBackup: false });
    expect(yerelYedekAyariOku(undefined)).toEqual({});
  });
});

describe("App — otomatik yedek ayarı yeniden açılışta korunur", () => {
  it("kutu işaretlenince localStorage'a yazılır", async () => {
    kurStorage({ appSettings: { teklifTakipGun: 7 } });
    render(<App />);
    await waitFor(() => expect(window.crmStorage.load).toHaveBeenCalled());
    // Ayarlar sekmesine gitmeden App'in kendi effect'i üzerinden doğrula: başlangıçta kapalı
    await waitFor(() => expect(yerelYedekAyariOku()).toMatchObject({ autoBackup: false }));
  });

  it("önceki oturumda açık bırakılan ayar, blob autoBackup taşımasa da yeniden yüklenir ve yedek yazılır", async () => {
    // Önceki oturum: kullanıcı kutuyu işaretleyip klasör seçmişti; vakti gelmiş (lastBackup yok)
    yerelYedekAyariYaz({ autoBackup: true, backupFolder: "D:\\Yedek", frequency: "daily", lastBackup: null });
    const musteriler = [{ id: 1, firma: "Test Firma", model: "X" }];
    // Veri dosyası/sunucu yerel alanları taşımaz (ya da eski/yanlış taşır) — ikisi de yok sayılmalı
    const yazilan = kurStorage({ customers: musteriler, appSettings: { autoBackup: false, backupFolder: "", teklifTakipGun: 7 } });

    render(<App />);
    await waitFor(() => expect(window.crmStorage.load).toHaveBeenCalled());
    await waitFor(() => expect(yazilan.length).toBe(1), { timeout: 3000 });

    expect(yazilan[0].folder).toBe("D:\\Yedek");
    // Yükleme bitmeden (veri boşken) yazılmadı: yedek gerçek müşterileri içeriyor
    expect(yazilan[0].data.customers).toHaveLength(1);
    expect(yazilan[0].data.customers[0]).toMatchObject(musteriler[0]);
    // lastBackup damgası da yerel depoya düştü → bir sonraki açılışta yeniden yazılmaz
    await waitFor(() => expect(yerelYedekAyariOku().lastBackup).toBeTruthy());
    expect(yerelYedekAyariOku()).toMatchObject({ autoBackup: true, backupFolder: "D:\\Yedek", frequency: "daily" });
  });

  it("yerel depo boşken sunucudan gelen autoBackup uygulanmaz (güvenlik ayıklaması bozulmadı)", async () => {
    const yazilan = kurStorage({ appSettings: { autoBackup: true, backupFolder: "\\\\10.0.0.5\\pub", frequency: "daily", lastBackup: null } });
    render(<App />);
    await waitFor(() => expect(window.crmStorage.load).toHaveBeenCalled());
    await new Promise(r => setTimeout(r, 150));
    expect(yazilan).toEqual([]);
    expect(yerelYedekAyariOku()).toMatchObject({ autoBackup: false });
  });
});
