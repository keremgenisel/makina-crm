import { useState, useEffect } from "react";
import { Btn } from "../ui";
import { Section } from "./Section";
import { MUSTERI_SUTUN_VARSAYILAN } from "../../lib/constants";

// Ayarlar > Uygulama > Müşteri Görünümü — Müşteriler listesindeki fiyat sütunlarını aç/kapa.
// appSettings.musteriSutunlari'da saklanır (server izin sistemine bağlı DEĞİL, salt görünüm tercihi).
// Sütunlar Excel'den girilen fiyatları listede aynı hizada görüp yanlış girişleri yakalamak için.

const ALANLAR = [
  { key: "faturaBedeli", ad: "Fatura Bedeli", aciklama: "Faturalı satışlarda fatura tutarı" },
  { key: "fabrikaSatis", ad: "Fabrika Satış Bedeli", aciklama: "KDV hariç fabrika çıkış bedeli" },
  { key: "komisyon", ad: "Komisyon", aciklama: "Bayi / aracı komisyonu" },
  { key: "extraKalip", ad: "Extra Kalıp Fiyatı", aciklama: "Bu makinaya satılan Extra Kalıpların toplamı" },
];

export const SettingsMusteri = ({ appSettings, setAppSettings, flash }) => {
  const [sut, setSut] = useState({ ...MUSTERI_SUTUN_VARSAYILAN });

  useEffect(() => {
    const v = appSettings?.musteriSutunlari;
    setSut({ ...MUSTERI_SUTUN_VARSAYILAN, ...(v || {}) });
  }, [appSettings?.musteriSutunlari]);

  const cevir = (key) => setSut(p => ({ ...p, [key]: !p[key] }));

  const save = () => {
    // Yalnız bilinen anahtarları sakla (varsayılan üzerine bindirilir).
    const temiz = {};
    for (const { key } of ALANLAR) temiz[key] = sut[key] === true;
    setAppSettings?.(p => ({ ...p, musteriSutunlari: temiz }));
    flash?.("ok", "Müşteri liste sütunları kaydedildi.");
  };

  return (
    <Section title="Müşteri Liste Sütunları" icon="customers">
      <div className="section-desc">
        Müşteriler listesinde her makina satırında gösterilecek fiyat sütunlarını seçin. Excel'den girilen
        fiyatları uygulamada aynı hizada görüp yanlış girişleri kolayca yakalamak için kullanılır. Yalnızca
        Müşteriler sekmesini etkiler (Bayileri değil).
      </div>

      <div style={{ maxWidth: 520, border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, overflow: "hidden", marginBottom: 18 }}>
        {ALANLAR.map(({ key, ad, aciklama }, i) => (
          <label key={key} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", cursor: "pointer",
            borderTop: i === 0 ? "none" : "1px solid var(--n150, #f1f5f9)",
          }}>
            <input type="checkbox" checked={sut[key] === true} onChange={() => cevir(key)} style={{ margin: 0, width: 17, height: 17, accentColor: "var(--brand, #e85d1a)", flex: "0 0 auto" }} />
            <span style={{ flex: 1 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--n900, #0f172a)" }}>{ad}</span>
              <span style={{ display: "block", fontSize: 11, color: "var(--n400, #94a3b8)", marginTop: 1 }}>{aciklama}</span>
            </span>
          </label>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Btn onClick={save}>Kaydet</Btn>
        <span style={{ fontSize: 11, color: "var(--n400, #94a3b8)" }}>Varsayılan: tüm sütunlar kapalı.</span>
      </div>
    </Section>
  );
};
