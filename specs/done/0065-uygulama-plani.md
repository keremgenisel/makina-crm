# 0065 Uygulama Planı: Parça Stoğu Çakışmada Korunsun

| | |
|---|---|
| **Bağlı spec** | `specs/done/0065-parca-stogunun-cakismada-korunmasi.md` (R2, plan onayıyla) |
| **Dal** | `feat/0065-stok-hareketi` (`feat/0064-kilit` üstünden) |
| **Onay** | Takım Yöneticisi, 2026-10-01: bütün öneriler (Q1–Q9) kabul |

## 1. Kodda bulunanlar (spec'e ek)

- `MERGE_KEYS`'te `partStock` ve `partStockLog` yok; yeniden yüklemede `partStock` sunucudan aynen gelir. Kaybeden tarafın
  stok düşümü de log satırı da kaybolur.
- Geri alma satır silmenin yanında, "bu kayda ne düşülmüştü" sorusunu log'u `Math.abs(l.miktar)` ile brüt toplayarak soran
  okuyucular var: `utils.stokGeriEklenmis`, `CustomerDetailModal` (yedek parça düzenleme), `YedekParcaSatisTab`
  (düzenleme), müşteri kaskadının satır içi servis iadesi (`Customers.jsx`), makina stok düzenleme ve silme
  (`MakinaStokTab`). Karşı hareketle hepsi net etkiye geçmeli (R14).
- Makina üretimi (`makina_uretimi`) parça stoğunu düşürüyor ve düzenleme/silmede log satırını siliyor; düzenleme eski
  satırları bugünün tarihiyle yeniden yazdığı için `hareketTarihHaritasi` üretim tarihini kaydırıyordu (R16).
- Çöpten servis geri alma (tek başına ve müşteriyle) parçaları yeniden düşmüyor (R17).
- `part_stock_log` kimliği rastgele `uid()` ve `SELECT *` kimlik sırasıyla döner; saklı log'un ekleme sırası kaybolur
  (R19).
- DB okuması adedi 0'ın altına indirmiyor (R20).
- Log'u gösteren ekran yok, yalnız CSV dışa aktarımı (R18).

## 2. Dosyalar

- **Yeni `src/lib/stokHareketi.js`** (saf, tek hesap, C2): `IADE_TIPI`, `MUTLAK_TIPLER`, `stokEtkisi`, `stokuUygula`,
  `netDusum`, `karsiHareketler`, `stokTutarliligi`, okunur tip adları.
- `src/lib/merge.js`: `partStockLog` birleşir; log için kimlik çakışması kuralı (R15); plan `stokEtkisi` döndürür.
- `src/App.jsx` `mergeLocalIntoReloaded`: log eklenir, adet yeniden yüklenmiş adede fark olarak uygulanır.
- `src/lib/servisStok.js`, `src/lib/yedekParcaStok.js`, `src/lib/utils.js` (`stokGeriEklenmis`): karşı hareket, net etki.
- `src/components/Customers.jsx`, `customers/CustomerDetailModal.jsx`, `stock/YedekParcaSatisTab.jsx`,
  `stock/MakinaStokTab.jsx`, `settings/SettingsTrash.jsx`, `settings/SettingsExport.jsx`.
- Yeni `src/components/stock/StokHareketleriPenceresi.jsx`, `src/components/stock/StokTutarliligi.jsx`;
  `stock/PartStokTab.jsx` iki düğme.
- Testler, görüntü aracı ekranları, `CLAUDE.md`.

## 3. Kararlar (Q1–Q9, spec R14–R22)

Q1 ayrı iade tipi (R14) · Q2 log kimlik çakışmasında hareketin özü (R15) · Q3 makina üretimi dahil (R16) · Q4 çöpten servis
geri alma yeniden düşer (R17) · Q5 Parça Stoğu'nda iki pencere (R18) · Q6 "sıra belirsiz" grubu (R19) · Q7 0 tabanı (R20) ·
Q8 sayım yarışı bilinen sınır (R21) · Q9 log düzenlemesi bilinen sınır, etki plandaki eklemelerden (R22).

## 4. Adım sırası

1. `stokHareketi.js` ve saf testleri.
2. Servis ve yedek parça geri alması, `stokGeriEklenmis`; eski testlerin "satır silinir" beklentisi bilinçli olarak "karşı
   hareket yazılır"a çevrilir.
3. Net düşüme geçen okuyucular ve kaynak taraması.
4. Birleştirme (saf + gerçek App).
5. Çöp kutusu, sahipsiz, bayi kaskadı, makina üretimi.
6. Tutarlılık raporu ve hareket penceresi.
7. Kanıt, CLAUDE.md, tam test ve lint.

## 5. Kriter ↔ test eşlemesi

