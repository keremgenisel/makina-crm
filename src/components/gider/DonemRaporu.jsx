import { useState, useMemo } from "react";
import { Icon, Btn } from "../ui";
import { davranisOf, kalemTutari, kalemKdv, kalemStopaj, odenecekTutar, vadesiGectiMi, makinaGideriCoz, canliModelSeti, DAVRANIS, ATAMA } from "../../lib/gider";
import { fmtTR, trLower } from "../../lib/utils";
import { tl2, DavranisRozeti } from "./GiderAlanlari";

// Giderler sekmesi › Dönem Raporu parçaları (spec 0001 R8, R13–R15, R17, R19, R20; plan K21, K30, K33).
// Personel ayrıntısı her yerde varsayılan KAPALI başlar ve kalıcı değildir (R17, K21).

const kart = { background: "var(--surface, #ffffff)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 12, padding: 18 };
const baslik = (t, alt) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--n900, #0f172a)" }}>{t}</div>
    {alt && <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2 }}>{alt}</div>}
  </div>
);
const Rozet = ({ children, renk = "gri", title }) => {
  const r = { gri: ["var(--n600, #475569)", "var(--n150, #f1f5f9)", "var(--n200, #e2e8f0)"], kirmizi: ["var(--red700, #b91c1c)", "var(--redBg, #fef2f2)", "var(--redBr, #fecaca)"],
    yesil: ["var(--grn700, #15803d)", "var(--grnBg, #f0fdf4)", "var(--grnBr, #bbf7d0)"], mavi: ["var(--blu700, #1d4ed8)", "var(--bluBg, #eff6ff)", "var(--bluBr, #bfdbfe)"],
    turuncu: ["var(--orTx, #c2410c)", "var(--ambBg3, #fff7ed)", "var(--ambBr3, #fed7aa)"], camgobegi: ["#0f766e", "#f0fdfa", "#99f6e4"], mor: ["#6d28d9", "#f5f3ff", "#ddd6fe"] }[renk];
  return <span title={title} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: r[0], background: r[1], border: `1px solid ${r[2]}`, borderRadius: 999, padding: "1px 8px", whiteSpace: "nowrap" }}>{children}</span>;
};
export { Rozet };
const AcKapa = ({ acik, onClick, children }) => (
  <button type="button" onClick={onClick} aria-expanded={acik}
    style={{ background: "none", border: "none", padding: 0, color: "var(--orTx, #c2410c)", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", gap: 4, alignItems: "center" }}>
    {acik ? "▾" : "▸"} {children}
  </button>
);

export const StatKart = ({ etiket, deger, alt, renk }) => (
  <div style={{ flex: "1 1 170px", minWidth: 0, background: "var(--surface, #ffffff)", border: "1px solid var(--n200, #e2e8f0)", borderLeft: `4px solid ${renk}`, borderRadius: 12, padding: "14px 16px" }}>
    <div style={{ fontSize: 12.5, color: "var(--n500, #64748b)", fontWeight: 500 }}>{etiket}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color: "var(--n900, #0f172a)", fontVariantNumeric: "tabular-nums", margin: "2px 0" }}>{deger}</div>
    <div style={{ fontSize: 12, color: "var(--n500, #64748b)" }}>{alt}</div>
  </div>
);

