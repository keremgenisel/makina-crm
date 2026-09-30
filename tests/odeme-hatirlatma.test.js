// Spec 0003: ödeme hatırlatıcısı saf hesabı (src/lib/odemeHatirlatma.js).
import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from "vitest";
import {
  odemeHatirlatmalari, gunFarki, gunEkle, hatirlatmaEsikDogrula, hatirlatmaEsigi, vadeEtiketi, gunFarkiMetni,
} from "../src/lib/odemeHatirlatma";
import { vadesiGectiMi, odemeleriUygula, turHaritasi } from "../src/lib/gider";
import { yerelBugun, today } from "../src/lib/utils";

const BUGUN = "2026-09-24";
const TUR = [{ id: 1, ad: "Genel", davranis: "normal" }, { id: 2, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Personel", davranis: "personel" }];
const TED = [{ id: 11, ad: "Demir Bant" }];
const k = (id, o = {}) => ({ id, tarih: "2026-09-01", turId: 1, tutar: 10000, kdvOrani: 20, odendi: false, tedarikciId: 11, sonOdemeTarihi: gunEkle(BUGUN, 3), ...o });
const hesap = (giderler, o = {}) => odemeHatirlatmalari(giderler, { turler: TUR, tedarikciler: TED, yururlukAy: "2026-01", esikGun: 7, ...o }, o.bugun || BUGUN);
const idler = (r) => [...r.kalemIdleri].map(Number).sort((a, b) => a - b);

describe("kapsam ve sınıflama (R1, R7)", () => {
  it("AC-1: eşik 7 iken +3 gün vadeli ödenmemiş kalem sayılır", () => { expect(hesap([k(1)]).sayilar).toEqual({ gecmis: 0, yaklasan: 1 }); });
  it("AC-2: +10 gün vadeli kalem sayılmaz", () => { expect(hesap([k(1, { sonOdemeTarihi: gunEkle(BUGUN, 10) })]).kalemIdleri.size).toBe(0); });
  it("AC-3: dün vadeli kalem 'vadesi geçmiş' bölümünde", () => {
    const r = hesap([k(1, { sonOdemeTarihi: gunEkle(BUGUN, -1) })]);
    expect(r.sayilar).toEqual({ gecmis: 1, yaklasan: 0 });
    expect(r.gecmis[0].gunFarki).toBe(-1);
  });
  it("AC-4 / AC-26: bugün vadeli kalem geçmiş değil, yaklaşan sayılır ve 'bugün' etiketi alır", () => {
    const r = hesap([k(1, { sonOdemeTarihi: BUGUN })]);
    expect(r.sayilar).toEqual({ gecmis: 0, yaklasan: 1 });
    expect(gunFarkiMetni(r.yaklasan[0].gunFarki)).toBe("bugün");
  });
  it("AC-5: ödendi işaretli kalem vadesi geçmiş olsa bile yok", () => { expect(hesap([k(1, { odendi: true, sonOdemeTarihi: "2026-01-01" })]).kalemIdleri.size).toBe(0); });
  it("AC-7: son ödeme tarihi olmayan kalem yok", () => { expect(hesap([k(1, { sonOdemeTarihi: "" })]).kalemIdleri.size).toBe(0); });
  it("AC-8: Çek yöntemli, vadesi +3 gün kalem kapsamda ve 'Çek vadesi' adıyla", () => {
    const r = hesap([k(1, { odemeYontemi: "Çek" })]);
    expect(r.yaklasan[0].vadeEtiketi).toBe("Çek vadesi");
    expect(vadeEtiketi({ odemeYontemi: "Havale" })).toBe("Son ödeme");
  });
  it("AC-11: eşik 15'te +10 gün vadeli kalem girer", () => { expect(hesap([k(1, { sonOdemeTarihi: gunEkle(BUGUN, 10) })], { esikGun: 15 }).kalemIdleri.size).toBe(1); });
  it("AC-12: eşik 0'da yalnız geçmiş ve bugün", () => {
    const r = hesap([k(1, { sonOdemeTarihi: gunEkle(BUGUN, -2) }), k(2, { sonOdemeTarihi: BUGUN }), k(3, { sonOdemeTarihi: gunEkle(BUGUN, 1) })], { esikGun: 0 });
    expect(idler(r)).toEqual([1, 2]);
  });
  it("AC-18: 10.000 + %20 KDV → ödenecek 12.000; kira stopajı düşülür", () => {
    const r = hesap([k(1), k(2, { turId: 2, tutar: 20000, stopajOrani: 20, kdvOrani: 0 })]);
    expect(r.yaklasan.find(o => o.id === 1).odenecek).toBe(12000);
    expect(r.yaklasan.find(o => o.id === 2).odenecek).toBe(16000);
  });
  it("AC-19: çöpteki kalem yok; geri alınınca var", () => {
    expect(hesap([k(1, { deletedAt: "x" })]).kalemIdleri.size).toBe(0);
    expect(hesap([k(1)]).kalemIdleri.size).toBe(1);
  });
  it("AC-20: yürürlük ayından önceki, vadesi geçmiş kalem yok", () => {
    expect(hesap([k(1, { tarih: "2025-12-20", sonOdemeTarihi: "2026-01-05" })]).kalemIdleri.size).toBe(0);
  });
  it("AC-21: gider tarihi gelecekte olan kalem yok; o gün gelince var (H7)", () => {
    const g = [k(1, { tarih: gunEkle(BUGUN, 1), sonOdemeTarihi: gunEkle(BUGUN, 2) })];
    expect(hesap(g).kalemIdleri.size).toBe(0);
    expect(hesap(g, { bugun: gunEkle(BUGUN, 1) }).kalemIdleri.size).toBe(1);
  });
  it("plan H4: ödenecek tutarı 0 olan kalem borç özetindeki gibi atlanır", () => { expect(hesap([k(1, { tutar: 0 })]).kalemIdleri.size).toBe(0); });
  it("AC-22 (motor): dün 'bugün' olan kalem ertesi gün vadesi geçmişe geçer", () => {
    const g = [k(1, { sonOdemeTarihi: BUGUN })];
    expect(hesap(g).sayilar).toEqual({ gecmis: 0, yaklasan: 1 });
    expect(hesap(g, { bugun: gunEkle(BUGUN, 1) }).sayilar).toEqual({ gecmis: 1, yaklasan: 0 });
  });
});

describe("sıra ve personel (R3, AC-9, AC-17, plan H5)", () => {
  it("AC-9: vade artan, eşitse ödenecek tutar azalan, eşitse kimlik; iki çalıştırma aynı", () => {
    const g = [k(5, { sonOdemeTarihi: gunEkle(BUGUN, 2), tutar: 100 }), k(3, { sonOdemeTarihi: gunEkle(BUGUN, 2), tutar: 100 }),
      k(4, { sonOdemeTarihi: gunEkle(BUGUN, 2), tutar: 900 }), k(1, { sonOdemeTarihi: gunEkle(BUGUN, 1) })];
    expect(hesap(g).yaklasan.map(o => o.id)).toEqual([1, 4, 3, 5]);
    expect(hesap([...g].reverse()).yaklasan.map(o => o.id)).toEqual([1, 4, 3, 5]);
  });
  it("AC-17: personel kalemleri bölüm başına tek satırda, adet ve toplamla; adlar alt kalemlerde", () => {
    const g = [k(1, { turId: 3, calisanId: 7, calisanAd: "Hasan", resmiTutar: 30000, eldenTutar: 5000, tedarikciId: null }),
      k(2, { turId: 3, calisanId: 8, calisanAd: "Ayşe", resmiTutar: 20000, eldenTutar: 0, tedarikciId: null, sonOdemeTarihi: gunEkle(BUGUN, 1) }), k(3)];
    const r = hesap(g);
    const p = r.yaklasanSatirlar.filter(s => s.tur === "personel");
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ adet: 2, odenecek: 55000 });
    expect(p[0].kalemler.map(o => o.taraf)).toEqual(["Ayşe", "Hasan"]);
    expect(r.yaklasanSatirlar.filter(s => s.tur === "kalem").map(s => s.taraf)).toEqual(["Demir Bant"]);
    expect(r.sayilar.yaklasan).toBe(3); // sayılar kalem sayar (H5)
  });
  it("triyaj bulgu 4: bölüm satırlarında aynı vadeli kalemler hesap sırasını korur, personel satırı sonra gelir; kullanılmayan alan yok", () => {
    const v = gunEkle(BUGUN, 2);
    const g = [k(1, { sonOdemeTarihi: v, tutar: 100 }), k(2, { sonOdemeTarihi: v, tutar: 900 }),
      k(3, { turId: 3, calisanId: 7, calisanAd: "Hasan", resmiTutar: 99999, eldenTutar: 0, tedarikciId: null, sonOdemeTarihi: v }), k(4, { sonOdemeTarihi: v, tutar: 500 })];
    const satirlar = hesap(g).yaklasanSatirlar;
    expect(satirlar.map(s => (s.tur === "personel" ? "P" : s.id))).toEqual([2, 4, 1, "P"]);
    expect(satirlar.find(s => s.tur === "personel")).not.toHaveProperty("odenecekK");
  });
  it("AC-10 (motor): satır tarafı, ödenecek tutarı, vadeyi ve gün farkını taşır; tedarikçisizde 'Tedarikçi seçilmemiş'", () => {
    const r = hesap([k(1), k(2, { tedarikciId: null })]);
    expect(r.yaklasan[0]).toMatchObject({ taraf: "Demir Bant", odenecek: 12000, vade: gunEkle(BUGUN, 3), gunFarki: 3 });
    expect(r.yaklasan[1].taraf).toBe("Tedarikçi seçilmemiş");
  });
});

