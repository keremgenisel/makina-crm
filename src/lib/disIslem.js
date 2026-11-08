// Spec 0137: dış işlem kataloğu ve işlem bedelinin zam zinciri. Saf modül: React ve saat okumaz, tarih parametredir (C2).
//
// Kalıcı bölüm (R27): `disIslemler = [{ id, ad, birim: "adet" | "kilo", birimFiyati, paraBirimi, kur, tedarikciId, fiyatGecmisi,
// deletedAt }]`. TL para birimi kayda yazılmaz (R3), boş alan kayda yazılmaz (C7); birim her zaman yazılır (plan turu Karar 41).
// Parçadaki katalog bağlı kalem (R27/2): `{ tur: "islem", islemId, miktar }`; çeşidin ayırt edicisi `islemId`'nin varlığıdır,
// üçüncü bir `tur` yoktur (R10/2). Boş kilo miktarında `miktar` anahtarı yazılmaz (Karar 41).
//
// Plan turu Karar 38: bu modül tek okuma yolunu (`urunAgaci`), malzemeyi ve satış fiyatını İÇE ALMAZ; kilo tabanını `urunAgaci`
// kurar ve okuyucu olarak verir (ağırlık çarpımları `malzeme.js`'te kalır, R28, 0132 C1). Zam önizlemesi `disIslemEtkisi.js`'te.
// C3, AC-81: işlem bedelinden tutar türeten çarpımlar kaynakta YALNIZ bu dosyadadır (kaynak taraması).
// C8, AC-82 (ad tuzağı): kod adı `disIslem`dir; "işlem" sözcüğü denetim izi, izin ekranı ve kasa hareketleriyle alan paylaşmaz.
import { tutarCoz } from "./gider";
import { trLower } from "./utils";
import { gecerliGunMu, gecerlilikTarihiDogrula, tarihteGecerliIndeks, gunMetni } from "./gecerlilik";
import { BELIRSIZ_DESEN, BELIRSIZ_HATASI } from "./tutarGirdisi";

// ── Birim ve para birimi (R2, R3) ───────────────────────────────────────────────────────────────────────────────────────
export const BIRIM = Object.freeze({ ADET: "adet", KILO: "kilo" });
export const BIRIMLER = [BIRIM.ADET, BIRIM.KILO];
export const BIRIM_ADI = { adet: "Adet", kilo: "Kilo" };
export const BIRIM_KISA = { adet: "adet", kilo: "kg" };
export const birimOf = (m) => (m?.birim === BIRIM.KILO ? BIRIM.KILO : BIRIM.ADET);
export const DIS_PARA_BIRIMLERI = ["TRY", "USD", "EUR"];
const PARA_ADI = { TRY: "TL", USD: "USD", EUR: "EUR" };
const PARA_SIMGE = { TRY: "₺", USD: "$", EUR: "€" };
const dovizMi = (pb) => pb === "USD" || pb === "EUR";
const paraOf = (m) => (m?.paraBirimi == null || m.paraBirimi === "" ? "TRY" : m.paraBirimi);
export const disParaAdi = (pb) => PARA_ADI[pb] || pb;

const belirsizMi = (v) => typeof v === "string" && BELIRSIZ_DESEN.test(v);
const sayiOf = (v) => {
  if (v == null || v === "") return null;
  if (belirsizMi(v)) return null;
  const r = tutarCoz(v);
  return r.bos || r.gecersiz ? null : r.deger;
};
// Kayan nokta artığını temizleyerek tam yarım yukarı kuruşa (0133 triyaj bulgu 6'nın dersi): 0,335 × 100 = 33,50000000000001.
const kurusYuvarla = (tl) => Math.round(Number((tl * 100).toPrecision(12)));
const tamYuvarla = (x) => Math.round(Number(Number(x).toPrecision(12)));
// Karar 35: kilo üç ondalığa, tam yarım yukarı (malzeme.ucOndalik ile aynı kural; döngü olmasın diye burada).
export const kiloUcOndalik = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(Number((Number(Number(x).toPrecision(12)) * 1000).toPrecision(12))) / 1000);

