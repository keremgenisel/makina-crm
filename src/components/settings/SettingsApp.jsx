import { useState, useEffect } from "react";
import { Icon, Btn, Modal } from "../ui";
import { Section } from "./Section";

export const SettingsApp = ({ version, flash }) => {
  // ── Uygulama güncellemesi (electron-updater) ──
  // idle | checking | uptodate | available | downloading | downloaded | error | devmode
  const [appUpd, setAppUpd] = useState({ state: "idle", latest: null, progress: 0, error: null });

  useEffect(() => {
    if (!window.appUpdater) return;
    const offA = window.appUpdater.onAvailable((v) => setAppUpd(p => ({ ...p, state: "available", latest: v })));
    const offP = window.appUpdater.onProgress((pct) => setAppUpd(p => ({ ...p, state: "downloading", progress: pct })));
    const offD = window.appUpdater.onDownloaded(() => setAppUpd(p => ({ ...p, state: "downloaded" })));
    const offE = window.appUpdater.onError((m) => setAppUpd(p => ({ ...p, state: "error", error: m })));
    return () => {
      if (typeof offA === "function") offA();
      if (typeof offP === "function") offP();
      if (typeof offD === "function") offD();
      if (typeof offE === "function") offE();
    };
  }, []);

  const [askInstall, setAskInstall] = useState(false); // "yüklensin mi?" onay penceresi
  const [confirmUninstall, setConfirmUninstall] = useState(false);

  const checkAppUpdate = async () => {
    if (!window.appUpdater) { setAppUpd({ state: "devmode", latest: null, progress: 0, error: null }); return; }
    setAppUpd({ state: "checking", latest: null, progress: 0, error: null });
    const res = await window.appUpdater.check();
    if (res?.error === "dev-mode") setAppUpd(p => ({ ...p, state: "devmode" }));
    else if (res?.error) setAppUpd(p => ({ ...p, state: "error", error: res.error }));
    else if (res?.available) {
      setAppUpd(p => ({ ...p, state: "available", latest: res.latest }));
      setAskInstall(true); // güncelleme bulundu → kullanıcıya sor
    }
    else setAppUpd(p => ({ ...p, state: "uptodate" }));
  };

  const startUpdate = async () => {
    setAskInstall(false);
    setAppUpd(p => ({ ...p, state: "downloading", progress: 0 }));
    await window.appUpdater.download();
    // indirme bitince onDownloaded tetiklenir → otomatik kurulum + yeniden başlatma
  };

  // İndirme tamamlanınca OTOMATİK kur ve yeniden başlat
  useEffect(() => {
    if (appUpd.state === "downloaded" && window.appUpdater) {
      const t = setTimeout(() => window.appUpdater.install(), 1500);
      return () => clearTimeout(t);
    }
  }, [appUpd.state]);

  const doUninstall = async () => {
    setConfirmUninstall(false);
    if (window.appControl?.uninstall) {
      const ok = await window.appControl.uninstall();
      if (!ok) flash("err", "Kaldırma aracı bulunamadı. Denetim Masası'ndaki Programlar bölümünden kaldırabilirsiniz.");
    } else {
      flash("err", "Bu özellik yalnızca kurulu uygulamada çalışır.");
    }
  };

  return (
    <>
      {/* ── Uygulama Güncellemesi ── */}
      <Section title="Uygulama Güncellemesi" icon="refresh">
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
          Kurulu sürüm: <b style={{ color: "#0f172a" }}>v{version}</b>. Yeni bir sürüm yayınlandığında buradan
          tek tıkla indirip kurabilirsiniz. Verileriniz korunur.
        </div>

        {appUpd.state === "idle" && (
          <Btn onClick={checkAppUpdate}><Icon name="refresh" size={15} /> Yeni Sürüm Denetle</Btn>
        )}
        {appUpd.state === "checking" && (
          <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Denetleniyor...</div>
        )}
        {appUpd.state === "uptodate" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#065f46", background: "#d1fae5", padding: "6px 14px", borderRadius: 10 }}>✓ Uygulama güncel</span>
            <Btn small variant="ghost" onClick={checkAppUpdate}><Icon name="refresh" size={12} /> Tekrar Denetle</Btn>
          </div>
        )}
        {appUpd.state === "available" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e", background: "#fef3c7", padding: "6px 14px", borderRadius: 10 }}>
              Yeni sürüm hazır: v{appUpd.latest}
            </span>
            <Btn onClick={() => setAskInstall(true)}><Icon name="download" size={15} /> Yükle</Btn>
          </div>
        )}
        {appUpd.state === "downloading" && (
          <div style={{ maxWidth: 420 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>İndiriliyor... %{appUpd.progress}</div>
            <div style={{ height: 8, background: "#f1f5f9", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ height: 8, width: `${appUpd.progress}%`, background: "#e85d1a", borderRadius: 6, transition: "width .3s" }} />
            </div>
          </div>
        )}
        {appUpd.state === "downloaded" && (
          <span style={{ fontSize: 13, fontWeight: 700, color: "#065f46", background: "#d1fae5", padding: "6px 14px", borderRadius: 10 }}>
            ✓ İndirildi — uygulama yeniden başlatılıyor...
          </span>
        )}
        {appUpd.state === "error" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#991b1b", background: "#fee2e2", padding: "6px 14px", borderRadius: 10 }}>
              Denetlenemedi: {appUpd.error}
            </span>
            <Btn small variant="ghost" onClick={checkAppUpdate}><Icon name="refresh" size={12} /> Tekrar Dene</Btn>
          </div>
        )}
        {appUpd.state === "devmode" && (
          <div style={{ fontSize: 13, color: "#64748b", background: "#f8fafc", padding: "10px 14px", borderRadius: 10, border: "1px dashed #e2e8f0" }}>
            Bu özellik yalnızca kurulu (Setup ile yüklenmiş) uygulamada çalışır — geliştirme modunda ve tarayıcıda devre dışıdır.
          </div>
        )}
      </Section>

      {/* ── Uygulamayı Kaldır ── */}
      {/* ── Tehlikeli Bölge ── */}
      <div style={{ marginTop: 28, border: "1.5px solid #fecaca", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ background: "#fef2f2", padding: "12px 18px", borderBottom: "1px solid #fecaca", display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="trash" size={16} />
          <span style={{ fontSize: 14, fontWeight: 800, color: "#b91c1c" }}>DİKKAT</span>
        </div>
        <div style={{ padding: "18px 20px" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 4 }}>Uygulamayı Kaldır</div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
            Uygulamayı bilgisayarınızdan kaldırır. <b>Müşteri ve servis verileriniz silinmez.</b> Uygulamayı
            tekrar kurarsanız kayıtlarınız geri gelir. Kaldırmadan önce yedek almanız önerilir.
          </div>
          <Btn variant="danger" onClick={() => setConfirmUninstall(true)}><Icon name="trash" size={15} /> Uygulamayı Kaldır</Btn>
        </div>
      </div>

      {/* Güncelleme onayı */}
      {askInstall && (
        <Modal title="Güncelleme Bulundu" onClose={() => setAskInstall(false)}>
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 8 }}>
            Yeni sürüm <b>v{appUpd.latest}</b> yayınlandı (kurulu: v{version}).
          </div>
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 20 }}>
            Şimdi yüklensin mi? Güncelleme indirildikten sonra uygulama <b>otomatik olarak yeniden başlatılacak</b>.
            Verileriniz korunur.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setAskInstall(false)}>Daha Sonra</Btn>
            <Btn onClick={startUpdate}><Icon name="download" size={14} /> Evet, Yükle</Btn>
          </div>
        </Modal>
      )}

      {/* Kaldırma onayı */}
      {confirmUninstall && (
        <Modal title="Uygulamayı Kaldır" onClose={() => setConfirmUninstall(false)}>
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 8 }}>
            Altunmak CRM bilgisayarınızdan kaldırılacak ve uygulama kapanacak.
          </div>
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 20 }}>
            Verileriniz silinmez; tekrar kurulumda geri gelir. Devam etmeden önce
            yukarıdan <b>yedek almanız</b> önerilir.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setConfirmUninstall(false)}>Vazgeç</Btn>
            <Btn variant="danger" onClick={doUninstall}><Icon name="trash" size={14} /> Evet, Kaldır</Btn>
          </div>
        </Modal>
      )}
    </>
  );
};
