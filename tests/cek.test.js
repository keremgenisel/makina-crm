// Spec 0040: çek portföyü ve ciro, saf motor (src/lib/cek.js) ve gelir/bekleyen çek tek kaynağı (utils, kasa, aylık rapor).
import { describe, it, expect } from "vitest";
import {
  cekDogrula, yeniCek, cekleriUygula, cekDurumDegistir, cekKarsiliksiz, ciroIptal, ciroAdaylari, ciroVarsayilanDagitim, ciroPlani,
  portfoySatirlari, baglanmamisCekTahsilatlari, tahsilatSilinebilirMi, ciroHareketleri, odemeleriAyikla, CEK_DURUM, CIRO_YONTEMI,
  ciroluTahsilatIdleri, musterininCiroluTahsilatlari, bagliCekler,
} from "../src/lib/cek";
import { purgeOldTrash } from "../src/lib/utils";
import { isPaymentReceived, sumBekleyenCek, isCekVadesiGecmis, calcKalanBorc, cekBekliyorMu } from "../src/lib/utils";
import { hesapBakiyeleri, hesapsizOdemeler, odemeDogrula } from "../src/lib/kasa";
import { odemeleriUygula, turHaritasi, odemeDurumu, borcOzeti } from "../src/lib/gider";
import { hesaplaAylikRapor } from "../src/lib/aylikRapor";
import { hesaplaMakinaMaliyetleri } from "../src/lib/makinaMaliyeti";

