// @vitest-environment jsdom
// Spec 0045 B: pencere alt düğme satırında boşluk kabın kendisinden gelir (R10–R13). Altı form (sarmalayıcısız) ile
// sarmalayıcılı formların gerçek bileşenleri.
import { describe, it, expect, vi, afterEach } from "vitest";
import { useState } from "react";
import { readFileSync } from "node:fs";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { Modal, Btn } from "../../src/components/ui";
import { GiderForm } from "../../src/components/GiderForm";
import { Tedarikciler } from "../../src/components/gider/Tedarikciler";
import { UretimPartileri } from "../../src/components/gider/UretimPartileri";
import { GiderTurManager } from "../../src/components/settings/GiderTurManager";
import { SettingsGiderTanimlari } from "../../src/components/settings/SettingsGiderTanimlari";
import { ServiceForm } from "../../src/components/ServiceForm";
import { regexKacis } from "../yardimci/regexKacis.js";

afterEach(cleanup);

// Birincil düğmeden alt kaba çık: kabın doğrudan çocukları ve boşluğu.
const altKap = (birincil) => {
  let el = birincil.closest("button");
  while (el && el.parentElement && el.parentElement.style.borderTop === "") el = el.parentElement;
  return el.parentElement;
};
const dugmeMetinleri = (kap) => [...kap.querySelectorAll("button")].map(b => b.textContent.trim());

describe("Spec 0045: Modal alt kabı", () => {
  it("AC-17 / R11: kabın kendisi 8 piksel boşluk verir; tek düğmeli pencerede tek çocuk", () => {
    render(<Modal title="T" onClose={vi.fn()} footer={<Btn>Kapat</Btn>}>gövde</Modal>);
    const kap = altKap(screen.getByText("Kapat"));
    expect(kap.style.gap).toBe("8px");
    expect(kap.children).toHaveLength(1);
  });
});

const TURLER = [{ id: 4, ad: "Hammadde", davranis: "normal" }];
function TurH() {
  const [giderTurleri, setGiderTurleri] = useState(TURLER);
  return <GiderTurManager giderTurleri={giderTurleri} setGiderTurleri={setGiderTurleri} giderler={[]} setGiderler={vi.fn()} giderTanimlari={[]} setGiderTanimlari={vi.fn()} showToast={vi.fn()} />;
}
// Sarmalayıcısız altı formdan beşinin penceresi; açılış adımı ve birincil düğmenin metni.
const PENCERELER = [
  ["GiderForm", () => render(<GiderForm giderTurleri={TURLER} tedarikciler={[]} calisanlar={[]} modeller={[]} stock={[]} customers={[]} giderAyarlari={{}} onSave={vi.fn()} onCancel={vi.fn()} />), "İptal", "Kaydet"],
  ["SettingsGiderTanimlari", () => { render(<SettingsGiderTanimlari giderTanimlari={[]} setGiderTanimlari={vi.fn()} giderTurleri={TURLER} calisanlar={[]} showToast={vi.fn()} />); fireEvent.click(screen.getByText("Yeni Tanım")); }, "İptal", "Kaydet"],
  ["GiderTurManager", () => { render(<TurH />); fireEvent.click(screen.getAllByTitle("Düzenle")[0]); }, "İptal", "Kaydet"],
  ["Tedarikciler", () => { render(<Tedarikciler tedarikciler={[]} setTedarikciler={vi.fn()} giderler={[]} giderTanimlari={[]} showToast={vi.fn()} />); fireEvent.click(screen.getByText("Yeni Tedarikçi")); }, "İptal", "Kaydet"],
  // Spec 0082 C7 (2): beşinci pencere silinen standart gider ekranının yerine Üretim Partisi penceresi (aynı sınıf, İptal + Kaydet).
  ["UretimPartileri", () => { render(<UretimPartileri uretimPartileri={[]} setUretimPartileri={vi.fn()} stock={[]} customers={[]} showToast={vi.fn()} canDo={() => true} />); fireEvent.click(screen.getByText("Yeni Üretim Partisi")); }, "İptal", "Kaydet"],
];
const birincil = (metin) => screen.getAllByText(metin).map(e => e.closest("button")).filter(Boolean).pop();

describe("Spec 0045: form pencerelerinde düğme boşluğu", () => {
  it("spec 0082 AC-32: beş pencere kalır; silinen standart gider penceresinin yerinde Üretim Partisi penceresi", () => {
    expect(PENCERELER.map(p => p[0])).toEqual(["GiderForm", "SettingsGiderTanimlari", "GiderTurManager", "Tedarikciler", "UretimPartileri"]);
  });
  it.each(PENCERELER)("AC-13 / AC-14 / AC-16: %s alt satırında boşluk var, ikincil solda birincil en sağda", (ad, ac, ikincil, bir) => {
    ac();
    const kap = altKap(birincil(bir));
    expect(kap.style.gap).toBe("8px");
    const metinler = dugmeMetinleri(kap);
    expect(metinler[0]).toBe(ikincil);
    expect(metinler[metinler.length - 1]).toMatch(new RegExp(regexKacis(bir)));
    expect(kap.style.justifyContent).toBe("flex-end");
  });
  it("AC-14: kullanıcı yönetiminin 2FA sıfırlama penceresi düğmelerini parçayla (sarmalayıcısız) Modal'a verir; boşluğu kaptan alır", () => {
    const k = readFileSync("src/components/settings/UserManager.jsx", "utf8");
    expect(k).toMatch(/<Modal title="İki adımlı doğrulamayı sıfırla"[\s\S]{0,120}footer=\{<>\s*<Btn variant="ghost"[^>]*>Vazgeç<\/Btn>\s*<Btn variant="danger"/);
  });
  it("AC-15: sarmalayıcılı formda (servis formu) kabın tek çocuğu var, boşluk iki katına çıkmaz", () => {
    render(<ServiceForm title="Servis" form={{ customerId: 1, type: "Periyodik Bakım", repairPlace: "Yerinde Onarım", degisenParcalar: [], currency: "TRY", date: "2026-09-10" }}
      setForm={vi.fn()} customers={[{ id: 1, name: "X" }]} onSave={vi.fn()} onCancel={vi.fn()} />);
    const sarmalayici = birincil("Kaydet").parentElement;
    const kap = altKap(birincil("Kaydet"));
    expect(kap.children).toHaveLength(1);
    expect(kap.firstElementChild).toBe(sarmalayici);
    expect(within(kap).getAllByRole("button").map(b => b.textContent.trim())).toEqual(["İptal", "Kaydet"]);
  });
});
