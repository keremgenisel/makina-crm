// Spec 0155: tedarikçiden alacak (avans, geri ödeme, mahsup) saf motoru, rapor, çöp etiketi, hesap taşıma ve kaynak taramaları.
// Ekran ölçümleri `ui/tedarikci-avansi-0155*`; spec öncesi kıyas `tedarikci-avansi-0155-kiyas`. Test adları AC-<n> taşır.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as K from "../src/lib/kasa";
import * as G from "../src/lib/gider";
import { hareketCopEtiketi } from "../src/lib/copKutusu";
import { dovizHareketMi, dovizOdemeMi, dovizIzAyrintisi, dovizOdemeIbaresi } from "../src/lib/doviz";
import { giderKasaRaporu, buildGiderKasaRaporuHtml } from "../src/lib/giderRaporu";
import { odemeHatirlatmalari } from "../src/lib/odemeHatirlatma";
import { acikKalemler } from "../src/lib/acikKalemler";
import { girdi as girdi0059 } from "./fixtures/0059-veri";

const turler = [{ id: 1, ad: "Hammadde", davranis: "normal" }, { id: 2, ad: "Kira", davranis: "kira" }, { id: 3, ad: "Maaşlar", davranis: "personel" }, { id: 4, ad: "SGK", davranis: "sgk" }];
const turMap = G.turHaritasi(turler);
const TED = [{ id: 11, ad: "Demir Bant" }, { id: 12, ad: "Yıldız" }, { id: 13, ad: "Eski Firma", deletedAt: "2026-09-01T00:00:00Z" }];
const HESAPLAR = [
  { id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, acilisTarihi: "2026-01-01", kapali: false },
  { id: 53, ad: "Dolar", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 10000, acilisTarihi: "2026-01-01", kapali: false },
  { id: 56, ad: "Euro", tur: "banka", paraBirimi: "EUR", acilisBakiyesi: 0, acilisTarihi: "2026-01-01", kapali: false },
];
let n = 9900;
const uid = () => ++n;
const kalemKur = (form) => { const r = G.giderKalemDogrula({ turId: 1, kdvOrani: 0, ...form }, { turMap, tedarikciler: TED, uid }); if (r.hatalar.length) throw new Error(JSON.stringify(r.hatalar)); return r.kayit; };
const KA = kalemKur({ id: 501, tarih: "2026-09-02", tutar: 10000, kdvOrani: 20, tedarikciId: 11, aciklama: "Sac" });
const KB = kalemKur({ id: 502, tarih: "2026-09-03", tutar: 1000, tedarikciId: 12, aciklama: "Bant" });
const KT = kalemKur({ id: 503, tarih: "2026-09-04", tutar: 9000, tedarikciId: 11, aciklama: "Kalıp", taksitSayisi: 3, sonOdemeTarihi: "2026-10-04" });
const KK = kalemKur({ id: 504, tarih: "2026-09-01", turId: 2, girisYonu: "brut", tutar: 20000, stopajOrani: 20, tedarikciId: 11, aciklama: "Kira" });
const KD = kalemKur({ id: 505, tarih: "2026-09-05", tutar: "1.000", paraBirimi: "USD", kur: "40", tedarikciId: 11, aciklama: "İthal" });
const KS = kalemKur({ id: 506, tarih: "2026-09-06", tutar: 500, aciklama: "Tedarikçisiz" });
const KF = kalemKur({ id: 507, tarih: "2026-12-06", tutar: 500, tedarikciId: 11, aciklama: "Gelecek" });
const KE = kalemKur({ id: 508, tarih: "2026-09-07", tutar: "100", paraBirimi: "EUR", kur: "45", tedarikciId: 11, aciklama: "Euro kalem" });
const KP = kalemKur({ id: 509, tarih: "2026-09-08", turId: 3, calisanId: 21, calisanAd: "Ali", resmiTutar: 30000, eldenTutar: 0, tedarikciId: null });
const KSGK = { id: 510, tarih: "2026-09-08", turId: 4, tutar: 5000, tedarikciId: null };
const GIDERLER = [KA, KB, KT, KK, KD, KS, KF, KE, KP, KSGK];
const BUGUN = "2026-09-30";
const avansKayit = (form, o = {}) => K.avansDogrula({ taraf: "tedarikci", tarih: "2026-09-10", ...form }, { tedarikciler: TED, hesaplar: HESAPLAR, ...o });
const TL_AVANS = { id: 701, tur: "avans", tarih: "2026-09-10", tutar: 5000, tedarikciId: 11, hesapId: 51, yontem: "Havale", aciklama: "" };
const USD_AVANS = { id: 702, tur: "avans", tarih: "2026-09-11", tutar: 20000, dovizTutar: 500, kur: 40, paraBirimi: "USD", tedarikciId: 11, hesapId: 53, yontem: "Havale" };
const zengin = (k, h) => G.odemeleriUygula([k], h, turMap)[0];
const mahsup = (k, form, h = [TL_AVANS, USD_AVANS], o = {}) => K.mahsupDogrula({ tarih: "2026-09-20", ...form }, { kalem: zengin(k, h), turMap, hareketler: h, giderler: GIDERLER, bugun: BUGUN, yururlukAy: "2026-01", tedarikciler: TED, ...o });
const kova = (h, pb, id = 11) => K.tedarikciAvansKovasi(id, pb, h, GIDERLER);
const yorumsuz = (f) => fs.readFileSync(f, "utf8").split("\n").filter(l => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).map(l => l.replace(/\s\/\/.*$/, "")).join("\n");
const dosyalar = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? dosyalar(path.join(d, e.name)) : /\.(jsx?|cjs|mjs)$/.test(e.name) ? [path.join(d, e.name)] : []));

