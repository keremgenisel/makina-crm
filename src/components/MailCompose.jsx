import { useState } from "react";
import { Modal, Field, Input, Warn, Btn, Icon, EMAIL_RE } from "./ui";
import { sendMailLogged } from "../lib/audit";

// E-posta gönderme durumu + gönderim mantığı. Müşteri/Bayi/Evrak/Üretim/Dışa Aktarma'da birebir
// aynıydı (validate → gönderiliyor → sendMailLogged → başarıda kapat / hatada mesaj), buraya
// toplandı. Payload çağırana özgü kalır (pdfHtml / attachments / type); başarı toast'ını çağıran
// döndürülen res'e göre gösterir (metin aynı: "E-posta gönderildi.").
export function useMailSender(serverPermissions) {
  const [mailDraft, setMailDraft] = useState(null);
  const [mailSendState, setMailSendState] = useState({ state: "idle", error: null });
  // payload: sendMailLogged'e gidecek nesne. Dönüş: res (başarıda çağıran kendi toast'ını gösterir);
  // erken çıkışta (appMail yok / geçersiz e-posta) undefined.
  const sendMail = async (payload) => {
    if (!window.appMail || !mailDraft) return;
    if (!EMAIL_RE.test((payload?.to || "").trim())) { setMailSendState({ state: "error", error: "Geçerli bir alıcı e-posta adresi girin." }); return; }
    setMailSendState({ state: "sending", error: null });
    const res = await sendMailLogged({ ...payload, to: (payload.to || "").trim() }, serverPermissions);
    if (res?.ok) { setMailSendState({ state: "idle", error: null }); setMailDraft(null); }
    else setMailSendState({ state: "error", error: res?.error || "Gönderilemedi." });
    return res;
  };
  return { mailDraft, setMailDraft, mailSendState, setMailSendState, sendMail };
}

// Ortak e-posta oluşturma modalı: Kime/Konu/Mesaj + çağırana özgü ek alanı (ekAlani) + hata + Gönder.
export function MailComposeModal({ draft, setDraft, sendState, onSend, ekAlani = null }) {
  const kapat = () => setDraft(null);
  return (
    <Modal title="E-posta Gönder" onClose={kapat}>
      {!window.appMail ? (
        <div style={{ fontSize: 13, color: "var(--n500, #64748b)", background: "var(--n100, #f8fafc)", padding: "10px 14px", borderRadius: 10, border: "1px dashed var(--n200, #e2e8f0)" }}>
          Bu özellik yalnızca kurulu uygulamada çalışır.
        </div>
      ) : (
        <>
          <Field label="Kime">
            <Input value={draft.to} onChange={e => setDraft(p => ({ ...p, to: e.target.value }))} placeholder="ornek@firma.com" />
            <Warn>{draft.to && !EMAIL_RE.test(draft.to) ? "Geçersiz e-posta formatı" : ""}</Warn>
          </Field>
          <Field label="Konu">
            <Input value={draft.subject} onChange={e => setDraft(p => ({ ...p, subject: e.target.value }))} />
          </Field>
          <Field label="Mesaj">
            <textarea value={draft.text} onChange={e => setDraft(p => ({ ...p, text: e.target.value }))}
              placeholder="Mesajınızı yazın..."
              className="input" style={{ resize: "vertical", minHeight: 110 }} />
          </Field>
          {ekAlani}
          {sendState.state === "error" && (
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--red800, #991b1b)", marginTop: 12, marginBottom: 12 }}>✗ {sendState.error}</div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <Btn variant="ghost" onClick={kapat}>İptal</Btn>
            <Btn onClick={onSend} disabled={sendState.state === "sending"}>
              <Icon name="mail" size={14} /> {sendState.state === "sending" ? "Gönderiliyor..." : "Gönder"}
            </Btn>
          </div>
        </>
      )}
    </Modal>
  );
}
