# 0147 — Sipariş belgesinde hammadde gruplaması ve ölçü birimi

| | |
|---|---|
| **Durum** | Onaylandı (Takım Yöneticisi, 2026-11-16) |
| **Sahip** | Analist (yazım) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Sipariş listesi belgesi (yazdırma) ve sipariş penceresinin Ölçü sütunu; saf motorun belge kurucusu |
| **Bağımlı spec'ler** | 0134, 0140, 0142, 0143, 0144 |
| **Mockup** | https://claude.ai/artifact/3VDRsDXqFboEEiPjQozabq (beş adım: bugün ile öneri yan yana, tam sayfa, iki hammaddeli parça, kenar durumlar, fiyatlı nüsha; parça adları örnek, ölçü ve adetler 16.11 listesinden) |

---

## Intent

Fabrika hammaddeyi tedarikçiye hammadde hammadde sipariş ediyor: "Beyaz derlin: Ø70 × 170 mm 71 adet,
Ø60 × 40 mm 100 adet… Kestamid: Ø16 × 1000 mm 1 adet…" gibi. Bugün tedarikçiye verdiğimiz sipariş
listesi ise o firmanın bütün parçalarını tek tabloda, hammadde ayrımı olmadan alt alta basıyor;
tedarikçi hangi kesimin hangi malzemeden olduğunu satır satır ayıklamak zorunda kalıyor, fabrika da
kâğıdı telefonda okurken "şimdi derlinden kaç kalem vardı" diye geri dönüyor. Ayrıca ölçülerde birim
yazmıyor, "Ø30 × 40" rakamı tek başına duruyor.

Bu iş bittiğinde tedarikçiye giden kâğıt, fabrikanın siparişi verdiği dille aynı olacak: firma
başlığının altında hammadde başlıkları, her başlığın altında yalnız o hammaddeden kesilecek parçalar,
ve her ölçünün sonunda mm. Rakamların hiçbiri değişmeyecek, yalnız düzeni değişecek.

---

## Requirements

- **R1.** Sipariş belgesi, bir tedarikçi bölümünün içinde parçaları hammaddesine göre gruplar ve her
  grubun üstüne o hammaddenin adını başlık olarak yazar.
- **R2.** Başlıkta yalnız hammaddenin adı bulunur; sayı, ölçü adedi, tutar ya da başka ek yazılmaz.
- **R3.** Bir bölümdeki gruplar şu sırayla basılır: hammadde adına göre Türkçe alfabe sırasıyla
  hammadde grupları, sonra malzemesi çözülemeyen parçaların grubu, en sonda hazır (malzemesiz)
  parçaların grubu. Boş kalan grup hiç basılmaz, başlığı da basılmaz.
- **R4.** Aynı tedarikçiden birden çok hammadde ile yapılan parça, o bölümde her hammaddenin başlığı
  altında birer kez görünür; her satırda yalnız o hammaddenin ölçüsü ve parçanın tam sipariş adedi
  yazar.
- **R5.** Aynı hammadde başlığı altında aynı ölçüye sahip iki ayrı parça iki ayrı satır olarak kalır;
  adetleri toplanmaz ve satırlar birleştirilmez.
- **R6.** Hammadde başlığı sayfa sonu açmaz; sayfa sonu bugünkü gibi yalnız tedarikçi bölümlerinin
  arasında kalır.
- **R7.** Parçanın ölçü metni birimini yazar: ölçünün sonuna mm eklenir ("Ø30 × 40 mm"). Kalem adedi
  birden büyükse "parça başına n" ibaresi mm'den sonra gelir.
- **R8.** Fiyatlı nüshada hammaddeye göre bölünmüş satırın tutarı yalnız o hammaddeye düşen paylardan
  oluşur; bölümün toplam tutarı ve kapsam cümlesi bölünmeden etkilenmez.
- **R9.** Bölümün sonundaki notlar (sipariş farkı satırları, kapalı kesit uyarısı, elle notu, fiyatlı
  nüshanın bölüm toplamı) bugünkü yerlerinde ve metinleriyle kalır.
