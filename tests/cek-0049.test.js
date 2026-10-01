// Spec 0049: portföye elle çek ekleme (A) ve kendi çekimizle ödeme (B). Motor testleri, AC adlı.
import { describe, it, expect } from "vitest";
import {
  bagsizCekDogrula, yeniBagsizCek, cekBilgisi, tahsilatHaritasi, portfoySatirlari, ciroAdaylari, ciroVarsayilanDagitim, ciroPlani,
  cekleriUygula, cekDurumDegistir, bagsizCekSilinebilirMi, bagliCekler, cekDogrula, cekAyOzeti, CEK_DURUM,
} from "../src/lib/cek";
import { hesapBakiyeleri, odemeDogrula } from "../src/lib/kasa";
import { odemeleriUygula, turHaritasi, odemeDurumu } from "../src/lib/gider";
import { hesaplaAylikRapor } from "../src/lib/aylikRapor";
import { formOdemeHedefleri, odemeGirisiHazirla, ciroCekleri } from "../src/lib/formOdemesi";

const turMap = turHaritasi([{ id: 1, ad: "Hammadde", davranis: "normal" }, { id: 3, ad: "Personel", davranis: "personel" }]);
const HESAP = [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, kapali: false }];
const KALEM = { id: 10, tarih: "2026-09-01", turId: 1, tutar: 8000, kdvOrani: 0, tedarikciId: 11, sonOdemeTarihi: "2026-09-30" };
const FORM = { no: "555", banka: "İş", kesideci: "Mehmet", tur: "hamiline", tutar: "10000", currency: "TRY", vadeTarihi: "2026-11-30", tarih: "2026-09-05", kimden: "Eski müşteri" };
const bagsiz = (o = {}) => ({ ...yeniBagsizCek(bagsizCekDogrula(FORM).kayit, 400), ...o });
const BAGLI_ODEME = { id: 100, customerId: 1, tarih: "2026-09-01", tutar: 5000, currency: "TRY", yontem: "Çek", vadeTarihi: "2026-10-15" };
const BAGLI = { id: 200, paymentId: 100, no: "1", banka: "Z", tur: "hamiline", durum: "portfoy", gecmis: [] };

