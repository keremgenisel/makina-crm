import { useState } from "react";
import { trLower, withDeleted } from "../lib/utils";
import { PART_TYPE_PALETTE_KEYS, tipRenk } from "../lib/constants";
import { Icon, Input, Warn, Btn, ConfirmDialog } from "./ui";

// Parça tipleri yönetimi. Sistem tipleri (sistem:true) kilitlidir: adı değişmez,
// silinmez, davranış kutucukları seed değerinde sabittir. Kullanıcının eklediği
// tipler tamamen serbesttir. ModelsManager gibi bilinçli olarak useSimpleDefList'e
// bağlanmadı — çok alanlı (3 davranış bayrağı), sistem-kilidi ve silme→Standart'a
// taşıma davranışı basit {ad} listesine sığmaz.

// Bir davranış bayrağı kutucuğu (chip). Sistem tiplerinde pasif/kilitli görünür.
const FlagChip = ({ label, on, disabled, onToggle }) => {
  const renk = on
    ? { bg: "var(--grnBg2, #dcfce7)", color: "var(--grn700, #15803d)", border: "var(--grnBr2, #6ee7b7)" }
    : { bg: "var(--n100, #f8fafc)", color: "var(--n400, #94a3b8)", border: "var(--n200, #e2e8f0)" };
  return (
    <button type="button" onClick={disabled ? undefined : onToggle} disabled={disabled}
      title={disabled ? "Sistem tipi, değiştirilemez" : ""}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20,
        fontSize: 11.5, fontWeight: 600, cursor: disabled ? "default" : "pointer",
        border: `1px solid ${renk.border}`, background: renk.bg, color: renk.color,
        opacity: disabled ? 0.75 : 1,
      }}>
      <span style={{ fontSize: 11 }}>{on ? "✓" : "○"}</span>{label}
    </button>
  );
};

