import { trLower } from "./utils";

// Pin ipucunda görünen etiketler
const BAYI_ETIKET = { bayi: "bayi", servis: "anlaşmalı servis", ikisi: "bayi + anlaşmalı servis" };

/**
 * Pin boyları. Üç görünümde de bayi fabrikadan KÜÇÜK kalır (kullanıcının kuralı), ama
 * yakınlaştıkça hepsi büyür: dünyada ülkeler küçük olduğu için pin de ölçülü olmalı
 * (yoksa Türkiye'yi kapatıyor), ülke ve ilçe görünümünde ise yer bol.
 */
const PIN_BOY = {
  dunya: { fabrika: 0.9, bayi: 0.68 },
  ulke:  { fabrika: 1.35, bayi: 1.05 },
  ilce:  { fabrika: 1.6, bayi: 1.3 },
};

// Harita sekmesinin saf hesap katmanı. Çizimden bağımsız tutuldu ki testlenebilsin.

/**
 * Ad normalize: aksan/harf farklarını yok sayar ("Köln" -> "koln", "Şırnak" -> "sirnak").
 * DİKKAT: scripts/gen-map-paths.cjs içindeki `sad` ile BİREBİR aynı olmalı — şehir dizini
 * orada bu anahtarla üretiliyor, burada bu anahtarla aranıyor. İkisi ayrışırsa hiçbir şehir
 * haritada yerini bulamaz (sessiz bozulma). tests/map-stats.test.js bunu kilitler.
 */
export const sadeAd = (s) => String(s ?? "").toLowerCase().normalize("NFD")
  .replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]/g, "");

/**
 * Şehir adı takma-ad (alias) tablosu: sadeAd(kullanıcının yazdığı) -> sadeAd(dizindeki asıl ad).
 * Harita verisi GeoNames'in ASIL adını indeksliyor; kullanıcı yaygın başka bir yazımı girince
 * (ör. "Mazar-i-Sharif" / "Mezar-ı Şerif" ama dizinde "Mazar-e Sharif") eşleşme kaçıyor ve şehir
 * haritada boyanmıyordu. Bu, veriyi 8 MB yeniden üretmeden büyük şehirlerin bilinen yazım
 * farklarını kapatır. Yeni bir kaçak çıkarsa buraya tek satır eklenir. Anahtar ve değer sadeAd'li.
 */
export const SEHIR_ALIAS = {
  mazarisharif: "mazaresharif",   // Mazar-i-Sharif
  mezariserif: "mazaresharif",    // Mezar-ı Şerif (TR)
  mazarsharif: "mazaresharif",
  sharif: "mazaresharif",         // yalnız "Sharif" yazılmış kayıt (kullanıcının verisi)
  serif: "mazaresharif",          // "Şerif" (TR) — sadeAd: serif
  munchen: "munich",              // München — dizinde İngilizce "Munich" ile var
  munih: "munich",                // Münih (TR)
};

/** Şehri dizinde aramak için normalize edilmiş anahtar (takma ad varsa asıl ada çevirir). */
export const sehirAnahtar = (sehir) => {
  const k = sadeAd(sehir);
  return SEHIR_ALIAS[k] || k;
};

/**
 * Müşteri kayıtlarını ülke bazında özetler.
 * Bir müşteri kaydı = bir makina (Customers.jsx:440 ile aynı sayım); firma sayısı ise
 * aynı ülkedeki aynı isimler tekilleştirilerek bulunur.
 * @returns {Record<string, { makina: number, firma: number, sehirler: Record<string, number> }>}
 */