| Kriter | Test |
|---|---|
| AC-1–AC-4, AC-6, AC-7, AC-22, AC-27 | `tests/stok-hareketi.test.js` (saf birleştirme planı + etki) |
| AC-1, AC-10 uçtan uca | `tests/ui/stok-birlestirme.test.jsx` (gerçek App, çakışma sonrası birleştirme) |
| AC-5 | `tests/stok-hareketi.test.js` çapraz blok (çakışmasız yollar) |
| AC-8, AC-9, AC-11, AC-21 | `tests/servis-stok.test.js`, `tests/yedek-parca-stok.test.js`, `tests/stok-hareketi.test.js` taraması |
| AC-12 | `tests/ui/customers-delete-cascade.test.jsx`, `tests/ui/dealers-delete-cascade.test.jsx`, `tests/ui/settings-sahipsiz.test.jsx` (karşı hareket ek beklentileri) |
| AC-24 | `tests/ui/stok-geri-alma-0065.test.jsx` (çöpten servis, tek ve müşteriyle), `tests/servis-stok.test.js` (birikimli taban) |
| AC-13–AC-16, AC-19, AC-25, AC-26 | `tests/stok-hareketi.test.js`, `tests/ui/stok-geri-alma-0065.test.jsx` (pencereler) |
| Triyaj 1, 3 | `tests/stok-hareketi.test.js` (sunucuda silinmiş satır diriltilmez; yedekten geri yükleme; log bağı yeniden eşlenir), `tests/ui/stok-birlestirme.test.jsx` (gerçek App) |
| AC-17, AC-18, AC-20 | `tests/stok-hareketi.test.js` kaynak taraması, `scripts/tests/db-roundtrip.cjs` iade tipi satırı |
| AC-23 | `tests/ui/stok-geri-alma-0065.test.jsx` (makina stok düzenleme/silme) |

## 6. Uygulama notları

- **Düzenlemede gereksiz hareket yok:** servis, yedek parça ve makina kiti düzenlemesi "geri al + yeniden düş" yapar; karşı hareketle her kayıt log'a iki satır eklerdi. `stokHareketi.netDusumAyni` kaydın net düşümü istenen kalemlerle birebir aynıysa iki adımı atlar (`servisStok.servisParcaYenile`, `CustomerDetailModal`/`YedekParcaSatisTab` yedek parça düzenlemesi, `MakinaStokTab`). Kırpılmış (eksik düşülmüş) kayıtta eski akış çalışır; stok sonucu iki durumda da bu işten öncekiyle aynıdır (R5, AC-5).
- **`utils.stokGeriEklenmis` kaldırıldı**, yerine `stokHareketi.netGeriEklenmis` (karşı hareketleri sayar); `tests/utils.test.js` bloğu yeni adla aynı beklentilerle duruyor.
- **R17 sınırı:** çöpten geri alınan servis yalnız stoğu bu kayıt için izlenmiş ve net düşümü kalmamışsa yeniden düşülür (`servisParcalariYenidenDus`). 0065 öncesi silinmiş servisin log satırı silinmiş olduğu için o kayıtta hiçbir şey düşülmez; hiç düşülmemiş parçayı düşmemek için bilinçli.
- **Birleştirme etkisi App'te gerçekten eklenen satırlardan hesaplanır** (`setPartStockLog` güncelleyicisi içinde, `prev`'de zaten bulunan kimlik düşülür, Q9); planın `stokEtkisi`'si aynı fonksiyonun saf çıktısıdır ve testlerde kullanılır.
- **Dışa aktarma etiketleri** tek listeden (`hareketTipAdi`): "Stok Girişi" → "Stok girişi", "Manuel Düzeltme" → "Sayım düzeltmesi" (ekrandaki adla aynı); karşı hareketler okunur adla.
- **Çöp kutusu kapanışları:** `SettingsTrash` öğe listesinin `useMemo`'su artık `partStock`/`partStockLog`'a da bağlı; geri alma kapanışı bayat log'la "izlenmedi" sanmasın.
- **Kanıt:** `0065-piksel-raporu.json`, stok/müşteri/servis/kargo/bayi/çöp kutusu/dışa aktarma ekranları (63 ekran × 2 tema); yalnız Parça Stoğu'nun üç ekranı (yeni düğmeler) değişti, diğerleri 0 piksel. Üç yeni ekran: `parca-stok-hareketleri`, `parca-stok-tutarlilik`, `parca-stok-tutarli`. TY onayı 2026-10-01.
- **Triyaj (2026-10-01):** (1) birleştirme yalnız sunucuda olmayan **ve** son yükleme/başarılı kayıtta sunucuda olduğu bilinmeyen log satırını ekler (`bilinenLogIdleri`, App `bilinenLogRef`/`oncekiBilinenLogRef`); sunucuda silinmiş satır (eski istemcinin geri alması, başka PC'de yedekten geri yükleme) diriltilip stoktan yeniden düşülmez. (2) Çöpten müşteriyle birlikte dönen servislerin düşümü tek geçişte, birikimli kırpma tabanıyla (`servisParcalariYenidenDus`). (3) Kimlik çakışmasında log'un `referansId`'si tipine göre yeniden atanan servis/yedek parça satışını izler. (4) App planın `stokEtkisi`'sini kullanır; yalnız 750 ms beklemede aynı kimlik yerelde belirmişse eklenenlerden yeniden hesaplar. (5) §5 tablosu gerçek test dosyalarına göre düzeltildi.
- **Sürüm notu (triyaj bulgu 1):** "Bu sürümle stok hareketleri çakışmada birleştirilir. Ağdaki **bütün bilgisayarlar** bu sürüme güncellenmelidir; eski sürümdeki bir bilgisayar geri almada stok hareketini sildiği için iki sürüm birlikte çalışırken stok adedi ile hareket kaydı arasında fark oluşabilir (Stok › Parça Stoğu › Stok Tutarlılığı bu farkı gösterir)."
