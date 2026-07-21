// ÜRETİCİ: src/lib/map/world-arkaplan.js — dünya haritasında satış listesi (86 ülke) DIŞINDA
// kalan "arka plan" ülkelerinin adı + etiket konumu. Faaliyet haritası artık satışsız yerlerin
// de adını yazıyor; world.js'in ARKA_PLAN'ı yalnız yol dizeleri (adsız) taşıdığından adlar burada
// üretilir. Çevrimdışı çalışır: yalnız world-atlas (yerel paket) + d3-geo (devDependency).
//
// Projeksiyon, gen-map-paths.cjs'in dünya projeksiyonuyla BİREBİR aynı olmalı (aynı fitWidth +
// üstteki boşluğu kırpan translate); yoksa etiketler yollarla aynı koordinat uzayına oturmaz.
// "Kullanılan 86 ülke" kümesi de aynı eşleştirme mantığıyla (DUNYA_ISTISNA + constants) bulunur,
// böylece arka plan kümesi world.js'in ARKA_PLAN'ıyla aynı olur.
//
// Çalıştır:  node scripts/gen-arkaplan-adlar.cjs
//
// Küçük ada/şehir-devletleri (projeksiyon alanı < ALAN_ESIGI) etiketlenmez: dünya ölçeğinde
// nokta kadar kaldıkları için adları yalnız kalabalık yaratır (Vatikan, Monako, Malta, Lüksemburg…).

const fs = require("fs");
const path = require("path");
const KOK = path.join(__dirname, "..");

// gen-map-paths.cjs ile aynı (oradan kopya — ikisi ayrışırsa arka plan kümesi world.js'ten kayar).
const DUNYA_ISTISNA = {
  "Türkiye": "Turkey",
  "Kuzey Kıbrıs Türk Cumhuriyeti": "N. Cyprus",
  "Bosna Hersek": "Bosnia and Herz.",
  "Çek Cumhuriyeti": "Czechia",
  "Demokratik Kongo Cumhuriyeti": "Dem. Rep. Congo",
  "Ekvator Ginesi": "Eq. Guinea",
  "Esvatini": "eSwatini",
  "Fildişi Sahili": "Côte d'Ivoire",
  "Güney Sudan": "S. Sudan",
  "Kongo": "Congo",
  "Orta Afrika Cumhuriyeti": "Central African Rep.",
  "Cabo Verde": "Cabo Verde",
  "Sao Tome ve Principe": "São Tomé and Principe",
  "Vatikan": "Vatican",
  "Dominik Cumhuriyeti": "Dominican Rep.",
  "Antigua ve Barbuda": "Antigua and Barb.",
  "Saint Kitts ve Nevis": "St. Kitts and Nevis",
  "Saint Vincent ve Grenadinler": "St. Vin. and Gren.",
  "Marshall Adaları": "Marshall Is.",
  "Solomon Adaları": "Solomon Is.",
};
const norm = (s) => String(s).toLowerCase().replace(/[^a-z]/g, "");
const ALAN_ESIGI = 3; // projeksiyon alanı (piksel²); altı etiketlenmez —
// ANCAK aşağıdaki küçük EGEMEN ülkeler alanı eşiğin altında olsa da etiketlenir (Lüksemburg,
// Malta gibi gerçek ülkeler dünya ölçeğinde nokta kadar ama kullanıcı adlarını istiyor).
// Kasıtlı olarak DIŞARIDA bırakılanlar: bağımlı topraklar (Bermuda, Hong Kong, Guernsey, Aruba…)
// ve coğrafi oluşumlar (Siachen Buzulu, ıssız ada grupları) — bunlar "ülke" değil, yalnız kalabalık.
const KUCUK_ULKE = new Set([
  "Vatican", "Nauru", "Monaco", "Maldives", "San Marino", "Liechtenstein", "Marshall Is.",
  "St. Vin. and Gren.", "St. Kitts and Nevis", "Malta", "Grenada", "Tonga", "Palau", "Barbados",
  "Antigua and Barb.", "Micronesia", "Saint Lucia", "Andorra", "Dominica", "São Tomé and Principe",
  "Kiribati", "Comoros", "Mauritius", "Samoa", "Luxembourg", "Cabo Verde", "Seychelles",
]);

