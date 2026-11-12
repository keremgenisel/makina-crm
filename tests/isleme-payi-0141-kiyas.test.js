// Spec 0141 C1 (AC-40, AC-27, AC-62): payı olmayan veride maliyet zinciri, satış fiyatı, Model Maliyetleri, Parti Hesabı, Excel dışa
// ve içe aktarma, zam etki önizlemesi, sipariş ihtiyacı (opt-in ve düzenleme girdili öneri yolu dahil) ve yazdırılan sipariş
// raporu spec öncesi kodla birebir. Altın `tests/fixtures/0141-once.json` spec ÖNCESİ koddan `YAZ_0141=1` ile üretildi; veri
// `tests/fixtures/0141-veri.js` (`0139-veri.js`'in paysız kopyası ve bir set). Fark yalnız sipariş parça satırının `pay`
// anahtarıdır (C8), `0141-ayikla.js` ile iki taraftan ayıklanır. Çıktıda bugünün tarihi yoktur.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { malzemeOzeti, malzemeKatalogu, fiyatEtkisi } from "../src/lib/malzeme";
import { parcaMaliyetKurus, setKatalogu } from "../src/lib/urunAgaci";
import { parcaDisaAktarmaSatiri, parcaSatirlariniCoz } from "../src/lib/parcaAktarma";
import { parcaSatisFiyati, fiyatBaglamiKur } from "../src/lib/parcaFiyati";
import { modelMaliyetleri, partiHesabi } from "../src/lib/makinaStandartMaliyet";
import { siparisIhtiyaci } from "../src/lib/siparisIhtiyaci";
import { siparisRaporuHtml } from "../src/lib/siparisRaporu";
import { ayikla0139 } from "./fixtures/0139-ayikla.js";
import { ayikla0141 } from "./fixtures/0141-ayikla.js";
import { ayikla0142 } from "./fixtures/0142-ayikla.js"; // spec 0142 ile: parça satırının `olculer` alanı ve tedarikçi bölümlerinin `belge` alanı
import { ayikla0143 } from "./fixtures/0143-ayikla.js"; // spec 0143 ile (C2/3): kalkan ve adı değişen alanlar normalleşir, sayılar dokunulmaz
import { MALZEMELER, TABLOLU_MALZEMELER, PARCALAR, MODELLER, TARIHLER } from "./fixtures/0141-veri";
const ayikla0142v0143 = (x) => ayikla0143(ayikla0142(x));
// 0139-veri'nin fiyat ayarı anahtarı (`karKati`) motorun okuduğu ad değil; kıyas fiyatı gerçekten türetsin diye doğru ad.
const FIYAT_AYARLARI = { varsayilanKat: 2.77 };