// ── Fiyat kümesi ve geçmişi (R6, R9, R9/2) ──────────────────────────────────────────────────────────────────────────────
// R9/2: kümenin alanları; birim kümeye GİRMEZ (R2/2). Boş küme = birim fiyatı yok.
export const FIYAT_ALANLARI = ["birimFiyati", "paraBirimi", "kur"];
export const fiyatKumesi = (m) => {
  const k = {};
  if (sayiOf(m?.birimFiyati) != null) k.birimFiyati = sayiOf(m.birimFiyati);
  k.paraBirimi = paraOf(m);
  if (sayiOf(m?.kur) != null) k.kur = sayiOf(m.kur);
  return k;
};
const kumeAnahtari = (k) => JSON.stringify([k.birimFiyati ?? null, k.paraBirimi || "TRY", k.kur ?? null]);
const kumeBosMu = (k) => k.birimFiyati == null;
export const fiyatGecmisiOf = (m) => (Array.isArray(m?.fiyatGecmisi) ? m.fiyatGecmisi : [])
  .map(x => ({ ...fiyatKumesi(x), gecerli: x?.gecerli || "" }))
  .sort((a, b) => (a.gecerli < b.gecerli ? -1 : a.gecerli > b.gecerli ? 1 : 0));
// R18: sorgu tarihinde geçerli küme. Tarihsiz, biçimsiz ya da son kaydın aralığına düşen sorgu BUGÜNKÜ kümeyi verir (0097 R3/2).
export const fiyatKumesiTarihte = (m, tarih) => {
  const bugunku = fiyatKumesi(m);
  if (tarih === undefined) return bugunku;
  const g = fiyatGecmisiOf(m);
  const i = tarihteGecerliIndeks(g, tarih);
  if (i < 0) return bugunku;
  const { gecerli: _g, ...k } = g[i];
  return k;
};
// R9, Karar 39 (AC-20–AC-25, AC-128): TEK yazıcı (malzemenin ikizi). Küme değişmediyse geçmiş aynen; eski küme boşsa (ilk fiyat)
// kayıt yok; aynı güne ikinci değişiklik son kaydın üstüne yazar; gelecek tarih yasak. Dönüş `{ gecmis, hata }`.
export const fiyatGecmisiYaz = (eski, yeni, { tarih, bugun } = {}) => {
  const g = fiyatGecmisiOf(eski);
  if (!eski) return { gecmis: [], hata: null };
  const eskiK = fiyatKumesi(eski); const yeniK = fiyatKumesi(yeni);
  if (kumeAnahtari(eskiK) === kumeAnahtari(yeniK)) return { gecmis: g, hata: null };
  if (!gecerliGunMu(bugun)) throw new Error("fiyatGecmisiYaz: bugun (YYYY-AA-GG) gerekli");
  if (!g.length && kumeBosMu(eskiK)) return { gecmis: g, hata: null };
  const taban = g.length ? [...g.slice(0, -1), { ...eskiK, gecerli: g[g.length - 1].gecerli }] : [{ ...eskiK, gecerli: "" }];
  const son = taban[taban.length - 1];
  const hata = gecerlilikTarihiDogrula(tarih, bugun, son.gecerli);
  if (hata) return { gecmis: g, hata };
  if (tarih === son.gecerli) return { gecmis: [...taban.slice(0, -1), { ...yeniK, gecerli: tarih }], hata: null };
  return { gecmis: [...taban, { ...yeniK, gecerli: tarih }], hata: null };
};
const ikiHane = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
export const fiyatMetni = (fiyat, pb) => (fiyat == null || fiyat === "" ? "—" : `${ikiHane.format(Number(fiyat))} ${PARA_SIMGE[pb] || pb}`);
// AC-9: "12,00 €"; dövizde kur da yazılır.
export const kumeOzeti = (k, birim) => {
  const pb = k.paraBirimi || "TRY";
  if (k.birimFiyati == null) return "—";
  const f = `${fiyatMetni(k.birimFiyati, pb)}${birim ? ` / ${BIRIM_KISA[birim]}` : ""}`;
  return dovizMi(pb) && k.kur != null ? `${f} · kur ${String(k.kur).replace(".", ",")}` : f;
};
export const fiyatGecmisiSatirlari = (m) => {
  const g = fiyatGecmisiOf(m);
  return g.map((x, i) => {
    const k = i === g.length - 1 ? fiyatKumesi(m) : x;
    return { gecerli: x.gecerli, tarihMetni: x.gecerli ? gunMetni(x.gecerli) : "başlangıçtan beri", ozet: kumeOzeti(k, birimOf(m)) };
  }).reverse();
};

