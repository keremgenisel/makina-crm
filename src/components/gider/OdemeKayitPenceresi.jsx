import { useState, useMemo } from "react";
import { fmtTR } from "../../lib/utils";
import { satirliMi, odemeHedefKalaniK, hedefOdemeleri, odemeDurumu, kurus, tl, HEDEF } from "../../lib/gider";
import { odemeDogrula, secilebilirHesaplar, sonKullanilanHesap, HESAP_TUR_AD } from "../../lib/kasa";
import { Btn, Field, Input, Select, Modal, ConfirmDialog, Icon } from "../ui";
import { HataMetni, Ipucu, BolumBasligi } from "../tasarim";
import { TutarInput, tutarMetni, tl2, ODEME_SECENEKLERI, hedefAdi } from "./GiderAlanlari";

// Ödeme kayıt penceresi (spec 0024 R2, R17, R18; AC-3–AC-7, AC-20, AC-28, AC-36). Listedeki ödeme anahtarı, kira
// anahtarları, Ödeme Planı satırları ve Anasayfa hatırlatıcısındaki "Ödendi" bu pencereyi açar. Ödeme bir hareket
// kaydıdır (hesapHareketleri); kalemin durumu hareketten türer. Tutar kalanla, hesap son kullanılanla dolu gelir.
// kalem: odemeleriUygula'dan geçmiş (zenginleştirilmiş) kalem. hedef: {taksitId} ya da {hedef: "ana"|"stopaj"}.
const acikSatirlar = (k) => (k.taksitler || [])
  .map(r => ({ ...r, kalanK: Math.max(0, kurus(r.tutar) - (r._odenenK || 0)) }))
  .filter(r => r.kalanK > 0)
  .sort((a, b) => ((a.vade || "9999") < (b.vade || "9999") ? -1 : (a.vade || "9999") > (b.vade || "9999") ? 1 : (a.sira || 0) - (b.sira || 0)));
const baslangicTaksiti = (k, hedef) => {
  const acik = acikSatirlar(k);
  if (hedef?.taksitId != null && acik.some(r => String(r.id) === String(hedef.taksitId))) return hedef.taksitId;
  const h = hedef?.hedef || HEDEF.ANA;
  return (acik.find(r => (r.hedef || HEDEF.ANA) === h) || acik[0])?.id ?? null;
};
const para = (k) => tl2(tl(k));

