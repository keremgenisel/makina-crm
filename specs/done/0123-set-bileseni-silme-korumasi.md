# 0123 — Sette ve kitte geçen parça silinirken koruma ve kullanım sayıları

| | |
|---|---|
| **Durum** | Tamamlandı (2026-11-02; QA turları Karar 1–33, plan turu Karar 34–42, uygulamada Karar 43–45, triyaj Karar 46–47; uygulama commit `4c5ea0c`; plan `specs/done/0123-uygulama-plani.md`). Kökeni: 2026-11-02, QA boşluk analizi iki tur 2026-11-02, 21 + 12 bulgu işlendi (ikinci tur spec 0130 yayınlandıktan sonra, yeni kod zemininde) |
| **Sahip** | Analist |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | **Kaynak:** `src/lib/urunAgaci.js` (iki yeni saf yardımcı, kapı yüklemi, kullanım cümlesi ve neden metni; `adListesi` dışa verilir), `src/components/PartManager.jsx` (silme onayının metni ve kullanım satırı), `src/components/settings/SettingsTrash.jsx` (parçanın Kalıcı Sil'i ve "çöpü boşalt"; `urunAgaci`'yı ilk kez içe alır), `src/App.jsx` (otuz günlük temizliğin `koru` parametresi; `urunAgaci`'yı ilk kez içe alır). **Test:** yeni `tests/set-silme-0123.test.js` ve `tests/ui/set-silme-0123.test.jsx`. **Belge:** `CLAUDE.md`, `specs/README.md`. Veri şeması, göç, izin tanımları, sunucu kuralları, birleştirme, yazdırma, dışa aktarma, içe aktarma, stok hareketleri ve yedekten geri yükleme dokunulmaz; stok tarafında **`src/lib/setUretimi.js` ile `src/components/stock/SetParcalaPenceresi.jsx` de dokunulmayanlar arasındadır** (0130'un parçalama süzgeci değişmez, X10). `parcayiIcerenSetler` ile `parcaKitAdetleri` gövdeleri aynen kalır (ölçüm 17, ölçüm 18). |
| **Bağımlı spec'ler** | 0121 (setin içeriğini kuran spec), 0087 (model kitini kuran spec), 0096 (korumanın emsali: hammadde kırılımında geçen tedarikçi), 0130 (setin parçalanması: kalıcı silmenin yeni sonucu ve çöpe atmanın yeni yan etkisi, R4/6 ve R3/2). |
| **Ters çevrilen kriterler** | Yok, ve QA turunda yeniden ölçüldü (ölçüm 28): parça silme onayının metnini okuyan, Çöp Kutusu'nun "Yedek Parça Tanımı" satırının davranışını iddia eden ya da `purgeOldTrash(data.parts)` çağrısını kaynak taramasıyla sabitleyen test yok (`cop-kutusu-0068` yalnız `tedarikciler` ve `uretimPartileri` satırlarını sabitliyor). `cop-kutusu-0068` ve `cop-kutusu-0078` kendi satır türlerini ölçüyor, parçaya dokunmuyor. 0087 AC‑11 ile 0121 R5/2'nin testleri de ters çevrilmez: iki var olan yardımcının gövdesi değişmiyor (R1/3, R1/6). |

---

## Intent

