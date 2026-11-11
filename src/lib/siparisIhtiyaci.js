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
import { trLower, totalMiktar } from "./utils";
import { setMi, setIcerigiOf, kalemAdetiOf, parcaMaliyetKurus, setKatalogu } from "./urunAgaci";
import { BELIRSIZ_DESEN, BELIRSIZ_HATASI } from "./tutarGirdisi";
import {
  BICIMLER, PARA_BIRIMLERI, dovizMi, bantSec, bantlarOf, fiyatKumesi, hamOlculer, hamKesit, malzemeOzeti,
  malzemeKatalogu, tamBoyKg, kgMetni,
} from "./malzeme";
import { malzemeKalemleri } from "./maliyetKalemleri";

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
export const NEDEN_IKI_BOYUT = "Lama ve sacda boy adedi hesaplanmaz (kesit kartta yok); sipariş kilosu net ihtiyaç ile firenin toplamı.";
export const NEDEN_BOY_YOK = "Malzemenin geldiği boy girilmedi; boy adedi hesaplanmaz.";
export const NEDEN_KESIM_BUYUK = "Kesim boyu malzemenin boyundan uzun; boy adedi hesaplanmaz.";
export const NEDEN_BOY_YONTEMI = "Boy fiyatından hesaplanan parça; kilo hesaplanmaz.";
export const NEDEN_FIYAT_YOK = "Fiyat girilmedi; tutar yazılmaz.";
export const NEDEN_KUR_YOK = "Kur girilmedi; tutar yazılmaz.";
export const NEDEN_PARA_BIRIMI = "Para birimi tanınmıyor; tutar TL toplamına katılmadı.";
export const FIRE_BOY_YONTEMI_UYARISI = "Boy fiyatından hesaplanan parçada boy adedi tüketim oranından gelir; fire bu orana eklendi (maliyetle aynı).";
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
export const HAMMADDE_SUZGEC_NEDENI = "Listede hammadde işaretli tedarikçiler ve bir parçanın ya da malzemenin Ana tedarikçisi olan firmalar var; kargo, kira gibi tedarikçiler listelenmez.";
export const GECICI_DUZENLEME = "Düzenlemeler geçicidir: pencere kapanınca kaybolur, hiçbir yere kaydedilmez.";
export const satirsizSecilenMetni = (n, m) => `Seçilen ${n} firmanın ${m} tanesinde satır yok.`;
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
// Spec 0142 B-R1/3 (AC-39): parçası açık, kesidi kapatılmış malzeme varsa belge bölümünün sonunda.
export const KESIT_KAPALI_UYARISI = "Bu bölümde parçası sipariş edilen ama malzeme kesidi \"sipariş etme\" işaretli satır var; o malzeme toplama girmedi.";
// Spec 0142 B-R5/3 (AC-55): aynı ölçüdeki kalemlerin toplam adedi 1'den büyükse ölçü satırının eki.
export const parcaBasinaMetni = (n) => ` · parça başına ${n}`;
// Triyaj (bulgu 1): pencerede Ana tedarikçisinin bölümünde duran ama belgede malzemesinin firmasının bölümünde basılan parçanın ibaresi.
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
  return (tedarikciler || []).filter(t => t && !t.deletedAt && (t.hammadde === true || kullanilan.has(String(t.id))))
    .sort((a, b) => String(a.ad).localeCompare(String(b.ad), "tr"));
};
// C-R12 (AC-28): boş durumun nedeni (tedarikçi odaklı sonuçtan); null = boş değil.
export const bosDurumNedeni = (sonuc) => {
  const tb = sonuc?.tedarikciBolumleri;
  if (!sonuc || sonuc.bos || !tb) return null;
  if (tb.bolumler.length || tb.belirtilmemis.parcalar.length || tb.belirtilmemis.kesitler.length) return null;
  if (tb.secimVar && tb.satirsizSecilen.length) return BOS_SECIM;
  if (sonuc.gecerliSayi > 0 && sonuc.kitBos.length === sonuc.gecerliSayi) return BOS_KIT;
  return BOS_STOK_YETIYOR;
};

