// Spec 0026: genel aramanın gider modülü kuralları (saf; React almaz, ödeme hareketi okumaz).
// GlobalSearch tek useMemo içinde buradaki eşleşmeleri çağırır (R8). Ödeme durumu türetilmiş veridir; bu modül
// odemeleriUygula'yı çağırmaz ve kalemin ödeme alanlarını okumaz (X7, AC-36, AC-37).
import { aramaKelimeleri, kelimelerEslesir, nedenAlani, fmtTR } from "./utils";
import { DAVRANIS, davranisOf, kalemTutari, odenecekTutar, dovizKalemMi, kalemParaBirimi, kalemDovizKurusu, kalemDovizTutarMetni, kurus, tl } from "./gider";
import { paraMetni } from "./kur";
import { tl2 } from "./odemeYontemi"; // gider ekranlarının tutar biçimi
import { HESAP_TUR_AD } from "./kasa";

// ── Sorgu (R16) ──────────────────────────────────────────────────────────────
// Tarih ve tutar eşleşmesi yalnız sorgu rakam ve ayraçtan oluşuyorsa çalışır; metin sorgusu rakam aramasına düşmez.
const SAYISAL = /^[\d\s.,/-]+$/;
const ayracBirlestir = (s) => String(s || "").replace(/[./]/g, "-").replace(/\s+/g, "");

export const aramaSorgusu = (q) => {
  const ham = String(q ?? "").trim();
  const sayisal = SAYISAL.test(ham) && /\d/.test(ham);
  const rakam = sayisal ? ham.replace(/\D/g, "") : "";
  // Tarih: ayraç taşıyan ya da en az dört rakamlı sayısal sorgu (iki rakam her tarihin içinde geçerdi).
  const tarih = sayisal && (/[./-]/.test(ham) || rakam.length >= 4) ? ayracBirlestir(ham) : "";
  // Tutar: virgül ondalık ayracıdır (Türkçe); varsa kuruşlu eşitlik, yoksa tam sayı kısmı eşitliği.
  let tutar = null;
  if (sayisal && rakam) {
    const virgul = ham.lastIndexOf(",");
    tutar = virgul >= 0
      ? { kurus: ham.slice(0, virgul).replace(/\D/g, "") + (ham.slice(virgul + 1).replace(/\D/g, "") + "00").slice(0, 2) }
      : { tam: rakam };
  }
  // Spec 0149 R7/2: metin dalı kelimelere bölünür (sayısal sorguda da); tarih ve tutar dalları ham sorguyla kalır.
  // Eski tek parça `metin` alanı kalktı (triyaj): eşleşme yalnız `kelimeler` üzerinden.
  return { ham, kelimeler: aramaKelimeleri(ham), sayisal, tarih, tutar };
};

// Spec 0149 R2, R2/2: metin eşleşmesi KAYIT düzeyindedir: her kelime değerlerin birinde geçer. Tek değer de verilebilir.
export const metinEslesir = (degerler, s) => !!s.kelimeler?.length && kelimelerEslesir(s.kelimeler, Array.isArray(degerler) ? degerler : [degerler]);
// Kayıt düzeyinde metin eşleşmesi ve neden satırı (R2/2, R2/3): `baslik` bugün nedensiz geçen alanlar, `alanlar`
// [[etiket, deger], ...] bugünkü sırayla; neden başlıkta geçmeyen kelimeyi taşıyan ilk alan, başlık hepsini taşıyorsa null.
const kayitMetinEslesmesi = (s, baslik, alanlar) => {
  if (!metinEslesir([...baslik, ...alanlar.map(a => a[1])], s)) return null;
  const n = nedenAlani(s.kelimeler, baslik, alanlar);
  return { neden: n ? `${n.etiket}: ${n.deger}` : null };
};

