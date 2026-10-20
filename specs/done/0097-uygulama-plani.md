# 0097 Uygulama Planı: makina maliyeti üretim tarihindeki parça maliyetiyle

| | |
|---|---|
| **Spec** | `specs/done/0097-uretim-tarihindeki-parca-maliyeti.md` (revizyon 5) |
| **Commit** | uygulama `c80186d`; kapanış (SCORECARD, kanıt, taşıma) ayrı commit |
| **Dal** | `feat/0097-parca-maliyet-gecmisi`, `main` (`47549d1`) üstünde, çalışma kopyası `../wt-0097` |
| **Onay** | Takım Yöneticisi, 2026-10-20: planın on dört önerisi (P1–P14) kabul edildi |

## 1. Plan turu kararları (spec revizyon 4'e işlendi)

| # | Bulgu | Karar | Spec |
|---|---|---|---|
| P1 | İlk kez girilen maliyet (girilmedi → değer, geçmiş boş) R21'in düz okumasıyla geçmiş partileri "eksik" bırakır | Kayıt yazılmaz, ilk giriş başlangıçtan beri geçerli | R21/2 |
| P2 | Tutar değişirken son kayıtla sondan bir önceki arasındaki tarih diziyi bozar | Tutar değişiyorsa sınır son kayıt; sondan bir önceki yalnız tarih düzeltmesinde | R6/3 |
| P3 | AC-11 ile AC-15 aynı durumu iki yöne götürür | Tarih alanına dokunuldu bayrağı | R7/2 |
| P4 | `<model>#plan` anahtarı 0088:202'yi kırar | Planlanan satır da yalın model adı | R12/4 |
| P5 | Karışık sürümde son kayıt ile bugünkü değer ayrışabilir | Son kaydın aralığı bugünkü değerden okunur, yazıcı son kaydı eşitler | R3/2 |
| P6 | Birim öneri × adet ile toplamdan öneri ayrışır | Ciro satır toplamından | R14/2 |
| P7 | Özette planlanan modelin satılmış makinaları | Her makina kendi tarihi ve payıyla | R9/5 |
| P8 | Payı yazılmayan türetilen satır | Hücre "—", toplamda sıfır | R18/2 |
| P9 | Gruplama ölçütü | Direkt maliyet ve eksik sayısı birlikte | R12/6 |
| P10 | Tarihsiz makinanın ölçütü | `BILINMIYOR` ya da biçimsiz tarih | R10/3 |
| P11 | `parcaSatirlariniCoz`'un `bugun`'ü | Zorunlu, yoksa hata | R20/2 |
| P12 | 0088'de süre eşiği yok | 2 sn (0090 AC-52 emsali), çağrı sayısı tarihli okumadan | C12 |
| P13 | AC-58'in ölçümü | Şerit altı karşılaştırması, yoksa elle + kıyas | AC-58 |
| P14 | Paylaşılan kancanın imzası | `hazirla(kayit, eski, ek)`, geriye dönük uyumlu | C13/2 |

## 2. Değişen dosyalar

