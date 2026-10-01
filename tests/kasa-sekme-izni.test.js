// Spec 0052: Kasa sekmesinin kendi izni. Görünürlük (tek kural gorunurSekmeler), sunucu eşlemesi ve önkoşulu,
// GIDER_BOLUMLERI üyeliği, 0044 istisnasının Kasa'ya bağlanmaması ve kaynak taramaları. Geri doldurma (R12) Electron'da
// scripts/tests/kasa-sekme-gocu.cjs ile; arayüz tests/ui/kasa-sekme-izni.test.jsx ile.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { gorunurSekmeler, READONLY_SERVER_PERMISSIONS } from "../src/lib/permissions.js";
import { ALL_TABS, DEFAULT_USER_TABS } from "../src/components/settings/serverPermissionDefs.js";
import {
  BOLUM_SEKMELERI, ON_KOSUL_SEKMELERI, GIDER_BOLUMLERI, sekmeEngelli, giderAynaEngeli, yazmaYetkisiVar, eylemDenetimi,
  degisenBolumler, tahsilatHesabiYalnizMi, kisitliMi,
} from "../electron/serverAuth.cjs";

const TABS = ["dashboard", "customers", "finance", "gider", "kasa", "settings"].map(id => ({ id }));
const kullanici = (tabs) => ({ role: "user", permissions: JSON.stringify(tabs === undefined ? {} : { tabs }) });
const kasaGorur = (izin, mod = "active") => gorunurSekmeler(TABS, mod, izin).some(t => t.id === "kasa");

describe("Spec 0052: Kasa görünürlüğü tek kuralla (gorunurSekmeler)", () => {
  it("AC-2: Giderler ve Finans verilmiş ama Kasa kutusu kaldırılmış kullanıcı Kasa'yı görmez", () => {
    expect(kasaGorur(kullanici(["gider", "finance"]))).toBe(false);
  });
  it("AC-3: Kasa işaretli ama Finans verilmemiş kullanıcı Kasa'yı görmez", () => {
    expect(kasaGorur(kullanici(["gider", "kasa"]))).toBe(false);
  });
  it("AC-4: Kasa işaretli ama Giderler verilmemiş kullanıcı Kasa'yı görmez", () => {
    expect(kasaGorur(kullanici(["finance", "kasa"]))).toBe(false);
  });
  it("AC-5: üçü birden olan kullanıcı Kasa'yı görür", () => {
    expect(kasaGorur(kullanici(["gider", "finance", "kasa"]))).toBe(true);
  });
  it("AC-6: geri doldurulmuş liste (gider, finance, kasa) Kasa'yı göstermeye devam eder", () => {
    expect(kasaGorur(kullanici(["dashboard", "gider", "finance", "kasa"]))).toBe(true);
  });
  it("AC-9: yönetici rolü, yerel mod ve sunucu PC Kasa'yı her hâlükârda görür", () => {
    expect(kasaGorur({ role: "admin", permissions: JSON.stringify({ tabs: [] }) })).toBe(true);
    expect(kasaGorur(null, null)).toBe(true);
    expect(kasaGorur(null)).toBe(true);
  });
  it("AC-20: sekme listesi tanımsız kullanıcı Kasa'yı görmez (0001 C6 kural 3'ün doğal sonucu)", () => {
    expect(kasaGorur(kullanici(undefined))).toBe(false);
    expect(kasaGorur({ role: "user", permissions: "bozuk{" })).toBe(false);
  });
  it("AC-21: salt okunur izin seti (bağlantı kopuk) Kasa'yı açmaz", () => {
    expect(kasaGorur(READONLY_SERVER_PERMISSIONS)).toBe(false);
  });
  it("AC-8: yeni kullanıcının varsayılan sekmelerinde Kasa yoktur; Kasa izin ekranındaki sekme listesindedir", () => {
    expect(DEFAULT_USER_TABS).not.toContain("kasa");
    expect(kasaGorur(kullanici(DEFAULT_USER_TABS))).toBe(false);
    expect(ALL_TABS.map(t => t.id)).toContain("kasa");
    expect(ALL_TABS.findIndex(t => t.id === "kasa")).toBe(ALL_TABS.findIndex(t => t.id === "gider") + 1);
  });
});

