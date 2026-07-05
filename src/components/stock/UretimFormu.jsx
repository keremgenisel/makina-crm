import { useState, useMemo } from "react";
import { uid } from "../../lib/utils";
import { logAction } from "../../lib/audit";
import { fmtKalipCapi } from "../../lib/utils";
import { Btn, Icon, Modal, LockConflict } from "../ui";
import { useLock } from "../../hooks/useLock";

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  id: uid(),
  baslangicTarihi: todayStr(),
  bitisTarihi: todayStr(),
  kapali: false,
  not: "",
  createdAt: todayStr(),
  satirlar: [],
});

const fmtDate = d => d ? d.split("-").reverse().join(".") : "—";

const emptyRow = () => ({
  id: uid(),
  kalipDefId: null,
  kalipKodu: "",
  kalipAdi: "",
  kalipResim: "",
  musteriId: null,
  musteriAdi: "",
  sehir: "",
  makinaKodu: "",
  torna: "",
  kalipOlcusu: "",
  makinaKalipCapi: "",
  tamamlandi: false,
  kaynakTip: null,   // "musteri" | "extra_kalip" | null (manuel)
  kaynakId: null,    // customer.id veya partSale.id
  kalipIdx: null,    // kaynak dizisindeki index
});

const thSt = {
  padding: "5px 8px",
  background: "#1e293b",
  color: "#fff",
  fontWeight: 700,
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  border: "1px solid #334155",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const tdSt = {
  padding: "3px 6px",
  border: "1px solid #e2e8f0",
  verticalAlign: "middle",
};

const cellIn = {
  width: "100%",
  border: "none",
  background: "transparent",
  fontSize: 11,
  padding: "1px 0",
  outline: "none",
  fontFamily: "inherit",
};

function groupByMusteri(satirlar) {
  const order = [];
  const map = {};
  for (const r of satirlar) {
    const key = r.musteriId ? `id:${r.musteriId}` : `ad:${r.musteriAdi || ""}`;
    if (!map[key]) {
      map[key] = { musteriAdi: r.musteriAdi || "", sehir: r.sehir || "", makinaKodu: r.makinaKodu || "", rows: [] };
      order.push(key);
    }
    map[key].rows.push(r);
  }
  return order.map(k => map[k]);
}

function buildPrintHtml(form) {
  const groups = groupByMusteri(form.satirlar || []);
  const bas = form.baslangicTarihi || form.tarih || "";
  const bit = form.bitisTarihi || form.tarih || "";
  const tarihStr = bas ? (bas === bit ? fmtDate(bas) : `${fmtDate(bas)} – ${fmtDate(bit)}`) : "";

  const colHeaders = `
    <tr>
      <th style="background:#334155;color:#fff;padding:5px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.4px;border:1px solid #475569;font-weight:700;width:90px;">Kalıp Kodu</th>
      <th style="background:#334155;color:#fff;padding:5px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.4px;border:1px solid #475569;font-weight:700;">Kalıp</th>
      <th style="background:#334155;color:#fff;padding:5px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.4px;border:1px solid #475569;font-weight:700;width:110px;">Kalıp Ölçüsü</th>
      <th style="background:#334155;color:#fff;padding:5px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.4px;border:1px solid #475569;font-weight:700;width:140px;">Kalıp CNC Torna Ölçüleri</th>
      <th style="background:#334155;color:#fff;padding:5px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.4px;border:1px solid #475569;font-weight:700;width:55px;text-align:center;">Durum</th>
    </tr>`;

  const bodyRows = groups.map((g, gi) => {
    const header = `
      <tr>
        <td colspan="5" style="border:1px solid #334155;padding:6px 12px;background:#1e293b;color:#fff;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.4px;${gi > 0 ? "border-top:3px solid #0f172a;" : ""}">
          ${g.musteriAdi || "—"}${g.sehir ? ` &nbsp;—&nbsp; ${g.sehir}` : ""}${g.makinaKodu ? ` &nbsp;—&nbsp; ${g.makinaKodu}` : ""}
        </td>
      </tr>
      ${colHeaders}`;
    const rows = g.rows.map(r => `
      <tr>
        <td style="border:1px solid #ccc;padding:5px 8px;text-align:center;font-family:monospace;font-size:10px;background:#e8edf3;">${r.kalipKodu || "—"}</td>
        <td style="border:1px solid #ccc;padding:5px 8px;background:#e8edf3;">
          <div style="display:flex;align-items:center;gap:7px;">
            ${r.kalipResim ? `<img src="${r.kalipResim}" style="width:36px;height:27px;object-fit:contain;flex-shrink:0;border:1px solid #e2e8f0;border-radius:3px;">` : ""}
            <span style="font-weight:600;font-size:10px;">${r.kalipAdi || "—"}</span>
          </div>
        </td>
        <td style="border:1px solid #ccc;padding:5px 8px;font-size:10px;background:#e8edf3;">${r.kalipOlcusu || ""}</td>
        <td style="border:1px solid #ccc;padding:5px 8px;text-align:center;font-size:10px;background:#e8edf3;">${r.makinaKalipCapi || ""}</td>
        <td style="border:1px solid #ccc;padding:5px 8px;text-align:center;font-size:14px;color:#16a34a;background:${r.tamamlandi ? "#f0fdf4" : "#e8edf3"};">${r.tamamlandi ? "✓" : ""}</td>
      </tr>`).join("");
    return header + rows;
  }).join("");

  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8">
  <title>Kalıp Üretim Formu — ${tarihStr}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; margin: 0; padding: 18px; color: #1a1a1a; }
    @media print { @page { margin: 10mm 12mm; size: A4 portrait; } body { padding: 0; } }
    h2 { font-size: 15px; font-weight: 700; margin: 0 0 4px; }
    .meta { font-size: 10.5px; color: #555; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1e293b; color: #fff; padding: 7px 9px; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; border: 1px solid #334155; }
  </style>
</head><body>
  <h2>KALIP ÜRETİM FORMU</h2>
  <div class="meta">Dönem: <b>${tarihStr}</b>${form.not ? `&nbsp;·&nbsp;${form.not}` : ""}</div>
  <table>
    <tbody>
      ${bodyRows || `<tr><td colspan="5" style="text-align:center;padding:24px;color:#94a3b8;">Satır yok</td></tr>`}
    </tbody>
  </table>
</body></html>`;
}

export function UretimFormu({
  uretimFormlari = [], setUretimFormlari,
  customers = [], kalipDefs = [],
  partSales = [], setPartSales = null, setCustomers = null,
  showToast = () => {}, canDoStock = () => true, serverPermissions = null,
}) {
  const [editId, setEditId] = useState(null);
  const [form, setForm]     = useState(null);
  const lockEntityId = editId !== null && editId !== "new" ? editId : null;
  const { lockLoading, lockConflict, forceAcquire } = useLock("uretim_formu", lockEntityId);
  const [addModal, setAddModal] = useState(false);
  const [custSearch, setCustSearch]     = useState("");
  const [kalipSearch, setKalipSearch]   = useState("");
  const [selMusteri, setSelMusteri]     = useState(null);
  const [selKalipIdxs, setSelKalipIdxs] = useState(new Set());
  const [draftRow, setDraftRow]         = useState({});
  const [delConfirm, setDelConfirm]     = useState(null);

  // ── Form listesi işlemleri ──────────────────────────────────────────────────
  const openNew = () => {
    setForm(emptyForm());
    setEditId("new");
  };

  const openEdit = (f) => {
    const baslangicTarihi = f.baslangicTarihi || f.tarih || todayStr();
    const bitisTarihi = f.bitisTarihi || f.tarih || todayStr();
    setForm({ ...f, baslangicTarihi, bitisTarihi, kapali: !!f.kapali, satirlar: f.satirlar.map(r => ({ ...r })) });
    setEditId(f.id);
  };

  const saveForm = () => {
    if (!form) return;
    const isUpdate = uretimFormlari.some(f => f.id === form.id && !f.deletedAt);

    // Kaynaklarda uretimFormId işaretle
    const custUpdates = {}; // { custId: Set<kalipIdx> }
    const psIds = new Set(); // partSale id'leri (her biri zaten tek kalıp)
    for (const r of form.satirlar) {
      if (!r.kaynakTip || r.kaynakId == null) continue;
      if (r.kaynakTip === "musteri" && r.kalipIdx != null) {
        (custUpdates[r.kaynakId] ??= new Set()).add(r.kalipIdx);
      } else if (r.kaynakTip === "extra_kalip") {
        psIds.add(r.kaynakId);
      }
    }
    if (Object.keys(custUpdates).length > 0 && setCustomers) {
      setCustomers(prev => prev.map(c => {
        if (!custUpdates[c.id]) return c;
        return { ...c, kaliplar: (c.kaliplar || []).map((k, i) =>
          custUpdates[c.id].has(i) ? { ...k, uretimFormId: form.id } : k
        )};
      }));
    }
    if (psIds.size > 0 && setPartSales) {
      setPartSales(prev => prev.map(ps =>
        psIds.has(ps.id) ? { ...ps, uretimFormId: form.id } : ps
      ));
    }

    setUretimFormlari(prev => {
      const idx = prev.findIndex(f => f.id === form.id);
      return idx >= 0 ? prev.map(f => f.id === form.id ? form : f) : [...prev, form];
    });
    logAction({ serverPermissions, action: isUpdate ? "duzenlendi" : "olusturuldu", entity: "uretim_formu", entityId: form.id, entityName: form.baslangicTarihi });
    showToast("Form kaydedildi.");
  };

  const deleteForm = (id) => {
    const now = new Date().toISOString().slice(0, 10);
    const f = uretimFormlari.find(x => x.id === id);
    setUretimFormlari(prev => prev.map(x => x.id === id ? { ...x, deletedAt: now } : x));
    setDelConfirm(null);
    logAction({ serverPermissions, action: "silindi", entity: "uretim_formu", entityId: id, entityName: f?.baslangicTarihi });
    showToast("Form çöp kutusuna taşındı.");
  };

  const printSaved = (f) => {
    const html = buildPrintHtml(f);
    if (window.appPrint?.printHtml) window.appPrint.printHtml(html);
    else { const b = new Blob([html], { type: "text/html" }); window.open(URL.createObjectURL(b), "_blank"); }
  };

  // ── Satır işlemleri ────────────────────────────────────────────────────────
  const updateRow = (rowId, key, val) =>
    setForm(f => ({ ...f, satirlar: f.satirlar.map(r => r.id === rowId ? { ...r, [key]: val } : r) }));

  const deleteRow = (rowId) =>
    setForm(f => ({ ...f, satirlar: f.satirlar.filter(r => r.id !== rowId) }));

  const toggleDone = (rowId) =>
    setForm(f => ({ ...f, satirlar: f.satirlar.map(r => r.id === rowId ? { ...r, tamamlandi: !r.tamamlandi } : r) }));

  // ── Bekleyen kalıpları getir ───────────────────────────────────────────────
  const collectPending = () => {
    if (!form) return;
    if (form.kapali) { showToast("Bu dönem sonlandırılmış, yeni kalıp eklenemez."); return; }
    const { baslangicTarihi, bitisTarihi } = form;
    if (!baslangicTarihi || !bitisTarihi) {
      showToast("Önce tarih aralığını belirleyin.");
      return;
    }

    // Hangi kaynaklar bu formda zaten var?
    const already = new Set(
      form.satirlar
        .filter(r => r.kaynakTip && r.kaynakId != null)
        .map(r => r.kaynakTip === "musteri"
          ? `musteri:${r.kaynakId}:${r.kalipIdx}`
          : `extra_kalip:${r.kaynakId}`)
    );

    const newRows = [];

    // Müşteri kalıpları — installDate tarih aralığında
    for (const c of customers) {
      if (c.deletedAt) continue;
      const tarih = c.installDate || "";
      if (!tarih || tarih < baslangicTarihi || tarih > bitisTarihi) continue;
      (c.kaliplar || []).forEach((k, i) => {
        if (!k.uretimFormGonder) return;
        if (k.uretimFormId) return; // başka bir forma zaten eklendi
        if (already.has(`musteri:${c.id}:${i}`)) return;
        const def = kalipDefs.find(d => d.ad === k.ad);
        newRows.push({
          ...emptyRow(),
          kalipDefId: def?.id ?? null,
          kalipKodu: def?.kod || "",
          kalipAdi: k.ad || "",
          kalipResim: def?.resim || "",
          musteriId: c.id,
          musteriAdi: c.name || "",
          sehir: c.city || "",
          makinaKodu: c.model || "",
          makinaKalipCapi: fmtKalipCapi(c.kalipCapi) || "",
          kalipOlcusu: k.olcu || "",
          kaynakTip: "musteri",
          kaynakId: c.id,
          kalipIdx: i,
        });
      });
    }

    // Extra kalıp satışı kalıpları — her partSale kaydı tek bir kalıptır
    for (const ps of partSales) {
      if (ps.deletedAt) continue;
      if (!ps.uretimFormGonder) continue;
      if (ps.uretimFormId) continue;
      const tarih = ps.tarih || "";
      if (!tarih || tarih < baslangicTarihi || tarih > bitisTarihi) continue;
      if (already.has(`extra_kalip:${ps.id}`)) continue;
      const cust = customers.find(c => c.id === ps.customerId);
      const def = kalipDefs.find(d => d.ad === ps.ad);
      newRows.push({
        ...emptyRow(),
        kalipDefId: def?.id ?? null,
        kalipKodu: def?.kod || "",
        kalipAdi: ps.ad || "",
        kalipResim: def?.resim || "",
        musteriId: cust?.id ?? null,
        musteriAdi: cust?.name || "",
        sehir: cust?.city || "",
        makinaKodu: cust?.model || "",
        makinaKalipCapi: fmtKalipCapi(cust?.kalipCapi) || "",
        kalipOlcusu: ps.olcu || "",
        kaynakTip: "extra_kalip",
        kaynakId: ps.id,
        kalipIdx: null,
      });
    }

    if (newRows.length === 0) {
      showToast("Bu tarih aralığında bekleyen yeni kalıp yok.");
      return;
    }
    setForm(f => ({ ...f, satirlar: [...f.satirlar, ...newRows] }));
    showToast(`${newRows.length} kalıp eklendi.`);
  };

  // ── Satır ekleme modal ─────────────────────────────────────────────────────
  const openAddModal = () => {
    setSelMusteri(null);
    setSelKalipIdxs(new Set());
    setCustSearch("");
    setKalipSearch("");
    setDraftRow({});
    setAddModal(true);
  };

  const pickMusteri = (c) => {
    setSelMusteri(c);
    setSelKalipIdxs(new Set());
    setDraftRow({
      musteriId: c.id,
      musteriAdi: c.name || "",
      sehir: c.city || "",
      makinaKodu: c.model || "",
      makinaKalipCapi: fmtKalipCapi(c.kalipCapi) || "",
    });
  };

  const toggleKalip = (idx) => {
    const next = new Set(selKalipIdxs);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setSelKalipIdxs(next);
    if (next.size === 1) {
      const singleIdx = [...next][0];
      const olcu = filtKaliplar[singleIdx]?.olcu;
      setDraftRow(d => ({ ...d, kalipOlcusu: olcu || "" }));
    } else {
      setDraftRow(d => ({ ...d, kalipOlcusu: "" }));
    }
  };

  const addRows = () => {
    if (!selMusteri || selKalipIdxs.size === 0) return;
    const newRows = [...selKalipIdxs].map(idx => {
      const k = filtKaliplar[idx];
      return {
        ...emptyRow(),
        kalipDefId: k?.id ?? null,
        kalipKodu: k?.kod || "",
        kalipAdi: k?.ad || "",
        kalipResim: k?.resim || "",
        musteriId: draftRow.musteriId ?? null,
        musteriAdi: draftRow.musteriAdi || "",
        sehir: draftRow.sehir || "",
        makinaKodu: draftRow.makinaKodu || "",
        makinaKalipCapi: draftRow.makinaKalipCapi || "",
        torna: draftRow.torna || "",
        kalipOlcusu: k?.olcu || draftRow.kalipOlcusu || "",
      };
    });
    setForm(f => ({ ...f, satirlar: [...f.satirlar, ...newRows] }));
    setSelKalipIdxs(new Set());
    setAddModal(false);
  };

  const printForm = () => {
    if (!form) return;
    const html = buildPrintHtml(form);
    if (window.appPrint?.printHtml) window.appPrint.printHtml(html);
    else { const b = new Blob([html], { type: "text/html" }); window.open(URL.createObjectURL(b), "_blank"); }
  };

  // ── Filtreli listeler ──────────────────────────────────────────────────────
  const filtCusts = useMemo(() => {
    const q = custSearch.trim().toLocaleLowerCase("tr");
    const src = customers.filter(c => !c.deletedAt);
    if (!q) return src.slice(0, 25);
    return src.filter(c => (c.name || "").toLocaleLowerCase("tr").includes(q)).slice(0, 25);
  }, [customers, custSearch]);

  const filtKaliplar = useMemo(() => {
    if (selMusteri) {
      const cust = customers.find(c => c.id === selMusteri.id);
      const kaliplarArr = cust?.kaliplar || [];
      return kaliplarArr.map(k => {
        const def = kalipDefs.find(d => d.ad === k.ad);
        return { id: def?.id ?? null, ad: k.ad || "", kod: def?.kod || "", resim: def?.resim || "", olcu: k.olcu || "" };
      });
    }
    const q = kalipSearch.trim().toLocaleLowerCase("tr");
    if (!q) return kalipDefs.slice(0, 40);
    return kalipDefs.filter(k =>
      (k.ad || "").toLocaleLowerCase("tr").includes(q) ||
      (k.kod || "").toLocaleLowerCase("tr").includes(q)
    ).slice(0, 40);
  }, [kalipDefs, kalipSearch, selMusteri, customers]);

  // ══════════════════════════════════════════════════════════════════════════
  // FORM DÜZENLEME GÖRÜNÜMÜ
  // ══════════════════════════════════════════════════════════════════════════
  if (editId !== null) {
    if (lockConflict) return (
      <LockConflict lockedBy={lockConflict.lockedBy} lockedAt={lockConflict.lockedAt}
        onForce={forceAcquire} onCancel={() => { setEditId(null); setForm(null); }} />
    );
    return (
      <div>
        {/* Araç çubuğu */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          <Btn small onClick={() => { saveForm(); setEditId(null); setForm(null); }}>
            <Icon name="check" size={13} /> Kaydet
          </Btn>
          <Btn small variant="ghost" onClick={() => { setEditId(null); setForm(null); }}>← Geri</Btn>
          <div style={{ flex: 1 }} />
          {!form.kapali ? (
            <Btn small variant="ghost" onClick={() => {
              const closed = { ...form, kapali: true };
              setForm(closed);
              setUretimFormlari(prev => {
                const idx = prev.findIndex(f => f.id === closed.id);
                return idx >= 0 ? prev.map(f => f.id === closed.id ? closed : f) : [...prev, closed];
              });
              setEditId(null);
              setForm(null);
              showToast("Dönem sonlandırıldı.");
            }} style={{ color: "#b45309", borderColor: "#fde68a", background: "#fffbeb" }}>
              Dönemi Sonlandır
            </Btn>
          ) : (
            <Btn small variant="ghost" onClick={() => setForm(f => ({ ...f, kapali: false }))}
              style={{ color: "#065f46", borderColor: "#a7f3d0", background: "#ecfdf5" }}>
              Dönemi Yeniden Aç
            </Btn>
          )}
          <Btn small variant="ghost" onClick={printForm}><Icon name="print" size={13} /> Yazdır</Btn>
        </div>
        {form.kapali && (
          <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 14px", marginBottom: 14, fontSize: 13, color: "#92400e", fontWeight: 600 }}>
            Bu dönem sonlandırılmış. Düzenleyebilir ama yeni kalıp ekleyemezsiniz.
          </div>
        )}

        {/* Form başlık alanı */}
        <div style={{ display: "flex", gap: 14, marginBottom: 18, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 4 }}>BAŞLANGIÇ TARİHİ</div>
            <input type="date" value={form.baslangicTarihi || ""}
              onChange={e => setForm(f => ({ ...f, baslangicTarihi: e.target.value }))}
              style={{ border: "1.5px solid #e2e8f0", borderRadius: 7, padding: "6px 10px", fontSize: 13, fontFamily: "inherit" }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 4 }}>BİTİŞ TARİHİ</div>
            <input type="date" value={form.bitisTarihi || ""}
              onChange={e => setForm(f => ({ ...f, bitisTarihi: e.target.value }))}
              style={{ border: "1.5px solid #e2e8f0", borderRadius: 7, padding: "6px 10px", fontSize: 13, fontFamily: "inherit" }} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 4 }}>NOT (opsiyonel)</div>
            <input value={form.not} onChange={e => setForm(f => ({ ...f, not: e.target.value }))}
              placeholder="Bu periyot hakkında not..."
              style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 7, padding: "6px 10px", fontSize: 13, fontFamily: "inherit" }} />
          </div>
        </div>

        {/* Üretim tablosu */}
        <div style={{ overflowX: "auto", marginBottom: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {form.satirlar.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 28, color: "#94a3b8", fontSize: 13 }}>
                    Henüz satır yok. "Bekleyen Kalıpları Getir" veya "Manuel Satır Ekle" ile başlayın.
                  </td>
                </tr>
              )}
              {groupByMusteri(form.satirlar).map((g, gi) => (
                <>
                  {/* Müşteri başlık satırı */}
                  <tr key={`g-${gi}`}>
                    <td colSpan={6} style={{
                      padding: "6px 12px",
                      background: "#1e293b",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                      borderTop: gi > 0 ? "4px solid #0f172a" : undefined,
                    }}>
                      {g.musteriAdi || "—"}{g.sehir ? ` — ${g.sehir}` : ""}{g.makinaKodu ? ` — ${g.makinaKodu}` : ""}
                    </td>
                  </tr>
                  {/* Sütun başlıkları */}
                  <tr key={`g-cols-${gi}`}>
                    <th style={{ ...thSt, background: "#334155", width: 90 }}>Kalıp Kodu</th>
                    <th style={{ ...thSt, background: "#334155" }}>Kalıp</th>
                    <th style={{ ...thSt, background: "#334155", width: 110 }}>Kalıp Ölçüsü</th>
                    <th style={{ ...thSt, background: "#334155", width: 150 }}>Kalıp CNC Torna Ölçüleri</th>
                    <th style={{ ...thSt, background: "#334155", width: 50, textAlign: "center" }}>Bitti</th>
                    <th style={{ ...thSt, background: "#334155", width: 32 }}></th>
                  </tr>
                  {/* Kalıp satırları */}
                  {g.rows.map((r) => (
                    <tr key={r.id} style={{ background: r.tamamlandi ? "#f0fdf4" : "#e8edf3" }}>
                      <td style={tdSt}>
                        <input value={r.kalipKodu} onChange={e => updateRow(r.id, "kalipKodu", e.target.value)}
                          style={{ ...cellIn, fontFamily: "monospace" }} placeholder="—" />
                      </td>
                      <td style={tdSt}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          {r.kalipResim && (
                            <img src={r.kalipResim} alt="" style={{ width: 32, height: 24, objectFit: "contain", borderRadius: 3, border: "1px solid #e2e8f0", flexShrink: 0 }} />
                          )}
                          <input value={r.kalipAdi} onChange={e => updateRow(r.id, "kalipAdi", e.target.value)}
                            style={{ ...cellIn, fontWeight: 600 }} placeholder="Kalıp adı" />
                        </div>
                      </td>
                      <td style={tdSt}>
                        <input value={r.kalipOlcusu} onChange={e => updateRow(r.id, "kalipOlcusu", e.target.value)}
                          style={cellIn} placeholder="—" />
                      </td>
                      <td style={tdSt}>
                        <input value={r.makinaKalipCapi} onChange={e => updateRow(r.id, "makinaKalipCapi", e.target.value)}
                          style={cellIn} placeholder="—" />
                      </td>
                      <td style={{ ...tdSt, textAlign: "center" }}>
                        <button onClick={() => toggleDone(r.id)} style={{
                          width: 22, height: 22, borderRadius: 5, border: "2px solid",
                          borderColor: r.tamamlandi ? "#16a34a" : "#cbd5e1",
                          background: r.tamamlandi ? "#16a34a" : "#fff",
                          cursor: "pointer", fontSize: 13, lineHeight: 1,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          margin: "0 auto", color: "#fff",
                        }}>
                          {r.tamamlandi ? "✓" : ""}
                        </button>
                      </td>
                      <td style={{ ...tdSt, textAlign: "center" }}>
                        <button onClick={() => deleteRow(r.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 17, padding: 2, lineHeight: 1 }}>
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn small onClick={collectPending}>
            <Icon name="refresh" size={13} /> Bekleyen Kalıpları Getir
          </Btn>
          <Btn small variant="ghost" onClick={openAddModal}>
            <Icon name="plus" size={13} /> Manuel Satır Ekle
          </Btn>
        </div>

        {/* ── Satır Ekleme Modalı (manuel) ── */}
        {addModal && (
          <Modal
            title="Manuel Satır Ekle"
            onClose={() => setAddModal(false)}
            width={780}
            footer={
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Btn small variant="ghost" onClick={() => setAddModal(false)}>İptal</Btn>
                <Btn small onClick={addRows} disabled={!selMusteri || selKalipIdxs.size === 0}>
                  <Icon name="plus" size={13} /> {selKalipIdxs.size > 1 ? `${selKalipIdxs.size} Kalıp Ekle` : "Satıra Ekle"}
                </Btn>
              </div>
            }
          >
            <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 0, minHeight: 320 }}>

              {/* ── Sol: Müşteri paneli ── */}
              <div style={{ borderRight: "1px solid #f1f5f9", paddingRight: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 0.5, marginBottom: 8 }}>MÜŞTERİ</div>
                <input
                  value={custSearch} onChange={e => setCustSearch(e.target.value)}
                  placeholder="Firma ara..."
                  style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 10px", fontSize: 13, fontFamily: "inherit", marginBottom: 8, boxSizing: "border-box" }}
                />
                <div style={{ maxHeight: 260, overflowY: "auto" }}>
                  {filtCusts.map(c => {
                    const isSel = selMusteri?.id === c.id;
                    return (
                      <div key={c.id} onClick={() => pickMusteri(c)} style={{
                        padding: "9px 10px", cursor: "pointer", borderRadius: 8, marginBottom: 3,
                        background: isSel ? "#fff7f3" : "transparent",
                        border: isSel ? "1.5px solid #e85d1a" : "1.5px solid transparent",
                      }}>
                        <div style={{ fontWeight: isSel ? 700 : 500, fontSize: 13, color: isSel ? "#e85d1a" : "#1e293b" }}>{c.name || "—"}</div>
                        {c.model && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{c.model}</div>}
                      </div>
                    );
                  })}
                  {filtCusts.length === 0 && <div style={{ padding: "12px 10px", color: "#94a3b8", fontSize: 13 }}>Sonuç yok</div>}
                </div>
              </div>

              {/* ── Sağ: Kalıp paneli ── */}
              <div style={{ paddingLeft: 16 }}>
                {!selMusteri ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#cbd5e1", gap: 8 }}>
                    <Icon name="parts" size={36} />
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Önce müşteri seçin</div>
                    <div style={{ fontSize: 12 }}>Seçilen müşterinin kalıpları burada görünecek</div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 0.5, marginBottom: 8 }}>
                      KALIP — {selMusteri.name}
                      <span style={{ fontWeight: 400, marginLeft: 6, color: "#94a3b8" }}>({filtKaliplar.length} kalıp)</span>
                    </div>
                    <div style={{ maxHeight: 268, overflowY: "auto" }}>
                      {filtKaliplar.length === 0 ? (
                        <div style={{ padding: "20px 0", color: "#94a3b8", fontSize: 13, textAlign: "center" }}>
                          Bu müşteriye ait kayıtlı kalıp yok
                        </div>
                      ) : filtKaliplar.map((k, idx) => {
                        const isSel = selKalipIdxs.has(idx);
                        return (
                          <div key={idx} onClick={() => toggleKalip(idx)} style={{
                            padding: "9px 10px", cursor: "pointer", borderRadius: 8, marginBottom: 3,
                            display: "flex", alignItems: "center", gap: 10,
                            background: isSel ? "#fff7f3" : "transparent",
                            border: isSel ? "1.5px solid #e85d1a" : "1.5px solid transparent",
                          }}>
                            {k.resim
                              ? <img src={k.resim} alt="" style={{ width: 40, height: 30, objectFit: "contain", borderRadius: 5, border: "1px solid #e2e8f0", flexShrink: 0 }} />
                              : <div style={{ width: 40, height: 30, borderRadius: 5, background: "#f1f5f9", flexShrink: 0 }} />
                            }
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: isSel ? 700 : 500, fontSize: 13, color: isSel ? "#e85d1a" : "#1e293b" }}>{k.ad}</div>
                              {(k.kod || k.olcu) && (
                                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
                                  {[k.kod, k.olcu].filter(Boolean).join(" · ")}
                                </div>
                              )}
                            </div>
                            <div style={{
                              width: 20, height: 20, borderRadius: 5, border: "2px solid",
                              borderColor: isSel ? "#e85d1a" : "#cbd5e1",
                              background: isSel ? "#e85d1a" : "#fff",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              flexShrink: 0, fontSize: 12, color: "#fff", fontWeight: 700,
                            }}>
                              {isSel ? "✓" : ""}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Alt: Manuel alanlar */}
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 14, marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.5, marginBottom: 10 }}>MANUEL ALANLAR (opsiyonel)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>CNC Programı</div>
                  <input value={draftRow.torna || ""} onChange={e => setDraftRow(d => ({ ...d, torna: e.target.value }))}
                    placeholder="Rakam veya yazı"
                    style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 10px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Kalıp Ölçüsü</div>
                  <input value={draftRow.kalipOlcusu || ""} onChange={e => setDraftRow(d => ({ ...d, kalipOlcusu: e.target.value }))}
                    placeholder={selKalipIdxs.size > 1 ? "Her kalıp kendi ölçüsünü kullanır" : "ör: 48x60"}
                    style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 10px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Makina Kalıp Çapı</div>
                  <input value={draftRow.makinaKalipCapi || ""} onChange={e => setDraftRow(d => ({ ...d, makinaKalipCapi: e.target.value }))}
                    placeholder="Müşteriden otomatik"
                    style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 10px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FORM LİSTESİ GÖRÜNÜMÜ
  // ══════════════════════════════════════════════════════════════════════════
  const sorted = [...uretimFormlari].sort((a, b) => {
    const aDate = a.baslangicTarihi || a.tarih || "";
    const bDate = b.baslangicTarihi || b.tarih || "";
    return bDate.localeCompare(aDate);
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Kalıp Üretim Formları</h3>
        {canDoStock("stock_uretim_add") && <Btn onClick={openNew}><Icon name="plus" size={14} /> Yeni Form</Btn>}
      </div>

      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: "52px 0", color: "#94a3b8" }}>
          <Icon name="parts" size={40} />
          <div style={{ fontSize: 14, marginTop: 12 }}>Henüz üretim formu oluşturulmadı.</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>"Yeni Form" ile başlayın.</div>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
              {["Dönem", "Durum", "Not", "Satır", "Tamamlanan", ""].map((h, i) => (
                <th key={i} style={{ padding: "9px 12px", textAlign: i >= 3 ? "center" : "left", fontWeight: 700, color: "#64748b", fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((f, i) => {
              const done = f.satirlar.filter(r => r.tamamlandi).length;
              const allDone = f.satirlar.length > 0 && done === f.satirlar.length;
              const bas = f.baslangicTarihi || f.tarih || "";
              const bit = f.bitisTarihi || f.tarih || "";
              const donemStr = bas === bit ? fmtDate(bas) : `${fmtDate(bas)} – ${fmtDate(bit)}`;
              return (
                <tr key={f.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>{donemStr || "—"}</td>
                  <td style={{ padding: "10px 12px" }}>
                    {f.kapali
                      ? <span style={{ fontSize: 11, fontWeight: 700, background: "#fee2e2", color: "#b91c1c", padding: "3px 8px", borderRadius: 20 }}>Kapalı</span>
                      : <span style={{ fontSize: 11, fontWeight: 700, background: "#dcfce7", color: "#15803d", padding: "3px 8px", borderRadius: 20 }}>Açık</span>
                    }
                  </td>
                  <td style={{ padding: "10px 12px", color: "#64748b" }}>{f.not || "—"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>{f.satirlar.length}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <span style={{ fontWeight: 600, color: allDone ? "#16a34a" : "#64748b" }}>
                      {done}/{f.satirlar.length}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      {canDoStock("stock_uretim_edit") && <Btn small variant="ghost" onClick={() => openEdit(f)}><Icon name="edit" size={12} /></Btn>}
                      {canDoStock("stock_uretim_print") && <Btn small variant="ghost" onClick={() => printSaved(f)}><Icon name="print" size={12} /></Btn>}
                      {canDoStock("stock_uretim_delete") && <Btn small variant="danger" onClick={() => setDelConfirm(f.id)}><Icon name="trash" size={12} /></Btn>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {delConfirm && (
        <Modal title="Formu Sil" onClose={() => setDelConfirm(null)} width={360}
          footer={
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn small variant="ghost" onClick={() => setDelConfirm(null)}>İptal</Btn>
              <Btn small variant="danger" onClick={() => deleteForm(delConfirm)}>Sil</Btn>
            </div>
          }
        >
          <div style={{ fontSize: 13 }}>Bu üretim formu çöp kutusuna taşınacak. Ayarlar → Çöp Kutusu'ndan geri alabilirsiniz.</div>
        </Modal>
      )}
    </div>
  );
}