describe("Spec 0155 A: avans kaydı", () => {
  it("AC-2: tedarikçi, tarih, tutar ve TL hesap girilen avans kaydedilir ve o hesabın bakiyesini girilen tutar kadar azaltır", () => {
    const r = avansKayit({ tedarikciId: 11, tutar: "5.000", hesapId: 51, yontem: "Havale" });
    expect(r.kayit).toEqual({ tur: "avans", tarih: "2026-09-10", tutar: 5000, tedarikciId: 11, hesapId: 51, yontem: "Havale", aciklama: "" });
    const b = K.hesapBakiyeleri(HESAPLAR, [{ ...r.kayit, id: 1 }], {}).get("51");
    expect(b.bakiyeK).toBe(9500000);
  });
  it("AC-3: hesap seçilmeyen avans kaydedilir, hiçbir bakiyeye girmez ve hesapsız listede görünür", () => {
    const r = avansKayit({ tedarikciId: 11, tutar: "100" });
    expect(r.kayit.hesapId).toBeNull();
    const h = [{ ...r.kayit, id: 2 }];
    expect([...K.hesapBakiyeleri(HESAPLAR, h, {}).values()].map(x => x.bakiyeK)).toEqual([10000000, 1000000, 0]);
    expect(K.hesapsizOdemeler(h).avansAdet).toBe(1);
  });
  it("AC-4 / AC-5 / AC-6 / AC-7: tedarikçisiz, silinmiş tedarikçiye, sıfır ya da eksi tutarlı ve iki taraflı avans reddedilir", () => {
    expect(avansKayit({ tutar: "10" }).hatalar.tedarikciId).toBe(K.TEDARIKCI_SECILMEDI);
    expect(avansKayit({ tedarikciId: 13, tutar: "10" }).hatalar.tedarikciId).toBe(K.SILINMIS_TEDARIKCI_AVANS);
    expect(avansKayit({ tedarikciId: 11, tutar: "0" }).hatalar.tutar).toBe("Tutar sıfırdan büyük olmalı.");
    expect(avansKayit({ tedarikciId: 11, tutar: "-5" }).hatalar.tutar).toBe("Tutar sıfırdan büyük olmalı.");
    expect(K.avansDogrula({ tedarikciId: 11, calisanId: 21, tarih: "2026-09-10", tutar: "10" }, { tedarikciler: TED, calisanlar: [{ id: 21, ad: "Ali" }], hesaplar: HESAPLAR }).hatalar.taraf).toBe(K.IKI_TARAF_HATASI);
  });
  it("AC-8 (C8): çalışan avansı döviz hesaptan verilemez, nedeni bugünkü metin", () => {
    expect(K.avansDogrula({ calisanId: 21, tarih: "2026-09-10", tutar: "10", hesapId: 53 }, { calisanlar: [{ id: 21, ad: "Ali" }], hesaplar: HESAPLAR }).hatalar.hesapId).toBe("Avans yalnız TL hesaptan verilir.");
  });
  it("AC-9 / AC-10: döviz hesaptan avans; kayıt döviz, kur ve para birimini taşır, lira kurdan; kur girilmezse reddedilir", () => {
    const r = avansKayit({ tedarikciId: 11, tutar: "500", hesapId: 53, kur: "40", kurKaynak: "oneri" });
    expect(r.kayit).toMatchObject({ tutar: 20000, dovizTutar: 500, kur: 40, paraBirimi: "USD", hesapId: 53 });
    expect(avansKayit({ tedarikciId: 11, tutar: "500", hesapId: 53 }).hatalar.kur).toBe(K.KUR_GIRILMEDI_HATASI);
  });
  it("AC-46 (R3/2): döviz avansın bakiyeye düşen tutarı hesaptan çıkan dövizdir; yönü yazılmamış avans çıkan sayılır", () => {
    const b = K.hesapBakiyeleri(HESAPLAR, [USD_AVANS, { ...TL_AVANS, yon: "bilinmeyen" }], {});
    expect(b.get("53").cikanK).toBe(50000);
    expect(b.get("51").cikanK).toBe(500000);
  });
  it("AC-21 / AC-22 / AC-45 (R11, R11/2, R12): geri ödeme hesaba girer ve açık avansı azaltır; açık avanstan fazlası ve hesapsızı reddedilir", () => {
    const h = [TL_AVANS];
    const g = avansKayit({ tedarikciId: 11, tutar: "2.000", hesapId: 51, yon: "giren" }, { hareketler: h, giderler: GIDERLER });
    expect(g.kayit.yon).toBe("giren");
    const h2 = [...h, { ...g.kayit, id: 9 }];
    expect(K.hesapBakiyeleri(HESAPLAR, h2, {}).get("51").bakiyeK).toBe(10000000 - 500000 + 200000);
    expect(kova(h2, "TRY").acikK).toBe(300000);
    expect(avansKayit({ tedarikciId: 11, tutar: "6.000", hesapId: 51, yon: "giren" }, { hareketler: h, giderler: GIDERLER }).hatalar.tutar).toMatch(/açık avans ₺5\.000,00/);
    expect(avansKayit({ tedarikciId: 11, tutar: "100", yon: "giren" }, { hareketler: h, giderler: GIDERLER }).hatalar.hesapId).toBe(K.GERI_ODEME_HESAP_HATASI);
  });
  it("AC-28 (R27): döviz avansın geri ödemesi başka para birimindeki hesaba yapılamaz (o hesabın kovasında açık avans yok)", () => {
    expect(avansKayit({ tedarikciId: 11, tutar: "10", hesapId: 51, yon: "giren" }, { hareketler: [USD_AVANS], giderler: GIDERLER }).hatalar.tutar).toMatch(/açık avans/);
    expect(avansKayit({ tedarikciId: 11, tutar: "10", hesapId: 53, kur: "40", yon: "giren" }, { hareketler: [USD_AVANS], giderler: GIDERLER }).kayit).toBeTruthy();
  });
  it("AC-57 / R23/2: okuyucu tedarikçi ve para birimi başına verilen, mahsup, geri ve açık; kovalar ayrı", () => {
    const m = K.tedarikciAvanslari([TL_AVANS, USD_AVANS], GIDERLER).get("11");
    expect(m.map(x => [x.paraBirimi, x.verilenK, x.acikK])).toEqual([["TRY", 500000, 500000], ["USD", 50000, 50000]]);
  });
});

