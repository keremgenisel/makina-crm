// Spec 0046 + 0053: gider ödemesinin girişi. Saf, React'sız. Form ve ödeme penceresi AYNI fonksiyonu çağırır
// (odemeGirisiHazirla; 0053 R8, R29): normal satırlar kasa.cokluOdemeDogrula'dan (her satır odemeDogrula), ciro satırı
// cek.ciroAdaylari + cek.ciroPlani'dan, kendi çek cek.kendiCekPlani'dan, mahsup kasa.mahsupDogrula'dan. Form doğrulamayı
// geçici kalem kimliğiyle, Giderler kaydı gerçek kimlikle aynı fonksiyondan yapar (0046 Q1, 0053 R24); bu yüzden fonksiyon
// girdiden başka hiçbir şeye bakmaz.
import { cokluOdemeDogrula, mahsupDogrula, COKLU_ODEME_MAX_SATIR } from "./kasa";
import { ciroAdaylari, ciroPlani, ciroVarsayilanDagitim, CIRO_YONTEMI, portfoySatirlari, CEK_DURUM, KENDI_CEK_YONTEMI, kendiCekPlani } from "./cek";
import { parseMoney } from "./utils";
import { tl, kurus, satirliMi, davranisOf, odemeHedefleri, personelHedefKirilimi, personelBolunmezMi, personelEkBolunmezMi, kalemPersonelAyrimi, odemeHedefKalaniK, odemeleriUygula, DAVRANIS, HEDEF, HEDEF_SIRASI } from "./gider";

// Spec 0057 R7, R9, R20: taksitli hedef yalnız bu düzenlemede taksit sayısı değiştiyse pasiftir (satırlar kayıtta yeniden
// kurulur); tek neden metni. 0046'nın "bütün ödemeler taksitli" notu ve 0053'ün TAKSIT_PLANI_DEGISTI_NEDENI'si kalktı.
export const PASIF_TAKSIT_NEDENI = "Bu bölümün taksit planı bu düzenlemede değişti; ödemeyi kaydettikten sonra girin.";
// Spec 0057 R8, R19: çek satırı taksit seçmez; tutar ANA'nın açık taksitlerine en eski vadeden dağıtılır.
export const CEK_DAGITIM_NOTU = "Çek tutarı bu bölümün açık taksitlerine en eski vadeden dağıtılır.";
export const CIRO_YALNIZ_ANA_NEDENI = { [HEDEF.STOPAJ]: "Vergi dairesine çekle ödeme yapılmaz; çek yalnız ana alacaklıya ciro edilir.",
  [HEDEF.ELDEN]: "Elden ödeme çekle yapılmaz; çek yalnız ana alacaklıya ciro edilir.",
  // Spec 0054 R22: ek ödeme hedefleri ANA değildir (0053 R12).
  [HEDEF.EK_RESMI]: "Ek ödeme çekle yapılmaz; çek yalnız ana alacaklıya verilir.",
  [HEDEF.EK_ELDEN]: "Ek ödeme çekle yapılmaz; çek yalnız ana alacaklıya verilir." };
// Spec 0074 R16 (Ö-17): 0070'in SGK kaydı kalktı; SGK kaleminin hedefi ANA olduğu için çek "yalnız ANA" kuralıyla serbesttir.
export const KENDI_CEK_YALNIZ_ANA_NEDENI = "Kendi çekimiz yalnız ana alacaklıya verilir.";
export const CEK_YOK_NOTU = "Portföyde ciro edilebilecek (TL, portföyde duran) çek yok; başka bir yöntem seçin.";

