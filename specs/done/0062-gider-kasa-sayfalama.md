# 0062 — Giderler ve Kasa Listelerinde Sayfalama

| | |
|---|---|
| **Durum** | Tamamlandı (commit `b7c1955`, dal `feat/0062-sayfalama`) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Giderler (kalem listesi, makina kârlılığı, makina ve model, tedarikçiler), Kasa (hesap hareketleri, hesabı belirtilmemiş kayıtlar, çek portföyü, ekstre), ödeme hatırlatma penceresi |
| **Bağımlı spec'ler** | 0003 (hatırlatma penceresinin iki bölümü) · 0014 (süzgeç çubuğu ve sayfa sıfırlama) · 0016 (liste birliği, boş durum) · 0022 (Tarih Aralığı kipi) · 0047 ve 0055 (rapor, kalem listesi her zaman tam) · 0051 (hesapsız iş listesi) · 0058 (kapsam dışı bırakma) · 0061 (açık kalemler listesi) |
| **Revizyon** | R1 (QA turu, 2026-10-02): geliştirici hazırlığı denetimi, 17 bulgu işlendi, 4'ü bloklayıcıydı. Sayfa boyutu iddiasının kodla uyuşmadığı ölçüldü (gerçek değerler 5, 10, 15; R12), **iki ayrı sayfalama kancası** olduğu ve davranışlarının farklı olduğu bulundu (R11, R13), "hesap ata" toplu düğmesinin **olmadığı** ve "Görünen" sözcüğünün sayfalamayla yanlış olacağı görüldü (R17), R20'nin iki isteğinin birlikte sağlanamadığı tespit edildi. R22–R25, C7–C8 ve AC-26…AC-38 eklendi.<br>**R2 (2026-10-02, plan onayı):** bütün öneriler kabul (Q1–Q10): Gider Kalemleri ve Tedarikçiler `usePagination` ile (R26, R11 istisnası), paylaşılan kancanın sıfırlama anahtarı ve kırpılmış `setPage`'i (R27), süzgeç sıfırlamanın genişlemesi (R28), kapsam dışı listesi de sayfalanır (R29), ekstrenin devir satırı yalnız 1. sayfada (R30), pencere içi 5 istisnasız (R31), personel satırları satır kümesinde (R32), çubuk etiketsiz (R33), Kasa'da aynı günlü sıra motorun tersi (R34). AC-39…AC-45. |

---

## Intent

Giderler ve Kasa, uygulamanın en yeni iki bölümü ve **hiçbir listesinde sayfalama yok**. Taramada
`src/components/gider/`, `src/components/kasa/` ve `src/components/cek/` altındaki hiçbir dosya
paylaşılan `Pagination` bileşenini ya da sayfalama kancalarını kullanmıyor; her liste tek seferde
bütün satırları çiziyor ve hiçbirinde dilimleme yok. Uygulamanın geri kalanı (Müşteriler, Bayiler,
Stok, Evrak, Finans, Notlar, Ayarlar) yıllardır sayfalıyor; iki yeni bölüm bu alışkanlığın dışında
kaldı.

Bu bugün hissedilmiyor, çünkü gider verisi yeni. Ama birkaç listesi **tanım gereği sonsuz büyüyor**:
bir hesabın hareketleri açılış gününden bugüne kadar birikir, çek portföyü hiç boşalmaz, makina
kârlılığı her satılan makinayla bir satır daha alır, hesabı belirtilmemiş kayıtlar zaten "geçmişten
gelen bir sürü kayıt" diye şikâyet konusu oldu. Bir de dönem seçicisinin "Tarih Aralığı" kipi var:
kullanıcı bir yıl seçtiğinde gider kalem listesi binlerce satıra çıkabilir ve bugün hepsi tek sayfada
çiziliyor.

Başarı şu demek: Giderler ve Kasa'nın büyüyen bütün listeleri uygulamanın geri kalanıyla aynı
sayfalama bileşenini kullanıyor, toplamlar ve toplu işlemler sayfadan etkilenmiyor ve yazdırma hâlâ
tam listeyi basıyor.

---

## Requirements

### A. Hangi listeler sayfalanır

- **R1.** **Kasa › hesap hareketleri** (seçili hesabın yürüyen bakiye listesi) sayfalanır. Bugün tek
  dilim hâlinde açılıştan bugüne her ödeme, tahsilat, virman, avans ve ödenen kendi çekimiz çiziliyor
  ve **tarih süzgeci bile yok**.
- **R2.** **Kasa › hesabı belirtilmemiş ödemeler** ve **hesabı belirtilmemiş tahsilatlar** listeleri
  sayfalanır.
