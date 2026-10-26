// Spec 0111: toplu yedek parça satışı yerinde düzenlenir. Saf karar fonksiyonu (`topluDuzenlemePlani`), tahsis kuralı,
// stok tabanı, pano alarmı ve kaynak taramaları. Ekran tests/ui/toplu-yedek-parca-0111*.test.jsx'te.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  topluDuzenlemePlani, otomatikTamTahsisMi, tahsisYenile, TOPLU_PARTI_DEGISTI, TOPLU_SATIR_HATASI, TOPLU_BOS_HATASI,
  topluBildirimi, TOPLU_GUNCELLENDI, TOPLU_BAYIYE_GECTI, TOPLU_BASKA_MUSTERIYE_GECTI,
} from "../src/lib/yedekParcaSatis.js";
import { yeniKargolar } from "../src/lib/servisAlarm.js";
import { tahsisToplam } from "../src/components/stock/TahsisModal.jsx";

const kok = path.join(__dirname, "..");
const oku = (f) => readFileSync(path.join(kok, f), "utf-8");
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

const tahsis = (miktar, o = {}) => [{ miktar, customerId: 1001, serialNo: "", makinaSerbest: "", tarih: "2026-10-01", ...o }];
const kayit = (id, partId, miktar, o = {}) => ({
  id, batchId: 50, aliciTipi: "musteri", musteriId: 1001, dealerId: null, partId, miktar, birimFiyat: 100, currency: "TRY",
  tarih: "2026-10-01", faturaTipi: "Faturalı Yurtiçi", odendi: false, yontem: "Nakit", kargoDurum: "", olusturmaZamani: `2026-10-01T10:00:0${id % 10}`,
  tahsisler: tahsis(miktar), ...o,
});
const A = kayit(101, "81", 2), B = kayit(102, "82", 3), C = kayit(103, "81", 1);
const dus = (id, partId, miktar) => ({ id: `l${id}`, partId, miktar: -miktar, tip: "bayi_satis", referansId: id, tarih: "2026-10-01", notlar: "" });
const LOG = [dus(101, "81", 2), dus(102, "82", 3), dus(103, "81", 1)];
const STOK = [{ id: 1, partId: "81", miktar: 10 }, { id: 2, partId: "82", miktar: 10 }];
const satir = (k, o = {}) => ({ _kayitId: k.id, partId: k.partId, miktar: String(k.miktar), birimFiyat: k.birimFiyat, ...o });
// Ekranın açılış kolunun kurduğu form (birincil = ilk kayıt).
const form = (kayitlar, satirlar, o = {}) => {
  const b = kayitlar[0];
  return { batchEdit: true, batchId: 50, _kilitId: b.id, aliciTipi: b.aliciTipi, musteriId: b.musteriId, dealerId: b.dealerId, currency: b.currency,
    tarih: b.tarih, faturaTipi: b.faturaTipi, odendi: b.odendi, yontem: b.yontem, kargoDurum: b.kargoDurum, fabrikaTeslim: !!b.fabrikaTeslim,
    satirlar: satirlar ?? kayitlar.map(k => satir(k)), ...o };
};
const deps = (o = {}) => ({ partStock: STOK, partStockLog: LOG, yeniId: (i) => 900 + i, olusturmaZamani: "2026-10-26T12:00:00", silmeDamgasi: "2026-10-26T09:00:00.000Z", ...o });
const plan = (kayitlar, f, d = {}) => topluDuzenlemePlani(kayitlar, f, deps(d));
const kayitOf = (p, id) => p.guncellenen.find(k => k.id === id);

