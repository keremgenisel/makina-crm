import { useState, useMemo } from "react";
import { uid, today, fmtTR } from "../../lib/utils";
import { tl } from "../../lib/gider";
import { avansDogrula, avansBorclari, avansSilinebilirMi, calisanEkstresi, secilebilirHesaplar, HESAP_TUR_AD } from "../../lib/kasa";
import { logAction } from "../../lib/audit";
import { Icon, Btn, Field, Input, Select, Modal, ConfirmDialog } from "../ui";
import { KartBolum, BosDurum, HataMetni, Ipucu } from "../tasarim";
import { TutarInput, tl2, ODEME_SECENEKLERI } from "../gider/GiderAlanlari";
import { Rozet } from "../gider/DonemRaporu";
import { EkstrePenceresi } from "../gider/EkstrePenceresi";

// Kasa › Çalışan avansları (spec 0024 B; R9, R11, R13, C8, B4, B8, B11). Avans bir hesaptan (isteğe bağlı) çıkan ve
// çalışandan alacağa geçen harekettir; gider değildir. Mahsup personel kaleminin ödeme penceresinden girilir. Silinmiş
// çalışanın hareketleri durur, "silinmiş" rozetiyle görünür. Avans verme ve silme `avans` izni ister.
const AvansFormu = ({ calisanlar, hesaplar, onKaydet, onClose }) => {
  const canli = calisanlar.filter(c => !c.deletedAt);
  const uygun = secilebilirHesaplar(hesaplar, "TRY");
  const [form, setForm] = useState({ calisanId: canli[0]?.id ?? "", tarih: today(), tutar: "", hesapId: "", yontem: "", aciklama: "" });
  const [hatalar, setHatalar] = useState({});
  const set = (p) => setForm(f => ({ ...f, ...p }));
  const kaydet = () => {
    const r = avansDogrula(form, { calisanlar, hesaplar });
    if (!r.kayit) { setHatalar(r.hatalar); return; }
    onKaydet(r.kayit);
  };
  return (
    <Modal title="Avans Ver" onClose={onClose} maxWidth={560}
      footer={<div style={{ display: "flex", gap: 8 }}><Btn variant="ghost" onClick={onClose}>İptal</Btn><Btn onClick={kaydet}><Icon name="check" size={14} /> Avansı Kaydet</Btn></div>}>
      <div data-testid="avans-formu" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div>
          <Field label="Çalışan">
            <Select value={form.calisanId} onChange={e => set({ calisanId: canli.find(c => String(c.id) === e.target.value)?.id ?? "" })}>
              {canli.map(c => <option key={c.id} value={c.id}>{c.ad}</option>)}
            </Select>
          </Field>
          <HataMetni>{hatalar.calisanId}</HataMetni>
        </div>
        <div>
          <Field label="Tarih"><Input type="date" value={form.tarih} onChange={e => set({ tarih: e.target.value })} /></Field>
          <HataMetni>{hatalar.tarih}</HataMetni>
        </div>
        <div>
          <Field label="Tutar"><TutarInput ariaLabel="Avans tutarı" value={form.tutar} onChange={v => set({ tutar: v })} invalid={!!hatalar.tutar} /></Field>
          <HataMetni>{hatalar.tutar}</HataMetni>
        </div>
        <div>
          <Field label="Hesap">
            <Select value={form.hesapId} onChange={e => set({ hesapId: e.target.value === "" ? "" : uygun.find(h => String(h.id) === e.target.value)?.id ?? "" })}>
              <option value="">Hesap belirtilmedi</option>
              {uygun.map(h => <option key={h.id} value={h.id}>{h.ad} ({HESAP_TUR_AD[h.tur] || h.tur})</option>)}
            </Select>
          </Field>
          {hatalar.hesapId ? <HataMetni>{hatalar.hesapId}</HataMetni> : !form.hesapId ? <Ipucu>Hesap seçilmezse avans hiçbir bakiyeye girmez.</Ipucu> : null}
        </div>
        <div>
          <Field label="Ödeme yöntemi">
            <Select value={form.yontem} onChange={e => set({ yontem: e.target.value })}>
              {ODEME_SECENEKLERI.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Açıklama"><Input value={form.aciklama} onChange={e => set({ aciklama: e.target.value })} placeholder="İsteğe bağlı" /></Field>
          <Ipucu>Avans gider değildir; maaş kalemi doğduğunda o kalemin ödeme penceresinden mahsup edilir.</Ipucu>
        </div>
      </div>
    </Modal>
  );
};

export const CalisanAvanslari = ({
  calisanlar = [], hesapHareketleri = [], setHesapHareketleri = null, kasaHesaplari = [], giderler = [], giderTurleri = [],
  yururlukAy = null, bugun = today(), canDo = () => true, serverPermissions = null, showToast = () => {},
}) => {
  const [formAcik, setFormAcik] = useState(false);
  const [ekstreId, setEkstreId] = useState(null);
  const [silinecek, setSilinecek] = useState(null);
  const borclar = useMemo(() => avansBorclari(hesapHareketleri, giderler), [hesapHareketleri, giderler]);
  const calisanById = useMemo(() => new Map(calisanlar.map(c => [String(c.id), c])), [calisanlar]);
  // Canlı çalışanlar ve avans hareketi olan silinmiş çalışanlar (C8: hareketleri durur).
  const satirlar = calisanlar.filter(c => !c.deletedAt || borclar.has(String(c.id)))
    .sort((a, b) => (a.deletedAt ? 1 : 0) - (b.deletedAt ? 1 : 0) || String(a.ad).localeCompare(String(b.ad), "tr"));
  const yazabilir = canDo("avans") && !!setHesapHareketleri;
  const hesapAdi = (id) => { const h = kasaHesaplari.find(x => String(x.id) === String(id)); return h ? h.ad : id == null ? "Hesap belirtilmedi" : "Silinmiş hesap"; };
  const avansKaydet = (kayit) => {
    const yeni = { ...kayit, id: uid() };
    setHesapHareketleri(p => [...p, yeni]);
    logAction({ serverPermissions, action: "olusturuldu", entity: "avans", entityId: yeni.id, entityName: calisanById.get(String(kayit.calisanId))?.ad || "", detail: { tutar: kayit.tutar } });
    setFormAcik(false);
    showToast("Avans kaydedildi.");
  };
  const avansSil = () => {
    const m = silinecek;
    setHesapHareketleri(p => p.filter(x => x.id !== m.id));
    logAction({ serverPermissions, action: "silindi", entity: "avans", entityId: m.id, entityName: calisanById.get(String(m.calisanId))?.ad || "", detail: { tutar: m.tutar } });
    setSilinecek(null);
    showToast("Avans silindi.");
  };
  const silKontrol = silinecek ? avansSilinebilirMi(silinecek, hesapHareketleri, giderler) : { ok: true };
  const ekstreCalisani = ekstreId == null ? null : calisanById.get(String(ekstreId));
  const izgara = { display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) 130px 130px 130px 190px", gap: 10, alignItems: "center" };

  return (
    <KartBolum varyant="kart" baslikStili="baslik" title="Çalışan avansları" altBaslik="Avans gider değildir; açık avans maaştan mahsup edilince kapanır."
      eylemler={yazabilir && calisanlar.some(c => !c.deletedAt) ? <Btn small onClick={() => setFormAcik(true)}><Icon name="plus" size={12} /> Avans Ver</Btn> : null}
      style={{ overflow: "auto" }} testId="calisan-avanslari">
      {satirlar.length === 0 ? (
        <BosDurum testId="bos-calisan-avans" baslik="Tanımlı çalışan yok" metin="Çalışanlar Ayarlar › Firma › Firma Çalışanları'ndan eklenir." />
      ) : (
        <div style={{ minWidth: 700 }}>
          <div style={{ ...izgara, fontSize: 11.5, fontWeight: 700, color: "var(--n500, #64748b)", padding: "0 0 6px", borderBottom: "1px solid var(--n200, #e2e8f0)" }}>
            <span>Çalışan</span><span style={{ textAlign: "right" }}>Verilen avans</span><span style={{ textAlign: "right" }}>Mahsup edilen</span><span style={{ textAlign: "right" }}>Açık avans</span><span />
          </div>
          {satirlar.map(c => {
            const b = borclar.get(String(c.id)) || { verilenK: 0, mahsupK: 0, borcK: 0 };
            return (
              <div key={c.id} data-testid="avans-satiri" style={{ ...izgara, fontSize: 13, padding: "8px 0", borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                <span><b>{c.ad}</b>{c.deletedAt && <span style={{ marginLeft: 8 }}><Rozet renk="kirmizi">Silinmiş</Rozet></span>}</span>
                <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{b.verilenK ? tl2(tl(b.verilenK)) : "—"}</span>
                <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{b.mahsupK ? tl2(tl(b.mahsupK)) : "—"}</span>
                <b style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: b.borcK ? "var(--amb700, #b45309)" : "var(--n900, #0f172a)" }}>{tl2(tl(b.borcK))}</b>
                <span style={{ textAlign: "right" }}><Btn small variant="ghost" onClick={() => setEkstreId(c.id)}>Ekstre</Btn></span>
              </div>
            );
          })}
        </div>
      )}
      {formAcik && <AvansFormu calisanlar={calisanlar} hesaplar={kasaHesaplari} onKaydet={avansKaydet} onClose={() => setFormAcik(false)} />}
      {ekstreCalisani && (
        <EkstrePenceresi tur="calisan" baslik={ekstreCalisani.ad} silinmis={!!ekstreCalisani.deletedAt} hesapAdi={hesapAdi}
          hesapla={(aralik) => calisanEkstresi(ekstreCalisani.id, { giderler, hareketler: hesapHareketleri, turler: giderTurleri, yururlukAy, bugun, aralik })}
          onAvansSil={yazabilir ? setSilinecek : null} onClose={() => setEkstreId(null)} />
      )}
      {silinecek && !silKontrol.ok && (
        // Triyaj bulgu 1: mahsup edilmiş avans silinirse mahsup arkasında avans kalmaz; önce mahsup silinmeli.
        <Modal title="Avans silinemez" onClose={() => setSilinecek(null)} footer={<Btn onClick={() => setSilinecek(null)}>Tamam</Btn>}>
          <div data-testid="avans-silinemez" style={{ fontSize: 13, lineHeight: 1.6 }}>
            Bu avans silinirse mahsup edilen tutar kalan avansı <b>{tl2(tl(silKontrol.eksikK))}</b> aşar. Önce aşağıdaki maaş kalemlerinden
            en az bu kadar mahsubu silin (maaş kaleminin ödeme penceresinden):
            {silKontrol.mahsuplar.map(m => {
              const k = giderler.find(x => String(x.id) === String(m.giderId));
              return <div key={m.id} data-testid="engelleyen-mahsup" style={{ marginTop: 4 }}>{fmtTR(m.tarih)} · {tl2(m.tutar)} · {k ? (k.aciklama || `${fmtTR(k.tarih)} maaşı`) : "maaş kalemi"}</div>;
            })}
          </div>
        </Modal>
      )}
      {silinecek && silKontrol.ok && (
        <ConfirmDialog title="Avans silinsin mi?" message={`${tl2(silinecek.tutar)} tutarındaki avans kaydı silinecek; çalışanın açık avansı ve hesap bakiyesi buna göre değişir.`}
          confirmLabel="Avansı Sil" onConfirm={avansSil} onCancel={() => setSilinecek(null)} />
      )}
    </KartBolum>
  );
};
