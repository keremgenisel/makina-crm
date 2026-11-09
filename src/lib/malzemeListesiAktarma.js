// Spec 0139 B: malzeme listesinden (MALZEME LİSTESİ çalışma kitabı) parça ve model kiti içe aktarma. Saf modül (C3, B-R16): React,
// xlsx paketi, `uid()` ve saat okuması yoktur; kimlik `yeniId` parametresidir, xlsx paketi okuyucuya parametre olarak verilir.
// Bütün kararlar burada (ayrıştırma, biçim, malzeme eşlemesi, model eşlemesi, kit adedi, ad çakışması, atlama nedenleri); ekran
// yalnız gösterir ve `kitleriUygula` ile planı uygular. Araç yalnız parça kataloğuna ve model kitlerine yazar (B-R2); malzeme kartı,
// fiyat, tedarikçi ve stok yazılmaz. 0124'ün parça Excel şablonuna dokunmaz (C4).
import { trLower } from "./utils";
import { kitleriGuncelle, partiAdediCevir, parcaMaliyetKurus, setKatalogu, PARTI_BUYUKLUGU_HATASI } from "./urunAgaci";
import { malzemeKatalogu } from "./malzeme";

// ── Metinler (A-R14) ──────────────────────────────────────────────────────────────────────────────────────────────────────
export const MALZEME_AKTAR_PANEL_ADI = "Malzeme Listesinden Aktar";
export const PANEL_IPUCU = "MALZEME LİSTESİ çalışma kitabının hesap yapan dört sayfasından parça ve model kiti oluşturur. Önce önizleme "
  + "gösterilir; onaylamadan hiçbir şey yazılmaz. Var olan parça güncellenmez, araç ikinci kez çalıştırılabilir. Sunucu PC'de ve başka "
  + "kullanıcı yazmazken çalıştırın.";
export const DOSYA_SEC = "Dosya Seç";
export const AKTAR_DUGMESI = "Parçaları ve Kitleri Yaz";
export const ON_KOSUL_BASLIGI = "Önce bu malzeme kartlarını kurun (Ayarlar › Katalog › Malzemeler):";
export const KAPSAM_DISI_METNI = (n) => `${n} sayfa atlandı (ölçü ve parti verisi yok).`;
export const DOSYA_BUYUK = (mb) => `Dosya çok büyük (en fazla ${mb} MB).`;
export const SATIR_COK = (n) => `Dosyada çok fazla satır var (en fazla ${n.toLocaleString("tr-TR")}).`;
export const DOSYA_OKUNAMADI = "Dosya okunamadı; geçerli bir Excel çalışma kitabı seçin.";
export const SAYFA_YOK = (adlar) => `Beklenen sayfa bulunamadı: ${adlar.join(", ")}. Hiçbir şey yazılmadı.`;
export const PARTI_ETIKETI = (sayfa) => `${sayfa} · parti adedi (makina)`;
export const MODEL_ADET_ETIKETI = (onek) => `${onek} makina adedi`;
export const MODEL_ADET_IPUCU = "Önekli satırın (100_, 120_, 140_, SWP, \"(120 İÇİN)\") kit adedi kendi modelinin makina adedine bölünür. "
  + "Boş bırakılırsa o satırlar kitsiz oluşur ve raporda \"adedi doğrulanmalı\" olarak listelenir.";
export const SONUC_BASLIGI = "Aktarma sonucu";
export const dogrulamaMetni = (d) => `Beklenen ${d.beklenen} kit satırı, bulunan ${d.bulunan}.`;
export const DOGRULAMA_EKSIK_IPUCU = "Kit satırlarının bir kısmı bulunamadı (çakışmada sunucu kopyasına yenilmiş olabilir). Aracı tekrar "
  + "çalıştırın; var olan parçalar ikinci kez oluşmaz, eksik kitleri elle girin.";
