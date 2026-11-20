# 0150 — Sipariş listesinde işlem kalemleri, toplu fiyat kipi düğmeleri kalkar

| | |
|---|---|
| **Durum** | Onaylandı (Takım Yöneticisi, 2026-11-20) |
| **Revizyon** | 3 (2026-11-20 plan onayı: R3/5, R5/3, R9/4, R10/2; plan `specs/done/0150-uygulama-plani.md`) |
| **Sahip** | Analist (yazım) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | **A:** sipariş motoru (`lib/siparisIhtiyaci.js`: iki bölüm yapısı, tedarikçi seçicisi, yeni metin sabitleri), belge kurucusu (`lib/siparisRaporu.js`: `BELGE_SUTUNLARI`, işlemler tablosu, basılacak bölümler) ve pencere (`stock/SiparisPenceresi.jsx`). **B:** `components/PartManager.jsx`'in toplu kip bloğu, kanıt aracının bir ekranı ve `docs/evidence/kanit-eslemesi.json`'un etkilenen kayıtları |
| **Bağımlı spec'ler** | 0133, 0135, 0138, 0140, 0142, 0144, 0147, 0149 |
| **QA turu** | 2026-11-20: 26 bulgu (3 Bloklayıcı / 12 Önemli / 11 Küçük), hepsi onaylandı |
| **Düzeltilen iddialar** | 4 (X5'in gerekçesi, iki satır aralığı, Intent B'nin "tek tık" rakamı) |

---

## Intent

**A.** Fabrika bir parçayı yalnız malzemesini alarak yaptırmıyor: kaplama, ısıl işlem, taşlama gibi
işleri dışarıya veriyor ve bunları parça kartına işlem kalemi olarak giriyor. Sipariş listesi bu
işleri hiç göstermiyor; yani bir sonraki parti için "kime ne sipariş edeceğim" sorusunun yarısı
kâğıtta yok. Fason firmaya verilecek liste elle, hafızadan çıkarılıyor.

Bu iş bittiğinde sipariş listesi, o firmaya gidecek işleri de yazacak: hangi parçaya, hangi işlem,
kaç adet; fiyatlı nüshada tutarıyla birlikte.

**B.** Aynı ekranın başlığındaki "Listedeki n parçayı maliyete bağla / elle sabite al" düğmeleri
müşteriye göre gereksiz ve tehlikeli: iki tıkla (düğme, sonra onay) süzgeçten geçen bütün parçaların
fiyat kipini değiştiriyor ve süzgeç boşken bu bütün katalog demek. Müşteri bu
toplu işlemi istemiyor; kipi parça kartından tek tek değiştirmeyi yeterli buluyor. Bu iş bittiğinde
o iki düğme ve altındaki açıklama ekranda olmayacak, kipi değiştirmenin yolu (parça kartı ve liste
süzgeci) duracak.

---

## Requirements

### A. Sipariş listesinde işlemler

- **R1.** Sipariş listesi, sipariş edilecek parçaların işlem kalemlerini de gösterir: hem ekranda
  hem belgede, tedarikçi bölümünün içinde kendi tablosunda ("İşlemler").
- **R1/2.** Okunan küme tek türetme yolundan gelir (`maliyetKalemleri.islemKalemleri`), ayrım
  yapılmaz: eski `hammaddeler` kırılımından türeyen ve adı `TURETILEN_KALEM_ADI` ("Hammadde alımı")
  olan kalem de satır üretir. O firmadan alınacak gerçek bir kalemdir; "şu ad hariç" diye bir ikinci
  kural yazmak 0135 C1/2'ye aykırı olur ve eski veride sipariş kâğıttan düşerdi.
- **R1/3.** Tablonun yeri: tedarikçi bölümünde hammadde grup tablolarından **sonra**, sipariş farkı
  notundan **önce**; kendi toplamı (fiyatlı nüshada) hemen tablonun altında; bölüm toplamı bugünkü
  yerinde, en sonda kalır.
- **R2.** İşlem satırının sütunları: **uygulanan parça**, **işlem**, **adet**; fiyatlı nüshada
  sonuna **tutar** eklenir. Ekranda para gösterilmez (bugünkü kural).
- **R2/2.** Başlıkların birebir metni: tablo başlığı "İşlemler", sütunlar sırayla `Parça`, `İşlem`
  ve `Sipariş adedi`, fiyatlı nüshada sonuna `BELGE_SUTUNLARI.fiyat`. Sütunlar belgenin tek yerinde
  tanımlıdır: `BELGE_SUTUNLARI`'na `islem` anahtarı ve `belgeSutunlari`'na karşılık gelen dal
  eklenir. "Sipariş adedi" komşu parça tablosunun başlığıyla aynı anlamı taşıdığı için aynı sözcük
  kullanılır.
- **R2/3.** Adet her zaman **parça adedidir** (`adetMetni`): boydan sipariş edilen parçanın parça
  tablosunda "n boy (… mm)" yazsa da işlem satırı boy biçimini kullanmaz. Fason iş parçaya
  uygulanır, çubuğa değil.
- **R2/4.** Sonuç olarak fason bedeli yalnız fiyatlı nüshada görünür; ekranda hiçbir yerde tutar
  yoktur (0142 C-R1 ile tutarlı).
- **R3.** Adet, o parçanın sipariş adedidir. Stoktan karşılandığı için sipariş adedi sıfıra düşen,
  kapatılan ya da hatalı adedi olan parçanın işlemi de listede yer almaz.
- **R3/2.** Adet **düzenlenmiş** değerden okunur (öneriden değil); satır düzenlenmişse belgede
  `(elle)` işareti taşır ve bölümün `ELLE_NOTU` koşuluna işlem satırları da girer. İşlem satırı
  parçanın bölümünden farklı bir bölümde basıldığı için (R5), notun koşulu yalnız parça satırlarına
  bakarsa fason firmaya açıklaması olmayan bir damga gider.
- **R3/3.** Hatalı adedi olan parçanın işlemi basılmaz ama düştüğü bölümün `hataSayisi` sayacını
  artırır (parça satırının bugünkü kuralının ikizi); o bölüm basılacaksa belge kilitlenir.
