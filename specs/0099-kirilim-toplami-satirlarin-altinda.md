# 0099 — Hammadde kırılımının toplamı satırların altında gösterilir

| | |
|---|---|
| **Durum** | Onaylandı (revizyon 3, plan onayı 2026-10-21; plan `specs/0099-uygulama-plani.md`) |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Ayarlar › Katalog › Yedek Parça Tanımları: parça ekleme ve düzenleme pencerelerinin maliyet ve hammadde bölümleri (`src/components/PartManager.jsx`), ekran metinlerinin sabitleri (`src/lib/urunAgaci.js`); kayıt niteliğinde iki dosya: `docs/tasarim-sozlugu.md` (bilinen borç listesi) ve `docs/evidence/kanit-eslemesi.json` (üç kaydın beklentisi); kanıt aracına üç yeni ekran (`scripts/evidence/0009-sayfa.jsx`) |
| **Bağımlı spec'ler** | 0096 (hammadde tedarikçisi ve kırılım), 0087 (alış maliyeti alanı ve ürün ağacı), 0097 (maliyet geçmişi bloğu ve geçerlilik tarihi), 0009 ve 0015 (tasarım sözlüğü, özet kutusu emsali), 0088 (maliyetin tüketicisi olan makina maliyeti ekranı) |
| **Ters çevrilen kriterler** | 0096 AC-8 / AC-17 / AC-34 testinin kırılımlı kart yarısı ve onun "rakamlı satır kaybolur" beklentisi (`:85`), 0096 triyaj bulgu 2 testinin yetkili yarısı ve içe aktarma satırı (`:11`), 0097 AC-40 / AC-5 testinin tek satırı. Ayrıntı "Ters çevrilen kriterler" bölümünde |

---

## Intent

