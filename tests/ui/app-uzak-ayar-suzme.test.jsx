// @vitest-environment jsdom
// Otomatik yedek klasörü sunucudan gelen blob ile belirlenemez.
//
// appSettings senkronize edilen bir blob bölümü ve istemci sunucudan geleni koşulsuz
// birleştiriyordu. "settings" yazma izni olan kısıtlı bir kullanıcı
// {autoBackup:true, backupFolder:"\\10.0.0.5\pub", lastBackup:null} yazınca HER istemci, açılışta
// vakti gelmiş sayıp tüm CRM dökümünü (PII, finans, evrak) ve dosya arşivini o paylaşıma düz JSON
// olarak kopyalıyordu. Yedek klasörü/zamanlaması makinaya özgüdür: yalnız bu PC'de, klasör seçme
// diyaloğuyla belirlenir. Geri yükleme yolunda zaten ayıklanıyordu, senkronizasyon yolunda eksikti.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import App from "../../src/App";
import { disAppSettingsSuz } from "../../src/lib/utils";

afterEach(() => { cleanup(); delete window.crmStorage; vi.unstubAllGlobals(); });

// Sunucudan gelen blob'u taklit eden crmStorage. writeBackup çağrılırsa saldırı başarılı demektir.
function kurStorage(appSettings) {
  const yazilanYedekler = [];
  window.crmStorage = {
    load: vi.fn(async () => ({ appSettings })),
    save: vi.fn(async () => true),
    writeBackup: vi.fn(async (folder) => { yazilanYedekler.push(folder); return true; }),
  };
  // Ülke/kur servisleri jsdom'da çağrılmasın
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  return yazilanYedekler;
}

describe("sunucudan gelen appSettings — makinaya özgü alanlar", () => {
  it("saldırganın yedek klasörü uygulanmaz, hiçbir yedek yazılmaz", async () => {
    const yazilanYedekler = kurStorage({
      autoBackup: true,
      backupFolder: "\\\\10.0.0.5\\pub",
      frequency: "daily",
      lastBackup: null, // "vakti geldi" → effect anında yedek yazmaya kalkardı
    });

    render(<App />);
    await waitFor(() => expect(window.crmStorage.load).toHaveBeenCalled());
    // Effect'lerin (yükleme → appSettings → otomatik yedek) hepsinin akması için bekle
    await new Promise(r => setTimeout(r, 100));

    expect(yazilanYedekler).toEqual([]);
    expect(window.crmStorage.writeBackup).not.toHaveBeenCalled();
  });

  it("taşınabilir ayarlar (kdv, takip günleri) sunucudan uygulanmaya devam eder", async () => {
    // Ayıklama fazla geniş olursa senkronizasyon sessizce bozulur — sınırı burada sabitliyoruz.
    const uzak = { backupFolder: "\\\\10.0.0.5\\pub", autoBackup: true, frequency: "daily", lastBackup: null, teklifTakipGun: 14, tahsilatTakipGun: 3, autoLockMinutes: 15 };
    expect(disAppSettingsSuz(uzak)).toEqual({ teklifTakipGun: 14, tahsilatTakipGun: 3, autoLockMinutes: 15 });
  });

  it("yerel yedek ayarı korunur: kullanıcının kendi seçtiği klasör sunucudan ezilmez", () => {
    const yerel = { autoBackup: true, backupFolder: "D:\\Yedek", frequency: "weekly", lastBackup: "2026-07-01" };
    const uzak = { autoBackup: true, backupFolder: "\\\\10.0.0.5\\pub", frequency: "daily", lastBackup: null, teklifTakipGun: 7 };
    expect({ ...yerel, ...disAppSettingsSuz(uzak) }).toEqual({ ...yerel, teklifTakipGun: 7 });
  });

  it("boş/eksik blob'da patlamaz", () => {
    expect(disAppSettingsSuz(null)).toEqual({});
    expect(disAppSettingsSuz(undefined)).toEqual({});
  });
});