export const KILIT_RED = (ad) => `${ad} şu anda başka bir kullanıcıda açık; hiçbir şey yazılmadı.`;
// B-R12, B-R9/2, B-R6/2, X9: önizleme ve sonuç raporunun satırları.
export const RAPOR = Object.freeze({
  parca: (n) => `Oluşacak parça: ${n}`,
  kit: (n) => `Oluşacak kit satırı: ${n} (model varyantı başına)`,
  atlanan: (n) => `Atlanan satır: ${n}`,
  ayniAd: (n, k) => `${n} satır atlandı (aynı adlı parça var); kit satırı da yazılmadı (${k}), kiti elle girin.`,
  maliyetsiz: (n) => `Maliyeti çözülemeyen parça: ${n} (malzemenin fiyatı girilmemiş)`,
  modelsiz: (n) => `Modeli belirlenemeyen satır: ${n} (parça kitsiz oluşur)`,
  dogrulanmali: (n) => `Adedi doğrulanmalı: ${n} (parça kitsiz oluşur)`,
  kesirli: (n) => `Kesirli kit, doğrulanmalı: ${n} (kit yine yazılır)`,
});
export const ONIZLEME_BASLIGI = "Önizleme (henüz hiçbir şey yazılmadı)";
export const SATIR_ETIKETI = (r) => `${r.sayfa} · satır ${r.satirNo} · ${r.ad}`;
export const ATLANAN_SATIR = (r) => `${SATIR_ETIKETI(r)} (${r.neden})`;
export const KESIRLI_SATIR = (r) => `${SATIR_ETIKETI(r)}: kit ${String(r.kit).replace(".", ",")}`;
export const EKSIK_KIT_SATIRI = (e) => `${e.model} · ${e.ad}`;
export const N = Object.freeze({
  ADET_SIFIR: "adet 0 (kaynakta ayrı malzeme alınmıyor)",
  OLCU_OKUNAMADI: "ölçü okunamadı",
  OLCU_TUTARSIZ: "ölçü tutarsız (aynı ölçünün iki hücresi farklı)",
  ADET_OKUNAMADI: "adet okunamadı",
  MALZEME_YOK: "malzeme eşlenemedi",
  AYNI_AD: "aynı adlı parça katalogda var",
});

