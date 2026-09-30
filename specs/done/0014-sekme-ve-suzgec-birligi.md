# 0014 — Sekme ve Süzgeç Birliği

| | |
|---|---|
| **Durum** | Tamamlandı (2026-09-25; kod commit `7689c55`, dal `feat/0014-sekme-suzgec`; plan `specs/done/0014-uygulama-plani.md` Z1–Z12) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Müşteriler, Bayiler, Stok, Finans, Evrak Yönetimi, Notlar, Analiz |
| **Bağımlı spec'ler** | **0009** (tasarım sözlüğü) |
| **Revizyon** | R1 (2026-09-25): kapatılan **0010**'un süzgeç payı bu spec'e devredildi — sayaç için tek çözümün sayı rozeti olduğu (R2), test ağının tam kapsamı (C3) ve kanıt altyapısının bu işin parçası olduğu (C6, DoD). R2 (2026-09-25): onay öncesi QA boşluk analizi; 12 açık nokta karara bağlandı — 0010 kapatılırken düşen "Firmaya Göre Grupla" kuralı geri geldi (R1), hedef bileşenin eşit genişlik davranışı ve alt sekmelerin semantiği için sözlüğe iki ekleme kararlaştırıldı (R9, R6), rozetin erişilebilir ad yöntemi sabitlendi (R3), Notlar'ın mod kuralı, derin bağlantı ve özel aralık alanları yazıldı (R4/R5/R7), ölçülemez kriterler ölçülebilir hâle getirildi (AC-1, AC-4, AC-13), AC-15…AC-20 eklendi, kısıt sırası düzeltildi.  R3 (2026-09-25, plan onayı): kodda doğrulanan dört nokta işlendi: süzgeçler `dugme` kipinde (mevcut testler düğme rolüyle sorguluyor; bugün rolsüz çubuklara `aria-pressed` eklenir, R1/Z1); Stok > Yedek Parça Satışı'ndaki `Tümü`/`Tahsisi eksik` çubuğu kapsama alındı (R1/Z5); "Firmaya Göre Grupla" ve Finans'taki tutar göster/gizle düğmesi AC-1 taramasında adıyla istisna (AC-1/Z6); sekme kipinde klavye gezinmesi yok, sözlükte borç (R6/Z4); görüntü aracının önek desteği 0011'de eklendi (DoD/Z10).  R4 (2026-09-25, onay sonrası): C3'e tek istisna: 0009'un `tests/tasarim-kaynak.test.js` AC-18 testi kapsam dışı kopya olarak `Analiz.jsx`'te `const Chip` bulunmasını şart koşuyordu; 0014 bu borcu kapattığı için o satır, sözlüğün "Ödenen borç" bölümünü denetleyen bir satırla değiştirildi (C3). |

---

## Intent

Kullanıcı her ekranda farklı bir sekme tasarımı görüyor. Giderler'de gri zeminli segmentli
seçici, Evrak ve Stok'ta alt çizgili sekme, Müşteriler ve Bayiler'de dolu turuncu hap, Analiz
ve Finans'ta başka türlü tarih seçicileri var. Aynı işi yapan dört ayrı görünüm, uygulamanın
tek parça hissetmemesinin en görünür sebebi.

Başarı şu demek: uygulamadaki bütün sekme ve süzgeç çubukları aynı bileşenden geliyor;
kullanıcı hangi ekrana giderse gitsin aynı kontrolü görüyor ve seçim yaptığında aynı geri
bildirimi alıyor. Hiçbir süzgeç ne yaptığını değiştirmiyor.

---

## Requirements

- **R1.** Uygulamadaki bütün sekme ve süzgeç çubukları 0009'daki paylaşılan segmentli seçiciye geçer.
  Kapsam yedi ekran: Müşteriler, Bayiler, Stok, Finans, Evrak, Notlar, Analiz.
  **Süzgeç olmayan komşu denetimler çubuğa alınmaz:** Müşteriler'de süzgeç pillerinin yanında duran
  "Firmaya Göre Grupla" bağımsız bir aç/kapadır, tek seçimli gruba altıncı seçenek olarak sıkıştırılmaz;
  segmentin dışında kendi düğmesi olarak kalır ve davranışı değişmez.
  (R3, Z1) Süzgeç çubukları segmentin **düğme kipini** (`aria-pressed`, rol `button`) kullanır; radyo kipi mevcut testlerin
  düğme rolüyle yaptığı sorguları kırar. Bugün rolsüz olan çubuklara (Müşteriler, Bayiler, Finans, Notlar) `aria-pressed`
  eklenmesi bir erişilebilirlik eklemesidir, mevcut bir niteliği değiştirmez. (R3, Z5) Stok ekranının "Yedek Parça Satışı"
  alt sekmesindeki `Tümü (n)` / `Tahsisi eksik (n)` süzgeci de kapsamdadır ve sayı rozetini kullanır.