// ISO tarih (YYYY-AA-GG) ya da ay (YYYY-AA): ayraçlar birleştirilerek karşılaştırılır ("15.03.2026", "15/03/2026",
// "2026-03-15" aynı). Aday sorgunun biçimine göre TEK: dört haneli yılla başlayan sorgu ISO'da, diğeri ekrandaki fmtTR
// biçiminde (GG/AA/YYYY, AA/YYYY) aranır. İkisi birden aranırsa gün ve ay ters sırada durduğu için kısmi "10.03"
// (10 Mart) ISO'da "-10-03" olarak 3 Ekim'i de bulurdu (triyaj).
export const tarihEslesir = (iso, s) => {
  if (!s.tarih || !iso) return false;
  const p = String(iso).split("-");
  const aday = /^\d{4}/.test(s.tarih) ? String(iso) : p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : p.length === 2 ? `${p[1]}/${p[0]}` : "";
  return !!aday && ayracBirlestir(aday).includes(s.tarih);
};

// Tutar eşitliği (içerme değil): "20.000" 20000'i bulur, 120000'i bulmaz (R16, AC-39).
export const tutarEslesir = (sayi, s) => {
  if (!s.tutar || sayi == null || sayi === "") return false;
  const n = Math.abs(Number(sayi));
  if (!Number.isFinite(n)) return false;
  if (s.tutar.kurus != null) return String(Math.round(n * 100)) === String(Number(s.tutar.kurus));
  return String(Math.trunc(n)) === String(Number(s.tutar.tam));
};

// ── Personel (R2, R19) ───────────────────────────────────────────────────────
// Türünün davranışı personel YA DA calisanId dolu: türü silinmiş/değişmiş personel kalemi "normal"e düşüp sızmasın.
export const personelMi = (kayit, turMap) =>
  davranisOf(kayit, turMap) === DAVRANIS.PERSONEL || (kayit?.calisanId != null && kayit.calisanId !== "");

// ── Eşleşmeler: null = eşleşmedi; { neden } = eşleşti (neden null ise başlıkta görünen alandan) ──────────
const ilk = (adaylar) => {
  for (const [esti, neden] of adaylar) if (esti) return { neden };
  return null;
};

export const kalemBasligi = (k, turMap) => k.aciklama || turMap?.get(String(k.turId))?.ad || "Gider";

// Yürürlük öncesi tarihli kalem hiçbir hesaba ve listeye girmez (borç özeti, Dönem Raporu); tıklanınca görünmeyeceği
// için aramada da çıkmaz (triyaj, TY kararı; eşik borcKapsamindaMi ile aynı: `YYYY-AA-01`).
// Alanlar sırayla ve tembel denenir: ilk eşleşmede durur, tutar yalnız sayısal sorguda hesaplanır (triyaj).
export const kalemEslesmesi = (k, s, { turMap, tedMap, yururlukAy = null }) => {
  if (!k || k.deletedAt || personelMi(k, turMap)) return null;
  if (yururlukAy && k.tarih && k.tarih < `${yururlukAy}-01`) return null;
  const tur = turMap?.get(String(k.turId))?.ad || "";
  const ted = tedMap?.get(String(k.tedarikciId))?.ad || "";
  const metin = kayitMetinEslesmesi(s, [kalemBasligi(k, turMap), k.aciklama], [["tür", tur], ["tedarikçi", ted]]);
  if (metin) return metin;
  if (s.tarih) {
    if (tarihEslesir(k.tarih, s)) return { neden: `tarih: ${fmtTR(k.tarih)}` };
    const vade = (k.taksitler || []).find(t => tarihEslesir(t.vade, s));
    if (vade) return { neden: `taksit vadesi: ${fmtTR(vade.vade)}` };
  }
  if (s.tutar) {
    const dav = davranisOf(k, turMap);
    // Spec 0153 R12/2 (Karar 17): döviz kalemde faturanın kendi rakamı (KDV hariç döviz tutar ve döviz ödenecek) adaydır;
    // neden kalemin para birimiyle yazılır. Lira karşılığı aramayı bulmaya devam eder (eski davranış).
    if (dovizKalemMi(k)) {
      const pb = kalemParaBirimi(k);
      for (const d of [Number(k.dovizTutar), tl(kalemDovizKurusu(k, kurus(odenecekTutar(k, dav))))]) if (tutarEslesir(d, s)) return { neden: `tutar: ${paraMetni(d, pb)}` };
    }
    for (const hesap of [kalemTutari, odenecekTutar]) {
      const t = hesap(k, dav);
      if (tutarEslesir(t, s)) return { neden: `tutar: ${tl2(t)}${dovizKalemMi(k) ? ` (${kalemDovizTutarMetni(k)})` : ""}` };
    }
  }
  return null;
};
export const kalemMeta = (k, { turMap, tedMap }) => {
  const dav = davranisOf(k, turMap);
  return [k.aciklama && turMap?.get(String(k.turId))?.ad, tedMap?.get(String(k.tedarikciId))?.ad, k.tarih && fmtTR(k.tarih),
    dovizKalemMi(k) ? `${kalemDovizTutarMetni(k)} · ${tl2(kalemTutari(k, dav))}` : tl2(kalemTutari(k, dav))]; // spec 0153 R12/2
};

