import { useState, useMemo, useEffect, forwardRef, useImperativeHandle } from "react";
import { logAction, snapshotOnceki } from "../lib/audit";
import { Icon, Btn, Modal, ConfirmDialog, LockConflict, Pagination } from "./ui";
import { useLock } from "../hooks/useLock";
import { withDeleted } from "../lib/utils";
import { makeCanDo } from "../lib/permissions";

// App.jsx sekme değiştirirken (Notlar'dan başka bir sekmeye geçişte) kaydedilmemiş taslağı
// korumak için ref üzerinden guardNavigation çağırır — aynı dirty/pendingAction mekanizmasını paylaşır.
export const Notes = forwardRef(({ notes = [], setNotes, showToast = () => {}, serverPermissions = null, aktifKullanici = "" }, ref) => {
  const canDoNot = makeCanDo(serverPermissions, "notActions");
  const coklu = !!aktifKullanici; // çok kullanıcı bağlamı (giriş yapılmış): "Benim Notlarım" filtresi anlamlı
  // Not filtreleri kullanıcı yönetiminden yetkilendirilir (Finans tarih aralıkları gibi). Yetkisi
  // olmayan filtre butonu gizlenir; aktif filtre yasaklıysa izinli olana düşülür.
  const filtreBenimIzin = canDoNot("not_filter_benim");
  const filtreTumuIzin  = canDoNot("not_filter_tumu");
  const [filtreBenim, setFiltreBenim] = useState(true); // varsayılan: kendi notların (yalnız çoklu modda)
  useEffect(() => {
    if (!coklu) return;
    if (filtreBenim && !filtreBenimIzin && filtreTumuIzin) setFiltreBenim(false);
    else if (!filtreBenim && !filtreTumuIzin && filtreBenimIzin) setFiltreBenim(true);
  }, [coklu, filtreBenim, filtreBenimIzin, filtreTumuIzin]);
  const [selectedId, setSelectedId] = useState(null);
  const [newMode, setNewMode] = useState(false); // yeni not editörü açık ama kayıt HENÜZ oluşturulmadı
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState(""); // düzenlenen içerik (kaydet'e kadar geçici)
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null); // silme onayı bekleyen not
  const [pendingAction, setPendingAction] = useState(null); // dirty iken not değiştirme/yeni not isteği bekletilir
  const { lockLoading: noteLockLoading, lockConflict: noteLock, forceAcquire: forceNoteLock } = useLock("note", selectedId);
  const PER_PAGE = 5;
  const selected = notes.find(n => n.id === selectedId) || null;
  const dirty = newMode ? draft.trim() !== "" : (selected && draft !== (selected.content || ""));

  // Kaydedilmemiş değişiklik varken not değiştirmek/yeni not açmak taslağı sessizce siler —
  // dirty ise işlemi onaya bağla, değilse direkt uygula
  const guarded = (action) => { if (dirty) setPendingAction(() => action); else action(); };
  useImperativeHandle(ref, () => ({ guardNavigation: guarded }));

  // Not seçilince taslağı doldur
  const selectNote = (n) => { setNewMode(false); setSelectedId(n.id); setDraft(n.content || ""); };
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
    if (isNaN(d)) return ""; // eski/bozuk zaman damgası: "Invalid Date" basma, boş bırak
    return d.toLocaleDateString("tr-TR") + " " + d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  };

  // En son düzenlenen üstte
  const q = search.trim().toLocaleLowerCase("tr");
  const filtered = useMemo(() => {
    let list = [...notes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    // Çok kullanıcıda "Benim Notlarım": kendi notların + sahibi olmayan (eski) notlar. Gizlilik değil,
    // yalnız düzen — notlar yine herkese senkronlanır ve "Tümü" ile hepsi görülebilir.
    if (coklu && filtreBenim) list = list.filter(n => !n.olusturan || n.olusturan === aktifKullanici);
    return q ? list.filter(n => (n.content || "").toLocaleLowerCase("tr").includes(q)) : list;
  }, [notes, q, coklu, filtreBenim, aktifKullanici]);
  // Sayfalama (5'er)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const createNewNote = () => {
    setNewMode(true);
    setSelectedId(null);
    setDraft("");
    setPage(1);
  };
  const yeniNot = () => guarded(createNewNote);
  const kaydet = () => {
    const icerik = draft.trim();
    if (newMode) {
      if (!icerik) { showToast("Boş not kaydedilmedi, önce bir şeyler yazın.", "warn"); return; }
      const nid = Date.now();
      setNotes(p => [{ id: nid, content: draft, updatedAt: nid, olusturan: aktifKullanici || null }, ...p]);
      logAction({ serverPermissions, action: "olusturuldu", entity: "not", entityId: nid, entityName: draft.split("\n")[0].trim().slice(0, 60) });
      setNewMode(false);
      setDraft("");
      showToast("Not kaydedildi.");
      return;
    }
    if (!selected) return;
    if (!icerik) { showToast("Not boş bırakılamaz. Notu kaldırmak için listeden silin.", "warn"); return; }
    setNotes(p => p.map(n => n.id === selected.id ? { ...n, content: draft, updatedAt: Date.now() } : n));
    logAction({ serverPermissions, action: "duzenlendi", entity: "not", entityId: selected.id, entityName: draft.split("\n")[0].trim().slice(0, 60) || "Yeni Not", detail: { onceki: snapshotOnceki(notes.find(n => n.id === selected.id)) } });
    setSelectedId(null);
    setDraft("");
    showToast("Not kaydedildi.");
  };
  const sil = (id) => {
    const n = notes.find(x => x.id === id);
    setNotes(p => withDeleted(p, x => x.id === id));
    if (selectedId === id) { setSelectedId(null); setDraft(""); }
    setConfirmDelete(null);
    logAction({ serverPermissions, action: "silindi", entity: "not", entityId: id, entityName: (n?.content || "").split("\n")[0].trim().slice(0, 60) || "Not" });
    showToast("Not silindi.");
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700, color: "var(--n900, #0f172a)" }}>Notlar</h2>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* SOL: not listesi */}
        <div style={{ width: 280, flexShrink: 0, minWidth: 240 }}>
          {canDoNot("not_add") && (
            <button onClick={yeniNot} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "none", background: "#e85d1a", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Icon name="edit" size={15} /> Yeni Not
            </button>
          )}
          {coklu && (filtreBenimIzin || filtreTumuIzin) && (
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {[["benim", "Benim Notlarım", filtreBenimIzin], ["tumu", "Tümü", filtreTumuIzin]].filter(([, , izin]) => izin).map(([k, label]) => {
                const aktif = filtreBenim === (k === "benim");
                return (
                  <button key={k} onClick={() => { setFiltreBenim(k === "benim"); setPage(1); }}
                    style={{ flex: 1, padding: "6px 8px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${aktif ? "#e85d1a" : "var(--n200, #e2e8f0)"}`, background: aktif ? "#e85d1a" : "var(--surface, #ffffff)", color: aktif ? "#fff" : "var(--n500, #64748b)" }}>
                    {label}
                  </button>
                );
              })}
            </div>
          )}
          <div style={{ position: "relative", marginBottom: 10 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--n400, #94a3b8)" }}><Icon name="search" size={14} /></span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Notlarda ara..."
              style={{ width: "100%", padding: "9px 12px 9px 32px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, fontSize: 13, boxSizing: "border-box", outline: "none", background: "var(--n100, #f8fafc)" }} />
          </div>
          <div style={{ background: "var(--surface, #ffffff)", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.06)", overflow: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--n400, #94a3b8)", fontSize: 13 }}>
                {q ? "Eşleşen not yok." : "Henüz not yok. 'Yeni Not' ile başlayın."}
              </div>
            ) : paged.map(n => {
              const active = n.id === selectedId;
              return (
                <div key={n.id} onClick={() => requestSelectNote(n)}
                  style={{ padding: "12px 14px", cursor: "pointer", borderBottom: "1px solid var(--n150, #f1f5f9)", background: active ? "var(--ambBg3, #fff7ed)" : "var(--surface, #ffffff)", borderLeft: active ? "3px solid #e85d1a" : "3px solid transparent", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--n900, #0f172a)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 6 }}>
                      {active && dirty && <span title="Kaydedilmemiş değişiklikler var" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--amb600, #d97706)", flexShrink: 0 }} />}
                      {baslik(n.content)}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--n400, #94a3b8)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{onizleme(n.content)}</div>
                    <div style={{ fontSize: 10, color: "var(--n300, #cbd5e1)", marginTop: 3 }}>
                      {fmtZaman(n.updatedAt)}
                      {coklu && n.olusturan && n.olusturan !== aktifKullanici && <span style={{ color: "var(--n400, #94a3b8)", fontWeight: 700 }}> · {n.olusturan}</span>}
                    </div>
                  </div>
                  {canDoNot("not_delete") && (
                    <button onClick={e => { e.stopPropagation(); setConfirmDelete(n); }} title="Notu sil"
                      style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid var(--redBr, #fecaca)", background: "var(--redBg, #fef2f2)", color: "var(--red600, #dc2626)", cursor: "pointer", fontSize: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>🗑</button>
                  )}
                </div>
              );
            })}
          </div>
          <Pagination total={filtered.length} page={safePage} setPage={setPage} perPage={PER_PAGE} />
        </div>

        {/* SAĞ: editör */}
        <div style={{ flex: 1, minWidth: 320 }}>
          {selected && noteLock ? (
            <div style={{ background: "var(--surface, #ffffff)", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
              <LockConflict lockedBy={noteLock.lockedBy} lockedAt={noteLock.lockedAt}
                onForce={forceNoteLock} onCancel={() => { setSelectedId(null); setDraft(""); }} />
            </div>
          ) : (selected || newMode) ? (
            <div style={{ background: "var(--surface, #ffffff)", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.06)", padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "var(--n400, #94a3b8)" }}>{newMode ? "Yeni not (kaydedilmedi)" : `Son düzenleme: ${fmtZaman(selected.updatedAt)}`}</span>
                {canDoNot(newMode ? "not_add" : "not_edit") ? (
                  <button onClick={kaydet}
                    style={{ padding: "8px 18px", borderRadius: 9, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", background: "var(--grn600, #16a34a)", color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="check" size={14} /> Kaydet
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: "var(--n400, #94a3b8)" }}>Salt okunur</span>
                )}
              </div>
              <textarea value={draft} onChange={e => setDraft(e.target.value)} autoFocus
                placeholder="Notunuzu yazın... (ilk satır başlık olur)"
                style={{ width: "100%", minHeight: 360, border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, padding: "14px 16px", fontSize: 14, lineHeight: 1.6, resize: "vertical", boxSizing: "border-box", outline: "none", fontFamily: "inherit", color: "var(--n900, #0f172a)" }} />
              {dirty && <div style={{ fontSize: 11, color: "var(--amb600, #d97706)", marginTop: 6, fontWeight: 600 }}>⚠ Kaydedilmemiş değişiklikler var</div>}
            </div>
          ) : (
            <div style={{ background: "var(--surface, #ffffff)", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.06)", padding: "60px 20px", textAlign: "center", color: "var(--n400, #94a3b8)" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, color: "var(--n600, #475569)" }}>Not seçilmedi</div>
              <div style={{ fontSize: 13 }}>Soldan bir not seçin veya "Yeni Not" oluşturun.</div>
            </div>
          )}

        </div>
      </div>

      {/* Kaydedilmemiş değişiklik varken not değiştirme/yeni not onayı */}
      {pendingAction && (
        <Modal title="Kaydedilmemiş Değişiklikler" onClose={() => setPendingAction(null)}>
          <div style={{ fontSize: 14, color: "var(--n600, #475569)", marginBottom: 20, lineHeight: 1.6 }}>
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

