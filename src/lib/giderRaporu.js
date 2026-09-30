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
import { hesaplaGiderRaporu, odemeleriUygula, turHaritasi, davranisOf, kalemTutari, odemeDurumu, kdvKarsilastir, ayinSonGunu, tl, kurus, DAVRANIS, PERSONEL_ETIKETI, kalemGorunenAd } from "./gider";
import { odemeHatirlatmalari } from "./odemeHatirlatma";
import { hesaplananKdvAylar } from "./giderKdv";
import { donemYontemKirilimi } from "./odemeYontemi";
import { hesapBakiyeleri, hareketOzeti, hesapsizOdemeler, hesapsizTahsilatlar, avansBorclari, HESAP_TUR_AD } from "./kasa";
import { cekAyOzeti } from "./cek";
import { SATIS_KAYNAK_AD } from "./satisTahsilat";
import { fmtTR, fmtCur } from "./utils";

export const RAPOR_BASLIGI = "Aylık Gider ve Kasa Raporu";
export const NOT_GELIR_DEGIL = "Kasa bölümü nakit hareketlerini gösterir, gelir raporu değildir; Finans'ın Aylık Faaliyet Raporu'ndaki ciroyla toplanmaz.";
export const NOT_YONTEM = "Gider bölümü ayın kalemlerine yapılan ödemeleri, Kasa bölümü ay içinde yapılan ödeme hareketlerini sayar; iki kırılım farklı olabilir.";
export const NOT_ANLIK = "Bu rapor yazdırıldığı andaki veriyle üretilmiştir. Bu aya sonradan kayıt girilir, silinir ya da çöpe atılırsa rakamlar değişir.";
export const NOT_HESAPSIZ = "Hesabı belirtilmemiş hareketler hiçbir hesabın bakiyesine girmez; rapordaki bakiye ile gerçek bakiye arasındaki fark buradan doğabilir. Personel ödemeleri ve çalışan avansları toplu yazılır; ayrıntı Giderler ve Kasa ekranlarındadır.";
export const NOT_MAHSUP = "Mahsup para hareketi değildir, hiçbir bakiyeye girmez.";
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
export const giderKasaRaporu = (girdi = {}, ay, { kalemListesi = true } = {}) => {
  const g = { giderler: [], hareketler: [], turler: [], tedarikciler: [], stock: [], customers: [], hesaplar: [], cekler: [], payments: [],
    services: [], partSales: [], yedekParcaSatislar: [], dealers: [], satisVerisi: {}, kdvSecenek: {}, ...girdi };
  const bas = `${ay}-01`, son = ayinSonGunu(ay);
  const aralik = { baslangic: bas, bitis: son };
  const turMap = turHaritasi(g.turler);
  const tedMap = new Map(g.tedarikciler.map(t => [String(t.id), t]));
  // Q1: ay sonuna kadarki hareketler; kalem ödeme durumu bunlardan türer.
  const hareketlerAySonu = (g.hareketler || []).filter(h => h && (!h.tarih || h.tarih <= son));
  const giderlerAySonu = odemeleriUygula(g.giderler, hareketlerAySonu, turMap);

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
    let kalemler = null;
    if (kalemListesi) {
      const genel = gr.kalemler.filter(k => davranisOf(k, turMap) !== DAVRANIS.PERSONEL)
        .sort((a, b) => String(a.tarih).localeCompare(String(b.tarih)) || Number(a.id) - Number(b.id))
        .map(k => {
          const dav = davranisOf(k, turMap);
          return { tarih: k.tarih, tur: turMap.get(String(k.turId))?.ad || "(türsüz)", aciklama: kalemGorunenAd(k, dav),
            tedarikci: tedMap.get(String(k.tedarikciId))?.ad || "", tutar: kalemTutari(k, dav), durum: DURUM_AD[odemeDurumu(k)] };
        });
      const personel = gr.kalemler.filter(k => davranisOf(k, turMap) === DAVRANIS.PERSONEL);
      if (personel.length) {
        const d = personel.map(odemeDurumu);
        const durum = d.every(x => x === "odendi") ? "odendi" : d.every(x => x === "odenmedi") ? "odenmedi" : "kismen";
        kalemler = [...genel, { tarih: null, tur: PERSONEL_ETIKETI, aciklama: PERSONEL_ETIKETI, tedarikci: "",
          tutar: personel.reduce((a, k) => a + kurus(kalemTutari(k, DAVRANIS.PERSONEL)), 0) / 100, durum: DURUM_AD[durum], personel: true }];
      } else kalemler = genel;
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
      yontem: { satirlar: yontem.satirlar.map(s => ({ ad: s.yontem, tutar: tl(s.tutarK) })), personel: tl(yontem.personelK), toplam: tl(yontem.toplamK) },
      kalemler,
    };
  }

  // ── Kasa bölümü ──
  const veri = { payments: g.payments, services: g.services, partSales: g.partSales, yedekParcaSatislar: g.yedekParcaSatislar,
    customers: g.customers, dealers: g.dealers, factory: g.factory, kdvRates: g.kdvRates, bugun: son };
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
  const hsz = hesapsizOdemeler(g.hareketler, aralik);
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
  const hszTah = hesapsizTahsilatlar(veri, g.hesaplar, aralik);
  let avansK = 0;
  for (const x of avansBorclari(hareketlerAySonu, g.giderler).values()) avansK += x.borcK;
  const kasa = {
    bloklar,
    ozet: { ...ozet, tahsilat: { ...ozet.tahsilat, kaynaklar: Object.entries(ozet.tahsilat.kaynaklar).map(([kaynak, v]) => ({ ad: kaynak === "makina" ? "Makina tahsilatı" : SATIS_KAYNAK_AD[kaynak] || kaynak, ...v })) } },
    hesapsiz: { odemeAdet: hsz.adet, avansAdet: hsz.avansAdet, liste: hesapsizListe,
      tahsilatAdet: hszTah.adet, tahsilatlar: hszTah.liste.map(k => ({ tarih: k.tarih, ad: k.turAdi, firma: k.firma, tutarK: kurus(k.tutar), paraBirimi: k.currency || "TRY" })) },
    cek: cekAyOzeti(g.cekler, g.payments, ay),
    avansK,
  };
  return { ay, ayAdi: ayAdi(ay), bas, son, gider, kasa, kalemListesi };
};

