import { useState, useEffect, useRef } from "react";
import { Btn, Icon, ConfirmDialog } from "../ui";

export const ACTION_LABELS = {
  giris_basarili: "Giriş Başarılı", giris_basarisiz: "Giriş Başarısız",
  kullanici_eklendi: "Kullanıcı Eklendi", kullanici_silindi: "Kullanıcı Silindi",
  kullanici_guncellendi: "Kullanıcı Güncellendi",
  "2fa_acildi": "2FA Açıldı", "2fa_kapatildi": "2FA Kapatıldı", "2fa_sifirlandi": "2FA Sıfırlandı",
  oturumlar_kapatildi: "Oturumlar Kapatıldı",
  uygulama_kilidi_basarili: "Uygulama Kilidi Açıldı", uygulama_kilidi_basarisiz: "Uygulama Kilidi Başarısız",
  gecmis_temizlendi: "Geçmiş Temizlendi",
};

// Eylem türü filtresi için gruplu seçenekler
const ACTION_OPTIONS = Object.entries(ACTION_LABELS);

const basariliMi = (a) => a === "giris_basarili" || a === "2fa_acildi" || a === "uygulama_kilidi_basarili";
const basarisizMi = (a) => a === "giris_basarisiz" || a === "uygulama_kilidi_basarisiz";
const appLockMi = (a) => a === "uygulama_kilidi_basarili" || a === "uygulama_kilidi_basarisiz";

const PER_PAGE = 10;