const DOSYA = "tests/fixtures/0141-once.json";
const TED = [{ id: 12, ad: "Ana Çelik", hammadde: true }, { id: 13, ad: "Beta Metal", hammadde: true }];
// Tedarikçi bölümleri dolsun diye: iki malzemenin ve bir hazır parçanın Ana tedarikçisi.
const MALZ = MALZEMELER.map(m => (m.id === 501 ? { ...m, tedarikciId: 12 } : m.id === 502 ? { ...m, tedarikciId: 13 } : m));
const PARC = PARCALAR.map(p => (p.id === 9 ? { ...p, tedarikciId: 13 } : p));
const veri = (malzemeler) => ({ modeller: MODELLER.standardModels, satirlar: [{ model: "AK100_DS", adet: "70" }], parts: PARC, partStock: [{ id: 1, partId: 9, miktar: 5 }], malzemeler, tedarikciler: TED });
const ciktilar = () => {
  const mk = malzemeKatalogu(MALZ);
  const kat = setKatalogu(PARC);
  const baglam = fiyatBaglamiKur({ parts: PARC, malzemeler: MALZ, fiyatAyarlari: FIYAT_AYARLARI });
  const parti = { id: 1, ad: "P1", baslangicAy: "2026-01", bitisAy: null, planlananAdetler: { AK100_DS: 10 } };
  const mm = modelMaliyetleri({ ...MODELLER, parts: PARC, malzemeler: MALZ }, 12345);
  const stock = [{ id: 71, model: "AK100_DS", seriNo: "S1", tarih: "2026-02-10", partiId: 1 }];
  const odakli = siparisIhtiyaci(veri(MALZ), { tedarikciOdakli: true });
  const kesit = odakli.kesitler[0]?.anahtar;
  const duzen = siparisIhtiyaci(veri(MALZ), { tedarikciOdakli: true, duzenleme: { parca: { 10: { adet: "20" }, 2: { kapali: true } }, kesit: kesit ? { [kesit]: { deger: "50" } } : {} } });
  const satirlar = [["Ad", "", "", "", "", "", "", "", "", "Maliyet"], ...PARC.map(p => [p.ad, "", p.kod ?? "", "", "", "", "", "", "", 1])];
  const zamli = { ...MALZ[0], kiloFiyati: 3.6 };
  return JSON.parse(JSON.stringify({
    ozet: PARC.flatMap(p => (p.maliyetKalemleri || []).filter(k => k.tur === "malzeme").map(k => malzemeOzeti(k, mk))),
    maliyet: PARC.map(p => TARIHLER.map(t => parcaMaliyetKurus(p, t, kat, mk))),
    fiyat: PARC.map(p => parcaSatisFiyati(p, "TRY", baglam)),
    disa: PARC.map(p => parcaDisaAktarmaSatiri(p, kat, mk, FIYAT_AYARLARI)),
    iceAktarma: parcaSatirlariniCoz(satirlar, PARC, 900000, "2026-06-15", MALZ, FIYAT_AYARLARI),
    modeller: mm,
    parti: partiHesabi(parti, { stock, customers: [] }, { payK: 1000, modeller: mm, bugun: "2026-11-09", katalog: { ...MODELLER, parts: PARC, malzemeler: MALZ } }),
    etki: fiyatEtkisi(MALZ[0], zamli, PARC, MALZ, { fiyatAyarlari: FIYAT_AYARLARI }),
    siparis: siparisIhtiyaci(veri(MALZ)),
    siparisTablolu: siparisIhtiyaci(veri(TABLOLU_MALZEMELER)),
    siparisOdakli: odakli,
    siparisDuzen: duzen,
    rapor: siparisRaporuHtml(odakli, { bugun: "2026-11-10", factory: { name: "Altuntaş Makina", city: "Konya" }, partiAd: "Güz", paraGoster: true }),
    raporYetkisiz: siparisRaporuHtml(odakli, { bugun: "2026-11-10", factory: { name: "Altuntaş Makina" }, partiAd: null, paraGoster: false }),
  }));
};
// Spec 0142 ile: belge baştan yazıldı (C6: belge HTML'i kıyasa girmez, kendi kriterleriyle ölçülür); iki rapor alanı ve motorun iki
// yeni alanı karşılaştırmadan önce ayıklanır. Altın dosyası değişmedi (AC-41'in özeti aynı).
const ayikla = (x) => { const y = ayikla0142v0143(ayikla0141(ayikla0139(x))); delete y.rapor; delete y.raporYetkisiz; return y; };

