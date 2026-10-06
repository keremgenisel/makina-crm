// Spec 0073: kasa hareketlerinin düzenlenmesi ve silinmesi, saf motor (formOdemesi düzenleme kipi, odemeGirisiYaz
// guncellenenler, kasa.avansDuzenlenebilirMi, kasa.hareketDuzenlemeDurumu) ve kaynak taramaları. Test adları AC-<n> taşır.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { odemeGirisiHazirla, odemeGirisiYaz, GOC_TUTAR_HATASI, CEK_YONTEMI_DUZENLEME_HATASI } from "../src/lib/formOdemesi";
import { virmanDogrula, avansDogrula, avansDuzenlenebilirMi, avansEnAzMetni, avansSilinebilirMi, hareketDuzenlemeDurumu, hesapBakiyeleri,
  tahsilatSatiriIbaresi, CEK_HAREKETI_NEDENI, SILINMIS_KALEM_NEDENI } from "../src/lib/kasa";
import { giderKalemDogrula, turHaritasi, odemeleriUygula, odemeDurumu, HEDEF } from "../src/lib/gider";
import { SATIS_KAYNAK } from "../src/lib/satisTahsilat";
import { HAREKET_ENTITY } from "../src/lib/audit";
import { buildMergePlan } from "../src/lib/merge";
import { clearMintedIds, setIdCounter, uid as uygUid } from "../src/lib/utils";

const turler = [{ id: 1, ad: "Hammadde", davranis: "normal" }, { id: 3, ad: "Personel", davranis: "personel" }];
const turMap = turHaritasi(turler);
const tedarikciler = [{ id: 11, ad: "Yıldız" }];
let n = 7000;
const uid = () => ++n;
const kayit = (form) => { const r = giderKalemDogrula(form, { turMap, tedarikciler, uid }); expect(r.hatalar).toEqual([]); return r.kayit; };
const normal = (o = {}) => kayit({ id: 1, tarih: "2026-09-10", turId: 1, tutar: 100000, kdvOrani: 0, tedarikciId: 11, sonOdemeTarihi: "2026-09-30", ...o });
const personel = (o = {}) => kayit({ id: 3, tarih: "2026-09-01", turId: 3, calisanId: 7, calisanAd: "Hasan", resmiTutar: 30000, eldenTutar: 0, sonOdemeTarihi: "2026-09-30", ...o });
const H = [{ id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 200000, acilisTarihi: "2026-01-01" },
  { id: 52, ad: "Kasa", tur: "kasa", paraBirimi: "TRY", acilisBakiyesi: 100000, acilisTarihi: "2026-01-01" },
  { id: 53, ad: "Eski", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 0, acilisTarihi: "2026-01-01", kapali: true },
  { id: 54, ad: "Dolar", tur: "banka", paraBirimi: "USD", acilisBakiyesi: 0, acilisTarihi: "2026-01-01" }];
const T = "2026-09-20";
const satir = (o = {}) => ({ anahtar: "s0", hedef: HEDEF.ANA, sira: null, tutar: "100.000", yontem: "Havale", hesapId: 51, aciklama: "", ...o });
const zengin = (k, hareketler = []) => odemeleriUygula([k], hareketler, turMap)[0];
// Pencerenin yaptığı gibi: kalem bütün hareketlerle zenginleşmiş gelir, motor düzenleneni kendisi hariç tutar.
const duzenle = (k, hareketler, duzenlenen, satirlar, o = {}) => odemeGirisiHazirla(zengin(k, hareketler), {
  turMap, tarih: o.tarih ?? T, kip: "duzenle", satirlar, hesaplar: H, hareketler, duzenlenen, ...o });

