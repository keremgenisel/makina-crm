// Spec 0024 A: kasa, banka ve kredi kartı hesapları; ödemenin kalemden ayrılması (saf motor).
import { describe, it, expect } from "vitest";
import {
  hesapDogrula, hesapBakiyeleri, hesapsizOdemeler, hesapKullanimi, secilebilirHesaplar, odemeDogrula, virmanDogrula, sonKullanilanHesap,
} from "../src/lib/kasa";
import {
  giderKalemDogrula, turHaritasi, odemeleriUygula, odemeDurumu, borcOzeti, hesaplaGiderRaporu, odemeHedefleri, DAVRANIS, HEDEF,
} from "../src/lib/gider";
import { odemeHatirlatmalari } from "../src/lib/odemeHatirlatma";
import { hesaplaMakinaMaliyetleri } from "../src/lib/makinaMaliyeti";

const TUR = [{ id: 1, ad: "Elektrik", davranis: "normal" }, { id: 2, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }];
const turMap = turHaritasi(TUR);
const TED = [{ id: 10, ad: "Bölge Elektrik" }];
const BUGUN = "2026-09-28";
let n = 9000;
const uid = () => ++n;
const kayit = (form) => { const r = giderKalemDogrula(form, { turMap, tedarikciler: TED, uid }); expect(r.hatalar).toEqual([]); return r.kayit; };
// 10.000 + %20 = 12.000 ödenecek
const KALEM = { id: 1, tarih: "2026-09-01", turId: 1, tutar: 10000, kdvOrani: 20, tedarikciId: 10, sonOdemeTarihi: "2026-09-20", odendi: false };
const KASA = { id: 100, ad: "Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 50000, kapali: false };
const BANKA = { id: 101, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, kapali: false };
const USD = { id: 102, ad: "Döviz", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 1000, kapali: false };
const KART = { id: 103, ad: "Kart", tur: "kart", paraBirimi: "TRY", acilisBakiyesi: -2000, kapali: false };
const odeme = (id, tutar, o = {}) => ({ id, tur: "odeme", tarih: "2026-09-10", tutar, hesapId: 101, giderId: 1, ...o });
const uygula = (giderler, hareketler) => odemeleriUygula(giderler, hareketler, turMap);

describe("Spec 0024 A: hesaplar (R1, R16, C5)", () => {
  it("AC-1 / AC-2: kasa açılış bakiyesiyle; banka ve kredi kartı türleri ayrı; kartta açılış borç olarak saklanır", () => {
    expect(hesapDogrula({ ad: "Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: "50.000" }, []).kayit).toMatchObject({ acilisBakiyesi: 50000, tur: "kasa" });
    expect(hesapDogrula({ ad: "Kart", tur: "kart", paraBirimi: "TRY", acilisBakiyesi: "2.000" }, []).kayit.acilisBakiyesi).toBe(-2000);
    expect(hesapDogrula({ ad: "kasa", tur: "banka", paraBirimi: "TRY" }, [KASA]).hatalar.ad).toBe("“kasa” adında bir hesap zaten var.");
  });
  it("C5: hareketi olan hesabın para birimi değişmez", () => {
    expect(hesapDogrula({ ...KASA, paraBirimi: "USD" }, [KASA], { hareketVar: true }).hatalar.paraBirimi).toBe("Hareketi olan hesabın para birimi değiştirilemez.");
  });
  it("AC-24 / AC-33: hareketi olan hesap kullanımda sayılır (silinemez); kapalı hesap yeni harekette seçilemez", () => {
    expect(hesapKullanimi(101, [odeme(1, 100)], [])).toBe(1);
    expect(hesapKullanimi(100, [odeme(1, 100)], [{ id: 5, hesapId: 100, tutar: 1 }])).toBe(1);
    expect(secilebilirHesaplar([KASA, { ...BANKA, kapali: true }, USD], "TRY").map(h => h.id)).toEqual([100]);
  });
});

describe("Spec 0024 A: ödeme hareketi ve durum (R2, R3, R18)", () => {
  it("AC-3: hesabı belirtilmiş tam ödeme kalemi 'ödendi' yapar", () => {
    const [k] = uygula([KALEM], [odeme(1, 12000)]);
    expect(k).toMatchObject({ odendi: true, odemeTarihi: "2026-09-10" });
    expect(odemeDurumu(k)).toBe("odendi");
  });
  it("AC-4 / AC-5: kısmi ödemede 'kısmen', ödenen ve kalan doğru; kalan da ödenince 'ödendi'", () => {
    const [k] = uygula([KALEM], [odeme(1, 5000)]);
    expect(odemeDurumu(k)).toBe("kismen");
    expect(k.odendi).toBe(false);
    expect(odemeHedefleri(k, DAVRANIS.NORMAL)[0].kalanK).toBe(700000);
    const [k2] = uygula([KALEM], [odeme(1, 5000), odeme(2, 7000, { tarih: "2026-09-15" })]);
    expect(k2).toMatchObject({ odendi: true, odemeTarihi: "2026-09-15" });
    expect(odemeHedefleri(k2, DAVRANIS.NORMAL)[0].kalanK).toBe(0);
  });
  it("AC-6: ödeme silinince durum geri döner", () => {
    expect(odemeDurumu(uygula([KALEM], [odeme(1, 5000)])[0])).toBe("kismen");
    expect(odemeDurumu(uygula([KALEM], [])[0])).toBe("odenmedi");
  });
  it("AC-7: kalandan fazla ödeme kaydedilemez, neden söylenir", () => {
    const [k] = uygula([KALEM], [odeme(1, 5000)]);
    const r = odemeDogrula({ tarih: "2026-09-20", tutar: "7.000,01", hesapId: 101 }, { kalem: k, turMap, hesaplar: [BANKA] });
    expect(r.hatalar.tutar).toBe("Kalandan fazla ödeme kaydedilemez (kalan 7.000,00 ₺).");
    expect(odemeDogrula({ tarih: "2026-09-20", tutar: "7.000", hesapId: 101 }, { kalem: k, turMap, hesaplar: [BANKA] }).kayit)
      .toMatchObject({ tur: "odeme", tutar: 7000, hesapId: 101, giderId: 1, taksitId: null });
  });
  it("AC-28: tek ödeme iki kalemi kapatamaz; taksitli kalemde ödeme taksite bağlanır", () => {
    expect(odemeDogrula({ tarih: "2026-09-20", tutar: "1", giderIdler: [1, 2] }, { kalem: uygula([KALEM], [])[0], turMap }).hatalar.hedef)
      .toBe("Bir ödeme yalnız bir kalemi kapatır; her kalem için ayrı ödeme girin.");
    const taksitli = kayit({ ...KALEM, taksitSayisi: 3, sonOdemeTarihi: "2026-10-15" });
    expect(odemeDogrula({ tarih: "2026-09-20", tutar: "1" }, { kalem: uygula([taksitli], [])[0], turMap }).hatalar.hedef).toBe("Taksitli kalemde ödeme bir taksite bağlanır.");
  });
  it("C5: gider ödemesi kapalı ya da TL dışı hesaptan yapılamaz", () => {
    const k = uygula([KALEM], [])[0];
    expect(odemeDogrula({ tarih: "2026-09-20", tutar: "100", hesapId: 102 }, { kalem: k, turMap, hesaplar: [USD] }).hatalar.hesapId).toBe("Gider ödemesi yalnız TL hesaptan yapılır.");
    expect(odemeDogrula({ tarih: "2026-09-20", tutar: "100", hesapId: 101 }, { kalem: k, turMap, hesaplar: [{ ...BANKA, kapali: true }] }).hatalar.hesapId).toBe("Kapatılmış hesaba hareket girilemez.");
  });
  it("AC-20 / AC-36: taksit ödemesi bir hareket; taksidin durumu hareketten türer, saklı bayrak okunmaz", () => {
    const t = kayit({ ...KALEM, taksitSayisi: 3, sonOdemeTarihi: "2026-10-15" });
    expect(t.taksitler.every(r => r.odendi === false)).toBe(true); // saklanan satır bayrak taşımaz
    const ilk = t.taksitler[0];
    const [k] = uygula([{ ...t, taksitler: t.taksitler.map(r => ({ ...r, odendi: true })) }], [odeme(1, 4000, { taksitId: ilk.id })]);
    expect(k.taksitler.map(r => r.odendi)).toEqual([true, false, false]); // saklı bayrak (true) yok sayıldı
    expect(odemeDurumu(k)).toBe("kismen");
    // Tutar iki kez sayılmaz: borç özeti kalan 8.000
    expect(borcOzeti([k], { turler: TUR, tedarikciler: TED }, BUGUN).toplam).toBe(8000);
  });
  it("R18: taksit kısmen ödenebilir; ödeme almış taksit plan değişiminde korunur", () => {
    const t = kayit({ ...KALEM, taksitSayisi: 3, sonOdemeTarihi: "2026-10-15" });
    const [k] = uygula([t], [odeme(1, 1000, { taksitId: t.taksitler[0].id })]);
    expect(k.taksitler[0]).toMatchObject({ odendi: false, _odenenK: 100000 });
    expect(odemeDurumu(k)).toBe("kismen");
    const y = kayit({ ...k, taksitSayisi: 2, sonOdemeTarihi: "2026-10-15" });
    expect(y.taksitler.map(r => r.tutar)).toEqual([4000, 8000]);
    expect(y.taksitler[0].id).toBe(t.taksitler[0].id);
  });
  it("Q3: göç hareketi (tamKapatir) hedefini tam kapatır; kaleme bağlı eski hareket satırlı kalemde hepsini kapatır", () => {
    expect(uygula([KALEM], [{ id: 1, tur: "odeme", giderId: 1, tamKapatir: true, tarih: "2026-09-05", kaynak: "goc" }])[0]).toMatchObject({ odendi: true, odemeTarihi: "2026-09-05" });
    const kira = kayit({ id: 2, tarih: "2026-09-01", turId: 2, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 0, sonOdemeTarihi: "2026-09-05" });
    const [k] = uygula([kira], [{ id: 2, tur: "odeme", giderId: 2, tamKapatir: true, tarih: "2026-09-05" }]);
    expect(k.taksitler.every(r => r.odendi)).toBe(true);
    expect(k.odendi).toBe(true);
  });
});

describe("Spec 0024 A: borç ve hatırlatıcı kalanla (R14)", () => {
  it("AC-18: borç özeti kısmen ödenmiş kalemde kalan tutarı sayar", () => {
    const [k] = uygula([KALEM], [odeme(1, 5000)]);
    expect(borcOzeti([k], { turler: TUR, tedarikciler: TED }, BUGUN).satirlar).toEqual([expect.objectContaining({ tur: "tedarikci", tutar: 7000 })]);
    const r = hesaplaGiderRaporu({ giderler: [k], turler: TUR, tedarikciler: TED }, { baslangic: "2026-09-01", bitis: "2026-09-30" }, { bugun: BUGUN });
    expect(r.tedarikciKirilimi.tedarikciBorcu).toBe(7000);
  });
  it("AC-19: hatırlatıcı kısmen ödenmişi kalanla gösterir; tam ödenmişi göstermez", () => {
    const h = odemeHatirlatmalari(uygula([KALEM], [odeme(1, 5000)]), { turler: TUR, tedarikciler: TED, yururlukAy: "2026-01" }, BUGUN);
    expect(h.gecmis.map(o => o.odenecek)).toEqual([7000]);
    expect(odemeHatirlatmalari(uygula([KALEM], [odeme(1, 12000)]), { turler: TUR, yururlukAy: "2026-01" }, BUGUN).kalemIdleri.size).toBe(0);
  });
  it("koruma: hareket listesi verilmezse kalemler olduğu gibi döner (eski davranış)", () => {
    const eski = [{ ...KALEM, odendi: true, odemeTarihi: "2026-09-02" }];
    expect(odemeleriUygula(eski, null, turMap)).toBe(eski);
  });
});

describe("Spec 0024 A: hesap bakiyesi (R6–R8, R15, C5)", () => {
  const payments = [
    { id: 1, tarih: "2026-09-12", tutar: 30000, currency: "TRY", yontem: "Havale", hesapId: 101 },
    { id: 2, tarih: "2026-09-13", tutar: 99999, currency: "TRY", yontem: "Çek", tahsilEdildi: false, hesapId: 101 },
    { id: 3, tarih: "2026-09-14", tutar: 500, currency: "USD", yontem: "Havale", hesapId: 102 },
  ];
  const hareketler = [odeme(1, 12000), odeme(2, 3000, { hesapId: null }), { id: 3, tur: "virman", tarih: "2026-09-15", tutar: 20000, hesapId: 101, karsiHesapId: 100 },
    odeme(4, 1500, { hesapId: 103, tarih: "2026-09-16" })];
  const b = hesapBakiyeleri([KASA, BANKA, USD, KART], hareketler, payments);
  it("AC-8 / AC-9: ödeme bakiyeyi azaltır, hesaplı tahsilat artırır; tahsil edilmemiş çek girmez", () => {
    expect(b.get("101")).toMatchObject({ acilis: 100000, giren: 30000, cikan: 32000, bakiye: 98000 });
  });
  it("AC-10: hareketler tarih sırasıyla, yürüyen bakiyeyle", () => {
    expect(b.get("101").satirlar.map(s => [s.tarih, s.tur, s.bakiyeK / 100])).toEqual([["2026-09-10", "odeme", 88000], ["2026-09-12", "tahsilat", 118000], ["2026-09-15", "virman", 98000]]);
  });
  it("AC-12: virman iki hesabı karşılıklı değiştirir ve gider raporuna girmez", () => {
    expect(b.get("100").bakiye).toBe(70000);
    const r = hesaplaGiderRaporu({ giderler: [], turler: TUR }, { baslangic: "2026-09-01", bitis: "2026-09-30" }, { bugun: BUGUN });
    expect(r.toplam).toBe(0);
  });
  it("AC-30: farklı para biriminde iki hesap arasında virman kaydedilemez", () => {
    expect(virmanDogrula({ hesapId: 101, karsiHesapId: 102, tutar: "10", tarih: "2026-09-20" }, [BANKA, USD]).hatalar.karsiHesapId)
      .toBe("Farklı para birimindeki hesaplar arasında virman yapılamaz.");
  });
  it("AC-31: kredi kartı bakiyesi borç olarak (açılış 2.000 + harcama 1.500 = 3.500 borç)", () => {
    expect(b.get("103")).toMatchObject({ bakiye: -3500, borc: 3500 });
  });
  it("AC-32 / R8: hesapsız ödeme hiçbir bakiyeyi değiştirmez ve sayılır", () => {
    const toplam = [...b.values()].reduce((a, x) => a + x.cikanK, 0);
    expect(toplam).toBe(3350000);
    expect(hesapsizOdemeler([...hareketler, { id: 9, tur: "odeme", tamKapatir: true, kaynak: "goc", giderId: 5 }])).toEqual({ adet: 2, gocAdet: 1 });
  });
  it("R17: son kullanılan hesap en son ödemenin açık TL hesabıdır", () => {
    expect(sonKullanilanHesap(hareketler, [KASA, BANKA, KART])).toBe(103);
    expect(sonKullanilanHesap(hareketler, [KASA, BANKA, { ...KART, kapali: true }])).toBe(null);
  });
});

describe("Spec 0024 A: çift sayım yasağı (C3, C4)", () => {
  it("AC-23: makina maliyeti ve kârlılık ödemeden ve virmandan etkilenmez", () => {
    const hesap = (giderler) => hesaplaMakinaMaliyetleri({ customers: [{ id: 1, name: "F", model: "AK100", serialNo: "S", installDate: "2026-09-20", uretimTarihi: "2026-09-05", fabrikaSatisBedeli: 1, currency: "TRY" }],
      stock: [], partStockLog: [], giderler, giderTurleri: TUR, standartGiderler: [], standardModels: [{ model: "AK100" }], customModels: [], giderAyarlari: { yururlukAy: "2026-01" } }, { bugun: BUGUN });
    const a = hesap([KALEM]).makinalar.get("musteri:1");
    const b = hesap(uygula([KALEM], [odeme(1, 5000)])).makinalar.get("musteri:1");
    expect(b.ortakPay).toBe(a.ortakPay);
    expect(b.uretimMaliyeti).toBe(a.uretimMaliyeti);
  });
});

// Triyaj bulgu 3: artık doğruluk kaynağı olmayan işaretleri yazan eski yardımcılar geri gelmesin; Anasayfa kalemi değiştirmez.
describe("Spec 0024 bulgu 3: eski ödeme işaretleyicileri kaldırıldı", () => {
  it("gider.js bu yardımcıları dışa açmaz; src altında çağrılmaz; Dashboard setGiderler almaz", async () => {
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const path = await import("node:path");
    const gider = await import("../src/lib/gider");
    const ESKI = ["odemeDurumuDegistir", "odendiIsaretle", "taksitIsaretle", "hedefIsaretle", "hedefDurumuDegistir"];
    for (const ad of ESKI) expect(gider[ad], ad).toBeUndefined();
    const kok = path.join(__dirname, "..", "src");
    const gez = (d) => readdirSync(d).flatMap(a => { const f = path.join(d, a); return statSync(f).isDirectory() ? gez(f) : /\.jsx?$/.test(a) ? [f] : []; });
    const kod = (f) => readFileSync(f, "utf-8").replace(/\/\/[^\n]*/g, "");
    for (const f of gez(kok)) for (const ad of ESKI) expect(kod(f), `${f}: ${ad}`).not.toMatch(new RegExp(`\\b${ad}\\b`));
    expect(kod(path.join(kok, "components", "Dashboard.jsx"))).not.toMatch(/\bsetGiderler\b/);
  });
});
