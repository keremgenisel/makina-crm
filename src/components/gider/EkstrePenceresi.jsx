import { useId, useState } from "react";
import { fmtTR } from "../../lib/utils";
import { tl, DAVRANIS, HEDEF, dovizKalemMi, kalemDovizMetni, kalemDovizTutarMetni, kalemKurMetni, hedefDovizKipi, tevkifatOranEtiketi } from "../../lib/gider";
import { paraMetni, kurSatiriMetni } from "../../lib/doviz";
import { Btn, Modal, Input, Field, Icon } from "../ui";
import { BosDurum, Ipucu, katlanirBaslik } from "../tasarim";
import { tl2, hedefEtiketi } from "./GiderAlanlari";
import { taksitNumarasiAdi, hedefAdi } from "../../lib/odemeYontemi";
import { Rozet } from "./DonemRaporu";

// Tedarikçi ve çalışan ekstresi (spec 0024 B; R12, R13, B6–B9). Hesap saf motorda (kasa.tedarikciEkstresi /
// calisanEkstresi); bu pencere yalnız gösterir. Yazdırılmaz ve dışa aktarılmaz (B9, 0001 C7b).
// hesapla(aralik) → motor sonucu; tur: "tedarikci" | "calisan"; onAvansSil verilirse avans satırı silinebilir.
// Spec 0156: 1080 piksel (geniş tablo penceresi, C4/2), sayfalama yok (R10), satır tıklanınca ayrıntı açılır (R1); vergi
// kırılımı, ödeme listesi ve kalan motorun borç satırından (`vergi`, `odemeler`, `kalanK`) okunur, pencere hesap yazmaz (C1).
// onKalemdeGoster(kalem) yalnız tedarikçi ekstresinde verilir (R14, R16).

