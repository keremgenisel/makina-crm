import { useState, useEffect, useRef } from "react";
import { Btn, Icon, ConfirmDialog, Modal } from "../ui";
import { logAction } from "../../lib/audit";

const ENTITY_LABELS = {
  musteri: "Müşteri", bayi: "Bayi", servis: "Servis", kalip_satisi: "Kalıp Satışı",
  odeme: "Ödeme/Kapora", stok_makina: "Makina Stoğu", stok_parca: "Parça Stoğu",
  uretim_formu: "Üretim Formu", teklif: "Teklif", proforma: "Proforma", fatura: "Fatura", not: "Not",
  islem_gecmisi: "İşlem Geçmişi", gorusme: "Görüşme", eposta: "E-posta", dosya: "Dosya", sunucu: "Sunucu Kaydı",
};
const ACTION_LABELS = {
  olusturuldu: "Oluşturuldu", duzenlendi: "Düzenlendi", silindi: "Silindi", eposta_gonderildi: "E-posta Gönderildi",
  veri_kaydedildi: "Veri Kaydedildi", yuklendi: "Yüklendi",
  yeni_sahip: "Yeni Sahip (Devir)", servis_odendi: "Servis Ödendi", servis_odeme_iptal: "Servis Ödeme İptal",
  kalip_odendi: "Kalıp Ödendi", kalip_odeme_iptal: "Kalıp Ödeme İptal",
  stok_eklendi: "Stok Eklendi", stok_duzeltildi: "Stok Düzeltildi",
  temizlendi: "Temizlendi", geri_alindi: "Geri Alındı",
};

const PER_PAGE = 10;