describe("Spec 0155 B: mahsup", () => {
  it("AC-11 / AC-19: avansın tedarikçisine ait kaleme mahsup; kalan o kadar azalır, hiçbir bakiye değişmez", () => {
    const r = mahsup(KA, { tutar: "2.000" });
    expect(r.kayit).toMatchObject({ tur: "mahsup", tutar: 2000, tedarikciId: 11, giderId: 501, hesapId: null });
    const h = [TL_AVANS, USD_AVANS, { ...r.kayit, id: 30 }];
    expect(G.odemeHedefleri(zengin(KA, h), "normal")[0].kalanK).toBe(1000000);
    expect([...K.hesapBakiyeleri(HESAPLAR, h, {}).values()].map(x => x.bakiyeK)).toEqual([...K.hesapBakiyeleri(HESAPLAR, [TL_AVANS, USD_AVANS], {}).values()].map(x => x.bakiyeK));
    expect(kova(h, "TRY").acikK).toBe(300000);
  });
  it("AC-12 / AC-13: başka tedarikçinin kalemine ve tedarikçisiz kaleme mahsup reddedilir (ad yazılır)", () => {
    expect(mahsup(KB, { tutar: "10", tedarikciId: 11 }).hatalar.hedef).toBe(K.baskaTedarikciMahsupHatasi("Yıldız"));
    expect(mahsup(KS, { tutar: "10" }).hatalar.hedef).toBe(K.TEDARIKCISIZ_MAHSUP_HATASI);
  });
  it("AC-14 / AC-15: personel kalemine tedarikçi avansı reddedilir, çalışan yolu bugünkü gibi; SGK bugünkü metin", () => {
    expect(mahsup(KP, { tutar: "10", taraf: "tedarikci" }).hatalar.hedef).toBe(K.PERSONEL_TEDARIKCI_MAHSUP_HATASI);
    const cal = { id: 40, tur: "avans", tarih: "2026-09-01", tutar: 1000, calisanId: 21 };
    expect(K.mahsupDogrula({ tarih: "2026-09-20", tutar: "500" }, { kalem: zengin(KP, [cal]), turMap, hareketler: [cal], giderler: GIDERLER }).kayit).toMatchObject({ calisanId: 21, tutar: 500 });
    expect(mahsup(KSGK, { tutar: "10" }).hatalar.hedef).toBe(K.SGK_MAHSUP_HATASI);
  });
  it("AC-16 / AC-17: kalandan ve açık avanstan fazla mahsup reddedilir; nedenler rakamı yazar", () => {
    expect(mahsup(KB, { tutar: "10" }, [{ ...TL_AVANS, tedarikciId: 12 }]).kayit).toBeTruthy();
    expect(mahsup(KB, { tutar: "1.500" }, [{ ...TL_AVANS, tedarikciId: 12 }]).hatalar.tutar).toMatch(/Kalandan fazla mahsup edilemez \(kalan ₺1\.000,00\)/);
    expect(mahsup(KA, { tutar: "6.000" }).hatalar.tutar).toMatch(/Açık avanstan fazla mahsup edilemez \(açık avans ₺5\.000,00\)/);
  });
  it("AC-18: taksitli kalemde taksit seçilmeden kaydedilmez; seçilince o taksidin kalanı azalır", () => {
    expect(mahsup(KT, { tutar: "100" }).hatalar.hedef).toBe("Taksitli kalemde mahsup bir taksite bağlanır.");
    const t1 = KT.taksitler[0];
    const r = mahsup(KT, { tutar: "1.000", taksitId: t1.id });
    expect(r.kayit.taksitId).toBe(t1.id);
    expect(zengin(KT, [TL_AVANS, { ...r.kayit, id: 31 }]).taksitler[0]._odenenK).toBe(100000);
  });
  it("AC-58 (R7/2): stopaj hedefine mahsup reddedilir; ana hedefe mahsup olur", () => {
    const stopaj = KK.taksitler.find(t => t.hedef === "stopaj"), ana = KK.taksitler.find(t => t.hedef === "ana");
    expect(mahsup(KK, { tutar: "100", taksitId: stopaj.id }).hatalar.hedef).toBe(K.YALNIZ_ANA_MAHSUP_HATASI);
    expect(mahsup(KK, { tutar: "100", taksitId: ana.id }).kayit).toBeTruthy();
  });
  it("AC-61 / AC-62: çöpteki tedarikçinin kalemine ve gelecek tarihli kaleme mahsup reddedilir", () => {
    expect(mahsup({ ...KA, tedarikciId: 13 }, { tutar: "10" }).hatalar.hedef).toBe(K.SILINMIS_TEDARIKCI_MAHSUP_HATASI);
    expect(mahsup(KF, { tutar: "10" }).hatalar.hedef).toBe(K.KAPSAM_DISI_MAHSUP_HATASI);
  });
  it("AC-20 (R10): mahsup edilen kalem çöpe atılınca açık avans mahsup kadar geri artar", () => {
    const m = { id: 32, tur: "mahsup", tarih: "2026-09-20", tutar: 2000, tedarikciId: 11, giderId: 501 };
    expect(K.tedarikciAvansKovasi(11, "TRY", [TL_AVANS, m], GIDERLER).acikK).toBe(300000);
    expect(K.tedarikciAvansKovasi(11, "TRY", [TL_AVANS, m], GIDERLER.map(k => (k.id === 501 ? { ...k, deletedAt: "x" } : k))).acikK).toBe(500000);
  });
  it("AC-23: kısmi geri ödemeden sonra kalan açık avans mahsup edilebilir", () => {
    const h = [TL_AVANS, { id: 33, tur: "avans", yon: "giren", tarih: "2026-09-12", tutar: 2000, tedarikciId: 11, hesapId: 51 }];
    expect(mahsup(KA, { tutar: "3.000" }, h).kayit).toBeTruthy();
    expect(mahsup(KA, { tutar: "3.001" }, h).hatalar.tutar).toMatch(/Açık avanstan fazla/);
  });
  it("AC-24: döviz avanstan aynı dövizdeki kaleme; döviz avanstan düşer, lira kalemin donmuş kurundan; kur sorulmaz", () => {
    const r = mahsup(KD, { tutar: "200", avansPb: "USD" });
    expect(r.kayit).toMatchObject({ dovizTutar: 200, kur: 40, paraBirimi: "USD", tutar: 8000 });
    expect(kova([TL_AVANS, USD_AVANS, { ...r.kayit, id: 34 }], "USD").acikK).toBe(30000);
  });
  it("AC-25 / AC-59: döviz avanstan lira kaleme; tutar avansın dövizinde, kur mahsubun kendisi (zorunlu), lira kurdan; avansın kuru okunmaz", () => {
    expect(mahsup(KA, { tutar: "100", avansPb: "USD" }).hatalar.kur).toBe(K.KUR_GIRILMEDI_HATASI);
    const r = mahsup(KA, { tutar: "100", avansPb: "USD", kur: "41,5", kurKaynak: "elle" });
    expect(r.kayit).toMatchObject({ dovizTutar: 100, kur: 41.5, paraBirimi: "USD", tutar: 4150 });
    expect(kova([TL_AVANS, USD_AVANS, { ...r.kayit, id: 35 }], "USD").acikK).toBe(40000);
    // AC-59: varsayılan avansın biriminde, kalanın kurla çevrilmişi ile açık avansın küçüğü (motor yardımcısı).
    expect(K.mahsupVarsayilanK({ kalanK: 1200000, acikK: 50000, kurluMu: true, kur: 40 })).toBe(30000);
    expect(K.mahsupVarsayilanK({ kalanK: 1200000, acikK: 500000, kurluMu: false })).toBe(500000);
  });
  it("AC-27 (R28): TL avans döviz kaleme, dolar avans euro kaleme mahsup edilemez", () => {
    expect(mahsup(KE, { tutar: "10", avansPb: "TRY" }).hatalar.avansPb).toBe(K.TL_AVANS_DOVIZ_KALEM_HATASI);
    expect(mahsup(KE, { tutar: "10", avansPb: "USD" }).hatalar.avansPb).toBe(K.IKI_DOVIZ_MAHSUP_HATASI);
    expect(K.mahsupKovalari(KE, K.tedarikciAvanslari([TL_AVANS, USD_AVANS], GIDERLER).get("11"))).toEqual([]);
    expect(K.mahsupKovalari(KA, K.tedarikciAvanslari([TL_AVANS, USD_AVANS], GIDERLER).get("11")).map(k => k.paraBirimi)).toEqual(["TRY", "USD"]);
  });
  it("AC-26 / P1: döviz kovası kapanınca açık sıfır, lira kalıntısı alacak olarak kalmaz (okuyucuda liraK 0)", () => {
    const m = { id: 36, tur: "mahsup", tarih: "2026-09-20", tutar: 21000, dovizTutar: 500, kur: 42, paraBirimi: "USD", tedarikciId: 11, giderId: 501 };
    const k = kova([USD_AVANS, m], "USD");
    expect([k.acikK, k.liraK]).toEqual([0, 0]);
  });
});