describe("Spec 0111: düzenleme kayıt silmez (R1–R5)", () => {
  it("AC-1 / AC-2: bir satırın fiyatı değişir; iki kayıt kimliği, oluşturma zamanı ve parti kimliğiyle güncellenir, silme yok", () => {
    const p = plan([A, B], form([A, B], [satir(A, { birimFiyat: 150 }), satir(B)]));
    expect(p.ok).toBe(true);
    expect(p.silinen).toEqual([]);
    expect(p.eklenen).toEqual([]);
    expect(p.guncellenen.map(k => [k.id, k.batchId, k.olusturmaZamani])).toEqual([[101, 50, A.olusturmaZamani], [102, 50, B.olusturmaZamani]]);
    expect(kayitOf(p, 101).birimFiyat).toBe(150);
    expect(kayitOf(p, 101).deletedAt).toBeUndefined();
  });
  it("AC-3: üç satırdan biri çıkarılır; yalnız o kayıt silinir, ikisi kimliğiyle durur", () => {
    const p = plan([A, B, C], form([A, B, C], [satir(A), satir(C)]));
    expect(p.silinen).toEqual([102]);
    expect(p.silmeDamgasi).toBe("2026-10-26T09:00:00.000Z");
    expect(p.guncellenen.map(k => k.id)).toEqual([101, 103]);
  });
  it("AC-4: çıkarılan kaydın düşümü karşı hareketle geri alınır (stok işlemi geriAl, log satırı silinmez)", () => {
    const p = plan([A, B, C], form([A, B, C], [satir(A), satir(C)]));
    expect(p.stok).toEqual([{ islem: "geriAl", kayitId: 102 }]);
  });
  it("AC-6: üçüncü satır eklenir; var olan iki kayıt güncellenir, yeni kayıt parametredeki kimlikle ve aynı parti kimliğiyle doğar", () => {
    const p = plan([A, B], form([A, B], [satir(A), satir(B), { partId: "82", miktar: "2", birimFiyat: 70 }]));
    expect(p.guncellenen.map(k => k.id)).toEqual([101, 102]);
    expect(p.eklenen).toHaveLength(1);
    expect(p.eklenen[0]).toMatchObject({ id: 900, batchId: 50, olusturmaZamani: "2026-10-26T12:00:00", partId: "82", miktar: 2 });
    expect(p.eklenen[0].tahsisler).toEqual([{ miktar: 2, customerId: 1001, serialNo: "", makinaSerbest: "", tarih: "2026-10-01" }]);
  });
  it("AC-7: satırların sırası değişince eşleme kimliğe dayanır, konuma değil", () => {
    const p = plan([A, B], form([A, B], [satir(B, { birimFiyat: 222 }), satir(A, { birimFiyat: 111 })]));
    expect(kayitOf(p, 101).birimFiyat).toBe(111);
    expect(kayitOf(p, 102).birimFiyat).toBe(222);
    expect(kayitOf(p, 101).partId).toBe("81");
  });
  it("AC-24 / AC-33: aynı girdi, aynı kimlik ve zaman parametresiyle iki çağrı birebir aynı dört listeyi döner", () => {
    const f = form([A, B, C], [satir(A, { miktar: "4" }), satir(C), { partId: "82", miktar: "1", birimFiyat: 5 }]);
    const p1 = plan([A, B, C], f), p2 = plan([A, B, C], f);
    expect(p1).toEqual(p2);
    expect([p1.guncellenen.length, p1.eklenen.length, p1.silinen.length, p1.stok.length]).toEqual([2, 1, 1, 4]);
  });
  it("AC-25: geçerli satır kalmazsa bugünkü hata, hiçbir liste yok", () => {
    const p = plan([A, B], form([A, B], [satir(A, { partId: "" }), satir(B, { miktar: "" })]));
    expect(p).toMatchObject({ ok: false, hata: TOPLU_BOS_HATASI });
    expect(p.guncellenen).toBeUndefined();
  });
  it("AC-26 / AC-29: listede duran geçersiz satır kaydı bütünüyle reddeder; neden satırda, hiçbir kayıt silinmez", () => {
    for (const bozuk of [{ partId: "" }, { miktar: "" }, { miktar: "0" }]) {
      const p = plan([A, B, C], form([A, B, C], [satir(A), satir(B, bozuk), satir(C)]));
      expect(p.ok, JSON.stringify(bozuk)).toBe(false);
      expect(p.hata).toBe(TOPLU_SATIR_HATASI);
      expect(Object.keys(p.satirHatalari)).toEqual(["1"]);
      expect(p.silinen).toBeUndefined();
      expect(p.stok).toBeUndefined();
    }
  });
  it("AC-38: satırın kimliği partide yoksa (dışarıdan silindi) kayıt reddedilir, yeni kayıt sayılmaz", () => {
    const f = form([A, B], [satir(A), satir(B)]);
    const p = plan([A, { ...B, deletedAt: "2026-10-26T08:00:00.000Z" }], f);
    expect(p).toEqual({ ok: false, hata: TOPLU_PARTI_DEGISTI });
    expect(plan([A], f)).toEqual({ ok: false, hata: TOPLU_PARTI_DEGISTI });
  });
});