// ── Katalog, eksikler (R1/2, R15) ───────────────────────────────────────────────────────────────────────────────────────
// R27: yalnız canlı kayıtlar (`malzemeKatalogu` emsali); çöpteki işlem kalemi çözmez (R15, AC-40).
export const disIslemKatalogu = (disIslemler = []) => new Map((disIslemler || []).filter(m => m && !m.deletedAt).map(m => [String(m.id), m]));
// Triyaj (bulgu 2): kalem doğrulamasının birim kaynağı ÇÖPTEKİLER DAHİL ham listedir (parça kartı birimi ve alan etiketini de ham
// diziden okur). Çöpteki adet birimli işleme ondalık miktar yazılamasın; işlem geri alınınca kalem "geçersiz miktar" kalmasın.
export const disIslemHamKatalogu = (disIslemler = []) => new Map((disIslemler || []).filter(Boolean).map(m => [String(m.id), m]));
export const EKSIK_FIYAT = "birim fiyatı girilmedi";
export const EKSIK_KUR = "kur girilmedi";
export const EKSIK_PARA = "para birimi tanınmıyor";
export const ISLEM_YOK = "işlem bulunamadı ya da çöpte";
export const ISLEM_LISTESI_YOK = "dış işlem listesi verilmedi";
export const MIKTAR_GECERSIZ = "miktar geçersiz";
const kumeEksikleri = (k) => {
  const e = [];
  if (!DIS_PARA_BIRIMLERI.includes(k.paraBirimi)) { e.push(EKSIK_PARA); return e; }
  if (k.birimFiyati == null) e.push(EKSIK_FIYAT);
  if (dovizMi(k.paraBirimi) && !(k.kur > 0)) e.push(EKSIK_KUR);
  return e;
};
export const disIslemEksikleri = (m) => kumeEksikleri(fiyatKumesi(m));
export const eksikDisIslemSayisi = (disIslemler = []) => (disIslemler || []).filter(m => m && !m.deletedAt && disIslemEksikleri(m).length > 0).length;

