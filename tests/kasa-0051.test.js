// Spec 0051: hesapsız kayıtlarda başlangıç tarihi (A) ve ödemenin hangi hedefi kapattığı (B). Motor testleri, AC adlı.
import { describe, it, expect } from "vitest";
import { hesapsizOzeti, hesapsizOdemeler, hesapsizTahsilatlar, hesapsizBaslangicDogrula, hesapBakiyeleri, hareketOzeti, calisanEkstresi } from "../src/lib/kasa";
import { hareketHedefPaylari, hareketPaylari } from "../src/lib/odemeYontemi";
import { turHaritasi, odemeleriUygula } from "../src/lib/gider";

const turler = [{ id: 1, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }, { id: 4, ad: "Hammadde", davranis: "normal" }];
const turMap = turHaritasi(turler);
const HESAPLAR = [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, kapali: false },
  { id: 52, ad: "Dolar", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 0, kapali: false }];
const od = (id, tarih, o = {}) => ({ id, tur: "odeme", tarih, tutar: 100, hesapId: null, giderId: 1, taksitId: null, ...o });
const HAREKETLER = [
  od(1, "2026-05-10"), od(2, "2026-07-10"), od(3, null, { kaynak: "goc", tamKapatir: true, tutar: null }), od(4, "2026-05-11", { kaynak: "goc" }),
  { id: 5, tur: "avans", tarih: "2026-05-01", tutar: 50, calisanId: 21, hesapId: null }, { id: 6, tur: "avans", tarih: "2026-08-01", tutar: 50, calisanId: 21, hesapId: null },
  od(7, "2026-05-02", { cekId: 900, yontem: "Çek (ciro)" }), od(8, "2026-08-02", { cekId: 901, yontem: "Çek (kendi)" }),
  od(9, "2026-05-03", { hesapId: 51 }),
];
const sv = (id, date, o = {}) => ({ id, customerId: 500, date, type: "Garanti Dışı", repairPlace: "Yerinde Onarım", islemFirma: "Altuntaş Makina", servisUcreti: 1000,
  currency: "TRY", faturaTipi: "Faturalı Yurtiçi", odendi: true, tahsilatTarihi: date, yontem: "Nakit", degisenParcalar: [], hesapId: null, ...o });
const VERI = { customers: [{ id: 500, name: "Kutu Gıda" }], factory: { name: "Altuntaş Makina" },
  services: [sv(11, "2026-05-05"), sv(12, "2026-07-05"), sv(13, "2026-05-06", { hesapId: 999 }), sv(14, "2026-05-07", { hesapId: 52 }), sv(15, "2026-07-07", { hesapId: 52 })] };
const ESIK = "2026-06-01";

