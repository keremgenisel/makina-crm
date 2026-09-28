# 0040 — Çek Portföyü ve Alınan Çekin Ciro Edilerek Ödenmesi

| | |
|---|---|
| **Durum** | Tamamlandı (2026-09-28; commit `740c876`, dal `feat/0040-cek`; plan `specs/done/0040-uygulama-plani.md` Q1–Q10) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Yeni Çek Portföyü ekranı, gider ödemesi, kasa hareketleri, Finans ve aylık rapor, müşteri tahsilatı |
| **Bağımlı spec'ler** | 0001 (gider kaydı, tamam) · 0021 (gider taksitlendirme, tamam) · 0024 (kasa ve ödemenin kalemden ayrılması, tamam) |
| **Revizyon** | R1 (QA turu, 2026-09-28): 21 bulgu işlendi, 7'si bloklayıcıydı. R2 (2026-09-28, plan onayı): "resmi" hukuki tür okumasıdır, tür düz süzgeç alanıdır ve gizlilik kolu uygulanmaz (R20/Q1); çek kaydı tahsilattan gelen alanları saklamaz (R1/Q2); ciro tahsilata ve müşteri kaydına yazmaz, gelir tarihi ve kalan borç okuma anında türer (R6/Q3); eski çek tahsilatları otomatik taşınmaz (R2/Q4); portföy Kasa ekranının bir görünümüdür (R10, R13/Q5); sunucu eylem kuralları (C11/Q6); silinen tahsilatın çeki (Q7); ciroda alacaklı ve kalem kapsamı (R7, R9/Q8); ciro hareketi tek tek silinmez (R15/Q9); vadesi yaklaşan eşiği (R10/Q10). |

---

## Intent

Müşteriden ödeme olarak gelen çek bugün uygulamada bir kâğıt değil, bir etiket: tahsilat kaydının
üzerinde "yöntem: Çek", bir vade tarihi ve bir "tahsil edildi" kutusu. Çekin kendisi, yani numarası,
bankası, keşidecisi ve kimden geldiği hiçbir yerde durmuyor. "Kasada hangi çekler var, toplamı ne, ilk
vade ne zaman" sorusunun cevabı uygulamada yok.

Fabrika bu çekleri bekletmiyor, başkasına ödeme olarak ciro ediyor. Uygulama bu hareketi hiç bilmiyor ve
bilmemesinin iki somut bedeli var. Birincisi, ciro edilen çek hiçbir zaman "tahsil edildi" işaretlenmediği
için o tahsilat Finans'ta ve aylık raporda **gelire hiç girmiyor**; kullanıcı raporu doğru görmek için
tahsil edilmemiş bir çeki tahsil edilmiş işaretlemek zorunda kalıyor. İkincisi, o çekle kapatılan gider
ödemesi kasadan çıkmış nakit gibi görünüyor ve hesap bakiyesini yanlış azaltıyor.

Başarı şu demek: gelen her çek kendi kaydıyla portföyde duruyor, elde ne olduğu tek ekranda okunuyor, bir
çek tek hareketle bir tedarikçiye ciro edilip onun borcunu kapatıyor, ve bu hareket ne geliri kaybediyor
ne de kasadan olmayan bir para çıkarıyor.

---

## Requirements

- **R1.** Gelen çek kendi kaydı olur: çek numarası, banka, keşideci (çeki yazan), tutar, para birimi,
  **vade** (üzerindeki düzenleme tarihi), alındığı tarih, **tür** (hamiline / resmi) ve kimden alındığı.
- **R2.** Çek bir tahsilat kaydına bağlanır: müşteriden alınan ödeme (`payments`) "Çek" yöntemiyle
  girildiğinde çek kaydı da oluşur; mevcut tahsilat kayıtlarına sonradan çek bağlanabilir.
  **Kapsam:** yalnız `payments`. Bir tahsilat en çok **bir** çek taşır, çek tutarı tahsilat tutarına
  **eşittir** ve ayrıca düzenlenemez (bugün kaydın tek bir `yontem` alanı var, kısmi yöntem karışımı yok,
  X10). Müşteri üç çek verdiyse üç tahsilat kaydı girilir; form bunu bir ipucu satırıyla söyler.
  Servis, Extra Kalıp ve yedek parça bedellerinin çekleri kapsam dışıdır (X9).
  **Uygulama (R2, Q2, Q4, Q7):** çek kaydı yalnız kendine ait alanları saklar: `paymentId`, numara, banka, keşideci,
  tür, durum ve geçmiş. Tutar, para birimi, vade (`payments.vadeTarihi`), alınma tarihi ve kimden alındığı tahsilattan
  okunur; böylece AC-30 kendiliğinden sağlanır. Çek kaydı olmayan eski çek tahsilatları otomatik taşınmaz (numara ve banka
  zorunludur, R14); bugünkü bayrakla çalışır ve portföy bunların sayısını bir notla gösterir, bağlama tahsilat formundan
  yapılır. Tahsilat çöpe gidince çek okuma anında gizlenir, geri alınınca döner, kalıcı silinince çek de silinir. Ciro
  edilmiş çekin tahsilatı silinemez; önce ciro iptal edilir.