describe("Spec 0141 kıyas (C1)", () => {
  it("AC-40 / AC-27: payı olmayan veride bütün çıktılar ve yazdırılan sipariş raporu spec öncesi altınla birebir", () => {
    const s = ciktilar();
    if (process.env.YAZ_0141 === "1") { fs.writeFileSync(DOSYA, JSON.stringify(s, null, 1) + "\n"); return; }
    expect(ayikla(s)).toEqual(ayikla(JSON.parse(fs.readFileSync(DOSYA, "utf8"))));
  });
  it("AC-62: kıyas boş geçmez (sipariş, kesit, tedarikçi bölümü, maliyet, fiyat, etki ve rapor satırı üretir)", () => {
    const a = JSON.parse(fs.readFileSync(DOSYA, "utf8"));
    expect(a.siparis.parcalar.length).toBeGreaterThan(5);
    expect(a.siparis.kesitler.length).toBeGreaterThan(2);
    expect(a.siparis.parcalar.some(p => p.patlatildi)).toBe(true); // setten patlatma yolu
    expect(a.siparisOdakli.tedarikciBolumleri.bolumler.length).toBe(2);
    expect(a.siparisDuzen.tedarikciBolumleri.duzen.duzenlenen).toBeGreaterThan(0);
    expect(a.maliyet.flat().filter(x => x != null).length).toBeGreaterThan(10);
    expect(a.fiyat.some(f => f.deger !== "")).toBe(true);
    expect(a.etki.satirlar?.length ?? a.etki.parcalar?.length ?? 0).toBeGreaterThan(0);
    expect(a.rapor).toContain("Ana Çelik");
  });
});

// Triyaj (bulgu 3), AC-41: altınların kaderi dosya dosya, özetle sabit. 0133 spec öncesi main'deki baytlarla aynı (dokunulmadı);
// 0135, 0138, 0139 ve 0140 hazırlık adımında (kaldırmadan ÖNCE) eski kodla yeniden üretildi ve kaldırmadan sonra değişmedi; 0141 yeni.
// Spec 0143 ile (C2/3, AC-34): beş altın (0135, 0138, 0139, 0140, 0141) 0143'ün hazırlık adımında (geldiği boy ve boy fiyatı
// fikstürden kalktı, boy kalemi kiloya çevrildi) yine KALDIRMADAN ÖNCE eski kodla yenilendi; özetler o hâli sabitler.
// Özet değişirse altın yeniden yazılmış demektir: kaldırma sonrası koddan üretilmiş altın "davranış değişmedi" iddiasını boşa düşürür.
describe("Spec 0141 AC-41: altınların kaderi", () => {
  const ozet = (f) => createHash("sha256").update(fs.readFileSync(`tests/fixtures/${f}-once.json`)).digest("hex");
  it("AC-41: 0133 bayt bayt spec öncesiyle aynı; dört altın hazırlık adımında yenilendi ve sonra değişmedi; 0141 yeni altın", () => {
    expect(ozet("0133")).toBe("07957f06ef18fde9575e3d23cb8c94dfac64dc4f75cc76bcb502ee4f26de9660"); // main 74200ea6 ile aynı
    expect({ "0135": ozet("0135"), "0138": ozet("0138"), "0139": ozet("0139"), "0140": ozet("0140"), "0141": ozet("0141") }).toEqual({
      "0135": "b08198c7bf7b6248ad7e1ea24b77592b8195d00e5a291c05ad4a56b3429e5647",
      "0138": "b2a2ae7bf6450e4c83daed10deb23592b89644d3bfecaa8989c7c0e443037512",
      "0139": "b0b2995b45b8a1e0df3aa3101f01bc3b7d004702b8796313eae895a5f256269a",
      "0140": "aabc19089dd7dd71a18c3b61d6f6366a180b3b0e95145218968b196cc646238d",
      "0141": "6d8f548c7fa823ad16b3c5b7495ed010fb8edb00b500d96d090c60b93dc4fa62",
    });
  });
  it("AC-41: yenilenen dört altında emniyet payı izi yok (eski kodla, paysız fikstürle üretildi: hiçbir satırda sıfırdan büyük pay)", () => {
    for (const f of ["0135", "0138", "0139", "0140"]) {
      const metin = fs.readFileSync(`tests/fixtures/${f}-once.json`, "utf8");
      expect(metin, f).not.toMatch(/"pay": [1-9]/);
    }
  });
});

