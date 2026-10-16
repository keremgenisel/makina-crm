# 0087 Uygulama Planı: Parça maliyeti ve ürün ağacı adetleri

Spec: `specs/0087-parca-maliyeti-ve-urun-agaci.md` (revizyon 3). Dal `feat/0087-parca-maliyeti` (taban `4110a6a`, v3.46.0).

## 1. Kodda bulunanlar (spec'e ek, revizyon 3'e işlendi)

- **P1.** Gider klasörünün dışında sekiz dosya `TutarInput`'u `GiderAlanlari`'ndan alıyor (`GiderForm`, `CalisanManager`, `Kasa`,
  `SettingsGider`, `SettingsGiderTanimlari`, `cek/CekEklePenceresi`, `cek/CiroPenceresi`, `kasa/CalisanAvanslari`); AC-3'ün taraması
  bunlarla çelişiyordu.
- **P2.** `useSimpleDefList`'i üç panel paylaşıyor (`KalipManager`, `PartManager`, `CalisanManager`; `PartTypeManager` bilinçli
  olarak kullanmıyor, plan sunulurken yanlışlıkla dört sayılmıştı).
- **P3.** `add` kimliği kendi içinde üretip yalnız `true` dönüyor; yeni parçanın kit satırı kimlik ister.
- **P4.** Kanca formu olduğu gibi yazıyor; maliyet formda ham metindir.
- **P5.** `db.cjs`'in `bosOlmayan` yardımcısı parçaların okunduğu satırdan sonra tanımlı. Uygulamada taşınmadı: parça okuması tek
  alan için koşullu yayma kullanır (`...(maliyet == null ? {} : { maliyet })`), model okuması `ekMaliyetOku` (bkz. §6).
- **P6.** App Settings'e `liveCustomModels` ve `liveParts` veriyor, setter'lar tam dizide: yazım işlevsel güncelleyiciyle tam diziye.

## 2. Kararlar (TY onayı, 2026-10-16)

Spec'in "Uygulama planı kararları" tablosu (P1–P11): sekiz içe aktarma `ui`'ya, `tutarMetni` `tutarGirdisi.js`'e; dönüş değeri
kimlik; kancaya `hazirla`; kilit denetimi yalnız karşı bölüme yazılacaksa ve reddedilirse kayıt bütünüyle yazılmaz; çöpteki modelin
işareti korunur; işaret kaldırmada onay yok, ipucu var; model satırı "Model · Adet"; tam görsel tur; gövde fikstürü taban koddan;
ek kalem JSON `{ ad, tutar }`.

## 3. Dosyalar

**Yeni:** `src/lib/urunAgaci.js` (tek yazma yolu ve doğrulayıcılar), `src/lib/parcaAktarma.js` (dışa aktarma satırı, içe aktarma
satır çözümü), testler `tests/urun-agaci-0087.test.js`, `tests/parca-aktarma-0087.test.js`, `tests/ui/parca-maliyeti-0087.test.jsx`,
`tests/ui/ek-maliyet-0087.test.jsx`, `tests/ui/stok-kit-0087.test.jsx`, fikstürler `tests/fixtures/0087-*.json`.

**Değişen:** `ui.jsx` (`TutarInput`), `tutarGirdisi.js` (`tutarMetni`), `GiderAlanlari.jsx` (yeniden dışa verme), sekiz içe aktarma
satırı, `useSimpleDefList.js`, `PartManager.jsx`, `ModelsManager.jsx`, `Settings.jsx`, `SettingsExport.jsx`, `SettingsImport.jsx`,
`electron/db.cjs`, `scripts/tests/db-roundtrip.cjs`, `scripts/tests/db-clean-install.cjs`, `tests/server-authz.test.js`,
`tests/merge.test.js`, `src/types.d.ts`, `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/kanit-eslemesi.json`, `CLAUDE.md`,
`specs/README.md`, `tests/spec-atiflari.test.js`.

## 4. Adım sırası

