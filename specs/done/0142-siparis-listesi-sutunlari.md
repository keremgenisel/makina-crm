# 0142 — Sipariş belgesi parça odaklı olur, stok ve para kalkar

| | |
|---|---|
| **Durum** | **Tamamlandı** (commit `7096acf4`, 2026-11-11). Revizyon 3: plan turunda on öneri Takım Yöneticisi tarafından onaylandı. |
| **Sahip** | Analist |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Stok › Parça/Yedek Parça Stoğu › Sipariş Listesi penceresi (`stock/SiparisPenceresi.jsx`), yazdırılan sipariş belgesi (`siparisRaporu.js`), saf motor `siparisIhtiyaci.js` (parça satırına ölçü alanı ve bölümleme), prop zinciri (`stock/PartStokTab.jsx`, `Stock.jsx`, `PartManager.jsx`), yeni kıyas fikstürü ve altını, ters çevrilen 0140 testleri (`tests/siparis-raporu-0140.test.js`, `tests/ui/siparis-0140.test.jsx`), `docs/evidence/kanit-eslemesi.json`, `CLAUDE.md` |
| **Bağımlı spec'ler** | 0140 (ekranı kurdu, B-R4 ve para kriterleri ters çevrilir), 0134 (motor), 0132 (kesit ve biçim), 0141 (aynı tabloların son düzeni), 0139 (içe aktarma parçaya Ana tedarikçi yazmıyor; B-R2/2'nin gerekçesi) |
| **QA turu** | 2026-11-11, 28 bulgu (5 Bloklayıcı / 13 Önemli / 10 Küçük); hepsi Takım Yöneticisi tarafından onaylandı ve spec'e işlendi |
| **Düzeltilen iddialar** | 2 ("hazır parça" tanımının alıntısı, bölüm başlığı toplamının satır numarası) |
| **Ölçüm** | 2026-11-11, v3.58.0 kaynağı |

---

## Intent

Satın almacı sipariş listesini tedarikçiye vereceği belge olarak kullanıyor. Bugünkü liste iki
tür bilgiyi karıştırıyor: tedarikçinin işine yarayanı (ne, ne kadar) ve fabrikanın iç bilgisini
(elimizde ne var, kaça mal oluyor). Stok adedi ve para sütunları tedarikçiye gösterilecek şeyler
değil.

Eksik olan ise parçanın hangi çaptan yapıldığı. Satın almacı malzemeyi çapıyla sipariş ediyor ve
listede parçanın yanında o çapı göremiyor.

Başarı şuna benzer: sipariş listesi yalnız sipariş edilecek şeyi ve adedini söylüyor, parçanın
yanında hangi kesitten yapıldığı yazıyor, ve belge olduğu gibi tedarikçiye verilebiliyor.

---

## Requirements

### A. Belgeden kalkanlar

- **A-R1.** Belgede **İhtiyaç** sütunu yoktur.
- **A-R2.** Belgede **Stok** sütunu yoktur.
- **A-R3.** Belgede ayrı bir **Kesit** sütunu yoktur.
- **A-R4.** Belgede para yoktur: birim maliyet, tutar ve birim fiyat sütunlarının hiçbiri.
- **A-R5.** Belgede tedarikçi bölümünün başlığında toplam tutar yazmaz.
- **A-R6.** Yazdırma düğmesi para seçeneği taşımaz; belge her zaman parasız basılır.

