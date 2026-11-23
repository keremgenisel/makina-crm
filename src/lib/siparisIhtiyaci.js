// Spec 0134: bir sonraki parti için tedarikçi sipariş ihtiyacı. Saf motor (C3): React almaz, saat okumaz, hiçbir şey yazmaz
// (R21). Girdi tek veri nesnesidir (C3/2): model kataloğu, model satırları, canlı ve ham parçalar, parça stoğu, malzemeler,
// canlı ve ham tedarikçiler. Ağırlık 0132'nin malzeme motorundan okunur (C2, Karar 43): bu dosyada özgül ağırlık geçmez.
//
// Sıra (R6b, R6b/2, R7/2, R9/2, Karar 32, Karar 33):
//   1. Model satırı başına: ham ihtiyaç = adet × kit adedi, yukarı yuvarlanır (spec 0141: emniyet payı yok).
//   2. Setin toplam ihtiyacından setin kendi stoğu düşülür; kalan set adedi × bileşen miktarı bileşene eklenir.
//   3. Bileşende patlatmadan gelen adet yukarı yuvarlanır, kit satırlarından gelenle toplanır.
//   4. Her parçada sipariş = ihtiyaç − stok, sıfırın altına inmez (R8).
//   5. Malzeme kalemi olan parçanın SİPARİŞ adedi (× kalem adedi) her malzeme kaleminin kesit satırına gider .
import { PARCA_BILGI_ALANLARI, bilgiDegeri } from "./parcaBilgi";
import { trLower, totalMiktar } from "./utils";
import { setMi, setIcerigiOf, kalemAdetiOf, parcaMaliyetKurus, setKatalogu, parcaDovizMaliyeti, islemKalemiTutari } from "./urunAgaci";
import { BELIRSIZ_DESEN, BELIRSIZ_HATASI } from "./tutarGirdisi";
import {
  BICIMLER, PARA_BIRIMLERI, dovizMi, bantSec, bantlarOf, fiyatKumesi, hamOlculer, hamKesit, malzemeOzeti,
  malzemeKatalogu, tamBoyKg, kgMetni,
} from "./malzeme";
import { malzemeKalemleri, islemKalemleri, kalemTedarikciIdleri, eskiKatalogKalemi } from "./maliyetKalemleri";
import { kurus } from "./gider";

// ── Sabitler ve metinler ─────────────────────────────────────────────────────────────────────────────────────────────────
export const MAKINA_ADET_UST = 10000; // R4/2
export const MODEL_SECILMEDI = "Model seçilmedi.";
export const MODEL_BULUNAMADI = "Bu model katalogda yok.";
export const ADET_HATASI = "Makina adedi en az 1 tam sayı olmalı.";
export const ADET_UST_HATASI = `Makina adedi en çok ${MAKINA_ADET_UST.toLocaleString("tr-TR")} olabilir.`;
export const AYNI_MODEL_HATASI = "Bu model bir üst satırda zaten var.";
export const hataliSatirMetni = (n) => `${n} satır hatalı; hatalı satırlar hesaba girmedi.`;
export const KIT_BOS_METNI = (ad) => `${ad}: makina kitinde parça yok, ihtiyaç üretmedi.`;
export const SILINMIS_PARCA = "silinmiş parça";
export const BULUNAMAYAN_PARCA = "listede olmayan parça";
export const SET_ICERIK_BOS = "Setin içeriğindeki parçalar listede yok; bileşen üretmedi.";
export const PATLATILDI = "patlatıldı";
export const KESISIM_UYARISI = (setAd, bilesenAd) => `${bilesenAd} hem kitte hem ${setAd} setinin içinde geçiyor; adet iki kaynaktan toplanır.`;
export const STOK_UYARISI = (stoklu, toplam) => `Parça stoğu sayılmamış görünüyor: hesapta geçen ${toplam} parçanın yalnız ${stoklu} tanesinin stoğu var. Sipariş ihtiyaca yakın çıkar.`;
// Spec 0143 B-R8, B-R8/2, B-R8/3 (AC-18, AC-49, AC-61): geldiği boy ve lama/sac nedenleri kalktı; uzun parçanın nedeni kalemin çubuk
// boyuna atıf yapar ve satır kilogramla (net artı fire) sipariş edilir.
// Spec 0143 B-R5 (triyaj bulgu 1): parça başına giriş toleransı (mm); boy adedinin yuvarlaması toplam uzunlukta bu kadar gevşer.
export const UZUNLUK_TOLERANSI_MM = 0.005;
export const NEDEN_KESIM_BUYUK = "Parçanın boyu kalemin çubuk boyundan uzun; boy adedi hesaplanmaz, sipariş kilogramla (net artı fire) verilir.";
export const NEDEN_FIYAT_YOK = "Fiyat girilmedi; tutar yazılmaz.";
export const NEDEN_KUR_YOK = "Kur girilmedi; tutar yazılmaz.";
export const NEDEN_PARA_BIRIMI = "Para birimi tanınmıyor; tutar TL toplamına katılmadı.";
// Spec 0139 A-R12/2: metin çap bandına göre kilogram fireyi de anar.
export const FIRE_BOY_UYARISI = "Boy adedi uzunluktan hesaplandığı için fire (yüzde ve çap bandına göre kilogram) sipariş kilosuna eklenmedi: kesim kaybı artan kiloda, talaş işleme payında.";
export const TEDARIKCISIZ = "Ana tedarikçisi girilmemiş malzemeler";
export const SILINMIS_TEDARIKCI = "silinmiş tedarikçi";
export const BULUNAMAYAN_TEDARIKCI = "kaydı bulunamayan tedarikçi";
export const PARTI_PLAN_YOK = "Bu partide planlanan adet girilmemiş; model satırlarını elle ekleyin.";

// ── Spec 0140: tedarikçi odaklı çıktı ve düzenleme metinleri (C-R12, A-R14 emsali; ekran metin yazmaz) ─────────────────────
// C-R7/2 (karar 33): malzemeyi ve parçayı birlikte kapsayan başlık; TEDARIKCISIZ parametresiz çağrı için aynen durur (C-R11).
export const TEDARIKCI_BELIRTILMEMIS = "Tedarikçisi belirtilmemiş";
export const anasizParcaMetni = (n) => `Ana tedarikçi girilmemiş ${n} parça; Ayarlar › Katalog › Parça/Yedek Parça'dan girin.`;
export const anasizMalzemeliMetni = (n) => `${n} malzemeli parçanın Ana tedarikçisi yok; malzemesi kendi tedarikçisinin bölümünde.`;
// C-R12: boş durumların üç nedeni.
export const BOS_KIT = "Seçilen modellerin kitinde parça yok; sipariş üretmedi.";
export const BOS_STOK_YETIYOR = "Eldeki stok ihtiyacı karşılıyor; sipariş edilecek satır yok.";
export const BOS_SECIM = "Seçilen tedarikçilerde bu girdi için satır yok.";
export const CIFT_SAYIM_DEGIL = "Bir parça hem Ana tedarikçisinin bölümünde (hazır parça) hem malzemesinin tedarikçisinin bölümünde (malzeme) görünebilir; bunlar ayrı siparişlerdir, çift sayım değildir.";
export const HAMMADDE_SUZGEC_NEDENI = "Listede hammadde işaretli tedarikçiler, bir parçanın ya da malzemenin Ana tedarikçisi olan firmalar ve bir parçanın işlem kaleminde geçen (fason) firmalar var; kargo, kira gibi tedarikçiler listelenmez."; // spec 0150 R5/2
export const GECICI_DUZENLEME = "Düzenlemeler geçicidir: pencere kapanınca kaybolur, hiçbir yere kaydedilmez.";
export const satirsizSecilenMetni = (n, m) => `Seçilen ${n} firmanın ${m} tanesinde satır yok.`;
// ── Spec 0150: sipariş listesinde işlem kalemleri (R1–R10/2) ────────────────────────────────────────────────────────────
export const ISLEMLER_BASLIGI = "İşlemler"; // R2/2
export const ISLEM_TUTAR_YOK = "tutar girilmedi"; // R4/2: ekran ve belge kendi metnini yazmaz
export const ISLEMLER_TOPLAMI = "İşlemler toplamı"; // R9
// Spec 0150 R10/3 (triyaj bulgu 1, TY kararı): seçim yüzünden pencerede görünmeyen ama basılacak bir bölümü kilitleyen hatalı parça.
export const gizliHataMetni = (ad, yer) => `Belge basılamaz: ${ad} satırının sipariş adedi geçersiz. Satır ${yer} kartında; o firmayı seçime ekleyip düzeltin ya da seçimi temizleyin.`;
export const tedarikcisizIslemMetni = (n) => `${n} işlem kaleminin tedarikçisi girilmemiş; belgeye basılmaz. Parça kartının maliyet kalemlerinden girin.`; // R6/2
export const duzenlemeSayiMetni = (d) => `${d.duzenlenen} satır düzenlendi · ${d.kapatilan} satır kapatıldı`;
export const MALZEMESI_ASAGIDA = "malzemesi aşağıda";
export const MALIYET_YOK = "maliyet girilmedi";
export const SILINMIS_TEDARIKCI_BELGE = "Tedarikçi çöpte ya da kaydı bulunamıyor; bu firmanın belgesi basılamaz.";
export const ELLE_KILO_NEDENI = "Sipariş kilosu elle girildi; boy adedi hesaplanmaz.";
export const ELLE_BOY_NEDENI = "Boy adedi elle girildi.";
export const PARCALARI_KAPALI = "parçaları kapatıldı, değer elle girildi";
export const asgariAltiMetni = (asgari) => `Asgari siparişin (${kgMetni(asgari)}) altında.`;
export const SIPARIS_ADET_UST = 1000000;
export const SIPARIS_ADET_HATASI = `Sipariş adedi 0 ile ${SIPARIS_ADET_UST.toLocaleString("tr-TR")} arasında tam sayı olmalı.`;
export const ELLE_KILO_HATASI = "Sipariş kilosu sıfır ya da pozitif bir sayı olmalı.";
export const ELLE_BOY_HATASI = "Boy adedi 0 ile 1.000.000 arasında tam sayı olmalı.";
export const BELGE_HATALI = "Geçersiz değer girilmiş bir satır var; belge basılamaz.";
export const BELGE_BOS = "Basılacak satır yok.";
// Spec 0142 B-R4/2 (AC-41): ölçüsü çözülemeyen kalemin ibaresi; pencere ve belge aynı sabiti basar.
export const OLCU_GIRILMEMIS = "ölçüsü girilmemiş";
// Spec 0142 B-R5/2 (AC-45): ölçü sütununun başlığı pencerede ve belgede aynı metin.
export const OLCU_BASLIGI = "Ölçü";
// Spec 0147 R3, AC-7, AC-10: belgenin malzemesiz ve malzemesi çözülemeyen grup başlıkları (hammadde grubunun başlığı malzemenin adıdır).
export const HAZIR_PARCALAR_BASLIGI = "Hazır parçalar";
export const MALZEMESI_BELIRTILMEMIS_BASLIGI = "Malzemesi belirtilmemiş";
export const GRUP_TURU = Object.freeze({ HAMMADDE: "hammadde", COZULEMEYEN: "cozulemeyen", HAZIR: "hazir" });
// Spec 0142 B-R1/3 (AC-39): parçası açık, kesidi kapatılmış malzeme varsa belge bölümünün sonunda.
export const KESIT_KAPALI_UYARISI = "Bu bölümde parçası sipariş edilen ama malzeme kesidi \"sipariş etme\" işaretli satır var; o malzeme toplama girmedi.";
// Spec 0142 B-R5/3 (AC-55): aynı ölçüdeki kalemlerin toplam adedi 1'den büyükse ölçü satırının eki.
export const parcaBasinaMetni = (n) => ` · parça başına ${n}`;
// Triyaj (bulgu 1): pencerede Ana tedarikçisinin bölümünde duran ama belgede malzemesinin firmasının bölümünde basılan parçanın ibaresi.
// Spec 0144 A-R6/2, A-R9/2, A-R10/2, B-R5/2, B-R7/2, B-R8, B-R9: belgenin yeni metinleri tek yerde.
export const PAY_FARK_NOTU = "Parça satırlarındaki miktar malzemenin o parçaya düşen yuvarlanmamış payıdır; yukarı yuvarlama, asgari sipariş ve elle girilen değer yalnız alınacak malzeme toplamındadır, bu yüzden payların toplamı toplamdan küçük kalabilir.";
export const TEDARIKCISIZ_IBARESI = "malzemenin tedarikçisi girilmemiş; bölümün toplamına girmez";
export const MALZEME_COZULEMEDI = "malzemesi çözülemedi; tutar yazılmaz";
export const KALEM_TUTARA_GIRMEDI = "bir malzeme kaleminin tutarı hesaplanamadı; tutar eksik"; // triyaj (bulgu 2), B-R5/7
// 2026-11-15: toplam tablosu belgeden kalktı; cümle ödenecek rakamın neden parça tutarlarının toplamından büyük olabileceğini söyler.
export const TOPLAM_KAPSAM_CUMLESI = "Bölüm toplamı alınacak malzemenin (yukarı yuvarlanmış boy, asgari sipariş ve elle girilen değerle) tutarı ile hazır parçaların tutarıdır; parça satırlarındaki tutarlar malzemenin parçaya düşen yuvarlanmamış payıdır, bu yüzden toplamları bölüm toplamından küçük kalabilir.";
// Spec 0158 C11/2 (AC-81): bu işin üç yeni metni tek yerde.
export const KESIM_IBARESI = "Belgede malzeme kaleminin adedi birden büyük parçaların sipariş adedi kesilecek adet olarak (parça adedi × kalem adedi) yazılır; burada parça adedi gösterilir."; // R25
export const kesimAciklamaMetni = (n, adet) => `${parcaAdetMetni(n)} × ${sayiHane.format(adet)}`; // R17, P4
export const GENEL_TOPLAM = "Genel toplam (TL)"; // R26
export const tutarsizMetni = (n) => `${n} satırın tutarı hesaplanamadı; toplama girmedi.`;
export const BOLUM_TOPLAMI = "Bölüm toplamı";
export const FIYATLI_NUSHA = "Fiyatlı nüsha";
export const PAY_FARK_ESIGI_KG = 0.001;
// 2026-11-15 Takım Yöneticisi kararı (qa2 bulgu 1): toplam tablosu basılmadığı için, sipariş edilen miktarı parça satırlarından okunamayan
// kesit bölümün sonunda tek satırla yazar. Boy kesidinde: parçalara yazılan boyların toplamı kesidin boy adedinden farklıysa (yukarı
// yuvarlama, asgari, elle); kilo kesidinde (parça satırı kilo yazmaz): elle değer ya da asgariye tamamlama varsa.
export const SIPARIS_FARK_BASLIGI = "Parça satırlarından farklı sipariş edilen malzeme:";
export const siparisFarkMetni = (r) => `${r.malzemeAd} · ${r.kesitMetni}: ${boyCinsindenMi(r) ? `${sayiHane.format(r.boyAdedi)} boy` : kgMetni(r.siparisKg)} sipariş edilir${r.elle ? " (elle)" : ""}`;
export const belgeYeriMetni = (adlar, seciliDegil) => `Belgede ${adlar.join(", ")} bölümünde basılır${seciliDegil ? "; bu firma seçimde olmadığı için belgeye girmez" : ""}.`;

