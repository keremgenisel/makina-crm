// Spec 0047: Aylık Gider ve Kasa Raporu. Saf, React'sız. Rakamların hepsi mevcut motorlardan gelir (C2): gider.js
// (hesaplaGiderRaporu, odemeleriUygula, kalemTutari, odemeDurumu), odemeHatirlatma.js, giderKdv.js + kdvKarsilastir,
// odemeYontemi.js (donemYontemKirilimi), kasa.js (hesapBakiyeleri aralıklı, hareketOzeti, hesapsız listeler,
// avansBorclari), cek.js (cekAyOzeti). Bu dosya yalnız çağırır, dizer ve HTML'e döker.
//
// GİZLİLİK (R18–R22): çalışan adı, çalışan bazlı tutar, resmi/elden ayrımı, ek ödeme satırları ve kişi bazlı avans bu
// belgeye girmez. Personel her yerde tek "Personel gideri" satırıdır; motorun `calisanlar` alt kırılımı ve hatırlatıcının
// taraf adları hiç okunmaz. Koruma çıktı temellidir (tests/gider-gizlilik.test.js, AC-24).
//
// DÖNEM KİLİDİ (R26, Q1): her şey ay sonu itibarıyla. Ödeme ve mahsup hareketleri ay sonuna süzülüp kaleme uygulanır,
// kasa aralıklı bakiyeyle, kart blokajı ve hatırlatıcı `bugun = ay sonu` ile, çek durumu geçmişinden.
import { hesaplaGiderRaporu, odemeleriUygula, turHaritasi, davranisOf, kalemTutari, odemeDurumu, kdvKarsilastir, ayinSonGunu, tl, kurus, DAVRANIS, PERSONEL_ETIKETI, kalemGorunenAd, ekOdemeTurToplamlari, stopajOzeti, sgkOzeti, kurumTarafAdi } from "./gider";
import { odemeHatirlatmalari, gunFarki, gunFarkiMetni } from "./odemeHatirlatma";
import { hesaplananKdvAylar } from "./giderKdv";
import { donemYontemKirilimi, hareketHedefPaylari, hedefEtiketi, YONTEM_BELIRSIZ } from "./odemeYontemi";
import { hesapBakiyeleri, hareketOzeti, hesapsizOdemeler, hesapsizTahsilatlar, avansBorclari, HESAP_TUR_AD } from "./kasa";
import { cekAyOzeti } from "./cek";
import { acikKalemler } from "./acikKalemler";
import { YAS_SIRA } from "./yaslandirma";
import { SATIS_KAYNAK_AD } from "./satisTahsilat";
import { fmtTR, fmtCur } from "./utils";
// Triyaj: bölünmüş hedef etiketindeki tutar belgenin para biçimiyle (fmtCur, kuruşsuz); ekranda tl2 kalır.
const etiketTutari = (payK) => fmtCur(tl(payK));
import { oncekiAyStr } from "./aylikRapor";
import { st, gecenAyEki, detayTablo, bolum, altBaslik, belgeAcilis, ayrac, not, bosNot, gun } from "./raporSunumu";

export const RAPOR_BASLIGI = "Aylık Gider ve Kasa Raporu";
export const NOT_GELIR_DEGIL = "Kasa bölümü nakit hareketlerini gösterir, gelir raporu değildir; Finans'ın Aylık Faaliyet Raporu'ndaki ciroyla toplanmaz.";
export const NOT_YONTEM = "Gider bölümü ayın kalemlerine yapılan ödemeleri, Kasa bölümü ay içinde yapılan ödeme hareketlerini sayar; iki kırılım farklı olabilir.";
export const NOT_ANLIK = "Bu rapor yazdırıldığı andaki veriyle üretilmiştir. Bu aya sonradan kayıt girilir, silinir ya da çöpe atılırsa rakamlar değişir.";
export const NOT_HESAPSIZ = "Hesabı belirtilmemiş hareketler hiçbir hesabın bakiyesine girmez; rapordaki bakiye ile gerçek bakiye arasındaki fark buradan doğabilir. Personel ödemeleri ve çalışan avansları toplu yazılır; ayrıntı Giderler ve Kasa ekranlarındadır.";
export const NOT_MAHSUP = "Mahsup para hareketi değildir, hiçbir bakiyeye girmez.";
// Spec 0060 R11, R16, R20: tür toplamı tek tutardır (bileşenler ayrı yazılmaz); çalışan adı ve kişi bazlı tutar yazılmaz.
// Spec 0061 R14, R16: yaş ay sonundan sayılır (Aylık Faaliyet Raporu'nun alacak yaşlandırması rapor anından sayar; fark
// bilinçlidir). Vadesi girilmemiş kalemler de dahildir; personel tek satırdır.
export const NOT_YASLANDIRMA = "Yaş, kalemin gider tarihinden ay sonuna kadar geçen gündür; vadesi girilmemiş kalemler dahildir. Personel tek satırdır, çalışan adı ve kişi bazlı tutar yazılmaz.";
export const NOT_EK_ODEME = "Tutarlar tür bazında toplamdır; çalışan adı, kişi bazlı tutar ve ödeme biçimi ayrımı yazılmaz.";
export const NOT_CIRO = "Ciro hareketleri kasıtlı olarak hesapsızdır ve bu sayıya girmez; ciro edilen çekler çek bölümündedir.";
export const NOT_CEK_GECMISSIZ = "Geçmişi kaydedilmemiş eski çeklerde güncel durum kullanıldı.";
export const KAYIT_YOK = "Bu ayda kayıt yok";

export const ayAdi = (ay) => {
  const [y, m] = String(ay).split("-").map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
  return s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);
};
const DURUM_AD = { odendi: "Ödendi", kismen: "Kısmen ödendi", odenmedi: "Ödenmedi" };

