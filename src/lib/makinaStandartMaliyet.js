// Spec 0088: Makina Maliyet Hesabı, ileriye dönük STANDART maliyet. Saf motor (React ve zaman okumaz; "bugün" parametredir).
//
// Bugünkü maliyet modeli (`makinaMaliyeti.js`, 0001 · 0002 · 0022) gerçekleşen gider kayıtlarını makinaya DAĞITIR; bu motor
// tersten gider: ürün ağacı (0087: parça alış maliyeti × kit adedi + ek maliyet kalemleri) + genel gider payı (dönem havuzu ÷
// varsayılan üretim adedi) × kâr katsayısı. İkisi aynı soruyu cevaplamaz ve TOPLANMAZ; eski model 0089'a kadar yerinde durur.
//
// Kurallar: hesabın tamamı kuruş tamsayısıdır (R25/2); makina başına pay Math.floor ile, artık kuruş dağıtılmaz. Dönem havuzu
// gider motorunun tür kırılımından okunur, ikinci bir süzme ya da toplama yazılmaz (C2). Gider türünün maliyet ROLÜ
// (`maliyetRolu`) ile DAVRANIŞI (`davranis`) ayrı kavramlardır (C15): rol maliyete girişi, davranış kira/personel/SGK alanlarını
// belirler. Personel çalışan ayrıntısı bu motordan geçmez (R26, C3).
import { kurus, tl, ayEkle, ayOf, ayinSonGunu, hesaplaGiderRaporu, turHaritasi, DAVRANIS, tutarCoz } from "./gider";
import { partiAylari, canliPartiler } from "./uretimPartisi";
import { makinaListesi, satisKurBilgisi, katDegeriDogrula } from "./makinaMaliyeti";
import { gercekSatisBedeli, trLower } from "./utils";

// ── Rol ──────────────────────────────────────────────────────────────────────
export const MALIYET_ROLU = { URUN_AGACI: "urunAgaci", GENEL: "genel", YOK: "yok" };
export const MALIYET_ROLLERI = [MALIYET_ROLU.URUN_AGACI, MALIYET_ROLU.GENEL, MALIYET_ROLU.YOK];
export const MALIYET_ROLU_ETIKET = {
  urunAgaci: "Ürün ağacından gelir",
  genel: "Genel gidere girer",
  yok: "Maliyete girmez",
};
// R6: rolü verilmemiş tür "maliyete girmez" sayılır.
export const maliyetRoluOf = (tur) => (MALIYET_ROLLERI.includes(tur?.maliyetRolu) ? tur.maliyetRolu : MALIYET_ROLU.YOK);
export const rolBelirtildiMi = (tur) => MALIYET_ROLLERI.includes(tur?.maliyetRolu);
// R5/2 (AC-47): personel, kira ve SGK ürün ağacında yoktur; seçim maliyeti sessizce eksiltir. Uyarı, engel değil.
export const ROL_DAVRANIS_UYARISI = "Bu tür (personel, kira ya da SGK) ürün ağacında yoktur; \"Ürün ağacından gelir\" seçilirse tutarı hiçbir hesaba girmez.";
// Normal dışı her davranış (personel, kira, SGK) ürün ağacında yoktur; SGK'ya özel dal yazılmaz (0074 AC-45 tek kapı kuralı).
export const rolDavranisUyarisi = (tur, rol = maliyetRoluOf(tur)) =>
  rol === MALIYET_ROLU.URUN_AGACI && (tur?.davranis || DAVRANIS.NORMAL) !== DAVRANIS.NORMAL ? ROL_DAVRANIS_UYARISI : null;
// R30 (AC-17): tür silinirken kalemler hedef türe taşınır; roller farklıysa havuz değişir.
export const rolFarkiUyarisi = (kaynak, hedef) => {
  const a = maliyetRoluOf(kaynak), b = maliyetRoluOf(hedef);
  return a === b ? null
    : `Kalemler "${MALIYET_ROLU_ETIKET[a]}" rolünden "${MALIYET_ROLU_ETIKET[b]}" rolüne geçer; Makina Maliyeti ekranındaki genel gider havuzu değişir.`;
};
// R5 yazımı: tür kaydında yalnız `maliyetRolu` değişir; "maliyete girmez" açıkça seçilebilir, boş seçim alanı siler (C8).
export const turRoluYaz = (turler, turId, rol) => (turler || []).map(t => {
  if (String(t.id) !== String(turId)) return t;
  if (!MALIYET_ROLLERI.includes(rol)) { const { maliyetRolu: _r, ...geri } = t; return geri; }
  return { ...t, maliyetRolu: rol };
});