- **A-R6/2.** Belgenin para iskeleti de kalkar: `siparisRaporuHtml`'in `paraGoster` parametresi,
  `BELGE_SUTUNLARI`'nın `hazirPara` ve `malzemePara` kümeleri ve yalnız para için duran üç
  biçimleyici (`tl`, `tutarPb`, `birimPb`). Motorun alanları (E-R2) yerinde kalır. Gerekçe:
  kullanılmayan para biçimleyicisi dururken bir sonraki spec onu yeniden bağlar (0138'in dersi)
  (QA turu, Ö6).

### B. Belge parça odaklı olur

- **B-R1.** Belge, tedarikçi başına **tek tablo** basar. Sütunlar: **Parça · Ölçü · Sipariş adedi**.
  Bugünkü iki tablo ("Hazır parçalar" ve "Malzemeler") tek listede birleşir.
- **B-R1/2.** Parça, **belgede**, malzemeden kesiliyorsa **malzemesinin tedarikçisinin**
  bölümüne girer; hazır alınan parça kendi Ana tedarikçisinin bölümünde kalır. Bugün motor parçayı
  parçanın kendi `tedarikciId`'siyle, kesit satırını malzemenin `tedarikciId`'siyle bölümlüyor ve
  0140 C-R8 bunu bilerek ikiye ayırmıştı; parçanın altına malzemesi yazılınca iki bölüm tek satıra
  iner ve kesecek firma malzemeyi veren firmadır. İki malzeme kalemi iki ayrı firmadan geliyorsa
  parça iki bölümde de görünür ve her bölümde yalnız o firmanın malzeme satırı altına yazılır.
  Pencerenin bugünkü bölümlemesi değişmez (C-R3) (QA turu, B1).
- **B-R1/3.** Tek tablonun süzgeci **parça satırıdır**: kapalı değil, hatasız ve sipariş adedi
  sıfırdan büyük. Altındaki malzeme satırı parçanın kendi kalemidir, ayrı süzgeçten geçmez.
  B-R7'nin toplam satırı bugünkü kesit süzgecini kullanır (kapalı ve hatalı kesit toplama girmez);
  parçası açık ama kesidi kapatılmış bir malzeme varsa bölümün sonunda tek cümlelik uyarı yazar.
  Gerekçe: bugün belge iki ayrı süzgeç kullanıyor (parça `siparis > 0`, kesit
  `siparisKg > 0 || boyAdedi > 0`); tek tabloda ikisi birbirini tutmayan satır üretir
  (QA turu, B4).
- **B-R2.** Hazır alınan parça ile malzemeden kesilen parça **aynı tabloda** durur.
- **B-R2/2.** Ana tedarikçisi girilmemiş **malzemeli** parça da belgeye girer (B-R1/2 onu
  malzemesinin tedarikçisine koyar). Bugün motor onu hiçbir bölüme koymuyor, yalnız sayıyor
  (`anasizMalzemeli`) ve metni "malzemesi kendi tedarikçisinin bölümünde" diyor; 0139'un içe
  aktarması parçaya Ana tedarikçi yazmadığı için içe aktarılacak doksan bir parçanın hiçbirinde
  Ana tedarikçi olmayacak ve parça birincil satır olunca belge boşalırdı. Sayaç ve metni pencerede
  kalır, anlamı daralır: Ana tedarikçi eksikliği yalnız **hazır** parça için uyarıdır
  (QA turu, B2).
- **B-R3.** Malzemeden kesilen parçanın **hemen altında** malzeme satırı vardır: "malzeme"
  etiketi ve malzemenin adı (`malzeme · PASLANMAZ 304 ÇUBUK`). Malzeme satırı ölçü ve adet
  yazmaz, onlar üstteki parça satırında.
- **B-R4.** Hazır alınan parçanın ölçü hücresi boştur ve altında malzeme satırı çizilmez.
- **B-R4/2.** Boş ölçü hücresinin iki ayrı anlamı olmaz: ölçüsü **çözülemeyen** kalemde hücre boş
  kalır ama parçanın adının altına "ölçüsü girilmemiş" ibaresi düşer (pencerede ve belgede aynı
  metin, motorun sabiti) ve parça satırı listeden düşmez. Ölçüm: `hamOlculer` biçimin bütün
  ölçüleri dolu ve sıfırdan büyük değilse `null` döner, yani çapı girilmiş ama boyu girilmemiş
  kalem ölçü üretmez. **Set** satırı hazır parça kuralıyla basılır (boş ölçü, altında malzeme
  satırı yok); patlatılan set bölüme zaten girmiyor (QA turu, B3 ve Ö11).
- **B-R5.** Ölçü, parçanın malzeme kaleminin **tam ölçüsüdür** (çap ve boy birlikte), çaplı
  biçimde `Ø` işaretiyle.

  | Biçim | Yazılan |
  |---|---|
  | Yuvarlak mil | `Ø100 × 108` |
  | Boru | `Ø19 × 1,5 et × 173` |
  | Lama | `10 × 20 × 125` |
  | Sac | `10 × 100 × 200` |

- **B-R5/2.** Ölçü metninin biçimi tek kaynaktandır: sayılar `kesitMetni`'nin bugünkü
  biçimleyicisiyle yazılır (tr-TR, en çok üç ondalık; ayrı bir `toLocaleString` yazılmaz), sütun
  başlığı pencerede ve belgede aynı metindir, birden çok ölçü **alt alta ayrı satırlarda** yazılır
  (belgede `<br>`, pencerede ayrı `div`) ve aralarına noktalama konmaz (QA turu, Ö4, Ö13, K10).
- **B-R6.** Sıra: önce malzemeden kesilen parçalar, malzemesine ve kesitine göre gruplanmış
  (aynı çubuktan kesilenler yan yana); sonra hazır alınan parçalar.
- **B-R6/2.** Birden çok malzeme kalemi olan parça, o bölümün malzemesine ait **ilk** kaleminin
  malzeme artı kesit anahtarına göre sıralanır; satır bir kez yazılır ve ölçü hücresinde o bölüme
  ait bütün ölçüler görünür. B-R1/2'den sonra bölümde yalnız o firmanın malzemesine ait kalemler
  sayıldığı için anahtar tekilleşir (QA turu, Ö2).
- **B-R7.** Her tedarikçi bölümünün sonunda **"Alınacak malzeme toplamı"** satırı vardır:
  malzeme ve kesit başına sipariş kilosu ya da boy adedi. Parça listesi tedarikçiye ne
  keseceğini söyler, bu satır kaç kilo çubuk alınacağını söyler.

- **B-R7/2.** Toplam satırı bölümün **kesit satırlarından** kurulur (kapalı ve hatalı olanlar
  hariç) ve tablonun içinde bir satır değil, bölümün sonunda kendi küçük tablosudur
  ("Malzeme · Kesit · Alınacak"); boy yönteminde "n boy" yazar. Gerekçe: tek tablonun üç sütunu
  (Parça, Ölçü, Sipariş adedi) kilogramı taşıyamaz, "Sipariş adedi" sütununa yazmak iki birimi
  aynı sütunda toplar (QA turu, Ö3, Ö5).

#### Plan turunda eklenen maddeler (revizyon 3, 2026-11-11)

- **B-R1/4.** Parça satırı olmayan ama toplam satırı olan bölüm (bütün parçaları kapatılmış, kesidine elle kilo
  yazılmış) basılır: bölüm, parça satırı **ya da** toplam satırı varsa belgeye girer. Yoksa elle girilen sipariş
  belgeden sessizce düşerdi (plan turu, Risk 3).
- **B-R1/5.** Malzemesi çözülemeyen kalem (malzeme çöpte ya da kaydı yok) parçayı hiçbir bölüme yerleştirmez. Parçanın
  çözülen başka kalemi yoksa parça Ana tedarikçisinin bölümünde kalır; Ana tedarikçisi de yoksa belgeye girmez.
  Ölçüsü eksik ama malzemesi bilinen kalem B-R4/2 gereği boş hücre ve ibareyle yerleşir (plan turu, Risk 4).
- **B-R1/6.** İki firmalı parça her bölümde parçanın **tam** sipariş adedini yazar (her firma kendi malzemesinden o
  kadar parça keser); bu çift sayım değildir ve pencerenin çift sayım cümlesi belgeye taşınmaz (plan turu, Risk 5).
- **B-R5/3.** Kalem adedi belgede kaybolmaz: aynı ölçüdeki kalemlerin adetleri toplanır (D-R3 ölçüyü bir kez
  yazar) ve toplam 1'den büyükse ölçü satırının sonuna "· parça başına n" yazılır. Pencerede de aynı metin. Kilo
  toplamı zaten doğrudur (motor parça adedini kalem adediyle çarpar) (plan turu, Risk 2).
- **B-R6/3.** Sıra anahtarı: malzeme adı (Türkçe sıralama), sonra kesit sayıları artan, sonra parça adı. Hazır
  parçalar motorun bugünkü (kit) sırasında kalır (plan turu, Risk 7).
- **E-R2/3.** Paranın kalıntı metinleri de çizilmez: kesit satırının `tutarNeden`'i (fiyat, kur, para birimi
  nedenleri) pencerede hiç basılmaz; eksik sayacı motorda aynen kalır, metninin "tutarları toplama girmedi" yarısı
  düşer. Para metni taraması bu üç sabiti de kapsar (plan turu, Risk 6).
- **A-R3/2.** A-R3 ve AC-3 **parça tablosuna** dar okunur: tek tablonun başlıkları birebir `Parça · Ölçü · Sipariş
  adedi`dir; toplam tablosunun (B-R7/2) "Kesit" sütunu A-R3'ün kapsamı dışındadır (plan turu, Risk 1: AC-3 ile
  AC-48'in çelişkisi).

#### QA turunda eklenen maddeler (2026-11-11)

- **B-R8.** Belgenin başındaki **MODELLER** tablosu kalır (model adı ve makina adedi; 0140 E-R2
  istemişti ve satın almacı hangi parti için sipariş verdiğini görüyor). "Belge olduğu gibi
  tedarikçiye verilebiliyor" cümlesiyle çelişen tek kalan bölüm budur; bu bilinçli karardır ve
  Takım Yöneticisi isterse ayrı spec'le kaldırılır (QA turu, Ö10).

### C. Pencere

- **C-R1.** Pencereden **yalnız para** kalkar: hazır parçada birim maliyet ve tutar, malzemede
  tutar ve TL, tedarikçi başlığında toplam.