describe("C2: vade kuralı yeniden yazılmadı", () => {
  it("vadesi geçmiş kümesi, kapsamdaki kalemlerde vadesiGectiMi true olanlarla birebir aynı", () => {
    const g = Array.from({ length: 60 }, (_, i) => k(i + 1, { sonOdemeTarihi: gunEkle(BUGUN, (i % 21) - 10), odendi: i % 7 === 0, tutar: 100 + i }));
    const r = hesap(g, { esikGun: 30 });
    const beklenen = g.filter(x => r.kalemIdleri.has(String(x.id)) && vadesiGectiMi(x, BUGUN)).map(x => x.id);
    expect(r.gecmis.map(o => o.id).sort((a, b) => a - b)).toEqual(beklenen.sort((a, b) => a - b));
  });
});

describe("gün sınırı ve saat dilimi (C3, plan H1/H10)", () => {
  afterEach(() => { vi.useRealTimers(); });
  it("gunFarki ay sonu, artık yıl ve yaz saati geçişlerinde tam gün", () => {
    expect(gunFarki("2026-01-31", "2026-03-01")).toBe(29);
    expect(gunFarki("2028-02-28", "2028-03-01")).toBe(2);
    expect(gunFarki("2026-03-28", "2026-03-30")).toBe(2);
    expect(gunFarki("2026-10-24", "2026-10-26")).toBe(2);
    expect(gunEkle("2026-12-30", 3)).toBe("2027-01-02");
  });
});