- **R10.** Sipariş penceresinin Ölçü sütunu belgeyle aynı ölçü metnini gösterir, yani mm orada da
  görünür.

---

## Constraints

### Uyulması zorunlu

- **C1.** Hesap motorda, belge yalnız gösterir (0144 C1 aynen). Gruplama, satırın hammaddeye göre
  bölünmesi ve bölünmüş satırın tutarı motorun belge kurucusunda hazırlanır; yazdırma kurucusu
  aritmetik, eşleştirme ya da para biçimi yazmaz.
- **C2.** Pencerenin bölümlemesi değişmez (0142 C-R3). Ekran Ana tedarikçiye göre bölünmeye devam eder
  ve ekranda hammadde başlığı yoktur.
- **C3.** Siparişin rakamları değişmez: ihtiyaç, stok, öneri, sipariş adedi, kesit satırları, boy
  adetleri, bölüm toplamı ve sipariş farkı satırları bu işte aynı kalır. Bu iş yalnız sunumdur.
- **C4.** Ölçü metni tek yerde üretilir; mm ikinci bir yerde yazılmaz. Belge ve pencere aynı metni basar.
- **C5.** Yeni kalıcı alan, yeni veri bölümü, yeni eylem izni ve sunucu kuralı yoktur. Belge salt
  okunurdur; izin eklenmediği bilerek yazılmıştır.
- **C6.** Ölçüsü girilmemiş kalemin ibaresi ve yeri (parça adının altı) değişmez; o kalem için ölçü
  hücresine bir şey yazılmaz.
- **C7.** Belgenin basılabilirlik kuralı (hatalı satır varsa ya da basılacak satır yoksa basılamaz)
  değişmez; gruplama satır sayısını değiştirdiği hâlde bu kural satırın değil parçanın hatasına bakar.

### KAPSAM DIŞI

- **X1.** Sipariş penceresinde hammadde gruplaması — *neden:* pencere Ana tedarikçiye göre bölümleniyor
  ve bir parçanın hammaddesi başka firmadan olabilir; aynı ekranda iki ayrı gruplama kuralı kafa
  karıştırır. Pencerede yalnız ölçü metni (mm) değişir.
- **X2.** Aynı hammadde altında aynı ölçülü iki parçanın tek satırda toplanması — *neden:* Takım
  Yöneticisi kararı (2026-11-16); atölye kesilen parçanın hangi parça olduğunu adından tanıyor,
  gruplama aynı ölçüleri zaten yan yana getiriyor.
- **X3.** Kesit metinlerine mm eklenmesi ("Kestamid · Ø30 · 400 mm çubuk") — *neden:* çubuk ekinde
  zaten mm var, çapa ikinci bir mm satırı kalabalıklaştırır. İstenirse ayrı iştir.
- **X4.** "Alınacak malzeme toplamı" tablosunun ya da parça altındaki malzeme satırının geri gelmesi
  — *neden:* 2026-11-15 kararıyla kaldırıldı, müşteri istemedi.
- **X5.** Parça adı sütununun kaldırılıp belgenin tamamen müşterinin yazdığı biçime (yalnız ölçü ve
  adet) indirgenmesi — *neden:* atölye ve tedarikçi kesilen parçayı adından tanıyor.
- **X6.** İngilizce çıktı — *neden:* sipariş listesi bilerek yalnız Türkçe (0140 E-R6).
- **X7.** Hammadde başlığının altına o hammaddenin toplam sipariş miktarının yazılması — *neden:*
  toplam tablosu 2026-11-15'te kaldırıldı; aynı rakamın başlığa taşınması o kararı dolaylı olarak
  geri alır.

---

## Context

**Bugünkü belge.** Sipariş listesi tedarikçiye verilen kesim listesidir ve motorun
`tedarikciBolumleri.belge` alanından kurulur. Her tedarikçi kendi bölümünde, bölümler arasında sayfa
sonu vardır (`src/lib/siparisRaporu.js:95-108`). Bölümün gövdesi **tek** tablodur: başlığı "Parçalar",
sütunları `Parça · Ölçü · Sipariş adedi` (fiyatlı nüshada sonuna `Tutar`), üreten yer
`parcaTablo` (`src/lib/siparisRaporu.js:79-87`) ve sütun listesi `BELGE_SUTUNLARI`
(`src/lib/siparisRaporu.js:35-44`). Tablo kurucusu `detayTablo(baslik, basliklar, satirlar, hizalar)`
başlığı tablonun üstüne kendisi yazar (`src/lib/raporSunumu.js:22-28`), yani grup başına tablo basmak
için yeni bir sunum parçası gerekmiyor.

