// Çek portföyü ve ciro (spec 0040; R1–R19, C1–C13; plan Q1–Q10): saf motor, React'sız.
// Çek kaydı (bölüm `cekler`) yalnız kendi alanlarını saklar (Q2): {id, paymentId, no, banka, kesideci, tur, durum, gecmis}.
// Tutar, para birimi, vade (`vadeTarihi`), alınma tarihi ve kimden alındığı bağlı tahsilattan (`payments`) okunur.
// Durumun tek kaynağı çek kaydıdır (C10). Ciro bir gider ödemesinin aracıdır: `cekId` taşıyan, hesapsız ödeme hareketleri
// (0024 `hesapHareketleri`, R5, R7). Ciro tahsilata ve müşteri kaydına yazmaz (Q3); gelir tarihi çekin geçmişinden okunur.
import { kurus, tl, satirliMi, odemeHedefleri, davranisOf, DAVRANIS, HEDEF } from "./gider";
import { odemeDogrula } from "./kasa";
import { parseMoney, trLower } from "./utils";

export const CEK_DURUM = { PORTFOY: "portfoy", TAHSILE: "tahsile", TAHSIL: "tahsil", CIRO: "ciro", KARSILIKSIZ: "karsiliksiz" };
export const CEK_DURUM_AD = { portfoy: "Portföyde", tahsile: "Tahsile verildi", tahsil: "Tahsil edildi", ciro: "Ciro edildi", karsiliksiz: "Karşılıksız",
  yazildi: "Yazıldı", odendi: "Ödendi", iptal: "İptal edildi" };
// Spec 0049 B (R8): verilen çekin durumları. "yazildi": alacaklıda, borç kapandı, para henüz çıkmadı; "odendi": banka ödedi,
// hesaptan çıktı; "karsiliksiz" / "iptal": kapattığı gider borcu yeniden açılır.
export const VERILEN_DURUM = { YAZILDI: "yazildi", ODENDI: "odendi", KARSILIKSIZ: "karsiliksiz", IPTAL: "iptal" };
// R9: gider ödeme yönteminde "Çek (kendi)" elle seçilemez; yalnız kendi çekimizi yazma işlemi atar (ciro deseni).
export const KENDI_CEK_YONTEMI = "Çek (kendi)";
export const CEK_TURLERI = [{ value: "hamiline", label: "Hamiline" }, { value: "resmi", label: "Resmi" }];
export const CEK_TUR_AD = Object.fromEntries(CEK_TURLERI.map(t => [t.value, t.label]));
// R19: gider ödeme yönteminde "Çek (ciro)" elle seçilemez; yalnız ciro işlemi atar.
export const CIRO_YONTEMI = "Çek (ciro)";
export const TAM_CIRO_NOTU = "Çekin arkasına tam ciro yazın: ciro edilenin unvanı, vergi kimlik numarası ve adresi (KDV müteselsil sorumluluğu).";
export const PORTFOY_NOTU = "Bu ekran müşteri tahsilat çeklerini ve portföye elle eklenen çekleri kapsar; servis, Extra Kalıp ve yedek parça çekleri kayıtlarında izlenir.";
// Spec 0049: çekin yönü. Alınan çek (varsayılan; tahsilata bağlı ya da portföye elle eklenmiş "bağsız") ve fabrikanın kendi
// çek defterinden yazdığı verilen çek. Eski kayıtta alan yoktur, alınan sayılır.
export const CEK_YON = { ALINAN: "alinan", VERILEN: "verilen" };
export const yonOf = (c) => (c?.yon === CEK_YON.VERILEN ? CEK_YON.VERILEN : CEK_YON.ALINAN);
// R6, Q11: bağsız alınan çekin "tahsil edildi" işareti hiçbir bakiyeye girmez (arkasında tahsilat kaydı yok, X4).
export const BAGSIZ_TAHSIL_NOTU = "Bu çekin tahsilat kaydı yok; tahsil edildi işareti hiçbir hesabın bakiyesine girmez ve gelir yazmaz.";
export const BAGSIZ_GELIR_NOTU = "Elle eklenen çek gelir değildir: tahsilat kaydı yoktur, Finans'a ve aylık rapora girmez; yalnız portföyde duran bir kıymettir.";

// R3: elle yapılabilen geçişler. "ciro edildi"ye yalnız ciro işlemiyle girilir, ondan yalnız ciro iptali (portföye) ya da
// karşılıksız (hareketleri silerek) çıkılır; bunlar kendi fonksiyonlarındadır.
const GECISLER = {
  portfoy: ["tahsile", "tahsil", "karsiliksiz"],
  tahsile: ["tahsil", "karsiliksiz", "portfoy"],
  tahsil: ["karsiliksiz", "portfoy"],
  ciro: [],
  karsiliksiz: ["portfoy"],
};
export const elleGecilebilir = (durum) => GECISLER[durum] || [];

