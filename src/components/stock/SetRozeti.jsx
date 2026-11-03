import { setRozetMetni, setIcerikSatiri, setIcerigiOf, SET_ICERIGI_YER_TUTUCU } from "../../lib/urunAgaci";

// Spec 0126 triyaj: katalogda ve satırda adı bulunamayan parçanın parantezli yer tutucusu; satış ekranları (Evrak) urunAgaci'yı
// anmadığı için (0087 AC-6) buradan yeniden dışa verilir, metin tek yerde kalır.
export { SET_ICERIGI_YER_TUTUCU as PARCA_YER_TUTUCU };

// Spec 0121: satış/stok ekranları maliyet modülünü doğrudan içe almaz (0087 AC-6); içerik sorusu buradan sorulur.
export const setBilesenSayisi = (part) => setIcerigiOf(part).length;

// Spec 0126 R5, Karar 18: arama listesinin satırı düz metindir (SearchPick zengin satır almaz), rozet etikete metin olarak
// girer. Satış ekranları (Evrak dahil) urunAgaci adını anmadığı için (0087 AC-6) ek buradan verilir; set değilse boş.
export const setEtiketEki = (part) => {
  const n = setBilesenSayisi(part);
  return n > 0 ? ` · ${setRozetMetni(n)}` : "";
};

// Spec 0121 R24, R24/2: setin rozeti. Biçimi MakinaStokTab'ın model rozetiyle aynı; Parça Stoğu satırında ve parça kartı
// listesinde adın altında çizilir (sütun sayısı değişmez). İki ekran ayrışmasın diye tek bileşen.
export const SetRozeti = ({ n }) => (
  <div style={{ marginTop: 4 }}>
    <span data-testid="set-rozeti" style={{ fontSize: 12, background: "var(--ambBg3, #fff7ed)", color: "var(--orTx, #c2410c)", borderRadius: 6, padding: "3px 10px", fontWeight: 700, whiteSpace: "nowrap" }}>{setRozetMetni(n)}</span>
  </div>
);

// Spec 0121 R26/2, Karar 47: seçimden SONRA, seçimin altında salt okunur içerik satırı (servis formu sepeti, yedek parça satış
// formunun seçili parça kutusu). Kayıt tek kalemdir, bu satır kayda girmez. Set olmayan parçada hiçbir şey çizilmez.
export const SetIcerikSatiri = ({ part, parts = [] }) => {
  const r = setIcerikSatiri(part, parts);
  if (!r) return null;
  return (
    <span data-testid="set-icerik-satiri" style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--n500, #64748b)", marginTop: 2, whiteSpace: "normal" }}>
      <b style={{ color: "var(--orTx, #c2410c)" }}>{r.baslik}</b>: {r.bilesenler.join(", ")}
    </span>
  );
};