describe("Spec 0111: düzenleme veri kaybetmez (R6–R9)", () => {
  it("AC-8 / AC-9: fabrika teslim ve farklı adres formdan aynen geri yazılır", () => {
    const adres = { teslimatFarkli: true, teslimatAd: "Depo", teslimatTel: "555", teslimatAdres: "Cad. 1", teslimatUlke: "Türkiye", teslimatSehir: "İzmir", teslimatIlce: "Bornova" };
    const X = kayit(101, "81", 2, { fabrikaTeslim: true, ...adres }), Y = kayit(102, "82", 3, { fabrikaTeslim: true, ...adres });
    const p = plan([X, Y], form([X, Y], null, { fabrikaTeslim: true, ...adres }));
    for (const k of p.guncellenen) expect(k).toMatchObject({ fabrikaTeslim: true, ...adres });
  });
  it("AC-10: tevkifatın üç alanı dokunulmadan kaydedilince aynen kalır", () => {
    const t = { tevkifatli: true, tevkifatPay: 5, tevkifatPayda: 10 };
    const X = kayit(101, "81", 2, t), Y = kayit(102, "82", 3, t);
    const p = plan([X, Y], form([X, Y], null, t));
    for (const k of p.guncellenen) expect(k).toMatchObject(t);
  });
  it("AC-11: teklif bağı (belge ve alt kalem) güncellenen kayıtta aynen kalır", () => {
    const X = kayit(101, "81", 2, { teklifId: 7, teklifKalemId: "k1" }), Y = kayit(102, "82", 3, { teklifId: 7, teklifKalemId: "k2" });
    const p = plan([X, Y], form([X, Y], [satir(X, { birimFiyat: 5 }), satir(Y)]));
    expect(p.guncellenen.map(k => [k.teklifId, k.teklifKalemId])).toEqual([[7, "k1"], [7, "k2"]]);
  });
  it("AC-12 (R8): form işareti kaydedilince bütün satırlara uygulanır; işaretsiz form ücretsiz işaretini siler", () => {
    const ucretsiz = plan([A, B], form([A, B], null, { ucretsizMi: true }));
    expect(ucretsiz.guncellenen.every(k => k.ucretsizMi === true && k.odendi === false)).toBe(true);
    const X = kayit(101, "81", 2, { ucretsizMi: true });
    expect(kayitOf(plan([X, B], form([X, B])), 101).ucretsizMi).toBeUndefined();
  });
  it("AC-27 / AC-27/2: para birimi USD'ye çevrilir; seçicide olmayan para birimi dokunulmadıkça korunur", () => {
    expect(plan([A, B], form([A, B], null, { currency: "USD" })).guncellenen.every(k => k.currency === "USD")).toBe(true);
    const X = kayit(101, "81", 2, { currency: "GBP" }), Y = kayit(102, "82", 3, { currency: "GBP" });
    expect(plan([X, Y], form([X, Y])).guncellenen.every(k => k.currency === "GBP")).toBe(true);
  });
  it("AC-37 / AC-39 (R6/2, R6/3, R7): ayrışan ortak alan birincil kayda düzleşir; odendi ve panoGizli satır başına korunur", () => {
    const X = kayit(101, "81", 2, { fabrikaTeslim: true, odendi: true, panoGizli: true, tahsilatTarihi: "2026-10-05" });
    const Y = kayit(102, "82", 3, { fabrikaTeslim: false, odendi: false });
    const p = plan([X, Y], form([X, Y]));
    expect(p.guncellenen.map(k => k.fabrikaTeslim)).toEqual([true, true]);
    expect(p.guncellenen.map(k => k.odendi)).toEqual([true, false]);
    expect(kayitOf(p, 101)).toMatchObject({ panoGizli: true, tahsilatTarihi: "2026-10-05" });
    expect("panoGizli" in kayitOf(p, 102)).toBe(false);
  });
  it("AC-43 (R7/2): kart komisyonunun tabanı güncellenen kaydın kendisinden, tevkifat tabanı işareti korunur", () => {
    const ayar = { bsmv: 5, satirlar: [{ taksit: 1, oran: 2, katkiPayi: 0, blokajGun: 0 }] };
    const kart = { taksitSayisi: 1, oran: 2, tutar: 10, yansitildi: false, bazTarih: "2026-10-01", tevkifatTaban: "5/10" };
    const X = kayit(101, "81", 2, { yontem: "Kredi Kartı", taksitSayisi: 1, kartKomisyonu: kart });
    const Y = kayit(102, "82", 3, { yontem: "Kredi Kartı", taksitSayisi: 1, kartKomisyonu: kart });
    const p = topluDuzenlemePlani([X, Y], form([X, Y], [satir(X, { miktar: "3" }), satir(Y)], { yontem: "Kredi Kartı", taksitSayisi: 1 }), deps({ ayar }));
    expect(p.ok).toBe(true);
    expect(p.guncellenen.every(k => k.kartKomisyonu && k.kartKomisyonu.tevkifatTaban === "5/10")).toBe(true);
    // Yeni miktarla yeniden hesaplandı ve taban kaydın 5/10 tevkifatıyla: 300 + KDV 60'ın yarısı = 330 (tevkifatsız 360 olurdu).
    const k = kayitOf(p, 101).kartKomisyonu;
    expect(Math.round((k.netTutar + k.toplamKesinti) * 100) / 100).toBe(330);
    // Taban formdan değil kayıttan: formda tevkifat yok, yine de işaret kaydın anlık görüntüsünden gelir.
    expect(form([X, Y]).tevkifatli).toBeUndefined();
  });
});

