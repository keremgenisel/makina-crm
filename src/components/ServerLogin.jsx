import { useState, useEffect } from "react";
import { Icon } from "./ui";

// Sunucu modunda oturum açma ekranı.
// Uygulamanın mevcut renk/buton tasarımını kullanır.
export function ServerLogin({ onLogin, initialUrl = "", initialUsername = "" }) {
  const [serverUrl, setServerUrl] = useState(initialUrl);
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [need2fa, setNeed2fa] = useState(false); // sunucu 2FA kodu istedi mi
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lockRemaining, setLockRemaining] = useState(0); // kademeli kilit: kalan bekleme (sn)
  const [trustPrompt, setTrustPrompt] = useState(null); // { fp, mismatch } — TLS parmak izi onayı
  const [trustChecked, setTrustChecked] = useState(false); // parmak izini elle karşılaştırdım onayı
  const [trustMode, setTrustMode] = useState(null); // null | "trust" | "force" — onaylanan güven bu akışta sürer (2FA turunda kaybolmasın)
  const [serverVerified, setServerVerified] = useState(false); // bu sunucunun sertifikası daha önce doğrulanıp sabitlendi mi

  // Kayıtlı config'te pin varsa (daha önce doğrulanmış sunucu) rozet göster: parmak izi tekrar
  // sorulmadan bağlanmak güvenli, çünkü bağlantı zaten sabitlenmiş sertifikayla şifrelenir.
  useEffect(() => {
    let alive = true;
    window.appServer?.getConfig?.().then(c => { if (alive) setServerVerified(!!c?.tls); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Kilit süresi geri sayımı — her saniye azalır, 0'a inince "Giriş Yap" yeniden serbest.
  useEffect(() => {
    if (lockRemaining <= 0) return;
    const t = setInterval(() => setLockRemaining(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [lockRemaining > 0]);

  // extra: TLS parmak izi onayı için { trust } (ilk güven) veya { force } (kimlik değişti, yine güven)
  const doLogin = async (extra = {}) => {
    // Parmak izi bir kez onaylandıysa (trustMode) sonraki denemeler — 2FA sonrası "Giriş Yap"
    // dahil — trust/force taşır; yoksa 2FA turunda güven kaybolup güven ekranı döngüye girer.
    const bayrak = (extra.trust || extra.force) ? extra
      : trustMode === "force" ? { force: true }
      : trustMode === "trust" ? { trust: true }
      : {};
    setLoading(true);
    try {
      const result = await window.appServer.login({ serverUrl: serverUrl.trim(), username: username.trim(), password, totpCode: totpCode.trim() || undefined, ...bayrak });
      if (result?.ok) { onLogin(result.user); }
      else if (result?.needTrust) { setTrustChecked(false); setTrustPrompt({ fp: result.fp, mismatch: false }); }
      else if (result?.certMismatch) { setTrustChecked(false); setTrustPrompt({ fp: result.fp, mismatch: true }); }
      else if (result?.retryAfterSec > 0) { setLockRemaining(Math.ceil(result.retryAfterSec)); setError(result?.error || "Çok fazla başarısız deneme."); }
      else if (result?.requires2fa) { setNeed2fa(true); setError(totpCode ? (result?.error || "Doğrulama kodu hatalı") : null); }
      else { setError(result?.error || "Giriş başarısız"); }
    } catch { setError("Sunucuya bağlanılamadı"); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (lockRemaining > 0) return; // kilitliyken gönderme (Enter'la da)
    if (!serverUrl.trim()) { setError("Sunucu adresi gerekli"); return; }
    if (!username.trim()) { setError("Kullanıcı adı gerekli"); return; }
    if (!password) { setError("Şifre gerekli"); return; }
    if (need2fa && !totpCode.trim()) { setError("Doğrulama kodu gerekli"); return; }
    doLogin();
  };

  const inp = {
    width: "100%", padding: "10px 14px", fontSize: 14, borderRadius: 8,
    border: "1px solid rgba(232,93,26,.3)", background: "rgba(255,255,255,.06)",
    color: "#f0d5c4", outline: "none", boxSizing: "border-box",
  };

  const outer = { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#160900 0%,#281104 100%)", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" };

  // TLS parmak izi onay ekranı (TOFU): ilk bağlantıda veya sunucu kimliği değiştiğinde.
  if (trustPrompt) {
    const mismatch = trustPrompt.mismatch;
    return (
      <div style={outer}>
        <div style={{ background: "rgba(255,255,255,.045)", border: `1px solid ${mismatch ? "rgba(220,38,38,.5)" : "rgba(232,93,26,.25)"}`, borderRadius: 16, padding: "36px 32px", width: 400, boxShadow: "0 24px 64px rgba(0,0,0,.5)" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: mismatch ? "#fca5a5" : "#ff9d5c", marginBottom: 10 }}>
            {mismatch ? "⚠ Sunucu Kimliği Değişti" : "Sunucuya Güven"}
          </div>
          <div style={{ fontSize: 13, color: "#c9a184", lineHeight: 1.5, marginBottom: 14 }}>
            {mismatch
              ? "Bu sunucunun sertifika parmak izi daha önce kaydettiğinizden farklı. Sunucu yeniden kurulduysa normaldir; aksi halde araya biri girmiş olabilir. Emin değilseniz bağlanmayın."
              : "Bu sunucuya ilk kez bağlanıyorsunuz. Aşağıdaki parmak izinin sunucudaki (Ayarlar > Sunucu) değerle aynı olduğunu doğrulayın, sonra güvenin."}
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 12.5, color: "#f0d5c4", background: "rgba(0,0,0,.25)", border: "1px solid rgba(232,93,26,.2)", borderRadius: 8, padding: "10px 12px", wordBreak: "break-all", marginBottom: 14 }}>
            {trustPrompt.fp}
          </div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "#c9a184", marginBottom: 16, cursor: "pointer", lineHeight: 1.45 }}>
            <input type="checkbox" checked={trustChecked} onChange={e => setTrustChecked(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>Bu parmak izini sunucudaki (Ayarlar &gt; Bu PC Sunucu) değerle karşılaştırdım ve aynı.</span>
          </label>
          <button type="button" disabled={loading || !trustChecked} onClick={() => { const mode = mismatch ? "force" : "trust"; setTrustMode(mode); setTrustPrompt(null); doLogin(mode === "force" ? { force: true } : { trust: true }); }} style={{
            width: "100%", padding: "12px", fontSize: 14, fontWeight: 700, borderRadius: 9,
            background: (loading || !trustChecked) ? "rgba(232,93,26,.4)" : mismatch ? "linear-gradient(90deg,var(--red700, #b91c1c),var(--red900, #7f1d1d))" : "linear-gradient(90deg,#e85d1a,#c94d0e)",
            color: "#fff", border: "none", cursor: (loading || !trustChecked) ? "default" : "pointer",
          }}>
            {loading ? "Bağlanıyor..." : mismatch ? "Yine de Güven ve Bağlan" : "Güven ve Bağlan"}
          </button>
          <button type="button" onClick={() => { setTrustPrompt(null); setTrustMode(null); }} style={{
            width: "100%", marginTop: 12, padding: "10px", fontSize: 13, fontWeight: 600,
            borderRadius: 9, background: "transparent", color: "#9d7a5e", border: "1px solid rgba(157,122,94,.35)", cursor: "pointer",
          }}>
            Vazgeç
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={outer}>
      <form onSubmit={handleSubmit} style={{ background: "rgba(255,255,255,.045)", border: "1px solid rgba(232,93,26,.2)", borderRadius: 16, padding: "40px 36px", width: 360, boxShadow: "0 24px 64px rgba(0,0,0,.5)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#ff9d5c", letterSpacing: -0.5 }}>Altunmak CRM</div>
          <div style={{ fontSize: 13, color: "#9d7a5e", marginTop: 6, letterSpacing: 2, textTransform: "uppercase" }}>Sunucu Girişi</div>
          {serverVerified && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, padding: "4px 12px", fontSize: 12, fontWeight: 600, color: "var(--grnBr2, #6ee7b7)", background: "rgba(110,231,183,.1)", border: "1px solid rgba(110,231,183,.25)", borderRadius: 999 }}>
              <Icon name="lock" size={12} /> Doğrulanmış sunucu · şifreli bağlantı
            </div>
          )}
        </div>

        <label style={{ display: "block", fontSize: 12, color: "#bd8257", marginBottom: 4, letterSpacing: .5 }}>Sunucu Adresi</label>
        <input style={{ ...inp, marginBottom: 16 }} type="text" value={serverUrl} onChange={e => { setServerUrl(e.target.value); setTrustMode(null); }} placeholder="http://192.168.1.10:3000" autoComplete="off" />

        <label style={{ display: "block", fontSize: 12, color: "#bd8257", marginBottom: 4, letterSpacing: .5 }}>Kullanıcı Adı</label>
        <input style={{ ...inp, marginBottom: 16 }} type="text" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />

        <label style={{ display: "block", fontSize: 12, color: "#bd8257", marginBottom: 4, letterSpacing: .5 }}>Şifre</label>
        <input style={{ ...inp, marginBottom: need2fa ? 16 : 24 }} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />

        {need2fa && (
          <>
            <label style={{ display: "block", fontSize: 12, color: "#bd8257", marginBottom: 4, letterSpacing: .5 }}>Doğrulama Kodu (Authenticator)</label>
            <input style={{ ...inp, marginBottom: 8, letterSpacing: 4, textAlign: "center", fontSize: 18 }} type="text" inputMode="numeric" value={totpCode}
              onChange={e => setTotpCode(e.target.value)} placeholder="6 haneli kod" autoFocus autoComplete="one-time-code" />
            <div style={{ fontSize: 11.5, color: "#9d7a5e", marginBottom: 20 }}>Telefonunuzdaki authenticator kodunu girin. Telefon yoksa yedek kodlarınızdan birini yazabilirsiniz.</div>
          </>
        )}

        {error && (
          <div style={{ background: "rgba(220,38,38,.15)", border: "1px solid rgba(220,38,38,.4)", color: "#fca5a5", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading || lockRemaining > 0} style={{
          width: "100%", padding: "12px", fontSize: 14, fontWeight: 700, borderRadius: 9,
          background: (loading || lockRemaining > 0) ? "rgba(232,93,26,.4)" : "linear-gradient(90deg,#e85d1a,#c94d0e)",
          color: "#fff", border: "none", cursor: (loading || lockRemaining > 0) ? "default" : "pointer",
          boxShadow: (loading || lockRemaining > 0) ? "none" : "0 4px 16px rgba(232,93,26,.4)",
        }}>
          {loading ? "Bağlanıyor..." : lockRemaining > 0 ? `${lockRemaining} sn bekleyin` : "Giriş Yap"}
        </button>

        <button type="button" onClick={async () => {
          await window.appServer?.clearConfig?.();
          window.location.reload();
        }} style={{
          width: "100%", marginTop: 12, padding: "10px", fontSize: 13, fontWeight: 600,
          borderRadius: 9, background: "transparent", color: "#9d7a5e",
          border: "1px solid rgba(157,122,94,.35)", cursor: "pointer",
        }}>
          Yerel Moda Dön
        </button>
      </form>
    </div>
  );
}
