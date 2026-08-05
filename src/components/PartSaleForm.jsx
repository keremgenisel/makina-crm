import { useState } from "react";
import { CUR_SYM, SALE_TYPES, DEFAULT_KDV_RATES, ODEME_YONTEMLERI } from "../lib/constants";
import { today, aramaNormalize, fmtCur, parseMoney, calcKDV, getKdvRateForDate } from "../lib/utils";
import { Icon, Field, Input, Select, MoneyInput, Btn, Modal, SearchPick, CountryCityFields } from "./ui";

const KARGO_DURUMLARI = ["Hazırlanıyor", "Kargoya Verildi", "Teslim Edildi"];

// Extra Kalıp satışı/çıkışı ekleme-düzenleme formu — Parts.jsx ve Customers.jsx (müşteri
// detayından "Extra Kalıp Satışı") tarafından paylaşılır, Services/ServiceForm ile aynı desen.
// Ekleme modunda birden çok kalıp tek seferde seçilip her birine ayrı fiyat girilebilir
// (form.kaliplar: [{ad, olcu, fiyat}]) — kaydedilince her satır kendi partSales kaydını oluşturur
// (Customers.jsx → savePartSale). Düzenleme modunda dizi her zaman 1 elemanlı kalır.
export const PartSaleForm = ({ title, form, setForm, customers, kalipDefs = [], dealers = [], calisanlar = [], factory = null, onSave, onCancel, kdvRates = DEFAULT_KDV_RATES, draftBar = null, geoData = null, loadingGeo = false }) => {
  const [custSearch, setCustSearch] = useState("");
  const kargociAdlari = (calisanlar || []).map(c => c.ad).filter(Boolean); // "Kargoyu verecek kişi" önerileri
  // Teslim şekli (fabrikaTeslim) ile panoya gönderme (kargoDurum) AYRI: teslim şekli her zaman
  // kayda/etikete/makina geçmişine yazılır ama panoya DÜŞÜRMEZ; panoya gönderme ayrı bir opt-in
  // kutudur (eski/geçmiş tarihli satışlar canlı panoyu kirletmesin). Yedek parça formuyla aynı.
  const panoda = !!form.kargoDurum;
  const fabrikaTeslim = !!form.fabrikaTeslim;
  const panoDusIleri = !!form.panoDusmeZamani && new Date(form.panoDusmeZamani).getTime() > Date.now();
  const factoryName = factory?.name || "Altuntaş Makina";
  const bayiler = (dealers || []).filter(d => d.bayiMi !== false);

  const isEdit = !!form.id;
  // "Alıcının adresini doldur" — teslimat alanlarına müşterinin kayıtlı adresini kopyalar (Extra Kalıp
  // alıcısı her zaman müşteridir). Sonra kullanıcı üstünde değişebilir.
  const adresDoldur = () => {
    const c = selectedCust || {};
    setForm(p => ({ ...p, teslimatAd: c.name || "", teslimatTel: c.phone || c.yetkili1Tel || "", teslimatAdres: c.adres || "", teslimatUlke: c.country || "", teslimatSehir: c.city || "", teslimatIlce: c.ilce || "" }));
  };
  // Ekleme modunda kalıplar yedek parça formundaki gibi satır satır girilir (her satır: kalıp seçici +
  // ölçü + fiyat + üretim formu). En az bir boş satır gösterilir. Düzenleme modunda tek kalıp düzenlenir.
  const bosKalip = { ad: "", olcu: "", fiyat: "", uretimFormGonder: false };
  const kaliplar = form.kaliplar && form.kaliplar.length ? form.kaliplar : [bosKalip];
  const kaliplarToplam = kaliplar.reduce((s, k) => s + parseMoney(k.fiyat), 0);
  const kalipSatirlar = () => form.kaliplar && form.kaliplar.length ? form.kaliplar : [bosKalip];
  const kalipSet = (i, alan, deger) => setForm(p => ({ ...p, kaliplar: kalipSatirlar().map((k, idx) => idx === i ? { ...k, [alan]: deger } : k) }));
  const kalipSil = (i) => setForm(p => ({ ...p, kaliplar: (p.kaliplar || []).filter((_, idx) => idx !== i) }));
  const kalipEkle = () => setForm(p => ({ ...p, kaliplar: [...kalipSatirlar(), { ...bosKalip }] }));
  const selectedCust = customers.find(c => c.id === Number(form.customerId));
  // Kalıp satırına model seç: adı yaz, ölçüyü müşterinin kayıtlı kalıp ölçüsünden ön-doldur.
  const kalipSec = (i, def) => setForm(p => ({ ...p, kaliplar: kalipSatirlar().map((k, idx) => idx === i ? { ...k, ad: def.ad, olcu: k.olcu || (selectedCust?.kaliplar?.find(kk => kk.ad === def.ad)?.olcu || "") } : k) }));
  const matchedCustomers = custSearch.trim()
    ? customers.filter(c =>
        aramaNormalize(c.name).includes(aramaNormalize(custSearch)) ||
        aramaNormalize(c.model).includes(aramaNormalize(custSearch)) ||
        aramaNormalize(c.serialNo).includes(aramaNormalize(custSearch))
      ).slice(0, 6)
    : [];

  return (
    <Modal title={title} onClose={onCancel} wide>
      {draftBar}
      <Field label="Müşteri / Makina">
        {selectedCust ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "2px solid #e85d1a", borderRadius: 8, background: "var(--ambBg3, #fff7ed)" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--n900, #0f172a)" }}>{selectedCust.name}</div>
              <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2 }}>
                {selectedCust.model || "Model yok"} {selectedCust.serialNo ? `· S/N: ${selectedCust.serialNo}` : ""}
              </div>
            </div>
            <button onClick={() => { setForm(p => ({ ...p, customerId: "" })); setCustSearch(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--n400, #94a3b8)" }}>
              <Icon name="close" size={14} />
            </button>
          </div>
        ) : (
          <div>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--n400, #94a3b8)" }}><Icon name="search" size={14} /></span>
              <input autoFocus value={custSearch} onChange={e => setCustSearch(e.target.value)}
                placeholder="Firma adı, model veya seri no ile ara..."
                style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 14, background: "var(--n100, #f8fafc)", boxSizing: "border-box", outline: "none" }} />
            </div>
            {custSearch.trim() && (
              <div style={{ marginTop: 6, border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, overflow: "hidden" }}>
                {matchedCustomers.map(c => (
                  <div key={c.id}
                    onClick={() => { setForm(p => ({ ...p, customerId: c.id })); setCustSearch(""); }}
                    style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--n150, #f1f5f9)", background: "var(--surface, #ffffff)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--ambBg3, #fff7ed)"}
                    onMouseLeave={e => e.currentTarget.style.background = "var(--surface, #ffffff)"}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--n400, #94a3b8)" }}>
                      {c.model ? c.model : "Model yok"} {c.serialNo ? `· ${c.serialNo}` : ""}
                    </div>
                  </div>
                ))}
                {matchedCustomers.length === 0 && (
                  <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--n400, #94a3b8)" }}>Müşteri bulunamadı.</div>
                )}
              </div>
            )}
          </div>
        )}
      </Field>

      {/* Veriliş tarihi ile para birimi yan yana. */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Veriliş Tarihi"><Input type="date" value={form.tarih || today()} onChange={e => setForm(p => ({ ...p, tarih: e.target.value }))} /></Field>
        <Field label="Para Birimi">
          <Select value={form.currency || "TRY"} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
            <option value="TRY">₺ Türk Lirası</option>
            <option value="USD">$ Dolar (USD)</option>
            <option value="EUR">€ Euro (EUR)</option>
          </Select>
          {(form.currency || "TRY") !== "TRY" && (
            <span style={{ display: "inline-block", marginTop: 5, fontSize: 11, fontWeight: 700, color: "var(--blu700, #1d4ed8)", background: "var(--bluBg2, #dbeafe)", padding: "4px 10px", borderRadius: 8 }}>Yurt dışı</span>
          )}
        </Field>
      </div>

      {/* Satış yapan firma ile fatura tipi yan yana. */}
      {selectedCust && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Satış Yapan Firma">
            <Select value={form.satisFirma || factoryName} onChange={e => {
              const v = e.target.value;
              setForm(p => v === "Diğer" ? { ...p, satisFirma: v }
                : { ...p, satisFirma: v, satisFirmaAd: "", satisFirmaYetkili: "", satisFirmaTel: "", satisFirmaUlke: "", satisFirmaSehir: "" });
            }}>
              <option value={factoryName}>{factoryName}</option>
              {bayiler.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              <option value="Diğer">Diğer (anlaşmasız firma)…</option>
            </Select>
          </Field>
          <Field label="Fatura Tipi">
            <Select value={form.faturaTipi || "Faturalı Yurtiçi"} onChange={e => setForm(p => ({ ...p, faturaTipi: e.target.value }))}>
              {SALE_TYPES.map(t => <option key={t}>{t}</option>)}
            </Select>
          </Field>
        </div>
      )}

      {/* Kalıbı bizden alan, anlaşmalı olmadığımız bir firma aracılığıyla satıldıysa: firma
          bilgileri YALNIZ bu kalıp satışına kaydedilir (müşteri/bayi kaydı oluşturulmaz). */}
      {selectedCust && form.satisFirma === "Diğer" && (
        <div style={{ display: "grid", gap: 12, padding: 12, marginBottom: 14, borderRadius: 10, background: "var(--ambBg, #fffbeb)", border: "1px solid var(--ambBr, #fde68a)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--amb800, #92400e)" }}>Anlaşmasız Firma (yalnız bu kalıp satışına kaydedilir)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Firma Adı"><Input value={form.satisFirmaAd || ""} onChange={e => setForm(p => ({ ...p, satisFirmaAd: e.target.value }))} placeholder="Firma adı" /></Field>
            <Field label="Yetkili Kişi"><Input value={form.satisFirmaYetkili || ""} onChange={e => setForm(p => ({ ...p, satisFirmaYetkili: e.target.value }))} placeholder="Yetkili" /></Field>
            <Field label="Telefon"><Input value={form.satisFirmaTel || ""} onChange={e => setForm(p => ({ ...p, satisFirmaTel: e.target.value }))} placeholder="Telefon" /></Field>
          </div>
          <CountryCityFields country={form.satisFirmaUlke || ""} city={form.satisFirmaSehir || ""}
            onCountry={v => setForm(p => ({ ...p, satisFirmaUlke: v, satisFirmaSehir: "" }))}
            onCity={v => setForm(p => ({ ...p, satisFirmaSehir: v }))}
            geoData={geoData} loadingGeo={loadingGeo} />
        </div>
      )}

      {/* Kalıplar — yedek parça formundaki "Yedek Parçalar" tasarımıyla aynı: her satır bir kart
          (kalıp seçici/çip · ölçü · fiyat · sil) + altında üretim-formu kutusu; altta "+ Kalıp Ekle". */}
      {!isEdit ? (
        <Field label="Kalıplar">
          {kalipDefs.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--red600, #dc2626)" }}>Tanımlı kalıp yok. Ayarlar → Katalog → Kalıp Modelleri'nden ekleyin.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {kaliplar.map((k, i) => (
                <div key={i} style={{ display: "grid", gap: 8, padding: 8, border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, background: "var(--n100, #f8fafc)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1.3fr 1.2fr auto", gap: 8, alignItems: "start" }}>
                    <div>
                      {k.ad ? (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, padding: "8px 10px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 6, background: "var(--surface, #fff)" }}>
                          <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--orTx, #c2410c)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.ad}</div>
                          <button type="button" onClick={() => kalipSet(i, "ad", "")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--n400, #94a3b8)", flexShrink: 0 }}><Icon name="close" size={13} /></button>
                        </div>
                      ) : (
                        // Aynı kalıp birden fazla satırda olabilir (farklı ölçü/adet) — her satır kendi kaydını oluşturur.
                        <SearchPick items={kalipDefs} getLabel={d => d.ad} getKey={d => d.id} placeholder="Kalıp ara..." onPick={d => kalipSec(i, d)} />
                      )}
                    </div>
                    <Input value={k.olcu || ""} placeholder="Ölçü, örn: 55x125 mm" onChange={e => kalipSet(i, "olcu", e.target.value)} />
                    <MoneyInput value={k.fiyat} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => kalipSet(i, "fiyat", v)} />
                    <button type="button" onClick={() => kalipSil(i)} disabled={kaliplar.length <= 1} title="Satırı sil"
                      style={{ background: "none", border: "none", cursor: kaliplar.length <= 1 ? "default" : "pointer", color: kaliplar.length <= 1 ? "var(--n300, #cbd5e1)" : "var(--red600, #dc2626)", padding: "8px 4px" }}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--n600, #475569)", cursor: "pointer" }}>
                    <input type="checkbox" checked={!!k.uretimFormGonder} onChange={e => kalipSet(i, "uretimFormGonder", e.target.checked)}
                      style={{ width: 15, height: 15, accentColor: "#e85d1a", cursor: "pointer" }} />
                    Üretim formuna gönder
                  </label>
                </div>
              ))}
              <button type="button" onClick={kalipEkle}
                style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: "#e85d1a", background: "var(--ambBg3, #fff7ed)", border: "1px dashed var(--ambBr3, #fed7aa)", borderRadius: 8, padding: "7px 12px", cursor: "pointer" }}>
                <Icon name="plus" size={13} /> Kalıp Ekle
              </button>
            </div>
          )}
        </Field>
      ) : (<>
        <Field label="Kalıp Modeli">
          <Select value={kaliplar[0]?.ad || ""} onChange={e => {
            const ad = e.target.value;
            const custOlcu = selectedCust?.kaliplar?.find(k => k.ad === ad)?.olcu || "";
            setForm(p => ({ ...p, kaliplar: [{ ...(p.kaliplar?.[0] || {}), ad, olcu: custOlcu || p.kaliplar?.[0]?.olcu || "" }] }));
          }}>
            <option value="">Seçin...</option>
            {kalipDefs.map(k => <option key={k.id} value={k.ad}>{k.ad}</option>)}
          </Select>
        </Field>
        {kaliplar.length > 0 && (
          <Field label="Kalıp Ölçüsü ve Fiyatı">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "center" }}>
              <Input value={kaliplar[0]?.olcu || ""} placeholder="Ölçü, örn: 55x125 mm" onChange={e => kalipSet(0, "olcu", e.target.value)} />
              <MoneyInput value={kaliplar[0]?.fiyat} sym={CUR_SYM[form.currency || "TRY"]} onChange={v => kalipSet(0, "fiyat", v)} />
              <label style={{ display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", fontSize: 12, color: "var(--n600, #475569)", cursor: "pointer" }}>
                <input type="checkbox" checked={!!kaliplar[0]?.uretimFormGonder} onChange={e => kalipSet(0, "uretimFormGonder", e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: "#e85d1a", cursor: "pointer" }} />
                Üretim formuna gönder
              </label>
            </div>
          </Field>
        )}
      </>)}

      {/* Ödeme durumu + yöntemi (makina satışıyla aynı). Ödendi işaretliyken yöntem seçilir; Çek ise
          vade + tahsil takibi (çek tahsil edilene kadar borçlu sayılır). */}
      {selectedCust && kaliplarToplam > 0 && (
        <div style={{ marginTop: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: form.odendi ? "var(--grnBg, #f0fdf4)" : "var(--ambBg, #fffbeb)", border: `1px solid ${form.odendi ? "var(--grnBr, #bbf7d0)" : "var(--ambBr, #fde68a)"}`, borderRadius: 8, padding: "10px 12px" }}>
            <input type="checkbox" checked={!!form.odendi} onChange={e => setForm(p => ({ ...p, odendi: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--grn600, #16a34a)" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: form.odendi ? "var(--grn700, #15803d)" : "var(--amb800, #92400e)" }}>
              {form.odendi ? "Ücret tahsil edildi (ödendi)" : "Ücret henüz tahsil edilmedi (ödenmedi)"}
            </span>
          </label>
          {form.odendi && (
            <div style={{ marginTop: 8, display: "grid", gap: 10, padding: 12, borderRadius: 10, background: "var(--n050, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)" }}>
              <div style={{ display: "grid", gridTemplateColumns: form.yontem === "Çek" ? "1fr 1fr" : "1fr", gap: 10 }}>
                <Field label="Ödeme Yöntemi">
                  <Select value={form.yontem || "Nakit"} onChange={e => setForm(p => ({ ...p, yontem: e.target.value }))}>
                    {ODEME_YONTEMLERI.map(y => <option key={y}>{y}</option>)}
                  </Select>
                </Field>
                {form.yontem === "Çek" && (
                  <Field label="Çek Vade Tarihi">
                    <Input type="date" value={form.vadeTarihi || ""} onChange={e => setForm(p => ({ ...p, vadeTarihi: e.target.value }))} />
                  </Field>
                )}
              </div>
              {form.yontem === "Çek" && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: form.tahsilEdildi ? "var(--grnBg, #f0fdf4)" : "var(--ambBg, #fffbeb)", border: `1px solid ${form.tahsilEdildi ? "var(--grnBr, #bbf7d0)" : "var(--ambBr, #fde68a)"}`, borderRadius: 8, padding: "9px 11px" }}>
                  <input type="checkbox" checked={!!form.tahsilEdildi} onChange={e => setForm(p => ({ ...p, tahsilEdildi: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--grn600, #16a34a)" }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: form.tahsilEdildi ? "var(--grn700, #15803d)" : "var(--amb800, #92400e)" }}>
                    {form.tahsilEdildi ? "Çek tahsil edildi (bankada karşılandı)" : "Çek henüz tahsil edilmedi (tahsil edilene kadar borçlu sayılır)"}
                  </span>
                </label>
              )}
            </div>
          )}
        </div>
      )}

      {/* Kalıp fiyatları toplamı — Faturalı Yurtiçi'de KDV dahil toplam da gösterilir */}
      {kaliplarToplam > 0 && (
        <div style={{ background: "var(--bluBg, #eff6ff)", border: "1px solid var(--bluBr, #bfdbfe)", borderRadius: 8, padding: "10px 12px", marginTop: 12 }}>
          {(() => {
            const kdv = calcKDV(form.faturaTipi, kaliplarToplam, form.tarih, kdvRates);
            return (
              <>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--blu700, #1d4ed8)" }}>
                  Toplam: {fmtCur(kaliplarToplam, form.currency || "TRY")}
                </span>
                {kdv > 0 && (
                  <div style={{ fontSize: 12, color: "var(--grn800, #065f46)", marginTop: 6, fontWeight: 600 }}>
                    KDV (%{getKdvRateForDate(form.tarih, kdvRates)}): {fmtCur(kdv, form.currency || "TRY")} · KDV dahil toplam: {fmtCur(kaliplarToplam + kdv, form.currency || "TRY")}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ── Teslim Şekli — HER ZAMAN kayda/etikete/makina geçmişine yazılır, panoya DÜŞÜRMEZ ──
          Segment seçici yalnız fabrikaTeslim bayrağını değiştirir (kargoDurum'a dokunmaz). Yedek parça
          formuyla aynı; Extra Kalıp'ta farklı adres yok. Blok yalnız müşteri seçiliyken görünür. */}
      {selectedCust && (
        <div style={{ marginTop: 12 }}>
          <Field label="Teslim Şekli">
            <div style={{ display: "inline-flex", gap: 4, background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 9, padding: 3 }}>
              {[[true, "🏭 Fabrika Teslim"], [false, "📦 Kargo"]].map(([ft, l]) => {
                const secili = fabrikaTeslim === ft;
                return (
                  <button key={l} type="button"
                    onClick={() => setForm(p => ({ ...p, fabrikaTeslim: ft, ...(ft ? { kargoFirma: "", kargoTakipNo: "" } : {}) }))}
                    style={{ padding: "7px 16px", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                      background: secili ? "#e85d1a" : "transparent", color: secili ? "#fff" : "var(--n500, #64748b)" }}>{l}</button>
                );
              })}
            </div>
          </Field>

          {/* Teslim detayları (teslim şekline göre) — panodan bağımsız, boş bırakılabilir. */}
          <div style={{ marginTop: 8, display: "grid", gap: 10, padding: 12, borderRadius: 10, background: "var(--n050, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)" }}>
            <div style={{ display: "grid", gridTemplateColumns: fabrikaTeslim ? "1fr" : "1.4fr 1.4fr 1fr", gap: 8 }}>
              {!fabrikaTeslim && <Input value={form.kargoFirma || ""} placeholder="Kargo firması" onChange={e => setForm(p => ({ ...p, kargoFirma: e.target.value }))} />}
              {!fabrikaTeslim && <Input value={form.kargoTakipNo || ""} placeholder="Takip no" onChange={e => setForm(p => ({ ...p, kargoTakipNo: e.target.value }))} />}
              <Field label={fabrikaTeslim ? "Teslim Tarihi" : "Kargo Tarihi"}>
                <Input type="date" value={form.kargoTarih || ""} onChange={e => setForm(p => ({ ...p, kargoTarih: e.target.value }))} />
              </Field>
            </div>
            <Field label={fabrikaTeslim ? "Teslim Eden Kişi" : "Kargoyu Veren Kişi"}>
              <Input list="kalip-kargoci-listesi" value={form.kargoSorumlusu || ""} placeholder="Seçin veya yazın..."
                onChange={e => setForm(p => ({ ...p, kargoSorumlusu: e.target.value }))} />
              <datalist id="kalip-kargoci-listesi">{kargociAdlari.map(a => <option key={a} value={a} />)}</datalist>
            </Field>
            {/* Farklı teslimat (sevk) adresi — yalnız Kargo'da (Fabrika Teslim'de anlamsız). Müşterinin
                kayıtlı adresi yerine bu satışa özel adres; boşsa müşterinin adresine gider. */}
            {!fabrikaTeslim && (
              <div style={{ borderTop: "2px dashed var(--ambBr3, #fed7aa)", paddingTop: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!form.teslimatFarkli}
                    onChange={e => setForm(p => ({ ...p, teslimatFarkli: e.target.checked }))}
                    style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#e85d1a" }} />
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, color: "#e85d1a" }}>📍 Farklı adrese kargolat</span>
                  {form.teslimatFarkli && (
                    <button type="button" onClick={adresDoldur}
                      style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 700, color: "#e85d1a", background: "var(--surface, #fff)", border: "1px dashed var(--ambBr3, #fed7aa)", borderRadius: 8, padding: "5px 11px", cursor: "pointer" }}>
                      ⤵ Müşterinin adresini doldur
                    </button>
                  )}
                </label>
                {form.teslimatFarkli && (
                  <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <Field label="Teslim Alacak (kişi / firma)"><Input value={form.teslimatAd || ""} onChange={e => setForm(p => ({ ...p, teslimatAd: e.target.value }))} placeholder="Teslim alacak kişi/firma" /></Field>
                      <Field label="Telefon"><Input value={form.teslimatTel || ""} onChange={e => setForm(p => ({ ...p, teslimatTel: e.target.value }))} placeholder="Telefon" /></Field>
                    </div>
                    <Field label="Açık Adres"><Input value={form.teslimatAdres || ""} onChange={e => setForm(p => ({ ...p, teslimatAdres: e.target.value }))} placeholder="Cadde, mahalle, no" /></Field>
                    <CountryCityFields country={form.teslimatUlke || ""} city={form.teslimatSehir || ""} ilce={form.teslimatIlce || ""}
                      onCountry={v => setForm(p => ({ ...p, teslimatUlke: v, teslimatSehir: "", teslimatIlce: "" }))}
                      onCity={v => setForm(p => ({ ...p, teslimatSehir: v, teslimatIlce: "" }))}
                      onIlce={v => setForm(p => ({ ...p, teslimatIlce: v }))}
                      geoData={geoData} loadingGeo={loadingGeo} />
                    <span style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>Boş bırakılırsa kargo, müşterinin kayıtlı adresine gider.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Panoya gönderme — AYRI opt-in. Kapalıyken kayıt panoya düşmez (eski satışlar için bırak). ── */}
          <div style={{ marginTop: 12, border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, overflow: "hidden" }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", background: panoda ? "var(--bluBg, #eff6ff)" : "var(--n100, #f8fafc)", padding: "10px 12px" }}>
              <input type="checkbox" checked={panoda}
                onChange={e => setForm(p => ({ ...p, kargoDurum: e.target.checked ? (p.kargoDurum || "Hazırlanıyor") : "" }))}
                style={{ width: 16, height: 16, cursor: "pointer", marginTop: 2, accentColor: "var(--blu600, #2563eb)" }} />
              <span style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: panoda ? "var(--blu700, #1d4ed8)" : "var(--n600, #475569)" }}>
                  📦 Servis ve Kargo Panosuna gönder (takip)
                </span>
                <span style={{ fontSize: 11.5, color: "var(--n500, #64748b)", marginTop: 2 }}>
                  {panoda ? "Panoda takip edilecek." : "Kapalı: yalnızca kayıt olur, panoya düşmez."}
                </span>
              </span>
            </label>
            {panoda && (
              <div style={{ padding: 12, display: "grid", gap: 10, borderTop: "1px solid var(--n200, #e2e8f0)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Field label="Pano Durumu">
                    <Select value={form.kargoDurum || "Hazırlanıyor"} onChange={e => setForm(p => ({ ...p, kargoDurum: e.target.value }))}>
                      {KARGO_DURUMLARI.map(d => <option key={d}>{d}</option>)}
                    </Select>
                  </Field>
                  <Field label="Panoya Düşme Zamanı">
                    <Input type="datetime-local" value={(form.panoDusmeZamani || "").slice(0, 16)}
                      onChange={e => setForm(p => ({ ...p, panoDusmeZamani: e.target.value }))} />
                    <span style={{ fontSize: 11, color: panoDusIleri ? "var(--amb700, #b45309)" : "var(--n400, #94a3b8)" }}>
                      {panoDusIleri ? "O zamana kadar panoda görünmez." : "Boş bırakılırsa hemen panoda görünür."}
                    </span>
                  </Field>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <Btn variant="ghost" onClick={onCancel}>Vazgeç</Btn>
        <Btn onClick={onSave}><Icon name="check" size={14} /> Kaydet</Btn>
      </div>
    </Modal>
  );
};
