import { useState, useEffect, useCallback } from "react";
import { Btn, Icon } from "../ui";

const ENTITY_LABELS = {
  musteri: "Müşteri", bayi: "Bayi", servis: "Servis", kalip_satisi: "Kalıp Satışı",
  odeme: "Ödeme/Kapora", stok_makina: "Makina Stoğu", stok_parca: "Parça Stoğu",
  uretim_formu: "Üretim Formu", teklif: "Teklif", proforma: "Proforma", fatura: "Fatura", not: "Not",
};
const ACTION_LABELS = {
  olusturuldu: "Oluşturuldu", duzenlendi: "Düzenlendi", silindi: "Silindi",
  yeni_sahip: "Yeni Sahip (Devir)", servis_odendi: "Servis Ödendi", servis_odeme_iptal: "Servis Ödeme İptal",
  kalip_odendi: "Kalıp Ödendi", kalip_odeme_iptal: "Kalıp Ödeme İptal",
  stok_eklendi: "Stok Eklendi", stok_duzeltildi: "Stok Düzeltildi",
};

const PER_PAGE = 50;

export function SettingsAuditLog({ serverPermissions }) {
  const isServerMode = !!serverPermissions;

  const [rows, setRows]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [page, setPage]         = useState(1);
  const [fUser, setFUser]       = useState("");
  const [fEntity, setFEntity]   = useState("");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo]   = useState("");

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    const offset = (p - 1) * PER_PAGE;
    const filters = {
      limit: PER_PAGE, offset,
      username: fUser.trim() || undefined,
      entity: fEntity || undefined,
      dateFrom: fDateFrom || undefined,
      dateTo: fDateTo || undefined,
    };
    try {
      let result;
      if (isServerMode) {
        const params = new URLSearchParams();
        params.set("limit", PER_PAGE);
        params.set("offset", offset);
        if (filters.username) params.set("username", filters.username);
        if (filters.entity)   params.set("entity", filters.entity);
        if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
        if (filters.dateTo)   params.set("dateTo", filters.dateTo);
        const res = await window.appServer?.apiRequest({ method: "GET", path: `/api/audit?${params}` });
        result = res?.ok ? res.data : null;
      } else {
        const res = await window.auditLog?.get(filters);
        result = res?.ok ? res : null;
      }
      if (result) { setRows(result.rows || []); setTotal(result.total || 0); }
    } catch {}
    setLoading(false);
  }, [isServerMode, fUser, fEntity, fDateFrom, fDateTo]);

  useEffect(() => { setPage(1); load(1); }, [load]);

  const go = (p) => { setPage(p); load(p); };

  const fmtTs = (ts) => {
    if (!ts) return "—";
    try { return new Date(ts).toLocaleString("tr-TR"); } catch { return ts; }
  };

  const exportCsv = () => {
    const header = ["Zaman", "Kullanıcı", "Rol", "Eylem", "Bölüm", "Kayıt ID", "Kayıt Adı", "Detay"];
    const csvRows = [header, ...rows.map(r => [
      fmtTs(r.ts), r.username, r.role || "", ACTION_LABELS[r.action] || r.action,
      ENTITY_LABELS[r.entity] || r.entity, r.entity_id || "", r.entity_name || "", r.detail || "",
    ])];
    const csv = "﻿" + csvRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `islem-gecmisi-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const inp = { padding: "8px 12px", fontSize: 13, borderRadius: 7, border: "1px solid #e2e8f0", background: "#f8fafc", outline: "none" };
  const thStyle = { padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#64748b", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap" };
  const tdStyle = { padding: "9px 12px", fontSize: 13, borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>İşlem Geçmişi</h3>
        <Btn variant="ghost" onClick={exportCsv}><Icon name="download" size={14} /> CSV İndir</Btn>
      </div>

      {/* Filtreler */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <input value={fUser} onChange={e => setFUser(e.target.value)} placeholder="Kullanıcı adı" style={{ ...inp, width: 140 }} />
        <select value={fEntity} onChange={e => setFEntity(e.target.value)} style={{ ...inp }}>
          <option value="">Tüm bölümler</option>
          {Object.entries(ENTITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)} style={{ ...inp }} title="Başlangıç tarihi" />
        <input type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)} style={{ ...inp }} title="Bitiş tarihi" />
        <Btn variant="ghost" onClick={() => { setFUser(""); setFEntity(""); setFDateFrom(""); setFDateTo(""); }}>Sıfırla</Btn>
      </div>

      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Yükleniyor...</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Kayıt bulunamadı.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={thStyle}>Zaman</th>
                <th style={thStyle}>Kullanıcı</th>
                <th style={thStyle}>Eylem</th>
                <th style={thStyle}>Bölüm</th>
                <th style={thStyle}>Kayıt</th>
                <th style={thStyle}>Detay</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ transition: "background .1s" }}>
                  <td style={{ ...tdStyle, fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>{fmtTs(r.ts)}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{r.username}</td>
                  <td style={tdStyle}>
                    <span style={{
                      display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: r.action === "silindi" ? "#fee2e2" : r.action === "olusturuldu" ? "#d1fae5" : "#f1f5f9",
                      color: r.action === "silindi" ? "#b91c1c" : r.action === "olusturuldu" ? "#065f46" : "#475569",
                    }}>
                      {ACTION_LABELS[r.action] || r.action}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: "#475569" }}>{ENTITY_LABELS[r.entity] || r.entity}</td>
                  <td style={{ ...tdStyle, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.entity_name || (r.entity_id ? `#${r.entity_id}` : "—")}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: "#94a3b8", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.detail ? (() => { try { const d = JSON.parse(r.detail); return Object.entries(d).map(([k,v]) => `${k}: ${v}`).join(", "); } catch { return r.detail; } })() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 14 }}>
          <button onClick={() => go(page - 1)} disabled={page <= 1} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #e2e8f0", background: page <= 1 ? "#f8fafc" : "#fff", color: page <= 1 ? "#cbd5e1" : "#475569", cursor: page <= 1 ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>‹</button>
          <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>{page} / {totalPages} ({total} kayıt)</span>
          <button onClick={() => go(page + 1)} disabled={page >= totalPages} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #e2e8f0", background: page >= totalPages ? "#f8fafc" : "#fff", color: page >= totalPages ? "#cbd5e1" : "#475569", cursor: page >= totalPages ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>›</button>
        </div>
      )}
    </div>
  );
}
