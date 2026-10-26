import { useEffect, useState } from "react";
import { KartBolum, BosDurum, UyariSeridi, Ipucu } from "../tasarim";
import { surumOzeti, kullaniciAdlari, SURUM_KAYIT_EYLEMLERI, SURUM_OKUMA_LIMITI } from "../../lib/surumOzeti";

// Spec 0085 R13–R19: Sunucu Bağlantısı'nda (yalnız sunucu PC, sunucu çalışırken) "Bağlı bilgisayarlar ve sürümleri".
// Veri yerel veritabanından IPC ile okunur (window.securityLog.get, R14, C6): sunucu PC'nin arayüzünde JWT yok,
// GET /api/security-log bu akışta hiç çağrılmaz. İki eylem süzgeçli çağrı (limit 200), özet saf fonksiyonda.
// Sürüm uyumsuzluğu hiçbir şeyi engellemez (R20); kart yalnız görünürlüktür.
export const TAZELIK_IBARESI = "Bu liste canlı bağlantı değil, son görülen bilgisidir: her istemci uygulama açıldığında ve açık kaldıkça günde bir kez sunucuya sürümünü bildirir.";
export const PENCERE_IBARESI = `Son ${SURUM_OKUMA_LIMITI} giriş ve ${SURUM_OKUMA_LIMITI} oturum yenileme kaydına bakılır; daha önce görülmüş ya da geçmişi temizlenmiş kullanıcı listede yer almaz.`;

// Spec 0112 R6/2, R12: iki yeni cümle (0085'in iki sabiti birebir korunur, C4).
export const KALDIRMA_IBARESI = "Artık kullanılmayan bir bilgisayarı listeden çıkarmak için kullanıcısını aşağıdaki Kullanıcı Yönetimi'nden silin; kullanıcı geçmişi korunur.";
export const SUZME_YAPILAMADI_IBARESI = "Kullanıcı listesi okunamadığı için silinmiş kullanıcıların satırları da listelenir.";
export const BOS_METNI = "Hiçbir istemci bilgisayar henüz giriş yapmadı, kullanıcı geçmişi temizlendi ya da giriş yapmış kullanıcıların hepsi silindi.";

const OKUNAMADI = "okunamadi"; // kullanıcı listesi okuma durumu (yerel; dışa verilmez)

const fmtTs = (ts) => { try { return ts ? new Date(ts).toLocaleString("tr-TR") : "—"; } catch { return ts; } };

