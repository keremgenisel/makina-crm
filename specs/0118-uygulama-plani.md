# 0118 Uygulama planı: Manuel Satır Ekle, kalıbın kodu ve bekleyen tamirler

Spec: `specs/0118-manuel-satir-ekle-kod-ve-tamir.md`. Dal `feat/0118-manuel-satir` (`6a5e7ad` üstünde). Takım Yöneticisi planın on önerisinin hepsini onayladı (spec Karar 35–44). Yeni kalıcı alan, veri bölümü, eylem izni, sunucu kuralı ve birleştirme kuralı yok; ölü alan için göç yok (`satirlar` JSON sütunu olduğu için eski satırlardaki değer kayıtta yaşar, okunmaz).

## 1. Dosyalar

| Katman | Dosya | İş |
|---|---|---|
| Saf | `src/lib/kalipTamiri.js` | `MANUEL_TAMIR_BASLIGI`, `MANUEL_TAMIR_BOS_IPUCU`, `MANUEL_KOD_IPUCU` (yeni kural yok) |
| Satır modeli | `src/components/stock/uretimFormModel.js` | Ölü alan silindi |
| Pencere | `src/components/stock/UretimSatirEkleModal.jsx` | "Kalıp Kodu" alanı (ön doldurma, öncelik, ipucu), "SERVİSTE BEKLEYEN KALIPLAR" bölümü, `bekleyenler` prop'u, tamir satırı `tamirSatiriKur` ile, düğme metni toplam seçimle, `wide`, üç alana `aria-label` |
| Ekran | `src/components/stock/UretimFormu.jsx` | `DONEM_KAPALI_METNI` (Karar 37), "Manuel Satır Ekle" kapısı, `bekleyenler={bekleyenler}` |
| Fikstür | `tests/fixtures/0115-veri.js` | Ölü alanın dördüncü kopyası silindi |
| Kanıt aracı | `scripts/evidence/0009-sayfa.jsx` | Dört ekran (`uretim-formu-0118-manuel-kodlu`, `-kodsuz`, `-tamirli`, `-tamirsiz`) |
| Kanıt | `docs/evidence/0118-*`, `kanit-eslemesi.json` | `UretimFormu.jsx` anahtarına beş kayıt (Karar 36) |
| Testler | yeni `tests/manuel-satir-0118.test.js`, `tests/ui/manuel-satir-0118.test.jsx` | §4 |
| Belge | `CLAUDE.md`, `specs/README.md`, spec | 0115 bölümü güncellemesi, yeni 0118 bölümü (0117'nin önünde, Karar 44) |

## 2. Adım sırası

1. Çalışma kopyası ve Electron kurulumu.
2. Kanıt aracının dört ekranı; eski kodla taban çekimi (11 ekran × 2 tema).
3. Sabitler, satır modeli ve fikstür, pencere, ekran kapısı ve prop.
4. Bileşen testleri (gerçek `UretimFormu` durumlu kap), kaynak taramaları, mutasyonla ölçüm (yedi bozma, hepsi yakalandı).
5. Görsel kanıt (yeni kod ↔ eski kod, yeni kod ↔ yeni kod), eşleme kayıtları.
6. Belgeler; makina boşken tam `npm test` ve `npm run lint`.

## 3. Riskler ve kararlar

| # | Risk | Öneri (onaylandı) |
|---|---|---|
| Ö1 | Ölü alan taraması harita verisinde eşleşir | Kelime sınırlı desen, `src/lib/map/` gerekçeli dışarıda (Karar 35) |
| Ö2 | Pencere kanıt eşlemesinde anahtar alamaz | Kayıtlar `UretimFormu.jsx` anahtarına, `degisti` (Karar 36) |
| Ö3 | Kapalı dönem metni üç kopya | Tek yerel sabit (Karar 37) |
| Ö4 | İpucu kullanıcının yazdığıyla kaybolur | Ölçüt katalogda kod yokluğu, yalnız tek kalıp (Karar 38) |
| Ö5 | Tek kalıba inen seçimde alanın değeri | Katalog koduyla yeniden dolar; tamir dokunmaz (Karar 39) |
| Ö6 | Kimlik türü karışıklığı, çap okuması | Dize karşılaştırması; çap kurucuda (Karar 40) |
| Ö7 | Pencere ölçütü kendisi çağırır | `bekleyenler` prop'u (Karar 41) |
| Ö8 | AC-45 düzeneği sınar | Gerçek kayıt + pano rozeti (Karar 42) |
| Ö9 | Bildirim biçimi | `showToast(metin)` (Karar 43) |
| Ö10 | Belge yerleşimi | 0118 bölümü 0117'nin önünde (Karar 44) |

## 4. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1–AC-8, AC-30–AC-32, AC-37, AC-40, AC-41 | `tests/ui/manuel-satir-0118.test.jsx` "A: kalıbın kodu" |
| AC-9, AC-30 (tarama) | `tests/manuel-satir-0118.test.js` "ölü alan" |
| AC-10, AC-46 | `tests/manuel-satir-0118.test.js` "sütunlar değişmez" |
| AC-11–AC-25, AC-34–AC-36, AC-38, AC-42, AC-44, AC-45 | `tests/ui/manuel-satir-0118.test.jsx` "B: bekleyen tamirler" |
| AC-26 | `tests/ui/kalip-tamiri-0115-uretim.test.jsx` triyaj testi, dokunulmadan |
| AC-27, AC-28 | `tests/ui/manuel-satir-0118.test.jsx` "C: dokunulmayanlar" |
| AC-29 | Tam `npm test`, `npm run lint` |
| AC-33, AC-34, AC-39, AC-43, AC-47, AC-48, AC-49, AC-24 (tek sabit) | `tests/manuel-satir-0118.test.js` "pencere taramaları" |
| Kapanış bekçisi | `tests/manuel-satir-0118.test.js` "kapanış belge düzeni" |

Mutasyonla ölçüm: kodun ön doldurulması, tek kalıpta yazılan değerin önceliği, tamirin kayda süzülmesi, müşteri değişince tamir seçiminin sıfırlanması, düğme metninin toplamı, kapalı dönem kapısı ve ipucunun tek kalıp şartı ayrı ayrı bozuldu; yedisi de en az bir testi kırdı. Triyajda üç bozma daha yakalanmadı (tamir satırına müşteri yerine `null`, ipucu ölçütünün alanın değerine bağlanması, kimliklerin `===` ile karşılaştırılması); üçüne iddia eklendi, artık üçü de testi kırıyor.

## 5. Görsel kanıt

11 ekran × 2 tema. Değişen: pencerenin dört hâli (yeni ekranlar; eski kodda dar pencere ve tamir bölümü yok). Değişmeyen (0 piksel): `uretim-formu`, `uretim-formu-0115-tamir`, `-bekleyen`, `-kopuk`, `-yazdir`, `uretim-formu-0108-sil-onay`, `-bos`. Taban (yeni ↔ yeni) 0 fark. Hiçbir çekimde `adimUyarilari` yok.

## 6. Sürüm notu

"Kalıp Üretim Formu › Manuel Satır Ekle: pencere genişledi; seçilen kalıbın kodu katalogdan gelir ve değiştirilebilir; seçilen müşterinin serviste bekleyen kalıpları aynı pencereden tamir satırı olarak eklenebilir. 'CNC Programı' alanı kaldırıldı (zaten hiçbir yerde görünmüyordu). Dönemi sonlandırılmış formda pencere açılmaz." Veri değişikliği yok; sürüm sırası şartı yok.
