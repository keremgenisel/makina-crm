import { useState, useMemo } from "react";
import { Icon, Btn } from "../ui";
import { davranisOf, kalemTutari, kalemKdv, kalemStopaj, odenecekTutar, vadesiGectiMi, makinaGideriCoz, canliModelSeti, DAVRANIS, ATAMA, atanabilirMi, satirliMi, odemeDurumu, odemeHedefleri, HEDEF, HEDEF_SIRASI, EK_ODEME_TUR_AD, ekOdemeKurus, ekOdemeTurToplamlari } from "../../lib/gider";
import { fmtTR, trLower } from "../../lib/utils";
import { tl2, DavranisRozeti, hedefAdi, hedefBasligi, cokHedefliMi } from "./GiderAlanlari";
import { KartBolum, BosDurum } from "../tasarim";
import { PERSONEL_ODEMELERI, GOC_YONTEM_NOTU } from "../../lib/odemeYontemi";

// Giderler sekmesi › Dönem Raporu parçaları (spec 0001 R8, R13–R15, R17, R19, R20; plan K21, K30, K33).
// Personel ayrıntısı her yerde varsayılan KAPALI başlar ve kalıcı değildir (R17, K21).

const Rozet = ({ children, renk = "gri", title }) => {
  const r = { gri: ["var(--n600, #475569)", "var(--n150, #f1f5f9)", "var(--n200, #e2e8f0)"], kirmizi: ["var(--red700, #b91c1c)", "var(--redBg, #fef2f2)", "var(--redBr, #fecaca)"],
    yesil: ["var(--grn700, #15803d)", "var(--grnBg, #f0fdf4)", "var(--grnBr, #bbf7d0)"], mavi: ["var(--blu700, #1d4ed8)", "var(--bluBg, #eff6ff)", "var(--bluBr, #bfdbfe)"],
    turuncu: ["var(--orTx, #c2410c)", "var(--ambBg3, #fff7ed)", "var(--ambBr3, #fed7aa)"], camgobegi: ["#0f766e", "#f0fdfa", "#99f6e4"], mor: ["#6d28d9", "#f5f3ff", "#ddd6fe"] }[renk];
  return <span title={title} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: r[0], background: r[1], border: `1px solid ${r[2]}`, borderRadius: 999, padding: "1px 8px", whiteSpace: "nowrap" }}>{children}</span>;
};
export { Rozet };
export const AcKapa = ({ acik, onClick, children }) => (
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
    <KartBolum varyant="kart" baslikStili="baslik" title="Makina Maliyeti Kovaları" altBaslik={`Makina maliyeti hesabının (0002) girdisi. Her tutar tek kovadadır; dört kovanın toplamı = dönem toplamı ${tl2(top)}.`} testId="kova-karti">
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
    </KartBolum>
  );
};

