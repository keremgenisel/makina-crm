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
import { malzemeOzeti, malzemeSatiriDogrula, malzemeSatiriFormu, BELIRSIZ_DESEN, BELIRSIZ_HATASI } from "./malzeme";
import { maliyetKalemleriOf, KALEM_TUR, MALIYET_KALEM_SINIRI } from "./maliyetKalemleri";
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

// ── Spec 0096 + 0135: parça maliyetinin TEK okuma yolu ────────────────────────────────────────────────────────────────────
// C1, C9: maliyetin tek okuma yolu bu iki fonksiyondur ve birimi kuruştur; TL'ye çevirme yalnız biçimlemede olur.
// Spec 0135 R7, R8, R14, R16, R27, R27/2, C10: kalem listesi (`maliyetKalemleri.maliyetKalemleriOf`, eski alanlardan türetilmiş
// olabilir) varsa maliyet kalemlerin TOPLAMIDIR. Malzeme kaleminin tutarı bugünkü tek satır hesabının kuruşa yuvarlanmış değeri ×
// adet; işlem kaleminin tutarı girilmişse kuruşu, girilmemişse toplama girmez (R19). Bir malzeme kalemi çözülemiyorsa ya da hiçbir
// kalem tutar vermiyorsa sonuç null ("girilmedi"); zincir elle değere DÜŞMEZ (R27/2). Toplam ikinci kez yuvarlanmaz.
// Kalem listesi boşsa maliyet elle girilen değerdir (0087).
export const KALEM_ADET_UST = 1000;
// Triyaj (bulgu 3): malzeme kaleminin adedinin TEK okuyucusu (maliyet ve sipariş aynı kural); tam sayı değil ya da 1'den küçükse
// null, yani kalem çözülemez (maliyet "girilmedi", siparişte eksik).
export const kalemAdetiOf = (k) => { const n = Number(k?.adet ?? 1); return Number.isInteger(n) && n >= 1 ? n : null; };
// Kalemlerin tek hesabı; parça kartının canlı özeti de bunu okur (C2, kart çarpım ve toplama yapmaz). `tarih` yalnız malzeme
// kalemlerine iner (R35/4: işlem kalemi bugünkü tutarıyla girer).
export const maliyetKalemleriOzeti = (kalemler, malzemeKat, tarih) => {
  const satirlar = (kalemler || []).map(k => {
    if (k.tur === KALEM_TUR.MALZEME) {
      const oz = malzemeOzeti(k, malzemeKat, tarih);
      const adet = kalemAdetiOf(k);
      const tutarK = oz.maliyetK == null || adet == null ? null : oz.maliyetK * adet;
      return { tur: k.tur, tutarK, birimK: oz.maliyetK, adet, ozet: oz, cozuldu: tutarK != null };
    }
    const bos = k.tutar == null || k.tutar === "";
    return { tur: KALEM_TUR.ISLEM, tutarK: bos ? null : kurus(k.tutar), bos, cozuldu: true };
  });
  const malzemeEksik = satirlar.some(r => r.tur === KALEM_TUR.MALZEME && !r.cozuldu);
  const katkili = satirlar.filter(r => r.tutarK != null);
  const toplamK = !satirlar.length || malzemeEksik || !katkili.length ? null : katkili.reduce((a, r) => a + r.tutarK, 0);
  return {
    satirlar, toplamK,
    malzeme: satirlar.filter(r => r.tur === KALEM_TUR.MALZEME).length, islem: satirlar.filter(r => r.tur === KALEM_TUR.ISLEM).length,
    bosIslem: satirlar.filter(r => r.tur === KALEM_TUR.ISLEM && r.bos).length,
  };
};
// Set dışı parçanın bugünkü çözülmüş maliyeti (kalem listesi ya da elle).
const bugunkuKurus = (p, malzemeKat) => {
  const kalemler = maliyetKalemleriOf(p);
  if (kalemler.length) return maliyetKalemleriOzeti(kalemler, malzemeKat).toplamK;
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
// Spec 0135 R27, R35, R35/4: öncelik set içeriği, kalem listesi, elle tutar. En az bir malzeme kalemi varsa parçanın kendi geçmişi
// okunmaz; malzeme kalemleri o tarihin malzeme fiyatıyla, işlem kalemleri bugünkü tutarıyla girer (karma okuma). Yalnız işlem
// kalemi olan parçada bugünkü kırılım davranışı sürer (geçmiş araması; 0097 R5/3).
export const parcaMaliyetKurus = (p, tarih, katalog, malzemeKat) => {
  if (!p) return null;
  if (setMi(p)) return setOzeti(p.setIcerigi, katalog, tarih, malzemeKat).maliyetK;
  return tekilMaliyetKurus(p, tarih, malzemeKat);
};
const tekilMaliyetKurus = (p, tarih, malzemeKat) => {
  const kalemler = maliyetKalemleriOf(p);
  if (kalemler.some(k => k.tur === KALEM_TUR.MALZEME)) return maliyetKalemleriOzeti(kalemler, malzemeKat, tarih).toplamK;
  const bugunku = bugunkuKurus(p, malzemeKat);
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
// Spec 0133 Karar 30: beşinci parametre isteğe bağlı fiyat okuyucusu (bileşen → TL fiyatı); verilmezse bugünkü elle girilen
// TL fiyatı. Maliyet motoru fiyat kavramını bilmez, okuyucuyu parça kartı verir (`parcaFiyati.setFiyatOkuyucu`).
export const setOzeti = (icerik, katalog, tarih, malzemeKat, fiyatOku = null) => {
  const satirlar = (Array.isArray(icerik) ? icerik : []).filter(r => r && r.partId != null && r.partId !== "");
  let toplamK = 0, eksik = 0, fiyatToplam = 0, fiyatsiz = 0;
  for (const r of satirlar) {
    const adet = Number(r.miktar) || 0;
    const b = katalog instanceof Map ? katalog.get(String(r.partId)) : null;
    const birimK = b && !setMi(b) ? tekilMaliyetKurus(b, tarih, malzemeKat) : null; // 0132 AC-64
    if (birimK == null) eksik++; else toplamK += birimK * adet;
    const f = b ? parseMoney(fiyatOku ? fiyatOku(b) : partFiyatForCurrency(b, "TRY")) : 0;
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
// Spec 0135 R35, tuzak 5: `malzeme` artık "yeni kayıtta en az bir malzeme kalemi var mı"dır (dar kapı; yalnız işlem kalemi olan
// parçada motor çalışır). R36: eski değer eski kaydın kalemlerinden (malzeme listesiyle) çözülür.
// Triyaj (bulgu 6, Karar 45): malzeme satırı kaldırılan parçada eski değer kayıttaki elle tutar DEĞİL, malzemeden çözülen bugünkü
// maliyettir (`malzemeKat` ile); böylece geçişte geçmişe "o tarihe kadar malzeme maliyeti" satırı yazılır ve kapanmış partilerin
// maliyeti değişmez. Liste verilmezse (ya da malzeme eksikse) eski değer bilinmez, kayıt yazılmaz (bilinen sınır).
export const maliyetGecmisiYaz = (eski, cozulmusK, { tarih, bugun, tarihElle = false, set = false, malzeme = false, malzemeKat = null } = {}) => {
  const g = maliyetGecmisiOf(eski);
  if (!eski) return { gecmis: [], hata: null };
  if (set || malzeme) return { gecmis: g, hata: null };
  if (!gecerliGunMu(bugun)) throw new Error("maliyetGecmisiYaz: bugun (YYYY-AA-GG) gerekli");
  // P5: karar kayıtta saklı son kuruştan değil, eski kaydın çözülmüş değerinden
  const eskiK = bugunkuKurus(eski, malzemeKat);
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
const malzemeKalemiVarMiYerel = (p) => maliyetKalemleriOf(p).some(k => k.tur === KALEM_TUR.MALZEME);
export const gecmisliKayit = (temel, eski = null, ek = null) => {
  if (!eski || !ek) { const g = eski?.maliyetGecmisi || []; return { ...temel, ...(g.length ? { maliyetGecmisi: g } : {}) }; }
  const r = maliyetGecmisiYaz(eski, parcaMaliyetKurus(temel), { ...ek, set: setMi(temel), malzeme: malzemeKalemiVarMiYerel(temel) });
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

// Spec 0135 R39, R39/2: maliyetin kaynağı üç türdür: set içeriği, kalem listesi (kaç malzeme, kaç işlem kalemi), elle. Kaynak
// saklanmaz, türer. Kalem ibaresi yetki istemez (tedarikçi kimliği taşımaz, C6/2).
export const maliyetKaynagi = (p, tarih, katalog, malzemeKat) => {
  if (setMi(p)) return { tur: "icerik", n: setIcerigiOf(p).length };
  const kalemler = maliyetKalemleriOf(p);
  if (kalemler.length) return { tur: "kalem", malzeme: kalemler.filter(k => k.tur === KALEM_TUR.MALZEME).length, islem: kalemler.filter(k => k.tur === KALEM_TUR.ISLEM).length };
  return parcaMaliyetiVar(p, tarih, katalog, malzemeKat) ? { tur: "elle" } : null;
};
export const KAYNAK_ELLE = "Elle girildi";
export const kalemKaynakMetni = ({ malzeme = 0, islem = 0 } = {}) => `Maliyet kalemlerinden hesaplanıyor (${malzeme} malzeme, ${islem} işlem kalemi)`;

// Spec 0096 R11/2 ve spec 0135 R24: işlem kaleminin tedarikçisinin adı HAM diziden; çöpteki ve bulunamayan iki ibareyle.
export const SILINMIS_TEDARIKCI = "silinmiş tedarikçi";
export const BULUNAMAYAN_TEDARIKCI = "kaydı bulunamayan tedarikçi";
export const tedarikciAdiCoz = (tedarikciId, hamTedarikciler = []) => {
  const t = (hamTedarikciler || []).find(x => String(x.id) === String(tedarikciId));
  if (!t) return BULUNAMAYAN_TEDARIKCI;
  return t.deletedAt ? `${t.ad} (${SILINMIS_TEDARIKCI})` : t.ad;
};
// Spec 0135 R17/2 (AC-101): işlem kaleminin tedarikçi seçicisi bütün canlı tedarikçileri listeler; hammadde işaretliler başta
// (0132'nin ana tedarikçi seçicisinin deseni). İşaret şart değildir.
export const islemTedarikciSecenekleri = (tedarikciler = []) => (tedarikciler || []).filter(t => t && !t.deletedAt)
  .map((t, i) => ({ t, i })).sort((a, b) => (Number(b.t.hammadde === true) - Number(a.t.hammadde === true)) || (a.i - b.i)).map(x => x.t);

const kimlikCoz = (v) => (/^\d+$/.test(String(v)) ? Number(v) : v);
// ── Spec 0135: kalem formu ve doğrulama ──────────────────────────────────────────────────────────────────────────────────
export const KALEM_SINIRI_NEDENI = `Bir parçada en çok ${MALIYET_KALEM_SINIRI} maliyet kalemi olabilir.`;
export const ADET_UST_HATASI = "Adet en çok 1.000 olabilir.";
export const MALZEME_SECILMEDI = "Malzeme seçilmedi.";
export const ISLEM_AD_HATASI = "İşlem adı boş olamaz.";
export const ISLEM_TUTAR_SAYI_HATASI = "Tutar sayı olmalı.";
export const ISLEM_TUTAR_NEGATIF_HATASI = "Tutar negatif olamaz.";
export const ISLEM_TUTAR_UYARISI = "Tutar girilmedi; bu kalem toplama girmez.";
// R13, R13/2 (AC-24, AC-25, AC-115): adedin ayrıştırıcısı setin içeriğindeki adetle aynı (yalnız rakam deseni, binlik ayracı yok);
// iki ayrı metin: tam sayı olmayan değere setin metni, üst sınırı aşana kendi metni. Boş adet de tam sayı değildir.
export const kalemAdediDogrula = (ham) => {
  const d = setAdediDogrula(ham);
  if (d.bos || d.hata) return { deger: null, hata: SET_ADET_HATASI };
  if (d.deger > KALEM_ADET_UST) return { deger: null, hata: ADET_UST_HATASI };
  return { deger: d.deger, hata: null };
};
// R18, R18/2, R19, R19/2 (AC-33–AC-36, AC-103): işlem kalemi. Ad kırpılır; tutar boşsa uyarı (kayıt engellenmez, `null`);
// belirsiz sayı ("2.400"), negatif ya da sayıya çevrilemez tutar hata; geçerli tutar iki ondalığa yuvarlanır.
const islemTutariDogrula = (ham) => {
  if (ham == null || String(ham).trim() === "") return { deger: null, bos: true, hata: null };
  if (typeof ham === "string" && BELIRSIZ_DESEN.test(ham)) return { deger: null, hata: BELIRSIZ_HATASI };
  const r = tutarCoz(ham);
  if (r.bos) return { deger: null, bos: true, hata: null };
  if (r.gecersiz) return { deger: null, hata: ISLEM_TUTAR_SAYI_HATASI };
  if (r.deger < 0) return { deger: null, hata: ISLEM_TUTAR_NEGATIF_HATASI };
  return { deger: Math.round(r.deger * 100) / 100, hata: null };
};
// Formdaki kalemler (metin alanları) → kayıt biçimi. Dönüş { kayit, hatalar: { [i]: { alan: metin } }, uyarilar: { [i]: metin },
// gecerli }. Hatalı malzeme kalemi kaydı engeller; tutarı boş işlem kalemi yalnız uyarır (R43). Sınır doğrulamada yok (R9/2).
export const kalemlerDogrula = (formKalemler = []) => {
  const kayit = []; const hatalar = {}; const uyarilar = {}; const satirlar = [];
  (formKalemler || []).forEach((f, i) => {
    if (f?.tur === KALEM_TUR.MALZEME) {
      const ms = malzemeSatiriDogrula(f);
      const h = { ...ms.hatalar };
      if (!ms.kayit) h.malzemeId = MALZEME_SECILMEDI;
      const a = kalemAdediDogrula(f.adet);
      if (a.hata) h.adet = a.hata;
      if (Object.keys(h).length) { hatalar[i] = h; satirlar[i] = null; return; }
      satirlar[i] = { tur: KALEM_TUR.MALZEME, ...ms.kayit, adet: a.deger };
      kayit.push(satirlar[i]);
      return;
    }
    if (f?.tur === KALEM_TUR.ISLEM) {
      const h = {};
      const ad = String(f.ad ?? "").trim();
      if (!ad) h.ad = ISLEM_AD_HATASI;
      const t = islemTutariDogrula(f.tutar);
      if (t.hata) h.tutar = t.hata;
      if (Object.keys(h).length) { hatalar[i] = h; satirlar[i] = null; return; }
      if (t.bos) uyarilar[i] = ISLEM_TUTAR_UYARISI;
      const ted = f.tedarikciId == null ? "" : String(f.tedarikciId).trim();
      satirlar[i] = { tur: KALEM_TUR.ISLEM, ad, ...(ted ? { tedarikciId: kimlikCoz(ted) } : {}), tutar: t.deger };
      kayit.push(satirlar[i]);
    }
  });
  return { kayit, hatalar, uyarilar, satirlar, gecerli: Object.keys(hatalar).length === 0 };
};
// C2 (0099 C1/2 deseni): parça kartının canlı kalem özeti TEK sonuçtan. Satırlar formdaki sırayla hizalıdır; hatalı satırın
// tutarı yoktur ve hatalı satır varken toplam "girilmedi"dir (AC-27: kısmi toplam yazılmaz). Kart çarpım ve toplama yapmaz.
export const formKalemOzeti = (formKalemler = [], malzemeKat) => {
  const d = kalemlerDogrula(formKalemler);
  const oz = maliyetKalemleriOzeti(d.kayit, malzemeKat);
  let j = 0;
  const satirlar = (formKalemler || []).map((_, i) => (d.satirlar[i] ? oz.satirlar[j++] : { hatali: true, tutarK: null }));
  return { satirlar, kayit: d.kayit, gecerli: d.gecerli, uyarilar: d.uyarilar, toplamK: d.gecerli ? oz.toplamK : null,
    malzeme: (formKalemler || []).filter(k => k?.tur === KALEM_TUR.MALZEME).length, islem: (formKalemler || []).filter(k => k?.tur === KALEM_TUR.ISLEM).length };
};
// Kayıttan forma (düzenleme açılışı). `_anahtar` geçici satır anahtarıdır, kayda yazılmaz (plan turu Karar 38).
let anahtarSayaci = 0;
export const yeniKalemAnahtari = () => `k${++anahtarSayaci}`;
export const kalemFormu = (k) => (k?.tur === KALEM_TUR.MALZEME
  ? { tur: KALEM_TUR.MALZEME, _anahtar: yeniKalemAnahtari(), ...malzemeSatiriFormu(k), adet: k.adet == null ? "1" : String(k.adet) }
  : { tur: KALEM_TUR.ISLEM, _anahtar: yeniKalemAnahtari(), ad: k?.ad ?? "", tedarikciId: k?.tedarikciId == null ? "" : String(k.tedarikciId), tutar: tutarMetni(k?.tutar) });
export const kalemleriFormu = (kalemler = []) => (kalemler || []).map(kalemFormu);
export const bosMalzemeKalemi = () => ({ ...kalemFormu({ tur: KALEM_TUR.MALZEME }), malzemeId: "", adet: "1" });
export const bosIslemKalemi = () => kalemFormu({ tur: KALEM_TUR.ISLEM });
// R4, AC-7–AC-10: kip değişiminde temizlenecek alanda veri var mı (dolu ise onay sorulur).
export const formKalemDolu = (kalemler = []) => (kalemler || []).length > 0;

// Kalem listesinin altındaki ibareler (R20, R20/2, R35/2, R35/4) ve boş durum (R40, R41).
export const ISLEM_ZAM_IBARESI = "İşlem tutarları sabittir; malzeme fiyatına gelen zam yalnız malzeme kalemlerini günceller.";
export const KARMA_TARIH_IBARESI = "Geçmiş bir tarihin maliyetinde malzeme kalemleri o tarihin fiyatıyla, işlem kalemleri bugünkü tutarıyla hesaplanır.";
export const MALZEME_GECMIS_IBARESI = "Bu parçanın maliyet geçmişi malzemenin kendi fiyat geçmişinden gelir; geçerlilik tarihi girilmez.";
export const KALEM_BOS_METNI = "Henüz maliyet kalemi yok. Malzeme kalemi malzemeden hesaplanır, işlem kalemi (lazer kesim, büküm, kaplama, işçilik) sabit tutardır.";
export const MALZEME_KATALOG_BOS_NEDENI = "Henüz malzeme tanımlanmadı. Malzemeler Ayarlar › Katalog › Malzemeler panelinden eklenir.";
export const KALEM_TOPLAM_ETIKETI = "Toplam, parçanın alış maliyeti";
export const KALEM_BOLUM_BASLIGI = "Maliyet kalemleri";
export const KALEM_SET_PASIF_NEDENI = "Bu parçanın set içeriği dolu; maliyet bileşenlerden gelir, maliyet kalemi girilmez.";
export const SET_KALEM_PASIF_NEDENI = "Bu parçanın maliyet kalemleri var; set içeriği girilemez. Önce maliyet kalemlerini kaldırın.";
export const KALEM_EXCEL_HATASI = "bu parçanın maliyeti maliyet kalemlerinden geliyor, Excel'deki değer alınmadı.";

// R14 (AC-7): boş serbest ("girilmedi"), negatif ve sayıya çevrilemeyen metin hata. Tek kaynak `tutarCoz` (R3, R4).
export const parcaMaliyetDogrula = (ham) => {
  const r = tutarCoz(ham);
  if (r.bos) return { bos: true, deger: null, hata: null };
  if (r.gecersiz) return { bos: false, deger: null, hata: "Maliyet sayı olmalı." };
  if (r.deger < 0) return { bos: false, deger: null, hata: "Maliyet negatif olamaz." };
  return { bos: false, deger: Math.round(r.deger * 100) / 100, hata: null };
};

// Spec 0087 AC-15, spec 0134 ile ters çevrildi (R6/2, R6a, C1/2, Karar 35): makina kitinin adedi sıfırdan büyük ve en çok üç
// ondalıklıdır (bir parça makina başına birden az girebilir). İki kit kapısı (model kartı, parça kartının model ile adet satırı)
// AYNI doğrulayıcıyı çağırır; setin içeriği kendi tam sayı doğrulayıcısındadır (`setAdediDogrula`). Ayrıştırıcı kendisinindir:
// virgül de nokta da ondalıktır (adette binlik ayracı yok); `tutarCoz` "0.114"ü 114 okurdu.
export const KIT_ADET_HATASI = "Adet sıfırdan büyük, en çok üç ondalıklı bir sayı olmalı.";
export const KIT_ADET_ONDALIK = 3;
export const kitAdediCoz = (ham) => {
  // Triyaj (bilgi 2): sayı olarak gelen değer de üç ondalık sınırına tabidir.
  if (typeof ham === "number") return Number.isFinite(ham) && Number(ham.toFixed(KIT_ADET_ONDALIK)) === ham ? ham : null;
  const t = String(ham ?? "").trim();
  const m = /^(\d+)(?:[.,](\d+))?$/.exec(t);
  if (!m || (m[2] && m[2].length > KIT_ADET_ONDALIK)) return null;
  return Number(`${m[1]}.${m[2] || "0"}`);
};
export const kitAdediDogrula = (ham) => {
  if (ham == null || String(ham).trim() === "") return { bos: true, deger: null, hata: null };
  const n = kitAdediCoz(ham);
  if (n == null || !(n > 0)) return { bos: false, deger: null, hata: KIT_ADET_HATASI };
  return { bos: false, deger: n, hata: null };
};
// R6/2, AC-11c, AC-75: setin içeriğinin adedi tam sayı kalır ve hata metni set içeriğine aittir (0121 metni aynen).
export const SET_ADET_HATASI = "Adet en az 1 tam sayı olmalı.";
export const setAdediDogrula = (ham) => {
  if (ham == null || String(ham).trim() === "") return { bos: true, deger: null, hata: null };
  const t = String(ham).trim();
  if (!/^\d+$/.test(t) || Number(t) < 1) return { bos: false, deger: null, hata: SET_ADET_HATASI };
  return { bos: false, deger: Number(t), hata: null };
};
// Spec 0134 R6/3 (AC-72): kitin stoktan düşülecek tam adedi, yukarı yuvarlanmış (0,114 → 1, 1,5 → 2). Kayan nokta artığı
// (0,1 × 30 = 3,0000000004) üç ondalığa indirilip yuvarlanır.
export const kitStokAdedi = (ham) => { const n = kitAdediCoz(ham); return n == null || !(n > 0) ? 0 : Math.ceil(Number(n.toFixed(KIT_ADET_ONDALIK))); };
// Kit adedinin Türkçe gösterimi (0,114; tam sayı ondalıksız). Forma açılırken de bu metin yazılır.
const kitHane = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: KIT_ADET_ONDALIK, useGrouping: false });
export const kitAdetMetni = (n) => (n == null || n === "" ? "" : kitHane.format(Number(n)));
// R6c, R6c/2, AC-11f, AC-11g, AC-93, Karar 37: parti başına girilen adedin makina başına çevrilmesi. Üç ondalığa en yakına
// (yarım yukarı); girdiler saklanmaz. Parti büyüklüğü en az 1 tam sayı, parti adedi kit adedi gibi sıfırdan büyük.
export const PARTI_BUYUKLUGU_HATASI = "Parti büyüklüğü en az 1 tam sayı olmalı.";
export const PARTI_ADEDI_HATASI = "Parti adedi sıfırdan büyük bir sayı olmalı.";
export const partiAdediCevir = (adetHam, buyuklukHam) => {
  const b = String(buyuklukHam ?? "").trim();
  if (!/^\d+$/.test(b) || Number(b) < 1) return { deger: null, hata: PARTI_BUYUKLUGU_HATASI };
  const a = kitAdediCoz(adetHam);
  if (a == null || !(a > 0)) return { deger: null, hata: PARTI_ADEDI_HATASI };
  const d = Math.round((a / Number(b)) * 1000 + 1e-9) / 1000;
  if (!(d > 0)) return { deger: null, hata: KIT_ADET_HATASI };
  return { deger: d, hata: null };
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
export const SET_PASIF_NEDENI = "Maliyet setin içeriğinden geliyor; elle girilen maliyet ve maliyet kalemleri okunmaz (içerik boşalınca yeniden kullanılır).";
export const SET_TOPLAM_ETIKETI = "Setin maliyeti (bileşenlerin toplamı)";
export const setEksikMetni = (n) => `${n} bileşenin maliyeti yok; setin maliyeti "girilmedi" sayılır.`;
export const SET_FIYAT_ETIKETI = "Bileşenlerin TL fiyatı toplamı";
// Spec 0133 R22/2 (AC-72): sayaç iki nedeni kapsar (fiyatı girilmemiş ya da maliyete bağlı olup fiyatı türetilemeyen bileşen).
export const setFiyatsizMetni = (n) => `${n} bileşenin TL fiyatı yok (girilmemiş ya da maliyetten türetilemiyor), toplama girmedi.`;
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
// R6, R6/2: ad çözümü HAM diziden (çöpteki parçanın adı çözülsün). Emsali tedarikciAdiCoz.
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
// R1, R1/2, R1/5–R1/7 (Karar 1, 4, 7, 30): set kullanımının haritası, BİR KEZ kurulur (0096 `kalemdeGecenTedarikciler` deseni).
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
// R4/2 (Karar 11, 12): 0096'nın `KALEMDE_TEDARIKCI_NEDENI` kardeşi; adres aynı. R4/5 (Karar 38): ret bildirimi.
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
    const m = setAdediDogrula(s?.miktar); // spec 0134 R6/2: set içeriği tam sayı, kendi doğrulayıcısı
    if (!pid && m.bos) return;
    if (!pid) { hatalar[i] = SET_PARCA_SECILMEDI; return; }
    if (kendiId != null && pid === String(kendiId)) { hatalar[i] = SET_KENDISI; return; }
    if (gorulen.has(pid)) { hatalar[i] = SET_AYNI_PARCA; return; }
    const b = harita.get(pid);
    if (b && setMi(b)) { hatalar[i] = SET_IC_ICE; return; }
    if (m.bos || m.hata) { hatalar[i] = SET_ADET_HATASI; return; }
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
