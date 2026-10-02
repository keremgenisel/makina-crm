// Spec 0041: gider ödemesinin yöntemi ödemenin alanıdır (C2). Kalemin `odemeYontemi` alanı yalnız yeni ödemenin
// varsayılanıdır (R2); kalemin "nasıl ödendiği" burada ödemelerden türetilir ve saklanmaz. Saf motor, React'sız.
import { kurus, davranisOf, odemeleriUygula, odemeHedefleri, tl, DAVRANIS, HEDEF, HEDEF_SIRASI, KALEM_KAPATAN_TURLER } from "./gider";

export const YONTEM_MAHSUP = "Avanstan mahsup"; // R15: bir yöntem değil kapatma biçimi, kırılımda ayrı satır
export const YONTEM_BELIRSIZ = "Belirtilmemiş";  // R11: yöntemi boş ödeme (göçten gelen taksit hareketi dahil)
export const PERSONEL_ODEMELERI = "Personel ödemeleri"; // R18, Q4: ayrıntı kapalıyken dönem kartındaki tek satır
export const GOC_YONTEM_NOTU = "Eski kayıtlardan aktarılan ödemelerde yöntem bilgisi yok.";

const idEsit = (a, b) => a != null && b != null && String(a) === String(b);
const sirali = (liste) => liste.sort((a, b) => (a.tarih || "").localeCompare(b.tarih || "") || Number(a.id) - Number(b.id));
const kalemHareketleri = (k, hareketler) => sirali((hareketler || []).filter(h => h && KALEM_KAPATAN_TURLER.has(h.tur) && idEsit(h.giderId, k.id)));
// Triyaj bulgu 2: kalemi kapatan hareketler bir kez giderId'ye göre gruplanır (toplu hesapta kalem × hareket taraması yok).
export const hareketGruplari = (hareketler) => {
  const m = new Map();
  for (const h of hareketler || []) {
    if (!h || !KALEM_KAPATAN_TURLER.has(h.tur) || h.giderId == null) continue;
    const key = String(h.giderId);
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(h);
  }
  for (const l of m.values()) sirali(l);
  return m;
};

// Kalemi kapatan her hareketin kapattığı tutar (kuruş). yalnizAna: tedarikçi/çalışan ekstresi gibi yalnız ana hedefe
// (kiraya veren, tedarikçi, çalışan) düşen pay; aksi hâlde bütün hedefler (kirada vergi dairesi dahil, Q1).
// Tutarlı hareketin payı tutarıdır; ama tutarsız göç hareketi (tamKapatir) varsa, yalnız ana hedef istenmişse ya da
// hareket tutarlarının toplamı motorun kapanan tutarını tutmuyorsa (kalem tutarı ödemeden sonra düşürülmüş, fazla ödeme;
// triyaj bulgu 1) hareketler sırayla eklenip motor yeniden çalıştırılır ve kalandaki fark o hareketin payıdır (R11, Q2,
// C9). Böylece kırılımın toplamı her durumda motorun ve ekstrenin "ödenen"iyle aynıdır. grup: kalemin önceden
// gruplanmış hareketleri (hareketGruplari); verilmezse listeden süzülür.
export const hareketPaylari = (k, hareketler, turMap, { yalnizAna = false, grup = null } = {}) => {
  const hs = grup || kalemHareketleri(k, hareketler);
  if (!hs.length) return [];
  const dav = davranisOf(k, turMap);
  const kalan = (liste) => {
    const hedefler = odemeHedefleri(odemeleriUygula([k], liste, turMap)[0], dav);
    return yalnizAna ? (hedefler.find(h => h.hedef === HEDEF.ANA)?.kalanK || 0) : hedefler.reduce((a, h) => a + h.kalanK, 0);
  };
  const ilk = kalan([]);
  if (!yalnizAna && !hs.some(h => h.tamKapatir)) {
    const tutarlar = hs.reduce((a, h) => a + kurus(h.tutar), 0);
    if (tutarlar === ilk - kalan(hs)) return hs.map(h => ({ hareket: h, payK: kurus(h.tutar) })).filter(p => p.payK > 0);
  }
  const r = [];
  let once = ilk;
  hs.forEach((h, i) => { const sonra = kalan(hs.slice(0, i + 1)); const pay = once - sonra; once = sonra; if (pay > 0 || h.tamKapatir) r.push({ hareket: h, payK: pay }); });
  return r;
};