describe("Spec 0051 A: hesapsız kayıtlarda başlangıç tarihi", () => {
  it("AC-2 / AC-19: eşiksiz özet bugünkü sayıları birebir verir; eşiksiz çağrılar değişmedi", () => {
    const o = hesapsizOzeti(HAREKETLER, VERI, HESAPLAR, null);
    const eski = hesapsizOdemeler(HAREKETLER);
    expect({ adet: o.odeme.adet, gocAdet: o.odeme.gocAdet, avansAdet: o.odeme.avansAdet }).toEqual(eski);
    expect(eski).toEqual({ adet: 4, gocAdet: 2, avansAdet: 2 }); // ciro ve kendi çek hariç (AC-24), hesaplı hariç
    expect(o.tahsilat).toEqual(hesapsizTahsilatlar(VERI, HESAPLAR));
    expect(o.gizli.toplam).toBe(0);
  });
  it("AC-3 / AC-4 / AC-5 / AC-23 / AC-18: eşikten önceki ödeme, avans ve tahsilat gizlenir; sayılar liste ile uyuşur; tarihsiz kalır", () => {
    const o = hesapsizOzeti(HAREKETLER, VERI, HESAPLAR, ESIK);
    expect(o.odeme.liste.map(m => m.id).sort()).toEqual([2, 3, 6]);
    expect(o.odeme.adet + o.odeme.avansAdet).toBe(o.odeme.liste.length);
    expect(o.odeme).toMatchObject({ adet: 2, gocAdet: 1, avansAdet: 1 }); // tarihsiz göç hareketi görünür (R12)
    expect(o.tahsilat.liste.map(k => k.kayit.id)).toEqual([15, 12]);
    expect(o.tahsilat.adet).toBe(o.tahsilat.liste.length);
    expect(o.tarihsiz).toBe(1);
  });
  it("AC-25 / AC-6: gizlenenler nedene göre sayılır (ödeme, avans, hesapsız, silinmiş hesap, para birimi)", () => {
    const o = hesapsizOzeti(HAREKETLER, VERI, HESAPLAR, ESIK);
    expect(o.gizli).toEqual({ odeme: 2, avans: 1, tahsilat: { hesapsiz: 1, hesapYok: 1, paraBirimi: 1 }, toplam: 6 });
  });
  it("AC-24: ciro ve kendi çek hareketleri listede hiç yok; eşik onları etkilemez", () => {
    for (const esik of [null, ESIK]) expect(hesapsizOzeti(HAREKETLER, VERI, HESAPLAR, esik).odeme.liste.some(m => m.cekId != null)).toBe(false);
  });
  it("AC-7 / AC-8: eşik kaydı silmez, hesapsız bırakır; bakiye eşikten bağımsız ve aynı", () => {
    const once = JSON.stringify(HAREKETLER);
    const b1 = hesapBakiyeleri(HESAPLAR, HAREKETLER, VERI).get("51").bakiyeK;
    hesapsizOzeti(HAREKETLER, VERI, HESAPLAR, ESIK);
    expect(JSON.stringify(HAREKETLER)).toBe(once);
    expect(hesapBakiyeleri(HESAPLAR, HAREKETLER, VERI).get("51").bakiyeK).toBe(b1);
  });
  it("AC-20: yalnız başlangıç verilen çağrı üst sınırsız çalışır; iki sınırlı (0047) çağrı tarihsizi bugünkü gibi dışlar", () => {
    expect(hesapsizOdemeler(HAREKETLER, { baslangic: ESIK }).liste.map(m => m.id).sort()).toEqual([2, 6]);
    const ay = { baslangic: "2026-05-01", bitis: "2026-05-31" };
    expect(hesapsizOdemeler(HAREKETLER, ay).liste.map(m => m.id).sort()).toEqual([1, 4, 5]);
    expect(hareketOzeti(HAREKETLER, ay).odeme.adet).toBe(4); // 0047 hareket özeti: ay içindeki 4 ödeme (hesaplı ve çekli dahil), tarihsiz hariç
  });
  it("R15 / AC-9: doğrulama: boş = eşik yok; biçimsiz, takvimde olmayan ve gelecek tarih reddedilir; geçmiş serbest", () => {
    expect(hesapsizBaslangicDogrula("", "2026-09-30")).toEqual({ deger: "" });
    expect(hesapsizBaslangicDogrula("2026-02-30", "2026-09-30").hata).toMatch(/geçersiz/);
    expect(hesapsizBaslangicDogrula("30.09.2026", "2026-09-30").hata).toMatch(/geçersiz/);
    expect(hesapsizBaslangicDogrula("2026-10-01", "2026-09-30").hata).toMatch(/gelecekte olamaz/);
    expect(hesapsizBaslangicDogrula("2020-01-01", "2026-09-30")).toEqual({ deger: "2020-01-01" });
    expect(hesapsizBaslangicDogrula("2026-09-30", "2026-09-30")).toEqual({ deger: "2026-09-30" });
  });
});

// ── B: hedef payları ──────────────────────────────────────────────────────────
const KIRA_SATIRLI = { id: 20, tarih: "2026-09-01", turId: 1, tutar: 10000, kdvOrani: 0, stopajOrani: 20, tedarikciId: 11,
  taksitler: [{ id: 201, hedef: "ana", sira: 1, vade: "2026-09-30", tutar: 8000 }, { id: 202, hedef: "stopaj", sira: 1, vade: "2026-10-26", tutar: 2000 }] };
const KIRA_SATIRSIZ = { id: 21, tarih: "2026-09-01", turId: 1, tutar: 10000, kdvOrani: 0, stopajOrani: 20, tedarikciId: 11 };
const PERS = { id: 22, tarih: "2026-09-01", turId: 3, calisanId: 7, resmiTutar: 30000, eldenTutar: 10000, ekOdemeler: [] };
const NORMAL = { id: 23, tarih: "2026-09-01", turId: 4, tutar: 5000, kdvOrani: 0, tedarikciId: 11 };
const h = (id, giderId, tutar, o = {}) => ({ id, tur: "odeme", tarih: "2026-09-20", tutar, hesapId: 51, giderId, taksitId: null, ...o });

