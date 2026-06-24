import { useState, useEffect } from "react";
import { Icon, Btn, Field, Input, PasswordInput, Warn, EMAIL_RE, Select, Modal } from "../ui";
import { Section } from "./Section";

export const SettingsMail = ({ flash }) => {
  // ── E-posta (genel SMTP — sunucu/port elle girilir, sağlayıcıya özel sabit yok) ──
  const [mailStatus, setMailStatus] = useState({ configured: false, email: "", host: "", port: 465, secure: true });
  const [mailForm, setMailForm] = useState({ email: "", appPassword: "", host: "", port: 465, secure: true });
  const [mailSaving, setMailSaving] = useState(false);
  const [mailTest, setMailTest] = useState({ state: "idle", error: null }); // idle | testing | ok | error
  const [confirmClearMail, setConfirmClearMail] = useState(false);

  const loadMailStatus = async () => {
    if (!window.appMail) return;
    const s = await window.appMail.credentialsStatus();
    setMailStatus(s);
    setMailForm(p => ({ ...p, email: s.email || p.email, host: s.host || p.host, port: s.port || p.port, secure: s.secure !== false }));
  };
  useEffect(() => { loadMailStatus(); }, []);

  const saveMailCreds = async () => {
    if (!window.appMail) return;
    if (!EMAIL_RE.test(mailForm.email || "")) { flash("err", "Geçerli bir e-posta adresi girin."); return; }
    if (!mailForm.host?.trim()) { flash("err", "SMTP sunucu adresi girilmedi."); return; }
    if (!mailForm.appPassword?.trim()) { flash("err", "Şifre girilmedi."); return; }
    setMailSaving(true);
    const res = await window.appMail.saveCredentials({
      email: mailForm.email.trim(), appPassword: mailForm.appPassword.trim(),
      host: mailForm.host.trim(), port: mailForm.port, secure: mailForm.secure,
    });
    setMailSaving(false);
    if (res?.ok) {
      flash("ok", "E-posta hesabı bağlandı.");
      setMailForm(p => ({ ...p, appPassword: "" }));
      setMailTest({ state: "idle", error: null });
      loadMailStatus();
    } else {
      flash("err", res?.error || "Kaydedilemedi.");
    }
  };

  const doTestMail = async () => {
    if (!window.appMail) return;
    setMailTest({ state: "testing", error: null });
    const res = await window.appMail.test();
    setMailTest(res?.ok ? { state: "ok", error: null } : { state: "error", error: res?.error || "Bağlantı doğrulanamadı." });
  };

  const doClearMail = async () => {
    if (!window.appMail) return;
    await window.appMail.clearCredentials();
    setConfirmClearMail(false);
    setMailForm({ email: "", appPassword: "" });
    setMailTest({ state: "idle", error: null });
    loadMailStatus();
    flash("ok", "E-posta bağlantısı kaldırıldı.");
  };

  return (
    <>
      <Section title="E-posta Ayarları (SMTP)" icon="mail">
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
          "E-posta Gönder" butonlarının çalışması için e-posta hesabınızı buradan bağlayın.
        </div>

        {!window.appMail ? (
          <div style={{ fontSize: 13, color: "#64748b", background: "#f8fafc", padding: "10px 14px", borderRadius: 10, border: "1px dashed #e2e8f0" }}>
            Bu özellik yalnızca kurulu uygulamada çalışır.
          </div>
        ) : (
          <>
            {mailStatus.configured && (
              <div style={{ fontSize: 13, fontWeight: 700, color: "#065f46", background: "#d1fae5", padding: "8px 14px", borderRadius: 10, marginBottom: 16, display: "inline-block" }}>
                ✓ Bağlı: {mailStatus.email} ({mailStatus.host}:{mailStatus.port})
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              <Field label="E-posta">
                <Input value={mailForm.email} onChange={e => setMailForm(p => ({ ...p, email: e.target.value }))} placeholder="ornek@firma.com" />
                <Warn>{mailForm.email && !EMAIL_RE.test(mailForm.email) ? "Geçersiz e-posta formatı" : ""}</Warn>
              </Field>
              <div />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              <Field label="Giden Sunucu (SMTP)">
                <Input value={mailForm.host} onChange={e => setMailForm(p => ({ ...p, host: e.target.value }))} placeholder="mailbox.servervibe.com" />
              </Field>
              <Field label="Port / Güvenlik">
                <Select value={`${mailForm.port}-${mailForm.secure}`}
                  onChange={e => { const [port, secure] = e.target.value.split("-"); setMailForm(p => ({ ...p, port: Number(port), secure: secure === "true" })); }}>
                  <option value="465-true">465 (SSL)</option>
                  <option value="587-false">587 (STARTTLS)</option>
                </Select>
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              <Field label="Şifre">
                <PasswordInput value={mailForm.appPassword} onChange={e => setMailForm(p => ({ ...p, appPassword: e.target.value }))} placeholder={mailStatus.configured ? "•••••••• (değiştirmek için yeniden girin)" : "E-posta şifresi"} />
              </Field>
              <div />
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Btn onClick={saveMailCreds} disabled={mailSaving}><Icon name="check" size={14} /> {mailSaving ? "Kaydediliyor..." : "Kaydet"}</Btn>
              <Btn variant="ghost" onClick={doTestMail} disabled={!mailStatus.configured || mailTest.state === "testing"}>
                <Icon name="refresh" size={14} /> {mailTest.state === "testing" ? "Test ediliyor..." : "Bağlantıyı Test Et"}
              </Btn>
              {mailStatus.configured && (
                <Btn variant="danger" onClick={() => setConfirmClearMail(true)}><Icon name="trash" size={14} /> Bağlantıyı Kaldır</Btn>
              )}
            </div>
            {mailTest.state === "ok" && (
              <div style={{ fontSize: 13, fontWeight: 600, color: "#065f46", marginTop: 12 }}>✓ Bağlantı başarılı.</div>
            )}
            {mailTest.state === "error" && (
              <div style={{ fontSize: 13, fontWeight: 600, color: "#991b1b", marginTop: 12 }}>✗ {mailTest.error}</div>
            )}
          </>
        )}
      </Section>

      {/* E-posta bağlantısını kaldırma onayı */}
      {confirmClearMail && (
        <Modal title="E-posta Bağlantısını Kaldır" onClose={() => setConfirmClearMail(false)}>
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 20 }}>
            Kayıtlı e-posta hesabı bilgileri silinecek. "E-posta Gönder" butonları tekrar bağlanana kadar çalışmaz.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setConfirmClearMail(false)}>Vazgeç</Btn>
            <Btn variant="danger" onClick={doClearMail}><Icon name="trash" size={14} /> Evet, Kaldır</Btn>
          </div>
        </Modal>
      )}
    </>
  );
};