- **R3.** Çekin durumu şunlardan biridir: **portföyde**, **tahsile verildi**, **tahsil edildi**,
  **ciro edildi**, **karşılıksız**. Yeni çek "portföyde" doğar. İzinli geçişler şunlardır:

  | Bu durumdan | Şuraya geçebilir |
  |---|---|
  | portföyde | tahsile verildi, tahsil edildi, karşılıksız, ciro edildi (yalnız ciro işlemiyle) |
  | tahsile verildi | tahsil edildi, karşılıksız, portföyde (geri alma) |
  | tahsil edildi | karşılıksız (banka sonradan iade ettiyse), portföyde (hata düzeltme) |
  | ciro edildi | karşılıksız; başka hiçbir duruma elle geçmez (geri dönüş yalnız ciro iptaliyle, R15) |
  | karşılıksız | portföyde (hata düzeltme) |

  Ciro edilmiş bir çek elle "tahsil edildi" yapılamaz (C2, çift sayım). Yasak bir geçiş denendiğinde
  nedeni yazan bir hata gösterilir ve durum değişmez; işlem sessizce yutulmaz.
- **R4.** Portföydeki bir çek, bir gider ödemesinde ödeme aracı olarak seçilebilir (**ciro**). Ödeme yöntemi
  "Çek (ciro)" olur ve hangi çek olduğu kayda geçer (`cekId`).
- **R5.** **Ciro hesap bakiyesini değiştirmez.** Çek bir kasa ya da banka hesabından çıkmaz; portföyden
  çıkar. Ciro, 0024 R8'in tanıdığı **hesapsız ödeme hareketidir** (`hesapId: null`).
- **R6.** **Ciro edilen çek tahsil edilmiş sayılır.** Çekin karşılığı olan tahsilat, ciro tarihinde gelire
  girer; kullanıcı ayrıca "tahsil edildi" işaretlemek zorunda kalmaz. **Uygulama kuralı:** bu, tahsilatın
  `tahsilEdildi` alanını true yaparak DEĞİL, gelir uygunluğunu **çekin durumundan** türeterek yapılır.
  İki soru ayrı ayrı cevaplanır:
  - "Gelir doğdu mu" (`utils.isPaymentReceived`): çek **tahsil edildi ya da ciro edildi** ise evet.
  - "Para bir hesaba girdi mi" (`kasa.js` `tahsilatSayilirMi`): yalnız **tahsil edildi** ise evet; ciro
    edilen çek hiçbir hesabın bakiyesini artırmaz, çünkü o para bankaya hiç girmedi.

  Gelirin ayı, bugün zaten kullanılan `utils.tahsilatTarihiOf`'un okuduğu `tahsilatTarihi` alanına **ciro
  tarihi** yazılarak belirlenir. R6'nın iki yan sonucu vardır ve ikisi de istenen davranıştır: ciro edilen
  çek müşterinin **Kalan Borcunu** azaltır (`utils.sumPayments`) ve **bekleyen çek** toplamından düşer
  (`utils.sumBekleyenCek`).
  **Uygulama (R2, Q3):** ciro tahsilata ve müşteri kaydına **yazmaz** (ciroyu yapan kullanıcının Müşteriler sekmesi
  olmayabilir; yazsa sunucu 403 verirdi). Gelir tarihi çekin geçmişindeki ciro (ya da tahsil) tarihinden okunur: App
  tahsilatları çek durumuyla bir kez zenginleştirir (`cek.cekleriUygula`, 0024 `odemeleriUygula` deseni) ve
  `utils.tahsilatTarihiOf` bu tarihi okur. Saklı `kalanBorc`, çek kaydı olan müşterilerde okuma anında yeniden hesaplanır;
  diğer müşterilerin rakamı değişmez.
- **R7.** Bir çek **bütün olarak, bir kez, tek bir alacaklıya** ciro edilir. Çek tutarı o alacaklının birden
  çok gider kalemine dağıtılabilir; dağıtılan toplam çek tutarını aşamaz. **Uygulama kuralı:** ciro, çek
  başına **birden çok ödeme hareketi** üretir; her hareket tek bir kalemi (taksitli kalemde tek bir
  taksidi) kapatır ve hepsi aynı `cekId`'yi taşır. Ekranda tek işlem, veride N harekettir. Bu, 0024 R2 ve
  X9'un "bir ödeme tek hedefi kapatır" kuralını (kodda `kasa.odemeDogrula`) bozmadan ihtiyacı karşılar.
  Her hareket ayrıca 0024'ün kalan sınırına uyar (kalandan fazla ödeme kaydedilemez).
- **R8.** Çek tutarı kapatılan borçlardan büyükse **fark uyarıyla gösterilir**, ciro yine tamamlanır ve
  seçilen kalemler kapanır. Artan tutar hiçbir yere alacak ya da avans olarak işlenmez (X7); kullanıcı
  açıklamaya yazar. Fark, ciroyu engelleyen bir hata değildir.
- **R9.** Kime ciro edildiği kaydedilir (tedarikçi, çalışan ya da serbest ad). **Uygulama (R2, Q8):** tedarikçi seçilirse
  onun açık kalemleri, çalışan seçilirse onun maaş kalemleri, serbest ad girilirse tedarikçisi seçilmemiş kalemler listelenir;
  dağıtım en eski vadeden başlar ve elle düzeltilir; en az bir kalem zorunludur (ciro bilgisi hareketlerden okunur, R12).
  Alacaklının adı geçmişe "ciro: ad" notuyla yazılır. Ciro ekranı, çekin arkasına
  **tam ciro** (unvan, vergi kimlik numarası, adres) yazılması gerektiğini hatırlatır.
