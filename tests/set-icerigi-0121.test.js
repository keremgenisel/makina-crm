// Spec 0121: setin içeriği, maliyeti, hazırlama ve geri alma (saf motor) ile kaynak taramaları.
process.env.TZ = "Europe/Istanbul";
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import {
  setIcerigiDogrula, setKatalogu, setOzeti, setMi, parcaMaliyetKurus, parcaMaliyetiVar, maliyetGirildiMi, parcaMaliyetMetni,
  maliyetKaynagi, maliyetGecmisiYaz, gecmisliKayit, setBilesenAdi, setBileseniSecilebilirMi, setIcerikSatiri,
  SET_AYNI_PARCA, SET_KENDISI, SET_IC_ICE, KIT_ADET_HATASI, SILINMIS_PARCA, BULUNAMAYAN_PARCA, LISTEDE_OLMAYAN_PARCA,
  SET_EXCEL_HATASI, setBileseniHatasi,
} from "../src/lib/urunAgaci";
import {
  IADE_TIPI, IPTAL_TIPI, HAREKET_TIP_AD, netGirisler, karsiGirisler, girisGeriAlinabilir, stokEtkisi, stokuUygula, netDusumleri,
} from "../src/lib/stokHareketi";
import {
  setHazirlaPlani, setGeriAlPlani, setHazirlaOnizleme, hazirlamaGeriAlindiMi, HAZIRLAMA_TARIH_GECERSIZ, HAZIRLAMA_TARIH_GELECEK,
  HAZIRLAMA_ADET_HATASI, geriAlRedMetni, hazirlamaNotu,
} from "../src/lib/setUretimi";
import { parcaDisaAktarmaSatiri, parcaSatirlariniCoz, parcaIceAktarmaUygula, PARCA_AKTARMA_BASLIKLARI } from "../src/lib/parcaAktarma";
import { modelMaliyeti } from "../src/lib/makinaStandartMaliyet";
import { totalMiktar } from "../src/lib/utils";

