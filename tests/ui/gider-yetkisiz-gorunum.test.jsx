// @vitest-environment jsdom
// Spec 0001 AC-48 / AC-74 / AC-94: gider yetkisi olmayan kullanıcıya tedarikçi listesi, tedarikçi
// kırılımı ve açık borç rakamları (AC-48), "kime ne kadar borçluyuz" özeti (AC-74) ve aylık standart
// genel gider listesi (AC-94) görünmez. Bunların tek ekranı Giderler sekmesidir; sekme yetkisize kapalı
// (C6 kural 3), Ayarlar'da da hiçbir bölüm bu verileri çizmez. Pozitif kontrol aynı verinin yetkili
// ekranda gerçekten çizildiğini doğrular, yoksa olumsuz denetimler boşa geçerdi (triyaj bulgu 9).
import { describe, it, expect, vi, afterEach, beforeAll, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { Giderler } from "../../src/components/Giderler";
import { Settings } from "../../src/components/Settings";
import { gorunurSekmeler } from "../../src/lib/permissions";

beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-23T10:00:00")); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

const TURLER = [{ id: 4, ad: "Elektrik", davranis: "normal" }, { id: 3, ad: "Personel", davranis: "personel" }];
const TED = [{ id: 11, ad: "Zümrüt Tedarik A.Ş." }];
const STD = [{ id: 31, grupId: 31, ad: "Çatı Standart Kirası", tutar: 45678, baslangicAy: "2026-01", bitisAy: null }];
const GIDER = [{ id: 1, tarih: "2026-09-10", turId: 4, tutar: 10000, kdvOrani: 20, odendi: false, tedarikciId: 11 }];
const IZ = /Zümrüt Tedarik|Çatı Standart Kirası|45\.678|Kime Ne Kadar Borçluyuz|açık borç|Standart Genel Gider/i;

const giderlerCiz = () => render(<Giderler giderler={GIDER} setGiderler={vi.fn()} giderTanimlari={[]} setGiderTanimlari={vi.fn()}
  giderTurleri={TURLER} tedarikciler={TED} setTedarikciler={vi.fn()} standartGiderler={STD} setStandartGiderler={vi.fn()}
  calisanlar={[]} standardModels={[]} customModels={[]} appSettings={{ giderAyarlari: { yururlukAy: "2026-06" } }} serverPermissions={null}
  satisVerisi={{ customers: [], services: [], partSales: [], payments: [], teklifler: [], dealers: [], yedekParcaSatislar: [] }} showToast={vi.fn()} />);

const ayarBase = {
  customers: [], services: [], dealers: [], stock: [], setStock: vi.fn(), setCustomers: vi.fn(), setServices: vi.fn(), setDealers: vi.fn(),
  version: "3.38.3", appSettings: { giderAyarlari: { yururlukAy: "2026-06" } }, setAppSettings: vi.fn(),
  customModels: [], setCustomModels: vi.fn(), standardModels: [], setStandardModels: vi.fn(), factory: { name: "Altuntaş" }, setFactory: vi.fn(),
  kalipDefs: [], setKalipDefs: vi.fn(), calisanlar: [{ id: 21, ad: "Hasan" }], setCalisanlar: vi.fn(), showToast: vi.fn(),
  giderYetki: false, giderler: GIDER, rawGiderler: GIDER, setGiderler: vi.fn(), giderTanimlari: [], setGiderTanimlari: vi.fn(),
  giderTurleri: TURLER, setGiderTurleri: vi.fn(), tedarikciler: TED, setTedarikciler: vi.fn(), standartGiderler: STD, setStandartGiderler: vi.fn(),
};
const TABS = [{ id: "dashboard" }, { id: "gider" }, { id: "settings" }];
const kullanici = (p) => ({ role: "user", permissions: p === undefined ? null : JSON.stringify(p) });

describe("AC-48 / AC-74 / AC-94: gider yetkisizine tedarikçi, borç özeti ve standart gider görünmez", () => {
  it("pozitif kontrol: yetkili Giderler ekranı aynı veriyi çizer (tedarikçi, açık borç, borç özeti, standart gider)", () => {
    giderlerCiz();
    expect(screen.getByText("Tedarikçilere açık borç (KDV dâhil)")).toBeTruthy();
    expect(screen.getByText("Kime Ne Kadar Borçluyuz")).toBeTruthy();
    expect(screen.getAllByText("Zümrüt Tedarik A.Ş.").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("Tedarikçiler"));
    expect(screen.getAllByText("Zümrüt Tedarik A.Ş.").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("Standart Genel Giderler"));
    expect(screen.getByText("Çatı Standart Kirası")).toBeTruthy();
  });

  it("AC-48 / AC-74 / AC-94: bu verilerin tek ekranı olan Giderler sekmesi yetkisize açılmaz", () => {
    for (const p of [kullanici(), kullanici({ tabs: ["dashboard", "settings"] }), kullanici({ customerActions: ["cust_add"] })]) {
      expect(gorunurSekmeler(TABS, "active", p).map(t => t.id)).not.toContain("gider");
    }
  });

  it.each(["app", "calisanlar", "gidertur", "gidertanim", "giderayar", "models", "trash"])(
    "AC-48 / AC-74 / AC-94: Ayarlar › %s bölümü gider yetkisizine tedarikçi, borç ve standart gider çizmez",
    (id) => {
      render(<Settings {...ayarBase} initialTab={id} onInitialTabConsumed={vi.fn()} />);
      expect(document.body.textContent).not.toMatch(IZ);
    });
});
