// Spec 0058: hesapsız kayıtların kapsam dışı bırakılabilmesi. Motor testleri (kasa.js hesapsizOzeti / hesapsizOdemeler /
// hesapsizTahsilatlar, kapsam anahtarı, temizlik), rapor ve merge çaprazı. Test adları AC-<n>.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { hesapsizOzeti, hesapsizOdemeler, hesapsizTahsilatlar, hesapBakiyeleri, kapsamAnahtari, kapsamGirisAnahtari, kapsamGirisi,
  kapsamDisiTemizle, kapsamGirisiGecersizMi, KAPSAM_TUR } from "../src/lib/kasa";
import { satisTahsilatKalemleri } from "../src/lib/satisTahsilat";
import { turHaritasi, odemeleriUygula, odemeDurumu } from "../src/lib/gider";
import { buildMergePlan } from "../src/lib/merge";
import { uid } from "../src/lib/utils";

const turler = [{ id: 4, ad: "Hammadde", davranis: "normal" }];
const turMap = turHaritasi(turler);
const HESAPLAR = [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 100000, kapali: false },
  { id: 52, ad: "Dolar", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 0, kapali: false }];
const od = (id, tarih, o = {}) => ({ id, tur: "odeme", tarih, tutar: 100, hesapId: null, giderId: 1, taksitId: null, yontem: "Nakit", ...o });
const HAREKETLER = [od(1, "2026-05-10"), od(2, "2026-07-10"), { id: 5, tur: "avans", tarih: "2026-05-01", tutar: 50, calisanId: 21, hesapId: null },
  { id: 6, tur: "avans", tarih: "2026-08-01", tutar: 50, calisanId: 21, hesapId: null }, od(9, "2026-05-03", { hesapId: 51 })];
const sv = (id, date, o = {}) => ({ id, customerId: 500, date, type: "Garanti Dışı", repairPlace: "Yerinde Onarım", islemFirma: "Altuntaş Makina", servisUcreti: 1000,
  currency: "TRY", faturaTipi: "Faturalı Yurtiçi", odendi: true, tahsilatTarihi: date, yontem: "Nakit", degisenParcalar: [], hesapId: null, ...o });
const VERI = { customers: [{ id: 500, name: "Kutu Gıda" }], factory: { name: "Altuntaş Makina" },
  services: [sv(11, "2026-05-05"), sv(12, "2026-07-05"), sv(13, "2026-05-06", { hesapId: 999 })] };
const ESIK = "2026-06-01";
const giris = (tur, kaynak, kayitId, id) => ({ id, tur, kaynak, kayitId, zaman: "2026-10-01T10:00:00.000Z" });
// Kapsam dışı: servis 11 (eşik öncesi), servis 12 (eşik sonrası), ödeme 1 (eşik öncesi), avans 6 (eşik sonrası).
const KD = [giris("tahsilat", "servis", 11, 801), giris("tahsilat", "servis", 12, 802), giris("hareket", null, 1, 803), giris("hareket", null, 6, 804)];

describe("Spec 0058: anahtar ve tek liste (R11, C2, AC-16, AC-18)", () => {
  it("AC-16: tahsilat satırı {kaynak, kayit} ve ödeme satırı (hareketin kendisi) aynı anahtarla adreslenir", () => {
    const t = hesapsizTahsilatlar(VERI, HESAPLAR).liste.find(k => k.kayit.id === 11);
    expect(kapsamGirisi(t)).toEqual({ tur: KAPSAM_TUR.TAHSILAT, kaynak: "servis", kayitId: 11 });
    expect(kapsamGirisi(HAREKETLER[0])).toEqual({ tur: KAPSAM_TUR.HAREKET, kaynak: null, kayitId: 1 });
    expect(kapsamAnahtari(t)).toBe(kapsamGirisAnahtari(KD[0]));
    expect(kapsamAnahtari(HAREKETLER[0])).toBe(kapsamGirisAnahtari(KD[2]));
    expect(kapsamAnahtari({ id: 11 })).not.toBe(kapsamAnahtari(t)); // aynı kimlikli hareket ile servis karışmaz
  });
  it("AC-18: bölümlere ayrı bayrak sütunu eklenmedi (tek tablo kasa_kapsam_disi)", () => {
    const db = readFileSync("electron/db.cjs", "utf-8");
    expect(db).toMatch(/CREATE TABLE IF NOT EXISTS kasa_kapsam_disi/);
    expect(db).not.toMatch(/kapsamDisi INTEGER|kapsamDisi TEXT|kapsam_disi INTEGER/);
    // Kayıtlara yazılan bir bayrak yok (gider.js'teki `kapsamDisi` yürürlük dönemi alanıdır, ilgisiz).
    for (const f of ["src/lib/satisTahsilat.js", "src/lib/gider.js", "src/components/Kasa.jsx"]) expect(readFileSync(f, "utf-8"), f).not.toMatch(/\.\.\.r, kapsamDisi|kapsamDisi: true/);
  });
});