// Triyaj bulgu 2: CI UTC'de çalışır ve orada today() ile yerelBugun() aynı sonucu verir; test saat dilimini
// sabitlemezse today()'e geri dönen bir hata CI'da yakalanmazdı. Bu blok TZ=Europe/Istanbul'u kendisi kurar
// (Node, process.env.TZ atamasını anında uygular), ön koşulu doğrular ve sonunda eski değeri geri yükler.
describe("gün sınırı: Europe/Istanbul saat diliminde gece yarısı (C3, plan H1)", () => {
  let eskiTZ;
  beforeAll(() => { eskiTZ = process.env.TZ; process.env.TZ = "Europe/Istanbul"; });
  afterAll(() => { if (eskiTZ === undefined) delete process.env.TZ; else process.env.TZ = eskiTZ; });
  afterEach(() => { vi.useRealTimers(); });
  const ISTANBUL_0030 = Date.UTC(2026, 8, 24, 21, 30, 0); // İstanbul'da 25 Eylül 00:30

  it("ön koşul: saat dilimi gerçekten İstanbul (UTC+3)", () => {
    expect(new Date(ISTANBUL_0030).getHours()).toBe(0);
    expect(new Date(ISTANBUL_0030).getDate()).toBe(25);
  });
  it("00:30'da today() UTC günü (24), yerelBugun() yerel günü (25) verir", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(ISTANBUL_0030);
    expect(today()).toBe("2026-09-24");
    expect(yerelBugun()).toBe("2026-09-25");
  });
  it("hatırlatıcı yerel güne bakar: 24 Eylül vadeli kalem 25 Eylül 00:30'da vadesi geçmiş sayılır", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(ISTANBUL_0030);
    const r = hesap([k(1, { sonOdemeTarihi: "2026-09-24" })], { bugun: yerelBugun() });
    expect(r.sayilar).toEqual({ gecmis: 1, yaklasan: 0 });
  });
});

describe("eşik ayarı (R5, AC-23)", () => {
  it("AC-23: negatif, 365 üstü ve sayı olmayan değer reddedilir, neden döner", () => {
    for (const v of ["-1", "366", "abc", "7,5", ""]) expect(hatirlatmaEsikDogrula(v).hata).toBeTruthy();
    expect(hatirlatmaEsikDogrula("0")).toEqual({ deger: 0 });
    expect(hatirlatmaEsikDogrula("365")).toEqual({ deger: 365 });
  });
  it("kayıtlı değer yoksa veya bozuksa varsayılan 7", () => {
    expect(hatirlatmaEsigi({})).toBe(7);
    expect(hatirlatmaEsigi({ hatirlatmaEsikGun: 999 })).toBe(7);
    expect(hatirlatmaEsigi({ hatirlatmaEsikGun: 0 })).toBe(0);
  });
});