| Katman | Dosya | Ne |
|---|---|---|
| Motor | `src/lib/urunAgaci.js` | `parcaMaliyetKurus(p, tarih)` / `parcaMaliyetiVar(p, tarih)` tarihli okuma (R2, R2/2, R2/4, R3/2); karar motoru `maliyetGecmisiYaz`; tarih doğrulaması; geçmiş listesi verisi; metin sabitleri |
| Motor | `src/lib/makinaStandartMaliyet.js` | `modelMaliyeti`'ne tarih; `partiHesabi` katalog ve parti payı alır, (model, gün) önbelleğiyle satırları gruplar, pay makina başına toplanır, özet ve tedarik tarihli |
| Motor | `src/lib/parcaAktarma.js` | `parcaSatirlariniCoz(rows, parts, idBaslangic, bugun)`; geçmiş kararı `maliyetGecmisiYaz`'dan |
| Kanca | `src/hooks/useSimpleDefList.js` | `hazirla(kayit, eski, ek)`, `add(ek)`, `saveEdit(ek)` |
| DB | `electron/db.cjs` | `parts.maliyetGecmisi` (JSON, boş liste NULL, okumada koşullu); dört nokta |
| Ekran | `src/components/PartManager.jsx` | Geçerlilik tarihi alanı (düzenlemede), doğrulama, geçmiş listesi; kayıt fonksiyonu geçmişi eski kayıttan yazar |
| Ekran | `src/components/MakinaMaliyeti.jsx` | Üst ibare; Parti Hesabı'na ham müşteri dizisi, parti payı ve katalog |
| Ekran | `src/components/maliyet/PartiHesabi.jsx` | Satır anahtarı, ay aralığı / neden satırı, pay kaynağı, R18 bilgi satırı, pay ibaresi |
| Ekran | `src/components/settings/SettingsImport.jsx` | İçe aktarmaya yerel gün |
| Belge | `CLAUDE.md` | Bölüm ve 0090 cümlesinin düzeltmesi |
| Kanıt | `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/0097-*`, `kanit-eslemesi.json` | Yeni ekranlar, kayıtlar ölçüm 8'e göre |

Değişmeyenler (taranır): `serverAuth.cjs`, izinler, kilit alanları, birleştirme anahtarları (`0093-tarama-once.json`).

## 3. Adım sırası

0. Taban: `tests/fixtures/0097-kiyas-once.json` (`YAZ_0097=1`), `tests/fixtures/0097-govde-once.json` (`scripts/tests/0097-govde-fikstur.cjs`, Electron) ve etkilenen 37 ekranın görüntüleri, hepsi spec öncesi kodla.
1. `urunAgaci` (okuma, karar, doğrulama). 2. Veritabanı. 3. İçe aktarma. 4. Kanca ve parça kartı. 5. Parti hesabı motoru. 6. Makina Maliyeti ekranı. 7. Ters çevirmeler ve taramalar. 8. Görsel kanıt. 9. Belgeler.

## 4. Kriter ↔ test eşlemesi

Kısaltmalar: **M** `tests/maliyet-gecmisi-0097.test.js`, **Ç** `tests/maliyet-gecmisi-0097-cagri.test.js`, **K** `tests/maliyet-gecmisi-0097-kiyas.test.js`, **UK** `tests/ui/maliyet-gecmisi-0097.test.jsx`, **UP** `tests/ui/parti-hesabi-0097.test.jsx`, **UA** `tests/ui/parti-hesabi-0097-app.test.jsx`.

| AC | Test |
|---|---|
| 1–8, 38, 42, 44 | M |
| 9–17, 39, 40, 43, 45 | UK (+ M) |
| 18–24, 27, 28, 29, 46, 48, 49, 51 | M (+ UP) |
| 25, 31 | K |
| 26, 30, 50, 53 | UP |
| 32, 54 | M |
| 33, 36 | `scripts/tests/db-roundtrip.cjs`, `db-clean-install.cjs` |
| 34 | `tests/hammadde-0096.test.js` AC-31 (aynı fikstür) + M |
| 35 | `tests/merge.test.js` |
| 37, 41, 55, 56, 59 | M taramaları, `tests/hammadde-0096.test.js` |
| 47 | UA |
| 52 | Ç |
| 57, 58 | `tests/kanit-eslemesi.test.js`, görsel kanıt |
| 60 | `CLAUDE.md` |

## 5. Ölçümler

