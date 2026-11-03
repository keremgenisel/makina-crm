// Spec 0124: parça şablonunda set içeriği sütunu. Saf motor (`urunAgaci.js` biçimi, `parcaAktarma.js` iki geçişli içe aktarma)
// ve kaynak taramaları; İçe Aktar ekranı tests/ui/excel-set-0124.test.jsx'te.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as UA from "../src/lib/urunAgaci";
import {
  setKatalogu, setIcerigiHucresi, setIcerigiHucresiParcala, setIcerigiParcasiCoz, setIcerigiExcelHatasi, setteGecenParcalar,
  SET_ICERIGI_BASLIGI, SET_ICERIGI_ORNEGI, SET_ICERIGI_YER_TUTUCU, SET_BILESEN_BULUNAMADI, LISTEDE_OLMAYAN_PARCA,
  KIT_ADET_HATASI, SET_KENDISI, SET_IC_ICE, SET_AYNI_PARCA, SET_EXCEL_HATASI, HAMMADDE_EXCEL_HATASI, setBileseniHatasi, icerikYazilacakMetni, icerikYazildiMetni,
} from "../src/lib/urunAgaci";
import { PARCA_AKTARMA_BASLIKLARI, PARCA_SABLON_ORNEGI, parcaDisaAktarmaSatiri, parcaSatirlariniCoz, parcaIceAktarmaUygula, YINELENEN_AD_HATASI } from "../src/lib/parcaAktarma";
import { buildCSV } from "../src/components/settings/csvUtils";

const BUGUN = "2026-11-02";
const COP = "2026-10-01T09:00:00.000Z";
const H = PARCA_AKTARMA_BASLIKLARI;
const satir = (ad, icerik = "", maliyet = "") => [ad, "", "", "", "", "", "", "", "", maliyet, icerik];
const OLCULU = "100_KALIP MİLİ YATAK RULMANLARI 30x55x13";
const PARTS = [
  { id: 1, ad: "Rulman", maliyet: 100 }, { id: 2, ad: "Pul", maliyet: 2 }, { id: 3, ad: OLCULU, maliyet: 50 },
  { id: 4, ad: "Eski Dişli", deletedAt: COP, maliyet: 9 }, { id: 5, ad: "Kayış", maliyet: 30 },
  { id: 10, ad: "Rulman Seti", setIcerigi: [{ partId: 1, miktar: 2 }, { partId: 2, miktar: 4 }] },
  { id: 11, ad: "Bozuk Set", setIcerigi: [{ partId: 4, miktar: 1 }, { partId: 99, miktar: 1 }] },
];
const coz = (rows, parts = PARTS) => parcaSatirlariniCoz([H, ...rows], parts, 1000, BUGUN);
const kayit = (r, ad) => r.parts.find(p => p.ad === ad);

