import { trLower } from "./utils";

// Pin ipucunda görünen etiketler
const BAYI_ETIKET = { bayi: "Bayi", servis: "Anlaşmalı Servis", ikisi: "Bayi + Anlaşmalı Servis" };

/**
 * Pin boyları. Üç görünümde de bayi fabrikadan KÜÇÜK kalır (kullanıcının kuralı), ama
 * yakınlaştıkça hepsi büyür: dünyada ülkeler küçük olduğu için pin de ölçülü olmalı
 * (yoksa Türkiye'yi kapatıyor), ülke ve ilçe görünümünde ise yer bol.
 */
const PIN_BOY = {
  dunya: { fabrika: 0.9, bayi: 0.68, satis: 0.32 },
  ulke:  { fabrika: 1.35, bayi: 1.05, satis: 0.48 },
  ilce:  { fabrika: 1.6, bayi: 1.3, satis: 0.6 },
};

/** Görünüm seviyesi ("dunya"/"ulke"/"ilce"). */
export const haritaSeviyesi = (seciliUlke, seciliIl) => (seciliIl ? "ilce" : seciliUlke ? "ulke" : "dunya");

/** Yer adı etiketinin ölçeği — satış pini boyuyla aynı, satışlı/satışsız adlar aynı boyda görünsün. */
export const etiketOlcegi = (seciliUlke, seciliIl) => PIN_BOY[haritaSeviyesi(seciliUlke, seciliIl)].satis;

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
  // KKTC şehirleri GeoNames'te Yunanca/İngilizce adla; kullanıcı Türkçe girince pin çıkmıyordu.
  lefkosa: "nicosia",             // Lefkoşa — Nicosia
  girne: "kyrenia",               // Girne — Kyrenia
  gazimagusa: "famagusta",        // Gazimağusa — Famagusta
  magusa: "famagusta",            // Mağusa
  guzelyurt: "morfou",            // Güzelyurt — Morphou/Morfou
};

/** Şehri dizinde aramak için normalize edilmiş anahtar (takma ad varsa asıl ada çevirir). */
export const sehirAnahtar = (sehir) => {
  const k = sadeAd(sehir);
  return SEHIR_ALIAS[k] || k;
};

/**
 * Yurt dışı ülke görünümünde satış pinleri: makina BAŞINA ayrı pin (firma adı ipucunda + id ile
 * müşteri kartına gidilir) — ilçe görünümüyle aynı desen. Böylece 2 makina = 2 pin. Konum, şehir
 * merkez sözlüğünden (ülke koordinatı k[2],k[3]) alınır; aynı şehirdekiler çağıran tarafta
 * pinleriAyir ile ayrılır. Türkiye il→ilçe drill'i olduğu için burada KULLANILMAZ (şehir-toplu kalır).
 * @param konumSozluk sehirAnahtar -> [ilX, ilY, ulkeX, ulkeY]
 */
export const ulkeSatisPinleri = (customers = [], ulke = "", konumSozluk = {}) => {
  const out = [];
  for (const c of customers || []) {
    if (String(c?.country ?? "").trim() !== ulke) continue;
    const sehir = String(c?.city ?? "").trim();
    const k = sehir && konumSozluk[sehirAnahtar(sehir)];
    if (k) out.push({ x: k[2], y: k[3], ad: String(c?.name ?? "").trim() || "(isimsiz)", id: c?.id });
  }
  return out;
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
 * @returns {Record<string, Array<{ ad: string, adet: number, id: * }>>} şehir -> makina çok olan üstte.
 *          id: firmanın ilk müşteri kaydının id'si — satıra tıklanınca o müşterinin detayına gitmek için.
 */
export const sehirFirmaKirilim = (customers = [], ulke = "") => {
  const out = {}; // sehir -> Map(trLower(ad) -> { ad, adet, id })
  for (const c of customers || []) {
    if (String(c?.country ?? "").trim() !== ulke) continue;
    const sehir = String(c?.city ?? "").trim();
    if (!sehir) continue;
    const ad = String(c?.name ?? "").trim() || "(isimsiz)";
    const anahtar = trLower(ad);
    const m = (out[sehir] ||= new Map());
    const mevcut = m.get(anahtar);
    if (mevcut) mevcut.adet++;
    else m.set(anahtar, { ad, adet: 1, id: c?.id ?? null });
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
    else m.set(anahtar, { ad, adet: 1, id: c?.id ?? null });
  }
  const res = {};
  for (const [ilce, m] of Object.entries(out)) {
    res[ilce] = [...m.values()].sort((a, b) => b.adet - a.adet || a.ad.localeCompare(b.ad, "tr"));
  }
  return res;
};

/** Bir alt-yol ("M x,y L x,y … Z") sayılarını [x,y] noktalarına çevirir. */
const altYolNoktalari = (parca) => {
  const s = parca.match(/-?\d*\.?\d+/g);
  if (!s) return [];
  const pts = [];
  for (let i = 0; i + 1 < s.length; i += 2) pts.push([+s[i], +s[i + 1]]);
  return pts;
};

/** Kapalı poligonun alan-ağırlıklı merkezi (shoelace). Alan ~0 ise köşe ortalamasına düşer. */
const poligonMerkezi = (pts) => {
  let A = 0, cx = 0, cy = 0;
  for (let i = 0, n = pts.length; i < n; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % n];
    const capraz = x0 * y1 - x1 * y0;
    A += capraz; cx += (x0 + x1) * capraz; cy += (y0 + y1) * capraz;
  }
  A *= 0.5;
  if (!A) {
    const n = pts.length || 1;
    return { x: pts.reduce((a, p) => a + p[0], 0) / n, y: pts.reduce((a, p) => a + p[1], 0) / n, alan: 0 };
  }
  return { x: cx / (6 * A), y: cy / (6 * A), alan: Math.abs(A) };
};