const idEsit = (a, b) => a != null && b != null && String(a) === String(b);
const kuruslu = (k) => tl(k).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// R14, AC-31, AC-32: numara ve banka zorunlu; aynı banka + numara uyarı verir, engellemez. Tutar tahsilattan gelir (Q2).
export const cekDogrula = (form, { cekler = [], tutar = null } = {}) => {
  const hatalar = {};
  const no = String(form?.no || "").trim(), banka = String(form?.banka || "").trim();
  if (!no) hatalar.no = "Çek numarası girilmedi.";
  if (!banka) hatalar.banka = "Banka girilmedi.";
  if (tutar != null && (String(tutar).trim().startsWith("-") || !(parseMoney(tutar) > 0))) hatalar.tutar = "Çek tutarı sıfırdan büyük olmalı.";
  const tur = CEK_TUR_AD[form?.tur] ? form.tur : "hamiline";
  // Spec 0049: yinelenen çek uyarısı yalnız aynı yöndeki çekler arasında (kendi çekimizin numarası alınanla çakışabilir).
  const ayni = no && banka && cekler.find(c => !idEsit(c.id, form?.id) && yonOf(c) === yonOf(form) && trLower(String(c.banka || "").trim()) === trLower(banka) && String(c.no || "").trim() === no);
  const uyari = ayni ? `Aynı banka ve numaralı bir çek zaten kayıtlı (${banka} · ${no}). Banka numaraları müşteriler arasında tekrar edebildiği için kayıt engellenmez.` : null;
  if (Object.keys(hatalar).length) return { hatalar, uyari, kayit: null };
  return { hatalar, uyari, kayit: { no, banka, kesideci: String(form?.kesideci || "").trim(), tur } };
};
// Spec 0049 R1, R2 (Q2, Q11): tahsilata bağlı olmayan alınan çek. Tutar, para birimi, vade, alınma tarihi ve kimden bilgisi
// çekin kendi alanlarıdır; kimden serbest metin ya da müşteri (`customerId`).
export const bagsizCekDogrula = (form, { cekler = [] } = {}) => {
  const r = cekDogrula({ ...form, yon: CEK_YON.ALINAN }, { cekler, tutar: form?.tutar ?? "" });
  const hatalar = { ...r.hatalar };
  if (!form?.vadeTarihi) hatalar.vadeTarihi = "Vade girilmedi.";
  if (!form?.tarih) hatalar.tarih = "Alınma tarihi girilmedi.";
  const customerId = form?.customerId === "" || form?.customerId == null ? null : form.customerId;
  const kimden = String(form?.kimden || "").trim();
  if (customerId == null && !kimden) hatalar.kimden = "Çekin kimden alındığı girilmedi.";
  if (Object.keys(hatalar).length) return { hatalar, uyari: r.uyari, kayit: null };
  return { hatalar, uyari: r.uyari, kayit: { ...r.kayit, yon: CEK_YON.ALINAN, paymentId: null, tutar: parseMoney(form.tutar), currency: form.currency || "TRY",
    vadeTarihi: form.vadeTarihi, tarih: form.tarih, customerId, kimden: customerId == null ? kimden : "" } };
};
export const yeniBagsizCek = (kayit, id) => ({ id, ...kayit, durum: CEK_DURUM.PORTFOY, gecmis: [{ tarih: kayit.tarih, durum: CEK_DURUM.PORTFOY, not: "Portföye elle eklendi" }] });
// Spec 0049 R2 (Q2): çekin tutar, para birimi, vade, alınma tarihi ve kimden bilgisinin TEK okuma yolu. Bağlı çekte hepsi
// okuma anında tahsilattan (kopyalanmaz; tahsilat düzenlenince kendiliğinden güncel, AC-10), bağsız çekte kendi alanlarından.
// pById: silinmemiş tahsilatlar (kimlik → tahsilat). Tahsilatı çözülmeyen bağlı çek null döner (silinmiş tahsilat, 0040 Q7).
export const tahsilatHaritasi = (payments = []) => new Map((payments || []).filter(p => p && !p.deletedAt).map(p => [String(p.id), p]));
export const cekBilgisi = (c, pById) => {
  if (!c) return null;
  if (c.paymentId != null) {
    const p = pById.get(String(c.paymentId));
    if (!p) return null;
    return { bagli: true, odeme: p, tutarK: kurus(parseMoney(p.tutar)), currency: p.currency || "TRY", vade: p.vadeTarihi || "", tarih: p.tarih || "",
      customerId: p.customerId ?? null, kimden: "" };
  }
  return { bagli: false, odeme: null, tutarK: kurus(Number(c.tutar) || 0), currency: c.currency || "TRY", vade: c.vadeTarihi || "", tarih: c.tarih || "",
    customerId: c.customerId ?? null, kimden: c.kimden || "" };
};
// R5, AC-7: bağsız çek silinebilir; ciro edilmişse önce ciro iptali.
export const bagsizCekSilinebilirMi = (c) => !!c && c.paymentId == null && c.durum !== CEK_DURUM.CIRO;
export const yeniCek = (alanlar, paymentId, tarih, id) => ({
  id, paymentId, ...alanlar, durum: CEK_DURUM.PORTFOY, gecmis: [{ tarih, durum: CEK_DURUM.PORTFOY, not: "Alındı" }],
});