describe("Spec 0124 A: sütun ve biçim (R1–R4)", () => {
  it("AC-1 / AC-14: şablon on bir sütun, on birincisi 'Set İçeriği', örnek satırda biçim örneği", () => {
    expect(H).toHaveLength(11);
    expect(H[10]).toBe("Set İçeriği");
    expect(H[10]).toBe(SET_ICERIGI_BASLIGI);
    expect(H[9]).toBe("Maliyet (TL, KDV hariç)");
    expect(PARCA_SABLON_ORNEGI).toHaveLength(11);
    expect(PARCA_SABLON_ORNEGI[10]).toBe(SET_ICERIGI_ORNEGI);
    // Kod tarama #53 (js/redos): parça adı `[^;]+` ile sınırlanır; `.+` ayraçla birlikte üstel geri izlemeye açıktı.
    expect(SET_ICERIGI_ORNEGI).toMatch(/^[^;]+ x \d+(?:; [^;]+ x \d+)*$/);
  });
  it("AC-2: içeriği olan parçanın hücresi içerik sırasıyla `AD x ADET; AD x ADET`, her zaman `x`", () => {
    const kat = setKatalogu(PARTS);
    expect(parcaDisaAktarmaSatiri(PARTS[5], kat)[10]).toBe("Rulman x 2; Pul x 4");
    expect(setIcerigiHucresi({ setIcerigi: [{ partId: 2, miktar: 1 }, { partId: 3, miktar: 3 }] }, kat)).toBe(`Pul x 1; ${OLCULU} x 3`);
  });
  it("AC-3: içeriği olmayan parçanın on birinci hücresi boş", () => {
    expect(parcaDisaAktarmaSatiri(PARTS[0], setKatalogu(PARTS))[10]).toBe("");
  });
  it("AC-4 (Karar 21): çöpteki ve kaydı olmayan bileşen tek parantezli yer tutucuyla, ada benzemez", () => {
    expect(SET_ICERIGI_YER_TUTUCU).toBe(`(${LISTEDE_OLMAYAN_PARCA})`);
    expect(parcaDisaAktarmaSatiri(PARTS[6], setKatalogu(PARTS))[10]).toBe(`${SET_ICERIGI_YER_TUTUCU} x 1; ${SET_ICERIGI_YER_TUTUCU} x 1`);
  });
  it("AC-22: katalog verilmezse ya da `.map` dizi indeksi geçirirse on birinci hücre boş, çökmez", () => {
    expect(parcaDisaAktarmaSatiri(PARTS[5])[10]).toBe("");
    expect(PARTS.map(parcaDisaAktarmaSatiri).map(s => s[10])).toEqual(["", "", "", "", "", "", ""]);
  });
  it("AC-6 / Karar 18: x, X, *, ×, adetsiz ve boşluklu yazımlar aynı; ölçüyle biten ad iki yazımla da doğru okunur", () => {
    const adBul = (a) => new Map(PARTS.filter(p => !p.deletedAt).map(p => [p.ad.toLocaleLowerCase("tr"), p.id])).get(a.toLocaleLowerCase("tr"));
    const sonuc = (m) => setIcerigiHucresiParcala(m).map(x => setIcerigiParcasiCoz(x, adBul)).map(x => [x.id, x.adetHam]);
    for (const m of ["Rulman x 2", "Rulman X 2", "Rulman * 2", "Rulman × 2", "  Rulman   x2  ", "Rulman x 2;  ;"]) expect(sonuc(m), m).toEqual([[1, "2"]]);
    expect(sonuc("Rulman")).toEqual([[1, "1"]]);
    expect(sonuc(OLCULU)).toEqual([[3, "1"]]);
    expect(sonuc(`${OLCULU} x 2`)).toEqual([[3, "2"]]);
    expect(sonuc(`${OLCULU}x2`)).toEqual([[3, "2"]]);
    // İki okumanın da katalogda karşılığı varsa ad önce gelir (tamamı ad).
    const adBul2 = (a) => ({ "a x 2": 7, a: 8 })[a.toLowerCase()];
    expect(setIcerigiParcasiCoz("A x 2", adBul2)).toMatchObject({ id: 7, adetHam: "1" });
  });
  it("C7: hücre içi `;` buildCSV'nin koşulsuz tırnaklamasıyla korunur", () => {
    const csv = buildCSV([H, satir("Yeni Set", "Rulman x 2; Pul x 4")]);
    expect(csv).toContain('"Rulman x 2; Pul x 4"');
  });
});

