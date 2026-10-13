# 0082 Uygulama Planı: Standart Genel Giderler kalkar, Tedarikçiler görünümü yeniden adlandırılır

Spec: `specs/0082-standart-genel-giderler-kalkar-tedarikci-adi.md` (revizyon 2). Dal `feat/0082-standart-kalkar` (0081 kapanışı
`8dc7bc2` üstünde). Plan Takım Yöneticisi tarafından 2026-10-13'te onaylandı (bütün öneriler kabul).

## 1. Kodda bulunanlar (spec'e ek)

- Ayak izi: C9 kimliklerinin geçtiği 25 kaynak dosyası (biri silinen ekran) ve 67 test dosyası.
- Ölü `kaynak` anahtarı üç düzeyde: sonuç (`makinaMaliyeti.js:337`), makina satırı (`:374`), kârlılık özeti (`:471`). Başka alan
  aynı adı kullanmıyor (üretim tarihi kaynağı `uretimKaynak`).
- Karışık sürüm: `serverAuth.degisenBolumler` gövdede `undefined` olan bölümü atlar (`:194`); yeni istemci → eski sunucu 403
  vermez, eski yazma yolu diziyi görmediği için tabloyu boşaltmaz; eski istemci → yeni sunucu bölümü tanımaz.
- `Giderler` başlangıç görünümünü doğrulamıyor (`useState(baslangicGorunum || "rapor")`).
- 0076 altın fikstürü standart çıktıyı `maliyetStandart` anahtarında tutar; gerçekleşen çıktıda da ölü anahtarlar var.
- `aktifKullanici` `Giderler`'de yalnız standart ekrana gidiyor.

## 2. Dosyalar

Silinen: `src/components/gider/StandartGiderler.jsx`, `tests/ui/standart-giderler.test.jsx`.

Kaynak: `src/lib/gider.js`, `src/lib/makinaMaliyeti.js`, `src/components/Giderler.jsx`, `gider/Tedarikciler.jsx`,
`gider/MakinaMaliyetDetay.jsx`, `gider/MakinaKarliligi.jsx`, `gider/MakinaModelGorunumu.jsx`, `gider/FiyatOnerisi.jsx`,
`settings/SettingsGider.jsx`, `settings/SettingsTrash.jsx`, `settings/SettingsBackup.jsx`, `Settings.jsx`,
`settings/SettingsAuditLog.jsx`, `GlobalSearch.jsx`, `lib/aramaGider.js`, `lib/copKutusu.js`, `lib/merge.js`,
`lib/kilitAlanlari.js`, `App.jsx`, `electron/serverAuth.cjs`, `electron/server.cjs`, `electron/db.cjs` (tablo tanımı kalır, X1).

Testler: yeni `tests/standart-kalkar-0082.test.js`, `tests/ui/standart-kalkar-0082.test.jsx`, `tests/fixtures/0082-maliyet-once.json`;
Electron `scripts/tests/db-roundtrip.cjs`, `db-clean-install.cjs`, `server-security.cjs`; ~45 test dosyası güncellenir.

Kanıt ve belgeler: `scripts/evidence/0009-sayfa.jsx`, `scripts/tests/layout/{donem-raporu,calisan,gider-tanim}.jsx`,
`docs/evidence/kanit-eslemesi.json`, `docs/tasarim-sozlugu.md`, `CLAUDE.md`.

## 3. Kararlar (TY onayı, 2026-10-13)

P1–P11 spec'in "Plan onayı kararları" bölümünde (revizyon 2).

## 4. Adım sırası

