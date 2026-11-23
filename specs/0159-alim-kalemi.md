# 0159 — Satın alınan parçaya fason işlem eklenebilir

| | |
|---|---|
| **Durum** | Onaylandı (Takım Yöneticisi, 2026-11-23) |
| **Sahip** | Analist (yazım) |
| **Onaylayan** | Takım Yöneticisi |
| **Revizyon** | 3 (2026-11-23 plan turu: P1–P9; plan `specs/0159-uygulama-plani.md`) |
| **QA turu** | 2026-11-23: 21 bulgu (4 Bloklayıcı / 11 Önemli / 6 Küçük), hepsi onaylandı |
| **Düzeltilen iddialar** | 2 (sipariş tarafının hazır olduğu, 0157'nin henüz kabul edilmediği) |
| **Etkilenen alanlar** | Parça kartının maliyet bölümü (`MaliyetKalemleriAlani.jsx`, `PartManager`), kalem metin sabitleri (`urunAgaci.js`, `maliyetKalemleri.js`), sipariş motoru ve belgesi (`siparisIhtiyaci.js`, `siparisRaporu.js`, `stock/SiparisPenceresi.jsx`), maliyet geçmişi karar motoru, `gider/Tedarikciler.jsx` ipucusu |
| **Bağımlı spec'ler** | 0135 (maliyet kalemleri ve kip), 0150 (işlem kalemlerinin sipariş satırı), 0140 (parçanın ana tedarikçisi), 0157 (kalemin döviz tutarı, **tamamlandı**), 0144 ve 0158 (belgenin fiyatlı nüshası ve genel toplamı), 0097 (maliyetin tarihli geçmişi), 0138 (eski katalog kaleminin savunması) |

---

## Intent

Bazı parçalar bir yerden satın alınıp başka bir yerde işleniyor: dış yay A firmasından alınıyor, B firmasında kalaylanıyor. Bugün bu parçanın maliyeti kurulamıyor. Maliyet kipi "Elle sabit" seçilince kalem listesi hiç çizilmiyor, "Hesapla" kipine geçilince de elle girilmiş tutar siliniyor, yani kullanıcı 40 liralık dış yayın bedelini kaybetmeden üzerine 10 liralık kalaylamayı ekleyemiyor ve iki firmaya da sipariş satırı çıkmıyor. Bu iş bittiğinde satın alma bedeli de bir kalem olarak yazılacak, kip değiştirildiğinde elle girilen tutar silinmeyip kaleme dönüşecek ve sipariş listesi dış yayı A firmasına, kalaylamayı B firmasına kendi satırıyla yazacak. Bedel bir kez sayılacak: bugün malzemesiz parçanın hazır parça satırı parçanın TOPLAM maliyetini taşıyor, yani alım kalemi eklenince aynı bedel hem o satırda hem alım satırında görünüyor ve fiyatlı nüshanın genel toplamı şişiyor (R6/2).

---

## Requirements

- **R1.** Parçanın satın alma bedeli, fason işi, nakliyesi ve benzeri lira tutarlı maliyetleri aynı kalem türüyle yazılır; kavramın ekrandaki adı satın almayı da kapsar.
- **R1/2.** Kavramın adı **"Alım ve işlem"**, kısa biçimi **"Alım / işlem"**dir ve tek sabit kümesinden gelir: satır başlığı `Alım / işlem kalemi <n>`, ekleme düğmesi "Alım/işlem ekle", ad alanı "Alım ya da işlem adı", yer tutucu "Örn: Dış yay alımı, kalaylama", pencere ve belgenin tablo başlığı "Alımlar ve işlemler", belge sütunu "Alım / işlem", fiyatlı nüshanın toplam satırı "Alımlar ve işlemler toplamı". "Fason" tek başına nakliyeyi dışarıda bırakır, "gider" C6 gereği yasaktır.
- **R1/3.** Erişilebilir adlar da yeni adı taşır (bugün "İşlem adı n", "İşlem tedarikçisi n", "İşlem tutarı n", "İşlem kalemini kaldır n"); erişilebilir ad ekranda okunan addır, eski kalırsa AC-11 ölçülemez. Testlerdeki 62 atıf bu turda güncellenir (Ölçüm F).
- **R1/4.** Değişmeyenler: `KALEM_TUR.ISLEM` veri değeri (C1), `islem-kalemi` ve `kalem-tutar` test kimlikleri ve 0138'in `ESKI_KALEM_ADI` ("Dış işlem") yer tutucusu. Yalnız kullanıcıya görünen metinler değişir; kimlikler de yeniden adlandırılırsa 0135, 0138, 0150 ve 0157 testlerinin yarısı gereksiz kırılır.
- **R2.** "Elle sabit" kipinden "Hesapla" kipine geçilince elle girilmiş tutar **silinmez**, listenin ilk kalemi olur; adı düzenlenebilir bir varsayılanla gelir ve parçanın ana tedarikçisi varsa o kalemde seçili gelir.
- **R2/2.** Dönüştürülen kalem elle maliyetin **para birimini, kurunu ve kurun kaynağını** da taşır (0157'nin alanları: `maliyetParaBirimi` → kalemin `paraBirimi`, `maliyetKuru` → kalemin `kur`, formun `_maliyetKurKaynak` → kalemin `_kurKaynak`). Kaynak taşınmazsa kayıttan açılan altı ondalıklı kur kalem doğrulamasında dört ondalık sınırına takılır ve kayıt hata verir; kalem yolunda `elleMaliyetDogrula`'nın "kayıtlı kur" kaçışı yoktur (Ölçüm I, J).
- **R2/3.** Varsayılan ad tek sabittir: `ALIM_KALEMI_VARSAYILAN_ADI = "Parça alımı"`. 0135'in `TURETILEN_KALEM_ADI`'si ("Hammadde alımı") kullanılmaz, o eski kırılımdan türeyen kalemin sabit adıdır ve iki kavram karışır.
- **R2/4.** Taşınan tutar elle alanın **ham** değeridir (noktasız: "2400", "1234,56"), görünüm değeri ("2.400") değil; kalem alanı düz metindir ve noktalı metni belirsiz sayı sayar (Ölçüm P, Q).
- **R2/5.** Elle maliyeti **0** olan parça da dönüştürülür (ücretsiz gelen parça 0 tutarlı kaleme döner, toplam 0); AC-7 yalnız boş alanı kapsar.
- **R2/6.** Dönüşüm ekleme ve düzenleme formunda aynı kuralla çalışır. Gider yetkisi olmayan kullanıcıda tedarikçi seçicisi çizilmez ama ön doldurulan bağ kayda yazılır (0135 R21'in bugünkü davranışı); kip seçici yetkiye bağlı değildir, dönüşüm de olmamalıdır.
- **R2/7.** Elle sabitten Hesapla'ya geçişte onay sorulmaz ve `KIP_ONAY_HESAPLA` ("elle girilen maliyet temizlenir") kaldırılır: artık hiçbir şey kaybolmaz, yanlış metinli onay kullanıcıyı caydırır (Ölçüm H).
- **R3.** "Hesapla" kipinden "Elle sabit" kipine geçerken listede yalnız bir kalem ve o kalem tutarı girilmiş bir alım ya da işlem kalemiyse tutarı elle alana taşınır; malzeme kalemi varsa ya da kalem birden çoksa bugünkü uyarı ve temizleme davranışı sürer.
- **R3/2.** Taşıma koşulu tam olarak şudur: tek kalem **ve** türü işlem **ve** 0138'in `_eskiKatalog` işareti yok **ve** tutarı `islemTutariDogrula`'dan geçerli ve dolu (0 dahil). Eski katalog kalemi taşınırsa `_eskiKalem`'de korunan özgün nesne kaybolur ve maliyet sessizce düşer (0138 R2/2).
- **R3/3.** Geçersiz tutarlı kalem taşınmaz; taşınan değer ham metin değil doğrulanmış değerin form metnidir (`tutarMetni(deger)`). Kalem yolu "2.400"ü belirsiz sayı sayıp reddediyor, elle maliyetin doğrulayıcısı (`parcaMaliyetDogrula`) belirsiz deseni denetlemiyor ve `tutarCoz` onu 2400 okuyor: ham metin taşınsa kalemde hata veren rakam elle alanda sessizce kabul edilir (Ölçüm P).
- **R3/4.** Taşımada kalemin **adı ve tedarikçisi düşer** (elle maliyetin ad ve tedarikçi alanı yok) ve bu, elle alanın altında tek cümleyle yazılır. Parçanın Ana tedarikçisine dokunulmaz. Eski `hammaddeler` kırılımından türeyen kalemde tedarikçi bağı da gider; kullanıcı bunu bilmeden seçerse sipariş listesinden satır kaybeder.
- **R3/5.** Taşıma ters yönde de para birimini, kuru ve kurun kaynağını geri taşır (R2/2'nin aynası); kuru çözülemeyen döviz kalem de taşınır ve aynı neden elle alanda görünür.
- **R3/6.** Onay yalnız taşıma koşulu sağlanmadığında sorulur ve bugünkü `KIP_ONAY_ELLE` metniyle sürer; koşul sağlanıyorsa onay yoktur.
- **R4.** "Elle sabit" kipindeyken ekran, fason ya da ikinci bir maliyet eklemek için hangi kipe geçileceğini söyleyen bir ipucu gösterir.
- **R4/2.** İpucu elle alanın bugünkü ipucusundan (`MALIYET_IPUCU`) sonra kendi kimliğiyle (`elle-kip-ipucu`) ayrı bir `Ipucu` olarak çizilir ve kip adını `MALIYET_KIP_ADLARI`'ndan okur (ad ikinci kez yazılmaz, C6). Set içeriği doluyken (kip seçici pasif) çizilmez; gider yetkisi istemez.
- **R5.** Bir parçada alım ve işlem kalemleri birlikte durabilir ve her birinin kendi tedarikçisi olabilir; maliyet hepsinin toplamıdır (bugünkü toplama kuralı).
- **R5/2.** Kip geçişi maliyeti değiştirmez, dolayısıyla **maliyet geçmişine satır yazılmaz**. Bugün yazılır: 0157'nin üçlü tetikleyicisi döviz bilgisini kaydın kendi `maliyet`, `maliyetParaBirimi`, `maliyetKuru` alanlarından okuyor (`gecmisDovizi` → `parcaDovizMaliyeti`), dönüşüm bu üç alanı sildiği için lira kuruş aynı kalsa da karşılaştırma yanlış döner ve geçmişe sahte satır düşer (Ölçüm K). Kural: yeni kayıtta döviz bilgisi yokken **ve kalem listesi doluyken** eski döviz bilgisi yok sayılır, lira kuruş eşitse kayıt yazılmaz (triyaj: elle döviz → elle lira düzenlemesinde 0157'nin üçlü anahtarı sürer).
- **R6.** Sipariş listesi ve belgesi bu kalemleri bugünkü gibi her birinin kendi tedarikçisinin bölümünde satır olarak yazar; tedarikçisi girilmemiş kalem belgede basılmaz, ekranda "Tedarikçisi belirtilmemiş" kutusunda görünür.
- **R6/2.** **Bedel bir kez sayılır:** malzemesiz parçanın hazır parça satırının tutarı, parçanın maliyeti eksi alım ve işlem kalemlerinin toplamıdır. Dönüştürülmüş parçada bu sıfıra iner, tutar yazılmaz ve nedeni yazılır ("bedeli alım/işlem satırlarında"); kalemsiz eski parçada bugünkü tutar aynen kalır, malzemeli parça hiç etkilenmez. Bugün hazır parça satırı parçanın TOPLAM maliyetini taşıyor ve fiyatlı nüshanın genel toplamı `toplamTLK + islemToplamK` olduğu için dış yay örneğinde A firmasının bölümü 50 ₺ ve 40 ₺ satırlarıyla 90 ₺ yazıyor (Ölçüm L, M, N). Bu, 0150'den beri yalnız işlem kalemli parçalarda var olan bir durumdur; bu spec'le kuralın kendisi olur, dolayısıyla burada kapatılır.
- **R6/3.** R6/2 bir motor değişikliğidir: 0144 ile 0158 kıyas altınlarını ve bugünkü 34 işlem kalemli parçanın belge tutarlarını etkiler. Bilinçli fark olarak yazılır ve kıyasta listelenir (C7/2).
- **R7.** Belgedeki tablo ve sütun başlığı da satın almayı kapsayan adı kullanır.
- **R7/2.** Yeniden adlandırma envanteri tamdır ve tek yerde listelenir: `MaliyetKalemleriAlani`'nın satır başlığı ve kaldır erişilebilir adı, "İşlem adı", "İşlem tedarikçisi", `ISLEM_TUTAR_ETIKETI`, "Örn: Lazer kesim" yer tutucusu, `ISLEM_AD_HATASI`, `ISLEM_TUTAR_SAYI_HATASI`, `ISLEM_TUTAR_NEGATIF_HATASI`, `ISLEM_TUTAR_UYARISI`, `ISLEM_ZAM_IBARESI`, `KALEM_BOS_METNI`, `kalemKaynakMetni`, `ISLEMLER_BASLIGI`, `ISLEMLER_TOPLAMI`, `BELGE_SUTUNLARI.islem`, `tedarikcisizIslemMetni`, `HAMMADDE_SUZGEC_NEDENI` ve `gider/Tedarikciler.jsx`'in `HAMMADDE_ISARET_IPUCU`'su. Eksik kalan her metin iki adın yan yana görünmesine yol açar.
- **R8.** Kalem adı boş bırakılamaz (bugünkü kural); varsayılan ad kullanıcının değiştirebileceği bir öneridir.
- **R8/2.** Parçanın Ana tedarikçisi (`parts.tedarikciId`) ile kalemin tedarikçisi iki ayrı bilgidir, ayrışabilir ve senkronlanmaz: Ana tedarikçi parçanın kendi alanı olarak kalır (0140'ın koruma zincirleri ve pencerenin bölümlemesi ona bağlı), kalemin tedarikçisi yalnız o kalemin firmasıdır. R2'nin ön doldurması bir öneridir, bağ değildir.

---

## Constraints

### Uyulması zorunlu

- **C1.** Kayıt biçimi değişmez: kalem türleri bugünkü iki değerde kalır ve alım kalemi veri olarak işlem kalemidir. Üçüncü bir tür açılmaz, çünkü güncellenmemiş bir bilgisayar tanımadığı türdeki kalemi düşürür (0138'de yaşanan sınıf).
- **C2.** Maliyetin tek okuma yolu, toplama kuralı ve kipin kayıttan türemesi değişmez; kip saklanmaz.
- **C2/2.** Maliyet geçmişinin karar motoru tek yerde kalır (`maliyetGecmisiYaz`); R5/2'nin kuralı oraya eklenir ve kendi testi olur. Dönüşüm geçmişe dokunmak için ikinci bir yol açmaz.
- **C3.** Kip geçişindeki dönüştürme saf bir kuralla yapılır ve parça kartının kayıt yolunun dışına çıkmaz; dönüştürme kullanıcının kaydetmesine kadar form durumudur.
- **C3/2.** Saf kural **iki yönlüdür** ve tek fonksiyondur: form durumunu ve hedef kipi alır, yeni form alanlarını ve "onay sorulsun mu" kararını döndürür. Bugün karar `PartManager`'ın `kipDegistir` ile `kipUygula` ikilisinde satır içindedir (Ölçüm G, H); ekran kural yazmaz.
- **C4.** Hiçbir var olan parçanın kaydı kendiliğinden değişmez: göç yok, elle maliyetli parçalar kullanıcı kipi değiştirene kadar aynen kalır.
- **C4/2.** Dönüşümün bilinen sonucu: kalem listesi dolan parçanın maliyeti Excel'den **güncellenmez** (içe aktarma hücreyi almaz, yalnız farklıysa satır numarasıyla bildirir; dolu para birimi ya da kur hücresi kendi hatasını verir, Ölçüm R). Dönüştürülen parçaların maliyeti bundan sonra yalnız parça kartından girilir.
- **C5.** Yeni kalıcı alan, yeni veri bölümü, yeni eylem izni ve yeni sunucu kuralı yok.
- **C6.** Metinler tek yerde sabit; "gider" sözcüğü kullanılmaz, çünkü uygulamada gider modülünün kendi kalem kavramı var ve iki ad karışır.
- **C6/2.** R7/2'nin envanteri kaynak taramasıyla sabitlenir: yeniden adlandırılan metinlerin eski biçimleri `src` altında kalmaz ve yeni ad ikinci bir yerde yazılmaz.
- **C7.** Maliyeti etkilemeyen bir iştir: aynı kalemlerle kurulmuş bir parçanın maliyeti bu spec'ten önce ve sonra aynıdır (kıyas).
- **C7/2.** Kıyasın kapsamı yazılıdır: altın (`0159-once.json`) **motor çıktısını** taşır (parça maliyeti, maliyet geçmişi satırları, sipariş satır nesneleri). Belge HTML'i ayıklamayla karşılaştırılır, çünkü bu iş başlıkları değiştiriyor (AC-12) ve R6/2 hazır parça satırının tutarını değiştiriyor; R6/3'ün bilinçli farkları kıyasta ayrı ayrı listelenir.
- **C7/3.** 0157'nin altını (`tests/fixtures/0157-once.json`) yeniden üretilmez: belgenin "İşlemler" başlığını, "İşlem" sütununu ve "İşlemler toplamı"nı taşıyor (Ölçüm U). İki taraftan yeni adları eski adlara çeviren dar bir ayıklama yazılır (`tests/fixtures/0159-ayikla.js`, 0158'in deseni); altını yenilemek 0157'nin kanıtını zayıflatır.
- **C8.** Tedarikçi silme koruması değiştirilmez, kapsamı dolaylı genişler: Tedarikler penceresi çöpe atmayı yalnız **kalem** bağında engelliyor, Ana tedarikçi bağında engellemiyor (Ölçüm S). Dönüşümden sonra aynı firma kalem bağıyla da görünür ve çöpe atılamaz hâle gelir; bu bilinen sonuç olarak yazılır, kural değiştirilmez.

### KAPSAM DIŞI

- **X1.** Üçüncü kalem türü — *neden:* C1.
- **X2.** Elle sabit kipinde kalem listesinin çizilmesi — *neden:* iki kipin anlamı bulanır; elle tutar zaten kaleme dönüşerek Hesapla kipine taşınıyor.
- **X3.** Var olan elle maliyetli parçaların topluca kaleme çevrilmesi — *neden:* göç yok; dönüşüm kullanıcının kip değiştirdiği parçada olur.
- **X4.** Alım kalemlerinin belgede ayrı başlık altında toplanması — *neden:* Takım Yöneticisi kararı, bugünkü yerleşim korunur.
- **X5.** Alım kaleminin stoğa ya da sipariş adedine ayrı etki etmesi — *neden:* sipariş adedi parçanın adedidir, kalem yalnız satır üretir.
- **X6.** Tedarikçi kartında varsayılan kalem adı tanımlamak — *neden:* ad serbest metin, şablon ayrı iş.
- **X7.** Alım kaleminin bedelinin hazır parça satırında da sayılması — *neden:* R6/2; aynı bedelin iki satırda görünmesi ve genel toplamın şişmesi sayı hatasıdır. Kabul edip fiyatlı nüshaya kapsam notu yazmak değerlendirildi, reddedildi.
- **X8.** Dönüştürülen parçanın maliyetinin Excel'den güncellenmesi — *neden:* C4/2; kalem listeli parçanın hücresi 0135'ten beri okunmuyor, bu işte açılmaz.
- **X9.** Parçanın Ana tedarikçisi ile kalemin tedarikçisinin senkronlanması — *neden:* R8/2; senkron yazmak 0140'ın tek yazıcısını ikiye böler.

---

## Context

- **Kip kayıttan türüyor, saklanmıyor:** kalem listesi doluysa "Hesapla", boşsa "Elle sabit" (`maliyetKalemleri.js` `kalemVarMi`, 0135 R2). Elle sabit kipinde kalem listesi çizilmiyor; Hesapla kipine geçişte ekran "Hesapla kipine geçilince elle girilen maliyet temizlenir" diyor (`MaliyetKalemleriAlani.jsx` `KIP_ONAY_HESAPLA`), ters yönde ise "kalemler listeden kalkar" (`KIP_ONAY_ELLE`). Bildirilen acı tam burada.
- **İstenen maliyet bugün de kurulabiliyor, adı yok:** işlem kalemi `{ ad, tedarikciId?, tutar }` yani serbest adlı, tedarikçili, lira tutarlı bir kalem; yalnız işlem kalemlerinden oluşan parçanın maliyeti `maliyetKalemleriOzeti` ile toplanıyor. "DIŞ YAY ALIMI 40" ve "KALAYLAMA 10" iki kalem yazıldığında maliyet 50 lira çıkar. Eksik olan kavramın adı, kip geçişinde tutarın korunması ve bunun ekranda anlatılması.
- **Sipariş tarafı yarı hazır (düzeltilen iddia):** 0150'den beri her işlem kalemi kendi tedarikçisinin bölümünde "parça, işlem, sipariş adedi" satırı olarak basılıyor; tedarikçisi girilmemiş kalem belgeye girmiyor ama ekranda "Tedarikçisi belirtilmemiş" kutusunda görünüyor. Satırların çıkması için kod gerekmiyor, **ama bedelin bir kez sayılması için gerekiyor:** malzemesiz parça aynı zamanda Ana tedarikçisinin bölümünde hazır parça satırıdır ve o satırın tutarı parçanın TOPLAM maliyetidir (`parcaMaliyetKurus` × adet), fiyatlı nüshanın genel toplamı da `toplamTLK + islemToplamK`. Dış yay örneğinde A firmasının bölümü "DIŞ YAY 50 ₺" ve "Parça alımı 40 ₺" satırlarıyla 90 ₺ yazar, ekranda da parça iki tabloda iki kez listelenir (Ölçüm L, M, N). Spec'in ilk hâli bunu "kod gerekmiyor" diye yazmıştı; R6/2 bu yüzden eklendi.
- **Tarihli maliyet çalışıyor:** malzeme kalemi olmayan parçada maliyet geçmişi parçanın kendi geçmişinden okunuyor (0135 R35/4 karma okuma, 0138 ile kapı dar tutuldu), yani alım ve işlem kalemleriyle kurulmuş parçanın geçmişi bugünkü gibi yazılır.
- **Parçanın ana tedarikçisi var:** 0140 ile `parts.tedarikciId` eklendi ve gider yetkisi olan kullanıcıya kartta gösteriliyor; dönüştürülen alım kaleminin tedarikçisi bundan ön doldurulabilir (R2).
- **Canlı veride ölçülenler (2026-11-22):** 433 canlı parçanın 93'ü elle maliyetli, 34'ünde işlem kalemi var (47 kalem). Yani bu işten etkilenecek olanlar, elle maliyetli 93 parçadan fason ya da ikinci bir bedel taşıyanlar; hepsi değil.
- **Bilinen tuzaklar:**
  - **Ad tuzağı:** gider modülünün kendi "kalem" kavramı var (gider kalemi) ve "gider" sözcüğü bu ekranda kullanılırsa iki kavram karışır (C6). Aynı biçimde `KALEM_TUR.ISLEM` veri değeri ekrandaki adla birlikte değiştirilmemeli.
  - **Dönüştürülen kalemin adı boş kalamaz.** Doğrulama bugün adı zorunlu tutuyor; dönüşüm adsız kalem üretirse kayıt kullanıcıya hata verir ve tutar yine kaybolmuş gibi görünür.
  - **Geri dönüşte veri kaybı.** Hesapla kipinden Elle sabit kipine geçiş birden çok kalemi siler; R3 yalnız tek kalemli ve güvenli hâlde taşıma yapar, gerisinde bugünkü onay korunur.
  - **0157 tamamlandı (düzeltilen iddia).** Spec'in ilk hâli "0157 kabul edilirse" diyordu; 0157 bu spec yazıldıktan sonra uygulandı (commit `0b88d517`, `specs/done/0157-doviz-parca-maliyeti.md`, Ölçüm W). Yani kalemin tutarı bugün döviz olabilir ve dönüşüm onun alan kurallarına uymak zorundadır: para birimi, kur ve kurun kaynağı (R2/2, R3/5), geçmişin üçlü tetikleyicisi (R5/2). Kaynağı taşımamak kaydı hata ile durdurur, döviz bilgisini taşımamak dolarla alınan dış yayın bedelini liraya düşürür.

### QA turunda ölçülenler (2026-11-23)

Hepsi HEAD'de (`42caac58`) okunarak ölçüldü.

| # | Ölçüm | Yer |
|---|---|---|
| A | Satır başlığı `İşlem kalemi <n>`, kaldır erişilebilir adı `İşlem kalemini kaldır <n>`, alanlar "İşlem adı", "İşlem tedarikçisi", "İşlem tutarı", yer tutucu "Örn: Lazer kesim" | `MaliyetKalemleriAlani.jsx:74, 79, 84, 89, 97` |
| B | Kalem metin sabitleri: `ISLEM_AD_HATASI`, `ISLEM_TUTAR_SAYI_HATASI`, `ISLEM_TUTAR_NEGATIF_HATASI`, `ISLEM_TUTAR_UYARISI`, `ISLEM_TUTAR_ETIKETI`, `ISLEM_ZAM_IBARESI`, `KALEM_BOS_METNI`, `kalemKaynakMetni` | `urunAgaci.js:397-512` |
| C | `ISLEMLER_BASLIGI` = "İşlemler", `ISLEMLER_TOPLAMI`, `tedarikcisizIslemMetni`, `HAMMADDE_SUZGEC_NEDENI` | `siparisIhtiyaci.js:62-71` |
| D | Belge sütunları `islem: ["Parça", "İşlem", "Sipariş adedi"]` | `siparisRaporu.js:44` |
| E | `HAMMADDE_ISARET_IPUCU` parçaların işlem kaleminden söz ediyor | `gider/Tedarikciler.jsx:20` |
| F | Yeniden adlandırılacak metinlere testlerde 62 atıf | `tests/` taraması |
| G | `kipUygula` Hesapla'ya geçişte `maliyet`, `maliyetParaBirimi`, `maliyetKuru` alanlarını siliyor; Elle'ye geçişte kalem listesini boşaltıyor | `PartManager.jsx:553` |
| H | `kipDegistir` kaynak tarafta veri varsa onay açıyor; metinler `KIP_ONAY_HESAPLA` ve `KIP_ONAY_ELLE` | `PartManager.jsx:554-557`, `MaliyetKalemleriAlani.jsx:59-60` |
| I | `kalemFormu` kalemi `_kurKaynak: TURETILEN` ile açıyor; `kurCoz` elle kaynakta en çok dört, öneri ve türetilende altı ondalık | `urunAgaci.js:492-498`, `kur.js:28-39` |
| J | `elleMaliyetDogrula`'nın "kayıtlı kur" kaçışı var, kalem yolunda yok | `urunAgaci.js:355` |
| K | `gecmisDovizi` → `parcaDovizMaliyeti` kaydın `maliyet`, `maliyetParaBirimi`, `maliyetKuru` alanlarını okuyor; `dovizEsit` üçünü karşılaştırıyor | `urunAgaci.js:74-76, 255, 258` |
| L | Malzemesiz parçanın hazır parça satırının tutarı `parcaMaliyetKurus(p, …) × siparis` | `siparisIhtiyaci.js:485-489` |
| M | `genelToplamK = toplamTLK + islemToplamK`; `genelTutarsizSayi` iki sayacın toplamı | `siparisIhtiyaci.js:829-832` |
| N | İşlem satırı bölüm toplamına girmiyor, `islemToplamK` ayrı tutuluyor | `siparisIhtiyaci.js:626-630` |
| O | `islemTutariDogrula` 0'ı geçerli sayıyor; özet 0 tutarlı kalemi toplama katıyor | `urunAgaci.js:417-426, 130-131` |
| P | Kalem tutarı düz `Input`; `BELIRSIZ_DESEN` kalem yolunda reddediliyor, `parcaMaliyetDogrula` denetlemiyor | `urunAgaci.js:420, 520-524` |
| Q | `TutarInput`'un ham değeri noktasız, görünüm binlik noktalı | `tutarGirdisi.js:2-4, 82` |
| R | Kalem listeli parçanın Excel maliyet hücresi alınmıyor (`KALEM_EXCEL_HATASI`); dolu döviz hücresi `EXCEL_DOVIZ_KALEM_SET_HATASI` | `parcaAktarma.js:215-216, 235` |
| S | Tedarikler penceresi çöpe atmayı yalnız kalem bağında engelliyor (`sil.k.parca > 0`), Ana tedarikçi bağında engellemiyor | `gider/Tedarikciler.jsx:143` |
| T | `kalemdeGecenTedarikciler` kalem, Ana ve malzeme bağlarını ayrı sayıyor | `gider.js:1121` |
| U | `0157-once.json` belgenin `>İşlemler<` (6), `>İşlem<` (6) ve "İşlemler toplamı" (3) metinlerini taşıyor; `0150-once.json` taşımıyor | `tests/fixtures/` |
| V | `islemTedarikciSecenekleri` bütün canlı tedarikçileri veriyor; sipariş penceresinin seçici listesi kalem tedarikçilerini de içeriyor | `urunAgaci.js:392`, `siparisIhtiyaci.js:141` |
| W | 0157 tamamlandı: commit `0b88d517` | `specs/done/0157-doviz-parca-maliyeti.md` |
| X | Özet, tutarı boş işlem kalemini toplam dışında bırakıyor; hiç katkı yoksa toplam `null` | `urunAgaci.js:134-137` |
| Y | `hazirlaTemel`'in dokunulmamış dalı eski kayıttan `ESKI_MALIYET_ANAHTARLARI` ve kalem alanını kopyalıyor | `PartManager.jsx:353-359` |

### QA turunda verilen kararlar (2026-11-23)

**B1 · Bloklayıcı · Yeni adın kendisi.** Şemsiye ad "Alım ve işlem", kısa biçim "Alım / işlem"; sabitler ve erişilebilir adlar R1/2 ile R1/3'te sayıldı — *neden:* spec adı istiyor ama söylemiyordu; "fason" nakliyeyi dışarıda bırakır, "gider" C6 ile yasak, erişilebilir ad eski kalırsa AC-11 ölçülemez.

**B2 · Bloklayıcı · Dönüşümün döviz alanları.** Para birimi, kur ve kurun kaynağı taşınır (R2/2, R3/5) — *neden:* kaynak taşınmazsa kayıttan açılan altı ondalıklı kur dört ondalık sınırına takılır ve kayıt hata verir; kalem yolunda kayıtlı kur kaçışı yoktur (Ölçüm I, J).

**B3 · Bloklayıcı · Dönüşüm sahte geçmiş satırı yazıyor.** Lira kuruş eşitse geçmişe satır yazılmaz; karar motoruna yeni kayıtta döviz bilgisi yokken eski bilgiyi yok sayan kural eklenir (R5/2, C2/2) — *neden:* üçlü tetikleyici döviz bilgisini silinen alanlardan okuyor, sahte satır kapanmış partilerin tarihli maliyetini kaydırır ve AC-16 ile C7'yi çiğner.

**B4 · Bloklayıcı · Aynı bedel iki kez sayılıyor.** Malzemesiz parçanın hazır parça satırının tutarı, maliyet eksi kalem toplamı olur (R6/2, R6/3, X7) — *neden:* bugün aynı bedel iki satırda görünüyor ve fiyatlı nüshanın genel toplamı şişiyor; kapsam notu yazmak sayıyı doğru yapmaz.

**Ö1 · Önemli · Kip onayının akıbeti.** Elle'den Hesapla'ya onay sorulmaz ve `KIP_ONAY_HESAPLA` kaldırılır; ters yönde onay yalnız taşıma koşulu sağlanmadığında sürer (R2/7, R3/6) — *neden:* artık hiçbir şey kaybolmuyor, yanlış metinli onay kullanıcıyı caydırır.

**Ö2 · Önemli · Taşıma koşulu.** Tek kalem, türü işlem, `_eskiKatalog` yok, tutarı geçerli ve dolu (0 dahil) (R3/2) — *neden:* eski katalog kalemi taşınırsa 0138'in koruduğu özgün nesne kaybolur; geçersiz tutarlı kalemde taşıma hatayı gizler.

**Ö3 · Önemli · Belirsiz sayı ters yönde anlam değiştiriyor.** Geçersiz tutar taşınmaz, taşınan değer doğrulanmış değerin form metnidir (R3/3) — *neden:* kalem yolu "2.400"ü reddediyor, elle yol denetlemiyor ve `tutarCoz` onu 2400 okuyor (Ölçüm P).

**Ö4 · Önemli · Taşımada ad ve tedarikçi düşüyor.** Taşıma yapılır, düşen bilgi elle alanın altında tek cümleyle yazılır, Ana tedarikçiye dokunulmaz (R3/4) — *neden:* kullanıcı iki kalemi tek tutara indirmeyi bilerek seçiyor ama tedarikçi bağının gittiğini bilmeden seçerse sipariş satırı kaybeder.

**Ö5 · Önemli · İpucunun yeri ve metni.** Elle alanın ipucusundan sonra kendi kimliğiyle ayrı `Ipucu`, kip adı sabit kümesinden, set doluyken çizilmez, yetki istemez (R4/2) — *neden:* C6 metinleri tek yerde tutuyor, kip adının ikinci kez yazılması iki adın ayrışmasına yol açar.

**Ö6 · Önemli · Varsayılan ad.** `ALIM_KALEMI_VARSAYILAN_ADI = "Parça alımı"` (R2/3) — *neden:* `TURETILEN_KALEM_ADI` eski kırılımdan türeyen kalemin sabit adı; aynı adı kullanmak 0135'in türetme testlerini belirsizleştirir.

**Ö7 · Önemli · Excel hücresi okunmaz oluyor.** Bilinen sonuç olarak yazılır (C4/2, X8) — *neden:* dönüştürülen parçalarda kullanıcının Excel alışkanlığı sessizce çalışmayı bırakır.

**Ö8 · Önemli · 0157 altını kırılıyor.** Altın yenilenmez, dar ayıklama yazılır (C7/3) — *neden:* altını yenilemek 0157'nin kanıtını zayıflatır; ayıklama farkı tek yerde ve okunur tutar.

**Ö9 · Önemli · Kıyasın kapsamı.** Altın motor çıktısını taşır, belge ayıklamayla karşılaştırılır, bilinçli farklar listelenir (C7/2) — *neden:* kapsamı yazılmamış kıyas ilk kırılışta gevşetilir.

**Ö10 · Önemli · Hangi formlarda ve hangi yetkide.** İki formda aynı kural; yetkisiz kullanıcıda seçici çizilmez, bağ kayda yazılır (R2/6) — *neden:* kip seçici yetkiye bağlı değil, dönüşüm de olmamalı.

**Ö11 · Önemli · İki tedarikçi alanı.** Ayrışabilir ve senkronlanmaz (R8/2, X9) — *neden:* senkron yazmak 0140'ın tek yazıcısını ikiye böler; serbest olduğunu yazmamak "hangisi doğru" sorusunu doğurur.

**K1 · Küçük · Taşınan tutarın biçimi.** Ham değer taşınır, görünüm değeri değil (R2/4) — *neden:* iki alanın girdi kuralı farklı, tek satırla yazılırsa unutulur.

**K2 · Küçük · Sıfır tutar.** 0 dönüştürülür ve ters yönde "girilmiş" sayılır (R2/5, R3/2) — *neden:* ipucu ücretsiz parça için 0 yazılmasını söylüyor, bu hâl sınır değer olarak yazılmalı.

**K3 · Küçük · Tedarikçi çöpe atma kuralı.** Kapsamı dolaylı genişler, kural değiştirilmez (C8) — *neden:* çöpe atma yalnız kalem bağında engelleniyor; dönüşümden sonra aynı firma kalem bağıyla da görünür.

**K4 · Küçük · Adlandırma envanteri.** On yedi metnin tam listesi R7/2'de, taraması C6/2'de — *neden:* eksik kalan her metin iki adın yan yana görünmesine yol açar.

**K5 · Küçük · Görsel kanıt ekranları.** `katalog-parca-0159-elle`, `katalog-parca-0159-donusum`, `siparis-0159-belge` — *neden:* ad verilmezse kanıt eşlemesi kaydı eksik kalır.

**K6 · Küçük · Değişmeyen kimlikler.** `KALEM_TUR.ISLEM`, `islem-kalemi`, `kalem-tutar` ve `ESKI_KALEM_ADI` aynen kalır (R1/4) — *neden:* kimlikler de yeniden adlandırılırsa dört spec'in testlerinin yarısı gereksiz kırılır.

### QA turu karar kaydı

| Bulgu | Derece | Karar | İşlendiği yer |
|---|---|---|---|
| B1 | Bloklayıcı | Ad "Alım ve işlem", sabitler ve erişilebilir adlar | R1/2, R1/3 |
| B2 | Bloklayıcı | Para birimi, kur ve kur kaynağı taşınır | R2/2, R3/5 |
| B3 | Bloklayıcı | Dönüşüm geçmişe satır yazmaz | R5/2, C2/2 |
| B4 | Bloklayıcı | Bedel bir kez sayılır | R6/2, R6/3, X7 |
| Ö1 | Önemli | Elle'den Hesapla'ya onay yok | R2/7, R3/6 |
| Ö2 | Önemli | Taşıma koşulu tam tanımlı | R3/2 |
| Ö3 | Önemli | Geçersiz tutar taşınmaz | R3/3 |
| Ö4 | Önemli | Düşen ad ve tedarikçi yazılır | R3/4 |
| Ö5 | Önemli | İpucunun yeri, metni, kapsamı | R4/2 |
| Ö6 | Önemli | Varsayılan ad sabiti | R2/3 |
| Ö7 | Önemli | Excel hücresi okunmaz olur | C4/2, X8 |
| Ö8 | Önemli | 0157 altını ayıklanır | C7/3 |
| Ö9 | Önemli | Kıyasın kapsamı | C7/2 |
| Ö10 | Önemli | İki form, yetki kuralı | R2/6 |
| Ö11 | Önemli | İki tedarikçi alanı ayrışır | R8/2, X9 |
| K1 | Küçük | Ham değer taşınır | R2/4 |
| K2 | Küçük | Sıfır tutar dönüştürülür | R2/5 |
| K3 | Küçük | Çöpe atma kapsamı genişler | C8 |
| K4 | Küçük | Adlandırma envanteri ve taraması | R7/2, C6/2 |
| K5 | Küçük | Kanıt ekran adları | Definition of Done |
| K6 | Küçük | Değişmeyen kimlikler | R1/4 |

### Plan turunda verilen kararlar (2026-11-23)

Takım Yöneticisi planın önerilerini onayladı ("tum onerilerini onayliyorum"):

| No | Konu | Karar |
|---|---|---|
| P1 | AC-41'in toplamları | Bedeli kalemlerde olan hazır satır "parça tutarı kaynağı" sayılmaz; bölümde başka parça tutarı yoksa "Bölüm toplamı" satırı ve kapsam cümlesi basılmaz (0150 R9/4 emsali). Genel toplam bölüm başınadır; AC-41'in 50'si iki bölümün genel toplamlarının toplamıdır, belge çapında yeni toplam satırı yok. — *neden:* "—" basan toplam yanıltır. |
| P2 | Tedarikçisiz kalemin bedeli | Hazır satırdan bütün kalemler düşülür (tedarikçisiz kalem dahil). — *neden:* bedeli Ana tedarikçinin satırına yazmak onu yanlış firmaya fatura eder; kalem "Tedarikçisi belirtilmemiş" kutusunda görünür. |
| P3 | AC-16 ile R6/2 | Altın sipariş satırlarını taşır; R6/2'den etkilenen hazır satırların ve bölümlerinin tutar alanları ayıklamada iki taraftan düşülür ve listelenir, yeni değerler kendi testinde ölçülür. — *neden:* C7/2. |
| P4 | R6/3'ün kapsamı | Eski kıyaslar koşturulup gerçekten etkilenenler ölçülür; yalnız onlara ayıklama eklenir. — *neden:* varsayımla ayıklama gevşetir. |
| P5 | Kuru çözülemeyen döviz kalemin taşınması | Taşıma kur boşsa geçici form işareti bırakır; elle alan `MALIYET_KUR_EKSIK_NEDENI`'ni gösterir. — *neden:* R3/5; 0157 triyajının yeni girişte bu nedeni çizmeme kararı bozulmaz. |
| P6 | Taşıma notunun ömrü | Not taşımayla çıkar, kayda ya da yeni kip değişimine kadar durur (geçici form alanı); her taşımada yazar. |
| P7 | Geçersiz elle metnin dönüşümü | Ham metin yine kaleme taşınır, kalem kendi hatasını gösterir. — *neden:* R2/7, hiçbir şey kaybolmaz. |
| P8 | Aynı firmaya iki satır | Ana tedarikçi ile alım kaleminin tedarikçisi aynıysa firma tutarsız hazır satırı ve alım satırını görür; X4 gereği yerleşim korunur, hazır satır nedeniyle açıklanır. |
| P9 | Kip sabitlerinin yeri | `MALIYET_KIP = { ELLE, HESAPLA }` motorda (`urunAgaci.js`); `MaliyetKalemleriAlani.jsx` aynı adlarla yeniden dışa verir. — *neden:* saf kural bileşeni içe alamaz. |

---

## Acceptance Criteria

- **AC-1.** Elle sabit kipindeki parça kartında, ikinci bir maliyet eklemek için hangi kipe geçileceğini söyleyen ipucu görünür.
- **AC-2.** Elle sabit kipinde 40 lira girilmiş parça Hesapla kipine geçirilince listede tutarı 40 lira olan bir kalem belirir.
- **AC-3.** Dönüştürülen kalemin adı düzenlenebilir bir varsayılanla gelir.
- **AC-4.** Parçanın ana tedarikçisi varsa dönüştürülen kalemde o tedarikçi seçili gelir.
- **AC-5.** Parçanın ana tedarikçisi yoksa kalem tedarikçisiz gelir ve kayıt yine yapılabilir.
- **AC-6.** Dönüşümden sonra ikinci bir kalem eklenip kaydedilince parçanın maliyeti iki kalemin toplamıdır.
- **AC-7.** Elle maliyeti boş olan parça Hesapla kipine geçirilince boş liste gelir, uydurma kalem üretilmez.
- **AC-8.** Hesapla kipinde tek bir kalem varsa ve o kalem tutarı girilmiş bir işlem kalemiyse Elle sabit kipine geçişte tutar elle alana taşınır.
- **AC-9.** Hesapla kipinde malzeme kalemi varsa Elle sabit kipine geçişte bugünkü onay ve temizleme davranışı sürer.
- **AC-10.** Hesapla kipinde birden çok kalem varsa Elle sabit kipine geçişte bugünkü onay ve temizleme davranışı sürer.
- **AC-11.** Kalem türünün ekrandaki adı, ekleme düğmesi ve ipucu satın almayı da kapsar.
- **AC-12.** Sipariş belgesindeki tablo ve sütun başlığı aynı adı kullanır.
- **AC-13.** Farklı tedarikçili iki kalemi olan parça sipariş listesinde iki ayrı tedarikçi bölümünde satır üretir.
- **AC-14.** Tedarikçisi girilmemiş kalem belgeye girmez, ekranda "Tedarikçisi belirtilmemiş" kutusunda görünür.
- **AC-15.** Kalem adı boş bırakılan kayıt reddedilir, nedeni yazar.
- **AC-16.** Aynı kalemlerle kurulmuş parçanın maliyeti, maliyet geçmişi ve sipariş satırları bu spec'ten önceki değerleriyle birebir aynıdır (`tests/fixtures/0159-once.json`); R6/2'nin bilinçli farkları ayıklamada listelenir (P3).
- **AC-17.** Kayıt gövdesinde kalem türü değeri değişmedi; üçüncü bir tür eklenmedi (kaynak taraması).
- **AC-18.** Yeni kalıcı alan, yeni izin kimliği ve yeni sunucu kuralı eklenmedi (kaynak taraması).

### QA turu kriterleri (2026-11-23)

- **AC-19.** Parça kartının kalem satırı, ekleme düğmesi, ad alanı ve yer tutucusu R1/2'nin adlarını yazar.
- **AC-20.** Kalem satırının erişilebilir adları R1/3'ün adlarını taşır (ad, tedarikçi, tutar, kaldır).
- **AC-21.** `KALEM_TUR.ISLEM` değeri, `islem-kalemi` ve `kalem-tutar` kimlikleri ve `ESKI_KALEM_ADI` değişmedi (kaynak taraması).
- **AC-22.** Dolar cinsinden elle maliyeti olan parça Hesapla kipine geçirilince dönüştürülen kalem para birimini ve kuru taşır; lira karşılığı dönüşümden önceki değerle aynıdır.
- **AC-23.** Kayıttaki kuru altı ondalıklı olan parça dönüştürülüp kaydedilince kur hatası alınmaz (kurun kaynağı taşındı).
- **AC-24.** Dönüştürülen kalemin adı `ALIM_KALEMI_VARSAYILAN_ADI` ile gelir ve bu ad `TURETILEN_KALEM_ADI`'ndan farklıdır.
- **AC-25.** Elle alanda "2400" yazılı parça dönüştürülünce kalemin tutar alanında noktasız ham değer durur ve belirsiz sayı hatası doğmaz.
- **AC-26.** Elle maliyeti 0 olan parça dönüştürülünce tutarı 0 olan bir kalem belirir ve toplam 0 çıkar.
- **AC-27.** Dönüşüm ekleme formunda da çalışır.
- **AC-28.** Gider yetkisi olmayan kullanıcıda tedarikçi seçicisi çizilmez ama ön doldurulan bağ kayda yazılır.
- **AC-29.** Elle sabitten Hesapla'ya geçişte onay penceresi açılmaz ve `KIP_ONAY_HESAPLA` kaynakta yok (kaynak taraması).
- **AC-30.** Hesapla kipinde tek bir eski katalog kalemi (`_eskiKatalog`) varsa Elle sabite geçişte taşıma yapılmaz, bugünkü onay ve temizleme sürer.
- **AC-31.** Tutarı "2.400" yazılı tek kalem varsa Elle sabite geçişte taşıma yapılmaz, bugünkü onay sürer.
- **AC-32.** Tutarı 0 olan tek işlem kalemi Elle sabite geçişte taşınır.
- **AC-33.** Taşımada kalemin adı ve tedarikçisinin kaydedilmeyeceği elle alanın altında yazar; parçanın Ana tedarikçisi değişmez.
- **AC-34.** Döviz tutarlı tek kalem Elle sabite geçişte para birimini ve kuru da elle alanlara taşır.
- **AC-35.** Elle sabit kipindeki ipucu kip adını sabit kümesinden yazar; set içeriği dolu parçada çizilmez.
- **AC-36.** Döviz elle maliyetli parça Hesapla kipine geçirilip kaydedilince maliyet geçmişine satır yazılmaz.
- **AC-37.** Lira elle maliyetli parça dönüştürülüp kaydedilince maliyet geçmişine satır yazılmaz.
- **AC-38.** Maliyeti yalnız alım ve işlem kalemlerinden gelen parçanın hazır parça satırının tutarı yazılmaz ve nedeni yazar; alım kalemi kendi satırında kendi tutarını taşır.
- **AC-39.** Kalemsiz, elle maliyetli parçanın hazır parça satırının tutarı bu spec'ten önceki değeriyle aynıdır.
- **AC-40.** Malzeme kalemi olan parçanın belge satırları ve tutarları bu spec'ten önceki değerleriyle aynıdır.
- **AC-41.** Dış yay örneğinde (alım 40, kalaylama 10, iki ayrı tedarikçi) A firmasının genel toplamı 40, B firmasının 10 çıkar; iki bölümün genel toplamlarının toplamı 50'dir (P1: belge çapında toplam satırı yok).
- **AC-42.** Belgedeki tablo başlığı, sütun başlığı ve toplam satırı R1/2'nin adlarını yazar; pencere aynı adları kullanır.
- **AC-43.** R7/2'nin on yedi metninin eski biçimi `src` altında kalmadı ve yeni ad ikinci bir yerde yazılmadı (kaynak taraması).
- **AC-44.** Parçanın Ana tedarikçisi ile kalemin tedarikçisi farklı olabilir ve biri değiştirilince öteki değişmez.
- **AC-45.** Dönüştürülmüş parçanın maliyet hücresi içe aktarmada alınmaz ve nedeni satır numarasıyla bildirilir.
- **AC-46.** Bir parçanın kaleminde geçen tedarikçi Tedarikler penceresinden çöpe atılamaz ve nedeni satırda yazar.
- **AC-47.** Kip iki kez değiştirilip (Elle → Hesapla → Elle) kaydedilen parçanın maliyeti ve maliyet geçmişi başlangıçtaki değerleriyle aynıdır.
- **AC-48.** Kip geçişinin saf kuralı iki yönü de ve "onay sorulsun mu" kararını tek fonksiyonda verir; ekranda kip kuralı yazmaz (kaynak taraması).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Kip geçişindeki dönüştürme saf kuralla yazıldı ve kendi testi var (C3); kural iki yönlüdür ve onay kararını da verir (C3/2).
- [ ] Dönüşümün maliyet geçmişine satır yazmadığı iki yönde (lira ve döviz) ölçüldü (R5/2, C2/2).
- [ ] Hazır parça satırının tutarının bir kez sayıldığı ve R6/3'ün bilinçli farklarının listelendiği gösterildi.
- [ ] R7/2'nin adlandırma envanteri bütünüyle uygulandı ve taraması yazıldı (C6/2).
- [ ] `0157-once.json` yenilenmedi; ayıklama `tests/fixtures/0159-ayikla.js` ile yazıldı (C7/3).
- [ ] Yeni kalıcı alan yok; bu açıkça yazıldı.
- [ ] Yeni eylem izni yok; parça kartının bugünkü izniyle çalıştığı açıkça yazıldı.
- [ ] Kullanıcıya görünen tüm metinler Türkçe ve tek yerde sabit; "gider" sözcüğü kullanılmadı (C6).
- [ ] Görsel kanıt eklendi (`docs/evidence/0159-*`): iki kipte parça kartı, dönüşüm sonrası liste, iki tedarikçili sipariş belgesi; ekran adları `katalog-parca-0159-elle`, `katalog-parca-0159-donusum`, `siparis-0159-belge` (K5).
- [ ] `0159-once.json` spec öncesi kodla üretildi ve kapsamı C7/2 ile yazıldı; birebir geçti.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
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
