# 0075 Uygulama Planı: Tevkifatlı Fatura Girişi (gider tarafı)

| | |
|---|---|
| **Bağlı spec** | `specs/0075-tevkifatli-fatura-girisi.md` (R2, plan onayıyla) |
| **Dal** | `feat/0075-tevkifat` (`feat/0074-sgk-turu` `e660e20` üstünde, R38) |
| **Onay** | Takım Yöneticisi, 2026-10-07: bütün öneriler (S1–S13) kabul |

## 1. Kodda bulunanlar (spec'e ek)

- Kira özet kutusu formun **sağ sütunundadır**; normal kalemin de orada kendi özeti (`normal-ozet`) var ve "Ödenecek"
  satırı yerel toplamayla tutar + tam KDV yazar (S2 → R12, AC-41).
- `giderKalemDogrula` plan nesnesini kendisi kurar (`gider.js:613`), form alanlarını siler (`:614`) ve vade doğrular
  (`:618-619`); spec'in "beş yer"i yediye çıkar (S7 → R18).
- Tanım formu doğrulamayı satır içinde yapar, `giderKalemDogrula`'yı çağırmaz (S5 → R39).
- Tanımın ana vadesi, stopaj taksiti ve vadesi yoktur; `tekrarlayanUret` `odemeSatirlariKur`'u boş planla çağırır (S3, S4).
- KDV karşılaştırma kartı Finans'ta ve Giderler'de çizilir (`Finance.jsx:67`, `Giderler.jsx:124`) (S9 → R28).
- 0059'un altın karşılaştırması rapor nesnesinin yeni alanlarını ayıklayarak yapılır (S10 → R42).

## 2. Dosyalar

- Motor: `src/lib/gider.js`, `src/lib/odemeYontemi.js`, `src/lib/formOdemesi.js`, `src/lib/acikKalemler.js`,
  `src/lib/odemeHatirlatma.js`, `src/lib/giderRaporu.js`.
- Arayüz: `src/components/GiderForm.jsx`, `src/components/settings/SettingsGiderTanimlari.jsx`,
  `src/components/gider/DonemRaporu.jsx`, `src/components/gider/KdvKarsilastirmaKarti.jsx`, `src/components/Finance.jsx`,
  `src/components/Giderler.jsx`.
- Veritabanı: `electron/db.cjs` (`GIDER_TEVKIFAT_COLUMNS`, iki tablo).
- Testler: yeni `tests/tevkifat-0075.test.js`, `tests/ui/tevkifat-0075.test.jsx`, `tests/gider-kasa-raporu-0075.test.js`;
  ek bloklar `hedef-adlari-0060`, `ui/finance-gider-kdv`, `gider-kasa-raporu-0059` (ayıklama), `db-roundtrip.cjs`,
  `db-clean-install.cjs`.
- Kanıt: `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/kanit-eslemesi.json`, `docs/evidence/0075-*`.
- Belgeler: `CLAUDE.md`.

Sunucu, izin, merge değişmez (C4).

## 3. Kararlar

S1 → R38 · S2 → R12, AC-41 · S3 → R18, AC-44 · S4 → R26 · S5 → R10, R39 · S6 → R10 · S7 → R18, R40 · S8 → R41 ·
S9 → R28 · S10 → R42 · S11 → DoD sürüm notu · S12 → R43 · S13 → R44.

## 4. Adım sırası

1. Dal; taban ayrı çalışma ağacından (`e660e20`), üç parçada; çekim sürerken test koşulmaz.
2. `gider.js` ve motor testleri (AC-6/7/8 rakamları, hedef doğma, çapraz eşitlikler, doğrulama).
3. Diğer motor dosyaları (ad, ciro nedeni, açık kalemler, hatırlatıcı, `kdvKarsilastir`, rapor).
4. Veritabanı ve roundtrip/temiz kurulum testleri.
5. Arayüz (gider formu, tanım formu, liste ibaresi, KDV kartı) ve bileşen testleri.
6. Eski testlerin güncellenmesi (0060 listeleri, 0059 ayıklama).
7. Tam takım, Electron testleri, lint; görsel kanıt; `CLAUDE.md`, plan §6, sürüm notu.