Setin içeriğinde bileşen olarak geçen bir parça bugün hiçbir uyarı olmadan silinebiliyor. Silme onayı yalnız "Çöp Kutusu'na taşınacak" diyor, parçanın nerede kullanıldığını söylemiyor; parça çöpe gidince setin maliyeti "girilmedi"ye düşüyor (ekranda görünür, ölçüm 26: eksik bileşen sayısı kartta ve Model Maliyetleri'nde yazılı; sessiz olan maliyet değil, onay penceresi); Kalıcı Sil, "çöpü boşalt" ve otuz günlük otomatik temizlik ise kaydı tamamen kaldırıyor ve setin satırı "kaydı bulunamayan parça" olarak kalıyor. Model kitinde de aynı şey oluyor: kit satırı parçanın adını kopyaladığı için ekranda durmaya devam ediyor ve maliyette eksik sayılıyor (ölçüm 26: bu da görünür, `eksikSayisi` ile). Spec 0096 tam bu sınıf için dört kapılı bir koruma kurmuştu (hammadde kırılımında geçen tedarikçi). Bu iş bittiğinde parçayı silen kişi nerede kullanıldığını onay penceresinde görür ve sette bileşen olan parça kalıcı olarak silinemez.

---

## Requirements

### A. Kullanım tek yerden sayılır

- **R1.** İki saf yardımcı yazılır, işleri ayrıdır (Karar 1):
  - `urunAgaci.setteGecenParcalar(parts)` → `Map(String(partId) → { set, cop })`, haritayı **bir kez** kurar; 0096'nın `kirilimdaGecenTedarikciler` deseni.
  - `urunAgaci.parcaKullanimi(partId, { parts = [], modelDizileri = [], harita = null })` → `{ set, setCop, kit }`: parçanın bileşen olarak geçtiği canlı set sayısı, kendisi çöpte olan set sayısı ve içinde geçtiği canlı model kiti sayısı.
- **R1/2.** Çöpteki setler de sayılır (`setCop`): çöpten geri alınan setin bağı kopmasın. **Kapının kaynak dizisi kapıya göre değişir ve yazılıdır** (Karar 5): Kalıcı Sil ile otuz günlük temizlik haritayı **bütün** parçalardan kurar (AC‑9), "çöpü boşalt" ise yalnız **kalacak** (canlı) parçalardan kurar (0096'nın `bosaltmadaKorunanTedarikciler` emsali), çünkü o süpürme aynı turda çöpteki setleri de siler (ölçüm 15). Yani yalnız çöpteki bir setin içinde geçen parça "çöpü boşalt" kapısında korunmaz; AC‑9 öteki iki kapıya nişanlıdır.
- **R1/3.** Kit sayımı var olan `parcaKitAdetleri(partId, [standardModels, customModels])` çağrısıdır (`Object.keys(...).length`); **o fonksiyonun gövdesi değişmez**. Çöp süzgeci çağırandadır: `PartManager` `customModels` olarak canlı diziyi alıyor (ölçüm 19), standart modeller çöpe atılamıyor. `parcaKitAdetleri`'ne çöp süzgeci eklemek 0087 AC‑11'i ters çevirir (ölçüm 18), eklenmez.
- **R1/4.** `parcaKullanimi`'nin üçüncü anahtarı hazır haritadır (`harita`): verilince yeniden kurulmaz, verilmezse fonksiyon kendisi kurar. 0096 aynı tuzağa triyajda düşüp `tedarikciKullanim`'a beşinci parametre olarak haritayı eklemişti (ölçüm 12). `modelDizileri` **dizi dizisidir** (`[standardModels, customModels]`), deponun bu iş için kullandığı sözleşme bu (`parcaKitAdetleri`, `parcaKitPlani`); verilmezse `kit: 0` döner.
- **R1/5.** Kapının tek yüklemi `urunAgaci.setteGecenParcaMi(partId, harita)` = `(set + cop) > 0`'dır (Karar 4). Üç kalıcı silme kapısı alanları kendisi toplamaz. 0096'nın haritasındaki `parca` alanı **canlı ve çöp toplamıdır** ve kapısı `.has(id)`'dir (ölçüm 14); bu spec'in `set` ile `setCop`'u **ayrıktır**, bu yüzden `.has()` kopyalanamaz (`set` sıfır, `setCop` bir olan hâlde hiçbir şeyi korumaz, tam AC‑9'un durumu).
- **R1/6.** Set sayımı var olan `parcayiIcerenSetler(partId, parts)`'ın haritalı kardeşidir; **o fonksiyon aynen kalır** ve 0121 R5/2'nin iki yönlü iç içe denetimindeki çağrısı dokunulmaz (ölçüm 17). Set **adları** da ondan okunur (R1/8). **Harita, setin kendisinin bileşen olduğu satırı atlar** (Karar 30): `parcayiIcerenSetler` seti kendisi olmaktan hariç tutuyor (`urunAgaci.js:397`, ölçüm 36), haritalı kardeşi bunu kendiliğinden yapmaz. 0121 `SET_KENDISI` ile kendine atfı yasaklıyor ama içe aktarılmış veride bir satır bulunabilir ve o parça hiçbir ekranda çözülemeyecek biçimde kendi kendini kalıcı silinmekten korurdu.
- **R1/7.** `setCop` **setin** durumunu sayar: bu parçayı içeriğinde taşıyan ve **kendisi çöpte olan** set sayısıdır; silinen parçanın kendi durumu hiçbir alana girmez (Karar 7). Cümlede de setten söz edilir ("1 set çöp kutusunda"), çünkü 0096 aynı kavrama ilişkinin öteki ucundan `parcaCop` diyor ve ad karışıyor.
- **R1/8.** **Çöpteki setler de adıyla yazılır (Karar 26).** `parcayiIcerenSetler` yalnız canlı setlerin adını döndürüyor (`!p.deletedAt`, ölçüm 17), bu yüzden çöpteki setin adı için depodaki hazır kalıp kullanılır: `setBilesenAdi`'nin `${p.ad} (${SILINMIS_PARCA})` biçimi. Cümle `geçiyor: Rulman Seti, Pul Seti (silinmiş)` olur; **`(1 set çöp kutusunda)` eki yazılmaz**, sayı cümleden türer. Harita yine `set` ile `cop` sayılarını döndürür (kapı onları kullanır, R1/5), cümle adları kullanır. Adsız sayı kullanıcıyı Çöp Kutusu'nu taramaya zorluyordu.
- **R2.** Sayıları üreten tek yol bu iki yardımcıdır; onay penceresi, Çöp Kutusu ve `App`'in temizliği kendi döngüsünü yazmaz (kaynak taraması).

### B. Dört kapı

- **R3.** **Çöpe atma serbesttir, ama kullanımı söyler.** Parça silme onayı bugünkü cümlesini korur ve altına kullanım satırı ekler: parça kaç sette bileşen, kaç model kitinde geçiyor. Kullanım yoksa satır çizilmez (bugünkü metin birebir kalır).
- **R3/2.** Çöpe atma engellenmez: emekli edilen bir parça çöpe atılabilir olmalı, setin maliyeti o süre boyunca "girilmedi" görünür ve geri alınınca döner. Engel yalnız kalıcı silmedir (R4). **Bilinen sınır (Karar 23, spec 0130'dan beri):** bileşen çöpteyken "Seti Parçala" onun stoğunu artırmaya devam eder (`parcalamaKalemleri` kaydın durumuna bakmıyor, ölçüm 30) ve o stok Parça Stoğu ekranında görünmez (satırlar `parts.map` ile çiziliyor, ölçüm 22); Stok Tutarlılığı raporu onu "Silinmiş parça" adıyla gösterir ve parça geri alınınca adet doğru görünür. Bu bilinçlidir ve kayıp değildir.
- **R3/3.** **0096'nın birinci kapısından bilinçli sapma (Karar 2).** 0096'da hammadde kırılımında geçen tedarikçi **çöpe bile atılamıyor**: `Tedarikciler.jsx:140` ConfirmDialog'un yerine "silinemez" Modal'ını çiziyor (ölçüm 8). Bu spec oradan ayrılır; parça çöpe atılabilir. Emsal yalnız **kalıcı silme kapıları** ve neden metninin biçimi içindir. Parça için "silinemez" Modal'ı yazılmaz (X9); emsale bakarak engelleyici pencere kurmak AC‑4'ü düşürür.
- **R3/4.** **Kullanım cümlesi tek fonksiyondan gelir ve kendi tutamağını taşır (Karar 6).** `urunAgaci.parcaKullanimMetni({ setAdlari, kit })`: setler **adıyla** (çöptekiler `(silinmiş)` ekiyle, R1/8), kit **sayıyla**. Ad yerine çıplak sayı yazılmaz, çünkü ad kullanıcıya hangi seti açacağını söyler. **Üç hâlin metni de yazılıdır (Karar 25):**
  - yalnız set: `Bu parça şu setlerin içeriğinde geçiyor: Rulman Seti, Pul Seti.`
  - yalnız kit: `Bu parça 4 model kitinde geçiyor.` (**"de" yok**)
  - ikisi birlikte: `Bu parça şu setlerin içeriğinde geçiyor: Rulman Seti, Pul Seti. 4 model kitinde de geçiyor.`
  
  Üç hâl de testle sabitlenir (AC‑22); tek örnek verilirse iki hâl tanımsız kalır ve "de" bağlacı set cümlesi olmayan hâlde bozuk Türkçe üretir. Modül içi `adListesi` (üç addan fazlasını `A, B, C +2` yapan yardımcı, `urunAgaci.js:375`) **dışa verilir** ki "+n" biçimi tek tanım kalsın. Satır onay penceresinin `message`'ı içinde ikinci düğüm olarak çizilir ve `data-testid="parca-kullanim"` taşır (`ConfirmDialog`'un `message`'ı tek `<div>`'e giriyor ve bugün tutamağı yok, ölçüm 9; 0096 emsali kendi satırına `data-testid="tedarikci-parca-kullanim"` vermişti).
- **R3/5.** **Kit sayısı yalnız silme onayında görünür (Karar 8).** Çöp Kutusu satırı ve otuz günlük temizlik kiti hiç okumaz ve `SettingsTrash`'e yeni model prop'u **eklenmez** (`standardModels` prop'u orada bugün de yok, ölçüm 13). Böylece R5'in "kit engel değil" kuralı kodda da zorunlu olur ve hiçbir kapının kullanmadığı bir sayı için prop zinciri uzamaz.
- **R3/6.** **Her kapının okuduğu dizi yazılıdır (Karar 22).** İlk turda yalnız iki kapının dizisi yazılmıştı; onay penceresinin dizisi tanımsızdı ve en yakın seçim yanlış olandı (`PartManager`'ın `useSimpleDefList`'i `items: parts` ile **canlı** diziyi kullanıyor, ham dizi ayrı bir değişkende duruyor, ölçüm 31). Canlı dizi geçilirse `setCop` yapısal olarak sıfır kalır, çöpteki setin bileşeni olan parçanın onayında hiçbir kullanım satırı görünmez ve Kalıcı Sil sonradan reddeder; bilgilendiren kapı ile engelleyen kapı birbirine zıt davranır (tam AC‑9'un durumu). Tablo:

| Kapı | Haritanın kurulduğu dizi |
|---|---|
| Silme onayı (`PartManager`) | `hamParts` (`PartManager.jsx:301`; `parts` değil) |
| Kalıcı Sil (`SettingsTrash`) | `rawParts` |
| Çöpü boşalt (`SettingsTrash`) | `rawParts.filter(x => !x.deletedAt)` |
| Otuz günlük temizlik (`App`) | süpürmeden önceki `data.parts` (R4/4) |

- **R4.** **Sette bileşen olan parça kalıcı silinemez.** Üç kapı aynı yardımcıdan geçer ve aynı nedeni gösterir: Çöp Kutusu'nun **Kalıcı Sil** düğmesi (satırda neden), **çöpü boşalt** (korunan parçalar kalır) ve **otuz günlük otomatik temizlik** (`purgeOldTrash`'in `koru` parametresi; bugün parça çağrısında hiç yok).
- **R4/2.** Neden tek sabittir ve metni yazılıdır (Karar 11, Karar 12): `urunAgaci.SETTE_PARCA_NEDENI = "Bir setin içeriğinde bileşen olarak geçiyor; önce Ayarlar › Katalog › Parça/Yedek Parça'da o setin içeriğinden çıkarın."` 0096'nın `KIRILIMDA_TEDARIKCI_NEDENI` cümlesinin kardeşidir, kalıbı ve adresi birebir aynıdır. **Yeni bir adres cümlesi yazılmaz:** panelin adı `kilitAlanlari.js:52`'de de "Parça/Yedek Parça" (ölçüm 21), iki farklı adres kullanıcıyı şaşırtır.
- **R4/3.** **Ret akışı tek biçimdir (Karar 3): düğme kalır, ret bildirimle olur.** Bugünkü akış ölçüldü (ölçüm 10): satırın Kalıcı Sil düğmesi `confirmPurge`'ü açıyor, pencere `"<ad>" kalıcı olarak silinecek. Bu işlem geri alınamaz.` diyor, onaylanınca `item.purge()` çalışıyor. Ret 0096 birebir `purgePart` içinde olur (`showToast(..., "err")` + satırdaki `cop-neden` satırı); düğme gizlenmez ve pasifleştirilmez, satır çizicinin desteklediği `item.purge == null` hâli (ölçüm 11) kullanılmaz. Onay penceresinin metni bilinçli olarak özelleştirilmez: satırdaki neden kullanıcıyı tıklamadan önce uyarıyor ve neden her zaman erişilebilir kalıyor; davranış bütün satır türlerinde aynı kalsın.
- **R4/4.** **Otuz günlük temizliğin sıra sınırı yazılıdır (Karar 9).** `koru` **süpürmeden önceki** diziden kurulur (0096'nın `kirilimdaGecenTedarikciler(data.parts)` çağrısı da öyle). Kendisi de otuz günü geçmiş çöpteki bir setin bileşeni bu turda korunur ve set aynı geçişte silindiği için bir sonraki açılışta silinir; bu bir turluk gecikme bilinçlidir ve kendini düzeltir, iki geçişli ya da yinelemeli temizlik yazılmaz. Blok tek geçiştir ve `data.customModels` parçalardan **önce** süzülüyor (ölçüm 16), bu yüzden otuz günlük temizlik model dizilerine **hiç uzanmaz** (R3/5 ile aynı kural).
- **R4/5.** **Ret ne yazar, ne tutar (Karar 13, Karar 14):** bildirim türü 0096 gibi hata bildirimidir; kayıt kilidi istenmez (anlık işlem, 0064 deseni) ve **işlem geçmişine iz yazılmaz**. `purgePart` bugün de `logAction` çağırmıyor (ölçüm 20); yeni bir kayıt türü ya da eylem etiketi `islem-gecmisi-etiketleri` testini kırardı ve R8 "yeni kural yok" diyor.
- **R4/6.** **Kalıcı silmenin bedeli spec 0130'dan beri daha ağır (Karar 23).** 0130 uygulandı ve v3.54.0 ile yayınlandı (ölçüm 29). `setUretimi.js:118` `parcalamaKalemleri` setin **o anki** içeriğini geziyor ve `miktar > 0` olan her satır için `parcalama_girisi` hareketi yazıyor; kaydın var olup olmadığına **bakmıyor** (ölçüm 30). Yani bugün, koruma yokken, kalıcı silinmiş bir bileşen "Seti Parçala"da **hayalet stok** doğuruyor: Parça Stoğu ekranı o satırı hiç çizmediği için kimsenin göremediği bir kayda stok giriyor. Koruma bunu da önler ve bu, R4'ün ilk turda yazılandan daha güçlü bir gerekçesidir. 0130'un süzgeci **değiştirilmez** (X10); çöpteki bileşenin yan etkisi R3/2'de bilinen sınır olarak yazılı.

- **R5.** **Model kiti kalıcı silmeyi engellemez.** Kit satırı parçanın adını kopyaladığı için (`defaultParcalar` satırı `{partId, ad, miktar}`) kalıcı silmeden sonra satır okunur kalır ve adet bilgisi kaybolmaz; setin içeriği ise yalnız kimlik ile adet taşır, kaydı silinince satırın **adı** geri gelmez ve `kaydı bulunamayan parça` yazar. Ayrım bilinçlidir ve spec'te yazılıdır: kit yalnız **bilgi** olarak sayılır (R3), set **engeldir** (R4).
- **R5/2.** **R5'in gerekçesi ölçümle güçlendi (Karar 20):** kit tarafındaki eksiklik bugün sessiz değil, ekranda görünüyor. `makinaStandartMaliyet.js:208` kayıp parçaya `eksik: true, neden: "parcaYok"` yazıyor ve modelin `eksikSayisi`'nı Model Maliyetleri çiziyor; sette de eksik bileşen maliyeti `null` yapıyor ve parça kartı `setEksikMetni(n)` ile sayısını yazıyor (ölçüm 26). Yani kiti **bilgi** olarak saymak yeterlidir: maliyet zincirinde kullanıcı eksikliği zaten görüyor, geri gelmeyen tek şey setin içerik satırındaki addır (R5).

### C. Değişmeyenler

- **R6.** Parça kaydı, içeriğin biçimi, maliyet zinciri, Set Hazırla, 0130'un Seti Parçala penceresi, stok hareketleri ve Çöp Kutusu'nun öteki satır türleri dokunulmaz. İki set penceresi de setin içeriğini okuyor, ama bu iş yalnız parçanın silinmesinin önüne bakar: içeriği okuyan hiçbir hesap ve hiçbir hareket değişmez.
- **R7.** Geri alma yolu değişmez: çöpten geri alınan parçanın bağı kendiliğinden canlanır (içerik kimliği taşıyor, temizlik yapılmıyor).
- **R8.** Yeni izin, yeni veri bölümü ve yeni sunucu kuralı yoktur. Silme izinleri bugünkü hâliyle kalır (`stock_parca_*` zinciri değişmez). Çöp Kutusu'nun parça satırında bugün de izin kapısı yok (restore ve purge koşulsuz çiziliyor, tedarikçi ve parti satırlarının aksine); bu hâl korunur.
- **R8/2.** İçe aktarma silme kapısı **değildir** ve ölçüldü (Karar 19, ölçüm 25): `parcaIceAktarmaUygula` yalnız ekler ve güncellenir, kayıt silmez (`SettingsImport.jsx:280-281`'in bildirimi de "n yeni parça eklendi, n parça güncellendi" diyor). "Dört kapı" iddiası bu ölçümle tamdır; beşinci kapı yedekten geri yüklemedir ve bilinçli olarak dışarıdadır (X7).

### D. QA turu: doğrulanamayan ölçümler (2026-11-02)

- **R9.** **Uygulamanın ilk adımı Context 4 ile Context 5'in rakamlarını yeniden ölçmektir (Karar 21).** QA turunda canlı veri bulunamadı (`~/Library/Application Support/makina-crm` yok, proje kökünde `*.db` yok, İndirilenler'de JSON yedek yok), bu yüzden 380 canlı parça, "çöpte parça yok", "hiç `setIcerigi` girilmemiş", 1.436 kit satırı ve 135 ayrı parça rakamları sınanamadı (ölçüm 27). Rakamlar kararı değiştirmiyor (iş önleyicidir, bugün bozulmuş veri yok), ama "yaklaşık üçte biri" cümlesi spec'in gerekçesi ve **"çöpte parça yok" AC‑5, AC‑7 ile AC‑8'in test verisini belirliyor**: o kapılar bugünkü veride hiç tetiklenmiyor, testler kendi fikstürünü kurar.

---

## Constraints

### Uyulması zorunlu

- **C1.** Koruma dört kapıda da **aynı** yardımcıdan gelir; biri atlanırsa veri yine bozulur (0096'nın dersi: korumayı yalnız ekrana yazmak yetmedi, otuz günlük temizlik de kapsama alındı).
- **C2.** Sayım O(katalog) kalır: harita **satır başına değil, çizim başına** kurulur ve `parcaKullanimi`'ye `harita` anahtarıyla geçirilir. Hazır harita verilince fonksiyon onu yeniden kurmaz (casusla ölçülür, AC‑15); 0096'nın triyajda eklediği beşinci parametrenin aynısıdır (ölçüm 12). **`SettingsTrash`'te iki harita beklenir** (Karar 27): biri bütün parçalardan (Kalıcı Sil), biri kalacak parçalardan (çöpü boşalt); bu C2'nin ihlali değildir, Karar 5'in gereğidir. `useMemo` isteğe bağlıdır: 0096 `SettingsTrash`'te iki haritayı bileşen gövdesinde ve `useMemo`'suz kuruyor (`:214`, `:215`), `Tedarikciler.jsx:61` ise `useMemo` kullanıyor (ölçüm 33).
- **C3.** Metinler `src/lib/urunAgaci.js`'te; ekranda yerel kopya olmaz. Bu, neden sabitini (`SETTE_PARCA_NEDENI`, R4/2) **ve** kullanım cümlesini (`parcaKullanimMetni`, R3/4) kapsar; ekran yalnız fonksiyonu çağırır ve sonucu kendi `data-testid`'li düğümüne basar.
- **C4.** Hiçbir kayıt otomatik olarak değiştirilmez: koruma silmeyi reddeder, içeriği kendisi temizlemez (sessiz veri değişikliği yasak).
- **C5.** Ret akışı dört kapıda da tek biçimdir (R4/3): düğme kalır, ret `purgePart`/süzgeç içinde hata bildirimiyle olur, satırdaki neden önceden uyarır. Kapılardan birinde pasif düğme, gizli düğme ya da özel onay metni yazılmaz; yoksa AC‑5 ile AC‑12 birbirine zıt iki uygulamayla da yeşil olur.

### KAPSAM DIŞI

- **X1.** Kit satırının parça silinince temizlenmesi — *neden:* R5'in gerekçesi; kit satırı adı taşıdığı için okunur kalıyor ve otomatik temizlik kullanıcının görmediği bir veri değişikliği olurdu.
- **X2.** Setin içeriğinden otomatik çıkarma ya da "çıkar ve sil" düğmesi — *neden:* iki adımlı silme kullanıcının ne sildiğini görmesini sağlıyor; tek tıkla içerik değiştirmek C4'e aykırı.
- **X3.** Parça silinirken servis, kargo satışı ve teklif kalemlerinin sayılması — *neden:* onlar geçmiş kayıttır, parçanın silinmesi onları bozmuyor (bugünkü cümle bunu zaten söylüyor); sayı listeyi uzatır, kararı değiştirmez.
- **X4.** Kalıp tanımı, model ve parça tipi silmeleri için aynı denetim — *neden:* bu spec setin bileşenine nişanlıdır; kalıp tanımının üretim formu satırlarıyla bağı ayrı bir ölçüm ister.
- **X5.** Sunucu tarafında silme denetimi — *neden:* uygulama içi koruma yumuşak korumadır, bugünkü bütün koruma kapıları (0096 dahil) istemcidedir ve bölüm izinleri değişmiyor.
- **X6.** Kalıcı silinen parçanın stok satırının ve hareket geçmişinin temizlenmesi ya da kullanım sayılması — *neden:* ölçüldü (ölçüm 22), veri kaybolmuyor yalnız görünmez oluyor: `purgePart` `partStock` ile `partStockLog`'a dokunmuyor, `PartStokTab` satırları `parts.map` ile çizdiği için yetim satır Parça Stoğu ekranından kayboluyor, ama Stok Tutarlılığı raporu onu görüyor ve adını "Silinmiş parça" yazıyor. Hareket geçmişi hiçbir zaman silinmez (0065 R6) ve set koruması bu parçaların çoğunu kalıcı silinmekten zaten alıkoyuyor.
- **X7.** Yedekten geri yüklemenin kapsama alınması — *neden:* beşinci kapıdır ve kayıt bazlı koruma kavramı orada yok: "tanım" paketi `parts` dizisini **bütün olarak** değiştiriyor (ölçüm 23), yani setle bileşeni aynı dizide birlikte taşındığı için tutarlı kalıyor. C1'in "biri atlanırsa veri yine bozulur" kuralı dört kapıya nişanlıdır, bu kapı bilinçli olarak dışarıdadır.
- **X8.** Çöpten geri almada ad çakışması denetimi — *neden:* ad tekilliği **canlı** parçalar arasında zorunlu (`useSimpleDefList.add:25` ve `saveEdit:37` aynı adı Türkçe katlamayla reddediyor, içe aktarma da yalnız canlıları indeksliyor ve adı boş satırı atlıyor, ölçüm 32), denetim yalnız çöptekileri görmüyor: çöpteki "Rulman" dururken canlı bir "Rulman" açılabiliyor ve geri alma iki yazma yolunun da izin vermediği bir hâl üretiyor. Bu **geri alma yolunun boşluğudur**, bu spec kalıcı silmeye nişanlıdır ve R7 geri alma yolunu değiştirmiyor; `restorePart` yalnız damgayı kaldırıyor ve tedarikçi, tür ve hesaptaki `geriAlmaAdCakismasi` parçada yok (ölçüm 24). İlk turda bu maddenin gerekçesi "tekillik hiçbir yerde zorunlu değil" diyordu, kodla çeliştiği için düzeltildi (Karar 24).
- **X9.** Parçanın çöpe atılmasının engellenmesi ve parça için "silinemez" Modal'ı — *neden:* R3/2'nin gerekçesi; emekli edilen parça çöpe atılabilir olmalı. 0096'nın birinci kapısı bunu engelliyor, bu spec oradan bilinçli olarak sapıyor (R3/3).
- **X10.** Spec 0130'un parçalamasının silinmiş ya da çöpteki bileşeni atlaması — *neden:* 0130'un "stoğa dönen içerik setin bugünkü içeriğidir" kuralı tek yerde (`setUretimi.js:118`) ve bu koruma kalıcı silmeyi zaten önlüyor (R4/6), yani hayalet stok doğmuyor; çöpteki bileşenin stoğu artar ama parça geri alınınca doğru görünür ve Stok Tutarlılığı raporu onu adıyla gösterir (R3/2, ölçüm 22, ölçüm 30). `setUretimi.js` ile `SetParcalaPenceresi.jsx` dokunulmaz.

---

## Context

Ölçümler 01.11.2026 yedeğiyle ve bugünkü kaynakla yapıldı.

1. **Bugün dört kapı da açık.** Parça silme onayı yalnız "… Çöp Kutusu'na taşınacak (30 gün içinde geri alınabilir). Daha önce verilmiş kayıtlar geçmişte kalır." diyor (`PartManager.jsx:543`); kullanımdan söz etmiyor. Silme işlemi yalnız `deletedAt` damgalıyor (`useSimpleDefList.js:55`), hiçbir bağı temizlemiyor. `purgePart` koşulsuz siliyor (`SettingsTrash.jsx:177`), "çöpü boşalt" koşulsuz süzüyor (`:288`), otuz günlük temizlik `purgeOldTrash(data.parts)` ile **`koru` parametresiz** çağrılıyor (`App.jsx:1092`).
2. **Kaynakta `setIcerigi`'ni okuyan koruma yok:** `src/lib/copKutusu.js`, `SettingsTrash.jsx` ve `App.jsx`'in temizlik bloğu alanı hiç anmıyor (tarama).
3. **Emsal kalıcı silme kapılarında oturuyor, birinci kapıda oturmuyor.** 0096 aynı sınıf için `gider.kirilimdaGecenTedarikciler(parts)` haritasını ve `KIRILIMDA_TEDARIKCI_NEDENI` cümlesini kurdu. Kapıların gerçek yerleri: `Tedarikciler.jsx:61` haritanın kurulduğu satır, **kapının kendisi `:140`'taki "silinemez" Modal'ı** (çöpe atmayı da engelliyor, ölçüm 8); `SettingsTrash.jsx:214` ile `:215` iki harita kurulumu, kapılar `:217` (Kalıcı Sil, hata bildirimiyle ret) ve `:302` (çöpü boşalt, kalacaklardan kurulan haritayla); `App.jsx:1104` (`koru`). Bu spec üç kalıcı silme kapısını parça için kurar ve birinci kapıda bilinçli olarak sapar (R3/3, X9).
4. **Bugün veri bozulmuş değil, yani iş önleyicidir:** katalogda 380 canlı parça var, **çöpte parça yok** ve henüz **hiçbir parçanın içeriği girilmemiş**. Yani koruma tam içerikler girilmeye başlarken yerinde olur.
5. **Kit sayısı bugün bile gerçek bir rakam üretir:** canlı model kitlerinde 1.436 satır var ve bunlar 135 ayrı parçaya işaret ediyor. Yani 380 parçanın yaklaşık üçte biri silinirken onayda kullanım satırı görünecek.
6. **Çöpten geri alma bugün çalışıyor:** `restorePart` yalnız damgayı kaldırıyor (`SettingsTrash.jsx:176`), içerik kimliği durduğu için set kendiliğinden düzeliyor. Bu davranış korunur (R7).

### QA turu ölçümleri (2026-11-02)

Hepsi bugünkü kaynakla doğrulandı; satır numaraları bu turda yeniden okundu.

7. **Spec'in dört satır atfı kaymıştı** ve düzeltildi: `PartManager.jsx:554` → gerçekte **543**, `useSimpleDefList.js:54` → **55**, `Tedarikciler.jsx:61` haritanın satırı (kapı `:140`), `SettingsTrash.jsx:214`/`:215` iki harita kurulumu (kapılar `:217` ve `:302`). Doğru çıkanlar: `SettingsTrash.jsx:176`, `:177`, `:288`, `App.jsx:1092`, `:1104`.
8. **0096'nın birinci kapısı çöpe atmayı da engelliyor:** `Tedarikciler.jsx:140` kullanımda olan tedarikçi için ConfirmDialog'un yerine "silinemez" Modal'ını çiziyor; ölçüt `sil.k.kalem + sil.k.tanim + sil.k.parca > 0`.
9. **`ConfirmDialog`'un `message`'ı tek `<div>`'e giriyor** (`ui.jsx:490`) ve `data-testid`'si yok; React düğümü kabul ediyor, yani ikinci satır eklenebilir. 0096 kendi kullanım satırına `data-testid="tedarikci-parca-kullanim"` vermiş (`Tedarikciler.jsx:148`).
10. **Kalıcı Sil akışı iki adımlı:** satırın düğmesi `confirmPurge`'ü açıyor, pencere `"<ad>" kalıcı olarak silinecek. Bu işlem geri alınamaz.` diyor, onaylanınca `item.purge()` çalışıyor. 0096 biçiminde ret o fonksiyonun içinde olduğu için kullanıcı geri alınamaz bir silmeyi onaylıyor ve hiçbir şey olmuyor.
11. **Satır çizici `item.purge == null` hâlini destekliyor** (`SettingsTrash.jsx:428`: `{item.purge && ...}`) ve `restore` ondan bağımsız; yani düğmeyi hiç çizmemek teknik olarak mümkün. R4/3 bu yolu bilinçli olarak kullanmıyor.
12. **0096 aynı tuzağa triyajda düşmüş:** `gider.js:1066` `tedarikciKullanim(tedId, giderler, tanimlar, parts, harita = null)` ve `:1067` hazır harita verilince onu kullanıyor; `Tedarikciler.jsx:61` haritayı `useMemo` ile bir kez kuruyor, `hammadde-0096.test.js:180` çağrı sayısını bire sabitliyor.
13. **`SettingsTrash`'in `standardModels` prop'u yok** (`:19-24`: `rawParts` ve `rawCustomModels` var); App'in otuz günlük temizliği de `data.customModels`'i parçalardan önce süzüyor. Yani kit rakamı yalnız `PartManager`'da elde edilebilir.
14. **0096'nın haritası toplam semantiği kullanıyor:** `kirilimdaGecenTedarikciler` → `{ parca, cop }` ve `parca` canlı + çöp toplamı (`gider.js:1057`: `x.parca += 1; if (p.deletedAt) x.cop += 1`); kapı `.has(id)`. `hammadde-0096.test.js:116` çöpteki parçanın tedarikçisini de koruduğunu sabitliyor.
15. **"Çöpü boşalt" çöpteki bütün parçaları, setler dahil siliyor:** `SettingsTrash.jsx:288` `setParts?.(p => p.filter(x => !x.deletedAt))`. Yani o süpürmede set de bileşeni de gidiyor.
16. **Otuz günlük temizlik tek geçiş** ve sıra önemli: `data.customModels` `:1089`'da, `data.parts` `:1092`'de süzülüyor; `data.tedarikciler`'in `koru`'su `:1104`'te **süpürülmüş** `data.parts`'ı okuyor, yani `koru`'nun süpürmeden önceki diziden kurulması gerekiyor.
17. **İki yardımcı zaten var:** `urunAgaci.js:396` `parcayiIcerenSetler(partId, parts)` bu parçayı taşıyan **canlı** setlerin adlarını döndürüyor (kendisi hariç) ve `setIcerigiDogrula`'nın iki yönlü iç içe denetiminde kullanılıyor (0121 R5/2); `:375` modül içi `adListesi` "+n" biçimini üretiyor (`setBileseniHatasi`'nın kullandığı).
18. **`parcaKitAdetleri` çöpteki özel modeli süzmüyor:** `urunAgaci.js:282` bütün model dizilerini geziyor ve `urun-agaci-0087.test.js:102` çöpteki modeli de bekliyor (`COP_1: 9`). Gövdesine çöp süzgeci eklemek 0087 AC‑11'i ters çevirir.
19. **`PartManager` canlı model dizisi alıyor:** `Settings.jsx:274` `customModels={customModels}` ve App `:1740` `customModels={liveCustomModels}`; `standardModels` çöpe atılamıyor. Yani R1/3'ün çöp süzgeci çağıranda hazır, yeni kod istemiyor.
20. **`purgePart` işlem geçmişine iz yazmıyor:** `SettingsTrash.jsx:177` yalnız süzüyor ve bildirim atıyor; tedarikçinin purge'u da (`:217`) öyle.
21. **Panelin adı "Parça/Yedek Parça":** `kilitAlanlari.js:52` `yedekparca: "Parça/Yedek Parça"`, 0096'nın cümlesindeki adresle birebir aynı.
22. **Kalıcı silme stok satırını yetim bırakıyor ama veri kaybolmuyor:** `purgePart` `partStock`/`partStockLog`'a dokunmuyor; `PartStokTab.jsx:50` satırları `parts.map` ile çizdiği için yetim satır Parça Stoğu'ndan kayboluyor; Stok Tutarlılığı raporu ise kimlikleri `partStock` ve log'dan topluyor (`stokHareketi.js:167`) ve adı `ad.get(pid) || "Silinmiş parça"` ile yazıyor (`:178`).
23. **Yedekten geri yükleme `parts` dizisini bütün olarak değiştiriyor:** `SettingsBackup.jsx:239` `if (sec("tanim") && Array.isArray(restoreData?.parts)) setParts?.(restoreData.parts)`. Setler de aynı dizide olduğu için tutarlı kalıyor; model kiti ayrı pakette.
24. **`restorePart` ad çakışmasını denetlemiyor:** `SettingsTrash.jsx:176` yalnız `deletedAt`'i siliyor; tedarikçi, tür ve standart grup satırlarında `geriAlmaAdCakismasi`/`standartGeriAlmaCakismasi` var, parçada yok.
25. **İçe aktarma kayıt silmiyor:** `SettingsImport.jsx:280` `parcaIceAktarmaUygula(p, impParts)` ve `:281` bildirimi yalnız "yeni parça eklendi, parça güncellendi" diyor.
26. **Kit ve set eksikliği bugün görünür:** `makinaStandartMaliyet.js:208` kayıp parçaya `eksik: true, neden: "parcaYok"` yazıyor, `:229` modelin `eksikSayisi`'nı döndürüyor ve Model Maliyetleri onu çiziyor; `urunAgaci.js:70` `setKatalogu` yalnız canlı parçaları aldığı için çöpteki bileşen setin maliyetini `null` yapıyor ve kart `setEksikMetni(n)` yazıyor.
27. **Canlı veri ölçümleri doğrulanamadı** (R9): `~/Library/Application Support/makina-crm` yok, proje kökünde `*.db` yok, İndirilenler'de JSON yedek yok. Context 4 ile Context 5'in rakamları (380 parça, çöpte parça yok, hiç `setIcerigi` yok, 1.436 kit satırı, 135 parça) bu turda sınanamadı.
28. **Ters çevrilen kriter yok, yeniden ölçüldü:** `purgeOldTrash(data.parts)` çağrısını kaynak taramasıyla sabitleyen test yok (`cop-kutusu-0068.test.js:99-100` yalnız `tedarikciler` ile `uretimPartileri` satırlarını sabitliyor); parça silme onayının metnini okuyan ve "Yedek Parça Tanımı" satırını iddia eden test de yok. `standart-kalkar-0082.test.js:119` `purgeOldTrash(` çağrılarının yalnız bölüm adlarını topluyor, `koru` eklenmesi onu kırmıyor.

### QA turunda verilen kararlar (2026-11-02)

21 bulgunun hepsi Takım Yöneticisi tarafından onaylandı.

- **Karar 1 (B‑1).** `parcaKullanimi` iki işe bölünür: harita kuran `setteGecenParcalar(parts)` ve kimlik başına sayan `parcaKullanimi(partId, { parts, modelDizileri, harita })`. → R1
- **Karar 2 (B‑2).** 0096'nın birinci kapısından (çöpe atmayı engelleme) bilinçli sapma spec'e yazılır ve parça için "silinemez" Modal'ı kapsam dışı olur. → R3/3, X9
- **Karar 3 (B‑3).** Ret akışı 0096 birebir: Kalıcı Sil düğmesi kalır, ret hata bildirimiyle olur, onay penceresinin metni özelleştirilmez. → R4/3, C5
- **Karar 4 (Ö‑1).** Kapının tek yüklemi `setteGecenParcaMi(partId, harita)` = `(set + cop) > 0`'dır; 0096'nın `.has()` kalıbı kopyalanmaz. → R1/5
- **Karar 5 (Ö‑2).** "Çöpü boşalt" haritayı kalacak parçalardan kurar ve AC‑9 yalnız öteki iki kapıya nişanlanır. → R1/2, AC‑7, AC‑9
- **Karar 6 (Ö‑4).** Kullanım cümlesi `parcaKullanimMetni` fonksiyonundan gelir, setleri adıyla kiti sayıyla yazar, `data-testid="parca-kullanim"` taşır; `adListesi` dışa verilir. → R3/4, C3
- **Karar 7 (Ö‑7).** `setCop` setin durumunu sayar, silinen parçanın durumu hiçbir alana girmez; cümlede "1 set çöp kutusunda" yazar. → R1/7
- **Karar 8 (Ö‑6).** Kit sayısı yalnız silme onayında görünür, `SettingsTrash`'e model prop'u eklenmez. → R3/5
- **Karar 9 (Ö‑3).** `koru` süpürmeden önceki diziden kurulur; kendisi de süresi dolmuş setin bileşeni bir tur gecikmeyle silinir ve bu bilinçlidir. → R4/4
- **Karar 10 (K‑1).** Dört satır atfı düzeltilir. → Context 1, Context 3, ölçüm 7
- **Karar 11 (K‑2).** `SETTE_PARCA_NEDENI`'nin cümlesi yazılır, 0096'nın kalıbı birebir. → R4/2
- **Karar 12 (K‑3).** Adres cümlesi 0096'nınkiyle aynı kalır ("Ayarlar › Katalog › Parça/Yedek Parça"). → R4/2
- **Karar 13 (K‑4).** Reddedilen silme işlem geçmişine iz yazmaz. → R4/5
- **Karar 14 (K‑5).** Ret hata bildirimiyle olur, kayıt kilidi istenmez. → R4/5
- **Karar 15 (K‑6).** Yetim stok satırı ve hareket geçmişi kapsam dışı yazılır. → X6
- **Karar 16 (K‑7).** Yedekten geri yükleme beşinci kapı olarak kapsam dışı yazılır. → X7
- **Karar 17 (K‑8).** Geri almada ad çakışması denetimi kapsam dışı yazılır. → X8
- **Karar 18 (K‑9).** İçe aktarmanın silme kapısı olmadığı ölçümle yazılır. → R8/2, ölçüm 25
- **Karar 19 (K‑9).** "Dört kapı" iddiasının tamlığı bu ölçümle sabitlenir. → R8/2
- **Karar 20 (K‑10).** Kit ve set eksikliğinin bugün görünür olduğu ölçülür, R5'in gerekçesine yazılır ve Intent'in "sessizce" kelimesi düzeltilir. → Intent, R5/2, ölçüm 26
- **Karar 21 (K‑11).** Doğrulanamayan canlı veri ölçümleri uygulamanın ilk adımı olur. → R9, ölçüm 27

### Karar kaydı

| # | Bulgu | Derece | Spec'e işlenen yer |
|---|---|---|---|
| 1 | `parcaKullanimi` imzası C2 ile çelişiyor | Bloklayıcı | R1, R1/4, C2 |
| 2 | "0096 emsali" çöpe atmayı da engelliyor | Bloklayıcı | R3/3, X9 |
| 3 | Kalıcı Sil reddinin akışı tanımsız | Bloklayıcı | R4/3, C5 |
| 4 | Kapı ölçütü yazılmamış, 0096 ters semantik | Önemli | R1/5 |
| 5 | "Çöpü boşalt" R1/2 ile AC‑9 arasında çelişiyor | Önemli | R1/2, AC‑7, AC‑9 |
| 6 | Onay cümlesinin metni, yeri ve tutamağı yok | Önemli | R3/4, C3 |
| 7 | `setCop` neyi saydığı belirsiz | Önemli | R1/7 |
| 8 | Kit sayısının modelleri iki kapıda yok | Önemli | R3/5 |
| 9 | Otuz günlük temizlikte sıra sınırı tanımsız | Önemli | R4/4 |
| 10 | Var olan iki yardımcı anılmıyor | Önemli | R1/3, R1/6 |
| 11 | Dört satır atfı kaymış | Küçük | Context 1, Context 3 |
| 12 | Neden metninin cümlesi yok | Küçük | R4/2 |
| 13 | Adres ifadesi tek olsun | Küçük | R4/2 |
| 14 | İşlem geçmişi kaydı tanımsız | Küçük | R4/5 |
| 15 | Ret bildirim türü ve kilit tanımsız | Küçük | R4/5 |
| 16 | Yetim stok satırı kapsam dışı yazılmamış | Küçük | X6 |
| 17 | Yedekten geri yükleme beşinci kapı | Küçük | X7 |
| 18 | Geri almada ad çakışması denetimi yok | Küçük | X8 |
| 19 | İçe aktarma silme kapısı değil | Küçük | R8/2 |
| 20 | Kit tarafındaki "sessizlik" sessiz değil | Küçük | Intent, R5/2 |
| 21 | Canlı veri ölçümleri doğrulanamadı | Küçük | R9 |

### İkinci QA turu ölçümleri (2026-11-02, spec 0130 yayınından sonra)

İlk turdan sonra kod zemini değişti: **spec 0130 (setin parçalanması) uygulandı ve v3.54.0 ile yayınlandı.** Aşağıdakiler yeni zeminle ölçüldü.

29. **Spec 0130 yayında:** `ea02a3b7` (uygulama), `691931de` (kapanış), `9ecb2eda` (v3.54.0). Dokunduğu dosyalar `setUretimi.js`, `stokHareketi.js`, `PartStokTab.jsx`, `StokHareketleriPenceresi.jsx`, `kilitAlanlari.js`, `SettingsAuditLog.jsx` ve yeni `SetParcalaPenceresi.jsx`. Bu spec'in kaydığı atıfları düzeltildi ve yeniden okundu: `PartStokTab.jsx:50`, `stokHareketi.js:167` ve `:178` (ölçüm 22), `kilitAlanlari.js:52` yerinde (ölçüm 21).
30. **Parçalama silinmiş ya da çöpteki bileşeni süzmüyor:** `setUretimi.js:118` `parcalamaKalemleri` `setIcerigiOf(set)`'i geziyor ve `miktar > 0` olan her satıra `parcalama_girisi` yazıyor; kaydın varlığına ve `deletedAt`'ine bakmıyor. `setParcalaPlani` (`:131`) yalnız setin kendi stoğunu sınırlıyor.
31. **`PartManager` canlı diziyle çalışıyor:** `useSimpleDefList`'e `items: parts` geçiyor (`:323`), ham dizi ayrı bir değişkende (`hamParts`, `:301`, `rawParts` boşsa canlıya düşüyor). Yani onay penceresinde elin altındaki dizi canlı olan.
32. **Parça adı tekilliği zorunlu:** `useSimpleDefList.add:25` ve `saveEdit:37` aynı adı Türkçe katlamayla (`trLower`) reddediyor (`"<ad>" zaten tanımlı.`) ve boş adı hiç kabul etmiyor; içe aktarma da adı boş satırı atlıyor (`parcaAktarma.js:39`) ve `byAd`'ı yalnız **canlı** parçalardan kuruyor (`:35`). Denetim çöptekileri görmüyor.
33. **0096 `SettingsTrash`'te iki harita kuruyor ve `useMemo` kullanmıyor:** `:214` bütün parçalardan, `:215` yalnız canlılardan, ikisi de bileşen gövdesinde; `Tedarikciler.jsx:61` ise `useMemo` kullanıyor ve test o satırı birebir sabitliyor.
34. **0096'nın harita ölçümü AC‑32 değil:** hazır harita ve çağrı sayısı `it("bulgu 3: hazır haritayla kullanım sayımı aynı sonucu verir; liste haritayı bir kez kurar ve iki çağrıya geçirir")` bloğunda (`hammadde-0096.test.js:175-182`) ve üç şeyi birlikte sabitliyor: haritanın tek çağrısı, `useMemo` satırının birebir metni, haritayla yapılan iki `tedarikciKullanim` çağrısı. `AC-32` (`:206`) parçanın maliyet alanının tek okuma yolu hakkındadır.
35. **0130 kapı sayısını değiştirmedi:** `IADE_TIPI`'ye yalnız `set_parcalama: "set_parcalama_iade"` eklendi (`stokHareketi.js`); parçayı kalıcı silen yol sayısı dörtte kaldı, "dört kapı" iddiası tamdır.
36. **`parcayiIcerenSetler` kendisini hariç tutuyor:** `urunAgaci.js:397` `String(p.id) !== String(partId)`; haritalı kardeşi bunu kendiliğinden yapmaz.

### İkinci QA turunda verilen kararlar (2026-11-02)

12 bulgunun hepsi Takım Yöneticisi tarafından onaylandı.

- **Karar 22 (B‑1).** Dört kapının okuduğu dizi tabloyla yazılır; onay penceresi `hamParts`'tan okur. → R3/6, AC‑22, AC‑32
- **Karar 23 (Ö‑2).** 0130'un parçalaması kalıcı silmenin bedelini ağırlaştırdı: R4'ün gerekçesine hayalet stok, R3/2'ye çöpteki bileşenin yan etkisi yazılır, 0130'un süzgeci değişmez. → R3/2, R4/6, X10, AC‑33
- **Karar 24 (Ö‑3).** X8'in "tekillik zorunlu değil" gerekçesi kodla çeliştiği için düzeltilir. → X8, ölçüm 32
- **Karar 25 (Ö‑4).** Kullanım cümlesinin üç hâli (yalnız set, yalnız kit, ikisi) birebir yazılır. → R3/4, AC‑22
- **Karar 26 (Ö‑5).** Çöpteki setler de adıyla yazılır (`(silinmiş)` eki), `(1 set çöp kutusunda)` eki kalkar. → R1/8, R3/4
- **Karar 27 (Ö‑6).** "Bir kez" çizim başına demektir ve `SettingsTrash`'te iki harita beklenir; `useMemo` isteğe bağlıdır. → C2, AC‑15
- **Karar 28 (Ö‑7).** AC‑15'in emsal atfı 0096'nın triyaj bulgusu 3 olarak düzeltilir. → AC‑15, ölçüm 34
- **Karar 29 (K‑1).** Harita, setin kendisinin bileşen olduğu satırı atlar. → R1/6, AC‑34
- **Karar 30 (K‑2).** İçeriği olan ama hiçbir yerde kullanılmayan setin onayı da bugünkü metni birebir gösterir. → AC‑2
- **Karar 31 (K‑3).** AC‑6 kit satırının `ad` ve `miktar` ile yerinde kaldığını da iddia eder. → AC‑6
- **Karar 32 (K‑4).** Bağımlı spec'ler satırına 0130 eklenir. → başlık
- **Karar 33 (K‑5).** `setUretimi.js` ile `SetParcalaPenceresi.jsx` dokunulmayanlar arasında anılır. → başlık, X10

### İkinci tur karar kaydı

| # | Bulgu | Derece | Spec'e işlenen yer |
|---|---|---|---|
| 22 | Onay penceresinin dizisi yazılmamış, `setCop` sıfır kalır | Bloklayıcı | R3/6, AC‑32 |
| 23 | 0130 parçalaması silinmiş bileşene stok yazıyor | Önemli | R3/2, R4/6, X10 |
| 24 | X8'in gerekçesi kodla çelişiyor | Önemli | X8 |
| 25 | Kullanım cümlesinin yalnız‑kit hâli yok | Önemli | R3/4, AC‑22 |
| 26 | Çöpteki setlerin adı cümlede yok | Önemli | R1/8, R3/4 |
| 27 | "Bir kez" belirsiz, iki harita yazılmamış | Önemli | C2, AC‑15 |
| 28 | AC‑15'in emsal atfı yanlış | Önemli | AC‑15 |
| 29 | Haritanın kendine atıf satırını atlaması yazılmamış | Küçük | R1/6, AC‑34 |
| 30 | Setin kendisi silinirken AC‑2'nin kapsamı belirsiz | Küçük | AC‑2 |
| 31 | AC‑6 kit satırının kaldığını iddia etmiyor | Küçük | AC‑6 |
| 32 | Bağımlı spec'ler satırında 0130 yok | Küçük | başlık |
| 33 | Etkilenen alanlar 0130'un dosyalarını anmıyor | Küçük | başlık, X10 |

### Plan turunda verilen kararlar (2026-11-02)

Takım Yöneticisi planın bütün önerilerini 2026-11-02'de onayladı (plan `specs/0123-uygulama-plani.md`).

- **Karar 34.** R9'un beş rakamı yeniden ölçüldü ve **beşi de doğru**: 380 parça (380 canlı, çöpte 0), içeriği olan parça 0, 22 canlı modelde 1.436 kit satırı, 135 ayrı parça. Ölçüm yolu düzeltildi: veri `~/Library/Application Support/Altunmak CRM/data.db`'de (şifreli, açılmadı); ölçüm İndirilenler'deki tek yedekten (`altunmak-crm-yedek-2026-11-01.zip` içindeki `veri.json`), salt okunur. → **R9, AC-31**
- **Karar 35.** R1/7'nin "1 set çöp kutusunda" cümlesi Karar 26 ile geçersizdir; cümle çöpteki seti adıyla yazar, R1/7 yalnız sayının neyi saydığını tanımlar. → **R1/7, R1/8, AC-22**
- **Karar 36.** Çöpteki setin eki var olan sabitten gelir: `${ad} (${SILINMIS_PARCA})` = "Pul Seti (silinmiş parça)"; R1/8'in örnekteki "(silinmiş)" kısaltması yazılmaz (ikinci bir ek metni doğmasın). → **R1/8, R3/4, AC-22**
- **Karar 37.** Set adları için üçüncü bir saf yardımcı yazılır: `urunAgaci.setKullanimAdlari(partId, parts)` (canlı adlar `parcayiIcerenSetler`'den, gövdesi değişmez; çöpteki setler ekli adla; ikisinde de setin kendi satırı atlanır). Haritanın şekli AC-14'teki `{ set, cop }` olarak kalır; yardımcıyı yalnız onay penceresi, onay başına bir kez çağırır. → **R1/8, R2, AC-14**
- **Karar 38.** Ret bildiriminin metni `urunAgaci.SETTE_PARCA_RED_METNI` = "Yedek parça tanımı kalıcı silinemez: " + `SETTE_PARCA_NEDENI` (0096'nın tedarikçi bildirim kalıbı). → **R4/5, C3, AC-27**
- **Karar 39.** AC-15'in "satır metni" iddiası `SettingsTrash`'teki iki harita satırının metnine uygulanır (0096'nın haritaları da orada `useMemo`'suz). Onay penceresinde harita onay açıldığında bir kez kurulur. → **AC-15, C2**
- **Karar 40.** Otuz günlük temizlik gerçek App düzeneğiyle ölçülür (eski tarihli çöp damgalı veri yüklenir, kaydedilen gövde okunur) ve `koru`'nun süpürmeden önce kurulduğu kaynak taramasıyla sabitlenir. → **AC-8, AC-21**
- **Karar 41.** Değişen kanıt ekranları taban ve sonra çekimiyle ölçülür; yeni iki ekran kullanım satırlı silme onayı ve nedeni yazılı Çöp Kutusu parça satırıdır. → **DoD**
- **Karar 42.** Ters çevrilen kriter uygulamada yeniden taranır (`purgeOldTrash(`, `purgePart`, onay metni); çıkarsa karar olarak yazılır (0130'da spec birini sayıyordu, dördü çıkmıştı). → **Ters çevrilen kriterler**

### Uygulamada verilen kararlar (2026-11-02)

- **Karar 43.** R4/3 ve C5 0096'yı "birebir" emsal sayıyordu, ama ölçüldü: 0096'da korunan tedarikçinin satırında Kalıcı Sil düğmesi **gizleniyor** (`SettingsTrash.jsx`'te `purge: … && !korunanTedarikciler.has(...) ? … : null`; `hammadde-0096.test.jsx` AC-37 düğmenin yokluğunu sabitliyor), `purgeTedarikci`'deki ret bildirimine o yüzden hiç ulaşılmıyor. Spec'in açık kararı (Karar 3, C5, AC-18: düğme kalır, ret bildirimle) uygulandı; parçada düğme kalır, 0096'nın davranışı dokunulmadı. Emsal yalnız neden metninin kalıbı ve haritaların yeri için geçerlidir. → **R4/3, C5, AC-18**
- **Karar 44.** Ters çevrilen kriter yeniden tarandı (Karar 42): spec'in dediği gibi yok. Tek çarpışma kanıt eşlemesindeydi: `tests/uretim-formu-bagi-0108.test.js` `ayarlar-cop-0108-uretim` ekranının bütün kayıtlarının 0108 taban raporunu göstermesini istiyor; o ekran 0123 raporunda ölçüldü (0 fark) ama eşlemeye ayrıca kayıt eklenmedi. → **DoD**
- **Karar 45.** Görsel kanıt ölçüldü: var olan sekiz ekran (Parça/Yedek Parça listesi ve formları, beş Çöp Kutusu ekranı) 0 piksel; yeni iki ekran `katalog-parca-0123-sil` (kullanım satırlı onay) ve `ayarlar-trash-0123` (nedeni yazılı, düğmesi duran satır). Rapor `0123-piksel-raporu.json`, taban son kodla 20 görüntüde 0 fark. → **Karar 41**

### Triyajda verilen kararlar (2026-11-02)

- **Karar 46.** "Çöpü boşalt" sette bileşen olduğu için bıraktığı parçaları bildirimde sayar: bitiş bildirimine `urunAgaci.setteBirakilanEki(n)` = " Sette bileşen olan n yedek parça tanımı çöpte bırakıldı." eklenir (sayı `bosaltmadaSetteKorunanParcalar`'dan; sıfırsa ek yok, bugünkü metin aynen). Onay penceresinin sayısı ile sonuç artık tutar. 0096'nın tedarikçi koruması aynı biçimde sessizdir; ona ek yapılmadı (ayrı karar). → **R4, AC-7**
- **Karar 47.** `setteGecenParcalar` aynı setin içeriğinde yinelenen satırı bir kez sayar; saf testle sabitlendi (triyaj bulgu 2). Taban raporu son kodla yenilendi; 0108 notu (Karar 44) kapanışta da aynen kalır. → **AC-14, DoD**

---

## Acceptance Criteria

- **AC-1.** Sette bileşen olan parçanın silme onayı, geçtiği setleri **adıyla** ve kaç model kitinde geçtiğini yazar; satır `data-testid="parca-kullanim"` taşır (R3/4).
- **AC-2.** Hiçbir yerde kullanılmayan parçanın silme onayı bugünkü metni birebir gösterir, kullanım satırı çizilmez. **İçeriği olan ama hiçbir sette ve kitte geçmeyen set de bu hâle girer** (onay setin kendi içeriğinden söz etmez, Karar 30).
- **AC-3.** Yalnız model kitinde geçen parçanın onayı kit sayısını yazar, set sayısını yazmaz.
- **AC-4.** Çöpe atma hiçbir durumda engellenmez; onaydan sonra parça Çöp Kutusu'na düşer.
- **AC-5.** Çöpteki parça sette bileşense Kalıcı Sil düğmesi **çizilir**, satırda neden yazar ve onaydan sonra silme hata bildirimiyle reddedilir; kayıt silinmez (R4/3).
- **AC-6.** Aynı parça yalnız model kitinde geçiyorsa Kalıcı Sil çalışır **ve modelin kit satırı `ad` ile `miktar` değerleriyle yerinde kalır** (X1, R5; Karar 31).
- **AC-7.** "Çöpü boşalt" yalnız **canlı** sette bileşen olan parçaları çöpte bırakır, ötekileri siler (harita kalacak parçalardan kurulur, R1/2).
- **AC-8.** Otuz günlük otomatik temizlik sette bileşen olan parçayı silmez; otuz günü geçmiş ve kullanılmayan parçayı siler.
- **AC-9.** Çöpteki bir setin içinde geçen parça Kalıcı Sil ve otuz günlük temizlik kapılarında korunur (`setCop`), çöpten geri alınınca set eksiksiz döner; "çöpü boşalt" kapısında korunmaz (R1/2).
- **AC-10.** Kullanım sayıları iki saf yardımcıdan gelir; onay penceresi, Çöp Kutusu ve temizlik kendi döngüsünü yazmaz ve `setIcerigi` ile `defaultParcalar`'ı doğrudan gezmez (kaynak taraması).
- **AC-11.** Neden metni `urunAgaci.js`'ten gelir ve ekranlarda düz metin olarak geçmez.
- **AC-12.** Koruma hiçbir kaydı değiştirmez: reddedilen silmeden sonra setin içeriği ve parçanın `deletedAt` damgası aynen kalır.
- **AC-13.** Veri şeması, izin tanımları, sunucu kuralları ve birleştirme değişmez (tarama).

### QA turu kriterleri (2026-11-02)

- **AC-14.** `setteGecenParcalar(parts)` `Map(String(partId) → { set, cop })` döndürür; `parcaKullanimi(partId, { parts, modelDizileri, harita })` `{ set, setCop, kit }` döndürür ve iki imza da testle sabitlenir.
- **AC-15.** `harita` verilince `parcaKullanimi` haritayı yeniden kurmaz (casusla ölçülür); Çöp Kutusu listesi haritayı **satır başına değil çizim başına** kurar ve `SettingsTrash`'te iki harita (bütün parçalar ve kalacak parçalar) beklenir. Emsal 0096'nın triyaj bulgusu 3'tür (`hammadde-0096.test.js:175-182`, ölçüm 34) ve üç iddiası aynen uygulanır: haritanın çağrı sayısı, kurulduğu satırın metni, haritayla yapılan çağrılar.
- **AC-16.** `modelDizileri` dizi dizisi olarak geçirilir (`[standardModels, customModels]`); verilmezse `kit` sıfırdır ve sayım yapılmaz.
- **AC-17.** Çöpe atma hiçbir kapıda engellenmez ve parça için "silinemez" Modal'ı kaynakta yoktur (tarama, X9).
- **AC-18.** Korunan parçanın satırında Kalıcı Sil düğmesi çizilir (gizlenmez, pasifleşmez) ve `item.purge` null değildir.
- **AC-19.** `set` sıfır ama `setCop` bir olan parça korunur: kapı `(set + cop) > 0` ölçütünü kullanır, `.has()` biçimi kullanılmaz.
- **AC-20.** "Çöpü boşalt" haritasını kalacak (canlı) parçalardan kurar; yalnız çöpteki bir setin bileşeni olan parça o süpürmede silinir.
- **AC-21.** Otuz günlük temizliğin `koru`'su süpürmeden önceki diziden kurulur; kendisi de süresi dolmuş çöpteki setin bileşeni o turda korunur, sonraki turda silinir.
- **AC-22.** Kullanım cümlesi `urunAgaci.parcaKullanimMetni`'den gelir ve **üç hâli de birebir sabitlenir** (yalnız set, yalnız kit "de" bağlacı olmadan, ikisi birlikte); setler adıyla, çöpteki setler `(silinmiş)` ekiyle, kit sayıyla; üçten fazla set `adListesi` ile "+n" biçimine iner. Yalnız çöpteki bir setin bileşeni olan parçanın onayında da kullanım satırı çizilir (R3/6).
- **AC-23.** `parcayiIcerenSetler` ve `parcaKitAdetleri` gövdeleri değişmez; 0121 R5/2 ile 0087 AC‑11 testleri dokunulmadan yeşil kalır.
- **AC-24.** Kit sayısı yalnız silme onayında görünür; `SettingsTrash` model prop'u almaz ve otuz günlük temizlik model dizilerini okumaz (tarama).
- **AC-25.** `setCop` setin `deletedAt`'ini sayar, silinen parçanın `deletedAt`'ini saymaz.
- **AC-26.** Neden metni `SETTE_PARCA_NEDENI`'dir, adresi "Ayarlar › Katalog › Parça/Yedek Parça"dır ve ekranda düz metin olarak geçmez.
- **AC-27.** Reddedilen silme işlem geçmişine iz yazmaz ve kayıt kilidi almaz; bildirim hata türündedir.
- **AC-28.** Stok satırı, hareket geçmişi, yedekten geri yükleme ve geri almadaki ad denetimi dokunulmaz (X6, X7, X8; tarama).
- **AC-29.** İçe aktarma kayıt silmez ve bu spec onu değiştirmez (tarama).
- **AC-30.** Kit ve set eksikliği maliyet ekranlarında görünür kalır: modelin `eksikSayisi`'nı ve setin eksik bileşen sayısını yazan yollar değişmez (R5/2).
- **AC-31.** Uygulamanın ilk adımında Context 4 ile Context 5'in beş rakamı yeniden ölçülür ve spec'e yazılır (R9).

### İkinci QA turu kriterleri (2026-11-02)

- **AC-32.** Dört kapının her biri R3/6'nın tablosundaki diziyi okur: onay penceresi `hamParts`, Kalıcı Sil `rawParts`, çöpü boşalt kalacak parçalar, otuz günlük temizlik süpürmeden önceki `data.parts` (tarama ve davranış).
- **AC-33.** Spec 0130'un parçalaması değişmez: `setUretimi.js` ile `SetParcalaPenceresi.jsx` dokunulmaz (tarama) ve çöpteki bileşenin stoğunun parçalamada arttığı davranış bugünkü hâliyle kalır (X10).
- **AC-34.** `setteGecenParcalar` setin kendisinin bileşen olduğu satırı atlar: kendine atıf taşıyan bir set o parçayı korumaz.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Sayım iki saf yardımcıda yazıldı ve kendi testi var; arayüz yalnız gösteriyor.
- [ ] Dört kapının hepsi aynı yardımcıyı çağırıyor (tarama ile sabitlendi) ve kapının tek yüklemi `setteGecenParcaMi`'dir.
- [ ] Hazır harita `harita` anahtarıyla geçiriliyor ve satır başına yeniden kurulmuyor (casusla ölçüldü).
- [ ] Çöpe atma hiçbir kapıda engellenmiyor; parça için "silinemez" Modal'ı yazılmadı.
- [ ] Kalıcı Sil düğmesi korunan satırda da çiziliyor; ret hata bildirimiyle oluyor ve kayıt değişmiyor.
- [ ] "Çöpü boşalt" haritasını kalacak parçalardan, öteki iki kapı bütün parçalardan kuruyor.
- [ ] Otuz günlük temizliğin `koru`'su süpürmeden önceki diziden kuruldu; bir turluk gecikme spec'te yazılı.
- [ ] Kullanım cümlesi setleri adıyla yazıyor, kendi `data-testid`'sini taşıyor ve `adListesi` tek tanım kaldı.
- [ ] Kit sayısı yalnız silme onayında; `SettingsTrash` model prop'u almadı.
- [ ] `parcayiIcerenSetler` ve `parcaKitAdetleri` gövdeleri değişmedi; 0121 R5/2 ve 0087 AC‑11 dokunulmadan yeşil.
- [ ] Reddedilen silme iz yazmıyor ve kilit almıyor.
- [ ] Context 4 ile Context 5'in beş rakamı yeniden ölçüldü ve spec'e yazıldı (R9).
- [ ] Dört kapı R3/6'nın tablosundaki diziyi okuyor; onay penceresi `hamParts` ile çalışıyor.
- [ ] Kullanım cümlesinin üç hâli birebir sabitlendi; çöpteki setler adıyla yazılıyor.
- [ ] Spec 0130'un parçalaması dokunulmadı; `setUretimi.js` ve `SetParcalaPenceresi.jsx` değişmedi.
- [ ] Harita setin kendisinin bileşen olduğu satırı atlıyor.
- [ ] Yeni kalıcı alan yok, yeni veri bölümü yok, yeni eylem izni yok; **salt koruma işi olduğu açıkça yazıldı.**
- [ ] Soft-delete simetrisi korundu: geri alma ve kalıcı silme kuralları birlikte sınandı.
- [ ] Kullanıcıya görünen bütün metinler Türkçe ve `urunAgaci.js`'te.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Uygulama commit** | `4c5ea0c` | Dal `feat/0123-set-silme`, taban `9ecb2ed`; kapanış ayrı commit |
| **Spec revizyon sayısı** | 4 | İki QA turu (21 + 12 bulgu, Karar 1–33), plan turu (Karar 34–42), uygulama (Karar 43–45) |
| **Düzeltme turu sayısı** | 1 | Triyaj (Karar 46–47): "çöpü boşalt" bildirimi bırakılanı sayar, yinelenen içerik satırı testi, taban raporu |
| **Bulgu gerçek/gürültü oranı** | 2 / 0 | Üçüncü bulgu kapanış adımıydı, kod kusuru değil |
| **Regresyon sayısı** | 0 | Tam takım 457 dosya, 6299 test (Electron dahil); lint 0 hata, uyarı 62 |
| **Kaçan hata** | 0 | |

**Uygulamada bulunanlar:** R9'un beş rakamı 01.11 yedeğiyle doğrulandı; ölçüm yolu düzeltildi (Karar 34). R1/7 ile Karar 26 çelişiyordu (Karar 35). Çöpteki setin eki var olan `SILINMIS_PARCA` sabitinden (Karar 36). Spec 0096'yı "birebir" emsal sayıyordu, ama 0096'da korunan tedarikçinin Kalıcı Sil düğmesi gizleniyor; spec'in açık kararı uygulandı, parçada düğme kalır (Karar 43). Ters çevrilen kriter yok; 0108'in eşleme testi bir ekranın kayıtlarını kendi taban raporuna bağladığı için o ekran yalnız ölçüldü (Karar 44). Mutasyon ölçümü: uygulamada altı, triyajda iki bozma; hepsi test kırdı.

**Görsel kanıt:** 10 ekran × 2 tema; var olan sekiz ekran 0 piksel, iki yeni ekran (kullanım satırlı onay, nedeni yazılı Çöp Kutusu satırı). Taban son kodla 20 görüntüde 0 fark; iki `degisti` kaydı kapanışta `ayni` ve taban raporuna çevrildi.

**Bu spec'ten çıkarılan ders:** bir spec bir emsali "birebir" diye anıyorsa emsalin gerçek davranışı kodla ölçülmeli; yazılı emsal ile kodun emsali ayrışabiliyor ve fark ancak uygulamada görünüyor. İkinci ders: "sayı ile sonuç tutsun" kuralı onay penceresinin verdiği sözden bildirime kadar izlenmeli; korunan kayıtları sessizce bırakan bir süpürme, onayın söylediği sayıyı yalanlar.
