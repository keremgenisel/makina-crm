import { useState, useEffect } from "react";
import { BACKUP_SCHEMA_VERSION, BACKUP_APP_TAG, BACKUP_ENC_MARKER } from "../../lib/constants";
import { today, looksLikeBackup, safeStandardModels, parseMoney, bumpId, disAppSettingsSuz } from "../../lib/utils";
import { Icon, Btn, Modal, PasswordInput } from "../ui";
import { Section } from "./Section";

export const SettingsBackup = ({
  customers, services, dealers, stock, customModels, standardModels, factory, kalipDefs, partTypeDefs, calisanlar = [], notes, parts, partSales, payments,
  teklifler = [], faturalar = [], partStock = [], partStockLog = [], uretimFormlari = [],
  gorusmeler = [], setGorusmeler = null, rawDosyalar = [], setDosyalar = null,
  setCustomers, setServices, setDealers, setStock, setCustomModels, setStandardModels, setFactory, setKalipDefs, setPartTypeDefs, setCalisanlar, setNotes, setParts, setPartSales, setPayments,
  setTeklifler = null, setFaturalar = null, setPartStock = null, setPartStockLog = null, setUretimFormlari = null,
  version, appSettings, setAppSettings, flash,
}) => {
  const [restoreData, setRestoreData] = useState(null); // onay bekleyen yedek
  // Manuel yedek: şifreli/şifresiz seçim modalı
  const [backupAsk, setBackupAsk] = useState(false);
  const [pendingBackup, setPendingBackup] = useState(null);
  const [backupPw, setBackupPw] = useState("");
  const [backupPw2, setBackupPw2] = useState("");
  const [backupPwError, setBackupPwError] = useState("");
  // Geri yükleme: şifreli yedek parola sorma
  const [restoreEnvelope, setRestoreEnvelope] = useState(null);
  const [restorePw, setRestorePw] = useState("");
  const [restorePwError, setRestorePwError] = useState("");
  // Otomatik yedek parolası durumu
  const [autoPw, setAutoPw] = useState({ set: false, canEncrypt: true });
  const [autoPwInput, setAutoPwInput] = useState("");
  const [autoPwEditing, setAutoPwEditing] = useState(false);

  const refreshAutoPwStatus = () => {
    window.crmStorage?.autoBackupPasswordStatus?.().then(s => s && setAutoPw(s)).catch(() => {});
  };
  useEffect(() => { refreshAutoPwStatus(); }, []);

  const buildBackupData = async () => {
    // appSettings dışındaki makineye özgü alanlar (yedek klasörü, zamanlama) restore'da atlanır.
    // SMTP şifresi safeStorage ile şifreli olduğundan yedeklenmez, sadece host/port/email alınır.
    // Uygulama kilidi (appLock) yedeğe BİLEREK dahil edilmez: makinaya özgü bir ayardır ve
    // şifre özetlerinin yedek dosyasında gezmesi offline kırma riski oluşturur.
    const [mailConfig, mailLog] = await Promise.all([
      window.appMail?.getConfigForBackup?.() ?? null,
      window.appMail?.getAllLog?.() ?? [],
    ]);
    return { app: BACKUP_APP_TAG, schemaVersion: BACKUP_SCHEMA_VERSION, version, exportDate: today(), customers, services, dealers, stock, customModels, standardModels, factory, kalipDefs, partTypeDefs, calisanlar, notes, parts, partSales, payments, teklifler, faturalar, partStock, partStockLog, uretimFormlari, gorusmeler, dosyalar: rawDosyalar, appSettings, mailConfig, mailLog };
  };

  // ── Yedek Al ──
  const doBackup = async () => {
    try {
      const data = await buildBackupData();
      if (window.crmStorage?.backup) {
        setPendingBackup(data); setBackupPw(""); setBackupPw2(""); setBackupPwError(""); setBackupAsk(true);
      } else {
        // Tarayıcı modu: şifresiz indir (şifreleme yalnızca kurulu uygulamada)
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

  const saveBackup = async (encrypt) => {
    if (encrypt) {
      if (backupPw.length < 4) { setBackupPwError("Parola en az 4 karakter olmalı."); return; }
      if (backupPw !== backupPw2) { setBackupPwError("Parolalar eşleşmiyor."); return; }
    }
    try {
      const ok = await window.crmStorage.backup(pendingBackup, encrypt ? backupPw : undefined);
      setBackupAsk(false); setPendingBackup(null);
      if (ok) flash("ok", encrypt ? "Şifreli yedek kaydedildi. Parolayı güvenli saklayın; unutulursa geri yüklenemez." : "Yedek kaydedildi.");
    } catch (err) { flash("err", "Yedek alınamadı: " + err.message); }
  };

  // ── Yedek Yükle ──
  const doRestore = async () => {
    try {
      if (window.crmStorage?.restore) {
        const data = await window.crmStorage.restore();
        if (!data) return;
        if (data.format === BACKUP_ENC_MARKER) { // şifreli yedek → parola sor
          setRestoreEnvelope(data); setRestorePw(""); setRestorePwError("");
          return;
        }
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
            if (parsed.format === BACKUP_ENC_MARKER) { flash("err", "Şifreli yedek yalnızca kurulu uygulamada açılabilir."); return; }
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
    { id: "dosyalar", ad: "Dosyalar", aciklama: "müşteri, makina, servis ve bayi belgeleri (dosya arşivi)" },
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

  const saveAutoPw = async () => {
    if (autoPwInput.length < 4) { flash("err", "Parola en az 4 karakter olmalı."); return; }
    const res = await window.crmStorage.setAutoBackupPassword(autoPwInput);
    if (res?.ok) { setAutoPwInput(""); setAutoPwEditing(false); refreshAutoPwStatus(); flash("ok", "Otomatik yedek parolası kaydedildi. Parolayı güvenli saklayın; unutulursa yedekler açılamaz."); }
    else flash("err", res?.error || "Kaydedilemedi.");
  };
  const clearAutoPw = async () => {
    const res = await window.crmStorage.setAutoBackupPassword("");
    if (res?.ok) { refreshAutoPwStatus(); flash("ok", "Otomatik yedek şifrelemesi kapatıldı. Bundan sonraki yedekler şifresiz alınır."); }
  };

  const decryptAndRestore = async () => {
    setRestorePwError("");
    const res = await window.crmStorage.decryptBackup(restoreEnvelope, restorePw);
    if (!res?.ok) { setRestorePwError(res?.error || "Çözülemedi."); return; }
    if (!looksLikeBackup(res.data)) { setRestorePwError("Çözüldü ama geçerli bir yedek değil."); return; }
    setRestoreEnvelope(null);
    setRestoreData(res.data);
  };

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
    if (sec("dosyalar") && Array.isArray(restoreData?.dosyalar) && setDosyalar) setDosyalar(restoreData.dosyalar);
    if (sec("tanim") && Array.isArray(restoreData?.kalipDefs) && setKalipDefs) setKalipDefs(restoreData.kalipDefs);
    if (sec("tanim") && Array.isArray(restoreData?.partTypeDefs) && restoreData.partTypeDefs.length && setPartTypeDefs) setPartTypeDefs(restoreData.partTypeDefs);
    if (sec("tanim") && Array.isArray(restoreData?.calisanlar) && setCalisanlar) setCalisanlar(restoreData.calisanlar);
    if (sec("tanim") && Array.isArray(restoreData?.customModels)) setCustomModels(restoreData.customModels);
    if (sec("tanim")) setStandardModels(safeStandardModels(restoreData?.standardModels));
    if (sec("tanim") && Array.isArray(restoreData?.parts)) setParts?.(restoreData.parts);
    if (sec("not") && Array.isArray(restoreData?.notes) && setNotes) setNotes(restoreData.notes);
    if (sec("ayar") && restoreData?.factory) setFactory(restoreData.factory);

    // appSettings: makineye özgü alanları (yedek klasörü, zamanlama) koru, geri kalanını yedekten al.
    // Ayıklama listesi sunucu senkronizasyonu yoluyla ortak (disAppSettingsSuz) — iki yol da aynı.
    if (sec("ayar") && restoreData?.appSettings) {
      setAppSettings(p => ({ ...p, ...disAppSettingsSuz(restoreData.appSettings) }));
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
      ...["customers", "services", "partSales", "payments", "gorusmeler", "teklifler", "faturalar", "stock", "partStock", "partStockLog", "uretimFormlari", "dealers", "dosyalar", "notes", "parts", "kalipDefs", "customModels", "calisanlar"]
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
        <div className="section-desc">
          Tüm müşteri ve servis kayıtlarınızı tek bir dosya olarak kaydedin. Yedek dosyasını güvenli bir yerde
          (USB bellek, bulut depolama) saklamanızı öneririz. Geri yükleme yaptığınızda mevcut veriler yedekteki verilerle değiştirilir.
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Btn onClick={doBackup}><Icon name="download" size={15} /> Yedek Al</Btn>
          <Btn variant="ghost" onClick={doRestore}><Icon name="upload" size={15} /> Yedekten Geri Yükle</Btn>
        </div>
        <div style={{ fontSize: 12, color: "var(--n400, #94a3b8)", marginTop: 14 }}>
          Mevcut veri: {customers.length} müşteri · {dealers.length} bayi · {services.length} servis kaydı
        </div>

        {/* ── Otomatik Yedekleme ── */}
        <div style={{ borderTop: "1px solid var(--n150, #f1f5f9)", marginTop: 20, paddingTop: 20 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 14 }}>
            <input type="checkbox" checked={appSettings.autoBackup}
              onChange={e => setAppSettings(p => ({ ...p, autoBackup: e.target.checked }))}
              style={{ width: 18, height: 18, accentColor: "#e85d1a", cursor: "pointer" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--n900, #0f172a)" }}>Otomatik Yedekleme</span>
          </label>

          {appSettings.autoBackup && (
            <div style={{ paddingLeft: 28 }}>
              {!window.crmStorage?.chooseFolder ? (
                <div style={{ fontSize: 13, color: "var(--n500, #64748b)", background: "var(--n100, #f8fafc)", padding: "10px 14px", borderRadius: 10, border: "1px dashed var(--n200, #e2e8f0)" }}>
                  Otomatik yedekleme yalnızca kurulu uygulamada çalışır.
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                    <Btn small variant="ghost" onClick={async () => {
                      const folder = await window.crmStorage.chooseFolder();
                      if (folder) setAppSettings(p => ({ ...p, backupFolder: folder }));
                    }}>📁 Klasör Seç</Btn>
                    <span style={{ fontSize: 12, color: appSettings.backupFolder ? "var(--n900, #0f172a)" : "var(--n400, #94a3b8)", fontFamily: "monospace", wordBreak: "break-all" }}>
                      {appSettings.backupFolder || "Henüz klasör seçilmedi"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: "var(--n600, #475569)", fontWeight: 600 }}>Sıklık:</span>
                    <select value={appSettings.frequency}
                      onChange={e => setAppSettings(p => ({ ...p, frequency: e.target.value }))}
                      style={{ padding: "6px 12px", border: "1px solid var(--n200, #e2e8f0)", borderRadius: 8, fontSize: 13, background: "var(--n100, #f8fafc)" }}>
                      <option value="daily">Her gün</option>
                      <option value="weekly">Her hafta</option>
                      <option value="monthly">Her ay</option>
                    </select>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--n400, #94a3b8)", marginBottom: 14 }}>
                    {appSettings.lastBackup
                      ? `Son otomatik yedek: ${appSettings.lastBackup}`
                      : "Henüz otomatik yedek alınmadı — klasör seçildiğinde ilk yedek hemen alınır."}
                    {" "}Yedekler uygulama açılışında, vakti geldiyse otomatik yazılır.
                  </div>

                  {/* Otomatik yedek şifreleme */}
                  <div style={{ borderTop: "1px dashed var(--n200, #e2e8f0)", paddingTop: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--n700, #334155)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon name="lock" size={13} /> Otomatik yedek şifreleme {autoPw.set && <span style={{ fontSize: 11, fontWeight: 700, background: "var(--grnBg2, #dcfce7)", color: "var(--grn900, #166534)", borderRadius: 6, padding: "2px 8px", marginLeft: 4 }}>Açık</span>}
                    </div>
                    {!autoPw.canEncrypt ? (
                      <div style={{ fontSize: 12, color: "var(--n400, #94a3b8)" }}>Bu bilgisayarda güvenli depolama kullanılamadığı için otomatik yedek şifrelenemiyor.</div>
                    ) : autoPw.set ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12.5, color: "var(--grn900, #166534)" }}>Otomatik yedekler bu bilgisayarda belirlenen parolayla şifreleniyor.</span>
                        <Btn small variant="ghost" onClick={clearAutoPw}>Şifrelemeyi Kapat</Btn>
                      </div>
                    ) : autoPwEditing ? (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <div style={{ minWidth: 200 }}>
                            <PasswordInput value={autoPwInput} onChange={e => setAutoPwInput(e.target.value)} placeholder="Yedek parolası (min 4)" />
                          </div>
                          <Btn small onClick={saveAutoPw}>Kaydet</Btn>
                          <Btn small variant="ghost" onClick={() => { setAutoPwEditing(false); setAutoPwInput(""); }}>Vazgeç</Btn>
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--amb700, #b45309)", marginTop: 8 }}>Bu parolayı ayrıca güvenli bir yerde saklayın. Unutulursa şifreli yedekler geri yüklenemez.</div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12.5, color: "var(--n500, #64748b)" }}>Otomatik yedekler şu an şifresiz. Parola belirleyerek şifreleyebilirsiniz.</span>
                        <Btn small onClick={() => { setAutoPwInput(""); setAutoPwEditing(true); }}>Parola Belirle</Btn>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* Manuel yedek: şifreli/şifresiz seçimi */}
      {backupAsk && (
        <Modal title="Yedeği Şifrele" onClose={() => setBackupAsk(false)}>
          <div style={{ fontSize: 13, color: "var(--n500, #64748b)", lineHeight: 1.6, marginBottom: 14 }}>
            Yedek dosyası düz metindir; şifrelerseniz dosya sızsa bile parolasız açılamaz. Şifreli yedeği
            geri yüklerken bu parola sorulur, <b>unutulursa yedek açılamaz</b>.
          </div>
          <div style={{ marginBottom: 10 }}>
            <PasswordInput value={backupPw} onChange={e => setBackupPw(e.target.value)} placeholder="Parola (min 4)" autoFocus />
          </div>
          <div style={{ marginBottom: 10 }}>
            <PasswordInput value={backupPw2} onChange={e => setBackupPw2(e.target.value)} placeholder="Parola (tekrar)"
              onKeyDown={e => { if (e.key === "Enter") saveBackup(true); }} />
          </div>
          {backupPwError && <div style={{ fontSize: 13, fontWeight: 600, color: "var(--red800, #991b1b)", marginBottom: 10 }}>✗ {backupPwError}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <Btn variant="ghost" onClick={() => saveBackup(false)}>Şifresiz Kaydet</Btn>
            <Btn onClick={() => saveBackup(true)}><Icon name="lock" size={14} /> Şifreli Kaydet</Btn>
          </div>
        </Modal>
      )}

      {/* Geri yükleme: şifreli yedek parola sorma */}
      {restoreEnvelope && (
        <Modal title="Şifreli Yedek" onClose={() => setRestoreEnvelope(null)}>
          <div style={{ fontSize: 13, color: "var(--n500, #64748b)", lineHeight: 1.6, marginBottom: 14 }}>
            Bu yedek şifreli. Açmak için yedeği alırken belirlediğiniz parolayı girin.
          </div>
          <div style={{ marginBottom: 10 }}>
            <PasswordInput value={restorePw} onChange={e => setRestorePw(e.target.value)} placeholder="Yedek parolası" autoFocus
              onKeyDown={e => { if (e.key === "Enter") decryptAndRestore(); }} />
          </div>
          {restorePwError && <div style={{ fontSize: 13, fontWeight: 600, color: "var(--red800, #991b1b)", marginBottom: 10 }}>✗ {restorePwError}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setRestoreEnvelope(null)}>Vazgeç</Btn>
            <Btn onClick={decryptAndRestore}><Icon name="upload" size={14} /> Aç ve Devam Et</Btn>
          </div>
        </Modal>
      )}

      {/* Geri yükleme onayı */}
      {restoreData && (
        <Modal title="Yedeği Geri Yükle" onClose={() => setRestoreData(null)}>
          <div style={{ fontSize: 14, color: "var(--n600, #475569)", lineHeight: 1.6, marginBottom: 8 }}>
            Yüklenecek yedek: <b>{Array.isArray(restoreData.customers) ? restoreData.customers.length : 0} müşteri</b>,{" "}
            <b>{Array.isArray(restoreData.dealers) ? restoreData.dealers.length : 0} bayi</b>,{" "}
            <b>{Array.isArray(restoreData.services) ? restoreData.services.length : 0} servis kaydı</b>
            {restoreData.exportDate ? ` (${restoreData.exportDate} tarihli)` : ""}.
          </div>
          {restoreData.schemaVersion > BACKUP_SCHEMA_VERSION && (
            <div style={{ fontSize: 13, color: "var(--amb700, #b45309)", fontWeight: 600, marginBottom: 8 }}>
              ⚠ Bu yedek, bu programın daha yeni bir sürümüyle alınmış. Bazı veriler düzgün yüklenmeyebilir.
            </div>
          )}
          <div style={{ border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--n600, #475569)", textTransform: "uppercase", letterSpacing: .5 }}>Geri yüklenecek bölümler</span>
              <button onClick={() => setRestorePaketler(new Set(restorePaketler.size === RESTORE_PAKETLERI.length ? [] : RESTORE_PAKETLERI.map(pk => pk.id)))}
                style={{ background: "none", border: "none", color: "#e85d1a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {restorePaketler.size === RESTORE_PAKETLERI.length ? "Tümünü Kaldır" : "Tümünü Seç"}
              </button>
            </div>
            {RESTORE_PAKETLERI.map(pk => (
              <label key={pk.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={restorePaketler.has(pk.id)} onChange={() => paketToggle(pk.id)}
                  style={{ width: 16, height: 16, accentColor: "#e85d1a", cursor: "pointer" }} />
                <span style={{ fontWeight: 600, color: "var(--n900, #0f172a)" }}>{pk.ad}</span>
                {pk.aciklama && <span style={{ fontSize: 11.5, color: "var(--n400, #94a3b8)" }}>({pk.aciklama})</span>}
              </label>
            ))}
          </div>
          {restorePaketler.has("musteri") && !restorePaketler.has("evrak") && (
            <div style={{ fontSize: 12.5, color: "var(--amb700, #b45309)", marginBottom: 8 }}>
              ℹ Müşteriler yüklenip evraklar yüklenmezse, müşteri kayıtlarındaki kaynak teklif bağlantıları eski yedeğe göre kopuk kalabilir.
            </div>
          )}
          {restorePaketler.has("musteri") && !restorePaketler.has("stok") && (
            <div style={{ fontSize: 12.5, color: "var(--amb700, #b45309)", marginBottom: 8 }}>
              ℹ Müşteriler yüklenip stok yüklenmezse, makinaların stok bağlantıları ve üretim formu bağlantıları eski yedeğe göre farklı kalabilir.
            </div>
          )}
          <div style={{ fontSize: 13, color: "var(--red600, #dc2626)", fontWeight: 600, marginBottom: 20 }}>
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
