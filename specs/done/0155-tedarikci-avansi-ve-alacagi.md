# 0155 — Tedarikçiden alacak: fazla ödeme, avans ve mahsup

| | |
|---|---|
| **Durum** | Tamamlandı (commit `9eb0577f`, 2026-11-23) |
| **Sahip** | Analist (yazım) |
| **Onaylayan** | Takım Yöneticisi |
| **Revizyon** | 3 (2026-11-23 plan turu: P1–P10; plan `specs/0155-uygulama-plani.md`) |
| **Etkilenen alanlar** | Kasa (hareket listesi, yeni Tedarikçi avansları bölümü, bakiye, hesapsız liste, hesap taşıma), Giderler (Tedarikler ve Ekstre, borç özeti, ödeme penceresi), ekstre penceresi (`EkstrePenceresi.jsx`, 0156 ile yeniden yazıldı), saf motorlar `kasa.js` / `gider.js` / `doviz.js` / `odemeYontemi.js`, Aylık Gider ve Kasa Raporu (`giderRaporu.js`), `copKutusu.js`, `merge.js`, `kilitAlanlari.js`, `hesap_hareketleri` tablosu |
| **Bağımlı spec'ler** | 0024 (avans ve mahsup), 0151 (hareketin yönü), 0152 (döviz alanları), 0153 (iki eksen ve donmuş kur), 0073 (hareket düzenleme), 0078 (çöp kutusu), 0156 (ekstre ayrıntısı ve satır anahtarı), 0058 (işlem geçmişinde satırın adı), 0083 (Kasa bölüm sırası), 0064 (kilit alanları), 0140 (tedarikçi silme koruması), 0047 (rapor kutuları), 0056 (hesap taşıma) |
| **QA turu** | 2026-11-23: 31 bulgu (5 Bloklayıcı / 12 Önemli / 14 Küçük), hepsi onaylandı |
| **Düzeltilen iddialar** | 4 (C5'in izin ölçümü, R12'nin sınırı, C3'ün kur kuralı, AC-32'nin satır ibaresi) |

---

## Intent

Bir tedarikçi fabrikaya fazla hesap çıkardı, fatura o fazla tutarla kaydedilip tam ödendi ve fark sonradan anlaşıldı: bugün o firmadan yaklaşık 5.000 dolar alacağımız var. Uygulama bu durumu hiçbir biçimde taşıyamıyor. Fazla ödeme üç yerde reddediliyor, tedarikçi ekstresi yalnız borç ve ödeme satırı üretiyor, borç özeti yalnız kalanı sıfırdan büyük hedefleri topluyor; yani "bu firmaya borcumuz yok, tersine alacağımız var" cümlesi hiçbir ekranda yazılamıyor ve muhasebe bunu kayıt dışında, kendi notunda izliyor. Bu iş bittiğinde tedarikçiye verilen ya da fazla ödenen para bir kayıt olacak: Kasa'dan tedarikçi avansı girilecek, bakiye o parayı düşecek, Tedarikler listesinde ve tedarikçi ekstresinde alacak olarak görünecek, sonraki faturadan mahsup edilerek ya da tedarikçi parayı geri gönderince kapanacak. Dolar ödenen avans dolar olarak izlenecek, yani "5.000 dolarımız var" sorusu kendi para biriminde cevaplanacak.

İki ölçüm bu işin biçimini belirledi. Açık avans tek bir rakam değil, **para birimi başına** bir rakamdır (bir tedarikçide aynı anda hem dolar hem lira avansı durabilir) ve iki eksen avansın değil **hareketin kendi kurundan** bağlanır; böylece toplamın kuru diye tanımsız bir büyüklük aranmaz. Mahsup da kalemin yalnız ana hedefini (tedarikçiye ya da kiraya verene giden kısmı) kapatır, vergi dairesine giden stopaj ve tevkifat hedeflerine dokunmaz.

---

## Requirements

### A. Avans kaydı

- **R1.** Tedarikçiye verilen ya da fazla ödenen para `avans` hareketi olarak kaydedilir; hareket çalışan yerine **tedarikçi** taşır. Yeni hareket türü açılmaz.
- **R1/2.** Avansın silme ve düzenleme sınırı tedarikçi tarafı için kendi fonksiyonlarıyla yazılır (bugünkü `avansSilinebilirMi` ve `avansDuzenlenebilirMi` çalışan kardeşleridir ve `yon` ile para birimini okumaz): sınır **para birimi kovası içinde** ve mahsup artı giren toplamına göre hesaplanır. Giren yönlü avansın silinmesi serbesttir (açık avansı artırır); düzenlemesi açık avansı eksiye düşürüyorsa reddedilir.
- **R1/3.** Kasa'nın hareket listesi avans satırında tarafa göre dallanır: satırın metni, kilidi, düzenleme formu, silme denetimi ve işlem geçmişi adı tedarikçi avansında tedarikçi yolunu izler. Bugün beşi de çalışan varsayıyor (tedarikçi avansı "Silinmiş çalışan" görünür, kilit alınmaz ve düzenleme çalışan formunu açar).
- **R2.** Avans Kasa ekranından girilir: tedarikçi, tarih, tutar, hesap (isteğe bağlı), yöntem ve açıklama. Çöpteki tedarikçiye avans verilemez.
- **R3.** Hesap seçilirse avans o hesaptan çıkar ve bakiyeyi azaltır; hesapsız avans hiçbir bakiyeye girmez ve Kasa'nın hesabı belirtilmemiş kayıtlar listesinde görünür (bugünkü avans kuralı aynen).
- **R3/2.** Bakiye motorunun avans kolu iki yerden düzeltilir: tutar **hesaptan çıkan** okuyucusundan alınır (döviz avansta hesabın para birimindeki tutar; bugün lira tutarı okunuyor) ve yön `yon` alanından gelir. `yon` yazılmamış ya da tanınmayan avans **çıkan** sayılır; 0151'in düzeltme kolundan bilinçli sapmadır, çünkü var olan avans kayıtlarının hiçbirinde alan yoktur ve onlar bakiyeden düşmelidir.
- **R4.** Avans hareketi ya tedarikçi ya çalışan taşır, ikisini birlikte taşımaz.
- **R5.** Tedarikçi avansı TL hesaptan da döviz hesaptan da verilebilir. Bugünkü "Avans yalnız TL hesaptan verilir" kuralı çalışan avansı için aynen kalır.

### B. Mahsup

- **R6.** Açık avans, aynı tedarikçinin bir gider kalemine mahsup edilerek kapanır. Mahsup hesapsızdır, hiçbir bakiyeye girmez ve kalemin kalanını düşürür (bugünkü mahsup kuralı).
- **R7.** Mahsup yalnız o avansın tedarikçisine ait kaleme yapılır; tedarikçisi seçilmemiş kaleme, başka tedarikçinin kalemine, personel ve SGK kalemine yapılamaz, nedeni yazılır.
- **R7/2.** Mahsup kalemin yalnız **ana hedefini** kapatır (tedarikçiye, kirada kiraya verene giden kısım); stopaj ve tevkifat hedefine mahsup yapılamaz ve taksit seçicisi yalnız ana hedefin taksitlerini listeler. Bugünkü çalışan yolu hedefi `DAVRANIS.PERSONEL` ile sabitlediği için kural yazılı değildi.
- **R7/3.** Çöpteki tedarikçinin kalemine mahsup yapılamaz (kalem canlı olsa bile), nedeni yazılır. R2'nin çöp kuralının mahsup tarafıdır.
- **R7/4.** Mahsup, borç özeti ile ekstrenin kapsamındaki kaleme yapılır: gider tarihi bugünden sonra olan ya da yürürlük ayından önceki kaleme mahsup reddedilir, nedeni yazılır (çalışan tarafındaki bugünkü kuralın tedarikçi dilindeki ikizi).
- **R8.** Mahsup sınırı iki rakamın küçüğüdür: kalemin (taksitliyse taksidin) kalanı ve açık avans tutarı. Taksitli kalemde mahsup bir taksite bağlanır.
- **R8/2.** Mahsup alanının birimi **kalemin para birimidir** (döviz kalemde döviz, lira kalemde lira); açık avans ve iki sınır o birime çevrilerek gösterilir, etiket ile ipucu para birimini yazar. Bugünkü varsayılan kalemin lira kalanı ile açık avansı doğrudan karşılaştırıyor; döviz avansta iki ayrı birim karışır ve sessizce yanlış varsayılan doğar.
- **R9.** Mahsup, ödeme penceresinin bugünkü "Avanstan mahsup" kipinden girilir; kip, kalemin tedarikçisinin açık avansı varsa açılır.
- **R9/2.** Mahsup kipinin kilidi kalemin tarafına göre seçilir (çalışan kaleminde çalışan, tedarikçi kaleminde tedarikçi alanı) ve kilit çakışması metni iki ayrı sabittir; bugünkü tek metin "Bu çalışanın avansı" diyor.
- **R10.** Mahsup edilen kalem çöpe atılırsa o mahsup açık avansı azaltmaz (bugünkü çalışan kuralı).

