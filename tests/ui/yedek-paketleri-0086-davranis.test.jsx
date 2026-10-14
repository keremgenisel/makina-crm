// @vitest-environment jsdom
// Spec 0086 AC-18 (C1, R7): geri yükleme davranışı birebir aynı. Bu iş yalnız paketlerin ne geri yüklediğini doğru
// anlatır; hangi paketin hangi setter'ı hangi değerle çağırdığı değişmemelidir. Fikstür `tests/fixtures/0086-geri-yukleme-once.json`
// bu spec'ten ÖNCEKİ kodla üretildi (`IZ_YAZ=1 npx vitest run tests/ui/yedek-paketleri-0086-davranis.test.jsx`, taban 9b4de51).
// Senaryolar: her paket tek başına ve hepsi birlikte, Kasa'lı ve Kasa'sız; tahsilatsız ama çekli yedek (AC-7); hareket bölümü
// olmayan eski yedek (göç); perde inik + izinli kullanıcı; gider izni olmayan kullanıcı. İşlevsel güncelleyiciler sabit bugünkü
// değere uygulanıp sonucu kaydedilir; e-posta köprüsü çağrıları ve bildirim metni de iz'e girer.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, screen, cleanup, waitFor, within } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";

// uid() rastgele: göç hareketlerinin kimliği sabit sayaçtan gelsin (karşılaştırma kimlik değerine bakmasın diye).
vi.mock("../../src/lib/utils", async (orijinal) => {
  const m = await orijinal();
  let n = 0;
  return { ...m, uid: () => 900000 + (++n), __sifirla: () => { n = 0; } };
});
import * as utils from "../../src/lib/utils";
import { SettingsBackup } from "../../src/components/settings/SettingsBackup";

const FIKSTUR = path.resolve(__dirname, "../fixtures/0086-geri-yukleme-once.json");
afterEach(() => { cleanup(); delete window.crmStorage; delete window.appMail; });

