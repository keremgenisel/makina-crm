import { useState } from "react";
import { SALE_TYPES, CUR_SYM, ODEME_YONTEMLERI } from "../../lib/constants";
import { fmtCur, calcKDV, parseMoney, sumPayments, calcKalanBorc, isFaturali, isYurtIci, normalizeSaleType, getKdvRateForDate, isPaymentReceived } from "../../lib/utils";
import { Icon, Field, Input, Warn, EMAIL_RE, PHONE_RE, Select, MoneyInput, Btn, Modal, CountryCityFields, PickOrType, PaymentRowsEditor } from "../ui";

export const CustomerAddEditForm = ({
  modal, form, setForm, save, onClose,
  stock, models, kalipDefs = [], dealers, factory,
  kdvRates, payments, geoData, loadingGeo,
  addLabel, entity, parts = [],
}) => {
  const [modelPicker, setModelPicker] = useState(false);

  const getKitAutoFill = (stockEntry) => {
    if (!stockEntry?.parcalar?.length) return {};
    let konveyorSacId = "";
    let bantSecimiId = "";
    for (const row of stockEntry.parcalar) {
      const part = parts.find(p => String(p.id) === String(row.partId));
      if (part?.tip === "Konveyör Saç" && !konveyorSacId) konveyorSacId = String(row.partId);
      if (part?.tip === "Bant" && !bantSecimiId) bantSecimiId = String(row.partId);
    }
    return {
      ...(konveyorSacId ? { konveyorSacId, _konveyorFromKit: true } : {}),
      ...(bantSecimiId  ? { bantSecimiId,  _bantFromKit: true }     : {}),
    };
  };

  return (
    <Modal wide maxWidth={1180} maxHeight="88vh" title={modal === "add" ? addLabel : `${entity} Düzenle`} onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 14px", paddingBottom: 8, borderBottom: "2px solid #f1f5f9" }}>
        <Icon name="customers" size={15} />
        <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: .5 }}>Firma Bilgileri</span>
      </div>

      <Field label="Satın Alan">
        <div style={{ maxWidth: "50%" }}>
          <Input value={form.name || ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Satın alan firma / kişi" />
          <Warn>{!form.name?.trim() ? "Satın alan adı girilmedi" : ""}</Warn>
        </div>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Yetkili 1 - Ad Soyad"><Input value={form.yetkili1Ad || ""} onChange={e => setForm(p => ({ ...p, yetkili1Ad: e.target.value }))} placeholder="Ad Soyad" /></Field>
        <Field label="Yetkili 1 - Telefon">
          <Input value={form.yetkili1Tel || ""} onChange={e => setForm(p => ({ ...p, yetkili1Tel: e.target.value }))} placeholder="0xxx xxx xx xx" />
          <Warn>{form.yetkili1Tel && !PHONE_RE.test(form.yetkili1Tel) ? "Geçersiz telefon formatı" : ""}</Warn>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Yetkili 2 - Ad Soyad"><Input value={form.yetkili2Ad || ""} onChange={e => setForm(p => ({ ...p, yetkili2Ad: e.target.value }))} placeholder="Ad Soyad" /></Field>
        <Field label="Yetkili 2 - Telefon">
          <Input value={form.yetkili2Tel || ""} onChange={e => setForm(p => ({ ...p, yetkili2Tel: e.target.value }))} placeholder="0xxx xxx xx xx" />
          <Warn>{form.yetkili2Tel && !PHONE_RE.test(form.yetkili2Tel) ? "Geçersiz telefon formatı" : ""}</Warn>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Şirket Telefonu">
          <Input value={form.phone || ""} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="0xxx xxx xx xx" />
          <Warn>{form.phone && !PHONE_RE.test(form.phone) ? "Geçersiz telefon formatı" : ""}</Warn>
        </Field>
        <Field label="E-posta">
          <Input value={form.email || ""} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="ornek@firma.com" />
          <Warn>{form.email && !EMAIL_RE.test(form.email) ? "Geçersiz e-posta formatı" : ""}</Warn>
        </Field>
      </div>

      <Field label="Adres Satırı"><Input value={form.adres || ""} onChange={e => setForm(p => ({ ...p, adres: e.target.value }))} placeholder="Mahalle, cadde, no..." /></Field>
      <CountryCityFields country={form.country} city={form.city}
        onCountry={v => setForm(p => ({ ...p, country: v }))}
        onCity={v => setForm(p => ({ ...p, city: v }))}
        geoData={geoData} loadingGeo={loadingGeo} />

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "28px 0 14px", paddingBottom: 8, borderBottom: "2px solid #f1f5f9" }}>
        <Icon name="machine" size={15} />
        <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: .5 }}>Makina Bilgileri</span>
      </div>

      <Field label="Kalıp Sayısı (otomatik)">
        <div style={{ maxWidth: 220, padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f1f5f9", color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
          <b style={{ color: "#0f172a", fontSize: 16 }}>{(form.kaliplar || []).length}</b>
          <span style={{ fontSize: 12 }}>kalıp · aşağıdaki listeden eklenir/silinir</span>
        </div>
      </Field>

      <Field label="Model">
        <div
          onClick={() => setModelPicker(p => !p)}
          style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", userSelect: "none" }}
        >
          <span style={{ color: form.model ? "#0f172a" : "#94a3b8" }}>{form.model || "Model seçin..."}</span>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>{modelPicker ? "▲" : "▼"}</span>
        </div>
        {modelPicker && (
          <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {models.map(m => (
              <div
                key={m.model}
                onClick={() => { setForm(p => ({ ...p, model: m.model })); setModelPicker(false); }}
                style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", border: "2px solid", borderColor: form.model === m.model ? "#e85d1a" : "#e2e8f0", background: form.model === m.model ? "#fff7ed" : "#fff" }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{m.model}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{m.sogutma}</div>
                <div style={{ fontSize: 11, color: "#e85d1a", fontWeight: 600 }}>{m.kapasite}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>Ø {m.kalip}</div>
              </div>
            ))}
          </div>
        )}
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
      <Field label="Seri Numarası">
        {(() => {
          const stockForModel = (stock && form.model) ? stock.filter(s => s.model === form.model) : [];
          const serili = stockForModel.filter(s => s.serialNo);
          const serisiz = stockForModel.filter(s => !s.serialNo);
          const isSerialPendingEdit = modal?.edit && form.seriNoBekliyor && !modal.edit.serialNo;
          if ((modal === "add" || isSerialPendingEdit) && stock && form.model && stockForModel.length > 0 && !form._manualSerial) {
            return (
              <>
                <Select value={form._stokSerisiz ? "__serisiz__" : (form.serialNo || "")} onChange={e => {
                  if (e.target.value === "__manual__") {
                    setForm(p => ({ ...p, _manualSerial: true, _stokSerisiz: false, serialNo: "", _konveyorFromKit: false, _bantFromKit: false }));
                  } else if (e.target.value === "__serisiz__") {
                    const firstSerisiz = stockForModel.find(s => !s.serialNo);
                    setForm(p => ({ ...p, _stokSerisiz: true, serialNo: "", ...getKitAutoFill(firstSerisiz) }));
                  } else {
                    const stockEntry = stockForModel.find(s => s.serialNo === e.target.value);
                    setForm(p => ({ ...p, _stokSerisiz: false, serialNo: e.target.value, ...getKitAutoFill(stockEntry) }));
                  }
                }}>
                  <option value="">Stoktan seçin... ({stockForModel.length} adet)</option>
                  {serili.map(s => <option key={s.id} value={s.serialNo}>{s.serialNo}</option>)}
                  {serisiz.length > 0 && <option value="__serisiz__">Seri no'suz stoktan düş ({serisiz.length} adet), seri no sonra atanır</option>}
                  <option value="__manual__">Manuel gir (stok dışı / eski müşteri)</option>
                </Select>
                {form._stokSerisiz ? (
                  <div style={{ fontSize: 11, color: "#d97706", marginTop: 5, fontWeight: 600 }}>
                    Seri no'suz satış yapılıyor, stoktan 1 adet düşülecek. Seri no'yu sonra "Müşteriyi Düzenle" bölümünden girebilirsiniz.
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: "#059669", marginTop: 5, fontWeight: 600 }}>
                    Stoktan seçilen seri no satış kaydedilince stoktan otomatik düşülür
                  </div>
                )}
              </>
            );
          }
          return (
            <>
              <Input value={form.serialNo || ""} onChange={e => setForm(p => ({ ...p, serialNo: e.target.value }))} placeholder="AK140-2026-001" autoFocus={form._manualSerial} />
              {(modal === "add" || isSerialPendingEdit) && form._manualSerial && stockForModel.length > 0 && (
                <button onClick={() => setForm(p => ({ ...p, _manualSerial: false, serialNo: "" }))}
                  style={{ marginTop: 5, fontSize: 11, color: "#e85d1a", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>
                  Stoktan seçime dön
                </button>
              )}
              {(modal === "add" || isSerialPendingEdit) && form._manualSerial && (
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                  Manuel girilen seri no stoktan düşülmez (eski müşteri kaydı için uygundur).
                </div>
              )}
              {(modal === "add" || isSerialPendingEdit) && stock && form.model && stockForModel.length === 0 && (
                <div style={{ fontSize: 11, color: "#dc2626", marginTop: 5 }}>
                  Bu modelden stokta makina yok, seri no elle girilecek.
                </div>
              )}
              {(modal === "add" || isSerialPendingEdit) && stock && !form.model && (
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 5 }}>
                  Stoktan seri no seçebilmek için önce yukarıdan <b>Model</b> seçin.
                </div>
              )}
            </>
          );
        })()}
      </Field>
      </div>

      <Field label="Makina Kalıp Çapı">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Input value={form.kalipCapi?.en || ""} placeholder="Çap"
            onChange={e => setForm(p => ({ ...p, kalipCapi: { ...(p.kalipCapi || {}), en: e.target.value } }))} />
          <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: 16 }}>×</span>
          <Input value={form.kalipCapi?.yukseklik || ""} placeholder="Arka Ölçü"
            onChange={e => setForm(p => ({ ...p, kalipCapi: { ...(p.kalipCapi || {}), yukseklik: e.target.value } }))} />
          <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: 16 }}>×</span>
          <Input value={form.kalipCapi?.boy || ""} placeholder="Boy"
            onChange={e => setForm(p => ({ ...p, kalipCapi: { ...(p.kalipCapi || {}), boy: e.target.value } }))} />
        </div>
      </Field>

      <Field label={`Kalıp Ölçüleri (${(form.kaliplar || []).length} kalıp)`}>
        {(form.kaliplar || []).map((k, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 36px", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", whiteSpace: "nowrap" }}>{i + 1}.</span>
            <Select value={k.ad || ""}
              onChange={e => setForm(p => {
                const arr = [...(p.kaliplar || [])];
                arr[i] = { ...arr[i], ad: e.target.value };
                return { ...p, kaliplar: arr, kalipSayisi: arr.length };
              })}>
              <option value="">Kalıp seçin...</option>
              {kalipDefs.map(d => <option key={d.id} value={d.ad}>{d.ad}</option>)}
            </Select>
            <Input value={k.olcu || ""} placeholder="Ölçü (örn: 55x125 mm)"
              onChange={e => setForm(p => {
                const arr = [...(p.kaliplar || [])];
                arr[i] = { ...arr[i], olcu: e.target.value };
                return { ...p, kaliplar: arr, kalipSayisi: arr.length };
              })} />
            <button type="button" title="Bu kalıbı sil"
              onClick={() => setForm(p => {
                const arr = (p.kaliplar || []).filter((_, idx) => idx !== i);
                return { ...p, kaliplar: arr, kalipSayisi: arr.length };
              })}
              style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🗑</button>
          </div>
        ))}
        <button type="button"
          onClick={() => setForm(p => {
            const arr = [...(p.kaliplar || []), { ad: "", olcu: "" }];
            return { ...p, kaliplar: arr, kalipSayisi: arr.length };
          })}
          style={{ marginTop: 4, padding: "8px 16px", borderRadius: 8, border: "1px dashed #e85d1a", background: "#fff7ed", color: "#e85d1a", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
          + Kalıp Ekle
        </button>
      </Field>

      {(() => {
        const konveyorParts = parts.filter(p => (p.tip === "Konveyör Saç") && (!p.models?.length || !form.model || p.models.includes(form.model)));
        const bantParts     = parts.filter(p => (p.tip === "Bant")         && (!p.models?.length || !form.model || p.models.includes(form.model)));
        if (!konveyorParts.length && !bantParts.length) return null;
        return (
          <>
            {konveyorParts.length > 0 && (
              <Field label="Konveyör Saç">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {konveyorParts.map(p => {
                    const active = form.konveyorSacId === String(p.id);
                    return (
                      <button key={p.id} type="button"
                        onClick={() => setForm(prev => ({ ...prev, konveyorSacId: active ? "" : String(p.id), _konveyorFromKit: false }))}
                        style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid",
                          borderColor: active ? "#1d4ed8" : "#e2e8f0",
                          background: active ? "#eff6ff" : "#f8fafc",
                          color: active ? "#1d4ed8" : "#64748b" }}>
                        {p.ad}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}
            {bantParts.length > 0 && (
              <Field label="Bant">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {bantParts.map(p => {
                    const active = form.bantSecimiId === String(p.id);
                    return (
                      <button key={p.id} type="button"
                        onClick={() => setForm(prev => ({ ...prev, bantSecimiId: active ? "" : String(p.id), _bantFromKit: false }))}
                        style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid",
                          borderColor: active ? "#15803d" : "#e2e8f0",
                          background: active ? "#f0fdf4" : "#f8fafc",
                          color: active ? "#15803d" : "#64748b" }}>
                        {p.ad}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}
          </>
        );
      })()}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Garanti Başlangıç">
          <Input type="date" value={form.installDate || ""} onChange={e => {
            const d = e.target.value;
            const end = d ? `${parseInt(d.slice(0,4))+2}${d.slice(4)}` : "";
            setForm(p => ({ ...p, installDate: d, warrantyEnd: end }));
          }} />
        </Field>
        <Field label="Garanti Bitiş (otomatik)">
          <Input type="date" value={form.warrantyEnd || ""} onChange={e => setForm(p => ({ ...p, warrantyEnd: e.target.value }))} />
        </Field>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "28px 0 14px", paddingBottom: 8, borderBottom: "2px solid #f1f5f9" }}>
        <Icon name="finance" size={15} />
        <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: .5 }}>Satış / Finans</span>
      </div>

      <Field label="Satış Yapan">
        <div style={{ maxWidth: "50%" }}>
        {modal === "add" ? (
          <Select value={form.satisYapan || factory?.name || "Altuntaş Makina"} onChange={e => setForm(p => ({ ...p, satisYapan: e.target.value }))}>
            <option value={factory?.name || "Altuntaş Makina"}>{factory?.name || "Altuntaş Makina"} (Fabrika)</option>
            {(dealers || []).filter(d => d.bayiMi !== false).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </Select>
        ) : (
          <PickOrType
            value={form.satisYapan}
            onChange={v => setForm(p => ({ ...p, satisYapan: v }))}
            placeholder="Satıcı adı (müşteri, bayi, fabrika...)"
            options={[
              { value: factory?.name || "Altuntaş Makina", label: `${factory?.name || "Altuntaş Makina"} (Fabrika)` },
              ...(dealers || []).filter(d => d.bayiMi !== false).map(d => ({ value: d.name, label: d.name })),
              ...(form.prevOwners?.length > 0
                ? [{ value: form.prevOwners[form.prevOwners.length - 1].name, label: `${form.prevOwners[form.prevOwners.length - 1].name} (Önceki Sahip)` }]
                : []),
            ]}
          />
        )}
        </div>
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Para Birimi">
          <Select value={form.currency || "TRY"} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
            <option value="TRY">₺ Türk Lirası</option>
            <option value="USD">$ Dolar (USD)</option>
            <option value="EUR">€ Euro (EUR)</option>
          </Select>
        </Field>
        <Field label="Satış Tipi">
          <Select value={normalizeSaleType(form.faturali)} onChange={e => setForm(p => ({ ...p, faturali: e.target.value }))}>
            {SALE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isFaturali(form.faturali) ? "1fr 1fr 1fr" : "1fr 1fr", gap: 12 }}>
        <Field label="Fabrika Satış Bedeli">
          <div style={{ maxWidth: 220 }}><MoneyInput value={form.fabrikaSatisBedeli} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => setForm(p => ({ ...p, fabrikaSatisBedeli: v }))} /></div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Makinenin fabrikadan satıldığı tutar (Ciro ve Kalan Borç hesaplamasının temelini oluşturur).</div>
        </Field>

        {isFaturali(form.faturali) && (
          <Field label="Fatura Bedeli (resmi faturada yazan)">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ maxWidth: 220 }}><MoneyInput value={form.faturaBedeli} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => setForm(p => ({ ...p, faturaBedeli: v }))} /></div>
              {normalizeSaleType(form.faturali) === "Faturalı Yurtdışı" && (
                <span style={{ fontSize: 11, fontWeight: 800, color: "#1d4ed8", background: "#dbeafe", padding: "5px 10px", borderRadius: 8, whiteSpace: "nowrap" }}>YURTDIŞI, KDV YOK</span>
              )}
            </div>
            {isYurtIci(form.faturali) && (
              <div style={{ fontSize: 12, color: "#065f46", background: "#d1fae5", padding: "7px 12px", borderRadius: 8, marginTop: 8, fontWeight: 600 }}>
                KDV (%{getKdvRateForDate(form.installDate, kdvRates)}): <b>{fmtCur(calcKDV(form.faturali, form.faturaBedeli, form.installDate, kdvRates), form.currency)}</b>
                {"  ·  "}KDV dahil toplam: <b>{fmtCur(parseMoney(form.faturaBedeli) + calcKDV(form.faturali, form.faturaBedeli, form.installDate, kdvRates), form.currency)}</b>
              </div>
            )}
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
              Gerçek bedelden farklı olabilir (düşük fatura). KDV bu tutar üzerinden hesaplanır.
            </div>
          </Field>
        )}

        <Field label="Komisyon">
          <div style={{ maxWidth: 220 }}><MoneyInput value={form.komisyon} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => setForm(p => ({ ...p, komisyon: v }))} /></div>
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {modal === "add" ? (
        <Field label="İlk Ödeme (Kapora/Ödeme)">
          <PaymentRowsEditor rows={form._ilkOdemeSatirlari} onChange={rows => setForm(p => ({ ...p, _ilkOdemeSatirlari: rows }))} sym={CUR_SYM[form.currency || "TRY"]} />
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Satış anında alınan kapora varsa girin. Sonraki ödemeler detay görünümünden ("Ödeme Ekle") eklenir.</div>
        </Field>
      ) : (
        <Field label="Kapora/Ödeme">
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", padding: "9px 0" }}>{fmtCur(sumPayments(form.id, payments), form.currency)}</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Ödemeler detay görünümünden ("Ödeme Ekle") yönetilir.</div>
        </Field>
      )}

      <Field label="Kalan Borç">
        <div style={{ fontSize: 16, fontWeight: 800, color: "#dc2626", padding: "9px 0" }}>
          {fmtCur(Math.max(0, calcKalanBorc({ ...form, id: form.id ?? -1 }, payments, kdvRates) - (modal === "add" ? (form._ilkOdemeSatirlari || []).filter(isPaymentReceived).reduce((s, r) => s + parseMoney(r.tutar), 0) : 0)), form.currency)}
        </div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Otomatik hesaplanır, elle değiştirilemez. (Çek satırları tahsil edilene kadar düşülmez.)</div>
      </Field>
      </div>

      <Field label="Açıklama">
        <textarea value={form.aciklama || ""} onChange={e => setForm(p => ({ ...p, aciklama: e.target.value }))}
          placeholder="Bu satış / makina ile ilgili açıklama, notlar..."
          style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, background: "#f8fafc", resize: "vertical", minHeight: 60, boxSizing: "border-box", fontFamily: "inherit" }} />
      </Field>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
        <Btn variant="ghost" onClick={onClose}>İptal</Btn>
        <Btn onClick={save}><Icon name="check" size={14} /> Kaydet</Btn>
      </div>
    </Modal>
  );
};