/**
 * Bir SVG yol (`d`) dizesinin etiket/pin tutturma noktası. Ülke merkezleri ayrı veri olarak
 * üretilmediğinden (yeniden üretim 8 MB + ağ) yoldan çalışma anında hesaplanır. Yollar mutlak
 * "M x,y L x,y … Z" (yalnız düz kenar) biçiminde.
 *
 * Düz köşe ortalaması ÇOK ADALI ülkelerde bozuluyordu: ABD'nin merkezi Alaska/Havai, Kanada'nınki
 * Arktik takımadalar yüzünden anakaradan kayıyordu. Bunun yerine yol alt-poligonlara ("M…Z"
 * parçaları) bölünür ve EN BÜYÜK alanlı parçanın (anakara) alan-ağırlıklı merkezi alınır; küçük
 * adalar merkezi çekmez. Tek parçalı yerlerde (çoğu bölge/ilçe) sonuç zaten normal centroid'dir.
 * @returns {{x:number,y:number}|null}
 */
export const yolMerkezi = (d = "") => {
  const parcalar = String(d).match(/M[^M]*/g);
  let best = null;
  for (const p of parcalar || []) {
    const pts = altYolNoktalari(p);
    if (pts.length < 3) continue;
    const m = poligonMerkezi(pts);
    if (!best || m.alan > best.alan) best = m;
  }
  if (best) return { x: +best.x.toFixed(1), y: +best.y.toFixed(1) };
  // 3'ten az noktalı/dejenere: eski davranış (köşe ortalaması)
  const s = String(d).match(/-?\d*\.?\d+/g);
  if (!s || s.length < 2) return null;
  let sx = 0, sy = 0, n = 0;
  for (let i = 0; i + 1 < s.length; i += 2) { sx += +s[i]; sy += +s[i + 1]; n++; }
  return n ? { x: +(sx / n).toFixed(1), y: +(sy / n).toFixed(1) } : null;
};

/** Bir SVG yolun (`d`) halkaları: her alt-yol ("M…Z") bir poligon halkası ([[x,y],…]). */
export const yolHalkalari = (d = "") =>
  (String(d).match(/M[^M]*/g) || []).map(altYolNoktalari).filter((r) => r.length >= 3);

