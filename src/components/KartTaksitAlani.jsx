import { CUR_SYM } from "../lib/constants";
import { fmtTR } from "../lib/utils";
import { hesaplaKartKomisyonu, hesaplaKartTutariNetten, kkAyarNormalize } from "../lib/krediKarti";
// Not: ./ui'den (Icon) import ETME — ui.jsx bu bileşeni PaymentRowsEditor içinde kullanıyor, döngü olur.
// Komisyon kutusunda kuruş önemli (BSMV 1.619,80 gibi) → fmtCur (tam yuvarlar) yerine 2 haneli biçim.
const fmtCur = (n, cur = "TRY") =>
  `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0)} ${CUR_SYM[cur] || "₺"}`;

// Kredi Kartı seçilince gösterilen ortak alan: taksit seçici + komisyon kırılımı (ileri) ve
// "komisyonu müşteriye yansıt" (ters/gross-up) hesaplayıcısı. PartSaleForm, YedekParcaSatisForm ve
// PaymentRowsEditor tarafından paylaşılır (tek yerde dursun, sürüklenmesin). Snapshot'ı ÇAĞIRAN
// kaydeder (kaydetmede hesaplaKartKomisyonu/…Netten yeniden çağrılır); bu bileşen sadece gösterir.
// onUygula verilirse gross-up sonucu bir "Uygula" düğmesiyle tutar alanına yazdırılabilir (tek tutarlı
// bağlamlar: ödeme satırı / yedek parça). Verilmezse gross-up yalnız bilgi amaçlı gösterilir.
const kutu = { marginTop: 10, border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, overflow: "hidden" };
const bas = { display: "flex", alignItems: "center", gap: 7, padding: "9px 13px", background: "var(--n100, #f8fafc)", borderBottom: "1px solid var(--n200, #e2e8f0)", fontSize: 12, fontWeight: 700, color: "var(--n600, #475569)" };
const satir = (neg) => ({ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 13px", fontSize: 13, color: neg ? "var(--red700, #b91c1c)" : "var(--n700, #334155)" });

export const KartTaksitAlani = ({ ayar, tutar = 0, currency = "TRY", kdvOrani = 0, taksit, setTaksit, yansit = false, setYansit, hedefNet = "", setHedefNet, onUygula = null }) => {
  const { satirlar } = kkAyarNormalize(ayar);
  const sirali = [...satirlar].sort((a, b) => (parseInt(a.taksit) || 0) - (parseInt(b.taksit) || 0));
  const taksitOpsiyon = (t) => (parseInt(t) === 1 ? "Tek Çekim" : `${t} Taksit`);
  const secili = taksit != null && taksit !== "" ? parseInt(taksit) : "";

  const ileri = !yansit && secili ? hesaplaKartKomisyonu(tutar, secili, ayar) : null;
  const ters = yansit && secili ? hesaplaKartTutariNetten(hedefNet, secili, ayar, kdvOrani) : null;

  return (
    <div style={{ marginTop: 10, display: "grid", gap: 10, padding: 12, borderRadius: 10, background: "var(--bluBg, #eff6ff)", border: "1px solid var(--bluBr, #bfdbfe)" }}>
      <div style={{ display: "grid", gridTemplateColumns: setYansit ? "1fr 1.4fr" : "1fr", gap: 10, alignItems: "end" }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)", display: "block", marginBottom: 4 }}>Taksit Sayısı</label>
          <select value={secili} onChange={e => setTaksit(e.target.value === "" ? "" : parseInt(e.target.value))}
            style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 13.5, background: "var(--surface, #fff)", boxSizing: "border-box" }}>
            <option value="">Seçin…</option>
            {sirali.map(s => <option key={s.taksit} value={s.taksit}>{taksitOpsiyon(s.taksit)}</option>)}
          </select>
        </div>
        {setYansit && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12.5, color: "var(--n700, #334155)", paddingBottom: 4 }}>
            <input type="checkbox" checked={!!yansit} onChange={e => setYansit(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#e85d1a", flexShrink: 0 }} />
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
              <b>Komisyonu müşteriye yansıt</b>
              <span style={{ fontSize: 11.5, fontWeight: 400, color: "var(--n500, #64748b)" }}>Elinize geçecek net tutarı girin, çekilecek kart tutarı otomatik hesaplansın</span>
            </span>
          </label>
        )}
      </div>

      {/* İLERİ: kart tutarından banka kesintisi kırılımı */}
      {ileri && (
        <div style={kutu}>
          <div style={bas}><span>💳</span> Banka Kesintisi{secili === 1 ? " · Tek Çekim" : ` · ${secili} taksit`} (oran %{ileri.oran}, BSMV dâhil)</div>
          <div style={satir(true)}><span>Üye İşyeri Ücreti <small style={{ color: "var(--n400,#94a3b8)" }}>%{ileri.uyeIsyeriOrani.toFixed(2)}</small></span><b>−{fmtCur(ileri.uyeIsyeriUcreti, currency)}</b></div>
          <div style={satir(true)}><span>BSMV <small style={{ color: "var(--n400,#94a3b8)" }}>üye ücretinin %{ileri.bsmvOrani}'i</small></span><b>−{fmtCur(ileri.bsmvTutar, currency)}</b></div>
          <div style={satir(true)}><span>Taksitli Satış Katkı Payı <small style={{ color: "var(--n400,#94a3b8)" }}>%{ileri.katkiPayiOrani}</small></span><b>−{fmtCur(ileri.katkiPayiTutar, currency)}</b></div>
          <div style={{ ...satir(true), background: "var(--redBg, #fef2f2)", borderTop: "1px solid var(--n200,#e2e8f0)", fontWeight: 800 }}><span>Toplam Kesinti</span><b>−{fmtCur(ileri.toplamKesinti, currency)}</b></div>
          <div style={{ ...satir(false), background: "var(--grnBg, #f0fdf4)", color: "var(--grn800,#065f46)", fontWeight: 800 }}><span>Net (hesaba geçen)</span><b>{fmtCur(ileri.netTutar, currency)}</b></div>
          {ileri.blokajGun > 0 && (
            <div style={{ padding: "8px 13px", fontSize: 12, fontWeight: 600, color: "var(--amb800, #92400e)", background: "var(--ambBg, #fffbeb)", borderTop: "1px solid var(--n200,#e2e8f0)" }}>
              Bloke {ileri.blokajGun} gün · hesaba geçiş {fmtTR(ileri.hesabaGecis)}, o tarihe kadar tahsilat sayılmaz.
            </div>
          )}
        </div>
      )}

      {/* TERS (gross-up): hedef net → çekilecek kart tutarı */}
      {yansit && setYansit && (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ maxWidth: 260 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)", display: "block", marginBottom: 4 }}>Hedef Net</label>
            <input type="text" inputMode="numeric"
              value={String(hedefNet ?? "").replace(/[^0-9]/g, "") === "" ? "" : new Intl.NumberFormat("tr-TR").format(Number(String(hedefNet).replace(/[^0-9]/g, "")))}
              onChange={e => setHedefNet(e.target.value.replace(/[^0-9]/g, ""))} placeholder="örn: 100.000"
              style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 13.5, background: "var(--surface, #fff)", boxSizing: "border-box", textAlign: "right", fontWeight: 600 }} />
          </div>
          {ters && (
            <div style={kutu}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "13px 16px", background: "var(--ambBg3, #fff7ed)", borderBottom: "1px solid var(--n200,#e2e8f0)" }}>
                <span style={{ fontSize: 11.5, fontWeight: 750, color: "var(--amb800, #92400e)", textTransform: "uppercase", letterSpacing: ".04em" }}>Müşteriden çekilecek kart tutarı</span>
                <span style={{ fontSize: 24, fontWeight: 850, color: "var(--amb800, #92400e)", fontVariantNumeric: "tabular-nums" }}>{fmtCur(ters.kartTutari, currency)}</span>
                {kdvOrani > 0 && <span style={{ fontSize: 12, color: "var(--amb700, #b45309)" }}>= mal bedeli {fmtCur(ters.malBedeli, currency)} + KDV %{kdvOrani} ({fmtCur(ters.kdvTutar, currency)})</span>}
              </div>
              <div style={satir(true)}><span>Banka komisyonu</span><b>−{fmtCur(ters.komisyonTutar, currency)}</b></div>
              {kdvOrani > 0 && <div style={satir(true)}><span>KDV</span><b>−{fmtCur(ters.kdvTutar, currency)}</b></div>}
              <div style={{ ...satir(false), background: "var(--grnBg, #f0fdf4)", color: "var(--grn800,#065f46)", fontWeight: 800 }}><span>Net</span><b>{fmtCur(ters.hedefNet, currency)}</b></div>
              {onUygula && (
                <div style={{ padding: "10px 13px", borderTop: "1px solid var(--n200,#e2e8f0)" }}>
                  <button type="button" onClick={() => onUygula(ters.kartTutari, ters.malBedeli)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "#fff", background: "#e85d1a", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>
                    ✓ Bu tutarı ödemeye uygula
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
