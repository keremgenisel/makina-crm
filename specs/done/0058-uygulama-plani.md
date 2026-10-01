# 0058 Uygulama Planı: Hesapsız Kayıtların Kapsam Dışı Bırakılabilmesi

| | |
|---|---|
| **Bağlı spec** | `specs/0058-hesapsiz-kayitlari-kapsam-disi-birakma.md` (R2, plan onayıyla) |
| **Dal** | `feat/0058-kapsam-disi` (`feat/0057-taksitli-form` üstünden) |
| **Onay** | Takım Yöneticisi, 2026-10-01: bütün öneriler (Q1–Q8) kabul |

## 1. Kodda bulunanlar (spec'e ek)

- Hesapsız ödemelerin listesi yok (`Kasa.jsx` yalnız sayıyı yazıyor; `hesapsizOdemeler` aralıksız çağrıda satır döndürmüyor).
- Hesap atama birden çok yoldan (Kasa listesi, müşteri detayı, Stok yedek parça).
- Hesap atayan kullanıcıda `kasa_hesap` izni olmayabilir; temizlik silmesi bu kullanıcıda 403 alırdı.

## 2. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/kasa.js` | `hesapsizOdemeler` / `hesapsizTahsilatlar` isteğe bağlı `kapsamDisi`; `hesapsizOzeti(…, esik, kapsamDisi)` önce kapsam dışı sonra eşik, `kapsamDisi` sayıları ve listesi; `kapsamAnahtari`, `kapsamDisiGecerli`, `kapsamDisiTemizle`. |
| `src/components/Kasa.jsx` | Ödeme listesi, satır ve toplu "Kapsam dışı bırak", onay, kapsam dışı bölümü, "Kapsama al", R2/R8 metinleri, `BosDurum`, `kasa_hesap`, işlem geçmişi. |
| `src/App.jsx` | `kasaKapsamDisi` durumu (yükleme, kayıt, birleştirme), Kasa prop'u, rapor verisi, temizlik efekti. |
| `src/lib/giderRaporu.js` | `kasaKapsamDisi` iki alt fonksiyona geçer. |
| `src/lib/merge.js` | `MERGE_KEYS`, kaynağa göre `kayitId` remap. |
| `electron/db.cjs` | `kasa_kapsam_disi` tablosu, yazma, okuma (beşli kural). |
| `electron/serverAuth.cjs`, `electron/server.cjs` | R12 eşlemeleri + R20 temizlik istisnası; `BOLUM_ADLARI`. |
| `src/components/settings/SettingsBackup.jsx`, `src/lib/yedekKasa.js` | "Giderler" paketi; Kasa sekmesiz geri yüklemede bölüm korunur. |
| `src/components/settings/SettingsAuditLog.jsx`, `serverPermissionDefs.js` | Etiketler (R17), `kasa_hesap` açıklaması (R9). |
| Testler | `tests/kasa-kapsam-disi.test.js`, `tests/ui/kasa-kapsam-disi.test.jsx`; ek bloklar `server-authz`, `server-security.cjs`, `merge`, `db-roundtrip.cjs`, `db-clean-install.cjs`, `gider-kasa-raporu`, yedek. |
| Kanıt, belge | `scripts/evidence/0009-sayfa.jsx` üç ekran, `kanit-eslemesi.json`, `CLAUDE.md`. |

## 3. Kararlar

- **Q1 / R19.** Ödeme listesi bu işte çizilir; hareketin hesabını atamak kapsam dışı.
- **Q2 / R20.** Tek temizlik efekti + dar sunucu silme istisnası; çöpteki kayıt okuma anında yok sayılır.
- **Q3.** Merge remap'i `tur`/`kaynak`'a göre ilgili haritadan.
- **Q4.** Sayılar kapsamdaki görünen kümeden; kapsam dışı ayrı sayı.
- **Q5.** Toplu işlem liste başına; onayda sayı, eşik ibaresi ve R2 cümlesi.
- **Q6 / R21.** İşlem geçmişinde avansta çalışan adı yok.
- **Q7.** Kasa sekmesiz geri yükleme bölümü korur.
- **Q8.** Kanıt: üç yeni ekran; yalnız kasa/gider ekranlarıyla çekim.