describe("Spec 0155 C ve D: ekstre, borç, rapor", () => {
  const ek = (h, o = {}) => K.tedarikciEkstresi(11, { giderler: G.odemeleriUygula(GIDERLER, h, turMap), hareketler: h, turler, yururlukAy: "2026-01", bugun: BUGUN, ...o });
  const borcSatiri = (h) => kurusOf(G.borcOzeti(G.odemeleriUygula(GIDERLER, h, turMap), { turler, tedarikciler: TED, yururlukAy: "2026-01" }, BUGUN).satirlar.find(s => s.ad === "Demir Bant")?.tutar || 0);
  const kurusOf = (t) => Math.round(t * 100);
  const M2 = { id: 37, tur: "mahsup", tarih: "2026-09-20", tutar: 2000, tedarikciId: 11, giderId: 501 };
  const G1 = { id: 38, tur: "avans", yon: "giren", tarih: "2026-09-25", tutar: 1000, tedarikciId: 11, hesapId: 51 };
  it("AC-29 / AC-50 / AC-52: avans alacak, mahsup net sıfır kendi türüyle, geri ödeme alacağı azaltır; son bakiye alacaklıyken eksi", () => {
    const e = ek([TL_AVANS, M2, G1], { giderler: G.odemeleriUygula([KA], [TL_AVANS, M2, G1], turMap) });
    const tur = (t) => e.satirlar.find(s => s.tur === t);
    expect(tur("avans").etkiK).toBe(-500000);
    expect(tur("mahsup")).toMatchObject({ etkiK: 0, tutarK: 200000 });
    expect(tur("geriOdeme").etkiK).toBe(100000);
    expect(e.satirlar.filter(s => s.tur === "odeme")).toHaveLength(0);
    expect(e.bakiyeK).toBe(1200000 - 500000 + 100000);
    const e2 = ek([{ ...TL_AVANS, tutar: 20000 }], { giderler: G.odemeleriUygula([KA], [], turMap) });
    expect(e2.bakiyeK).toBeLessThan(0);
  });
  it("AC-51 / R15/3 / P1: son bakiye = borç özeti satırı − açık avansın lira karşılığı (lira ve döviz kovası, kapanmış döviz kovası dahil)", () => {
    const vakalar = [[TL_AVANS, M2, G1], [TL_AVANS, USD_AVANS], [USD_AVANS, { id: 39, tur: "mahsup", tarih: "2026-09-20", tutar: 16000, dovizTutar: 500, kur: 32, paraBirimi: "USD", tedarikciId: 11, giderId: 504, taksitId: KK.taksitler.find(t => t.hedef === "ana").id }]];
    for (const h of vakalar) {
      const e = ek(h);
      const acikLira = (K.tedarikciAvanslari(h, GIDERLER).get("11") || []).reduce((a, x) => a + x.liraK, 0);
      expect(e.bakiyeK, JSON.stringify(h.map(x => x.id))).toBe(borcSatiri(h) - acikLira);
    }
    const kapanan = ek(vakalar[2]).satirlar.find(s => s.kurFarkiK);
    expect(kapanan.tur).toBe("mahsup");
  });
  it("AC-31 / AC-32 / AC-33: borç özeti, hatırlatıcı ve açık kalemler avans hareketinden etkilenmez (yalnız avans; satır eklenmez)", () => {
    const g = G.odemeleriUygula(GIDERLER, [], turMap), ga = G.odemeleriUygula(GIDERLER, [TL_AVANS, USD_AVANS], turMap);
    const ayar = { turler, tedarikciler: TED, yururlukAy: "2026-01" };
    expect(G.borcOzeti(ga, ayar, BUGUN)).toEqual(G.borcOzeti(g, ayar, BUGUN));
    expect(odemeHatirlatmalari(ga, { ...ayar, esikGun: 7 }, BUGUN)).toEqual(odemeHatirlatmalari(g, { ...ayar, esikGun: 7 }, BUGUN));
    expect(acikKalemler(ga, ayar, BUGUN)).toEqual(acikKalemler(g, ayar, BUGUN));
  });
  it("AC-34 / AC-49 / AC-69: rapor kutusu para birimi başına, firma adı yok; çalışan kutusu ve hesapsız çalışan satırı tedarikçi avansını saymaz; HAREKETLER giren ile çıkanı ayırır", () => {
    const g0 = girdi0059();
    const h = [...g0.hareketler, { id: 801, tur: "avans", tarih: "2026-09-15", tutar: 3000, tedarikciId: 11, hesapId: null },
      { id: 802, tur: "avans", tarih: "2026-09-16", tutar: 4000, dovizTutar: 100, kur: 40, paraBirimi: "USD", tedarikciId: 11, hesapId: 53 },
      { id: 803, tur: "avans", yon: "giren", tarih: "2026-09-17", tutar: 1000, tedarikciId: 11, hesapId: 51 }];
    const once = giderKasaRaporu(g0, "2026-09"), r = giderKasaRaporu({ ...g0, hareketler: h }, "2026-09");
    expect(r.kasa.avansAy).toEqual(once.kasa.avansAy);
    expect(r.kasa.avansK).toBe(once.kasa.avansK);
    expect(r.kasa.tedarikciAvans).toEqual([{ paraBirimi: "TRY", acikK: 200000, verilenK: 300000, mahsupK: 0 }, { paraBirimi: "USD", acikK: 10000, verilenK: 10000, mahsupK: 0 }]);
    expect(r.kasa.hesapsiz.liste.map(x => x.etiket)).toEqual(expect.arrayContaining([expect.stringMatching(/^Çalışan avansları · 1 adet/), "Tedarikçi avansları · 1 adet"]));
    const html = buildGiderKasaRaporuHtml(r);
    expect(html).toContain("KASA · AÇIK TEDARİKÇİ AVANSI");
    expect(html).toContain("Avans geri ödemesi (giren)");
    const kutu = html.slice(html.indexOf("KASA · AÇIK TEDARİKÇİ AVANSI"));
    expect(kutu).not.toMatch(/Demir Bant|Yıldız/);
    expect(kutu).toMatch(/Açık avans \(USD\)/);
    expect(buildGiderKasaRaporuHtml(once)).not.toContain("AÇIK TEDARİKÇİ AVANSI");
  });
  it("AC-35 (R21): avans ve mahsup dönem raporunun gider toplamını, KDV'yi ve kovaları etkilemez", () => {
    const ayar = { turler, tedarikciler: TED, yururlukAy: "2026-01" };
    const r0 = G.hesaplaGiderRaporu(GIDERLER, { baslangic: "2026-09-01", bitis: "2026-09-30" }, ayar);
    const r1 = G.hesaplaGiderRaporu(G.odemeleriUygula(GIDERLER, [TL_AVANS, M2], turMap), { baslangic: "2026-09-01", bitis: "2026-09-30" }, ayar);
    for (const a of ["toplam", "kdv", "indKdv", "kovalar"]) expect(r1[a], a).toEqual(r0[a]);
  });
});

