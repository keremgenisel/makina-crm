# 0069 Uygulama Planı: Electron 44 ve Şifreli SQLite Sürücüsünün Yükseltilmesi

| | |
|---|---|
| **Bağlı spec** | `specs/0069-electron-ve-sqlite-surum-yukseltmesi.md` (revizyon 2) |
| **Dal** | `feat/0069-electron-44` (`main` `4238ef5` üstünde) |
| **Onay** | Takım Yöneticisi, 2026-10-03: denetim betiği düzeltmesi; açılır liste kısalması kabul; görüntü aracı düzeltmesi; otomatik güncelleme yerel sunucuyla; `npmRebuild: false`; kullanılmayan platform ikilileri dışarıda |

## 1. Sürümler

| Paket | Önce | Sonra |
|---|---|---|
| `electron` | 42.11.5 (`^42.4.1`) | 44.4.4 (`^44.4.4`; kayıt defterinde 44.5.1 var, spec ve PR #33 gereği 44.4.4'e sabitlendi) |
| `better-sqlite3-multiple-ciphers` | 12.11.1 | 13.0.3 |
| `better-sqlite3` | 12.11.1 | 13.0.3 (R2 kararı) |
| `node-abi` (geçişli) | 4.31.0 | 4.35.0 (Electron 44 = ABI 149; 4.31.0 tanımıyordu) |
| `electron-builder` | 26.15.3 | değişmedi (Electron 44 paketini üretti) |
| `prebuild-install` zinciri | 24 paket | kalktı (13 N-API, ikililer pakette) |

## 2. Kodda bulunanlar ve kararlar

- **R2:** iki sürücü de 13. 13 sürümleri N-API'ye geçti, sekiz platformun ikilisini paketin içinde taşır ve önce onu yükler;
  Electron ABI'sine bağlı derleme gerekmez.
- **Denetim betiği hiç kanıt üretmiyordu (R5):** `ensure-native.cjs` şifreli denemeyi bellek içi veritabanında `PRAGMA key`
  ile yapıyordu; sürücü bunu 12'de de reddediyordu. Düzeltildi (geçici dosya, anahtarsız açılış reddi, `--denetle` kipi).
- **Sessiz düşüşün gerçek yüzü:** `require` ikili bozukken de başarılı olur (sürücü ikiliyi açılışta yükler); düşüş uyarısı
  yalnız paket yokken çıkar. `db-encryption.cjs` Faz 0 açılıştan sonra yüklenen `.node`'a bakar.
- **Paketleme (R19, R20):** `npmRebuild: false`; Windows dışı ikililer üst düzey `build.files` dışlamasıyla pakete girmez.
- **Görsel (AC-24, R21):** Chromium dar `select`'te ok için yer ayırır (TY kabulü); görüntü aracının karşılaştırması
  `toBitmap()` sRGB normalleştirmesi yüzünden yanlış fark üretiyordu, iki görüntü de PNG'den okunur.
- **Diyaloglar (R18):** Windows'ta yedek kaydetme bugünkü gibi son klasörde (Masaüstü) açıldı.

## 3. Kriter ↔ kanıt

| AC | Kanıt |
|---|---|
| AC-1 | Tek dal `feat/0069-electron-44`: `package.json` + `package-lock.json` (Electron, iki sürücü, node-abi) |
| AC-2 | §2 R2 kararı ve gerekçesi; spec R2 |
| AC-3 | Temiz `npm ci` (kurulum betikleriyle): çıkış 0, `postinstall` "Rebuild Complete", elle adım yok |
| AC-4 | `node scripts/ensure-native.cjs --denetle` çıktısı §4; şifreli ikili gizlenince SAĞLIKSIZ, çıkış 1; `tests/ensure-native.test.js` |
| AC-5 | `scripts/tests/db-encryption.cjs` Faz 0 (§4): şifreli sürücünün `.node`'u yüklü, düz sürücü yüklenmedi, düşüş uyarısı yok; şifreli paket kaldırılınca üçü de FAIL. Paketlenmiş sürümde Ayarlar › Güvenlik Durumu "şifreli" (TY, Windows) |
| AC-6 | `VITEST_ELECTRON=only`: 11 dosya / 17 test yeşil (beş yerleşim testi dahil) |
| AC-7 | `npm test`: 293 dosya / 3539 test yeşil |
| AC-8, AC-9 | `npm run lint` 0 hata; `npm run typecheck` temiz |
| AC-10 | Hiçbir test atlanmadı, eşik değişmedi; yeni denetimler eklendi |
| AC-11 | Electron testleri (db-roundtrip, db-clean-install, db-encryption); kurulu 3.42.90'da kayıt ekle → kapat/aç (TY, Windows) |
| AC-12 | `server-security` Electron testi (gerçek gömülü sunucu: giriş, yetki, yazım, 401/403/429). Kurulu sürümde sunucu kipinin ayrıca elle denendiği bilgisi yok |
| AC-13, AC-14, AC-15, AC-16 | Kurulu 3.42.90'da TY elle denedi: yazdırma önizleme, Servis Panosu ayrı pencere + sürükleme, harita, dosya ekleme (adım 3 "tamam") |
| AC-17 | `electron-builder --win`: `Altunmak CRM Setup *.exe` 125,2 MB; yalnız `win32-x64.node` asar dışında |
| AC-18 | 3.42.90 Windows'a kuruldu, açıldı, veritabanı yüklendi ve şifreli (TY) |
| AC-19 | Yerel güncelleme sunucusu (§5): 3.42.90 `latest.yml`'yi okudu, 13:28'de 3.42.91 blockmap + kurulumu indirdi, yeniden açılışta 3.42.91 (sunucu kaydı + TY) |
| AC-20 | electron-builder 26.15.3 Electron 44.4.4 paketini üretti (`electronVersion=44.4.4`), NSIS x64, imza adımları geçti |
| AC-21 | Electron 43/44 kırıcı değişiklik listesi taraması (§2); `clipboard`, `net`, sertifika olayı, `isUnityRunning` kullanılmıyor |
| AC-22 | §6 |
| AC-23 | §7 |
| AC-24 | `docs/evidence/0069-piksel-raporu.json`: 540 görüntünün 516'sı 0 piksel; 22'si açılır liste ve metin kutusu tutamağı (kabul), 2'si gözle görünmeyen ton |
| AC-25 | 12 ile şifrelenmiş uygulama veritabanını 13 açtı, 13'ün yazdığını 12 açtı (uygulamanın `db.cjs`'i ile, veri aynı, dosya şifreli) |

