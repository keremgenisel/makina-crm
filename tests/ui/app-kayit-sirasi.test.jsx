// @vitest-environment jsdom
// Gerileme: Ayarlar > Yedekleme'de otomatik yedek İLK KEZ açılırken "Değişiklikler kaydedilemedi!"
// Kök neden: kayıt gövdesi (__dataVersion dahil) state değişince hazırlanıp 500 ms sonra gönderiliyordu;
// önceki kayıt hâlâ yoldayken (büyük DB'de yüzlerce ms) gelen ikinci değişiklik ESKİ sürümle gidip
// sahte çakışma üretiyordu. Artık kayıtlar sıralı ve sürüm gönderim anında okunuyor (lib/kayitSirasi.js).
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, waitFor, screen, fireEvent } from "@testing-library/react";
import App from "../../src/App";

afterEach(() => { cleanup(); delete window.crmStorage; vi.unstubAllGlobals(); localStorage.clear(); });

// Sürüm denetimli, YAVAŞ sahte depo (yerel/sunucu modun crm:save davranışı)
function kurStorage({ saveMs = 400 } = {}) {
  const s = { version: 1, kayitlar: [] };
  window.crmStorage = {
    load: vi.fn(async () => ({ customers: [{ id: 1, name: "F", model: "AK100" }], appSettings: { teklifTakipGun: 7 }, dataVersion: 1 })),
    save: vi.fn((d) => new Promise(res => setTimeout(() => {
      if (d.__dataVersion !== s.version) { s.kayitlar.push({ ok: false, v: d.__dataVersion }); return res(false); }
      s.version += 1; s.kayitlar.push({ ok: true, v: d.__dataVersion, appSettings: d.appSettings }); res(true);
    }, saveMs))),
    getVersion: vi.fn(async () => s.version),
    chooseFolder: vi.fn(async () => "D:\\Yedek"), // Sıklık seçici bu API varsa görünür
    writeBackup: vi.fn(async () => true),
  };
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("test: ağ yok"))));
  return s;
}

const bekle = (ms) => new Promise(r => setTimeout(r, ms));

describe("App — ardışık kayıtlar sahte çakışma üretmez (otomatik yedek ilk açılış)", () => {
  it("kutu işaretlenip kayıt yoldayken sıklık değişince ikinci kayıt da kabul edilir, hata toast'ı çıkmaz", async () => {
    const sunucu = kurStorage({ saveMs: 400 });
    render(<App />);
    await waitFor(() => expect(window.crmStorage.load).toHaveBeenCalled());
    await bekle(800); // yükleme sonrası 700 ms kayıt bastırması geçsin

    fireEvent.click(screen.getByText("Ayarlar"));
    fireEvent.click(screen.getByText("Veri Yönetimi"));
    fireEvent.click(screen.getByText("Yedekleme"));
    const kutu = screen.getByLabelText("Otomatik Yedekleme");
    fireEvent.click(kutu);                        // kayıt A: 500 ms sonra gider, 400 ms sürer
    await bekle(650);                             // A yolda
    fireEvent.change(screen.getByDisplayValue("Her hafta"), { target: { value: "daily" } }); // kayıt B planlanır

    await waitFor(() => expect(sunucu.kayitlar.length).toBe(2), { timeout: 4000 });
    expect(sunucu.kayitlar.every(k => k.ok)).toBe(true);           // eskiden 2.si ok:false (bayat sürüm)
    expect(sunucu.kayitlar[1].v).toBe(2);
    expect(sunucu.kayitlar[1].appSettings).toMatchObject({ autoBackup: true, frequency: "daily" });
    expect(screen.queryByText(/kaydedilemedi/i)).toBeNull();
    expect(screen.queryByText(/çakışması/i)).toBeNull();
  }, 10000);
});
