// @vitest-environment jsdom
// Güvenlik Durumu paneli: disk şifreleme, uygulama kilidi, yedek şifreleme ve (sunucu/istemci
// modunda) 2FA durumunu bir kontrol listesi olarak gösterir. Her madde ok/warn/unknown durumuna
// göre "Güvenli/Önerilir/Bilinmiyor" etiketi taşır. Yerel modda 2FA maddesi hiç çıkmaz.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, within, cleanup, waitFor, fireEvent } from "@testing-library/react";

afterEach(() => { cleanup(); delete window.appSecurity; delete window.appLock; delete window.crmStorage; delete window.appServer; });
import { SettingsSecurityStatus } from "../../src/components/settings/SettingsSecurityStatus";

function mockBridges({ disk, lock, backup, mode, tfa, tlsOn, dbEnc } = {}) {
  window.appSecurity = {
    diskEncryption: vi.fn(async () => disk ?? { state: "unknown", platform: "win32" }),
    dbEncryption: vi.fn(async () => dbEnc ?? { encrypted: false, canEncrypt: true }),
  };
  window.appLock = { status: vi.fn(async () => lock ?? { enabled: false }) };
  window.crmStorage = { autoBackupPasswordStatus: vi.fn(async () => backup ?? { set: false, canEncrypt: true }) };
  // getConfig gerçek şekli: sunucu → {isServer:true, fp?}, istemci → {serverUrl,isActive,tls?,fp?}, yerel → {isActive:false}
  const cfg = mode === "server" ? { isServer: true, ...(tlsOn ? { fp: "A1:B2:C3" } : {}) }
    : mode === "client" ? { serverUrl: "http://x:3000", isActive: true, ...(tlsOn ? { tls: true, fp: "A1:B2:C3" } : {}) }
    : { isActive: false };
  window.appServer = {
    getConfig: vi.fn(async () => cfg),
    apiRequest: vi.fn(async () => ({ ok: true, data: tfa ?? { enabled: false } })),
  };
}