// R1, R5, R6, R26: çizilecek hedef satırları, HEDEF_SIRASI sırasıyla. Tutarı sıfır olan hedef yoktur. taksitId: taksitli
// olmayan hedefin tek satırı (satırsız kalemde null, Q2).
// Spec 0057 R1, R21 (C2): pasif kararını bu fonksiyon vermez (pasif: false, neden: null); çağıran verir: pencere açık bırakır,
// duzenlemeOdemeDurumu plan değişikliği / plan hatasıyla pasif yapar, yeni kalemde kimse pasif yapmaz. taksitli = hedefin
// birden çok satırı var (taksit seçici ve taksit bazlı kalan buna bakar; eskiden pasif'in kopyasıydı).
// Spec 0048 (R12, R13, C2): nesne ham ödenen tutarı (odenenK: satırda `_odenenK`, satırsızda `_odenen`; kırpılmaz),
// hedefin satır sayısını (satirSayisi) ve personelde maaş/ek ödeme kırılımını (maasK, ekOdemeK; diğerlerinde null) da taşır.
// Mevcut alanlar değişmedi (AC-28).
export const formOdemeHedefleri = (kalem, turMap) => {
  if (!kalem) return [];
  const dav = davranisOf(kalem, turMap);
  const satirli = satirliMi(kalem);
  const hedefler = odemeHedefleri(kalem, dav).filter(h => h.toplamK > 0);
  const ayrim = kalemPersonelAyrimi(kalem, dav); // spec 0054: kırılım kalemin bugünkü hedef yapısından
  return hedefler
    .sort((a, b) => HEDEF_SIRASI.indexOf(a.hedef) - HEDEF_SIRASI.indexOf(b.hedef))
    .map(h => {
      const satirlar = satirli ? kalem.taksitler.filter(r => (r.hedef || HEDEF.ANA) === h.hedef) : [];
      const taksitli = satirlar.length > 1;
      const odenenK = satirli ? satirlar.reduce((a, r) => a + (r._odenenK != null ? r._odenenK : (r.odendi ? kurus(r.tutar) : 0)), 0)
        : (kalem._odenen ? (kalem._odenen[h.hedef] || 0) : (kalem.odendi ? h.toplamK : 0));
      const kirilim = dav === DAVRANIS.PERSONEL && h.hedef !== HEDEF.STOPAJ ? personelHedefKirilimi(kalem, h.hedef, ayrim) : { maasK: null, ekOdemeK: null };
      // Spec 0053 R30: taksitli hedefin açık taksitleri (sıra, vade, kalan); düzenleme formu ve pencere taksit seçer.
      const acikTaksitler = satirlar.filter(r => Math.max(0, kurus(r.tutar) - (r._odenenK || 0)) > 0)
        .map(r => ({ id: r.id, sira: r.sira, vade: r.vade || null, kalanK: Math.max(0, kurus(r.tutar) - (r._odenenK || 0)) }));
      return { hedef: h.hedef, taksitId: satirli && !taksitli ? satirlar[0]?.id ?? null : null, toplamK: h.toplamK, kalanK: h.kalanK,
        odendi: h.odendi, pasif: false, neden: null, ciroOlur: h.hedef === HEDEF.ANA,
        odenenK, satirSayisi: satirlar.length, taksitli, acikTaksitler, ...kirilim };
    });
};

