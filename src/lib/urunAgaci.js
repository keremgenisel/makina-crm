// Spec 0087: parça alış maliyeti ve ürün ağacı adetleri. Saf modül, React ve zaman okumaz.
//
// İki kavram ayrıdır (R5): parçanın model İŞARETİ (`parts[].models`, "bu modelle uyumlu"; Stok'un kit önerisi süzgeci
// buna dayanır) ve modelin makina KİTİ (`defaultParcalar: [{ partId, ad, miktar }]`, stok düşümünün kaynağı). Adetin TEK
// kaynağı kittir (R6); parça kartı ona ikinci bir giriş kapısıdır. İşaret ile kitin birlikte yazılması bu modülden geçer
// (R15, AC-19): ekranlar "hangi model dizisi" dalı yazmaz, `kitleriGuncelle`'yi iki model dizisinin işlevsel
// güncelleyicisinde çağırır (tam dizi; App ekranlara çöpü süzülmüş dizi verir, geri yazmak çöptekileri silerdi).
import { tutarCoz } from "./gider";

// R1: maliyet TL'dir ve KDV hariçtir (matrah, 0076 R14). Alan KDV ayırmaz.
export const MALIYET_ETIKETI = "Alış maliyeti (TL, KDV hariç)";
export const MALIYET_IPUCU = "Parçanın bize geliş fiyatı, KDV hariç. Döviz bazlı tedarikte TL karşılığını girin. "
  + "Boş bırakılırsa \"girilmedi\" sayılır; ücretsiz gelen parça için 0 yazın.";
export const EK_MALIYET_IPUCU = "Parça olmayan maliyetler (büküm, taşlama, kaplama, montaj işçiliği, kilo bazlı hammadde): "
  + "tutar bu modelden üretilen her makina içindir, TL ve KDV hariç. Makina kitine ve stok düşümüne girmez.";
export const KIT_ADET_IPUCU = "Adet girilirse bu modelin makina kitine yazılır; boş bırakılırsa parça yalnız uyumlu işaretlenir.";
export const KITTEN_DUSECEK_IPUCU = "Kaydedince bu modelin makina kitinden de düşecek.";
// Triyaj (bulgu 1): işareti olmayan ama kitinde bu parça olan model; kayıt bu kite dokunmaz.
export const isaretsizKitteMetni = (model, adet) => `${model}: işaretsiz, makina kitinde ${adet} adet (kayıt bu kite dokunmaz).`;

const ikiHane = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// R4, AC-5: girilmemiş maliyet "—", sıfır "0,00 ₺" (ikisi ayırt edilir).
export const maliyetMetni = (n) => (n == null || n === "" ? "—" : `${ikiHane.format(Number(n) || 0)} ₺`);
export const maliyetGirildiMi = (p) => p?.maliyet != null && p.maliyet !== "";

// R14 (AC-7): boş serbest ("girilmedi"), negatif ve sayıya çevrilemeyen metin hata. Tek kaynak `tutarCoz` (R3, R4).
export const parcaMaliyetDogrula = (ham) => {
  const r = tutarCoz(ham);
  if (r.bos) return { bos: true, deger: null, hata: null };
  if (r.gecersiz) return { bos: false, deger: null, hata: "Maliyet sayı olmalı." };
  if (r.deger < 0) return { bos: false, deger: null, hata: "Maliyet negatif olamaz." };
  return { bos: false, deger: Math.round(r.deger * 100) / 100, hata: null };
};

// AC-15: kit adedi en az 1 tam sayıdır; 0, negatif ve ondalık reddedilir. İki kapıda (parça kartı, model kartı) aynı.
export const KIT_ADET_HATASI = "Adet en az 1 tam sayı olmalı.";
export const kitAdediDogrula = (ham) => {
  if (ham == null || String(ham).trim() === "") return { bos: true, deger: null, hata: null };
  const t = String(ham).trim();
  if (!/^\d+$/.test(t) || Number(t) < 1) return { bos: false, deger: null, hata: KIT_ADET_HATASI };
  return { bos: false, deger: Number(t), hata: null };
};

// R9, AC-26: ek maliyet kalemleri `{ ad, tutar }` (her makina için TL, KDV hariç). Ad ve tutar ikisi de boş satır atılır;
// adı boş, tutarı boş, geçersiz ya da negatif satır satırında hata verir. Sıra korunur.
export const ekMaliyetDogrula = (satirlar = []) => {
  const kalemler = []; const hatalar = {};
  (satirlar || []).forEach((s, i) => {
    const ad = String(s?.ad ?? "").trim();
    const r = tutarCoz(s?.tutar);
    if (!ad && r.bos) return;
    if (!ad) { hatalar[i] = "Kalem adı boş olamaz."; return; }
    if (r.bos) { hatalar[i] = "Tutar girilmedi."; return; }
    if (r.gecersiz) { hatalar[i] = "Tutar sayı olmalı."; return; }
    if (r.deger < 0) { hatalar[i] = "Tutar negatif olamaz."; return; }
    kalemler.push({ ad, tutar: Math.round(r.deger * 100) / 100 });
  });
  return { kalemler, hatalar, gecerli: Object.keys(hatalar).length === 0 };
};

