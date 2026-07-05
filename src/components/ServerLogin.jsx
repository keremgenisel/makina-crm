import { useState } from "react";

// Sunucu modunda oturum açma ekranı.
// Uygulamanın mevcut renk/buton tasarımını kullanır.
export function ServerLogin({ onLogin, initialUrl = "", initialUsername = "" }) {
  const [serverUrl, setServerUrl] = useState(initialUrl);
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!serverUrl.trim()) { setError("Sunucu adresi gerekli"); return; }
    if (!username.trim()) { setError("Kullanıcı adı gerekli"); return; }
    if (!password) { setError("Şifre gerekli"); return; }
    setLoading(true);
    try {
      const result = await window.appServer.login({ serverUrl: serverUrl.trim(), username: username.trim(), password });
      if (result?.ok) { onLogin(result.user); }
      else { setError(result?.error || "Giriş başarısız"); }
    } catch { setError("Sunucuya bağlanılamadı"); }
    finally { setLoading(false); }
  };

  const inp = {
    width: "100%", padding: "10px 14px", fontSize: 14, borderRadius: 8,
    border: "1px solid rgba(232,93,26,.3)", background: "rgba(255,255,255,.06)",
    color: "#f0d5c4", outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#160900 0%,#281104 100%)", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <form onSubmit={handleSubmit} style={{ background: "rgba(255,255,255,.045)", border: "1px solid rgba(232,93,26,.2)", borderRadius: 16, padding: "40px 36px", width: 360, boxShadow: "0 24px 64px rgba(0,0,0,.5)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#ff9d5c", letterSpacing: -0.5 }}>Altunmak CRM</div>
          <div style={{ fontSize: 13, color: "#9d7a5e", marginTop: 6, letterSpacing: 2, textTransform: "uppercase" }}>Sunucu Girişi</div>
        </div>

        <label style={{ display: "block", fontSize: 12, color: "#bd8257", marginBottom: 4, letterSpacing: .5 }}>Sunucu Adresi</label>
        <input style={{ ...inp, marginBottom: 16 }} type="text" value={serverUrl} onChange={e => setServerUrl(e.target.value)} placeholder="http://192.168.1.10:3000" autoComplete="off" />

        <label style={{ display: "block", fontSize: 12, color: "#bd8257", marginBottom: 4, letterSpacing: .5 }}>Kullanıcı Adı</label>
        <input style={{ ...inp, marginBottom: 16 }} type="text" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" />

        <label style={{ display: "block", fontSize: 12, color: "#bd8257", marginBottom: 4, letterSpacing: .5 }}>Şifre</label>
        <input style={{ ...inp, marginBottom: 24 }} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />

        {error && (
          <div style={{ background: "rgba(220,38,38,.15)", border: "1px solid rgba(220,38,38,.4)", color: "#fca5a5", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={{
          width: "100%", padding: "12px", fontSize: 14, fontWeight: 700, borderRadius: 9,
          background: loading ? "rgba(232,93,26,.4)" : "linear-gradient(90deg,#e85d1a,#c94d0e)",
          color: "#fff", border: "none", cursor: loading ? "default" : "pointer",
          boxShadow: loading ? "none" : "0 4px 16px rgba(232,93,26,.4)",
        }}>
          {loading ? "Bağlanıyor..." : "Giriş Yap"}
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
