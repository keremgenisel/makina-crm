import { useState } from "react";
import { BACKUP_SCHEMA_VERSION, BACKUP_APP_TAG } from "../../lib/constants";
import { today, looksLikeBackup, safeStandardModels, parseMoney, bumpId } from "../../lib/utils";
import { Icon, Btn, Modal } from "../ui";
import { Section } from "./Section";

export const SettingsBackup = ({
  customers, services, dealers, stock, customModels, standardModels, factory, kalipDefs, notes, parts, partSales, payments,
  teklifler = [], faturalar = [], partStock = [], partStockLog = [], uretimFormlari = [],
  gorusmeler = [], setGorusmeler = null,
  setCustomers, setServices, setDealers, setStock, setCustomModels, setStandardModels, setFactory, setKalipDefs, setNotes, setParts, setPartSales, setPayments,
  setTeklifler = null, setFaturalar = null, setPartStock = null, setPartStockLog = null, setUretimFormlari = null,
  version, appSettings, setAppSettings, flash,
}) => {
  const [restoreData, setRestoreData] = useState(null); // onay bekleyen yedek

  // ── Yedek Al ──
  const doBackup = async () => {
    try {
      // appSettings dışındaki makineye özgü alanlar (yedek klasörü, zamanlama) restore'da atlanır.
      // SMTP şifresi safeStorage ile şifreli olduğundan yedeklenmez, sadece host/port/email alınır.
      // Uygulama kilidi (appLock) yedeğe BİLEREK dahil edilmez: makinaya özgü bir ayardır ve
      // şifre özetlerinin yedek dosyasında gezmesi offline kırma riski oluşturur.
      const [mailConfig, mailLog] = await Promise.all([
        window.appMail?.getConfigForBackup?.() ?? null,
        window.appMail?.getAllLog?.() ?? [],
      ]);
      const data = { app: BACKUP_APP_TAG, schemaVersion: BACKUP_SCHEMA_VERSION, version, exportDate: today(), customers, services, dealers, stock, customModels, standardModels, factory, kalipDefs, notes, parts, partSales, payments, teklifler, faturalar, partStock, partStockLog, uretimFormlari, gorusmeler, appSettings, mailConfig, mailLog };
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

  // ── Seçmeli geri yükleme paketleri ──────────────────────────────────────────
  // Bölümler tek tek değil, ilişki bütünlüğü bozulmayacak paketler halinde seçilir:
  // müşteri çocukları (servis/ödeme/kalıp satışı/görüşme) DB'de gerçek FK ile müşteriye
  // bağlı olduğundan müşterilerden ayrı geri yüklenemez.
  const RESTORE_PAKETLERI = [
    { id: "musteri", ad: "Müşteri verileri", aciklama: "müşteriler, servisler, kalıp satışları, ödemeler, görüşmeler" },
    { id: "evrak", ad: "Evraklar", aciklama: "teklifler, proformalar, faturalar" },
    { id: "stok", ad: "Stok ve üretim", aciklama: "makina stoğu, parça stoğu ve geçmişi, üretim formları" },
    { id: "bayi", ad: "Bayiler", aciklama: "" },
    { id: "tanim", ad: "Tanımlar", aciklama: "modeller, kalıp ve parça tanımları" },
    { id: "not", ad: "Notlar", aciklama: "" },
    { id: "ayar", ad: "Firma ve ayarlar", aciklama: "firma bilgileri, uygulama ayarları, e-posta yapılandırması" },
  ];
  const [restorePaketler, setRestorePaketler] = useState(() => new Set(RESTORE_PAKETLERI.map(pk => pk.id)));
  const paketToggle = (id) => setRestorePaketler(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const applyRestore = async () => {
    const sec = (id) => restorePaketler.has(id);
    // KDV oranı tarihe bağlı dönemler hâline gelmeden önce kaydedilmiş eski yedeklerde Kalan Borç
    // kuruş artıkları veya (eski sabit orana göre girilmiş ödemelerden kalma) negatif "fazla ödeme"
    // bakiyeleri taşıyabilir — geri yüklerken bunlar da App.jsx'in normal yükleme akışındaki gibi temizlenir.
    if (sec("musteri") && Array.isArray(restoreData?.customers)) {
      setCustomers(restoreData.customers.map(c => ({ ...c, kalanBorc: Math.max(0, Math.round(parseMoney(c.kalanBorc))) })));
    }
    if (sec("musteri") && Array.isArray(restoreData?.services)) setServices(restoreData.services);
    if (sec("musteri") && Array.isArray(restoreData?.partSales) && setPartSales) setPartSales(restoreData.partSales);
    if (sec("musteri") && Array.isArray(restoreData?.payments) && setPayments) setPayments(restoreData.payments);
    if (sec("musteri") && Array.isArray(restoreData?.gorusmeler) && setGorusmeler) setGorusmeler(restoreData.gorusmeler);
    if (sec("evrak") && Array.isArray(restoreData?.teklifler) && setTeklifler) setTeklifler(restoreData.teklifler);
    if (sec("evrak") && Array.isArray(restoreData?.faturalar) && setFaturalar) setFaturalar(restoreData.faturalar);
    if (sec("stok") && Array.isArray(restoreData?.stock) && setStock) setStock(restoreData.stock);
    if (sec("stok") && Array.isArray(restoreData?.partStock) && setPartStock) setPartStock(restoreData.partStock);
    if (sec("stok") && Array.isArray(restoreData?.partStockLog) && setPartStockLog) setPartStockLog(restoreData.partStockLog);
    if (sec("stok") && Array.isArray(restoreData?.uretimFormlari) && setUretimFormlari) setUretimFormlari(restoreData.uretimFormlari);
    if (sec("bayi") && Array.isArray(restoreData?.dealers)) setDealers(restoreData.dealers);
    if (sec("tanim") && Array.isArray(restoreData?.kalipDefs) && setKalipDefs) setKalipDefs(restoreData.kalipDefs);
    if (sec("tanim") && Array.isArray(restoreData?.customModels)) setCustomModels(restoreData.customModels);
    if (sec("tanim")) setStandardModels(safeStandardModels(restoreData?.standardModels));
    if (sec("tanim") && Array.isArray(restoreData?.parts)) setParts?.(restoreData.parts);
    if (sec("not") && Array.isArray(restoreData?.notes) && setNotes) setNotes(restoreData.notes);
    if (sec("ayar") && restoreData?.factory) setFactory(restoreData.factory);

    // appSettings: makineye özgü alanları (yedek klasörü, zamanlama) koru, geri kalanını yedekten al.
    if (sec("ayar") && restoreData?.appSettings) {
      const { autoBackup, backupFolder, frequency, lastBackup, ...portableSettings } = restoreData.appSettings;
      setAppSettings(p => ({ ...p, ...portableSettings }));
    }
    // SMTP config (şifresiz): e-posta sunucu ayarları geri yüklenir, şifre tekrar girilmeli.
    let smtpRestored = false;
    if (sec("ayar") && restoreData?.mailConfig && window.appMail?.restoreConfigFromBackup) {
      await window.appMail.restoreConfigFromBackup(restoreData.mailConfig).catch(() => {});
      smtpRestored = true;
    }
    // E-posta logu
    if (sec("ayar") && Array.isArray(restoreData?.mailLog) && window.appMail?.restoreFullLog) {
      await window.appMail.restoreFullLog(restoreData.mailLog).catch(() => {});
    }
    // Uygulama kilidi bilerek geri YÜKLENMEZ (yedeğe de yazılmıyor): makinaya özgü ayar.
    // Eski yedeklerde appLockData olsa bile yok sayılır — bu makinanın kilidi değişmez.

    // ID sayacını geri yüklenen dizilerin ötesine taşı: seçmeli geri yüklemede eski
    // yedekten gelen büyük ID'ler ile yeni eklenen kayıtların çakışmasını önler.
    bumpId(
      ...["customers", "services", "partSales", "payments", "gorusmeler", "teklifler", "faturalar", "stock", "partStock", "partStockLog", "uretimFormlari", "dealers", "notes", "parts", "kalipDefs", "customModels"]
        .map(k => Array.isArray(restoreData?.[k]) ? restoreData[k] : [])
    );

    setRestoreData(null);
    const smtpNote = smtpRestored ? " E-posta şifresi yedeklenmez, Ayarlar'dan tekrar girilmeli." : "";
    const secilenAdlar = RESTORE_PAKETLERI.filter(pk => restorePaketler.has(pk.id)).map(pk => pk.ad);
    flash("ok", secilenAdlar.length === RESTORE_PAKETLERI.length
      ? "Yedek başarıyla yüklendi." + smtpNote
      : `Seçilen bölümler yedekten yüklendi: ${secilenAdlar.join(", ")}.` + smtpNote);
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
            <b>{Array.isArray(restoreData.dealers) ? restoreData.dealers.length : 0} bayi</b>,{" "}
            <b>{Array.isArray(restoreData.services) ? restoreData.services.length : 0} servis kaydı</b>
            {restoreData.exportDate ? ` (${restoreData.exportDate} tarihli)` : ""}.
          </div>
          {restoreData.schemaVersion > BACKUP_SCHEMA_VERSION && (
            <div style={{ fontSize: 13, color: "#b45309", fontWeight: 600, marginBottom: 8 }}>
              ⚠ Bu yedek, bu programın daha yeni bir sürümüyle alınmış. Bazı veriler düzgün yüklenmeyebilir.
            </div>
          )}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: .5 }}>Geri yüklenecek bölümler</span>
              <button onClick={() => setRestorePaketler(new Set(restorePaketler.size === RESTORE_PAKETLERI.length ? [] : RESTORE_PAKETLERI.map(pk => pk.id)))}
                style={{ background: "none", border: "none", color: "#e85d1a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {restorePaketler.size === RESTORE_PAKETLERI.length ? "Tümünü Kaldır" : "Tümünü Seç"}
              </button>
            </div>
            {RESTORE_PAKETLERI.map(pk => (
              <label key={pk.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={restorePaketler.has(pk.id)} onChange={() => paketToggle(pk.id)}
                  style={{ width: 16, height: 16, accentColor: "#e85d1a", cursor: "pointer" }} />
                <span style={{ fontWeight: 600, color: "#0f172a" }}>{pk.ad}</span>
                {pk.aciklama && <span style={{ fontSize: 11.5, color: "#94a3b8" }}>({pk.aciklama})</span>}
              </label>
            ))}
          </div>
          {restorePaketler.has("musteri") && !restorePaketler.has("evrak") && (
            <div style={{ fontSize: 12.5, color: "#b45309", marginBottom: 8 }}>
              ℹ Müşteriler yüklenip evraklar yüklenmezse, müşteri kayıtlarındaki kaynak teklif bağlantıları eski yedeğe göre kopuk kalabilir.
            </div>
          )}
          {restorePaketler.has("musteri") && !restorePaketler.has("stok") && (
            <div style={{ fontSize: 12.5, color: "#b45309", marginBottom: 8 }}>
              ℹ Müşteriler yüklenip stok yüklenmezse, makinaların stok bağlantıları ve üretim formu bağlantıları eski yedeğe göre farklı kalabilir.
            </div>
          )}
          <div style={{ fontSize: 13, color: "#dc2626", fontWeight: 600, marginBottom: 20 }}>
            ⚠ Seçilen bölümlerdeki mevcut veriler yedekteki verilerle değiştirilecek. Bu işlem geri alınamaz.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setRestoreData(null)}>Vazgeç</Btn>
            <Btn variant="danger" onClick={applyRestore} disabled={restorePaketler.size === 0}><Icon name="check" size={14} /> Evet, Geri Yükle</Btn>
          </div>
        </Modal>
      )}
    </>
  );
};
