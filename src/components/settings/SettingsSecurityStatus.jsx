import { useState, useEffect } from "react";
import { Btn, Icon } from "../ui";

// Güvenlik Durumu: cihaz + hesap güvenliği için küçük bir kontrol listesi (özet panosu).
// İleride madde eklenebilir; her kontrol { key,title,state,value,desc,hint } üretir.
// state: "ok" (yeşil) | "warn" (sarı) | "unknown" (gri). Panel yalnızca DURUMU gösterir,
// hiçbir şeyi otomatik değiştirmez (özellikle disk şifreleme OS'un işidir, bkz securityStatus.cjs).

const STATE_STYLE = {
  ok:      { renk: "var(--grn700, #15803d)", bg: "var(--grnBg, #f0fdf4)", bd: "var(--grnBr, #bbf7d0)", etiket: "Güvenli" },
  warn:    { renk: "var(--amb700, #b45309)", bg: "var(--ambBg, #fffbeb)", bd: "var(--ambBr, #fde68a)", etiket: "Önerilir" },
  unknown: { renk: "var(--n500, #64748b)", bg: "var(--n100, #f8fafc)", bd: "var(--n200, #e2e8f0)", etiket: "Bilinmiyor" },
  info:    { renk: "var(--n500, #64748b)", bg: "var(--n100, #f8fafc)", bd: "var(--n200, #e2e8f0)", etiket: "" }, // nötr bilgi satırı (etiketsiz)
};

// İşletme tarafından yapılması önerilen adımlar (uygulamanın kendi güvenliğini tamamlar).
// Panelin altında katlanır bir bölümde gösterilir; yukarıdaki otomatik kontrollerle örtüşenler
// (disk/yedek/2FA) burada eylem rehberi olarak da yer alır.
const ONERILER = [
  { baslik: "Disk şifrelemesini açın", kritik: true, satirlar: [
    "Uygulama veritabanı (data.db) artık cihazda şifreli tutulur. Yine de disk şifreleme; şifreleme anahtarı deposunu, geçici dosyaları ve eski/portatif yedekleri de kapsayan en güçlü OS düzeyi katmandır.",
    "Windows'ta BitLocker'ı açın (Denetim Masası > BitLocker Sürücü Şifrelemesi; Windows Pro gerekir).",
    "Hem sunucu hem istemci bilgisayarlarda yapın. Tek seferlik, yüksek etkili adım.",
  ] },
  { baslik: "Sunucuyu güvenli bir ağda tutun", satirlar: [
    "İstemci-sunucu trafiği artık TLS ile şifrelenir ve sunucu sertifikası sabitlenir (ilk bağlantıda parmak izi onaylanır), yani aynı ağdaki biri trafiği dinleyemez.",
    "Yine de ağ hijyeni önemli: fabrika Wi-Fi'si WPA2/WPA3 şifreli olsun; sunucu ve istemciler mümkünse kablolu bağlansın.",
    "Kamera, misafir cihazları vb.yi ayrı bir ağda tutun.",
    "Tüm istemciler şifreli bağlandıktan sonra sunucuda 'Yalnız HTTPS' modunu açarak düz bağlantıları tümden kapatabilirsiniz.",
  ] },
  { baslik: "Yedeklere her zaman parola koyun", satirlar: [
    "Parolasız yedek dosyasını eline geçiren herkes tüm veriyi okuyabilir.",
    "Ayarlar > Veri Yönetimi > Yedekleme'den otomatik yedek şifrelemesini açın ve bir parola belirleyin.",
    "Parolayı güvenli saklayın; unutulursa yedek açılamaz. Yedekleri şifreli/kilitli bir yerde tutun.",
  ] },
  { baslik: "Güçlü parola ve PIN kullanın", satirlar: [
    "Giriş şifrelerini tahmin edilmesi zor seçin (isim, 123456 gibi olmasın).",
    "Uygulama kilidi PIN'ini daha uzun tutun.",
    "Mümkünse yöneticiler için iki adımlı doğrulamayı (2FA) açın.",
  ] },
  { baslik: "Sunucuyu doğrudan internete açmayın", satirlar: [
    "Modem/router'da sunucuya port yönlendirme yapmayın.",
    "Uzaktan erişim yalnızca Tailscale üzerinden olmalı (uçtan uca şifreli).",
    "Sunucuyu bir internet sitesi gibi dışarı açmak, tüm veriyi saldırıya açık hale getirir.",
  ] },
];