0. Dal, spec revizyonu 3, bu plan.
1. Fikstürler taban kodla (gövde, aktarma, stok hareketi; taban görsel raporu ayrı worktree'de).
2. Saf katman ve testleri.
3. Veritabanı (dört nokta).
4. `TutarInput` taşıması; gider testleri dokunulmadan yeşil.
5. Kanca.
6. Paneller ve Settings bağlantısı, kilit.
7. İçe ve dışa aktarma.
8. Sunucu ve birleştirme ölçümleri (kod değişmez).
9. Tipler, görüntü aracı, görsel kanıt, belgeler; Electron dahil tam test ve lint.

## 5. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1, AC-5 | `ui/parca-maliyeti-0087` |
| AC-2, AC-3 | `urun-agaci-0087` (çözüm ve taramalar) |
| AC-4, AC-25 | `db-roundtrip.cjs` (gövde fikstürü) + `ui/parca-maliyeti-0087` / `ui/ek-maliyet-0087` (kancadan gövdeye) |
| AC-6 | `urun-agaci-0087` (satış dosyaları taraması, `partFiyatForCurrency`) |
| AC-7, AC-15, AC-26 | `urun-agaci-0087` (saf) + iki UI dosyası |
| AC-8, AC-9 | `ui/parca-maliyeti-0087` |
| AC-10…AC-14, AC-16 | `urun-agaci-0087` + `ui/parca-maliyeti-0087` |
| AC-12 (Stok süzgeci) | `ui/stok-kit-0087` |
| AC-17, AC-18 | `urun-agaci-0087` + `ui/ek-maliyet-0087` + `ui/parca-maliyeti-0087` |
| AC-19, AC-24 | `urun-agaci-0087` taramaları |
| AC-20 | `ui/parca-maliyeti-0087` (üç panel) |
| AC-21, AC-34 | `ui/parca-maliyeti-0087`, `ui/ek-maliyet-0087` |
| AC-22 | `ui/ek-maliyet-0087` |
| AC-23, AC-27 | `ui/stok-kit-0087` |
| AC-28 | `urun-agaci-0087` + `ui/parca-maliyeti-0087` |
| AC-29, AC-30 | `parca-aktarma-0087` |
| AC-31 | `db-roundtrip.cjs`, `db-clean-install.cjs` (Electron) |
| AC-32, AC-33 | `ui/parca-maliyeti-0087` |
| AC-35, AC-36 | `server-authz` 0087 bloğu |
| AC-37 | `merge.test.js` 0087 bloğu |
| AC-38 | `urun-agaci-0087` taraması + `makina-maliyeti.test.js` dokunulmadan |

## 6. Sapmalar ve notlar

- **S1.** Kancayı paylaşan panel sayısı plan sunulurken dört yazıldı; `PartTypeManager` kancayı kullanmıyor (yalnız yorumunda adı
  geçiyor). Spec revizyon 3 ve bu plan üçe düzeltildi; AC-20'nin testi `KalipManager` ve `CalisanManager`'ı kapsar.
- **S2.** `bosOlmayan` taşınmadı (P5); tek alanlık koşullu yayma aynı sonucu verir ve gider okumasının yardımcısına bağımlılık açmaz.
- **S3.** `tutarMetni` sekiz dosyada `GiderAlanlari`'ndan alınmaya devam ediyor (yeniden dışa verme); yalnız `TutarInput` `ui`'ya
  çevrildi. Gerekçe: içe aktarma satırı eklemek `docs/tasarim-sozlugu.md`'nin `dosya:satır` atıflarını kaydırıyordu (ölçüldü,
  `tasarim-kaynak` AC-20); AC-3'ün taraması yalnız tutar ALANINI yasaklar.
- **S4.** Aktarmanın taban fikstürü (`0087-aktarma-once.json`) bileşenden **aynen taşınmış** çekirdekten, maliyet eklenmeden önce
  üretildi (`scripts/tests/0087-aktarma-fikstur.mjs`); gövde fikstürü taban kodla Electron'da (`scripts/tests/0087-govde-fikstur.cjs`).
- **S5.** Model kartının kit adedi artık ham metindir ve kayıtta `kitAdediDogrula`'dan geçer (AC-15 "iki kapıda aynı"). Davranış farkı:
  eskiden boş, 0 ya da negatif adet sessizce 1'e (negatif olduğu gibi) çekiliyordu, artık satır hatası verir.
- **S6.** Görüntü aracı düzenleme penceresini açabilsin diye iki panelin kalem düğmesine `title="Düzenle"` eklendi (görünmez, araç
  `baslik:Düzenle` adımıyla basar). Spec'in üç yeni ekranına ek olarak `katalog-parca-yeni` (maliyetsiz yeni kayıt formu) çekildi.
- **S7.** Parça içe aktarmasında geçersiz maliyet satırı atlatmaz, yalnız maliyet alınmaz ("Satır n: … Maliyet alınmadı.").
- **S8. Görsel kanıt (P9, tam tur).** Taban `4110a6a` ↔ bu iş, 692 görüntü, çizim hatası yok. İlk karşılaştırmada 42 görüntü farklıydı:
  12'si beklenen (`ayarlar-yedekparca`, `katalog-model` ve dört yeni ekran, iki temada), 30'u gürültü. Gürültü taban kodu kendisiyle
  yeniden çekerek kanıtlandı (aynı 31–249 piksel), bu ekranlar iki kodla aynı anda yeniden çekilince 0 piksel. `katalog-model` ve
  `katalog-parca-yeni` tam turun içinde ve tek başına çekimde sabit 166 piksel ayrışıyor (odaklı form); iki tarafı da tek başına
  çekimle aldım. Sonuç `0087-piksel-raporu.json`: yalnız beklenen 12 görüntü değişti, `ayarlar-models` 0 piksel. Taban raporu
  `0087-taban-piksel-raporu.json`: değişen 12 görüntü taban kodla, 0 fark.
- **S9. Triyaj (2026-10-16, dört bulgu).** (1) "Kitten düşecek" ipucu yalnız kayıttaki işaretten bu düzenlemede kaldırılan modele;
  işaretsiz ama kitte olan model (0087 öncesi yeniden adlandırma kalıntısı) ayrı bilgi satırı (`isaretsizKitteMetni`), kayıt o kite
  dokunmaz. İşaretin kite göre uzlaştırılması davranış değişikliği olur, TY kararına bırakıldı. (2) İçe aktarmada tek noktalı ve
  noktadan sonra 3+ haneli metin maliyet belirsiz sayılır ve alınmaz (`MALIYET_BELIRSIZ_DESEN`; `tutarCoz` gider tarafıyla ortak,
  dokunulmadı). Bilinen sonuç: Türkçe binlikli "1.234" metni de alınmaz, "1234" ya da "1.234,00" yazılmalı. (3) Kit yazma kararı tam
  özel model dizisiyle (`rawCustomModels`): satır yalnız çöpteki modeldeyse de parça adı taşınır. (4) README'deki `useSimpleDefList`
  bulgusu "Kapatılanlar"a, spec R18 tablosu ve DoD dört ekrana.
