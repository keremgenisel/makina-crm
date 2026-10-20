# 0096 — Hammadde tedarikçisi ve parça maliyetinin tedarikçi kırılımı

| | |
|---|---|
| **Durum** | Onaylandı (revizyon 4, plan turu 2026-10-20) |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Giderler › Tedarikler ve Ekstre, Ayarlar › Katalog › Parça/Yedek Parça, Ayarlar › Çöp Kutusu (tedarikçi koruması), Ayarlar › Dışa ve İçe Aktar (parça şablonu), Makina Maliyeti › Model Maliyetleri (okuyucu); saf motorlar `urunAgaci`, `makinaStandartMaliyet`, `parcaAktarma`, `gider` (tedarikçi kullanımı); `electron/db.cjs` okuma yolu |
| **Bağımlı spec'ler** | 0087 (parça alış maliyeti ve ürün ağacı), 0088 (maliyeti okuyan ekran), 0001 (tedarikçi kaydı ve gizlilik kuralı), 0068 ve 0078 (çöp kutusu ve koruma deseni), 0062 (sayfa sıfırlama kuralı) |

---

## Intent

Fabrika hammaddeyi birkaç tedarikçiden alıyor ve bazı parçaları kendi bünyesinde üretiyor. Bugün bir
parçanın alış maliyeti tek bir rakam: o rakamın hangi tedarikçilerden oluştuğu hiçbir yerde yazılı değil,
"ayna mahruti dişlisi takımının 17 bin lirası kimden geliyor" sorusunun cevabı akılda tutuluyor. Tersi de
yok: bir tedarikçiden hangi parçaları aldığımızı görmenin yolu yok, çünkü tedarikçi yalnız gider
kalemlerine bağlı.

Başarı: giderlerde tanımlı bir tedarikçinin hammadde tedarikçisi olduğu işaretlenebilsin; her parça için
hangi tedarikçiden ne kadarlık hammadde geldiği yazılabilsin; birden çok tedarikçiden gelen parçanın alış
maliyeti bu satırların toplamı olsun ve makina maliyeti hesabı bu toplamı okusun; parça listesi tedarikçiye
göre süzülebilsin. Böylece zamla gelen bir tedarikçinin hangi parçaları ve hangi makina maliyetlerini
etkilediği ekrandan görülür.

---

## Requirements

- **R1.** Tedarikçi kaydı "hammadde tedarikçisi" olarak işaretlenebilir. Varsayılan işaretsizdir.
- **R2.** İşaret Giderler › Tedarikler ve Ekstre ekranındaki tedarikçi formundan konur ve listede görünür.
- **R2/2.** Listede işaret, tedarikçi adının altında `Rozet` ile çizilir; yeni sütun açılmaz. Tablo altı
  sütun ve `minWidth: 720` taşıyor (`Tedarikciler.jsx:70`), yedinci sütun dar pencerede yatay kaydırma
  üretir. `Rozet` bileşen tarafından zaten içe alınmıştır (`Tedarikciler.jsx:9`).
- **R3.** Parça kaydında hammadde tedarikçisi satırları tutulur: her satır bir tedarikçi ve isteğe bağlı bir
  tutar (TL, KDV hariç). Ayrı bir üst sınır konmaz; satır sayısı R11 gereği hammadde işaretli tedarikçi
  sayısıyla sınırlıdır (projenin öbür satır listeleri sayı sınırı taşır: `COKLU_ODEME_MAX_SATIR` 10,
  taksit 60; burada sınır verinin kendisinden gelir).