// Spec 0156 C9/2: penceredeki kullanıcı metinlerinin tek bloğu.
export const ISLEM_AD = { borc: "Borç doğdu", odeme: "Ödeme", maas: "Maaş", mahsup: "Avanstan mahsup", avans: "Avans", geriOdeme: "Avans geri ödemesi" }; // spec 0155 R15/4
export const EKSTRE_METIN = Object.freeze({
  baslikTedarikci: "Tedarikçi Ekstresi", baslikCalisan: "Çalışan Ekstresi", kapat: "Kapat", silinmis: "Silinmiş",
  baslangic: "Başlangıç", bitis: "Bitiş", devir: "Devreden bakiye", goc: "Eski kayıttan aktarıldı",
  sutunTarih: "Tarih", sutunIslem: "İşlem", sutunAciklama: "Açıklama", sutunTutar: "Tutar", sutunBakiye: "Bakiye", sutunNetBakiye: "Net bakiye",
  netEtkisiz: "net etkisiz", acikAvans: "Açık avans", kalanBorc: "Kalan borç", calisanaBorc: "Çalışana borcumuz", calisandanAlacak: "Çalışandan alacağımız",
  bosBaslik: "Hareket yok", bosTedarikci: "Bu tedarikçiye bağlı gider kalemi yok.", bosCalisan: "Bu çalışan için maaş kalemi, ödeme ya da avans kaydı yok.",
  // Spec 0155 R15/3, R15/5, R15/6, P1: iki yönlü tedarikçi ekstresinin metinleri.
  tedarikciyeBorc: "Bu tedarikçiye borcumuz", tedarikcidenAlacak: "Bu tedarikçiden alacağımız",
  ipucuTedarikciAvans: "Net bakiye: artı tedarikçiye borcumuz, eksi tedarikçiden alacağımız (açık avans). Mahsup borcu ve avansı birlikte kapatır, net bakiyeyi değiştirmez. Kira stopajı ve KDV tevkifatı vergi dairesine ödenir, bu ekstreye girmez.",
  hesabaGiren: "Hesaba giren", avanstanDusen: "Avanstan düşen", kurFarki: "Döviz avans kapandı; lira karşılığındaki kur farkı bakiyeye yansıtılmaz.",
  ipucuTedarikci: "Borç, kalemin tedarikçiye ödenecek tutarıdır (KDV dâhil). Kira stopajı ve KDV tevkifatı vergi dairesine ödenir, bu ekstreye girmez; satıra tıklayınca faturanın vergi kırılımı açılır.",
  ipucuCalisan: "Net bakiye: artı çalışana borcumuz, eksi çalışandan alacağımız (açık avans). Mahsup borcu ve avansı birlikte kapatır, net bakiyeyi değiştirmez.",
  avansSil: "Avansı sil", kalemdeGoster: "Kalemde göster", kalemdeGosterIpucu: "Dönem Raporu'nda bu kalemi göster",
  matrah: "Matrah", brut: "Brüt", net: "Net", kdv: "KDV", tevkifat: "KDV tevkifatı", stopaj: "Kira stopajı",
  odenecek: "ödenecek",
  indirilemeyen: "İndirilemeyen KDV", indirilemeyenIbare: "borca girmez, gider tutarına girer",
  dovizTutar: "Kalemin döviz tutarı (KDV hariç)", dovizKur: "Donmuş kur",
  odemeler: "Ödemeler", odenmedi: "Henüz ödeme yok", kalan: "Kalan",
  yontem: "Yöntem", hesap: "Hesap", taksit: "Kapattığı taksit", hedef: "Kapattığı hedef",
  hesaptanCikan: "Hesaptan çıkan", odemeKuru: "Kur", aciklama: "Açıklama", kalem: "Kalem", tarih: "Tarih",
  resmi: "Resmi maaş", elden: "Elden maaş", ekOdeme: "Ek ödeme", resmiKucuk: "resmi", eldenKucuk: "elden", ekOdemeKucuk: "ek ödeme", yolParasi: "Yol parası", yolParasiKucuk: "yol parası",
});
// Köprünün kapanış satırı gider formunun özetiyle aynı kuruluş: hedefin yönelme adı (tek kaynak hedefAdi, 0060) + "ödenecek".
export const odenecekEtiketi = (dav) => `${hedefAdi(HEDEF.ANA, dav)} ${M.odenecek}`;
const M = EKSTRE_METIN;
const para = (k) => tl2(tl(k));
const yuzde = (oran) => `%${oran}`; // R2/4: kisitliRozetMetni'nin biçimi
const izgara = { display: "grid", gridTemplateColumns: "90px 130px minmax(0, 1fr) 120px 130px 150px", gap: 10, alignItems: "center" }; // R9/2
const IZGARA_MIN = 860;
const TIKLANAN = new Set(["borc", "maas", "odeme", "mahsup", "avans", "geriOdeme"]);
const durdur = (e) => e.stopPropagation(); // R1/5: satırın içindeki düğmeler ayrıntıyı tetiklemez

// Ayrıntının satırları: [{ etiket, deger, isaret?, ibare?, kapanis? }]. Tutarı sıfır olan satır listeye girmez (R3/2).
const kalemAdi = (k) => (k ? k.aciklama || fmtTR(k.tarih) : "");
const borcAyrintisi = (s) => {
  const v = s.vergi, k = s.kalem;
  const r = v.kira
    ? [{ etiket: M.brut, deger: para(v.matrahK) },
      v.stopajK > 0 && { etiket: `${M.stopaj} (${yuzde(v.stopajOrani)})`, deger: para(v.stopajK), isaret: "−" },
      v.stopajK > 0 && { etiket: M.net, deger: para(v.netK), isaret: "=" },
      v.kdvK > 0 && { etiket: `${M.kdv} (${yuzde(v.kdvOrani)})`, deger: para(v.kdvK), isaret: "+" },
      { etiket: odenecekEtiketi(s.davranis || DAVRANIS.KIRA), deger: para(s.tutarK), isaret: "=", kapanis: true }]
    : [{ etiket: M.matrah, deger: para(v.matrahK) },
      v.kdvK > 0 && { etiket: `${M.kdv} (${yuzde(v.kdvOrani)})`, deger: para(v.kdvK), isaret: "+" },
      v.tevkifatK > 0 && { etiket: `${M.tevkifat} (${tevkifatOranEtiketi({ pay: v.tevkifatPay, payda: v.tevkifatPayda })})`, deger: para(v.tevkifatK), isaret: "−" },
      { etiket: odenecekEtiketi(s.davranis || DAVRANIS.NORMAL), deger: para(s.tutarK), isaret: "=", kapanis: true }];
  const bilgi = [
    v.indirilemeyenK > 0 && { etiket: M.indirilemeyen, deger: para(v.indirilemeyenK), ibare: M.indirilemeyenIbare },
    dovizKalemMi(k) && { etiket: M.dovizTutar, deger: kalemDovizTutarMetni(k) },
    dovizKalemMi(k) && { etiket: M.dovizKur, deger: kalemKurMetni(k) },
  ];
  return { kopru: r.filter(Boolean), bilgi: bilgi.filter(Boolean) };
};