// ── Hesap ayarları ───────────────────────────────────────────────────────────
export const ADET_MAX = 10000;
export const ADET_HATASI = `Varsayılan üretim adedi 1 ile ${ADET_MAX} arasında tam sayı olmalı.`;
export const DONEM_SIRA_HATASI = "Dönemin başlangıcı bitişten sonra olamaz.";
export const DONEM_EKSIK_HATASI = "Dönemin başlangıç ve bitiş ayı girilmeli.";
const AY_DESENI = /^\d{4}-(0[1-9]|1[0-2])$/;
export const ayAdedi = (bas, bit) => {
  if (!AY_DESENI.test(bas || "") || !AY_DESENI.test(bit || "")) return 0;
  return (Number(bit.slice(0, 4)) - Number(bas.slice(0, 4))) * 12 + Number(bit.slice(5)) - Number(bas.slice(5)) + 1;
};
// R8/3 (AC-13, AC-14): dönem ay–ay, varsayılan adet 1–10000 tam sayı (dönemin TOPLAM adedi, R8/2).
export const maliyetAyarDogrula = ({ baslangicAy, bitisAy, varsayilanAdet } = {}) => {
  const hatalar = {};
  if (!AY_DESENI.test(baslangicAy || "") || !AY_DESENI.test(bitisAy || "")) hatalar.donem = DONEM_EKSIK_HATASI;
  else if (baslangicAy > bitisAy) hatalar.donem = DONEM_SIRA_HATASI;
  const t = String(varsayilanAdet ?? "").trim();
  if (!/^\d+$/.test(t) || Number(t) < 1 || Number(t) > ADET_MAX) hatalar.adet = ADET_HATASI;
  const gecerli = Object.keys(hatalar).length === 0;
  return { hatalar, gecerli, deger: gecerli ? { baslangicAy, bitisAy, varsayilanAdet: Number(t) } : null };
};
// R8/3 (AC-14/2): öneri son on iki TAM ay (içinde bulunulan ay hariç); gösterilir, kendiliğinden yazılmaz.
export const donemOnerisi = (bugun) => {
  const bitisAy = ayEkle(String(bugun).slice(0, 7), -1);
  return { baslangicAy: ayEkle(bitisAy, -11), bitisAy };
};
// R8/2 (AC-13/2): "≈ n makina/ay", bir ondalık.
export const aylikKarsilik = (ayarlar) => {
  const n = ayAdedi(ayarlar?.baslangicAy, ayarlar?.bitisAy);
  return n > 0 && Number(ayarlar?.varsayilanAdet) > 0 ? Math.round((Number(ayarlar.varsayilanAdet) / n) * 10) / 10 : null;
};

// ── Kâr katsayısı ve liste fiyatı (model alanları) ───────────────────────────
// R14/2 (AC-22/2): virgüllü ondalık, en çok beş ondalık; değer kuralı bugünkü KAT yönteminin aynısı (`katDegeriDogrula`).
export const KATSAYI_BICIM_HATASI = "Katsayı en çok beş ondalıklı bir sayı olmalı (ör. 2,19498).";
export const katsayiDogrula = (ham) => {
  const t = String(ham ?? "").trim();
  if (!t) return { bos: true, deger: null, hata: null, uyari: null };
  if (!/^-?\d+([.,]\d{1,5})?$/.test(t)) return { bos: false, deger: null, hata: KATSAYI_BICIM_HATASI, uyari: null };
  const d = Number(t.replace(",", "."));
  const k = katDegeriDogrula(d);
  return { bos: false, deger: k.hata ? null : d, hata: k.hata, uyari: k.uyari };
};
export const KALIP_FIYAT_HATASI = "Extra Kalıp liste fiyatı sıfır ya da daha büyük bir tutar olmalı.";
// R15: model başına tek TL liste fiyatı, KDV hariç; boş = girilmedi.
export const kalipFiyatDogrula = (ham) => {
  const r = tutarCoz(ham);
  if (r.bos) return { bos: true, deger: null, hata: null };
  if (r.gecersiz || r.deger < 0) return { bos: false, deger: null, hata: KALIP_FIYAT_HATASI };
  return { bos: false, deger: Math.round(r.deger * 100) / 100, hata: null };
};
// C8: boş değer kayıttan SİLİNİR (gövde spec öncesiyle aynı kalsın); yalnız iki alan değişir.
export const modelFiyatAlanlariYaz = (m, { karKatsayisi = null, kalipListeFiyati = null } = {}) => {
  const { karKatsayisi: _k, kalipListeFiyati: _f, ...geri } = m;
  return { ...geri, ...(karKatsayisi == null ? {} : { karKatsayisi }), ...(kalipListeFiyati == null ? {} : { kalipListeFiyati }) };
};
// R18, C8: planlanan adetler { model: adet }; boş ya da sıfır girilen model listeden çıkar, liste boşsa alan silinir.
export const planAdetleriYaz = (parti, adetler = {}) => {
  const temiz = Object.fromEntries(Object.entries(adetler).filter(([, n]) => Number(n) > 0).map(([m, n]) => [m, Number(n)]));
  const { planlananAdetler: _p, ...geri } = parti;
  return Object.keys(temiz).length ? { ...geri, planlananAdetler: temiz } : geri;
};

