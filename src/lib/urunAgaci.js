// Spec 0087: parça alış maliyeti ve ürün ağacı adetleri. Saf modül, React ve zaman okumaz.
//
// İki kavram ayrıdır (R5): parçanın model İŞARETİ (`parts[].models`, "bu modelle uyumlu"; Stok'un kit önerisi süzgeci
// buna dayanır) ve modelin makina KİTİ (`defaultParcalar: [{ partId, ad, miktar }]`, stok düşümünün kaynağı). Adetin TEK
// kaynağı kittir (R6); parça kartı ona ikinci bir giriş kapısıdır. İşaret ile kitin birlikte yazılması bu modülden geçer
// (R15, AC-19): ekranlar "hangi model dizisi" dalı yazmaz, `kitleriGuncelle`'yi iki model dizisinin işlevsel
// güncelleyicisinde çağırır (tam dizi; App ekranlara çöpü süzülmüş dizi verir, geri yazmak çöptekileri silerdi).
import { tutarCoz, kurus } from "./gider";
import { tutarMetni } from "./tutarGirdisi";

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

// ── Spec 0096: hammadde tedarikçisi kırılımı ve parça maliyetinin TEK okuma yolu ──────────────────────────────────────────
// Kırılım `parts[].hammaddeler = [{ tedarikciId, tutar }]` (tutar TL, KDV hariç; boşsa `null` = "tutar girilmedi", sıfır
// girilmiş sayılır, R8/2, R12). En az bir satırda tutar varsa parçanın maliyeti o satırların toplamıdır ve elle girilen alan
// kullanılmaz (R5); hiçbir satırda tutar yoksa maliyet elle girilen değerdir (R6). Toplam saklanmaz, okuma anında türer (C2).
// C1, C9: maliyetin tek okuma yolu bu iki fonksiyondur ve birimi kuruştur; TL'ye çevirme yalnız biçimlemede olur.
const tutarliSatirlar = (p) => (p?.hammaddeler || []).filter(h => h && h.tutar != null && h.tutar !== "");
export const kirilimTutarliMi = (p) => tutarliSatirlar(p).length > 0;
export const parcaMaliyetKurus = (p) => {
  if (!p) return null;
  const t = tutarliSatirlar(p);
  if (t.length) return t.reduce((a, h) => a + kurus(h.tutar), 0);
  return p.maliyet == null || p.maliyet === "" ? null : kurus(p.maliyet);
};
export const parcaMaliyetiVar = (p) => parcaMaliyetKurus(p) != null;
// Spec 0087'nin adı korunur (çağıranlar değişmesin); spec 0096 C1 ile kırılımı da bilen ölçütün üstüne indi.
export const maliyetGirildiMi = parcaMaliyetiVar;
// Plan P7: kuruştan biçimleyici (parça paneli makina maliyeti motorunu içe almaz). Girilmemiş "—", sıfır "0,00 ₺".
export const maliyetMetniKurus = (k) => (k == null ? "—" : `${ikiHane.format(k / 100)} ₺`);
export const parcaMaliyetMetni = (p) => maliyetMetniKurus(parcaMaliyetKurus(p));
// Elle girilmiş maliyetin form metni (düzenleme açılışı; kayıttaki elle alanın tek okuyucusu, AC-32).
export const elleMaliyetMetni = (p) => tutarMetni(p?.maliyet);