// Gelir tarihi (R6, Q3): en son "tahsil edildi" ya da "ciro edildi" geçişinin tarihi. utils.tahsilatTarihiOf bunu okur.
export const cekGelirTarihi = (cek) => {
  if (!cek || (cek.durum !== CEK_DURUM.TAHSIL && cek.durum !== CEK_DURUM.CIRO)) return null;
  const g = (cek.gecmis || []).filter(x => x.durum === cek.durum).map(x => x.tarih).filter(Boolean).sort();
  return g[g.length - 1] || null;
};

// Q3: tahsilatları çek durumuyla okuma anında zenginleştirir (0024 odemeleriUygula deseni). Kayıt yazılmaz; App bir kez
// çağırır. `_cek`: {id, no, banka, kesideci, tur, durum, gelirTarihi}. Çek kaydı yoksa tahsilat olduğu gibi döner (Q4).
// Zenginleştirme her seferinde sıfırdan yapılır: kayda yanlışlıkla sızmış eski bir `_cek` yok sayılır.
export const cekAlaniniAyikla = (p) => { if (!p || !("_cek" in p)) return p; const { _cek, ...r } = p; return r; };
export const odemeleriAyikla = (payments = []) => (payments.some(p => p && "_cek" in p) ? payments.map(cekAlaniniAyikla) : payments);
export const cekleriUygula = (payments = [], cekler = []) => {
  const byPayment = new Map((Array.isArray(cekler) ? cekler : []).filter(c => c && c.paymentId != null).map(c => [String(c.paymentId), c]));
  if (!byPayment.size) return odemeleriAyikla(payments);
  return payments.map(p => {
    const c = p && p.yontem === "Çek" ? byPayment.get(String(p.id)) : null;
    if (!c) return cekAlaniniAyikla(p);
    return { ...cekAlaniniAyikla(p), _cek: { id: c.id, no: c.no, banka: c.banka, kesideci: c.kesideci, tur: c.tur, durum: c.durum, gelirTarihi: cekGelirTarihi(c) } };
  });
};

// R3, AC-26: elle durum değişikliği. Yasak geçişte nedeni yazan hata döner, çek değişmez.
export const cekDurumDegistir = (cek, hedef, tarih, not = "") => {
  if (!cek) return { hata: "Çek bulunamadı." };
  if (hedef === cek.durum) return { hata: "Çek zaten bu durumda." };
  if (hedef === CEK_DURUM.CIRO) return { hata: "Çek yalnız ciro işlemiyle ciro edilir." };
  if (cek.durum === CEK_DURUM.CIRO) {
    return { hata: hedef === CEK_DURUM.TAHSIL
      ? "Ciro edilmiş çek tahsil edildi yapılamaz: çek artık bizde değil (çift sayım)."
      : "Ciro edilmiş çek yalnız ciro iptaliyle portföye döner ya da karşılıksız işaretlenir." };
  }
  if (!elleGecilebilir(cek.durum).includes(hedef)) return { hata: `${CEK_DURUM_AD[cek.durum]} durumundaki çek ${CEK_DURUM_AD[hedef] || hedef} durumuna geçemez.` };
  return { cek: { ...cek, durum: hedef, gecmis: [...(cek.gecmis || []), { tarih, durum: hedef, not }] } };
};

export const ciroHareketleri = (cekId, hareketler = []) => (hareketler || []).filter(h => h && idEsit(h.cekId, cekId));

// R11, AC-15, AC-28: karşılıksız. Ciro edilmişse o çekin hareketleri silinir (borç kendiliğinden yeniden açılır), çek
// portföye dönmez; durumu karşılıksız olur ve geçmişe iz düşer. Gelir durumdan türediği için kendiliğinden çıkar.
export const cekKarsiliksiz = (cek, hareketler = [], tarih) => {
  if (!cek) return { hata: "Çek bulunamadı." };
  if (cek.durum === CEK_DURUM.KARSILIKSIZ) return { hata: "Çek zaten karşılıksız." };
  const ciroluydu = cek.durum === CEK_DURUM.CIRO;
  if (!ciroluydu && !elleGecilebilir(cek.durum).includes(CEK_DURUM.KARSILIKSIZ)) return { hata: "Bu durumdaki çek karşılıksız işaretlenemez." };
  const silinen = ciroluydu ? ciroHareketleri(cek.id, hareketler) : [];
  const silinenIdler = new Set(silinen.map(h => String(h.id)));
  return {
    cek: { ...cek, durum: CEK_DURUM.KARSILIKSIZ, gecmis: [...(cek.gecmis || []), { tarih, durum: CEK_DURUM.KARSILIKSIZ, not: ciroluydu ? "Karşılıksız, ciro geri alındı" : "Karşılıksız" }] },
    hareketler: hareketler.filter(h => !silinenIdler.has(String(h?.id))),
    silinen,
  };
};

