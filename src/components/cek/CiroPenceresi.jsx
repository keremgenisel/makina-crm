import { useState, useMemo } from "react";
import { fmtTR, today } from "../../lib/utils";
import { tl, kurus, turHaritasi } from "../../lib/gider";
import { ciroAdaylari, ciroVarsayilanDagitim, ciroPlani, TAM_CIRO_NOTU } from "../../lib/cek";
import { Btn, Field, Input, Select, Modal, Icon } from "../ui";
import { Segment, HataMetni, Ipucu, UyariSeridi, BosDurum } from "../tasarim";
import { TutarInput, tutarMetni, tl2 } from "../gider/GiderAlanlari";

// Ciro penceresi (spec 0040 R4, R7–R9, R16; Q8; AC-6, AC-12, AC-13, AC-17). Bir çek bütün olarak tek alacaklıya ciro edilir;
// tutar alacaklının kalemlerine dağıtılır ve her kalem (taksitli kalemde her taksit) için ayrı, hesapsız bir ödeme hareketi
// doğar (hepsi aynı `cekId`). Dağıtım en eski vadeden başlar, elle düzeltilir. Fark uyarıdır, engel değildir (R8).
const ALACAKLI_TURLERI = [{ value: "tedarikci", label: "Tedarikçi" }, { value: "calisan", label: "Çalışan" }, { value: "serbest", label: "Serbest ad" }];

export const CiroPenceresi = ({ satir, giderler = [], giderTurleri = [], tedarikciler = [], calisanlar = [], onKaydet, onClose }) => {
  const { cek, odeme } = satir;
  const turMap = useMemo(() => turHaritasi(giderTurleri), [giderTurleri]);
  const cekK = kurus(odeme.tutar);
  const [tur, setTur] = useState("tedarikci");
  const [secilen, setSecilen] = useState("");
  const [serbestAd, setSerbestAd] = useState("");
  const [tarih, setTarih] = useState(today());
  const [tutarlar, setTutarlar] = useState({}); // anahtar → metin
  const [hatalar, setHatalar] = useState([]);
  const alacakli = tur === "serbest" ? { tur } : secilen ? { tur, id: secilen } : null;
  const adaylar = useMemo(() => ciroAdaylari(giderler, alacakli, turMap), [giderler, tur, secilen, turMap]);
  const alacakliAd = tur === "serbest" ? serbestAd
    : tur === "tedarikci" ? (tedarikciler.find(t => String(t.id) === String(secilen))?.ad || "")
    : (calisanlar.find(c => String(c.id) === String(secilen))?.ad || "");
  const alacakliDegis = (t, id) => {
    setTur(t); setSecilen(id); setHatalar([]);
    const a = ciroAdaylari(giderler, t === "serbest" ? { tur: t } : id ? { tur: t, id } : null, turMap);
    setTutarlar(Object.fromEntries(ciroVarsayilanDagitim(a, cekK).map(d => [d.anahtar, d.tutarK ? tutarMetni(tl(d.tutarK)) : ""])));
  };
  const dagitim = adaylar.map(a => { const v = String(tutarlar[a.anahtar] ?? "").trim(); const n = v ? Number(v.replace(/\./g, "").replace(",", ".")) : 0; return { anahtar: a.anahtar, tutarK: Number.isFinite(n) ? kurus(n) : 0 }; });
  const dagitilanK = dagitim.reduce((x, d) => x + d.tutarK, 0);
  const farkK = cekK - dagitilanK;
  const kaydet = () => {
    const r = ciroPlani({ cek, odeme, adaylar, dagitim, tarih, alacakliAd, turMap });
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
    <Modal title="Çeki Ciro Et" onClose={onClose} maxWidth={760}
      footer={<div style={{ display: "flex", gap: 8 }}><Btn variant="ghost" onClick={onClose}>Vazgeç</Btn><Btn onClick={kaydet}><Icon name="check" size={14} /> Ciro Et</Btn></div>}>
      <div data-testid="ciro-penceresi">
        <div style={{ fontSize: 13, marginBottom: 12 }}>
          <b>Çek {cek.no} · {cek.banka}</b> · vade {odeme.vadeTarihi ? fmtTR(odeme.vadeTarihi) : "girilmemiş"} · tutar <b>{tl2(odeme.tutar)}</b>
        </div>
        <div style={{ marginBottom: 12 }}><UyariSeridi aile="uyari" testId="tam-ciro-notu">{TAM_CIRO_NOTU}</UyariSeridi></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1", maxWidth: 420 }}>
            <Field label="Kime ciro ediliyor"><Segment ariaLabel="Alacaklı türü" kip="dugme" options={ALACAKLI_TURLERI} value={tur} onChange={v => alacakliDegis(v, "")} /></Field>
          </div>
          <div>
            {tur === "tedarikci" && <Field label="Tedarikçi"><Select value={secilen} onChange={e => alacakliDegis(tur, e.target.value)}>
              <option value="">Tedarikçi seçin</option>{tedarikciler.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}</Select></Field>}
            {tur === "calisan" && <Field label="Çalışan"><Select value={secilen} onChange={e => alacakliDegis(tur, e.target.value)}>
              <option value="">Çalışan seçin</option>{calisanlar.filter(c => !c.deletedAt).map(c => <option key={c.id} value={c.id}>{c.ad}</option>)}</Select></Field>}
            {tur === "serbest" && <Field label="Ciro edilenin adı"><Input value={serbestAd} onChange={e => setSerbestAd(e.target.value)} placeholder="Unvan" /></Field>}
          </div>
          <div><Field label="Ciro tarihi"><Input type="date" value={tarih} onChange={e => setTarih(e.target.value)} /></Field></div>
        </div>
        {tur === "serbest" && <Ipucu>Serbest adda tedarikçisi seçilmemiş gider kalemleri listelenir.</Ipucu>}
        <div style={{ marginTop: 12 }}>
          {!alacakli ? null : adaylar.length === 0 ? (
            <BosDurum testId="bos-ciro-kalem" baslik="Açık gider kalemi yok" metin="Ciro bir borcu kapatmalıdır: bu alacaklının ödenmemiş kalemi bulunmuyor." />
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
