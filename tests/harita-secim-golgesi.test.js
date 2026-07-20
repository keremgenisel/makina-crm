// Harita yer adları SVG <text>; harita üzerinde sürükle/tıkla yapınca tarayıcı bunları METİN
// olarak seçiyor ve arkalarında gri "seçim kutusu" çıkıyordu. .harita-svg user-select:none olmalı.
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const kok = dirname(dirname(fileURLToPath(import.meta.url)));
const css = readFileSync(join(kok, "src/ui.css"), "utf-8");

describe("harita metin seçimi (gri kutu)", () => {
  it(".harita-svg kuralı user-select: none taşır (seçim vurgusu çıkmasın)", () => {
    const kural = css.match(/\.harita-svg\s*\{[^}]*\}/);
    expect(kural, "ui.css'te .harita-svg kuralı yok").toBeTruthy();
    expect(kural[0]).toMatch(/user-select:\s*none/);
    expect(kural[0]).toMatch(/-webkit-user-select:\s*none/); // Safari/Electron için de
  });
});