**Satırlar nasıl yerleşiyor.** `belgeBolumleriKur` (`src/lib/siparisIhtiyaci.js:484-540`) her parçayı
malzeme kalemlerinin tedarikçisine göre dağıtır: malzemeden kesilen parça, **her malzeme kaleminin
tedarikçisinin** bölümüne girer ve iki firmadan malzemesi olan parça iki bölümde birden, her birinde
yalnız o firmanın ölçüleriyle ve **tam sipariş adediyle** basılır (0142 B-R1/2, B-R1/6). Yani
"aynı parça birden çok yerde, her yerde kendi ölçüsüyle ve tam adediyle" kuralı bu belgede zaten
vardır; R4 aynı kuralı bir tedarikçinin içindeki hammaddelere uygular, yeni bir kavram getirmez.
Malzemesi olmayan ya da tedarikçisi çözülemeyen parça, parçanın **Ana tedarikçisinin** bölümünde kalır
(`src/lib/siparisIhtiyaci.js:511-514`).

**Satırın taşıdığı veri.** Bir belge satırı `{ partId, ad, siparis, duzenlendi, kitSira,
malzemeKalemli, malzemeli, olculer, malzemeAdlari }` taşır; `olculer` girişleri `malzemeId`,
`malzemeAd`, `tedarikciId`, kesit anahtarı ve basılacak `metin` alanlarını taşır
(`parcaOlculeri`, `src/lib/siparisIhtiyaci.js:640-656`). Yani gruplama için gereken hammadde kimliği
ve adı satırın içinde hazırdır; yeni veri toplanmasına gerek yoktur.

**Bugünkü sıralama gruplamayı zaten üretiyor.** Bölümün satırları önce malzemeli/malzemesiz,
malzemelilerde ilk ölçünün malzeme adı, sonra kesit, sonra parça adı; malzemesizler kit sırasıyla
sıralanır (`src/lib/siparisIhtiyaci.js:525-534`). Yani aynı hammaddenin parçaları bugün de yan yana
basılıyor, eksik olan yalnız başlık ve iki hammaddeli parçanın bölünmesi.

**Fiyatlı nüsha.** Satırın tutarı `belgeTutarlariKur` içinde, parçanın bütün malzeme paylarının para
birimi başına toplamı olarak kurulur (`parcaTutarlari`, `src/lib/siparisIhtiyaci.js:572-634`); tutarı
yazılamayan hâllerin nedenleri (`MALZEME_COZULEMEDI`, `KALEM_TUTARA_GIRMEDI`, `TEDARIKCISIZ_IBARESI`)
ve tutarsız satır sayacı (`tutarsizMetni`, "n satırın tutarı hesaplanamadı") aynı yerdedir. **Bölümün
toplamı parça satırlarından değil, bölümün kesit satırlarından ve hazır parçalardan gelir**
(`src/lib/siparisIhtiyaci.js:638-644`), bu yüzden satırın hammaddeye bölünmesi bölüm toplamını
değiştirmez. Boy cinsinden sipariş edilen kesitlerin satır hücresi (`boySiparisleri`, "n boy (400 mm)")
ve "N parça" alt satırı da aynı yerde kurulur ve bölünmüş satırda yalnız o hammaddenin boyu yazmalıdır.

