import { useState } from "react";
import { ALTUNMAK_MODELS } from "../lib/constants";
import { MakinaStokTab } from "./stock/MakinaStokTab";
import { PartStokTab }   from "./stock/PartStokTab";
import { UretimFormu }   from "./stock/UretimFormu";

export const Stock = ({
  stock, setStock,
  models = ALTUNMAK_MODELS,
  showToast = () => {},
  parts = [],
  partStock = [], setPartStock = () => {},
  partStockLog = [], setPartStockLog = () => {},
  appSettings = {}, setAppSettings = () => {},
  customers = [], setCustomers = null,
  kalipDefs = [],
  uretimFormlari = [], setUretimFormlari = () => {},
  partSales = [], setPartSales = null,
  serverPermissions = null,
  defaultSubTab = "makina",
}) => {
  const [subTab, setSubTab] = useState(defaultSubTab || "makina");

  const TABS = [
    ["makina", "Makina Stoğu"],
    ["parca",  "Parça/Yedek Parça Stoğu"],
    ["uretim", "Kalıp Üretim"],
  ];

  const _isAdmin = !serverPermissions || serverPermissions.role === "admin";
  const _allowedStockActions = _isAdmin ? null : (() => {
    try { return JSON.parse(serverPermissions?.permissions || "null")?.stockActions ?? null; }
    catch { return null; }
  })();
  const canDoStock = action => !_allowedStockActions || _allowedStockActions.includes(action);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Stok</h2>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "2px solid #f1f5f9", paddingBottom: 0 }}>
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setSubTab(id)} style={{
            padding: "8px 18px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13.5,
            borderBottom: subTab === id ? "2px solid #e85d1a" : "2px solid transparent",
            color: subTab === id ? "#e85d1a" : "#94a3b8",
            background: "transparent", marginBottom: -2,
          }}>{label}</button>
        ))}
      </div>

      {subTab === "makina" && (
        <MakinaStokTab stock={stock} setStock={setStock} models={models} showToast={showToast}
          parts={parts} partStock={partStock} setPartStock={setPartStock}
          partStockLog={partStockLog} setPartStockLog={setPartStockLog}
          canDoStock={canDoStock} serverPermissions={serverPermissions} />
      )}
      {subTab === "parca" && (
        <PartStokTab parts={parts} partStock={partStock} setPartStock={setPartStock}
          partStockLog={partStockLog} setPartStockLog={setPartStockLog} showToast={showToast}
          appSettings={appSettings} setAppSettings={setAppSettings}
          canDoStock={canDoStock} serverPermissions={serverPermissions} />
      )}
      {subTab === "uretim" && (
        <UretimFormu
          uretimFormlari={uretimFormlari} setUretimFormlari={setUretimFormlari}
          customers={customers} setCustomers={setCustomers}
          kalipDefs={kalipDefs}
          partSales={partSales} setPartSales={setPartSales}
          showToast={showToast}
          canDoStock={canDoStock} serverPermissions={serverPermissions} />
      )}
    </div>
  );
};
