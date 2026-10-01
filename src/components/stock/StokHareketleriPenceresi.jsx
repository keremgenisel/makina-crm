import { fmtTR } from "../../lib/utils";
import { hareketTipAdi, iadeMi, MUTLAK_TIPLER } from "../../lib/stokHareketi";
import { Btn, Modal } from "../ui";
import { KartBolum, BosDurum, Ipucu } from "../tasarim";

// Spec 0065 R8, R18 (AC-25): bir parçanın stok hareketleri, salt okunur. Karşı hareket (iade) okunur adıyla ve notuyla
// görünür; sayım düzeltmesi mutlak değerdir ("= n"). Yazdırılmaz, düzenlenmez.
const miktarMetni = (l) => {
  const n = Number(l.miktar) || 0;
  if (MUTLAK_TIPLER.has(l.tip)) return `= ${n}`;
  return n > 0 ? `+${n}` : String(n);
};

export const StokHareketleriPenceresi = ({ part, partStockLog = [], onClose }) => {
  const satirlar = (partStockLog || [])
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l && String(l.partId) === String(part?.id))
    .sort((a, b) => String(b.l.tarih || "").localeCompare(String(a.l.tarih || "")) || b.i - a.i)
    .map(({ l }) => l);
  return (
    <Modal title={`Stok Hareketleri · ${part?.ad || "Parça"}`} onClose={onClose} wide
      footer={<Btn variant="ghost" onClick={onClose}>Kapat</Btn>}>
      <div data-testid="stok-hareketleri" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Ipucu>Saat tutulmadığı için aynı gündeki hareketlerin sırası kesin değildir. Sayım düzeltmesi adedi doğrudan o değere çeker.</Ipucu>
        {satirlar.length === 0 ? (
          <BosDurum testId="bos-stok-hareketi" baslik="Bu parçanın kayıtlı stok hareketi yok" />
        ) : (
          <KartBolum varyant="kart" style={{ padding: 0, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--n100, #f8fafc)" }}>
                  {["Tarih", "Hareket", "Miktar", "Not"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: h === "Miktar" ? "right" : "left", fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {satirlar.map(l => (
                  <tr key={l.id} data-testid="stok-hareket-satiri" style={{ borderBottom: "1px solid var(--n150, #f1f5f9)" }}>
                    <td style={{ padding: "8px 12px", fontSize: 12.5, whiteSpace: "nowrap" }}>{l.tarih ? fmtTR(l.tarih) : "—"}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12.5, fontWeight: iadeMi(l.tip) ? 700 : 500, color: iadeMi(l.tip) ? "var(--grn700, #15803d)" : "var(--n900, #0f172a)" }}>{hareketTipAdi(l.tip)}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12.5, textAlign: "right", fontWeight: 700 }}>{miktarMetni(l)}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12, color: "var(--n600, #475569)" }}>{l.notlar || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </KartBolum>
        )}
      </div>
    </Modal>
  );
};
