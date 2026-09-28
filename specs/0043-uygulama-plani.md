# 0043 Uygulama Planı: Menüde "Mali İşler" Grubu

| | |
|---|---|
| **Bağlı spec** | `specs/0043-mali-isler-menu-grubu.md` (R1, mockup onayıyla onaylandı) |
| **Mockup** | https://claude.ai/artifact/AygnJKCGKhu6ARAzJVPhdP |
| **Dal** | `feat/0043-mali-isler` |

## 1. Kararlar

| No | Karar | Gerekçe |
|---|---|---|
| Q1 | Grup tanımı `App.jsx`'te `MENU_GRUPLARI` sabitinde (`{ id: "mali", label: "Mali İşler", icon: "mali", cocuklar: ["finance","gider","kasa"] }`); satır düzeni saf `lib/menuGruplari.js` `menuSatirlari(visibleTabs, gruplar, { dar })` | R7/R8 kuralı saf fonksiyonda testlenir; `TABS` ve kimlikler değişmez (C1) |
| Q2 | Açık/kapalı `localStorage` `maliIslerAcik` | R4; `sidebarDar` deseni |
| Q3 | Gruptaki ekrana geçişte grup açılır (`useEffect` `[tab]`) | R3, AC-4 |
| Q4 | Menü düğmesi tek fonksiyonda (`navDugmesi`); çocuklar aynı tıklama yolunu (Notlar taslak koruması dahil) kullanır | R10, AC-12 |
| Q5 | `Icon`'a `mali`, `chevronDown`, `chevronRight` eklenir | Mockup |

## 2. Adım sırası

1. Saf `menuSatirlari` + birim testi.
2. `App.jsx` kenar çubuğu, `Icon` ikonları.
3. Gerçek App arayüz testleri (AC-1…AC-15).
4. Görsel kanıt, TY onayı, sözlük kuralı (R11), CLAUDE.md.

## 3. Kriter ↔ test eşlemesi

| AC | Test |
|---|---|
| AC-1, AC-2, AC-14 | `menu-gruplari.test.js` + `ui/menu-mali-isler` |
| AC-3, AC-5, AC-6, AC-11 | `ui/menu-mali-isler` |
| AC-4, AC-7 | `ui/menu-mali-isler` |
| AC-8, AC-9, AC-10 | `menu-gruplari.test.js` + `ui/menu-mali-isler` |
| AC-12 | `ui/menu-mali-isler` |
| AC-13, AC-15 | `ui/menu-mali-isler` + `menu-gruplari.test.js` (kimlikler) |

## 4. Uygulama notları

- **Görsel kanıt:** `docs/evidence/0043-piksel-raporu.json` + `0043-uygulama-menu-*.jpg`. Görüntü aracı (`0009-sayfa.jsx`) artık gerçek App kabuğunu `uygulama-menu-acik/kapali/dar/tek-cocuk` ekranlarında çizer (makine yereli tercihler ve tek çocuklu kullanıcı App çizilmeden kurulur; App verisini eşzamansız yüklediği için ilk bekleme 1,5 sn). 292 çekimde yalnız grup açık ve kapalı ekranları değişti; dar kip ve tek çocuklu kullanıcı birebir aynı, öteki 284 çekim 0 piksel. Aracın derlemesinde yayın perdesi inik olduğu için Kasa menüde görünmez (kurulu sürümle aynı); üç çocuklu hâl mockup'ta ve `ui/menu-mali-isler` testlerinde. TY onayı 2026-09-28.
- **Kanıt eşlemesi:** kenar çubuğu `tasarim.jsx` kullanmadığı ve mevcut ekranların hiçbiri App kabuğunu çizmediği için `kanit-eslemesi.json`'da değişecek kayıt yok (spec Context'teki "kenar çubuğu her ekran görüntüsünde var" varsayımı bu araç için geçerli değil).
- **Testler:** `menu-gruplari.test.js` (7), `ui/menu-mali-isler.test.jsx` (11, gerçek App); tam paket 234 dosya / 2624 test yeşil, lint 0 hata (67 uyarı, değişmedi).
