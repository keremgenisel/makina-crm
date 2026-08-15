import { CUR_SYM } from "../lib/constants";
import { fmtTR } from "../lib/utils";
import { hesaplaKartKomisyonu, kkAyarNormalize, kartYansitmaAyrim } from "../lib/krediKarti";
// Not: ./ui'den (Icon) import ETME — ui.jsx bu bileşeni PaymentRowsEditor içinde kullanıyor, döngü olur.
// Komisyon kutusunda kuruş önemli (BSMV 1.619,80 gibi) → fmtCur (tam yuvarlar) yerine 2 haneli biçim.
const fmtCur = (n, cur = "TRY") =>
  `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0)} ${CUR_SYM[cur] || "₺"}`;

// Kredi Kartı seçilince gösterilen ortak alan: taksit seçici + "komisyonu müşteriye yansıt" onay kutusu.
// yansıt KAPALI iken "komisyonu biz üstlenirsek" banka kesintisi (ileri kırılım) bilgi amaçlı gösterilir;
// yansıt AÇIK iken kısa bir not durur, ÜÇLÜ AYRIM (satış/komisyon/KDV + çekilecek kart tutarı) formun
// Toplam bölümünde <KartYansitmaOzeti/> ile gösterilir. Ürün/kalem fiyatına ARTIK DOKUNULMAZ (eski "Uygula"
// düğmesi kaldırıldı); gross-up yalnız kaydetme anında satış bedeline uygulanır. PartSaleForm,
// YedekParcaSatisForm, ServiceForm ve PaymentRowsEditor paylaşır.
const kutu = { marginTop: 10, border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, overflow: "hidden" };
const bas = { display: "flex", alignItems: "center", gap: 7, padding: "9px 13px", background: "var(--n100, #f8fafc)", borderBottom: "1px solid var(--n200, #e2e8f0)", fontSize: 12, fontWeight: 700, color: "var(--n600, #475569)" };
const satir = (neg) => ({ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 13px", fontSize: 13, color: neg ? "var(--red700, #b91c1c)" : "var(--n700, #334155)" });

export const KartTaksitAlani = ({ ayar, tutar = 0, currency = "TRY", taksit, setTaksit, yansit = false, setYansit }) => {
  const { satirlar } = kkAyarNormalize(ayar);
  const sirali = [...satirlar].sort((a, b) => (parseInt(a.taksit) || 0) - (parseInt(b.taksit) || 0));
  const taksitOpsiyon = (t) => (parseInt(t) === 1 ? "Tek Çekim" : `${t} Taksit`);
  const secili = taksit != null && taksit !== "" ? parseInt(taksit) : "";

  // yansıt KAPALI → "komisyonu biz üstlenirsek" banka kesintisi (bilgi). yansıt AÇIK → üçlü ayrım (satış /
  // komisyon / KDV) formun Toplam kutusunda gösterilir (satır fiyatına dokunulmaz), burada kısa not durur.
  const ileri = !yansit && secili ? hesaplaKartKomisyonu(tutar, secili, ayar) : null;

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
              style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--brand, #e85d1a)", flexShrink: 0 }} />
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

      {/* yansıt AÇIK: kısa bilgi — üçlü ayrım (satış/komisyon/KDV) ve çekilecek kart tutarı aşağıdaki
          Toplam kutusunda gösterilir. Ürün/kalem fiyatı DEĞİŞMEZ. */}
      {yansit && setYansit && secili !== "" && (
        <div style={{ padding: "9px 12px", fontSize: 12, fontWeight: 600, color: "var(--amb800, #92400e)", background: "var(--ambBg3, #fff7ed)", border: "1px solid var(--ambBr, #fde68a)", borderRadius: 8, lineHeight: 1.4 }}>
          Komisyon müşteriye yansıtılıyor. Ürün fiyatı aynı kalır; komisyon ve çekilecek kart tutarı aşağıdaki <b>Toplam</b> bölümünde görünür.
        </div>
      )}
    </div>
  );
};

// Toplam kutusunda gösterilen ÜÇLÜ AYRIM (komisyon müşteriye yansıtıldığında). Ürün/kalem fiyatı
// hiç değişmez: satış = kalem (ciro), komisyon = banka gideri (KDV matrahına girer ama ciroya girmez),
// KDV = (kalem+komisyon) üzerinden, çekilecek kart tutarı = üçünün toplamı. netTaban = kalem toplamı (KDV hariç).
export const KartYansitmaOzeti = ({ netTaban = 0, taksit, ayar, kdvOrani = 0, currency = "TRY", satisLabel = "Satış (ciro)" }) => {
  const secili = taksit != null && taksit !== "" ? parseInt(taksit) : "";
  const a = secili !== "" && netTaban > 0 ? kartYansitmaAyrim(netTaban, secili, ayar, kdvOrani) : null;
  if (!a) return null;
  const sat = (label, val, opt = {}) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 13px", fontSize: 13, color: opt.color || "var(--n700, #334155)", ...(opt.style || {}) }}>
      <span>{label}</span><b>{opt.plus ? "+" : ""}{fmtCur(val, currency)}</b>
    </div>
  );
  return (
    <div style={{ marginTop: 8, border: "1px solid var(--bluBr, #bfdbfe)", borderRadius: 10, overflow: "hidden", background: "var(--surface, #fff)" }}>
      <div style={{ padding: "8px 13px", fontSize: 11.5, fontWeight: 800, color: "var(--amb800, #92400e)", background: "var(--ambBg3, #fff7ed)", borderBottom: "1px solid var(--n200,#e2e8f0)", textTransform: "uppercase", letterSpacing: ".03em" }}>💳 Komisyon müşteriye yansıtıldı</div>
      {sat(satisLabel, a.satis, { color: "var(--grn800,#065f46)", style: { fontWeight: 600 } })}
      {sat("Kredi kartı komisyonu (bankaya)", a.komisyon, { plus: true, color: "var(--red700,#b91c1c)" })}
      {kdvOrani > 0 && sat(`KDV matrahı (kalem + komisyon)`, a.kdvMatrah, { color: "var(--n500,#64748b)", style: { fontSize: 12 } })}
      {kdvOrani > 0 && sat(`KDV (%${kdvOrani})`, a.kdv, { plus: true, color: "var(--grn800,#065f46)" })}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 13px", fontSize: 13.5, fontWeight: 800, color: "var(--amb800,#92400e)", background: "var(--ambBg, #fffbeb)", borderTop: "1px solid var(--n200,#e2e8f0)" }}>
        <span>Müşteriden çekilecek kart tutarı</span><b>{fmtCur(a.kartTutari, currency)}</b>
      </div>
      {a.blokajGun > 0 && (
        <div style={{ padding: "7px 13px", fontSize: 11.5, fontWeight: 600, color: "var(--amb800, #92400e)", background: "var(--ambBg3, #fff7ed)", borderTop: "1px solid var(--n200,#e2e8f0)" }}>
          Bloke {a.blokajGun} gün · hesaba geçiş {fmtTR(a.hesabaGecis)}, o tarihe kadar tahsilat sayılmaz.
        </div>
      )}
    </div>
  );
};
