// Spec 0131: tahsilat tarihi, işaretlendiği gündür. Saf yazıcı, kitaplık kurucuları, motor çaprazları ve kaynak taramaları.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  tahsilatGunuYaz, tahsilatGunuAta, tahsilatGunuDogrula, tahsilatGunuFormHatasi, tahsilatGunuIsareti, tahsilatGunuSorulurMu,
  tahsilatGunuNedeni, tahsilatGunuEksikMi, topluTahsilatGunu, tahsilatGunuFormu, topluTahsilatGunuFormu,
  TAHSILAT_GUNU_GECERSIZ, TAHSILAT_GUNU_GELECEK, TAHSILAT_GUNU_CEK_NEDENI, TAHSILAT_GUNU_KART_NEDENI, SATIS_KAYNAK,
} from "../src/lib/satisTahsilat";
import { yedekParcaRec, yedekParcaGuncelle, topluDuzenlemePlani, ucretsizUygula } from "../src/lib/yedekParcaSatis";
import { kalipSatisOrtak, kalipGuncelle, kalipSatisiEkle } from "../src/lib/kalipSatisi";
import { hesapBakiyeleri, hesapsizOzeti } from "../src/lib/kasa";
import { hesaplaAylikRapor } from "../src/lib/aylikRapor";
import { tahsilatTarihiOf } from "../src/lib/utils";
import { HESAPLAR, KDV, FACTORY, BUGUN, veri } from "./fixtures/0131-veri";

