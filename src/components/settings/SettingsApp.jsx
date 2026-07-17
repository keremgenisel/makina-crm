import { useState, useEffect } from "react";
import { Icon, Btn, Modal } from "../ui";
import { Section } from "./Section";
import { applyTheme, getSavedTheme } from "../../lib/theme";

// Güncelleme durumu (appUpd) ve işlemleri (onCheckUpdate/onStartUpdate) App.jsx'te TEK
// noktadan yönetilir ve buraya prop olarak gelir — bu panel yalnızca onu gösterir. Böylece
// güncelleme olayları bu sekme açık olmasa da yakalanır (üst şerit App'te) ve preload'ın
// removeAllListeners deseninin yol açtığı "tek dinleyici" çakışması yaşanmaz.
export const SettingsApp = ({ version, flash, appUpd = null, onCheckUpdate = null, onStartUpdate = null }) => {
  // ── Açılışta otomatik başlat ──
  const [openAtLogin, setOpenAtLoginState] = useState(null); // null=yükleniyor
  const [openAtLoginDevMode, setOpenAtLoginDevMode] = useState(false);
  useEffect(() => {
    window.appControl?.getOpenAtLogin?.().then(r => {
      setOpenAtLoginState(!!r?.openAtLogin);
      setOpenAtLoginDevMode(!!r?.devMode);
    }).catch(() => setOpenAtLoginState(false));
  }, []);
  const toggleOpenAtLogin = async (val) => {
    setOpenAtLoginState(val);
    await window.appControl?.setOpenAtLogin?.(val);
    flash(val ? "ok" : "ok", val ? "Uygulama Windows başlangıcına eklendi." : "Uygulama Windows başlangıcından kaldırıldı.");
  };

  // Güncelleme durumu App'ten prop olarak gelir; App yoksa (eski çağrı/koruma) güvenli varsayılan.
  const upd = appUpd || { state: window.appUpdater ? "idle" : "devmode", latest: null, progress: 0, error: null };
  const [askInstall, setAskInstall] = useState(false); // "yüklensin mi?" onay penceresi

  const checkAppUpdate = async () => {
    if (!onCheckUpdate) return;
    await onCheckUpdate();
  };
  const startUpdate = () => { setAskInstall(false); onStartUpdate?.(); };

  // Tema (aydınlık/karanlık) — bu bilgisayara özel, anında uygulanır (CSS değişkenleri).
  const [theme, setTheme] = useState(getSavedTheme());

  return (
    <>
      {/* ── Uygulama Güncellemesi ── */}
      <Section title="Uygulama Güncellemesi" icon="refresh">
        <div className="section-desc">
          Kurulu sürüm: <b style={{ color: "var(--n900, #0f172a)" }}>v{version}</b>. Yeni bir sürüm yayınlandığında buradan
          tek tıkla indirip kurabilirsiniz. Verileriniz korunur.
        </div>

        {upd.state === "idle" && (
          <Btn onClick={checkAppUpdate}><Icon name="refresh" size={15} /> Yeni Sürüm Denetle</Btn>
        )}
        {upd.state === "checking" && (
          <div style={{ fontSize: 13, color: "var(--n500, #64748b)", fontWeight: 600 }}>Denetleniyor...</div>
        )}
        {upd.state === "uptodate" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--grn800, #065f46)", background: "var(--grnBg3, #d1fae5)", padding: "6px 14px", borderRadius: 10 }}>✓ Uygulama güncel</span>
            <Btn small variant="ghost" onClick={checkAppUpdate}><Icon name="refresh" size={12} /> Tekrar Denetle</Btn>
          </div>
        )}
        {upd.state === "available" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--amb800, #92400e)", background: "var(--ambBg2, #fef3c7)", padding: "6px 14px", borderRadius: 10 }}>
              Yeni sürüm hazır: v{upd.latest}
            </span>
            <Btn onClick={() => setAskInstall(true)}><Icon name="download" size={15} /> Yükle</Btn>
          </div>
        )}
        {upd.state === "downloading" && (
          <div style={{ maxWidth: 420 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--n600, #475569)", marginBottom: 8 }}>İndiriliyor... %{upd.progress}</div>
            <div style={{ height: 8, background: "var(--n150, #f1f5f9)", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ height: 8, width: `${upd.progress}%`, background: "#e85d1a", borderRadius: 6, transition: "width .3s" }} />
            </div>
          </div>
        )}
        {upd.state === "downloaded" && (
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--grn800, #065f46)", background: "var(--grnBg3, #d1fae5)", padding: "6px 14px", borderRadius: 10 }}>
            ✓ İndirildi — uygulama yeniden başlatılıyor...
          </span>
        )}
        {upd.state === "error" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--red800, #991b1b)", background: "var(--redBg2, #fee2e2)", padding: "6px 14px", borderRadius: 10 }}>
              Denetlenemedi: {upd.error}
            </span>
            <Btn small variant="ghost" onClick={checkAppUpdate}><Icon name="refresh" size={12} /> Tekrar Dene</Btn>
          </div>
        )}
        {upd.state === "devmode" && (
          <div style={{ fontSize: 13, color: "var(--n500, #64748b)", background: "var(--n100, #f8fafc)", padding: "10px 14px", borderRadius: 10, border: "1px dashed var(--n200, #e2e8f0)" }}>
            Bu özellik yalnızca kurulu (Setup ile yüklenmiş) uygulamada çalışır — geliştirme modunda ve tarayıcıda devre dışıdır.
          </div>
        )}
      </Section>

      {/* Güncelleme onayı */}
      {askInstall && (
        <Modal title="Güncelleme Bulundu" onClose={() => setAskInstall(false)}>
          <div style={{ fontSize: 14, color: "var(--n600, #475569)", lineHeight: 1.7, marginBottom: 8 }}>
            Yeni sürüm <b>v{upd.latest}</b> yayınlandı (kurulu: v{version}).
          </div>
          <div style={{ fontSize: 13, color: "var(--n500, #64748b)", lineHeight: 1.6, marginBottom: 20 }}>
            Şimdi yüklensin mi? Güncelleme indirildikten sonra uygulama <b>otomatik olarak yeniden başlatılacak</b>.
            Verileriniz korunur.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setAskInstall(false)}>Daha Sonra</Btn>
            <Btn onClick={startUpdate}><Icon name="download" size={14} /> Evet, Yükle</Btn>
          </div>
        </Modal>
      )}

      {/* ── Sistem: Otomatik Başlat ── */}
      <Section title="Sistem" icon="settings">
        <div className="section-desc">
          Bu bilgisayar açıldığında Altunmak CRM otomatik olarak arka planda başlar ve görev
          çubuğu simge tepsisinde (sistem saati yanında) bekler. Sunucu olarak kullanılan
          bilgisayarlarda açık bırakılması önerilir.
        </div>
        {openAtLoginDevMode ? (
          <div style={{ fontSize: 13, color: "var(--n500, #64748b)", background: "var(--n100, #f8fafc)", padding: "10px 14px", borderRadius: 10, border: "1px dashed var(--n200, #e2e8f0)" }}>
            Bu özellik yalnızca kurulu uygulamada çalışır.
          </div>
        ) : (
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: openAtLogin === null ? "default" : "pointer" }}>
            <input type="checkbox"
              checked={!!openAtLogin}
              disabled={openAtLogin === null}
              onChange={e => toggleOpenAtLogin(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "#e85d1a", cursor: "pointer" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--n900, #0f172a)" }}>
              Bilgisayar açılışında otomatik başlat
            </span>
            {openAtLogin && (
              <span style={{ fontSize: 11, fontWeight: 700, background: "var(--grnBg2, #dcfce7)", color: "var(--grn600, #16a34a)", borderRadius: 6, padding: "2px 8px" }}>Aktif</span>
            )}
          </label>
        )}
        {openAtLogin && !openAtLoginDevMode && (
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--n500, #64748b)", background: "var(--grnBg, #f0fdf4)", border: "1px solid var(--grnBr, #bbf7d0)", borderRadius: 8, padding: "8px 12px" }}>
            Uygulama başladığında pencere gizli açılır — görev çubuğundaki simge tepsisine çift tıklayarak açabilirsiniz.
          </div>
        )}
      </Section>

      {/* ── Görünüm / Tema ── */}
      <Section title="Görünüm" icon="settings">
        <div style={{ fontSize: 13, color: "var(--n500, #64748b)", marginBottom: 14, lineHeight: 1.6 }}>
          Uygulama temasını seçin. Karanlık tema loş ortamda göz yormaz; bu ayar yalnızca bu bilgisayara özeldir.
        </div>
        <div style={{ display: "inline-flex", background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, padding: 3, gap: 3 }}>
          {[["light", "☀️ Aydınlık"], ["dark", "🌙 Karanlık"]].map(([m, l]) => (
            <button key={m} onClick={() => { applyTheme(m); setTheme(m); }} style={{
              padding: "7px 16px", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer", border: "none",
              background: theme === m ? "var(--surface, #ffffff)" : "transparent",
              color: theme === m ? "var(--n900, #0f172a)" : "var(--n500, #64748b)",
              boxShadow: theme === m ? "0 1px 3px rgba(0,0,0,.14)" : "none",
            }}>{l}</button>
          ))}
        </div>
      </Section>

      <HaritaKaynaklari />
    </>
  );
};

