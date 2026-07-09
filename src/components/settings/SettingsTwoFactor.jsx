import { useState, useEffect } from "react";
import { Icon, Btn, PasswordInput } from "../ui";
import { Section } from "./Section";

// Kullanıcının kendi hesabı için iki adımlı doğrulama (TOTP / Google Authenticator) yönetimi.
// Sunucu uçları: /auth/2fa/status | setup | enable | disable. Tümü mevcut oturum token'ıyla apiRequest.
export function SettingsTwoFactor({ flash }) {
  const [enabled, setEnabled] = useState(null); // null=yükleniyor
  const [step, setStep] = useState("idle");     // idle | setup | recovery
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [disablePw, setDisablePw] = useState("");
  const [showDisable, setShowDisable] = useState(false);

  const loadStatus = async () => {
    const res = await window.appServer?.apiRequest?.({ method: "GET", path: "/auth/2fa/status" });
    if (res?.ok) setEnabled(!!res.data.enabled); else setEnabled(false);
  };
  useEffect(() => { loadStatus(); }, []);

  const startSetup = async () => {
    setErr(""); setBusy(true);
    const res = await window.appServer.apiRequest({ method: "POST", path: "/auth/2fa/setup" });
    setBusy(false);
    if (res?.ok) { setQr(res.data.qr); setSecret(res.data.secret); setCode(""); setStep("setup"); }
    else flash("err", res?.error || "Kurulum başlatılamadı.");
  };

  const confirmEnable = async () => {
    setErr("");
    if (!/^\d{6}$/.test(code.trim())) { setErr("6 haneli kodu girin."); return; }
    setBusy(true);
    const res = await window.appServer.apiRequest({ method: "POST", path: "/auth/2fa/enable", body: { code: code.trim() } });
    setBusy(false);
    if (res?.ok) { setRecovery(res.data.recovery || []); setStep("recovery"); setEnabled(true); flash("ok", "İki adımlı doğrulama açıldı."); }
    else setErr(res?.error || "Kod doğrulanamadı.");
  };

  const doDisable = async () => {
    setErr("");
    if (!disablePw) { setErr("Şifrenizi girin."); return; }
    setBusy(true);
    const res = await window.appServer.apiRequest({ method: "POST", path: "/auth/2fa/disable", body: { password: disablePw } });
    setBusy(false);
    if (res?.ok) { setEnabled(false); setShowDisable(false); setDisablePw(""); flash("ok", "İki adımlı doğrulama kapatıldı."); }
    else setErr(res?.error || "Kapatılamadı.");
  };

  return (
    <Section title="İki Adımlı Doğrulama (2FA)" icon="lock">
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
        Girişte şifrenize ek olarak telefonunuzdaki authenticator uygulamasından (Google Authenticator, Microsoft Authenticator vb.) 6 haneli kod istenir. Şifreniz ele geçse bile hesabınız korunur.
      </div>

      {enabled === null ? (
        <div style={{ fontSize: 13, color: "#94a3b8" }}>Yükleniyor...</div>
      ) : step === "setup" ? (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18, maxWidth: 420 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 10 }}>1) QR kodu authenticator uygulamanızla okutun</div>
          {qr && <img src={qr} alt="QR" style={{ width: 180, height: 180, display: "block", margin: "0 auto 10px", borderRadius: 8, background: "#fff", padding: 6 }} />}
          <div style={{ fontSize: 11.5, color: "#94a3b8", marginBottom: 14, wordBreak: "break-all" }}>Elle eklemek için anahtar: <b style={{ fontFamily: "monospace", color: "#475569" }}>{secret}</b></div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 8 }}>2) Uygulamadaki 6 haneli kodu girin</div>
          <input value={code} onChange={e => setCode(e.target.value)} inputMode="numeric" placeholder="6 haneli kod" maxLength={6}
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 18, letterSpacing: 6, textAlign: "center", border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 10 }} />
          {err && <div style={{ fontSize: 12.5, color: "#991b1b", marginBottom: 10 }}>✗ {err}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" onClick={() => { setStep("idle"); setErr(""); }}>Vazgeç</Btn>
            <Btn onClick={confirmEnable} disabled={busy}>{busy ? "Doğrulanıyor..." : "Etkinleştir"}</Btn>
          </div>
        </div>
      ) : step === "recovery" ? (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: 18, maxWidth: 460 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#92400e", marginBottom: 6 }}>Yedek kurtarma kodları</div>
          <div style={{ fontSize: 12.5, color: "#92400e", marginBottom: 12, lineHeight: 1.6 }}>
            Telefonunuzu kaybederseniz bunlardan biriyle giriş yapabilirsiniz (her kod bir kez). <b>Şimdi güvenli bir yere kaydedin;</b> bu kodlar tekrar gösterilmeyecek.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            {recovery.map(c => <div key={c} style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: "#0f172a", background: "#fff", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>{c}</div>)}
          </div>
          <Btn onClick={() => setStep("idle")}>Kaydettim, Kapat</Btn>
        </div>
      ) : enabled ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#065f46", background: "#d1fae5", padding: "6px 14px", borderRadius: 10 }}>✓ İki adımlı doğrulama açık</span>
          </div>
          {!showDisable ? (
            <Btn variant="ghost" onClick={() => { setShowDisable(true); setErr(""); setDisablePw(""); }}>Kapat</Btn>
          ) : (
            <div style={{ maxWidth: 340 }}>
              <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 8 }}>Kapatmak için şifrenizi girin:</div>
              <div style={{ marginBottom: 10 }}><PasswordInput value={disablePw} onChange={e => setDisablePw(e.target.value)} placeholder="Şifre" /></div>
              {err && <div style={{ fontSize: 12.5, color: "#991b1b", marginBottom: 10 }}>✗ {err}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="ghost" onClick={() => setShowDisable(false)}>Vazgeç</Btn>
                <Btn variant="danger" onClick={doDisable} disabled={busy}>{busy ? "..." : "2FA'yı Kapat"}</Btn>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Btn onClick={startSetup} disabled={busy}><Icon name="lock" size={14} /> {busy ? "..." : "Etkinleştir"}</Btn>
      )}
    </Section>
  );
}
