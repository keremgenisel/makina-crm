import { useState, useMemo } from "react";
import { Btn, Icon, Modal } from "../ui";
import { fmtKalipCapi } from "../../lib/utils";
import { emptyRow } from "./uretimFormModel";

// "Manuel Satır Ekle" modalı — UretimFormu'ndan ayrıldı. Kendi arama/seçim state'ini
// kapsüller; dışarıya yalnız iki bağ verir: onClose (kapat) ve onAdd(newRows) (seçilen
// kalıpları forma ekle). Açılışta taze mount olur, böylece her açılış temiz başlar.
export function UretimSatirEkleModal({ customers = [], kalipDefs = [], onClose, onAdd }) {
  const [custSearch, setCustSearch]     = useState("");
  const [kalipSearch] = useState("");
  const [selMusteri, setSelMusteri]     = useState(null);
  const [selKalipIdxs, setSelKalipIdxs] = useState(new Set());
  const [draftRow, setDraftRow]         = useState({});

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
    onAdd(newRows);
    onClose();
  };

  return (
    <Modal
      title="Manuel Satır Ekle"
      onClose={onClose}
      width={780}
      footer={
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn small variant="ghost" onClick={onClose}>İptal</Btn>
          <Btn small onClick={addRows} disabled={!selMusteri || selKalipIdxs.size === 0}>
            <Icon name="plus" size={13} /> {selKalipIdxs.size > 1 ? `${selKalipIdxs.size} Kalıp Ekle` : "Satıra Ekle"}
          </Btn>
        </div>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 0, minHeight: 320 }}>

        {/* ── Sol: Müşteri paneli ── */}
        <div style={{ borderRight: "1px solid var(--n150, #f1f5f9)", paddingRight: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--n500, #64748b)", letterSpacing: 0.5, marginBottom: 8 }}>MÜŞTERİ</div>
          <div style={{ position: "relative", marginBottom: 8 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--n400, #94a3b8)" }}><Icon name="search" size={14} /></span>
            <input
              value={custSearch} onChange={e => setCustSearch(e.target.value)}
              placeholder="Firma ara..."
              style={{ width: "100%", border: "1.5px solid var(--n200, #e2e8f0)", borderRadius: 8, padding: "7px 10px 7px 32px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", background: "var(--n100, #f8fafc)" }}
            />
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {filtCusts.map(c => {
              const isSel = selMusteri?.id === c.id;
              return (
                <div key={c.id} onClick={() => pickMusteri(c)} style={{
                  padding: "9px 10px", cursor: "pointer", borderRadius: 8, marginBottom: 3,
                  background: isSel ? "var(--ambBg4, #fff7f3)" : "transparent",
                  border: isSel ? "1.5px solid #e85d1a" : "1.5px solid transparent",
                }}>
                  <div style={{ fontWeight: isSel ? 700 : 500, fontSize: 13, color: isSel ? "#e85d1a" : "var(--n800, #1e293b)" }}>{c.name || "—"}</div>
                  {c.model && <div style={{ fontSize: 11, color: "var(--n400, #94a3b8)", marginTop: 1 }}>{c.model}</div>}
                </div>
              );
            })}
            {filtCusts.length === 0 && <div style={{ padding: "12px 10px", color: "var(--n400, #94a3b8)", fontSize: 13 }}>Sonuç yok</div>}
          </div>
        </div>

        {/* ── Sağ: Kalıp paneli ── */}
        <div style={{ paddingLeft: 16 }}>
          {!selMusteri ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--n300, #cbd5e1)", gap: 8 }}>
              <Icon name="parts" size={36} />
              <div style={{ fontSize: 13, fontWeight: 600 }}>Önce müşteri seçin</div>
              <div style={{ fontSize: 12 }}>Seçilen müşterinin kalıpları burada görünecek</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--n500, #64748b)", letterSpacing: 0.5, marginBottom: 8 }}>
                KALIP — {selMusteri.name}
                <span style={{ fontWeight: 400, marginLeft: 6, color: "var(--n400, #94a3b8)" }}>({filtKaliplar.length} kalıp)</span>
              </div>
              <div style={{ maxHeight: 268, overflowY: "auto" }}>
                {filtKaliplar.length === 0 ? (
                  <div style={{ padding: "20px 0", color: "var(--n400, #94a3b8)", fontSize: 13, textAlign: "center" }}>
                    Bu müşteriye ait kayıtlı kalıp yok
                  </div>
                ) : filtKaliplar.map((k, idx) => {
                  const isSel = selKalipIdxs.has(idx);
                  return (
                    <div key={idx} onClick={() => toggleKalip(idx)} style={{
                      padding: "9px 10px", cursor: "pointer", borderRadius: 8, marginBottom: 3,
                      display: "flex", alignItems: "center", gap: 10,
                      background: isSel ? "var(--ambBg4, #fff7f3)" : "transparent",
                      border: isSel ? "1.5px solid #e85d1a" : "1.5px solid transparent",
                    }}>
                      {k.resim
                        ? <img src={k.resim} alt="" style={{ width: 40, height: 30, objectFit: "contain", borderRadius: 5, border: "1px solid var(--n200, #e2e8f0)", flexShrink: 0 }} />
                        : <div style={{ width: 40, height: 30, borderRadius: 5, background: "var(--n150, #f1f5f9)", flexShrink: 0 }} />
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: isSel ? 700 : 500, fontSize: 13, color: isSel ? "#e85d1a" : "var(--n800, #1e293b)" }}>{k.ad}</div>
                        {(k.kod || k.olcu) && (
                          <div style={{ fontSize: 11, color: "var(--n400, #94a3b8)", marginTop: 1 }}>
                            {[k.kod, k.olcu].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </div>
                      <div style={{
                        width: 20, height: 20, borderRadius: 5, border: "2px solid",
                        borderColor: isSel ? "#e85d1a" : "var(--n300, #cbd5e1)",
                        background: isSel ? "#e85d1a" : "var(--surface, #ffffff)",
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
      <div style={{ borderTop: "1px solid var(--n150, #f1f5f9)", paddingTop: 14, marginTop: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--n400, #94a3b8)", letterSpacing: 0.5, marginBottom: 10 }}>MANUEL ALANLAR (opsiyonel)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--n600, #475569)", marginBottom: 4 }}>CNC Programı</div>
            <input value={draftRow.torna || ""} onChange={e => setDraftRow(d => ({ ...d, torna: e.target.value }))}
              placeholder="Rakam veya yazı"
              style={{ width: "100%", border: "1.5px solid var(--n200, #e2e8f0)", borderRadius: 8, padding: "7px 10px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--n600, #475569)", marginBottom: 4 }}>Kalıp Ölçüsü</div>
            <input value={draftRow.kalipOlcusu || ""} onChange={e => setDraftRow(d => ({ ...d, kalipOlcusu: e.target.value }))}
              placeholder={selKalipIdxs.size > 1 ? "Her kalıp kendi ölçüsünü kullanır" : "ör: 48x60"}
              style={{ width: "100%", border: "1.5px solid var(--n200, #e2e8f0)", borderRadius: 8, padding: "7px 10px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--n600, #475569)", marginBottom: 4 }}>Makina Kalıp Çapı</div>
            <input value={draftRow.makinaKalipCapi || ""} onChange={e => setDraftRow(d => ({ ...d, makinaKalipCapi: e.target.value }))}
              placeholder="Müşteriden otomatik"
              style={{ width: "100%", border: "1.5px solid var(--n200, #e2e8f0)", borderRadius: 8, padding: "7px 10px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
