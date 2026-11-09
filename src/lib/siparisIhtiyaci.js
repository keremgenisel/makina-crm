// Spec 0134: bir sonraki parti için tedarikçi sipariş ihtiyacı. Saf motor (C3): React almaz, saat okumaz, hiçbir şey yazmaz
// (R21). Girdi tek veri nesnesidir (C3/2): model kataloğu, model satırları, canlı ve ham parçalar, parça stoğu, malzemeler,
// canlı ve ham tedarikçiler. Ağırlık 0132'nin malzeme motorundan okunur (C2, Karar 43): bu dosyada özgül ağırlık geçmez.
//
// Sıra (R6b, R6b/2, R7/2, R9/2, Karar 32, Karar 33):
//   1. Model satırı başına: ham ihtiyaç = adet × kit adedi; set dışı parçada (ham × (1 + pay)) yukarı yuvarlanır, sette pay yok.
//   2. Setin toplam ihtiyacından setin kendi stoğu düşülür; kalan set adedi × bileşen miktarı bileşene eklenir.
//   3. Bileşende patlatmadan gelen adede (× (1 + pay)) yukarı yuvarlanır, kit satırlarından gelenle toplanır.
//   4. Her parçada sipariş = ihtiyaç − stok, sıfırın altına inmez (R8).
//   5. Malzeme kalemi olan parçanın SİPARİŞ adedi (× kalem adedi) her malzeme kaleminin kesit satırına gider (AC-84: pay ikinci kez uygulanmaz).
import { trLower, totalMiktar } from "./utils";
import { setMi, setIcerigiOf, kalemAdetiOf } from "./urunAgaci";
import {
  BICIMLER, PARA_BIRIMLERI, dovizMi, bantSec, bantlarOf, fiyatKumesi, hamOlculer, hamKesit, malzemeOzeti,
  malzemeKatalogu, tamBoyKg, emniyetPayiDogrula, kgMetni,
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

// R9/2, AC-81, AC-82: parçanın payı varsa o, yoksa malzemenin, ikisi de boşsa sıfır (fire önceliğinin ikizi).
// Spec 0135 R29, R29/2, C9/2 (AC-52–AC-54, AC-92): pay PARÇA düzeyinde kalır; parçanın payı yoksa malzeme kalemlerinin
// malzemelerinde girili payların EN BÜYÜĞÜ (güvenli taraf), hiçbiri yoksa sıfır. Pay parçanın adedine bir kez uygulanır.
export const emniyetPayiOf = (p, malzemeKat) => {
  const kendi = emniyetPayiDogrula(p?.emniyetPayi).deger;
  if (kendi != null) return kendi;
  if (!(malzemeKat instanceof Map)) return 0;
  const paylar = malzemeKalemleri(p).map(k => emniyetPayiDogrula(malzemeKat.get(String(k.malzemeId))?.emniyetPayi).deger).filter(v => v != null);
  return paylar.length ? Math.max(...paylar) : 0;
};

// ── Ana hesap ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const siparisIhtiyaci = (veri = {}) => {
  const { modeller = [], satirlar: hamSatirlar = [], parts = [], hamParts = null, partStock = [], malzemeler = [], tedarikciler = [], hamTedarikciler = null } = veri;
  const satirlar = satirlariDogrula(hamSatirlar, modeller);
  const gecerli = satirlar.filter(s => !s.hata);
  const canliParca = new Map((parts || []).filter(p => p && !p.deletedAt).map(p => [String(p.id), p]));
  const hamParca = new Map(((hamParts && hamParts.length ? hamParts : parts) || []).map(p => [String(p.id), p]));
  const malzemeKat = malzemeKatalogu(malzemeler);
  const stokOf = (id) => Math.max(0, totalMiktar(partStock || [], id));

  // Parça satırları (kimlik → birikim). `ham` pay öncesi, `ihtiyac` paylı yuvarlanmış.
  const kalemler = new Map();
  const kalem = (id, adKopyasi) => {
    const k = String(id);
    if (!kalemler.has(k)) {
      const p = canliParca.get(k);
      const h = hamParca.get(k);
      kalemler.set(k, {
        // R11/2: çöpteki parça kit satırının ad kopyasıyla
        partId: k, ad: p?.ad || adKopyasi || h?.ad || BULUNAMAYAN_PARCA, silinmis: !p, set: !!p && setMi(p), kaynaklar: [],
        ham: 0, ihtiyac: 0, pay: p ? emniyetPayiOf(p, malzemeKat) : 0, patlatmaHam: 0, stok: p ? stokOf(k) : 0, siparis: 0, patlatildi: false,
        malzemeli: !!p && !setMi(p) && malzemeKalemleri(p).length > 0, // spec 0135 R30/2: malzeme kalemi var mı
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
      k.ihtiyac += k.set ? yukari(ham) : yukari(ham * (1 + k.pay / 100));
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
  for (const k of setler) {
    k.siparis = Math.max(0, k.ihtiyac - k.stok);
    const p = canliParca.get(k.partId);
    const icerik = setIcerigiOf(p);
    const canliBilesen = icerik.filter(b => canliParca.has(String(b.partId)));
    if (!canliBilesen.length) { k.setNeden = SET_ICERIK_BOS; }
    k.patlatildi = k.siparis > 0 && canliBilesen.length > 0;
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
    if (k.patlatmaHam > 0) { k.ham += k.patlatmaHam; k.ihtiyac += yukari(k.patlatmaHam * (1 + k.pay / 100)); }
    k.siparis = Math.max(0, k.ihtiyac - k.stok);
  }
  const parcaSatirlari = [...kalemler.values()].map(k => ({
    partId: k.partId, ad: k.ad, silinmis: k.silinmis, set: k.set, patlatildi: k.patlatildi, setNeden: k.setNeden || null,
    kaynaklar: k.kaynaklar, iki: k.kaynaklar.some(x => x.tur === "kit") && k.kaynaklar.some(x => x.tur === "set"),
    ham: k.silinmis ? null : k.ham, pay: k.silinmis || k.set ? null : (k.pay > 0 ? k.pay : null), ihtiyac: k.silinmis ? null : k.ihtiyac,
    stok: k.silinmis ? null : k.stok, siparis: k.silinmis ? null : k.siparis, malzemeli: k.malzemeli,
  }));

  // ── Malzeme ihtiyacı (R12–R18/2) ───────────────────────────────────────────────────────────────────────────────────────
  const kesitler = new Map();
  const eksikParca = new Set(); const eksikMalzeme = new Set();
  for (const k of kalemler.values()) if (k.silinmis) eksikParca.add(k.partId);
  // Spec 0135 R28 (AC-49–AC-51): parçanın BÜTÜN malzeme kalemleri okunur; her kalem kendi ham kesitiyle kendi kesit satırına
  // girer ve kalemin adediyle çarpılır (adet = parçanın sipariş adedi × kalem adedi). İşlem kalemi satır üretmez (R30).
  // Plan turu Karar 43: aynı parçanın aynı kesitte eşdeğer iki girişi dökümde tek satırda toplanır (hesap değişmez, C9).
  for (const k of kalemler.values()) {
    if (!k.malzemeli || k.siparis <= 0) continue;
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
      const giris = { partId: k.partId, ad: k.ad, adet: k.siparis * kalemAdedi, hamKg: oz.hamKg, fireliKg: oz.fireliKg, fire: oz.fire || 0, ekFireKg: oz.ekFireKg || 0, kesimBoyu: o.boy, oran: o.boy / ((Number(m.geldigiBoy) || 0) * 1000) };
      const ayni = kesitler.get(anahtar).parcalar.find(x => x.partId === giris.partId && x.hamKg === giris.hamKg && x.fireliKg === giris.fireliKg && x.fire === giris.fire && x.kesimBoyu === giris.kesimBoyu);
      if (ayni) ayni.adet += giris.adet; else kesitler.get(anahtar).parcalar.push(giris);
    }
  }
  const kesitSatirlari = [...kesitler.values()].map(ks => kesitHesabi(ks, eksikParca, eksikMalzeme));

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

  return {
    satirlar: satirlar.map(({ kayit: _k, ...s }) => s), hataliSayi: satirlar.filter(s => s.hata).length, gecerliSayi: gecerli.length,
    kitBos, kesisimler, parcalar: parcaSatirlari, kesitler: kesitSatirlari, malzemeGruplari: [...malzemeGruplari.values()], tedarikciGruplari,
    eksik: { parca: eksikParca.size, malzeme: eksikMalzeme.size }, hazirSayi, stokUyarisi, toplamTLK,
    bos: gecerli.length === 0,
  };
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
export { kgMetni };
// Ekran ve çıktı biçimleri (0088 R25: ekran dosyası çarpım ve bölme yazmaz).
const ikiHane = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PARA_SIMGE_TL = { TRY: "₺", USD: "$", EUR: "€" };
export const tlMetni = (k) => (k == null ? "—" : `${ikiHane.format(k / 100)} ₺`);
export const pbTutarMetni = (k, pb) => (k == null ? "—" : `${ikiHane.format(k / 100)} ${PARA_SIMGE_TL[pb] || pb}`);
export const adetMetni = (x) => (x == null ? "—" : Number(x).toLocaleString("tr-TR"));
// R3, C5, Karar 41: model seçicisinin listesi model maliyeti satırlarının işaretinden (PartiHesabi emsali, işaret yeniden okunmaz).
export const uretimdekiAdlar = (satirlar = []) => (satirlar || []).filter(m => m && m.uretimde !== false).map(m => m.model);
