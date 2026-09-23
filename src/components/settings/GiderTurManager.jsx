import { useState } from "react";
import { uid, trLower } from "../../lib/utils";
import { turKullanim } from "../../lib/gider";
import { logAction } from "../../lib/audit";
import { Icon, Field, Input, Select, Btn, Modal } from "../ui";
import { DavranisRozeti, DAVRANIS_AD, HataMetni, Ipucu } from "../gider/GiderAlanlari";

// Gider türleri (spec 0001 R2, plan K12/K13). Davranış (normal / kira / personel) tür oluşturulurken
// seçilir; tür kullanıma girince davranışı kilitlenir (ad serbest). Silme kalıcıdır (R12): kullanımdaki
// tür yalnız AYNI davranıştaki bir türe taşınarak silinir; böyle bir tür yoksa silme engellenir.
const VARSAYILAN_TURLER = [
  ["Kira", "kira"], ["Personel", "personel"], ["Elektrik", "normal"], ["Doğalgaz", "normal"], ["Su", "normal"],
  ["İnternet ve telefon", "normal"], ["Muhasebe", "normal"], ["Hammadde", "normal"], ["Nakliye", "normal"],
  ["Bakım ve onarım", "normal"], ["Sosyal güvenlik (Bağkur)", "normal"],
];