export const haritaOzeti = (customers = []) => {
  const out = {};
  const firmalar = {};
  for (const c of customers || []) {
    const ulke = String(c?.country ?? "").trim();
    if (!ulke) continue;
    if (!out[ulke]) { out[ulke] = { makina: 0, firma: 0, sehirler: {} }; firmalar[ulke] = new Set(); }
    out[ulke].makina++;
    const sehir = String(c?.city ?? "").trim();
    if (sehir) out[ulke].sehirler[sehir] = (out[ulke].sehirler[sehir] || 0) + 1;
    const ad = trLower(String(c?.name ?? "").trim());
    if (ad) firmalar[ulke].add(ad);
  }
  for (const [ulke, o] of Object.entries(out)) o.firma = firmalar[ulke].size;
  return out;
};

/**
 * Bir ülkenin şehir -> firma listesi kırılımı. Yan panelde her şehrin altında o şehirdeki
 * firmalar makina sayısıyla gösterilir. Aynı firma (isim, trLower ile büyük/küçük harf
 * duyarsız) aynı şehirde birden çok makina kaydı taşıyorsa TEK satırda toplanır ve sayısı
 * yazılır (haritaOzeti'nin firma sayımıyla aynı tekilleştirme kuralı).
 * @returns {Record<string, Array<{ ad: string, adet: number }>>} şehir -> makina çok olan üstte
 */
export const sehirFirmaKirilim = (customers = [], ulke = "") => {
  const out = {}; // sehir -> Map(trLower(ad) -> { ad, adet })
  for (const c of customers || []) {
    if (String(c?.country ?? "").trim() !== ulke) continue;
    const sehir = String(c?.city ?? "").trim();
    if (!sehir) continue;
    const ad = String(c?.name ?? "").trim() || "(isimsiz)";
    const anahtar = trLower(ad);
    const m = (out[sehir] ||= new Map());
    const mevcut = m.get(anahtar);
    if (mevcut) mevcut.adet++;
    else m.set(anahtar, { ad, adet: 1 });
  }
  const res = {};
  for (const [sehir, m] of Object.entries(out)) {
    res[sehir] = [...m.values()].sort((a, b) => b.adet - a.adet || a.ad.localeCompare(b.ad, "tr"));
  }
  return res;
};

/** Dünya görünümü üst satırı: kaç ülke, kaç şehir, kaç makina, kaç firma. */
export const dunyaToplami = (ozet = {}) => {
  const ulkeler = Object.keys(ozet);
  return {
    ulke: ulkeler.length,
    sehir: ulkeler.reduce((a, u) => a + Object.keys(ozet[u].sehirler).length, 0),
    makina: ulkeler.reduce((a, u) => a + ozet[u].makina, 0),
    firma: ulkeler.reduce((a, u) => a + ozet[u].firma, 0),
    enCok: ulkeler.sort((a, b) => ozet[b].makina - ozet[a].makina)[0] || null,
  };
};

/**
 * Bir ülkenin şehir satışlarını bölgelerine toplar: "Köln 4" -> Kuzey Ren-Vestfalya 4.
 * @param sehirler {Record<string, number>} şehir adı -> makina
 * @param dizin {Record<string, number>} sadeAd -> bölge sırası
 * @returns {{ bolgeler: Record<number, number>, eslesmeyen: string[] }}
 *          eslesmeyen: sözlükte olmayan küçük yerleşimler — haritada boyanmaz ama listede kalır.
 */
export const bolgeToplami = (sehirler = {}, dizin = {}) => {
  const bolgeler = {};
  const eslesmeyen = [];
  for (const [sehir, adet] of Object.entries(sehirler)) {
    const i = dizin[sehirAnahtar(sehir)];
    if (i === undefined) { eslesmeyen.push(sehir); continue; }
    bolgeler[i] = (bolgeler[i] || 0) + adet;
  }
  return { bolgeler, eslesmeyen };
};

/**
 * Bir ilin ilçe kırılımı. Müşterinin `city` alanı il, `ilce` alanı ilçedir.
 * @param customers ham müşteri kayıtları
 * @param il {string} örn. "İstanbul"
 * @returns {{ ilceler: Record<string, number>, ilcesiz: number }}
 *          ilcesiz: bu ilde olup ilçesi girilmemiş makina sayısı. Eski kayıtların çoğu
 *          böyle; haritada hiçbir ilçeyi boyayamazlar ama sayıları kaybolmamalı.
 */