export function SettingsAuditLog({ serverPermissions, geriAl = null, flash = () => {} }) {
  const isServerMode = !!serverPermissions;

  const [rows, setRows]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [loadErr, setLoadErr]   = useState(null);
  const [page, setPage]         = useState(1);

  // Filtre alanları — kullanıcı değiştirir, "Filtrele" veya Enter ile arama tetiklenir
  const [fQ, setFQ]               = useState("");
  const [fUser, setFUser]         = useState("");
  const [fEntity, setFEntity]     = useState("");
  const [fDateFrom, setFDateFrom] = useState("");
  const [fDateTo, setFDateTo]     = useState("");

  // Aktif (uygulanan) filtreler — bunlar değişince veri yüklenir
  const [activeFilters, setActiveFilters] = useState({ fQ: "", fUser: "", fEntity: "", fDateFrom: "", fDateTo: "" });

  const genRef = useRef(0);

  async function fetchData(p, filters) {
    const gen = ++genRef.current;
    setLoading(true);
    setLoadErr(null);
    const offset = (p - 1) * PER_PAGE;
    const req = {
      limit: PER_PAGE,
      offset,
      q: filters.fQ?.trim() || undefined,
      username: filters.fUser?.trim() || undefined,
      entity: filters.fEntity || undefined,
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
        if (req.username) params.set("username", req.username);
        if (req.entity)   params.set("entity", req.entity);
        if (req.dateFrom) params.set("dateFrom", req.dateFrom);
        if (req.dateTo)   params.set("dateTo", req.dateTo);
        const res = await window.appServer?.apiRequest({ method: "GET", path: `/api/audit?${params}` });
        result = res?.ok ? res.data : null;
        if (!result && gen === genRef.current) setLoadErr(res?.error || "Sunucudan veri alınamadı");
      } else {
        if (!window.auditLog) {
          if (gen === genRef.current) { setLoadErr("İşlem geçmişi IPC bağlantısı mevcut değil"); setLoading(false); }
          return;
        }
        const res = await window.auditLog.get(req);
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
      console.error("audit log yükleme hatası:", err);
      if (gen === genRef.current) setLoadErr(String(err?.message || err));
    }
    if (gen === genRef.current) setLoading(false);
  }

  // Aktif filtreler veya sayfa değişince veri çek
  useEffect(() => {
    fetchData(page, activeFilters);
     
  }, [page, activeFilters]);

  // Filtre uygula
  const applyFilters = () => {
    const f = { fQ, fUser, fEntity, fDateFrom, fDateTo };
    setPage(1);
    setActiveFilters(f);
  };

  // Filtreleri sıfırla
  const resetFilters = () => {
    const empty = { fQ: "", fUser: "", fEntity: "", fDateFrom: "", fDateTo: "" };
    setFQ(""); setFUser(""); setFEntity(""); setFDateFrom(""); setFDateTo("");
    setPage(1);
    setActiveFilters(empty);
  };

  const yenile = () => {
    fetchData(page, activeFilters);
  };

  // Tüm geçmişi sil (panel sadece admin'e render edildiği için ek izin kontrolü gerekmez)
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing]         = useState(false);
  const clearAll = async () => {
    setConfirmClear(false);
    setClearing(true);
    try {
      if (isServerMode) {
        // Sunucu endpoint'i silme sonrası "temizlendi" kaydını kendisi yazar
        const res = await window.appServer?.apiRequest({ method: "DELETE", path: "/api/audit" });
        if (!res?.ok) { setLoadErr(res?.error || "Geçmiş silinemedi"); setClearing(false); return; }
      } else {
        const res = await window.auditLog?.clear();
        if (!res?.ok) { setLoadErr("Geçmiş silinemedi — veritabanı erişim hatası"); setClearing(false); return; }
        // Kimin temizlediği izlensin diye tek kayıt bırak, listeyi yenilemeden önce yazımı bekle
        await logAction({ serverPermissions, action: "temizlendi", entity: "islem_gecmisi", entityName: `${res.deleted ?? 0} kayıt silindi` });
      }
      setPage(1);
      await fetchData(1, activeFilters);
    } catch (err) {
      setLoadErr(String(err?.message || err));
    }
    setClearing(false);
  };

  const go = (p) => {
    setPage(p);
    // page değişimi useEffect'i tetikler
  };

  const onKeyDown = (e) => { if (e.key === "Enter") applyFilters(); };

  // ── Geri alma (düzenleme öncesi anlık görüntüden) ───────────────────────────
  const [onizle, setOnizle] = useState(null); // { row, onceki }
  const [confirmUndo, setConfirmUndo] = useState(false);
  const parseDetail = (r) => { try { return JSON.parse(r.detail || "null") || {}; } catch { return {}; } };
  const goster = (v) => {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "boolean") return v ? "evet" : "hayır";
    const str = typeof v === "object" ? JSON.stringify(v) : String(v);
    return str.length > 90 ? str.slice(0, 90) + "…" : str;
  };
  const geriAlUygula = () => {
    const [dizi, setter] = geriAl?.[onizle.row.entity] || [];
    const id = onizle.row.entity_id;
    setConfirmUndo(false);
    if (!setter || !(dizi || []).find(x => x.id === id)) {
      flash("err", "Kayıt bulunamadı, geri alınamadı (silinmiş olabilir).");
      return;
    }
    // deletedAt korunur: geri alma silme durumunu değiştirmez, yalnızca düzenlemeyi geri sarar.
    setter(p => p.map(x => x.id === id ? { ...onizle.onceki, id, deletedAt: x.deletedAt } : x));
    logAction({ serverPermissions, action: "geri_alindi", entity: onizle.row.entity, entityId: id, entityName: onizle.row.entity_name });
    flash("ok", "Kayıt, düzenleme öncesi haline döndürüldü.");
    setOnizle(null);
    setTimeout(() => fetchData(page, activeFilters), 500); // yeni "geri alındı" satırı görünsün
  };

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
  const hasActiveFilter = activeFilters.fQ || activeFilters.fUser || activeFilters.fEntity || activeFilters.fDateFrom || activeFilters.fDateTo;
  const inp = { padding: "8px 12px", fontSize: 13, borderRadius: 7, border: "1px solid var(--n200, #e2e8f0)", background: "var(--n100, #f8fafc)", outline: "none" };
  const thStyle = { padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--n500, #64748b)", borderBottom: "2px solid var(--n200, #e2e8f0)", whiteSpace: "nowrap" };
  const tdStyle = { padding: "9px 12px", fontSize: 13, borderBottom: "1px solid var(--n150, #f1f5f9)", verticalAlign: "middle" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--n900, #0f172a)" }}>İşlem Geçmişi</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="ghost" onClick={yenile}><Icon name="refresh" size={14} /> Yenile</Btn>
          <Btn variant="ghost" onClick={exportCsv}><Icon name="download" size={14} /> CSV İndir</Btn>
          <Btn variant="danger" onClick={() => setConfirmClear(true)} disabled={clearing}>
            <Icon name="trash" size={14} /> {clearing ? "Siliniyor..." : "Geçmişi Sil"}
          </Btn>
        </div>
      </div>

      {confirmClear && (
        <ConfirmDialog
          message="Tüm işlem geçmişi kalıcı olarak silinecek ve geri alınamaz. Aktif filtreden bağımsız olarak bütün kayıtlar silinir."
          onConfirm={clearAll}
          onCancel={() => setConfirmClear(false)}
        />
      )}

      {/* Filtreler */}
      {/* Filtreler: üst satır metin filtreleri, alt satır tarih aralığı + Ara */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--n400, #94a3b8)" }}><Icon name="search" size={14} /></span>
          <input
            value={fQ} onChange={e => setFQ(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Ara: kayıt adı, detay..." style={{ ...inp, width: "100%", boxSizing: "border-box", paddingLeft: 32 }}
          />
        </div>
        <input
          value={fUser} onChange={e => setFUser(e.target.value)} onKeyDown={onKeyDown}
          placeholder="Kullanıcı adı" style={{ ...inp, width: "100%", boxSizing: "border-box" }}
        />
        <select value={fEntity} onChange={e => setFEntity(e.target.value)} onKeyDown={onKeyDown} style={{ ...inp, width: "100%", boxSizing: "border-box" }}>
          <option value="">Tüm bölümler</option>
          {Object.entries(ENTITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <input type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)} style={{ ...inp }} title="Başlangıç tarihi" />
        <span style={{ color: "var(--n400, #94a3b8)", fontSize: 13 }}>—</span>
        <input type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)} style={{ ...inp }} title="Bitiş tarihi" />
        <Btn onClick={applyFilters}>Ara</Btn>
        {hasActiveFilter && (
          <Btn variant="ghost" onClick={resetFilters}>Sıfırla</Btn>
        )}
      </div>

      {hasActiveFilter && (
        <div style={{ marginBottom: 10, fontSize: 12, color: "var(--purTx, #7c3aed)", background: "var(--purBg, #f5f3ff)", padding: "6px 12px", borderRadius: 6, display: "inline-flex", gap: 6 }}>
          Filtre aktif
          {activeFilters.fQ && <span>· Arama: <b>{activeFilters.fQ}</b></span>}
          {activeFilters.fUser && <span>· Kullanıcı: <b>{activeFilters.fUser}</b></span>}
          {activeFilters.fEntity && <span>· Bölüm: <b>{ENTITY_LABELS[activeFilters.fEntity] || activeFilters.fEntity}</b></span>}
          {activeFilters.fDateFrom && <span>· Başlangıç: <b>{activeFilters.fDateFrom}</b></span>}
          {activeFilters.fDateTo && <span>· Bitiş: <b>{activeFilters.fDateTo}</b></span>}
        </div>
      )}

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
                <th style={thStyle}>Kullanıcı</th>
                <th style={thStyle}>Rol</th>
                <th style={thStyle}>Eylem</th>
                <th style={thStyle}>Bölüm</th>
                <th style={thStyle}>Kayıt</th>
                <th style={thStyle}>Detay</th>
                <th style={thStyle} />
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ transition: "background .1s" }}>
                  <td style={{ ...tdStyle, fontSize: 12, color: "var(--n500, #64748b)", whiteSpace: "nowrap" }}>{fmtTs(r.ts)}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{r.username}</td>
                  <td style={{ ...tdStyle, fontSize: 12, color: "var(--n500, #64748b)" }}>{r.role === "admin" ? "Yönetici" : r.role === "user" ? "Kullanıcı" : (r.role || "—")}</td>
                  <td style={tdStyle}>
                    <span style={{
                      display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: r.action === "silindi" ? "var(--redBg2, #fee2e2)" : r.action === "olusturuldu" ? "var(--grnBg3, #d1fae5)" : "var(--n150, #f1f5f9)",
                      color: r.action === "silindi" ? "var(--red700, #b91c1c)" : r.action === "olusturuldu" ? "var(--grn800, #065f46)" : "var(--n600, #475569)",
                    }}>
                      {ACTION_LABELS[r.action] || r.action}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: "var(--n600, #475569)" }}>{ENTITY_LABELS[r.entity] || r.entity}</td>
                  <td style={{ ...tdStyle, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.entity_name || (r.entity_id ? `#${r.entity_id}` : "—")}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, color: "var(--n400, #94a3b8)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.detail ? (() => { try { const d = JSON.parse(r.detail); const oz = Object.entries(d).filter(([k]) => k !== "onceki").map(([k, v]) => `${k}: ${v}`).join(", "); return oz || "—"; } catch { return r.detail; } })() : "—"}
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                    {r.action === "duzenlendi" && geriAl?.[r.entity] && parseDetail(r).onceki && (
                      <Btn small variant="ghost" onClick={() => setOnizle({ row: r, onceki: parseDetail(r).onceki })}>Öncesi</Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Düzenleme öncesi önizleme + geri al */}
      {onizle && (() => {
        const mevcut = (geriAl?.[onizle.row.entity]?.[0] || []).find(x => x.id === onizle.row.entity_id);
        const anahtarlar = [...new Set([...Object.keys(onizle.onceki || {}), ...Object.keys(mevcut || {})])]
          .filter(k => k !== "id" && JSON.stringify(onizle.onceki?.[k]) !== JSON.stringify(mevcut?.[k]));
        return (
          <Modal title={`Düzenleme Öncesi — ${onizle.row.entity_name || "#" + onizle.row.entity_id}`} onClose={() => setOnizle(null)}>
            <div style={{ fontSize: 12.5, color: "var(--n500, #64748b)", marginBottom: 12 }}>
              {fmtTs(onizle.row.ts)} tarihli düzenlemenin öncesi ile kaydın ŞU ANKİ hali karşılaştırılıyor (sadece farklı alanlar).
            </div>
            {!mevcut ? (
              <div style={{ fontSize: 13, color: "var(--amb700, #b45309)", marginBottom: 14 }}>Kayıt şu an bulunamıyor (silinmiş olabilir), geri alma yapılamaz.</div>
            ) : anahtarlar.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--grn600, #16a34a)", marginBottom: 14 }}>Kayıt zaten düzenleme öncesi haliyle aynı.</div>
            ) : (
              <div style={{ overflowX: "auto", marginBottom: 14 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead><tr style={{ background: "var(--n100, #f8fafc)" }}>
                    <th style={{ padding: "6px 10px", textAlign: "left", color: "var(--n500, #64748b)" }}>Alan</th>
                    <th style={{ padding: "6px 10px", textAlign: "left", color: "var(--n500, #64748b)" }}>Önceki</th>
                    <th style={{ padding: "6px 10px", textAlign: "left", color: "var(--n500, #64748b)" }}>Şimdiki</th>
                  </tr></thead>
                  <tbody>
                    {anahtarlar.map(k => (
                      <tr key={k} style={{ borderTop: "1px solid var(--n150, #f1f5f9)" }}>
                        <td style={{ padding: "6px 10px", fontWeight: 700, color: "var(--n900, #0f172a)", whiteSpace: "nowrap" }}>{k}</td>
                        <td style={{ padding: "6px 10px", color: "var(--grn900, #166534)", background: "var(--grnBg, #f0fdf4)" }}>{goster(onizle.onceki?.[k])}</td>
                        <td style={{ padding: "6px 10px", color: "var(--red800, #991b1b)", background: "var(--redBg, #fef2f2)" }}>{goster(mevcut?.[k])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => setOnizle(null)}>Kapat</Btn>
              {mevcut && anahtarlar.length > 0 && (
                <Btn variant="danger" onClick={() => setConfirmUndo(true)}><Icon name="refresh" size={14} /> Geri Al</Btn>
              )}
            </div>
          </Modal>
        );
      })()}
      {confirmUndo && onizle && (
        <ConfirmDialog
          confirmLabel="Geri Al" confirmIcon="check"
          message={`"${onizle.row.entity_name || "#" + onizle.row.entity_id}" kaydı ${fmtTs(onizle.row.ts)} tarihli düzenlemeden ÖNCEKİ haline döndürülecek. Sonrasında yapılmış tüm değişiklikler bu kayıtta kaybolur.`}
          onConfirm={geriAlUygula}
          onCancel={() => setConfirmUndo(false)}
        />
      )}

      {/* Sayfalama */}
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