describe("Spec 0073 A: düzenleme kimliği, türü ve bağı korur", () => {
  it("AC-5 / AC-6 / AC-23: düzenleme kimliği, türü ve gider bağını korur; odemeGirisiYaz yerinde günceller, sayı değişmez", () => {
    const k = normal();
    const m = { id: 900, tur: "odeme", tarih: "2026-09-12", tutar: 40000, yontem: "Havale", hesapId: 51, giderId: 1, taksitId: null, aciklama: "" };
    const r = duzenle(k, [m], m, [satir({ tutar: "45.000", hesapId: 52, yontem: "Nakit", aciklama: "düzeltme" })], { tarih: "2026-09-13" });
    expect(r.guncellenen).toMatchObject({ id: 900, tur: "odeme", giderId: 1, tutar: 45000, hesapId: 52, yontem: "Nakit", tarih: "2026-09-13", aciklama: "düzeltme" });
    expect(r.hareketler).toBeNull();
    let durum = [m, { id: 901, tur: "virman", tarih: "2026-09-01", tutar: 5, hesapId: 51, karsiHesapId: 52 }];
    odemeGirisiYaz({ guncellenenler: [r.guncellenen] }, { setHesapHareketleri: (f) => { durum = f(durum); }, uid });
    expect(durum).toHaveLength(2);
    expect(durum[0]).toMatchObject({ id: 900, tutar: 45000, hesapId: 52 });
    expect(durum[1].id).toBe(901);
  });
  it("AC-5: kipten bağımsız olarak hareketin türü değişmez (mahsup düzenlemesi mahsup kalır)", () => {
    const k = personel();
    const avans = { id: 801, tur: "avans", tarih: "2026-08-20", tutar: 5000, calisanId: 7, hesapId: null };
    const sat = (k.taksitler || []).find(x => x.hedef === HEDEF.ANA);
    const mah = { id: 802, tur: "mahsup", tarih: "2026-09-05", tutar: 3000, calisanId: 7, giderId: 3, taksitId: sat?.id ?? null, hesapId: null };
    const r = duzenle(k, [avans, mah], mah, [satir()], { mahsup: { hedef: HEDEF.ANA, sira: sat?.sira ?? null, tutar: "4.000", aciklama: "" }, giderler: [k], bugun: T });
    expect(r.guncellenen).toMatchObject({ id: 802, tur: "mahsup", calisanId: 7, giderId: 3, tutar: 4000, hesapId: null });
  });
});

