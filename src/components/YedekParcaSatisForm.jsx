import { CUR_SYM, SALE_TYPES, DEFAULT_KDV_RATES } from "../lib/constants";
import { today, fmtCur, parseMoney, calcKDV, getKdvRateForDate, parcaAdi, partFiyatForCurrency, totalMiktar } from "../lib/utils";
import { Icon, Field, Input, Select, MoneyInput, Btn, Modal, SearchPick } from "./ui";

// Bayiye yedek parça (kargo) satışı ekleme/düzenleme formu. Bir kayıt = bir parça kalemi (partId +
// miktar). Alıcı her zaman bir bayi. Makina tahsisi burada YAPILMAZ — satış listesinden (YedekParcaSatisTab)
// "Makinaya tahsis et" ile parça parça yapılır; burada yalnız satış + kargo bilgisi girilir.
const KARGO_DURUMLARI = ["Hazırlanıyor", "Kargoya Verildi", "Teslim Edildi"];

export const YedekParcaSatisForm = ({ title, form, setForm, dealers = [], customers = [], parts = [], partStock = [], calisanlar = [], onSave, onCancel, kdvRates = DEFAULT_KDV_RATES, draftBar = null }) => {
  // Alıcı listesine bayilerin yanı sıra anlaşmalı servis firmaları da dahil (onlar da yedek parça alır).
  const bayiler = (dealers || []).filter(d => d.bayiMi !== false || d.anlasmaliServisMi);
  const kargociAdlari = (calisanlar || []).map(c => c.ad).filter(Boolean); // "Kargoyu verecek kişi" önerileri
  const panoDusIleri = !!form.panoDusmeZamani && new Date(form.panoDusmeZamani).getTime() > Date.now();
  const isEdit = !!form.id;
  const aliciTipi = form.aliciTipi || "bayi";
  // Seçili firma TÜM bayiler arasından bulunur (ön-seçili anlaşmalı-servis firması da çözülsün).
  const selectedDealer = (dealers || []).find(d => d.id === Number(form.dealerId));
  const selectedCust = customers.find(c => c.id === Number(form.musteriId));
  const selectedPart = parts.find(p => String(p.id) === String(form.partId));
  const cur = form.currency || "TRY";
  const miktar = parseInt(form.miktar) || 0;
  const birim = parseMoney(form.birimFiyat);
  const toplam = miktar * birim;
  const stok = selectedPart ? totalMiktar(partStock, String(selectedPart.id)) : null;

  return (
    <Modal title={title} onClose={onCancel} wide>
      {draftBar}
      <Field label="Alıcı">
        {/* Alıcı bayi VEYA müşteri olabilir — yedek parçayı bayiye de son müşteriye de satabiliyoruz. */}
        <div style={{ display: "flex", gap: 4, marginBottom: 8, background: "var(--n100, #f8fafc)", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, padding: 3, width: "fit-content" }}>
          {[["bayi", "Bayi"], ["musteri", "Müşteri"]].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setForm(p => ({ ...p, aliciTipi: v, dealerId: "", musteriId: "" }))}
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
            bayiler.length === 0
              ? <div style={{ fontSize: 12, color: "var(--red600, #dc2626)" }}>Tanımlı bayi yok. Bayiler sekmesinden ekleyin.</div>
              : <SearchPick items={bayiler} getLabel={d => d.name} getKey={d => d.id} placeholder="Bayi ara..."
                  onPick={d => setForm(p => ({ ...p, dealerId: d.id }))} />
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

      <Field label="Yedek Parça">
        {selectedPart ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, background: "var(--n100, #f8fafc)" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--n900, #0f172a)" }}>{parcaAdi(selectedPart)}{selectedPart.kod ? ` · ${selectedPart.kod}` : ""}</div>
              <div style={{ fontSize: 11.5, color: stok != null && stok < miktar ? "var(--red600, #dc2626)" : "var(--n500, #64748b)", marginTop: 2 }}>
                Stok: {stok ?? "—"}{stok != null && miktar > 0 && stok < miktar ? " · yetersiz!" : ""}
              </div>
            </div>
            {!isEdit && (
              <button onClick={() => setForm(p => ({ ...p, partId: "" }))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--n400, #94a3b8)" }}>
                <Icon name="close" size={14} />
              </button>
            )}
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

      <Field label="Fatura Tipi">
        <Select value={form.faturaTipi || "Faturalı Yurtiçi"} onChange={e => setForm(p => ({ ...p, faturaTipi: e.target.value }))}>
          {SALE_TYPES.map(t => <option key={t}>{t}</option>)}
        </Select>
      </Field>

      {/* Kargo bilgisi (opsiyonel) */}
      <Field label="Kargo Bilgisi (opsiyonel)">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
          <Input value={form.kargoFirma || ""} placeholder="Kargo firması" onChange={e => setForm(p => ({ ...p, kargoFirma: e.target.value }))} />
          <Input value={form.kargoTakipNo || ""} placeholder="Takip no" onChange={e => setForm(p => ({ ...p, kargoTakipNo: e.target.value }))} />
          <Input type="date" value={form.kargoTarih || ""} onChange={e => setForm(p => ({ ...p, kargoTarih: e.target.value }))} />
          <Select value={form.kargoDurum || ""} onChange={e => setForm(p => ({ ...p, kargoDurum: e.target.value }))}>
            <option value="">Durum…</option>
            {KARGO_DURUMLARI.map(d => <option key={d}>{d}</option>)}
          </Select>
        </div>
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Kargoyu Verecek Kişi">
          {/* Firma çalışanları önerilir (servisteki teknisyen gibi); listede olmayan isim de yazılabilir. */}
          <Input list="yedek-parca-kargoci-listesi" value={form.kargoSorumlusu || ""} placeholder="Seçin veya yazın..."
            onChange={e => setForm(p => ({ ...p, kargoSorumlusu: e.target.value }))} />
          <datalist id="yedek-parca-kargoci-listesi">
            {kargociAdlari.map(a => <option key={a} value={a} />)}
          </datalist>
        </Field>
        <Field label="Panoya Düşme Zamanı">
          {/* Servisteki gibi: ileri bir zaman seçilirse satış o zamana kadar panoda görünmez. */}
          <Input type="datetime-local" value={(form.panoDusmeZamani || "").slice(0, 16)}
            onChange={e => setForm(p => ({ ...p, panoDusmeZamani: e.target.value }))} />
          <span style={{ fontSize: 11, color: panoDusIleri ? "var(--amb700, #b45309)" : "var(--n400, #94a3b8)" }}>
            {panoDusIleri ? "O zamana kadar panoda görünmez." : "Boş bırakılırsa hemen panoda görünür."}
          </span>
        </Field>
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
                  Toplam: {miktar} × {fmtCur(birim, cur)} = {fmtCur(toplam, cur)}
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