export const PartTypeManager = ({ partTypeDefs = [], setPartTypeDefs, parts = [], setParts = null, showToast = () => {} }) => {
  const [form, setForm] = useState({ ad: "", makinaSecici: false, stokDus: false, raporGoster: false });
  const [editId, setEditId] = useState(null);
  const [editAd, setEditAd] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  const adCakisiyor = (ad, haricId = null) =>
    partTypeDefs.some(t => t.id !== haricId && trLower(t.ad) === trLower(ad));

  // stokDus yalnız makinaSecici açıkken anlamlı — makinaSecici kapanınca stokDus da düşer.
  const normalizeFlags = (t) => (t.makinaSecici ? t : { ...t, stokDus: false });

  const add = () => {
    const ad = form.ad.trim();
    if (!ad) return;
    if (adCakisiyor(ad)) { showToast(`"${ad}" zaten tanımlı.`, "err"); return; }
    const kullanilan = partTypeDefs.filter(t => !t.sistem).length;
    const renk = PART_TYPE_PALETTE_KEYS[kullanilan % PART_TYPE_PALETTE_KEYS.length];
    const yeni = normalizeFlags({
      id: `tip_${Date.now()}`, ad, renk,
      makinaSecici: !!form.makinaSecici, stokDus: !!form.stokDus, raporGoster: !!form.raporGoster,
      sistem: false,
    });
    setPartTypeDefs(p => [...p, yeni]);
    setForm({ ad: "", makinaSecici: false, stokDus: false, raporGoster: false });
    showToast("Parça tipi eklendi.");
  };

  // Satır-içi bayrak değiştir (yalnız kullanıcı tipleri)
  const toggleFlag = (id, flag) => {
    setPartTypeDefs(p => p.map(t => {
      if (t.id !== id || t.sistem) return t;
      const val = !t[flag];
      const next = { ...t, [flag]: val };
      return normalizeFlags(flag === "makinaSecici" && !val ? { ...next, stokDus: false } : next);
    }));
  };

  const startEdit = (t) => { setEditId(t.id); setEditAd(t.ad); };
  const cancelEdit = () => { setEditId(null); setEditAd(""); };
  const saveEdit = () => {
    const ad = editAd.trim();
    if (!ad) return;
    if (adCakisiyor(ad, editId)) { showToast(`"${ad}" zaten tanımlı.`, "err"); return; }
    const oldAd = partTypeDefs.find(t => t.id === editId)?.ad;
    setPartTypeDefs(p => p.map(t => t.id === editId ? { ...t, ad } : t));
    // Ad değiştiyse, bu tipi kullanan parçaların tip alanını da güncelle (ad-bazlı eşleşme korunsun)
    if (setParts && oldAd && oldAd !== ad) {
      setParts(p => p.map(pt => pt.tip === oldAd ? { ...pt, tip: ad } : pt));
    }
    cancelEdit();
    showToast("Parça tipi güncellendi.");
  };

  const requestDelete = (t) => {
    const kullananSayisi = parts.filter(p => (p.tip || "Standart") === t.ad).length;
    setConfirmDel({ ...t, kullananSayisi });
  };
  const confirmDelete = () => {
    const { id, ad } = confirmDel;
    // Bu tipteki parçalar "Standart"a düşer, sonra tip soft-delete edilir (Çöp Kutusu)
    if (setParts) setParts(p => p.map(pt => pt.tip === ad ? { ...pt, tip: "Standart" } : pt));
    setPartTypeDefs(p => withDeleted(p, t => t.id === id));
    setConfirmDel(null);
    showToast("Parça tipi silindi.");
  };

  return (
    <div>
      {/* Ekleme satırı */}
      <div style={{ background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--n600, #475569)", marginBottom: 6 }}>Yeni Tip Adı</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 220px", minWidth: 180 }}>
            <Input value={form.ad} onChange={e => setForm(p => ({ ...p, ad: e.target.value }))}
              placeholder="Örn: Filtre, Motor, Bıçak..." onKeyDown={e => e.key === "Enter" && add()} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <FlagChip label="Müşteri formunda seç" on={form.makinaSecici}
              onToggle={() => setForm(p => normalizeFlags({ ...p, makinaSecici: !p.makinaSecici }))} />
            <FlagChip label="Stoktan düş" on={form.stokDus} disabled={!form.makinaSecici}
              onToggle={() => setForm(p => ({ ...p, stokDus: !p.stokDus }))} />
            <FlagChip label="Raporda göster" on={form.raporGoster}
              onToggle={() => setForm(p => ({ ...p, raporGoster: !p.raporGoster }))} />
          </div>
          <Btn onClick={add}><Icon name="plus" size={14} /> Ekle</Btn>
        </div>
        <Warn>{form.ad.trim() && adCakisiyor(form.ad.trim()) ? "Bu adda bir tip zaten var" : ""}</Warn>
        <div style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginTop: 8, lineHeight: 1.5 }}>
          <b>Müşteri formunda seç:</b> yeni müşteri/makina eklerken bu tipteki parça için seçici çıkar. <b>Stoktan düş:</b> seçilen parça
          makinaya atanınca stoktan 1 azalır (müşteri formunda seç şart). <b>Raporda göster:</b> makina yazdırma raporunda listelenir.
        </div>
      </div>

      {/* İkon buton hover stilleri (bir kez) */}
      <style>{`
        .ptm-iconbtn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--n200, #e2e8f0); background: var(--surface, #ffffff); color: var(--n500, #64748b); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s ease; }
        .ptm-iconbtn:hover { background: var(--n100, #f8fafc); color: var(--n700, #334155); }
        .ptm-iconbtn.danger:hover { background: var(--redBg2, #fee2e2); color: var(--red600, #dc2626); border-color: var(--redBr, #fecaca); }
      `}</style>

      {/* Tip listesi */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {partTypeDefs.map(t => {
          const c = tipRenk(t.ad, partTypeDefs);
          const duzenleniyor = editId === t.id;
          return (
            <div key={t.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 14px", borderRadius: 10, border: "1px solid var(--n200, #e2e8f0)", background: "var(--surface, #ffffff)",
            }}>
              <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
                {duzenleniyor ? (
                  <div style={{ width: 200 }}>
                    <Input value={editAd} onChange={e => setEditAd(e.target.value)} autoFocus
                      onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }} />
                  </div>
                ) : (
                  <span style={{ fontSize: 12.5, fontWeight: 700, padding: "3px 12px", borderRadius: 20, background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: "nowrap" }}>{t.ad}</span>
                )}
                {t.sistem && !duzenleniyor && (
                  <span title="Sistem tipi: adı değişmez, silinmez, davranışı sabittir" style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 700, color: "var(--n400, #94a3b8)", whiteSpace: "nowrap" }}>
                    <Icon name="lock" size={11} /> Sistem
                  </span>
                )}
              </div>

              <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <FlagChip label="Müşteri formunda seç" on={!!t.makinaSecici} disabled={t.sistem} onToggle={() => toggleFlag(t.id, "makinaSecici")} />
                <FlagChip label="Stoktan düş" on={!!t.stokDus} disabled={t.sistem || !t.makinaSecici} onToggle={() => toggleFlag(t.id, "stokDus")} />
                <FlagChip label="Raporda göster" on={!!t.raporGoster} disabled={t.sistem} onToggle={() => toggleFlag(t.id, "raporGoster")} />
              </div>

              <div style={{ flexShrink: 0, display: "flex", gap: 6, alignItems: "center" }}>
                {duzenleniyor ? (
                  <>
                    <Btn small onClick={saveEdit}><Icon name="check" size={13} /> Kaydet</Btn>
                    <Btn small variant="ghost" onClick={cancelEdit}>İptal</Btn>
                  </>
                ) : !t.sistem ? (
                  <>
                    <button type="button" className="ptm-iconbtn" title="Adı düzenle" onClick={() => startEdit(t)}><Icon name="edit" size={14} /></button>
                    <button type="button" className="ptm-iconbtn danger" title="Parça tipini sil" onClick={() => requestDelete(t)}><Icon name="trash" size={14} /></button>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {confirmDel && (
        <ConfirmDialog
          title="Parça tipini sil"
          message={`"${confirmDel.ad}" tipi silinecek.${confirmDel.kullananSayisi > 0 ? ` Bu tipteki ${confirmDel.kullananSayisi} parça "Standart"a taşınacak.` : ""}`}
          confirmLabel="Evet, Sil"
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDel(null)} />
      )}
    </div>
  );
};
