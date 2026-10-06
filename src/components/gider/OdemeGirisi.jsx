import { useState, useMemo, useRef, useEffect, useLayoutEffect } from "react";
import { fmtTR, parseMoney } from "../../lib/utils";
import { tl, hedefOdemeleri, HEDEF } from "../../lib/gider";
import { HESAP_TUR_AD, COKLU_ODEME_MAX_SATIR } from "../../lib/kasa";
import { CIRO_YONTEMI, KENDI_CEK_YONTEMI } from "../../lib/cek";
import { yontemKirilimi, hareketPaylari, hareketHedefPaylari, GOC_YONTEM_NOTU, taksitAdi as ortakTaksitAdi } from "../../lib/odemeYontemi";
import { hepsiniOde, satirSiralariniEsle, ciroTutariK, CIRO_YALNIZ_ANA_NEDENI, CEK_YOK_NOTU, CEK_DAGITIM_NOTU, PLAN_HATASI_NOTU, TUR_DEGISTI_UYARISI } from "../../lib/formOdemesi";
import { PERSONEL_BOLUNMEZ_NEDENI, PERSONEL_EK_BOLUNMEZ_NEDENI } from "../../lib/gider";
import { Btn, Field, Input, Select, ConfirmDialog, Icon, LockConflict } from "../ui";
import { useLock } from "../../hooks/useLock";
import { HataMetni, Ipucu, BolumBasligi, Segment, KartBolum, UyariSeridi } from "../tasarim";
import { TutarInput, tl2, tutarMetni, ODEME_SECENEKLERI, hedefAdi, cokHedefliMi, hedefEtiketi } from "./GiderAlanlari";

// Spec 0053 R17: gider ödemesinin TEK editörü. Gider formu (kapsam "form", yeni kalem ve düzenleme) ve ödeme penceresi
// (kapsam "pencere": listeden, Ödeme Planı'ndan, Anasayfa hatırlatıcısından) bu bileşeni çizer; doğrulama ve hareket üretimi
// ikisinde de formOdemesi.odemeGirisiHazirla'dır (R8, R29). Şekli: hedef listesi + hedef başına satırlar (tutar, yöntem,
// hesap, açıklama; taksitli hedefte taksit) + çek yöntemleri (yalnız ANA, yalnız ciroYetkisi; R10–R14) + "Avanstan mahsup"
// kipi (R27) + kayıtlı ödemeler ve silme (R16). Bu dosya yalnız çizer ve girişi (giris) tutar; kararlar motordadır.
//
// giris = { tarih, kip: "odeme"|"mahsup", satirlar: [{anahtar, hedef, sira, tutar, yontem, hesapId, aciklama, cekId, cekNo,
//   cekHesapId, cekVade}], mahsup: {hedef, sira, tutar, aciklama}, alacakliAd }.
// hedefler: formOdemeHedefleri çıktısı; çağıran pasif/neden ve (form düzenlemesinde) 0048 durum alanlarını ekler.
// Etiketler: formda ve birden çok hedef çizilirken hedefin adıyla ("Tedarikçiye ödeme tutarı"), tek hedefli pencerede
// yalın ("Ödeme tutarı"); bir hedefin ikinci satırından itibaren sonuna sıra eklenir.
const FORM_AD = { "ödeme tutarı": "ödeme tutarı", "ödeme yöntemi": "ödeme yöntemi", hesap: "hesabı", "açıklama": "açıklaması", taksit: "taksiti",
  "çek": "çek", "çek numarası": "çek numarası", "çek hesabı": "çek hesabı", "çek vadesi": "çek vadesi" };
const buyuk = (m) => m.charAt(0).toLocaleUpperCase("tr-TR") + m.slice(1);
const para = (k) => tl2(tl(k));
const cekEtiketi = (s) => [s.cek.no, s.cek.banka, s.cek.kesideci, para(s.tutarK), s.vade ? `vade ${fmtTR(s.vade)}` : ""].filter(Boolean).join(" · ");
const satirTutarK = (r) => { const t = parseMoney(r?.tutar); return Number.isFinite(t) && t > 0 ? Math.round(t * 100) : 0; };
const tutarOf = (k) => (k > 0 ? tutarMetni(tl(k)) : "");