const ad = (x) => trLower(String(x || "").trim());
// Kayan nokta artığı (0,114 × 70 = 7,9800000001) yukarı yuvarlamayı şişirmesin: altı ondalığa indirilir.
const yukari = (x) => Math.ceil(Number(Number(x).toFixed(6)));
const asagi = (x) => Math.floor(Number(Number(x).toFixed(6)));
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
      const yontem = satir.yontem === "boy" ? "boy" : "kilo";
      const oz = malzemeOzeti(satir, malzemeKat); // R22/2, AC-97: tarih verilmez, bugünkü küme
      // Triyaj (bulgu 1): ham ölçü kayan nokta toplamıdır (10,1 + 0,2 = 10,299999…); anahtar ve gösterim üç ondalığa yuvarlanır ki
      // aynı ham kesit iki satıra bölünmesin (Karar 31'in asgari siparişi de tek satıra uygulansın).
      const kesit = hamKesit(satir)?.map(x => Number(Number(x).toFixed(3))) ?? null;
      if (!m || !kesit) { eksikParca.add(k.partId); if (m && !kesit) eksikMalzeme.add(String(m.id)); continue; }
      const o = hamOlculer(satir);
      if (yontem === "kilo" && oz.hamKg == null) { eksikParca.add(k.partId); eksikMalzeme.add(String(m.id)); continue; } // AC-41
      const kalemAdedi = kalemAdetiOf(satir); // triyaj (bulgu 3): maliyetle aynı kural; geçersiz adet eksik sayılır
      if (kalemAdedi == null) { eksikParca.add(k.partId); continue; }
      const anahtar = [m.id, yontem, satir.bicim, ...kesit].join("|");
      if (!kesitler.has(anahtar)) kesitler.set(anahtar, { anahtar, malzemeId: String(m.id), malzeme: m, bicim: satir.bicim, yontem, kesit, hamCap: o.cap ?? null, parcalar: [] });
      const giris = { partId: k.partId, ad: k.ad, adet: adetOf(k) * kalemAdedi, hamKg: oz.hamKg, fireliKg: oz.fireliKg, fire: oz.fire || 0, ekFireKg: oz.ekFireKg || 0, kesimBoyu: o.boy, oran: o.boy / ((Number(m.geldigiBoy) || 0) * 1000) };
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
      const v = (oneriKesit.get(anahtar).yontem === "boy" ? siparisAdediDogrula : elleKiloDogrula)(d?.deger);
      if (v.deger == null || String(d?.deger ?? "").trim() === "") continue;
      kesitSatirlari.push({ ...kesitHesabi({ ...oneriKesit.get(anahtar), parcalar: [] }, new Set(), new Set()), parcalarKapali: true });
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
      bolumler.set(tid, { tedarikciId: tid, ad: t ? t.ad : h ? `${h.ad} (${SILINMIS_TEDARIKCI})` : BULUNAMAYAN_TEDARIKCI, silinmis: !t, hazirParcalar: [], malzemeler: [], tutarTLK: null });
    }
    return bolumler.get(tid);
  };
  const belirtilmemis = { parcalar: [], kesitler: [], anasizMalzemeli: 0 };
  const parcaDurumu = {};
  let duzenlenen = 0; let kapatilan = 0; let hata = 0;
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
    const satir = { partId: k.partId, ad: k.ad, set: k.set, ihtiyac: k.ihtiyac, stok: k.stok, oneri, siparis: k.siparis, duzenlendi: !!k.duzenlendi,
      kapali: !!k.kapali, hata: k.hata || null, malzemeli: k.malzemeli, olculer: k.olculer, birimK,
      tutarK: k.malzemeli || birimK == null ? null : birimK * k.siparis, tutarNeden: k.malzemeli ? MALZEMESI_ASAGIDA : birimK == null ? MALIYET_YOK : null };
    if (!tid) belirtilmemis.parcalar.push(satir); else bolum(tid).hazirParcalar.push(satir);
  }
  for (const r of kesitSatirlari) {
    if (r.elle) duzenlenen++; if (r.kapali) kapatilan++; if (r.hata) hata++;
    const tid = r.tedarikciId == null || r.tedarikciId === "" ? null : String(r.tedarikciId);
    if (!tid) belirtilmemis.kesitler.push(r); else bolum(tid).malzemeler.push(r);
  }
  for (const b of bolumler.values()) {
    const tutarlar = [...b.hazirParcalar.filter(x => !x.kapali && x.siparis > 0).map(x => x.tutarK), ...b.malzemeler.filter(x => !x.kapali).map(x => x.tutarTLK)].filter(x => x != null);
    b.tutarTLK = tutarlar.length ? tutarlar.reduce((a, x) => a + x, 0) : null;
  }
  const hepsi = [...bolumler.values()].sort((a, b) => String(a.ad).localeCompare(String(b.ad), "tr"));
  const gorunenBolumler = secim ? hepsi.filter(b => secim.has(b.tedarikciId)) : hepsi;
  const gorunenBelirtilmemis = secim ? { parcalar: [], kesitler: [], anasizMalzemeli: 0 } : belirtilmemis;
  // Triyaj (bulgu 3): belgeyi kilitleyen hata yalnız ekranda görünen satırlardan sayılır (seçili bölümler, belirtilmemiş bölümü
  // ve Parça ihtiyacı tablosundaki set satırları); seçim dışındaki bir tedarikçinin hatası kullanıcıya görünmeden belgeyi kilitlemez.
  const satirHata = (x) => (x.hata ? 1 : 0);
  const gorunenHata = gorunenBolumler.reduce((a, b) => a + [...b.hazirParcalar, ...b.malzemeler].reduce((t, x) => t + satirHata(x), 0), 0)
    + [...gorunenBelirtilmemis.parcalar, ...gorunenBelirtilmemis.kesitler].reduce((t, x) => t + satirHata(x), 0)
    + [...kalemler.values()].filter(k => k.set && k.hata && !gorunenBolumler.some(b => b.hazirParcalar.some(x => x.partId === k.partId))
      && !gorunenBelirtilmemis.parcalar.some(x => x.partId === k.partId)).length;
  const tumBelge = belgeBolumleriKur({ kalemler, canliParca, kesitSatirlari, canliTed, hamTed });
  const belge = secim ? tumBelge.filter(b => secim.has(b.tedarikciId)) : tumBelge;
  // Triyaj (bulgu 1): pencerenin bölümlemesi (Ana tedarikçi) ile belgeninki (malzemenin firması) bilerek farklı; pencerede bu bölümün
  // belgesine girmeyen ama başka bir bölümün belgesinde basılan satır nerede basıldığını söyler. Seçim dışındaki bölüm ayrıca yazılır.
  for (const b of gorunenBolumler) for (const x of b.hazirParcalar) {
    const yer = tumBelge.filter(bb => !bb.silinmis && bb.satirlar.some(s => s.partId === x.partId));
    if (!yer.length || yer.some(bb => bb.tedarikciId === b.tedarikciId)) continue;
    x.belgeYeri = belgeYeriMetni(yer.map(bb => bb.ad), !!secim && !yer.some(bb => secim.has(bb.tedarikciId)));
  }
  return {
    bolumler: gorunenBolumler, belirtilmemis: gorunenBelirtilmemis, belge,
    secimVar: !!secim, satirsizSecilen: secim ? [...secim].filter(id => !bolumler.has(id)) : [],
    duzen: { duzenlenen, kapatilan, hata, gorunenHata }, parcaDurumu,
  };
};