describe("Spec 0073 B: doğrulama aynı, sınır bu hareket hariç", () => {
  it("AC-9: tek ödemeyle tam kapanmış kalemin ödemesi aynı tutarla kaydedilir (kendi tutarı sınır sanılmaz); fazlası reddedilir", () => {
    const k = normal();
    const m = { id: 900, tur: "odeme", tarih: "2026-09-12", tutar: 100000, yontem: "Havale", hesapId: 51, giderId: 1, taksitId: null };
    expect(odemeDurumu(zengin(k, [m]))).toBe("odendi");
    expect(duzenle(k, [m], m, [satir({ tutar: "100.000" })]).guncellenen).toMatchObject({ id: 900, tutar: 100000 });
    const fazla = duzenle(k, [m], m, [satir({ tutar: "100.001" })]);
    expect(fazla.guncellenen).toBeNull();
    expect(JSON.stringify(fazla.hatalar)).toMatch(/100\.000,00/);
  });
  it("AC-9 / AC-11: diğer ödemeler sınırı daraltır; hata hangi bölümün sınırının aşıldığını söyler", () => {
    const k = normal();
    const a = { id: 900, tur: "odeme", tarih: "2026-09-12", tutar: 60000, yontem: "Havale", hesapId: 51, giderId: 1 };
    const b = { id: 901, tur: "odeme", tarih: "2026-09-13", tutar: 30000, yontem: "Havale", hesapId: 51, giderId: 1 };
    expect(duzenle(k, [a, b], b, [satir({ tutar: "40.000" })]).guncellenen).toMatchObject({ tutar: 40000 });
    const r = duzenle(k, [a, b], b, [satir({ tutar: "40.001" })], { hedefAdi: () => "Tedarikçiye" });
    expect(r.guncellenen).toBeNull();
    expect(JSON.stringify(r.hatalar)).toMatch(/Tedarikçiye|kalan/);
  });
  it("AC-10: mahsupta sınır bu hareket hariç açık avans ile kalanın küçüğü", () => {
    const k = personel();
    const avans = { id: 801, tur: "avans", tarih: "2026-08-20", tutar: 5000, calisanId: 7, hesapId: null };
    const sat = (k.taksitler || []).find(x => x.hedef === HEDEF.ANA);
    const mah = { id: 802, tur: "mahsup", tarih: "2026-09-05", tutar: 5000, calisanId: 7, giderId: 3, taksitId: sat?.id ?? null, hesapId: null };
    const ortak = { giderler: [k], bugun: T };
    // Avansın tamamı bu mahsupla kapanmış: aynı tutar yine geçer (kendi tutarı açık avanstan düşülmez).
    expect(duzenle(k, [avans, mah], mah, [satir()], { ...ortak, mahsup: { hedef: HEDEF.ANA, sira: sat?.sira ?? null, tutar: "5.000" } }).guncellenen).toMatchObject({ tutar: 5000 });
    const r = duzenle(k, [avans, mah], mah, [satir()], { ...ortak, mahsup: { hedef: HEDEF.ANA, sira: sat?.sira ?? null, tutar: "5.001" } });
    expect(r.guncellenen).toBeNull();
    expect(r.hatalar.mahsup.tutar).toMatch(/Açık avans borcundan fazla/);
  });
  it("AC-8: düzenlenen ödeme yeni ödemeyle aynı doğrulamadan geçer (para birimi uyuşmayan hesap, tarihsiz)", () => {
    const k = normal();
    const m = { id: 900, tur: "odeme", tarih: "2026-09-12", tutar: 1000, yontem: "Havale", hesapId: 51, giderId: 1 };
    expect(duzenle(k, [m], m, [satir({ tutar: "1.000", hesapId: 54 })]).guncellenen).toBeNull();
    expect(duzenle(k, [m], m, [satir({ tutar: "1.000" })], { tarih: "" }).hatalar.genel).toContain("Ödeme tarihi girilmedi.");
  });
  it("AC-44: kapalı hesaptaki ödeme düzenlenemez (doğrulayıcı kapalı hesaba yazmaz); silme durumu açıktır", () => {
    const k = normal();
    const m = { id: 900, tur: "odeme", tarih: "2026-09-12", tutar: 1000, yontem: "Havale", hesapId: 53, giderId: 1 };
    const r = duzenle(k, [m], m, [satir({ tutar: "1.000", hesapId: 53 })]);
    expect(r.guncellenen).toBeNull();
    expect(hareketDuzenlemeDurumu(m).silinebilir).toBe(true);
  });
  it("AC-42 (R25): düzenlemede çekli yöntem reddedilir", () => {
    const k = normal();
    const m = { id: 900, tur: "odeme", tarih: "2026-09-12", tutar: 1000, yontem: "Havale", hesapId: 51, giderId: 1 };
    for (const yontem of ["Çek (ciro)", "Çek (kendi)"]) {
      const r = duzenle(k, [m], m, [satir({ tutar: "1.000", yontem })]);
      expect(r.guncellenen).toBeNull();
      expect(r.hatalar.satirlar.s0.yontem).toBe(CEK_YONTEMI_DUZENLEME_HATASI);
    }
  });
  it("AC-30: avans düzenlemesinde tutar mahsup toplamının altına düşemez; hata en az tutarı ve mahsubu söyler", () => {
    const k = personel();
    const a1 = { id: 801, tur: "avans", tarih: "2026-08-20", tutar: 10000, calisanId: 7, hesapId: null };
    const mah = { id: 802, tur: "mahsup", tarih: "2026-09-05", tutar: 6000, calisanId: 7, giderId: 3, hesapId: null };
    const h = [a1, mah];
    expect(avansDuzenlenebilirMi(a1, 6000, h, [k]).ok).toBe(true);
    const d = avansDuzenlenebilirMi(a1, 5000, h, [k]);
    expect(d).toMatchObject({ ok: false, eksikK: 100000, enAzK: 600000, mahsupK: 600000 });
    expect(avansEnAzMetni(d)).toBe("Bu avans en az 6.000,00 ₺ olmalı; 6.000,00 ₺ tutarında mahsup edilmiş.");
    // İkinci avans payı karşılar: en az tutar mahsup − diğer avanslar.
    const a2 = { id: 803, tur: "avans", tarih: "2026-08-25", tutar: 4000, calisanId: 7, hesapId: null };
    expect(avansDuzenlenebilirMi(a1, 2000, [...h, a2], [k])).toMatchObject({ ok: true, enAzK: 200000 });
    // Silme, yeni tutarın sıfır olduğu özel durumdur: bugünkü avansSilinebilirMi ile aynı sonuç.
    expect(avansDuzenlenebilirMi(a1, 0, h, [k]).ok).toBe(avansSilinebilirMi(a1, h, [k]).ok);
  });
  it("AC-12: virman düzenlemesi aynı virman doğrulamasından geçer (aynı para birimi, farklı hesaplar)", () => {
    const f = { hesapId: 51, karsiHesapId: 51, tarih: T, tutar: "100", aciklama: "" };
    expect(virmanDogrula(f, H).hatalar.karsiHesapId).toBe("Aynı hesaba virman yapılamaz.");
    expect(virmanDogrula({ ...f, karsiHesapId: 54 }, H).hatalar.karsiHesapId).toMatch(/Farklı para birimindeki/);
    expect(virmanDogrula({ ...f, karsiHesapId: 52 }, H).kayit).toMatchObject({ tur: "virman", hesapId: 51, karsiHesapId: 52, tutar: 100 });
  });
  it("AC-32 (R23): hesabın açılış tarihinden önceye ve geleceğe tarih girilebilir", () => {
    const k = normal();
    const m = { id: 900, tur: "odeme", tarih: "2026-09-12", tutar: 1000, yontem: "Havale", hesapId: 51, giderId: 1 };
    expect(duzenle(k, [m], m, [satir({ tutar: "1.000" })], { tarih: "2025-12-01" }).guncellenen).toMatchObject({ tarih: "2025-12-01" });
    expect(duzenle(k, [m], m, [satir({ tutar: "1.000" })], { tarih: "2027-03-01" }).guncellenen).toMatchObject({ tarih: "2027-03-01" });
    expect(virmanDogrula({ hesapId: 51, karsiHesapId: 52, tarih: "2025-12-01", tutar: "5" }, H).kayit).toBeTruthy();
    expect(avansDogrula({ calisanId: 7, tarih: "2027-03-01", tutar: "5" }, { calisanlar: [{ id: 7, ad: "Hasan" }], hesaplar: H }).kayit).toBeTruthy();
  });
  it("AC-7: satırlı kalemde taksit seçimi değişir; satırsız kalemde taksit bağı yoktur", () => {
    const k = normal({ taksitSayisi: 2, ilkVade: "2026-09-30" });
    const [t1, t2] = k.taksitler;
    const m = { id: 900, tur: "odeme", tarih: "2026-09-12", tutar: 1000, yontem: "Havale", hesapId: 51, giderId: 1, taksitId: t1.id };
    expect(duzenle(k, [m], m, [satir({ tutar: "1.000", sira: t2.sira })]).guncellenen.taksitId).toBe(t2.id);
    const s = normal({ id: 2 });
    const m2 = { id: 901, tur: "odeme", tarih: "2026-09-12", tutar: 1000, yontem: "Havale", hesapId: 51, giderId: 2, taksitId: null };
    expect(duzenle(s, [m2], m2, [satir({ tutar: "1.000", sira: 2 })]).guncellenen.taksitId).toBeNull();
  });
});