// Spec 0064 R20: mahsup kipinde çalışanın kilidi başkasındayken kayıt yapılmaz.
export const MAHSUP_KILITLI_HATASI = "Bu çalışanın avansı başka bir kullanıcıda açık; mahsup kaydedilemez.";
export const OdemeGirisi = ({
  kapsam = "pencere", kalem, hedefler = [], davranis, turMap, giris, setGiris, hatalar = null, uyari = null,
  hesaplar = [], hesapSecimi = false, ciroYetkisi = false, cekSatirlari = [], alacakliSerbest = false,
  varsayilanYontem = "", varsayilanHesap = "", odemeYetkisi = true,
  mahsupVar = false, avansK = 0, yolParasiVar = null, hareketler = [], kayitliGoster = true, onSil = null, silinenler = null, onSilGeriAl = null,
  durum = null, bolunmezNotu = false,
}) => {
  const form = kapsam === "form";
  const anahtarNo = useRef(1);
  const yeniAnahtar = () => `s${anahtarNo.current++}`;
  const [silinecek, setSilinecek] = useState(null);
  // Spec 0054 R16: ad tek kaynaktan; çok hedeflilik kalemin kendisinden (pencere tek hedefe inse de ad ayırt edicidir).
  const iki = kalem ? cokHedefliMi(kalem, davranis) : hedefler.length > 1;
  const adOf = (hedef) => hedefAdi(hedef, davranis, iki);
  const onEkli = form || hedefler.length > 1;
  const lbl = (hedef, ad, n = 1) => `${onEkli ? `${adOf(hedef)} ${FORM_AD[ad]}` : buyuk(ad)}${n > 1 ? ` ${n}` : ""}`;
  const satirlar = giris.satirlar || [];
  const mahsupKipi = mahsupVar && giris.kip === "mahsup";
  // Spec 0064 R20 (AC-26): mahsup bir çalışanın açık avansını tüketir; kalem kilidine (pencereyi açan ebeveyn) ek olarak
  // mahsup kipi açıkken çalışanın kilidi de alınır. Çakışmada mahsup alanı yerine LockConflict çizilir ve giriş
  // `mahsupKilitli` taşır; form ve pencere bu durumda mahsubu kaydetmez (MAHSUP_KILITLI_HATASI).
  const { lockConflict: mahsupKilidi, forceAcquire: mahsupKilidiDevral } = useLock("calisan", mahsupKipi && kalem?.calisanId != null ? kalem.calisanId : null);
  // Boyamadan önce (senkron) yazılır: çakışma ekranı görünür olduğu anda kaydet düğmesi de işareti görür.
  useLayoutEffect(() => {
    const kilitli = !!(mahsupKipi && mahsupKilidi);
    setGiris(g => (!!g.mahsupKilitli === kilitli ? g : { ...g, mahsupKilitli: kilitli }));
  }, [mahsupKipi, mahsupKilidi]);
  const setSatir = (anahtar, patch) => setGiris(g => ({ ...g, satirlar: g.satirlar.map(r => (r.anahtar === anahtar ? { ...r, ...patch } : r)) }));
  // Satırın hedefi/taksiti için kalan: hedefin (taksitli hedefte seçili taksitin) kalanı eksi aynı yere giden diğer satırlar.
  const yerKalaniK = (h, sira, haric = null) => {
    const hedefK = h.taksitli ? (h.acikTaksitler.find(t => Number(t.sira) === Number(sira))?.kalanK || 0) : h.kalanK;
    const digerK = satirlar.filter(r => r.anahtar !== haric && r.hedef === h.hedef && (!h.taksitli || Number(r.sira) === Number(sira))).reduce((a, r) => a + satirTutarK(r), 0);
    return Math.max(0, hedefK - digerK);
  };
  const yeniSatir = (h) => {
    const sira = h.taksitli ? (h.acikTaksitler[0]?.sira ?? null) : null;
    const k = yerKalaniK(h, sira);
    return { anahtar: yeniAnahtar(), hedef: h.hedef, sira, tutar: tutarOf(k), yontem: varsayilanYontem, hesapId: varsayilanHesap, aciklama: "" };
  };
  const satirEkle = (h) => setGiris(g => ({ ...g, satirlar: [...g.satirlar, yeniSatir(h)] }));
  const satirKaldir = (anahtar) => setGiris(g => ({ ...g, satirlar: g.satirlar.filter(r => r.anahtar !== anahtar) }));
  const hedefAc = (h, acik) => setGiris(g => ({ ...g, satirlar: acik ? [...g.satirlar, yeniSatir(h)] : g.satirlar.filter(r => r.hedef !== h.hedef) }));
  const hepsi = () => setGiris(g => ({ ...g, satirlar: hepsiniOde(g.satirlar, hedefler, { yontem: varsayilanYontem, hesapId: varsayilanHesap, yeniAnahtar }) }));
  const cizilebilir = hedefler.filter(h => !h.pasif);
  // Spec 0070 R8: yol parası hangi hedefin içinde (elden ayrı hedefse orada, değilse ANA'da).
  const yolVar = yolParasiVar ?? Number(kalem?.yolParasi) > 0; // yeni kalemde kalem yok; form bildirir
  const yolHedefi = hedefler.some(h => h.hedef === HEDEF.ELDEN) ? HEDEF.ELDEN : HEDEF.ANA;
  // Spec 0057 triyaj: hedef taksitliye döndüğünde sırası boş ya da kapanmış taksite bakan satır en yakın açık taksite eşlenir
  // (seçicinin gösterdiği ile kaydın bağlandığı taksit aynı olsun).
  useEffect(() => {
    setGiris(g => { const cur = g.satirlar || []; const s = satirSiralariniEsle(cur, hedefler); return s === cur ? g : { ...g, satirlar: s }; });
  }, [hedefler, setGiris]);
  const satirHata = (r) => hatalar?.satirlar?.[r.anahtar] || {};

  // ── Kayıtlı ödemeler (R16) ──
  const odemeler = useMemo(() => (kalem && kalem.id != null && kayitliGoster ? hedefOdemeleri(hareketler, kalem.id) : []), [kalem, hareketler, kayitliGoster]);
  const paylar = useMemo(() => (odemeler.length ? new Map(hareketPaylari(kalem, hareketler, turMap).map(p => [String(p.hareket.id), p.payK])) : new Map()), [odemeler.length, kalem, hareketler, turMap]);
  const hedefPaylari = useMemo(() => (odemeler.length ? hareketHedefPaylari(kalem, hareketler, turMap) : new Map()), [odemeler.length, kalem, hareketler, turMap]);
  const kirilim = useMemo(() => (odemeler.length ? yontemKirilimi(kalem, hareketler, turMap) : { karar: "yok" }), [odemeler.length, kalem, hareketler, turMap]);
  // Spec 0060 R4, R35: taksit adı tek kaynaktan (Kasa hareket listesiyle aynı).
  const taksitAdi = (id) => ortakTaksitAdi(kalem, id, davranis);
  const hesapAdi = (id) => {
    const h = hesaplar.find(x => String(x.id) === String(id));
    return h ? `${h.ad} (${HESAP_TUR_AD[h.tur] || h.tur})` : "Hesap belirtilmedi";
  };

  // ── Satır ──
  const satirCiz = (h, r, n) => {
    const e = satirHata(r);
    const ciro = r.yontem === CIRO_YONTEMI;
    const kendi = r.yontem === KENDI_CEK_YONTEMI;
    const cekOlur = h.hedef === HEDEF.ANA && ciroYetkisi;
    const secenekler = [...ODEME_SECENEKLERI, ...(cekOlur ? [{ value: CIRO_YONTEMI, label: CIRO_YONTEMI }, { value: KENDI_CEK_YONTEMI, label: KENDI_CEK_YONTEMI }] : [])];
    const cekSatiri = ciro ? cekSatirlari.find(x => String(x.cek.id) === String(r.cekId)) : null;
    // Spec 0057 R8, R19: çek satırı taksit seçmez; tutar hedefin açık taksitlerine en eski vadeden dağıtılır (motor), yani
    // ciro tutarının sınırı hedefin kalanı eksi aynı hedefteki diğer satırlardır.
    const cekYontemi = ciro || kendi;
    const cekKalaniK = Math.max(0, h.kalanK - satirlar.filter(x => x.anahtar !== r.anahtar && x.hedef === h.hedef).reduce((a, x) => a + satirTutarK(x), 0));
    const hedefSatirSayisi = satirlar.filter(x => x.hedef === h.hedef).length;
    const kaldirilabilir = form || hedefSatirSayisi > 1;
    const cok = hedefSatirSayisi > 1;
    return (
      <div key={r.anahtar} data-testid={form ? "form-odeme-satir" : "odeme-satiri"} data-hedef={h.hedef}
        style={cok ? { border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, padding: "10px 12px", marginTop: 10 } : { marginTop: 6 }}>
        {cok && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--n600, #475569)" }}>{n}. satır</span>
            {kaldirilabilir && <Btn small variant="ghost" onClick={() => satirKaldir(r.anahtar)} title="Satırı kaldır"><Icon name="close" size={12} /> Kaldır</Btn>}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {h.taksitli && cekYontemi && <div style={{ gridColumn: "1 / -1" }} data-testid="cek-dagitim-notu"><Ipucu>{CEK_DAGITIM_NOTU}</Ipucu></div>}
          {h.taksitli && !cekYontemi && (
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Taksit">
                <Select aria-label={lbl(h.hedef, "taksit", n)} value={r.sira ?? ""} onChange={e => setSatir(r.anahtar, { sira: e.target.value === "" ? null : Number(e.target.value), tutar: tutarOf(yerKalaniK(h, Number(e.target.value), r.anahtar)) })}>
                  {h.acikTaksitler.map(t => <option key={t.sira} value={t.sira}>{adOf(h.hedef)} {t.sira}/{h.satirSayisi}. taksit · vade {t.vade ? fmtTR(t.vade) : "girilmemiş"} · kalan {para(t.kalanK)}</option>)}
                </Select>
              </Field>
            </div>
          )}
          {e.hedef && <div style={{ gridColumn: "1 / -1" }}><HataMetni>{e.hedef}</HataMetni></div>}
          <div>
            <Field label="Tutar">
              {ciro ? <div aria-label={lbl(h.hedef, "ödeme tutarı", n)} style={{ fontWeight: 700, padding: "8px 0" }}>{cekSatiri ? para(ciroTutariK(cekSatiri, cekKalaniK)) : "—"}</div>
                : <TutarInput ariaLabel={lbl(h.hedef, "ödeme tutarı", n)} value={r.tutar} onChange={v => setSatir(r.anahtar, { tutar: v })} invalid={!!e.tutar} />}
            </Field>
            {e.tutar && <HataMetni>{e.tutar}</HataMetni>}
          </div>
          <div>
            <Field label="Ödeme yöntemi">
              <Select aria-label={lbl(h.hedef, "ödeme yöntemi", n)} value={r.yontem || ""} onChange={ev => setSatir(r.anahtar, { yontem: ev.target.value, cekId: null })}>
                {secenekler.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
            {e.yontem ? <HataMetni>{e.yontem}</HataMetni>
              : r.yontem === "Çek" ? <Ipucu>Düz “Çek” takip edilmeyen bir nottur.{cekOlur ? " Portföydeki bir çekle ödemek için “Çek (ciro)”, kendi çekimizle ödemek için “Çek (kendi)” seçin." : ""}</Ipucu> : null}
          </div>
          {ciro ? (
            <Field label="Ciro edilecek çek">
              {cekSatirlari.length ? (
                <Select aria-label={lbl(h.hedef, "çek", n)} value={r.cekId ?? ""} onChange={ev => setSatir(r.anahtar, { cekId: ev.target.value === "" ? null : cekSatirlari.find(x => String(x.cek.id) === ev.target.value)?.cek.id ?? null })}>
                  <option value="">Çek seçin</option>
                  {cekSatirlari.map(x => <option key={x.cek.id} value={x.cek.id}>{cekEtiketi(x)}</option>)}
                </Select>
              ) : <div data-testid="form-odeme-cek-yok"><Ipucu>{CEK_YOK_NOTU}</Ipucu></div>}
            </Field>
          ) : kendi ? (
            <>
              <Field label="Çek numarası"><Input aria-label={lbl(h.hedef, "çek numarası", n)} value={r.cekNo || ""} onChange={ev => setSatir(r.anahtar, { cekNo: ev.target.value })} /></Field>
              <Field label="Banka hesabı">
                <Select aria-label={lbl(h.hedef, "çek hesabı", n)} value={r.cekHesapId ?? ""} onChange={ev => setSatir(r.anahtar, { cekHesapId: ev.target.value === "" ? "" : hesaplar.find(x => String(x.id) === ev.target.value)?.id ?? "" })}>
                  <option value="">Hesap seçin</option>
                  {hesaplar.filter(x => x.tur === "banka").map(x => <option key={x.id} value={x.id}>{x.ad}</option>)}
                </Select>
              </Field>
              <Field label="Çek vadesi"><Input aria-label={lbl(h.hedef, "çek vadesi", n)} type="date" value={r.cekVade || ""} onChange={ev => setSatir(r.anahtar, { cekVade: ev.target.value })} /></Field>
            </>
          ) : hesapSecimi && (
            <div>
              <Field label="Hesap">
                <Select aria-label={lbl(h.hedef, "hesap", n)} value={r.hesapId ?? ""} onChange={ev => setSatir(r.anahtar, { hesapId: ev.target.value === "" ? "" : hesaplar.find(x => String(x.id) === ev.target.value)?.id ?? "" })}>
                  <option value="">Hesap belirtilmedi</option>
                  {hesaplar.map(x => <option key={x.id} value={x.id}>{x.ad} ({HESAP_TUR_AD[x.tur] || x.tur})</option>)}
                </Select>
              </Field>
              {e.hesapId ? <HataMetni>{e.hesapId}</HataMetni>
                : !hesaplar.length ? <Ipucu>Açık TL hesabı yok. Ödeme hesapsız kaydedilir ve hiçbir bakiyeye girmez.</Ipucu>
                : !r.hesapId ? <Ipucu>Hesap seçilmezse ödeme hiçbir bakiyeye girmez.</Ipucu> : null}
            </div>
          )}
          {(ciro || kendi) && alacakliSerbest && (
            <Field label={kendi ? "Kime verildi" : "Kime ciro edildi"}>
              <Input aria-label="Kime ciro edildi" value={giris.alacakliAd || ""} onChange={ev => setGiris(g => ({ ...g, alacakliAd: ev.target.value }))} placeholder="Alacaklının adı" />
            </Field>
          )}
          {!ciro && !kendi && (
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Açıklama"><Input aria-label={lbl(h.hedef, "açıklama", n)} value={r.aciklama || ""} onChange={ev => setSatir(r.anahtar, { aciklama: ev.target.value })} placeholder="İsteğe bağlı (ör. prim, mesai)" /></Field>
            </div>
          )}
        </div>
        {e.cek && <HataMetni>{e.cek}</HataMetni>}
        {kendi && <Ipucu>Çek yazılınca borç kapanır; hesap bakiyesi banka çeki ödediğinde (Kasa › Çek Portföyü › Verilen) düşer.</Ipucu>}
        {ciro && uyari && <div style={{ marginTop: 8 }}><UyariSeridi aile="uyari" testId="form-odeme-ciro-uyari">{uyari}</UyariSeridi></div>}
      </div>
    );
  };

  // ── Hedef bloğu ──
  const hedefCiz = (h) => {
    const ad = adOf(h.hedef);
    const hs = satirlar.filter(r => r.hedef === h.hedef);
    const durumMetni = h.kalanK === 0 ? "Ödendi" : h.kalanK < h.toplamK ? `Kısmen · kalan ${para(h.kalanK)}` : "Ödenmedi";
    const acilabilir = !h.pasif && h.kalanK > 0 && odemeYetkisi;
    return (
      <div key={h.hedef} data-testid="form-odeme-satiri" data-hedef={h.hedef} style={{ borderTop: "1px solid var(--n150, #f1f5f9)", padding: "10px 0" }}>
        {(form || hedefler.length > 1) && (
          <div data-testid={durum ? "form-odeme-durum-satiri" : undefined} data-hedef={h.hedef} style={{ fontSize: 13 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <BolumBasligi bosluk={0}>{ad} · {para(durum ? h.toplamK : h.kalanK)}</BolumBasligi>
              {durum && <span style={{ marginLeft: "auto" }}>{durumMetni}</span>}
            </div>
            {/* 0048 R3, R4: personelde maaş/ek ödeme kırılımı ve ödenenin yeni toplamı aşması. */}
            {durum && (h.ekOdemeK || 0) > 0 && <Ipucu>maaş {para(h.maasK)} + ek ödeme {para(h.ekOdemeK)}</Ipucu>}
            {durum && h.asimK > 0 && <HataMetni>{`Ödenen ${para(h.kayitliOdenenK)}, yeni toplam ${para(h.toplamK)}; ödenen yeni toplamı aşıyor.`}</HataMetni>}
          </div>
        )}
        {/* Spec 0070 R8 (AC-28): yol parası elden hedefinin içindedir (eldeni ayrı hedef değilse ANA'nın); ad değişmez. */}
        {yolVar && h.hedef === yolHedefi && <div data-testid="yol-parasi-ipucu"><Ipucu>Yol parası bu tutarın içindedir.</Ipucu></div>}
        {h.pasif ? <Ipucu>{h.neden}</Ipucu> : !acilabilir ? null : (
          <>
            {form && (
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, cursor: "pointer", marginTop: 4 }}>
                <input type="checkbox" aria-label={`${ad} ödendi`} checked={hs.length > 0} onChange={ev => hedefAc(h, ev.target.checked)} />
                {durum ? "Ödeme gir" : "Ödendi"}
              </label>
            )}
            {!form && hs.length === 0 && <Btn small variant="ghost" onClick={() => satirEkle(h)} aria-label={`${ad} için ödeme ekle`}><Icon name="plus" size={12} /> Ödeme ekle</Btn>}
            {hs.map((r, i) => satirCiz(h, r, i + 1))}
            {hs.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                <Btn small variant="ghost" onClick={() => satirEkle(h)} disabled={hs.length >= COKLU_ODEME_MAX_SATIR}
                  aria-label={onEkli ? `${ad} için başka yöntemle satır ekle` : "Başka yöntemle satır ekle"}><Icon name="plus" size={12} /> Başka yöntemle satır ekle</Btn>
                <span style={{ fontSize: 12, color: "var(--n500, #64748b)" }}>
                  {hs.length >= COKLU_ODEME_MAX_SATIR ? `En çok ${COKLU_ODEME_MAX_SATIR} satır; fazlası için ayrı ödeme girin.` : "Her satır ayrı bir ödeme olarak kaydedilir."}
                </span>
              </div>
            )}
            {hs.length > 0 && h.hedef !== HEDEF.ANA && ciroYetkisi && CIRO_YALNIZ_ANA_NEDENI[h.hedef] && <Ipucu>{CIRO_YALNIZ_ANA_NEDENI[h.hedef]}</Ipucu>}
          </>
        )}
      </div>
    );
  };

  // ── Mahsup (R27): tek satır ──
  const mahsup = giris.mahsup || {};
  // Spec 0070 R28 (AC-42): SGK kuruma ödenir; avanstan mahsup SGK hedefine yapılamaz.
  const mahsupHedefleri = cizilebilir.filter(h => h.kalanK > 0 && h.hedef !== HEDEF.SGK);
  const mahsupYerleri = mahsupHedefleri.flatMap(h => (h.taksitli ? h.acikTaksitler.map(t => ({ deger: `${h.hedef}:${t.sira}`, hedef: h.hedef, sira: t.sira, ad: `${adOf(h.hedef)} ${t.sira}/${h.satirSayisi}. taksit · vade ${t.vade ? fmtTR(t.vade) : "girilmemiş"} · kalan ${para(t.kalanK)}` }))
    : [{ deger: `${h.hedef}:`, hedef: h.hedef, sira: null, ad: `${adOf(h.hedef)} · kalan ${para(h.kalanK)}` }]));
  const mh = hatalar?.mahsup || {};
  const yerKalan = (y) => { const h = mahsupHedefleri.find(x => x.hedef === y.hedef); return !h ? 0 : h.taksitli ? (h.acikTaksitler.find(t => Number(t.sira) === Number(y.sira))?.kalanK || 0) : h.kalanK; };
  const seciliYer = mahsupYerleri.find(y => y.hedef === (mahsup.hedef || HEDEF.ANA) && String(y.sira ?? "") === String(mahsup.sira ?? "")) || mahsupYerleri[0] || null;
  // 0024 B1: mahsup tutarı yerin kalanı ile açık avansın küçüğüyle dolar.
  const mahsupYerSec = (y) => setGiris(g => ({ ...g, mahsup: { ...g.mahsup, hedef: y.hedef, sira: y.sira, tutar: tutarOf(Math.min(yerKalan(y), avansK)) } }));
  const kipSec = (k) => setGiris(g => ({ ...g, kip: k, ...(k === "mahsup" && seciliYer ? { mahsup: { ...g.mahsup, hedef: seciliYer.hedef, sira: seciliYer.sira, tutar: tutarOf(Math.min(yerKalan(seciliYer), avansK)) } } : {}) }));

  const govde = (
    <div data-testid="odeme-girisi">
      {durum?.planHatasi && <div style={{ marginBottom: 8 }}><UyariSeridi aile="uyari" testId="form-odeme-plan-hatasi">{PLAN_HATASI_NOTU}</UyariSeridi></div>}
      {durum?.turDegisti && <div style={{ marginBottom: 8 }}><UyariSeridi aile="uyari" testId="form-odeme-tur-uyarisi">{TUR_DEGISTI_UYARISI}</UyariSeridi></div>}
      {bolunmezNotu && <div data-testid="form-odeme-bolunmez"><Ipucu>{PERSONEL_BOLUNMEZ_NEDENI}</Ipucu></div>}
      {/* Spec 0054 R10, R21: ödenmiş maaş satırı ek ödemeyi içerdiği için ayrılamayan taraf. */}
      {durum?.ekBolunmez && <div data-testid="form-odeme-ek-bolunmez"><Ipucu>{PERSONEL_EK_BOLUNMEZ_NEDENI}</Ipucu></div>}
      {mahsupVar && odemeYetkisi && (
        <div style={{ marginBottom: 12, maxWidth: 360 }}>
          <Segment ariaLabel="Kayıt türü" kip="dugme" options={[{ value: "odeme", label: "Ödeme" }, { value: "mahsup", label: "Avanstan mahsup" }]} value={giris.kip || "odeme"}
            onChange={kipSec} />
        </div>
      )}
      {odemeYetkisi && (
        <div style={{ marginBottom: 6 }}>
          {/* Düğme tarih kutusunun yanında, kutuya göre dikeyde ortalı (etiket satırı hizaya girmez). */}
          <Field label={mahsupKipi ? "Mahsup tarihi" : "Ödeme tarihi"}>
            <div data-testid="odeme-tarihi-satiri" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ width: 200 }}>
                <Input aria-label={mahsupKipi ? "Mahsup tarihi" : "Ödeme tarihi"} type="date" value={giris.tarih || ""} onChange={e => setGiris(g => ({ ...g, tarih: e.target.value }))} />
              </div>
              {form && !mahsupKipi && cizilebilir.some(h => h.kalanK > 0) && (
                <Btn small variant="ghost" onClick={hepsi} aria-label="Hepsini ödendi işaretle"><Icon name="check" size={12} /> Hepsini ödendi işaretle</Btn>
              )}
            </div>
          </Field>
        </div>
      )}
      {(hatalar?.genel || []).map((m, i) => <HataMetni key={`g${i}`}>{m}</HataMetni>)}
      {(hatalar?.hedefler || []).map((m, i) => <HataMetni key={`h${i}`}>{m}</HataMetni>)}
      {mahsupKipi && mahsupKilidi ? (
        <div data-testid="mahsup-kilitli">
          <LockConflict lockedBy={mahsupKilidi.lockedBy} lockedAt={mahsupKilidi.lockedAt} onForce={mahsupKilidiDevral} onCancel={() => kipSec("odeme")} />
        </div>
      ) : mahsupKipi ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {mahsupYerleri.length > 1 && (
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Taksit">
                <Select aria-label="Mahsup bölümü" value={seciliYer?.deger ?? ""} onChange={e => mahsupYerSec(mahsupYerleri.find(x => x.deger === e.target.value))}>
                  {mahsupYerleri.map(y => <option key={y.deger} value={y.deger}>{y.ad}</option>)}
                </Select>
              </Field>
            </div>
          )}
          {mh.hedef && <div style={{ gridColumn: "1 / -1" }}><HataMetni>{mh.hedef}</HataMetni></div>}
          {mh.tarih && <div style={{ gridColumn: "1 / -1" }}><HataMetni>{mh.tarih}</HataMetni></div>}
          <div>
            <Field label="Tutar"><TutarInput ariaLabel="Ödeme tutarı" value={mahsup.tutar ?? ""} onChange={v => setGiris(g => ({ ...g, mahsup: { ...g.mahsup, tutar: v } }))} invalid={!!mh.tutar} /></Field>
            {mh.tutar ? <HataMetni>{mh.tutar}</HataMetni> : <Ipucu>Kalan ile açık avansın küçüğünü aşamaz. Mahsup para hareketi değildir, hiçbir hesaba girmez.</Ipucu>}
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Açıklama"><Input value={mahsup.aciklama || ""} onChange={e => setGiris(g => ({ ...g, mahsup: { ...g.mahsup, aciklama: e.target.value } }))} placeholder="İsteğe bağlı" /></Field>
          </div>
        </div>
      ) : (odemeYetkisi || durum) ? (
        <div data-testid="odeme-satirlari">
          {/* Spec 0057 R9: 0046'nın "bütün ödemeler taksitli" açıklaması kalktı; taksitli hedef de satırla ödenir. */}
          {hedefler.map(h => (form || hedefler.length > 1 ? hedefCiz(h) : (
            <div key={h.hedef} data-hedef={h.hedef}>
              {h.pasif ? <Ipucu>{h.neden}</Ipucu> : satirlar.filter(r => r.hedef === h.hedef).map((r, i) => satirCiz(h, r, i + 1))}
              {!h.pasif && h.kalanK > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                  <Btn small variant="ghost" onClick={() => satirEkle(h)} disabled={satirlar.filter(r => r.hedef === h.hedef).length >= COKLU_ODEME_MAX_SATIR}><Icon name="plus" size={12} /> Başka yöntemle satır ekle</Btn>
                  <span style={{ fontSize: 12, color: "var(--n500, #64748b)" }}>
                    {satirlar.filter(r => r.hedef === h.hedef).length >= COKLU_ODEME_MAX_SATIR ? `En çok ${COKLU_ODEME_MAX_SATIR} satır; fazlası için ayrı ödeme girin.` : "Her satır ayrı bir ödeme olarak kaydedilir."}
                  </span>
                </div>
              )}
            </div>
          )))}
          {durum && (durum.kaybolanlar || []).map(k => (
            <div key={k.hedef} data-testid="form-odeme-kaybolan" data-hedef={k.hedef} style={{ padding: "6px 0", borderTop: "1px solid var(--n150, #f1f5f9)", fontSize: 13 }}>
              <b>{hedefAdi(k.hedef, davranis, true)} · {tl2(0)}</b>
              <HataMetni>{`Ödenen ${para(k.odenenK)}, yeni toplam ${tl2(0)}; ödenen yeni toplamı aşıyor.`}</HataMetni>
            </div>
          ))}
        </div>
      ) : null}

      {kayitliGoster && kalem?.id != null && (
        <>
          <BolumBasligi ust={16}>Kayıtlı ödemeler</BolumBasligi>
          {kirilim.karar !== "yok" && (
            <div data-testid="odeme-yontem-kirilimi" style={{ fontSize: 13, marginBottom: 8 }}>
              Nasıl ödendi: <b>{kirilim.etiket}</b>
              {kirilim.karar === "karma" && <span style={{ color: "var(--n600, #475569)" }}> · {kirilim.satirlar.map(x => `${x.yontem} ${para(x.tutarK)}`).join(" · ")}</span>}
              {kirilim.gocVar && <div data-testid="goc-yontem-notu" style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginTop: 2 }}>{GOC_YONTEM_NOTU}</div>}
            </div>
          )}
          {odemeler.length === 0
            ? <div data-testid="odeme-kayit-bos" style={{ fontSize: 13, color: "var(--n500, #64748b)" }}>Bu kalem için kayıtlı ödeme yok.</div>
            : (
              <div data-testid="odeme-kayit-listesi">
                {odemeler.map(h => {
                  const silinecekMi = silinenler?.has(String(h.id));
                  return (
                    <div key={h.id} data-testid="odeme-kaydi" style={{ display: "grid", gridTemplateColumns: "90px minmax(0, 1fr) 120px 80px", gap: 10, alignItems: "center", fontSize: 13, padding: "6px 0", borderTop: "1px solid var(--n150, #f1f5f9)", opacity: silinecekMi ? 0.55 : 1 }}>
                      <span>{fmtTR(h.tarih)}</span>
                      <span style={{ minWidth: 0 }}>
                        {h.tur === "mahsup" ? "Avanstan mahsup · " : ""}{taksitAdi(h.taksitId) || hedefEtiketi(kalem, davranis, hedefPaylari.get(String(h.id))) || "Kalem"}
                        {/* 0040 Q9, 0053 R16: çeke bağlı hareket tek tek silinmez; iptal çek üzerinden. */}
                        {h.cekId != null && <span data-testid="ciro-hareketi" style={{ marginLeft: 6, fontSize: 11, color: "var(--n600, #475569)" }}>
                          · {h.yontem === KENDI_CEK_YONTEMI ? "çek iptali Kasa › Çek Portföyü › Verilen çekler'den" : "ciro iptali Kasa › Çek Portföyü'nden"}</span>}
                        {silinecekMi && <span data-testid="odeme-silinecek" style={{ marginLeft: 6, fontSize: 11, color: "var(--red700, #b91c1c)" }}>· kaydedince silinecek</span>}
                        <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)" }}>
                          {[h.yontem || null, h.tur === "mahsup" ? null : hesapAdi(h.hesapId), h.kaynak === "goc" ? "Eski kayıttan aktarıldı" : null, h.aciklama || null].filter(Boolean).join(" · ")}
                        </div>
                      </span>
                      <b style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{h.tamKapatir ? (paylar.has(String(h.id)) ? para(paylar.get(String(h.id))) : "Tamamı") : tl2(h.tutar)}</b>
                      <span style={{ textAlign: "right" }}>
                        {onSil && h.cekId == null && (silinecekMi
                          ? <Btn small variant="ghost" onClick={() => onSilGeriAl?.(h)} title="Silmeyi geri al">Geri al</Btn>
                          : <Btn small variant="danger" onClick={() => (silinenler ? onSil(h) : setSilinecek(h))} title={h.tur === "mahsup" ? "Mahsubu sil" : "Ödemeyi sil"}><Icon name="trash" size={12} /></Btn>)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
        </>
      )}
      {silinecek && (
        <ConfirmDialog title="Ödeme silinsin mi?" message={`${fmtTR(silinecek.tarih)} tarihli ${silinecek.tamKapatir ? "ödeme" : `${tl2(silinecek.tutar)} ödeme`} silinecek; kalemin durumu geri döner.`}
          confirmLabel="Ödemeyi Sil" onConfirm={() => { onSil(silinecek); setSilinecek(null); }} onCancel={() => setSilinecek(null)} />
      )}
    </div>
  );
  if (!form) return govde;
  return (
    <KartBolum varyant="kart" baslikStili="baslik" title="Ödeme" testId={durum ? "form-odeme-durumu" : "form-odeme"} style={{ marginBottom: 12, padding: 14 }}
      altBaslik={durum ? "Ödeme girin, satır ekleyin ya da kayıtlı ödemeyi silin; hepsi gider ile birlikte kaydedilir." : "İsteğe bağlı: ödenen bölümleri işaretleyin; bir bölüm birden çok satırla, her satır kendi yöntemi ve hesabıyla ödenebilir."}>
      {govde}
    </KartBolum>
  );
};

// Pencerenin ilk girişi: hedef verildiyse o hedefe, yoksa ilk açık hedefe tam kalanla bir satır (0024 R17: tutar = kalan).
export const ilkGiris = (hedefler, { tarih, yontem = "", hesapId = "", taksitId = null, kalem = null } = {}) => {
  const h = hedefler.find(x => !x.pasif && x.kalanK > 0) || null;
  const satirlar = [];
  if (h) {
    let sira = h.taksitli ? (h.acikTaksitler[0]?.sira ?? null) : null;
    if (h.taksitli && taksitId != null) { const t = h.acikTaksitler.find(x => String(x.id) === String(taksitId)); if (t) sira = t.sira; }
    const k = h.taksitli ? (h.acikTaksitler.find(t => Number(t.sira) === Number(sira))?.kalanK || 0) : h.kalanK;
    satirlar.push({ anahtar: "s0", hedef: h.hedef, sira, tutar: tutarOf(k), yontem, hesapId, aciklama: "" });
  }
  const mahsupYeri = h ? { hedef: h.hedef, sira: satirlar[0]?.sira ?? null } : {};
  return { tarih, kip: "odeme", satirlar, mahsup: { ...mahsupYeri, tutar: "", aciklama: "" }, alacakliAd: "", _kalemId: kalem?.id ?? null };
};