- **R3/4.** Üç sınır durumu: çöpteki parça ve patlatılan set işlem satırı üretmez (set parçasında
  kalem listesi 0121'den beri pasiftir, veride kalmış kalem okunmaz); Ana tedarikçisi olmayan
  **malzemeli** parçanın işlemi, parçanın kendi satırı hiçbir yerde görünmese de kendi firmasının
  bölümünde görünür.
- **R3/5.** (Plan onayı P1) Hiçbir set işlem satırı üretmez: patlatılmamış, doğrudan sipariş edilen set
  de. Set kartında kalem listesi 0121'den beri pasiftir; veride kalmış kalem okunmaz.
- **R4.** Tutar, işlem kaleminin birim tutarı ile adedin çarpımıdır (kalemin `tutar` alanı parça
  başınadır, TL ve KDV hariç). Tutarı girilmemiş işlem kaleminin satırı yine basılır, tutar
  hücresinde nedeni yazar.
- **R4/2.** Neden tek yeni metin sabitindedir (ör. "tutar girilmedi"); ekran ve belge kendi metnini
  yazmaz. `eskiKatalogKalemi` (spec 0138'in `islemId` taşıyan eski kalemi) satır üretmez (X7).
- **R5.** İşlem satırı, işlem kaleminin **kendi tedarikçisinin** bölümüne girer. Parçanın Ana
  tedarikçisi ya da malzemesinin tedarikçisi bu yerleşimi etkilemez.
- **R5/2.** Tedarikçi seçicisinin listesi genişler: `tedarikciSecenekleri` artık bir parçanın işlem
  kaleminde geçen canlı tedarikçileri de verir (`kalemTedarikciIdleri`) ve `HAMMADDE_SUZGEC_NEDENI`
  metni bunu söyler. Bugünkü liste yalnız hammadde işaretli ya da bir parçanın veya malzemenin
  **Ana** tedarikçisi olan firmaları veriyor; yalnız işlem kaleminde geçen fason firma seçilemediği
  için kullanıcı bir seçim yaptığı anda R8'in kartı ve belge bölümü süzülüp kaybolurdu.
- **R5/3.** (Plan onayı P4) Seçiciye yalnız canlı ve set olmayan parçaların işlem kalemlerindeki
  tedarikçiler girer: motorun işlem satırı ürettiği küme. Set ya da çöpteki parçanın tedarikçisi
  seçilirse "satırı yok" ibaresine düşerdi.
- **R6.** Tedarikçisi girilmemiş işlem kalemi belgede basılmaz; ekranda "Tedarikçisi belirtilmemiş"
  kutusunda görünür ki eksik olduğu fark edilsin.
- **R6/2.** Kutunun başlığındaki sayı **parça** sayısı olarak kalır; tedarikçisiz işlemler kutunun
  içinde kendi küçük tablosu ve kendi ibaresiyle görünür (ör. "n işlem kaleminin tedarikçisi
  girilmemiş"). Kutu bugünkü gibi yalnız seçim yokken çizilir, yani seçim varken tedarikçisiz işlem
  de görünmez (bugünkü parça davranışı; bilinen sınır).
- **R7.** Bir parçanın birden çok işlem kalemi varsa her biri kendi satırıdır; aynı işlem iki ayrı
  parçaya uygulanıyorsa iki satır olur, birleştirilmez.
- **R7/2.** Sıra: işlem adı, sonra parça adı (Türkçe alfabe, eşitlikte kalemin sırası). Fason firma
  kâğıdı kendi iş kalemine göre okur; parça adına göre sıralamak aynı işi listeye dağıtır.
- **R8.** Yalnız işlem satırı olan (hiç parça satırı olmayan) tedarikçi de ekranda kendi kartıyla,
  belgede kendi bölümüyle görünür.
- **R8/2.** Bunun için motor **iki** yapıya da yazar (`tedarikciBolumleri.bolumler[].islemler` ve
  `...belge[].islemler`; tek hesap, iki okuyucu) ve "yalnız işlem" dalı **üç** kapıda açılır:
  pencerenin bölüm süzgeci (`SiparisPenceresi.jsx:177`, bugün `hazirParcalar.length > 0`),
  `siparisRaporu.basilacakBolumler` (bugün `b.satirlar.length`) ve belge bölümünün kendisi. Pencere
  ile belgenin bölümlemesi bilerek farklıdır (Ana tedarikçi ile malzemenin firması), bu yüzden tek
  yapıya yazmak R1'in "hem ekranda hem belgede" şartını yarısında bırakır.
- **R9.** Fiyatlı nüshada işlemler tablosunun altında o tablonun kendi toplamı yazar; bölümün
  "Alınacak malzeme toplamı" rakamı ve kapsam cümlesi değişmez.
- **R9/2.** Tutarı çözülemeyen işlem satırı bölümün `tutarsizSayi` sayacına **girmez**; işlemler
  tablosunun kendi toplam satırında kendi sayacı yazar. O sayaç bölüm toplamı satırının içinde
  basıldığı için, işlem satırlarının onu artırması X3'ün korumak istediği satırı değiştirirdi.
- **R9/3.** Malzeme ve hazır parça satırı olmayan (yalnız işlemi olan) bölümde fiyatlı nüshanın
  "Bölüm toplamı" satırı ve kapsam cümlesi hiç yazılmaz, yalnız işlemler toplamı yazar. O bölümde
  alınacak malzeme yoktur; `—` ve malzemeyi anlatan cümle kâğıtta açıklaması olmayan bir boşluk
  bırakırdı.
- **R9/4.** (Plan onayı P6) Ölçüt bölümün **parça satırıdır**: parça satırı olmayan bölümde, toplam
  tablosu satırı olsa da (parçaları kapatılmış, kesidi elle girilmiş) bölüm toplamı ve kapsam cümlesi
  yazılmaz. İşlemler toplamının tutarsız sayacı var olan `tutarsizMetni` ile yazılır (P5).
- **R10.** İşlem satırları salt okunurdur: ekrandan adedi değiştirilemez, kapatılamaz.
- **R10/2.** (Plan onayı P2, P3) Pencerede hatalı adetli parçanın işlemi çizilmez (hata parçanın kendi
  satırında yazılı; belge sayacı R3/3 ile artar). Düzenlenmiş parçanın işlem satırı parça satırının
  "DÜZENLENDİ" rozetini taşır.
- **R10/3.** (Triyaj bulgu 1, Takım Yöneticisi kararı 2026-11-20) Seçim yüzünden satırı pencerede
  görünmeyen ama basılacak bir belge bölümünü kilitleyen hatalı adetli parça, pencerenin üstünde
  adıyla ve satırının durduğu kartla bir hata şeridinde söylenir ("Belge basılamaz: … satırının
  sipariş adedi geçersiz. Satır … kartında; …"). Hesap motorda (`gizliHatalar`). Aynı ibare 0142'nin
  malzeme firması tarafındaki sınıfı da kapatır. R10/2 aynen kalır.

### B. Toplu fiyat kipi düğmeleri

- **R11.** Parça/Yedek Parça listesinin başlığındaki iki toplu kip düğmesi, onay penceresi ve
  altındaki "varsayılan kâr katı girilmeden toplu bağlama yapılamaz" açıklaması ekranda yoktur.
- **R11/2.** Spec 0149'un R10, C5/2 ve AC-33'ü bu işle ters çevrilir: süzülmüş listenin beslediği
  yazma kalkar, yalnız Fiyat Listesi çıktısı kalır. 0149'un iki maddesi buna göre güncellenir ve
  AC-33'ün toplu kip yarısı "spec 0150 ile" notuyla düşer, Fiyat Listesi yarısı yeşil kalır.
- **R11/3.** Bileşende ölü kod bırakılmaz: `topluKip` durumu, `topluOzet`, `topluUygula`, `katYok`
  ve artık kullanılmayan altı içe alma (`topluKipOzeti`, `topluKipMetni`, `maliyetsizUyariMetni`,
  `katsizUyariMetni`, `TOPLU_KAT_YOK_NEDENI`, `kipYaz`) silinir. `no-unused-vars` bu projede
  **uyarıdır** (`eslint.config.mjs:29`), yani "lint hata sayısı sıfır" ölçütü bunu yakalamaz.
- **R11/4.** `fiyat_kipi_degisti` / `parca_tanimi` iz kaydı artık yazılmaz ama
  `SettingsAuditLog`'un etiket haritasından **silinmez** (eski kayıtlar on iki ay görünür); etiket
  taraması tek yönlü olduğu için bu kırılma üretmez (spec 0082'nin dersi).
- **R12.** Parça kartındaki fiyat kipi seçicisi ve listedeki fiyat kipi süzgeci aynen kalır: kipi
  değiştirmenin yolu kapanmaz.

---

## Constraints

### Uyulması zorunlu

- **C1.** Hesap motorda, ekran ve belge yalnız gösterir (0144 C1 aynen): işlem satırlarının
  seçilmesi, tedarikçiye yerleşmesi, adedi ve tutarı sipariş motorunda hazırlanır; yazdırma
  kurucusu aritmetik, eşleştirme ve para biçimi yazmaz.
- **C1/2.** İşlem adı kullanıcı metnidir ve belgede `esc` ile kaçışlanır (parça tablosunun bugünkü
  kuralı; ortak sunum modülü kaçışlamaz).
- **C2.** Parça ve malzeme rakamları değişmez: ihtiyaç, stok, sipariş adedi, kesit satırları, boy
  adetleri, bölüm toplamı ve sipariş farkı satırları bu işte aynı kalır.
- **C3.** İşlem kaleminin kendisi değişmez: yeni alan açılmaz, adet alanı eklenmez. Adet parçanın
  sipariş adedinden okunur.
- **C4.** Yeni kalıcı alan, veri bölümü, eylem izni ve sunucu kuralı yoktur; sipariş listesi salt
  okunurdur ve B parçası yalnız çizimdir.
- **C5.** Belgenin grup tabloları 0147'den beri ortak sütun genişliği kullanır; işlemler tablosu bu
  düzeni bozmaz (aynı sütun sayısıyla hizalanır).
- **C5/2.** `GRUP_TABLO_STILI` `.siparis-bolum table` seçicisiyle bölümün **bütün** tablolarına
  uygulanır, yani işlemler tablosu sabit genişlikleri kendiliğinden alır ve ek stil gerekmez. Bu
  tabloya ileride sütun eklenirse stilin ortak olduğu hatırlanmalıdır.
- **C6.** B parçasında parçaların kayıtlı fiyat kipi ve katı değiştirilmez; hiçbir kayda
  dokunulmaz.
- **C7.** Kanıt zinciri B parçasında elle kurulur: toplu kip bloğu listenin **üstünde** olduğu için
  listesi dolu her `katalog-parca*` ve `ayarlar-yedekparca*` ekranı kayar. `PartManager.jsx`'in
  `docs/evidence/kanit-eslemesi.json`'daki 52 ekranı ve 280 kaydının 268'i bugün `beklenen: "ayni"`;
  etkilenen kayıtlar `beklenen: "degisti"` + `onay` satırı alır
  (`Takım Yöneticisi · <tarih> · spec 0150 R11`) ve spec `done`'a taşınırken `ayni`ye çevrilir.
  Ayrıca `katalog-parca-0133-toplu` ekranı kanıt aracından ve eşleme dosyasından silinir: varlık
  nedeni bu bloktur ve adımı (`dugme:Listedeki 4 parçayı maliyete bağla`) hedefini bulamayacağı için
  araç onu yalnız uyarıyla geçip sessizce başka bir hâli çekerdi (spec 0117 Karar 51'in dersi).
- **C8.** Kaynak taraması toplu kip bloğunun geri sızmasını yasaklar: `topluKipMetni`,
  `TOPLU_KAT_YOK_NEDENI`, `topluKipOzeti` adları ve `toplu-kip`, `toplu-kat-yok`, `toplu-kip-onay`
  testid'leri `src/components` altında geçmez (spec 0116 emsali).

### KAPSAM DIŞI

- **X1.** İşlem kalemine kendi adet alanı — *neden:* adet parçanın sipariş adedinden türüyor;
  ikinci bir adet iki kaynak demek olur.
- **X2.** İşlem satırının ekrandan düzenlenmesi (adet, "sipariş etme") — *neden:* parçayı kapatmak
  işlemi de düşürüyor, ikinci bir kapı gereksiz.
- **X3.** İşlem tutarlarının bölümün "Alınacak malzeme toplamı" rakamına katılması — *neden:* o
  toplam alınacak malzemenin tutarıdır ve kapsam cümlesi bunu söylüyor; fason bedeli ayrı ödemedir,
  kendi toplamıyla yazılır.
- **X4.** Fason işlerin kendi iş emri ya da sevk belgesi — *neden:* ayrı bir belge türü, ayrı iş.
- **X5.** `lib/parcaFiyati.js`'teki toplu kip fonksiyonlarının (`topluKipOzeti`, `topluKipMetni`,
  `kipYaz` ve toplu uyarı metinleri) silinmesi — *neden:* ekran kapısı kalkıyor, kitaplıktaki ölü
  kodun temizliği ayrı bir iştir. (QA turu düzeltmesi: ilk yazımdaki "kipi yazan tek yol" gerekçesi
  yanlıştı; `kipYaz`'ın tek çağıranı toplu uygulamadır, parça kartı kipi kendi kayıt fonksiyonunda
  yazıyor. Bileşendeki ölü kod R11/3 ile silinir.)
- **X6.** İşlem kalemlerinin kataloğa (yeniden) taşınması — *neden:* spec 0138 ile bilerek
  kaldırıldı, geri açılmıyor.
- **X7.** `eskiKatalogKalemi` olan işlem kaleminin satır üretmesi — *neden:* adı ve tutarı yok (üç
  hücrenin ikisi boş basılırdı) ve maliyette de çözülemeyen sayılıyor; 0138'in göçü onu zaten
  serbest kaleme çeviriyor.
- **X8.** İşlem satırı için "belgede başka bölümde basılır" ibaresinin ikizi — *neden:* işlem satırı
  kendi kartında görünüyor ve yerini söylüyor; ibare malzemenin iki firmaya bölünmesi için yazılmıştı.
- **X9.** Aynı adlı iki işlem kalemine uyarı ya da birleştirme — *neden:* parça kartı aynı adlı iki
  kalemi bilerek serbest bırakıyor (0135); sipariş listesinin bunu düzeltmesi veriyi yorumlamak olur.

---

## Context

**Motor işlem kalemini hiç görmüyor.** `src/lib/siparisIhtiyaci.js` içinde "islem" sözcüğü hiç
geçmez: sipariş motoru yalnız malzeme kalemlerinden kesit satırı, malzemesiz parçalardan hazır
parça satırı üretir (spec 0135'te "işlem kalemi satır üretmez" diye yazılıdır). Veri hazırdır:
`src/lib/maliyetKalemleri.js:51` `islemKalemleri(p)` parçanın işlem kalemlerini verir; her kalem
`ad`, isteğe bağlı `tedarikciId` ve TL `tutar` taşır (`:59` `kalemTedarikciIdleri` yalnız bu
kalemleri okur).

**Belgenin bugünkü yapısı.** Tedarikçi bölümünün içinde hammaddeye göre gruplanmış parça tabloları
var (spec 0147): motor `b.gruplar` listesini kurar (`siparisIhtiyaci.js:556-566`, `GRUP_TURU`
hammadde / cozulemeyen / hazir), belge grup başına bir tablo basar
(`siparisRaporu.js:96` `grupTablolari`). Sütunlar `BELGE_SUTUNLARI` (`:38`) ve fiyatlı nüshada
`Tutar` eklenir (`:44` `belgeSutunlari`); grup tabloları alt alta hizalansın diye sütun genişlikleri
sabittir (`:93` `GRUP_TABLO_STILI`, fiyatsızda üç sütun 34/38/28, fiyatlıda dört sütun
26/28/22/24). İşlemler tablosu fiyatsızda üç, fiyatlıda dört sütun olacağı için bu hizaya oturur.

**Pencerenin bugünkü yapısı.** `src/components/stock/SiparisPenceresi.jsx:177` tedarikçi kartlarını
`tb.bolumler.filter(b => b.hazirParcalar.length > 0)` ile çiziyor, yani **yalnız parça satırı olan**
tedarikçinin kartı görünüyor; yalnız işlem satırı olan firma bu süzgeçten geçemez (R8 bu yüzden
yazıldı). "Tedarikçisi belirtilmemiş" kutusu `:185-190`'da, bugün Ana tedarikçisi olmayan parçaları
ve sayaçları gösteriyor; tedarikçisiz işlem kalemi oraya eklenecek.

**Toplu kip bloğu.** `src/components/PartManager.jsx:589-600`: `filtered.length > 0` iken iki `Btn`
(`topluKipMetni`), `katYok` iken `TOPLU_KAT_YOK_NEDENI` ibaresi ve seçimden sonra açılan
`ConfirmDialog`. Spec 0133 ile gelmişti; kaldırmak saf çizim, kayıtlara dokunmaz. Kipi değiştirmenin
öteki iki yolu aynı ekranda duruyor: kart içindeki kip seçicisi ve listedeki kip süzgeci.

**Veri, izin ve sunucu.** Bu iş hiçbir kaydı değiştirmez; dört nokta DB kuralı, `MERGE_KEYS`,
`serverAuth` bölüm eşlemesi ve çöp kutusu gündeme gelmez. Sipariş penceresinin kapısı bugünkü gibi
`stock_siparis_listesi`'dir.

### QA turunda ölçülenler (2026-11-20)

Hepsi HEAD (`e9dfbb4a`) üzerinde ölçüldü.

- **Ölçüm A.** `tedarikciSecenekleri` (`siparisIhtiyaci.js:125-130`) yalnız hammadde işaretini ve
  parçanın ya da malzemenin `tedarikciId` alanını okuyor; işlem kaleminin tedarikçisi seçicinin
  listesine hiç girmiyor.
- **Ölçüm B.** İşlem kaleminin `tutar` alanı **parça başınadır**: `urunAgaci.js:57-58` onu kuruşa
  çevirip parçanın maliyetine doğrudan ekliyor (adetle çarpmıyor). Kalemde para birimi alanı yok,
  yani tutar her zaman TL.
- **Ölçüm C.** Eski `hammaddeler` kırılımından türeyen işlem kalemi (`maliyetKalemleri.js:45-47`)
  `TURETILEN_KALEM_ADI` adını ve kırılım satırının `tedarikciId`'sini taşıyor, yani R5'e göre o
  firmanın bölümüne düşer.
- **Ölçüm D.** İki bölümleme ayrı: pencere `tedarikciBolumleriKur` ile Ana tedarikçi temelli,
  belge `belgeBolumleriKur` ile malzemenin firması temelli. "Yalnız işlem" dalının açılması gereken
  üç kapı: `SiparisPenceresi.jsx:177` (`hazirParcalar.length > 0`), `siparisRaporu.js:55`
  (`b.satirlar.length`) ve belge bölümünün kendisi.
- **Ölçüm E.** Hata zinciri: hatalı adetli parça basılmıyor ama düştüğü bölümün `hataSayisi`'nı
  artırıyor; `belgeDurumu` (`siparisRaporu.js:58-66`) hem pencerede görünen hatayı hem basılacak
  bölümün `hataSayisi`'nı okuyor.
- **Ölçüm F.** `tutarsizSayi` bölüm toplamı satırının İÇİNDE basılıyor
  (`siparisRaporu.js:101-102`), yani onu artırmak X3'ün korumak istediği satırı değiştirir.
- **Ölçüm G.** `GRUP_TABLO_STILI` (`siparisRaporu.js:93-94`) `.siparis-bolum table` seçicisiyle
  bölümün bütün tablolarını kapsıyor; genişlikler fiyatsızda 34/38/28, fiyatlıda 26/28/22/24.
- **Ölçüm H.** `docs/evidence/kanit-eslemesi.json`: `PartManager.jsx` için 52 ekran ve 280 kayıt
  (268'i `beklenen: "ayni"`, 12'si beklenensiz), `stock/SiparisPenceresi.jsx` için 10 ekran ve 10
  kayıt (hepsi `ayni`).
- **Ölçüm I.** `katalog-parca-0133-toplu` ekranının adımı `dugme:Listedeki 4 parçayı maliyete bağla`
  (`scripts/evidence/0009-sayfa.jsx:1121`), yani ekranın varlık nedeni kalkan bloktur.
- **Ölçüm J.** `kipYaz`'ın `src` altındaki tek çağıranı toplu uygulamadır
  (`PartManager.jsx:415`); parça kartı kipi kendi kayıt fonksiyonunda yazıyor (`:352`).
- **Ölçüm K.** `no-unused-vars` bu projede uyarı seviyesinde (`eslint.config.mjs:29` ve `:44`), yani
  kullanılmayan içe alma lint hata sayısını artırmaz.
- **Ölçüm L.** `tests/fixtures/0143-veri.js:19`'daki "Karma" parçasında tedarikçisiz bir işlem
  kalemi var ("Torna", tutar 40) ve 0143'ün kıyas altını bu veriyle üretilmiş; yani "işlem kalemi
  olmayan veri" varsayımı var olan fikstürler için doğru değil.
- **Ölçüm M.** `siparis-0143-pencere` ekranının adımı `kaydirgenis:Malzeme · kesit`
  (`0009-sayfa.jsx:1263`) 2026-11-15'te o tablo ekrandan kalktığı için hedefini bulamıyor; spec
  0147'de sipariş penceresi ekranlarının çalıştırmadan çalıştırmaya 0 ile 192 piksel oynadığı ve
  rapora alınmadığı yazılı.
- **Ölçüm N.** `siparisIhtiyaci.js` ve `siparisRaporu.js`'te "islem" dizisi sıfır kez geçiyor
  (Context'in iddiası doğrulandı); `maliyetKalemleri.js:51` ve `:59` atıfları da yerinde.
- **Ölçüm O.** Spec 0149'un R10 (`:120`), C5/2 (`:148`) ve AC-33 (`:475`) maddeleri toplu fiyat
  kipini "aramanın beslediği yazma" olarak anlatıyor, yani B parçası onları ters çevirir.

### QA turunda verilen kararlar (2026-11-20)

Takım Yöneticisi 26 bulgunun hepsini onayladı. Metinde "QA kararı n" bu listeye atıf yapar.

**Bloklayıcı**

- **1. Tedarikçi seçicisi fason firmayı listeler (R5/2).** `tedarikciSecenekleri` işlem kalemlerinin
  tedarikçilerini de verir, ibare güncellenir — *neden:* seçiciye girmeyen firma seçilemediği için
  R8'in kartı ve belge bölümü ilk seçimde kaybolurdu, yani işin asıl kullanımı karşılanmazdı.
- **2. Türetilen "Hammadde alımı" kalemi de basılır (R1/2).** Tek türetme yolu ayrım yapmaz
  — *neden:* ayırmak türetmenin içine ikinci bir kural koymak (0135 C1/2) ve eski veride gerçek bir
  siparişi kâğıttan düşürmek olurdu.
- **3. Kanıt zinciri ve tarama yazılı (C7, C8).** Etkilenen kayıtlar `degisti` + onay satırı alır,
  `katalog-parca-0133-toplu` silinir, toplu kip metinleri kaynakta yasaklanır — *neden:* 280 kaydın
  çoğu kayacağı için onay satırı olmadan kanıt turu sahte farkla dolar; adımı bulunamayan ekran
  yanlış kanıt üretir; 0116 emsali geri sızmayı yalnız tarama durdurur.

**Önemli**

- **4. İşlem satırı iki yapıya, üç kapı açılır (R8/2).** Motor hem pencerenin hem belgenin bölümüne
  yazar — *neden:* iki bölümleme bilerek farklı; tek yapıya yazmak R1'in "hem ekranda hem belgede"
  şartını yarıda bırakır.
- **5. Adet düzenlenen değerden, `(elle)` ve not (R3/2).** İşlem satırı işareti taşır ve bölümün
  `ELLE_NOTU` koşuluna girer — *neden:* adet neyin sipariş edileceğidir; işaretin notu başka bölümde
  kaldığında fason firmaya açıklaması olmayan bir damga gider.
- **6. Hatalı parçanın işlemi bölümün hata sayacına girer (R3/3).** — *neden:* AC-11'in "bugünkü
  gibi" dediği kural tam olarak bu sayaçtır; yoksa hatası görünmeyen parçanın işlemi sessizce düşer.
- **7. Tutarsız işlem satırı `tutarsizSayi`'ya girmez (R9/2).** Kendi sayacı yazar — *neden:* o sayaç
  bölüm toplamı satırının içinde basılıyor, artırmak X3'ün korumak istediği satırı değiştirirdi.
- **8. Tutar nedeni tek sabitte, eski katalog kalemi satır üretmez (R4/2, X7).** — *neden:* sabit
  olmadan ekran ve belge kendi metnini yazar (C1); eski kalemin adı ve tutarı yok, maliyette de
  çözülemeyen sayılıyor.
- **9. Başlıklar ve sütunların yeri (R2/2).** "İşlemler", `["Parça", "İşlem", "Sipariş adedi"]`,
  `BELGE_SUTUNLARI.islem` — *neden:* aynı rakamın komşu tabloda başka adla görünmesi iki şey
  sanılmasına yol açar; sütunların tek yerde durması 0142'den beri kuralın kendisi.
- **10. Tablonun yeri ve sıralama (R1/3, R7/2).** Grup tablolarından sonra, fark notundan önce; işlem
  adı sonra parça adı — *neden:* fason firma kâğıdı iş kalemine göre okur; yer yazılmazsa pencere ile
  belge farklı sıraya düşer.
- **11. İşlem adedi her zaman parça adedi (R2/3).** — *neden:* fason iş parçaya uygulanır, çubuğa
  değil; aynı sütunda iki birim görünmesi yanlış sipariş doğurur.
- **12. Yalnız işlemi olan bölümde bölüm toplamı yazılmaz (R9/3).** — *neden:* o bölümde alınacak
  malzeme yok; `—` ve malzemeyi anlatan kapsam cümlesi kâğıtta açıklaması olmayan bir boşluk bırakır.
- **13. Üç sınır durumu yazılı (R3/4).** Çöpteki parça ve patlatılan set satır üretmez; Ana
  tedarikçisiz malzemeli parçanın işlemi görünür — *neden:* ilk ikisi bugünkü parça kurallarının
  ikizi, üçüncüsü şaşırtıcı olduğu için yazılı olmalı.
- **14. Kıyas iki ayaklı (AC-19).** İşlem kalemsiz veride birebir aynı; tedarikçisiz işlem kalemi
  taşıyan var olan fikstürlerde belge çıktısı değişmez ve motor alanları ayıklanır — *neden:* 0143'ün
  altını "Torna" kalemiyle üretildi, yazılmazsa açıklanamayan fark diye altın yenilenir ve gerçek
  regresyon güvencesi kaybolur.
- **15. Spec 0149'un üç maddesi ters çevrilir (R11/2).** — *neden:* 0149 AC-33'ün testi B parçasından
  sonra kırmızı yanar; gerekçe yazılmazsa hangisinin yanlış olduğu belirsiz kalır.

**Küçük**

- **16. Belirtilmemiş kutusunun sayısı ve seçim hâli (R6/2).** Başlık sayısı parça sayısı kalır,
  işlemler kendi tablosu ve ibaresiyle — *neden:* tek sayıda iki şeyi toplamak "n parça" ibaresini
  yanlış yapar; seçim hâli yazılmazsa eksik veri gizli kalır.
- **17. Fason bedeli yalnız fiyatlı nüshada (R2/4).** — *neden:* "neden ekranda tutar yok" sorusu
  kaçınılmaz; gerekçenin yazılı olması sonraki turda bulgu olarak dönmesini önler.
- **18. "Belgede başka bölümde" ibaresinin ikizi yazılmaz (X8).** — *neden:* işlem satırı kendi
  kartında görünüyor, yerini zaten söylüyor.
- **19. Stilin kapsamı yazılı (C5/2).** — *neden:* ileride bu tabloya sütun eklemek isteyen biri
  genişliklerin ortak olduğunu bilmeli.
- **20. Bileşendeki ölü kod silinir (R11/3).** — *neden:* `no-unused-vars` uyarı olduğu için lint
  yakalamaz; kalan kod sonraki okuyucuya düğmenin hâlâ çizildiğini düşündürür.
- **21. `fiyat_kipi_degisti` etiketi silinmez (R11/4).** — *neden:* eski kayıtlar on iki ay görünür,
  etiketi silmek geçmişi ham anahtarla gösterir (0082'nin dersi).
- **22. 0133'ün kanıt kaydı güncellenir (C7).** — *neden:* eşleme dosyasında var olmayan ekran
  kalırsa `kanit-eslemesi.test.js` zinciri bozulur.
- **23. Pencere kanıtının kararsızlığı yazılı (DoD).** — *neden:* 0140 ekranları 0 ile 192 piksel
  oynuyor ve 0147'de rapora alınmadı; yazılmazsa kanıt turunda sahte farkla saatler harcanır.
- **24. `siparis-0143-pencere` adımı bilinen borç (DoD).** — *neden:* araç bulunamayan adımı yalnız
  uyarıyla geçiyor; yeni ekran eklenirken aynı tuzağa iki kez düşülmesin.
- **25. İşlem adı kaçışlanır (C1/2).** — *neden:* ad serbest girişten geliyor ve kaçışlamayı
  `siparisRaporu.js` kendi yapıyor, ortak sunum modülü yapmıyor.
- **26. Yinelenen kaleme uyarı yok (X9).** — *neden:* parça kartı aynı adlı iki kalemi bilerek
  serbest bırakıyor; sipariş listesinin bunu düzeltmesi veriyi yorumlamak olur.

### Plan turunda verilen kararlar (2026-11-20)

Takım Yöneticisi planın on önerisini onayladı (plan `specs/done/0150-uygulama-plani.md` §3): P1 hiçbir set
işlem satırı üretmez (R3/5), P2 hatalı parçanın işlemi pencerede çizilmez, P3 düzenlenmiş parçanın işlem
satırı rozet taşır (R10/2), P4 seçici kümesi (R5/3), P5 tutarsız sayacının metni ve P6 bölüm toplamının
ölçütü (R9/4), P7 "Karma" fikstürü (AC-19 b; `siparis-0143-pencere` bilinçli değişir), P8 kanıtta yalnız
gerçekten değişen kayıtlar "değişti" olur, P9 onay satırının biçimi (C7), P10 tutar kuralı (R4).

### QA turu karar kaydı (2026-11-20)

| # | Karar | Derece | İşlendiği yer |
|---|---|---|---|
| 1 | Tedarikçi seçicisi | Bloklayıcı | R5/2, AC-25, AC-26 |
| 2 | Türetilen kalem basılır | Bloklayıcı | R1/2, AC-27 |
| 3 | Kanıt zinciri ve tarama | Bloklayıcı | C7, C8, AC-41, AC-42 |
| 4 | İki yapı, üç kapı | Önemli | R8/2, AC-28 |
| 5 | Adet, elle işareti ve not | Önemli | R3/2, AC-29 |
| 6 | Hata sayacı | Önemli | R3/3, AC-30 |
| 7 | Tutarsız satırın sayacı | Önemli | R9/2, AC-34 |
| 8 | Tutar nedeni ve eski kalem | Önemli | R4/2, X7, AC-33, AC-35 |
| 9 | Başlıklar ve sütunlar | Önemli | R2/2, AC-36 |
| 10 | Tablonun yeri ve sırası | Önemli | R1/3, R7/2, AC-37 |
| 11 | Adet biçimi | Önemli | R2/3, AC-31 |
| 12 | Yalnız işlemi olan bölüm | Önemli | R9/3, AC-38 |
| 13 | Üç sınır durumu | Önemli | R3/4, AC-32 |
| 14 | Kıyas iki ayaklı | Önemli | AC-19 |
| 15 | 0149'un üç maddesi | Önemli | R11/2, AC-44 |
| 16 | Belirtilmemiş kutusu | Küçük | R6/2, AC-39 |
| 17 | Para yalnız fiyatlı nüshada | Küçük | R2/4, AC-3 |
| 18 | Belge yeri ibaresi | Küçük | X8 |
| 19 | Stilin kapsamı | Küçük | C5/2 |
| 20 | Ölü kod | Küçük | R11/3, AC-43 |
| 21 | İz etiketi | Küçük | R11/4 |
| 22 | 0133'ün kanıt kaydı | Küçük | C7, AC-42 |
| 23 | Pencere kanıtı kararsız | Küçük | DoD, ölçüm M |
| 24 | 0143 ekran adımı | Küçük | DoD, ölçüm M |
| 25 | Kaçışlama | Küçük | C1/2, AC-40 |
| 26 | Yinelenen kalem | Küçük | X9 |

---

## Acceptance Criteria

> QA turunun 26 kararı Context'teki "QA turunda verilen kararlar (2026-11-20)" bölümünde duruyor ve
> metinde "QA kararı n" olarak anılıyor; karar kaydı tablosu her kararın işlendiği yeri gösteriyor.

- **AC-1.** Bir parçanın tedarikçisi girilmiş işlem kalemi varsa ve o parça sipariş ediliyorsa,
  sipariş penceresinde o tedarikçinin kartında "İşlemler" tablosunda bir satır görünür.
- **AC-2.** Satır uygulanan parçanın adını, işlemin adını ve parçanın sipariş adedini yazar.
- **AC-3.** Ekrandaki işlemler tablosunda para gösterilmez.
- **AC-4.** Fiyatsız belgede işlemler tablosu üç sütunla basılır: uygulanan parça, işlem, adet.
- **AC-5.** Fiyatlı belgede dördüncü sütun tutardır ve tutar birim tutar ile adedin çarpımıdır.
- **AC-6.** Tutarı girilmemiş işlem kaleminin satırı basılır; tutar hücresinde nedeni yazar ve
  tablonun toplamına girmez.
- **AC-7.** Fiyatlı belgede işlemler tablosunun altında o tablonun toplamı yazar.
- **AC-8.** Bölümün "Alınacak malzeme toplamı" rakamı ve kapsam cümlesi, işlem satırları eklendikten
  sonra da spec öncesiyle aynıdır.
- **AC-9.** Sipariş adedi sıfır olan (stoktan karşılanan) parçanın işlemi hiçbir yerde görünmez.
- **AC-10.** Pencerede "sipariş etme" diye kapatılan parçanın işlem satırı da düşer.
- **AC-11.** Hatalı adet girilmiş parçanın işlemi basılmaz; belgenin basılabilirlik kuralı bugünkü
  gibi çalışır.
- **AC-12.** Bir parçanın iki işlem kalemi varsa iki satır basılır.
- **AC-13.** Aynı işlem iki ayrı parçaya uygulanıyorsa iki satır basılır, adetleri toplanmaz.
- **AC-14.** İşlem kalemi, parçanın Ana tedarikçisinden farklı bir tedarikçi taşıyorsa satır işlem
  kaleminin tedarikçisinin bölümünde basılır.
- **AC-15.** Tedarikçisi girilmemiş işlem kalemi belgede basılmaz.
- **AC-16.** Aynı kalem ekranda "Tedarikçisi belirtilmemiş" kutusunda görünür.
- **AC-17.** Yalnız işlem satırı olan tedarikçi ekranda kendi kartıyla görünür.
- **AC-18.** Aynı tedarikçi belgede kendi bölümüyle basılır.
- **AC-19.** Kıyas iki ayaklıdır: (a) işlem kalemi olmayan veride pencere ve belge spec öncesiyle
  birebir aynıdır; (b) tedarikçisiz işlem kalemi taşıyan var olan fikstürlerde (ör.
  `tests/fixtures/0143-veri.js`'in "Karma" parçası) **belge çıktısı** değişmez, çünkü tedarikçisiz
  işlem basılmaz (R6); motorun yeni alanları kıyas ayıklamasıyla düşürülür (0144 ve 0147 emsali).
- **AC-20.** Parça/Yedek Parça listesinde toplu kip düğmeleri ve onay penceresi yoktur.
- **AC-21.** Aynı ekranda "varsayılan kâr katı girilmeden toplu bağlama yapılamaz" açıklaması
  yoktur.
- **AC-22.** Parça kartındaki fiyat kipi seçicisi çalışmaya devam eder: bir parça maliyete bağlanıp
  kaydedilebilir.
- **AC-23.** Listedeki fiyat kipi süzgeci çalışmaya devam eder.
- **AC-24.** Liste boşken ve doluyken ekranda toplu kip kalıntısı çizilmez (boş durum).

### QA turu kriterleri (2026-11-20)

**Tedarikçi seçicisi ve okunan küme**

- **AC-25.** Yalnız bir işlem kaleminde geçen (hammadde işaretsiz, kimsenin Ana tedarikçisi olmayan)
  canlı firma tedarikçi seçicisinde listelenir ve seçilince kendi kartı ile belge bölümü görünür.
- **AC-26.** Seçicinin altındaki ibare (`HAMMADDE_SUZGEC_NEDENI`) işlem kalemlerinin tedarikçilerini
  de saydığını yazar.
- **AC-27.** Eski `hammaddeler` kırılımından türeyen "Hammadde alımı" kalemi, tedarikçisinin
  bölümünde işlem satırı üretir.

**Yerleşim, kapılar ve sınırlar**

- **AC-28.** Yalnız işlem satırı olan bölüm üç kapıdan geçer: pencerede kart çizilir, belgede bölüm
  basılır, `basilacakBolumler` onu döndürür.
- **AC-29.** Parçanın sipariş adedi düzenlenince işlem satırının adedi de değişir, belgede `(elle)`
  işareti taşır ve işlem satırı başka bir bölümde basıldığında o bölümün elle notu da doğar.
- **AC-30.** Hatalı adet girilmiş parçanın işlemi basılmaz, düştüğü bölümün `hataSayisi` sayacını
  artırır ve o bölüm basılacaksa belge kilitlenir.
- **AC-31.** Boydan sipariş edilen parçanın işlem satırı adedi parça adediyle yazar; "n boy" biçimi
  kullanılmaz.
- **AC-32.** Çöpteki parça ve patlatılan set işlem satırı üretmez; Ana tedarikçisi olmayan malzemeli
  parçanın işlemi, parçanın kendi satırı görünmese de kendi firmasının bölümünde görünür.
- **AC-33.** `islemId` taşıyan eski katalog kalemi (spec 0138) hiçbir yerde satır üretmez.

**Tutar, toplam ve başlıklar**

- **AC-34.** Tutarı çözülemeyen işlem satırı bölümün tutarsız sayacına girmez; işlemler tablosunun
  kendi toplam satırı kendi sayacını yazar.
- **AC-35.** Tutarı girilmemiş işlemin nedeni tek metin sabitinden gelir; ekran ve belge kendi
  metnini yazmaz (kaynak taraması).
- **AC-36.** Belgenin işlem sütunları `BELGE_SUTUNLARI.islem`'den gelir; başlıklar "Parça",
  "İşlem", "Sipariş adedi" ve fiyatlıda "Tutar".
- **AC-37.** İşlemler tablosu bölümde hammadde grup tablolarından sonra, sipariş farkı notundan önce
  basılır; satırlar işlem adına, sonra parça adına göre sıralıdır.
- **AC-38.** Malzeme ve hazır parça satırı olmayan bölümde "Bölüm toplamı" satırı ve kapsam cümlesi
  basılmaz, yalnız işlemler toplamı basılır.
- **AC-39.** "Tedarikçisi belirtilmemiş" kutusunun başlığındaki sayı parça sayısıdır; tedarikçisiz
  işlemler kutunun içinde kendi tablosu ve ibaresiyle görünür; tedarikçi seçimi varken kutu bugünkü
  gibi hiç çizilmez.
- **AC-40.** İşlem adındaki `<`, `&` gibi karakterler belgede kaçışlanır.

**B parçasının korumaları**

- **AC-41.** Kaynak taraması: `topluKipMetni`, `TOPLU_KAT_YOK_NEDENI`, `topluKipOzeti` adları ve
  `toplu-kip`, `toplu-kat-yok`, `toplu-kip-onay` testid'leri `src/components` altında geçmez.
- **AC-42.** `katalog-parca-0133-toplu` ekranı kanıt aracında ve `kanit-eslemesi.json`'da yoktur;
  eşleme dosyasının zinciri yeşildir.
- **AC-43.** `PartManager.jsx`'te toplu kipe ait ölü kod kalmaz: `topluKip` durumu, `topluOzet`,
  `topluUygula`, `katYok` ve altı içe alma yoktur.
- **AC-44.** Spec 0149 AC-33'ün Fiyat Listesi yarısı yeşil kalır; toplu kip yarısı "spec 0150 ile"
  notuyla düşer.
- **AC-45.** (R10/3) Tedarikçi seçimi yalnız fason firmadayken bir parçanın adedi geçersiz girilirse
  belge basılamaz ve pencere o parçayı adıyla ve satırının kartıyla söyler; satır görünürken ibare
  yoktur; hatalı parçanın belgesi seçim dışındaysa ne kilit ne ibare vardır.

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] İşlem satırlarının seçimi, yerleşimi, adedi ve tutarı React'sız saf motorda; belge ve pencere
      yalnız gösteriyor (kaynak taraması).
- [x] Ekran ile belge aynı motor sonucunu okuyor; iki ayrı işlem listesi türetilmiyor.
- [x] Tedarikçi seçicisi fason firmayı listeliyor ve ibaresi bunu söylüyor (R5/2).
- [x] "Yalnız işlem" dalı üç kapıda da açık: pencerenin bölüm süzgeci, `basilacakBolumler` ve belge
      bölümü (R8/2).
- [x] Yeni metin sabitleri (tablo başlığı, sütunlar, tutar nedeni, belirtilmemiş ibaresi) tek yerde;
      ekran ve belge metin yazmıyor.
- [x] Yeni kalıcı alan yok; dört nokta kuralı gündeme gelmedi (spec'te yazılı).
- [x] Yeni veri bölümü ve eylem izni yok; salt okunur olduğu açıkça yazıldı.
- [x] Kullanıcıya görünen metinler Türkçe; sipariş belgesi bilerek yalnız Türkçe.
- [x] Fiyatlı nüshanın para kuralı korundu; tutarı çözülemeyen satır tanımlı biçimde ele alınıyor.
- [x] Kıyas iki ayaklı yapıldı (AC-19): işlem kalemsiz veride birebir aynı, tedarikçisiz işlem
      kalemi taşıyan var olan fikstürlerde belge çıktısı değişmedi.
- [x] Görsel kanıt eklendi: işlemli tedarikçi kartı, yalnız işlemli kart, iki nüsha, toplu kipsiz
      parça listesi. Sipariş penceresi ekranlarının çalıştırmadan çalıştırmaya 0 ile 192 piksel
      oynadığı (spec 0147'de rapora alınmadığı) spec'te yazılı; yeni ekranların adımlarının hedefini
      bulduğu doğrulandı (araç bulunamayan adımı yalnız uyarıyla geçiyor, `siparis-0143-pencere`
      bugün bu durumda olan bilinen borçtur).
- [x] B parçasının kanıt kayıtları `beklenen: "degisti"` + TY onay satırıyla işaretlendi ve spec
      `done`'a taşınırken `ayni`ye çevrildi; `katalog-parca-0133-toplu` ekranı araçtan ve eşleme
      dosyasından silindi (C7).
- [x] Toplu kip metinlerinin ve testid'lerinin kaynakta geçmediği taramayla sabitlendi (C8); bileşende
      ölü kod kalmadı (R11/3).
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md`'nin sipariş listesi, 0133 ve 0149 bölümleri güncellendi; ters çevrilen 0133 ve
      0149 (R10, C5/2, AC-33) kriterleri "spec 0150 ile" notuyla işaretlendi.
- [x] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [x] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| | |
|---|---|
| **Uygulama** | Commit `e6df52f8` (dal `feat/0150-siparis-islemler`) |
| **Plan** | `specs/done/0150-uygulama-plani.md`; on plan kararı (P1–P10) ve dokuz uygulama kararı (P11–P19) |
| **Kanıt** | `docs/evidence/0150-piksel-raporu.json`: 136 görüntü bilinçli değişti (toplu kip bloğu kalktı, seçici ibaresi uzadı, yeni işlem ekranları); var olan sipariş belgesi ekranları 0 piksel; eski kodun iki çekimi 0 fark. Kapanış tabanı `0150-taban-piksel-raporu.json` 136/136 sıfır. Uzun çekimlerde Chromium açılır listenin (`select`) ok simgesini çekimden çekime farklı boyutta çiziyor (71–575 piksel, kodla ilgisiz); taban, sekiz çekim arasından her ekran için birebir aynı bir çiftle kuruldu |
| **Spec revizyon sayısı** | 4 (QA turu, plan onayı: R3/5, R5/3, R9/4, R10/2; triyaj: R10/3, AC-45) |
| **Düzeltme turu sayısı** | 1 (triyaj) |
| **Bulgu gerçek/gürültü oranı** | 3 / 0 (seçimde görünmeyen hata belgeyi kilitliyordu; kanıt ekranı seçim yapmıyordu; AC-42 ve AC-44 adlı test yoktu) |
| **Regresyon sayısı** | 0 (ters çevrilen beş test dosyası "spec 0150 ile" notlu) |
| **Kaçan hata** | 0 |
| **Notlar** | AC-8 ve AC-19 (b) ilk yazımda aynı veriyi işlemsiz hâliyle karşılaştırıyordu; işlem kalemi hazır parçanın maliyetini de değiştirdiği için yanlıştı, spec öncesi altınla ölçüldü. Eski `PartManager` geri konunca B testlerinin dördü, motorda set ve eski katalog süzgeci kaldırılınca A testlerinin sekizi kırıldı. Yedek Parça Satışı sekmesi `customers` verilmeden açılırsa aramada döngüye girer (0149'dan açık bulgu). `siparis-0140-tek-tedarikci` aynı `tikla:` adımını kullanıyor, seçim yapmıyor olabilir (açık bulgu) |

**Bu spec'ten çıkarılan ders:** pencere ile belgenin bölümlemesi farklıysa, belgeyi kilitleyen her sayaç pencerede görünür bir karşılık ister; yoksa seçim kilidin nedenini gizler. Kanıt aracında bir adımın uyarısız geçmesi doğru öğeye tıklandığını kanıtlamaz: denetimli girişler `aria-label` ile seçilir.
