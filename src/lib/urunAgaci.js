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
const bugunkuKurus = (p) => {
  const t = tutarliSatirlar(p);
  if (t.length) return t.reduce((a, h) => a + kurus(h.tutar), 0);
  return p.maliyet == null || p.maliyet === "" ? null : kurus(p.maliyet);
};
// Spec 0097 R2, R2/2, R2/4, R3/2: tarih aynı fonksiyonun ikinci parametresidir. Tarihsiz çağrı bugünkü çözülmüş maliyettir
// (davranışı birebir eski, C4). Tarihli okuma `getKdvRateForDate` emsaliyle geçerlilik tarihi sorgu tarihinden büyük olmayan
// EN SON kaydı uygular; boş tarih ("başlangıçtan beri") her tarihten küçüktür (tuzak 6). Emsalden iki bilinçli sapma: boş ya da
// biçimsiz sorgu tarihi bugünkü maliyeti verir, en eski kaydı değil (R2/4, tuzak 8); sorgu son kaydın aralığına düşerse saklı
// kuruş okunmaz, bugünkü çözülmüş değer döner (R3/2, plan P5: karışık sürümde iki okuma yolu ayrışmasın).
export const parcaMaliyetKurus = (p, tarih) => {
  if (!p) return null;
  const bugunku = bugunkuKurus(p);
  if (tarih === undefined) return bugunku;
  const g = maliyetGecmisiOf(p);
  if (!g.length || !gecerliGunMu(tarih)) return bugunku;
  let i = -1;
  for (let j = 0; j < g.length; j++) if (g[j].gecerli <= tarih) i = j;
  if (i < 0 || i === g.length - 1) return bugunku;
  return g[i].kurus;
};
export const parcaMaliyetiVar = (p, tarih) => parcaMaliyetKurus(p, tarih) != null;

// ── Spec 0097: maliyetin tarihli geçmişi ─────────────────────────────────────────────────────────────────────────────────
// R1/3: `parts[].maliyetGecmisi = [{ gecerli, kurus }]`, satır kimliği yok, eskiden yeniye sıralı; ilk kaydın `gecerli`'si
// "" ("başlangıçtan beri"), diğerleri "YYYY-AA-GG"; `kurus` tamsayı ya da `null` ("girilmedi", R4/3). Birimi kuruştur, kardeş
// `maliyet` alanı TL'dir; ikisi hiçbir yerde toplanmaz. C2: geçmişte saklanan kuruş 0096 C2'nin bilinçli istisnasıdır.
const GUN_DESEN = /^\d{4}-\d{2}-\d{2}$/;
export const gecerliGunMu = (t) => {
  if (typeof t !== "string" || !GUN_DESEN.test(t)) return false;
  const [y, a, g] = t.split("-").map(Number);
  const d = new Date(Date.UTC(y, a - 1, g));
  return d.getUTCFullYear() === y && d.getUTCMonth() === a - 1 && d.getUTCDate() === g;
};
export const maliyetGecmisiOf = (p) => (Array.isArray(p?.maliyetGecmisi) ? p.maliyetGecmisi : [])
  .map(x => ({ gecerli: x?.gecerli || "", kurus: x?.kurus == null ? null : x.kurus }))
  .sort((a, b) => (a.gecerli < b.gecerli ? -1 : a.gecerli > b.gecerli ? 1 : 0));
export const gunMetni = (t) => (gecerliGunMu(t) ? t.split("-").reverse().join(".") : "");

// R5, R5/3, R8, R8/3: metinler (testler buradan okur).
export const BASLANGICTAN_BERI = "başlangıçtan beri";
export const GIRILMEDI_IBARESI = "girilmedi";
export const GECERLILIK_ETIKETI = "Geçerlilik tarihi";
export const GECERLILIK_IPUCU = "Bu düzenlemede maliyet değişirse bu tarihten geçerli olur; daha önce üretilen makinalar eski maliyetle hesaplanır.";
export const GECMIS_BASLIGI = "Maliyet geçmişi";
export const TARIH_GECERSIZ_HATASI = "Geçerlilik tarihi takvimde var olan bir gün olmalı.";
export const TARIH_GELECEK_HATASI = "Geçerlilik tarihi bugünden sonra olamaz.";
export const tarihOnceHatasi = (t) => `Geçerlilik tarihi ${gunMetni(t)} tarihli kayıttan önce olamaz.`;
// Triyaj (bulgu 1): tarih düzeltmesinde sondan bir önceki kayıtla AYNI gün de reddedilir (aynı güne ikinci kayıt yazılmaz, R4/2).
export const tarihSonraHatasi = (t) => `Geçerlilik tarihi ${gunMetni(t)} tarihli kayıttan sonra olmalı.`;

