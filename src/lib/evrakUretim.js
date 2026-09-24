// Evrak (teklif) → CRM kayıt üretimi: saf plan (spec 0006, plan E1–E16). React'sız.
//
// Belgenin her ALT KALEMİ kendi türüne göre sınıflanır (R1): makina → müşteri/makina kaydı, "makinayla verilir"
// kalıp → makinanın kalıp listesi (ayrı kayıt yok), "Extra" kalıp → Extra Kalıp satışı, katalog parçası → gerçek
// yedek parça satışı; bant ve belirsiz kalemler atlanır. İskonto kuruş hesabıyla alt kalemlere dağıtılır (R11,
// E7). Daha önce üretilmiş alt kalemler (belgenin `uretilenKalemler` listesi) yeniden üretilmez (R10). Gereken
// izinler toplanır; biri bile eksikse uygulayıcı hiçbir şey yazmaz (R8). Bu dosya yalnız karar verir; yazma
// App.evrakKaydet'te, mevcut ortak yollarla yapılır (C3, C4).
import { parseMoney } from "./utils";

const kurus = (x) => Math.round((Number(x) || 0) * 100);
const tl = (k) => k / 100;
export const faturaTipiOf = (currency) => (currency && currency !== "TRY" ? "Faturalı Yurtdışı" : "Faturalı Yurtiçi");

// İzin kimlikleri → kullanıcıya gösterilen ad (R8 "hangi izin eksik").
export const IZIN_ADLARI = {
  yedek_parca_add: "Yedek parça satışı ekleme (Stok işlemleri)",
  cust_kalip_add: "Extra Kalıp satışı ekleme (Müşteri işlemleri)",
  cust_add: "Yeni müşteri ekleme (Müşteri işlemleri)",
  cust_detail_add_machine: "Firmaya makina ekleme (Müşteri işlemleri)",
  musteriler_sekmesi: "Müşteriler sekmesi (makina kaydı müşteri formunda yapılır)",
};

// Kalıp satırının rolü (R3, E1): açık seçim > eski gruplu satırda makina varsa zorunlu "makinayla" > varsayılan
// (belgede makina varsa "makinayla", yoksa "extra").
export const kalipRolu = (row, belgedeMakinaVar) => {
  if ((row.subItems || []).some(i => i.type === "makina")) return "makinayla";
  if (row.kalipRolu === "makinayla" || row.kalipRolu === "extra") return row.kalipRolu;
  return belgedeMakinaVar ? "makinayla" : "extra";
};

// Belgenin alt kalemleri, satırıyla birlikte düz liste.
export const altKalemler = (t) => (t?.satirlar || []).flatMap(row => (row.subItems || []).map(item => ({ row, item, kalemId: String(item.id) })));

const kalemTutarK = (item) => Math.round(kurus(parseMoney(item.birimFiyat)) * (parseFloat(item.miktar) || 0));
const kalemAdi = (row, item) => item.makinaAdi || item.kod || row.selectedModel || row.selectedKalip || "(adsız kalem)";

// R11, E7: iskonto fiyatı olan BÜTÜN alt kalemlere tutarlarıyla orantılı dağıtılır (kuruş). İskonto payının
// artığı en büyük kaleme; birim fiyat kuruşa yuvarlanınca miktarı > 1 olanlarda kalan kuruşlar miktarı 1 olan en
// büyük kaleme yazılır (yoksa `yuvarlamaFarki`). Dönüş: kalemId → { netK, birimK, miktar }.
// uretenIdler verilirse (triyaj bulgu 4) artıklar yalnız KAYIT ÜRETEN kalemlere yazılır; kayıt üretmeyen (bant,
// belirsiz) kaleme yazılan kuruş kaybolur ve hiçbir yerde görünmezdi. Uygun kalem yoksa fark özette yazılır.
export const iskontoDagit = (kalemler, iskontoTL, uretenIdler = null) => {
  const fiyatli = kalemler.map(k => ({ ...k, tutarK: kalemTutarK(k.item), miktar: parseFloat(k.item.miktar) || 0 })).filter(k => k.tutarK > 0);
  const toplamK = fiyatli.reduce((a, k) => a + k.tutarK, 0);
  const iskK = Math.min(Math.max(0, kurus(parseMoney(iskontoTL))), toplamK);
  const sonuc = new Map();
  if (!fiyatli.length) return { kalemler: sonuc, yuvarlamaFarki: 0, netToplam: 0 };
  const ureten = (k) => !uretenIdler || uretenIdler.has(k.kalemId);
  const buyukten = [...fiyatli].sort((a, b) => b.tutarK - a.tutarK || a.kalemId.localeCompare(b.kalemId));
  const buyukUreten = buyukten.filter(ureten);
  let dagitilan = 0;
  for (const k of fiyatli) { const pay = Math.floor(iskK * k.tutarK / toplamK); dagitilan += pay; sonuc.set(k.kalemId, { netK: k.tutarK - pay, miktar: k.miktar }); }
  sonuc.get((buyukUreten[0] || buyukten[0]).kalemId).netK -= iskK - dagitilan;
  let artik = 0;
  for (const [id, v] of sonuc) {
    v.birimK = v.miktar > 0 ? Math.floor(v.netK / v.miktar) : v.netK;
    if (ureten({ kalemId: id })) artik += v.netK - v.birimK * v.miktar;
  }
  let yuvarlamaFarki = 0;
  if (artik) {
    const emici = buyukUreten.find(k => k.miktar === 1);
    if (emici) sonuc.get(emici.kalemId).birimK += artik; else yuvarlamaFarki = artik;
  }
  return { kalemler: sonuc, yuvarlamaFarki: tl(yuvarlamaFarki), netToplam: tl(toplamK - iskK) };
};

