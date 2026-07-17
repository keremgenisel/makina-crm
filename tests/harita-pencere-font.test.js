// Ayrı Faaliyet Haritası penceresi App'i mount etmez; App'in kök div'i taban yazı tipini
// ayarladığı için harita penceresi onu alamaz ve serif'e (Times) düşüyordu. Tek çözüm:
// paylaşılan ui.css body'ye somut bir font koysun. Bu test o invaryantı korur — kural
// silinirse ya da inherit'e döndürülürse kırılır (harita penceresi yine serif'e düşer).
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const kok = dirname(dirname(fileURLToPath(import.meta.url)));
const css = readFileSync(join(kok, "src/ui.css"), "utf-8");

describe("ui.css taban yazı tipi", () => {
  it("body'ye somut bir font-family tanımlar (inherit değil)", () => {
    // body { ... font-family: <somut> ... }
    const m = css.match(/body\s*\{[^}]*font-family\s*:\s*([^;]+);/i);
    expect(m, "ui.css'te body font-family kuralı yok").toBeTruthy();
    const deger = m[1].trim().toLowerCase();
    expect(deger).not.toBe("inherit");
    expect(deger).toMatch(/sans-serif|-apple-system|segoe/);
  });
});
