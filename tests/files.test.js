// Dosya arşivi saf yardımcıları: uzantı/kategori/izin ve güvenli ad üretimi.
// Güvenlik: sanitizeAd yol ayracı ve riskli karakterleri temizler (path traversal önlenir).
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { uzanti, turKategori, izinliMi, optimizeEdilebilirResimMi, sanitizeAd, depoAdi, pruneOrphans, dosyalarDir, yedekKlasorYolu, yedekleDosyaKlasoru, geriYukleDosyaKlasoru } from "../electron/files.cjs";

describe("files yardımcıları", () => {
  it("uzanti son uzantıyı küçük harf verir", () => {
    expect(uzanti("Belge.PDF")).toBe("pdf");
    expect(uzanti("resim.JPG")).toBe("jpg");
    expect(uzanti("adsiz")).toBe("");
  });

  it("turKategori doğru rozet kategorisi verir", () => {
    expect(turKategori("a.pdf")).toBe("PDF");
    expect(turKategori("a.png")).toBe("JPG");
    expect(turKategori("a.xlsx")).toBe("XLS");
    expect(turKategori("a.docx")).toBe("DOC");
    expect(turKategori("a.txt")).toBe("TXT");
    expect(turKategori("a.zip")).toBe("DOSYA");
  });

  it("izinliMi yalnız izin verilen türlere true", () => {
    expect(izinliMi("x.pdf")).toBe(true);
    expect(izinliMi("x.xlsx")).toBe(true);
    expect(izinliMi("x.exe")).toBe(false);
    expect(izinliMi("x.zip")).toBe(false);
  });

  it("optimizeEdilebilirResimMi yalnız jpg/jpeg/png; belge ve zaten sıkı format hariç", () => {
    expect(optimizeEdilebilirResimMi("foto.jpg")).toBe(true);
    expect(optimizeEdilebilirResimMi("foto.JPEG")).toBe(true);
    expect(optimizeEdilebilirResimMi("tarama.png")).toBe(true);
    expect(optimizeEdilebilirResimMi("sozlesme.pdf")).toBe(false);
    expect(optimizeEdilebilirResimMi("liste.xlsx")).toBe(false);
    expect(optimizeEdilebilirResimMi("resim.webp")).toBe(false);
    expect(optimizeEdilebilirResimMi("anim.gif")).toBe(false);
  });

  it("sanitizeAd yol ayracı/riskli karakteri temizler, Türkçe korunur", () => {
    expect(sanitizeAd("../../etc/passwd")).not.toContain("/");
    expect(sanitizeAd("..\\..\\win")).not.toContain("\\");
    expect(sanitizeAd("rapor:v2*.pdf")).toBe("rapor_v2_.pdf");
    expect(sanitizeAd("çıktı ölçüm.xlsx")).toBe("çıktı ölçüm.xlsx");
    expect(sanitizeAd("")).toBe("dosya");
  });

  it("depoAdi okunur ad üretir: <Firma> - <ad> - <anahtar>.<uzantı> (uzantı sonda)", () => {
    // Firma yoksa: "<ad> - <anahtar>.<uzantı>"
    expect(depoAdi("abc123", "rapor.pdf")).toBe("rapor - abc123.pdf");
    // Firma varsa öne gelir (Explorer'da sıralayınca gruplanır)
    expect(depoAdi("abc123", "rapor.pdf", "ABC Makina")).toBe("ABC Makina - rapor - abc123.pdf");
    // Uzantı her zaman en sonda kalır (dosya doğru açılsın)
    expect(depoAdi("k1", "Fatura 2026.xlsx", "Öz Çelik")).toMatch(/\.xlsx$/);
    // Firma adı da temizlenir (yol ayracı yok → sunucu guard'ından geçer)
    expect(depoAdi("k1", "f.pdf", "A/B Ltd")).toBe("A_B Ltd - f - k1.pdf");
    expect(depoAdi("k1", "f.pdf", "A/B Ltd")).not.toContain("/");
    // Uzantısız dosya
    expect(depoAdi("k1", "dosyaadsiz")).toBe("dosyaadsiz - k1");
  });

  it("pruneOrphans künyesi kalmayan fiziksel dosyaları siler, referanslıları korur", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "crm-files-"));
    const app = { getPath: () => tmp };
    const dir = dosyalarDir(app);
    fs.writeFileSync(path.join(dir, "a-tut.pdf"), "x");
    fs.writeFileSync(path.join(dir, "b-cop.pdf"), "x");
    fs.writeFileSync(path.join(dir, "c-cop.jpg"), "x");
    const r = pruneOrphans(app, ["a-tut.pdf"]); // yalnız a-tut künyede kaldı
    expect(r.ok).toBe(true);
    expect(r.silinen).toBe(2);
    expect(fs.existsSync(path.join(dir, "a-tut.pdf"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "b-cop.pdf"))).toBe(false);
    expect(fs.existsSync(path.join(dir, "c-cop.jpg"))).toBe(false);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("yedekle/geriYukle: dosya klasörünü JSON yanına kopyalar ve geri getirir; boşsa klasör açmaz", () => {
    const tmpApp = fs.mkdtempSync(path.join(os.tmpdir(), "crm-appdata-"));
    const tmpBk = fs.mkdtempSync(path.join(os.tmpdir(), "crm-bk-"));
    const app = { getPath: () => tmpApp };
    const jsonPath = path.join(tmpBk, "altunmak-crm-yedek-2026-07-10.json");

    // Boşken: klasör oluşturulmaz
    expect(yedekleDosyaKlasoru(app, jsonPath).bos).toBe(true);
    expect(fs.existsSync(yedekKlasorYolu(jsonPath))).toBe(false);

    // Dosya varken: JSON yanına kopyalanır
    const dir = dosyalarDir(app);
    fs.writeFileSync(path.join(dir, "x-a.pdf"), "A");
    fs.writeFileSync(path.join(dir, "x-b.jpg"), "B");
    const r = yedekleDosyaKlasoru(app, jsonPath);
    expect(r.ok).toBe(true);
    expect(r.adet).toBe(2);
    expect(fs.existsSync(path.join(yedekKlasorYolu(jsonPath), "x-a.pdf"))).toBe(true);

    // Geri yükleme: temiz bir hedefe kopyalanır, içerik korunur
    const tmpApp2 = fs.mkdtempSync(path.join(os.tmpdir(), "crm-appdata2-"));
    const app2 = { getPath: () => tmpApp2 };
    const gr = geriYukleDosyaKlasoru(app2, jsonPath);
    expect(gr.adet).toBe(2);
    expect(fs.readFileSync(path.join(dosyalarDir(app2), "x-a.pdf"), "utf-8")).toBe("A");

    // Klasör yoksa geri yükleme sessizce geçer
    const bosJson = path.join(tmpBk, "yok.json");
    expect(geriYukleDosyaKlasoru(app2, bosJson).yok).toBe(true);
  });

  it("yedekle/geriYukle: parola verilince dosyalar şifreli (.enc) yazılır ve parolayla çözülür", () => {
    const tmpApp = fs.mkdtempSync(path.join(os.tmpdir(), "crm-enc-"));
    const tmpBk = fs.mkdtempSync(path.join(os.tmpdir(), "crm-encbk-"));
    const app = { getPath: () => tmpApp };
    const jsonPath = path.join(tmpBk, "altunmak-crm-otoyedek-2026-07-12.json");
    fs.writeFileSync(path.join(dosyalarDir(app), "gizli.pdf"), "SÖZLEŞME GİZLİ İÇERİK");

    const r = yedekleDosyaKlasoru(app, jsonPath, "parola123");
    expect(r.ok).toBe(true);
    const encPath = path.join(yedekKlasorYolu(jsonPath), "gizli.pdf.enc");
    expect(fs.existsSync(encPath)).toBe(true);
    expect(fs.existsSync(path.join(yedekKlasorYolu(jsonPath), "gizli.pdf"))).toBe(false); // düz kopya yazılmaz
    expect(fs.readFileSync(encPath).toString("utf-8")).not.toContain("SÖZLEŞME"); // düz metin sızmaz

    // Doğru parola → orijinal içerik geri gelir
    const tmpApp2 = fs.mkdtempSync(path.join(os.tmpdir(), "crm-dec-"));
    const app2 = { getPath: () => tmpApp2 };
    const gr = geriYukleDosyaKlasoru(app2, jsonPath, "parola123");
    expect(gr.adet).toBe(1);
    expect(fs.readFileSync(path.join(dosyalarDir(app2), "gizli.pdf"), "utf-8")).toBe("SÖZLEŞME GİZLİ İÇERİK");

    // Yanlış parola → çözülemez, dosya yazılmaz
    const tmpApp3 = fs.mkdtempSync(path.join(os.tmpdir(), "crm-wrong-"));
    const app3 = { getPath: () => tmpApp3 };
    expect(geriYukleDosyaKlasoru(app3, jsonPath, "yanlis").adet).toBe(0);
    expect(fs.existsSync(path.join(dosyalarDir(app3), "gizli.pdf"))).toBe(false);

    // Parolasız şifreli dosya → atlanır
    const tmpApp4 = fs.mkdtempSync(path.join(os.tmpdir(), "crm-nopw-"));
    const app4 = { getPath: () => tmpApp4 };
    expect(geriYukleDosyaKlasoru(app4, jsonPath, null).adet).toBe(0);

    [tmpApp, tmpBk, tmpApp2].forEach(d => fs.rmSync(d, { recursive: true, force: true }));
  });
});
