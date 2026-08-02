// Ayrı Servis ve Kargo Panosu penceresinin ince sarmalayıcısı. Harita penceresinden farkı:
// TAM ETKİLEŞİMLİ. Veri ana pencereden IPC ile (window.servisBridge) gelir; panonun yaptığı her
// yazma (setServices/setYedekParcaSatislar/...) ana pencereye "mutate" olarak geri gönderilir.
// Kaydı/DB'yi yalnız ana pencere yönetir (iki pencere aynı blob'u yazmasın diye — App burada mount
// EDİLMEZ). Ayrı dosya olması jsdom'da köprüyü mock'layarak test edilebilmesi içindir.
import { useEffect, useRef, useState } from "react";
import { ServisPanosu } from "./ServisPanosu.jsx";
import { applyTheme } from "../lib/theme.js";
import { withoutDeleted } from "../lib/utils.js";

// Panonun ana pencereye geri yazdığı (mutate) diziler. Bu key'ler App'teki setter'larla birebir
// eşleşir; ana pencere gelen değeri doğrudan ilgili state'e uygular. Her biri snapshot'ta gelir ki
// güncelleyici (p => ...) DOĞRU tabana uygulansın — partStockLog panoda gösterilmese de taban
// olarak lazımdır (yoksa append yalnız yeni kaydı gönderip eskiyi ezerdi).
const YAZILABILIR = ["services", "yedekParcaSatislar", "partSales", "partStock", "partStockLog", "dosyalar"];

const BOS = {
  services: [], customers: [], calisanlar: [], parts: [], dealers: [], factory: null,
  appSettings: null, geoData: null, loadingGeo: false, partStock: [], partStockLog: [],
  dosyalar: [], yedekParcaSatislar: [], partSales: [], serverPermissions: null,
  aktifKullanici: "", kargoYetki: false, kalipYetki: false, dosyaCevrimdisi: false,
};

export function ServisPencere() {
  const [snap, setSnap] = useState(BOS);
  // İlk gerçek veri gelene kadar ServisPanosu'yu MOUNT ETME: pano ilk mount'ta mevcut servis/kargo
  // id'lerini "taban çizgisi" olarak alır (backlog ötmesin). Boş veriyle mount edersek taban boş
  // kalır, sonra veri gelince tüm mevcut kayıtlar "yeni" sanılıp alarm öter. Bu yüzden veri hazır
  // olunca mount edip tabanı gerçek kayıtlarla kurdururuz.
  const [hazir, setHazir] = useState(false);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);

  useEffect(() => {
    let iptal = false;
    const uygula = (v) => {
      if (!v || iptal) return;
      if (v.tema) applyTheme(v.tema);
      setSnap(p => ({ ...BOS, ...p, ...v })); // gelen görüntü tümünü tazeler (ana pencere kaynaktır)
      setHazir(true); // ilk gerçek görüntü geldi → panoyu artık mount edebiliriz
    };
    // (1) Mount'ta önbellekten çek (yarışsız). (2) Sonraki canlı güncellemeleri dinle.
    window.servisBridge?.ilkVeriAl?.().then(uygula).catch(() => {});
    const cikar = window.servisBridge?.onVeri?.(uygula);
    return () => { iptal = true; cikar?.(); };
  }, []);

  const showToast = (text, type) => {
    setToast({ text, type });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3000);
  };

  // Yazma köprüsü: güncelleyiciyi YEREL tabana uygula (iyimser), sonucu ana pencereye gönder.
  const setter = (key) => (updater) => setSnap(prev => {
    const taban = prev[key] || [];
    const next = typeof updater === "function" ? updater(taban) : updater;
    window.servisBridge?.mutate?.(key, next);
    return { ...prev, [key]: next };
  });
  const setters = useRef(null);
  if (!setters.current) setters.current = Object.fromEntries(YAZILABILIR.map(k => [k, setter(k)]));
  const s = setters.current;

  return (
    <div style={{ height: "100vh", boxSizing: "border-box", padding: "14px 18px 0", overflow: "hidden", position: "relative" }}>
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 99999,
          background: toast.type === "err" ? "var(--red600, #dc2626)" : "var(--grn600, #16a34a)", color: "#fff",
          padding: "13px 26px", borderRadius: 10, fontSize: 14, fontWeight: 700, boxShadow: "0 6px 24px rgba(0,0,0,.22)" }}>
          {toast.text}
        </div>
      )}
      {!hazir ? (
        <div style={{ height: "100%", display: "grid", placeItems: "center", color: "var(--n400, #94a3b8)", fontSize: 14 }}>
          Yükleniyor…
        </div>
      ) : (
        <ServisPanosu
          services={withoutDeleted(snap.services)} setServices={s.services}
          customers={snap.customers} calisanlar={snap.calisanlar} parts={snap.parts} dealers={snap.dealers}
          factory={snap.factory} kdvRates={snap.appSettings?.kdvRates} geoData={snap.geoData} loadingGeo={snap.loadingGeo}
          setPartStock={s.partStock} setPartStockLog={s.partStockLog} partStock={snap.partStock}
          dosyalar={snap.dosyalar} setDosyalar={s.dosyalar} dosyaCevrimdisi={snap.dosyaCevrimdisi}
          yedekParcaSatislar={withoutDeleted(snap.yedekParcaSatislar)} setYedekParcaSatislar={s.yedekParcaSatislar} kargoYetki={snap.kargoYetki}
          partSales={withoutDeleted(snap.partSales)} setPartSales={s.partSales} kalipYetki={snap.kalipYetki}
          appSettings={snap.appSettings} showToast={showToast} serverPermissions={snap.serverPermissions}
          aktifKullanici={snap.aktifKullanici} />
      )}
    </div>
  );
}
