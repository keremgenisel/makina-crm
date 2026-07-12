import { useState, useEffect } from "react";
import { Icon, Input, PasswordInput, Btn } from "./ui";
import { WorldDotMap } from "./WorldDotMap";

// Uygulama açılış kilidi — ErrorBoundary'nin çöküş ekranıyla aynı görsel dilde (ortalanmış
// kart, açık gri arka plan). Sadece bir UI kapısı; veri yükleme bundan bağımsız sürer.
export const LockScreen = ({ onUnlock }) => {
  const [mode, setMode] = useState("login"); // login | recover
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lockRemaining, setLockRemaining] = useState(0); // çok fazla yanlış deneme sonrası kalan bekleme (sn)

  // Kilit süresi geri sayımı — her saniye azalır, 0'a inince giriş yeniden serbest
  useEffect(() => {
    if (lockRemaining <= 0) return;
    const t = setInterval(() => setLockRemaining(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [lockRemaining > 0]);

  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [newRecoveryCode, setNewRecoveryCode] = useState(null); // başarılı sıfırlama sonrası bir defalık gösterim

  const submitLogin = async () => {
    setBusy(true); setError("");
    try {
      const res = await window.appLock.verify(password);
      if (res?.ok) onUnlock();
      else {
        setError(res?.error || "Şifre yanlış.");
        if (res?.retryAfterMs > 0) setLockRemaining(Math.ceil(res.retryAfterMs / 1000));
      }
    } catch (err) {
      setError("Beklenmeyen hata: " + (err?.message || "uygulamayı yeniden başlatmayı deneyin."));
    } finally {
      setBusy(false);
    }
  };

  const submitRecover = async () => {
    setError("");
    if (!recoveryCode.trim()) { setError("Kurtarma kodunu girin."); return; }
    if (newPassword.length < 4) { setError("Yeni şifre en az 4 karakter olmalı."); return; }
    if (newPassword !== newPassword2) { setError("Şifreler eşleşmiyor."); return; }
    setBusy(true);
    try {
      const res = await window.appLock.resetWithRecoveryCode(recoveryCode, newPassword);
      if (res?.ok) setNewRecoveryCode(res.recoveryCode);
      else setError(res?.error || "Kurtarma kodu yanlış.");
    } catch (err) {
      setError("Beklenmeyen hata: " + (err?.message || "uygulamayı yeniden başlatmayı deneyin."));
    } finally {
      setBusy(false);
    }
  };

  const cardStyle = { background: "var(--surface, #ffffff)", borderRadius: 14, padding: 32, maxWidth: 380, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.15)", position: "relative", zIndex: 1 };
  const wrapStyle = { position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--n100, #f8fafc)", fontFamily: "system-ui, sans-serif", padding: 24 };

  // wrapStyle + dekoratif nokta-harita arka planı üç render moduna da (login/recover/yeni kod) ortak
  const Screen = ({ children }) => (
    <div style={wrapStyle}>
      <WorldDotMap />
      {children}
    </div>
  );

  if (newRecoveryCode) {
    return (
      <Screen>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--n900, #0f172a)", marginBottom: 10 }}>Şifre sıfırlandı</div>
          <div className="section-desc">
            Yeni kurtarma kodunuz aşağıdadır. Bu kod yalnızca burada gösterilir, bir yere not alın — eskisi artık geçersizdir.
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2, color: "#e85d1a", background: "var(--ambBg3, #fff7ed)", border: "1px solid var(--ambBr3, #fed7aa)", borderRadius: 10, padding: "14px 0", marginBottom: 22 }}>
            {newRecoveryCode}
          </div>
          <Btn onClick={onUnlock}><Icon name="check" size={14} /> Not Aldım, Devam Et</Btn>
        </div>
      </Screen>
    );
  }

  if (mode === "recover") {
    return (
      <Screen>
        <div style={cardStyle}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--n900, #0f172a)", marginBottom: 4 }}>Şifremi Unuttum</div>
          <div style={{ fontSize: 13, color: "var(--n500, #64748b)", marginBottom: 18, lineHeight: 1.6 }}>
            Şifre belirlerken size gösterilen kurtarma kodunu ve yeni şifrenizi girin.
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--n600, #475569)", display: "block", marginBottom: 4 }}>Kurtarma Kodu</label>
            <Input value={recoveryCode} onChange={e => setRecoveryCode(e.target.value)} placeholder="AB12C-D34E5" autoFocus />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--n600, #475569)", display: "block", marginBottom: 4 }}>Yeni Şifre</label>
            <PasswordInput value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--n600, #475569)", display: "block", marginBottom: 4 }}>Yeni Şifre (Tekrar)</label>
            <PasswordInput value={newPassword2} onChange={e => setNewPassword2(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submitRecover(); }} />
          </div>
          {error && <div style={{ fontSize: 13, fontWeight: 600, color: "var(--red800, #991b1b)", marginBottom: 14 }}>✗ {error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" onClick={() => { setMode("login"); setError(""); }}>Vazgeç</Btn>
            <Btn onClick={submitRecover} disabled={busy}>{busy ? "Sıfırlanıyor..." : "Şifreyi Sıfırla"}</Btn>
          </div>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <div style={{ ...cardStyle, textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--ambBg3, #fff7ed)", color: "#e85d1a", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Icon name="lock" size={22} />
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--n900, #0f172a)", marginBottom: 18 }}>Altunmak CRM</div>
        <div style={{ marginBottom: 14 }}>
          <PasswordInput value={password} onChange={e => setPassword(e.target.value)} placeholder="Şifre" autoFocus
            onKeyDown={e => { if (e.key === "Enter") submitLogin(); }} />
        </div>
        {error && <div style={{ fontSize: 13, fontWeight: 600, color: "var(--red800, #991b1b)", marginBottom: 14 }}>✗ {error}</div>}
        {lockRemaining > 0 && <div style={{ fontSize: 12, color: "var(--amb700, #b45309)", marginBottom: 12 }}>Çok fazla yanlış deneme. {lockRemaining} sn sonra tekrar deneyin.</div>}
        <Btn onClick={submitLogin} disabled={busy || lockRemaining > 0}>{busy ? "Kontrol ediliyor..." : lockRemaining > 0 ? `${lockRemaining} sn bekleyin` : "Giriş"}</Btn>
        <div style={{ marginTop: 16 }}>
          <span onClick={() => { setMode("recover"); setError(""); }}
            style={{ fontSize: 12, color: "var(--n400, #94a3b8)", cursor: "pointer", textDecoration: "underline" }}>
            Şifremi Unuttum
          </span>
        </div>
      </div>
    </Screen>
  );
};