function diskCheck(disk) {
  const macMi = disk?.platform === "darwin";
  const nasil = macMi
    ? "Sistem Ayarları > Gizlilik ve Güvenlik > FileVault'tan açın."
    : "Windows'ta Denetim Masası > BitLocker Sürücü Şifrelemesi'nden açın (Windows Pro gerekir).";
  if (disk?.state === "on") return { key: "disk", title: "Disk şifreleme", state: "ok", value: "Açık",
    desc: "Disk şifreli. Uygulama veritabanı zaten şifreli; disk şifreleme geçici dosyalar, eski yedekler ve anahtar deposu için de koruma ekler." };
  if (disk?.state === "off") return { key: "disk", title: "Disk şifreleme", state: "warn", value: "Kapalı",
    desc: "Disk şifreli değil. Veritabanı uygulama tarafından şifreli tutulur, ama disk şifreleme geçici dosyalar, eski/portatif yedekler ve anahtar deposu için ek koruma sağlar.", hint: nasil };
  return { key: "disk", title: "Disk şifreleme", state: "unknown", value: "Bilinmiyor",
    desc: "Durum otomatik okunamadı (Windows'ta yönetici yetkisi gerekebilir).", hint: nasil };
}

// Veritabanı at-rest şifreleme — yalnız veriyi tutan makinede (sunucu/yerel) gösterilir.
function dbEncCheck(st) {
  if (st?.encrypted) return { key: "dbenc", title: "Veritabanı şifreleme", state: "ok", value: "Açık",
    desc: "Veritabanı diskte şifreli tutuluyor; anahtar OS anahtarlığında (Windows DPAPI). PC veya disk çalınsa da parolasız okunamaz." };
  if (st && st.canEncrypt === false) return { key: "dbenc", title: "Veritabanı şifreleme", state: "warn", value: "Korunmasız",
    desc: "Bu ortamda güvenli anahtar deposu (safeStorage) bulunamadı; veritabanı ve oturum anahtarı (jwtSecret) diskte şifresiz/düz tutuluyor. Güvenli anahtar deposu olmadan uygulama düzeyinde at-rest şifreleme yapılamaz — tek koruma OS disk şifrelemesidir.",
    hint: "Aşağıdaki 'Disk şifreleme' maddesini (BitLocker/FileVault) açık tutun. Bu güvenli depo Windows'ta standarttır; mümkünse uygulamayı Windows'ta çalıştırın." };
  return { key: "dbenc", title: "Veritabanı şifreleme", state: "warn", value: "Kapalı",
    desc: "Veritabanı diskte şifresiz. Bu sürüme güncelleyip uygulamayı yeniden başlatın; mevcut veritabanı ilk açılışta otomatik şifrelenir.", hint: "Uygulamayı en son sürüme güncelleyin." };
}

function appLockCheck(lock) {
  if (lock?.enabled) return { key: "applock", title: "Uygulama kilidi", state: "ok", value: "Açık",
    desc: "Uygulama açılışta PIN ile kilitleniyor." };
  return { key: "applock", title: "Uygulama kilidi", state: "warn", value: "Kapalı",
    desc: "Uygulama açılışta kilit sormuyor.", hint: "Ayarlar > Uygulama Şifresi'nden bir PIN belirleyin." };
}

function backupCheck(bkp) {
  if (bkp?.set) return { key: "backup", title: "Otomatik yedek şifreleme", state: "ok", value: "Açık",
    desc: "Otomatik yedekler şifreli olarak alınıyor." };
  if (bkp && bkp.canEncrypt === false) return { key: "backup", title: "Otomatik yedek şifreleme", state: "warn", value: "Korunmasız",
    desc: "Bu ortamda güvenli anahtar deposu (safeStorage) bulunamadığından otomatik yedekler şifrelenemiyor; şifresiz JSON olarak alınır ve çalınırsa okunabilir.",
    hint: "Yedekleri şifreli/kilitli bir yerde saklayın ve OS disk şifrelemesini açık tutun." };
  return { key: "backup", title: "Otomatik yedek şifreleme", state: "warn", value: "Kapalı",
    desc: "Otomatik yedekler şifresiz JSON olarak alınıyor; çalınırsa okunabilir.", hint: "Ayarlar > Yedekleme'den otomatik yedeklere parola belirleyin." };
}

