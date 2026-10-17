// Ekran metninde iç spec numarası yok: "Ortak gider, makina maliyeti hesabında (0002) makinalara dağıtılır." ve
// Makina Maliyeti Kovaları'nın alt başlığındaki "(0002)" ve borç özetinin dipnotundaki "(0003)" kullanıcının kafasını
// karıştırıyordu (TY, 2026-10-14). Tarama yorumları atar (// ve /* */); kalan kodda, yani ekrana basılabilecek metinde
// "(0002)" biçiminde spec numarası geçmemeli.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const KOK = path.resolve(__dirname, "../src/components");
const dosyalar = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? dosyalar(path.join(d, e.name)) : /\.jsx?$/.test(e.name) ? [path.join(d, e.name)] : []);
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map(l => l.replace(/(^|[^:"'`])\/\/.*$/, "$1")).join("\n");

describe("Ekran metinlerinde spec numarası", () => {
  it("bileşen kodunda (yorumlar hariç) \"(0002)\" biçiminde spec numarası yok", () => {
    const bulunan = dosyalar(KOK).filter(f => /\(\s*0\d{3}\s*\)/.test(yorumsuz(fs.readFileSync(f, "utf8")))).map(f => path.relative(KOK, f));
    expect(bulunan).toEqual([]);
  });
  // Spec 0090 ile (R38): atama alanı ve kovalar kutusu silindi; iki metni de kaynakta yok (spec numarası taşıyamazlar).
  it("üç metin spec numarasız hâliyle duruyor (spec 0090 ile ikisi bileşenleriyle kalktı)", () => {
    expect(fs.readFileSync(path.join(KOK, "gider/GiderAlanlari.jsx"), "utf8")).not.toContain("Ortak gider, makina maliyeti hesabında makinalara dağıtılır.");
    expect(fs.readFileSync(path.join(KOK, "gider/DonemRaporu.jsx"), "utf8")).not.toContain("Makina maliyeti hesabının girdisi. Her tutar tek kovadadır;");
    expect(fs.readFileSync(path.join(KOK, "gider/DonemRaporu.jsx"), "utf8")).toContain("“Vadesi geçti” yalnız görsel işarettir; ödeme hatırlatması Anasayfa'daki Gider Ödemeleri kartındadır.");
  });
});
