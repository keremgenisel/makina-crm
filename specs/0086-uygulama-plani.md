# 0086 Uygulama Planı: Yedekleme paketleri geri yükledikleri bölümleri tek kaynaktan söyler

Spec: `specs/0086-yedekleme-paketleri-tek-kaynaktan.md` (revizyon 3). Dal `feat/0086-yedek-paketleri` (0085 kapanışı
`9b4de51` üstünde, P4).

## 1. Kodda bulunanlar (spec'e ek, revizyon 3'e işlendi)

- **P1.** `ayarlar-backup` paket listesini çizmiyor (liste yalnız `restoreData` doluyken); araç `kasaVeriYetki` geçmiyor ve
  `Settings.jsx:71` varsayılanı `true`, yani bugünkü ekranlar Kasa'lı daldır.
- **P2.** R9 sözlüğü sunucu adlarıyla birebir aynı olduğu için cümle "proformalar"ı söylemezdi; `teklifler` özel ifade alır.
- **P3.** Altı "çok satırlı" bloğun beşi `sec("id")` ile `restoreData?.X`'i aynı satırda taşıyor; tarama genel desenle, iki
  yönlü; tek istisna Müşteri'nin çek payı.
- **P4.** 0085 main'e alınmadı; dal ve kanıt tabanı `9b4de51`.

## 2. Kararlar (TY onayı, 2026-10-14)

P1–P4 yukarıdaki gibi. Ayrıntı spec'in "Plan onayı kararları" tablosunda.

## 3. Dosyalar

**Yeni:** `src/lib/bolumAdlari.js` (32 blob bölümünün adları + iki e-posta ek adı, `paketCumlesi`),
`src/lib/yedekPaketleri.js` (dokuz paketin saf tanımı, `restorePaketleri({ giderYetki })`, notlar); testler
`tests/yedek-paketleri-0086.test.js`, `tests/ui/yedek-paketleri-0086.test.jsx`,
`tests/ui/yedek-paketleri-0086-davranis.test.jsx`; fikstür `tests/fixtures/0086-geri-yukleme-once.json` (spec öncesi kodla).

**Kaynak:** `src/components/settings/SettingsBackup.jsx` (liste, cümle, üç not; geri yükleme dalı dokunulmaz).

**Araç ve belgeler:** `scripts/evidence/0009-sayfa.jsx` (üç `ayarlar-backup-paketler*` ekranı),
`docs/evidence/kanit-eslemesi.json`, `CLAUDE.md`, `specs/README.md` (0086 satırı, açık bulgu X7),
`tests/spec-atiflari.test.js` (`TASINACAK`).

## 4. Adım sırası

1. Önce fikstür: AC-18'in setter izi bugünkü kodla (`IZ_YAZ=1`).
2. Saf katman: sözlük, paket tanımı, cümle; motor testleri.
3. Bileşen: liste ve cümle yeni modülden, üç not; taramalar ve fikstür karşılaştırması.
4. Ekran testleri; üç var olan geri yükleme testi dokunulmadan yeşil.
5. Görsel kanıt (taban `9b4de51` + yeni araç kopyası, parçalı), kanıt eşlemesi.
6. CLAUDE.md, README, `TASINACAK`; tam `npm test` ve lint.

## 5. Kriter ↔ test

M = `tests/yedek-paketleri-0086.test.js`, U = `tests/ui/yedek-paketleri-0086.test.jsx`,
D = `tests/ui/yedek-paketleri-0086-davranis.test.jsx`.

