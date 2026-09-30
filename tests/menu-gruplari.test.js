// Spec 0043: menü grubu satır düzeni (saf). Sekme kimlikleri ve adları değişmez; grup yalnız çizim kararıdır.
import { describe, it, expect } from "vitest";
import { menuSatirlari, MENU_GRUPLARI, grupIcindeMi } from "../src/lib/menuGruplari";

const T = (id, label) => ({ id, label, icon: id });
const HEPSI = [T("dashboard", "Anasayfa"), T("customers", "Müşteriler"), T("dealers", "Bayiler"), T("stock", "Stok"),
  T("finance", "Finans"), T("gider", "Giderler"), T("kasa", "Kasa"), T("evrak", "Evrak Yönetimi"), T("notes", "Notlar"),
  T("servis", "Servis ve Kargo Panosu"), T("harita", "Faaliyet Haritası"), T("analiz", "Analiz"), T("settings", "Ayarlar")];
const ozet = (satirlar) => satirlar.map(s => s.tur === "grup" ? `[${s.grup.label}: ${s.cocuklar.map(c => c.label).join(", ")}]` : s.sekme.label);

describe("Spec 0043: menuSatirlari", () => {
  it("AC-1 / AC-2 / AC-14: Mali İşler grubu Finans, Giderler, Kasa sırasıyla Stok ile Evrak arasında; öteki sekmelerin sırası aynı", () => {
    expect(ozet(menuSatirlari(HEPSI))).toEqual(["Anasayfa", "Müşteriler", "Bayiler", "Stok", "[Mali İşler: Finans, Giderler, Kasa]",
      "Evrak Yönetimi", "Notlar", "Servis ve Kargo Panosu", "Faaliyet Haritası", "Analiz", "Ayarlar"]);
  });
  it("AC-15: grup tanımı mevcut sekme kimliklerini kullanır, sekme nesneleri olduğu gibi geçer", () => {
    expect(MENU_GRUPLARI[0].cocuklar).toEqual(["finance", "gider", "kasa"]);
    const g = menuSatirlari(HEPSI).find(s => s.tur === "grup");
    expect(g.cocuklar[0]).toBe(HEPSI[4]);
  });
  it("AC-8: gruptan tek ekran (Finans) kalırsa grup çizilmez, Finans düz satır olarak yerinde durur", () => {
    const sekmeler = HEPSI.filter(t => t.id !== "gider" && t.id !== "kasa");
    expect(ozet(menuSatirlari(sekmeler)).slice(3, 6)).toEqual(["Stok", "Finans", "Evrak Yönetimi"]);
    expect(menuSatirlari(sekmeler.filter(t => t.id !== "finance")).some(s => s.tur === "grup")).toBe(false);
  });
  it("AC-9: perde inikken (Kasa süzülmüş) grup Finans ve Giderler ile çizilir", () => {
    expect(ozet(menuSatirlari(HEPSI.filter(t => t.id !== "kasa")))[4]).toBe("[Mali İşler: Finans, Giderler]");
  });
  it("AC-10: dar kipte grup çizilmez, üç ekran düz satır", () => {
    const s = menuSatirlari(HEPSI, MENU_GRUPLARI, { dar: true });
    expect(s.every(x => x.tur === "sekme")).toBe(true);
    expect(s.map(x => x.sekme.id)).toEqual(HEPSI.map(t => t.id));
  });
  it("satır sayısı: bugün 13, grup kapalıyken 11 satır (Intent, R1 revizyonu)", () => {
    expect(menuSatirlari(HEPSI)).toHaveLength(11);
  });
  it("grupIcindeMi", () => {
    expect(grupIcindeMi(MENU_GRUPLARI[0], "kasa")).toBe(true);
    expect(grupIcindeMi(MENU_GRUPLARI[0], "stock")).toBe(false);
  });
});