// R15, AC-27: ciro iptali. Hareketler silinir, çek portföye döner, geçmişe iz düşer.
export const ciroIptal = (cek, hareketler = [], tarih) => {
  if (!cek || cek.durum !== CEK_DURUM.CIRO) return { hata: "Yalnız ciro edilmiş çekin cirosu iptal edilir." };
  const silinenIdler = new Set(ciroHareketleri(cek.id, hareketler).map(h => String(h.id)));
  return {
    cek: { ...cek, durum: CEK_DURUM.PORTFOY, gecmis: [...(cek.gecmis || []), { tarih, durum: CEK_DURUM.PORTFOY, not: "Ciro iptal edildi" }] },
    hareketler: hareketler.filter(h => !silinenIdler.has(String(h?.id))),
  };
};

// ── Ciro (R4–R9, R16; Q8) ─────────────────────────────────────────────────────
const anaKalanK = (k, dav) => odemeHedefleri(k, dav).find(h => h.hedef === HEDEF.ANA)?.kalanK || 0;
// Alacaklıya göre kapatılabilecek hedefler (ödenmemiş ana hedef): tedarikçi → onun kalemleri; çalışan → onun maaş
// kalemleri; serbest ad → tedarikçisi seçilmemiş kalemler. Taksitli kalemde her açık ana taksit ayrı hedeftir (0024 R18).
// kalemler: odemeleriUygula'dan geçmiş kalemler. Sıra: vade (boşlar sonda), sonra tarih.
export const ciroAdaylari = (kalemler = [], alacakli, turMap) => {
  if (!alacakli) return [];
  const r = [];
  for (const k of kalemler) {
    if (!k || k.deletedAt) continue;
    const dav = davranisOf(k, turMap);
    const uygun = alacakli.tur === "tedarikci" ? dav !== DAVRANIS.PERSONEL && idEsit(k.tedarikciId, alacakli.id)
      : alacakli.tur === "calisan" ? dav === DAVRANIS.PERSONEL && idEsit(k.calisanId, alacakli.id)
      : dav !== DAVRANIS.PERSONEL && k.tedarikciId == null;
    if (!uygun) continue;
    if (satirliMi(k)) {
      for (const t of k.taksitler) {
        if ((t.hedef || HEDEF.ANA) !== HEDEF.ANA) continue;
        const kalanK = Math.max(0, kurus(t.tutar) - (t._odenenK || 0));
        if (kalanK > 0) r.push({ anahtar: `${k.id}:${t.id}`, giderId: k.id, taksitId: t.id, kalanK, vade: t.vade || null, kalem: k, sira: t.sira });
      }
    } else {
      const kalanK = anaKalanK(k, dav);
      if (kalanK > 0) r.push({ anahtar: `${k.id}:`, giderId: k.id, taksitId: null, kalanK, vade: k.sonOdemeTarihi || null, kalem: k, sira: 0 });
    }
  }
  return r.sort((a, b) => (a.vade || "9999").localeCompare(b.vade || "9999") || String(a.kalem.tarih).localeCompare(String(b.kalem.tarih)) || a.sira - b.sira);
};
// Varsayılan dağıtım (Q8): en eski vadeden başlayarak çek tutarı bitene kadar; kuruş.
export const ciroVarsayilanDagitim = (adaylar = [], cekK) => {
  let kalan = cekK;
  return adaylar.map(a => { const t = Math.max(0, Math.min(a.kalanK, kalan)); kalan -= t; return { anahtar: a.anahtar, tutarK: t }; });
};