// Spec 0048: düzenleme kipindeki ödeme kutusunun kararları (R4, R5, R12, R14, R15, R16; plan Q2–Q6). Saf; form yalnız çizer.
// canliKalem: formun canlı önizleme kalemi, kaydın motorundan (odemeleriUygula) geçmiş (Q1). kayitliKalem: kayıttaki
// zenginleştirilmiş kalem. Dönüş { hedefler, kaybolanlar, planHatasi, turDegisti, bolunmez }.
export const KAYDEDINCE_ODENIR = "Kaydedince ödenebilir";
export const PLAN_HATASI_NOTU = "Ödeme planında hata var; aşağıdaki durum kayıtlı hâli gösteriyor.";
export const TUR_DEGISTI_UYARISI = "Bu kalemin kayıtlı ödemesi var; türü değiştirmek hedefleri ve ödeme bağlarını etkiler.";
export const duzenlemeOdemeDurumu = ({ canliKalem, kayitliKalem, turMap, planHatasi = false }) => {
  const kayitli = formOdemeHedefleri(kayitliKalem, turMap);
  const kayitliDav = kayitliKalem ? davranisOf(kayitliKalem, turMap) : null;
  const bolunmez = !!kayitliKalem && personelBolunmezMi(kayitliKalem.taksitler, kayitliDav);
  // Spec 0054 R10, R21: kayıtlı satırlar ek ödemeyi içerdiği için ayrılamayan taraf (canlı ek ödemeyle).
  const ekBolunmez = !!kayitliKalem && !!canliKalem && personelEkBolunmezMi(canliKalem, kayitliKalem.taksitler, kayitliDav);
  // R14: plan hatalıyken kutu kayıtlı hâli gösterir (taksitli kalem tek hedefe düşmesin); düğme bugünkü kuralla.
  if (planHatasi || !canliKalem) {
    // Spec 0057 R22: plan hatasında taksitli hedef pasif (neden kutunun üstündeki plan hatası notu).
    return { hedefler: kayitli.map(h => ({ ...h, dugme: h.kalanK > 0, kaydedinceOdenir: false, asimK: 0, pasif: h.taksitli && !!planHatasi })), kaybolanlar: [], planHatasi: !!planHatasi, turDegisti: false, bolunmez, ekBolunmez: false };
  }
  const canli = formOdemeHedefleri(canliKalem, turMap);
  const hedefler = canli.map(h => {
    const k = kayitli.find(x => x.hedef === h.hedef);
    // R5 (Q3): düğme yalnız hedef kayıtta aynı satır yapısıyla varsa; pencere kayıtlı kalemi öder (X5).
    // Triyaj: satırsız hedef (0 satır) tek satırlı hedefle eşdeğerdir. Göçsüz eski kalemler (0042 öncesi iki hedefli
    // personel, 0021 öncesi stopajlı kira) önizlemede ilk kayıtta satırlıya döner; hiçbir şey değişmemişken yapı
    // "değişmiş" sayılıp düğme kaybolmasın. Ölçüt taksit sayısıdır.
    const taksitSayisi = (n) => Math.max(1, n || 0);
    const yapiAyni = !!k && taksitSayisi(k.satirSayisi) === taksitSayisi(h.satirSayisi);
    const dugme = h.kalanK > 0 && yapiAyni;
    // R4, R12 (Q4): aşım, kayıtlı hedefin ham ödenen tutarı ile canlı toplamın farkı.
    const asimK = k ? Math.max(0, k.odenenK - h.toplamK) : 0;
    // Spec 0053 R24, R30: formda ödeme kalem ile aynı yazımda girilir (dugme/kaydedinceOdenir yalnız pencere bağlamının
    // bilgisi olarak kalır); yalnız taksit sayısı bu düzenlemede değişen taksitli hedef pasiftir.
    const taksitPlaniDegisti = h.taksitli && !yapiAyni;
    // Spec 0057 R1, R7: pasif kararı burada; yalnız taksit sayısı değişen taksitli hedef (vade ya da tutar değişimi değil).
    return { ...h, dugme, kaydedinceOdenir: h.kalanK > 0 && !dugme, asimK, kayitliOdenenK: k ? k.odenenK : 0, taksitPlaniDegisti,
      pasif: taksitPlaniDegisti, neden: taksitPlaniDegisti ? PASIF_TAKSIT_NEDENI : null };
  });
  // R16 (Q5): canlıda kalmamış ama kayıtta ödeme almış hedef görünür kalır.
  const kaybolanlar = kayitli.filter(k => k.odenenK > 0 && !canli.some(h => h.hedef === k.hedef)).map(k => ({ hedef: k.hedef, odenenK: k.odenenK, toplamK: 0 }));
  // R15 (Q6): davranış değişti ve kayıtlı ödeme var.
  const turDegisti = kayitliDav != null && davranisOf(canliKalem, turMap) !== kayitliDav && kayitli.some(k => k.odenenK > 0);
  return { hedefler, kaybolanlar, planHatasi: false, turDegisti, bolunmez, ekBolunmez };
};

// Q5: ciro edilebilecek çekler (portföyde, TL), vade sırasıyla.
export const ciroCekleri = (cekler = [], payments = []) => portfoySatirlari(cekler, payments, { durumlar: new Set([CEK_DURUM.PORTFOY]) }).satirlar
  .filter(s => s.currency === "TRY");

// Q6: ciroda alacaklı kalemden türer (tedarikçi / çalışan / serbest).
export const ciroAlacaklisi = (kalem, turMap) => {
  const dav = davranisOf(kalem, turMap);
  if (dav === DAVRANIS.PERSONEL) return { tur: "calisan", id: kalem.calisanId };
  return kalem.tedarikciId != null ? { tur: "tedarikci", id: kalem.tedarikciId } : { tur: "serbest" };
};