// ── Miktar doğrulaması (R12, R13, R13/2) ────────────────────────────────────────────────────────────────────────────────
export const ADET_UST = 1000;
export const KILO_UST = 10000;
export const KILO_ONDALIK = 3;
export const POZITIF_HATASI = "Sıfırdan büyük bir sayı olmalı.";
export const NEGATIF_HATASI = "Negatif olamaz.";
export const SAYI_HATASI = "Sayı olmalı.";
export const KILO_UST_HATASI = `Kilo en çok ${KILO_UST.toLocaleString("tr-TR")} olabilir.`;
export const KILO_ONDALIK_HATASI = "Kilo en çok üç ondalıklı olabilir.";
const ondalikTamam = (n) => Number(n.toFixed(KILO_ONDALIK)) === n;
// R13/2 (AC-98–AC-103): boş serbest (parçanın ağırlığından türet); belirsiz, negatif, sıfır, üst sınır, dört+ ondalık reddedilir.
export const kiloMiktariDogrula = (ham) => {
  if (ham == null || String(ham).trim() === "") return { deger: null, bos: true, hata: null };
  if (belirsizMi(ham)) return { deger: null, hata: BELIRSIZ_HATASI };
  const r = tutarCoz(ham);
  if (r.bos) return { deger: null, bos: true, hata: null };
  if (r.gecersiz) return { deger: null, hata: SAYI_HATASI };
  if (r.deger < 0) return { deger: null, hata: NEGATIF_HATASI };
  if (r.deger === 0) return { deger: null, hata: POZITIF_HATASI };
  if (r.deger > KILO_UST) return { deger: null, hata: KILO_UST_HATASI };
  if (!ondalikTamam(r.deger)) return { deger: null, hata: KILO_ONDALIK_HATASI };
  return { deger: r.deger, hata: null };
};
// Kayıttaki miktarın okuma anındaki geçerliliği (AC-91): adette 1..1000 tam sayı (yoksa 1 değil, geçersiz; eski kayıt bozulmuş
// demektir), kiloda boş (türet) ya da (0, 10.000] ve en çok üç ondalık.
const kayitliMiktar = (birim, miktar) => {
  if (birim === BIRIM.ADET) { const n = Number(miktar); return Number.isInteger(n) && n >= 1 && n <= ADET_UST ? { deger: n } : { gecersiz: true }; }
  if (miktar == null || miktar === "") return { bos: true };
  const n = typeof miktar === "number" ? miktar : Number(miktar);
  return Number.isFinite(n) && n > 0 && n <= KILO_UST && ondalikTamam(n) ? { deger: n } : { gecersiz: true };
};

// ── Kalemin tutarı: TEK hesap (R11–R15/4, R18, R31, Karar 35) ────────────────────────────────────────────────────────────
// `k` katalog bağlı kalem, `islemKat` `disIslemKatalogu`'nun Map'i, `tarih` sorgu tarihi (undefined = bugün), `kgOku` kilo tabanının
// tembel okuyucusu: `() => ({ kg, neden })` (kg üç ondalıklı; `malzeme.parcaIslenmisKg`). Dönüş satırı: `{ tur: "islem", katalog: true,
// islemId, birim, miktar, kgTuretildi, kg, birimK, tutarK, cozuldu, eksik }`. Yuvarlama: birim tutar (fiyat × kur) bir kez kuruşa;
// adette × adet; kiloda × kilo ve satır bir kez daha kuruşa. Çözülemeyen hâlde tutar null ve `cozuldu: false` (asla sıfır, R15).
export const islemKalemiOzeti = (k, islemKat, tarih, kgOku = () => ({ kg: null, neden: "ağırlık okunamadı" })) => {
  const temel = { tur: "islem", katalog: true, islemId: k?.islemId ?? null, tutarK: null, cozuldu: false };
  if (!(islemKat instanceof Map)) return { ...temel, eksik: [ISLEM_LISTESI_YOK] };
  const m = islemKat.get(String(k?.islemId));
  if (!m) return { ...temel, eksik: [ISLEM_YOK] };
  const birim = birimOf(m);
  const kume = fiyatKumesiTarihte(m, tarih);
  const eksik = kumeEksikleri(kume);
  const mk = kayitliMiktar(birim, k.miktar);
  if (mk.gecersiz) eksik.push(MIKTAR_GECERSIZ);
  let kg = null; let kgTuretildi = false;
  if (birim === BIRIM.KILO && !mk.gecersiz) {
    if (mk.bos) { const t = kgOku(); kgTuretildi = true; if (t?.kg == null) eksik.push(t?.neden || "ağırlık çözülemedi"); else kg = kiloUcOndalik(t.kg); }
    else kg = mk.deger;
  }
  const miktar = birim === BIRIM.ADET ? mk.deger ?? null : kg;
  if (eksik.length) return { ...temel, birim, miktar, kg, kgTuretildi, eksik };
  const kur = dovizMi(kume.paraBirimi) ? kume.kur : 1;
  const birimK = kurusYuvarla(kume.birimFiyati * kur);
  const tutarK = birim === BIRIM.ADET ? birimK * mk.deger : tamYuvarla(birimK * kg);
  return { ...temel, birim, miktar, kg, kgTuretildi, birimK, tutarK, cozuldu: true, eksik: [], fiyat: kume.birimFiyati, paraBirimi: kume.paraBirimi, kur };
};

