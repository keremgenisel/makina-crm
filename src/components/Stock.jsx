import { useState, useEffect } from "react";
import { ALTUNMAK_MODELS } from "../lib/constants";
import { makeCanDo } from "../lib/permissions";
import { MakinaStokTab } from "./stock/MakinaStokTab";
import { PartStokTab }   from "./stock/PartStokTab";
import { UretimFormu }   from "./stock/UretimFormu";
import { YedekParcaSatisTab } from "./stock/YedekParcaSatisTab";
import { Segment } from "./tasarim";

export const Stock = ({
  factory = null,
  stock, setStock,
  models = ALTUNMAK_MODELS,
  showToast = () => {},
  parts = [],
  partStock = [], setPartStock = () => {},
  partStockLog = [], setPartStockLog = () => {},
  appSettings = {}, setAppSettings = () => {},
  customers = [], setCustomers = null,
  copMusteriler = [], uretimPartileri = [], giderYetki = false,
  kasaHesaplari = null, tahsilatHesapVarsayilan = null,
  kalipDefs = [],
  uretimFormlari = [], setUretimFormlari = () => {},
  partSales = [], setPartSales = null,
  yedekParcaSatislar = [], setYedekParcaSatislar = () => {},
  dealers = [], kdvRates, calisanlar = [],
  serverPermissions = null,
  giderler = [], // spec 0001: yalnız gider yetkisiyle dolu; makina silme onayında bağlı gider sayısı
  defaultSubTab = "makina",
  yedekOdakId = null, onYedekOdakConsumed = null,
  geoData = null, loadingGeo = false,
}) => {
  const [subTab, setSubTab] = useState(defaultSubTab || "makina");
  // Bayi detayından "Yedek Parça Satışına git" — ilgili sekmeyi aç (zaten stok'a mount olurken açılır,
  // ama stok zaten açıksa bu effect sekmeyi değiştirir).
  useEffect(() => { if (yedekOdakId != null) setSubTab("yedeksatis"); }, [yedekOdakId]);

  const TABS = [
    ["makina", "Makina Stoğu"],
    ["parca",  "Parça/Yedek Parça Stoğu"],
    ["yedeksatis", "Yedek Parça Satışı"],
    ["uretim", "Kalıp Üretim"],
  ];

  const canDoStock = makeCanDo(serverPermissions, "stockActions");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--n900, #0f172a)" }}>Stok</h2>
      </div>

      <div style={{ marginBottom: 20 }}>
        {/* Spec 0014: gezinme alt sekmeleri, sözlükteki segmentli seçicinin sekme kipi (tablist/tab/aria-selected). */}
        <Segment kip="sekme" genislik="icerik" ariaLabel="Stok bölümleri" value={subTab} onChange={setSubTab}
          options={TABS.map(([id, label]) => ({ value: id, label }))} />
      </div>

      {subTab === "makina" && (
        <MakinaStokTab stock={stock} setStock={setStock} models={models} showToast={showToast}
          parts={parts} partStock={partStock} setPartStock={setPartStock}
          partStockLog={partStockLog} setPartStockLog={setPartStockLog}
          canDoStock={canDoStock} serverPermissions={serverPermissions} giderler={giderler} copMusteriler={copMusteriler} uretimPartileri={uretimPartileri} giderYetki={giderYetki} />
      )}
      {subTab === "parca" && (
        <PartStokTab parts={parts} partStock={partStock} setPartStock={setPartStock}
          partStockLog={partStockLog} setPartStockLog={setPartStockLog} showToast={showToast}
          appSettings={appSettings} setAppSettings={setAppSettings}
          canDoStock={canDoStock} serverPermissions={serverPermissions} />
      )}
      {subTab === "yedeksatis" && (
        <YedekParcaSatisTab
          yedekParcaSatislar={yedekParcaSatislar} setYedekParcaSatislar={setYedekParcaSatislar}
          dealers={dealers} parts={parts} customers={customers} calisanlar={calisanlar} factory={factory}
          partStock={partStock} setPartStock={setPartStock} partStockLog={partStockLog} setPartStockLog={setPartStockLog}
          kdvRates={kdvRates} showToast={showToast} canDoStock={canDoStock} serverPermissions={serverPermissions}
          krediKartiKomisyonlari={appSettings?.krediKartiKomisyonlari}
          geoData={geoData} loadingGeo={loadingGeo}
          odakId={yedekOdakId} onOdakConsumed={onYedekOdakConsumed}
          kasaHesaplari={kasaHesaplari} tahsilatHesapVarsayilan={tahsilatHesapVarsayilan} />
      )}
      {subTab === "uretim" && (
        <UretimFormu
          uretimFormlari={uretimFormlari} setUretimFormlari={setUretimFormlari}
          customers={customers} setCustomers={setCustomers}
          kalipDefs={kalipDefs}
          partSales={partSales} setPartSales={setPartSales}
          showToast={showToast} appSettings={appSettings} factory={factory}
          canDoStock={canDoStock} serverPermissions={serverPermissions} />
      )}
    </div>
  );
};
