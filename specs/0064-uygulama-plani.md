# 0064 Uygulama Planı: Eksik Kayıt Kilitleri

| | |
|---|---|
| **Bağlı spec** | `specs/0064-eksik-kayit-kilitleri.md` (R2, plan onayıyla) |
| **Dal** | `feat/0064-kilit` (`feat/0059-rapor-detay` üstünden) |
| **Onay** | Takım Yöneticisi, 2026-10-01: bütün öneriler (Q1–Q11) kabul |

## 1. Kodda bulunanlar (spec'e ek)

- Ödeme planı açıkken içinden ödeme penceresi açılıyor; `useLock` kapanışta kilidi bütünüyle bıraktığı için pencere başına
  kilit, iç pencere kapanınca dıştakini kilitsiz bırakırdı (R25).
- `optimize` veri yazıyor (spec onu salt okunur saymıştı), `mailsablon` `appSettings` yazıyor ve listede yoktu (R27).
- Ayarlar'ın varsayılan sekmesi `app` kilitli bir panel (R31).
- Servis Panosu'nun canlı kilit listesi ve `baskasiKilitli`'si yereldi (R28).
- R5'in Ayarlar kısmı satır kilidi istiyor; R9 panel kilidi (R30).
- `LockConflict` başlık almıyor; başlık saran `Modal`'dan gelir.

## 2. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/kilitAlanlari.js` (yeni) | Tek liste (alan → etiket + pencereler), `AYAR_KILITLI`, kilitsiz dosyalar, `kilitEtiketi` |
| `src/hooks/useKilitListesi.js` (yeni) | Canlı kilit listesi + `baskasiKilitli` |
| `src/hooks/useLock.js` | Yalnız JSDoc |
| `src/components/ServisPanosu.jsx` | `useKilitListesi` |
| `src/components/Giderler.jsx`, `Dashboard.jsx`, `App.jsx` | `gider` kilidi; `aktifKullanici` |
| `src/components/gider/OdemeGirisi.jsx` | Mahsup `calisan` kilidi |
| `src/components/gider/Tedarikciler.jsx`, `gider/UretimPartileri.jsx` | Form kilidi |
| `src/components/Kasa.jsx`, `kasa/CalisanAvanslari.jsx` | `kasa_hesap`, virman, avans, anlık denetimler |
| `src/components/cek/CekPortfoyu.jsx` | `cek` kilidi |
| `src/components/Settings.jsx`, `CalisanManager.jsx` | Panel kilidi, çalışan satır kilidi |
| `src/components/settings/SettingsBackup.jsx`, `SettingsImport.jsx` | Ön denetim + devralma |
| Testler, kanıt, `CLAUDE.md` | |

## 3. Kararlar

Q1 R25 · Q2 R26 · Q3 R27 · Q4 R28 · Q5 R29 · Q6 R30 · Q7 R31 · Q8 R32 · Q9 R33 · Q10 R34 · Q11 R35.

## 4. Adım sırası

1. `kilitAlanlari.js`, `useKilitListesi`, pano, JSDoc. 2. Giderler, Anasayfa, mahsup. 3. Kasa. 4. Çek. 5. Tedarikçi,
üretim partisi. 6. Ayarlar, çalışan. 7. Geri yükleme. 8. Testler. 9. Kanıt, TY onayı. 10. `CLAUDE.md`, tam takım, lint.

## 5. Kriter ↔ test eşlemesi

`K` = `tests/kilit-alanlari.test.js`, `U` = `tests/ui/kilit-0064.test.jsx`, `B` = `tests/ui/kilit-yedek-0064.test.jsx`.

