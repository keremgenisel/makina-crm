# 0140 — Tedarikçi odaklı, düzenlenebilir sipariş listesi

| | |
|---|---|
| **Durum** | Onaylandı, revizyon 2 (Takım Yöneticisi, 2026-11-09; plan onayı, kararlar 33–47) |
| **Sahip** | Analist |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Ayarlar › Katalog › Parça/Yedek Parça ve Stok › Parça/Yedek Parça Stoğu (yeni pencere, iki giriş noktası), Makina Maliyeti (Sipariş İhtiyacı görünümü kalkar), parça kartı (yeni alan ve tedarikçi süzgeci), saf motor `siparisIhtiyaci.js`, yazdırma `siparisRaporu.js` ve `rapor/` altındaki düğme, izin tanımları (`serverPermissionDefs.js`, `UserManager.jsx`), `src/lib/kilitAlanlari.js`, `src/lib/merge.js`, `electron/db.cjs`, `App.jsx` prop zinciri, `Stock.jsx` ve `stock/PartStokTab.jsx`, `src/lib/gider.js` (tedarikçi koruma), `settings/SettingsTrash.jsx`, `gider/Tedarikciler.jsx`, `uretimdekiModeller` taramaları ve `URETIM_ISARETI_IPUCU`, `docs/evidence/kanit-eslemesi.json`, `docs/tasarim-sozlugu.md` |
| **Bağımlı spec'ler** | 0134 (sipariş ihtiyacı motoru), 0087 (parça kataloğu ve kit), 0132 (malzeme ve Ana tedarikçi), 0096 (hammadde işareti ve tedarikçi koruma), 0135 (maliyet kalemleri), 0088 (ekranın bugünkü yeri ve X4 taraması), 0091 ve 0093 ve 0105 (üretimde işareti), 0123 (ad listesi emsali), 0064 (kilit listesi), 0050 (pencere boyutu), 0138 ve 0139 (önce uygulanır) |
| **QA turu** | 2026-11-09, 32 bulgu (5 Bloklayıcı / 15 Önemli / 12 Küçük); hepsi Takım Yöneticisi tarafından onaylandı ve spec'e işlendi |
| **Düzeltilen iddialar** | 4 (Context'in çıktı anahtarları, Intent'in "listeye hiç girmiyor" ifadesi, Stok alt sekmesinin adı, "tedarikçisi belirtilmemiş" bölümünün metni) |

---

## Intent

Satın almayı yapan kişi bugün sipariş listesini Makina Maliyeti sekmesinde, salt okunur bir
rapor olarak görüyor. O rapor "bu parti için ne gerekiyor" sorusunu malzeme kesiti ve kilo
üzerinden cevaplıyor, ama satın almacının sorduğu soru farklı: "bu firmaya ne sipariş
edeceğim". Listeyi eline alıp bazı satırların adedini değiştirmek, bazılarına bu ay hiç sipariş
vermemek ve kalanı tedarikçiye verilecek bir kâğıt olarak basmak istiyor.

Ayrıca listenin yeri yanlış: parça kataloğunda çalışırken sipariş listesine bakmak için başka
bir sekmeye geçmek gerekiyor, ve hazır alınan parçalar (rulman, motor, redüktör gibi, yani
malzemesi girilmemiş parçalar) **tedarikçi gruplamasına hiç girmiyor**, çünkü tedarikçi bağı
yalnız malzeme kartı üzerinden kuruluyor. Bu parçalar bugünkü "Parça ihtiyacı" tablosunda
sipariş adetleriyle görünüyor; eksik olan, o adedin hangi firmaya sipariş edileceği
(QA turu, K5 ve K2).

Bu iş bittiğinde satın almacı parça kataloğunun içinden tedarikçi seçer, o firmadan alınacak
hazır parçaları ve malzemeleri bir arada görür, adetleri düzeltir, istemediği satırları kapatır
ve tedarikçiye verilecek belgeyi basar.

---

## Requirements

### A. Parçanın Ana tedarikçisi

- **A-R1.** Parça kartında **Ana tedarikçi** alanı bulunur: isteğe bağlı, tek tedarikçi.
  Malzeme kartındaki Ana tedarikçi alanının ikizidir ve hammadde işaretli tedarikçiler listede
  başta gelir.
- **A-R1/2.** Alanın kalıcı adı `parts.tedarikciId`'dir, yani malzeme kartının alanının ikizi.
  Parçanın maliyet kalemlerinin içindeki `maliyetKalemleri[].tedarikciId` ile karışmaz: biri kök
  alan, öteki kalemin alanıdır (QA turu, K5).
- **A-R2.** Alan **yalnız gider yetkisi** olan kullanıcıya çizilir (malzeme kartındaki Ana
  tedarikçi alanının bugünkü kuralı). Yetkisi olmayan kullanıcı alanı görmez ve kaydettiğinde
  var olan bağ korunur.
- **A-R3.** Alan parçanın maliyetine, satış fiyatına ve hiçbir hesaba girmez. Yalnız sipariş
  listesinin gruplamasında ve tedarikçi silme korumasında okunur.
- **A-R4.** Bir parçanın Ana tedarikçisi, malzeme kaleminin malzemesinin tedarikçisinden ve
  işlem kaleminin tedarikçisinden **ayrı** bir bilgidir; biri diğerinden türetilmez.
