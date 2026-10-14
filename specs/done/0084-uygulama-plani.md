# 0084 Uygulama Planı: Kira stopajı üç aylık beyan dönemiyle ödenir

Spec: `specs/done/0084-kira-stopajinda-uc-aylik-beyan-donemi.md` (revizyon 3). Dal `feat/0084-stopaj-donemi`
(0083 kapanışı `c1c5496` üstünde; C8 sağlandı).

## 1. Kodda bulunanlar (spec'e ek, revizyon 3'e işlendi)

- **D1.** `tests/yerlesim-0083.test.js` AC-25 görüntü aracının iki dosyasını SHA ile sabitliyor; bu iş araca
  yeni ekran eklediği için test "0083'ün ekran adları araçta duruyor" iddiasına çevrilir.
- **D2.** `tests/gider-kasa-raporu-0059.test.js:170`–`:173` karşılaştırmadan önce `gider.vadeler` ve
  `gider.stopaj`'ı ayıklıyor: 0059 altın dosyası bu işle değişmez, test dokunulmadan yeşil kalır.
- **D3.** `odemeHatirlatmalari`'nı üç yer çağırır: `Dashboard.jsx:30`, `Giderler.jsx:87`, `giderRaporu.js:85`.
- 0082 AC-34'ün testi `tests/standart-kalkar-0082.test.js:126`'dadır (düğüm testi).
- `tekrarlayanUret` bugün `odemeSatirlariKur(kalem, dav, {}, …)` çağırır: plan boş, stopaj vadesiz.
- `cek.js` `kasa.js`'i zaten içe alır; çekirdeğin `kasa.js`'e taşınması döngü yaratmaz.

## 2. Kararlar (TY onayı, 2026-10-14)

Spec'in "Plan onayı kararları" tablosu: D1–D3, P1–P10. Kısaca: `tekrarlayanUret`'e `stopajVadeOf`
seçeneği (P1); Anasayfa'da grup satırı personel emsaliyle açılır (P2); gruplama ≥ 2 hedefte (P3);
çekirdek `hesaplar` alır, satır hataları anahtar başına, çek çıktısı birebir (P4); yazım
`odemeGirisiYaz` (P5); hesap/yöntem son kullanılan, çeksiz (P6); hareket bölümü yoksa salt okunur (P7);
"elle değiştirildi" yalnız form durumunda (P8); kanıt tabanı `c1c5496` (P9); README parça sahneleme (P10).

## 3. Dosyalar

**Yeni:** `src/lib/stopajDonemi.js` (ayar okuma ve doğrulama, dönem anahtarı, ödeme tarihi, üç adlandırıcı,
dönem satırları, `stopajAdaylari`), `src/components/gider/StopajDonemleri.jsx`; testler
`tests/stopaj-donemi-0084.test.js`, `tests/ui/stopaj-donemi-0084.test.jsx`,
`tests/gider-kasa-raporu-0084.test.js`; fikstür `tests/fixtures/0084-stopaj-once.json`.

**Kaynak:** `src/lib/kasa.js` (`cokKalemOdemeleri`), `src/lib/cek.js` (iki plan fonksiyonu çekirdeği
çağırır), `src/lib/gider.js` (`tekrarlayanUret` `stopajVadeOf`), `src/lib/odemeHatirlatma.js` (stopaj grubu),
`src/lib/giderRaporu.js` (dönem tablosu, vade dalı), `src/lib/kilitAlanlari.js`,
`src/components/settings/SettingsGider.jsx`, `src/components/GiderForm.jsx`, `src/components/Giderler.jsx`,
`src/components/Dashboard.jsx`, `src/components/gider/OdemeHatirlatma.jsx`, `src/App.jsx`.

**Testler ve araçlar:** `ui/gider-settings`, `ui/form-pencere-boyutu` (`SINIF1`), `standart-kalkar-0082`
(AC-34), `yerlesim-0083` (AC-25), `spec-atiflari` (`TASINACAK`), ek bloklar `gider.test`,
`odeme-hatirlatma`, `ui/gider-form`, `gider-gizlilik`; `scripts/tests/layout/donem-raporu.jsx`,
`scripts/evidence/0009-sayfa.jsx`.

**Dokunulmaz (tarama):** `electron/`, `src/lib/merge.js`, `odemeHedefleri`, `giderKalemDogrula`,
`odemeSatirlariKur`, `0059-*` fikstürleri.

## 4. Adım sırası

1. Dal, spec revizyonu, bu plan, `TASINACAK`, README satırı.
2. Önce fikstürü (bugünkü kodla, `YAZ_0084=1`): stopajlı veride dönem raporu, kova, makina maliyeti (AC-35).
3. Saf katman: `stopajDonemi.js`, çekirdek taşıma (çek testleri dokunulmadan), `tekrarlayanUret`
   seçeneği, hatırlatıcı gruplaması, rapor.
4. Ekran: ayar, form, pencere ve başlık düğmesi, Dashboard penceresi, App prop'u.
5. Testler ve mutasyon; kayıt listeleri; Electron yerleşim düzeneği.
6. Görsel kanıt (önce `c1c5496` taban ağacında, sonra bu dalda; parçalı; taban iki parçada).
7. Belgeler, Electron dahil `npm test`, `npm run lint`.