- **R3.** **Kasa › Çek Portföyü**'nün alınan çekler ve verilen çekler listeleri sayfalanır. İki liste
  **iki ayrı sayfa durumu** tutar ve `Segment` ile sekme değişince sayfa 1'e döner (R13); tek durum
  tutulursa sekme değişince boş sayfa görünür.
- **R4.** **Giderler › Dönem Raporu › Gider Kalemleri** tablosu sayfalanır (Tarih Aralığı kipinde
  sınırsız büyüyebilen tek liste).
- **R5.** **Giderler › Makina Kârlılığı** makina listesi sayfalanır.
- **R6.** **Giderler › Makina ve Model** görünümünün makina listesi sayfalanır.
- **R7.** **Giderler › Tedarikçiler** listesi sayfalanır.
- **R8.** **Ekstre penceresi** (tedarikçi ve çalışan) sayfalanır. Son bakiye **ve devreden bakiye**
  (`devirK`) girdi dizisinin tamamından okunur, son sayfadan değil; sıralama eskiden yeniye kalır (R23,
  bugünkü `EkstrePenceresi.jsx:68`).
- **R9.** **Ödeme hatırlatma penceresi** sayfalanır (vadesi geçmişler ödenmedikçe birikir). Pencere 0003
  gereği **iki bölümlüdür** (vadesi geçmiş / yaklaşan) ve sayfalama **bölüm başına ayrıdır** (iki bağımsız
  kanca); tek listeye birleştirilirse vadesi geçmişler ikinci sayfaya kaçar ve pencerenin amacı bozulur.
- **R10.** **0061'in "Açık kalemler (tüm dönemler)" listesi** de sayfalanır; iki iş hangi sırada
  yapılırsa yapılsın bu liste sayfalamayla doğar (aşağıda Context).

### B. Nasıl sayfalanır

- **R11.** **Paylaşılan bileşen ve kanca kullanılır** (`Pagination` + mevcut kancalar); yeni bir sayfalama
  kodu yazılmaz, `Notes.jsx`'in elle yazılmış pager'ı emsal alınmaz. **İki kanca var ve davranışları
  farklı, hangisinin nerede kullanılacağı yazılıdır:**
  **(a) `usePagination(items, perPage)`** — motor çıktısı olan, arama kutusu olmayan listeler (Kasa hareket
  listesi, hesapsız listeler, çek portföyü, makina kârlılığı, makina ve model, ekstre, hatırlatma
  penceresi). `safePage = Math.min(page, totalPages)` ile **kendini düzeltir**, liste küçülünce boş sayfa
  olmaz. Emsal: Finance'ın dört kart listesi.
  **(b) `useFilteredList`** — arama ve süzgeç taşıyan listeler (Gider Kalemleri, Tedarikçiler). Sayfayı
  **yalnız arama değişince** sıfırlar (`useFilteredList.js:13`) ve kendini düzeltmez, bu yüzden süzgeç ve
  seçim değişiminde çağıran `setPage(1)` çağırmak zorundadır (R13).
- **R12.** **Sayfa boyutu kodun bugünkü kuralına uyar:** tam sayfa listelerde **10** (kancanın varsayılanı
  ve baskın değer: Müşteriler, Bayiler, Makina Stoğu hepsi 10), **pencere içi listelerde 5** (bugünkü
  emsal: bayi detay modalının üç listesi `SimpleDealers.jsx:631`, `:669`, `:704` ve `Notes.jsx:32`).
  **15 istisnadır** ve yalnız Evrak (`Documents.jsx:18`) ile Parça Stoğu (`PartStokTab.jsx:11`) kadar yoğun
  bir tabloda, gerekçesi yazılarak kullanılır. Gerekçe: Intent'in amacı "uygulamanın geri kalanıyla aynı"
  olmaktır; 15 seçmek Giderler'i Müşteriler'den farklı kılardı.
- **R13.** Arama, süzgeç ya da seçim değiştiğinde **sayfa 1'e döner** (0014'ün kuralı). Arama için kanca
  yeterlidir; **süzgeç ve seçim için çağıran sıfırlar** ve kapsam madde madde şudur: Kasa'da **hesap
  seçimi**, Giderler'de **dönem değişimi** (Ay ↔ Tarih Aralığı dahil), çek portföyünde **sekme değişimi**,
  Gider Kalemleri'nde tür / tedarikçi / ödeme / arama süzgeçleri, 0061'de **kova süzmesi**.
- **R14.** Liste boşsa sayfalama çizilmez ve **bugünkü boş durum metni korunur**. Gider Kalemleri'nin boş
  durumu bugün tablo içi bir metindir ("Filtreye uyan kalem yok.", `DonemRaporu.jsx:412`), `BosDurum`
  değil; onu dönüştürmek 0016'nın işidir ve bu spec'in kapsamı dışıdır (X7). `BosDurum` zorunluluğu yalnız
  bu işte eklenen **yeni** listeler için geçerlidir.
