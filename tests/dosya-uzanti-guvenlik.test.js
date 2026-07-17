// Uzantı beyaz listesinin ATLANABİLDİĞİ yol: yedekten geri yükleme.
//
// Yükleme uçlarının hepsi izinliMi() ile denetleniyordu, ama yedek JSON'unun yanındaki dosya
// klasörü denetimsiz kopyalanıyordu. Yedek çifti elle hazırlanabildiği için saldırgan hem
// fiziksel dosyayı hem ona işaret eden künyeyi kontrol ediyor: künye "Fatura Mart.pdf" (PDF
// rozeti) görünürken diskteki dosya .exe oluyor, kullanıcı "Aç"a basınca shell.openPath onu
// Windows'a devrediyor ve çalışıyordu. Yani veri hâkimiyeti KOD YÜRÜTMEYE yükseliyordu.
// İki katman kapatıldı: (1) geriYukleDosyaKlasoru beyaz liste dışını hiç kopyalamaz,
// (2) files:open açmadan önce diskteki ADA bakar (künyeye değil) ve beyaz liste dışını açmaz.
import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);

// electron'u sahtele: node altında require("electron") ikili dosyanın yolunu (string) döndürür,
// yani shell/dialog undefined kalır. Handler'ı gerçekten çağırabilmek için cache'i önceden doldur.
const acilanlar = [];
const electronPath = require.resolve("electron");
require.cache[electronPath] = {
  id: electronPath, filename: electronPath, loaded: true, exports: {
    shell: { openPath: async (p) => { acilanlar.push(p); return ""; } },
    dialog: {},
  },
};

const files = require("../electron/files.cjs");
const { registerFileHandlers } = require("../electron/ipc/files.cjs");

// Handler'ları sahte ipcMain ile topla. net=null → yerel mod, net verilirse istemci modu.
function kur(net = null) {
  const tmpApp = fs.mkdtempSync(path.join(os.tmpdir(), "crm-acma-"));
  const app = { getPath: () => tmpApp };
  const handlers = {};
  registerFileHandlers({ handle: (k, fn) => { handlers[k] = fn; } }, app,
    { getFocusedWindow: () => null, getAllWindows: () => [] }, net);
  return { app, handlers, dosyalar: files.dosyalarDir(app) };
}

beforeEach(() => { acilanlar.length = 0; });

describe("yedekten geri yükleme — uzantı beyaz listesi", () => {
  it("beyaz liste dışı dosyayı (.exe) depoya HİÇ kopyalamaz, izinliyi kopyalar", () => {
    const { app, dosyalar } = kur();
    const tmpBk = fs.mkdtempSync(path.join(os.tmpdir(), "crm-kotu-yedek-"));
    const jsonPath = path.join(tmpBk, "poc.json");
    const yedekKlasor = files.yedekKlasorYolu(jsonPath);
    fs.mkdirSync(yedekKlasor, { recursive: true });
    // Saldırganın hazırladığı yedek: künyede "PDF" görünecek ad, diskte .exe
    fs.writeFileSync(path.join(yedekKlasor, "Altuntas - Fatura Mart - k9x2a.exe"), "MZ yük");
    fs.writeFileSync(path.join(yedekKlasor, "Altuntas - Fatura Mart - k9x2b.pdf"), "%PDF gerçek");

    const r = files.geriYukleDosyaKlasoru(app, jsonPath);
    expect(r.ok).toBe(true);
    expect(r.adet).toBe(1);      // yalnız pdf geri geldi
    expect(r.atlanan).toBe(1);   // exe atlandı
    expect(fs.existsSync(path.join(dosyalar, "Altuntas - Fatura Mart - k9x2a.exe"))).toBe(false);
    expect(fs.existsSync(path.join(dosyalar, "Altuntas - Fatura Mart - k9x2b.pdf"))).toBe(true);
  });

  it("şifreli yedekte de denetler: .enc soyulduktan sonraki gerçek ada bakar", () => {
    const { app, dosyalar } = kur();
    const tmpBk = fs.mkdtempSync(path.join(os.tmpdir(), "crm-enc-yedek-"));
    const jsonPath = path.join(tmpBk, "poc-enc.json");
    // Gerçek şifreli yedeği kendi kodumuzla üret, sonra içine kötü dosya sok
    const kaynakDir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-enc-kaynak-"));
    const kaynakApp = { getPath: () => kaynakDir };
    fs.writeFileSync(path.join(files.dosyalarDir(kaynakApp), "temiz.pdf"), "%PDF");
    fs.writeFileSync(path.join(files.dosyalarDir(kaynakApp), "kotu.exe"), "MZ");
    files.yedekleDosyaKlasoru(kaynakApp, jsonPath, "parola123"); // temiz.pdf.enc + kotu.exe.enc

    const r = files.geriYukleDosyaKlasoru(app, jsonPath, "parola123");
    expect(r.adet).toBe(1);
    expect(r.atlanan).toBe(1);
    expect(fs.existsSync(path.join(dosyalar, "temiz.pdf"))).toBe(true);
    expect(fs.existsSync(path.join(dosyalar, "kotu.exe"))).toBe(false);
  });

  it("meşru yedek bozulmadan geri gelir (düzeltme normal kullanımı engellemiyor)", () => {
    const { app, dosyalar } = kur();
    const tmpBk = fs.mkdtempSync(path.join(os.tmpdir(), "crm-iyi-yedek-"));
    const jsonPath = path.join(tmpBk, "iyi.json");
    const yedekKlasor = files.yedekKlasorYolu(jsonPath);
    fs.mkdirSync(yedekKlasor, { recursive: true });
    // Fabrikanın gerçek evrak karışımı: eski Office biçimleri ve Türkçe adlar dahil
    for (const ad of ["Öz Çelik - teklif - a1.doc", "Öz Çelik - liste - a2.xls", "foto - a3.JPG", "notlar - a4.txt"])
      fs.writeFileSync(path.join(yedekKlasor, ad), "içerik");

    const r = files.geriYukleDosyaKlasoru(app, jsonPath);
    expect(r.adet).toBe(4);
    expect(r.atlanan).toBe(0);
    expect(fs.readFileSync(path.join(dosyalar, "Öz Çelik - teklif - a1.doc"), "utf-8")).toBe("içerik");
  });
});