// D-R1/2 (AC-82): sipariş adedi 0–1.000.000 tam sayı, boş = 0. Belirsiz sayı kuralı burada aranmaz (tam sayı alanı, AC-39).
export const siparisAdediDogrula = (ham) => {
  const t = String(ham ?? "").trim();
  if (t === "") return { deger: 0, hata: null };
  if (!/^\d+$/.test(t) || Number(t) > SIPARIS_ADET_UST) return { deger: null, hata: SIPARIS_ADET_HATASI };
  return { deger: Number(t), hata: null };
};
// D-R1/2, AC-39: elle kilo; belirsiz yazılmış sayı reddedilir (tek nokta, noktadan sonra üç ve daha çok hane).
export const elleKiloDogrula = (ham) => {
  const t = String(ham ?? "").trim();
  if (t === "") return { deger: null, hata: null };
  if (BELIRSIZ_DESEN.test(t)) return { deger: null, hata: BELIRSIZ_HATASI };
  const m = /^(\d+)(?:[.,](\d+))?$/.exec(t);
  if (!m) return { deger: null, hata: ELLE_KILO_HATASI };
  return { deger: Number(`${m[1]}.${m[2] || "0"}`), hata: null };
};
// C-R3, C-R3/2 (AC-21, AC-76): seçicinin listesi; canlı, hammadde işaretli ya da canlı bir parçanın veya malzemenin Ana tedarikçisi.
export const tedarikciSecenekleri = ({ tedarikciler = [], parts = [], malzemeler = [] } = {}) => {
  const kullanilan = new Set([...(parts || []), ...(malzemeler || [])].filter(x => x && !x.deletedAt && x.tedarikciId != null && x.tedarikciId !== "")
    .map(x => String(x.tedarikciId)));
  // Spec 0150 R5/2, R5/3 (P4): canlı, set olmayan parçaların işlem kalemlerindeki tedarikçiler (motorun işlem satırı ürettiği küme).
  for (const p of parts || []) if (p && !p.deletedAt && !setMi(p)) for (const id of kalemTedarikciIdleri(p)) kullanilan.add(id);
  return (tedarikciler || []).filter(t => t && !t.deletedAt && (t.hammadde === true || kullanilan.has(String(t.id))))
    .sort((a, b) => String(a.ad).localeCompare(String(b.ad), "tr"));
};
// C-R12 (AC-28): boş durumun nedeni (tedarikçi odaklı sonuçtan); null = boş değil.
export const bosDurumNedeni = (sonuc) => {
  const tb = sonuc?.tedarikciBolumleri;
  if (!sonuc || sonuc.bos || !tb) return null;
  if (tb.bolumler.length || tb.belirtilmemis.parcalar.length || tb.belirtilmemis.kesitler.length || tb.belirtilmemis.islemler?.length) return null;
  if (tb.secimVar && tb.satirsizSecilen.length) return BOS_SECIM;
  if (sonuc.gecerliSayi > 0 && sonuc.kitBos.length === sonuc.gecerliSayi) return BOS_KIT;
  return BOS_STOK_YETIYOR;
};

const ad = (x) => trLower(String(x || "").trim());
// Kayan nokta artığı (0,114 × 70 = 7,9800000001) yukarı yuvarlamayı şişirmesin: altı ondalığa indirilir.
const yukari = (x) => Math.ceil(Number(Number(x).toFixed(6)));
const kurusOf = (x) => (x == null ? null : Math.round(Number(Number(x * 100).toFixed(6))));

// ── Girdi ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// R25, AC-95: model adı katalogla Türkçe küçültmeyle eşlenir, satır daima katalogdaki adı taşır.
export const katalogHaritasi = (modeller = []) => new Map((modeller || []).filter(m => m && !m.deletedAt && m.model).map(m => [ad(m.model), m]));

// R2, AC-3–AC-5: partinin planlanan adetlerinden model satırları. Katalogda bulunamayan ad satıra girmez, listelenir.
export const partidenSatirlar = (parti, modeller = []) => {
  const kat = katalogHaritasi(modeller);
  const satirlar = []; const bulunamayan = [];
  for (const [ham, adet] of Object.entries(parti?.planlananAdetler || {})) {
    const m = kat.get(ad(ham));
    if (!m) { bulunamayan.push(ham); continue; }
    satirlar.push({ model: m.model, adet: String(adet ?? "") });
  }
  return { satirlar, bulunamayan, bos: satirlar.length === 0 && bulunamayan.length === 0 };
};

// R4, R4/2, R5, R8/2, AC-8, AC-9, AC-102, AC-103: satır doğrulaması. Geçersiz satır hesaba girmez, öteki satırlar hesaplanır.
export const satirlariDogrula = (satirlar = [], modeller = []) => {
  const kat = katalogHaritasi(modeller); const gorulen = new Set();
  return (satirlar || []).map(s => {
    const anahtar = ad(s?.model);
    if (!anahtar) return { model: "", adet: null, hata: MODEL_SECILMEDI };
    const m = kat.get(anahtar);
    if (!m) return { model: String(s.model), adet: null, hata: MODEL_BULUNAMADI };
    const t = String(s?.adet ?? "").trim();
    if (!/^\d+$/.test(t) || Number(t) < 1) return { model: m.model, adet: null, hata: ADET_HATASI };
    if (Number(t) > MAKINA_ADET_UST) return { model: m.model, adet: null, hata: ADET_UST_HATASI };
    if (gorulen.has(anahtar)) return { model: m.model, adet: null, hata: AYNI_MODEL_HATASI };
    gorulen.add(anahtar);
    return { model: m.model, adet: Number(t), hata: null, kayit: m };
  });
};

// Spec 0141 B-R3, B-R7 (karar 34): emniyet payı kalktı. Sipariş adedi ihtiyacın yukarı yuvarlanmışıdır; kit satırında, setten
// patlatılan adette ve öneri adedinin iki yolunda hiçbir yüzde uygulanmaz.
// B-R4/2, B-R5: "Ham ihtiyaç" ile "İhtiyaç" yalnız setten patlatılan parçada ayrışır (patlatma yuvarlanmadan ham ihtiyaca eklenir).
export const HAM_IHTIYAC_IBARESI = "Ham ihtiyaç ile İhtiyaç yalnız setten patlatılan parçalarda ayrışır; başka hiçbir pay uygulanmaz.";