// Spec 0051 R8 (Q1): her hareketin HANGİ HEDEFE ne kadar düştüğü. hareketPaylari'nın hedef bazlı kardeşi: hareketler sırayla
// motordan (odemeleriUygula) geçer, her adımda hedef başına kalan farkı o hareketin o hedefe payıdır. Satırlı kalemde taksit
// bağından, satırsız kalemde motorun dağıtımından (önce ana, artan sonraki hedefe) aynı yolla çıkar; tutarsız göç hareketi
// de doğru dağılır. Dönüş: Map(hareketId → [{hedef, payK}], HEDEF_SIRASI sırasıyla). Pay bulunamayan hareket boş dizi alır
// (fazla ödeme, silinmiş kalem; R11: çağıran bugünkü metni korur). hareketPaylari değişmez.
// Triyaj: aynı günlü hareketlerin sırası motorla (odemeleriUygula) AYNI kuraldır: tarihe göre kararlı sıralama, eşitlikte
// dizideki giriş sırası. Kimliğe göre sıralanmaz (uid() rastgele; giriş sırasını yansıtmaz), yoksa satırsız iki hedefli
// kalemde aynı gün girilen iki ödemenin etiketi motorun dağılımıyla ters düşerdi.
export const hareketHedefPaylari = (k, hareketler, turMap) => {
  const r = new Map();
  if (!k) return r;
  const hs = (hareketler || []).filter(h => h && KALEM_KAPATAN_TURLER.has(h.tur) && idEsit(h.giderId, k.id))
    .sort((a, b) => (a.tarih || "").localeCompare(b.tarih || ""));
  if (!hs.length) return r;
  const dav = davranisOf(k, turMap);
  const kalanlar = (liste) => Object.fromEntries(odemeHedefleri(odemeleriUygula([k], liste, turMap)[0], dav).map(h => [h.hedef, h.kalanK]));
  let once = kalanlar([]);
  hs.forEach((h, i) => {
    const sonra = kalanlar(hs.slice(0, i + 1));
    const paylar = HEDEF_SIRASI.filter(hd => hd in once).map(hd => ({ hedef: hd, payK: (once[hd] || 0) - (sonra[hd] || 0) })).filter(p => p.payK > 0);
    r.set(String(h.id), paylar);
    once = sonra;
  });
  return r;
};

export const yontemAdi = (h) => (h?.tur === "mahsup" ? YONTEM_MAHSUP : String(h?.yontem || "").trim() || YONTEM_BELIRSIZ);

// Yöntem → tutar satırları (aynı yöntemin birden çok ödemesi tek satırda toplanır, R12). Büyükten küçüğe.
const topla = (paylar) => {
  const m = new Map();
  for (const p of paylar) { const y = yontemAdi(p.hareket); m.set(y, (m.get(y) || 0) + p.payK); }
  return [...m].map(([yontem, tutarK]) => ({ yontem, tutarK })).filter(s => s.tutarK > 0)
    .sort((a, b) => b.tutarK - a.tutarK || a.yontem.localeCompare(b.yontem, "tr"));
};

// R3, R4: kalemin türetilen yöntemi. karar: "yok" (kayıtlı ödeme yok, yöntem yazılmaz) | "tek" | "karma".
// Mahsup ayrı satırdır ve "karma" kararında sayılır (R15). gocVar: göçten gelen ödeme var (AC-19 notu).
export const yontemKirilimi = (k, hareketler, turMap, { grup = null } = {}) => {
  const paylar = hareketPaylari(k, hareketler, turMap, { grup });
  const satirlar = topla(paylar);
  const karar = satirlar.length === 0 ? "yok" : satirlar.length === 1 ? "tek" : "karma";
  return {
    satirlar, karar,
    etiket: karar === "yok" ? null : karar === "tek" ? satirlar[0].yontem : "Karma",
    toplamK: satirlar.reduce((a, s) => a + s.tutarK, 0),
    gocVar: paylar.some(p => p.hareket.kaynak === "goc"),
  };
};