describe("Spec 0073 C: dokunulmayanlar", () => {
  it("AC-13: çeke bağlı hareket düzenlenemez ve silinemez (ortak kural ve motor)", () => {
    const m = { id: 900, tur: "odeme", tarih: "2026-09-12", tutar: 1000, yontem: "Çek (ciro)", hesapId: null, giderId: 1, cekId: 40 };
    expect(hareketDuzenlemeDurumu(m)).toEqual({ duzenlenebilir: false, silinebilir: false, neden: CEK_HAREKETI_NEDENI });
    const r = duzenle(normal(), [m], m, [satir({ tutar: "1.000" })]);
    expect(r.guncellenen).toBeNull();
    expect(r.hatalar.genel).toContain("Çeke bağlı hareket düzenlenemez.");
  });
  it("AC-34: kalemi kalıcı silinmiş ödeme silinebilir, düzenlenemez; nedeni yazılıdır", () => {
    const m = { id: 900, tur: "odeme", tarih: "2026-09-12", tutar: 1000, hesapId: 51, giderId: 999 };
    expect(hareketDuzenlemeDurumu(m, { giderVar: () => false })).toEqual({ duzenlenebilir: false, silinebilir: true, neden: SILINMIS_KALEM_NEDENI });
    expect(hareketDuzenlemeDurumu({ ...m, tur: "virman", giderId: undefined }, { giderVar: () => false }).duzenlenebilir).toBe(true);
  });
  it("AC-14 / AC-33: tahsilat ve verilen çek satırı için ibare kaynağını söyler", () => {
    expect(tahsilatSatiriIbaresi({ kaynak: SATIS_KAYNAK.YEDEK })).toBe("Stok › Yedek Parça Satışı'ndan değiştirilir");
    expect(tahsilatSatiriIbaresi({ kaynak: SATIS_KAYNAK.SERVIS })).toBe("Müşteri detayından değiştirilir");
    expect(tahsilatSatiriIbaresi({ kaynak: SATIS_KAYNAK.KALIP })).toBe("Müşteri detayından değiştirilir");
    expect(tahsilatSatiriIbaresi({ tahsilat: { id: 1 } })).toBe("Müşteri detayından değiştirilir"); // makina tahsilatı
  });
  it("AC-15 / AC-36: göç hareketi boş tutarla düzenlenemez; tutar girilince tamKapatir düşer, gocKaynak izi kalır", () => {
    const k = normal();
    const m = { id: 900, tur: "odeme", tarih: "2026-06-05", tamKapatir: true, hesapId: null, giderId: 1, kaynak: "goc", gocKaynak: "kalem:1" };
    expect(hareketDuzenlemeDurumu(m)).toMatchObject({ duzenlenebilir: true, silinebilir: true, goc: true });
    const bos = duzenle(k, [m], m, [satir({ tutar: "", hesapId: "" })]);
    expect(bos.guncellenen).toBeNull();
    expect(bos.hatalar.satirlar.s0.tutar).toBe(GOC_TUTAR_HATASI);
    const r = duzenle(k, [m], m, [satir({ tutar: "100.000", hesapId: 51 })]);
    expect(r.guncellenen).toMatchObject({ id: 900, tamKapatir: false, tutar: 100000, hesapId: 51, kaynak: "goc", gocKaynak: "kalem:1" });
  });
});

