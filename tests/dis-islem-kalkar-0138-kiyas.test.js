// Spec 0138 C1, C1/2, AC-5, AC-13–AC-16: katalog bağlı işlem kalemi OLMAYAN veride bütün çıktılar spec öncesi kodla birebir
// aynıdır. Altın `tests/fixtures/0138-once.json` spec öncesi koddan (main 619f6275) `YAZ_0138=1` ile üretildi; burada yalnız
// karşılaştırılır. Çıktıda bugünün tarihi yoktur (içe aktarma kimliği ve günü sabit).
//
// Kapsam (C1/2, plan Karar 34/B8): maliyet zinciri (bugün ve üç tarih), maliyet var mı, kaynak ibaresi, satış fiyatı, set özeti,
// maliyet geçmişi listesi ve kararı, kayıt fonksiyonunun geçmiş adımı (AC-15, dokunulmamış düzenleme), Model Maliyetleri, Parti
// Hesabı, Excel dışa ve içe aktarma (AC-14), malzeme zammı etki önizlemesi seçenekli ve seçeneksiz (AC-5), sipariş ihtiyacı.
// Sipariş ihtiyacı motoru dış işlemi hiç okumaz; aylık rapor ve Finans Özeti parçanın alış maliyetini hiç okumaz (AC-16). Bu üç
// yarı YAPISAL olarak bu işten etkilenmez; kıyas onlarda yalnız gerileme bekçisidir ve veri boş geçmesin diye satır üretir.
import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { ayikla0139 } from "./fixtures/0139-ayikla.js"; // spec 0139 ile: uyarı metni ve yeni ekFireKg alanı
import { ayikla0141 } from "./fixtures/0141-ayikla.js"; // spec 0141 ile: sipariş satırının `pay` anahtarı ve kayıt gövdesinin katlaması
import { parcaMaliyetKurus, parcaMaliyetiVar, setKatalogu, setOzeti, maliyetKaynagi, kalemKaynakMetni, maliyetGecmisiSatirlari, maliyetGecmisiYaz, gecmisliKayit } from "../src/lib/urunAgaci";
import { malzemeKatalogu, fiyatEtkisi } from "../src/lib/malzeme";
import { siparisIhtiyaci } from "../src/lib/siparisIhtiyaci";
import { modelMaliyetleri, partiGenelPaylari, partiHesabi } from "../src/lib/makinaStandartMaliyet";
import { parcaSatisFiyati, fiyatBaglamiKur } from "../src/lib/parcaFiyati";
import { parcaDisaAktarmaSatiri, parcaSatirlariniCoz } from "../src/lib/parcaAktarma";
import { hesaplaAylikRapor } from "../src/lib/aylikRapor";
import { finansOzetiHesapla, finansOzetiSatirlari } from "../src/components/settings/SettingsExport";
import { PARCALAR, MALZEMELER, TEDARIKCILER, MODELLER, PART_STOCK, FIYAT_AYARLARI, M304, RAPOR_VERI, RAPOR_AYI } from "./fixtures/0138-veri.js";
import * as V36 from "./fixtures/0136-veri.js";