const H = (id, tur, o = {}) => ({ id, tur, tarih: "2026-09-10", tutar: 100, hesapId: 51, ...o });
const BUGUN = {
  customers: [{ id: 1, name: "Bugün Müşteri", kalanBorc: 0 }], services: [{ id: 2 }], partSales: [{ id: 3 }], payments: [{ id: 4, tutar: 10 }],
  gorusmeler: [{ id: 5 }], teklifler: [{ id: 6 }], faturalar: [{ id: 7 }], stock: [{ id: 8 }], partStock: [{ id: 9 }], partStockLog: [{ id: 10 }],
  uretimFormlari: [{ id: 11 }], yedekParcaSatislar: [{ id: 12 }], dealers: [{ id: 13 }], dosyalar: [{ id: 14 }], kalipDefs: [{ id: 15, ad: "K" }],
  partTypeDefs: [{ id: 16, ad: "T" }], calisanlar: [{ id: 17, ad: "Ç" }], customModels: [{ ad: "Özel" }], standardModels: ["AK100"], parts: [{ id: 18 }],
  notes: [{ id: 19 }], giderTurleri: [{ id: 20 }], tedarikciler: [{ id: 21 }], giderTanimlari: [{ id: 22 }], giderler: [{ id: 23 }],
  uretimPartileri: [{ id: 24 }], kasaHesaplari: [{ id: 51, ad: "Ziraat" }], kasaKapsamDisi: [{ id: 25 }],
  hesapHareketleri: [H(26, "odeme", { giderId: 23 }), H(27, "virman", { karsiHesapId: 52 }), H(28, "avans", { calisanId: 17 })],
  cekler: [{ id: 30, yon: "verilen", durum: "odendi", tutar: 500, hesapId: 51 }, { id: 31, paymentId: null, durum: "portfoy" }, { id: 32, paymentId: 4, durum: "portfoy" }],
  factory: { name: "Bugün Firma" }, appSettings: { kdv: 20, backupFolder: "C:\\Bugun", autoBackup: true },
};
const YEDEK_TAM = {
  app: "altunmak-crm", schemaVersion: 3, exportDate: "2026-09-20",
  customers: [{ id: 101, name: "Yedek Müşteri", kalanBorc: "1.234,4" }], services: [{ id: 102 }], partSales: [{ id: 103 }], payments: [{ id: 104, tutar: 20 }],
  gorusmeler: [{ id: 105 }], teklifler: [{ id: 106 }], faturalar: [{ id: 107 }], stock: [{ id: 108 }], partStock: [{ id: 109 }], partStockLog: [{ id: 110 }],
  uretimFormlari: [{ id: 111 }], yedekParcaSatislar: [{ id: 112 }], dealers: [{ id: 113 }], dosyalar: [{ id: 114 }], kalipDefs: [{ id: 115, ad: "YK" }],
  partTypeDefs: [{ id: 116, ad: "YT" }], calisanlar: [{ id: 117, ad: "YÇ" }], customModels: [{ ad: "Yedek Özel" }], standardModels: ["AK100", "AK200"], parts: [{ id: 118 }],
  notes: [{ id: 119 }], giderTurleri: [{ id: 120 }], tedarikciler: [{ id: 121 }], giderTanimlari: [{ id: 122 }], giderler: [{ id: 123, odendi: true, tutar: 50, tarih: "2026-09-01" }],
  uretimPartileri: [{ id: 124 }], kasaHesaplari: [{ id: 60, ad: "Eski Banka" }], kasaKapsamDisi: [{ id: 125 }],
  hesapHareketleri: [H(126, "odeme", { giderId: 123 }), H(127, "virman", { karsiHesapId: 60 }), H(128, "mahsup", { calisanId: 117, hesapId: null })],
  cekler: [{ id: 140, yon: "verilen", durum: "yazildi", hesapId: 60 }, { id: 141, paymentId: null, durum: "portfoy" }, { id: 142, paymentId: 104, durum: "tahsil" }],
  factory: { name: "Yedek Firma" }, appSettings: { kdv: 18, backupFolder: "D:\\Yedek", autoBackup: false, giderAyarlari: { yururlukAy: "2026-01" } },
  mailConfig: { host: "smtp.ornek" }, mailLog: [{ id: 1 }],
};
const { payments: _p, ...YEDEK_TAHSILATSIZ } = YEDEK_TAM;
const { hesapHareketleri: _h, ...YEDEK_ESKI } = YEDEK_TAM;

const SETTERLAR = ["setCustomers", "setServices", "setPartSales", "setPayments", "setCekler", "setGorusmeler", "setTeklifler", "setFaturalar", "setStock",
  "setPartStock", "setPartStockLog", "setUretimFormlari", "setYedekParcaSatislar", "setDealers", "setDosyalar", "setKalipDefs", "setPartTypeDefs", "setCalisanlar",
  "setCustomModels", "setStandardModels", "setParts", "setNotes", "setGiderTurleri", "setTedarikciler", "setGiderTanimlari", "setGiderler", "setUretimPartileri",
  "setKasaHesaplari", "setKasaKapsamDisi", "setHesapHareketleri", "setFactory", "setAppSettings"];
const BUGUN_DEGERI = { setCustomers: "customers", setDosyalar: "dosyalar" };
const bugunOf = (setter) => BUGUN[BUGUN_DEGERI[setter] || (setter[3].toLowerCase() + setter.slice(4))];

