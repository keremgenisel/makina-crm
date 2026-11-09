import { useState, useEffect, useMemo } from "react";
import { fiyatBaglamiKur } from "../lib/parcaFiyati";
import { ALTUNMAK_MODELS } from "../lib/constants";
import { makeCanDo } from "../lib/permissions";
import { MakinaStokTab } from "./stock/MakinaStokTab";
import { PartStokTab }   from "./stock/PartStokTab";
import { UretimFormu }   from "./stock/UretimFormu";
import { YedekParcaSatisTab } from "./stock/YedekParcaSatisTab";
import { PartiUretimPanosu } from "./stock/PartiUretimPanosu";
import { PANO_SEKME_ADI } from "../lib/stokDurumu";
import { Segment } from "./tasarim";

export const Stock = ({
  factory = null,
  stock, setStock,
  models = ALTUNMAK_MODELS,
  showToast = () => {},
  parts = [], rawParts = null, malzemeler = [],
  partStock = [], setPartStock = () => {},
  partStockLog = [], setPartStockLog = () => {},
  appSettings = {}, setAppSettings = () => {},
  customers = [], setCustomers = null,
  copMusteriler = [], uretimPartileri = [], giderYetki = false,
  // Spec 0140 B-R4/2, B-R6, karar 42: sipariş penceresinin girdisi. Tedarikçi dizileri gider yetkisinden bağımsız iner.
  tedarikciler = [], rawTedarikciler = null, standardModels = [], customModels = [],
  kasaHesaplari = null, tahsilatHesapVarsayilan = null,
  kalipDefs = [],
  uretimFormlari = [], setUretimFormlari = () => {}, services = [],
  partSales = [], setPartSales = null,
  yedekParcaSatislar = [], setYedekParcaSatislar = () => {},
  dealers = [], kdvRates, calisanlar = [],
  serverPermissions = null, aktifKullanici = null,
  defaultSubTab = "makina",
  yedekOdakId = null, onYedekOdakConsumed = null,
  geoData = null, loadingGeo = false,
}) => {
  // Spec 0133 R10/3, Karar 32: satış fiyatının bağlamı ekranda bir kez kurulur, formlara yalnız bağlam iner.
  const fiyatBaglami = useMemo(() => fiyatBaglamiKur({ parts, malzemeler, fiyatAyarlari: appSettings?.fiyatAyarlari }), [parts, malzemeler, appSettings?.fiyatAyarlari]);
  const [subTab, setSubTab] = useState(defaultSubTab || "makina");
  // Bayi detayından "Yedek Parça Satışına git" — ilgili sekmeyi aç (zaten stok'a mount olurken açılır,
  // ama stok zaten açıksa bu effect sekmeyi değiştirir).
  useEffect(() => { if (yedekOdakId != null) setSubTab("yedeksatis"); }, [yedekOdakId]);

  // Spec 0100 R18, R22, plan P8: parti üretim panosu Makina Stoğu'nun arkasında, yalnız gider yetkisiyle (parti verisi).
  const TABS = [
    ["makina", "Makina Stoğu"],
    ...(giderYetki ? [["pano", PANO_SEKME_ADI]] : []),
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
          canDoStock={canDoStock} serverPermissions={serverPermissions} aktifKullanici={aktifKullanici} copMusteriler={copMusteriler} uretimPartileri={uretimPartileri} giderYetki={giderYetki} />
      )}
      {subTab === "pano" && giderYetki && (
        <PartiUretimPanosu stock={stock} customers={customers} uretimPartileri={uretimPartileri} />
      )}
      {subTab === "parca" && (
        <PartStokTab fiyatBaglami={fiyatBaglami} parts={parts} rawParts={rawParts} partStock={partStock} setPartStock={setPartStock}
          partStockLog={partStockLog} setPartStockLog={setPartStockLog} showToast={showToast}
          appSettings={appSettings} setAppSettings={setAppSettings}
          canDoStock={canDoStock} serverPermissions={serverPermissions} aktifKullanici={aktifKullanici} giderYetki={giderYetki}
          siparisVeri={{ parts, hamParts: rawParts, partStock, malzemeler, tedarikciler, hamTedarikciler: rawTedarikciler, standardModels, customModels, uretimPartileri, appSettings, factory }} />
      )}
      {subTab === "yedeksatis" && (
        <YedekParcaSatisTab fiyatBaglami={fiyatBaglami}
          yedekParcaSatislar={yedekParcaSatislar} setYedekParcaSatislar={setYedekParcaSatislar}
          dealers={dealers} parts={parts} customers={customers} calisanlar={calisanlar} factory={factory}
          partStock={partStock} setPartStock={setPartStock} partStockLog={partStockLog} setPartStockLog={setPartStockLog}
          kdvRates={kdvRates} showToast={showToast} canDoStock={canDoStock} serverPermissions={serverPermissions}
          krediKartiKomisyonlari={appSettings?.krediKartiKomisyonlari}
          geoData={geoData} loadingGeo={loadingGeo}
          odakId={yedekOdakId} onOdakConsumed={onYedekOdakConsumed}
          kasaHesaplari={kasaHesaplari} tahsilatHesapVarsayilan={tahsilatHesapVarsayilan} aktifKullanici={aktifKullanici} />
      )}
      {subTab === "uretim" && (
        <UretimFormu
          uretimFormlari={uretimFormlari} setUretimFormlari={setUretimFormlari} services={services}
          customers={customers} setCustomers={setCustomers}
          kalipDefs={kalipDefs}
          partSales={partSales} setPartSales={setPartSales}
          showToast={showToast} appSettings={appSettings} factory={factory}
          canDoStock={canDoStock} serverPermissions={serverPermissions} aktifKullanici={aktifKullanici} />
      )}
    </div>
  );
};