- **R10.** **Çek Portföyü ekranı:** elde bulunan çekler vade sırasıyla, toplam tutarıyla; vadesi geçmiş ve
  vadesi yaklaşan çekler ayırt edilir. Tür (hamiline / resmi) ve durum ile süzülür. **"Elde bulunan" =
  durumu portföyde ya da tahsile verildi olan çekler**; toplam tutar bu ikisini sayar. Tahsil edildi, ciro
  edildi ve karşılıksız listeden düşer ama durum süzgeciyle görülebilir.
  **Uygulama (R2, Q5, Q10):** portföy Kasa ekranında "Hesaplar / Çek Portföyü" seçimiyle açılır (görünürlük kuralı Kasa ile
  aynı, kenar menüye sekme eklenmez). "Vadesi yaklaşan" eşiği 0003'ün hatırlatma eşiğidir (`hatirlatmaEsikGun`, varsayılan
  7 gün).
- **R11.** **Karşılıksız çıkan çek** işaretlenince: çek portföyden düşmez, durumu karşılıksız olur; bağlı
  tahsilat gelirden çıkar; ciro edilmişse kapattığı gider borcu **yeniden açılır** (ciranta sorumluluğu
  bizde kalır). **Uygulama kuralı:** o çekin `cekId`'li ödeme hareketleri **silinir** (0024'te kalan borç
  hareketlerden türediği için borç kendiliğinden yeniden açılır), silinme çekin geçmişine "karşılıksız,
  ciro geri alındı" satırı olarak yazılır, `tahsilatTarihi` temizlenir ve tahsilat **ciro ayından** gelirden
  çıkar (geriye dönük düzeltme, C13). Ciro edilmiş çek karşılıksız çıksa da portföye **dönmez**, çünkü kâğıt
  artık bizde değildir; yalnız durumu karşılıksız olur.
- **R12.** Bir çekin geçmişi okunabilir: kimden alındı, hangi tarihte hangi durumlara geçti, kime ciro
  edildi, hangi gider kalemlerini kapattı. **Saklama:** durum değişiklikleri çek kaydının içinde kimliksiz
  alt satırlardır (`gecmis: [{tarih, durum, not}]`, 0001 model satırları ve 0023 ek ödemeleri deseni, tek
  JSON sütunu); ciro bilgisi ayrıca saklanmaz, `cekId` taşıyan ödeme hareketlerinden okunur.
- **R13.** **Çek Portföyü ekranı** hem gider hem finans yetkisi ister (0024 C6 ile aynı kural, Kasa
  sekmesinin emsali). Bu şart **yalnız ekranın görünürlüğü** içindir, veri yazımı için değil: çek kaydı
  müşteri tahsilatıyla birlikte doğduğu için tahsilat girebilen kullanıcı çek kaydı da yazabilir (C11).
- **R14.** **Alan zorunlulukları ve sınır değerleri:** tutar sıfırdan büyük olmalıdır; çek numarası ve banka
  zorunludur (portföyün ayırt ediciliği bunlara dayanır); keşideci ve kimden alındığı zorunlu değildir.
  Aynı banka ve numaralı ikinci çek **uyarı** verir ama kaydı engellemez (banka numaraları müşteriler
  arasında tekrar edebiliyor; engellemek meşru kaydı keserdi). Vade, alınma tarihinden önce olabilir
  (geçmiş vadeli çek elden devredilebiliyor) ve engellenmez.
- **R15.** **Ciro iptal edilebilir.** **Uygulama (R2, Q9):** ciro hareketi ödeme penceresinde "Çek (ciro) · numara"
  olarak görünür ama tek tek silinemez; iptal yalnız bütün ciro için portföyden yapılır. İptal, çekin `cekId`'li ödeme hareketlerini siler, çeki "portföyde"
  durumuna döndürür ve geçmişe "ciro iptal edildi" satırı yazar. İzin: `gider_odeme` (R11 ile aynı
  mekanizma, farklı tetikleyici).
- **R16.** **Yalnız TL çek ciro edilebilir.** Gider kalemleri TL'dir (0001) ve `kasa.odemeDogrula` gider
  ödemesinde hesabın TL olmasını şart koşar. TL dışı çek portföyde durur ve tahsil edilebilir, ama ciro
  düğmesi kapalıdır ve nedeni yazılır ("gider ödemeleri TL'dir").
- **R17.** **Bekleyen çek rakamları tek kaynaktan gelir.** Bugün var olan hesaplar (`utils.sumBekleyenCek`,
  `utils.isCekVadesiGecmis`, aylık rapordaki `bekleyenCekler` ve `cekTahsilAdet`, Anasayfa tahsilat
  takvimi) çek kaydından türer; ikinci bir hesap yazılmaz. Ciro edilen çek bu rakamlarda "bekleyen"
  sayılmaz, çünkü artık beklemiyoruz.
