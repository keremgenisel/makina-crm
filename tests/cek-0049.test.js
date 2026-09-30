// Spec 0049: portföye elle çek ekleme (A) ve kendi çekimizle ödeme (B). Motor testleri, AC adlı.
import { describe, it, expect } from "vitest";
import {
  bagsizCekDogrula, yeniBagsizCek, cekBilgisi, tahsilatHaritasi, portfoySatirlari, ciroAdaylari, ciroVarsayilanDagitim, ciroPlani,
  cekleriUygula, cekDurumDegistir, bagsizCekSilinebilirMi, bagliCekler, cekDogrula, cekAyOzeti, CEK_DURUM,
} from "../src/lib/cek";
import { hesapBakiyeleri, odemeDogrula } from "../src/lib/kasa";
import { odemeleriUygula, turHaritasi, odemeDurumu } from "../src/lib/gider";
import { hesaplaAylikRapor } from "../src/lib/aylikRapor";
import { formOdemeHedefleri, formOdemesiHazirla, ciroCekleri } from "../src/lib/formOdemesi";

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
    const r = formOdemesiHazirla(kalem, { turMap, tarih: "2026-09-20", satirlar: { ana: { isaretli: true, yontem: "Çek (ciro)", cekId: 400 } }, cekler: [c], payments: [], alacakliAd: "Demir" });
    expect(r.hatalar.satir).toEqual({});
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
