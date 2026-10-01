// Spec 0056: deneme döneminde kasa hesaplarının silinip hareketlerinin taşınması. Motor testleri (kasa.js: dönem kapısı,
// hesapKullanimDetayi, hesapTasimaPlani), bütünlük ve korunan rakamlar. Test adları AC-<n>.
import { describe, it, expect, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { denemeDonemiAcik, denemeDonemiBitisi, DENEME_DONEMI_VARSAYILAN, hesapKullanimi, hesapKullanimDetayi, hesapTasimaPlani,
  hesapBakiyeleri, hesapsizOdemeler, hesapsizTahsilatlar } from "../src/lib/kasa";
import { turHaritasi, odemeleriUygula, odemeDurumu, borcOzeti } from "../src/lib/gider";
import { yerelBugun } from "../src/lib/utils";

const TURLER = [{ id: 4, ad: "Hammadde", davranis: "normal" }];
const turMap = turHaritasi(TURLER);
const hes = (id, ad, o = {}) => ({ id, ad, tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 1000, acilisTarihi: "2026-01-01", kapali: false, ...o });
const HESAPLAR = [hes(51, "Eski Banka"), hes(52, "Yeni Banka"), hes(53, "Kasa", { tur: "kasa" }), hes(54, "Dolar", { paraBirimi: "USD" }), hes(55, "Kapalı", { kapali: true })];
const KALEM = { id: 1, tarih: "2026-09-01", turId: 4, tutar: 500, kdvOrani: 0, tedarikciId: 11, sonOdemeTarihi: "2026-09-30" };
const H = [
  { id: 101, tur: "odeme", tarih: "2026-09-05", tutar: 300, hesapId: 51, giderId: 1, taksitId: null, yontem: "Havale" },
  { id: 102, tur: "avans", tarih: "2026-09-06", tutar: 50, hesapId: 51, calisanId: 7 },
  { id: 103, tur: "mahsup", tarih: "2026-09-07", tutar: 20, hesapId: null, calisanId: 7, giderId: 1 },
  { id: 104, tur: "odeme", tarih: "2026-09-08", tutar: 200, hesapId: null, giderId: 1, yontem: "Çek (ciro)", cekId: 900 },
];
const sv = (id, o = {}) => ({ id, customerId: 500, date: "2026-09-10", type: "Garanti Dışı", repairPlace: "Yerinde Onarım", islemFirma: "Altuntaş Makina",
  servisUcreti: 1000, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", odendi: true, tahsilatTarihi: "2026-09-10", yontem: "Nakit", degisenParcalar: [], hesapId: 51, ...o });
const VERI = {
  customers: [{ id: 500, name: "Kutu Gıda" }], factory: { name: "Altuntaş Makina" },
  payments: [{ id: 201, customerId: 500, tarih: "2026-09-11", tutar: 700, currency: "TRY", yontem: "Havale", hesapId: 51 },
    { id: 202, customerId: 500, tarih: "2026-09-12", tutar: 50, currency: "TRY", yontem: "Havale", hesapId: 51, deletedAt: "2026-09-20T00:00:00Z" }],
  services: [sv(301)], partSales: [{ id: 401, tur: "Kalıp", customerId: 500, ucret: 400, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-09-13", odendi: true, tahsilatTarihi: "2026-09-13", hesapId: 51 }],
  yedekParcaSatislar: [{ id: 501, aliciTipi: "musteri", musteriId: 500, partId: 1, miktar: 1, birimFiyat: 100, currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-09-14", odendi: true, tahsilatTarihi: "2026-09-14", hesapId: 51, tahsisler: [] }],
  cekler: [{ id: 601, yon: "verilen", no: "K-1", banka: "Z", tutar: 250, currency: "TRY", durum: "yazildi", hesapId: 51, gecmis: [] },
    { id: 900, paymentId: 201, no: "C-9", banka: "Z", durum: "ciro", gecmis: [] }],
};
const uygula = (plan, hedefId) => {
  const g = plan.guncelle(hedefId);
  return { hareketler: g.hesapHareketleri(H), veri: { ...VERI, payments: g.payments(VERI.payments), services: g.services(VERI.services), partSales: g.partSales(VERI.partSales),
    yedekParcaSatislar: g.yedekParcaSatislar(VERI.yedekParcaSatislar), cekler: g.cekler(VERI.cekler) } };
};
const hesaplarSilindi = HESAPLAR.filter(h => h.id !== 51);

describe("Spec 0056: dönem kapısı (R1, R2, R4, AC-1, AC-4, AC-27, AC-28)", () => {
  const eskiTZ = process.env.TZ;
  afterEach(() => { process.env.TZ = eskiTZ; });
  it("AC-1 / AC-4: alan yoksa varsayılan 2027-01-01; boş dize kapalı; tarih geçerliyse o tarih", () => {
    expect(DENEME_DONEMI_VARSAYILAN).toBe("2027-01-01");
    expect(denemeDonemiBitisi({})).toBe("2027-01-01");
    expect(denemeDonemiBitisi(undefined)).toBe("2027-01-01");
    expect(denemeDonemiBitisi({ denemeDonemiBitis: "" })).toBeNull();
    expect(denemeDonemiBitisi({ denemeDonemiBitis: "2026-12-15" })).toBe("2026-12-15");
    expect(denemeDonemiAcik({ denemeDonemiBitis: "" }, "2026-10-01")).toBe(false);
    expect(denemeDonemiAcik({}, "2026-10-01")).toBe(true);
  });
  it("AC-28: bitiş günü (o gün dahil) dönem kapalı; önceki gün açık", () => {
    expect(denemeDonemiAcik({}, "2026-12-31")).toBe(true);
    expect(denemeDonemiAcik({}, "2027-01-01")).toBe(false);
    expect(denemeDonemiAcik({}, "2027-03-01")).toBe(false);
  });
  it("AC-27: kapı tek saf fonksiyondan ve yerelBugun ile; İstanbul'da gece 01:00'de dünün tarihine düşmez", () => {
    process.env.TZ = "Europe/Istanbul";
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-31T22:30:00Z")); // İstanbul'da 1 Ocak 2027 01:30; UTC'de hâlâ 31 Aralık
    expect(new Date().toISOString().slice(0, 10)).toBe("2026-12-31");
    expect(yerelBugun()).toBe("2027-01-01");
    expect(denemeDonemiAcik({})).toBe(false); // varsayılan bugun = yerelBugun()
    vi.setSystemTime(new Date("2026-12-31T20:30:00Z")); // İstanbul 23:30, 31 Aralık
    expect(denemeDonemiAcik({})).toBe(true);
    vi.useRealTimers();
    const kasa = readFileSync("src/components/Kasa.jsx", "utf-8");
    expect(kasa).toMatch(/denemeDonemiAcik\(giderAyarlari, bugun\)/);
    expect(kasa).not.toMatch(/denemeDonemiBitis\s*[<>]|bitis\s*>\s*bugun|today\(\)\s*</);
  });
});

describe("Spec 0056: sayım (R7, R22, AC-7, AC-25, AC-29)", () => {
  it("AC-7 / AC-29: kırılım türüyle; toplam hesapKullanimi'ne eşit; çöpteki tahsilat sayılmaz", () => {
    const d = hesapKullanimDetayi(51, H, VERI);
    expect(d).toMatchObject({ odeme: 1, virman: 0, avans: 1, payments: 1, servis: 1, kalip: 1, yedekParca: 1, verilenCek: 1, toplam: 7 });
    expect(d.toplam).toBe(hesapKullanimi(51, H, VERI));
    const vir = [...H, { id: 110, tur: "virman", tarih: "2026-09-09", tutar: 10, hesapId: 52, karsiHesapId: 51 }];
    expect(hesapKullanimDetayi(51, vir, VERI).virman).toBe(1);
    expect(hesapKullanimDetayi(51, vir, VERI).toplam).toBe(hesapKullanimi(51, vir, VERI));
  });
  it("AC-25: mahsup ve ciro hareketleri sayımda ve taşımada yok", () => {
    const d = hesapKullanimDetayi(51, H, VERI);
    expect(d.odeme).toBe(1); // ciro hareketi 104 hesapsız
    const { hareketler } = uygula(hesapTasimaPlani(HESAPLAR[0], H, VERI, HESAPLAR), 52);
    expect(hareketler.find(m => m.id === 103)).toEqual(H[2]);
    expect(hareketler.find(m => m.id === 104)).toEqual(H[3]);
  });
});

describe("Spec 0056: taşıma (R8, R10, R17, R21, R27, AC-8, AC-10–AC-12, AC-19, AC-26)", () => {
  it("AC-8 / AC-19: hedef yalnız açık ve aynı para biriminde; verilen çek varken yalnız TL banka", () => {
    const p = hesapTasimaPlani(HESAPLAR[0], H, VERI, HESAPLAR);
    expect(p.uygunHedefler.map(h => h.id)).toEqual([52]); // 53 kasa (verilen çek), 54 USD, 55 kapalı
    const cekSiz = { ...VERI, cekler: VERI.cekler.filter(c => c.yon !== "verilen") };
    expect(hesapTasimaPlani(HESAPLAR[0], H, cekSiz, HESAPLAR).uygunHedefler.map(h => h.id)).toEqual([52, 53]);
    const usd = hesapTasimaPlani(HESAPLAR[3], [], {}, HESAPLAR);
    expect(usd.uygunHedefler).toEqual([]);
    expect(usd.nedenler.tasi).toEqual(["USD para biriminde açık başka hesap yok."]);
  });
  it("AC-12 / AC-10 / AC-26: altı bağ türü taşınır (çöpteki dahil, R27); kayıt sayısı aynı; ciro edilmiş çek ve başka alanlar değişmez", () => {
    const { hareketler, veri } = uygula(hesapTasimaPlani(HESAPLAR[0], H, VERI, HESAPLAR), 52);
    expect(hareketler.filter(m => m.hesapId === 51)).toEqual([]);
    expect([hareketler.find(m => m.id === 101).hesapId, hareketler.find(m => m.id === 102).hesapId]).toEqual([52, 52]);
    for (const k of ["payments", "services", "partSales", "yedekParcaSatislar"]) {
      expect(veri[k].every(r => r.hesapId === 52), k).toBe(true);
      expect(veri[k]).toHaveLength(VERI[k].length);
    }
    expect(veri.payments.find(p => p.id === 202).hesapId).toBe(52); // çöpteki de taşındı
    expect(veri.cekler.find(c => c.id === 601).hesapId).toBe(52);
    expect(veri.cekler.find(c => c.id === 900)).toEqual(VERI.cekler[1]);
    expect(hareketler).toHaveLength(H.length);
    const { hesapId: _a, ...once } = H[0], { hesapId: _b, ...sonra } = hareketler[0];
    expect(sonra).toEqual(once);
    expect(hesapKullanimi(51, hareketler, veri)).toBe(0);
  });
  it("AC-8 / AC-11 / C1: hedef bakiyesi taşınan hareketler kadar değişir; kalem ödeme durumu ve borç aynı", () => {
    const once = hesapBakiyeleri(HESAPLAR, H, VERI).get("52").bakiyeK;
    const eskiK = hesapBakiyeleri(HESAPLAR, H, VERI).get("51");
    const { hareketler, veri } = uygula(hesapTasimaPlani(HESAPLAR[0], H, VERI, HESAPLAR), 52);
    const sonra = hesapBakiyeleri(hesaplarSilindi, hareketler, veri).get("52").bakiyeK;
    expect(sonra - once).toBe(eskiK.bakiyeK - 100000); // eski hesabın hareket etkisi (açılış bakiyesi taşınmaz, R21)
    expect(odemeDurumu(odemeleriUygula([KALEM], hareketler, turMap)[0])).toBe(odemeDurumu(odemeleriUygula([KALEM], H, turMap)[0]));
    expect(borcOzeti([KALEM], { turler: TURLER }, "2026-09-30")).toEqual(borcOzeti([KALEM], { turler: TURLER }, "2026-09-30"));
    expect(borcOzeti(odemeleriUygula([KALEM], hareketler, turMap), { turler: TURLER }, "2026-09-30"))
      .toEqual(borcOzeti(odemeleriUygula([KALEM], H, turMap), { turler: TURLER }, "2026-09-30"));
  });
});

describe("Spec 0056: hesapsız bırakma (R9, R18, R19, AC-9, AC-20–AC-22)", () => {
  const cekSiz = { ...VERI, cekler: VERI.cekler.filter(c => c.yon !== "verilen") };
  it("AC-9: kayıtlar hesapsız kalır, hiçbir bakiyeye girmez ve hesapsız listelerinde görünür", () => {
    const plan = hesapTasimaPlani(HESAPLAR[0], H, cekSiz, HESAPLAR);
    expect(plan.nedenler.hesapsiz).toEqual([]);
    const g = plan.guncelle(null);
    const hareketler = g.hesapHareketleri(H);
    const veri = { ...cekSiz, services: g.services(cekSiz.services), partSales: g.partSales(cekSiz.partSales), yedekParcaSatislar: g.yedekParcaSatislar(cekSiz.yedekParcaSatislar), payments: g.payments(cekSiz.payments) };
    expect(hesapsizOdemeler(hareketler)).toMatchObject({ adet: 1, avansAdet: 1 });
    expect(hesapsizTahsilatlar(veri, hesaplarSilindi).liste.map(k => k.kayit.id).sort()).toEqual([301, 401, 501]);
    const b = hesapBakiyeleri(hesaplarSilindi, hareketler, veri);
    expect([...b.values()].map(x => x.bakiyeK)).toEqual(hesaplarSilindi.map(h => Math.round(h.acilisBakiyesi * 100) * (h.paraBirimi ? 1 : 1)));
  });
  it("AC-20 / AC-21: virman hesapsız bırakılamaz; hedef karşı bacak olamaz; uygun hedef kalmazsa taşıma da nedenli reddedilir", () => {
    const vir = [{ id: 110, tur: "virman", tarih: "2026-09-09", tutar: 10, hesapId: 52, karsiHesapId: 51 }];
    const iki = [hes(51, "Eski Banka"), hes(52, "Yeni Banka")];
    const p = hesapTasimaPlani(iki[0], vir, {}, iki, { hesapAdi: (id) => iki.find(h => h.id === id)?.ad, tarihYaz: () => "09/09/2026" });
    expect(p.uygunHedefler).toEqual([]);
    expect(p.nedenler.hesapsiz).toEqual(["09/09/2026 virmanı (Yeni Banka ↔ Eski Banka): virman hesapsız bırakılamaz; önce bu virmanı silin."]);
    expect(p.nedenler.tasi).toEqual(["09/09/2026 virmanı (Yeni Banka ↔ Eski Banka): hedef virmanın karşı hesabı olamaz; önce bu virmanı silin."]);
    // Üçüncü bir hesap varsa virman ona taşınır; iki bacak da var olan hesaplarda kalır (tek bacaklı virman yok).
    const uc = [...iki, hes(56, "Üçüncü")];
    const p3 = hesapTasimaPlani(uc[0], vir, {}, uc);
    expect(p3.uygunHedefler.map(h => h.id)).toEqual([56]);
    const yeni = p3.guncelle(56).hesapHareketleri(vir);
    expect(yeni[0]).toMatchObject({ hesapId: 52, karsiHesapId: 56 });
    const kalan = uc.filter(h => h.id !== 51);
    const b = hesapBakiyeleri(kalan, yeni, {});
    expect(b.get("52").bakiyeK + b.get("56").bakiyeK).toBe(200000); // virman kalan iki hesap arasında, toplam açılışa eşit
  });
  it("AC-22: verilen çeki olan hesapta hedef yalnız açık TL banka; değilse ve hesapsız bırakmada ret", () => {
    const yalnizKasa = [hes(51, "Eski Banka"), hes(53, "Kasa", { tur: "kasa" })];
    const p = hesapTasimaPlani(yalnizKasa[0], [], VERI, yalnizKasa);
    expect(p.uygunHedefler).toEqual([]);
    expect(p.nedenler.tasi).toEqual(["Verilen çek K-1: yalnız açık bir TL banka hesabına taşınabilir."]);
    expect(p.nedenler.hesapsiz).toEqual(["Verilen çek K-1: hesapsız bırakılamaz; bir TL banka hesabına taşıyın."]);
  });
});

describe("Spec 0056: dönemin bitmesi (R5, AC-5)", () => {
  it("AC-5: dönem kapısı yalnız bir karar döndürür; plan ve sayım dönemden bağımsızdır (veri değişmez)", () => {
    const once = JSON.stringify({ H, VERI, HESAPLAR });
    denemeDonemiAcik({}, "2027-02-01");
    hesapTasimaPlani(HESAPLAR[0], H, VERI, HESAPLAR);
    expect(JSON.stringify({ H, VERI, HESAPLAR })).toBe(once);
  });
});