- **R2.** Sayı taşıyan süzgeçlerde (Müşteriler ve Bayiler) sayı korunur. Sayı gösterimi için sözlüğe
  **isteğe bağlı sayı rozeti** eklenir; ekrana özel bir varyant yazılmaz. **Bu, uygulamadaki tek sayaç
  çözümüdür:** sayıyı etiket metnine gömen geçici bir çözüm hiçbir ekranda yazılmaz (kapatılan 0010 bunu
  öneriyordu, kararı bu spec devraldı).
- **R3.** **Erişilebilir metin korunur.** Bugün süzgeç metni "Borçlu Firmalar (3)" biçiminde okunuyor.
  Sayı ayrı bir öğeye (rozet) taşındığında metin iki düğüme bölünür ve bugünkü tek düğümlü sorgular kırılır;
  bu yüzden yöntem burada sabitlenir: **rozet görseldir, düğmenin erişilebilir adı bütün metni taşır**
  ("Borçlu Firmalar (3)"). Ölçüt, düğmenin erişilebilir adının bugünkü metne birebir eşit olmasıdır.
- **R4.** İzne bağlı çubuklar bugünkü gibi çalışır: yetkisi olmayan kullanıcıya o seçenek hiç görünmez ve
  aktif seçim yasaklıysa izinli olan ilk seçeneğe düşülür. Bu kural Finans'ın tarih aralıklarında ve
  Notlar'ın süzgeçlerinde geçerli. **Notlar'da ayrıca mod kuralı vardır:** süzgeç çubuğu bugünkü gibi yalnız
  çoklu kullanıcı modunda görünür, tek kullanıcı modunda hiç çizilmez.
- **R5.** Seçim durumu korunur: dönüşüm sırasında seçili sekme, seçili süzgeç ve sayfa numarası sıfırlanmaz.
  **Dışarıdan gelen seçim de korunur:** Anasayfa'dan Stok'un "Yedek Parça Satışı" alt sekmesine gitmek gibi
  derin bağlantılar bugünkü gibi çalışır ve hedef sekme açılmış olarak gelir.
- **R6.** Alt sekmeler (Stok ve Evrak) de aynı bileşene geçer; alt çizgili görünüm uygulamada kalmaz.
  Bunlar **gezinme sekmesidir, tek seçimli süzgeç değil**; bu yüzden sözlüğe üçüncü bir kip eklenir
  (`sekme`: sekme listesi, sekme ve seçili sekme nitelikleriyle) ve alt sekmeler onu kullanır. Gezinmeyi
  radyo grubu olarak duyurmak ekran okuyucuda yanlış model kurar ve bugünkü davranışla da örtüşmez.
  (R3, Z4) Sekme kipi yalnız nitelikleri taşır; ok tuşuyla gezinme ve sekme paneli bağlantısı eklenmez (davranış
  değişikliği olurdu), sözlükte bilinen erişilebilirlik borcu olarak yazılır.
- **R7.** Analiz'in tarih ön ayarları ve Finans'ın tarih aralığı seçimi de aynı bileşenle çizilir.
  **Özel aralık seçildiğinde açılan tarih alanları segmentin içine alınmaz:** bugünkü yerinde, bugünkü
  davranışıyla kalırlar; segment yalnız seçimi yapar.
- **R8.** Süzgeçlerin **davranışı değişmez**: aynı seçim aynı kayıt kümesini getirir, sayılar aynı hesaplanır.
- **R9.** **Yerleşim de değişmez.** Paylaşılan seçici bugün düğmelerini eşit genişliğe yayıyor ve düğme
  metnini sarmıyor; bugünkü süzgeç pilleri ise içerik genişliğinde ve çubuk satır sarıyor. Beş uzun etiketli
  bir çubuğu eşit genişliğe yaymak dar pencerede taşmaya yol açar. Bu yüzden sözlüğe **içerik genişliği**
  seçeneği eklenir ve çok seçenekli süzgeç çubukları onu kullanır; eşit genişliğe yayılma, bugün öyle
  çalışan yerlerde kalır.

---

## Constraints

