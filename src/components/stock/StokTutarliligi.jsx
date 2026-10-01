import { useMemo } from "react";
import { stokTutarliligi, TUTARLILIK_NOTU, SIRA_BELIRSIZ_NOTU } from "../../lib/stokHareketi";
import { Btn, Modal } from "../ui";
import { KartBolum, UyariSeridi, BolumBasligi } from "../tasarim";

// Spec 0065 R9–R11, R18, R19 (AC-13–AC-16, AC-26): saklı adet ile log'dan türeyen adedin karşılaştırması. Salt okunur:
// hiçbir adedi değiştirmez; düzeltme Parça Stoğu'ndaki sayım düzeltmesiyle bilinçli yapılır.
const Tablo = ({ satirlar, testId }) => (
  <KartBolum varyant="kart" style={{ padding: 0, overflow: "auto" }} testId={testId}>
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ background: "var(--n100, #f8fafc)" }}>
          {["Parça", "Saklı adet", "Log'dan türeyen", "Fark"].map(h => (
            <th key={h} style={{ padding: "8px 12px", textAlign: h === "Parça" ? "left" : "right", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {satirlar.map(s => (
          <tr key={s.partId} data-testid="tutarlilik-satiri" style={{ borderBottom: "1px solid var(--n150, #f1f5f9)" }}>
            <td style={{ padding: "8px 12px", fontSize: 13, fontWeight: 600 }}>{s.ad}</td>
            <td style={{ padding: "8px 12px", fontSize: 13, textAlign: "right" }}>{s.sakli}</td>
            <td style={{ padding: "8px 12px", fontSize: 13, textAlign: "right" }}>{s.turetilen}</td>
            <td style={{ padding: "8px 12px", fontSize: 13, textAlign: "right", fontWeight: 700 }}>{s.fark > 0 ? `+${s.fark}` : s.fark}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </KartBolum>
);

export const StokTutarliligi = ({ parts = [], partStock = [], partStockLog = [], onClose }) => {
  const r = useMemo(() => stokTutarliligi(partStock, partStockLog, parts), [partStock, partStockLog, parts]);
  return (
    <Modal title="Stok Tutarlılığı" onClose={onClose} wide footer={<Btn variant="ghost" onClick={onClose}>Kapat</Btn>}>
      <div data-testid="stok-tutarliligi" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {r.sapmalar.length === 0
          ? <UyariSeridi aile="basari" testId="tutarlilik-sapma-yok" baslik="Sapma yok" metin={`Karşılaştırılan ${r.tutarli} parçanın saklı adedi stok hareketleriyle tutarlı.`} />
          : (<>
              <BolumBasligi>Saklı adedi hareketlerle tutmayan parçalar ({r.sapmalar.length})</BolumBasligi>
              <Tablo satirlar={r.sapmalar} testId="tutarlilik-sapmalar" />
            </>)}
        {r.belirsizler.length > 0 && (<>
          <BolumBasligi>Sıra belirsiz ({r.belirsizler.length})</BolumBasligi>
          <UyariSeridi aile="uyari" testId="tutarlilik-sira-belirsiz" metin={SIRA_BELIRSIZ_NOTU} baslik="Karşılaştırılmadı" />
          <Tablo satirlar={r.belirsizler} testId="tutarlilik-belirsizler" />
        </>)}
        <UyariSeridi aile="bilgi" testId="tutarlilik-notu" baslik="Rapor neyi söyleyemez" metin={TUTARLILIK_NOTU} />
      </div>
    </Modal>
  );
};
