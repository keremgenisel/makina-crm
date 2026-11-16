# 0147 Uygulama planı: sipariş belgesinde hammadde gruplaması ve ölçü birimi

| | |
|---|---|
| **Spec** | `specs/0147-siparis-belgesinde-hammadde-gruplamasi.md` (Onaylandı, 2026-11-16) |
| **Onay** | Takım Yöneticisi, 2026-11-16 ("planı yaz ve uygula") |
| **Dal** | `feat/0147-hammadde-gruplamasi` (main `cd6f7186` üstünde) |
| **Durum** | Uygulandı, commit bekliyor |

## 1. Dosyalar

- **Motor `src/lib/siparisIhtiyaci.js`:**
  - `olcuMetni` boyun sonuna ` mm` ekler, "parça başına" ibaresi mm'den sonra (R7, C4). Kesit metni (`kesitMetni`, `kesitSatirMetni`, `cubukEki`) değişmez (X3).
  - `belgeBolumleriKur` satırı yerleştirirken hammaddeye böler. Malzemeyle yerleşen parça (tedarikçi, malzeme) başına bir satır alır. Ana tedarikçide kalan parça malzeme başına bir satır alır; malzemesi çözülemeyen ölçüler kendi satırında, hazır parça tek satır.
  - Her satır `grup` (`{ tur: "hammadde" | "cozulemeyen" | "hazir", malzemeId, ad }`) taşır.
  - Bölme tutar kurucusundan (`belgeTutarlariKur`) **önce** yapılır. Böylece satırın tutarı, boy hücresi, nedeni ve tutarsız sayacı satır başına kendiliğinden kurulur (R8, AC-18, AC-19, AC-21, AC-22). Bölüm toplamı kesit satırlarından ve hazır parçalardan geldiği için değişmez (AC-20).
  - Bölümün `gruplar` alanı `[{ tur, malzemeId, baslik, satirlar }]`. Sıra: hammaddeler adına göre (`localeCompare(…, "tr")`, eşitlikte kimlik), sonra çözülemeyen, sonra hazır (R3). Hammadde grubunda kesit sonra ad, öteki iki grupta kit sırası. `satirlar` grup sırasıyla düz kalır (pencerenin "belgede başka bölümde" ibaresi ve basılabilirlik aynı alanı okur, C7).
  - Başlık sabitleri `MALZEMESI_BELIRTILMEMIS_BASLIGI` ("Malzemesi belirtilmemiş") ve `HAZIR_PARCALAR_BASLIGI` ("Hazır parçalar").
- **Belge `src/lib/siparisRaporu.js`:** bölüm başına tek "Parçalar" tablosu yerine grup başına bir tablo, başlık grubun adı (kaçışlı). Tablo kurucusu ve hücreler aynen. Sayfa sonu yalnız bölümler arasında (R6). Notlar grupların altında bir kez (R9).
- **Pencere:** kod değişmez; Ölçü sütunu metni motordan okuduğu için mm kendiliğinden gelir (R10, C2).
- **Testler:** yeni `tests/siparis-belgesi-0147.test.js` (motor, belge, taramalar) ve `tests/ui/siparis-belgesi-0147.test.jsx` (pencere Ölçü sütunu); kıyas altınlarının ve ölçü metni iddialarının güncellenmesi (§4).
- **Kanıt:** `scripts/evidence/0009-sayfa.jsx` dört belge ekranı (fiyatsız, fiyatlı, çok hammaddeli bölüm, yalnız hazır parçalı bölüm), `docs/evidence/0147-*`.
- **Belgeler:** `CLAUDE.md` (0142/0144 sipariş belgesi bölümünün yanına 0147), `specs/README.md`.

## 2. Adım sırası

1. Motor: `olcuMetni` + bölme + gruplar; saf testler.
2. Belge kurucusu; belge testleri.
3. Tam takımı koş; kırılan ölçü metni iddialarını ve kıyas altınlarını tek tek gözden geçir. Rakam değişen hiçbir test olmamalı (C3); değişen yalnız metin (mm) ve başlık.
4. Kanıt ekranları.
5. Belgeler.

## 3. Kararlar (spec'te açık bırakılan uygulama ayrıntıları)

