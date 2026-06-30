import { useState } from "react";
import { Icon } from "./ui";
import { ModelsManager } from "./ModelsManager";
import { KalipManager } from "./KalipManager";
import { PartManager } from "./PartManager";
import { Section } from "./settings/Section";
import { SettingsApp } from "./settings/SettingsApp";
import { SettingsBackup } from "./settings/SettingsBackup";
import { SettingsSecurity } from "./settings/SettingsSecurity";
import { SettingsMail } from "./settings/SettingsMail";
import { SettingsSentMail } from "./settings/SettingsSentMail";
import { SettingsExport } from "./settings/SettingsExport";
import { SettingsImport } from "./settings/SettingsImport";
import { SettingsTrash } from "./settings/SettingsTrash";
import { SettingsOptimize } from "./settings/SettingsOptimize";
import { SettingsKdv } from "./settings/SettingsDanger";
import { SettingsCompany } from "./settings/SettingsCompany";
import { SettingsTranslations } from "./settings/SettingsTranslations";
import { SettingsDanger } from "./settings/SettingsDanger";
import { SettingsDocuments } from "./settings/SettingsDocuments";

export const Settings = ({ customers, services, dealers, stock = [], setStock, setCustomers, setServices, setDealers, version, appSettings, setAppSettings, customModels, setCustomModels, standardModels, setStandardModels, factory, setFactory, kalipDefs, setKalipDefs, notes = [], setNotes = null, parts = [], setParts = null, partSales = [], setPartSales = null, payments = [], setPayments = null, showToast = () => {},
  partStock = [], setPartStock = null, partStockLog = [], setPartStockLog = null,
  rawCustomers = [], rawServices = [], rawDealers = [], rawStock = [], rawNotes = [], rawParts = [], rawPartSales = [], rawPayments = [], rawKalipDefs = [], rawCustomModels = [],
  rawTeklifler = [], setTeklifler = null,
}) => {
  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };
  const [msg, setMsg] = useState(null);
  const [settingsTab, setSettingsTab] = useState("app"); // "app" | "models" | ...

  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Ayarlar</h2>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* SOL DİKEY MENÜ — gruplu */}
        <div style={{ width: 220, flexShrink: 0, minWidth: 200 }}>
          {[
            { grup: "Genel", items: [{ id: "app", label: "Uygulama", icon: "settings" }, { id: "company", label: "Firma Bilgileri", icon: "machine" }] },
            { grup: "Güvenlik", items: [{ id: "security", label: "Uygulama Şifresi", icon: "lock" }] },
            { grup: "Entegrasyonlar", items: [{ id: "eposta", label: "E-posta Ayarları", icon: "mail" }, { id: "sentmail", label: "Gönderilen E-postalar", icon: "mail" }] },
            { grup: "Veri Yönetimi", items: [{ id: "backup", label: "Yedekleme", icon: "download" }, { id: "export", label: "Dışa Aktar", icon: "download" }, { id: "import", label: "İçe Aktar", icon: "box" }, { id: "optimize", label: "Resim Optimize", icon: "settings" }, { id: "trash", label: "Çöp Kutusu", icon: "trash" }] },
            { grup: "Tanımlar", items: [{ id: "models", label: "Makina Modelleri", icon: "machine" }, { id: "kaliplar", label: "Kalıp Modelleri", icon: "box" }, { id: "yedekparca", label: "Parça/Yedek Parça", icon: "parts" }, { id: "kdv", label: "KDV Oranı", icon: "settings" }, { id: "evrak", label: "Teklif/Proforma Formu", icon: "settings" }, { id: "ceviri", label: "Çeviriler", icon: "settings" }] },
          ].map(g => (
            <div key={g.grup} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .6, marginBottom: 8, paddingLeft: 6 }}>{g.grup}</div>
              {g.items.map(st => {
                const active = settingsTab === st.id;
                return (
                  <button key={st.id} onClick={() => setSettingsTab(st.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                      padding: "10px 14px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
                      border: "none", marginBottom: 4,
                      background: active ? "#e85d1a" : "transparent",
                      color: active ? "#fff" : "#475569",
                      boxShadow: active ? "0 2px 8px rgba(232,93,26,.3)" : "none",
                      transition: "background .15s",
                    }}>
                    <Icon name={st.icon} size={16} />
                    {st.label}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Tehlikeli Bölge — en altta, kırmızı */}
          <div style={{ marginTop: 8, borderTop: "1.5px solid #fecaca", paddingTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#f87171", textTransform: "uppercase", letterSpacing: .6, marginBottom: 8, paddingLeft: 6 }}>Tehlikeli Bölge</div>
            <button onClick={() => setSettingsTab("danger")}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                padding: "10px 14px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
                border: "none", marginBottom: 4,
                background: settingsTab === "danger" ? "#fef2f2" : "transparent",
                color: settingsTab === "danger" ? "#b91c1c" : "#ef4444",
                boxShadow: settingsTab === "danger" ? "0 2px 8px rgba(239,68,68,.2)" : "none",
                transition: "background .15s",
              }}>
              <Icon name="trash" size={16} />
              Uygulamayı Kaldır
            </button>
          </div>
        </div>

        {/* SAĞ İÇERİK */}
        <div style={{ flex: 1, minWidth: 320, maxWidth: 760 }}>
      {msg && (
        <div style={{ maxWidth: 720, marginBottom: 16, padding: "12px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: msg.type === "ok" ? "#d1fae5" : "#fee2e2", color: msg.type === "ok" ? "#065f46" : "#991b1b" }}>
          {msg.text}
        </div>
      )}

      {settingsTab === "app" && <SettingsApp version={version} flash={flash} />}

      {settingsTab === "company" && <SettingsCompany factory={factory} setFactory={setFactory} appSettings={appSettings} setAppSettings={setAppSettings} setCustomers={setCustomers} setServices={setServices} flash={flash} />}

      {settingsTab === "backup" && (
        <SettingsBackup
          customers={customers} services={services} dealers={dealers} stock={stock} customModels={customModels} standardModels={standardModels}
          factory={factory} kalipDefs={kalipDefs} notes={notes} parts={parts} partSales={partSales} payments={payments}
          teklifler={rawTeklifler} partStock={partStock} partStockLog={partStockLog}
          setCustomers={setCustomers} setServices={setServices} setDealers={setDealers} setStock={setStock} setCustomModels={setCustomModels}
          setStandardModels={setStandardModels} setFactory={setFactory} setKalipDefs={setKalipDefs} setNotes={setNotes} setParts={setParts}
          setPartSales={setPartSales} setPayments={setPayments} setTeklifler={setTeklifler} setPartStock={setPartStock} setPartStockLog={setPartStockLog}
          version={version} appSettings={appSettings} setAppSettings={setAppSettings} flash={flash}
        />
      )}

      {settingsTab === "security" && <SettingsSecurity flash={flash} />}

      {settingsTab === "models" && (
        <Section title="Makina Modelleri" icon="machine">
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
            Buradaki modeller, Yeni Müşteri ve Makina Geçmişi ekranlarındaki model seçiminde görünür.
            Standart modeller düzenlenebilir ama silinemez; özel modeller hem düzenlenip hem silinebilir.
          </div>
          <ModelsManager showToast={showToast} standardModels={standardModels} setStandardModels={setStandardModels}
            customModels={customModels} setCustomModels={setCustomModels} setCustomers={setCustomers} setStock={setStock} parts={parts} />
        </Section>
      )}

      {settingsTab === "kaliplar" && (
        <Section title="Kalıp Modelleri" icon="box">
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
            Buraya eklediğiniz kalıplar, Yeni Müşteri ekranındaki <b>Kalıp</b> seçiminde listelenir. Ölçü, müşteri eklerken elle girilir.
          </div>
          <KalipManager kalipDefs={kalipDefs} setKalipDefs={setKalipDefs} showToast={showToast} setCustomers={setCustomers} setPartSales={setPartSales} />
        </Section>
      )}

      {settingsTab === "yedekparca" && (
        <Section title="Parça/Yedek Parça Tanımları" icon="parts">
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
            Verdiğiniz/sattığınız yedek parçaları buraya tanımlayın. Bunlar, Müşteriler'de bir müşterinin detayını açtığınızda "Değişen Parçalar" seçilirken listelenir. Fiyat ve para birimi seçim sırasında girilir. Kalıplar buraya eklenmez; onlar <b>Kalıp Modelleri</b>'nden gelir ve müşteri detayındaki "Extra Kalıp Satışı" ile satılır.
          </div>
          <PartManager parts={parts} setParts={setParts} showToast={showToast} setServices={setServices}
            allModels={[...standardModels, ...customModels]} />
        </Section>
      )}


      {settingsTab === "kdv" && <SettingsKdv appSettings={appSettings} setAppSettings={setAppSettings} />}

      {settingsTab === "evrak" && <SettingsDocuments appSettings={appSettings} setAppSettings={setAppSettings} flash={flash} />}

      {settingsTab === "ceviri" && <SettingsTranslations appSettings={appSettings} setAppSettings={setAppSettings} flash={flash} />}

      {settingsTab === "danger" && <SettingsDanger flash={flash} />}

      {settingsTab === "eposta" && <SettingsMail flash={flash} />}

      {settingsTab === "sentmail" && <SettingsSentMail />}

      {settingsTab === "export" && (
        <SettingsExport
          customers={customers} services={services} dealers={dealers} stock={stock} partSales={partSales} payments={payments}
          notes={notes} parts={parts} appSettings={appSettings} flash={flash}
        />
      )}

      {settingsTab === "import" && (
        <SettingsImport customers={customers} setCustomers={setCustomers} setServices={setServices} flash={flash}
          parts={parts} setParts={setParts} />
      )}

      {settingsTab === "optimize" && (
        <SettingsOptimize
          customModels={customModels} setCustomModels={setCustomModels}
          standardModels={standardModels} setStandardModels={setStandardModels}
          kalipDefs={kalipDefs} setKalipDefs={setKalipDefs}
          parts={parts} setParts={setParts}
          appSettings={appSettings} setAppSettings={setAppSettings}
          flash={flash}
        />
      )}

      {settingsTab === "trash" && (
        <SettingsTrash
          rawCustomers={rawCustomers} rawServices={rawServices} rawPartSales={rawPartSales} rawPayments={rawPayments}
          rawDealers={rawDealers} rawStock={rawStock} rawNotes={rawNotes} rawKalipDefs={rawKalipDefs} rawParts={rawParts} rawCustomModels={rawCustomModels}
          rawTeklifler={rawTeklifler}
          setCustomers={setCustomers} setServices={setServices} setPartSales={setPartSales} setPayments={setPayments}
          setDealers={setDealers} setStock={setStock} setNotes={setNotes} setKalipDefs={setKalipDefs} setParts={setParts} setCustomModels={setCustomModels}
          setTeklifler={setTeklifler}
          partStock={partStock} setPartStock={setPartStock} partStockLog={partStockLog} setPartStockLog={setPartStockLog}
          appSettings={appSettings} showToast={showToast}
        />
      )}
        </div>{/* /sağ içerik */}
      </div>{/* /flex kapsayıcı */}
    </div>
  );
};