**Ölçü metni.** `olcuMetni(bicim, kesit, boy, adet)` kesit metnini üretip sonuna boyu ekler
(`src/lib/siparisIhtiyaci.js:747-761`): mil "Ø30", boru "Ø19 × 2 et", lama ve sac "30 × 60". Bu metin
yalnız `parcaOlculeri` içinde üretilir ve iki yerde basılır: belgenin Ölçü hücresi
(`src/lib/siparisRaporu.js:67`) ve sipariş penceresinin Ölçü sütunu
(`src/components/stock/SiparisPenceresi.jsx:42-43, 86`). Uygulamadaki bütün ölçüler milimetredir
(çubuk boyu alanının etiketi de "Çubuk boyu (mm)"), yani mm doğru birimdir. Kesit metni ayrıca
sipariş farkı satırında ve çubuk ekinde kullanılır (`kesitSatirMetni`, `cubukEki`
"· 400 mm çubuk", `src/lib/siparisIhtiyaci.js:773-775`); orası X3 ile kapsam dışıdır.

**Bilinen tuzak: kıyas altınları.** Ölçü metni değişince `olculer[].metin` ve belgenin HTML'i değişir;
"Ø" taşıyan altın dosyaları (`tests/fixtures/0135-once.json`, `0138-once.json`, `0139-once.json`,
`0140-once.json`, `0141-once.json`, `0142-once.json`, `0144-belge-once.json`) ve bunların ayıklama
dosyaları gözden geçirilmelidir. Bu işin emeğinin çoğu buradadır; motor tarafı küçüktür.

**Veri, izin ve sunucu.** Bu iş yeni alan, bölüm, izin ya da sunucu kuralı getirmez; dört nokta DB
kuralı, `MERGE_KEYS`, çöp kutusu simetrisi ve `serverAuth` bölüm eşlemesi bu spec'te gündeme gelmez.

---

## Acceptance Criteria

- **AC-1.** Bir tedarikçi bölümünde iki ayrı hammaddeden kesilen parçalar varsa belge, o bölümde her
  hammadde için ayrı bir başlık ve o başlığın altında ayrı bir tablo basar.
- **AC-2.** Hammadde başlığı yalnız hammaddenin adını taşır; başlıkta sayı, ölçü, tutar ya da başka ek
  bulunmaz.
- **AC-3.** Bir bölümdeki hammadde başlıkları Türkçe alfabe sırasına göre sıralanır.
- **AC-4.** Bir hammadde başlığının altındaki parçalar bugünkü sıra kuralıyla (önce kesit, sonra parça
  adı) sıralanır.
- **AC-5.** Aynı hammadde başlığı altında aynı ölçüye sahip iki ayrı parça iki satır olarak basılır;
  adetleri toplanmaz.
- **AC-6.** Aynı tedarikçiden iki ayrı hammadde ile yapılan parça, o bölümde iki başlığın altında birer
  kez basılır; her satır yalnız o hammaddenin ölçüsünü ve parçanın tam sipariş adedini yazar.
- **AC-7.** Malzemesi olmayan (hazır alınan) parçalar bölümün sonunda "Hazır parçalar" başlığı altında,
  bugünkü kit sırasıyla basılır.
- **AC-8.** Bölümde hazır parça yoksa "Hazır parçalar" başlığı ve tablosu hiç basılmaz.
- **AC-9.** Bölümde yalnız hazır parça varsa yalnız o başlık basılır, hammadde başlığı basılmaz.
- **AC-10.** Ölçüsünün malzemesi çözülemeyen (kaydı silinmiş ya da bulunamayan) parça "Malzemesi
  belirtilmemiş" başlığı altında, hammadde gruplarından sonra ve hazır parçalardan önce basılır.
- **AC-11.** Hammadde başlığı sayfa sonu açmaz; sayfa sonu yalnız tedarikçi bölümlerinin arasındadır.
- **AC-12.** Bölümün sonundaki sipariş farkı satırları, kapalı kesit uyarısı ve elle notu bugünkü
  metinleriyle ve bölümün sonunda (grupların altında) bir kez basılır.
- **AC-13.** Ölçü metni ölçünün sonuna mm yazar: yuvarlak mil "Ø30 × 40 mm", boru
  "Ø19 × 2 et × 173 mm", lama ve sac "30 × 60 × 130 mm".
- **AC-14.** Kalem adedi birden büyük olduğunda mm "parça başına" ibaresinin önünde kalır:
  "Ø30 × 40 mm · parça başına 2".
