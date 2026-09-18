// @vitest-environment jsdom
// İşlem Geçmişi "CSV İndir" ekrandaki sayfayı DEĞİL, filtreye uyan TÜM kayıtları dışa aktarmalı.
// Hata: eskiden yalnız görünen `rows` (PER_PAGE=10) iniyordu → müşteriden alınan geçmiş hep 10 satırla kesikti.
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

afterEach(cleanup);
import { SettingsAuditLog } from "../../src/components/settings/SettingsAuditLog";

const TOPLAM = 25; // ekranda 10 görünür, dışa aktarımda 25'i de olmalı
const tumKayitlar = Array.from({ length: TOPLAM }, (_, i) => ({
  ts: `2026-07-${String((i % 28) + 1).padStart(2, "0")}T10:00:00.000Z`, username: "admin", role: "admin",
  action: "duzenlendi", entity: "musteri", entity_id: 1000 + i, entity_name: `Firma ${i}`, detail: "",
}));

describe("SettingsAuditLog — CSV İndir tüm kayıtları aktarır", () => {
  it("dışa aktarma büyük limitle çekilir ve CSV, ekrandaki 10 satırı değil tüm kayıtları içerir", async () => {
    const cagrilar = [];
    // Yerel IPC modu: sayfa isteği limit=10 ile gelir, dışa aktarma ise büyük limitle gelmeli.
    window.auditLog = {
      get: vi.fn(async (req) => {
        cagrilar.push(req);
        const off = req.offset || 0;
        return { ok: true, rows: tumKayitlar.slice(off, off + req.limit), total: TOPLAM };
      }),
    };
    // Blob → metin (jsdom'da Blob.text olmayabilir; FileReader güvenilir) ve <a>.click'i etkisizleştir
    let sonCsv = "";
    const createVardi = "createObjectURL" in URL;
    const origCreate = URL.createObjectURL;
    URL.createObjectURL = vi.fn((blob) => {
      const fr = new FileReader();
      fr.onload = () => { sonCsv = String(fr.result || ""); };
      fr.readAsText(blob);
      return "blob:test";
    });
    const origClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = vi.fn();
    try {
      render(<SettingsAuditLog serverPermissions={null} />);
      // Sayfa yüklendi: ilk 10 kayıt ekranda, 25. kayıt ekranda DEĞİL
      await waitFor(() => expect(screen.getAllByText(/Firma 0\b/).length).toBeGreaterThan(0));
      expect(screen.queryAllByText(/Firma 24\b/).length).toBe(0);
      const sayfaIstegi = cagrilar.find(r => r.limit === 10);
      expect(sayfaIstegi).toBeTruthy(); // sayfa isteği hâlâ 10'la

      fireEvent.click(screen.getByText("CSV İndir"));

      // Dışa aktarma: filtreye uyan TÜMÜ (limit >= toplam, offset 0)
      await waitFor(() => expect(cagrilar.some(r => r.limit >= TOPLAM && (r.offset || 0) === 0)).toBe(true));
      // CSV içeriği: başlık + 25 satır; 25. kayıt da var
      await waitFor(() => expect(sonCsv).toContain("Firma 24"));
      expect(sonCsv).toContain("Firma 0");
      expect(sonCsv.split("\n").length).toBe(TOPLAM + 1);
    } finally {
      if (createVardi) URL.createObjectURL = origCreate; else delete URL.createObjectURL;
      HTMLAnchorElement.prototype.click = origClick;
      delete window.auditLog;
    }
  });
});
