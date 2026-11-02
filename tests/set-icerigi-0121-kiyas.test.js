// Spec 0121 (AC-14 içeriksiz yarısı, AC-34; plan adım 1): içeriği olmayan parçalarda maliyet zinciri, dışa aktarma satırı ve
// model maliyeti; içeriği OLAN veride aylık rapor, Analiz ve Finans Özeti spec öncesi kodla birebir aynı. "Önce" dosyası spec
// 0121'den ÖNCEKİ kodla YAZ_0121=1 ile üretildi (tests/fixtures/0121-once.json; spec öncesi kod `setIcerigi` alanını hiç
// okumaz, bu yüzden içerikli parça girdide durabilir). Veri değişirse altın geçersizdir.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { parcaDisaAktarmaSatiri } from "../src/lib/parcaAktarma";
import { parcaMaliyetKurus, maliyetGirildiMi, parcaMaliyetMetni, maliyetKaynagi } from "../src/lib/urunAgaci";
import { modelMaliyetleri } from "../src/lib/makinaStandartMaliyet";
import { hesaplaAylikRapor } from "../src/lib/aylikRapor";
import { hesaplaAnaliz } from "../src/lib/analiz";
import { finansOzetiHesapla } from "../src/components/settings/SettingsExport";

const ONCE = "tests/fixtures/0121-once.json";
// İçeriksiz parçalar: elle, sıfır, girilmemiş, kırılımlı, tarihli geçmişli, çöpte.
const ICERIKSIZ = [
  { id: 1, ad: "Rulman", kod: "R1", tip: "Standart", fiyatTRY: "450", maliyet: 120.5 },
  { id: 2, ad: "Hediye vida", maliyet: 0 },
  { id: 3, ad: "Pul", maliyet: 7.5, maliyetGecmisi: [{ gecerli: "", kurus: 500 }, { gecerli: "2026-03-01", kurus: 750 }] },
  { id: 4, ad: "Maliyetsiz" },
  { id: 5, ad: "Dişli", maliyet: 99, hammaddeler: [{ tedarikciId: 7, tutar: 300 }, { tedarikciId: 8, tutar: 12.25 }] },
  { id: 6, ad: "Çöpte", maliyet: 99, deletedAt: "2026-10-01T10:00:00.000Z" },
];
// Spec sonrası içeriği olan parça (spec öncesi kod alanı okumaz; yalnız rapor/Analiz/Finans girdisinde kullanılır).
const SET = { id: 9, ad: "Rulman Seti", fiyatTRY: "3000", maliyet: 10, setIcerigi: [{ partId: 1, miktar: 2 }, { partId: 3, miktar: 4 }] };
const MODELLER = {
  standardModels: [{ model: "AK100", defaultParcalar: [{ partId: "1", miktar: 2 }, { partId: "2", miktar: 4 }, { partId: "3", miktar: 3 }, { partId: "4", miktar: 1 }, { partId: "6", miktar: 1 }],
    ekMaliyetler: [{ ad: "Büküm", tutar: 90 }], karKatsayisi: 1.4 }],
  customModels: [{ model: "OZEL", defaultParcalar: [{ partId: "5", miktar: 1 }, { partId: "99", miktar: 1 }] }],
  parts: ICERIKSIZ,
};
const kdvRates = [{ from: "2000-01-01", rate: 20 }];
const VERI = {
  customers: [
    { id: 1, name: "A", model: "AK100", serialNo: "S1", installDate: "2026-06-10", currency: "TRY", fabrikaSatisBedeli: 800000, faturali: "Faturalı Yurtiçi", kalanBorc: 100000, satisYapan: "Altuntaş Makina" },
  ],
  services: [
    { id: 10, customerId: 1, date: "2026-06-12", type: "Garanti Dışı", servisUcreti: 5000, currency: "TRY", islemFirma: "Altuntaş Makina", odendi: false, faturaTipi: "Faturalı Yurtiçi",
      repairPlace: "Yerinde Onarım", degisenParcalar: [{ partId: 9, ad: "Rulman Seti", miktar: 1 }, { partId: 1, ad: "Rulman", miktar: 2 }], parcaUcreti: 3900, parcaCurrency: "TRY" },
  ],
  partSales: [],
  payments: [{ id: 30, customerId: 1, tarih: "2026-06-08", tutar: 200000, currency: "TRY", yontem: "Nakit" }],
  teklifler: [],
  dealers: [{ id: 50, name: "Bayi" }],
  yedekParcaSatislar: [{ id: 60, aliciTipi: "bayi", dealerId: 50, partId: 9, miktar: 3, birimFiyat: 3000, currency: "TRY", tarih: "2026-06-15", odendi: false, faturaTipi: "Faturalı Yurtiçi" }],
};
const PARCALAR_HEPSI = [...ICERIKSIZ, SET];

const simdi = () => JSON.parse(JSON.stringify({
  zincir: ICERIKSIZ.map(p => ({ k: parcaMaliyetKurus(p), t: parcaMaliyetKurus(p, "2026-02-01"), v: maliyetGirildiMi(p), m: parcaMaliyetMetni(p), kay: maliyetKaynagi(p) })),
  disaAktarma: ICERIKSIZ.map(parcaDisaAktarmaSatiri),
  modeller: modelMaliyetleri(MODELLER, 12345),
  rapor: hesaplaAylikRapor(VERI, "2026-06", { factoryName: "Altuntaş Makina", kdvRates, factory: { name: "Altuntaş Makina" } }),
  analiz: hesaplaAnaliz({ ...VERI, parts: PARCALAR_HEPSI }, {}),
  finans: finansOzetiHesapla({ ...VERI, kdvRates }),
}));

describe("Spec 0121: içeriksiz parçada ve set içeren veride çıktılar spec öncesiyle aynı", () => {
  it("AC-14 / AC-34: maliyet zinciri, dışa aktarma, model maliyeti, aylık rapor, Analiz ve Finans Özeti birebir", () => {
    const s = simdi();
    if (process.env.YAZ_0121 === "1") { fs.writeFileSync(ONCE, JSON.stringify(s, null, 1)); return; }
    expect(s).toEqual(JSON.parse(fs.readFileSync(ONCE, "utf8")));
  });
});