// Taşıma şifreleme (TLS): sunucu modunda sertifika (fp) var mı; istemci modunda pinlenmiş
// https ile mi bağlı. Yerel modda ağ olmadığı için gösterilmez.
function tlsCheck(cfg, isClient) {
  const acik = isClient ? !!cfg?.tls : !!cfg?.fp;
  if (acik) return { key: "tls", title: "Taşıma şifreleme (TLS)", state: "ok", value: isClient ? "Pinlenmiş HTTPS" : "Açık",
    desc: isClient
      ? "Sunucuyla bağlantı şifreli (HTTPS) ve sertifika sabitlenmiş; aynı ağdaki biri dinleyemez."
      : "Sunucu TLS ile dinliyor; istemciler şifreli (HTTPS) bağlanabilir." };
  return { key: "tls", title: "Taşıma şifreleme (TLS)", state: "warn", value: "Kapalı",
    desc: isClient
      ? "Sunucuya şifresiz (HTTP) bağlısınız; aynı yerel ağdaki biri trafiği dinleyebilir."
      : "Sunucu TLS olmadan çalışıyor.",
    hint: isClient
      ? "Ayarlar > Sunucu'dan çıkıp yeniden giriş yaparak şifreli bağlantıya geçin."
      : "Uygulamayı güncelleyip sunucuyu yeniden başlatın." };
}

function twoFactorCheck(tfa) {
  if (tfa?.enabled) return { key: "2fa", title: "İki adımlı doğrulama (2FA)", state: "ok", value: "Açık",
    desc: "Bu hesaba girişte authenticator kodu da gerekiyor." };
  if (tfa && tfa.enabled === false) return { key: "2fa", title: "İki adımlı doğrulama (2FA)", state: "warn", value: "Kapalı",
    desc: "Bu hesap yalnızca şifreyle korunuyor.", hint: "Ayarlar > Sunucu Bağlantısı'ndan iki adımlı doğrulamayı açın." };
  return { key: "2fa", title: "İki adımlı doğrulama (2FA)", state: "unknown", value: "Bilinmiyor",
    desc: "Hesap 2FA durumu okunamadı." };
}