// girdi: { giderler (ham), hareketler, turler, tedarikciler, stock, customers, canliModeller, yururlukAy, esikGun,
//   satisVerisi, kdvSecenek, hesaplar, cekler, payments (çekli), services, partSales, yedekParcaSatislar, dealers,
//   factory, kdvRates }
// Spec 0055 R3: kalem listesi seçeneği kaldırıldı; liste her raporda vardır (0047 R32 geri alındı).
// Spec 0059 R6, R7, R34: geçen ay karşılaştırması BURADA, aynı motor ve aynı dönem kilidiyle hesaplanır (üç ekranın düğmesi
// aynı belgeyi üretir); iç çağrı `_onceki: false` ile özyinelemeyi keser ve yalnız özet rakamları taşınır. Önceki ay yürürlük
// ayından önceyse `onceki = { yururlukOncesi: true }` (karşılaştırma basılmaz); yürürlükte ama kayıtsızsa sıfırla basılır.
export const giderKasaRaporu = (girdi = {}, ay, { _onceki = true } = {}) => {
  // Triyaj: iç (önceki ay) çağrı yalnız özet rakamları taşır; detay listeleri hiç kurulmaz.
  const detay = _onceki;
  const g = { giderler: [], hareketler: [], turler: [], tedarikciler: [], stock: [], customers: [], hesaplar: [], cekler: [], payments: [],
    services: [], partSales: [], yedekParcaSatislar: [], dealers: [], satisVerisi: {}, kdvSecenek: {},
    // Spec 0058 R7, R15: kasa iş listesinden kapsam dışı bırakılanlar raporun hesapsız bölümünde de sayılmaz (null = bugünkü).
    kasaKapsamDisi: null, ...girdi };
  const bas = `${ay}-01`, son = ayinSonGunu(ay);
  const aralik = { baslangic: bas, bitis: son };
  const turMap = turHaritasi(g.turler);
  const tedMap = new Map(g.tedarikciler.map(t => [String(t.id), t]));
  // Q1: ay sonuna kadarki hareketler; kalem ödeme durumu bunlardan türer.
  const hareketlerAySonu = (g.hareketler || []).filter(h => h && (!h.tarih || h.tarih <= son));
  const giderlerAySonu = odemeleriUygula(g.giderler, hareketlerAySonu, turMap);
  const giderAySonuById = new Map(giderlerAySonu.map(k => [String(k.id), k]));

  // ── Gider bölümü ──
  const gr = hesaplaGiderRaporu({ giderler: giderlerAySonu, turler: g.turler, tedarikciler: g.tedarikciler, stock: g.stock, customers: g.customers,
    canliModeller: g.canliModeller || new Set(), yururlukAy: g.yururlukAy }, aralik, { bugun: son });
  let gider;
  if (gr.yururlukOncesi) gider = { yururlukOncesi: true };
  else {
    const personelTur = gr.turKirilimi.filter(t => t.davranis === DAVRANIS.PERSONEL);
    const turSatirlari = [
      ...gr.turKirilimi.filter(t => t.davranis !== DAVRANIS.PERSONEL).map(t => ({ ad: t.ad, adet: t.adet, toplam: t.toplam })),
      ...(personelTur.length ? [{ ad: PERSONEL_ETIKETI, adet: null, toplam: personelTur.reduce((a, t) => a + kurus(t.toplam), 0) / 100 }] : []),
    ];
    const h = odemeHatirlatmalari(giderlerAySonu, { turler: g.turler, tedarikciler: g.tedarikciler, yururlukAy: g.yururlukAy, esikGun: g.esikGun }, son);
    const hToplam = (l) => l.reduce((a, o) => a + (o.odenecekK || 0), 0);
    const kdvHesaplanan = hesaplananKdvAylar(g.satisVerisi, [ay], g.kdvSecenek);
    const yontem = donemYontemKirilimi(gr.kalemler, hareketlerAySonu, turMap);
    let kalemler;
    const genelKalemler = gr.kalemler.filter(k => davranisOf(k, turMap) !== DAVRANIS.PERSONEL)
      .sort((a, b) => String(a.tarih).localeCompare(String(b.tarih)) || Number(a.id) - Number(b.id));
    const genel = genelKalemler.map(k => {
        const dav = davranisOf(k, turMap);
        return { tarih: k.tarih, tur: turMap.get(String(k.turId))?.ad || "(türsüz)", aciklama: kalemGorunenAd(k, dav),
          tedarikci: kurumTarafAdi(dav) || tedMap.get(String(k.tedarikciId))?.ad || "", tutar: kalemTutari(k, dav), durum: DURUM_AD[odemeDurumu(k)] }; // spec 0074 R19
      });
    const personel = gr.kalemler.filter(k => davranisOf(k, turMap) === DAVRANIS.PERSONEL);
    // Spec 0060 R11, R12, R16, R28, R31, C2: tür bazında ek ödeme toplamı ve stopaj özeti saf motordan (bu dosya kişi bazlı
    // alan okumaz; tür toplamı resmi + elden tek tutardır, çalışan ve açıklama taşımaz).
    const ekOdemeTurleri = ekOdemeTurToplamlari(personel).map(t => ({ ad: t.ad, tutar: tl(t.toplamK) }));
    const so = stopajOzeti(gr.kalemler, turMap);
    // Spec 0074 R23: ayın SGK davranışlı kalemlerinin toplamı (kurum borcu; tür bazında toplam, kişi kırılımı yok).
    const sgo = sgkOzeti(gr.kalemler, turMap);
    // Spec 0061 R13, R14, R16, R32 (AC-19, AC-20): açık kalemlerin yaşlandırması, ay sonu itibarıyla (ödeme durumu ay sonu,
    // yaş ay sonundan). Taraf kırılımında çalışanlar motorun tek "Çalışanlar" satırıdır; kişi kırılımı (ayrinti) okunmaz.
    const acik = acikKalemler(giderlerAySonu, { turler: g.turler, tedarikciler: g.tedarikciler, yururlukAy: g.yururlukAy }, son);
    const yaslandirma = acik.kalemAdet ? {
      kovalar: acik.kovalar.filter(x => x.kalemAdet).map(x => ({ ad: x.ad, kalemAdet: x.kalemAdet, kalanK: x.kalanK })), toplamK: acik.toplamK,
      gruplar: acik.taraflar.map(x => ({ ad: x.ad, kovalarK: YAS_SIRA.map(a => x.kovalar[a]), toplamK: x.toplamK })),
    } : null;
    if (personel.length) {
      const d = personel.map(odemeDurumu);
      const durum = d.every(x => x === "odendi") ? "odendi" : d.every(x => x === "odenmedi") ? "odenmedi" : "kismen";
      kalemler = [...genel, { tarih: null, tur: PERSONEL_ETIKETI, aciklama: PERSONEL_ETIKETI, tedarikci: "",
        tutar: personel.reduce((a, k) => a + kurus(kalemTutari(k, DAVRANIS.PERSONEL)), 0) / 100, durum: DURUM_AD[durum], personel: true }];
    } else kalemler = genel;
    // Spec 0059 R8, R35 (AC-9, AC-16, AC-31): vadesi geçmiş ve yaklaşan kalemler bölüm satırlarından. Hatırlatıcı satırının
    // kalem nesnesi OKUNMAZ: tarih ve tür kimlikle ay sonu kalem haritasından çözülür; personel satırı zaten toplu gelir ve
    // hiçbir taraf adı taşımaz. Gün ay sonuna göredir (dönem kilidi).
    const vadeSatirlari = (satirlar) => satirlar.map(v => {
      if (v.tur === "personel") return { personel: true, tarih: null, tur: PERSONEL_ETIKETI, tedarikci: "", adet: v.adet, kalanK: kurus(v.odenecek), vade: v.vade, gun: gunFarki(son, v.vade) };
      const kk = giderAySonuById.get(String(v.id));
      return { tarih: kk?.tarih || null, tur: turMap.get(String(kk?.turId))?.ad || "(türsüz)", tedarikci: v.taraf, kalanK: v.odenecekK, vade: v.vade, gun: v.gunFarki };
    });
    // Spec 0059 R9, R39 (AC-10, AC-27): tedarikçi kırılımının altındaki kalemler kalem listesinden gruplanır (yeni hesap yok).
    // Triyaj: gruplama tedarikçi KİMLİĞİYLE yapılır, ad yalnız başlıktır (aynı adlı iki tedarikçi bir tabloda karışmasın).
    // Silinmiş ya da seçilmemiş tedarikçi "Tedarikçi seçilmemiş" grubuna düşer (kalem listesinde tedarikçi boş görünür).
    const tedarikciKalemleri = [];
    if (detay) {
      const tedGrup = new Map();
      genel.forEach((kl, i) => {
        const id = genelKalemler[i].tedarikciId;
        const key = id != null && tedMap.has(String(id)) ? String(id) : "";
        if (!tedGrup.has(key)) tedGrup.set(key, []);
        tedGrup.get(key).push(kl);
      });
      const tedSira = gr.tedarikciKirilimi.satirlar.map(t => String(t.tedarikciId)).filter(id => tedGrup.has(id));
      for (const id of tedGrup.keys()) if (id && !tedSira.includes(id)) tedSira.push(id);
      if (tedGrup.has("")) tedSira.push("");
      for (const id of tedSira) tedarikciKalemleri.push({ ad: id ? tedMap.get(id).ad : "Tedarikçi seçilmemiş", kalemler: tedGrup.get(id) });
    }
    gider = {
      yururlukOncesi: false, bos: gr.bos,
      ozet: { toplam: gr.toplam, odenen: gr.odenen, odenmeyen: gr.odenmeyen, indirilecekKdv: gr.indirilecekKdv, stopaj: gr.stopajToplam },
      turler: turSatirlari,
      tedarikciler: { satirlar: gr.tedarikciKirilimi.satirlar.map(t => ({ ad: t.ad, harcama: t.harcama, acikBorc: t.acikBorc })),
        secilmemis: gr.tedarikciKirilimi.secilmemis, toplamHarcama: gr.tedarikciKirilimi.toplamHarcama, toplamBorc: gr.tedarikciKirilimi.toplamBorc },
      odemeDurumu: { gecmisAdet: h.sayilar.gecmis, gecmisTutar: tl(hToplam(h.gecmis)), yaklasanAdet: h.sayilar.yaklasan, yaklasanTutar: tl(hToplam(h.yaklasan)), esikGun: h.esikGun },
      kovalar: gr.kovalar,
      kdv: kdvKarsilastir(kdvHesaplanan, gr.indirilecekKdv),
      // Spec 0060 R3 revizyonu (X8): personel ödemelerinin yöntem kırılımı rapora GİRMEZ; elden genelde nakit ödendiği için
      // kırılım resmi/elden ayrımını ve tek çalışanlı ayda kişinin maaşını açığa çıkarırdı (R16, AC-21). Toplu satır kalır.
      yontem: { satirlar: yontem.satirlar.map(s => ({ ad: s.yontem, tutar: tl(s.tutarK) })), personel: tl(yontem.personelK), toplam: tl(yontem.toplamK) },
      ekOdemeTurleri,
      yaslandirma,
      stopaj: so.kesilenK > 0 ? { kesilen: tl(so.kesilenK), odenen: tl(so.odenenK), acik: tl(so.acikK) } : null,
      sgk: sgo.toplamK > 0 ? { toplam: tl(sgo.toplamK), odenen: tl(sgo.odenenK), acik: tl(sgo.acikK) } : null,
      kalemler,
      vadeler: detay ? { gecmis: vadeSatirlari(h.gecmisSatirlar), yaklasan: vadeSatirlari(h.yaklasanSatirlar) } : { gecmis: [], yaklasan: [] },
      tedarikciKalemleri,
    };
  }

  // ── Kasa bölümü ──
  const veri = { payments: g.payments, services: g.services, partSales: g.partSales, yedekParcaSatislar: g.yedekParcaSatislar,
    customers: g.customers, dealers: g.dealers, factory: g.factory, kdvRates: g.kdvRates, bugun: son,
    // Spec 0049 Q9: ödenmiş verilen çek, ödendiği gün hesaptan çıkar (aralık ay sonuna kadar satırları sayar).
    cekler: g.cekler };
  const bakiyeler = hesapBakiyeleri(g.hesaplar, g.hareketler, veri, { aralik });
  const hesapSatirlari = [];
  for (const x of bakiyeler.values()) {
    const a = x.aralik;
    if (a.sonra) continue; // R41: henüz açılmamış hesap
    if (x.hesap.kapali && !a.satirlar.length && !a.acilisSatiriK && !a.kapanisK) continue; // R42
    hesapSatirlari.push({ ad: x.hesap.ad, tur: HESAP_TUR_AD[x.hesap.tur] || x.hesap.tur, paraBirimi: x.hesap.paraBirimi || "TRY", kapali: !!x.hesap.kapali,
      devredenK: a.devredenK, acilisSatiriK: a.acilisSatiriK, girenK: a.girenK, cikanK: a.cikanK, kapanisK: a.kapanisK });
  }
  const bloklar = [...new Set(hesapSatirlari.map(r => r.paraBirimi))].sort((a, b) => (a === "TRY" ? -1 : b === "TRY" ? 1 : a.localeCompare(b)))
    .map(pb => {
      const satirlar = hesapSatirlari.filter(r => r.paraBirimi === pb).sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
      const t = (f) => satirlar.reduce((s, r) => s + r[f], 0);
      return { paraBirimi: pb, satirlar, toplam: { devredenK: t("devredenK"), acilisSatiriK: t("acilisSatiriK"), girenK: t("girenK"), cikanK: t("cikanK"), kapanisK: t("kapanisK") } };
    });
  const ozet = hareketOzeti(g.hareketler, aralik, bakiyeler);
  const giderById = new Map(g.giderler.map(k => [String(k.id), k]));
  const hsz = hesapsizOdemeler(g.hareketler, aralik, g.kasaKapsamDisi);
  // Triyaj (R31 istisnası, R18/R19/R21): personel ödemeleri ve avanslar satır satır yazılmaz; tek bir çalışanın elden
  // tutarı ya da avansı tarihiyle kâğıda düşerdi. İkisi birer toplu satırdır (adet + toplam), ayrıntı ekrandadır.
  const hesapsizListe = [];
  const personelOdeme = { adet: 0, tutarK: 0 }, avansTop = { adet: 0, tutarK: 0 };
  for (const m of hsz.liste) {
    if (m.tur === "avans") { avansTop.adet++; avansTop.tutarK += kurus(m.tutar); continue; }
    const k = giderById.get(String(m.giderId));
    if (k && davranisOf(k, turMap) === DAVRANIS.PERSONEL) { personelOdeme.adet++; personelOdeme.tutarK += kurus(m.tutar); continue; }
    const etiket = k ? (kalemGorunenAd(k, davranisOf(k, turMap)) || turMap.get(String(k.turId))?.ad || "Gider") : "Silinmiş gider";
    // Tutarsız göç hareketi (0024 tamKapatir) kalemin tamamını kapatır; tutarı yok, "₺0" yazmak yanıltırdı.
    hesapsizListe.push({ tarih: m.tarih, tutarK: kurus(m.tutar), etiket, ...(m.tamKapatir && (m.tutar == null || m.tutar === "") ? { tamami: true } : {}) });
  }
  if (personelOdeme.adet) hesapsizListe.push({ tarih: null, tutarK: personelOdeme.tutarK, etiket: `Personel ödemeleri · ${personelOdeme.adet} adet`, toplu: true });
  if (avansTop.adet) hesapsizListe.push({ tarih: null, tutarK: avansTop.tutarK, etiket: `Çalışan avansları · ${avansTop.adet} adet`, toplu: true });
  const hszTah = hesapsizTahsilatlar(veri, g.hesaplar, aralik, g.kasaKapsamDisi);
  // Spec 0059 R10, R11, R21, R36, R37 (AC-11, AC-12, AC-17, AC-29): ayın hareket listeleri motorun opt-in listesinden.
  // Yalnız `odeme` satır satır yazılır; personel ödemeleri, avans ve mahsup birer "Ay geneli" toplu satırdır (C9) ve
  // hedef etiketi yalnız personel DIŞI kalemde basılır (R10 b).
  const ozetL = hareketOzeti(g.hareketler, aralik, bakiyeler, { liste: detay });
  const hesapById = new Map(g.hesaplar.map(x => [String(x.id), x]));
  const hesapAd = (id) => hesapById.get(String(id))?.ad || "Silinmiş hesap";
  const paylarCache = new Map();
  const paylarOf = (k) => {
    if (!paylarCache.has(String(k.id))) paylarCache.set(String(k.id), hareketHedefPaylari(k, hareketlerAySonu, turMap));
    return paylarCache.get(String(k.id));
  };
  const odemeler = [];
  const personelTop = { adet: 0, tutarK: 0 };
  // Triyaj: kalemi kalıcı silinmiş ödeme kimin ödemesi olduğu bilinemediği için (personel olabilir) tarihli satır olarak
  // basılmaz; "Silinmiş kalem ödemeleri" toplu satırına iner (R15, AC-17).
  const silinmisTop = { adet: 0, tutarK: 0 };
  for (const m of detay ? ozetL.odeme.liste : []) {
    const k = giderById.get(String(m.giderId));
    if (!k) { silinmisTop.adet++; silinmisTop.tutarK += kurus(m.tutar); continue; }
    const dav = davranisOf(k, turMap);
    if (dav === DAVRANIS.PERSONEL) { personelTop.adet++; personelTop.tutarK += kurus(m.tutar); continue; }
    // R36: hesapsız çek hareketinde hesap sütunu yöntemin kendisidir ("Çek (ciro)" / "Çek (kendi)").
    odemeler.push({ tarih: m.tarih, hesap: m.hesapId != null ? hesapAd(m.hesapId) : m.cekId != null ? (String(m.yontem || "").trim() || "Çek") : "Hesapsız", yontem: String(m.yontem || "").trim() || YONTEM_BELIRSIZ,
      kalem: kalemGorunenAd(k, dav) || turMap.get(String(k.turId))?.ad || "Gider", hedef: hedefEtiketi(k, dav, paylarOf(k).get(String(m.id)), etiketTutari) || "",
      tutarK: kurus(m.tutar), ...(m.tamKapatir && (m.tutar == null || m.tutar === "") ? { tamami: true } : {}) });
  }
  const toplu = (etiket, l) => (l.adet ? [{ tarih: null, toplu: true, kalem: `${etiket} · ${l.adet} adet`, tutarK: l.tutarK }] : []);
  if (detay) odemeler.push(...toplu("Personel ödemeleri", personelTop), ...toplu("Silinmiş kalem ödemeleri", silinmisTop), ...toplu("Çalışan avansları", ozetL.avans), ...toplu("Avanstan mahsup", ozetL.mahsup));
  const virmanlar = (ozetL.virman.liste || []).map(m => ({ tarih: m.tarih, kaynak: hesapAd(m.hesapId), hedef: hesapAd(m.karsiHesapId), tutarK: kurus(m.tutar),
    paraBirimi: hesapById.get(String(m.hesapId))?.paraBirimi || "TRY" }));
  const tahsilatlar = (ozetL.tahsilat.liste || []).map(t => ({ tarih: t.tarih, hesap: t.hesapAd, kaynak: t.kaynak === "makina" ? "Makina tahsilatı" : SATIS_KAYNAK_AD[t.kaynak] || t.turAdi || t.kaynak,
    firma: t.firma || "", tutarK: t.tutarK, paraBirimi: t.paraBirimi }));
  let avansK = 0;
  for (const x of avansBorclari(hareketlerAySonu, g.giderler).values()) avansK += x.borcK;
  const kasa = {
    bloklar,
    ozet: { ...ozet, tahsilat: { ...ozet.tahsilat, kaynaklar: Object.entries(ozet.tahsilat.kaynaklar).map(([kaynak, v]) => ({ ad: kaynak === "makina" ? "Makina tahsilatı" : SATIS_KAYNAK_AD[kaynak] || kaynak, ...v })) } },
    hesapsiz: { odemeAdet: hsz.adet, avansAdet: hsz.avansAdet, liste: hesapsizListe,
      tahsilatAdet: hszTah.adet, tahsilatlar: hszTah.liste.map(k => ({ tarih: k.tarih, ad: k.turAdi, firma: k.firma, tutarK: kurus(k.tutar), paraBirimi: k.currency || "TRY" })) },
    cek: cekAyOzeti(g.cekler, g.payments, ay, { liste: detay }),
    avansK,
    // Spec 0060 R13, R33: ay içinde verilen ve mahsup edilen avans (hareket özetinin toplamları, kişi bilgisi yok).
    avansAy: { verilenK: ozet.avans.tutarK, mahsupK: ozet.mahsup.tutarK },
    odemeler, virmanlar, tahsilatlar,
  };
  let onceki = null;
  if (_onceki) {
    const oAy = oncekiAyStr(ay);
    if (g.yururlukAy && oAy < g.yururlukAy) onceki = { ay: oAy, yururlukOncesi: true };
    else {
      const o = giderKasaRaporu(girdi, oAy, { _onceki: false });
      onceki = { ay: oAy, yururlukOncesi: false, gider: o.gider.yururlukOncesi ? null : o.gider.ozet,
        kasa: Object.fromEntries(o.kasa.bloklar.map(b => [b.paraBirimi, { girenK: b.toplam.girenK, cikanK: b.toplam.cikanK, kapanisK: b.toplam.kapanisK }])) };
    }
  }
  const f = g.factory || {};
  const firma = { name: f.name, evrakFirmaAdi: f.evrakFirmaAdi, adres: f.adres, city: f.city, country: f.country, phone: f.phone, email: f.email, web: f.web };
  return { ay, ayAdi: ayAdi(ay), bas, son, gider, kasa, onceki, firma };
};

