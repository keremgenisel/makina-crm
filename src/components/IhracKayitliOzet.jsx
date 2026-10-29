// Spec 0114: ihraç kayıtlı teslimin KDV kutusu özeti ve liste rozeti (spec 0116 ile formlardaki açıklama kutusu kalktı). Metinler
// lib/ihracKayitli.js'ten; rakamlar motordan (satisKdvBolumu üstündeki özet), bu dosya yalnız çizer (C10, R28).
import { fmtCur } from "../lib/utils";
import { IHRAC_OZET_ETIKETLERI, ihracKayitliRozeti } from "../lib/ihracKayitli";

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