/* Harita veri kaynakları — kapalı gelir, tıklayınca açılır.
   Yasal zorunluluk: üç kaynak da atıf istiyor, geoBoundaries ayrıca türetilmiş verinin aynı
   lisansla (ODbL) sunulmasını şart koşuyor. Yani bu bölüm kozmetik değil, uyumun parçası. */
const HARITA_KAYNAKLARI = [
  ["Natural Earth", "Ülke sınırları ve ülke içi bölgeler", "Kamu malı (public domain)"],
  ["GeoNames", "Şehir konumları", "CC BY 4.0 — atıf gerekir"],
  ["geoBoundaries", "Türkiye il ve ilçe sınırları", "ODbL 1.0 — atıf gerekir; bu veriden türetilmiş sınır verisi talep edilirse aynı lisansla verilir"],
];

const HaritaKaynaklari = () => {
  const [acik, setAcik] = useState(false);
  return (
    <div style={{ background: "var(--surface, #ffffff)", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.08)", overflow: "hidden", marginTop: 16 }}>
      <button type="button" onClick={() => setAcik(a => !a)} aria-expanded={acik} style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "16px 22px",
        background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
      }}>
        <span style={{ display: "flex", color: "var(--n500, #64748b)" }}><Icon name="globe" size={16} /></span>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "var(--n900, #0f172a)" }}>Harita Veri Kaynakları</span>
        <span style={{ fontSize: 11, color: "var(--n400, #94a3b8)" }}>{acik ? "▾" : "▸"}</span>
      </button>
      {acik && (
        <div style={{ padding: "0 22px 18px" }}>
          <div className="section-desc">
            Harita sekmesindeki ülke, bölge ve ilçe sınırları aşağıdaki açık veri kaynaklarından
            üretilip uygulamanın içine gömülmüştür. Harita çalışırken internet kullanmaz.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {HARITA_KAYNAKLARI.map(([ad, ne, lisans]) => (
              <div key={ad} style={{
                display: "flex", gap: 12, alignItems: "baseline", padding: "10px 12px",
                background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--n900, #0f172a)", minWidth: 108 }}>{ad}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "var(--n600, #475569)" }}>{ne}</div>
                  <div style={{ fontSize: 11.5, color: "var(--n400, #94a3b8)", marginTop: 2 }}>{lisans}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
