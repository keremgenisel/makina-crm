import { useState } from "react";
import { fmtTR } from "../../lib/utils";
import { tl, DAVRANIS } from "../../lib/gider";
import { Btn, Modal, Input, Field, Icon, Pagination } from "../ui";
import { usePagination } from "../../hooks/usePagination";
import { BosDurum, Ipucu } from "../tasarim";
import { tl2, hedefEtiketi } from "./GiderAlanlari";
import { Rozet } from "./DonemRaporu";

// Tedarikçi ve çalışan ekstresi (spec 0024 B; R12, R13, B6–B9). Hesap saf motorda (kasa.tedarikciEkstresi /
// calisanEkstresi); bu pencere yalnız gösterir. Yazdırılmaz ve dışa aktarılmaz (B9, 0001 C7b).
// hesapla(aralik) → motor sonucu; tur: "tedarikci" | "calisan"; onAvansSil verilirse avans satırı silinebilir.
const ISLEM_AD = { borc: "Borç doğdu", odeme: "Ödeme", maas: "Maaş", mahsup: "Avanstan mahsup", avans: "Avans" };
const para = (k) => tl2(tl(k));

export const EkstrePenceresi = ({ baslik, tur, silinmis = false, hesapla, hesapAdi = () => "", onAvansSil = null, onClose }) => {
  const [aralik, setAralik] = useState({ bas: "", bit: "" });
  const e = hesapla(aralik);
  // Spec 0062 R8, R30, R31: pencere içi 5 satır; sıra eskiden yeniye kalır, tarih aralığı değişince 1. sayfa. Son bakiye
  // ve devir motorun bütün sonucundan (R16); devir satırı yalnız 1. sayfada.
  const { page, setPage, paged, perPage } = usePagination(e.satirlar, 5, `${aralik.bas}|${aralik.bit}`);
  const calisan = tur === "calisan";
  const aciklama = (s) => {
    const k = s.kalem;
    if (s.tur === "maas") {
      const r = s.kirilim;
      return [k.aciklama, `resmi ${para(r.resmiK)} · elden ${para(r.eldenK)}${r.ekK ? ` · ek ödeme ${para(r.ekK)}` : ""}`].filter(Boolean).join(" · ");
    }
    if (s.tur === "borc") return [k.aciklama, fmtTR(k.tarih)].filter(Boolean).join(" · ");
    const m = s.hareket;
    // Spec 0051 R10, AC-17, AC-28: çalışan ekstresinde ödeme ve mahsup kapattığı hedefi yazar (Resmi / Elden; tek kaynak hedefAdi).
    const hedef = calisan && (s.tur === "odeme" || s.tur === "mahsup") ? hedefEtiketi(k, DAVRANIS.PERSONEL, s.hedefPaylari) : null;
    return [hedef, s.tur === "avans" ? null : k && `${k.aciklama || fmtTR(k.tarih)}`, m.yontem || null, s.tur === "mahsup" ? null : hesapAdi(m.hesapId), m.aciklama || null]
      .filter(Boolean).join(" · ");
  };
  const etki = (s) => (s.tur === "mahsup" ? <span style={{ color: "var(--n500, #64748b)" }}>{para(s.tutarK)}<div style={{ fontSize: 11 }}>net etkisiz</div></span>
    : <span style={{ color: s.etkiK < 0 ? "var(--grn700, #15803d)" : "var(--red700, #b91c1c)" }}>{s.etkiK < 0 ? "−" : "+"}{para(Math.abs(s.etkiK))}</span>);
  const izgara = { display: "grid", gridTemplateColumns: "90px 130px minmax(0, 1fr) 120px 130px 40px", gap: 10, alignItems: "center" };
  const bakiyeEtiketi = calisan
    ? (e.bakiyeK >= 0 ? `Çalışana borcumuz ${para(e.bakiyeK)}` : `Çalışandan alacağımız ${para(-e.bakiyeK)}`)
    : `Kalan borç ${para(e.bakiyeK)}`;

  return (
    <Modal title={`${calisan ? "Çalışan" : "Tedarikçi"} Ekstresi`} onClose={onClose} wide footer={<Btn variant="ghost" onClick={onClose}>Kapat</Btn>}>
      <div data-testid="ekstre-penceresi">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{baslik}{silinmis && <span style={{ marginLeft: 8 }}><Rozet renk="kirmizi">Silinmiş</Rozet></span>}</div>
            <div data-testid="ekstre-ozet" style={{ fontSize: 13, marginTop: 4 }}>
              <b>{bakiyeEtiketi}</b>
              {calisan && <span style={{ color: "var(--n600, #475569)" }}> · Açık avans {para(e.avansBorcK || 0)}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ width: 150 }}><Field label="Başlangıç"><Input type="date" value={aralik.bas} onChange={ev => setAralik(a => ({ ...a, bas: ev.target.value }))} /></Field></div>
            <div style={{ width: 150 }}><Field label="Bitiş"><Input type="date" value={aralik.bit} onChange={ev => setAralik(a => ({ ...a, bit: ev.target.value }))} /></Field></div>
          </div>
        </div>
        {e.satirlar.length === 0 && e.devirK == null ? (
          <BosDurum testId="bos-ekstre" baslik="Hareket yok" metin={calisan ? "Bu çalışan için maaş kalemi, ödeme ya da avans kaydı yok." : "Bu tedarikçiye bağlı gider kalemi yok."} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 720 }}>
              <div style={{ ...izgara, fontSize: 11.5, fontWeight: 700, color: "var(--n500, #64748b)", padding: "0 0 6px", borderBottom: "1px solid var(--n200, #e2e8f0)" }}>
                <span>Tarih</span><span>İşlem</span><span>Açıklama</span><span style={{ textAlign: "right" }}>Tutar</span><span style={{ textAlign: "right" }}>{calisan ? "Net bakiye" : "Bakiye"}</span><span />
              </div>
              {e.devirK != null && page === 1 && (
                <div data-testid="ekstre-devir" style={{ ...izgara, fontSize: 13, padding: "7px 0", borderTop: "1px solid var(--n150, #f1f5f9)", color: "var(--n600, #475569)" }}>
                  <span>{fmtTR(aralik.bas)}</span><span>Devreden bakiye</span><span /><span /><b style={{ textAlign: "right" }}>{para(e.devirK)}</b><span />
                </div>
              )}
              {paged.map((s, i) => (
                <div key={(page - 1) * perPage + i} data-testid="ekstre-satiri" style={{ ...izgara, fontSize: 13, padding: "7px 0", borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                  <span>{fmtTR(s.tarih)}</span>
                  <span>{ISLEM_AD[s.tur] || s.tur}{s.goc && <div style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>Eski kayıttan aktarıldı</div>}</span>
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={aciklama(s)}>{aciklama(s)}</span>
                  <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{etki(s)}</span>
                  <b style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{para(s.bakiyeK)}</b>
                  <span style={{ textAlign: "right" }}>{s.tur === "avans" && onAvansSil && <Btn small variant="danger" onClick={() => onAvansSil(s.hareket)} title="Avansı sil"><Icon name="trash" size={12} /></Btn>}</span>
                </div>
              ))}
            </div>
            <Pagination total={e.satirlar.length} page={page} setPage={setPage} perPage={perPage} />
          </div>
        )}
        <Ipucu>{calisan
          ? "Net bakiye: artı çalışana borcumuz, eksi çalışandan alacağımız (açık avans). Mahsup borcu ve avansı birlikte kapatır, net bakiyeyi değiştirmez."
          : "Borç, kalemin ödenecek tutarıdır (KDV dâhil). Kira stopajı vergi dairesine ödenir, bu ekstreye girmez."}</Ipucu>
      </div>
    </Modal>
  );
};