// Tür kırılımı (R8, AC-12). Personel satırı kapalı; açılınca çalışan başına resmi/elden (AC-51).
const PERSONEL_IZGARA = "minmax(0, 1fr) 90px 90px 90px 100px";
export const TurKirilimi = ({ rapor }) => {
  const [acik, setAcik] = useState(false);
  const top = rapor.toplam || 0;
  return (
    <KartBolum varyant="kart" baslikStili="baslik" title="Gider Türü Kırılımı" altBaslik="Tahakkuk esası: kalemin gider tarihine göre" style={{ flex: "3 1 380px", minWidth: 0 }} testId="tur-kirilimi">
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
                {/* Spec 0023 R7 (P2): Resmi ve Elden yalnız maaş; ek ödemeler ayrı sütun ve çalışanın altında satır satır. */}
                <div style={{ display: "grid", gridTemplateColumns: PERSONEL_IZGARA, gap: 8, fontSize: 11, fontWeight: 700, color: "var(--n500, #64748b)", textTransform: "uppercase" }}>
                  <span>Çalışan</span><span style={{ textAlign: "right" }}>Resmi</span><span style={{ textAlign: "right" }}>Elden</span><span style={{ textAlign: "right" }}>Ek ödeme</span><span style={{ textAlign: "right" }}>Toplam</span>
                </div>
                {t.calisanlar.map(c => (
                  <div key={String(c.calisanId)} style={{ padding: "5px 0", borderTop: "1px solid var(--n150, #f1f5f9)" }} data-testid="personel-ayrinti-calisan">
                    <div style={{ display: "grid", gridTemplateColumns: PERSONEL_IZGARA, gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>{c.ad}</span><span style={{ textAlign: "right" }}>{tl2(c.resmi)}</span><span style={{ textAlign: "right" }}>{tl2(c.elden)}</span>
                      <span style={{ textAlign: "right" }}>{c.ek ? tl2(c.ek) : "—"}</span><b style={{ textAlign: "right" }}>{tl2(c.toplam)}</b>
                    </div>
                    {(c.ekSatirlari || []).map((e, i) => (
                      <div key={i} data-testid="personel-ek-odeme" style={{ display: "grid", gridTemplateColumns: PERSONEL_IZGARA, gap: 8, fontSize: 12, color: "var(--n600, #475569)", paddingTop: 3 }}>
                        <span style={{ paddingLeft: 12 }}>{EK_ODEME_TUR_AD[e.tur] || e.tur}{e.aciklama ? ` · ${e.aciklama}` : ""}</span><span /><span />
                        <span style={{ textAlign: "right" }}>{tl2(e.tutar)}</span><span />
                      </div>
                    ))}
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
    </KartBolum>
  );
};

// Tedarikçi kırılımı (R14, R15, AC-47, AC-63, AC-67). Açık borç dönemden bağımsızdır.
export const TedarikciKirilimi = ({ rapor }) => {
  const tk = rapor.tedarikciKirilimi;
  return (
    <KartBolum varyant="kart" baslikStili="baslik" title="Tedarikçi Kırılımı" altBaslik="Harcamaya göre çoktan aza. Personel kalemleri bu kırılıma girmez." style={{ flex: "3 1 380px", minWidth: 0 }} testId="tedarikci-kirilimi">
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
    </KartBolum>
  );
};

// Kime ne kadar borçluyuz (R19, K30, AC-72/73/86). Dönemden bağımsız; çalışanlar tek satırda, kapalı.
export const BorcOzeti = ({ ozet }) => {
  const [acik, setAcik] = useState(false);
  return (
    <KartBolum varyant="kart" baslikStili="baslik" title="Kime Ne Kadar Borçluyuz" altBaslik="Seçili dönemden bağımsız: yürürlük ayından bugüne kadarki tüm ödenmemiş kalemler" style={{ flex: "2 1 300px", minWidth: 0 }} testId="borc-ozeti">
      {ozet.satirlar.length === 0 && <div style={{ fontSize: 13, color: "var(--n500, #64748b)" }}>Ödenmemiş borç yok.</div>}
      {ozet.satirlar.map(s => (
        <div key={s.tur + (s.tedarikciId ?? "")} style={{ padding: "9px 0", borderTop: "1px solid var(--n150, #f1f5f9)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                {s.ad} <Rozet renk={s.tur === "calisanlar" ? "mor" : s.tur === "vergiDairesi" ? "mavi" : "gri"}>{s.tur === "calisanlar" ? "Çalışan" : s.tur === "vergiDairesi" ? "Kira stopajı" : "Tedarikçi"}</Rozet>
                {s.vadesiGecti && <Rozet renk="kirmizi">Vadesi geçti</Rozet>}
              </div>
              {s.tur === "calisanlar" && <div style={{ marginTop: 3 }}><AcKapa acik={acik} onClick={() => setAcik(a => !a)}>{acik ? "Adları gizle" : "Adları göster"}</AcKapa></div>}
              {s.tur !== "calisanlar" && <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginTop: 2 }}>{s.kalemler.length} kalem</div>}
            </div>
            <b style={{ fontSize: 14, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{tl2(s.tutar)}</b>
          </div>
          {s.tur === "calisanlar" && acik && (
            <div style={{ marginTop: 6, fontSize: 12.5 }} data-testid="calisan-borc-ayrinti">
              {s.ayrinti.map(c => <div key={String(c.calisanId)} style={{ padding: "3px 0 3px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>{c.ad}{c.vadesiGecti ? " · vadesi geçti" : ""}</span><b>{tl2(c.tutar)}</b></div>
                {/* Spec 0042 R6, AC-8 + 0054 R20: hedef kırılımı (en çok dört) yalnız ayrıntı açıkken; ad tek kaynaktan (hedefAdi). */}
                {HEDEF_SIRASI.filter(h => (c.hedefler?.[h] || 0) > 0).length > 1 && <div data-testid="calisan-hedef-kirilimi" style={{ fontSize: 11.5, color: "var(--n500, #64748b)" }}>
                  {HEDEF_SIRASI.filter(h => (c.hedefler?.[h] || 0) > 0).map(h => `${hedefAdi(h, DAVRANIS.PERSONEL, true)} ${tl2(c.hedefler[h])}`).join(" · ")}</div>}
              </div>)}
            </div>
          )}
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--n200, #e2e8f0)", paddingTop: 10, marginTop: 4 }}><b>Toplam borç</b><b style={{ fontSize: 15 }}>{tl2(ozet.toplam)}</b></div>
      <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginTop: 8 }}>“Vadesi geçti” yalnız görsel işarettir; hatırlatma ve bildirim ayrı bir iştir (0003). Borcu sıfırlanan taraf bu listeden düşer.</div>
    </KartBolum>
  );
};

// Spec 0041 R10, AC-12: dönemin kalemlerine yapılan ödemelerin yöntem kırılımı (Q3: ödeme tarihinden bağımsız).
// R18, Q4: personel ödemeleri ayrıntı kapalıyken tek satır; açılınca yöntemlerine dağılır.
export const YontemKirilimi = ({ kirilim }) => {
  const [acik, setAcik] = useState(false);
  if (!kirilim) return null;
  const satirlar = acik ? kirilim.personelSatirlar.reduce((l, p) => {
    const var_ = l.find(x => x.yontem === p.yontem);
    return var_ ? l.map(x => (x === var_ ? { ...x, tutarK: x.tutarK + p.tutarK } : x)) : [...l, p];
  }, kirilim.satirlar).sort((a, b) => b.tutarK - a.tutarK) : kirilim.satirlar;
  const satir = (ad, tutarK, testId) => (
    <div key={ad} data-testid={testId} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, padding: "6px 0", borderTop: "1px solid var(--n150, #f1f5f9)" }}>
      <span>{ad}</span><b style={{ fontVariantNumeric: "tabular-nums" }}>{tl2(tutarK / 100)}</b>
    </div>
  );
  return (
    <KartBolum varyant="kart" baslikStili="baslik" title="Ödeme Yöntemi Kırılımı" altBaslik="Bu dönemin giderlerine yapılan ödemeler, ödeme tarihinden bağımsız" style={{ flex: "2 1 300px", minWidth: 0 }} testId="yontem-kirilimi">
      {kirilim.toplamK === 0 ? <BosDurum testId="bos-yontem-kirilimi" baslik="Bu dönemin giderlerine ödeme kaydedilmemiş" /> : (
        <div>
          {satirlar.map(s => satir(s.yontem, s.tutarK, "yontem-kirilimi-satiri"))}
          {!acik && kirilim.personelK > 0 && satir(PERSONEL_ODEMELERI, kirilim.personelK, "yontem-kirilimi-personel")}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "8px 0 0", borderTop: "1px solid var(--n200, #e2e8f0)", fontWeight: 700 }}>
            <span>Toplam ödenen</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{tl2(kirilim.toplamK / 100)}</span>
          </div>
          {kirilim.personelK > 0 && <div style={{ marginTop: 8 }}><AcKapa acik={acik} onClick={() => setAcik(a => !a)}>{acik ? "Personel ödemelerini birleştir" : "Personel ödemelerini yöntemlere dağıt"}</AcKapa></div>}
          {kirilim.gocVar && <div data-testid="goc-yontem-notu" style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginTop: 8 }}>{GOC_YONTEM_NOTU}</div>}
        </div>
      )}
    </KartBolum>
  );
};

// Spec 0041 R3, R4, AC-4/5/16/17: kalemin türetilen yöntemi (kalemin kendi alanı listede gösterilmez). Ödeme yoksa yöntem
// yazılmaz; tek yöntemde o yöntem; birden çoksa "Karma" ve altında kırılım.
const YontemOzeti = ({ y, vade }) => {
  const metin = [y && y.karar !== "yok" ? y.etiket : null, vade].filter(Boolean).join(" · ");
  return (
    <>
      {metin && <div data-testid="kalem-yontem" style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginTop: 4 }}>{metin}</div>}
      {y?.karar === "karma" && <div data-testid="kalem-yontem-kirilimi" style={{ fontSize: 11.5, color: "var(--n600, #475569)", marginTop: 2 }}>{y.satirlar.map(s => `${s.yontem} ${tl2(s.tutarK / 100)}`).join(" · ")}</div>}
    </>
  );
};

// Kalem listesi. Personel kalemleri tek kapalı grup satırında (K21).
// Spec 0003 R8: ödeme süzgeci üst bileşenden yönetilebilir (odemeFiltre/onOdemeFiltre); "Hatırlatma kapsamı"
// seçeneği ve kapsamdaki satırların vurgusu odemeHatirlatmalari çıktısından (hatirlatma) gelir.
export const KalemListesi = ({ kalemler, giderTurleri, tedarikciler, stock, customers, standardModels, customModels, bugun, canDo, onDuzenle, onSil, onOdendi,
  odemeFiltre, onOdemeFiltre, hatirlatma = null, onOdemePlani, onHedefDegistir, yontemKirilimlari = null }) => {
  const [personelAcik, setPersonelAcik] = useState(false);
  const [yerelFiltre, setYerelFiltre] = useState({ tur: "", ted: "", odeme: "", ara: "" });
  const filtre = odemeFiltre === undefined ? yerelFiltre : { ...yerelFiltre, odeme: odemeFiltre };
  const setFiltre = (fn) => {
    const yeni = fn(filtre);
    if (odemeFiltre !== undefined && yeni.odeme !== filtre.odeme) onOdemeFiltre?.(yeni.odeme);
    setYerelFiltre(yeni);
  };
  const hatGecmis = useMemo(() => new Set((hatirlatma?.gecmis || []).map(o => String(o.id))), [hatirlatma]);
  const hatDurum = (k) => (!hatirlatma?.kalemIdleri?.has(String(k.id)) ? null : hatGecmis.has(String(k.id)) ? "gecmis" : "yaklasan");
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
    if (filtre.odeme === "hatirlatma" && !hatDurum(k)) return false;
    if (filtre.ara && !trLower(`${k.aciklama || ""} ${k.calisanAd || ""} ${tedMap.get(String(k.tedarikciId))?.ad || ""}`).includes(trLower(filtre.ara))) return false;
    return true;
  }).sort((a, b) => String(a.tarih).localeCompare(String(b.tarih)));
  const personel = suz.filter(k => dav(k) === DAVRANIS.PERSONEL);
  const diger = suz.filter(k => dav(k) !== DAVRANIS.PERSONEL);
  const toplam = suz.reduce((a, k) => a + kalemTutari(k, dav(k)), 0);
  const kdvTop = suz.reduce((a, k) => a + kalemKdv(k, dav(k)), 0);

  const atamaHucre = (k) => {
    if (!atanabilirMi(dav(k)) || !k.atamaTur) return <span style={{ color: "var(--n500, #64748b)" }}>Ortak gider</span>;
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
  // Spec 0021: ödeme satırı olan kalemde durum satırlardan gelir (AC-6). Spec 0060 R1, R2 (AC-1, AC-4, AC-24): birden çok
  // ödeme hedefi olan kalemde (stopajlı kira, çok hedefli personel) taksitli olsa da hedef başına rozet çizilir; ölçüt
  // taksit sayısı değil hedef sayısıdır (cokHedefliMi). Tek hedefli kalem bugünkü toplu rozetini korur.
  const planliHucre = (k) => {
    const d = dav(k), durum = odemeDurumu(k);
    const hedefler = odemeHedefleri(k, d);
    const hedefBasina = cokHedefliMi(k, d);
    const yetki = canDo("gider_odeme");
    // Spec 0060 R6, R7 (AC-9): ek ödeme hedefinin yanında o hedefin kapattığı türlerin adları (tutarsız): resmi rozetinde resmi
    // tutarı olan türler, elden rozetinde elden tutarı olanlar (triyaj); tutarlı kırılım kalem satırında.
    const ekTurleri = (bilesen) => (d === DAVRANIS.PERSONEL ? ekOdemeTurToplamlari([k], { bilesen }).map(t => t.ad).join(", ") : "");
    const hedefRozeti = (h) => {
      // R3, R29: ad tek tablodan, yalın hâl (taksitsiz kirada bugünkü "Kiraya veren" / "Vergi dairesi" ile birebir, AC-40).
      const ad = hedefBasligi(h.hedef, d, true);
      const kismen = !h.odendi && h.kalanK < h.toplamK;
      // R2, R34 (AC-25): taksitli hedefin rozeti kısa ("Kısmen 2/6"); taksitsiz hedefte bugünkü metin.
      const metin = h.toplamAdet > 1
        ? `${h.odendi ? "Ödendi" : kismen ? "Kısmen" : "Ödenmedi"} ${h.odenenAdet}/${h.toplamAdet}`
        : h.odendi ? "Ödendi" : kismen ? `Kısmen · kalan ${tl2(h.kalanK / 100)}` : "Ödenmedi";
      const r = <Rozet renk={h.odendi ? "yesil" : kismen ? "turuncu" : "kirmizi"}>{ad}: {metin}</Rozet>;
      const ozet = h.hedef === HEDEF.EK_RESMI ? ekTurleri("resmi") : h.hedef === HEDEF.EK_ELDEN ? ekTurleri("elden") : "";
      const ek = ozet ? <span data-testid="ek-odeme-tur-ozeti" style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginLeft: 6 }}>{ozet}</span> : null;
      // AC-3/AC-40: ek özeti olmayan rozet bugünkü öğenin kendisidir (button/span, sarmalayıcı yok; görünüm birebir).
      const rozet = (testId) => (yetki && onHedefDegistir
        ? <button key={h.hedef} type="button" data-testid={testId} onClick={() => onHedefDegistir(k, h.hedef)} title={h.odendi ? "Ödemeleri görüntüle" : "Ödeme kaydet"} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>{r}</button>
        : <span key={h.hedef} data-testid={testId}>{r}</span>);
      return ek ? <div key={h.hedef} data-testid="hedef-rozeti">{rozet(undefined)}{ek}</div> : rozet("hedef-rozeti");
    };
    const acikAna = hedefler.find(h => h.hedef === HEDEF.ANA && !h.odendi);
    return (
      <div data-testid="odeme-hucre-planli">
        {hedefBasina
          ? <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>{hedefler.filter(h => h.toplamK > 0).map(hedefRozeti)}</div>
          : <Rozet renk={durum === "odendi" ? "yesil" : durum === "kismen" ? "turuncu" : "kirmizi"}>
            {durum === "odendi" ? "Ödendi" : durum === "kismen" ? "Kısmen ödendi" : "Ödenmedi"} {k.taksitler.filter(r => r.odendi).length}/{k.taksitler.length}</Rozet>}
        {!hedefBasina && durum === "kismen" && <div data-testid="kismen-ozet" style={{ fontSize: 11.5, color: "var(--orTx, #c2410c)", marginTop: 3 }}>Kalan {tl2(hedefler.reduce((a, h) => a + h.kalanK, 0) / 100)}</div>}
        <YontemOzeti y={yontemKirilimlari?.get(String(k.id))} vade={k.sonOdemeTarihi && !k.odendi ? `${acikAna?.toplamAdet > 1 ? "sonraki taksit" : "vade"} ${fmtTR(k.sonOdemeTarihi)}` : null} />
        {onOdemePlani && <button type="button" onClick={() => onOdemePlani(k)} style={{ background: "none", border: "none", padding: 0, marginTop: 4, color: "var(--orTx, #c2410c)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Ödeme planı</button>}
        {vadesiGectiMi(k, bugun) && <div style={{ marginTop: 4 }}><Rozet renk="kirmizi">Vadesi geçti</Rozet></div>}
      </div>
    );
  };
  // Spec 0024 R3/AC-4: taksitsiz kalemde durum hareketlerden gelir; kısmen ödenmişte ödenen ve kalan yazar.
  // Rozet ödeme penceresini açar (ödeme kaydet, kayıtlı ödemeleri gör/sil).
  const odemeHucre = (k) => {
    if (satirliMi(k)) return planliHucre(k);
    const hedefler = odemeHedefleri(k, dav(k));
    const toplamK = hedefler.reduce((a, h) => a + h.toplamK, 0), kalanK = hedefler.reduce((a, h) => a + h.kalanK, 0);
    const kismen = !k.odendi && kalanK < toplamK;
    const rozet = k.odendi ? <Rozet renk="yesil">Ödendi{k.odemeTarihi ? ` ${fmtTR(k.odemeTarihi).slice(0, 5)}` : ""}</Rozet>
      : kismen ? <Rozet renk="turuncu">Kısmen ödendi</Rozet> : <Rozet renk="kirmizi">Ödenmedi</Rozet>;
    return (
      <div>
        {canDo("gider_odeme") && onOdendi
          ? <button type="button" onClick={() => onOdendi(k)} title={k.odendi ? "Ödemeleri görüntüle" : "Ödeme kaydet"} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>{rozet}</button>
          : rozet}
        {kismen && <div data-testid="kismen-ozet" style={{ fontSize: 11.5, color: "var(--orTx, #c2410c)", marginTop: 3 }}>Ödenen {tl2((toplamK - kalanK) / 100)} · kalan {tl2(kalanK / 100)}</div>}
        {/* Spec 0053 R31: vade kalemin borç vadesidir; kalemin eski yöntem alanı hiçbir ekranda okunmaz. */}
        <YontemOzeti y={yontemKirilimlari?.get(String(k.id))} vade={k.sonOdemeTarihi ? `vade ${fmtTR(k.sonOdemeTarihi)}` : null} />
        {vadesiGectiMi(k, bugun) && <div style={{ marginTop: 4 }}><Rozet renk="kirmizi">Vadesi geçti</Rozet></div>}
      </div>
    );
  };
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
    const hd = hatDurum(k);
    return (
      <tr key={k.id} data-hatirlatma={hd || undefined}
        style={hd ? { background: hd === "gecmis" ? "var(--redBg, #fef2f2)" : "var(--ambBg, #fffbeb)", boxShadow: `inset 3px 0 0 ${hd === "gecmis" ? "var(--red600, #dc2626)" : "var(--amb600, #d97706)"}` } : undefined}>
        <td style={{ ...td, whiteSpace: "nowrap", color: "var(--n600, #475569)" }}>{fmtTR(k.tarih)}</td>
        <td style={td}><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{tur?.ad || "(türsüz)"} {d !== DAVRANIS.NORMAL && <DavranisRozeti davranis={d} />}</div></td>
        <td style={td}>
          <div style={{ fontWeight: 600 }}>{d === DAVRANIS.PERSONEL ? k.calisanAd : (k.aciklama || <span style={{ color: "var(--n500, #64748b)", fontWeight: 400 }}>Açıklama yok</span>)}</div>
          {d !== DAVRANIS.PERSONEL && <div style={{ fontSize: 12, color: ted ? "var(--n700, #334155)" : "var(--n500, #64748b)", marginTop: 2 }}>{ted ? ted.ad : "Tedarikçi seçilmemiş"}</div>}
          {d === DAVRANIS.PERSONEL && <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2 }}>Resmi {tl2(k.resmiTutar)} · Elden {tl2(k.eldenTutar)}{ekOdemeKurus(k) > 0 ? ` · Ek ödeme ${tl2(ekOdemeKurus(k) / 100)}` : ""}
            {/* Spec 0060 R6 (AC-8): ek ödemeler türüyle ve tutarıyla; satır yalnız personel grubu açıkken çizilir (K21, AC-36). */}
            {ekOdemeKurus(k) > 0 && <span data-testid="ek-odeme-tur-kirilimi"> ({ekOdemeTurToplamlari([k]).map(t => `${t.ad} ${tl2(t.toplamK / 100)}`).join(", ")})</span>}</div>}
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
    <KartBolum varyant="kart" style={{ padding: 0, overflow: "hidden" }} testId="kalem-listesi">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", gap: 10, flexWrap: "wrap", borderBottom: "1px solid var(--n200, #e2e8f0)" }}>
        <b>Gider Kalemleri <span style={{ color: "var(--n500, #64748b)", fontWeight: 500, fontSize: 13 }}>· {suz.length} kalem</span></b>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select aria-label="Tür filtresi" {...sec} value={filtre.tur} onChange={e => setFiltre(f => ({ ...f, tur: e.target.value }))}><option value="">Tüm türler</option>{giderTurleri.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}</select>
          <select aria-label="Tedarikçi filtresi" {...sec} value={filtre.ted} onChange={e => setFiltre(f => ({ ...f, ted: e.target.value }))}><option value="">Tüm tedarikçiler</option><option value="_yok">Tedarikçi seçilmemiş</option>{tedarikciler.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}</select>
          <select aria-label="Ödeme filtresi" {...sec} value={filtre.odeme} onChange={e => setFiltre(f => ({ ...f, odeme: e.target.value }))}><option value="">Tüm ödemeler</option><option value="odenmedi">Ödenmemiş</option><option value="odendi">Ödenmiş</option><option value="gecti">Vadesi geçmiş</option>{hatirlatma && <option value="hatirlatma">Hatırlatma kapsamı</option>}</select>
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
              <tr style={{ background: "var(--purBg3)" }}>
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
    </KartBolum>
  );
};
