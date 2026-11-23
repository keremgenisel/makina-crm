// Spec 0159: satın alınan parçaya fason işlem eklenebilir. Kip geçişinin saf kuralı (iki yön), maliyet geçmişinin kuralı, sipariş motoru
// ve belgesi (bedel bir kez sayılır, adlar), Excel ve kaynak taramaları. Test adları AC-<n> taşır. Kıyas `alim-kalemi-0159-kiyas`'ta.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import * as U from "../src/lib/urunAgaci";
import { KALEM_TUR, TURETILEN_KALEM_ADI } from "../src/lib/maliyetKalemleri";
import { KUR_KAYNAK } from "../src/lib/kur";
import { BELIRSIZ_HATASI } from "../src/lib/tutarGirdisi";
import * as S from "../src/lib/siparisIhtiyaci";
import { siparisRaporuHtml, BELGE_SUTUNLARI } from "../src/lib/siparisRaporu";
import { PARCA_AKTARMA_BASLIKLARI, parcaSatirlariniCoz } from "../src/lib/parcaAktarma";
import { PARCALAR, DIS_YAY, BUGUN, FACTORY, MALZEMELER, TEDARIKCILER, veri } from "./fixtures/0159-veri.js";

const kod = (dosya) => fs.readFileSync(dosya, "utf8").split("\n").filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).map(l => l.replace(/\s\/\/.*$/, "")).join("\n");
const srcDosyalari = (kok) => fs.readdirSync(kok, { withFileTypes: true }).flatMap(d => (d.isDirectory() ? srcDosyalari(`${kok}/${d.name}`) : /\.(js|jsx)$/.test(d.name) ? [`${kok}/${d.name}`] : []));
const ELLE = U.MALIYET_KIP.ELLE; const HESAPLA = U.MALIYET_KIP.HESAPLA;
const elleForm = (o = {}) => ({ _maliyetKipi: ELLE, maliyet: "40", maliyetParaBirimi: "", maliyetKuru: "", _maliyetKurKaynak: KUR_KAYNAK.ELLE, maliyetKalemleri: [], ...o });
const islem = (o = {}) => ({ tur: "islem", _anahtar: "k1", ad: "Parça alımı", tedarikciId: "", tutar: "40", paraBirimi: "", kur: "", _kurKaynak: KUR_KAYNAK.ELLE, ...o });
const hesaplaForm = (kalemler) => ({ _maliyetKipi: HESAPLA, maliyet: "", maliyetKalemleri: kalemler });