Bir yedek parçanın maliyetini tedarikçi tedarikçi girerken (A'dan 7.000, B'den 9.000, C'den 1.000) kullanıcı toplamın ne olduğunu göremiyor: rakam ekranda var ama tedarikçi satırlarının **üstünde**, elle maliyet alanının yerinde duruyor. Düzenleme penceresinde arada bir de maliyet geçmişi listesi olduğu için üçüncü tedarikçiyi yazarken toplam görüş alanının tamamen dışında kalıyor ve kullanıcı yukarı bakmadan "17 bin yaptı mı" sorusunu cevaplayamıyor.

Takım Yöneticisi'nin isteği şu: toplam, tedarikçi eklendikçe **satırların altında** büyüsün. Aynı soruda elle girilen maliyet alanının hâlâ gerekip gerekmediği de soruldu; ölçüm alanın dört ayrı giriş yolunun tek kapısı olduğunu gösterdi, bu yüzden alan kalıyor (Karar 1).

Başarı şu: kullanıcı üçüncü tedarikçinin tutarını yazdığı anda, gözünü kaldırmadan, satırların hemen altında "3 tedarikçi · 17.000,00 ₺" yazdığını görür. Aynı rakam ekranda ikinci bir yerde tekrarlanmaz. Kırılımı olmayan parçada ekran bugünkü gibi davranır ve maliyet elle girilmeye devam eder.

---

## Requirements

- **R1.** Elle girilen alış maliyeti alanı kaldırılmaz. Kırılımı olmayan parçada maliyetin tek giriş yolu bu alandır ve bugünkü davranışı birebir korunur.
- **R2.** Hammadde tedarikçileri bölümünün altında, kırılımdan türeyen toplamı gösteren bir satır çizilir. Satır, satır eklendikçe, silindikçe ve **tutar girildikçe ya da değiştikçe** anında güncellenir. Yeni eklenen boş satır toplamı ve sayıyı değiştirmez (AC-8 ile aynı sınır).
- **R3.** Toplam satırı yalnız parçanın maliyeti kırılımdan geliyorken çizilir; yani en az bir tedarikçi satırında tutar girilmişken. Hiçbir satırda tutar yokken satır hiç çizilmez ve maliyet elle girilen değerdir.
- **R4.** Toplam satırı iki bilgi taşır: kaç tedarikçinin tutarının toplandığı ve toplamın kendisi. Metinler sabittir: solda "Toplam, parçanın alış maliyeti", sağda "tutarı girilen `n` tedarikçi" ve tutar. Tutar `urunAgaci.maliyetMetniKurus` ile biçimlenir (liste hücresinin de kullandığı biçimleyici, `17.000,00 ₺`); `parcaMaliyetMetni` kayıt alan sarmalayıcıdır ve formda kullanılmaz.
- **R4/2.** Sağdaki sayının ibaresi "tutarı girilen `n` tedarikçi"dir, yani sayının neyi saydığını kendisi söyler. Tutarsız kırılımda ekranda duran satır sayısı ile bu sayı farklı olabilir (AC-5) ve bu fark ibarenin kendisinden anlaşılır. Sayı tek tedarikçide de yazılır ("tutarı girilen 1 tedarikçi"); n = 1 için ayrı görünüm yoktur.
- **R4/3.** Satırın kabı `data-testid="hammadde-toplam"` taşır ve `textContent`'i şu sırayla oluşur: sol etiket, sayı ibaresi, tutar. Parçaların arasına ayraç karakteri **yazılmaz**; aralık yalnız yerleşimden gelir. Intent'teki `"3 tedarikçi · 17.000,00 ₺"` ifadesi mockup dilidir, kriter değildir.
- **R4/4.** Üç metnin kaynağı `src/lib/urunAgaci.js`'tir: `HAMMADDE_TOPLAM_ETIKETI = "Toplam, parçanın alış maliyeti"` ve `hammaddeToplamSayisi(n)` (döndürdüğü dize `tutarı girilen ${n} tedarikçi`). Ekran bu metinleri satır içinde yazmaz.
- **R5.** Toplam satırı tedarikçi satırlarının ve "Tedarikçi ekle" düğmesinin altında, tutarı girilmemiş satır uyarısının ve bölüm ipucusunun üstünde durur.
- **R6.** Toplam satırının varlığı "Tedarikçi ekle" düğmesinin varlığına bağlı değildir; düğme bütün uygun tedarikçiler seçildiği için çizilmediğinde de toplam görünür.
- **R7.** Kırılımın **toplamı** ekranda bir kez yazılır: kırılım bölümünü gören kullanıcıda maliyet alanının altındaki rakamlı satır kalkar; yerinde yalnız rakamsız gerekçe kalır ("Hammadde kırılımından geliyor"). Maliyet geçmişi bloğunun tarihli tutarları bu kuralın dışındadır (X7): onlar geçmiş değerlerdir, bugünkü toplam değildir, ve bir tutar düzenlenirken geçmişin en yeni satırı ile toplam satırının farklı rakam göstermesi beklenen durumdur.
- **R8.** Kırılım bölümünü görmeyen kullanıcıda (gider yetkisi yok) ekran bugünkü gibi davranır: maliyet alanı pasiftir ve altında rakamlı satır ile rakamsız gerekçe bugünkü metinleriyle durur. Bu kullanıcı toplam satırını hiç görmez.
- **R9.** Tedarikçi sayısı **açık pencerenin içinde** yalnız toplam satırında yazılır. Maliyet alanının altındaki gerekçe ibaresi artık sayı taşımaz, yani iki kullanıcı türü için tek metin kullanılır. Pencerenin arkasında duran parça listesinin kendi "`n` tedarikçiden" satırı bu kuralın dışındadır (C6, AC-22).
- **R10.** Elle girilmiş maliyette alanın altındaki "Elle girildi" ibaresi aynen kalır ve toplam satırı çizilmez.
- **R11.** Toplam yeniden hesaplanmaz: ekranda görünen rakam parçanın maliyetini okuyan bugünkü tek yoldan gelir, böylece satır listedeki maliyet hücresi, makina maliyeti ve Parti Hesabı ile her zaman aynı sayıyı gösterir.
- **R12.** Kural ekleme ve düzenleme pencerelerinde aynıdır; iki pencere aynı bölümü çizer.
- **R13.** Toplamın tutarı sıfır olabilir: bütün satırlara 0 girilmiş parçada toplam "0,00 ₺" yazar ve "maliyeti girilmedi" durumundan ayrılır.
- **R14.** Toplam satırı tasarım sözlüğüne yeni bir **bileşen** doğurmaz; görünüm `src/components/GiderForm.jsx:464`'teki özet kutusunun (`normal-ozet`) yakın kopyasıdır. Bu kutu bugün sözlükte tanımlı değil, bu yüzden kopya sözlüğün "Bilinen borç › Kapsam içindeki yakın kopyalar" listesine kaydedilir (CLAUDE.md 0009 kuralı: ekran içinde kayıtsız yerel kopya yazılmaz).
- **R15.** Toplam yalnız **doğrulamadan geçen** satırları sayar, yani bugünkü `hammaddeDogrula`'nın `kayit` çıktısını; ekran ayrı bir süzme yazmaz. Hatalı satır (tedarikçisi seçilmemiş, aynı tedarikçi iki kez, sayı olmayan ya da negatif tutar) toplama ve sayıya girmez.
- **R16.** Hatalı satır varken toplam satırı çizilmeye devam eder ve içinde rakamsız bir ibare durur: "Hatalı satır var; toplam yalnız geçerli satırlardan." (`urunAgaci.HAMMADDE_TOPLAM_HATALI`). Kayıt bugünkü gibi engellidir (`kaydet`'in `!h.gecerli` erken dönüşü); bu ibare kullanıcının "yazdım ama toplam artmadı" sorusunu toplamın yanında cevaplar.
- **R16/2 (plan onayı, P1).** İbare **canlıdır**: bölümün tutarsız uyarısı için zaten yaptığı `hammaddeDogrula(satirlar)` çağrısının aynı sonucunun `gecerli` alanından okunur (yeni çağrı ve yeni süzme yok); satırın kendi `HataMetni`'si bugünkü gibi Kaydet'te dolar.
- **R16/3 (plan onayı, P2).** Geçerli ve tutarlı satır hiç yokken (örneğin tek satır, tedarikçisi seçilmemiş, tutarı dolu) R3 harfiyen uygulanır: toplam satırı ve dolayısıyla ibare çizilmez; maliyet alanı etkin kalır, kayıt `!h.gecerli` ile engellenir ve satırın hatası Kaydet'te görünür. Gerekçe Karar 4: kutuyu bu durumda açmak "girilmedi" ile "sıfır" ayrımını bozardı.
- **R16/4 (plan onayı, P3).** İbare kutunun içinde, tutarın altında ayrı bir satırdır; kabın `textContent`'i hatalı durumda "etiket + sayı ibaresi + tutar + hata ibaresi" olur. Hatasız durumda R4/3'ün üç parçalı tam eşitliği değişmez.

---

## Constraints

### Uyulması zorunlu

- **C1.** Saklanan hiçbir şey değişmez. Toplam okuma anında türer (spec 0096 C2) ve maliyetin tek okuma yolundan okunur (0096 C1); ekranda ikinci bir toplama yazılmaz.
- **C1/2.** Toplam, ebeveynin `formMaliyeti(form)` çağrısının **aynı sonucundan** gelir ve `HammaddeAlani`'na prop olarak iner; bölüm kendi içinde maliyet okuma yolunu ikinci kez çağırmaz. Böylece maliyet alanının pasifliği ile toplam satırının varlığı aynı `kirilimK` değerinden türer ve hiçbir durumda ayrışamaz. Tarama ölçütü: `src/components/PartManager.jsx` içinde `formMaliyeti(` ve `parcaMaliyetKurus(` çağrı sayısı bu işten sonra artmaz ve `reduce`, `+=` ya da `kurus(` ile hammadde tutarı toplayan yeni satır yoktur.
- **C2.** Spec 0096'nın kayıt kuralları korunur: kırılımda tutar varken elle alan pasiftir, değeri gösterilmez ve kayıtta elle maliyet anahtarı silinir.
- **C3.** Gider yetkisi olmayan kullanıcı için davranış değişmez. Bu kullanıcıda kırılım bölümü hiç çizilmiyor (ölçüm 2), bu yüzden rakamı ondan almak sessiz bir kayıp olurdu.
- **C4.** Yeni kalıcı alan, veri bölümü, tablo, eylem izni, sunucu kuralı, birleştirme kuralı ve kilit alanı yok. Değişen yalnız çizim ve üç metin.
- **C5.** Ekran metinleri sabittir ve bu spec'te yazılıdır (spec 0098 Karar 7 emsali); testler bu dizeleri birebir karşılaştırır. Sabitlenen dört şey: kap kimliği `hammadde-toplam`, sol etiket `HAMMADDE_TOPLAM_ETIKETI`, sayı ibaresi `hammaddeToplamSayisi(n)` ve hata ibaresi `HAMMADDE_TOPLAM_HATALI` (R4/2, R4/3, R4/4, R16).
- **C5/2.** İki sabitin adı bu işle değişir ve adlar da sabittir: `KAYNAK_KIRILIM_YETKISIZ` → **`KAYNAK_KIRILIM`** (değeri aynen "Hammadde kırılımından geliyor"; artık iki kullanıcı türünün tek metni olduğu için eski ad yanıltıcı), ve `kaynakKartMetni` **silinir** (tek çağıranı `PartManager.jsx:73`'tü, sayı toplam satırına taşındı). `kaynakListeMetni` liste hücresinde aynen kalır (C6).
- **C6.** Parça listesinin maliyet hücresi (iki satırıyla birlikte), Excel dışa ve içe aktarması, maliyet geçmişi bloğu ve geçerlilik tarihi alanı değişmez. Liste penceresinin arkasında çizilmeye devam ettiği için pencere açıkken ekranda duran "`n` tedarikçiden" satırı bir ihlal değildir (ölçüm 10, R9, AC-14).
- **C7.** Spec 0097'nin düzeni korunur: düzenleme penceresinde maliyet geçmişi bloğu maliyet alanı ile hammadde bölümünün arasında kalır.

### KAPSAM DIŞI

- **X1.** Elle girilen maliyet alanının kaldırılması — *neden:* alan dört giriş yolunun tek kapısı (ölçüm 3 ve Karar 1); kaldırmak gider sekmesi olmayan kullanıcıyı maliyetsiz bırakır, Excel sütununun yazacağı yeri siler, hazır alınan parçayı tedarikçi işaretlemeye zorlar ve ücretsiz parçanın sıfırını anlatacak yeri kaldırır.
- **X2.** Toplamın parça listesinde, makina maliyeti ekranında ya da başka bir yerde yeniden gösterilmesi — *neden:* liste hücresi maliyeti ve kaynağını zaten yazıyor (ölçüm 8); bu spec tek bir pencerenin yerleşimidir.
- **X3.** Tedarikçi satırlarında para birimi, KDV ya da kur — *neden:* kırılım tutarları spec 0096 ile TL ve KDV hariçtir; para birimi açmak kırılımı ve onu okuyan bütün maliyet zincirini değiştirir.
- **X4.** Tutarların gider kaleminden türetilmesi — *neden:* spec 0096 C5 kararı; tutarlar elle girilen standart maliyettir, fatura lot bazlıdır.
- **X5.** Kırılım varken pasif maliyet alanının bütünüyle gizlenmesi — *neden:* alan kaybolunca kullanıcı onu arar; pasif ama görünür alan nedenini kendi anlatır ve kırılım boşaltılınca aynı yerde etkinleşir.
- **X6.** "Tedarikçi ekle" düğmesinin bütün tedarikçiler seçiliyken kaybolması davranışı — *neden:* bugünkü kural (ölçüm 7), bu spec yalnız toplamın ona bağlanmamasını ister.
- **X7.** Kırılımı olan parçada maliyet geçmişi bloğunun yeri ve içeriği — *neden:* spec 0097'nin kararı, bu işin sorusu değil.

---

## Context

Bugünkü davranış, 2026-10-21'de `main` (`250dd16`) üzerinde ölçüldü.

**Ölçüm 1, alan her zaman çizilir ve kırılım varken pasifleşir.** `PartManager.jsx:67-75` (`MaliyetAlani`): kırılımda tutar varken giriş kutusu pasif ve boş (0096 R21), altında iki satır var: `maliyet-kirilimdan` mavi ve rakamlı ("Maliyet hammadde kırılımından geliyor: 17.000,00 ₺", `:72`) ve `maliyet-kaynagi` gri ve kaynağı söyleyen (`:73`).

**Ölçüm 2, kırılım bölümü yalnız gider yetkisiyle çizilir, maliyet alanı koşulsuz.** Ekleme kipinde `PartManager.jsx:476-477`, düzenleme kipinde `:528-532`: `MaliyetAlani` iki kipte de koşulsuz, `HammaddeAlani` yalnız `giderYetki` ile.

**Ölçüm 3, maliyet alanı maliyetin tek giriş kapısıdır.** Kırılım seçicisi yalnız hammadde işaretli canlı tedarikçileri listeliyor (`urunAgaci.js:178`), Excel'in maliyet sütunu bu alana yazıyor ve kırılımlı parçada atlanıyor (`urunAgaci.js:168`), ücretsiz parçanın sıfırı bu alanın ipucusunda anlatılıyor, gider yetkisi olmayan kullanıcı ise bölümü hiç görmüyor (ölçüm 2).

**Ölçüm 4, rakam yetkisiz kullanıcıya da gösteriliyor.** `:72` yetkiye bağlı değil, `:73` iki metin arasında seçim yapıyor: yetkili kullanıcıda sayılı ("3 tedarikçinin hammadde kırılımından geliyor"), yetkisizde sayısız ("Hammadde kırılımından geliyor", `urunAgaci.js:159`). Testi `tests/ui/hammadde-0096.test.jsx:208`. Bu yüzden rakamı koşulsuz aşağı taşımak yetkisiz kullanıcıda maliyeti ekrandan silerdi.

**Ölçüm 5, bugün toplam ile satırların arası bir ya da iki blok.** Ekleme kipinde maliyet alanı ile hammadde bölümü komşu (`:476-477`); düzenleme kipinde aralarında maliyet geçmişi bloğu var (`:528-532`), yani kullanıcı tutarı yazarken toplam iki blok yukarıda kalıyor.

**Ölçüm 6, kırılım bölümünde toplam satırı yok.** `PartManager.jsx:108-150`: satırlar, "Tedarikçi ekle", tutarı girilmemiş satır uyarısı ve ipucu. İpucu kuralı söylüyor ama rakamı vermiyor: "Tutar girilen satırların toplamı parçanın alış maliyeti olur." (`urunAgaci.js:164`).

**Ölçüm 7, "Tedarikçi ekle" düğmesi kaybolabiliyor.** `:143`: düğme yalnız seçilmemiş uygun tedarikçi kaldıysa çiziliyor. Toplam bu düğmeye bağlanırsa bütün tedarikçileri seçmiş parçada toplam kaybolurdu (R6).

**Ölçüm 8, toplam zaten türetiliyor.** `urunAgaci.js:30-36` (`tutarliSatirlar`, `kirilimTutarliMi`, `bugunkuKurus`) tutarlı satırları süzüp kuruşla topluyor; form canlı değeri aynı yoldan hesaplıyor (`PartManager.jsx:153-157`, `formMaliyeti`). Ekranın yeni bir hesabı olmayacak, yalnız var olan değer başka yere yazılacak.

**Ölçüm 9, metinler birebir test ediliyor ve dokunulacak yer altı tanedir.** `tests/ui/hammadde-0096.test.jsx:11` (`KAYNAK_KIRILIM_YETKISIZ` içe aktarması, C5/2 ile adı değişiyor), `:81` (rakamlı satır), `:82` ve `:215` (sayılı kaynak ibaresi), `:85` (tutarlar boşaltılınca rakamlı satırın kaybolması), `:210` (yetkisiz kullanıcının sayısız ibaresi), ve `tests/ui/maliyet-gecmisi-0097.test.jsx:149` (rakamlı satırın varlığı). `tests/ui/hammadde-0096-app.test.jsx:55` liste hücresini ölçtüğü için **dokunulmaz** (C6).

**Ölçüm 9/2, `:85` bu işten sonra kendiliğinden yeşil kalır.** `expect(screen.queryByTestId("maliyet-kirilimdan")).toBeNull()` satırı bugün gerçek bir koruma: tutarlar boşaltılınca rakamlı satırın kaybolmasını ölçüyor. Yetkili kullanıcıda bu satır artık hiç çizilmediği için beklenti her koşulda doğrulanır ve hiçbir şeyi ölçmez. Spec 0098'in aynı sınıf bulgusu (B-3) bunu bloklayıcı saymıştı; beklenti boş bırakılmaz, toplam satırının kaybolmasına çevrilir (AC-18).

**Ölçüm 10, parça listesi pencere açıkken ekranda duruyor.** `PartManager.jsx:417-419`: tablo koşulsuz çiziliyor, `Modal` onun üstüne biniyor ve yetkili kullanıcıda hücrenin ikinci satırı `kaynakListeMetni(3)` = "3 tedarikçiden" yazıyor. 0096'nın bugünkü testi bu soruyu tam olarak böyle ölçüyor: `tests/ui/hammadde-0096.test.jsx:211` `expect(document.body.textContent).not.toMatch(/\d+ tedarikçi/)`. Yani "sayı ekranda bir kez geçer" iddiası yalnız pencerenin içi için doğrudur (R9, AC-14, Karar 7).

**Ölçüm 11, doğrulama hatası olan satır bugün toplamdan sessizce düşüyor.** `urunAgaci.js:184-200` (`hammaddeDogrula`) hatalı satırı `kayit`'e hiç koymuyor: tedarikçisi seçilmemiş ama tutarı dolu satır, aynı tedarikçinin ikinci kez seçildiği satır, sayı olmayan tutar ve negatif tutar. `formMaliyeti` (`:153-157`) aynı doğrulayıcıdan geçtiği için canlı toplam da onları saymıyor; `kaydet` (`PartManager.jsx:319`) `!h.gecerli` ile kaydı engelliyor. Kanıt aracının `katalog-parca-0096-hata` ekranı tam bu hâli çekiyor (tutar 1 = -5). Veri açısından risk yok, risk kullanıcının "yazdım ama toplam artmadı" sorusudur (R15, R16, Karar 8).

**Ölçüm 12, kanıt ekranlarının envanteri.** `scripts/evidence/0009-sayfa.jsx`'te `katalog-parca-0096-kirilim` (`:737`), `-tutarsiz` (`:738`), `-bos` (`:739`), `-hata` (`:742`), `katalog-parca-0097-gecmis` (`:740`), `-hata` (`:741`), `katalog-parca` (`:735`), `katalog-parca-yeni` (`:745`), `ayarlar-yedekparca-0096-suzgec` (`:743`) ve `ayarlar-yedekparca-0096-yetkisiz` (`:744`) var. DoD'nin istediği beş ekrandan ikisi karşılıksız: `ayarlar-yedekparca-0096-yetkisiz`'in adım listesi **boş**, yani yalnız listeyi çekiyor ve düzenleme penceresini hiç açmıyor; `katalog-parca-yeni` ise `PARCA_0087` ve tedarikçisiz veriyle çağrıldığı için hammadde bölümü `hammadde-bos` dalına düşüyor ve AC-19'un ölçtüğü şeyi göstermiyor. Kırılımsız ve maliyeti dolu bir parçanın penceresini çeken ekran da yok.

**Ölçüm 13, kanıt eşlemesi ve sözlük kaydı.** `docs/evidence/kanit-eslemesi.json`'da `src/components/PartManager.jsx`'in 26 kaydı var ve 0096 turunun hepsi `beklenen: "ayni"`. `docs/tasarim-sozlugu.md` ise `normal-ozet` kutusunu ne bileşen olarak ne de "Bilinen borç" listesinde anıyor; sözlüğün kendi kuralları iki yerde ters yönü söylüyor ("Tek bir sayıyı öne çıkaran özet kartı: `StatCard` / `StatKart`" ve "Form içindeki bölümler: kartla çevrelenmez"). Yani Karar 5 sözlüğün tanımadığı bir satır içi stilin üçüncü kopyasını istiyor ve kopyanın kaydedilmesi gerekiyor (R14).

**Ölçüm 14, renkler ve kontrast ölçüldü, 0030 işi doğmuyor.** `--n100`, `--n200` ve `--blu700` üçü de `src/lib/theme.js` `TOKENS`'ta tanımlı (`:25`, `:22`, `:96`), yani 0030'un "tanımsız ad sessizce açık yedeğe düşer" tuzağı yok. WCAG bağıl parlaklık kontrastı `blu700` üzerinde `n100` zeminde aydınlıkta **6,41**, karanlıkta **6,42**; ikisi de AA eşiğinin (4,5) üstünde, yani `tasarim-kontrast`'ın 0030 bloğuna satır eklemek gerekmiyor ve karanlık tema işi doğmuyor.

---

## Kararlar

Altı kararın tamamı Takım Yöneticisi tarafından **2026-10-21'de** onaylandı: ilk ikisi isteğin kendisiyle belirlendi, kalan dördü öneri olarak sunuldu ve aynı gün onaylandı. Her biri için reddedilen seçeneğin bedeli kalıcı kayıt olarak burada duruyor.

**Karar 1 (Takım Yöneticisi'nin 2026-10-21 yönüyle belirlendi): elle girilen maliyet alanı kalır.** Soru "bu alana hâlâ ihtiyaç var mı" diye soruldu; ölçüm 3 dört giriş yolunun tek kapısı olduğunu gösterdi ve alanın kalması kabul edildi. Reddedilenin bedeli: alan kalkarsa gider sekmesi olmayan kullanıcı maliyeti ne girer ne görür, Excel sütunu yazacak yer bulamaz, hazır alınan parça için tedarikçi kaydı açmak zorunlu olur ve ücretsiz parçanın sıfırı anlatılamaz.

**Karar 2 (Takım Yöneticisi'nin 2026-10-21 yönüyle belirlendi): toplam tedarikçi satırlarının altına taşınır.** Gerekçe ölçüm 5: rakam bugün kullanıcının baktığı yerin bir ya da iki blok yukarısında.

**Karar 3 (onaylandı): rakam ekranda tek yerde durur.** Kırılım bölümünü gören kullanıcıda üstteki rakamlı satır kalkar, yerinde rakamsız gerekçe kalır; bölümü görmeyen kullanıcıda bugünkü iki satır aynen kalır (R7, R8). Reddedilen seçenek rakamı iki yerde göstermek: bedeli, aynı sayının iki yerde durması ve ikisi uyuşmadığında hangisinin doğru olduğunun sorulması. İkinci reddedilen seçenek rakamı koşulsuz aşağı taşımak: bedeli ölçüm 4'teki kayıp, yani gider yetkisi olmayan kullanıcının maliyeti hiç görememesi. **Kuralın iki sınırı var ve ikisi de yazılı:** maliyet geçmişi bloğunun tarihli tutarları kapsam dışıdır (X7, R7) ve pencerenin arkasındaki liste hücresinin kendi satırı korunur (C6, R9).

**Karar 4 (onaylandı): toplam yalnız maliyet kırılımdan geliyorken çizilir.** Yani en az bir satırda tutar varken (R3). Reddedilen: satırı her zaman çizip tutarsız parçada "0,00 ₺" yazmak; bedeli spec 0087'nin "girilmedi" ile "sıfır" ayrımının bozulması, yani maliyeti gerçekten sıfır olan parça ile henüz tutar girilmemiş parçanın aynı görünmesi.

**Karar 5 (onaylandı): görünüm gider formunun özet kutusu emsalidir.** Nötr gri kutu (`src/components/GiderForm.jsx:464`, `normal-ozet` deseni: `--n100` zemin, `--n200` kenarlık, 12 px köşe), tutar kalın ve mavi (`--blu700`), yani bugünkü rakamlı satırın "türetilmiş değer" rengi korunur. **Birleşim bilinçlidir:** kutu çerçevesi `normal-ozet`ten, tutarın mavi rengi bugünkü `maliyet-kirilimdan` satırından (`PartManager.jsx:72`) gelir; emsal kutunun tutarları düz `<b>` ile renksizdir (`GiderForm.jsx:468-471`), yani "emsal renksiz" diye mavi kaldırılmaz. Kontrast ölçüldü: `blu700` üzerinde `n100` zeminde aydınlıkta 6,41 karanlıkta 6,42, ikisi de AA üstü (ölçüm 14). Reddedilen: bilgi şeridi (`UyariSeridi` `bilgi`) kullanmak; bedeli, şeridin uyarı ailesi olması ve özet ile uyarının aynı görünmesi. Mockup'ta kutu mavi zeminle çizildi; sözlük emsali nötr zemini söylediği için öneri nötr zemindir.

**Karar 6 (onaylandı): tedarikçi sayısı toplam satırına taşınır.** Maliyet alanının altındaki gerekçe ibaresi sayısızlaşır ve iki kullanıcı türü için tek metin olur (R9). Bugünkü sabitin adı bu kararla yanıltıcı olur (yalnız yetkisiz kullanıcıya ait değildir), bu yüzden `KAYNAK_KIRILIM_YETKISIZ` → **`KAYNAK_KIRILIM`** olur ve değeri aynen kalır; sayıyı yazan `kaynakKartMetni` tek çağıranını kaybettiği için **silinir** (C5/2). Reddedilen: sayıyı iki yerde yazmak; bedeli yine ikilik.

### QA turu kararları (2026-10-21)

Aşağıdaki dört karar, geliştiriciye verilmeden önce yapılan boşluk analizinde çıktı ve aynı gün onaylandı.

**Karar 7 (onaylandı): "sayı ekranda bir kez" kuralı pencereye daraltıldı.** Ölçüm 10 parça listesinin pencere açıkken ekranda durduğunu ve yetkili kullanıcıda "3 tedarikçiden" yazdığını gösterdi; AC-14'ün ilk hâli bu yüzden hem AC-22 ile çelişiyor hem de ölçülemiyordu. Sayım açık pencerenin kabı içinde yapılır, `document.body` üzerinde değil (R9, AC-14). Reddedilen seçenek liste hücresinin ikinci satırını kaldırmak: bedeli, AC-22, C6 ve 0096 AC-7 / AC-13 / AC-45'in ters çevrilmesi ve kapsamın bir pencere yerleşiminden bütün ekrana yayılması (X2'nin kendi gerekçesi).

**Karar 8 (onaylandı): hatalı satır toplama girmez ve bunu toplam satırı söyler.** Ölçüm 11 hatalı satırın bugün sessizce düştüğünü gösterdi. Kural bugünkü doğrulayıcıdır (R15) ve yanına rakamsız bir ibare konur (R16). Reddedilen seçenek hatalı satırı toplama katmak: bedeli, toplamın kaydedilecek maliyetten farklı bir sayı göstermesi ve R11 ile AC-20'nin (liste hücresiyle birebir aynılık) kırılması. İkinci reddedilen: ibareyi hiç yazmayıp satırın kendi `HataMetni`'sine güvenmek; bedeli, kullanıcının baktığı yerin toplam olması.

**Karar 9 (onaylandı): kimlik, bileşik metin ve sabit adları spec'te yazılıdır.** C5 dizelerin birebir karşılaştırılmasını istediği hâlde ilk hâlde ne `data-testid` ne de parçaların nasıl birleştiği yazılıydı, yani yirmi kriterin hepsi belirsizdi. Artık kap kimliği, üç metin sabiti, ayraçsız sıra ve iki adlandırma kararı yazılı (R4/2, R4/3, R4/4, R16, C5, C5/2). Reddedilen seçenek kararı plana bırakmak: bedeli, kriterlerin "yaklaşık" test edilmesi ve metin değişince sessiz kayma.

**Karar 10 (onaylandı): kanıt ve kayıt borçları DoD'ye yazıldı.** Ölçüm 12 istenen beş kanıt ekranından ikisinin karşılığı olmadığını, ölçüm 13 ise `kanit-eslemesi.json` ve `docs/tasarim-sozlugu.md` kayıtlarının hiç anılmadığını gösterdi. Üç yeni ekran adı (`katalog-parca-0099-yetkisiz`, `-ekle`, `-elle`), değişecek üç kaydın işaretlenmesi ve sözlüğün bilinen borç satırı DoD'de madde oldu. Reddedilen seçenek kanıtı yalnız var olan iki ekranla yapmak: bedeli, yetkisiz kullanıcının penceresinin (C3'ün kalbi) ve ekleme penceresinin hiç görsel kanıt almaması.

---

## Acceptance Criteria

- **AC-1.** Gider yetkisi olan kullanıcı kırılımlı bir parçayı düzenlediğinde hammadde satırlarının altında toplam satırı çizilir.
- **AC-2.** Toplam satırının solunda "Toplam, parçanın alış maliyeti" yazar.
- **AC-3.** Üç tedarikçiye 7.000, 9.000 ve 1.000 girilmiş parçada toplam satırı "tutarı girilen 3 tedarikçi" ve "17.000,00 ₺" yazar; kabın (`hammadde-toplam`) metni sol etiket, sayı ibaresi, tutar sırasıyla ve aralarında ayraç karakteri olmadan oluşur.
- **AC-4.** Dördüncü tedarikçi eklenip 500 girildiğinde toplam satırı aynı etkileşimde "tutarı girilen 4 tedarikçi" ve "17.500,00 ₺" olur; satır eklenip tutar henüz girilmemişken sayı ve tutar değişmez.
- **AC-5.** Bir satırın tutarı silindiğinde toplam o satırı saymaz ve tedarikçi sayısı bir azalır.
- **AC-6.** Bir satır bütünüyle silindiğinde toplam o satırı saymaz.
- **AC-7.** Kuruşlu tutarlar toplanır: 8.000,55 ve 9.000,45 girilmiş parçada toplam "17.001,00 ₺" yazar.
- **AC-7/2.** Tek tedarikçiye 4.250 girilmiş parçada toplam satırı "tutarı girilen 1 tedarikçi" ve "4.250,00 ₺" yazar; n = 1 için ayrı bir görünüm yok.
- **AC-8.** Hiçbir satırda tutar yokken toplam satırı çizilmez.
- **AC-9.** Hiç tedarikçi satırı olmayan parçada toplam satırı çizilmez.
- **AC-10.** Bütün satırlarına 0 girilmiş parçada toplam satırı çizilir ve "0,00 ₺" yazar.
- **AC-10/2.** Toplam satırı tutarsız kırılımda ekrandaki satır sayısını değil tutarı girilen satır sayısını yazar: iki satırlı parçanın biri tutarsızsa "tutarı girilen 1 tedarikçi" yazar ve `hammadde-tutarsiz` uyarısı bugünkü metniyle durur.
- **AC-11.** Toplam satırı "Tedarikçi ekle" düğmesinin altında, tutarı girilmemiş satır uyarısının üstünde durur.
- **AC-12.** Bütün uygun tedarikçiler seçildiği için "Tedarikçi ekle" düğmesi çizilmediğinde toplam satırı yine çizilir.
- **AC-13.** Gider yetkisi olan kullanıcıda kırılımlı parçanın maliyet alanının altında rakam yazmaz; orada yalnız "Hammadde kırılımından geliyor" ibaresi durur.
- **AC-14.** Gider yetkisi olan kullanıcıda tedarikçi sayısı **açık pencerenin içinde** yalnız bir kez geçer ve o yer toplam satırıdır. Ölçü pencerenin kabı üzerinde yapılır (plan onayı, P4: `Modal`'ın rolü olmadığı için kap `.modal-backdrop`'tur; `Modal`'a dokunulmaz); pencerenin arkasındaki liste hücresinin "`n` tedarikçiden" satırı (AC-22) bu sayıma girmez.
- **AC-15.** Gider yetkisi olmayan kullanıcı kırılımlı parçayı düzenlediğinde maliyet alanının altında bugünkü rakamlı satır ("Maliyet hammadde kırılımından geliyor: 17.000,00 ₺") durur.
- **AC-16.** Gider yetkisi olmayan kullanıcı toplam satırını görmez ve ekranda hiçbir tedarikçi sayısı görmez.
- **AC-17.** Elle maliyeti girilmiş parçada maliyet alanı etkindir, altında "Elle girildi" yazar ve toplam satırı çizilmez.
- **AC-18.** Kırılımın bütün tutarları boşaltıldığında aynı pencerede maliyet alanı etkinleşir, toplam satırı kaybolur ve alanın altındaki gerekçe ibaresi yerini "Elle girildi" ya da boş duruma bırakır.
- **AC-19.** Yeni parça ekleme penceresinde de kural aynıdır: tutar girilen tedarikçi satırları eklendikçe toplam satırı çizilir ve büyür.
- **AC-20.** Toplam satırında görünen tutar, kaydedilen parçanın listedeki maliyet hücresinde görünen tutarla birebir aynıdır.
- **AC-21.** Bu spec hiçbir kayıt alanını değiştirmez: kırılımlı bir parça açılıp hiçbir alana dokunulmadan kaydedildiğinde kaydedilen gövde spec öncesiyle birebir aynıdır. Ölçü 0096 AC-6'nın desenidir (aynı dosyada `toEqual` ile tam gövde karşılaştırması); yeni altın dosya üretilmez, çünkü bu işte değişen hiçbir saf fonksiyon yok (C4).
- **AC-22.** Parça listesinin maliyet hücresi, hücrenin ikinci satırı ("`n` tedarikçiden") ve Excel içe aktarma davranışı değişmez.

### Hatalı satır ve tek okuma yolu

- **AC-23.** Tutarı girilmiş ama tedarikçisi seçilmemiş satır toplama ve sayıya girmez; toplam satırı çizilmeye devam eder ve içinde "Hatalı satır var; toplam yalnız geçerli satırlardan." ibaresi durur.
- **AC-24.** Negatif tutarlı satır toplama girmez, aynı ibare çıkar ve kayıt bugünkü gibi engellenir (parça da kit de yazılmaz).
- **AC-25.** Aynı tedarikçinin iki kez seçildiği satır toplama girmez; hatalar düzeltilince toplam ve sayı o satırı sayar ve hata ibaresi kaybolur.
- **AC-26.** `src/components/PartManager.jsx` içinde `formMaliyeti(` ve `parcaMaliyetKurus(` çağrı sayısı bu işten önceki sayıdan fazla değildir ve hammadde tutarlarını `reduce`, `+=` ya da `kurus(` ile toplayan yeni satır yoktur (kaynak taraması, C1/2).
- **AC-27.** Üç ekran metni ve kap kimliği kaynakta yalnız `src/lib/urunAgaci.js`'te tanımlıdır (`HAMMADDE_TOPLAM_ETIKETI`, `hammaddeToplamSayisi`, `HAMMADDE_TOPLAM_HATALI`); `PartManager.jsx` bu dizeleri satır içinde yazmaz.
- **AC-28.** `kaynakKartMetni` kaynakta hiç geçmez ve `KAYNAK_KIRILIM` adı iki kullanıcı türünün tek metnidir (kaynak taraması, C5/2).
- **AC-29.** Düzenleme penceresinde maliyet geçmişi bloğu yerinde kalır (maliyet alanı ile hammadde bölümünün arasında) ve bir tutar değiştirildiğinde geçmişin en yeni satırı eski rakamı, toplam satırı yeni rakamı gösterir; bu beklenen durumdur ve hiçbir kriter bunu ihlal saymaz (R7, X7).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Hesap yok: toplam spec 0096'nın tek okuma yolundan geliyor, ekranda yeni toplama yazılmadı. Tarama ölçütü C1/2'de yazılı ve AC-26 ile ölçüldü; toplam ebeveynin tek `formMaliyeti` çağrısından prop olarak indi.
- [ ] Aynı sayıyı gösteren ikinci yer (liste hücresi) aynı kaynaktan okumaya devam ediyor (AC-20).
- [ ] Yeni kalıcı alan **yok**; dört nokta kuralı bu işte uygulanmıyor ve bu açıkça yazıldı.
- [ ] Yeni veri bölümü **yok**.
- [ ] Yeni eylem izni **yok**; iş salt çizimdir ve sunucu tarafı değişmedi, bu açıkça yazıldı.
- [ ] Soft-delete ve çöp kutusu ilişkisi değişmedi.
- [ ] Kullanıcıya görünen bütün metinler Türkçe; yazdırma çıktısı yok.
- [ ] Para gösterimi bugünkü biçimleyiciyle; kırılım TL olduğu için çoklu para birimi kuralı bu ekranda doğmuyor ve bu açıkça yazıldı (X3).
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi: kırılımlı kart (yetkili, `katalog-parca-0096-kirilim`), tutarsız kırılım (`katalog-parca-0096-tutarsiz`), hatalı satır (`katalog-parca-0096-hata`) ve üç **yeni** ekran: `katalog-parca-0099-yetkisiz` (`giderYetki: false`, `PARCA_0096`, adımlar `baslik:Düzenle` + `kaydir:Alış maliyeti`), `katalog-parca-0099-ekle` (`TED_0096` ile ekleme penceresi, iki tedarikçi satırı doldurulmuş) ve `katalog-parca-0099-elle` (kırılımsız, maliyeti dolu parçanın penceresi).
- [ ] `docs/evidence/kanit-eslemesi.json`'da `src/components/PartManager.jsx`'in üç kaydı (`katalog-parca-0096-kirilim`, `katalog-parca-0096-tutarsiz`, `katalog-parca-0096-hata`) `beklenen: "degisti"` + `onay` ile işaretlendi; kırılımsız beş ekran (`katalog-parca`, `katalog-parca-yeni`, `katalog-parca-0096-bos`, `katalog-parca-0097-gecmis`, `ayarlar-yedekparca-0096-yetkisiz`; plan onayı P7 ile `katalog-parca-0097-hata` da) **0 piksel** fark bekler ve raporla gösterildi; yeni `-yetkisiz` ve `-elle` ekranları spec öncesi kodla çekilen tabanlarına göre 0 piksel bekler (C3'ün görsel kanıtı).
- [ ] `docs/tasarim-sozlugu.md`'nin "Bilinen borç › Kapsam içindeki yakın kopyalar" listesine `src/components/PartManager.jsx` → hammadde toplam kutusu (gider formunun `normal-ozet` kutusunun yakın kopyası) satırı eklendi (R14).
- [ ] Karanlık tema işi doğmadı: kullanılan üç token `theme.js`'te tanımlı ve kontrast iki temada da AA üstü (ölçüm 14); `tasarim-kontrast`'ın 0030 bloğuna satır eklenmedi ve bu açıkça yazıldı.
- [ ] Ters çevrilen **altı** test yeri güncellendi ve her birine "spec 0099 ile" notu düşüldü: `hammadde-0096.test.jsx:11`, `:81`, `:82`, `:85`, `:215` ve `maliyet-gecmisi-0097.test.jsx:149`. `:85`'in beklentisi boş bırakılmadı, toplam satırının kaybolmasına çevrildi (AC-18).
- [ ] İki sabit adı değişti ve `kaynakKartMetni` silindi (C5/2, AC-28); `kaynakListeMetni` liste hücresinde aynen kaldı.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md`'nin spec 0096 bölümü toplamın yerini söyleyecek biçimde güncellendi.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## Ters çevrilen kriterler

| Eski kriter | Bugünkü hâli | Bu spec'ten sonra |
|---|---|---|
| 0096 AC-8 / AC-17 / AC-34 (`tests/ui/hammadde-0096.test.jsx:76`) | Kırılımlı kartta maliyet alanı pasif, altında rakamlı satır ve sayılı kaynak ibaresi | Alanın pasifliği ve kırılım boşalınca etkinleşmesi **korunur**; rakamlı satır yetkili kullanıcıda kalkar, rakam ve sayı toplam satırında aranır |
| 0096 triyaj bulgu 2 testinin yetkili yarısı (`tests/ui/hammadde-0096.test.jsx:215`) | Yetkili kullanıcıda kaynak ibaresi "3 tedarikçinin hammadde kırılımından geliyor" | İbare sayısızlaşır; sayı toplam satırında ölçülür |
| 0096 AC-8 / AC-17 / AC-34'ün "rakamlı satır kaybolur" yarısı (`tests/ui/hammadde-0096.test.jsx:85`) | Tutarlar boşaltılınca `maliyet-kirilimdan` yok | Aynı durum toplam satırının kaybolmasıyla ölçülür (AC-18); yetkili kullanıcıda `maliyet-kirilimdan` hiç çizilmediği için eski beklenti **silinir, boş bırakılmaz** (ölçüm 9/2) |
| 0096 testinin içe aktarma satırı (`tests/ui/hammadde-0096.test.jsx:11`) | `KAYNAK_KIRILIM_YETKISIZ` içe aktarılıyor | Ad `KAYNAK_KIRILIM` olur, değeri aynen kalır (C5/2) |
| 0096 triyaj bulgu 2 testinin yetkisiz yarısı (`:208-212`) | Yetkisiz kullanıcıda sayısız ibare ve hiçbir yerde "`n` tedarikçi" yok | **Korunur**, metin aynen (R8, AC-15, AC-16) |
| 0097 AC-40 / AC-5 (`tests/ui/maliyet-gecmisi-0097.test.jsx:149`) | Kırılımlı parçada rakamlı satırın varlığı aranıyor | Aynı durumu toplam satırının varlığıyla arar; testin asıl konusu (pasif alan yanında etkin tarih alanı) değişmez |
| 0096 AC-17'nin elle yarısı (`tests/ui/hammadde-0096.test.jsx:88`) | Elle girilmiş maliyette "Elle girildi" | **Korunur** (R10, AC-17) |
| 0096 AC-9 (kuruşlu toplam) | Toplam 17.001,00 ₺ | **Korunur**, yalnız okunduğu yer değişir (AC-7) |

---

## Plan onayı (revizyon 3, 2026-10-21)

Takım Yöneticisi uygulama planının on önerisini 2026-10-21'de onayladı. Spec'e işlenenler:

| # | Öneri | Nereye işlendi |
|---|---|---|
| P1 | Hata ibaresi canlıdır, bölümün var olan doğrulama sonucundan okunur | R16/2 |
| P2 | Geçerli tutarlı satır yokken R3 harfiyen: kutu ve ibare yok | R16/3 |
| P3 | İbare tutarın altında ayrı satır, hatalı durumda dört parçalı metin | R16/4 |
| P4 | AC-14 `.modal-backdrop` kabında ölçülür, `Modal`'a dokunulmaz | AC-14 |
| P5 | AC-21 yetkili kullanıcıda ölçülür; spec öncesi kodda da kırmızıysa 0096'nın davranışıdır, düzeltilmeden TY'ye getirilir | AC-21 (plan §3) |
| P6 | `katalog-parca-0099-elle` `PARCA_0087` ile ilk satırı (Rulman 6204, elle 120,5) açar ve `kaydir:Alış maliyeti` kullanır | DoD (plan §5) |
| P7 | `katalog-parca-0097-hata` (kırılımsız) de 0 piksel ölçüme katılır | DoD (plan §5) |
| P8 | `-ekle` ekranının adımları taban çekiminde görüntüyle doğrulanır (araç bulunamayan adımı yalnız uyarıyla geçer) | Plan §5 |
| P9 | Eşleme onayı `Takım Yöneticisi · 2026-10-21 · spec 0099 Karar 5` | DoD |
| P10 | Kutu tedarikçi satırlarıyla aynı tam genişlikte, `marginTop: 8`; parçalar ayrı `span`, aralarında metin düğümü yok | R4/3, Karar 5 (plan §4) |

---

## Karar kaydı (QA turu 2026-10-21)

| # | Bulgu | Derece | Karar | Nereye işlendi |
|---|---|---|---|---|
| B-1 | AC-14 ölçülemez ve AC-22 ile çelişiyor: liste hücresi pencere açıkken ekranda "3 tedarikçiden" yazıyor | Bloklayıcı | Sayım açık pencerenin kabına daraltıldı | R9, C6, AC-14, Karar 7, ölçüm 10 |
| B-2 | Toplam satırının kimliği ve bileşik metni yok, C5 birebir karşılaştırma istiyor | Bloklayıcı | Kimlik, üç metin sabiti ve ayraçsız sıra yazıldı | R4, R4/2, R4/3, R4/4, C5, AC-3, AC-27, Karar 9 |
| B-3 | Ölçüm 9 eksik: `:85` kendiliğinden yeşil kalacak, `:11` beşinci yer | Bloklayıcı | Dokunulacak yer altıya çıktı, `:85`'in beklentisi çevrildi | Ölçüm 9, ölçüm 9/2, DoD, ters çevrilen kriterler |
| Ö-1 | "Rakam ekranda bir kez" cümlesi maliyet geçmişi bloğu yüzünden yanlış (X7 ile çelişiyor) | Önemli | Cümle toplamla sınırlandı, geçmiş açıkça dışarıda | R7, Karar 3, AC-29 |
| Ö-2 | Doğrulama hatası olan satırda toplamın ne gösterdiği tanımsız | Önemli | Hatalı satır sayılmaz, toplam satırında rakamsız ibare | R15, R16, AC-23, AC-24, AC-25, Karar 8, ölçüm 11 |
| Ö-3 | Toplamın değeri nereden geliyor belirsiz, tarama ölçütü yok | Önemli | Tek çağrı, prop ile iner; tarama ölçütü yazıldı | C1/2, AC-26, DoD |
| Ö-4 | `normal-ozet` sözlükte yok, sözlük form bölümünü kartla çevrelemeyi yasaklıyor | Önemli | Görünüm korunur, kopya bilinen borca kaydedilir | R14, DoD, ölçüm 13 |
| Ö-5 | `kanit-eslemesi.json` DoD'de yok, üç kayıt değişecek | Önemli | Üç kayıt "degisti" + onay, beş ekran 0 piksel | DoD, ölçüm 13, başlık tablosu |
| Ö-6 | İstenen beş kanıt ekranından ikisi `0009-sayfa.jsx`'te yok | Önemli | Üç yeni ekran adı yazıldı | DoD, ölçüm 12, Karar 10 |
| Ö-7 | AC-21'in ölçme yöntemi yazılı değil | Önemli | 0096 AC-6 deseni, yeni altın dosya yok | AC-21 |
| K-1 | "`n` tedarikçi" tutarsız kırılımda yanıltıcı | Küçük | İbare "tutarı girilen `n` tedarikçi" oldu | R4, R4/2, AC-3, AC-4, AC-10/2 |
| K-2 | R2 "tedarikçi eklendikçe" diyor ama boş satır toplamı kıpırdatmaz | Küçük | R2 "tutar girildikçe ya da değiştikçe" oldu | R2, AC-4 |
| K-3 | Karar 6 yeni adı vermiyor, `kaynakKartMetni` sahipsiz kalıyor | Küçük | `KAYNAK_KIRILIM` adı yazıldı, `kaynakKartMetni` silinir | C5/2, Karar 6, AC-28 |
| K-4 | R4 biçimleyiciyi adıyla söylemiyor | Küçük | `maliyetMetniKurus` adıyla yazıldı | R4 |
| K-5 | Tek tedarikçili parça hiçbir kriterde yok | Küçük | n = 1 kriteri eklendi | R4/2, AC-7/2 |
| K-6 | İki atıf kayması (`GiderForm.jsx` yolu, `urunAgaci.js:31-36`) | Küçük | İkisi düzeltildi | Karar 5, ölçüm 8, R14 |
| K-7 | Karar 5'in mavi tutarı emsalin kendisinde yok | Küçük | Birleşimin bilinçli olduğu ve ölçülen kontrast yazıldı | Karar 5, ölçüm 14, DoD |

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