- **C1.** Davranış değişikliği yasak; bu iş yalnız kontrolü değiştirir.
- **C2.** Yeni yapı taşı gerekiyorsa **sözlüğe** eklenir; ekranda tek kullanımlık varyant yazılmaz. Bu işte
  sözlüğe üç ekleme yapılır ve üçü de `docs/tasarim-sozlugu.md`'ye yazılır: **sayı rozeti** (R2),
  **sekme kipi** (R6) ve **içerik genişliği seçeneği** (R9).
- **C3.** Mevcut arayüz testleri değiştirilmeden geçmelidir. Gate, dokunulan yedi ekranı kapsayan **bütün**
  mevcut testlerdir, seçilmiş bir alt küme değil. **Test dosyalarına dokunulmaz;
  `docs/evidence/kanit-eslemesi.json` veri dosyasına kayıt eklemek bu yasağın dışındadır ve zorunludur** (C6).
  (R4) **Tek istisna:** `tests/tasarim-kaynak.test.js`'in 0009 AC-18 testindeki `Analiz.jsx` `const Chip` satırı; bu iş o
  borcu bilerek kapattığı için satır, sözlüğün "Ödenen borç" bölümünde Chip'in yazılı olduğunu denetleyen bir satırla değişir.
- **C4.** Yeni bağımlılık, CSS framework, CSS module veya styled-components eklenmez.
- **C5.** Kullanıcıya görünen metinler Türkçedir ve değişmez.
- **C6.** **Kanıt altyapısı bu işin parçasıdır.** `tests/tasarim-kaynak.test.js`, sözlüğü kullanmaya başlayan
  her dosya için kanıt eşlemesinde kayıt, o kaydın ekranının görüntü aracında iki temada hatasız çizimi ve
  JPEG'inin depoda durmasını şart koşar. Dönüştürülen her ekran **görüntü aracına eklenir**
  (`scripts/evidence`); araç bugün 0009 önekine gömülü olduğu için **önek parametresi alacak biçimde
  genelleştirilir**, kopyalanmaz. Kayıtlar `beklenen: "degisti"` + `onay` ile açılır ve spec `done`'a
  taşınırken `ayni`ye çevrilir. Süzgeç metinleri üzerinden sorgulayan testler var;
  metin korunmazsa kırılırlar ve bu, davranışın değiştiğinin işaretidir.

### KAPSAM DIŞI

- **X1.** Servis ve Kargo Panosu'nun sütunları — *neden:* sekme değil, kanban sütunu; kendi görsel dili var.
- **X2.** Faaliyet Haritası'nın katman ve seviye seçimi — *neden:* harita kendi etkileşim modeline sahip.
- **X3.** Ayarlar'ın sol menüsü — *neden:* sekme değil, akordeonlu gezinme; kendi deseni tutarlı.
- **X4.** Tablo düzenleri, sütunlar ve satır görünümleri — *neden:* 0013'ün konusu.
- **X5.** Formların içindeki segmentli seçiciler — *neden:* zaten sözlükten geliyorlar.
- **X6.** Yeni süzgeç eklemek veya var olanı kaldırmak — *neden:* ürün kararı, görünüm işi değil.

---

## Context

Bugünkü durum, kodda doğrulanmış:

| Ekran | Bugünkü çubuk |
|---|---|
| Müşteriler | Dolu turuncu hap, metinde sayı: `Customers.jsx:470-486` (Hepsi, Garantisi Devam Eden, Garantisi Bitenler, Borçlu Firmalar, Seri No Bekleyen) |
| Bayiler | Aynı desenin ikinci kopyası: `SimpleDealers.jsx:351-354` (Tümü, Bayiler, Anlaşmalı Servisler, Borçlu) |
| Stok | Alt çizgili sekme: `Stock.jsx:55-56` (Makina, Parça, Yedek Parça Satışı, Üretim) |
| Evrak | Alt çizgili sekme: `Documents.jsx:847-848` (Teklif, Proforma, Fatura) |
| Finans | İzne bağlı tarih aralığı seçimi: `Finance.jsx:26-34` |
| Notlar | İzne bağlı iki süzgeç: `Notes.jsx:15-17` (Benim Notlarım, Tümü) |
| Analiz | Tarih ön ayarları: `Analiz.jsx:189-201` (Bu yıl, Son 12 ay, Tüm zamanlar, Özel) |

- **Hedef bileşen hazır.** Sözlükteki segmentli seçici (`src/components/tasarim.jsx`) iki görünüm ve iki
  kip destekliyor; Giderler ve Evrak'ın alıcı tipi seçimi zaten onu kullanıyor.