// ── Katalog kartının doğrulaması (R1, R3, R4, R4/2, R5) ─────────────────────────────────────────────────────────────────
export const AD_BOS_HATASI = "İşlem adı boş olamaz.";
export const AD_AYNI_HATASI = "Bu adda bir dış işlem zaten var.";
export const PARA_HATASI = "Para birimi TL, USD ya da EUR olmalı.";
export const BIRIM_HATASI = "Birim adet ya da kilo olmalı.";
// R4/2 (AC-130): yalnız canlılar arasında, Türkçe küçültmeyle.
export const adCakisiyorMu = (ad, disIslemler = [], haricId = null) => {
  const a = trLower(String(ad || "").trim());
  return !!a && (disIslemler || []).some(m => m && !m.deletedAt && String(m.id) !== String(haricId) && trLower(String(m.ad || "").trim()) === a);
};
const alanDogrula = (ham, { pozitif = false } = {}) => {
  if (ham == null || String(ham).trim() === "") return { deger: null, hata: null };
  if (belirsizMi(ham)) return { deger: null, hata: BELIRSIZ_HATASI };
  const r = tutarCoz(ham);
  if (r.gecersiz) return { deger: null, hata: SAYI_HATASI };
  if (r.deger < 0) return { deger: null, hata: NEGATIF_HATASI };
  if (pozitif && r.deger === 0) return { deger: null, hata: POZITIF_HATASI };
  return { deger: r.deger, hata: null };
};
// `form` metin alanlarıdır. Dönüş { kayit, hatalar, gecerli }; kayıt boş alan taşımaz (C7), birim her zaman yazılır (Karar 41).
// R5: tedarikçi bağı formda taşınır; yetkisiz kullanıcının formu kayıttaki değeri aynen getirir (çağıran sağlar).
export const disIslemDogrula = (form = {}, disIslemler = [], haricId = null) => {
  const h = {}; const k = {};
  const ad = String(form.ad || "").trim();
  if (!ad) h.ad = AD_BOS_HATASI; else if (adCakisiyorMu(ad, disIslemler, haricId)) h.ad = AD_AYNI_HATASI;
  k.ad = ad;
  const birim = form.birim == null || form.birim === "" ? BIRIM.ADET : form.birim;
  if (!BIRIMLER.includes(birim)) h.birim = BIRIM_HATASI; else k.birim = birim;
  const pb = form.paraBirimi == null || form.paraBirimi === "" ? "TRY" : form.paraBirimi;
  if (!DIS_PARA_BIRIMLERI.includes(pb)) h.paraBirimi = PARA_HATASI; else if (pb !== "TRY") k.paraBirimi = pb;
  const f = alanDogrula(form.birimFiyati);
  if (f.hata) h.birimFiyati = f.hata; else if (f.deger != null) k.birimFiyati = f.deger;
  if (dovizMi(pb)) {
    const r = alanDogrula(form.kur, { pozitif: true });
    if (r.hata) h.kur = r.hata; else if (r.deger == null) h.kur = EKSIK_KUR_HATASI; else k.kur = r.deger;
  }
  const ted = form.tedarikciId == null ? "" : String(form.tedarikciId).trim();
  if (ted) k.tedarikciId = /^\d+$/.test(ted) ? Number(ted) : ted;
  return { kayit: k, hatalar: h, gecerli: Object.keys(h).length === 0 };
};
// R3, AC-8: dövizde kur zorunlu.
export const EKSIK_KUR_HATASI = "Döviz seçildiğinde kur girilmeli.";
const metin = (v) => (v == null ? "" : String(v).replace(".", ","));
export const disIslemFormu = (m = {}) => ({
  ad: m.ad || "", birim: birimOf(m), birimFiyati: metin(m.birimFiyati), paraBirimi: m.paraBirimi || "TRY", kur: metin(m.kur),
  tedarikciId: m.tedarikciId == null ? "" : String(m.tedarikciId),
});

