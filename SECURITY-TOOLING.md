# Güvenlik Araçları

Bu projede iki katmanlı otomatik güvenlik taraması kuruludur.

## 1. gitleaks — sır (secret) taraması

Amaç: `jwtSecret`, SMTP/mail parolası, JWT token, API anahtarı gibi sırların
yanlışlıkla depoya girmesini engellemek. Yapılandırma: `.gitleaks.toml`
(varsayılan kural seti + build/artefakt yolları için allowlist).

Üç yerde çalışır:
- **Commit öncesi (yerel):** `.git/hooks/pre-commit` — staged içerikte sır
  bulursa commit'i durdurur. Kurulum: `npm run hooks` (ayrıca `npm install`
  sonrası `prepare` ile otomatik). gitleaks kurulu değilse sessizce atlar.
- **CI:** `.github/workflows/gitleaks.yml` — her push/PR'de geçmiş + mevcut kod.
- **Elle tam tarama:** `npm run scan:secrets` (veya `gitleaks dir .`).

Kurulum (macOS, brew yoksa): binary `~/.local/bin/gitleaks` altına indirildi
(v8.30.1). Yeniden kurmak için gitleaks releases sayfasından ilgili
`gitleaks_<sürüm>_darwin_arm64.tar.gz` indirilip `~/.local/bin`'e konur.

Yanlış alarm olursa `.gitleaks.toml` içindeki `[allowlist]` bölümüne
yol/regex eklenir. Acil durumda `git commit --no-verify` hook'u atlar (dikkatli).

## 2. semgrep — statik güvenlik analizi (SAST)

Amaç: path traversal, zayıf kripto, injection, güvensiz Express/Node/React
kalıpları gibi kod desenlerini yakalamak.

Çalıştırma (semgrep `~/Library/Python/3.9/bin` altında kurulu, pip --user):

```sh
export PATH="$HOME/Library/Python/3.9/bin:$PATH"
semgrep --metrics=off \
  --config p/javascript --config p/nodejs --config p/react \
  --config p/security-audit --config p/secrets \
  --exclude node_modules --exclude dist --exclude release \
  electron src scripts
```

`--metrics=off` telemetriyi kapatır (güvenlik denetimlerinde şart). Yeniden
kurulum: `python3 -m pip install --user semgrep`.

## 3. Claude Code skill'leri (`.claude/skills/`)

Trail of Bits'in üç skill'i eklendi (CC BY-SA 4.0, bkz. `ATTRIBUTION.md`):
- **insecure-defaults** — fail-open güvensiz varsayılan (hardcoded sır, zayıf
  auth) tespiti; harici araç gerektirmez.
- **semgrep** — Semgrep taramasını yöneten skill (paralel, SARIF çıktısı).
- **sarif-parsing** — SARIF sonuçlarını ayrıştırma yardımcıları.

Bir Claude Code oturumunda `/insecure-defaults` veya `/semgrep` ile çağrılır.

## 4. Bağımlılık güvenliği (CVE taraması)

Amaç: kullanılan paketlerde bilinen güvenlik açıklarını yakalamak.

- **Elle:** `npm run audit` (high/critical seviyesinde çıkışta hata verir).
- **CI:** `.github/workflows/audit.yml` — her push/PR'de + haftalık `npm audit`.
  Haftalık çalışma, kod değişmese de yeni açıklanan CVE'leri yakalar.
- **Dependabot:** `.github/dependabot.yml` — npm ve GitHub Actions sürümleri için
  haftalık güncelleme PR'ları açar (küçük sürümler tek PR'da gruplanır).

**xlsx (SheetJS) — otomatik sürüm denetimi:** `xlsx` npm registry'de değil,
`package.json`'da bir CDN tarball URL'siyle pinlenmiştir (npm'deki paket terk edilmiş
ve CVE'li; CDN sürümü bakımlı olandır). Ne `npm audit` ne de Dependabot bunu görebilir.
Güvenlik yamaları yeni SheetJS sürümleriyle geldiğinden **güncel kalmak = yamalı kalmak**.
- **CI:** `.github/workflows/xlsx-version-check.yml` — haftalık, pinli sürümü SheetJS'in
  "latest" sürümüyle kıyaslar; geride kalınmışsa iş başarısız olur (Actions'ta kırmızı X).
- **Elle:** `node scripts/check-xlsx-version.cjs` (güncelse 0, geride ise çıkış kodu 2).
- **Yükseltme:** `package.json`'daki URL'i `xlsx-<yeni>/xlsx-<yeni>.tgz` yapın, sonra
  `npm install && npm test` ile içe/dışa aktarımı doğrulayın. Değişiklik notları:
  https://docs.sheetjs.com/docs/miscellany/changelog

## 5. Güncelleme bütünlüğü ve kod imzalama

**Bütünlük (aktif, ek iş gerekmez):** electron-updater indirilen kurulumun
**sha512** özetini GitHub Releases'e yüklenen `latest.yml` ile karşılaştırır
(HTTPS üzerinden). Bozuk/eksik indirme veya aktarım sırasında değişiklik reddedilir.

**Özgünlük (eksik, sertifika gerektirir):** `package.json` içinde
`build.win.verifyUpdateCodeSignature: false`, çünkü uygulama şu an **imzasız**.
İmzasızken bu değeri `true` yapmak güncellemeyi tamamen bozar (doğrulanacak imza
yoktur). GitHub hesabı/token'ı ele geçirilirse sahte bir güncelleme yayınlanabilir;
bunu kapatan tek şey Authenticode kod imzalamadır.

**İmzalamayı etkinleştirme (sertifika edinildikten sonra):**

1. Kod imzalama sertifikası edinin. İki pratik yol:
   - **Azure Trusted Signing** (aylık düşük ücret, iş doğrulaması gerekir) veya
   - geleneksel bir **OV/EV** kod imzalama sertifikası (CA'dan, token/HSM ile).
2. Geleneksel sertifika için electron-builder ortam değişkenlerini ayarlayın
   (config değişikliği gerekmez, electron-builder otomatik algılar):
   ```
   set CSC_LINK=C:\yol\sertifika.pfx
   set CSC_KEY_PASSWORD=...
   ```
   (Azure Trusted Signing için `build.win.azureSignOptions` eklenir.)
3. `npm run release` ile imzalı derleme alın.
4. İmzalama doğrulandıktan sonra `package.json` → `build.win`'de
   `verifyUpdateCodeSignature` değerini `true` yapın (veya satırı silin; varsayılan
   `true`'dur). Böylece istemci, güncellemenin aynı yayıncı tarafından imzalandığını
   doğrular.

**Bu arada (ücretsiz sertleştirme):** yayın kanalının özgünlüğü GitHub hesabına
dayandığı için hesapta 2FA açık tutun ve yayın için yalnızca ilgili depoya erişimi
olan dar kapsamlı (fine-grained) bir PAT kullanın.

