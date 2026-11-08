# 0135 — Parça maliyeti: tek kip seçimi, çok malzeme ve işlem satırı

| | |
|---|---|
| **Durum** | **Uygulanıyor** (2026-11-08 onaylandı; plan turu Karar 30–44 aynı gün onaylandı, plan `specs/0135-uygulama-plani.md`) |
| **Sahip** | Analist (yazım) · geliştirici (uygulama) |
| **Onaylayan** | Takım Yöneticisi |
| **QA turu** | 2026-11-08, 29 bulgu (5 Bloklayıcı, 13 Önemli, 11 Küçük) işlendi; Kararlar bölümünde |
| **Ters çevrilen kriterler** | 0099'un toplam satırı kuralı (R2, R4/2, R9, AC-1…AC-10/2, AC-13, AC-15, AC-16, AC-26) ve `maliyet-kirilimdan` kaynak taraması; 0096 AC-7 / AC-13 / AC-45 ve tekrar eden tedarikçi kuralı; 0132 AC-63 / AC-72'nin tek satır dili; 0134 AC-59 (pay alanının yeri) ve AC-82 (payın yedeği) |
| **Daraltılan kriterler** | AC-43, AC-44 (türeyen kalemin adı tedarikçi adı değil), AC-53 (kalem başına pay yerine parça payının yedeği) |
| **Etkilenen alanlar** | Parça kartı (Ayarlar › Katalog › Parça/Yedek Parça; `src/components/PartManager.jsx` ve `src/components/MalzemeSatiriAlani.jsx`'in yerine geçecek yeni kalem bölümü), parça listesinin tedarikçi süzgeci, `src/lib/urunAgaci.js` (maliyetin tek okuma yolu, türetme yardımcısı), `src/lib/malzeme.js` (malzeme satırı, kullanım sayıları ve zam penceresi), `src/lib/siparisIhtiyaci.js` ile `src/components/maliyet/SiparisIhtiyaci.jsx` (0134 motoru ve ekranı), `src/lib/gider.js` ile `src/components/gider/Tedarikciler.jsx` (tedarikçi silme koruması ve kullanım metni), `src/components/MalzemeManager.jsx` (kullanım sütunu ve silme onayı), `src/components/settings/SettingsTrash.jsx` (dört kapı), `src/App.jsx` (otuz günlük temizlik), `src/lib/parcaAktarma.js` (Excel), `src/lib/merge.js`, `electron/db.cjs` (yeni sütun), `docs/evidence/kanit-eslemesi.json` |
| **Bağımlı spec'ler** | **0132** (malzeme kartı ve malzemeden maliyet; önkoşul), **0096** (hammadde kırılımı; bu spec onun yerine geçer), **0099** (kırılımın toplam satırı ve kaynak ibaresinin sayısızlığı; bu spec onun yerine geçer), 0097 (tarihli maliyet ve maliyet geçmişi), 0121 (set içeriği), 0133 (fiyat kipi deseni ve maliyetten türeyen fiyat), 0134 (sipariş ihtiyacı ve emniyet payı), 0087 (parça maliyeti ve kit), 0124 (Excel parça şablonu), 0064 (kilit alanları), 0009 (kanıt eşlemesi kuralı), 0131 ve 0109 ("kullanıcı dokundu" işareti emsali) |

---

## Intent

Fabrika yönetimi bir parçanın alış maliyetini üç ayrı yerden girebiliyor ve hangisinin geçerli olduğunu ekrandan okuyamıyor. Yeni bir yedek parça eklerken "Alış maliyeti", "Malzemeden maliyet" ve "Hammadde tedarikçileri" bölümleri aynı anda ve üçü de etkin duruyor; hangisini doldurursa ne olacağını, ötekine ne olacağını kimse söylemiyor. Kullanıcı üçünden birini rastgele seçiyor ya da hiçbirini doldurmuyor.

İkinci ve daha pahalı sorun şu: bir parça tek bir malzemeden ibaret değil. Bir sac parçası hem malzeme (sac), hem lazer kesim, hem büküm, hem kaplama tutarı taşır ve bunların tedarikçileri ayrı firmalardır. Bugün program "ya malzemeden hesapla ya tedarikçilerden topla" diyor, ikisini birden kabul etmiyor. Bu yüzden lazer kesim parası ya hiç girilmiyor ya da malzemeden hesabı bozacak şekilde elle maliyete gömülüyor; gömülünce de zam geldiğinde güncellenmiyor.

Bu iş bittiğinde kullanıcı kartta tek bir seçim yapacak: "Hesapla" ya da "Elle gir". Hesapla dediğinde tek bir kalem listesi görecek, o listeye istediği kadar malzeme ve istediği kadar işlem satırı ekleyecek, altında tek bir toplam okuyacak. Malzeme fiyatına zam geldiğinde o parçanın maliyeti kendiliğinden güncellenecek, işlem tutarları yerinde kalacak. Ekranda aynı anda birden çok yöntem görünmeyecek.

---

## Requirements

### Maliyet kipi

- **R1.** Parça kartında maliyet **tek kiple** girilir. İki kip vardır: **Hesapla** ve **Elle gir**. Aynı anda yalnız seçili kipin bölümü çizilir.
- **R2.** Kip **saklanmaz, kayıttan türer**: parçanın maliyet kalemleri varsa kip Hesapla'dır, yoksa Elle gir'dir. Kip için yeni bir kalıcı alan açılmaz.
- **R2/2.** Kipin türediği şey **saklı alan değil, türetilmiş kalem listesidir** (R23/2'nin yardımcısı). Eski malzeme satırı ya da tutarı girilmiş hammadde kırılımı taşıyan parçanın kalem alanı yoktur ama kipi Hesapla'dır (AC-4, AC-5).
- **R3.** Kip seçicisi `Segment` radyo kipindedir ve 0133'ün "Fiyat kipi" seçicisinin ikizidir: aynı bileşen, aynı yerleşim, erişilebilir adı "Maliyet kipi".
- **R3/2.** Seçeneklerin adları 0133'ün diliyle aynı olur: "Elle sabit" ve "Hesapla". Adlar tek sabit kümesinde durur ve ekranda ikinci kez yazılmaz; iki kardeş seçici aynı kavramı iki adla söylemez.
- **R4.** Kip değişince öteki kipin form alanları **temizlenir**. Temizlenecek alanda veri varsa onay sorulur ve kullanıcı vazgeçerse kip değişmez.
- **R5.** Parçanın set içeriği doluyken kip seçicisi pasiftir ve nedeni yazar: maliyet bileşenlerden gelir. Set kip listesine bir seçenek olarak girmez.
- **R5/2.** Pasiflik **iki yönlüdür**: set içeriği doluyken kalem listesi pasif ve nedenlidir, kalem listesi doluyken set içeriği bölümü pasif ve nedenlidir. Aynı anda iki yöntem birden etkin çizilmez; pasif bölümün verisi gizlice kaydedilmez (bugünkü kafa karışıklığının kaynağı tam buydu).
- **R6.** Emniyet payı alanı kipten bağımsızdır ve **iki kipte de çizilir**: malzemesi olmayan hazır parçanın da payı girilebilir (0134 R21/2 korunur).
- **R6/2.** Pay bugünkü yerinden (malzeme bölümünün ızgarası) **çıkarılır** ve kip seçicisinin altındaki kendi yerine taşınır; malzeme bölümü kip koşullu olduğu için orada kalsa Elle gir kipinde kaybolurdu. 0134 AC-59'un "malzeme listesi boşken de çizilir" iddiası yeni yere göre güncellenir, iddianın kendisi korunur.

### Maliyet kalemleri

- **R7.** Hesapla kipinde parçanın maliyeti bir **kalem listesinden** gelir. İki kalem türü vardır: **malzeme** ve **işlem**.
- **R8.** Parçanın maliyeti bütün kalemlerin **toplamıdır**. Malzeme ve işlem kalemleri birbirini dışlamaz; aynı parçada birlikte bulunabilir.
- **R9.** Bir parçanın kalem sayısı en çok **20**'dir; aşan ekleme reddedilir ve nedeni yazar.
- **R9/2.** Sınır bir **giriş kuralıdır, veri kuralı değildir**: yirmiden çok kalem taşıyan bir kayıt (içe aktarma, çakışma birleştirmesi ya da güncellenmemiş istemci) okuma anında kırpılmaz, bütün kalemleriyle okunur ve hesaplanır. Yalnız ekleme reddedilir.
- **R10.** Kalemler kullanıcının eklediği sırada durur. Sıralama, sürükleme ya da yeniden düzenleme yoktur.
- **R11.** Her kalem kendi tutarını kendi satırında gösterir; listenin altında tek bir toplam satırı vardır ve o toplam parçanın alış maliyetidir.

### Malzeme kalemi

- **R12.** Malzeme kaleminin alanları bugünkü malzeme satırının alanlarıdır (malzeme, biçim, yöntem, biçimin ölçüleri, işleme payları, fire) ve bir alan daha eklenir: **adet**.
- **R13.** Adet, bu kesimden parça başına kaç tane gerektiğidir. Tam sayıdır, en az 1, en çok 1.000, varsayılanı 1. Kesirli, sıfır, negatif ya da sayıya çevrilemez değer satırı reddeder.
- **R13/2.** Adedin ayrıştırıcısı setin içeriğindeki adetle **aynıdır** (yalnız rakam deseni); binlik ayracı kabul edilmez, yani "1.000" yazımı geçersizdir. İki hata metni ayrıdır: tam sayı olmayan değer için setin bugünkü metni, üst sınırı aşan değer için kendi metni ("Adet en çok 1.000 olabilir."). Tutar çözücüsü bu alanda kullanılmaz; "1.001" o çözücüde 1001 okunur ve üst sınır sessizce aşılırdı.
- **R14.** Malzeme kaleminin tutarı, bugünkü tek malzeme satırının hesabının adetle çarpımıdır. Ağırlık, fire, bant seçimi, boy yöntemi ve kur kuralları **değişmez**.
- **R15.** Aynı malzemeden birden çok kalem girilebilir (farklı kesit, farklı fire). Kalemler tekilleştirilmez.
- **R15/2.** İşlem kalemleri de **tekilleştirilmez**: aynı tedarikçi birden çok işlem kaleminde geçebilir (aynı firmadan lazer kesim ve büküm). 0096'nın "bu tedarikçi bu parçada zaten var" kuralı, seçicinin seçilmiş tedarikçileri listeden çıkarması ve ekleme düğmesinin kullanılmamış tedarikçi kalmasına bağlı olması **kalkar**. Kalemin kimliği yaptığı iştir, tedarikçisi değil.
- **R16.** Bir malzeme kalemi çözülemiyorsa (malzeme seçilmemiş, ölçü eksik, özgül ağırlık, kilo fiyatı ya da kur eksik) **parçanın maliyeti "girilmedi"dir**. Kısmi toplam yazılmaz, sıfır yazılmaz.

### İşlem kalemi

- **R17.** İşlem kaleminin alanları: **ad** (zorunlu), **tedarikçi** (isteğe bağlı), **tutar** (TL, KDV hariç).
- **R17/2.** Tedarikçi seçicisi **bütün canlı tedarikçileri** listeler ve 0096'nın "hammadde tedarikçisi" işaretine bakmaz; işaretli olanlar listenin başında durur (0132'nin ana tedarikçi seçicisinin deseni). Lazer kesim ya da kaplama yapan firma hammadde tedarikçisi değildir; işareti şart koşmak kullanıcıyı o işareti yanlış yere koymaya zorlar ve işaretin anlamını bozar. Bölümün boş durumu da artık o işaretin konduğu yeri adres göstermez.
- **R18.** Adı boş olan işlem kalemi reddedilir. Tedarikçisi boş olan kalem geçerlidir: fabrikanın kendi yaptığı işlem tedarikçi taşımaz.
- **R18/2.** Ad kırpılarak saklanır, uzunluk sınırı yoktur ve aynı ad iki kalemde serbesttir (R15/2 ile aynı gerekçe: ad kullanıcının kendi etiketidir).
- **R19.** Tutarı boş olan işlem kalemi **uyarı verir, kaydı engellemez** ve toplama girmez (0096 R8 emsali). Negatif ya da sayıya çevrilemez tutar satırı reddeder.
- **R19/2.** Tutar 0132'nin **belirsiz sayı** kuralını izler: tek noktalı ve noktadan sonra üç ya da daha çok haneli virgülsüz metin reddedilir ve nedeni yazar; geçerli tutar iki ondalığa yuvarlanarak saklanır. Bugünkü kırılım tutarı bu kuralın dışındaydı ve "2.400" değerini 2400 okuyordu; işlem tutarı doğrudan maliyete, oradan türetilmiş satış fiyatına ve makina maliyetine girdiği için bu sessiz bin kat hatası burada kapatılır.
- **R20.** İşlem tutarı **sabittir ve zam zincirine girmez**. Bu, kalem listesinin altında bir cümleyle yazılır.
- **R20/2.** Listenin altındaki üç ibare **koşullu** çizilir: zam cümlesi en az bir işlem kalemi varken, tarihli okumanın karma olduğunu söyleyen cümle (R35/4) malzeme ve işlem kalemi birlikte varken, geçmişin malzemenin fiyat geçmişinden geldiğini söyleyen cümle (R35/2) en az bir malzeme kalemi varken. Koşulsuz üç satır boş bir listede de görünür ve ekranı bu spec'in kapatmaya çalıştığı gürültüye geri döndürürdü.
- **R21.** İşlem kaleminin **tedarikçi seçicisi yalnız gider yetkisi olan kullanıcıda** çizilir; ad ve tutar her kullanıcıda görünür. Yetkisiz kullanıcının kaydı tedarikçi bağını korur, silmez.

### Eski kayıtlar ve yazım

- **R22.** **Göç yoktur.** Veritabanındaki eski kayıtlar olduğu gibi kalır ve okuma anında çözülür.
- **R23.** Kalem listesi boş olan parçada liste eski alanlardan **türetilir**: var olan malzeme satırı bir malzeme kalemi olur (adet 1), tutarı girilmiş hammadde kırılımı satırlarının her biri bir işlem kalemi olur.
- **R23/2.** Türetme **tek saf yardımcıda** yapılır ve bütün tüketiciler kalem listesini oradan okur: maliyetin tek okuma yolu, sipariş ihtiyacı, zam etki önizlemesi, malzeme ve tedarikçi korumaları, Excel'in iki yönü, birleştirme, kip türetmesi ve parça kartı. Hiçbir tüketici "kalem yoksa eski alana bak" dalını kendi içinde yazmaz; kaynak taraması bunu sabitler. On bir okuma yerinin her birinin kendi dalını yazması bu projede Finans ile aylık raporun iki kez ayrışmasının nedeniydi (tuzak 2).
- **R24.** Kırılımdan türeyen işlem kaleminin adı **sabittir** ("Hammadde alımı"); tedarikçinin adı kaleme ad olarak yazılmaz. Tedarikçi, kalemin gider yetkisine bağlı tedarikçi alanında durur ve adı orada bugünkü iki ibareyle çözülür ("silinmiş tedarikçi", "kaydı bulunamayan tedarikçi"). Gider yetkili kullanıcı sabit adı düzenleyebilir.
- **R24/2.** Gerekçe yazılıdır: adı tedarikçiden türetmek, R21'in "ad her kullanıcıda görünür" kuralıyla birleşince 0096 ve 0099'un bilinçli gizlilik kararını sessizce geri alır ve Ayarlar sekmesi olan ama gider yetkisi olmayan kullanıcı tedarikçi adlarını kalem adı olarak okur. Sabit ad hem R18'in boş ad yasağını karşılar hem gizliliği korur.
- **R25.** Parça kartı kaydedildiğinde **yalnız yeni kalem alanı yazılır** ve eski iki alan (malzeme satırı, hammadde kırılımı) kayıttan **silinir**. İki doğruluk kaynağı bırakılmaz.
- **R25/2.** Silinen alan üç tanedir: malzeme satırı, hammadde kırılımı **ve elle girilen maliyet**. Kalem listesi dolu kaydedilen parçada elle maliyet anahtarı her çağrıda silinir (bugünkü "kırılımda tutar varsa elle alan yazılmaz" kuralının ikizi). İki doğruluk kaynağı bırakmamak kararı üç alan için birden uygulanır.
- **R25/3.** Set içeriği dolu kaydedilen parçada kalem alanı **hiç yazılmaz** (R25'in ikizi): maliyet bileşenlerden geldiği için saklı bir kalem listesi okunmayan ikinci kaynak olurdu.
- **R26.** Kullanıcının dokunmadığı parçanın kaydedilen gövdesi **birebir** eskisi gibi kalır: kartı açıp kapatmak ya da başka bir alanını değiştirmek tek başına kalem alanı yazmaz.
- **R26/2.** Bunun mekanizması geçici bir **"kullanıcı maliyet bölümüne dokundu" işaretidir** (0131'in tarih işareti ve 0109'un kaynak işareti emsali; kayda yazılmaz): işaret yalnız kalem eklenince, silinince, bir kalem alanı değişince ya da kip değişince kurulur. Kayıt fonksiyonu yeni alanı yazmayı ve eski üç alanı silmeyi **yalnız işaret varken** yapar; işaret yoksa eski alanlar aynen geri yazılır. İşaret olmadan R26 ile AC-45'in ikisini birden sağlayan bir uygulama yoktur, çünkü parçanın adını değiştirmek de karttan kaydetmektir.

### Tüketiciler

- **R27.** Maliyetin **tek okuma yolu** değişmez: bütün ekranlar, motorlar ve raporlar maliyeti bugünkü fonksiyondan okur. Öncelik sırası set içeriği, kalem listesi, elle girilen tutar olur.
- **R27/2.** Zincir kalem listesinden elle değere **düşmez**: kalem listesi varsa ve çözülemiyorsa (bozuk malzeme kalemi ya da hepsinin tutarı boş işlem kalemleri) maliyet "girilmedi"dir, sıfır değildir ve kayıtta kalmış eski bir elle tutar okunmaz. Düşme kuralı yazılmazsa kullanıcı kalemleri boşalttığı an aylar önce girilmiş bir elle maliyet sessizce geri gelir ve kapanmış partilerin maliyetini değiştirir.
- **R28.** Sipariş ihtiyacı (0134) parçanın **bütün** malzeme kalemlerini okur; her kalem kendi ham kesitiyle kendi satırını üretir ve adediyle çarpılır.
- **R29.** Emniyet payı **parça düzeyinde kalır** ve çok kalemde şöyle çözülür: parçanın kendi payı varsa o; yoksa malzeme kalemlerinin malzemelerinde girili payların **en büyüğü**; hiçbiri yoksa sıfır. Pay 0134'teki yerinde, yani parçanın sipariş adedinde uygulanır ve kesit satırına ikinci kez girmez.
- **R29/2.** Gerekçe yazılıdır: 0134 payı parçanın bölünemez tam sayı adedine uyguluyor; iki malzeme kalemi iki farklı pay taşısa aynı adede iki pay uygulanamaz. Kalem başına pay uygulamak payı kesit tarafına (kiloya ve boy adedine) taşımak demektir, bu da C9'u ve 0134 AC-84'ü bozar ve X3'ün reddettiği işin arka kapıdan açılması olur. En büyüğünü almak güvenli taraftır: pay yetersiz kalmaz.
- **R30.** İşlem kalemi sipariş ihtiyacında **hiçbir satır üretmez**: hizmet alımıdır, malzeme değil.
- **R30/2.** Sipariş ekranının "hazır parça" sayacının **ölçütü** "malzeme kalemi yok" olarak kalır, yani yalnız işlem kalemi olan parça da sayılır; ama metni kalem diline çevrilir ("`n` parçada malzeme kalemi yok") ve malzeme tablosunun boş durumu da ("Malzeme kalemi olan parça siparişi yok."). Sayacın işi "bu parçalar malzeme ihtiyacı üretmez" demektir; ayrımı sayacın adında yapmaya çalışmak yeni bir kavram açardı.
- **R31.** Bir parçada kullanılan malzeme, bu spec'ten sonra da **kalıcı silinemez**. Koruma bütün malzeme kalemlerini okur, yalnız birinciyi değil.
- **R31/2.** Aynı soruyu soran **kullanım okumaları** da kalemleri okur: Malzemeler panelinin "Kullanım" sütunu, malzemenin silme onayındaki cümle ve bu cümlenin metni. Metin kalem diline çevrilir. Koruma kapısı doğru çalışsa bile kullanım sütunu "Hiçbir parçada kullanılmıyor" yazarsa kullanıcı silmeye kalkar, reddedilir ve nedenini anlamaz; bu, spec'in kapatmaya çalıştığı kafa karışıklığının aynısıdır.
- **R32.** Bir parçanın işlem kaleminde geçen tedarikçi de **kalıcı silinemez**; koruma bugünkü hammadde kırılımı kapısının genişletilmiş hâlidir.
- **R32/2.** Tedarikçi tarafında da kullanım okumaları kalemleri okur: Tedarikler listesinin kullanım hücresindeki parça sayısı, "silinemez" penceresinin cümlesi ve yönlendirme metni. Üç metin de kalem diline çevrilir ("Bir parçanın maliyet kaleminde geçiyor; önce Ayarlar › Katalog › Parça/Yedek Parça'da kalemden çıkarın").
- **R33.** Malzeme fiyatı güncelleme penceresinin etki önizlemesi kalemlerden okur: etkilenen parça, o malzemeyi **herhangi bir kaleminde** kullanan parçadır.
- **R34.** Çakışma birleştirmesinde kalemlerin malzeme ve tedarikçi bağları yeniden eşlenir (bugünkü iki yeniden eşleme kuralının genişletilmiş hâli).
- **R34/2.** Kalem içindeki iki eşleme **eklenir**, bugünkü üç eşleme (hammadde kırılımının tedarikçisi, setin içeriğindeki parça, malzeme satırının malzemesi) **kalır**. Göç olmadığı ve C7 karışık sürümü beklediği için güncellenmemiş bir istemci hâlâ eski alanlı parça ekler; eski eşlemeler kaldırılsa o parça yanlış tedarikçiye ya da yanlış malzemeye bakardı.
- **R35.** Maliyet geçmişi kapısı korunur: parçanın **en az bir malzeme kalemi** varsa geçmiş yazılmaz ve okunmaz. Yalnız işlem kalemi olan parçada bugünkü kırılım davranışı aynen sürer.
- **R35/2.** Geçerlilik tarihi alanı ve maliyet geçmişi listesi, **en az bir malzeme kalemi** olan parçada çizilmez. Bugünkü gibi sessizce gizlenmez: yerlerine tek satırlık bir ibare yazılır ve geçmişin malzemenin kendi fiyat geçmişinden geldiğini söyler.
- **R35/3.** Yalnız işlem kalemi olan parçada geçerlilik tarihi alanı ve geçmiş listesi bugünkü hammadde kırılımı davranışıyla **aynen** çizilir ve etkindir (0097 R5/3 korunur).
- **R35/4.** Tarihli maliyet okumasında malzeme kalemleri **o tarihte geçerli** malzeme fiyatıyla, işlem kalemleri **bugünkü** tutarıyla girer. Karma parçanın geçmiş tarihli maliyeti bu yüzden kısmen bugünkü veriden gelir; bu, kalem listesinin altındaki ibarede yazılır.
- **R36.** Malzeme kalemleri kaldırılıp kip Elle gir'e geçilince, geçmişe o güne kadarki çözülmüş maliyet yazılır (0132'nin bugünkü kuralı aynen).
- **R37.** Excel dışa aktarmasında Hesapla kipindeki parçanın maliyeti **çözülmüş değeriyle** yazılır. İçe aktarmada o parçanın maliyet hücresi kayda yazılmaz; yürürlükteki değerden farklıysa satır numarasıyla bildirilir.
- **R37/2.** Bugünkü **iki** bildirim metni (malzeme satırlı parça, kırılımlı parça) tek metne iner: "bu parçanın maliyeti maliyet kalemlerinden geliyor, Excel'deki değer alınmadı." İki metin bırakmak, iki mekanizmayı bire indirme amacının Excel tarafında delinmesi olurdu.
- **R37/3.** İçe aktarma kalem alanına ve eski üç alana **dokunmaz**: R26/2'nin işaretini kurmaz, dolayısıyla kullanıcının hiç dokunmadığı parçaların eski alanlarını silmez. Yoksa tek bir Excel turu bütün kataloğun eski alanlarını siler ve karışık sürümde (C7) veri kaybına yol açardı.
- **R38.** Parça şablonuna **yeni sütun eklenmez**; sütun sayısı on birde kalır.
- **R39.** Maliyetin kaynağını söyleyen ibare **tek metne** iner: kalemlerden hesaplandığını ve kaç malzeme, kaç işlem kaleminden geldiğini yazar. Eski iki ayrı ibare (malzemeden, hammadde kırılımından) kalkar.
- **R39/2.** Yeni ibare **yetki istemez**: iki kullanıcı türünde aynı metin görünür ve parça kartında da aynı tek metin çizilir; yetkisiz kullanıcıya özel rakamlı satır kalkar. Metin tedarikçi kimliği taşımadığı için 0099'un "sayı yetkisiz kullanıcıya gösterilmez" gerekçesi bu metinde geçerli değildir; kapı koymak yetkisiz kullanıcıya maliyetin nereden geldiğini hiç göstermemek olurdu (Karar 2'nin mantığıyla çelişir).
- **R39/3.** Kaynaktan kalkacak metinler **tek tek sayılır**, "iki ibare" diye genellenmez: kırılım ve malzeme kaynak ibareleri, kırılımın rakamlı satırı, listedeki tedarikçi sayısı metni, hammadde bölümünün başlığı, ipucusu, boş durumu, toplam satırının üç metni, tutarsız uyarısı, Excel'in iki hata metni ve malzeme kullanım korumasının iki metni. Kalanlar gerekçeli istisna olarak yazılır. Liste spec'te olmazsa iki geliştirici iki farklı küme seçer ve "eski ibare kalmadı" iddiası ölçülemez olur.

