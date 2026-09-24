// Spec 0007 AC-19/AC-20 yerleşim testi sayfası: gerçek SimpleDealers + gerçek ui.css, gerçek tarayıcı motorunda
// (Electron) ölçülür. jsdom yerleşim hesaplamadığı için buton kırpılması yalnız burada görülebilir.
// Adres parçası: #4 → dört buton (tam yetki), #3 → yedek parça ekleme izni yok (üç buton).
import { createRoot } from "react-dom/client";
import "../../../src/ui.css";
import { SimpleDealers } from "../../../src/components/SimpleDealers";

const ucButon = location.hash === "#3";
const izin = ucButon
  ? { role: "user", permissions: JSON.stringify({ tabs: ["dealers"], dealerActions: ["dealer_edit"], customerActions: ["cust_kalip_add"] }) }
  : null;
const bos = () => {};
createRoot(document.getElementById("root")).render(
  <SimpleDealers dealers={[{ id: 3, name: "Ege Bayi", bayiMi: true, anlasmaliServisMi: false, city: "İzmir", country: "Türkiye" }]}
    setDealers={bos} factory={{ name: "Altuntaş Makina" }} setFactory={bos} geoData={null} loadingGeo={false}
    customers={[]} setCustomers={bos} partSales={[]} setPartSales={bos} services={[]} yedekParcaSatislar={[]} setYedekParcaSatislar={bos}
    kalipDefs={[]} showToast={bos} serverPermissions={izin} openDetailId={3} />
);