describe("Spec 0073 E: türev etkiler ve ortak yazma yolu", () => {
  it("AC-20 / R16: düzenlemeden sonra bakiye ve ödeme durumu türetilerek değişir", () => {
    const k = normal();
    const m = { id: 900, tur: "odeme", tarih: "2026-09-12", tutar: 100000, yontem: "Havale", hesapId: 51, giderId: 1 };
    const once = hesapBakiyeleri(H, [m], {}).get("51").bakiyeK;
    const g = duzenle(k, [m], m, [satir({ tutar: "60.000" })]).guncellenen;
    let durum = [m];
    odemeGirisiYaz({ guncellenenler: [g] }, { setHesapHareketleri: (f) => { durum = f(durum); }, uid });
    expect(hesapBakiyeleri(H, durum, {}).get("51").bakiyeK).toBe(once + 4000000);
    expect(odemeDurumu(zengin(k, durum))).toBe("kismen");
  });
  it("AC-29: üç silme kapısı ortak yazma yolunu kullanır; kendi filtrelerini yazmaz (kaynak taraması)", () => {
    const dosyalar = ["src/components/Giderler.jsx", "src/components/Dashboard.jsx", "src/components/Kasa.jsx", "src/components/kasa/CalisanAvanslari.jsx"];
    for (const f of dosyalar) {
      const s = readFileSync(f, "utf8");
      expect(s, f).not.toMatch(/setHesapHareketleri\(\s*p\s*=>\s*\(?\s*p\s*\|\|\s*\[\]\s*\)?\s*\.filter|setHesapHareketleri\(\s*p\s*=>\s*p\.filter/);
      expect(s, f).toMatch(/odemeGirisiYaz\(\{\s*silinenler/);
    }
    let durum = [{ id: 1, tur: "avans" }, { id: 2, tur: "virman" }];
    odemeGirisiYaz({ silinenler: [1] }, { setHesapHareketleri: (f) => { durum = f(durum); }, uid });
    expect(durum.map(m => m.id)).toEqual([2]);
  });
});

describe("Spec 0073 F: kapsam sınırları", () => {
  it("AC-31: doğrulayıcı imzaları değişmedi", () => {
    const s = readFileSync("src/lib/kasa.js", "utf8");
    expect(s).toContain("export const odemeDogrula = (form, { kalem, turMap, hesaplar = [], ciro = false, kendiCek = false } = {}) => {");
    expect(s).toContain("export const cokluOdemeDogrula = (form, { kalem, turMap, hesaplar = [], hedefAdi = (id) => (id == null ? \"Kalem\" : \"Taksit\") } = {}) => {");
    expect(s).toContain("export const virmanDogrula = (form, hesaplar = []) => {");
    expect(s).toContain("export const mahsupDogrula = (form, { kalem, turMap, hareketler = [], giderler = [], bugun = null, yururlukAy = null } = {}) => {");
    expect(s).toContain("export const avansDogrula = (form, { calisanlar = [], hesaplar = [] } = {}) => {");
  });
  it("AC-24: ekleme ve düzenleme aynı pencere ve aynı doğrulama fonksiyonu (kaynak taraması)", () => {
    const kasa = readFileSync("src/components/Kasa.jsx", "utf8");
    expect(kasa).toMatch(/<VirmanFormu[^>]*hareket=\{duzenlenecek\}/);
    expect(kasa).toMatch(/<AvansFormu[^>]*hareket=\{duzenlenecek\}/);
    expect(kasa).toMatch(/<OdemeKayitPenceresi[\s\S]*?duzenlenen=\{duzenlenecek\}/);
    expect(kasa).not.toMatch(/const \w*Duzenle\w*Formu\s*=/); // ayrı düzenleme formu yok
    const pencere = readFileSync("src/components/gider/OdemeKayitPenceresi.jsx", "utf8");
    expect(pencere).toMatch(/odemeGirisiHazirla\(kalem, \{[^}]*kip: "duzenle"/);
  });
  it("AC-25: yeni izin, sunucu kuralı ve DB sütunu yok", () => {
    const yasak = new RegExp("kasa_hareketi|hareket_duzenle|hareket_hedef");
    const dosyalar = ["electron/serverAuth.cjs", "electron/db.cjs", "src/components/settings/serverPermissionDefs.js"];
    for (const f of dosyalar) expect(readFileSync(f, "utf8"), f).not.toMatch(yasak);
  });
  it("AC-19 / AC-39: ödeme ve mahsup kasa_hareketi, virman ve avans kendi entity'sinde; 'odeme' entity'si kullanılmaz", () => {
    expect(HAREKET_ENTITY).toEqual({ odeme: "kasa_hareketi", mahsup: "kasa_hareketi", virman: "virman", avans: "avans" });
    expect(readFileSync("src/components/settings/SettingsAuditLog.jsx", "utf8")).toMatch(/kasa_hareketi: "Kasa Hareketi"/);
    // geriAl haritası (Settings.jsx) kasa_hareketi'ne bir geri alma bağlamaz.
    expect(readFileSync("src/components/Settings.jsx", "utf8")).not.toMatch(/kasa_hareketi/);
  });
  it("AC-40 (R24): çakışma birleştirmesinde başka PC'de doğmuş hareketin düzenlemesi kaybolur; ekleme ve silme korunur", () => {
    clearMintedIds();
    setIdCounter(1000);
    const sunucu = { hesapHareketleri: [{ id: 50, tur: "odeme", tarih: "2026-09-12", tutar: 1000, hesapId: 51, giderId: 1 }] };
    const benim = { hesapHareketleri: [{ id: 50, tur: "odeme", tarih: "2026-09-12", tutar: 900, hesapId: 51, giderId: 1 },
      { id: 60, tur: "odeme", tarih: "2026-09-13", tutar: 10, hesapId: 51, giderId: 1 }] };
    const plan = buildMergePlan(benim, sunucu);
    // Düzenleme yeniden uygulanmaz (sunucunun kopyası kalır), ekleme korunur.
    expect(plan.adds.hesapHareketleri.map(m => m.id)).toEqual([60]);
    // Silme: yerelde olmayan sunucu satırı birleştirme planına girmez (yeniden eklenmez).
    const silindi = buildMergePlan({ hesapHareketleri: [] }, sunucu);
    expect(silindi.adds.hesapHareketleri).toEqual([]);
  });
  it("AC-40 (triyaj bulgu 1): bu oturumda üretilip düzenlenen hareket birleştirmede ikinci kez (yeni kimlikle) eklenmez", () => {
    clearMintedIds();
    setIdCounter(1000);
    const id = uygUid(); // bu oturumda üretilmiş kimlik
    const sunucu = { hesapHareketleri: [{ id, tur: "odeme", tarih: "2026-09-12", tutar: 1000, hesapId: 51, giderId: 1 }] };
    const benim = { hesapHareketleri: [{ id, tur: "odeme", tarih: "2026-09-12", tutar: 900, hesapId: 51, giderId: 1 }] };
    const plan = buildMergePlan(benim, sunucu);
    expect(plan.adds.hesapHareketleri).toEqual([]); // çift ödeme yok; düzenleme sunucu kopyasına yenilir (R24)
    // Emsal korunur: başka bölümde bu oturumda üretilmiş, içeriği farklı kayıt bugünkü gibi yeni kimlikle eklenir.
    const m = buildMergePlan({ customers: [{ id, name: "B" }] }, { customers: [{ id, name: "A" }] });
    expect(m.adds.customers).toHaveLength(1);
    expect(m.adds.customers[0].id).not.toBe(id);
  });
});

describe("Spec 0073: dosya kapsamı", () => {
  it("R14: düzenleme pencerelerini açan dosyalar kilit kapsam listesinde", () => {
    const s = readFileSync("src/lib/kilitAlanlari.js", "utf8");
    for (const f of ["src/components/Kasa.jsx", "src/components/kasa/CalisanAvanslari.jsx"]) expect(s).toContain(f);
    // Yardımcı: kaynak ağacında başka bir "hareket düzenle" bileşeni doğmadı.
    const tara = (d) => readdirSync(d).flatMap(x => { const p = join(d, x); return statSync(p).isDirectory() ? tara(p) : [p]; });
    expect(tara("src/components").filter(p => /HareketDuzenle/i.test(p))).toEqual([]);
  });
});