export const ilOzeti = (customers = [], il = "") => {
  const ilceler = {};
  let ilcesiz = 0;
  for (const c of customers || []) {
    if (String(c?.country ?? "").trim() !== "Türkiye") continue;
    if (String(c?.city ?? "").trim() !== il) continue;
    const i = String(c?.ilce ?? "").trim();
    if (!i) { ilcesiz++; continue; }
    ilceler[i] = (ilceler[i] || 0) + 1;
  }
  return { ilceler, ilcesiz };
};

/**
 * Bir ilin ilçe -> firma listesi kırılımı (yan panelde ilçe altında gösterilir).
 * sehirFirmaKirilim'in ilçe eşdeğeri: müşterinin `city` = il, `ilce` = ilçe. İlçesi
 * girilmemiş kayıtlar (haritada boyanamayanlar) burada da yok, sayıları IlKartlari'nda ayrı.
 * @returns {Record<string, Array<{ ad: string, adet: number }>>}
 */
export const ilceFirmaKirilim = (customers = [], il = "") => {
  const out = {};
  for (const c of customers || []) {
    if (String(c?.country ?? "").trim() !== "Türkiye") continue;
    if (String(c?.city ?? "").trim() !== il) continue;
    const ilce = String(c?.ilce ?? "").trim();
    if (!ilce) continue;
    const ad = String(c?.name ?? "").trim() || "(isimsiz)";
    const anahtar = trLower(ad);
    const m = (out[ilce] ||= new Map());
    const mevcut = m.get(anahtar);
    if (mevcut) mevcut.adet++;
    else m.set(anahtar, { ad, adet: 1 });
  }
  const res = {};
  for (const [ilce, m] of Object.entries(out)) {
    res[ilce] = [...m.values()].sort((a, b) => b.adet - a.adet || a.ad.localeCompare(b.ad, "tr"));
  }
  return res;
};

/**
 * Sıralama temelli (quantile) kovalama. Mutlak ölçek işe yaramıyor: Türkiye tek başına
 * yüzlerce makina, yurt dışı 1-10 arası olduğu için düz ölçekte Türkiye dışındaki her ülke
 * aynı solgun tona düşüyor ve harita okunmuyor.
 * @returns {(adet: number) => number} 0..kovaSayisi-1; satış yoksa -1
 */
export const kovala = (degerler = [], kovaSayisi = 5) => {
  const tekil = [...new Set(degerler.filter((d) => d > 0))].sort((a, b) => a - b);
  return (adet) => {
    if (!adet || adet <= 0) return -1;
    const sira = tekil.indexOf(adet);
    if (sira < 0) return kovaSayisi - 1;
    return Math.min(kovaSayisi - 1, Math.floor((sira / tekil.length) * kovaSayisi));
  };
};

/**
 * Aynı noktaya düşen pinleri birbirinden ayırır ve fabrikayı EN SONA alır.
 *
 * İki sebep: (1) fabrika ile bayi aynı ilçedeyse ikisi de ilçenin merkezine konuyor ve
 * alttaki tamamen kayboluyor; (2) fabrika pini hiçbir zaman başka pinin arkasında kalmamalı,
 * SVG'de son çizilen üstte olduğu için listenin sonuna alınır.
 * Ayırma: çakışan pinler küçük bir çember üzerine dağıtılır, fabrika kendi yerinde kalır.
 */