// ── Ana hesap ────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Spec 0140 C-R11 (AC-93, AC-94): ikinci parametre isteğe bağlıdır. `tedarikciOdakli` verilince yeni `tedarikciBolumleri` alanı
// döner (bütün yeni çıktılar bu nesnenin içinde; bugünkü alanlar ve TEDARIKCISIZ değişmez). `duzenleme` (D-R1–D-R5/2, C1) ham
// metinlerle gelir ve burada doğrulanır: { parca: { [partId]: { adet, kapali } }, kesit: { [anahtar]: { deger, kapali } } };
// sıra D-R4/2: (1) bugünkü hesap, (2) set düzenlemesi, (3) patlatma düzenlenmiş adetle, (4) bileşenler, (5) parça düzenlemesi,
// (6) kesitler son adetlerden. `secilenTedarikciler` (C-R2): boş ya da yoksa bütün tedarikçiler.
export const siparisIhtiyaci = (veri = {}, secenek = undefined) => {
  const { tedarikciOdakli = false, duzenleme = null, secilenTedarikciler = null } = secenek || {};
  const duzParca = duzenleme?.parca || {}; const duzKesit = duzenleme?.kesit || {};
  // Parça düzenlemesi: geçerli adet ya da kapatma; geçersiz adet düzenleme sayılmaz, hatası kaydedilir (D-R9).
  const parcaDuzenle = (k) => {
    k.oneri = k.siparis;
    const d = duzParca[k.partId];
    if (!d) return;
    k.kapali = !!d.kapali;
    if (d.adet != null) {
      const v = siparisAdediDogrula(d.adet);
      if (v.hata) k.hata = v.hata; else if (v.deger !== k.oneri) { k.duzenlendi = true; k.siparis = v.deger; }
    }
    if (k.kapali) k.siparis = 0;
  };
  const { modeller = [], satirlar: hamSatirlar = [], parts = [], hamParts = null, partStock = [], malzemeler = [], tedarikciler = [], hamTedarikciler = null } = veri;
  const satirlar = satirlariDogrula(hamSatirlar, modeller);
  const gecerli = satirlar.filter(s => !s.hata);
  const canliParca = new Map((parts || []).filter(p => p && !p.deletedAt).map(p => [String(p.id), p]));
  const hamParca = new Map(((hamParts && hamParts.length ? hamParts : parts) || []).map(p => [String(p.id), p]));
  const malzemeKat = malzemeKatalogu(malzemeler);
  const stokOf = (id) => Math.max(0, totalMiktar(partStock || [], id));

  // Parça satırları (kimlik → birikim). `ham` yuvarlanmamış patlatmayı da taşır, `ihtiyac` yukarı yuvarlanmış (spec 0141 B-R5).
  const kalemler = new Map();
  const kalem = (id, adKopyasi) => {
    const k = String(id);
    if (!kalemler.has(k)) {
      const p = canliParca.get(k);
      const h = hamParca.get(k);
      kalemler.set(k, {
        // R11/2: çöpteki parça kit satırının ad kopyasıyla
        partId: k, ad: p?.ad || adKopyasi || h?.ad || BULUNAMAYAN_PARCA, silinmis: !p, set: !!p && setMi(p), kaynaklar: [],
        ham: 0, ihtiyac: 0, patlatmaHam: 0, stok: p ? stokOf(k) : 0, siparis: 0, patlatildi: false,
        malzemeli: !!p && !setMi(p) && malzemeKalemleri(p).length > 0, // spec 0135 R30/2: malzeme kalemi var mı
        olculer: p ? parcaOlculeri(p, malzemeKat) : [], // spec 0142 C4: parçanın kendi malzeme kalemlerinden, sipariş adedinden bağımsız
        bilgi: p ? parcaBilgisi(p) : {}, // spec 0158 R3/2, P12: bilgi alanlarının motordaki tek okuması
      });
    }
    return kalemler.get(k);
  };
  const kaynakEkle = (k, tur, metin) => { if (!k.kaynaklar.some(x => x.tur === tur && x.metin === metin)) k.kaynaklar.push({ tur, metin }); };

  const kitBos = [];
  const kesisimler = [];
  for (const s of gecerli) {
    const kit = s.kayit.defaultParcalar || [];
    if (!kit.length) { kitBos.push(s.model); continue; }
    const kitIdleri = new Set(kit.map(r => String(r.partId)));
    for (const r of kit) {
      const miktar = Number(r.miktar) || 0;
      if (!(miktar > 0)) continue;
      const k = kalem(r.partId, r.ad);
      kaynakEkle(k, "kit", s.model);
      if (k.silinmis) continue; // AC-24, AC-104: ihtiyaç üretmez, eksik sayılır
      const ham = s.adet * miktar;
      k.ham += yukari(ham);
      k.ihtiyac += yukari(ham);
      if (k.set) {
        const p = canliParca.get(k.partId);
        for (const b of setIcerigiOf(p)) if (kitIdleri.has(String(b.partId))) {
          const bAd = canliParca.get(String(b.partId))?.ad || String(b.partId);
          if (!kesisimler.some(x => x.setAd === p.ad && x.bilesenAd === bAd)) kesisimler.push({ setAd: p.ad, bilesenAd: bAd, partId: String(b.partId) });
        }
      }
    }
  }
  // Setler: stok düşülür, kalan patlatılır (R7, R7/2, AC-13, AC-76–AC-78). Patlatma tek düzeydir (iç içe set yasak, 0121).
  const setler = [...kalemler.values()].filter(k => k.set);
  // Triyaj (bulgu 2, D-R5/2 > AC-86): öneri geçişi setin DÜZENLENMEMİŞ adediyle patlatır; kapatılan setin bileşen kesitine yazılmış
  // elle değer satır olarak kalır (parçaları kapatıldı). Asıl hesap (AC-86) değişmez: kapatılan set patlatılmaz.
  const oneriPatlatma = new Map();
  for (const k of setler) {
    k.siparis = Math.max(0, k.ihtiyac - k.stok);
    parcaDuzenle(k); // D-R4/2 (2): set düzenlemesi patlatmadan önce; kapatılan set patlatılmaz (AC-86)
    const p = canliParca.get(k.partId);
    const icerik = setIcerigiOf(p);
    const canliBilesen = icerik.filter(b => canliParca.has(String(b.partId)));
    if (!canliBilesen.length) { k.setNeden = SET_ICERIK_BOS; }
    k.patlatildi = k.siparis > 0 && canliBilesen.length > 0;
    if (k.oneri > 0) for (const b of canliBilesen) oneriPatlatma.set(String(b.partId), (oneriPatlatma.get(String(b.partId)) || 0) + k.oneri * (Number(b.miktar) || 0));
    // Triyaj (bulgu 3), R7/2: bileşen satırı yalnız patlatılan kalandan doğar; stokta yeten setin bileşenleri satır açmaz.
    if (k.siparis <= 0) continue;
    for (const b of icerik) {
      const bk = kalem(b.partId, null);
      kaynakEkle(bk, "set", p.ad);
      if (bk.silinmis) continue;
      bk.patlatmaHam += k.siparis * (Number(b.miktar) || 0);
    }
  }
  for (const k of kalemler.values()) {
    if (k.set || k.silinmis) continue;
    k.kitIhtiyac = k.ihtiyac;
    if (k.patlatmaHam > 0) { k.ham += k.patlatmaHam; k.ihtiyac += yukari(k.patlatmaHam); }
    k.siparis = Math.max(0, k.ihtiyac - k.stok);
    parcaDuzenle(k); // D-R4/2 (5)
  }
  const parcaSatirlari = [...kalemler.values()].map(k => ({
    partId: k.partId, ad: k.ad, silinmis: k.silinmis, set: k.set, patlatildi: k.patlatildi, setNeden: k.setNeden || null,
    kaynaklar: k.kaynaklar, iki: k.kaynaklar.some(x => x.tur === "kit") && k.kaynaklar.some(x => x.tur === "set"),
    ham: k.silinmis ? null : k.ham, ihtiyac: k.silinmis ? null : k.ihtiyac,
    stok: k.silinmis ? null : k.stok, siparis: k.silinmis ? null : k.siparis, malzemeli: k.malzemeli, olculer: k.olculer,
  }));

  // ── Malzeme ihtiyacı (R12–R18/2) ───────────────────────────────────────────────────────────────────────────────────────
  const eksikParca = new Set(); const eksikMalzeme = new Set();
  for (const k of kalemler.values()) if (k.silinmis) eksikParca.add(k.partId);
  // Spec 0140 R4 (karar 39): geçiş bir yardımcıdır; düzenlemede öneri adetleriyle de koşar (bütün parçaları kapatılan kesitin tanımı).
  const kesitleriKur = (adetOf, eksikParca, eksikMalzeme, kaynak = kalemler.values()) => {
  const kesitler = new Map();
  // Spec 0135 R28 (AC-49–AC-51): parçanın BÜTÜN malzeme kalemleri okunur; her kalem kendi ham kesitiyle kendi kesit satırına
  // girer ve kalemin adediyle çarpılır (adet = parçanın sipariş adedi × kalem adedi). İşlem kalemi satır üretmez (R30).
  // Plan turu Karar 43: aynı parçanın aynı kesitte eşdeğer iki girişi dökümde tek satırda toplanır (hesap değişmez, C9).
  for (const k of kaynak) {
    if (!k.malzemeli || !(adetOf(k) > 0)) continue;
    const p = canliParca.get(k.partId);
    for (const satir of malzemeKalemleri(p)) {
      const m = malzemeKat.get(String(satir.malzemeId));
      // Spec 0143 B-R3/2, C1: işaret ve çubuk boyu anahtara girer (geçersiz çubuk boyu işaretsiz sayılır; kayıt onu zaten reddeder).
      const cubuk = cubukBoyuOf(satir);
      const boydan = cubuk != null;
      const oz = malzemeOzeti(satir, malzemeKat); // R22/2, AC-97: tarih verilmez, bugünkü küme
      // Triyaj (bulgu 1): ham ölçü kayan nokta toplamıdır (10,1 + 0,2 = 10,299999…); anahtar ve gösterim üç ondalığa yuvarlanır ki
      // aynı ham kesit iki satıra bölünmesin (Karar 31'in asgari siparişi de tek satıra uygulansın).
      const kesit = hamKesit(satir)?.map(x => Number(Number(x).toFixed(3))) ?? null;
      if (!m || !kesit) { eksikParca.add(k.partId); if (m && !kesit) eksikMalzeme.add(String(m.id)); continue; }
      const o = hamOlculer(satir);
      if (oz.hamKg == null) { eksikParca.add(k.partId); eksikMalzeme.add(String(m.id)); continue; } // AC-41 (spec 0143: her kalem kilodan)
      const kalemAdedi = kalemAdetiOf(satir); // triyaj (bulgu 3): maliyetle aynı kural; geçersiz adet eksik sayılır
      if (kalemAdedi == null) { eksikParca.add(k.partId); continue; }
      const anahtar = kesitAnahtari(m.id, boydan, cubuk, satir.bicim, kesit);
      if (!kesitler.has(anahtar)) kesitler.set(anahtar, { anahtar, malzemeId: String(m.id), malzeme: m, bicim: satir.bicim, boydanSiparis: boydan, cubukBoyu: cubuk, kesit, hamCap: o.cap ?? null, parcalar: [] });
      const giris = { partId: k.partId, ad: k.ad, adet: adetOf(k) * kalemAdedi, hamKg: oz.hamKg, fireliKg: oz.fireliKg, fire: oz.fire || 0, ekFireKg: oz.ekFireKg || 0, kesimBoyu: o.boy };
      const ayni = kesitler.get(anahtar).parcalar.find(x => x.partId === giris.partId && x.hamKg === giris.hamKg && x.fireliKg === giris.fireliKg && x.fire === giris.fire && x.kesimBoyu === giris.kesimBoyu);
      if (ayni) ayni.adet += giris.adet; else kesitler.get(anahtar).parcalar.push(giris);
    }
  }
  return kesitler;
  };
  const kesitler = kesitleriKur(k => k.siparis, eksikParca, eksikMalzeme);
  let kesitSatirlari = [...kesitler.values()].map(ks => kesitHesabi(ks, eksikParca, eksikMalzeme));
  // D-R3/2, D-R5, D-R5/2 (karar 38, 39): kesit düzenlemesi. Bütün parçaları kapatılan kesitin elle değeri öneri geçişinin tanımıyla
  // (parçasız) satır olarak kalır.
  if (duzenleme) {
    // Öneri adedi: kendi düzenlemesi ve setlerin düzenlemesi yok sayılarak (kit ihtiyacı + düzenlenmemiş setlerin patlatması − stok).
    const oneriKaynak = [...kalemler.values()].filter(k => !k.set && !k.silinmis).map(k => ({ partId: k.partId, ad: k.ad, malzemeli: k.malzemeli,
      oneriAdet: Math.max(0, (k.kitIhtiyac ?? 0) + (oneriPatlatma.has(k.partId) ? yukari(oneriPatlatma.get(k.partId)) : 0) - k.stok) }));
    for (const [id, ham] of oneriPatlatma) {
      if (kalemler.has(id)) continue;
      const p = canliParca.get(id);
      oneriKaynak.push({ partId: id, ad: p.ad, malzemeli: !setMi(p) && malzemeKalemleri(p).length > 0, oneriAdet: Math.max(0, yukari(ham) - stokOf(id)) });
    }
    const oneriKesit = kesitleriKur(k => k.oneriAdet, new Set(), new Set(), oneriKaynak);
    for (const [anahtar, d] of Object.entries(duzKesit)) {
      if (kesitler.has(anahtar) || !oneriKesit.has(anahtar)) continue;
      // Spec 0143 C-R1/2 (Ölçüm G): doğrulayıcının seçimi işaretten (satır boy cinsindense boy adedi doğrulayıcısı).
      const sat = kesitHesabi({ ...oneriKesit.get(anahtar), parcalar: [] }, new Set(), new Set());
      const v = (boyCinsindenMi(sat) ? siparisAdediDogrula : elleKiloDogrula)(d?.deger);
      if (v.deger == null || String(d?.deger ?? "").trim() === "") continue;
      kesitSatirlari.push({ ...sat, parcalarKapali: true });
    }
    kesitSatirlari = kesitSatirlari.map(r => kesitDuzenle(r, duzKesit[r.anahtar], malzemeKat));
  }

  // Malzeme başlıkları (R12/2, AC-65): yalnız kilo ve tutar toplanır.
  const malzemeGruplari = new Map();
  for (const ks of kesitSatirlari) {
    if (!malzemeGruplari.has(ks.malzemeId)) malzemeGruplari.set(ks.malzemeId, { malzemeId: ks.malzemeId, ad: ks.malzemeAd, paraBirimi: ks.paraBirimi, tedarikciId: ks.tedarikciId, kesitler: [], netKg: 0, siparisKg: 0, tutarTLK: 0, tutarsiz: 0 });
    const g = malzemeGruplari.get(ks.malzemeId);
    g.kesitler.push(ks);
    if (ks.netKg != null) g.netKg += ks.netKg;
    if (ks.siparisKg != null) g.siparisKg += ks.siparisKg;
    if (ks.tutarTLK != null) g.tutarTLK += ks.tutarTLK; else g.tutarsiz++;
  }
  // Hiç tutarı çözülmeyen malzemenin toplamı yazılmaz (R22: sıfır değil, "—").
  for (const g of malzemeGruplari.values()) if (g.tutarsiz === g.kesitler.length) g.tutarTLK = null;
  // Tedarikçi grupları (R19, R19/2, AC-44–AC-46, AC-87): ad canlı diziden, yoksa ham diziden "silinmiş" işaretiyle.
  const canliTed = new Map((tedarikciler || []).filter(t => t && !t.deletedAt).map(t => [String(t.id), t]));
  const hamTed = new Map(((hamTedarikciler && hamTedarikciler.length ? hamTedarikciler : tedarikciler) || []).map(t => [String(t.id), t]));
  const tedGruplari = new Map();
  for (const g of malzemeGruplari.values()) {
    const tid = g.tedarikciId == null || g.tedarikciId === "" ? null : String(g.tedarikciId);
    const key = tid ?? "__yok";
    if (!tedGruplari.has(key)) {
      const t = tid ? canliTed.get(tid) : null; const h = tid ? hamTed.get(tid) : null;
      tedGruplari.set(key, {
        tedarikciId: tid, ad: !tid ? TEDARIKCISIZ : t ? t.ad : h ? `${h.ad} (${SILINMIS_TEDARIKCI})` : BULUNAMAYAN_TEDARIKCI,
        silinmis: !!tid && !t, yok: !tid, malzemeler: [], tutarTLK: null,
      });
    }
    const tg = tedGruplari.get(key);
    tg.malzemeler.push(g); if (g.tutarTLK != null) { tg.tutarTLK = (tg.tutarTLK ?? 0) + g.tutarTLK; }
  }
  const tedarikciGruplari = [...tedGruplari.values()].sort((a, b) => (a.yok - b.yok) || String(a.ad).localeCompare(String(b.ad), "tr"));

  // ── Eksik, hazır, stok uyarısı (R10/2, R22, R23/2, AC-55–AC-57, AC-85, AC-98, AC-99) ──────────────────────────────────
  const canliKalemler = [...kalemler.values()].filter(k => !k.silinmis);
  const hazirSayi = canliKalemler.filter(k => !k.set && !k.malzemeli).length;
  const stoklu = canliKalemler.filter(k => k.stok > 0).length;
  const stokUyarisi = canliKalemler.length > 0 && stoklu * 20 < canliKalemler.length ? { stoklu, toplam: canliKalemler.length } : null;
  const toplamTLK = tedarikciGruplari.reduce((a, t) => a + (t.tutarTLK ?? 0), 0);

  const sonuc = {
    satirlar: satirlar.map(({ kayit: _k, ...s }) => s), hataliSayi: satirlar.filter(s => s.hata).length, gecerliSayi: gecerli.length,
    kitBos, kesisimler, parcalar: parcaSatirlari, kesitler: kesitSatirlari, malzemeGruplari: [...malzemeGruplari.values()], tedarikciGruplari,
    eksik: { parca: eksikParca.size, malzeme: eksikMalzeme.size }, hazirSayi, stokUyarisi, toplamTLK,
    bos: gecerli.length === 0,
  };
  if (!tedarikciOdakli) return sonuc;
  sonuc.tedarikciBolumleri = tedarikciBolumleriKur({ kalemler, canliParca, kesitSatirlari, canliTed, hamTed, malzemeKat, secilenTedarikciler });
  return sonuc;
};