## 4. Denetim çıktıları

```
$ node scripts/ensure-native.cjs --denetle
[ensure-native] better-sqlite3-multiple-ciphers 13.0.3 (şifreli: PRAGMA key + şifreli dosya): SAĞLAM
[ensure-native] better-sqlite3 13.0.3: SAĞLAM
(çıkış 0; şifreli ikili gizlenince: SAĞLIKSIZ (Cannot find module …), çıkış 1)

$ npx electron scripts/tests/db-encryption.cjs   (ilk üç satır)
PASS  faz0: veritabanı ŞİFRELİ sürücünün yerel ikilisiyle açıldı (multiple-ciphers .node yüklü)
PASS  faz0: düz better-sqlite3 hiç yüklenmedi (ne JS ne ikili; yedeğe düşülmedi)
PASS  faz0: 'şifrelemesiz better-sqlite3' düşüş uyarısı yazılmadı
…
TUM KONTROLLER GECTI

Sürücü bilgisi (Electron altında): multiple-ciphers 13.0.3, SQLite 3.53.4, şifre chacha20, Electron 44.4.4, ABI 149
```

## 5. Otomatik güncelleme denemesi (yayınsız)

Geçici yapılandırma (`package.json` `build` aynen; `publish: [{ provider: "generic", url: "http://<mac>:8765/" }]`,
`extraMetadata.version`, ayrı çıktı klasörü) ile 3.42.90 ve 3.42.91 üretildi; 3.42.91'in `latest.yml`, kurulum ve blockmap
dosyaları `python3 -m http.server 8765` ile sunuldu. Basit sunucu parçalı indirmeyi desteklemediği için güncelleyici tam
indirmeye geçti (GitHub destekler). Test kurulumu sonrası makinede resmi sürüm yeniden kurulmalıdır.

## 6. Geri dönüş yolu (R14)

İş iki commit'tir: (A) denetim ve araç düzeltmeleri (`ensure-native`, `db-encryption` Faz 0, görüntü aracı, test kaydı;
Electron 42 + 12 ile de doğru çalışır) ve (B) yükseltme. Geri dönüş yalnız B'yi geri alır:

```
git revert <B>                       # electron ^42.4.1 (42.11.5), iki sürücü ^12.11.1, node-abi 4.31.0,
                                     # npmRebuild: true, dosya dışlamaları kalkar
rm -rf node_modules && npm ci        # postinstall: electron-rebuild -f -w better-sqlite3 -w better-sqlite3-multiple-ciphers
node scripts/ensure-native.cjs --denetle   # iki sürücü SAĞLAM olmalı
VITEST_ELECTRON=only npx vitest run        # Electron testleri
```

Veri: geri dönüş veritabanını kilitlemez (AC-25). Yayınlanmış bir sürümden dönülecekse electron-updater sürüm düşürmez:
geri alınmış kodla **daha yüksek** numaralı bir sürüm yayınlanır.

## 7. Sürüm notu metni (R15)

"Uygulamanın altyapısı güncellendi (Electron 44, SQLite sürücüleri 13). Verileriniz aynen korunur ve şifreli kalır.
Görünen tek fark: dar açılır listelerde uzun seçenek adları artık aşağı ok işaretiyle çakışmak yerine biraz daha erken
kısaltılır. Windows 32-bit ve macOS 12 artık desteklenmiyor (uygulama zaten yalnız 64-bit Windows için dağıtılıyor)."
