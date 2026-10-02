# 0016 — Liste, Boş Durum ve Uyarı Birliği

| | |
|---|---|
| **Durum** | Tamamlandı (2026-09-25; Aşama 1 commit `d749f0a`, Aşama 2 commit `745a028`, dal `feat/0016-liste-bos-durum`; plan `specs/done/0016-uygulama-plani.md` G1–G14, H1–H9) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Müşteriler, Bayiler, Stok, Finans, Evrak Yönetimi, Notlar, Analiz ve bu ekranların detay bölümleri |
| **Bağımlı spec'ler** | **0009** (tasarım sözlüğü), 0014 ve 0015 ile aynı ekranlara dokunur |
| **Revizyon** | R1 (2026-09-25): kapatılan **0010**'un Müşteriler payı bu spec'e devredildi — boş durum kutusunun yapı istisnası ve sabit metinleri (R6), detay modalının ayrı aşamada teslimi ve kart başlık biçimi kuralı (R8, R9), test ağının tam listesi (C3), kanıt altyapısının bu işin parçası olduğu (C7) ve ekran anahtarları (DoD), sayfalama ile tablo başlıklarının kapsam dışı olduğu (X6). R2 (2026-09-25): onay öncesi QA boşluk analizi, 0014 ve 0015 birleştikten sonraki koda göre; 14 açık nokta karara bağlandı — çift R8 numarası düzeltildi (kapsam maddesi R10), kanıt yöntemi 0014'ün taban raporuna güncellendi (C7), R6'nın metin istisnası ile X3 ve AC-3 arasındaki çelişkiler kapatıldı, ayrımı bugün yapmayan ekranlarda yeni metin yazılmayacağı kararlaştırıldı (R2), detay dosyalarının sınırı "içerik ve sıralama değişmez" olarak yeniden çizildi (R9), boş durum kutusundaki eylem düğmesi kapsam dışına alındı (X7, C6, AC-4), kutunun tablonun yerine geçtiği yazıldı (R1), ölçülemez kriterler kaynak taraması ve görüntü yöntemine bağlandı (AC-1, AC-11), ekran anahtarları tamamlandı, kısıt ve kapsam dışı sırası düzeltildi. R3 (2026-09-25, plan onayı): kodda doğrulanan noktalar işlendi: açıklama satırı yalnız Müşteriler'de eklenir, diğer ekranlarda isteğe bağlı ve bugünkü iki cümleli metin bölünür (R6/G1); iki PR aynı dalda iki commit (R8/G2); Müşteriler "hiç kayıt yok" açıklaması sabitlendi (R6/G3); uyarı şeridine `hata` ailesi (R4/G4); mesaj sınıflaması adlandırılmış listeyle (R4/G5); Finans kapsamda (R10/G6); başlık biçimi ekran türüne göre (R9/G8); Analiz'in `<section>` kabı korunur (C3/G9); Aşama 2 için `kart` varyantına katlanma ve eylem yuvası (C2/G10); "Not seçilmedi" boş durum kutusu (R1/G11); ekran anahtarları genişletildi (DoD/G7). R4 (2026-09-25, uygulama): `form-kaynak.test.js`'in bayi büyük harf sayısı için C3 istisnası Takım Yöneticisi tarafından onaylandı; Aşama 1 görüntüleri (AC-11) onaylandı. R5 (2026-09-25, Aşama 2 plan eki onayı, H1–H9): müşteri detay penceresinde katlanan bölümler dışarıdan da açılabildiği için `kart` varyantına denetimli katlanma ve başlık yanı eylem yuvası sözlüğe eklenir (C2); kaynakta büyük harfle yazılmış iki başlık ("KALIPLAR", "BU FİRMANIN MAKİNALARI") olağan yazıma çevrilir, kelimeler aynı (R6); makinalar kenar çubuğu kart olmaz (R9). |

---

## Intent

Uygulamada kayıt bulunmadığında kullanıcı kırk ayrı yerde kırk farklı görünüm görüyor: bazı
ekranlarda ortalanmış kesikli bir kutu, çoğunda ise tablonun altına düşmüş gri bir cümle.
Uyarılar da öyle; kimi yerde renkli bir şerit, kimi yerde satır içi bir metin. Bölüm başlıkları
bazı kartlarda var, bazılarında hiç yok. Sekmeler ve formlar birleştikten sonra geriye kalan en
görünür tutarsızlık bu.