describe("Spec 0058: özet ve öncelik (R6, R13, R15, AC-1, AC-2, AC-8, AC-17, AC-20–AC-22)", () => {
  it("AC-20 / AC-22: parametresiz çağrılar bugünkü çıktıyı birebir verir", () => {
    expect(Object.keys(hesapsizOzeti(HAREKETLER, VERI, HESAPLAR, ESIK))).toEqual(["esik", "odeme", "tahsilat", "gizli", "tarihsiz"]);
    expect(hesapsizOzeti(HAREKETLER, VERI, HESAPLAR, ESIK)).toEqual(hesapsizOzeti(HAREKETLER, VERI, HESAPLAR, ESIK, null));
    expect(hesapsizOdemeler(HAREKETLER)).toEqual(hesapsizOdemeler(HAREKETLER, null, null));
    expect(hesapsizTahsilatlar(VERI, HESAPLAR)).toEqual(hesapsizTahsilatlar(VERI, HESAPLAR, null, null));
    expect(hesapsizOdemeler(HAREKETLER, null, [])).toEqual(hesapsizOdemeler(HAREKETLER));
  });
  it("AC-1 / AC-2 / AC-17: kapsam dışı satırlar listeden ve sayılardan çıkar (tahsilat, ödeme, avans)", () => {
    const o = hesapsizOzeti(HAREKETLER, VERI, HESAPLAR, null, KD);
    expect(o.tahsilat.liste.map(k => k.kayit.id)).toEqual([13]);
    expect(o.odeme.liste.map(m => m.id)).toEqual([5, 2]);
    expect(o.odeme).toMatchObject({ adet: 1, avansAdet: 1 });
    expect(o.kapsamDisi).toMatchObject({ odeme: 1, avans: 1, tahsilat: 2, toplam: 4 });
    expect(o.kapsamDisi.tahsilatListe.map(k => k.kayit.id).sort()).toEqual([11, 12]);
    expect(o.kapsamDisi.odemeListe.map(m => m.id).sort()).toEqual([1, 6]);
  });
  it("AC-8 / AC-21: önce kapsam dışı, sonra eşik; gizli yalnız kapsamdakileri sayar, kapsam dışı eşikten bağımsız ayrı", () => {
    const o = hesapsizOzeti(HAREKETLER, VERI, HESAPLAR, ESIK, KD);
    // Kapsamda kalanlar: ödeme 2 (eşik sonrası), avans 5 (eşik öncesi), servis 13 (eşik öncesi, hesapYok).
    expect(o.odeme.liste.map(m => m.id)).toEqual([2]);
    expect(o.tahsilat.liste).toEqual([]);
    expect(o.gizli).toEqual({ odeme: 0, avans: 1, tahsilat: { hesapsiz: 0, hesapYok: 1, paraBirimi: 0 }, toplam: 2 });
    expect(o.kapsamDisi.toplam).toBe(4); // eşik öncesi ve sonrası kapsam dışılar birlikte
    expect(o.odeme.adet + o.odeme.avansAdet).toBe(o.odeme.liste.length); // R6: sayı = liste uzunluğu
  });
  it("AC-10: başlangıç tarihi süzgeci kapsam dışılıktan bağımsız; kapsam dışı yokken 0051 çıktısı aynen", () => {
    const a = hesapsizOzeti(HAREKETLER, VERI, HESAPLAR, ESIK);
    const b = hesapsizOzeti(HAREKETLER, VERI, HESAPLAR, ESIK, []);
    const { kapsamDisi, ...bSuz } = b;
    expect(bSuz).toEqual(a);
    expect(kapsamDisi.toplam).toBe(0);
  });
});

describe("Spec 0058: hiçbir rakam değişmez (R2, C1, AC-3)", () => {
  it("AC-3: bakiye, gelir (tahsilat kalemleri), borç (ödeme durumu) ve kayıt sayısı kapsam dışı ile aynı", () => {
    const veri = { ...VERI, payments: [], partSales: [], yedekParcaSatislar: [] };
    const b1 = [...hesapBakiyeleri(HESAPLAR, HAREKETLER, veri).values()].map(x => x.bakiyeK);
    const gelir = satisTahsilatKalemleri({ services: VERI.services, partSales: [], yedekParcaSatislar: [] }, { factoryName: "Altuntaş Makina" });
    const kalem = { id: 1, tarih: "2026-05-01", turId: 4, tutar: 200, kdvOrani: 0, sonOdemeTarihi: "2026-05-30" };
    const once = JSON.stringify({ HAREKETLER, VERI });
    hesapsizOzeti(HAREKETLER, VERI, HESAPLAR, ESIK, KD);
    expect(JSON.stringify({ HAREKETLER, VERI })).toBe(once); // kayıt silinmez, değişmez
    expect([...hesapBakiyeleri(HESAPLAR, HAREKETLER, veri).values()].map(x => x.bakiyeK)).toEqual(b1);
    expect(satisTahsilatKalemleri({ services: VERI.services, partSales: [], yedekParcaSatislar: [] }, { factoryName: "Altuntaş Makina" })).toEqual(gelir);
    expect(odemeDurumu(odemeleriUygula([kalem], HAREKETLER, turMap)[0])).toBe("odendi"); // ödeme 1 ve 2 borcu kapatmaya devam eder
    expect(readFileSync("src/lib/aylikRapor.js", "utf-8")).not.toMatch(/kapsamDisi/);
  });
});