// ── Spec 0053: tek ödeme girişi ──────────────────────────────────────────────────────────────────────────────────
// Satır: { anahtar, hedef, sira, tutar, yontem, hesapId, aciklama, cekId, cekNo, cekHesapId, cekVade }. Satır hedefe ve
// (taksitli hedefte) taksit sırasına bağlanır; taksit kimliği kayıt anında kalemden çözülür, çünkü yeni kalemde kimlik
// kayıtta doğar (plan Q1). Kip "mahsup" ise tek satır: mahsup = { hedef, sira, tutar, aciklama } (R27).
export const CEK_YONTEMLERI = new Set([CIRO_YONTEMI, KENDI_CEK_YONTEMI]);
export const TEK_CEK_HATASI = "Bir kayıtta en çok bir çek satırı girilir; ikinci çeki ayrı kaydedin.";
export const satirTaksitId = (kalem, hedef = HEDEF.ANA, sira = null) => {
  if (!kalem || !satirliMi(kalem)) return null;
  const sat = kalem.taksitler.filter(r => (r.hedef || HEDEF.ANA) === hedef);
  if (sat.length === 1) return sat[0].id;
  return sat.find(r => sira != null && Number(r.sira) === Number(sira))?.id ?? null;
};
const bosMu = (v) => String(v ?? "").trim() === "";
const satirTutarK = (r) => { const t = parseMoney(r?.tutar); return Number.isFinite(t) && t > 0 ? Math.round(t * 100) : 0; };

// Spec 0057 triyaj: satır eklendikten sonra hedef taksitliye dönerse (yeni kalemde taksit sayısı sonradan artırıldı) ya da
// satırın taksidi artık açık değilse, satırın sırası en yakın vadeli açık taksidin sırasına eşlenir; böylece seçicinin
// gösterdiği ile satırın bağlandığı taksit hep aynıdır. Çek satırı taksit seçmez (R8), dokunulmaz. Değişiklik yoksa aynı dizi.
export const satirSiralariniEsle = (satirlar = [], hedefler = []) => {
  let degisti = false;
  const yeni = satirlar.map(r => {
    const h = hedefler.find(x => x.hedef === r.hedef);
    if (!h || !h.taksitli || CEK_YONTEMLERI.has(r.yontem)) return r;
    if (h.acikTaksitler.some(t => Number(t.sira) === Number(r.sira) && r.sira != null)) return r;
    const ilk = h.acikTaksitler[0];
    if (!ilk) return r;
    degisti = true;
    return { ...r, sira: ilk.sira };
  });
  return degisti ? yeni : satirlar;
};

// R25: her çizilebilir hedefin İLK satırı tam kalanla (spec 0057 R12, R23: taksitli hedefte en yakın vadeli açık taksit, o
// taksidin kalanıyla), varsayılan yöntem ve hesapla dolar; ek satırlara dokunulmaz, dolu ilk
// satır değişmez (ikinci basış yalnız boş ilk satırları doldurur). Ciro asla (yöntem varsayılan, elle seçilemeyen değil).
export const hepsiniOde = (satirlar = [], hedefler = [], { yontem = "", hesapId = "", yeniAnahtar = () => Math.random() } = {}) => {
  let liste = [...satirlar];
  for (const h of hedefler) {
    if (h.pasif || h.kalanK <= 0) continue;
    const i = liste.findIndex(r => r.hedef === h.hedef);
    const ilk = h.taksitli ? h.acikTaksitler?.[0] : null;
    if (h.taksitli && !ilk) continue;
    const tutar = String(tl(ilk ? ilk.kalanK : h.kalanK)).replace(".", ","); // form durumu ham metin (0045)
    if (i < 0) liste = [...liste, { anahtar: yeniAnahtar(), hedef: h.hedef, sira: ilk ? ilk.sira : null, tutar, yontem, hesapId, aciklama: "" }];
    else if (bosMu(liste[i].tutar)) liste = liste.map((r, j) => (j === i ? { ...r, ...(ilk ? { sira: ilk.sira } : {}), tutar, yontem: r.yontem || yontem, hesapId: r.hesapId || hesapId } : r));
  }
  return liste;
};

