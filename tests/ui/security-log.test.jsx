// @vitest-environment jsdom
// Kullanıcı Geçmişi paneli: yerel modda window.securityLog üzerinden kayıtları yükleyip
// eylem etiketleriyle gösterir; boş sonuçta "Kayıt bulunamadı" yazar.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, within, cleanup, waitFor, fireEvent } from "@testing-library/react";

afterEach(() => { cleanup(); delete window.securityLog; });
import { SettingsSecurityLog } from "../../src/components/settings/SettingsSecurityLog";

const ORNEK = [
  { id: 3, ts: "2026-07-10T09:00:00Z", actor: "admin", action: "giris_basarili", target: null, ip: "192.168.1.5", detail: JSON.stringify({ rol: "admin" }) },
  { id: 2, ts: "2026-07-10T08:00:00Z", actor: "deneme", action: "giris_basarisiz", target: null, ip: "192.168.1.9", detail: JSON.stringify({ sebep: "Yanlış şifre" }) },
  { id: 1, ts: "2026-07-10T07:00:00Z", actor: "admin", action: "kullanici_eklendi", target: "mehmet", ip: "192.168.1.5", detail: null },
];

describe("SettingsSecurityLog", () => {
  beforeEach(() => {
    window.securityLog = { get: vi.fn(async () => ({ ok: true, rows: ORNEK, total: 3 })), clear: vi.fn(async () => ({ ok: true, deleted: 3 })) };
  });

  it("yerel modda kayıtları eylem etiketleriyle gösterir", async () => {
    render(<SettingsSecurityLog serverPermissions={null} flash={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("table")).toBeTruthy());
    const tablo = within(screen.getByRole("table"));
    // Eylem etiketleri hem tabloda hem filtre dropdown'unda geçtiği için tabloyla sınırla
    expect(tablo.getByText("Giriş Başarılı")).toBeTruthy();
    expect(tablo.getByText("Giriş Başarısız")).toBeTruthy();
    expect(tablo.getByText("Kullanıcı Eklendi")).toBeTruthy();
    expect(tablo.getByText("mehmet")).toBeTruthy();       // hedef sütunu
    expect(tablo.getByText("192.168.1.9")).toBeTruthy();  // IP sütunu
    expect(window.securityLog.get).toHaveBeenCalled();
  });

  it("boş sonuçta 'Kayıt bulunamadı' gösterir", async () => {
    window.securityLog.get = vi.fn(async () => ({ ok: true, rows: [], total: 0 }));
    render(<SettingsSecurityLog serverPermissions={null} flash={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Kayıt bulunamadı.")).toBeTruthy());
  });

  it("eylem türü filtresi seçilince get'e action parametresi geçer", async () => {
    render(<SettingsSecurityLog serverPermissions={null} flash={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Giriş Başarılı")).toBeTruthy());
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "giris_basarisiz" } });
    fireEvent.click(screen.getByText("Ara"));
    await waitFor(() => expect(window.securityLog.get).toHaveBeenLastCalledWith(expect.objectContaining({ action: "giris_basarisiz" })));
  });
});
