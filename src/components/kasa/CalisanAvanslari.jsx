import { useState, useMemo } from "react";
import { uid, today, fmtTR } from "../../lib/utils";
import { tl } from "../../lib/gider";
import { avansDogrula, avansBorclari, avansSilinebilirMi, avansDuzenlenebilirMi, avansEnAzMetni, calisanEkstresi, secilebilirHesaplar, HESAP_TUR_AD, KAPALI_HESAP_NEDENI } from "../../lib/kasa";
import { odemeGirisiYaz } from "../../lib/formOdemesi";
import { logAction, hareketDuzenlemeKaydi } from "../../lib/audit";
import { Icon, Btn, Field, Input, Select, Modal, ConfirmDialog, LockConflict } from "../ui";
import { useLock } from "../../hooks/useLock";
import { useKilitListesi } from "../../hooks/useKilitListesi";
import { kilitRedMesaji } from "../../lib/kilitAlanlari";
import { KartBolum, BosDurum, HataMetni, Ipucu, UyariSeridi } from "../tasarim";
import { TutarInput, tl2, ODEME_SECENEKLERI } from "../gider/GiderAlanlari";
import { Rozet } from "../gider/DonemRaporu";
import { EkstrePenceresi } from "../gider/EkstrePenceresi";

// Kasa › Çalışan avansları (spec 0024 B; R9, R11, R13, C8, B4, B8, B11). Avans bir hesaptan (isteğe bağlı) çıkan ve
// çalışandan alacağa geçen harekettir; gider değildir. Mahsup personel kaleminin ödeme penceresinden girilir. Silinmiş
// çalışanın hareketleri durur, "silinmiş" rozetiyle görünür. Avans verme ve silme `avans` izni ister.
// Spec 0073 C1, R2, R4, R6, R28: aynı form düzenleme kipinde (`hareket` verilir) açılır; çalışan değişmez, kayıt kimliği korunur.
// Tutar sınırı avansDuzenlenebilirMi (yeni tutarla avans toplamı mahsupların altına düşemez); hareketler/giderler bunun içindir.
const hamTutar = (t) => (t == null || t === "" ? "" : String(t).replace(".", ","));
export const AvansFormu = ({ calisanlar, hesaplar, onKaydet, onClose, hareket = null, hareketler = [], giderler = [] }) => {
  const duzenle = !!hareket;
  const canli = calisanlar.filter(c => !c.deletedAt);
  const uygun = secilebilirHesaplar(hesaplar, "TRY");
  const [form, setForm] = useState(() => (duzenle
    ? { calisanId: hareket.calisanId, tarih: hareket.tarih || "", tutar: hamTutar(hareket.tutar), hesapId: hareket.hesapId ?? "", yontem: hareket.yontem || "", aciklama: hareket.aciklama || "" }
    : { calisanId: "", tarih: today(), tutar: "", hesapId: "", yontem: "", aciklama: "" }));
  const kapaliHesap = duzenle && hareket.hesapId != null && hesaplar.find(h => String(h.id) === String(hareket.hesapId))?.kapali;
  const [hatalar, setHatalar] = useState({});
  const set = (p) => setForm(f => ({ ...f, ...p }));
  // Spec 0064 R5, C7 (AC-25, AC-37): kilit SEÇİLEN çalışana bağlanır; seçim değişince eskisi bırakılır, yenisi alınır.
  // Çalışan seçilmemişken kimlik boştur (yeni kayıt sayılmaz, kilit alınmaz). Triyaj (bulgu 5): form çalışan seçili
  // AÇILMAZ; yoksa kimse seçmeden ilk çalışanın kilidi alınır, onun mahsubu ve Ayarlar düzenlemesi başkalarında kilitli görünürdü.
  const { lockConflict: calisanKilidi, forceAcquire: calisanKilidiDevral } = useLock("calisan", form.calisanId === "" || form.calisanId == null ? null : form.calisanId);
  const kaydet = () => {
    if (calisanKilidi) return;
    // Spec 0073 triyaj (bulgu 3): düzenlemede çalışan değişmez; silinmiş çalışanın duran avansı da düzeltilebilsin diye
    // silinmişlik denetimi o çalışan için atlanır (avansDogrula'nın imzası aynı; yeni avans kuralı değişmedi).
    const dogrulamaCalisanlari = duzenle
      ? [...calisanlar.filter(c => String(c.id) !== String(hareket.calisanId)), { ...(calisanlar.find(c => String(c.id) === String(hareket.calisanId)) || { id: hareket.calisanId }), deletedAt: null }]
      : calisanlar;
    const r = avansDogrula(form, { calisanlar: dogrulamaCalisanlari, hesaplar });
    if (!r.kayit) { setHatalar(r.hatalar); return; }
    if (duzenle) {
      const d = avansDuzenlenebilirMi(hareket, r.kayit.tutar, hareketler, giderler);
      if (!d.ok) { setHatalar({ tutar: avansEnAzMetni(d) }); return; }
      onKaydet({ ...hareket, ...r.kayit, id: hareket.id, calisanId: hareket.calisanId });
      return;
    }
    onKaydet(r.kayit);
  };
  return (
    <Modal title={duzenle ? "Avansı Düzenle" : "Avans Ver"} onClose={onClose} wide
      footer={<div style={{ display: "flex", gap: 8 }}><Btn variant="ghost" onClick={onClose}>İptal</Btn><Btn onClick={kaydet} disabled={!!calisanKilidi}><Icon name="check" size={14} /> {duzenle ? "Değişiklikleri Kaydet" : "Avansı Kaydet"}</Btn></div>}>
      {calisanKilidi && <LockConflict lockedBy={calisanKilidi.lockedBy} lockedAt={calisanKilidi.lockedAt} onForce={calisanKilidiDevral} onCancel={onClose} />}
      {kapaliHesap && <div style={{ marginBottom: 12 }}><UyariSeridi aile="uyari" testId="kapali-hesap-notu" metin={KAPALI_HESAP_NEDENI} /></div>}
      <div data-testid="avans-formu" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div>
          <Field label="Çalışan">
            <Select value={form.calisanId} disabled={duzenle} onChange={e => set({ calisanId: canli.find(c => String(c.id) === e.target.value)?.id ?? "" })}>
              {duzenle && !canli.some(c => String(c.id) === String(form.calisanId)) && <option value={form.calisanId}>{calisanlar.find(c => String(c.id) === String(form.calisanId))?.ad || "Silinmiş çalışan"}</option>}
              <option value="">Çalışan seçin</option>
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
          <Ipucu>{duzenle ? "Çalışan değiştirilemez; başka çalışana verilmişse avansı silip yeniden girin." : "Avans gider değildir; maaş kalemi doğduğunda o kalemin ödeme penceresinden mahsup edilir."}</Ipucu>
        </div>
      </div>
    </Modal>
  );
};

export const CalisanAvanslari = ({
  calisanlar = [], hesapHareketleri = [], setHesapHareketleri = null, kasaHesaplari = [], giderler = [], giderTurleri = [],
  yururlukAy = null, bugun = today(), canDo = () => true, serverPermissions = null, showToast = () => {}, aktifKullanici = "",
}) => {
  // Spec 0064 R14 (AC-18): ekstreden avans silme anlık işlemdir; çalışan başkasının kilidindeyse reddedilir.
  const { baskasiKilitli } = useKilitListesi(aktifKullanici);
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
    const kilit = baskasiKilitli("calisan", m.calisanId);
    if (kilit) { setSilinecek(null); showToast(kilitRedMesaji(kilit), "err"); return; }
    odemeGirisiYaz({ silinenler: [m.id] }, { setHesapHareketleri });
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