### Boş durumlar ve hatalar

- **R40.** Hesapla kipinde hiç kalem yokken liste yerine boş durum çizilir ve iki ekleme düğmesi görünür: malzeme ekle, işlem ekle.
- **R41.** Malzeme kataloğu boşken malzeme ekleme düğmesi pasiftir ve nedeni malzemelerin nereden eklendiğini adıyla söyler.
- **R42.** Tedarikçi listesi boş olsa da işlem kalemi eklenebilir; tedarikçi isteğe bağlıdır.
- **R43.** Hatalı kalem kendi satırının altında nedeniyle gösterilir. Hatalı malzeme kalemi kaydı engeller; tutarı boş işlem kalemi yalnız uyarır.
- **R44.** Çöpteki ya da kaydı bulunamayan malzemeyi taşıyan kalem seçicide adıyla ve "silinmiş malzeme" işaretiyle kalır, silinmez (0132 emsali).

### Alan, süzgeç ve sayaç

- **R45.** Kalıcı alanın adı ve şekli yazılıdır: `parts.maliyetKalemleri = [{ tur: "malzeme" | "islem", … }]`. Malzeme kaleminde bugünkü malzeme satırının alanları **düz** durur (malzeme kimliği, biçim, yöntem, biçimin ölçüleri, işleme payları, fire) ve yanına `adet` eklenir; işlem kaleminde `ad`, `tedarikciId` (yoksa anahtar yazılmaz) ve `tutar` (girilmemişse `null`) durur. Boş liste NULL yazılır ve okumada gövdeye hiç girmez.
- **R45/2.** Düz şekil bilinçlidir: bugünkü malzeme hesabının beş yardımcısı (satır doğrulayıcısı, satır özeti, ham ölçüler, ham kesit, tam boy ağırlığı) fazladan alanı yok saydığı için kalem nesnesi onlara olduğu gibi verilebilir; iç içe nesne beş çağrı yerinde sarmalayıcı isterdi. `tur` alanı zorunludur: tür ayırıcısı olmadan birleştirme malzeme kalemini işlemden ayırt edip hangi bağı eşleyeceğini bilemez.
- **R46.** Parça listesinin **tedarikçi süzgeci** kalem listesini okur: seçenek kümesi, parça sayıları ve "girilmemiş" seçeneği türetilmiş listedeki işlem kalemlerinin tedarikçisinden gelir. Süzgecin adı "Tedarikçi süzgeci" olur, "girilmemiş" seçeneği "işlem kaleminde tedarikçi girilmemiş parça" anlamına gelir.
- **R46/2.** Gerekçe yazılıdır: süzgeç bugün hammadde kırılımını okuyor; göç olmadığı için dokunulmamış parçada çalışmaya devam eder, düzenlenen parçada alan silineceği için düşer ve aynı listede iki farklı kural işler. Türetilmiş listeden okumak göçsüz modelin tek tutarlı yoludur.
- **R47.** Maliyeti girilmemiş parça sayacı ile 0133'ün toplu kip onayındaki maliyetsiz parça sayısı **aynı tek okuma yolundan** gelir; kalem listesi çözülemeyen parça ikisinde de sayılır. İki sayının ayrışması onay cümlesini yanlış yapardı.