export const OdemeKayitPenceresi = ({
  kalem, davranis, turAd, turMap, hedef = null, hareketler = [], hesaplar = [], hesapSecimi = false, odemeYetkisi = false, bugun,
  onKaydet, onSil, onClose,
}) => {
  const satirli = satirliMi(kalem);
  const [taksitId, setTaksitId] = useState(() => (satirli ? baslangicTaksiti(kalem, hedef) : null));
  const kalanK = odemeHedefKalaniK(kalem, davranis, satirli ? taksitId : null);
  const uygunHesaplar = useMemo(() => secilebilirHesaplar(hesaplar, "TRY"), [hesaplar]);
  const [form, setForm] = useState(() => ({
    tarih: bugun, tutar: tutarMetni(tl(kalanK)), yontem: kalem.odemeYontemi || "",
    hesapId: hesapSecimi ? (sonKullanilanHesap(hareketler, hesaplar) ?? "") : "", aciklama: "",
  }));
  const [hatalar, setHatalar] = useState({});
  const [silinecek, setSilinecek] = useState(null);
  const set = (patch) => setForm(f => ({ ...f, ...patch }));
  const taksitSec = (id) => {
    setTaksitId(id);
    set({ tutar: tutarMetni(tl(odemeHedefKalaniK(kalem, davranis, id))) });
  };
  const odemeler = hedefOdemeleri(hareketler, kalem.id);
  const satirAdi = (id) => {
    const r = (kalem.taksitler || []).find(x => String(x.id) === String(id));
    if (!r) return null;
    const n = kalem.taksitler.filter(x => (x.hedef || HEDEF.ANA) === (r.hedef || HEDEF.ANA)).length;
    return `${hedefAdi(r.hedef || HEDEF.ANA, davranis)}${n > 1 ? ` ${r.sira}/${n}. taksit` : ""}`;
  };
  const hesapAdi = (id) => {
    const h = hesaplar.find(x => String(x.id) === String(id));
    return h ? `${h.ad} (${HESAP_TUR_AD[h.tur] || h.tur})` : "Hesap belirtilmedi";
  };
  const kaydet = () => {
    const r = odemeDogrula({ ...form, taksitId }, { kalem, turMap, hesaplar });
    if (!r.kayit) { setHatalar(r.hatalar); return; }
    onKaydet(r.kayit);
  };
  const durum = odemeDurumu(kalem);
  const acik = satirli ? acikSatirlar(kalem) : [];
  const formVar = odemeYetkisi && kalanK > 0;

  return (
    <Modal title="Ödeme Kaydet" onClose={onClose} maxWidth={620}
      footer={<div style={{ display: "flex", gap: 8 }}>
        <Btn variant="ghost" onClick={onClose}>{formVar ? "Vazgeç" : "Kapat"}</Btn>
        {formVar && <Btn onClick={kaydet}><Icon name="check" size={14} /> Ödemeyi Kaydet</Btn>}
      </div>}>
      <div data-testid="odeme-kayit-penceresi">
        <div style={{ fontSize: 13, color: "var(--n600, #475569)", marginBottom: 12 }}>
          <b style={{ color: "var(--n900, #0f172a)" }}>{turAd}</b> · {fmtTR(kalem.tarih)}{kalem.aciklama || kalem.calisanAd ? ` · ${kalem.aciklama || kalem.calisanAd}` : ""}
          <div style={{ marginTop: 4 }} data-testid="odeme-kayit-ozet">
            Durum: <b>{durum === "odendi" ? "Ödendi" : durum === "kismen" ? "Kısmen ödendi" : "Ödenmedi"}</b>
            {formVar && <> · Bu hedefin kalanı: <b>{para(kalanK)}</b></>}
          </div>
        </div>
        {formVar ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {satirli && (
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Taksit">
                  <Select value={taksitId ?? ""} onChange={e => taksitSec(e.target.value === "" ? null : acik.find(r => String(r.id) === e.target.value)?.id ?? null)}>
                    {acik.map(r => <option key={r.id} value={r.id}>{satirAdi(r.id)} · vade {r.vade ? fmtTR(r.vade) : "girilmemiş"} · kalan {para(r.kalanK)}</option>)}
                  </Select>
                </Field>
                {hatalar.hedef && <HataMetni>{hatalar.hedef}</HataMetni>}
              </div>
            )}
            {!satirli && hatalar.hedef && <div style={{ gridColumn: "1 / -1" }}><HataMetni>{hatalar.hedef}</HataMetni></div>}
            <div>
              <Field label="Ödeme tarihi"><Input type="date" value={form.tarih || ""} onChange={e => set({ tarih: e.target.value })} /></Field>
              {hatalar.tarih && <HataMetni>{hatalar.tarih}</HataMetni>}
            </div>
            <div>
              <Field label="Tutar"><TutarInput ariaLabel="Ödeme tutarı" value={form.tutar} onChange={v => set({ tutar: v })} invalid={!!hatalar.tutar} /></Field>
              {hatalar.tutar ? <HataMetni>{hatalar.tutar}</HataMetni> : <Ipucu>Kalandan az girilirse kalem kısmen ödenmiş olur.</Ipucu>}
            </div>
            <div>
              <Field label="Ödeme yöntemi">
                <Select value={form.yontem} onChange={e => set({ yontem: e.target.value })}>
                  {ODEME_SECENEKLERI.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>
            </div>
            {hesapSecimi && (
              <div>
                <Field label="Hesap">
                  <Select value={form.hesapId ?? ""} onChange={e => set({ hesapId: e.target.value === "" ? "" : uygunHesaplar.find(h => String(h.id) === e.target.value)?.id ?? "" })}>
                    <option value="">Hesap belirtilmedi</option>
                    {uygunHesaplar.map(h => <option key={h.id} value={h.id}>{h.ad} ({HESAP_TUR_AD[h.tur] || h.tur})</option>)}
                  </Select>
                </Field>
                {hatalar.hesapId ? <HataMetni>{hatalar.hesapId}</HataMetni>
                  : !uygunHesaplar.length ? <Ipucu>Açık TL hesabı yok. Ödeme hesapsız kaydedilir ve hiçbir bakiyeye girmez.</Ipucu>
                  : !form.hesapId ? <Ipucu>Hesap seçilmezse ödeme hiçbir bakiyeye girmez.</Ipucu> : null}
              </div>
            )}
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Açıklama"><Input value={form.aciklama} onChange={e => set({ aciklama: e.target.value })} placeholder="İsteğe bağlı" /></Field>
            </div>
          </div>
        ) : (
          <Ipucu>{!odemeYetkisi ? "Ödeme kaydetme yetkiniz yok." : "Bu kalemin ödenecek kalanı yok."}</Ipucu>
        )}

        <BolumBasligi ust={16}>Kayıtlı ödemeler</BolumBasligi>
        {odemeler.length === 0
          ? <div data-testid="odeme-kayit-bos" style={{ fontSize: 13, color: "var(--n500, #64748b)" }}>Bu kalem için kayıtlı ödeme yok.</div>
          : (
            <div data-testid="odeme-kayit-listesi">
              {odemeler.map(h => (
                <div key={h.id} data-testid="odeme-kaydi" style={{ display: "grid", gridTemplateColumns: "90px minmax(0, 1fr) 120px 40px", gap: 10, alignItems: "center", fontSize: 13, padding: "6px 0", borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                  <span>{fmtTR(h.tarih)}</span>
                  <span style={{ minWidth: 0 }}>
                    {satirAdi(h.taksitId) || "Kalem"}
                    <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)" }}>
                      {[h.yontem || null, hesapAdi(h.hesapId), h.kaynak === "goc" ? "Eski kayıttan aktarıldı" : null, h.aciklama || null].filter(Boolean).join(" · ")}
                    </div>
                  </span>
                  <b style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{h.tamKapatir ? "Tamamı" : tl2(h.tutar)}</b>
                  <span style={{ textAlign: "right" }}>{odemeYetkisi && onSil && <Btn small variant="danger" onClick={() => setSilinecek(h)} title="Ödemeyi sil"><Icon name="trash" size={12} /></Btn>}</span>
                </div>
              ))}
            </div>
          )}
      </div>
      {silinecek && (
        <ConfirmDialog title="Ödeme silinsin mi?" message={`${fmtTR(silinecek.tarih)} tarihli ${silinecek.tamKapatir ? "ödeme" : `${tl2(silinecek.tutar)} ödeme`} silinecek; kalemin durumu geri döner.`}
          confirmLabel="Ödemeyi Sil" onConfirm={() => { onSil(silinecek); setSilinecek(null); }} onCancel={() => setSilinecek(null)} />
      )}
    </Modal>
  );
};