describe("ödendi dönüşümü (R6, plan H8)", () => {
  // Spec 0024 triyaj bulgu 3: ödeme işaretle değil hareketle; silinince kalem kapsama geri döner.
  it("AC-6 (motor): ödeme hareketi girilen kalem kapsamdan düşer, ödeme tarihi türetilir", () => {
    const g = [k(1), k(2)];
    const h = { id: 1, tur: "odeme", giderId: 1, taksitId: null, tutar: 12000, tarih: BUGUN };
    const sonra = odemeleriUygula(g, [h], turHaritasi(TUR));
    expect(sonra[0]).toMatchObject({ odendi: true, odemeTarihi: BUGUN });
    expect(hesap(sonra).sayilar.yaklasan).toBe(1);
    expect(odemeleriUygula(g, [], turHaritasi(TUR))[0]).toMatchObject({ odendi: false, odemeTarihi: null });
  });
});

// Spec 0021 R4, R14: hedef başına satır; taksitli hedefte vade en yakın ödenmemiş taksit; kart kalem sayar.
describe("Spec 0021: taksitli kalem ve kiranın iki hedefi", () => {
  const sat = (id, hedef, sira, vade, tutar, odendi = false) => ({ id, hedef, sira, vade, tutar, odendi, odemeTarihi: odendi ? "2026-09-01" : null });
  // 12.000 ödenecek, 6 taksit, ilk ikisi ödenmiş; kalem düzeyinde son ödeme tarihi YOK.
  const taksitli = k(1, { sonOdemeTarihi: "", taksitler: [
    sat(101, "ana", 1, "2026-08-15", 2000, true), sat(102, "ana", 2, "2026-09-15", 2000, true), sat(103, "ana", 3, "2026-09-26", 2000),
    sat(104, "ana", 4, "2026-10-26", 2000), sat(105, "ana", 5, "2026-11-26", 2000), sat(106, "ana", 6, "2026-12-26", 2000)] });
  it("AC-24: kalem vadesi boş olsa da taksitli kalem kapsamda; vade en yakın ödenmemiş taksitin vadesi", () => {
    const r = hesap([taksitli]);
    expect(r.sayilar).toEqual({ gecmis: 0, yaklasan: 1 });
    expect(r.yaklasan[0]).toMatchObject({ vade: "2026-09-26", vadeEtiketi: "Taksit vadesi", taksit: { odenen: 2, toplam: 6 } });
  });
  it("AC-8: tutar kalan taksitlerin toplamı (8.000), vade en yakın ödenmemiş taksit", () => {
    expect(hesap([taksitli]).yaklasan[0]).toMatchObject({ odenecek: 8000, gunFarki: 2 });
  });
  it("AC-9: altı taksitli kalem tek satır; iki hedefli kira en çok iki satır, kart kalem sayar", () => {
    expect(hesap([taksitli]).yaklasanSatirlar).toHaveLength(1);
    const kira = k(2, { turId: 2, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 0, sonOdemeTarihi: gunEkle(BUGUN, -2), taksitler: [
      sat(201, "ana", 1, gunEkle(BUGUN, -2), 16000), sat(202, "stopaj", 1, gunEkle(BUGUN, 2), 4000)] });
    const r = hesap([kira]);
    expect([...r.gecmis, ...r.yaklasan].map(o => [o.hedef, o.taraf, o.odenecek])).toEqual([["ana", "Demir Bant", 16000], ["stopaj", "Vergi dairesi", 4000]]);
    expect(r.sayilar).toEqual({ gecmis: 1, yaklasan: 0 }); // kalem en acil kovada, bir kez
    expect(r.kalemIdleri.size).toBe(r.sayilar.gecmis + r.sayilar.yaklasan);
  });
  it("R13: vadesi girilmemiş stopaj hedefi hatırlatıcıya girmez", () => {
    const kira = k(3, { turId: 2, girisYonu: "brut", tutar: 20000, stopajOrani: 20, kdvOrani: 0, sonOdemeTarihi: BUGUN, taksitler: [
      sat(301, "ana", 1, BUGUN, 16000), sat(302, "stopaj", 1, null, 4000)] });
    expect([...hesap([kira]).yaklasan].map(o => o.hedef)).toEqual(["ana"]);
  });
});
