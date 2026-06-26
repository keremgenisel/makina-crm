import { useState } from "react";
import { Icon, Btn, Modal } from "../ui";
import { Section } from "./Section";

export const SettingsDanger = ({ flash }) => {
  const [confirmUninstall, setConfirmUninstall] = useState(false);

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
      <Section title="Tehlikeli Bölge" icon="trash">
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20, lineHeight: 1.6 }}>
          Buradaki işlemler <b>geri alınamaz</b> veya ciddi sonuçlar doğurabilir. Dikkatli ilerleyin.
        </div>

        <div style={{ border: "1.5px solid #fecaca", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ background: "#fef2f2", padding: "12px 18px", borderBottom: "1px solid #fecaca", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="trash" size={15} />
            <span style={{ fontSize: 13, fontWeight: 800, color: "#b91c1c" }}>Uygulamayı Kaldır</span>
          </div>
          <div style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14, lineHeight: 1.6 }}>
              Uygulamayı bilgisayarınızdan kaldırır. <b>Müşteri ve servis verileriniz silinmez</b> — tekrar
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
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 8 }}>
            Altunmak CRM bilgisayarınızdan kaldırılacak ve uygulama kapanacak.
          </div>
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 20 }}>
            Verileriniz silinmez; tekrar kurulumda geri gelir. Devam etmeden önce
            <b> yedek almanız</b> önerilir.
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