describe("Spec 0058: temizlik (R5, R16, R20, AC-7, AC-24, AC-25)", () => {
  const hareketler = HAREKETLER;
  it("AC-7 / AC-25: kaydına geçerli hesap atanan tahsilatın girişi düşer; hesabı silinmiş ya da para birimi uyuşmayan kalır", () => {
    const veri = (o) => ({ ...VERI, services: VERI.services.map(s => (s.id === 11 ? { ...s, ...o } : s)) });
    expect(kapsamGirisiGecersizMi(KD[0], hareketler, veri({ hesapId: 51 }), HESAPLAR)).toBe(true);
    expect(kapsamGirisiGecersizMi(KD[0], hareketler, veri({ hesapId: 999 }), HESAPLAR)).toBe(false);
    expect(kapsamGirisiGecersizMi(KD[0], hareketler, veri({ hesapId: 52 }), HESAPLAR)).toBe(false); // USD hesabı, TL kayıt
    const t = kapsamDisiTemizle(KD, hareketler, veri({ hesapId: 51 }), HESAPLAR);
    expect(t.map(g => g.id)).toEqual([802, 803, 804]);
    expect(kapsamDisiTemizle(KD, hareketler, VERI, HESAPLAR)).toBe(KD); // değişiklik yok → aynı dizi
  });
  it("AC-24: çöpteki kaydın girişi kalır (okuma anında yok sayılır, çöpten dönünce karar döner); kalıcı silinen düşer", () => {
    const copte = { ...VERI, services: VERI.services.map(s => (s.id === 11 ? { ...s, deletedAt: "2026-09-30T10:00:00Z" } : s)) };
    expect(kapsamDisiTemizle(KD, hareketler, copte, HESAPLAR)).toBe(KD);
    expect(hesapsizOzeti(hareketler, copte, HESAPLAR, null, KD).kapsamDisi.tahsilat).toBe(1); // çöpteki sayılmaz
    expect(hesapsizOzeti(hareketler, VERI, HESAPLAR, null, KD).kapsamDisi.tahsilat).toBe(2); // geri alınınca döner
    const silindi = { ...VERI, services: VERI.services.filter(s => s.id !== 11) };
    expect(kapsamDisiTemizle(KD, hareketler, silindi, HESAPLAR).map(g => g.id)).toEqual([802, 803, 804]);
    expect(kapsamDisiTemizle(KD, hareketler.filter(m => m.id !== 1), VERI, HESAPLAR).map(g => g.id)).toEqual([801, 802, 804]);
    expect(kapsamDisiTemizle(KD, hareketler.map(m => (m.id === 6 ? { ...m, hesapId: 51 } : m)), VERI, HESAPLAR).map(g => g.id)).toEqual([801, 802, 803]);
  });
});

describe("Spec 0058: rapor ve merge (R7, R14, R15, AC-9, AC-22, AC-23)", () => {
  it("AC-23: iki PC'nin kapsam dışı eklemeleri birleşir; yeniden atanan kayıt kimliği kaynağına göre izlenir", () => {
    // Bu PC'de üretilmiş (minted) bir hareket kimliği, sunucuda başka içerikle var: hareket yeniden atanır, girişi onu izler.
    const hid = uid(), sid = uid(), gid1 = uid(), gid2 = uid();
    const sunucu = { services: [sv(sid, "2026-05-05", { servisUcreti: 5 })], hesapHareketleri: [od(hid, "2026-05-10")], kasaKapsamDisi: [giris("tahsilat", "servis", 11, 801)] };
    const benim = { services: [sv(sid, "2026-05-05")], hesapHareketleri: [od(hid, "2026-05-10", { tutar: 999 })],
      kasaKapsamDisi: [giris("tahsilat", "servis", 11, 801), giris("hareket", null, hid, gid1), giris("tahsilat", "servis", sid, gid2)] };
    const plan = buildMergePlan(benim, sunucu);
    // Spec 0073 triyaj (bulgu 1) ile güncellendi: aynı kimlikli hareket artık yeni kimlikle eklenmez (çift ödeme doğardı);
    // düzenleme sunucu kopyasına yenilir ve hareketin kapsam dışı girişi aynı kimliği izler. Servis (başka bölüm) bugünkü gibi.
    expect(plan.adds.hesapHareketleri).toEqual([]);
    const yeniS = plan.adds.services[0].id;
    expect(yeniS).not.toBe(sid);
    expect(plan.adds.kasaKapsamDisi.map(g => [g.tur, g.kayitId])).toEqual([["hareket", hid], ["tahsilat", yeniS]]); // 801 sunucuda zaten var
  });
});