describe("Spec 0049 A: elle çek ekleme", () => {
  it("AC-1 / AC-2: bağsız çek doğrulanır ve portföyde kendi tutar, para birimi ve vadesiyle listelenir", () => {
    const r = bagsizCekDogrula(FORM);
    expect(r.kayit).toMatchObject({ yon: "alinan", paymentId: null, no: "555", tutar: 10000, currency: "TRY", vadeTarihi: "2026-11-30", tarih: "2026-09-05", kimden: "Eski müşteri", customerId: null });
    const c = yeniBagsizCek(r.kayit, 400);
    expect(c).toMatchObject({ id: 400, durum: "portfoy" });
    const { satirlar, toplamK } = portfoySatirlari([BAGLI, c], [BAGLI_ODEME], { bugun: "2026-09-10" });
    const s = satirlar.find(x => x.cek.id === 400);
    expect(s).toMatchObject({ odeme: null, tutarK: 1000000, currency: "TRY", vade: "2026-11-30" });
    expect(s.bilgi).toMatchObject({ bagli: false, kimden: "Eski müşteri", tarih: "2026-09-05" });
    expect(toplamK.TRY).toBe(1500000);
  });
  it("R1: tutar, vade, alınma tarihi ve kimden zorunlu; müşteri seçilirse kimden metni gerekmez", () => {
    const r = bagsizCekDogrula({ no: "1", banka: "B" });
    expect(Object.keys(r.hatalar).sort()).toEqual(["kimden", "tarih", "tutar", "vadeTarihi"]);
    expect(bagsizCekDogrula({ ...FORM, kimden: "", customerId: 7 }).kayit).toMatchObject({ customerId: 7, kimden: "" });
  });
  it("yinelenen çek uyarısı bağsız çekleri de sayar; verilen çek alınanla çakışmaz", () => {
    expect(bagsizCekDogrula(FORM, { cekler: [bagsiz()] }).uyari).toMatch(/zaten kayıtlı/);
    expect(bagsizCekDogrula(FORM, { cekler: [bagsiz({ yon: "verilen" })] }).uyari).toBeNull();
    expect(bagliCekler([bagsiz(), BAGLI, { ...BAGLI, id: 201, paymentId: 999 }], [BAGLI_ODEME]).map(c => c.id)).toEqual([400, 200]);
  });
  it("AC-3: bağsız çek gelir değildir: tahsilatlara çek bilgisi eklenmez, aylık rapor ve Finans aynı kalır", () => {
    const once = hesaplaAylikRapor({ customers: [{ id: 1, name: "M" }], payments: cekleriUygula([BAGLI_ODEME], [BAGLI]) }, "2026-09");
    const tahsil = bagsiz({ durum: "tahsil", gecmis: [{ tarih: "2026-09-20", durum: "tahsil" }] });
    const p = cekleriUygula([BAGLI_ODEME], [BAGLI, tahsil]);
    expect(p).toHaveLength(1);
    const sonra = hesaplaAylikRapor({ customers: [{ id: 1, name: "M" }], payments: p }, "2026-09");
    expect(sonra.tahsilatTutar).toEqual(once.tahsilatTutar);
    expect(sonra.ciroNet).toEqual(once.ciroNet);
  });
  it("AC-4 / AC-5: bağsız TL çek bir gidere ciro edilir; borç kapanır, hiçbir hesabın bakiyesi değişmez", () => {
    const c = bagsiz();
    const s = portfoySatirlari([c], []).satirlar[0];
    const kalemler = odemeleriUygula([KALEM], [], turMap);
    const adaylar = ciroAdaylari(kalemler, { tur: "tedarikci", id: 11 }, turMap);
    const plan = ciroPlani({ cek: c, tutarK: s.tutarK, currency: s.currency, adaylar, dagitim: ciroVarsayilanDagitim(adaylar, s.tutarK), tarih: "2026-09-20", alacakliAd: "Demir", turMap });
    expect(plan.hatalar).toEqual([]);
    expect(plan.cek.durum).toBe("ciro");
    expect(plan.uyari).toMatch(/2\.000,00 ₺ fazla/);
    const hareketler = plan.hareketler.map((h, i) => ({ ...h, id: 700 + i }));
    expect(odemeDurumu(odemeleriUygula([KALEM], hareketler, turMap)[0])).toBe("odendi");
    const once = hesapBakiyeleri(HESAP, [], {}).get("51").bakiyeK;
    expect(hesapBakiyeleri(HESAP, hareketler, {}).get("51").bakiyeK).toBe(once);
  });
  it("AC-19: TL dışı bağsız çek ciro edilemez ve nedeni yazılır", () => {
    const c = bagsiz({ currency: "USD" });
    const s = portfoySatirlari([c], []).satirlar[0];
    const adaylar = ciroAdaylari(odemeleriUygula([KALEM], [], turMap), { tur: "tedarikci", id: 11 }, turMap);
    expect(ciroPlani({ cek: c, tutarK: s.tutarK, currency: s.currency, adaylar, dagitim: ciroVarsayilanDagitim(adaylar, s.tutarK), tarih: "2026-09-20", alacakliAd: "X", turMap }).hatalar)
      .toContain("Yalnız TL çek ciro edilebilir: gider ödemeleri TL'dir.");
    expect(ciroCekleri([c], [])).toEqual([]);
  });
  it("AC-6: gider formunun ciro listesi bağsız çeki de verir ve formdan ciro edilir", () => {
    const c = bagsiz();
    expect(ciroCekleri([c], []).map(x => x.cek.id)).toEqual([400]);
    const kalem = odemeleriUygula([{ ...KALEM, tutar: 12000 }], [], turMap)[0];
    // Spec 0053: aynı motor, satır listesi biçimiyle (odemeGirisiHazirla).
    const r = odemeGirisiHazirla(kalem, { turMap, tarih: "2026-09-20", satirlar: [{ anahtar: "a", hedef: "ana", yontem: "Çek (ciro)", cekId: 400 }], cekler: [c], payments: [], alacakliAd: "Demir" });
    expect(r.hatalar.satirlar).toEqual({});
    expect(r.hareketler).toEqual([expect.objectContaining({ tutar: 10000, cekId: 400, hesapId: null })]);
    expect(r.cek.durum).toBe("ciro");
  });
  it("AC-7: bağsız çek silinebilir; ciro edilmişse silinemez", () => {
    expect(bagsizCekSilinebilirMi(bagsiz())).toBe(true);
    expect(bagsizCekSilinebilirMi(bagsiz({ durum: CEK_DURUM.CIRO }))).toBe(false);
    expect(bagsizCekSilinebilirMi(BAGLI)).toBe(false); // bağlı çek tahsilatıyla yönetilir
  });
  it("AC-8: bağsız çek tahsil edildi işaretlenir ama hiçbir bakiyeye girmez", () => {
    const r = cekDurumDegistir(bagsiz(), CEK_DURUM.TAHSIL, "2026-09-25");
    expect(r.cek.durum).toBe("tahsil");
    const once = hesapBakiyeleri(HESAP, [], { payments: [] }).get("51").bakiyeK;
    expect(hesapBakiyeleri(HESAP, [], { payments: cekleriUygula([], [r.cek]), cekler: [r.cek] }).get("51").bakiyeK).toBe(once);
  });
  it("AC-10 (Q2): bağlı çekin tutarı ve vadesi okuma anında tahsilattan; tahsilat düzenlenince güncel", () => {
    const pById = tahsilatHaritasi([{ ...BAGLI_ODEME, tutar: 7500, vadeTarihi: "2026-12-01" }]);
    expect(cekBilgisi(BAGLI, pById)).toMatchObject({ bagli: true, tutarK: 750000, vade: "2026-12-01", customerId: 1 });
    expect(cekBilgisi(BAGLI, tahsilatHaritasi([]))).toBeNull(); // silinmiş tahsilatın çeki gizli (0040 Q7)
  });
  it("AC-9: bağlı çekin portföy, ciro ve doğrulaması 0040'taki gibi (eski odeme imzası da çalışır)", () => {
    const s = portfoySatirlari([BAGLI], [BAGLI_ODEME]).satirlar[0];
    expect(s).toMatchObject({ odeme: BAGLI_ODEME, tutarK: 500000, vade: "2026-10-15" });
    const adaylar = ciroAdaylari(odemeleriUygula([KALEM], [], turMap), { tur: "tedarikci", id: 11 }, turMap);
    const eski = ciroPlani({ cek: BAGLI, odeme: BAGLI_ODEME, adaylar, dagitim: ciroVarsayilanDagitim(adaylar, 500000), tarih: "2026-09-20", alacakliAd: "X", turMap });
    expect(eski.hareketler.map(h => h.tutar)).toEqual([5000]);
    expect(cekDogrula({ no: "1", banka: "Z" }, { cekler: [BAGLI] }).uyari).toMatch(/zaten kayıtlı/);
  });
  it("Q9: 0047 ay özeti bağsız alınan çeki sayar", () => {
    const o = cekAyOzeti([BAGLI, bagsiz({ gecmis: [{ tarih: "2026-09-05", durum: "portfoy" }] })], [BAGLI_ODEME], "2026-09");
    // BAGLI'nın geçmişi boş (güncel durumdan, gecmisYok); bağsız çek kendi tutarıyla elde.
    expect(o.elde).toEqual({ adet: 2, tutarK: { TRY: 1500000 } });
  });
  it("odemeDogrula: 'Çek (ciro)' yöntemi hâlâ elle seçilemez", () => {
    const kalem = odemeleriUygula([KALEM], [], turMap)[0];
    expect(odemeDogrula({ tarih: "2026-09-20", tutar: "100", yontem: "Çek (ciro)" }, { kalem, turMap }).hatalar.yontem).toBeTruthy();
    expect(formOdemeHedefleri(kalem, turMap)[0].ciroOlur).toBe(true);
  });
});