describe("Spec 0111: makina tahsisi (R10–R12)", () => {
  it("otomatik tam tahsis ölçütü: tek satır, miktar eşit, müşteri kaydın alıcısı, seri no ve serbest metin boş; tarih ölçüte girmez", () => {
    expect(otomatikTamTahsisMi(A)).toBe(true);
    expect(otomatikTamTahsisMi({ ...A, tahsisler: tahsis(2, { tarih: "2020-01-01" }) })).toBe(true);
    expect(otomatikTamTahsisMi({ ...A, tahsisler: tahsis(2, { serialNo: "S9" }) })).toBe(false);
    expect(otomatikTamTahsisMi({ ...A, tahsisler: tahsis(2, { makinaSerbest: "Eski" }) })).toBe(false);
    expect(otomatikTamTahsisMi({ ...A, tahsisler: tahsis(1) })).toBe(false);
    expect(otomatikTamTahsisMi({ ...A, tahsisler: [...tahsis(1), ...tahsis(1)] })).toBe(false);
  });
  it("AC-13: miktarı değişmeyen kaydın tahsisine dokunulmaz", () => {
    const X = { ...A, tahsisler: [...tahsis(1, { serialNo: "S1" }), ...tahsis(1)] };
    expect(kayitOf(plan([X, B], form([X, B], [satir(X, { birimFiyat: 1 }), satir(B)])), 101).tahsisler).toBe(X.tahsisler);
  });
  it("AC-14 / AC-42: otomatik tam tahsisin miktarı 2'den 5'e çıkar; tek satır kalır, tarihi korunur (satışın yeni tarihiyle ezilmez)", () => {
    const p = plan([A, B], form([A, B], [satir(A, { miktar: "5" }), satir(B)], { tarih: "2026-10-20" }));
    expect(kayitOf(p, 101).tahsisler).toEqual([{ miktar: 5, customerId: 1001, serialNo: "", makinaSerbest: "", tarih: "2026-10-01" }]);
    expect(kayitOf(p, 101).tarih).toBe("2026-10-20");
  });
  it("AC-15: elle iki satıra bölünmüş tahsis miktar değişince aynen durur ve kayıt 'Tahsisi eksik' sayılır", () => {
    const X = { ...A, tahsisler: [...tahsis(1, { serialNo: "S1" }), ...tahsis(1)] };
    const k = kayitOf(plan([X, B], form([X, B], [satir(X, { miktar: "4" }), satir(B)])), 101);
    expect(k.tahsisler).toEqual(X.tahsisler);
    expect(tahsisToplam(k) < k.miktar).toBe(true); // YedekParcaSatisTab "Tahsisi eksik" ölçütü
  });
  it("AC-16: alıcı bayiye çevrilince otomatik tam tahsis boşalır, elle düzenlenmiş tahsis korunur", () => {
    const elle = { ...B, tahsisler: tahsis(3, { makinaSerbest: "Eski makina" }) };
    const p = plan([A, elle], form([A, elle], null, { aliciTipi: "bayi", musteriId: null, dealerId: 71 }));
    expect(kayitOf(p, 101).tahsisler).toEqual([]);
    expect(kayitOf(p, 102).tahsisler).toEqual(elle.tahsisler);
    expect(p.guncellenen.every(k => k.aliciTipi === "bayi" && k.dealerId === 71)).toBe(true);
  });
  it("tahsisYenile: alıcı başka müşteriye geçince otomatik tahsis o müşteriye damgalanır", () => {
    expect(tahsisYenile(A, { ...A, musteriId: 1002 })).toEqual([{ ...A.tahsisler[0], customerId: 1002 }]);
  });
});

