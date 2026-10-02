# 0067 Uygulama Planı: Giderler'de Kutu Düzeni ve Müşteri Detayından Maliyet Kutusunun Kaldırılması

| | |
|---|---|
| **Bağlı spec** | `specs/done/0067-gider-kutu-duzeni-ve-maliyet-kutusu.md` (R2, plan onayıyla) |
| **Dal** | `feat/0067-kutu-duzeni` (`feat/0066-kasa-izin` kapanışından sonra) |
| **Onay** | Takım Yöneticisi, 2026-10-02: bütün öneriler (Q1–Q6) kabul |

## 1. Kodda bulunanlar (spec'e ek)

- R13'ün beş müşteri detayı ekranı görüntü aracında gider yetkisi olmadan açılıyor, kutuyu çizmiyor; kutuyu çizen iki
  ekran (`musteri-detay-maliyet-kapali/-acik`) listede yoktu; sıra değişikliği normal Dönem Raporu'nu çizen bütün
  ekranları etkiler (R19).
- `BorcOzeti` `flex: "2 1 300px"` taşıyor; sütun yönlü kapta yükseklik tabanı (R21).
- CustomerDetailModal'da `rates` yalnız kaldırılan satırda; satış kuru `Customers.jsx`'te (R22).
- `liste-kaynak.test.js` `KartBolum` sayısını 4 sabitliyor (R23).

## 2. Dosyalar

- `src/components/Giderler.jsx` (sıra), `src/components/gider/DonemRaporu.jsx` (`BorcOzeti` stili).
- `src/components/customers/CustomerDetailModal.jsx`, `src/components/Customers.jsx`, `src/App.jsx` (kutu ve prop zinciri).
- `scripts/evidence/0009-sayfa.jsx` (silme adımı, iki eski ekran, `musteri-detay-0067`).
- Yerleşim: `scripts/tests/layout/donem-raporu.{html,jsx}`, `scripts/tests/donem-raporu-yerlesim.cjs`,
  `tests/donem-raporu-yerlesim.test.js`, `vite.config.js` `ELECTRON_TESTLERI`.
- Testler: `tests/ui/customer-maliyet-kutusu.test.jsx` (silinir), `tests/liste-kaynak.test.js`,
  `tests/gider-gizlilik.test.js`, `tests/ui/makina-karliligi.test.jsx`, yeni `tests/ui/kutu-duzeni-0067.test.jsx`.
- Belgeler: `CLAUDE.md`, `specs/done/0050-*.md`, `specs/done/0016-*.md` (tarihli not), `docs/tasarim-sozlugu.md`
  (satır kaymaları).

Maliyet motoru, `MakinaMaliyetDetay`, `MakinaKarliligi`, sunucu, izin, veritabanı değişmez.

## 3. Kararlar

Q1 → R19 · Q2 → R20 · Q3 → R21 · Q4 → R22 · Q5 → R23 · Q6 → R24.

## 4. Adım sırası

1. Müşteri detayı: kutu, prop zinciri, üç testin ele alınması. 2. Dönem Raporu sırası ve `BorcOzeti`. 3. UI testleri,
kaynak taramaları, Electron yerleşim testi. 4. Takım, lint, Electron yerleşim testleri. 5. Kanıt (tam çekim), TY onayı,
notlar ve CLAUDE.md.

## 5. Kriter ↔ test eşlemesi

`U` = `tests/ui/kutu-duzeni-0067.test.jsx`, `E` = `tests/donem-raporu-yerlesim.test.js` (Electron).

| AC | Test |
|---|---|
| AC-1, AC-2, AC-3, AC-23 | U: özet → kalem listesi → borç özeti → kovalar; borç özeti kök sütunun doğrudan çocuğu |
| AC-4 | E: 1280 / 1024 px, iki kartlı satırlarda taşma ve üst üste binme yok, yatay kaydırma yok |
| AC-5 | U: `KalemListesi` props metni (kaynak); `ui/giderler`, `ui/sayfalama-0062` dokunulmadan yeşil |
| AC-6, AC-7, AC-29 | U: `yururlukOncesi` borç özeti var, `rapor.bos` yok; açık kalemlerde sıra; hatırlatmada borç özeti yok |
| AC-8, AC-14 | U: gerçek Customers detayı, `giderYetki` + `makinaMaliyet` ile ve onlarsız; kutu yok, bölümler aynı |
| AC-9, AC-19 | `ui/makina-karliligi` + U kaynak: `MakinaMaliyetDetay` ve `MakinaKarliligi` çağrısı yerinde |
| AC-10, AC-27, AC-28 | U: motor + kart çıktıları sabit değerlerle; motor dosyalarının diff'i boş |
| AC-11, AC-12, AC-32 | U kaynak: `maliyetKutusuAcik` hiçbir yerde yok; `maliyet-detay-*` var, `musteri-detay-maliyet-*` yok, `musteri-detay-0067` var |
| AC-13 | kanıt `musteri-detay-0067` |
| AC-15, AC-35 | `liste-kaynak.test.js` + 0016 notu |
| AC-16 | dosya silindi |
| AC-17, AC-18 | `gider-gizlilik.test.js` 0 satır; U: içe aktarma yok |
| AC-20, AC-21, AC-34 | U kaynak: zincirde `makinaMaliyet` yok, App memo ve Giderler geçişi var; CustomerDetailModal `rates` almaz; `ui/customers-satis-alanlari` yeşil |
| AC-22 | `ui/makina-karliligi` |
| AC-24, AC-30 | belge değişiklikleri |
| AC-25, AC-26, AC-31 | `kanit-eslemesi.json` + `kanit-eslemesi`, `tasarim-kaynak` yeşil |
| AC-33 | U kaynak: `BorcOzeti` stilinde `flex` yok |

## 6. Notlar

- Kullanıcıya görünen değişiklik: Dönem Raporu'nda kalem listesi ve borç özeti üstte; müşteri detayında "Maliyet ve
  Kâr" kutusu yok (maliyet Giderler › Makina Kârlılığı'nda).
- R25 (uygulamada): `rapor.bos` dalı borç özetini zaten çiziyor; davranış korundu, testi bugünkü hâli sabitler.
- 0062'den kalan kırık: `tests/form-pencere-yerlesim.test.js` (Electron) ekstrede en az 8 satır bekliyordu; 0062 ekstreyi 5
  satırla sayfaladı ve 0062 kapanışında Electron testleri koşulmamıştı. Ölçüm 5 satır + sayfalama çubuğu olarak
  güncellendi (`scripts/tests/form-pencere-yerlesim.cjs`); 0062 SCORECARD'ına kaçan hata olarak işlendi.
- Görsel kanıt (TY onayı 2026-10-02): tam çekimde 526 görüntünün 446'sı 0 piksel; değişen 40 ekran: normal Dönem Raporu'nu
  çizen Giderler ekranları (R1), borç özetinin 300 px tabanının kalktığı boş durum / yürürlük öncesi / uygulama menüsü
  ekranları (R21), kutusuz `musteri-detay-0067` (R6). Spec'in saydığı beş müşteri detayı ekranı 0 piksel (`ayni`, R19).