// ── Kaynağın haritası (Ek 2, Ek 3) ─────────────────────────────────────────────────────────────────────────────────────────
export const PASLANMAZ_CUBUK = "PASLANMAZ 304 ÇUBUK";
export const PASLANMAZ_BORU = "PASLANMAZ 304 BORU";
export const DELRIN_LEVHA = "DELRİN LEVHA";
// B-R11/2, karar 36: hesap yapan dört sayfanın altı malzeme kartı (ön koşul; araç kurmaz).
export const GEREKLI_KARTLAR = [PASLANMAZ_CUBUK, PASLANMAZ_BORU, "POM DELRİN", DELRIN_LEVHA, "POM KESTAMİD", "POM TEFLON"];
const PASLANMAZ_SUTUN = { ad: "C", isaret: "G", olcu: "H", kopya: "I", boy: "K", adet: "Q", not: "R" };
const PLASTIK_SUTUN = { malzeme: "E", ad: "G", olcu: "J", kalinlik: "K", kopya: "M", boy: "O", adet: "U", not: "V" };
export const SAYFALAR = [
  { ad: "AK100_AK120 PASLANMAZ", tur: "paslanmaz", onekler: ["AK100", "AK120"], parti: 70, ilk: 7, son: 37, sutun: PASLANMAZ_SUTUN },
  { ad: "AK140_SWP PASLANMAZ", tur: "paslanmaz", onekler: ["AK140", "SWP140"], parti: 10, ilk: 7, son: 37, sutun: PASLANMAZ_SUTUN },
  { ad: "100_120_PLASTİKLER", tur: "plastik", onekler: ["AK100", "AK120"], parti: 70, ilk: 28, son: 58, sutun: PLASTIK_SUTUN },
  { ad: "AK140_SWP PLASTİKLER", tur: "plastik", onekler: ["AK140", "SWP140"], parti: 10, ilk: 28, son: 58, sutun: PLASTIK_SUTUN },
];
// X9: hesap yapmayan üç sayfa okunmaz.
export const KAPSAM_DISI_SAYFALAR = ["ALÜMİNYUM", "8620 SEMENTE", "1050 İMALAT ÇELİĞİ"];
export const MODEL_ONEKLERI = ["AK100", "AK120", "AK140", "SWP140"];
// Ek 1, B-R10, B-R10/2: adedi uydurulmuş dört satır notundaki gerçek veriden. Boru satırının kit adedi yazılmaz (doğrulanmalı).
export const EK1 = [
  { sayfa: "AK100_AK120 PASLANMAZ", bas: "KONVEYÖR BORUSU", ad: "KONVEYÖR BORUSU", bicim: "boru", olculer: { cap: 19, et: 1.5, boy: 173 }, kart: PASLANMAZ_BORU, kit: null },
  { sayfa: "AK100_AK120 PASLANMAZ", bas: "KAZAN İÇ ÇUBUKLARI", ad: "KAZAN İÇ ÇUBUKLARI", bicim: "lama", olculer: { kalinlik: 10, genislik: 20, boy: 125 }, kart: PASLANMAZ_CUBUK, kit: 2 },
  { sayfa: "AK140_SWP PASLANMAZ", bas: "KONVEYÖR BORUSU", ad: "KONVEYÖR BORUSU", bicim: "boru", olculer: { cap: 19, et: 1.5, boy: 222 }, kart: PASLANMAZ_BORU, kit: null },
  { sayfa: "AK140_SWP PASLANMAZ", bas: "KAZAN İÇ ÇUBUKLARI", ad: "KAZAN İÇ ÇUBUKLARI", bicim: "lama", olculer: { kalinlik: 12, genislik: 20, boy: 155 }, kart: PASLANMAZ_CUBUK, kit: 2 },
];
// Karar 33 (teyit #1): kaynakta öneksiz yazılmış ama 40 + 30 ayrımına göre AK100'e ait iki satır.
export const ONEK_DUZELTMELERI = [
  { sayfa: "AK100_AK120 PASLANMAZ", ad: "PASLANMAZ KALIP MİLİ", onek: "AK100" },
  { sayfa: "100_120_PLASTİKLER", ad: "YAN SIYIRICI GRAMAJ İÇİN", onek: "AK100" },
];
// Karar 31: E sütunu boşken metin anahtar sözcüğü (sıra önemli: DELRİN LEVHA, DELRİN'den önce).
const METIN_KARTLARI = [["kestamit", "POM KESTAMİD"], ["kestamid", "POM KESTAMİD"], ["delrin levha", DELRIN_LEVHA], ["delrin", "POM DELRİN"], ["teflon", "POM TEFLON"]];

// ── Yardımcılar ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const YASAK_ANAHTAR = new Set(["__proto__", "constructor", "prototype"]);
const sutunNo = (harf) => harf.charCodeAt(0) - 65;
const hucre = (satir, harf) => { const v = Array.isArray(satir) ? satir[sutunNo(harf)] : ""; return v == null ? "" : String(v).trim(); };
const kirp = (s) => String(s || "").replace(/\s+/g, " ").trim();
// Karar 39: tek ayırıcılı (nokta ya da virgül) sayı ondalıktır; başka her biçim okunamaz (null).
export const hucreSayisi = (ham) => {
  const t = String(ham ?? "").trim();
  const m = /^(\d+)(?:[.,](\d+))?$/.exec(t);
  return m ? Number(`${m[1]}.${m[2] || "0"}`) : null;
};
const sayiYaz = (n) => String(n).replace(".", ",");