Başarı şu demek: boş durumlar, uyarılar ve bölüm çerçeveleri uygulamanın her yerinde aynı
görünüyor; kullanıcı "kayıt yok" ile "aramana uyan kayıt yok" arasındaki farkı her ekranda aynı
biçimde anlıyor. Hiçbir listenin içeriği, sıralaması veya sayfalaması değişmemiş.

---

## Requirements

- **R1.** Kayıt bulunmayan durumlar sözlükteki boş durum kutusuyla gösterilir. Bugün tabloların altına
  düşen düz metinler ona geçer. **Kutu tablonun yerine geçer, altına değil:** kayıt yokken tablo hiç
  çizilmez, başlık satırı da görünmez.
- **R2.** "Hiç kayıt yok" ile "aramaya veya süzgece uyan kayıt yok" **ayrı** durumlardır. Bugün bu ayrımı
  yapan ekranlarda ayrım **korunur**; yapmayan ekranlarda bu işte **kazandırılmaz**, mevcut tek metin
  kutunun başlığına taşınır. Ayrım kazandırmak yeni metin yazmak demektir ve kendi işini hak eder.
  **Tek istisna Müşteriler'dir** (R6): iki metni kapatılan 0010'dan devralındığı ve orada karara bağlandığı
  için o ekranda ayrım kazanılır.
- **R4.** Bilgi, uyarı ve hata mesajları sözlükteki uyarı şeridiyle gösterilir; satır içi yazılmış renkli
  kutular ona geçer.
  (R3, G4, G5) Kırmızı mesajlar için sözlükteki uyarı şeridine **`hata`** ailesi eklenir (alan hatası yine hata metni).
  Hangi kutunun mesaj olduğu plandaki adlandırılmış listeyle belirlenir; kayıt türü etiketleri, tutar taşıyan özet
  panelleri ve düğmeli bantlar mesaj değildir, dokunulmaz ve sözlükte bilinen borç olarak yazılır.
- **R5.** Liste ve detay bölümleri kart bölüm bileşeniyle çerçevelenir; başlıkları aynı biçimde yazılır.
  **0015 ile bilinçli fark:** form bölümleri kartla çevrelenmez, yalnız başlık biçimini alır (pencere
  uzamasın diye); okuma amaçlı liste ve detay bölümleri ise çerçevelenir. Müşteri detayında ikisi yan yana
  görünecektir ve bu kasıtlıdır.
- **R6.** **Metinler değişmez.** Bugün ne yazıyorsa aynısı yazar; yalnız çerçevesi değişir.
  **Tek istisna boş durum kutusunun yapısıdır:** kutu başlık artı açıklama biçiminde olduğu için bugünkü tek
  satır metin **başlığa** taşınır ve altına kısa bir açıklama satırı eklenir. Eklenen açıklamalar bu spec'te
  ekran ekran sabitlenir; geliştirici kendi metnini yazmaz. Müşteriler için: arama veya süzgeç sonucu boşsa
  başlık "Müşteri bulunamadı.", açıklama "Arama ölçütünü değiştirmeyi deneyin."; hiç kayıt yoksa başlık
  "Henüz müşteri kaydı yok", açıklama yeni müşteri eklemeye yönlendiren kısa bir cümle.
  (R3, G1) Açıklama satırı **yalnız Müşteriler'de eklenir**; diğer ekranlarda kutu yalnız başlıkla çizilir (açıklama
  satırı isteğe bağlıdır). Bugünkü metin iki cümleyse ilk cümle başlık, kalanı açıklama olur; yeni kelime eklenmez.
  (R3, G3) Müşteriler "hiç kayıt yok" açıklaması: "Yeni müşteri eklemek için “Yeni Müşteri” düğmesini kullanın."
  "Hiç kayıt yok" canlı müşteri listesinin boş olmasıdır; arama **veya süzgeç** sonucu boşsa "Müşteri bulunamadı." çıkar.