// Dört kova (R8, AC-82): tutar bazlı tam bölme.
export const KovaKarti = ({ rapor }) => {
  const k = rapor.kovalar, top = rapor.toplam || 0;
  const dilimler = [
    { ad: "Makinaya atanmış", v: k.makina, renk: "#c2410c", n: rapor.kovaKatki.makina },
    { ad: "Modele atanmış", v: k.model, renk: "#1d4ed8", n: rapor.kovaKatki.model },
    { ad: "Makina maliyetine girmeyen giderler", v: k.dagitma, renk: "#0f766e", n: rapor.kovaKatki.dagitma },
    { ad: "Ortak gider", v: k.ortak, renk: "#94a3b8", n: rapor.kovaKatki.ortak },
  ];
  const yuzde = (v) => (top ? `%${(v / top * 100).toFixed(1).replace(".", ",")}` : "%0");
  return (
    <div style={kart} data-testid="kova-karti">
      {baslik("Makina Maliyeti Kovaları", `Makina maliyeti hesabının (0002) girdisi. Her tutar tek kovadadır; dört kovanın toplamı = dönem toplamı ${tl2(top)}.`)}
      <div style={{ display: "flex", borderRadius: 999, overflow: "hidden", gap: 2, marginBottom: 14, background: "var(--n150, #f1f5f9)", height: 12 }}>
        {dilimler.filter(d => d.v > 0).map(d => <div key={d.ad} style={{ width: `${(d.v / (top || 1)) * 100}%`, background: d.renk }} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 }}>
        {dilimler.map(d => (
          <div key={d.ad} style={{ display: "flex", gap: 8 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: d.renk, marginTop: 4, flexShrink: 0 }} />
            <div><div style={{ fontSize: 12.5, color: "var(--n600, #475569)", fontWeight: 600 }}>{d.ad}</div>
              <div style={{ fontSize: 17, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{tl2(d.v)}</div>
              <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)" }}>{d.n} kalem katkı · {yuzde(d.v)}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Tür kırılımı (R8, AC-12). Personel satırı kapalı; açılınca çalışan başına resmi/elden (AC-51).
export const TurKirilimi = ({ rapor }) => {
  const [acik, setAcik] = useState(false);
  const top = rapor.toplam || 0;
  return (
    <div style={{ ...kart, flex: "3 1 380px", minWidth: 0 }} data-testid="tur-kirilimi">
      {baslik("Gider Türü Kırılımı", "Tahakkuk esası: kalemin gider tarihine göre")}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rapor.turKirilimi.map(t => (
          <div key={String(t.turId)}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 200px) minmax(0, 1fr) 110px", gap: 12, alignItems: "center", fontSize: 13 }}>
              <div style={{ fontWeight: 600, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                {t.ad} <span style={{ color: "var(--n500, #64748b)", fontWeight: 400, fontSize: 12 }}>({t.calisanlar ? `${t.calisanlar.length} çalışan` : t.adet})</span>
                {t.calisanlar && <AcKapa acik={acik} onClick={() => setAcik(a => !a)}>{acik ? "Gizle" : "Aç"}</AcKapa>}
              </div>
              <div style={{ height: 10, background: "var(--n150, #f1f5f9)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${top ? (t.toplam / top) * 100 : 0}%`, height: 10, background: t.davranis === DAVRANIS.PERSONEL ? "#7c3aed" : t.davranis === DAVRANIS.KIRA ? "#e85d1a" : "#64748b" }} />
              </div>
              <div style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{tl2(t.toplam)}</div>
            </div>
            {t.calisanlar && acik && (
              <div style={{ margin: "8px 0 4px 12px", fontSize: 12.5 }} data-testid="personel-ayrinti">
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 100px 100px 100px", gap: 8, fontSize: 11, fontWeight: 700, color: "var(--n500, #64748b)", textTransform: "uppercase" }}>
                  <span>Çalışan</span><span style={{ textAlign: "right" }}>Resmi</span><span style={{ textAlign: "right" }}>Elden</span><span style={{ textAlign: "right" }}>Toplam</span>
                </div>
                {t.calisanlar.map(c => (
                  <div key={String(c.calisanId)} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 100px 100px 100px", gap: 8, padding: "5px 0", borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                    <span style={{ fontWeight: 600 }}>{c.ad}</span><span style={{ textAlign: "right" }}>{tl2(c.resmi)}</span><span style={{ textAlign: "right" }}>{tl2(c.elden)}</span><b style={{ textAlign: "right" }}>{tl2(c.toplam)}</b>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--n200, #e2e8f0)", paddingTop: 10, marginTop: 10, fontSize: 13 }}>
        <span style={{ color: "var(--n500, #64748b)" }}>Kırılım toplamı = genel toplam (ödenmemiş dahil, KDV hariç)</span><b>{tl2(top)}</b>
      </div>
    </div>
  );
};

// Tedarikçi kırılımı (R14, R15, AC-47, AC-63, AC-67). Açık borç dönemden bağımsızdır.
export const TedarikciKirilimi = ({ rapor }) => {
  const tk = rapor.tedarikciKirilimi;
  return (
    <div style={{ ...kart, flex: "3 1 380px", minWidth: 0 }} data-testid="tedarikci-kirilimi">
      {baslik("Tedarikçi Kırılımı", "Harcamaya göre çoktan aza. Personel kalemleri bu kırılıma girmez.")}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ fontSize: 11, color: "var(--n500, #64748b)", textTransform: "uppercase", textAlign: "left" }}>
          <th style={{ padding: "6px 4px" }}>Tedarikçi</th><th style={{ padding: "6px 4px", textAlign: "right" }}>Harcama (KDV hariç)<div style={{ textTransform: "none", fontWeight: 500 }}>seçili dönem</div></th>
          <th style={{ padding: "6px 4px", textAlign: "right" }}>Açık borç (KDV dâhil)<div style={{ textTransform: "none", fontWeight: 500 }}>tüm dönemler, bugüne kadar</div></th>
        </tr></thead>
        <tbody>
          {tk.satirlar.map(s => (
            <tr key={s.tedarikciId} style={{ borderTop: "1px solid var(--n150, #f1f5f9)" }}>
              <td style={{ padding: "8px 4px", fontWeight: 600 }}>{s.ad}</td>
              <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: 700 }}>{tl2(s.harcama)}</td>
              <td style={{ padding: "8px 4px", textAlign: "right" }}>{s.acikBorc > 0 ? <><b>{tl2(s.acikBorc)}</b>{s.vadesiGecti && <> <Rozet renk="kirmizi">Vadesi geçti</Rozet></>}</> : <span style={{ color: "var(--n500, #64748b)" }}>Borç yok</span>}</td>
            </tr>
          ))}
          {(tk.secilmemis.adet > 0 || tk.secilmemis.acikBorc > 0) && (
            <tr style={{ borderTop: "1px solid var(--n150, #f1f5f9)", background: "var(--n100, #f8fafc)" }}>
              <td style={{ padding: "8px 4px", fontStyle: "italic", color: "var(--n600, #475569)" }}>Tedarikçi seçilmemiş · {tk.secilmemis.adet} kalem</td>
              <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: 700 }}>{tl2(tk.secilmemis.harcama)}</td>
              <td style={{ padding: "8px 4px", textAlign: "right" }}>{tk.secilmemis.acikBorc > 0 ? tl2(tk.secilmemis.acikBorc) : <span style={{ color: "var(--n500, #64748b)" }}>Borç yok</span>}</td>
            </tr>
          )}
        </tbody>
        <tfoot><tr style={{ borderTop: "1px solid var(--n200, #e2e8f0)" }}>
          <td style={{ padding: "8px 4px", fontWeight: 700 }}>Personel dışı toplam</td><td style={{ padding: "8px 4px", textAlign: "right", fontWeight: 800 }}>{tl2(tk.toplamHarcama)}</td><td style={{ padding: "8px 4px", textAlign: "right", fontWeight: 800 }}>{tl2(tk.toplamBorc)}</td>
        </tr></tfoot>
      </table>
    </div>
  );
};

// Kime ne kadar borçluyuz (R19, K30, AC-72/73/86). Dönemden bağımsız; çalışanlar tek satırda, kapalı.
export const BorcOzeti = ({ ozet }) => {
  const [acik, setAcik] = useState(false);
  return (
    <div style={{ ...kart, flex: "2 1 300px", minWidth: 0 }} data-testid="borc-ozeti">
      {baslik("Kime Ne Kadar Borçluyuz", "Seçili dönemden bağımsız: yürürlük ayından bugüne kadarki tüm ödenmemiş kalemler")}
      {ozet.satirlar.length === 0 && <div style={{ fontSize: 13, color: "var(--n500, #64748b)" }}>Ödenmemiş borç yok.</div>}
      {ozet.satirlar.map(s => (
        <div key={s.tur + (s.tedarikciId ?? "")} style={{ padding: "9px 0", borderTop: "1px solid var(--n150, #f1f5f9)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                {s.ad} <Rozet renk={s.tur === "calisanlar" ? "mor" : "gri"}>{s.tur === "calisanlar" ? "Çalışan" : "Tedarikçi"}</Rozet>
                {s.vadesiGecti && <Rozet renk="kirmizi">Vadesi geçti</Rozet>}
              </div>
              {s.tur === "calisanlar" && <div style={{ marginTop: 3 }}><AcKapa acik={acik} onClick={() => setAcik(a => !a)}>{acik ? "Adları gizle" : "Adları göster"}</AcKapa></div>}
              {s.tur !== "calisanlar" && <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginTop: 2 }}>{s.kalemler.length} kalem</div>}
            </div>
            <b style={{ fontSize: 14, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{tl2(s.tutar)}</b>
          </div>
          {s.tur === "calisanlar" && acik && (
            <div style={{ marginTop: 6, fontSize: 12.5 }} data-testid="calisan-borc-ayrinti">
              {s.ayrinti.map(c => <div key={String(c.calisanId)} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0 3px 12px" }}><span>{c.ad}{c.vadesiGecti ? " · vadesi geçti" : ""}</span><b>{tl2(c.tutar)}</b></div>)}
            </div>
          )}
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--n200, #e2e8f0)", paddingTop: 10, marginTop: 4 }}><b>Toplam borç</b><b style={{ fontSize: 15 }}>{tl2(ozet.toplam)}</b></div>
      <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginTop: 8 }}>“Vadesi geçti” yalnız görsel işarettir; hatırlatma ve bildirim ayrı bir iştir (0003). Borcu sıfırlanan taraf bu listeden düşer.</div>
    </div>
  );
};

// Kalem listesi. Personel kalemleri tek kapalı grup satırında (K21).
export const KalemListesi = ({ kalemler, giderTurleri, tedarikciler, stock, customers, standardModels, customModels, bugun, canDo, onDuzenle, onSil, onOdendi }) => {
  const [personelAcik, setPersonelAcik] = useState(false);
  const [filtre, setFiltre] = useState({ tur: "", ted: "", odeme: "", ara: "" });
  const turMap = useMemo(() => new Map(giderTurleri.map(t => [String(t.id), t])), [giderTurleri]);
  const tedMap = useMemo(() => new Map(tedarikciler.map(t => [String(t.id), t])), [tedarikciler]);
  const canliModeller = useMemo(() => canliModelSeti(standardModels, customModels), [standardModels, customModels]);
  const dav = (k) => davranisOf(k, turMap);
  const suz = kalemler.filter(k => {
    if (filtre.tur && String(k.turId) !== filtre.tur) return false;
    if (filtre.ted === "_yok" ? k.tedarikciId != null : (filtre.ted && String(k.tedarikciId) !== filtre.ted)) return false;
    if (filtre.odeme === "odenmedi" && k.odendi) return false;
    if (filtre.odeme === "odendi" && !k.odendi) return false;
    if (filtre.odeme === "gecti" && !vadesiGectiMi(k, bugun)) return false;
    if (filtre.ara && !trLower(`${k.aciklama || ""} ${k.calisanAd || ""} ${tedMap.get(String(k.tedarikciId))?.ad || ""}`).includes(trLower(filtre.ara))) return false;
    return true;
  }).sort((a, b) => String(a.tarih).localeCompare(String(b.tarih)));
  const personel = suz.filter(k => dav(k) === DAVRANIS.PERSONEL);
  const diger = suz.filter(k => dav(k) !== DAVRANIS.PERSONEL);
  const toplam = suz.reduce((a, k) => a + kalemTutari(k, dav(k)), 0);
  const kdvTop = suz.reduce((a, k) => a + kalemKdv(k, dav(k)), 0);

  const atamaHucre = (k) => {
    if (dav(k) !== DAVRANIS.NORMAL || !k.atamaTur) return <span style={{ color: "var(--n500, #64748b)" }}>Ortak gider</span>;
    if (k.atamaTur === ATAMA.DAGITMA) return <Rozet renk="camgobegi">Dağıtılmasın</Rozet>;
    if (k.atamaTur === ATAMA.MODEL) {
      const satirlar = k.modelSatirlari || [];
      const olu = satirlar.filter(s => !canliModeller.has(trLower(s.modelAd)));
      return <div>{satirlar.map((s, i) => <div key={i} style={{ fontSize: 12 }}><Rozet renk="mavi">Model</Rozet> <b>{s.modelAd}</b> · {s.adet} × {tl2(s.birimMaliyet)}</div>)}
        {olu.length > 0 && <div style={{ fontSize: 11.5, color: "var(--amb700, #b45309)", marginTop: 3 }}>Silinmiş model: tutarı ortak gidere düşer</div>}</div>;
    }
    const cz = makinaGideriCoz(k, { stock, customers });
    if (!cz) return <div><span style={{ color: "var(--n500, #64748b)" }}>Ortak gider</span><div style={{ fontSize: 11.5, color: "var(--amb700, #b45309)", marginTop: 3 }}>Atandığı makina silinmiş veya takip edilemiyor</div></div>;
    return <div><div style={{ fontWeight: 600 }}>{[cz.model, cz.seri].filter(Boolean).join(" · ")}</div><div style={{ fontSize: 11.5, color: "var(--n500, #64748b)" }}>{cz.tur === "stok" ? "Makina Stoğu" : `${cz.ad}${cz.stoktanTakip ? " (stoktan satıldı)" : ""}`}</div></div>;
  };
  const odemeHucre = (k) => (
    <div>
      {canDo("gider_odeme")
        ? <button type="button" onClick={() => onOdendi(k)} title={k.odendi ? "Ödenmedi olarak işaretle" : "Ödendi olarak işaretle"} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>{k.odendi ? <Rozet renk="yesil">Ödendi{k.odemeTarihi ? ` ${fmtTR(k.odemeTarihi).slice(0, 5)}` : ""}</Rozet> : <Rozet renk="kirmizi">Ödenmedi</Rozet>}</button>
        : (k.odendi ? <Rozet renk="yesil">Ödendi</Rozet> : <Rozet renk="kirmizi">Ödenmedi</Rozet>)}
      <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginTop: 4 }}>{k.odemeYontemi || "Belirtilmemiş"}{k.sonOdemeTarihi ? ` · ${k.odemeYontemi === "Çek" ? "çek vade" : "vade"} ${fmtTR(k.sonOdemeTarihi)}` : ""}</div>
      {vadesiGectiMi(k, bugun) && <div style={{ marginTop: 4 }}><Rozet renk="kirmizi">Vadesi geçti</Rozet></div>}
    </div>
  );
  const islem = (k) => (
    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
      {canDo("gider_edit") && <Btn small variant="ghost" onClick={() => onDuzenle(k)} title="Düzenle"><Icon name="edit" size={12} /></Btn>}
      {canDo("gider_delete") && <Btn small variant="danger" onClick={() => onSil(k)} title="Sil"><Icon name="trash" size={12} /></Btn>}
    </div>
  );
  const td = { padding: "10px 10px", borderTop: "1px solid var(--n150, #f1f5f9)", verticalAlign: "top", fontSize: 13 };
  const tdR = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };
  const satir = (k) => {
    const d = dav(k), tur = turMap.get(String(k.turId));
    const ted = tedMap.get(String(k.tedarikciId));
    return (
      <tr key={k.id}>
        <td style={{ ...td, whiteSpace: "nowrap", color: "var(--n600, #475569)" }}>{fmtTR(k.tarih)}</td>
        <td style={td}><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{tur?.ad || "(türsüz)"} {d !== DAVRANIS.NORMAL && <DavranisRozeti davranis={d} />}</div></td>
        <td style={td}>
          <div style={{ fontWeight: 600 }}>{d === DAVRANIS.PERSONEL ? k.calisanAd : (k.aciklama || <span style={{ color: "var(--n500, #64748b)", fontWeight: 400 }}>Açıklama yok</span>)}</div>
          {d !== DAVRANIS.PERSONEL && <div style={{ fontSize: 12, color: ted ? "var(--n700, #334155)" : "var(--n500, #64748b)", marginTop: 2 }}>{ted ? ted.ad : "Tedarikçi seçilmemiş"}</div>}
          {d === DAVRANIS.PERSONEL && <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2 }}>Resmi {tl2(k.resmiTutar)} · Elden {tl2(k.eldenTutar)}</div>}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            {d === DAVRANIS.KIRA && <Rozet renk={k.girisYonu === "net" ? "mavi" : "turuncu"}>{k.girisYonu === "net" ? "Net girildi" : "Brüt girildi"}</Rozet>}
            {d === DAVRANIS.KIRA && <span style={{ fontSize: 11.5, color: "var(--n500, #64748b)" }}>Stopaj %{k.stopajOrani ?? 0}: {tl2(kalemStopaj(k, d))} · Net {tl2(k.netTutar ?? (kalemTutari(k, d) - kalemStopaj(k, d)))}</span>}
            {k.tanimId != null && <Rozet>Tekrarlayan</Rozet>}
          </div>
        </td>
        <td style={td}>{atamaHucre(k)}</td>
        <td style={{ ...tdR, fontWeight: 700 }}>{tl2(kalemTutari(k, d))}</td>
        <td style={tdR}>{d === DAVRANIS.PERSONEL ? <span style={{ color: "var(--n500, #64748b)" }}>—</span> : <>{tl2(kalemKdv(k, d))}<div style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>%{k.kdvOrani ?? 0}</div></>}</td>
        <td style={tdR}>{tl2(odenecekTutar(k, d))}</td>
        <td style={td}>{odemeHucre(k)}</td>
        <td style={td}>{islem(k)}</td>
      </tr>
    );
  };
  const sec = { className: "select", style: { width: "auto", minWidth: 150 } };
  return (
    <div style={{ ...kart, padding: 0, overflow: "hidden" }} data-testid="kalem-listesi">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", gap: 10, flexWrap: "wrap", borderBottom: "1px solid var(--n200, #e2e8f0)" }}>
        <b>Gider Kalemleri <span style={{ color: "var(--n500, #64748b)", fontWeight: 500, fontSize: 13 }}>· {suz.length} kalem</span></b>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select aria-label="Tür filtresi" {...sec} value={filtre.tur} onChange={e => setFiltre(f => ({ ...f, tur: e.target.value }))}><option value="">Tüm türler</option>{giderTurleri.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}</select>
          <select aria-label="Tedarikçi filtresi" {...sec} value={filtre.ted} onChange={e => setFiltre(f => ({ ...f, ted: e.target.value }))}><option value="">Tüm tedarikçiler</option><option value="_yok">Tedarikçi seçilmemiş</option>{tedarikciler.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}</select>
          <select aria-label="Ödeme filtresi" {...sec} value={filtre.odeme} onChange={e => setFiltre(f => ({ ...f, odeme: e.target.value }))}><option value="">Tüm ödemeler</option><option value="odenmedi">Ödenmemiş</option><option value="odendi">Ödenmiş</option><option value="gecti">Vadesi geçmiş</option></select>
          <input aria-label="Açıklama ara" className="input" style={{ width: 200 }} placeholder="Açıklama, çalışan, tedarikçi ara" value={filtre.ara} onChange={e => setFiltre(f => ({ ...f, ara: e.target.value }))} />
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
          <thead><tr style={{ background: "var(--n100, #f8fafc)", fontSize: 11, color: "var(--n500, #64748b)", textTransform: "uppercase", textAlign: "left" }}>
            {["Tarih", "Tür", "Açıklama · Tedarikçi", "Atama", "KDV hariç", "KDV", "Ödenecek", "Ödeme", ""].map((h, i) => <th key={i} style={{ padding: "9px 10px", textAlign: i >= 4 && i <= 6 ? "right" : "left" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {personel.length > 0 && (
              <tr style={{ background: "#faf7ff" }}>
                <td style={{ ...td, color: "var(--n600, #475569)" }}>{personel.length === 1 ? fmtTR(personel[0].tarih) : ""}</td>
                <td style={td}><DavranisRozeti davranis="personel" /></td>
                <td style={td} colSpan={2}>
                  <b>Personel · {new Set(personel.map(k => String(k.calisanId))).size} çalışan</b> <Rozet>{personelAcik ? "Ayrıntı açık" : "Ayrıntı kapalı"}</Rozet>
                  <div style={{ marginTop: 4 }}><AcKapa acik={personelAcik} onClick={() => setPersonelAcik(a => !a)}>{personelAcik ? "Çalışanları gizle" : "Çalışanları göster"}</AcKapa></div>
                </td>
                <td style={{ ...tdR, fontWeight: 700 }}>{tl2(personel.reduce((a, k) => a + kalemTutari(k, DAVRANIS.PERSONEL), 0))}</td>
                <td style={{ ...tdR, color: "var(--n500, #64748b)" }}>KDV yok</td>
                <td style={tdR}>{tl2(personel.reduce((a, k) => a + odenecekTutar(k, DAVRANIS.PERSONEL), 0))}</td>
                <td style={td}>{personel.some(k => !k.odendi) ? <Rozet renk="kirmizi">{personel.filter(k => !k.odendi).length} ödenmemiş</Rozet> : <Rozet renk="yesil">Tümü ödendi</Rozet>}</td>
                <td style={td} />
              </tr>
            )}
            {personelAcik && personel.map(satir)}
            {diger.map(satir)}
            {suz.length === 0 && <tr><td colSpan={9} style={{ ...td, textAlign: "center", color: "var(--n500, #64748b)", padding: 20 }}>Filtreye uyan kalem yok.</td></tr>}
          </tbody>
          <tfoot><tr style={{ background: "var(--n100, #f8fafc)" }}>
            <td colSpan={4} style={{ ...td, fontWeight: 700 }}>Toplam</td>
            <td style={{ ...tdR, fontWeight: 800 }}>{tl2(toplam)}</td><td style={{ ...tdR, fontWeight: 700 }}>{tl2(kdvTop)}</td>
            <td colSpan={3} style={{ ...td, fontSize: 11.5, color: "var(--n500, #64748b)" }}>“Ödenecek”: normal kalemde tutar + KDV, kirada net + KDV (stopaj hariç), personelde resmi + elden</td>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
};