- **R18.** Ciro hareketleri, 0024'ün **"hesabı belirtilmemiş ödemeler"** uyarı listesinde
  (`kasa.hesapsizOdemeler`, `HESAPSIZ_NOTU`) **görünmez**. Hesapsız olmaları kasıtlıdır, eksik veri
  değildir.
- **R19.** Gider ödeme yöntemi listesine **"Çek (ciro)"** eklenir ve **elle seçilemez**: yalnız portföyden
  bir çek seçilince kendiliğinden atanır. Listedeki düz **"Çek"** seçeneği kalır; anlamı takip edilmeyen,
  serbest not niteliğinde bir kayıttır (kendi çek defterimiz X1 ile kapsam dışıdır) ve bir ipucu satırı
  bunu söyler.
- **R20.** **Karar (R2, Q1):** "resmi" hukuki tür okumasıdır (lehtarı belli, ciro ile devredilen çek); tür düz bir süzgeç
  alanıdır, gizlilik kolu uygulanmaz ve AC-38 kapsam dışı kalır. Özgün metin: **Koşullu:** onayda "resmi" sözcüğünün kayıtlı ile kayıt dışı ayrımını anlattığı doğrulanırsa tür
  alanı personel gizlilik desenini izler (0001 K21: varsayılan kapalı, hiçbir yazdırma ve dışa aktarma
  çıktısına girmez). Hukuki tür okuması doğrulanırsa alan düz bir süzgeç alanıdır ve gizlilik kuralı
  uygulanmaz.

## Constraints

- **C1.** Hesaplar kuruş tamsayısıyla yapılır (0001 ile aynı).
- **C2.** **Çift sayım yasağı** (0001 C19, 0021 R7, 0024 C3 ile aynı sınıf): bir çek ya tahsil edilir ya ciro
  edilir; ikisi birden gelir yazılmaz ve ciro kasadan para çıkarmaz.
- **C3.** Çift kayıt (muhasebe) sistemi kurulmaz; bu bir portföy ve borç takibidir.
- **C4.** Bir çek kesirli kullanılamaz: kâğıt bölünmez (R7).
- **C5.** Gider tarafında ödeme yine bir **hareket kaydıdır** (0024 R2); ciro yeni bir ödeme türü değil,
  ödemenin aracıdır.
- **C6.** Maliyet ve kârlılık hesabı (0002) çekten etkilenmez; gider doğduğu ayda maliyete girer.
- **C7.** Gider modülünün yayın perdesi (0008) inikken çek portföyü de kullanıcıya kapalıdır.
- **C8.** Yeni kalıcı alanlar ve listeler dört (liste ise beş) nokta kuralına uyar.
- **C9.** Kullanıcıya görünen metinler Türkçedir.
- **C10.** **Durumun tek kaynağı çek kaydıdır.** Aynı gerçeği bugün iki yer yazıyor: çekin durumu ve
  tahsilat satırındaki "tahsil edildi" onay kutusu (`cust_payment_edit`). Çeke bağlı bir tahsilatta o kutu
  **salt okunur** gösterilir, "çek portföyünden yönetilir" der ve kutuya tıklayan kullanıcı durum
  değişikliğine yönlendirilir. Çeki olmayan eski tahsilatlar bugünkü kutuyla çalışmaya devam eder.
