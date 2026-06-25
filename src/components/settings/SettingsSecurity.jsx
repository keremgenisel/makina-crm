import { useState, useEffect } from "react";
import { Icon, Btn, Modal, Field, PasswordInput } from "../ui";
import { Section } from "./Section";

export const SettingsSecurity = ({ flash }) => {
  // ── Uygulama Şifresi (açılış kilidi) — isteğe bağlı, sadece bir caydırıcı yerel kilit ──
  const [appLockStatus, setAppLockStatus] = useState({ enabled: false });
  const [lockModal, setLockModal] = useState(null); // null | "setup" | "disable" | "changePassword"
  const [lockForm, setLockForm] = useState({ password: "", password2: "", currentPassword: "" });
  const [lockBusy, setLockBusy] = useState(false);
  const [lockError, setLockError] = useState("");
  const [lockRecoveryCode, setLockRecoveryCode] = useState(null); // setup başarılı olunca bir defalık gösterilir

  const loadAppLockStatus = async () => {
    if (!window.appLock) return;
    setAppLockStatus(await window.appLock.status());
  };
  useEffect(() => { loadAppLockStatus(); }, []);

  const openLockModal = (mode) => { setLockForm({ password: "", password2: "", currentPassword: "" }); setLockError(""); setLockModal(mode); };
  const closeLockModal = () => { setLockModal(null); setLockError(""); };

  const submitLockSetup = async () => {
    setLockError("");
    if (lockForm.password.length < 4) { setLockError("Şifre en az 4 karakter olmalı."); return; }
    if (lockForm.password !== lockForm.password2) { setLockError("Şifreler eşleşmiyor."); return; }
    setLockBusy(true);
    try {
      const res = await window.appLock.setup(lockForm.password);
      if (res?.ok) { setLockModal(null); setLockRecoveryCode(res.recoveryCode); loadAppLockStatus(); }
      else setLockError(res?.error || "Kaydedilemedi.");
    } catch (err) {
      setLockError("Beklenmeyen hata: " + (err?.message || "uygulamayı yeniden başlatmayı deneyin."));
    } finally {
      setLockBusy(false);
    }
  };

  const submitLockDisable = async () => {
    setLockError("");
    setLockBusy(true);
    try {
      const res = await window.appLock.disable(lockForm.currentPassword);
      if (res?.ok) { closeLockModal(); loadAppLockStatus(); flash("ok", "Uygulama şifresi kapatıldı."); }
      else setLockError(res?.error || "Kapatılamadı.");
    } catch (err) {
      setLockError("Beklenmeyen hata: " + (err?.message || "uygulamayı yeniden başlatmayı deneyin."));
    } finally {
      setLockBusy(false);
    }
  };

  const submitLockChangePassword = async () => {
    setLockError("");
    if (lockForm.password.length < 4) { setLockError("Yeni şifre en az 4 karakter olmalı."); return; }
    if (lockForm.password !== lockForm.password2) { setLockError("Şifreler eşleşmiyor."); return; }
    setLockBusy(true);
    try {
      const res = await window.appLock.changePassword(lockForm.currentPassword, lockForm.password);
      if (res?.ok) { closeLockModal(); flash("ok", "Şifre değiştirildi."); }
      else setLockError(res?.error || "Değiştirilemedi.");
    } catch (err) {
      setLockError("Beklenmeyen hata: " + (err?.message || "uygulamayı yeniden başlatmayı deneyin."));
    } finally {
      setLockBusy(false);
    }
  };

  return (
    <>
      <Section title="Uygulama Şifresi" icon="lock">
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
          Açarsanız, uygulama her açılışta bir şifre soracaktır. Bu, bilgisayara erişebilen herkesin
          müşteri/finans verilerini doğrudan görmesini engellemek için basit bir yerel kilittir.
        </div>
        {!window.appLock ? (
          <div style={{ fontSize: 13, color: "#64748b", background: "#f8fafc", padding: "10px 14px", borderRadius: 10, border: "1px dashed #e2e8f0" }}>
            Bu özellik yalnızca kurulu uygulamada çalışır.
          </div>
        ) : (
          <>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: appLockStatus.enabled ? 14 : 0 }}>
              <input type="checkbox" checked={appLockStatus.enabled}
                onChange={e => e.target.checked ? openLockModal("setup") : openLockModal("disable")}
                style={{ width: 18, height: 18, accentColor: "#e85d1a", cursor: "pointer" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Açılışta şifre sorulsun</span>
            </label>
            {appLockStatus.enabled && (
              <Btn small variant="ghost" onClick={() => openLockModal("changePassword")}><Icon name="lock" size={12} /> Şifre Değiştir</Btn>
            )}
          </>
        )}
      </Section>

      {/* Uygulama şifresi: açma (kurulum) */}
      {lockModal === "setup" && (
        <Modal title="Açılışta Şifre Sorulsun" onClose={closeLockModal}>
          <Field label="Şifre">
            <PasswordInput value={lockForm.password} onChange={e => setLockForm(p => ({ ...p, password: e.target.value }))} autoFocus />
          </Field>
          <Field label="Şifre (Tekrar)">
            <PasswordInput value={lockForm.password2} onChange={e => setLockForm(p => ({ ...p, password2: e.target.value }))} />
          </Field>
          {lockError && <div style={{ fontSize: 13, fontWeight: 600, color: "#991b1b", marginBottom: 12 }}>✗ {lockError}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={closeLockModal}>Vazgeç</Btn>
            <Btn onClick={submitLockSetup} disabled={lockBusy}>{lockBusy ? "Kaydediliyor..." : "Şifreyi Aç"}</Btn>
          </div>
        </Modal>
      )}

      {/* Uygulama şifresi: kapatma (mevcut şifre istenir) */}
      {lockModal === "disable" && (
        <Modal title="Açılış Şifresini Kapat" onClose={closeLockModal}>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14, lineHeight: 1.6 }}>
            Kapatmak için mevcut şifreyi girin.
          </div>
          <div style={{ fontSize: 12.5, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", marginBottom: 16, lineHeight: 1.6 }}>
            Not: Şifreyi tekrar açtığınızda yeni bir şifre belirlemeniz gerekecek ve eskisi geçersiz olacak; eski kurtarma kodu da artık çalışmayacak.
          </div>
          <Field label="Mevcut Şifre">
            <PasswordInput value={lockForm.currentPassword} onChange={e => setLockForm(p => ({ ...p, currentPassword: e.target.value }))} autoFocus />
          </Field>
          {lockError && <div style={{ fontSize: 13, fontWeight: 600, color: "#991b1b", marginBottom: 12 }}>✗ {lockError}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={closeLockModal}>Vazgeç</Btn>
            <Btn variant="danger" onClick={submitLockDisable} disabled={lockBusy}>{lockBusy ? "Kapatılıyor..." : "Şifreyi Kapat"}</Btn>
          </div>
        </Modal>
      )}

      {/* Uygulama şifresi: değiştirme */}
      {lockModal === "changePassword" && (
        <Modal title="Şifreyi Değiştir" onClose={closeLockModal}>
          <Field label="Mevcut Şifre">
            <PasswordInput value={lockForm.currentPassword} onChange={e => setLockForm(p => ({ ...p, currentPassword: e.target.value }))} autoFocus />
          </Field>
          <Field label="Yeni Şifre">
            <PasswordInput value={lockForm.password} onChange={e => setLockForm(p => ({ ...p, password: e.target.value }))} />
          </Field>
          <Field label="Yeni Şifre (Tekrar)">
            <PasswordInput value={lockForm.password2} onChange={e => setLockForm(p => ({ ...p, password2: e.target.value }))} />
          </Field>
          {lockError && <div style={{ fontSize: 13, fontWeight: 600, color: "#991b1b", marginBottom: 12 }}>✗ {lockError}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={closeLockModal}>Vazgeç</Btn>
            <Btn onClick={submitLockChangePassword} disabled={lockBusy}>{lockBusy ? "Değiştiriliyor..." : "Şifreyi Değiştir"}</Btn>
          </div>
        </Modal>
      )}

      {/* Uygulama şifresi: kurulum sonrası bir defalık kurtarma kodu gösterimi */}
      {lockRecoveryCode && (
        <Modal title="Kurtarma Kodunuz" onClose={() => {}}>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
            Şifrenizi unutursanız bu kod ile sıfırlayabilirsiniz. Bu kod yalnızca burada gösterilir, bir yere not alın.
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2, color: "#e85d1a", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "14px 0", marginBottom: 20, textAlign: "center" }}>
            {lockRecoveryCode}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Btn onClick={() => { setLockRecoveryCode(null); flash("ok", "Açılışta şifre soruluyor."); }}><Icon name="check" size={14} /> Not Aldım</Btn>
          </div>
        </Modal>
      )}
    </>
  );
};
