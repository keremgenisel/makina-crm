import { useState, Fragment } from "react";
import { uid, today } from "../../lib/utils";
import { standartYeni, standartTutarDegistir, standartSonSurumuGeriAl, standartSonaErdir, standartAdDegistir, standartGrupSil, standartGruplar, standartGiderAyi, ayOf, ayEkle } from "../../lib/gider";
import { logAction } from "../../lib/audit";
import { Icon, Field, Input, Btn, Modal, ConfirmDialog } from "../ui";
import { TutarInput, AyInput, HataMetni, Ipucu, tl2 } from "./GiderAlanlari";

// Giderler › Standart Genel Giderler (spec 0001 R22, AC-92…AC-96; plan K37). Bütçe/varsayım listesi:
// dönem gider raporunun HİÇBİR toplamına girmez (hesaplaGiderRaporu bu listeyi almaz); yalnız makina
// maliyeti (0002) tüketir. Tutar değişikliği her zaman yeni sürümdür; eski sürüm kendi döneminde kalır.
export const StandartGiderler = ({ standartGiderler = [], setStandartGiderler, canDo = () => true, showToast = () => {}, serverPermissions }) => {
  const buAy = ayOf(today());
  const [yeni, setYeni] = useState({ ad: "", tutar: "", baslangicAy: buAy });
  const [hata, setHata] = useState("");
  const [islem, setIslem] = useState(null); // {tur:"tutar"|"ad"|"bitir", grup, deger...}
  const [silinecek, setSilinecek] = useState(null);
  const [acik, setAcik] = useState(null);
  const yonetebilir = canDo("gider_tanim");
  const gruplar = standartGruplar(standartGiderler, buAy);
  const buAyToplam = standartGiderAyi(standartGiderler, buAy).toplam;

  const uygula = (r, basari, audit) => {
    if (r.hata) { setIslem(i => (i ? { ...i, hata: r.hata } : i)); setHata(r.hata); return false; }
    setStandartGiderler(() => r.liste);
    if (audit) logAction({ serverPermissions, entity: "standart_gider", ...audit });
    showToast(basari); setHata(""); setIslem(null);
    return true;
  };
  const ekle = () => {
    const r = standartYeni(standartGiderler, yeni, uid);
    if (uygula(r, "Standart gider eklendi.", { action: "olusturuldu", entityName: yeni.ad })) setYeni({ ad: "", tutar: "", baslangicAy: buAy });
  };
  const islemKaydet = () => {
    const g = islem.grup;
    if (islem.tur === "tutar") uygula(standartTutarDegistir(standartGiderler, g.grupId, { tutar: islem.tutar, baslangicAy: islem.ay }, uid), "Yeni tutar sürümü eklendi; önceki sürüm kendi döneminde geçerli kaldı.", { action: "surum_eklendi", entityId: g.grupId, entityName: g.ad });
    if (islem.tur === "ad") uygula(standartAdDegistir(standartGiderler, g.grupId, islem.ad), "Ad güncellendi.", { action: "duzenlendi", entityId: g.grupId, entityName: islem.ad });
    if (islem.tur === "bitir") uygula(standartSonaErdir(standartGiderler, g.grupId, islem.ay), "Sona erdirildi.", { action: "sona_erdirildi", entityId: g.grupId, entityName: g.ad });
  };
  const geriAl = (g) => uygula(standartSonSurumuGeriAl(standartGiderler, g.grupId), "Son sürüm geri alındı.", { action: "surum_geri_alindi", entityId: g.grupId, entityName: g.ad });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-testid="standart-giderler">
      <div role="note" style={{ background: "var(--bluBg, #eff6ff)", border: "1px solid var(--bluBr, #bfdbfe)", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>
        <b style={{ color: "var(--blu700, #1d4ed8)" }}>Bu tutarlar maliyet hesabı içindir, dönem gider raporuna girmez.</b>
        <div style={{ color: "var(--n700, #334155)", marginTop: 2 }}>Bütçe ve varsayım rakamlarıdır; gerçekleşen giderler kalem olarak girilir. Tekrarlayan tanımlarla otomatik bağ yoktur, ad benzerliği bir bağ anlamına gelmez.</div>
      </div>
      <div style={{ background: "var(--surface, #ffffff)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 12, padding: 16 }}>
        {yonetebilir && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 6 }}>
            <div style={{ flex: "1 1 200px" }}><Field label="Ad"><Input value={yeni.ad} onChange={e => setYeni(y => ({ ...y, ad: e.target.value }))} placeholder="Örn. Kira" /></Field></div>
            <div style={{ width: 170 }}><Field label="Aylık tutar (KDV hariç)"><TutarInput ariaLabel="Aylık tutar" value={yeni.tutar} onChange={v => setYeni(y => ({ ...y, tutar: v }))} /></Field></div>
            <div style={{ width: 170 }}><Field label="Geçerlilik başlangıcı"><AyInput ariaLabel="Geçerlilik başlangıcı" value={yeni.baslangicAy} onChange={v => setYeni(y => ({ ...y, baslangicAy: v }))} /></Field></div>
            <div style={{ marginBottom: 14 }}><Btn onClick={ekle}><Icon name="plus" size={14} /> Ekle</Btn></div>
          </div>
        )}
        <HataMetni>{!islem ? hata : ""}</HataMetni>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, margin: "6px 0 10px" }}><span style={{ color: "var(--n600, #475569)" }}>{buAy} için geçerli toplam</span><b>{tl2(buAyToplam)}</b></div>
        {gruplar.length === 0 ? <div style={{ fontSize: 13, color: "var(--n500, #64748b)", padding: "10px 0" }}>Henüz standart genel gider yok.</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ fontSize: 11, color: "var(--n500, #64748b)", textTransform: "uppercase", textAlign: "left", background: "var(--n100, #f8fafc)" }}>
              <th style={{ padding: "8px 10px" }}>Ad</th><th style={{ padding: "8px 10px", textAlign: "right" }}>Bu ay geçerli tutar</th><th style={{ padding: "8px 10px" }}>Geçerlilik</th><th style={{ padding: "8px 10px" }}>Sürüm</th><th />
            </tr></thead>
            <tbody>
              {gruplar.map(g => (
                <Fragment key={g.grupId}>
                  <tr style={{ borderTop: "1px solid var(--n150, #f1f5f9)", opacity: g.sonaErdi ? 0.65 : 1 }}>
                    <td style={{ padding: "9px 10px", fontWeight: 600 }}>{g.ad}{g.sonaErdi && <span style={{ fontSize: 11, color: "var(--n500, #64748b)", marginLeft: 6 }}>sona erdi</span>}</td>
                    <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700 }}>{g.gecerli ? tl2(g.gecerli.tutar) : "—"}</td>
                    <td style={{ padding: "9px 10px", fontSize: 12.5 }}>{g.son.baslangicAy} → {g.son.bitisAy || "süresiz"}</td>
                    <td style={{ padding: "9px 10px" }}><button type="button" onClick={() => setAcik(a => (a === g.grupId ? null : g.grupId))} style={{ background: "none", border: "none", color: "var(--orTx, #c2410c)", fontWeight: 700, fontSize: 12, cursor: "pointer", padding: 0 }}>{acik === g.grupId ? "▾" : "▸"} {g.surumler.length} sürüm</button></td>
                    <td style={{ padding: "6px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                      {yonetebilir && <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <Btn small variant="ghost" onClick={() => setIslem({ tur: "tutar", grup: g, tutar: "", ay: ayEkle(g.son.baslangicAy, 1) > buAy ? ayEkle(g.son.baslangicAy, 1) : buAy })}>Tutarı değiştir</Btn>
                        {g.surumler.length > 1 && <Btn small variant="ghost" onClick={() => geriAl(g)}>Son sürümü geri al</Btn>}
                        {!g.son.bitisAy && <Btn small variant="ghost" onClick={() => setIslem({ tur: "bitir", grup: g, ay: buAy })}>Sona erdir</Btn>}
                        <Btn small variant="ghost" onClick={() => setIslem({ tur: "ad", grup: g, ad: g.ad })} title="Adı değiştir"><Icon name="edit" size={12} /></Btn>
                        <Btn small variant="danger" onClick={() => setSilinecek(g)} title="Sil"><Icon name="trash" size={12} /></Btn>
                      </div>}
                    </td>
                  </tr>
                  {acik === g.grupId && g.surumler.map(s => (
                    <tr key={s.id} style={{ background: "var(--n100, #f8fafc)", fontSize: 12.5 }}>
                      <td style={{ padding: "6px 10px 6px 24px", color: "var(--n600, #475569)" }}>sürüm</td>
                      <td style={{ padding: "6px 10px", textAlign: "right" }}>{tl2(s.tutar)}</td>
                      <td style={{ padding: "6px 10px" }} colSpan={3}>{s.baslangicAy} → {s.bitisAy || "süresiz"}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {islem && (
        <Modal title={islem.tur === "tutar" ? `“${islem.grup.ad}” için yeni tutar` : islem.tur === "ad" ? "Adı değiştir" : `“${islem.grup.ad}” sona erdir`} onClose={() => setIslem(null)}
          footer={<><Btn variant="ghost" onClick={() => setIslem(null)}>İptal</Btn><Btn onClick={islemKaydet}><Icon name="check" size={14} /> Kaydet</Btn></>}>
          {islem.tur === "tutar" && <>
            <Field label="Yeni aylık tutar (KDV hariç)"><TutarInput ariaLabel="Yeni aylık tutar" value={islem.tutar} onChange={v => setIslem(i => ({ ...i, tutar: v, hata: "" }))} /></Field>
            <Field label="Yeni geçerlilik başlangıcı"><AyInput ariaLabel="Yeni geçerlilik başlangıcı" value={islem.ay} onChange={v => setIslem(i => ({ ...i, ay: v, hata: "" }))} /></Field>
            <Ipucu>Eski tutarın üzerine yazılmaz: yeni sürüm oluşur, önceki sürüm bir önceki ayda kapanır ve kendi döneminde geçerli kalır.</Ipucu>
          </>}
          {islem.tur === "ad" && <Field label="Ad"><Input value={islem.ad} onChange={e => setIslem(i => ({ ...i, ad: e.target.value, hata: "" }))} /></Field>}
          {islem.tur === "bitir" && <Field label="Son geçerli ay"><AyInput ariaLabel="Son geçerli ay" value={islem.ay} onChange={v => setIslem(i => ({ ...i, ay: v, hata: "" }))} /></Field>}
          <HataMetni>{islem.hata}</HataMetni>
        </Modal>
      )}
      {silinecek && <ConfirmDialog title="Standart gider silinsin mi?" message={`“${silinecek.ad}” ve tüm sürümleri (${silinecek.surumler.length}) kalıcı olarak silinecek. Çöp kutusuna düşmez.`}
        onConfirm={() => { uygula(standartGrupSil(standartGiderler, silinecek.grupId), "Silindi.", { action: "silindi", entityId: silinecek.grupId, entityName: silinecek.ad }); setSilinecek(null); }}
        onCancel={() => setSilinecek(null)} />}
    </div>
  );
};