// Spec 0112: güvenlik geçmişi IPC'den tek seferlik (0085); kullanıcı listesi var olan /api/users ucundan (yalnız GET,
// sunucu PC'de geri döngü + yönetici anahtarı, C3). Liste ilk çizimde ve `tazele` sinyali değiştiğinde okunur (R10/3, R11;
// sinyal Kullanıcı Yönetimi'nin her başarılı yüklemesinde artar). Kart yazma yapmaz (C2).
export function BagliBilgisayarlar({ version = "", tazele = 0 }) {
  const [kayitlar, setKayitlar] = useState(null); // null = yükleniyor
  // Kullanıcı listesi okuması (R3/2): null = bekliyor (istek yolda ya da köprü yok: süzme yok, ibare yok), OKUNAMADI (süzme yok,
  // ibare var; boş liste ve dizi olmayan cevap da, Karar 8), dizi (süzme var). Yeniden okumada son durum cevap gelene kadar
  // kalır (silinen satır bir an geri gelmesin); eskimiş cevap iptal bayrağıyla atılır.
  const [adlar, setAdlar] = useState(null);

  useEffect(() => {
    const istek = window.appServer?.apiRequest;
    if (typeof istek !== "function") return; // R3/3, AC-19: köprü yok → sessizce süzmesiz
    let iptal = false;
    (async () => {
      let sonuc;
      try { const r = await istek({ method: "GET", path: "/api/users" }); sonuc = r?.ok ? kullaniciAdlari(r.data) : null; }
      catch { sonuc = null; }
      if (!iptal) setAdlar(sonuc || OKUNAMADI); // sebep kullanıcıya yazılmaz (R3/3)
    })();
    return () => { iptal = true; };
  }, [tazele]);

  useEffect(() => {
    let iptal = false;
    (async () => {
      const oku = async (action) => {
        try { const r = await window.securityLog?.get({ action, limit: SURUM_OKUMA_LIMITI, offset: 0 }); return r?.ok ? (r.rows || []) : []; }
        catch { return []; }
      };
      const parcalar = await Promise.all(SURUM_KAYIT_EYLEMLERI.map(oku));
      if (!iptal) setKayitlar(parcalar.flat());
    })();
    return () => { iptal = true; };
  }, []);

  const { satirlar, guncellenmeli, karsilastirildi } = surumOzeti(kayitlar || [], version, Array.isArray(adlar) ? adlar : null);
  const baslik = `Bağlı bilgisayarlar ve sürümleri${guncellenmeli ? ` · ${guncellenmeli} bilgisayar güncellenmeli` : ""}`;
  const th = { textAlign: "left", padding: "8px 10px", fontSize: 11.5, fontWeight: 700, color: "var(--n500, #64748b)", borderBottom: "1px solid var(--n200, #e2e8f0)", whiteSpace: "nowrap" };
  const td = { padding: "8px 10px", fontSize: 13, borderBottom: "1px solid var(--n150, #f1f5f9)" };

  return (
    <KartBolum title={baslik} icon="settings" testId="bagli-bilgisayarlar">
      <div style={{ fontSize: 13, marginBottom: 10 }} data-testid="sunucu-surumu">
        {version
          ? <>Bu bilgisayar (sunucu): <b>v{version}</b>. Bu sürümden eski istemciler işaretlenir.</>
          : "Bu bilgisayarın sürümü henüz okunmadı; karşılaştırma yapılmıyor."}
      </div>
      {kayitlar === null ? (
        <div style={{ fontSize: 13, color: "var(--n400, #94a3b8)" }}>Yükleniyor...</div>
      ) : satirlar.length === 0 ? (
        <BosDurum baslik="Kayıtlı istemci yok" metin={BOS_METNI} testId="bos-bagli-bilgisayarlar" />
      ) : (
        <>
          {/* Triyaj: bu bilgisayarın sürümü bilinmezken "hepsi güncel" denmez (karşılaştırma yapılmadı, şerit yok). */}
          {(guncellenmeli > 0 || karsilastirildi) && (
            <div style={{ marginBottom: 10 }}>
              {guncellenmeli
                ? <UyariSeridi aile="uyari" testId="surum-ozeti">{guncellenmeli} bilgisayar güncellenmeli: sürümü bu bilgisayardan eski ya da bilinmiyor.</UyariSeridi>
                : <UyariSeridi aile="basari" testId="surum-ozeti">Bütün istemciler bu bilgisayarın sürümünde ya da daha yenisinde.</UyariSeridi>}
            </div>
          )}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Kullanıcı</th><th style={th}>Son görülen sürüm</th><th style={th}>Son görülme</th><th style={th}>Son IP</th></tr></thead>
              <tbody>
                {satirlar.map(s => (
                  <tr key={s.kullanici} data-testid="bagli-bilgisayar" data-durum={s.durum} style={s.durum === "eski" ? { background: "var(--ambBg3, #fff7ed)" } : undefined}>
                    <td style={{ ...td, fontWeight: 600 }}>{s.kullanici}</td>
                    <td style={td}>
                      {s.surum ? `v${s.surum}` : <span style={{ color: "var(--n400, #94a3b8)" }}>bilinmiyor</span>}
                      {s.durum === "eski" && <span style={{ marginLeft: 8, fontSize: 11.5, fontWeight: 700, color: "var(--orTx, #c2410c)" }}>güncellenmeli</span>}
                    </td>
                    <td style={{ ...td, fontSize: 12, color: "var(--n500, #64748b)", whiteSpace: "nowrap" }}>{fmtTs(s.ts)}</td>
                    <td style={{ ...td, fontSize: 12, color: "var(--n500, #64748b)", fontFamily: "ui-monospace, monospace" }}>{s.ip || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {/* Spec 0112 R6/2: önerilen yol pencere cümlesinden önce okunur; R12: süzme yapılamadı ibaresi kendi kabında. */}
      <Ipucu>
        {TAZELIK_IBARESI} <span data-testid="kaldirma-ibaresi">{KALDIRMA_IBARESI}</span> {PENCERE_IBARESI}
        {adlar === OKUNAMADI && <span data-testid="suzme-yapilamadi" style={{ display: "block", marginTop: 4 }}>{SUZME_YAPILAMADI_IBARESI}</span>}
      </Ipucu>
    </KartBolum>
  );
}