// Alt kalemin sınıfı (sonuç: { tur } | { atla: neden }).
const siniflandir = (row, item, { belgedeMakinaVar, parcaMap }) => {
  if (item.type === "bant") return { atla: "Bant kalemi: karşılığı olan bir satış kaydı yok" };
  if (item.type === "makina") {
    const model = row.selectedModel || "";
    return model ? { tur: "makina", model } : { atla: "Türü belirsiz: makina modeli seçilmemiş" };
  }
  if (item.type === "kalip") {
    const ad = row.selectedKalip || item.makinaAdi || item.kod || "";
    if (!ad) return { atla: "Türü belirsiz: kalıp adı yok" };
    // Triyaj bulgu 2: miktar kadar kalıp (elle girilen formda her kalıp ayrı kayıt, C3).
    const miktar = parseFloat(item.miktar) || 0;
    if (!(miktar > 0) || !Number.isInteger(miktar)) return { atla: "Kalıp miktarı pozitif tam sayı değil" };
    return { tur: kalipRolu(row, belgedeMakinaVar) === "makinayla" ? "kalipMakinayla" : "kalipExtra", ad, miktar };
  }
  if (item.type === "parca") {
    const part = row.selectedPart ? parcaMap.get(String(row.selectedPart)) : null;
    if (!part) return { atla: "Katalogda karşılığı olmayan (serbest metin) parça" };
    const miktar = parseFloat(item.miktar) || 0;
    if (!(miktar > 0) || !Number.isInteger(miktar)) return { atla: "Parça miktarı pozitif tam sayı değil" };
    const makinaSatirindan = !!row.selectedModel || (row.subItems || []).some(i => i.type === "makina");
    return { tur: "yedekParca", partId: String(part.id), miktar, makinaSatirindan };
  }
  return { atla: "Türü belirsiz alt kalem" };
};

// Belgenin uretilebilir alt kalemleri (durum ve plan için ortak).
const hazirla = (t, { parts = [] } = {}) => {
  const kalemler = altKalemler(t);
  const belgedeMakinaVar = kalemler.some(k => k.item.type === "makina" && k.row.selectedModel);
  const parcaMap = new Map(parts.filter(p => !p.deletedAt).map(p => [String(p.id), p]));
  return kalemler.map(k => ({ ...k, ad: kalemAdi(k.row, k.item), ...siniflandir(k.row, k.item, { belgedeMakinaVar, parcaMap }) }));
};

