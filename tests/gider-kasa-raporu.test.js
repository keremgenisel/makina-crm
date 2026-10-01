// Spec 0047: Aylık Gider ve Kasa Raporu (motor genişlemeleri, kurucu, HTML, dönem kilidi, gizlilik çıktısı).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { giderKasaRaporu, buildGiderKasaRaporuHtml, NOT_GELIR_DEGIL, NOT_YONTEM, NOT_ANLIK, NOT_MAHSUP, NOT_HESAPSIZ, NOT_CEK_GECMISSIZ, KAYIT_YOK } from "../src/lib/giderRaporu";
import { hesapBakiyeleri, hareketOzeti, hesapsizOdemeler, hesapsizTahsilatlar, hesapsizOzeti } from "../src/lib/kasa";
import { cekDurumuAyinSonunda, cekAyOzeti } from "../src/lib/cek";
import { giderKalemDogrula, turHaritasi, odemeleriUygula, hesaplaGiderRaporu, kdvKarsilastir, ayinSonGunu, HEDEF } from "../src/lib/gider";
import { hesaplananKdvAylar } from "../src/lib/giderKdv";
import { odemeHatirlatmalari } from "../src/lib/odemeHatirlatma";

const turler = [{ id: 1, ad: "Hammadde", davranis: "normal" }, { id: 2, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Maaşlar", davranis: "personel" }];
const turMap = turHaritasi(turler);
const tedarikciler = [{ id: 11, ad: "Demir Bant" }, { id: 12, ad: "Yıldız Gayrimenkul" }];
let n = 7000;
const uid = () => ++n;
const kayit = (form) => { const r = giderKalemDogrula(form, { turMap, tedarikciler, uid }); expect(r.hatalar).toEqual([]); return r.kayit; };
// Ayırt edici çalışan verisi (R22): ad, resmi, elden ve prim tutarları çıktıda asla görünmemeli.
const AD = "Zümrüt Kaplanoğlu";
const K1 = kayit({ id: 1, tarih: "2026-09-05", turId: 1, tutar: 10000, kdvOrani: 20, tedarikciId: 11, aciklama: "Sac levha", sonOdemeTarihi: "2026-09-20" });
const K2 = kayit({ id: 2, tarih: "2026-09-01", turId: 2, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 0, tedarikciId: 12, aciklama: "Eylül kirası", sonOdemeTarihi: "2026-09-10" });
const K3 = kayit({ id: 3, tarih: "2026-09-15", turId: 1, tutar: 1000, kdvOrani: 0, aciklama: "Temizlik", sonOdemeTarihi: "2026-10-03" });
const K4 = kayit({ id: 4, tarih: "2026-09-30", turId: 3, calisanId: 21, calisanAd: AD, resmiTutar: 31111, eldenTutar: 17777,
  ekOdemeler: [{ tur: "prim", aciklama: "Eylül primi", resmiTutar: 2345, eldenTutar: "" }], sonOdemeTarihi: "2026-10-05" });
const K5 = kayit({ id: 5, tarih: "2026-10-02", turId: 1, tutar: 999, kdvOrani: 0, aciklama: "Ekim kalemi" });
const K6 = kayit({ id: 6, tarih: "2026-09-06", turId: 1, tutar: 2000, kdvOrani: 0, tedarikciId: 11, aciklama: "Bant" });
const GIDERLER = [K1, K2, K3, K4, K5, K6];
const ana = (k) => k.taksitler.find(t => t.hedef === HEDEF.ANA);
const HESAPLAR = [
  { id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, acilisTarihi: "2026-01-01", kapali: false },
  { id: 52, ad: "Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 20000, acilisTarihi: "2026-09-10", kapali: false },
  { id: 53, ad: "Döviz", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 1000, acilisTarihi: "2026-01-01", kapali: false },
  { id: 54, ad: "Eski", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: "2026-01-01", kapali: true },
  { id: 55, ad: "Yeni", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 500, acilisTarihi: "2026-11-01", kapali: false },
];
const H = [
  { id: 101, tur: "odeme", tarih: "2026-09-18", tutar: 12000, yontem: "Havale", hesapId: 51, giderId: 1, taksitId: null },
  { id: 102, tur: "odeme", tarih: "2026-10-05", tutar: 16000, yontem: "Havale", hesapId: 51, giderId: 2, taksitId: ana(K2).id }, // ay sonrası
  { id: 103, tur: "odeme", tarih: "2026-09-30", tutar: 33456, yontem: "Nakit", hesapId: 52, giderId: 4, taksitId: ana(K4).id },
  { id: 104, tur: "odeme", tarih: "2026-09-20", tutar: 1000, yontem: "", hesapId: null, giderId: 3, taksitId: null }, // hesapsız
  { id: 105, tur: "virman", tarih: "2026-09-12", tutar: 5000, hesapId: 51, karsiHesapId: 52 },
  { id: 106, tur: "avans", tarih: "2026-09-08", tutar: 3000, calisanId: 21, hesapId: 52 },
  { id: 107, tur: "mahsup", tarih: "2026-09-29", tutar: 1000, calisanId: 21, giderId: 4, taksitId: K4.taksitler.find(t => t.hedef === HEDEF.ELDEN).id, hesapId: null },
  { id: 108, tur: "avans", tarih: "2026-09-25", tutar: 500, calisanId: 21, hesapId: null }, // hesapsız avans
  { id: 109, tur: "odeme", tarih: "2026-08-10", tutar: 5000, yontem: "Havale", hesapId: 51, giderId: 99, taksitId: null }, // önceki ay
  { id: 110, tur: "odeme", tarih: "2026-09-22", tutar: 2000, yontem: "Çek (ciro)", hesapId: null, giderId: 6, taksitId: null, cekId: 200 }, // ciro
];
const PAYMENTS = [
  { id: 300, customerId: 1, tarih: "2026-09-01", tutar: 2000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-10-01" },
  { id: 301, customerId: 1, tarih: "2026-09-03", tutar: 5000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-10-05" },
  { id: 302, customerId: 1, tarih: "2026-09-14", tutar: 7000, currency: "TRY", yontem: "Havale", hesapId: 51 },
  { id: 303, customerId: 1, tarih: "2026-07-01", tutar: 4000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-12-01" },
];
const CEKLER = [
  { id: 200, paymentId: 300, no: "C-200", banka: "Ziraat", durum: "ciro", gecmis: [{ tarih: "2026-09-01", durum: "portfoy" }, { tarih: "2026-09-22", durum: "ciro", not: "Ciro: Demir Bant" }] },
  { id: 201, paymentId: 301, no: "C-201", banka: "Garanti", durum: "tahsil", gecmis: [{ tarih: "2026-09-03", durum: "portfoy" }, { tarih: "2026-10-05", durum: "tahsil" }] },
  { id: 202, paymentId: 303, no: "C-202", banka: "Akbank", durum: "portfoy", gecmis: [] }, // geçmişsiz eski çek
];
const CUSTOMERS = [{ id: 1, name: "Kutu Gıda" }];
const SERVICES = [{ id: 400, customerId: 1, type: "Garanti Dışı", servisUcreti: 1000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", date: "2026-09-16", odendi: true, tahsilatTarihi: "2026-09-16", yontem: "Nakit", hesapId: 51 }];
const PART_SALES = [{ id: 410, customerId: 1, tur: "Kalıp", ad: "K", ucret: 500, currency: "TRY", faturaTipi: "Faturasız Yurtiçi", tarih: "2026-09-19", odendi: true, tahsilatTarihi: "2026-09-19", yontem: "Nakit", hesapId: null }];
const girdi = (o = {}) => ({
  giderler: GIDERLER, hareketler: H, turler, tedarikciler, stock: [], customers: CUSTOMERS, canliModeller: new Set(), yururlukAy: "2026-01", esikGun: 7,
  satisVerisi: { customers: CUSTOMERS, services: SERVICES, partSales: PART_SALES, payments: PAYMENTS, teklifler: [], dealers: [], yedekParcaSatislar: [] },
  kdvSecenek: { factoryName: "Altuntaş Makina" },
  hesaplar: HESAPLAR, cekler: CEKLER, payments: PAYMENTS, services: SERVICES, partSales: PART_SALES, yedekParcaSatislar: [], dealers: [], factory: { name: "Altuntaş Makina" }, ...o,
});
const EYLUL = { baslangic: "2026-09-01", bitis: "2026-09-30" };
const R = (o, ay = "2026-09", sec) => giderKasaRaporu(girdi(o), ay, sec);
const HTML = (o, ay, sec) => buildGiderKasaRaporuHtml(R(o, ay, sec));
const hesap = (r, ad) => r.kasa.bloklar.flatMap(b => b.satirlar).find(s => s.ad === ad);

describe("Spec 0047: kasa motoru genişlemeleri", () => {
  const veri = { payments: PAYMENTS, services: SERVICES, partSales: PART_SALES, customers: CUSTOMERS, factory: { name: "Altuntaş Makina" }, bugun: "2026-09-30" };
  it("AC-46: aralıksız hesapBakiyeleri bugünkü çıktıyı birebir verir", () => {
    const a = hesapBakiyeleri(HESAPLAR, H, veri);
    const b = hesapBakiyeleri(HESAPLAR, H, veri, {});
    expect([...b.values()].map(x => [x.bakiyeK, x.girenK, x.cikanK, "aralik" in x])).toEqual([...a.values()].map(x => [x.bakiyeK, x.girenK, x.cikanK, false]));
  });
  it("AC-47 / AC-12 / AC-55: aralık öncesi açılışa katlanır, sonrası sayılmaz; kapanış = açılış + giren − çıkan; açılış ayında açılış ayrı satır", () => {
    const b = hesapBakiyeleri(HESAPLAR, H, veri, { aralik: EYLUL });
    const z = b.get("51").aralik; // 100.000 − 5.000 (ağustos) devreden; eylül: +7.000 makina, +1.200 servis; −12.000, −5.000 virman
    expect(z).toMatchObject({ devredenK: 9500000, acilisSatiriK: 0, girenK: 820000, cikanK: 1700000 });
    expect(z.kapanisK).toBe(z.devredenK + z.girenK - z.cikanK);
    const k = b.get("52").aralik; // 10 eylülde açıldı: devreden 0, açılış satırı 20.000
    expect(k).toMatchObject({ devredenK: 0, acilisSatiriK: 2000000, girenK: 500000, cikanK: 3345600 + 300000 });
    expect(b.get("55").aralik.sonra).toBe(true);
  });
  it("AC-13 / AC-14 / AC-52 / AC-53: hareket özeti beş tür; tahsilat dört kaynak; yöntem kırılımı toplamı ayın ödeme toplamı", () => {
    const b = hesapBakiyeleri(HESAPLAR, H, veri, { aralik: EYLUL });
    const o = hareketOzeti(H, EYLUL, b);
    expect([o.odeme.adet, o.virman.adet, o.avans.adet, o.mahsup.adet]).toEqual([4, 1, 2, 1]);
    expect(o.tahsilat).toMatchObject({ adet: 2, tutarK: 820000, kaynaklar: { makina: { adet: 1, tutarK: 700000 }, servis: { adet: 1, tutarK: 120000 } } });
    expect(o.yontemKirilimi.reduce((a, y) => a + y.tutarK, 0)).toBe(o.odeme.tutarK);
    expect(o.yontemKirilimi.map(y => y.ad)).toEqual(["Nakit", "Havale", "Çek (ciro)", "Belirtilmemiş"]);
  });
  it("AC-16 / AC-50 / AC-51: aralıklı hesapsız liste; ciro hariç; hesapsız tahsilat ayrı", () => {
    const h = hesapsizOdemeler(H, EYLUL);
    expect(h.liste.map(m => m.id)).toEqual([104, 108]);
    expect(hesapsizOdemeler(H)).not.toHaveProperty("liste");
    const t = hesapsizTahsilatlar(veri, HESAPLAR, EYLUL);
    expect(t.liste.map(k => k.kayit.id)).toEqual([410]);
    expect(hesapsizTahsilatlar(veri, HESAPLAR, { baslangic: "2026-10-01", bitis: "2026-10-31" }).adet).toBe(0);
  });
});

describe("Spec 0047: çek ay sonu durumu", () => {
  it("AC-48: eylülde elde olup ekimde tahsil edilen çek eylülde elde, ekimde tahsil sayılır", () => {
    expect(cekDurumuAyinSonunda(CEKLER[1], "2026-09-30").durum).toBe("portfoy");
    expect(cekDurumuAyinSonunda(CEKLER[1], "2026-10-31").durum).toBe("tahsil");
    expect(cekAyOzeti(CEKLER, PAYMENTS, "2026-09")).toMatchObject({ elde: { adet: 2 }, ciro: { adet: 1, tutarK: { TRY: 200000 } }, tahsil: { adet: 0 } });
    expect(cekAyOzeti(CEKLER, PAYMENTS, "2026-10")).toMatchObject({ tahsil: { adet: 1, tutarK: { TRY: 500000 } } });
  });
  it("triyaj: aynı ay içinde ciro edilip ciro iptal edilen çek ciro sayılmaz, elde sayılır; iptal ertesi aydaysa ciro sayılır", () => {
    const iptal = { id: 210, paymentId: 300, no: "C-210", banka: "Ziraat", durum: "portfoy",
      gecmis: [{ tarih: "2026-09-01", durum: "portfoy" }, { tarih: "2026-09-10", durum: "ciro", not: "Ciro: X" }, { tarih: "2026-09-15", durum: "portfoy", not: "Ciro iptal" }] };
    expect(cekAyOzeti([iptal], PAYMENTS, "2026-09")).toMatchObject({ ciro: { adet: 0 }, elde: { adet: 1 } });
    const ekimIptal = { ...iptal, gecmis: [iptal.gecmis[0], iptal.gecmis[1], { tarih: "2026-10-02", durum: "portfoy", not: "Ciro iptal" }] };
    expect(cekAyOzeti([ekimIptal], PAYMENTS, "2026-09")).toMatchObject({ ciro: { adet: 1 }, elde: { adet: 0 } });
  });
  it("AC-49: geçmişi olmayan çekte güncel durum kullanılır ve sayılır (dipnot)", () => {
    expect(cekDurumuAyinSonunda(CEKLER[2], "2026-09-30")).toEqual({ durum: "portfoy", gecmisYok: true });
    expect(cekAyOzeti(CEKLER, PAYMENTS, "2026-09").gecmisYokAdet).toBe(1);
    expect(HTML()).toContain(NOT_CEK_GECMISSIZ);
  });
});

describe("Spec 0047: gider bölümü", () => {
  const r = R();
  it("AC-3 / AC-32 / AC-34 / AC-18: başlık ayı ve aralığı yazar; bölüm başlıkları dönem ya da ay sonu itibarıyla; notlar", () => {
    const h = HTML();
    expect(h).toContain("Eylül 2026 dönemi (01/09/2026 – 30/09/2026)");
    expect(h).toMatch(/30\/09\/2026 itibarıyla/);
    for (const not of [NOT_ANLIK, NOT_GELIR_DEGIL, NOT_YONTEM, NOT_MAHSUP]) expect(h).toContain(not);
    expect(h).toContain(NOT_HESAPSIZ);
  });
  it("AC-4: toplam, KDV, stopaj ekrandaki Dönem Raporu ile her zaman aynı; ödenen yalnız ay sonrası ödeme yoksa aynı (Q2)", () => {
    const ekran = (hareketler) => hesaplaGiderRaporu({ giderler: odemeleriUygula(GIDERLER, hareketler, turMap), turler, tedarikciler, yururlukAy: "2026-01" }, EYLUL, { bugun: "2026-10-10" });
    // Kira ekimde tamamlanır (5 ekim kiraya veren, 6 ekim vergi dairesi): ekran "ödendi", eylül raporu "ödenmedi".
    const sonrasi = [...H, { id: 120, tur: "odeme", tarih: "2026-10-06", tutar: 4000, hesapId: 51, giderId: 2, taksitId: K2.taksitler.find(t => t.hedef === HEDEF.STOPAJ).id }];
    const e = ekran(sonrasi);
    const rr = R({ hareketler: sonrasi });
    expect([rr.gider.ozet.toplam, rr.gider.ozet.indirilecekKdv, rr.gider.ozet.stopaj]).toEqual([e.toplam, e.indirilecekKdv, e.stopajToplam]);
    expect(rr.gider.ozet.odenen).toBeLessThan(e.odenen);
    const ayIci = H.filter(h => h.tarih <= "2026-09-30");
    expect(R({ hareketler: ayIci }).gider.ozet.odenen).toBe(ekran(ayIci).odenen);
  });
  it("AC-5 / AC-20: tür kırılımı toplamı özet toplamıdır; personel tek 'Personel gideri' satırı, kalem sayısı yok", () => {
    expect(r.gider.turler.reduce((a, t) => a + Math.round(t.toplam * 100), 0)).toBe(Math.round(r.gider.ozet.toplam * 100));
    expect(r.gider.turler.find(t => t.ad === "Personel gideri")).toMatchObject({ adet: null, toplam: 51233 });
  });
  it("AC-6: tedarikçi kırılımı açık borcu gösterir; tedarikçisiz kalemler ayrı satır", () => {
    expect(r.gider.tedarikciler.satirlar.map(t => t.ad).sort()).toEqual(["Demir Bant", "Yıldız Gayrimenkul"]);
    expect(r.gider.tedarikciler.secilmemis).toMatchObject({ adet: 1, harcama: 1000 });
    expect(r.gider.tedarikciler.satirlar.find(t => t.ad === "Yıldız Gayrimenkul").acikBorc).toBe(16000); // ay sonunda ödenmemiş
  });
  it("AC-7 / AC-33: ödeme durumu odemeHatirlatmalari(ay sonu) ile aynı kapsam; yaklaşan ay sonundan sonraki eşik günleri", () => {
    const hh = odemeHatirlatmalari(odemeleriUygula(GIDERLER, H.filter(h => h.tarih <= "2026-09-30"), turMap), { turler, tedarikciler, yururlukAy: "2026-01", esikGun: 7 }, "2026-09-30");
    expect([r.gider.odemeDurumu.gecmisAdet, r.gider.odemeDurumu.yaklasanAdet]).toEqual([hh.sayilar.gecmis, hh.sayilar.yaklasan]);
    expect(r.gider.odemeDurumu.yaklasanAdet).toBeGreaterThan(0); // Temizlik (vade 3 ekim) yaklaşan
  });
  it("AC-8: dört kova toplamı ay toplamına eşit", () => {
    const k = r.gider.kovalar;
    expect(Math.round((k.makina + k.model + k.dagitma + k.ortak) * 100)).toBe(Math.round(r.gider.ozet.toplam * 100));
  });
  it("AC-9: KDV karşılaştırması Finans kartındaki fonksiyonla aynı", () => {
    const gr = hesaplaGiderRaporu({ giderler: GIDERLER, turler, yururlukAy: "2026-01" }, { baslangic: "2026-09-01", bitis: ayinSonGunu("2026-09") });
    const fin = kdvKarsilastir(hesaplananKdvAylar(girdi().satisVerisi, ["2026-09"], { factoryName: "Altuntaş Makina" }), gr.indirilecekKdv);
    expect(r.gider.kdv).toEqual(fin);
  });
  it("AC-10 / AC-39: kalem listesi tarih sırasıyla ve durumlu; kapatılınca yok, diğer bölümler aynı", () => {
    expect(r.gider.kalemler.map(k => k.tarih)).toEqual(["2026-09-01", "2026-09-05", "2026-09-06", "2026-09-15", null]);
    expect(r.gider.kalemler[0]).toMatchObject({ aciklama: "Eylül kirası", durum: "Ödenmedi" });
    const kapali = R({}, "2026-09", { kalemListesi: false });
    expect(kapali.gider.kalemler).toBeNull();
    expect({ ...kapali.gider, kalemler: null }).toEqual({ ...r.gider, kalemler: null });
    expect(HTML({}, "2026-09", { kalemListesi: false })).not.toContain("Kalem listesi");
  });
});

describe("Spec 0047: kasa bölümü", () => {
  const r = R();
  it("AC-11 / AC-12 / AC-35 / AC-36: para birimi blokları, bloklar arası toplam yok; kapanış = açılış + giren − çıkan", () => {
    expect(r.kasa.bloklar.map(b => b.paraBirimi)).toEqual(["TRY", "USD"]);
    for (const s of r.kasa.bloklar.flatMap(b => b.satirlar)) expect(s.kapanisK).toBe(s.devredenK + s.acilisSatiriK + s.girenK - s.cikanK);
    const tek = R({ hesaplar: HESAPLAR.filter(h => h.paraBirimi === "TRY") });
    expect(tek.kasa.bloklar).toHaveLength(1);
    expect(buildGiderKasaRaporuHtml(tek)).not.toMatch(/<h4>TRY<\/h4>/);
  });
  it("AC-55 / AC-56: açılışı sonraki ayda olan hesap yok; hareketsiz sıfır bakiyeli kapalı hesap yok, hareketli kapalı hesap 'kapalı' ile var", () => {
    expect(hesap(r, "Yeni")).toBeUndefined();
    expect(hesap(r, "Eski")).toBeUndefined();
    const hk = R({ hareketler: [...H, { id: 150, tur: "odeme", tarih: "2026-09-02", tutar: 10, hesapId: 54, giderId: 1, taksitId: null }] });
    expect(hesap(hk, "Eski")).toMatchObject({ kapali: true });
    expect(buildGiderKasaRaporuHtml(hk)).toContain("Eski (kapalı)");
    expect(hesap(r, "Kasa").acilisSatiriK).toBe(2000000);
  });
  it("AC-15 / AC-17 / AC-23: çek bölümü dört rakam; açık avans tek toplam (ay sonu)", () => {
    expect(r.kasa.cek).toMatchObject({ elde: { adet: 2 }, ciro: { adet: 1 } });
    expect(r.kasa.avansK).toBe(250000); // 3.000 + 500 − 1.000 mahsup
  });
  it("AC-37: tutarsız göç hareketi (tamKapatir) ₺0 değil 'Tamamı (eski kayıt)' yazılır", () => {
    const h = HTML({ hareketler: [...H, { id: 160, tur: "odeme", tarih: "2026-09-21", tutar: null, tamKapatir: true, kaynak: "goc", hesapId: null, giderId: 6, taksitId: null }] });
    expect(h).toMatch(/Bant<\/td><td class="r">Tamamı \(eski kayıt\)/);
  });
  it("AC-37 / AC-38: hesapsız hareketler tarih, kalem ve tutarla; yokken 'yok'", () => {
    // Triyaj: avans (ve personel ödemesi) satır satır değil, toplu satır.
    expect(r.kasa.hesapsiz.liste).toEqual([{ tarih: "2026-09-20", tutarK: 100000, etiket: "Temizlik" }, { tarih: null, tutarK: 50000, etiket: "Çalışan avansları · 1 adet", toplu: true }]);
    const bos = HTML({ hareketler: H.filter(h => h.hesapId != null) });
    expect(bos).toContain("Hesabı belirtilmemiş ödeme ya da avans yok.");
  });
});

describe("Spec 0047: dönem kilidi ve sınır durumları", () => {
  it("AC-30: aynı ay iki kez aynı belge", () => { expect(HTML()).toBe(HTML()); });
  it("AC-31: ertesi ay girilen ödeme ve çek hareketi eylül belgesini değiştirmez", () => {
    const sonra = HTML({ hareketler: [...H, { id: 190, tur: "odeme", tarih: "2026-10-09", tutar: 1000, hesapId: 52, giderId: 3, taksitId: null, yontem: "Nakit" }],
      cekler: CEKLER.map(c => c.id === 202 ? c : { ...c, gecmis: [...c.gecmis, { tarih: "2026-10-20", durum: "karsiliksiz" }] }) });
    expect(sonra).toBe(HTML());
  });
  it("AC-58: hiç kaydı olmayan ay üretilir, bölümler 'Bu ayda kayıt yok'", () => {
    const h = HTML({ hesaplar: [] }, "2026-05");
    expect(h).toContain(KAYIT_YOK);
    expect(h).toContain("Aylık Gider ve Kasa Raporu");
  });
  it("AC-59: yürürlük öncesi ay açıklamayla, gider tabloları yok", () => {
    const h = HTML({ yururlukAy: "2026-10" }, "2026-09");
    expect(h).toMatch(/Gider takibi bu aydan sonra yürürlüğe girdi/);
    expect(h).not.toContain("Gider türü kırılımı");
  });
  it("AC-60: çöpe atılan kalem geçmiş ayın raporunu değiştirir; belge uyarısı bunu söyler", () => {
    const cop = HTML({ giderler: GIDERLER.map(k => (k.id === 1 ? { ...k, deletedAt: "2026-10-15" } : k)) });
    expect(cop).not.toBe(HTML());
    expect(HTML()).toContain("çöpe atılırsa rakamlar değişir");
  });
});

describe("Spec 0047: gizlilik (çıktı temelli, R22)", () => {
  const h = HTML();
  it("AC-19 / AC-21 / AC-22 / AC-23 / AC-24: çalışan adı, resmi/elden, ek ödeme ve kişi bazlı avans çıktıda yok", () => {
    // Kasa bölümündeki nakit hareket tutarları çalışan kırılımı değildir; yasak olan ad, resmi/elden bileşeni ve ek ödeme.
    for (const yasak of ["Zümrüt", "Kaplanoğlu", "31.111", "17.777", "2.345", "Resmi", "Elden", "elden", "Prim", "primi", "Fazla mesai", "ikramiye"]) {
      expect(h, yasak).not.toContain(yasak);
    }
    expect(h).toContain("Personel gideri");
  });
  it("R35 / C2: rapor kurucusu motorları çağırır, ikinci hesap yazmaz", () => {
    const k = readFileSync("src/lib/giderRaporu.js", "utf8");
    for (const f of ["hesaplaGiderRaporu(", "odemeHatirlatmalari(", "hesaplananKdvAylar(", "kdvKarsilastir(", "donemYontemKirilimi(", "hesapBakiyeleri(", "hareketOzeti(", "hesapsizOdemeler(", "hesapsizTahsilatlar(", "avansBorclari(", "cekAyOzeti("]) expect(k, f).toContain(f);
    const kod = k.split("\n").filter(l => !l.trim().startsWith("//")).join("\n");
    expect(kod).not.toMatch(/calisanlar\b|calisanAd|resmiTutar|eldenTutar|ekOdemeler/);
  });
});

// Spec 0051 X6 / C6: Kasa'nın hesapsız iş listesi eşiği 0047 raporuna geçmez; rapor gerçeği yazar.
describe("Spec 0051: başlangıç tarihi raporu etkilemez", () => {
  it("AC-21: eşik ayın ortasına ve ay sonrasına konsa da raporun hesapsız bölümleri aynı; kurucu eşiği okumaz", () => {
    const once = HTML({}, "2026-09");
    for (const e of ["2026-09-15", "2027-01-01"]) expect(HTML({ giderAyarlari: { hesapsizBaslangic: e } }, "2026-09")).toBe(once);
    expect(readFileSync("src/lib/giderRaporu.js", "utf-8")).not.toMatch(/hesapsizBaslangic|hesapsizOzeti/);
  });
});

// Spec 0054 AC-34 (Q8): ek ödemenin ayrı hedef olması raporun hiçbir rakamını değiştirmez. Aynı personel kalemi
// dört hedefli satırlarla ve satırsız (0042 öncesi biçim) verildiğinde, aynı ödemelerle belge birebir aynıdır.
describe("Spec 0054 AC-34: ek ödeme hedefleri 0047 raporunu değiştirmez", () => {
  it("dört hedefli ve satırsız personel kalemi aynı belgeyi üretir", () => {
    const P = kayit({ id: 54, tarih: "2026-09-30", turId: 3, calisanId: 7, calisanAd: AD, resmiTutar: 30000, eldenTutar: 20000,
      ekOdemeler: [{ tur: "prim", aciklama: "Prim", resmiTutar: 5000, eldenTutar: 4500 }], sonOdemeTarihi: "2026-10-05" });
    expect(P.taksitler.map(t => t.hedef)).toEqual([HEDEF.ANA, HEDEF.ELDEN, HEDEF.EK_RESMI, HEDEF.EK_ELDEN]);
    const satirsiz = { ...P, taksitler: [] };
    const hareket = (taksitId) => [{ id: 1, tur: "odeme", tarih: "2026-09-30", tutar: 30000, yontem: "Nakit", hesapId: null, giderId: 54, taksitId }];
    const belge = (k, h) => buildGiderKasaRaporuHtml(giderKasaRaporu({ giderler: [k], hareketler: h, turler, tedarikciler, yururlukAy: "2026-01", hesaplar: [] }, "2026-09"));
    expect(belge(P, [])).toBe(belge(satirsiz, []));
    expect(belge(P, hareket(P.taksitler[0].id))).toBe(belge(satirsiz, hareket(null)));
  });
});

// Spec 0058 R7, R15 (AC-9, AC-22): kasa iş listesinden kapsam dışı bırakılan hesapsız kayıtlar raporun hesapsız bölümünde de
// sayılmaz; ekranla (hesapsizOzeti) aynı küme. Parametresiz rapor bugünkü belgeyi birebir verir.
describe("Spec 0058 AC-9 / AC-22: kapsam dışı kayıtlar raporda sayılmaz", () => {
  it("hesapsız ödeme ve avans kapsam dışı bırakılınca rapor sayıları ekranla aynı; boş liste parametresizle birebir", () => {
    const once = R({});
    expect(once.kasa.hesapsiz).toMatchObject({ odemeAdet: 1, avansAdet: 1 });
    const kd = [{ id: 1, tur: "hareket", kaynak: null, kayitId: 104 }, { id: 2, tur: "hareket", kaynak: null, kayitId: 108 }];
    const sonra = R({ kasaKapsamDisi: kd });
    expect(sonra.kasa.hesapsiz).toMatchObject({ odemeAdet: 0, avansAdet: 0, liste: [] });
    const ekran = hesapsizOzeti(H.filter(h => !h.tarih || (h.tarih >= "2026-09-01" && h.tarih <= "2026-09-30")), {}, HESAPLAR, null, kd);
    expect([ekran.odeme.adet, ekran.odeme.avansAdet]).toEqual([sonra.kasa.hesapsiz.odemeAdet, sonra.kasa.hesapsiz.avansAdet]);
    expect(HTML({ kasaKapsamDisi: [] })).toBe(HTML({}));
    expect(sonra.gider.toplam ?? null).toEqual(once.gider.toplam ?? null); // gider tarafı değişmez (R2)
  });
});
