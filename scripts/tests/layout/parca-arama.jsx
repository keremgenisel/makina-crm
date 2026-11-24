// Spec 0160 AC-32, P10: parça arama panellerinde 139 karakterlik adlı parçanın alt satırı adın altına iner ve panel yatay kaymaz.
// GERÇEK bileşenler: Evrak'ın "Parça Kataloğundan Seç" penceresi (KalemSecPenceresi, SearchPick, açılınca liste açık) ve Stok'un
// "Stoğa Parça Ekle" seçicisi (SearchSelect, 600 px pencere genişliğinde). Kabuk: kenar çubuğu 236 px, ana alan dolgusu 28 px.
import { createRoot } from "react-dom/client";
import "../../../src/ui.css";
import { SearchSelect } from "../../../src/components/ui";
import { KalemSecPenceresi } from "../../../src/components/documents/KalemSecPenceresi";
import { parcaAramaDegerleri, parcaAramaSatiri } from "../../../src/lib/parcaBilgi";
import { PARCALAR, canli } from "../../../tests/fixtures/0160-veri.js";

const bos = () => {};
const P = canli(PARCALAR);
createRoot(document.getElementById("root")).render(
  <div style={{ display: "flex", height: "100vh" }}>
    <div style={{ width: 236, flexShrink: 0, background: "#1f0d02" }} />
    <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
      <div data-kutu="stok" style={{ maxWidth: 600 }}>
        <SearchSelect value="" onChange={bos} options={P.map(p => ({ value: String(p.id), label: p.ad, ara: parcaAramaDegerleri(p), alt: parcaAramaSatiri(p) }))}
          placeholder="Parça seçin..." searchPlaceholder="Parça ara..." initialLimit={10} />
      </div>
      <KalemSecPenceresi baslik="Parça Kataloğundan Seç" items={P} getLabel={p => p.ad} getKey={p => p.id} placeholder="Parça ara..."
        aramaDegerleri={parcaAramaDegerleri} getAlt={parcaAramaSatiri} onPick={bos} onClose={bos} />
    </div>
  </div>
);