// ── Spec 0142: belgenin bölümleri (yalnız belge okur; pencerenin bölümlemesi yukarıdaki gibi kalır, C-R3) ───────────────
// B-R1/2: malzemeden kesilen parça her malzeme kalemiyle o malzemenin tedarikçisinin bölümüne girer (iki firmalı parça iki bölümde,
// her birinde yalnız o firmanın ölçüleri; tam sipariş adediyle, B-R1/6). B-R2/2: Ana tedarikçisi olmayan malzemeli parça da girer.
// B-R1/5: tedarikçisi çözülen kalemi olmayan parça (malzemesi çöpte, yok ya da tedarikçisiz) Ana tedarikçisinin bölümünde kalır,
// Ana tedarikçisi de yoksa girmez. B-R1/3: süzgeç parça satırıdır (kapalı değil, hatasız, sipariş > 0). B-R6, B-R6/2, B-R6/3: önce
// malzemeyle yerleşen parçalar (o bölümdeki ilk ölçünün malzeme adı, kesit sayıları, parça adı), sonra kalanlar kit sırasında.
// B-R7/2: toplam bölümün kesit satırlarından (kapalı, hatalı ve sıfır olanlar hariç). B-R1/4: parça ya da toplam satırı olan bölüm basılır.
const belgeBolumleriKur = ({ kalemler, canliParca, kesitSatirlari, canliTed, hamTed }) => {
  const map = new Map();
  const al = (tid) => {
    if (!map.has(tid)) {
      const t = canliTed.get(tid); const h = hamTed.get(tid);
      map.set(tid, { tedarikciId: tid, ad: t ? t.ad : h ? `${h.ad} (${SILINMIS_TEDARIKCI})` : BULUNAMAYAN_TEDARIKCI, silinmis: !t, satirlar: [], toplam: [], kapaliKesitVar: false, hataSayisi: 0 });
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
    if (k.hata) { for (const t of yerlesen.length ? new Set(yerlesen.map(o => tidOf(o.tedarikciId))) : ana ? [ana] : []) al(t).hataSayisi++; continue; }
    const temel = { partId: k.partId, ad: k.ad, siparis: k.siparis, duzenlendi: !!k.duzenlendi, kitSira: sira++ };
    if (yerlesen.length) {
      const gruplar = new Map();
      for (const o of yerlesen) { const t = tidOf(o.tedarikciId); if (!gruplar.has(t)) gruplar.set(t, []); gruplar.get(t).push(o); }
      for (const [t, olculer] of gruplar) al(t).satirlar.push({ ...temel, malzemeli: true, olculer, malzemeAdlari: [...new Set(olculer.map(o => o.malzemeAd))] });
      continue;
    }
    if (!ana) continue;
    const olculer = k.malzemeli ? k.olculer : [];
    al(ana).satirlar.push({ ...temel, malzemeli: false, olculer, malzemeAdlari: [...new Set(olculer.map(o => o.malzemeAd).filter(Boolean))] });
  }
  for (const r of kesitSatirlari) {
    const t = tidOf(r.tedarikciId);
    if (!t) continue;
    if (!r.kapali && !r.hata && (r.siparisKg > 0 || r.boyAdedi > 0)) al(t).toplam.push(r);
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
    b.satirlar.sort((a, c) => (a.malzemeli !== c.malzemeli ? (a.malzemeli ? -1 : 1)
      : !a.malzemeli ? a.kitSira - c.kitSira
        : String(ilk(a).malzemeAd || "").localeCompare(String(ilk(c).malzemeAd || ""), "tr") || kesitKiyas(a, c) || String(a.ad).localeCompare(String(c.ad), "tr")));
  }
  // Seçim çağıranda uygulanır: pencerenin "belgede başka bölümde" ibaresi seçim dışındaki bölümü de bilmeli (triyaj, bulgu 1).
  return [...map.values()].filter(b => b.satirlar.length || b.toplam.length).sort((a, b) => String(a.ad).localeCompare(String(b.ad), "tr"));
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
    const yontem = satir.yontem === "boy" ? "boy" : "kilo";
    const anahtarOlcu = o ? [satir.bicim, ...kesit, boy].join("|") : `eksik|${gruplar.size}`;
    const g = `${m ? m.id : "?"}|${anahtarOlcu}`;
    const adet = kalemAdetiOf(satir) ?? 1;
    if (gruplar.has(g)) { gruplar.get(g).adet += adet; continue; }
    gruplar.set(g, { malzemeId: m ? String(m.id) : null, malzemeAd: m ? m.ad : null, tedarikciId: m && m.tedarikciId != null && m.tedarikciId !== "" ? String(m.tedarikciId) : null,
      anahtar: m && kesit ? [m.id, yontem, satir.bicim, ...kesit].join("|") : null, bicim: satir.bicim, kesit, boy, adet, eksik: !o });
  }
  return [...gruplar.values()].map(x => ({ ...x, metin: x.eksik ? "" : olcuMetni(x.bicim, x.kesit, x.boy, x.adet) }));
};