// Triyaj bulgu 1: makina kaleminin "üretildi" sayılması bellekteki bekleyen işe bağlı kalmasın. Belgeye
// `fromTeklifId` ile bağlı CANLI makina kaydı, listede görünmeyen makina kalemlerinin üretildiğinin kanıtıdır (form
// açıkken uygulama kapandı, taslak geri yüklenip kaydedildi). Bağlı kayıt sayısı kadar makina kalemi (sırayla) ve
// o durumda "makinayla" kalıplar (ilk makinayla birlikte forma girdiler) üretilmiş sayılır.
export const kanitlaUretilenler = (t, hazir, customers = []) => {
  const liste = new Set((t?.uretilenKalemler || []).map(String));
  const bagli = customers.filter(c => !c.deletedAt && c.fromTeklifId != null && String(c.fromTeklifId) === String(t?.id)).length;
  const makinalar = hazir.filter(k => k.tur === "makina");
  const fazla = Math.max(0, bagli - makinalar.filter(k => liste.has(k.kalemId)).length);
  const kanitli = makinalar.filter(k => !liste.has(k.kalemId)).slice(0, fazla).map(k => k.kalemId);
  if (!kanitli.length) return [];
  return [...kanitli, ...hazir.filter(k => k.tur === "kalipMakinayla" && !liste.has(k.kalemId)).map(k => k.kalemId)];
};

// R10: durum listeden (ve bulgu 1'in kanıtından) türetilir. Eski belgelerde (liste yok) `satisTamam` "kaydedildi"
// sayılır (E10). Triyaj bulgu 3: hiç üretilebilir kalemi olmayan belge (yalnız bant / belirsiz / serbest metin)
// "gerekmiyor" durumundadır: sonsuza dek "bekliyor" görünmesin.
export const teklifUretimDurumu = (t, baglam = {}) => {
  const hazir = hazirla(t, baglam);
  const uretilebilir = hazir.filter(k => k.tur);
  if (!uretilebilir.length) return t?.satisTamam ? "kaydedildi" : "gerekmiyor";
  const liste = new Set([...(t?.uretilenKalemler || []).map(String), ...kanitlaUretilenler(t, hazir, baglam.customers)]);
  if (!liste.size) return t?.satisTamam ? "kaydedildi" : "kaydedilmedi";
  return uretilebilir.every(k => liste.has(k.kalemId)) ? "kaydedildi" : "kismen";
};