// ── Genel gider havuzu (R8, R10, C2) ─────────────────────────────────────────
// Dönem havuzu gider motorunun TÜR KIRILIMINDAN okunur (tutar `kalemGiderTutari` tabanı: matrah + indirilemeyen KDV, 0076).
// Türsüz kalemler (turId tanımsız) hiçbir havuza girmez, yalnız sayılır (R6/2). Yürürlük öncesi dönem boş döner (C2/2).
const donemAraligi = (bas, bit) => ({ baslangic: `${bas}-01`, bitis: ayinSonGunu(bit) });
const turKirilimiOku = (veri, bas, bit, bugun) => {
  const rapor = hesaplaGiderRaporu({ giderler: veri.giderler || [], turler: veri.giderTurleri || [], tedarikciler: veri.tedarikciler || [],
    stock: veri.stock || [], customers: veri.customers || [], yururlukAy: veri.yururlukAy || null }, donemAraligi(bas, bit), { bugun });
  return rapor.yururlukOncesi ? { yururlukOncesi: true, turKirilimi: [] } : { yururlukOncesi: false, turKirilimi: rapor.turKirilimi || [] };
};
export const rolOzeti = (giderTurleri = []) => {
  const canli = (giderTurleri || []).filter(t => !t.deletedAt);
  return {
    rolsuzTurSayisi: canli.filter(t => !rolBelirtildiMi(t)).length,
    genelTurSayisi: canli.filter(t => maliyetRoluOf(t) === MALIYET_ROLU.GENEL).length,
    urunAgaciTurSayisi: canli.filter(t => maliyetRoluOf(t) === MALIYET_ROLU.URUN_AGACI).length,
  };
};
export const rolHavuzlari = (veri, bas, bit, bugun) => {
  const turMap = turHaritasi(veri.giderTurleri || []); // ham: çöpteki türün kalemi de türüyle okunur (0078 C2)
  const { yururlukOncesi, turKirilimi } = turKirilimiOku(veri, bas, bit, bugun);
  const satirlar = []; let tursuzAdet = 0;
  const toplam = { urunAgaci: 0, genel: 0, yok: 0 };
  for (const r of turKirilimi) {
    if (r.turId == null || !turMap.has(String(r.turId))) { tursuzAdet += r.adet; continue; }
    const rol = maliyetRoluOf(turMap.get(String(r.turId)));
    const toplamK = kurus(r.toplam);
    toplam[rol] += toplamK;
    // R26, C3: personel türü tek satır; `calisanlar` kopyalanmaz.
    satirlar.push({ turId: r.turId, ad: r.ad, rol, toplamK, adet: r.adet });
  }
  return { yururlukOncesi, satirlar, tursuzAdet, urunAgaciK: toplam.urunAgaci, genelK: toplam.genel, yokK: toplam.yok };
};

