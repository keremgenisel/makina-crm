import { useState } from "react";
import { uid } from "../../lib/utils";
import { tedarikciAdHatasi, tedarikciKullanim } from "../../lib/gider";
import { logAction } from "../../lib/audit";
import { Icon, Field, Input, Btn, Modal, ConfirmDialog } from "../ui";
import { tl2 } from "./GiderAlanlari";
import { HataMetni, Ipucu } from "../tasarim";
import { Rozet } from "./DonemRaporu";
import { EkstrePenceresi } from "./EkstrePenceresi";
import { tedarikciEkstresi } from "../../lib/kasa";

// Giderler › Tedarikçiler (spec 0001 R13, AC-40/44/45/46/62; plan K16). Ayarlar'da DEĞİL, bu sekmede
// yönetilir: settings izni olan ama gider yetkisi olmayan kullanıcı listeyi görmesin (AC-48).
// Silme kalıcıdır (R12); kullanımdaki tedarikçi (çöpteki kalemler ve tanımlar dahil) silinemez.
const BOS = { id: null, ad: "", yetkili: "", telefon: "", eposta: "", vergiDairesi: "", vergiNo: "", adres: "", not: "" };

export const Tedarikciler = ({ tedarikciler = [], setTedarikciler, giderler = [], giderTanimlari = [], rapor, canDo = () => true, showToast = () => {}, serverPermissions,
  // Spec 0024 B (R12, B6, B10, B11): tedarikçi ekstresi ve silme uyarısındaki kalan borç. giderler hareketlerden türetilmiş olabilir.
  hesapHareketleri = null, giderTurleri = [], yururlukAy = null, bugun = null, kasaHesaplari = [] }) => {
  const [form, setForm] = useState(null);
  const [ekstre, setEkstre] = useState(null);
  const ekstreHesapla = (t, aralik = null) => tedarikciEkstresi(t.id, { giderler, hareketler: hesapHareketleri || [], turler: giderTurleri, yururlukAy, bugun, aralik });
  const hesapAdi = (id) => { const h = kasaHesaplari.find(x => String(x.id) === String(id)); return h ? h.ad : id == null ? "Hesap belirtilmedi" : "Silinmiş hesap"; };
  const [hata, setHata] = useState("");
  const [sil, setSil] = useState(null);
  const harcama = new Map((rapor?.tedarikciKirilimi?.satirlar || []).map(s => [String(s.tedarikciId), s]));

  const ac = (t) => { setHata(""); setForm(t ? { ...BOS, ...t } : { ...BOS }); };
  const kaydet = () => {
    const h = tedarikciAdHatasi(form.ad, tedarikciler, form.id);
    if (h) { setHata(h); return; }
    const kayit = { ...form, ad: form.ad.trim(), id: form.id ?? uid() };
    const yeni = form.id == null;
    setTedarikciler(p => (yeni ? [...p, kayit] : p.map(t => (t.id === kayit.id ? kayit : t))));
    logAction({ serverPermissions, action: yeni ? "olusturuldu" : "duzenlendi", entity: "tedarikci", entityId: kayit.id, entityName: kayit.ad });
    setForm(null);
    showToast(yeni ? "Tedarikçi eklendi." : "Tedarikçi güncellendi. Bağlı kalemler yeni adla görünür.");
  };
  const silAc = (t) => setSil({ t, k: tedarikciKullanim(t.id, giderler, giderTanimlari) });
  const silOnayla = () => {
    setTedarikciler(p => p.filter(x => x.id !== sil.t.id));
    logAction({ serverPermissions, action: "silindi", entity: "tedarikci", entityId: sil.t.id, entityName: sil.t.ad });
    setSil(null);
    showToast("Tedarikçi silindi.");
  };
  const sirali = [...tedarikciler].sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  const alan = (ad, key, ph) => <Field label={ad}><Input value={form[key] || ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} /></Field>;

  return (
    <div style={{ background: "var(--surface, #ffffff)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 12, overflow: "hidden" }} data-testid="tedarikciler">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: "1px solid var(--n200, #e2e8f0)", gap: 10, flexWrap: "wrap" }}>
        <b>Tedarikçiler <span style={{ color: "var(--n500, #64748b)", fontWeight: 500, fontSize: 13 }}>· {tedarikciler.length}</span></b>
        {canDo("tedarikci_add") && <Btn onClick={() => ac(null)}><Icon name="plus" size={14} /> Yeni Tedarikçi</Btn>}
      </div>
      {sirali.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--n500, #64748b)" }}>Henüz tedarikçi yok. Tedarikçi seçimi opsiyoneldir; seçilmeyen kalemler raporda “tedarikçi seçilmemiş” grubunda toplanır.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 720 }}>
            <thead><tr style={{ background: "var(--n100, #f8fafc)", fontSize: 11, color: "var(--n500, #64748b)", textTransform: "uppercase", textAlign: "left" }}>
              <th style={{ padding: "9px 12px" }}>Tedarikçi</th><th style={{ padding: "9px 12px" }}>Vergi</th><th style={{ padding: "9px 12px" }}>Kullanım</th>
              <th style={{ padding: "9px 12px", textAlign: "right" }}>Harcama<div style={{ textTransform: "none", fontWeight: 500 }}>seçili dönem</div></th>
              <th style={{ padding: "9px 12px", textAlign: "right" }}>Açık borç<div style={{ textTransform: "none", fontWeight: 500 }}>tüm dönemler</div></th><th />
            </tr></thead>
            <tbody>
              {sirali.map(t => {
                const k = tedarikciKullanim(t.id, giderler, giderTanimlari);
                const h = harcama.get(String(t.id));
                return (
                  <tr key={t.id} style={{ borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                    <td style={{ padding: "10px 12px" }}><b>{t.ad}</b><div style={{ fontSize: 12, color: "var(--n500, #64748b)" }}>{[t.yetkili, t.telefon, t.eposta].filter(Boolean).join(" · ")}</div></td>
                    <td style={{ padding: "10px 12px", fontSize: 12.5, color: "var(--n600, #475569)" }}>{[t.vergiDairesi, t.vergiNo].filter(Boolean).join(" · ") || "—"}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12.5, color: "var(--n600, #475569)" }}>{k.kalem + k.tanim ? `${k.kalem} kalem${k.cop ? ` (${k.cop}’i çöpte)` : ""}${k.tanim ? ` · ${k.tanim} tanım` : ""}` : "Kullanılmıyor"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{h?.harcama ? <b>{tl2(h.harcama)}</b> : "—"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{h?.acikBorc ? <><b>{tl2(h.acikBorc)}</b>{h.vadesiGecti && <div style={{ marginTop: 4 }}><Rozet renk="kirmizi">Vadesi geçti</Rozet></div>}</> : "—"}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                      {Array.isArray(hesapHareketleri) && <><Btn small variant="ghost" onClick={() => setEkstre(t)}>Ekstre</Btn>{" "}</>}
                      {canDo("tedarikci_edit") && <Btn small variant="ghost" onClick={() => ac(t)} title="Düzenle"><Icon name="edit" size={12} /></Btn>}{" "}
                      {canDo("tedarikci_delete") && <Btn small variant="danger" onClick={() => silAc(t)} title="Sil"><Icon name="trash" size={12} /></Btn>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Modal title={form.id == null ? "Yeni Tedarikçi" : "Tedarikçiyi Düzenle"} onClose={() => setForm(null)} wide
          footer={<><Btn variant="ghost" onClick={() => setForm(null)}>İptal</Btn><Btn onClick={kaydet}><Icon name="check" size={14} /> Kaydet</Btn></>}>
          <Field label="Ad *"><Input value={form.ad} onChange={e => { setForm(f => ({ ...f, ad: e.target.value })); setHata(""); }} placeholder="Tedarikçi adı" /><HataMetni>{hata}</HataMetni></Field>
          <div style={{ display: "flex", gap: 12 }}><div style={{ flex: 1 }}>{alan("Yetkili kişi", "yetkili")}</div><div style={{ flex: 1 }}>{alan("Telefon", "telefon")}</div></div>
          {alan("E-posta", "eposta")}
          <div style={{ display: "flex", gap: 12 }}><div style={{ flex: 1 }}>{alan("Vergi dairesi", "vergiDairesi")}</div><div style={{ flex: 1 }}>{alan("Vergi no", "vergiNo")}</div></div>
          {alan("Adres", "adres")}
          {alan("Not", "not")}
          <Ipucu>Yalnız ad zorunludur. Aynı ad (büyük ve küçük harf farkı dahil) ikinci kez girilemez.</Ipucu>
        </Modal>
      )}
      {sil && (sil.k.kalem + sil.k.tanim > 0 ? (
        <Modal title={`“${sil.t.ad}” silinemez`} onClose={() => setSil(null)} footer={<Btn onClick={() => setSil(null)}>Tamam</Btn>}>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            Bu tedarikçi <b>{sil.k.kalem} gider kaleminde</b>{sil.k.cop ? <> kullanılıyor, <b>{sil.k.cop}’i çöp kutusunda</b></> : " kullanılıyor"}{sil.k.tanim ? <> ve <b>{sil.k.tanim} tekrarlayan tanımda</b> geçiyor</> : null}.
            Çöpteki kalem geri alınırsa tedarikçi bağı kopmasın diye o da sayılır. Silmek için önce kalemlerde başka tedarikçi seçin.
            {(() => { const b = ekstreHesapla(sil.t).bakiye; return b > 0 ? <div data-testid="tedarikci-kalan-borc" style={{ marginTop: 8, color: "var(--red700, #b91c1c)", fontWeight: 700 }}>Bu tedarikçiye {tl2(b)} kalan borç var. Tedarikçi silinse bile borç kapanmaz; silinmiş tedarikçinin ekstresine erişilemez.</div> : null; })()}
          </div>
        </Modal>
      ) : (
        <ConfirmDialog title="Tedarikçi silinsin mi?" message={`“${sil.t.ad}” kalıcı olarak silinecek (çöp kutusuna düşmez).`} onConfirm={silOnayla} onCancel={() => setSil(null)} />
      ))}
      {ekstre && <EkstrePenceresi tur="tedarikci" baslik={ekstre.ad} hesapAdi={hesapAdi} hesapla={(aralik) => ekstreHesapla(ekstre, aralik)} onClose={() => setEkstre(null)} />}
    </div>
  );
};