// Asıl plan. baglam: { parts, customers, dealers, factoryName, canDo(id), musterilerSekmesi, musteriId? }
// musteriId verilirse (makina formundan yeni açılan müşteri) alıcı müşteri odur.
export const teklifUretimPlani = (t, baglam = {}) => {
  const { customers = [], dealers = [], factoryName = "Altuntaş Makina", canDo = () => true, musterilerSekmesi = true } = baglam;
  const hazir = hazirla(t, baglam);
  const tumKimlikler = new Set(hazir.map(k => k.kalemId));
  // Bulgu 1: listeye yazılamamış ama bağlı makina kaydıyla kanıtlanan kalemler de üretilmiş sayılır; uygulayıcı
  // bunları listeye kalıcı yazar (kanitlaUretilen).
  const kanitlaUretilen = kanitlaUretilenler(t, hazir, customers);
  const uretilen = new Set([...(t.uretilenKalemler || []).map(String), ...kanitlaUretilen]);
  const eskiKaydedildi = !(t.uretilenKalemler || []).length && !kanitlaUretilen.length && !!t.satisTamam;
  const silinmisUretilenler = [...uretilen].filter(id => !tumKimlikler.has(id));
  const currency = t.currency || "TRY";
  const faturaTipi = faturaTipiOf(currency);
  const bayiAlici = t.aliciTipi === "bayi";
  const bayi = bayiAlici ? dealers.find(d => String(d.id) === String(t.dealerId) && !d.deletedAt) : null;
  const canliMusteri = (id) => (id != null && customers.find(c => String(c.id) === String(id) && !c.deletedAt)) || null;
  // Kalıp ve makinanın gideceği müşteri: bayi belgede nihai müşteri (R13), müşteri belgede belge müşterisi.
  // Makina formundan yeni açılan müşteri (baglam.musteriId) state'e henüz yansımamış olabilir: kimliği yeterli.
  const hedefMusteri = baglam.musteriId != null
    ? (canliMusteri(baglam.musteriId) || { id: baglam.musteriId })
    : canliMusteri(bayiAlici ? t.nihaiMusteriId : t.customerId);
  const { kalemler: paylar, yuvarlamaFarki } = iskontoDagit(hazir.map(k => ({ kalemId: k.kalemId, item: k.item })), t.iskonto, new Set(hazir.filter(k => k.tur).map(k => k.kalemId)));
  const net = (id) => tl(paylar.get(id)?.netK || 0);
  const birim = (id) => tl(paylar.get(id)?.birimK || 0);

  const atlananlar = [];
  const bekleyen = [];
  for (const k of hazir) {
    if (!k.tur) { atlananlar.push({ kalemId: k.kalemId, ad: k.ad, neden: k.atla }); continue; }
    if (uretilen.has(k.kalemId) || eskiKaydedildi) continue;
    bekleyen.push(k);
  }

  // Makina (R2, R9, R21): tek seferde bir makina; "makinayla" kalıplar ona katılır (E8).
  const makinalar = bekleyen.filter(k => k.tur === "makina");
  const makinaylaKaliplar = bekleyen.filter(k => k.tur === "kalipMakinayla");
  let makina = null;
  const makinaAtla = (neden) => { makinalar.forEach(m => atlananlar.push({ kalemId: m.kalemId, ad: m.ad, neden })); makinaylaKaliplar.forEach(m => atlananlar.push({ kalemId: m.kalemId, ad: m.ad, neden })); };
  if (makinalar.length) {
    if (bayiAlici && !hedefMusteri) makinaAtla("Bayi belgesinde nihai müşteri seçilmemiş");
    else {
      const ilk = makinalar[0];
      makina = {
        kalemId: ilk.kalemId, model: ilk.model, ad: ilk.ad,
        bedel: tl(kurus(net(ilk.kalemId)) + makinaylaKaliplar.reduce((a, k) => a + kurus(net(k.kalemId)), 0)),
        kaliplar: makinaylaKaliplar.flatMap(k => Array.from({ length: k.miktar }, () => ({ kalemId: k.kalemId, ad: k.ad }))),
        hedef: hedefMusteri ? { tip: "mevcut", musteriId: hedefMusteri.id } : { tip: "yeni" },
        satisYapan: bayi ? bayi.name : factoryName,
        kalanMakina: makinalar.length - 1,
      };
    }
  } else if (makinaylaKaliplar.length) {
    // Belgede makina yok ama rolü "makinayla" seçilmiş kalıp (ör. makina önceki kayıtta üretildi): müşterinin
    // kalıp listesine eklenir, Extra Kalıp satışı üretmez.
    if (!hedefMusteri) makinaylaKaliplar.forEach(k => atlananlar.push({ kalemId: k.kalemId, ad: k.ad, neden: bayiAlici ? "Bayi belgesinde nihai müşteri seçilmemiş" : "Belge bir müşteriye bağlı değil" }));
  }
  const makinaylaTek = !makina && hedefMusteri ? makinaylaKaliplar.flatMap(k => Array.from({ length: k.miktar }, () => ({ kalemId: k.kalemId, ad: k.ad }))) : [];

  // Müşteri henüz yoksa (yeni müşteri makina formunda açılacak) makina dışı adımlar formdan sonraya kalır.
  const musteriBekleniyor = !!makina && makina.hedef.tip === "yeni";
  const kalipKayitlari = [], yedekParcaKayitlari = [];
  for (const k of bekleyen) {
    if (k.tur === "kalipExtra") {
      if (!hedefMusteri && !musteriBekleniyor) { atlananlar.push({ kalemId: k.kalemId, ad: k.ad, neden: bayiAlici ? "Bayi belgesinde nihai müşteri seçilmemiş" : "Belge bir müşteriye bağlı değil" }); continue; }
      // Miktar kadar ayrı Extra Kalıp kaydı, her biri birim fiyatla (bulgu 2; artık kuruşlar iskontoDagit'te).
      for (let i = 0; i < k.miktar; i++) kalipKayitlari.push({ kalemId: k.kalemId, ad: k.ad, ucret: birim(k.kalemId), satisFirma: bayi ? bayi.name : factoryName });
    } else if (k.tur === "yedekParca") {
      const alici = bayiAlici ? (bayi ? { aliciTipi: "bayi", dealerId: bayi.id } : null) : (hedefMusteri ? { aliciTipi: "musteri", musteriId: hedefMusteri.id } : musteriBekleniyor ? { aliciTipi: "musteri", musteriId: null } : null);
      if (!alici) { atlananlar.push({ kalemId: k.kalemId, ad: k.ad, neden: bayiAlici ? "Belgenin bayisi bulunamadı" : "Belge bir müşteriye bağlı değil" }); continue; }
      yedekParcaKayitlari.push({ kalemId: k.kalemId, ad: k.ad, partId: k.partId, miktar: k.miktar, birimFiyat: birim(k.kalemId), makinaSatirindan: k.makinaSatirindan, ...alici });
    }
  }

  // R8: gereken izinler; eksik olan her biri adıyla.
  const gereken = new Set();
  if (yedekParcaKayitlari.length) gereken.add("yedek_parca_add");
  if (kalipKayitlari.length) gereken.add("cust_kalip_add");
  if (makina) { gereken.add(makina.hedef.tip === "yeni" ? "cust_add" : "cust_detail_add_machine"); gereken.add("musteriler_sekmesi"); }
  const eksikIzinler = [...gereken].filter(id => (id === "musteriler_sekmesi" ? !musterilerSekmesi : !canDo(id))).map(id => ({ id, ad: IZIN_ADLARI[id] }));

  const uretilecekVar = !!makina || kalipKayitlari.length > 0 || yedekParcaKayitlari.length > 0 || makinaylaTek.length > 0;
  return {
    bos: hazir.length === 0,
    eskiKaydedildi,
    currency, faturaTipi, tarih: t.tarih,
    makina, makinaylaTek, kalipKayitlari, yedekParcaKayitlari,
    atlananlar, silinmisUretilenler, eksikIzinler, yuvarlamaFarki,
    musteriBekleniyor, uretilecekVar, kanitlaUretilen,
    hedefMusteriId: hedefMusteri?.id ?? null,
  };
};