// ── Makina başına pay ve gerçek üretim adedi (R8, R9) ────────────────────────
// Durum: "tamam" | "ayarsiz" (dönem/adet girilmemiş ya da geçersiz) | "yururlukOncesi" | "rolYok" (hiçbir türün rolü genel değil).
export const genelGiderPayi = (veri, ayarlar, bugun) => {
  const d = maliyetAyarDogrula(ayarlar || {});
  const roller = rolOzeti(veri.giderTurleri);
  if (!d.gecerli) return { durum: "ayarsiz", payK: 0, havuzK: 0, ayarHatalari: d.hatalar, roller, havuz: null };
  const { baslangicAy, bitisAy, varsayilanAdet } = d.deger;
  const havuz = rolHavuzlari(veri, baslangicAy, bitisAy, bugun);
  // Triyaj (bulgu 2): durum havuzdan türer. Havuz ham tür haritasıyla kurulur (0078 C2: çöpteki türün kalemi türüyle okunur);
  // canlı genel türü olmayan ama havuzu dolu (çöpteki genel türün kalemi) veride "rolYok" yazılıp pay binmesi çelişkiydi.
  const durum = havuz.yururlukOncesi ? "yururlukOncesi" : (havuz.genelK === 0 && roller.genelTurSayisi === 0) ? "rolYok" : "tamam";
  const havuzK = havuz.genelK;
  return { durum, havuzK, payK: Math.floor(havuzK / varsayilanAdet), varsayilanAdet, baslangicAy, bitisAy, ayarHatalari: {}, roller, havuz,
    aylik: aylikKarsilik(d.deger) };
};
// R9/2 (AC-15/2–4): gerçek adedin kümesi canlı stok + canlı müşteri makinaları, üretim tarihi dönem içinde; partili olup
// olmadığına bakılmaz. Üretim tarihi çözümü TEK zincirden: `makinaMaliyeti.makinaListesi` (R9/3, AC-49).
// Spec 0091 R25, R25/3, R27 (C12): model kırılımı YALNIZ seçenekle istenir; seçeneksiz çıktı birebir eskisidir.
// `{ modelKirilimi: true, katalog }` → `modelAdetleri` (dönemde üretilen adet, anahtar makinanın Türkçe küçültülmüş modeli,
// C14b) ve `modelYokAdet` (modeli kataloğun hiçbir satırıyla eşleşmeyen dönem makinası). Dönem tanımsızken ikisi de null (R16).
export const gercekUretim = ({ customers = [], stock = [], partStockLog = [] } = {}, ayarlar, havuzK = 0, secenek = null) => {
  const d = maliyetAyarDogrula(ayarlar || {});
  const liste = makinaListesi({ customers, stock, partStockLog });
  const cozulemeyen = liste.filter(m => !m.uretimTarihi).length;
  const kirilim = (donemdekiler) => {
    if (!secenek?.modelKirilimi) return {};
    if (!donemdekiler) return { modelAdetleri: null, modelYokAdet: null };
    const katalog = new Set((secenek.katalog || []).map(ad => trLower(ad || "")));
    const modelAdetleri = {};
    let modelYokAdet = 0;
    for (const m of donemdekiler) {
      if (!katalog.has(m.modelKey)) { modelYokAdet++; continue; }
      modelAdetleri[m.modelKey] = (modelAdetleri[m.modelKey] || 0) + 1;
    }
    return { modelAdetleri, modelYokAdet };
  };
  if (!d.gecerli) return { adet: 0, cozulemeyen, payK: null, neden: "ayarsiz", ...kirilim(null) };
  const { baslangic, bitis } = donemAraligi(d.deger.baslangicAy, d.deger.bitisAy);
  const donemdekiler = liste.filter(m => m.uretimTarihi && m.uretimTarihi >= baslangic && m.uretimTarihi <= bitis);
  const adet = donemdekiler.length;
  if (adet === 0) return { adet, cozulemeyen, payK: null, neden: "uretimYok", ...kirilim(donemdekiler) };
  return { adet, cozulemeyen, payK: Math.floor(havuzK / adet), neden: null, ...kirilim(donemdekiler) };
};

// ── Model maliyeti (R11–R16) ─────────────────────────────────────────────────
const parcaHaritasi = (parts = []) => new Map((parts || []).filter(p => !p.deletedAt).map(p => [String(p.id), p]));
const oneriKurus = (toplamK, katsayi) => (Number(katsayi) > 0 ? Math.round(toplamK * Number(katsayi)) : null);
export const modelMaliyeti = (model, partMap, payK = 0) => {
  const kit = (model.defaultParcalar || []).map(r => {
    const p = partMap.get(String(r.partId));
    const adet = Number(r.miktar) || 0;
    if (!p) return { partId: r.partId, ad: r.ad || "", adet, birimK: null, satirK: 0, eksik: true, neden: "parcaYok" };
    if (p.maliyet == null || p.maliyet === "") return { partId: r.partId, ad: p.ad, adet, birimK: null, satirK: 0, eksik: true, neden: "maliyetYok" };
    const birimK = kurus(p.maliyet);
    return { partId: r.partId, ad: p.ad, adet, birimK, satirK: birimK * adet, eksik: false, neden: null };
  });
  const ek = (model.ekMaliyetler || []).map(k => ({ ad: k.ad, tutarK: kurus(k.tutar) }));
  const direktK = kit.reduce((a, r) => a + r.satirK, 0) + ek.reduce((a, k) => a + k.tutarK, 0);
  const toplamK = direktK + payK;
  const katsayi = Number(model.karKatsayisi) > 0 ? Number(model.karKatsayisi) : null;
  return {
    model: model.model, kit, ek, kitBos: kit.length === 0 && ek.length === 0, eksikSayisi: kit.filter(r => r.eksik).length,
    direktK, payK, toplamK, katsayi, oneriK: oneriKurus(toplamK, katsayi),
    kalipListeK: model.kalipListeFiyati == null || model.kalipListeFiyati === "" ? null : kurus(model.kalipListeFiyati),
  };
};
// R16, AC-25: bütün canlı modeller (önce standart, sonra özel).
// Spec 0091 R25/2, R26 (C6): seçenek verilince her satır işaretini (`uretimde`), dönem adedini (`donemAdet`), adet nedenini
// (`adetNeden`: null | "ayarsiz") ve işaret durumunu (`isaret`: null | "eskimis" | "yanlis") taşır; hesap bütün canlı
// modeller içindir, hangi satırın çizileceğine ekran karar verir. Seçeneksiz çıktı birebir eskisidir (AC-41).
export const MODEL_ISARET = { ESKIMIS: "eskimis", YANLIS: "yanlis" };
export const modelMaliyetleri = ({ standardModels = [], customModels = [], parts = [] } = {}, payK = 0, secenek = null) => {
  const partMap = parcaHaritasi(parts);
  const satirlar = [...standardModels, ...customModels].filter(m => m && !m.deletedAt).map(m => modelMaliyeti(m, partMap, payK));
  if (!secenek) return satirlar;
  const disi = new Set(secenek.uretimdeDisi || []);
  const adetler = secenek.uretim?.modelAdetleri || null;
  const ayarsiz = !adetler;
  return satirlar.map(m => {
    const uretimde = !disi.has(m.model); // R24/3: birebir
    const donemAdet = ayarsiz ? null : (adetler[trLower(m.model)] || 0); // C14b: makina eşlemesi Türkçe küçültmeyle
    const isaret = donemAdet == null ? null
      : uretimde && donemAdet === 0 ? MODEL_ISARET.ESKIMIS
      : !uretimde && donemAdet > 0 ? MODEL_ISARET.YANLIS : null;
    return { ...m, uretimde, donemAdet, adetNeden: ayarsiz ? "ayarsiz" : null, isaret };
  });
};
// R26/2 (K4): sayı satırının üç sayısı motordan; ekran sayım yapmaz (C7).
export const modelSayilari = (satirlar = []) => {
  const uretimde = satirlar.filter(m => m.uretimde !== false).length;
  return { tanimli: satirlar.length, uretimde, uretimdeDisi: satirlar.length - uretimde,
    yanlis: satirlar.filter(m => m.isaret === MODEL_ISARET.YANLIS).length };
};