describe("Spec 0051 B: ödemenin kapattığı hedef (hareketHedefPaylari)", () => {
  it("AC-11 / AC-12: satırlı kirada stopaj taksidine ödeme vergi dairesini, ana taksite ödeme kiraya vereni kapatır", () => {
    const m = hareketHedefPaylari(KIRA_SATIRLI, [h(1, 20, 2000, { taksitId: 202 }), h(2, 20, 8000, { taksitId: 201 })], turMap);
    expect(m.get("1")).toEqual([{ hedef: "stopaj", payK: 200000 }]);
    expect(m.get("2")).toEqual([{ hedef: "ana", payK: 800000 }]);
  });
  it("AC-26 / AC-27: satırsız kirada taksit bağı olmayan ödeme motorun dağıtımıyla çözülür; iki hedefe bölünürse ikisi", () => {
    const m = hareketHedefPaylari(KIRA_SATIRSIZ, [h(1, 21, 9000), h(2, 21, 1000)], turMap);
    expect(m.get("1")).toEqual([{ hedef: "ana", payK: 800000 }, { hedef: "stopaj", payK: 100000 }]);
    expect(m.get("2")).toEqual([{ hedef: "stopaj", payK: 100000 }]);
  });
  it("AC-13 / AC-28: satırsız iki hedefli personel: ödeme önce resmiye, artanı eldene; mahsup da hedefiyle", () => {
    const m = hareketHedefPaylari(PERS, [h(1, 22, 35000), { id: 2, tur: "mahsup", tarih: "2026-09-25", tutar: 2000, calisanId: 7, giderId: 22, hesapId: null }], turMap);
    expect(m.get("1")).toEqual([{ hedef: "ana", payK: 3000000 }, { hedef: "elden", payK: 500000 }]);
    expect(m.get("2")).toEqual([{ hedef: "elden", payK: 200000 }]);
  });
  it("AC-15 / R11: tutarsız göç hareketi bütün hedeflere dağılır; fazla ödeme payı olmayan boş dizi alır; kalem yoksa boş", () => {
    const m = hareketHedefPaylari(KIRA_SATIRSIZ, [h(1, 21, null, { tamKapatir: true, kaynak: "goc" }), h(2, 21, 500)], turMap);
    expect(m.get("1")).toEqual([{ hedef: "ana", payK: 800000 }, { hedef: "stopaj", payK: 200000 }]);
    expect(m.get("2")).toEqual([]);
    expect(hareketHedefPaylari(null, [h(1, 21, 10)], turMap).size).toBe(0);
  });
  it("AC-14 / C2: normal kalemde tek hedef; toplam pay hareketPaylari ile aynı (ikinci hesap yok)", () => {
    const hs = [h(1, 23, 2000), h(2, 23, 3000)];
    const m = hareketHedefPaylari(NORMAL, hs, turMap);
    expect(m.get("1")).toEqual([{ hedef: "ana", payK: 200000 }]);
    for (const p of hareketPaylari(NORMAL, hs, turMap)) expect(m.get(String(p.hareket.id)).reduce((a, x) => a + x.payK, 0)).toBe(p.payK);
  });
  it("triyaj: aynı gün girilen ödemelerde sıra motorla aynı (giriş sırası, kimlik değil); etiket motorun dağılımıyla uyuşur", () => {
    const P = { id: 30, tarih: "2026-09-01", turId: 3, calisanId: 7, resmiTutar: 1000, eldenTutar: 500, ekOdemeler: [] };
    const hs = [h(9, 30, 1000), h(3, 30, 500)]; // önce 1.000 girildi; ikinci ödemenin kimliği daha küçük
    const m = hareketHedefPaylari(P, hs, turMap);
    expect(m.get("9")).toEqual([{ hedef: "ana", payK: 100000 }]);
    expect(m.get("3")).toEqual([{ hedef: "elden", payK: 50000 }]);
    // Motorun kendisi: ilk ödeme resmiyi kapatır (yalnız ilk hareketle ana tamamen ödenmiş, elden açık).
    const yalnizIlk = odemeleriUygula([P], [hs[0]], turMap)[0];
    expect(yalnizIlk._odenen).toEqual({ ana: 100000, elden: 0 });
  });
  it("AC-17: çalışan ekstresinin ödeme satırı hedef paylarını taşır (satırsız personelde de)", () => {
    const e = calisanEkstresi(7, { giderler: [PERS], hareketler: [h(1, 22, 35000)], turler });
    expect(e.satirlar.find(s => s.tur === "odeme").hedefPaylari).toEqual([{ hedef: "ana", payK: 3000000 }, { hedef: "elden", payK: 500000 }]);
  });
});