// Karar 38, B-R8/2: baştaki 100/120/140 (alt çizgi ya da boşlukla), SWP (alt çizgi ya da boşlukla) ve "(… İÇİN)" ibaresi silinir.
// İbare ve önek model bilgisidir. Dönüş { ad, onek } (onek null = öneksiz).
export const adTemizle = (ham) => {
  let ad = kirp(ham); let onek = null;
  const icin = /\(\s*(\d{3})\s+(?:İÇİN|İçin|için|ICIN)\s*\)/u.exec(ad);
  if (icin) { onek = `AK${icin[1]}`; ad = kirp(ad.replace(icin[0], " ")); }
  for (;;) {
    const sayi = /^(100|120|140)[_ ]+/.exec(ad);
    if (sayi) { onek = onek || `AK${sayi[1]}`; ad = kirp(ad.slice(sayi[0].length)); continue; }
    const swp = /^SWP[_ ]+/i.exec(ad);
    if (swp) { onek = onek || "SWP140"; ad = kirp(ad.slice(swp[0].length)); continue; }
    break;
  }
  return { ad, onek };
};

// Karar 31: satırın malzeme kartının adı. Plastikte E sütunu; boşsa metin anahtar sözcüğü. Paslanmazda sayfa varsayılanı.
export const malzemeKartAdi = (sayfa, eHucresi, adMetni) => {
  if (sayfa.tur === "paslanmaz") return PASLANMAZ_CUBUK;
  if (eHucresi) return kirp(eHucresi);
  const a = trLower(adMetni || "");
  const m = METIN_KARTLARI.find(([s]) => a.includes(s));
  return m ? m[1] : null;
};

// Ek 3 ve karar 30, 40: satırın biçimi ve ham ölçüleri. Dönüş { bicim, olculer } ya da { neden }.
export const bicimVeOlcu = (sayfa, satir, kartAdi) => {
  const s = sayfa.sutun;
  const boy = hucreSayisi(hucre(satir, s.boy));
  const olcu = hucreSayisi(hucre(satir, s.olcu));
  const kopyaHam = hucre(satir, s.kopya);
  const kopya = kopyaHam === "" ? olcu : hucreSayisi(kopyaHam);
  if (sayfa.tur === "paslanmaz" && hucre(satir, s.isaret) !== "Ø") return { neden: N.OLCU_OKUNAMADI };
  if (!(boy > 0) || !(olcu > 0)) return { neden: N.OLCU_OKUNAMADI };
  if (kopya !== olcu) return { neden: N.OLCU_TUTARSIZ };
  if (sayfa.tur === "plastik" && trLower(kartAdi || "") === trLower(DELRIN_LEVHA)) {
    const kalinlik = hucreSayisi(hucre(satir, s.kalinlik));
    if (!(kalinlik > 0)) return { neden: N.OLCU_OKUNAMADI };
    return { bicim: "sac", olculer: { kalinlik, en: olcu, boy } };
  }
  return { bicim: "mil", olculer: { cap: olcu, boy } };
};

