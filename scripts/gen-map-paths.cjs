#!/usr/bin/env node
/**
 * Harita verisi üreticisi — `node scripts/gen-map-paths.cjs`
 *
 * Harita sekmesinin (src/components/Harita.jsx) çevrimdışı çalışabilmesi için ülke ve bölge
 * sınırlarını hazır SVG çizimlerine çevirip src/lib/map/ altına yazar. Üretilen dosyalar
 * repoya COMMIT EDİLİR; bu script yalnız veri güncellenecekse elle çalıştırılır. Böylece
 * uygulamanın ne çalışma anında ne de derleme anında harita kütüphanesine ihtiyacı olur.
 *
 * Kaynaklar:
 *   - Natural Earth (kamu malı): ülke sınırları (world-atlas paketi) ve admin-1 bölgeleri.
 *   - GeoNames cities500 (CC BY 4.0): şehir koordinatları. Atıf zorunlu.
 *   - geoBoundaries TUR (ODbL 1.0): Türkiye il ve ilçe sınırları. Atıf + türetilmiş verinin
 *     aynı lisansla sunulması zorunlu. Yalnız ilçe kırılımı istenen iller için kullanılır.
 *
 * Ham kaynaklar büyük (~50 MB) olduğu için indirilip scripts/.map-cache/ altında saklanır
 * (gitignore'da). Çıktı ise küçük ve deterministiktir.
 *
 * Çıktı:
 *   src/lib/map/world.js            — dünya haritası + ülke adı→kod eşlemesi
 *   src/lib/map/regions/<ISO3>.js   — ülke başına bölge çizimleri + şehir dizini
 *   src/lib/map/meta.js             — üretim özeti (test bu dosyaya bakar)
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const KOK = path.join(__dirname, "..");
const CACHE = path.join(__dirname, ".map-cache");
const CIKTI = path.join(KOK, "src", "lib", "map");

const NE_ADMIN1 = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson";
const GEONAMES = "https://download.geonames.org/export/dump/cities500.zip";
// Uygulamanın şehir açılır listesi buradan geliyor (CountryCityFields). Kullanıcı yalnız
// bu adları seçebildiği için haritanın da tam olarak bu adları tanıması gerekir: liste
// "Cologne" diyor, GeoNames'in asıl adı "Köln"; eşleştirilmezse seçilen şehir haritada
// yerini bulamıyor (sessizce).
const COUNTRIESNOW = "https://countriesnow.space/api/v0.1/countries";
// Sürüm sabitlendi (9469f09): kaynak güncellense de üretim yeniden çalıştırılınca aynı çıktı gelsin.
const GB_IL = "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/TUR/ADM1/geoBoundaries-TUR-ADM1.geojson";
const GB_ILCE = "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/TUR/ADM2/geoBoundaries-TUR-ADM2.geojson";

// Müşterinin ilçe kırılımı istediği iller. Yalnız bunlar ilçelere bölünür; kalan 70 il
// olduğu gibi kalır. Buraya il eklemek için üreticiyi yeniden çalıştırmak yeterli.
const ILCE_ILLERI = ["İstanbul", "Ankara", "İzmir", "Manisa", "Antalya", "Tekirdağ",
  "Bursa", "Balıkesir", "Konya", "Kocaeli", "Muğla", "Samsun", "Çanakkale", "Hatay"];

// world-atlas'ın ülke adları COUNTRY_EN ile birebir tutmuyor; bu 4'ü elle bağlanır.
const DUNYA_ISTISNA = {
  "Türkiye": "Turkey",
  "Kuzey Kıbrıs Türk Cumhuriyeti": "N. Cyprus",
  "Bosna Hersek": "Bosnia and Herz.",
  "Çek Cumhuriyeti": "Czechia",
};
// admin-1 verisinin ülke adları da farklı yazılıyor.
const ADMIN_ISTISNA = {
  "Türkiye": "Turkey",
  "Kuzey Kıbrıs Türk Cumhuriyeti": "Northern Cyprus",
  "Bosna Hersek": "Bosnia and Herzegovina",
  "Çek Cumhuriyeti": "Czechia",
  "ABD": "United States of America",
  "Sırbistan": "Republic of Serbia",
};
// Şehir sözlüğü (GeoNames) ülke kodları. KKTC ayrı kod taşımaz, Kıbrıs (CY) altındadır.
const ISO2_ISTISNA = { "Kuzey Kıbrıs Türk Cumhuriyeti": "CY" };
// geoBoundaries ADM2 bazı ilçeleri eski/İngilizce ya da ASCII yazıyor; Türkçe resmî adıyla düzelt.
// (Form listesi ile harita aynı kaynaktan üretildiğinden düzeltme ikisine de yansır.)
const ILCE_ISIM_DUZELT = { "Imbros": "Gökçeada", "Ayvacik": "Ayvacık" };
const duzeltIlce = (ad) => ILCE_ISIM_DUZELT[ad] || ad;

const log = (...a) => console.log(...a);
const sad = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/ı/g, "i").replace(/[^a-z0-9]/g, "");
const norm = (s) => String(s).toLowerCase().replace(/[^a-z]/g, "");

async function indir(url, dosya) {
  const hedef = path.join(CACHE, dosya);
  if (fs.existsSync(hedef)) { log("  önbellekten:", dosya); return hedef; }
  fs.mkdirSync(CACHE, { recursive: true });
  log("  indiriliyor:", url);
  const r = await fetch(url);
  if (!r.ok) throw new Error("indirilemedi (" + r.status + "): " + url);
  fs.writeFileSync(hedef, Buffer.from(await r.arrayBuffer()));
  return hedef;
}

/** ZIP'ten tek bir dosyayı çıkarır (harici araç/paket gerekmesin diye).
 *  Boyutlar merkezi dizinden okunur: yerel başlıktaki boyut alanı 0 olabiliyor
 *  (veri tanımlayıcı kullanan arşivlerde) ve o zaman açma yarıda kesiliyor. */