// ── Parti hesabı (R17–R22, R28) ──────────────────────────────────────────────
const partiDonemi = (parti, bugun) => ({ bas: parti.baslangicAy, bit: parti.bitisAy || String(bugun).slice(0, 7) });
const aylariKesisir = (a, b) => a.bas <= b.bit && b.bas <= a.bit;
// R18 (AC-27): planlanan adet tam sayı, 0 ya da boş = girilmedi.
export const PLAN_ADET_HATASI = "Planlanan adet 1 ile 10000 arasında tam sayı olmalı.";
export const planAdediDogrula = (ham) => {
  const t = String(ham ?? "").trim();
  if (!t) return { bos: true, deger: null, hata: null };
  if (!/^\d+$/.test(t) || Number(t) < 1 || Number(t) > ADET_MAX) return { bos: false, deger: null, hata: PLAN_ADET_HATASI };
  return { bos: false, deger: Number(t), hata: null };
};
export const partiHesabi = (parti, veri, { payK = 0, modeller = [], rates = null, bugun } = {}) => {
  const liste = makinaListesi({ customers: veri.customers || [], stock: veri.stock || [], partStockLog: veri.partStockLog || [] });
  const makinalar = liste.filter(m => m.kayit?.partiId != null && String(m.kayit.partiId) === String(parti.id));
  // Triyaj (bulgu 1): model adı büyük/küçük harften bağımsız eşlenir (eski motorun `modelKey` kuralı, trLower).
  const modelMap = new Map(modeller.map(m => [trLower(m.model), m]));
  const gorunenAd = new Map();
  const turetilen = new Map();
  for (const m of makinalar) { const k = trLower(m.model); if (!gorunenAd.has(k)) gorunenAd.set(k, m.model); turetilen.set(k, (turetilen.get(k) || 0) + 1); }
  const planHam = parti.planlananAdetler && typeof parti.planlananAdetler === "object" ? parti.planlananAdetler : {};
  const plan = new Map();
  for (const [ad, n] of Object.entries(planHam)) if (Number(n) > 0) { const k = trLower(ad); if (!gorunenAd.has(k)) gorunenAd.set(k, ad); plan.set(k, Number(n)); }
  const adlar = [...new Set([...turetilen.keys(), ...plan.keys()])];
  const satirlar = []; const bulunamayan = [];
  for (const k of adlar) {
    const planli = plan.has(k);
    const adet = planli ? plan.get(k) : turetilen.get(k) || 0;
    const mm = modelMap.get(k);
    // R18/2: adı bulunamayan model (yeniden adlandırılmış ya da çöpte) görünür çizilir, hesaba girmez.
    if (!mm) { bulunamayan.push({ model: gorunenAd.get(k), adet, planlanan: planli }); continue; }
    const ad = mm.model;
    satirlar.push({ model: ad, adet, planlanan: planli, turetilenAdet: turetilen.get(k) || 0, direktK: mm.direktK, payK, toplamK: mm.direktK + payK,
      oneriK: oneriKurus(mm.direktK + payK, mm.katsayi), eksikSayisi: mm.eksikSayisi,
      toplamMaliyetK: (mm.direktK + payK) * adet, oneriCiroK: mm.katsayi ? oneriKurus(mm.direktK + payK, mm.katsayi) * adet : null });
  }
  // R20, R20/2 (AC-29/2, AC-29/3, AC-30): gerçeğe göre kâr yalnız satılmış (bedeli ve kuru olan) makinalardan.
  // Triyaj (bulgu 1): modeli bulunamayan satılmış makina ne satışa ne kâra girer (standart maliyeti yok); ayrı sayılır.
  const kirilim = { satilmis: 0, stokta: 0, bedelsiz: 0, kursuz: 0, modelYok: 0 };
  let satisK = 0, satilmisStandartK = 0; const kurDurumlari = { kayitli: 0, yaklasik: 0 };
  for (const m of makinalar) {
    if (m.tur === "stok") { kirilim.stokta++; continue; }
    const mm = modelMap.get(trLower(m.model));
    if (!mm) { kirilim.modelYok++; continue; }
    const bedel = gercekSatisBedeli(m.kayit);
    if (!(bedel > 0)) { kirilim.bedelsiz++; continue; }
    const kur = satisKurBilgisi(m.kayit, rates);
    if (kur.durum === "yok") { kirilim.kursuz++; continue; }
    if (kur.durum !== "tl") kurDurumlari[kur.durum]++;
    kirilim.satilmis++;
    satisK += kurus(bedel * kur.kur);
    satilmisStandartK += mm.direktK + payK;
  }
  const toplamStandartK = satirlar.reduce((a, r) => a + r.toplamMaliyetK, 0);
  const katsayisiz = satirlar.filter(r => r.oneriCiroK == null).length;
  const onerilenCiroK = satirlar.reduce((a, r) => a + (r.oneriCiroK || 0), 0);
  // R21 (AC-31, AC-31/2, AC-32): partinin döneminde "Ürün ağacından gelir" rolündeki türlerin gider toplamı ile standart
  // direkt maliyetin farkı. Tedarik partilere bölünmez; aynı ayları paylaşan parti sayısı yazılır.
  const donem = partiDonemi(parti, bugun);
  // Triyaj (bulgu 4): başlangıcı gelecekte olan (henüz başlamamış, planlı) partide dönem ters döner; karşılaştırma yapılmaz.
  const baslamadi = !!donem.bas && donem.bas > String(bugun).slice(0, 7);
  const havuz = baslamadi ? { yururlukOncesi: false, urunAgaciK: 0 } : rolHavuzlari(veri, donem.bas, donem.bit, bugun);
  const standartDirektK = satirlar.reduce((a, r) => a + r.direktK * r.adet, 0);
  const paylasan = baslamadi ? 0 : (veri.uretimPartileri || []).filter(p => !p.deletedAt && String(p.id) !== String(parti.id) && p.baslangicAy
    && aylariKesisir(donem, partiDonemi(p, bugun))).length;
  return {
    satirlar, bulunamayan, bos: satirlar.length === 0 && bulunamayan.length === 0,
    ozet: { toplamStandartK, onerilenCiroK, katsayisiz, satisK, oneriyeGoreKarK: onerilenCiroK - toplamStandartK,
      gercegeGoreKarK: satisK - satilmisStandartK, satilmisStandartK, kirilim, kurDurumlari },
    tedarik: { donem, baslamadi, yururlukOncesi: havuz.yururlukOncesi, tedarikK: havuz.urunAgaciK, standartDirektK, farkK: havuz.urunAgaciK - standartDirektK, paylasanParti: paylasan },
  };
};
// R22 (AC-33): partisiz makina sayısı (canlı stok + canlı müşteri).
export const partisizMakinaSayisi = ({ customers = [], stock = [] } = {}) =>
  [...stock, ...customers].filter(x => x && !x.deletedAt && x.partiId == null).length;