// Kalem kimliği → kırılım (liste ve pencere bir kez hesaplar).
export const yontemKirilimlari = (kalemler, hareketler, turMap) => {
  const m = new Map();
  if (!Array.isArray(hareketler)) return m;
  const gruplar = hareketGruplari(hareketler);
  for (const k of kalemler || []) m.set(String(k.id), yontemKirilimi(k, hareketler, turMap, { grup: gruplar.get(String(k.id)) || [] }));
  return m;
};

// R10, Q3: dönemin kalemlerine yapılan ödemelerin yöntem kırılımı (ödeme tarihinden bağımsız). Q4: personel kalemleri
// ayrı döner; ekran ayrıntı kapalıyken onları tek "Personel ödemeleri" satırında gösterir.
export const donemYontemKirilimi = (kalemler, hareketler, turMap) => {
  const genel = [], personel = [];
  let gocVar = false;
  const gruplar = hareketGruplari(hareketler);
  for (const k of kalemler || []) {
    const paylar = hareketPaylari(k, hareketler, turMap, { grup: gruplar.get(String(k.id)) || [] });
    if (paylar.some(p => p.hareket.kaynak === "goc")) gocVar = true;
    (davranisOf(k, turMap) === DAVRANIS.PERSONEL ? personel : genel).push(...paylar);
  }
  const satirlar = topla(genel), personelSatirlar = topla(personel);
  const toplam = (l) => l.reduce((a, s) => a + s.tutarK, 0);
  return { satirlar, personelSatirlar, personelK: toplam(personelSatirlar), toplamK: toplam(satirlar) + toplam(personelSatirlar), gocVar };
};

// ── Spec 0059 R20, R31: ödeme hedefinin adı ve etiketi (GiderAlanlari.jsx'ten taşındı, orada yeniden dışa verilir) ──
export const tl2 = (n) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(n) || 0) + " ₺";
// Spec 0060 R3, R29 (AC-27): hedef adlarının TEK tablosu, iki hâl. `yonelme` ödeme cümlesi ve hata metni içindir
// ("Kiraya verene", "Vergi dairesine (stopaj)"); `yalin` rozet ve başlık içindir ("Kiraya veren", "Vergi dairesi").
// İkinci bir ad listesi açmayın; ekranlar hedefAdi / hedefBasligi / taksitAdi'yi çağırır (kaynak taraması var).
// `gider.VERGI_DAIRESI` borç özetindeki TARAF adıdır, bu tablodaki stopaj HEDEF adı ayrı kavramdır (R24).
const ad = (yonelme, yalin = yonelme) => ({ yonelme, yalin });
export const HEDEF_ADLARI = {
  genel: { [HEDEF.ANA]: ad("Tedarikçiye", "Tedarikçi"), [HEDEF.ELDEN]: ad("Elden"), [HEDEF.EK_RESMI]: ad("Ek ödeme (resmi)"),
    [HEDEF.EK_ELDEN]: ad("Ek ödeme (elden)"), [HEDEF.STOPAJ]: ad("Vergi dairesine (stopaj)", "Vergi dairesi") },
  kira: { [HEDEF.ANA]: ad("Kiraya verene", "Kiraya veren") },
  // Spec 0054 R8, R16 (0042 R15'i genişletir): birden çok hedefli personelde ayırt edici adlar, tek hedefli personelde "Çalışan".
  personel: { [HEDEF.ANA]: ad("Maaş (resmi)"), [HEDEF.ELDEN]: ad("Maaş (elden)"), [HEDEF.EK_RESMI]: ad("Ek ödeme (resmi)"), [HEDEF.EK_ELDEN]: ad("Ek ödeme (elden)") },
  personelTek: ad("Çalışana", "Çalışan"),
};
// Geriye dönük: genel tablonun yönelme hâli (eski HEDEF_AD).
export const HEDEF_AD = Object.fromEntries(Object.entries(HEDEF_ADLARI.genel).map(([k, v]) => [k, v.yonelme]));
const hedefAdKaydi = (hedef, davranis, cokHedef) => (hedef === HEDEF.ANA && davranis === DAVRANIS.KIRA ? HEDEF_ADLARI.kira[HEDEF.ANA]
  : davranis === DAVRANIS.PERSONEL && HEDEF_ADLARI.personel[hedef] ? (cokHedef ? HEDEF_ADLARI.personel[hedef] : HEDEF_ADLARI.personelTek)
  : HEDEF_ADLARI.genel[hedef]);