## 4. Adım sırası

1. Motor ve motor testleri. 2. db, merge, sunucu, yedek. 3. App ve rapor. 4. Kasa ekranı. 5. Etiketler. 6. UI ve uçtan uca
testler, tam takım, lint. 7. Kanıt, TY onayı, `CLAUDE.md`.

## 5. Kriter ↔ test eşlemesi

M = `tests/kasa-kapsam-disi.test.js`, U = `tests/ui/kasa-kapsam-disi.test.jsx`.

| AC | Test |
|---|---|
| 1, 2, 17 | U; M (`hesapsizOzeti`) |
| 3 | M çapraz (bakiye, gelir, borç) |
| 4, 5, 27 | U |
| 6 | U (onay metni, görünen küme) |
| 7, 25 | U (gerçek App); M (`kapsamDisiTemizle`) |
| 8, 21 | M |
| 9, 22 | `gider-kasa-raporu` |
| 10 | `ui/kasa-0051` aynen; M |
| 11, 28 | U |
| 12, 19 | U; `server-authz`; `server-security.cjs` |
| 13, 26 | U; `SettingsAuditLog` etiket testi |
| 14 | `db-roundtrip.cjs`, `db-clean-install.cjs`, yedek testi |
| 15, 23 | `merge`; `server-security.cjs` |
| 16, 18 | M (anahtar, kaynak taraması) |
| 20 | M |
| 24 | M; U |

## 6. Uygulama notları

- **Hesapsız ödeme listesi:** düğme "Ödemeleri göster" (tahsilatınki "Listeyi göster" kaldı; iki aynı metinli düğme mevcut testleri bozuyordu). Sayı satırının test kimliği yalnız metni taşır, düğme dışında.
- **`BOS_KAPSAM` sabiti:** Kasa'nın varsayılan boş dizisi her çizimde yeni olunca 0051'in bellek testi (özet bir kez hesaplanır) kırıldı; modül sabiti kullanıldı.
- **Temizlik efekti ve yükleme penceresi:** App yüklemeden sonraki 700 ms içindeki değişikliği kaydetmez; açılışta yapılan temizlik bir sonraki kayıtta yazılır (zararsız: geçersiz giriş okuma anında zaten etkisiz). Gerçek akış (müşteri detayında ödeme geri alınıp hesapla yeniden işaretlenir) `ui/tahsilat-hesap`'te: giriş hesapla AYNI kayıtta düşer, ara kayıt gönderilmez; efekt kapatılınca test kırılıyor.
- **Sunucu istisnası para birimine bakmaz** (istemci bakar): istemci daha az siler, sunucu daha geniş kabul eder; en kötü durumda kayıt iş listesine geri döner.
- **Uçtan uca:** temizlik senaryosu var olan bir hesapla kuruldu (ilk denemede atanan 9043 numaralı hesap veride yoktu ve kayıt doğru olarak hâlâ hesapsız sayıldı).
- **Kanıt sonucu:** `0058-piksel-raporu.json` (33 aday kasa ekranı, iki tema). 18 ekranda bilinçli fark, TY onayı 2026-10-01: üç yeni ekran (`kasa-0058-listeler`, `-kapsam-disi`, `-toplu-onay`), "Ödemeleri göster" düğmesinin satırı yükseltmesiyle aşağı kayan 14 mevcut Kasa ekranı (içerik aynı) ve izin etiketi; 15 ekran 0 piksel.
- **Kapanış:** uygulama commit `c995830`. Taban çekimi (`0058-taban-piksel-raporu.json`) "degisti" kayıtlı 17 ekranı onaylanan görüntülerle karşılaştırdı: 34 görüntü, 0 piksel; kayıtlar `ayni`ye çevrildi.