// ── Spec 0049 B: kendi çekimiz ──────────────────────────────────────────────────
import { kendiCekPlani, verilenCekOdendi, verilenCekOdemeGeriAl, verilenCekKapat, verilenCekSatirlari, KENDI_CEK_YONTEMI } from "../src/lib/cek";
import { hesapKullanimi } from "../src/lib/kasa";
import { hesaplaGiderRaporu } from "../src/lib/gider";
import { hesaplaMakinaMaliyetleri } from "../src/lib/makinaMaliyeti";

const K2 = { id: 11, tarih: "2026-09-03", turId: 1, tutar: 4000, kdvOrani: 0, tedarikciId: 11, sonOdemeTarihi: "2026-10-15" };
const plan = ({ tutar = "12000", dagitim = null, hesapId = 51, kalemler = [KALEM, K2], h = [] } = {}) => {
  const adaylar = ciroAdaylari(odemeleriUygula(kalemler, h, turMap), { tur: "tedarikci", id: 11 }, turMap);
  return kendiCekPlani({ form: { no: "A-7", hesapId, vadeTarihi: "2026-10-30", tutar, aciklama: "Eylül" }, hesaplar: [...HESAP, { id: 52, ad: "Dolar", tur: "banka", paraBirimi: "USD", kapali: false }, { id: 53, ad: "Kasa", tur: "kasa", paraBirimi: "TRY" }],
    adaylar, dagitim: dagitim || adaylar.map(a => ({ anahtar: a.anahtar, tutarK: a.kalanK })), tarih: "2026-09-20", alacakli: { tur: "tedarikci", id: 11, ad: "Demir Bant" }, turMap, cekId: 900 });
};
const yaz = (p) => ({ cek: p.cek, hareketler: p.hareketler.map((h, i) => ({ ...h, id: 800 + i })) });
const bakiye = (h, cekler) => hesapBakiyeleri(HESAP, h, { cekler }).get("51").bakiyeK;

