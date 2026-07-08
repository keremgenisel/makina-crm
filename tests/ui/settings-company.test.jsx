// @vitest-environment jsdom
// Regresyon: "web sitesi kaydetmiyor" sınıfı hatalar — SettingsCompany'nin Kaydet'i
// formdaki TÜM alanları setFactory'ye taşımalı (alan listesi elle sayıldığı için
// yeni alan eklenince unutulmaya açık).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, screen, cleanup } from "@testing-library/react";

afterEach(cleanup);
import { SettingsCompany } from "../../src/components/settings/SettingsCompany";

const factory = {
  name: "Altuntaş", evrakFirmaAdi: "Altuntaş Makina Sanayi", contact: "Yetkili",
  phone: "0212 000 00 00", email: "info@altunmak.com", web: "www.altunmak.com",
  adres: "Adres", country: "Türkiye", city: "İstanbul", gtipNo: "8438",
};

describe("SettingsCompany kaydet", () => {
  it("düzenlenen her alan setFactory'ye ulaşır (web dahil)", () => {
    let sonuc = null;
    const setFactory = vi.fn((updater) => { sonuc = updater(factory); });
    render(<SettingsCompany factory={factory} setFactory={setFactory} appSettings={{}} setAppSettings={() => {}} flash={() => {}} />);

    const alanlar = {
      "Evrak'ta Görünen Firma Adı": "Yeni Ad",
      "Telefon": "0532 111 11 11",
      "E-posta": "yeni@firma.com",
      "Web Sitesi": "www.yeni.com",
    };
    for (const [label, deger] of Object.entries(alanlar)) {
      fireEvent.change(screen.getByLabelText(label), { target: { value: deger } });
    }
    fireEvent.click(screen.getByText("Kaydet"));

    expect(setFactory).toHaveBeenCalled();
    expect(sonuc.evrakFirmaAdi).toBe("Yeni Ad");
    expect(sonuc.phone).toBe("0532 111 11 11");
    expect(sonuc.email).toBe("yeni@firma.com");
    expect(sonuc.web).toBe("www.yeni.com");
    // Dokunulmayan alanlar da korunur
    expect(sonuc.country).toBe("Türkiye");
    expect(sonuc.gtipNo).toBe("8438");
  });
});