describe("Spec 0155 E: döviz yüklemi, çöp, taşıma, sınırlar", () => {
  it("AC-36 / AC-47 (R20, R22/2): çöp etiketi tedarikçi avansında adı ve kendi para birimini yazar; ödeme adsız; iz ayrıntısı ve ibare döviz avansı tanır", () => {
    expect(hareketCopEtiketi(USD_AVANS, "TRY", { tedarikciAdi: "Demir Bant" })).toBe("Demir Bant · 11/09/2026 · $500");
    expect(hareketCopEtiketi({ tur: "odeme", tarih: "2026-09-10", tutar: 10 }, "TRY", { tedarikciAdi: "Demir Bant" })).not.toMatch(/Demir/);
    expect(dovizHareketMi(USD_AVANS)).toBe(true); expect(dovizOdemeMi).toBe(dovizHareketMi);
    expect(dovizIzAyrintisi(USD_AVANS)).toEqual({ dovizTutar: 500, kur: 40, paraBirimi: "USD" });
    expect(dovizOdemeIbaresi(USD_AVANS)).toMatch(/\$500,00 · kur 40/);
  });
  it("AC-48 (R27/2): hesap taşımada döviz avans hesapsız bırakılamaz, nedeni tutar ve para birimini yazar", () => {
    const p = K.hesapTasimaPlani(HESAPLAR[1], [USD_AVANS], {}, HESAPLAR);
    expect(p.nedenler.hesapsiz.join(" ")).toMatch(/döviz avans \(\$500\): hesapsız bırakılamaz/);
  });
  it("AC-38 / AC-66 (R1/2): mahsup edilmiş avans mahsubun altına düşürülemez; geri ödeme serbestçe silinir, düzenlemesi açık avansı aşamaz", () => {
    const m = { id: 40, tur: "mahsup", tarih: "2026-09-20", tutar: 3000, tedarikciId: 11, giderId: 501 };
    const geri = { id: 41, tur: "avans", yon: "giren", tarih: "2026-09-21", tutar: 1000, tedarikciId: 11, hesapId: 51 };
    const h = [TL_AVANS, m, geri];
    expect(K.tedarikciAvansSilinebilirMi(TL_AVANS, h, GIDERLER).ok).toBe(false);
    expect(K.tedarikciAvansDuzenlenebilirMi(TL_AVANS, 4000, h, GIDERLER)).toMatchObject({ ok: true, enAzK: 400000 });
    expect(K.tedarikciAvansDuzenlenebilirMi(TL_AVANS, 3999, h, GIDERLER).ok).toBe(false);
    expect(K.tedarikciAvansSilinebilirMi(geri, h, GIDERLER).ok).toBe(true);
    expect(K.tedarikciAvansDuzenlenebilirMi(geri, 2000, h, GIDERLER)).toMatchObject({ ok: true, enCokK: 200000 });
    expect(K.tedarikciAvansDuzenlenebilirMi(geri, 2001, h, GIDERLER).ok).toBe(false);
  });
  it("AC-67 / P8: avans ya da mahsup hareketi olan (çöpteki dahil) tedarikçiler korunur", () => {
    expect([...K.avansliTedarikciler([TL_AVANS, { ...USD_AVANS, tedarikciId: 12, deletedAt: "x" }, { id: 1, tur: "odeme", tedarikciId: 13 }])]).toEqual(["11", "12"]);
  });
});

