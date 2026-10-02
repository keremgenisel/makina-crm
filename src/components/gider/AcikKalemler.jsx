import { useMemo, useState } from "react";
import { fmtTR } from "../../lib/utils";
import { tl } from "../../lib/gider";
import { acikKalemler, acikOzet } from "../../lib/acikKalemler";
import { YAS_SIRA } from "../../lib/yaslandirma";
import { gunFarki, gunFarkiMetni } from "../../lib/odemeHatirlatma";
import { KartBolum, BosDurum } from "../tasarim";
import { tl2, hedefBasligi } from "./GiderAlanlari";
import { Rozet, AcKapa } from "./DonemRaporu";

// Spec 0061 (R1–R11, R19–R22, R26, R28–R29, R34): Giderler › Dönem Raporu'nun "Açık kalemler (tüm dönemler)" kipi.
// Dönem seçmeden bütün açık kalemler hedef başına, yaşıyla (gider tarihinden) ve kalanıyla; dört kova (kalem sayar),
// vadesi geçmiş / vadesiz çapraz sayıları, taraf kırılımı. Personel varsayılan tek toplu satır (K21); adlar anahtarla.
// Salt okunur; tek yazma yolu satırdaki "Ödeme kaydet" (Giderler'in ödeme penceresi, `onHedefOde`).
const th = { padding: "8px 8px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)", whiteSpace: "nowrap" };
const td = { padding: "8px 8px", fontSize: 12.5, borderTop: "1px solid var(--n150, #f1f5f9)", verticalAlign: "top" };
const tdR = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };

const kovaMetni = (kovalar) => YAS_SIRA.filter(a => kovalar[a] > 0).map(a => `${a}: ${tl2(tl(kovalar[a]))}`).join(" · ");