### C. Geri ödeme

- **R11.** Tedarikçi parayı geri gönderirse aynı `avans` türüne **giren** yönlü bir hareket girilir; hesaba para girer, açık avans azalır. Yeni tür açılmaz, 0151'in yön alanı kullanılır.
- **R11/2.** Giren yönlü avansta hesap **zorunludur**; hesapsız bırakılırsa reddedilir ve nedeni yazılır. Hesapsız geri ödeme açık avansı azaltır ama para hiçbir bakiyede görünmez.
- **R12.** Giren yönlü avans **açık avanstan** fazla olamaz (açık avans = çıkan toplamı eksi mahsuplar eksi girenler); fazlası reddedilir, nedeni açık avansı yazar. Sınır çıkan toplamı değildir: mahsup edilmiş bir avansın ayrıca geri ödenmesi açık avansı eksiye düşürür ve "alacak" kavramını tersine çevirirdi (X3 ile aynı sınıf bir hâl).
- **R13.** Kısmi geri ödeme serbesttir: kalan açık avans mahsup edilmeye devam eder.

### D. Görünürlük

- **R14.** Kasa'da "Çalışan avansları"nın yanında **"Tedarikçi avansları"** bölümü olur: tedarikçi başına açık avans, hareket listesi ve ekstre düğmesi.
- **R14/2.** Bölümün yeri Çalışan avanslarından sonra, hesabı belirtilmemiş kayıtlar bloğunun önündedir (0083'ün Kasa sırası kararı korunur).
- **R15.** Tedarikçi ekstresi iki yönlü olur: borç, ödeme, avans (alacak doğurur), mahsup (borçla alacağı birlikte kapatır) ve geri ödeme satırları; son bakiye artı ise borcumuzu, eksi ise alacağımızı gösterir.
- **R15/2.** Mahsup **kendi satır türüyle** ve net etkisi sıfır olarak yazılır (çalışan ekstresinin ikizi). Bugün tedarikçi ekstresi ana hedefe düşen her hareket payını koşulsuz ödeme satırı yazıyor; mahsup doğduğu an avans satırı alacağı, mahsup satırı borcu bir kez daha düşürür ve bakiye çift sayar.
- **R15/3.** Son bakiyenin değişmezi yazılıdır ve çapraz testle sabitlenir: tedarikçi ekstresinin son bakiyesi = borç özetindeki o tedarikçinin satırı **eksi** o tedarikçinin açık avansı (çalışan tarafının bugünkü denklemiyle aynı). Bakiye sütununun başlığı, anlamı net olduğu için çalışan ekstresindeki gibi "Net bakiye" olur.
- **R15/4.** Geri ödeme satırı kendi satır türünü ve adını taşır ("Avans geri ödemesi"); hareketin türü yine `avans`'tır. Ekstre penceresinin işlem adı eşlemesi ve tıklanabilir satır kümesi satırın türüne baktığı için iki yön aynı türde kalırsa ikisi de "Avans" yazar.
- **R15/5.** Tedarikçi ekstresinin özetinde açık avans satırı çizilir ve bakiye etiketi iki yönlüdür ("Tedarikçiye borcumuz" / "Tedarikçiden alacağımız"); ipucu mahsubun net etkisizliğini söyler. Üçü de pencerenin tek metin bloğundadır (C12); bugün üçü yalnız çalışan dalında var.
- **R15/6.** Döviz avansın satır ayrıntısı hesaptan çıkan dövizi ve kuru yazar; bugünkü ayrıntı bu iki satırı yalnız ödeme satırında çiziyor.
- **R15/7.** "Kalemde göster" düğmesi mahsup satırında da çizilir (satırın kalemi vardır, yönlendirme borç ve ödeme satırındakiyle aynıdır).
- **R15/8.** Tedarikçi ekstresinden avans silinebilir (`avans` izni); çalışan ekstresinin bugünkü yolu korunur, ikinci bir silme yolu açılmaz.
- **R16.** Tedarikler listesinde açık avansı olan tedarikçinin satırı alacağı yazar.
- **R16/2.** Alacak yeni sütun açmaz: "Açık borç" hücresinin altında kendi satırında yazılır ve verisi **dönem raporundan değil** açık avans okuyucusundan gelir (listeye prop olarak iner). Bugünkü açık borç hücresi dönem nesnesinden okunuyor, açık avans ise dönemden bağımsızdır; iki rakamı aynı hücrede toplamak da R17 ile X4'ün yasakladığı netleşme olurdu.
- **R17.** "Tedarikçilere açık borç" kartı **netleşmez**: bugünkü anlamını (borcumuz) korur. Alacak kendi satırında ve kendi kutusunda görünür; borç özetinde tedarikçi satırları alacakla azaltılmaz.
- **R17/2.** Borç özetine alacak satırı **eklenmez**: borç özeti yalnız kalanı sıfırdan büyük hedefler için satır doğurur ve çıktısı kart, hatırlatıcı ile 0047 raporunun ortak girdisidir; yeni satır türü altını ve kartın anlamını kazara değiştirir. R17 ile AC-32'nin "kendi satırı" ibaresi Tedarikler listesini (R16/2) gösterir.
- **R18.** Açık avans ödeme hatırlatıcısına, açık kalemler ekranına ve yaşlandırmaya girmez (bunlar borç listeleridir).
- **R19.** Aylık Gider ve Kasa Raporu'nda "KASA · AÇIK TEDARİKÇİ AVANSI" kutusu olur: açık avans toplamı, ay içinde verilen ve ay içinde mahsup edilen (çalışan avansı kutusunun ikizi).
- **R19/2.** Hareket özeti avansı **taraf** (çalışan / tedarikçi) ve **yön** (giren / çıkan) kırılımıyla döndürür; yeni anahtarlar yalnız varken yazılır (0151'in düzeltme deseni). Rapor iki kutuyu ayrı besler, hesabı belirtilmemiş kayıtlar listesinde iki toplu satır olur ve HAREKETLER tablosunun avans satırı giren ile çıkanı ayrı yazar. Ayrışma yazılmazsa tedarikçi avansı bugünkü çalışan kutusunu ve toplu satırını yanlışlar (regresyon) ve giren yönlü hareket toplamı şişirir.
- **R19/3.** Kutu yalnız üç toplamı yazar ve toplamlar **para birimi başına** satırdır; tedarikçi kırılımı basılmaz (çalışan kutusuyla simetri, C8).
- **R20.** Çöp kutusunda tedarikçi avansı satırı tedarikçinin adını yazar.
- **R20/2.** Bu madde 0078 R24'ü ve 0058 R21'i bu iş için **açıkça ters çevirir**: tedarikçi adı gizlilik kuralı değildir, çalışan adı yasağı yerinde kalır. Ad yalnız **avans** satırında yazılır; ödeme satırı bugünkü gibi adsız kalır.
- **R20/3.** İşlem geçmişinde tedarikçi avansı bugünkü avans kayıt türünü kullanır, yeni kayıt türü açılmaz (etiket haritası değişmez).
- **R21.** Avans gider değildir: dönem raporu, gider toplamı, KDV, kova, makina maliyeti ve parti payları etkilenmez.

### E. Döviz

- **R22.** Döviz hesaptan verilen avans iki eksen taşır: hesaptan çıkan döviz tutar ve ödeme günü kuruyla donmuş lira karşılığı. Kur kayıtta donar, 0152'nin hareket alanları kullanılır, yeni alan açılmaz.
- **R22/2.** "Bu hareket dövizdir" yüklemi hareket türünden bağımsız hâle gelir ve dört yer onu okur: çöp kutusu etiketi, işlem geçmişi ayrıntısı, Kasa hareket listesinin açıklama ibaresi ve hesap taşıma planının "hesapsız bırakılamaz" koruması. Bugünkü yüklem yalnız ödeme türünü tanıyor, yani döviz avans dört yerde de lira sanılır; eski adın 0152 taramalarında geçtiği için o ad yeniden dışa verilir.
- **R23.** Döviz avansın açık kalanı **döviz** cinsinden ölçülür; lira karşılığı bilgidir. TL avansın kalanı liradır.
- **R23/2.** Açık avansın tek okuyucusu bu yüzden **para birimi kovası** döndürür: tedarikçi başına, para birimi başına verilen, mahsup edilen, geri ödenen ve açık kalan. Bir tedarikçide aynı anda dolar ve lira avansı durabilir; tek rakam döndüren bir okuyucu R16, R19, AC-17 ve AC-22'nin hepsinde yanlış birim yazardı.
- **R24.** Döviz avanstan döviz kaleme mahsupta mahsubun döviz tutarı avanstan düşer, kalemi kapatan lira tutarı kalemin donmuş kurundan hesaplanır, ikinci kur sorulmaz.
- **R25.** Döviz avanstan **lira** kaleme mahsupta kullanıcı **avansın para biriminde** tutar girer ve kalemi kapatan lira tutar için **kur sorulur**: öneri o günün kurudur, elle değiştirilebilir ve mahsup kaydında donar (0152'nin döviz ödeme deseni). Avansın döviz ekseninden girilen döviz tutar düşer, kalemin lira kalanından türetilen lira tutar düşer. Kur avansın değil **hareketin kendi kurudur**: açık avans bir toplamdır ve iki ayrı kurla girilmiş iki avansın tek kuru yoktur, o yüzden "avansın donmuş kuru" tanımsız bir büyüklüktür. Alternatifleri (mahsubu bir avansa bağlayan yeni alan ya da FIFO ile mahsubu iki kura bölmek) C6'yı bozar.
- **R26.** Kur farkı hiçbir yere yazılmaz: döviz avansın döviz kalanı sıfırlanınca avans kapanmış sayılır, lira ekseninde kalan fark alacak olarak durmaz ve gider ya da gelir doğurmaz.
- **R27.** Döviz avansın geri ödemesi aynı para biriminde ve aynı para birimindeki hesaba yapılır.
- **R27/2.** Hesap taşıma planı döviz avansı hesapsız bırakmaz (döviz ödemenin bugünkü korumasının eşi, R22/2 ile gelir); hedef hesabın aynı para biriminde olması bugünkü kuralla sağlanır.
- **R28.** TL avans yalnız lira kaleme, döviz avans yalnız kendi para birimindeki ya da lira kaleme mahsup edilir; iki farklı döviz birbirine mahsup edilemez, nedeni yazılır.

---

## Constraints

### Uyulması zorunlu

- **C1.** Hesap saf motorlarda: avans ve mahsup doğrulaması ile açık avans hesabı `kasa.js`'te, borç özetinin ve ekstrenin kapsamı bugünkü tek kurallarını kullanır; ekranlar tutar hesaplamaz, çevrim yazmaz.
- **C2.** Açık avansın tek okuma yolu olur (bugünkü `avansBorclari`'nın tedarikçi kardeşi); ikinci bir toplama yazılmaz ve mahsup sınırı, Kasa bölümü, Tedarikler satırı, ekstre ile rapor hepsi onu okur.
- **C2/2.** Okuyucunun dönüşü para birimi kovasıdır (R23/2) ve çağıranlar birimi kendileri türetmez; kovaları toplayan ikinci bir rakam hiçbir ekranda yazılmaz.
- **C3.** İki eksen **hareketin kendi kuruyla** bağlanır: döviz kaleme mahsupta kalemin donmuş kuru (R24), lira kaleme mahsupta mahsubun kendi kuru (R25). Avansın kuru hiçbir yerde okunmaz (açık avans bir toplamdır, tek kuru yoktur); kur okuması ile çevrim tek yerden yapılır, ekranlar çarpım yazmaz.
- **C4.** Kalandan fazla ödeme reddi kalkmaz: fazla ödeme kaleme değil avansa yazılır (üç redden hiçbiri gevşetilmez).
- **C5.** Yeni hareket türü yok (`avans` ve `mahsup` kullanılır), yeni eylem izni yok (avans `avans` iznini ve **Kasa sekmesi önkoşulunu** ister, mahsup `gider_odeme` iznini ister ve **Kasa sekmesi istemez**: mahsup Giderler'de kalır, çünkü gider formundan ve ödeme penceresinden de yazılır), yeni veri bölümü yok.
- **C6.** Yeni kalıcı alan yalnız hareketin `tedarikciId`'sidir ve dört nokta kuralıyla eklenir; boş değer kayıt gövdesine yazılmaz. Döviz alanları ve yön alanı var olanlardır.
- **C7.** Göç yok: var olan avans ve mahsup kayıtları çalışan avansı olarak kalır, hiçbiri tedarikçiye bağlanmaz.
- **C8.** Çalışan avansının bugünkü davranışı birebir korunur (TL şartı, personel kalemine mahsup kuralı, SGK reddi, silme koruması, ekstre, rapor kutusu); kıyas altınıyla gösterilir.
- **C8/2.** Kıyas son spec'lerin desenini izler: ortak veri dosyası (`tests/fixtures/0155-veri.js`) artı spec öncesi kodla üretilmiş altın (`0155-once.json`); ayıklama gerekmiyorsa ayıklama dosyası yazılmaz.
- **C9.** Gider motorunun kuruş ekseni değişmez: avans ve mahsup kalemin tutarını, KDV'sini, kovasını ve maliyetini etkilemez.
- **C10.** Tedarikçi avansı tedarikçinin kullanımıdır: açık avansı ya da avans hareketi olan tedarikçi çöpe atılırken bu yazılır ve kalıcı silme bugünkü korumalarla tutarlı davranır.
- **C10/2.** Kuralın iki yarısı ayrı ayrı yazılıdır: böyle bir tedarikçi **çöpe atılabilir** (onay bunu yazar) ama **kalıcı silinemez** (0140'ın Ana tedarikçi koruması deseni: düğme kalır, satırda neden yazar). Çöpteki tedarikçinin ekstresine erişilmediği için avansı Kasa'nın Tedarikçi avansları bölümünde "silinmiş" rozetiyle listelenir (çalışan tarafının C8 deseni). Kalıcı silme serbest bırakılırsa hareket yetim kalır ve alacak hiçbir ekranda görünmez.
- **C11.** Birleştirmede hareketin `tedarikciId`'si yeniden atanan tedarikçi kimliğini izler.
- **C12.** Kullanıcıya görünen bütün metinler Türkçe ve tek yerde sabit.
- **C13.** Kilit envanteri güncellenir: yeni Tedarikçi avansları penceresi ile mahsup kipini çizen ödeme girişi, kilit alanları listesinin `tedarikci` alanının pencere listesine eklenir. Liste iki yönlü taranıyor, yazılmayan yeni pencere testi düşürür.

### KAPSAM DIŞI

- **X1.** Kambiyo kârı ve zararı — *neden:* kur farkı hiçbir yere yazılmaz (R26), kambiyo kavramı uygulamada hiç yok ve kendi türü, KDV'sizliği, raporu ve otomatik kalem üretimini gerektirir.
- **X2.** Eksi tutarlı gider kalemi ve tedarikçi iade faturası — *neden:* motorun "tutar sıfırdan büyük olmalı" kuralı KDV, kova, rapor ve maliyet zincirinin tamamında varsayım; alacak hareketle taşınıyor.
- **X3.** Kalemin kalanının eksiye düşmesi — *neden:* borç, hatırlatıcı, yaşlandırma ve rapor kalanın pozitif olduğunu varsayıyor.
- **X4.** Borç kartının ve raporun netleşmesi — *neden:* Takım Yöneticisi kararı, kartın bugünkü anlamı korunur.
- **X5.** Ödeme penceresinde "fazlasını avansa çevir" kolaylığı — *neden:* düzeltme tek seferlik; kolaylık ayrı iş.
- **X6.** İki farklı döviz arasında mahsup ve avansın para biriminin sonradan değişmesi — *neden:* iki kur karışır, bozdurma yolu var.
- **X7.** Müşteri tarafı (müşteriden fazla tahsilat) — *neden:* ayrı kavram, tahsilat ve çek zinciri kendi kurallarını taşıyor.
- **X8.** Açık avansın hatırlatıcıda ya da yaşlandırmada görünmesi — *neden:* ikisi borç listesi (R18).
- **X9.** Genel aramada tedarikçi avansı — *neden:* arama hareketleri hiç aramıyor, ayrı iş.
- **X10.** Tedarikçi avansının çalışan avansıyla aynı listede toplanması — *neden:* iki kavram ayrı bölümde durur, gizlilik kuralları farklı (çalışan tutarları çıktıya girmez).
- **X11.** Mahsubun ya da geri ödemenin bir avans hareketine bağlanması (bağ alanı, FIFO tahsisi) — *neden:* R25 kararıyla kur hareketin kendisinden okunuyor; bağ alanı C6'nın "tek yeni alan" kuralını bozar ve FIFO iki kurlu mahsubu ikiye bölmeyi gerektirir.
- **X12.** Borç özetine alacak satırı eklenmesi — *neden:* R17/2; borç özetinin çıktısı kart, hatırlatıcı ve raporun ortak girdisi, yeni satır türü altını ve kartın anlamını değiştirir.
- **X13.** Rapor kutusunun tedarikçi kırılımı — *neden:* R19/3; çalışan kutusuyla simetri korunur, kırılım ayrı gizlilik tartışması açar.

---

## Context

Bugünkü davranış ve dayanaklar (hepsi kodda ölçüldü):

- **Fazla ödeme bugün üç yerde reddediliyor:** `kasa.js:504` TL kalanda, `:539` döviz kalanda, `:815` mahsupta; üçü de "Kalandan fazla ödeme kaydedilemez" diyor. Yani bu durum sisteme hiç girmemiştir, kaydın şişik olması tek yoldur.
- **Tedarikçi ekstresi tek yönlü:** `kasa.js` `tedarikciEkstresi` yalnız `tur: "borc"` ve `tur: "odeme"` satırı üretiyor, borç özeti ise `if (o <= 0) continue` ile kalanı sıfır olan hedefi atıyor (`gider.js` `borcOzeti`). Alacak hiçbir motorda yok.
- **Çalışan tarafı tam bir emsal:** `calisanEkstresi` kodda "+ çalışana borcumuz, − çalışandan alacağımız" diye yazılı, avans alacak doğuruyor, mahsup ikisini birlikte kapatıyor; `avansBorclari` çalışan başına verilen eksi mahsup hesaplıyor ve mahsubu çöpteki kaleme bağlıysa saymıyor. Bu işin tamamı o desenin tedarikçi ikizidir.
- **Değiştirilecek kurallar tek satırda:** TL şartı `kasa.js:786`'daki `hesapHatasi`'nın içinde ("Avans yalnız TL hesaptan verilir") ve o fonksiyon **yalnız `avansDogrula` tarafından** çağrılıyor; "Avans yalnız personel kalemine mahsup edilir" reddi `mahsupDogrula`'nın başında.
- **Sunucu ve izin hazır, ama önkoşul yalnız avansta:** `serverAuth.cjs` `hareketIzni` avans hareketini `avans` iznine, mahsubu `gider_odeme`'ye bağlıyor ve `KASA_SEKMELI_HAREKETLER` kümesi yalnız virman, avans ve düzeltmeyi içeriyor. Yani avans Kasa sekmesi ister, **mahsup istemez** (0024 R8, 0052 R21: mahsup gider formundan da yazılır). C5'in "ikisi de Kasa sekmesi önkoşuluyla" ölçümü bu turda düzeltildi. Yeni izin kimliği ve yeni sunucu kuralı gerekmiyor.
- **Veri alanları hazır:** `hesap_hareketleri` bugün `yon` (0151) ve beş döviz alanını (0152: `dovizTutar`, `kur`, `paraBirimi`, `karsiTutar`, `karsiParaBirimi`) taşıyor; `calisanId` var, `tedarikciId` yok. Yani tek yeni sütun `tedarikciId`.
- **Çöp kutusu hazır:** `copKutusu.js:19` `HAREKET_COP_TUR.avans = "Avans"` ve `hareketCopEtiketi` kayıttaki para birimini okuyor (0152).
- **Canlı veride ölçülenler (2026-11-22):** 37 tedarikçi, 169 canlı gider kalemi, **hiç döviz gider kalemi yok** (0153 bir gün önce yayınlandı), 1 döviz ödeme hareketi, 11 avans ve 5 mahsup kaydı (hepsi çalışan). Yani tedarikçi avansı sıfırdan doğacak ve çalışan avansı yolu fabrikada kullanılıyor, desen tanıdık.
- **Bugünkü şişik kaydın düzeltme yolu (bu iş bittikten sonra, tek seferlik):** kalemin tutarı gerçek fatura tutarına indirilir, o kalemi kapatan ödeme hareketi düzenlenip tutarı gerçek tutara çekilir (0073 hareket düzenlemesi) ve aradaki fark aynı hesaba, aynı tarihe tedarikçi avansı olarak girilir. Kasadan çıkan toplam para değişmez, gider ve KDV gerçeğe döner, fark alacak olarak görünür. Ödeme döviz hesaptan yapıldıysa avans da aynı dövizle girilir ve kuru o günün kuru olur.
- **Bilinen tuzaklar:**
  - **Kalem tutarını indirmek fazla ödeme bırakır.** Motor bu hâli zaten biliyor: `odemeYontemi.hareketPaylari` "tutarlar toplamı motorun kapanan tutarını tutmuyorsa" (kalem tutarı ödemeden sonra düşürülmüş, fazla ödeme) motoru sırayla yeniden çalıştırıyor. Düzeltme sırasında kalem bir süre fazla ödenmiş görünür; sıra kalem, sonra ödeme, sonra avanstır.
  - **Avansın iki ekseni ayrışabilir.** Döviz avansın lira karşılığı donmuştur, mahsuplar kalemin kurundan yazılır; bu yüzden kapanma ölçütü döviz ekseni olmalıdır (R26), yoksa dolar bittiği hâlde lira alacağı duran bir kayıt kalır.
  - **Çöpteki kalemin mahsubu.** Çalışan tarafında mahsup, bağlı olduğu kalem çöpe atılınca açık avansı artırıyor (`avansBorclari`'nın `canli` kümesi); tedarikçi tarafında aynı kural yazılmazsa çöpe atılan fatura alacağı sessizce yok eder.
  - **Hesapsız avans.** Hesap seçilmezse hareket hiçbir bakiyeye girmez; bu bilinçli bir yoldur (0024 R8) ama tedarikçi avansında yanlış kullanılırsa kasadan çıkan para hiçbir yerde görünmez. Kasa'nın hesabı belirtilmemiş kayıtlar listesi bunu zaten gösteriyor (R3). Geri ödemede aynı yol kapatıldı (R11/2).
  - **İki avans kavramı tek sayaçta.** Hareket özeti avansı türe göre saymıyor; raporun çalışan kutusu, hesabı belirtilmemiş kayıtlar listesinin toplu satırı ve HAREKETLER tablosu aynı sayacı okuyor. Tedarikçi avansı eklendiği an bu üç yer yanlışlanır; R19/2 ayrışmayı yazıyor.
  - **Döviz yüklemi türe kilitli.** "Bu hareket dövizdir" yüklemi yalnız ödeme türünü tanıyor, yani döviz avans çöp etiketinde, iz ayrıntısında, Kasa listesinde ve hesap taşımada lira sanılır (R22/2). Aynı sınıf hata 0152 R7/2'de bir kez ödendi.
  - **Ekstrenin bakiyesi anlam değiştirir.** Tedarikçi ekstresi bugün tek yönlü; avans satırı girince "Bakiye" sütunu net sütuna döner ve bugünkü çapraz değişmez (ekstre = borç özeti satırı) artık doğru değildir. Denklemi yazmadan işe başlamak geliştiriciyi borç özetini netleştirmeye, yani X4'ü ihlal etmeye iter (R15/3).
  - **Çöpteki tedarikçi.** Ekstreye erişilemeyen tedarikçinin alacağı yalnız C10/2'nin iki kuralıyla (çöpe atılabilir, kalıcı silinemez, Kasa'da silinmiş rozetiyle) kayıt içinde kalır.

### QA turunda ölçülenler (2026-11-23)

Bütün satırlar `51783ca4` (0156 kapanışı) üzerinde okundu. Spec'in canlı veri ölçümü (2026-11-22) bu turda yeniden ölçülmedi.

| Ölçüm | Yer | Sonuç |
|---|---|---|
| **A** | Dal ve sürüm | `main`, HEAD `51783ca4`; 0156 yayınlanmış, yani ekstre penceresi spec yazıldıktan sonra yeniden yazıldı |
| **B** | Üç fazla ödeme reddi | `kasa.js:504` (TL kalan), `:539` (döviz kalan), `:815` (mahsup kalanı) satır satır doğrulandı; `:814` ayrıca açık avans sınırı |
| **C** | Bakiyenin avans kolu | `kasa.js:111` tutarı `kurus(m.tutar)` okuyor ve koşulsuz çıkan yazıyor; `yon` okunmuyor |
| **D** | İki okuyucu | `hesaptanCikanK` ile `girenBacakK` hareket türünden bağımsız çalışıyor, yani avans kolu onları çağırarak düzeltilebilir |
| **E** | Açık avans okuyucusu | `avansBorclari` yalnız `calisanId` dolu hareketleri okuyor, `yon` ile para birimine hiç bakmıyor, dönüşü tek kuruş alanı |
| **F** | Silme ve düzenleme sınırı | `avansSilinebilirMi` ile `avansDuzenlenebilirMi` formülü mahsup eksi verilen; giren yönü ve para birimi yok |
| **G** | Mahsup kaydının alanları | `mahsupDogrula` kaydı tür, tarih, tutar, çalışan, gider, taksit, hesap ve açıklama taşıyor; **avans referansı taşımıyor** |
| **H** | Kalemin kapanması | `odemeleriUygula` mahsubu da kalemden düşüyor ve tutarı liradan okuyor, yani döviz mahsupta lira tutar kayıtta durmalı |
| **I** | Tedarikçi ekstresi | yalnız borç ve ödeme satırı doğuyor; ana hedefe düşen her hareket payı koşulsuz ödeme yazılıyor; satırlar 0156'nın vergi, ödemeler, kalan, davranış ve anahtar alanlarını taşıyor |
| **J** | Çalışan ekstresi | avans satırı hareket dizisinden ayrı döngüde doğuyor, mahsubun net etkisi sıfır, dönüşte açık avans alanı var; tedarikçi ikizinin deseni hazır |
| **K** | Bugünkü çapraz test | `tests/kasa.test.js` AC-16 tedarikçi ekstresinin son bakiyesini borç özeti satırına **eşit** sabitliyor; çalışan testi aynı yerde açık avansı çıkarıyor |
| **L** | Borç ve hatırlatıcı | `borcOzeti` kalanı sıfır olan hedefi atlıyor, yani yalnız alacağı olan tedarikçinin satırı hiç doğmuyor; `odemeHatirlatma.js` ile `acikKalemler.js` hareket dizisini hiç okumuyor (AC-33 ek iş gerektirmiyor) |
| **M** | Hareket özeti | avans ve mahsup türe göre ayrışmıyor, tek sayaç ve tek toplam dönüyor |
| **N** | Rapor | `giderRaporu.js` kutu başlığı çalışan avansını söylüyor, ay içi rakamları ayrışmamış özetten geliyor, hesapsız listede tek toplu satır çalışan adıyla yazılıyor |
| **O** | Hesapsız liste | avans dalı ayrı sayılıyor ve listeye giriyor, yani tedarikçi avansı buraya kendiliğinden düşer (R3) |
| **P** | Döviz yüklemi | `doviz.js:102` yüklemi hareket türünü ödemeye kilitliyor |
| **Q** | Hesap taşıma | plan döviz ödemeyi ve düzeltmeyi hesapsız bırakmayı reddediyor; döviz avans için karşılığı yok |
| **R** | Çöp kutusu | tür eşlemesinde avans ile mahsup var; etiket tarih ve tutardan oluşuyor, ad yazılmıyor ve dosyanın kuralı tedarikçi adını da yasaklıyor (0078 R24) |
| **S** | Sunucu | avans `avans` iznine ve Kasa sekmesine, mahsup `gider_odeme`'ye bağlı; mahsup Kasa sekmeli hareketler kümesinde değil |
| **T** | Veritabanı | `hesap_hareketleri` çalışan, çek, yön ve beş döviz alanını taşıyor; okuma boş değerleri gövdeye yazmıyor, tek yeni sütun tedarikçi kimliği |
| **U** | Birleştirme | hareketin çalışan kimliği zaten yeniden atanıyor ve tedarikçi haritası hazır, yani C11 ile AC-42 tek satır |
| **V** | Ekstre penceresi (0156) | işlem adı eşlemesi ile tıklanabilir satır kümesi satırın türüne bakıyor; tedarikçi bakiye etiketi her zaman kalan borç diyor; açık avans satırı ve döviz ayrıntı bayrağı yalnız çalışan ile ödeme dalında; kalemde göster yalnız borç ve ödeme satırında |
| **W** | Tedarikler listesi | açık borç hücresi dönem raporu nesnesinden okunuyor; silinemez penceresinin kapısı kalem, tanım ve parça sayısı; ekstreye avans silme geri çağırımı verilmiyor |
| **X** | Kasa ekranı | avans satırının metni, kilidi, adı, silme denetimi ve düzenleme formu beş ayrı yerde çalışan varsayıyor |
| **Y** | Mahsup kipi | ödeme girişi mahsupta çalışan kilidini alıyor ve metni çalışandan söz ediyor; varsayılan tutar kalemin lira kalanı ile açık avansın küçüğü; kipin açılma koşulu çalışan kalemine bağlı |

### QA turunda verilen kararlar (2026-11-23)

Bloklayıcı:

- **B1 · Bloklayıcı · Açık avansın birimi ve kuru.** Okuyucu para birimi kovası döndürür ve lira kaleme mahsupta kur hareketin kendisinden sorulur (R23/2, R25, C2/2, C3) — *neden:* bir tedarikçide iki para biriminde avans durabilir ve iki ayrı kurla girilmiş avansların toplamının tek kuru yoktur, yani "avansın donmuş kuru" tanımsız bir büyüklüktür.
- **B2 · Bloklayıcı · Bakiyenin avans kolu.** Kol hesaptan çıkan okuyucusunu ve `yon` alanını okur, tanınmayan yön çıkan sayılır (R3/2) — *neden:* bugünkü kol lira tutarı ve koşulsuz çıkan yazıyor, yani AC-9 ile AC-21 sessizce yanlış çalışır.
- **B3 · Bloklayıcı · Döviz yükleminin tür kilidi.** Yüklem hareket türünden bağımsız olur ve dört yer onu okur (R22/2) — *neden:* tek yüklem AC-36, AC-39, hesap taşıma koruması ve Kasa listesinin ibaresini birlikte kapatır; dördünü ayrı yazmak aynı hatanın dört kopyası olur.
- **B4 · Bloklayıcı · İki avans kavramı tek sayaçta.** Hareket özeti taraf ve yön kırılımı döndürür, rapor iki kutuyu ayrı besler (R19/2) — *neden:* ayrışma yazılmazsa tedarikçi avansı çalışan kutusunu ve hesapsız listenin toplu satırını yanlışlar, bu bir regresyondur ve kıyas altını onu yakalamaz.
- **B5 · Bloklayıcı · Ekstrede mahsup ve bakiyenin anlamı.** Mahsup kendi satır türüyle ve net etkisi sıfır yazılır, son bakiyenin denklemi ile sütun adı yazılı olur (R15/2, R15/3) — *neden:* bugünkü ekstre her ana hedef payını ödeme yazıyor, yani mahsup doğduğu an bakiye çift sayar; bugünkü çapraz değişmez de artık doğru değildir.

Önemli:

- **Ö1 · Önemli · Geri ödemenin sınırı.** Sınır açık avanstır, R12 yeniden yazıldı (R12) — *neden:* R12 ile AC-22 çelişiyordu; çıkan toplamı sınır alınırsa mahsup edilmiş avansın geri ödenmesi açık avansı eksiye düşürür.
- **Ö2 · Önemli · Silme ve düzenleme sınırı.** Tedarikçi tarafı kendi fonksiyonlarıyla, para birimi kovası içinde ve giren toplamını sayarak (R1/2) — *neden:* AC-38 bugünkü çalışan kuralına atıf yapıyor ama o kural yönü ve para birimini bilmiyor.
- **Ö3 · Önemli · Mahsubun hedefi.** Mahsup yalnız ana hedefi kapatır (R7/2) — *neden:* kira stopajı ile tevkifat vergi dairesinindir; oraya mahsup yazmak 0021 R7'nin çift sayım yasağını deler.
- **Ö4 · Önemli · Mahsup kilidi ve kilit envanteri.** Kilit kalemin tarafına göre seçilir, metin iki sabit olur, yeni pencereler envantere yazılır (R9/2, C13) — *neden:* kilit alanları listesi iki yönlü taranıyor ve yazılmayan pencere testi düşürür; metin de yanlış tarafı söylüyordu.
- **Ö5 · Önemli · Mahsup penceresinin birimi.** Alanın birimi kalemin para birimidir, sınırlar o birime çevrilir (R8/2) — *neden:* bugünkü varsayılan iki ayrı birimi karşılaştırıyor ve kullanıcı farkı görmeden yanlış tutar kaydeder.
- **Ö6 · Önemli · Tedarikçinin silinmesi.** Çöpe atılabilir, kalıcı silinemez; çöpteki avans Kasa'da silinmiş rozetiyle görünür (C10/2) — *neden:* kalıcı silme serbest kalırsa hareket yetim kalır ve alacak hiçbir ekranda görünmez.
- **Ö7 · Önemli · Çöp satırında ad.** R20 kalır ve 0078 R24 ile 0058 R21 açıkça ters çevrilir, ad yalnız avans satırında yazılır (R20/2) — *neden:* kodda yazılı bir kuralı sessizce ihlal etmek yerine ters çevirmek sonraki turda "neden böyle" sorusunu kapatır.
- **Ö8 · Önemli · Alacağın yeri ve kaynağı.** Yeni sütun açılmaz, satır açık borç hücresinin altında ve veri açık avans okuyucusundan gelir (R16/2) — *neden:* dönem nesnesinden okumak dönemden bağımsız bir rakamı döneme bağlar, iki rakamı aynı hücrede toplamak da R17 ile X4'ün yasakladığı netleşmedir.
- **Ö9 · Önemli · Borç özetine satır eklenmemesi.** Eklenmez, R17 ile AC-32'nin ibaresi Tedarikler listesini gösterir (R17/2, X12) — *neden:* borç özetinin çıktısı kart, hatırlatıcı ve raporun ortak girdisi; yeni satır türü altını ve kartın anlamını kazara değiştirir.
- **Ö10 · Önemli · Geri ödemede hesap.** Zorunludur (R11/2) — *neden:* hesapsız geri ödeme açık avansı azaltır ama para hiçbir bakiyede görünmez, yani hesapsız avans tuzağının tersten tekrarı olur.
- **Ö11 · Önemli · Hesap taşımada döviz avans.** Hesapsız bırakılamaz (R27/2) — *neden:* hesapsız kalan döviz avans lira sanılır, 0152 R7/2'nin kapattığı hatanın aynısı.
- **Ö12 · Önemli · Kasa'nın avans satırları.** Beş yerde tarafa göre dallanır (R1/3) — *neden:* dallanma yazılmazsa tedarikçi avansı listede silinmiş çalışan görünür, kilit alınmaz ve düzenleme yanlış formu açar.

Küçük:

- **K1 · Küçük · Geri ödeme satırının türü.** Kendi satır türü ve adı olur (R15/4) — *neden:* işlem adı eşlemesi satırın türüne bakıyor, aynı türde kalırsa iki yön de avans yazar.
- **K2 · Küçük · Ekstrenin özeti ve ipucusu.** Üç metin iki yön için yazılır ve açık avans satırı tedarikçide de çizilir (R15/5) — *neden:* C12 metinleri tek yerde istiyor ve çalışan tarafının ikizi hazır.
- **K3 · Küçük · Döviz avansın ayrıntısı.** Bayrak satır türünden bağımsız olur (R15/6) — *neden:* hesaptan çıkan döviz ile kur satırı aksi hâlde hiç çizilmez.
- **K4 · Küçük · Mahsup satırında kalemde göster.** Düğme mahsup satırına da verilir (R15/7) — *neden:* aynı kalem ve aynı yönlendirme, ayrım kullanıcıya keyfi görünür.
- **K5 · Küçük · Ekstreden avans silme.** Tedarikçi ekstresinde de verilir (R15/8) — *neden:* 0024'ün deseni korunur, ikinci bir silme yolu açılmaz.
- **K6 · Küçük · Silinemez penceresinde alacak.** Eksi bakiye hâlinin kendi cümlesi yazılır (AC-65) — *neden:* bugün yalnız borç dalı var, alacak aynı pencerede söylenmeli.
- **K7 · Küçük · C5'in izin ölçümü.** Düzeltildi: mahsup Kasa sekmesi istemez (C5) — *neden:* doküman ile kod çelişiyordu, kod doğru.
- **K8 · Küçük · C3'ün kur kuralı.** B1'in kararına göre yeniden yazıldı (C3) — *neden:* C3 ile R24 birbirini yiyordu, geliştirici hangisini uygulayacağını bilemezdi.
- **K9 · Küçük · Mahsubun kapsam kuralı.** Tedarikçi dilinde yazıldı (R7/4) — *neden:* aksi hâlde açık avans düşer ama ekstre o kalemi görmez, iki rakam ayrışır.
- **K10 · Küçük · Çöpteki tedarikçinin kalemi.** Mahsup reddedilir (R7/3) — *neden:* ekstresine erişilemeyen tarafa yeni kayıt yazmak izlenemez.
- **K11 · Küçük · Kıyas fikstürü deseni.** Ortak veri dosyası artı altın (C8/2) — *neden:* altını üreten verinin tek yerde durması sonraki turda yenilemeyi kolaylaştırıyor.
- **K12 · Küçük · Rapor kutusunun kırılımı.** Yalnız üç toplam, para birimi başına satır (R19/3, X13) — *neden:* C8 çalışan kutusuyla simetri istiyor, kırılım yeni bir gizlilik tartışması açar.
- **K13 · Küçük · İşlem geçmişi kayıt türü.** Bugünkü avans türü korunur (R20/3) — *neden:* yeni anahtar etiket testini düşürür ve yeni tür açmama kuralıyla da tutarsız olur.
- **K14 · Küçük · Yeni bölümün yeri.** Çalışan avanslarından sonra, hesapsız bloğun önüne (R14/2) — *neden:* sıra 0083'ün kararıydı, yazılmazsa blok yeniden yukarı kayar.

### QA turu karar kaydı

| Bulgu | Derece | Karar | İşlendiği yer |
|---|---|---|---|
| Açık avansın birimi ve kuru | Bloklayıcı | Para birimi kovası, kur hareketin kendisinden | R23/2, R25, C2/2, C3 |
| Bakiyenin avans kolu | Bloklayıcı | Hesaptan çıkan artı yön, tanınmayan yön çıkan | R3/2 |
| Döviz yükleminin tür kilidi | Bloklayıcı | Yüklem türden bağımsız, dört okuyucu | R22/2 |
| İki avans kavramı tek sayaçta | Bloklayıcı | Taraf ve yön kırılımı, iki kutu | R19/2 |
| Ekstrede mahsup ve bakiye | Bloklayıcı | Kendi satır türü, net sıfır, denklem yazılı | R15/2, R15/3 |
| Geri ödemenin sınırı | Önemli | Sınır açık avans | R12 |
| Silme ve düzenleme sınırı | Önemli | Tedarikçi kardeşi, kova içinde, giren dahil | R1/2 |
| Mahsubun hedefi | Önemli | Yalnız ana hedef | R7/2 |
| Mahsup kilidi ve envanter | Önemli | Tarafa göre kilit, iki metin, envanter | R9/2, C13 |
| Mahsup penceresinin birimi | Önemli | Kalemin para birimi | R8/2 |
| Tedarikçinin silinmesi | Önemli | Çöpe atılır, kalıcı silinmez | C10/2 |
| Çöp satırında ad | Önemli | 0078 R24 ters çevrilir, ad yalnız avansta | R20/2 |
| Alacağın yeri ve kaynağı | Önemli | Hücre altı satır, okuyucudan prop | R16/2 |
| Borç özetine satır | Önemli | Eklenmez | R17/2, X12 |
| Geri ödemede hesap | Önemli | Zorunlu | R11/2 |
| Hesap taşımada döviz avans | Önemli | Hesapsız bırakılamaz | R27/2 |
| Kasa'nın avans satırları | Önemli | Beş yerde dallanma | R1/3 |
| Geri ödeme satırının türü | Küçük | Kendi türü ve adı | R15/4 |
| Ekstrenin özeti ve ipucusu | Küçük | İki yön, açık avans satırı | R15/5 |
| Döviz avansın ayrıntısı | Küçük | Bayrak türden bağımsız | R15/6 |
| Mahsup satırında kalemde göster | Küçük | Verilir | R15/7 |
| Ekstreden avans silme | Küçük | Verilir | R15/8 |
| Silinemez penceresinde alacak | Küçük | Kendi cümlesi | AC-65 |
| C5'in izin ölçümü | Küçük | Düzeltildi | C5 |
| C3'ün kur kuralı | Küçük | Yeniden yazıldı | C3 |
| Mahsubun kapsam kuralı | Küçük | Tedarikçi dilinde | R7/4 |
| Çöpteki tedarikçinin kalemi | Küçük | Mahsup reddedilir | R7/3 |
| Kıyas fikstürü deseni | Küçük | Veri dosyası artı altın | C8/2 |
| Rapor kutusunun kırılımı | Küçük | Üç toplam, para birimi başına | R19/3, X13 |
| İşlem geçmişi kayıt türü | Küçük | Bugünkü tür | R20/3 |
| Yeni bölümün yeri | Küçük | Çalışan avanslarından sonra | R14/2 |

---

### Plan turunda verilen kararlar (2026-11-23)

- **P1 (U1, R15/3 ile R26):** okuyucu kova başına bilgi amaçlı `liraK`'yı (verilen − mahsup − geri, lira ekseninde) da döndürür; kova kapanınca (döviz açığı sıfır) `liraK` sıfır sayılır. Ekstrede kovayı kapatan satır (döviz açığı sıfıra inen mahsup ya da geri ödeme) lira kalıntısını kendi etkisine katar ve ayrıntısı "Döviz avans kapandı; lira karşılığındaki kur farkı bakiyeye yansıtılmaz" yazar. Denklem "son bakiye = borç özeti satırı − açık avansın lira karşılığı" her hâlde tutar, kapanmış döviz avans hiçbir ekranda alacak bırakmaz, kayda kur farkı yazılmaz.
- **P2 (U2):** mahsup kipinde R28'e göre uygun birden çok kova varsa (lira kalemde TL ve döviz kovalar, döviz kalemde yalnız o dövizin kovası) "Avans para birimi" seçicisi çizilir; varsayılan kalemin para birimi, yoksa ilk uygun kova; tek kovada seçici yok. Mahsubun hangi kovadan düştüğü kendi döviz alanlarından okunur (yeni alan yok).
- **P3 (U3):** çıkan avans `yon` yazmaz (eski kayıtlarla aynı biçim); yalnız geri ödeme `yon: "giren"` taşır.
- **P4 (U4):** geri ödeme Tedarikçi avansları bölümünün satırındaki "Geri ödeme gir" düğmesinden, aynı formla (`yon: "giren"`) girilir; tutar varsayılanı kovanın açık avansı, hesap listesi yalnız o para birimindeki açık hesaplar.
- **P5 (U5):** `CalisanAvanslari.AvansFormu` `taraf` prop'u alır (`calisan` | `tedarikci`); ayrı tedarikçi formu yazılmaz. Çalışan dalının alanları ve gövdesi değişmez.
- **P6 (U6):** mahsup satırının ayrıntısı kalemi, kapattığı taksidi (`taksitNumarasiAdi`) ve dövizse döviz tutarı ile kuru yazar; "Kalemde göster" çizilir.
- **P7 (U7):** hareket özetinin yeni anahtarları yalnız tedarikçi avansı ya da giren yönlü avans varken yazılır; çalışan kutusu çalışan kolundan okur.
- **P8 (U8):** kalıcı silme koruması `kasa.avansliTedarikciler(hareketler)` (avans ya da mahsup hareketi olan tedarikçiler); dört kapı bunu da okur, neden tek sabit.
- **P9 (U9):** Tedarikler satırındaki alacak hareket bölümü varken çizilir (ekstre düğmesinin koşulu); Kasa yetkisi istemez.
- **P10 (U10):** `mahsupDogrula` `tedarikciler` seçeneği alır; başka tedarikçinin kalemine mahsup nedeni kalemin tedarikçisinin adını yazar (tek sabit kalıp).

## Acceptance Criteria

- **AC-1.** Kasa'da "Tedarikçi avansları" bölümü çizilir ve açık avansı olan tedarikçiler listelenir.
- **AC-2.** Tedarikçi, tarih, tutar ve TL hesap girilen avans kaydedilir ve o hesabın bakiyesini girilen tutar kadar azaltır.
- **AC-3.** Hesap seçilmeyen avans kaydedilir, hiçbir bakiyeye girmez ve Kasa'nın hesabı belirtilmemiş kayıtlar listesinde görünür.
- **AC-4.** Tedarikçisi seçilmeyen avans reddedilir, nedeni alanında yazar.
- **AC-5.** Çöpteki tedarikçiye avans verilemez, nedeni yazar.
- **AC-6.** Tutarı sıfır ya da eksi olan avans reddedilir.
- **AC-7.** Aynı harekette hem tedarikçi hem çalışan taşıyan kayıt reddedilir.
- **AC-8.** Çalışan avansı döviz hesaptan verilemez, nedeni bugünkü metnidir.
- **AC-9.** Tedarikçi avansı döviz hesaptan verilebilir; kayıt hesaptan çıkan dövizi, kuru ve para birimini taşır, lira karşılığı kurdan hesaplanır.
- **AC-10.** Döviz avansta kur girilmezse kayıt reddedilir; günün kuru önerilir, elle değiştirilebilir ve kayıtta donar.
- **AC-11.** Avansın tedarikçisine ait bir gider kalemine mahsup girilebilir ve kalemin kalanı o kadar azalır.
- **AC-12.** Başka tedarikçinin kalemine mahsup reddedilir, nedeni tedarikçi adını yazar.
- **AC-13.** Tedarikçisi seçilmemiş kaleme mahsup reddedilir.
- **AC-14.** Personel kalemine tedarikçi avansından mahsup reddedilir; çalışan avansının personel kalemine mahsubu bugünkü gibi çalışır.
- **AC-15.** SGK kalemine mahsup reddedilir, metni bugünkü SGK metnidir.
- **AC-16.** Mahsup kalemin kalanından fazla olamaz, nedeni kalanı yazar.
- **AC-17.** Mahsup açık avanstan fazla olamaz, nedeni açık avansı yazar.
- **AC-18.** Taksitli kalemde mahsup taksit seçilmeden kaydedilemez; seçilince o taksidin kalanı azalır.
- **AC-19.** Mahsup hiçbir hesabın bakiyesini değiştirmez.
- **AC-20.** Mahsup edilen kalem çöpe atılınca açık avans mahsup kadar geri artar.
- **AC-21.** Giren yönlü avans hareketi hesabın bakiyesini artırır ve açık avansı azaltır.
- **AC-22.** Açık avanstan fazla giren yönlü avans reddedilir, nedeni açık avansı yazar.
- **AC-23.** Kısmi geri ödemeden sonra kalan açık avans mahsup edilebilir.
- **AC-24.** Döviz avanstan aynı para birimindeki kaleme mahsupta mahsubun döviz tutarı avanstan düşer ve kalemi kapatan lira tutarı kalemin donmuş kurundan hesaplanır; kur sorulmaz.
- **AC-25.** Döviz avanstan lira kaleme mahsupta tutar avansın para biriminde girilir ve kalemi kapatan lira tutar için kur sorulur: öneri o günün kuru, elle değiştirilebilir ve kayıtta donar. Avansın döviz kalanı girilen döviz tutar kadar azalır; avansın kendi kuru hiçbir yerde okunmaz.
- **AC-26.** Döviz avansın döviz kalanı sıfırlandığında avans kapanmış sayılır; lira ekseninde kalan fark hiçbir ekranda alacak olarak görünmez ve hiçbir gider ya da gelir doğmaz.
- **AC-27.** Başka para birimindeki kaleme mahsup reddedilir (dolar avanstan euro kaleme), nedeni yazar.
- **AC-28.** Döviz avansın geri ödemesi başka para birimindeki hesaba yapılamaz.
- **AC-29.** Tedarikçi ekstresinde avans satırı alacak yönünde, mahsup satırı ikisini kapatan (net etkisi sıfır) ve geri ödeme satırı alacağı azaltan satır olarak görünür; bakiye sütununun başlığı "Net bakiye"dir ve son bakiye alacaklıyken eksi yazar.
- **AC-30.** Açık avansı olan tedarikçinin satırı Tedarikler listesinde alacağı yazar.
- **AC-31.** "Tedarikçilere açık borç" kartının rakamı açık avanstan etkilenmez.
- **AC-32.** Borç özetinde tedarikçi satırının tutarı açık avansla azaltılmaz ve borç özetine alacak satırı eklenmez (çıktısı spec öncesiyle birebir); alacak Tedarikler listesinde görünür.
- **AC-33.** Açık avans ödeme hatırlatıcısının iki sayısına, açık kalemler ekranına ve yaşlandırma kutusuna girmez.
- **AC-34.** Aylık Gider ve Kasa Raporu'nda açık tedarikçi avansı kutusu açık avansı, ay içinde verileni ve ay içinde mahsup edileni **para birimi başına** satırla yazar; avans yoksa kutu basılmaz ve tedarikçi kırılımı hiçbir hâlde basılmaz.
- **AC-35.** Dönem raporunun gider toplamı, KDV karşılaştırması, kovalar ve makina maliyeti avans ve mahsuptan etkilenmez.
- **AC-36.** Çöp kutusunda tedarikçi avansı satırı tedarikçinin adını, tarihi ve tutarı kendi para biriminde yazar (ad yalnız avans satırında; ödeme satırı adsız kalır); geri alınınca bakiye ve açık avans döner.
- **AC-37.** Açık avansı ya da avans hareketi olan tedarikçi çöpe atılırken onay bunu yazar ve çöpe atma engellenmez.
- **AC-38.** Avans ve mahsup kayıtları 0073'ün tek editöründen düzenlenir ve silinir; silme açık avansı mahsup edilmiş tutarın altına düşürüyorsa engellenir (bugünkü çalışan kuralı).
- **AC-39.** İşlem geçmişinde tedarikçi avansı kendi kaydını yazar ve ayrıntısı tedarikçiyi, tutarı, yönü ve döviz kaydında para birimiyle kuru taşır.
- **AC-40.** Yeni hareket türü, yeni eylem izni ve yeni veri bölümü eklenmedi (kaynak taraması).
- **AC-41.** `tedarikciId` dört nokta kuralıyla eklendi, boş değer kayıt gövdesine yazılmıyor ve tam tur testinde geçiyor.
- **AC-42.** Birleştirmede yeni avansın `tedarikciId`'si yeniden atanan tedarikçi kimliğini izler.
- **AC-43.** Tedarikçi avansı olmayan veride bütün çıktılar (bakiyeler, borç özeti, ekstreler, hatırlatıcı, rapor, hesapsız listeler) spec öncesi altınla birebir aynıdır (`tests/fixtures/0155-once.json`).
- **AC-44.** Çalışan avansı ve mahsubunun bütün bugünkü davranışları değişmedi (kıyas ve var olan testler).

### QA turu kriterleri (2026-11-23)

- **AC-45.** Giren yönlü avans hesapsız kaydedilemez, nedeni yazar.
- **AC-46.** Döviz avansın bakiyeye düşen tutarı hesaptan çıkan dövizdir; yönü yazılmamış ya da tanınmayan avans çıkan sayılır ve bakiyeden düşer.
- **AC-47.** Döviz avans çöp kutusu etiketinde, işlem geçmişi ayrıntısında ve Kasa hareket listesinin açıklamasında döviz hareket olarak tanınır (tutar kendi para biriminde, kur yazılır).
- **AC-48.** Hesap taşımada döviz avans hesapsız bırakılamaz, nedeni tutarı ve para birimini yazar.
- **AC-49.** Hareket özeti avansı taraf ve yön kırılımıyla döndürür; raporun çalışan avansı kutusu ile hesabı belirtilmemiş kayıtlar listesinin çalışan satırı tedarikçi avansını saymaz, HAREKETLER tablosunun avans satırı giren ile çıkanı ayrı yazar.
- **AC-50.** Tedarikçi ekstresinde mahsup kendi satır türüyle çizilir ve net etkisi sıfırdır (tutarı ayrıca yazar).
- **AC-51.** Tedarikçi ekstresinin son bakiyesi borç özetindeki tedarikçi satırı eksi o tedarikçinin açık avansına eşittir (çapraz test).
- **AC-52.** Geri ödeme satırı kendi adıyla ("Avans geri ödemesi") çizilir ve ayrıntısı açılır.
- **AC-53.** Tedarikçi ekstresinin özetinde açık avans satırı çizilir, bakiye etiketi borç ve alacak hâlinde ayrı metin yazar, ipucu mahsubun net etkisizliğini söyler.
- **AC-54.** Döviz avansın ekstre ayrıntısı hesaptan çıkan dövizi ve kuru yazar.
- **AC-55.** Tedarikçi ekstresinin mahsup satırında "Kalemde göster" düğmesi çizilir ve kalemi Dönem Raporu'nda açar.
- **AC-56.** Tedarikçi ekstresinden avans silinebilir (`avans` izni); izin yoksa düğme çizilmez.
- **AC-57.** Açık avans okuyucusu tedarikçi ve para birimi başına verilen, mahsup edilen, geri ödenen ve açık kalan tutarı döndürür; mahsup sınırı, Kasa bölümü, Tedarikler satırı, ekstre ve rapor aynı okuyucuyu çağırır (çapraz test) ve ikinci bir toplama kaynakta yoktur (tarama).
- **AC-58.** Mahsup kalemin yalnız ana hedefini kapatır; stopaj ya da tevkifat hedefine mahsup reddedilir ve taksit seçicisi yalnız ana hedefin taksitlerini listeler.
- **AC-59.** Mahsup penceresinin tutar alanı kalemin para birimindedir; varsayılan değer, iki sınır ve hata metinleri o para biriminde yazılır.
- **AC-60.** Mahsup kipi kalemin tarafına göre kilit alır (çalışan kaleminde çalışan, tedarikçi kaleminde tedarikçi) ve kilit çakışmasının metni tarafa göre ayrı sabittir.
- **AC-61.** Çöpteki tedarikçinin kalemine mahsup reddedilir, nedeni yazar.
- **AC-62.** Gelecek tarihli ya da yürürlük ayından önceki kaleme tedarikçi avansından mahsup reddedilir, nedeni yazar.
- **AC-63.** Tedarikler listesinde alacak "Açık borç" hücresinin altında kendi satırında yazılır, yeni sütun açılmaz ve veri dönem raporundan değil açık avans okuyucusundan gelir (tarama).
- **AC-64.** Kasa'nın hareket listesinde tedarikçi avansı satırı tedarikçinin adını yazar, kilidi tedarikçiye bağlar, düzenlemesi tedarikçi avans formunu açar ve silme denetimi tedarikçi kuralını kullanır.
- **AC-65.** Tedarikçi silme penceresinde bakiye alacak yönündeyse kendi cümlesi yazılır (tedarikçi silinse bile alacağın kapanmayacağı).
- **AC-66.** Giren yönlü avans serbestçe silinir (açık avans artar); düzenlemesi açık avansı eksiye düşürüyorsa reddedilir ve nedeni sınırı yazar.
- **AC-67.** Açık avansı ya da avans hareketi olan tedarikçi kalıcı silinemez; düğme kalır, satırda nedeni yazar ve "çöpü boşalt" ile otuz günlük temizlik onu korur.
- **AC-68.** Çöpteki tedarikçinin avansı Kasa'nın Tedarikçi avansları bölümünde "silinmiş" rozetiyle listelenir.
- **AC-69.** Rapor kutusu para birimi başına satır yazar ve tedarikçi adı basılmaz.
- **AC-70.** Kasa'da Tedarikçi avansları bölümü Çalışan avanslarından sonra, hesabı belirtilmemiş kayıtlar bloğunun önünde çizilir.
- **AC-71.** Tedarikçi avansı ile mahsubu bugünkü işlem geçmişi kayıt türlerini kullanır; yeni kayıt türü ya da yeni etiket eklenmedi (etiket kapsam testi dokunulmadan geçer).
- **AC-72.** Yeni Tedarikçi avansları penceresi ile mahsup kipini çizen ödeme girişi kilit alanları envanterinde yazılıdır (iki yönlü tarama geçer).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Hesap içeren iş React'sız **saf motorda** yazıldı ve kendi testi var; arayüz yalnız gösteriyor.
- [ ] Açık avans okuyucusu para birimi kovası döndürüyor; kovaları toplayan ikinci bir rakam hiçbir ekranda yok (tarama).
- [ ] Bakiyenin avans kolu hesaptan çıkan okuyucusunu ve yön alanını okuyor; yönü yazılmamış avans çıkan sayılıyor.
- [ ] Döviz hareket yüklemi hareket türünden bağımsız ve dört okuyucusu (çöp etiketi, iz ayrıntısı, Kasa ibaresi, hesap taşıma) onu kullanıyor.
- [ ] Hareket özeti ile rapor avansı taraf ve yön olarak ayırıyor; çalışan kutusunun rakamı tedarikçi avansı olmayan veride birebir aynı.
- [ ] Tedarikçi ekstresinde mahsup kendi satır türünde, net etkisi sıfır; son bakiyenin denklemi çapraz testle sabit.
- [ ] Mahsup yalnız ana hedefi kapatıyor; stopaj ve tevkifat hedefi reddediliyor.
- [ ] Mahsup penceresinin birimi kalemin para birimi; iki sınır da o birimde ölçülüyor.
- [ ] Aynı sayıyı üreten başka ekran varsa ikisi **aynı kaynağı** kullanıyor (açık avans tek okuma yolu, C2; çapraz test).
- [ ] Yeni kalıcı alan için **dört nokta kuralı** uygulandı (`SCHEMA_SQL` + `applyColumnMigrations` + `INSERT` + `SELECT`) ve `db-roundtrip` testine eklendi.
- [ ] Yeni veri bölümü yok; bu açıkça yazıldı.
- [ ] Yeni eylem izni yok; avansın `avans`, mahsubun `gider_odeme` iznini kullandığı ve Kasa sekmesi önkoşulunun yeterli olduğu ölçümle gösterildi.
- [ ] Soft-delete edilen hareket varsa çöp kutusu geri alma ve temizleme simetrisi korundu.
- [ ] Açık avansı olan tedarikçinin kalıcı silinmesi üç kapıda da (Kalıcı Sil, çöpü boşalt, otuz günlük temizlik) engellendi.
- [ ] Kilit envanteri güncellendi (yeni pencereler `tedarikci` alanının listesinde) ve iki yönlü tarama geçiyor.
- [ ] 0078 R24 ile 0058 R21'in ters çevrildiği yer spec'te ve test yorumunda yazılı; çalışan adı yasağı yerinde.
- [ ] Kullanıcıya görünen tüm metinler Türkçe; yazdırma çıktısı (0047 kutusu) Türkçe.
- [ ] Para gösteriliyorsa çoklu para kuralına uyuluyor; bilinmeyen para birimi tanımlı biçimde ele alınıyor.
- [ ] Arayüz kriterlerinin **görsel kanıtı** eklendi (`docs/evidence/0155-*`), boş ve hata durumları dâhil.
- [ ] `0155-once.json` spec öncesi kodla üretildi ve birebir geçti; ortak veri `tests/fixtures/0155-veri.js`'te.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi (yeni kavram: tedarikçi avansı ve iki yönlü tedarikçi ekstresi).
- [ ] Sürüm notu yazıldı: önce sunucu bilgisayarı, bütün istemciler güncellenene kadar tedarikçi avansı girilmez.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | | Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | | İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | / | Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | | Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | | Kullanıcının gerçek uygulamada bulduğu hata sayısı. |

**Bu spec'ten çıkarılan ders:**