- **AC-15.** Ölçüsü girilmemiş kalem için ölçü hücresine hiçbir şey yazılmaz (mm de yazılmaz) ve
  "ölçüsü girilmemiş" ibaresi bugünkü gibi parça adının altında kalır.
- **AC-16.** Sipariş penceresinin Ölçü sütunu da mm'li metni gösterir.
- **AC-17.** Sipariş farkı satırındaki ve çubuk ekindeki kesit metinleri değişmez:
  "Kestamid · Ø30 · 400 mm çubuk: 7 boy sipariş edilir" aynen basılır.
- **AC-18.** Fiyatlı nüshada iki hammaddeye bölünen parçanın her satırı yalnız o hammaddeye düşen
  payların tutarını yazar.
- **AC-19.** Fiyatlı nüshada bir parçanın hammaddelerinden biri USD, öteki TL fiyatlıysa her satır
  kendi para biriminin tutarını yazar; para birimi tanınmayan pay bugünkü gibi tutara girmez ve
  satırda nedeni yazar.
- **AC-20.** Fiyatlı nüshada bölümün toplam tutarı, kapsam cümlesi ve kayıtlı kurla TL karşılığı,
  satırların hammaddeye bölünmesinden etkilenmez (bölünmeden önceki rakamla aynı).
- **AC-21.** Tutarı hesaplanamayan satır sayacı bölünmüş satırları ayrı sayar: iki hammaddeli bir
  parçanın yalnız bir hammaddesi çözülemiyorsa, öteki hammaddenin satırı tutarını tam yazar ve
  nedensiz basılır.
- **AC-22.** Boydan sipariş edilen hammaddenin satırında Sipariş adedi hücresi bugünkü gibi
  "n boy (400 mm)" ve altında parça adedini yazar; bölünmüş satırda yalnız o hammaddenin boyu yazar.
- **AC-23.** Tek hammaddeli ve tek tedarikçili bir veride belgenin çıktısı, hammadde başlığı satırları
  ve ölçülerdeki mm dışında spec öncesi çıktıyla birebir aynıdır (kıyas altını).
- **AC-24.** Basılacak parça satırı olmayan tedarikçi bölümü bugünkü gibi hiç basılmaz.
- **AC-25.** Hatalı adedi olan bir parça bulunan bölüm bugünkü gibi belgeyi kilitler; gruplama bu
  kuralı değiştirmez.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Gruplama ve bölünmüş satırın tutarı React'sız saf motorda (`siparisIhtiyaci.js` belge kurucusu)
      yazıldı ve kendi testi var; yazdırma kurucusu yalnız gösteriyor (C1 taraması).
- [ ] Belge ile sipariş penceresi aynı ölçü metnini tek kaynaktan okuyor (C4 taraması).
- [ ] Yeni kalıcı alan yok; dört nokta kuralı gündeme gelmedi (spec'te yazılı).
- [ ] Yeni veri bölümü yok; `BLOB_SECTIONS` / `MERGE_KEYS` zinciri değişmedi.
- [ ] Yeni eylem izni yok; belge salt okunur olduğu için izin eklenmediği açıkça yazıldı.
- [ ] Soft-delete ve çöp kutusu bu işte gündeme gelmedi (çöpteki malzemenin hâli AC-10 ile yazılı).
- [ ] Kullanıcıya görünen tüm metinler Türkçe; belge yalnız Türkçe olduğu için çeviri anahtarı
      eklenmedi (X6).
- [ ] Fiyatlı nüshanın para kuralı korundu; bilinmeyen para birimi AC-19 ile tanımlı.
- [ ] Görsel kanıt eklendi (`0147-piksel-raporu.json`): fiyatsız ve fiyatlı nüsha, çok hammaddeli
      bölüm, yalnız hazır parçalı bölüm.
- [ ] Kıyas altınları ve ayıklama dosyaları güncellendi; dokunulan her altın için neden yazıldı.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md`'nin sipariş belgesi bölümü güncellendi.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | | |
| **Düzeltme turu sayısı** | | |
| **Bulgu gerçek/gürültü oranı** | / | |
| **Regresyon sayısı** | | |
| **Kaçan hata** | | |

**Bu spec'ten çıkarılan ders:**