// R4–R9, R16, AC-6–AC-13, AC-29: ciro planı. Çek portföyde ve TL olmalı; en az bir hedefe pozitif tutar; dağıtılan toplam çek
// tutarını aşamaz; her hareket 0024 odemeDogrula'dan geçer (tek hedef ve kalan sınırı, hesapsız). Fark uyarıdır (R8).
// dagitim: [{anahtar, tutarK}]; adaylar: ciroAdaylari sonucu. Dönüş: {hatalar} | {hareketler (kimliksiz), cek, farkK, uyari}.
// Spec 0049 (Q2): tutar ve para birimi çek bilgisinden (tutarK, currency); eski çağrı `odeme` ile de çalışır.
export const ciroPlani = ({ cek, odeme = null, tutarK = null, currency = null, adaylar = [], dagitim = [], tarih, alacakliAd = "", turMap } = {}) => {
  const hatalar = [];
  if (!cek || (!odeme && tutarK == null)) return { hatalar: ["Çek bulunamadı."] };
  if (cek.durum !== CEK_DURUM.PORTFOY) hatalar.push(cek.durum === CEK_DURUM.CIRO ? "Bu çek zaten ciro edilmiş; bir çek bir kez ciro edilir." : `${CEK_DURUM_AD[cek.durum]} durumundaki çek ciro edilemez; yalnız portföydeki çek ciro edilir.`);
  if ((currency || odeme?.currency || "TRY") !== "TRY") hatalar.push("Yalnız TL çek ciro edilebilir: gider ödemeleri TL'dir.");
  if (!tarih) hatalar.push("Ciro tarihi girilmedi.");
  if (!String(alacakliAd || "").trim()) hatalar.push("Kime ciro edildiği girilmedi.");
  const cekK = tutarK != null ? tutarK : kurus(parseMoney(odeme.tutar));
  const secili = dagitim.filter(d => d.tutarK > 0);
  if (!secili.length) hatalar.push("En az bir gider kalemine tutar dağıtın.");
  const toplamK = secili.reduce((a, d) => a + d.tutarK, 0);
  if (toplamK > cekK) hatalar.push(`Dağıtılan toplam çek tutarını aşamaz (çek ${kuruslu(cekK)} ₺, dağıtılan ${kuruslu(toplamK)} ₺).`);
  if (hatalar.length) return { hatalar };
  const d = dagitimHareketleri({ secili, adaylar, cekK, tarih, turMap, cekId: cek.id, yontem: CIRO_YONTEMI, aciklama: `Çek ${cek.no} · ${cek.banka}`, bayrak: { ciro: true } });
  if (d.hatalar) return { hatalar: d.hatalar };
  return { hatalar: [], ...d,
    cek: { ...cek, durum: CEK_DURUM.CIRO, gecmis: [...(cek.gecmis || []), { tarih, durum: CEK_DURUM.CIRO, not: `Ciro: ${String(alacakliAd).trim()}` }] } };
};
// Spec 0049 Q5 (C2): ciro ile kendi çekimizin ortak çekirdeği. Her dağıtım satırı 0024 odemeDogrula'dan geçer (tek hedef,
// kalan sınırı, hesapsız); hareketler çeke `cekId` ile bağlanır. Fark uyarıdır (R8, R12).
const FARK_UYARISI = (farkK) => `Çek tutarı kapatılan borçlardan ${kuruslu(farkK)} ₺ fazla. Fark hiçbir borcu kapatmaz ve alacak olarak işlenmez; gerekirse açıklamaya yazın.`;
const dagitimHareketleri = ({ secili, adaylar, cekK, tarih, turMap, cekId, yontem, aciklama, bayrak }) => {
  const hareketler = [];
  for (const d of secili) {
    const a = adaylar.find(x => x.anahtar === d.anahtar);
    if (!a) return { hatalar: ["Seçilen gider kalemi bulunamadı."] };
    const r = odemeDogrula({ tarih, tutar: tl(d.tutarK), yontem, hesapId: null, taksitId: a.taksitId, aciklama }, { kalem: a.kalem, turMap, hesaplar: [], ...bayrak });
    if (!r.kayit) return { hatalar: Object.values(r.hatalar) };
    hareketler.push({ ...r.kayit, cekId });
  }
  const farkK = cekK - secili.reduce((a, d) => a + d.tutarK, 0);
  return { hareketler, farkK, uyari: farkK > 0 ? FARK_UYARISI(farkK) : null };
};