const oku = (f) => fs.readFileSync(f, "utf8");
const yorumsuz = (f) => oku(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

const PARCALAR = [
  { id: 1, ad: "Rulman A", maliyet: 100, fiyatTRY: "500" },
  { id: 2, ad: "Rulman B", maliyet: 25.5, fiyatTRY: "200" },
  { id: 3, ad: "Dişli", hammaddeler: [{ tedarikciId: 7, tutar: 300 }, { tedarikciId: 8, tutar: 75 }], fiyatTRY: "" },
  { id: 4, ad: "Maliyetsiz", fiyatTRY: "1.000" },
  { id: 5, ad: "Çöpteki", maliyet: 40, deletedAt: "2026-10-01T10:00:00.000Z", fiyatTRY: "90" },
  { id: 6, ad: "Pul", maliyet: 7.5, maliyetGecmisi: [{ gecerli: "", kurus: 500 }, { gecerli: "2026-03-01", kurus: 750 }] },
];
const SET = { id: 10, ad: "Rulman Seti", maliyet: 9999, hammaddeler: [{ tedarikciId: 7, tutar: 1 }], fiyatTRY: "3000",
  setIcerigi: [{ partId: 1, miktar: 2 }, { partId: 2, miktar: 4 }] };
const HEPSI = [...PARCALAR, SET];
const KAT = setKatalogu(HEPSI);

describe("Spec 0121 A: içerik doğrulaması", () => {
  it("AC-2 / AC-35: iki bileşen kaydı yalnız { partId, miktar } taşır; alan adı setIcerigi", () => {
    const r = setIcerigiDogrula([{ partId: "1", miktar: "2" }, { partId: "2", miktar: "4" }, { partId: "", miktar: "" }], { kendiId: 99, parts: HEPSI });
    expect(r.gecerli).toBe(true);
    expect(r.kayit).toEqual([{ partId: 1, miktar: 2 }, { partId: 2, miktar: 4 }]);
    expect(Object.keys(r.kayit[0]).sort()).toEqual(["miktar", "partId"]);
    expect(setMi({ setIcerigi: r.kayit })).toBe(true);
  });
  it("AC-3: adet 0, boş ya da ondalıklı ise kayıt geçersiz ve neden satırda", () => {
    for (const m of ["0", "", "1,5", "2.5", "-1", "abc"]) {
      const r = setIcerigiDogrula([{ partId: "1", miktar: m }], { kendiId: 99, parts: HEPSI });
      expect(r.gecerli).toBe(false);
      expect(r.hatalar[0]).toBe(KIT_ADET_HATASI);
    }
  });
  it("AC-4: aynı parça ikinci kez kayda girmez ve adedin artırılması söylenir", () => {
    const r = setIcerigiDogrula([{ partId: "1", miktar: "1" }, { partId: "1", miktar: "2" }], { kendiId: 99, parts: HEPSI });
    expect(r.hatalar[1]).toBe(SET_AYNI_PARCA);
    expect(SET_AYNI_PARCA).toMatch(/adedini artırın/);
  });
  it("AC-5: içeriği olan parça seçicide listelenmez ve kayıt yoluyla eklenemez", () => {
    expect(setBileseniSecilebilirMi(SET, 99)).toBe(false);
    expect(setBileseniSecilebilirMi(PARCALAR[0], 99)).toBe(true);
    expect(setBileseniSecilebilirMi(PARCALAR[4], 99)).toBe(false); // çöpteki seçilemez
    const r = setIcerigiDogrula([{ partId: "10", miktar: "1" }], { kendiId: 99, parts: HEPSI });
    expect(r.hatalar[0]).toBe(SET_IC_ICE);
  });
  it("AC-6: parça kendi içeriğine eklenemez", () => {
    expect(setBileseniSecilebilirMi(PARCALAR[0], 1)).toBe(false);
    expect(setIcerigiDogrula([{ partId: "1", miktar: "1" }], { kendiId: 1, parts: HEPSI }).hatalar[0]).toBe(SET_KENDISI);
  });
  it("AC-41: başka bir setin içeriğinde geçen parçaya içerik eklenmesi reddedilir, neden o setlerin adını yazar (en çok üç, +n)", () => {
    const r = setIcerigiDogrula([{ partId: "6", miktar: "1" }], { kendiId: 1, parts: HEPSI });
    expect(r.gecerli).toBe(false);
    expect(r.genel).toBe(setBileseniHatasi(["Rulman Seti"]));
    expect(r.genel).toContain("Rulman Seti");
    expect(setBileseniHatasi(["A", "B", "C", "D", "E"])).toContain("A, B, C +2");
    // Karar 48: çöpteki set sayılmaz.
    const cop = HEPSI.map(p => (p.id === 10 ? { ...p, deletedAt: "2026-10-02" } : p));
    expect(setIcerigiDogrula([{ partId: "6", miktar: "1" }], { kendiId: 1, parts: cop }).gecerli).toBe(true);
    // Boş içerik (set değil) kaydı yasakla karşılaşmaz.
    expect(setIcerigiDogrula([], { kendiId: 1, parts: HEPSI }).gecerli).toBe(true);
  });
});

describe("Spec 0121 B: maliyet", () => {
  it("AC-9: bütün bileşenlerin maliyeti girilmişse setin maliyeti bileşen × adet toplamına kuruşu kuruşuna eşit", () => {
    expect(parcaMaliyetKurus(SET, undefined, KAT)).toBe(10000 * 2 + 2550 * 4);
  });
  it("AC-10 / R10: bir bileşenin maliyeti yoksa setin maliyeti null (sıfır değil) ve eksik sayısı döner", () => {
    const s = { ...SET, setIcerigi: [{ partId: 1, miktar: 1 }, { partId: 4, miktar: 1 }] };
    expect(parcaMaliyetKurus(s, undefined, KAT)).toBeNull();
    expect(setOzeti(s.setIcerigi, KAT).eksik).toBe(1);
    expect(parcaMaliyetiVar(s, undefined, KAT)).toBe(false);
  });
  it("AC-11: içeriği olan parçada elle maliyet ve hammadde kırılımı okunmaz", () => {
    expect(SET.maliyet).toBe(9999);
    expect(SET.hammaddeler.length).toBe(1);
    expect(parcaMaliyetKurus(SET, undefined, KAT)).toBe(30200);
  });
  it("AC-12: bileşen maliyeti geçmişte değiştiyse setin maliyeti tarihe göre değişir", () => {
    const s = { id: 11, ad: "Pul Seti", setIcerigi: [{ partId: 6, miktar: 10 }] };
    expect(parcaMaliyetKurus(s, "2026-02-01", KAT)).toBe(5000);
    expect(parcaMaliyetKurus(s, "2026-04-01", KAT)).toBe(7500);
  });
  it("AC-14: katalog verilmezse set dört fonksiyonda da 'girilmedi' (null), elle değer dönmez", () => {
    expect(parcaMaliyetKurus(SET)).toBeNull();
    expect(parcaMaliyetKurus(SET, "2026-04-01")).toBeNull();
    expect(parcaMaliyetiVar(SET)).toBe(false);
    expect(maliyetGirildiMi(SET)).toBe(false);
    expect(parcaMaliyetMetni(SET)).toBe("—");
    expect(maliyetKaynagi(SET)).toEqual({ tur: "icerik", n: 2 });
  });
  it("AC-38: zincirin dört fonksiyonu katalogla seti çözer; maliyetKaynagi üçüncü tür", () => {
    expect(parcaMaliyetiVar(SET, undefined, KAT)).toBe(true);
    expect(maliyetGirildiMi(SET, undefined, KAT)).toBe(true);
    expect(parcaMaliyetMetni(SET, undefined, KAT)).toBe("302,00 ₺");
    expect(maliyetKaynagi(SET, undefined, KAT)).toEqual({ tur: "icerik", n: 2 });
    expect(maliyetKaynagi(PARCALAR[2], undefined, KAT).tur).toBe("kirilim");
    expect(maliyetKaynagi(PARCALAR[0], undefined, KAT).tur).toBe("elle");
  });
  it("AC-7 / AC-8: çöpteki ve bulunamayan bileşen maliyeti eksik yapar; ad ham diziden iki ayrı ibareyle", () => {
    const s = { id: 12, ad: "S", setIcerigi: [{ partId: 1, miktar: 1 }, { partId: 5, miktar: 1 }] };
    expect(parcaMaliyetKurus(s, undefined, KAT)).toBeNull();
    const s2 = { id: 13, ad: "S2", setIcerigi: [{ partId: 1, miktar: 1 }, { partId: 404, miktar: 1 }] };
    expect(parcaMaliyetKurus(s2, undefined, KAT)).toBeNull();
    expect(setBilesenAdi(5, HEPSI)).toBe(`Çöpteki (${SILINMIS_PARCA})`);
    expect(setBilesenAdi(404, HEPSI)).toBe(BULUNAMAYAN_PARCA);
    expect(SILINMIS_PARCA).not.toBe(BULUNAMAYAN_PARCA);
    // Soft-delete simetrisi: çöpten dönen bileşen maliyeti yeniden çözer.
    const geri = setKatalogu(HEPSI.map(p => (p.id === 5 ? { ...p, deletedAt: null } : p)));
    expect(parcaMaliyetKurus(s, undefined, geri)).toBe(10000 + 4000);
  });
  it("AC-42: maliyet okuması bileşenin içeriğine bakmaz, veride kalmış iç içe sette özyineleme yok", () => {
    // İç setin elle maliyeti var: bileşenin içeriğine bakılmasa bile kendi değeri okunsaydı dış set çözülürdü (mutasyon ölçüsü).
    const ic = { id: 20, ad: "İç", maliyet: 50, setIcerigi: [{ partId: 21, miktar: 1 }] };
    const dis = { id: 21, ad: "Dış", setIcerigi: [{ partId: 20, miktar: 1 }] };
    const k = setKatalogu([ic, dis]);
    expect(parcaMaliyetKurus(dis, undefined, k)).toBeNull();
    expect(setOzeti(dis.setIcerigi, k).eksik).toBe(1);
  });
  it("AC-15 / AC-16 / Karar 46: fiyat toplamı TL fiyatından tam lira; fiyatı olmayan satır sayılmaz ve sayısı döner", () => {
    const o = setOzeti([{ partId: 1, miktar: 2 }, { partId: 3, miktar: 1 }, { partId: 4, miktar: 1 }], KAT);
    expect(o.fiyatToplam).toBe(500 * 2 + 1000);
    expect(o.fiyatsiz).toBe(1);
  });
});

describe("Spec 0121 B: maliyet geçmişi kapısı (R7/2, C11)", () => {
  const eski = { id: 30, ad: "S", maliyet: 10, maliyetGecmisi: [{ gecerli: "", kurus: 800 }, { gecerli: "2026-05-01", kurus: 1000 }] };
  it("AC-13 / AC-39: içeriği olan kayıtta motor çalışmaz, geçmiş aynen korunur (kayıt fonksiyonu yolu)", () => {
    const yeni = { ...eski, maliyet: 55, setIcerigi: [{ partId: 1, miktar: 1 }] };
    const r = gecmisliKayit(yeni, eski, { tarih: "2026-10-01", bugun: "2026-10-15", tarihElle: false });
    expect(r.maliyetGecmisi).toEqual(eski.maliyetGecmisi);
    expect(maliyetGecmisiYaz(eski, 5500, { tarih: "2026-10-01", bugun: "2026-10-15", set: true })).toEqual({ gecmis: eski.maliyetGecmisi, hata: null });
    // Set olmayan yeni parçada geçmiş hiç doğmaz.
    const bos = gecmisliKayit({ id: 31, ad: "Y", setIcerigi: [{ partId: 1, miktar: 1 }] }, { id: 31, ad: "Y" }, { tarih: "2026-10-01", bugun: "2026-10-15" });
    expect(bos.maliyetGecmisi).toBeUndefined();
  });
  it("AC-39: içerik kaldırılınca eski geçmiş yeniden devreye girer", () => {
    const set = { ...eski, setIcerigi: [{ partId: 1, miktar: 1 }] };
    const yeni = { ...eski, maliyet: 12 };
    const r = gecmisliKayit(yeni, set, { tarih: "2026-10-01", bugun: "2026-10-15" });
    expect(r.maliyetGecmisi.at(-1)).toEqual({ gecerli: "2026-10-01", kurus: 1200 });
  });
  it("AC-13 / AC-50: Excel içe aktarması setin maliyet hücresini almaz, geçmiş yazmaz, nedeni satır numarasıyla bildirir", () => {
    const set = { id: 40, ad: "Set X", maliyet: 5, maliyetGecmisi: [{ gecerli: "", kurus: 300 }, { gecerli: "2026-05-01", kurus: 500 }],
      setIcerigi: [{ partId: 1, miktar: 3 }] };
    const parts = [PARCALAR[0], set];
    const rows = [PARCA_AKTARMA_BASLIKLARI, ["Set X", "", "", "", "", "", "", "", "", "77"]];
    const r = parcaSatirlariniCoz(rows, parts, 1000, "2026-10-15");
    expect(r.parts[0].maliyet).toBeUndefined();
    expect(r.parts[0].maliyetGecmisi).toBeUndefined();
    expect(r.errors).toEqual([`Satır 2: ${SET_EXCEL_HATASI}`]);
    const uygulanan = parcaIceAktarmaUygula(parts, r.parts).find(p => p.id === 40);
    expect(uygulanan.setIcerigi).toEqual(set.setIcerigi);
    expect(uygulanan.maliyetGecmisi).toEqual(set.maliyetGecmisi);
    expect(uygulanan.maliyet).toBe(5);
    // Dışa aktarmanın yazdığı rakam geri yüklenirse bildirim yok.
    const kat = setKatalogu(parts);
    const disa = parcaDisaAktarmaSatiri(set, kat);
    expect(disa).toHaveLength(PARCA_AKTARMA_BASLIKLARI.length);
    expect(disa[9]).toBe(300);
    expect(disa).not.toContain(set.setIcerigi);
    expect(parcaDisaAktarmaSatiri(set)[9]).toBe("");
    expect(parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI, ["Set X", "", "", "", "", "", "", "", "", 300]], parts, 1000, "2026-10-15").errors).toEqual([]);
  });
  it("AC-50 (triyaj bulgu 1): saklı hammadde kırılımı da olan set, değiştirilmemiş dosyayla geri yüklenince hata yok; farklı rakamda neden içerik", () => {
    const parts = [{ id: 1, ad: "A", maliyet: 10 }, { id: 2, ad: "B", maliyet: 5 },
      { id: 3, ad: "Kırılımlı Set", hammaddeler: [{ tedarikciId: 7, tutar: 99 }], setIcerigi: [{ partId: 1, miktar: 2 }, { partId: 2, miktar: 1 }] }];
    const kat = setKatalogu(parts);
    const satirlar = [PARCA_AKTARMA_BASLIKLARI, ...parts.map(p => parcaDisaAktarmaSatiri(p, kat))];
    expect(satirlar[3][9]).toBe(25);
    expect(parcaSatirlariniCoz(satirlar, parts, 1000, "2026-10-15").errors).toEqual([]);
    const farkli = [PARCA_AKTARMA_BASLIKLARI, ["Kırılımlı Set", "", "", "", "", "", "", "", "", 40]];
    expect(parcaSatirlariniCoz(farkli, parts, 1000, "2026-10-15").errors).toEqual([`Satır 2: ${SET_EXCEL_HATASI}`]);
  });
});