function zipCoz(zipYolu, icDosya) {
  const b = fs.readFileSync(zipYolu);
  // Merkezi dizin sonu kaydını (EOCD) sondan ara
  let eocd = -1;
  for (let i = b.length - 22; i >= 0 && i > b.length - 65558; i--) {
    if (b.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("ZIP bozuk: merkezi dizin bulunamadı");
  let p = b.readUInt32LE(eocd + 16);
  const adet = b.readUInt16LE(eocd + 10);
  for (let n = 0; n < adet; n++) {
    if (b.readUInt32LE(p) !== 0x02014b50) throw new Error("ZIP bozuk: dizin kaydı okunamadı");
    const yontem = b.readUInt16LE(p + 10);
    const sikisik = b.readUInt32LE(p + 20);
    const adUz = b.readUInt16LE(p + 28);
    const ekUz = b.readUInt16LE(p + 30);
    const yorumUz = b.readUInt16LE(p + 32);
    const yerel = b.readUInt32LE(p + 42);
    const ad = b.slice(p + 46, p + 46 + adUz).toString();
    if (ad === icDosya) {
      const lAdUz = b.readUInt16LE(yerel + 26);
      const lEkUz = b.readUInt16LE(yerel + 28);
      const bas = yerel + 30 + lAdUz + lEkUz;
      const veri = b.slice(bas, bas + sikisik);
      return yontem === 0 ? veri : zlib.inflateRawSync(veri);
    }
    p += 46 + adUz + ekUz + yorumUz;
  }
  throw new Error("ZIP içinde bulunamadı: " + icDosya);
}

/** GeoJSON dış halkası saat yönünün TERSİ olmalı (RFC 7946). geoBoundaries bu kurala uymuyor
 *  ve d3-geo sarıma duyarlı: ters sarımlı poligonu "dünyanın geri kalanı" sanıyor (Kadıköy'ün
 *  merkezi Yeni Zelanda'nın güneyinde çıkıyordu). İşaret formülleri kolayca ters anlaşıldığı
 *  için burada doğrudan ÖLÇÜLÜR: alan yarım küreden büyükse halkalar çevrilir. */
function sarimiDuzelt(f, geoArea) {
  if (!f.geometry || geoArea(f) <= 2 * Math.PI) return f;
  const cev = (poly) => poly.map((r) => r.slice().reverse());
  const g = f.geometry;
  g.coordinates = g.type === "Polygon" ? cev(g.coordinates) : g.coordinates.map(cev);
  return f;
}

/* ───── Ülke görünümü için "ana kara" seçimi ─────
   Üç sorun çözülür:
   (1) Hollanda'nın Karayip adaları, Fransa'nın Guyana'sı gibi çok uzak topraklar haritaya
       sığdırılınca asıl ülke küçücük kalıyor.
   (2) ABD/Rusya/Yeni Zelanda tarih çizgisini aşıyor, Mercator onları ikiye bölüyor.
   (3) Uzak ada her zaman ayrı bir bölge değil: Paskalya Adası Valparaíso'ya, Ogasawara
       Tokyo'ya bağlı. Bu yüzden ayıklama bölge değil POLİGON seviyesinde yapılır.
   Ölçüt "uzaklık" değil, parçanın çizim çerçevesini ŞİŞİRMESİ: çerçeveyi %35'ten fazla
   büyütmeyen kalır (Kaliningrad gibi yakın exclave'ler), şişirse bile ana karanın beşte biri
   kadar büyükse yine kalır (Malezya'nın yarımadası, ABD'nin Alaska'sı). */
function anaKara(features, d3) {
  const { geoCentroid, geoArea } = d3;
  const merkezLon = geoCentroid({ type: "FeatureCollection", features })[0];
  const kaydir = (lon) => { let d = lon - merkezLon; while (d > 180) d -= 360; while (d < -180) d += 360; return d; };
  const kutuHesapla = (coords) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const gez = (c) => {
      if (typeof c[0] === "number") { const x = kaydir(c[0]); if (x < x0) x0 = x; if (x > x1) x1 = x; if (c[1] < y0) y0 = c[1]; if (c[1] > y1) y1 = c[1]; }
      else for (const q of c) gez(q);
    };
    gez(coords);
    return [x0, y0, x1, y1];
  };
  const bosluk = (A, B) => Math.max(0, A[0] - B[2], B[0] - A[2]) + Math.max(0, A[1] - B[3], B[1] - A[3]);

  const parcalar = [];
  features.forEach((f, fi) => {
    if (!f.geometry) return;
    const polys = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
    polys.forEach((poly, pi) => parcalar.push({ fi, pi, kutu: kutuHesapla(poly), alan: geoArea({ type: "Polygon", coordinates: poly }) }));
  });

  const ebeveyn = parcalar.map((_, i) => i);
  const bul = (i) => (ebeveyn[i] === i ? i : (ebeveyn[i] = bul(ebeveyn[i])));
  for (let i = 0; i < parcalar.length; i++)
    for (let j = i + 1; j < parcalar.length; j++)
      if (bosluk(parcalar[i].kutu, parcalar[j].kutu) < 2.5) { const a = bul(i), b = bul(j); if (a !== b) ebeveyn[b] = a; }

  const kumeler = new Map();
  parcalar.forEach((p, i) => {
    const k = bul(i);
    if (!kumeler.has(k)) kumeler.set(k, { parcalar: [], alan: 0, kutu: [Infinity, Infinity, -Infinity, -Infinity] });
    const c = kumeler.get(k);
    c.parcalar.push(p); c.alan += p.alan;
    c.kutu = [Math.min(c.kutu[0], p.kutu[0]), Math.min(c.kutu[1], p.kutu[1]), Math.max(c.kutu[2], p.kutu[2]), Math.max(c.kutu[3], p.kutu[3])];
  });
  const sirali = [...kumeler.values()].sort((a, b) => b.alan - a.alan);
  const ana = sirali[0];
  const en = (b) => b[2] - b[0], boy = (b) => b[3] - b[1];
  const sisme = (k) => {
    const u = [Math.min(ana.kutu[0], k.kutu[0]), Math.min(ana.kutu[1], k.kutu[1]), Math.max(ana.kutu[2], k.kutu[2]), Math.max(ana.kutu[3], k.kutu[3])];
    return Math.max(en(u) / Math.max(en(ana.kutu), 0.01), boy(u) / Math.max(boy(ana.kutu), 0.01));
  };
  const tutulan = new Set();
  for (const k of sirali)
    if (k === ana || sisme(k) < 1.35 || k.alan >= ana.alan * 0.2)
      for (const p of k.parcalar) tutulan.add(p.fi + ":" + p.pi);

  const yeni = [];
  features.forEach((f, fi) => {
    if (!f.geometry) return;
    const polys = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
    const kalan = polys.filter((_, pi) => tutulan.has(fi + ":" + pi));
    if (!kalan.length) return;
    yeni.push({ ...f, geometry: kalan.length === 1 ? { type: "Polygon", coordinates: kalan[0] } : { type: "MultiPolygon", coordinates: kalan } });
  });
  return { features: yeni, merkezLon, atilanBolge: features.length - yeni.length, atilanParca: parcalar.length - tutulan.size };
}

const basligi = () => `// ÜRETİLMİŞ DOSYA — elle düzenlemeyin.\n// Kaynak: scripts/gen-map-paths.cjs (Natural Earth + GeoNames). Yeniden üretmek için:\n//   node scripts/gen-map-paths.cjs\n`;

async function main() {
  const d3 = await import("d3-geo");
  const { feature } = await import("topojson-client");
  const { topology } = await import("topojson-server");
  const { presimplify, simplify, quantile } = await import("topojson-simplify");
  const { COUNTRIES, COUNTRY_EN, COUNTRY_ALT, staticCities } = await import(path.join(KOK, "src/lib/constants.js"));
  const { geoNaturalEarth1, geoMercator, geoPath, geoCentroid, geoContains, geoDistance, geoArea } = d3;

  log("1) Kaynaklar");
  const admin1Yol = await indir(NE_ADMIN1, "ne_10m_admin_1.geojson");
  const gnZip = await indir(GEONAMES, "cities500.zip");

  log("2) Dünya haritası (Natural Earth 50m)");
  const t50 = require("world-atlas/countries-50m.json");
  const dunyaTum = feature(t50, t50.objects.countries);
  // Antarktika dikeyde koca bir boşluk yaratıyor ve satış ihtimali yok
  const dunyaFc = { type: "FeatureCollection", features: dunyaTum.features.filter((f) => f.properties.name !== "Antarctica") };
  const W = 1000;
  const dProj = geoNaturalEarth1().fitWidth(W, dunyaFc);
  const dBounds = geoPath(dProj).bounds(dunyaFc);
  const H = Math.ceil(dBounds[1][1] - dBounds[0][1]);
  dProj.translate([dProj.translate()[0], dProj.translate()[1] - dBounds[0][1]]); // üstteki boşluğu kırp
  const dPath = geoPath(dProj);
  const kirp2 = (d) => d.replace(/(-?\d+\.\d{2})\d+/g, "$1");

  const adIndeks = new Map(dunyaFc.features.map((f) => [norm(f.properties.name), f]));
  const ULKELER = {};
  const kullanilan = new Set();
  for (const tr of COUNTRIES) {
    const f = [DUNYA_ISTISNA[tr], COUNTRY_EN[tr], COUNTRY_ALT[tr], tr].filter(Boolean).map((a) => adIndeks.get(norm(a))).find(Boolean);
    if (!f) throw new Error("Dünya haritasında eşleşmeyen ülke: " + tr + " (DUNYA_ISTISNA'ya ekleyin)");
    kullanilan.add(f);
    ULKELER[tr] = kirp2(dPath(f));
  }
  // Satış olamayacak ülkeler: tek tek çizilir ki kabartma efekti onlarda da olsun
  const ARKA_PLAN = dunyaFc.features.filter((f) => !kullanilan.has(f)).map((f) => kirp2(dPath(f))).filter(Boolean);
  log("   dünya " + W + "x" + H + " | ülke " + Object.keys(ULKELER).length + " | arka plan " + ARKA_PLAN.length);

  log("3) Şehir sözlüğü (GeoNames cities500)");
  const gnMetin = zipCoz(gnZip, "cities500.txt").toString("utf8");
  const gnUlke = {};    // ISO2 -> Map(sadeAd -> {koord, nufus})  — yalnız asıl adlar
  const gnTumAd = {};   // ISO2 -> Map(sadeAd -> {koord, nufus})  — alternatif adlar dahil;
                        // SADECE uygulamanın listesindeki adları çözmek için kullanılır
  let gnSayi = 0;
  for (const satir of gnMetin.split("\n")) {
    if (!satir) continue;
    const p = satir.split("\t");
    const uk = p[8];
    const m = (gnUlke[uk] ||= new Map());
    const kayit = { koord: [+p[5], +p[4]], nufus: +p[14] || 0 };
    // Yalnız asıl ad ve ASCII karşılığı indekslenir; GeoNames'in "alternatenames" sütunu
    // her dildeki okunuşu taşıyor (Çince, Arapça, Rusça...) ve dizini 10 katına çıkarıyor.
    // Ölçtük: onları atmak eşleşmeyi %81'den %79'a düşürüyor (Türkiye %98'de kalıyor),
    // buna karşılık veri 24 MB'tan ~2 MB'a iniyor.
    for (const a of [p[1], p[2]]) {
      const k = sad(a);
      if (!k) continue;
      const e = m.get(k);
      // Aynı adı taşıyan birden çok yer olabilir: en kalabalık olan kazanır.
      // (Yoksa "Ordu" Hatay'daki bir köye, "Aydın" Adana'daki bir köye düşüyor.)
      if (!e || kayit.nufus > e.nufus) m.set(k, kayit);
    }
    const t = (gnTumAd[uk] ||= new Map());
    for (const a of [p[1], p[2], ...(p[3] ? p[3].split(",") : [])]) {
      const k = sad(a);
      if (!k) continue;
      const e = t.get(k);
      if (!e || kayit.nufus > e.nufus) t.set(k, kayit);
    }
    gnSayi++;
  }
  log("   " + gnSayi + " yerleşim, " + Object.keys(gnUlke).length + " ülke");

  log("4) Uygulamanın şehir listesi (countriesnow)");
  let cnListe = {};
  try {
    const cnYol = await indir(COUNTRIESNOW, "countriesnow.json");
    const cn = JSON.parse(fs.readFileSync(cnYol, "utf8")).data || [];
    for (const c of cn) cnListe[norm(c.country)] = c.cities || [];
    log("   " + Object.keys(cnListe).length + " ülke, " + Object.values(cnListe).reduce((a, b) => a + b.length, 0) + " şehir adı");
  } catch (e) {
    log("   ! alınamadı (" + e.message + ") — dizin yalnız GeoNames asıl adlarıyla kurulacak");
  }

  log("5) Ülke bölgeleri (Natural Earth admin-1 10m)");
  const ne1 = JSON.parse(fs.readFileSync(admin1Yol, "utf8"));
  const adm = {};
  for (const f of ne1.features) (adm[f.properties.adm0_a3] ||= []).push(f);
  const adminAdIndeks = {};
  for (const [k, arr] of Object.entries(adm)) adminAdIndeks[norm(arr[0].properties.admin)] = k;

  fs.rmSync(path.join(CIKTI, "regions"), { recursive: true, force: true });
  fs.mkdirSync(path.join(CIKTI, "regions"), { recursive: true });

  const ULKE_KOD = {};
  const PIN_ESIK = 15000; // pin konabilecek şehir için asgari nüfus
const ozet = { ulke: 0, bolge: 0, sehir: 0, konum: 0, bolgesiz: [], atilan: {} };

  for (const tr of COUNTRIES) {
    const iso3 = [ADMIN_ISTISNA[tr], COUNTRY_EN[tr], COUNTRY_ALT[tr], tr].filter(Boolean).map((a) => adminAdIndeks[norm(a)]).find(Boolean);
    if (!iso3 || !adm[iso3]) { ozet.bolgesiz.push(tr); continue; }
    ULKE_KOD[tr] = iso3;

    const ana = anaKara(adm[iso3], d3);
    if (ana.atilanParca) ozet.atilan[tr] = ana.atilanParca;

    // Çizim için sadeleştir (10m ülke ölçeğinde aşırı detaylı)
    let topo = topology({ x: { type: "FeatureCollection", features: ana.features } });
    topo = presimplify(topo);
    topo = simplify(topo, quantile(topo, 0.2));
    const sade = feature(topo, topo.objects.x);

    // rotate: tarih çizgisini aşan ülkeler parçalanmasın
    const p = geoMercator().rotate([-ana.merkezLon, 0]).fitWidth(1000, sade);
    const bb = geoPath(p).bounds(sade);
    const hU = Math.ceil(bb[1][1] - bb[0][1]);
    p.translate([p.translate()[0], p.translate()[1] - bb[0][1]]);
    const pa = geoPath(p);

    const bolgeAdi = (f) => f.properties.name_tr || f.properties.name_en || f.properties.name;
    const BOLGE_ADLARI = [];
    const BOLGELER = [];
    for (const f of sade.features) {
      const d = pa(f);
      if (!d) continue;
      BOLGE_ADLARI.push(bolgeAdi(f));
      BOLGELER.push(d.replace(/(-?\d+\.\d)\d+/g, "$1"));
    }
    ozet.bolge += BOLGE_ADLARI.length;

    // Şehir dizini: sadeleştirilmemiş sınırlarla (sadeleştirilmiş sınır kıyıdaki şehirleri
    // dışarıda bırakıyor). Değer: [bölgeSırası, dünyaX, dünyaY, ülkeX, ülkeY] — pinler ve
    // boyama çalışma anında hesap yapmadan bu dizinden okunur.
    const iso2 = ISO2_ISTISNA[tr] || (ne1.features.find((f) => f.properties.adm0_a3 === iso3)?.properties.iso_a2) || "";
    const gm = gnUlke[iso2] || new Map();
    const hamBolgeler = ana.features;
    const merkezler = hamBolgeler.map((f) => geoCentroid(f));
    const adaBolge = new Map(hamBolgeler.map((f, i) => [sad(bolgeAdi(f)), i]));
    const SEHIR = {};   // her şehir: hangi bölgeyi boyayacak
    const KONUM = {};   // yalnız pin konabilecek şehirler: nerede çizilecek
    const cozulemeyen = [];
    for (const [sadAd, kayit] of gm) {
      // Şehir adı doğrudan bir bölge adıysa sözlüğe hiç gitme (Türkiye'de şehir = il;
      // Berlin/Hamburg gibi şehir-devletlerinde de doğru sonuç).
      let i = adaBolge.has(sadAd) ? adaBolge.get(sadAd) : -1;
      if (i < 0) {
        const bulunan = hamBolgeler.findIndex((f) => geoContains(f, kayit.koord));
        if (bulunan >= 0) i = bulunan;
      }
      if (i < 0) {
        // Sınırın hemen dışına düşenler en yakın bölgeye kar: bölünmüş şehirler (Lefkoşa'nın
        // koordinatı güney tarafta kalıyor) ve kıyı hassasiyeti kayba yol açmasın.
        let enKisa = Infinity, enYakin = -1;
        merkezler.forEach((m, j) => {
          const d = geoDistance(m, kayit.koord) * 180 / Math.PI;
          if (d < enKisa) { enKisa = d; enYakin = j; }
        });
        if (enKisa < 1.0) i = enYakin;
      }
      if (i < 0) continue;
      // Sadeleştirme sonrası bölge düşmüş olabilir: adına göre yeni sırayı bul
      const yeniSira = BOLGE_ADLARI.indexOf(bolgeAdi(hamBolgeler[i]));
      if (yeniSira < 0) continue;
      SEHIR[sadAd] = yeniSira;
      // Koordinat yalnız pin için gerekli (fabrika + bayiler) ve onlar gerçek şehirlerde
      // olur; 187 bin köyün koordinatını taşımak veriyi 3 katına çıkarıyordu.
      if (kayit.nufus >= PIN_ESIK) {
        const [dx, dy] = dProj(kayit.koord);
        const [ux, uy] = p(kayit.koord);
        KONUM[sadAd] = [+dx.toFixed(1), +dy.toFixed(1), +ux.toFixed(1), +uy.toFixed(1)];
      }
    }
    // Uygulamanın açılır listesindeki adları da indeksle. Liste İngilizce dış adları
    // kullanıyor ("Cologne", "Munich"), GeoNames'in asıl adı ise yerel ("Köln"): eşleştirmezsek
    // kullanıcı listeden şehri seçiyor ama harita tanımıyor ve bu sessizce oluyor.
    // Alternatif adlar YALNIZ burada devreye girer; tamamını indekslemek veriyi 10 katına
    // çıkarıyordu (her dildeki okunuş) ve hiçbir işe yaramıyordu.
    const gt = gnTumAd[iso2] || new Map();
    const cnAdlar = cnListe[norm(ADMIN_ISTISNA[tr] || COUNTRY_EN[tr] || tr)] || cnListe[norm(COUNTRY_EN[tr] || "")] || [];
    let cnEklenen = 0;
    for (const sehir of cnAdlar) {
      const k = sad(sehir);
      if (!k || k in SEHIR) continue;
      const kayit = gt.get(k);
      if (!kayit) continue;
      let i = hamBolgeler.findIndex((f) => geoContains(f, kayit.koord));
      if (i < 0) {
        let enKisa = Infinity, enYakin = -1;
        merkezler.forEach((m, j) => { const d = geoDistance(m, kayit.koord) * 180 / Math.PI; if (d < enKisa) { enKisa = d; enYakin = j; } });
        if (enKisa < 1.0) i = enYakin;
      }
      if (i < 0) continue;
      const ys = BOLGE_ADLARI.indexOf(bolgeAdi(hamBolgeler[i]));
      if (ys < 0) continue;
      SEHIR[k] = ys;
      if (kayit.nufus >= PIN_ESIK) {
        const [dx, dy] = dProj(kayit.koord);
        const [ux, uy] = p(kayit.koord);
        KONUM[k] = [+dx.toFixed(1), +dy.toFixed(1), +ux.toFixed(1), +uy.toFixed(1)];
      }
      cnEklenen++;
    }
    if (cnEklenen) ozet.cnEk = (ozet.cnEk || 0) + cnEklenen;

    // Bölge adının kendisi de anahtar olmalı. Dizin GeoNames kayıtları üzerinde kurulduğu
    // için, sözlükte şehir olarak geçmeyen bir bölge adı hiç indekslenmiyordu: kullanıcı
    // "Hatay" seçiyor ama sözlükte oranın adı "Antakya" (aynısı Sakarya/Adapazarı).
    BOLGE_ADLARI.forEach((ad, i) => { const k = sad(ad); if (!(k in SEHIR)) SEHIR[k] = i; });

    // Programın kendi sabit şehir listesi (yalnız Türkiye ve KKTC dolu) MUTLAKA otursun:
    // kullanıcının seçebildiği her adın haritada karşılığı olmalı.
    for (const sehir of (staticCities(tr) || [])) {
      const k = sad(sehir);
      if (k in SEHIR) continue;
      const kayit = gm.get(k);
      let i = -1;
      if (kayit) {
        i = hamBolgeler.findIndex((f) => geoContains(f, kayit.koord));
        if (i < 0) {
          let enKisa = Infinity;
          merkezler.forEach((m, j) => { const d = geoDistance(m, kayit.koord) * 180 / Math.PI; if (d < enKisa) { enKisa = d; i = j; } });
          if (enKisa >= 1.0) i = -1;
        }
      }
      // Ülkenin tek bölgesi varsa gidecek başka yer yok (KKTC: 6 ilçe, tek bölge)
      if (i < 0 && BOLGE_ADLARI.length === 1) { SEHIR[k] = 0; continue; }
      if (i < 0) { cozulemeyen.push(sehir); continue; }
      const ys = BOLGE_ADLARI.indexOf(bolgeAdi(hamBolgeler[i]));
      if (ys >= 0) SEHIR[k] = ys;
    }
    if (cozulemeyen.length) console.log("   ! " + tr + " program listesinde olup haritada yeri bulunamayan: " + cozulemeyen.join(", "));

    ozet.sehir += Object.keys(SEHIR).length;
    ozet.konum += Object.keys(KONUM).length;
    ozet.ulke++;

    const govde = basligi()
      + `export const W = 1000;\nexport const H = ${hU};\n`
      + `export const BOLGE_ADLARI = ${JSON.stringify(BOLGE_ADLARI)};\n`
      + `export const BOLGELER = ${JSON.stringify(BOLGELER)};\n`
      + `// sadeAd -> bölge sırası (BOLGELER dizisindeki indeks)\n`
      + `export const SEHIR = ${JSON.stringify(SEHIR)};\n`
      + `// sadeAd -> [dünyaX, dünyaY, ülkeX, ülkeY] — yalnız pin konabilecek şehirler\n`
      + `export const KONUM = ${JSON.stringify(KONUM)};\n`;
    fs.writeFileSync(path.join(CIKTI, "regions", iso3 + ".js"), govde);
  }

  log("   " + ozet.ulke + " ülke, " + ozet.bolge + " bölge, " + ozet.sehir + " şehir (" + ozet.konum + " tanesi pin konabilir)");
  log("   uygulamanın listesinden eklenen ad: " + (ozet.cnEk || 0) + " (ör. \"Cologne\" -> Köln)");
  if (ozet.bolgesiz.length) log("   ! bölge verisi olmayan: " + ozet.bolgesiz.join(", "));

  log("6) Türkiye ilçe haritaları (geoBoundaries, ODbL)");
  const ilYol = await indir(GB_IL, "gb-tur-adm1.geojson");
  const ilceYol = await indir(GB_ILCE, "gb-tur-adm2.geojson");
  const gbIl = JSON.parse(fs.readFileSync(ilYol, "utf8"));
  const gbIlce = JSON.parse(fs.readFileSync(ilceYol, "utf8"));
  gbIl.features.forEach((f) => sarimiDuzelt(f, geoArea));
  gbIlce.features.forEach((f) => sarimiDuzelt(f, geoArea));

  // İlçeyi iline ata. İl sınırları AYNI kaynaktan alınır: Natural Earth'ün il sınırlarıyla
  // atayınca sınırlar örtüşmediği için Tuzla İstanbul yerine Kocaeli'ye düşüyordu (11 ilin
  // yalnız 6'sı resmî sayıyı tutuyordu). Aynı kaynakla 11/11 tutuyor.
  const ilceGrup = {};
  const ilMerkez = gbIl.features.map((f) => geoCentroid(f));
  for (const f of gbIlce.features) {
    const c = geoCentroid(f);
    let il = gbIl.features.find((x) => geoContains(x, c));
    if (!il) { // kıyı/ada ilçesi sınırın dışına düşebilir: en yakın ile ver
      let enKisa = Infinity;
      gbIl.features.forEach((x, i) => { const d = geoDistance(ilMerkez[i], c); if (d < enKisa) { enKisa = d; il = x; } });
    }
    (ilceGrup[il.properties.shapeName] ||= []).push(f);
  }

  fs.rmSync(path.join(CIKTI, "ilce"), { recursive: true, force: true });
  fs.mkdirSync(path.join(CIKTI, "ilce"), { recursive: true });
  const ILCELER = {};   // il -> ilçe adları (form listesi; harita ile aynı kaynaktan)
  let ilceKb = 0;
  for (const il of ILCE_ILLERI) {
    const grup = ilceGrup[il];
    if (!grup || !grup.length) throw new Error("İlçesi bulunamayan il: " + il);
    let topo = topology({ x: { type: "FeatureCollection", features: grup } });
    topo = presimplify(topo);
    topo = simplify(topo, quantile(topo, 0.15));
    const sade = feature(topo, topo.objects.x);
    const p = geoMercator().fitWidth(1000, sade);
    const bb = geoPath(p).bounds(sade);
    const hU = Math.ceil(bb[1][1] - bb[0][1]);
    p.translate([p.translate()[0], p.translate()[1] - bb[0][1]]);
    const pa = geoPath(p);
    const ADLAR = [], CIZIM = [], MERKEZ = [];
    for (const f of sade.features) {
      const d = pa(f);
      if (!d) continue;
      ADLAR.push(duzeltIlce(f.properties.shapeName));
      CIZIM.push(d.replace(/(-?\d+\.\d)\d+/g, "$1"));
      // İlçe merkezi, o ilin KENDİ projeksiyonunda: ilçe görünümündeki fabrika/bayi pinleri
      // buradan konumlanır. Ülke projeksiyonunun koordinatları burada geçersizdir.
      const [mx, my] = p(geoCentroid(f));
      MERKEZ.push([+mx.toFixed(1), +my.toFixed(1)]);
      ilceKb += CIZIM[CIZIM.length - 1].length;
    }
    ILCELER[il] = [...ADLAR].sort((a, b) => a.localeCompare(b, "tr"));
    fs.writeFileSync(path.join(CIKTI, "ilce", sad(il) + ".js"), basligi()
      + `export const W = 1000;\nexport const H = ${hU};\n`
      + `export const ILCE_ADLARI = ${JSON.stringify(ADLAR)};\n`
      + `export const ILCELER = ${JSON.stringify(CIZIM)};\n`
      + `// ilçe merkezleri (bu ilin projeksiyonunda) — pinler için\n`
      + `export const ILCE_MERKEZ = ${JSON.stringify(MERKEZ)};\n`);
    log("   " + il.padEnd(12) + String(ADLAR.length).padStart(3) + " ilçe");
  }
  fs.writeFileSync(path.join(CIKTI, "ilceler.js"), basligi()
    + `// İlçe kırılımı olan iller. Form (CountryCityFields) ve harita AYNI kaynaktan beslenir,\n`
    + `// böylece "listede var ama haritada yok" durumu yapısal olarak imkânsızdır.\n`
    + `export const ILCE_ILLERI = ${JSON.stringify(ILCE_ILLERI)};\n`
    + `export const ILCELER = ${JSON.stringify(ILCELER)};\n`);
  log("   toplam " + Object.values(ILCELER).reduce((a, b) => a + b.length, 0) + " ilçe, çizim " + (ilceKb / 1024).toFixed(0) + " KB");

  log("7) Dosyalar yazılıyor");
  fs.writeFileSync(path.join(CIKTI, "world.js"), basligi()
    + `export const W = ${W};\nexport const H = ${H};\n`
    + `// Türkçe ülke adı -> SVG çizimi (satış olabilecek 86 ülke)\n`
    + `export const ULKELER = ${JSON.stringify(ULKELER)};\n`
    + `// Türkçe ülke adı -> ISO3 kodu (bölge dosyasının adı)\n`
    + `export const ULKE_KOD = ${JSON.stringify(ULKE_KOD)};\n`
    + `// Satış listesinde olmayan ülkeler: gri arka plan, tıklanmaz\n`
    + `export const ARKA_PLAN = ${JSON.stringify(ARKA_PLAN)};\n`);
  fs.writeFileSync(path.join(CIKTI, "meta.js"), basligi()
    + `export const META = ${JSON.stringify({ ulke: ozet.ulke, bolge: ozet.bolge, sehir: ozet.sehir, konum: ozet.konum, bolgesiz: ozet.bolgesiz, ilceIlleri: ILCE_ILLERI.length, W, H }, null, 2)};\n`);

  const boyut = (p) => fs.statSync(p).size;
  const worldKb = boyut(path.join(CIKTI, "world.js")) / 1024;
  const bolgeDosyalari = fs.readdirSync(path.join(CIKTI, "regions"));
  const bolgeKb = bolgeDosyalari.reduce((a, f) => a + boyut(path.join(CIKTI, "regions", f)), 0) / 1024;
  log("");
  log("   world.js            " + worldKb.toFixed(0) + " KB (Harita açılınca yüklenir)");
  log("   regions/*.js        " + bolgeKb.toFixed(0) + " KB / " + bolgeDosyalari.length + " dosya (ülkeye tıklayınca, sadece o ülkeninki)");
  log("   en büyük ülke       " + bolgeDosyalari.map((f) => [f, boyut(path.join(CIKTI, "regions", f)) / 1024]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([f, k]) => f + " " + k.toFixed(0) + "KB").join(", "));
  log("");
  log("Bitti. Üretilen dosyalar commit edilmelidir.");
}

main().catch((e) => { console.error("HATA:", e.message); process.exit(1); });