describe("Spec 0052: sunucu eşlemesi ve önkoşul (R7, R8, R14)", () => {
  const h = { id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: "2026-01-01", kapali: false };
  const hesapYazimlari = [
    ["ekleme", { kasaHesaplari: [] }, { kasaHesaplari: [h] }],
    ["düzenleme", { kasaHesaplari: [h] }, { kasaHesaplari: [{ ...h, ad: "Ziraat TL" }] }],
    ["kapatma", { kasaHesaplari: [h] }, { kasaHesaplari: [{ ...h, kapali: true }] }],
    ["silme", { kasaHesaplari: [h] }, { kasaHesaplari: [] }],
  ];
  const izin = (tabs) => JSON.stringify({ tabs, giderActions: ["kasa_hesap", "gider_odeme"] });
  const yazar = (tabs, eski, yeni) => yazmaYetkisiVar(izin(tabs), "user", degisenBolumler(eski, yeni), eski, yeni).ok
    && !giderAynaEngeli(izin(tabs), "user", degisenBolumler(eski, yeni), eski, yeni) && eylemDenetimi(eski, yeni, izin(tabs), "user").ok;

  it("AC-10: Kasa'sı olmayan kullanıcı hesap tanımı ekleyemez, düzenleyemez, kapatamaz, silemez", () => {
    expect(BOLUM_SEKMELERI.kasaHesaplari).toEqual(["kasa"]);
    for (const [ad, eski, yeni] of hesapYazimlari) {
      expect(yazar(["gider", "finance"], eski, yeni), ad).toBe(false);
      expect(yazar(["gider", "finance", "kasa"], eski, yeni), ad).toBe(true);
    }
  });
  it("AC-10: listesinde 'kasa' olsa bile Finans'ı ya da Giderler'i yoksa reddedilir (önkoşul ham listeye uygulanır)", () => {
    expect(ON_KOSUL_SEKMELERI.kasaHesaplari).toEqual(["gider", "finance"]);
    for (const [ad, eski, yeni] of hesapYazimlari) {
      expect(yazar(["gider", "kasa"], eski, yeni), ad).toBe(false);
      expect(yazar(["finance", "kasa"], eski, yeni), ad).toBe(false);
      expect(yazar(["kasa"], eski, yeni), ad).toBe(false);
    }
    expect(sekmeEngelli({ tabs: ["gider", "kasa"] }, "kasaHesaplari")).toBe(true);
    expect(sekmeEngelli({ tabs: ["gider", "finance", "kasa"] }, "kasaHesaplari")).toBe(false);
    // Önkoşul yalnız hesap tanımlarına uygulanır; başka bölüm etkilenmez.
    // Spec 0058 R12 ile güncellendi: kasa iş listesi kararı da Kasa sekmesi + önkoşul ister.
    expect(Object.keys(ON_KOSUL_SEKMELERI)).toEqual(["kasaHesaplari", "kasaKapsamDisi"]);
    expect(sekmeEngelli({ tabs: ["gider"] }, "giderler")).toBe(false);
  });
  it("AC-11: Kasa'sı olmayan gider kullanıcısı ödeme hareketi yazabilir (hesapHareketleri Giderler'de kalır)", () => {
    expect(BOLUM_SEKMELERI.hesapHareketleri).toEqual(["gider"]);
    const eski = { hesapHareketleri: [] };
    const yeni = { hesapHareketleri: [{ id: 300, tur: "odeme", tarih: "2026-10-01", tutar: 1000, yontem: "Havale", giderId: 5, taksitId: null, hesapId: null }] };
    for (const tabs of [["gider"], ["gider", "finance"]]) expect(yazar(tabs, eski, yeni), tabs.join()).toBe(true);
  });
  it("AC-22: kasaHesaplari GIDER_BOLUMLERI'nde kalır; sekme listesi tanımsız kullanıcı hesap yazamaz", () => {
    expect(GIDER_BOLUMLERI.has("kasaHesaplari")).toBe(true);
    expect(sekmeEngelli({}, "kasaHesaplari")).toBe(true);
    const [, eski, yeni] = hesapYazimlari[0];
    const tanimsiz = JSON.stringify({ giderActions: ["kasa_hesap"] });
    expect(giderAynaEngeli(tanimsiz, "user", ["kasaHesaplari"], eski, yeni)).toBe("kasaHesaplari");
    expect(giderAynaEngeli(null, "user", ["kasaHesaplari"], eski, yeni)).toBe("kasaHesaplari");
  });
  it("AC-23: 0044'ün tahsilat hesabı istisnası Kasa sekmesi olmadan da çalışır (gider + finans şartı)", () => {
    const kayit = { id: 1, customerId: 5, odendi: true, servisUcreti: 100 };
    const eski = { services: [kayit] }, yeni = { services: [{ ...kayit, hesapId: 97 }] };
    const kasasiz = JSON.stringify({ tabs: ["gider", "finance"], customerActions: [], stockActions: [], giderActions: ["gider_odeme"] });
    expect(tahsilatHesabiYalnizMi("services", eski, yeni)).toBe(true);
    expect(yazmaYetkisiVar(kasasiz, "user", ["services"], eski, yeni).ok).toBe(true);
    expect(eylemDenetimi(eski, yeni, kasasiz, "user").ok).toBe(true);
  });
  it("AC-26 (sunucu yanı): bütün sekmeleri (kasa dahil) verilen kullanıcı kısıtlı sayılmaz", () => {
    expect(kisitliMi(JSON.stringify({ tabs: ALL_TABS.map(t => t.id) }), "user")).toBe(false);
    expect(kisitliMi(JSON.stringify({ tabs: ALL_TABS.map(t => t.id).filter(t => t !== "kasa") }), "user")).toBe(true);
  });
});

