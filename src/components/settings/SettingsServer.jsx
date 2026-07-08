import { useState, useEffect } from "react";
import { Section } from "./Section";

// ── Sunucu modu kurulum bileşeni ─────────────────────────────────────────────
function SetupWizard({ onDone, flash }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [port, setPort] = useState("3000");
  const [loading, setLoading] = useState(false);

  const inp = { padding: "9px 13px", fontSize: 13, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", width: "100%", boxSizing: "border-box" };

  const handleSetup = async (e) => {
    e.preventDefault();
    if (!username.trim()) { flash("err", "Kullanıcı adı gerekli"); return; }
    if (!password || password.length < 6) { flash("err", "Şifre en az 6 karakter olmalı"); return; }
    if (password !== password2) { flash("err", "Şifreler eşleşmiyor"); return; }
    setLoading(true);
    const result = await window.appServer.setupAdmin({ username: username.trim(), password, port: parseInt(port) || 3000 });
    setLoading(false);
    if (result?.ok) {
      flash("ok", `Sunucu başlatıldı — port ${result.port}`);
      onDone(result);
    } else {
      flash("err", result?.error || "Kurulum başarısız");
    }
  };

  return (
    <form onSubmit={handleSetup} style={{ display: "grid", gap: 14, maxWidth: 400 }}>
      <div style={{ padding: "14px 16px", background: "#fef3c7", borderRadius: 10, border: "1px solid #fcd34d", fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>
        Bu PC sunucu olarak ayarlanacak. Diğer bilgisayarlar buraya bağlanacak — uygulamanın açık kalması gerekir.
        Daha önce sunucu kurulduysa mevcut admin kullanıcı adı ve şifresini girin.
      </div>
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Admin Kullanıcı Adı</label>
        <input style={inp} type="text" value={username} onChange={e => setUsername(e.target.value)} autoComplete="off" />
      </div>
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Şifre (min 6 karakter)</label>
        <input style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
      </div>
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Şifre Tekrar</label>
        <input style={inp} type="password" value={password2} onChange={e => setPassword2(e.target.value)} autoComplete="new-password" />
      </div>
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>Port (varsayılan: 3000)</label>
        <input style={{ ...inp, width: 100 }} type="number" value={port} onChange={e => setPort(e.target.value)} min={1024} max={65535} />
      </div>
      <button type="submit" disabled={loading} style={{ padding: "10px 20px", background: "#e85d1a", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: loading ? "default" : "pointer", opacity: loading ? .7 : 1, width: "fit-content" }}>
        {loading ? "Kuruluyor..." : "Sunucuyu Başlat"}
      </button>
    </form>
  );
}

const ALL_TABS = [
  { id: "dashboard", label: "Anasayfa" },
  { id: "customers", label: "Müşteriler" },
  { id: "dealers",   label: "Bayiler" },
  { id: "stock",     label: "Stok" },
  { id: "finance",   label: "Finans" },
  { id: "evrak",     label: "Evrak Yönetimi" },
  { id: "notes",     label: "Notlar" },
  { id: "settings",  label: "Ayarlar" },
];
const DEFAULT_USER_TABS = ["dashboard", "customers", "dealers", "stock", "evrak", "notes"];

function parseTabPerms(permissions) {
  try { return JSON.parse(permissions || "null")?.tabs ?? null; } catch { return null; }
}

function parseSettingsPerms(permissions) {
  try { return JSON.parse(permissions || "null")?.settings ?? null; } catch { return null; }
}

function parseCustomerActionsPerms(permissions) {
  try { return JSON.parse(permissions || "null")?.customerActions ?? null; } catch { return null; }
}

function parseDealerActionsPerms(permissions) {
  try { return JSON.parse(permissions || "null")?.dealerActions ?? null; } catch { return null; }
}

function parseStockActionsPerms(permissions) {
  try { return JSON.parse(permissions || "null")?.stockActions ?? null; } catch { return null; }
}

function parseEvrakActionsPerms(permissions) {
  try { return JSON.parse(permissions || "null")?.evrakActions ?? null; } catch { return null; }
}

function parseNotActionsPerms(permissions) {
  try { return JSON.parse(permissions || "null")?.notActions ?? null; } catch { return null; }
}

function parseFinanceActionsPerms(permissions) {
  try { return JSON.parse(permissions || "null")?.financeActions ?? null; } catch { return null; }
}

const CUSTOMER_ACTION_GROUPS = [
  { grup: "Müşteri Listesi", items: [
    { id: "cust_add",    label: "Yeni müşteri ekle" },
    { id: "cust_edit",   label: "Müşteri düzenle" },
    { id: "cust_delete", label: "Müşteri sil" },
  ]},
  { grup: "Müşteri Detayı", items: [
    { id: "cust_detail_edit",        label: "Ana kaydı düzenle" },
    { id: "cust_detail_add_machine", label: "Bu firmaya makina ekle" },
    { id: "cust_detail_new_owner",   label: "Yeni sahip (2. El Devir)" },
    { id: "cust_detail_print",       label: "Yazdır / Sandık Etiketi" },
    { id: "cust_detail_mail",        label: "E-posta gönder" },
  ]},
  { grup: "Makina Geçmişi — Servisler", items: [
    { id: "cust_service_add",     label: "Yeni servis talebi ekle" },
    { id: "cust_service_edit",    label: "Servis kaydını düzenle" },
    { id: "cust_service_payment", label: "Servis / parça ödeme durumu" },
    { id: "cust_service_delete",  label: "Servis kaydını sil" },
  ]},
  { grup: "Makina Geçmişi — Kalıp", items: [
    { id: "cust_kalip_add",     label: "Extra Kalıp Satışı ekle" },
    { id: "cust_kalip_edit",    label: "Kalıp satışını düzenle" },
    { id: "cust_kalip_payment", label: "Kalıp ödeme durumu" },
    { id: "cust_kalip_delete",  label: "Kalıp satışını sil" },
  ]},
  { grup: "Ödemeler / Kapora", items: [
    { id: "cust_payment_add",  label: "Kapora / ödeme ekle" },
    { id: "cust_taksit_tahsil", label: "Taksit tahsil et" },
    { id: "cust_payment_edit", label: "Ödeme düzenle / sil" },
  ]},
  { grup: "Görüşmeler", items: [
    { id: "cust_gorusme_add",  label: "Görüşme kaydı ekle/tamamla" },
    { id: "cust_gorusme_del",  label: "Görüşme kaydı sil" },
  ]},
];

const DEALER_ACTION_GROUPS = [
  { grup: "Bayi Listesi", items: [
    { id: "dealer_add",    label: "Yeni bayi ekle" },
    { id: "dealer_edit",   label: "Bayi düzenle" },
    { id: "dealer_delete", label: "Bayi sil" },
  ]},
];

const EVRAK_ACTION_GROUPS = [
  { grup: "Teklif", items: [
    { id: "evrak_teklif_add",     label: "Yeni teklif oluştur" },
    { id: "evrak_teklif_edit",    label: "Teklifi düzenle" },
    { id: "evrak_teklif_print",   label: "Yazdır / PDF kaydet" },
    { id: "evrak_teklif_mail",    label: "E-posta ile gönder" },
    { id: "evrak_teklif_convert", label: "Proformaya çevir / CRM'e kaydet" },
    { id: "evrak_teklif_delete",  label: "Teklifi sil" },
  ]},
  { grup: "Proforma", items: [
    { id: "evrak_proforma_add",     label: "Yeni proforma oluştur" },
    { id: "evrak_proforma_edit",    label: "Proformayı düzenle" },
    { id: "evrak_proforma_print",   label: "Yazdır / PDF kaydet" },
    { id: "evrak_proforma_mail",    label: "E-posta ile gönder" },
    { id: "evrak_proforma_convert", label: "Yurt dışı faturaya çevir" },
    { id: "evrak_proforma_delete",  label: "Proformayı sil" },
  ]},
  { grup: "Yurt Dışı Fatura", items: [
    { id: "evrak_fatura_add",    label: "Yeni fatura oluştur" },
    { id: "evrak_fatura_edit",   label: "Faturayı düzenle" },
    { id: "evrak_fatura_print",  label: "Yazdır / PDF kaydet" },
    { id: "evrak_fatura_mail",   label: "E-posta ile gönder" },
    { id: "evrak_fatura_delete", label: "Faturayı sil" },
  ]},
];

const NOT_ACTION_GROUPS = [
  { grup: "Not İşlemleri", items: [
    { id: "not_add",    label: "Yeni not oluştur" },
    { id: "not_edit",   label: "Not düzenle / kaydet" },
    { id: "not_delete", label: "Notu sil" },
  ]},
];

const FINANCE_ACTION_GROUPS = [
  { grup: "Finans — Tarih Aralıkları", items: [
    { id: "fin_range_all",       label: "Tüm Zamanlar" },
    { id: "fin_range_thisMonth", label: "Bu Ay" },
    { id: "fin_range_thisYear",  label: "Bu Yıl" },
    { id: "fin_range_lastYear",  label: "Geçen Yıl" },
    { id: "fin_range_custom",    label: "Özel Tarih" },
  ]},
  { grup: "Finans — İşlemler", items: [
    { id: "fin_rapor",           label: "Aylık rapor oluştur" },
    { id: "fin_anlasmali_detay", label: "Anlaşmalı servis detayını aç" },
  ]},
];

const STOCK_ACTION_GROUPS = [
  { grup: "Makina Stoğu", items: [
    { id: "stock_makina_add",    label: "Stoğa makina ekle" },
    { id: "stock_makina_edit",   label: "Makina düzenle" },
    { id: "stock_makina_delete", label: "Makina sil" },
  ]},
  { grup: "Parça / Yedek Parça Stoğu", items: [
    { id: "stock_parca_add",  label: "Stoğa parça ekle" },
    { id: "stock_parca_edit", label: "Stok miktarı düzelt" },
    { id: "stock_parca_pin",  label: "Parçayı dashboarda ekle/çıkar" },
  ]},
  { grup: "Kalıp Üretim", items: [
    { id: "stock_uretim_add",    label: "Yeni form oluştur" },
    { id: "stock_uretim_edit",   label: "Formu düzenle" },
    { id: "stock_uretim_print",  label: "Formu yazdır" },
    { id: "stock_uretim_mail",   label: "E-posta ile gönder" },
    { id: "stock_uretim_delete", label: "Formu sil" },
  ]},
];

// ── Kullanıcı yönetimi ────────────────────────────────────────────────────────
function UserManager({ flash, settingsGroups = [] }) {
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

  const load = async () => {
    setLoading(true);
    const res = await window.appServer.apiRequest({ method: "GET", path: "/api/users" });
    setLoading(false);
    if (res?.ok) setUsers(res.data);
  };
  useEffect(() => { load(); }, []);

  const inp = { padding: "8px 12px", fontSize: 13, borderRadius: 7, border: "1px solid #e2e8f0", background: "#f8fafc" };

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
    if (res?.ok) load(); else flash("err", "Güncellenemedi");
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
  const del = async (u) => {
    if (!window.confirm(`"${u.username}" silinsin mi?`)) return;
    const res = await window.appServer.apiRequest({ method: "DELETE", path: `/api/users/${u.id}` });
    if (res?.ok) { load(); flash("ok", "Silindi."); } else flash("err", res?.error || "Silinemedi");
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Kullanıcılar</div>
        <button onClick={() => setShowAdd(v => !v)} style={{ padding: "6px 14px", background: "#e85d1a", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          {showAdd ? "İptal" : "+ Ekle"}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 3 }}>Kullanıcı Adı</div>
              <input style={inp} type="text" value={newU.username} onChange={e => setNewU(p => ({ ...p, username: e.target.value }))} autoComplete="off" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 3 }}>Şifre</div>
              <input style={inp} type="password" value={newU.password} onChange={e => setNewU(p => ({ ...p, password: e.target.value }))} autoComplete="new-password" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 3 }}>Rol</div>
              <select style={inp} value={newU.role} onChange={e => setNewU(p => ({ ...p, role: e.target.value, tabs: e.target.value === "admin" ? ALL_TABS.map(t => t.id) : [...DEFAULT_USER_TABS] }))}>
                <option value="user">Kullanıcı</option>
                <option value="admin">Yönetici</option>
              </select>
            </div>
            <button type="submit" disabled={adding} style={{ padding: "8px 16px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {adding ? "..." : "Oluştur"}
            </button>
          </div>
          {newU.role === "user" && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>Erişebileceği Sekmeler</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {ALL_TABS.map(t => (
                  <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", background: newU.tabs.includes(t.id) ? "#e0f2fe" : "#fff", border: `1px solid ${newU.tabs.includes(t.id) ? "#0ea5e9" : "#e2e8f0"}`, borderRadius: 6, padding: "4px 10px" }}>
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
        <div style={{ fontSize: 13, color: "#94a3b8" }}>Yükleniyor...</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                {["Kullanıcı Adı", "Rol", "Durum", "Sekmeler", ""].map(h => (
                  <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600, color: "#64748b", fontSize: 12 }}>{h}</th>
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
                  <tr key={u.id} style={{ borderBottom: hasExpandedRow ? "none" : "1px solid #f1f5f9" }}>
                    <td style={{ padding: "9px 10px", fontWeight: 600 }}>{u.username}</td>
                    <td style={{ padding: "9px 10px" }}>
                      <span style={{ background: u.role === "admin" ? "#fef3c7" : "#eff6ff", color: u.role === "admin" ? "#92400e" : "#1e40af", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                        {u.role === "admin" ? "Yönetici" : "Kullanıcı"}
                      </span>
                    </td>
                    <td style={{ padding: "9px 10px" }}>
                      <span style={{ background: u.is_active ? "#dcfce7" : "#fee2e2", color: u.is_active ? "#166534" : "#991b1b", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                        {u.is_active ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td style={{ padding: "9px 10px", fontSize: 12, color: "#475569" }}>
                      {tabSummary}
                      {u.role !== "admin" && (
                        <button onClick={() => editPermsId === u.id ? setEditPermsId(null) : openEditPerms(u)}
                          style={{ marginLeft: 8, padding: "2px 7px", fontSize: 11, fontWeight: 600, borderRadius: 5, cursor: "pointer", background: editPermsId === u.id ? "#e0f2fe" : "#f1f5f9", border: "1px solid #e2e8f0", color: "#0369a1" }}>
                          {editPermsId === u.id ? "Kapat" : "Düzenle"}
                        </button>
                      )}
                    </td>
                    <td style={{ padding: "9px 10px" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button onClick={() => changePwId === u.id ? setChangePwId(null) : openChangePw(u)}
                          style={{ padding: "3px 9px", fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: "pointer", background: changePwId === u.id ? "#fef3c7" : "#fff", border: "1px solid #fde68a", color: "#92400e" }}>
                          Şifre
                        </button>
                        <button onClick={() => toggle(u)} style={{ padding: "3px 9px", fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: "pointer", background: "#fff", border: "1px solid #e2e8f0", color: u.is_active ? "#dc2626" : "#16a34a" }}>
                          {u.is_active ? "Devre Dışı" : "Etkinleştir"}
                        </button>
                        <button onClick={() => del(u)} style={{ padding: "3px 9px", fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: "pointer", background: "#fff", border: "1px solid #fecaca", color: "#dc2626" }}>
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                  {changePwId === u.id && (
                    <tr key={`${u.id}-pw`} style={{ borderBottom: "1px solid #f1f5f9", background: "#fffbeb" }}>
                      <td colSpan={5} style={{ padding: "10px 14px" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#92400e", marginBottom: 8 }}>"{u.username}" için yeni şifre</div>
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
                            style={{ padding: "7px 12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#64748b" }}>
                            İptal
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {editPermsId === u.id && (
                    <tr key={`${u.id}-perms`} style={{ borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                      <td colSpan={5} style={{ padding: "12px 14px" }}>
                        {/* Sekmeler */}
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>Erişebileceği Sekmeler</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                          {ALL_TABS.map(t => (
                            <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", background: editTabs.includes(t.id) ? "#e0f2fe" : "#fff", border: `1px solid ${editTabs.includes(t.id) ? "#0ea5e9" : "#e2e8f0"}`, borderRadius: 6, padding: "4px 10px" }}>
                              <input type="checkbox" checked={editTabs.includes(t.id)} onChange={e => setEditTabs(p => e.target.checked ? [...p, t.id] : p.filter(id => id !== t.id))} style={{ margin: 0 }} />
                              {t.label}
                            </label>
                          ))}
                        </div>

                        {/* Ayarlar bölümleri — per-user */}
                        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, marginBottom: 12 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 10 }}>
                            <input type="checkbox" checked={editSettingsOn}
                              onChange={e => { setEditSettingsOn(e.target.checked); if (e.target.checked) setEditSettings([...allSettingIds]); }}
                              style={{ width: 15, height: 15, accentColor: "#e85d1a", cursor: "pointer" }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Ayarlar bölümlerini bu kullanıcı için özelleştir</span>
                          </label>
                          {editSettingsOn ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {[...settingsGroups.flatMap(g => g.items), DANGER_SECTION].map(item => (
                                <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", background: editSettings.includes(item.id) ? "#fef3c7" : "#fff", border: `1px solid ${editSettings.includes(item.id) ? "#fcd34d" : "#e2e8f0"}`, borderRadius: 6, padding: "4px 10px" }}>
                                  <input type="checkbox" checked={editSettings.includes(item.id)} onChange={e => setEditSettings(p => e.target.checked ? [...p, item.id] : p.filter(id => id !== item.id))} style={{ margin: 0 }} />
                                  {item.label}
                                </label>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: "#94a3b8", paddingLeft: 4 }}>Varsayılan (genel ayar uygulanır)</div>
                          )}
                        </div>

                        {/* Müşteri işlemleri — per-user */}
                        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, marginBottom: 12 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 10 }}>
                            <input type="checkbox" checked={editActionsOn}
                              onChange={e => { setEditActionsOn(e.target.checked); if (e.target.checked) setEditActions([...allActionIds]); }}
                              style={{ width: 15, height: 15, accentColor: "#e85d1a", cursor: "pointer" }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Müşteri işlemlerini bu kullanıcı için özelleştir</span>
                          </label>
                          {editActionsOn ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              {CUSTOMER_ACTION_GROUPS.map(g => (
                                <div key={g.grup}>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>{g.grup}</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {g.items.map(item => (
                                      <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", background: editActions.includes(item.id) ? "#dcfce7" : "#fff", border: `1px solid ${editActions.includes(item.id) ? "#86efac" : "#e2e8f0"}`, borderRadius: 6, padding: "4px 10px" }}>
                                        <input type="checkbox" checked={editActions.includes(item.id)} onChange={e => setEditActions(p => e.target.checked ? [...p, item.id] : p.filter(id => id !== item.id))} style={{ margin: 0 }} />
                                        {item.label}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: "#94a3b8", paddingLeft: 4 }}>Varsayılan (tüm işlemler açık)</div>
                          )}
                        </div>

                        {/* Bayi işlemleri — per-user */}
                        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, marginBottom: 12 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 10 }}>
                            <input type="checkbox" checked={editDealerActionsOn}
                              onChange={e => { setEditDealerActionsOn(e.target.checked); if (e.target.checked) setEditDealerActions([...allDealerActionIds]); }}
                              style={{ width: 15, height: 15, accentColor: "#e85d1a", cursor: "pointer" }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Bayi işlemlerini bu kullanıcı için özelleştir</span>
                          </label>
                          {editDealerActionsOn ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              {DEALER_ACTION_GROUPS.map(g => (
                                <div key={g.grup}>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>{g.grup}</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {g.items.map(item => (
                                      <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", background: editDealerActions.includes(item.id) ? "#dcfce7" : "#fff", border: `1px solid ${editDealerActions.includes(item.id) ? "#86efac" : "#e2e8f0"}`, borderRadius: 6, padding: "4px 10px" }}>
                                        <input type="checkbox" checked={editDealerActions.includes(item.id)} onChange={e => setEditDealerActions(p => e.target.checked ? [...p, item.id] : p.filter(id => id !== item.id))} style={{ margin: 0 }} />
                                        {item.label}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: "#94a3b8", paddingLeft: 4 }}>Varsayılan (tüm işlemler açık)</div>
                          )}
                        </div>

                        {/* Stok işlemleri — per-user */}
                        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, marginBottom: 12 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 10 }}>
                            <input type="checkbox" checked={editStockActionsOn}
                              onChange={e => { setEditStockActionsOn(e.target.checked); if (e.target.checked) setEditStockActions([...allStockActionIds]); }}
                              style={{ width: 15, height: 15, accentColor: "#e85d1a", cursor: "pointer" }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Stok işlemlerini bu kullanıcı için özelleştir</span>
                          </label>
                          {editStockActionsOn ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              {STOCK_ACTION_GROUPS.map(g => (
                                <div key={g.grup}>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>{g.grup}</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {g.items.map(item => (
                                      <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", background: editStockActions.includes(item.id) ? "#dcfce7" : "#fff", border: `1px solid ${editStockActions.includes(item.id) ? "#86efac" : "#e2e8f0"}`, borderRadius: 6, padding: "4px 10px" }}>
                                        <input type="checkbox" checked={editStockActions.includes(item.id)} onChange={e => setEditStockActions(p => e.target.checked ? [...p, item.id] : p.filter(id => id !== item.id))} style={{ margin: 0 }} />
                                        {item.label}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: "#94a3b8", paddingLeft: 4 }}>Varsayılan (tüm işlemler açık)</div>
                          )}
                        </div>

                        {/* Evrak işlemleri — per-user */}
                        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, marginBottom: 12 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 10 }}>
                            <input type="checkbox" checked={editEvrakActionsOn}
                              onChange={e => { setEditEvrakActionsOn(e.target.checked); if (e.target.checked) setEditEvrakActions([...allEvrakActionIds]); }}
                              style={{ width: 15, height: 15, accentColor: "#e85d1a", cursor: "pointer" }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Evrak işlemlerini bu kullanıcı için özelleştir</span>
                          </label>
                          {editEvrakActionsOn ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              {EVRAK_ACTION_GROUPS.map(g => (
                                <div key={g.grup}>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>{g.grup}</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {g.items.map(item => (
                                      <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", background: editEvrakActions.includes(item.id) ? "#dcfce7" : "#fff", border: `1px solid ${editEvrakActions.includes(item.id) ? "#86efac" : "#e2e8f0"}`, borderRadius: 6, padding: "4px 10px" }}>
                                        <input type="checkbox" checked={editEvrakActions.includes(item.id)} onChange={e => setEditEvrakActions(p => e.target.checked ? [...p, item.id] : p.filter(id => id !== item.id))} style={{ margin: 0 }} />
                                        {item.label}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: "#94a3b8", paddingLeft: 4 }}>Varsayılan (tüm işlemler açık)</div>
                          )}
                        </div>

                        {/* Not işlemleri — per-user */}
                        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, marginBottom: 12 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 10 }}>
                            <input type="checkbox" checked={editNotActionsOn}
                              onChange={e => { setEditNotActionsOn(e.target.checked); if (e.target.checked) setEditNotActions([...allNotActionIds]); }}
                              style={{ width: 15, height: 15, accentColor: "#e85d1a", cursor: "pointer" }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Notlar işlemlerini bu kullanıcı için özelleştir</span>
                          </label>
                          {editNotActionsOn ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              {NOT_ACTION_GROUPS.map(g => (
                                <div key={g.grup}>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>{g.grup}</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {g.items.map(item => (
                                      <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", background: editNotActions.includes(item.id) ? "#dcfce7" : "#fff", border: `1px solid ${editNotActions.includes(item.id) ? "#86efac" : "#e2e8f0"}`, borderRadius: 6, padding: "4px 10px" }}>
                                        <input type="checkbox" checked={editNotActions.includes(item.id)} onChange={e => setEditNotActions(p => e.target.checked ? [...p, item.id] : p.filter(id => id !== item.id))} style={{ margin: 0 }} />
                                        {item.label}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: "#94a3b8", paddingLeft: 4 }}>Varsayılan (tüm işlemler açık)</div>
                          )}
                        </div>

                        {/* Finans işlemleri — per-user */}
                        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, marginBottom: 12 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 10 }}>
                            <input type="checkbox" checked={editFinanceActionsOn}
                              onChange={e => { setEditFinanceActionsOn(e.target.checked); if (e.target.checked) setEditFinanceActions([...allFinanceActionIds]); }}
                              style={{ width: 15, height: 15, accentColor: "#e85d1a", cursor: "pointer" }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Finans işlemlerini bu kullanıcı için özelleştir</span>
                          </label>
                          {editFinanceActionsOn ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              {FINANCE_ACTION_GROUPS.map(g => (
                                <div key={g.grup}>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>{g.grup}</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {g.items.map(item => (
                                      <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", background: editFinanceActions.includes(item.id) ? "#dcfce7" : "#fff", border: `1px solid ${editFinanceActions.includes(item.id) ? "#86efac" : "#e2e8f0"}`, borderRadius: 6, padding: "4px 10px" }}>
                                        <input type="checkbox" checked={editFinanceActions.includes(item.id)} onChange={e => setEditFinanceActions(p => e.target.checked ? [...p, item.id] : p.filter(id => id !== item.id))} style={{ margin: 0 }} />
                                        {item.label}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: "#94a3b8", paddingLeft: 4 }}>Varsayılan (tüm işlemler açık)</div>
                          )}
                        </div>

                        <button onClick={() => savePerms(u)} style={{ padding: "6px 16px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Kaydet
                        </button>
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

const DANGER_SECTION = { id: "danger", label: "Uygulamayı Kaldır", grup: "Tehlikeli Bölge" };

// ── Ana bileşen ───────────────────────────────────────────────────────────────
export function SettingsServer({ flash, settingsGroups = [] }) {
  const [cfg, setCfg]             = useState(null);
  const [mode, setMode]           = useState(null); // null=bekleniyor | "none" | "server" | "client"
  const [pick, setPick]           = useState(null); // "server" | "client" | null (kurulum seçimi)
  // istemci bağlantı formu
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername]   = useState("");
  const [password, setPassword]   = useState("");
  const [connecting, setConnecting] = useState(false);

  const reloadCfg = async () => {
    if (!window.appServer) { setMode("none"); return; }
    const c = await window.appServer.getConfig();
    setCfg(c);
    if (c?.isServer) { setMode("server"); }
    else if (c?.isActive) { setMode("client"); setServerUrl(c.serverUrl || ""); }
    else { setMode("none"); if (c?.serverUrl) setServerUrl(c.serverUrl); }
  };
  useEffect(() => { reloadCfg(); }, []);

  const inp = { padding: "9px 13px", fontSize: 13, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", width: "100%", boxSizing: "border-box" };
  const lbl = { display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 4 };

  if (!window.appServer) return (
    <Section title="Çoklu Kullanıcı" icon="settings">
      <div style={{ fontSize: 13, color: "#64748b" }}>Bu özellik yalnızca Electron uygulamasında kullanılabilir.</div>
    </Section>
  );

  if (mode === null) return <Section title="Çoklu Kullanıcı" icon="settings"><div style={{ fontSize: 13, color: "#94a3b8" }}>Yükleniyor...</div></Section>;

  // ── Sunucu modu aktif ─────────────────────────────────────────────────────
  if (mode === "server") {
    const running = cfg?.running;
    const ips     = cfg?.ips || [];
    const port    = cfg?.port;
    return (
      <>
        <Section title="Bu PC Sunucu Olarak Çalışıyor" icon="settings">
          <div style={{ marginBottom: 16, padding: "14px 16px", background: running ? "#d1fae5" : "#fee2e2", borderRadius: 10, border: `1px solid ${running ? "#6ee7b7" : "#fca5a5"}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: running ? "#065f46" : "#991b1b", marginBottom: 6 }}>
              {running ? `Sunucu Çalışıyor — Port ${port}` : "Sunucu Durduruldu"}
            </div>
            {running && ips.length > 0 && (
              <div style={{ fontSize: 12, color: "#047857" }}>
                <b>Diğer bilgisayarlar şu adresi kullanmalı:</b>
                {ips.map(ip => (
                  <div key={ip} style={{ fontFamily: "monospace", marginTop: 4, fontWeight: 700 }}>http://{ip}:{port}</div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {running ? (
              <button onClick={async () => { await window.appServer.stopServer(); reloadCfg(); flash("ok", "Sunucu durduruldu."); }}
                style={{ padding: "9px 18px", background: "#fff", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Sunucuyu Durdur
              </button>
            ) : (
              <button onClick={async () => { const r = await window.appServer.startServer(port); if (r?.ok) { flash("ok", `Sunucu başlatıldı — port ${r.port}`); reloadCfg(); } else flash("err", r?.error || "Başlatılamadı"); }}
                style={{ padding: "9px 18px", background: "#e85d1a", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Sunucuyu Başlat
              </button>
            )}
            <button onClick={async () => { await window.appServer.stopServer(); await window.appServer.clearConfig(); flash("ok", "Sunucu modu kapatıldı."); setTimeout(() => window.location.reload(), 600); }}
              style={{ padding: "9px 18px", background: "#fff", color: "#94a3b8", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Yerel Moda Dön
            </button>
          </div>
        </Section>
        {running && <Section title="Kullanıcı Yönetimi" icon="settings"><UserManager flash={flash} settingsGroups={settingsGroups} /></Section>}
      </>
    );
  }

  // ── İstemci modu aktif ────────────────────────────────────────────────────
  if (mode === "client") {
    return (
      <>
        <Section title="Sunucu Bağlantısı" icon="settings">
          <div style={{ marginBottom: 16, padding: "14px 16px", background: "#d1fae5", borderRadius: 10, border: "1px solid #6ee7b7" }}>
            <div style={{ fontWeight: 700, color: "#065f46", fontSize: 14, marginBottom: 4 }}>Sunucuya Bağlı</div>
            <div style={{ fontSize: 12, color: "#047857" }}><b>Sunucu:</b> {cfg?.serverUrl}</div>
            <div style={{ fontSize: 12, color: "#047857" }}>
              <b>Kullanıcı:</b> {cfg?.username}
              <span style={{ marginLeft: 8, background: cfg?.role === "admin" ? "#fef3c7" : "#eff6ff", color: cfg?.role === "admin" ? "#92400e" : "#1e40af", padding: "1px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                {cfg?.role === "admin" ? "Yönetici" : "Kullanıcı"}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={async () => { await window.appServer.logout(); flash("ok", "Oturum kapatıldı."); setTimeout(() => window.location.reload(), 600); }}
              style={{ padding: "9px 18px", background: "#fff", color: "#e85d1a", border: "1px solid #e85d1a", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Oturumu Kapat
            </button>
            <button onClick={async () => { await window.appServer.clearConfig(); flash("ok", "Yerel moda geçildi."); setTimeout(() => window.location.reload(), 600); }}
              style={{ padding: "9px 18px", background: "#fff", color: "#94a3b8", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Bağlantıyı Kes (Yerel Mod)
            </button>
          </div>
        </Section>
        {cfg?.role === "admin" && <Section title="Kullanıcı Yönetimi" icon="settings"><UserManager flash={flash} settingsGroups={settingsGroups} /></Section>}
      </>
    );
  }

  // ── Henüz yapılandırılmamış ───────────────────────────────────────────────
  return (
    <Section title="Çoklu Kullanıcı Kurulumu" icon="settings">
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20, lineHeight: 1.6 }}>
        Aynı verilere birden fazla bilgisayardan erişmek için bu PC'nin rolünü seçin.
      </div>

      {pick === null && (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <button onClick={() => setPick("server")} style={{ flex: 1, minWidth: 200, padding: "20px 18px", background: "#fff7ed", border: "2px solid #e85d1a", borderRadius: 12, cursor: "pointer", textAlign: "left" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#c2410c", marginBottom: 6 }}>🖥 Bu PC Sunucu Olsun</div>
            <div style={{ fontSize: 12, color: "#9a3412", lineHeight: 1.5 }}>
              Bu bilgisayar veriye doğrudan erişir ve diğerlerine hizmet verir. Açık kalmalıdır.
            </div>
          </button>
          <button onClick={() => setPick("client")} style={{ flex: 1, minWidth: 200, padding: "20px 18px", background: "#eff6ff", border: "2px solid #3b82f6", borderRadius: 12, cursor: "pointer", textAlign: "left" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#1d4ed8", marginBottom: 6 }}>💻 Başka Sunucuya Bağlan</div>
            <div style={{ fontSize: 12, color: "#1e40af", lineHeight: 1.5 }}>
              Ağdaki başka bir PC'deki sunucuya bağlanır ve oradan veri okur/yazar.
            </div>
          </button>
        </div>
      )}

      {pick === "server" && (
        <div style={{ marginTop: 20 }}>
          <button onClick={() => setPick(null)} style={{ fontSize: 12, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", marginBottom: 16 }}>← Geri</button>
          <SetupWizard flash={flash} onDone={() => { reloadCfg(); }} />
        </div>
      )}

      {pick === "client" && (
        <div style={{ marginTop: 20 }}>
          <button onClick={() => setPick(null)} style={{ fontSize: 12, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", marginBottom: 16 }}>← Geri</button>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!serverUrl.trim() || !username.trim() || !password) { flash("err", "Tüm alanlar zorunlu"); return; }
            setConnecting(true);
            const result = await window.appServer.login({ serverUrl: serverUrl.trim(), username: username.trim(), password });
            setConnecting(false);
            if (result?.ok) { flash("ok", "Bağlandı. Yeniden yükleniyor..."); setTimeout(() => window.location.reload(), 800); }
            else flash("err", result?.error || "Giriş başarısız");
          }} style={{ display: "grid", gap: 14, maxWidth: 400 }}>
            <div><label style={lbl}>Sunucu Adresi</label><input style={inp} type="text" value={serverUrl} onChange={e => setServerUrl(e.target.value)} placeholder="http://192.168.1.10:3000" /></div>
            <div><label style={lbl}>Kullanıcı Adı</label><input style={inp} type="text" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" /></div>
            <div><label style={lbl}>Şifre</label><input style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></div>
            <button type="submit" disabled={connecting} style={{ padding: "10px 20px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: connecting ? .7 : 1, width: "fit-content" }}>
              {connecting ? "Bağlanıyor..." : "Bağlan"}
            </button>
          </form>
        </div>
      )}
    </Section>
  );
}