// R6, R7, R8, R12, R29; 0046 R17, R22, R25: girişi doğrular ve hareketleri üretir. Dönüş { hatalar, hareketler, cek, uyari };
// hata varsa hareketler null (ya hep ya hiç, C3). hatalar = { satirlar: {[anahtar]: {alan: mesaj}}, hedefler: [], genel: [], mahsup: {} }.
// bosAtla: tutarı boş satır sessizce atılır (pencere, 0041 R12); formda eklenen satırın boş tutarı "sıfırdan büyük olmalı".
export const odemeGirisiHazirla = (kalem, {
  turMap, tarih, kip = "odeme", satirlar = [], mahsup = null, hesaplar = [], cekler = [], payments = [], hareketler = [], giderler = [],
  bugun = null, yururlukAy = null, alacakliAd = "", yeniCekId = "__yeni_cek__", bosAtla = false, hedefAdi = (h) => h,
  duzenlenen = null,
} = {}) => {
  const hatalar = { satirlar: {}, hedefler: [], genel: [], mahsup: {} };
  const bos = { hatalar, hareketler: [], cek: null, uyari: null };
  const hataVar = () => hatalar.genel.length || hatalar.hedefler.length || Object.keys(hatalar.satirlar).length || Object.keys(hatalar.mahsup).length;
  if (!kalem) return { ...bos, hatalar: { ...hatalar, genel: ["Ödenecek kalem bulunamadı."] }, hareketler: null };
  if (kip === "duzenle") return hareketDuzenlemeHazirla(kalem, { turMap, tarih, satirlar, mahsup, hesaplar, hareketler, giderler, bugun, yururlukAy, hedefAdi, duzenlenen });
  // R27: mahsup tek satırlık kip.
  if (kip === "mahsup") {
    if (!mahsup) return bos;
    const r = mahsupDogrula({ tarih, tutar: mahsup.tutar, aciklama: mahsup.aciklama, taksitId: satirTaksitId(kalem, mahsup.hedef || HEDEF.ANA, mahsup.sira) },
      { kalem, turMap, hareketler, giderler, bugun, yururlukAy });
    if (!r.kayit) return { hatalar: { ...hatalar, mahsup: r.hatalar }, hareketler: null, cek: null, uyari: null };
    return { hatalar, hareketler: [r.kayit], cek: null, uyari: null };
  }
  const dolu = satirlar.filter(r => !(bosAtla && bosMu(r.tutar) && !CEK_YONTEMLERI.has(r.yontem)));
  if (!dolu.length) return bos;
  if (!tarih) hatalar.genel.push("Ödeme tarihi girilmedi.");
  const dav = davranisOf(kalem, turMap);
  const hedefler = formOdemeHedefleri(kalem, turMap);
  const cekSatirlari = dolu.filter(r => CEK_YONTEMLERI.has(r.yontem));
  const normal = dolu.filter(r => !CEK_YONTEMLERI.has(r.yontem));
  // R12, AC-43: bir yazımda en çok bir çek satırı (ciro + kendi çek dahil).
  if (cekSatirlari.length > 1) for (const r of cekSatirlari.slice(1)) hatalar.satirlar[r.anahtar] = { yontem: TEK_CEK_HATASI };
  // R7, AC-41: sınır hedef başınadır; doğrulama hedef hedef aynı fonksiyondan geçer (pencereyle aynı, R8).
  let hareketlerN = [];
  const gruplar = new Map();
  for (const r of normal) gruplar.set(r.hedef || HEDEF.ANA, [...(gruplar.get(r.hedef || HEDEF.ANA) || []), r]);
  for (const [hedef, liste] of gruplar) {
    if (!hedefler.some(h => h.hedef === hedef)) { for (const r of liste) hatalar.satirlar[r.anahtar] = { hedef: "Bu kalemde böyle bir ödeme bölümü yok." }; continue; }
    if (liste.length > COKLU_ODEME_MAX_SATIR) { hatalar.hedefler.push(`${hedefAdi(hedef)}: en çok ${COKLU_ODEME_MAX_SATIR} satır girilebilir; fazlası için ayrı ödeme girin.`); continue; }
    const giris = liste.map(r => ({ taksitId: satirTaksitId(kalem, hedef, r.sira), tutar: bosMu(r.tutar) ? "0" : r.tutar, yontem: r.yontem || "", hesapId: r.hesapId ?? "", aciklama: r.aciklama || "" }));
    // Hata metnindeki ad: hedefin adı, taksitli hedefte taksit sırasıyla ("Resmi 2/3. taksit"; 0041 Q7 biçimi).
    const yerAdi = (taksitId) => {
      const sat = satirliMi(kalem) ? kalem.taksitler.filter(r => (r.hedef || HEDEF.ANA) === hedef) : [];
      const t = sat.find(r => String(r.id) === String(taksitId));
      return `${hedefAdi(hedef)}${t && sat.length > 1 ? ` ${t.sira}/${sat.length}. taksit` : ""}`;
    };
    const v = cokluOdemeDogrula({ tarih: tarih || "2000-01-01", satirlar: giris }, { kalem, turMap, hesaplar, hedefAdi: yerAdi });
    if (!v.kayitlar) {
      for (const [i, h] of Object.entries(v.hatalar.satirlar || {})) hatalar.satirlar[liste[Number(i)].anahtar] = h;
      // R6, AC-42: aşım hedefin adıyla söylenir (taksit katmanı hedefAdi'yi zaten kullanır; toplam katmanına ad eklenir).
      hatalar.hedefler.push(...(v.hatalar.hedefler || []).map(m => (m.startsWith("Satırların toplamı") ? `${hedefAdi(hedef)}: satırların${m.slice("Satırların".length)}` : m)));
      if (v.hatalar.genel) hatalar.genel.push(v.hatalar.genel);
    } else hareketlerN = [...hareketlerN, ...v.kayitlar.map(k => ({ ...k, tarih }))];
  }
  // Satırsız eski çok hedefli kalemde (R32) satırlar hedef taşımaz; hepsinin toplamı kalemin kalanını aşamaz.
  if (!satirliMi(kalem) && gruplar.size > 1 && !hataVar()) {
    const topK = hareketlerN.reduce((a, h) => a + kurus(h.tutar), 0);
    const kalanK = odemeHedefKalaniK(kalem, dav, null);
    if (topK > kalanK) hatalar.hedefler.push(`Satırların toplamı kalemin kalanını aşıyor (kalan ${tl(kalanK).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺).`);
  }
  let cek = null, uyari = null, hareketlerC = [];
  const cs = cekSatirlari[0];
  if (cs) {
    const h = hedefler.find(x => x.hedef === (cs.hedef || HEDEF.ANA));
    const kendi = cs.yontem === KENDI_CEK_YONTEMI;
    const alacakli = ciroAlacaklisi(kalem, turMap);
    // Spec 0057 R8, R19: çek satırı taksit seçmez; ANA'nın açık taksitlerinin (satırsız kalemde tek adayın) kalanından aynı
    // yere giden normal satırlar düşülür (plan Q3: çek diğer satırlardan sonra kalanı kapatır) ve tutar ciroAdaylari'nın
    // sırasıyla (en eski vade) ciroVarsayilanDagitim ile dağıtılır. Yeni hesap yok; ciroPlani / kendiCekPlani aynen.
    const digerK = (taksitId) => normal.filter(r => (r.hedef || HEDEF.ANA) === HEDEF.ANA && String(satirTaksitId(kalem, HEDEF.ANA, r.sira) ?? "") === String(taksitId ?? ""))
      .reduce((a, r) => a + satirTutarK(r), 0);
    const adaylar = h && h.hedef === HEDEF.ANA ? ciroAdaylari([kalem], alacakli, turMap).map(a => ({ ...a, kalanK: a.kalanK - digerK(a.taksitId) })).filter(a => a.kalanK > 0) : [];
    const kalanK = adaylar.reduce((a, x) => a + x.kalanK, 0);
    const satirHata = (m) => { hatalar.satirlar[cs.anahtar] = { ...(hatalar.satirlar[cs.anahtar] || {}), cek: m }; };
    const dagit = (tutarK) => ciroVarsayilanDagitim(adaylar, tutarK).filter(d => d.tutarK > 0);
    if (!h || h.hedef !== HEDEF.ANA) satirHata(kendi ? KENDI_CEK_YALNIZ_ANA_NEDENI : (CIRO_YALNIZ_ANA_NEDENI[cs.hedef] || "Bu bölüm çekle ödenemez."));
    else if (!ciroAdaylari([kalem], alacakli, turMap).length) satirHata("Bu bölüm çekle kapatılamaz.");
    else if (kalanK <= 0) satirHata("Bu bölümün kalanı diğer satırlarla kapanıyor; çek satırına gerek yok.");
    else if (!kendi) {
      const secili = ciroCekleri(cekler, payments).find(x => String(x.cek.id) === String(cs.cekId));
      if (!secili) satirHata("Ciro edilecek çek seçilmedi.");
      else {
        const p = ciroPlani({ cek: secili.cek, tutarK: secili.tutarK, currency: secili.currency, adaylar, dagitim: dagit(Math.min(secili.tutarK, kalanK)), tarih, alacakliAd, turMap });
        if (p.hatalar.length) satirHata(p.hatalar[0]);
        else { hareketlerC = p.hareketler; cek = p.cek; uyari = p.uyari; }
      }
    } else {
      const tK = satirTutarK(cs);
      if (tK > kalanK) satirHata(`Çek tutarı bu bölümün kalanını aşıyor (kalan ${tl(kalanK).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺).`);
      else {
        const p = kendiCekPlani({ form: { no: cs.cekNo, hesapId: cs.cekHesapId, vadeTarihi: cs.cekVade, tutar: cs.tutar }, hesaplar, adaylar,
          dagitim: dagit(tK), tarih, alacakli: { ...alacakli, ad: alacakliAd }, turMap, cekId: yeniCekId });
        if (p.hatalar.length) satirHata(p.hatalar[0]);
        else { hareketlerC = p.hareketler; cek = p.cek; }
      }
    }
  }
  return hataVar() ? { hatalar, hareketler: null, cek: null, uyari } : { hatalar, hareketler: [...hareketlerN, ...hareketlerC], cek, uyari };
};

