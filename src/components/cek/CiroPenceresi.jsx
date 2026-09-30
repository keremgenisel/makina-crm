import { useState, useMemo } from "react";
import { fmtTR, today, uid, parseMoney } from "../../lib/utils";
import { tl, kurus, turHaritasi } from "../../lib/gider";
import { ciroAdaylari, ciroVarsayilanDagitim, ciroPlani, kendiCekPlani, TAM_CIRO_NOTU } from "../../lib/cek";
import { Btn, Field, Input, Select, Modal, Icon } from "../ui";
import { Segment, HataMetni, Ipucu, UyariSeridi, BosDurum } from "../tasarim";
import { TutarInput, tutarMetni, tl2 } from "../gider/GiderAlanlari";

// Ciro penceresi (spec 0040 R4, R7–R9, R16; Q8; AC-6, AC-12, AC-13, AC-17). Bir çek bütün olarak tek alacaklıya ciro edilir;
// tutar alacaklının kalemlerine dağıtılır ve her kalem (taksitli kalemde her taksit) için ayrı, hesapsız bir ödeme hareketi
// doğar (hepsi aynı `cekId`). Dağıtım en eski vadeden başlar, elle düzeltilir. Fark uyarıdır, engel değildir (R8).
const ALACAKLI_TURLERI = [{ value: "tedarikci", label: "Tedarikçi" }, { value: "calisan", label: "Çalışan" }, { value: "serbest", label: "Serbest ad" }];

