# 0061 Uygulama Planı: Açık Kalemler ve Yaşlandırma

| | |
|---|---|
| **Bağlı spec** | `specs/done/0061-acik-kalemler-ve-yaslandirma.md` (R2, plan onayıyla) |
| **Dal** | `feat/0061-acik-kalemler` (`feat/0060-hedef-adlari` kapanışından sonra) |
| **Onay** | Takım Yöneticisi, 2026-10-02: bütün öneriler (Q1–Q10) kabul; 0060 önce kapatıldı (8ae43df, 8268e54) |

## 1. Kodda bulunanlar (spec'e ek)

- `gunFarki` `odemeHatirlatma.js`'te ve o dosya `gider.js`'i içe alıyor; yeni motor `gider.js`'e konamaz (R27).
- `borcOzeti` vergi dairesi ve "tedarikçi seçilmemiş" satırlarında hedef sayıyor; yeni motor kalem kimliğiyle tekilleştirir,
  `borcOzeti`'nin çıktısına dokunulmaz.
- Faaliyet raporunun yaşlandırması `Date.now()` / `new Date(iso)` kullanıyor; yalnız kova adı ve sırası ortak yardımcıya
  taşınır, yaş hesabı orada kalır (R14, X1). Çıktının aynılığını 0059'un altın HTML testi ölçer.
- `giderRaporu.js` kaynak kısıtları: `v.kalem` / `o.kalem` / `oge.kalem` okunmaz, `.taraf` geçen satır sayısı bir kalır.
- `Giderler.jsx` gün sınırı için `useBugun` kullanıyor (R12).

## 2. Dosyalar

- Yeni `src/lib/yaslandirma.js`, `src/lib/acikKalemler.js`, `src/components/gider/AcikKalemler.jsx`.
- `src/lib/gider.js` (`borcKapsamindaMi`), `src/lib/aylikRapor.js` (kova yardımcısı), `src/lib/giderRaporu.js` (kutu),
  `src/components/Giderler.jsx` (kip).
- Testler: `tests/acik-kalemler.test.js`, `tests/ui/acik-kalemler.test.jsx`, `tests/gider-kasa-raporu-0061.test.js`,
  `tests/gider-gizlilik.test.js` 0061 bloğu.
- Görüntü aracı (`giderler-acik-kalemler`, `giderler-acik-kalemler-kova`), `CLAUDE.md`.

## 3. Kararlar

Q1 → R27 · Q2 → R28 · Q3 → R29 · Q4 → R30 · Q5 → R31 · Q6 → R32 · Q7 → R33 · Q8 → R34 · Q9 → R35 · Q10: 0060 önce kapatıldı.

## 4. Adım sırası

1. Saf katman (`yaslandirma.js`, faaliyet raporunun geçişi, `borcKapsamindaMi`). 2. Motor ve testleri. 3. Ekran. 4. Rapor
ve gizlilik. 5. Kanıt, CLAUDE.md, tam test ve lint.

## 5. Kriter ↔ test eşlemesi

| Kriter | Test |
|---|---|
| AC-3, AC-5, AC-6, AC-8, AC-9, AC-11, AC-12, AC-13, AC-30, AC-36, AC-39 | `tests/acik-kalemler.test.js` |
| AC-16, AC-35 | `tests/acik-kalemler.test.js` (gün sınırı) + `tests/ui/acik-kalemler.test.jsx` (gün dönümü) |
| AC-17 | `tests/acik-kalemler.test.js` çapraz + UI |
| AC-4, AC-18 | `tests/acik-kalemler.test.js` + `odeme-hatirlatma.test.js` |
| AC-27, AC-28, AC-29, AC-34 | `tests/acik-kalemler.test.js` taramaları + `gider-kasa-raporu-0059` faaliyet altın HTML |
| AC-1, AC-2, AC-7, AC-10, AC-14, AC-15, AC-24, AC-25, AC-26, AC-31, AC-32, AC-40, AC-41 | `tests/ui/acik-kalemler.test.jsx` |
| AC-19, AC-20, AC-21, AC-23, AC-33, AC-42 | `tests/gider-kasa-raporu-0061.test.js` |
| AC-22, AC-37 | `tests/gider-gizlilik.test.js` 0061 bloğu |
| AC-38 | görüntü aracı + `kanit-eslemesi.json` |

## 6. Uygulama notları

- **Hatırlatıcının kapsamı da ortak kurala bağlandı:** `odemeHatirlatma.js`'te kapsam koşulunun bir kopyası daha vardı; davranışı değiştirmeden `borcKapsamindaMi`'yi çağırır (AC-27: tek tanım). Vade şartı hatırlatıcıda aynen (R18, AC-18; hatırlatıcı testleri yeşil).
- **Motor `acikOzet(satirlar)`'ı ayrıca dışa verir:** kova süzmesi açıkken ekran taraf kırılımını, toplamı ve kalem sayısını aynı fonksiyondan hesaplar (ikinci toplama yok).
- **Kiranın stopaj hedefinin vadesi girilmemişse** (stopaj vadesi boş) kira kalemi "vadesi girilmemiş" sayısına da girer (R35, kalem bir kez); bu doğru davranış, test beklentisi buna göre.
- **Ek ödeme (resmi) hedefi** 0054'ten beri ayrı hedeftir; rapor testindeki açık kalan bunu içerir (motor `borcOzeti` ile tutarlı).
- **Kilit kapsamı (0064 AC-35):** `gider/AcikKalemler.jsx` gerekçeli kilitsiz listesinde (salt okunur liste; ödeme, Giderler'in gider kilitli penceresinden).
- **Rapor kurucusu kısıtları** korunur: motorun taraf listesi `taraflar`, rapor yalnız `ad`/`kovalar`/`toplamK` okur; `ayrinti`, `calisanAd`, `calisanlar` sözcüğü kurucuda geçmez (test).
- **0059 testi güncellendi:** şerit listesine "GİDER · AÇIK KALEMLER YAŞLANDIRMASI", altın karşılaştırmadan `yaslandirma` alanı.
- **Yerleşim kararı (TY, 2026-10-02):** yeni düğme Ay kipinde de görünüm sekmelerini iki satıra itiyordu (kısa etiket yetmedi). Sekme kabı artık daralmaz (`flex: "0 0 auto"`, `maxWidth: "100%"`); hatırlatma, açık kalemler ve dönem seçici sığmazsa bütün olarak alt satıra iner. Bütün Giderler ekranları değişti (Dönem Raporu'nda başlık iki satır, diğer görünümlerde sekme çubuğu içerik genişliğinde); `suzgec-yerlesim` (Electron) yeşil.
- **Kanıt:** `0061-piksel-raporu.json`, Giderler/Kasa/ödeme/rapor/Anasayfa ekranlarından 127'si; 75'i 0 piksel; değişenler yukarıdaki yerleşim, raporun yaşlandırma kutusu ve iki yeni ekran. TY onayı 2026-10-02.
- **Triyaj (2026-10-02):** (1) çapraz sayılar kova süzgecine uyar (`ozet.gecmisAdet`/`vadesizAdet`); (2) motor hedef listesini kalem başına bir kez alır; (3) süzülmüş satırlar `useMemo([r, kova])` içinde.
