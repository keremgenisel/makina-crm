# 0001 — Uygulama Planı: Gider Kaydı ve Dönemsel Gider Takibi

| | |
|---|---|
| **Bağlı spec** | `specs/done/0001-gider-kaydi-ve-donemsel-gider-takibi.md` (R11) |
| **Durum** | P1 (K1–K15) onaylandı, 2026-09-22. P2 (K16–K30) ve P3 (K31–K38) "planı uygulayalım" talimatıyla onaylandı, 2026-09-23. **Uygulandı** (branch `feat/0001-gider`, commit yok): adım 1–7 kodu ve testleri tamam; görsel kanıt (docs/evidence) ve SCORECARD bekliyor. |
| **Yazan** | Analist |
| **Uygulayan** | Geliştirme sahibi atanacak. Bu belge kod yazmaz, yolu çizer. |
| **Revizyon** | P1 (2026-09-22): spec R2/R3 üzerine ilk plan. P2 (2026-09-23): spec R4–R9 (tedarikçi, iki bileşenli personel, ödeme yöntemi ve vade, borç özeti, model ataması, dağıtılmasın işareti, dört kova) plana işlendi; K7/K8/K14 güncellendi, K16–K30 eklendi, mockup'lar bu plana göre revize edildi. P3 (2026-09-23): spec R10/R11 (çok satırlı model dağılımı, tutar bazlı kova bölmesi, aylık standart genel gider listesi) plana işlendi; K25/K26/K27 değişti, K31–K38 eklendi. |
| **Mockup** | https://claude.ai/artifact/MQgRxtd8X3dhzqnqqRFHdc (P2 ile uyumlu; **P3 için revizyon gerekli**, bkz. bölüm 7) |

Bu plan spec'in çözümü değildir; spec'i karşılamak için hangi dosyaya hangi sırayla dokunulacağını,
kodda doğrulanmış tuzakları ve her kabul kriterinin hangi testle kanıtlanacağını sabitler.
Doküman ile kod çelişirse kod doğrulanır ve çelişki spec'e işlenir.

---

## 0. Kodda doğrulanan dayanaklar

Plan şu gözlemlere oturur (P1: 2026-09-22, P2: 2026-09-23; main `69acf6c`):

- Stoktan satışta stok satırı **fiziken siliniyor** (`Customers.jsx` `deductMachineStock`, `p.filter`), müşteri kaydına
  `sourceStockId` yazılıyor. Seri no **elle** girildiğinde (`_manualSerial`) bu bağ yazılmıyor.
- `UserManager` her yeni kullanıcıya `tabs: DEFAULT_USER_TABS` yazıyor; `tabs` tanımsız kullanıcı yalnız eski
  kayıtlarda veya elle üretilmiş izin gövdesinde olur. `DEFAULT_USER_TABS` gider içermeyecek, varsayılan kapalı bedavaya gelir.
- `App.jsx` `visibleTabs`: yerel mod / sunucu PC / admin → tüm sekmeler; `tabs` dizi değilse → tüm sekmeler. C6 kural 3 burada kırılır.
- `serverAuth.cjs` `sekmeEngelli`: `tabs` dizi değilse hiçbir bölüm engelli değil. C6 kural 3'ün sunucu aynası burada kurulur.
- Finans "Ödenmesi Muhtemel KDV" kartı bileşen içinde ve seçili aralığa (Bu Yıl, Özel…) göre hesaplanıyor; rapor motoru
  (`hesaplaAylikRapor`) **aylık** çalışıyor ve `toplamKdv`'yi para birimi anahtarlı (`{TRY, USD, EUR}`) döndürüyor.
  Finans'ta zaten bir ay seçici var (`raporAy`, Aylık Rapor düğmesi).
- Çöp kutusu `purgeOldTrash` ile 30 gün sonra kalıcı temizleniyor; R4'ün "silinse bile yeniden üretilmez" sözü çöpteki kayda dayanamaz.
- `calisanlar` meta-JSON (`{id, ad}`), soft-delete'li, `CalisanManager` `useSimpleDefList` üzerinde. Silme onayı bugün yalnız
  "geçmiş servislerdeki teknisyen adı korunur" der. Yeni alan kolon migration istemez.
