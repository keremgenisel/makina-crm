import { useState } from "react";
import { BACKUP_SCHEMA_VERSION, BACKUP_APP_TAG } from "../../lib/constants";
import { today, looksLikeBackup, safeStandardModels, parseMoney } from "../../lib/utils";
import { Icon, Btn, Modal } from "../ui";
import { Section } from "./Section";

export const SettingsBackup = ({
  customers, services, dealers, stock, customModels, standardModels, factory, kalipDefs, notes, parts, partSales, payments,
  setCustomers, setServices, setDealers, setStock, setCustomModels, setStandardModels, setFactory, setKalipDefs, setNotes, setParts, setPartSales, setPayments,
  version, appSettings, setAppSettings, flash,
}) => {
  const [restoreData, setRestoreData] = useState(null); // onay bekleyen yedek

  // ── Yedek Al ──
  const doBackup = async () => {
    const data = { app: BACKUP_APP_TAG, schemaVersion: BACKUP_SCHEMA_VERSION, version, exportDate: today(), customers, services, dealers, stock, customModels, standardModels, factory, kalipDefs, notes, parts, partSales, payments };
    try {
      if (window.crmStorage?.backup) {
        const ok = await window.crmStorage.backup(data);
        if (ok) flash("ok", "Yedek başarıyla kaydedildi.");
      } else {
        // Tarayıcı modu: dosya olarak indir
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `altunmak-crm-yedek-${today()}.json`;
        a.click();
        flash("ok", "Yedek dosyası indirildi.");
      }
    } catch (err) {
      flash("err", "Yedek alınamadı: " + err.message);
    }
  };

  // ── Yedek Yükle ──
  const doRestore = async () => {
    try {
      if (window.crmStorage?.restore) {
        const data = await window.crmStorage.restore();
        if (!data) return;
        if (!looksLikeBackup(data)) { flash("err", "Seçilen dosya geçerli bir Altunmak CRM yedeği değil."); return; }
        setRestoreData(data);
      } else {
        // Tarayıcı modu: dosya seçici
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json,application/json";
        input.onchange = (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            let parsed;
            try { parsed = JSON.parse(reader.result); }
            catch { flash("err", "Dosya okunamadı — geçerli bir yedek değil."); return; }
            if (!looksLikeBackup(parsed)) { flash("err", "Seçilen dosya geçerli bir Altunmak CRM yedeği değil."); return; }
            setRestoreData(parsed);
          };
          reader.readAsText(file);
        };
        input.click();
      }
    } catch (err) {
      flash("err", "Yedek yüklenemedi: " + err.message);
    }
  };

  const applyRestore = () => {
    // KDV oranı tarihe bağlı dönemler hâline gelmeden önce kaydedilmiş eski yedeklerde Kalan Borç
    // kuruş artıkları veya (eski sabit orana göre girilmiş ödemelerden kalma) negatif "fazla ödeme"
    // bakiyeleri taşıyabilir — geri yüklerken bunlar da App.jsx'in normal yükleme akışındaki gibi temizlenir.
    if (Array.isArray(restoreData?.customers)) {
      setCustomers(restoreData.customers.map(c => ({ ...c, kalanBorc: Math.max(0, Math.round(parseMoney(c.kalanBorc))) })));
    }
    if (Array.isArray(restoreData?.services)) setServices(restoreData.services);
    if (Array.isArray(restoreData?.dealers)) setDealers(restoreData.dealers);
    if (Array.isArray(restoreData?.stock) && setStock) setStock(restoreData.stock);
    if (Array.isArray(restoreData?.kalipDefs) && setKalipDefs) setKalipDefs(restoreData.kalipDefs);
    if (Array.isArray(restoreData?.customModels)) setCustomModels(restoreData.customModels);
    setStandardModels(safeStandardModels(restoreData?.standardModels));
    if (restoreData?.factory) setFactory(restoreData.factory);
    if (Array.isArray(restoreData?.notes) && setNotes) setNotes(restoreData.notes);
    if (Array.isArray(restoreData?.parts) && setParts) setParts(restoreData.parts);
    if (Array.isArray(restoreData?.partSales) && setPartSales) setPartSales(restoreData.partSales);
    if (Array.isArray(restoreData?.payments) && setPayments) setPayments(restoreData.payments);
    setRestoreData(null);
    flash("ok", "Yedek başarıyla yüklendi. Veriler geri getirildi.");
  };

  return (
    <>
      <Section title="Yedekleme" icon="download">
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
          Tüm müşteri ve servis kayıtlarınızı tek bir dosya olarak kaydedin. Yedek dosyasını güvenli bir yerde
          (USB bellek, bulut depolama) saklamanızı öneririz. Geri yükleme yaptığınızda mevcut veriler yedekteki verilerle değiştirilir.
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn onClick={doBackup}><Icon name="download" size={15} /> Yedek Al</Btn>
          <Btn variant="ghost" onClick={doRestore}><Icon name="upload" size={15} /> Yedekten Geri Yükle</Btn>
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 14 }}>
          Mevcut veri: {customers.length} müşteri · {dealers.length} bayi · {services.length} servis kaydı
        </div>

        {/* ── Otomatik Yedekleme ── */}
        <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 20, paddingTop: 20 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 14 }}>
            <input type="checkbox" checked={appSettings.autoBackup}
              onChange={e => setAppSettings(p => ({ ...p, autoBackup: e.target.checked }))}
              style={{ width: 18, height: 18, accentColor: "#e85d1a", cursor: "pointer" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Otomatik Yedekleme</span>
          </label>

          {appSettings.autoBackup && (
            <div style={{ paddingLeft: 28 }}>
              {!window.crmStorage?.chooseFolder ? (
                <div style={{ fontSize: 13, color: "#64748b", background: "#f8fafc", padding: "10px 14px", borderRadius: 10, border: "1px dashed #e2e8f0" }}>
                  Otomatik yedekleme yalnızca kurulu uygulamada çalışır.
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                    <Btn small variant="ghost" onClick={async () => {
                      const folder = await window.crmStorage.chooseFolder();
                      if (folder) setAppSettings(p => ({ ...p, backupFolder: folder }));
                    }}>📁 Klasör Seç</Btn>
                    <span style={{ fontSize: 12, color: appSettings.backupFolder ? "#0f172a" : "#94a3b8", fontFamily: "monospace", wordBreak: "break-all" }}>
                      {appSettings.backupFolder || "Henüz klasör seçilmedi"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>Sıklık:</span>
                    <select value={appSettings.frequency}
                      onChange={e => setAppSettings(p => ({ ...p, frequency: e.target.value }))}
                      style={{ padding: "6px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#f8fafc" }}>
                      <option value="daily">Her gün</option>
                      <option value="weekly">Her hafta</option>
                      <option value="monthly">Her ay</option>
                    </select>
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    {appSettings.lastBackup
                      ? `Son otomatik yedek: ${appSettings.lastBackup}`
                      : "Henüz otomatik yedek alınmadı — klasör seçildiğinde ilk yedek hemen alınır."}
                    {" "}Yedekler uygulama açılışında, vakti geldiyse otomatik yazılır.
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* Geri yükleme onayı */}
      {restoreData && (
        <Modal title="Yedeği Geri Yükle" onClose={() => setRestoreData(null)}>
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, marginBottom: 8 }}>
            Yüklenecek yedek: <b>{Array.isArray(restoreData.customers) ? restoreData.customers.length : 0} müşteri</b>,{" "}
            <b>{Array.isArray(restoreData.dealers) ? restoreData.dealers.length : 0} bayi</b>, <b>{Array.isArray(restoreData.services) ? restoreData.services.length : 0} servis kaydı</b>
            {restoreData.exportDate ? ` (${restoreData.exportDate} tarihli)` : ""}.
          </div>
          {restoreData.schemaVersion > BACKUP_SCHEMA_VERSION && (
            <div style={{ fontSize: 13, color: "#b45309", fontWeight: 600, marginBottom: 8 }}>
              ⚠ Bu yedek, bu programın daha yeni bir sürümüyle alınmış. Bazı veriler düzgün yüklenmeyebilir.
            </div>
          )}
          <div style={{ fontSize: 13, color: "#dc2626", fontWeight: 600, marginBottom: 20 }}>
            ⚠ Mevcut tüm veriler bu yedekteki verilerle değiştirilecek. Bu işlem geri alınamaz.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setRestoreData(null)}>Vazgeç</Btn>
            <Btn variant="danger" onClick={applyRestore}><Icon name="check" size={14} /> Evet, Geri Yükle</Btn>
          </div>
        </Modal>
      )}
    </>
  );
};