// ── Spec 0150: işlem satırları (TEK kurucu; pencere ve belge aynı listeyi okur, C1) ──────────────────────────────────────
// R1/2: küme tek türetme yolundan (`islemKalemleri`, eski kırılımdan türeyen "Hammadde alımı" dahil). R3, R3/2: adet parçanın
// (düzenlenmiş) sipariş adedi; kapatılan ve sıfır adetli parça satır üretmez, hatalı parça `hata` ile döner (belge sayar, basmaz).
// R3/4, R3/5 (P1): çöpteki parça ve hiçbir set satır üretmez. X7: `islemId` taşıyan eski katalog kalemi atlanır. R4, P10: tutar
// birim (kuruş) × adet, boş tutar nedenli. R5: yer işlem kaleminin kendi tedarikçisi. R7, R7/2: kalem başına satır; sıra işlem adı,
// parça adı, kalem sırası.
const islemSatirlariKur = (kalemler, canliParca) => {
  const satirlar = [];
  let sira = 0;
  for (const k of kalemler.values()) {
    if (k.silinmis || k.set || k.kapali) continue;
    if (!k.hata && !(k.siparis > 0)) continue;
    const p = canliParca.get(k.partId);
    if (!p) continue;
    for (const ik of islemKalemleri(p)) {
      if (eskiKatalogKalemi(ik)) continue;
      const tid = ik.tedarikciId == null || ik.tedarikciId === "" ? null : String(ik.tedarikciId);
      // Spec 0157 R8/2 (AC-39): döviz kalemin satırı para birimini ve kendi tutarını da taşır (yalnız dövizde, C6/2); lira karşılığı
      // donmuş kurla, çözülemeyen döviz kalem tutarsız ve nedenli.
      const t = islemKalemiTutari(ik);
      const birimK = t.birimK;
      const tutarK = birimK == null || k.hata ? null : birimK * k.siparis;
      satirlar.push({ partId: k.partId, parca: k.ad, ad: String(ik.ad ?? "").trim(), tedarikciId: tid, siparis: k.siparis,
        duzenlendi: !!k.duzenlendi, hata: k.hata || null, sira: sira++,
        birimK, tutarK, tutarNeden: t.bos ? ISLEM_TUTAR_YOK : t.neden || null,
        ...(t.paraBirimi ? { paraBirimi: t.paraBirimi, dovizTutarK: tutarK == null ? null : t.dovizBirimK * k.siparis } : {}) });
    }
  }
  return satirlar.sort((a, b) => a.ad.localeCompare(b.ad, "tr") || String(a.parca).localeCompare(String(b.parca), "tr") || a.sira - b.sira);
};

// ── Spec 0140 C-R4–C-R9, C-R5/2: tedarikçi bölümleri ─────────────────────────────────────────────────────────────────────
// Hazır parça satırı (karar 34, 40): patlatılan set satır açmaz; öneri ya da düzenleme varsa satır (kapatılan ve sıfıra çekilen satır
// geri açılabilsin diye görünür, belgeye girmez). Tutar yalnız malzemesiz parçada: bugünkü maliyet × adet (C-R5/2). Ana tedarikçisiz
// malzemesiz parça "belirtilmemiş"e, Ana tedarikçisiz malzemeli parça yalnız sayılır (karar 33).
const tedarikciBolumleriKur = ({ kalemler, canliParca, kesitSatirlari, canliTed, hamTed, malzemeKat, secilenTedarikciler }) => {
  const setKat = setKatalogu([...canliParca.values()]);
  const secim = Array.isArray(secilenTedarikciler) && secilenTedarikciler.length ? new Set(secilenTedarikciler.map(String)) : null;
  const bolumler = new Map();
  const bolum = (tid) => {
    if (!bolumler.has(tid)) {
      const t = canliTed.get(tid); const h = hamTed.get(tid);
      bolumler.set(tid, { tedarikciId: tid, ad: t ? t.ad : h ? `${h.ad} (${SILINMIS_TEDARIKCI})` : BULUNAMAYAN_TEDARIKCI, silinmis: !t, hazirParcalar: [], malzemeler: [], islemler: [], tutarTLK: null });
    }
    return bolumler.get(tid);
  };
  const belirtilmemis = { parcalar: [], kesitler: [], anasizMalzemeli: 0, islemler: [] };
  const parcaDurumu = {};
  let duzenlenen = 0; let kapatilan = 0; let hata = 0;
  const hazirMaliyet = new Map(); // spec 0144 B-R6: belgenin hazır parça tutarı bu değerden okunur (yeniden hesaplanmaz)
  // 2026-11-15 kararı: ekrandan kesit tablosu kalktı; parçanın kesitlerinin nedenleri (kesim çubuktan uzun, fire, asgari altı) pencerenin
  // parça satırına taşınır. Alan yalnız neden varken yazılır (kıyas altınlarının satır şekli değişmesin).
  const kesitNedenleri = new Map();
  for (const r of kesitSatirlari) for (const n of [r.boyNeden, r.fireUyarisi, r.asgariUyari]) {
    if (!n) continue;
    for (const p of r.parcalar) { if (!kesitNedenleri.has(p.partId)) kesitNedenleri.set(p.partId, []); const l = kesitNedenleri.get(p.partId); if (!l.includes(n)) l.push(n); }
  }
  for (const k of kalemler.values()) {
    if (k.silinmis) continue;
    parcaDurumu[k.partId] = { oneri: k.oneri ?? k.siparis, siparis: k.siparis, duzenlendi: !!k.duzenlendi, kapali: !!k.kapali, hata: k.hata || null };
    if (k.duzenlendi) duzenlenen++; if (k.kapali) kapatilan++; if (k.hata) hata++;
    const oneri = k.oneri ?? k.siparis;
    if (!(oneri > 0 || k.duzenlendi || k.kapali || k.hata)) continue;
    if (k.set && k.patlatildi) continue;
    const p = canliParca.get(k.partId);
    const tid = p.tedarikciId == null || p.tedarikciId === "" ? null : String(p.tedarikciId);
    if (!tid && k.malzemeli) { belirtilmemis.anasizMalzemeli++; continue; }
    const birimK = k.malzemeli ? null : parcaMaliyetKurus(p, undefined, setKat, malzemeKat);
    // Spec 0157 R15, R15/2, C1/2, P9 (AC-24, AC-38): elle döviz maliyetli hazır parçanın tutarı kendi para biriminde de taşınır;
    // lira tutarı tek okuma yolunun lira birimi × adet. Yeni anahtarlar yalnız dövizde (C6/2, AC-57). Kardeş okuyucuyu yalnız burası çağırır.
    const dv = k.malzemeli ? null : parcaDovizMaliyeti(p);
    const satir = { partId: k.partId, ad: k.ad, set: k.set, ihtiyac: k.ihtiyac, stok: k.stok, oneri, siparis: k.siparis, duzenlendi: !!k.duzenlendi,
      kapali: !!k.kapali, hata: k.hata || null, malzemeli: k.malzemeli, olculer: k.olculer, birimK, ...k.bilgi, olcuSatirlari: olcuSatirlariOf(k.malzemeli, k.olculer, k.bilgi),
      tutarK: k.malzemeli || birimK == null ? null : birimK * k.siparis, tutarNeden: k.malzemeli ? MALZEMESI_ASAGIDA : birimK == null ? MALIYET_YOK : null };
    if (dv) Object.assign(satir, { paraBirimi: dv.paraBirimi, dovizTutarK: satir.tutarK == null ? null : kurus(dv.tutar) * k.siparis });
    if (kesitNedenleri.has(k.partId)) satir.kesitNedenleri = kesitNedenleri.get(k.partId);
    hazirMaliyet.set(k.partId, { birimK: satir.birimK, tutarK: satir.tutarK, tutarNeden: k.malzemeli ? null : satir.tutarNeden,
      ...(dv ? { paraBirimi: satir.paraBirimi, dovizTutarK: satir.dovizTutarK } : {}) });
    if (!tid) belirtilmemis.parcalar.push(satir); else bolum(tid).hazirParcalar.push(satir);
  }
  for (const r of kesitSatirlari) {
    if (r.elle) duzenlenen++; if (r.kapali) kapatilan++; if (r.hata) hata++;
    const tid = r.tedarikciId == null || r.tedarikciId === "" ? null : String(r.tedarikciId);
    if (!tid) belirtilmemis.kesitler.push(r); else bolum(tid).malzemeler.push(r);
  }
  // Spec 0150 R1, R6, R8, R8/2, R10/2 (P2): pencerede hatalı parçanın işlemi çizilmez; tedarikçisiz işlem belirtilmemiş kutusunda.
  const islemSatirlari = islemSatirlariKur(kalemler, canliParca);
  for (const x of islemSatirlari) {
    if (x.hata) continue;
    if (!x.tedarikciId) belirtilmemis.islemler.push(x); else bolum(x.tedarikciId).islemler.push(x);
  }
  for (const b of bolumler.values()) {
    const tutarlar = [...b.hazirParcalar.filter(x => !x.kapali && x.siparis > 0).map(x => x.tutarK), ...b.malzemeler.filter(x => !x.kapali).map(x => x.tutarTLK)].filter(x => x != null);
    b.tutarTLK = tutarlar.length ? tutarlar.reduce((a, x) => a + x, 0) : null;
  }
  const hepsi = [...bolumler.values()].sort((a, b) => String(a.ad).localeCompare(String(b.ad), "tr"));
  const gorunenBolumler = secim ? hepsi.filter(b => secim.has(b.tedarikciId)) : hepsi;
  const gorunenBelirtilmemis = secim ? { parcalar: [], kesitler: [], anasizMalzemeli: 0, islemler: [] } : belirtilmemis;
  // Triyaj (bulgu 3): belgeyi kilitleyen hata yalnız ekranda görünen satırlardan sayılır (seçili bölümler, belirtilmemiş bölümü
  // ve Parça ihtiyacı tablosundaki set satırları); seçim dışındaki bir tedarikçinin hatası kullanıcıya görünmeden belgeyi kilitlemez.
  const satirHata = (x) => (x.hata ? 1 : 0);
  const gorunenHata = gorunenBolumler.reduce((a, b) => a + [...b.hazirParcalar, ...b.malzemeler].reduce((t, x) => t + satirHata(x), 0), 0)
    + [...gorunenBelirtilmemis.parcalar, ...gorunenBelirtilmemis.kesitler].reduce((t, x) => t + satirHata(x), 0)
    + [...kalemler.values()].filter(k => k.set && k.hata && !gorunenBolumler.some(b => b.hazirParcalar.some(x => x.partId === k.partId))
      && !gorunenBelirtilmemis.parcalar.some(x => x.partId === k.partId)).length;
  const tumBelge = belgeBolumleriKur({ kalemler, canliParca, kesitSatirlari, canliTed, hamTed, hazirMaliyet, islemSatirlari });
  const belge = secim ? tumBelge.filter(b => secim.has(b.tedarikciId)) : tumBelge;
  // Triyaj (bulgu 1): pencerenin bölümlemesi (Ana tedarikçi) ile belgeninki (malzemenin firması) bilerek farklı; pencerede bu bölümün
  // belgesine girmeyen ama başka bir bölümün belgesinde basılan satır nerede basıldığını söyler. Seçim dışındaki bölüm ayrıca yazılır.
  for (const b of gorunenBolumler) for (const x of b.hazirParcalar) {
    const yer = tumBelge.filter(bb => !bb.silinmis && bb.satirlar.some(s => s.partId === x.partId));
    if (!yer.length || yer.some(bb => bb.tedarikciId === b.tedarikciId)) continue;
    x.belgeYeri = belgeYeriMetni(yer.map(bb => bb.ad), !!secim && !yer.some(bb => secim.has(bb.tedarikciId)));
  }
  // Spec 0150 R10/3 (triyaj bulgu 1): basılacak (seçili, silinmemiş, satırı olan) bir belge bölümünü kilitleyen hatalı parçanın satırı
  // pencerede görünmüyorsa (seçim dışındaki kartta) adı ve satırının durduğu kart döner; pencere bunu ibarede söyler. 0142'nin malzeme
  // firması tarafındaki aynı sınıf da bu listeye girer.
  const gorunenIdler = new Set([...gorunenBolumler.flatMap(b => b.hazirParcalar), ...gorunenBelirtilmemis.parcalar].map(x => x.partId));
  const gizliHatalar = [];
  for (const b of belge) {
    if (b.silinmis || !(b.satirlar.length || b.islemler.length)) continue;
    for (const id of b.hataliParcalar) {
      if (gorunenIdler.has(id) || gizliHatalar.some(g => g.partId === id)) continue;
      const kart = hepsi.find(bb => bb.hazirParcalar.some(x => x.partId === id));
      const yer = kart ? kart.ad : belirtilmemis.parcalar.some(x => x.partId === id) ? TEDARIKCI_BELIRTILMEMIS : null;
      if (yer) gizliHatalar.push({ partId: id, ad: kalemler.get(id)?.ad || id, yer, metin: gizliHataMetni(kalemler.get(id)?.ad || id, yer) });
    }
  }
  return {
    bolumler: gorunenBolumler, belirtilmemis: gorunenBelirtilmemis, belge, gizliHatalar,
    secimVar: !!secim, satirsizSecilen: secim ? [...secim].filter(id => !bolumler.has(id)) : [],
    duzen: { duzenlenen, kapatilan, hata, gorunenHata }, parcaDurumu,
    // Spec 0158 R25, P15 (AC-37): belgede kesilecek adet yazılacaksa pencerenin ibaresi; anahtar yalnız o zaman.
    ...(belge.some(b => b.satirlar.some(x => x.siparisSatirlari?.some(l => l.tur === "kesim"))) ? { kesimVar: true } : {}),
  };
};