const ALTIN = "tests/fixtures/0138-once.json";
const TARIHLER = [undefined, "2026-01-15", "2026-04-15", "2026-06-15"];
const uret = () => {
  const katalog = setKatalogu(PARCALAR); const mk = malzemeKatalogu(MALZEMELER);
  const baglam = fiyatBaglamiKur({ parts: PARCALAR, malzemeler: MALZEMELER, fiyatAyarlari: FIYAT_AYARLARI });
  const zamli = { ...M304, kiloFiyati: 3.4, boyFiyati: 900 };
  const sip = siparisIhtiyaci({ modeller: [...MODELLER.standardModels], satirlar: [{ model: "AK100", adet: "10" }], parts: PARCALAR, partStock: PART_STOCK, malzemeler: MALZEMELER, tedarikciler: TEDARIKCILER });
  const pkat = { parts: PARCALAR, malzemeler: MALZEMELER, standardModels: MODELLER.standardModels, customModels: V36.OZEL };
  const v = V36.veri({ parts: PARCALAR, malzemeler: MALZEMELER });
  const pay = partiGenelPaylari(v, V36.BUGUN);
  const modeller = modelMaliyetleri({ ...pkat }, 65000);
  const satirlar = [["Ad", "", "", "", "", "", "", "", "", "Maliyet"], ...PARCALAR.map(p => [p.ad, "", p.kod, "", "", "", "", "", "", 1])];
  const p81 = PARCALAR.find(p => p.id === 81);
  const finans = finansOzetiHesapla({ customers: RAPOR_VERI.customers, services: RAPOR_VERI.services, partSales: RAPOR_VERI.partSales });
  return {
    zincir: PARCALAR.map(p => ({ id: p.id, k: TARIHLER.map(t => parcaMaliyetKurus(p, t, katalog, mk)), var: parcaMaliyetiVar(p, undefined, katalog, mk), listesiz: parcaMaliyetKurus(p) })),
    fiyat: PARCALAR.map(p => ({ id: p.id, f: parcaSatisFiyati(p, "TRY", baglam), usd: parcaSatisFiyati(p, "USD", baglam) })),
    excel: PARCALAR.map(p => parcaDisaAktarmaSatiri(p, katalog, mk, FIYAT_AYARLARI)),
    iceAktarma: parcaSatirlariniCoz(satirlar, PARCALAR, 900000, "2026-06-15", MALZEMELER, FIYAT_AYARLARI),
    model: modelMaliyetleri({ ...MODELLER, parts: PARCALAR, malzemeler: MALZEMELER }, 5000),
    parti: V36.PARTILER.map(p => partiHesabi(p, v, { payK: 65000, modeller, bugun: V36.BUGUN, katalog: pkat, partiPay: pay.partiler.find(x => x.id === p.id) })),
    siparis: { parcalar: sip.parcalar, kesitler: sip.kesitler, malzemeGruplari: sip.malzemeGruplari, eksik: sip.eksik, hazirSayi: sip.hazirSayi, toplamTLK: sip.toplamTLK },
    etki: fiyatEtkisi(M304, zamli, PARCALAR, MALZEMELER, { fiyatAyarlari: FIYAT_AYARLARI }),
    etkiSecenekiz: fiyatEtkisi(M304, zamli, PARCALAR, MALZEMELER),
    set: setOzeti(PARCALAR.find(p => p.id === 85).setIcerigi, katalog, "2026-02-01", mk),
    gecmisListesi: PARCALAR.map(p => maliyetGecmisiSatirlari(p, mk)),
    gecmisKarari: maliyetGecmisiYaz(p81, 5000, { tarih: "2026-06-10", bugun: "2026-06-15" }),
    kayitGovdesi: PARCALAR.map(p => gecmisliKayit({ ...p }, p, { tarih: "", bugun: "2026-06-15", katalog, malzemeKat: mk })),
    kaynak: PARCALAR.map(p => { const k = maliyetKaynagi(p, undefined, katalog, mk); return k?.tur === "kalem" ? kalemKaynakMetni(k) : k; }),
    rapor: (({ olusturmaTarihi: _o, ...r }) => r)(hesaplaAylikRapor(RAPOR_VERI, RAPOR_AYI)), // bugünün tarihi altına girmez (0127 dersi)
    finansOzeti: finansOzetiSatirlari(finans, RAPOR_VERI.services, "01.06.2026"),
  };
};
const temiz = (x) => JSON.parse(JSON.stringify(x));

describe("Spec 0138 kıyas (C1, C1/2)", () => {
  it("AC-13 / AC-14 / AC-15 / AC-16 / AC-5: katalog bağlı işlem kalemi olmayan veride bütün çıktılar spec öncesi altınla birebir aynıdır", () => {
    const sonuc = temiz(uret());
    if (process.env.YAZ_0138 === "1") { writeFileSync(ALTIN, JSON.stringify(sonuc, null, 1)); return; }
    expect(ayikla0141(ayikla0139(sonuc))).toEqual(ayikla0141(ayikla0139(JSON.parse(readFileSync(ALTIN, "utf8"))))); // spec 0139 ve 0141 ile ayıklandı (C2/3)
  });
  it("C1/2: kıyas boş geçmez (sipariş satırı, rapor satırı, Finans Özeti satırı ve etki satırı üretir)", () => {
    const a = JSON.parse(readFileSync(ALTIN, "utf8"));
    expect(a.siparis.kesitler.length + a.siparis.parcalar.length).toBeGreaterThan(0);
    expect(a.etki.satirlar?.length ?? a.etki.parcalar?.length ?? Object.keys(a.etki).length).toBeGreaterThan(0);
    expect(JSON.stringify(a.rapor)).toMatch(/Örnek Gıda/);
    expect(a.finansOzeti.length).toBeGreaterThan(0);
    expect(a.kayitGovdesi.every(Boolean)).toBe(true);
  });
});