export const AcikKalemler = ({ giderler = [], giderTurleri = [], tedarikciler = [], yururlukAy = null, bugun, canDo = () => false, onHedefOde = null }) => {
  const r = useMemo(() => acikKalemler(giderler, { turler: giderTurleri, tedarikciler, yururlukAy }, bugun), [giderler, giderTurleri, tedarikciler, yururlukAy, bugun]);
  const [kova, setKova] = useState(null);        // R10: süzme ekranda kalır, kaydedilmez
  const [adlarAcik, setAdlarAcik] = useState(false);
  // Triyaj (bulgu 3): süzülmüş dizi bellekte tutulur; aksi hâlde her çizimde yeni dizi doğar ve özet önbelleği boşa gider.
  const satirlar = useMemo(() => (kova ? r.satirlar.filter(s => s.kova === kova) : r.satirlar), [r, kova]);
  const ozet = useMemo(() => acikOzet(satirlar), [satirlar]);
  const yetki = !!onHedefOde && canDo("gider_odeme");

  // R22 (AC-26): açık kalem yoksa tablo ve kova kartları yok, tek boş durum kutusu.
  if (!r.satirlar.length) {
    return <BosDurum testId="bos-acik-kalemler" baslik="Açık kalem yok" metin="Yürürlük ayından bugüne kadar ödenmemiş gider kalemi bulunmuyor." />;
  }
  const genel = satirlar.filter(s => !s.personel);
  const personel = satirlar.filter(s => s.personel);
  const personelOzet = acikOzet(personel).taraflar[0] || null;

  const satir = (s, girinti = false) => {
    const vadeMetni = s.vade ? fmtTR(s.vade) : null;
    const gecikme = s.vade ? gunFarki(bugun, s.vade) : null;
    return (
      <tr key={`${s.kalemId}:${s.hedef}`} data-testid="acik-kalem-satiri">
        <td style={{ ...td, paddingLeft: girinti ? 24 : 8 }}>{s.personel ? s.calisanAd || "Çalışan" : s.tarafAd}</td>
        <td style={td}>
          <div style={{ fontWeight: 600 }}>{s.turAd}{s.personel ? "" : ` · ${s.aciklama || "Açıklama yok"}`}</div>
          {s.cokHedef && <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)" }}>{hedefBasligi(s.hedef, s.davranis, true)}</div>}
        </td>
        <td style={td}>{fmtTR(s.tarih)}</td>
        <td style={td}>{vadeMetni || <Rozet renk="gri">Vade girilmemiş</Rozet>}</td>
        <td style={tdR}>{s.yas}</td>
        <td style={{ ...tdR, fontWeight: 700 }}>{tl2(tl(s.kalanK))}</td>
        <td style={td}>{s.gecti ? <Rozet renk="kirmizi">{gunFarkiMetni(gecikme)}</Rozet> : s.vade ? <span style={{ color: "var(--n600, #475569)" }}>{gunFarkiMetni(gecikme)}</span> : "—"}</td>
        <td style={{ ...td, textAlign: "right" }}>
          {yetki && <button type="button" data-testid="acik-kalem-ode" onClick={() => onHedefOde(s.kalemId, s.hedef)}
            style={{ background: "none", border: "1px solid var(--n300, #cbd5e1)", borderRadius: 6, padding: "3px 8px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--n900, #0f172a)" }}>Ödeme kaydet</button>}
        </td>
      </tr>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-testid="acik-kalemler">
      {/* R8, R9, R10: dört kova (kalem sayısı + kalan), tıklanınca süzer; çapraz sayılar kova değildir. */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {r.kovalar.map(k => (
          <button key={k.ad} type="button" data-testid="kova-karti" aria-pressed={kova === k.ad} onClick={() => setKova(kova === k.ad ? null : k.ad)}
            style={{ flex: "1 1 150px", textAlign: "left", cursor: "pointer", borderRadius: 10, padding: "10px 12px",
              border: `1px solid ${kova === k.ad ? "var(--amb600, #d97706)" : "var(--n200, #e2e8f0)"}`, background: kova === k.ad ? "var(--ambBg, #fffbeb)" : "var(--surface, #ffffff)" }}>
            <div style={{ fontSize: 12, color: "var(--n500, #64748b)", fontWeight: 600 }}>{k.ad}</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--n900, #0f172a)" }}>{tl2(tl(k.kalanK))}</div>
            <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)" }}>{k.kalemAdet} kalem</div>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} data-testid="acik-capraz-sayilar">
        {/* Triyaj (bulgu 1): çapraz sayılar da süzgece uyar (yanındaki "Süzgeç" rozetiyle aynı kapsam). */}
        <Rozet renk="kirmizi">Vadesi geçmiş: {ozet.gecmisAdet} kalem</Rozet>
        <Rozet renk="gri">Vadesi girilmemiş: {ozet.vadesizAdet} kalem</Rozet>
        {kova && <Rozet renk="turuncu">Süzgeç: {kova}</Rozet>}
      </div>

      {/* R11, R26: taraf kırılımı (kova dağılımı); çalışanlar tek satır, adlar anahtarla. */}
      <KartBolum varyant="kart" baslikStili="baslik" title="Kimde Ne Kadar Eski Borç Var" altBaslik="Taraf başına kova dağılımı (yaş gider tarihinden)" testId="acik-taraf-kirilimi" style={{ padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "var(--n100, #f8fafc)" }}>
            <th style={th}>Taraf</th>{YAS_SIRA.map(a => <th key={a} style={{ ...th, textAlign: "right" }}>{a}</th>)}<th style={{ ...th, textAlign: "right" }}>Toplam</th>
          </tr></thead>
          <tbody>
            {ozet.taraflar.map(t => (
              <tr key={`${t.tur}:${t.id ?? ""}`} data-testid="acik-taraf-satiri">
                <td style={td}>
                  <div style={{ fontWeight: 700 }}>{t.ad}{t.tur === "calisanlar" ? ` · ${t.kisi} kişi` : ""}</div>
                  {t.tur === "calisanlar" && <AcKapa acik={adlarAcik} onClick={() => setAdlarAcik(a => !a)}>{adlarAcik ? "Adları gizle" : "Adları göster"}</AcKapa>}
                  {t.tur === "calisanlar" && adlarAcik && t.ayrinti.map(c => <div key={String(c.calisanId)} data-testid="acik-calisan-ayrinti" style={{ fontSize: 11.5, color: "var(--n600, #475569)", paddingLeft: 10 }}>{c.ad}: {kovaMetni(c.kovalar)}</div>)}
                </td>
                {YAS_SIRA.map(a => <td key={a} style={tdR}>{t.kovalar[a] ? tl2(tl(t.kovalar[a])) : "—"}</td>)}
                <td style={{ ...tdR, fontWeight: 700 }}>{tl2(tl(t.toplamK))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </KartBolum>

      {/* R3, R4, R20, R28: hedef satırlı liste; personel varsayılan tek toplu satır. */}
      <KartBolum varyant="kart" style={{ padding: 0, overflow: "auto" }} testId="acik-kalem-listesi">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "var(--n100, #f8fafc)" }}>
            {["Taraf", "Kalem", "Gider tarihi", "Vade", "Yaş (gün)", "Kalan", "Durum", ""].map((h, i) => <th key={i} style={{ ...th, textAlign: i === 4 || i === 5 ? "right" : "left" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {genel.map(s => satir(s))}
            {personelOzet && (
              <tr data-testid="acik-personel-toplu">
                <td style={td}><b>Çalışanlar</b> · {personelOzet.kisi} kişi
                  <div><AcKapa acik={adlarAcik} onClick={() => setAdlarAcik(a => !a)}>{adlarAcik ? "Adları gizle" : "Adları göster"}</AcKapa></div></td>
                <td style={td}><div style={{ fontWeight: 600 }}>Personel gideri</div><div style={{ fontSize: 11.5, color: "var(--n500, #64748b)" }}>{personelOzet.kalemAdet} kalem · {kovaMetni(personelOzet.kovalar)}</div></td>
                <td style={td} /><td style={td} /><td style={tdR} />
                <td style={{ ...tdR, fontWeight: 700 }}>{tl2(tl(personelOzet.toplamK))}</td>
                <td style={td} /><td style={td} />
              </tr>
            )}
            {adlarAcik && personel.map(s => satir(s, true))}
          </tbody>
          <tfoot><tr style={{ borderTop: "1px solid var(--n200, #e2e8f0)" }}>
            <td style={{ ...td, fontWeight: 700 }} colSpan={5} data-testid="acik-toplam-etiket">{kova ? `Seçili kovada (${kova}) toplam` : "Toplam açık borç"}</td>
            <td style={{ ...tdR, fontWeight: 800 }} data-testid="acik-toplam">{tl2(tl(ozet.toplamK))}</td>
            <td style={{ ...td, fontSize: 11.5, color: "var(--n500, #64748b)" }} colSpan={2}>{ozet.kalemAdet} kalem</td>
          </tr></tfoot>
        </table>
      </KartBolum>
    </div>
  );
};