describe("Spec 0121 C: set hazırlama (setUretimi)", () => {
  const stok = [{ partId: "1", miktar: 10 }, { partId: "2", miktar: 3 }];
  const temel = { set: SET, tarih: "2026-10-10", bugun: "2026-10-15" };
  it("AC-19 / AC-22: stok yeterliyken 2 set: her bileşen adedin iki katı düşer, set 2 artar; tek işlem kimliği", () => {
    const st = [{ partId: "1", miktar: 10 }, { partId: "2", miktar: 20 }];
    const r = setHazirlaPlani({ ...temel, adet: "2", partStock: st, islemId: 777 });
    expect(r.ok).toBe(true);
    const sonra = stokuUygula(st, stokEtkisi(r.hareketler));
    expect(totalMiktar(sonra, "1")).toBe(6);
    expect(totalMiktar(sonra, "2")).toBe(12);
    expect(totalMiktar(sonra, "10")).toBe(2);
    expect(new Set(r.hareketler.map(h => h.referansId))).toEqual(new Set([777]));
    expect(r.hareketler.map(h => h.tip).sort()).toEqual(["set_girisi", "set_uretimi", "set_uretimi"]);
  });
  it("AC-20 / AC-49: bileşen stoğu yetmezse eldeki kadarı düşer, stok eksiye inmez, set yine artar; eksikler ve not", () => {
    const r = setHazirlaPlani({ ...temel, adet: "2", partStock: stok });
    expect(r.ok).toBe(true);
    expect(r.eksikler.map(e => e.partId)).toEqual(["2"]);
    const sonra = stokuUygula(stok, stokEtkisi(r.hareketler));
    expect(totalMiktar(sonra, "2")).toBe(0);
    expect(totalMiktar(sonra, "1")).toBe(6);
    expect(totalMiktar(sonra, "10")).toBe(2);
    expect(r.hareketler.every(h => h.notlar.startsWith(hazirlamaNotu(2, 1)))).toBe(true);
    expect(hazirlamaNotu(2, 1)).toBe("Set hazırlandı · 2 adet · 1 bileşen stokta yoktu");
  });
  it("AC-21 / AC-47: adet, takvim ve gelecek tarih reddedilir; metinler 'Hazırlama tarihi' ile başlar", () => {
    for (const adet of ["0", "1,5", "", "-2"]) expect(setHazirlaPlani({ ...temel, adet, partStock: stok }).hata).toBe(HAZIRLAMA_ADET_HATASI);
    expect(setHazirlaPlani({ ...temel, adet: "1", tarih: "2026-02-30", partStock: stok }).hata).toBe(HAZIRLAMA_TARIH_GECERSIZ);
    expect(setHazirlaPlani({ ...temel, adet: "1", tarih: "2026-10-16", partStock: stok }).hata).toBe(HAZIRLAMA_TARIH_GELECEK);
    expect(HAZIRLAMA_TARIH_GECERSIZ.startsWith("Hazırlama tarihi")).toBe(true);
    expect(HAZIRLAMA_TARIH_GELECEK.startsWith("Hazırlama tarihi")).toBe(true);
    expect(yorumsuz("src/lib/setUretimi.js")).not.toMatch(/Geçerlilik tarihi|TARIH_GECERSIZ_HATASI|TARIH_GELECEK_HATASI/);
    expect(setHazirlaPlani({ ...temel, adet: "1", tarih: "2026-10-15", partStock: stok }).ok).toBe(true);
  });
  it("AC-48: geçmiş tarihli hazırlama hareketin etiketidir; adet yazım anında uygulanır", () => {
    const r = setHazirlaPlani({ ...temel, adet: "1", tarih: "2025-01-03", partStock: stok });
    expect(r.hareketler.every(h => h.tarih === "2025-01-03")).toBe(true);
    expect(totalMiktar(stokuUygula(stok, stokEtkisi(r.hareketler)), "10")).toBe(1);
  });
  it("AC-37 / R13/2: bileşen stoğu hiç olmayan hazırlama yalnız setin satırını yazar ve geri alınır", () => {
    const r = setHazirlaPlani({ ...temel, adet: "3", partStock: [] });
    expect(r.hareketler.map(h => h.tip)).toEqual(["set_girisi"]);
    const ps = stokuUygula([], stokEtkisi(r.hareketler));
    const g = setGeriAlPlani({ islemId: r.islemId, partStock: ps, partStockLog: r.hareketler, tarih: "2026-10-15" });
    expect(g.ok).toBe(true);
    expect(g.hareketler.map(h => [h.tip, h.miktar])).toEqual([["set_girisi_iptal", -3]]);
    expect(totalMiktar(stokuUygula(ps, stokEtkisi(g.hareketler)), "10")).toBe(0);
  });
  it("AC-58: kullanıcının notu yalnız setin satırında", () => {
    const r = setHazirlaPlani({ ...temel, adet: "1", partStock: stok, not: "Atölye A" });
    expect(r.hareketler.find(h => h.tip === "set_girisi").notlar).toMatch(/Atölye A$/);
    expect(r.hareketler.filter(h => h.tip === "set_uretimi").every(h => !h.notlar.includes("Atölye A"))).toBe(true);
  });
  it("AC-60: kırpma kayıt anındaki stokla yapılır; önizleme farklı olabilir, stok eksiye inmez", () => {
    const onizleme = setHazirlaOnizleme(SET, "2", [{ partId: "1", miktar: 10 }, { partId: "2", miktar: 20 }]);
    expect(onizleme.find(s => s.partId === "2").dusecek).toBe(8);
    const kayitAni = [{ partId: "1", miktar: 10 }, { partId: "2", miktar: 5 }];
    const r = setHazirlaPlani({ ...temel, adet: "2", partStock: kayitAni });
    expect(r.hareketler.find(h => h.partId === "2").miktar).toBe(-5);
    expect(totalMiktar(stokuUygula(kayitAni, stokEtkisi(r.hareketler)), "2")).toBe(0);
  });
});