// world-atlas ülke adı (İngilizce) -> Türkçe. Yalnız arka plan (satış listesi dışı) ülkeler için.
// Listede olmayan bir ülke çıkarsa İngilizce adıyla yazılır (ve uyarı basılır).
const TR = {
  "Angola": "Angola", "Armenia": "Ermenistan", "Bahamas": "Bahamalar", "Bangladesh": "Bangladeş",
  "Belize": "Belize", "Benin": "Benin", "Bhutan": "Butan", "Bolivia": "Bolivya", "Botswana": "Botsvana",
  "Brunei": "Brunei", "Burkina Faso": "Burkina Faso", "Burundi": "Burundi", "Cambodia": "Kamboçya",
  "Cameroon": "Kamerun", "Central African Rep.": "Orta Afrika Cumhuriyeti", "Chad": "Çad",
  "Congo": "Kongo", "Costa Rica": "Kosta Rika", "Cuba": "Küba", "Cyprus": "Güney Kıbrıs",
  "Côte d'Ivoire": "Fildişi Sahili", "Dem. Rep. Congo": "Demokratik Kongo Cumhuriyeti",
  "Djibouti": "Cibuti", "Dominican Rep.": "Dominik Cumhuriyeti", "Ecuador": "Ekvador",
  "El Salvador": "El Salvador", "Eq. Guinea": "Ekvator Ginesi", "Eritrea": "Eritre",
  "Falkland Is.": "Falkland Adaları", "Fiji": "Fiji", "Fr. S. Antarctic Lands": "Fransız Güney ve Antarktika Toprakları",
  "Gabon": "Gabon", "Gambia": "Gambiya", "Ghana": "Gana", "Greenland": "Grönland",
  "Guatemala": "Guatemala", "Guinea": "Gine", "Guinea-Bissau": "Gine-Bissau", "Guyana": "Guyana",
  "Haiti": "Haiti", "Honduras": "Honduras", "Iceland": "İzlanda", "Jamaica": "Jamaika",
  "Laos": "Laos", "Latvia": "Letonya", "Lesotho": "Lesotho", "Liberia": "Liberya",
  "Madagascar": "Madagaskar", "Malawi": "Malavi", "Mali": "Mali", "Mauritania": "Moritanya",
  "Mongolia": "Moğolistan", "Mozambique": "Mozambik", "Myanmar": "Myanmar", "Namibia": "Namibya",
  "Nepal": "Nepal", "New Caledonia": "Yeni Kaledonya", "Nicaragua": "Nikaragua", "Niger": "Nijer",
  "North Korea": "Kuzey Kore", "Palestine": "Filistin", "Panama": "Panama",
  "Papua New Guinea": "Papua Yeni Gine", "Paraguay": "Paraguay", "Peru": "Peru",
  "Puerto Rico": "Porto Riko", "Rwanda": "Ruanda", "S. Geo. and the Is.": "Güney Georgia",
  "S. Sudan": "Güney Sudan", "Senegal": "Senegal", "Sierra Leone": "Sierra Leone",
  "Solomon Is.": "Solomon Adaları", "Somalia": "Somali", "Somaliland": "Somaliland",
  "Sri Lanka": "Sri Lanka", "Sudan": "Sudan", "Suriname": "Surinam", "Syria": "Suriye",
  "Taiwan": "Tayvan", "Tanzania": "Tanzanya", "Timor-Leste": "Doğu Timor", "Togo": "Togo",
  "Trinidad and Tobago": "Trinidad ve Tobago", "Uganda": "Uganda", "Uruguay": "Uruguay",
  "Vanuatu": "Vanuatu", "Venezuela": "Venezuela", "W. Sahara": "Batı Sahra", "Yemen": "Yemen",
  "Zambia": "Zambiya", "Zimbabwe": "Zimbabve", "eSwatini": "Esvatini",
  // Küçük egemen ülkeler (KUCUK_ULKE ile eşiğin altında da eklenenler)
  "Vatican": "Vatikan", "Nauru": "Nauru", "Monaco": "Monako", "Maldives": "Maldivler",
  "San Marino": "San Marino", "Liechtenstein": "Liechtenstein", "Marshall Is.": "Marshall Adaları",
  "St. Vin. and Gren.": "Saint Vincent ve Grenadinler", "St. Kitts and Nevis": "Saint Kitts ve Nevis",
  "Malta": "Malta", "Grenada": "Grenada", "Tonga": "Tonga", "Palau": "Palau", "Barbados": "Barbados",
  "Antigua and Barb.": "Antigua ve Barbuda", "Micronesia": "Mikronezya", "Saint Lucia": "Saint Lucia",
  "Andorra": "Andorra", "Dominica": "Dominika", "São Tomé and Principe": "Sao Tome ve Principe",
  "Kiribati": "Kiribati", "Comoros": "Komorlar", "Mauritius": "Mauritius", "Samoa": "Samoa",
  "Luxembourg": "Lüksemburg", "Cabo Verde": "Cabo Verde", "Seychelles": "Seyşeller",
};

