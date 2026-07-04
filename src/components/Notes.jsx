import { useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { Icon, Btn, Modal, ConfirmDialog, LockConflict } from "./ui";
import { useLock } from "../hooks/useLock";
import { withDeleted } from "../lib/utils";

// App.jsx sekme değiştirirken (Notlar'dan başka bir sekmeye geçişte) kaydedilmemiş taslağı
// korumak için ref üzerinden guardNavigation çağırır — aynı dirty/pendingAction mekanizmasını paylaşır.
export const Notes = forwardRef(({ notes = [], setNotes, showToast = () => {} }, ref) => {
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState(""); // düzenlenen içerik (kaydet'e kadar geçici)
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null); // silme onayı bekleyen not
  const [pendingAction, setPendingAction] = useState(null); // dirty iken not değiştirme/yeni not isteği bekletilir
  const { lockLoading: noteLockLoading, lockConflict: noteLock, forceAcquire: forceNoteLock } = useLock("note", selectedId);
  const PER_PAGE = 5;
  const selected = notes.find(n => n.id === selectedId) || null;
  const dirty = selected && draft !== (selected.content || "");

  // Kaydedilmemiş değişiklik varken not değiştirmek/yeni not açmak taslağı sessizce siler —
  // dirty ise işlemi onaya bağla, değilse direkt uygula
  const guarded = (action) => { if (dirty) setPendingAction(() => action); else action(); };
  useImperativeHandle(ref, () => ({ guardNavigation: guarded }));

  // Not seçilince taslağı doldur
  const selectNote = (n) => { setSelectedId(n.id); setDraft(n.content || ""); };
  const requestSelectNote = (n) => { if (n.id !== selectedId) guarded(() => selectNote(n)); };

  const baslik = (c) => {
    const first = (c || "").split("\n")[0].trim();
    return first || "Yeni Not";
  };
  const onizleme = (c) => {
    const lines = (c || "").split("\n");
    const rest = lines.slice(1).join(" ").trim();
    return rest || "Ek metin yok";
  };
  const fmtZaman = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleDateString("tr-TR") + " " + d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  };

  // En son düzenlenen üstte
  const q = search.trim().toLocaleLowerCase("tr");
  const filtered = useMemo(() => {
    const sorted = [...notes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return q ? sorted.filter(n => (n.content || "").toLocaleLowerCase("tr").includes(q)) : sorted;
  }, [notes, q]);
  // Sayfalama (5'er)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const createNewNote = () => {
    const nid = Date.now();
    const yeni = { id: nid, content: "", updatedAt: nid };
    setNotes(p => [yeni, ...p]);
    setSelectedId(nid);
    setDraft("");
    setPage(1); // yeni not en üstte, ilk sayfaya dön
  };
  const yeniNot = () => guarded(createNewNote);
  const kaydet = () => {
    if (!selected) return;
    setNotes(p => p.map(n => n.id === selected.id ? { ...n, content: draft, updatedAt: Date.now() } : n));
    setSelectedId(null); // kaydedince editör kapanır, "Not seçilmedi" ekranına döner
    setDraft("");
    showToast("Not kaydedildi.");
  };
  const sil = (id) => {
    setNotes(p => withDeleted(p, n => n.id === id));
    if (selectedId === id) { setSelectedId(null); setDraft(""); }
    setConfirmDelete(null);
    showToast("Not silindi.");
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Notlar</h2>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* SOL: not listesi */}
        <div style={{ width: 280, flexShrink: 0, minWidth: 240 }}>
          <button onClick={yeniNot} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "none", background: "#e85d1a", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Icon name="edit" size={15} /> Yeni Not
          </button>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Notlarda ara..."
            style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13, marginBottom: 10, boxSizing: "border-box", outline: "none" }} />
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.06)", overflow: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                {q ? "Eşleşen not yok." : "Henüz not yok. 'Yeni Not' ile başlayın."}
              </div>
            ) : paged.map(n => {
              const active = n.id === selectedId;
              return (
                <div key={n.id} onClick={() => requestSelectNote(n)}
                  style={{ padding: "12px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: active ? "#fff7ed" : "#fff", borderLeft: active ? "3px solid #e85d1a" : "3px solid transparent", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 6 }}>
                      {active && dirty && <span title="Kaydedilmemiş değişiklikler var" style={{ width: 7, height: 7, borderRadius: "50%", background: "#d97706", flexShrink: 0 }} />}
                      {baslik(n.content)}
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{onizleme(n.content)}</div>
                    <div style={{ fontSize: 10, color: "#cbd5e1", marginTop: 3 }}>{fmtZaman(n.updatedAt)}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setConfirmDelete(n); }} title="Notu sil"
                    style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontSize: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>🗑</button>
                </div>
              );
            })}
          </div>
          {/* Sayfalama — 5'ten fazla not varsa */}
          {filtered.length > PER_PAGE && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 10 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}
                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: safePage <= 1 ? "#f8fafc" : "#fff", color: safePage <= 1 ? "#cbd5e1" : "#475569", cursor: safePage <= 1 ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>‹ Önceki</button>
              <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>{safePage} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: safePage >= totalPages ? "#f8fafc" : "#fff", color: safePage >= totalPages ? "#cbd5e1" : "#475569", cursor: safePage >= totalPages ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>Sonraki ›</button>
            </div>
          )}
        </div>

        {/* SAĞ: editör */}
        <div style={{ flex: 1, minWidth: 320 }}>
          {selected && noteLock ? (
            <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
              <LockConflict lockedBy={noteLock.lockedBy} lockedAt={noteLock.lockedAt}
                onForce={forceNoteLock} onCancel={() => { setSelectedId(null); setDraft(""); }} />
            </div>
          ) : selected ? (
            <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.06)", padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>Son düzenleme: {fmtZaman(selected.updatedAt)}</span>
                <button onClick={kaydet} disabled={!dirty}
                  style={{ padding: "8px 18px", borderRadius: 9, border: "none", fontSize: 13, fontWeight: 700, cursor: dirty ? "pointer" : "not-allowed", background: dirty ? "#16a34a" : "#e2e8f0", color: dirty ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="check" size={14} /> {dirty ? "Kaydet" : "Kaydedildi"}
                </button>
              </div>
              <textarea value={draft} onChange={e => setDraft(e.target.value)} autoFocus
                placeholder="Notunuzu yazın... (ilk satır başlık olur)"
                style={{ width: "100%", minHeight: 360, border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", fontSize: 14, lineHeight: 1.6, resize: "vertical", boxSizing: "border-box", outline: "none", fontFamily: "inherit", color: "#0f172a" }} />
              {dirty && <div style={{ fontSize: 11, color: "#d97706", marginTop: 6, fontWeight: 600 }}>⚠ Kaydedilmemiş değişiklikler var</div>}
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.06)", padding: "60px 20px", textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: "#475569" }}>Not seçilmedi</div>
              <div style={{ fontSize: 13 }}>Soldan bir not seçin veya "Yeni Not" oluşturun.</div>
            </div>
          )}

        </div>
      </div>

      {/* Kaydedilmemiş değişiklik varken not değiştirme/yeni not onayı */}
      {pendingAction && (
        <Modal title="Kaydedilmemiş Değişiklikler" onClose={() => setPendingAction(null)}>
          <div style={{ fontSize: 14, color: "#475569", marginBottom: 20, lineHeight: 1.6 }}>
            Bu nottaki değişiklikleri kaydetmediniz. Devam ederseniz kaydedilmemiş değişiklikler kaybolur.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <Btn variant="ghost" onClick={() => setPendingAction(null)}>Vazgeç</Btn>
            <Btn variant="danger" onClick={() => { const action = pendingAction; setPendingAction(null); action(); }}>Kaydetmeden Devam Et</Btn>
            <Btn onClick={() => { const action = pendingAction; setPendingAction(null); kaydet(); action(); }}><Icon name="check" size={14} /> Kaydet ve Devam Et</Btn>
          </div>
        </Modal>
      )}

      {/* Silme onayı */}
      {confirmDelete && (
        <ConfirmDialog
          message={`"${baslik(confirmDelete.content)}" notu Çöp Kutusu'na taşınacak — Ayarlar'dan 30 gün içinde geri alabilirsiniz.`}
          onConfirm={() => sil(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
});