// ── Spec 0090: aylık genel gider havuzu ve üretim partisi payı ───────────────
// Parti payı bugünkü maliyet motorundan (makinaMaliyeti.js, kova tabanlı "ortak gider") değil bu hesaptan gelir: ayın havuzu
// rolü "genel gidere girer" olan türlerin o aydaki gider tutarıdır (R13). TEK YOL (C15): her ay için 0088'in `rolHavuzlari`'
// (gider motorunun tür kırılımı) çağrılır; yürürlük kırpması, çöpteki tür, kısıtlı gider tabanı ve türsüz kalem kuralları
// ikinci kez yazılmaz ve dönemin aylık toplamı 0088'in dönem havuzuna kuruş kuruş eşittir (C3).
// Hesap ayarlarının dönemi ve varsayılan adedi burada KULLANILMAZ (R20); parti kendi aylarını ve kendi makina adedini kullanır.
export const aylikGenelHavuzlar = (veri, aylar, bugun) => new Map(aylar.map(ay => [ay, rolHavuzlari(veri, ay, ay, bugun).genelK]));

export const PARTI_DURUM = { TAMAM: "tamam", MAKINA_YOK: "makinaYok", BASLAMADI: "baslamadi", ROL_YOK: "rolYok", YURURLUK_ONCESI: "yururlukOncesi" };
export const PARTI_NEDEN = {
  makinaYok: "Bağlı makina yok; ayların gideri makinalar bağlanınca paylaştırılır.",
  baslamadi: "Parti henüz başlamadı; havuz başlangıç ayından itibaren oluşur.",
  rolYok: "Hiçbir gider türünün rolü “Genel gidere girer” değil; rol Makina Maliyeti › Hesap Ayarları'nda verilir.",
  yururlukOncesi: "Partinin bütün ayları gider takibinin yürürlük ayından önce.",
};
// R22: havuzun kaynağı satırda yazılır.
export const PARTI_KAYNAK_IBARESI = "Partinin aylarındaki genel gider";