async function main() {
  const tc = require("topojson-client");
  const d3 = await import("d3-geo");
  const c = await import(path.join(KOK, "src/lib/constants.js"));
  const { COUNTRIES, COUNTRY_EN, COUNTRY_ALT } = c;

  const t = require("world-atlas/countries-50m.json");
  const feats = tc.feature(t, t.objects.countries).features.filter((f) => f.properties.name !== "Antarctica");
  const W = 1000;
  const fcTum = { type: "FeatureCollection", features: feats };
  const dProj = d3.geoNaturalEarth1().fitWidth(W, fcTum);
  const b = d3.geoPath(dProj).bounds(fcTum);
  dProj.translate([dProj.translate()[0], dProj.translate()[1] - b[0][1]]); // üstteki boşluğu kırp
  const gp = d3.geoPath(dProj);

  const idx = new Map(feats.map((f) => [norm(f.properties.name), f]));
  const kullanilan = new Set();
  for (const tr of COUNTRIES) {
    const f = [DUNYA_ISTISNA[tr], COUNTRY_EN[tr], COUNTRY_ALT[tr], tr].filter(Boolean).map((a) => idx.get(norm(a))).find(Boolean);
    if (f) kullanilan.add(f);
  }

  const eksik = [];
  const kayitlar = feats
    .filter((f) => !kullanilan.has(f) && (gp.area(f) >= ALAN_ESIGI || KUCUK_ULKE.has(f.properties.name)))
    .map((f) => {
      const en = f.properties.name;
      const ad = TR[en] || (eksik.push(en), en);
      const [x, y] = gp.centroid(f);
      return { ad, x: +x.toFixed(1), y: +y.toFixed(1) };
    })
    .filter((r) => Number.isFinite(r.x) && Number.isFinite(r.y))
    .sort((a, b2) => a.ad.localeCompare(b2.ad, "tr"));

  if (eksik.length) console.log("! Türkçe karşılığı yok (İngilizce yazıldı):", eksik.join(", "));

  const govde = "// ÜRETİLMİŞ DOSYA — elle düzenlemeyin. Kaynak: scripts/gen-arkaplan-adlar.cjs\n"
    + "// Satış listesi (86 ülke) dışındaki ülkelerin adı + dünya projeksiyonundaki etiket konumu.\n"
    + "// Faaliyet haritasında satışsız yerlerin adı da yazılıyor; bu ülkeler world.js'te adsız.\n"
    + "export const ARKA_PLAN_AD = " + JSON.stringify(kayitlar) + ";\n";
  const hedef = path.join(KOK, "src/lib/map/world-arkaplan.js");
  fs.writeFileSync(hedef, govde);
  console.log("✓ yazıldı:", path.relative(KOK, hedef), "—", kayitlar.length, "ülke");
}

main().catch((e) => { console.error(e); process.exit(1); });