- **R4.** Satırın tedarikçi seçicisinde yalnız **hammadde işaretli canlı** tedarikçiler listelenir.
- **R4/2.** Hiç hammadde tedarikçisi işaretlenmemişken bölüm yerine boş durum metni çizilir, satır
  eklenemez. Metin tek sabittir (`urunAgaci.js`'teki öbür ibare sabitlerinin yanında), `data-testid` taşır
  ve işaretin konduğu yeri adıyla söyler: "Giderler › Tedarikler ve Ekstre".
- **R5.** Satırların en az birinde tutar varsa parçanın alış maliyeti **bu satırların toplamıdır**; o
  parçada elle girilen maliyet alanı kullanılmaz. *(Karar 2, onaylandı)*
- **R6.** Hiçbir satırda tutar yoksa maliyet bugünkü gibi elle girilir; satırlar o parçada yalnız "bu
  tedarikçiden alıyoruz" işaretidir.
- **R7.** Tutarlı bir kırılım kaydedilince parçada elle girilmiş maliyet değeri **kayıttan silinir**; aynı
  rakam iki yerde durmaz. *(Karar 3, onaylandı)*
- **R7/2.** R7 tek seferlik bir temizlik değil **yazım kuralıdır**: parçanın tek yazma yolu (bugün
  `PartManager.jsx:166` `hazirla`) kırılımda tutar varsa `maliyet` anahtarını **her çağrıda** siler.
  Böylece ikinci bir giriş kapısı (bkz. R24) rakamı geri koyamaz.
- **R8.** Bazı satırlarda tutar varken bazılarında yokken maliyet tutarı girilmiş satırların toplamıdır ve
  "tutarı girilmemiş tedarikçi var" uyarısı çıkar; uyarı kaydı engellemez.
- **R8/2.** Uyarının ölçütü satırın tutarının **boş** olmasıdır, sıfır olması değil (R12). Tutarı sıfır
  satır girilmiş sayılır ve uyarı üretmez.
- **R9.** Parça kartı ve parça listesi maliyetin nereden geldiğini yazar: elle girildi ya da N tedarikçinin
  kırılımından geliyor.
- **R9/2.** Listede bu ibare **yalnız kırılımdan gelen** maliyette, tutarın altında ikinci satır olarak
  çizilir ("3 tedarikçiden"); "elle girildi" ibaresi yalnız parça kartında durur. Maliyet hücresi bugün tek
  satır ve `whiteSpace: "nowrap"` (`PartManager.jsx:273`); her satıra ikinci satır eklemek tablonun boyunu
  iki katına çıkarır.
- **R10.** Parça listesi tedarikçiye göre süzülebilir: tümü, tek tek hammadde tedarikçileri ve "hammadde
  tedarikçisi girilmemiş" seçeneği. Denetim `ui.jsx` `Select`'tir (aşağıda C14) ve seçenek kümesi
  **en az bir canlı parçanın kırılımında geçen** tedarikçilerdir; her seçeneğin yanında parça sayısı yazar.
  Çöpte olup kırılımda geçen tedarikçi R16'nın ibaresiyle listede kalır, parçaları bulunabilsin.
- **R10/2.** Süzgeç gider yetkisi olmayan kullanıcıya **hiç çizilmez** (tedarikçi adı listesidir, R17).
- **R11.** Aynı tedarikçi bir parçada iki satırda seçilemez.
- **R12.** Tutar negatif olamaz ve sayıya çevrilemeyen metin kabul edilmez; hata satırında yazar ve kayıt
  bütünüyle yazılmaz. **Sıfır serbesttir**: spec 0087 R4 parçanın elle maliyetinde sıfırı açıkça serbest
  bıraktı ("ücretsiz gelen parça için 0 yazın", `urunAgaci.js:13`; `maliyetGirildiMi({ maliyet: 0 })`
  `true`, `:24`). Ayrı durum "tutar girilmedi"dir (boş) ve `tutarCoz` bu ikisini `bos` bayrağıyla zaten
  ayırıyor.
- **R13.** Bir tedarikçi silinmek istendiğinde parça kırılımı da **kullanım** sayılır: kullanımdaki
  tedarikçi bugünkü kuralla silinemez ve pencere kaç parçada geçtiğini yazar. *(Karar 4, onaylandı)*
- **R13/2.** Koruma **dört kapıda** birden uygulanır, tek yardımcıdan (`kirilimdaGecenTedarikciler(parts)`):
  Tedarikler ve Ekstre'nin silme düğmesi, Çöp Kutusu'nun Kalıcı Sil'i (satırda neden metni), "çöpü boşalt"
  ve otuz günlük otomatik temizliğin `koru` parametresi. Emsal çektir (`App.jsx:1098`
  `bagliHareketiOlanCekler` ile `purgeOldTrash(arr, gün, koru)`).
- **R13/3.** Listenin "Kullanım" hücresi parça sayısını da yazar ("· 3 parçada"). Bugünkü ölçüt
  `k.kalem + k.tanim` (`Tedarikciler.jsx:84`); yalnız parçada geçen tedarikçi aksi hâlde "Kullanılmıyor"
  görünürken silme düğmesi reddederdi.
- **R13/4.** "Silinemez" penceresinin yönlendirme cümlesi kullanım türüne göre yazılır. Bugünkü tek cümle
  "Silmek için önce kalemlerde başka tedarikçi seçin" (`Tedarikciler.jsx:121`); tek kullanım kırılımsa
  kalem yoktur ve kullanıcı var olmayan kalemleri arar. Parça dalı için kendi cümlesi olur, ikisi birlikteyse
  ikisi de yazılır.
- **R13/5.** Koruma ve "Kullanım" hücresi **canlı ve çöpteki** parçaları sayar (gider kalemi emsali:
  `tedarikciKullanim` çöpteki kalemleri de sayıyor, "çöpten geri alınırsa bağ kopmasın"); hücre çöpteki sayıyı
  ayrıca yazar ("· 3 parçada (1'i çöpte)"). Tek istisna "çöpü boşalt"tır: aynı işlemde çöpteki parçalar da kalıcı
  silindiği için koruma **kalacak** parçalardan hesaplanır. Süzgeç (R10) yalnız canlı parçalara bakar.
  *(Plan turu P3, onaylandı)*
- **R14.** Tedarikçinin adı değişince parça kırılımındaki bağ korunur ve yeni ad görünür (bağ kimliktedir).
- **R15.** Hammadde işareti kaldırılan tedarikçi, bağlı olduğu parçaların kırılımında kalmaya devam eder;
  yalnız yeni satırların seçicisinde çıkmaz.
- **R16.** Çöpe atılmış bir tedarikçi kırılımda "silinmiş tedarikçi" olarak görünür ve tutarı maliyete
  girmeye devam eder (parçanın maliyeti tedarikçi kaydının durumuna göre değişmez). **R13 bu durumun normal
  yolunu kapatır**: kırılımda geçen tedarikçi çöpe atılamaz. Durum yalnız birleştirme yarışıyla (bir
  bilgisayar parçaya ekler, öbürü siler) ya da kısmi geri yüklemeyle ("Giderler" paketi eski bir yedekten
  yüklenir, parçalar yüklenmez) oluşur; testi bu yolla kurulur, tedarikçi silinerek kurulmaya çalışılmaz.
- **R16/2.** Aynı yollarla daha sık oluşan durum çöp değil **yokluk**tur: kimliğe karşılık hiç kayıt
  bulunmaması. Tek çözücü iki metin üretir, "silinmiş tedarikçi" ve "kaydı bulunamayan tedarikçi"; tutar
  ikisinde de maliyete girmeye devam eder (R16'nın ilkesi: maliyet tedarikçi kaydının durumuna bakmaz).
- **R17.** Hammadde tedarikçisi bölümü ve tedarikçi adları Ayarlar'da yalnız **gider yetkisi olan**
  kullanıcıya çizilir. Yetkisiz kullanıcıda bölüm hiç çizilmez ve o kullanıcının parça kaydı kırılımı
  aynen korur.
- **R17/2.** Ekran tedarikçi dizisinin **iki görünümünü** kullanır: ad çözümü (R14, R16) **ham** diziden
  yapılır, satırın seçicisi (R4) `!deletedAt && hammadde` ile süzülür. Canlı dizi verilirse çöptekinin adı
  çözülemez, yalnız ham dizi verilirse seçici çöptekini listeler.
- **R17/3.** Kırılım formda her zaman **form biçimindedir** (tutar `tutarMetni` metni): düzenleme açılışı kaydı
  form biçimine çevirir, kayıt fonksiyonu her zaman form biçiminden çözer. Gider yetkisi olmayan kullanıcıda bölüm
  çizilmese de form kırılımı taşır ve aynı yoldan birebir geri yazılır (AC-6). *(Plan turu P4, onaylandı)*
- **R18.** Makina maliyeti hesabı parçanın maliyetini kırılımı da bilen tek okuma yolundan alır; kırılımdan
  maliyeti çıkan parça artık "maliyeti girilmemiş" sayılmaz.
- **R19.** "Alış maliyeti girilmemiş parça" sayısı kırılımdan maliyeti çıkan parçaları saymaz. Sayının
  yeri `PartManager.jsx:168` `maliyetsizSayi` ve onun `maliyetsiz-parca` şeridi.
- **R20.** Yeni eylem izni yoktur: tedarikçi işareti tedarikçi düzenleme izniyle, parça kırılımı parça
  yazımıyla konur.
- **R21.** Kırılımda tutar varken parça kartındaki elle maliyet alanı **çizilir ama pasiftir** ve nedeni
  yazar ("Maliyet hammadde kırılımından geliyor: 17.000,00 ₺"). Satırların tutarı boşaltılınca alan
  yeniden etkin olur. *(Alanın gizlenmesi reddedildi: kullanıcı kırılımdan elle girişe dönmek istediğinde
  satırları boşaltmadan alanı hiç görmez ve ekranda bir yol kalmaz.)*
- **R22.** Süzgeç değişince liste ilk sayfaya döner ve bu **çağıranın** işidir: süzgeç durumunu yazan
  fonksiyon `setPage(1)` çağırır. Paylaşılan `useFilteredList` kancasına üçüncü bir parametre eklenmez;
  kanca sayfayı yalnız `setSearch` içinde sıfırlıyor (`useFilteredList.js:13`) ve on bir çağrı tarafından
  paylaşılıyor. Kural spec 0062 R27'nin kuralıdır ("sıfırlama çağırana aittir").
- **R23.** Satır doğrulaması `ekMaliyetDogrula` emsalini izler (`urunAgaci.js:46-59`): tedarikçisi ve
  tutarı boş satır sessizce atılır; tedarikçisi boş, tutarı dolu satır kendi satırında hata verir
  ("Tedarikçi seçilmedi."). Doğrulama parça kaydının **aynı erken dönüşüne** katılır (bugün
  `PartManager.jsx:180-186` yalnız maliyet ve kit adedi hatalarını topluyor), böylece hata hâlinde kit
  yazımı da yapılmaz.
- **R24.** İçe aktarma, kırılımı tutarlı bir parçada maliyet hücresini **almaz** ve bunu satır satır
  bildirir ("Satır n: bu parçanın maliyeti hammadde kırılımından geliyor, Excel'deki değer alınmadı.").
  `parcaSatirlariniCoz` parça dizisini zaten alıyor (`parcaAktarma.js:19`, `byAd` haritası), imza değişmez.
  Emsal `MALIYET_BELIRSIZ_HATASI`'dır (`:14`): hücre alınmaz, neden yazılır.
- **R26.** Birleştirmede kimliği yeniden atanan tedarikçinin parça kırılımındaki bağı da taşınır
  (`parts[].hammaddeler[].tedarikciId`; emsal `merge.js` gider kalemi ve çekin `tedarikciId` taşıması). Taşınmazsa
  kırılım eski kimliğe bakar; o kimlik sunucuda **başka bir tedarikçiye** aitse kırılım sessizce yanlış
  tedarikçiyi gösterir. *(Plan turu P2, onaylandı)*
- **R25/2.** Tedarikçinin işaret alanının adı **`hammadde`**, sütunu `hammadde INTEGER` (C3'ün örneğiyle aynı).
  *(Plan turu P6)*
- **R25.** Kalıcı alan adı `parts[].hammaddeler`, satır şekli `{ tedarikciId, tutar }`. Satır kimliği
  taşımaz ve sıra korunur (emsal `ekMaliyetler` ve `tahsisler`). Ad `ekMaliyetler` gibi kısadır;
  `hammaddeTedarikcileri` kolon adı olarak öbürlerinden ayrışırdı.

---

## Constraints

### Uyulması zorunlu

- **C1.** Parçanın maliyetinin **tek okuma yolu** olur ve bu yol **iki adlı fonksiyondur**:
  `parcaMaliyetKurus(p)` (kuruş tamsayısı ya da null) ve `parcaMaliyetiVar(p)` (= kuruş null değil).
  Bugün maliyet yedi yerde okunuyor (Context, ölçüm 1) ve motor "girildi mi" ölçütünü `maliyetGirildiMi`
  yerine satır içinde kopyalıyor (`makinaStandartMaliyet.js:206`). Kırılım eklenince yedi çağrı da bu iki
  fonksiyondan geçer, yoksa ekran 17.000 gösterirken makina maliyeti hesabı ve `maliyetsiz-parca` şeridi
  "maliyeti girilmemiş" demeye devam eder. `maliyetGirildiMi` ya ikinci fonksiyonun üstüne iner ya da bütün
  çağıranlarda değiştirilir.
- **C2.** Kırılımın toplamı **saklanmaz**; maliyet okuma anında türer. İki yerde aynı rakam tutulursa
  ayrışır (bu projenin "okuma anında çözüm" kuralı: makina bağı, model bağı, ödeme durumu hepsi böyle).
- **C3.** Yeni kalıcı alanlar dört nokta kuralıyla eklenir: tedarikçinin işareti (boolean) ve parçanın
  kırılım listesi (JSON metin kolonu, model `ekMaliyetler` emsali). **Okuma emsali koşullu atlayan yoldur**
  (`tevkifatOku` / `kisitOku` / `bosOlmayan`, `db.cjs:1540`), koşulsuz yazan `panoGizli` yolu değil:
  tedarikçi okuması `SELECT *` ve `...rest` ile çalışıyor (`db.cjs:1548`), dolayısıyla dört noktayı
  harfiyen uygulamak işareti **sayı** olarak (`0` ya da `1`) ve **kapalıyken de** gövdeye koyar. Doğru
  biçim: `({ notField, hammadde, ...rest }) => ({ ...rest, not: notField, ...(hammadde ? { hammadde: true } : {}) })`.
  Okumanın bugün `deletedAt: null`'ı da gövdeye koyması bu işte **değişmez** (spec öncesi gövde fikstürü aynı
  kalsın; düzeltmesi ayrı iştir, plan turu P5).
- **C3/2.** Aynı destructure parça okumasında da gerekir: `SELECT * FROM parts` ve `...p` yayılıyor
  (`db.cjs:1389`), yeni JSON kolonu açıkça çıkarılmazsa her parça `hammaddeler: null` taşır. Emsal aynı
  map'in içinde duruyor: `maliyet` çıkarılıp yalnız doluysa geri yazılıyor (`:1389`, `:1397`).
- **C3/3.** Formun şekli ile kaydın şekli ayrıdır: tutarlar formda `tutarMetni` ile **metin** tutulur ve
  kayıtta sayıya çevrilir (emsal `ModelsManager.jsx:47`), `emptyForm` yeni anahtarı taşır
  (`PartManager.jsx:144`). Kayıttan ham sayı taşınırsa `TutarInput` binlik ayracını gösteremez (spec 0045).
- **C3/4.** Yazım tarafı da dört noktanın parçasıdır: boş listede `null` yazan yardımcı (`ekMaliyetYaz`
  emsali, `db.cjs:463`) ve `parts` INSERT kolon listesi (`db.cjs:851-853`).
- **C4.** Boş değer okunan gövdeye **yazılmaz** (0087 ve 0091 deseni): işaret kapalıyken ve kırılım boşken
  alan hiç bulunmaz. Sunucu karşılaştırması null ile yokluğu ayırır, aksi hâlde her kayıt sahte değişiklik
  üretir ve karışık sürümlü kurulumda kısıtlı kullanıcı 403 alır.
- **C5.** Kırılım tutarları **elle girilen standart maliyettir**; gider kalemlerinden türemez. Gider
  kalemini parçaya bağlamak spec 0090 ile bilinçli olarak kaldırıldı ve geri açılmaz. *(Karar 1, onaylandı)*
- **C6.** `tedarikciler` bölümünün sekme eşlemesi `["gider"]` kalır (`serverAuth.cjs:137`); tedarikçi
  listesi Ayarlar'a bölüm olarak açılmaz (spec 0001 R13: ayarlar izni olup gider yetkisi olmayan kullanıcı
  tedarikçileri görmez). Parça kırılımı `parts` bölümüne yazılır, tedarikçi bölümüne dokunmaz.
- **C7.** Parça kartı tedarikçi kaydına yazmaz (tek yön): hammadde işareti yalnız tedarikçi formundan konur.
  Böylece 0087'nin iki yönlü yazımı (parça ↔ model kiti) ve onun kilit denetimi burada tekrarlanmaz.
- **C8.** Maliyet TL ve KDV hariçtir (0087 R1 aynen); kırılım satırı döviz taşımaz.
- **C9.** Kuruş doğruluğu korunur ve **tek okuma yolunun birimi kuruştur**. TL'ye çevirme yalnız biçimleme
  anında olur: liste hücresi `kurusMetni` (`makinaStandartMaliyet.js:446`) ile ya da `maliyetMetni`'nin
  kuruş alan kardeşiyle (`urunAgaci.js`'te; parça paneli makina maliyeti motorunu içe almaz, plan turu P7) yazılır, dışa aktarma hücresi kuruştan iki haneli sayıya çevrilir. Kaynakta
  satırların tutarlarını TL olarak toplayan ikinci bir yer yasaktır (float toplama kuruş kaybı üretir).
- **C10.** Göç yok: bugünkü elle girilmiş maliyetler olduğu gibi çalışmaya devam eder.
- **C11.** Tedarikçi dizisi **parça paneline** gider yetkisiyle kapatılarak verilir (`giderYetki ? tedarikciler : []`,
  `Settings.jsx`'te `PartManager` çağrısında); R17'nin gizlilik kapısı yalnız çizim kazasına bağlı kalmaz.
  **App'ten Ayarlar'a giden dizi ham kalır** (plan turu P1, onaylandı): Ayarlar aynı diziyi yedeğe veriyor
  (`Settings.jsx:224` → `SettingsBackup.jsx:67`); App'te kapatılsaydı gider yetkisi olmayan kullanıcının yedeği boş
  tedarikçi listesi taşır ve o yedeğin tam geri yüklemesi bütün tedarikçileri silerdi. Revizyon 3'ün "App'te
  kapatılır" metni bu yüzden değişti.
- **C12.** Kırılımın boşaltılması **birleştirme tuzağına** girer: parça kaydı `hazirla({ ...x, ...editForm, ad })`
  ile yazılıyor (`useSimpleDefList.js:38`), yani birleştirmedir. C3'ün emsal gösterdiği `ekMaliyetler` ise
  taze nesne kuruyor (`ModelsManager.jsx:61-62`). Bu yüzden kırılım `hazirla` içinde `maliyet`'in bugünkü
  deseniyle **her çağrıda destructure edilir** ve yalnız doluysa geri yazılır (`PartManager.jsx:166-170`);
  "boşken anahtar yazma" kuralı `hazirla`'nın dışında uygulanırsa bütün satırları silen kullanıcının
  boşaltması `...x`'ten gelen eski kırılımla sessizce geri alınır (spec 0095 B-3'ün dersi).
- **C13.** Parça paneli spec 0016'nın kapsamında değildir (`tests/liste-kaynak.test.js:14` listesinde yok)
  ve boş durumunu düz metinle çiziyor (`PartManager.jsx:155-157`). Süzgecin boş sonucu aynı kabın içine
  üçüncü metin olarak eklenir; `BosDurum`'a geçmek bu ekranı 0016'nın kapsamına çeker ve ayrı bir iştir.
- **C14.** Süzgeç `Select` olur ve tasarım sözlüğüne adıyla **istisna** yazılır. Sözlüğün bugünkü kuralı
  "sekme ve süzgeç çubukları her zaman segmenttir, seçenek sayısı ne olursa olsun"
  (`docs/tasarim-sozlugu.md:76`); tedarikçi adları uzun ve sayısı sınırsız olduğu için segment çubuğu
  birkaç satıra yayılır. Emsal spec 0091'in aç/kapa düğmesidir (sözlükte istisna). Parça paneli bugün hiç
  süzgeç taşımıyor ve `tests/suzgec-kaynak.test.js`'in yedi ekranlık listesinde değil.

### KAPSAM DIŞI

- **X1.** Gider kaleminin bir parçaya bağlanması — *neden:* spec 0090 gider atamasını bilinçli kaldırdı;
  ayrıca hammadde faturası lot bazlıdır (bir sacdan kaç parça çıkacağı faturada yazmaz), parça maliyeti
  birim bazlıdır. İkisini otomatik bağlamak yanlış birim üretir.
- **X2.** Kırılımın gerçekleşen hammadde harcamasıyla parça başına karşılaştırılması — *neden:* Makina
  Maliyeti › Parti Hesabı bu karşılaştırmayı tür rolü ("ürün ağacından gelir") üzerinden zaten yapıyor;
  parça başına karşılaştırma ayrı bir iştir ve gider kalemi ile parça arasında bağ gerektirir (X1).
- **X3.** Parça dışa ve içe aktarmasına kırılım sütunu eklenmesi — *neden:* içe aktarma hücreleri
  **konuma göre** eşliyor ve çok satırlı veri tek hücreye sığmaz; şablonu bozmamak için ayrı iş. İçe
  aktarmanın maliyet hücresini kırılımlı parçada ne yapacağı bu spec'te yazılıdır (R24).
- **X4.** Tedarikçi bazlı parça raporu ya da yazdırma çıktısı — *neden:* istek ekranda süzme; gider
  tarafının yazdırma gizlilik kuralları ayrı bir tur ister.
- **X5.** Hammadde stok takibi (kaç metre sac kaldı) — *neden:* stok bu uygulamada yalnız yedek parça ve
  makina için tutuluyor; hammadde stoğu kendi başına bir spec.
- **X6.** Modelin ek maliyet kalemlerine (büküm, kaplama, montaj işçiliği) tedarikçi eklenmesi — *neden:*
  o kalemler parça değil hizmettir; istek parça tarafı için geldi.
- **X7.** Hammadde tedarikçisinin parçanın satış fiyatına etkisi — *neden:* satış fiyatı ayrı alan ve ayrı
  karar; maliyet yalnız makina maliyeti hesabına girer (0087 R1). Koruma hazır: 0087 AC-6'nın taraması
  satış ekranlarının `.maliyet` okumasını ve `urunAgaci` içe almasını yasaklıyor.
- **X8.** Makina Maliyeti › Model Maliyetleri ekranına kaynak ibaresi eklenmesi — *neden:* R9 yalnız parça
  kartını ve parça listesini kapsar. Kit satırının nedeni iki değerli ve else dalı var
  (`ModelMaliyetleri.jsx:39`), yeni bir `neden` değeri de gerekmez; ekran değişmez, kanıt raporu da.

---

## Context

### Ölçüm 1: parçanın maliyeti bugün yedi yerde okunuyor (tablo sekiz satır: yedi çağrı ve bir tanım)

Alan `parts[].maliyet` (spec 0087 R1; TL, KDV hariç, boş = "girilmedi"). Okuyanlar:

| Yer | Ne yapıyor | QA turu |
|---|---|---|
| `src/lib/makinaStandartMaliyet.js:206` | Boşsa kit satırını "eksik / maliyetYok" sayar, direkt maliyete 0 yazar; ölçütü satır içinde kopyalar | yok |
| `src/lib/makinaStandartMaliyet.js:207` | Doluysa kuruşa çevirip adetle çarpar | yok |
| `src/lib/urunAgaci.js:24` `maliyetGirildiMi` | "Maliyeti girilmemiş" ölçütünün tanımı | yok |
| `src/components/PartManager.jsx:168` | `maliyetsizSayi` ve `maliyetsiz-parca` şeridi (R19 ile AC-18 tam olarak bunu değiştirir) | eklendi |
| `src/components/PartManager.jsx:273` | Liste hücresinin rengi (`maliyetGirildiMi(k)` ile soluk ya da koyu) | eklendi |
| `src/components/PartManager.jsx:274` | Liste hücresinin metni (`maliyetMetni`, girilmemiş "—", sıfır "0,00 ₺") | yok |
| `src/components/PartManager.jsx:176` | Düzenleme formunun ön doldurması (`startEdit({ ...k, maliyet: tutarMetni(k.maliyet) })`; R21 bu satıra dayanır) | eklendi |
| `src/lib/parcaAktarma.js:16` | Dışa aktarmanın onuncu sütunu | yok |

Spec'in ilk taslağı bunu "dört yer" diye sayıyordu, tablosunda beş satır vardı ve altındaki paragraf "beş
çağrı" diyordu; ölçülen sayı sekiz satırda yedi okuma yeridir (`urunAgaci.js:24` tanım, öbürleri çağrı).
Eksik kalan iki satır tam olarak R19'un ve R21'in dayandığı yerlerdi. Bu yedi çağrı tek yola
bağlanmazsa en az bir ekran eski rakamı gösterir; C1 bu yüzden kural ve okuma yolu iki adlı fonksiyondur
(tutar ve "girildi mi"), çünkü motor bugün ikincisini kendi içinde yazıyor.

### Ölçüm 2: tedarikçi kaydı ve bugünkü alanları

`tedarikciler` bölümü (`src/components/gider/Tedarikciler.jsx`, tablo `electron/db.cjs:298`) şu alanları
taşıyor: `ad, yetkili, telefon, eposta, vergiDairesi, vergiNo, adres, not, deletedAt`. Hammadde ayrımı yok.
Okuma yolu `SELECT *` ve `...rest` ile tek satırdır (`db.cjs:1548`, `notField` → `not` dönüşümü dışında
eşleme yok); C3 bu yüzden koşullu atlayan emsali zorunlu kılar.

Silme kuralı `src/lib/gider.js:1048` `tedarikciKullanim(tedId, giderler, tanimlar)`: kalem ya da tekrarlayan
tanımda geçen tedarikçi silinemez, çöpteki kalemler de sayılır ("çöpten geri alınırsa bağ kopmasın").
Karar 4 bu sayıma parça kırılımını ekler; o zaman ekranın `parts` dizisini de görmesi gerekir. App bugün
Giderler'e `stock`, `customers`, `standardModels` ve `customModels` veriyor, `parts` vermiyor (ölçüldü,
`App.jsx`'in Giderler çağrısı), Giderler de Tedarikciler'e kendi prop'larından geçiriyor
(`Giderler.jsx:394-396`): iki hopta tek prop eklenir. Fonksiyonun üç çağrısı var: `Tedarikciler.jsx:46`
(silme penceresi), `:78` (liste hücresi) ve `tests/gider.test.js`.

### Ölçüm 3: maliyet rolü ayrı bir kavram, karıştırılmamalı

Gider **türünün** `maliyetRolu` alanı var (`src/lib/makinaStandartMaliyet.js:25`): "ürün ağacından gelir" /
"genel gidere girer" / "maliyete girmez". Hammadde faturaları bugün bu şekilde, **tür düzeyinde**
işaretleniyor ve Parti Hesabı'nın tedarik karşılaştırması oradan besleniyor. Bu spec'in getirdiği işaret
**tedarikçi düzeyindedir** ve başka bir soruyu cevaplıyor: "bu firmadan hammadde alıyor muyuz". İkisi
birbirinin yerine kullanılamaz; bir tedarikçinin hem yakıt hem sac faturası olabilir, bir hammadde
tedarikçisinin hiç faturası henüz girilmemiş olabilir. Bu yüzden işaret türetilmez, elle konur (Karar 1'in
ikinci yarısı).

### Ölçüm 4: parça kartı iki bölüme yazabiliyor, bu işte yazmayacak

Spec 0087 parça kartını model kitine de yazan bir kapı yaptı ve bunun için kilit denetimi ekledi
(`PartManager.jsx:196`: karşı bölüme yazacaksa `ayar:models` kilidine anlık bakar). Hammadde kırılımı bu
desene **girmez**: parça kartı yalnız kendi kaydına yazar, tedarikçi kaydına dokunmaz (C7). Dolayısıyla
yeni bir kilit alanı ve yeni bir çapraz yazım denetimi gerekmez.

Aynı kart iki yazım kipini paylaşıyor ve ikisi farklı: ekleme `hazirla({ ...form, id, ad })`, düzenleme
`hazirla({ ...x, ...editForm, ad })` (`useSimpleDefList.js:25`, `:38`). İkincisi birleştirme olduğu için
boşaltma tuzağı doğar (C12).

### Ölçüm 5: Ayarlar'da gider yetkisi var, tedarikçi listesi de elde, ama kapısız ve ham

`src/App.jsx` Ayarlar'a hem `giderYetki` hem `tedarikciler` geçiriyor (`Settings.jsx:73`, `:74`), yani
bölümün yetkiye bağlı çizilmesi için yeni bir veri yolu açmak gerekmiyor. Ölçülen iki ayrıntı spec'in ilk
taslağında yoktu: dizi **ham** geçiyor (`App.jsx:1728` `tedarikciler={tedarikciler}`, `liveTedarikciler`
değil) ve **gider yetkisiyle kapatılmıyor** (aynı dosyadaki emsali `:1505`
`tedarikciler={giderYetki ? liveTedarikciler : []}`). Ham dizi R14 ve R16'nın ad çözümü için gereklidir,
seçici için yanlıştır: R17/2 iki görünümü, C11 kapıyı yazar. `PartManager` bugün ikisini de almıyor, iki
prop eklenir. Emsal spec 0022'nin stok formundaki "Üretim partisi" seçicisidir: yalnız gider yetkisiyle
çizilir, perde inikken bağ korunur.

### Ölçüm 6: tedarikçiyi kalıcı silen dört kapı, üçü denetimsiz

| Kapı | Yer | Bugünkü denetim |
|---|---|---|
| Tedarikler ve Ekstre, silme düğmesi | `Tedarikciler.jsx:46` `silAc` | `tedarikciKullanim` (kalem ve tanım) |
| Çöp Kutusu, Kalıcı Sil | `SettingsTrash.jsx:348` `purgeTedarikci` | yok |
| Çöp Kutusu, "çöpü boşalt" | `SettingsTrash.jsx:293` | yok |
| Otuz günlük otomatik temizlik | `App.jsx:1094` `purgeOldTrash(data.tedarikciler)` | yok (`koru` parametresi verilmiyor) |

R13 yalnız ilk kapıyı kapatıyordu. Üçü, kırılımda geçen bir tedarikçiyi kalıcı silerek R13'ün önlemek için
yazıldığı şeyi (kopuk kimlik) üretir. Çöpte referanslı tedarikçi oluşması ulaşılabilir (R16'nın iki yolu),
bu yüzden kapılar teorik değil. Emsal hemen yanında duruyor: çek `App.jsx:1098`'de
`purgeOldTrash(data.cekler, undefined, koru)` ile korunuyor.

### Ölçüm 7: değişecek ekranların hepsi bugün "0 piksel fark" beklentisiyle kayıtlı

`docs/evidence/kanit-eslemesi.json` kayıtları (ölçüldü):

| Dosya | Bu spec'in değiştireceği ekranlar | Bugünkü beklenti |
|---|---|---|
| `src/components/PartManager.jsx` | `katalog-parca`, `katalog-parca-yeni`, `ayarlar-yedekparca`, `ayarlar-yedekparca-maliyetsiz` | dördü de `ayni` |
| `src/components/gider/Tedarikciler.jsx` | `giderler-tedarikciler`, `giderler-tedarikci-formu`, `giderler-0068-tedarikci-sil` | hepsi `ayni` |

`tests/kanit-eslemesi.test.js` ve `tests/tasarim-kaynak.test.js` bu kayıtları okuyor; bilinçli görünüm
değişikliği `beklenen: "degisti"` ve onay dizesi istemek zorundadır, yoksa test kırılır ve geliştirici ya
testi gevşetir ya da onayı kendi yazar.

### Tuzaklar

- Parça bölümü sunucuda `stockActions` grubundadır (`electron/serverAuth.cjs:44`) ve sekme eşlemesi
  `["settings"]`'tir (`:110`). Yani `stockActions: []` olan bir kullanıcı parça yazamaz; bu 0087 C7'de
  yazılı bilinen sınırdır ve bu spec'le değişmez.
- Birleştirme: `parts` MERGE_KEYS'tedir (spec 0077 E), ama var olan kaydın düzenlemesi çakışmada sunucu
  kopyasına yenilir. İki bilgisayar aynı anda aynı parçanın kırılımını değiştirirse biri kaybolur; bu
  bugünkü kuralın aynısıdır, yeni bir sınır değil. Aynı kural R16'nın çöpteki tedarikçi durumunu üreten
  yollardan biridir.
- JSON kolonu okunurken boş liste `null` yazılır ve gövdeye anahtar konmaz (`ekMaliyetler` emsali,
  `MODELS_EK_MALIYET_COLUMN`, `ekMaliyetYaz` `db.cjs:463`, `ekMaliyetOku` `:1462`).
- Tedarikçi okuması `SELECT *` ve `...rest` ile çalışıyor; yeni boolean kolonu **sayı** olarak gelir ve
  kapalıyken de gövdeye girer (C3). Aynısı parça okumasında JSON kolonu için geçerlidir (C3/2).
- Parça kaydının düzenleme yazımı birleştirmedir, `ekMaliyetler`'in emsali ise taze nesnedir; boşaltma
  yalnız `hazirla` içinde destructure edilirse çalışır (C12).
- `useFilteredList` sayfayı yalnız aramada sıfırlıyor ve kancayı on bir çağrı paylaşıyor; süzgecin
  sıfırlaması çağıranda yapılır (R22).
- Parça panelinin maliyet hücresi tek satır ve `nowrap`; kaynak ibaresi yalnız kırılımlı satıra eklenir
  (R9/2).
- Tedarikçi tablosu altı sütun ve `minWidth: 720`; hammadde işareti rozetle çizilir, sütunla değil (R2/2).

---

## Kararlar (Takım Yöneticisi onayı: 2026-10-20)

Aşağıdaki dört kararın her biri **önerilen seçenekle** kapandı; metinler kararın gerekçesini ve
reddedilen seçeneğin maliyetini kalıcı kayıt olarak taşır.

**Karar 1 (onaylandı: önerilen seçenek): kırılım tutarları nereden gelir?**
Öneri: **elle girilir** (standart maliyet). Tedarikçinin hammadde işareti de elle konur, gider
kalemlerinden türetilmez.
*Neden:* hammadde faturası lot bazlıdır, parça maliyeti birim bazlıdır; ikisini otomatik bağlamak için
gider kalemini parçaya atamak gerekir ki spec 0090 tam olarak o mekanizmayı kaldırdı (karar
2026-10-17). Ayrıca türetilen işaret kalem girildikçe yanıp sönerdi: faturası henüz girilmemiş yeni
tedarikçi hammadde sayılmaz, karışık faturalı tedarikçi yanlış sayılırdı (ölçüm 3).
*Alternatif:* gider kalemlerinden türetmek. *Maliyeti:* spec 0090'ın kararı geri açılır, gider formuna
yeni bir atama kutusu döner, lot başına kaç parça çıktığı sorusu için yeni bir alan gerekir.
*Bu önerinin maliyeti:* rakam elle güncellenir; zam gelince kullanıcı ilgili parçaları tek tek düzeltir.
Süzgeç (R10) tam olarak bu işi kolaylaştırmak içindir.

**Karar 2 (onaylandı: önerilen seçenek): kırılım varken maliyet türetilsin mi?**
Öneri: **evet**, en az bir satırda tutar varsa maliyet o satırların toplamıdır ve elle girilen alan o
parçada kullanılmaz (R5).
*Neden:* istek birebir bu: "bunların toplamı 17 bin yapıyor maliyet". Türetilmezse aynı rakam iki yerde
durur, biri güncellenip biri unutulur ve makina maliyeti hangisini okuduğunu söylemez.
*Alternatif:* kırılım yalnız bilgi olsun, maliyet elle kalsın. *Maliyeti:* 17.000'i kullanıcı ayrıca
maliyet alanına yazar; üç satırdan biri değişince toplamı elle düzeltmeyi unutmak sessiz hata üretir.
*QA turu eki:* "kullanılmaz" kaydın içeriğini anlatıyordu, formun davranışını anlatmıyordu; alan pasif
olur ve nedenini yazar (R21), kuralın yazım tarafı her çağrıda uygulanır (R7/2).

**Karar 3 (onaylandı: önerilen seçenek): kırılım kaydedilince eski elle girilmiş maliyet ne olur?**
Öneri: **kayıttan silinir** (R7).
*Neden:* okunmayan bir değerin kayıtta durması tuzaktır; ileride biri onu okuyan bir ekran yazar ve iki
rakam ayrışır. Silme veri kaybı değildir, çünkü aynı sayı kırılımın toplamında duruyor.
*Alternatif:* saklanır ama okunmaz. *Maliyeti:* bütün satırların tutarı boşaltıldığında eski elle girilen
rakam geri gelir; bu bazı kullanıcı için kolaylık, ama "neden bu rakam çıktı" sorusunu üretir.
*QA turu eki:* ikinci bir giriş kapısı (Excel içe aktarma) rakamı geri koyabiliyordu; R24 o hücreyi
almaz ve nedenini bildirir.

**Karar 4 (onaylandı: önerilen seçenek): hammadde kırılımı tedarikçi silmeyi engeller mi?**
Öneri: **evet**, parça kırılımı da kullanım sayılır; kullanımdaki tedarikçi bugünkü kuralla silinemez ve
pencere kaç parçada geçtiğini yazar (R13).
*Neden:* bugünkü kural zaten bu (gider kalemi ve tanım); kırılım dışarıda tutulursa parça satırı kopuk
bir kimliğe bakar kalır ve ekranda "silinmiş tedarikçi" biriktirir.
*Alternatif:* silmeye izin verip kırılımda "silinmiş tedarikçi" göstermek (R16'nın çöp kutusu hâli zaten
bu). *Maliyeti:* parçayı önce düzeltmek zorunda kalmadan tedarikçi silinir, karşılığında kırılımda kalıcı
kopuk satırlar oluşur.
*Bu önerinin maliyeti:* `tedarikciKullanim` bir parametre daha alır ve Giderler ekranına bir prop eklenir
(ölçüm 2).
*QA turu eki:* koruma tek kapıda kalırsa üç kapı (Kalıcı Sil, çöpü boşalt, otuz günlük temizlik) kararı
boşa çıkarıyordu; R13/2 dördünü tek yardımcıya bağlar (ölçüm 6).

---

## Acceptance Criteria

- **AC-1.** Tedarikçi formunda "hammadde tedarikçisi" kutusu çizilir ve yeni tedarikçide işaretsizdir.
- **AC-2.** İşaretli tedarikçi Tedarikler ve Ekstre listesinde adının altındaki rozetle görünür; tablonun
  sütun sayısı değişmez.
- **AC-3.** Gider yetkisi olan kullanıcıda parça kartında hammadde tedarikçisi bölümü çizilir ve seçicide
  yalnız hammadde işaretli canlı tedarikçiler listelenir.
- **AC-4.** Hiç hammadde tedarikçisi işaretlenmemişken bölüm, işaretin konduğu yeri adıyla söyleyen boş
  durum metnini gösterir ve satır eklenemez; metin tek sabittendir ve `data-testid` taşır.
- **AC-5.** Gider yetkisi olmayan kullanıcıda bölüm ve süzgeç hiç çizilmez, hiçbir tedarikçi adı görünmez.
- **AC-6.** Gider yetkisi olmayan kullanıcı parçayı kaydedince kayıtlı kırılım birebir korunur.
- **AC-7.** Tek satır ve tutar 4.250 girilen parçanın maliyeti 4.250,00 ₺ olarak hesaplanır ve listede
  öyle görünür.
- **AC-8.** Üç satır (7.000 / 9.000 / 1.000) girilen parçanın maliyeti 17.000,00 ₺ olur.
- **AC-9.** Kuruşlu tutarlar (8.000,55 / 9.000,45) toplamda kuruş kaybı olmadan 17.001,00 ₺ verir.
- **AC-10.** Hiçbir satırda tutar yoksa maliyet elle girilen değerdir ve satırlar yalnız tedarikçi
  işaretidir.
- **AC-11.** Bir satırda tutar varken diğerinde yokken maliyet tutarı girilmiş satırın toplamıdır ve
  "tutarı girilmemiş tedarikçi var" uyarısı çıkar.
- **AC-12.** AC-11'deki kayıt uyarıya rağmen kaydedilir.
- **AC-13.** Tutarlı kırılım kaydedilince parçanın elle girilmiş maliyet değeri kayıtta bulunmaz.
- **AC-14.** Negatif tutar ve sayıya çevrilemeyen metin satırında hata gösterir; kayıt bütünüyle yazılmaz
  (parçanın diğer alanları ve makina kiti de değişmez).
- **AC-15.** Aynı tedarikçi ikinci kez seçilemez; seçicide kalan satırlarda görünmez.
- **AC-16.** Son tutarlı satır silinince maliyet "girilmedi" durumuna döner ve liste hücresi "—" gösterir.
- **AC-17.** Parça kartı maliyetin kaynağını yazar (elle girildi ya da N tedarikçinin kırılımından);
  listede ikinci satır **yalnız** kırılımdan gelen maliyette çizilir, elle girilmiş satırda hücre bugünkü
  gibi tek satırdır.
- **AC-18.** "Alış maliyeti girilmemiş parça" sayısı ve `maliyetsiz-parca` şeridi kırılımdan maliyeti çıkan
  parçayı saymaz.
- **AC-19.** Model maliyeti hesabı kırılımlı parçayı eksik saymaz; kit satırının birim maliyeti kırılımın
  toplamıdır ve direkt maliyet buna göre çıkar.
- **AC-20.** Parça listesinde bir tedarikçi süzgeci seçilince yalnız o tedarikçinin geçtiği parçalar
  listelenir; süzgecin seçenekleri yalnız en az bir canlı parçanın kırılımında geçen tedarikçilerdir ve
  her seçenek parça sayısını yazar.
- **AC-21.** "Hammadde tedarikçisi girilmemiş" süzgeci yalnız hiç satırı olmayan parçaları listeler.
- **AC-22.** Süzgeç ile arama birlikte çalışır ve süzgeç değişince liste ilk sayfaya döner; sıfırlama
  süzgeci yazan fonksiyondadır, `useFilteredList` imzası değişmez.
- **AC-23.** Süzgeç sonucu boşsa bugünkü boş durum kabında üçüncü metin çıkar, tablo çizilmez ve
  `BosDurum` kullanılmaz.
- **AC-24.** Kırılımda geçen tedarikçi silinmek istenince silme engellenir ve pencere kaç parçada geçtiğini
  yazar.
- **AC-25.** Tedarikçinin adı değiştirilince kırılım satırı yeni adı gösterir ve maliyet değişmez.
- **AC-26.** Tedarikçinin hammadde işareti kaldırılınca bağlı parçaların kırılımı ve maliyeti değişmez;
  yalnız yeni satır seçicisinde çıkmaz.
- **AC-27.** Çöpteki tedarikçi kırılımda "silinmiş tedarikçi" olarak görünür ve tutarı maliyete girmeye
  devam eder; durum birleştirme ya da kısmi geri yükleme yoluyla kurulur, tedarikçi silinerek değil.
- **AC-28.** Boş kırılım ve kapalı hammadde işareti okunan gövdede hiç bulunmaz; kapalı işaret `null`
  olarak da bulunmaz (spec öncesi gövde fikstürüyle karşılaştırılır).
- **AC-29.** Veritabanı gidiş dönüşünde işaret ve kırılım (sıra ve `{ tedarikciId, tutar }` şekli dâhil)
  korunur; işaret `true` olarak okunur, `1` olarak değil.
- **AC-30.** Parça dışa aktarma satırının sütun sayısı ve sırası değişmez ve **kırılımı olmayan** parçada
  maliyet hücresi spec öncesi fikstürle birebir aynıdır.
- **AC-30/2.** Kırılımlı parçada dışa aktarma hücresi kırılımın toplamını yazar ve biçimi bugünkü ham sayı
  biçimini korur.
- **AC-31.** Yeni eylem izni, yeni veri bölümü ve yeni kilit alanı eklenmediği kaynak taramasıyla
  gösterilir.
- **AC-32.** Kaynak taraması: ölçüm 1'in yedi okuma yerinin hepsi tek yoldan geçer; `src` altında
  `parts[].maliyet` alanını doğrudan okuyan ikinci bir yer kalmaz (tek istisna okuma yolunun kendi
  tanımıdır) ve motorun satır içi "girildi mi" ölçütü kalkar.
- **AC-33.** `maliyetsizSayi` ve makina maliyeti hesabı aynı ölçütü kullanır: kırılımdan maliyeti çıkan
  parça iki yerde de eksik sayılmaz (çapraz test).
- **AC-34.** Kırılımda tutar varken parça kartındaki elle maliyet alanı pasiftir ve nedenini yazar;
  satırların tutarı boşaltılınca yeniden etkin olur.
- **AC-35.** Kırılımı tutarlı bir parça kaydedildiğinde `maliyet` anahtarı her kayıtta silinir (alana
  değer taşıyan eski bir kayıt düzenlenip kaydedilse de kayıtta bulunmaz).
- **AC-36.** Tedarikçi okuması işareti açıkça eşler: kapalı işaret gövdede hiç bulunmaz, açık işaret
  `true`'dur; parça okumasında boş kırılım anahtarı hiç bulunmaz.
- **AC-37.** Kırılımda geçen tedarikçi Çöp Kutusu'ndan kalıcı silinemez, "çöpü boşalt" ona dokunmaz ve
  otuz günlük otomatik temizlik onu korur; satırda korunma nedeni yazar.
- **AC-38.** Kaydı hiç bulunmayan tedarikçi kimliği kırılımda "kaydı bulunamayan tedarikçi" olarak görünür
  ve tutarı maliyete girmeye devam eder.
- **AC-39.** Çöpteki bir tedarikçinin adı kırılımda çözülür (ekran ham diziyi okur) ama satırın seçicisinde
  listelenmez.
- **AC-40.** Kırılımı tutarlı bir parçaya Excel'den maliyet yazılamaz: hücre alınmaz, kayıtta elle maliyet
  oluşmaz ve içe aktarma özeti nedeni satır numarasıyla bildirir.
- **AC-41.** Tek okuma yolu kuruş tamsayısı döndürür; liste hücresi, parça kartı ve dışa aktarma aynı
  kuruş değerinden biçimlenir ve kaynakta satır tutarlarını TL olarak toplayan ikinci bir yer yoktur.
- **AC-42.** Tedarikçisi ve tutarı boş satır sessizce atılır; tedarikçisi boş, tutarı dolu satır kendi
  satırında "Tedarikçi seçilmedi." hatası verir ve kayıt yazılmaz.
- **AC-43.** Tutarı sıfır satır kabul edilir, maliyet 0,00 ₺ olur ("girilmedi" olmaz) ve "tutarı
  girilmemiş tedarikçi var" uyarısı çıkmaz.
- **AC-44.** Süzgeç `Select`'tir ve tasarım sözlüğünde adıyla istisna olarak yazılıdır; parça panelinde
  yerel süzgeç pili ya da segment çubuğu doğmaz.
- **AC-45.** Gider yetkisi olmayan kullanıcıda süzgeç hiç çizilmez; maliyet hücresi (kırılımdan gelse de)
  bugünkü gibi görünür.
- **AC-46.** Bütün satırları silip kaydeden kullanıcının kaydında kırılım anahtarı bulunmaz (birleştirme
  eski kırılımı geri getirmez) ve maliyet "girilmedi" durumuna döner.
- **AC-47.** Görsel kanıt kaydı: değişen ekranların kayıtları `beklenen: "degisti"` ve
  `Takım Yöneticisi · 2026-10-20 · spec 0096 <madde>` onay dizesini taşır; spec `done`'a taşınırken
  `ayni`ye çevrilir.
- **AC-49.** Birleştirmede kimliği yeniden atanan tedarikçiye bakan parça kırılımı satırı yeni kimliği taşır (R26).
- **AC-50.** Tedarikçi silme koruması ve "Kullanım" hücresi çöpteki parçanın kırılımını da sayar ve çöpteki sayıyı
  ayrıca yazar; "çöpü boşalt" aynı işlemde kalıcı silinen çöpteki parçanın kırılımını koruma saymaz (R13/5).
- **AC-48.** Yalnız parça kırılımında geçen tedarikçinin "Kullanım" hücresi parça sayısını yazar,
  "Kullanılmıyor" demez; "silinemez" penceresinin yönlendirme cümlesi kullanım türüne göre değişir.

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Maliyetin türetilmesi saf motorda tek yerde ve iki adlı fonksiyonla (`parcaMaliyetKurus`,
      `parcaMaliyetiVar`); ölçüm 1'deki **yedi** okuyucu aynı yoldan geçiyor, motorun satır içi ölçütü
      kalktı ve kaynak taraması ikinci bir maliyet okumasını yasaklıyor.
- [ ] Makina Maliyeti ekranı, parça listesi ve `maliyetsiz-parca` şeridi aynı maliyeti ve aynı eksik
      ölçütünü gösteriyor (çapraz test).
- [ ] Dört nokta kuralı iki yeni alan için uygulandı ve `db-roundtrip` testine eklendi; okuma yolu her iki
      tabloda da açıkça destructure ediyor, boş değer gövdeye yazılmıyor ve kapalı işaret `null` olarak da
      bulunmuyor (spec öncesi gövde fikstürüyle karşılaştırıldı).
- [ ] Tedarikçi koruması dört kapıda birden ölçüldü (silme düğmesi, Kalıcı Sil, çöpü boşalt, otuz günlük
      temizlik) ve tek yardımcıdan geliyor.
- [ ] İçe aktarma kırılımlı parçada maliyet hücresini almıyor ve nedeni bildiriyor; dışa aktarma satırı
      kırılımsız parçada spec öncesi fikstürle birebir aynı.
- [ ] Yeni veri bölümü yok; bu açıkça yazıldı.
- [ ] Yeni eylem izni yok; bu açıkça yazıldı. Gizlilik kapısı (gider yetkisi) ekranda ölçüldü ve prop
      parça paneline giderken kapatıldı (App'ten Ayarlar'a giden dizi ve yedek içeriği değişmedi, C11).
- [ ] Soft-delete simetrisi korundu: çöpteki tedarikçi kırılımı bozmuyor, geri alınınca adı dönüyor, kaydı
      hiç bulunmayan kimlik kendi metnini alıyor.
- [ ] Kullanıcıya görünen tüm metinler Türkçe; yazdırma çıktısı yok, bu açıkça yazıldı.
- [ ] Para kuralına uyuluyor: TL ve KDV hariç, tek okuma yolu kuruş döndürüyor, döviz girilmiyor.
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi; ekranlar: kırılımlı parça kartı (pasif maliyet alanı),
      boş durum, hata durumu, süzgeç açık liste, gider yetkisiz görünüm, hammadde rozetli tedarikçi
      listesi, parça sayısı yazan "silinemez" penceresi. `docs/evidence/kanit-eslemesi.json` kayıtları
      `beklenen: "degisti"` ve `Takım Yöneticisi · 2026-10-20 · spec 0096 <madde>` onayıyla yazıldı
      (ölçüm 7).
- [ ] Tasarım sözlüğüne süzgecin `Select` istisnası adıyla eklendi (C14).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md`'ye hammadde tedarikçisi kavramı, maliyetin tek okuma yolu (kuruş, iki fonksiyon) ve
      tedarikçi düzeyi işaret ile tür düzeyi maliyet rolünün ayrı kavramlar olduğu yazıldı.
- [x] Takım Yöneticisi işi istedi ve dört kararı onayladı (2026-10-20). **Commit ve sürüm yayını
      yalnız açık talimatla yapılır.**
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## Karar kaydı (QA turu 2026-10-20)

Yirmi yedi bulgunun hepsi onaylandı ve aşağıdaki maddelere işlendi.

| Bulgu | Konu | Karar | İşlendiği yer |
|---|---|---|---|
| **B-1** | Ölçüm 1 eksik ve tutarsız (dört/beş/yedi) | Yedi satırlı tablo, tek yol iki fonksiyon | ölçüm 1, C1, AC-32, AC-33 |
| **B-2** | Kırılım varken elle maliyet alanının davranışı tanımsız | Alan pasif ve nedenli, R7 yazım kuralı | R21, R7/2, AC-34, AC-35 |
| **B-3** | Tedarikçi okuması `SELECT *`, işaret sayı ve kapalıyken de gövdede | Koşullu atlayan emsal (`tevkifatOku`) | C3, C3/2, AC-28, AC-29, AC-36 |
| **Ö-1** | Silme koruması yalnız bir kapıda | Dört kapı tek yardımcıdan | R13/2, ölçüm 6, AC-37 |
| **Ö-2** | R16 ulaşılamaz, yokluk tanımsız | İki metinli tek çözücü, yol açıkça yazılı | R16, R16/2, AC-27, AC-38 |
| **Ö-3** | Ayarlar'a giden dizi ham ve kapısız | İki görünüm, prop App'te kapatılır | R17/2, C11, AC-5, AC-39 |
| **Ö-4** | İçe aktarma elle maliyeti geri yazıyor | Hücre alınmaz, neden bildirilir | R24, AC-40 |
| **Ö-5** | AC-30 kendi içinde çelişiyor | İki kritere bölündü | AC-30, AC-30/2 |
| **Ö-6** | Tek yolun birimi söylenmemiş | Birim kuruş, biçimleme ayrı | C9, AC-41 |
| **Ö-7** | Tedarikçisiz satır tanımsız | `ekMaliyetDogrula` emsali, tek erken dönüş | R23, AC-14, AC-42 |
| **Ö-8** | Sıfır yasağı 0087 R4 ile çelişiyor | Sıfır serbest, boş ayrı durum | R12, R8/2, AC-43 |
| **Ö-9** | Süzgecin denetimi ve kümesi tanımsız, sözlükle çelişiyor | `Select` + sözlük istisnası, küme daraltıldı | R10, R10/2, C14, AC-20, AC-44, AC-45 |
| **Ö-10** | Sayfa sıfırlaması kancada yok | Sıfırlama çağıranda | R22, AC-22 |
| **Ö-11** | Boşaltma birleştirme tuzağına giriyor | `hazirla` içinde destructure | C12, AC-46 |
| **Ö-12** | Kanıt kayıtları bugün "0 piksel" | Ekranlar adıyla, `degisti` + onay | ölçüm 7, DoD, AC-47 |
| **K-1** | AC-9'un aritmetiği yanlış (16.001) | Sayılar düzeltildi | AC-9 |
| **K-2** | "Kullanım" hücresi parçayı saymıyor | Hücre parça sayar | R13/3, AC-48 |
| **K-3** | "Silinemez" penceresinin cümlesi yanlış kalıyor | Kullanım türüne göre cümle | R13/4, AC-48 |
| **K-4** | AC-2 işaretin görünümünü söylemiyor | Rozet, yeni sütun yok | R2/2, AC-2 |
| **K-5** | AC-4'ün metni yazılmamış | Tek sabit + testId + yol adı | R4/2, AC-4 |
| **K-6** | AC-17'nin liste metni gürültü yapıyor | Yalnız kırılımlı satırda ikinci satır | R9/2, AC-17 |
| **K-7** | AC-23'ün boş durumu | Düz metin, `BosDurum` değil | C13, AC-23 |
| **K-8** | R3'ün "sınırsız"ı R11 ile çelişiyor | Sınır tedarikçi sayısı | R3 |
| **K-9** | Form şekli ile kayıt şekli farkı yazılmamış | Metin formda, sayı kayıtta | C3/3 |
| **K-10** | Model Maliyetleri değişiyor mu | Değişmez, kapsam dışı | X8 |
| **K-11** | Tuzak yalnız okumayı anlatıyor | Yazım tarafı da yazıldı | C3/4 |
| **K-12** | Alan adı ve satır şekli yok | `hammaddeler`, `{ tedarikciId, tutar }` | R25, AC-29 |

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

---

## Revizyonlar

- 1 · 2026-10-20 · İlk taslak. Ölçümler bu makinedeki kodla yapıldı (dal `feat/0094-harita-ilce`,
  `0ae3815` üstü). Dört karar onay bekliyor.
- 2 · 2026-10-20 · Takım Yöneticisi onayı: dört kararın tamamı önerilen seçenekle kapandı, durum
  Onaylandı'ya geçti. Requirements, Constraints ve Acceptance Criteria değişmedi.
- 3 · 2026-10-20 · QA boşluk analizi turu (main `d6f5a83` üstü): yirmi yedi bulgu (üç bloklayıcı, on iki
  önemli, on iki küçük) onaylandı ve işlendi. Üç bloklayıcı: ölçüm 1 yedi okuma yerinin ikisini (R19'un
  ve R21'in dayandığı satırları) saymıyordu ve "dört / beş / yedi" diye üç ayrı sayı veriyordu; tedarikçi
  okuması `SELECT *` ile çalıştığı için dört nokta kuralı tek başına işareti sayı olarak ve kapalıyken de
  gövdeye koyuyordu (C3 artık `tevkifatOku` emsalini veriyor); kırılım varken elle maliyet alanının ne
  olacağı hiçbir maddede yazılı değildi (R21). Düzeltilen iki olgu: AC-9'un toplamı (7.000,55 + 9.000,45
  = 16.001,00) ve ölçüm 5'in "yeni veri yolu gerekmiyor" cümlesinin eksik yarısı (dizi ham ve kapısız
  geçiyor). Üç yeni ölçüm (1 yeniden, 6 silme kapıları, 7 kanıt kayıtları) ve yirmi yedi satırlı karar
  kaydı eklendi.
- 4 · 2026-10-20 · Plan turu (`specs/0096-uygulama-plani.md`), Takım Yöneticisi bütün maddeleri onayladı. P1: C11'in
  kapısı App'ten parça paneline taşındı (App'te kapı yedeği bozardı). P2: birleştirmede kırılımdaki tedarikçi kimliği
  taşınır (R26, AC-49). P3: koruma çöpteki parçayı da sayar, "çöpü boşalt" istisnası (R13/5, AC-50). P4: kırılım
  formda hep form biçiminde (R17/3). P5: tedarikçi okumasının `deletedAt` davranışı değişmez (C3 notu). P6: işaret
  alanı `hammadde` (R25/2). P7: kuruş biçimleyici `urunAgaci.js`'te (C9). P8: testler satır numarasıyla değil adla arar.