// ── Spec 0049 B: kendi çekimiz (verilen çek; R7–R13, Q3–Q5) ────────────────────
// Çek bir TL banka hesabından yazılır, en az bir gider kalemini kapatır (X8), tek alacaklıya gider. Ödeme hareketleri hesapsız
// ve `cekId`'lidir: borç kapanır, bakiye değişmez (AC-13). Bakiye çek "ödendi" olunca, yazımdaki hesaptan, çekin tam tutarıyla
// düşer (kasa.hesapBakiyeleri, AC-14). form: {no, hesapId, vadeTarihi, tutar (metin), aciklama}. cekId: çağıranın atadığı kimlik.
export const kendiCekPlani = ({ form = {}, hesaplar = [], adaylar = [], dagitim = [], tarih, alacakli = null, turMap, cekId } = {}) => {
  const hatalar = [];
  const no = String(form.no || "").trim();
  if (!no) hatalar.push("Çek numarası girilmedi.");
  const hesap = hesaplar.find(h => String(h.id) === String(form.hesapId));
  if (!hesap) hatalar.push("Çekin yazıldığı banka hesabı seçilmedi.");
  else if (hesap.kapali) hatalar.push("Kapatılmış hesaptan çek yazılamaz.");
  else if ((hesap.paraBirimi || "TRY") !== "TRY") hatalar.push("Kendi çekimiz yalnız TL hesaptan yazılır: gider ödemeleri TL'dir.");
  else if (hesap.tur !== "banka") hatalar.push("Kendi çekimiz bir banka hesabından yazılır.");
  if (!form.vadeTarihi) hatalar.push("Çek vadesi girilmedi.");
  if (!tarih) hatalar.push("Çek tarihi girilmedi.");
  const ad = String(alacakli?.ad || "").trim();
  if (!ad) hatalar.push("Çekin kime verildiği girilmedi.");
  const t = parseMoney(form.tutar);
  const cekK = Number.isFinite(t) && t > 0 ? kurus(t) : 0;
  if (!cekK) hatalar.push("Çek tutarı sıfırdan büyük olmalı.");
  const secili = dagitim.filter(d => d.tutarK > 0);
  if (!secili.length) hatalar.push("Çek en az bir gider kalemini kapatmalı; bir kaleme tutar dağıtın.");
  const toplamK = secili.reduce((a, d) => a + d.tutarK, 0);
  if (cekK && toplamK > cekK) hatalar.push(`Dağıtılan toplam çek tutarını aşamaz (çek ${kuruslu(cekK)} ₺, dağıtılan ${kuruslu(toplamK)} ₺).`);
  if (hatalar.length) return { hatalar };
  const d = dagitimHareketleri({ secili, adaylar, cekK, tarih, turMap, cekId, yontem: KENDI_CEK_YONTEMI, aciklama: `Çek ${no} · ${hesap.ad}`, bayrak: { kendiCek: true } });
  if (d.hatalar) return { hatalar: d.hatalar };
  return { hatalar: [], ...d, cek: {
    id: cekId, yon: CEK_YON.VERILEN, paymentId: null, no, banka: hesap.ad, tur: "hamiline", durum: VERILEN_DURUM.YAZILDI, tutar: tl(cekK), currency: "TRY",
    vadeTarihi: form.vadeTarihi, tarih, hesapId: hesap.id, alacakliTur: alacakli.tur, alacakliId: alacakli.id ?? null, alacakliAd: ad,
    aciklama: String(form.aciklama || "").trim(), gecmis: [{ tarih, durum: VERILEN_DURUM.YAZILDI, not: `Yazıldı: ${ad}` }] } };
};
// R8, R10, R11 (AC-14, AC-15): verilen çekin durum geçişleri. Ödendi yalnız yazılmış çekte (tarih bakiyeye girer); ödendi geri
// alınabilir (yanlış işaret); karşılıksız ve iptal yalnız yazılmış çekte ve o çeke bağlı ödeme hareketlerini siler (borç açılır).
export const verilenCekOdendi = (cek, tarih) => {
  if (!cek || yonOf(cek) !== CEK_YON.VERILEN) return { hata: "Çek bulunamadı." };
  if (cek.durum !== VERILEN_DURUM.YAZILDI) return { hata: `${CEK_DURUM_AD[cek.durum] || cek.durum} durumundaki çek ödendi işaretlenemez.` };
  if (!tarih) return { hata: "Ödeme tarihi girilmedi." };
  return { cek: { ...cek, durum: VERILEN_DURUM.ODENDI, gecmis: [...(cek.gecmis || []), { tarih, durum: VERILEN_DURUM.ODENDI, not: "Banka ödedi" }] } };
};
export const verilenCekOdemeGeriAl = (cek, tarih) => {
  if (!cek || cek.durum !== VERILEN_DURUM.ODENDI) return { hata: "Yalnız ödenmiş çekin ödemesi geri alınır." };
  return { cek: { ...cek, durum: VERILEN_DURUM.YAZILDI, gecmis: [...(cek.gecmis || []), { tarih, durum: VERILEN_DURUM.YAZILDI, not: "Ödeme geri alındı" }] } };
};
export const verilenCekKapat = (cek, hareketler = [], tarih, hedef) => {
  if (!cek || yonOf(cek) !== CEK_YON.VERILEN) return { hata: "Çek bulunamadı." };
  if (hedef !== VERILEN_DURUM.KARSILIKSIZ && hedef !== VERILEN_DURUM.IPTAL) return { hata: "Geçersiz durum." };
  if (cek.durum !== VERILEN_DURUM.YAZILDI) return { hata: cek.durum === VERILEN_DURUM.ODENDI ? "Banka ödemiş çek iptal edilemez ya da karşılıksız işaretlenemez; önce ödemeyi geri alın." : "Çek zaten kapanmış." };
  const silinen = ciroHareketleri(cek.id, hareketler);
  const ids = new Set(silinen.map(h => String(h.id)));
  return { cek: { ...cek, durum: hedef, gecmis: [...(cek.gecmis || []), { tarih, durum: hedef, not: hedef === VERILEN_DURUM.IPTAL ? "İptal edildi, borç yeniden açıldı" : "Karşılıksız, borç yeniden açıldı" }] },
    hareketler: hareketler.filter(h => !ids.has(String(h?.id))), silinen };
};
// R13, R14 (AC-18, AC-21): verilen çekler; vadesi geçen ve yaklaşan yalnız yazılmış (bankada ödenmeyi bekleyen) çekte.
// toplamK: ödenmeyi bekleyen (yazılmış) çeklerin toplamı; alınan çeklerin toplamına karışmaz.
export const verilenCekSatirlari = (cekler = [], { durumlar = null, bugun = null, esikGun = 7 } = {}) => {
  const sinir = vadeSiniri(bugun, esikGun);
  const satirlar = [];
  for (const c of cekler) {
    if (!c || yonOf(c) !== CEK_YON.VERILEN) continue;
    if (durumlar ? !durumlar.has(c.durum) : c.durum !== VERILEN_DURUM.YAZILDI) continue;
    const vade = c.vadeTarihi || "", bekliyor = c.durum === VERILEN_DURUM.YAZILDI;
    satirlar.push({ cek: c, vade, tutarK: kurus(Number(c.tutar) || 0), currency: "TRY",
      gecti: bekliyor && !!vade && !!bugun && vade < bugun, yaklasan: bekliyor && !!vade && !!bugun && vade >= bugun && vade <= sinir });
  }
  satirlar.sort((a, b) => (a.vade || "9999").localeCompare(b.vade || "9999") || String(a.cek.no).localeCompare(String(b.cek.no)));
  const toplamK = satirlar.filter(s => s.cek.durum === VERILEN_DURUM.YAZILDI).reduce((a, s) => a + s.tutarK, 0);
  return { satirlar, toplamK };
};
// AC-14: verilen çekin ödendiği gün kasa.js'te (bakiye onu okur; cek.js kasa.js'i içe aktardığı için tersi döngü olurdu).
export { verilenCekOdemeTarihi } from "./kasa";