const TUR = [{ id: 1, ad: "Hammadde", davranis: "normal" }, { id: 3, ad: "Personel", davranis: "personel" }];
const turMap = turHaritasi(TUR);
const TED = [{ id: 10, ad: "Demir Bant" }];
const MUSTERI = { id: 1, name: "Kutu Gıda", model: "AK100", serialNo: "S-1", currency: "TRY", faturali: "Faturasız Yurtiçi", fabrikaSatisBedeli: 50000, installDate: "2026-09-01" };
const ODEME = { id: 100, customerId: 1, tarih: "2026-09-10", tutar: 12000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-10-15", tahsilEdildi: false, hesapId: 97 };
const CEK = { id: 200, paymentId: 100, no: "123456", banka: "Ziraat", kesideci: "Ali Veli", tur: "hamiline", durum: "portfoy", gecmis: [{ tarih: "2026-09-10", durum: "portfoy", not: "Alındı" }] };
// 5.000 + %20 = 6.000; 4.000 + %20 = 4.800 (Demir Bant). Serbest adlı alacaklının kalemi tedarikçisiz.
const A = { id: 1, tarih: "2026-09-01", turId: 1, tutar: 5000, kdvOrani: 20, tedarikciId: 10, sonOdemeTarihi: "2026-09-20", odendi: false };
const B = { id: 2, tarih: "2026-09-05", turId: 1, tutar: 4000, kdvOrani: 20, tedarikciId: 10, sonOdemeTarihi: "2026-09-25", odendi: false };
const HESAP = [{ id: 97, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, kapali: false }];
const zengin = (odeme = ODEME, cek = CEK) => cekleriUygula([odeme], [cek])[0];
const kalemler = (h = []) => odemeleriUygula([A, B], h, turMap);
const cirola = (cek = CEK, odeme = ODEME, dagitimTL = null, o = {}) => {
  const adaylar = ciroAdaylari(kalemler(), { tur: "tedarikci", id: 10 }, turMap);
  const dagitim = dagitimTL ? adaylar.map((a, i) => ({ anahtar: a.anahtar, tutarK: Math.round((dagitimTL[i] || 0) * 100) })) : ciroVarsayilanDagitim(adaylar, Math.round(odeme.tutar * 100));
  return ciroPlani({ cek, odeme, adaylar, dagitim, tarih: "2026-10-02", alacakliAd: "Demir Bant", turMap, ...o });
};

describe("Spec 0040: çek kaydı (R1, R2, R14, Q2)", () => {
  it("AC-1 / AC-2 / AC-30: çek kaydı numara, banka, keşideci ve türü saklar; tutar, vade ve alınma tarihi tahsilattan okunur", () => {
    const d = cekDogrula({ no: " 123456 ", banka: "Ziraat", kesideci: "Ali Veli", tur: "resmi" }, { cekler: [], tutar: 12000 });
    expect(d.kayit).toEqual({ no: "123456", banka: "Ziraat", kesideci: "Ali Veli", tur: "resmi" });
    const c = yeniCek(d.kayit, 100, "2026-09-10", 200);
    expect(c).toMatchObject({ id: 200, paymentId: 100, durum: "portfoy", gecmis: [{ tarih: "2026-09-10", durum: "portfoy", not: "Alındı" }] });
    expect(Object.keys(c)).not.toContain("tutar");
    expect(Object.keys(c)).not.toContain("vade");
    expect(zengin()._cek).toMatchObject({ id: 200, no: "123456", durum: "portfoy", gelirTarihi: null });
  });
  it("AC-31: aynı banka ve numara uyarı verir, kaydı engellemez", () => {
    const d = cekDogrula({ no: "123456", banka: "ziraat" }, { cekler: [CEK] });
    expect(d.kayit).toBeTruthy();
    expect(d.uyari).toMatch(/Aynı banka ve numaralı bir çek zaten kayıtlı/);
  });
  it("AC-32: tutarı sıfır ya da negatif çek kaydedilmez; numara ve banka boş bırakılamaz", () => {
    expect(cekDogrula({ no: "", banka: "" }, { tutar: 100 }).hatalar).toEqual({ no: "Çek numarası girilmedi.", banka: "Banka girilmedi." });
    expect(cekDogrula({ no: "1", banka: "Z" }, { tutar: "0" }).hatalar.tutar).toBe("Çek tutarı sıfırdan büyük olmalı.");
    expect(cekDogrula({ no: "1", banka: "Z" }, { tutar: "-5" }).kayit).toBeNull();
  });
  it("Q4: çek kaydına bağlı olmayan eski çek tahsilatı bugünkü bayrakla çalışır ve sayılır", () => {
    const eski = { ...ODEME, id: 101 };
    expect(cekleriUygula([eski], [CEK])[0]._cek).toBeUndefined();
    expect(isPaymentReceived(eski)).toBe(false);
    expect(isPaymentReceived({ ...eski, tahsilEdildi: true })).toBe(true);
    expect(baglanmamisCekTahsilatlari([ODEME, eski], [CEK]).map(p => p.id)).toEqual([101]);
  });
  it("kayda sızmış eski `_cek` alanı yok sayılır ve kayıtta ayıklanır", () => {
    const sizmis = { ...ODEME, _cek: { durum: "ciro" } };
    expect(cekleriUygula([sizmis], [])[0]._cek).toBeUndefined();
    expect(odemeleriAyikla([sizmis])[0]).toEqual(ODEME);
  });
});

describe("Spec 0040: portföy (R10, R17)", () => {
  const CEK2 = { ...CEK, id: 201, paymentId: 102, no: "777", tur: "resmi" };
  const P2 = { ...ODEME, id: 102, tutar: 3000, vadeTarihi: "2026-09-20" };
  const CEK3 = { ...CEK, id: 202, paymentId: 103, no: "888", durum: "tahsil" };
  const P3 = { ...ODEME, id: 103, tutar: 500 };
  it("AC-3 / AC-4: elde bulunan çekler (portföy + tahsile) vade sırasıyla ve toplamıyla; vadesi geçmiş ayırt edilir", () => {
    const r = portfoySatirlari([CEK, { ...CEK2, durum: "tahsile" }, CEK3], [ODEME, P2, P3], { bugun: "2026-09-28", esikGun: 7 });
    expect(r.satirlar.map(s => [s.cek.no, s.gecti])).toEqual([["777", true], ["123456", false]]);
    expect(r.toplamK).toEqual({ TRY: 1500000 });
  });
  it("AC-4: vadesi yaklaşan (eşik içinde) ayırt edilir", () => {
    const r = portfoySatirlari([CEK], [{ ...ODEME, vadeTarihi: "2026-10-02" }], { bugun: "2026-09-28", esikGun: 7 });
    expect(r.satirlar[0]).toMatchObject({ yaklasan: true, gecti: false });
  });
  it("AC-5: tür ve duruma göre süzme", () => {
    expect(portfoySatirlari([CEK, CEK2], [ODEME, P2], { tur: "resmi" }).satirlar.map(s => s.cek.no)).toEqual(["777"]);
    expect(portfoySatirlari([CEK, CEK3], [ODEME, P3], { durumlar: new Set(["tahsil"]) }).satirlar.map(s => s.cek.no)).toEqual(["888"]);
  });
  it("AC-36 / R17: portföy toplamı ile müşterinin bekleyen çek toplamı aynı çekleri sayar", () => {
    const payments = cekleriUygula([ODEME, P2, P3], [CEK, CEK2, CEK3]);
    const portfoy = portfoySatirlari([CEK, CEK2, CEK3], payments).toplamK.TRY / 100;
    expect(sumBekleyenCek(1, payments)).toBe(portfoy);
    expect(payments.filter(cekBekliyorMu).length).toBe(2);
  });
  it("Q7: silinmiş tahsilatın çeki portföyde görünmez; ciro edilmiş çekin tahsilatı silinemez", () => {
    expect(portfoySatirlari([CEK], [{ ...ODEME, deletedAt: "2026-09-20T00:00:00Z" }]).satirlar).toEqual([]);
    expect(tahsilatSilinebilirMi(ODEME, [CEK])).toBe(true);
    expect(tahsilatSilinebilirMi(ODEME, [{ ...CEK, durum: "ciro" }])).toBe(false);
  });
});

describe("Spec 0040: ciro (R4–R9, R16, R19)", () => {
  it("AC-6 / AC-7 / AC-8 / AC-12: ciro iki kalemi iki ayrı hesapsız hareketle kapatır; hepsi aynı çeki gösterir; çek ciro edildi olur", () => {
    const r = cirola(CEK, { ...ODEME, tutar: 10800 });
    expect(r.hatalar).toEqual([]);
    expect(r.hareketler).toEqual([
      expect.objectContaining({ tur: "odeme", giderId: 1, taksitId: null, tutar: 6000, hesapId: null, yontem: CIRO_YONTEMI, cekId: 200, tarih: "2026-10-02" }),
      expect.objectContaining({ tur: "odeme", giderId: 2, tutar: 4800, hesapId: null, cekId: 200 }),
    ]);
    expect(r.cek.durum).toBe("ciro");
    expect(r.cek.gecmis.at(-1)).toEqual({ tarih: "2026-10-02", durum: "ciro", not: "Ciro: Demir Bant" });
    const h = r.hareketler.map((x, i) => ({ ...x, id: 900 + i }));
    expect(kalemler(h).map(odemeDurumu)).toEqual(["odendi", "odendi"]);
    expect(borcOzeti(kalemler(h), { turler: TUR, tedarikciler: TED }, "2026-10-05").toplam).toBe(0);
    expect(portfoySatirlari([r.cek], [ODEME]).satirlar).toEqual([]);
  });
  it("AC-12: dağıtılan toplam çek tutarını aşamaz", () => {
    const r = cirola(CEK, ODEME, [6000, 6001]);
    expect(r.hatalar).toEqual(["Dağıtılan toplam çek tutarını aşamaz (çek 12.000,00 ₺, dağıtılan 12.001,00 ₺)."]);
  });
  it("AC-13: çek tutarı borçtan büyükse fark uyarıdır, ciro tamamlanır, fark hiçbir borcu kapatmaz", () => {
    const r = cirola(CEK, { ...ODEME, tutar: 12000 });
    expect(r.hatalar).toEqual([]);
    expect(r.farkK).toBe(120000);
    expect(r.uyari).toMatch(/1\.200,00 ₺ fazla/);
    expect(r.hareketler.reduce((a, h) => a + h.tutar, 0)).toBe(10800);
  });
  it("AC-11: aynı çek ikinci kez ciro edilemez", () => {
    const r = cirola({ ...CEK, durum: "ciro" });
    expect(r.hatalar[0]).toBe("Bu çek zaten ciro edilmiş; bir çek bir kez ciro edilir.");
  });
  it("AC-29 / R16: TL dışı çek ciro edilemez ve nedeni yazılır", () => {
    expect(cirola(CEK, { ...ODEME, currency: "USD" }).hatalar).toContain("Yalnız TL çek ciro edilebilir: gider ödemeleri TL'dir.");
  });
  it("Q8: alacaklı kapsamı: çalışan maaş kalemleri, serbest ad tedarikçisiz kalemler; en az bir kalem zorunlu", () => {
    const C = { id: 5, tarih: "2026-09-01", turId: 1, tutar: 1000, kdvOrani: 0, tedarikciId: null, odendi: false };
    const M = { id: 6, tarih: "2026-09-01", turId: 3, calisanId: 7, resmiTutar: 3000, eldenTutar: 0, odendi: false };
    const k = odemeleriUygula([A, C, M], [], turMap);
    expect(ciroAdaylari(k, { tur: "serbest" }, turMap).map(a => a.giderId)).toEqual([5]);
    expect(ciroAdaylari(k, { tur: "calisan", id: 7 }, turMap).map(a => a.giderId)).toEqual([6]);
    expect(cirola(CEK, ODEME, [0, 0]).hatalar).toContain("En az bir gider kalemine tutar dağıtın.");
  });
  it("AC-37 / R19: 'Çek (ciro)' yöntemi elle girilen ödemede reddedilir", () => {
    const r = odemeDogrula({ tarih: "2026-10-01", tutar: "100", yontem: CIRO_YONTEMI }, { kalem: kalemler()[0], turMap });
    expect(r.hatalar.yontem).toMatch(/elle seçilemez/);
  });
});

describe("Spec 0040: gelir, kasa ve borç (R5, R6, R17, R18; C2)", () => {
  const ciroluCek = () => cirola().cek;
  it("AC-9 / AC-22 / R5: ciro hiçbir hesabın bakiyesini değiştirmez; tahsilatta hesap seçili olsa bile ciro edilen çek o hesaba girmez", () => {
    const h = cirola().hareketler.map((x, i) => ({ ...x, id: 900 + i }));
    const once = hesapBakiyeleri(HESAP, [], { payments: [zengin()] }).get("97").bakiye;
    const sonra = hesapBakiyeleri(HESAP, h, { payments: [zengin(ODEME, ciroluCek())] }).get("97").bakiye;
    expect(once).toBe(0);
    expect(sonra).toBe(0);
    // Tahsil edilen çek ise hesaba girer (iki soru ayrı).
    const tahsil = cekDurumDegistir(CEK, "tahsil", "2026-10-01").cek;
    expect(hesapBakiyeleri(HESAP, [], { payments: [zengin(ODEME, tahsil)] }).get("97").bakiye).toBe(12000);
  });
  it("AC-24 / R18: ciro hareketleri hesabı belirtilmemiş ödemeler listesinde görünmez", () => {
    const h = cirola().hareketler.map((x, i) => ({ ...x, id: 900 + i }));
    expect(hesapsizOdemeler([...h, { id: 5, tur: "odeme", hesapId: null, giderId: 1 }]).adet).toBe(1);
  });
  it("AC-10 / R6: ciro edilen çekin tahsilatı ciro ayında aylık raporda gelire girer, tahsilat ayında girmez; bekleyen çek sayılmaz", () => {
    const veri = (cek) => ({ customers: [MUSTERI], payments: cekleriUygula([ODEME], [cek]) });
    const eylul = hesaplaAylikRapor(veri(ciroluCek()), "2026-09");
    const ekim = hesaplaAylikRapor(veri(ciroluCek()), "2026-10");
    expect(isPaymentReceived(zengin(ODEME, ciroluCek()))).toBe(true);
    expect(eylul.tahsilatTutar.TRY || 0).toBe(0);
    expect(eylul.bekleyenCekAdet).toBe(0);
    expect(ekim.tahsilatTutar.TRY).toBe(12000);
    expect(ekim.cekTahsilAdet).toBe(1);
    // Ciro öncesi: eylülde bekleyen çek, gelir yok (bugünkü davranış).
    const once = hesaplaAylikRapor(veri(CEK), "2026-09");
    expect([once.bekleyenCekAdet, once.tahsilatTutar.TRY || 0]).toEqual([1, 0]);
  });
  it("AC-23: ciro sonrası müşterinin kalan borcu çek tutarı kadar azalır ve bekleyen çek toplamından düşer", () => {
    const once = cekleriUygula([ODEME], [CEK]);
    const sonra = cekleriUygula([ODEME], [ciroluCek()]);
    expect(calcKalanBorc(MUSTERI, once) - calcKalanBorc(MUSTERI, sonra)).toBe(12000);
    expect([sumBekleyenCek(1, once), sumBekleyenCek(1, sonra)]).toEqual([12000, 0]);
    expect(isCekVadesiGecmis({ ...sonra[0], vadeTarihi: "2020-01-01" })).toBe(false);
  });
  it("AC-21 / C6: makina maliyeti çekten ve cirodan etkilenmez", () => {
    const hesap = (h) => hesaplaMakinaMaliyetleri({ customers: [{ ...MUSTERI, uretimTarihi: "2026-09-05" }], stock: [], partStockLog: [], giderler: kalemler(h), giderTurleri: TUR,
      standartGiderler: [], standardModels: [{ model: "AK100" }], customModels: [], giderAyarlari: { yururlukAy: "2026-01" } }, { bugun: "2026-10-28" }).makinalar.get("musteri:1").ortakPay;
    expect(hesap(cirola().hareketler.map((x, i) => ({ ...x, id: 900 + i })))).toBe(hesap([]));
  });
});

describe("Spec 0040: durum geçişleri, karşılıksız ve ciro iptali (R3, R11, R12, R15)", () => {
  it("AC-26: yasak geçiş nedeni yazan hata verir, çek değişmez", () => {
    const ciro = { ...CEK, durum: "ciro" };
    expect(cekDurumDegistir(ciro, "tahsil", "2026-10-05").hata).toBe("Ciro edilmiş çek tahsil edildi yapılamaz: çek artık bizde değil (çift sayım).");
    expect(cekDurumDegistir(CEK, "ciro", "2026-10-05").hata).toBe("Çek yalnız ciro işlemiyle ciro edilir.");
    expect(cekDurumDegistir({ ...CEK, durum: "karsiliksiz" }, "tahsil", "2026-10-05").hata).toBe("Karşılıksız durumundaki çek Tahsil edildi durumuna geçemez.");
    expect(cekDurumDegistir(CEK, "tahsile", "2026-10-05").cek).toMatchObject({ durum: "tahsile" });
  });
  it("AC-14: karşılıksız işaretlenen (ciro edilmemiş) çekin tahsilatı gelirden çıkar", () => {
    const tahsil = cekDurumDegistir(CEK, "tahsil", "2026-10-01").cek;
    expect(isPaymentReceived(zengin(ODEME, tahsil))).toBe(true);
    const k = cekKarsiliksiz(tahsil, [], "2026-10-10");
    expect(k.cek.durum).toBe("karsiliksiz");
    expect(isPaymentReceived(zengin(ODEME, k.cek))).toBe(false);
    expect(k.silinen).toEqual([]);
  });
  it("AC-15 / AC-28: ciro edilmiş çek karşılıksız çıkınca hareketleri silinir, borç yeniden açılır, çek portföye dönmez, gelir ciro ayından çıkar", () => {
    const r = cirola();
    const h = [...r.hareketler.map((x, i) => ({ ...x, id: 900 + i })), { id: 5, tur: "odeme", giderId: 2, tutar: 1, tarih: "2026-09-30", hesapId: 97 }];
    const k = cekKarsiliksiz(r.cek, h, "2026-10-20");
    expect(k.hareketler.map(x => x.id)).toEqual([5]);
    expect(k.cek.durum).toBe("karsiliksiz");
    expect(k.cek.gecmis.at(-1).not).toBe("Karşılıksız, ciro geri alındı");
    expect(kalemler(k.hareketler).map(odemeDurumu)).toEqual(["odenmedi", "kismen"]);
    expect(portfoySatirlari([k.cek], [ODEME]).satirlar).toEqual([]);
    expect(hesaplaAylikRapor({ customers: [MUSTERI], payments: cekleriUygula([ODEME], [k.cek]) }, "2026-10").tahsilatTutar.TRY || 0).toBe(0);
  });
  it("AC-27: ciro iptali hareketleri siler, çeki portföye döndürür, borcu yeniden açar", () => {
    const r = cirola();
    const h = r.hareketler.map((x, i) => ({ ...x, id: 900 + i }));
    const i = ciroIptal(r.cek, h, "2026-10-03");
    expect(i.hareketler).toEqual([]);
    expect(i.cek.durum).toBe("portfoy");
    expect(i.cek.gecmis.at(-1)).toEqual({ tarih: "2026-10-03", durum: "portfoy", not: "Ciro iptal edildi" });
    expect(kalemler(i.hareketler).map(odemeDurumu)).toEqual(["odenmedi", "odenmedi"]);
    expect(ciroIptal(CEK, h, "2026-10-03").hata).toBeTruthy();
  });
  it("AC-16 / AC-35: geçmiş durum değişikliklerini tarihiyle taşır; ciro bilgisi hareketlerden okunur, ikinci kez saklanmaz", () => {
    const r = cirola();
    const h = r.hareketler.map((x, i) => ({ ...x, id: 900 + i }));
    expect(r.cek.gecmis.map(g => [g.tarih, g.durum])).toEqual([["2026-09-10", "portfoy"], ["2026-10-02", "ciro"]]);
    expect(ciroHareketleri(200, h).map(x => x.giderId)).toEqual([1, 2]);
    expect(Object.keys(r.cek).sort()).toEqual(["banka", "durum", "gecmis", "id", "kesideci", "no", "paymentId", "tur"]);
  });
});

describe("Spec 0040 triyajı: silme yollarında ciro koruması ve yetim çek", () => {
  const cekler = [{ id: 1, paymentId: 10, durum: "ciro" }, { id: 2, paymentId: 11, durum: "portfoy" }, { id: 3, paymentId: 12, durum: "ciro" }];
  const payments = [{ id: 10, customerId: 5 }, { id: 11, customerId: 5 }, { id: 12, customerId: 6, deletedAt: "2026-09-01" }];
  it("ciroluTahsilatIdleri yalnız ciro edilmiş çeklerin tahsilatlarını verir", () => {
    expect([...ciroluTahsilatIdleri(cekler)].sort()).toEqual(["10", "12"]);
    expect(ciroluTahsilatIdleri(null).size).toBe(0);
  });
  it("musterininCiroluTahsilatlari müşterinin canlı, ciro edilmiş çekli tahsilatlarını verir", () => {
    expect(musterininCiroluTahsilatlari(5, payments, cekler).map(p => p.id)).toEqual([10]);
    expect(musterininCiroluTahsilatlari("6", payments, cekler)).toEqual([]); // çöptekiler sayılmaz
  });
  it("bagliCekler tahsilatı kalmamış çeki dışarıda bırakır; cekDogrula onunla yanlış yinelenen uyarısı vermez", () => {
    const yetim = [{ id: 4, paymentId: 99, no: "777", banka: "Garanti", durum: "portfoy" }];
    expect(bagliCekler([...cekler, ...yetim], payments).map(c => c.id)).toEqual([1, 2, 3]);
    expect(cekDogrula({ no: "777", banka: "Garanti" }, { cekler: bagliCekler(yetim, payments) }).uyari).toBeNull();
    expect(cekDogrula({ no: "777", banka: "Garanti" }, { cekler: yetim }).uyari).toMatch(/zaten kayıtlı/);
  });
  it("purgeOldTrash koru ile işaretlenen süresi dolmuş kaydı bırakır", () => {
    const eski = "2020-01-01T00:00:00.000Z";
    const dizi = [{ id: 1, deletedAt: eski }, { id: 2, deletedAt: eski }, { id: 3 }];
    expect(purgeOldTrash(dizi).map(x => x.id)).toEqual([3]);
    expect(purgeOldTrash(dizi, undefined, x => x.id === 2).map(x => x.id)).toEqual([2, 3]);
  });
});
