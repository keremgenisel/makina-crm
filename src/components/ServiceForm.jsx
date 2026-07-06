import { useState } from "react";
import { CUR_SYM, SERVICE_TYPES, REPAIR_PLACES, SALE_TYPES, DEFAULT_KDV_RATES } from "../lib/constants";
import { today, trLower, fmtCur, parseMoney, calcKDV, getKdvRateForDate, parcaAdi, partFiyatForCurrency, isAltuntasServisi, addMonthsToDateStr } from "../lib/utils";
import { Icon, Field, Input, Warn, Select, MoneyInput, Btn, Modal, SearchPick } from "./ui";

// Servis ekleme/düzenleme formu — Services.jsx ve Customers.jsx (müşteri detayından
// "Yeni Servis Talebi") tarafından paylaşılır. Tek form olduğu için ikisi de
// senkron kalır; ayrı bir kopya tutmak Makina Geçmişi'nde çözdüğümüz çift-form
// sorununu burada da yaratırdı.
export const ServiceForm = ({ title, form, setForm, customers, parts = [], dealers = [], factory = null, onSave, onCancel, kdvRates = DEFAULT_KDV_RATES, draftBar = null }) => {
  const factoryName = factory?.name || "Altuntaş Makina";
  const anlasmaliFirmalar = (dealers || []).filter(d => d.anlasmaliServisMi);
  const [custSearch, setCustSearch] = useState("");

  const selectedCust = customers.find(c => c.id === Number(form.customerId));
  const warrantyAktif = !!(selectedCust?.warrantyEnd && selectedCust.warrantyEnd >= today());
  // "İlk Çalıştırma" yalnızca garanti hâlâ aktifken VE garanti başlangıcından (installDate) en fazla
  // 6 ay geçmişken anlamlı — garantisi bitmiş veya başlangıcından 6 aydan fazla geçmiş bir makinada
  // bu seçenek soluk/tıklanamaz gösterilir.
  const ilkCalistirmaGecersiz = !!(selectedCust?.installDate) && (!warrantyAktif || today() >= addMonthsToDateStr(selectedCust.installDate, 6));
  // İşlemi yapan firma anlaşmalı bir servisse, parçanın Altuntaş'tan mı yoksa dışarıdan mı
  // tedarik edildiği belirsiz olabilir — varsayılan "Altuntaş'tan alındı" (true). Dışarıdan
  // tedarik edilse de parça ücreti yine girilebilir (müşteriye ne kadar tahsil edildiği geçmişte
  // görünsün) — sadece bu tutar Altuntaş'ın gelir/borç hesaplarına hiç girmez (bkz. isParcaUcretliMi).
  const islemAnlasmali = !isAltuntasServisi(form, factoryName);
  const parcalar = form.degisenParcalar || [];
  // Anlaşmalı bayi servisinde parça bazında dış tedarik işaretlenebilir
  const hasDisTedarikParca = islemAnlasmali && parcalar.some(p => p.disTedarik);
  const hasAltuntasParca = parcalar.some(p => !p.disTedarik);
  // parcaUcretsizMi: dış tedarik parça varsa her zaman false (o parçaların fiyatı girilmeli)
  const parcaUcretsizMi = parcalar.length === 0 || (!hasDisTedarikParca && warrantyAktif && !form.parcaGarantiDisi);
  const parcaUcretiToplam = parcalar.reduce((s, p) => s + parseMoney(typeof p === "string" ? 0 : p.fiyat), 0);
  const svUcretliTipi = form.type === "Garanti Dışı" || form.type === "Periyodik Bakım";
  const ucretliVarMi = (svUcretliTipi && parseMoney(form.servisUcreti) > 0) || (!parcaUcretsizMi && parcaUcretiToplam > 0);
  const matchedCustomers = custSearch.trim()
    ? customers.filter(c =>
        trLower(c.name).includes(trLower(custSearch)) ||
        trLower(c.contact).includes(trLower(custSearch)) ||
        trLower(c.serialNo).includes(trLower(custSearch))
      ).slice(0, 6)
    : [];

  return (
    <Modal title={title} onClose={onCancel}>
      {draftBar}
      <Field label="Müşteri">
        {selectedCust ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "2px solid #e85d1a", borderRadius: 8, background: "#fff7ed" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{selectedCust.name}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                {selectedCust.model || "Model yok"} {selectedCust.serialNo ? `· S/N: ${selectedCust.serialNo}` : ""}
              </div>
            </div>
            <button onClick={() => { setForm(p => ({ ...p, customerId: "" })); setCustSearch(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
              <Icon name="close" size={14} />
            </button>
          </div>
        ) : (
          <div>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}><Icon name="search" size={14} /></span>
              <input autoFocus value={custSearch} onChange={e => setCustSearch(e.target.value)}
                placeholder="Firma adı, kişi veya seri no ile ara..."
                style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", boxSizing: "border-box", outline: "none" }} />
            </div>
            {custSearch.trim() && (
              <div style={{ marginTop: 6, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                {matchedCustomers.map(c => (
                  <div key={c.id}
                    onClick={() => { setForm(p => ({ ...p, customerId: c.id })); setCustSearch(""); }}
                    style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: "#fff" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fff7ed"}
                    onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      {c.contact} {c.model ? `· ${c.model}` : ""} {c.serialNo ? `· ${c.serialNo}` : ""}
                    </div>
                  </div>
                ))}
                {matchedCustomers.length === 0 && (
                  <div style={{ padding: "12px 14px", fontSize: 13, color: "#94a3b8" }}>Müşteri bulunamadı.</div>
                )}
              </div>
            )}
          </div>
        )}
        <Warn>{!form.customerId ? "Müşteri seçilmedi" : ""}</Warn>
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Tarih"><Input type="date" value={form.date || ""} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></Field>
        <Field label="Teknisyen"><Input value={form.tech || ""} onChange={e => setForm(p => ({ ...p, tech: e.target.value }))} placeholder="Teknisyen adı" /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Tür">
          <Select value={form.type || "Periyodik Bakım"} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
            {SERVICE_TYPES.map(t => (
              <option key={t} disabled={(t === "Garanti İçi" && !warrantyAktif) || (t === "İlk Çalıştırma" && ilkCalistirmaGecersiz)}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Yapılan İşlem">
          <Select value={form.repairPlace || "Yerinde Onarım"} onChange={e => setForm(p => ({ ...p, repairPlace: e.target.value }))}>
            {REPAIR_PLACES.map(t => <option key={t}>{t}</option>)}
          </Select>
        </Field>
      </div>

      <Field label="İşlemi Yapan Firma">
        <Select value={form.islemFirma || factoryName} onChange={e => setForm(p => ({ ...p, islemFirma: e.target.value }))}>
          <option value={factoryName}>{factoryName}</option>
          {anlasmaliFirmalar.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </Select>
      </Field>

      <Field label="Müşteri Talimatı / Açıklama">
        <textarea value={form.musteriTalimati || ""} onChange={e => setForm(p => ({ ...p, musteriTalimati: e.target.value }))}
          placeholder="Müşterinin talimatı / talebi..."
          style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 60, boxSizing: "border-box", fontFamily: "inherit" }} />
      </Field>

      <Field label="Fabrika Notu">
        <textarea value={form.fabrikaNotu || ""} onChange={e => setForm(p => ({ ...p, fabrikaNotu: e.target.value }))}
          placeholder="Fabrika dahili notu (yazdırılan formda görünür)..."
          style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 60, boxSizing: "border-box", fontFamily: "inherit" }} />
      </Field>

      <Field label="Yapılan İşler / Parça Değişimleri">
        <textarea value={form.yapilanIsler || ""} onChange={e => setForm(p => ({ ...p, yapilanIsler: e.target.value }))}
          placeholder="Yapılan işlemler, değişen parçalar..."
          style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 80, boxSizing: "border-box", fontFamily: "inherit" }} />
      </Field>

      {/* Değişen parçalar — tanımlı yedek parçalardan çoklu seçim + her parçaya ayrı fiyat */}
      <Field label="Değişen Parçalar (varsa)">
        {parts.length === 0 ? (
          <div style={{ fontSize: 12, color: "#94a3b8" }}>Tanımlı yedek parça yok. Ayarlar → Tanımlar'dan ekleyebilirsiniz.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <SearchPick items={parts} getLabel={p => p.ad} getKey={p => p.id} placeholder="Parça ara..."
              onPick={p => setForm(prev => ({ ...prev, degisenParcalar: [...(prev.degisenParcalar || []), { partId: String(p.id), ad: p.ad, adEN: p.adEN || "", miktar: 1, fiyat: partFiyatForCurrency(p, prev.currency || "TRY"), disTedarik: false }] }))} />
          </div>
        )}
      </Field>

      {(form.degisenParcalar || []).length > 0 && (
        <>
          {hasAltuntasParca && warrantyAktif && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", marginBottom: 4 }}>
              <input type="checkbox" checked={!!form.parcaGarantiDisi} onChange={e => setForm(p => ({ ...p, parcaGarantiDisi: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#dc2626" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>
                {form.parcaGarantiDisi ? "Garanti kapsamı dışı (ücretli)" : "Garanti kapsamında, parça ücretsiz verildi"}
              </span>
            </label>
          )}
          <Field label={`Seçilen Parçalar (${form.degisenParcalar.length})`}>
            {form.degisenParcalar.map((p, i) => {
              const ad = parcaAdi(p);
              const hasPartId = p && p.partId;
              const hasComponentId = !!hasPartId;
              const itemColor = "#1d4ed8";
              const isDisTedarik = !!(islemAnlasmali && p.disTedarik);
              const cols = [
                "1fr",
                hasComponentId ? "60px" : null,
                islemAnlasmali ? "88px" : null,
                !parcaUcretsizMi ? "140px" : null,
                "36px",
              ].filter(Boolean).join(" ");
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: cols, gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isDisTedarik ? "#ea580c" : itemColor }}>
                    {ad}
                  </span>
                  {hasComponentId && (
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <input type="number" min="1" value={p.miktar ?? 1}
                        onChange={e => setForm(prev => {
                          const arr = [...prev.degisenParcalar];
                          arr[i] = { ...arr[i], miktar: parseInt(e.target.value) || 1 };
                          return { ...prev, degisenParcalar: arr };
                        })}
                        style={{ width: "100%", padding: "6px 6px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#f8fafc", textAlign: "center", boxSizing: "border-box", fontFamily: "inherit" }} />
                    </div>
                  )}
                  {islemAnlasmali && (
                    <button type="button"
                      onClick={() => setForm(prev => {
                        const arr = [...prev.degisenParcalar];
                        arr[i] = { ...arr[i], disTedarik: !arr[i].disTedarik };
                        return { ...prev, degisenParcalar: arr };
                      })}
                      title={isDisTedarik ? "Dış tedarik — Altuntaş'tan alınmadı" : "Altuntaş'tan alındı"}
                      style={{ fontSize: 10, fontWeight: 700, cursor: "pointer", padding: "4px 7px", borderRadius: 8, border: isDisTedarik ? "1px solid #f97316" : "1px solid #e2e8f0", background: isDisTedarik ? "#fff7ed" : "#f8fafc", color: isDisTedarik ? "#ea580c" : "#94a3b8", whiteSpace: "nowrap" }}>
                      {isDisTedarik ? "Dış Tedarik" : "Bizden"}
                    </button>
                  )}
                  {!parcaUcretsizMi && (
                    <MoneyInput value={typeof p === "string" ? "" : p.fiyat} sym={CUR_SYM[form.currency || "TRY"]}
                      onChange={v => setForm(prev => {
                        const arr = [...prev.degisenParcalar];
                        arr[i] = { ...arr[i], fiyat: v };
                        return { ...prev, degisenParcalar: arr };
                      })} />
                  )}
                  <button type="button" title="Bu parçayı kaldır"
                    onClick={() => setForm(prev => ({ ...prev, degisenParcalar: prev.degisenParcalar.filter((_, idx) => idx !== i) }))}
                    style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🗑</button>
                </div>
              );
            })}
          </Field>
        </>
      )}

      <Field label="Fatura Tipi">
        <Select value={form.faturaTipi || "Faturalı Yurtiçi"} onChange={e => setForm(p => ({ ...p, faturaTipi: e.target.value }))}>
          {SALE_TYPES.map(t => <option key={t}>{t}</option>)}
        </Select>
      </Field>
      {(svUcretliTipi || !parcaUcretsizMi) && (
        <div style={{ display: "grid", gridTemplateColumns: svUcretliTipi ? "1fr 1fr" : "1fr", gap: 12 }}>
          <Field label="Para Birimi">
            {/* Parça seçimi Para Birimi'nden önce yapıldığı için fiyat ilk seçimde TL üzerinden gelmiş olabilir —
                Para Birimi sonradan değiştirilince, tanımlı bir fiyatı olan satırlar yeni para birimine göre güncellenir. */}
            <Select value={form.currency || "TRY"} onChange={e => {
              const yeniPB = e.target.value;
              setForm(p => ({
                ...p,
                currency: yeniPB,
                degisenParcalar: (p.degisenParcalar || []).map(item => {
                  const ad = parcaAdi(item);
                  const tanim = item.partId
                    ? parts.find(pt => String(pt.id) === String(item.partId))
                    : parts.find(pt => pt.ad === ad);
                  const yeniFiyat = tanim ? partFiyatForCurrency(tanim, yeniPB) : "";
                  return yeniFiyat === "" ? item : { ...item, fiyat: yeniFiyat };
                }),
              }));
            }}>
              <option value="TRY">₺ Türk Lirası</option>
              <option value="USD">$ Dolar (USD)</option>
              <option value="EUR">€ Euro (EUR)</option>
            </Select>
          </Field>
          {svUcretliTipi && (
            <Field label="Servis Ücreti">
              <MoneyInput value={form.servisUcreti} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => setForm(p => ({ ...p, servisUcreti: v }))} />
              {(form.currency || "TRY") !== "TRY" && (
                <span style={{ display: "inline-block", marginTop: 5, fontSize: 11, fontWeight: 700, color: "#1d4ed8", background: "#dbeafe", padding: "4px 10px", borderRadius: 8 }}>Yurt dışı</span>
              )}
            </Field>
          )}
        </div>
      )}

      {/* Ödeme durumu — servis ve parça ücreti tek ortak toggle ile yönetilir */}
      {ucretliVarMi && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: form.odendi ? "#f0fdf4" : "#fffbeb", border: `1px solid ${form.odendi ? "#bbf7d0" : "#fde68a"}`, borderRadius: 8, padding: "10px 12px", marginBottom: 4 }}>
          <input type="checkbox" checked={!!form.odendi} onChange={e => setForm(p => ({ ...p, odendi: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#16a34a" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: form.odendi ? "#15803d" : "#92400e" }}>
            {form.odendi ? "Ücret tahsil edildi (ödendi)" : "Ücret henüz tahsil edilmedi (ödenmedi)"}
          </span>
        </label>
      )}

      {/* Servis ücreti + parça ücretleri toplamı — Faturalı Yurtiçi'de KDV dahil toplam da gösterilir */}
      {ucretliVarMi && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          {(() => {
            const parcaVar = !parcaUcretsizMi && parcaUcretiToplam > 0;
            const cur = form.currency || "TRY";
            const toplam = parseMoney(form.servisUcreti) + (parcaVar ? parcaUcretiToplam : 0);
            const kdv = calcKDV(form.faturaTipi, toplam, form.date, kdvRates);
            return (
              <>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8" }}>
                  Toplam (Servis + Parça): {fmtCur(toplam, cur)}
                </span>
                {kdv > 0 && (
                  <div style={{ fontSize: 12, color: "#065f46", marginTop: 6, fontWeight: 600 }}>
                    KDV (%{getKdvRateForDate(form.date, kdvRates)}): {fmtCur(kdv, cur)} · KDV dahil toplam: {fmtCur(toplam + kdv, cur)}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
        <Btn variant="ghost" onClick={onCancel}>İptal</Btn>
        <Btn onClick={() => onSave(parcaUcretsizMi)}><Icon name="check" size={14} /> Kaydet</Btn>
      </div>
    </Modal>
  );
};
