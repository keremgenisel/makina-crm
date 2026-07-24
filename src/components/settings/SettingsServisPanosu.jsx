import { useState, useEffect } from "react";
import { Field, Input, Select, Btn } from "../ui";
import { Section } from "./Section";
import { SERVIS_ALARM_VARSAYILAN } from "../../lib/constants";

// Ayarlar > Uygulama > Servis Panosu — yeni-servis alarmı: aç/kapa + ses/yanıp sönme süreleri.
// Kullanıcı buradan yönetir (sunucu izin sistemine bağlı DEĞİL). appSettings.servisAlarm'da saklanır.
export const SettingsServisPanosu = ({ appSettings, setAppSettings, flash }) => {
  // Yerel state saniye/dakika birimini ayrı tutar; kayıtta saniyeye çevrilir.
  const [sa, setSa] = useState({ acik: false, sesDeger: SERVIS_ALARM_VARSAYILAN.sesSn, sesBirim: "sn", yanipDeger: SERVIS_ALARM_VARSAYILAN.yanipSn, yanipBirim: "sn" });

  useEffect(() => {
    const v = appSettings?.servisAlarm;
    // Saniye değerini gösterime çevir: 60'ın tam katı ve >=60 ise dakika, değilse saniye.
    const bol = (sn) => (sn != null && sn % 60 === 0 && sn >= 60) ? { deger: sn / 60, birim: "dk" } : { deger: sn ?? null, birim: "sn" };
    const s = bol(v?.sesSn ?? SERVIS_ALARM_VARSAYILAN.sesSn);
    const y = bol(v?.yanipSn ?? SERVIS_ALARM_VARSAYILAN.yanipSn);
    setSa({ acik: v?.acik === true, sesDeger: s.deger, sesBirim: s.birim, yanipDeger: y.deger, yanipBirim: y.birim });
  }, [appSettings?.servisAlarm]);

  const save = () => {
    const sn = (deger, birim) => Math.max(1, Math.round((Number(deger) || 0) * (birim === "dk" ? 60 : 1)));
    setAppSettings?.(p => ({ ...p, servisAlarm: { acik: sa.acik, sesSn: sn(sa.sesDeger, sa.sesBirim), yanipSn: sn(sa.yanipDeger, sa.yanipBirim) } }));
    flash?.("ok", "Servis Panosu alarm ayarları kaydedildi.");
  };

  const birimSec = (deger, onDeger, birim, onBirim) => (
    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ flex: 1 }}><Input type="number" min="1" value={deger ?? ""} onChange={e => onDeger(e.target.value)} /></div>
      <div style={{ width: 120 }}>
        <Select value={birim} onChange={e => onBirim(e.target.value)}>
          <option value="sn">saniye</option>
          <option value="dk">dakika</option>
        </Select>
      </div>
    </div>
  );

  return (
    <Section title="Servis Panosu Alarmı" icon="service">
      <div className="section-desc">
        Uzaktan (başka bilgisayardan) yeni bir servis eklendiğinde Servis Panosu'nda kart yanıp söner,
        sesli uyarı çalar ve üstte bir bildirim şeridi çıkar. Alarmı buradan açıp kapatabilir, sürelerini
        ayarlayabilirsiniz.
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 18, fontSize: 13.5, cursor: "pointer", color: "var(--n900, #0f172a)" }}>
        <input type="checkbox" checked={sa.acik} onChange={e => setSa(p => ({ ...p, acik: e.target.checked }))} style={{ margin: 0 }} />
        <span><b style={{ fontWeight: 700 }}>Alarm açık.</b> Yeni servis geldiğinde sesli ve görsel olarak uyarır.</span>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 520, opacity: sa.acik ? 1 : 0.5, pointerEvents: sa.acik ? "auto" : "none" }}>
        <Field label="Ses süresi">
          {birimSec(sa.sesDeger, v => setSa(p => ({ ...p, sesDeger: v })), sa.sesBirim, v => setSa(p => ({ ...p, sesBirim: v })))}
        </Field>
        <Field label="Yanıp sönme süresi">
          {birimSec(sa.yanipDeger, v => setSa(p => ({ ...p, yanipDeger: v })), sa.yanipBirim, v => setSa(p => ({ ...p, yanipBirim: v })))}
        </Field>
      </div>

      <div style={{ marginTop: 18 }}>
        <Btn onClick={save}>Kaydet</Btn>
      </div>
    </Section>
  );
};
