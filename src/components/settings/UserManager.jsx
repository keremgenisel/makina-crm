import { useState, useEffect } from "react";
import { Modal, PasswordInput, Btn, ConfirmDialog } from "../ui";
import {
  ALL_TABS, DEFAULT_USER_TABS, DANGER_SECTION,
  CUSTOMER_ACTION_GROUPS, DEALER_ACTION_GROUPS, STOCK_ACTION_GROUPS,
  EVRAK_ACTION_GROUPS, NOT_ACTION_GROUPS, FINANCE_ACTION_GROUPS,
  parseTabPerms, parseSettingsPerms, parseCustomerActionsPerms, parseDealerActionsPerms,
  parseStockActionsPerms, parseEvrakActionsPerms, parseNotActionsPerms, parseFinanceActionsPerms,
} from "./serverPermissionDefs";

// Kullanıcı yönetimi paneli (sunucu modunda). SettingsServer.jsx'ten ayrıldı: kullanıcı
// listeleme/ekleme/silme, rol/sekme/işlem izinleri düzenleme, şifre değiştirme, oturum
// kapatma, 2FA sıfırlama. İzin tanımları serverPermissionDefs.js'ten gelir.
export function UserManager({ flash, settingsGroups = [] }) {
  const allSettingIds      = [...settingsGroups.flatMap(g => g.items.map(i => i.id)), DANGER_SECTION.id];
  const allActionIds       = CUSTOMER_ACTION_GROUPS.flatMap(g => g.items.map(i => i.id));
  const allDealerActionIds = DEALER_ACTION_GROUPS.flatMap(g => g.items.map(i => i.id));
  const allStockActionIds  = STOCK_ACTION_GROUPS.flatMap(g => g.items.map(i => i.id));
  const allEvrakActionIds  = EVRAK_ACTION_GROUPS.flatMap(g => g.items.map(i => i.id));
  const allNotActionIds    = NOT_ACTION_GROUPS.flatMap(g => g.items.map(i => i.id));
  const allFinanceActionIds = FINANCE_ACTION_GROUPS.flatMap(g => g.items.map(i => i.id));

  const [users, setUsers]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [showAdd, setShowAdd]     = useState(false);
  const [newU, setNewU]           = useState({ username: "", password: "", role: "user", tabs: [...DEFAULT_USER_TABS] });
  const [adding, setAdding]       = useState(false);
  const [editPermsId, setEditPermsId]               = useState(null);
  const [editTabs, setEditTabs]                     = useState([]);
  const [editSettings, setEditSettings]             = useState([]);
  const [editSettingsOn, setEditSettingsOn]         = useState(false);
  const [editActions, setEditActions]               = useState([]);
  const [editActionsOn, setEditActionsOn]           = useState(false);
  const [editDealerActions, setEditDealerActions]     = useState([]);
  const [editDealerActionsOn, setEditDealerActionsOn] = useState(false);
  const [editStockActions, setEditStockActions]       = useState([]);
  const [editStockActionsOn, setEditStockActionsOn]   = useState(false);
  const [editEvrakActions, setEditEvrakActions]       = useState([]);
  const [editEvrakActionsOn, setEditEvrakActionsOn]   = useState(false);
  const [editNotActions, setEditNotActions]           = useState([]);
  const [editNotActionsOn, setEditNotActionsOn]       = useState(false);
  const [editFinanceActions, setEditFinanceActions]     = useState([]);
  const [editFinanceActionsOn, setEditFinanceActionsOn] = useState(false);
  const [changePwId, setChangePwId]                 = useState(null);
  const [newPw, setNewPw]                           = useState("");
  const [changingPw, setChangingPw]                 = useState(false);
  const [openPerm, setOpenPerm]                     = useState([]); // açık akordeon bölümleri

  const load = async () => {
    setLoading(true);
    const res = await window.appServer.apiRequest({ method: "GET", path: "/api/users" });
    setLoading(false);
    if (res?.ok) setUsers(res.data);
  };
  useEffect(() => { load(); }, []);

  const inp = { padding: "8px 12px", fontSize: 13, borderRadius: 7, border: "1px solid var(--n200, #e2e8f0)", background: "var(--n100, #f8fafc)" };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newU.username.trim() || !newU.password) { flash("err", "Kullanıcı adı ve şifre gerekli"); return; }
    const permissions = newU.role === "admin" ? null : JSON.stringify({ tabs: newU.tabs });
    setAdding(true);
    const res = await window.appServer.apiRequest({ method: "POST", path: "/api/users", body: { username: newU.username.trim(), password: newU.password, role: newU.role, permissions } });
    setAdding(false);
    if (res?.ok) { flash("ok", "Kullanıcı oluşturuldu."); setNewU({ username: "", password: "", role: "user", tabs: [...DEFAULT_USER_TABS] }); setShowAdd(false); load(); }
    else flash("err", res?.error || "Oluşturulamadı");
  };
  const toggle = async (u) => {
    const res = await window.appServer.apiRequest({ method: "PATCH", path: `/api/users/${u.id}`, body: { is_active: u.is_active ? 0 : 1 } });
    // Son-admin koruması sunucuda: tek aktif yönetici pasifleştirilemez. Sunucunun asıl mesajını
    // göster ("Sistemde en az bir aktif yönetici kalmalı") ki kullanıcı önce yeni yönetici eklesin.
    if (res?.ok) load(); else flash("err", res?.error || "Güncellenemedi");
  };
  const openEditPerms = (u) => {
    const tabs         = parseTabPerms(u.permissions) ?? [...DEFAULT_USER_TABS];
    const settings     = parseSettingsPerms(u.permissions);
    const actions      = parseCustomerActionsPerms(u.permissions);
    const dealerActions = parseDealerActionsPerms(u.permissions);
    const stockActions  = parseStockActionsPerms(u.permissions);
    setEditTabs(tabs);
    setEditSettings(settings ?? [...allSettingIds]);
    setEditSettingsOn(settings !== null);
    setEditActions(actions ?? [...allActionIds]);
    setEditActionsOn(actions !== null);
    setEditDealerActions(dealerActions ?? [...allDealerActionIds]);
    setEditDealerActionsOn(dealerActions !== null);
    setEditStockActions(stockActions ?? [...allStockActionIds]);
    setEditStockActionsOn(stockActions !== null);
    const evrakActions  = parseEvrakActionsPerms(u.permissions);
    setEditEvrakActions(evrakActions ?? [...allEvrakActionIds]);
    setEditEvrakActionsOn(evrakActions !== null);
    const notActions    = parseNotActionsPerms(u.permissions);
    setEditNotActions(notActions ?? [...allNotActionIds]);
    setEditNotActionsOn(notActions !== null);
    const financeActions = parseFinanceActionsPerms(u.permissions);
    setEditFinanceActions(financeActions ?? [...allFinanceActionIds]);
    setEditFinanceActionsOn(financeActions !== null);
    setEditPermsId(u.id);
    setChangePwId(null);
    setOpenPerm([]); // her açılışta tüm akordeonlar kapalı başlasın
  };
  const savePerms = async (u) => {
    const settingsVal     = editSettingsOn     ? editSettings     : null;
    const actionsVal      = editActionsOn      ? editActions      : null;
    const dealerActionsVal = editDealerActionsOn ? editDealerActions : null;
    const stockActionsVal  = editStockActionsOn  ? editStockActions  : null;
    const evrakActionsVal  = editEvrakActionsOn  ? editEvrakActions  : null;
    const notActionsVal    = editNotActionsOn    ? editNotActions    : null;
    const financeActionsVal = editFinanceActionsOn ? editFinanceActions : null;
    const permissions = u.role === "admin" ? null : JSON.stringify({ tabs: editTabs, settings: settingsVal, customerActions: actionsVal, dealerActions: dealerActionsVal, stockActions: stockActionsVal, evrakActions: evrakActionsVal, notActions: notActionsVal, financeActions: financeActionsVal });
    const res = await window.appServer.apiRequest({ method: "PATCH", path: `/api/users/${u.id}`, body: { permissions } });
    if (res?.ok) { flash("ok", "İzinler güncellendi."); setEditPermsId(null); load(); }
    else flash("err", "Güncellenemedi");
  };
  const openChangePw = (u) => { setNewPw(""); setChangePwId(u.id); setEditPermsId(null); };
  const saveChangePw = async (u) => {
    if (!newPw || newPw.length < 6) { flash("err", "Şifre en az 6 karakter olmalı"); return; }
    setChangingPw(true);
    const res = await window.appServer.apiRequest({ method: "PATCH", path: `/api/users/${u.id}`, body: { password: newPw } });
    setChangingPw(false);
    if (res?.ok) { flash("ok", `"${u.username}" şifresi güncellendi.`); setChangePwId(null); setNewPw(""); }
    else flash("err", res?.error || "Güncellenemedi");
  };
  // Onay diyaloğu: yerel window.confirm yerine uygulama tasarımına uygun ConfirmDialog kullan.
  const [confirmAction, setConfirmAction] = useState(null); // { title, message, confirmLabel, confirmIcon, icon, run }
  const del = (u) => setConfirmAction({
    title: "Kullanıcıyı sil", icon: "trash", confirmIcon: "trash", confirmLabel: "Evet, Sil",
    message: `"${u.username}" kullanıcısı silinsin mi? Bu işlem geri alınamaz.`,
    run: async () => {
      const res = await window.appServer.apiRequest({ method: "DELETE", path: `/api/users/${u.id}` });
      if (res?.ok) { load(); flash("ok", "Silindi."); } else flash("err", res?.error || "Silinemedi");
    },
  });
  const logoutAll = (u) => setConfirmAction({
    title: "Oturumları Kapat", icon: "lock", confirmIcon: "lock", confirmLabel: "Evet, Kapat",
    message: `"${u.username}" tüm cihazlardan çıkarılsın mı? Açık tüm oturumları kapanır, tekrar giriş yapmaları gerekir.`,
    run: async () => {
      const res = await window.appServer.apiRequest({ method: "POST", path: `/api/users/${u.id}/logout-all` });
      if (res?.ok) flash("ok", `"${u.username}" tüm cihazlardan çıkarıldı.`);
      else flash("err", res?.error || "İşlem başarısız");
    },
  });
  const [confirm2fa, setConfirm2fa] = useState(null); // 2FA sıfırlama onayı bekleyen kullanıcı
  const [reset2faPw, setReset2faPw] = useState("");   // step-up: admin kendi şifresini doğrular
  const [reset2faErr, setReset2faErr] = useState("");
  const [reset2faBusy, setReset2faBusy] = useState(false);
  const closeReset2fa = () => { setConfirm2fa(null); setReset2faPw(""); setReset2faErr(""); };
  const doReset2fa = async () => {
    if (!confirm2fa) return;
    if (!reset2faPw) { setReset2faErr("Kendi şifrenizi girin."); return; }
    setReset2faBusy(true); setReset2faErr("");
    const res = await window.appServer.apiRequest({ method: "DELETE", path: `/api/users/${confirm2fa.id}/2fa`, body: { password: reset2faPw } });
    setReset2faBusy(false);
    if (res?.ok) { closeReset2fa(); load(); flash("ok", "2FA sıfırlandı."); }
    else setReset2faErr(res?.error || "Sıfırlanamadı.");
  };

  // İzin akordeonu — her bölüm katlanabilir. Config veri-güdümlü (7 tekrarlı blok yerine tek render).
  const chipStyle = (active, bg, border) => ({
    display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer",
    background: active ? bg : "var(--surface, #ffffff)", border: `1px solid ${active ? border : "var(--n200, #e2e8f0)"}`, borderRadius: 6, padding: "4px 10px",
  });
  const grupBaslikStyle = { fontSize: 10, fontWeight: 800, color: "var(--n400, #94a3b8)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 };
  const yesil = { activeBg: "var(--grnBg2, #dcfce7)", activeBorder: "var(--grnBr3, #86efac)", emptyText: "Varsayılan (tüm işlemler açık)" };
  const permSections = [
    { key: "settings", title: "Ayarlar bölümleri", on: editSettingsOn, selected: editSettings, setSelected: setEditSettings,
      setOn: (v) => { setEditSettingsOn(v); if (v) setEditSettings([...allSettingIds]); },
      flatItems: [...settingsGroups.flatMap(g => g.items), DANGER_SECTION], activeBg: "var(--ambBg2, #fef3c7)", activeBorder: "var(--ambBr2, #fcd34d)",
      emptyText: "Varsayılan (genel ayar uygulanır)" },
    { key: "customer", title: "Müşteri işlemleri", on: editActionsOn, selected: editActions, setSelected: setEditActions,
      setOn: (v) => { setEditActionsOn(v); if (v) setEditActions([...allActionIds]); }, groups: CUSTOMER_ACTION_GROUPS, ...yesil },
    { key: "dealer", title: "Bayi işlemleri", on: editDealerActionsOn, selected: editDealerActions, setSelected: setEditDealerActions,
      setOn: (v) => { setEditDealerActionsOn(v); if (v) setEditDealerActions([...allDealerActionIds]); }, groups: DEALER_ACTION_GROUPS, ...yesil },
    { key: "stock", title: "Stok işlemleri", on: editStockActionsOn, selected: editStockActions, setSelected: setEditStockActions,
      setOn: (v) => { setEditStockActionsOn(v); if (v) setEditStockActions([...allStockActionIds]); }, groups: STOCK_ACTION_GROUPS, ...yesil },
    { key: "evrak", title: "Evrak işlemleri", on: editEvrakActionsOn, selected: editEvrakActions, setSelected: setEditEvrakActions,
      setOn: (v) => { setEditEvrakActionsOn(v); if (v) setEditEvrakActions([...allEvrakActionIds]); }, groups: EVRAK_ACTION_GROUPS, ...yesil },
    { key: "not", title: "Notlar işlemleri", on: editNotActionsOn, selected: editNotActions, setSelected: setEditNotActions,
      setOn: (v) => { setEditNotActionsOn(v); if (v) setEditNotActions([...allNotActionIds]); }, groups: NOT_ACTION_GROUPS, ...yesil },
    { key: "finance", title: "Finans işlemleri", on: editFinanceActionsOn, selected: editFinanceActions, setSelected: setEditFinanceActions,
      setOn: (v) => { setEditFinanceActionsOn(v); if (v) setEditFinanceActions([...allFinanceActionIds]); }, groups: FINANCE_ACTION_GROUPS, ...yesil },
  ];
  const permChekbox = (sec, item) => (
    <label key={item.id} style={chipStyle(sec.selected.includes(item.id), sec.activeBg, sec.activeBorder)}>
      <input type="checkbox" checked={sec.selected.includes(item.id)}
        onChange={e => sec.setSelected(p => e.target.checked ? [...p, item.id] : p.filter(id => id !== item.id))} style={{ margin: 0 }} />
      {item.label}
    </label>
  );
  const renderPermAccordion = () => permSections.map(sec => {
    const acik = openPerm.includes(sec.key);
    return (
      <div key={sec.key} style={{ border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, marginBottom: 8, background: "var(--surface, #ffffff)", overflow: "hidden" }}>
        <div onClick={() => setOpenPerm(p => acik ? p.filter(k => k !== sec.key) : [...p, sec.key])}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", cursor: "pointer", userSelect: "none" }}>
          <span style={{ fontSize: 10, color: "var(--n400, #94a3b8)", transform: acik ? "rotate(90deg)" : "none", transition: "transform .15s", display: "inline-block" }}>▶</span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--n700, #334155)", flex: 1 }}>{sec.title}</span>
          <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 9px", borderRadius: 99, background: sec.on ? "var(--grnBg2, #dcfce7)" : "var(--n150, #f1f5f9)", color: sec.on ? "var(--grn900, #166534)" : "var(--n400, #94a3b8)" }}>
            {sec.on ? "Özel" : "Varsayılan"}
          </span>
        </div>
        {acik && (
          <div style={{ padding: "2px 12px 12px", borderTop: "1px solid var(--n150, #f1f5f9)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", margin: "10px 0" }}>
              <input type="checkbox" checked={sec.on} onChange={e => sec.setOn(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: "#e85d1a", cursor: "pointer" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--n600, #475569)" }}>Bu kullanıcı için özelleştir</span>
            </label>
            {!sec.on ? (
              <div style={{ fontSize: 12, color: "var(--n400, #94a3b8)", paddingLeft: 4 }}>{sec.emptyText}</div>
            ) : sec.flatItems ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{sec.flatItems.map(item => permChekbox(sec, item))}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {sec.groups.map(g => (
                  <div key={g.grup}>
                    <div style={grupBaslikStyle}>{g.grup}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{g.items.map(item => permChekbox(sec, item))}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  });

  return (
    <div style={{ marginTop: 20 }}>
      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.title} message={confirmAction.message}
          icon={confirmAction.icon} confirmIcon={confirmAction.confirmIcon} confirmLabel={confirmAction.confirmLabel}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => { const run = confirmAction.run; setConfirmAction(null); run(); }}
        />
      )}
      {confirm2fa && (
        <Modal title="İki adımlı doğrulamayı sıfırla" onClose={closeReset2fa}
          footer={<>
            <Btn variant="ghost" onClick={closeReset2fa}>Vazgeç</Btn>
            <Btn variant="danger" onClick={doReset2fa} disabled={reset2faBusy}>{reset2faBusy ? "..." : "Evet, Sıfırla"}</Btn>
          </>}>
          <div style={{ fontSize: 13, color: "var(--n600, #475569)", lineHeight: 1.6, marginBottom: 12 }}>
            <b>"{confirm2fa.username}"</b> kullanıcısının iki adımlı doğrulaması sıfırlanacak. Telefon kaybı gibi durumlarda kullanılır; kullanıcı isterse yeniden kurar.
          </div>
          <div style={{ fontSize: 12.5, color: "var(--n500, #64748b)", marginBottom: 8 }}>Onaylamak için <b>kendi şifrenizi</b> girin:</div>
          <PasswordInput value={reset2faPw} onChange={e => setReset2faPw(e.target.value)} placeholder="Şifreniz" autoFocus />
          {reset2faErr && <div style={{ fontSize: 12.5, color: "var(--red600, #dc2626)", marginTop: 8 }}>{reset2faErr}</div>}
        </Modal>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--n900, #0f172a)" }}>Kullanıcılar</div>
        <button onClick={() => setShowAdd(v => !v)} style={{ padding: "6px 14px", background: "#e85d1a", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          {showAdd ? "İptal" : "+ Ekle"}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} style={{ background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--n500, #64748b)", marginBottom: 3 }}>Kullanıcı Adı</div>
              <input style={inp} type="text" value={newU.username} onChange={e => setNewU(p => ({ ...p, username: e.target.value }))} autoComplete="off" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--n500, #64748b)", marginBottom: 3 }}>Şifre</div>
              <input style={inp} type="password" value={newU.password} onChange={e => setNewU(p => ({ ...p, password: e.target.value }))} autoComplete="new-password" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--n500, #64748b)", marginBottom: 3 }}>Rol</div>
              <select style={inp} value={newU.role} onChange={e => setNewU(p => ({ ...p, role: e.target.value, tabs: e.target.value === "admin" ? ALL_TABS.map(t => t.id) : [...DEFAULT_USER_TABS] }))}>
                <option value="user">Kullanıcı</option>
                <option value="admin">Yönetici</option>
              </select>
            </div>
            <button type="submit" disabled={adding} style={{ padding: "8px 16px", background: "var(--grn600, #16a34a)", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {adding ? "..." : "Oluştur"}
            </button>
          </div>
          {newU.role === "user" && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--n500, #64748b)", marginBottom: 6 }}>Erişebileceği Sekmeler</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {ALL_TABS.map(t => (
                  <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", background: newU.tabs.includes(t.id) ? "var(--bluBg2, #dbeafe)" : "var(--surface, #ffffff)", color: "var(--n900, #0f172a)", border: `1px solid ${newU.tabs.includes(t.id) ? "var(--blu500, #3b82f6)" : "var(--n200, #e2e8f0)"}`, borderRadius: 6, padding: "4px 10px" }}>
                    <input type="checkbox" checked={newU.tabs.includes(t.id)} onChange={e => setNewU(p => ({ ...p, tabs: e.target.checked ? [...p.tabs, t.id] : p.tabs.filter(id => id !== t.id) }))} style={{ margin: 0 }} />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </form>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--n400, #94a3b8)" }}>Yükleniyor...</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--n200, #e2e8f0)" }}>
                {["Kullanıcı Adı", "Rol", "Durum", "Sekmeler", ""].map(h => (
                  <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600, color: "var(--n500, #64748b)", fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(users || []).map(u => {
                const tabs = parseTabPerms(u.permissions);
                const tabSummary = u.role === "admin" ? "Tümü" : (tabs ? `${tabs.length} / ${ALL_TABS.length}` : "Tümü");
                const hasExpandedRow = editPermsId === u.id || changePwId === u.id;
                return (
                  <>
                  <tr key={u.id} style={{ borderBottom: hasExpandedRow ? "none" : "1px solid var(--n150, #f1f5f9)" }}>
                    <td style={{ padding: "9px 10px", fontWeight: 600 }}>{u.username}</td>
                    <td style={{ padding: "9px 10px" }}>
                      <span style={{ background: u.role === "admin" ? "var(--ambBg2, #fef3c7)" : "var(--bluBg, #eff6ff)", color: u.role === "admin" ? "var(--amb800, #92400e)" : "var(--blu800, #1e40af)", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                        {u.role === "admin" ? "Yönetici" : "Kullanıcı"}
                      </span>
                    </td>
                    <td style={{ padding: "9px 10px" }}>
                      <span style={{ background: u.is_active ? "var(--grnBg2, #dcfce7)" : "var(--redBg2, #fee2e2)", color: u.is_active ? "var(--grn900, #166534)" : "var(--red800, #991b1b)", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                        {u.is_active ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td style={{ padding: "9px 10px", fontSize: 12, color: "var(--n600, #475569)" }}>
                      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
                        <span>{tabSummary}</span>
                        {u.role !== "admin" && (
                          <button onClick={() => editPermsId === u.id ? setEditPermsId(null) : openEditPerms(u)}
                            style={{ padding: "2px 7px", fontSize: 11, fontWeight: 600, borderRadius: 5, cursor: "pointer", background: editPermsId === u.id ? "var(--bluBg2, #dbeafe)" : "var(--n150, #f1f5f9)", border: "1px solid var(--n200, #e2e8f0)", color: "var(--blue2, #0369a1)" }}>
                            {editPermsId === u.id ? "Kapat" : "Düzenle"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "9px 10px" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button onClick={() => changePwId === u.id ? setChangePwId(null) : openChangePw(u)}
                          style={{ padding: "3px 9px", fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: "pointer", background: changePwId === u.id ? "var(--ambBg2, #fef3c7)" : "var(--surface, #ffffff)", border: "1px solid var(--ambBr, #fde68a)", color: "var(--amb800, #92400e)" }}>
                          Şifre
                        </button>
                        <button onClick={() => toggle(u)} style={{ padding: "3px 9px", fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: "pointer", background: "var(--surface, #ffffff)", border: "1px solid var(--n200, #e2e8f0)", color: u.is_active ? "var(--red600, #dc2626)" : "var(--grn600, #16a34a)" }}>
                          {u.is_active ? "Devre Dışı" : "Etkinleştir"}
                        </button>
                        <button onClick={() => logoutAll(u)} title="Bu kullanıcıyı tüm cihazlardan çıkar (açık oturumları kapat)" style={{ padding: "3px 9px", fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: "pointer", background: "var(--surface, #ffffff)", border: "1px solid var(--n200, #e2e8f0)", color: "var(--n600, #475569)" }}>
                          Oturumları Kapat
                        </button>
                        {u.totp_enabled ? (
                          <button onClick={() => setConfirm2fa(u)} title="İki adımlı doğrulamayı sıfırla" style={{ padding: "3px 9px", fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: "pointer", background: "var(--grnBg, #f0fdf4)", border: "1px solid var(--grnBr, #bbf7d0)", color: "var(--grn700, #15803d)" }}>
                            2FA ✓ Sıfırla
                          </button>
                        ) : null}
                        <button onClick={() => del(u)} style={{ padding: "3px 9px", fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: "pointer", background: "var(--surface, #ffffff)", border: "1px solid var(--redBr, #fecaca)", color: "var(--red600, #dc2626)" }}>
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                  {changePwId === u.id && (
                    <tr key={`${u.id}-pw`} style={{ borderBottom: "1px solid var(--n150, #f1f5f9)", background: "var(--ambBg, #fffbeb)" }}>
                      <td colSpan={5} style={{ padding: "10px 14px" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--amb800, #92400e)", marginBottom: 8 }}>"{u.username}" için yeni şifre</div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input
                            type="password" placeholder="Yeni şifre (min 6 karakter)"
                            value={newPw} onChange={e => setNewPw(e.target.value)}
                            style={{ ...inp, width: 220 }}
                            autoComplete="new-password"
                          />
                          <button onClick={() => saveChangePw(u)} disabled={changingPw}
                            style={{ padding: "7px 16px", background: "#e85d1a", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: changingPw ? .7 : 1 }}>
                            {changingPw ? "Kaydediliyor..." : "Kaydet"}
                          </button>
                          <button onClick={() => setChangePwId(null)}
                            style={{ padding: "7px 12px", background: "var(--surface, #ffffff)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--n500, #64748b)" }}>
                            İptal
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {editPermsId === u.id && (
                    <tr key={`${u.id}-perms`} style={{ borderBottom: "1px solid var(--n150, #f1f5f9)", background: "var(--n100, #f8fafc)" }}>
                      <td colSpan={5} style={{ padding: 0 }}>
                        {/* Sınırlı yükseklikli panel: içerik kayar, alttaki Kaydet çubuğu sağda yapışık kalır */}
                        <div style={{ display: "flex", flexDirection: "column", maxHeight: "62vh" }}>
                          <div style={{ overflowY: "auto", padding: "12px 14px 6px" }}>
                            {/* Sekmeler */}
                            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--n500, #64748b)", marginBottom: 8 }}>Erişebileceği Sekmeler</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                              {ALL_TABS.map(t => (
                                <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", background: editTabs.includes(t.id) ? "var(--bluBg2, #dbeafe)" : "var(--surface, #ffffff)", color: "var(--n900, #0f172a)", border: `1px solid ${editTabs.includes(t.id) ? "var(--blu500, #3b82f6)" : "var(--n200, #e2e8f0)"}`, borderRadius: 6, padding: "4px 10px" }}>
                                  <input type="checkbox" checked={editTabs.includes(t.id)} onChange={e => setEditTabs(p => e.target.checked ? [...p, t.id] : p.filter(id => id !== t.id))} style={{ margin: 0 }} />
                                  {t.label}
                                </label>
                              ))}
                            </div>
                            {/* İzin akordeonları */}
                            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--n500, #64748b)", marginBottom: 8 }}>İşlem İzinleri</div>
                            {renderPermAccordion()}
                          </div>
                          {/* Yapışık alt çubuk */}
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 14px", borderTop: "1px solid var(--n200, #e2e8f0)", background: "var(--surface, #ffffff)" }}>
                            <button onClick={() => setEditPermsId(null)} style={{ padding: "7px 14px", background: "var(--surface, #ffffff)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--n500, #64748b)" }}>
                              İptal
                            </button>
                            <button onClick={() => savePerms(u)} style={{ padding: "7px 20px", background: "var(--grn600, #16a34a)", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                              Kaydet
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
