// Spec 0087: parça alış maliyeti ve ürün ağacı adetleri. Saf modül, React ve zaman okumaz.
//
// İki kavram ayrıdır (R5): parçanın model İŞARETİ (`parts[].models`, "bu modelle uyumlu"; Stok'un kit önerisi süzgeci
// buna dayanır) ve modelin makina KİTİ (`defaultParcalar: [{ partId, ad, miktar }]`, stok düşümünün kaynağı). Adetin TEK
// kaynağı kittir (R6); parça kartı ona ikinci bir giriş kapısıdır. İşaret ile kitin birlikte yazılması bu modülden geçer
// (R15, AC-19): ekranlar "hangi model dizisi" dalı yazmaz, `kitleriGuncelle`'yi iki model dizisinin işlevsel
// güncelleyicisinde çağırır (tam dizi; App ekranlara çöpü süzülmüş dizi verir, geri yazmak çöptekileri silerdi).
import { tutarCoz, kurus } from "./gider";
import { tutarMetni } from "./tutarGirdisi";
import { parseMoney, partFiyatForCurrency } from "./utils";
import { gecerliGunMu, gunMetni, gecerlilikTarihiDogrula, tarihteGecerliIndeks } from "./gecerlilik";
import { malzemeSatiriVar, malzemeParcaKurus } from "./malzeme";
// Spec 0132 Karar 24: tarih kuralları ortak modüle taşındı; çağıranlar değişmesin diye aynı adla yeniden dışa verilir.
export { gecerliGunMu, gunMetni, gecerlilikTarihiDogrula, TARIH_GECERSIZ_HATASI, TARIH_GELECEK_HATASI, tarihOnceHatasi, tarihSonraHatasi } from "./gecerlilik";

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
// Spec 0121 R8, R9, R9/2, C2: üçüncü parametre `katalog` (`setKatalogu`'nun Map'i). İçeriği olan parçada (set) maliyet
// bileşenlerin toplamıdır ve elle girilen maliyet ile hammadde kırılımı okunmaz; katalog verilmezse set `null` döner (asla sıfır
// ya da eski elle değer değil). İçeriği olmayan parçada katalog okunmaz, çıktı spec öncesiyle birebir aynıdır (AC-14).
// Spec 0132 R9/2, R16/2, R16/3, C1/2: dördüncü parametre `malzemeKat` (`malzeme.malzemeKatalogu`'nun Map'i). Öncelik set içeriği,
// malzeme satırı, hammadde kırılımı, elle girilen tutar. Malzeme satırı olan parçada maliyet malzemenin (tarihli) fiyatından
// türer; parçanın kendi maliyet geçmişi, kırılımı ve elle değeri okunmaz (Karar 33). Liste verilmezse `null` (asla sıfır).
// Malzeme satırı olmayan parçada liste okunmaz, çıktı spec öncesiyle birebir aynıdır (C8, AC-56).
export const parcaMaliyetKurus = (p, tarih, katalog, malzemeKat) => {
  if (!p) return null;
  if (setMi(p)) return setOzeti(p.setIcerigi, katalog, tarih, malzemeKat).maliyetK;
  return tekilMaliyetKurus(p, tarih, malzemeKat);
};
const tekilMaliyetKurus = (p, tarih, malzemeKat) => {
  if (malzemeSatiriVar(p)) return malzemeParcaKurus(p.malzemeSatiri, malzemeKat, tarih);
  const bugunku = bugunkuKurus(p);
  if (tarih === undefined) return bugunku;
  const g = maliyetGecmisiOf(p);
  const i = tarihteGecerliIndeks(g, tarih); // 0132 Karar 24: kural ortak modülde
  return i < 0 ? bugunku : g[i].kurus;
};
export const parcaMaliyetiVar = (p, tarih, katalog, malzemeKat) => parcaMaliyetKurus(p, tarih, katalog, malzemeKat) != null;