- **C11.** **Sunucu yetki eşlemesi:** yeni `cekler` bölümü `BOLUM_SEKMELERI`'nde `["customers", "gider",
  "settings"]`'tir ve `GIDER_BOLUMLERI` kümesine **girmez**. Kayıt düzeyinde ekleme izni
  `cust_payment_add` (çek tahsilatla birlikte doğar), ciro izni `gider_odeme` (bir ödeme hareketi yaratır),
  durum değiştirme izni `cust_payment_edit`. Bölüm gider tarafına konursa ya da `GIDER_BOLUMLERI`'ne
  eklenirse gider sekmesi olmayan bir tahsilatçı kullanıcının tahsilat kaydı 403 alır
  (`serverAuth.cjs:94` `payments: ["customers", "settings"]` ile karşılaştırın).
  **Uygulama (R2, Q6):** durumun "ciro edildi"ye geçmesi ya da ondan dönmesi `gider_odeme`, diğer durum değişiklikleri
  `cust_payment_edit` ister. Ciroyu yapan Giderler kullanıcısının müşteri izin grubu kısıtlıysa bölüm düzeyinde engellenmemesi
  için yedek parça satışındaki gibi bir istisna uygulanır. Ciro edilmiş çekin karşılıksız işaretlenmesi ödeme hareketlerini
  de sildiği için iki izni birlikte ister.
  **Triyaj (2026-09-28):** "ciro edildi"ye geçiş (ya da ciro edilmiş doğan çek) aynı yazımda o çeke bağlı (`cekId`) en az bir
  yeni ödeme hareketi ister; yoksa hazırlanmış bir istekle çek hareketsiz ciro edilebilir, tahsilat gelire girer ama hiçbir
  borç kapanmazdı (`server-authz`, `server-security.cjs`). Q7'nin koruması bütün silme yollarına genişletildi: ciro edilmiş
  çekli tahsilatı olan müşteri çöpe atılamaz; böyle bir tahsilat, müşterisi ve çek kaydı kalıcı silmede, çöpü boşaltmada ve
  30 günlük otomatik temizlikte silinmez. Yinelenen çek uyarısı yalnız tahsilatı duran çekleri sayar.
- **C12.** **Yayın perdesi (0008) inikken çek kaydı oluşmaya devam eder**, yalnız Çek Portföyü ekranı ve
  ciro işlemi gizlenir. Perde bir yayın kararıdır, bir veri kararı değil; perde kalktığında portföyün boş
  çıkmaması gerekir (0008 K3'ün yedek dosyası istisnasıyla aynı sınıf).
- **C13.** **Kapanmış dönem kavramı yoktur** (0001 C9, tahakkuk esası). Karşılıksız çek ve ciro iptali
  geçmiş bir ayın gelirini geriye dönük düzeltir; bu bilinçli ve tutarlı davranıştır.

### KAPSAM DIŞI

- **X1.** Kendi çek defterimizden yazdığımız çekler (verilen çek, muhasebede 103) — *neden:* kullanıcının
  anlattığı akış gelen çeki ciro etmek. Kendi çekimizi yazmak ayrı bir kavramdır ve kendi vade takibini
  ister. Ödeme yöntemi listesinde "Çek (ciro)" ile düz "Çek" bu yüzden ayrı durur.
- **X2.** Çekin teminata verilmesi — *neden:* fabrika bugün teminat çeki kullanmıyor; kullanırsa durum
  listesine bir değer eklemek yeter.
- **X3.** Karekod okutma, Findeks çek raporu, keşidecinin çek sicili sorgusu — *neden:* dış servis
  entegrasyonu; uygulama elle girilen veriyi takip eder.
- **X4.** Banka ile tahsile verme, elektronik çek takası, otomatik durum güncelleme — *neden:* X3 ile aynı
  sınıf.
- **X5.** Senet (bono) takibi — *neden:* ayrı bir kambiyo senedi; ihtiyaç doğarsa aynı desen taşınır.
- **X6.** Karşılıksız çek için hukuki takip, ihtarname, icra süreci izleme — *neden:* uygulama bir CRM'dir,
  hukuk takibi değil.
- **X7.** Çekin ciro edilmesiyle doğan alacak farkının (R8) tedarikçi cari hesabına açık alacak olarak
  işlenmesi — *neden:* 0024 cari hesap değil ekstre üretiyor; açık alacak ayrı bir karardır.
- **X8.** Döviz çeklerinde kur farkı hesabı — *neden:* çekler TL; para birimi alanı ileriye dönük tutulur,
  kur farkı hesaplanmaz.
- **X9.** Servis, Extra Kalıp ve yedek parça bedellerinin çekleri — *neden:* bu üç kayıtta ayrı bir ödeme
  kaydı yok, tahsilat bilgisi kaydın üzerinde bir bayrak çifti (`yontem` + `tahsilEdildi`, bkz.
  `utils.satisTahsilEdildi`). Bunlara çek kaydı bağlamak üçünün ödeme modelini değiştirmek demektir ve
  0024 X3 ile aynı sınıfta bilinçli olarak ertelenmiştir. Portföy ekranı başlığının altında "bu ekran
  müşteri tahsilat çeklerini kapsar" notu bulunur.
- **X10.** Bir tahsilatta kısmi yöntem karışımı (kısmen nakit, kısmen çek) — *neden:* `payments` kaydının
  tek bir `yontem` alanı var; bölmek ödeme modelini değiştirmek olur. Müşteri karışık ödediyse iki tahsilat
  kaydı girilir.
- **X11.** Zincirleme ciro takibi (çekin bizden sonraki elleri, kimden kime geçtiği) — *neden:* bizi
  ilgilendiren, çekin bizim elimizden çıktığı andır; sonrası bizim kaydımız değildir.
- **X12.** Çek geçmişinin yazdırılması ya da dışa aktarılması — *neden:* ekranda okunan bir izleme
  kaydıdır; çıktı ihtiyacı doğarsa ayrı iştir (0024 B9'daki ekstre kararıyla aynı sınıf).

---

## Context

- **Bugün gelen çek nerede duruyor.** `payments` tablosunda tahsilat kaydının `yontem` alanı "Çek",
  `vadeTarihi` vade, `tahsilEdildi` ise paranın bankada karşılandığını gösteriyor. Servis, Extra Kalıp ve
  yedek parça satışlarında da aynı ikili var. Çekin numarası, bankası ve keşidecisi hiçbir yerde tutulmuyor;
  aynı müşteriden gelen iki çek birbirinden ayırt edilemiyor.
- **Gelirin kaybolması (doğrulanmış, QA turunda düzeltilen referansla).** Spec'in ilk taslağı
  `utils.isOdemeTahsilEdildi` diye bir fonksiyona atıf yapıyordu; **böyle bir fonksiyon yok**. Gerçek
  isimler: `utils.isPaymentReceived` (`src/lib/utils.js:748`, müşteri tahsilatı için) ve
  `utils.satisTahsilEdildi` (`utils.js:638`, servis, Extra Kalıp ve yedek parça için). İkisi de çekte
  `tahsilEdildi === true` arıyor; Finans ekranı ve `aylikRapor.js` (satır 403 ve 425) bu kuralı kullanıyor.
  Yani ciro edilen, dolayısıyla hiçbir zaman bankadan tahsil edilmeyen bir çekin tahsilatı **hiç gelire
  girmiyor**. Bugünkü tek çıkış yolu, tahsil edilmemiş bir çeki elle "tahsil edildi" işaretlemek. R6 bu
  boşluğu kapatıyor; çek ikilisinin dört kayıt türünde birden bulunması ise X9'un gerekçesi.
- **Bayrağı çevirmek ikinci bir hata üretirdi (0024 A'dan sonra doğrulandı).** `src/lib/kasa.js:31`:
  `tahsilatSayilirMi = (p) => !p.deletedAt && p.hesapId != null && !(p.yontem === "Çek" && !p.tahsilEdildi)`.
  R6, `tahsilEdildi`'yi true yaparak uygulansaydı, hesabı seçilmiş bir tahsilat çeki o hesabın bakiyesini
  çek tutarı kadar **artırırdı**; oysa çek bankaya hiç girmedi. Bu, spec'in düzeltmek istediği hatanın
  aynadaki eşi olurdu. R6'nın "iki ayrı soru" kuralı bu yüzden yazıldı.
- **Bir ödeme tek hedefi kapatır (uygulanmış).** `kasa.odemeDogrula` (`kasa.js:91`) birden çok kalemi tek
  ödemeyle kapatmayı açıkça reddediyor: "Bir ödeme yalnız bir kalemi kapatır; her kalem için ayrı ödeme
  girin." (0024 R2 ve X9). R7'nin "çek birden çok kaleme dağıtılabilir" ihtiyacı bu yüzden **N hareket, tek
  `cekId`** olarak çözüldü. Aynı fonksiyon `hesapId`'nin boş bırakılmasına izin veriyor, yani ciro için
  yeni bir doğrulama yolu açmaya gerek yok; TL şartı ise R16'nın gerekçesi.
- **Hesapsız ödeme uyarısı (0024 R8).** `kasa.hesapsizOdemeler` ve `HESAPSIZ_NOTU`, hesabı belirtilmemiş
  hareketleri eksik veri gibi listeliyor. Ciro kasıtlı olarak hesapsızdır, bu yüzden R18 ile o listeden
  hariç tutulur; yoksa uyarı listesi kirlenir ve gerçek eksikler gözden kaçar.
- **Çek kaydı müşteri tahsilatında doğuyor.** `serverAuth.cjs:94` `payments: ["customers", "settings"]`,
  grup `customerActions`, ekleme izni `cust_payment_add` (`serverAuth.cjs:358`). C11'in eşlemesi buradan
  çıkarıldı; gider bölümlerinin eşlemesi (`["gider"]` + `GIDER_BOLUMLERI`) çek için yanlış olurdu.
- **Bugün zaten üç yerde "bekleyen çek" rakamı var.** `utils.sumBekleyenCek` (`utils.js:758`),
  `utils.isCekVadesiGecmis` (`utils.js:760`), `aylikRapor.js:287` `bekleyenCekler` ve `:540`
  `cekTahsilAdet`, ayrıca Anasayfa tahsilat takvimi. R17 bunların çek kaydından türemesini şart koşuyor;
  ikinci bir hesap yazılırsa iki "elde çek" rakamı ayrışır (bu depoda tekrar eden hata sınıfı).
- **Ödeme artık bir hareket kaydı.** 0024 ile gider ödemesi `{tarih, tutar, yontem, hesapId, giderId,
  taksitId}` alanlı bir harekete dönüştü ve kısmi ödeme mümkün. Ciro bu yapıya bir alan (hangi çek) ve bir
  kural (hesapsız hareket) ekler; yeni bir ödeme mekanizması kurmaz.
- **Hukuki arka plan (araştırıldı, 2026-09-28).** Türk hukukunda çek üç biçimde devredilir: **hamiline
  yazılı** çek teslimle, **emre yazılı** çek ciro ve teslimle, **nama yazılı** çek ise ciro ile hiç
  devredilemez, ancak alacağın temliki ile devreder. Hamiline çekte "hamiline" ibaresi bankanın bastığı
  yaprakta matbu olmak zorundadır, sonradan yazılamaz. Hamiline çek ciro edilmeden elden devredilebilir;
  ciro edilirse ciro eden (ciranta) çek ödenmezse sorumlu olur. Bu sorumluluk R11'in gerekçesidir.
- **Tam ciro ve KDV (araştırıldı).** Mal ya da hizmet karşılığı alınan çek başkasına devredilirken KDV
  müteselsil sorumluluğundan korunmak için **tam ciro** gerekir: çekin arkasına ciro edilenin adı, unvanı,
  vergi kimlik numarası ve adresi yazılır. Uygulama bu bilgiyi yazdırmaz ama kime ciro edildiğini kaydeder
  ve kullanıcıya hatırlatır (R9).
- **Vade (araştırıldı).** Çekte hukuken vade yoktur, görüldüğünde ödenir; ancak ileri tarihli çekin
  düzenleme tarihinden önce bankaya ibrazının geçersiz sayılması kuralı 7566 sayılı Kanunla **31.12.2028**
  tarihine kadar uzatıldı. Yani uygulamadaki "vade" alanı bu tarihe kadar gerçek bir ödeme gününü
  gösteriyor. 2028 sonrası için bir varsayım yapılmadı.
- **"Hamiline" ve "resmi" kullanıcının kendi sözcükleri.** Yaygın ticari kullanımda "resmi çek", lehtarı
  belli olan, ciro ile devredilen çek anlamına geliyor; hamiline çek ise kimin elindeyse onun sayılıyor.
  Bu ayrım doğrudan uygulanabilir. **Onayda doğrulanması gereken tek nokta:** kullanıcı "resmi" derken bu
  hukuki türü mü, yoksa uygulamada personel maaşında olduğu gibi kayıtlı ile kayıt dışı ayrımını mı
  kastediyor. İkinci okuma doğruysa alanın anlamı değişmez, yalnız gizlilik kuralları (0001 K21 deseni)
  bu alana da uygulanır. Spec alanı **kullanıcının iki sözcüğüyle** tanımlar, böylece her iki okumada da
  doğru veri girilir.
- **Bir sonraki adımın habercisi.** Çek bir borcu ödeme aracı olarak kullanıldığında aynı gider kalemi
  hem çekle hem başka bir yöntemle kapanabilir. Bu, 0041'in konusudur ve iki iş aynı ödeme kaydını
  paylaşır.

---

## Acceptance Criteria

- **AC-1.** Müşteriden çekle tahsilat girildiğinde çek kaydı oluşur ve portföyde görünür.
- **AC-2.** Çek kaydında numara, banka, keşideci, tutar, vade, alınma tarihi ve tür saklanır; kapanıp
  açıldığında kaybolmaz.
- **AC-3.** Portföy ekranı elde bulunan çekleri (portföyde + tahsile verildi) vade sırasıyla ve toplam
  tutarıyla gösterir.
- **AC-4.** Vadesi geçmiş portföy çeki ayırt edilir.
- **AC-5.** Tür (hamiline / resmi) ve duruma göre süzme çalışır.
- **AC-6.** Portföydeki bir çek bir tedarikçiye ciro edilerek onun gider kalemini kapatır.
- **AC-7.** Ciro sonrası çekin durumu "ciro edildi" olur ve portföy listesinden çıkar.
- **AC-8.** Ciro edilen çek, kapattığı gider kaleminin ödemesi olarak görünür ve kalan borç azalır.
- **AC-9.** Ciro hiçbir kasa ya da banka hesabının bakiyesini değiştirmez.
- **AC-10.** Ciro edilen çekin tahsilatı, hiçbir hesabın bakiyesi değişmeden, ciro tarihinde Finans'ta ve
  aylık raporda gelire girer.
- **AC-11.** Aynı çek ikinci kez ciro edilemez.
- **AC-12.** Bir çek aynı alacaklının iki gider kalemine dağıtılabilir; bu **iki ayrı ödeme hareketi**
  üretir, ikisi de aynı çeki gösterir ve dağıtılan toplam çek tutarını aşamaz.
- **AC-13.** Çek tutarı kapatılan borçlardan büyükse fark uyarı olarak gösterilir, ciro tamamlanır ve fark
  hiçbir borcu kapatmaz.
- **AC-14.** Karşılıksız işaretlenen çekin tahsilatı gelirden çıkar.
- **AC-15.** Karşılıksız işaretlenen ciro edilmiş çekin kapattığı gider borcu yeniden açılır.
- **AC-16.** Çek geçmişi kimden alındığını, durum değişikliklerini ve kime ciro edildiğini gösterir.
- **AC-17.** Ciro ekranı tam ciro hatırlatmasını gösterir.
- **AC-18.** Yalnız gider yetkisi olan ya da yalnız finans yetkisi olan kullanıcı çek portföyünü görmez.
- **AC-19.** Yayın perdesi inikken Çek Portföyü ekranı ve ciro işlemi görünmez, ama çekle tahsilat
  girilebilir ve çek kaydı oluşur.
- **AC-20.** Kısıtlı kullanıcı sunucudan çek bölümüne yetkisiz yazma yapamaz (403).
- **AC-21.** Makina maliyeti ve kârlılık çekten etkilenmez.
- **AC-22.** Ciro edilen çekin bağlı olduğu tahsilatta bir hesap seçili olsa bile o hesabın bakiyesi
  değişmez (`kasa.hesapBakiyeleri` çaprazı).
- **AC-23.** Ciro sonrası müşterinin kalan borcu çek tutarı kadar azalır ve müşterinin bekleyen çek
  toplamından düşer.
- **AC-24.** Ciro hareketleri "hesabı belirtilmemiş ödemeler" listesinde ve sayısında görünmez.
- **AC-25.** Çeke bağlı tahsilatın "tahsil edildi" kutusu salt okunurdur ve çekin durumunu gösterir.
- **AC-26.** Yasak bir durum geçişi denendiğinde nedeni yazan bir hata gösterilir ve durum değişmez.
- **AC-27.** Ciro iptal edilince çek "portföyde" durumuna döner, ödeme hareketleri silinir ve gider borcu
  yeniden açılır.
- **AC-28.** Karşılıksız işaretlenen ciro edilmiş çekin ödeme hareketleri silinir, çek portföye dönmez ve
  gelir ciro ayından çıkar.
- **AC-29.** TL dışı çek portföyde görünür ve tahsil edilebilir, ama ciro edilemez ve nedeni yazılır.
- **AC-30.** Çek tutarı bağlı tahsilatın tutarına eşittir ve ayrıca düzenlenemez.
- **AC-31.** Aynı banka ve numaralı ikinci çek uyarı verir, kayıt engellenmez.
- **AC-32.** Tutarı sıfır ya da negatif çek kaydedilemez; numara ve banka boş bırakılamaz.
- **AC-33.** Yalnız Müşteriler sekmesi olan (gider sekmesi olmayan) kullanıcı çekle tahsilat kaydederken
  403 almaz.
- **AC-34.** Ciro `gider_odeme` izni ister: izinsiz kullanıcıda düğme görünmez ve sunucu yazımı reddedilir.
- **AC-35.** Çekin geçmişi durum değişikliklerini tarihiyle saklar; ciro bilgisi ödeme hareketlerinden
  okunur, ikinci kez saklanmaz.
- **AC-36.** Portföy toplamı ile müşteri bazındaki bekleyen çek toplamı aynı çekleri sayar (tek kaynak).
- **AC-37.** Gider ödeme yönteminde "Çek (ciro)" elle seçilemez; yalnız portföyden çek seçilince atanır.
- **AC-38.** Onayda "resmi" sözcüğünün ikinci okuması doğrulanırsa tür alanı hiçbir yazdırma ve dışa
  aktarma çıktısına girmez (R20).

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Çek portföyü, ciro ve karşılıksız hesapları saf motorda (React'sız, testli), 0024 deseniyle.
- [x] Çift sayım yasağı testle sabitlendi: ciro hesaba dokunmuyor, gelir bir kez sayılıyor (AC-9, AC-10).
- [x] Gelirin kaybolması düzeltildi ve regresyon testiyle korundu (AC-10).
- [x] `kasa.js` `tahsilatSayilirMi` çaprazı testte sabit: ciro edilen çek gelire girerken hiçbir hesabın
      bakiyesini artırmıyor (AC-22). Bu, R6'nın yanlış uygulanmasının tek koruması.
- [x] Bir çekin iki kalemi kapattığı senaryo iki ayrı ödeme hareketi üretiyor ve `kasa.odemeDogrula`'nın
      tek hedef kuralı hiçbir yerde gevşetilmedi (AC-12).
- [x] Sunucu eşlemesi C11'e göre yapıldı: `cekler` bölümü `["customers", "gider", "settings"]`,
      `GIDER_BOLUMLERI`'nde değil; gider sekmesi olmayan tahsilatçı kullanıcı uçtan uca testte 403 almıyor
      (AC-33).
- [x] Karşılıksız ve ciro iptali yolları hareket silme üzerinden çalışıyor, çekin geçmişine iz düşüyor
      (AC-27, AC-28).
- [x] Kalıcı alanlar dört (liste ise beş) noktada eklendi; roundtrip ve temiz kurulum testleri kapsıyor.
- [x] Sunucu yetki eşlemesi yapıldı ve uçtan uca testte sabitlendi (AC-20).
- [x] Görsel kanıt eklendi (`docs/evidence/0040-*.jpg`): portföy listesi, ciro ekranı, karşılıksız durumu;
      aydınlık ve karanlık tema.
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi: çekin portföy kaydı, ciro kuralı, "ciro edilen çek tahsil edilmiş sayılır"
      kararı ve bunun iki ayrı soruya (gelir doğdu mu / para hesaba girdi mi) bölünmüş uygulaması yazıldı.
- [x] Takım Yöneticisi onayladı ve "resmi" sözcüğünün anlamını doğruladı (Context son madde); ikinci okuma
      çıkarsa R20'nin gizlilik kolu uygulandı ve `gider-gizlilik.test.js` desenine eklendi.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 1 | R2 plan onayı anında işlendi (uygulama notları, AC değişmedi). Onaydan sonra C11'e triyaj notu eklendi: hareketsiz ciroyu sunucu reddeder ve Q7 koruması bütün silme yollarına genişletildi. Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | 2 | Bir triyaj turu (4 bulgu) ve onun sırasında bulunan 0040 öncesi veri kaybı hatası için ayrı bir tur. İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | 4 / 0 | Müşteri silme ve çöp kutusunun ciro korumasını atlaması, otomatik temizliğin yetim çek bırakması, sunucunun hareketsiz ciroyu kabul etmesi, lint uyarıları. Hepsi gerçek. Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | 0 | Triyaj bulguları yeni özelliğin eksik yollarıydı. Müşteri detayının çöpteki tahsilatları silmesi 0040 öncesinden kalmaydı, ayrı triyajla düzeltildi ve sayılmadı. Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | 0 | Kapanış anında bilinen yok. Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:** Bir kaydı korumaya alan kural (ciro edilmiş çekin tahsilatı silinmez) yalnız kullanıcının gördüğü tek düğmeye yazıldı; aynı kaydı silen öbür yollar (üst kaydın kaskadı, kalıcı silme, çöpü boşaltma, açılıştaki otomatik temizlik) atlandı. Koruma kuralı eklenirken kaydı diziden çıkaran bütün yollar tek listede taranmalı. İkinci ders: bileşenlere çöpsüz (`live*`) dizi verilip setter tam diziye yazdığında, türetilmiş diziyi geri yazmak sessiz veri kaybıdır; yazım her zaman tam dizi üzerinde işlevsel güncellemeyle yapılmalı.