// ── Spec 0142: belgenin bölümleri (yalnız belge okur; pencerenin bölümlemesi yukarıdaki gibi kalır, C-R3) ───────────────
// B-R1/2: malzemeden kesilen parça her malzeme kalemiyle o malzemenin tedarikçisinin bölümüne girer (iki firmalı parça iki bölümde,
// her birinde yalnız o firmanın ölçüleri; tam sipariş adediyle, B-R1/6). B-R2/2: Ana tedarikçisi olmayan malzemeli parça da girer.
// B-R1/5: tedarikçisi çözülen kalemi olmayan parça (malzemesi çöpte, yok ya da tedarikçisiz) Ana tedarikçisinin bölümünde kalır,
// Ana tedarikçisi de yoksa girmez. B-R1/3: süzgeç parça satırıdır (kapalı değil, hatasız, sipariş > 0). B-R6, B-R6/2, B-R6/3: önce
// malzemeyle yerleşen parçalar (o bölümdeki ilk ölçünün malzeme adı, kesit sayıları, parça adı), sonra kalanlar kit sırasında.
// B-R7/2: toplam bölümün kesit satırlarından (kapalı, hatalı ve sıfır olanlar hariç). B-R1/4: parça ya da toplam satırı olan bölüm basılır.
const belgeBolumleriKur = ({ kalemler, canliParca, kesitSatirlari, canliTed, hamTed, hazirMaliyet = new Map(), islemSatirlari = [] }) => {
  const map = new Map();
  const al = (tid) => {
    if (!map.has(tid)) {
      const t = canliTed.get(tid); const h = hamTed.get(tid);
      map.set(tid, { tedarikciId: tid, ad: t ? t.ad : h ? `${h.ad} (${SILINMIS_TEDARIKCI})` : BULUNAMAYAN_TEDARIKCI, silinmis: !t, satirlar: [], toplam: [], islemler: [], kapaliKesitVar: false, hataSayisi: 0, hataliParcalar: [] });
    }
    return map.get(tid);
  };
  const tidOf = (x) => (x == null || x === "" ? null : String(x));
  let sira = 0;
  for (const k of kalemler.values()) {
    if (k.silinmis || (k.set && k.patlatildi)) continue;
    if (k.kapali || (!k.hata && !(k.siparis > 0))) continue;
    const p = canliParca.get(k.partId);
    const yerlesen = k.malzemeli ? k.olculer.filter(o => tidOf(o.tedarikciId)) : [];
    const ana = tidOf(p?.tedarikciId);
    // Triyaj (bulgu 2): hatalı adetli parça basılmaz ama düştüğü bölümde sayılır; o bölüm basılacaksa belge kilitlenir (belgeDurumu),
    // yoksa kesidi öneri kilosuyla toplama girip kâğıtta listede olmayan parçanın malzemesi sipariş edilirdi.
    if (k.hata) { for (const t of yerlesen.length ? new Set(yerlesen.map(o => tidOf(o.tedarikciId))) : ana ? [ana] : []) { al(t).hataSayisi++; al(t).hataliParcalar.push(k.partId); } continue; }
    // Spec 0144 B-R5/3: birim fiyat ve tutar kuralı parçanın malzeme KALEMİNE bakar (`malzemeKalemli`), yerleşim bayrağına değil.
    const temel = { partId: k.partId, ad: k.ad, siparis: k.siparis, duzenlendi: !!k.duzenlendi, kitSira: sira++, malzemeKalemli: !!k.malzemeli };
    // Spec 0147 R4, P1: satır bölümde hammadde başına bölünür (iki firmalı parçanın 0142 kuralı, tedarikçinin içindeki hammaddelere);
    // her satır yalnız o hammaddenin ölçüleri ve tam sipariş adediyle. Bölme tutar kurucusundan önce yapılır, satırın tutarı, boy
    // hücresi, nedeni ve tutarsız sayacı satır başına kendiliğinden kurulur (R8, AC-18–AC-22).
    const satirEkle = (t, olculer, malzemeli) => {
      const mid = olculer[0]?.malzemeId ?? null;
      const grup = !temel.malzemeKalemli ? { tur: GRUP_TURU.HAZIR, malzemeId: null, ad: HAZIR_PARCALAR_BASLIGI }
        : mid == null ? { tur: GRUP_TURU.COZULEMEYEN, malzemeId: null, ad: MALZEMESI_BELIRTILMEMIS_BASLIGI }
          : { tur: GRUP_TURU.HAMMADDE, malzemeId: String(mid), ad: olculer[0].malzemeAd };
      al(t).satirlar.push({ ...temel, ...k.bilgi, malzemeli, olculer, olcuSatirlari: olcuSatirlariOf(temel.malzemeKalemli, olculer, k.bilgi),
        malzemeAdlari: [...new Set(olculer.map(o => o.malzemeAd).filter(Boolean))], grup });
    };
    const malzemeyeBol = (olculer) => {
      const g = new Map();
      for (const o of olculer) { const m = o.malzemeId == null ? "" : String(o.malzemeId); if (!g.has(m)) g.set(m, []); g.get(m).push(o); }
      return [...g.values()];
    };
    if (yerlesen.length) {
      const gruplar = new Map();
      for (const o of yerlesen) { const t = tidOf(o.tedarikciId); if (!gruplar.has(t)) gruplar.set(t, []); gruplar.get(t).push(o); }
      for (const [t, olculer] of gruplar) for (const parca of malzemeyeBol(olculer)) satirEkle(t, parca, true);
      continue;
    }
    if (!ana) continue;
    const olculer = k.malzemeli ? k.olculer : [];
    // P2: Ana tedarikçide kalan parçanın malzemesi çözülmüş (tedarikçisiz) ölçüsü kendi hammadde başlığına; kaydı bulunamayan malzemenin
    // ölçüsü "Malzemesi belirtilmemiş"e (AC-10); hazır parça tek satır.
    const parcalar = olculer.length ? malzemeyeBol(olculer) : [[]];
    for (const parca of parcalar) satirEkle(ana, parca, false);
  }
  for (const r of kesitSatirlari) {
    const t = tidOf(r.tedarikciId);
    if (!t) continue;
    if (!r.kapali && !r.hata && (r.siparisKg > 0 || r.boyAdedi > 0)) al(t).toplam.push(r);
  }
  // Spec 0150 R5, R6, R3/3, R8, R9, R9/2: işlem satırı kendi tedarikçisinin bölümüne; tedarikçisiz satır basılmaz; hatalı parçanın
  // işlemi basılmaz ama o bölümün hata sayacını artırır. İşlemler toplamı (TL) ve kendi tutarsız sayacı; bölüm toplamına girmez (X3).
  for (const x of islemSatirlari) {
    if (!x.tedarikciId) continue;
    if (x.hata) { const b = al(x.tedarikciId); b.hataSayisi++; if (!b.hataliParcalar.includes(x.partId)) b.hataliParcalar.push(x.partId); continue; }
    al(x.tedarikciId).islemler.push(x);
  }
  for (const b of map.values()) {
    const tl = b.islemler.map(x => x.tutarK).filter(v => v != null);
    b.islemToplamK = tl.length ? tl.reduce((a, v) => a + v, 0) : null;
    b.islemTutarsizSayi = b.islemler.filter(x => x.tutarK == null).length;
    // Spec 0157 R8/2 (AC-39): döviz işlem kalemi varken işlemler toplamı para birimi başına da verilir; genel toplam lira toplamından.
    if (b.islemler.some(x => x.paraBirimi)) b.islemToplamlar = pbTopla(b.islemler.map(x => (x.paraBirimi ? { pb: x.paraBirimi, k: x.dovizTutarK } : { pb: "TRY", k: x.tutarK })));
  }
  for (const b of map.values()) {
    const basilan = new Set(b.satirlar.map(x => x.partId));
    b.kapaliKesitVar = kesitSatirlari.some(r => tidOf(r.tedarikciId) === b.tedarikciId && r.kapali && r.parcalar.some(x => basilan.has(x.partId)));
    const ilk = (x) => x.olculer[0] || {};
    const kesitKiyas = (a, c) => {
      const ka = ilk(a).kesit || []; const kc = ilk(c).kesit || [];
      if (!ka.length !== !kc.length) return ka.length ? -1 : 1;
      for (let i = 0; i < Math.max(ka.length, kc.length); i++) if ((ka[i] ?? 0) !== (kc[i] ?? 0)) return (ka[i] ?? 0) - (kc[i] ?? 0);
      return 0;
    };
    // Spec 0147 R3, AC-3, AC-4, AC-7, AC-10: gruplar hammadde adına göre Türkçe alfabe sırasıyla (eşitlikte malzeme kimliği), sonra
    // malzemesi çözülemeyenler, sonra hazır parçalar; hammadde grubunda kesit sonra parça adı, öteki iki grupta kit sırası. Boş grup yok.
    const TUR_SIRA = { [GRUP_TURU.HAMMADDE]: 0, [GRUP_TURU.COZULEMEYEN]: 1, [GRUP_TURU.HAZIR]: 2 };
    const gruplar = new Map();
    for (const x of b.satirlar) {
      const anahtar = `${x.grup.tur}|${x.grup.malzemeId ?? ""}`;
      if (!gruplar.has(anahtar)) gruplar.set(anahtar, { tur: x.grup.tur, malzemeId: x.grup.malzemeId, baslik: x.grup.ad, satirlar: [] });
      gruplar.get(anahtar).satirlar.push(x);
    }
    b.gruplar = [...gruplar.values()].sort((a, c) => TUR_SIRA[a.tur] - TUR_SIRA[c.tur]
      || String(a.baslik || "").localeCompare(String(c.baslik || ""), "tr") || String(a.malzemeId ?? "").localeCompare(String(c.malzemeId ?? "")));
    for (const g of b.gruplar) g.satirlar.sort((a, c) => (g.tur === GRUP_TURU.HAMMADDE ? kesitKiyas(a, c) || String(a.ad).localeCompare(String(c.ad), "tr") : a.kitSira - c.kitSira));
    // Spec 0158 R10, R11, C1 (AC-16–AC-19): grup tablosunda hiçbir satırda dolu olmayan sütun o tabloda çizilmez; karar motorda.
    for (const g of b.gruplar) g.sutunlar = grupSutunlari(g.satirlar);
    b.satirlar = b.gruplar.flatMap(g => g.satirlar); // sıra grupların sırası; ibare ve basılabilirlik bu düz listeyi okur (C7)
  }
  // Spec 0144: parça altı malzeme satırları (pay) ve fiyatlı nüshanın tutarları. Yalnız belge satırlarına yazılır (C2/2).
  const kesitMap = new Map(kesitSatirlari.map(r => [r.anahtar, r]));
  for (const b of map.values()) belgeTutarlariKur(b, kesitMap, hazirMaliyet);
  // Spec 0158 R19 (AC-28): sipariş hücresi ölçü başına satır yazan grupta hücreler üste hizalanır (ölçü ve adet satırları aynı
  // hizada); anahtar yalnız o zaman (P11).
  for (const b of map.values()) for (const g of b.gruplar || []) if (g.satirlar.some(x => x.siparisSatirlari)) g.ustHiza = true;
  // Seçim çağıranda uygulanır: pencerenin "belgede başka bölümde" ibaresi seçim dışındaki bölümü de bilmeli (triyaj, bulgu 1).
  return [...map.values()].filter(b => b.satirlar.length || b.toplam.length || b.islemler.length).sort((a, b) => String(a.ad).localeCompare(String(b.ad), "tr"));
};