// ── Spec 0121: setin içeriği (`parts[].setIcerigi = [{ partId, miktar }]`) ──────────────────────────────────────────────────
// R1, R1/2, R1/3: içeriği olan parça settir; ayrı kayıt türü değildir. Adı kopyalanmaz (R6), okuma anında katalogdan çözülür.
export const setIcerigiOf = (p) => (Array.isArray(p?.setIcerigi) ? p.setIcerigi.filter(r => r && r.partId != null && r.partId !== "") : []);
export const setMi = (p) => setIcerigiOf(p).length > 0;
// R9/2: katalog = Map(String(partId) → parça), yalnız CANLI parçalar (R6/2: çöpteki bileşen maliyeti eksik yapar). Çağıranlar
// bir kez kurar; emsali makinaStandartMaliyet.parcaHaritasi.
export const setKatalogu = (parts = []) => new Map((parts || []).filter(p => p && !p.deletedAt).map(p => [String(p.id), p]));
// R2/3, R8, R8/2, R10, R5/2, R11/2, R12, Karar 46: setin özeti, TEK hesap. Bileşenin maliyeti kendi (elle ya da kırılım,
// tarihli) değeridir; içeriği olan bileşene hiç bakılmaz, eksik sayılır (özyineleme yok, AC-42). Bir bileşen eksikse setin
// maliyeti `null`. Fiyat toplamı TL fiyatının tek okuma yolundan, tam lira; fiyatı olmayan satır sayılmaz ve sayısı döner.
export const setOzeti = (icerik, katalog, tarih, malzemeKat) => {
  const satirlar = (Array.isArray(icerik) ? icerik : []).filter(r => r && r.partId != null && r.partId !== "");
  let toplamK = 0, eksik = 0, fiyatToplam = 0, fiyatsiz = 0;
  for (const r of satirlar) {
    const adet = Number(r.miktar) || 0;
    const b = katalog instanceof Map ? katalog.get(String(r.partId)) : null;
    const birimK = b && !setMi(b) ? tekilMaliyetKurus(b, tarih, malzemeKat) : null; // 0132 AC-64
    if (birimK == null) eksik++; else toplamK += birimK * adet;
    const f = b ? parseMoney(partFiyatForCurrency(b, "TRY")) : 0;
    if (f > 0) fiyatToplam += f * adet; else fiyatsiz++;
  }
  return { maliyetK: satirlar.length && !eksik ? toplamK : null, eksik, fiyatToplam: Math.round(fiyatToplam), fiyatsiz, bilesen: satirlar.length };
};

// ── Spec 0097: maliyetin tarihli geçmişi ─────────────────────────────────────────────────────────────────────────────────
// R1/3: `parts[].maliyetGecmisi = [{ gecerli, kurus }]`, satır kimliği yok, eskiden yeniye sıralı; ilk kaydın `gecerli`'si
// "" ("başlangıçtan beri"), diğerleri "YYYY-AA-GG"; `kurus` tamsayı ya da `null` ("girilmedi", R4/3). Birimi kuruştur, kardeş
// `maliyet` alanı TL'dir; ikisi hiçbir yerde toplanmaz. C2: geçmişte saklanan kuruş 0096 C2'nin bilinçli istisnasıdır.
export const maliyetGecmisiOf = (p) => (Array.isArray(p?.maliyetGecmisi) ? p.maliyetGecmisi : [])
  .map(x => ({ gecerli: x?.gecerli || "", kurus: x?.kurus == null ? null : x.kurus }))
  .sort((a, b) => (a.gecerli < b.gecerli ? -1 : a.gecerli > b.gecerli ? 1 : 0));