// R6, R6/3 (plan P2), C5: biçim ve takvim, gelecek tarih yasak, alt sınırdan önceki tarih yasak (alt sınır "" ise yok).
// `esitRed` (triyaj bulgu 1): alt sınırla aynı gün de reddedilir; tarih düzeltmesinde kullanılır.
export const gecerlilikTarihiDogrula = (tarih, bugun, altSinir = "", { esitRed = false } = {}) => {
  if (!gecerliGunMu(tarih)) return TARIH_GECERSIZ_HATASI;
  if (tarih > bugun) return TARIH_GELECEK_HATASI;
  if (altSinir && esitRed && tarih <= altSinir) return tarihSonraHatasi(altSinir);
  if (altSinir && tarih < altSinir) return tarihOnceHatasi(altSinir);
  return null;
};

// R4, R4/2, R4/3, R6/3, R7, R7/2, R21, R21/2, R3/2 (plan P1, P2, P3, P5): TEK karar motoru. İki çağıranı var: parça kartının kayıt
// fonksiyonu ve içe aktarma (kaynak taraması sabitler). Saf: saati okumaz, `bugun` parametredir (R5/4). `eski` kayıttaki parça
// (yeni parçada null: kayıt yazılmaz, R5/2), `cozulmusK` yeni kaydın tek okuma yolundan çözülmüş maliyeti, `tarih` girilen
// geçerlilik tarihi, `tarihElle` kullanıcının tarih alanını değiştirip değiştirmediği. Dönüş `{ gecmis, hata }`; hata varsa
// geçmiş eski hâlidir ve kayıt yapılmamalıdır.
export const maliyetGecmisiYaz = (eski, cozulmusK, { tarih, bugun, tarihElle = false } = {}) => {
  const g = maliyetGecmisiOf(eski);
  if (!eski) return { gecmis: [], hata: null };
  if (!gecerliGunMu(bugun)) throw new Error("maliyetGecmisiYaz: bugun (YYYY-AA-GG) gerekli");
  const eskiK = bugunkuKurus(eski); // P5: karar kayıtta saklı son kuruştan değil, eski kaydın çözülmüş değerinden
  const yeniK = cozulmusK == null ? null : cozulmusK;
  // P5: son kayıt her yazımda bugünkü değere eşitlenir (karışık sürümde ayrışmış olabilir).
  const taban = g.length ? [...g.slice(0, -1), { gecerli: g[g.length - 1].gecerli, kurus: eskiK }] : [];
  if (yeniK === eskiK) {
    // R7, R7/2 (P3): tutar aynı; yalnız kullanıcı tarih alanını değiştirdiyse son kaydın tarihi düzeltilir.
    const son = taban[taban.length - 1];
    // Triyaj (bulgu 3): boşaltılmış tarih alanı tutar değişmiyorsa yok sayılır (maliyetle ilgisiz düzenleme engellenmesin).
    if (!tarihElle || !tarih || taban.length < 2 || !son.gecerli || tarih === son.gecerli) return { gecmis: g, hata: null };
    const hata = gecerlilikTarihiDogrula(tarih, bugun, taban[taban.length - 2].gecerli, { esitRed: true });
    if (hata) return { gecmis: g, hata };
    return { gecmis: [...taban.slice(0, -1), { gecerli: tarih, kurus: eskiK }], hata: null };
  }
  // R21/2 (P1): geçmiş boşken ilk giriş ("girilmedi" → değer) başlangıçtan beri geçerlidir, kayıt yazılmaz.
  if (!taban.length && eskiK == null) return { gecmis: g, hata: null };
  const dizi = taban.length ? taban : [{ gecerli: "", kurus: eskiK }]; // R21: eski değer "başlangıçtan beri"
  const son = dizi[dizi.length - 1];
  const hata = gecerlilikTarihiDogrula(tarih, bugun, son.gecerli); // R6/3: tutar değişirken sınır son kayıt
  if (hata) return { gecmis: g, hata };
  if (tarih === son.gecerli) return { gecmis: [...dizi.slice(0, -1), { gecerli: tarih, kurus: yeniK }], hata: null }; // R4/2, AC-7
  return { gecmis: [...dizi, { gecerli: tarih, kurus: yeniK }], hata: null };
};

