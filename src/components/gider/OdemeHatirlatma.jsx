import { useState } from "react";
import { fmtTR } from "../../lib/utils";
import { gunFarkiMetni } from "../../lib/odemeHatirlatma";
import { Btn, Icon, Modal } from "../ui";
import { tl2 } from "./GiderAlanlari";

// Ödeme hatırlatıcısı arayüzü (spec 0003 R2–R4, R6, R9). Sessizdir: ses, açılışta pencere, bildirim yok.
// Rakamlar odemeHatirlatmalari'ndan gelir; bu dosya yalnız gösterir.

// Anasayfa kartı: StatCard görsel dili, iki ayrı sayı (R2, AC-25; plan H2).
export const OdemeHatirlatmaKarti = ({ sonuc, onClick }) => (
  <div onClick={onClick} data-testid="odeme-hatirlatma-karti" className="stat-card stat-card--clickable"
    style={{ borderLeft: "4px solid var(--red600, #dc2626)", display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
    <div style={{ minWidth: 180 }}>
      <div style={{ fontSize: 13, color: "var(--n500, #64748b)", fontWeight: 500 }}>Gider Ödemeleri</div>
      <div style={{ fontSize: 12, color: "var(--n400, #94a3b8)", marginTop: 4 }}>Ödenmemiş, son ödeme tarihi girilmiş kalemler · Görmek için tıkla</div>
    </div>
    <div data-testid="hatirlatma-gecmis-sayi">
      <div style={{ fontSize: 26, fontWeight: 700, color: sonuc.sayilar.gecmis ? "var(--red700, #b91c1c)" : "var(--n900, #0f172a)" }}>{sonuc.sayilar.gecmis}</div>
      <div style={{ fontSize: 12, color: "var(--n500, #64748b)" }}>Vadesi geçmiş</div>
    </div>
    <div data-testid="hatirlatma-yaklasan-sayi">
      <div style={{ fontSize: 26, fontWeight: 700, color: sonuc.sayilar.yaklasan ? "var(--amb700, #b45309)" : "var(--n900, #0f172a)" }}>{sonuc.sayilar.yaklasan}</div>
      <div style={{ fontSize: 12, color: "var(--n500, #64748b)" }}>Yaklaşan ({sonuc.esikGun} gün içinde)</div>
    </div>
  </div>
);

const renk = { gecmis: ["var(--redBg, #fef2f2)", "var(--redBr, #fecaca)", "var(--red700, #b91c1c)"], yaklasan: ["var(--ambBg, #fffbeb)", "var(--ambBr, #fde68a)", "var(--amb700, #b45309)"] };
const izgara = { display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) 130px 140px 110px 90px", gap: 10, alignItems: "center" };

const KalemSatiri = ({ o, bolum, odendiYetkisi, onOdendi, girinti = false }) => (
  <div data-testid="hatirlatma-satiri" style={{ ...izgara, padding: "8px 12px", paddingLeft: girinti ? 28 : 12, fontSize: 13, borderTop: "1px solid var(--n150, #f1f5f9)" }}>
    <div style={{ minWidth: 0 }}>
      <b>{o.taraf}</b>
      {!o.personel && o.kalem.aciklama && <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.kalem.aciklama}</div>}
    </div>
    <b style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{tl2(o.odenecek)}</b>
    <span><span style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>{o.vadeEtiketi}</span><br />{fmtTR(o.vade)}</span>
    <span style={{ fontWeight: 700, color: renk[bolum][2] }}>{gunFarkiMetni(o.gunFarki)}</span>
    <span style={{ textAlign: "right" }}>{odendiYetkisi && <Btn small variant="ghost" onClick={() => onOdendi(o.kalem)} title="Ödendi olarak işaretle"><Icon name="check" size={12} /> Ödendi</Btn>}</span>
  </div>
);

const Bolum = ({ baslik, bolum, satirlar, odendiYetkisi, onOdendi }) => {
  const [acik, setAcik] = useState({});
  if (!satirlar.length) return null;
  return (
    <div data-testid={`hatirlatma-bolum-${bolum}`} style={{ background: renk[bolum][0], border: `1px solid ${renk[bolum][1]}`, borderRadius: 10, marginBottom: 14, overflow: "hidden" }}>
      <div style={{ padding: "9px 12px", fontSize: 12.5, fontWeight: 800, color: renk[bolum][2], textTransform: "uppercase", letterSpacing: .5 }}>{baslik}</div>
      <div style={{ ...izgara, padding: "0 12px 6px", fontSize: 11, color: "var(--n500, #64748b)", fontWeight: 700 }}>
        <span>Borcun tarafı</span><span style={{ textAlign: "right" }}>Ödenecek tutar</span><span>Vade</span><span>Gün</span><span />
      </div>
      <div style={{ background: "var(--surface, #ffffff)" }}>
        {satirlar.map(s => s.tur === "personel" ? (
          <div key="personel">
            <div data-testid="hatirlatma-personel" style={{ ...izgara, padding: "8px 12px", fontSize: 13, borderTop: "1px solid var(--n150, #f1f5f9)", background: "#faf7ff" }}>
              <div>
                <b>Çalışanlar · {s.adet} kalem</b>
                <div><button type="button" aria-expanded={!!acik.personel} onClick={() => setAcik(a => ({ ...a, personel: !a.personel }))}
                  style={{ background: "none", border: "none", padding: 0, color: "var(--orTx, #c2410c)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {acik.personel ? "▾ Çalışanları gizle" : "▸ Çalışanları göster"}</button></div>
              </div>
              <b style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{tl2(s.odenecek)}</b>
              <span>{fmtTR(s.vade)}</span><span style={{ fontWeight: 700, color: renk[bolum][2] }}>{gunFarkiMetni(s.kalemler[0].gunFarki)}</span><span />
            </div>
            {acik.personel && s.kalemler.map(o => <KalemSatiri key={o.id} o={o} bolum={bolum} odendiYetkisi={odendiYetkisi} onOdendi={onOdendi} girinti />)}
          </div>
        ) : <KalemSatiri key={s.id} o={s} bolum={bolum} odendiYetkisi={odendiYetkisi} onOdendi={onOdendi} />)}
      </div>
    </div>
  );
};

// Liste penceresi (R2–R4, R6; AC-13 boş durum). "Giderlerde Görüntüle" süzgeç açık hâlde Giderler'e götürür.
export const OdemeHatirlatmaPenceresi = ({ sonuc, odendiYetkisi, onOdendi, onGiderlereGit, onClose }) => {
  const bos = sonuc.sayilar.gecmis + sonuc.sayilar.yaklasan === 0;
  return (
    <Modal wide title="Gider Ödemeleri" onClose={onClose}
      footer={<div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        {onGiderlereGit && <Btn variant="ghost" onClick={onGiderlereGit}>Giderlerde Görüntüle</Btn>}
        <Btn onClick={onClose}>Kapat</Btn>
      </div>}>
      <div style={{ maxHeight: 480, overflowY: "auto" }} data-testid="odeme-hatirlatma-listesi">
        {bos ? (
          <div data-testid="hatirlatma-bos" style={{ textAlign: "center", padding: "28px 12px", color: "var(--n600, #475569)", fontSize: 13 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Hatırlatılacak ödeme yok</div>
            Vadesi geçmiş veya {sonuc.esikGun} gün içinde vadesi gelecek ödenmemiş gider kalemi bulunmuyor.
          </div>
        ) : (
          <>
            <Bolum baslik={`Vadesi geçmiş (${sonuc.sayilar.gecmis})`} bolum="gecmis" satirlar={sonuc.gecmisSatirlar} odendiYetkisi={odendiYetkisi} onOdendi={onOdendi} />
            <Bolum baslik={`Yaklaşan (${sonuc.sayilar.yaklasan}) · ${sonuc.esikGun} gün içinde, bugün dahil`} bolum="yaklasan" satirlar={sonuc.yaklasanSatirlar} odendiYetkisi={odendiYetkisi} onOdendi={onOdendi} />
          </>
        )}
      </div>
    </Modal>
  );
};