// ── Spec 0073: var olan hareketin düzenlenmesi (C1 tek editör, C2 tek doğrulama) ───────────────────────────────────
export const GOC_DUZENLEME_NOTU = "Bu hareket eski ödeme işaretinden üretildi ve tutarsızdır; tutar girince normal ödeme olur.";
export const GOC_TUTAR_HATASI = "Tutar girilmedi; eski ödeme işaretinden üretilen hareket ancak tutar girilerek düzenlenir.";
export const CEK_YONTEMI_DUZENLEME_HATASI = "Çekli yöntem düzenlemede seçilemez; çekle ödemek için hareketi silip çekle yeniden girin.";
// R7, R8 (B-5): "bu hareket hariç" kuralı çağırana aittir ve burada kurulur: kalem, hareketler eksi düzenlenen hareketle
// YENİDEN zenginleştirilir (ödeme kolu kalanı _odenen'den okur), mahsup koluna aynı küme doğrudan geçer. Doğrulayıcıların
// imzası değişmez. Dönüş { hatalar, hareketler: null, guncellenen } (yeni hareket doğmaz, C5).
const hareketDuzenlemeHazirla = (kalem, { turMap, tarih, satirlar = [], mahsup = null, hesaplar = [], hareketler = [], giderler = [], bugun = null,
  yururlukAy = null, hedefAdi = (h) => h, duzenlenen = null }) => {
  const hatalar = { satirlar: {}, hedefler: [], genel: [], mahsup: {} };
  const sonuc = (guncellenen) => ({ hatalar, hareketler: null, cek: null, uyari: null, guncellenen });
  if (!duzenlenen) { hatalar.genel.push("Düzenlenecek hareket bulunamadı."); return sonuc(null); }
  if (duzenlenen.cekId != null) { hatalar.genel.push("Çeke bağlı hareket düzenlenemez."); return sonuc(null); }
  const haric = (hareketler || []).filter(h => String(h.id) !== String(duzenlenen.id));
  const zengin = odemeleriUygula([kalem], haric, turMap)[0];
  if (duzenlenen.tur === "mahsup") {
    const m = mahsup || {};
    const r = mahsupDogrula({ tarih, tutar: m.tutar, aciklama: m.aciklama, taksitId: satirTaksitId(zengin, m.hedef || HEDEF.ANA, m.sira) },
      { kalem: zengin, turMap, hareketler: haric, giderler, bugun, yururlukAy });
    if (!r.kayit) { hatalar.mahsup = r.hatalar; return sonuc(null); }
    return sonuc({ ...duzenlenen, ...r.kayit, id: duzenlenen.id });
  }
  const sat = satirlar[0] || {};
  if (!tarih) hatalar.genel.push("Ödeme tarihi girilmedi.");
  if (CEK_YONTEMLERI.has(sat.yontem)) { hatalar.satirlar[sat.anahtar] = { yontem: CEK_YONTEMI_DUZENLEME_HATASI }; return sonuc(null); }
  // R12: göç hareketi tutar girilerek normale döner; boş tutarla kaydedilemez.
  if (duzenlenen.tamKapatir && bosMu(sat.tutar)) { hatalar.satirlar[sat.anahtar] = { tutar: GOC_TUTAR_HATASI }; return sonuc(null); }
  const hedef = sat.hedef || HEDEF.ANA;
  const taksitId = satirliMi(zengin) ? satirTaksitId(zengin, hedef, sat.sira) : null;
  const yerAdi = (id) => {
    const l = satirliMi(zengin) ? zengin.taksitler.filter(x => (x.hedef || HEDEF.ANA) === hedef) : [];
    const t = l.find(x => String(x.id) === String(id));
    return `${hedefAdi(hedef)}${t && l.length > 1 ? ` ${t.sira}/${l.length}. taksit` : ""}`;
  };
  const v = cokluOdemeDogrula({ tarih: tarih || "2000-01-01", satirlar: [{ taksitId, tutar: bosMu(sat.tutar) ? "0" : sat.tutar, yontem: sat.yontem || "", hesapId: sat.hesapId ?? "", aciklama: sat.aciklama || "" }] },
    { kalem: zengin, turMap, hesaplar, hedefAdi: yerAdi });
  if (!v.kayitlar) {
    if (v.hatalar.satirlar?.[0]) hatalar.satirlar[sat.anahtar] = v.hatalar.satirlar[0];
    hatalar.hedefler.push(...(v.hatalar.hedefler || []));
    if (v.hatalar.genel) hatalar.genel.push(v.hatalar.genel);
    return sonuc(null);
  }
  if (hatalar.genel.length) return sonuc(null);
  // R5, R12, AC-36: kimlik, tür, bağ (gider kalemi), kaynak ve gocKaynak izi korunur; tamKapatir düşer.
  const k = v.kayitlar[0];
  return sonuc({ ...duzenlenen, tarih, tutar: k.tutar, yontem: k.yontem, hesapId: k.hesapId, taksitId: k.taksitId, aciklama: k.aciklama, tamKapatir: false, id: duzenlenen.id });
};

