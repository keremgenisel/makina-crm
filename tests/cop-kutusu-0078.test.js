// Spec 0078: kasa ve gider kayıtları çöp kutusunda. Saf kurallar ve kaynak taramaları; ekran ve gerçek App
// `ui/cop-kutusu-0078`, setter tuzağı `ui/cop-koruma-0078`, sunucu `server-authz` + `server-security.cjs`,
// veritabanı `db-roundtrip.cjs` + `db-clean-install.cjs`.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { withoutDeleted, copuKoru, fmtTR, fmtCur } from "../src/lib/utils";
import { turHaritasi, davranisOf, DAVRANIS, odenecekTutar, odemeleriUygula, standartGiderAyi, standartGruplar, standartGrupSil } from "../src/lib/gider";
import { hesapBakiyeleri, hesapKullanimi, hesapsizOdemeler, hesabiSilinmisMi, kapsamDisiTemizle, copHareketGeriAlmaNedeni, hesapsizOzeti, hesapTasimaPlani } from "../src/lib/kasa";
import { giderKasaRaporu } from "../src/lib/giderRaporu";
import { cekleriUygula, bagliHareketiOlanCekler, bagsizCekSilinebilirMi, hareketleriKaldir, portfoySatirlari, verilenCekSatirlari, ciroIptal, cekDogrula } from "../src/lib/cek";
import { odemeGirisiYaz } from "../src/lib/formOdemesi";
import { yontemKirilimi } from "../src/lib/odemeYontemi";
import * as cop from "../src/lib/copKutusu";
import { KALICI_SILINEN, SILME_KORUNAN, MERGE_KEYS } from "../src/lib/merge";
import { cekEslesmesi } from "../src/lib/aramaGider";

const oku = (f) => readFileSync(f, "utf8");
const Z = "2026-10-07T09:00:00.000Z";
const KIRA = { id: 1, ad: "Fabrika kirası", davranis: "kira" };
const HESAP = { id: 51, ad: "Ziraat", tur: "banka", paraBirimi: "TRY", acilisBakiyesi: 1000, acilisTarihi: "2026-01-01" };
const KALEM = { id: 5, turId: 9, tarih: "2026-09-01", tutar: 1000, kdvOrani: 0, modelSatirlari: [] };
const TUR_NORMAL = { id: 9, ad: "Elektrik", davranis: "normal" };
const ODEME = { id: 71, tur: "odeme", tarih: "2026-09-05", tutar: 400, yontem: "Havale", hesapId: 51, giderId: 5 };

