// Makina Maliyeti yerleşim testi sayfası (kullanıcı isteği 2026-10-18): Parti Hesabı'nda "Üretim partisi" seçicisi ile
// "Planlanan adetler" düğmesi, Hesap Ayarları'nda üç alan (dönem başlangıcı, dönem bitişi, varsayılan adet) aynı hizada.
// Görünüm adres satırından (?gorunum=parti | ayarlar). Kabuk genişlikleri calisan.jsx ile aynı (kenar 236 px, dolgu 28 px);
// içinde GERÇEK MakinaMaliyeti 0088'in ortak verisiyle çizilir.
import { createRoot } from "react-dom/client";
import { useState } from "react";
import "../../../src/ui.css";
import { MakinaMaliyeti } from "../../../src/components/MakinaMaliyeti";
import * as M88 from "../../../tests/fixtures/0088-veri.js";

const gorunum = new URLSearchParams(location.search).get("gorunum") || "parti";
function Sayfa() {
  const [giderTurleri, setGiderTurleri] = useState(M88.TURLER);
  const [appSettings, setAppSettings] = useState({ giderAyarlari: { yururlukAy: "2026-01" }, maliyetAyarlari: M88.AYAR });
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
