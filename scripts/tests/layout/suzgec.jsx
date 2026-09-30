// Spec 0014 AC-17 yerleşim testi sayfası: gerçek Customers (5 süzgeç + "Firmaya Göre Grupla") ve gerçek ui.css, gerçek
// tarayıcı motorunda (Electron) ölçülür. jsdom yerleşim hesaplamadığı için satır sarma yalnız burada görülebilir.
import { createRoot } from "react-dom/client";
import "../../../src/ui.css";
import { Customers } from "../../../src/components/Customers";

const bos = () => {};
const MUSTERI = [
  { id: 1, name: "Kutu Gıda", model: "AK100", serialNo: "S-1", warrantyEnd: "2099-01-01", kalanBorc: 5000 },
  { id: 2, name: "Ege Köfte", model: "AK100", serialNo: "", seriNoBekliyor: true, warrantyEnd: "2000-01-01" },
];
createRoot(document.getElementById("root")).render(
  <div style={{ padding: 24 }}><Customers customers={MUSTERI} setCustomers={bos} partSales={[]} services={[]} payments={[]} /></div>
);