// ── HTML (beyaz kâğıt; C6) ──
// Spec 0059 R1–R3, R33: Aylık Faaliyet Raporu'nun sunum dili (src/lib/raporSunumu.js): üst başlık bandı, koyu şeritli
// bölüm kutuları, istatistik satırları, "geçen ay" eki ve detay tabloları. Para gösterimi bugünkü fmtCur biçimidir (R1).
// Kaçışlama sözleşmesi (R22): bütün hücreler burada esc / tlp ile kaçışlanır; ortak modül kaçışlamaz.
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const tlp = (n, pb = "TRY") => esc(fmtCur(Number(n) || 0, pb));
const kp = (k, pb = "TRY") => tlp(tl(k || 0), pb);
const bosSatir = bosNot(esc(KAYIT_YOK));
const pbTutarlari = (m) => Object.entries(m || {}).map(([pb, k]) => kp(k, pb)).join(" · ") || kp(0);
const R = "right", SOL = "left";
const tablo = (baslik, basliklar, satirlar, hizalar) => detayTablo(esc(baslik), basliklar.map(esc), satirlar, hizalar);
const stTablo = (satirlar) => `<table>${satirlar.join("")}</table>`;
const tarihHucre = (t) => (t ? esc(gun(t)) : "Ay geneli");
export const GUN_NOTU = (son) => `Gün sütunu ay sonuna (${fmtTR(son)}) göre ölçülür, bugüne göre değil.`;