- **C-R2.** Pencerede **Stok ve İhtiyaç sütunları kalır**. Sipariş adedi `ihtiyaç − stok` ile
  çıkıyor; satın almacı adedi düzeltirken dayanağı budur.
- **C-R2/2.** Bu iki sütun pencerenin **iki tablosunda da** kalır: tedarikçi bölümündeki parça
  tablosunda ve katlanabilir "Parça ihtiyacı" tablosunda (QA turu, K6).
- **C-R3.** Pencerenin malzeme tablosu **malzeme odaklı kalır** ve Kesit sütunu durur. Sipariş
  edilen miktar kilogram ya da boy olarak o satırda yazılıyor; parça odaklı yapılırsa o giriş
  alanının yeri kalmaz.
- **C-R4.** Pencerenin **parça ihtiyacı** tablosuna **Ölçü** sütunu gelir (B-R5 ile aynı metin).
- **C-R5.** Tedarikçi bölümündeki tablonun başlığı **"Parça"** olur ve **Ölçü sütunu oraya da
  gelir**; hazır parçada hücre boş kalır (B-R4'ün ikizi). Bugün o tablo "Hazır parça" adını
  taşıyor ama Ana tedarikçisi olan **bütün** parçaları içeriyor, malzemeli olanları da; ölçü
  yalnız katlanmış "Parça ihtiyacı" tablosuna eklenirse aynı parça pencerenin bir tablosunda
  ölçülü, ötekinde ölçüsüz görünür ve satın almacı asıl bu bölümde çalışır. "Hazır parçanın
  ölçüsü yoktur" kuralı aynen kalır (QA turu, Ö1).

### D. Ölçü metni

- **D-R1.** Ölçü metnini tek bir saf fonksiyon üretir ve `kesitMetni`nin yanında durur
  (`siparisIhtiyaci.js`). `kesitMetni` boyu atar, yeni fonksiyon boyu da yazar.
- **D-R1/2.** Yeni fonksiyon `kesitMetni`'yi **çağırır** ve sonuna boyu ekler; böylece `Ø` işareti
  ve biçim sırası tek yerde kalır ve AC-24 kendiliğinden sağlanır. Bugün `Ø` yalnız `kesitMetni`
  içinde, iki dalda geçiyor (QA turu, Ö12).
- **D-R2.** Ölçülerin sırası biçimin kendi sırasıdır (`BICIMLER[bicim].olculer`).
- **D-R3.** Aynı ölçü birden çok kalemde geçiyorsa bir kez yazılır; kesiti aynı boyu farklı iki
  kalem **ayrı ayrı** yazılır.
- **D-R4.** Ölçü, parçanın sipariş adedinden bağımsız okunur.
- **D-R5.** Ölçünün kaynağı C4'te yazılıdır (parçanın malzeme kalemleri); bu madde ona atıftır,
  kuralı tekrar etmez (QA turu, K9).

### E. Değişmeyenler

- **E-R1.** Sipariş adetleri, boy adedi, net ve fire kilogramları, düzenleme, "sipariş etme"
  anahtarı ve asgari sipariş davranışı değişmez.
- **E-R2.** Motorun para hesabı ve dönüş alanları (`tutarK`, `birimK`, `fiyat`, `paraBirimi`,
  `kur`, `tutarNeden`, `tutarTLK`) yerinde kalır; yalnız okunmaz olur.

- **E-R2/2.** `MALZEMESI_ASAGIDA` ve `MALIYET_YOK` sabitleri motorda **kalır** (E-R2 ile aynı
  gerekçe) ama onları çizen tek yer (para hücresinin `tutarNeden`'i) kalkar; tarama "ekranda para
  metni yok" diye ölçer (QA turu, Ö9).
- **E-R3.** `giderYetki` zinciri **iki adım** kısalır: sipariş penceresi değeri okumaz, iki çağıran
  (`PartStokTab`, `PartManager`) geçirmez, ayrıca `PartStokTab`'ın kendi `giderYetki` prop'u ve
  `Stock.jsx`'in ona yaptığı geçiş de ölür (o prop'un tek kullanımı pencereye geçmekti).
  `PartManager`'ın kendi `giderYetki`'si on yerde kullanılıyor ve kalır (QA turu, Ö8).

## Constraints

### Uyulması zorunlu

- **C1.** **0140'ın B-R4'ü ters çevrilir.** O madde para sütunlarını gider yetkisine bağlamıştı,
  çünkü ekran Makina Maliyeti sekmesinden Ayarlar'a taşınınca malzeme fiyatları gider yetkisinin
  arkasından çıkmıştı. Para bütünüyle kalkınca kapının koruyacağı bir şey kalmaz.
- **C2.** Motorun dönüş şekli değişmez (C-R3); bu iş yalnız çizim ve belge düzenidir, tek
  eklenti parça satırının kesit alanıdır.
- **C3.** Ölçü metnini **tek bir saf fonksiyon** üretir ve `kesitMetni`nin yanında durur
  (`siparisIhtiyaci.js`). `kesitMetni` boyu atar, yeni fonksiyon boyu da yazar; ikisi biçim
  sırasını ve `Ø` işaretini aynı yerden okur. Üçüncü bir "Ø yaz" yazılmaz (tarama).
- **C4.** Ölçü, parçanın **malzeme kalemlerinden** okunur, sipariş kesit satırlarından değil.
  Kesit satırları yalnız siparişi sıfırdan büyük parçalar için kuruluyor ve boyu zaten taşımıyor;
  B-R6 bu yüzden ancak kalemden okuyarak sağlanır.
- **C5.** Yeni izin, yeni veri alanı, yeni sunucu kuralı yok.
- **C6.** Kıyas **yalnız motorun sayılarıdır** (AC-32'nin saydıkları); belge HTML'i kıyasa girmez,
  kendi kriterleriyle ölçülür, çünkü belge bütünüyle yeniden yazılıyor. Altın `0142-veri.js` ile
  üretilir: `0141-veri.js`'in malzemelere tedarikçi, parçaların bir kısmına Ana tedarikçi eklenmiş
  kopyası (B-R1/2 ile B-R2/2'nin iki hâlini de taşır). Bugünkü `0141-veri.js`'te hiçbir
  `tedarikciId` yok ve 0140'ın kıyası `tedarikciBolumleri`'ni siliyor, yani tedarikçi bölümleri
  hiç ölçülmüyordu (QA turu, B5).
- **C7.** 0140'ın ters çevrilen kriterleri **listelenir**: B-R4, E-R3/2 ve E-R4 maddeleri ile
  AC-15, AC-16, AC-44, AC-45 ve AC-90 kriterleri parayı gider yetkisine bağlıyor ve bunları
  `tests/siparis-raporu-0140.test.js` ile `tests/ui/siparis-0140.test.jsx` ölçüyor. Ters çevrilen
  kriterlerin testine "spec 0142 ile" notu düşülür (QA turu, Ö7).

### KAPSAM DIŞI

- **X1.** Pencerenin parça odaklı hâle getirilmesi — *neden:* C-R3; kilogram girişi malzeme
  satırında, parça odaklı pencerede o alanın yeri kalmaz. Belge ile pencerenin şekli bilerek
  farklı: pencere karar ekranı, belge teslim kâğıdı.
- **X2.** Boy uzunluğunun satıra yazılması ve belgenin boy adedini kilo yolunda da basması
  — *neden:* ayrı iş, spec'in sonunda öneri olarak duruyor.
- **X3.** Motorun para hesabını kaldırmak — *neden:* E-R2; hesap başka ekranları beslemiyor ama
  kaldırmak geri dönüşü pahalı, okunmaması yeterli.
- **X4.** Belgenin İngilizce basılması — *neden:* sipariş belgesi 0140'tan beri yalnız Türkçe.

## Context

### Bugünkü sütunlar (ölçüm, v3.58.0)

**Sipariş penceresi, Hazır parça tablosu** (`SiparisPenceresi.jsx:78`):
`Hazır parça · İhtiyaç · Stok · Sipariş (öneri) · Sipariş adedi · [Birim maliyet · Tutar] · Sipariş etme`

**Sipariş penceresi, Malzeme tablosu** (`:95`):
`Malzeme · kesit · Net kg · Fire kg · Sipariş (öneri) · Sipariş kg / boy · Boy · Asgari farkı · [Tutar · TL] · Sipariş etme`

**Sipariş penceresi, Parça ihtiyacı tablosu** (`:209`):
`Parça · Ham ihtiyaç · İhtiyaç · Stok · Sipariş (öneri) · Sipariş · Sipariş etme`

**Belge** (`siparisRaporu.js:22`): `hazir: ["Parça", "İhtiyaç", "Stok", "Sipariş adedi"]`,
`hazirPara: ["Birim maliyet", "Tutar"]`, `malzeme: ["Malzeme", "Kesit", "Sipariş kg / Boy"]`,
`malzemePara: ["Birim fiyat", "Tutar"]`.

Köşeli parantezli sütunlar `giderYetki` (pencere) ya da `paraGoster` (belge) ile çiziliyor.

### Paranın bütün izleri

Bir yer atlanırsa para ekranda kalır. Beş yer var:

| Yer | Bugün |
|---|---|
| `SiparisPenceresi.jsx:79, 87` | Hazır parçada Birim maliyet ve Tutar |
| `SiparisPenceresi.jsx:96, 113` | Malzemede Tutar ve TL |
| `SiparisPenceresi.jsx:191` | Tedarikçi bölüm başlığında `tl(b.tutarTLK)` |
| `SiparisPenceresi.jsx:135` | Yazdırma düğmesine `paraGoster={giderYetki}` |
| `siparisRaporu.js:22-23, 46, 52` | Belgenin iki para sütun kümesi (22-23), hazır tablonun para hücreleri (46) ve malzeme tablosunun hizası (52) |
| `siparisRaporu.js:58` | Bölüm başlığındaki toplam (`paraGoster ? tl(b.tutarTLK) : ""`); QA turunda düzeltildi (K2) |

### Kesit verisi nerede

`parcaSatirlari` (`siparisIhtiyaci.js:256`) bugün ölçü taşımıyor: `partId, ad, silinmis, set, patlatildi, setNeden, kaynaklar, iki, ham, ihtiyac, stok, siparis, malzemeli`.

Kesit iki yoldan okunabilir ve **ikincisi doğrudur**:

1. Sipariş kesit satırlarından (`kesitler` haritası; her kesitin `parcalar` listesi `partId`
   taşıyor). Ama o harita yalnız `k.siparis > 0` olan parçalar için kuruluyor, yani stokta yeten
   parçanın kesiti hiç doğmuyor.
2. Parçanın kendi malzeme kalemlerinden: `maliyetKalemleri` → `malzeme.hamKesit(kalem)` →
   `kesitMetni(kalem.bicim, kesit)`. Sipariş adedinden bağımsız, her zaman var.

C4 ikincisini şart koşuyor.

### Bilinen tuzaklar

1. **Belgedeki iki tablo tek tabloya iner.** Bugün "hazır parçalar" ile "malzemeler" ayrı
   üretiliyor (`hazirTablo`, `malzemeTablo`) ve ikisi ayrı veri kümesinden besleniyor:
   `bolum.hazir` parça satırları, `bolum.malzeme` kesit satırları. B-R1 bunları tek listede
   birleştirirken sıra B-R6'dan gelir ve kesit satırının kilogramı B-R7'nin toplam satırına
   taşınır. Veri kaybolmuyor, yeri değişiyor.
2. **Hazır parçanın ölçüsü yoktur, ama bölümün dizisi yalnız hazır parçaları taşımıyor.**
   `b.hazirParcalar` dizisi Ana tedarikçisi olan **bütün** parçaları taşır, malzemeli olanları da
   (`birimK: null`, `tutarNeden: MALZEMESI_ASAGIDA`); dizinin adı yanıltıcıdır. Alıntılanan
   `if (!k.malzemeli ...) continue;` satırı kesit kurucusunun içindedir, bu sınıflamanın değil
   (QA turu, K1). B-R4 boş hücreyi "malzeme kalemi yok" anlamında şart koşar ve B-R4/2 eksik
   ölçüyü ondan ayırır; C-R5 ölçü sütununu bu tabloya da getirir.
3. **Bir parçanın birden çok malzeme kalemi olabilir.** O zaman ölçü hücresinde birden çok ölçü
   (D-R3) ve altında birden çok malzeme satırı olur; B-R3 tek malzeme varsayamaz.
4. **Pencerenin malzeme tablosu kesiti yazmaya devam eder ve boy yazmaz.** O satırlar aynı
   çubuktan kesilen bütün parçaları topluyor (Ø35'ten hem 342 mm hem 400 mm çıkıyor), tek bir
   boy yazılamaz. Belgede ise boy parça satırında yazıyor. İki yüzeyin farkı bilerek.
5. **`giderYetki` prop'u A-R4 ve C-R1 ile kullanılmaz hâle gelir**; çağıran (`PartStokTab`,
   `PartManager`) artık geçirmez, yoksa ölü prop kalır. QA turunda zincirin iki adım daha uzun
   olduğu ölçüldü (E-R3).

### QA turunda ölçülenler (2026-11-11)

Hepsi v3.58.0 kaynağında doğrulandı.

- **Ölçüm A.** `siparisIhtiyaci.js:393-400` parçayı **parçanın** `tedarikciId`'siyle bölümlüyor,
  `:402-405` kesit satırını **malzemenin** `tedarikciId`'siyle; 0140 C-R8 bunu bilerek ikiye
  ayırmıştı.
- **Ölçüm B.** `siparisIhtiyaci.js:395` Ana tedarikçisi olmayan malzemeli parçayı yalnız sayıp
  atlıyor (`belirtilmemis.anasizMalzemeli++` ve `continue`); metni `anasizMalzemeliMetni` =
  "n malzemeli parçanın Ana tedarikçisi yok; malzemesi kendi tedarikçisinin bölümünde."
- **Ölçüm C.** `malzeme.js:199-209` `hamOlculer` biçimin bütün ölçüleri dolu ve sıfırdan büyük
  değilse `null` döner; `hamKesit` de null olur, yani boyu girilmemiş kalem ölçü üretmez.
- **Ölçüm D.** `siparisRaporu.js:28-33` `basilacakBolumler` iki ayrı süzgeç kullanıyor: parça
  satırında kapalı değil, hatasız ve `siparis > 0`; kesit satırında kapalı değil, hatasız ve
  sipariş kilosu ya da boy adedi sıfırdan büyük.
- **Ölçüm E.** `tests/fixtures/0141-veri.js` içinde hiçbir `tedarikciId` yok (ne parçada ne
  malzemede) ve `tests/siparis-0140-kiyas.test.js` `delete r.tedarikciBolumleri` ile o bloğu
  kıyasın dışında bırakıyor.
- **Ölçüm F.** `b.hazirParcalar` dizisi Ana tedarikçisi olan bütün parçaları taşıyor, malzemeli
  olanları da (`birimK: null`, `tutarNeden: MALZEMESI_ASAGIDA`); `!k.malzemeli` ölçütü kesit
  kurucusunda (`siparisIhtiyaci.js:273`) ve `hazirSayi` sayacında (`:352`) geçiyor.
- **Ölçüm G.** Bir parçanın birden çok malzeme kalemi olabilir (`malzemeKalemleri(p)` dizisi) ve
  her kalem başka malzeme ile kesit taşıyabilir.
- **Ölçüm H.** Kesit satırı `malzemeAd`, `kesitMetni`, `siparisKg`, `boyAdedi`, `yontem`, `kapali`
  ve `hata` alanlarını taşıyor; bölümün `malzemeler` dizisinde duruyor.
- **Ölçüm I.** Tek tablonun üç sütunu (Parça, Ölçü, Sipariş adedi) kilogram ya da boy adedini
  taşımıyor.
- **Ölçüm J.** `siparisRaporuHtml`'in `paraGoster` parametresi, `BELGE_SUTUNLARI`'nın `hazirPara`
  ile `malzemePara` kümeleri ve üç biçimleyici (`tl`, `tutarPb`, `birimPb`) yalnız para için var.
- **Ölçüm K.** 0140'ın B-R4, E-R3/2 ve E-R4 maddeleri ile AC-15, AC-16, AC-44, AC-45 ve AC-90
  kriterleri parayı gider yetkisine bağlıyor; `tests/siparis-raporu-0140.test.js` ve
  `tests/ui/siparis-0140.test.jsx` bunları ölçüyor.
- **Ölçüm L.** `PartStokTab`'ın `giderYetki` prop'unun tek kullanımı sipariş penceresine geçmek
  (satır 28 ve 335); `Stock.jsx` onu satır 80'de geçiriyor. `PartManager`'ın kendi `giderYetki`'si
  on yerde kullanılıyor.
- **Ölçüm M.** `MALZEMESI_ASAGIDA` ve `MALIYET_YOK` yalnız `tutarNeden` üzerinden, yalnız para
  hücresinde çiziliyor (`SiparisPenceresi.jsx:87`).
- **Ölçüm N.** `siparisRaporuHtml` belgenin başına `bolum("MODELLER", "", modeller)` basıyor (model
  adı ve makina adedi).
- **Ölçüm O.** Patlatılan set bölüme girmiyor (`if (k.set && k.patlatildi) continue;`);
  patlatılmayan set `malzemeli: false` olduğu için hazır parça gibi görünüyor.
- **Ölçüm P.** `Ø` işareti yalnız `kesitMetni` içinde, iki dalda geçiyor (`mil` ve `boru`,
  `siparisIhtiyaci.js:519-520`).
- **Ölçüm R.** `kesitMetni` sayıları `sayiHane` ile biçimliyor (tr-TR, en çok üç ondalık).
- **Ölçüm S.** Bölüm başlığındaki toplam `siparisRaporu.js:58`'de
  (`paraGoster ? tl(b.tutarTLK) : ""`); satır 52 malzeme tablosunun hizalama dizisidir.
- **Ölçüm T.** Sipariş adedi sıfır olan parça bölüme girmiyor (`oneri > 0` kapısı,
  `siparisIhtiyaci.js:391`) ve belgeye de girmiyor (`siparis > 0` süzgeci); yalnız katlanmış
  "Parça ihtiyacı" tablosunda görünüyor.

### QA turunda verilen kararlar (2026-11-11)

1. **Malzemeden kesilen parça belgede malzemesinin tedarikçisinin bölümüne girer** (Bloklayıcı;
   B-R1/2; Ölçüm A).
2. **Ana tedarikçisi olmayan malzemeli parça da belgeye girer** (Bloklayıcı; B-R2/2; Ölçüm B).
3. **Ölçüsü çözülemeyen kalemde hücre boş kalır ve nedeni yazar** (Bloklayıcı; B-R4/2; Ölçüm C).
4. **Tek tablonun süzgeci parça satırıdır** (Bloklayıcı; B-R1/3; Ölçüm D).
5. **Kıyas yalnız motorun sayılarıdır ve `0142-veri.js` ile üretilir** (Bloklayıcı; C6, AC-32;
   Ölçüm E).
6. **Tedarikçi bölümündeki tablonun adı "Parça" olur ve Ölçü sütunu oraya da gelir** (Önemli;
   C-R5; Ölçüm F).
7. **Çok kalemli parçanın sıra anahtarı ilk kalemidir** (Önemli; B-R6/2; Ölçüm G).
8. **Toplam satırı kesit satırlarından kurulur, kapalı ve hatalı kesit girmez** (Önemli; B-R7/2,
   AC-15; Ölçüm H).
9. **Toplam satırı bölümün sonunda kendi küçük tablosudur** (Önemli; B-R7/2; Ölçüm I).
10. **Ölçü hücresinde birden çok ölçü alt alta yazılır** (Önemli; B-R5/2).
11. **Belgenin para iskeleti de kalkar** (Önemli; A-R6/2; Ölçüm J).
12. **Ters çevrilen 0140 kriterleri listelenir** (Önemli; C7, Definition of Done; Ölçüm K).
13. **`giderYetki` zinciri iki adım kısalır** (Önemli; E-R3; Ölçüm L).
14. **İki neden sabiti motorda kalır, çizen yer kalkar** (Önemli; E-R2/2; Ölçüm M).
15. **Belgenin MODELLER tablosu kalır, bu bilinçli karar yazıldı** (Önemli; B-R8; Ölçüm N).
16. **Set satırı hazır parça kuralıyla basılır** (Önemli; B-R4/2; Ölçüm O).
17. **Yeni fonksiyon `kesitMetni`'yi çağırır** (Önemli; D-R1/2; Ölçüm P).
18. **Ölçü metninin sayı biçimi `kesitMetni`'ninkiyle aynıdır** (Önemli; B-R5/2; Ölçüm R).
19. **"Hazır parça" tanımının alıntısı düzeltildi** (Küçük; Bilinen tuzaklar 2; Ölçüm F).
20. **Bölüm başlığı toplamının satır numarası düzeltildi** (Küçük; paranın izleri tablosu;
    Ölçüm S).
21. **AC-15'in ölçütü "malzeme satırı olmayan tedarikçi" oldu** (Küçük; AC-15).
22. **Etkilenen alanlar satırı tamamlandı** (Küçük; başlık tablosu).
23. **Bağımlı spec'lere 0139 eklendi** (Küçük; başlık tablosu).
24. **C-R2'nin iki sütunu pencerenin iki tablosunda da kalır** (Küçük; C-R2/2).
25. **AC-19'a örnek ölçü yazıldı** (Küçük; AC-19).
26. **AC-23 pencerenin parça ihtiyacı tablosuna bağlandı** (Küçük; AC-23; Ölçüm T).
27. **D-R5 kuralı tekrar etmez, C4'e atıftır** (Küçük; D-R5).
28. **Ölçü sütun başlığı pencerede ve belgede aynı metindir** (Küçük; B-R5/2).

### QA turu karar kaydı (2026-11-11)

| No | Bulgu | Derece | Karar | İşlendiği yer |
|---|---|---|---|---|
| 1 | Parçanın bölümü yazılmamış | Bloklayıcı | Malzemesinin tedarikçisi | B-R1/2 |
| 2 | Ana tedarikçisiz malzemeli parça görünmüyor | Bloklayıcı | Belgeye girer | B-R2/2 |
| 3 | Eksik ölçülü kalemde hücre tanımsız | Bloklayıcı | Boş hücre artı neden | B-R4/2 |
| 4 | Tek tabloda iki süzgeç çelişiyor | Bloklayıcı | Ölçüt parça satırı | B-R1/3 |
| 5 | Kıyasın verisi ve kapsamı yazılmamış | Bloklayıcı | Motor sayıları, `0142-veri.js` | C6, AC-32 |
| 6 | Pencerenin tablosu malzemeli parça taşıyor | Önemli | Ad "Parça", ölçü oraya da | C-R5 |
| 7 | Çok kalemli parçada sıra anahtarı yok | Önemli | İlk kalem | B-R6/2 |
| 8 | Toplam satırının verisi ve süzgeci yok | Önemli | Kesit satırları | B-R7/2, AC-15 |
| 9 | Toplam satırının yeri yazılmamış | Önemli | Bölümün sonunda ayrı tablo | B-R7/2 |
| 10 | Çok ölçünün ayracı yazılmamış | Önemli | Alt alta satırlar | B-R5/2 |
| 11 | Para iskeletinin kaderi belirsiz | Önemli | Belgeden kalkar | A-R6/2 |
| 12 | Ters çevrilen 0140 kriterleri sayılmamış | Önemli | Liste ve DoD maddesi | C7, DoD |
| 13 | `giderYetki` zinciri eksik sayılmış | Önemli | İki adım daha | E-R3 |
| 14 | İki neden sabiti okunmaz kalıyor | Önemli | Motorda kalır | E-R2/2 |
| 15 | MODELLER tablosu tedarikçiye plan gösteriyor | Önemli | Kalır, karar yazıldı | B-R8 |
| 16 | Set satırının hâli yazılmamış | Önemli | Hazır parça kuralı | B-R4/2 |
| 17 | "Yanında durur" uygulamayı serbest bırakıyor | Önemli | `kesitMetni` çağrılır | D-R1/2 |
| 18 | Sayı biçimi yazılmamış | Önemli | Aynı biçimleyici | B-R5/2 |
| 19 | "Hazır parça" tanımının alıntısı yanlış | Küçük | Düzeltildi | Bilinen tuzaklar 2 |
| 20 | Toplam satırının numarası yanlış | Küçük | 58 | Paranın izleri |
| 21 | AC-15'in ölçütü yanlış küme | Küçük | Malzeme satırı | AC-15 |
| 22 | Etkilenen alanlar eksik | Küçük | Tamamlandı | Başlık tablosu |
| 23 | Bağımlı spec eksik | Küçük | 0139 eklendi | Başlık tablosu |
| 24 | C-R2 hangi tablo belirsiz | Küçük | İkisi de | C-R2/2 |
| 25 | AC-19 örneksiz | Küçük | Örnek yazıldı | AC-19 |
| 26 | AC-23 belgede ölçülemez | Küçük | Parça ihtiyacı tablosu | AC-23 |
| 27 | D-R5 ile C4 aynı cümle | Küçük | Atıfa indirildi | D-R5 |
| 28 | Sütun başlığının tekliği yazılmamış | Küçük | Tek metin | B-R5/2 |


---

## Acceptance Criteria

### A. Belgeden kalkanlar

- **AC-1.** Belgede "İhtiyaç" başlığı yoktur.
- **AC-2.** Belgede "Stok" başlığı yoktur.
- **AC-3.** Belgenin parça tablosunda "Kesit" başlığı yoktur; başlıklar birebir `Parça · Ölçü · Sipariş adedi` (A-R3/2).
- **AC-4.** Belgede "Birim maliyet", "Tutar" ve "Birim fiyat" başlıklarının hiçbiri yoktur.
- **AC-5.** Gider yetkisi olan kullanıcının bastığı belgede de para yoktur.
- **AC-6.** Belgede tedarikçi bölümünün başlığında tutar yazmaz.

### B. Belgenin yeni düzeni

- **AC-7.** Belge tedarikçi başına tek tablo basar ve başlıkları `Parça · Ölçü · Sipariş adedi`
  olur.
- **AC-8.** Malzemeden kesilen parçanın hemen altındaki satır o parçanın malzemesinin adını
  yazar.
- **AC-9.** Hazır alınan parçanın ölçü hücresi boştur.
- **AC-10.** Hazır alınan parçanın altında malzeme satırı çizilmez.
- **AC-11.** Aynı çubuktan kesilen iki parça tabloda yan yana durur.
- **AC-12.** Hazır alınan parçalar tablonun sonunda durur.
- **AC-13.** Tedarikçi bölümünün sonunda "Alınacak malzeme toplamı" satırı vardır ve malzeme ile
  kesit başına sipariş kilosunu yazar.
- **AC-14.** Boy fiyatından alınan malzemenin toplam satırı kilogram değil boy adedi yazar.
- **AC-15.** Hiç **malzeme satırı** olmayan tedarikçide toplam satırı çizilmez (ölçüt parça değil
  kesit satırıdır; QA turu, K3).

### C. Ölçü metni

- **AC-16.** Yuvarlak mil Ø100 × 108 kalemli parçanın satırında `Ø100 × 108` yazar.
- **AC-17.** Boru kalemli parçanın satırında `Ø19 × 1,5 et × 173` yazar.
- **AC-18.** Lama kalemli parçanın satırında `10 × 20 × 125` yazar.
- **AC-19.** Sac kalemli parçanın satırında kalınlık, en ve boy bu sırayla yazar: `10 × 100 × 200`
  (QA turu, K7).
- **AC-20.** İki ayrı ölçüde malzeme kalemi olan parçanın satırında iki ölçü de yazar.
- **AC-21.** Ölçüsü birebir aynı iki kalemi olan parçanın satırında ölçü bir kez yazar.
- **AC-22.** Kesiti aynı ama boyu farklı iki kalemi olan parçanın satırında iki ölçü de yazar.
- **AC-23.** Stokta yeten (sipariş adedi 0) parçanın satırında da ölçü yazar; ölçüm pencerenin
  **"Parça ihtiyacı"** tablosunda yapılır, çünkü o parça tedarikçi bölümüne ve belgeye girmiyor
  (QA turu, K8).
- **AC-24.** Kaynakta `Ø` işaretini satır içinde üreten üçüncü bir yer yoktur (tarama).

### D. Pencere

- **AC-25.** Sipariş penceresinin hazır parça tablosunda "Stok" ve "İhtiyaç" başlıkları durur.
- **AC-26.** Sipariş penceresinin parça ihtiyacı tablosunda "Stok" başlığı durur.
- **AC-27.** Sipariş penceresinin malzeme tablosunda "Kesit" bilgisi durur ve boy yazmaz.
- **AC-28.** Sipariş penceresinin parça ihtiyacı tablosunda "Ölçü" başlığı vardır.
- **AC-29.** Tedarikçi bölümündeki tablonun başlığı "Parça"dır, Ölçü sütunu vardır ve hazır
  parçanın hücresi boştur (C-R5; QA turu, Ö1).
- **AC-30.** Pencerede hiçbir para sütunu çizilmez, gider yetkisi olan kullanıcıda da.
- **AC-31.** Kaynakta sipariş penceresi `giderYetki` değerini okumaz ve çağıranlar geçirmez
  (tarama).

### E. Kıyas

- **AC-32.** Sipariş adetleri, boy adedi, net ve fire kilogramları, asgari farkı ve düzenleme
  davranışı spec öncesi altınla birebir aynıdır (`0142-once.json`, veri `0142-veri.js`); belge
  HTML'i kıyasa girmez (C6; QA turu, B5).
- **AC-33.** Motorun dönüş nesnesindeki para alanları yerinde durur ve değerleri değişmez.


### F. QA turu kriterleri (2026-11-11)

**Bölümleme ve süzgeç**

- **AC-34.** Malzemesinin tedarikçisi A, kendi Ana tedarikçisi B olan parça belgede **A**'nın
  bölümünde görünür (B-R1/2).
- **AC-35.** Ana tedarikçisi girilmemiş malzemeli parça belgede malzemesinin tedarikçisinin
  bölümünde görünür (B-R2/2).
- **AC-36.** İki ayrı firmadan malzeme kalemi olan parça iki bölümde de görünür ve her bölümde
  yalnız o firmanın malzeme satırı altında yazar (B-R1/2).
- **AC-37.** Hazır alınan parça kendi Ana tedarikçisinin bölümünde kalır (B-R1/2).
- **AC-38.** Kapatılmış ya da hatalı parça satırı belgeye girmez; altındaki malzeme satırı da
  basılmaz (B-R1/3).
- **AC-39.** Parçası açık, kesidi kapatılmış malzeme varsa bölümün sonunda uyarı yazar (B-R1/3).
- **AC-40.** Pencerenin "Ana tedarikçisi yok" uyarısı yalnız hazır parçaları sayar (B-R2/2).

**Ölçü ve satır düzeni**

- **AC-41.** Boyu girilmemiş kalemi olan parçanın ölçü hücresi boştur ve adının altında "ölçüsü
  girilmemiş" ibaresi görünür; satır listeden düşmez (B-R4/2).
- **AC-42.** Patlatılmayan setin satırında ölçü hücresi boştur ve altında malzeme satırı yoktur
  (B-R4/2).
- **AC-43.** İki ölçülü parçanın hücresinde ölçüler alt alta ayrı satırlarda durur ve aralarında
  noktalama yoktur (B-R5/2).
- **AC-44.** Ondalıklı ölçü `kesitMetni`'nin biçimiyle yazılır (virgüllü, en çok üç ondalık)
  (B-R5/2).
- **AC-45.** Ölçü sütununun başlığı pencerede ve belgede aynı metindir (B-R5/2).
- **AC-46.** İki malzeme kalemi olan parça tabloda bir kez yazar ve sırası ilk kaleminin malzeme
  artı kesit anahtarından gelir (B-R6/2).
- **AC-47.** Ölçü metnini üreten fonksiyon `kesitMetni`'yi çağırır; kaynakta ikinci bir biçim
  sırası ya da `Ø` yazımı yoktur (D-R1/2, tarama).

**Toplam, para ve belge**

- **AC-48.** "Alınacak malzeme toplamı" bölümün sonunda kendi tablosudur ("Malzeme · Kesit ·
  Alınacak") ve tek tablonun sütunlarına karışmaz (B-R7/2).
- **AC-49.** Kapatılmış ya da hatalı kesit toplam satırına girmez (B-R7/2).
- **AC-50.** `siparisRaporuHtml` `paraGoster` parametresi almaz ve belge modülünde `hazirPara`,
  `malzemePara` kümeleri ile üç para biçimleyicisi yoktur (A-R6/2, tarama).
- **AC-51.** Belgenin başındaki MODELLER tablosu durur ve model adı ile makina adedini yazar
  (B-R8).
- **AC-52.** `MALZEMESI_ASAGIDA` ve `MALIYET_YOK` motorda durur ama hiçbir ekranda ve belgede
  basılmaz (E-R2/2, tarama).
- **AC-53.** `PartStokTab` `giderYetki` prop'u almaz ve `Stock.jsx` ona geçirmez; `PartManager`'ın
  kendi `giderYetki`'si yerinde kalır (E-R3, tarama).
- **AC-54.** Ters çevrilen 0140 kriterleri listelenmiştir ve testlerine "spec 0142 ile" notu
  düşülmüştür (C7).

### G. Plan turu kriterleri (revizyon 3, 2026-11-11)

- **AC-55.** Kalem adedi 2 olan parçanın ölçü satırı "· parça başına 2" ile biter; aynı ölçüde iki kalem (adet 1)
  bir kez ve "· parça başına 2" ile yazılır; tek kalemli adedi 1 olan parçada ek yoktur (B-R5/3).
- **AC-56.** Bütün parçaları kapatılmış, kesidine elle kilo yazılmış bölüm belgede toplam tablosuyla basılır (B-R1/4).
- **AC-57.** Malzemesi çöpte olan tek kalemli parça Ana tedarikçisinin bölümünde kalır; Ana tedarikçisi yoksa belgeye
  girmez (B-R1/5).
- **AC-58.** İki firmalı parça iki bölümde de aynı sipariş adedini yazar ve belgede çift sayım cümlesi yoktur (B-R1/6).
- **AC-59.** Malzemeden kesilen parçalar malzeme adı, kesit ve parça adına göre sıralanır; hazır parçalar kit
  sırasında kalır (B-R6/3).
- **AC-60.** Pencerede kesit satırının fiyat, kur ve para birimi nedenleri basılmaz ve eksik sayacının metni tutar
  demez (E-R2/3).

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Kesit metni saf motordan; arayüz yalnız gösteriyor.
- [ ] Pencere ve belge aynı kaynağı kullanıyor (B-R5).
- [ ] Yeni kalıcı alan yok; **yeni eylem izni eklenmediği açıkça yazıldı** (C5).
- [ ] Kullanıcıya görünen tüm metinler Türkçe; belge yalnız Türkçe basılıyor (0140 ile aynı).
- [ ] Para gösterilmediği için çoklu para kuralı konusuz; motorun alanları korundu (AC-33).
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi; sipariş penceresinin ekranları yeniden çekildi.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md`'nin 0140 bölümü güncellendi (B-R4 ters çevrildi).
- [ ] Kıyas kararı uygulandı: altın `0142-veri.js` ile üretildi (malzemelerde tedarikçi,
      parçaların bir kısmında Ana tedarikçi) ve yalnız motorun sayılarını kapsıyor (C6).
- [ ] Ters çevrilen 0140 kriterleri listelendi ve testlerine "spec 0142 ile" notu düşüldü (C7).
- [ ] Belgede parçanın bölümü malzemesinin tedarikçisinden geliyor ve Ana tedarikçisi olmayan
      malzemeli parça da basılıyor (B-R1/2, B-R2/2).
- [ ] `giderYetki` zinciri dört yerden de kalktı ve ölü prop kalmadı (E-R3, tarama).
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## Kararlar

### Takım Yöneticisi'nin kararları (2026-11-11)

1. **Sipariş listesinde parçanın ölçüleri yazacak** (çap ve boy), çap işaretiyle beraber.
   Parça eklenirken çap ve boy giriliyor, müşteri listede bu ikisini de görmek istiyor.
2. **Stok ve para kalkacak.** Stok yalnız belgeden, para hem belgeden hem pencereden.
3. **Belge parça odaklı olacak** (mockup üzerinden, aynı gün): parçanın altına malzemesi gelir,
   İhtiyaç sütunu kalkar, ayrı Kesit sütunu kalkar, ölçü belgeye de gelir.

### Revizyon kaydı

**Revizyon 1:** "parçanın kesiti" kuralı "parçanın tam ölçüsü" oldu. Sebep: `kesitMetni` boyu
bilerek atıyor (malzeme satırları farklı boydaki parçaları topluyor), oysa parça satırında boy
gerekli.

**Revizyon 2:** belgenin düzeni değişti. Analistin "belgeye parça tablosu eklenmesin" önerisi
2026-11-11'de **geri alındı**. Gerekçe tutmadı: öneri, tedarikçinin parçayı değil çubuğu
gönderdiği varsayımına dayanıyordu; fabrika belgeyi **kesim listesi** olarak kullanıyor, yani
tedarikçi çubuğu ölçüsünde kesip gönderiyor. Bu durumda parça birincil satırdır, malzeme
altındaki açıklamadır.

**Revizyon 3 (plan turu, 2026-11-11):** geliştiricinin planındaki on öneri Takım Yöneticisi tarafından onaylandı ve
A-R3/2, B-R1/4, B-R1/5, B-R1/6, B-R5/3, B-R6/3, E-R2/3 ile AC-55–AC-60 olarak işlendi. AC-3 parça tablosuna daraltıldı
(AC-48 ile çelişiyordu).

**Analistin eklemesi, onaylandı:** "Alınacak malzeme toplamı" satırı (B-R7). Kesit sütunu
belgeden kalkınca kilogram bilgisi belgede hiç kalmıyordu; bu satır onu tek satırda geri veriyor.

### QA turunun kararlara etkisi (2026-11-11)

Takım Yöneticisi'nin üç kararı ve iki revizyon aynen durur. Revizyon 2'nin kendi gerekçesi
("fabrika belgeyi kesim listesi olarak kullanıyor") QA turunda iki yerde sonuca bağlandı: parça
birincil satırsa bölümü de malzemesinin tedarikçisinden gelmelidir (B-R1/2) ve Ana tedarikçisi
olmayan parça da basılmalıdır (B-R2/2), yoksa belge canlı veride boş çıkardı. Analistin onaylanan
eklemesi ("Alınacak malzeme toplamı") yeri ve süzgeciyle tanımlandı (B-R7/2).

Kapsam iki yerde büyüdü: pencerenin tedarikçi bölümündeki tablo da Ölçü sütunu alır ve adı
"Parça" olur (C-R5), belgenin para iskeleti de kalkar (A-R6/2). Bir yerde daraldı: kıyas yalnız
motorun sayılarını kapsar, belge HTML'i kendi kriterleriyle ölçülür (C6). İki iddia düzeltildi:
"hazır parça" tanımının alıntısı ve bölüm başlığı toplamının satır numarası.

### Bu spec'in dışında kalan, önerilen sonraki iş

Sipariş belgesinin satın alma dilini tamamlaması için üç madde daha gerekiyor ve üçü de bu
spec'in kapsamı dışında (X2):

1. Belge, kiloyla fiyatlanan malzemede de **boy adedini** bassın (bugün yalnız boy fiyatından
   alınanda basıyor; veri motorda `boyAdedi` olarak zaten var).
2. Satır, kesitin yanında **boy uzunluğunu** yazsın ("Ø16 × 1000 mm · 1 boy").
3. Malzeme kartında **çap başına geldiği boy** tablosu olsun (bugün kart başına tek değer var,
   bu yüzden aynı karttaki Ø16 ile Ø130 aynı boydan geliyor sayılıyor).

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 3 | Revizyon 3 plan turunda: AC-3 ile AC-48 çelişkisi ve belgede kaybolan kalem adedi dahil on öneri |
| **Düzeltme turu sayısı** | 1 | Triyaj (2026-11-11), iki bulgu |
| **Bulgu gerçek/gürültü oranı** | 2 / 0 | İkisi de gerçek: pencere ile belgenin bölümlemesi farkı ekranda söylenmiyordu; seçim dışı hatalı adet belgede yarım satır bırakıyordu |
| **Regresyon sayısı** | 0 | Motorun sayıları spec öncesi altınla birebir (`0142-once.json`) |
| **Kaçan hata** | 0 | |

**Bu spec'ten çıkarılan ders:** iki yüzey (pencere ve belge) bilerek farklı bölümlenince fark iki yerde sızar: ekranda düzenlenen
satırın kâğıtta nerede olduğu ve pencerenin hata sayımının belgenin bölümlerini görmemesi. İki yüzeyin şekli ayrıştığında her
yüzeyin kendi kapısı (basılabilirlik) kendi bölümlerinden sayılmalı ve öteki yüzeydeki yeri ekranda yazılmalı.