const ayniParca = (row, partId) => String(row?.partId) === String(partId);

// AC-11: parça kartı adedi kitten okur. Çıktı { modelAdı: adet } (yalnız kitinde bu parça olan modeller).
export const parcaKitAdetleri = (partId, modelDizileri = []) => {
  const sonuc = {};
  for (const dizi of modelDizileri) for (const m of dizi || []) {
    const row = (m.defaultParcalar || []).find(r => ayniParca(r, partId));
    if (row) sonuc[m.model] = row.miktar;
  }
  return sonuc;
};

// Tek yazma yolunun çekirdeği. `kit` = { partId, ad, models (yeni işaret), eskiModeller (kayıttaki işaret), adetler }:
//  - `adetler[model]` sayıysa satır eklenir ya da adedi güncellenir (R7), `null` ise satır düşer, işaret kalır (AC-13);
//    anahtarı olmayan model (ekranda çizilmeyen, ör. çöpteki) adetçe hiç değişmez (plan P6).
//  - Bu düzenlemede işareti kaldırılan modelin satırı düşer (AC-14).
//  - Parça adı değiştiyse bütün modellerde satırın `ad` kopyası taşınır (R8/2, AC-18).
// Değişmeyen dizi aynı referansla döner (ekran "karşı bölüme yazılacak mı" kararını buna bakarak verir).
export const kitleriGuncelle = (modeller, kit) => {
  if (!Array.isArray(modeller)) return modeller;
  const { partId, ad, models = [], eskiModeller = [], adetler = {} } = kit;
  const isaret = new Set(models);
  const kaldirilan = new Set((eskiModeller || []).filter(m => !isaret.has(m)));
  let degisti = false;
  const yeni = modeller.map(m => {
    const kitler = m.defaultParcalar || [];
    const i = kitler.findIndex(r => ayniParca(r, partId));
    let sonraki = kitler;
    if (kaldirilan.has(m.model)) {
      if (i >= 0) sonraki = kitler.filter((_, j) => j !== i);
    } else if (isaret.has(m.model) && Object.prototype.hasOwnProperty.call(adetler, m.model)) {
      const adet = adetler[m.model];
      if (adet == null) { if (i >= 0) sonraki = kitler.filter((_, j) => j !== i); }
      else if (i < 0) sonraki = [...kitler, { partId: String(partId), ad, miktar: adet }];
      else if (kitler[i].miktar !== adet || kitler[i].ad !== ad) sonraki = kitler.map((r, j) => (j === i ? { ...r, ad, miktar: adet } : r));
    }
    if (sonraki === kitler && i >= 0 && ad != null && kitler[i].ad !== ad) {
      sonraki = kitler.map((r, j) => (j === i ? { ...r, ad } : r));
    }
    if (sonraki === kitler) return m;
    degisti = true;
    return { ...m, defaultParcalar: sonraki };
  });
  return degisti ? yeni : modeller;
};

// Parça kartının kaydı için karar (R15): iki model dizisinde değişecek mi? Ekran kilit denetimini buna bakarak yapar
// (plan P5: yalnız karşı bölüme yazılacaksa) ve yazımı aynı `kit` nesnesiyle iki güncelleyicide yapar.
export const parcaKitPlani = ({ partId, ad, models, eskiModeller, adetler }, standardModels = [], customModels = []) => {
  const kit = { partId, ad, models, eskiModeller, adetler };
  const std = kitleriGuncelle(standardModels, kit);
  const ozel = kitleriGuncelle(customModels, kit);
  return { kit, standartDegisir: std !== standardModels, ozelDegisir: ozel !== customModels, karsiBolumeYazar: std !== standardModels || ozel !== customModels };
};

// R8/1 (AC-17): model yeniden adlandırılınca parçanın işareti de yeni ada taşınır (kit modelin kendi kaydında, kendiliğinden
// taşınır). Değişmeyen dizi aynı referansla döner.
export const modelAdiParcalardaTasi = (parts, eskiAd, yeniAd) => {
  if (!Array.isArray(parts) || !eskiAd || eskiAd === yeniAd) return parts;
  let degisti = false;
  const yeni = parts.map(p => {
    if (!Array.isArray(p.models) || !p.models.includes(eskiAd)) return p;
    degisti = true;
    const models = [];
    for (const m of p.models) { const ad = m === eskiAd ? yeniAd : m; if (!models.includes(ad)) models.push(ad); }
    return { ...p, models };
  });
  return degisti ? yeni : parts;
};
export const modelAdiParcalaraDokunurMu = (parts, eskiAd, yeniAd) => modelAdiParcalardaTasi(parts, eskiAd, yeniAd) !== parts;