// ── Çalışma kitabının okunması (C5) ─────────────────────────────────────────────────────────────────────────────────────────
export const AZAMI_MB = 20;
export const AZAMI_SATIR = 50000;
// Sayfa adı → satır dizisi. `XLSX` paketi parametredir (modül içe almaz). Biçimlenmiş değer okunur (`raw: false`): formül hücresi
// kendi önbelleklenmiş değerini verir, formül metni yorumlanmaz. Dönüş { sayfalar } ya da { hata }.
export const boyutHatasi = (boyut) => (boyut > AZAMI_MB * 1024 * 1024 ? DOSYA_BUYUK(AZAMI_MB) : null);
// Triyaj (bulgu 1): satır sınırı ÇEVİRMEDEN önce uygulanır. `sheetRows` ayrıştırmayı sınırlar (xlsx gerçek aralığı `!fullref`'e
// yazar); sayfanın bildirdiği aralığın satır sayısı `decode_range` ile okunur ve yalnız EŞLENEN dört sayfa sayılır ve çevrilir.
// Öteki sayfalar (kapsam dışı üç sayfa dahil) çevrilmez, yalnız adları boş diziyle döner (sayfa eşlemesi ve X9 raporu için).
const sayfaSatirSayisi = (XLSX, ws) => {
  const ref = ws["!fullref"] || ws["!ref"];
  if (!ref) return 0;
  try { const r = XLSX.utils.decode_range(ref); return r.e.r - r.s.r + 1; } catch { return Infinity; }
};
const beklenenSayfaMi = (ad) => SAYFALAR.some(s => trLower(kirp(ad)) === trLower(s.ad));
export const calismaKitabiniOku = (XLSX, veri, { boyut = 0 } = {}) => {
  if (boyutHatasi(boyut)) return { hata: boyutHatasi(boyut) };
  let wb;
  try { wb = XLSX.read(veri, { type: "array", cellDates: false, sheetRows: AZAMI_SATIR + 1 }); } catch { return { hata: DOSYA_OKUNAMADI }; }
  if (!wb || !Array.isArray(wb.SheetNames)) return { hata: DOSYA_OKUNAMADI };
  const sayfalar = Object.create(null);
  const okunacak = [];
  let toplam = 0;
  for (const ad of wb.SheetNames) {
    if (typeof ad !== "string" || YASAK_ANAHTAR.has(ad)) continue;
    const ws = wb.Sheets[ad];
    if (!ws) continue;
    if (!beklenenSayfaMi(ad)) { sayfalar[ad] = []; continue; }
    toplam += sayfaSatirSayisi(XLSX, ws);
    if (toplam > AZAMI_SATIR) return { hata: SATIR_COK(AZAMI_SATIR) };
    okunacak.push([ad, ws]);
  }
  for (const [ad, ws] of okunacak) sayfalar[ad] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "", blankrows: true });
  return { sayfalar };
};

// C5, AC-40: sayfa adları trLower ile eşlenir; `__proto__` gibi anahtarlar yok sayılır.
export const sayfaEsle = (sayfalar) => {
  const adlar = sayfalar ? Object.keys(sayfalar).filter(a => !YASAK_ANAHTAR.has(a)) : [];
  const bul = (beklenen) => adlar.find(a => trLower(kirp(a)) === trLower(beklenen)) ?? null;
  const bulunan = SAYFALAR.map(s => ({ sayfa: s, kaynak: bul(s.ad) }));
  return {
    eksik: bulunan.filter(x => !x.kaynak).map(x => x.sayfa.ad),
    bulunan: bulunan.filter(x => x.kaynak),
    kapsamDisi: KAPSAM_DISI_SAYFALAR.filter(a => bul(a)),
  };
};

// ── Satırların okunması ───────────────────────────────────────────────────────────────────────────────────────────────────
// Bir sayfanın satırları: { sayfa, satirNo, hamAd, ad, onek, adet, not, kartAdi, bicim, olculer, ek1, neden }. Ad hücresi boş satır
// şablondur, hiç dönmez.
export const satirlariOku = (sayfa, satirlar) => {
  const s = sayfa.sutun; const cikti = [];
  for (let no = sayfa.ilk; no <= sayfa.son; no++) {
    const satir = satirlar[no - 1];
    const hamAd = hucre(satir, s.ad);
    if (!hamAd) continue;
    const t = adTemizle(hamAd);
    const r = { sayfa: sayfa.ad, satirNo: no, hamAd, ad: t.ad, onek: t.onek, not: hucre(satir, s.not), neden: null };
    const ek1 = EK1.find(e => e.sayfa === sayfa.ad && trLower(t.ad).startsWith(trLower(e.bas)));
    if (ek1) { cikti.push({ ...r, ad: ek1.ad, ek1, kartAdi: ek1.kart, bicim: ek1.bicim, olculer: { ...ek1.olculer }, adet: null }); continue; }
    const duzeltme = !r.onek && ONEK_DUZELTMELERI.find(d => d.sayfa === sayfa.ad && trLower(d.ad) === trLower(t.ad));
    if (duzeltme) r.onek = duzeltme.onek;
    const adetHam = hucre(satir, s.adet);
    const adet = hucreSayisi(adetHam);
    if (adet === 0) { cikti.push({ ...r, neden: N.ADET_SIFIR }); continue; }
    if (adet == null) { cikti.push({ ...r, neden: N.ADET_OKUNAMADI }); continue; }
    r.adet = adet;
    r.kartAdi = malzemeKartAdi(sayfa, s.malzeme ? hucre(satir, s.malzeme) : "", hamAd);
    if (!r.kartAdi) { cikti.push({ ...r, neden: N.MALZEME_YOK }); continue; }
    const b = bicimVeOlcu(sayfa, satir, r.kartAdi);
    if (b.neden) { cikti.push({ ...r, neden: b.neden }); continue; }
    cikti.push({ ...r, bicim: b.bicim, olculer: b.olculer });
  }
  return cikti;
};