- **Sayı rozeti eksik.** Bileşen bugün yalnız etiket alıyor. Müşteriler ve Bayiler sayıyı etiketin içine
  gömüyor ("Hepsi (12)"). R2 ve R3 bunu sözlüğe taşırken metnin kaybolmamasını şart koşuyor.
- **İzin kuralı iki yerde var.** Finans'ın tarih aralıkları ve Notlar'ın süzgeçleri kullanıcı iznine bağlı;
  yetkisiz seçenek gizleniyor ve aktif seçim yasaklıysa izinli olana düşülüyor. Bu mantık çubuğun
  görünümünden bağımsız çalışmalı (R4).

Bilinen tuzaklar:

- **Metin kaybı.** Sayıyı rozete taşırken erişilebilir metin korunmazsa hem testler kırılır hem ekran
  okuyucu kullanıcısı sayıyı duyamaz.
- **Seçimin sıfırlanması.** Bileşen değişirken durum yukarı taşınırsa seçili süzgeç sıfırlanabilir; kullanıcı
  bunu "listem değişti" diye yaşar (R5).
- **İzin mantığının kopyalanması.** Çubuk değişirken izin süzmesi yanlışlıkla bileşenin içine taşınırsa iki
  ekranda iki ayrı kural doğar.

---

## Acceptance Criteria