// ── Portföy (R10, R17, AC-3–AC-5, AC-36) ─────────────────────────────────────
// Elde bulunan = portföyde + tahsile verildi. Silinmiş tahsilatın çeki okuma anında gizlenir (Q7).
export const ELDE_DURUMLAR = new Set([CEK_DURUM.PORTFOY, CEK_DURUM.TAHSILE]);
// Spec 0049: yalnız alınan çekler; bağsız çek de listelenir (R1). Satır bilgisi tek yoldan (cekBilgisi): `odeme` bağsızda null.
export const vadeSiniri = (bugun, esikGun) => (bugun ? new Date(new Date(`${bugun}T12:00:00`).getTime() + esikGun * 86400000).toISOString().slice(0, 10) : null);
export const portfoySatirlari = (cekler = [], payments = [], { durumlar = null, tur = "", bugun = null, esikGun = 7 } = {}) => {
  const pById = tahsilatHaritasi(payments);
  const sinir = vadeSiniri(bugun, esikGun);
  const satirlar = [];
  for (const c of cekler) {
    if (!c || yonOf(c) !== CEK_YON.ALINAN) continue;
    const b = cekBilgisi(c, pById);
    if (!b) continue;
    const secili = durumlar ? durumlar.has(c.durum) : ELDE_DURUMLAR.has(c.durum);
    if (!secili || (tur && c.tur !== tur)) continue;
    const vade = b.vade;
    const elde = ELDE_DURUMLAR.has(c.durum);
    satirlar.push({ cek: c, odeme: b.odeme, bilgi: b, vade, tutarK: b.tutarK, currency: b.currency,
      gecti: elde && !!vade && !!bugun && vade < bugun, yaklasan: elde && !!vade && !!bugun && vade >= bugun && vade <= sinir });
  }
  satirlar.sort((a, b) => (a.vade || "9999").localeCompare(b.vade || "9999") || String(a.cek.no).localeCompare(String(b.cek.no)));
  const toplam = {};
  for (const s of satirlar) if (ELDE_DURUMLAR.has(s.cek.durum)) toplam[s.currency] = (toplam[s.currency] || 0) + s.tutarK;
  return { satirlar, toplamK: toplam };
};
// Q4: çek kaydına bağlanmamış eski çek tahsilatları (bayrakla çalışır).
export const baglanmamisCekTahsilatlari = (payments = [], cekler = []) => {
  const bagli = new Set((cekler || []).filter(c => c?.paymentId != null).map(c => String(c.paymentId)));
  return payments.filter(p => p && !p.deletedAt && p.yontem === "Çek" && !bagli.has(String(p.id)));
};
// Q7: ciro edilmiş çekin tahsilatı silinemez (önce ciro iptali).
export const tahsilatSilinebilirMi = (payment, cekler = []) => {
  const c = (cekler || []).find(x => idEsit(x.paymentId, payment?.id));
  return !c || c.durum !== CEK_DURUM.CIRO;
};
// Triyaj (Q7'nin öbür yolları): ciro edilmiş çeke bağlı tahsilat hiçbir silme yolunda (müşteri silme, kalıcı silme,
// çöpü boşaltma, 30 günlük otomatik temizlik) kaybolmaz; yoksa cekId'li ödeme hareketleri kaydı olmayan bir çeke bağlı
// yetim kalır ve ciro iptal edilemez, karşılıksız işaretlenemez.
export const ciroluTahsilatIdleri = (cekler = []) =>
  new Set((cekler || []).filter(c => c?.durum === CEK_DURUM.CIRO && c.paymentId != null).map(c => String(c.paymentId)));
