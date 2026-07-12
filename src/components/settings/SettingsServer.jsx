import { useState, useEffect } from "react";
import { Section } from "./Section";
import { SettingsTwoFactor } from "./SettingsTwoFactor";
import { ConfirmDialog } from "../ui";
import { isTailscaleIp } from "../../lib/utils";
import { UserManager } from "./UserManager";

// ── Uzaktan erişim (Tailscale) yardım kutusu ─────────────────────────────────
// Tıklayınca açılan kısa bilgilendirme; hem sunucu hem istemci ekranında gösterilir.
const TAILSCALE_AYARLAR = [
  ["Allow incoming connections", "✓ (required)", "✗ (not needed)"],
  ["Use Tailscale DNS settings", "✓ (default)", "✓ (default)"],
  ["Use Tailscale subnets", "✓ (default)", "✓ (default)"],
  ["Automatically install updates", "✓", "✓"],
  ["Run unattended", "✓ (required)", "✗ (not needed)"],
];
function UzaktanErisimYardim() {
  const [open, setOpen] = useState(false);
  const tsTh = { textAlign: "left", padding: "5px 8px", background: "var(--n150, #f1f5f9)", border: "1px solid var(--n200, #e2e8f0)", fontWeight: 700, color: "var(--n600, #475569)", fontSize: 11 };
  const tsTd = { padding: "5px 8px", border: "1px solid var(--n200, #e2e8f0)", color: "var(--n600, #475569)" };
  return (
    <div style={{ marginTop: 14, border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, overflow: "hidden" }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none", padding: "10px 14px", background: "var(--n100, #f8fafc)" }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--n600, #475569)" }}>🌐 İnternet üzerinden (uzaktan) erişim nasıl kurulur?</span>
        <span style={{ fontSize: 12, color: "var(--n400, #94a3b8)" }}>{open ? "▾" : "▸"}</span>
      </div>
      {open && (
        <div style={{ padding: "12px 14px", fontSize: 12.5, color: "var(--n600, #475569)", lineHeight: 1.7 }}>
          Fabrika dışından bağlanmak için ücretsiz <b>Tailscale</b> (tailscale.com) kullanılır. Kısaca:
          <ol style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            <li>Hem sunucu PC'ye hem de uzaktan bağlanacak bilgisayara Tailscale kurulur.</li>
            <li>İkisinde de <b>aynı hesapla</b> giriş yapılır (Google/Microsoft).</li>
            <li>Sunucu PC açık ve internete bağlı kalmalı; uyku kapalı olmalı.</li>
            <li>Sunucunun Tailscale adresi (<span style={{ fontFamily: "monospace" }}>100.x.x.x</span>) bu ekranda "Uzaktan Erişim" başlığı altında görünür.</li>
            <li>Bağlanan bilgisayarda, aşağıdaki bağlantı formuna bu <span style={{ fontFamily: "monospace" }}>100.x.x.x</span> adresi yazılır.</li>
          </ol>
          <div style={{ marginTop: 8, color: "var(--n400, #94a3b8)" }}>Not: Fabrika içindeyken yerel ağ adresi (192.168...) kullanılabilir; Tailscale yalnızca uzaktan erişim içindir.</div>

          <div style={{ marginTop: 14, fontWeight: 700, color: "var(--n700, #334155)" }}>Tailscale ayarları (her PC'de tepsi simgesi &gt; Preferences)</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 6, fontSize: 11.5 }}>
              <thead>
                <tr>
                  <th style={tsTh}>Setting</th>
                  <th style={{ ...tsTh, textAlign: "center" }}>Server PC</th>
                  <th style={{ ...tsTh, textAlign: "center" }}>Client PC</th>
                </tr>
              </thead>
              <tbody>
                {TAILSCALE_AYARLAR.map(([s, srv, cli]) => (
                  <tr key={s}>
                    <td style={{ ...tsTd, fontFamily: "monospace" }}>{s}</td>
                    <td style={{ ...tsTd, textAlign: "center", whiteSpace: "nowrap", color: srv.startsWith("✓") ? "var(--grn700, #15803d)" : "var(--red700, #b91c1c)" }}>{srv}</td>
                    <td style={{ ...tsTd, textAlign: "center", whiteSpace: "nowrap", color: cli.startsWith("✓") ? "var(--grn700, #15803d)" : "var(--red700, #b91c1c)" }}>{cli}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12 }}>
            Sunucu PC'de ayrıca iki ayar (bu menüde değil):
            <ol style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              <li><b>Windows güç ayarlarında uyku KAPALI</b> olmalı (uyuyan PC'ye erişilemez).</li>
              <li><b>Admin panelde</b> (<span style={{ fontFamily: "monospace" }}>login.tailscale.com/admin</span>) bu cihaz için <b>key expiry KAPAT</b> (yoksa ~180 günde bir bağlantı düşer).</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sunucu modu kurulum bileşeni ─────────────────────────────────────────────
export function SetupWizard({ onDone, flash }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [port, setPort] = useState("3000");
  const [loading, setLoading] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [need2fa, setNeed2fa]   = useState(false); // mevcut admin hesabında 2FA açık — kod istendi
  const [hasAdmin, setHasAdmin] = useState(false); // admin zaten var mı: varsa bu bir doğrulama/giriş
  const [lockRemaining, setLockRemaining] = useState(0); // kademeli kilit: kalan bekleme (sn)

  // İlk kurulum mu (admin oluştur) yoksa mevcut admini doğrulama mı? Doğrulamada "Şifre Tekrar"
  // istenmez ve her deneme sunucuya gider (kademeli kilit + güvenlik kaydı çalışsın).
  useEffect(() => {
    window.appServer?.getServerStatus?.().then(s => setHasAdmin(!!s?.hasAdmin)).catch(() => {});
  }, []);

  // Kilit süresi geri sayımı — her saniye azalır, 0'a inince "Sunucuyu Başlat" yeniden serbest (app-lock gibi)
  useEffect(() => {
    if (lockRemaining <= 0) return;
    const t = setInterval(() => setLockRemaining(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [lockRemaining > 0]);

  const inp = { padding: "9px 13px", fontSize: 13, borderRadius: 8, border: "1px solid var(--n200, #e2e8f0)", background: "var(--n100, #f8fafc)", width: "100%", boxSizing: "border-box" };

  const handleSetup = async (e) => {
    e.preventDefault();
    if (lockRemaining > 0) return; // kilitliyken gönderme (Enter'la da)
    if (!username.trim()) { flash("err", "Kullanıcı adı gerekli"); return; }
    if (!password || password.length < 6) { flash("err", "Şifre en az 6 karakter olmalı"); return; }
    // "Şifre Tekrar" yalnız ilk kurulumda (yeni admin oluştururken) doğrulanır; mevcut admini
    // doğrularken tek şifre alanı var, eşleşme kontrolü yok (aksi halde yanlış deneme sunucuya
    // hiç gitmez, rate-limit/kayıt çalışmazdı — bildirilen hata buydu).
    if (!hasAdmin && password !== password2) { flash("err", "Şifreler eşleşmiyor"); return; }
    if (need2fa && !totpCode.trim()) { flash("err", "Doğrulama kodu gerekli"); return; }
    setLoading(true);
    const result = await window.appServer.setupAdmin({ username: username.trim(), password, port: parseInt(port) || 3000, totpCode: totpCode.trim() || undefined });
    setLoading(false);
    if (result?.ok) {
      flash("ok", `Sunucu başlatıldı — port ${result.port}`);
      onDone(result);
    } else if (result?.retryAfterSec > 0) {
      setLockRemaining(Math.ceil(result.retryAfterSec)); // kademeli kilit: geri sayım başlat
      flash("err", result?.error || "Çok fazla başarısız deneme.");
    } else if (result?.requires2fa) {
      setNeed2fa(true);
      flash(totpCode ? "err" : "ok", totpCode ? (result?.error || "Doğrulama kodu hatalı") : "Bu hesapta iki adımlı doğrulama açık — authenticator kodunu girin.");
    } else {
      flash("err", result?.error || "Kurulum başarısız");
    }
  };

  return (
    <form onSubmit={handleSetup} style={{ display: "grid", gap: 14, maxWidth: 400 }}>
      <div style={{ padding: "14px 16px", background: "var(--ambBg2, #fef3c7)", borderRadius: 10, border: "1px solid var(--ambBr2, #fcd34d)", fontSize: 13, color: "var(--amb800, #92400e)", lineHeight: 1.6 }}>
        {hasAdmin
          ? "Bu PC sunucu olarak başlatılacak. Sunucuyu başlatmak için mevcut admin kullanıcı adı ve şifresini girin."
          : "Bu PC sunucu olarak ayarlanacak. Diğer bilgisayarlar buraya bağlanacak, uygulamanın açık kalması gerekir. Bir admin kullanıcı adı ve şifresi belirleyin."}
      </div>
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--n500, #64748b)", marginBottom: 4 }}>Admin Kullanıcı Adı</label>
        <input style={inp} type="text" value={username} onChange={e => setUsername(e.target.value)} autoComplete="off" />
      </div>
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--n500, #64748b)", marginBottom: 4 }}>{hasAdmin ? "Şifre" : "Şifre (min 6 karakter)"}</label>
        <input style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={hasAdmin ? "current-password" : "new-password"} />
      </div>
      {!hasAdmin && (
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--n500, #64748b)", marginBottom: 4 }}>Şifre Tekrar</label>
          <input style={inp} type="password" value={password2} onChange={e => setPassword2(e.target.value)} autoComplete="new-password" />
        </div>
      )}
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--n500, #64748b)", marginBottom: 4 }}>Port (varsayılan: 3000)</label>
        <input style={{ ...inp, width: 100 }} type="number" value={port} onChange={e => setPort(e.target.value)} min={1024} max={65535} />
      </div>
      {need2fa && (
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--n500, #64748b)", marginBottom: 4 }}>Doğrulama Kodu (Authenticator)</label>
          <input style={{ ...inp, letterSpacing: 4, textAlign: "center", fontSize: 18 }} type="text" inputMode="numeric" value={totpCode}
            onChange={e => setTotpCode(e.target.value)} placeholder="6 haneli kod" autoFocus autoComplete="one-time-code" />
          <div style={{ fontSize: 11.5, color: "var(--n400, #94a3b8)", marginTop: 4 }}>Bu admin hesabında iki adımlı doğrulama açık. Authenticator kodunu (veya yedek kodu) girin.</div>
        </div>
      )}
      {lockRemaining > 0 && (
        <div style={{ fontSize: 12, color: "var(--amb700, #b45309)", marginTop: -4 }}>Çok fazla yanlış deneme. {lockRemaining} sn sonra tekrar deneyin.</div>
      )}
      <button type="submit" disabled={loading || lockRemaining > 0} style={{ padding: "10px 20px", background: "#e85d1a", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: (loading || lockRemaining > 0) ? "default" : "pointer", opacity: (loading || lockRemaining > 0) ? .7 : 1, width: "fit-content" }}>
        {loading ? "Kuruluyor..." : lockRemaining > 0 ? `${lockRemaining} sn bekleyin` : "Sunucuyu Başlat"}
      </button>
    </form>
  );
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────
export function SettingsServer({ flash, settingsGroups = [] }) {
  const [cfg, setCfg]             = useState(null);
  const [mode, setMode]           = useState(null); // null=bekleniyor | "none" | "server" | "client"
  const [pick, setPick]           = useState(null); // "server" | "client" | null (kurulum seçimi)
  // istemci bağlantı formu
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername]   = useState("");
  const [password, setPassword]   = useState("");
  const [totpCode, setTotpCode]   = useState("");
  const [need2fa, setNeed2fa]     = useState(false); // sunucu 2FA kodu istedi mi
  const [connecting, setConnecting] = useState(false);
  const [connLock, setConnLock]   = useState(0); // kademeli kilit: kalan bekleme (sn)
  const [regenConfirm, setRegenConfirm] = useState(false); // TLS sertifikası yenileme onayı
  const [tlsOnlyConfirm, setTlsOnlyConfirm] = useState(false); // yalnız-HTTPS açma onayı
  const [connTrust, setConnTrust] = useState(null); // istemci bağlan formu TLS parmak izi onayı { fp, mismatch }
  const [connTrustChecked, setConnTrustChecked] = useState(false); // parmak izini karşılaştırdım onayı
  const [connTrustMode, setConnTrustMode] = useState(null); // null | "trust" | "force" — onaylanan güven bu akışta sürer

  // Kilit geri sayımı — her saniye azalır, 0'a inince "Bağlan" yeniden serbest.
  useEffect(() => {
    if (connLock <= 0) return;
    const t = setInterval(() => setConnLock(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [connLock > 0]);

  const reloadCfg = async () => {
    if (!window.appServer) { setMode("none"); return; }
    const c = await window.appServer.getConfig();
    setCfg(c);
    if (c?.isServer) { setMode("server"); }
    else if (c?.isActive) { setMode("client"); setServerUrl(c.serverUrl || ""); }
    else { setMode("none"); if (c?.serverUrl) setServerUrl(c.serverUrl); }
  };
  useEffect(() => { reloadCfg(); }, []);

  // İstemci bağlan. Parmak izi bir kez onaylandıysa (connTrustMode) sonraki tüm denemeler
  // — 2FA sonrası form "Bağlan" dahil — trust/force bayrağını taşır; aksi halde 2FA turunda
  // güven kaybolup "Güven ve Bağlan" ekranı sonsuz döngüye girerdi.
  const doConnect = async (extra = {}) => {
    const bayrak = (extra.trust || extra.force) ? extra
      : connTrustMode === "force" ? { force: true }
      : connTrustMode === "trust" ? { trust: true }
      : {};
    setConnecting(true);
    const result = await window.appServer.login({ serverUrl: serverUrl.trim(), username: username.trim(), password, totpCode: totpCode.trim() || undefined, ...bayrak });
    setConnecting(false);
    if (result?.ok) { flash("ok", "Bağlandı. Yeniden yükleniyor..."); setTimeout(() => window.location.reload(), 800); }
    else if (result?.needTrust) { setConnTrustChecked(false); setConnTrust({ fp: result.fp, mismatch: false }); }
    else if (result?.certMismatch) { setConnTrustChecked(false); setConnTrust({ fp: result.fp, mismatch: true }); }
    else if (result?.retryAfterSec > 0) { setConnLock(Math.ceil(result.retryAfterSec)); flash("err", result?.error || "Çok fazla başarısız deneme."); }
    else if (result?.requires2fa) { setNeed2fa(true); flash(totpCode ? "err" : "ok", totpCode ? (result?.error || "Doğrulama kodu hatalı") : "Bu hesapta iki adımlı doğrulama açık — authenticator kodunu girin."); }
    else flash("err", result?.error || "Giriş başarısız");
  };

  const inp = { padding: "9px 13px", fontSize: 13, borderRadius: 8, border: "1px solid var(--n200, #e2e8f0)", background: "var(--n100, #f8fafc)", width: "100%", boxSizing: "border-box" };
  const lbl = { display: "block", fontSize: 12, fontWeight: 600, color: "var(--n500, #64748b)", marginBottom: 4 };

  if (!window.appServer) return (
    <Section title="Çoklu Kullanıcı" icon="settings">
      <div style={{ fontSize: 13, color: "var(--n500, #64748b)" }}>Bu özellik yalnızca Electron uygulamasında kullanılabilir.</div>
    </Section>
  );

  if (mode === null) return <Section title="Çoklu Kullanıcı" icon="settings"><div style={{ fontSize: 13, color: "var(--n400, #94a3b8)" }}>Yükleniyor...</div></Section>;

  // ── Sunucu modu aktif ─────────────────────────────────────────────────────
  if (mode === "server") {
    const running = cfg?.running;
    const ips     = cfg?.ips || [];
    const port    = cfg?.port;
    const yerelIps = ips.filter(ip => !isTailscaleIp(ip));
    const tailscaleIps = ips.filter(isTailscaleIp);
    return (
      <>
        <Section title="Bu PC Sunucu Olarak Çalışıyor" icon="settings">
          <div style={{ marginBottom: 16, padding: "14px 16px", background: running ? "var(--grnBg3, #d1fae5)" : "var(--redBg2, #fee2e2)", borderRadius: 10, border: `1px solid ${running ? "var(--grnBr2, #6ee7b7)" : "#fca5a5"}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: running ? "var(--grn800, #065f46)" : "var(--red800, #991b1b)", marginBottom: 6 }}>
              {running ? `Sunucu Çalışıyor — Port ${port}` : "Sunucu Durduruldu"}
            </div>
            {running && ips.length > 0 && (
              <div style={{ fontSize: 12, color: "var(--emerald2, #047857)" }}>
                <b>Fabrika içi (Yerel Ağ) — bu bilgisayara bağlanmak için:</b>
                {(yerelIps.length ? yerelIps : ["—"]).map(ip => (
                  <div key={ip} style={{ fontFamily: "monospace", marginTop: 4, fontWeight: 700 }}>{ip === "—" ? "—" : `http://${ip}:${port}`}</div>
                ))}
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--grnBr2, #6ee7b7)" }}>
                  <b>Uzaktan Erişim (Tailscale) — internet üzerinden bağlanmak için:</b>
                  {tailscaleIps.length > 0 ? (
                    <>
                      {tailscaleIps.map(ip => (
                        <div key={ip} style={{ fontFamily: "monospace", marginTop: 4, fontWeight: 700 }}>http://{ip}:{port}</div>
                      ))}
                      <div style={{ marginTop: 4, color: "var(--teal2, #0f766e)", fontSize: 11.5 }}>Bağlanacak bilgisayarda da Tailscale kurulu, açık ve aynı hesapla giriş yapılmış olmalı.</div>
                    </>
                  ) : (
                    <div style={{ marginTop: 4, color: "var(--teal2, #0f766e)", fontSize: 11.5 }}>Uzaktan erişim için bu sunucu PC'ye de Tailscale kurun ve açın; adres burada görünecektir.</div>
                  )}
                </div>
              </div>
            )}
          </div>
          {running && cfg?.fp && (
            <div style={{ marginTop: 16, padding: "12px 14px", background: "var(--n100, #f8fafc)", borderRadius: 10, border: "1px solid var(--n200, #e2e8f0)" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--n700, #334155)", marginBottom: 4 }}>TLS Sertifika Parmak İzi</div>
              <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginBottom: 8, lineHeight: 1.5 }}>
                İstemciler ilk bağlanışta bu parmak izini onaylar (bağlantı şifrelenir). İstemcide görünen değerin buradakiyle aynı olduğunu doğrulayabilirsiniz.
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 12, color: "var(--n900, #0f172a)", background: "var(--surface, #ffffff)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 6, padding: "8px 10px", wordBreak: "break-all" }}>{cfg.fp}</div>
              <button onClick={() => setRegenConfirm(true)} style={{ marginTop: 10, padding: "7px 14px", background: "var(--surface, #ffffff)", color: "var(--amb700, #b45309)", border: "1px solid var(--ambBr2, #fcd34d)", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                Sertifikayı Yenile
              </button>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--n200, #e2e8f0)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--n700, #334155)" }}>Yalnız HTTPS (şifresiz bağlantıyı kapat)</div>
                  <div style={{ fontSize: 12, color: "var(--n500, #64748b)", lineHeight: 1.5 }}>
                    Açıkken düz HTTP bağlantılar reddedilir. Tüm istemcilerin şifreli (https) bağlandığından emin olduktan sonra açın; aksi halde eski istemciler bağlanamaz.
                  </div>
                </div>
                <button onClick={() => {
                  if (cfg.tlsOnly) { window.appServer.setTlsOnly(false).then(() => { flash("ok", "Yalnız-HTTPS kapatıldı."); reloadCfg(); }); }
                  else { setTlsOnlyConfirm(true); }
                }} style={{ flexShrink: 0, padding: "7px 16px", background: cfg.tlsOnly ? "var(--grnBg2, #dcfce7)" : "var(--surface, #ffffff)", color: cfg.tlsOnly ? "var(--grn900, #166534)" : "var(--n500, #64748b)", border: `1px solid ${cfg.tlsOnly ? "var(--grnBr3, #86efac)" : "var(--n200, #e2e8f0)"}`, borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                  {cfg.tlsOnly ? "Açık" : "Kapalı"}
                </button>
              </div>
            </div>
          )}
          {tlsOnlyConfirm && (
            <ConfirmDialog
              title="Yalnız HTTPS'e geçilsin mi?"
              message="Bu andan itibaren yalnız şifreli (HTTPS) bağlantılar kabul edilir; düz HTTP ile bağlanan eski istemciler bağlanamaz. Tüm istemcilerin güncel sürümle en az bir kez https üzerinden giriş yaptığından emin olun."
              confirmLabel="Yalnız HTTPS'i Aç" confirmIcon="lock" icon="lock"
              onCancel={() => setTlsOnlyConfirm(false)}
              onConfirm={async () => {
                setTlsOnlyConfirm(false);
                const r = await window.appServer.setTlsOnly(true);
                if (r?.ok) { flash("ok", "Yalnız-HTTPS açıldı."); reloadCfg(); }
                else flash("err", r?.error || "Açılamadı");
              }}
            />
          )}
          {regenConfirm && (
            <ConfirmDialog
              title="Sertifikayı yenilemek istediğinize emin misiniz?"
              message="Yeni bir TLS sertifikası üretilir ve parmak izi değişir. Bağlı tüm istemciler bir sonraki bağlantıda 'sunucu kimliği değişti' uyarısı görüp yeniden güven vermek zorunda kalır. Yalnızca sertifika ele geçirilmiş olabileceğinden şüpheleniyorsanız yenileyin."
              confirmLabel="Yenile" confirmIcon="settings" icon="settings"
              onCancel={() => setRegenConfirm(false)}
              onConfirm={async () => {
                setRegenConfirm(false);
                const r = await window.appServer.regenerateCert();
                if (r?.ok) { flash("ok", "Sertifika yenilendi."); reloadCfg(); }
                else flash("err", r?.error || "Yenilenemedi");
              }}
            />
          )}
          {running && <UzaktanErisimYardim />}
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            {running ? (
              <button onClick={async () => { await window.appServer.stopServer(); reloadCfg(); flash("ok", "Sunucu durduruldu."); }}
                style={{ padding: "9px 18px", background: "var(--surface, #ffffff)", color: "var(--red600, #dc2626)", border: "1px solid #fca5a5", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Sunucuyu Durdur
              </button>
            ) : (
              <button onClick={async () => { const r = await window.appServer.startServer(port); if (r?.ok) { flash("ok", `Sunucu başlatıldı — port ${r.port}`); reloadCfg(); } else flash("err", r?.error || "Başlatılamadı"); }}
                style={{ padding: "9px 18px", background: "#e85d1a", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Sunucuyu Başlat
              </button>
            )}
            <button onClick={async () => { await window.appServer.stopServer(); await window.appServer.clearConfig(); flash("ok", "Sunucu modu kapatıldı."); setTimeout(() => window.location.reload(), 600); }}
              style={{ padding: "9px 18px", background: "var(--surface, #ffffff)", color: "var(--n400, #94a3b8)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Yerel Moda Dön
            </button>
          </div>
        </Section>
        {running && <SettingsTwoFactor flash={flash} />}
        {running && <Section title="Kullanıcı Yönetimi" icon="settings"><UserManager flash={flash} settingsGroups={settingsGroups} /></Section>}
      </>
    );
  }

  // ── İstemci modu aktif ────────────────────────────────────────────────────
  if (mode === "client") {
    return (
      <>
        <Section title="Sunucu Bağlantısı" icon="settings">
          <div style={{ marginBottom: 16, padding: "14px 16px", background: "var(--grnBg3, #d1fae5)", borderRadius: 10, border: "1px solid var(--grnBr2, #6ee7b7)" }}>
            <div style={{ fontWeight: 700, color: "var(--grn800, #065f46)", fontSize: 14, marginBottom: 4 }}>Sunucuya Bağlı</div>
            <div style={{ fontSize: 12, color: "var(--emerald2, #047857)" }}><b>Sunucu:</b> {cfg?.serverUrl}</div>
            <div style={{ fontSize: 12, color: "var(--emerald2, #047857)" }}>
              <b>Kullanıcı:</b> {cfg?.username}
              <span style={{ marginLeft: 8, background: cfg?.role === "admin" ? "var(--ambBg2, #fef3c7)" : "var(--bluBg, #eff6ff)", color: cfg?.role === "admin" ? "var(--amb800, #92400e)" : "var(--blu800, #1e40af)", padding: "1px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                {cfg?.role === "admin" ? "Yönetici" : "Kullanıcı"}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={async () => { await window.appServer.logout(); flash("ok", "Oturum kapatıldı."); setTimeout(() => window.location.reload(), 600); }}
              style={{ padding: "9px 18px", background: "var(--surface, #ffffff)", color: "#e85d1a", border: "1px solid #e85d1a", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Oturumu Kapat
            </button>
            <button onClick={async () => { await window.appServer.clearConfig(); flash("ok", "Yerel moda geçildi."); setTimeout(() => window.location.reload(), 600); }}
              style={{ padding: "9px 18px", background: "var(--surface, #ffffff)", color: "var(--n400, #94a3b8)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Bağlantıyı Kes (Yerel Mod)
            </button>
          </div>
        </Section>
        <SettingsTwoFactor flash={flash} />
        {cfg?.role === "admin" && <Section title="Kullanıcı Yönetimi" icon="settings"><UserManager flash={flash} settingsGroups={settingsGroups} /></Section>}
      </>
    );
  }

  // ── Henüz yapılandırılmamış ───────────────────────────────────────────────
  return (
    <Section title="Çoklu Kullanıcı Kurulumu" icon="settings">
      <div style={{ fontSize: 13, color: "var(--n500, #64748b)", marginBottom: 20, lineHeight: 1.6 }}>
        Aynı verilere birden fazla bilgisayardan erişmek için bu PC'nin rolünü seçin.
      </div>

      {pick === null && (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <button onClick={() => setPick("server")} style={{ flex: 1, minWidth: 200, padding: "20px 18px", background: "var(--ambBg3, #fff7ed)", border: "2px solid #e85d1a", borderRadius: 12, cursor: "pointer", textAlign: "left" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--orTx, #c2410c)", marginBottom: 6 }}>🖥 Bu PC Sunucu Olsun</div>
            <div style={{ fontSize: 12, color: "#9a3412", lineHeight: 1.5 }}>
              Bu bilgisayar veriye doğrudan erişir ve diğerlerine hizmet verir. Açık kalmalıdır.
            </div>
          </button>
          <button onClick={() => setPick("client")} style={{ flex: 1, minWidth: 200, padding: "20px 18px", background: "var(--bluBg, #eff6ff)", border: "2px solid var(--blu500, #3b82f6)", borderRadius: 12, cursor: "pointer", textAlign: "left" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--blu700, #1d4ed8)", marginBottom: 6 }}>💻 Başka Sunucuya Bağlan</div>
            <div style={{ fontSize: 12, color: "var(--blu800, #1e40af)", lineHeight: 1.5 }}>
              Ağdaki başka bir PC'deki sunucuya bağlanır ve oradan veri okur/yazar.
            </div>
          </button>
        </div>
      )}

      {pick === "server" && (
        <div style={{ marginTop: 20 }}>
          <button onClick={() => setPick(null)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--n600, #475569)", background: "var(--surface, #ffffff)", border: "1px solid var(--n300, #cbd5e1)", borderRadius: 8, padding: "7px 14px", cursor: "pointer", marginBottom: 18 }}>← Geri</button>
          <SetupWizard flash={flash} onDone={() => { reloadCfg(); }} />
        </div>
      )}

      {pick === "client" && (
        <div style={{ marginTop: 20 }}>
          <button onClick={() => setPick(null)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--n600, #475569)", background: "var(--surface, #ffffff)", border: "1px solid var(--n300, #cbd5e1)", borderRadius: 8, padding: "7px 14px", cursor: "pointer", marginBottom: 18 }}>← Geri</button>
          {connTrust && (
            <div style={{ marginBottom: 16, padding: "14px 16px", background: connTrust.mismatch ? "var(--redBg, #fef2f2)" : "var(--ambBg3, #fff7ed)", border: `1px solid ${connTrust.mismatch ? "#fca5a5" : "var(--ambBr3, #fed7aa)"}`, borderRadius: 10, maxWidth: 400 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: connTrust.mismatch ? "var(--red800, #991b1b)" : "#9a3412", marginBottom: 6 }}>
                {connTrust.mismatch ? "⚠ Sunucu Kimliği Değişti" : "Sunucuya İlk Bağlantı"}
              </div>
              <div style={{ fontSize: 12, color: "var(--stone, #78716c)", marginBottom: 8, lineHeight: 1.5 }}>
                {connTrust.mismatch
                  ? "Sertifika parmak izi daha önce kaydettiğinizden farklı. Sunucu yeniden kurulduysa normaldir; değilse araya biri girmiş olabilir."
                  : "Bu parmak izinin sunucudaki (Ayarlar > Bu PC Sunucu) değerle aynı olduğunu doğrulayıp güvenin."}
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 12, color: "var(--stoneInk, #1c1917)", background: "var(--surface, #ffffff)", border: "1px solid #e7e5e4", borderRadius: 6, padding: "8px 10px", wordBreak: "break-all", marginBottom: 10 }}>{connTrust.fp}</div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "var(--stone, #78716c)", marginBottom: 10, cursor: "pointer", lineHeight: 1.45 }}>
                <input type="checkbox" checked={connTrustChecked} onChange={e => setConnTrustChecked(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
                <span>Bu parmak izini sunucudaki (Ayarlar &gt; Bu PC Sunucu) değerle karşılaştırdım ve aynı.</span>
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" disabled={connecting || !connTrustChecked} onClick={() => { const mode = connTrust.mismatch ? "force" : "trust"; setConnTrustMode(mode); setConnTrust(null); doConnect(mode === "force" ? { force: true } : { trust: true }); }}
                  style={{ padding: "8px 16px", background: (connecting || !connTrustChecked) ? "var(--n300, #cbd5e1)" : connTrust.mismatch ? "var(--red600, #dc2626)" : "#e85d1a", color: "#fff", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: (connecting || !connTrustChecked) ? "default" : "pointer" }}>
                  {connecting ? "Bağlanıyor..." : connTrust.mismatch ? "Yine de Güven" : "Güven ve Bağlan"}
                </button>
                <button type="button" onClick={() => { setConnTrust(null); setConnTrustMode(null); }} style={{ padding: "8px 16px", background: "var(--surface, #ffffff)", color: "var(--n500, #64748b)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Vazgeç</button>
              </div>
            </div>
          )}
          <form onSubmit={(e) => {
            e.preventDefault();
            if (connLock > 0) return; // kilitliyken gönderme
            if (!serverUrl.trim() || !username.trim() || !password) { flash("err", "Tüm alanlar zorunlu"); return; }
            if (need2fa && !totpCode.trim()) { flash("err", "Doğrulama kodu gerekli"); return; }
            doConnect();
          }} style={{ display: "grid", gap: 14, maxWidth: 400 }}>
            <div>
              <label style={lbl}>Sunucu Adresi</label>
              <input style={inp} type="text" value={serverUrl} onChange={e => { setServerUrl(e.target.value); setConnTrustMode(null); }} placeholder="http://192.168.1.10:3000" />
              <div style={{ fontSize: 11.5, color: "var(--n400, #94a3b8)", marginTop: 4, lineHeight: 1.5 }}>
                Fabrika içindeyseniz yerel adresi (<span style={{ fontFamily: "monospace" }}>http://192.168...:3000</span>), uzaktan bağlanıyorsanız sunucunun Tailscale adresini (<span style={{ fontFamily: "monospace" }}>http://100.x.x.x:3000</span>) yazın. Uzaktan bağlantı için hem bu bilgisayarda hem sunucuda Tailscale açık olmalı.
                <br />Bağlantı otomatik olarak şifrelenir (HTTPS): ilk bağlanışta sunucunun güvenlik parmak izini onaylamanız istenir. Bu parmak izinin sunucudaki (o PC'de <b>Ayarlar &gt; Bu PC Sunucu</b>) değerle aynı olduğunu doğrulayın.
              </div>
            </div>
            <div><label style={lbl}>Kullanıcı Adı</label><input style={inp} type="text" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" /></div>
            <div><label style={lbl}>Şifre</label><input style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></div>
            {need2fa && (
              <div>
                <label style={lbl}>Doğrulama Kodu (Authenticator)</label>
                <input style={{ ...inp, letterSpacing: 4, textAlign: "center", fontSize: 18 }} type="text" inputMode="numeric" value={totpCode}
                  onChange={e => setTotpCode(e.target.value)} placeholder="6 haneli kod" autoFocus autoComplete="one-time-code" />
                <div style={{ fontSize: 11.5, color: "var(--n400, #94a3b8)", marginTop: 4 }}>Telefonunuzdaki authenticator kodunu girin. Telefon yoksa yedek kodlarınızdan birini yazabilirsiniz.</div>
              </div>
            )}
            {connLock > 0 && (
              <div style={{ fontSize: 12, color: "var(--amb700, #b45309)", marginTop: -4 }}>Çok fazla yanlış deneme. {connLock} sn sonra tekrar deneyin.</div>
            )}
            <button type="submit" disabled={connecting || connLock > 0} style={{ padding: "10px 20px", background: "var(--blu500, #3b82f6)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: (connecting || connLock > 0) ? "default" : "pointer", opacity: (connecting || connLock > 0) ? .7 : 1, width: "fit-content" }}>
              {connecting ? "Bağlanıyor..." : connLock > 0 ? `${connLock} sn bekleyin` : "Bağlan"}
            </button>
          </form>
          <UzaktanErisimYardim />
        </div>
      )}
    </Section>
  );
}