| AC | Kanıt |
|---|---|
| AC-1, AC-2 | M paket şekli, iki girdi biçimi, `ekler` |
| AC-3, AC-8, AC-9 | M cümle içeriği; U ekranda |
| AC-4 | U dokuz cümle; M boş cümle koruması taraması |
| AC-5 | M `trLower` sonucu ve `toLowerCase` taraması |
| AC-6 | M çek payları |
| AC-7 | D tahsilatsız çekli yedek senaryosu |
| AC-10, AC-11, AC-12 | U üç not ve yetki dalları |
| AC-13 | U bildirim metni; D bütün senaryolarda |
| AC-14 | M iki yönlü satır taraması + tek istisna |
| AC-15 | M birleşim = sunucu `BOLUM_ADLARI` anahtarları |
| AC-16 | M iki sözlüğün eşitliği (sunucu metinden ayrıştırılır) |
| AC-17 | M kimlik sayacı kuralı + CLAUDE.md metni |
| AC-18 | D fikstürle birebir |
| AC-19 | üç dosya dokunulmadan yeşil |
| AC-20 | U kimlik, sıra, sayı, varsayılan seçim, Tümünü Seç/Kaldır, gider kuralı |
| AC-21 | `0086-piksel-raporu.json` |
| AC-22, AC-23 | M taramalar |

## 6. Sapmalar ve notlar

- **Notların veri biçimi:** spec R1 paket başına tek `not?` diyordu; Giderler paketinin iki notu var (R5 gider ayarları, R8
  Kasa'sız), bu yüzden alan `notlar: [{ metin, yalnizKasasiz? }]` oldu ve görünen notları `paketNotlari` seçer. Koşul
  yalnız metni seçer, seçili kümeye dokunmaz (R6, AC-20).
- **Fikstür bir kez yeniden üretildi:** ilk sürümde davranış testi paket kutularını sayfanın bütün onay kutularından
  seçiyordu ve "Otomatik Yedekleme" kutusunu da tıklıyordu (izde fazladan bir `setAppSettings`). Test paket kutusuyla
  sınırlandı; fikstür bileşenin taban (`9b4de51`) hâli geçici olarak geri alınarak yeniden üretildi, yani hâlâ spec
  öncesi kodun izidir.
- **Mutasyonla ölçüldü:** bölüm başka paketin dalına taşınınca, paket listesinden bir bölüm düşünce, Kasa notu koşulsuz
  olunca ve müşteri kalan borç yuvarlaması kaldırılınca testler düşüyor.
- **Görsel kanıt (AC-21):** taban `9b4de51` (yeni araç kopyasıyla) ↔ bu iş, 684 görüntü, çizim hatası yok. Değişen tam
  olarak `kilit-geri-yukleme` ve üç yeni `ayarlar-backup-paketler*` ekranı; `ayarlar-backup` 0 fark. Gürültü:
  `uygulama-menu-kasali` (31/37 px) ve `servis-formu-0079` (249 px) taban kodun ikinci çekiminde de aynı farkı verdi; tabanı
  ikinci çekimle alındı, dal çekimi 0 fark. Taban raporu (değişen 4 ekran bugünkü kodla) 0 fark.
- **Gözlem (kapsam dışı, C4):** cümleler uzadığı için "Müşteri verileri" ve "Stok ve üretim" adları dar pencerede iki
  satıra kırılıyor; spec yalnız cümle içeriğinin değişmesine izin verdiği için yerleşime dokunulmadı.
- **Triyaj (2026-10-14):** (1) Dosyalar paketine not: dosyaların kendisi yedek açılırken depoya eklenir (aynı adlı dosyanın
  üzerine yazılır), kutu yalnız dosya listesini geri yükler; dayanağı (iki köprü çağrısı ve üzerine yazan yazım) taranır;
  dört paket ekranı yeniden çekildi. (2) `KASASIZ_NOTU`'nun dayanağı olan üç App satırı (`setKasaHesaplari`,
  `setKasaKapsamDisi`, `kasaVeriYetki` Kasa sekmesine bağlı) birlikte taranır. (3) Spec R1 `notlar` biçimi, DoD kanıt
  kümesi ve Context kanıt tablosunun "tarihseldir" işareti. (4) README'de 0086 satırının önüne boş satır.