beforeAll(() => vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-04T10:00:00") }));
afterAll(() => vi.useRealTimers());

const DUN = "2026-11-03", YARIN = "2026-11-05";
const nakit = (o) => ({ id: 1, yontem: "Nakit", odendi: true, ...o });

describe("Spec 0131 yazıcı: tahsilatGunuYaz", () => {
  it("AC-1: işaretsizden işaretliye, gün verilmezse yerel bugün (R1, R5)", () => {
    expect(tahsilatGunuYaz(nakit(), { eski: nakit({ odendi: false }), bugun: BUGUN }).tahsilatTarihi).toBe(BUGUN);
    expect(tahsilatGunuYaz(nakit(), { bugun: BUGUN }).tahsilatTarihi).toBe(BUGUN); // yeni kayıt
  });
  it("AC-3: işaretsizden işaretliye, verilen gün yazılır; AC-45: satış tarihinden önceki gün kabul (R3/3)", () => {
    expect(tahsilatGunuYaz(nakit({ date: "2026-10-20" }), { eski: nakit({ odendi: false }), bugun: BUGUN, gun: DUN }).tahsilatTarihi).toBe(DUN);
    expect(tahsilatGunuYaz(nakit({ date: "2026-10-20" }), { bugun: BUGUN, gun: "2026-01-02" }).tahsilatTarihi).toBe("2026-01-02");
  });
  it("AC-44: boş gün null yazılır, okuma satış tarihine düşer (R3/2)", () => {
    const k = tahsilatGunuYaz(nakit({ date: "2026-10-20" }), { bugun: BUGUN, gun: "" });
    expect(k.tahsilatTarihi).toBeNull();
    expect(tahsilatTarihiOf(k, k.date)).toBe("2026-10-20");
  });
  it("AC-2: işaret kalkınca gün silinir (R6)", () => {
    expect(tahsilatGunuYaz(nakit({ odendi: false, tahsilatTarihi: DUN }), { eski: nakit({ tahsilatTarihi: DUN }), bugun: BUGUN }).tahsilatTarihi).toBeNull();
  });
  it("AC-33, AC-15: işaret duruyor, gün aynı ya da verilmedi → kayıtlı gün aynen (R7)", () => {
    const eski = nakit({ tahsilatTarihi: "2026-09-01" });
    expect(tahsilatGunuYaz({ ...eski, servisUcreti: 999 }, { eski, bugun: BUGUN }).tahsilatTarihi).toBe("2026-09-01");
    expect(tahsilatGunuYaz({ ...eski, servisUcreti: 999 }, { eski, bugun: BUGUN, gun: "2026-09-01" }).tahsilatTarihi).toBe("2026-09-01");
  });
  it("AC-34: işaret duruyor, kayıtta gün yok ve alana dokunulmadı → kayda gün yazılmaz (R7/2)", () => {
    const eski = nakit();
    const k = tahsilatGunuYaz({ ...eski }, { eski, bugun: BUGUN, gun: null });
    expect("tahsilatTarihi" in k).toBe(false);
    const k2 = tahsilatGunuYaz({ ...eski }, { eski, bugun: BUGUN });
    expect("tahsilatTarihi" in k2).toBe(false);
  });
  it("işaret duruyor, farklı gün verilirse yazılır (düzeltme)", () => {
    const eski = nakit({ tahsilatTarihi: "2026-09-01" });
    expect(tahsilatGunuYaz({ ...eski }, { eski, bugun: BUGUN, gun: DUN }).tahsilatTarihi).toBe(DUN);
  });
  it("AC-22: Kredi Kartı'nda gün yazılmaz, okuma hesabaGecis'ten (R12)", () => {
    const k = tahsilatGunuYaz(nakit({ yontem: "Kredi Kartı", kartKomisyonu: { hesabaGecis: "2026-11-02" }, date: "2026-10-01" }), { bugun: BUGUN, gun: DUN });
    expect(k.tahsilatTarihi).toBeNull();
    expect(tahsilatTarihiOf(k, k.date)).toBe("2026-11-02");
  });
  it("AC-23, AC-35, AC-36: Çek'te gün 'tahsil edildi' geçişinde bugün, kalkınca silinir, durursa korunur (R12/2)", () => {
    const cek = nakit({ yontem: "Çek", tahsilEdildi: false });
    expect(tahsilatGunuYaz(cek, { bugun: BUGUN, gun: DUN }).tahsilatTarihi).toBeNull();
    const tahsil = tahsilatGunuYaz({ ...cek, tahsilEdildi: true }, { eski: cek, bugun: BUGUN, gun: DUN });
    expect(tahsil.tahsilatTarihi).toBe(BUGUN); // sorulmaz, gün verilse de bugün
    expect(tahsilatGunuYaz({ ...tahsil, servisUcreti: 5 }, { eski: tahsil, bugun: "2026-12-01" }).tahsilatTarihi).toBe(BUGUN);
    expect(tahsilatGunuYaz({ ...tahsil, tahsilEdildi: false }, { eski: tahsil, bugun: BUGUN }).tahsilatTarihi).toBeNull();
  });
  it("R12/3: çek ve kartta gün sorulmaz, neden metni", () => {
    expect(tahsilatGunuSorulurMu({ yontem: "Nakit" })).toBe(true);
    expect(tahsilatGunuSorulurMu({ yontem: "Çek" })).toBe(false);
    expect(tahsilatGunuNedeni({ yontem: "Çek" })).toBe(TAHSILAT_GUNU_CEK_NEDENI);
    expect(tahsilatGunuNedeni({ yontem: "Kredi Kartı" })).toBe(TAHSILAT_GUNU_KART_NEDENI);
    expect(tahsilatGunuNedeni({ yontem: "Havale" })).toBeNull();
  });
});

describe("Spec 0131 doğrulama (R3, C4)", () => {
  it("AC-4, AC-5, AC-16, AC-32: ileri gün ve takvimde olmayan gün reddedilir, boş serbest", () => {
    expect(tahsilatGunuDogrula(YARIN, BUGUN)).toBe(TAHSILAT_GUNU_GELECEK);
    expect(tahsilatGunuDogrula("2026-02-30", BUGUN)).toBe(TAHSILAT_GUNU_GECERSIZ);
    expect(tahsilatGunuDogrula("", BUGUN)).toBeNull();
    expect(tahsilatGunuDogrula(BUGUN, BUGUN)).toBeNull();
  });
  it("Karar 19: form hatası yalnız ödendi + gün soran yöntemde", () => {
    expect(tahsilatGunuFormHatasi({ odendi: true, yontem: "Nakit", tahsilatTarihi: YARIN }, BUGUN)).toBe(TAHSILAT_GUNU_GELECEK);
    expect(tahsilatGunuFormHatasi({ odendi: false, tahsilatTarihi: YARIN }, BUGUN)).toBeNull();
    expect(tahsilatGunuFormHatasi({ odendi: true, yontem: "Çek", tahsilatTarihi: YARIN }, BUGUN)).toBeNull();
    expect(tahsilatGunuFormHatasi({ odendi: true, ucretsizMi: true, tahsilatTarihi: YARIN }, BUGUN)).toBeNull();
  });
  it("R1/2 hâl 1: kutu işaretlenince form günü bugün, kaldırılınca boş", () => {
    expect(tahsilatGunuIsareti(true, BUGUN)).toEqual({ tahsilatTarihi: BUGUN });
    expect(tahsilatGunuIsareti(false, BUGUN)).toEqual({ tahsilatTarihi: null });
  });
  it("R1/2 hâl 2–3: form açılış değerleri", () => {
    expect(tahsilatGunuFormu({ tahsilatTarihi: DUN })).toEqual({ tahsilatTarihi: DUN });
    expect(tahsilatGunuFormu({})).toEqual({ tahsilatTarihi: null });
    expect(topluTahsilatGunuFormu([nakit({ tahsilatTarihi: DUN }), nakit({ id: 2, tahsilatTarihi: DUN })])).toEqual({ tahsilatTarihi: DUN, _tahsilatGunuAcilis: DUN });
  });
});

describe("Spec 0131 R13/2 topluTahsilatGunu", () => {
  it("AC-49: partide günler aynıysa o gün, farklıysa null; çek/kart ve ücretsiz satır sayılmaz", () => {
    expect(topluTahsilatGunu([nakit({ tahsilatTarihi: DUN }), nakit({ id: 2, tahsilatTarihi: DUN })])).toBe(DUN);
    expect(topluTahsilatGunu([nakit({ tahsilatTarihi: DUN }), nakit({ id: 2, tahsilatTarihi: BUGUN })])).toBeNull();
    expect(topluTahsilatGunu([nakit({ tahsilatTarihi: DUN }), nakit({ id: 2, ucretsizMi: true })])).toBe(DUN);
    expect(topluTahsilatGunu([nakit({ yontem: "Çek", tahsilEdildi: true, tahsilatTarihi: DUN })])).toBeNull();
    expect(topluTahsilatGunu([nakit({ odendi: false, tahsilatTarihi: DUN })])).toBeNull();
    expect(topluTahsilatGunu([nakit()])).toBeNull(); // AC-26: günsüz eski kayıt
  });
});

describe("Spec 0131 kitaplık kurucuları", () => {
  const ypForm = (o) => ({ aliciTipi: "bayi", dealerId: 20, partId: 5, miktar: "2", birimFiyat: "100", currency: "TRY", tarih: "2026-10-01", faturaTipi: "Faturalı Yurtiçi", yontem: "Nakit", ...o });
  it("AC-13: yedek parça yeni kayıt işaretli → bugün; verilen gün yazılır", () => {
    expect(yedekParcaRec(ypForm({ odendi: true })).rec.tahsilatTarihi).toBe(BUGUN);
    expect(yedekParcaRec(ypForm({ odendi: true, tahsilatTarihi: DUN })).rec.tahsilatTarihi).toBe(DUN);
    expect(yedekParcaRec(ypForm({ odendi: false })).rec.tahsilatTarihi).toBeNull();
  });
  it("AC-16, Karar 19: kurucu ileri günü reddeder", () => {
    const r = yedekParcaRec(ypForm({ odendi: true, tahsilatTarihi: YARIN }));
    expect(r.ok).toBe(false);
    expect(r.hata).toBe(TAHSILAT_GUNU_GELECEK);
  });
  it("AC-14, AC-48: tek satırlı düzenleme; işaret duruyorsa gün korunur, yeni işaretlenirse yazılır (R8/4)", () => {
    const eski = { id: 7, ...ypForm({ odendi: true, tahsilatTarihi: "2026-09-01" }), miktar: 2, birimFiyat: 100 };
    const f = { ...eski, miktar: "3", birimFiyat: "100" };
    const rec = yedekParcaRec(f).rec;
    expect(yedekParcaGuncelle(eski, rec, f).tahsilatTarihi).toBe("2026-09-01");
    const eski2 = { ...eski, odendi: false, tahsilatTarihi: null };
    const f2 = { ...eski2, odendi: true, tahsilatTarihi: BUGUN };
    expect(yedekParcaGuncelle(eski2, yedekParcaRec(f2).rec, f2).tahsilatTarihi).toBe(BUGUN);
  });
  it("Karar 18: ücretsiz işaret günü temizler", () => {
    expect(ucretsizUygula({ odendi: true, tahsilatTarihi: DUN }, { ucretsizMi: true }).tahsilatTarihi).toBeNull();
  });
  it("AC-10 (kitaplık): toplu plan, dokunulmayan gün her satırda korunur; dokunulan gün ücretli bütün satırlara (R9)", () => {
    const eskiler = [
      { id: 1, batchId: 9, ...ypForm({ odendi: true, tahsilatTarihi: "2026-09-01" }), miktar: 2, birimFiyat: 100 },
      { id: 2, batchId: 9, ...ypForm({ odendi: true, tahsilatTarihi: "2026-09-02" }), partId: 6, miktar: 1, birimFiyat: 50 },
    ];
    const form = (o) => ({ batchEdit: true, batchId: 9, aliciTipi: "bayi", dealerId: 20, currency: "TRY", tarih: "2026-10-01", faturaTipi: "Faturalı Yurtiçi",
      yontem: "Nakit", odendi: true, _odendiAcilis: true, _acilisIdleri: [1, 2], ...topluTahsilatGunuFormu(eskiler),
      satirlar: [{ _kayitId: 1, partId: 5, miktar: "2", birimFiyat: 100 }, { _kayitId: 2, partId: 6, miktar: "1", birimFiyat: 50 }], ...o });
    const ops = { partStock: [], partStockLog: [], yeniId: () => 99, olusturmaZamani: "x", silmeDamgasi: "y", bugun: BUGUN };
    const p1 = topluDuzenlemePlani(eskiler, form(), ops);
    expect(p1.ok).toBe(true);
    expect(p1.guncellenen.map(k => k.tahsilatTarihi)).toEqual(["2026-09-01", "2026-09-02"]);
    const p2 = topluDuzenlemePlani(eskiler, form({ tahsilatTarihi: DUN }), ops);
    expect(p2.guncellenen.map(k => k.tahsilatTarihi)).toEqual([DUN, DUN]);
    // Dokunulmayan formda partiye eklenen yeni (ödenmiş) satır bugünü alır (R9: yeni işaretlenen satıra bugün).
    const p3 = topluDuzenlemePlani(eskiler, form({ satirlar: [...form().satirlar, { partId: 7, miktar: "1", birimFiyat: 10 }] }), ops);
    expect(p3.eklenen.map(k => k.tahsilatTarihi)).toEqual([BUGUN]);
  });
  it("AC-12, AC-33: Extra Kalıp yeni kayıt ve düzenleme", () => {
    const f = { odendi: true, yontem: "Nakit", currency: "TRY", faturaTipi: "Faturalı Yurtiçi", tarih: "2026-10-01" };
    expect(kalipSatisOrtak(f, 10, BUGUN).tahsilatTarihi).toBe(BUGUN);
    expect(kalipSatisOrtak({ ...f, tahsilatTarihi: DUN }, 10, BUGUN).tahsilatTarihi).toBe(DUN);
    const eski = { id: 5, tur: "Kalıp", customerId: 10, ...f, tahsilatTarihi: "2026-09-01" };
    expect(kalipGuncelle(eski, { ucret: 999 }, { ...f, tahsilatTarihi: "2026-09-01" }).tahsilatTarihi).toBe("2026-09-01");
    expect(kalipGuncelle(eski, { odendi: false }, { ...f, odendi: false }).tahsilatTarihi).toBeNull();
  });
  it("AC-42 (kitaplık): bayi detayının ortak yolu kalipSatisiEkle ileri günü reddeder", () => {
    const r = kalipSatisiEkle({ customerId: 10, kaliplar: [{ ad: "K", fiyat: "100" }], odendi: true, yontem: "Nakit", tahsilatTarihi: YARIN, currency: "TRY", faturaTipi: "Faturalı Yurtiçi" },
      { customers: [{ id: 10, name: "A" }], setPartSales: () => {}, setCustomers: () => {}, uid: () => 1, simdi: () => "x", bugun: BUGUN });
    expect(r.hata).toBe(TAHSILAT_GUNU_GELECEK);
  });
});

describe("Spec 0131 Kasa düzeltmesi: tahsilatGunuAta ve işaret ölçütü", () => {
  it("R10/2: aynı gün kayıt aynen döner, farklı gün yalnız gün alanını değiştirir", () => {
    const k = nakit({ hesapId: 1, tahsilatTarihi: DUN });
    expect(tahsilatGunuAta(k, DUN)).toBe(k);
    expect(tahsilatGunuAta(k, BUGUN)).toEqual({ ...k, tahsilatTarihi: BUGUN });
  });
  it("AC-20, AC-37: ölçüt dar (R11/2)", () => {
    expect(tahsilatGunuEksikMi({ kaynak: SATIS_KAYNAK.SERVIS, tahsilat: nakit() })).toBe(true);
    expect(tahsilatGunuEksikMi({ kaynak: SATIS_KAYNAK.YEDEK, tahsilat: nakit({ tahsilatTarihi: DUN }) })).toBe(false);
    expect(tahsilatGunuEksikMi({ kaynak: SATIS_KAYNAK.KALIP, tahsilat: nakit({ yontem: "Kredi Kartı" }) })).toBe(false);
    expect(tahsilatGunuEksikMi({ kaynak: SATIS_KAYNAK.KALIP, tahsilat: nakit({ yontem: "Çek", tahsilEdildi: true }) })).toBe(false);
    expect(tahsilatGunuEksikMi({ tur: "tahsilat", tahsilat: { id: 900, tutar: 5 } })).toBe(false); // makina tahsilatı
    expect(tahsilatGunuEksikMi({ tur: "verilenCek", cek: { id: 1 } })).toBe(false);
  });
});

describe("Spec 0131 motor çaprazları (R14)", () => {
  const aralik = { baslangic: "2026-10-01", bitis: "2026-11-30" };
  const bakiye = (v) => hesapBakiyeleri(HESAPLAR, [], v, { aralik }).get("1");
  it("AC-3, AC-19: gün değişince hareket satırı o güne taşınır, kapanış bakiyesi değişmez", () => {
    const v0 = veri();
    const once = bakiye(v0);
    const v1 = veri();
    v1.services = v1.services.map(s => (s.id === 100 ? tahsilatGunuAta(s, DUN) : s));
    const sonra = bakiye(v1);
    expect(sonra.bakiyeK).toBe(once.bakiyeK);
    const satir = sonra.satirlar.find(s => s.tahsilat?.id === 100);
    expect(satir.tarih).toBe(DUN);
    expect(sonra.satirlar[sonra.satirlar.length - 1].tahsilat?.id).toBe(100); // en sona (bugüne yakın) taşındı
    expect(once.satirlar.find(s => s.tahsilat?.id === 100).tarih).toBe("2024-03-09");
  });
  it("AC-27, AC-47: günü bugüne yazılmış tahsilat bu ayın raporunda; hesabın ay girişi kaydın brüt tutarına eşit", () => {
    const v = veri();
    v.services = [tahsilatGunuAta(v.services[0], BUGUN)];
    v.partSales = []; v.yedekParcaSatislar = []; v.payments = [];
    const r = hesaplaAylikRapor(v, "2026-11", { factoryName: FACTORY.name, kdvRates: KDV, factory: FACTORY });
    const r0 = hesaplaAylikRapor(v, "2024-03", { factoryName: FACTORY.name, kdvRates: KDV, factory: FACTORY });
    expect(r.tahsilatAdet).toBe(1);
    expect(r0.tahsilatAdet).toBe(0);
    const h = hesapBakiyeleri(HESAPLAR, [], v, { aralik: { baslangic: "2026-11-01", bitis: "2026-11-30" } }).get("1");
    expect(h.aralik.girenK / 100).toBeCloseTo(r.tahsilatTutar.TRY, 2);
  });
  it("AC-18: hesapsız listedeki satırın tarihi kaydın bugün geçerli günüdür (dokunulmayan alanın değeri)", () => {
    const o = hesapsizOzeti([], veri(), HESAPLAR, null);
    const k = o.tahsilatListe ? o.tahsilatListe.find(x => x.kayit.id === 101) : null;
    if (k) expect(k.tarih).toBe("2026-10-12");
  });
  it("AC-25: para birimi tanınmayan kayıtta gün yine yazılır", () => {
    expect(tahsilatGunuYaz(nakit({ currency: "XYZ" }), { bugun: BUGUN, gun: DUN }).tahsilatTarihi).toBe(DUN);
  });
});

// ── Kaynak taramaları ─────────────────────────────────────────────────────────────────────────────────────────────────
const tumDosyalar = (kok) => fs.readdirSync(kok, { withFileTypes: true }).flatMap(d => {
  const p = path.join(kok, d.name);
  if (d.isDirectory()) return d.name === "map" ? [] : tumDosyalar(p);
  return /\.(js|jsx)$/.test(d.name) ? [p] : [];
});
const yorumsuz = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map(l => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");
const SRC = tumDosyalar("src").map(p => ({ p: p.split(path.sep).join("/"), s: yorumsuz(fs.readFileSync(p, "utf8")) }));

describe("Spec 0131 kaynak taramaları", () => {
  it("AC-28: tahsilatTarihi ataması yalnız tek yazıcıda (satisTahsilat.js)", () => {
    const ihlal = [];
    for (const { p, s } of SRC) {
      if (p === "src/lib/satisTahsilat.js") continue;
      s.split("\n").forEach((l, i) => {
        if (/\btahsilatTarihi\s*:(?!\s*undefined\b)/.test(l) || /\.tahsilatTarihi\s*=[^=]/.test(l)) ihlal.push(`${p}:${i + 1}`);
      });
    }
    // Tek gerekçeli istisna: 0111 toplu planının "dokunulmayan gün satırlara taşınmaz" düğümü (undefined, değer yazmaz) desenden hariç.
    expect(ihlal).toEqual([]);
  });
  it("AC-29: tahsilat gününü üreten yolda today() yok", () => {
    const ihlal = [];
    for (const { p, s } of SRC) s.split("\n").forEach((l, i) => {
      if (/tahsilatGunu(Yaz|Isareti|Ata)\b/.test(l) && /\btoday\(\)/.test(l)) ihlal.push(`${p}:${i + 1}`);
    });
    expect(ihlal).toEqual([]);
    const sat = SRC.find(x => x.p === "src/lib/satisTahsilat.js").s;
    expect(sat).not.toMatch(/\btoday\(/);
    expect(sat).not.toMatch(/\bnew Date\(|yerelBugun\(/); // saat okumaz (C2)
    const cdm = SRC.find(x => x.p === "src/components/customers/CustomerDetailModal.jsx").s;
    expect(cdm).toMatch(/bugun: yerelBugun\(\)/); // C3/2: 0111 toplu yolu
    expect(cdm).not.toMatch(/silmeDamgasi:[^\n]*bugun: today\(\)/);
  });
  it("AC-51: hata sabitleri ve alan etiketi tek yerde; erişilebilir ad yalnız gün alanında", () => {
    const metinler = ["Tahsilat tarihi takvimde var olan bir gün olmalı.", "Tahsilat tarihi bugünden sonra olamaz.", "\"Tahsilat tarihi\""];
    for (const m of metinler) {
      const gecen = SRC.filter(x => x.s.includes(m)).map(x => x.p);
      expect(gecen, m).toEqual(["src/lib/satisTahsilat.js"]);
    }
    expect(SRC.filter(x => /aria-label=\{TAHSILAT_GUNU_ETIKETI\}/.test(x.s)).map(x => x.p)).toEqual(["src/components/kasa/TahsilatHesap.jsx"]);
    expect(SRC.filter(x => /aria-label="Tahsilat tarihi"/.test(x.s))).toEqual([]);
  });
  it("R8: ödeme işaretinin konduğu bütün yollar yazıcıdan geçer", () => {
    const beklenen = {
      "src/components/customers/CustomerDetailModal.jsx": 6, // saveService + 5 anahtar
      "src/components/ServisPanosu.jsx": 1,
      "src/components/stock/YedekParcaSatisTab.jsx": 1,
      "src/lib/yedekParcaSatis.js": 3,
      "src/lib/kalipSatisi.js": 2,
    };
    for (const [p, n] of Object.entries(beklenen)) {
      const s = SRC.find(x => x.p === p).s;
      expect((s.match(/tahsilatGunuYaz\(/g) || []).length, p).toBeGreaterThanOrEqual(n);
    }
  });
  it("R8/3, C9/2: formlarda gün alanı kasaHesaplari kapısının dışında", () => {
    for (const p of ["src/components/ServiceForm.jsx", "src/components/PartSaleForm.jsx", "src/components/YedekParcaSatisForm.jsx"]) {
      const s = SRC.find(x => x.p === p).s;
      const satir = s.split("\n").find(l => l.includes("<FormTahsilatGunu"));
      expect(satir, p).toBeTruthy();
      expect(satir).not.toMatch(/kasaHesaplari/);
    }
  });
});