// Spec 0049 (Q5, Q7): ciro ve kendi çek planını yazar; iki giriş noktası (Kasa › Çek Portföyü, Giderler ödeme penceresi) aynı
// yazımı kullanır. Hareketler kimlik alır; ciroda var olan çek güncellenir, kendi çekte yeni çek eklenir. Tek güncelleme.
export const cekPlaniniYaz = (plan, { setHesapHareketleri, setCekler }) => {
  const hareketler = plan.hareketler.map(h => ({ ...h, id: uid() }));
  setHesapHareketleri(p => [...(p || []), ...hareketler]);
  setCekler(p => (plan.cek.yon === "verilen" ? [...(p || []), plan.cek] : (p || []).map(c => (c.id === plan.cek.id ? plan.cek : c))));
  return hareketler;
};
// Spec 0049 B (Q5, Q7): kip "kendi" = kendi çekimizi yazma (Çek Yaz). Alacaklı seçimi ve dağıtım tablosu aynı; çek alanları
// (numara, TL banka hesabı, vade, tutar) formdan gelir, plan cek.kendiCekPlani'dan. baslangic: {tur, id, giderId} ön seçim
// (ödeme penceresindeki "Kendi çekiyle öde"; o kalem dağıtımda dolu gelir).
export const CiroPenceresi = ({ satir = null, kip = "ciro", hesaplar = [], baslangic = null, giderler = [], giderTurleri = [], tedarikciler = [], calisanlar = [], onKaydet, onClose }) => {
  const kendi = kip === "kendi";
  const cek = satir?.cek || null;
  const turMap = useMemo(() => turHaritasi(giderTurleri), [giderTurleri]);
  // Q7: bir kalemden açılınca çek tutarı o kalemin kalanıyla ön dolar.
  const [cekForm, setCekForm] = useState(() => {
    let tutar = "";
    if (kendi && baslangic?.giderId != null) {
      const a = ciroAdaylari(giderler, baslangic.tur === "serbest" ? { tur: "serbest" } : { tur: baslangic.tur, id: baslangic.id }, turHaritasi(giderTurleri))
        .filter(x => String(x.giderId) === String(baslangic.giderId));
      if (a.length) tutar = tutarMetni(tl(a.reduce((t, x) => t + x.kalanK, 0)));
    }
    return { no: "", hesapId: "", vadeTarihi: "", tutar, aciklama: "" };
  });
  const bankalar = hesaplar.filter(h => !h.kapali && (h.paraBirimi || "TRY") === "TRY" && h.tur === "banka");
  // Spec 0049 (Q2): tutar, para birimi ve vade çek bilgisinden (bağsız çekte tahsilat yok); kendi kipinde formdaki tutar.
  const cekK = kendi ? Math.max(0, Math.round((parseMoney(cekForm.tutar) || 0) * 100)) : satir.tutarK;
  const [tur, setTur] = useState(baslangic?.tur || "tedarikci");
  const [secilen, setSecilen] = useState(baslangic?.id != null ? String(baslangic.id) : "");
  const [serbestAd, setSerbestAd] = useState("");
  const [tarih, setTarih] = useState(today());
  const [tutarlar, setTutarlar] = useState(() => {
    if (!kendi || !baslangic) return {};
    const a = ciroAdaylari(giderler, baslangic.tur === "serbest" ? { tur: "serbest" } : { tur: baslangic.tur, id: baslangic.id }, turMap);
    return Object.fromEntries(a.filter(x => baslangic.giderId == null || String(x.giderId) === String(baslangic.giderId)).map(x => [x.anahtar, tutarMetni(tl(x.kalanK))]));
  }); // anahtar → metin
  const [hatalar, setHatalar] = useState([]);
  const alacakli = tur === "serbest" ? { tur } : secilen ? { tur, id: secilen } : null;
  const adaylar = useMemo(() => ciroAdaylari(giderler, alacakli, turMap), [giderler, tur, secilen, turMap]);
  const alacakliAd = tur === "serbest" ? serbestAd
    : tur === "tedarikci" ? (tedarikciler.find(t => String(t.id) === String(secilen))?.ad || "")
    : (calisanlar.find(c => String(c.id) === String(secilen))?.ad || "");
  const alacakliDegis = (t, id) => {
    setTur(t); setSecilen(id); setHatalar([]);
    const a = ciroAdaylari(giderler, t === "serbest" ? { tur: t } : id ? { tur: t, id } : null, turMap);
    // Kendi kipinde çek tutarı henüz yok: her açık kalem kalanıyla gelir, çek tutarı dağıtılanla ön dolar.
    if (kendi) {
      setTutarlar(Object.fromEntries(a.map(x => [x.anahtar, tutarMetni(tl(x.kalanK))])));
      setCekForm(f => ({ ...f, tutar: a.length ? tutarMetni(tl(a.reduce((s2, x) => s2 + x.kalanK, 0))) : f.tutar }));
      return;
    }
    setTutarlar(Object.fromEntries(ciroVarsayilanDagitim(a, cekK).map(d => [d.anahtar, d.tutarK ? tutarMetni(tl(d.tutarK)) : ""])));
  };
  const dagitim = adaylar.map(a => { const v = String(tutarlar[a.anahtar] ?? "").trim(); const n = v ? Number(v.replace(/\./g, "").replace(",", ".")) : 0; return { anahtar: a.anahtar, tutarK: Number.isFinite(n) ? kurus(n) : 0 }; });
  const dagitilanK = dagitim.reduce((x, d) => x + d.tutarK, 0);
  const farkK = cekK - dagitilanK;
  const kaydet = () => {
    const r = kendi
      ? kendiCekPlani({ form: cekForm, hesaplar, adaylar, dagitim, tarih, alacakli: { ...(alacakli || { tur }), ad: alacakliAd }, turMap, cekId: uid() })
      : ciroPlani({ cek, tutarK: cekK, currency: satir.currency, adaylar, dagitim, tarih, alacakliAd, turMap });
    if (r.hatalar.length) { setHatalar(r.hatalar); return; }
    onKaydet(r);
  };
  const kalemAdi = (a) => {
    const k = a.kalem;
    const n = (k.taksitler || []).filter(t => (t.hedef || "ana") === "ana").length;
    return `${k.aciklama || k.calisanAd || turMap.get(String(k.turId))?.ad || "Gider"} · ${fmtTR(k.tarih)}${a.taksitId != null && n > 1 ? ` · ${a.sira}/${n}. taksit` : ""}`;
  };
  const izgara = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 100px 130px 150px", gap: 10, alignItems: "center" };

  return (
    <Modal title={kendi ? "Kendi Çekimizi Yaz" : "Çeki Ciro Et"} onClose={onClose} maxWidth={760}
      footer={<><Btn variant="ghost" onClick={onClose}>Vazgeç</Btn><Btn onClick={kaydet}><Icon name="check" size={14} /> {kendi ? "Çeki Yaz" : "Ciro Et"}</Btn></>}>
      <div data-testid={kendi ? "cek-yaz-penceresi" : "ciro-penceresi"}>
        {kendi ? (
          <>
            <div style={{ marginBottom: 12 }}><UyariSeridi aile="bilgi" testId="cek-yaz-notu">Çek yazılınca seçilen kalemlerin borcu kapanır; hesap bakiyesi banka çeki ödediğinde (Verilen çekler › Durum › Ödendi) düşer.</UyariSeridi></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 8 }}>
              <Field label="Çek numarası"><Input aria-label="Çek numarası" value={cekForm.no} onChange={e => setCekForm(f => ({ ...f, no: e.target.value }))} /></Field>
              <Field label="Banka hesabı"><Select aria-label="Banka hesabı" value={cekForm.hesapId} onChange={e => setCekForm(f => ({ ...f, hesapId: e.target.value }))}>
                <option value="">Hesap seçin</option>{bankalar.map(h => <option key={h.id} value={h.id}>{h.ad}</option>)}</Select></Field>
              <Field label="Vade"><Input aria-label="Çek vadesi" type="date" value={cekForm.vadeTarihi} onChange={e => setCekForm(f => ({ ...f, vadeTarihi: e.target.value }))} /></Field>
              <Field label="Çek tutarı"><TutarInput ariaLabel="Çek tutarı" value={cekForm.tutar} onChange={v => setCekForm(f => ({ ...f, tutar: v }))} /></Field>
              <Field label="Açıklama"><Input aria-label="Açıklama" value={cekForm.aciklama} onChange={e => setCekForm(f => ({ ...f, aciklama: e.target.value }))} placeholder="İsteğe bağlı" /></Field>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, marginBottom: 12 }}>
              <b>Çek {cek.no} · {cek.banka}</b> · vade {satir.vade ? fmtTR(satir.vade) : "girilmemiş"} · tutar <b>{tl2(tl(cekK))}</b>
            </div>
            <div style={{ marginBottom: 12 }}><UyariSeridi aile="uyari" testId="tam-ciro-notu">{TAM_CIRO_NOTU}</UyariSeridi></div>
          </>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1", maxWidth: 420 }}>
            <Field label={kendi ? "Kime veriliyor" : "Kime ciro ediliyor"}><Segment ariaLabel="Alacaklı türü" kip="dugme" options={ALACAKLI_TURLERI} value={tur} onChange={v => alacakliDegis(v, "")} /></Field>
          </div>
          <div>
            {tur === "tedarikci" && <Field label="Tedarikçi"><Select value={secilen} onChange={e => alacakliDegis(tur, e.target.value)}>
              <option value="">Tedarikçi seçin</option>{tedarikciler.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}</Select></Field>}
            {tur === "calisan" && <Field label="Çalışan"><Select value={secilen} onChange={e => alacakliDegis(tur, e.target.value)}>
              <option value="">Çalışan seçin</option>{calisanlar.filter(c => !c.deletedAt).map(c => <option key={c.id} value={c.id}>{c.ad}</option>)}</Select></Field>}
            {tur === "serbest" && <Field label={kendi ? "Alacaklının adı" : "Ciro edilenin adı"}><Input value={serbestAd} onChange={e => setSerbestAd(e.target.value)} placeholder="Unvan" /></Field>}
          </div>
          <div><Field label={kendi ? "Çek tarihi" : "Ciro tarihi"}><Input type="date" value={tarih} onChange={e => setTarih(e.target.value)} /></Field></div>
        </div>
        {tur === "serbest" && <Ipucu>Serbest adda tedarikçisi seçilmemiş gider kalemleri listelenir.</Ipucu>}
        <div style={{ marginTop: 12 }}>
          {!alacakli ? null : adaylar.length === 0 ? (
            <BosDurum testId="bos-ciro-kalem" baslik="Açık gider kalemi yok" metin={kendi ? "Çek bir borcu kapatmalıdır: bu alacaklının ödenmemiş kalemi bulunmuyor." : "Ciro bir borcu kapatmalıdır: bu alacaklının ödenmemiş kalemi bulunmuyor."} />
          ) : (
            <div data-testid="ciro-kalemleri">
              <div style={{ ...izgara, fontSize: 11.5, fontWeight: 700, color: "var(--n500, #64748b)", paddingBottom: 6, borderBottom: "1px solid var(--n200, #e2e8f0)" }}>
                <span>Gider kalemi</span><span>Vade</span><span style={{ textAlign: "right" }}>Kalan</span><span style={{ textAlign: "right" }}>Bu çekle</span>
              </div>
              {adaylar.map(a => (
                <div key={a.anahtar} data-testid="ciro-kalemi" style={{ ...izgara, fontSize: 13, padding: "6px 0", borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={kalemAdi(a)}>{kalemAdi(a)}</span>
                  <span>{a.vade ? fmtTR(a.vade) : "—"}</span>
                  <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{tl2(tl(a.kalanK))}</span>
                  <TutarInput ariaLabel={`Ciro tutarı ${kalemAdi(a)}`} value={tutarlar[a.anahtar] ?? ""} onChange={v => setTutarlar(t => ({ ...t, [a.anahtar]: v }))} />
                </div>
              ))}
              <div data-testid="ciro-ozet" style={{ fontSize: 13, marginTop: 8, textAlign: "right" }}>
                Çek {tl2(tl(cekK))} · dağıtılan <b>{tl2(tl(dagitilanK))}</b>{farkK > 0 && <> · fark <b>{tl2(tl(farkK))}</b></>}
              </div>
              {farkK > 0 && <div style={{ marginTop: 8 }}><UyariSeridi aile="uyari" testId="ciro-fark">{`Çek tutarı kapatılan borçlardan ${tl2(tl(farkK))} fazla. Fark hiçbir borcu kapatmaz ve alacak olarak işlenmez; gerekirse açıklamaya yazın.`}</UyariSeridi></div>}
            </div>
          )}
        </div>
        {hatalar.map((h, i) => <HataMetni key={i}>{h}</HataMetni>)}
      </div>
    </Modal>
  );
};
