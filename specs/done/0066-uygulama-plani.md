# 0066 Uygulama Planı: Kasa İşlemleri İzin Ekranında Giderden Ayrılsın

| | |
|---|---|
| **Bağlı spec** | `specs/done/0066-kasa-izinleri-giderden-ayrilsin.md` (R2, plan onayıyla) |
| **Dal** | `feat/0066-kasa-izin` (`feat/0062-sayfalama` kapanışından sonra) |
| **Onay** | Takım Yöneticisi, 2026-10-02: bütün öneriler (Q1–Q7) kabul |

## 1. Kodda bulunanlar (spec'e ek)

- `KASA_EYLEM_IDLERI` (`serverPermissionDefs.js:27`) ayrım için hazır; Servis Panosu ayrımı `servisPano: true`
  bayrağıyla (`UserManager.jsx:176`), CLAUDE.md'nin "grup adına göre" cümlesi eskimiş.
- Kayıt yolu `giderActions` dizisini yeniden kurmuyor (`UserManager.jsx:117`), değiştirmeden kaydetme diziyi korur.
- İpucu yalnız kutular çizilirken görünüyor (grup başlığının altında).
- `server-permission-defs.test.js` gider grup adlarını sabitlemiyor (R19).

## 2. Dosyalar

- `src/components/settings/serverPermissionDefs.js`: grup adı "Hesaplar ve hareketler", `kasaGrubuMu`,
  `GIDER_AKORDEON_GRUPLARI`, `KASA_AKORDEON_GRUPLARI`, `GIDER_KASA_ORTAK_NOT`, iki varsayılan metni.
- `src/components/settings/UserManager.jsx`: Kasa akordeonu (gider'in arkasında, ortak üç durum), ipucu Kasa'da ve
  `gorunurSekmeler` ile, ortak not, metinler.
- Testler: `tests/server-permission-defs.test.js` (ayrım, grup adları, etiket/kimlik fikstürü),
  `tests/ui/kasa-izin-akordeonu-0066.test.jsx` (yeni), `tests/ui/kasa-sekme-izni.test.jsx` (akordeon adı).
- `scripts/evidence/0009-sayfa.jsx` (`kullanici-izin-kasa-ipucu` adımları, yeni `kullanici-izin-kasa-0066`),
  `docs/evidence/0066-*`, `CLAUDE.md`.

`serverAuth.cjs`, `permissions.js`, veritabanı ve sunucu değişmez.

## 3. Kararlar

Q1 → R15 · Q2 → R16 · Q3 → R17 · Q4 → R18 · Q5 → R19 · Q6 → R20 · Q7 → R21.

## 4. Adım sırası

1. Tanım katmanı ve `server-permission-defs` testleri. 2. UserManager. 3. UI testleri, kaynak taramaları,
`kasa-sekme-izni` güncellemesi. 4. Electron dışı takım, lint, `server-security` (Electron), `serverAuth.cjs` diff'i.
5. Kanıt, TY onayı, CLAUDE.md.

## 5. Kriter ↔ test eşlemesi

`D` = `tests/server-permission-defs.test.js`, `U` = `tests/ui/kasa-izin-akordeonu-0066.test.jsx`,
`K` = `tests/ui/kasa-sekme-izni.test.jsx`.

| AC | Test |
|---|---|
| AC-1, AC-2 | U: "Kasa işlemleri" akordeonu; "Hesaplar ve hareketler" altında üç kutu |
| AC-3, AC-18 | U: Gider akordeonunda kasa kutusu ve ipucu yok |
| AC-4, AC-19 | U: akordeon başlıklarının DOM sırası |
| AC-5 | U: iki akordeondan birer kutu; PATCH `giderActions` ikisini de içerir |
| AC-5b | U: Kasa'dan özelleştir açılır → iki akordeonda bütün kimlikler; kapatılır → `giderActions: null` |
| AC-6, AC-25 | U: ortak not iki akordeonda (açık ve kapalı); iki varsayılan metni |
| AC-7, AC-16, AC-17, AC-24, AC-26 | U + K: ipucu Kasa'da tek kez; finanssız ve sekme listesi tanımsız kullanıcıda var; üçlüde yok; özelleştir kapalıyken yok |
| AC-8, AC-14, AC-23 | D: tek tanım taraması; iki görünümün birleşimi tam liste |
| AC-9 | U: karışık sıralı dizi dokunulmadan kaydedilince birebir; özelleştirilmemişte `null` |
| AC-10 | `git diff` boş + `server-authz.test.js` + `server-security.test.js` (Electron), raporda |
| AC-11, AC-15 | U: kaynak taraması (grup adı dizesi, ayrı durum, `kasa:` bayrağı yok) |
| AC-12, AC-13 | D: Kasa görünümü = `KASA_EYLEM_IDLERI`; Gider görünümünde kasa kimliği yok |
| AC-20 | D: gider ve kasa grup adları birebir |
| AC-21 | D: `{id, label}` fikstürü birebir |
| AC-22 | `0066-piksel-raporu.json`, `kullanici-izin-kasa-0066` ekranı |

## 6. Notlar

- Kullanıcıya görünen tek değişiklik izin ekranının düzenidir; yetki değişmez, sürüm notu gerekmez.
- Görsel kanıt (TY onayı 2026-10-02): tam çekimde 528 görüntünün 521'i 0 piksel; bilinçli değişen `kullanici-izin-kasa`
  ve `kullanici-izin-kasa-ipucu`, yeni `kullanici-izin-kasa-0066`; `uygulama-menu-kasali` karanlık 37 piksel bilinen
  titreşim. `kanit-eslemesi.json` kaydı yok (R21).
- AC-10: `git diff -- electron/serverAuth.cjs` boş; `server-authz.test.js` + `server-security.test.js` (Electron) 147 test yeşil.