export const musterininCiroluTahsilatlari = (customerId, payments = [], cekler = []) => {
  const cirolu = ciroluTahsilatIdleri(cekler);
  return (payments || []).filter(p => p && !p.deletedAt && idEsit(p.customerId, customerId) && cirolu.has(String(p.id)));
};
// Triyaj: tahsilatı artık olmayan (kalıcı silinmiş) çek kaydı yinelenen çek uyarısına girmez (cekDogrula bu listeyle çağrılır).
// Spec 0049: bağsız (paymentId'siz) çekler her zaman sayılır.
export const bagliCekler = (cekler = [], payments = []) => {
  const ids = new Set((payments || []).map(p => String(p?.id)));
  return (cekler || []).filter(c => c && (c.paymentId == null || ids.has(String(c.paymentId))));
};

// ── Spec 0047 R38, R15: çekin ay sonu durumu ve ay özeti (dönem kilidi) ─────────────
// Çekin `tarih` (dahil) itibarıyla durumu: gecmis'in o tarihe kadarki son satırı. Geçmişi hiç olmayan eski çekte güncel
// durum kullanılır (`gecmisYok`, belgede dipnot); geçmişi olup o tarihe kadar satırı olmayan çek henüz alınmamıştır (null).
export const cekDurumuAyinSonunda = (cek, tarih) => {
  const g = Array.isArray(cek?.gecmis) ? cek.gecmis : [];
  if (!g.length) return { durum: cek?.durum || CEK_DURUM.PORTFOY, gecmisYok: true };
  const once = g.filter(x => x && x.tarih && x.tarih <= tarih);
  if (!once.length) return null;
  return { durum: once[once.length - 1].durum, gecmisYok: false };
};
// Ay özeti: ay sonunda elde duran (portföy + tahsile) çekler; ay içinde tahsil edilen, ciro edilen, karşılıksız çıkan
// çekler gecmis tarihlerinden. Tutar çek bilgisinden (bağlıda tahsilat, bağsızda çekin kendisi; 0049), para birimine göre
// ayrı (kur çevrimi yok). Silinmiş tahsilatın çeki sayılmaz.
// Spec 0059 R21 (AC-25, AC-26): `{ liste: true }` ay içi kovalarına (tahsil, ciro, karşılıksız) `liste` ekler ({id, no,
// banka, tutarK, currency, vade, tarih}); "aynı ay iptal edilen ciro sayılmaz" kuralı burada tek yerde durur, rapor
// `gecmis`'i yeniden yürümez. Elde kovası liste almaz (raporda yalnız adet ve tutar). Parametresiz çağrı birebir bugünkü.
export const cekAyOzeti = (cekler = [], payments = [], ay, { liste = false } = {}) => {
  const bas = `${ay}-01`, [y, m] = String(ay).split("-").map(Number);
  const son = `${ay}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
  const pById = tahsilatHaritasi(payments);
  const kova = (listeli) => (listeli ? { adet: 0, tutarK: {}, liste: [] } : { adet: 0, tutarK: {} });
  const r = { elde: kova(false), tahsil: kova(liste), ciro: kova(liste), karsiliksiz: kova(liste), gecmisYokAdet: 0 };
  const ekle = (k, b, c = null, tarih = null) => {
    k.adet++; k.tutarK[b.currency] = (k.tutarK[b.currency] || 0) + b.tutarK;
    if (k.liste) k.liste.push({ id: c.id, no: c.no || "", banka: c.banka || "", tutarK: b.tutarK, currency: b.currency, vade: b.vade || "", tarih });
  };
  for (const c of cekler) {
    // Spec 0049 Q9: bağsız alınan çek de portföydedir; verilen çek bu özete girmez.
    if (!c || yonOf(c) !== CEK_YON.ALINAN) continue;
    const p = cekBilgisi(c, pById);
    if (!p) continue;
    const d = cekDurumuAyinSonunda(c, son);
    if (d?.gecmisYok) r.gecmisYokAdet++;
    if (d && ELDE_DURUMLAR.has(d.durum)) ekle(r.elde, p);
    const gecmis = c.gecmis || [];
    for (let i = 0; i < gecmis.length; i++) {
      const g = gecmis[i];
      if (!g?.tarih || g.tarih < bas || g.tarih > son) continue;
      if (g.durum === CEK_DURUM.TAHSIL) ekle(r.tahsil, p, c, g.tarih);
      else if (g.durum === CEK_DURUM.CIRO) {
        // Triyaj: aynı ay içinde iptal edilip portföye dönen ciro sayılmaz (yoksa çek hem "ciro edilen" hem "elde" görünür).
        const sonraki = gecmis[i + 1];
        if (!(sonraki && sonraki.tarih && sonraki.tarih <= son && sonraki.durum === CEK_DURUM.PORTFOY)) ekle(r.ciro, p, c, g.tarih);
      }
      else if (g.durum === CEK_DURUM.KARSILIKSIZ) ekle(r.karsiliksiz, p, c, g.tarih);
    }
  }
  if (liste) for (const k of [r.tahsil, r.ciro, r.karsiliksiz]) k.liste.sort((a, b) => String(a.tarih).localeCompare(String(b.tarih)) || String(a.no).localeCompare(String(b.no), "tr"));
  return r;
};
