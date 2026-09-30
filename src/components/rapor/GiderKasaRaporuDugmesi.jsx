// Spec 0047: Aylık Gider ve Kasa Raporu düğmesi. Üç ekranın (Giderler, Kasa, Finans) paylaştığı TEK bileşen (R33).
// Bu dosya src/components/gider/ klasörünün DIŞINDADIR (R36, C8): gizlilik testi o klasörde yazdırma çağrısını
// yasaklıyor ve bu kural gevşetilmez. Yazdırma çağrısı ve yetki kapısı burada durur.
import { useState } from "react";
import { Btn, Icon } from "../ui";
import { giderKasaRaporu, buildGiderKasaRaporuHtml } from "../../lib/giderRaporu";
import { yerelBugun } from "../../lib/utils";

// R23, R24, R33 (plan Q3): tek yetki kapısı. Rapor her zaman iki bölümü birden taşıdığı için kapı kasa yetkisidir
// (Giderler + Finans sekmesi, yayın perdesi kalkık); App'in kasaYetki'si bu üçünü zaten birleştirir.
export const giderKasaRaporuAcik = ({ kasaYetki = false } = {}) => !!kasaYetki;

// R3, AC-43: varsayılan ay önceki aydır (yerel takvim).
export const oncekiAy = (bugun = yerelBugun()) => {
  const [y, m] = String(bugun).split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// veri: App'in tek giderKasaRaporVerisi memosu (Q4). ay: verilirse (Finans'ın raporAy'ı, R2) düğme kendi ay alanını
// çizmez. baslangicAy: ekranın tek aylık seçimi (Giderler "Ay" kipi) ilk açılışta ön doldurur (R3).
export const GiderKasaRaporuDugmesi = ({ veri, kasaYetki = false, ay: disAy = null, baslangicAy = null }) => {
  const [ay, setAy] = useState(() => baslangicAy || oncekiAy());
  // R43, AC-57: kutunun durumu hatırlanmaz, her açılışta açık.
  const [kalemListesi, setKalemListesi] = useState(true);
  if (!giderKasaRaporuAcik({ kasaYetki }) || !veri) return null;
  const secili = disAy || ay;
  const yazdir = () => {
    if (!secili) return;
    const html = buildGiderKasaRaporuHtml(giderKasaRaporu(veri, secili, { kalemListesi }));
    if (window.appPrint?.printHtml) window.appPrint.printHtml(html, null, `Gider-Kasa-Raporu-${secili}.pdf`);
  };
  return (
    <div data-testid="gider-kasa-raporu" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      {disAy == null && (
        <input type="month" className="input" aria-label="Rapor ayı" value={ay} onChange={e => setAy(e.target.value)} style={{ width: 150, padding: "5px 8px" }} />
      )}
      <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5, cursor: "pointer" }}>
        <input type="checkbox" aria-label="Kalem listesi" checked={kalemListesi} onChange={e => setKalemListesi(e.target.checked)} />
        Kalem listesi
      </label>
      <Btn small variant="ghost" onClick={yazdir} title="Seçili ayın gider ve kasa raporunu yazdır/PDF kaydet"><Icon name="print" size={13} /> Gider ve Kasa Raporu</Btn>
    </div>
  );
};
