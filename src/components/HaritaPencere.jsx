// Ayrı harita penceresinin ince sarmalayıcısı: IPC köprüsüne (window.haritaBridge) abone
// olur, gelen veriyi tutup salt-okunur <Harita/>'ya geçirir, temayı canlı uygular.
// Ayrı dosya olması jsdom'da köprüyü mock'layarak test edilebilmesi içindir.
import { useEffect, useState } from "react";
import { Harita } from "./Harita.jsx";
import { applyTheme } from "../lib/theme.js";

export function HaritaPencere() {
  const [veri, setVeri] = useState({ customers: [], dealers: [], factory: null });

  useEffect(() => {
    let iptal = false;
    const uygula = (v) => {
      if (!v || iptal) return;
      if (v.tema) applyTheme(v.tema);
      setVeri({
        customers: v.customers || [],
        dealers: v.dealers || [],
        factory: v.factory || null,
      });
    };
    // (1) Mount'ta önbellekten çek (yarışsız). (2) Sonraki canlı güncellemeleri dinle.
    window.haritaBridge?.ilkVeriAl?.().then(uygula).catch(() => {});
    const cikar = window.haritaBridge?.onVeri?.(uygula);
    return () => { iptal = true; cikar?.(); };
  }, []);

  // Ayrı pencerede harita içeriğe dört yandan boşluk verir (ana uygulamadaki sekme
  // içeriğinin padding:28'i burada yok; harita pencere kenarına dayanıyordu).
  return (
    <div style={{ padding: 28, minHeight: "100vh", boxSizing: "border-box" }}>
      <Harita customers={veri.customers} dealers={veri.dealers} factory={veri.factory} />
    </div>
  );
}