export const pinleriAyir = (liste = []) => {
  const gruplar = new Map();
  for (const p of liste) {
    const k = Math.round(p.x) + ":" + Math.round(p.y);
    if (!gruplar.has(k)) gruplar.set(k, []);
    gruplar.get(k).push(p);
  }
  const cikti = [];
  for (const grup of gruplar.values()) {
    if (grup.length === 1) { cikti.push(grup[0]); continue; }
    // Fabrika merkezde kalsın, diğerleri çevresine dağılsın
    const merkez = grup.find((p) => p.tur === "fabrika") || grup[0];
    const digerleri = grup.filter((p) => p !== merkez);
    cikti.push(merkez);
    const yaricap = 13 * (merkez.olcek || 1);
    digerleri.forEach((p, i) => {
      const aci = (2 * Math.PI * i) / digerleri.length - Math.PI / 2;
      cikti.push({ ...p, x: +(p.x + Math.cos(aci) * yaricap).toFixed(1), y: +(p.y + Math.sin(aci) * yaricap).toFixed(1) });
    });
  }
  // Fabrika en sona: SVG'de sonra çizilen üstte kalır
  return cikti.sort((a, b) => (a.tur === "fabrika" ? 1 : 0) - (b.tur === "fabrika" ? 1 : 0));
};

/**
 * Bir bayi kaydının pin türü. Kayıt hem bayi hem anlaşmalı servis olabilir; o zaman pin
 * yarı mavi yarı yeşil çizilir. bayiMi üç durumlu: tanımsız/null da bayi sayılır
 * (SimpleDealers.jsx'teki `d.bayiMi !== false` filtresiyle aynı kural).
 * @returns {"bayi"|"servis"|"ikisi"}
 */
export const bayiTuru = (d) => {
  const bayi = d?.bayiMi !== false;
  const servis = !!d?.anlasmaliServisMi;
  if (bayi && servis) return "ikisi";
  if (servis) return "servis";
  return "bayi";
};

/** İlçe görünümünün pinleri: konum ilçe merkezinden gelir, ilçesi girilmemiş kayıt pin almaz.
 *  Bu görünümde tek bir ile yakınlaşılmış olduğu için pinler daha büyük çizilir; ülke
 *  ölçeğindeki boylarıyla kaybolup gidiyorlardı. Bayi yine fabrikadan küçük kalır. */
const ilcePinleri = ({ factory, dealers, seciliIl, ilceMerkezleri }) => {
  const liste = [];
  const konum = (ilce) => ilceMerkezleri[sadeAd(ilce)] || null;
  const uygun = (x) => String(x?.country ?? "").trim() === "Türkiye"
    && String(x?.city ?? "").trim() === seciliIl && String(x?.ilce ?? "").trim();

  if (uygun(factory)) {
    const k = konum(factory.ilce.trim());
    if (k) liste.push({ x: k[0], y: k[1], tur: "fabrika", olcek: PIN_BOY.ilce.fabrika, sayi: 1, ad: factory.name || "Fabrika", alt: factory.ilce.trim() + " · fabrika" });
  }
  for (const b of dealers || []) {
    if (!uygun(b)) continue;
    const k = konum(b.ilce.trim());
    if (k) liste.push({ x: k[0], y: k[1], tur: "bayi", cesit: bayiTuru(b), olcek: PIN_BOY.ilce.bayi, sayi: 1, ad: b.name || "Bayi", alt: b.ilce.trim() + " · " + BAYI_ETIKET[bayiTuru(b)] });
  }
  return pinleriAyir(liste);
};

/**
 * Haritada gösterilecek konum pinleri. Fabrika ve bayiler şehirlerinden konumlanır.
 * Dünya görünümünde bayiler ülke başına TEK pinde toplanır: aynı ülkedeki birkaç bayi
 * tek tek çizilince ülkeyi tamamen kapatıyor (dünya ölçeğinde ülke pinden küçük).
 * @param konumlar {Record<string, Record<string, number[]>>} ülke adı -> o ülkenin şehir
 *        konumları ([dünyaX, dünyaY, ülkeX, ülkeY]). Konum yalnız gerçek şehirler için var;
 *        çok küçük bir yerleşimdeki bayi pin almaz (listede yine görünür).
 * @param seciliIl {string|null} ilçe görünümü. Bu görünümde harita İLİN KENDİ projeksiyonunda
 *        çizilir, yani ülke koordinatları burada geçersizdir (bayiler yanlış yerde çıkıyordu).
 *        Konum ilçe merkezinden alınır; ilçesi girilmemiş kayıt pin almaz.
 * @param ilceMerkezleri {Record<string, number[]>} sadeAd(ilçe) -> [x, y] (ilin projeksiyonunda)
 */
