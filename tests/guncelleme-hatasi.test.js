// Kullanıcı isteği 2026-11-10: güncelleme yokken GitHub'ın 504 yanıtı Ayarlar › Uygulama Güncellemesi kutusunda
// istek adresi, başlıklar ve HTML gövdesiyle "Denetlenemedi: ..." diye basılıyordu; sessiz denetimin hatası da kutuyu kırmızıya çeviriyordu.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { guncellemeHataMetni, SUNUCU_ULASILAMADI, BAGLANTI_YOK, YAYIN_BULUNAMADI, BILINMEYEN_HATA } from "../src/lib/guncellemeHatasi.js";

const HAM_504 = `504 "method: GET url: https://github.com/keremgenisel/makina-crm/releases/download/v3.57.0/latest.yml\\n\\nPlease double check that your authentication token is correct. Due to security reasons, actual status maybe not reported, but 404.\\n"\nData:\n <html><body><h1>504 Gateway Time-out</h1>\nThe server didn't respond in time.\n</body></html>\n \nHeaders: {\n  "content-length": "92",\n  "cache-control": "no-cache"\n}`;

describe("güncelleme hata metni", () => {
  it("GitHub 504 yanıtı başlıksız tek cümleye iner", () => {
    const m = guncellemeHataMetni(HAM_504);
    expect(m).toBe(SUNUCU_ULASILAMADI);
    expect(m).not.toMatch(/Headers|<html|github\.com/);
  });
  it("öteki 5xx kodları ve HttpError biçimi de sunucu hatasıdır", () => {
    expect(guncellemeHataMetni('502 "method: GET url: x"')).toBe(SUNUCU_ULASILAMADI);
    expect(guncellemeHataMetni("HttpError: 503 Service Unavailable")).toBe(SUNUCU_ULASILAMADI);
    expect(guncellemeHataMetni("Error: request timed out")).toBe(SUNUCU_ULASILAMADI);
  });
  it("404 yayın bulunamadı, ağ hataları bağlantı metni", () => {
    expect(guncellemeHataMetni('404 "method: GET url: https://github.com/x/latest.yml"')).toBe(YAYIN_BULUNAMADI);
    expect(guncellemeHataMetni("net::ERR_INTERNET_DISCONNECTED")).toBe(BAGLANTI_YOK);
    expect(guncellemeHataMetni("getaddrinfo ENOTFOUND github.com")).toBe(BAGLANTI_YOK);
  });
  it("tanınmayan hata ilk satırıyla, kısaltılmış; boş hata bilinmeyen", () => {
    expect(guncellemeHataMetni("Imza doğrulanamadı\nHeaders: {}")).toBe("Imza doğrulanamadı");
    expect(guncellemeHataMetni("a".repeat(400)).length).toBeLessThanOrEqual(160);
    expect(guncellemeHataMetni("")).toBe(BILINMEYEN_HATA);
    expect(guncellemeHataMetni(undefined)).toBe(BILINMEYEN_HATA);
  });
  it("seçili sürüm numarası 3 haneli kod sayılmaz", () => {
    expect(guncellemeHataMetni("Sürüm v3.570.1 okunamadı")).toBe("Sürüm v3.570.1 okunamadı");
  });
});

describe("kaynak", () => {
  const main = fs.readFileSync("electron/main.cjs", "utf8");
  const app = fs.readFileSync("src/App.jsx", "utf8");
  it("updater 'error' olayı yalnız indirme sürerken iletilir (sessiz denetim kutuyu kırmızıya çevirmez)", () => {
    const blok = main.slice(main.indexOf('autoUpdater.on("error"'), main.indexOf('autoUpdater.on("error"') + 300);
    expect(blok).toMatch(/if \(!indirmeSuruyor\) return;/);
    const indir = main.slice(main.indexOf('ipcMain.handle("updater:download"'), main.indexOf('ipcMain.handle("updater:install"'));
    expect(indir).toMatch(/indirmeSuruyor = true;[\s\S]*finally \{\s*indirmeSuruyor = false;/);
  });
  it("App iki hata yolunda da metni çevirir", () => {
    expect(app.match(/error: guncellemeHataMetni\(/g)).toHaveLength(2);
    expect(app).not.toMatch(/error: (m|res\.error) \}/);
  });
});