describe("Spec 0124 B: içe aktarma (R5–R10)", () => {
  it("AC-5 / Karar 20: canlı bileşenli setin dışa aktarılan satırı geri yüklenince içerik aynı, hata yok, sayı 0, alan yazılmaz", () => {
    const kat = setKatalogu(PARTS);
    const rows = PARTS.filter(p => !p.deletedAt && p.id !== 11).map(p => parcaDisaAktarmaSatiri(p, kat));
    const r = coz(rows);
    expect(r.errors).toEqual([]);
    expect(r.icerikYazilanlar).toBe(0);
    expect("setIcerigi" in kayit(r, "Rulman Seti")).toBe(false);
    const sonra = parcaIceAktarmaUygula(PARTS, r.parts);
    expect(sonra.find(p => p.id === 10).setIcerigi).toEqual(PARTS[5].setIcerigi);
  });
  it("AC-5 (sınır): çözülemeyen bileşenli setin hücresi geri yüklenince 'bulunamadı', içerik korunur", () => {
    const r = coz([parcaDisaAktarmaSatiri(PARTS[6], setKatalogu(PARTS))]);
    expect(r.errors).toEqual([setIcerigiExcelHatasi(2, SET_BILESEN_BULUNAMADI, `${SET_ICERIGI_YER_TUTUCU} x 1`, 1)]);
    expect(parcaIceAktarmaUygula(PARTS, r.parts).find(p => p.id === 11).setIcerigi).toEqual(PARTS[6].setIcerigi);
  });
  it("AC-7 / AC-16: aynı dosyada yeni bileşen ve onu içeren yeni set doğar; içerik kimlikle bağlanır", () => {
    const r = coz([satir("Yeni Set", "Yeni Bileşen x 3; Rulman"), satir("Yeni Bileşen")]);
    expect(r.errors).toEqual([]);
    const bilesen = kayit(r, "Yeni Bileşen"), set = kayit(r, "Yeni Set");
    expect(set.setIcerigi).toEqual([{ partId: bilesen.id, miktar: 3 }, { partId: 1, miktar: 1 }]);
    expect(typeof bilesen.id).toBe("number");
    expect(r.icerikYazilanlar).toBe(1);
    const sonra = parcaIceAktarmaUygula(PARTS, r.parts);
    expect(UA.setMi(sonra.find(p => p.ad === "Yeni Set"))).toBe(true);
  });
  it("AC-8 / AC-18: altı ret nedeni satır numarasıyla; satırın öteki hücreleri yazılır, içerik yazılmaz; tek bildirim ve 've n bileşen daha'", () => {
    const r = coz([
      satir("Kayış", "Yok Böyle x 1; Rulman"),               // 2: bulunamadı
      satir("Pul", "Pul x 1"),                                // 3: kendisi (ama Pul Rulman Seti'nde: ters yön de)
      ["Rulman", "EN ad", "", "", "", "", "", "", "", "", "Rulman Seti x 1"], // 4: içeriği olan bileşen (ve ters yön)
      satir("Y1", "Rulman x 1; Rulman x 2"),                  // 5: yinelenen
      satir("Y2", "Kayış x 0; Rulman x 1,5; Pul x abc"),      // 6: adet (3 hata)
      satir("Y3", "Rulman Seti x 1"),                          // 7: iç içe
    ]);
    expect(r.errors).toEqual([
      setIcerigiExcelHatasi(2, SET_BILESEN_BULUNAMADI, "Yok Böyle x 1"),
      setIcerigiExcelHatasi(3, SET_KENDISI, "Pul"),
      setIcerigiExcelHatasi(4, SET_IC_ICE, "Rulman Seti"),
      setIcerigiExcelHatasi(5, SET_AYNI_PARCA, "Rulman"),
      setIcerigiExcelHatasi(6, KIT_ADET_HATASI, "Kayış", 2),
      setIcerigiExcelHatasi(7, SET_IC_ICE, "Rulman Seti"),
    ]);
    expect(setIcerigiExcelHatasi(6, KIT_ADET_HATASI, "Kayış", 2)).toBe("Satır 6: Set içeriği alınmadı: Adet en az 1 tam sayı olmalı (Kayış) ve 2 bileşen daha.");
    expect(r.parts.every(p => !("setIcerigi" in p))).toBe(true);
    expect(kayit(r, "Rulman").adEN).toBe("EN ad");
    expect(r.icerikYazilanlar).toBe(0);
  });
  it("AC-8 (ters yön): başka setin bileşeni olan parçaya içerik verilmesi set adıyla reddedilir", () => {
    const r = coz([satir("Pul", "Kayış x 1")]);
    expect(r.errors).toEqual([setIcerigiExcelHatasi(2, setBileseniHatasi(["Rulman Seti"]))]);
  });
  it("Karar 19: reddedilen satır eski içeriğinde kalırsa iç içe set kabul edilmez (yeni ret çıkmayana kadar)", () => {
    // X'in eski içeriği Y'yi içeriyor; dosya X'e hatalı içerik, Y'ye içerik veriyor. Tek geçişte Y kabul edilirdi.
    const parts = [{ id: 1, ad: "Y" }, { id: 2, ad: "Z" }, { id: 3, ad: "X", setIcerigi: [{ partId: 1, miktar: 1 }] }];
    const r = coz([satir("X", "Yok x 1"), satir("Y", "Z x 1")], parts);
    expect(r.errors[0]).toBe(setIcerigiExcelHatasi(2, SET_BILESEN_BULUNAMADI, "Yok x 1"));
    expect(r.errors[1]).toBe(setIcerigiExcelHatasi(3, setBileseniHatasi(["X"])));
    expect(r.parts.every(p => !("setIcerigi" in p))).toBe(true);
    // Doğrulanınca (X'e geçerli içerik, Y'yi çıkararak) Y set olabilir.
    const r2 = coz([satir("X", "Z x 1"), satir("Y", "Z x 1")], parts);
    expect(r2.errors).toEqual([]);
    expect(r2.icerikYazilanlar).toBe(2);
  });
  it("Karar 19 (kurtarma): birbirine bağlı iki satırdan yalnız gerçekten geçersiz olan reddedilir; değişmeyen set satırı aday değildir", () => {
    // Pul, Rulman Seti'nde geçtiği için içerik alamaz; Kayış'ın içeriği (Rulman) geçerlidir. İyimser tur Pul set olsaydı Kayış'ı
    // ters yönden reddederdi; kurtarma adımı Kayış'ı geri alır. Rulman Seti'nin satırı kayıtlıyla aynı, doğrulanmaz.
    const r = coz([satir("Kayış", "Rulman x 1"), satir("Pul", "Kayış x 1"), satir("Rulman Seti", "Rulman x 2; Pul x 4")]);
    expect(r.errors).toEqual([setIcerigiExcelHatasi(3, SET_IC_ICE, "Kayış")]);
    expect(kayit(r, "Kayış").setIcerigi).toEqual([{ partId: 1, miktar: 1 }]);
    expect("setIcerigi" in kayit(r, "Pul")).toBe(false);
  });
  it("Karar 19 (ikinci tur): reddedilen satır eski içeriğine dönünce başka bir satır geçersizleşir; o da reddedilir", () => {
    // X'in eski içeriği Y. Dosya: Z'ye içerik (geçerli), X'e [Z] (Z set olduğu için iç içe: ret), Y'ye [W]. İlk turda X yeni
    // içerikle Y'yi taşımıyor, Y geçerli görünür; X reddedilip eski içeriğine dönünce Y, X'in içinde geçer ve ikinci turda reddedilir.
    const parts = [{ id: 1, ad: "Y" }, { id: 2, ad: "Z" }, { id: 4, ad: "W" }, { id: 5, ad: "V" }, { id: 3, ad: "X", setIcerigi: [{ partId: 1, miktar: 1 }] }];
    const r = coz([satir("Z", "V x 1"), satir("X", "Z x 1"), satir("Y", "W x 1")], parts);
    expect(r.errors).toEqual([setIcerigiExcelHatasi(3, SET_IC_ICE, "Z"), setIcerigiExcelHatasi(4, setBileseniHatasi(["X"]))]);
    expect(kayit(r, "Z").setIcerigi).toEqual([{ partId: 5, miktar: 1 }]);
    expect("setIcerigi" in kayit(r, "Y")).toBe(false);
  });
  it("Triyaj bulgu 2: ad bulunamayınca bildirim kullanıcının yazdığı parçayı gösterir, bölünmüş sol tarafı değil", () => {
    const r = coz([satir("Yeni Set", "RULMAN 30x55x13")], [...PARTS, { id: 30, ad: "RULMANI 30x55x13" }]);
    expect(r.errors).toEqual([setIcerigiExcelHatasi(2, SET_BILESEN_BULUNAMADI, "RULMAN 30x55x13")]);
  });
  it("Triyaj bulgu 3: setin maliyet uyarısı dosya sonrası bileşen maliyetleriyle (aynı dosyada değişen ve doğan bileşen)", () => {
    const parts = [{ id: 1, ad: "Pul", maliyet: 10 }];
    expect(coz([satir("Pul", "", "15"), satir("Yeni Set", "Pul x 2", "30")], parts).errors).toEqual([]);
    expect(coz([satir("Pul", "", "15"), satir("Yeni Set", "Pul x 2", "20")], parts).errors).toEqual([`Satır 3: ${SET_EXCEL_HATASI}`]);
    expect(coz([satir("Yeni Pul", "", "10"), satir("Yeni Set", "Yeni Pul x 2", "20")], parts).errors).toEqual([]);
  });
  it("Triyaj bulgu 4 (C2 bilinen sınırı): adında ';' olan bileşen dışa aktarılıp geri yüklenince 'bulunamadı'; içerik korunur", () => {
    const parts = [{ id: 1, ad: "A;B" }, { id: 2, ad: "Set", setIcerigi: [{ partId: 1, miktar: 1 }] }];
    const hucre = parcaDisaAktarmaSatiri(parts[1], setKatalogu(parts));
    expect(hucre[10]).toBe("A;B x 1");
    const r = coz([hucre], parts);
    expect(r.errors[0]).toMatch(/bulunamadı/);
    expect(parcaIceAktarmaUygula(parts, r.parts).find(p => p.id === 2).setIcerigi).toEqual(parts[1].setIcerigi);
  });
  it("Triyaj bulgu 1 (C6): bütün satırları reddedilen dosyada süre doğrusal (kurtarma artımlı)", () => {
    const parts = [{ id: 1, ad: "İç Set", setIcerigi: [{ partId: 2, miktar: 1 }] }, { id: 2, ad: "P" }, ...Array.from({ length: 398 }, (_, i) => ({ id: i + 10, ad: `Q${i}` }))];
    const olc = (n) => {
      const rows = Array.from({ length: n }, (_, i) => satir(`S${i}`, "İç Set x 1"));
      const t0 = performance.now(); const r = coz(rows, parts); const t = performance.now() - t0;
      expect(r.errors).toHaveLength(n);
      return t;
    };
    olc(200);
    const t2000 = olc(2000);
    expect(t2000).toBeLessThan(150); // Karar 32: ölçülen ~10 ms (karesel sürüm 371 ms); tavan meşgul makineye pay bırakır
  });
  it("AC-9: boş hücre ve on sütunlu eski dosya içeriği korur", () => {
    const r = coz([satir("Rulman Seti", ""), ["Rulman Seti 2", "", "", "", "", "", "", "", "", ""]]);
    expect(r.errors).toEqual([]);
    expect(parcaIceAktarmaUygula(PARTS, r.parts).find(p => p.id === 10).setIcerigi).toEqual(PARTS[5].setIcerigi);
  });
  it("AC-10 / R9/2: dosyadan set olan satırın maliyeti alınmaz, farklı rakamda neden; maliyet geçmişi yazılmaz", () => {
    const parts = [...PARTS, { id: 20, ad: "Elle", maliyet: 40, maliyetGecmisi: [{ gecerli: "", kurus: 4000 }] }];
    const r = coz([satir("Elle", "Rulman x 1", "75")], parts);
    expect(r.errors).toEqual([`Satır 2: ${SET_EXCEL_HATASI}`]);
    const k = kayit(r, "Elle");
    expect(k.setIcerigi).toEqual([{ partId: 1, miktar: 1 }]);
    expect("maliyet" in k).toBe(false);
    expect("maliyetGecmisi" in k).toBe(false);
    expect(coz([satir("Elle", "Rulman x 1", "100")], parts).errors).toEqual([]); // yeni içeriğin maliyetiyle aynı rakam
  });
  it("AC-19 (Karar 9): kırılımı tutarlı parçaya dosyadan içerik verilince neden SET_EXCEL_HATASI, HAMMADDE değil", () => {
    const parts = [...PARTS, { id: 21, ad: "Kırılımlı", hammaddeler: [{ tedarikciId: 1, tutar: 10 }] }];
    const r = coz([satir("Kırılımlı", "Rulman x 1", "55")], parts);
    expect(r.errors).toEqual([`Satır 2: ${SET_EXCEL_HATASI}`]);
    expect(r.errors.join()).not.toContain(HAMMADDE_EXCEL_HATASI);
  });
  it("AC-11 / AC-20: içeriği yazılan sayı; hatalı, boş ve değişmeyen satır sayılmaz; iki metin aynı rakam", () => {
    const r = coz([satir("Kayış", "Rulman x 1"), satir("Pul", "Kayış x 1"), satir("Rulman Seti", "Rulman x 2; Pul x 4"), satir("Y", "")]);
    expect(r.icerikYazilanlar).toBe(1);
    expect(icerikYazilacakMetni(1)).toBe("1 parçanın set içeriği yazılacak.");
    expect(icerikYazildiMetni(1)).toBe(" 1 parçanın set içeriği yazıldı.");
    expect(icerikYazilacakMetni(0)).toBe("");
  });
  it("AC-17 (Karar 4): dosyada yinelenen ad ikinci satırdan itibaren atlanır, bildirilir; iki kayıt doğmaz", () => {
    const r = coz([satir("Yeni"), satir("yeni", "Rulman x 1"), satir("Rulman"), satir("RULMAN")]);
    expect(r.errors).toEqual([`Satır 3: ${YINELENEN_AD_HATASI}`, `Satır 5: ${YINELENEN_AD_HATASI}`]);
    expect(r.parts.map(p => p.ad)).toEqual(["Yeni", "Rulman"]);
    expect(YINELENEN_AD_HATASI).toBe("Bu ad dosyada daha önce geçti, satır atlandı.");
  });
  it("AC-15 (Karar 23): 1.000 içerikli satır tavanın altında (haritaların tek kuruluşu C6 taramasında)", () => {
    const parts = Array.from({ length: 400 }, (_, i) => ({ id: i + 1, ad: `P${i + 1}`, maliyet: 1 }));
    const rows = Array.from({ length: 1000 }, (_, i) => satir(`S${i}`, `P${(i % 400) + 1} x 2; P${((i + 7) % 400) + 1}`));
    const t0 = performance.now();
    const r = parcaSatirlariniCoz([H, ...rows], parts, 10000, BUGUN);
    const sure = performance.now() - t0;
    expect(r.errors).toEqual([]);
    expect(r.icerikYazilanlar).toBe(1000);
    expect(sure).toBeLessThan(500); // Karar 23: ölçülen ~5 ms (5 koşu: 8, 5, 5, 5, 4), tavan meşgul makineye pay bırakır
  });
});