// ── Spec 0144: parça payı ve fiyatlı nüshanın tutarları (C1: hesap yalnız burada; belge yalnız gösterir) ─────────────────
// A-R1/2: giriş parça ile kesit anahtarı başına tektir; eşleştirme motorda (ölçünün boyu üç ondalığa yuvarlı, `kesimBoyu` ham).
// A-R2, A-R2/2: kesidi tek PARÇA kullanıyorsa toplamın rakamı (yuvarlanmış, asgari ya da elle) aynen; aynı parçanın kalemleri tek
// satırda. A-R3, A-R4: paylaşılan kesitte yuvarlanmamış pay, toplamla aynı tabandan (boy yolunda tam çubuk ağırlığı, fire yok; kilo
// yolunda fire dâhil). A-R9/2, A-R9/3: kapalı kesitte miktar ve tutar boş. A-R10/2, A-R10/3: tedarikçisiz kesit payla, parça tutarına
// girer, bölüm toplamına ve fark notuna girmez. A-R8/3: payı olmayan satır malzeme adı dizisinden (yalnız ad).
const PB_SIRASI = ["TRY", "USD", "EUR"];
const pbTopla = (liste) => {
  const m = new Map();
  for (const { pb, k } of liste) if (k != null && PB_SIRASI.includes(pb)) m.set(pb, (m.get(pb) || 0) + k);
  return PB_SIRASI.filter(pb => m.has(pb)).map(pb => ({ pb, k: m.get(pb) }));
};
const malzemeSatiriKur = (r, partId) => {
  const girisler = r.parcalar.filter(p => p.partId === partId);
  const tedarikcisiz = r.tedarikciId == null || r.tedarikciId === "";
  const ortak = { anahtar: r.anahtar, malzemeAd: r.malzemeAd, kesitMetni: r.kesitMetni, paraBirimi: r.paraBirimi, tedarikcisiz,
    cubukBoyu: boyCinsindenMi(r) ? r.cubukBoyu : null, // 2026-11-15: belgenin boy cinsinden sipariş adedi hücresi için
    boydan: !!r.boydanSiparis, // triyaj (qa2): işaretli ama boy cinsinden olmayan (parça çubuktan uzun) kesit de "N parça" yazdırır
    kapali: !!r.kapali, tek: false, elle: false, kesirliBoy: null, payKg: null, fiyat: null, tutarK: null, tutarTLK: null, tutarNeden: null };
  if (r.kapali || !girisler.length) return ortak;
  const tek = new Set(r.parcalar.map(p => p.partId)).size === 1;
  const boy = boyCinsindenMi(r);
  let kesirliBoy = null; let payKg;
  if (tek) { kesirliBoy = boy ? r.boyAdedi : null; payKg = r.siparisKg; }
  else if (boy) { kesirliBoy = girisler.reduce((a, p) => a + p.adet * p.kesimBoyu, 0) / r.cubukBoyu; payKg = kesirliBoy * r.tamKg; }
  else payKg = girisler.reduce((a, p) => a + p.adet * p.fireliKg, 0);
  const tutar = r.tutarNeden || payKg == null ? null : payKg * r.fiyat;
  return { ...ortak, tek, elle: tek && !!r.elle, kesirliBoy, payKg, fiyat: r.fiyat ?? null, tutarNeden: r.tutarNeden || null,
    tutarK: tek ? r.tutarK : kurusOf(tutar), tutarTLK: tek ? r.tutarTLK : tutar == null ? null : kurusOf(tutar * r.kur) };
};
const belgeTutarlariKur = (b, kesitMap, hazirMaliyet) => {
  const paylar = new Map(); // anahtar → payların toplamı (kg)
  const boyPaylari = new Map(); // anahtar → parça satırlarına yazılan boyların toplamı
  let tutarsiz = 0;
  const hazirTutarlar = [];
  for (const x of b.satirlar) {
    const satirlar = []; const goruldu = new Set(); const adlar = new Set();
    for (const o of x.olculer) {
      const r = o.anahtar ? kesitMap.get(o.anahtar) : null;
      if (r) {
        if (goruldu.has(o.anahtar)) continue;
        goruldu.add(o.anahtar);
        const e = malzemeSatiriKur(r, x.partId);
        satirlar.push(e);
        if (e.payKg != null && !e.tedarikcisiz) paylar.set(e.anahtar, (paylar.get(e.anahtar) || 0) + e.payKg);
        if (e.kesirliBoy != null && !e.kapali) boyPaylari.set(e.anahtar, (boyPaylari.get(e.anahtar) || 0) + e.kesirliBoy);
      } else if (o.malzemeAd && !adlar.has(o.malzemeAd)) { adlar.add(o.malzemeAd); satirlar.push({ malzemeAd: o.malzemeAd, payYok: true }); }
    }
    x.malzemeSatirlari = satirlar;
    // 2026-11-15 Takım Yöneticisi isteği: "Sipariş boydan verilir" işaretli kesidin parçası belgede sipariş adedi yerine boy yazar
    // (kesit başına, kalem sırasıyla): tek parçalı kesitte toplamın boy adedi (yuvarlanmış, asgari, elle), paylaşılan kesitte
    // yuvarlanmamış kesirli pay. "Sipariş etme" işaretli kesit boy yazmaz; tedarikçisiz kesit yazar.
    x.boySiparisleri = satirlar.filter(e => !e.payYok && !e.kapali && e.kesirliBoy != null && e.cubukBoyu != null)
      .map(e => ({ boy: e.kesirliBoy, cubukBoyu: e.cubukBoyu, elle: !!e.elle }));
    // Triyaj (qa2 bulgu 3): boydan sipariş işaretli kalemi olup boy satırı yazılamayan parça (kesit kapalı ya da çözülemiyor) çıplak
    // adet yerine "N parça" yazsın; yoksa aynı tabloda "N boy" satırlarının arasında boy sanılırdı.
    x.boyKalemiVar = satirlar.some(e => !e.payYok && (e.cubukBoyu != null || e.boydan))
      || x.olculer.some(o => o.anahtar && !kesitMap.has(o.anahtar) && String(o.anahtar).split("|")[1] === "boy");
    kesimSatirlariKur(x, kesitMap, satirlar);
    if (x.malzemeKalemli) {
      // B-R5, B-R5/4, B-R5/5: çözülen satırların para birimi başına toplamı; B-R5/6: pay taşıyan satır yoksa neden ve sayaç.
      const cozulen = satirlar.some(e => !e.payYok);
      x.parcaTutarlari = pbTopla(satirlar.filter(e => !e.payYok && !e.kapali).map(e => ({ pb: e.paraBirimi, k: e.tutarK })));
      x.birimK = null; x.tutarK = null;
      // Triyaj (bulgu 2), B-R5/7: pay taşıyan satırın yanında payı olmayan kalem (ölçüsüz, malzemesi çözülemeyen) parça tutarını sessizce
      // eksik bırakmasın; parça satırı neden yazar ve sayaç bir artar.
      const eksikKalem = cozulen && satirlar.some(e => e.payYok);
      x.tutarNeden = !cozulen ? MALZEME_COZULEMEDI : eksikKalem ? KALEM_TUTARA_GIRMEDI : null;
      if (!cozulen || eksikKalem) tutarsiz++;
      // 2026-11-15: belgede malzeme satırı yok; tutarı yazılamayan (fiyat, kur, para birimi) malzeme satırının nedeni parça satırına
      // çıkar. Hiç tutar yoksa satırın kendi nedeni, kısmen varsa "tutar eksik". Sayaç değişmez: o kesit satırı toplamda zaten sayılır.
      const tutarsizE = satirlar.filter(e => !e.payYok && !e.kapali && e.tutarK == null);
      if (cozulen && !eksikKalem && tutarsizE.length) x.tutarNeden = x.parcaTutarlari.length ? KALEM_TUTARA_GIRMEDI : tutarsizE[0].tutarNeden;
      // Aynı gerekçe: tedarikçisi girilmemiş malzemenin tutarı parça satırına girer, bölüm toplamına girmez (0144 A-R10/3); ibare artık burada.
      if (!x.tutarNeden && satirlar.some(e => !e.payYok && !e.kapali && e.tedarikcisiz && e.tutarK != null)) x.tutarNeden = TEDARIKCISIZ_IBARESI;
    } else {
      const h = hazirMaliyet.get(x.partId) || { birimK: null, tutarK: null, tutarNeden: MALIYET_YOK };
      x.parcaTutarlari = []; x.birimK = h.birimK; x.tutarK = h.tutarK; x.tutarNeden = h.tutarK == null ? (h.tutarNeden || MALIYET_YOK) : null;
      // Spec 0157 R15, P9 (AC-24, AC-25, AC-38): döviz hazır parça kendi para biriminde toplanır, lira toplamına lira tutarıyla girer.
      if (h.paraBirimi) { x.paraBirimi = h.paraBirimi; x.dovizTutarK = h.dovizTutarK; }
      if (x.tutarK == null) tutarsiz++; else hazirTutarlar.push(h.paraBirimi ? { pb: h.paraBirimi, k: h.dovizTutarK, liraK: x.tutarK } : { pb: "TRY", k: x.tutarK });
    }
  }
  // A-R6, A-R6/2, A-R6/3 (Karar 38): fark yalnız toplam paylardan büyükken; satır başına (bir satırın eksisi ötekinin artısını silmez).
  b.payFarkKg = b.toplam.reduce((a, r) => a + (paylar.has(r.anahtar) ? Math.max(0, (r.siparisKg ?? 0) - paylar.get(r.anahtar)) : 0), 0);
  b.payFarkVar = b.payFarkKg > PAY_FARK_ESIGI_KG;
  b.siparisFarklari = b.toplam.filter(r => (boyCinsindenMi(r)
    ? Math.abs((boyPaylari.get(r.anahtar) || 0) - (r.boyAdedi ?? 0)) > 0.0005
    : !!r.elle || (r.asgariFark ?? 0) > PAY_FARK_ESIGI_KG)).map(r => ({ anahtar: r.anahtar, metin: siparisFarkMetni(r), elle: !!r.elle }));
  // B-R7, B-R7/2, B-R7/3, B-R8, B-R8/2: toplam tablosu ve hazır parçalar; paylar toplama girmez.
  for (const r of b.toplam) if (r.tutarK == null) tutarsiz++;
  b.toplamlar = pbTopla([...b.toplam.map(r => ({ pb: r.paraBirimi, k: r.tutarK })), ...hazirTutarlar]);
  const tl = [...b.toplam.map(r => r.tutarTLK), ...hazirTutarlar.map(h => h.liraK ?? h.k)].filter(v => v != null);
  b.toplamTLK = tl.length ? tl.reduce((a, v) => a + v, 0) : null;
  b.dovizVar = b.toplamlar.some(t => t.pb !== "TRY");
  b.tutarsizSayi = tutarsiz;
  genelToplamKur(b);
};

