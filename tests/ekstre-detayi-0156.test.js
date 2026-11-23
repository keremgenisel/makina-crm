// Spec 0156: tedarikçi ekstresi ayrıntısının saf motoru ve kaynak taramaları. Vergi kırılımı tek okuyucudan
// (`gider.kalemVergiKirilimi`), ödeme listesi ve kalan motorun borç satırında, satır anahtarı deterministik; süzgeç metni
// `aramaGider.kalemFiltresiOf`, hesap adı `kasa.hesapAdiCoz`. Ekran ölçümleri `ui/ekstre-detayi-0156*`. Test adları AC-<n> taşır.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import * as G from "../src/lib/gider";
import { tedarikciEkstresi, calisanEkstresi, hesapAdiCoz, HESAP_BELIRTILMEDI, SILINMIS_HESAP } from "../src/lib/kasa";
import { kalemFiltresiOf } from "../src/lib/aramaGider";
import { NORMAL, TEVKIFAT, KIRA, KISITLI, DOVIZ, TAKSITLI, SIFIR_KDV, GOC, ODENMEMIS, HESAPLAR, secenek, turMap } from "./fixtures/0156-veri.js";

const yorumsuz = (f) => fs.readFileSync(f, "utf8").split("\n").filter(l => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).map(l => l.replace(/\s\/\/.*$/, "")).join("\n");
const dosyalar = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? dosyalar(path.join(d, e.name)) : /\.(jsx?|cjs|mjs)$/.test(e.name) ? [path.join(d, e.name)] : []));
// Çarpma ya da bölme işleci (boşluklu: ` * ` / ` / `); içe aktarma yolları ve JSX kapanışları eşleşmez.
const ARITMETIK = new RegExp("[\\w)\\]]\\s+[*/]\\s+[\\w(]|[\\w)\\]]\\*[\\w(]");
const PENCERE = "src/components/gider/EkstrePenceresi.jsx";
const e = () => tedarikciEkstresi(11, secenek());
const borc = (r, k) => r.satirlar.find(s => s.tur === "borc" && s.kalem.id === k.id);
const kir = (k) => G.kalemVergiKirilimi(k, G.davranisOf(k, turMap));