describe("Spec 0124: kaynak taramaları", () => {
  const kod = (f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  const pa = () => kod("src/lib/parcaAktarma.js");
  it("AC-12 / C1: parcaAktarma kendi adet ya da iç içe kuralını yazmaz; tek muafiyet ad eşlemesi ve 'bulunamadı'", () => {
    expect(pa()).toMatch(/setIcerigiDogrula\(/);
    expect(pa()).not.toMatch(/kitAdediDogrula|SET_IC_ICE|SET_KENDISI|SET_AYNI_PARCA|\/\^\\d\+\$\//);
    // Muafiyet: ad → kimlik eşlemesi ve bulunamadı (adıyla).
    expect(pa()).toMatch(/SET_BILESEN_BULUNAMADI/);
    expect(pa()).toMatch(/const adBul = /);
  });
  it("C6 (Karar 2, triyaj bulgu 1): haritalar doğrulama çağrısı başına ve kurtarmada BİR KEZ; kurtarma artımlı, satır döngüsünde katalog kurulmaz", () => {
    const d = pa().slice(pa().indexOf("const dogrula = (kabul) =>"), pa().indexOf("const bildirim = "));
    expect(d).toMatch(/const \{ harita, setteGecen, icerenAdlari \} = haritalar\(sonuc\);\s*const sonuclar = new Map\(\);\s*for \(const id of kabul\)/);
    expect(d).toMatch(/setIcerigiDogrula\(adaylar\.get\(id\)\.form, \{ kendiId: id, parts: sonuc, harita, setteGecen, icerenAdlari \}\)/);
    const k = pa().slice(pa().indexOf("const sonuc0 = katalogKur(kabul);"), pa().indexOf("const gecerli = new Map();"));
    const dongu = k.slice(k.indexOf("for (const id of adaylar.keys())"));
    expect(dongu).not.toMatch(/dogrula\(|katalogKur\(|haritalar\(|setKatalogu\(|setteGecenParcalar\(/);
  });
  it("AC-21: İçe Aktar ekranının sütun kutusu başlık dizisinden; elle yazılmış sütun listesi yok", () => {
    const s = kod("src/components/settings/SettingsImport.jsx");
    expect(s).toMatch(/PARCA_AKTARMA_BASLIKLARI\.map\(/);
    expect(s).not.toContain("Tanım (TR) · Tanım (EN) · Fiyat (TL)");
    expect(s).toMatch(/SET_ICERIGI_BICIMI/);
  });
  it("AC-13: şema, izin, sunucu ve birleştirme dosyaları değişmedi (yeni adlar yok)", () => {
    for (const f of ["electron/db.cjs", "electron/serverAuth.cjs", "electron/server.cjs", "src/lib/merge.js", "src/components/settings/serverPermissionDefs.js"])
      expect(readFileSync(f, "utf8"), f).not.toMatch(/SET_ICERIGI_(BASLIGI|BICIMI|ORNEGI|YER_TUTUCU)|setIcerigiHucresi|icerikYazilanlar/);
  });
  it("C6 (motor): hazır harita verilince doğrulama kendi haritasını kurmaz ve ters yön için kataloğu gezmez", () => {
    const parts = [{ id: 1, ad: "A" }, { id: 2, ad: "B" }];
    const harita = setKatalogu(parts), setteGecen = setteGecenParcalar(parts);
    const gezilince = new Proxy(parts, { get: (o, k) => { if (k === Symbol.iterator || k === "filter" || k === "map") throw new Error("katalog gezildi"); return o[k]; } });
    expect(UA.setIcerigiDogrula([{ partId: "2", miktar: "1" }], { kendiId: 1, parts: gezilince, harita, setteGecen }).gecerli).toBe(true);
    expect(() => UA.setIcerigiDogrula([{ partId: "2", miktar: "1" }], { kendiId: 1, parts: gezilince })).toThrow(/katalog gezildi/);
  });
});