// R9, R9/2, R21: maliyetin kaynağı. Kartta iki ibare, listede yalnız kırılımdan gelende ikinci satır.
export const maliyetKaynagi = (p) => (kirilimTutarliMi(p) ? { tur: "kirilim", n: tutarliSatirlar(p).length } : parcaMaliyetiVar(p) ? { tur: "elle" } : null);
export const KAYNAK_ELLE = "Elle girildi";
export const kaynakListeMetni = (n) => `${n} tedarikçiden`;
export const kaynakKartMetni = (n) => `${n} tedarikçinin hammadde kırılımından geliyor`;
// Triyaj (bulgu 2): gider yetkisi olmayan kullanıcı tedarikçi SAYISINI da görmez (listede ikinci satır kapalı); kartta sayısız ibare.
export const KAYNAK_KIRILIM_YETKISIZ = "Hammadde kırılımından geliyor";
export const kirilimdanGeliyorMetni = (k) => `Maliyet hammadde kırılımından geliyor: ${maliyetMetniKurus(k)}`;
// R4/2: hiç hammadde tedarikçisi işaretlenmemişken bölümün boş durumu; işaretin konduğu yeri adıyla söyler.
export const HAMMADDE_BOS_METNI = "Henüz hammadde tedarikçisi işaretlenmedi. İşaret Giderler › Tedarikler ve Ekstre ekranındaki tedarikçi formundan konur.";
export const HAMMADDE_BOLUM_BASLIGI = "Hammadde tedarikçileri";
export const HAMMADDE_IPUCU = "Bu parçanın hammaddesini veren tedarikçiler ve parça başına tutar (TL, KDV hariç). Tutar girilen satırların toplamı parçanın alış maliyeti olur.";
// R8: tutarı boş satır varken uyarı (kaydı engellemez).
export const HAMMADDE_TUTARSIZ_UYARI = "Tutarı girilmemiş tedarikçi var; maliyet yalnız tutarı girilmiş satırların toplamıdır.";
// R24: içe aktarmada kırılımı tutarlı parçanın maliyet hücresi alınmaz.
export const HAMMADDE_EXCEL_HATASI = "bu parçanın maliyeti hammadde kırılımından geliyor, Excel'deki değer alınmadı.";
// R16, R16/2: tek çözücü, iki metin; tutar her durumda maliyete girer (maliyet tedarikçi kaydının durumuna bakmaz).
export const SILINMIS_TEDARIKCI = "silinmiş tedarikçi";
export const BULUNAMAYAN_TEDARIKCI = "kaydı bulunamayan tedarikçi";
// R17/2: ad çözümü HAM diziden (çöptekinin adı çözülsün), seçici ayrıca süzülür.
export const hammaddeTedarikciAdi = (tedarikciId, hamTedarikciler = []) => {
  const t = (hamTedarikciler || []).find(x => String(x.id) === String(tedarikciId));
  if (!t) return BULUNAMAYAN_TEDARIKCI;
  return t.deletedAt ? `${t.ad} (${SILINMIS_TEDARIKCI})` : t.ad;
};
export const hammaddeSecilebilirMi = (t) => !!t && !t.deletedAt && t.hammadde === true;

// R17/3 (plan P4): kırılım formda hep form biçimindedir (tutar metin); kayıt fonksiyonu hep form biçiminden çözer.
export const hammaddeFormu = (kayit = []) => (kayit || []).map(h => ({ tedarikciId: h?.tedarikciId == null ? "" : String(h.tedarikciId), tutar: tutarMetni(h?.tutar) }));
const kimlikCoz = (v) => (/^\d+$/.test(String(v)) ? Number(v) : v);
// R23 (`ekMaliyetDogrula` emsali), R11, R12: tedarikçisi ve tutarı boş satır atılır; tedarikçisi boş tutarı dolu satır
// "Tedarikçi seçilmedi."; negatif ve sayı olmayan tutar hata; aynı tedarikçi iki kez hata. Sıfır serbest, boş tutar `null`.
export const TEDARIKCI_SECILMEDI = "Tedarikçi seçilmedi.";
export const hammaddeDogrula = (satirlar = []) => {
  const kayit = []; const hatalar = {}; const gorulen = new Set();
  (satirlar || []).forEach((s, i) => {
    const ted = s?.tedarikciId == null ? "" : String(s.tedarikciId).trim();
    const r = tutarCoz(s?.tutar);
    if (!ted && r.bos) return;
    if (!ted) { hatalar[i] = TEDARIKCI_SECILMEDI; return; }
    if (gorulen.has(ted)) { hatalar[i] = "Bu tedarikçi bu parçada zaten var."; return; }
    if (r.gecersiz) { hatalar[i] = "Tutar sayı olmalı."; return; }
    if (!r.bos && r.deger < 0) { hatalar[i] = "Tutar negatif olamaz."; return; }
    gorulen.add(ted);
    kayit.push({ tedarikciId: kimlikCoz(ted), tutar: r.bos ? null : Math.round(r.deger * 100) / 100 });
  });
  const tutarli = kayit.filter(h => h.tutar != null).length;
  return { kayit, hatalar, gecerli: Object.keys(hatalar).length === 0, tutarsizVar: tutarli > 0 && tutarli < kayit.length };
};

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