- **R15.** Tek sayfaya sığan listede sayfalama çubuğu çizilmez. **Bu bileşenin kendi davranışıdır**
  (`Pagination` `pages <= 1` iken `null` döner, `ui.jsx`); ayrı bir koşul yazılmaz.

### C. Sayfalamanın bozmaması gerekenler

- **R16.** **Toplamlar sayfadan bağımsızdır.** Gider Kalemleri tablosunun alt toplam satırı
  (`DonemRaporu.jsx:415`), kova ve kırılım kartları, hesap bakiyesi ve ekstrenin son bakiyesi **süzülmüş
  listenin tamamını** toplar, görünen sayfayı değil. **Mekanizma:** `useFilteredList` hem `filtered` hem
  `paged` döndürür, toplamlar `filtered`'dan ve satırlar `paged`'den okunur; `usePagination` yalnız `paged`
  döndürdüğü için toplam, kancaya verilen **girdi dizisinin** kendisinden okunur.
- **R17.** **Toplu işlem süzülmüş listenin tamamına uygulanır**, görünen sayfaya değil. **Tek toplu işlem
  0058'in "kapsam dışı bırak" düğmesidir** (`Kasa.jsx:369-372`); "hesap ata" **satır başınadır**
  (`:314`, `:496` satır içi `Select`) ve sayfalamadan hiç etkilenmez, R17 onu kapsamaz.
  **Metin düzeltilir:** düğme bugün "**Görünen** {n} kaydı kapsam dışı bırak" diyor ve 0058'in yorumu da
  "toplu işlem o anda görünen listeyi etkiler" (`Kasa.jsx:621`); sayfalama gelince "görünen" sayfa
  sanılır. Etiket ve onay metni **"Listedeki {n} kayıt"** olur ve o yorum güncellenir. Sayı süzülmüş
  kümenin sayısıdır, sayfanın değil.
- **R18.** **Yürüyen bakiye doğru kalır:** bakiye değerleri motordan gelir (artan tarih sırasında satır
  satır yazılır, `kasa.js:98-100` `s.bakiyeK`) ve **dilimleme onları yeniden hesaplamaz**. Ters sırada
  çizildiği için (R19) sayfa 2'nin ilk satırının bakiyesi, sayfa 1'in son satırından **bir önceki**
  hareketin bakiyesidir; "devamı" ifadesi artan sıraya aittir ve kullanılmaz.