/** Nokta poligon(lar)ın içinde mi — even-odd ışın atma (delik/ada dahil doğru çalışır). */
export const noktaHalkalarda = (x, y, halkalar) => {
  let ic = false;
  for (const ring of halkalar) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) ic = !ic;
    }
  }
  return ic;
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
 * Çizim sırası (SVG'de sonra çizilen üstte): satış pinleri en altta (nötr, çok sayıda),
 * sonra bayi/servis, en üstte fabrika.
 */
const pinRutbe = (p) => (p.tur === "fabrika" ? 2 : p.tur === "satis" ? 0 : 1);
/**
 * @param liste pin listesi
 * @param ayniSekilde (ox,oy,nx,ny)=>bool — yeni konum, orijinal noktanın şekliyle aynı şekilde
 *        kalıyor mu? Verilirse pinler bulundukları ülke/şehir/ilçe şeklini TERK ETMEZ: yayılma
 *        şekilden çıkarsa yarıçap küçültülür, yine sığmazsa pin yerinde (merkezde) yığılır.
 */
export const pinleriAyir = (liste = [], ayniSekilde = null) => {
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
    digerleri.forEach((p, i) => {
      // Yayılma KENDİ boyuna göre (fabrika büyük merkezdeyken küçük satış pini az kaysın).
      const tam = 8 * (p.olcek || 1);
      const aci = (2 * Math.PI * i) / digerleri.length - Math.PI / 2;
      let nx = p.x, ny = p.y; // sığmazsa yerinde (üst üste) kal — şekli terk etmesin
      // Şekilden çıkmayacak en büyük yarıçapı seç (tam → yarı → çeyrek); ayniSekilde yoksa tam.
      for (const oran of ayniSekilde ? [1, 0.5, 0.25] : [1]) {
        const tx = +(p.x + Math.cos(aci) * tam * oran).toFixed(1);
        const ty = +(p.y + Math.sin(aci) * tam * oran).toFixed(1);
        if (!ayniSekilde || ayniSekilde(p.x, p.y, tx, ty)) { nx = tx; ny = ty; break; }
      }
      cikti.push({ ...p, x: nx, y: ny });
    });
  }
  // Rütbeye göre sırala: satış (altta) < bayi/servis < fabrika (üstte)
  return cikti.sort((a, b) => pinRutbe(a) - pinRutbe(b));
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
const ilcePinleri = ({ factory, dealers, seciliIl, ilceMerkezleri, satisPin = [], ayniSekilde = null }) => {
  const liste = [];
  const konum = (ilce) => ilceMerkezleri[sadeAd(ilce)] || null;
  const uygun = (x) => String(x?.country ?? "").trim() === "Türkiye"
    && String(x?.city ?? "").trim() === seciliIl && String(x?.ilce ?? "").trim();

  if (uygun(factory)) {
    // Elle yerleştirilmiş fabrika konumu (bu il için) varsa onu kullan; yoksa ilçe merkezine koy.
    const hk = factory.haritaKonum && factory.haritaKonum.il === seciliIl ? factory.haritaKonum : null;
    const k = hk ? [hk.x, hk.y] : konum(factory.ilce.trim());
    if (k) liste.push({ x: k[0], y: k[1], tur: "fabrika", olcek: PIN_BOY.ilce.fabrika, sayi: 1, ad: factory.name || "Fabrika", alt: factory.ilce.trim() + " · Fabrika" });
  }
  for (const b of dealers || []) {
    if (!uygun(b)) continue;
    const k = konum(b.ilce.trim());
    if (k) liste.push({ x: k[0], y: k[1], tur: "bayi", cesit: bayiTuru(b), olcek: PIN_BOY.ilce.bayi, sayi: 1, ad: b.name || "Bayi", alt: b.ilce.trim() + " · " + BAYI_ETIKET[bayiTuru(b)] });
  }
  return pinleriAyir([...liste, ...satisPin], ayniSekilde);
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
export const pinleriTopla = ({ factory, dealers = [], seciliUlke = null, seciliIl = null, konumlar = {}, ilceMerkezleri = null, satisNoktalari = [], ayniSekilde = null } = {}) => {
  // Satış konum pinleri (nötr, adıyla): görünüm seviyesine göre boyutlanır. Konum çağıran
  // tarafça hesaplanmış gelir (dünyada ülke centroid'i, ülke/ilçede şehir/ilçe merkezi).
  const seviye = seciliIl ? "ilce" : seciliUlke ? "ulke" : "dunya";
  // Satış pini: ad üzerine gelince ipucunda yazılır. İlçede ad = müşteri adı (alt boş, tek satır);
  // dünya/ülkede ad = yer adı ve sayi verilmişse ipucu "yer · N makina" gösterir.
  const satisPin = (satisNoktalari || []).map((s) => ({
    x: s.x, y: s.y, tur: "satis", ad: s.ad, id: s.id ?? null,
    olcek: PIN_BOY[seviye].satis, alt: s.sayi ? (s.sayi + " makina") : "",
  }));
  if (seciliIl) return ilcePinleri({ factory, dealers, seciliIl, ilceMerkezleri: ilceMerkezleri || {}, satisPin, ayniSekilde });
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
    if (fk) liste.push({ ...fk, tur: "fabrika", olcek: PIN_BOY.dunya.fabrika, sayi: 1, ad: factory?.name || "Fabrika", alt: fSehir + " · Fabrika" });
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
      if (fk) liste.push({ ...fk, tur: "fabrika", olcek: PIN_BOY.ulke.fabrika, sayi: 1, ad: factory?.name || "Fabrika", alt: fSehir + " · Fabrika" });
    }
    for (const b of bayiler) {
      if (b.country.trim() !== seciliUlke) continue;
      const k = konum(seciliUlke, b.city.trim(), true);
      if (k) liste.push({ ...k, tur: "bayi", cesit: bayiTuru(b), olcek: PIN_BOY.ulke.bayi, sayi: 1, ad: b.name || "Bayi", alt: b.city.trim() + " · " + BAYI_ETIKET[bayiTuru(b)] });
    }
  }
  return pinleriAyir([...liste, ...satisPin], ayniSekilde);
};
