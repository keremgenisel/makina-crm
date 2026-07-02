import { useState, useEffect } from "react";
import { Icon, Btn, Modal, ConfirmDialog, Pagination } from "../ui";
import { useFilteredList } from "../../hooks/useFilteredList";
import { Section } from "./Section";

const TYPE_LABELS = {
  teklif: "Teklif",
  proforma: "Proforma",
  musteri: "Müşteri",
  bayi: "Bayi",
  disaaktarim: "Dışa Aktarım",
  hata: "Hata",
  diger: "Diğer",
};

const inferType = (entry) => {
  if (entry.type) return entry.type;
  const s = entry.subject || "";
  if (/^teklif/i.test(s)) return "teklif";
  if (/^proforma/i.test(s)) return "proforma";
  if (/makina servis|servis formu/i.test(s)) return "musteri";
  if (/altunta[sş] makina/i.test(s)) return "disaaktarim";
  if (/hata raporu/i.test(s)) return "hata";
  return "diger";
};

export const SettingsSentMail = () => {
  // ── Gönderilen E-postalar: tüm appMail.send() çağrılarının (Customers/SimpleDealers/Settings'ten)
  // main process tarafında tutulan düz günlüğü — buradan sadece okunur, kaynak kayda link verilmez.
  // Ek (PDF/dosya) içeriği hiç saklanmaz, sadece dosya adı/türü; gövde metni (text) saklanır.
  const [sentEmailLog, setSentEmailLog] = useState([]);
  const [deletedEmailLog, setDeletedEmailLog] = useState([]);
  const [trashTypeFilter, setTrashTypeFilter] = useState("all");
  const [viewing, setViewing] = useState(null); // içeriği görüntülenen kayıt
  const [confirmPurge, setConfirmPurge] = useState(null); // kalıcı silme onayı bekleyen kayıt
  const [confirmEmptyMailTrash, setConfirmEmptyMailTrash] = useState(false);
  const { search: sentSearch, setSearch: setSentSearch, page: emailLogPage, setPage: setEmailLogPage, filtered: sentEmailLogFiltered, paged: sentEmailLogPaged, perPage: EMAIL_LOG_PER_PAGE } =
    useFilteredList(sentEmailLog, { searchFields: ["to", "subject"], perPage: 10 });
  const { search: delSearch, setSearch: setDelSearch, page: trashPage, setPage: setTrashPage, filtered: deletedEmailLogFiltered, paged: deletedEmailLogPaged, perPage: TRASH_PER_PAGE } =
    useFilteredList(deletedEmailLog, {
      searchFields: ["to", "subject"],
      perPage: 10,
      filterFn: trashTypeFilter === "all" ? null : (e => inferType(e) === trashTypeFilter),
      sortFn: (a, b) => (b.deletedAt || "").localeCompare(a.deletedAt || ""),
    });

  const loadSentEmailLog = async () => {
    if (!window.appMail?.getLog) return;
    const log = await window.appMail.getLog();
    setSentEmailLog((log || []).slice().reverse());
  };
  const loadDeletedEmailLog = async () => {
    if (!window.appMail?.getDeletedLog) return;
    const log = await window.appMail.getDeletedLog();
    setDeletedEmailLog(log || []);
  };
  const reloadAll = () => { loadSentEmailLog(); loadDeletedEmailLog(); };
  useEffect(() => { reloadAll(); }, []);

  const deleteEntry = async (id) => { await window.appMail.deleteLogEntry(id); reloadAll(); };
  const restoreEntry = async (id) => { await window.appMail.restoreLogEntry(id); reloadAll(); };
  const purgeEntry = async (id) => { await window.appMail.purgeLogEntry(id); setConfirmPurge(null); reloadAll(); };
  const emptyMailTrash = async () => {
    for (const e of deletedEmailLog) await window.appMail.purgeLogEntry(e.id);
    setConfirmEmptyMailTrash(false);
    reloadAll();
  };

  return (
    <>
      <Section title="Gönderilen E-postalar" icon="mail">
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
          Servis formu, makina raporu, dışa aktarım veya bayi e-postası olarak gönderilen tüm e-postaların kaydı (en yeni üstte).
        </div>
        <div style={{ marginBottom: 14 }}>
          <Btn small variant="ghost" onClick={reloadAll}><Icon name="refresh" size={12} /> Yenile</Btn>
        </div>
        {sentEmailLog.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Henüz gönderilmiş e-posta yok.</div>
        ) : (
          <>
            <div style={{ position: "relative", marginBottom: 14 }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={15} /></span>
              <input value={sentSearch} onChange={e => setSentSearch(e.target.value)} placeholder="Alıcı veya konu ara..."
                style={{ padding: "9px 12px 9px 36px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "#f8fafc", outline: "none" }} />
            </div>
            {sentEmailLogFiltered.length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Arama sonucu bulunamadı.</div>
            ) : (
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#f8fafc" }}>
                  {["Tarih", "Kime", "Konu", "Durum", ""].map(h => <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {sentEmailLogPaged.map((e, i) => (
                    <tr key={e.id || i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 16px", fontSize: 12, color: "#64748b" }}>{e.timestamp ? new Date(e.timestamp).toLocaleString("tr-TR") : "—"}</td>
                      <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600 }}>{e.to || "—"}</td>
                      <td style={{ padding: "10px 16px", fontSize: 13 }}>
                        {e.subject || "—"}
                        {Array.isArray(e.attachments) && e.attachments.length > 0 && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: "#94a3b8" }} title={e.attachments.map(a => a.filename).join(", ")}>
                            📎 {e.attachments.length}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        {e.success ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#065f46", background: "#d1fae5", borderRadius: 6, padding: "2px 8px" }}>✓ Başarılı</span>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", background: "#fee2e2", borderRadius: 6, padding: "2px 8px" }} title={e.error || ""}>✗ Başarısız</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <Btn small variant="ghost" onClick={() => setViewing(e)}><Icon name="eye" size={12} /> İçerik</Btn>
                          <Btn small variant="danger" onClick={() => deleteEntry(e.id)}><Icon name="trash" size={12} /> Sil</Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
            <Pagination total={sentEmailLogFiltered.length} page={emailLogPage} setPage={setEmailLogPage} perPage={EMAIL_LOG_PER_PAGE} />
          </>
        )}
      </Section>

      {/* ── E-posta Çöp Kutusu ── */}
      <Section title="Silinen E-postalar" icon="trash">
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
          Silinen e-posta kayıtları buraya taşınır ve <b>30 gün</b> sonra otomatik olarak kalıcı silinir. Bu süre içinde geri alabilirsiniz.
        </div>
        {deletedEmailLog.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <Btn variant="danger" onClick={() => setConfirmEmptyMailTrash(true)}>
              <Icon name="trash" size={14} /> Çöp Kutusunu Boşalt
            </Btn>
          </div>
        )}
        {deletedEmailLog.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Silinen e-posta yok.</div>
        ) : (
          <>
            {/* Tür filtresi */}
            {(() => {
              const presentTypes = [...new Set(deletedEmailLog.map(inferType))];
              if (presentTypes.length < 2) return null;
              return (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {[["all", "Tümü"], ...presentTypes.map(t => [t, TYPE_LABELS[t] || t])].map(([val, label]) => (
                    <button key={val} onClick={() => setTrashTypeFilter(val)}
                      style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                        border: "1px solid", borderColor: trashTypeFilter === val ? "#e85d1a" : "#e2e8f0",
                        background: trashTypeFilter === val ? "#e85d1a" : "#f8fafc",
                        color: trashTypeFilter === val ? "#fff" : "#64748b" }}>
                      {label}
                    </button>
                  ))}
                </div>
              );
            })()}
            <div style={{ position: "relative", marginBottom: 14 }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={15} /></span>
              <input value={delSearch} onChange={e => setDelSearch(e.target.value)} placeholder="Alıcı veya konu ara..."
                style={{ padding: "9px 12px 9px 36px", border: "1px solid #e2e8f0", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "#f8fafc", outline: "none" }} />
            </div>
            {deletedEmailLogFiltered.length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Arama sonucu bulunamadı.</div>
            ) : (
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#f8fafc" }}>
                  {["Tarih", "Kime", "Konu", ""].map(h => <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#475569" }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {deletedEmailLogPaged.map((e, i) => (
                    <tr key={e.id || i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 16px", fontSize: 12, color: "#64748b" }}>{e.timestamp ? new Date(e.timestamp).toLocaleString("tr-TR") : "—"}</td>
                      <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600 }}>{e.to || "—"}</td>
                      <td style={{ padding: "10px 16px", fontSize: 13 }}>{e.subject || "—"}</td>
                      <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <Btn small variant="ghost" onClick={() => restoreEntry(e.id)}><Icon name="refresh" size={12} /> Geri Al</Btn>
                          <Btn small variant="danger" onClick={() => setConfirmPurge(e)}><Icon name="trash" size={12} /> Kalıcı Sil</Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
            <Pagination total={deletedEmailLogFiltered.length} page={trashPage} setPage={setTrashPage} perPage={TRASH_PER_PAGE} />
          </>
        )}
      </Section>

      {/* İçerik görüntüleme */}
      {viewing && (
        <Modal title="E-posta İçeriği" onClose={() => setViewing(null)}>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12, lineHeight: 1.6 }}>
            <b>Kime:</b> {viewing.to || "—"}<br />
            <b>Konu:</b> {viewing.subject || "—"}<br />
            <b>Tarih:</b> {viewing.timestamp ? new Date(viewing.timestamp).toLocaleString("tr-TR") : "—"}
          </div>
          {Array.isArray(viewing.attachments) && viewing.attachments.length > 0 && (
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
              <b>Ekler:</b> {viewing.attachments.map(a => a.filename).join(", ")}
            </div>
          )}
          <div style={{ fontSize: 13, color: "#0f172a", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, whiteSpace: "pre-wrap", maxHeight: 320, overflowY: "auto" }}>
            {viewing.text || "(gövde metni yok)"}
          </div>
        </Modal>
      )}

      {confirmPurge && (
        <ConfirmDialog
          message={`"${confirmPurge.subject || confirmPurge.to}" kaydı kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
          onConfirm={() => purgeEntry(confirmPurge.id)}
          onCancel={() => setConfirmPurge(null)}
        />
      )}
      {confirmEmptyMailTrash && (
        <ConfirmDialog
          message={`Silinen ${deletedEmailLog.length} e-posta kaydı kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
          onConfirm={emptyMailTrash}
          onCancel={() => setConfirmEmptyMailTrash(false)}
        />
      )}
    </>
  );
};