describe("Spec 0111: stok (R13–R16)", () => {
  it("AC-17: net düşümü istenenle aynı kayıt için stok işlemi yok (fiyat değişse de)", () => {
    const p = plan([A, B], form([A, B], [satir(A, { birimFiyat: 999 }), satir(B)]));
    expect(p.stok).toEqual([]);
  });
  it("AC-18: miktar artınca eski düşüm geri alınır, yeni miktar kullanılabilir kadar düşer, kayıt tam miktarla", () => {
    const p = plan([A, B], form([A, B], [satir(A, { miktar: "5" }), satir(B)]), { partStock: [{ id: 1, partId: "81", miktar: 1 }, STOK[1]] });
    expect(p.stok).toEqual([{ islem: "geriAl", kayitId: 101 }, { islem: "dus", partId: "81", miktar: 3, kayitId: 101 }]);
    expect(kayitOf(p, 101).miktar).toBe(5);
  });
  it("AC-19: aynı parçadan iki satırın miktarı artar, stok yetmez; düşümler birikimli, toplam mevcut stoğu aşmaz", () => {
    const p = plan([A, C], form([A, C], [satir(A, { miktar: "5" }), satir(C, { miktar: "5" })]), { partStock: [{ id: 1, partId: "81", miktar: 2 }] });
    const dusumler = p.stok.filter(o => o.islem === "dus");
    expect(dusumler).toEqual([{ islem: "dus", partId: "81", miktar: 5, kayitId: 101 }]);
    expect(dusumler.reduce((t, o) => t + o.miktar, 0)).toBeLessThanOrEqual(2 + 2 + 1);
  });
  it("AC-30: net düşümü olmayan kayıtta yalnız fiyat değişse de eksik düşüm tamamlanır (0065 R5)", () => {
    const p = plan([A, B], form([A, B], [satir(A, { birimFiyat: 120 }), satir(B)]), { partStockLog: [dus(102, "82", 3)] });
    expect(p.stok).toEqual([{ islem: "geriAl", kayitId: 101 }, { islem: "dus", partId: "81", miktar: 2, kayitId: 101 }]);
  });
  it("AC-32: çıkarılan satırın geri alınan düşümü kalan satırın kullanılabilir adedine girer", () => {
    const p = plan([A, C], form([A, C], [satir(A, { miktar: "4" })]), { partStock: [{ id: 1, partId: "81", miktar: 0 }] });
    expect(p.silinen).toEqual([103]);
    expect(p.stok).toEqual([{ islem: "geriAl", kayitId: 103 }, { islem: "geriAl", kayitId: 101 }, { islem: "dus", partId: "81", miktar: 3, kayitId: 101 }]);
  });
  it("eklenen satırın düşümü de aynı birikimli tabandan (taban 0'sa düşüm yazılmaz)", () => {
    const p = plan([A], form([A], [satir(A), { partId: "81", miktar: "2", birimFiyat: 1 }]), { partStock: [{ id: 1, partId: "81", miktar: 0 }] });
    expect(p.stok).toEqual([]);
    expect(p.eklenen[0].miktar).toBe(2);
  });
});