| No | Konu | Karar | Gerekçe |
|---|---|---|---|
| P1 | Bölmenin yeri | Tutar kurucusundan önce, yerleşim döngüsünde | Tutar, boy hücresi, neden ve tutarsız sayacı satır başına kendiliğinden doğar; ikinci bir tutar hesabı yazılmaz (C1). |
| P2 | Ana tedarikçide kalan, malzemesi çözülmüş ama tedarikçisiz kalem | Kendi hammadde başlığı altında | Hammaddenin adı biliniyor; "Malzemesi belirtilmemiş" yalnız kaydı bulunamayan malzemeye ayrılır (AC-10). |
| P3 | Grubun anahtarı | Malzeme kimliği, başlık adı | Aynı adlı iki ayrı malzeme kartı iki başlık olur (eşitlikte kimlik sırası); birleştirmek iki farklı fiyatı tek grupta karıştırırdı. |
| P4 | Çözülemeyen grupta sıra | Kit sırası | Bu satırların kesidi malzemesiz; bugün de kit sırasıyla basılıyorlardı. |
| P5 | Kıyas altınları | Altın yenilenmez; karşılaştırmadan önce ayıklama (mm ve grup başlığı) | Rakamların değişmediği altın ile kanıtlanır (C3); ayıklama dar tutulur. |

## 4. Kriter ↔ test

S = `siparis-belgesi-0147.test.js`, U = `ui/siparis-belgesi-0147.test.jsx`.

| AC | Test |
|---|---|
| 1, 2, 3 | S: iki hammaddeli bölümde iki başlık (sütunlar gruplar arasında hizalı), Türkçe alfabe sırası, başlıkta yalnız ad |
| 4 | S: grup içi sıra kesit sonra ad |
| 5 | S: aynı ölçülü iki parça iki satır |
| 6 | S: iki hammaddeli parça iki başlık altında, tam adet, yalnız kendi ölçüsü |
| 7, 8, 9 | S: hazır parçalar sonda ve kit sırasında; hazırsız bölümde başlık yok; yalnız hazırlı bölümde yalnız o başlık |
| 10 | S: malzemesi silinmiş parça "Malzemesi belirtilmemiş" altında, hammaddelerden sonra hazırdan önce |
| 11 | S: sayfa sonu sayısı bölüm sayısı − 1 |
| 12 | S: notlar grupların altında bir kez |
| 13, 14, 15 | S: `olcuMetni` örnekleri; ölçüsüz kalem hücresi boş, ibare adın altında |
| 16 | U: pencere Ölçü sütunu mm'li |
| 17 | S: sipariş farkı metni ve çubuk eki değişmedi |
| 18, 19, 21 | S: fiyatlı nüshada bölünmüş satırın tutarı, iki para birimi, biri çözülemeyen |
| 20 | S: bölüm toplamı, TL karşılığı ve kapsam cümlesi spec öncesi koddan üretilmiş altınla (`tests/fixtures/0147-toplam-once.json`) birebir |
| 22 | S: boydan hammaddenin satırında yalnız o hammaddenin boyu |
| 23 | S: tek hammaddeli veride tek başlık; kıyas: 0144 belge altını `0147-ayikla.js` ile (grup tabloları ölçü başına dörtlülere açılıp sıralanır, mm ve sütun genişliği kuralı düşer) birebir. 0142 belge HTML'i kıyasa girmez (0142 C6) |
| 24, 25 | S: satırsız bölüm basılmaz; hatalı adet belgeyi kilitler |
| C1, C4 | S: tarama (belge kurucusu aritmetik ve "mm" yazmaz; ölçü metni tek yerde) |

## 5. Uygulamada verilen kararlar

| No | Konu | Karar |
|---|---|---|
| P6 | Grup tablolarının hizası | İlk kanıt çekiminde her grup tablosu kendi sütun genişliğini seçiyordu, sütunlar alt alta kayıyordu. Belgeye kapsamlı stil (`GRUP_TABLO_STILI`: `.siparis-bolum table{table-layout:fixed}` + sütun yüzdeleri; fiyatsız 34/38/28, fiyatlı 26/28/22/24). Ortak `raporSunumu.js` ve MODELLER tablosu etkilenmez. |
| P7 | Var olan testler | Rakam değişen test yok. Değişenler: ölçü metni iddialarına " mm" (0142, 0144, pencere), "tek parça tablosu" iddiası grup sayısına (0142 AC-7), iki hammaddeli parçanın tek satır iddiaları bölünmüş satırlara (0144 AC-57, AC-26/61, AC-62, triyaj bulgu 2), çözülemeyen parçanın hazırdan önce gelmesi (0142 AC-12/59). Hepsi "spec 0147 ile" notlu. |
| P8 | Kanıt | `docs/evidence/0147-piksel-raporu.json`: 0142/0143/0144 pencere ve belge ekranları mm ile değişti, belgeler yükseklik değiştirdi, dört yeni 0147 ekranı. 0140 pencere ekranları çalıştırmadan çalıştırmaya 0–192 piksel oynuyor (aynı kodla iki taze çekim 0 fark verdi; mm bu ekranlarda yok), rapora alınmadı. |