// D-R3/2, karar 38 (AC-84, AC-85, AC-88): kesit düzenlemesi. Kilo yolunda tek alan kilo, boy yönteminde boy adedi (tam sayı).
const kesitDuzenle = (r, d, malzemeKat) => {
  if (!d) return r;
  // D-R2/2 (AC-83): öneri değeri (kilo ya da boy) düzenlemeden önceki hesaptır; ekran onu salt okunur sütunda yazar.
  const out = { ...r, kapali: !!d.kapali, oneriSiparisKg: r.siparisKg, oneriBoyAdedi: r.boyAdedi };
  const ham = String(d.deger ?? "").trim();
  if (ham === "") return out;
  if (r.yontem === "boy") {
    const v = siparisAdediDogrula(ham);
    if (v.hata) return { ...out, hata: ELLE_BOY_HATASI };
    if (!r.parcalarKapali && v.deger === r.boyAdedi) return out; // triyaj (bulgu 4): öneriye eşit değer düzenleme değildir
    const tutar = r.tutarNeden ? null : v.deger * r.fiyat;
    return { ...out, elle: true, boyAdedi: v.deger, boyNeden: ELLE_BOY_NEDENI, fireUyarisi: null, tutar, tutarK: kurusOf(tutar), tutarTLK: tutar == null ? null : kurusOf(tutar * r.kur) };
  }
  const v = elleKiloDogrula(ham);
  if (v.hata) return { ...out, hata: v.hata };
  // Triyaj (bulgu 4): alan öneriyi üç ondalıkla gösterir; üç ondalıkta öneriye eşit kilo düzenleme sayılmaz (parça adediyle aynı kural),
  // öneri kilosu yuvarlanmadan kalır. Parçaları kapatılmış satırda yazılan değer her zaman elle değerdir (satırı ayakta tutan odur).
  if (!r.parcalarKapali && r.siparisKg != null && Number(v.deger.toFixed(3)) === Number(Number(r.siparisKg).toFixed(3))) return out;
  const m = malzemeKat.get(String(r.malzemeId));
  const asgari = Number(m?.asgariSiparis) > 0 ? Number(m.asgariSiparis) : null;
  const tutar = r.tutarNeden ? null : v.deger * r.fiyat;
  return { ...out, elle: true, siparisKg: v.deger, boyAdedi: null, boyNeden: ELLE_KILO_NEDENI, artanKg: null, asgariFark: null, fireUyarisi: null,
    asgariUyari: asgari != null && v.deger < asgari - 1e-9 ? asgariAltiMetni(asgari) : null,
    tutar, tutarK: kurusOf(tutar), tutarTLK: tutar == null ? null : kurusOf(tutar * r.kur) };
};

