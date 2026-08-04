import { CUR_SYM, SALE_TYPES, DEFAULT_KDV_RATES } from "../lib/constants";
import { today, fmtCur, parseMoney, calcKDV, getKdvRateForDate, parcaAdi, partFiyatForCurrency, totalMiktar } from "../lib/utils";
import { Icon, Field, Input, Select, MoneyInput, Btn, Modal, SearchPick, CountryCityFields } from "./ui";

// Bayiye yedek parça (kargo) satışı ekleme/düzenleme formu. Bir kayıt = bir parça kalemi (partId +
// miktar). Alıcı her zaman bir bayi. Makina tahsisi burada YAPILMAZ — satış listesinden (YedekParcaSatisTab)
// "Makinaya tahsis et" ile parça parça yapılır; burada yalnız satış + kargo bilgisi girilir.
const KARGO_DURUMLARI = ["Hazırlanıyor", "Kargoya Verildi", "Teslim Edildi"];

export const YedekParcaSatisForm = ({ title, form, setForm, dealers = [], customers = [], parts = [], partStock = [], calisanlar = [], onSave, onCancel, kdvRates = DEFAULT_KDV_RATES, draftBar = null, geoData = null, loadingGeo = false }) => {
  // Alıcı listesine bayilerin yanı sıra anlaşmalı servis firmaları da dahil (onlar da yedek parça alır).
  const bayiler = (dealers || []).filter(d => d.bayiMi !== false || d.anlasmaliServisMi);
  const kargociAdlari = (calisanlar || []).map(c => c.ad).filter(Boolean); // "Kargoyu verecek kişi" önerileri
  const panoDusIleri = !!form.panoDusmeZamani && new Date(form.panoDusmeZamani).getTime() > Date.now();
  // Teslim şekli (fabrikaTeslim) ile panoya gönderme (kargoDurum) AYRI iki karar: teslim şekli her zaman
  // kayda/etikete/makina geçmişine yazılır ama panoya DÜŞÜRMEZ; panoya gönderme ayrı bir opt-in kutudur
  // (eski/geçmiş tarihli satışlar canlı panoyu kirletmesin diye kapalı bırakılabilir).
  const panoda = !!form.kargoDurum;
  const fabrikaTeslim = !!form.fabrikaTeslim;
  const isEdit = !!form.id;
  const aliciTipi = form.aliciTipi || "bayi";
  const disFirma = !!form.disFirma; // "Diğer" = anlaşmasız dış firma alıcı (bayi tipinde, kayıtlı bayi değil)
  // Seçili firma TÜM bayiler arasından bulunur (ön-seçili anlaşmalı-servis firması da çözülsün).
  const selectedDealer = (dealers || []).find(d => d.id === Number(form.dealerId));
  const selectedCust = customers.find(c => c.id === Number(form.musteriId));
  const selectedPart = parts.find(p => String(p.id) === String(form.partId));
  const cur = form.currency || "TRY";
  const miktar = parseInt(form.miktar) || 0;
  const birim = parseMoney(form.birimFiyat);
  const stok = selectedPart ? totalMiktar(partStock, String(selectedPart.id)) : null;
  // "Alıcının adresini doldur" — teslimat alanlarına alıcının kayıtlı adresini kopyalar (kaynak alıcı
  // türüne göre: bayi kaydı / müşteri kaydı / dış firma bilgisi). Sonra kullanıcı üstünde değişebilir.
  const adresDoldur = () => {
    let k = { ad: "", tel: "", adres: "", ulke: "", sehir: "", ilce: "" };
    if (aliciTipi === "musteri" && selectedCust) k = { ad: selectedCust.name || "", tel: selectedCust.phone || "", adres: selectedCust.adres || "", ulke: selectedCust.country || "", sehir: selectedCust.city || "", ilce: selectedCust.ilce || "" };
    else if (disFirma) k = { ad: form.disFirmaAd || "", tel: form.disFirmaTel || "", adres: form.disFirmaAdres || "", ulke: form.disFirmaUlke || "", sehir: form.disFirmaSehir || "", ilce: "" };
    else if (selectedDealer) k = { ad: selectedDealer.name || "", tel: selectedDealer.phone || "", adres: selectedDealer.adres || "", ulke: selectedDealer.country || "", sehir: selectedDealer.city || "", ilce: selectedDealer.ilce || "" };
    setForm(p => ({ ...p, teslimatAd: k.ad, teslimatTel: k.tel, teslimatAdres: k.adres, teslimatUlke: k.ulke, teslimatSehir: k.sehir, teslimatIlce: k.ilce }));
  };
  // Ekleme modunda birden çok parça satılabilir → form.satirlar [{partId, miktar, birimFiyat}].
  // Düzenlemede tek kayıt düzenlenir (form.partId/miktar/birimFiyat, satırlar kullanılmaz).
  const satirlar = form.satirlar && form.satirlar.length ? form.satirlar : [{ partId: "", miktar: "", birimFiyat: "" }];
  const setSatir = (i, alan, deger) => setForm(p => ({ ...p, satirlar: (p.satirlar || [{ partId: "", miktar: "", birimFiyat: "" }]).map((s, idx) => idx === i ? { ...s, [alan]: deger } : s) }));
  const satirEkle = () => setForm(p => ({ ...p, satirlar: [...(p.satirlar || [{ partId: "", miktar: "", birimFiyat: "" }]), { partId: "", miktar: "", birimFiyat: "" }] }));
  const satirSil = (i) => setForm(p => ({ ...p, satirlar: (p.satirlar || []).filter((_, idx) => idx !== i) }));
  const parcaSec = (i, prc) => setForm(p => ({ ...p, satirlar: (p.satirlar || [{ partId: "", miktar: "", birimFiyat: "" }]).map((s, idx) => idx === i ? { ...s, partId: String(prc.id), birimFiyat: s.birimFiyat || partFiyatForCurrency(prc, p.currency || "TRY") || "" } : s) }));
  const toplam = isEdit
    ? miktar * birim
    : satirlar.reduce((s, r) => s + (parseInt(r.miktar) || 0) * parseMoney(r.birimFiyat), 0);

  return (
    <Modal title={title} onClose={onCancel} wide>
      {draftBar}
      <Field label="Alıcı">
        {/* Alıcı bayi VEYA müşteri olabilir — yedek parçayı bayiye de son müşteriye de satabiliyoruz. */}
        <div style={{ display: "flex", gap: 4, marginBottom: 8, background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, padding: 3, width: "fit-content" }}>
          {[["bayi", "Bayi"], ["musteri", "Müşteri"]].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setForm(p => ({ ...p, aliciTipi: v, dealerId: "", musteriId: "", disFirma: false }))}
              style={{ padding: "5px 16px", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                background: aliciTipi === v ? "#e85d1a" : "transparent", color: aliciTipi === v ? "#fff" : "var(--n500, #64748b)" }}>{l}</button>
          ))}
        </div>
        {aliciTipi === "musteri" ? (
          selectedCust ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "2px solid #e85d1a", borderRadius: 8, background: "var(--ambBg3, #fff7ed)" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--n900, #0f172a)" }}>{selectedCust.name}</div>
                <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2 }}>{selectedCust.model || "Model yok"}{selectedCust.serialNo ? ` · S/N ${selectedCust.serialNo}` : ""}</div>
              </div>
              {!isEdit && <button onClick={() => setForm(p => ({ ...p, musteriId: "" }))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--n400, #94a3b8)" }}><Icon name="close" size={14} /></button>}
            </div>
          ) : (
            customers.length === 0
              ? <div style={{ fontSize: 12, color: "var(--red600, #dc2626)" }}>Tanımlı müşteri yok.</div>
              : <SearchPick items={customers} getLabel={c => `${c.name}${c.serialNo ? " · " + c.serialNo : ""}`} getKey={c => c.id} placeholder="Firma / model / seri no ara..."
                  onPick={c => setForm(p => ({ ...p, musteriId: c.id }))} />
          )
        ) : disFirma ? (
          // Anlaşmasız dış firma alıcı — bilgiler yalnız bu satışa kaydedilir (bayi kaydı oluşturulmaz).
          <div style={{ display: "grid", gap: 10, padding: 12, borderRadius: 10, background: "var(--ambBg, #fffbeb)", border: "1px solid var(--ambBr, #fde68a)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--amb800, #92400e)" }}>Anlaşmasız Dış Firma (yalnız bu satışa kaydedilir)</span>
              {!isEdit && <button type="button" onClick={() => setForm(p => ({ ...p, disFirma: false, disFirmaAd: "", disFirmaYetkili: "", disFirmaTel: "", disFirmaAdres: "", disFirmaUlke: "", disFirmaSehir: "" }))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--n400, #94a3b8)" }} title="Bayi seçimine dön"><Icon name="close" size={14} /></button>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Field label="Firma Adı"><Input value={form.disFirmaAd || ""} onChange={e => setForm(p => ({ ...p, disFirmaAd: e.target.value }))} placeholder="Firma adı" /></Field>
              <Field label="Yetkili Kişi"><Input value={form.disFirmaYetkili || ""} onChange={e => setForm(p => ({ ...p, disFirmaYetkili: e.target.value }))} placeholder="Yetkili" /></Field>
              <Field label="Telefon"><Input value={form.disFirmaTel || ""} onChange={e => setForm(p => ({ ...p, disFirmaTel: e.target.value }))} placeholder="Telefon" /></Field>
            </div>
            <Field label="Adres"><Input value={form.disFirmaAdres || ""} onChange={e => setForm(p => ({ ...p, disFirmaAdres: e.target.value }))} placeholder="Açık adres (cadde, mahalle, no)" /></Field>
            <CountryCityFields country={form.disFirmaUlke || ""} city={form.disFirmaSehir || ""}
              onCountry={v => setForm(p => ({ ...p, disFirmaUlke: v, disFirmaSehir: "" }))}
              onCity={v => setForm(p => ({ ...p, disFirmaSehir: v }))}
              geoData={geoData} loadingGeo={loadingGeo} />
          </div>
        ) : (
          selectedDealer ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "2px solid #e85d1a", borderRadius: 8, background: "var(--ambBg3, #fff7ed)" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--n900, #0f172a)" }}>{selectedDealer.name}</div>
                <div style={{ fontSize: 12, color: "var(--n500, #64748b)", marginTop: 2 }}>{[selectedDealer.city, selectedDealer.country].filter(Boolean).join(" / ") || "Konum yok"}</div>
              </div>
              {!isEdit && <button onClick={() => setForm(p => ({ ...p, dealerId: "" }))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--n400, #94a3b8)" }}><Icon name="close" size={14} /></button>}
            </div>
          ) : (
            // "Diğer (anlaşmasız firma)" bayi arama kutusunda ilk seçenek — servis talebi formundaki gibi.
            <SearchPick items={[{ id: "__diger__", name: "➕ Diğer (anlaşmasız firma)" }, ...bayiler]}
              getLabel={d => d.name} getKey={d => d.id} placeholder="Bayi ara veya 'Diğer' seç..."
              onPick={d => d.id === "__diger__"
                ? setForm(p => ({ ...p, disFirma: true, dealerId: "" }))
                : setForm(p => ({ ...p, dealerId: d.id }))} />
          )
        )}
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Tarih"><Input type="date" value={form.tarih || today()} onChange={e => setForm(p => ({ ...p, tarih: e.target.value }))} /></Field>
        <Field label="Para Birimi">
          <Select value={cur} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
            <option value="TRY">₺ Türk Lirası</option>
            <option value="USD">$ Dolar (USD)</option>
            <option value="EUR">€ Euro (EUR)</option>
          </Select>
        </Field>
      </div>

      {isEdit ? (<>
        <Field label="Yedek Parça">
          {selectedPart ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, background: "var(--n100, #f8fafc)" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--n900, #0f172a)" }}>{parcaAdi(selectedPart)}{selectedPart.kod ? ` · ${selectedPart.kod}` : ""}</div>
                <div style={{ fontSize: 11.5, color: stok != null && stok < miktar ? "var(--red600, #dc2626)" : "var(--n500, #64748b)", marginTop: 2 }}>
                  Stok: {stok ?? "—"}{stok != null && miktar > 0 && stok < miktar ? " · yetersiz!" : ""}
                </div>
              </div>
            </div>
          ) : (
            parts.length === 0
              ? <div style={{ fontSize: 12, color: "var(--red600, #dc2626)" }}>Tanımlı yedek parça yok. Ayarlar → Katalog → Yedek Parçalar'dan ekleyin.</div>
              : <SearchPick items={parts} getLabel={p => `${parcaAdi(p)}${p.kod ? " · " + p.kod : ""}`} getKey={p => p.id} placeholder="Parça ara..."
                  onPick={p => setForm(prev => ({ ...prev, partId: String(p.id), birimFiyat: prev.birimFiyat || partFiyatForCurrency(p, prev.currency || "TRY") || "" }))} />
          )}
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Miktar (adet)">
            <Input type="number" min="1" value={form.miktar ?? ""} onChange={e => setForm(p => ({ ...p, miktar: e.target.value }))} placeholder="örn: 5" />
          </Field>
          <Field label="Birim Fiyat">
            <MoneyInput value={form.birimFiyat} sym={CUR_SYM[cur]} onChange={v => setForm(p => ({ ...p, birimFiyat: v }))} />
          </Field>
        </div>
      </>) : (
        <Field label="Yedek Parçalar">
          {parts.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--red600, #dc2626)" }}>Tanımlı yedek parça yok. Ayarlar → Katalog → Yedek Parçalar'dan ekleyin.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {satirlar.map((s, i) => {
                const part = parts.find(p => String(p.id) === String(s.partId));
                const rMiktar = parseInt(s.miktar) || 0;
                const rStok = part ? totalMiktar(partStock, String(part.id)) : null;
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr 1.2fr auto", gap: 8, alignItems: "start", padding: 8, border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, background: "var(--n100, #f8fafc)" }}>
                    <div>
                      {part ? (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, padding: "8px 10px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 6, background: "var(--surface, #fff)" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--n900, #0f172a)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{parcaAdi(part)}{part.kod ? ` · ${part.kod}` : ""}</div>
                            <div style={{ fontSize: 11, color: rStok != null && rStok < rMiktar ? "var(--red600, #dc2626)" : "var(--n500, #64748b)", marginTop: 1 }}>Stok: {rStok ?? "—"}{rStok != null && rMiktar > 0 && rStok < rMiktar ? " · yetersiz!" : ""}</div>
                          </div>
                          <button type="button" onClick={() => setSatir(i, "partId", "")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--n400, #94a3b8)", flexShrink: 0 }}><Icon name="close" size={13} /></button>
                        </div>
                      ) : (
                        <SearchPick items={parts} getLabel={p => `${parcaAdi(p)}${p.kod ? " · " + p.kod : ""}`} getKey={p => p.id} placeholder="Parça ara..." onPick={p => parcaSec(i, p)} />
                      )}
                    </div>
                    <Input type="number" min="1" value={s.miktar ?? ""} onChange={e => setSatir(i, "miktar", e.target.value)} placeholder="Adet" />
                    <MoneyInput value={s.birimFiyat} sym={CUR_SYM[cur]} onChange={v => setSatir(i, "birimFiyat", v)} />
                    <button type="button" onClick={() => satirSil(i)} disabled={satirlar.length <= 1} title="Satırı sil"
                      style={{ background: "none", border: "none", cursor: satirlar.length <= 1 ? "default" : "pointer", color: satirlar.length <= 1 ? "var(--n300, #cbd5e1)" : "var(--red600, #dc2626)", padding: "8px 4px" }}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                );
              })}
              <button type="button" onClick={satirEkle}
                style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: "#e85d1a", background: "var(--ambBg3, #fff7ed)", border: "1px dashed var(--ambBr3, #fed7aa)", borderRadius: 8, padding: "7px 12px", cursor: "pointer" }}>
                <Icon name="plus" size={13} /> Parça Ekle
              </button>
            </div>
          )}
        </Field>
      )}

      <Field label="Fatura Tipi">
        <Select value={form.faturaTipi || "Faturalı Yurtiçi"} onChange={e => setForm(p => ({ ...p, faturaTipi: e.target.value }))}>
          {SALE_TYPES.map(t => <option key={t}>{t}</option>)}
        </Select>
      </Field>

      {/* ── Teslim Şekli — HER ZAMAN kayda/etikete/makina geçmişine yazılır, panoya DÜŞÜRMEZ ──
          Segment seçici yalnız fabrikaTeslim bayrağını değiştirir (kargoDurum'a dokunmaz). */}
      <div style={{ marginTop: 12 }}>
        <Field label="Teslim Şekli">
          <div style={{ display: "inline-flex", gap: 4, background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 9, padding: 3 }}>
            {[[true, "🏭 Fabrika Teslim"], [false, "📦 Kargo"]].map(([ft, l]) => {
              const secili = fabrikaTeslim === ft;
              return (
                <button key={l} type="button"
                  onClick={() => setForm(p => ({ ...p, fabrikaTeslim: ft, ...(ft ? { kargoFirma: "", kargoTakipNo: "", teslimatFarkli: false } : {}) }))}
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
            <Input list="yedek-parca-kargoci-listesi" value={form.kargoSorumlusu || ""} placeholder="Seçin veya yazın..."
              onChange={e => setForm(p => ({ ...p, kargoSorumlusu: e.target.value }))} />
            <datalist id="yedek-parca-kargoci-listesi">{kargociAdlari.map(a => <option key={a} value={a} />)}</datalist>
          </Field>
          {/* Farklı teslimat (sevk) adresi — yalnız Kargo'da (Fabrika Teslim'de anlamsız). Alıcının kayıtlı
              adresi yerine bu satışa özel adres; boşsa alıcının adresine gider. Üç alıcı türünde de aynı. */}
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
                    ⤵ Alıcının adresini doldur
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
                  <span style={{ fontSize: 11, color: "var(--n500, #64748b)" }}>Boş bırakılırsa kargo, alıcının kayıtlı adresine gider.</span>
                </div>
              )}
            </div>
          )}
        </div>
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

      {/* Ödeme durumu */}
      {toplam > 0 && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: form.odendi ? "var(--grnBg, #f0fdf4)" : "var(--ambBg, #fffbeb)", border: `1px solid ${form.odendi ? "var(--grnBr, #bbf7d0)" : "var(--ambBr, #fde68a)"}`, borderRadius: 8, padding: "10px 12px", marginTop: 4 }}>
          <input type="checkbox" checked={!!form.odendi} onChange={e => setForm(p => ({ ...p, odendi: e.target.checked }))} style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--grn600, #16a34a)" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: form.odendi ? "var(--grn700, #15803d)" : "var(--amb800, #92400e)" }}>
            {form.odendi ? "Ücret tahsil edildi (ödendi)" : "Ücret henüz tahsil edilmedi (ödenmedi)"}
          </span>
        </label>
      )}

      {toplam > 0 && (
        <div style={{ background: "var(--bluBg, #eff6ff)", border: "1px solid var(--bluBr, #bfdbfe)", borderRadius: 8, padding: "10px 12px", marginTop: 12 }}>
          {(() => {
            const kdv = calcKDV(form.faturaTipi, toplam, form.tarih, kdvRates);
            return (
              <>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--blu700, #1d4ed8)" }}>
                  {isEdit ? `Toplam: ${miktar} × ${fmtCur(birim, cur)} = ${fmtCur(toplam, cur)}` : `Genel Toplam (${satirlar.filter(s => s.partId && (parseInt(s.miktar) || 0) > 0).length} kalem): ${fmtCur(toplam, cur)}`}
                </span>
                {kdv > 0 && (
                  <div style={{ fontSize: 12, color: "var(--grn800, #065f46)", marginTop: 6, fontWeight: 600 }}>
                    KDV (%{getKdvRateForDate(form.tarih, kdvRates)}): {fmtCur(kdv, cur)} · KDV dahil toplam: {fmtCur(toplam + kdv, cur)}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <Field label="Not">
          <textarea value={form.notlar || ""} onChange={e => setForm(p => ({ ...p, notlar: e.target.value }))}
            placeholder="Bu satışla ilgili not (kargo detayında görünür)..."
            className="input" style={{ resize: "vertical", minHeight: 64, marginTop: 4 }} />
        </Field>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <Btn variant="ghost" onClick={onCancel}>Vazgeç</Btn>
        <Btn onClick={onSave}><Icon name="check" size={14} /> Kaydet</Btn>
      </div>
    </Modal>
  );
};