describe("Spec 0078 A: kapsam ve veri", () => {
  it("AC-35: KALICI_SILME_NOTU ve KALICI_SILINEN_BOLUMLER kaldırıldı; kaynakta hiçbir dosya onları ya da bilgi satırını anmıyor", () => {
    expect(cop.KALICI_SILME_NOTU).toBeUndefined();
    expect(cop.KALICI_SILINEN_BOLUMLER).toBeUndefined();
    const dosyalar = ["src/components/Kasa.jsx", "src/components/settings/SettingsGiderTanimlari.jsx", "src/components/settings/GiderTurManager.jsx",
      "src/components/kasa/HesapSilPenceresi.jsx", "src/components/cek/CekPortfoyu.jsx", "src/components/gider/StandartGiderler.jsx", "src/components/Settings.jsx",
      "src/components/settings/SettingsTrash.jsx"];
    for (const f of dosyalar) expect(oku(f), f).not.toMatch(/KALICI_SILME_NOTU|KALICI_SILINEN_BOLUMLER|kalici-silme-notu|çöp kutusuna gitmez/);
  });
  it("AC-29, AC-50 (kaynak): göç yok; TABLES_WITH_TRASH beş yeni tabloyla yirmi üç; kasaKapsamDisi çöp kutusuna alınmadı (AC-33)", () => {
    const db = oku("electron/db.cjs");
    const m = db.match(/const TABLES_WITH_TRASH = \[([\s\S]*?)\];/);
    const tablolar = [...m[1].matchAll(/"([a-z_]+)"/g)].map(x => x[1]);
    expect(tablolar).toHaveLength(23);
    for (const t of ["hesap_hareketleri", "cekler", "gider_tanimlari", "standart_giderler", "kasa_hesaplari"]) expect(tablolar, t).toContain(t);
    expect(tablolar).not.toContain("kasa_kapsam_disi");
    expect(db).not.toMatch(/0078.*[Gg]oc|Gocu0078/);
  });
  it("AC-33: kapsam dışı girişi çöp kutusuna girmez; 'kapsama al' girişi bugünkü gibi diziden çıkarır", () => {
    expect(KALICI_SILINEN.has("kasaKapsamDisi")).toBe(true);
    expect(oku("src/components/settings/SettingsTrash.jsx")).not.toMatch(/kasaKapsamDisi/);
    expect(oku("src/components/Kasa.jsx")).toMatch(/setKasaKapsamDisi\(p => [^\n]*filter/);
  });
});

describe("Spec 0078 B: canlı dizi tek yerde (App)", () => {
  const app = oku("src/App.jsx");
  it("AC-13, AC-36: dört canlı türetme App'te bir kez; null kapısı ham diziyi okur, canlı türetme hareketListesi'nin üstünde", () => {
    expect(app).toMatch(/const hareketBolumuVar = Array\.isArray\(hesapHareketleri\);/);
    expect(app).toMatch(/const canliHareketler\s+= useMemo\(\(\) => withoutDeleted\(hareketListesi\), \[hareketListesi\]\);/);
    expect(app).toMatch(/const odemeHareketleri\s+= hareketBolumuVar \? canliHareketler : null;/);
    for (const [ad, ham] of [["canliGiderTanimlari", "giderTanimlari"], ["canliStandartGiderler", "standartGiderler"], ["canliKasaHesaplari", "kasaHesaplari"]]) {
      expect(app.match(new RegExp(`const ${ad} = useMemo\\(\\(\\) => withoutDeleted\\(${ham}\\)`, "g")), ad).toHaveLength(1);
    }
  });
  it("AC-37 (revizyon 2 ölçümü): otuz prop geçişinden on dördü canlı, on altısı ham (Ayarlar 4, giderTurleri 6, cekler 6)", () => {
    const say = (re) => (app.match(re) || []).length;
    const canli = say(/hesapHareketleri=\{(?:giderYetki \? )?(?:canliHareketler|odemeHareketleri)/g) + say(/giderTanimlari=\{(?:giderYetki \? )?canliGiderTanimlari/g)
      + say(/standartGiderler=\{(?:giderYetki \? )?canliStandartGiderler/g) + say(/kasaHesaplari=\{(?:kasaYetki \? )?canliKasaHesaplari/g);
    expect(canli).toBe(14);
    const ham = say(/hesapHareketleri=\{hesapHareketleri\}/g) + say(/giderTanimlari=\{giderTanimlari\}/g) + say(/standartGiderler=\{standartGiderler\}/g)
      + say(/kasaHesaplari=\{kasaHesaplari\}/g) + say(/giderTurleri=\{(?:giderYetki \? )?giderTurleri/g) + say(/cekler=\{(?:kasaYetki \? )?(?:cekler|ceklerBagli)/g);
    expect(ham).toBe(16);
  });
  it("AC-14, R37: dört bölümün ham adı ekran geçişinde yalnız Ayarlar'da; App'in kendi hesapları canlı diziyi okur", () => {
    const ayarlar = app.slice(app.indexOf('{activeTab === "settings"'));
    const ekranlar = app.slice(app.indexOf('<GlobalSearch'), app.indexOf('{activeTab === "settings"'));
    expect(ekranlar).not.toMatch(/(?:hesapHareketleri|giderTanimlari|standartGiderler|kasaHesaplari)=\{(?:giderYetki \? |kasaYetki \? )?(?:hesapHareketleri|hareketListesi|giderTanimlari|standartGiderler|kasaHesaplari)\b/);
    expect(ayarlar).toMatch(/hesapHareketleri=\{hesapHareketleri\}/);
    expect(app).toMatch(/odemeleriUygula\(giderler, odemeHareketleri, giderTurMap\)/);
    expect(app).toMatch(/hareketler: canliHareketler, turler: giderTurleri/);
    expect(app).toMatch(/hesaplar: canliKasaHesaplari, cekler: canliCekler/);
    expect(app).toMatch(/standartGiderler: canliStandartGiderler/);
    expect(app).toMatch(/kapsamDisiTemizle\(kasaKapsamDisi, canliHareketler, \{[^}]*\}, canliKasaHesaplari\)/);
    // Tasarım istisnası (R11, R12, C2): giderTurleri ve cekler ham kalır; gizleme gösterim noktasında.
    expect(app).not.toMatch(/withoutDeleted\(giderTurleri\)/);
  });
  it("R7, AC-36: bölümü göndermeyen sunucuda (null) canlı dizi boş, ödeme hareketi null kalır (ödeme durumu saklı işaretten)", () => {
    const hareketListesi = [];
    expect(withoutDeleted(null)).toEqual([]); // naif türetme kapıyı bozardı
    const kalem = { ...KALEM, odendi: true };
    expect(odemeleriUygula([kalem], null, turHaritasi([TUR_NORMAL]))[0].odendi).toBe(true);
    expect(withoutDeleted(hareketListesi)).toEqual([]);
  });
});

describe("Spec 0078 C: okuma anında çözüm", () => {
  it("AC-16: çöpteki kira türüne bağlı kalem kira kalır (stopaj, ödenecek ve kova değişmez); harita ham listeden", () => {
    const kalem = { id: 6, turId: 1, tarih: "2026-09-01", tutar: 10000, kdvOrani: 0, girisYonu: "brut", stopajOrani: 20, modelSatirlari: [] };
    const canliHarita = turHaritasi([KIRA]), copluHarita = turHaritasi([{ ...KIRA, deletedAt: Z }]);
    expect(davranisOf(kalem, copluHarita)).toBe(DAVRANIS.KIRA);
    expect(odenecekTutar(kalem, davranisOf(kalem, copluHarita))).toBe(odenecekTutar(kalem, davranisOf(kalem, canliHarita)));
    expect(davranisOf(kalem, turHaritasi(withoutDeleted([{ ...KIRA, deletedAt: Z }])))).toBe(DAVRANIS.NORMAL); // naif süzme davranışı bozardı
  });
  it("AC-39: turHaritasi hiçbir yerde withoutDeleted ile kurulmaz; tür yalnız beş gösterim yerinde gizlenir", () => {
    const dosyalar = ["src/App.jsx", "src/components/Giderler.jsx", "src/components/GiderForm.jsx", "src/components/gider/DonemRaporu.jsx", "src/components/Kasa.jsx",
      "src/components/Dashboard.jsx", "src/components/GlobalSearch.jsx", "src/lib/aramaGider.js", "src/lib/giderRaporu.js", "src/components/settings/SettingsTrash.jsx"];
    for (const f of dosyalar) if (existsSync(f)) expect(oku(f), f).not.toMatch(/turHaritasi\(\s*withoutDeleted/);
    expect(oku("src/components/GiderForm.jsx")).toMatch(/giderTurleri\.filter\(t => !t\.deletedAt \|\| String\(t\.id\) === String\(form\.turId\)\)/);
    expect(oku("src/components/settings/SettingsGiderTanimlari.jsx")).toMatch(/giderTurleri\.filter\(t => !t\.deletedAt \|\| String\(t\.id\) === String\(form\.turId\)\)/);
    expect(oku("src/components/gider/DonemRaporu.jsx")).toMatch(/Tüm türler<\/option>\{giderTurleri\.filter\(t => !t\.deletedAt\)/);
    expect(oku("src/components/settings/GiderTurManager.jsx")).toMatch(/const giderTurleri = tumTurler\.filter\(t => !t\.deletedAt\);/);
  });
  it("AC-17: çöpteki çeke bağlı tahsilatın zenginleştirmesi (gelir tanıma) değişmez; cekleriUygula çöptekini de görür", () => {
    const pay = { id: 900, customerId: 1, tarih: "2026-09-01", tutar: 500, currency: "TRY", yontem: "Çek" };
    const cek = { id: 30, paymentId: 900, no: "1", banka: "Z", durum: "tahsil", gecmis: [{ tarih: "2026-09-10", durum: "tahsil" }] };
    const a = cekleriUygula([pay], [cek])[0]._cek, b = cekleriUygula([pay], [{ ...cek, deletedAt: Z }])[0]._cek;
    expect(b?.durum).toBe("tahsil");
    expect(b).toEqual(a);
  });
  it("AC-11, R36: çöpteki çek portföyde, verilen çeklerde, aramada ve yinelenen uyarısında görünmez", () => {
    const alinan = { id: 30, paymentId: null, yon: "alinan", no: "1", banka: "Z", tutar: 5, currency: "TRY", vadeTarihi: "2026-10-10", durum: "portfoy", gecmis: [] };
    const verilen = { id: 31, paymentId: null, yon: "verilen", no: "2", banka: "Z", tutar: 5, vadeTarihi: "2026-10-10", durum: "yazildi", hesapId: 51, gecmis: [] };
    expect(portfoySatirlari([alinan], []).satirlar).toHaveLength(1);
    expect(portfoySatirlari([{ ...alinan, deletedAt: Z }], []).satirlar).toHaveLength(0);
    expect(verilenCekSatirlari([{ ...verilen, deletedAt: Z }]).satirlar).toHaveLength(0);
    expect(cekEslesmesi({ ...alinan, deletedAt: Z }, "Z")).toBeNull();
    expect(cekDogrula({ no: "1", banka: "Z", tur: "hamiline" }, { cekler: [{ ...alinan, deletedAt: Z }] }).uyari).toBeNull();
    expect(cekDogrula({ no: "1", banka: "Z", tur: "hamiline" }, { cekler: [alinan] }).uyari).toMatch(/Aynı banka/);
  });
  it("AC-10: çöpteki ödeme canlı girdide hiçbir bakiyeye, ödeme durumuna ve yöntem kırılımına girmez", () => {
    const turMap = turHaritasi([TUR_NORMAL]);
    const ham = [ODEME, { ...ODEME, id: 72, tutar: 300, deletedAt: Z }];
    const canli = withoutDeleted(ham);
    const bakiye = hesapBakiyeleri([HESAP], canli, {}).get("51");
    expect(bakiye.bakiyeK).toBe(100000 - 40000);
    const k = odemeleriUygula([KALEM], canli, turMap)[0];
    expect(k._odenen?.ana ?? k.taksitler?.[0]?._odenenK).toBeDefined();
    expect(odemeleriUygula([KALEM], canli, turMap)).toEqual(odemeleriUygula([KALEM], [ODEME], turMap));
    expect(yontemKirilimi(KALEM, canli, turMap)).toEqual(yontemKirilimi(KALEM, [ODEME], turMap));
    expect(hesapsizOdemeler(withoutDeleted([{ ...ODEME, hesapId: null, deletedAt: Z }])).adet).toBe(0);
  });
  it("AC-18, AC-43: çöpteki hesaba bağlı hareket 'hesabı silinmiş' olarak hesapsız listesinde; parametresiz çağrı eski çıktı", () => {
    const canliHesaplar = withoutDeleted([{ ...HESAP, deletedAt: Z }]);
    expect(hesabiSilinmisMi(ODEME, canliHesaplar)).toBe(true);
    expect(hesapsizOdemeler([ODEME], null, null, canliHesaplar).adet).toBe(1);
    expect(hesapsizOdemeler([ODEME]).adet).toBe(0);
    expect(hesapsizOdemeler([ODEME], null, null, [HESAP]).adet).toBe(0);
  });
  it("AC-40, R13: bütün hareketleri çöpte olan hesap canlı girdiyle kullanılmıyor sayılır (silinebilir)", () => {
    const ham = [{ ...ODEME, deletedAt: Z }];
    expect(hesapKullanimi(51, ham, {})).toBeGreaterThan(0);
    expect(hesapKullanimi(51, withoutDeleted(ham), {})).toBe(0);
    expect(oku("src/components/Kasa.jsx")).toMatch(/cekler: withoutDeleted\(cekler\)/);
  });
  it("AC-41, R14: çöpteki harekete bağlı kapsam dışı girişi istemcide temizlenir (canlı hareket girdisi)", () => {
    const g = { id: 801, tur: "hareket", kaynak: null, kayitId: 71, zaman: Z };
    const h = { ...ODEME, hesapId: null };
    expect(kapsamDisiTemizle([g], withoutDeleted([{ ...h, deletedAt: Z }]), {}, [HESAP])).toEqual([]);
    expect(kapsamDisiTemizle([g], [h], {}, [HESAP])).toEqual([g]);
  });
  it("AC-20, AC-42, R38: çöpteki sürüm ay hesabına girmez; grubun bütün sürümleri çöpteyse grup yok ve tutar sıfır", () => {
    const l = [{ id: 1, grupId: 1, ad: "Kira", tutar: 100, baslangicAy: "2026-01", bitisAy: null }, { id: 2, grupId: 2, ad: "Aidat", tutar: 50, baslangicAy: "2026-01", bitisAy: null }];
    const silindi = standartGrupSil(l, 1, Z).liste;
    expect(silindi.find(s => s.id === 1).deletedAt).toBe(Z);
    expect(silindi).toHaveLength(2); // kayıt diziden çıkmaz
    const canli = withoutDeleted(silindi);
    expect(standartGiderAyi(canli, "2026-09").toplam).toBe(50);
    expect(standartGruplar(canli, "2026-09").map(g => g.grupId)).toEqual([2]);
    const gruplar = cop.standartCopGruplari(silindi);
    expect(gruplar).toEqual([expect.objectContaining({ grupId: 1, deletedAt: Z, ad: "Kira" })]);
    expect(cop.standartGeriAlmaCakismasi(gruplar[0], silindi)).toBeNull();
    expect(cop.standartGeriAlmaCakismasi(gruplar[0], [...silindi, { id: 3, grupId: 3, ad: "kira", baslangicAy: "2026-09" }])).toMatch(/adında bir standart gider zaten var/);
    expect(cop.standartGeriAlmaCakismasi(gruplar[0], [...silindi, { id: 4, grupId: 1, ad: "Kira 2", baslangicAy: "2026-09" }])).toMatch(/canlı bir sürümü/);
  });
});

describe("Spec 0078 D: geri alma, kalıcı silme, çek koruması", () => {
  it("AC-9, AC-44, R21: çeke bağlı CANLI hareketi olan çek korunur; çöpteki hareket korumaz; üç yol aynı yardımcıyı okur", () => {
    const h = { id: 1, tur: "odeme", tutar: 5, cekId: 30, giderId: 5 };
    expect(bagliHareketiOlanCekler([h]).has("30")).toBe(true);
    expect(bagliHareketiOlanCekler([{ ...h, deletedAt: Z }]).has("30")).toBe(false);
    const trash = oku("src/components/settings/SettingsTrash.jsx"), app = oku("src/App.jsx");
    expect(trash).toMatch(/const korunanCekler = bagliHareketiOlanCekler\(hareketler\)/);
    expect(trash).toMatch(/if \(korunanCekler\.has\(String\(c\.id\)\)\) \{ showToast/); // satır
    expect(trash).toMatch(/setCekler\(p => p\.filter\(x => !x\.deletedAt \|\| korunanCekler\.has/); // boşalt
    expect(app).toMatch(/const korunan = bagliHareketiOlanCekler\(data\.hesapHareketleri\); data\.cekler = purgeOldTrash\(data\.cekler, undefined, c => korunan\.has/); // 30 gün
  });
  it("AC-8, R22: altı bölüm için ayrı 30 günlük temizlik çağrısı (toplam yirmi yedi)", () => {
    const app = oku("src/App.jsx");
    expect((app.match(/purgeOldTrash\(/g) || []).length).toBe(27);
    for (const b of ["hesapHareketleri", "cekler", "giderTanimlari", "giderTurleri", "standartGiderler", "kasaHesaplari"]) expect(app, b).toMatch(new RegExp(`data\\.${b} = purgeOldTrash\\(data\\.${b}`));
  });
  it("R35: bağsız çek, çeke bağlı canlı hareket varken silinemez (ödenmiş/yazılmış verilen çek)", () => {
    const c = { id: 31, paymentId: null, yon: "verilen", durum: "odendi" };
    expect(bagsizCekSilinebilirMi(c)).toBe(true); // eski imza
    expect(bagsizCekSilinebilirMi(c, [{ id: 1, tur: "odeme", cekId: 31 }])).toBe(false);
    expect(bagsizCekSilinebilirMi(c, [{ id: 1, tur: "odeme", cekId: 31, deletedAt: Z }])).toBe(true);
  });
  it("R2, R34: ortak yazım silineni damgalar; çeke bağlı hareket çöpe girmez (kalıcı çıkar); çek işlemleri tam diziden çıkarır", () => {
    let d = [{ id: 1, tur: "odeme" }, { id: 2, tur: "odeme", cekId: 30 }, { id: 3, tur: "odeme", deletedAt: Z }];
    odemeGirisiYaz({ silinenler: [1, 2] }, { setHesapHareketleri: (f) => { d = f(d); }, uid: () => 9 });
    expect(d.map(h => h.id)).toEqual([1, 3]);
    expect(d[0].deletedAt).toBeTruthy();
    const cek = { id: 30, durum: "ciro", gecmis: [] };
    const tam = [{ id: 5, cekId: 30 }, { id: 6, deletedAt: Z }, { id: 7 }];
    const r = ciroIptal(cek, withoutDeleted(tam), "2026-10-01");
    expect(r.silinen.map(h => h.id)).toEqual([5]);
    expect(hareketleriKaldir(tam, r.silinen).map(h => h.id)).toEqual([6, 7]); // çöpteki 6 korunur
    const cp = oku("src/components/cek/CekPortfoyu.jsx");
    expect(cp).not.toMatch(/setHesapHareketleri\(\(\) => r\.hareketler\)/);
    expect((cp.match(/setHesapHareketleri\(p => hareketleriKaldir\(p, r\.silinen\)\)/g) || []).length).toBe(3);
  });
  it("R9: hesaplanmış canlı sonuç tam diziye yazılırken çöptekiler korunur (copuKoru); iki yerde kullanılır", () => {
    expect(copuKoru([{ id: 1 }], [{ id: 1 }, { id: 2, deletedAt: Z }])).toEqual([{ id: 1 }, { id: 2, deletedAt: Z }]);
    expect(oku("src/components/gider/StandartGiderler.jsx")).toMatch(/setStandartGiderler\(p => copuKoru\(r\.liste, p\)\)/);
    expect(oku("src/components/Giderler.jsx")).toMatch(/setGiderTanimlari\(p => copuKoru\(u\.guncelTanimlar, p\)\)/);
  });
  it("AC-6, AC-46, R24: satır etiketleri sabit eşlemeden; kalem, tedarikçi, çalışan adı ve keşideci geçmez", () => {
    expect(cop.HAREKET_COP_TUR).toEqual({ odeme: "Ödeme", virman: "Virman", avans: "Avans", mahsup: "Avanstan mahsup" });
    const h = { id: 1, tur: "avans", tarih: "2026-09-05", tutar: 1500, calisanId: 7, calisanAd: "Ahmet Yılmaz", aciklama: "Ahmet'e avans" };
    expect(cop.hareketCopEtiketi(h)).toBe(`${fmtTR("2026-09-05")} · ${fmtCur(1500, "TRY")}`);
    expect(cop.hareketCopEtiketi(h)).not.toMatch(/Ahmet/);
    expect(cop.cekCopEtiketi({ banka: "Ziraat", no: "123", kesideci: "Ali Veli" })).toBe("Ziraat · 123");
    const turMap = turHaritasi([{ id: 1, ad: "Personel", davranis: "personel" }, TUR_NORMAL]);
    expect(cop.tanimCopEtiketi({ turId: 1, ad: "Ahmet Yılmaz", calisanId: 7 }, turMap)).toBe("Personel");
    expect(cop.tanimCopEtiketi({ turId: 9, ad: "İnternet" }, turMap)).toBe("Elektrik · İnternet");
    expect(cop.hesapCopEtiketi(HESAP)).toBe("Ziraat · Banka");
  });
});

describe("Spec 0078 triyaj (bulgu 1): çöpten geri alınan ödeme ve mahsup doğrulanır", () => {
  const turMap = turHaritasi([TUR_NORMAL, { id: 2, ad: "Personel", davranis: "personel" }]);
  it("yeniden girilmiş ödemenin çöpteki kopyası geri alınamaz (kalem fazla ödenirdi); kalan yeterliyse geri alınır", () => {
    const kalem = { ...KALEM, tutar: 1000 };
    const A = { ...ODEME, id: 81, tutar: 1000, deletedAt: Z }, B = { ...ODEME, id: 82, tutar: 1000 };
    expect(copHareketGeriAlmaNedeni(A, { giderler: [kalem], hareketler: [A, B], turMap })).toMatch(/^Geri alınamadı: Kalandan fazla ödeme/);
    expect(copHareketGeriAlmaNedeni(A, { giderler: [kalem], hareketler: [A], turMap })).toBeNull();
    expect(copHareketGeriAlmaNedeni(A, { giderler: [], hareketler: [A, B], turMap })).toBeNull(); // kalem kalıcı silinmiş: engellenmez
  });
  it("mahsup açık avansı aşıyorsa geri alınamaz (avans borcu eksiye düşerdi)", () => {
    const maas = { id: 6, turId: 2, calisanId: 7, tarih: "2026-09-01", resmiTutar: 5000, eldenTutar: null, modelSatirlari: [] };
    const avans = { id: 90, tur: "avans", tarih: "2026-09-02", tutar: 1000, calisanId: 7, hesapId: 51 };
    const M1 = { id: 91, tur: "mahsup", tarih: "2026-09-03", tutar: 1000, calisanId: 7, giderId: 6, deletedAt: Z };
    const M2 = { id: 92, tur: "mahsup", tarih: "2026-09-04", tutar: 1000, calisanId: 7, giderId: 6 };
    const ctx = { giderler: [maas], turMap, bugun: "2026-09-30", yururlukAy: "2026-01" };
    expect(copHareketGeriAlmaNedeni(M1, { ...ctx, hareketler: [avans, M1, M2] })).toMatch(/Açık avans borcundan fazla mahsup/);
    expect(copHareketGeriAlmaNedeni(M1, { ...ctx, hareketler: [avans, M1] })).toBeNull();
  });
  it("Çöp Kutusu'nun geri alması bu denetimi çağırır", () => {
    expect(oku("src/components/settings/SettingsTrash.jsx")).toMatch(/const neden = copHareketGeriAlmaNedeni\(h,/);
  });
});

describe("Spec 0078 triyaj (bulgu 2): rapor ve ekran 'hesabı silinmiş' hareketi aynı sayar", () => {
  it("hesabı çöpte olan ödeme Kasa'nın hesapsız listesinde de Aylık Gider ve Kasa Raporu'nda da hesapsız sayılır", () => {
    const hesaplar = withoutDeleted([HESAP, { ...HESAP, id: 52, ad: "Eski", deletedAt: Z }]);
    const hareketler = [{ ...ODEME, id: 75, hesapId: 52, tarih: "2026-09-05" }];
    const ekran = hesapsizOzeti(hareketler, {}, hesaplar);
    const rapor = giderKasaRaporu({ giderler: [KALEM], hareketler, turler: [TUR_NORMAL], hesaplar, yururlukAy: "2026-01" }, "2026-09");
    expect(ekran.odeme.adet).toBe(1);
    expect(rapor.kasa.hesapsiz.odemeAdet).toBe(ekran.odeme.adet);
    expect(oku("src/lib/giderRaporu.js")).toMatch(/hesapsizOdemeler\(g\.hareketler, aralik, g\.kasaKapsamDisi, g\.hesaplar\)/);
  });
});

describe("Spec 0078 triyaj (bulgu 3, 4): sürüm notu ve hesap taşımasında çöpteki virman", () => {
  it("bulgu 4: A çöpe atılıp B'ye taşınırken çöpteki A↔B virmanı B↔B olmaz (yerinde kalır); canlı hareket taşınır", () => {
    const H = (id) => ({ id, ad: `H${id}`, tur: "banka", paraBirimi: "TRY", kapali: false });
    const copV = { id: 1, tur: "virman", tarih: "2026-09-01", tutar: 5, hesapId: 51, karsiHesapId: 52, deletedAt: Z };
    const odeme = { id: 2, tur: "odeme", tarih: "2026-09-02", tutar: 3, hesapId: 51, giderId: 5 };
    const plan = hesapTasimaPlani(H(51), [odeme], {}, [H(51), H(52)], { hesapAdi: (id) => `H${id}`, tarihYaz: (t) => t });
    const sonuc = plan.guncelle(52).hesapHareketleri([copV, odeme]);
    expect(sonuc[0]).toEqual(copV);
    expect(sonuc[1].hesapId).toBe(52);
    // Çöpte olmayan başka bir hesaba giden çöpteki virman taşınır (S8).
    expect(plan.guncelle(52).hesapHareketleri([{ ...copV, karsiHesapId: 53 }])[0].hesapId).toBe(52);
  });
  it("bulgu 7: spec'in AC-37'si uygulamanın ölçtüğü 14 / 16'yı söyler", () => {
    const spec = ["specs/0078-kasa-ve-gider-kayitlari-cop-kutusuna.md", "specs/done/0078-kasa-ve-gider-kayitlari-cop-kutusuna.md"].find(existsSync);
    const ac = oku(spec).split("- **AC-37.**")[1].split("- **AC-")[0];
    expect(ac).toMatch(/\*\*on dördü\*\* canlı/);
    expect(ac).toMatch(/\*\*on altısı\*\* ham/);
  });
  it("bulgu 3: sürüm notu güncellenmemiş istemcinin çöpü canlı göstereceğini ve silmeme uyarısını yazar", () => {
    const plan = ["specs/0078-uygulama-plani.md", "specs/done/0078-uygulama-plani.md"].find(existsSync);
    const not = oku(plan).split("## 7. Sürüm notu")[1];
    expect(not).toMatch(/eski sürümlerde\s+> çöpteki ödemeler canlı görünür/);
    expect(not).toMatch(/kasa ve gider kaydı silmeyin/);
  });
});

describe("Spec 0078 F: 0077 ile ilişki", () => {
  it("R30, AC-30 (kaynak): altı bölüm KALICI_SILINEN'den çıktı, silme koruması ve taban kuralı onları kapsar", () => {
    expect([...KALICI_SILINEN].sort()).toEqual(["kasaKapsamDisi", "partStockLog"]);
    for (const b of ["hesapHareketleri", "cekler", "giderTanimlari", "giderTurleri", "standartGiderler", "kasaHesaplari"]) {
      expect(MERGE_KEYS, b).toContain(b);
      expect(SILME_KORUNAN, b).toContain(b);
      expect(oku("src/App.jsx"), b).toMatch(new RegExp(`silmeUygula\\(set\\w+, "${b}"\\)`));
    }
  });
  it("AC-32: 0077'nin X1 metni güncellendi (altı bölüm kapandı, kapsam dışı ve stok hareketi kaldı)", () => {
    const s = oku("specs/done/0077-kayit-hatasi-ve-kayit-perdesi.md");
    expect(s).toMatch(/0078 ile/);
    expect(s).toMatch(/kasaKapsamDisi/);
  });
});

describe("Spec 0078 DoD: görsel kanıt (triyaj bulgu 6)", () => {
  const rapor = (ad) => JSON.parse(oku(`docs/evidence/${ad}`));
  it("değişen yalnız Gider Türleri ve Çöp Kutusu ekranları; yeni ekran Çöp Kutusu 0078; diğerleri 0 piksel; taban tekrarı 0", () => {
    const r = rapor("0078-piksel-raporu.json");
    const ad = (x) => x.ad.replace(/-(aydinlik|karanlik)\.png$/, "");
    const degisen = [...new Set(r.filter(x => x.piksel > 0).map(ad))].sort();
    expect(degisen).toEqual(["ayarlar-0068-trash", "ayarlar-gidertur", "ayarlar-gidertur-0074", "ayarlar-gidertur-duzenle", "ayarlar-trash"]);
    expect(r.filter(x => x.fark).map(ad)).toEqual(["cop-kutusu-0078", "cop-kutusu-0078"]);
    expect(r.length).toBeGreaterThan(600);
    const t = rapor("0078-taban-piksel-raporu.json");
    expect(t).toHaveLength(12);
    expect(t.every(x => x.piksel === 0)).toBe(true);
  });
});