## 5. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1, 2, 3, 5 | `ui/tevkifat-0075` + motor (kapalıyken alanlar kayıtta yok) |
| AC-4, 43 | `ui/tevkifat-0075` + kaynak taraması |
| AC-6, 7, 8, 39 | `tevkifat-0075` |
| AC-9 | kaynak taraması |
| AC-10, 11, 12 | motor + ui |
| AC-13 | motor + ui |
| AC-14, 15, 16, 41, 42 | `ui/tevkifat-0075` |
| AC-17, 18, 20, 40, 44, 45 | motor + ui |
| AC-19, 46 | `hedef-adlari-0060` + kaynak taraması |
| AC-21, 22 | motor + ui |
| AC-23, 24, 25, 26, 50 | motor |
| AC-27, 48 | `gider-kasa-raporu-0075` + 0059 altın dosyası |
| AC-28, 47 | motor + ui |
| AC-29, 30, 31, 49 | motor + `ui/finance-gider-kdv` |
| AC-32, 33 | `makina-maliyeti`, `gider.test`, `kdv-dahil-0071` dokunulmadan yeşil + motor çaprazı |
| AC-34, 35, 36, 37 | `db-roundtrip.cjs`, `db-clean-install.cjs` + motor |
| AC-38 | kaynak taraması |

## 6. Uygulama notları

- **Taban:** ayrı çalışma ağacından (`e660e20`), üç parçada. İlk çekim, oturum geçişinde silinen parçalama betiği yüzünden
  bölünmeden başladı; durdurulup betik yeniden kurularak baştan alındı.
- **Kutu kapalı form ve C3 (bulgu):** DoD "kutu kapalı gider formu 0 piksel" diyor, ama R1 kutunun kendisini normal kalemin
  formuna ekler; yani normal davranışlı form ekranları kutu satırı kadar değişir. C3'ün ölçülebilir kanıtı kira, personel ve
  SGK formları (kutu yok) ile tevkifatsız listeler, raporlar ve KDV kartıdır: bunlar 0 piksel beklenir.
  Triyajda (2026-10-07) spec'in DoD kanıt maddesi bu ölçütle değiştirildi (TY onayı); kanıt raporu 0 piksel ölçtü.
- **AC-21 ölçümü:** ödeme penceresi tek hedefle açılınca hedef bloğunun neden satırı çizilmez (bugünkü `OdemeGirisi` dalı);
  kriter motorda (çek satırının reddi ve tevkifatın kendi metni) ve pencerede (tevkifat hedefinde çek yöntemlerinin
  sunulmaması) ölçüldü.
- **Ayrı hedef adı ve hedef adı taraması:** "Vergi dairesine" ile başlayan not metni 0060'ın düz metin taramasına takıldı;
  not "KDV tevkifatını …" diye başlar.
- **Tasarım sözlüğü atıfları:** `GiderForm`, `DonemRaporu` ve `Giderler`'e eklenen satırlar sözlükteki dosya:satır
  atıflarını kaydırdı; git farkından yeniden eşlendi (4 atıf).

## 7. Sürüm notu

> **Tevkifatlı fatura girişi.** Gider formunda "Bu fatura tevkifatlı" kutusunu işaretleyip faturadaki oranı (ör. 5/10)
> seçin; uygulama tedarikçiye ve vergi dairesine ödenecek tutarları ayırır, ikisi ayrı ayrı ödenir. Vergi dairesine
> ödenen tevkifatı ayrı gider kalemi olarak girmeyin. **Önce sunucu bilgisayarını, sonra bütün istemcileri güncelleyin;
> güncelleme bitene kadar tevkifatlı kalem girmeyin** (güncellenmemiş sunucu tevkifat alanlarını kaydetmez,
> güncellenmemiş istemci vergi dairesi bölümünü tanımaz).