describe("Spec 0156: vergi okuyucusu (C1/2)", () => {
  it("AC-3 / AC-35: normal kalem matrah, KDV oranı ve tutarı; kuruş alanları", () => {
    expect(kir(NORMAL)).toMatchObject({ kira: false, matrahK: 1000000, kdvK: 200000, kdvOrani: 20, tevkifatK: 0, tevkifatPay: null, stopajK: 0, stopajOrani: null, indirilemeyenK: 0, odenecekK: 1200000 });
  });
  it("AC-5 / AC-6 / AC-54: tevkifatlı kalem tevkifatı oranıyla taşır, tevkifatsız kalemde sıfır ve oran yok", () => {
    expect(kir(TEVKIFAT)).toMatchObject({ kdvK: 400000, tevkifatK: 200000, tevkifatPay: 5, tevkifatPayda: 10, odenecekK: 2200000 });
    expect(G.tevkifatOranEtiketi({ pay: 5, payda: 10 })).toBe("5/10");
    expect(kir(NORMAL).tevkifatK).toBe(0);
  });
  it("AC-7 / AC-44: kira brüt, stopaj (%20), net ve KDV; ödenecek kiraya verene", () => {
    expect(kir(KIRA)).toMatchObject({ kira: true, matrahK: 2000000, stopajK: 400000, stopajOrani: 20, netK: 1600000, kdvK: 400000, odenecekK: 2000000 });
  });
  it("AC-8: kısıtlı kalem indirilemeyen KDV'yi taşır, kısıtsız kalemde sıfır", () => {
    expect(kir(KISITLI).indirilemeyenK).toBe(G.kisitHesabi(KISITLI, "normal").indirilemeyenK);
    expect(kir(KISITLI).indirilemeyenK).toBeGreaterThan(0);
    expect(kir(NORMAL).indirilemeyenK).toBe(0);
  });
  it("AC-4 (R3/2): KDV tutarı sıfır olan üç hâl: oranı sıfır, kuruşa yuvarlanınca sıfır, KDV'siz davranışa çevrilmiş tür", () => {
    expect(kir(GOC).kdvK).toBe(0);
    expect(kir(SIFIR_KDV)).toMatchObject({ kdvOrani: 1, kdvK: 0 });
    expect(G.kalemVergiKirilimi({ ...NORMAL, kdvOrani: 20 }, G.DAVRANIS.SGK)).toMatchObject({ kdvK: 0, kdvOrani: 0 });
  });
  it("DoD çapraz: kırılımın rakamları gider formunun özet bloğunun okuduğu fonksiyonlarla kuruşu kuruşuna aynı (kalemTutari, kalemKdv, kalemTevkifat, kalemStopaj, odenecekTutar, kisitHesabi)", () => {
    for (const k of [NORMAL, TEVKIFAT, KIRA, KISITLI, DOVIZ, TAKSITLI, SIFIR_KDV, GOC, ODENMEMIS]) {
      const dav = G.davranisOf(k, turMap), v = kir(k);
      expect([v.matrahK, v.kdvK, v.tevkifatK, v.stopajK, v.odenecekK].map(G.tl), k.aciklama)
        .toEqual([G.kalemTutari(k, dav), G.kalemKdv(k, dav), G.kalemTevkifat(k, dav), G.kalemStopaj(k, dav), G.odenecekTutar(k, dav)]);
      expect(v.indirilemeyenK).toBe(G.kisitHesabi(k, dav).indirilemeyenK);
    }
  });
  it("C1/2: okuyucu bugünkü fonksiyonları çağırır, kendi çarpımını yazmaz", () => {
    const g = yorumsuz("src/lib/gider.js");
    const govde = g.slice(g.indexOf("export const kalemVergiKirilimi"), g.indexOf("};", g.indexOf("export const kalemVergiKirilimi")));
    expect(govde).not.toMatch(ARITMETIK);
    expect(govde).toMatch(/kalemKurus\(/); expect(govde).toMatch(/kdvKurus\(/); expect(govde).toMatch(/stopajKurus\(/);
    expect(govde).toMatch(/tevkifatKurus\(/); expect(govde).toMatch(/kisitHesabi\(/); expect(govde).toMatch(/odenecekKurus\(/);
  });
});

describe("Spec 0156: ekstre motorunun yeni alanları", () => {
  it("AC-43 / AC-44 (P1): köprünün kapanışı (odenecekK) bütün borç satırlarında satırın tutarına kuruşu kuruşuna eşit (taksitli dahil)", () => {
    const r = e();
    const borclar = r.satirlar.filter(s => s.tur === "borc");
    expect(borclar).toHaveLength(9);
    for (const s of borclar) expect(s.vergi.odenecekK, s.kalem.aciklama).toBe(s.tutarK);
    expect(borc(r, TAKSITLI).kalem.taksitler.length).toBe(3);
  });
  it("AC-10 / AC-11 / AC-12 (R4/2): borç satırı kalemin ana hedef ödemelerini ve kalanı taşır; ödenmemişte liste boş", () => {
    const r = e();
    expect(borc(r, NORMAL).odemeler.map(p => [p.hareket.id, p.payK])).toEqual([[101, 500000], [102, 200000]]);
    expect(borc(r, NORMAL).kalanK).toBe(500000);
    expect(borc(r, ODENMEMIS).odemeler).toEqual([]);
    expect(borc(r, ODENMEMIS).kalanK).toBe(borc(r, ODENMEMIS).tutarK);
  });
  it("R4/2 (C3): vergi dairesine giden tevkifat ödemesi listeye girmez; liste toplamı ile kalan satırın tutarını tutar", () => {
    const s = borc(e(), TEVKIFAT);
    expect(s.odemeler.map(p => p.hareket.id)).toEqual([103]);
    expect(s.odemeler.reduce((a, p) => a + p.payK, 0) + s.kalanK).toBe(s.tutarK);
  });
  it("AC-13: aralık dışındaki ödemeler de ayrıntının listesinde (liste aralık süzmesinden önce kurulur)", () => {
    const r = tedarikciEkstresi(11, secenek({ bas: "2026-09-01", bit: "2026-09-30" }));
    expect(r.satirlar.some(s => s.hareket?.id === 102)).toBe(false);
    expect(borc(r, NORMAL).odemeler.map(p => p.hareket.id)).toEqual([101, 102]);
  });
  it("AC-37 (R1/2): anahtar tür, kalem ve hareket kimliğinden; tekil ve aralık değişince aynı satırda aynı", () => {
    const tam = e(), dar = tedarikciEkstresi(11, secenek({ bas: "2026-09-11", bit: "" }));
    expect(new Set(tam.satirlar.map(s => s.anahtar)).size).toBe(tam.satirlar.length);
    expect(borc(tam, NORMAL).anahtar).toBe("borc:1:");
    expect(tam.satirlar.find(s => s.hareket?.id === 101).anahtar).toBe("odeme:1:101");
    for (const s of dar.satirlar) expect(tam.satirlar.find(x => x.anahtar === s.anahtar)?.tarih).toBe(s.tarih);
    const c = calisanEkstresi(21, secenek());
    expect(c.satirlar.find(s => s.tur === "avans").anahtar).toBe("avans::121");
    expect(new Set(c.satirlar.map(s => s.anahtar)).size).toBe(c.satirlar.length);
  });
  it("AC-38 (C2/2): yeni alanlar koşulsuz (seçenek yok), ödeme satırında vergi alanı yok", () => {
    const r = e();
    expect(r.satirlar.filter(s => s.tur === "borc").every(s => s.vergi && Array.isArray(s.odemeler) && typeof s.kalanK === "number")).toBe(true);
    expect(r.satirlar.filter(s => s.tur === "odeme").every(s => !("vergi" in s) && s.anahtar)).toBe(true);
  });
});

describe("Spec 0156: hesap adı ve süzgeç metni", () => {
  it("AC-51 (R5/3, P3): hesap listesi boşsa boş dize; kimlik boşsa 'belirtilmedi', listede yoksa 'silinmiş'", () => {
    expect(hesapAdiCoz([], 51)).toBe("");
    expect(hesapAdiCoz(null, 51)).toBe("");
    expect(hesapAdiCoz(HESAPLAR, 51)).toBe("Ziraat");
    expect(hesapAdiCoz(HESAPLAR, null)).toBe(HESAP_BELIRTILMEDI);
    expect(hesapAdiCoz(HESAPLAR, 999)).toBe(SILINMIS_HESAP);
  });
  it("AC-42 (R15/2): kalemFiltresiOf açıklama, yoksa tedarikçi adı, yoksa tür süzgeci (genel aramanın kuralı)", () => {
    expect(kalemFiltresiOf({ aciklama: "Somun", turId: 1 }, "Sistem")).toEqual({ ara: "Somun" });
    expect(kalemFiltresiOf({ aciklama: "", turId: 1 }, "Sistem")).toEqual({ ara: "Sistem" });
    expect(kalemFiltresiOf({ turId: 4 }, "")).toEqual({ tur: "4" });
    expect(kalemFiltresiOf({}, "")).toEqual({ tur: "" });
  });
});

describe("Spec 0156 triyaj (bulgu 3): kur satırı ve taksit ölçütü tek yerde", () => {
  it("kurSatiriMetni tek biçimleyici; gider.kalemKurMetni ve pencere onu çağırır, '1 ${pb} = …' kopyası yok", async () => {
    const { kurSatiriMetni, kurMetni } = await import("../src/lib/kur");
    expect(kurSatiriMetni("USD", 40)).toBe(`1 USD = ${kurMetni(40)} TL`);
    expect(G.kalemKurMetni(DOVIZ)).toBe(kurSatiriMetni("USD", 40));
    for (const f of [PENCERE, "src/lib/gider.js"]) expect(yorumsuz(f), f).not.toMatch(/`1 \$\{/);
    expect(yorumsuz(PENCERE)).toMatch(/kurSatiriMetni\(m\.paraBirimi, m\.kur\)/);
  });
  it("taksitliHedefMi / taksitNumarasiAdi odemeYontemi'nde; pencere taksit satırlarını kendisi saymaz", async () => {
    const { taksitliHedefMi, taksitNumarasiAdi, taksitAdi } = await import("../src/lib/odemeYontemi");
    expect(taksitliHedefMi(TAKSITLI, TAKSITLI.taksitler[0].id)).toBe(true);
    expect(taksitNumarasiAdi(TAKSITLI, TAKSITLI.taksitler[0].id, "normal")).toBe(taksitAdi(TAKSITLI, TAKSITLI.taksitler[0].id, "normal"));
    const anaKira = KIRA.taksitler.find(t => t.hedef === "ana");
    expect(taksitliHedefMi(KIRA, anaKira.id)).toBe(false);
    expect(taksitNumarasiAdi(KIRA, anaKira.id, "kira")).toBeNull();
    expect(taksitNumarasiAdi(TAKSITLI, 999999, "normal")).toBeNull();
    expect(yorumsuz(PENCERE)).not.toMatch(/taksitler\.filter|taksitler \|\| \[\]\)\.find/);
  });
});

describe("Spec 0156: kaynak taramaları", () => {
  const pencere = yorumsuz(PENCERE).replace(/^import .*$/gm, "");
  it("AC-42: süzgeç kuralı yalnız aramaGider'de; genel arama ve Giderler aynı fonksiyonu çağırır", () => {
    for (const f of dosyalar("src")) {
      if (f.endsWith("aramaGider.js")) continue;
      expect(yorumsuz(f), f).not.toMatch(/aciklama\s*\?\s*\{\s*ara:/);
    }
    expect(yorumsuz("src/components/GlobalSearch.jsx")).toMatch(/kalemFiltresiOf\(k, tedAd\)/);
    expect(yorumsuz("src/components/Giderler.jsx")).toMatch(/kalemFiltresiOf\(k, tedarikciAdi\)/);
  });
  it("AC-32 / AC-35: pencere ve kasa.js ikinci vergi hesabı yazmaz; pencerede çarpma ve bölme yok", () => {
    expect(pencere).not.toMatch(ARITMETIK);
    expect(pencere).not.toMatch(/kdvOrani\s*[*/]|stopajOrani\s*[*/]|tevkifatPay\s*[*/]|Math\.round/);
    const kasa = yorumsuz("src/lib/kasa.js");
    expect(kasa).not.toMatch(/kdvOrani|stopajOrani|tevkifatPay/);
    expect(kasa).toMatch(/vergi: kalemVergiKirilimi\(k, dav\)/);
  });
  it("AC-36: pencere hareket ve tür listesi almaz; ödeme listesini borç satırının alanından çizer", () => {
    const imza = pencere.slice(pencere.indexOf("export const EkstrePenceresi"), pencere.indexOf("=>", pencere.indexOf("export const EkstrePenceresi")));
    expect(imza).not.toMatch(/hareketler|turler|giderTurleri/);
    expect(pencere).toMatch(/s\.odemeler\.map\(/);
  });
  it("AC-30 / AC-7: ayrıntı ve düğme hiçbir kaydı değiştirmez, kilit almaz", () => {
    expect(pencere).not.toMatch(/\bset(?!Aralik|Acik)[A-Z]\w*\(/); // yalnız pencerenin kendi iki yerel durumu
    expect(pencere).not.toMatch(/useLock|baskasiKilitli|kilitliIse|logAction/);
  });
  it("AC-40 (C6/2): yönlendirme Giderler'in kendi durumunda; App'e yeni prop ya da çizim anahtarı eklenmedi", () => {
    const app = yorumsuz("src/App.jsx");
    expect(app).not.toMatch(/yerelKalemFiltresi|onKalemdeGoster|kalemdeGoster/);
    expect(yorumsuz("src/components/Giderler.jsx")).toMatch(/baslangicFiltre=\{yerelKalemFiltresi \?\? baslangicKalemFiltresi\}/);
  });
  it("AC-55 (C9/2): pencerenin bileşen gövdesinde Türkçe metin yok; kullanıcı metinleri modül düzeyindeki blokta", () => {
    const govde = pencere.slice(pencere.indexOf("export const EkstrePenceresi"));
    expect(govde).not.toMatch(/"[^"\n]*[çğıöşüÇĞİÖŞÜ][^"\n]*"/);
    expect(govde).not.toMatch(/>\s*[A-Za-zçğıöşüÇĞİÖŞÜ][^<>{}\n]*</);
    expect(pencere).toMatch(/export const EKSTRE_METIN = Object\.freeze\(/);
  });
  it("AC-52 (C10, P4): sayfalamanın ikinci sayfasını çeken ekran araçtan ve eşlemeden silindi; ekstreye bağlı kayıtlar onaylı (spec sürerken 'degisti', done'da 0156 tabanıyla 'ayni')", () => {
    expect(fs.readFileSync("scripts/evidence/0009-sayfa.jsx", "utf8")).not.toMatch(/"giderler-0062-ekstre-sayfa2":/);
    const { dosyalar: E } = JSON.parse(fs.readFileSync("docs/evidence/kanit-eslemesi.json", "utf8"));
    expect(JSON.stringify(E)).not.toMatch(/giderler-0062-ekstre-sayfa2/);
    const k = E["src/components/gider/EkstrePenceresi.jsx"];
    // Eski raporlara bağlı kayıtlar o raporun tarihî kanıtıdır ve aynen kalır; değişen görünümün kaydı 0156'nın raporundadır.
    const yeni = k.filter(x => /\/0156-(taban-)?piksel-raporu\.json$/.test(x.rapor));
    expect(yeni.length).toBe(11);
    for (const x of yeni) {
      if (x.beklenen === "degisti") expect(x.onay, x.ekran).toBe("Takım Yöneticisi · 2026-11-23 · spec 0156 C10");
      else expect(x.rapor, x.ekran).toBe("docs/evidence/0156-taban-piksel-raporu.json");
    }
    for (const e of ["kasa-calisan-ekstresi", "giderler-tedarikci-ekstresi", "kasa-ekstre-hedef", "giderler-0062-ekstre"]) expect(yeni.some(x => x.ekran === e), e).toBe(true);
    for (const x of k.filter(x => !yeni.includes(x))) expect(x.beklenen ?? "ayni", x.ekran).toBe("ayni");
    for (const e of ["ekstre-0156-normal-tevkifat", "ekstre-0156-kira-doviz", "ekstre-0156-odeme", "ekstre-0156-calisan", "ekstre-0156-bos"]) expect(k.some(x => x.ekran === e), e).toBe(true);
  });
  it("AC-34 (C7): yeni kalıcı alan, izin kimliği, veri bölümü ve sunucu kuralı yok", () => {
    for (const f of ["electron/db.cjs", "electron/serverAuth.cjs", "src/components/settings/serverPermissionDefs.js", "src/lib/permissions.js"]) {
      expect(yorumsuz(f), f).not.toMatch(/kalemVergiKirilimi|kalemdeGoster|hesapAdiCoz|ekstre_ayrinti|odemeler: paylar/);
    }
    expect(yorumsuz("electron/serverAuth.cjs")).not.toMatch(/ekstre/i);
  });
});
