import { useState } from "react";
import { trLower, aramaNormalize, withDeleted } from "../lib/utils";
import { modelAdiTasi } from "../lib/gider";
import { Icon, Field, Input, Select, Btn, Modal, ConfirmDialog, Pagination, SearchPick, ImageUpload, TutarInput } from "./ui";
import { HataMetni, Ipucu } from "./tasarim";
import { tutarMetni } from "../lib/tutarGirdisi";
import { kilitRedMesaji } from "../lib/kilitAlanlari";
import { EK_MALIYET_IPUCU, ekMaliyetDogrula, kitAdediDogrula, modelAdiParcalardaTasi, modelAdiParcalaraDokunurMu } from "../lib/urunAgaci";
import { useFilteredList } from "../hooks/useFilteredList";

const PER_PAGE = 10;

// Spec 0087 R8/1, R16: `setParts` ad taşıma zincirinin parça yarısı içindir (parçanın model işareti yeni ada taşınır);
// `baskasiKilitli` Settings'in canlı kilit listesidir.
export const ModelsManager = ({ standardModels, setStandardModels, customModels, setCustomModels, showToast = () => {}, setCustomers = null, setStock = null, parts = [], setParts = null, appSettings = {}, setAppSettings = null, setGiderler = null, setGiderTanimlari = null, baskasiKilitli = null }) => {
  // Analiz > Model Servis Yoğunluğu'nda gösterilecek modeller: appSettings.analizGizliModeller = GİZLENEN
  // model adları. Model adı bu listede YOKSA gösterilir → onay kutusu işaretli = göster (varsayılan: hepsi açık).
  const gizliSet = new Set(appSettings?.analizGizliModeller || []);
  const analizGoster = (model) => !gizliSet.has(model);
  const toggleAnaliz = (model) => {
    setAppSettings?.(p => {
      const cur = new Set(p?.analizGizliModeller || []);
      if (cur.has(model)) cur.delete(model); else cur.add(model);
      return { ...p, analizGizliModeller: [...cur] };
    });
  };
  const empty = { model: "", urunAdi: "", urunAdiEN: "", sogutma: "Soğutmalı", kapasite: "", kalip: "", tanim: "", tanimEN: "", defaultParcalar: [] };
  const [modelModal, setModelModal] = useState(null); // null | { mode: "add" | "edit-std" | "edit-custom", data }
  const [mForm, setMForm] = useState(empty);
  const [confirmDelModel, setConfirmDelModel] = useState(null); // silinecek model adı
  const [formHata, setFormHata] = useState({ kit: {}, ek: {} });
  // Standart + özel modeller tek listede aranıp sayfalanıyor (sırayla: önce standart, sonra özel)
  const allModels = [
    ...standardModels.map(m => ({ m, isStd: true })),
    ...customModels.map(m => ({ m, isStd: false })),
  ];
  const { search, setSearch, page, setPage, filtered, paged: pagedModels } = useFilteredList(allModels, {
    searchFn: (item, q) => aramaNormalize(item.m.model).includes(q),
    perPage: PER_PAGE,
  });

  // Spec 0087: formda kit adedi ve ek kalem tutarı ham metindir; kayıtta doğrulanıp sayıya çevrilir.
  const formaAc = (m) => ({ ...m, defaultParcalar: (m.defaultParcalar || []).map(r => ({ ...r, miktar: String(r.miktar ?? "") })),
    ekMaliyetler: (m.ekMaliyetler || []).map(k => ({ ad: k.ad, tutar: tutarMetni(k.tutar) })) });
  const openAdd = () => { setMForm(empty); setFormHata({ kit: {}, ek: {} }); setModelModal({ mode: "add" }); };
  const openEdit = (m, isStd) => { setMForm(formaAc(m)); setFormHata({ kit: {}, ek: {} }); setModelModal({ mode: isStd ? "edit-std" : "edit-custom", orig: m.model }); };

  const saveModel = () => {
    const name = (mForm.model || "").trim();
    if (!name) return;
    // AC-15: kit adedi iki kapıda aynı kuraldan (en az 1 tam sayı). AC-26: ek kalemin adı boş ya da tutarı negatif reddedilir.
    const kitHata = {};
    const kit = (mForm.defaultParcalar || []).map((r, i) => { const d = kitAdediDogrula(r.miktar); if (d.hata || d.bos) kitHata[i] = d.hata || "Adet girilmedi."; return { ...r, miktar: d.deger }; });
    const ek = ekMaliyetDogrula(mForm.ekMaliyetler);
    setFormHata({ kit: kitHata, ek: ek.hatalar });
    if (Object.keys(kitHata).length || !ek.gecerli) return;
    // R9, C4: ek kalemi olmayan modelin gövdesine alan hiç yazılmaz (AC-25).
    const { ekMaliyetler: _ham, ...temel } = mForm;
    const kayit = { ...temel, defaultParcalar: kit, ...(ek.kalemler.length ? { ekMaliyetler: ek.kalemler } : {}) };
    // R16, plan P5: yeniden adlandırma parçanın işaretini taşıyacaksa (parts bölümüne yazacaksa) Parça/Yedek Parça panelinin
    // kilidine anlık bakılır; başkası tutuyorsa kayıt bütünüyle yazılmaz.
    if (modelModal.mode !== "add" && modelAdiParcalaraDokunurMu(parts, modelModal.orig, name)) {
      const k = baskasiKilitli?.("ayar", "yedekparca");
      if (k) { showToast(kilitRedMesaji(k), "err"); return; }
    }
    // Düzenlemede kendi orijinal adı hariç tutularak aynı isim kontrolü yapılır — yoksa bir modeli
    // başka birinin adıyla yeniden adlandırmak sessizce iki aynı isimli kayıt oluşturabilirdi.
    const existsElsewhere = (excludeName) =>
      standardModels.some(m => m.model !== excludeName && trLower(m.model) === trLower(name)) ||
      customModels.some(m => m.model !== excludeName && trLower(m.model) === trLower(name));
    // Model adı düz metin olarak customers[].model ve stock[].model'de kopyalanmış durumda —
    // adı düzeltince bu kayıtlarda da güncellenmeli, yoksa eski ad geçmişte kalır (bkz. SimpleDealers.jsx'teki bayi adı deseni).
    const cascadeRename = (oldName) => {
      if (!oldName || oldName === name) { showToast("Model düzenlendi."); return; }
      setCustomers?.(p => p.map(c => c.model === oldName ? { ...c, model: name } : c));
      setStock?.(p => p.map(s => s.model === oldName ? { ...s, model: name } : s));
      // Analiz gizli listesindeki adı da taşı — yoksa gizli model rename sonrası tekrar görünür olurdu.
      setAppSettings?.(p => {
        const arr = p?.analizGizliModeller || [];
        return arr.includes(oldName) ? { ...p, analizGizliModeller: arr.map(x => x === oldName ? name : x) } : p;
      });
      // Gider model satırları modele ADLA bağlıdır (spec 0001 R21, plan K35): ad taşınmazsa atama kopardı.
      setGiderler?.(p => modelAdiTasi(p, oldName, name));
      setGiderTanimlari?.(p => modelAdiTasi(p, oldName, name));
      // Spec 0087 R8/1 (AC-17): parçanın model işareti de yeni ada taşınır (kit modelin kendi kaydında, kendiliğinden taşınır).
      setParts?.(p => modelAdiParcalardaTasi(p, oldName, name));
      showToast(`Model düzenlendi. "${oldName}" adı geçmiş kayıtlarda da güncellendi.`);
    };
    if (modelModal.mode === "add") {
      if (!existsElsewhere(null)) { setCustomModels(p => p.some(m => m.model === name) ? p : [...p, { ...kayit, model: name }]); showToast("Model kaydedildi."); }
      else showToast("Bu model zaten var.", "err");
    } else if (modelModal.mode === "edit-std") {
      if (existsElsewhere(modelModal.orig)) { showToast("Bu model adı zaten kullanılıyor.", "err"); return; }
      setStandardModels(p => p.map(m => m.model === modelModal.orig ? { ...kayit, model: name } : m));
      cascadeRename(modelModal.orig);
    } else {
      if (existsElsewhere(modelModal.orig)) { showToast("Bu model adı zaten kullanılıyor.", "err"); return; }
      setCustomModels(p => p.map(m => m.model === modelModal.orig ? { ...kayit, model: name } : m));
      cascadeRename(modelModal.orig);
    }
    setModelModal(null);
  };

  const ModelRow = ({ m, isStd }) => (
    <tr style={{ borderBottom: "1px solid var(--n150, #f1f5f9)" }}>
      <td style={{ padding: "10px 12px" }}>
        {m.resim
          ? <img src={m.resim} alt={m.model} style={{ width: 40, height: 30, objectFit: "contain", borderRadius: 4, border: "1px solid var(--n200, #e2e8f0)" }} />
          : <div style={{ width: 40, height: 30, borderRadius: 4, border: "1px dashed var(--n200, #e2e8f0)", background: "var(--n100, #f8fafc)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "var(--n300, #cbd5e1)" }}>—</div>
        }
      </td>
      <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 700 }}>{m.model}</td>
      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--n500, #64748b)" }}>{m.sogutma || "—"}</td>
      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--n500, #64748b)" }}>{m.kapasite || "—"}</td>
      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--n500, #64748b)" }}>{m.kalip ? `Ø ${m.kalip}` : "—"}</td>
      <td style={{ padding: "10px 12px", fontSize: 11 }}>
        <span style={{ color: m.tanim ? "var(--grn600, #16a34a)" : "var(--n300, #cbd5e1)" }}>TR</span>
        {" · "}
        <span style={{ color: m.tanimEN ? "var(--grn600, #16a34a)" : "var(--n300, #cbd5e1)" }}>EN</span>
      </td>
      <td style={{ padding: "10px 12px", textAlign: "center" }}>
        <input type="checkbox" checked={analizGoster(m.model)} onChange={() => toggleAnaliz(m.model)}
          title="Analiz > Model Servis Yoğunluğu'nda göster"
          style={{ width: 16, height: 16, accentColor: "var(--brand, #e85d1a)", cursor: "pointer", margin: 0 }} />
      </td>
      <td style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <Btn small variant="ghost" title="Düzenle" onClick={() => openEdit(m, isStd)}><Icon name="edit" size={12} /></Btn>
          {!isStd && (
            <Btn small variant="danger" onClick={() => setConfirmDelModel(m.model)}><Icon name="trash" size={12} /></Btn>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Btn onClick={openAdd}><Icon name="plus" size={14} /> Yeni Model Ekle</Btn>
      </div>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--n400, #94a3b8)" }}><Icon name="search" size={15} /></span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Model ara..."
          style={{ padding: "9px 12px 9px 36px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, width: "100%", boxSizing: "border-box", fontSize: 14, background: "var(--n100, #f8fafc)", outline: "none" }} />
      </div>
      <div style={{ border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, overflow: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--n400, #94a3b8)", fontSize: 13 }}>
            {allModels.length === 0 ? "Henüz model yok." : "Arama sonucu bulunamadı."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--n100, #f8fafc)" }}>
                {[["", "img"], ["Model", "model"], ["Soğutma", "sog"], ["Kapasite", "kap"], ["Kalıp Çapı", "cap"], ["Tanım", "tanim"], ["Analiz", "analiz"], ["", "act"]].map(([h, k]) => (
                  <th key={k} style={{ padding: "8px 12px", textAlign: k === "analiz" ? "center" : (h === "" ? "right" : "left"), fontSize: 11, fontWeight: 700, color: "var(--n600, #475569)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedModels.map(({ m, isStd }, i) => <ModelRow key={(isStd ? "s-" : "c-") + m.model + "-" + i} m={m} isStd={isStd} />)}
            </tbody>
          </table>
        )}
      </div>
      <Pagination total={filtered.length} page={page} setPage={setPage} perPage={PER_PAGE} />
      {customModels.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--n400, #94a3b8)", marginTop: 10 }}>Henüz özel model eklenmedi.</div>
      )}

      {confirmDelModel && (
        <ConfirmDialog
          message={`"${confirmDelModel}" modeli Çöp Kutusu'na taşınacak — Ayarlar'dan 30 gün içinde geri alabilirsiniz.`} // spec 0090 R39: atama cümlesi kalktı
          onConfirm={() => { setCustomModels(p => withDeleted(p, x => x.model === confirmDelModel)); setAppSettings?.(p => { const arr = p?.analizGizliModeller || []; return arr.includes(confirmDelModel) ? { ...p, analizGizliModeller: arr.filter(x => x !== confirmDelModel) } : p; }); setConfirmDelModel(null); showToast("Model silindi."); }}
          onCancel={() => setConfirmDelModel(null)}
        />
      )}

      {modelModal && (
        <Modal wide title={modelModal.mode === "add" ? "Yeni Model Ekle" : "Modeli Düzenle"} onClose={() => setModelModal(null)}
          footer={<div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setModelModal(null)}>İptal</Btn>
            <Btn onClick={saveModel}><Icon name="check" size={14} /> Kaydet</Btn>
          </div>}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Model Adı">
              <Input value={mForm.model || ""} onChange={e => setMForm(p => ({ ...p, model: e.target.value }))} placeholder="Örn: AK160_DSC" />
              <HataMetni>{!(mForm.model || "").trim() ? "Model adı girilmedi" : ""}</HataMetni>
            </Field>
            <Field label="Ürün Adı (TR) — Teklifte görünür">
              <Input value={mForm.urunAdi || ""} onChange={e => setMForm(p => ({ ...p, urunAdi: e.target.value }))} placeholder="Örn: Soğutmalı Buz Makinesi" />
            </Field>
            <Field label="Ürün Adı (EN) — Proforma için">
              <Input value={mForm.urunAdiEN || ""} onChange={e => setMForm(p => ({ ...p, urunAdiEN: e.target.value }))} placeholder="Örn: Water Cooled Ice Machine" />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Soğutma">
              <Select value={mForm.sogutma || "Soğutmalı"} onChange={e => setMForm(p => ({ ...p, sogutma: e.target.value }))}>
                <option>Soğutmalı</option>
                <option>Soğutmasız</option>
              </Select>
            </Field>
            <Field label="Günlük Kapasite"><Input value={mForm.kapasite || ""} onChange={e => setMForm(p => ({ ...p, kapasite: e.target.value }))} placeholder="Örn: 2000 kg/gün" /></Field>
            <Field label="Kalıp Çapı"><Input value={mForm.kalip || ""} onChange={e => setMForm(p => ({ ...p, kalip: e.target.value }))} placeholder="Örn: 14 cm" /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Tanım (TR) — Teklif formunda otomatik dolar">
            <textarea value={mForm.tanim || ""} onChange={e => setMForm(p => ({ ...p, tanim: e.target.value }))}
              placeholder="Teknik özellikler, dahil kalıp notu vb."
              className="input" style={{ fontSize: 13, resize: "vertical", minHeight: 90 }} />
          </Field>
          <Field label="Tanım (EN) — Proforma ve yurtdışı teklifler için">
            <textarea value={mForm.tanimEN || ""} onChange={e => setMForm(p => ({ ...p, tanimEN: e.target.value }))}
              placeholder="English technical description..."
              className="input" style={{ fontSize: 13, resize: "vertical", minHeight: 90 }} />
          </Field>
          </div>
          <Field label="Resim (Teklif/Proforma'da görünür)">
            <ImageUpload value={mForm.resim || ""} onChange={v => setMForm(p => ({ ...p, resim: v }))} label={mForm.model} />
          </Field>

          {parts.length > 0 && (
            <Field label="Makina Kiti — Varsayılan Parçalar">
              <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginBottom: 8 }}>
                Stoka yeni makina eklerken "Kiti Uygula" ile bu liste otomatik dolar.
              </div>
              <SearchPick items={parts.filter(p => p.models?.includes(mForm.model))} getLabel={p => p.ad} getKey={p => p.id} placeholder="Parça ekle..."
                onPick={p => setMForm(prev => {
                  const existing = (prev.defaultParcalar || []).find(x => String(x.partId) === String(p.id));
                  if (existing) return prev;
                  return { ...prev, defaultParcalar: [...(prev.defaultParcalar || []), { partId: String(p.id), ad: p.ad, miktar: "1" }] };
                })} />
              {(mForm.defaultParcalar || []).length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {(mForm.defaultParcalar || []).map((row, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 32px", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--blu700, #1d4ed8)" }}>{row.ad}{formHata.kit[i] && <HataMetni>{formHata.kit[i]}</HataMetni>}</span>
                      <input inputMode="numeric" value={row.miktar ?? ""} aria-label={`${row.ad} kit adedi`}
                        onChange={e => setMForm(prev => {
                          const arr = [...prev.defaultParcalar];
                          arr[i] = { ...arr[i], miktar: e.target.value };
                          return { ...prev, defaultParcalar: arr };
                        })}
                        style={{ padding: "5px 8px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 13, background: "var(--n100, #f8fafc)", textAlign: "center", fontFamily: "inherit" }} />
                      <button type="button"
                        onClick={() => setMForm(prev => ({ ...prev, defaultParcalar: prev.defaultParcalar.filter((_, idx) => idx !== i) }))}
                        style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--redBr, #fecaca)", background: "var(--redBg, #fef2f2)", color: "var(--red600, #dc2626)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="trash" size={15} /></button>
                    </div>
                  ))}
                </div>
              )}
            </Field>
          )}

          {/* Spec 0087 R9: parça olmayan maliyet kalemleri; makina kitine ve stok düşümüne girmez (AC-23, AC-24). */}
          <Field label="Ek Maliyet Kalemleri (her makina için, TL, KDV hariç)">
            <div data-testid="ek-maliyetler" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(mForm.ekMaliyetler || []).map((k, i) => (
                <div key={i}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 32px", gap: 8, alignItems: "center" }}>
                    <Input value={k.ad || ""} aria-label={`Ek maliyet kalemi ${i + 1} adı`} placeholder="Örn: Büküm işçiliği"
                      onChange={e => setMForm(prev => ({ ...prev, ekMaliyetler: prev.ekMaliyetler.map((x, j) => (j === i ? { ...x, ad: e.target.value } : x)) }))} />
                    <TutarInput value={k.tutar ?? ""} ariaLabel={`Ek maliyet kalemi ${i + 1} tutarı`} invalid={!!formHata.ek[i]}
                      onChange={v => setMForm(prev => ({ ...prev, ekMaliyetler: prev.ekMaliyetler.map((x, j) => (j === i ? { ...x, tutar: v } : x)) }))} />
                    <button type="button" aria-label={`Ek maliyet kalemi ${i + 1} sil`}
                      onClick={() => setMForm(prev => ({ ...prev, ekMaliyetler: prev.ekMaliyetler.filter((_, j) => j !== i) }))}
                      style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--redBr, #fecaca)", background: "var(--redBg, #fef2f2)", color: "var(--red600, #dc2626)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="trash" size={15} /></button>
                  </div>
                  <HataMetni>{formHata.ek[i] || ""}</HataMetni>
                </div>
              ))}
              <div><Btn small variant="ghost" onClick={() => setMForm(prev => ({ ...prev, ekMaliyetler: [...(prev.ekMaliyetler || []), { ad: "", tutar: "" }] }))}><Icon name="plus" size={12} /> Kalem ekle</Btn></div>
              <Ipucu>{EK_MALIYET_IPUCU}</Ipucu>
            </div>
          </Field>
        </Modal>
      )}
    </div>
  );
};