describe("Spec 0159 R2: Elle sabit → Hesapla (saf kural)", () => {
  it("AC-2 / AC-3 / AC-24 / AC-29: elle 40 lira ilk kalem olur, adı düzenlenebilir varsayılan; onay yok; elle alanlar temizlenir", () => {
    const k = U.kipGecisi(elleForm(), HESAPLA);
    expect(k.onay).toBe(false);
    expect(k.yama.maliyetKalemleri).toHaveLength(1);
    expect(k.yama.maliyetKalemleri[0]).toMatchObject({ tur: "islem", ad: U.ALIM_KALEMI_VARSAYILAN_ADI, tutar: "40", tedarikciId: "" });
    expect(U.ALIM_KALEMI_VARSAYILAN_ADI).toBe("Parça alımı"); expect(U.ALIM_KALEMI_VARSAYILAN_ADI).not.toBe(TURETILEN_KALEM_ADI);
    expect(k.yama).toMatchObject({ _maliyetKipi: HESAPLA, _maliyetDokunuldu: true, maliyet: "", maliyetParaBirimi: "", maliyetKuru: "" });
    expect(U.kalemlerDogrula(k.yama.maliyetKalemleri).kayit).toEqual([{ tur: "islem", ad: "Parça alımı", tutar: 40 }]);
  });
  it("AC-4 / AC-5: Ana tedarikçi varsa kalemde seçili gelir; yoksa tedarikçisiz ve kayıt geçerli", () => {
    expect(U.kipGecisi(elleForm({ tedarikciId: 22 }), HESAPLA).yama.maliyetKalemleri[0].tedarikciId).toBe("22");
    const k = U.kipGecisi(elleForm(), HESAPLA);
    expect(U.kalemlerDogrula(k.yama.maliyetKalemleri).gecerli).toBe(true);
  });
  it("AC-7: elle maliyeti boş parça boş liste alır, uydurma kalem yok", () => {
    expect(U.kipGecisi(elleForm({ maliyet: "" }), HESAPLA).yama.maliyetKalemleri).toEqual([]);
  });
  it("AC-22 / AC-23: dolar maliyet para birimini, kuru ve kurun kaynağını taşır; lira karşılığı aynı, altı ondalıklı kur reddedilmez", () => {
    const f = elleForm({ maliyet: "120", maliyetParaBirimi: "USD", maliyetKuru: "50,370257", _maliyetKurKaynak: KUR_KAYNAK.TURETILEN });
    const kalem = U.kipGecisi(f, HESAPLA).yama.maliyetKalemleri[0];
    expect(kalem).toMatchObject({ paraBirimi: "USD", kur: "50,370257", _kurKaynak: KUR_KAYNAK.TURETILEN });
    const d = U.kalemlerDogrula([kalem]);
    expect(d.gecerli).toBe(true);
    expect(U.parcaMaliyetKurus({ maliyetKalemleri: d.kayit })).toBe(U.parcaMaliyetKurus({ maliyet: 120, maliyetParaBirimi: "USD", maliyetKuru: 50.370257 }));
  });
  it("AC-25 / AC-26: ham değer taşınır (\"2400\" belirsiz sayılmaz); 0 tutarlı kalem doğar ve toplam 0", () => {
    const k = U.kipGecisi(elleForm({ maliyet: "2400" }), HESAPLA).yama.maliyetKalemleri;
    expect(k[0].tutar).toBe("2400"); expect(U.kalemlerDogrula(k).kayit[0].tutar).toBe(2400);
    const s0 = U.kipGecisi(elleForm({ maliyet: "0" }), HESAPLA).yama.maliyetKalemleri;
    expect(s0[0].tutar).toBe("0");
    expect(U.maliyetKalemleriOzeti(U.kalemlerDogrula(s0).kayit).toplamK).toBe(0);
  });
});

describe("Spec 0159 R3: Hesapla → Elle sabit (saf kural)", () => {
  it("AC-8 / AC-32 / AC-33: tek geçerli işlem kalemi (0 dahil) elle alana taşınır; onay yok, taşıma notu", () => {
    const k = U.kipGecisi(hesaplaForm([islem({ tutar: "40", tedarikciId: "23" })]), ELLE);
    expect(k.onay).toBe(false);
    expect(k.yama).toMatchObject({ maliyet: "40", maliyetKalemleri: [], _tasimaNotu: true, maliyetParaBirimi: "" });
    expect(U.kipGecisi(hesaplaForm([islem({ tutar: "0" })]), ELLE).yama.maliyet).toBe("0");
    expect(k.yama).not.toHaveProperty("tedarikciId"); // Ana tedarikçiye dokunulmaz
    expect(U.TASIMA_NOTU).toMatch(/adı ve tedarikçisi/);
  });
  it("AC-31 / R3/3: geçersiz tutarlı (\"2.400\") kalem taşınmaz, bugünkü onay sürer; taşınan değer doğrulanmış değerin form metni", () => {
    expect(U.kalemlerDogrula([islem({ tutar: "2.400" })]).hatalar[0].tutar).toBe(BELIRSIZ_HATASI);
    expect(U.kipGecisi(hesaplaForm([islem({ tutar: "2.400" })]), ELLE).onay).toBe(true);
    expect(U.kipGecisi(hesaplaForm([islem({ tutar: "1.234,56" })]), ELLE).yama.maliyet).toBe("1234,56");
  });
  it("AC-9 / AC-10 / AC-30 / R3/6: malzeme kalemi, birden çok kalem, eski katalog kalemi ve tutarı boş kalem onay ister", () => {
    expect(U.kipGecisi(hesaplaForm([{ tur: "malzeme", malzemeId: 601, bicim: "mil", cap: 20, boy: 30, adet: "1" }]), ELLE).onay).toBe(true);
    expect(U.kipGecisi(hesaplaForm([islem(), islem({ _anahtar: "k2" })]), ELLE).onay).toBe(true);
    expect(U.kipGecisi(hesaplaForm([islem({ _eskiKatalog: true, _eskiKalem: { tur: "islem", islemId: 9 } })]), ELLE).onay).toBe(true);
    expect(U.kipGecisi(hesaplaForm([islem({ tutar: "" })]), ELLE).onay).toBe(true);
    expect(U.kipGecisi(hesaplaForm([]), ELLE).onay).toBe(false); // boş listeden geçiş (0135 AC-10)
  });
  it("AC-34 / R3/5 / P5: döviz tek kalem para birimini, kuru ve kaynağını geri taşır; kuru eksik döviz de taşınır ve neden işareti bırakır", () => {
    const k = U.kipGecisi(hesaplaForm([islem({ tutar: "2,5", paraBirimi: "EUR", kur: "50", _kurKaynak: KUR_KAYNAK.TURETILEN })]), ELLE);
    expect(k.yama).toMatchObject({ maliyet: "2,5", maliyetParaBirimi: "EUR", maliyetKuru: "50", _maliyetKurKaynak: KUR_KAYNAK.TURETILEN, _tasimaKurEksik: false });
    expect(U.kipGecisi(hesaplaForm([islem({ tutar: "2,5", paraBirimi: "EUR", kur: "" })]), ELLE).yama._tasimaKurEksik).toBe(true);
  });
  it("AC-47: Elle → Hesapla → Elle sonra elle maliyet ve döviz alanları başlangıçtaki gibi", () => {
    const f = elleForm({ maliyet: "120", maliyetParaBirimi: "USD", maliyetKuru: "40", tedarikciId: 22 });
    const h = { ...f, ...U.kipGecisi(f, HESAPLA).yama };
    const e = { ...h, ...U.kipGecisi(h, ELLE).yama };
    expect(U.elleMaliyetDogrula(e.maliyet, e.maliyetParaBirimi, e.maliyetKuru, e._maliyetKurKaynak).alanlar).toEqual({ maliyet: 120, maliyetParaBirimi: "USD", maliyetKuru: 40 });
    expect(e.tedarikciId).toBe(22);
  });
  it("Kip aynıysa karar yok", () => { expect(U.kipGecisi(elleForm(), ELLE)).toBeNull(); });
});