describe("files:open — son kapı", () => {
  it("diskteki .exe'yi AÇMAZ (künye PDF dese bile shell.openPath'e ulaşmaz)", async () => {
    const { handlers, dosyalar } = kur();
    // Dosya bir şekilde depoya girmiş olsa bile (eski sürümden kalma, elle kopyalanmış):
    fs.writeFileSync(path.join(dosyalar, "Altuntas - Fatura Mart - k9x2a.exe"), "MZ yük");
    const r = await handlers["files:open"](null, "Altuntas - Fatura Mart - k9x2a.exe");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("Bu dosya türü açılamaz.");
    expect(acilanlar).toEqual([]); // işletim sistemine hiç devredilmedi
  });

  it("izinli dosyayı normal açar", async () => {
    const { handlers, dosyalar } = kur();
    fs.writeFileSync(path.join(dosyalar, "rapor - k1.pdf"), "%PDF");
    const r = await handlers["files:open"](null, "rapor - k1.pdf");
    expect(r.ok).toBe(true);
    expect(acilanlar).toHaveLength(1);
    expect(acilanlar[0]).toContain("rapor - k1.pdf");
  });

  it("klasör dışına çıkma girişimini açmaz", async () => {
    const { handlers } = kur();
    for (const ad of ["../../gizli.pdf", "..\\..\\gizli.pdf", ""]) {
      const r = await handlers["files:open"](null, ad);
      expect(r.ok, ad).toBe(false);
    }
    expect(acilanlar).toEqual([]);
  });

  it("istemci modunda da denetler: .exe için sunucudan indirme bile denenmez", async () => {
    let indirildi = 0;
    const net = { isClient: () => true, download: async () => { indirildi++; return Buffer.from("MZ"); } };
    const { handlers } = kur(net);
    const r = await handlers["files:open"](null, "Altuntas - Fatura - k1.exe");
    expect(r.ok).toBe(false);
    expect(indirildi).toBe(0);   // tmpdir'e hiç yazılmadı
    expect(acilanlar).toEqual([]);
  });
});

describe("motwDamgala — Mark-of-the-Web", () => {
  // .doc/.xls beyaz listede kalıyor (fabrika evrakı), ama MOTW damgası Office'in Korumalı
  // Görünüm katmanını geri getiriyor: makro çalıştırmadan önce kullanıcıya ek bir engel.
  it("Windows'ta Zone.Identifier akışına ZoneId=3 yazar", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "crm-motw-"));
    const yol = path.join(tmp, "teklif.doc");
    fs.writeFileSync(yol, "belge");
    const r = files.motwDamgala(yol, "win32"); // platform enjekte: macOS/Linux'ta da Windows dalı sınanır
    expect(r.ok).toBe(true);
    const damga = fs.readFileSync(yol + ":Zone.Identifier", "utf-8");
    expect(damga).toContain("[ZoneTransfer]");
    expect(damga).toContain("ZoneId=3"); // 3 = Internet → Word/Excel Korumalı Görünüm açar
  });

  it("Windows dışında sessizce atlanır (açmayı engellemez)", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "crm-motw2-"));
    const yol = path.join(tmp, "teklif.doc");
    fs.writeFileSync(yol, "belge");
    expect(files.motwDamgala(yol, "darwin")).toEqual({ ok: false, atlandi: true });
    expect(fs.existsSync(yol + ":Zone.Identifier")).toBe(false);
  });

  it("damgalanamayan yolda patlamaz (FAT32/ağ sürücüsü → damga yok, dosya yine açılır)", () => {
    const r = files.motwDamgala("/olmayan-klasor/x.doc", "win32");
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
  });
});
