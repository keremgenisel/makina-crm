import { UyariSeridi } from "./tasarim";
import { maliyetMetniKurus } from "../lib/urunAgaci";
import { etkiMetni, fiyatEtkiMetni, ORNEK_SATIR } from "../lib/malzeme";
import { turetilmisFiyatMetni } from "../lib/parcaFiyati";
import { parseMoney } from "../lib/utils";

// Spec 0139 A-R16, karar 43: malzeme değişikliğinin etki özeti TEK bileşen. "Fiyatı Güncelle" penceresi (0132 R17, 0133 R16) ve
// malzeme kartının fire değişikliği onayı aynı çizimi kullanır; `etki` = `fiyatEtkisi(eski, yeni, parts, malzemeler, { fiyatAyarlari })`.
export const MalzemeEtkiOzeti = ({ etki }) => (
  <div data-testid="fiyat-etkisi">
    <UyariSeridi aile={etki.degisen ? "uyari" : "bilgi"}><span data-testid="fiyat-etki-metni">{etkiMetni(etki)}</span></UyariSeridi>
    {/* Spec 0133 R16, AC-38, AC-40: maliyet özetinin yanında satış fiyatı özeti (fiyatı değişen parça sayısı, sıfır dahil). */}
    {etki.bagli > 0 && <div data-testid="fiyat-etki-satis" style={{ fontSize: 12.5, marginTop: 6, color: "var(--n600, #475569)" }}>{fiyatEtkiMetni(etki)}</div>}
    {etki.satirlar.length > 0 && (
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginTop: 8 }}>
        <thead><tr style={{ color: "var(--n500, #64748b)", textAlign: "left" }}><th style={{ padding: "4px 6px" }}>Parça</th><th style={{ padding: "4px 6px", textAlign: "right" }}>Eski maliyet</th><th style={{ padding: "4px 6px", textAlign: "right" }}>Yeni maliyet</th><th style={{ padding: "4px 6px", textAlign: "right" }}>Eski fiyat</th><th style={{ padding: "4px 6px", textAlign: "right" }}>Yeni fiyat</th></tr></thead>
        <tbody>{etki.satirlar.slice(0, ORNEK_SATIR).map(s => (
          <tr key={s.id} data-testid="fiyat-etki-satiri" style={{ borderTop: "1px solid var(--n100, #f1f5f9)" }}>
            <td style={{ padding: "4px 6px" }}>{s.ad}</td>
            <td style={{ padding: "4px 6px", textAlign: "right" }}>{maliyetMetniKurus(s.once)}</td>
            <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700 }}>{maliyetMetniKurus(s.sonra)}</td>
            {/* AC-39: eski ve yeni satış fiyatı; elle sabit parçada fiyat aynıdır, "—" yalnız türetilemeyende. */}
            <td data-testid="fiyat-etki-eski-fiyat" style={{ padding: "4px 6px", textAlign: "right" }}>{s.oncekiFiyat === "" || s.oncekiFiyat == null ? "—" : turetilmisFiyatMetni(parseMoney(s.oncekiFiyat))}</td>
            <td data-testid="fiyat-etki-yeni-fiyat" style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700 }}>{s.yeniFiyat === "" || s.yeniFiyat == null ? "—" : turetilmisFiyatMetni(parseMoney(s.yeniFiyat))}</td>
          </tr>))}</tbody>
      </table>
    )}
  </div>
);