async function iz({ yedek, paketler, kasaVeriYetki = true, giderYetki = true, giderVeriYetki = giderYetki }) {
  utils.__sifirla();
  const kayit = [];
  const setterlar = Object.fromEntries(SETTERLAR.map(s => [s, vi.fn((v) => { kayit.push([s, typeof v === "function" ? { guncelleyici: v(structuredClone(bugunOf(s))) } : { deger: v }]); })]));
  const flash = vi.fn();
  const mail = [];
  window.appMail = { getConfigForBackup: async () => null, getAllLog: async () => [],
    restoreConfigFromBackup: async (c) => { mail.push(["restoreConfigFromBackup", c]); }, restoreFullLog: async (l) => { mail.push(["restoreFullLog", l]); } };
  window.crmStorage = { restore: async () => structuredClone(yedek), autoBackupPasswordStatus: async () => ({ set: false, canEncrypt: true }) };
  render(<SettingsBackup {...BUGUN} rawDosyalar={BUGUN.dosyalar} {...setterlar} version="1.0.0" flash={flash}
    kasaVeriYetki={kasaVeriYetki} giderYetki={giderYetki} giderVeriYetki={giderVeriYetki} />);
  fireEvent.click(screen.getByRole("button", { name: /Yedekten Geri Yükle/ }));
  await screen.findByText(/Geri yüklenecek bölümler/);
  if (paketler !== "hepsi") {
    // Yalnız paket kutusundaki onay kutuları (sayfadaki "Otomatik Yedekleme" kutusu dışarıda).
    const kutular = within(screen.getByText(/Geri yüklenecek bölümler/).parentElement.parentElement).getAllByRole("checkbox");
    for (const k of kutular) {
      const ad = within(k.closest("label")).getAllByText(/./)[0].textContent;
      if (!paketler.includes(ad)) fireEvent.click(k);
    }
  }
  fireEvent.click(screen.getByRole("button", { name: /Evet, Geri Yükle/ }));
  await waitFor(() => expect(flash).toHaveBeenCalled());
  return { setterlar: kayit, mail, bildirim: flash.mock.calls.map(c => c.slice(0, 2)) };
}

const PAKETLER = ["Müşteri verileri", "Evraklar", "Stok ve üretim", "Bayiler", "Dosyalar", "Tanımlar", "Notlar", "Giderler", "Firma ve ayarlar"];
const SENARYOLAR = [
  ...[true, false].flatMap(kasa => [...PAKETLER.map(p => ({ ad: `${p} tek, Kasa ${kasa ? "var" : "yok"}`, yedek: YEDEK_TAM, paketler: [p], kasaVeriYetki: kasa })),
    { ad: `hepsi, Kasa ${kasa ? "var" : "yok"}`, yedek: YEDEK_TAM, paketler: "hepsi", kasaVeriYetki: kasa }]),
  { ad: "AC-7 tahsilatsız çekli yedek, yalnız Müşteri", yedek: YEDEK_TAHSILATSIZ, paketler: ["Müşteri verileri"] },
  { ad: "AC-7 tahsilatsız çekli yedek, Müşteri + Giderler", yedek: YEDEK_TAHSILATSIZ, paketler: ["Müşteri verileri", "Giderler"] },
  { ad: "hareketsiz eski yedek, yalnız Giderler (göç)", yedek: YEDEK_ESKI, paketler: ["Giderler"] },
  { ad: "hareketsiz eski yedek, Giderler, Kasa yok", yedek: YEDEK_ESKI, paketler: ["Giderler"], kasaVeriYetki: false },
  { ad: "perde inik + izinli, hepsi", yedek: YEDEK_TAM, paketler: "hepsi", giderYetki: false, giderVeriYetki: true },
  { ad: "perde inik + izinli, kısmi (Müşteri)", yedek: YEDEK_TAM, paketler: ["Müşteri verileri"], giderYetki: false, giderVeriYetki: true },
  { ad: "gider izni yok, hepsi", yedek: YEDEK_TAM, paketler: "hepsi", giderYetki: false, giderVeriYetki: false },
];

describe("Spec 0086 AC-18: geri yükleme davranışı spec öncesiyle birebir aynı", () => {
  it("bütün senaryolarda setter çağrıları, e-posta köprüsü ve bildirim fikstürle aynı", async () => {
    const sonuc = {};
    for (const s of SENARYOLAR) sonuc[s.ad] = await iz(s).finally(() => cleanup());
    if (process.env.IZ_YAZ) fs.writeFileSync(FIKSTUR, JSON.stringify(sonuc, null, 1) + "\n");
    const once = JSON.parse(fs.readFileSync(FIKSTUR, "utf8"));
    expect(Object.keys(sonuc)).toEqual(Object.keys(once));
    for (const ad of Object.keys(once)) expect(JSON.parse(JSON.stringify(sonuc[ad])), ad).toEqual(once[ad]);
  }, 60000);
});