// cokHedef: kalemin birden çok ödeme hedefi var mı (cokHedefliMi ya da cokHedefliSatirlar).
export const hedefAdi = (hedef, davranis, cokHedef = false) => hedefAdKaydi(hedef, davranis, cokHedef)?.yonelme;
export const hedefBasligi = (hedef, davranis, cokHedef = false) => hedefAdKaydi(hedef, davranis, cokHedef)?.yalin;
// Ödeme satırlarından (taksitler) birden çok hedef var mı; satırı olmayan hedef sayılmaz.
export const cokHedefliSatirlar = (satirlar) => new Set((satirlar || []).map(r => r.hedef || HEDEF.ANA)).size > 1;
// Spec 0051 R8–R10 (Q4, Q5): bir ödeme hareketinin kapattığı hedefin etiketi. Yalnız birden çok ödeme hedefi olan kalemde
// (stopajlı kira, resmi ve eldeni olan personel) yazılır; aksi hâlde null (bugünkü metin korunur, R11 dahil). Ad TEK
// kaynaktan: hedefAdi; çok hedeflilik cokHedefliMi'den (spec 0054 R16: eski eldenHedefliMi || personelIkiHedef birleşimi
// dört hedefte eksik kalıyordu; ek ödemesi olan ama eldeni olmayan kalem).
// paylar: odemeYontemi.hareketHedefPaylari'nın o hareket için [{hedef, payK}]; iki hedefe bölünmüşse tutarlarıyla.
// Spec 0059 triyaj: tutarBicimi (kuruş → metin) çağıranındır; ekranlar varsayılan tl2'yi, rapor belgenin fmtCur biçimini verir.
export const cokHedefliMi = (kalem, davranis) => !!kalem && odemeHedefleri(kalem, davranis).filter(h => h.toplamK > 0).length > 1;
// Spec 0060 R4, R35 (AC-29): bir taksit satırının adı, ödeme penceresi ve Kasa hareket listesi için TEK kaynak (OdemeGirisi'nden
// taşındı). Hedefin birden çok taksiti varsa "Ad n/m. taksit", tek satırlı hedefte yalnız ad; satır bulunamazsa null.
export const taksitAdi = (kalem, taksitId, davranis) => {
  const r = (kalem?.taksitler || []).find(x => String(x.id) === String(taksitId));
  if (!r) return null;
  const h = r.hedef || HEDEF.ANA;
  const n = kalem.taksitler.filter(x => (x.hedef || HEDEF.ANA) === h).length;
  return `${hedefAdi(h, davranis, cokHedefliMi(kalem, davranis))}${n > 1 ? ` ${r.sira}/${n}. taksit` : ""}`;
};
export const hedefEtiketi = (kalem, davranis, paylar, tutarBicimi = (payK) => tl2(tl(payK))) => {
  if (!kalem || !paylar?.length || !cokHedefliMi(kalem, davranis)) return null;
  if (paylar.length === 1) return hedefAdi(paylar[0].hedef, davranis, true);
  return paylar.map(p => `${hedefAdi(p.hedef, davranis, true)} ${tutarBicimi(p.payK)}`).join(" + ");
};