## 5. Kriter ↔ test

| Kriter | Nerede |
|---|---|
| AC-1, AC-2, AC-4 | `ui/gider-settings` 0084 bloğu (C9) |
| AC-3, AC-5–AC-9, AC-13, AC-14, AC-35, AC-36, AC-39 | `stopaj-donemi-0084` |
| AC-10, AC-11 | `ui/gider-form` 0084 bloğu |
| AC-12 | `gider.test.js` tekrarlayan bloğu + `stopaj-donemi-0084` (hatırlatıcıya girer) |
| AC-15–AC-28 | `ui/stopaj-donemi-0084` |
| AC-29 | `ui/stopaj-donemi-0084` + `standart-kalkar-0082` AC-34 |
| AC-30 | `odeme-hatirlatma` 0084 bloğu + `ui/stopaj-donemi-0084` (Anasayfa penceresi) |
| AC-31, AC-33 | `gider-kasa-raporu-0084` + 0059 testi dokunulmadan |
| AC-32 | `cek.test.js`, `cek-0049.test.js` dokunulmadan + `stopaj-donemi-0084` taraması |
| AC-34 | `gider-gizlilik` 0084 bloğu |
| AC-37 | `kilit-alanlari`, `ui/form-pencere-boyutu` |
| AC-38 | `donem-raporu-yerlesim` (Electron) |

## 6. Sapmalar ve notlar

- **Pencerenin kapsamı tam ödenmiş kalemi de içerir (R13'ün harfinden sapma; triyajda TY onayladı, spec revizyon 4).** R13 kapsamı
  `borcKapsamindaMi` olarak yazıyor; o kural tam ödenmiş kalemi (kira ve stopajı kapanmış) dışarıda bırakır. Uygulanınca
  fikstürdeki stopajı erken ödenmiş Ocak kirası 1. dönemden düşüyor, dönemin "kesilen" rakamı eksik görünüyor ve R13'ün
  "Kapanmış dönemleri göster" seçeneği hiç dolmuyordu (kapanmış dönem ancak kirası açık kalemlerden oluşabilirdi). Uygulama:
  aynı tek kural, yalnız "tam ödenmiş" şartı hariç (`borcKapsamindaMi({ ...k, odendi: false }, …)`, `stopajDonemi.js`'te
  gerekçesiyle). Açık tutar ve toplamın açık kısmı `stopajOzeti(borç kapsamındaki kalemler)` ile birebir aynı kalır (AC-16
  testi bunu ölçer); kesilen artık dönemin gerçek toplamıdır.
- **Tarih biçimi.** R8'in örnek ipucu "26.04.2026" yazıyor; uygulamanın bütün ekranları `fmtTR` ile "26/04/2026" yazar.
  Ekran tutarlılığı için uygulamanın biçimi korundu (ipucu, pencere). Raporda `raporSunumu.gun` biçimi (noktalı) kullanılır.
- **AC-12'nin testi** `tests/stopaj-donemi-0084.test.js`'te (planın §5'inde `gider.test.js` yazıyordu; aynı dosyada vade,
  satır yapısı ve hatırlatıcıya girme birlikte ölçülüyor).
- **Rapor nesnesi.** Beyan dönemi tablosu `gider.stopaj.donemler` alanıdır; 0060 AC-14 ve 0081 AC-4'ün birebir nesne iddiaları
  üç rakamı ayrıca karşılaştıracak biçimde güncellendi (yorumlarında "spec 0084 ile güncellendi"). 0059 altın testi
  `gider.stopaj` ve `gider.vadeler`'i zaten ayıkladığı için dokunulmadı (D2 ölçüldü).
- **Gizlilik taraması.** 0059'un "`.taraf` yalnız bir satırda" kaynak taraması nedeniyle raporun stopaj satırının tarafı
  hatırlatıcı satırından değil `VERGI_DAIRESI` sabitinden okunur (değer aynı).
- **Hatırlatıcı grubu** dönemin tam adını da taşır (`donemTamAdi`); rapor satırı "Kira stopajı · 2026 1. dönem (Ocak-Mart) ·
  2 kalem" yazar ("… kira stopajı" tekrarı olmasın diye).
- **Sözlük atıfları.** `Giderler.jsx`'e satır eklendiği için `docs/tasarim-sozlugu.md`'nin üç `Giderler.jsx:<satır>` atfı
  yeniden eşlendi (0081'in dersi; `tasarim-kaynak` AC-20).
- **Mutasyonla ölçüldü.** On dört mutasyonun hepsi yakalandı. Gider formundaki ön doldurmanın birbirini yedekleyen iki
  koruması (ilk durum ve efekt) teke indirildi; aksi hâlde hiçbiri tek başına ölçülemiyordu.
- **Triyaj (2026-10-14), altı bulgu:** (1) son yöntem listede yoksa (düz "Çek") varsayılan boş; (2) hesap seçici kimliği
  hesabın kendi kimliğine çevirir (OdemeGirisi deseni); (3) spec revizyon 4 (R13, AC-16, AC-11); (4) dönem satırları
  `stopajAdaylari`'ndan kurulur, kopya kalktı; (5) "Satır" sütunu `satirSayisi` (ödenmişler dahil); (6) test dosyasında satır sonu.