export const EkstrePenceresi = ({ baslik, tur, silinmis = false, hesapla, hesapAdi = () => "", onAvansSil = null, onKalemdeGoster = null, onClose }) => {
  const [aralik, setAralik] = useState({ bas: "", bit: "" });
  const [acik, setAcik] = useState(() => new Set()); // R1/2: açık satırların motor anahtarları
  const kimlik = useId();
  const e = hesapla(aralik);
  const calisan = tur === "calisan";
  const degis = (anahtar) => setAcik(a => { const y = new Set(a); if (y.has(anahtar)) y.delete(anahtar); else y.add(anahtar); return y; });
  const hesapSatiri = (id) => { const ad = id == null || id === "" ? "" : hesapAdi(id); return ad ? { etiket: M.hesap, deger: ad } : null; }; // R5/3, R5/4

  const aciklama = (s) => {
    const k = s.kalem;
    if (s.tur === "maas") {
      const r = s.kirilim;
      return [k.aciklama, `${M.resmiKucuk} ${para(r.resmiK)} · ${M.eldenKucuk} ${para(r.eldenK)}${r.ekK ? ` · ${M.ekOdemeKucuk} ${para(r.ekK)}` : ""}${r.yolK ? ` · ${M.yolParasiKucuk} ${para(r.yolK)}` : ""}`].filter(Boolean).join(" · ");
    }
    if (s.tur === "borc") return [k.aciklama, fmtTR(k.tarih)].filter(Boolean).join(" · ");
    const m = s.hareket;
    // Spec 0051 R10, AC-17, AC-28: çalışan ekstresinde ödeme ve mahsup kapattığı hedefi yazar (Resmi / Elden; tek kaynak hedefAdi).
    const hedef = calisan && (s.tur === "odeme" || s.tur === "mahsup") ? hedefEtiketi(k, DAVRANIS.PERSONEL, s.hedefPaylari) : null;
    return [hedef, s.tur === "avans" ? null : k && `${k.aciklama || fmtTR(k.tarih)}`, m.yontem || null, s.tur === "mahsup" ? null : hesapAdi(m.hesapId), m.aciklama || null]
      .filter(Boolean).join(" · ");
  };
  // R1/3, R5, R6: satır türünün ayrıntısı; boş liste = tıklanmaz.
  const ayrinti = (s) => {
    const k = s.kalem, m = s.hareket;
    if (s.tur === "borc") return borcAyrintisi(s);
    if (s.tur === "maas") {
      const r = s.kirilim;
      return { bilgi: [{ etiket: M.resmi, deger: para(r.resmiK) }, { etiket: M.elden, deger: para(r.eldenK) }, r.ekK > 0 && { etiket: M.ekOdeme, deger: para(r.ekK) }, r.yolK > 0 && { etiket: M.yolParasi, deger: para(r.yolK) },
        k.aciklama && { etiket: M.aciklama, deger: k.aciklama }].filter(Boolean) };
    }
    // Spec 0155 R15/6 (AC-54): döviz bayrağı satır türünden bağımsız; geri ödemede para hesaba girer.
    const dovizH = m?.dovizTutar != null && m.paraBirimi && m.paraBirimi !== "TRY";
    const kurFarki = s.kurFarkiK ? { etiket: M.kurFarki, deger: "" } : null;
    if (s.tur === "avans" || s.tur === "geriOdeme") return { bilgi: [{ etiket: M.tarih, deger: fmtTR(m.tarih) }, hesapSatiri(m.hesapId),
      dovizH && { etiket: s.tur === "geriOdeme" ? M.hesabaGiren : M.hesaptanCikan, deger: paraMetni(m.dovizTutar, m.paraBirimi) },
      dovizH && m.kur && { etiket: M.odemeKuru, deger: kurSatiriMetni(m.paraBirimi, m.kur) },
      m.aciklama && { etiket: M.aciklama, deger: m.aciklama }, kurFarki].filter(Boolean) };
    const hedef = calisan ? hedefEtiketi(k, DAVRANIS.PERSONEL, s.hedefPaylari) : null;
    const taksit = calisan ? null : taksitNumarasiAdi(k, m.taksitId, s.davranis || DAVRANIS.NORMAL);
    const doviz = dovizH;
    return { bilgi: [
      k && { etiket: M.kalem, deger: kalemAdi(k) },
      hedef && { etiket: M.hedef, deger: hedef },
      taksit && { etiket: M.taksit, deger: taksit },
      s.tur === "odeme" && m.yontem && { etiket: M.yontem, deger: m.yontem },
      s.tur === "odeme" ? hesapSatiri(m.hesapId) : null,
      doviz && { etiket: s.tur === "mahsup" ? M.avanstanDusen : M.hesaptanCikan, deger: paraMetni(m.dovizTutar, m.paraBirimi) },
      doviz && m.kur && { etiket: M.odemeKuru, deger: kurSatiriMetni(m.paraBirimi, m.kur) },
      m.aciklama && { etiket: M.aciklama, deger: m.aciklama }, kurFarki,
    ].filter(Boolean) };
  };
  // Spec 0153 R22, X8 (AC-28): bakiye lira yürür; döviz kalemin borç satırı ve ödemesi kendi para birimindeki tutarı da taşır.
  const dovizEki = (s) => (s.tur === "borc" && s.kalem && dovizKalemMi(s.kalem) ? kalemDovizMetni(s.kalem, s.tutarK)
    : s.tur === "odeme" && s.hareket?.dovizTutar != null && s.kalem && hedefDovizKipi(s.kalem, s.hareket.taksitId) ? paraMetni(s.hareket.dovizTutar, s.hareket.paraBirimi)
      : (s.tur === "avans" || s.tur === "geriOdeme") && s.hareket?.dovizTutar != null ? paraMetni(s.hareket.dovizTutar, s.hareket.paraBirimi) : "");
  const etki = (s) => (s.tur === "mahsup" ? <span style={{ color: "var(--n500, #64748b)" }}>{para(s.tutarK)}<div style={{ fontSize: 11 }}>{M.netEtkisiz}</div></span>
    : <span style={{ color: s.etkiK < 0 ? "var(--grn700, #15803d)" : "var(--red700, #b91c1c)" }}>{s.etkiK < 0 ? "−" : "+"}{para(Math.abs(s.etkiK))}
      {dovizEki(s) && <div data-testid="ekstre-doviz-tutari" style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>{dovizEki(s)}</div>}</span>);
  // Spec 0155 R15/3, R15/5 (AC-29, AC-53): tedarikçi ekstresi avansı varken iki yönlüdür (net bakiye, iki etiket, açık avans).
  const avansli = !calisan && Array.isArray(e.acikAvans);
  const bakiyeEtiketi = calisan
    ? (e.bakiyeK >= 0 ? `${M.calisanaBorc} ${para(e.bakiyeK)}` : `${M.calisandanAlacak} ${para(-e.bakiyeK)}`)
    : avansli ? (e.bakiyeK >= 0 ? `${M.tedarikciyeBorc} ${para(e.bakiyeK)}` : `${M.tedarikcidenAlacak} ${para(-e.bakiyeK)}`)
      : `${M.kalanBorc} ${para(e.bakiyeK)}`;
  // Etiket kendi genişliğini alır (max-content), değer kalan genişlikte sağa yaslı kırılır: uzun değer (açıklama, kalem adı)
  // eskiden `auto` sütunla etiketi sıfıra indirip üstüne biniyordu.
  const satirCiz = ({ etiket, deger, isaret, ibare, kapanis }, i) => (
    <div key={i} data-testid={kapanis ? "ayrinti-kapanis" : "ayrinti-satir"} style={{ display: "grid", gridTemplateColumns: "18px max-content minmax(0, 1fr)", gap: 8, padding: "2px 0",
      borderTop: kapanis ? "1px solid var(--n200, #e2e8f0)" : undefined, fontWeight: kapanis ? 700 : 400 }}>
      <span aria-hidden="true" style={{ color: "var(--n500, #64748b)" }}>{isaret || ""}</span>
      <span>{etiket}{ibare && <span style={{ color: "var(--n500, #64748b)", fontSize: 11.5 }}> · {ibare}</span>}</span>
      <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere", minWidth: 0 }}>{deger}</span>
    </div>
  );
  const ayrintiCiz = (s, a) => (
    <div data-testid="ekstre-ayrinti" style={{ margin: "0 0 8px 100px", padding: "8px 12px", background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 12.5, maxWidth: 560 }}>
      {aciklama(s) && <div data-testid="ayrinti-aciklama" style={{ color: "var(--n600, #475569)", marginBottom: 6, overflowWrap: "anywhere" }}>{aciklama(s)}</div>}
      {a.kopru?.map(satirCiz)}
      {a.kopru && a.bilgi.length > 0 && <div style={{ height: 6 }} />}
      {a.bilgi.map(satirCiz)}
      {s.tur === "borc" && (
        <div data-testid="ayrinti-odemeler" style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>{M.odemeler}</div>
          {s.odemeler.length === 0
            ? <div data-testid="ayrinti-odenmedi" style={{ color: "var(--red700, #b91c1c)" }}>{M.odenmedi} · {M.kalan} {para(s.kalanK)}</div>
            : <>
              {s.odemeler.map(p => (
                <div key={p.hareket.id} data-testid="ayrinti-odeme" style={{ display: "grid", gridTemplateColumns: "84px minmax(0, 1fr) auto", gap: 8, padding: "2px 0" }}>
                  <span>{fmtTR(p.hareket.tarih)}</span>
                  <span style={{ color: "var(--n600, #475569)" }}>{[p.hareket.tur === "mahsup" ? ISLEM_AD.mahsup : p.hareket.yontem || null, p.hareket.hesapId != null ? hesapAdi(p.hareket.hesapId) || null : null].filter(Boolean).join(" · ")}</span>
                  <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{para(p.payK)}</span>
                </div>
              ))}
              {s.kalanK > 0 && <div data-testid="ayrinti-kalan" style={{ fontWeight: 700, color: "var(--red700, #b91c1c)", textAlign: "right" }}>{M.kalan} {para(s.kalanK)}</div>}
            </>}
        </div>
      )}
    </div>
  );

  return (
    <Modal title={calisan ? M.baslikCalisan : M.baslikTedarikci} onClose={onClose} wide maxWidth={1080} footer={<Btn variant="ghost" onClick={onClose}>{M.kapat}</Btn>}>
      <div data-testid="ekstre-penceresi">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{baslik}{silinmis && <span style={{ marginLeft: 8 }}><Rozet renk="kirmizi">{M.silinmis}</Rozet></span>}</div>
            <div data-testid="ekstre-ozet" style={{ fontSize: 13, marginTop: 4 }}>
              <b>{bakiyeEtiketi}</b>
              {calisan && <span style={{ color: "var(--n600, #475569)" }}> · {M.acikAvans} {para(e.avansBorcK || 0)}</span>}
              {avansli && <span data-testid="ekstre-acik-avans" style={{ color: "var(--n600, #475569)" }}> · {M.acikAvans} {e.acikAvans.map(kv => paraMetni(tl(kv.acikK), kv.paraBirimi)).join(" · ")}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ width: 150 }}><Field label={M.baslangic}><Input type="date" value={aralik.bas} onChange={ev => setAralik(a => ({ ...a, bas: ev.target.value }))} /></Field></div>
            <div style={{ width: 150 }}><Field label={M.bitis}><Input type="date" value={aralik.bit} onChange={ev => setAralik(a => ({ ...a, bit: ev.target.value }))} /></Field></div>
          </div>
        </div>
        {e.satirlar.length === 0 && e.devirK == null ? (
          <BosDurum testId="bos-ekstre" baslik={M.bosBaslik} metin={calisan ? M.bosCalisan : M.bosTedarikci} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: IZGARA_MIN }}>
              <div style={{ ...izgara, fontSize: 11.5, fontWeight: 700, color: "var(--n500, #64748b)", padding: "0 0 6px", borderBottom: "1px solid var(--n200, #e2e8f0)" }}>
                <span>{M.sutunTarih}</span><span>{M.sutunIslem}</span><span>{M.sutunAciklama}</span><span style={{ textAlign: "right" }}>{M.sutunTutar}</span><span style={{ textAlign: "right" }}>{calisan || avansli ? M.sutunNetBakiye : M.sutunBakiye}</span><span />
              </div>
              {e.devirK != null && (
                <div data-testid="ekstre-devir" style={{ ...izgara, fontSize: 13, padding: "7px 0", borderTop: "1px solid var(--n150, #f1f5f9)", color: "var(--n600, #475569)" }}>
                  <span>{fmtTR(aralik.bas)}</span><span>{M.devir}</span><span /><span /><b style={{ textAlign: "right" }}>{para(e.devirK)}</b><span />
                </div>
              )}
              {e.satirlar.map(s => {
                const tiklanir = TIKLANAN.has(s.tur); // R1/3: beş türün ayrıntısı her zaman en az bir satır taşır
                const acikMi = tiklanir && acik.has(s.anahtar);
                const kalemdeGoster = !calisan && onKalemdeGoster && s.kalem && (s.tur === "borc" || s.tur === "odeme" || s.tur === "mahsup"); // R14, R16, R17; 0155 R15/7
                return (
                  <div key={s.anahtar} data-testid="ekstre-kayit">
                    {/* Triyaj (bulgu 2): rol ve klavye yalnız ilk beş hücreyi saran öğede (subgrid ile aynı sütunlar); düğme hücresi
                        onun kardeşi, iç içe etkileşimli öğe yok. Ad tarih + işlem (aria-labelledby), öteki hücreler açıklama. */}
                    <div style={{ ...izgara, fontSize: 13, padding: "7px 0", borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                      <div data-testid="ekstre-satiri" data-ad={`${fmtTR(s.tarih)} ${ISLEM_AD[s.tur] || s.tur}`}
                        aria-labelledby={`${kimlik}${s.anahtar}-t ${kimlik}${s.anahtar}-i`} aria-describedby={`${kimlik}${s.anahtar}-a ${kimlik}${s.anahtar}-u ${kimlik}${s.anahtar}-b`}
                        {...(tiklanir ? { ...katlanirBaslik(acikMi, () => degis(s.anahtar)), onClick: () => degis(s.anahtar) } : {})}
                        style={{ gridColumn: "span 5", display: "grid", gridTemplateColumns: "subgrid", alignItems: "center", cursor: tiklanir ? "pointer" : "default" }}>
                        <span>{tiklanir && <span aria-hidden="true" style={{ fontSize: 10, color: "var(--n400, #94a3b8)", marginRight: 4 }}>{acikMi ? "▾" : "▸"}</span>}<span id={`${kimlik}${s.anahtar}-t`}>{fmtTR(s.tarih)}</span></span>
                        <span><span id={`${kimlik}${s.anahtar}-i`}>{ISLEM_AD[s.tur] || s.tur}</span>{s.goc && <div style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>{M.goc}</div>}</span>
                        <span id={`${kimlik}${s.anahtar}-a`} style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={aciklama(s)}>{aciklama(s)}</span>
                        <span id={`${kimlik}${s.anahtar}-u`} style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{etki(s)}</span>
                        <b id={`${kimlik}${s.anahtar}-b`} style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{para(s.bakiyeK)}</b>
                      </div>
                      <span data-testid="ekstre-satir-eylem" style={{ textAlign: "right" }} onClick={durdur} onKeyDown={durdur}>
                        {(s.tur === "avans" || s.tur === "geriOdeme") && onAvansSil && <Btn small variant="danger" onClick={() => onAvansSil(s.hareket)} title={M.avansSil}><Icon name="trash" size={12} /></Btn>}
                        {kalemdeGoster && <Btn small variant="ghost" onClick={() => onKalemdeGoster(s.kalem)} title={M.kalemdeGosterIpucu}>{M.kalemdeGoster}</Btn>}
                      </span>
                    </div>
                    {acikMi && ayrintiCiz(s, ayrinti(s))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <Ipucu>{calisan ? M.ipucuCalisan : avansli ? M.ipucuTedarikciAvans : M.ipucuTedarikci}</Ipucu>
      </div>
    </Modal>
  );
};