| AC | Test |
|---|---|
| AC-1, 2, 3, 24 | U |
| AC-4, 5 | U |
| AC-6, 8, 27 | U |
| AC-7 | U |
| AC-9, 25, 37 | U |
| AC-26 | U |
| AC-10, 11, 12, 13, 28, 29, 30 | U (+ K) |
| AC-14, 15 | U |
| AC-16, 32, 33 | B |
| AC-17, 18, 19 | U |
| AC-20, 21, 31 | U + K |
| AC-22, 34, 35 | K |
| AC-23, 36 | K + commit diff |
| AC-38 | kanıt raporu, `kanit-eslemesi.json` |

## 6. Uygulama notları

- **Standart genel giderler (R33):** spec'te sayılmamıştı; tutar/ad/sona erdirme penceresi ve silme `standart_gider` alanında grup kimliğiyle kilitlenir, "geri al" anlık denetimdir.
- **`security` paneli kilitli:** paylaşılan `autoLockMinutes` blob ayarını yazdığı için `AYAR_KILITLI`'ya girdi (bilgisayara özgü değil).
- **Kasa anlık işlemleri (R14 ölçütü):** spec'teki kapat/aç ve kapsam dışına ek olarak virman silme, hareketsiz hesap silme ve hesap atama da canlı kilit listesiyle denetlenir (aynı kayda yazan anlık işlemler).
- **Anasayfa'ya `aktifKullanici` gerekmedi:** pencere `useLock` kullanır, sahip karşılaştırmasını sunucu yapar.
- **Ön denetim yalnız yedek geri yüklemede:** `SettingsImport` panelinin kendisi `ayar` kilidi altındadır; içe aktarma bütün bölümleri yazmaz, devralma oraya uygulanmadı.
- **Çalışan düzenleme:** çakışma aynı "Çalışanı Düzenle" penceresinin içinde çizilir (form-kaynak footer taraması ayrı bir footersız pencereyi reddediyordu).
- **Mahsup bayrağı `useLayoutEffect`:** `useEffect` ile kayıt düğmesi bayrak yazılmadan basılabiliyordu (testte yarış görüldü).
- **Sözlük satır atıfları:** `Giderler.jsx` ve `CalisanManager.jsx` satırları kaydı; `docs/tasarim-sozlugu.md` örnek atıfları içerikle eşlenerek güncellendi.
- **Kanıt:** görüntü aracına beş `kilit-*` ekranı eklendi; ikinci kullanıcı simüle edilemediği için `window.crmLocks` sahte kurulur (sahip "ayse", 5 dakika önce).
- **Triyaj (2026-10-01, spec R3):** (1) köprünün `onLocksChanged`'i tek aboneyi tuttuğu için `useKilitListesi` aboneliği modül düzeyinde tek depoya alındı (tek dinleyici, referans sayımı); Kasa ile Çalışan avansları birlikte açıkken biri bayatlıyordu. (2) Ciro ve "Çek Yaz" kayıt anında ödediği kalemlerin `gider` kilidine bakar (R36; spec'in kapsam boşluğu). (3) Gider kalemini çöpe taşıma onayı aynı `gider` kilidini alır (R37). (5) Avans formu çalışan seçili açılmaz. (7) Red bildirimi tek yardımcıda (`kilitAlanlari.kilitRedMesaji`); `pencereler`'in "kilidin altında çizilen dosya" anlamı yorumda.
- **Kanıt üretimi:** `0064-piksel-raporu.json` bütün ekranları (226 × 2 tema) içerir; JPEG yalnız kilit ekranları, değişen avans formu ve dokunulan dosyaların temsilci ekranları için (38). Görüntü aracı tek çalıştırmada 10 dakika sınırına (`0009-calistir.mjs` `timeout`) takılıp yaklaşık 188. ekranda kesildiği için eksik ekranlar ikinci turda çekilip birleştirildi. `uygulama-menu-kasali` iki kararlı görüntü durumu üretir (HEAD'de de, 0053 raporunda 37 piksel); önceyle bayt bayt aynı çekim kullanıldı. TY onayı 2026-10-01: beş kilit ekranı ve `kasa-avans-formu` (triyaj bulgu 5) `degisti`.