// ── Ölçü metni (karar 34'ün ölçü eki) ────────────────────────────────────────────────────────────────────────────────────
export const olcuEki = (bicim, o) => {
  if (bicim === "mil") return `Ø${sayiYaz(o.cap)}×${sayiYaz(o.boy)}`;
  if (bicim === "boru") return `Ø${sayiYaz(o.cap)}×${sayiYaz(o.et)}×${sayiYaz(o.boy)}`;
  if (bicim === "lama") return `${sayiYaz(o.kalinlik)}×${sayiYaz(o.genislik)}×${sayiYaz(o.boy)}`;
  return `${sayiYaz(o.kalinlik)}×${sayiYaz(o.en)}×${sayiYaz(o.boy)}`;
};
const imza = (r) => JSON.stringify([trLower(r.kartAdi), r.bicim, Object.keys(r.olculer).sort().map(k => [k, r.olculer[k]])]);

// ── Plan ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Girdiler (karar 44): { parti: { [sayfa adı]: metin }, modelAdet: { AK100, AK120, AK140, SWP140: metin } }.
export const varsayilanGirdiler = () => ({
  parti: Object.fromEntries(SAYFALAR.map(s => [s.ad, String(s.parti)])),
  modelAdet: Object.fromEntries(MODEL_ONEKLERI.map(o => [o, ""])),
});
// Triyaj (bulgu 4): sayfanın parti adedi `partiAdediCevir`'in kuralıyla (en az 1 tam sayı); geçersizse alanın altında neden ve
// yazma düğmesi pasif (yoksa o sayfanın bütün öneksiz satırları sessizce kitsiz oluşurdu). Dönüş { [sayfa adı]: hata metni }.
export const PARTI_HATASI = PARTI_BUYUKLUGU_HATASI;
export const partiGirdiHatalari = (girdiler) => Object.fromEntries(SAYFALAR
  .filter(s => { const t = String(girdiler?.parti?.[s.ad] ?? "").trim(); return !/^\d+$/.test(t) || Number(t) < 1; })
  .map(s => [s.ad, PARTI_HATASI]));
const canliModeller = (standardModels, customModels) => [...(standardModels || []), ...(customModels || [])].filter(m => m && !m.deletedAt && m.model);
// B-R7: önek eşlemesi (model adı eşlemesi değil): önek → adı o önekle başlayan bütün canlı modeller.
export const onekModelleri = (onek, standardModels, customModels) => canliModeller(standardModels, customModels)
  .map(m => m.model).filter(ad => trLower(ad).startsWith(trLower(onek)));
const tamSayiMi = (n) => Number.isInteger(n);