describe("Spec 0049 B: kendi çekimiz", () => {
  it("AC-11 / AC-12: çek yazılır, verilen tarafında listelenir; kalemlerin borcu kapanır; hareketler hesapsız ve 'Çek (kendi)'", () => {
    const { cek, hareketler } = yaz(plan());
    expect(cek).toMatchObject({ id: 900, yon: "verilen", paymentId: null, durum: "yazildi", tutar: 12000, hesapId: 51, banka: "Ziraat", alacakliAd: "Demir Bant", vadeTarihi: "2026-10-30" });
    expect(hareketler.map(h => [h.giderId, h.tutar, h.yontem, h.hesapId, h.cekId])).toEqual([[10, 8000, KENDI_CEK_YONTEMI, null, 900], [11, 4000, KENDI_CEK_YONTEMI, null, 900]]);
    expect(odemeleriUygula([KALEM, K2], hareketler, turMap).map(odemeDurumu)).toEqual(["odendi", "odendi"]);
    expect(verilenCekSatirlari([cek, BAGLI]).satirlar.map(s => s.cek.id)).toEqual([900]);
    expect(portfoySatirlari([cek, BAGLI], [BAGLI_ODEME]).satirlar.map(s => s.cek.id)).toEqual([200]); // alınanlara karışmaz
  });
  it("AC-13 / AC-14: yazılınca bakiye değişmez; ödendi olunca seçilen hesaptan çek tutarı kadar, ödendiği gün düşer (bir kez)", () => {
    const { cek, hareketler } = yaz(plan());
    const once = bakiye([], []);
    expect(bakiye(hareketler, [cek])).toBe(once);
    const odendi = verilenCekOdendi(cek, "2026-10-30").cek;
    const b = hesapBakiyeleri(HESAP, hareketler, { cekler: [odendi] }).get("51");
    expect(b.bakiyeK).toBe(once - 1200000);
    expect(b.satirlar.filter(s => s.cek)).toEqual([expect.objectContaining({ tarih: "2026-10-30", tur: "verilenCek", cikanK: 1200000 })]);
    // Ödeme geri alınınca bakiye eski hâline döner.
    expect(bakiye(hareketler, [verilenCekOdemeGeriAl(odendi, "2026-10-31").cek])).toBe(once);
    expect(hesapKullanimi(51, [], { cekler: [cek] })).toBe(1);
  });
  it("AC-15: karşılıksız ya da iptal olunca hareketler silinir ve borç yeniden açılır; ödenmiş çek kapatılamaz", () => {
    const { cek, hareketler } = yaz(plan());
    for (const hedef of ["karsiliksiz", "iptal"]) {
      const r = verilenCekKapat(cek, [...hareketler, { id: 1, tur: "odeme", giderId: 99, tutar: 1 }], "2026-09-25", hedef);
      expect(r.cek.durum).toBe(hedef);
      expect(r.hareketler.map(h => h.id)).toEqual([1]);
      expect(odemeleriUygula([KALEM, K2], r.hareketler, turMap).map(odemeDurumu)).toEqual(["odenmedi", "odenmedi"]);
    }
    expect(verilenCekKapat(verilenCekOdendi(cek, "2026-10-01").cek, hareketler, "2026-10-02", "iptal").hata).toMatch(/önce ödemeyi geri alın/);
  });
  it("AC-16 / AC-17: bir çek birden çok kaleme dağıtılır; dağıtılan çeki aşamaz; fark uyarıdır ve borç kapatmaz", () => {
    const fazla = plan({ tutar: "10000" });
    expect(fazla.hatalar[0]).toMatch(/Dağıtılan toplam çek tutarını aşamaz/);
    const p = plan({ tutar: "15000" });
    expect(p.hatalar).toEqual([]);
    expect(p.uyari).toMatch(/3\.000,00 ₺ fazla/);
    expect(p.hareketler.reduce((a, h) => a + h.tutar, 0)).toBe(12000);
    expect(p.cek.tutar).toBe(15000);
  });
  it("AC-19 / Q3: TL dışı ya da banka olmayan hesaptan çek yazılamaz; nedeni yazılır", () => {
    expect(plan({ hesapId: 52 }).hatalar).toContain("Kendi çekimiz yalnız TL hesaptan yazılır: gider ödemeleri TL'dir.");
    expect(plan({ hesapId: 53 }).hatalar).toContain("Kendi çekimiz bir banka hesabından yazılır.");
  });
  it("X8: hiçbir kalemi kapatmayan çek yazılamaz", () => {
    expect(plan({ dagitim: [] }).hatalar).toContain("Çek en az bir gider kalemini kapatmalı; bir kaleme tutar dağıtın.");
  });
  it("AC-18: vadesi geçmiş ve yaklaşan yalnız ödenmeyi bekleyen çekte; ödenmiş çek bekleyen toplamına girmez", () => {
    const c = (id, vade, durum = "yazildi") => ({ id, yon: "verilen", paymentId: null, no: String(id), durum, tutar: 1000, vadeTarihi: vade, gecmis: [] });
    const r = verilenCekSatirlari([c(1, "2026-09-10"), c(2, "2026-09-25"), c(3, "2026-12-01"), c(4, "2026-09-01", "odendi")], { bugun: "2026-09-20", esikGun: 7 });
    expect(r.satirlar.map(s => [s.cek.id, s.gecti, s.yaklasan])).toEqual([[1, true, false], [2, false, true], [3, false, false]]);
    expect(r.toplamK).toBe(300000);
    const tum = verilenCekSatirlari([c(4, "2026-09-01", "odendi")], { durumlar: new Set(["odendi"]), bugun: "2026-09-20" });
    expect(tum.satirlar[0]).toMatchObject({ gecti: false });
  });
  it("AC-20: gider formunun ANA satırından kendi çek yazılır; stopaj/elden satırında reddedilir", () => {
    const kalem = odemeleriUygula([KALEM], [], turMap)[0];
    const r = odemeGirisiHazirla(kalem, { turMap, tarih: "2026-09-20", hesaplar: HESAP, alacakliAd: "Demir Bant", yeniCekId: 950,
      satirlar: [{ anahtar: "a", hedef: "ana", yontem: KENDI_CEK_YONTEMI, tutar: "8000", cekNo: "B-1", cekHesapId: 51, cekVade: "2026-10-10" }] });
    expect(r.hatalar.satirlar).toEqual({});
    expect(r.hareketler).toEqual([expect.objectContaining({ tutar: 8000, cekId: 950, hesapId: null, yontem: KENDI_CEK_YONTEMI })]);
    expect(r.cek).toMatchObject({ id: 950, yon: "verilen", no: "B-1", tutar: 8000, hesapId: 51 });
    const eksik = odemeGirisiHazirla(kalem, { turMap, tarih: "2026-09-20", hesaplar: HESAP, alacakliAd: "Demir Bant", satirlar: [{ anahtar: "a", hedef: "ana", yontem: KENDI_CEK_YONTEMI, tutar: "8000", cekNo: "" }] });
    expect(eksik.hatalar.satirlar.a.cek).toBe("Çek numarası girilmedi.");
  });
  it("R9: 'Çek (kendi)' yöntemi elle seçilemez", () => {
    const kalem = odemeleriUygula([KALEM], [], turMap)[0];
    expect(odemeDogrula({ tarih: "2026-09-20", tutar: "100", yontem: KENDI_CEK_YONTEMI }, { kalem, turMap }).hatalar.yontem).toMatch(/elle seçilemez/);
  });
  it("AC-26: gider toplamları, KDV ve makina maliyeti kendi çekle ödemeden önce ve sonra aynı", () => {
    const { cek, hareketler } = yaz(plan());
    const TURLER = [{ id: 1, ad: "Hammadde", davranis: "normal" }];
    const kalemler = [{ ...KALEM, kdvOrani: 20 }, K2];
    const rapor = (h) => { const r = hesaplaGiderRaporu({ giderler: odemeleriUygula(kalemler, h, turMap), turler: TURLER, yururlukAy: "2026-01" }, { baslangic: "2026-09-01", bitis: "2026-09-30" });
      return { toplam: r.toplam, kdv: r.indirilecekKdv, stopaj: r.stopajToplam, kovalar: r.kovalar }; };
    expect(rapor([]).toplam).toBe(12000); // test gerçekten rakam karşılaştırır
    expect(rapor([]).kdv).toBe(1600);
    expect(rapor(hareketler)).toEqual(rapor([]));
    const girdi = (h) => ({ giderler: odemeleriUygula(kalemler, h, turMap), giderTurleri: TURLER, customers: [], stock: [], giderAyarlari: { yururlukAy: "2026-01" } });
    expect(hesaplaMakinaMaliyetleri(girdi([])).aylar).toBeTruthy();
    expect(JSON.stringify(hesaplaMakinaMaliyetleri(girdi(hareketler)))).toBe(JSON.stringify(hesaplaMakinaMaliyetleri(girdi([]))));
    expect(cek.durum).toBe("yazildi");
  });
});