1. Dal, spec revizyonu, plan; spec başlığı ve README satırı "Uygulanıyor".
2. Kod değişmeden "önce" fikstürü (`YAZ_0082=1`): standart satırı dolu, ayarı "gercek" veride motor çıktısı (AC-8).
3. Motor: `makinaMaliyeti.js`, `gider.js`; motor testleri, 0076 karşılaştırması (C1/3), AC-7/AC-8.
4. Ekranlar ve ayar.
5. Uygulama durumu ve çevresi (App, yedek, birleştirme, çöp, arama, kilit, etiketler).
6. Sunucu ve veritabanı, Electron testleri.
7. Testlerin temizliği (C7'nin dört noktası).
8. Kaynak taraması (AC-31) en son.
9. Kanıt (görüntü aracı, çekim, taban), kanıt eşlemesi, belgeler, `npm test` (Electron dahil), lint.

## 5. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1…AC-6, AC-9…AC-16, AC-20, AC-21, AC-27, R10 | `ui/standart-kalkar-0082` |
| AC-7, AC-8, AC-24, AC-25 (tarama), AC-26, AC-29, AC-31, AC-34, AC-35 | `standart-kalkar-0082.test.js` |
| AC-17 | `server-authz` + `server-security.cjs` (Electron) |
| AC-18, AC-19, AC-25 (SQL) | `db-roundtrip.cjs`, `db-clean-install.cjs` (Electron) |
| AC-22 | `server-authz` + `standart-kalkar-0082.test.js` (`BOLUM_ADLARI ⊆ BLOB_SECTIONS`) |
| AC-23 | `standart-kalkar-0082.test.js` (`buildMergePlan`) + `merge.test.js` (kalan bölümler) |
| AC-28 | `ui/standart-kalkar-0082` + `ui/genel-arama-0026` (0026 AC-35) |
| AC-30 | `islem-gecmisi-etiketleri.test.js` ("spec 0082 AC-30") |
| AC-32 | `ui/modal-dugme-boslugu` ("spec 0082 AC-32") |
| AC-33 | `standart-kalkar-0082.test.js` taraması + güncellenen beş test |

## 6. Sapmalar ve notlar

- **P1 istisna listesine iki dosya eklendi (gerekçeli):** `tests/fixtures/0082-olu-anahtar.js` (ayıklama hem 0082 hem 0076
  karşılaştırmasında kullanılıyor; test dosyasından içe aktarmak onun testlerini de çalıştırırdı) ve `src/components/settings/SettingsGider.jsx`
  (R2/2: eski anahtarı düşürmek için adı yazmak zorunda). Ayrıca `electron/db.cjs` (X1: ölü tablonun `CREATE TABLE` satırı; taramada
  yalnız o satırın kaldığı ayrıca ölçülür).
- **Ölü anahtar biçimi (P2):** gerçekleşen kipte de ay kaydı `standartEksik` dolu olabiliyordu (sürümü olmayan grup adları, ör.
  `["Su"]`); biçim denetimi "dizi" olarak yazıldı. `kaynak` üç düzeyde ayıklandı.
- **AC-21'in önce kümesi** bu işten önceki kodla geçici bir worktree'de aynı yedek alma adımıyla ölçüldü ve testte sabitlendi.
- **AC-37 sayıları (0078):** canlı/ham prop geçişi 14/16 → 12/15 (arama ve Giderler'in canlı, Ayarlar'ın ham standart geçişi kalktı);
  `purgeOldTrash` 27 → 26; `TABLES_WITH_TRASH` 23 → 22.
- **Görüntü aracında iki sessiz adım düzeltildi:** tedarikçi sekmesine adıyla tıklayan dokuz adım yeni ada çevrildi (taban ağacının
  kopyasında eski adla bırakıldı, yoksa taban ekranları sessizce Dönem Raporu'nu çekerdi); `giderler-0072-karlilik` kaldırılan "Ortak
  gider kaynağı" satırına kaydırıyordu, hedef dağıtım notu oldu.
- **Triyaj (kanıt):** Çöp Kutusu ve izin ekranının "önce" görüntüsü HEAD'deki araçla (standart veriyle) yeniden çekildi; ilk çekimde
  "önce" tarafı yeni araçla çekildiği için Çöp Kutusu'nun standart satırı iki tarafta da yoktu. Çöp Kutusu kaydı `degisti` + onay;
  izin ekranının (`UserManager.jsx`, sözlüğü kullanmaz) eşlemede kaydı olamaz (küme eşitliği, 0052/0066 emsali), değişimi raporda ve
  0082 testinde ölçülür.
- **Mutasyon ölçümü:** ad geri → AC-1…AC-4, AC-6; R10 doğrulaması yok → R10; ayar anahtarı yayılır → AC-10; motor eski → AC-7, AC-8,
  AC-31; yedek eski → AC-21; `db.cjs` eski → AC-18 (dört), AC-19; sunucu haritaları eski → AC-17 (iki); `standart_gider` etiketi geri →
  AC-30.
- **Dokunulan kaynak dosyalar:** §2'deki liste (silinen `gider/StandartGiderler.jsx` dahil); sunucu yalnız haritalar, `db.cjs` yalnız
  okuma, yazma, kimlik sayacı ve çöp tablosu listesi.

## 7. Sürüm notu

> Giderler sekmesindeki **Standart Genel Giderler** görünümü kaldırıldı. Makina maliyetinin ortak gider payı artık her zaman
> gerçekleşen gider kayıtlarından hesaplanır; Ayarlar › Gider Ayarları'ndaki "Makina maliyetinde ortak gider kaynağı" seçimi
> kalktı. **Bu ayar "Aylık standart genel giderler" seçili olan kurulumlarda makina maliyeti ve kârlılık rakamları değişir.**
> Girilmiş standart gider satırları silinmez, yalnız kullanılmaz. Giderler'deki "Tedarikçiler" görünümünün adı artık
> **"Tedarikler ve Ekstre"**; tedarikçi kayıtları, izinler ve arama değişmedi.
>
> **ÖNEMLİ:** önce sunucu bilgisayarını, sonra bütün istemcileri güncelleyin. Güncellenmemiş bilgisayarlarda Standart Genel
> Giderler ekranı hâlâ görünür, ama orada yapılan değişiklikler kaydedilmez; güncelleme bitene kadar bu ekranı kullanmayın.