// Plan. Dönüş { hata } (beklenen sayfa yok) ya da { onKosul, parcalar, kitler, rapor }. `parcalar` yazılacak yeni parça kayıtları;
// `kitler` [{ partId, ad, adetler: { model: n } }] (`kitleriUygula` ile iki model dizisine yazılır); `rapor` sayılar ve listeler.
export const aktarmaPlani = ({ sayfalar, malzemeler = [], parts = [], standardModels = [], customModels = [], girdiler = varsayilanGirdiler(), yeniId }) => {
  const esle = sayfaEsle(sayfalar);
  if (esle.eksik.length) return { hata: SAYFA_YOK(esle.eksik) };
  const satirlar = esle.bulunan.flatMap(({ sayfa, kaynak }) => satirlariOku(sayfa, sayfalar[kaynak] || []));
  const sayfaOf = Object.fromEntries(SAYFALAR.map(s => [s.ad, s]));
  const kartlar = new Map((malzemeler || []).filter(m => m && !m.deletedAt).map(m => [trLower(kirp(m.ad)), m]));
  const gerekli = new Set(GEREKLI_KARTLAR.map(trLower));
  const atlanan = [];
  const onKosul = new Set();
  const gecerli = [];
  for (const r of satirlar) {
    if (r.neden) { atlanan.push({ sayfa: r.sayfa, satirNo: r.satirNo, ad: r.hamAd, neden: r.neden }); continue; }
    const kart = kartlar.get(trLower(r.kartAdi));
    if (!kart) {
      if (gerekli.has(trLower(r.kartAdi))) onKosul.add(GEREKLI_KARTLAR.find(k => trLower(k) === trLower(r.kartAdi)));
      else { atlanan.push({ sayfa: r.sayfa, satirNo: r.satirNo, ad: r.hamAd, neden: `${N.MALZEME_YOK} (${r.kartAdi})` }); continue; }
    }
    gecerli.push({ ...r, malzemeId: kart ? kart.id : null });
  }
  // Kit adedi ve hedef modeller (B-R6, B-R6/2, B-R7, B-R10/2, B-R14).
  const dogrulanmali = []; const kesirli = []; const modelsiz = [];
  for (const r of gecerli) {
    const sayfa = sayfaOf[r.sayfa];
    const onekler = r.onek ? [r.onek] : sayfa.onekler;
    r.onekler = onekler;
    if (r.onek && !sayfa.onekler.includes(r.onek)) { r.hedef = []; modelsiz.push(r); continue; }
    const hedef = onekler.flatMap(o => onekModelleri(o, standardModels, customModels));
    if (!hedef.length) { r.hedef = []; modelsiz.push(r); continue; }
    r.hedef = hedef;
    if (r.ek1) {
      r.kit = r.ek1.kit;
      if (r.kit == null) dogrulanmali.push(r);
      continue;
    }
    const bolen = r.onek ? girdiler?.modelAdet?.[r.onek] : girdiler?.parti?.[r.sayfa];
    const c = partiAdediCevir(r.adet, bolen);
    r.kit = c.hata ? null : c.deger;
    if (r.kit == null) { dogrulanmali.push(r); continue; }
    if (!r.onek && !tamSayiMi(r.kit) && !/MAK[İI]NALIK/iu.test(`${r.not} ${r.hamAd}`)) kesirli.push(r);
  }
  // Karar 34: ad çakışması bütün sayfalar üzerinden.
  const gruplar = new Map();
  for (const r of gecerli) {
    const k = trLower(r.ad);
    if (!gruplar.has(k)) gruplar.set(k, new Map());
    const g = gruplar.get(k); const i = imza(r);
    if (!g.has(i)) g.set(i, []);
    g.get(i).push(r);
  }
  const adaylar = [];
  for (const g of gruplar.values()) {
    const bolumler = [...g.values()];
    const ekler = bolumler.map(rs => [...new Set(rs.flatMap(r => r.onekler))].join("-"));
    bolumler.forEach((rs, i) => {
      const r0 = rs[0];
      let ad = r0.ad;
      if (bolumler.length > 1) {
        const ek = ekler.filter(e => e === ekler[i]).length > 1 ? olcuEki(r0.bicim, r0.olculer) : ekler[i];
        ad = `${r0.ad} (${ek})`;
      }
      adaylar.push({ ad, satirlar: rs });
    });
  }
  // B-R9, B-R9/2: kataloğunda aynı adlı canlı parça varsa satır atlanır, kit satırı da yazılmaz.
  const canliAdlar = new Set((parts || []).filter(p => p && !p.deletedAt).map(p => trLower(kirp(p.ad))));
  const parcalar = []; const kitler = []; const ayniAd = [];
  let atlananKit = 0;
  for (const a of adaylar) {
    const adetler = Object.create(null);
    for (const r of a.satirlar) if (r.kit != null) for (const m of r.hedef) adetler[m] = Number(((adetler[m] || 0) + r.kit).toFixed(3));
    const modelAdlari = Object.keys(adetler);
    if (canliAdlar.has(trLower(a.ad))) { ayniAd.push({ ad: a.ad, satirlar: a.satirlar.length }); atlananKit += modelAdlari.length; continue; }
    const r0 = a.satirlar[0];
    const id = yeniId();
    // Triyaj (bulgu 2): uyumluluk işareti kit OLMASA da hedef modellere yazılır (adedi doğrulanmalı satır, boru). Makina Modelleri
    // kartının parça seçicisi yalnız işaretli parçaları listeler; işaretsiz kitsiz parçanın kiti oradan girilemezdi. Kit yalnız
    // adedi olan modellere yazılır (`kitleriGuncelle` adedi olmayan işaretli modelde kit satırı açmaz).
    const isaret = [...new Set(a.satirlar.flatMap(r => r.hedef || []))];
    parcalar.push({ id, ad: a.ad, models: isaret,
      maliyetKalemleri: [{ tur: "malzeme", malzemeId: r0.malzemeId, bicim: r0.bicim, yontem: "kilo", ...r0.olculer, adet: 1 }] });
    if (modelAdlari.length) kitler.push({ partId: id, ad: a.ad, adetler: { ...adetler } });
    canliAdlar.add(trLower(a.ad));
  }
  // B-R11, AC-37: malzemesinin fiyatı girilmemiş parça oluşur, maliyeti "girilmedi".
  const mk = malzemeKatalogu(malzemeler);
  const sk = setKatalogu(parcalar);
  const maliyetsiz = parcalar.filter(p => parcaMaliyetKurus(p, undefined, sk, mk) == null).length;
  const ozet = (r) => ({ sayfa: r.sayfa, satirNo: r.satirNo, ad: r.hamAd });
  return {
    onKosul: [...onKosul],
    parcalar,
    kitler,
    rapor: {
      kaynakSatir: satirlar.length,
      parca: parcalar.length,
      kit: kitler.reduce((t, k) => t + Object.keys(k.adetler).length, 0),
      atlanan,
      ayniAd,
      atlananKit,
      maliyetsiz,
      modelsiz: modelsiz.map(ozet),
      dogrulanmali: dogrulanmali.map(ozet),
      kesirli: kesirli.map(r => ({ ...ozet(r), kit: r.kit })),
      kapsamDisi: esle.kapsamDisi,
    },
  };
};

// Planın kitlerini bir model dizisine yazar (0087 tek yazma yolu `kitleriGuncelle`, B-R3/4). Değişmeyen dizi aynı referansla döner.
export const kitleriUygula = (modeller, kitler = []) => kitler.reduce((acc, k) => kitleriGuncelle(acc, {
  partId: k.partId, ad: k.ad, models: Object.keys(k.adetler), eskiModeller: [], adetler: k.adetler,
}), modeller);

// B-R13/2, karar 41 (AC-72): doğrulama turu. Beklenen kit satırlarının bugünkü model dizilerinde bulunup bulunmadığı.
export const dogrulamaTuru = (kitler = [], standardModels = [], customModels = []) => {
  const modeller = canliModeller(standardModels, customModels);
  const eksik = [];
  let beklenen = 0; let bulunan = 0;
  for (const k of kitler) for (const [model, miktar] of Object.entries(k.adetler)) {
    beklenen++;
    const m = modeller.find(x => x.model === model);
    const satir = (m?.defaultParcalar || []).find(r => String(r.partId) === String(k.partId));
    if (satir && Number(satir.miktar) === Number(miktar)) bulunan++;
    else eksik.push({ model, ad: k.ad });
  }
  return { beklenen, bulunan, eksik };
};