describe("Spec 0159 R5/2: kip geçişi maliyet geçmişine satır yazmaz", () => {
  const gecmis = [{ gecerli: "", kurus: 400000 }, { gecerli: "2026-06-01", kurus: 480000, dovizTutar: 120, kur: 40, paraBirimi: "USD" }];
  it("AC-36: döviz elle maliyetli parça kaleme dönünce (lira aynı) geçmiş değişmez", () => {
    const eski = { id: 1, maliyet: 120, maliyetParaBirimi: "USD", maliyetKuru: 40, maliyetGecmisi: gecmis };
    const yeni = { id: 1, maliyetGecmisi: gecmis, maliyetKalemleri: [{ tur: "islem", ad: "Parça alımı", tutar: 120, paraBirimi: "USD", kur: 40 }] };
    expect(U.parcaMaliyetKurus(yeni)).toBe(U.parcaMaliyetKurus(eski));
    expect(U.maliyetGecmisiYaz(eski, U.parcaMaliyetKurus(yeni), { tarih: "2026-11-01", bugun: BUGUN, yeniKayit: yeni }).gecmis).toEqual(gecmis);
  });
  it("AC-37: lira elle maliyetli parça kaleme dönünce geçmiş değişmez", () => {
    const g = [{ gecerli: "", kurus: 3000 }, { gecerli: "2026-06-01", kurus: 4000 }];
    const eski = { id: 2, maliyet: 40, maliyetGecmisi: g }; const yeni = { id: 2, maliyetGecmisi: g, maliyetKalemleri: [{ tur: "islem", ad: "Parça alımı", tutar: 40 }] };
    expect(U.maliyetGecmisiYaz(eski, U.parcaMaliyetKurus(yeni), { tarih: "2026-11-01", bugun: BUGUN, yeniKayit: yeni }).gecmis).toEqual(g);
  });
  it("R5/2 (triyaj bulgu 1): yok sayma yalnız yeni kayıtta kalem listesi doluyken; elle döviz → elle lira (aynı lira) satır yazar ve iki yön simetrik", () => {
    const eski = { id: 1, maliyet: 120, maliyetParaBirimi: "USD", maliyetKuru: 40, maliyetGecmisi: gecmis };
    const lira = { id: 1, maliyet: 4800, maliyetGecmisi: gecmis };
    expect(U.parcaMaliyetKurus(lira)).toBe(U.parcaMaliyetKurus(eski));
    const r = U.maliyetGecmisiYaz(eski, U.parcaMaliyetKurus(lira), { tarih: "2026-11-01", bugun: BUGUN, yeniKayit: lira }).gecmis;
    expect(r.at(-1)).toEqual({ gecerli: "2026-11-01", kurus: 480000 }); // son satır artık lira
    const ters = U.maliyetGecmisiYaz({ ...lira, maliyetGecmisi: r }, U.parcaMaliyetKurus(eski), { tarih: "2026-11-02", bugun: BUGUN, yeniKayit: eski }).gecmis;
    expect(ters.at(-1)).toEqual({ gecerli: "2026-11-02", kurus: 480000, dovizTutar: 120, kur: 40, paraBirimi: "USD" });
  });
  it("R5/2 (kapsam): döviz alanları yeni kayıtta varken üçlü anahtar sürer (0157 AC-40); lira değişince satır yazılır ve eski döviz alanları korunur", () => {
    const eski = { id: 1, maliyet: 120, maliyetParaBirimi: "USD", maliyetKuru: 40, maliyetGecmisi: gecmis };
    const ayniLira = { ...eski, maliyet: 100, maliyetKuru: 48 };
    expect(U.maliyetGecmisiYaz(eski, U.parcaMaliyetKurus(ayniLira), { tarih: "2026-11-01", bugun: BUGUN, yeniKayit: ayniLira }).gecmis).toHaveLength(3);
    const lira = { id: 1, maliyet: 5000, maliyetGecmisi: gecmis };
    const r = U.maliyetGecmisiYaz(eski, U.parcaMaliyetKurus(lira), { tarih: "2026-11-01", bugun: BUGUN, yeniKayit: lira }).gecmis;
    expect(r.at(-2)).toEqual({ gecerli: "2026-06-01", kurus: 480000, dovizTutar: 120, kur: 40, paraBirimi: "USD" });
    expect(r.at(-1)).toEqual({ gecerli: "2026-11-01", kurus: 500000 });
  });
});

