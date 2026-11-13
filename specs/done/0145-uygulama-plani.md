# 0145 Uygulama planı: pano Extra Kalıp kargo kapısı ve izin beklemesi

| | |
|---|---|
| **Spec** | `specs/done/0145-pano-kalip-kargo-yetkisi-ve-izin-yarisi.md` (revizyon 2) |
| **Onay** | Takım Yöneticisi, 2026-11-13 (sekiz öneri onaylandı, spec'e Plan kararı 27–34 olarak işlendi) |
| **Dal** | `feat/0145-pano-kalip-kargo` (`4321ab3d` üstünde) |
| **Durum** | Tamamlandı: commit `0a7e8a75` (2026-11-13). Tam takım yeşil (Electron dışı 7461, Electron 14 dosya), lint 0 hata, tip denetimi temiz. Kanıt `0145-piksel-raporu.json`: 12 eski pano ve pencere ekranı 0 piksel, iki yeni ekran, aynı kodla ikinci çekim 0 fark. Mutasyon: kapı, çizim kapısı, ilk tur ve kilit testlerle yakalandı; ilk turun veri sürümü koruması ölçülemedi: triyajda bastırma bittikten sonra dönen, sürümsüz yüklemeli ilk tur denendi; açılıştaki bekleyen kayıt yenilemeyi ayrıca engellediği için koruma yine sınanamadı (README açık bulgu). Uygulamada ilk turun cevapsız hâli çevrimdışı işaretlemeyecek biçimde daraltıldı (B-R1/5 güncellendi). |

## 1. Dosyalar

- **A:** `src/lib/permissions.js` (`kargoKapisi`, `kalipKargoKapisi`: tek tanım), `src/App.jsx` (210 ve 214 bu iki fonksiyondan; prop adları
  aynı, kiosk çağrısı değişmez), `src/components/ServisPanosu.jsx` (Extra Kalıp detayının kilidi yalnız `cust_kalip_edit` ile).
- **B:** `electron/ipc/data.cjs` (`server:refreshToken` izni yazar ve döndürür), `src/App.jsx` (`izinYerlesti`, 1,5 sn yarış, açılış
  çağrısı tek, çizim kapısı, yoklamanın hemen çalışan ilk turu).
- **Testler:** `pano-kalip-kapisi-0145`, `ui/pano-kalip-kapisi-0145`, `ui/izin-beklemesi-0145`; `scripts/tests/istemci-sunucu.cjs`
  (tazeleme; eski `=== true` iddiası "spec 0145 ile"), `scripts/tests/server-security.cjs` (`stokKalipci`).
- **Kanıt ve belgeler:** `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/0145-*`, `CLAUDE.md`, `specs/README.md` (X7 açık bulgu).

## 2. Adım sırası

1. Ön ölçüm (QA kararı 17) Takım Yöneticisi'nde; uygulama beklemez (Plan kararı 27).
2. A: saf kapı, App, kilit, testler, sunucu e2e.
3. B: tazeleme ve Electron e2e, App beklemesi, yoklama, UI testleri; var olan App testleri dokunulmadan yeşil.
4. Kanıt, belgeler; tam takım (Electron dahil), lint, tip denetimi, mutasyon ölçümü.

## 3. Kararlar (onaylı öneriler)

| No | Konu | Karar | Spec |
|---|---|---|---|
| 27 | İki ön ölçüm | Takım Yöneticisi yapar, uygulama beklemez | QA kararı 17 |
| 28 | Yoklamanın ilk turu | Veri sürümü yerleşmeden yükleme yapmaz | B-R1/5 |
| 29 | Tazelemenin dönüşü | Başarıda nesne, başarısızlıkta `false` | B-R1/6 |
| 30 | Geç gelen cevap | İzni yerleştirir, tek seferlik daralma kabul | B-R2/4 |
| 31 | Admin, kısıtsız kullanıcı | Ayrı bayrak; testte iki örnek | AC-31 |
| 32 | Yedek parça kargo kilidi | Dokunulmaz, açık bulgu | X7 |
| 33 | Kanıt | İki yeni ekran, eski pano ekranları 0 fark | AC-33 |
| 34 | Yerel mod, sunucu PC | Bekleme yok, sunucu PC'de tazeleme `false` | AC-12 |

## 4. Kriter ↔ test

| AC | Test |
|---|---|
| 1–5, 17–19, 21, 24 | `ui/pano-kalip-kapisi-0145` (pano) |
| 4 (bildirim, ayrı pencere), 7, 20, 23 | `ui/pano-kalip-kapisi-0145` (gerçek App) |
| 6, 15 | `scripts/tests/server-security.cjs` (`stokKalipci`) + `server-authz` dokunulmadan |
| 8 | var olan pano ve kargo testleri + `pano-kalip-kapisi-0145` |
| 16, 22 | `pano-kalip-kapisi-0145` (saf, taramalar) |
| 9–14, 25, 27–32 | `ui/izin-beklemesi-0145` |
| 26 | `scripts/tests/istemci-sunucu.cjs` |
| 33 | `docs/evidence/0145-piksel-raporu.json` |

## 5. Sürüm notu

Sunucu değişmez, istemciler güncellenir. Stok sekmesi olan kullanıcılar panoda Extra Kalıp kargo kartlarını ve kargo alarmını görmeye
başlar; kartı düzenletmek için yönetici `cust_kalip_edit` kutusunu Müşteri işlemleri akordeonundan işaretlemelidir. Yönetici izin
değiştirdiğinde kullanıcının bir sonraki açılışı yeni izinle başlar.

**Sürümden sonra (triyaj bulgu 2):** istemci PC'de açılıştaki jeton tazelemesinin süresine bir kez bakılır; 1,5 saniyeyi aşıyorsa
açılış bayat izinle çizilip sonra daralır (B-R2/4) ve gösterge kararı (Karar 2) yeniden açılır.