describe("Spec 0155: kaynak taramaları", () => {
  it("AC-40 (C5): yeni hareket türü, eylem izni ve veri bölümü yok", () => {
    const sa = yorumsuz("electron/serverAuth.cjs");
    expect(sa).not.toMatch(/tedarikci_avans|"geriOdeme"|tedarikciAvans/);
    expect(yorumsuz("src/components/settings/serverPermissionDefs.js")).not.toMatch(/tedarikci_avans|geri_odeme/);
    expect(yorumsuz("electron/db.cjs")).not.toMatch(/CREATE TABLE IF NOT EXISTS tedarikci_avans/);
  });
  it("AC-41 (C6): tedarikciId dört noktada; okuma boş değeri gövdeye yazmaz", () => {
    const db = yorumsuz("electron/db.cjs");
    expect(db).toMatch(/karsiParaBirimi TEXT, tedarikciId INTEGER\n\);/);
    expect(db).toMatch(/ensureColumns\(conn, "hesap_hareketleri", HAREKET_TEDARIKCI_COLUMN\)/);
    expect(db).toMatch(/karsiParaBirimi, tedarikciId\)\n\s+VALUES/);
    expect(db).toMatch(/bosOlmayan\(\{ deletedAt, yon, dovizTutar, kur, paraBirimi, karsiTutar, karsiParaBirimi, tedarikciId \}\)/);
  });
  it("AC-57 / C2/2: açık avans tek okuyucudan; ekranlarda tedarikçi avansı toplanmaz", () => {
    for (const f of dosyalar("src/components")) {
      const s = yorumsuz(f);
      expect(s, f).not.toMatch(/tedarikciId[^\n]*\.reduce\(|verilenK\s*[+-]|acikK\s*\+=/);
    }
    for (const f of ["src/components/kasa/TedarikciAvanslari.jsx", "src/components/gider/Tedarikciler.jsx", "src/components/gider/OdemeKayitPenceresi.jsx", "src/components/GiderForm.jsx", "src/lib/giderRaporu.js"])
      expect(yorumsuz(f), f).toMatch(/tedarikciAvanslari\(/);
  });
});