- **Kıyas (C4):** geçmişi olmayan veride dışa aktarma, liste hücresi, kuruş, "girildi mi", sayaç, Model Maliyetleri (seçenekli ve seçeneksiz) ve değeri değişmeyen içe aktarma spec öncesi altınla birebir (`tests/fixtures/0097-kiyas-once.json`). Gövde: geçmişi olmayan parçalar spec öncesi okumayla birebir (`0097-govde-once.json`).
- **0092 altını:** yeniden üretildi; yalnız iki `partiHesabi` bloğu değişti, öteki sekiz blok (aylık, dönem, parti payları, genel gider payı) aynı.
- **Süre (AC-52):** 600 makina, 3 model, 60 belirgin (model, gün): 3 ms, tarihli okuma 600 çağrı (makina başına olsaydı 6.000).
- **Bozma denemeleri:** 26 denemenin 25'i en az bir testi kırdı. Yakalanmayan tek deneme `BILINMIYOR` kaynağını tarihli okumaktı ve eşdeğerdir: `makinaListesi` bu kaynakta tarihi her zaman boş yazar, biçim denetimi aynı dala gönderir. İlk turda form kopyası bozması da yakalanmadı (koruma iki yerde); AC-45'e geçmişi olan parçalı ikinci senaryo eklendi, artık yakalanıyor.
- **Görsel kanıt** (`0097-piksel-raporu.json`, spec öncesi ↔ uygulama, 42 ekran × 2 tema): parça listesi ekranları ve ekleme penceresi 0 piksel (R15'in piksel kanıtı); parça kartı ekranları ve bütün `maliyet-*` ekranları bilinçli değişti. Model Maliyetleri ve Hesap Ayarları ekranlarında farkın sınır kutusu yalnız şeridin metin satırı (y 170–198, boyutlar aynı; `0097-serit-raporu.json`, araç `scripts/evidence/0097-serit-olc.cjs`). Bunun için ibare tek satıra kısaltıldı (ilk metin iki satırdı ve alttaki her şeyi kaydırıyordu). Yeni ekranlar: `katalog-parca-0097-gecmis`, `-hata`, `maliyet-0097-parti-tarihli`, `-acik`, `-baslamadi`.
- `npm test` 382 dosya yeşil (Electron dahil), `npm run lint` 0 hata.

## 6. Triyaj (2026-10-20)

| # | Bulgu | Düzeltme | Test |
|---|---|---|---|
| 1 | Tarih düzeltmesi sondan bir önceki kayıtla aynı güne iki kayıt yazıyor, aradaki kayıt okunamıyor | Düzeltme dalında `tarih <= altSinir` reddedilir (`tarihSonraHatasi`); tutar değişirken eşit gün üzerine yazma aynen | M AC-15/AC-42 (triyaj senaryosu), UK |
| 2 | Kapanmış partide durum "rol yok" / "yürürlük öncesi" iken planlanan satır hesaplanmış 0 gösteriyor, yalnız planlanan satırlı partide neden yok | Payı `null` + `payNeden`; neden satırı "pay yazılmayan satır var" ölçütüyle | M, UP |
| 3 | Boşaltılmış tarih alanı maliyetle ilgisiz düzenlemeyi engelliyor | Tutar değişmiyorsa boş tarih yok sayılır | M, UK |
| 4 | Güncelleyicide karar hata dönerse maliyet yazılıyor, geçmiş yazılmıyor | `urunAgaci.gecmisliKayit` null döner, `hazirla` eski kaydı aynen döndürür | M |
| 5 | 10 → 15 → 10'da iki 10 TL dönemi tek satır | Bilinçli (R12); motor yorumu, spec R12/6 eki ve `CLAUDE.md` | M |

Bozma denemeleri: yedi denemenin yedisi yakalandı.

## 7. Sürüm notu

> Parça maliyeti güncellenirken artık "hangi tarihten geçerli" soruluyor (varsayılan bugün). Eski partilerin ve üretilmiş
> makinaların maliyeti bundan sonra parça maliyeti değişince değişmiyor; bu sürümden önceki zamlar geriye dönük
> bilinmiyor, o yüzden bugünkü maliyet "başlangıçtan beri" sayılır. Parti Hesabı'nın genel gider payı artık partinin kendi
> aylarından geliyor ve Üretim Partileri ile aynı rakamı gösteriyor. Önce sunucu PC, sonra istemciler güncellenmeli:
> güncellenmemiş sunucu maliyet geçmişini kaydetmez.