export function SettingsSecurityStatus() {
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onerilerAcik, setOnerilerAcik] = useState(false);

  async function runChecks() {
    setLoading(true);
    const results = [];

    // Mod tespiti önce: istemci PC'de disk şifreleme ve otomatik yedek GÖSTERİLMEZ — veri ve
    // yedekler sunucuda tutulduğu için bu iki madde sunucunun sorumluluğudur; istemcide yalnız o
    // PC'ye/kullanıcıya özel olanlar (uygulama kilidi + 2FA) anlamlıdır.
    // getConfig: sunucu modu → { isServer:true }, istemci modu → { serverUrl, isActive }, yerel → { isActive:false }.
    let cfg = null;
    try { cfg = await window.appServer?.getConfig?.(); } catch { /* yerel mod */ }
    const isClient = !!cfg?.serverUrl && !cfg?.isServer;

    // Veritabanı at-rest şifreleme + disk şifreleme — yalnız veriyi tutan makinede (sunucu/yerel)
    if (!isClient) {
      let dbSt = null;
      try { dbSt = await window.appSecurity?.dbEncryption?.(); } catch { /* okunamadı → uyarı */ }
      results.push(dbEncCheck(dbSt));

      let disk = { state: "unknown", platform: "" };
      try { disk = (await window.appSecurity?.diskEncryption?.()) || disk; } catch { /* okunamadı → unknown */ }
      results.push(diskCheck(disk));
    }

    // Uygulama kilidi — her PC'de yerel, her modda gösterilir
    let lock = null;
    try { lock = await window.appLock?.status?.(); } catch { /* köprü yoksa uyarı olarak kalır */ }
    results.push(appLockCheck(lock));

    // Otomatik yedek — yalnız veriyi tutan makinede (sunucu/yerel)
    if (!isClient) {
      let bkp = null;
      try { bkp = await window.crmStorage?.autoBackupPasswordStatus?.(); } catch { /* yoksa uyarı */ }
      results.push(backupCheck(bkp));
    }

    // Taşıma şifreleme (TLS) — sunucu/istemci modunda anlamlı; yerel modda ağ yok, atlanır.
    if (cfg?.isServer || isClient) results.push(tlsCheck(cfg, isClient));

    // 2FA sunucu/istemci modunda hesap durumunu gösterir; yerel modda giriş hesabı olmadığı için
    // "uygulanmaz" bilgi satırı gösterilir (kafa karışmasın, "2FA nerede?" sorusunu önler).
    if (cfg?.isServer || (cfg?.serverUrl && cfg?.isActive)) {
      let tfa = null;
      try { const r = await window.appServer?.apiRequest?.({ method: "GET", path: "/auth/2fa/status" }); if (r?.ok) tfa = r.data; } catch { /* okunamadı */ }
      results.push(twoFactorCheck(tfa));
    } else {
      results.push({ key: "2fa", title: "İki adımlı doğrulama (2FA)", state: "info", value: "Yerel modda uygulanmaz",
        desc: "2FA yalnızca çoklu kullanıcı (sunucu) modunda, giriş yapılan hesaplar için geçerlidir. Yerel tek kullanıcı modda giriş hesabı olmadığından uygulanmaz." });
    }

    setChecks(results);
    setLoading(false);
  }

  useEffect(() => { runChecks(); }, []);

  const guvenliSayisi = checks.filter(c => c.state === "ok").length;

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--n900, #0f172a)" }}>Güvenlik Durumu</h3>
        <Btn variant="ghost" small onClick={runChecks} disabled={loading}>
          <Icon name="refresh" size={14} /> {loading ? "Kontrol ediliyor..." : "Yenile"}
        </Btn>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--n500, #64748b)", marginBottom: 16, lineHeight: 1.6 }}>
        Bu bilgisayarın ve hesabın güvenlik ayarlarının özeti. Panel yalnızca durumu gösterir, ayarları değiştirmez.
        {checks.length > 0 && <> {" "}<b style={{ color: guvenliSayisi === checks.length ? "var(--grn700, #15803d)" : "var(--amb700, #b45309)" }}>{guvenliSayisi} / {checks.length} güvenli.</b></>}
      </div>

      {loading && checks.length === 0 ? (
        <div style={{ color: "var(--n400, #94a3b8)", fontSize: 13 }}>Kontrol ediliyor...</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {checks.map(c => {
            const st = STATE_STYLE[c.state] || STATE_STYLE.unknown;
            return (
              <div key={c.key} style={{ border: `1px solid ${st.bd}`, background: st.bg, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--n900, #0f172a)" }}>{c.title}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: st.renk, whiteSpace: "nowrap" }}>
                    {c.value}{st.etiket ? ` · ${st.etiket}` : ""}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--n600, #475569)", marginTop: 4, lineHeight: 1.5 }}>{c.desc}</div>
                {c.hint && <div style={{ fontSize: 12, color: st.renk, marginTop: 6, lineHeight: 1.5 }}>→ {c.hint}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Güvenlik Önerileri — işletme tarafından yapılacak adımlar (katlanır) */}
      <div style={{ marginTop: 18, border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, overflow: "hidden" }}>
        <button onClick={() => setOnerilerAcik(a => !a)}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "12px 14px", background: "var(--n100, #f8fafc)", border: "none", cursor: "pointer", textAlign: "left" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "var(--n900, #0f172a)" }}>
            <Icon name="lock" size={15} /> Güvenlik Önerileri
          </span>
          <span style={{ fontSize: 12, color: "var(--n500, #64748b)" }}>{onerilerAcik ? "▾ Gizle" : "▸ Göster"}</span>
        </button>
        {onerilerAcik && (
          <div style={{ padding: "6px 14px 14px" }}>
            <div style={{ fontSize: 12.5, color: "var(--n500, #64748b)", margin: "6px 0 12px", lineHeight: 1.6 }}>
              Çoklu kullanıcı modunda verinizi korumak için önerilen adımlar. Uygulamanın kendi güvenliğini (veritabanı şifreleme, TLS + sertifika sabitleme, parola, giriş kilidi, 2FA, yetkilendirme) <b>tamamlar</b>. En kritik ikisi: <b>disk şifrelemesi</b> ve <b>parolalı yedekler</b>.
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {ONERILER.map((o, i) => (
                <div key={i} style={{ border: "1px solid var(--n200, #e2e8f0)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#e85d1a", color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--n900, #0f172a)" }}>{o.baslik}</span>
                    {o.kritik && <span style={{ fontSize: 10, fontWeight: 800, color: "var(--red800, #991b1b)", background: "var(--redBg2, #fee2e2)", borderRadius: 6, padding: "2px 7px" }}>EN YÜKSEK ETKİ</span>}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, color: "var(--n600, #475569)", fontSize: 12.5, lineHeight: 1.6 }}>
                    {o.satirlar.map((s, j) => <li key={j}>{s}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