export const pinleriTopla = ({ factory, dealers = [], seciliUlke = null, seciliIl = null, konumlar = {}, ilceMerkezleri = null } = {}) => {
  if (seciliIl) return ilcePinleri({ factory, dealers, seciliIl, ilceMerkezleri: ilceMerkezleri || {} });
  const konum = (ulke, sehir, ulkeGorunumu) => {
    const d = konumlar[ulke];
    const k = d && d[sehirAnahtar(sehir)];
    if (!k) return null;
    return ulkeGorunumu ? { x: k[2], y: k[3] } : { x: k[0], y: k[1] };
  };
  const liste = [];
  const fUlke = String(factory?.country ?? "").trim();
  const fSehir = String(factory?.city ?? "").trim();
  const bayiler = (dealers || []).filter((b) => String(b?.country ?? "").trim() && String(b?.city ?? "").trim());

  if (!seciliUlke) {
    const fk = fUlke && fSehir ? konum(fUlke, fSehir, false) : null;
    if (fk) liste.push({ ...fk, tur: "fabrika", olcek: PIN_BOY.dunya.fabrika, sayi: 1, ad: factory?.name || "Fabrika", alt: fSehir + " · fabrika" });
    const gruplar = new Map();
    for (const b of bayiler) {
      const k = konum(b.country.trim(), b.city.trim(), false);
      if (!k) continue;
      const u = b.country.trim();
      if (!gruplar.has(u)) gruplar.set(u, []);
      gruplar.get(u).push({ ...b, _k: k });
    }
    for (const [ulke, grup] of gruplar) {
      const x = grup.reduce((a, b) => a + b._k.x, 0) / grup.length;
      const y = grup.reduce((a, b) => a + b._k.y, 0) / grup.length;
      // Toplu pinde tür karışıksa "ikisi" gösterilir (yarı mavi yarı yeşil)
      const turler = new Set(grup.map(bayiTuru));
      liste.push({
        x: +x.toFixed(1), y: +y.toFixed(1), tur: "bayi",
        cesit: turler.size === 1 ? [...turler][0] : "ikisi",
        olcek: PIN_BOY.dunya.bayi, sayi: grup.length,
        ad: grup.length > 1 ? ulke + " · " + grup.length + " bayi" : grup[0].name || "Bayi",
        alt: grup.length > 1 ? grup.map((b) => b.city.trim()).join(", ") : grup[0].city.trim() + " · " + BAYI_ETIKET[bayiTuru(grup[0])],
      });
    }
  } else {
    if (fUlke === seciliUlke && fSehir) {
      const fk = konum(fUlke, fSehir, true);
      if (fk) liste.push({ ...fk, tur: "fabrika", olcek: PIN_BOY.ulke.fabrika, sayi: 1, ad: factory?.name || "Fabrika", alt: fSehir + " · fabrika" });
    }
    for (const b of bayiler) {
      if (b.country.trim() !== seciliUlke) continue;
      const k = konum(seciliUlke, b.city.trim(), true);
      if (k) liste.push({ ...k, tur: "bayi", cesit: bayiTuru(b), olcek: PIN_BOY.ulke.bayi, sayi: 1, ad: b.name || "Bayi", alt: b.city.trim() + " · " + BAYI_ETIKET[bayiTuru(b)] });
    }
  }
  return pinleriAyir(liste);
};