// R16 / AC-43: belgeden üretilmiş kayıtlar (kalıcı bağlardan türetilir, E3).
export const uretilenKayitlar = (t, { customers = [], partSales = [], yedekParcaSatislar = [] } = {}) => ({
  makinalar: customers.filter(c => !c.deletedAt && String(c.fromTeklifId) === String(t.id)),
  kaliplar: partSales.filter(p => !p.deletedAt && String(p.teklifId) === String(t.id)),
  yedekParcalar: yedekParcaSatislar.filter(s => !s.deletedAt && String(s.teklifId) === String(t.id)),
});

// "Bu teklif kullanıldı mı" (E10): alt kalem listesi varsa belge TAMAMEN üretildiyse kaydedilmiş sayılır
// (kısmen kaydedilmiş belge işlem bekler). Liste yoksa eski belge: `satisTamam` veya belgeden doğmuş herhangi
// bir kayıt (müşteri `fromTeklifId`, kalıp `teklifId`, yedek parça `teklifId`) kalıcı kanıttır.
// Bulgu 1: bağlı makina kaydı artık eski-belge kanıtı sayılmaz (yeni akışta da oluşur); durum hesabında makina
// kaleminin kanıtıdır. Bulgu 3: "gerekmiyor" belge de bekleyen sayılmaz.
export const teklifKaydedildiMi = (t, { customers = [], partSales = [], yedekParcaSatislar = [], parts = [] } = {}) => {
  if (!t) return false;
  const ayni = (x) => x != null && String(x) === String(t.id);
  if (!(t.uretilenKalemler || []).length && (t.satisTamam
    || partSales.some(p => !p.deletedAt && ayni(p.teklifId)) || yedekParcaSatislar.some(s => !s.deletedAt && ayni(s.teklifId)))) return true;
  const d = teklifUretimDurumu(t, { parts, customers });
  return d === "kaydedildi" || d === "gerekmiyor";
};

// R10, AC-35: üretilmiş alt kalem listesi yalnız büyür; çakışma birleştirmesinde ve yüklemede iki tarafın
// BİRLEŞİMİ alınır. Değişiklik yoksa aynı dizi döner (gereksiz yeniden yazma olmasın).
export const uretilenKalemBirlesimi = (a, b) => {
  const set = new Set((a || []).map(String));
  const ek = (b || []).map(String).filter(x => !set.has(x));
  return ek.length ? [...(a || []).map(String), ...ek] : a; // değişiklik yoksa AYNI referans (undefined dahil)
};

// Bulgu 1: makina formu, bekleyen iş bellekte yokken kaydedildi (uygulama form açıkken kapandı, taslak geri
// yüklendi). Yeni makina kaydı henüz state'e yansımadığı için kanıt sayılmaz; plandaki ilk bekleyen makina ve onunla
// forma giren "makinayla" kalıplar üretilmiş işaretlenir. Dönüş: listeye eklenecek kalem kimlikleri.
export const bekleyenIsYokkenMakinaKalemleri = (t, baglam = {}) => {
  const p = teklifUretimPlani(t, baglam);
  return p.makina ? [p.makina.kalemId, ...new Set(p.makina.kaliplar.map(k => k.kalemId))] : [];
};
