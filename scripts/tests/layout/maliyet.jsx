// Makina Maliyeti yerleşim testi sayfası (kullanıcı isteği 2026-10-18): Parti Hesabı'nda "Üretim partisi" seçicisi ile
// "Planlanan adetler" düğmesi, Hesap Ayarları'nda üç alan (dönem başlangıcı, dönem bitişi, varsayılan adet) aynı hizada.
// Görünüm adres satırından (?gorunum=parti | ayarlar). Kabuk genişlikleri calisan.jsx ile aynı (kenar 236 px, dolgu 28 px);
// içinde GERÇEK MakinaMaliyeti 0088'in ortak verisiyle çizilir.
import { createRoot } from "react-dom/client";
import { useState } from "react";
import "../../../src/ui.css";
import { MakinaMaliyeti } from "../../../src/components/MakinaMaliyeti";
import * as M88 from "../../../tests/fixtures/0088-veri.js";
import * as F34 from "../../../tests/fixtures/0134-veri.js";

const gorunum = new URLSearchParams(location.search).get("gorunum") || "parti";
function Sayfa() {
  const [giderTurleri, setGiderTurleri] = useState(M88.TURLER);
  const [appSettings, setAppSettings] = useState({ giderAyarlari: { yururlukAy: "2026-01" }, maliyetAyarlari: M88.AYAR });
  // Spec 0134 AC-89: Sipariş İhtiyacı görünümü 0134 verisiyle (parça stoğu, tedarikçi listesi, malzeme, planlı parti).
  if (gorunum === "siparis") return <MakinaMaliyeti aktifKullanici="kerem" giderler={[]} giderTurleri={[]} tedarikciler={F34.TED} stock={[]} customers={[]}
    partStockLog={[]} parts={F34.veri().parts} malzemeler={[F34.P304]} standardModels={[F34.AK100]} customModels={[]} uretimPartileri={[{ id: 9, ad: "Güz Partisi", baslangicAy: "2026-09", bitisAy: null, planlananAdetler: { AK100_DS: 70 } }]}
    partStock={[{ id: 1, partId: 42, miktar: 100 }]} rawTedarikciler={F34.TED} appSettings={appSettings} setAppSettings={setAppSettings} rates={{ usd: 41 }}
    serverPermissions={null} showToast={() => {}} baslangicGorunum="siparis" />;
  return <MakinaMaliyeti aktifKullanici="kerem" giderler={M88.GIDERLER} giderTurleri={giderTurleri} setGiderTurleri={setGiderTurleri} tedarikciler={[]}
    stock={M88.STOCK} customers={M88.CUSTOMERS} partStockLog={[]} parts={M88.PARCALAR} standardModels={M88.MODELLER} customModels={[]}
    setStandardModels={() => {}} setCustomModels={() => {}} uretimPartileri={M88.PARTILER} setUretimPartileri={() => {}}
    appSettings={appSettings} setAppSettings={setAppSettings} rates={{ usd: 41 }} tumMusteriler={M88.CUSTOMERS} serverPermissions={null}
    showToast={() => {}} baslangicGorunum={gorunum} />;
}
createRoot(document.getElementById("root")).render(
  <div style={{ display: "flex", height: "100vh" }}>
    <div style={{ width: 236, flexShrink: 0, background: "#1f0d02" }} />
    <div style={{ flex: 1, overflow: "auto", padding: 28 }}><Sayfa /></div>
  </div>
);
