#!/usr/bin/env node
// Yerel git pre-commit hook'unu kurar: her commit öncesi gitleaks ile staged
// içerikte sır (secret) taraması yapar. Idempotent'tir; `npm install` sonrası
// (prepare) ve elle `npm run hooks` ile çalıştırılabilir. Hiçbir durumda
// hata fırlatmaz — gitleaks veya .git yoksa sessizce atlar, böylece kurulum
// veya commit sürecini bozmaz (CI zaten ikinci savunma hattıdır).
const fs = require("fs");
const path = require("path");

function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const hooksDir = path.join(repoRoot, ".git", "hooks");
  // .git yoksa (ör. fork henüz git init edilmemişse) sessizce çık
  if (!fs.existsSync(path.join(repoRoot, ".git"))) {
    console.log("[hooks] .git bulunamadı, pre-commit hook atlandı.");
    return;
  }
  if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

  const hookPath = path.join(hooksDir, "pre-commit");
  const script = `#!/bin/sh
# OTOMATİK ÜRETİLDİ — scripts/install-git-hooks.cjs
# Commit öncesi gitleaks ile staged içerikte sır taraması.
# gitleaks kurulu değilse sessizce geçer (CI yine tarar).

# gitleaks'i PATH'te veya ~/.local/bin'de ara
GITLEAKS=""
if command -v gitleaks >/dev/null 2>&1; then
  GITLEAKS="gitleaks"
elif [ -x "$HOME/.local/bin/gitleaks" ]; then
  GITLEAKS="$HOME/.local/bin/gitleaks"
fi

if [ -z "$GITLEAKS" ]; then
  echo "[gitleaks] kurulu değil, sır taraması atlandı (bkz. scripts/install-git-hooks.cjs)."
  exit 0
fi

"$GITLEAKS" git --staged --no-banner --redact --config .gitleaks.toml
STATUS=$?
if [ $STATUS -ne 0 ]; then
  echo ""
  echo "  Commit engellendi: staged değişikliklerde olası bir sır bulundu."
  echo "  Yanlış alarmsa .gitleaks.toml allowlist'ine ekleyin veya"
  echo "  'git commit --no-verify' ile atlayın (dikkatli olun)."
  exit 1
fi
exit 0
`;
  fs.writeFileSync(hookPath, script, { mode: 0o755 });
  fs.chmodSync(hookPath, 0o755);
  console.log("[hooks] pre-commit gitleaks hook kuruldu:", path.relative(repoRoot, hookPath));
}

try {
  main();
} catch (e) {
  // Kurulumu asla bozma
  console.log("[hooks] hook kurulumu atlandı:", e && e.message);
}