// ── Spec 0158: parça bilgileri, kesilecek adet ve genel toplam (C1: kararlar ve çarpımlar burada; belge yalnız basar) ──────
// R3/2, P12: bilgi alanlarının motordaki TEK okuyucusu; parça birikimi kurulurken bir kez çağrılır. Yalnız dolu alanlar (P11).
const parcaBilgisi = (p) => {
  const g = {};
  const kod = bilgiDegeri(p.kod);
  if (kod) g.kod = kod;
  for (const { alan } of PARCA_BILGI_ALANLARI) { const v = bilgiDegeri(p[alan]); if (v) g[alan] = v; }
  return g;
};
// R8, R8/2, P11 (AC-12, AC-13, AC-64, AC-65): ölçü hücresinin tek alanı. Malzeme kalemi varsa kesit metinleri (ölçüsü eksik kalem
// satır doğurmaz), yoksa parçanın kendi ölçüsü. Serbest metin `olculer` dizisine girmez (gruplama, kesit eşlemesi, tutar oradan).
const olcuSatirlariOf = (malzemeKalemli, olculer, bilgi) => (malzemeKalemli
  ? (olculer || []).filter(o => !o.eksik).map(o => o.metin)
  : bilgi?.olcu ? [bilgi.olcu] : []);
// R13/2, P9, C1 (AC-66): grup tablosunun sütun genişlikleri sütun kümesinden (yüzde). Spec 0147'nin iki kümesi birebir korunur
// (dokunulmamış belge piksel piksel aynı); öteki kümeler ağırlıktan. Belge yalnız basar.
const SABIT_GENISLIK = { "Parça|Ölçü|Sipariş adedi": [34, 38, 28], "Parça|Ölçü|Sipariş adedi|Tutar": [26, 28, 22, 24] };
const GENISLIK_AGIRLIK = { Parça: 26, Kod: 12, [OLCU_BASLIGI]: 24, Hammadde: 14, Cins: 14, "Sipariş adedi": 16, Tutar: 18 };
export const sutunGenislikleri = (basliklar) => {
  const sabit = SABIT_GENISLIK[basliklar.join("|")];
  if (sabit) return sabit;
  const ag = basliklar.map(h => GENISLIK_AGIRLIK[h] || 15);
  const t = ag.reduce((a, v) => a + v, 0);
  return ag.map(v => Math.round((v / t) * 100));
};
// R10, R13/2: dört koşullu sütunun her biri için ayrı karar.
export const KOSULLU_SUTUNLAR = Object.freeze(["kod", "olcu", "hammaddeAdi", "cins"]);
const grupSutunlari = (satirlar) => ({
  kod: satirlar.some(x => !!x.kod), olcu: satirlar.some(x => x.olcuSatirlari.length > 0),
  hammaddeAdi: satirlar.some(x => !!x.hammaddeAdi), cins: satirlar.some(x => !!x.cins),
});
// R16–R24, R19/2, R19/3, R20/2, P2–P5 (AC-25–AC-34, AC-60–AC-62): sipariş adedi hücresinin satırları. Ölçü hücresinin bastığı AYNI
// süzülmüş listeyi (ölçüsü eksik kalem hariç) gezer; satırlar ölçü nesnelerine yazılmaz, satırın kendi dizisidir. Satır türleri:
// "boy" (boydan ölçü; kesidin ilk ölçüsünde, P3), "bos" (aynı kesidin sonraki ölçüsü), "kesim" (kalem adedi > 1, kesit var ve
// kapalı değil: parça adedi × kalem adedi), "parca" (öteki: parça adedi). Dizi yalnız en az bir kesim satırı varken ya da boy satırı
// başka türde bir satırla karışıkken yazılır (P2; boy-yalnız parça 0144'teki gibi `boySiparisleri` ile basılır, hepsi parça adediyse
// tek rakam).
const kesimSatirlariKur = (x, kesitMap, malzemeSatirlari) => {
  const boyE = new Map(malzemeSatirlari.filter(e => !e.payYok && !e.kapali && e.kesirliBoy != null && e.cubukBoyu != null).map(e => [e.anahtar, e]));
  const goruldu = new Set();
  const satirlar = (x.malzemeKalemli ? x.olculer.filter(o => !o.eksik) : []).map(o => {
    const r = o.anahtar ? kesitMap.get(o.anahtar) : null;
    const e = o.anahtar ? boyE.get(o.anahtar) : null;
    if (e) {
      if (goruldu.has(o.anahtar)) return { tur: "bos" };
      goruldu.add(o.anahtar);
      return { tur: "boy", boy: e.kesirliBoy, cubukBoyu: e.cubukBoyu, elle: !!e.elle };
    }
    if (o.adet > 1 && r && !r.kapali) return { tur: "kesim", adet: x.siparis * o.adet, kalemAdedi: o.adet };
    return { tur: "parca", adet: x.siparis };
  });
  const kesim = satirlar.filter(l => l.tur === "kesim");
  const boyVar = satirlar.some(l => l.tur === "boy");
  if (!kesim.length && !(boyVar && satirlar.some(l => l.tur === "parca"))) return;
  x.siparisSatirlari = satirlar;
  const adetler = new Set(kesim.map(l => l.kalemAdedi));
  x.kesimAciklama = kesim.length && adetler.size === 1 && !boyVar ? kesimAciklamaMetni(x.siparis, kesim[0].kalemAdedi) : parcaAdetMetni(x.siparis);
};
// R26–R31, R26/2, R30/2, C7, P6, P7 (AC-39–AC-47, AC-73, AC-74): genel toplam (TL) = bölüm toplamının kayıtlı kurla lira karşılığı +
// işlemler toplamı. İşlem tutarı yoksa yazılmaz; bölümde parça tutarı kaynağı (toplam satırı ya da hazır parça) yoksa işlemler toplamı;
// kaynak var ama lira karşılığı hiç çıkmadıysa yazılmaz. Kısmi toplamda sayaç iki sayacın toplamıdır. Günün kuru okunmaz.
const genelToplamKur = (b) => {
  b.genelTutarsizSayi = (b.tutarsizSayi || 0) + (b.islemTutarsizSayi || 0);
  if (b.islemToplamK == null) { b.genelToplamK = null; return; }
  const kaynak = b.toplam.length > 0 || b.satirlar.some(x => !x.malzemeKalemli);
  b.genelToplamK = !kaynak ? b.islemToplamK : b.toplamTLK == null ? null : b.toplamTLK + b.islemToplamK;
};

// Spec 0142 C4, B-R5, B-R5/3, D-R2, D-R3: parçanın malzeme kalemlerinden ölçüler. Aynı malzemede aynı ölçü bir kez yazılır ve kalem
// adetleri toplanır; kesiti aynı boyu farklı kalemler ayrı. Ölçüsü eksik kalem `eksik` işaretiyle (B-R4/2). Set ölçü taşımaz.
const parcaOlculeri = (p, malzemeKat) => {
  if (!p || setMi(p)) return [];
  const gruplar = new Map();
  for (const satir of malzemeKalemleri(p)) {
    const m = malzemeKat.get(String(satir.malzemeId)) || null;
    const o = hamOlculer(satir);
    const kesit = o ? hamKesit(satir).map(x => Number(Number(x).toFixed(3))) : null;
    const boy = o ? Number(Number(o.boy).toFixed(3)) : null;
    const cubuk = cubukBoyuOf(satir);
    const anahtarOlcu = o ? [satir.bicim, ...kesit, boy].join("|") : `eksik|${gruplar.size}`;
    const g = `${m ? m.id : "?"}|${anahtarOlcu}`;
    const adet = kalemAdetiOf(satir) ?? 1;
    if (gruplar.has(g)) { gruplar.get(g).adet += adet; continue; }
    gruplar.set(g, { malzemeId: m ? String(m.id) : null, malzemeAd: m ? m.ad : null, tedarikciId: m && m.tedarikciId != null && m.tedarikciId !== "" ? String(m.tedarikciId) : null,
      anahtar: m && kesit ? kesitAnahtari(m.id, cubuk != null, cubuk, satir.bicim, kesit) : null, bicim: satir.bicim, kesit, boy, adet, eksik: !o });
  }
  return [...gruplar.values()].map(x => ({ ...x, metin: x.eksik ? "" : olcuMetni(x.bicim, x.kesit, x.boy, x.adet) }));
};

// D-R3/2, karar 38 (AC-84, AC-85, AC-88): kesit düzenlemesi. Kilo yolunda tek alan kilo, boy cinsinden satırda boy adedi (tam sayı).
// Spec 0143 C-R1/2, B-R9/2 (AC-22, AC-41): seçim işaretten; elle boy adedinin kilosu tam çubuk ağırlığıyla, tutarı o kilodan.
const kesitDuzenle = (r, d, malzemeKat) => {
  if (!d) return r;
  // D-R2/2 (AC-83): öneri değeri (kilo ya da boy) düzenlemeden önceki hesaptır; ekran onu salt okunur sütunda yazar.
  const out = { ...r, kapali: !!d.kapali, oneriSiparisKg: r.siparisKg, oneriBoyAdedi: r.boyAdedi };
  const ham = String(d.deger ?? "").trim();
  if (ham === "") return out;
  if (boyCinsindenMi(r)) {
    const v = siparisAdediDogrula(ham);
    if (v.hata) return { ...out, hata: ELLE_BOY_HATASI };
    if (!r.parcalarKapali && v.deger === r.boyAdedi) return out; // triyaj (bulgu 4): öneriye eşit değer düzenleme değildir
    const siparisKg = v.deger * r.tamKg;
    const tutar = r.tutarNeden ? null : siparisKg * r.fiyat;
    // Triyaj (bulgu 2): elle boy adedinin kilosu da asgari siparişle karşılaştırılır (elle kilo dalıyla aynı uyarı, 0140 AC-84).
    const mb = malzemeKat.get(String(r.malzemeId));
    const asgariB = Number(mb?.asgariSiparis) > 0 ? Number(mb.asgariSiparis) : null;
    return { ...out, elle: true, boyAdedi: v.deger, siparisKg, boyNeden: ELLE_BOY_NEDENI, asgariFark: null, fireUyarisi: null,
      asgariUyari: asgariB != null && siparisKg < asgariB - 1e-9 ? asgariAltiMetni(asgariB) : null,
      tutar, tutarK: kurusOf(tutar), tutarTLK: tutar == null ? null : kurusOf(tutar * r.kur) };
  }
  const v = elleKiloDogrula(ham);
  if (v.hata) return { ...out, hata: v.hata };
  // Triyaj (bulgu 4): alan öneriyi üç ondalıkla gösterir; üç ondalıkta öneriye eşit kilo düzenleme sayılmaz (parça adediyle aynı kural),
  // öneri kilosu yuvarlanmadan kalır. Parçaları kapatılmış satırda yazılan değer her zaman elle değerdir (satırı ayakta tutan odur).
  if (!r.parcalarKapali && r.siparisKg != null && Number(v.deger.toFixed(3)) === Number(Number(r.siparisKg).toFixed(3))) return out;
  const m = malzemeKat.get(String(r.malzemeId));
  const asgari = Number(m?.asgariSiparis) > 0 ? Number(m.asgariSiparis) : null;
  const tutar = r.tutarNeden ? null : v.deger * r.fiyat;
  return { ...out, elle: true, siparisKg: v.deger, boyAdedi: null, boyNeden: ELLE_KILO_NEDENI, asgariFark: null, fireUyarisi: null,
    asgariUyari: asgari != null && v.deger < asgari - 1e-9 ? asgariAltiMetni(asgari) : null,
    tutar, tutarK: kurusOf(tutar), tutarTLK: tutar == null ? null : kurusOf(tutar * r.kur) };
};