// Üretim sırası (0022 R13 ve R3'ün "en önce üretilen" kuralı): tarih, seri (sayısal), tür, kimlik; tarihsiz makina sona.
// Kural bugünkü motordakinin aynısıdır ve burada yazılır (revizyon 3, K3): eski dosya bir sürüm sonra silineceği için ona
// bağlanılmaz; eşdeğerlik AC-36'nın kıyas fikstürüyle sabittir.
const idKarsilastir = (a, b) => (Number.isFinite(Number(a)) && Number.isFinite(Number(b)) ? Number(a) - Number(b) : String(a).localeCompare(String(b)));
const uretimSirasi = (a, b) => {
  if (!!a.uretimTarihi !== !!b.uretimTarihi) return a.uretimTarihi ? -1 : 1;
  if (a.uretimTarihi !== b.uretimTarihi) return a.uretimTarihi < b.uretimTarihi ? -1 : 1;
  if (a.seri && b.seri && a.seri !== b.seri) return a.seri.localeCompare(b.seri, "tr", { numeric: true });
  if (!!a.seri !== !!b.seri) return a.seri ? -1 : 1;
  if (a.tur !== b.tur) return a.tur < b.tur ? -1 : 1;
  return idKarsilastir(a.id, b.id);
};

// R31: parti başına TEK nesne { id, adet, havuzK, makinaBasiK, durum, neden, kaynak, degisimler }. Ekran satırın dört hücresini
// (adet, ipucu, havuz, makina başı pay) yalnız buradan okur. R32: adet, bölünmedeki ağırlığı üreten AYNI makina kümesinden
// (`makinaListesi`: canlı müşteri makinaları + canlı stok satırları; üretim tarihi tek zincir, C4).
// R36/2 (K4): ay haritası yürürlük ayından max(içinde bulunulan ay, en geç parti bitişi)'ne kadar her ayı kapsar; kapanış
// anlık görüntüsü bu haritadan yazılır.
export const partiGenelPaylari = (veri = {}, bugun) => {
  const buAy = ayOf(bugun);
  const yurAy = veri.yururlukAy || null;
  const partiler = canliPartiler(veri.uretimPartileri);
  const partiMap = new Map(partiler.map(p => [String(p.id), p]));
  const makinalar = makinaListesi({ customers: veri.customers || [], stock: veri.stock || [], partStockLog: veri.partStockLog || [] }).sort(uretimSirasi);
  const uyeler = new Map(partiler.map(p => [String(p.id), []]));
  const partisizAy = new Map();
  for (const m of makinalar) {
    const pid = m.kayit?.partiId != null && partiMap.has(String(m.kayit.partiId)) ? String(m.kayit.partiId) : null;
    if (pid) { uyeler.get(pid).push(m); continue; }
    if (!m.uretimTarihi) continue; // tarihsiz partisiz makina hiçbir ayın hak sahibi değildir
    const ay = ayOf(m.uretimTarihi);
    if (!partisizAy.has(ay)) partisizAy.set(ay, []);
    partisizAy.get(ay).push(m);
  }
  const partiAylariYur = new Map(partiler.map(p => [String(p.id), partiAylari(p, buAy).filter(a => !yurAy || a >= yurAy)]));
  // Ay haritası (R36/2).
  const baslar = [yurAy, ...partiler.map(p => p.baslangicAy)].filter(Boolean).sort();
  const ilk = yurAy || baslar[0] || buAy;
  const son = [buAy, ...partiler.map(p => p.bitisAy).filter(Boolean)].sort().pop();
  const aylar = [];
  for (let a = ilk; a <= son; a = ayEkle(a, 1)) aylar.push(a);
  const havuzlar = aylikGenelHavuzlar(veri, aylar, bugun);
  // R14 (0022 R13): ayın hak sahipleri = o ay açık ve makinası olan partiler (ağırlık = adet) + o ay üretilmiş partisiz makinalar
  // (ağırlık 1). Kuruşla, aşağı yuvarlanarak bölünür; artık en önce üretilmiş makinası olan hak sahibine.
  const partiHavuz = new Map(partiler.map(p => [String(p.id), 0]));
  for (const ay of aylar) {
    const havuz = havuzlar.get(ay) || 0;
    if (!havuz) continue;
    const sahipler = [
      ...(partisizAy.get(ay) || []).map(m => ({ ilk: m, agirlik: 1 })),
      ...partiler.filter(p => (partiAylariYur.get(String(p.id)) || []).includes(ay) && uyeler.get(String(p.id)).length)
        .map(p => ({ pid: String(p.id), ilk: uyeler.get(String(p.id))[0], agirlik: uyeler.get(String(p.id)).length })),
    ].sort((x, y) => uretimSirasi(x.ilk, y.ilk));
    const agirlik = sahipler.reduce((t, x) => t + x.agirlik, 0);
    if (!agirlik) continue; // X9: hak sahibi olmayan ayın havuzu dağıtılmaz (bilinen sınır)
    const paylar = sahipler.map(x => Math.floor(havuz * x.agirlik / agirlik));
    paylar[0] += havuz - paylar.reduce((t, v) => t + v, 0);
    sahipler.forEach((x, i) => { if (x.pid) partiHavuz.set(x.pid, partiHavuz.get(x.pid) + paylar[i]); });
  }
  const roller = rolOzeti(veri.giderTurleri);
  const sonuc = partiler.map(p => {
    const pid = String(p.id);
    const adet = uyeler.get(pid).length;
    const havuzK = partiHavuz.get(pid);
    // R37/2 (K5): durum önceliği baslamadi → makinaYok → yururlukOncesi → rolYok → tamam.
    const durum = p.baslangicAy > buAy ? PARTI_DURUM.BASLAMADI
      : !adet ? PARTI_DURUM.MAKINA_YOK
      : !(partiAylariYur.get(pid) || []).length ? PARTI_DURUM.YURURLUK_ONCESI
      : (havuzK === 0 && roller.genelTurSayisi === 0) ? PARTI_DURUM.ROL_YOK : PARTI_DURUM.TAMAM;
    // R24, R25: değişim yalnız yeni anlık görüntüden (`kapanisGenelHavuzlari`); eski alan (`kapanisOrtaklari`) okunmaz.
    const anlik = p.bitisAy && p.kapanisGenelHavuzlari && typeof p.kapanisGenelHavuzlari === "object" ? p.kapanisGenelHavuzlari : null;
    const degisimler = !anlik ? [] : Object.entries(anlik)
      .map(([ay, k]) => ({ ay, kapanistaK: Number(k) || 0, bugunK: havuzlar.get(ay) ?? 0 }))
      .filter(d => d.kapanistaK !== d.bugunK).map(d => ({ ...d, farkK: d.bugunK - d.kapanistaK, farkMutlakK: Math.abs(d.bugunK - d.kapanistaK), artti: d.bugunK > d.kapanistaK }))
      .sort((a, b) => (a.ay < b.ay ? -1 : 1));
    // R15 (0022 R3): makina başı pay aşağı yuvarlanır, artık kuruş en önce üretilen makinaya; paylar toplamı = havuz.
    const makinaBasiK = adet ? Math.floor(havuzK / adet) : null;
    const makinaPaylari = uyeler.get(pid).map((m, i) => ({ anahtar: m.anahtar, payK: makinaBasiK + (i === 0 ? havuzK - makinaBasiK * adet : 0) }));
    return { id: p.id, adet, havuzK, makinaBasiK, durum, neden: PARTI_NEDEN[durum] || null,
      kaynak: PARTI_KAYNAK_IBARESI, acik: !p.bitisAy, degisimler, makinaPaylari };
  });
  return { partiler: sonuc, aylar: havuzlar, yururlukAy: yurAy, roller };
};

// Triyaj (bulgu 2): kapanış anlık görüntüsünün haritası KAYDEDİLEN partinin bütün aralığını kapsar (yürürlük boş, gelecek
// bitiş, başlangıcı öne çekilen parti). Tek yol aylikGenelHavuzlar (C15); kalemsiz ay 0'dır, yürürlük öncesi ay görüntüye
// girmez (kapanisAnlikGoruntusu atlar).
export const partiKapanisHavuzu = (veri = {}, parti, bugun) => ({
  aylar: aylikGenelHavuzlar(veri, partiAylari(parti, ayOf(bugun)).filter(a => !veri.yururlukAy || a >= veri.yururlukAy), bugun),
  yururlukAy: veri.yururlukAy || null,
});

// Ekran yardımcıları (biçim yalnız burada): kuruş → TL.
export const tlOf = (k) => (k == null ? null : tl(k));
// Ekranın para gösterimi tek yerde: kuruş → "1.234,56 ₺" (iki ondalık), null → "—" (R25: ekran hesap yapmaz).
const ikiHane = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const kurusMetni = (k) => (k == null ? "—" : `${ikiHane.format(tl(k))} ₺`);
