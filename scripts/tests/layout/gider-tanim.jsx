// Spec 0030 R8 / AC-13 / AC-14 yerleşim testi sayfası: uygulama kabuğu genişlikleriyle kopyalanır (kenar çubuğu 236 px,
// ana alan dolgusu 28 px; App.jsx), içinde GERÇEK Settings "Tekrarlayan Giderler" açık çizilir. Kabuk sabitlerinin App.jsx
// ve Settings.jsx ile kopmadığını tests/gider-tanim-yerlesim.test.js kaynak taramasıyla denetler.
import { createRoot } from "react-dom/client";
import "../../../src/ui.css";
import { Settings } from "../../../src/components/Settings";
import { TANIM_UZUN, TANIM_TURLERI, TANIM_TEDARIKCI, TANIM_CALISAN } from "./gider-tanim-veri.js";

const bos = () => {};
const AYAR = { giderAyarlari: { yururlukAy: "2025-06", stopajOrani: 20, hatirlatmaEsikGun: 7 } };
createRoot(document.getElementById("root")).render(
  <div style={{ display: "flex", height: "100vh" }}>
    <div data-kabuk="kenar" style={{ width: 236, flexShrink: 0, background: "#1f0d02" }} />
    <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
      <Settings initialTab="gidertanim" onInitialTabConsumed={bos} customers={[]} services={[]} dealers={[]} stock={[]} setStock={bos} setCustomers={bos}
        setServices={bos} setDealers={bos} version="3.39.0" appSettings={AYAR} setAppSettings={bos} customModels={[]} setCustomModels={bos}
        standardModels={[{ model: "AK120_DSC" }, { model: "AK100" }]} setStandardModels={bos} factory={{ name: "Altuntaş Makina" }} setFactory={bos}
        kalipDefs={[]} setKalipDefs={bos} calisanlar={TANIM_CALISAN} setCalisanlar={bos} rawCalisanlar={TANIM_CALISAN} parts={[]} setParts={bos}
        partTypeDefs={[]} setPartTypeDefs={bos} rawPartTypeDefs={[]} notes={[]} setNotes={bos} partSales={[]} setPartSales={bos} payments={[]} setPayments={bos}
        partStock={[]} setPartStock={bos} partStockLog={[]} setPartStockLog={bos} showToast={bos} rawCustomers={[]} rawServices={[]} rawDealers={[]} rawStock={[]}
        rawNotes={[]} rawParts={[]} rawPartSales={[]} rawPayments={[]} rawKalipDefs={[]} rawCustomModels={[]} rawTeklifler={[]} setTeklifler={bos} faturalar={[]}
        setFaturalar={bos} rawFaturalar={[]} rawUretimFormlari={[]} setUretimFormlari={bos} rawGorusmeler={[]} setGorusmeler={bos} rawDosyalar={[]} setDosyalar={bos}
        yedekParcaSatislar={[]} setYedekParcaSatislar={bos} rawYedekParcaSatislar={[]} serverPermissions={null} giderYetki giderVeriYetki
        giderler={[]} setGiderler={bos} rawGiderler={[]} giderTanimlari={TANIM_UZUN} setGiderTanimlari={bos} giderTurleri={TANIM_TURLERI} setGiderTurleri={bos}
        tedarikciler={TANIM_TEDARIKCI} setTedarikciler={bos} standartGiderler={[]} setStandartGiderler={bos} appUpd={{}} onCheckUpdate={bos} onStartUpdate={bos} />
    </div>
  </div>
);
