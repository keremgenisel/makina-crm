// Yazdırma şablonlarındaki her çeviri anahtarı, Ayarlar > Çeviriler ekranından da
// düzenlenebilmeli. Aksi halde şablona yeni bir başlık eklendiğinde İngilizcesi koda
// gömülü kalıyor ve kullanıcı değiştiremiyor — bu, "Servis Resimleri" başlığında yaşandı.
import { describe, it, expect } from "vitest";
import { GROUPS } from "../src/components/settings/SettingsTranslations";
import { DEFAULT_SERVIS_TRANSLATIONS, DEFAULT_MAKINA_TRANSLATIONS } from "../src/lib/printTemplates";

const ekrandakiler = (ns) => new Set(
  GROUPS.filter((g) => g.ns === ns).flatMap((g) => (g.keys || []).map((k) => k.key)),
);

describe("çeviri kapsamı", () => {
  it("servis formunun her anahtarı Çeviriler ekranında düzenlenebilir", () => {
    const ekranda = ekrandakiler("servis");
    const eksik = Object.keys(DEFAULT_SERVIS_TRANSLATIONS.TR).filter((k) => !ekranda.has(k));
    expect(eksik, "Çeviriler ekranına eklenmemiş anahtarlar").toEqual([]);
  });

  it("makina raporunun her anahtarı Çeviriler ekranında düzenlenebilir", () => {
    const ekranda = ekrandakiler("makina");
    const eksik = Object.keys(DEFAULT_MAKINA_TRANSLATIONS.TR).filter((k) => !ekranda.has(k));
    expect(eksik, "Çeviriler ekranına eklenmemiş anahtarlar").toEqual([]);
  });

  it("TR ve EN varsayılanları aynı anahtarları taşır", () => {
    for (const [ad, sozluk] of [["servis", DEFAULT_SERVIS_TRANSLATIONS], ["makina", DEFAULT_MAKINA_TRANSLATIONS]]) {
      const tr = Object.keys(sozluk.TR).sort();
      const en = Object.keys(sozluk.EN).sort();
      expect(en, ad + ": EN sözlüğünde eksik/fazla anahtar").toEqual(tr);
    }
  });

  it("Çeviriler ekranı olmayan bir anahtarı göstermez", () => {
    for (const ns of ["servis", "makina"]) {
      const sozluk = ns === "servis" ? DEFAULT_SERVIS_TRANSLATIONS.TR : DEFAULT_MAKINA_TRANSLATIONS.TR;
      for (const k of ekrandakiler(ns)) expect(sozluk, ns + " > " + k).toHaveProperty(k);
    }
  });

  it("yeni eklenen Servis Resimleri başlığı her iki dilde ve ekranda var", () => {
    expect(DEFAULT_SERVIS_TRANSLATIONS.TR.servisResimleriBaslik).toBe("SERVİS RESİMLERİ");
    expect(DEFAULT_SERVIS_TRANSLATIONS.EN.servisResimleriBaslik).toBe("SERVICE PHOTOS");
    expect(ekrandakiler("servis").has("servisResimleriBaslik")).toBe(true);
  });
});