// Tek kesit satırının hesabı (spec 0143). Net (fire hariç) ve fire kilosu her satırda. İşaretli (boydan sipariş) satırda boy adedi
// tüketim oranından: yukarı( üç ondalığa yuvarlanmış Σ(adet × parçanın boyu) ÷ çubuk boyu ) (B-R3, B-R3/2, B-R5; fire girmez, B-R4);
// sipariş kilosu boy adedi × tam çubuk ağırlığı (B-R9/2). Parça çubuktan uzunsa boy hesaplanmaz, kilogramla (B-R8, B-R8/3).
// İşaretsiz satırda boy adedi yok, sipariş kilosu net artı fire (B-R6, B-R6/2). Tutar her zaman kilodan.
const kesitHesabi = (ks, eksikParca, eksikMalzeme) => {
  const m = ks.malzeme;
  const k = fiyatKumesi(m);
  const pb = k.paraBirimi;
  const tanimsizPb = !PARA_BIRIMLERI.includes(pb);
  const kur = tanimsizPb ? null : dovizMi(pb) ? (k.kur > 0 ? k.kur : null) : 1; // Karar 40: kayıtlı kur
  const boydan = !!ks.boydanSiparis;
  const ortak = { anahtar: ks.anahtar, malzemeId: ks.malzemeId, malzemeAd: m.ad, tedarikciId: m.tedarikciId ?? null, bicim: ks.bicim,
    boydanSiparis: boydan, cubukBoyu: ks.cubukBoyu ?? null,
    kesit: ks.kesit, kesitMetni: kesitSatirMetni(ks.bicim, ks.kesit, boydan ? ks.cubukBoyu : null), paraBirimi: pb, kur, parcalar: ks.parcalar };
  const tutarNedeni = (fiyat) => (tanimsizPb ? NEDEN_PARA_BIRIMI : fiyat == null ? NEDEN_FIYAT_YOK : kur == null ? NEDEN_KUR_YOK : null);
  const netKg = ks.parcalar.reduce((a, p) => a + p.hamKg * p.adet, 0);
  const fireKg = ks.parcalar.reduce((a, p) => a + (p.fireliKg - p.hamKg) * p.adet, 0);
  const capli = !!BICIMLER[ks.bicim]?.capli;
  let boyNeden = null; let boyAdedi = null; let tamKg = null;
  if (boydan) {
    if (ks.parcalar.some(p => p.kesimBoyu > ks.cubukBoyu)) boyNeden = NEDEN_KESIM_BUYUK; // B-R8, AC-18
    else {
      // B-R5 (triyaj bulgu 1): yuvarlama ORANDA değil UZUNLUKTA. Tolerans giriş hassasiyetidir: parça boyu iki ondalıkla girilir
      // (14,2857 → 14,29), her parça en çok 0,005 mm fazla yazılır; toplam uzunluktan Σ adet × 0,005 mm düşülür. Oranı üç ondalığa
      // yuvarlamak toleransı çubuk boyuna bağlıyordu (12 m çubukta 6 mm'ye kadar fazla kesim "1 boy" çıkıyordu). AC-37: toplamda bir kez.
      const uzunluk = ks.parcalar.reduce((a, p) => a + p.adet * p.kesimBoyu, 0);
      const tolerans = ks.parcalar.reduce((a, p) => a + p.adet, 0) * UZUNLUK_TOLERANSI_MM;
      boyAdedi = Math.max(uzunluk > 0 ? 1 : 0, yukari(Math.max(0, uzunluk - tolerans) / ks.cubukBoyu));
      tamKg = tamBoyKg({ bicim: ks.bicim, ...ornekOlcu(ks), cubukBoyu: ks.cubukBoyu }, m); // AC-42
    }
  }
  let siparisKg = boyAdedi != null ? boyAdedi * tamKg : netKg + fireKg; // B-R9/2, B-R6/2, AC-38, AC-39
  // R18, R18/2, Karar 31: asgari sipariş birimiyle (kilo yolunda kiloya, boy yolunda en küçük boy adedine).
  const asgari = Number(m.asgariSiparis) > 0 ? Number(m.asgariSiparis) : null;
  let asgariFark = null;
  if (asgari != null && siparisKg < asgari - 1e-9) {
    if (boyAdedi != null) { const yeniBoy = yukari(asgari / tamKg); asgariFark = (yeniBoy - boyAdedi) * tamKg; boyAdedi = yeniBoy; siparisKg = boyAdedi * tamKg; }
    else { asgariFark = asgari - siparisKg; siparisKg = asgari; }
  }
  const bant = capli && ks.hamCap != null ? bantSec(bantlarOf(m), ks.hamCap) : null; // AC-66
  const fiyat = bant && bant.fiyat != null ? bant.fiyat : (k.kiloFiyati ?? null);
  const neden = tutarNedeni(fiyat);
  if (neden) { eksikMalzeme.add(ks.malzemeId); for (const p of ks.parcalar) eksikParca.add(p.partId); } // R10/2: fiyat ya da kur eksik
  const tutar = neden ? null : siparisKg * fiyat; // R14/2, AC-92: ara değer yuvarlanmaz
  return { ...ortak, netKg, fireKg, siparisKg, tamKg, boyAdedi, boyNeden, // spec 0143 X4: artanKg yok
    // Spec 0139 A-R12/2 (AC-51): "fire var mı" = yüzde YA DA çap bandına göre kilogram.
    fireUyarisi: boyAdedi != null && ks.parcalar.some(p => p.fire > 0 || p.ekFireKg > 0) ? FIRE_BOY_UYARISI : null, // R17, AC-36
    asgariFark, fiyat, bant, tutar, tutarK: kurusOf(tutar), tutarTLK: tutar == null ? null : kurusOf(tutar * kur), tutarNeden: neden };
};
// Bir tam çubuğun ölçü nesnesi: kesit aynı, boy çubuk boyuyla değişir (tamBoyKg değiştirir); satır biçiminde alanlar ham kesitle.
const ornekOlcu = (ks) => {
  const ad2 = BICIMLER[ks.bicim].olculer.filter(x => x !== "boy");
  return { ...Object.fromEntries(ad2.map((x, i) => [x, ks.kesit[i]])), boy: 1 };
};
const sayiHane = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 3 });
export const kesitMetni = (bicim, kesit) => {
  const b = BICIMLER[bicim];
  if (!b || !kesit) return "";
  if (bicim === "mil") return `Ø${sayiHane.format(kesit[0])}`;
  if (bicim === "boru") return `Ø${sayiHane.format(kesit[0])} × ${sayiHane.format(kesit[1])} et`;
  return kesit.map(x => sayiHane.format(x)).join(" × ");
};
// Spec 0142 D-R1, D-R1/2, B-R5, B-R5/3 (AC-16–AC-19, AC-44, AC-47, AC-55): parçanın tam ölçüsü. `kesitMetni`'yi çağırır ve sonuna
// boyu ekler; `Ø` ve biçim sırası tek yerde kalır. Kalem adedi 1'den büyükse "· parça başına n". Spec 0147 R7, C4: ölçü metni birimini
// (mm) taşır; belge ve pencere bu tek metni basar. Kesit metni (sipariş farkı satırı, çubuk eki) birimsiz kalır (X3).
export const olcuMetni = (bicim, kesit, boy, adet = 1) => {
  const k = kesitMetni(bicim, kesit);
  if (!k || boy == null) return "";
  return `${k} × ${sayiHane.format(boy)} mm${adet > 1 ? parcaBasinaMetni(adet) : ""}`; // spec 0147 R7: birim boydan sonra, "parça başına" ondan sonra
};
// Spec 0143 B-R3/2, B-R3/3 (AC-36, AC-62): kesit anahtarı TEK yerde; işaret metin olarak, çubuk boyu üç ondalığa yuvarlanmış
// (işaretsizde boş): "501|boy|400|mil|30", "501|kilo||mil|30". Kesit satırı ve 0142'nin parça ölçüleri bunu çağırır.
export const kesitAnahtari = (malzemeId, boydan, cubuk, bicim, kesit) => [malzemeId, boydan ? "boy" : "kilo", boydan && cubuk != null ? cubuk : "", bicim, ...kesit].join("|");
// Kalemin geçerli çubuk boyu (yalnız işaretliyken; üç ondalık); geçersizse null (işaretsiz sayılır).
export const cubukBoyuOf = (satir) => {
  if (satir?.boydanSiparis !== true) return null;
  const n = Number(satir.cubukBoyu);
  return Number.isFinite(n) && n > 0 ? Number(n.toFixed(3)) : null;
};
// Spec 0143 C-R1, C-R1/2: satırın miktarı boy cinsinden mi (işaretli ve tam çubuk ağırlığı hesaplanmış). Pencere, belge ve düzenleme
// bu tek ölçütü okur; çubuktan uzun parçalı işaretli satır kilogramla kalır (B-R8/3).
export const boyCinsindenMi = (r) => !!r?.boydanSiparis && r.tamKg != null;
// Spec 0143 C-R4 (AC-63): işaretli satırın kesit metni çubuk boyunu da yazar; pencere ve belge aynı metni basar.
export const cubukEki = (cubuk) => ` · ${sayiHane.format(cubuk)} mm çubuk`;
export const kesitSatirMetni = (bicim, kesit, cubuk = null) => `${kesitMetni(bicim, kesit)}${cubuk != null ? cubukEki(cubuk) : ""}`;
export { kgMetni };
// Ekran ve çıktı biçimleri (0088 R25: ekran dosyası çarpım ve bölme yazmaz).
const ikiHane = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PARA_SIMGE_TL = { TRY: "₺", USD: "$", EUR: "€" };
export const tlMetni = (k) => (k == null ? "—" : `${ikiHane.format(k / 100)} ₺`);
export const pbTutarMetni = (k, pb) => (k == null ? "—" : `${ikiHane.format(k / 100)} ${PARA_SIMGE_TL[pb] || pb}`);
// Spec 0144 C5: belgenin tutar metinleri buradan (belge kendi para biçimini yazmaz).
export const pbToplamMetni = (liste = []) => (liste.length ? liste.map(t => pbTutarMetni(t.k, t.pb)).join(" + ") : "—");
export const adetFiyatMetni = (birimK) => (birimK == null ? "" : `${pbTutarMetni(birimK, "TRY")}/adet`); // B-R6/2
// A-R3/2, B-R4/2, AC-3, AC-63: payın miktarı. Kesirli boy üç ondalık (`sayiHane`), kilogram `kgMetni`; tek parçalı boy satırı
// fiyatsız nüshada yalnız boy adedi, paylaşılan boy satırı ve fiyatlı nüsha kilogramı da yazar. Kapalı ya da paysız satır boş dize.
// 2026-11-15 sonrası: `payMiktarMetni` ve `adetFiyatMetni` belgede basılmıyor (malzeme satırı ve birim fiyat sütunu kalktı); motorun pay ve
// birim değerlerinin biçimi olarak testlerde ölçülür, bilerek duruyor.
// 2026-11-15: belgenin boy cinsinden sipariş adedi metni ("7 boy (400 mm)", "4,5 boy (400 mm)"); boy en çok üç ondalık.
export const boySiparisMetni = (b) => `${sayiHane.format(b.boy)} boy (${sayiHane.format(b.cubukBoyu)} mm)`;
export const parcaAdetMetni = (n) => `${Number(n).toLocaleString("tr-TR")} parça`;
export const payMiktarMetni = (e, fiyatli = false) => {
  if (!e || e.payYok || e.kapali || e.payKg == null) return "";
  if (e.kesirliBoy == null) return kgMetni(e.payKg);
  const boy = `${sayiHane.format(e.kesirliBoy)} boy`;
  return e.tek && !fiyatli ? boy : `${boy} · ${kgMetni(e.payKg)}`;
};
export const adetMetni = (x) => (x == null ? "—" : Number(x).toLocaleString("tr-TR"));
// R3, C5, Karar 41: model seçicisinin listesi model maliyeti satırlarının işaretinden (PartiHesabi emsali, işaret yeniden okunmaz).
export const uretimdekiAdlar = (satirlar = []) => (satirlar || []).filter(m => m && m.uretimde !== false).map(m => m.model);