// Tedarikçi: ad, yetkili, telefon, vergi no (R9); e-posta, adres, not aranmaz.
export const tedarikciEslesmesi = (t, s) => (!t || t.deletedAt ? null
  : kayitMetinEslesmesi(s, [t.ad], [["yetkili", t.yetkili], ["telefon", t.telefon], ["vergi no", t.vergiNo]]));

// Tekrarlayan tanım: ad, tür, tedarikçi; personel tanımı hiç (R2, R19).
export const tanimEslesmesi = (t, s, { turMap, tedMap }) => {
  if (!t || personelMi(t, turMap)) return null;
  const tur = turMap?.get(String(t.turId))?.ad || "";
  const ted = tedMap?.get(String(t.tedarikciId))?.ad || "";
  return kayitMetinEslesmesi(s, [t.ad], [["tür", tur], ["tedarikçi", ted]]);
};

// Üretim partisi: ad, açıklama, dönem (R5, AC-16).
// Spec 0149 R7/3: dönem ayı metin dalında kelime kuralıyla, tarih dalında tek alanda ve ham sorguyla aranır.
export const partiEslesmesi = (p, s) => (!p || p.deletedAt ? null
  : kayitMetinEslesmesi(s, [p.ad], [["açıklama", p.aciklama], ["başlangıç", p.baslangicAy], ["bitiş", p.bitisAy]]) || ilk([
    [tarihEslesir(p.baslangicAy, s), `başlangıç: ${p.baslangicAy}`],
    [tarihEslesir(p.bitisAy, s), `bitiş: ${p.bitisAy}`],
  ]));

// Kasa hesabı: ad (R5, AC-17); kapalı hesap da aranır ve "kapalı" ibaresi taşır (R11).
export const hesapEslesmesi = (h, s) => (h && metinEslesir([h.ad], s) ? { neden: null } : null);
export const hesapMeta = (h) => [HESAP_TUR_AD[h.tur] || h.tur, h.paraBirimi, h.kapali && "kapalı"];

// Çek: no, banka, keşideci; alacaklı adı yalnız alacaklı çalışan değilken (R13, AC-26).
export const cekAlacaklisi = (c) => (c?.alacakliTur === "calisan" ? "" : (c?.alacakliAd || ""));
export const cekEslesmesi = (c, s) => (!c || c.deletedAt ? null // spec 0078 R36: çöpteki çek aranmaz
  : kayitMetinEslesmesi(s, [c.no, c.banka], [["keşideci", c.kesideci], ["alacaklı", cekAlacaklisi(c)]]));
// Durum ve vade yazılmaz (R20): verilen çekin "Ödendi" durumu bir ödeme durumudur (AC-37).
export const cekMeta = (c) => {
  const verilen = c.yon === "verilen";
  return [verilen ? "Verilen çek" : "Alınan çek", c.banka, verilen ? (cekAlacaklisi(c) && `Alacaklı: ${cekAlacaklisi(c)}`) : (c.kesideci && `Keşideci: ${c.kesideci}`)];
};