export const buildGiderKasaRaporuHtml = (r) => {
  const donem = `${esc(fmtTR(r.bas))} – ${esc(fmtTR(r.son))}`;
  const itibariyla = `${esc(fmtTR(r.son))} itibarıyla`;
  const G = r.gider, K = r.kasa;
  // R7, R34: önceki ay yürürlük öncesiyse ek basılmaz; değilse önceki ayın rakamı (kayıtsızsa sıfır).
  const onc = r.onceki && !r.onceki.yururlukOncesi ? r.onceki : null;
  const gaG = gecenAyEki(onc?.gider ? onc.gider : null);
  const gaK = gecenAyEki(onc ? onc.kasa : null);

  let gider;
  if (G.yururlukOncesi) gider = bolum("GİDER", "", bosNot(`Gider takibi bu aydan sonra yürürlüğe girdi; ${esc(r.ayAdi)} için gider rakamı üretilmez.`));
  else if (G.bos) gider = bolum("GİDER", "", bosSatir);
  else {
    const o = G.ozet, oo = onc?.gider;
    const ozetKutu = bolum("GİDER · ÖZET", `Toplam ${tlp(o.toplam)}`, `
      ${not(donem)}
      ${stTablo([st("Toplam gider", tlp(o.toplam) + gaG(tlp(oo?.toplam))), st("Ödenen", tlp(o.odenen) + gaG(tlp(oo?.odenen))),
        st("Ödenmeyen", tlp(o.odenmeyen) + gaG(tlp(oo?.odenmeyen))), st("İndirilecek KDV", tlp(o.indirilecekKdv) + gaG(tlp(oo?.indirilecekKdv))),
        st("Kesilen stopaj", tlp(o.stopaj) + gaG(tlp(oo?.stopaj)))])}`);
    const turKutu = bolum("GİDER · TÜR KIRILIMI", donem,
      tablo("TÜRLER", ["Tür", "Kalem", "Toplam"], G.turler.map(t => [esc(t.ad), t.adet == null ? "—" : String(t.adet), tlp(t.toplam)]), [SOL, R, R]) || bosSatir);
    const tedKutu = bolum("GİDER · TEDARİKÇİ KIRILIMI", `harcama dönem, açık borç ${itibariyla}`, `
      ${tablo("TEDARİKÇİLER", ["Tedarikçi", "Harcama", "Açık borç"], [...G.tedarikciler.satirlar.map(t => [esc(t.ad), tlp(t.harcama), tlp(t.acikBorc)]),
        ...(G.tedarikciler.secilmemis.adet ? [["Tedarikçi seçilmemiş", tlp(G.tedarikciler.secilmemis.harcama), tlp(G.tedarikciler.secilmemis.acikBorc)]] : []),
        ["<b>Toplam</b>", `<b>${tlp(G.tedarikciler.toplamHarcama)}</b>`, `<b>${tlp(G.tedarikciler.toplamBorc)}</b>`]], [SOL, R, R])}
      ${G.tedarikciKalemleri.map(t => tablo(`${t.ad} · bu ayın kalemleri`, ["Tarih", "Tür", "Açıklama", "Tutar", "Durum"],
        t.kalemler.map(k => [tarihHucre(k.tarih), esc(k.tur), esc(k.aciklama), tlp(k.tutar), esc(k.durum)]), [SOL, SOL, SOL, R, SOL])).join("")}`);
    const vadeTablo = (baslik, l) => tablo(baslik, ["Tarih", "Tür", "Tedarikçi", "Kalan", "Vade", "Gün"],
      l.map(v => [tarihHucre(v.tarih), esc(v.personel || v.toplu ? `${v.tur} · ${v.adet} kalem` : v.tur), esc(v.tedarikci), kp(v.kalanK), esc(gun(v.vade)), esc(gunFarkiMetni(v.gun))]), [SOL, SOL, SOL, R, SOL, R]);
    const vadeVar = G.vadeler.gecmis.length + G.vadeler.yaklasan.length > 0;
    const durumKutu = bolum("GİDER · ÖDEME DURUMU", itibariyla, `
      ${stTablo([st("Vadesi geçmiş", `${G.odemeDurumu.gecmisAdet} kalem · ${tlp(G.odemeDurumu.gecmisTutar)}`),
        st(`Yaklaşan (ay sonundan sonraki ${G.odemeDurumu.esikGun} gün)`, `${G.odemeDurumu.yaklasanAdet} kalem · ${tlp(G.odemeDurumu.yaklasanTutar)}`)])}
      ${vadeTablo("VADESİ GEÇMİŞ KALEMLER", G.vadeler.gecmis)}
      ${vadeTablo("YAKLAŞAN KALEMLER", G.vadeler.yaklasan)}
      ${vadeVar ? not(esc(GUN_NOTU(r.son))) : ""}`);
    // Spec 0061 R13, R15, R31 (AC-19, AC-21, AC-33, AC-42): yaşlandırma kutusu ödeme durumundan sonra; boşsa basılmaz.
    const Y = G.yaslandirma;
    const yasPay = (k) => (Y.toplamK ? `%${Math.round(k / Y.toplamK * 100)}` : "—");
    const yasKutu = Y ? bolum("GİDER · AÇIK KALEMLER YAŞLANDIRMASI", `yaş gider tarihinden, ${itibariyla}`, `
      ${tablo("KOVALAR", ["Yaş aralığı", "Kalem", "Kalan", "Pay"], Y.kovalar.map(x => [esc(x.ad), String(x.kalemAdet), kp(x.kalanK), yasPay(x.kalanK)]), [SOL, R, R, R])}
      ${tablo("TARAFLAR", ["Taraf", ...YAS_SIRA, "Toplam"], Y.gruplar.map(x => [esc(x.ad), ...x.kovalarK.map(k => (k ? kp(k) : "—")), kp(x.toplamK)]), [SOL, R, R, R, R, R])}
      ${not(esc(NOT_YASLANDIRMA))}`) : "";
    const kovaKutu = bolum("GİDER · MALİYET DAĞILIMI", donem, stTablo([st("Makinaya", tlp(G.kovalar.makina)), st("Modele", tlp(G.kovalar.model)),
      st("Dağıtılmayan", tlp(G.kovalar.dagitma)), st("Ortak", tlp(G.kovalar.ortak)), st("Toplam", tlp(G.ozet.toplam))]));
    const kdvKutu = bolum("GİDER · KDV KARŞILAŞTIRMASI", donem, stTablo([st("Hesaplanan satış KDV'si", tlp(G.kdv.hesaplananTL)),
      st("İndirilecek gider KDV'si", tlp(G.kdv.indirilecek)), st("Fark", tlp(G.kdv.fark))]));
    const yontemKutu = bolum("GİDER · ÖDEME YÖNTEMİ KIRILIMI", "ayın kalemlerine yapılan ödemeler",
      G.yontem.satirlar.length || G.yontem.personel ? tablo("YÖNTEMLER", ["Yöntem", "Tutar"], [...G.yontem.satirlar.map(s => [esc(s.ad), tlp(s.tutar)]),
        ...(G.yontem.personel ? [["Personel ödemeleri", tlp(G.yontem.personel)]] : []), ["<b>Toplam</b>", `<b>${tlp(G.yontem.toplam)}</b>`]], [SOL, R]) : bosSatir);
    // Spec 0060 R11, R15, R28 (AC-13, AC-17, AC-35, AC-39): ek ödemeler tür bazında tek toplamla; boşsa kutu basılmaz. Kutu
    // `data-bolum="ek-odeme"` ile işaretlidir (gizlilik testleri kutunun dışına eski yasakları aynen uygular).
    const ekKutu = (G.ekOdemeTurleri || []).length ? `<!--ek-odeme--><div data-bolum="ek-odeme">${bolum("GİDER · EK ÖDEMELER (TÜR BAZINDA)", donem, `
      ${tablo("EK ÖDEMELER", ["Tür", "Toplam"], G.ekOdemeTurleri.map(t => [esc(t.ad), tlp(t.tutar)]), [SOL, R])}
      ${not(esc(NOT_EK_ODEME))}`)}</div><!--/ek-odeme-->` : "";
    // Spec 0060 R12, R15, R31 (AC-14, AC-17, AC-41): ayın kira stopajı; kesilen = ödenen + açık. Stopaj yoksa basılmaz.
    const stopajKutu = G.stopaj ? bolum("GİDER · STOPAJ", `kesilen ${donem}, ödeme durumu ${itibariyla}`, stTablo([st("Kesilen stopaj", tlp(G.stopaj.kesilen)),
      st("Ödenen", tlp(G.stopaj.odenen)), st("Ay sonunda açık", tlp(G.stopaj.acik))])) : "";
    // Spec 0070 R18, AC-22 (0074 R23: kaynak SGK davranışlı kalemler): SGK tek toplam kutu (ödenen ve açık); boşsa basılmaz. `<!--sgk-->` ile sınırlı (gizlilik testleri
    // kutunun dışına eski yasakları aynen, içine çalışan adı ve kişi bazlı tutar yasağını uygular).
    const sgkKutu = G.sgk ? `<!--sgk--><div data-bolum="sgk">${bolum("GİDER · SGK", `${donem}, ödeme durumu ${itibariyla}`, stTablo([st("SGK toplamı", tlp(G.sgk.toplam)),
      st("Ödenen", tlp(G.sgk.odenen)), st("Ay sonunda açık", tlp(G.sgk.acik))]))}</div><!--/sgk-->` : "";
    const kalemKutu = bolum("GİDER · KALEM LİSTESİ", donem,
      tablo("KALEMLER", ["Tarih", "Tür", "Açıklama", "Tedarikçi", "Tutar", "Durum"], G.kalemler.map(k => [tarihHucre(k.tarih), esc(k.tur), esc(k.aciklama), esc(k.tedarikci), tlp(k.tutar), esc(k.durum)]),
        [SOL, SOL, SOL, SOL, R, SOL]) || bosSatir);
      // Spec 0055 R2, R11: koşul içeriğe bakar; kalemsiz ay zaten yukarıda bütün bölümüyle "Bu ayda kayıt yok" satırına iner
      // (G.bos), bu dal savunmadır ve aynı satırı kullanır (boş tablo basılmaz).
    gider = [ozetKutu, turKutu, ekKutu, tedKutu, durumKutu, yasKutu, stopajKutu, sgkKutu, kovaKutu, kdvKutu, yontemKutu, kalemKutu].join("");
  }

  // ── Kasa ──
  const ozetPb = K.bloklar.map(b => {
    const oo = onc?.kasa?.[b.paraBirimi] || { girenK: 0, cikanK: 0, kapanisK: 0 };
    return `${K.bloklar.length > 1 ? altBaslik(esc(b.paraBirimi)) : ""}${stTablo([st("Kasaya giren", kp(b.toplam.girenK, b.paraBirimi) + gaK(kp(oo.girenK, b.paraBirimi))),
      st("Kasadan çıkan", kp(b.toplam.cikanK, b.paraBirimi) + gaK(kp(oo.cikanK, b.paraBirimi))),
      st("Ay sonu toplam bakiye", kp(b.toplam.kapanisK, b.paraBirimi) + gaK(kp(oo.kapanisK, b.paraBirimi)))])}`;
  }).join("");
  const blok = (b) => tablo(K.bloklar.length > 1 ? b.paraBirimi : "NAKİT HAREKETLERİ", ["Hesap", "Tür", "Ay açılışı", "Açılış kaydı", "Giren", "Çıkan", "Kapanış"],
    [...b.satirlar.map(s => [esc(s.ad) + (s.kapali ? " (kapalı)" : ""), esc(s.tur), kp(s.devredenK, b.paraBirimi), s.acilisSatiriK ? kp(s.acilisSatiriK, b.paraBirimi) : "—", kp(s.girenK, b.paraBirimi), kp(s.cikanK, b.paraBirimi), kp(s.kapanisK, b.paraBirimi)]),
      ...(b.satirlar.length > 1 ? [["<b>Toplam</b>", "", `<b>${kp(b.toplam.devredenK, b.paraBirimi)}</b>`, `<b>${kp(b.toplam.acilisSatiriK, b.paraBirimi)}</b>`, `<b>${kp(b.toplam.girenK, b.paraBirimi)}</b>`, `<b>${kp(b.toplam.cikanK, b.paraBirimi)}</b>`, `<b>${kp(b.toplam.kapanisK, b.paraBirimi)}</b>`]] : [])],
    [SOL, SOL, R, R, R, R, R]);
  const oz = K.ozet;
  const kasaOzet = K.bloklar.length ? bolum("KASA · ÖZET", `kapanış ${itibariyla}`, ozetPb) : "";
  const hesapKutu = bolum("KASA · HESAPLAR", `${donem}, kapanış ${itibariyla}`, K.bloklar.length ? K.bloklar.map(blok).join("") : bosSatir);
  const hareketKutu = bolum("KASA · HAREKET ÖZETİ", donem, `
      ${!(oz.odeme.adet + oz.tahsilat.adet + oz.virman.adet + oz.avans.adet + oz.mahsup.adet) ? bosSatir : tablo("HAREKETLER", ["Hareket", "Adet", "Tutar"], [["Ödeme", String(oz.odeme.adet), kp(oz.odeme.tutarK)], ["Tahsilat (hesaba giren)", String(oz.tahsilat.adet), kp(oz.tahsilat.tutarK)],
        ...oz.tahsilat.kaynaklar.map(k => [`&nbsp;&nbsp;${esc(k.ad)}`, String(k.adet), kp(k.tutarK)]),
        ["Virman", String(oz.virman.adet), kp(oz.virman.tutarK)], ["Avans", String(oz.avans.adet), kp(oz.avans.tutarK)], ["Mahsup", String(oz.mahsup.adet), kp(oz.mahsup.tutarK)]], [SOL, R, R])}
      ${not(esc(NOT_MAHSUP))}`);
  // Spec 0059 R10, R14 (AC-11, AC-15, AC-29): yeni tablolar boşsa hiç basılmaz; ikisi de boşsa kutu da basılmaz.
  const odemeTablo = tablo("ÖDEME HAREKETLERİ", ["Tarih", "Hesap", "Yöntem", "Kalem", "Hedef", "Tutar"],
    K.odemeler.map(m => [tarihHucre(m.tarih), m.toplu ? "" : esc(m.hesap), m.toplu ? "" : esc(m.yontem), esc(m.kalem), m.toplu ? "" : esc(m.hedef), m.tamami ? "Tamamı (eski kayıt)" : kp(m.tutarK)]),
    [SOL, SOL, SOL, SOL, SOL, R]);
  const virmanTablo = tablo("VİRMANLAR", ["Tarih", "Kaynak hesap", "Hedef hesap", "Tutar"], K.virmanlar.map(v => [tarihHucre(v.tarih), esc(v.kaynak), esc(v.hedef), kp(v.tutarK, v.paraBirimi)]), [SOL, SOL, SOL, R]);
  const odemeKutu = odemeTablo || virmanTablo ? bolum("KASA · AYIN ÖDEME HAREKETLERİ", donem, odemeTablo + virmanTablo) : "";
  const tahsilatTablo = tablo("TAHSİLATLAR", ["Tarih", "Hesap", "Kaynak", "Firma", "Tutar", "Para birimi"],
    K.tahsilatlar.map(t => [tarihHucre(t.tarih), esc(t.hesap), esc(t.kaynak), esc(t.firma), kp(t.tutarK, t.paraBirimi), esc(t.paraBirimi)]), [SOL, SOL, SOL, SOL, R, SOL]);
  const tahsilatKutu = tahsilatTablo ? bolum("KASA · AYIN TAHSİLAT HAREKETLERİ", `${donem}, yalnız hesaba girenler`, tahsilatTablo) : "";
  const yontemKutu = bolum("KASA · ÖDEME YÖNTEMİ KIRILIMI", "ay içinde yapılan ödeme hareketleri", `
      ${oz.yontemKirilimi.length ? tablo("YÖNTEMLER", ["Yöntem", "Tutar"], [...oz.yontemKirilimi.map(y => [esc(y.ad), kp(y.tutarK)]), ["<b>Toplam</b>", `<b>${kp(oz.odeme.tutarK)}</b>`]], [SOL, R]) : bosSatir}
      ${not(esc(NOT_YONTEM))}`);
  const hesapsizKutu = bolum("KASA · HESABI BELİRTİLMEMİŞ HAREKETLER", donem, `
      ${K.hesapsiz.liste.length ? tablo("ÖDEMELER VE AVANSLAR", ["Tarih", "Kalem", "Tutar"], K.hesapsiz.liste.map(x => [x.tarih ? esc(gun(x.tarih)) : "Ay geneli", esc(x.etiket), x.tamami ? "Tamamı (eski kayıt)" : kp(x.tutarK)]), [SOL, SOL, R]) : bosNot("Hesabı belirtilmemiş ödeme ya da avans yok.")}
      ${K.hesapsiz.tahsilatlar.length ? tablo("HESABI BELİRTİLMEMİŞ TAHSİLATLAR", ["Tarih", "Tahsilat", "Firma", "Tutar"], K.hesapsiz.tahsilatlar.map(x => [esc(gun(x.tarih)), esc(x.ad), esc(x.firma), kp(x.tutarK, x.paraBirimi)]), [SOL, SOL, SOL, R]) : `${altBaslik("HESABI BELİRTİLMEMİŞ TAHSİLATLAR")}${bosNot("Hesabı belirtilmemiş tahsilat yok.")}`}
      ${not(`${esc(NOT_HESAPSIZ)} ${esc(NOT_CIRO)}`)}`);
  // Spec 0059 R12, R38 (AC-13, AC-30): dört satır her zaman; kova listeleri motordan (aynı ay iptal edilen ciro yok).
  const cekTablo = (baslik, l) => tablo(baslik, ["Tarih", "Numara", "Banka", "Vade", "Tutar"], (l || []).map(c => [esc(gun(c.tarih)), esc(c.no), esc(c.banka), c.vade ? esc(gun(c.vade)) : "—", kp(c.tutarK, c.currency)]), [SOL, SOL, SOL, SOL, R]);
  const cekKutu = bolum("KASA · ÇEK PORTFÖYÜ", `elde olan ${itibariyla}, diğerleri ${donem}`, `
      ${stTablo([st("Ay sonunda elde", `${K.cek.elde.adet} adet · ${pbTutarlari(K.cek.elde.tutarK)}`), st("Ay içinde tahsil edilen", `${K.cek.tahsil.adet} adet · ${pbTutarlari(K.cek.tahsil.tutarK)}`),
        st("Ay içinde ciro edilen", `${K.cek.ciro.adet} adet · ${pbTutarlari(K.cek.ciro.tutarK)}`), st("Ay içinde karşılıksız çıkan", `${K.cek.karsiliksiz.adet} adet · ${pbTutarlari(K.cek.karsiliksiz.tutarK)}`)])}
      ${cekTablo("AY İÇİNDE TAHSİL EDİLEN ÇEKLER", K.cek.tahsil.liste)}
      ${cekTablo("AY İÇİNDE CİRO EDİLEN ÇEKLER", K.cek.ciro.liste)}
      ${cekTablo("AY İÇİNDE KARŞILIKSIZ ÇIKAN ÇEKLER", K.cek.karsiliksiz.liste)}
      ${K.cek.gecmisYokAdet ? not(esc(NOT_CEK_GECMISSIZ)) : ""}`);
  // Spec 0060 R13, R33 (AC-15, AC-42): başlık ve "Açık avans toplamı" satırı aynen (sıfırken de basılır); ay içi verilen ve
  // mahsup edilen satırları eklenir.
  const avansKutu = bolum("KASA · AÇIK ÇALIŞAN AVANSI", itibariyla, stTablo([st("Ay içinde verilen", kp(K.avansAy?.verilenK || 0)),
    st("Ay içinde mahsup edilen", kp(K.avansAy?.mahsupK || 0)), st("Açık avans toplamı", kp(K.avansK))]));
  const kasa = [kasaOzet, hesapKutu, hareketKutu, odemeKutu, tahsilatKutu, yontemKutu, hesapsizKutu, cekKutu, avansKutu].join("");

  const firma = r.firma ? Object.fromEntries(Object.entries(r.firma).map(([k, v]) => [k, v == null ? v : esc(v)])) : null;
  return `${belgeAcilis({ title: esc(`${RAPOR_BASLIGI} ${r.ay}`), baslik: esc(RAPOR_BASLIGI), ust: `${esc(r.ayAdi)} dönemi`, donem, factory: firma,
    ekStil: "@media print{body{margin:10mm auto;}}" })}
  ${not(esc(NOT_ANLIK))}
  ${ayrac("GİDER")}${gider}
  ${ayrac("KASA")}
  ${not(esc(NOT_GELIR_DEGIL))}${kasa}
</body></html>`;
};
