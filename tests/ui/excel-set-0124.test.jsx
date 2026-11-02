// @vitest-environment jsdom
// Spec 0124: İçe Aktar ekranı. Sütun kutusu başlık dizisinden ve biçim satırı (R10/2), içeriği yazılan parça sayısının önizleme
// ve kaydetme bildiriminde aynı rakam olması (R10). Dosya `buildCSV` ile yazılır ve ekranın kendi CSV okuyucusundan geçer (C7).
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { useState } from "react";
import { SettingsImport } from "../../src/components/settings/SettingsImport";
import { buildCSV } from "../../src/components/settings/csvUtils";
import { PARCA_AKTARMA_BASLIKLARI } from "../../src/lib/parcaAktarma";
import { SET_ICERIGI_BASLIGI, SET_ICERIGI_BICIMI, icerikYazilacakMetni, icerikYazildiMetni } from "../../src/lib/urunAgaci";

afterEach(cleanup);
const noop = () => {};
const PARTS = [{ id: 1, ad: "Rulman", maliyet: 100 }, { id: 2, ad: "Pul", maliyet: 2 }, { id: 3, ad: "Kayış", maliyet: 30 }];
let durum;
function Kap({ flash }) {
  const [parts, setParts] = useState(structuredClone(PARTS));
  durum = { parts };
  return <SettingsImport customers={[]} setCustomers={noop} setServices={noop} flash={flash} parts={parts} setParts={setParts}
    partTypeDefs={[{ id: "t1", ad: "Standart" }, { id: "t2", ad: "Bant" }]} setPartTypeDefs={noop} />;
}
const satir = (ad, icerik = "") => [ad, "", "", "", "", "", "", "", "", "", icerik];
const yukle = (rows) => {
  const dosya = new File([buildCSV([PARCA_AKTARMA_BASLIKLARI, ...rows])], "parcalar.csv", { type: "text/csv" });
  const girdi = document.querySelectorAll('input[type="file"]')[1];
  fireEvent.change(girdi, { target: { files: [dosya] } });
};

describe("Spec 0124: İçe Aktar ekranı", () => {
  it("AC-21: sütun kutusu başlık dizisinden (on bir sütun, Tip tanımlı tiplerle); biçim satırı sabitten", () => {
    render(<Kap flash={noop} />);
    expect(screen.getByTestId("parca-sutunlari").textContent).toBe(
      PARCA_AKTARMA_BASLIKLARI.map(h => (h === "Tip" ? "Tip (Standart/Bant)" : h)).join(" · "));
    expect(screen.getByTestId("parca-sutunlari").textContent).toContain("Maliyet (TL, KDV hariç) · Set İçeriği");
    expect(screen.getByTestId("set-icerigi-bicimi").textContent).toBe(`${SET_ICERIGI_BASLIGI}: ${SET_ICERIGI_BICIMI}`);
  });
  it("AC-11 / AC-20 / C7: içeriği yazılan sayı önizlemede ve kaydetme bildiriminde aynı; hücre içi ';' bütün kalır", async () => {
    const flash = vi.fn();
    render(<Kap flash={flash} />);
    yukle([satir("Kayış", "Rulman x 2; Pul x 4"), satir("Yeni Set", "Rulman; Pul x 1"), satir("Pul", "Pul x 1"), satir("Rulman")]);
    expect((await screen.findByTestId("icerik-yazilacak")).textContent.trim()).toBe(icerikYazilacakMetni(2));
    fireEvent.click(screen.getByRole("button", { name: /İçe Aktar \(4 kayıt\)/ }));
    await waitFor(() => expect(flash).toHaveBeenCalled());
    expect(flash).toHaveBeenLastCalledWith("ok", `1 yeni parça eklendi, 3 parça güncellendi.${icerikYazildiMetni(2)}`);
    expect(durum.parts.find(p => p.ad === "Kayış").setIcerigi).toEqual([{ partId: 1, miktar: 2 }, { partId: 2, miktar: 4 }]);
    expect(durum.parts.find(p => p.ad === "Yeni Set").setIcerigi).toEqual([{ partId: 1, miktar: 1 }, { partId: 2, miktar: 1 }]);
  });
  it("AC-20: içerik yazılmayan dosyada sayı hiç yazılmaz, bildirim bugünkü metin", async () => {
    const flash = vi.fn();
    render(<Kap flash={flash} />);
    yukle([satir("Rulman"), satir("Pul", "Yok x 1")]);
    await screen.findByText(/kayıt bulundu/);
    expect(screen.queryByTestId("icerik-yazilacak")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /İçe Aktar \(2 kayıt\)/ }));
    await waitFor(() => expect(flash).toHaveBeenCalled());
    expect(flash).toHaveBeenLastCalledWith("ok", "0 yeni parça eklendi, 2 parça güncellendi.");
  });
});