describe("Spec 0159 R6: sipariş listesi ve belgesi", () => {
  const disYay = (o = {}) => S.siparisIhtiyaci(veri({ parts: [DIS_YAY, ...o.ek || []], modeller: [{ model: "AK", defaultParcalar: [DIS_YAY, ...o.ek || []].map(p => ({ partId: String(p.id), miktar: 1 })) }], satirlar: [{ model: "AK", adet: "1" }] }), { tedarikciOdakli: true });
  const bolum = (r, ad) => r.tedarikciBolumleri.belge.find(b => b.ad === ad);
  it("AC-13 / AC-38 / AC-41: dış yay: alım A'da, kalaylama B'de kendi satırıyla; hazır satır tutarsız sayılmadan nedenini yazar; A 40, B 10, toplam 50", () => {
    const r = disYay();
    const a = bolum(r, "Aksu CNC"); const b = bolum(r, "Fason Kaplama");
    expect(a.islemler.map(x => [x.ad, x.tutarK])).toEqual([["Parça alımı", 4000]]);
    expect(b.islemler.map(x => [x.ad, x.tutarK])).toEqual([["Kalaylama", 1000]]);
    const h = a.satirlar.find(x => x.ad === "DIŞ YAY");
    expect(h).toMatchObject({ tutarK: null, tutarNeden: S.BEDEL_KALEMLERDE, bedelKalemde: true, birimK: 5000 });
    expect(a.tutarsizSayi).toBe(0); expect(a.toplamlar).toEqual([]);
    expect([a.genelToplamK, b.genelToplamK]).toEqual([4000, 1000]);
    expect(a.genelToplamK + b.genelToplamK).toBe(5000);
    const fli = siparisRaporuHtml(r, { bugun: BUGUN, factory: FACTORY, fiyatli: true });
    const aksu = fli.split('<div class="siparis-bolum"').find(p => p.includes("Aksu CNC · "));
    expect(aksu).toContain(S.BEDEL_KALEMLERDE);
    expect(aksu).not.toContain("data-bolum-toplami"); // P1: başka parça tutarı yok
    expect(aksu).toMatch(/data-genel-toplam[^>]*>[\s\S]*?40,00 ₺/);
  });
  it("AC-14 / P2: tedarikçisiz kalem belgeye girmez, ekranda belirtilmemiş kutusunda; hazır satırdan yine düşülür", () => {
    const p = { id: 60, ad: "Tedarikçisiz alım", tedarikciId: 22, maliyetKalemleri: [{ tur: "islem", ad: "Nakliye", tutar: 7 }, { tur: "islem", ad: "Parça alımı", tedarikciId: 22, tutar: 3 }] };
    const r = S.siparisIhtiyaci(veri({ parts: [p], modeller: [{ model: "AK", defaultParcalar: [{ partId: "60", miktar: 1 }] }], satirlar: [{ model: "AK", adet: "1" }] }), { tedarikciOdakli: true });
    expect(r.tedarikciBolumleri.belirtilmemis.islemler.map(x => x.ad)).toEqual(["Nakliye"]);
    expect(r.tedarikciBolumleri.belge.flatMap(b => b.islemler).map(x => x.ad)).toEqual(["Parça alımı"]);
    expect(bolum(r, "Aksu CNC").satirlar[0].bedelKalemde).toBe(true);
  });
  it("AC-39 / AC-40: kalemsiz elle maliyetli parça ve malzemeli parça bugünkü gibi (bedelKalemde anahtarı yok)", () => {
    const r = S.siparisIhtiyaci(veri(), { tedarikciOdakli: true });
    const satirlar = r.tedarikciBolumleri.belge.flatMap(b => b.satirlar);
    const c = satirlar.find(x => x.ad === "Cıvata M8"); expect(c.tutarK).toBe(200 * c.siparis); expect(c.tutarK).toBeGreaterThan(0);
    for (const ad of ["Cıvata M8", "Pirinç burç", "İthal rulman"]) expect(satirlar.find(x => x.ad === ad), ad).not.toHaveProperty("bedelKalemde");
  });
  it("AC-12 / AC-42: belgedeki tablo başlığı, sütun başlığı ve toplam satırı yeni adları yazar", () => {
    const fli = siparisRaporuHtml(disYay(), { bugun: BUGUN, factory: FACTORY, fiyatli: true });
    expect(fli).toContain(">Alımlar ve işlemler<"); expect(fli).toContain(">Alım / işlem<"); expect(fli).toContain("Alımlar ve işlemler toplamı");
    expect(BELGE_SUTUNLARI.islem).toEqual(["Parça", "Alım / işlem", "Sipariş adedi"]);
    expect([S.ISLEMLER_BASLIGI, S.ISLEMLER_TOPLAMI]).toEqual([U.ALIM_ISLEM.TABLO, U.ALIM_ISLEM.TOPLAM]);
  });
});

