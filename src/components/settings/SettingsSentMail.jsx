import { useState, useEffect } from "react";
import { Icon, Btn, Pagination } from "../ui";
import { usePagination } from "../../hooks/usePagination";
import { Section } from "./Section";

export const SettingsSentMail = () => {
  // ── Gönderilen E-postalar: tüm appMail.send() çağrılarının (Customers/SimpleDealers/Settings'ten)
  // main process tarafında tutulan düz günlüğü — buradan sadece okunur, kaynak kayda link verilmez ──
  const [sentEmailLog, setSentEmailLog] = useState([]);
  const { page: emailLogPage, setPage: setEmailLogPage, paged: sentEmailLogPaged, perPage: EMAIL_LOG_PER_PAGE } = usePagination(sentEmailLog, 10);
  const loadSentEmailLog = async () => {
    if (!window.appMail?.getLog) return;
    const log = await window.appMail.getLog();
    setSentEmailLog((log || []).slice().reverse());
  };
  useEffect(() => { loadSentEmailLog(); }, []);

  return (
    <Section title="Gönderilen E-postalar" icon="mail">
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
        Servis formu, makina raporu, dışa aktarım veya bayi e-postası olarak gönderilen tüm e-postaların kaydı (en yeni üstte).
      </div>
      <div style={{ marginBottom: 14 }}>
        <Btn small variant="ghost" onClick={loadSentEmailLog}><Icon name="refresh" size={12} /> Yenile</Btn>
      </div>
      {sentEmailLog.length === 0 ? (
        <div style={{ padding: "24px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Henüz gönderilmiş e-posta yok.</div>
      ) : (
        <>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: "#f8fafc" }}>
                {["Tarih", "Kime", "Konu", "Durum"].map(h => <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {sentEmailLogPaged.map((e, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 16px", fontSize: 12, color: "#64748b" }}>{e.timestamp ? new Date(e.timestamp).toLocaleString("tr-TR") : "—"}</td>
                    <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600 }}>{e.to || "—"}</td>
                    <td style={{ padding: "10px 16px", fontSize: 13 }}>{e.subject || "—"}</td>
                    <td style={{ padding: "10px 16px" }}>
                      {e.success ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#065f46", background: "#d1fae5", borderRadius: 6, padding: "2px 8px" }}>✓ Başarılı</span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", background: "#fee2e2", borderRadius: 6, padding: "2px 8px" }} title={e.error || ""}>✗ Başarısız</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination total={sentEmailLog.length} page={emailLogPage} setPage={setEmailLogPage} perPage={EMAIL_LOG_PER_PAGE} />
        </>
      )}
    </Section>
  );
};