- **A-R5.** Ana tedarikçisi bir parçada (çöpteki parça dâhil) geçen tedarikçi **kalıcı silinmez**;
  üç kalıcı silme kapısı (Çöp Kutusu'nun Kalıcı Sil'i, "çöpü boşalt", otuz günlük temizlik) bu
  bağı da okur. Bağ **çöpe atmayı engellemez**: Tedarikler ekranının "silinemez" penceresi bu bağ
  yüzünden açılmaz. Sayım `gider.kalemdeGecenTedarikciler` haritasına ayrı alanla eklenir
  (`ana`, `anaCop`; 0137'nin `islem` ve `islemCop` emsali) ve Tedarikler ekranının kullanım
  hücresi sayıyı yazar (QA turu, Ö5).
- **A-R5/2.** Aynı turda **malzemenin** Ana tedarikçisi de korunur: bugün `malzemeler[].tedarikciId`
  hiçbir silme kapısında okunmuyor ve aynı adla duran iki bağın biri korunup biri korunmazsa fark
  kullanıcıya açıklanamaz. Koruma tek yardımcıya `malzemeler` parametresiyle eklenir (QA turu, Ö6).
- **A-R5/3.** *(Revizyon 2, karar 35: kalem bağı yoksa ret ve neden için iki yeni sabit cümle: `ANA_TEDARIKCI_NEDENI` ve
  `MALZEME_TEDARIKCI_NEDENI`; seçici kalem > Ana > malzeme sırasıyla. Bildirimde ad yazılmaz. "Silinemez" penceresi kalem bağlı
  parçaların adlarını, Çöp Kutusu satırı bütün koruyan parçaların adlarını yazar.)* Ret metni **sabit cümle kalır** (`KALEMDE_TEDARIKCI_NEDENI` dokunulmaz); parça adları
  Tedarikler'in "silinemez" penceresinde ve Çöp Kutusu satırının nedeninde en çok üç ad artı
  "ve n parça daha" biçiminde yazılır (0123'ün `setKullanimAdlari` emsali). Çöpteki parçanın adı
  "(silinmiş parça)" ekiyle görünür (QA turu, Ö7).

#### QA turunda eklenen maddeler (2026-11-09)

- **A-R6.** Ayarlar › Katalog › Parça/Yedek Parça'nın **tedarikçi süzgeci** Ana tedarikçiyi de
  okur: bir firma seçilince o firmanın maliyet kaleminde **ya da** Ana tedarikçi alanında geçtiği
  parçalar listelenir, "girilmemiş" ölçütü ikisinin de boş olmasıdır ve seçenek sayıları buna göre
  hesaplanır. Bugün süzgeç yalnız `kalemTedarikciIdleri`'ni okuyor, yani satın almacı eksik Ana
  tedarikçileri kataloğu süzerek dolduramaz (QA turu, Ö8).

### B. Ekranın yeri ve kapısı

- **B-R1.** Sipariş listesi Ayarlar › Katalog › **Parça/Yedek Parça** panelinin başlığından
  açılan bir pencereye taşınır.
- **B-R1/2.** Pencere **tek dosyadır** ve iki giriş noktası aynı bileşeni çizer:
  `src/components/stock/SiparisPenceresi.jsx` (iki girişin ortak yeri; `maliyet/` altında kalsaydı
  0088 X4'ün yazdırma taraması kırılırdı). Yazdırma düğmesi `src/components/rapor/` altında kalır
  (0134 R20/2 ve 0047'nin `GiderKasaRaporuDugmesi` emsali). Pencere `wide` açılır (0050 Sınıf 1:
  veri girilen pencere) ve `kilitAlanlari.KILITSIZ_DOSYALAR`'a gerekçesiyle eklenir (QA turu, Ö15).
- **B-R2.** Makina Maliyeti'ndeki **Sipariş İhtiyacı görünümü kalkar**; görünüm sayısı beşten
  dörde iner. Liste iki yerde durmaz.
- **B-R2/2.** Görünüm kalkınca 0134'ün dosya yoluna ve sekme sayısına bağlı dört bekçisi birlikte
  güncellenir: `tests/maliyet-yerlesim.test.js` (Electron; bugün "beş sekmeli çubuk tek satırda"
  diye AC-1, AC-89 ve AC-100'ü ölçüyor, dört sekmeyle ölçmeye devam eder),
  `tests/ui/makina-maliyeti-0088.test.jsx`'in beş etiketli sıra iddiası,
  `tests/siparis-0134.test.js`'in AC-61 ve AC-88 taramaları (ekranın dosya yolunu okur),
  `src/lib/kilitAlanlari.js`'in `KILITSIZ_DOSYALAR` kaydı ve `docs/evidence/kanit-eslemesi.json`'un
  dosya yolu anahtarı. Ters çevrilen 0134 kriterleri listelenir ve testlerine "spec 0140 ile" notu
  düşülür (QA turu, Ö14).
- **B-R3.** Düğme ve pencere `stockActions` boyutunda **yeni bir eylem kimliğine** bağlıdır.
  İzin tanımsızken (yönetici, yerel kip, sunucu PC, özelleştirilmemiş kullanıcı) açıktır, yani
  bugünkü kullanıcılar için hiçbir şey değişmez; isteyen yönetici kısıtlayabilir.
- **B-R4.** Pencerede **para** gösteren sütunlar (birim fiyat, satır tutarı, toplam) yalnız
  gider yetkisi olan kullanıcıya çizilir. Adet, kilo ve boy adedi herkese çizilir. Yazdırılan
  belge de aynı kurala uyar.
- **B-R4/2.** Tedarikçi dizisi (canlı ve ham) pencereye **gider yetkisinden bağımsız** iner: App
  Stok'a `tedarikciler` ve `rawTedarikciler` prop'larını ekler, Ayarlar pencereye ham diziyi
  kapısız geçirir. Bugün Ayarlar panellere `giderYetki ? tedarikciler : []` veriyor ve Stok'a
  tedarikçi dizisi hiç gitmiyor; kapı aynen kalsaydı yetkisiz kullanıcıda bütün gruplar "kaydı
  bulunamayan tedarikçi" olur ve ekran B-R4'ün söz verdiği işi yapmazdı. Gider yetkisi yalnız para
  sütunlarını kapatır (QA turu, B4).
- **B-R5.** Pencere hiçbir veri bölümüne yazmaz ve kilit almaz.
- **B-R6.** **Aynı pencere Stok › Parça/Yedek Parça Stoğu başlığından da açılır** (alt sekmenin
  ekrandaki adı budur, QA turu K3). Tek pencere, iki giriş noktası; ikisi de aynı eylem kimliğine
  bağlıdır ve aynı içeriği gösterir. Parti seçicisi iki girişte de yalnız **canlı** partileri
  listeler (Ayarlar bugün ham diziyi taşıyor). Gerekçe: katalog paneli açıkken o kullanıcı panelin
  kilidini tutar ve başka kullanıcı kataloğu düzenleyemez; Stok'tan açan satın almacı bu kilidi
  almaz.

#### QA turunda eklenen maddeler (2026-11-09)

- **B-R7.** Model seçicisinin listesi **üretim işaretini doğrudan okur**:
  `uretimdeSuzulmusModeller(appSettings, katalogModelleri)` (0105'in müşteri formu emsali).
  Bugünkü kaynak, yani model maliyeti satırlarının `uretimde` alanı, Makina Maliyeti'nin ağır
  hesap zincirinden geliyor ve Ayarlar ile Stok ekranlarında yok; o zinciri orada koşturmak gider
  verisini yetkisiz kullanıcıya açardı (B-R4, C5). Satırın kendi modeli işaretten çıkmış olsa da
  listede korunur (bugünkü kural). Pencerenin dosyası işareti okuyan adların `izinli` kümesine
  eklenir ve `URETIM_ISARETI_IPUCU` metni yeni yeri sayar (QA turu, B1).

### C. Tedarikçi odaklı çıktı

- **C-R1.** Pencerenin girdisi bugünkü girdidir: bir üretim partisi ya da elle girilen model ve
  makina adedi satırları. Bu kısım değişmez.
- **C-R2.** Girdinin yanında **tedarikçi seçici** bulunur: boş bırakılırsa bütün tedarikçiler,
  seçilirse yalnız seçilenler listelenir. Birden çok tedarikçi seçilebilir.
- **C-R2/2.** *(Revizyon 2, karar 37: bileşen `tasarim.jsx`'te `CokluSecim` olarak tek tanımdır.)* Çoklu seçim için uygulamada bileşen yok: `ui.jsx`'te çoklu seçim bileşeni, sözlükte
  de çoklu seçim maddesi yok, `SearchPick` tek seçim ve `Segment` otuz bir seçenek için uygun
  değil. Seçici **arama kutulu onay kutusu listesi** olur; yanında "Tümünü seç" ve "Temizle",
  altında seçilenlerin pil özeti durur. Desen `docs/tasarim-sozlugu.md`'ye "çoklu seçim listesi"
  maddesiyle yazılır, bu ilk kullanımdır (QA turu, Ö9).
- **C-R3.** Seçicide yalnız **hammadde işaretli** tedarikçiler ve Ana tedarikçisi en az bir
  parçada ya da malzemede geçen tedarikçiler listelenir; kargo, elektrik, kira gibi tedarikçiler
  listeye girmez. Süzmenin nedeni ekranda yazılıdır.
- **C-R3/2.** Seçicide **çöpteki tedarikçi yoktur**. Çöpteki firmanın satırları "bütün
  tedarikçiler" görünümünde C-R9'un durum işaretiyle görünür, ama o firmanın kendi belgesi
  basılamaz ve nedeni satırda yazar (QA turu, K7).
- **C-R4.** Çıktı tedarikçi tedarikçi bölümlenir. Her tedarikçinin iki alt bölümü vardır:
  **Hazır parçalar** (adet) ve **Malzemeler** (kilo ya da boy adedi). Boş olan alt bölüm
  çizilmez.
- **C-R4/2.** Seçilmiş ama bu girdide satırı olmayan tedarikçinin **bölümü çizilmez**; seçimin
  altında "seçilen n firmanın m tanesinde satır yok" cümlesi yazar (QA turu, K6).
- **C-R5.** Hazır parça satırı, Ana tedarikçisi o firma olan ve sipariş adedi sıfırdan büyük
  her parçadır. Satır parçanın adını, ihtiyacı, eldeki stoğu ve sipariş adedini gösterir.
- **C-R5/2.** Hazır parça satırının **tutarı yalnız malzeme kalemi olmayan** parçada yazılır
  (bugünkü "malzemeli" ölçütü). Malzeme kalemli parçanın tutar hücresi `—` ve nedeni "malzemesi
  aşağıda" olur; yoksa parçanın maliyeti malzemesinin kilo tutarını zaten içerdiği için aynı
  malzeme hem parça satırında hem malzeme bölümünde ikinci kez toplanırdı. Tedarikçi toplamı hazır
  parça tutarları ile malzeme tutarlarının toplamıdır (QA turu, B3).
- **C-R6.** Malzeme satırları bugünkü kesit satırlarıdır ve bugünkü hesabı korur: kesit, net
  kilo, fire, sipariş kilosu, boy adedi, asgari sipariş farkı ve tutar.
- **C-R7.** Ana tedarikçisi girilmemiş parçalar ve tedarikçisi girilmemiş malzemeler
  **"tedarikçisi belirtilmemiş"** bölümünde, en sonda listelenir ve sayısı başlıkta yazar.
- **C-R7/2.** *(Revizyon 2, karar 33: bölümde yalnız **malzemesiz** (hazır) parçaların ve tedarikçisi girilmemiş
  malzemelerin satırı vardır; Ana tedarikçisi olmayan malzemeli parçalar satır açmaz, bölüm başlığının altında tek cümleyle
  sayılır, çünkü satın alınacak şeyleri malzemeleridir ve o kendi tedarikçisinin altında çıkar.)* Bu bölüm varsayılan **kapalıdır** (katlanmış, başlıkta sayı) ve **belgeye girmez**,
  çünkü tedarikçiye verilecek bir kâğıt değildir. Ekranda "Ana tedarikçi girilmemiş n parça"
  cümlesi kataloğa yönlendirir. Gerekçe ölçülmüştür: 0139'un içe aktarması parçaya tedarikçi
  yazmıyor, yani içe aktarılacak doksan bir parçanın hiçbirinde Ana tedarikçi olmayacak ve bölüm
  ilk gün üç yüz satırlık bir duvar olurdu. Bölümün başlığı malzemeyi ve parçayı birlikte kapsayan
  tek yeni cümledir; motorun bugünkü `TEDARIKCISIZ` sabiti ("Ana tedarikçisi girilmemiş
  malzemeler") C-R11'in parametresiz çağrısı için aynen durur (QA turu, Ö10 ve K4).
- **C-R8.** Bir parça hem Ana tedarikçisi hem malzemesinin tedarikçisi üzerinden iki ayrı
  firmaya düşebilir: hazır parça satırı Ana tedarikçide, malzemesi malzemenin tedarikçisinde
  görünür. Bu çift sayım değildir ve ekranda açıklanır.
- **C-R9.** Çöpteki ya da bulunamayan tedarikçinin satırları kaybolmaz; adının yanında
  durumuyla görünür (bugünkü kural).

#### QA turunda eklenen maddeler (2026-11-09)

- **C-R10.** *(Revizyon 2, karar 34: tablonun **set satırları** düzenlenebilir (adet ve kapatma, D-R4/2); patlatılan set
  tedarikçi bölümünde satır açmaz, patlatılmayan set kendi Ana tedarikçisiyle hazır parça gibi davranır.)* Bugünkü **"Parça ihtiyacı" tablosu ekranda kalır**: katlanabilir bir bölüm olarak,
  bütün parçalarla (sipariş adedi sıfır olanlar dâhil), ham ihtiyaç, emniyet payı, ihtiyaç, stok
  ve sipariş sütunlarıyla, düzenlenemez. Tedarikçi bölümleri onun üstünde durur. Belgede yalnız
  MODELLER kutusu ve tedarikçi bölümleri basılır, PARÇA İHTİYACI tablosu belgeden çıkar. Gerekçe:
  AC-28'in "stok yetiyor" nedeni ve C-R5'in "sipariş adedi sıfırdan büyük" ölçütü ancak tam
  tabloyla doğrulanabilir, tedarikçiye verilecek kâğıtta ise iç stok ve plan ayrıntısı istenmez
  (QA turu, B5).
- **C-R11.** Tedarikçi odaklı çıktı motora **opt-in** bir seçenekle eklenir:
  `siparisIhtiyaci(veri, { tedarikciOdakli: true })` yeni `tedarikciBolumleri` alanını döndürür;
  bugünkü beş alan (`parcalar`, `kesitler`, `malzemeGruplari`, `tedarikciGruplari`, `toplamTLK`) ve
  `TEDARIKCISIZ` metni dokunulmaz. Emsal 0092'nin `aylikPay` seçeneği ve 0084'ün üçüncü
  parametresidir. Kıyas altını parametresiz çağrıyla ölçülür (QA turu, Ö13).
- **C-R12.** Boş durumların üç nedeni (kit boş, stok yetiyor, tedarikçi seçimi sonucu boş) metin
  sabiti olarak `src/lib/siparisIhtiyaci.js`'te durur (bugünkü `KIT_BOS_METNI` ve
  `MALZEME_KALEMI_YOK_METNI` emsali); ekran metin yazmaz (QA turu, K8).

### D. Düzenlenebilirlik

- **D-R1.** Hazır parça satırının sipariş adedi düzenlenebilir. Boş bırakılan ya da sıfır
  yazılan satır **sipariş edilmez**.
- **D-R1/2.** Sipariş adedi **0 ile 1.000.000 arası tam sayıdır**; sıfır geçerlidir (D-R1) ve boş
  alan sıfır sayılır. "Belirsiz yazılmış sayı" kuralı (tek noktalı, noktadan sonra üç ve daha çok
  haneli yazım) tam sayıda anlamsızdır ve yalnız **elle kilo** alanına uygulanır; AC-39 oraya
  taşınır (QA turu, Ö4).
- **D-R2.** Her satırın yanında satırı kapatan bir anahtar bulunur. Kapatılan satır belgede
  basılmaz ve toplama girmez.
- **D-R2/2.** Ekranda iki sütun durur: salt okunur **"Sipariş (öneri)"** ve düzenlenebilir
  **"Sipariş adedi"**; düzenlenen satır işaretlenir (E-R5'in belgedeki işaretinin ikizi).
  Gerekçe: satın almacı kendi kararını öneriyle karşılaştırmadan doğrulayamaz ve D-R8'in sayısı da
  bu karşılaştırmadan türer (QA turu, Ö3).
- **D-R3.** Malzeme satırının **sipariş kilosu** (boy yönteminde boy adedi) düzenlenebilir ve
  kapatılabilir.
- **D-R3/2.** Malzeme tarafının düzenlemesi de motora girdidir: **kesit anahtarı başına**
  `{ siparisKg ya da boyAdedi, kapali }`. Anahtar adede bağlı olmadığı için (malzeme, yöntem,
  biçim ve ham kesit) adet değişince kaymaz. Elle kilo girilince sipariş kilosu o değer olur,
  asgari sipariş farkı uygulanmaz ama değer asgarinin altındaysa uyarı yazar, boy adedi `—` ve
  nedeni görünür, artan kilo `—` olur, tutar elle kilo ile bugünkü fiyatın çarpımıdır
  (QA turu, Ö1).
- **D-R4.** Bir hazır parçanın adedi değiştirildiğinde ya da satırı kapatıldığında **o parçanın
  malzeme ihtiyacı yeniden hesaplanır**: kapatılan parçanın malzemesi listeden düşer, adedi
  azaltılan parçanın malzeme kilosu azalır. Aksi hâlde kullanıcı parçayı listeden çıkarır ama
  malzemesini yine sipariş eder.
- **D-R4/2.** Yeniden hesabın **sırası** şudur: (1) bugünkü hesap, (2) set satırlarının düzenlemesi
  uygulanır, (3) patlatma düzenlenmiş set adediyle yeniden yapılır, (4) bileşenlerin ihtiyacı ve
  siparişi yeniden hesaplanır, (5) parça düzenlemeleri uygulanır, (6) malzeme kesitleri son sipariş
  adetlerinden doğar. Kapatılan set hiç patlatılmaz. Gerekçe: sıra yazılmazsa setin satırını
  kapatan kullanıcı bileşenlerini ve onların malzemesini yine sipariş eder, yani D-R4'ün kapattığı
  hata setin içinde yeniden doğar (QA turu, B2).
- **D-R5.** Elle yazılmış malzeme kilosu, parça adedi değişse de **korunur**: kullanıcının
  yazdığı değer yeniden hesapla ezilmez ve satırda elle girildiği belli olur.
- **D-R5/2.** Elle kilosu yazılmış kesit satırı, o kesitin **bütün parçaları kapatılsa da**
  listede ve belgede kalır; satırda "parçaları kapatıldı, kilo elle girildi" işareti durur ve
  kullanıcı satırı kendi kapatabilir. Gerekçe: "bu çubuğu zaten alacağım" kararı kullanıcınındır,
  satırın sessizce kaybolması D-R5'i boşa çıkarır (QA turu, Ö2).
- **D-R6.** *(Revizyon 2, karar 36: parti ya da model satırları değişince düzenlemeler korunur; artık görünmeyen anahtarın
  düzenlemesi etkisiz kalır ve sayılmaz.)* Düzenlemeler **geçicidir**: pencere kapanınca kaybolur, hiçbir yere kaydedilmez ve
  başka kullanıcıya gitmez. Ekranda bu yazılıdır.
- **D-R7.** "Önerilere dön" düğmesi bütün düzenlemeleri bir adımda geri alır.
- **D-R8.** Düzenlenmiş satır sayısı ve kapatılmış satır sayısı başlıkta görünür.
- **D-R8/2.** Başlıktaki iki sayı parça ve malzeme satırlarını **birlikte** sayar ve tek cümlede
  durur ("3 satır düzenlendi · 2 satır kapatıldı") (QA turu, K10).
- **D-R9.** Geçersiz adet (negatif, sayı olmayan, belirsiz yazılmış) satırın altında nedeniyle
  reddedilir ve belge basılamaz.

### E. Yazdırma

- **E-R1.** Belge **tedarikçi başına** basılır: seçili tedarikçinin satırları, kapatılmamış ve
  adedi sıfırdan büyük olanlar.
- **E-R2.** Belgenin başlığında firma bilgisi, tedarikçi adı, tarih ve girdinin ne olduğu
  (parti adı ya da model ve adet satırları) yazar.
- **E-R3.** Belge iki tablo taşır: hazır parçalar (parça, ihtiyaç, stok, sipariş adedi) ve
  malzemeler (malzeme, kesit, sipariş kilosu ya da boy adedi). Boş tablo basılmaz.
- **E-R3/2.** Belgenin sütunları **tek yerde** yazılıdır: hazır parça tablosu (Parça, İhtiyaç,
  Stok, Sipariş adedi, *Birim maliyet*, *Tutar*), malzeme tablosu (Malzeme, Kesit, Sipariş kg ya da
  Boy, *Birim fiyat*, *Tutar*). Eğik yazılan sütunlar yalnız gider yetkisi olan kullanıcının
  belgesinde basılır (E-R4). AC-44 ve AC-45 bu listeye göre okunur; E-R3'ün dört ve üç sütunlu
  sayımı bu maddeyle değişti (QA turu, Ö11).
- **E-R3/3.** İhtiyaç ve stok sütunları belgede kalır, çünkü bu belge **iç kullanım için de**
  basılır. Takım Yöneticisi isterse bu iki sütun da gider yetkisine bağlanır; kapsam bu kararı
  açık bırakır (QA turu, K9).
- **E-R4.** Para sütunları yalnız gider yetkisi olan kullanıcının belgesinde basılır.
- **E-R5.** Elle düzenlenmiş satır belgede işaretlidir.
- **E-R6.** Belge yalnız Türkçedir.
- **E-R7.** Hiç basılacak satır yoksa düğme pasiftir ve nedeni yanında yazar.
- **E-R8.** "Bütün tedarikçiler" seçiliyse her tedarikçi için ayrı sayfa basılır.
- **E-R8/2.** Çıktı her zaman **tek belgedir**: tedarikçi başına bir bölüm ve ilki hariç her
  bölümün üstünde sayfa sonu (`page-break-before`, stil `raporSunumu.belgeAcilis`'in `ekStil`
  parametresiyle verilir; sunum modülünde sayfa sonu yardımcısı yok). Başlık bandı bir kez basılır,
  her bölümün üstünde tedarikçi adı ile girdinin özeti durur. İki tedarikçi seçimi ile "bütün
  tedarikçiler" arasında biçim farkı yoktur (QA turu, Ö12).

---

## Constraints

### Uyulması zorunlu

- **C1.** Hesap saf motorda kalır. Düzenleme motora **girdi** olarak verilir: parça başına adet ve
  kapalılık, **kesit anahtarı başına** sipariş kilosu (ya da boy adedi) ve kapalılık (D-R3/2);
  ekran adet aritmetiği, kilo hesabı ya da yeniden gruplama yazmaz.
- **C2.** Düzenleme girdisi ve `tedarikciOdakli` seçeneği verilmeyen çağrıda motorun çıktısı
  **birebir bugünküyle aynı** olmalıdır: bugünkü beş alan ve `TEDARIKCISIZ` metni değişmez
  (C-R11). Kıyas altını spec öncesi koddan üretilir.
- **C3.** Sipariş adedinin tek hesabı korunur: ihtiyaç (emniyet paylı, yukarı yuvarlanmış)
  eksi eldeki stok, sıfırın altına inmez. Düzenleme bu hesabı değiştirmez, sonucunu geçersiz
  kılar.
- **C4.** Pencere salt okunurdur: hiçbir veri bölümüne yazmaz, kilit almaz, işlem geçmişine
  kayıt düşmez.
- **C5.** Para gizliliği: gider yetkisi olmayan kullanıcı hiçbir fiyat, tutar ve toplam görmez,
  ne ekranda ne belgede. Tedarikçi adı ve adet gizli bilgi **değildir**, bu yüzden tedarikçi
  dizisi pencereye kapısız iner (B-R4/2) ve gizlilik yalnız çizim katmanında uygulanır; ölçüm
  kaynak taramasıyla değil, yetkisiz kullanıcının ekranı ve belgesiyle yapılır (AC-15, AC-16).
- **C6.** Parçanın Ana tedarikçisi yeni kalıcı alandır ve dört nokta kuralına uyar; boş değer
  gövdeye yazılmaz.
- **C7.** Yeni alan birleştirmede tedarikçinin yeniden atanan kimliğini izler.
- **C8.** Ekranın adı ve yeri Takım Yöneticisi kararıdır; kapsam bu kararı tartışmaya açmaz.
- **C9.** Üretim işaretini okuyan adların `izinli` kümesi iki taramada birlikte güncellenir
  (`tests/uretimdeki-modeller-0091.test.js` ve `tests/plan-adetler-0093.test.js`); pencerenin
  dosyası kümeye eklenmezse tarama kırılır, kümeye yazılmadan okunursa işaret ikinci bir yoldan
  okunmuş olur (B-R7).

### KAPSAM DIŞI

- **X1.** Sipariş **kaydedilmez** — *neden:* Takım Yöneticisi kararı (2026-11-09). Verilen
  siparişin takibi (teslim alındı mı, kalan ne), tedarikçi ekstresiyle bağ ve sipariş geçmişi
  ayrı bir spec'in işidir ve yeni bir veri bölümü, izin, çöp kutusu ve birleştirme kuralı
  gerektirir.
- **X2.** Stok seviyesine göre sipariş önerisi (emniyet stoku, yeniden sipariş noktası)
  eklenmez — *neden:* girdi bir üretim planıdır, stok tazeleme ayrı bir soru.
- **X3.** Tedarikçiye e-posta gönderme eklenmez — *neden:* belge yazdırılır; e-posta şablonu,
  gönderim kaydı ve hata yolu ayrı iştir.
- **X4.** Parçaya ikinci ya da alternatif tedarikçi eklenmez — *neden:* tek Ana tedarikçi
  malzeme kartının bugünkü modelidir; alternatif tedarikçi fiyat karşılaştırması demek olur.
- **X5.** Malzeme kesiti hesabı, asgari sipariş, emniyet payı ve boy yöntemi değişmez — *neden:* 0134'ün kuralları doğru çalışıyor; bu iş yalnız çıktının biçimini ve düzenlenebilirliğini değiştirir.
- **X6.** Sipariş listesi genel aramaya eklenmez — *neden:* kalıcı kaydı yok, aranacak bir
  şey yok.
- **X7.** Hazır parçaya birim fiyat alanı eklenmez — *neden:* parçanın alış maliyeti elle
  maliyet ya da kalem listesinden geliyor; ikinci bir fiyat alanı iki doğruluk kaynağı demek
  olur. Belgede hazır parçanın tutarı parçanın bugünkü maliyetinden okunur.
- **X8.** Kalkan görünümün derin bağı korunmaz — *neden:* bilinmeyen görünüm değeri bugün sessizce Model Maliyetleri'ni açıyor (`gecerliGorunum`) ve genel aramanın parti sonucu bu görünüme gitmiyor; bilinen sınır olarak yazılır (QA turu, K11).

---

## Context

### Bugünkü davranış, ölçülmüş

Motor bugün şunu üretiyor (anahtar adları QA turunda düzeltildi: `parcaSatirlari` ve
`kesitSatirlari` motorun içindeki yerel değişken adlarıdır, çıktı anahtarları `parcalar` ve
`kesitler`; QA turu K1):

| Çıktı | Ne |
|---|---|
| `parcalar` | **Her parça için** `{ ad, ham, pay, ihtiyac, stok, siparis, malzemeli, set, kaynaklar }` |
| `kesitler` | Yalnız **malzeme kalemi olan** parçalardan; kesit başına net kilo, fire, sipariş kilosu, boy adedi, tutar |
| `malzemeGruplari` | Kesitlerin malzeme başına toplamı |
| `tedarikciGruplari` | Malzemenin `tedarikciId`'sine göre; adı canlı diziden, yoksa ham diziden "silinmiş" işaretiyle |
| `toplamTLK` | Tedarikçi gruplarının toplamı |

Yani **parça başına sipariş adedi zaten hesaplanıyor** (`siparis` = ihtiyaç − stok, sıfırın
altına inmez) ve emniyet payı da uygulanıyor. Eksik olan üç şey:

1. **Hazır parça hiçbir tedarikçiye düşmüyor.** Kesit satırları `if (!k.malzemeli || k.siparis <= 0) continue;` ile
   yalnız malzeme kalemi olan parçalardan doğuyor; malzemesi girilmemiş parça bir
   `parcaSatirlari` satırı üretiyor ama tedarikçi grubuna girmiyor. Parçanın kendi tedarikçisi
   diye bir alan yok.
2. **Tedarikçi bir çıktı, girdi değil.** Parti seçilir, tedarikçiler sonuçta gruplanır; tersi
   yok.
3. **Ekran salt okunur.** 0134'ün bilinçli kuralı: hiçbir bölüme yazmaz, kilit almaz, izin
   istemez. Düzenleme bunu bozuyor, bu yüzden düzenlemenin geçici olması (X1) kuralın özünü
   korur: hâlâ hiçbir yere yazılmıyor.

### Müşterinin tedarikçi listesi

45 canlı tedarikçinin **31'i hammadde işaretli**, 14'ü değil (kargo, elektrik, su, mali müşavir,
kira, market, internet, gümrük). Sipariş seçicisinin hammadde işaretiyle süzülmesi (C-R3) bu
14'ü listeden çıkarır. Bugün hiçbir parçanın maliyet kalemi olmadığı için ekran **boş
çalışıyor**; 0139'un içe aktarması bunu dolduracak.

### Bilinen sınır: katalog panelinin kilidi

Ayarlar › Katalog › Parça/Yedek Parça paneli kilitli panellerden biridir: panel açıkken o
kullanıcı `ayar:yedekparca` kilidini tutar ve başka kullanıcı aynı paneli açamaz. Sipariş
penceresi o panelin içinden açıldığı için, satın almacı sipariş hazırlarken mühendis parça
kataloğunu düzenleyemez. Pencere kendisi kilit almıyor (B-R5); kilit panelin bugünkü
davranışıdır.

Bu yüzden pencere **ikinci bir giriş noktası** alır (B-R6): Stok › Parça/Yedek Parça Stoğu
başlığından açan kullanıcı katalog kilidini almaz. Katalogdaki düğme aynen kalır, yani müşterinin istediği
yerde durur; kilidi tutmak istemeyen satın almacı Stok'tan açar.

### Para gizliliği neden kural

Bugünkü ekran Makina Maliyeti sekmesinde ve o sekme Giderler'i önkoşul tutuyor, yani malzeme
fiyatları ve toplam tutar zaten gider yetkisinin arkasında. Ekran Ayarlar'a taşınınca bu koruma
kendiliğinden kalkıyor: Ayarlar sekmesi olan herkes malzeme fiyatlarını ve parti toplamını
görür. B-R4 bu açığı kapatır ve uygulamanın başka yerlerindeki desenle aynıdır (parça maliyeti
hücresi, çalışan maliyeti sütunları, Çöp Kutusu'nun gider satırları hep gider yetkisine bağlı).

### QA turunda ölçülenler (2026-11-09)

Hepsi HEAD'de kodla doğrulandı.

- **Ölçüm A.** `src/components/MakinaMaliyeti.jsx:81` ekrana `modelSatirlari={modeller}` veriyor;
  `modeller` = `modelMaliyetleri({standardModels, customModels, parts, malzemeler}, pay.payK, …)` ve
  `pay` = `genelGiderPayi(veri, ayarlar, bugun)`, yani giderler, gider türleri, stok, müşteriler,
  stok hareketleri ve `maliyetAyarlari` zinciri. Ekran bu satırların `uretimde` alanını
  `uretimdekiAdlar` ile okuyor (`src/lib/siparisIhtiyaci.js:334`).
- **Ölçüm B.** `src/lib/uretimdekiModeller.js:37` `uretimdeSuzulmusModeller(ayar, models, …)` ile
  işareti doğrudan süzüyor ve 0105'ten beri müşteri formu bunu kullanıyor. İşareti okuyan adların
  `izinli` kümesi `tests/uretimdeki-modeller-0091.test.js:148`'de altı dosyadan oluşuyor;
  `tests/plan-adetler-0093.test.js` o taramanın şeklini ayrıca sabitliyor.
- **Ölçüm C.** `src/lib/siparisIhtiyaci.js:152-173`: setin `siparis`i hesaplanıyor, sıfırdan
  büyükse içeriği `patlatmaHam`'a yazılıyor, sonra bileşenlerin ihtiyacı ve siparişi kuruluyor;
  malzeme geçişi `k.siparis`i okuyor (satır 189-209).
- **Ölçüm D.** Tek okuma yolu `parcaMaliyetKurus(p, tarih, katalog, malzemeKat)` ve malzeme kalemli
  parçada bu maliyet `maliyetKalemleriOzeti` yüzünden malzemenin kilo tutarını içeriyor. Bugünkü
  `toplamTLK` tedarikçi gruplarının toplamı (`siparisIhtiyaci.js:248`).
- **Ölçüm E.** `src/components/Settings.jsx:292` ve `:301` panellere `giderYetki ? tedarikciler : []`
  veriyor; `src/App.jsx:1739`'un Stok prop listesinde tedarikçi dizisi hiç yok.
- **Ölçüm F.** Bugünkü ekran bütün parçaları ham ihtiyaç, emniyet payı, ihtiyaç, stok ve sipariş
  sütunlarıyla listeliyor (`maliyet/SiparisIhtiyaci.jsx:99-118`); belge MODELLER, PARÇA İHTİYACI,
  tedarikçi bölümleri ve TOPLAM basıyor (`siparisRaporu.js:27-32`).
- **Ölçüm G.** Kesit anahtarı `[m.id, yontem, bicim, …kesit].join("|")` (`siparisIhtiyaci.js:203`),
  yani adede bağlı değil ve adet değişince kaymaz.
- **Ölçüm H.** Kesit satırı yalnız `if (!k.malzemeli || k.siparis <= 0) continue;` koşulunu geçen
  parçalardan doğuyor (`siparisIhtiyaci.js:189`).
- **Ölçüm I.** Bugünkü tabloda tek bir "Sipariş" sütunu var (`maliyet/SiparisIhtiyaci.jsx:115`);
  öneri ile düzenlenen değeri yan yana gösteren sütun yok.
- **Ölçüm J.** Bugünkü tam sayı kuralı `/^\d+$/` ve üst sınır `MAKINA_ADET_UST`
  (`siparisIhtiyaci.js:80-81`); "belirsiz yazılmış sayı" kuralı (`BELIRSIZ_HATASI`) ondalık alanlar
  için var ve tam sayıda anlamsız.
- **Ölçüm K.** `gider.tedarikciKullanim` (`src/lib/gider.js:1067`) hem Tedarikler ekranının çöpe
  atmayı tamamen engelleyen "silinemez" penceresini (`gider/Tedarikciler.jsx:140`) hem kalıcı silme
  kapılarını besliyor.
- **Ölçüm L.** `korunanTedarikciler = kalemdeGecenTedarikciler(rawParts)`
  (`settings/SettingsTrash.jsx:222`) yalnız parça kalemlerini okuyor; `malzemeler[].tedarikciId`
  hiçbir silme kapısında geçmiyor (kaynak taraması, sıfır eşleşme).
- **Ölçüm M.** `KALEMDE_TEDARIKCI_NEDENI` (`gider.js:1064`), `KALEMDE_MALZEME_NEDENI`
  (`malzeme.js:456`) ve `SETTE_PARCA_NEDENI` (`urunAgaci.js:592`) üçü de ad taşımayan sabit cümle;
  ad listesi yalnız onay cümlelerinde (`parcaKullanimMetni`, `setKullanimAdlari`).
- **Ölçüm N.** `PartManager`'ın `suzgecFn` ve `suzgecSecenekleri`'si yalnız `kalemTedarikciIdleri`'ni
  okuyor (`src/components/PartManager.jsx:360-386`); "girilmemiş" ölçütü de o.
- **Ölçüm O.** `src/components/ui.jsx`'te çoklu seçim bileşeni yok, `docs/tasarim-sozlugu.md`'de
  çoklu seçim maddesi yok, `SearchPick` tek seçim; müşterinin otuz bir hammadde işaretli tedarikçisi
  var.
- **Ölçüm P.** `src/lib/malzemeListesiAktarma.js` içinde "tedarikci" hiç geçmiyor, yani 0139'un içe
  aktarması parçaya Ana tedarikçi yazmıyor.
- **Ölçüm R.** E-R3 hazır parça tablosunu dört, malzeme tablosunu üç sütunla tanımlıyor; E-R4 para
  sütunundan, X7 hazır parçanın tutarından söz ediyor. AC-44 ve AC-45 de parasız listeyi
  sabitliyordu, yani üç madde üç farklı belge tanımlıyordu.
- **Ölçüm S.** `src/lib/raporSunumu.js`'te sayfa sonu yardımcısı yok; `belgeAcilis` tek bir
  `<html><body>` üretiyor ve isteğe bağlı `ekStil` parametresi taşıyor (satır 56).
- **Ölçüm T.** Motorun `TEDARIKCISIZ` sabiti bugün "Ana tedarikçisi girilmemiş malzemeler"
  (`siparisIhtiyaci.js:44`) ve `tedarikciGruplari` yalnız malzemelerden doğuyor; parça satırları
  gruplara girerse ikisi de değişir ve "birebir aynı" iddiası düşer.
- **Ölçüm U.** `tests/maliyet-yerlesim.test.js` "beş sekmeli çubuk tek satırda" diye 0134'ün AC-1,
  AC-89 ve AC-100'ünü Electron'da ölçüyor; `tests/ui/makina-maliyeti-0088.test.jsx:38` beş etiketi
  sırasıyla sabitliyor; `tests/siparis-0134.test.js`'in AC-61 ve AC-88 taramaları ekranın dosya
  yolunu okuyor; `src/lib/kilitAlanlari.js:72` ve `docs/evidence/kanit-eslemesi.json:13032` anahtar
  olarak dosya yolunu taşıyor.
- **Ölçüm V.** 0088 X4 taraması yalnız `src/components/maliyet/` altını yazdırma API'si için
  tarıyor (`tests/gider-gizlilik.test.js:363-371`) ve dosya sayısı eşiği (`>= 6`) dosya çıkınca da
  tutuyor; `PartManager` bugün `rapor/FiyatListesiDugmesi`'ni çağırıyor, yani katalog paneli
  yazdırma düğmesi taşıyabiliyor.
- **Ölçüm Y.** Motorun dönüş nesnesinin anahtarları `satirlar`, `hataliSayi`, `gecerliSayi`,
  `kitBos`, `kesisimler`, `parcalar`, `kesitler`, `malzemeGruplari`, `tedarikciGruplari`, `eksik`,
  `hazirSayi`, `stokUyarisi`, `toplamTLK`, `bos` (`siparisIhtiyaci.js:250-255`).
- **Ölçüm Z.** Stok'un alt sekmesinin ekrandaki adı "Parça/Yedek Parça Stoğu"
  (`src/components/Stock.jsx:46`), katalog panelinin adı "Parça/Yedek Parça"
  (`src/components/Settings.jsx:59`).

### QA turunda verilen kararlar (2026-11-09)

1. **Model seçicisi üretim işaretini doğrudan okur** (Bloklayıcı; B-R7, C9; Ölçüm A, Ölçüm B).
2. **Yeniden hesabın sırası yazılır, kapatılan set patlatılmaz** (Bloklayıcı; D-R4/2; Ölçüm C).
3. **Hazır parçanın tutarı yalnız malzeme kalemi olmayan parçada yazılır** (Bloklayıcı; C-R5/2;
   Ölçüm D).
4. **Tedarikçi dizisi pencereye gider yetkisinden bağımsız iner** (Bloklayıcı; B-R4/2, C5; Ölçüm E).
5. **Bugünkü "Parça ihtiyacı" tablosu ekranda kalır, belgeden çıkar** (Bloklayıcı; C-R10; Ölçüm F).
6. **Malzeme tarafının düzenlemesi de motora girdidir ve elle kilonun sonuçları yazılır** (Önemli;
   D-R3/2, C1; Ölçüm G).
7. **Bütün parçaları kapatılan kesitin elle kilosu listede kalır** (Önemli; D-R5/2; Ölçüm H).
8. **Öneri ile düzenlenen değer iki ayrı sütunda durur** (Önemli; D-R2/2; Ölçüm I).
9. **Sipariş adedi tam sayıdır; belirsiz sayı kuralı elle kilo alanına taşınır** (Önemli; D-R1/2,
   AC-39; Ölçüm J).
10. **Ana tedarikçi bağı yalnız kalıcı silmeyi engeller, sayım ayrı alandadır** (Önemli; A-R5;
    Ölçüm K).
11. **Malzemenin Ana tedarikçisi de korunur** (Önemli; A-R5/2; Ölçüm L).
12. **Ret metni sabit kalır, adlar pencerede ve çöp satırında yazılır** (Önemli; A-R5/3, AC-7;
    Ölçüm M).
13. **Katalog panelinin tedarikçi süzgeci Ana tedarikçiyi de okur** (Önemli; A-R6; Ölçüm N).
14. **Tedarikçi seçicisi arama kutulu onay kutusu listesidir ve sözlüğe yazılır** (Önemli; C-R2/2;
    Ölçüm O).
15. **"Tedarikçisi belirtilmemiş" bölümü kapalı başlar ve belgeye girmez** (Önemli; C-R7/2;
    Ölçüm P).
16. **Belgenin sütunları tek yerde yazılır** (Önemli; E-R3/2, AC-44, AC-45; Ölçüm R).
17. **Çıktı tek belgedir, tedarikçi bölümleri arasında sayfa sonu vardır** (Önemli; E-R8/2;
    Ölçüm S).
18. **Tedarikçi odaklı çıktı opt-in bir seçenekle gelir** (Önemli; C-R11, C2, AC-51, AC-52;
    Ölçüm T).
19. **0134'ün ters çevrilen kriterleri ve dosya yoluna bağlı dört bekçisi birlikte güncellenir**
    (Önemli; B-R2/2, Definition of Done; Ölçüm U).
20. **Pencerenin dosya yeri, boyutu ve yazdırma düğmesinin yeri yazılır** (Önemli; B-R1/2;
    Ölçüm V).
21. **Context'in çıktı anahtarları düzeltildi** (Küçük; Context'in bugünkü davranış tablosu;
    Ölçüm Y).
22. **Intent'in "listeye hiç girmiyor" ifadesi düzeltildi** (Küçük; Intent).
23. **Stok alt sekmesinin adı ekrandaki adıyla yazıldı** (Küçük; B-R6, AC-53; Ölçüm Z).
24. **"Tedarikçisi belirtilmemiş" bölümünün metni parçayı da kapsar, eski sabit durur** (Küçük;
    C-R7/2).
25. **Yeni alanın adı `parts.tedarikciId`** (Küçük; A-R1/2).
26. **Satırı olmayan tedarikçinin bölümü çizilmez** (Küçük; C-R4/2).
27. **Seçicide çöpteki tedarikçi yoktur** (Küçük; C-R3/2).
28. **Boş durumların metinleri motorda durur** (Küçük; C-R12).
29. **İhtiyaç ve stok sütunları belgede kalır** (Küçük; E-R3/3).
30. **Düzenlenen ve kapatılan satır sayısı birlikte sayılır** (Küçük; D-R8/2).
31. **Kalkan görünümün derin bağı bilinen sınır olarak yazıldı** (Küçük; X8).
32. **Etkilenen alanlar satırı tamamlandı** (Küçük; başlık tablosu).

### QA turu karar kaydı (2026-11-09)

| No | Bulgu | Derece | Karar | İşlendiği yer |
|---|---|---|---|---|
| 1 | Model seçicisinin kaynağı ekran taşınınca yok oluyor | Bloklayıcı | İşaret doğrudan okunur | B-R7, C9 |
| 2 | Set patlatması ve yeniden hesap sırası tanımsız | Bloklayıcı | Altı adımlı sıra yazıldı | D-R4/2 |
| 3 | Hazır parça tutarı malzemeyle çift sayılıyor | Bloklayıcı | Tutar yalnız malzemesiz parçada | C-R5/2 |
| 4 | Tedarikçi listesinin kapısı para gizliliğiyle çelişiyor | Bloklayıcı | Liste kapısız iner | B-R4/2, C5 |
| 5 | Bugünkü parça tablosunun ve belgenin kaderi yazılmamış | Bloklayıcı | Tablo ekranda kalır, belgeden çıkar | C-R10 |
| 6 | Düzenleme girdisi malzeme tarafını kapsamıyor | Önemli | Kesit anahtarı başına girdi | D-R3/2, C1 |
| 7 | Kapanan kesitin elle kilosu yetim kalıyor | Önemli | Satır işaretle kalır | D-R5/2 |
| 8 | Öneri ile düzenlenen değer ayırt edilmiyor | Önemli | İki sütun | D-R2/2 |
| 9 | Adet kuralı yazılmamış, AC-39 ölçülemez | Önemli | Tam sayı; AC-39 kiloya taşındı | D-R1/2, AC-39 |
| 10 | Ana tedarikçi bağının hangi kapıyı kapattığı belirsiz | Önemli | Yalnız kalıcı silme | A-R5 |
| 11 | Malzemenin Ana tedarikçisi korunmuyor | Önemli | Aynı turda korunur | A-R5/2 |
| 12 | Ret nedeni ad yazan ilk metin olurdu | Önemli | Metin sabit, adlar pencerede | A-R5/3, AC-7 |
| 13 | Katalog süzgeci Ana tedarikçiyi görmüyor | Önemli | Süzgeç alanı da okur | A-R6 |
| 14 | Çoklu seçim bileşeni yok | Önemli | Arama kutulu onay listesi | C-R2/2 |
| 15 | Belirtilmemiş bölümü üç yüz satır olur | Önemli | Kapalı başlar, belgesiz | C-R7/2 |
| 16 | Belge sütunları üç maddede çelişiyor | Önemli | Tek sütun listesi | E-R3/2, AC-44, AC-45 |
| 17 | Sayfa sonu ve birkaç tedarikçi seçimi tanımsız | Önemli | Tek belge, sayfa sonu | E-R8/2 |
| 18 | Kıyas altını yeni alanlarla tutmaz | Önemli | Opt-in çıktı | C-R11, C2, AC-51, AC-52 |
| 19 | Ters çevrilen kriterler ve dört bekçi sayılmamış | Önemli | DoD maddesi eklendi | B-R2/2, DoD |
| 20 | Pencerenin dosya yeri ve boyutu yazılmamış | Önemli | Yer, `wide`, düğme yazıldı | B-R1/2 |
| 21 | Context çıktı anahtarları yanlış | Küçük | Tablo düzeltildi | Context |
| 22 | Intent'in ifadesi kodla çelişiyor | Küçük | Cümle düzeltildi | Intent |
| 23 | Stok alt sekmesinin adı yanlış | Küçük | Ekrandaki adla yazıldı | B-R6, AC-53 |
| 24 | Belirtilmemiş bölümünün metni var olan sabitle çelişiyor | Küçük | Yeni cümle, sabit durur | C-R7/2 |
| 25 | Alanın adı yazılmamış | Küçük | `parts.tedarikciId` | A-R1/2 |
| 26 | Satırsız tedarikçinin bölümü belirsiz | Küçük | Çizilmez, sayı yazar | C-R4/2 |
| 27 | Seçicide çöpteki tedarikçi belirsiz | Küçük | Seçicide yok | C-R3/2 |
| 28 | Boş durum metinlerinin yeri yazılmamış | Küçük | Motorda sabit | C-R12 |
| 29 | Belgedeki ihtiyaç ve stok sütunu tartışmalı | Küçük | Kalır, karar açık | E-R3/3 |
| 30 | İki sayının kapsamı belirsiz | Küçük | Birlikte sayar | D-R8/2 |
| 31 | Kalkan görünümün derin bağı | Küçük | Bilinen sınır | X8 |
| 32 | Etkilenen alanlar eksik | Küçük | Tamamlandı | Başlık tablosu |


---

### Plan turunda verilen kararlar (2026-11-09, revizyon 2)

Takım Yöneticisi planın on beş önerisinin hepsini onayladı (plan `specs/0140-uygulama-plani.md` §3).

33. **R1:** "Tedarikçisi belirtilmemiş" bölümünde yalnız malzemesiz parçalar ve tedarikçisiz malzemeler satır açar; Ana
    tedarikçisiz malzemeli parçalar tek cümleyle sayılır (C-R7/2, AC-26, AC-78).
34. **R2:** Set satırları yalnız "Parça ihtiyacı" tablosunda düzenlenir; patlatılan set tedarikçi bölümünde satır açmaz (C-R10).
35. **R6, R7:** İki yeni koruma cümlesi, seçici kalem > Ana > malzeme; pencere kalem bağlı adları, çöp satırı bütün adları yazar.
36. **R12:** Girdi değişince düzenlemeler korunur.
37. **R10:** `CokluSecim` `tasarim.jsx`'te.
38. **R3:** Kesit düzenlemesinin tek alanı: kilo yolunda kilo, boy yolunda boy adedi (tam sayı); belirsiz sayı kuralı yalnız kiloda.
39. **R4:** Kesit geçişi öneri adetleriyle de koşar; bütün parçaları kapatılan kesitin elle değeri öneri geçişinin tanımıyla kalır.
40. **R5:** Hazır parça tutarı bugünkü maliyet × adet, maliyetsiz parçada "—"; malzemeli parçada "malzemesi aşağıda".
41. **R8:** Eylem kimliği `stock_siparis_listesi` ("Sipariş listesini aç"), `STOCK_ACTION_GROUPS`'ta; sunucuda bölüm kuralı yok.
42. **R9:** Pencere `standardModels` + `customModels` alır, çöptekileri ve çöpteki partileri kendisi süzer.
43. **R11, R15:** Belge `paraGoster` parametresiyle; gizlilik yetkisiz kullanıcının gerçek ekranı ve belgesiyle ölçülür.
44. **R13:** `gecerliGorunum` bilinmeyen "siparis"i Model Maliyetleri'ne düşürür (test).
45. **R14:** 0134'ün ekran yerine bağlı kriterleri yeni pencereye taşınır, testlerine "spec 0140 ile" notu düşülür.
46. Plan §1'in dosya listesi ve §2'nin adım sırası.
47. Plan §4'ün kriter ↔ test eşlemesi.

## Acceptance Criteria

### A. Parçanın Ana tedarikçisi

- **AC-1.** Gider yetkisi olan kullanıcı parça kartında Ana tedarikçi seçebilir ve kayıt onu
  taşır.
- **AC-2.** Gider yetkisi olmayan kullanıcı alanı görmez.
- **AC-3.** Gider yetkisi olmayan kullanıcı parçayı düzenleyip kaydettiğinde var olan Ana
  tedarikçi bağı korunur.
- **AC-4.** Ana tedarikçi boş bırakılan parçanın gövdesine alan yazılmaz.
- **AC-5.** Kaydedilen Ana tedarikçi veritabanı turunda birebir geri okunur.
- **AC-6.** Ana tedarikçi parçanın maliyetini ve satış fiyatını değiştirmez.
- **AC-7.** Bir parçanın Ana tedarikçisi olan tedarikçi kalıcı silinmez; ret bildirimi bugünkü
  sabit cümleyi yazar ve parça adları "silinemez" penceresinde ile Çöp Kutusu satırının nedeninde
  görünür (QA turu, Ö7).
- **AC-8.** Çöpteki bir parçanın Ana tedarikçisi olan tedarikçi de kalıcı silinmez.
- **AC-9.** Çöpü boşaltma ve otuz günlük temizlik aynı korumayı uygular.
- **AC-10.** Birleştirmede yeni parçanın Ana tedarikçisi yeniden atanan tedarikçi kimliğini izler.

### B. Yer ve kapı

- **AC-11.** Parça/Yedek Parça panelinin başlığında sipariş listesini açan düğme vardır.
- **AC-12.** Makina Maliyeti'nde Sipariş İhtiyacı görünümü yoktur; görünüm çubuğu dört sekme
  gösterir.
- **AC-13.** `stockActions` dizisi tanımsız olan kullanıcıda düğme görünür.
- **AC-14.** `stockActions` özelleştirilmiş ve yeni kimliği içermeyen kullanıcıda düğme
  görünmez.
- **AC-15.** Gider yetkisi olmayan kullanıcıda pencere açılır ama hiçbir fiyat, tutar ve toplam
  sütunu çizilmez.
- **AC-16.** Gider yetkisi olmayan kullanıcının bastığı belgede para sütunu yoktur.
- **AC-17.** Pencere açılıp kapanınca hiçbir veri bölümü değişmez (kaydedilen gövdeyle ölçülür).

### C. Tedarikçi odaklı çıktı

- **AC-18.** Parti seçilince satırlar partinin planlanan adetlerinden gelir (bugünkü kural).
- **AC-19.** Tedarikçi seçilmemişken bütün tedarikçiler listelenir.
- **AC-20.** İki tedarikçi seçilince yalnız o ikisinin bölümleri çizilir.
- **AC-21.** Seçicide hammadde işareti olmayan ve hiçbir parçada ya da malzemede Ana tedarikçi
  olmayan tedarikçi listelenmez.
- **AC-22.** Ana tedarikçisi seçilen firma olan, sipariş adedi sıfırdan büyük parça hazır parça
  bölümünde listelenir.
- **AC-23.** Sipariş adedi sıfır olan parça (stok ihtiyacı karşılıyor) **tedarikçi bölümlerinde**
  listelenmez; C-R10'un tam tablosunda sıfır adediyle görünür (QA turu, B5).
- **AC-24.** Malzemesinin tedarikçisi seçilen firma olan kesit satırları malzeme bölümünde
  bugünkü hesabıyla listelenir.
- **AC-25.** Hem Ana tedarikçisi hem malzemesinin tedarikçisi olan parça iki ayrı bölümde
  görünür ve ekranda bunun çift sayım olmadığı yazar.
- **AC-26.** Ana tedarikçisi girilmemiş parça "tedarikçisi belirtilmemiş" bölümünde, en sonda
  görünür ve sayısı başlıkta yazar.
- **AC-27.** Çöpteki tedarikçinin satırları adının yanında durumuyla görünür.
- **AC-28.** Hiç satır çıkmazsa boş durum çizilir ve nedeni yazar (kit boş, stok yetiyor,
  tedarikçi seçimi sonucu boş).

### D. Düzenleme

- **AC-29.** Hazır parça satırının adedi değiştirilince belgeye giden adet değişir.
- **AC-30.** Adedi sıfır yazılan hazır parça satırı belgede basılmaz.
- **AC-31.** Kapatılan satır belgede basılmaz ve toplama girmez.
- **AC-32.** Bir hazır parçanın satırı kapatılınca o parçanın malzeme kilosu malzeme
  bölümünden düşer.
- **AC-33.** Bir hazır parçanın adedi yarıya indirilince o parçanın malzeme kilosu da azalır.
- **AC-34.** Elle yazılmış malzeme kilosu, parça adedi sonradan değişse de korunur ve satırda
  elle girildiği görünür.
- **AC-35.** "Önerilere dön" bütün düzenlemeleri geri alır.
- **AC-36.** Pencere kapanıp yeniden açılınca öneriler yeniden gelir, düzenlemeler kaybolur.
- **AC-37.** Düzenlemeler hiçbir veri bölümüne yazılmaz (kaydedilen gövdeyle ölçülür).
- **AC-38.** Negatif adet reddedilir ve nedeni satırın altında görünür.
- **AC-39.** Belirsiz yazılmış **elle kilo** reddedilir (tek noktalı, noktadan sonra üç ve daha çok
  haneli yazım); sipariş adedi tam sayı alanıdır ve bu kural orada aranmaz (QA turu, Ö4).
- **AC-40.** Geçersiz satır varken yazdırma düğmesi pasiftir ve nedeni yanında yazar.
- **AC-41.** Düzenlenmiş ve kapatılmış satır sayısı başlıkta görünür.

### E. Yazdırma

- **AC-42.** Tek tedarikçi seçiliyken belge o tedarikçinin satırlarını basar.
- **AC-43.** Belgede firma bilgisi, tedarikçi adı, tarih ve girdinin tanımı basılır.
- **AC-44.** Hazır parça tablosu parça, ihtiyaç, stok ve sipariş adedini basar; gider yetkisi olan
  kullanıcının belgesinde birim maliyet ve tutar sütunları da basılır (E-R3/2).
- **AC-45.** Malzeme tablosu malzeme, kesit ve sipariş kilosunu (boy yönteminde boy adedini)
  basar; gider yetkisi olan kullanıcının belgesinde birim fiyat ve tutar sütunları da basılır
  (E-R3/2).
- **AC-46.** Hazır parçası olmayan tedarikçinin belgesinde o tablo basılmaz.
- **AC-47.** Elle düzenlenmiş satır belgede işaretlidir.
- **AC-48.** Bütün tedarikçiler seçiliyken her tedarikçi ayrı sayfada basılır.
- **AC-49.** Basılacak satır yoksa düğme pasiftir.
- **AC-50.** Belgedeki bütün kullanıcı metinleri kaçışlanarak basılır.

### Kıyas

- **AC-51.** Düzenleme girdisi ve `tedarikciOdakli` seçeneği verilmeyen motor çağrısının çıktısı
  spec öncesi altınla birebir aynıdır (C-R11).
- **AC-52.** Ana tedarikçisi girilmemiş veride tedarikçi gruplaması spec öncesiyle aynı sonucu
  verir ve `TEDARIKCISIZ` metni değişmez (C-R11).

### F. İkinci giriş noktası

- **AC-53.** Stok › **Parça/Yedek Parça Stoğu** başlığında (alt sekmenin ekrandaki adı budur)
  sipariş listesini açan düğme vardır ve katalogdakiyle aynı pencereyi açar (QA turu, K3).
- **AC-54.** Stok'tan açılan pencere `ayar:yedekparca` kilidini almaz; aynı anda başka kullanıcı
  parça kataloğu panelini açabilir.
- **AC-55.** Eylem kimliği olmayan kullanıcıda düğme iki girişte de görünmez.

### QA turu kriterleri (2026-11-09)

**Parçanın Ana tedarikçisi ve koruma**

- **AC-56.** Kayda yazılan alanın adı `tedarikciId`'dir; parçanın maliyet kalemlerinin içindeki
  tedarikçi bağı değişmez (A-R1/2).
- **AC-57.** Ana tedarikçisi bir parçada geçen tedarikçi **çöpe atılabilir**; Tedarikler ekranı bu
  bağ yüzünden "silinemez" penceresi açmaz (A-R5).
- **AC-58.** Tedarikler ekranının kullanım hücresi Ana tedarikçi sayısını yazar ve çöpteki
  parçaların sayısını ayrı gösterir (A-R5).
- **AC-59.** Bir malzemenin Ana tedarikçisi olan tedarikçi de kalıcı silinmez (A-R5/2).
- **AC-60.** Kalıcı silme reddinin bildirimi bugünkü sabit cümledir; parça adı bildirimde geçmez
  (A-R5/3).
- **AC-61.** "Silinemez" penceresi ve Çöp Kutusu satırının nedeni en çok üç parça adı artı
  "ve n parça daha" yazar; çöpteki parça "(silinmiş parça)" ekiyle görünür (A-R5/3).
- **AC-62.** Katalog panelinin tedarikçi süzgeci bir firmayı seçince o firmanın Ana tedarikçi
  olduğu parçaları da listeler (A-R6).
- **AC-63.** Süzgecin "girilmemiş" seçeneği hem maliyet kaleminde hem Ana tedarikçi alanında
  tedarikçisi olmayan parçaları verir ve seçenek sayıları buna göre hesaplanır (A-R6).

**Yer, kapı ve girdi**

- **AC-64.** Pencere tek dosyadır; iki giriş noktası aynı bileşeni çizer ve aynı içeriği gösterir
  (B-R1/2, B-R6).
- **AC-65.** Pencere `wide` açılır ve `KILITSIZ_DOSYALAR`'da gerekçesiyle kayıtlıdır (B-R1/2).
- **AC-66.** Yazdırma düğmesi `src/components/rapor/` altındadır; pencerenin dosyası yazdırma
  API'sini doğrudan çağırmaz (B-R1/2).
- **AC-67.** Model seçicisinin listesi `appSettings`'in üretim işaretinden süzülür; üretimde
  olmayan model listede yoktur (B-R7).
- **AC-68.** Satırın kendi (partiden gelen) modeli işaretten çıkmış olsa da listede korunur
  (B-R7, bugünkü kural).
- **AC-69.** Pencere makina maliyeti motorunu çağırmaz; gider kalemleri, gider türleri ve maliyet
  ayarları pencereye prop olarak inmez (B-R7, C5).
- **AC-70.** Üretim işaretini okuyan adların `izinli` kümesi pencerenin dosyasını içerir ve iki
  taramanın ikisi de yeşildir (C9).
- **AC-71.** Tedarikçi dizisi gider yetkisi olmayan kullanıcıda da pencereye iner: grup başlıkları
  firma adını yazar, "kaydı bulunamayan tedarikçi" çıkmaz (B-R4/2).
- **AC-72.** Parti seçicisi yalnız canlı partileri listeler; çöpteki parti iki giriş noktasında da
  seçeneklerde yoktur (B-R6).

**Tedarikçi odaklı çıktı**

- **AC-73.** Hazır parça satırının tutarı malzeme kalemi olmayan parçada yazılır; malzeme kalemli
  parçada hücre `—` ve nedeni görünür (C-R5/2).
- **AC-74.** Tedarikçi toplamı hazır parça tutarları ile malzeme tutarlarının toplamına eşittir ve
  aynı malzeme iki kez toplanmaz (C-R5/2).
- **AC-75.** Seçilmiş ama satırı olmayan tedarikçinin bölümü çizilmez; seçimin altında kaç firmanın
  satırsız olduğu yazar (C-R4/2).
- **AC-76.** Çöpteki tedarikçi seçicide listelenmez; satırları "bütün tedarikçiler" görünümünde
  durum işaretiyle görünür ve o firmanın belgesi basılamaz (C-R3/2).
- **AC-77.** Tedarikçi seçicisi arama kutulu onay kutusu listesidir; "Tümünü seç" ve "Temizle"
  çalışır, seçilenler pil olarak görünür (C-R2/2).
- **AC-78.** "Tedarikçisi belirtilmemiş" bölümü kapalı başlar, başlıkta sayı yazar ve belgeye
  girmez (C-R7/2).
- **AC-79.** Bugünkü "Parça ihtiyacı" tablosu ekranda katlanabilir bölüm olarak durur; sipariş adedi
  sıfır olan parça da satırıyla görünür (C-R10).
- **AC-80.** Belge MODELLER kutusunu ve tedarikçi bölümlerini basar; PARÇA İHTİYACI tablosu belgede
  yoktur (C-R10).
- **AC-81.** Boş durumların üç nedeni metin sabitlerinden gelir; ekran dosyasında bu cümleler yazılı
  değildir (C-R12).

**Düzenleme**

- **AC-82.** Sipariş adedi alanı 0 ile 1.000.000 arası tam sayı kabul eder; sıfır geçerlidir ve boş
  alan sıfır sayılır (D-R1/2).
- **AC-83.** Ekranda "Sipariş (öneri)" sütunu salt okunurdur ve düzenlenen satır işaretlenir
  (D-R2/2).
- **AC-84.** Kesit satırının sipariş kilosu elle yazılınca o değer sipariş kilosu olur; asgari
  sipariş farkı uygulanmaz, değer asgarinin altındaysa uyarı yazar (D-R3/2).
- **AC-85.** Elle kilo yazılmış kesitte boy adedi ve artan kilo `—` olur, tutar elle kilo ile
  bugünkü fiyatın çarpımıdır (D-R3/2).
- **AC-86.** Bir setin satırı kapatılınca set patlatılmaz: bileşenlerinin satırı ve o bileşenlerin
  malzemesi listeden düşer (D-R4/2).
- **AC-87.** Bir setin sipariş adedi yarıya indirilince bileşenlerinin ihtiyacı ve malzeme kilosu da
  azalır (D-R4/2).
- **AC-88.** Elle kilosu yazılmış kesit satırı, bütün parçaları kapatılsa da listede kalır ve
  işareti görünür (D-R5/2).
- **AC-89.** Başlıktaki iki sayı parça ve malzeme satırlarını birlikte sayar (D-R8/2).

**Yazdırma ve kıyas**

- **AC-90.** Gider yetkisi olan kullanıcının belgesinde hazır parça tablosu birim maliyet ve tutar,
  malzeme tablosu birim fiyat ve tutar sütunlarını taşır (E-R3/2).
- **AC-91.** Belge tek dosyadır; tedarikçi bölümleri arasında sayfa sonu vardır ve başlık bandı bir
  kez basılır (E-R8/2).
- **AC-92.** İki tedarikçi seçiliyken de her tedarikçi kendi sayfasında basılır (E-R8/2).
- **AC-93.** `tedarikciOdakli` seçeneği verilmeyen çağrıda `tedarikciBolumleri` alanı hiç yoktur
  (C-R11).
- **AC-94.** Opt-in seçenekle yapılan çağrıda bugünkü beş alan ve `TEDARIKCISIZ` metni değişmez
  (C-R11).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Hesap saf motorda; düzenleme motora girdi olarak veriliyor ve ekran aritmetik yazmıyor
      (kaynak taraması).
- [ ] Düzenleme girdisi verilmeyen çağrının kıyas altını birebir tutuyor.
- [ ] Parçanın Ana tedarikçisi dört nokta kuralıyla eklendi ve `db-roundtrip` testinde.
- [ ] Birleştirme kuralı eklendi (tedarikçi kimliği yeniden eşlenir) ve `merge` testinde.
- [ ] Yeni eylem izni sunucu tarafı, izin tanımları ve kullanıcı yönetimi ekranıyla birlikte
      eklendi; pencere salt okunur olduğu için **sunucuda yeni bölüm kuralı yoktur**, açıkça yazıldı.
- [ ] Para gizliliği testiyle sabitlendi: gider yetkisi olmayan kullanıcının ekranında ve
      belgesinde fiyat, tutar, toplam geçmiyor.
- [ ] Kullanıcıya görünen bütün metinler Türkçe; belge yalnız Türkçe.
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi (pencere, iki alt bölüm, tedarikçisiz bölüm,
      düzenlenmiş satır, boş durum, hata durumu, gider yetkisiz görünüm).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi (0134 bölümü ekranın yeni yerine göre, yeni alan ve yeni izin).
- [ ] Yeni pencere `kilitAlanlari.KILITSIZ_DOSYALAR`'a gerekçesiyle eklendi ve `kilit-alanlari`
      testi yeşil; dosya yolu değişen 0134 taramaları güncellendi.
- [ ] Üretim işaretini okuyan adların `izinli` kümesi iki taramada birlikte güncellendi ve
      `URETIM_ISARETI_IPUCU` metni yeni yeri sayıyor.
- [ ] 0134'ün ters çevrilen kriterleri listelendi, testlerine "spec 0140 ile" notu düşüldü;
      `maliyet-yerlesim` düzeneği dört sekmeyle ölçüyor.
- [ ] Tedarikçi odaklı çıktı opt-in seçenekle geliyor; parametresiz çağrının kıyas altını birebir
      tutuyor ve `TEDARIKCISIZ` metni değişmedi.
- [ ] Çoklu seçim listesi `docs/tasarim-sozlugu.md`'ye maddesiyle yazıldı.
- [ ] Prop zinciri iki giriş noktası için tek tek yazıldı: tedarikçi dizileri (kapısız), canlı
      parti listesi, yerel gün ve firma bilgisi.
- [ ] Ana tedarikçi bağının koruması üç kalıcı silme kapısında ölçüldü; çöpe atma engellenmiyor ve
      malzemenin bağı da korunuyor.
- [ ] `docs/evidence/kanit-eslemesi.json`'un dosya yolu anahtarı ve ekran adları güncellendi.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] **SCORECARD dolduruldu** ve spec `specs/done/` klasörüne taşındı.

---

## Kararlar

### Takım Yöneticisi'nin kararları (2026-11-09)

1. **Ekran parça/yedek parça tanımlarına taşınır.** Müşteri istedi; analistin Stok sekmesi
   önerisi reddedildi.
2. **Düzenleme geçicidir**, sipariş kaydedilmez.
3. **Tedarikçi seçimiyle açılır**, o tedarikçinin parçaları gelir, adetler değiştirilebilir,
   bazılarına hiç sipariş verilmez.
4. **Yazdırılabilir olacak.**

### Analistin kararları, onaya sunulan

1. **Düğme yeni bir eylem kimliğine bağlanır, para sütunları gider yetkisine (B-R3, B-R4).**
   Gerekçe: ekran bugün Makina Maliyeti sekmesindeydi ve o sekme Giderler'i önkoşul tuttuğu
   için malzeme fiyatları zaten gider yetkisinin arkasındaydı. Ayarlar'a taşınınca bu koruma
   kendiliğinden kalkıyor. Kimlik tanımsızda açık olduğu için bugünkü kullanıcılar için hiçbir
   şey değişmez.
   **Alternatif:** hiç kapı koymamak. Daha ucuz ama Ayarlar sekmesi olan herkes malzeme
   fiyatlarını ve parti toplamını görür. Önermiyorum.

2. **Parça adedi değişince malzemesi yeniden hesaplanır (D-R4).**
   Gerekçe: aksi hâlde kullanıcı bir parçayı listeden çıkarır ama malzemesini yine sipariş eder,
   yani ekran yanlış kâğıt üretir.
   **Alternatif:** iki tarafı bağımsız düzenlemek. Daha basit ama yukarıdaki hatayı serbest
   bırakır. Önermiyorum.

3. **Çıktı iki alt bölümlüdür: hazır parçalar (adet) ve malzemeler (kilo), tek belgede (C-R4).**
   Gerekçe: aynı firmadan hem hazır parça hem malzeme alınabiliyor; yalnız adet bırakırsak
   paslanmaz ve plastik çubuk siparişi hesaplanamaz hâle gelir, yalnız kilo bırakırsak hazır
   parça siparişi hiç çıkmaz.

4. **İkinci giriş noktası kapsama alındı (B-R6).** Takım Yöneticisi 2026-11-09'da analistin
   önerisini kabul etti. Katalog paneli açıkken o kullanıcı `ayar:yedekparca` kilidini tuttuğu
   için, satın almacı sipariş hazırlarken mühendis parça kataloğunu düzenleyemiyordu. Aynı
   pencere Stok › Parça Stoğu başlığından da açılır; katalogdaki düğme aynen kalır.

---

### QA turunun kararlara etkisi (2026-11-09)

Takım Yöneticisi'nin dört kararı aynen durur. Analistin onaya sunulan dört kararından ikisi
genişledi: 1. karar (yeni eylem kimliği ve para sütunları) para gizliliğinin yalnız çizim
katmanında uygulanacağı ve tedarikçi adının kapısız indiği eklenerek netleşti (B-R4/2, C5);
2. karar (parça adedi değişince malzemesi yeniden hesaplanır) setin patlatılmasını da kapsayan
altı adımlı sıra ile tamamlandı (D-R4/2). 3. karar (iki alt bölüm) tutar sütununun yalnız malzeme
kalemi olmayan parçada yazıldığı kuralıyla sınırlandı (C-R5/2), çünkü parçanın maliyeti
malzemesinin bedelini zaten içeriyor. 4. karar (ikinci giriş noktası) iki giriş noktasının aynı
bileşeni çizdiği, parti listesinin iki tarafta da canlı olduğu ve pencerenin dosya yeri yazılarak
uygulanabilir hâle geldi (B-R1/2, B-R6).

Kapsam iki yerde büyüdü: bugünkü "Parça ihtiyacı" tablosu ekranda kalıyor (C-R10) ve malzemenin
Ana tedarikçisi de silme korumasına giriyor (A-R5/2). Bir yerde daraldı: tedarikçi odaklı çıktı
motorun bugünkü alanlarını değiştirmiyor, opt-in bir seçenekle geliyor (C-R11). Üç iddia kodla
çeliştiği için düzeltildi (Context'in çıktı anahtarları, Intent'in ifadesi, Stok alt sekmesinin
adı) ve bir iddia var olan bir metin sabitiyle çeliştiği için yeniden yazıldı (C-R7/2).

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