export function SettingsSecurityLog({ serverPermissions, flash = () => {} }) {
  const isServerMode = !!serverPermissions;

  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(null);
  const [page, setPage]       = useState(1);

  const [fQ, setFQ]               = useState("");
  const [fActor, setFActor]       = useState("");
  const [fAction, setFAction]     = useState("");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo]     = useState("");
  const [activeFilters, setActiveFilters] = useState({ fQ: "", fActor: "", fAction: "", fDateFrom: "", fDateTo: "" });

  const genRef = useRef(0);

  async function fetchData(p, filters) {
    const gen = ++genRef.current;
    setLoading(true);
    setLoadErr(null);
    const offset = (p - 1) * PER_PAGE;
    const req = {
      limit: PER_PAGE, offset,
      q: filters.fQ?.trim() || undefined,
      actor: filters.fActor?.trim() || undefined,
      action: filters.fAction || undefined,
      dateFrom: filters.fDateFrom || undefined,
      dateTo: filters.fDateTo || undefined,
    };
    try {
      let result;
      if (isServerMode) {
        const params = new URLSearchParams();
        params.set("limit", PER_PAGE);
        params.set("offset", offset);
        if (req.q)        params.set("q", req.q);
        if (req.actor)    params.set("actor", req.actor);
        if (req.action)   params.set("action", req.action);
        if (req.dateFrom) params.set("dateFrom", req.dateFrom);
        if (req.dateTo)   params.set("dateTo", req.dateTo);
        const res = await window.appServer?.apiRequest({ method: "GET", path: `/api/security-log?${params}` });
        result = res?.ok ? res.data : null;
        if (!result && gen === genRef.current) setLoadErr(res?.error || "Sunucudan veri alınamadı");
      } else {
        if (!window.securityLog) {
          if (gen === genRef.current) { setLoadErr("Güvenlik geçmişi IPC bağlantısı mevcut değil"); setLoading(false); }
          return;
        }
        const res = await window.securityLog.get(req);
        if (!res?.ok) {
          if (gen === genRef.current) { setLoadErr("Veritabanı erişim hatası — yerel mod aktif olmayabilir"); setLoading(false); }
          return;
        }
        result = res;
      }
      if (gen === genRef.current && result) {
        setRows(result.rows || []);
        setTotal(result.total || 0);
      }
    } catch (err) {
      console.error("güvenlik geçmişi yükleme hatası:", err);
      if (gen === genRef.current) setLoadErr(String(err?.message || err));
    }
    if (gen === genRef.current) setLoading(false);
  }

  useEffect(() => { fetchData(page, activeFilters); }, [page, activeFilters]);

  const applyFilters = () => { setPage(1); setActiveFilters({ fQ, fActor, fAction, fDateFrom, fDateTo }); };
  const resetFilters = () => {
    setFQ(""); setFActor(""); setFAction(""); setFDateFrom(""); setFDateTo("");
    setPage(1); setActiveFilters({ fQ: "", fActor: "", fAction: "", fDateFrom: "", fDateTo: "" });
  };
  const yenile = () => fetchData(page, activeFilters);
  const onKeyDown = (e) => { if (e.key === "Enter") applyFilters(); };

  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing]         = useState(false);
  const clearAll = async () => {
    setConfirmClear(false);
    setClearing(true);
    try {
      if (isServerMode) {
        const res = await window.appServer?.apiRequest({ method: "DELETE", path: "/api/security-log" });
        if (!res?.ok) { setLoadErr(res?.error || "Geçmiş silinemedi"); setClearing(false); return; }
      } else {
        const res = await window.securityLog?.clear();
        if (!res?.ok) { setLoadErr("Geçmiş silinemedi — veritabanı erişim hatası"); setClearing(false); return; }
      }
      flash("ok", "Kullanıcı geçmişi temizlendi.");
      setPage(1);
      await fetchData(1, activeFilters);
    } catch (err) {
      setLoadErr(String(err?.message || err));
    }
    setClearing(false);
  };

  const go = (p) => setPage(p);

  const fmtTs = (ts) => {
    if (!ts) return "—";
    try { return new Date(ts).toLocaleString("tr-TR"); } catch { return ts; }
  };
  const detayGoster = (r) => {
    if (!r.detail) return "—";
    try {
      const d = JSON.parse(r.detail);
      return Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(", ") || "—";
    } catch { return r.detail; }
  };

  const exportCsv = () => {
    const header = ["Zaman", "Yapan", "Eylem", "Hedef", "IP", "Detay"];
    const csvRows = [header, ...rows.map(r => [
      fmtTs(r.ts), r.actor || "", ACTION_LABELS[r.action] || r.action, r.target || "", r.ip || "", detayGoster(r),
    ])];
    const csv = "﻿" + csvRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `kullanici-gecmisi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const hasActiveFilter = activeFilters.fQ || activeFilters.fActor || activeFilters.fAction || activeFilters.fDateFrom || activeFilters.fDateTo;
  const inp = { padding: "8px 12px", fontSize: 13, borderRadius: 7, border: "1px solid var(--n200, #e2e8f0)", background: "var(--n100, #f8fafc)", outline: "none" };
  const thStyle = { padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--n500, #64748b)", borderBottom: "2px solid var(--n200, #e2e8f0)", whiteSpace: "nowrap" };
  const tdStyle = { padding: "9px 12px", fontSize: 13, borderBottom: "1px solid var(--n150, #f1f5f9)", verticalAlign: "middle" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--n900, #0f172a)" }}>Kullanıcı Geçmişi</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="ghost" onClick={yenile}><Icon name="refresh" size={14} /> Yenile</Btn>
          <Btn variant="ghost" onClick={exportCsv}><Icon name="download" size={14} /> CSV İndir</Btn>
          <Btn variant="danger" onClick={() => setConfirmClear(true)} disabled={clearing}>
            <Icon name="trash" size={14} /> {clearing ? "Siliniyor..." : "Geçmişi Sil"}
          </Btn>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--n500, #64748b)", marginBottom: 14 }}>
        Giriş denemeleri (başarılı/başarısız), kullanıcı yönetimi, iki adımlı doğrulama ve uygulama kilidi olayları. Şifreler asla kaydedilmez.
      </div>

      {confirmClear && (
        <ConfirmDialog
          message="Tüm kullanıcı geçmişi kalıcı olarak silinecek ve geri alınamaz. Aktif filtreden bağımsız olarak bütün kayıtlar silinir."
          onConfirm={clearAll}
          onCancel={() => setConfirmClear(false)}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--n400, #94a3b8)" }}><Icon name="search" size={14} /></span>
          <input value={fQ} onChange={e => setFQ(e.target.value)} onKeyDown={onKeyDown} placeholder="Ara: kullanıcı, IP, detay..." style={{ ...inp, width: "100%", boxSizing: "border-box", paddingLeft: 32 }} />
        </div>
        <input value={fActor} onChange={e => setFActor(e.target.value)} onKeyDown={onKeyDown} placeholder="Yapan (kullanıcı/cihaz)" style={{ ...inp, width: "100%", boxSizing: "border-box" }} />
        <select value={fAction} onChange={e => setFAction(e.target.value)} onKeyDown={onKeyDown} style={{ ...inp, width: "100%", boxSizing: "border-box" }}>
          <option value="">Tüm olaylar</option>
          {ACTION_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <input type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)} style={{ ...inp }} title="Başlangıç tarihi" />
        <span style={{ color: "var(--n400, #94a3b8)", fontSize: 13 }}>…</span>
        <input type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)} style={{ ...inp }} title="Bitiş tarihi" />
        <Btn onClick={applyFilters}>Ara</Btn>
        {hasActiveFilter && <Btn variant="ghost" onClick={resetFilters}>Sıfırla</Btn>}
      </div>

      {loadErr && (
        <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 8, background: "var(--redBg2, #fee2e2)", color: "var(--red800, #991b1b)", fontSize: 13, fontWeight: 600 }}>
          Yükleme hatası: {loadErr}
        </div>
      )}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--n400, #94a3b8)", fontSize: 14 }}>Yükleniyor...</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--n400, #94a3b8)", fontSize: 14 }}>Kayıt bulunamadı.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--surface, #ffffff)", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
            <thead>
              <tr style={{ background: "var(--n100, #f8fafc)" }}>
                <th style={thStyle}>Zaman</th>
                <th style={thStyle}>Yapan</th>
                <th style={thStyle}>Eylem</th>
                <th style={thStyle}>Hedef</th>
                <th style={thStyle}>IP</th>
                <th style={thStyle}>Detay</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td style={{ ...tdStyle, fontSize: 12, color: "var(--n500, #64748b)", whiteSpace: "nowrap" }}>{fmtTs(r.ts)}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, maxWidth: 200 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.actor || "—"}</div>
                    {appLockMi(r.action) && r.target && (
                      <div style={{ fontSize: 11, fontWeight: 500, color: "var(--n500, #64748b)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        kullanıcı: {r.target}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: basarisizMi(r.action) ? "var(--redBg2, #fee2e2)" : basariliMi(r.action) ? "var(--grnBg3, #d1fae5)" : "var(--n150, #f1f5f9)",
                      color: basarisizMi(r.action) ? "var(--red700, #b91c1c)" : basariliMi(r.action) ? "var(--grn800, #065f46)" : "var(--n600, #475569)",
                      whiteSpace: "nowrap",
                    }}>
                      {ACTION_LABELS[r.action] || r.action}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: "var(--n600, #475569)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{appLockMi(r.action) ? "—" : (r.target || "—")}</td>
                  <td style={{ ...tdStyle, fontSize: 12, color: "var(--n500, #64748b)", fontFamily: "ui-monospace, monospace", whiteSpace: "nowrap" }}>{r.ip || "—"}</td>
                  <td style={{ ...tdStyle, fontSize: 12, color: "var(--n400, #94a3b8)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detayGoster(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 14 }}>
          <button onClick={() => go(page - 1)} disabled={page <= 1} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid var(--n200, #e2e8f0)", background: page <= 1 ? "var(--n100, #f8fafc)" : "var(--surface, #ffffff)", color: page <= 1 ? "var(--n300, #cbd5e1)" : "var(--n600, #475569)", cursor: page <= 1 ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>‹</button>
          <span style={{ fontSize: 13, color: "var(--n500, #64748b)", fontWeight: 600 }}>{page} / {totalPages} ({total} kayıt)</span>
          <button onClick={() => go(page + 1)} disabled={page >= totalPages} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid var(--n200, #e2e8f0)", background: page >= totalPages ? "var(--n100, #f8fafc)" : "var(--surface, #ffffff)", color: page >= totalPages ? "var(--n300, #cbd5e1)" : "var(--n600, #475569)", cursor: page >= totalPages ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>›</button>
        </div>
      )}
    </div>
  );
}