describe("Spec 0121 D: geri alma", () => {
  const st0 = [{ partId: "1", miktar: 10 }, { partId: "2", miktar: 3 }];
  const kur = () => {
    const r = setHazirlaPlani({ set: SET, adet: "2", tarih: "2026-10-10", bugun: "2026-10-15", partStock: st0, islemId: 555 });
    return { log: r.hareketler, ps: stokuUygula(st0, stokEtkisi(r.hareketler)) };
  };
  it("AC-23: geri alma karşı hareket yazar; set azalır, gerçekten düşülen bileşenler döner, eski satırlar kalır", () => {
    const { log, ps } = kur();
    const g = setGeriAlPlani({ islemId: 555, partStock: ps, partStockLog: log, tarih: "2026-10-15" });
    expect(g.ok).toBe(true);
    const ps2 = stokuUygula(ps, stokEtkisi(g.hareketler));
    expect(totalMiktar(ps2, "1")).toBe(10);
    expect(totalMiktar(ps2, "2")).toBe(3);
    expect(totalMiktar(ps2, "10")).toBe(0);
    const log2 = [...log, ...g.hareketler];
    expect(log2.length).toBe(log.length + 3);
    expect(hazirlamaGeriAlindiMi(log2, 555)).toBe(true);
    expect(hazirlamaGeriAlindiMi(log, 555)).toBe(false);
  });
  it("AC-24: ikinci geri alma etkisiz", () => {
    const { log, ps } = kur();
    const g = setGeriAlPlani({ islemId: 555, partStock: ps, partStockLog: log, tarih: "2026-10-15" });
    const log2 = [...log, ...g.hareketler];
    const g2 = setGeriAlPlani({ islemId: 555, partStock: stokuUygula(ps, stokEtkisi(g.hareketler)), partStockLog: log2, tarih: "2026-10-15" });
    expect(g2).toMatchObject({ ok: false, etkisiz: true, hareketler: [] });
  });
  it("AC-25: hazırlanan set satılmışsa geri alma hiçbir hareket yazmaz ve nedeni söyler", () => {
    const { log, ps } = kur();
    const satildi = ps.map(s => (String(s.partId) === "10" ? { ...s, miktar: 1 } : s));
    const g = setGeriAlPlani({ islemId: 555, partStock: satildi, partStockLog: log, tarih: "2026-10-15" });
    expect(g).toMatchObject({ ok: false, etkisiz: false, hareketler: [] });
    expect(g.hata).toBe(geriAlRedMetni(1));
    expect(g.hata).toMatch(/1 adedi satılmış ya da kullanılmış/);
  });
  it("AC-61 / R18/3: içerik sonradan değişse de geri alma log'daki adetleri döndürür", () => {
    const { log, ps } = kur();
    const g = setGeriAlPlani({ islemId: 555, partStock: ps, partStockLog: log, tarih: "2026-10-15" });
    expect(g.hareketler.filter(h => h.tip === "set_uretimi_iade").map(h => [h.partId, h.miktar]).sort()).toEqual([["1", 4], ["2", 3]]);
  });
  it("AC-36 / AC-35: iki yeni motor fonksiyonu; tip adları ve haritalar", () => {
    expect(IADE_TIPI.set_uretimi).toBe("set_uretimi_iade");
    expect(IPTAL_TIPI).toEqual({ set_girisi: "set_girisi_iptal" });
    expect(HAREKET_TIP_AD.set_uretimi).toBe("Set hazırlandı (bileşen düşümü)");
    expect(HAREKET_TIP_AD.set_uretimi_iade).toBe("Set hazırlama geri alındı (bileşen)");
    expect(HAREKET_TIP_AD.set_girisi).toBe("Set hazırlandı");
    expect(HAREKET_TIP_AD.set_girisi_iptal).toBe("Set hazırlama geri alındı");
    const log = [{ id: 1, partId: "10", miktar: 3, tip: "set_girisi", referansId: 9 }, { id: 2, partId: "10", miktar: -1, tip: "set_girisi_iptal", referansId: 9 }];
    expect(netGirisler(log, 9, "set_girisi").get("10")).toBe(2);
    expect(karsiGirisler(log, 9, "set_girisi", { tarih: "2026-10-15" })).toMatchObject([{ partId: "10", miktar: -2, tip: "set_girisi_iptal" }]);
    expect(girisGeriAlinabilir([{ partId: "10", miktar: 1 }], log, 9, "set_girisi")).toMatchObject({ ok: false, fazla: 1 });
    // Setin girişi bileşen düşümü sayılmaz (iki tip ayrı haritalarda).
    expect(netDusumleri(log, 9, "set_uretimi").size).toBe(0);
    expect(Object.values(IADE_TIPI)).not.toContain("set_girisi_iptal");
    const src = yorumsuz("src/lib/setUretimi.js");
    expect(src).not.toMatch(/mergeAndUpdate\(/);
    expect(src).not.toMatch(/\.miktar\s*[-+]=|miktar\s*-\s*d\.|\+\s*qty/);
    expect(src).toMatch(/stokuUygula\(ps, stokEtkisi\(hareketler\)\)/);
    expect(src).toMatch(/stokKirparakDus\(/);
    // stokEtkisi'nin gövdesi değişmedi (manuel_duzelt dışı her tip fark).
    expect(oku("src/lib/stokHareketi.js")).toContain("if (MUTLAK_TIPLER.has(l.tip)) { e.mutlak = n; e.fark = 0; } else e.fark += n;");
  });
  it("AC-45: ters çevrilen üç kriter 'spec 0121 ile' notlu; 0097 AC-52'nin casusu bütün argümanları iletir", () => {
    const casus = oku("tests/maliyet-gecmisi-0097-cagri.test.js");
    expect(casus).toMatch(/parcaMaliyetKurus: \(\.\.\.a\) =>/);
    expect(casus).toMatch(/return m\.parcaMaliyetKurus\(\.\.\.a\)/);
    expect(casus).toMatch(/Spec 0121 ile/);
    const sh = oku("tests/stok-hareketi.test.js");
    expect(sh.match(/Spec 0121 ile/g)).toHaveLength(2);
    expect(sh).toContain('"servis", "set_uretimi"]');
    expect(sh).toContain('"src/lib/setUretimi.js", "src/lib/stokHareketi.js"]');
  });
  it("AC-59: işlem kimliği birleştirmede çevrilmez (logBagHaritasi'nda yeni tipler yok)", () => {
    const m = oku("src/lib/merge.js").match(/const logBagHaritasi = \{[\s\S]*?\};/)[0];
    expect(m).not.toMatch(/set_/);
  });
});

describe("Spec 0121: model kiti kesişimi (R32/2, AC-46)", () => {
  it("AC-46: kitte hem set hem bileşeni varsa uyarı döner; maliyet bugünkü kuralla (iki kez) hesaplanır", () => {
    const harita = setKatalogu(HEPSI);
    const m = modelMaliyeti({ model: "AK", defaultParcalar: [{ partId: "10", miktar: 1 }, { partId: "1", miktar: 1 }] }, harita, 0);
    expect(m.setKesisimleri).toEqual([{ setAd: "Rulman Seti", bilesenAd: "Rulman A" }]);
    expect(m.direktK).toBe(30200 + 10000);
    const yok = modelMaliyeti({ model: "AK", defaultParcalar: [{ partId: "1", miktar: 1 }] }, harita, 0);
    expect("setKesisimleri" in yok).toBe(false);
  });
});

describe("Spec 0121: seçimden sonraki salt okunur satır (R26/2, Karar 47)", () => {
  it("AC-43 (motor): set satırı 'Set · n bileşen' ve bileşen listesi; set olmayan parçada null", () => {
    expect(setIcerikSatiri(SET, HEPSI)).toEqual({ baslik: "Set · 2 bileşen", bilesenler: ["2 × Rulman A", "4 × Rulman B"] });
    expect(setIcerikSatiri(PARCALAR[0], HEPSI)).toBeNull();
    expect(setIcerikSatiri({ setIcerigi: [{ partId: 5, miktar: 1 }] }, HEPSI).bilesenler).toEqual([`1 × ${LISTEDE_OLMAYAN_PARCA}`]);
  });
});

describe("Spec 0121: görsel kanıt (R34)", () => {
  it("AC-57: görüntü aracının fikstüründe içeriği olan parça var, altı yeni ekran tanımlı ve rapordadır", () => {
    const sayfa = yorumsuz("scripts/evidence/0009-sayfa.jsx");
    expect(sayfa).toMatch(/setIcerigi: \[\{ partId: \d+, miktar: \d+ \}/);
    const yeni = ["parca-stok-0121-set", "parca-stok-0121-hazirla", "parca-stok-0121-hazirla-eksik", "parca-stok-0121-hareket", "katalog-parca-0121-set", "katalog-parca-0121-bos"];
    const rapor = JSON.parse(oku("docs/evidence/0121-piksel-raporu.json")).map(x => x.ad);
    for (const e of yeni) {
      expect(sayfa).toContain(`"${e}":`);
      expect(rapor).toEqual(expect.arrayContaining([`${e}-aydinlik.png`, `${e}-karanlik.png`]));
    }
  });
});