// R5, R5/3, R8, R8/3: metinler (testler buradan okur).
export const BASLANGICTAN_BERI = "başlangıçtan beri";
export const GIRILMEDI_IBARESI = "girilmedi";
export const GECERLILIK_ETIKETI = "Geçerlilik tarihi";
export const GECERLILIK_IPUCU = "Bu düzenlemede maliyet değişirse bu tarihten geçerli olur; daha önce üretilen makinalar eski maliyetle hesaplanır.";
export const GECMIS_BASLIGI = "Maliyet geçmişi";
// R4, R4/2, R4/3, R6/3, R7, R7/2, R21, R21/2, R3/2 (plan P1, P2, P3, P5): TEK karar motoru. İki çağıranı var: parça kartının kayıt
// fonksiyonu ve içe aktarma (kaynak taraması sabitler). Saf: saati okumaz, `bugun` parametredir (R5/4). `eski` kayıttaki parça
// (yeni parçada null: kayıt yazılmaz, R5/2), `cozulmusK` yeni kaydın tek okuma yolundan çözülmüş maliyeti, `tarih` girilen
// geçerlilik tarihi, `tarihElle` kullanıcının tarih alanını değiştirip değiştirmediği. Dönüş `{ gecmis, hata }`; hata varsa
// geçmiş eski hâlidir ve kayıt yapılmamalıdır.
// Spec 0121 R7/2, C11 (Karar 43): `set` yeni kaydın içeriği doluysa true; o zaman motor HİÇ çalışmaz, kayıtta duran geçmiş aynen
// döner (silinmez). Kapı tek yerdedir; üç çağıran (kayıt fonksiyonu, kayıttan önceki tarih yoklaması, içe aktarma) geçirir.
// Spec 0132 R16/2, R16/3 (AC-63): `malzeme` yeni kaydın malzeme satırı doluysa true; set kapısının ikizi, motor HİÇ çalışmaz.
// Triyaj (bulgu 6, Karar 45): malzeme satırı kaldırılan parçada eski değer kayıttaki elle tutar DEĞİL, malzemeden çözülen bugünkü
// maliyettir (`malzemeKat` ile); böylece geçişte geçmişe "o tarihe kadar malzeme maliyeti" satırı yazılır ve kapanmış partilerin
// maliyeti değişmez. Liste verilmezse (ya da malzeme eksikse) eski değer bilinmez, kayıt yazılmaz (bilinen sınır).
export const maliyetGecmisiYaz = (eski, cozulmusK, { tarih, bugun, tarihElle = false, set = false, malzeme = false, malzemeKat = null } = {}) => {
  const g = maliyetGecmisiOf(eski);
  if (!eski) return { gecmis: [], hata: null };
  if (set || malzeme) return { gecmis: g, hata: null };
  if (!gecerliGunMu(bugun)) throw new Error("maliyetGecmisiYaz: bugun (YYYY-AA-GG) gerekli");
  // P5: karar kayıtta saklı son kuruştan değil, eski kaydın çözülmüş değerinden
  const eskiK = malzemeSatiriVar(eski) && !setMi(eski) ? malzemeParcaKurus(eski.malzemeSatiri, malzemeKat) : bugunkuKurus(eski);
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
  const r = maliyetGecmisiYaz(eski, parcaMaliyetKurus(temel), { ...ek, set: setMi(temel), malzeme: malzemeSatiriVar(temel) });
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
export const parcaMaliyetMetni = (p, tarih, katalog, malzemeKat) => maliyetMetniKurus(parcaMaliyetKurus(p, tarih, katalog, malzemeKat));
// Elle girilmiş maliyetin form metni (düzenleme açılışı; kayıttaki elle alanın tek okuyucusu, AC-32).
export const elleMaliyetMetni = (p) => tutarMetni(p?.maliyet);

// R9, R9/2, R21: maliyetin kaynağı. Kartta iki ibare, listede yalnız kırılımdan gelende ikinci satır.
// Spec 0121 R9/2: içeriği olan parçada üçüncü tür (maliyet eksik olsa da kaynak içeriktir).
// Spec 0132 R9/2, AC-65: malzeme satırı dördüncü tür; kaynak saklanmaz, türer (maliyet eksik olsa da kaynak malzemedir).
export const maliyetKaynagi = (p, tarih, katalog, malzemeKat) => (setMi(p) ? { tur: "icerik", n: setIcerigiOf(p).length }
  : malzemeSatiriVar(p) ? { tur: "malzeme" }
  : kirilimTutarliMi(p) ? { tur: "kirilim", n: tutarliSatirlar(p).length } : parcaMaliyetiVar(p, tarih, katalog, malzemeKat) ? { tur: "elle" } : null);
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

// ── Spec 0121: setin içeriği, doğrulama, ad çözümü ve metinler ───────────────────────────────────────────────────────────────
// R2, R2/2: bölümün başlığı ve metinleri (ekranda yerel kopya yazılmaz, AC-54).
export const SET_BOLUM_BASLIGI = "Setin içeriği";
export const SET_BOS_METNI = "Bu parça bir set değil. İçine parça eklerseniz set olur: maliyeti bileşenlerin maliyetlerinden gelir ve "
  + "Stok › Parça Stoğu'nda \"Set Hazırla\" ile bileşenler stoktan düşülüp setin stoğu artırılır.";
export const SET_IPUCU = "Bileşenler ve set başına adetleri. Satış, servis ve teklifte set tek kalemdir; satılınca yalnız setin kendi stoğu düşer.";
// Spec 0122 R4/2: bileşen arama kutusunun yer tutucusu; kutunun testteki tutamağıdır (R1/2), öteki çağıranların "Parça ara..."sından ayrı.
export const SET_BILESEN_ARA = "Bileşen ara...";
export const KAYNAK_ICERIK = "Setin içeriğinden geliyor";
export const SET_PASIF_NEDENI = "Maliyet setin içeriğinden geliyor; elle girilen maliyet ve hammadde kırılımı okunmaz (içerik boşalınca yeniden kullanılır).";
export const SET_TOPLAM_ETIKETI = "Setin maliyeti (bileşenlerin toplamı)";
export const setEksikMetni = (n) => `${n} bileşenin maliyeti yok; setin maliyeti "girilmedi" sayılır.`;
export const SET_FIYAT_ETIKETI = "Bileşenlerin TL fiyatı toplamı";
export const setFiyatsizMetni = (n) => `${n} bileşenin TL fiyatı yok, toplama girmedi.`;
export const SET_FIYAT_DUGMESI = "TL fiyatı toplamına eşitle";
// R24/2, R26/2: rozet ve seçimden sonraki satır.
export const setRozetMetni = (n) => `SET · ${n} bileşen`;
export const setSatirBasligi = (n) => `Set · ${n} bileşen`;
// R12/2: içe aktarmada setin maliyet hücresi alınmaz.
export const SET_EXCEL_HATASI = "bu parça bir set, maliyeti içeriğinden geliyor; Excel'deki değer alınmadı.";
// R3, R4, R5, R5/2: doğrulama metinleri.
export const SET_PARCA_SECILMEDI = "Parça seçilmedi.";
export const SET_AYNI_PARCA = "Bu parça içerikte zaten var; ikinci satır yerine adedini artırın.";
export const SET_KENDISI = "Parça kendi içeriğine eklenemez.";
export const SET_IC_ICE = "İçeriği olan parça başka bir setin içeriğine eklenemez.";
// Spec 0123 R3/4 (Karar 6): "+n" biçiminin tek tanımı; kullanım cümlesi de bunu çağırır.
export const adListesi = (adlar) => (adlar.length > 3 ? `${adlar.slice(0, 3).join(", ")} +${adlar.length - 3}` : adlar.join(", "));
export const setBileseniHatasi = (adlar) => `Bu parça şu setlerin içeriğinde geçtiği için set yapılamaz: ${adListesi(adlar)}.`;
// R6, R6/2: ad çözümü HAM diziden (çöpteki parçanın adı çözülsün). Emsali hammaddeTedarikciAdi.
export const SILINMIS_PARCA = "silinmiş parça";
export const BULUNAMAYAN_PARCA = "kaydı bulunamayan parça";
// Karar 47: ham dizi almayan iki formun salt okunur satırı canlı diziden çözer; bulunamayanı nötr adlandırır.
export const LISTEDE_OLMAYAN_PARCA = "listede olmayan parça";
export const setBilesenAdi = (partId, hamParts = []) => {
  const p = (hamParts || []).find(x => String(x.id) === String(partId));
  if (!p) return BULUNAMAYAN_PARCA;
  return p.deletedAt ? `${p.ad} (${SILINMIS_PARCA})` : p.ad;
};
// R5, R6/2: seçicinin ölçütü "çöpte değil, içeriği boş ve kendisi değil".
export const setBileseniSecilebilirMi = (p, kendiId) => !!p && !p.deletedAt && !setMi(p) && (kendiId == null || String(p.id) !== String(kendiId));
// Spec 0122 R2/2, Karar 5: arama seçicisinin aday kümesi. Bugünkü küme (`setBileseniSecilebilirMi`) eksi içerikte satırı olan
// parçalar; sıra katalog sırasıdır (R6/2). Yinelenen satır böylece seçilemez, uyarı yazılmaz.
export const setBilesenAdaylari = (parts = [], kendiId = null, satirlar = []) => {
  const secili = new Set((satirlar || []).map(s => String(s?.partId)));
  return (parts || []).filter(p => setBileseniSecilebilirMi(p, kendiId) && !secili.has(String(p.id)));
};
// R5/2, Karar 48: bu parçayı içeriğinde taşıyan CANLI setlerin adları (kendisi hariç).
export const parcayiIcerenSetler = (partId, parts = []) => (parts || [])
  .filter(p => p && !p.deletedAt && String(p.id) !== String(partId) && setIcerigiOf(p).some(r => String(r.partId) === String(partId)))
  .map(p => p.ad);
// ── Spec 0123: sette ve kitte geçen parça silinirken koruma ──────────────────────────────────────────────────────────────────
// R1, R1/2, R1/5–R1/7 (Karar 1, 4, 7, 30): set kullanımının haritası, BİR KEZ kurulur (0096 `kirilimdaGecenTedarikciler` deseni).
// Değer `{ set, cop }`: bu parçayı içeriğinde taşıyan canlı set sayısı ve KENDİSİ çöpte olan set sayısı (ayrık; parçanın kendi
// durumu girmez). Setin kendisinin bileşen olduğu satır atlanır (içe aktarılmış veride kendine atıf parçayı korumasın).
export const setteGecenParcalar = (parts = []) => {
  const m = new Map();
  for (const p of parts || []) {
    if (!p) continue;
    const gorulen = new Set();
    for (const r of setIcerigiOf(p)) {
      const id = String(r.partId);
      if (id === String(p.id) || gorulen.has(id)) continue;
      gorulen.add(id);
      const x = m.get(id) || { set: 0, cop: 0 };
      if (p.deletedAt) x.cop += 1; else x.set += 1;
      m.set(id, x);
    }
  }
  return m;
};
/** R1, R1/3, R1/4 (AC-14, AC-16): kimlik başına kullanım `{ set, setCop, kit }`; hazır harita verilince yeniden kurulmaz. */
export const parcaKullanimi = (partId, { parts = [], modelDizileri = [], harita = null } = {}) => {
  const x = (harita || setteGecenParcalar(parts)).get(String(partId)) || { set: 0, cop: 0 };
  const kit = (modelDizileri || []).length ? Object.keys(parcaKitAdetleri(partId, modelDizileri)).length : 0;
  return { set: x.set, setCop: x.cop, kit };
};
/** R1/5 (Karar 4, AC-19): kalıcı silme kapılarının tek yüklemi; `.has()` değil, iki sayının toplamı. */
export const setteGecenParcaMi = (partId, harita) => {
  const x = harita?.get(String(partId));
  return !!x && (x.set + x.cop) > 0;
};
/** R1/8 (Karar 26, 36, 37): onay cümlesinin set adları. Canlılar `parcayiIcerenSetler`'den, çöptekiler ekli adla; kendisi hariç. */
export const setKullanimAdlari = (partId, parts = []) => [
  ...parcayiIcerenSetler(partId, parts),
  ...(parts || []).filter(p => p && p.deletedAt && String(p.id) !== String(partId) && setIcerigiOf(p).some(r => String(r.partId) === String(partId)))
    .map(p => `${p.ad} (${SILINMIS_PARCA})`),
];
/** R3/4 (Karar 6, 25): kullanım cümlesinin üç hâli; kullanım yoksa boş dize (satır çizilmez). */
export const parcaKullanimMetni = ({ setAdlari = [], kit = 0 } = {}) => {
  const setCumlesi = setAdlari.length ? `Bu parça şu setlerin içeriğinde geçiyor: ${adListesi(setAdlari)}.` : "";
  if (!kit) return setCumlesi;
  return setCumlesi ? `${setCumlesi} ${kit} model kitinde de geçiyor.` : `Bu parça ${kit} model kitinde geçiyor.`;
};
// R4/2 (Karar 11, 12): 0096'nın `KIRILIMDA_TEDARIKCI_NEDENI` kardeşi; adres aynı. R4/5 (Karar 38): ret bildirimi.
export const SETTE_PARCA_NEDENI = "Bir setin içeriğinde bileşen olarak geçiyor; önce Ayarlar › Katalog › Parça/Yedek Parça'da o setin içeriğinden çıkarın.";
export const SETTE_PARCA_RED_METNI = `Yedek parça tanımı kalıcı silinemez: ${SETTE_PARCA_NEDENI}`;
// Triyaj bulgu 1 (Karar 46): "çöpü boşalt" bildiriminin eki; sözü verilen sayı ile sonuç tutsun.
export const setteBirakilanEki = (n) => (n > 0 ? ` Sette bileşen olan ${n} yedek parça tanımı çöpte bırakıldı.` : "");
// Formda içerik hep form biçimindedir (kimlik ve adet metin).
export const setIcerigiFormu = (kayit = []) => (kayit || []).map(r => ({ partId: r?.partId == null ? "" : String(r.partId), miktar: r?.miktar == null ? "" : String(r.miktar) }));
// R3, R4, R5, R5/2, R7: TEK doğrulayıcı. Parçası ve adedi boş satır atılır; boş içerik kayda yazılmaz (`kayit` boş).
// `parts` CANLI katalog (iç içe denetimi ve iki yönlü yasak için). Dönüş `{ kayit, hatalar: {i: metin}, genel, gecerli }`.
// Spec 0124 C6 (Karar 2, 22): içe aktarma çağırırken iki hazır harita geçirir (0096/0123 deseni): `harita` canlı kimlik haritası
// (`setKatalogu`), `setteGecen` `setteGecenParcalar` sonucu. Verilmezse bugünkü yol aynen; verilince satır başına katalog
// gezilmez, ters yönün set adları yalnız ret çıkan satırda okunur.
export const setIcerigiDogrula = (satirlar = [], { kendiId = null, parts = [], harita: hazirHarita = null, setteGecen = null, icerenAdlari = null } = {}) => {
  const kayit = []; const hatalar = {}; const gorulen = new Set();
  const harita = hazirHarita || new Map((parts || []).filter(p => p && !p.deletedAt).map(p => [String(p.id), p]));
  (satirlar || []).forEach((s, i) => {
    const pid = s?.partId == null ? "" : String(s.partId).trim();
    const m = kitAdediDogrula(s?.miktar);
    if (!pid && m.bos) return;
    if (!pid) { hatalar[i] = SET_PARCA_SECILMEDI; return; }
    if (kendiId != null && pid === String(kendiId)) { hatalar[i] = SET_KENDISI; return; }
    if (gorulen.has(pid)) { hatalar[i] = SET_AYNI_PARCA; return; }
    const b = harita.get(pid);
    if (b && setMi(b)) { hatalar[i] = SET_IC_ICE; return; }
    if (m.bos || m.hata) { hatalar[i] = KIT_ADET_HATASI; return; }
    gorulen.add(pid);
    kayit.push({ partId: /^\d+$/.test(pid) ? Number(pid) : pid, miktar: m.deger });
  });
  const tersYon = kayit.length && kendiId != null && (!setteGecen || (setteGecen.get(String(kendiId))?.set || 0) > 0);
  const icerenler = tersYon ? (icerenAdlari ? icerenAdlari(kendiId) : parcayiIcerenSetler(kendiId, parts)) : [];
  const genel = icerenler.length ? setBileseniHatasi(icerenler) : null;
  return { kayit, hatalar, genel, gecerli: !Object.keys(hatalar).length && !genel };
};
// ── Spec 0124: parça şablonunda set içeriği sütunu ──────────────────────────────────────────────────────────────────────────
// R2, R3, C2 (Karar 16, 18, 21): yazıcı ve çözücü aynı yerde. Biçim `AD x ADET; AD x ADET`; yazıcı her zaman `x` yazar, adı
// canlı katalogdan çözer (ad kopyalanmaz), çözülemeyen bileşen parantezli tek yer tutucuyla. Katalog verilmezse hücre boş (R3/3).
export const SET_ICERIGI_BASLIGI = "Set İçeriği";
export const SET_ICERIGI_BICIMI = "Bileşen Adı x Adet; Bileşen Adı x Adet";
export const SET_ICERIGI_ORNEGI = "Örnek Bileşen x 2; Başka Bileşen x 1";
export const SET_ICERIGI_YER_TUTUCU = `(${LISTEDE_OLMAYAN_PARCA})`;
export const SET_BILESEN_BULUNAMADI = "Bileşen katalogda ve dosyada bulunamadı.";
export const setIcerigiHucresi = (p, katalog) => {
  if (typeof katalog?.get !== "function") return ""; // katalog yok ya da `.map(parcaDisaAktarmaSatiri)` dizi indeksi geçirdi
  return setIcerigiOf(p).map(r => `${katalog.get(String(r.partId))?.ad ?? SET_ICERIGI_YER_TUTUCU} x ${r.miktar}`).join("; ");
};
// R2/2 (Karar 18): hücreyi parçalara böler (boş parçalar atlanır); ad çözümü ad bulucuyla yapılır: parçanın TAMAMI ad olarak
// aranır (adet 1), bulunmazsa SON ayraçta (`x`, `X`, `*`, `×`) bölünür. Ölçüyle biten adlar ("…30x55x13") böylece doğru okunur.
export const setIcerigiHucresiParcala = (metin) => String(metin ?? "").split(";").map(x => x.trim()).filter(Boolean);
const SON_AYRAC = /^(.*\S)\s*[xX*×]\s*(\S+)$/;
export const setIcerigiParcasiCoz = (parca, adBul) => {
  const tam = adBul(parca);
  if (tam != null) return { ad: parca, metin: parca, id: tam, adetHam: "1" };
  const m = SON_AYRAC.exec(parca);
  if (!m) return { ad: parca, metin: parca, id: null, adetHam: "1" };
  const ad = m[1].trim();
  // Triyaj (bulgu 2): `metin` kullanıcının yazdığı parçadır; "bulunamadı" bildirimi onu gösterir (bölünmüş sol taraf değil).
  return { ad, metin: parca, id: adBul(ad) ?? null, adetHam: m[2] };
};
// R10 (Karar 10, 20): içeriği yazılan parça sayısı; önizleme ve kaydetme bildirimi aynı rakamı yazar, sıfırda hiç yazılmaz.
export const icerikYazilacakMetni = (n) => (n > 0 ? `${n} parçanın set içeriği yazılacak.` : "");
export const icerikYazildiMetni = (n) => (n > 0 ? ` ${n} parçanın set içeriği yazıldı.` : "");
// Spec 0124 triyaj (bulgu 1): `parcayiIcerenSetler`'in haritalı kardeşi; bütün kataloğun "bu parçayı içeren canlı setlerin adları"
// tek geçişte (kendisi hariç, aynı setin yinelenen satırı bir kez). Doğrulamanın `icerenAdlari` seçeneğine verilir.
export const icerenSetAdlariHaritasi = (parts = []) => {
  const m = new Map();
  for (const p of parts || []) {
    if (!p || p.deletedAt) continue;
    const gorulen = new Set();
    for (const r of setIcerigiOf(p)) {
      const id = String(r.partId);
      if (id === String(p.id) || gorulen.has(id)) continue;
      gorulen.add(id);
      if (!m.has(id)) m.set(id, []);
      m.get(id).push(p.ad);
    }
  }
  return m;
};
// R6/3 (Karar 7): dosya satırı başına tek bildirim.
export const setIcerigiExcelHatasi = (satirNo, neden, ad = null, kalan = 0) =>
  `Satır ${satirNo}: Set içeriği alınmadı: ${String(neden).replace(/\.$/, "")}${ad ? ` (${ad})` : ""}${kalan > 0 ? ` ve ${kalan} bileşen daha` : ""}.`;
// R26/2, Karar 47: seçimden sonraki salt okunur satır (servis formu sepeti, yedek parça formu). `null` = set değil.
export const setIcerikSatiri = (p, canliParts = []) => {
  const ic = setIcerigiOf(p);
  if (!ic.length) return null;
  const harita = new Map((canliParts || []).filter(x => x && !x.deletedAt).map(x => [String(x.id), x]));
  return { baslik: setSatirBasligi(ic.length), bilesenler: ic.map(r => `${Number(r.miktar) || 0} × ${harita.get(String(r.partId))?.ad || LISTEDE_OLMAYAN_PARCA}`) };
};
// R32/2 (Karar 39): Model Maliyetleri'nin kesişim uyarısı. Kayıt engellenmez, düzeltme veri işidir (X11).
export const setKesisimMetni = (kesisimler = []) => `kitte hem set hem bileşeni var: ${kesisimler.map(k => `${k.setAd} › ${k.bilesenAd}`).join(", ")}`;