---

## Constraints

### Uyulması zorunlu

- **C1.** Maliyetin **tek okuma yolu** korunur. Ekranlar, motorlar ve raporlar maliyeti kendi hesaplarıyla türetmez; kalemleri toplayan ikinci bir yer yazılmaz. Kaynak taraması bugünkü gibi bunu sabitler.
- **C1/2.** Kalem listesinin **türetmesi de tek yoldur** (R23/2): hiçbir tüketici eski iki alanı doğrudan okumaz, "kalem yoksa eski alana bak" dalını kendi içinde yazmaz. Kaynak taraması bunu da sabitler ve C8'in kıyas güvencesi buradan gelir: dönüşüm tek yerde ölçülür.
- **C2.** Hesap React'sız **saf motorda** yazılır; parça kartı çarpım ve toplama yapmaz, kalemlerin tutarını ve toplamını motorun tek sonucundan okur (0099 C1/2 deseni).
- **C3.** Kip **ikinci bir doğruluk kaynağı olarak saklanmaz**. Kayıtla çelişebilecek bir kip alanı açılmaz.
- **C4.** Yeni kalıcı alan **dört nokta kuralıyla** eklenir ve boş liste gövdeye yazılmaz (0121 `setIcerigi` ve 0132 `malzemeSatiri` emsali).
- **C4/2.** Alanın şekli spec'te yazılıdır (R45) ve uygulamada ondan sapılmaz: dört nokta, birleştirme, roundtrip testi ve motorun kendisi aynı şekle bağlıdır; şekil spec'te olmazsa dört yer birbirinden ayrışır.
- **C5.** Çöp kutusu simetrisi korunur: malzemenin ve tedarikçinin kalıcı silme korumaları **dört kapıda birden** (satırın kendi düğmesi, Çöp Kutusu'nun Kalıcı Sil'i, çöpü boşalt, otuz günlük temizlik) kalemleri okur.
- **C5/2.** Dört kapının yanında **kullanım okumaları** da kalemleri okur (R31/2, R32/2): Malzemeler panelinin kullanım sütunu ve silme onayı, Tedarikler listesinin kullanım hücresi ve "silinemez" penceresi. Kapı ile sayacın ayrışması kullanıcıya nedeni olmayan bir ret gösterir.
- **C6.** **Yeni eylem izni eklenmez.** Parça kartı bugünkü izinleriyle yazılır; işlem kaleminin tedarikçi seçicisi var olan gider yetkisi kapısını kullanır. Sunucu tarafında yeni bölüm ya da yeni kural yoktur.
- **C6/2.** 0096 ve 0099'un **gizlilik çizgisi korunur**: tedarikçi kimliği (adı dâhil) gider yetkisi olmayan kullanıcıya hiçbir yerde gösterilmez. Bu yüzden türeyen kalemin adı tedarikçiden türetilmez (R24) ve kalemin tedarikçi alanı gider yetkisine bağlı kalır. Kalem **sayıları** tedarikçi kimliği taşımadığı için bu çizginin dışındadır (R39/2).
- **C7.** **Sürüm notu zorunludur:** önce sunucu PC, sonra bütün istemciler. Güncellenmemiş bir istemci yeni kalem alanını tanımaz; o bilgisayarda düzenlenen parçanın maliyeti kaybolur. Güncelleme bitene kadar parça kartında maliyet düzenlenmez.
- **C7/2.** Sürüm notu iki bilinen sonucu da yazar: (1) yalnız işlem kalemi olan bir parçaya ilk malzeme kalemi eklenince o parçanın kayıtlı maliyet geçmişi okunmaz olur ve geçmiş tarihli maliyeti değişir (0132'den devralınan sınır, AC-85); (2) işlem tutarları zam zincirine girmediği için eskidikçe maliyeti düşük gösterir (X1'in kabul edilmiş bedeli).
- **C8.** **Kıyas zorunludur:** kalem alanı olmayan veride maliyet zinciri, sipariş ihtiyacı, model maliyetleri, Excel çıktısı ve türetilmiş satış fiyatı spec öncesi koddan üretilmiş altınla **birebir** aynı kalır.
- **C9.** Bugünkü hesap kuralları değişmez: ağırlık, işleme payı, fire, bant seçimi, boy yöntemi, kuruşa yuvarlama ve tarihli okuma 0132'deki hâliyle kalır. Bu spec yalnız **kaç satır olduğunu** ve **nasıl girildiğini** değiştirir.
- **C9/2.** Emniyet payının **uygulandığı yer** de değişmez: pay 0134'teki gibi parçanın sipariş adedini büyütür, kesit satırının kilosuna ya da boy adedine girmez (R29, 0134 AC-84). Yuvarlama sırası ve parça tablosunun iki sütunu dokunulmadan kalır.
- **C10.** Kalemin tutarının yuvarlama sırası yazılıdır: malzeme kaleminin tutarı bugünkü tek satır hesabının **kuruşa yuvarlanmış** değerinin adetle çarpımıdır (AC-23'ün "tam iki katı" iddiası bunu sabitler), parçanın maliyeti de kalemlerin kuruş tutarlarının toplamıdır. Toplam ikinci kez yuvarlanmaz.

### KAPSAM DIŞI

- **X1.** İşlemlerin fiyatlı kataloğu (kilo ya da adet başına fiyat, fiyat geçmişi, zam penceresi) — *neden:* ikinci bir fiyatlı katalog bu spec'i iki katına çıkarır. İşlem satırı ileride bir katalog kaydına bağlanabilecek biçimde tasarlanır ama bugün bağlanmaz.
- **X2.** İşlem kaleminin birimi (kilo, adet, metre) — *neden:* birim ancak fiyatlı katalog gelince anlam kazanır; bugün tutar parça başına tek rakamdır.
- **X3.** Kalem bazında emniyet payı — *neden:* 0134 Karar 28 payı parça düzeyinde kararlaştırdı; kaleme bölmek sipariş motorunun yuvarlama sırasını karmaşıklaştırır ve kullanıcı için de iki yerde pay demektir.
- **X4.** Excel şablonuna kalem sütunu — *neden:* bir malzeme kalemi on beş alan taşır, tek hücreye 0124'ün set sütunu gibi sığmaz. Excel maliyeti okumaya devam eder, yazmaz.
- **X5.** Set içeriğinin kip listesine girmesi — *neden:* set parçanın ne olduğudur, maliyet yöntemi değil; kip listesine koymak kavramı yanlış adlandırır.
- **X6.** İşlem kaleminin stok ya da sipariş ihtiyacı üretmesi — *neden:* hizmet alımıdır, raf malzemesi değil.
- **X7.** Maliyet geçmişinin kalemlere genişletilmesi, yani her işlem kaleminin kendi tarihli tutar listesi — *neden:* malzeme kaleminin geçmişi zaten malzemenin kendi fiyat geçmişidir, ikinci bir geçmiş iki doğruluk kaynağı olur; işlem tutarları için ayrı geçmiş tutmak ise X1'in reddettiği fiyatlı kataloğun yarısını arka kapıdan açmak demektir. Bedeli R35/4'te yazılı ve kabul edilmiştir: karma parçanın geçmiş tarihli maliyetinde işlem tarafı bugünkü tutarıyla girer.
- **X8.** Modelin ek maliyet kalemleriyle (0087) birleştirme — *neden:* o makina başınadır, bu parça başına; ikisi farklı kavramdır ve farklı ekranlarda yaşar.
- **X9.** Kalemlerin sürüklenerek sıralanması — *neden:* toplam sıraya bağlı değildir, sıralama yalnız görsel tercihtir.
- **X10.** Genel aramanın kalemleri araması — *neden:* 0132 X11 ile aynı gerekçe; malzeme ve tedarikçi zaten kendi kategorilerinde aranıyor.

---

## Context

### Bugün ne var (2026-11-08, kodda doğrulandı)

Parçanın maliyeti dört kaynaktan gelebiliyor ve öncelik `src/lib/urunAgaci.js:55` `parcaMaliyetKurus` ile `src/lib/urunAgaci.js:60` `tekilMaliyetKurus` içinde sabit:

**set içeriği > malzeme satırı > hammadde kırılımı > elle girilen tutar**

Kaynağın adı `src/lib/urunAgaci.js:180` `maliyetKaynagi` ile türetiliyor; saklanmıyor.

Kalıcı alanlar ve sütunları (`electron/db.cjs`):

| Alan | Sütun | Şekli | Spec |
|---|---|---|---|
| `parts.maliyet` | `PARTS_MALIYET_COLUMN`, REAL | TL, KDV hariç | 0087 |
| `parts.hammaddeler` | `PARTS_HAMMADDE_COLUMN`, TEXT JSON | `[{tedarikciId, tutar}]` | 0096 |
| `parts.maliyetGecmisi` | `PARTS_MALIYET_GECMISI_COLUMN`, TEXT JSON | `[{gecerli, kurus}]` | 0097 |
| `parts.setIcerigi` | `PARTS_SET_ICERIGI_COLUMN`, TEXT JSON | `[{partId, miktar}]` | 0121 |
| `parts.malzemeSatiri` | `PARTS_MALZEME_SATIRI_COLUMN`, TEXT JSON | **tek nesne** (0132 Karar 28) | 0132 |
| `parts.emniyetPayi` | `EMNIYET_PAYI_COLUMN`, REAL | yüzde | 0134 |

### Ekran neden kafa karıştırıyor

`src/components/PartManager.jsx:729-737` (ekleme) ve `:790-801` (düzenleme) dört bölümü **sırayla ve hepsini birden** çiziyor: `MaliyetAlani`, `MalzemeSatiriAlani`, `HammaddeAlani`, `SetIcerigiAlani`. Biri dolunca aşağıdakiler `fieldset disabled` ile soluyor (`pasif={!!canliEkle?.set}`, `disabled={!!canliEkle?.set || !!canliEkle?.malzeme}`).

**Yeni parçada dördü de boş olduğu için üçü birden etkin.** Öncelik kuralı motorda yazılı ama ekranda hiçbir yerde yazmıyor. Kullanıcının ekrandan okuyabileceği tek şey üç paralel yöntemin varlığı.

Ayrıca pasif bölümün verisi formda duruyor ve kaydedilmiyor; kullanıcı doldurduğu bir alanın sessizce yok sayıldığını görmüyor.

### Neden dışlayıcı model yetmiyor

Bugün malzeme satırı hammadde kırılımını **bastırıyor** (`tekilMaliyetKurus`: malzeme satırı varsa kırılıma hiç bakılmıyor). Yani bir parçanın hem sac malzemesini hem lazer kesim bedelini girmenin yolu yok.

Uygulamadaki tek çare elle maliyete gömmek, ama elle maliyet zam zincirinin dışındadır: paslanmazın kilosu değiştiğinde o parça güncellenmez. 0132'nin bütün amacı o zinciri kurmaktı; bu boşluk zinciri parça parça delmektedir.

### Dokunulacak okuma yerleri (ölçüldü)

`malzemeSatiri` okuyan yedi dosya:
`src/components/MalzemeSatiriAlani.jsx`, `src/components/PartManager.jsx`, `src/lib/malzeme.js`, `src/lib/merge.js`, `src/lib/parcaAktarma.js`, `src/lib/siparisIhtiyaci.js`, `src/lib/urunAgaci.js`.

`hammaddeler` okuyan dört dosya:
`src/components/PartManager.jsx`, `src/lib/gider.js`, `src/lib/merge.js`, `src/lib/urunAgaci.js`.

Kritik okuma noktaları:

| Yer | Bugün | Olması gereken |
|---|---|---|
| `urunAgaci.js:60` `tekilMaliyetKurus` | tek satır, dışlayıcı | kalemler toplamı |
| `urunAgaci.js:180` `maliyetKaynagi` | dört tür | üç tür (içerik, kalem, elle) |
| `malzeme.js:401` `kullanilanMalzemeler` | `p.malzemeSatiri.malzemeId` | bütün malzeme kalemleri |
| `malzeme.js:416` `fiyatEtkisi` | tek satırdan | kalemlerden |
| `siparisIhtiyaci.js:87` `emniyetPayiOf` | tek satırın malzemesi | kalem başına yedek |
| `siparisIhtiyaci.js:184` | `const satir = p.malzemeSatiri` | kalemler üzerinde döngü |
| `siparisIhtiyaci.js:190` `hamKesit` | tek kesit | kalem başına kesit |
| `gider.js:1051` tedarikçi koruması | `p.hammaddeler` | işlem kalemleri |
| `merge.js:198-210` | üç yeniden eşleme | ikisi kalemlerin içinde, üçü yerinde kalır (R34/2) |
| `parcaAktarma.js:165,190,210` | `malzemeSatiriVar` | kalem var mı |
| `malzeme.js:393` `malzemeKullanimi` | `p.malzemeSatiri` | bütün malzeme kalemleri (R31/2) |
| `gider.js:1066` `tedarikciKullanim` | `p.hammaddeler` | işlem kalemleri (R32/2) |
| `PartManager.jsx:451,479,484,594` tedarikçi süzgeci | `p.hammaddeler` | türetilmiş kalem listesi (R46) |
| `siparisIhtiyaci.js:234` `hazirSayi` | `!k.malzemeli` | malzeme kalemi yok (R30/2) |
| `PartManager.jsx:386` `hazirlaTemel` | iki alanı siler | üç alanı siler, işaretle (R25/2, R26/2) |

### Bilinen tuzaklar

1. **Dört nokta kuralı.** Yeni `maliyetKalemleri` sütunu `SCHEMA_SQL`, `applyColumnMigrations`, `INSERT` ve `SELECT` olmak üzere dört yere yazılmazsa değer sessizce düşer. Boş liste NULL yazılır ve okumada gövdeye hiç girmez.
2. **Okuma yolunu ikiye bölme.** Kalemleri toplayan ikinci bir fonksiyon yazılırsa iki ekran farklı rakam gösterir; bu projede Finans ile aylık rapor iki kez bu yüzden ayrıştı.
3. **Çöp koruması.** Malzemenin ya da tedarikçinin kullanımını yalnız birinci kalemden okumak, ikinci kalemde geçen kaydın kalıcı silinmesine ve yetim kaleme yol açar. Koruma dört kapıda birden genişletilmeli.
4. **Karışık sürüm.** Eski istemci yeni alanı tanımaz ve kaydı yazarken düşürür. Sürüm notu zorunlu.
5. **Maliyet geçmişi kapısı.** Kapıyı "kalem var mı" diye genişletmek, yalnız işlem kalemi olan parçanın geçmişini de susturur ve 0097 davranışını değiştirir. Kapı **malzeme kalemi var mı** olarak dar kalmalı.
6. **Form kopyası.** Parça kartı düzenlemeyi `{ ...kayit, ...form }` ile birleştirir; kayıt fonksiyonu eski iki alanı **her çağrıda silmezse** boşaltılan malzeme satırı geri gelir (0096'nın `hazirla` dersi).
7. **Emniyet payı yeri.** Pay bugün malzeme bölümünün içinde çiziliyor ama parçanın kendi alanı; kip değişince kaybolmamalı.
8. **Payın uygulandığı yer.** Pay 0134'te parçanın **adedine** uygulanıyor, malzemenin kilosuna değil. Kalem başına farklı pay istemek payı kesit tarafına taşımak demektir ve 0134'ün bütün yuvarlama sırasını bozar (R29/2).
9. **Belirsiz sayı.** Kırılım tutarı bugün `tutarCoz` ile çözülüyor ve `gider.js:41` gereği "2.400" değerini 2400 okuyor. 0132 bu tuzağı malzeme alanlarında kapattı; işlem tutarı aynı kuralı almazsa bin kat sessiz hata açık kalır (R19/2).
10. **Türeyen adın gizliliği.** Kırılım satırından türeyen kalemin adını tedarikçiden almak, 0096 ve 0099'un bilinçli gizlilik kararını sessizce geri alır (R24, C6/2).
11. **Dokunmayan kaydı değiştirme.** Parça kartı düzenlemeyi `{ ...kayit, ...form }` ile birleştirdiği için parçanın **adını** değiştirmek de kalem alanını yazar ve eski alanları siler; işaret olmadan R26 ile AC-45 birlikte sağlanamaz (R26/2).
12. **Kanıt kayıtları.** `docs/evidence/kanit-eslemesi.json` içinde parça kartının bütün ekran kayıtları `beklenen: "ayni"`; bu iş kartı bilerek değiştirdiği için kayıtlar `degisti` ve onay satırına çevrilmeli, yoksa kanıt eşlemesi testi kırılır.

### Karar kaydı (2026-11-08)

| No | Soru | Karar | Gerekçe |
|---|---|---|---|
| 1 | Üç yöntem nasıl sadeleşsin? | Tek kip seçici, iki değer | 0133'ün fiyat kipi deseni kullanıcıya tanıdık |
| 2 | Kip saklansın mı? | Hayır, kayıttan türesin | İkinci doğruluk kaynağı kayıtla çelişir |
| 3 | Set kipe girsin mi? | Hayır, ayrı kalsın, kipi pasif yapsın | Set parçanın ne olduğudur |
| 4 | Malzeme ve işlem dışlayıcı mı toplanır mı? | Toplanır | İstenen davranış tam olarak bu |
| 5 | Hammadde kırılımı kalsın mı? | İşlem kalemine dönüşsün | İki mekanizma yerine bir |
| 6 | İşlem fiyatı zam zincirine girsin mi? | Hayır, sabit TL | Fiyatlı katalog spec'i iki katına çıkarır; kapı açık bırakılır |
| 7 | Göç yazılsın mı? | Hayır, okuma anında çözülsün | Evin deseni; dokunulmayan kayıt değişmez |
| 8 | Eski alanlar korunsun mu? | Hayır, yazımda silinsin | İki doğruluk kaynağı bırakmamak |
| 9 | Malzeme kaleminde adet olsun mu? | Evet, tam sayı 1..1000 | Aynı kesimden iki tane olan parça tek satırla girilsin |
| 10 | Kip değişince veri ne olsun? | Temizlensin, dolu ise onay sorulsun | Gizli duran veri bugünkü kafa karışıklığının kaynağı |
| 11 | Geçerlilik tarihi üç yöntemin hangisinde geçerli? | Bugünkü dar kapı korunur: malzeme kalemi varsa yok, yoksa var | Malzemenin kendi fiyat geçmişi zaten var; parçaya ikinci geçmiş yazmak iki doğruluk kaynağı olur. Yalnız işlem kalemli parça bugünkü kırılım davranışını aynen sürdürür, 0097 bozulmaz |
| 12 | Alan kaybolunca kullanıcı ne görsün? | Sessiz gizleme yerine tek satır ibare | Sessizce kaybolan alan, bu spec'in kapatmaya çalıştığı kafa karışıklığının aynısı |

### QA turunda ölçülenler (2026-11-08)

Aşağıdaki her satır HEAD'deki kodda doğrulandı; kriterler bu ölçümlere dayanıyor.

- **Ölçüm A.** `urunAgaci.js:55` `parcaMaliyetKurus` ile `:60` `tekilMaliyetKurus` dört kaynağı dışlayıcı sırayla okuyor; `:180` `maliyetKaynagi` dört tür döndürüyor. Spec'in `:63` atfı üç satır eskimişti.
- **Ölçüm B.** Alanın adı (`maliyetKalemleri`) spec'te yalnız tuzak 1, AC-45, AC-48, AC-77 ve DoD'de geçiyordu; şekli, tür ayırıcısı ve boş tutarın gösterimi hiçbir yerde yazılı değildi. Karşılaştırma: 0121 `setIcerigi = [{partId, miktar}]`, 0132 `malzemeSatiri` tek nesne, 0096 `hammaddeler = [{tedarikciId, tutar}]`, üçü de kendi spec'inin Context tablosunda şekliyle yazılı.
- **Ölçüm C.** `siparisIhtiyaci.js:87` `emniyetPayiOf` parça başına tek sayı döndürüyor ve pay `:132`'de parçanın **adedine** uygulanıyor; kesit satırına giden değer `:206`'da `k.siparis`, yani paylı adet. Parça tablosunun "Emniyet payı" ve "İhtiyaç" sütunları (`SiparisIhtiyaci.jsx:112-115`) bu tek sayıyı basıyor. 0134 AC-84 payın ikinci kez uygulanmadığını sabitliyor.
- **Ölçüm D.** Hammadde bölümü bütünüyle gider yetkisine bağlı: `PartManager.jsx:735` ve `:799` `giderYetki &&` ile çiziyor, `Settings` tedarikçi dizisini yetkisizde `[]` geçiriyor, `MaliyetAlani` yetkisize yalnız rakamı veriyor (`maliyet-kirilimdan`), 0099 R9 tedarikçi sayısının yetkisize gösterilmemesini karara bağlamış.
- **Ölçüm E.** `PartManager.jsx:502` `openEdit` formu bütün maliyet alanlarıyla dolduruyor ve `:398` `hazirla` düzenlemeyi `{ ...eski, ...form }` ile birleştiriyor; yani parçanın adını değiştiren kayıt da maliyet alanlarını yeniden yazıyor.
- **Ölçüm F.** `hazirlaTemel` (`PartManager.jsx:386`) kırılımda tutar varsa `maliyet` anahtarını her çağrıda siliyor; spec R25 bu alanı hiç anmıyordu. `maliyetGecmisiYaz`'ın eski değeri (`urunAgaci.js:131`) `bugunkuKurus` üzerinden `p.maliyet`'i okuyor.
- **Ölçüm G.** Parça listesinin tedarikçi süzgeci dört yerde `p.hammaddeler` okuyor: `suzgecFn` (`:451`), `suzgecSecenekleri` (`:479`), `girilmemisSayi` (`:484`) ve seçicinin kendisi (`:594`, erişilebilir ad "Hammadde tedarikçisi süzgeci").
- **Ölçüm H.** `HammaddeAlani`'nın tedarikçi seçicisi yalnız `hammadde === true` işaretli tedarikçileri listeliyor (`PartManager.jsx:172` `hammaddeSecilebilirMi`) ve boş durumu işaretin Giderler ekranından konduğunu yazıyor (`HAMMADDE_BOS_METNI`).
- **Ölçüm I.** `hammaddeDogrula` (`urunAgaci.js:224`) aynı tedarikçiyi ikinci satırda reddediyor, seçici seçilmiş tedarikçileri listeden çıkarıyor ve "Tedarikçi ekle" düğmesi yalnız kullanılmamış tedarikçi kaldıkça çiziliyor (`:204`).
- **Ölçüm J.** Kırılım tutarı `tutarCoz` ile çözülüyor (`urunAgaci.js:218`); `gider.js:41` `noktaOndalikMi` gereği "2.400" 2400 okunuyor. 0132 aynı tuzağı `malzeme.js:42` `BELIRSIZ_DESEN` ile kapattı, 0133 katta aynı kuralı uyguladı.
- **Ölçüm K.** Malzemenin ve tedarikçinin kullanımını soran beş okuma var: koruma tarafında `malzeme.js:401` `kullanilanMalzemeler` ve `gider.js:1051` `kirilimdaGecenTedarikciler` (dört kapı: `SettingsTrash.jsx:229-242`, `:360`, `:388` ve `App.jsx:1116`, `:1119`), sayaç tarafında `malzeme.js:393` `malzemeKullanimi` (`MalzemeManager.jsx:141`, `:206`) ve `gider.js:1066` `tedarikciKullanim` (`Tedarikciler.jsx:102`, `:149`).
- **Ölçüm L.** `docs/evidence/kanit-eslemesi.json` içinde `PartManager.jsx` ve `MalzemeSatiriAlani.jsx` kayıtlarının hepsi `beklenen: "ayni"` (`katalog-parca`, `katalog-parca-yeni`, `katalog-parca-0096-kirilim`, `-tutarsiz`, `-bos`, `-hata`, `katalog-parca-0097-gecmis`, `katalog-parca-0132-malzeme`, `ayarlar-yedekparca-*`).
- **Ölçüm M.** Dört bölüm aynı kartta sırayla çiziliyor ve set doluyken ötekiler `fieldset disabled` ile soluyor; ters yön yok, yani kalemler dolu iken set bölümünü pasif yapan bir kural bugün de yok.
- **Ölçüm N.** `SiparisIhtiyaci.jsx:20` `hazirSayiMetni` "`n` hazır parça (malzeme satırı yok)" yazıyor, `:119` boş durumu "Malzeme satırı olan parça siparişi yok."; motorun ölçütü `siparisIhtiyaci.js:234` `!k.set && !k.malzemeli`.
- **Ölçüm O.** `merge.js:198-210` üç eşleme yapıyor: kırılımın tedarikçisi (0096 R26), setin içeriğindeki parça (0121 C6) ve malzeme satırının malzemesi (0132 C5).
- **Ölçüm P.** Excel içe aktarmada iki ayrı bildirim metni var ve ikisi de satır numarasıyla basılıyor: `parcaAktarma.js:191` `MALZEME_EXCEL_HATASI` ve `:193` `HAMMADDE_EXCEL_HATASI`; içe aktarma kaydın kendisini de yazıyor (`:221-224`).
- **Ölçüm R.** Liste hücresinde üç ibare var: `parca-maliyet-malzeme` (yetki istemez), `parca-maliyet-kaynak` (yalnız gider yetkisiyle, "`n` tedarikçiden") ve kartta `maliyet-kaynagi` ile yetkisize özel `maliyet-kirilimdan`.
- **Ölçüm S.** Aynı aileden en az on bir metin sabiti var: kırılım ve malzeme kaynak ibareleri, `kirilimdanGeliyorMetni`, `kaynakListeMetni`, hammadde bölüm başlığı, ipucusu, boş durumu, toplam satırının üç metni, tutarsız uyarısı, iki Excel hatası ve malzeme korumasının iki metni. AC-75 "eski iki ibare" diyordu.
- **Ölçüm T.** 0099 spec'te bağımlı spec olarak yazılı değildi; oysa `tests/kirilim-toplami-0099.test.js:79` kaynak taraması `maliyet-kirilimdan` satırının JSX'ini birebir sabitliyor ve 0099'un toplam satırı (`hammadde-toplam`) R11 ile yerini tek toplama bırakıyor.
- **Ölçüm U.** `MalzemeSatiriAlani.jsx:62` emniyet payı alanını malzeme bölümünün ızgarasında çiziyor; 0134 AC-59 onun malzeme listesi boşken de çizildiğini ölçüyor.
- **Ölçüm V.** Yeni bir bileşen dosyası kilit kapsamına girmez: `MalzemeSatiriAlani.jsx` ne `ayar.pencereler` listesinde ne `KILITSIZ_DOSYALAR`'da, çünkü veri bölümüne yazmıyor (0128 R11'in ölçütü). Kalem bölümü de aynı sınıfta kalır.
- **Ölçüm Y.** Kabul kriterlerinin numaraları belge sırasında artmıyordu: AC-1…AC-76, sonra AC-82…AC-89, sonra AC-77…AC-81.

### QA turunda verilen kararlar (2026-11-08)

1. **Alanın şekli yazılır (B1).** `maliyetKalemleri`'nin tür ayırıcısı, düz malzeme alanları, adet ve boş tutarın gösterimi spec'e girer → R45, R45/2, C4/2, AC-90, AC-91.
2. **Emniyet payı parça düzeyinde kalır (B2).** Yedek, malzeme kalemlerinin paylarının en büyüğü olur; kalem başına pay reddedilir → R29, R29/2, C9/2, AC-53 (ters çevrildi), AC-92.
3. **Türeyen kalemin adı sabittir (B3).** Tedarikçi adı kaleme ad olarak yazılmaz, gizlilik çizgisi korunur → R24, R24/2, C6/2, AC-43 ve AC-44 (daraltıldı), AC-93.
4. **"Dokunuldu" işareti kurulur (B4).** Yeni alan ve eski alanların silinmesi yalnız kullanıcı maliyet bölümüne dokunduğunda yazılır → R26/2, AC-94, AC-95, AC-96.
5. **Elle maliyet de silinir, zincir düşmez (B5).** Kalem listesi dolu kayıtta elle maliyet anahtarı her çağrıda silinir; çözülemeyen liste "girilmedi" verir → R25/2, R27/2, AC-97, AC-98.
6. **Tedarikçi süzgeci kalemleri okur (Ö1).** Süzgecin adı, kümesi ve "girilmemiş" seçeneği türetilmiş listeden gelir → R46, R46/2, AC-99, AC-100.
7. **İşlem tedarikçisi bütün tedarikçilerden seçilir (Ö2).** Hammadde işareti şart koşulmaz, işaretliler başta sıralanır → R17/2, AC-101.
8. **İşlem kalemleri tekilleştirilmez (Ö3).** Aynı tedarikçi birden çok işlem kaleminde geçebilir; eski tekrar kuralı ve düğme kapısı kalkar → R15/2, AC-102.
9. **İşlem tutarı belirsiz sayıyı reddeder (Ö4).** 0132'nin kuralı bu alana da uygulanır → R19/2, AC-103.
10. **0099 bağımlı spec'tir ve ters çevrilenler sayılır (Ö5).** Başlık tablosuna iki satır eklendi; bağımlı spec listesine 0099, 0009, 0131 ve 0109 girdi → başlık tablosu, DoD.
11. **Kullanım sayaçları da kalemleri okur (Ö6).** Beş okumanın üçü (iki sayaç ve metinleri) spec'e girdi → R31/2, R32/2, C5/2, AC-104, AC-105.
12. **Kanıt kayıtları çevrilir (Ö7).** Değişen ekranların kayıtları `degisti` ve onay satırına çevrilir, yeni bileşenin kaydı eklenir → DoD, AC-106.
13. **Pasiflik iki yönlü olur (Ö8).** Set ile kalem listesi birbirini pasifleştirir; set dolu kayıtta kalem alanı yazılmaz → R5/2, R25/3, AC-107, AC-108.
14. **Hazır parça sayacının metni çevrilir (Ö9).** Ölçüt korunur, iki metin kalem diline geçer → R30/2, AC-109.
15. **Türetme tek yardımcıda olur (Ö10).** Bütün tüketiciler listeyi oradan okur, kip de ondan türer → R2/2, R23/2, C1/2, AC-110.
16. **Eski eşlemeler kalır (Ö11).** Kalem içindeki iki eşleme eklenir, üçü yerinde durur → R34/2, AC-111.
17. **Yeni ibare yetki istemez (Ö12).** Kartta ve listede aynı tek metin çizilir, rakamlı satır kalkar → R39/2, AC-112.
18. **Excel tek metne iner ve dokunmaz (Ö13).** İki bildirim birleşir, içe aktarma kalem alanına ve eski alanlara dokunmaz → R37/2, R37/3, AC-113, AC-114.
19. **Eskimiş atıflar düzeltildi (K1).** `urunAgaci.js:60`, `gider.js:1051`, `PartManager.jsx:729-737` ve `:790-801`.
20. **Kriter numaraları artan sıraya çevrildi (K2).** "Veri ve kıyas" alt bölümü "Geçerlilik tarihi ve tarihli okuma"nın önüne alındı.
21. **Adedin ayrıştırıcısı ve iki hata metni yazıldı (K3).** → R13/2, AC-115.
22. **Liste altındaki üç ibare koşullu çizilir (K4).** → R20/2.
23. **Kip adları 0133'ün diliyle eşitlendi (K5).** "Elle sabit" ve "Hesapla" → R3/2.
24. **Emniyet payı kendi yerine taşınır (K6).** 0134 AC-59 yeni yere göre güncellenir → R6/2.
25. **Sınır giriş kuralıdır (K7).** Yirmiden çok kalem taşıyan kayıt kırpılmaz → R9/2.
26. **İşlem adının kuralı yazıldı (K8).** Kırpılır, uzunluk sınırı yok, aynı ad serbest → R18/2.
27. **Geçmişin susması bilinen sınır olarak yazıldı (K9).** Sürüm notuna girer, yeni mekanizma kurulmaz → C7/2, AC-116.
28. **Tarama listesi tek tek sayılır (K10).** → R39/3, AC-117.
29. **Maliyetsiz sayacı iki yerde aynı kuralı okur (K11).** → R47, AC-118.

### Karar kaydı

| No | Bulgu | Derece | Karar | İşlendiği yer |
|---|---|---|---|---|
| 1 | Kalıcı alanın şekli tanımsız | Bloklayıcı | Şekil spec'e yazıldı | R45, R45/2, C4/2, AC-90, AC-91 |
| 2 | Emniyet payı 0134 ile çelişiyor | Bloklayıcı | Pay parça düzeyinde, yedek en büyük pay | R29, R29/2, C9/2, AC-53, AC-92 |
| 3 | Türeyen adın tedarikçi adı olması gizliliği deliyor | Bloklayıcı | Ad sabit, tedarikçi gider yetkisinde | R24, R24/2, C6/2, AC-43, AC-44, AC-93 |
| 4 | "Dokunulmayan parça değişmez" ile "karttan kaydedilince kalem oluşur" kesişiyor | Bloklayıcı | Geçici "dokunuldu" işareti | R26/2, AC-94, AC-95, AC-96 |
| 5 | Hesapla kipinde saklı elle maliyetin kaderi | Bloklayıcı | Üçüncü alan da silinir, zincir düşmez | R25/2, R27/2, AC-97, AC-98 |
| 6 | Tedarikçi süzgeci kalemleri bilmiyor | Önemli | Süzgeç türetilmiş listeden okur | R46, R46/2, AC-99, AC-100 |
| 7 | İşlem tedarikçisinin kümesi | Önemli | Bütün canlı tedarikçiler | R17/2, AC-101 |
| 8 | Aynı tedarikçi iki işlem kaleminde | Önemli | Tekilleştirme kalkar | R15/2, AC-102 |
| 9 | İşlem tutarının sayı kuralı | Önemli | Belirsiz sayı reddedilir | R19/2, AC-103 |
| 10 | 0099 bağımlı listede yok, ters çevrilenler yazılmamış | Önemli | İki başlık satırı ve bağımlılık eklendi | Başlık tablosu, DoD |
| 11 | Kullanım sayaçları koruma dışında | Önemli | Sayaçlar ve metinler kalemleri okur | R31/2, R32/2, C5/2, AC-104, AC-105 |
| 12 | Kanıt kayıtları "ayni" | Önemli | `degisti` ve onay satırına çevrilir | DoD, AC-106 |
| 13 | Set ile kalem birlikte dolu | Önemli | Pasiflik iki yönlü, set kazanınca kalem yazılmaz | R5/2, R25/3, AC-107, AC-108 |
| 14 | Hazır parça sayacının dili | Önemli | Ölçüt korunur, metin çevrilir | R30/2, AC-109 |
| 15 | Türetmenin tek yardımcısı yok | Önemli | Tek yardımcı ve tarama | R2/2, R23/2, C1/2, AC-110 |
| 16 | Birleştirmede eski eşlemeler | Önemli | Üçü kalır, ikisi eklenir | R34/2, AC-111 |
| 17 | Yeni ibarenin yetki kapısı | Önemli | Yetki istemez, kartta da aynı metin | R39/2, AC-112 |
| 18 | Excel metni ve içe aktarmanın yazımı | Önemli | Tek metin, alanlara dokunmaz | R37/2, R37/3, AC-113, AC-114 |
| 19 | Eskimiş atıflar | Küçük | Dört atıf düzeltildi | Context |
| 20 | Kriter numaraları artmıyor | Küçük | Alt bölümlerin yeri değişti | Acceptance Criteria |
| 21 | Adet ayrıştırıcısı ve metinler | Küçük | Set adedinin deseni, iki metin | R13/2, AC-115 |
| 22 | Liste altındaki ibareler | Küçük | Üçü koşullu | R20/2 |
| 23 | Kip adları 0133 ile uyumsuz | Küçük | "Elle sabit" ve "Hesapla" | R3/2 |
| 24 | Emniyet payı alanının yeri | Küçük | Kip seçicisinin altına taşınır | R6/2 |
| 25 | Yirmiden çok kalem taşıyan kayıt | Küçük | Okuma kırpmaz | R9/2 |
| 26 | İşlem adının kuralı | Küçük | Kırpılır, sınır yok, aynı ad serbest | R18/2 |
| 27 | İşlem kalemli parçaya malzeme eklenince geçmiş susar | Küçük | Bilinen sınır, sürüm notunda | C7/2, AC-116 |
| 28 | Tarama kapsamı | Küçük | Metinler tek tek sayılır | R39/3, AC-117 |
| 29 | Maliyetsiz sayacı ile toplu kip onayı | Küçük | İkisi tek okuma yolundan | R47, AC-118 |

---

## Acceptance Criteria

### Kip seçici

- **AC-1.** Parça ekleme kartında maliyet bölümünün başında "Maliyet kipi" erişilebilir adını taşıyan bir seçici vardır ve iki seçeneği "Hesapla" ile "Elle sabit"tir (plan turu Karar 30; bu bölümdeki öteki "Elle gir" anışları da bu ada okunur).
- **AC-2.** Yeni parça kartı açıldığında kip "Elle gir"dir ve ekranda yalnız tek bir tutar alanı çizilir; malzeme ve işlem bölümleri çizilmez.
- **AC-3.** Kip "Hesapla" yapılınca elle tutar alanı çizilmez, kalem listesi çizilir.
- **AC-4.** Malzeme kalemi olan bir parçanın kartı açıldığında kip "Hesapla" seçili gelir.
- **AC-5.** Yalnız hammadde kırılımı olan eski bir parçanın kartı açıldığında kip "Hesapla" seçili gelir ve kırılım satırları işlem kalemi olarak listelenir.
- **AC-6.** Yalnız elle maliyeti olan bir parçanın kartı açıldığında kip "Elle gir" seçili gelir.
- **AC-7.** Elle tutar dolu iken kip "Hesapla" yapılınca onay sorulur; kullanıcı vazgeçerse kip değişmez ve tutar yerinde kalır.
- **AC-8.** Onay verilirse kip değişir ve elle tutar alanı boşalır.
- **AC-9.** Kalem listesi dolu iken kip "Elle gir" yapılınca onay sorulur; onay verilirse kalemler listeden kalkar.
- **AC-10.** Boş kipten boş kipe geçişte onay sorulmaz.
- **AC-11.** Parçanın set içeriği dolu iken kip seçicisi pasiftir ve yanında maliyetin bileşenlerden geldiğini söyleyen bir ibare vardır.
- **AC-12.** Emniyet payı alanı iki kipte de çizilir; kip değişimi payın değerini değiştirmez.

### Kalem listesi

- **AC-13.** Hesapla kipinde hiç kalem yokken liste yerine boş durum çizilir ve iki ekleme düğmesi görünür.
- **AC-14.** "Malzeme ekle" düğmesi listeye bir malzeme kalemi ekler; yeni kalemin adedi 1'dir.
- **AC-15.** "İşlem ekle" düğmesi listeye bir işlem kalemi ekler; alanları boştur.
- **AC-16.** Her kalem satırında onu listeden kaldıran bir düğme vardır.
- **AC-17.** Listede 20 kalem varken ekleme düğmeleri pasiftir ve nedeni yazar.
- **AC-18.** Kalemler eklendikleri sırada çizilir ve sıralama düğmesi yoktur.
- **AC-19.** Listenin altında tek bir toplam satırı vardır ve değeri parçanın çözülmüş alış maliyetidir.
- **AC-20.** En az bir işlem kalemi varken toplam satırının yanında işlem tutarlarının zam zincirine girmediğini söyleyen bir ibare vardır; işlem kalemi yokken çizilmez (R20/2, plan turu Karar 34).

### Malzeme kalemi

- **AC-21.** Malzeme kaleminin alanları malzeme, biçim, yöntem, biçimin ölçüleri, işleme payları, fire ve adettir.
- **AC-22.** Biçim değişince ölçü ve pay alanları o biçimin listesine göre yeniden çizilir (0132 davranışı korunur).
- **AC-23.** Adedi 2 olan bir malzeme kaleminin tutarı, aynı kalemin adedi 1 iken verdiği tutarın iki katıdır.
- **AC-24.** Adet alanına 0, eksi bir sayı, kesirli sayı ya da harf yazılırsa satır nedeniyle reddedilir ve kayıt yapılmaz.
- **AC-25.** Adet alanına 1.001 yazılırsa satır nedeniyle reddedilir.
- **AC-26.** Aynı malzemeden farklı kesitte iki kalem girilebilir ve ikisinin tutarı ayrı ayrı hesaplanıp toplanır.
- **AC-27.** Malzemesi seçilmemiş bir kalem varken parçanın maliyeti "girilmedi" yazar; öteki kalemlerin toplamı yazılmaz.
- **AC-28.** Kilo fiyatı girilmemiş bir malzemeyi taşıyan kalem varken parçanın maliyeti "girilmedi" yazar, sıfır yazmaz.
- **AC-29.** Dövizli bir malzemenin kuru boşken o kalemi taşıyan parçanın maliyeti "girilmedi" yazar.
- **AC-30.** Çöpteki bir malzemeyi taşıyan kalem seçicide adıyla ve "silinmiş malzeme" ibaresiyle kalır; kayıt silinmez.
- **AC-31.** Boy yönteminden hesaplanan bir malzeme kaleminin tutarı 0132'nin boy kuralıyla hesaplanır ve adetle çarpılır.

### İşlem kalemi

- **AC-32.** İşlem kaleminin alanları ad, tedarikçi ve tutardır.
- **AC-33.** Adı boş bırakılan işlem kalemi nedeniyle reddedilir ve kayıt yapılmaz.
- **AC-34.** Tedarikçisi boş bırakılan işlem kalemi geçerlidir ve kaydedilir.
- **AC-35.** Tutarı boş bırakılan işlem kalemi uyarı verir, kayıt yapılır ve o kalem toplama girmez.
- **AC-36.** Tutarı eksi ya da sayıya çevrilemez olan işlem kalemi nedeniyle reddedilir.
- **AC-37.** Bir malzeme kalemi ile iki işlem kalemi olan parçanın maliyeti üçünün toplamıdır.
- **AC-38.** Yalnız işlem kalemleri olan parçanın maliyeti işlem tutarlarının toplamıdır.
- **AC-39.** Gider yetkisi olmayan kullanıcıda işlem kaleminin tedarikçi seçicisi çizilmez; ad ve tutar görünür.
- **AC-40.** Gider yetkisi olmayan kullanıcının kaydettiği parçada işlem kalemlerinin tedarikçi bağı korunur.

### Eski kayıtlar ve yazım

- **AC-41.** Kalem alanı olmayan ve malzeme satırı olan bir parçanın maliyeti spec öncesiyle birebir aynıdır.
- **AC-42.** Kalem alanı olmayan ve hammadde kırılımı olan bir parçanın maliyeti spec öncesiyle birebir aynıdır.
- **AC-43.** Kırılımdan türeyen işlem kaleminin adı sabit ibaredir; tedarikçinin adı kaleme ad olarak yazılmaz.
- **AC-44.** Tedarikçi kaydı bulunamayan kırılım satırından türeyen kalemin **tedarikçi alanı** "kaydı bulunamayan tedarikçi" ibaresini taşır; adı sabit ibare kalır.
- **AC-45.** Eski bir malzeme satırı taşıyan parça kartından, maliyet bölümüne dokunularak kaydedilince kayıtta `maliyetKalemleri` oluşur ve `malzemeSatiri` ile `hammaddeler` anahtarları kayıttan kalkar (R26/2, plan turu Karar 33).
- **AC-46.** Kartı açıp hiçbir şey değiştirmeden kapatmak kaydı değiştirmez.
- **AC-47.** Yalnız parçanın adını değiştirip kaydetmek maliyet alanlarına dokunmaz.
- **AC-48.** Kalem listesi boşaltılıp kip "Elle gir" yapılırsa kayıttan `maliyetKalemleri` anahtarı kalkar.

### Sipariş ihtiyacı ve emniyet payı

- **AC-49.** İki malzeme kalemi olan bir parça sipariş ihtiyacı tablosunda iki malzeme satırı üretir.
- **AC-50.** Aynı malzemeden aynı ham kesitte iki kalem taşıyan iki ayrı parça, sipariş tablosunda tek satırda toplanır.
- **AC-51.** Malzeme kaleminin adedi sipariş ihtiyacının ağırlığına çarpan olarak girer.
- **AC-52.** Parçanın kendi emniyet payı doluysa bütün malzeme kalemlerine o pay uygulanır.
- **AC-53.** Parçanın payı boşken pay, malzeme kalemlerinin malzemelerinde girili payların en büyüğüdür; iki kalemin malzemeleri farklı pay taşısa da parçaya tek pay uygulanır ve bu pay ikisinin büyüğüdür.
- **AC-54.** Parçanın ve malzemenin payı boşken pay sıfırdır ve ihtiyaç büyütülmez.
- **AC-55.** İşlem kalemi sipariş ihtiyacı tablolarında hiçbir satır üretmez.
- **AC-56.** Malzeme kalemi olmayan, yalnız işlem kalemi olan parça, parça ihtiyacı tablosunda görünür ve malzeme tablosunda görünmez.
- **AC-57.** Bir malzeme kalemi çözülemeyen parça sipariş ekranının eksik sayısına girer.

### Koruma, birleştirme ve zam

- **AC-58.** İkinci bir malzeme kaleminde geçen malzeme Çöp Kutusu'ndan kalıcı silinemez ve satırda nedeni yazar.
- **AC-59.** Çöpü boşalt işlemi, kalemlerde geçen malzemeleri bırakır ve bırakılanı sayar.
- **AC-60.** Otuz günlük otomatik temizlik, kalemlerde geçen malzemeyi silmez.
- **AC-61.** Bir işlem kaleminde geçen tedarikçi kalıcı silinemez ve satırda nedeni yazar.
- **AC-62.** Malzeme fiyatı güncelleme penceresinin etki önizlemesi, o malzemeyi ikinci kaleminde kullanan parçayı da etkilenen olarak sayar.
- **AC-63.** Zam sonrası, iki malzeme kalemi olan parçanın maliyeti yalnız zam gelen kalemin payı kadar artar.
- **AC-64.** Çakışma birleştirmesinde yeni eklenen parçanın kalemlerindeki malzeme bağı yeniden eşlenir.
- **AC-65.** Çakışma birleştirmesinde yeni eklenen parçanın işlem kalemlerindeki tedarikçi bağı yeniden eşlenir.

### Maliyet geçmişi, fiyat ve Excel

- **AC-66.** En az bir malzeme kalemi olan parçada maliyet geçmişi listesi ve geçerlilik tarihi alanı çizilmez.
- **AC-67.** En az bir malzeme kalemi olan parça kaydedilince maliyet geçmişine kayıt yazılmaz.
- **AC-68.** Yalnız işlem kalemi olan parçada maliyet geçmişi spec öncesi kırılım davranışıyla aynı şekilde yazılır.
- **AC-69.** Malzeme kalemleri kaldırılıp kip "Elle gir" yapılınca geçmişe o güne kadarki çözülmüş maliyet yazılır.
- **AC-70.** Fiyat kipi "Maliyete bağlı" olan parçanın TL fiyatı, kalem eklenince kartta canlı olarak yeni maliyetten türetilir.
- **AC-71.** Excel dışa aktarmasında Hesapla kipindeki parçanın maliyet hücresi çözülmüş değeri taşır.
- **AC-72.** Excel içe aktarmasında Hesapla kipindeki parçanın maliyet hücresi kayda yazılmaz; yürürlükteki değerden farklıysa satır numarasıyla bildirilir.
- **AC-73.** Parça şablonunun sütun sayısı on birdir ve başlıkları değişmemiştir.

### Kaynak ibaresi ve liste

- **AC-74.** Parça listesinde Hesapla kipindeki parçanın maliyet hücresinin altında kalemlerden geldiğini söyleyen tek bir ibare vardır ve kaç malzeme, kaç işlem kaleminden geldiğini yazar.
- **AC-75.** Eski iki ibare ("malzemeden geliyor", "hammadde kırılımından geliyor") kaynakta hiçbir yerde geçmez.
- **AC-76.** Maliyeti girilmemiş parça sayacı, kalem listesi çözülemeyen parçayı da sayar.

### Veri ve kıyas

- **AC-77.** Kalem listesi boş olan parçanın veritabanına yazılan gövdesinde `maliyetKalemleri` anahtarı bulunmaz.
- **AC-78.** Kalem listesi dolu parça kaydedilip yeniden okunduğunda bütün kalem alanları (malzemenin ölçüleri ve payları, adet, işlemin adı, tedarikçisi, tutarı) birebir geri gelir.
- **AC-79.** Temiz kurulumda yeni sütun oluşur ve kalem yazılıp okunabilir.
- **AC-80.** Kalem alanı hiç olmayan bir veri kümesinde maliyet zinciri, sipariş ihtiyacı, model maliyetleri, türetilmiş satış fiyatı ve Excel çıktısı spec öncesi koddan üretilmiş altınla birebir aynıdır.
- **AC-81.** Parça kartının görsel kanıtı boş durum, dolu liste, hata durumu ve iki kip için ayrı ayrı alınmıştır.

---

### Geçerlilik tarihi ve tarihli okuma

- **AC-82.** Yalnız işlem kalemi olan parçanın düzenleme kartında geçerlilik tarihi alanı çizilir ve etkindir.
- **AC-83.** Yalnız işlem kalemi olan parçanın tutarı değiştirilip kaydedilince maliyet geçmişine, girilen geçerlilik tarihiyle, yeni toplam yazılır.
- **AC-84.** Listeye bir malzeme kalemi eklenince geçerlilik tarihi alanı ve geçmiş listesi çizilmez; yerlerinde geçmişin malzemenin fiyat geçmişinden geldiğini söyleyen tek satırlık ibare vardır.
- **AC-85.** Malzeme kalemi eklenen parçanın kayıttaki eski maliyet geçmişi silinmez, yalnız okunmaz.
- **AC-86.** Bir malzeme ve bir işlem kalemi olan parçanın geçmiş bir tarihe yapılan maliyet sorgusunda malzeme kalemi o tarihteki malzeme fiyatıyla, işlem kalemi bugünkü tutarıyla hesaplanır.
- **AC-87.** AC-86'daki parçanın işlem tutarı bugün değiştirilirse, geçmiş tarihe yapılan sorgunun sonucu da değişir.
- **AC-88.** Kalem listesinin altında tarihli okumanın karma olduğunu söyleyen ibare vardır.
- **AC-89.** Elle gir kipindeki parçada geçerlilik tarihi alanı ve geçmiş listesi bugünkü davranışıyla aynen çizilir.

### QA turu kriterleri (2026-11-08)

**Alan ve şekil**

- **AC-90.** Bir malzeme ve bir işlem kalemi olan parça kaydedildiğinde kayıttaki `maliyetKalemleri` dizisinin birinci öğesi `tur: "malzeme"`, ikincisi `tur: "islem"` taşır; malzeme kaleminin ölçü ve pay alanları iç içe nesnede değil düz durur.
- **AC-91.** Tutarı girilmemiş işlem kalemi kayıtta `tutar: null` ile saklanır; tedarikçisi girilmemiş kalemde tedarikçi anahtarı kayda hiç yazılmaz.

**Emniyet payı**

- **AC-92.** Parçanın payı boş, iki malzeme kaleminin malzemeleri %5 ve %12 pay taşıyorken parçaya %12 uygulanır ve sipariş tablosunun emniyet payı hücresi %12 yazar.

**Türeyen kalemin adı ve gizlilik**

- **AC-93.** Gider yetkisi olmayan kullanıcı, kırılımdan türeyen kalemleri olan bir parçanın kartını açtığında hiçbir tedarikçinin adı ekranda geçmez.

**Dokunma işareti**

- **AC-94.** Eski malzeme satırı taşıyan bir parçanın yalnız adı değiştirilip kaydedilince kaydedilen gövdede `malzemeSatiri` aynen durur ve `maliyetKalemleri` anahtarı oluşmaz.
- **AC-95.** Aynı parçanın kalem listesinde bir alana dokunulup kaydedilince `maliyetKalemleri` oluşur ve `malzemeSatiri` ile `hammaddeler` anahtarları kayıttan kalkar.
- **AC-96.** Kartı açıp kip seçicisine dokunmadan, hiçbir kalem alanı değiştirmeden kaydetmek kaydı hiç değiştirmez (gövde başlangıç nesnesine eşittir).

**Elle maliyet ve zincir**

- **AC-97.** Elle maliyeti dolu bir parçaya kalem eklenip kaydedilince kayıttan `maliyet` anahtarı da kalkar.
- **AC-98.** Tutarı boş tek işlem kalemi olan ve kayıtta eski bir elle maliyeti bulunan parçanın maliyeti "girilmedi" yazar; eski elle tutar ne listede ne kartta görünür.

**Tedarikçi süzgeci**

- **AC-99.** Parça listesinin tedarikçi süzgeci, bir işlem kaleminde o tedarikçi geçen parçayı süzer; aynı tedarikçinin eski kırılım satırında geçtiği dokunulmamış parça da aynı süzgeçte görünür.
- **AC-100.** "Girilmemiş" seçeneğinin sayısı, hiçbir işlem kaleminde tedarikçi taşımayan parçaları sayar.

**İşlem kalemi**

- **AC-101.** İşlem kaleminin tedarikçi seçicisi hammadde işareti taşımayan canlı bir tedarikçiyi de listeler; hammadde işaretli tedarikçiler listenin başında durur.
- **AC-102.** Aynı tedarikçi iki ayrı işlem kalemine seçilebilir ve kayıt yapılır; iki kalemin tutarı ayrı ayrı toplama girer.
- **AC-103.** İşlem tutarına "2.400" yazılırsa satır nedeniyle reddedilir ve kayıt yapılmaz; "2,40" yazılırsa 2,40 TL olarak saklanır.

**Kullanım sayaçları**

- **AC-104.** Malzemeler panelinin kullanım sütunu, o malzemeyi ikinci malzeme kaleminde kullanan parçayı sayar ve malzemenin silme onayı aynı sayıyı yazar.
- **AC-105.** Tedarikler listesinin kullanım hücresi, o tedarikçiyi bir işlem kaleminde taşıyan parçayı sayar ve "silinemez" penceresi aynı sayıyla kalem dilinde cümle yazar.

**Kanıt**

- **AC-106.** Değişen parça kartı ekranlarının kanıt kayıtları `beklenen: "degisti"` ve onay satırı taşır; `tasarim.jsx` kullanan yeni bileşen dosyasının kanıt kaydı eklenmiştir.

**Set ile kalem**

- **AC-107.** Kalem listesi dolu bir parçada set içeriği bölümü pasiftir ve nedeni yazar.
- **AC-108.** Set içeriği dolu bir parça kaydedilince kayıtta `maliyetKalemleri` anahtarı bulunmaz.

**Sipariş ekranının dili**

- **AC-109.** Yalnız işlem kalemi olan parça sipariş ekranının "malzeme kalemi yok" sayacına girer ve sayacın metni kalem dilindedir; malzeme tablosunun boş durumu da kalem dilindedir.

**Tek türetme yolu**

- **AC-110.** Kalem listesini türeten tek yardımcı vardır ve maliyetin tek okuma yolu, sipariş ihtiyacı, zam etki önizlemesi, iki koruma, iki kullanım sayacı, Excel'in iki yönü, birleştirme, kip türetmesi ve parça kartı onu çağırır; eski iki alanı doğrudan okuyan başka bir yer yoktur (kaynak taraması).

**Birleştirme**

- **AC-111.** Çakışma birleştirmesinde eklenen parçanın eski biçimli malzeme satırı ve hammadde kırılımı da yeniden eşlenir (güncellenmemiş istemciden gelen kayıt).

**Kaynak ibaresi**

- **AC-112.** Gider yetkisi olmayan kullanıcı, parça listesinde ve parça kartında kalem ibaresinin aynısını görür; yetkisize özel rakamlı satır hiçbir yerde çizilmez.

**Excel**

- **AC-113.** Kalem listesi olan parçanın maliyet hücresi değiştirilip içe aktarıldığında tek bildirim metni satır numarasıyla basılır; iki ayrı metin yoktur.
- **AC-114.** Eski alanlı bir parçanın adı Excel'den değiştirilip içe aktarıldığında kayıtta `malzemeSatiri` ve `hammaddeler` aynen durur, `maliyetKalemleri` oluşmaz.

**Adet, geçmiş, sayaç ve tarama**

- **AC-115.** Adet alanına "1.000" yazılırsa satır tam sayı metniyle reddedilir; "1001" yazılırsa üst sınır metniyle reddedilir.
- **AC-116.** Yalnız işlem kalemi olan ve maliyet geçmişi bulunan bir parçaya malzeme kalemi eklenince geçmiş silinmez, okunmaz ve bu sonuç sürüm notunda yazılıdır.
- **AC-117.** Kaynak taraması, kalkması kararlaştırılan metin sabitlerinin hiçbirinin kaynakta geçmediğini ve gerekçeli kalanların listede olduğunu sabitler.
- **AC-118.** Parça panelinin maliyetsiz parça sayacı ile toplu fiyat kipi onayındaki maliyetsiz parça sayısı, kalem listesi çözülemeyen parçayı ikisi de sayar ve aynı rakamı verir.

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Kalem toplamı React'sız saf motorda yazıldı ve kendi testi var; parça kartı çarpım ve toplama yapmıyor (kaynak taraması).
- [ ] Maliyetin tek okuma yolu korundu; kalemleri toplayan ikinci bir yer yok (kaynak taraması).
- [ ] `maliyetKalemleri` sütunu dört nokta kuralıyla eklendi ve `db-roundtrip` ile `db-clean-install` testlerine girdi.
- [ ] Yeni veri bölümü yok; birleştirme kuralı `merge.js` içinde kalemlerin bağlarını yeniden eşliyor.
- [ ] **Yeni eylem izni eklenmedi** ve bu açıkça yazıldı; sunucu tarafı değişmedi (tarama).
- [ ] Malzemenin ve tedarikçinin kalıcı silme koruması dört kapıda birden kalemleri okuyor.
- [ ] Kullanıcıya görünen tüm metinler Türkçe; bu iş yazdırma çıktısı üretmiyor.
- [ ] Para kuralına uyuluyor: dövizli malzemede kur eksikse maliyet "girilmedi" yazıyor, sıfır yazmıyor.
- [ ] Kalem alanı olmayan veride kıyas altını birebir eşleşiyor (C8).
- [ ] Kalıcı alanın şekli R45'teki gibi; tür ayırıcısı, düz malzeme alanları, adet ve boş tutarın gösterimi uygulamada aynı (AC-90, AC-91).
- [ ] Kalem listesinin türetmesi tek saf yardımcıda; eski iki alanı doğrudan okuyan başka yer yok (kaynak taraması, AC-110).
- [ ] "Kullanıcı maliyet bölümüne dokundu" işareti kuruldu; dokunulmayan parçanın gövdesi birebir korunuyor ve Excel içe aktarması işareti kurmuyor (AC-94, AC-96, AC-114).
- [ ] Kalem listesi dolu kayıtta üç eski alan (malzeme satırı, hammadde kırılımı, elle maliyet) siliniyor; zincir elle değere düşmüyor (AC-97, AC-98).
- [ ] Emniyet payı parça düzeyinde kaldı ve yedeği malzemelerin paylarının en büyüğü; 0134'ün yuvarlama sırası ve iki sütunu dokunulmadı (AC-52, AC-53, AC-92).
- [ ] 0096 ve 0099'un gizlilik çizgisi korundu: gider yetkisi olmayan kullanıcı hiçbir yerde tedarikçi adı görmüyor (AC-93).
- [ ] Malzemenin ve tedarikçinin kullanım sayaçları ve metinleri de kalemleri okuyor (AC-104, AC-105).
- [ ] Parça listesinin tedarikçi süzgeci türetilmiş kalem listesinden okuyor (AC-99, AC-100).
- [ ] Set ile kalem listesinin pasifliği iki yönlü; set dolu kayıtta kalem alanı yazılmıyor (AC-107, AC-108).
- [ ] Birleştirmede bugünkü üç yeniden eşleme yerinde kaldı ve kalem içindeki ikisi eklendi (AC-111).
- [ ] Excel'in iki bildirim metni tek metne indi (AC-113).
- [ ] Kalkan metin sabitlerinin listesi spec'te sayıldı ve taramayla sabitlendi; gerekçeli kalanlar yazıldı (AC-117).
- [ ] Kanıt eşlemesindeki değişen ekran kayıtları `degisti` ve onay satırına çevrildi; yeni bileşen dosyasının kaydı eklendi (AC-106).
- [ ] **Ters çevrilen kriterler** test yorumlarında "spec 0135 ile" notuyla işaretlendi (0099, 0096, 0132, 0134).
- [ ] Geçerlilik tarihi kapısı dar kaldı: yalnız işlem kalemi olan parçanın geçmişi bugünkü gibi yazılıyor (0097 bozulmadı) ve malzeme kalemi olan parçada alanın yerine ibare çiziliyor.
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi; boş ve hata durumları dâhil.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi; 0096 ve 0132'nin ilgili bölümlerine bu spec'in değiştirdiği kurallar işlendi.
- [ ] **Sürüm notu yazıldı:** önce sunucu PC, sonra bütün istemciler; güncelleme bitene kadar parça kartında maliyet düzenlenmez. Notta iki bilinen sonuç da yazılı (C7/2).
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## Kararlar

### Takım Yöneticisi'nin onayladığı üç nokta (2026-11-08)

**1. Eski kaynak ibareleri kalkıyor (R39, AC-75).** Bugün listede hammadde kırılımlı parçanın altında "Hammadde kırılımından geliyor" yazıyor. Bu metin kalkıyor ve yerine tek bir kalem ibaresi geliyor. **Karar: kalksın.** Gerekçe: iki mekanizmayı bire indirmenin amacı tam olarak budur; iki ayrı ibare bırakmak kullanıcıya hâlâ iki yöntem olduğunu düşündürür. Alternatif, eski metinleri korumak, ama o zaman aynı listede üç farklı kaynak cümlesi görünür.

**2. İşlem kaleminin tedarikçisi gider yetkisine bağlı (R21, AC-39).** Bugün hammadde bölümünün **tamamı** gider yetkisi olmayan kullanıcıdan gizli. Yeni tasarımda işlem satırının adı ve tutarı herkese görünür, yalnız tedarikçi seçicisi gider yetkisine bağlı. **Karar: böyle olsun.** Gerekçe: tedarikçi kimliği gider modülünün gizlilik konusudur, parçanın maliyeti ise katalog bilgisidir; bütün satırı gizlemek yetkisiz kullanıcıya maliyetin nereden geldiğini hiç göstermez. Alternatif, bugünkü gibi bütün işlem bölümünü gizlemek.

**3. Eski alanlar yazımda siliniyor (R25).** Parça kaydedilince `malzemeSatiri` ve `hammaddeler` anahtarları kayıttan kalkıyor; bu, güncellenmemiş bir istemcinin o parçanın maliyetini göremeyeceği anlamına geliyor ve sürüm notunu zorunlu kılıyor. **Karar: silinsin.** Gerekçe: iki doğruluk kaynağı bırakmak, okuma yolunun hangi alana öncelik vereceği sorusunu açar ve bu projede daha önce sessiz veri kaybına yol açtı. Alternatif, tek malzeme kalemli parçalarda eski alanı da yazmak (eski istemciler çalışmaya devam ederdi) ama bu kısmi uyum, iki doğruluk kaynağı demektir.

### Plan turu kararları (2026-11-08, Takım Yöneticisi onayı)

| No | Soru | Karar | Gerekçe |
|---|---|---|---|
| 30 | Kip adları (AC-1 "Elle gir", R3/2 "Elle sabit", 0133 aslında "Maliyete bağlı / Elle sabit") | "Hesapla" ve "Elle sabit"; tek sabitten | R3/2 QA kararı 23 ile sonradan geldi; "Elle sabit" iki seçicide aynı kavram |
| 31 | Malzeme satırı ve kırılımı birlikte taşıyan eski parça | Türetme bugünkü önceliği izler: malzeme satırı varsa yalnız malzeme kalemi türer, kırılım türetilmez | C8 ve AC-41 korunur. Bedel: dokunulup kaydedilince kırılım R25 gereği silinir (sürüm notunda) |
| 32 | Tutarı girilmemiş kırılım satırları | Spec'teki gibi kalem olmazlar | Tutarsız satırı kalem yapmak R27/2 yüzünden maliyeti "girilmedi"ye çevirir, C8 kırılır. Bedel: dokunulup kaydedilince yalnız tedarikçi bağı taşıyan satır kaybolur |
| 33 | AC-45 ile AC-94/AC-96 | AC-45 dokunma işaretiyle okunur (AC-95'in yolu) | R26/2 olmadan ikisi birlikte sağlanamaz |
| 34 | AC-20 ile R20/2 | R20/2: zam ibaresi yalnız işlem kalemi varken | Koşulsuz ibare spec'in kapattığı gürültü |
| 35 | Elle tutar ve dokunma işareti | Elle tutar bugünkü gibi her zaman formdan yazılır (türetilmiş liste boşken); işaret yalnız kalem alanını ve üç eski alanın silinmesini yönetir; Hesapla kipinde dokunulmamış parçada eski alanlar (elle maliyet dahil) aynen kalır | Sıradan elle maliyet düzenlemesi bozulmasın |
| 36 | Kip formda yerel durumdur | Hesapla seçilip kalem eklenmeden kaydedilirse kalem de elle maliyet de yazılmaz; kart yeniden açılınca Elle sabit görünür | Boş durum görünür; kaydı engellemeye gerek yok |
| 37 | Kip onayı parça kartının içinde | Onay açıkken kartın kapanışı Escape'le tetiklenmez (0126 deseni) | Modal ve onay penceresi Escape'i window'da dinler; kaydedilmemiş kart kapanırdı |
| 38 | Kalemin satır anahtarı | Formda geçici `_anahtar` (kayda yazılmaz) | R45 kalemde kimlik yok; hata doğru satırda kalsın |
| 39 | Türetmenin yeri | `src/lib/maliyetKalemleri.js`, hiçbir lib modülünü içe almayan yaprak modül; toplam ve doğrulama `urunAgaci.js`'te | `gider.js` tedarikçi koruması için türetmeye muhtaç; `malzeme` ya da `urunAgaci`'na konsa döngü olurdu (0133 dersi) |
| 40 | R23/2 taramasının gerekçeli istisnaları | Türetme modülü, `db.cjs`, `merge.js`'in eski üç eşlemesi (R34/2), parça kartının dokunulmamış kopya dalı (anahtarları türetme modülünün sabitinden) | Bu yerler eski alanı okumak zorunda |
| 41 | AC-118'in "aynı rakam" iddiası | İki sayının aynı okuma yolunu kullandığı ve bütün parçaların değişeceği fikstürde aynı rakamı verdiği ölçülür | Panel bütün parçaları, onay süzülmüş listenin değişecek olanlarını sayar |
| 42 | Set doluyken emniyet payı | Pay alanı yeni yerinde de set doluyken pasif ve nedenlidir | 0134 Karar 32: sette pay yok; bugünkü davranış |
| 43 | Aynı parçada aynı kesitte iki malzeme kalemi (sipariş) | Hesapta girişler ayrı (kesit hesabı adetle toplar, C9); ekranda kesitin dökümünde aynı parça tek satırda toplanır | Hesap değişmez, döküm okunaklı kalır |
| 44 | `MalzemeSatiriAlani.jsx` | Silinmez, tek malzeme kaleminin satırına dönüşür (adet, kaldır düğmesi; pay çıkar); yeni liste ayrı dosya | Kanıt eşlemesi ve 0132 testleri bu dosyaya bağlı |

### Uygulamada verilen kararlar (2026-11-08)

| No | Bulgu | Karar |
|---|---|---|
| 45 | Malzeme ve işlem kaleminin kaldır düğmesi aynı erişilebilir adı taşıyordu ("Kalemi kaldır 1" iki kez) | Adlar türüyle ayrıldı: "Malzeme kalemini kaldır n", "İşlem kalemini kaldır n" |
| 46 | Tutarı boş işlem kaleminin uyarısı yalnız kayıt anında üretiliyordu; kayıt başarılı olunca pencere kapandığı için hiç görünmüyordu | Uyarı kartın canlı özetinden gelir (R19, R43) |
| 47 | Hatalı kalem varken kaynak ibaresi kayboluyordu (özet yalnız geçerli kalemlerden kuruluyordu) | Hesapla kipinde ibare formdaki kalem sayılarından (R39) |
| 48 | Dokunulmamış set kaydında eski kalem alanı aynen kopyalanıyordu | Set dolu kayıtta kalem alanı her yoldan silinir (R25/3, AC-108) |
| 49 | 0099'un ekran testi (`tests/ui/kirilim-toplami-0099.test.jsx`) bütünüyle kalkan hammadde toplam kutusunu sınıyordu | Dosya silindi; karşılıkları 0135 testlerinde. Saf testin üç kriteri kalem diline çevrildi |
| 50 | Tedarikçi kullanım sayısı eskiden kırılım satırı başına artıyordu | Parça başına bir kez sayılır (aynı tedarikçi iki işlem kaleminde serbest olduğu için, R15/2) |
| 51 | Triyaj bulgu 1: kalem hatası satır sırasıyla tutuluyordu, satır kaldırılınca geçerli komşu satıra kayıyordu (Karar 38'e aykırı) | Hatalar satırın geçici anahtarına (`_anahtar`) bağlanır |
| 52 | Triyaj bulgu 2: üç bozma kaçtı (Elle sabit'e geçişte eski elle tutar, ekleme kartında set pasifliği ve Escape koruması) | Testler genişletildi; üç bozma ve bulgu 1 ile 3'ün bozmaları ölçüldü, hepsi yakalanıyor |
| 53 | Triyaj bulgu 3: malzeme kaleminin adedi maliyette ve siparişte iki ayrı kuralla okunuyordu | Tek okuyucu `urunAgaci.kalemAdetiOf`; sipariş geçersiz adedi eksik sayar |

### Açıkça ertelenen karar

**İşlem fiyatlarının kendi kataloğu.** Lazer kesim, kaplama ve büküm gibi kalemler bir parçanın maliyetinin yarısına çıkabiliyor ve bugünkü tasarımda zam zincirine girmiyorlar. İşlem satırı ileride bir katalog kaydına bağlanabilecek biçimde tasarlanacak ama bu spec'te katalog açılmayacak (X1). **Öneri:** kullanım birkaç ay izlendikten sonra, işlem tutarlarının gerçekten eskidiği görülürse ayrı bir spec'le (Malzemeler panelinin ikizi: birim fiyat, fiyat geçmişi, zam penceresi) ele alınsın.

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