describe("Spec 0111: pano alarmı (R20, R20/2)", () => {
  const panolu = [kayit(101, "81", 2, { kargoDurum: "Hazırlanıyor" }), kayit(102, "82", 3, { kargoDurum: "Hazırlanıyor" })];
  const sonra = (p, once) => {
    const g = new Map(p.guncellenen.map(k => [k.id, k]));
    return [...once.map(s => g.get(s.id) || s), ...p.eklenen];
  };
  it("AC-23: satır eklenmeyen düzenleme yeni kart doğurmaz, alarm listesi boş", () => {
    const p = plan(panolu, form(panolu, panolu.map(k => satir(k, { birimFiyat: 3 }))));
    expect(yeniKargolar(new Set(panolu.map(s => s.id)), sonra(p, panolu))).toEqual([]);
  });
  it("AC-34: eklenen satır kargo durumunu ortak alandan alır ve yeni kart olarak görünür (alarm kuralı aynen)", () => {
    const p = plan(panolu, form(panolu, [...panolu.map(k => satir(k)), { partId: "82", miktar: "1", birimFiyat: 1 }]));
    expect(p.eklenen[0].kargoDurum).toBe("Hazırlanıyor");
    expect(yeniKargolar(new Set(panolu.map(s => s.id)), sonra(p, panolu))).toEqual([900]);
  });
});

