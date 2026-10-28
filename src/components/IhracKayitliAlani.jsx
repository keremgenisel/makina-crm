// Spec 0114: ihraç kayıtlı teslimin form alanı (makina, Extra Kalıp, yedek parça), KDV kutusu özeti ve liste rozeti. Kapı ve
// metinler lib/ihracKayitli.js'ten; rakamlar motordan (satisKdvBolumu üstündeki özet), bu dosya yalnız çizer (C10, R28).
import { useState } from "react";
import { Ipucu } from "./tasarim";
import { fmtCur } from "../lib/utils";
import {
  IHRAC_ACIKLAMA, IHRAC_IBARE, IHRAC_FATURA_NOTU, IHRAC_KOPYALA, IHRAC_KOPYALANDI, IHRAC_KOPYALANAMADI, IHRAC_PARCA_SINIRI,
  IHRAC_OZET_ETIKETLERI, ihracKayitliRozeti,
} from "../lib/ihracKayitli";

// R22–R24: işaret açıkken satış tipi seçicisinin altında. Açıklama üç formda aynı sabittir (Karar 13); yedek parçaya özgü sınır
// satırı yalnız `parcaSiniri` ile (R24). İbare salt okunur alanda durur, her zaman seçilip kopyalanabilir; Kopyala düğmesi
// başarısız olursa bunu söyler (plan Ö-9: Electron'da pano Promise döndürür ve odak isteyebilir).
export const IhracKayitliAlani = ({ acik, parcaSiniri = false }) => {
  const [durum, setDurum] = useState("");
  if (!acik) return null;
  const kopyala = async () => {
    try { await navigator.clipboard.writeText(IHRAC_IBARE); setDurum(IHRAC_KOPYALANDI); }
    catch { setDurum(IHRAC_KOPYALANAMADI); }
  };
  return (
    <div data-testid="ihrac-kayitli-alani" style={{ marginBottom: 12, border: "1px solid var(--tealBr, #99f6e4)", background: "var(--tealBg, #f0fdfa)", borderRadius: 8, padding: "8px 10px" }}>
      <div data-testid="ihrac-aciklama" style={{ fontSize: 12, color: "var(--n700, #334155)", lineHeight: 1.45 }}>{IHRAC_ACIKLAMA}</div>
      {parcaSiniri && <div data-testid="ihrac-parca-siniri" style={{ fontSize: 12, color: "var(--n700, #334155)", marginTop: 4, lineHeight: 1.45 }}>{IHRAC_PARCA_SINIRI}</div>}
      <div style={{ display: "flex", gap: 6, alignItems: "flex-start", marginTop: 8 }}>
        <textarea readOnly aria-label="Faturaya yazılacak ibare" data-testid="ihrac-ibare" value={IHRAC_IBARE} rows={2}
          onFocus={e => e.target.select()}
          style={{ flex: 1, fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--n200, #e2e8f0)", background: "var(--surface, #fff)", color: "var(--n900, #0f172a)", resize: "none", fontFamily: "inherit" }} />
        <button type="button" onClick={kopyala} data-testid="ihrac-ibare-kopyala"
          style={{ fontSize: 12, fontWeight: 700, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--tealBr, #99f6e4)", background: "var(--surface, #fff)", color: "var(--teal2, #0f766e)", cursor: "pointer" }}>
          {IHRAC_KOPYALA}
        </button>
      </div>
      {durum && <div role="status" data-testid="ihrac-kopya-durumu" style={{ fontSize: 11.5, color: "var(--teal2, #0f766e)", marginTop: 4 }}>{durum}</div>}
      <Ipucu>{IHRAC_FATURA_NOTU}</Ipucu>
    </div>
  );
};

// R25, R25/2: formun MEVCUT KDV kutusunun içindeki beş satır (yeni kutu açılmaz). `ozet` satisTevkifatOzeti'nin dönüşüdür.
export const IhracKayitliOzetSatirlari = ({ ozet, currency = "TRY" }) => {
  if (!ozet?.ihracKayitli) return null;
  const E = IHRAC_OZET_ETIKETLERI;
  const satir = (a, b, kalin = false) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, fontWeight: kalin ? 700 : 500, color: "var(--grn800, #065f46)", padding: "2px 0" }}>
      <span>{a}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{b}</span>
    </div>
  );
  return (
    <div data-testid="ihrac-kayitli-ozet" style={{ marginTop: 6, borderTop: "1px dashed var(--grnBr, #bbf7d0)", paddingTop: 6 }}>
      {satir(E.matrah, fmtCur(ozet.matrah, currency))}
      {satir(E.toplamKdv, fmtCur(ozet.toplamKdv, currency))}
      {satir(E.ertelenenKdv, `− ${fmtCur(ozet.ertelenenKdv, currency)}`)}
      {satir(E.tahsilKdv, fmtCur(ozet.bizKdv, currency))}
      {satir(E.faturaToplami, fmtCur(ozet.faturaToplami, currency), true)}
    </div>
  );
};

// R26, R26/3: liste rozeti (zaman çizelgesi, Stok › Yedek Parça Satışı). Tevkifat rozetinin ölçüsünde, teal (Karar 23). Tek
// bileşen iki ekranda kullanılır (plan Ö-7); rakam çağıranın motor sonucundan (`ertelenenMetni`).
export const IhracKayitliRozeti = ({ ertelenenMetni, blok = false, solBosluk = false }) => {
  const rozet = (
    <span data-testid="ihrac-kayitli-rozeti" style={{ marginLeft: solBosluk ? 6 : 0, fontSize: 10.5, fontWeight: 700, borderRadius: 5, padding: "2px 7px", background: "var(--tealBg, #f0fdfa)", color: "var(--teal2, #0f766e)" }}>
      {ihracKayitliRozeti(ertelenenMetni)}
    </span>
  );
  return blok ? <div style={{ marginTop: 4 }}>{rozet}</div> : rozet;
};