- **R7.** Listenin **içeriği, sıralaması, sayfalaması ve süzgeç davranışı değişmez.**
- **R8.** **Müşteri detay modalı ayrı bir aşamada teslim edilir** (kapatılan 0010'dan devralındı).
  Bu spec'in Müşteriler payı iki PR'dır: önce liste ve boş durumlar, sonra detay modalının bölümleri.
  Sebep: detay modalı uygulamanın en büyük arayüz dosyası; tek seferde dönüştürmek gözden geçirilemez bir
  değişiklik üretir. **Kabul edilen sonuç:** iki aşama arasında liste yeni, detay eski görünür.
  (R3, G2) Bu depoda PR yerine **aynı dalda iki ayrı commit**; her aşama kendi kanıtı ve AC-11 onayıyla.
- **R9.** Detay bölümlerinde **içerik ve sıralama değişmez**: hangi olayın nasıl özetlendiği, alan düzeni ve
  sıra bu işin dışındadır. Ancak boş durum kutusu ve başlık çerçevesi için `customers/detail/` altındaki
  dosyalara **dokunulur** (örneğin dosyalar bölümü bugün kendi boş durum metnini kendi içinde taşıyor);
  sınır "dosya açılmaz" değil, "içerik ve sıralama değişmez"dir. Detay modalındaki bölümler kart varyantının
  **"baslik"** biçimini, liste üstündeki kartlar **"etiket"** biçimini kullanır; bölüm başına yeniden karar
  verilmez.
  (R3, G8, G9, G10) Uygulamada: Finans'ın başlıklı kartları `etiket`; Analiz kutuları (rapor ekranı) ve detay bölümleri
  `baslik`; başlıksız liste kapları başlıksız kart. Analiz kutularının dış `<section>` öğesi korunur (mevcut testler onu arar).
  Müşteri detayının katlanan ve başlık yanında düğme taşıyan bölümleri için `kart` varyantına katlanma ve eylem yuvası
  sözlüğe eklenir (Aşama 2).
  (R5, H1–H6) Müşteri detayında: Görüşmeler ve Dosyalar denetimli katlanan kart (odak ve dosya süzgeci onları dışarıdan
  açar); Makina Geçmişi'nin ikonu düşer, "n olay" alt başlık olur; Sahiplik Geçmişi beyaz kart; makinalar kenar çubuğu
  yalnız başlık alır. "KALIPLAR" ve "BU FİRMANIN MAKİNALARI" başlıkları "Kalıplar", "Bu Firmanın Makinaları" yazılır (harf
  büyüklüğü görünümdür, metin değişikliği sayılmaz).
  > **Not (2026-10-02, spec 0067 R11, R12 a):** 0050 bu sözleşmeye müşteri detayındaki "Maliyet ve Kâr" kutusunu eklemişti; kutu 0067 ile kaldırıldı ve `tests/liste-kaynak.test.js` taramasından çıktı (kart sayısı 4 → 3).
- **R10.** Kapsam yedi ekran ve bunların detay bölümleridir: müşteri detayındaki geçmiş ve ödeme bölümleri,
  bayi detayındaki servis ve satış bölümleri, stok alt sekmeleri, evrak listeleri, notlar, analiz kutuları.

  (R3, G6, G11) Yedi ekran: Müşteriler, Bayiler, Stok, **Finans**, Evrak, Notlar, Analiz. Notlar'daki "Not seçilmedi"
  kartı da boş durum kutusuna geçer (metin aynı, simge düşer).

---

## Constraints

- **C1.** Davranış değişikliği yasak; liste mantığına dokunulmaz.
- **C2.** Yeni yapı taşı gerekirse sözlüğe eklenir; ekrana özel varyant yazılmaz.
- **C3.** Mevcut arayüz testleri değiştirilmeden geçmelidir. Boş durum metinleri üzerinden sorgulayan testler
  var; metin korunmazsa kırılırlar. Gate, bu ekranları kapsayan **bütün** mevcut testlerdir, seçilmiş bir
  alt küme değil: Müşteriler tarafında sekiz müşteri testinin yanında **detay modalını doğrudan süren**
  `gorusme-odak` ve `taksit-odeme-odak` ile bu ekranı çizen `kalip-borc-capraz`, `evrak-finans-capraz`,
  `dealers-kalip-satisi`, `gider-yetkisiz-gorunum`, `settings-trash` ve `backup-encrypt` de sayılır.
  **Test dosyalarına dokunulmaz; `docs/evidence/kanit-eslemesi.json` veri dosyasına kayıt eklemek bu yasağın
  dışındadır ve zorunludur** (C7).
  (R4) **İstisna:** `tests/form-kaynak.test.js`'in (0015) büyük harf istisna sayısındaki `SimpleDealers.jsx` satırı 5 → 2;
  bu iş bayi detayının üç bölüm başlığını karta taşıdığı için sayı düştü (0014 `Chip`, 0015 `Warn` emsali).
- **C4.** Yeni bağımlılık, CSS framework, CSS module veya styled-components eklenmez.
- **C5.** Kullanıcıya görünen metinler Türkçedir ve değişmez.
- **C6.** Boş durum kutusunda **eylem düğmesi bulunmaz** (X7). İleride eklenirse mevcut izin kurallarına
  uyar ve izinsiz kullanıcıya gösterilmez.
- **C7.** **Kanıt altyapısı bu işin parçasıdır.** `tests/tasarim-kaynak.test.js`, sözlüğü kullanmaya başlayan
  her dosya için kanıt eşlemesinde kayıt, o kaydın ekranının görüntü aracında iki temada hatasız çizimi ve
  JPEG'inin depoda durmasını şart koşar. Dönüştürülen her ekran **görüntü aracına eklenir**
  (`scripts/evidence`). **Yöntem 0014'te oturdu:** araç bir çıkış klasörü ile karşılaştırılacak klasörü alır;
  dönüşüm önce/sonra raporu üretir (`<spec>-piksel-raporu.json`), kayıtlar `beklenen: "degisti"` + `onay` ile
  açılır ve spec `done`'a taşınırken `ayni`ye çevrilip onaylanan yeni görünümü taban alan rapora bağlanır
  (`<spec>-taban-piksel-raporu.json`). Aracın adı ya da öneki değiştirilmez.

### KAPSAM DIŞI

- **X1.** Tablo sütunlarının, satır düzeninin veya yoğunluğunun değişmesi — *neden:* bu bir veri görünümü
  kararı; tasarım birliği işinin konusu değil.
- **X2.** Servis ve Kargo Panosu ile Faaliyet Haritası — *neden:* kendi görsel dilleri var (0009'dan beri
  aynı gerekçe).
- **X3.** Mevcut boş durum metinlerini güzelleştirmek ve ayrımı bugün yapmayan ekranlara yeni metin yazmak —
  *neden:* metin değişikliği ayrı bir karar; bu iş yalnız çerçeveyi değiştirir (R2). **İstisna:** R6'da
  ekran ekran sabitlenen açıklama satırları, kutunun başlık artı açıklama yapısı gereği eklenir ve bu
  bilinçlidir.
- **X4.** Yükleniyor durumlarının birleştirilmesi — *neden:* uygulamada yükleme göstergesi yok denecek kadar
  az; ihtiyaç doğarsa kendi işi olur.
- **X5.** Ayarlar ekranı — *neden:* bölümleri zaten sözlüğün kart bileşenini kullanıyor.
- **X6.** Sayfalama denetimleri, tablo başlıkları ve arama kutusu — *neden:* sözlükte bunlara karşılık gelen
  bir yapı taşı yok ve yenisini icat etmek 0009 X5 ile yasak. Bugünkü hâlleriyle kalırlar; "liste yeni
  tasarıma geçti ama sayfalama eski" sorusu bu kararla baştan cevaplanmıştır.
- **X7.** Boş durum kutusuna eylem düğmesi eklemek — *neden:* hangi ekranda hangi düğmenin duracağı ve
  etiketinin ne olacağı ürün kararıdır ve her etiket yeni metin demektir (C5, X3). İhtiyaç doğarsa kendi
  işinde ekran ekran tartışılır.

---

## Context

- **Dağınık boş durum metinleri kaynak taramasıyla çıkarılır**; sayı sabit değildir ve zamanla değişir
  (kaba tarama bugün altmışın üzerinde satır veriyor, hepsi boş durum değil). Bileşenler içinde
  "kayıt bulunamadı", "henüz ... yok" gibi düz metinler dağınık duruyor; boş durum kutusunu bugün yalnız
  Giderler ekranı kullanıyor (`src/components/Giderler.jsx`). İş başlarken tarama tekrarlanır ve kapsam
  listesi PR özetine yazılır.
- **Ayrım bazı ekranlarda zaten var.** Evrak listesi, hiç belge olmamasıyla aramaya uyan belge
  bulunmamasını ayırıyor (`Documents.jsx:865`). Müşteriler ve Bayiler'de bu ayrım yok. R2 bunu her yere
  yayar.
- **Uyarı şeridi hazır.** Sözlükte üç renk ailesiyle tanımlı ve durum duyurma niteliği taşıyor; Giderler
  ekranı kullanıyor. Diğer ekranlarda uyarılar satır içi kutularla çözülmüş.
- **Kart bölüm iki varyantlı.** Sözlükteki kart bileşeni hem Ayarlar bölümü hem ince kenarlıklı kart olarak
  çalışıyor; bu iş için ikinci varyant kullanılacak.
- **Sıra önemli.** 0014 sekmeleri, 0015 formları birleştiriyor; bu iş geriye kalan liste ve bölüm
  çerçevelerini kapsıyor. Üçü aynı ekranlara dokunduğu için **art arda** yapılmaları, aynı anda yapılmalarından
  güvenli.

Bilinen tuzaklar:

- **Metin değişimi.** Çerçeveyi değiştirirken metni de "iyileştirme" isteği doğar; C5 ve X3 bunu kapatıyor,
  çünkü metin değişikliği testleri kırar ve kullanıcıyı şaşırtır.
- **Boş durumun yanlış yere konması.** Süzgeç sonucu boş olduğunda "henüz kayıt yok" yazmak kullanıcıya
  verisinin silindiğini düşündürür (R2).
- **İzin sızıntısı.** Boş durum kutusuna eylem düğmesi eklerken izin kontrolü atlanırsa, yetkisiz kullanıcı
  ilk kez orada bir "ekle" düğmesi görür (C6).

---

## Acceptance Criteria

- **AC-1.** Kapsamdaki yedi ekranda ve detay bölümlerinde kayıt bulunmayan durumlar boş durum kutusuyla
  gösterilir; kayıt yokken tablo ve başlık satırı çizilmez. Yerel boş durum metni kalmadığı **kaynak
  taraması testiyle** gösterilir.
- **AC-2.** Ayrımı bugün yapan ekranlarda (ve Müşteriler'de, R6) hiç kayıt olmayan durum ile aramaya uyan
  kayıt bulunmayan durum farklı metin gösterir. Ayrımı bugün yapmayan ekranlarda tek metin korunur ve yeni
  ayrım kazandırılmaz.
- **AC-3.** Bugün bu ayrımı yapan ekranlarda bugünkü metin kutunun **başlığı** olur ve hangi durumda hangi
  başlığın çıktığı değişmez (örnek: Evrak listesinde "Henüz teklif yok." ile "Arama sonucu bulunamadı.").
- **AC-4.** Boş durum kutusunda eylem düğmesi bulunmaz (X7).
- **AC-5.** Bilgi ve uyarı mesajları uyarı şeridiyle gösterilir ve metinleri değişmez.
- **AC-6.** Liste ve detay bölümleri kart bölüm bileşeniyle çerçevelenir; başlıkları aynı biçimde yazılır.
- **AC-7.** Listelerin içeriği, sıralaması ve sayfalaması dönüşüm öncesiyle aynıdır.
- **AC-8.** Süzgeç ve arama davranışı değişmez.
- **AC-9.** Müşteri detayındaki geçmiş, ödeme ve dosya bölümleri kayıt yokken boş durum kutusu gösterir;
  bölümlerin içeriği ve sıralaması değişmez (R9).
- **AC-10.** Bayi detayındaki servis ve satış bölümleri için aynısı geçerlidir.
- **AC-11.** Karanlık temada boş durum kutusu, uyarı şeridi ve kart bölüm okunabilir; doğrulama 0014'ün
  yöntemiyle yapılır (aynı pencere boyutunda, iki temada önce ve sonra görüntüsü; kararı Takım Yöneticisi
  verir).
- **AC-12.** Mevcut arayüz testleri değiştirilmeden geçer.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Dağınık boş durum metinlerinin kalmadığı **kaynak taraması testiyle** gösterildi (AC-1).
- [ ] Mevcut test dosyalarına dokunulmadı (C3).
- [ ] Dönüştürülen ekranlar görüntü aracına eklendi;
      Müşteriler için üretilecek ekran anahtarları: `musteriler-liste`, `musteriler-bos-arama`,
      `musteriler-bos-kayit`, `musteriler-gruplu` (birinci aşama), `musteri-detay`, `musteri-detay-bos`
      (ikinci aşama). Diğer ekranlar için: `bayiler-bos`, `stok-bos`, `evrak-bos`, `notlar-bos`,
      `analiz-bos`, `bayi-detay-bos` (C7). (R3, G7) Ek olarak: `finans-bos`, `stok-bos-parca`, `stok-bos-yedek`,
      `stok-bos-uretim`, `evrak-bos-arama`, `notlar-bos-arama`, `stok-parca-uyari`, `bayi-detay`; Giderler ekranları
      aynı rapora 0 fark beklentisiyle girer.
- [ ] Sözlüğü kullanmaya başlayan her dosya için `docs/evidence/kanit-eslemesi.json`'a kayıt eklendi
      (`beklenen: "degisti"` + `onay`); spec `done`'a taşınırken bu kayıtlar `ayni`ye çevrildi.
- [ ] Müşteriler payı iki ayrı PR olarak teslim edildi (R8); ikisi birleşmeden spec `done`'a taşınmadı.
- [ ] Kapsamdaki ekranların boş durum ve uyarı görüntüleri eklendi (yan yana küçültülmüş JPEG artı
      `<önek>-piksel-raporu.json`; karşılaştırma tam çözünürlüklü PNG'lerle yapılır), aydınlık ve
      karanlık tema.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 2 | R4: C3'e istisna; 0015'in `form-kaynak` testi bayi detayındaki büyük harf başlık sayısını (5) kilitliyordu, bu iş üçünü karta taşıyınca 2 oldu. R5: Aşama 2 plan eki; katlanan bölümler dışarıdan açıldığı için sözlüğe denetimli katlanma ve eylem yuvası, büyük harfle yazılmış iki başlığın olağan yazıma dönmesi (R6 yorumu), kenar çubuğunun kart olmaması (R9). R3 plan turunda, onayla eş zamanlıydı, sayılmaz. |
| **Düzeltme turu sayısı** | 0 | İş geri dönmedi. İki aşama da ilk sunulan görüntülerle onaylandı. Uygulamada netleşenler (eksik iki envanter metni, olay sırasının yönü, `data-testid` sayısı kilidi, `</>` tarama hatası) plan §7–§8'e yazıldı. |
| **Bulgu gerçek/gürültü oranı** | 0 / 0 | Gözden geçirme turu olmadı. Kapsam dışı bulgular sözlükte borç: Analiz kutularının `h2` başlık kaybı (erişilebilirlik), Sandık Etiketi formunun başlıkları, Maliyet ve Kâr kutusu. |
| **Regresyon sayısı** | 0 | 28 davranış testi (`bos-durum`, `bayi-detay-bolumler`, `uyari-seritleri`, `musteri-detay-bolumler`) dönüşümden önce eski kodda yeşil yazıldı, sonra da yeşil; mevcut testler tek onaylı istisna dışında değişmeden geçti; değişmemesi gereken ekranlar (Giderler, Ayarlar, formlar) 0 piksel fark. Son durum: 206 dosya, 2247 test (tek kırmızı işten bağımsız tarih bombası `makina-odeme`), lint 0 hata. |
| **Kaçan hata** | 0 | Henüz gerçek kullanımda bulunan yok. |

**Bu spec'ten çıkarılan ders:** "Borcun var olmasını kilitleyen test" dersi (0014 `Chip`, 0015 `Warn`) üçüncü kez çıktı; planda
tarama yalnız bir test dosyasına bakmıştı. Aşama 2'de tarama işin başında bütün kaynak okuyan testlere yapıldı ve istisna
gerekmedi: bu tarama plan şablonunun sabit bir maddesi olmalı. İkinci ders: piksel karşılaştırmasının ortamı da koddur.
macOS'un kaydırma çubuğu durumu iki kez koddan bağımsız "fark" üretti; ilk seferde kodu geri alıp yeniden çekerek, ikincide
aracı ortamdan bağımsız yaparak (`hide-scrollbars`) çözüldü. Kararlılık ölçümü (iki ardışık çekim 0 fark) her "önce" çekiminden
önce yapılmalı. Üçüncüsü: büyük dosyayı iki aşamaya bölmek (R8) gözden geçirmeyi küçülttü ve Aşama 2'nin kendi plan ekiyle,
kodu gördükten sonra karar vermesini sağladı (denetimli katlanma ihtiyacı ancak o zaman görüldü). Son olarak metni cümle cümle
ve desenle sorgulayan davranış testleri, metnin başlık ve açıklama olarak bölünmesine dayanıklı kaldı; Türkçe "İ/ı" ise `/i`
bayrağıyla eşleşmiyor, iki yazımı açıkça sıralamak gerekiyor.