- **AC-1.** Yedi ekranın hepsinde sekme ve süzgeç çubuğu aynı bileşenden gelir. Ölçüt gözle değil
  **kaynak taramasıyla** doğrulanır: bu yedi dosyada süzgeç veya sekme çizen yerel düğme blokları kalmaz ve
  `tasarim.jsx` dışında pil ya da alt çizgi stili tanımı bulunmaz (0009'un kaynak taraması testi deseni).
  (R3, Z6) İki istisna adıyla tutulur ve sözlükte bilinen borç olarak yazılır: Müşteriler'deki "Firmaya Göre Grupla"
  aç/kapa düğmesi (R1) ve Finans'taki tutar göster/gizle düğmesi; ikisi de süzgeç değildir.
- **AC-2.** Müşteriler'deki süzgeçler aynı adları ve aynı sayıları gösterir.
- **AC-3.** Bayiler'deki süzgeçler aynı adları ve aynı sayıları gösterir.
- **AC-4.** Sayı rozetine geçen bir süzgeç düğmesinin **erişilebilir adı** bugünkü metne birebir eşittir
  ("Borçlu Firmalar (3)"); bugünkü metinle eşleşen sorgular çalışmaya devam eder.
- **AC-5.** Bir süzgeç seçildiğinde dönen kayıt kümesi dönüşüm öncesiyle aynıdır (yedi ekranda da).
- **AC-6.** Finans'ta tarih aralığı yetkisi olmayan kullanıcıya o seçenek görünmez.
- **AC-7.** Aktif tarih aralığı yetkisi kaldırılmış bir kullanıcıda ekran izinli ilk aralığa düşer; hiç
  tarih aralığı izni olmayan kullanıcıda bugünkü gibi "Bu Ay" seçili gelir.
- **AC-8.** Notlar'daki süzgeçler izin kuralına bugünkü gibi uyar.
- **AC-9.** Stok'un alt sekmeleri aynı sekmeleri aynı sırayla gösterir ve seçim davranışı değişmez.
- **AC-10.** Evrak'ın teklif, proforma ve fatura sekmeleri aynı biçimde çalışır.
- **AC-11.** Analiz'in tarih ön ayarları aynı aralıkları üretir.
- **AC-12.** Sekme veya süzgeç değiştirildiğinde sayfa numarası bugünkü davranışını sürdürür.
- **AC-13.** Karanlık temada seçili ve seçili olmayan öğeler ayırt edilebilir; doğrulama 0009'un yöntemiyle
  yapılır (aynı pencere boyutunda, iki temada önce ve sonra görüntüsü; kararı Takım Yöneticisi verir).
- **AC-14.** Mevcut arayüz testleri değiştirilmeden geçer.
- **AC-15.** Müşteriler'deki "Firmaya Göre Grupla" düğmesi segmentin dışında ayrı bir düğme olarak durur ve
  açma/kapama davranışı bugünkü gibidir.
- **AC-16.** Stok ve Evrak'ın alt sekmeleri sekme kipiyle çizilir: sekme listesi, sekme ve seçili sekme
  nitelikleri taşır; radyo grubu olarak duyurulmaz.
- **AC-17.** Çok seçenekli süzgeç çubukları içerik genişliğiyle çizilir ve dar pencerede bugünkü gibi satır
  sarar; düğmeler tam genişliğe yayılmaz.
- **AC-18.** Anasayfa'dan Stok'un "Yedek Parça Satışı" alt sekmesine gitmek gibi derin bağlantılar bugünkü
  gibi çalışır ve hedef sekme açılmış gelir.
- **AC-19.** Tek kullanıcı modunda Notlar'da süzgeç çubuğu hiç çizilmez; çoklu kullanıcı modunda bugünkü
  gibi görünür.
- **AC-20.** Analiz'de "Özel", Finans'ta "Özel Tarih" seçildiğinde tarih alanları bugünkü yerinde ve
  davranışıyla açılır; segmentin içine alınmaz.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Sözlüğe üç ekleme yapıldı (sayı rozeti, sekme kipi, içerik genişliği seçeneği) ve
      `docs/tasarim-sozlugu.md` üçü için de ne zaman kullanılır / kullanılmaz kuralıyla güncellendi (C2).
- [ ] Yedi ekranda da eski çubuk kodu kaldırıldı; bu, gözle değil **kaynak taraması testiyle** gösterildi
      (AC-1).
- [ ] Mevcut test dosyalarına dokunulmadı (C3).
- [ ] Görüntü aracı önek parametresi alacak biçimde genelleştirildi (R3, Z10: 0011'de birleştirme betiğine eklendi;
      dosyalar yeniden adlandırılmaz) ve yedi ekran ona eklendi; üretilecek
      ekran anahtarları: `musteriler-liste`, `bayiler-liste`, `stok-alt-sekme`, `evrak-sekme`,
      `finans-aralik`, `notlar-suzgec`, `analiz-onayar`. Sözlüğü kullanmaya başlayan her dosya için
      `kanit-eslemesi.json`'a kayıt eklendi (C6).
- [ ] Yedi ekranın önce ve sonra görüntüleri eklendi (yan yana küçültülmüş JPEG artı
      `<önek>-piksel-raporu.json`), aydınlık ve karanlık tema.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 1 | R4 (onay sonrası): C3'e ikinci istisna. 0009'un kaynak testi `Analiz.jsx`'te `Chip` kopyasının **var olmasını** şart koşuyordu; bu iş o borcu kapattığı için satır sözlüğün "Ödenen borç" bölümünü denetleyecek şekilde değişti. R3 plan turunda, onayla eş zamanlıydı, sayılmaz. |
| **Düzeltme turu sayısı** | 0 | İş geri dönmedi. Uygulama sırasında plandaki Z2 yöntemi düzeltildi (erişilebilir ad `aria-label` ile sabitlendi; tam metinli `getByText` rozet yüzünden eşleşmez) ve plana yazıldı; kullanıcıya dönülmeden kapandı. |
| **Bulgu gerçek/gürültü oranı** | 0 / 0 | Gözden geçirme turu olmadı. Uygulama içinde kendiliğinden bulunan iki nokta (Z2'nin iki ayrıntısı) ve ilgisiz bir tarih bombası (`makina-odeme.test.js`) plana yazıldı. |
| **Regresyon sayısı** | 0 | 25 davranış testi dönüşümden önce eski kodda yeşil yazıldı ve sonra da yeşil; mevcut testler (R4 istisnası dışında) değişmeden geçti; değişmemesi gereken 49 ekran iki temada 0 piksel fark. Son durum: 192 dosya, 2049 test (tek kırmızı işten bağımsız tarih bombası), lint 0 hata. |
| **Kaçan hata** | 0 | Henüz gerçek kullanımda bulunan yok. |

**Bu spec'ten çıkarılan ders:** Görünümü bilerek değiştiren bir işte piksel karşılaştırması davranışı kanıtlayamaz; kanıtı
**önce eski koda yazılıp yeşil geçen** davranış testleri verdi, üstelik rolden bağımsız sorgulandıkları için sekmelerin
`button`'dan `tab`'a geçişinde de ayakta kaldılar. İkinci ders: bir testin "bu borç hâlâ duruyor" diye doğrulaması (0009'un
`Chip` satırı) borcu kapatan işi kilitledi; borç listeleri testle **var olduğu** için değil, **yazılı olduğu** için
denetlenmeli. Üçüncüsü: erişilebilirlik ve metin sorgusu aynı şey değil; `getByText` yalnız öğenin kendi metin düğümlerine
bakar, sayıyı ayrı öğeye taşıyan her tasarım bunu kırar. Son olarak AC-11c'nin "yeni görünüm taban alınır" kuralının
somut hâli burada kuruldu: onaylı "sonra" görüntülerini taban alan `<spec>-taban` raporu.