// Tek kesit satırının hesabı. Kilo yolu: net (fire hariç), fire, sipariş (boy adedinden ya da net + fire), artan, asgari,
// tutar. Boy yolu (malzeme satırının yöntemi "boy"): oranların toplamından boy adedi, kilo yok (R12/3).
const kesitHesabi = (ks, eksikParca, eksikMalzeme) => {
  const m = ks.malzeme;
  const k = fiyatKumesi(m);
  const pb = k.paraBirimi;
  const tanimsizPb = !PARA_BIRIMLERI.includes(pb);
  const kur = tanimsizPb ? null : dovizMi(pb) ? (k.kur > 0 ? k.kur : null) : 1; // Karar 40: kayıtlı kur
  const ortak = { anahtar: ks.anahtar, malzemeId: ks.malzemeId, malzemeAd: m.ad, tedarikciId: m.tedarikciId ?? null, bicim: ks.bicim, yontem: ks.yontem,
    kesit: ks.kesit, kesitMetni: kesitMetni(ks.bicim, ks.kesit), paraBirimi: pb, kur, parcalar: ks.parcalar };
  const tutarNedeni = (fiyat) => (tanimsizPb ? NEDEN_PARA_BIRIMI : fiyat == null ? NEDEN_FIYAT_YOK : kur == null ? NEDEN_KUR_YOK : null);
  if (ks.yontem === "boy") {
    const boyVar = Number(m.geldigiBoy) > 0;
    // Triyaj (bulgu 2), Karar 48: boy yönteminde boy adedi parça parça yerleşimden değil tüketim oranından gelir, kesim kaybı
    // artanda görünmez; bu yüzden fire oranı büyütür (maliyetle aynı: 0132 boy yolu oran × (1 + fire)). R17: fire varsa uyarı.
    const boyAdedi = boyVar ? yukari(ks.parcalar.reduce((a, p) => a + p.oran * (1 + p.fire / 100) * p.adet, 0)) : null; // AC-68
    const fiyat = k.boyFiyati ?? null;
    const neden = tutarNedeni(fiyat);
    const tutar = boyAdedi != null && !neden ? boyAdedi * fiyat : null; // AC-69
    if (neden || !boyVar) { eksikMalzeme.add(ks.malzemeId); for (const p of ks.parcalar) eksikParca.add(p.partId); }
    return { ...ortak, netKg: null, fireKg: null, siparisKg: null, artanKg: null, kgNeden: NEDEN_BOY_YONTEMI, boyAdedi, boyNeden: boyVar ? null : NEDEN_BOY_YOK,
      fireUyarisi: boyAdedi != null && ks.parcalar.some(p => p.fire > 0) ? FIRE_BOY_YONTEMI_UYARISI : null,
      asgariFark: null, fiyat, tutar, tutarK: kurusOf(tutar), tutarTLK: tutar == null ? null : kurusOf(tutar * kur), tutarNeden: neden };
  }
  const netKg = ks.parcalar.reduce((a, p) => a + p.hamKg * p.adet, 0);
  const fireKg = ks.parcalar.reduce((a, p) => a + (p.fireliKg - p.hamKg) * p.adet, 0);
  const capli = !!BICIMLER[ks.bicim]?.capli;
  const boyM = Number(m.geldigiBoy) > 0 ? Number(m.geldigiBoy) : null;
  let boyNeden = null; let boyAdedi = null; let tamKg = null;
  if (!capli) boyNeden = NEDEN_IKI_BOYUT; // R13/3, AC-90
  else if (boyM == null) boyNeden = NEDEN_BOY_YOK; // R15, AC-34
  else if (ks.parcalar.some(p => p.kesimBoyu > boyM * 1000)) boyNeden = NEDEN_KESIM_BUYUK; // AC-33
  else {
    // R13, R13/2, Karar 29: parça başına kesirli boy (adet ÷ bir boydan çıkan adet), toplam bir kez yukarı yuvarlanır.
    boyAdedi = yukari(ks.parcalar.reduce((a, p) => a + p.adet / asagi((boyM * 1000) / p.kesimBoyu), 0));
    tamKg = tamBoyKg({ bicim: ks.bicim, ...ornekOlcu(ks) }, m);
  }
  let siparisKg = boyAdedi != null ? boyAdedi * tamKg : netKg + fireKg; // R16, AC-35, AC-37
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
  return { ...ortak, netKg, fireKg, siparisKg, artanKg: boyAdedi != null ? siparisKg - netKg - (asgariFark || 0) : null, kgNeden: null, boyAdedi, boyNeden,
    // Spec 0139 A-R12/2 (AC-51): "fire var mı" = yüzde YA DA çap bandına göre kilogram.
    fireUyarisi: boyAdedi != null && ks.parcalar.some(p => p.fire > 0 || p.ekFireKg > 0) ? FIRE_BOY_UYARISI : null, // R17, AC-36
    asgariFark, fiyat, bant, tutar, tutarK: kurusOf(tutar), tutarTLK: tutar == null ? null : kurusOf(tutar * kur), tutarNeden: neden };
};
// Bir tam boyun ölçü nesnesi: kesit aynı, boy tam boyla değişir (tamBoyKg değiştirir); satır biçiminde alanlar ham kesitle.
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
// boyu ekler; `Ø` ve biçim sırası tek yerde kalır. Kalem adedi 1'den büyükse "· parça başına n".
export const olcuMetni = (bicim, kesit, boy, adet = 1) => {
  const k = kesitMetni(bicim, kesit);
  if (!k || boy == null) return "";
  return `${k} × ${sayiHane.format(boy)}${adet > 1 ? parcaBasinaMetni(adet) : ""}`;
};
export { kgMetni };
// Ekran ve çıktı biçimleri (0088 R25: ekran dosyası çarpım ve bölme yazmaz).
const ikiHane = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PARA_SIMGE_TL = { TRY: "₺", USD: "$", EUR: "€" };
export const tlMetni = (k) => (k == null ? "—" : `${ikiHane.format(k / 100)} ₺`);
export const pbTutarMetni = (k, pb) => (k == null ? "—" : `${ikiHane.format(k / 100)} ${PARA_SIMGE_TL[pb] || pb}`);
export const adetMetni = (x) => (x == null ? "—" : Number(x).toLocaleString("tr-TR"));
// R3, C5, Karar 41: model seçicisinin listesi model maliyeti satırlarının işaretinden (PartiHesabi emsali, işaret yeniden okunmaz).
export const uretimdekiAdlar = (satirlar = []) => (satirlar || []).filter(m => m && m.uretimde !== false).map(m => m.model);