// ── HTML (beyaz kâğıt; C6) ──
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const tlp = (n, pb = "TRY") => esc(fmtCur(Number(n) || 0, pb));
const kp = (k, pb = "TRY") => tlp(tl(k || 0), pb);
const tablo = (basliklar, satirlar, sag = []) => `<table><thead><tr>${basliklar.map((b, i) => `<th${sag.includes(i) ? ' class="r"' : ""}>${esc(b)}</th>`).join("")}</tr></thead><tbody>${satirlar.map(r => `<tr>${r.map((c, i) => `<td${sag.includes(i) ? ' class="r"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
const bosSatir = `<p class="bos">${esc(KAYIT_YOK)}</p>`;
const pbTutarlari = (m) => Object.entries(m || {}).map(([pb, k]) => kp(k, pb)).join(" · ") || kp(0);

export const buildGiderKasaRaporuHtml = (r) => {
  const donem = `${esc(r.ayAdi)} dönemi (${esc(fmtTR(r.bas))} – ${esc(fmtTR(r.son))})`;
  const itibariyla = `${esc(fmtTR(r.son))} itibarıyla`;
  const G = r.gider, K = r.kasa;
  let gider;
  if (G.yururlukOncesi) gider = `<p class="bos">Gider takibi bu aydan sonra yürürlüğe girdi; ${esc(r.ayAdi)} için gider rakamı üretilmez.</p>`;
  else if (G.bos) gider = bosSatir;
  else {
    const o = G.ozet;
    gider = `
      <h3>Özet <small>${donem}</small></h3>
      ${tablo(["Toplam gider", "Ödenen", "Ödenmeyen", "İndirilecek KDV", "Kesilen stopaj"], [[tlp(o.toplam), tlp(o.odenen), tlp(o.odenmeyen), tlp(o.indirilecekKdv), tlp(o.stopaj)]], [0, 1, 2, 3, 4])}
      <h3>Gider türü kırılımı <small>${donem}</small></h3>
      ${tablo(["Tür", "Kalem", "Toplam"], G.turler.map(t => [esc(t.ad), t.adet == null ? "—" : String(t.adet), tlp(t.toplam)]), [1, 2])}
      <h3>Tedarikçi kırılımı <small>harcama dönem, açık borç ${itibariyla}</small></h3>
      ${tablo(["Tedarikçi", "Harcama", "Açık borç"], [...G.tedarikciler.satirlar.map(t => [esc(t.ad), tlp(t.harcama), tlp(t.acikBorc)]),
        ...(G.tedarikciler.secilmemis.adet ? [["Tedarikçi seçilmemiş", tlp(G.tedarikciler.secilmemis.harcama), tlp(G.tedarikciler.secilmemis.acikBorc)]] : []),
        ["<b>Toplam</b>", `<b>${tlp(G.tedarikciler.toplamHarcama)}</b>`, `<b>${tlp(G.tedarikciler.toplamBorc)}</b>`]], [1, 2])}
      <h3>Ödeme durumu <small>${itibariyla}</small></h3>
      ${tablo(["", "Kalem", "Tutar"], [["Vadesi geçmiş", String(G.odemeDurumu.gecmisAdet), tlp(G.odemeDurumu.gecmisTutar)],
        [`Yaklaşan (ay sonundan sonraki ${G.odemeDurumu.esikGun} gün)`, String(G.odemeDurumu.yaklasanAdet), tlp(G.odemeDurumu.yaklasanTutar)]], [1, 2])}
      <h3>Maliyet dağılımı <small>${donem}</small></h3>
      ${tablo(["Makinaya", "Modele", "Dağıtılmayan", "Ortak", "Toplam"], [[tlp(G.kovalar.makina), tlp(G.kovalar.model), tlp(G.kovalar.dagitma), tlp(G.kovalar.ortak), tlp(G.ozet.toplam)]], [0, 1, 2, 3, 4])}
      <h3>KDV karşılaştırması <small>${donem}</small></h3>
      ${tablo(["Hesaplanan satış KDV'si", "İndirilecek gider KDV'si", "Fark"], [[tlp(G.kdv.hesaplananTL), tlp(G.kdv.indirilecek), tlp(G.kdv.fark)]], [0, 1, 2])}
      <h3>Ödeme yöntemi kırılımı <small>ayın kalemlerine yapılan ödemeler</small></h3>
      ${G.yontem.satirlar.length || G.yontem.personel ? tablo(["Yöntem", "Tutar"], [...G.yontem.satirlar.map(s => [esc(s.ad), tlp(s.tutar)]),
        ...(G.yontem.personel ? [["Personel ödemeleri", tlp(G.yontem.personel)]] : []), ["<b>Toplam</b>", `<b>${tlp(G.yontem.toplam)}</b>`]], [1]) : bosSatir}
      ${G.kalemler ? `<h3>Kalem listesi <small>${donem}</small></h3>
      ${tablo(["Tarih", "Tür", "Açıklama", "Tedarikçi", "Tutar", "Durum"], G.kalemler.map(k => [k.tarih ? esc(fmtTR(k.tarih)) : "Ay geneli", esc(k.tur), esc(k.aciklama), esc(k.tedarikci), tlp(k.tutar), esc(k.durum)]), [4])}` : ""}`;
  }
  const blok = (b) => tablo(["Hesap", "Tür", "Ay açılışı", "Açılış kaydı", "Giren", "Çıkan", "Kapanış"],
    [...b.satirlar.map(s => [esc(s.ad) + (s.kapali ? " (kapalı)" : ""), esc(s.tur), kp(s.devredenK, b.paraBirimi), s.acilisSatiriK ? kp(s.acilisSatiriK, b.paraBirimi) : "—", kp(s.girenK, b.paraBirimi), kp(s.cikanK, b.paraBirimi), kp(s.kapanisK, b.paraBirimi)]),
      ...(b.satirlar.length > 1 ? [["<b>Toplam</b>", "", `<b>${kp(b.toplam.devredenK, b.paraBirimi)}</b>`, `<b>${kp(b.toplam.acilisSatiriK, b.paraBirimi)}</b>`, `<b>${kp(b.toplam.girenK, b.paraBirimi)}</b>`, `<b>${kp(b.toplam.cikanK, b.paraBirimi)}</b>`, `<b>${kp(b.toplam.kapanisK, b.paraBirimi)}</b>`]] : [])], [2, 3, 4, 5, 6]);
  const oz = K.ozet;
  const kasa = `
      <h3>Hesaplar: nakit hareketleri <small>${donem}, kapanış ${itibariyla}</small></h3>
      ${K.bloklar.length ? K.bloklar.map(b => (K.bloklar.length > 1 ? `<h4>${esc(b.paraBirimi)}</h4>` : "") + blok(b)).join("") : bosSatir}
      <h3>Hareket özeti <small>${donem}</small></h3>
      ${!(oz.odeme.adet + oz.tahsilat.adet + oz.virman.adet + oz.avans.adet + oz.mahsup.adet) ? bosSatir : tablo(["Hareket", "Adet", "Tutar"], [["Ödeme", String(oz.odeme.adet), kp(oz.odeme.tutarK)], ["Tahsilat (hesaba giren)", String(oz.tahsilat.adet), kp(oz.tahsilat.tutarK)],
        ...oz.tahsilat.kaynaklar.map(k => [`&nbsp;&nbsp;${esc(k.ad)}`, String(k.adet), kp(k.tutarK)]),
        ["Virman", String(oz.virman.adet), kp(oz.virman.tutarK)], ["Avans", String(oz.avans.adet), kp(oz.avans.tutarK)], ["Mahsup", String(oz.mahsup.adet), kp(oz.mahsup.tutarK)]], [1, 2])}
      <p class="not">${esc(NOT_MAHSUP)}</p>
      <h3>Ödeme yöntemi kırılımı <small>ay içinde yapılan ödeme hareketleri</small></h3>
      ${oz.yontemKirilimi.length ? tablo(["Yöntem", "Tutar"], [...oz.yontemKirilimi.map(y => [esc(y.ad), kp(y.tutarK)]), ["<b>Toplam</b>", `<b>${kp(oz.odeme.tutarK)}</b>`]], [1]) : bosSatir}
      <p class="not">${esc(NOT_YONTEM)}</p>
      <h3>Hesabı belirtilmemiş hareketler <small>${donem}</small></h3>
      ${K.hesapsiz.liste.length ? tablo(["Tarih", "Kalem", "Tutar"], K.hesapsiz.liste.map(x => [x.tarih ? esc(fmtTR(x.tarih)) : "Ay geneli", esc(x.etiket), x.tamami ? "Tamamı (eski kayıt)" : kp(x.tutarK)]), [2]) : `<p class="bos">Hesabı belirtilmemiş ödeme ya da avans yok.</p>`}
      <h4>Hesabı belirtilmemiş tahsilatlar</h4>
      ${K.hesapsiz.tahsilatlar.length ? tablo(["Tarih", "Tahsilat", "Firma", "Tutar"], K.hesapsiz.tahsilatlar.map(x => [esc(fmtTR(x.tarih)), esc(x.ad), esc(x.firma), kp(x.tutarK, x.paraBirimi)]), [3]) : `<p class="bos">Hesabı belirtilmemiş tahsilat yok.</p>`}
      <p class="not">${esc(NOT_HESAPSIZ)} ${esc(NOT_CIRO)}</p>
      <h3>Çek portföyü <small>elde olan ${itibariyla}, diğerleri ${donem}</small></h3>
      ${tablo(["", "Adet", "Tutar"], [["Ay sonunda elde", String(K.cek.elde.adet), pbTutarlari(K.cek.elde.tutarK)], ["Ay içinde tahsil edilen", String(K.cek.tahsil.adet), pbTutarlari(K.cek.tahsil.tutarK)],
        ["Ay içinde ciro edilen", String(K.cek.ciro.adet), pbTutarlari(K.cek.ciro.tutarK)], ["Ay içinde karşılıksız çıkan", String(K.cek.karsiliksiz.adet), pbTutarlari(K.cek.karsiliksiz.tutarK)]], [1, 2])}
      ${K.cek.gecmisYokAdet ? `<p class="not">${esc(NOT_CEK_GECMISSIZ)}</p>` : ""}
      <h3>Açık çalışan avansı <small>${itibariyla}</small></h3>
      <p><b>${kp(K.avansK)}</b></p>`;
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(RAPOR_BASLIGI)} ${esc(r.ay)}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;background:#fff;margin:24px;font-size:12px}
  h1{font-size:20px;margin:0 0 4px} h2{font-size:15px;margin:22px 0 6px;border-bottom:2px solid #0f172a;padding-bottom:4px}
  h3{font-size:13px;margin:16px 0 6px} h3 small{font-weight:400;color:#475569;margin-left:6px} h4{font-size:12px;margin:10px 0 4px}
  table{width:100%;border-collapse:collapse;margin-bottom:6px} th,td{border:1px solid #cbd5e1;padding:4px 6px;text-align:left} th{background:#f1f5f9}
  .r{text-align:right;font-variant-numeric:tabular-nums} .bos{color:#475569;font-style:italic} .not{color:#475569;font-size:11px;margin:4px 0}
  .ust{color:#475569} @media print{body{margin:10mm}}
</style></head><body>
  <h1>${esc(RAPOR_BASLIGI)}</h1>
  <div class="ust">${donem}</div>
  <p class="not">${esc(NOT_ANLIK)}</p>
  <h2>Gider</h2>${gider}
  <h2>Kasa</h2>
  <p class="not">${esc(NOT_GELIR_DEGIL)}</p>${kasa}
</body></html>`;
};
