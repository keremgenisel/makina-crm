import { useState, useEffect } from "react";
import { Icon, Btn, Modal, PasswordInput } from "../ui";
import { Section } from "./Section";

export const SettingsDanger = ({ flash }) => {
  const [confirmUninstall, setConfirmUninstall] = useState(false);
  const [askPassword, setAskPassword] = useState(false); // kaldırma öncesi şifre doğrulama adımı
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [lockRemaining, setLockRemaining] = useState(0);

  useEffect(() => {
    if (lockRemaining <= 0) return;
    const t = setInterval(() => setLockRemaining(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [lockRemaining > 0]);

  // Kaldırmayı yürüt (uygulamayı kapatır)
  const runUninstall = async () => {
    if (window.appControl?.uninstall) {
      const ok = await window.appControl.uninstall();
      if (!ok) flash("err", "Kaldırma aracı bulunamadı. Denetim Masası'ndaki Programlar bölümünden kaldırabilirsiniz.");
    } else {
      flash("err", "Bu özellik yalnızca kurulu uygulamada çalışır.");
    }
  };

  // "Evet, Kaldır" sonrası: uygulama kilidi açıksa önce şifre sor, değilse doğrudan kaldır
  const doUninstall = async () => {
    setConfirmUninstall(false);
    const st = await window.appLock?.status?.()?.catch(() => null);
    if (st?.enabled) { setPw(""); setPwError(""); setLockRemaining(0); setAskPassword(true); }
    else await runUninstall();
  };

  const confirmPasswordAndUninstall = async () => {
    setPwBusy(true); setPwError("");
    try {
      const res = await window.appLock.verify(pw);
      if (res?.ok) { setAskPassword(false); await runUninstall(); }
      else {
        setPwError(res?.error || "Şifre yanlış.");
        if (res?.retryAfterMs > 0) setLockRemaining(Math.ceil(res.retryAfterMs / 1000));
      }
    } catch {
      setPwError("Doğrulama başarısız.");
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <>
      <Section title="Tehlikeli Bölge" icon="trash">
        <div style={{ fontSize: 13, color: "var(--n500, #64748b)", marginBottom: 20, lineHeight: 1.6 }}>
          Buradaki işlemler <b>geri alınamaz</b> veya ciddi sonuçlar doğurabilir. Dikkatli ilerleyin.
        </div>

        <div style={{ border: "1.5px solid var(--redBr, #fecaca)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ background: "var(--redBg, #fef2f2)", padding: "12px 18px", borderBottom: "1px solid var(--redBr, #fecaca)", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="trash" size={15} />
            <span style={{ fontSize: 13, fontWeight: 800, color: "var(--red700, #b91c1c)" }}>Uygulamayı Kaldır</span>
          </div>
          <div style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 13, color: "var(--n500, #64748b)", marginBottom: 14, lineHeight: 1.6 }}>
              <b>Müşteri ve servis verileriniz silinmez,</b> tekrar
              kurarsanız kayıtlarınız geri gelir. Kaldırmadan önce Ayarlar → Yedekleme'den yedek almanız önerilir.
            </div>
            <Btn variant="danger" onClick={() => setConfirmUninstall(true)}>
              <Icon name="trash" size={14} /> Uygulamayı Kaldır
            </Btn>
          </div>
        </div>
      </Section>

      {confirmUninstall && (
        <Modal title="Uygulamayı Kaldır" onClose={() => setConfirmUninstall(false)}>
          <div style={{ fontSize: 14, color: "var(--n600, #475569)", lineHeight: 1.7, marginBottom: 8 }}>
            Altunmak CRM bilgisayarınızdan kaldırılacak ve uygulama kapanacak.
          </div>
          <div style={{ fontSize: 13, color: "var(--n500, #64748b)", lineHeight: 1.6, marginBottom: 20 }}>
            Verileriniz silinmez; tekrar kurulumda geri gelir. Devam etmeden önce
            <b> yedek almanız</b> önerilir.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setConfirmUninstall(false)}>Vazgeç</Btn>
            <Btn variant="danger" onClick={doUninstall}><Icon name="trash" size={14} /> Evet, Kaldır</Btn>
          </div>
        </Modal>
      )}

      {askPassword && (
        <Modal title="Uygulama Şifresi" onClose={() => setAskPassword(false)}>
          <div style={{ fontSize: 13, color: "var(--n500, #64748b)", lineHeight: 1.6, marginBottom: 14 }}>
            Kaldırmayı onaylamak için uygulama giriş şifrenizi girin.
          </div>
          <div style={{ marginBottom: 12 }}>
            <PasswordInput value={pw} onChange={e => setPw(e.target.value)} placeholder="Uygulama şifresi" autoFocus
              onKeyDown={e => { if (e.key === "Enter" && !pwBusy && lockRemaining === 0) confirmPasswordAndUninstall(); }} />
          </div>
          {pwError && <div style={{ fontSize: 13, fontWeight: 600, color: "var(--red800, #991b1b)", marginBottom: 10 }}>✗ {pwError}</div>}
          {lockRemaining > 0 && <div style={{ fontSize: 12, color: "var(--amb700, #b45309)", marginBottom: 10 }}>Çok fazla yanlış deneme. {lockRemaining} sn sonra tekrar deneyin.</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setAskPassword(false)}>Vazgeç</Btn>
            <Btn variant="danger" onClick={confirmPasswordAndUninstall} disabled={pwBusy || lockRemaining > 0}>
              <Icon name="trash" size={14} /> {pwBusy ? "Doğrulanıyor..." : lockRemaining > 0 ? `${lockRemaining} sn bekleyin` : "Kaldır"}
            </Btn>
          </div>
        </Modal>
      )}
    </>
  );
};