- `financeActions` bugün hiçbir veri bölümüne bağlı değil (`SECTION_GROUP`'ta yok). Gider için yeni boyut şart (C6).
- İşlem geçmişi etiketleri `SettingsAuditLog.jsx` içindeki `ENTITY_LABELS` / `ACTION_LABELS` haritalarında; `olusturuldu / duzenlendi /
  silindi / odendi / odeme_iptal / geri_alindi` zaten var.
- `docs/evidence/` boş, hazır.
- **P2 ekleri:**
  - Makina modelleri **adla** yaşıyor, kimlikleri yok. `ModelsManager.jsx` `cascadeRename` bugün `customers[].model`,
    `stock[].model` ve `appSettings.analizGizliModeller`'i taşıyor. **Standart modeller silinemiyor** (yalnız düzenleniyor);
    **özel modeller çöp kutusuna gidiyor** (`withDeleted`, onay metni "Çöp Kutusu'na taşınacak"). R21'in "model silindiğinde"
    kuralı pratikte yalnız özel modellere uygulanır ve silme geri alınabilir.
  - `constants.js` `ODEME_YONTEMLERI = ["Nakit","Kredi Kartı","Çek"]` **tahsilat** listesidir, Havale içermez. R1'in dört
    yöntemi (Nakit, Havale, Çek, Kredi Kartı) bu listeyle aynı değildir.
  - `serverAuth.cjs` `ALAN_IZINLERI` yalnız üç alan (Kanban `durum`/`kargoDurum`) için alan bazlı denetim yapıyor; C7b'nin
    "alan bazlı sunucu denetimi orantısız" tespiti doğru.
  - `serverAuth.cjs` `AYAR_ALAN_SEKMELERI` `appSettings`'i alan bazında sekmeye bağlıyor; yeni `giderAyarlari` buraya girer.
- **P3 ekleri:**
  - Ana kayıt + alt tablo deseni `yedek_parca_satis` + `yedek_parca_tahsis` (`db.cjs:211`): alt satır **kendi id'sini taşımaz**,
    `satis_id` + `sort_order` ile yazılır, kayıtta ana tablo ile birlikte silinip yeniden yazılır (`db.cjs:573-592`; oradaki not,
    alt satıra id verildiğinde `UNIQUE constraint failed` yaşandığını anlatıyor). Okumada ana kayda dizi olarak takılır
    (`db.cjs:1047`). Blob'da ve `merge.js`'te alt satırlar ana kaydın içinde dizi olarak taşınır (`tahsisler`, `merge.js:66-71`).
    R21'in model satırları (C12) bu desenin birebir aynısıdır.

---

## 1. Kararlar

### 1a. P1 kararları (onaylı, 2026-09-22)

| # | Karar | Gerekçe | Bedel |
|---|---|---|---|
| K1 | KDV karşılaştırması **ay** bazlı. Finans'ta `raporAy` seçicisine bağlanır; Gider sekmesinde çok aylı aralık seçilirse motor her ay için ayrı çağrılıp toplanır, kısmi ay kabul edilmez. | C10: rapor motoru tek kaynak, aralık başına ayrı KDV hesabı Finans ile raporu üçüncü kez ayrıştırır. | Kısmi aralıkta ("15 Mart–20 Nisan") karşılaştırma yok; kart gizlenmez, açıklamalı boş durum gösterir (K15). |
| K2 | Tekrarlayan tanım kaydı `uretilenAylar: ["2026-03", …]` listesi taşır; üretim önce bu listeye bakar. | Çöp 30 günde temizleniyor; kalıcılık tanımla birlikte yedeklenip birleştirilir. | Üretim, Gider sekmesinden `giderTanimlari` bölümünü de yazar → `BOLUM_SEKMELERI.giderTanimlari` `gider`'i içerir. |
| K3 | Makina bağı `{makinaTur: "stok"\|"musteri", makinaId}`; çözüm **okuma anında** (`makinaGideriCoz`): stok satırı satıldıysa `customers.find(c => c.sourceStockId === makinaId)`; makina çöpte/yoksa kalem ortak gidere düşer. Silmede alan fiziken temizlenmez. | Çöpten geri alınca atama kendiliğinden döner; silme kaskadına yazma eklenmez; AC-28 motorda tek kuralla karşılanır. | AC-28'in "atama kalkar" ifadesi mantıksaldır, fiziksel değil. |
| K4 | Seri no elle girilen makinada `sourceStockId` yazılmadığı için bağ kopar → **spec'e C18 (kabul edilen sınır)** eklendi. | Satış akışını değiştirmek bu spec'in kapsamı dışı. | Böyle satılan makinaya stoktayken atanan gider ortak gidere düşer. |
| K5 | Müşteri silinince makina stoğa **yeni id ile** dönüyor; müşteri makinasına atanmış gider çöpe giden müşteriyle ortak gidere düşer, geri alınınca döner; kalıcı silmede bağ kopar. | AC-28 ile uyumlu, ek yazma yok. | Stoğa dönen makinaya gider otomatik taşınmaz. |
| K6 | C6 kural 3'ün **sunucu aynası**: gider bölümleri (`giderler`, `giderTanimlari`, `giderTurleri`, P2 ile `tedarikciler`) için `tabs` dizi değilse user rolü **engelli** sayılır (`sekmeEngelli` istisnası). | Arayüzde kapalı, sunucuda açık bölüm C7'nin kabul ettiği okuma sınırının ötesinde bir yazma açığı olurdu. | Bir özel durum daha; testle sabitlenir. |
| K7 | R11 kaçakları kapatılır: `CalisanManager` maliyet alanları, Çöp Kutusu gider satırları ve (P2) Ayarlar'daki **Giderler grubunun tamamı** ile varsayılan resmi maliyet alanı `giderYetki`'ye bağlı (kargoYetki deseni). *P2 güncellemesi.* | Maaş rakamı gider verisinden türeyen en hassas rakam; R13'ün tedarikçi için söylediği "settings izni olan ama gider yetkisi olmayan kullanıcı görür" tehlikesi tür, tanım ve ayar ekranları için de geçerli (tanım ekranında personel tutarları görünür). | Ayarlar'da iki koşul birden aranır: `settings` görünürlüğü **ve** `giderYetki`. |
| K8 | Personel: **çalışan başına** tekrarlayan tanım (`calisanId`); tutar tanımda değil, üretim anında çalışanın **iki bileşeninden** (`resmiMaliyet`, `eldenMaliyet`) okunur. Ekranda "tüm çalışanlar için tanım oluştur" kısayolu. *P2 güncellemesi: tek `aylikMaliyet` yerine iki alan.* | R5 "çalışan bazlı"; işe giriş/çıkış bitiş ayıyla çalışan başına yönetilir. | 10 çalışanda 10 tanım satırı. |
| K9 | Kira tanımı yalnız giriş yönü + tutar tutar; stopaj ve KDV varsayılanı **üretim anındaki** ayardan alınır, üretilmiş kalem sonradan değişmez. | R5 ile aynı ilke (geçmiş aylar değişmez). | — |
| K10 | Finans'taki "Ödenmesi Muhtemel KDV" kartı olduğu gibi kalır; yanına ayrı "KDV Karşılaştırması" kartı gelir. | AC-30 bunu açıkça istiyor; kartın anlamı değişmez. | — |
| K11 | Görsel kanıtlar gerçek uygulama sürücüsüyle **izole veri kopyası** üzerinden alınır; gerçek `userData`'ya dokunulmaz. Personel ekranları uydurma ad ve tutarla alınır (spec DoD, C7b). | Gerçek müşteri ve çalışan verisi o klasörde. | — |
| K12 | Kullanımdaki tür silinirken kayıtlar **yalnız aynı davranıştaki** türe taşınabilir; hedef yoksa taşıma sunulmaz ve silme engellenir. Taşıma diyaloğunun tür listesi `davranis` ile süzülür. | Kira kalemi normal türe taşınırsa stopaj toplamı sessizce düşer (AC-4…AC-6 yalan söyler); personelde `calisanId` bağı anlamsız kalır. | Sınıf değiştirmek isteyen kullanıcı kalemleri tek tek düzenler. |
| K13 | Kullanımda olan türün **davranışı değiştirilemez** (ad serbest). Kullanımda olma kontrolü: `giderler[].turId` + `giderTanimlari[].turId`, çöptekiler dâhil. | K12 yalnız taşımaya konsaydı kullanıcı davranışı değiştirerek aynı sonuca ulaşırdı. | Yanlış davranışla kullanıma girmiş tür düzeltilemez; yeni tür açılır. |
| K14 | Elle personel kaleminde, çalışan seçilince **iki bileşen ayrı ayrı** çalışan kaydından **yalnız boş alana** ön doldurulur; ön doldurma tek yönlüdür; bileşeni tanımlı değilse alan **boş kalır, 0 yazılmaz**. *P2 güncellemesi: tek alan yerine iki alan (AC-37, AC-54).* | Alana 0 basılsaydı eksik ay sessizce geçerli sayılırdı. | Maliyeti girilmemiş çalışan için tutar elle yazılır. |
| K15 | Kısmi aylık aralıkta KDV karşılaştırması **gizlenmez**: kart yerinde kalır, seçili aralığı anan açıklama gösterir. | Kartın yokluğu bu arayüzde "yetki yok" demek (AC-30). | Kart rakam üretmeyeceği aralıklarda da yer kaplar. |

### 1b. P2 kararları (onaylı, 2026-09-23)

| # | Karar | Gerekçe | Bedel |
|---|---|---|---|
| K16 | **Tedarikçi** yeni bölüm `tedarikciler` (id'li, **kalıcı silme**, `MERGE_KEYS`). `BOLUM_SEKMELERI.tedarikciler = ["gider"]`, **settings yok** (R13, spec DoD). Ad benzersizliği `trLower` ile. Kullanımda kontrolü `giderler[].tedarikciId` (çöp dâhil) + `giderTanimlari[].tedarikciId`. | R13 Ayarlar'ı açıkça dışlıyor; `trLower` projede Türkçe büyük/küçük harf karşılaştırmasının tek kaynağı (ModelsManager aynı yolu kullanıyor). | Tedarikçi yönetimi yalnız Giderler sekmesinde; `settings` izni tek başına yetmez. |
| K17 | **Tekrarlayan tanım tedarikçi de taşır** (`tedarikciId`) ve ürettiği kaleme kopyalar; personel tanımında alan yoktur. | Kira borcu kiraya verene yazılır (AC-43); tanım tedarikçisiz olsaydı her ay üretilen kira kalemi "tedarikçi seçilmemiş" grubuna düşer, kullanıcı her ay elle bağlardı. Spec tanımın taşıyabileceği alanlarda bunu yasaklamıyor (R21 son cümlesi atama için aynı deseni kuruyor). | Tanım ekranında bir alan daha. Tedarikçi silme kontrolü tanımları da sayar. |
| K18 | **Ödenecek tutar** tek saf fonksiyon `odenecekTutar(kalem)`: normal `tutar + kdv`; kira `brüt − stopaj + brüt×kdv`; personel `resmi + elden`. Tedarikçi açık borcu, borç özeti ve kalem listesindeki "Ödenecek" sütunu **yalnız** bu fonksiyonu kullanır. | R14 terimi tek anlamlı tanımlıyor; AC-43 ve AC-61 brüt ve net girişin aynı sonucu vermesini istiyor, bu ancak tek fonksiyonla garanti. | — |
| K19 | **Personel kalemi**: `resmiTutar`, `eldenTutar` saklanır; kalemin tutarı saklanmaz, motor `kalemTutari(k)` ile türetir (personelde resmi + elden, diğerlerinde `tutar`). `kdvOrani` personelde her zaman 0 yazılır ve formda gösterilmez. | Spec "doğruluk kaynağı bileşenlerdir" diyor; ikinci bir `tutar` kolonu yazmak iki kaynağın ayrışmasına kapı açar (bu projede iki kez yaşandı). | Personel kaleminde `tutar` kolonu boş kalır; roundtrip testi bunu sabitler. |
| K20 | **Çalışan maliyeti**: `calisanlar[].resmiMaliyet`, `calisanlar[].eldenMaliyet` (meta-JSON, migration yok). **Varsayılan resmi maliyet** `appSettings.giderAyarlari.varsayilanResmiMaliyet`; gösterim yeri **Ayarlar > Firma > Firma Çalışanları** ekranının başı (spec "Firma ayarlarında" diyor), `giderYetki` yoksa çizilmez. Değer koda gömülmez, boş başlar. | Yeni çalışan eklenirken ön doldurma aynı ekranda gerekiyor; varsayılanı Gider Ayarları'na koymak kullanıcıyı iki ekran arasında gezdirirdi. Context 39.223,13'ün koda gömülmemesini istiyor. | Firma Çalışanları ekranı gider yetkisine göre iki görünüm çizer. |
| K21 | **Personel gizliliği ekranda da varsayılan kapalı**: dönem raporundaki personel satırı (R17), borç özetindeki "Çalışanlar" satırı (R19) **ve kalem listesindeki personel kalemleri** tek, kapalı bir grup satırında toplanır; açılınca çalışan başına resmi ve elden ayrı görünür. Açık/kapalı durumu kalıcı değildir, sekme her açıldığında kapalı başlar. | R17 dönem raporundan söz ediyor; kalem listesi aynı sekmede ve açık kalsaydı R17'nin koruması bir satır aşağıda delinirdi. | Personel kalemini düzenlemek için bir tık fazla. |
| K22 | **Eylem kimlikleri (C6 üç parça)**: kalem `gider_add`, `gider_edit`, `gider_delete`, `gider_odeme`, `gider_tekrar_uret`; tanım yönetimi `gider_tanim` (tür, tekrarlayan tanım, gider ayarları, çalışan maliyet alanları); tedarikçi `tedarikci_add`, `tedarikci_edit`, `tedarikci_delete`. Sunucu: `giderler`, `giderTanimlari`, `giderTurleri`, `tedarikciler` dördü de `SECTION_GROUP → giderActions`; `EYLEM_IDLERI` ekleme/silmeyi kayıt bazında denetler (`giderler`: gider_add/gider_delete, `giderTanimlari` ve `giderTurleri`: gider_tanim, `tedarikciler`: tedarikci_add/tedarikci_delete). Düzenlemeler bölüm düzeyinde güvenilir (mevcut sınır). *P1'deki `giderTanimlari/giderTurleri → settings` eşlemesi bununla değişir.* | C6 son paragrafı ayrı yetkilendirme istiyor; tanımları `settings` grubuna bağlamak gider yetkisi olmayan ama settings'i açık kullanıcıya tanım yazma yolu bırakırdı. | Üretim (`uretilenAylar` yazımı) bölüm düzeyinde düzenleme sayılır, `gider_tanim` istemez; bu bilinçli. |
| K23 | **`BOLUM_SEKMELERI`**: `giderler: ["gider","settings"]` (settings: model yeniden adlandırma zinciri), `giderTanimlari: ["gider","settings"]` (settings: tanım ekranı + çalışan silmede tanım kapatma), `giderTurleri: ["settings"]`, `tedarikciler: ["gider"]`. `calisanlar` mevcut eşlemesinde kalır (C7b yazma sınırı kabul edildi). | Her yazma yolu bir sekmeden geliyor; eksik sekme "ekran açılıyor ama kaydetme 403" hatasını üretir. | — |
| K24 | **Ödeme yöntemi** yeni sabit `GIDER_ODEME_YONTEMLERI = ["Nakit","Havale","Çek","Kredi Kartı"]`; mevcut tahsilat listesi `ODEME_YONTEMLERI`'ne dokunulmaz. Boş değer "Belirtilmemiş" gösterilir. **Vade** tek alan `sonOdemeTarihi`; etiket `odemeYontemi === "Çek"` iken "Çek vade tarihi". Doğrulama `sonOdemeTarihi >= tarih`. **Vadesi geçti** = `!odendi && sonOdemeTarihi && sonOdemeTarihi < bugun`; `bugun` motora parametre verilir. | Tahsilat listesini genişletmek Finans'taki yöntem kırılımını ve aylık raporu değiştirirdi (kapsam dışı yan etki). `bugun` parametresi testleri saatten bağımsız yapar. | İki ayrı yöntem listesi yaşar; adları CLAUDE.md'ye yazılır. |
| K25 | *P3 ile değişti: `modelAd, modelAdet` kolonları yerine K31'in alt satırları; atama yalnız normal davranışta (K38).* **Atama üçlüsü tek alanla dışlanır**: `atamaTur: "" \| "makina" \| "model" \| "dagitma"` + `makinaTur, makinaId` + `modelAd, modelAdet`. Arayüzde dört seçenekli tek seçici (Ortak / Makina / Model / Dağıtılmasın). Seçim değişince diğer alanlar temizlenir ve tek satırlık bilgi gösterilir (AC-76, AC-77). | Üç ayrı alanla dışlama her okuma yerinde tekrar denetlenmek zorunda kalırdı; tek anahtar AC-82'nin "hiçbir kalem iki kovada değil" şartını yapısal olarak sağlar. | Spec'in "işaret" dili arayüzde bir seçenek olarak görünür; AC-76 metni buna göre okunur. |
| K26 | *P3 ile değişti: kova bölmesi kalem bazlı değil tutar bazlı (K33); model çözümü satır düzeyinde (K35).* **Dört kova motorda tek fonksiyon** `kovaBelirle(kalem, ctx)`: `makina` (K3 ile çözülebiliyorsa), `model` (ad canlı model listesinde varsa), `dagitma`, aksi hâlde `ortak`. Model bağı **ad ile**, çözüm **okuma anında**: model çöpteyse ortak, geri alınırsa döner (K3 deseni). `ModelsManager.cascadeRename` `giderler` ve `giderTanimlari`'daki `modelAd`'ı da taşır; özel model silme onayında bağlı gider sayısı gösterilir. `hesaplaGiderRaporu` dönüşüne `kovalar {makina, model, dagitma, ortak}` ve `modelBazli[] {model, kalemSayisi, tutar, adet, makinaBasina}` eklenir. | AC-82 bölme şartı tek yerde kurulursa testle sabitlenir; silmede alanı temizlemek çöpten geri almayı bozardı (K3 ile aynı gerekçe). | AC-84'ün "ortak gidere döner" ifadesi mantıksaldır, fiziksel değil. Standart modeller silinemediği için AC-84 yalnız özel modellerde test edilir. |
| K27 | *P3 ile geçersiz: birim maliyeti artık kullanıcı girer (R21, AC-79); yerine K34.* **Makina başına tutar** (`tutar / modelAdet`) yalnız gösterimdir; motorda saklanmaz, `modelBazli[]` içinde hesaplanır. Aynı modele birden fazla kalem atanmışsa `adet` toplanmaz, kalem bazında gösterilir; model satırı yalnız toplam tutarı ve kalem sayısını verir. | R21: adet alım anındaki niyettir ve kalemler arası toplanması anlam taşımaz (bir fatura 35 makinalık bant, diğeri 20 makinalık vida). | Model satırında tek bir "makina başına" rakamı yok; kalem detayında var. |
| K28 | **Çalışan silinirken açık tanım** (`bitisAy` boş veya bugünkü aydan büyük): onay diyaloğu tanımı anar; onaylanınca tanım silinmez, `bitisAy = max(uretilenAylar)` yapılır. **Hiç üretilmemişse** `bitisAy` başlangıç ayının bir öncesine çekilir (boş aralık), tanım listesinde "Üretilmeden kapatıldı" görünür. Çalışan çöpten geri alınırsa tanım kendiliğinden açılmaz. | Spec "son üretilen ay" diyor ama hiç üretim yoksa bir değer gerekir; başlangıç ayını bırakmak o ayın sonradan üretilmesine yol açardı. | Geri dönen çalışan için kullanıcı tanımın bitişini elle açar. |
| K29 | **Personel mükerrer uyarısı** (C17 istisnası, AC-66): form, aynı `calisanId` ve aynı `YYYY-MM` için silinmemiş kalem varsa formun içinde uyarı gösterir; Kaydet düğmesi açık kalır. | Spec engel istemiyor, uyarı istiyor. | — |
| K30 | **Borç özeti** (R19) üç satır türü taşır: tedarikçi (ad ad), "Tedarikçi seçilmemiş" (personel dışı, tedarikçisiz ödenmemiş kalemler; tutarı sıfırsa satır yok) ve "Çalışanlar · N kişi" (kapalı). Kapsam **dönemden bağımsız**, `yururlukAy` ile `bugun` arası (`tarih <= bugun`). Sıralama tutara göre çoktan aza. | R19 iki kaynağı sayıyor ama tedarikçisiz borcu dışarıda bırakmak "kime ne kadar borçluyuz" toplamını eksik gösterirdi; R15'in kırılımda yaptığını özet de yapar. İleri tarihli kalem R14'ün "bugüne kadar" sınırı gereği dışarıda. | İleri tarihli ödenmemiş fatura, tarihi gelene kadar özette görünmez. Bu, spec metninin doğrudan sonucudur. |

### 1c. P3 kararları (onaylı, 2026-09-23; spec R10/R11)

| # | Karar | Gerekçe | Bedel |
|---|---|---|---|
| K31 | **Model dağılımı alt kayıttır**: kalem `modelSatirlari: [{modelAd, birimMaliyet, adet}]` taşır; SQLite'ta alt tablo `gider_model_satirlari (gider_id, modelAd, birimMaliyet, adet, sort_order)`, `yedek_parca_tahsis` deseni: satır kendi id'sini taşımaz, kalemle birlikte silinip yeniden yazılır, okumada kaleme dizi olarak takılır. `atamaTur === "model"` iken en az bir satır zorunlu. K25'teki `modelAd`, `modelAdet` kolonları **açılmaz**. | C12 bunu açıkça istiyor; projede kanıtlanmış desen var (bkz. §0 P3). Satıra id vermek `db.cjs:590`'daki hatayı tekrarlar. | Satır düzeyinde birleştirme yok: iki kullanıcı aynı kalemin satırlarını aynı anda değiştirirse son yazan kazanır (C15 ile aynı kabul). |
| K32 | **Satır doğrulaması** saf `modelSatirlariDogrula(tutar, satirlar)`: adet **tamsayı** ve > 0 (AC-91); birim maliyet > 0; aynı model ikinci kez yok, karşılaştırma `trLower` ile (AC-88); satır toplamı kalem tutarını **aşarsa hata** ve aşan tutar döner (AC-90b); **eksikse uyarı** ve fark döner, kayıt engellenmez (AC-90). Tüm karşılaştırmalar **kuruş tamsayısı** üzerinden (`Math.round(x*100)`). | Spec birim maliyetin sıfır olup olamayacağını söylemiyor; 0 birimli satır tutar üretmez ama adet taşır ve 0002'yi yanıltır. Adet "kaç makinalık" olduğu için kesirli olamaz. Kayan noktada 3 × 33.333,33 gibi toplamlar sahte "aşım" üretirdi. | Birim 0 ve kesirli adet reddedilir; spec'e not olarak işlenmeli. |
| K33 | **Kova bölmesi tutar bazlıdır** (K26'yı değiştirir): `kovaDagilimi(kalem, ctx)` → `{makina, model, dagitma, ortak}` **tutarları** döner. Makina ve dağıtılmasın kalemin tamamını alır; model kovası **canlı modelli** satırların toplamını alır, kalan (dağıtılmayan kısım + ölü model satırları) ortak kovaya gider. Kira ve personel davranışlı kalem kayıtta ne yazarsa yazsın tamamen ortaktır (AC-78). AC-82 testi kuruş düzeyinde eşitlik ister. | AC-80 ve AC-82 kısmi dağıtımda aynı kalemin iki kovaya bölünmesini istiyor; kalem bazlı `kovaBelirle` bunu ifade edemez. Davranışa göre zorlamak, olası bozuk veride bile kovaları doğru tutar. | Dönem raporunda "11 kalem" gibi kova adetleri artık anlamsız; kovalar tutar ve **katkı yapan kalem sayısıyla** gösterilir. |
| K34 | **Model bazlı çıktı** (K27'nin yerine): `modelBazli[] = {model, toplam, satirlar:[{kalemId, tarih, aciklama, birimMaliyet, adet, tutar}]}`. Farklı kalemlerin adetleri **toplanmaz**; "kaç makinalık" ve "makina başına" bilgisi satır düzeyinde kalır. | R8 model bazlı toplamda adet ve makina başına tutar istiyor, ama bant için 35 makinalık ile vida için 20 makinalık satırın toplanmış adedi (55) hiçbir şey ifade etmez. R21 de "0002 bu satırları olduğu gibi kullanmak zorunda değildir" diyor. | **Spec notu gerekiyor:** R8'deki "model bazlı toplam (model, kaç makinalık adedi, makina başına düşen tutar)" ifadesi satır düzeyinde karşılanıyor; 0002 bu biçimi tüketecek şekilde yazılmalı. |
| K35 | **Model zinciri satır düzeyinde**: `ModelsManager.cascadeRename` hem `giderler[].modelSatirlari[].modelAd` hem `giderTanimlari[].modelSatirlari[].modelAd` alanlarını taşır (AC-83). Özel model silinince (çöpe) **yalnız o modelin satır tutarı** okuma anında ortak kovaya düşer, kalemin diğer satırları modelde kalır; geri alınınca döner. Silme onayındaki sayı = o modeli içeren kalem sayısı + tanım sayısı (AC-84). | K3/K26 deseninin satıra indirgenmiş hâli; alanı fiziken temizlemek çöpten geri almayı bozardı. | AC-84'ün "kalemler ortak gidere döner" ifadesi çok satırlı kalemde "o satırın tutarı döner" olarak okunur. |
| K36 | **Tekrarlayan tanımda model satırları JSON TEXT** (`gider_tanimlari.modelSatirlari`), alt tablo değil; üretimde kaleme derin kopyalanır (AC-85) ve üretilen kalem bundan sonra kendi alt tablosunu taşır. | Tanım satırları raporlanmaz, tek başına birleştirilmez; C12 alt kayıt şartını **kalem** için koyuyor. `uretilenAylar` zaten aynı biçimde saklanıyor. | Tanım ile kalem farklı saklama biçimi kullanır; roundtrip testi ikisini ayrı sabitler. |
| K37 | **Aylık standart genel gider** (R22) yeni bölüm `standartGiderler` (id'li, **kalıcı silme**, `MERGE_KEYS`), tablo `standart_giderler (id, grupId, ad, tutar, baslangicAy, bitisAy)`. **Sürüm modeli:** tutar değişikliği her zaman yeni satırdır (aynı `grupId`), önceki satırın `bitisAy`'ı yeni başlangıcın bir önceki ayına çekilir; yeni başlangıç, açık sürümün başlangıcından büyük olmak zorundadır (AC-96). **Ad değişikliği** grubun tüm sürümlerine yazılır, sürüm üretmez. **Yanlış giriş**: "son sürümü geri al" son satırı kalıcı siler ve öncekinin `bitisAy`'ını boşaltır. **Sona erdir**: açık sürüme `bitisAy` yazar. Grup silme onaylı ve kalıcı (R12, AC-92). Motor: `standartGiderAyi(liste, "YYYY-MM")` 0002 için; `hesaplaGiderRaporu` bu listeyi **parametre olarak hiç almaz**, böylece AC-93 yapısal olarak sağlanır. Yeri: Giderler sekmesinde dördüncü alt görünüm "Standart Genel Giderler", kalıcı açıklama satırıyla (AC-95). | Spec "eski satır üzerine yazılmaz" diyor ama yanlış yazılmış bir tutarı düzeltmenin yolunu söylemiyor; üzerine yazmaya izin vermek AC-96'yı delerdi, geri al işlemi ise geçmişi bozmadan düzeltme sağlar. `grupId` olmadan aynı kalemin sürümleri ad eşleşmesine kalırdı. | Aynı ay içinde iki tutar olamaz; ayın ortasındaki değişiklik bir sonraki aydan geçerli girilir. |
| K38 | **Atama yalnız normal davranışta**: formda tür kira veya personel ise atama bölümü **hiç çizilmez** ve kayıt anında `atamaTur`, makina alanları ve `modelSatirlari` boşaltılır (AC-78). Tekrarlayan tanımda da aynı kural. `standartGiderler` ve model satırları için izin: `gider_tanim` (K22 tanım yönetimi) standart listeyi yönetir; `SECTION_GROUP.standartGiderler = giderActions`, `BOLUM_SEKMELERI.standartGiderler = ["gider"]`, `EYLEM_IDLERI.standartGiderler` ekle/sil `gider_tanim`, K6 aynası bu bölümü de kapsar. | Spec kira ve personeli her zaman ortak sayıyor; alanı göstermek kullanıcıyı işe yaramayacak bir seçime davet ederdi. Standart liste bir bütçe tanımı, kalem değil. | C6'nın üç parçası korunur, yeni eylem kimliği açılmaz. |

---

## 2. Veri modeli (spec'in C5/C12'sine karşılık)

Alan adları öneridir; geliştirici mevcut adlandırma diliyle (Türkçe, camelCase) kalır.

**`giderler`** (yeni `BLOB_SECTIONS` bölümü, id'li, soft-delete, `MERGE_KEYS`), tablo `giderler`:
- ortak: `id, tarih, turId, aciklama, tedarikciId, tutar` (KDV hariç, kira için brüt; personelde boş, K19), `kdvOrani`,
  `odemeYontemi` (boş = belirtilmemiş, K24), `sonOdemeTarihi`, `odendi` (INTEGER 0/1, `toInt`/`toBool`), `odemeTarihi`, `deletedAt`
- kira: `stopajOrani, girisYonu ("brut"|"net"), netTutar`
- personel: `calisanId, calisanAd` (ad kopya), `resmiTutar, eldenTutar` (K19)
- tekrarlayan: `tanimId, donem ("YYYY-MM")`
- atama (K25, K38; yalnız normal davranış): `atamaTur`, `makinaTur, makinaId`
- model dağılımı (K31): alt tablo `gider_model_satirlari (gider_id, modelAd, birimMaliyet, adet, sort_order)`; blob'da kalemin
  `modelSatirlari: [{modelAd, birimMaliyet, adet}]` dizisi. Satır kendi id'sini taşımaz, kalemle birlikte silinip yeniden yazılır.

**`giderTanimlari`** (yeni bölüm, id'li, **kalıcı silme**, `MERGE_KEYS`), tablo `gider_tanimlari`:
`id, turId, ad, tutar, kdvOrani?, baslangicAy, bitisAy?, calisanId?, girisYonu?, tedarikciId?` (K17),
`atamaTur, makinaTur?, makinaId?`, `modelSatirlari` (JSON TEXT, K36; AC-85), `odemeYontemi?`, `uretilenAylar` (JSON TEXT).

**`giderTurleri`** (yeni bölüm, meta-JSON, `calisanlar` deseni, kalıcı silme):
`{id, ad, davranis: "normal"|"kira"|"personel"}`. Kullanımda kontrolü K13.

**`tedarikciler`** (yeni bölüm, id'li, **kalıcı silme**, `MERGE_KEYS`), tablo `tedarikciler` (K16):
`id, ad` (zorunlu, benzersiz), `yetkili, telefon, eposta, vergiDairesi, vergiNo, adres, not`.

**`standartGiderler`** (yeni bölüm, id'li, **kalıcı silme**, `MERGE_KEYS`), tablo `standart_giderler` (K37):
`id, grupId, ad, tutar` (KDV hariç, TL), `baslangicAy, bitisAy?` ("YYYY-MM"). Aynı `grupId` = aynı kalemin sürümleri; bir grupta
en fazla bir açık (`bitisAy` boş) satır olur ve sürümlerin ay aralıkları çakışmaz.

**`calisanlar[]`**: `resmiMaliyet`, `eldenMaliyet` (meta-JSON, migration yok; K20).

**`appSettings.giderAyarlari`**: `{stopajOrani, yururlukAy, varsayilanResmiMaliyet}`; `app_settings.giderAyarlari TEXT` JSON dört nokta kuralı
(`calismaSaatleri` deseni); `AYAR_ALAN_SEKMELERI.giderAyarlari: ["settings"]`; `disAppSettingsSuz` kara listesine GİRMEZ (sunucu-paylaşımlı).

---

## 3. Değişecek ve eklenecek dosyalar

### Saf motor ve tipler
- `src/lib/gider.js` (yeni): `kiraHesapla`, `kalemTutari`, `odenecekTutar` (K18), `giderKalemDogrula`, `tekrarlayanUret`,
  `hesaplaGiderRaporu`, `kdvKarsilastir`, `makinaGideriCoz`, `kovaDagilimi` (K33), `modelSatirlariDogrula` (K32), `standartGiderAyi` (K37), `tedarikciKirilimi`, `borcOzeti` (K30),
  `vadesiGectiMi` (K24), `personelMukerrerMi` (K29), `yururlukKapsami`. React yok, TL dışı yok, tarih karşılaştırması string.
  - `giderKalemDogrula` hata sınıfları: tür yok, tutar sayı değil, tutar ≤ 0 (personelde bileşen toplamı; negatif bileşen ayrı hata),
    `sonOdemeTarihi < tarih` (AC-71), model atamasında satır yok veya `modelSatirlariDogrula` hatası (AC-88, AC-90b, AC-91).
  - `modelSatirlariDogrula(tutar, satirlar)` → `{hatalar[], dagitilan, fark, asim}`; fark > 0 uyarıdır (AC-90), aşım hatadır (AC-90b).
  - `hesaplaGiderRaporu` dönüşü (R8 + 0002 girdisi): `turKirilimi[]` (personel satırı çalışan ayrıntısıyla), `toplam, odenen,
    odenmeyen` (KDV hariç), `stopajToplam, indirilecekKdv, kovalar {makina, model, dagitma, ortak} (tutar bazlı, K33), makinaBazli[], modelBazli[] (K34),
    dagitmaKalemleri[], tedarikciKirilimi[]` (harcama KDV hariç + açık borç, AC-47 sıralı, "seçilmemiş" grubu ayrı), `mukerrerUyari[],
    kapsamDisiNot, bos, yururlukOncesi`.
  - `borcOzeti(giderler, ctx, bugun)` → `[{tur:"tedarikci"|"secilmemis"|"calisanlar", ad, tutar, vadesiGecti, ayrinti[]}]`.
  - `kdvKarsilastir(hesaplananKdvObj, indirilecekTL)` → `{hesaplananTL, indirilecek, fark, devreden, haricTutarlar[]}` (AC-14/15/29).
- `src/lib/constants.js`: `GIDER_DAVRANISLARI`, `GIDER_AYARLARI_VARSAYILAN` (`varsayilanResmiMaliyet` boş), `GIDER_ODEME_YONTEMLERI`,
  `GIDER_ATAMA_TURLERI`.
  - `standartGiderAyi(liste, ay)` → o ayda geçerli satırlar ve toplam; yalnız 0002 tüketir. `hesaplaGiderRaporu` bu listeyi almaz (AC-93).
- `src/types.d.ts`: `Gider`, `GiderModelSatiri`, `GiderTanimi`, `GiderTuru`, `Tedarikci`, `StandartGider`.

### Kalıcılık omurgası
- `electron/db.cjs`: beş tablo (`giderler`, `gider_model_satirlari` alt tablo + `gider_id` indeksi, `gider_tanimlari`, `tedarikciler`,
  `standart_giderler`; CREATE + `applyColumnMigrations` + INSERT + SELECT),
  `giderTurleri` meta satırı, `app_settings.giderAyarlari`, `skip` koruması (tablo atlama bütünlüğü). `calisanlar` meta-JSON'u
  yeni alanları kendiliğinden taşır, roundtrip testi yine eklenir.
- `electron/serverAuth.cjs`: `BLOB_SECTIONS` (+5), `SECTION_GROUP` (beşi de `giderActions`, K22, K38), `BOLUM_SEKMELERI` (K23),
  `IZIN_GRUPLARI` + `giderActions`, `EYLEM_IDLERI` (K22), `AYAR_ALAN_SEKMELERI.giderAyarlari`, K6 aynası (beş bölüm).
- `electron/server.cjs`: `BOLUM_ADLARI` → `giderler: "Giderler"`, `giderTanimlari: "Tekrarlayan Giderler"`, `giderTurleri: "Gider Türleri"`,
  `tedarikciler: "Tedarikçiler"`, `standartGiderler: "Standart Genel Giderler"`.
- `src/lib/merge.js`: `MERGE_KEYS` + `giderler`, `giderTanimlari`, `tedarikciler`, `standartGiderler`. `modelSatirlari` kalemin içinde
  taşınır (tahsis deseni), ayrı anahtar değildir.
- `src/lib/permissions.js`: `READONLY_SERVER_PERMISSIONS` + `giderActions: []`.
- `src/App.jsx`: beş state + `live*` memo; yükleme, `purgeOldTrash(giderler)`; kayıt yükü + bağımlılık dizisi; otomatik yedek yükü;
  `mergeLocalIntoReloaded` dört `apply`; `TABS` + `{id:"gider", label:"Giderler"}`; `visibleTabs` C6 kural 3 istisnası; `giderYetki`;
  yeni sekme render; Settings/Finance/Customers/Stock prop geçişleri (Settings'e `setGiderler`/`setGiderTanimlari` model zinciri ve
  çalışan silme için).
- `src/components/settings/SettingsBackup.jsx`: dışa aktarma nesnesi, geri yükleme `sec(...)` dalı, bölüm listesi (+ tedarikçiler).

### İzin katmanı
- `src/components/settings/serverPermissionDefs.js`: `ALL_TABS` + `gider`; `GIDER_ACTION_GROUPS` üç alt grupla (Kalem işlemleri,
  Tanım yönetimi, Tedarikçi yönetimi; K22); `parseGiderActionsPerms`. `DEFAULT_USER_TABS` **değişmez**.
- `src/components/settings/UserManager.jsx`: "Gider işlemleri" akordeonu (üç alt başlık) + özelleştir anahtarı, izin JSON'una `giderActions`.

### Arayüz
- `src/components/Giderler.jsx` (yeni üst sekme), üç alt görünüm:
  - **Dönem Raporu**: dönem seçici (ay / aralık), stat kartları ("Ödenmemiş gider (KDV hariç)" ile "Tedarikçilere açık borç (KDV dâhil)"
    ayrı başlıklarla, AC-13), dört kova şeridi (AC-82), tür kırılımı (personel satırı kapalı, K21), KDV karşılaştırması, tedarikçi
    kırılımı, **borç özeti** yan paneli (K30), kalem listesi (personel kalemleri kapalı grup, K21; ödeme yöntemi ve vade sütunu;
    atama sütunu), "tekrarlayan kalemleri oluştur" (adetli bildirim), boş/yürürlük öncesi/kapsam dışı durumları, mükerrer uyarısı.
  - **Makina ve Model**: tutar bazlı dört kova (K33), makina bazlı, model bazlı (K34, satır ayrıntılı), dağıtılmayan kalemler,
    modellere kısmi dağıtılmış kalemlerin ortak kalan kısmı, ortak gidere düşen atamalar (ölü makina ve model satırları).
  - **Tedarikçiler**: liste + form (ad zorunlu, benzersiz), kullanımdaki tedarikçi silme engeli (AC-44).
  - **Standart Genel Giderler** (K37): grup başına açık sürüm, sürüm geçmişi, "Tutarı değiştir" (yeni geçerlilik ayı sorar),
    "Son sürümü geri al", "Sona erdir", grup silme; kalıcı açıklama satırı "Bu tutarlar maliyet hesabı içindir, dönem gider raporuna
    girmez." (AC-95). Düğmeler `canDo("gider_tanim")` ile.
  - Butonlar `canDo("gider_*")` / `canDo("tedarikci_*")` ile gizlenir.
- `src/components/GiderForm.jsx` (yeni): tek form (ekle/düzenle). Tür davranışına göre: kira (brüt/net yön, stopaj, hesap özeti,
  "tedarikçiye ödenecek" satırı), personel (çalışan, resmi + elden, toplam, C19 kapatılamaz notu, KDV alanı ve tedarikçi alanı yok,
  mükerrer uyarısı). Ortak alanlar: tedarikçi seçici (personel hariç), ödeme yöntemi, son ödeme / çek vade tarihi. **Yalnız normal
  davranışta** atama seçici (K25, K38): makina seçici (Makina Stoğu + müşteri makinaları) veya **model satırları tablosu** (K31: model,
  birim maliyet, adet, satır toplamı; satır ekle/sil; altta "Dağıtılan / Kalem tutarı / Fark → ortak gider" özeti, aşımda kırmızı
  hata ve Kaydet kapalı, eksikte sarı bilgi). KDV oranı
  `getKdvRateForDate(tarih, kdvRates)` ile ön dolar (C4).
- `src/components/settings/GiderTurManager.jsx` (yeni): davranış seçimli tür listesi; kullanımdaki türde davranış kilitli (K13);
  silmede aynı davranışa taşıma diyaloğu veya engel (K12).
- `src/components/settings/SettingsGiderTanimlari.jsx` (yeni): tekrarlayan tanımlar (tedarikçi ve atama alanlarıyla); K8 kısayolu;
  `uretilenAylar` salt görünür; K28 ile kapatılmış tanım rozeti.
- `src/components/settings/SettingsGider.jsx` (yeni): stopaj varsayılanı, yürürlük ayı, eşik altı kalem sayısı uyarısı (AC-33).
- `src/components/Settings.jsx`: `SETTINGS_GROUPS`'a **"Giderler"** grubu → `gidertur`, `gidertanim`, `giderayar`; grup `giderYetki` ile süzülür (K7).
- `src/components/CalisanManager.jsx`: resmi ve elden sütunları, varsayılan resmi maliyet kutusu (K20), yeni çalışanda ön doldurma
  (AC-52), silme onayında açık tanım bildirimi ve kapatma (K28); maliyet ile ilgili her şey `giderYetki` yoksa çizilmez.
- `src/components/ModelsManager.jsx`: `cascadeRename` + `giderler[].modelSatirlari[]` / `giderTanimlari[].modelSatirlari[]` `modelAd` (K35); özel model silme onayında bağlı gider
  sayısı (AC-83, AC-84).
- `src/components/Finance.jsx`: `raporAy`'a bağlı "KDV Karşılaştırması" kartı, yalnız `giderYetki` ile (AC-30, K1, K10, K15).
- `src/components/Customers.jsx` (`confirmDel`) ve `src/components/stock/MakinaStokTab.jsx` (`confirmDel`): onay metninde bağlı gider sayısı (R7).
- `src/components/settings/SettingsTrash.jsx`: gider satırları geri al / kalıcı sil, `emptyTrash`; `giderYetki` yoksa satır çizilmez (K7).
- `src/components/settings/SettingsAuditLog.jsx`: `ENTITY_LABELS` + `gider`, `gider_tanim`, `gider_tur`, `tedarikci: "Tedarikçi"`,
  `standart_gider: "Standart Genel Gider"`; `ACTION_LABELS` + `tekrar_uretildi`, `tur_tasindi`, `tanim_kapatildi: "Tanım Kapatıldı"`,
  `surum_eklendi: "Yeni Tutar Sürümü"`, `surum_geri_alindi: "Sürüm Geri Alındı"`, `sona_erdirildi: "Sona Erdirildi"`.
- `CLAUDE.md`: yeni veri sınıfları, `giderActions` boyutu ve alt grupları, C6 istisnası ve K6 aynası, K3/K26/K35 okuma-anı çözümü, tutar bazlı kova bölmesi (K33), standart genel giderin rapora girmemesi (K37),
  iki ödeme yöntemi listesinin ayrımı (K24), C7b sınırı.

### Kapsam dışı olduğu için DOKUNULMAYAN dosyalar
`SettingsExport.jsx` (X16), `printTemplates.js` / `aylikRapor.js` (X14 ve C10: motor yalnız **okunur**), `ServisPencere.jsx`
(pano gider görmez), `GlobalSearch.jsx` (gider ve tedarikçi indekslenmez; R11 kaçağı olmasın), `ServiceForm.jsx` (X15),
`constants.js ODEME_YONTEMLERI` (K24).

---

## 4. Adım sırası (katman katman)

1. **Saf motor + motor testleri** (`gider.js`, `tests/gider.test.js`). Hesap kriterlerinin tamamı ekran yokken sabitlenir:
   ödenecek tutar, tutar bazlı dört kova, model satırı doğrulaması, tedarikçi kırılımı, borç özeti, vade, personel bileşenleri,
   standart genel gider sürüm seçimi.
2. **Kalıcılık omurgası**: db.cjs → serverAuth.cjs → server.cjs → merge.js → permissions.js → App.jsx kablolaması → SettingsBackup.
   Testler: `db-roundtrip.cjs`, `db-clean-install.cjs`, `server-authz.test.js`, `merge.test.js`. Bu adım bitmeden ekran yazılmaz.
3. **İzin boyutu ve sekme istisnası**: serverPermissionDefs → UserManager → App `visibleTabs`. C6 kural 3 + K6 + K22 testleri.
4. **Ayarlar ekranları**: türler, tekrarlayan tanımlar, gider ayarları, çalışan maliyeti ve silme, model zinciri.
5. **Giderler sekmesi ve form**: dönem raporu, kalem listesi, borç özeti, makina ve model görünümü, tedarikçiler, standart genel
   giderler, model satırları tablosu, üretim, işlem geçmişi.
6. **Finans kartı, çöp kutusu, silme onayı sayaçları** (müşteri, makina stoğu, özel model).
7. **Uçtan uca** (`server-security.cjs`) + gerçek uygulama turu ile `docs/evidence/0001-ac<n>.png` (boş durum, yetkisiz görünüm dâhil,
   personel ekranları uydurma veriyle). `npm run lint` hata 0, `npm test` yeşil, CLAUDE.md, SCORECARD. Commit ve sürüm yalnız açık talimatla.

---

## 5. Kabul kriteri ↔ test eşlemesi

Test adları `AC-<n>: <metin>` biçiminde yazılır.

| Kriter | Test dosyası | Kanıt biçimi |
|---|---|---|
| AC-1 | `tests/ui/giderler.test.jsx` | form kaydı → o ayın raporunda satır |
| AC-2 | `tests/gider.test.js` + `tests/ui/giderler.test.jsx` | `giderKalemDogrula` hata sınıfları (personelde bileşen toplamı, negatif bileşen); ekranda uyarı, kayıt yok |
| AC-3 | `tests/gider.test.js` | 10.000 / %20 → KDV 2.000, ödenecek 12.000, gider toplamına 10.000 |
| AC-4, AC-5, AC-26 | `tests/gider.test.js` | `kiraHesapla` brüt ve net yönü; stopaj 4.000, net 16.000, KDV 4.000, nakit 20.000 |
| AC-6 | `tests/gider.test.js` | stopaj 0 satırı listede kalır, toplama 0 ekler |
| AC-7, AC-8, AC-22, AC-23, AC-24 | `tests/gider.test.js` | `tekrarlayanUret` eklenen/atlanan adetleri, ay aralığı, `uretilenAylar` |
| AC-8, AC-22 (bildirim) | `tests/ui/giderler.test.jsx` | bildirim metninde "n eklendi, m zaten vardı" |
| AC-9 | `tests/gider.test.js` + `tests/ui/giderler.test.jsx` | kalem düzenlenince tanım ve diğer ay kalemleri değişmez |
| AC-10, AC-49, AC-50 | `tests/gider.test.js` | `kalemTutari` = resmi + elden; boş bileşen 0 sayılır; dönem toplamına 50.000 |
| AC-11, AC-27 | `tests/gider.test.js` (`makinaGideriCoz`, `makinaBazli`) + `tests/ui/giderler.test.jsx` | stok → müşteri takibi, atanmamış yalnız dönem raporunda |
| AC-12, AC-13, AC-21 | `tests/gider.test.js` + `tests/ui/giderler.test.jsx` | kırılım = genel toplam; iki ayrı başlık ("Ödenmemiş gider (KDV hariç)", "Tedarikçilere açık borç (KDV dâhil)"); ödendi ikisinden de düşürür |
| AC-14, AC-15, AC-29 | `tests/gider.test.js` (`kdvKarsilastir`) + `tests/ui/finance-gider-kdv.test.jsx` | fark 38.000; USD notu; devreden etiketi |
| C10 çapraz | `tests/gider-kdv-capraz.test.js` | aynı ay için Finans kartı ile `hesaplaAylikRapor(...).toplamKdv` eşit |
| AC-16, AC-17, AC-31, AC-32 | `tests/gider.test.js` + `tests/ui/giderler.test.jsx` | yürürlük öncesi mesaj; boş durum; kapsam dışı yazı; eşik ayı dâhil |
| AC-18 (arayüz) | `tests/ui/app-gider-sekmesi.test.jsx` | user + tabs tanımsız → sekme yok; tabs gider'li → var; yerel mod → var |
| AC-18 (sunucu) | `tests/server-authz.test.js` + `scripts/tests/server-security.cjs` | dört bölüm için 403 / izinle 200; tabs'sız user 403 (K6); eylem kimlikleri (K22) |
| AC-19 | `tests/ui/settings-trash.test.jsx` | çöpte görünür, geri alınca aynı tutarla raporda; `giderYetki` yoksa satır yok |
| AC-20, AC-35, AC-36 | `tests/ui/gider-settings.test.jsx` | taşıma listesi yalnız aynı davranış; hedef yokken silme engellenir; kullanımdaki türün davranışı kilitli, adı değişir |
| AC-25 | `tests/ui/giderler.test.jsx` | "Brüt girildi" / "Net girildi" rozeti |
| AC-28 + R7 | `tests/gider.test.js` + `tests/ui/customers-delete-cascade.test.jsx` + `tests/ui/stock-makina-delete.test.jsx` (yeni) | onay metninde gider sayısı; motorda ortak gidere düşme; kayıt silinmez |
| AC-30, AC-38 | `tests/ui/finance-gider-kdv.test.jsx` | yetkisizde kart yok, eski kart var; kısmi aralıkta kart var, aralığı anan açıklama |
| AC-33 | `tests/ui/gider-settings.test.jsx` | eşik ileri alınınca kalemler korunur, uyarı sayısı doğru |
| AC-34 | `tests/gider.test.js` + `tests/ui/giderler.test.jsx` | mükerrer uyarı listesi |
| AC-37, AC-54 | `tests/ui/gider-form.test.jsx` | yalnız boş bileşen dolar, dolu ezilmez; çalışan kaydı değişmez; maliyetsiz çalışanda alan boş ve kayıt reddedilir |
| AC-39, AC-63, AC-67 | `tests/gider.test.js` (`tedarikciKirilimi`) | "seçilmemiş" grubu; kırılım toplamı = personel dışı toplam; hiç tedarikçi yokken yalnız grup |
| AC-40, AC-62 | `tests/ui/tedarikciler.test.jsx` | boş ad ve aynı ad (harf farkı dâhil) reddedilir, neden yazılır |
| AC-41, AC-42, AC-43, AC-61 | `tests/gider.test.js` (`odenecekTutar`, `tedarikciKirilimi`) | 12.000; 18.000 → 6.000; kira brüt ve net girişte 20.000 |
| AC-44, AC-45 | `tests/ui/tedarikciler.test.jsx` | kullanımdaki (çöp dâhil) silinmez, sayı bildirilir; kullanılmayan silinir |
| AC-46 | `tests/ui/tedarikciler.test.jsx` | ad değişince kalem listesinde yeni ad |
| AC-47 | `tests/gider.test.js` | tutar çoktan aza, eşitlikte Türkçe alfabetik |
| AC-48, AC-55, AC-74 | `tests/ui/app-gider-sekmesi.test.jsx` + `tests/ui/calisan-manager.test.jsx` | yetkisizde tedarikçi, borç özeti, çalışan tutarları ve elden bileşen hiç çizilmez |
| AC-51, AC-72 | `tests/ui/giderler.test.jsx` | personel satırı ve "Çalışanlar" satırı kapalı başlar; açılınca resmi/elden ayrı, toplam eşit |
| AC-52, AC-53 | `tests/ui/calisan-manager.test.jsx` | yeni çalışanda resmi varsayılandan dolar; varsayılan değişince mevcutlar ve kalemler değişmez |
| AC-56 | `tests/gider-gizlilik.test.js` | yazdırma şablonları ve dışa aktarma satır üreticileri personel alanlarını hiç okumaz (örnek veriyle çıktı taraması) |
| AC-57, AC-58 | `tests/ui/gider-form.test.jsx` | personel türünde kapatılamaz not; ayrı SGK kalemi yine kaydedilir |
| AC-59 | `tests/gider.test.js` | önceki dönem ödenmemiş kalem bugünkü dönemde açık borçta |
| AC-60, AC-64 | `tests/ui/gider-form.test.jsx` + `tests/gider.test.js` | personelde tedarikçi ve KDV alanı yok; kırılımda yer almaz; indirilecek KDV'ye 0 |
| AC-65 | `tests/ui/calisan-manager.test.jsx` + `tests/gider.test.js` | silme onayında bildirim; tanım `bitisAy` = son üretilen ay; sonraki ay üretilmez |
| AC-66 | `tests/ui/gider-form.test.jsx` | aynı çalışan ve ayda uyarı; devam edilince kayıt |
| AC-68, AC-69 | `tests/ui/gider-form.test.jsx` | "Belirtilmemiş"; Çek'te etiket değişir, yöntem değişince tarih korunur, ikinci alan yok |
| AC-70, AC-71, AC-86 | `tests/gider.test.js` (`vadesiGectiMi`, `giderKalemDogrula`) | boş vade işaretlenmez; vade < tarih reddedilir; geçmiş vade işaretlenir, ödenince kalkar |
| AC-73 | `tests/gider.test.js` (`borcOzeti`) | ödendi → borç azalır; sıfırlanan taraf özetten düşer, kırılımda kalır |
| AC-75, AC-80, AC-81, AC-82, AC-90 | `tests/gider.test.js` (`kovaDagilimi`) | dört kova tutar bazlı tam bölme (kuruş eşitliği); kısmi dağıtımda kalan ortak kovada; dağıtılmayan ayrı toplam; kira ve personel her zaman ortak |
| AC-76, AC-77, AC-78 | `tests/ui/gider-form.test.jsx` | seçim değişince diğer atama temizlenir ve bilgi satırı; kira ve personel türünde atama bölümü hiç yok |
| AC-79, AC-87, AC-88, AC-89, AC-90b, AC-91 | `tests/gider.test.js` (`modelSatirlariDogrula`) + `tests/ui/gider-form.test.jsx` | 4.000 × 35 = 140.000; iki model satırı; aynı model ikinci satır reddi; 5+40+25 adet × 1.000 = 70.000 farksız; aşımda kayıt yok ve aşan tutar; adet 0/boş/negatif ve kesirli reddi (K32) |
| AC-83, AC-84 | `tests/ui/models-manager-gider.test.jsx` + `tests/gider.test.js` | yeniden adlandırmada kalem ve tanım satırları yeni adla; özel model silme onayında sayı; çöpteki modelin yalnız kendi satır tutarı ortağa düşer, geri alınınca döner (K35) |
| AC-85 | `tests/gider.test.js` | tanımdaki model/dağıtılmasın ve tedarikçi üretilen kaleme kopyalanır |
| R12 | `tests/ui/gider-settings.test.jsx` + `tests/ui/tedarikciler.test.jsx` + `tests/ui/standart-giderler.test.jsx` | tür, tanım, tedarikçi ve standart genel gider silme çöpe düşmez |
| AC-92, AC-95, AC-96 | `tests/ui/standart-giderler.test.jsx` + `tests/gider.test.js` (`standartGiderAyi`) | ekle, adı değiştir, sil; kalıcı açıklama satırı; tutar değişince yeni sürüm, eski sürüm kendi ayında geçerli; son sürümü geri al (K37) |
| AC-93 | `tests/gider.test.js` | `hesaplaGiderRaporu` imzası standart listeyi almaz; aynı veriyle standart liste doluyken ve boşken rapor çıktısı birebir aynı |
| AC-94 | `tests/ui/app-gider-sekmesi.test.jsx` | yetkisizde Standart Genel Giderler görünümü ve verisi hiç çizilmez |
| C5 kalıcılık | `scripts/tests/db-roundtrip.cjs`, `scripts/tests/db-clean-install.cjs`, `tests/merge.test.js`, `tests/server-authz.test.js`, `tests/server-permission-defs.test.js` | alan roundtrip (odendi bool, uretilenAylar JSON, giderAyarlari JSON, resmi/elden, atama alanları, tedarikçi, **model alt satırları sırası ve kalem silinince satırların silinmesi**, tanımda modelSatirlari JSON, standart gider sürümleri), tablo atlama, MERGE_KEYS, SECTION_GROUP / BOLUM_SEKMELERI kapsamı, yeni boyut |
| C13 | `tests/ui/giderler.test.jsx` | `logAction` çağrıları; yeni anahtarlar etiket haritasında |

---

## 6. Bilinen tuzaklar (geliştiriciye not)

- Dört nokta kuralı: `SCHEMA_SQL` + `applyColumnMigrations` + INSERT + SELECT. INTEGER boolean `...rest` ile gelmez, `toBool` şart.
- Beşli kural: `BLOB_SECTIONS` + `SECTION_GROUP` + `BOLUM_SEKMELERI` + `MERGE_KEYS` + `App.mergeLocalIntoReloaded`. Biri eksikse
  kayıt "bir süre sonra" kaybolur (`calisanlar` böyle kayboldu). P3 ile beş bölüm var: `giderler`, `giderTanimlari`, `giderTurleri`, `tedarikciler`, `standartGiderler`.
- `giderTanimlari` Gider sekmesinden (üretim) **ve** Ayarlar'dan (tanım ekranı, çalışan silme) yazılır; `giderler` model zinciri için
  Ayarlar'dan da yazılır (K23).
- `tedarikciler` ve `standartGiderler` yalnız `gider` sekmesine bağlı; `settings`'e eklemek R13/R22'yi bozar.
- `gider_model_satirlari` alt satırına id verilmez (`db.cjs:590` dersi); kalem kaydında önce kalemin satırları silinir, sonra sırayla yazılır.
- Kova ve satır toplamları kuruş tamsayısıyla karşılaştırılır (K32); kayan noktada "aşım" hatası sahte çıkar.
- `hesaplaGiderRaporu`'na standart genel gider listesi **geçirilmez**; biri ileride "kolaylık" için eklerse AC-93 testi kırılmalı.
- `appSettings.giderAyarlari` `disAppSettingsSuz` kara listesine konmaz; konursa LAN'da ayar her açılışta geri gelmez.
- Ödeme yöntemi için yeni `GIDER_ODEME_YONTEMLERI`; tahsilat listesine Havale eklemek Finans ve aylık raporu değiştirir (K24).
- Personel kaleminde `tutar` saklanmaz (K19); her toplam `kalemTutari`, her borç `odenecekTutar` üzerinden.
- Para: `parseMoney` ile normalize, state'te ham sayı, ekranda `fmtCur`.
- Kimlikler `uid()` (rastgele sayısal), string UUID'ye geçilmez.
- Personel alanları hiçbir `printTemplates.js` ve `SettingsExport.jsx` üreticisine girmez; AC-56 testi bunu kalıcı sabitler.

---

## 7. Mockup revizyonu (P2)

Mockup tuvali P2'ye göre güncellendi (https://claude.ai/artifact/MQgRxtd8X3dhzqnqqRFHdc). Değişenler:

| Ekran | P2 değişikliği | Dayanak |
|---|---|---|
| Giderler · Dönem Raporu | Alt görünümler (Dönem Raporu / Makina ve Model / Tedarikçiler); iki ayrı borç başlığı; dört kova şeridi; tedarikçi kırılımı; borç özeti paneli; personel satırı ve kalemleri kapalı grup; ödeme yöntemi, vade, atama sütunları | R8, R13–R15, R17, R19, R20, R21, K21, K30 |
| Gider formu · kira | Tedarikçi, ödeme yöntemi, son ödeme tarihi, atama seçici; hesap özetinde "tedarikçiye ödenecek" ve "vergi dairesine (stopaj)" ayrımı | R1, R14, R18, K18, K25 |
| Gider formu · doğrulama | Çek vade tarihi etiketi ve vade < tarih hatası | AC-2, AC-69, AC-71 |
| Gider formu · personel | Resmi + elden, toplam; KDV ve tedarikçi alanı yok; C19 notu; mükerrer uyarısı | R5, C19, K19, K29 |
| Gider formu · model ataması (yeni) | Model + kaç makinalık + makina başına tutar; bilgi satırı | R21, AC-77…AC-79 |
| Makina ve Model | Model bazlı tablo, dağıtılmayan kalemler, ortak gidere düşenler (çöpteki makina ve model) | R8, R20, R21, K26, K27 |
| Tedarikçiler (yeni) | Liste, form (ad zorunlu, benzersiz), kullanımdaki tedarikçi silme engeli | R13, AC-40, AC-44, AC-62 |
| Özel durumlar | AC-38 metni; personel satırı açık hâli; borç özeti "Çalışanlar" açık hâli; tedarikçisiz dönem | AC-38, AC-51, AC-67, AC-72 |
| Silme onayları | Özel model silme onayında gider sayısı | AC-84 |
| Gider Türleri | Taşıma yalnız aynı davranış; hedef yoksa engel; kullanımdaki türde davranış kilidi | K12, K13 |
| Tekrarlayan Giderler | Tedarikçi ve atama sütunu; personel tutarı iki bileşenden; K28 kapatılmış tanım | K17, K8, K28, AC-85 |
| Firma Çalışanları | Resmi + elden sütunu; varsayılan resmi maliyet; silmede açık tanım bildirimi | R5, R16, K20, K28 |
| Kullanıcı izinleri | Gider işlemleri üç alt grup | C6, K22 |

### P3 için gereken mockup revizyonu (henüz yapılmadı)

| Ekran | Değişmesi gereken | Dayanak |
|---|---|---|
| Gider formu · kira, personel | Atama seçicisi kaldırılır; bu davranışlarda hiç çizilmez | AC-78, K38 |
| Gider formu · model ataması | Tek model + adet yerine model satırları tablosu (model, birim maliyet, adet, satır toplamı), satır ekle/sil, "Dağıtılan / Kalem tutarı / Fark → ortak gider" özeti; aşım hatası ve eksik bilgisi ayrı durumlar olarak | R21, AC-87…AC-91, K31, K32 |
| Giderler · Dönem Raporu | Kova şeridi tutar bazlı; kovalarda kalem sayısı yerine "katkı yapan kalem" dili; kısmi dağıtılmış kalemin iki kovada görünmesi | AC-80, AC-82, K33 |
| Makina ve Model | Model bazlı tablo satır ayrıntılı, adet toplamı yok; kısmi dağıtımın ortak kalan kısmı ayrı listede | K34 |
| Standart Genel Giderler (yeni) | Giderler sekmesinde dördüncü alt görünüm: grup listesi, açık sürüm, sürüm geçmişi, "Tutarı değiştir" diyaloğu (yeni geçerlilik ayı), "Son sürümü geri al", "Sona erdir", kalıcı açıklama satırı | R22, AC-92…AC-96, K37 |
| Tekrarlayan Giderler | Model atamalı tanım satırlarında çok satırlı model gösterimi; kira ve personel tanımlarında atama sütunu boş ve seçilemez | K36, K38 |
| Silme onayları | Özel model silme onayında "yalnız bu modelin satır tutarı ortağa döner" metni | K35 |

### Spec'e işlenmesi önerilen notlar (analist, P3)

- **R8 / K34:** "model bazlı toplam (model, kaç makinalık adedi, makina başına düşen tutar)" ifadesi, R21'in çok satırlı hâlinden sonra
  satır düzeyinde karşılanıyor; farklı kalemlerin adetleri toplanmıyor. 0002 bu biçimi tüketecek şekilde yazılmalı.
- **R21 / K32:** birim maliyetin 0 olamayacağı ve adedin tamsayı olduğu spec'te yazılı değil; plan bunu kural olarak koyuyor.
- **R22 / K37:** yanlış girilmiş tutarın düzeltme yolu spec'te yok; plan "son sürümü geri al" işlemini öneriyor. Ay içinde iki tutar
  olamayacağı da açıkça yazılmalı.
- **AC-84 / K35:** çok satırlı kalemde "kalemler ortak gidere döner" ifadesi "silinen modelin satır tutarı ortak gidere döner" olarak
  netleştirilmeli.

---

## 8. Uygulama notları (2026-09-23)

- **Plandan sapma yok; iki ek karar:**
  - Sekme görünürlüğü saf `gorunurSekmeler` fonksiyonuna taşındı (`permissions.js`) ki C6 kural 3 doğrudan test edilebilsin.
  - `giderAynaEngeli` `server.cjs`'te `kisitliMi`'den bağımsız her yazımda çağrılır: `kisitliMi` izin gövdesi olmayan kullanıcıda
    denetimi tümden atladığı için K6 aynası yalnız `yazmaYetkisiVar` içinde kalsaydı izinsiz eski kullanıcı gider yazabilirdi.
- **Uygulama sırasında bulunan önceden var olan hata:** `serverAuth.stableStringify` undefined değerli anahtarı `null` sayıyordu.
  Veritabanından okunan blob ile istemcinin JSON'la geri gönderdiği aynı veri "değişmiş" görünüyor, sekmesi kısıtlı kullanıcı
  değiştirmediği bölümler (müşteriler, servisler, bayiler, teklifler) yüzünden her kayıtta 403 alıyordu. Yalnız gider sekmesi
  verilmiş bir muhasebe kullanıcısı hiç kayıt yapamazdı. Düzeltildi, regresyon testleri eklendi. Spec'in SCORECARD'ında
  "kaçan hata" değil, "bu işte bulunan önceden var olan hata" olarak geçmeli.
- **Kalan DoD maddeleri:** `docs/evidence/0001-ac<n>.png` görsel kanıtları (K11: izole veri kopyası ile gerçek uygulama turu),
  SCORECARD, spec'in `specs/done/`'a taşınması, commit ve sürüm (yalnız açık talimatla).