describe("Spec 0111: kaynak taramaları", () => {
  it("AC-24 / R17/2: karar fonksiyonu kimlik ve zaman üretmez", () => {
    const s = yorumsuz(oku("src/lib/yedekParcaSatis.js"));
    const govde = s.slice(s.indexOf("export function topluDuzenlemePlani"), s.length);
    expect(govde).not.toMatch(/\buid\(|simdiYerel\(|new Date|Date\.now|today\(/);
  });
  it("AC-28: Stok sekmesinin ve bayi detayının satış yolları yeni karar fonksiyonunu çağırmaz (yalnız müşteri detayının toplu kolu)", () => {
    for (const f of ["src/components/stock/YedekParcaSatisTab.jsx", "src/components/SimpleDealers.jsx", "src/components/ServisPanosu.jsx"]) {
      expect(oku(f), f).not.toMatch(/topluDuzenlemePlani/);
    }
    const modal = yorumsuz(oku("src/components/customers/CustomerDetailModal.jsx"));
    expect(modal.match(/topluDuzenlemePlani\(/g)).toHaveLength(1);
  });
  it("AC-45 (C10): 'partiyi yeniden kurar' kaynakta geçmez", () => {
    expect(oku("src/lib/yedekParcaSatis.js")).not.toMatch(/partiyi yeniden kurar/);
  });
  it("R17, C2, C3: ekranın toplu kolu karar yazmaz; plana uyar, stok yalnız yedekParcaStok yardımcılarıyla", () => {
    const s = yorumsuz(oku("src/components/customers/CustomerDetailModal.jsx"));
    const kol = s.slice(s.indexOf("if (ypForm.batchEdit) {", s.indexOf("const saveYedekParca")), s.indexOf("if (ypForm.id) {", s.indexOf("const saveYedekParca")));
    expect(kol).toMatch(/topluDuzenlemePlani\(/);
    expect(kol).not.toMatch(/yeniYedekParcaSatisCoklu|yedekParcaRec\(|netDusum|totalMiktar|filter\(s => s\.partId/);
  });
  it("C1: sunucu, veritabanı, birleştirme ve kilit alanı dosyaları bu işi bilmez", () => {
    for (const f of ["electron/db.cjs", "electron/serverAuth.cjs", "src/lib/merge.js", "src/lib/kilitAlanlari.js"]) {
      expect(oku(f), f).not.toMatch(/topluDuzenlemePlani|_kayitId|_kilitId/);
    }
  });
});

// Triyaj 2026-10-26. (1) Formdaki "Ödendi" kutusu: dokunulduysa ücretli bütün satırlara yazılır, dokunulmadıysa satır başına
// korunur (R6/4). (2) Form açılırken partide olmayan canlı kayıt "çıkarıldı" sayılmaz, reddedilir (R2/3). (4) Bildirim ölçütü
// alıcının açık makina olmasıdır (R9/2).
describe("Spec 0111 triyaj: formdaki Ödendi kutusu (R6/4)", () => {
  const Y = (o = {}) => kayit(101, "81", 2, o), Z = (o = {}) => kayit(102, "82", 3, o);
  it("dokunulmadıysa (kutu açılış değerinde) her satır kendi ödeme durumunu ve tahsilat tarihini korur", () => {
    const e = [Y({ odendi: true, tahsilatTarihi: "2026-10-05" }), Z()];
    const p = plan(e, form(e, null, { _odendiAcilis: true }), { bugun: "2026-10-26" });
    expect(p.guncellenen.map(k => [k.odendi, k.tahsilatTarihi])).toEqual([[true, "2026-10-05"], [false, null]]);
  });
  it("ödenmemiş partide kutu işaretlenirse bütün satırlar ödenir, yeni işaretlenenin tahsilat tarihi o gün", () => {
    const e = [Y(), Z()];
    const p = plan(e, form(e, null, { _odendiAcilis: false, odendi: true, hesapId: 7 }), { bugun: "2026-10-26" });
    expect(p.guncellenen.map(k => [k.id, k.odendi, k.tahsilatTarihi, k.hesapId])).toEqual([[101, true, "2026-10-26", 7], [102, true, "2026-10-26", 7]]);
  });
  it("karışık partide işaretlenince zaten ödenmiş satır kendi tahsilat tarihini korur; çek ve kartta tarih boş kalır", () => {
    const e = [Y({ odendi: true, tahsilatTarihi: "2026-10-05" }), Z()];
    const p = plan(e, form(e, null, { _odendiAcilis: false, odendi: true }), { bugun: "2026-10-26" });
    expect(p.guncellenen.map(k => k.tahsilatTarihi)).toEqual(["2026-10-05", "2026-10-26"]);
    const cek = plan(e, form(e, null, { _odendiAcilis: false, odendi: true, yontem: "Çek" }), { bugun: "2026-10-26" });
    expect(cek.guncellenen.map(k => [k.odendi, k.tahsilatTarihi])).toEqual([[true, "2026-10-05"], [true, null]]);
  });
  it("ödenmiş partide işaret kaldırılırsa bütün satırlar ödenmemiş olur ve tahsilat tarihi silinir", () => {
    const e = [Y({ odendi: true, tahsilatTarihi: "2026-10-05" }), Z({ odendi: true, tahsilatTarihi: "2026-10-06" })];
    const p = plan(e, form(e, null, { _odendiAcilis: true, odendi: false }), { bugun: "2026-10-26" });
    expect(p.guncellenen.map(k => [k.odendi, k.tahsilatTarihi])).toEqual([[false, null], [false, null]]);
  });
  it("ücretsiz işaret ödeme kutusundan önce gelir: ücretsiz partide işaret ödeme durumu yazmaz (0095 R7/2)", () => {
    const e = [Y(), Z()];
    const p = plan(e, form(e, null, { _odendiAcilis: false, odendi: true, ucretsizMi: true }), { bugun: "2026-10-26" });
    expect(p.guncellenen.every(k => k.ucretsizMi && k.odendi === false)).toBe(true);
  });
  it("form içi işaretler kayda girmez", () => {
    const e = [Y(), Z()];
    const p = plan(e, form(e, null, { _odendiAcilis: false, _acilisIdleri: [101, 102] }), { bugun: "2026-10-26" });
    expect(p.guncellenen.flatMap(k => Object.keys(k).filter(a => a.startsWith("_")))).toEqual([]);
  });
});

describe("Spec 0111 triyaj: form açıkken partiye eklenen kayıt (R2/3)", () => {
  it("açılışta partide olmayan canlı kayıt varsa düzenleme reddedilir; hiçbir liste dönmez", () => {
    const p = plan([A, B, C], form([A, B], null, { _acilisIdleri: [101, 102] }));
    expect(p).toEqual({ ok: false, hata: TOPLU_PARTI_DEGISTI });
  });
  it("açılıştaki kayıt formdan çıkarılırsa yine çöpe gider (yalnız açılış kümesindeki kayıt çıkarılabilir)", () => {
    const p = plan([A, B, C], form([A, B, C], [satir(A), satir(B)], { _acilisIdleri: [101, 102, 103] }));
    expect(p.ok).toBe(true);
    expect(p.silinen).toEqual([103]);
  });
  it("planın dönüşünde okunmayan kimlik listesi yok", () => {
    expect(Object.keys(plan([A, B], form([A, B])))).not.toContain("kayitIdleri");
  });
});

describe("Spec 0111 triyaj: bildirim (R9/2)", () => {
  it("alıcı aynı makina → güncellendi; başka müşteri → taşındı; bayi ya da dış firma → geçmişten çıktı", () => {
    expect(topluBildirimi({ aliciTipi: "musteri", musteriId: 1001 }, 1001)).toBe(TOPLU_GUNCELLENDI);
    expect(topluBildirimi({ aliciTipi: "musteri", musteriId: "1001" }, 1001)).toBe(TOPLU_GUNCELLENDI);
    expect(topluBildirimi({ aliciTipi: "musteri", musteriId: 1002 }, 1001)).toBe(TOPLU_BASKA_MUSTERIYE_GECTI);
    expect(topluBildirimi({ aliciTipi: "bayi", dealerId: 71 }, 1001)).toBe(TOPLU_BAYIYE_GECTI);
  });
});

// Kapanış belge düzeni (0110 emsali). Plan specs/done'a taşındığında CLAUDE.md'nin 0111 bölümü commit satırını taşır, spec atıf
// testinin taşınacaklar listesi boşalır, eski spec kopyası kalmaz ve kanıt kayıtları tabanda `ayni`dır. Taşınmadan önce sınanmaz.
describe("Spec 0111: kapanış belge düzeni", () => {
  it("plan done'daysa: CLAUDE.md 0111 bölümünde 'Tamamlandı: commit', TASINACAK'ta 0111 yok, eski kopya yok, kanıt tabanda ayni", async () => {
    const { existsSync } = await import("node:fs");
    if (!existsSync(path.join(kok, "specs/done/0111-uygulama-plani.md"))) return;
    const claude = oku("CLAUDE.md");
    const bolum = claude.slice(claude.indexOf("(spec 0111, plan"), claude.indexOf("(spec 0110, plan"));
    expect(bolum).toMatch(/Tamamlandı: commit `[0-9a-f]{7}`/);
    expect(bolum).not.toMatch(/specs\/0111-/);
    expect(oku("tests/spec-atiflari.test.js")).not.toMatch(/TASINACAK = \[[^\]]*0111/);
    expect(existsSync(path.join(kok, "specs/0111-toplu-yedek-parca-duzenlemesi-yerinde.md"))).toBe(false);
    const kanit = JSON.parse(oku("docs/evidence/kanit-eslemesi.json")).dosyalar;
    const kayitlar = Object.values(kanit).flat().filter(k => k.rapor.includes("/0111-"));
    expect(kayitlar.length).toBeGreaterThan(0);
    expect(kayitlar.filter(k => k.beklenen === "degisti" || k.onay)).toEqual([]);
  });
});