describe("SettingsSecurityStatus", () => {
  it("yerel modda maddeleri durumlarıyla gösterir, 2FA 'uygulanmaz' bilgisiyle çıkar", async () => {
    mockBridges({ disk: { state: "off", platform: "win32" }, lock: { enabled: true }, backup: { set: false, canEncrypt: true }, dbEnc: { encrypted: true, canEncrypt: true } });
    render(<SettingsSecurityStatus />);
    await waitFor(() => expect(screen.getByText("Disk şifreleme")).toBeTruthy());

    // Veritabanı şifreleme açık → "Açık · Güvenli"
    const dbenc = screen.getByText("Veritabanı şifreleme").closest("div").parentElement;
    expect(within(dbenc).getByText(/Açık · Güvenli/)).toBeTruthy();
    // Disk kapalı → "Kapalı · Önerilir"
    const disk = screen.getByText("Disk şifreleme").closest("div").parentElement;
    expect(within(disk).getByText(/Kapalı · Önerilir/)).toBeTruthy();
    // Uygulama kilidi açık → "Açık · Güvenli"
    const lock = screen.getByText("Uygulama kilidi").closest("div").parentElement;
    expect(within(lock).getByText(/Açık · Güvenli/)).toBeTruthy();
    // Yedek şifreleme kapalı
    expect(screen.getByText("Otomatik yedek şifreleme")).toBeTruthy();
    // 2FA yerel modda "uygulanmaz" bilgi satırı olarak görünür (güvenli sayılmaz)
    const tfa = screen.getByText("İki adımlı doğrulama (2FA)").closest("div").parentElement;
    expect(within(tfa).getByText(/Yerel modda uygulanmaz/)).toBeTruthy();
    // Özet: 5 maddeden 2'si güvenli (db + kilit); 2FA info nötr sayılır
    expect(screen.getByText(/2 \/ 5 güvenli/)).toBeTruthy();
  });

  it("sunucu modunda veritabanı, 2FA ve TLS maddesi de görünür", async () => {
    mockBridges({ disk: { state: "on", platform: "darwin" }, lock: { enabled: true }, backup: { set: true, canEncrypt: true }, mode: "server", tfa: { enabled: true }, tlsOn: true, dbEnc: { encrypted: true, canEncrypt: true } });
    render(<SettingsSecurityStatus />);
    await waitFor(() => expect(screen.getByText("İki adımlı doğrulama (2FA)")).toBeTruthy());
    const tfa = screen.getByText("İki adımlı doğrulama (2FA)").closest("div").parentElement;
    expect(within(tfa).getByText(/Açık · Güvenli/)).toBeTruthy();
    // Veritabanı şifreleme açık
    const dbenc = screen.getByText("Veritabanı şifreleme").closest("div").parentElement;
    expect(within(dbenc).getByText(/Açık · Güvenli/)).toBeTruthy();
    // TLS açık (sunucu sertifikası var)
    const tls = screen.getByText("Taşıma şifreleme (TLS)").closest("div").parentElement;
    expect(within(tls).getByText(/Açık · Güvenli/)).toBeTruthy();
    // 6 madde hepsi güvenli: veritabanı, disk, uygulama kilidi, yedek, TLS, 2FA
    expect(screen.getByText(/6 \/ 6 güvenli/)).toBeTruthy();
  });

  it("istemci modunda uygulama kilidi, TLS ve 2FA gösterilir (disk ve yedek gizli)", async () => {
    mockBridges({ disk: { state: "on", platform: "win32" }, lock: { enabled: true }, mode: "client", tfa: { enabled: false } });
    render(<SettingsSecurityStatus />);
    await waitFor(() => expect(screen.getByText("İki adımlı doğrulama (2FA)")).toBeTruthy());
    expect(screen.getByText("Uygulama kilidi")).toBeTruthy();
    // Veritabanı, disk ve yedek istemcide gizli: veri ve yedekler sunucuda tutulur
    expect(screen.queryByText("Veritabanı şifreleme")).toBeNull();
    expect(screen.queryByText("Disk şifreleme")).toBeNull();
    expect(screen.queryByText("Otomatik yedek şifreleme")).toBeNull();
    // TLS pin yok → şifresiz (uyarı)
    const tls = screen.getByText("Taşıma şifreleme (TLS)").closest("div").parentElement;
    expect(within(tls).getByText(/Kapalı · Önerilir/)).toBeTruthy();
    // 3 madde: uygulama kilidi (güvenli) + TLS (kapalı) + 2FA (kapalı) → 1/3 güvenli
    expect(screen.getByText(/1 \/ 3 güvenli/)).toBeTruthy();
  });

  it("Güvenlik Önerileri katlanır: varsayılan kapalı, açınca 5 öneri görünür", async () => {
    mockBridges({});
    render(<SettingsSecurityStatus />);
    await waitFor(() => expect(screen.getByText("Uygulama kilidi")).toBeTruthy());
    // Başlık var, öneriler kapalı (madde metni görünmez)
    const toggle = screen.getByText("Güvenlik Önerileri");
    expect(screen.queryByText("Disk şifrelemesini açın")).toBeNull();
    fireEvent.click(toggle);
    // Açılınca 5 öneri başlığı görünür + Mac referansı yok
    expect(screen.getByText("Disk şifrelemesini açın")).toBeTruthy();
    expect(screen.getByText("Sunucuyu güvenli bir ağda tutun")).toBeTruthy();
    expect(screen.getByText("Yedeklere her zaman parola koyun")).toBeTruthy();
    expect(screen.getByText("Güçlü parola ve PIN kullanın")).toBeTruthy();
    expect(screen.getByText("Sunucuyu doğrudan internete açmayın")).toBeTruthy();
    expect(screen.getByText("EN YÜKSEK ETKİ")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/FileVault|Mac/);
  });

  it("safeStorage yoksa veritabanı şifreleme nötr değil UYARI olarak gösterilir", async () => {
    mockBridges({ dbEnc: { encrypted: false, canEncrypt: false } });
    render(<SettingsSecurityStatus />);
    await waitFor(() => expect(screen.getByText("Veritabanı şifreleme")).toBeTruthy());
    const dbenc = screen.getByText("Veritabanı şifreleme").closest("div").parentElement;
    // Eskiden "Kullanılamıyor · Bilinmiyor" (nötr) idi; artık "Korunmasız · Önerilir" (uyarı)
    expect(within(dbenc).getByText(/Korunmasız · Önerilir/)).toBeTruthy();
    // Açıklama oturum anahtarının (jwtSecret) ve DB'nin şifresiz olduğunu belirtmeli
    expect(within(dbenc).getByText(/jwtSecret/)).toBeTruthy();
  });

  it("safeStorage yoksa otomatik yedek şifreleme de UYARI olarak gösterilir", async () => {
    mockBridges({ backup: { set: false, canEncrypt: false } });
    render(<SettingsSecurityStatus />);
    await waitFor(() => expect(screen.getByText("Otomatik yedek şifreleme")).toBeTruthy());
    const bkp = screen.getByText("Otomatik yedek şifreleme").closest("div").parentElement;
    expect(within(bkp).getByText(/Korunmasız · Önerilir/)).toBeTruthy();
  });

  it("disk durumu okunamazsa 'Bilinmiyor' gösterir", async () => {
    mockBridges({ disk: { state: "unknown", platform: "win32" } });
    render(<SettingsSecurityStatus />);
    await waitFor(() => expect(screen.getByText("Disk şifreleme")).toBeTruthy());
    const disk = screen.getByText("Disk şifreleme").closest("div").parentElement;
    expect(within(disk).getByText(/Bilinmiyor · Bilinmiyor/)).toBeTruthy();
  });
});
