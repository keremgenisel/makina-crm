// Spec 0095: yedek parça satışında garanti içi ücretsiz verme. Saf motor (bedel, borç, tahsilat, kasa, aylık rapor, bayi silme
// onayı, son satışlar, dışa aktarma), kayıt kurucusu (ucretsizUygula, stok, tahsis), garanti durumu ve kaynak taramaları.
// Ekran kriterleri tests/ui/ucretsiz-yedek-parca-0095.test.jsx, eski kayıtların birebir aynılığı (AC-27) iki *-kiyas dosyasında.
import { describe, it, expect, afterEach, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import {
  yedekParcaBedeli, isYedekParcaBorcluMu, customerHasAnyDebt, UCRETSIZ_IBARESI, satisUcretsizMi, tahsilEdilecekKdv, today, yerelBugun,
} from "../src/lib/utils";
import { satisTahsilatKalemi, satisTahsilatKalemleri, tahsilatHesapDurumu, SATIS_KAYNAK, UCRETSIZ_HESAP_NEDENI } from "../src/lib/satisTahsilat";
import { hesaplaAylikRapor } from "../src/lib/aylikRapor";
import { buildAylikRaporHtml } from "../src/lib/printTemplates";
import { bayiBagliSayilar } from "../src/lib/bayiKaskad";
import { sonSatislar } from "../src/lib/dashboardStats";
import { hesapBakiyeleri, hesapKullanimi } from "../src/lib/kasa";
import { yedekParcaExportRow, YEDEK_PARCA_EXPORT_HEAD } from "../src/components/settings/SettingsExport";
import { ucretsizUygula, yedekParcaRec, yedekParcaGuncelle, yeniYedekParcaSatisCoklu, garantiDurumu } from "../src/lib/yedekParcaSatis";
import { BLOB_SECTIONS, EYLEM_IDLERI, AYAR_ALAN_SEKMELERI } from "../electron/serverAuth.cjs";
import { MERGE_KEYS } from "../src/lib/merge";

const KDV = [{ from: "2000-01-01", rate: 20 }];
const FAB = { name: "Altuntaş Makina" };
const DEALERS = [{ id: 71, name: "Ege Bayi", bayiMi: true }];
const MUSTERI = { id: 1001, name: "Anadolu Gıda", model: "AK100", serialNo: "S1", installDate: "2026-01-05", currency: "TRY", faturali: "Faturalı Yurtiçi", warrantyEnd: "2028-01-05" };
// Ücretsiz bir satış (form kurucusundan geçmiş hâli) ve aynı satışın ücretli ikizi.
const ucretsiz = (o = {}) => ({ id: 9001, aliciTipi: "musteri", musteriId: 1001, partId: "81", miktar: 3, birimFiyat: 500, currency: "TRY", faturaTipi: "", tarih: "2026-10-05",
  odendi: false, yontem: "", vadeTarihi: "", tahsilEdildi: false, taksitSayisi: null, kartKomisyonu: null, hesapId: null, tahsilatTarihi: null, tahsisler: [], ucretsizMi: true, ...o });
const ucretli = (o = {}) => ({ id: 9002, aliciTipi: "musteri", musteriId: 1001, partId: "81", miktar: 3, birimFiyat: 500, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-10-05",
  odendi: false, tahsisler: [], ...o });
const veri = (yp) => ({ customers: [MUSTERI], services: [], partSales: [], payments: [], teklifler: [], dealers: DEALERS, yedekParcaSatislar: yp });
const SEC = { factoryName: FAB.name, kdvRates: KDV, factory: FAB };

// ── Kurucu ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const FORM = { aliciTipi: "musteri", musteriId: 1001, partId: "81", miktar: "3", birimFiyat: "500", currency: "TRY", tarih: "2026-10-05", faturaTipi: "Faturalı Yurtiçi" };
describe("Spec 0095: kayıt kurucusu (R7/2, R12, R14/2, C4)", () => {
  it("AC-35: işaretli kayıtta sekiz alan temizlenir, tevkifat alanları yok; birim fiyat saklanır (R12) ve fatura tipi boş (R18c, AC-39)", () => {
    const { rec } = yedekParcaRec({ ...FORM, ucretsizMi: true, odendi: true, yontem: "Çek", vadeTarihi: "2026-12-01", tahsilEdildi: true, taksitSayisi: 3, hesapId: 61,
      tahsilatTarihi: "2026-10-05", tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10 });
    expect(rec.ucretsizMi).toBe(true);
    expect(rec.yontem).toBe("");
    expect(rec.vadeTarihi).toBe("");
    expect(rec.tahsilEdildi).toBe(false);
    expect(rec.taksitSayisi).toBeNull();
    expect(rec.kartKomisyonu).toBeNull();
    expect(rec.hesapId).toBeNull();
    expect(rec.odendi).toBe(false);
    expect(rec.tahsilatTarihi).toBeNull();
    for (const a of ["tevkifatli", "tevkifatPay", "tevkifatPayda"]) expect(a in rec, a).toBe(false);
    expect(rec.birimFiyat).toBe(500);
    expect(rec.faturaTipi).toBe("");
  });
  it("AC-26/2 + C4: işaretsiz kayıtta alan YOK (false değil); işaret kaldırılınca düzenleme kolu eski true'yu korumaz", () => {
    const { rec } = yedekParcaRec(FORM);
    expect("ucretsizMi" in rec).toBe(false);
    const eski = ucretsiz();
    const g = yedekParcaGuncelle(eski, yedekParcaRec({ ...FORM, ucretsizMi: false }).rec, { ...FORM, ucretsizMi: false });
    expect("ucretsizMi" in g).toBe(false);
    expect(ucretsizUygula({ a: 1, ucretsizMi: true }, {})).toEqual({ a: 1 });
  });
  it("AC-26: işaret kaldırılınca saklı birim fiyat geri gelir ve kayıt yeniden borç üretir", () => {
    const eski = ucretsiz();
    expect(isYedekParcaBorcluMu(eski)).toBe(false);
    const form = { ...eski, miktar: String(eski.miktar), ucretsizMi: false };
    const g = yedekParcaGuncelle(eski, yedekParcaRec(form).rec, form);
    expect(g.birimFiyat).toBe(500);
    expect(yedekParcaBedeli(g)).toBe(1500);
    expect(isYedekParcaBorcluMu(g)).toBe(true);
    // R18c notu (K4): fatura tipi geri gelmez, formun varsayılanı yazılır.
    expect(g.faturaTipi).toBe("Faturalı Yurtiçi");
  });
  it("AC-50: form durumunda Kredi Kartı + komisyon yansıtma ve bozuk tevkifat oranı kalmışsa da kayıt yapılır, birim fiyat girilenle aynı (R7/4)", () => {
    const KK = { bsmv: 5, satirlar: [{ taksit: 1, oran: 3.15, katkiPayi: 0.1, blokajGun: 0 }] };
    const ucretliHal = yedekParcaRec({ ...FORM, odendi: true, yontem: "Kredi Kartı", taksitSayisi: 1, kkYansit: true }, KK, KDV).rec;
    expect(ucretliHal.birimFiyat).not.toBe(500); // ücretli dalda matrah ölçeklenir (ölçümün anlamlı olduğunu gösterir)
    const r = yedekParcaRec({ ...FORM, ucretsizMi: true, odendi: true, yontem: "Kredi Kartı", taksitSayisi: 1, kkYansit: true, tevkifatli: true, tevkifatPay: "", tevkifatPayda: "" }, KK, KDV);
    expect(r.ok).toBe(true);
    expect(r.rec.birimFiyat).toBe(500);
    expect(r.rec.kartKomisyonu).toBeNull();
  });
});

// Basit durum deposu: kurucunun setter'larını gerçek dizilere uygular.
const depo = (partStock) => {
  const d = { yedekParcaSatislar: [], partStock, partStockLog: [] };
  const set = (k) => (f) => { d[k] = typeof f === "function" ? f(d[k]) : f; };
  return { d, deps: { setYedekParcaSatislar: set("yedekParcaSatislar"), setPartStock: set("partStock"), setPartStockLog: set("partStockLog"), partStock } };
};
describe("Spec 0095: stok, tahsis ve toplu satış (R8, R13)", () => {
  it("AC-19 / AC-21: ücretsiz satışta parça miktarı kadar stoktan düşer, hareket yazılır, alıcı müşteride otomatik tahsis yapılır", () => {
    const { d, deps } = depo([{ id: 1, partId: "81", miktar: 10 }]);
    const r = yeniYedekParcaSatisCoklu({ ...FORM, ucretsizMi: true, satirlar: [{ partId: "81", miktar: "3", birimFiyat: "" }] }, deps);
    expect(r.ok).toBe(true);
    expect(d.partStock[0].miktar).toBe(7);
    expect(d.partStockLog).toEqual([expect.objectContaining({ partId: "81", miktar: -3, tip: "bayi_satis" })]);
    expect(d.yedekParcaSatislar[0].tahsisler).toEqual([expect.objectContaining({ miktar: 3, customerId: 1001 })]);
    expect(d.yedekParcaSatislar[0].ucretsizMi).toBe(true);
  });
  it("AC-20: stok yetersizken yalnız mevcut kadarı düşer, satış tam miktarla kaydedilir", () => {
    const { d, deps } = depo([{ id: 1, partId: "81", miktar: 2 }]);
    yeniYedekParcaSatisCoklu({ ...FORM, ucretsizMi: true, satirlar: [{ partId: "81", miktar: "5", birimFiyat: "" }] }, deps);
    expect(d.partStock[0].miktar).toBe(0);
    expect(d.partStockLog[0].miktar).toBe(-2);
    expect(d.yedekParcaSatislar[0].miktar).toBe(5);
  });
  it("AC-25: çok satırlı eklemede işaret o kayıtta doğan bütün satırlara aynı yazılır", () => {
    const { d, deps } = depo([{ id: 1, partId: "81", miktar: 10 }, { id: 2, partId: "82", miktar: 10 }]);
    yeniYedekParcaSatisCoklu({ ...FORM, aliciTipi: "bayi", dealerId: 71, musteriId: "", ucretsizMi: true,
      satirlar: [{ partId: "81", miktar: "1", birimFiyat: "100" }, { partId: "82", miktar: "2", birimFiyat: "" }] }, deps);
    expect(d.yedekParcaSatislar).toHaveLength(2);
    expect(d.yedekParcaSatislar.every(s => s.ucretsizMi === true)).toBe(true);
    expect(new Set(d.yedekParcaSatislar.map(s => s.batchId)).size).toBe(1);
  });
});

// ── Bedel ve borç: ölçüm 2 tablosunun saf satırları (AC-9); bileşen satırları UI dosyasında ───────────────────────
describe("Spec 0095 AC-9: bedelin saf okuma yollarında ücretsiz kayıt sıfır", () => {
  it("AC-9 satır 1: utils.yedekParcaBedeli", () => {
    expect(yedekParcaBedeli(ucretsiz())).toBe(0);
    expect(yedekParcaBedeli(ucretli())).toBe(1500);
  });
  it("AC-9 satır 2: satisTahsilat (yedek dalı) kalem üretmez", () => {
    expect(satisTahsilatKalemi(SATIS_KAYNAK.YEDEK, ucretsiz({ odendi: true }), SEC)).toBeNull();
    expect(satisTahsilatKalemi(SATIS_KAYNAK.YEDEK, ucretli({ odendi: true }), SEC).tutar).toBe(1800);
  });
  it("AC-9 satır 3: aylık rapor (kargoBedeli) para kovalarına sıfır", () => {
    const r = hesaplaAylikRapor(veri([ucretsiz()]), "2026-10", SEC);
    expect(r.yedekKargoTutar).toEqual({});
  });
  it("AC-9 satır 8: dışa aktarma satırı (üç çağrı) bedel hücreleri boş", () => {
    const satir = yedekParcaExportRow(ucretsiz(), { dealers: DEALERS, customers: [MUSTERI], parts: [], kdvRates: KDV });
    const h = (ad) => satir[YEDEK_PARCA_EXPORT_HEAD.indexOf(ad)];
    expect(h("Toplam")).toBe("");
    expect(h("Ürün Bedeli (Komisyon Hariç)")).toBe("");
    expect(satir.slice(-2)).toEqual(["", ""]);
  });
  it("AC-9 satır 11: bayi silme onayının açık alacağı", () => {
    const s = bayiBagliSayilar(71, { yedekParcaSatislar: [ucretsiz({ aliciTipi: "bayi", dealerId: 71, musteriId: null })] });
    expect(s.acikAlacak).toEqual({});
  });
  it("AC-9 satır 13 / AC-49: Anasayfa Son Satışlar tutar sıfır ve ibare işareti taşır", () => {
    const [row] = sonSatislar([MUSTERI], [], [ucretsiz()], DEALERS, [], 10);
    expect(row.tutar).toBe(0);
    expect(row.ucretsiz).toBe(true);
    expect("ucretsiz" in sonSatislar([MUSTERI], [], [ucretli()], DEALERS, [], 10)[0]).toBe(false);
  });
});

describe("Spec 0095: borç (R5, C2)", () => {
  it("AC-10: tek borç kaynağı ücretsiz satışsa customerHasAnyDebt false", () => {
    expect(customerHasAnyDebt(MUSTERI, [], [], FAB.name, [ucretsiz()])).toBe(false);
    expect(customerHasAnyDebt(MUSTERI, [], [], FAB.name, [ucretli()])).toBe(true);
  });
  it("C2: borçluluk tek yolda; ödenmemiş ücretsiz kayıt borçlu değil", () => {
    expect(isYedekParcaBorcluMu(ucretsiz())).toBe(false);
    expect(isYedekParcaBorcluMu(ucretli())).toBe(true);
  });
  it("AC-16: aylık raporun alacağına ve alacak yaşlandırmasına girmez", () => {
    const r = hesaplaAylikRapor(veri([ucretsiz()]), "2026-10", SEC);
    expect(r.acikBorc).toEqual({});
    expect(r.alacakYaslandirma).toEqual([]);
    expect(r.borcluFirma).toBe(0);
    const r2 = hesaplaAylikRapor(veri([ucretli()]), "2026-10", SEC);
    expect(r2.borcluFirma).toBe(1);
  });
  it("AC-47: bayi silme onayındaki açık alacak ve ödenmemiş sayısında görünmez", () => {
    const yp = [ucretsiz({ aliciTipi: "bayi", dealerId: 71, musteriId: null }), ucretli({ id: 9003, aliciTipi: "bayi", dealerId: 71, musteriId: null })];
    const s = bayiBagliSayilar(71, { yedekParcaSatislar: yp });
    expect(s.odenmemis).toBe(1);
    expect(s.acikAlacak).toEqual({ TRY: 1500 });
    expect(s.yedekParca).toBe(2); // satış yine bayinin satışıdır (silme kaskadına girer)
  });
});

describe("Spec 0095: gelir, KDV, tahsilat ve kasa (R6, R7/3, C8)", () => {
  it("AC-28: tahsil edilecek KDV sıfır; TL, USD, EUR ve bilinmeyen para birimi", () => {
    for (const currency of ["TRY", "USD", "EUR", "GBP"]) {
      const s = ucretsiz({ currency });
      expect(tahsilEdilecekKdv(s.faturaTipi, yedekParcaBedeli(s), s.tarih, KDV, s), currency).toBe(0);
      const r = hesaplaAylikRapor(veri([s]), "2026-10", SEC);
      expect(r.yedekKargoKdv, currency).toEqual({});
      expect(r.toplamKdv, currency).toEqual({});
    }
  });
  it("AC-46: tahsilatHesapDurumu sor:false ve ücretsize özel neden", () => {
    expect(tahsilatHesapDurumu(SATIS_KAYNAK.YEDEK, ucretsiz(), SEC)).toEqual({ sor: false, neden: UCRETSIZ_HESAP_NEDENI });
    expect(UCRETSIZ_HESAP_NEDENI).toBe("Garanti kapsamında verildi, kasaya girecek tutar yok.");
    // Ücretli ama tutarı sıfır kayıtta genel metin kalır.
    expect(tahsilatHesapDurumu(SATIS_KAYNAK.YEDEK, ucretli({ birimFiyat: 0 }), SEC).neden).toBe("Kasaya girecek tutar yok.");
  });
  it("AC-18 (motor): tahsilat listesine girmez", () => {
    expect(satisTahsilatKalemleri(veri([ucretsiz({ odendi: true, hesapId: 61 })]), SEC)).toEqual([]);
  });
  it("AC-36: ödenmiş ve hesaba bağlı satış ücretsize çevrilince hesabın yürüyen bakiyesinden düşer, hesapKullanimi saymaz", () => {
    const H = [{ id: 61, ad: "Banka", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: "2026-01-01" }];
    const odenmis = ucretli({ odendi: true, yontem: "Havale", hesapId: 61, tahsilatTarihi: "2026-10-05" });
    const v = (yp) => ({ yedekParcaSatislar: yp, customers: [MUSTERI], dealers: DEALERS, factory: FAB, kdvRates: KDV, bugun: "2026-10-20" });
    const bakiye = (yp) => hesapBakiyeleri(H, [], v(yp)).get("61").bakiye;
    expect(bakiye([odenmis])).toBe(1800);
    expect(hesapKullanimi(61, [], v([odenmis]))).toBe(1);
    const form = { ...odenmis, miktar: "3", ucretsizMi: true };
    const cevrilmis = yedekParcaGuncelle(odenmis, yedekParcaRec(form).rec, form);
    expect(bakiye([cevrilmis])).toBe(0);
    expect(hesapKullanimi(61, [], v([cevrilmis]))).toBe(0);
  });
});

describe("Spec 0095: aylık rapor (R20, ölçüm 5)", () => {
  // Ücretsiz satış (kargo, 3 adet) + ücretli satış (fabrika teslim, 2 adet); bilinçli sapma: Extra Kalıp ücretsizi adetten düşer.
  const ay = () => hesaplaAylikRapor(veri([ucretsiz({ kargoDurum: "Hazırlanıyor" }), ucretli({ miktar: 2, fabrikaTeslim: true })]), "2026-10", SEC);
  it("AC-17: adet sayaçları ücretsizi sayar (üç alan ayrı)", () => {
    const r = ay();
    expect(r.yedekKargoAdet).toBe(2);
    expect(r.yedekKargoMiktar).toBe(5);
    expect(r.yedekKargoTeslim).toEqual({ kargo: 1, fabrikaTeslim: 1, gonderilmedi: 0 });
  });
  it("AC-17: para kovaları ücretsizi saymaz (beş alan ayrı)", () => {
    const r = ay();
    expect(r.yedekKargoTutar).toEqual({ TRY: 1000 });
    expect(r.yedekKargoKdv).toEqual({ TRY: 200 });
    expect(r.yedekKargoMusteriTutar).toEqual({ TRY: 1000 });
    expect(r.yedekKargoBayiTutar).toEqual({});
    expect(Object.keys(r.yedekKargoTeslimTutar)).toEqual(["fabrikaTeslim"]);
  });
  it("AC-37: fatura tipi kırılımına hiç girmez", () => {
    const r = ay();
    expect(r.yedekKargoFaturaKirilimi).toEqual([expect.objectContaining({ faturaTipi: "Faturalı Yurtiçi", adet: 1 })]);
    const yalniz = hesaplaAylikRapor(veri([ucretsiz()]), "2026-10", SEC);
    expect(yalniz.yedekKargoFaturaKirilimi).toEqual([]);
  });
  it("AC-38: YEDEK PARÇA ALAN FİRMALAR satırında Miktar dolu, Tutar ve KDV boş, Durum ibare", () => {
    const r = ay();
    const d = r.yedekKargoDetay.find(x => x.miktar === 3);
    expect(d.tutar).toEqual({});
    expect(d.kdv).toEqual({});
    expect(d.ucretsiz).toBe(true);
    const html = buildAylikRaporHtml(r, FAB);
    const tablo = html.slice(html.indexOf("YEDEK PARÇA ALAN FİRMALAR"));
    const satir = tablo.slice(0, tablo.indexOf("</table>")).split("<tr").find(t => t.includes(UCRETSIZ_IBARESI));
    expect(satir).toBeTruthy();
    expect(satir).toMatch(/>3</); // Miktar
    expect(satir).not.toMatch(/Ödenmedi/);
    expect(satir.match(/>—</g)).toHaveLength(2); // Tutar ve KDV: raporun boş hücresi (Extra Kalıp detayının emsali)
  });
});

// ── Garanti durumu (R4, R4/2) ─────────────────────────────────────────────────────────────────────────────────────────
describe("Spec 0095: garanti durumu", () => {
  const eskiTZ = process.env.TZ;
  afterEach(() => { vi.useRealTimers(); process.env.TZ = eskiTZ; });
  it("AC-41: TZ=Europe/Istanbul, yerel 00:30; dün biten garantide uyarı ÇIKAR (today() aktif sayardı), bugün bitende çıkmaz", () => {
    process.env.TZ = "Europe/Istanbul";
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-19T21:30:00Z") }); // = 20.10.2026 00:30 yerel
    expect(yerelBugun()).toBe("2026-10-20");
    expect(today()).toBe("2026-10-19"); // UTC: ölçümün ayırt edici olduğunu gösterir
    expect(garantiDurumu({ warrantyEnd: "2026-10-19" }).aktif).toBe(false);
    expect("2026-10-19" >= today()).toBe(true); // today() ile aktif sayılırdı
    expect(garantiDurumu({ warrantyEnd: "2026-10-20" }).aktif).toBe(true);
  });
  it("AC-3 / AC-5: aktif garanti bitiş tarihiyle yazar; bitiş girilmemişse aktif değil", () => {
    expect(garantiDurumu({ warrantyEnd: "2028-01-05" }, "2026-10-20")).toEqual({ aktif: true, metin: "Garanti aktif · bitiş 05/01/2028" });
    expect(garantiDurumu({ warrantyEnd: "" }, "2026-10-20").aktif).toBe(false);
    expect(garantiDurumu(null)).toBeNull();
  });
});

// ── Kaynak taramaları ────────────────────────────────────────────────────────────────────────────────────────────────
const kod = (f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map(l => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
const tara = (d) => readdirSync(d).flatMap(e => { const p = `${d}/${e}`; return statSync(p).isDirectory() ? (p === "src/lib/map" ? [] : tara(p)) : /\.(jsx?|cjs|mjs)$/.test(e) ? [p] : []; });
const KAYNAK = [...tara("src"), ...tara("electron")];
const say = (desen) => Object.fromEntries(KAYNAK.map(f => [f, kod(f).split("\n").filter(l => desen.test(l)).length]).filter(([, n]) => n > 0));

describe("Spec 0095: kaynak taramaları", () => {
  it("AC-32 (C1/2): miktar × birimFiyat yalnız yedekParcaBedeli'nin tanımında; istisnalar tam yollu ve eskiyince kırılır (plan P4)", () => {
    const CARPIM = /(miktar[^;]{0,40}\*[^;]{0,40}birimFiyat|birimFiyat[^;]{0,40}\*[^;]{0,40}miktar)/;
    const ISTISNA = {
      "src/lib/utils.js": 1, // yedekParcaBedeli'nin kendi tanımı (tek okuma yolu)
      "src/components/Documents.jsx": 1, // teklif alt kalemleri (yedek parça kaydı değil)
      "src/lib/printTemplates.js": 2, // teklif/proforma çıktısının kalemleri
      "src/lib/aylikRapor.js": 1, // teklifToplami (teklif kalemleri)
      "src/lib/evrakUretim.js": 1, // teklif kaleminin kuruş tutarı
      "src/components/YedekParcaSatisForm.jsx": 1, // formun kendi satır toplamı (saklı kayıt değil, ölçüm 2 son paragraf)
      "src/components/customers/CustomerDetailModal.jsx": 1, // düzenlemede komisyonu geri çıkaran ön doldurma (form)
    };
    expect(say(CARPIM)).toEqual(ISTISNA);
    // Triyaj: miktar önce bir değişkene alınıp çarpım başka satırda yazılırsa ilk desen kaçırır (eski KargoPanosu biçimi:
    // `const m = parseInt(s.miktar)` + `m * parseMoney(s.birimFiyat)`). İkinci desen çarpımın sağ yanını arar; bugün yalnız
    // tanımın kendisinde ve iki form istisnasında eşleşir.
    const SAG_YAN = /\*\s*parseMoney\([^)]*\.birimFiyat\)/;
    expect(say(SAG_YAN)).toEqual({
      "src/lib/utils.js": 1, // yedekParcaBedeli'nin kendi tanımı
      "src/components/YedekParcaSatisForm.jsx": 1, // formun kendi satır toplamı
      "src/components/customers/CustomerDetailModal.jsx": 1, // düzenleme ön doldurması
    });
    expect(kod("src/lib/utils.js")).toMatch(/export const yedekParcaBedeli = .*\(parseInt\(s\?\.miktar\) \|\| 0\) \* parseMoney\(s\?\.birimFiyat\)/);
  });
  it("AC-34: ucretsizMi ataması ucretsizUygula dışında yok; Extra Kalıp ve form durumu istisnaları tam yollu (plan P3)", () => {
    const ATAMA = /ucretsizMi\s*:|\.ucretsizMi\s*=[^=]/;
    expect(say(ATAMA)).toEqual({
      "src/lib/yedekParcaSatis.js": 1, // ucretsizUygula (tek yazım yolu)
      "src/lib/kalipSatisi.js": 1, // Extra Kalıp kurucusu (X3, dokunulmaz)
      "electron/db.cjs": 4, // part_sales okuma/yazma ve yedek parçanın ucretsizOku/yazımı
      "src/components/PartSaleForm.jsx": 1, // Extra Kalıp formunun hesap sorgusu nesnesi
      "src/components/YedekParcaSatisForm.jsx": 1, // form durumu (kutunun onChange'i), kayıt değil
      "src/components/customers/CustomerDetailModal.jsx": 1, // toplu düzenlemenin form ön doldurması (R23)
    });
    const k = kod("src/lib/yedekParcaSatis.js");
    const govde = k.slice(k.indexOf("export const ucretsizUygula"), k.indexOf("export const KARISIK_PARTI_UYARISI"));
    expect(govde).toMatch(/ucretsizMi: true/);
    expect(govde).toMatch(/delete k\.ucretsizMi/);
  });
  it("AC-40: Evrak'ın CRM'e Kaydet yolu işareti hiç yazmaz (R22, X8)", () => {
    expect(kod("src/lib/evrakUygula.js")).not.toMatch(/ucretsiz/i);
    expect(kod("src/lib/evrakUretim.js")).not.toMatch(/ucretsiz/i);
  });
  it("AC-43: ibare tek yerden; düz metin yasak, Extra Kalıp'ın üç eski yeri de sabiti kullanır (R10/2)", () => {
    expect(say(/garanti kapsamında \(ücretsiz\)/)).toEqual({ "src/lib/utils.js": 1 });
    for (const f of ["src/components/SimpleDealers.jsx", "src/components/customers/detail/MachineTimeline.jsx", "src/components/customers/detail/deriveCustomerDetail.js"])
      expect(kod(f), f).toMatch(/p?s?\.ucretsizMi \? (" · " \+ )?UCRETSIZ_IBARESI/);
    expect(UCRETSIZ_IBARESI).toBe("garanti kapsamında (ücretsiz)");
  });
  it("AC-41 (tarama): servisin garanti satırı today() ile kalır (X9); yedek parça garantisi yerelBugun ile", () => {
    expect(kod("src/components/ServiceForm.jsx")).toMatch(/selectedCust\.warrantyEnd >= today\(\)/);
    expect(kod("src/lib/yedekParcaSatis.js")).toMatch(/garantiDurumu = \(musteri, bugun = yerelBugun\(\)\)/);
  });
  it("C5: servisin parcaGarantiDisi bayrağına ve yardımcılarına bağlanılmadı", () => {
    for (const f of ["src/lib/yedekParcaSatis.js", "src/components/YedekParcaSatisForm.jsx"]) expect(kod(f), f).not.toMatch(/parcaGarantiDisi|parcaUcretsizMi/);
  });
  it("AC-31: yeni eylem izni, veri bölümü, birleştirme anahtarı ve ayar alanı yok (0093'ün spec öncesi fikstürüyle aynı)", () => {
    const simdi = JSON.parse(JSON.stringify({ BLOB_SECTIONS, MERGE_KEYS, EYLEM_IDLERI, AYAR_ALAN_SEKMELERI }));
    expect(simdi).toEqual(JSON.parse(readFileSync("tests/fixtures/0093-tarama-once.json", "utf8")));
    expect(kod("electron/serverAuth.cjs")).not.toMatch(/ucretsiz/i);
  });
  it("AC-44: alan adı iki tabloda ucretsizMi (şema; Electron gidiş dönüşü scripts/tests/db-roundtrip.cjs)", () => {
    const db = kod("electron/db.cjs");
    const tablo = (ad) => db.slice(db.indexOf(`CREATE TABLE IF NOT EXISTS ${ad} (`), db.indexOf(");", db.indexOf(`CREATE TABLE IF NOT EXISTS ${ad} (`)));
    expect(tablo("part_sales")).toMatch(/ucretsizMi INTEGER/);
    expect(tablo("yedek_parca_satis")).toMatch(/ucretsizMi INTEGER/);
    expect(satisUcretsizMi({ ucretsizMi: true })).toBe(true);
    expect(satisUcretsizMi({ ucretsizMi: false })).toBe(false);
  });
});