- **R19.** **Kasa hareket listesi en yeni satır üstte** sıralanır ve ilk sayfa en güncel hareketleri
  gösterir; bakiye sütunu o satırdaki yürüyen bakiyedir. Bugün liste eskiden yeniye çiziliyor
  (`Kasa.jsx:572-579`, ters çevirme yok), yani bu **bilinçli bir görünüm değişikliğidir**. Dönemi baştan
  okumak isteyen kullanıcı **Ekstre** penceresini kullanır, o eskiden yeniye ve tarih aralıklı kalır.
  **Açılış bakiyesi:** bugün listede bir satır değil (`acilisK` döngü öncesi eklenir); ters sırada ilk
  satırın komşusu olmadığı için hesap kartının özetinde okunmaya devam eder ve son sayfaya **sentetik
  "açılış" satırı eklenmez** (yeni satır = yeni hesap, C5'e aykırı).
  **Hesapsız listeler zaten en yeni üstte** (`kasa.js:292` azalan sıralama), onlar yeniden sıralanmaz.
- **R20.** Gider Kalemleri tablosunda sayfalama **ekranda çizilen satır kümesine** uygulanır. Personel
  grubu kapalıyken N kalem **tek satır** çizildiği için (`DonemRaporu.jsx:401` "Çalışanları göster")
  başlıktaki sayı ile satır sayısı **birbirini tutmaz ve tutması beklenmez**: başlıktaki
  `{suz.length} kalem` (`:381`) veri gerçeği olarak kalır, sayfalama satırları sayar. ("Sayfa sayısı ile
  n kalem sayısı birbirini tutar" beklentisi QA turunda düşürüldü, ölçülemezdi.) Alt toplam satırı her
  hâlde süzülmüş kalemlerin tamamını toplar (R16).
- **R21.** **Yazdırma ve dışa aktarma sayfalamayı görmez:** rapor tam listeyi basar (0055'in kararı),
  dışa aktarma tam veriyi yazar. **Ölçü:** rapor kurucusu (`giderRaporu.js`) ve dışa aktarma `page` ya da
  `paged` adlı hiçbir değeri okumaz (kaynak taraması).

### D. QA turunda eklenenler (R1)

- **R22.** **R19 bilinçli bir görünüm değişikliğidir ve kanıt kaydı ister.** `docs/evidence/kanit-eslemesi.json`'daki
  Kasa kayıtları `beklenen: "degisti"` + `onay` (`Takım Yöneticisi · YYYY-AA-GG · spec 0062 R19`) alır ve
  spec `done`'a taşınırken `ayni`ye çevrilir (0009/0011 kuralı). Sıra değişikliği sürüm notuna da yazılır.
- **R23.** **Görsel kanıtta sayfa 2 görünümü de olur.** Görüntü aracı düğmeye basma adımını destekliyor;
  her sayfalanan ekran için bir "sayfa 2" ekranı eklenir ("Sonraki ›" düğmesine basılarak) ve
  `0062-piksel-raporu.json` ile taban raporu üretilir.
- **R24.** **Sayfa durumu liste başınadır.** Aynı ekranda birden çok sayfalanan liste varsa (çek
  portföyünün iki sekmesi, hatırlatma penceresinin iki bölümü, hesapsız ödemeler ve tahsilatlar) her
  listenin kendi sayfa durumu olur; tek durum paylaşılmaz.
- **R25.** **Boş sayfa görünmez.** `usePagination` kullanılan listelerde bu kancanın kendi
  `safePage` kırpması yeterlidir; `useFilteredList` kullanılan listelerde R13'ün `setPage(1)` çağrıları
  bunu sağlar. Hiçbir ekranda "sayfa 3'tesiniz ama liste 1 sayfa" durumu kalmaz.

### E. Plan onayında eklenenler (R2)

- **R26.** **R11'in iki istisnası.** (a) **Gider Kalemleri** `usePagination` ile sayfalanır: süzme bugünkü gibi
  `KalemListesi`'nin kendi durumunda kalır, çizilen satırlar (personel grup satırı, açıksa çalışan satırları, diğer
  kalemler) tek diziye dizilir ve o dizi sayfalanır. `useFilteredList` veri öğesini sayar ve personel grup satırını
  bilmez; R20 ve R25 ancak böyle sağlanır. Toplam `suz`'dan okunur (R16). (b) **Tedarikçiler**'de arama kutusu yoktur;
  R11'in "arama taşıyan liste" varsayımı yanlıştı. `usePagination` ile sayfalanır, arama eklenmez.
- **R27.** **Paylaşılan kanca geriye dönük uyumlu iki ekleme alır.** (1) İsteğe bağlı üçüncü argüman
  `sifirlamaAnahtari`: değeri değişince sayfa 1'e döner (render sırasında önceki anahtarla karşılaştırılır, efekt yok);
  R13'ün ve R28'in bütün sıfırlamaları bu tek yoldan yapılır. (2) `setPage` kırpılmış sayfa üzerinden çalışır: liste
  küçüldükten sonra "‹ Önceki" ham sayıdan geri gidip takılı kalmaz (Finans'ta bugün de olan kusur). Mevcut çağrılar
  aynı davranır.
- **R28.** **Sıfırlama kapsamı genişler** (0014'ün genel kuralı): çek portföyünün durum ve tür süzgeçleri, verilen
  çek süzgeci, ekstrenin tarih aralığı ve Kasa'nın "Hepsini göster" anahtarı da sayfayı 1'e döndürür. **Aç/kapa
  anahtarları (personel grubu, "Adları göster") sayfayı korur:** grup satırı listenin herhangi bir sayfasında olabilir ve
  1'e dönmek kullanıcının açtığı satırı gözden kaçırırdı; çocuk satırlar grup satırının hemen ardından gelir, kanca
  liste küçülünce kırpar (uygulamada netleşti).
- **R29.** **Kasa › "Kapsam dışı bırakılanlar" listesi de sayfalanır** (10). 0058 ile hesapsız listelerden çıkan
  kayıtlar burada birikir; X4'ün sınırlı listelerine benzemez.
- **R30.** **Ekstrenin devreden bakiye satırı yalnız 1. sayfada** çizilir. Sıra eskiden yeniye olduğu için devir
  başlangıçtır; her sayfada tekrar ederse o sayfanın başlangıcı sanılır.
- **R31.** **Pencere içi listeler 5 satırdır, istisna yok** (ekstre geniş pencerede de). C7.
- **R32.** **Personel satırları satır kümesindedir:** Gider Kalemleri, ödeme hatırlatma penceresi ve Açık kalemler'de
  personel grup satırı tek satır sayılır, açılınca çalışan satırları kümeye girer.
- **R33.** **`Pagination` bileşenine etiket eklenmez;** aynı ekrandaki iki çubuk liste kabıyla ayırt edilir.
  Paylaşılan bileşenin görünümü ve uygulamanın geri kalanı değişmez.
- **R34.** **Kasa'da aynı günlü hareketlerin sırası motor sırasının tam tersidir** (yeniden sıralama yok); R18'in
  "bir önceki hareketin bakiyesi" ifadesi ancak böyle kesin olur.

---

## Constraints

- **C1.** Sayfalama **yalnız bir görünüm aracıdır**: hesap, kapsam, toplam ve izin hiçbir yerde sayfaya
  bağlanmaz.
- **C2.** Veri tek blob hâlinde bellekte olduğu için sayfalama **istemci tarafındadır**; sunucudan
  parça parça veri çekilmez.
- **C3.** Sayfa numarası geçici ekran durumudur; kalıcı alan, ayar ya da `localStorage` değildir.
- **C4.** Yeni kalıcı alan, yeni izin ve sunucu değişikliği yoktur.
- **C5.** Motorlar (gider, kasa, çek, hatırlatıcı) değişmez; dilimleme görünüm katmanındadır.
- **C6.** Kullanıcıya görünen metinler Türkçedir.
- **C7.** **Sayfa boyutu kodun bugünkü değerlerinden seçilir** (10 / 5, istisnai 15); yeni bir değer
  uydurulmaz (R12).
- **C8.** **Toplu işlemin kapsamı metinde de doğru olmalı:** etiket ve onay "listedeki" der, "görünen"
  demez (R17); sayfalama bir işlemi ne davranışta ne de metinde daraltmaz.

### KAPSAM DIŞI

- **X1.** Sanal kaydırma (virtual scroll) — *neden:* uygulamanın hiçbir yerinde yok; sayfalama
  alışkanlığı kurulmuşken ikinci bir desen eklemek tutarsızlık olur.
- **X2.** Sunucu tarafı sayfalama — *neden:* C2; veri modeli tek blob, değiştirmek ayrı ve büyük iştir.
- **X3.** Sayfa boyutunun kullanıcı tarafından ayarlanabilmesi — *neden:* R12; iki standart değer var,
  üçüncüsü ayar ekranı demek.
- **X4.** Satır sayısı sınırlı listelere sayfalama eklenmesi (Ödeme Planı penceresi en çok 60 taksit,
  ödeme girişindeki kayıtlı ödemeler, kova ve tür kırılımı kartları, çek durum geçmişi, hesap listesi,
  standart gider grupları, üretim partileri, çalışan avansları) — *neden:* bunlar tanım sayısıyla
  sınırlı; gereksiz çubuk ekranı kalabalıklaştırır. Gerekirse ayrı iştir.
- **X5.** `Notes.jsx`'in elle yazılmış pager'ının paylaşılan bileşene taşınması — *neden:* bu iş
  Giderler ve Kasa'yı kapsıyor; Notlar ayrı bir temizlik.
- **X6.** Sıralama sütunlarının tıklanabilir hâle gelmesi — *neden:* sayfalamadan bağımsız bir istek;
  ayrı spec.
- **X7.** Mevcut boş durum metinlerinin `BosDurum`'a çevrilmesi — *neden:* R14; o 0016'nın işi ve bu spec
  görünümü değiştirmeden sayfalama ekler.
- **X8.** Kasa hareket listesine tarih süzgeci eklenmesi — *neden:* dönemi baştan okuma işi tarih aralıklı
  Ekstre penceresindedir (R19); süzgeç ayrı bir istektir.

---

## Context

- **Tarama sonucu (doğrulandı):** paylaşılan `Pagination` bileşenini ya da sayfalama kancalarını
  kullanan dosyalar Müşteriler, Bayiler, Evrak, Finans, Stok (üç sekme), Notlar, Ayarlar (çöp kutusu,
  gönderilen e-postalar) ve üç katalog yöneticisi. `gider/`, `kasa/` ve `cek/` klasörlerinden **hiçbir
  dosya listede yok** ve bu dosyalarda tek bir dilimleme çağrısı da yok. Yani bütün gider ve kasa
  listeleri her çizimde tam uzunlukta render ediliyor.
- **Sonsuz büyüyen beş liste.** (1) Hesap hareketleri: motor açılış bakiyesinden bugüne yürüyen bakiye
  üretiyor ve ekranda tarih süzgeci yok, yani liste hesabın ömrü kadar uzun. (2) Hesabı belirtilmemiş
  ödemeler ve tahsilatlar: zaten "geçmişten gelen bir sürü kayıt" şikâyetiyle 0058'i doğurdu. (3) Çek
  portföyü: tahsil edilen çek de listede kalıyor. (4) Makina kârlılığı: satılan her makina bir satır.
  (5) Ekstre: tek tarafın bütün hareketleri, aralık verilmezse hepsi.
- **Dönem sınırı yanıltıcı.** Gider kalem listesi "bir ay" sanılıyor, ama dönem seçicide **Tarih
  Aralığı** kipi var; bir yıl seçildiğinde tekrarlayan tanımlar, personel kalemleri ve standart giderler
  birikerek binlerce satır üretebilir. Üstelik bu tablonun altında bir **Toplam** satırı var: sayfalama
  eklerken toplamın görünen sayfaya göre hesaplanması en kolay yapılacak hata olurdu, R16 bunu
  kapatıyor.
- **İki sessiz tuzak, spec'in asıl değeri burada.** Birincisi toplu işlemler: hesabı belirtilmemiş
  kayıtlarda "hesap ata" ve "kapsam dışı bırak" düğmeleri listeye toplu uygulanıyor; sayfalama
  eklenince bu düğmenin kapsamı "görünen 15 kayıt" hâline gelirse kullanıcı 300 kaydı işlediğini
  sanıp 15'ini işler. R17 kapsamı süzülmüş listenin tamamına sabitliyor ve etikete sayıyı yazdırıyor.
  İkincisi yürüyen bakiye: bakiye kümülatif olduğu için sayfa dilimlenirken yeniden hesaplanmamalı
  (R18); motor bakiyeyi satır satır yazdığı için dilimleme güvenlidir, yeter ki ikinci bir hesap
  yazılmasın.
- **Sıralama yönü bir karar.** Bugün hareketler eskiden yeniye sıralı, çünkü yürüyen bakiye böyle
  okunur. Sayfalanınca en güncel hareketler **son** sayfada kalır, oysa kullanıcının Kasa'ya bakma
  sebebi genelde son hareketlerdir. Önerilen çözüm bankaların yaptığıdır: ekranda en yeni üstte, bakiye
  sütunu o işlemden sonraki bakiye (motor hesapladığı için ters sırada da doğru), dönemi baştan okuma
  işi ise tarih aralıklı Ekstre penceresinde kalır (R19). Bu bugünkü görünümü tersine çevirir, bu yüzden
  görsel kanıt ve test beklentisi gerektirir.
- **QA turu: sayfa boyutu üç değerli.** Kodda 5, 10 ve 15 var; **10 baskın** (kancaların varsayılanı,
  Müşteriler, Bayiler, Makina Stoğu), **15 iki istisna** (Evrak, Parça Stoğu), **5 pencere içi** (bayi detay
  modalının üç listesi, Notlar). R12 buna göre düzeltildi.
- **QA turu: iki kanca, iki davranış.** `usePagination` `safePage` ile kendini düzeltir; `useFilteredList`
  düzeltmez ve sayfayı yalnız arama değişince sıfırlar. Hangisinin nerede kullanılacağı ve süzgeç
  sıfırlamalarının çağırana ait olduğu R11 ve R13'e yazıldı; aksi hâlde dönem değiştiren kullanıcı boş
  sayfa görürdü.
- **QA turu: "hesap ata" toplu değil, "Görünen" sözcüğü tuzak.** Hesap ataması satır başına bir `Select`;
  tek toplu işlem kapsam dışı bırakmadır ve etiketi bugün "Görünen {n} kaydı…" diyor. Sayfalama gelince o
  sözcük sayfa sanılacağı için metin "Listedeki" olarak düzeltilir (R17, C8).
- **QA turu: personel grubu satır sayısını değiştirir.** Grup kapalıyken N kalem tek satır çizildiği için
  "sayfa sayısı ile n kalem sayısı tutar" beklentisi sağlanamaz; R20 satır kümesine göre yazıldı.
- **0061 ile sıra ilişkisi.** 0061 dönemden bağımsız "Açık kalemler" listesini getiriyor; o liste tanım
  gereği birikir. İki iş hangi sırada yapılırsa yapılsın sonuç aynı olmalı: 0061 önce giderse listesi
  bu spec'te sayfalanır (R10), bu spec önce giderse 0061 kurulmuş deseni kullanır. Geliştiriciye bu
  not açıkça verilir, yoksa yeni liste sayfalamasız doğar ve iş iki kez yapılır.

---

## Acceptance Criteria

### Sayfalanan listeler

- **AC-1.** Kasa'da seçili hesabın hareketleri sayfalanır; sayfa değiştirilebilir.
- **AC-2.** Hesabı belirtilmemiş ödemeler listesi sayfalanır.
- **AC-3.** Hesabı belirtilmemiş tahsilatlar listesi sayfalanır.
- **AC-4.** Çek portföyünün alınan ve verilen çekler listeleri sayfalanır; iki listenin sayfa durumu
  ayrıdır ve sekme değişince sayfa 1'e döner.
- **AC-5.** Gider Kalemleri tablosu sayfalanır.
- **AC-6.** Makina Kârlılığı listesi sayfalanır.
- **AC-7.** Makina ve Model görünümünün makina listesi sayfalanır.
- **AC-8.** Tedarikçiler listesi sayfalanır.
- **AC-9.** Ekstre penceresi sayfalanır.
- **AC-10.** Ödeme hatırlatma penceresi **bölüm başına** sayfalanır (vadesi geçmiş ve yaklaşan ayrı).
- **AC-11.** Açık kalemler listesi sayfalanır.

### Davranış

- **AC-12.** Paylaşılan sayfalama bileşeni kullanılır; gider, kasa ve çek klasörlerinde elle yazılmış
  pager yoktur.
- **AC-13.** Tam sayfa listelerde sayfa boyutu **10**, pencere içi listelerde **5**'tir; 15 kullanılan bir
  yer varsa gerekçesi yazılıdır (R12).
- **AC-14.** Arama, süzgeç ve seçim değişince sayfa 1'e döner; kapsam R13'te sayılan beş durumu içerir.
- **AC-15.** Boş listede sayfalama çubuğu çizilmez ve **bugünkü boş durum metni** görünür (R14).
- **AC-16.** Tek sayfalık listede sayfalama çubuğu çizilmez.

### Bozulmaması gerekenler

- **AC-17.** Gider Kalemleri tablosunun alt toplamı, sayfa 1'de ve sayfa 2'de aynıdır ve süzülmüş
  listenin tamamını toplar.
- **AC-18.** Kova, tür ve tedarikçi kırılımı kartları sayfadan etkilenmez.
- **AC-19.** Hesap bakiyesi ve ekstrenin son bakiyesi sayfadan etkilenmez.
- **AC-20.** "Kapsam dışı bırak" düğmesi, sayfa 2'de bile süzülmüş listenin **tamamına** uygulanır;
  etiket ve onay "**Listedeki** {n} kayıt" der, "Görünen" demez. "Hesap ata" satır başınadır ve
  sayfalamadan etkilenmez.
- **AC-21.** Bakiye değerleri motordan gelir ve dilimleme onları yeniden hesaplamaz; ters sırada sayfa
  2'nin ilk satırının bakiyesi, sayfa 1'in son satırından bir önceki hareketin bakiyesidir.
- **AC-22.** Kasa hareket listesinde en yeni hareket ilk sayfanın başındadır; açılış bakiyesi hesap
  özetinde okunur ve listeye sentetik satır eklenmez.
- **AC-23.** Ekstre penceresi eskiden yeniye sıralı kalır.
- **AC-24.** Aylık Gider ve Kasa Raporu'nun kalem listesi tam basılır; sayfalama çıktıya girmez.
- **AC-25.** Dışa aktarma tam veriyi yazar; rapor kurucusu ve dışa aktarma `page` / `paged` okumaz
  (kaynak taraması).

### QA turunda eklenenler (R1)

- **AC-26.** Motor çıktısı listeler `usePagination` ile, aramalı listeler `useFilteredList` ile sayfalanır
  (R11).
- **AC-27.** Kasa'da hesap seçimi değişince sayfa 1'e döner.
- **AC-28.** Giderler'de dönem (Ay ↔ Tarih Aralığı dahil) değişince sayfa 1'e döner.
- **AC-29.** Gider Kalemleri'nde tür, tedarikçi ya da ödeme süzgeci değişince sayfa 1'e döner.
- **AC-30.** Hiçbir listede boş sayfa görünmez (liste küçülünce sayfa kırpılır ya da 1'e döner; R25).
- **AC-31.** Personel grubu kapalıyken sayfalama satır kümesine uygulanır; başlıktaki kalem sayısı veri
  gerçeği olarak kalır ve iki sayının farklı olması hata sayılmaz (R20).
- **AC-32.** Gider Kalemleri'nin alt toplam satırı personel grubu açık ya da kapalı, sayfa 1 ya da 2'de
  aynıdır (R16, R20).
- **AC-33.** Ekstrenin devreden bakiyesi ve son bakiyesi sayfadan etkilenmez (R8).
- **AC-34.** Hesapsız ödemeler ve tahsilatlar listeleri ayrı sayfa durumu tutar (R24).
- **AC-35.** Hesapsız listelerin bugünkü en yeni üstte sıralaması değişmemiştir (R19).
- **AC-36.** Tek sayfalık listede çubuk çizilmez ve bu `Pagination`'ın kendi davranışıdır; ekranlarda ek
  koşul yoktur (R15).
- **AC-37.** `docs/evidence/kanit-eslemesi.json`'daki Kasa kayıtları `beklenen: "degisti"` + onay taşır
  (R22).
- **AC-38.** Her sayfalanan ekranın "sayfa 2" görsel kanıtı vardır (R23).

### Plan onayında eklenenler (R2)

- **AC-39.** Gider Kalemleri ve Tedarikçiler `usePagination` ile sayfalanır; Gider Kalemleri'nde sayfalanan dizi
  çizilen satırlardır (R26).
- **AC-40.** Kancanın sıfırlama anahtarı değişince sayfa 1'e döner; liste küçüldükten sonra "‹ Önceki" kırpılmış
  sayfadan bir önceki sayfaya gider (R27).
- **AC-41.** R28'de sayılan süzgeçler değişince sayfa 1'e döner.
- **AC-42.** Kapsam dışı bırakılanlar listesi sayfalanır (R29).
- **AC-43.** Ekstrenin devreden bakiye satırı yalnız 1. sayfadadır (R30).
- **AC-44.** Personel grup satırı tek satır sayılır; açılınca çalışan satırları sayfalamaya girer (R32).
- **AC-45.** Kasa hareket listesi motor sırasının tam tersidir (R34).

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Kaynak taraması: gider, kasa ve çek klasörlerinde elle yazılmış sayfalama kalmadı (AC-12).
- [x] Hangi listenin hangi kancayı kullandığı tabloyla gösterildi (R11, AC-26).
- [x] Sayfa sıfırlamanın beş durumu testle sabitlendi ve hiçbir yerde boş sayfa kalmadı
      (R13, AC-27, AC-28, AC-29, AC-30).
- [x] Toplamların sayfadan bağımsızlığı testle sabitlendi (AC-17, AC-32, AC-33).
- [x] Toplu işlemin kapsamı ve **metni** düzeltildi: "Listedeki {n} kayıt"; `Kasa.jsx`'teki 0058 yorumu
      güncellendi (R17, C8, AC-20).
- [x] Bakiye değerlerinin dilimlemeyle yeniden hesaplanmadığı testle sabitlendi (AC-21).
- [x] Kasa hareket listesinin sıra değişikliği görsel kanıtla gösterildi, kanıt kayıtları
      `beklenen: "degisti"` + onay aldı ve sürüm notuna yazıldı (R19, R22, AC-37).
- [x] Görsel kanıt eklendi (`docs/evidence/0062-*.jpg` + `0062-piksel-raporu.json`, yeni taban):
      sayfalanan listeler ve her biri için "Sonraki ›" ile üretilen **sayfa 2** görünümleri
      (R23, AC-38).
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi: gider ve kasa listelerinin sayfalandığı, sayfa boyutu kuralı (10 / pencere
      içi 5, istisnai 15), hangi listenin hangi kancayı kullandığı, süzgeç sıfırlamanın çağırana ait
      olduğu, toplam ve toplu işlem kapsamının sayfadan bağımsız olduğu ve Kasa hareket listesinin artık
      en yeni üstte sıralandığı.
- [x] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 1 | R2 plan onayı (Q1–Q10; R26–R34, AC-39…AC-45). Uygulamada R28 netleşti: aç/kapa anahtarları sayfayı korur (grup satırı her sayfada olabilir). Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | 1 | Triyaj: 2 bulgu. Kanca kırpılan sayfayı saklamıyordu (liste boşalıp dolunca eski sayfaya atlıyordu); görsel kanıt bulgusu triyajdan önce tamamlanmıştı. İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | 1 / 1 | Kanca bulgusu gerçek; kanıt bulgusu triyajın eski bir anı görmesinden (rapor ve kayıtlar diskteydi). Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | 0 | Tam önce/sonra çekiminde 526 görüntünün 514'ü 0 piksel; kalan 6 ekran bilinçli (R17, R19, R31) ve onaylı. Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | 1 | 2026-10-02 (spec 0067 sırasında bulundu): Electron'daki `form-pencere-yerlesim` testi ekstrede en az 8 satır bekliyordu, 0062 ekstreyi 5 satırla sayfaladığı için kırıldı; kapanışta yalnız Electron dışı takım koşulmuştu. Test 0067 dalında 5 satır + çubuk ölçüsüne güncellendi. Ders: sayfalama gibi satır sayısını değiştiren işlerde Electron yerleşim testleri de koşulmalı. Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:** Paylaşılan bir kancaya "sayfa 1'e dön" eklerken üç ayrı olay vardır: süzgeç değişimi, liste küçülmesi ve aç/kapa. Spec ilk ikisini yazmıştı ama kırpmanın kalıcı mı geçici mi olduğunu ve aç/kapanın sayfayı korumasını söylemiyordu; ikisi de uygulamada ve triyajda ortaya çıktı. Sıfırlama kuralı yazılırken her olayın sayfaya etkisi tek tek tanımlanmalı. İkincisi: R11'in liste ↔ kanca eşlemesi koda bakılmadan yazılmıştı (Tedarikçiler'de arama yok, Gider Kalemleri satır kümesi); bu tür tablolar spec aşamasında kodla doğrulanmalı.