// ── Kullanım ve koruma (R1/2, R2/2, R21, C10) ───────────────────────────────────────────────────────────────────────────
// Parçanın katalog bağlı kalemlerinde geçen işlem kimlikleri `maliyetKalemleri.kalemIslemIdleri`'dendir; bu modül parçanın
// kalemlerini kendisi okumaz (tek türetme yolu, 0135 C1/2), çağıran okuyucuyu verir.
export const disIslemKullanimi = (islemId, parts = [], idleriOku) => {
  let canli = 0, cop = 0;
  for (const p of parts || []) {
    if (!idleriOku(p).includes(String(islemId))) continue;
    if (p.deletedAt) cop++; else canli++;
  }
  return { canli, cop };
};
// R21 (AC-56–AC-60): kalıcı silme koruması kümesi (çöptekiler dahil verilen parçalardan); üç kapı bunu okur.
export const kullanilanDisIslemler = (parts = [], idleriOku) => new Set((parts || []).flatMap(p => idleriOku(p)));
export const kullanimMetni = (k) => (k.canli + k.cop === 0 ? "Hiçbir parçanın maliyet kaleminde kullanılmıyor."
  : `${k.canli} parçanın maliyet kaleminde kullanılıyor${k.cop ? ` (${k.cop} parça çöpte)` : ""}.`);
// R2/2 (AC-119): kullanılan işlemin birimi değişmez.
export const birimKilitNedeni = (k) => `Bu işlem ${k.canli + k.cop} parçanın maliyet kaleminde geçtiği için birimi değiştirilemez.`;
// R23/2 (AC-129): çöp satırının etiketi; tedarikçinin adı yazılmaz.
export const disIslemCopEtiketi = (m) => (m?.ad ? `${m.ad} · ${BIRIM_ADI[birimOf(m)].toLocaleLowerCase("tr-TR")}` : "");
export const KALEMDE_ISLEM_NEDENI = "Bir parçanın maliyet kaleminde geçiyor; kalıcı silinemez.";
export const KALEMDE_ISLEM_RED = "Bu dış işlem bir parçanın maliyet kaleminde geçtiği için kalıcı silinemez.";
export const silmeUyarisi = (k) => `${kullanimMetni(k)} ${k.canli + k.cop ? "Bu parçaların maliyeti işlem geri alınana kadar \"girilmedi\" olur." : ""}`.trim();

// ── Ekran metinleri (AC-83) ─────────────────────────────────────────────────────────────────────────────────────────────
export const PANEL_BASLIGI = "Dış İşlemler";
export const PANEL_IPUCU = "Dışarıda yaptırılan işlemler (ısıl işlem, kaplama, lazer kesim, kama açma…) ve birim fiyatları (KDV hariç). Fiyat değişince bu işlemin geçtiği parçaların maliyeti kendiliğinden güncellenir.";
export const BOS_BASLIK = "Henüz dış işlem yok";
export const BOS_METNI = "Dışarıda yaptırdığınız işlemleri \"Yeni Dış İşlem\" ile ekleyin; parça kartında işlem kalemini katalogdan seçmek için önce işlem gerekir.";
export const eksikSayiMetni = (n) => `${n} işlemin fiyatı girilmedi`;
export const EKSIK_ROZETI = "fiyat yok";