export const GiderTurManager = ({ giderTurleri = [], setGiderTurleri, giderler = [], setGiderler, giderTanimlari = [], setGiderTanimlari, showToast = () => {}, canDo = () => true, serverPermissions }) => {
  const [yeni, setYeni] = useState({ ad: "", davranis: "normal" });
  const [hata, setHata] = useState("");
  const [duzenle, setDuzenle] = useState(null); // {id, ad, davranis, kullanimda}
  const [sil, setSil] = useState(null);         // {tur, kullanim, hedefId}
  const yonetebilir = canDo("gider_tanim");

  const adVarMi = (ad, haricId) => giderTurleri.some(t => t.id !== haricId && trLower(t.ad.trim()) === trLower(ad.trim()));

  const ekle = () => {
    const ad = yeni.ad.trim();
    if (!ad) { setHata("Tür adı boş olamaz."); return; }
    if (adVarMi(ad)) { setHata(`“${ad}” türü zaten var.`); return; }
    const id = uid();
    setGiderTurleri(p => [...p, { id, ad, davranis: yeni.davranis }]);
    logAction({ serverPermissions, action: "olusturuldu", entity: "gider_tur", entityId: id, entityName: ad, detail: { davranis: yeni.davranis } });
    setYeni({ ad: "", davranis: "normal" }); setHata("");
    showToast("Gider türü eklendi.");
  };
  const varsayilanlariEkle = () => {
    const eklenecek = VARSAYILAN_TURLER.filter(([ad]) => !adVarMi(ad)).map(([ad, davranis]) => ({ id: uid(), ad, davranis }));
    if (!eklenecek.length) return;
    setGiderTurleri(p => [...p, ...eklenecek]);
    showToast(`${eklenecek.length} tür eklendi. Adlarını ve listeyi dilediğiniz gibi düzenleyebilirsiniz.`);
  };

  const duzenleAc = (t) => {
    const k = turKullanim(t.id, giderler, giderTanimlari);
    setDuzenle({ id: t.id, ad: t.ad, davranis: t.davranis, eskiDavranis: t.davranis, kullanimda: k.kalem + k.tanim > 0, hata: "" });
  };
  const duzenleKaydet = () => {
    const ad = duzenle.ad.trim();
    if (!ad) { setDuzenle(d => ({ ...d, hata: "Tür adı boş olamaz." })); return; }
    if (adVarMi(ad, duzenle.id)) { setDuzenle(d => ({ ...d, hata: `“${ad}” türü zaten var.` })); return; }
    if (duzenle.kullanimda && duzenle.davranis !== duzenle.eskiDavranis) { setDuzenle(d => ({ ...d, hata: "Tür kullanımda olduğu için davranış değiştirilemez." })); return; }
    setGiderTurleri(p => p.map(t => (t.id === duzenle.id ? { ...t, ad, davranis: duzenle.davranis } : t)));
    logAction({ serverPermissions, action: "duzenlendi", entity: "gider_tur", entityId: duzenle.id, entityName: ad });
    setDuzenle(null);
    showToast("Gider türü güncellendi.");
  };

  const silAc = (t) => {
    const kullanim = turKullanim(t.id, giderler, giderTanimlari);
    const hedefler = giderTurleri.filter(x => x.id !== t.id && x.davranis === t.davranis);
    setSil({ tur: t, kullanim, hedefler, hedefId: hedefler[0]?.id ?? "" });
  };
  const silOnayla = () => {
    const { tur, kullanim, hedefId } = sil;
    const kullanimda = kullanim.kalem + kullanim.tanim > 0;
    if (kullanimda) {
      const hedef = giderTurleri.find(x => String(x.id) === String(hedefId));
      if (!hedef || hedef.davranis !== tur.davranis) return;
      setGiderler?.(p => p.map(k => (String(k.turId) === String(tur.id) ? { ...k, turId: hedef.id } : k)));
      setGiderTanimlari?.(p => p.map(k => (String(k.turId) === String(tur.id) ? { ...k, turId: hedef.id } : k)));
      logAction({ serverPermissions, action: "tur_tasindi", entity: "gider_tur", entityId: tur.id, entityName: tur.ad, detail: { hedef: hedef.ad, kalem: kullanim.kalem, tanim: kullanim.tanim } });
    }
    setGiderTurleri(p => p.filter(x => x.id !== tur.id));
    logAction({ serverPermissions, action: "silindi", entity: "gider_tur", entityId: tur.id, entityName: tur.ad });
    setSil(null);
    showToast(kullanimda ? "Kayıtlar taşındı, tür silindi." : "Gider türü silindi.");
  };

  const siraliTurler = [...giderTurleri].sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  return (
    <div>
      {yonetebilir && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 6, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 220px" }}>
            <Field label="Yeni tür adı"><Input value={yeni.ad} onChange={e => { setYeni(p => ({ ...p, ad: e.target.value })); setHata(""); }} onKeyDown={e => { if (e.key === "Enter") ekle(); }} placeholder="Örn. Sigorta" /></Field>
          </div>
          <div style={{ width: 170 }}>
            <Field label="Davranış"><Select value={yeni.davranis} onChange={e => setYeni(p => ({ ...p, davranis: e.target.value }))}>
              {Object.entries(DAVRANIS_AD).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select></Field>
          </div>
          <div style={{ marginBottom: 14 }}><Btn onClick={ekle}><Icon name="plus" size={14} /> Ekle</Btn></div>
        </div>
      )}
      <HataMetni>{hata}</HataMetni>
      <Ipucu>Kira davranışı stopaj alanlarını, personel davranışı çalışan bağını açar. Davranış tür oluşturulurken seçilir; tür kullanıma girdikten sonra değiştirilemez.</Ipucu>

      <div style={{ border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, overflow: "hidden", marginTop: 12 }}>
        {siraliTurler.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--n500, #64748b)", fontSize: 13 }}>
            Henüz gider türü yok.
            {yonetebilir && <div style={{ marginTop: 10 }}><Btn small variant="ghost" onClick={varsayilanlariEkle}>Önerilen türleri ekle</Btn></div>}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: "var(--n100, #f8fafc)", textAlign: "left", fontSize: 11, color: "var(--n500, #64748b)", textTransform: "uppercase" }}>
              <th style={{ padding: "9px 14px" }}>Tür adı</th><th style={{ padding: "9px 14px" }}>Davranış</th><th style={{ padding: "9px 14px" }}>Kullanım</th><th />
            </tr></thead>
            <tbody>
              {siraliTurler.map(t => {
                const k = turKullanim(t.id, giderler, giderTanimlari);
                const kullanimda = k.kalem + k.tanim > 0;
                return (
                  <tr key={t.id} style={{ borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>{t.ad}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><DavranisRozeti davranis={t.davranis} />
                        {kullanimda && <span title="Kullanımda: davranış değiştirilemez" style={{ color: "var(--n500, #64748b)", display: "inline-flex" }}><Icon name="lock" size={12} /></span>}</span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "var(--n600, #475569)" }}>
                      {kullanimda ? `${k.kalem} kalem${k.cop ? ` (${k.cop}’i çöpte)` : ""}${k.tanim ? ` · ${k.tanim} tanım` : ""}` : "Kullanılmıyor"}
                    </td>
                    <td style={{ padding: "8px 14px", textAlign: "right" }}>
                      {yonetebilir && <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <Btn small variant="ghost" onClick={() => duzenleAc(t)} title="Düzenle"><Icon name="edit" size={12} /></Btn>
                        <Btn small variant="danger" onClick={() => silAc(t)} title="Sil"><Icon name="trash" size={12} /></Btn>
                      </div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {duzenle && (
        <Modal title="Gider Türünü Düzenle" onClose={() => setDuzenle(null)}
          footer={<><Btn variant="ghost" onClick={() => setDuzenle(null)}>İptal</Btn><Btn onClick={duzenleKaydet}><Icon name="check" size={14} /> Kaydet</Btn></>}>
          <Field label="Tür adı"><Input value={duzenle.ad} onChange={e => setDuzenle(d => ({ ...d, ad: e.target.value, hata: "" }))} /></Field>
          <Field label="Davranış">
            <Select value={duzenle.davranis} disabled={duzenle.kullanimda} onChange={e => setDuzenle(d => ({ ...d, davranis: e.target.value, hata: "" }))}>
              {Object.entries(DAVRANIS_AD).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            {duzenle.kullanimda && <Ipucu>Tür kullanımda olduğu için davranış değiştirilemez. Ad değiştirilebilir.</Ipucu>}
          </Field>
          <HataMetni>{duzenle.hata}</HataMetni>
        </Modal>
      )}

      {sil && (() => {
        const kullanimda = sil.kullanim.kalem + sil.kullanim.tanim > 0;
        const engelli = kullanimda && sil.hedefler.length === 0;
        return (
          <Modal title={kullanimda ? `“${sil.tur.ad}” türü kullanımda` : `“${sil.tur.ad}” türü silinsin mi?`} onClose={() => setSil(null)}
            footer={engelli
              ? <Btn onClick={() => setSil(null)}>Tamam</Btn>
              : <><Btn variant="ghost" onClick={() => setSil(null)}>İptal</Btn><Btn variant="danger" onClick={silOnayla}><Icon name="trash" size={14} /> {kullanimda ? "Taşı ve Sil" : "Sil"}</Btn></>}>
            {!kullanimda && <div style={{ fontSize: 13 }}>Bu tür hiçbir kalemde veya tanımda kullanılmıyor. Silme kalıcıdır, çöp kutusuna düşmez.</div>}
            {kullanimda && (
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                Bu türe bağlı <b>{sil.kullanim.kalem} gider kalemi</b>{sil.kullanim.cop ? ` (${sil.kullanim.cop}’i çöpte)` : ""}{sil.kullanim.tanim ? <> ve <b>{sil.kullanim.tanim} tekrarlayan tanım</b></> : null} var. Hiçbir kalem türsüz kalamaz.
                {engelli ? (
                  <div style={{ marginTop: 10, color: "var(--red700, #b91c1c)", fontWeight: 600 }}>
                    {DAVRANIS_AD[sil.tur.davranis]} davranışında başka tür yok, bu yüzden silinemez. Önce {DAVRANIS_AD[sil.tur.davranis]} davranışlı yeni bir tür tanımlayın.
                  </div>
                ) : (
                  <div style={{ marginTop: 12 }}>
                    <Field label="Kayıtları şu türe taşı">
                      <Select value={sil.hedefId} onChange={e => setSil(s => ({ ...s, hedefId: e.target.value }))}>
                        {sil.hedefler.map(h => <option key={h.id} value={h.id}>{h.ad}</option>)}
                      </Select>
                    </Field>
                    <Ipucu>Listede yalnız {DAVRANIS_AD[sil.tur.davranis]} davranışlı türler var ({sil.hedefler.length}). Tür silme kalıcıdır, çöpe düşmez.</Ipucu>
                  </div>
                )}
              </div>
            )}
          </Modal>
        );
      })()}
    </div>
  );
};