// Ciro satırının salt okunur tutarı (0046 Q5, 0053 Q3): çek tutarı ile (hedef kalanı − aynı hedefteki diğer satırlar)
// arasındaki küçük değer.
export const ciroTutariK = (cekSatiri, kalanK) => (cekSatiri ? Math.max(0, Math.min(cekSatiri.tutarK, kalanK)) : 0);

// Plan Q8: form ve pencere sonucunu tek yerde yazar (C3: hareketler ve çek aynı işleyicide). silinenler: yazılmadan
// önce düşülecek kayıtlı hareket kimlikleri (formda silme Kaydet'e kadar bekler, Q4). Dönüş yazılan hareketler.
// Spec 0073 R5, R20 (Q8): bütün hareket yazımlarının TEK kapısı. guncellenenler: kimliği korunarak yerinde değişen hareketler
// (düzenleme); ödeme ve mahsup penceresi, avans ve virman pencereleri, Kasa listeleri ve çalışan ekstresi buradan yazar.
export const odemeGirisiYaz = ({ hareketler = [], cek = null, silinenler = [], guncellenenler = [] }, { setHesapHareketleri, setCekler, uid }) => {
  const yeni = hareketler.map(h => ({ ...h, id: uid() }));
  const sil = new Set(silinenler.map(String));
  const gun = new Map(guncellenenler.map(h => [String(h.id), h]));
  if (yeni.length || sil.size || gun.size) {
    setHesapHareketleri(p => [...(p || []).filter(h => !sil.has(String(h.id))).map(h => gun.get(String(h.id)) || h), ...yeni]);
  }
  if (cek && setCekler) setCekler(p => (cek.yon === "verilen" ? [...(p || []), cek] : (p || []).map(c => (c.id === cek.id ? cek : c))));
  return yeni;
};