// ── Spec 0155 triyaj ──────────────────────────────────────────────────────────────────────────────────────────────────────
describe("Spec 0155 triyaj", () => {
  const ekT = (h) => K.tedarikciEkstresi(11, { giderler: G.odemeleriUygula(GIDERLER, h, turMap), hareketler: h, turler, yururlukAy: "2026-01", bugun: BUGUN });
  const borcT = (h) => Math.round(Number(G.borcOzeti(G.odemeleriUygula(GIDERLER, h, turMap), { turler, tedarikciler: TED, yururlukAy: "2026-01" }, BUGUN).satirlar.find(s => s.ad === "Demir Bant")?.tutar || 0) * 100);
  it("bulgu 2 (R15/3, P1): aynı gün girilen döviz avans ve mahsup ertesi günle aynı sonucu verir; kur farkı tetiklenmez", () => {
    const mah = (tarih) => ({ id: 41, tur: "mahsup", tarih, tutar: 4000, dovizTutar: 100, kur: 40, paraBirimi: "USD", tedarikciId: 11, giderId: 501, taksitId: null });
    const ayni = [USD_AVANS, mah(USD_AVANS.tarih)], ertesi = [USD_AVANS, mah("2026-09-12")];
    const kv = (h) => K.tedarikciAvanslari(h, GIDERLER).get("11")[0];
    expect(kv(ayni)).toMatchObject({ paraBirimi: "USD", acikK: 40000, liraK: 1600000 });
    expect(kv(ayni)).toEqual(kv(ertesi));
    expect(ekT(ayni).bakiyeK).toBe(ekT(ertesi).bakiyeK);
    expect(ekT(ayni).satirlar.some(s => s.kurFarkiK)).toBe(false);
    expect(ekT(ayni).bakiyeK).toBe(borcT(ayni) - 1600000);
    // Dizide mahsup avanstan önce dursa da (giriş sırası) sonuç aynı.
    expect(kv([mah(USD_AVANS.tarih), USD_AVANS])).toEqual(kv(ertesi));
  });
  it("bulgu 2: kur farkı yalnız adımdan önce açık sıfırdan büyükken uygulanır (kovayı kapatan satır)", () => {
    const kapat = { id: 42, tur: "mahsup", tarih: "2026-09-11", tutar: 16000, dovizTutar: 500, kur: 32, paraBirimi: "USD", tedarikciId: 11, giderId: 504, taksitId: KK.taksitler.find(t => t.hedef === "ana").id };
    const s = ekT([kapat, USD_AVANS]).satirlar.filter(x => x.kurFarkiK);
    expect(s.map(x => [x.tur, x.kurFarkiK])).toEqual([["mahsup", 400000]]);
    // Açığı zaten sıfır olan kovada (avansı silinmiş) mahsup kur farkı doğurmaz; lira kalıntısı silinmez.
    const sahipsiz = { id: 47, tur: "mahsup", tarih: "2026-09-12", tutar: 4000, dovizTutar: 100, kur: 40, paraBirimi: "USD", tedarikciId: 11, giderId: 501, taksitId: null };
    expect(ekT([TL_AVANS, sahipsiz]).satirlar.some(x => x.kurFarkiK)).toBe(false);
  });
  it("bulgu 3 (R12): çöpten geri alınan geri ödeme açık avansı aşıyorsa reddedilir; aşmıyorsa geri alınır", () => {
    const geri = { id: 43, tur: "avans", yon: "giren", tarih: "2026-09-12", tutar: 5000, tedarikciId: 11, hesapId: 51, deletedAt: "2026-09-13T00:00:00Z" };
    const mah = { id: 44, tur: "mahsup", tarih: "2026-09-14", tutar: 5000, tedarikciId: 11, giderId: 501, taksitId: null };
    const r = K.copHareketGeriAlmaNedeni(geri, { giderler: GIDERLER, hareketler: [TL_AVANS, geri, mah], turMap, tedarikciler: TED });
    expect(r).toMatch(/^Geri alınamadı: Geri ödeme en çok ₺0,00 olabilir/);
    expect(K.copHareketGeriAlmaNedeni(geri, { giderler: GIDERLER, hareketler: [TL_AVANS, geri], turMap, tedarikciler: TED })).toBeNull();
    expect(K.copHareketGeriAlmaNedeni({ ...TL_AVANS, deletedAt: "x" }, { giderler: GIDERLER, hareketler: [], turMap, tedarikciler: TED })).toBeNull();
  });
  it("bulgu 3 (R7/3): silinmiş tedarikçinin kalemine yapılmış mahsup çöpten geri alınamaz", () => {
    const k = kalemKur({ id: 520, tarih: "2026-09-02", tutar: 1000, tedarikciId: 13, aciklama: "Eski" });
    const av = { id: 45, tur: "avans", tarih: "2026-09-01", tutar: 1000, tedarikciId: 13, hesapId: 51 };
    const m = { id: 46, tur: "mahsup", tarih: "2026-09-03", tutar: 500, tedarikciId: 13, giderId: 520, taksitId: null, deletedAt: "2026-09-04T00:00:00Z" };
    const r = K.copHareketGeriAlmaNedeni(m, { giderler: [...GIDERLER, k], hareketler: [av, m], turMap, bugun: BUGUN, yururlukAy: "2026-01", tedarikciler: TED });
    expect(r).toBe(`Geri alınamadı: ${K.SILINMIS_TEDARIKCI_MAHSUP_HATASI}`);
    expect(K.copHareketGeriAlmaNedeni(m, { giderler: [...GIDERLER, k], hareketler: [av, m], turMap, bugun: BUGUN, yururlukAy: "2026-01", tedarikciler: TED.map(t => ({ ...t, deletedAt: undefined })) })).toBeNull();
  });
  it("bulgu 5: çalışan mahsubunun ölü dalı yok; avansParaBirimi adı, KUR_KAYNAK takma adı yok", () => {
    const src = fs.readFileSync(path.resolve("src/lib/kasa.js"), "utf-8");
    expect(src).not.toMatch(/davranisOf\(kalem, turMap\) !== DAVRANIS\.PERSONEL \|\| kalem\.calisanId == null/);
    expect(src).not.toMatch(/AVANS_PARA_BIRIMI|KUR_KAYNAK_0155/);
    expect(K.avansParaBirimi({ dovizTutar: 10, paraBirimi: "USD" })).toBe("USD");
    expect(K.mahsupDogrula({ tutar: 10, tarih: "2026-09-10" }, { kalem: { ...KP, calisanId: null }, turMap, bugun: BUGUN, yururlukAy: "2026-01" }).hatalar.hedef).toBe("Avans yalnız personel kalemine mahsup edilir.");
  });
});