describe("Spec 0052: kaynak taramaları (DoD, R2, R3, X5)", () => {
  const kod = (f) => readFileSync(f, "utf-8").split("\n").filter(l => !l.trim().startsWith("//") && !l.trim().startsWith("*")).join("\n");
  const dosyalar = (kok) => readdirSync(kok).flatMap(ad => {
    const p = join(kok, ad);
    return statSync(p).isDirectory() ? dosyalar(p) : /\.(jsx?|cjs|mjs)$/.test(ad) ? [p] : [];
  });
  it("R2: gorunurSekmeler'de kasayı izin listesinden muaf tutan şart yoktur; kasaSuz önkoşulu korunur", () => {
    const s = kod("src/lib/permissions.js");
    expect(s).not.toMatch(/\|\|\s*t\.id\s*===\s*"kasa"/);
    expect(s).toMatch(/ids\.has\("gider"\) && ids\.has\("finance"\)/);
  });
  it("R3 / X5: istemcide ve sunucuda sekme listesinde 'kasa'nın yokluğuna bakan bir kural yazılmadı", () => {
    for (const f of [...dosyalar("src"), ...dosyalar("electron")]) {
      const s = kod(f);
      expect(s, f).not.toMatch(/!\s*[\w.?]*tabs\??\.includes\(\s*"kasa"\s*\)/);
      expect(s, f).not.toMatch(/!\s*allowed\??\.includes\(\s*"kasa"\s*\)/);
    }
  });
  it("DoD: Kasa görünürlüğü ekranlarda yeniden yazılmadı; App kasaYetki'yi görünür listeden türetir", () => {
    const app = kod("src/App.jsx");
    expect(app).toMatch(/const kasaYetki = useMemo\(\(\) => giderYetki && visibleTabs\.some\(t => t\.id === "kasa"\)/);
    for (const f of dosyalar("src/components")) expect(kod(f), f).not.toMatch(/tabs\??\.includes\(\s*"kasa"\s*\)/);
  });
  it("AC-16: bakiye, tutar ve kayıt motorları izin ya da sekme okumaz", () => {
    for (const f of ["src/lib/kasa.js", "src/lib/gider.js", "src/lib/cek.js", "src/lib/formOdemesi.js"]) {
      const s = kod(f);
      expect(s, f).not.toMatch(/permissions|gorunurSekmeler|visibleTabs/);
    }
  });
});