describe("Spec 0159: Excel", () => {
  it("AC-45: dönüştürülmüş (kalem listeli) parçanın maliyet hücresi alınmaz ve nedeni satır numarasıyla bildirilir", () => {
    const r = parcaSatirlariniCoz([PARCA_AKTARMA_BASLIKLARI, ["DIŞ YAY", "", "", "", "", "", "", "", "", "60"]], [DIS_YAY], 100, BUGUN, MALZEMELER);
    expect(r.errors).toEqual([`Satır 2: ${U.KALEM_EXCEL_HATASI}`]);
    expect(r.parts[0]).not.toHaveProperty("maliyet");
  });
});

describe("Spec 0159: kaynak taramaları", () => {
  const SRC = srcDosyalari("src");
  it("AC-17 / AC-21 / C1 / R1/4: kalem türleri iki değerde; veri değeri, test kimlikleri ve eski kalem adı değişmedi", () => {
    expect(Object.values(KALEM_TUR)).toEqual(["malzeme", "islem"]);
    const a = kod("src/components/MaliyetKalemleriAlani.jsx");
    expect(a).toContain('data-testid="islem-kalemi"'); expect(a).toContain('data-testid="kalem-tutar"');
    expect(U.ESKI_KALEM_ADI).toBe("Dış işlem");
  });
  it("AC-18 / C5: yeni kalıcı alan, izin kimliği ve sunucu kuralı yok", () => {
    for (const f of ["electron/db.cjs", "electron/serverAuth.cjs", "electron/server.cjs", "src/components/settings/serverPermissionDefs.js", "src/lib/merge.js"]) expect(fs.readFileSync(f, "utf8"), f).not.toMatch(/0159|_tasimaNotu|bedelKalemde|ALIM_KALEMI/);
    expect(kod("src/components/PartManager.jsx")).toMatch(/_tasimaNotu, _tasimaKurEksik, maliyetKalemleri/); // geçici alanlar kayda girmez
  });
  it("AC-29 / AC-48 / C3/2: KIP_ONAY_HESAPLA kaynakta yok; kip kuralı tek saf fonksiyonda, ekran kip alanı yazmaz", () => {
    expect(SRC.filter(f => /KIP_ONAY_HESAPLA/.test(kod(f)))).toEqual([]);
    const pm = kod("src/components/PartManager.jsx");
    const kip = pm.slice(pm.indexOf("const kipUygula"), pm.indexOf("const kalemYaz"));
    expect(kip).toMatch(/kipGecisi\(/);
    expect(kip).not.toMatch(/maliyetKalemleri:\s*\[\]|maliyet:\s*""|_maliyetKipi:/);
    expect(SRC.filter(f => f !== "src/lib/urunAgaci.js" && /export const kipGecisi/.test(kod(f)))).toEqual([]);
  });
  it("AC-43 / C6 / C6/2: R7/2 envanterindeki eski metinler src'de yok; yeni ad tek sabit kümesinde, \"gider\" sözcüğü yok", () => {
    const eski = [/İşlem adı/, /İşlem tutarı/, /İşlem tedarikçisi/, /`İşlem kalemi /, /İşlem kalemini kaldır/, /İşlem ekle/, /Örn: Lazer kesim/, /"İşlemler"/,
      /İşlemler toplamı/, /"Parça", "İşlem", "Sipariş adedi"/, /Hesapla kipine geçilince elle girilen maliyet temizlenir/, /"İşlem tutarları sabittir/,
      /bir parçanın işlem kaleminde geçen \(fason\)/, /parçaların işlem kaleminin tedarikçi seçicisinde/, /} işlem kaleminin tedarikçisi girilmemiş/, /, \$\{islem\} işlem kalemi\)/];
    // Envanterin yaşadığı dosyalar (müşteri detayının ilgisiz "İşlemler" başlığı gibi başka kavramlar taranmaz).
    const KALEM_DOSYALARI = ["src/lib/urunAgaci.js", "src/lib/maliyetKalemleri.js", "src/lib/siparisIhtiyaci.js", "src/lib/siparisRaporu.js",
      "src/components/MaliyetKalemleriAlani.jsx", "src/components/PartManager.jsx", "src/components/stock/SiparisPenceresi.jsx", "src/components/gider/Tedarikciler.jsx"];
    const bulunan = KALEM_DOSYALARI.flatMap(f => eski.filter(d => d.test(kod(f))).map(d => `${f}: ${d}`));
    expect(bulunan).toEqual([]);
    const yeni = SRC.filter(f => /"Alım \/ işlem"|"Alımlar ve işlemler"|"Alım\/işlem ekle"|"Alım ya da işlem adı"/.test(kod(f)));
    expect(yeni).toEqual(["src/lib/urunAgaci.js"]);
    expect(JSON.stringify(U.ALIM_ISLEM)).not.toMatch(/gider/i);
    // Triyaj (bulgu 4): sabit kümesinin her anahtarı kaynakta okunur (ölü sabit yok); kalemin tedarikçi etiketi kümeden.
    const govde = SRC.filter(f => f !== "src/lib/urunAgaci.js").map(kod).join("\n") + kod("src/lib/urunAgaci.js").replace(/export const ALIM_ISLEM = Object\.freeze\(\{[\s\S]*?\}\);/, "");
    for (const k of Object.keys(U.ALIM_ISLEM)) expect(govde, k).toMatch(new RegExp(`ALIM_ISLEM\\.${k}\\b`));
    expect(kod("src/components/MaliyetKalemleriAlani.jsx")).toMatch(/label=\{ALIM_ISLEM\.TEDARIKCI_ETIKETI\}/);
  });
});