// C13 (triyaj bulgu 4): kayıt fonksiyonunun geçmiş adımı. `temel` yazılacak kaydın geçmişsiz hâli, `eski` güncelleyicinin içindeki
// kayıt (eklemede null: geçmiş yazılmaz), `ek` kaydın başında çözülmüş tarih bilgisi. Karar hata dönerse (doğrulamadan sonra kaydı
// değiştiren dar bir yarış) null döner ve çağıran kaydı HİÇ değiştirmez: yeni maliyet tarihsiz geçmişle yazılmasın.
export const gecmisliKayit = (temel, eski = null, ek = null) => {
  if (!eski || !ek) { const g = eski?.maliyetGecmisi || []; return { ...temel, ...(g.length ? { maliyetGecmisi: g } : {}) }; }
  const r = maliyetGecmisiYaz(eski, parcaMaliyetKurus(temel), ek);
  if (r.hata) return null;
  return { ...temel, ...(r.gecmis.length ? { maliyetGecmisi: r.gecmis } : {}) };
};

// R8, R8/3: parça kartının salt okunur listesi, en yeni üstte (saklama sırasının tersi). Son kaydın tutarı R3/2 gereği
// bugünkü çözülmüş değerdir.
export const maliyetGecmisiSatirlari = (p) => {
  const g = maliyetGecmisiOf(p);
  return g.map((x, i) => {
    const k = i === g.length - 1 ? bugunkuKurus(p) : x.kurus;
    return { gecerli: x.gecerli, tarihMetni: x.gecerli ? gunMetni(x.gecerli) : BASLANGICTAN_BERI, tutarMetni: k == null ? GIRILMEDI_IBARESI : maliyetMetniKurus(k) };
  }).reverse();
};
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
// Spec 0099 C5/2, Karar 6: kartın kaynak ibaresi iki kullanıcı türü için tek, sayısız metindir; tedarikçi sayısı yetkili
// kullanıcıda toplam satırında yazar (yetkisiz kullanıcı sayıyı hiç görmez, 0096 triyaj bulgu 2).
export const KAYNAK_KIRILIM = "Hammadde kırılımından geliyor";
export const kirilimdanGeliyorMetni = (k) => `Maliyet hammadde kırılımından geliyor: ${maliyetMetniKurus(k)}`;
// R4/2: hiç hammadde tedarikçisi işaretlenmemişken bölümün boş durumu; işaretin konduğu yeri adıyla söyler.
export const HAMMADDE_BOS_METNI = "Henüz hammadde tedarikçisi işaretlenmedi. İşaret Giderler › Tedarikler ve Ekstre ekranındaki tedarikçi formundan konur.";
export const HAMMADDE_BOLUM_BASLIGI = "Hammadde tedarikçileri";
export const HAMMADDE_IPUCU = "Bu parçanın hammaddesini veren tedarikçiler ve parça başına tutar (TL, KDV hariç). Tutar girilen satırların toplamı parçanın alış maliyeti olur.";
// R8: tutarı boş satır varken uyarı (kaydı engellemez).
// Spec 0099 R4/4, R16, C5: hammadde satırlarının altındaki toplam satırının metinleri (kabın kimliği PartManager.jsx'te).
export const HAMMADDE_TOPLAM_ETIKETI = "Toplam, parçanın alış maliyeti";
export const hammaddeToplamSayisi = (n) => `tutarı girilen ${n} tedarikçi`;
export const HAMMADDE_TOPLAM_HATALI = "Hatalı satır var; toplam yalnız geçerli satırlardan.";
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
