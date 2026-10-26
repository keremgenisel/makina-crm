# 0111 — Toplu yedek parça satışı yerinde düzenlenir

| | |
|---|---|
| **Durum** | Tamamlandı (revizyon 3: plan turu Karar 13–23 ve triyaj R2/3, R6/4, R9/2, AC-46–49, 2026-10-26; uygulama commit `50c070f`) |
| **Sahip** | Analist (spec) |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Müşteri detay penceresinin yedek parça satışı düzenlemesi (`src/components/customers/CustomerDetailModal.jsx:291-316` form açılışı, `:318-344` toplu kayıt kolu, `:114` kayıt kilidi, `:1515` çakışma ekranı), yeni saf karar fonksiyonu (`src/lib/yedekParcaSatis.js`; bugünkü `yedekParcaRec` `:37-110`, `yedekParcaGuncelle` `:113`, `musteriTahsisi` `:126-133`, `yeniYedekParcaSatisCoklu` `:159-180` değişmez, yalnız `:23` yorumu düzeltilir), form satırının kimlik taşıması (`src/components/YedekParcaSatisForm.jsx:49-53`). Dolaylı: Çöp Kutusu'nun yedek parça satırı (`src/components/settings/SettingsTrash.jsx:344`) artık bu yoldan beslenmez |
| **Bağımlı spec'ler** | 0065 (stok hareketi karşı hareketle geri alınır, `netDusum` / `netDusumAyni`), 0095 (ücretsiz işaretin tek yazım yolu ve karışık parti kuralı), 0079 (tevkifat alanlarının silinmesi ve `{ ...eski, ...rec }` tuzağı), 0044 (tahsilat hesabı), 0006 (teklif bağı) |
| **Ters çevrilen kriterler** | Yok. Bu yolun **kayıt kolunun** hiçbir testi yok (`batchEdit` ve "Toplu yedek parça satışı güncellendi" dizeleri `tests/` altında hiç geçmiyor), kusurun bugüne kadar yaşamasının nedeni de bu. **Form açılış kolu testli** ve dokunulmadan yeşil kalmalı: `tests/ui/ucretsiz-yedek-parca-0095.test.jsx:237` (0095 AC-48 triyajı) zaman çizelgesinden toplu formu açıp karışık parti uyarısını ölçüyor (ölçüm 20, AC-41) |

---

## Intent

Kullanıcı bir müşterinin yedek parça satışını düzenliyor, sonra Çöp Kutusu'nda o satışı silinmiş olarak buluyor. Silme yapmadı, yalnız düzenledi. Haklı: kayıt kullanıcı silmediği hâlde gerçekten silindi, çünkü çok parçalı bir satışı müşteri kartından düzenlemek bugün bütün parti kayıtlarını çöpe atıp satırlardan yeni kimliklerle yeniden kuruyor.

Görünen belirti çöpteki satır, ama asıl bedel onun arkasında. Yeni kimliklerle doğan kayıtlar İşlem Geçmişi zincirini koparıyor, makina tahsislerini sıfırlıyor, teslim şeklini ve farklı teslimat adresini sessizce boşaltıyor, panoya düşen satışta başka bilgisayarların kargo alarmını çalıyor ve yalnız düzenleme izni olan kullanıcıya kaydetme anında yetki hatası verdiriyor. Yani düzenleme bir düzenleme değil, bir sil ve yeniden kur işlemi.

Bu iş bittiğinde satır çıkarılmadığı sürece çöp kutusuna hiçbir şey düşmeyecek, kayıtların kimliği ve geçmişi duracak, elle yapılmış tahsis korunacak ve formun gösterdiği her alan partinin bugünkü değeriyle açılacak. Gerçekten çıkarılan satır ise bugünkü gibi silinecek, çünkü o bir silme işlemidir.

---

## Requirements

### A. Düzenleme kayıt silmez

- **R1.** Toplu (aynı parti kimliğini taşıyan) yedek parça satışının düzenlenmesi kayıtları **kendi kimlikleriyle** günceller. Formdaki her satır bir karara bağlanır: var olan bir kayda karşılık geliyorsa o kayıt güncellenir, formda yeni açılmış bir satırsa yeni kayıt doğar, partide olup formdan **çıkarılmış** kayıt silinir.
- **R1/2.** Silme ölçütü satırın listeden **çıkarılmasıdır**, değerinin geçerliliği değil. Kimliği taşıyan bir satır listede duruyorsa kaydı hiçbir hâlde silinmez, değeri geçersiz olsa da: parçası temizlenmiş ya da miktarı boşaltılmış satır kaydı **bütünüyle reddeder** (ya hep ya hiç, R1/3) ve nedeni satırın yanında yazar. Silme yalnız satırın çöp düğmesiyle listeden çıkarılmasıyla olur (Karar 4).
- **R1/3.** Geçersiz satır taşıyan bir düzenlemede hiçbir kayıt güncellenmez, eklenmez, silinmez ve hiçbir stok hareketi yazılmaz. Bugünkü sessiz süzme (`CustomerDetailModal.jsx:321`) bu kolda kalkar; ekleme kolunun sessiz süzmesi değişmez (bilinçli sapma, C9).
- **R2.** Satır ile kayıt eşlemesi **kaydın kimliğine** dayanır, satırın konumuna değil: form açılırken her satır hangi kayıttan geldiğini taşır. Satırların sırası değişse de aynı kayıt güncellenir. Kimlik yalnız form durumunda taşınır, kayda yazılmaz.
- **R2/2.** Satırın taşıdığı kimlik partide bulunamıyorsa (başka bilgisayar sildi, çakışma birleştirmesi kaydı yeniden kimliklendirdi, parti Stok sekmesinden silindi) o satır **yeni kayıt sayılmaz**: kayıt bütünüyle reddedilir ve kullanıcıya "Bu parti başka bir bilgisayarda değişti, pencereyi kapatıp yeniden açın." denir (Karar 9).
- **R2/3.** (Triyaj, 2026-10-26.) Form açılırken partinin kimlik kümesini taşır; kayıt anında partide bu kümede olmayan canlı bir kayıt varsa (form açıkken başka bilgisayar partiye satır ekledi) o kayıt "kullanıcı çıkardı" sayılmaz, düzenleme R2/2'nin metniyle bütünüyle reddedilir. Kayıt kilidi yalnız birincil kaydı tutar ve eklenen kayıt yeni kimlikle doğduğu için kilitli değildir.
- **R3.** Güncellenen kaydın kimliği, oluşturma zamanı ve parti kimliği korunur. Parti tek satıra inse de kalan kaydın parti kimliği değişmez (Karar 1).
- **R4.** Formdan gerçekten çıkarılan satırın kaydı bugünkü silme davranışıyla silinir: Çöp Kutusu'na düşer, düşülmüş stoğu geri alınır ve çöpten geri alınabilir. Bu bir silmedir ve öyle görünür.
- **R5.** Kullanıcı satır çıkarmadıysa bu düzenleme Çöp Kutusu'na hiçbir satır düşürmez.

### B. Düzenleme veri kaybetmez

- **R6.** Form partinin bugünkü değerleriyle açılır: **formun gösterdiği her ortak alan** partinin **birincil kaydından** okunur. Birincil kayıt zaman çizelgesinin olayı kuran kayıttır (`deriveCustomerDetail.js:72` `const ilk = kayitlar[0]`, `:77` `yp: ilk`), yani canlı kayıtların dizideki ilki. Bugün okunmayan ve bu yüzden kaydedilince sıfırlanan alanlar en az şunlardır: teslim şekli (fabrika teslim mi kargo mu), farklı teslimat adresi işareti ve altı adres alanı, tevkifat işareti ve oranının iki parçası.
- **R6/2.** Ortak alan partinin satırları arasında **ayrışabilir** (`odendi` yalnız ücretli satırlara yazılır, `panoGizli` yalnız Tamamlandı sütununda korunur, `tahsilEdildi` ve `hesapId` kayıt başınadır). Kural: form ortak alanı birincil kayıttan okur ve kaydedince güncellenen bütün satırlara aynı değeri yazar, ayrışan değer kaybolur. Bu bilinçli bir düzleştirmedir (bugün de sil ve yeniden kur yüzünden yaşanıyor) ve bilinen sınır olarak kayda geçer (Karar 8).
- **R6/3.** `odendi` ve `panoGizli` bu düzleştirmenin **dışındadır**: ikisi de satır başına anlamlıdır ve güncellemede kaydın kendi değeri korunur. `odendi`'yi birincilden bütün satırlara yazmak 0095 R7/2 ile (ücretsizde ödeme durumu yoktur) çakışır, `panoGizli`'yi yazmak arşivlenmiş kargo kartını geri getirir.
- **R6/4.** (Triyaj, 2026-10-26; 0109 Karar 21 emsali.) Toplu formun "Ödendi" kutusu görünür olduğu için R6/3'ün istisnası yalnız kutuya **dokunulmadıysa** geçerlidir. Kutunun değeri açılış değerinden farklıysa değer ücretli bütün satırlara yazılır: işaretlenince zaten ödenmiş satır kendi tahsilat tarihini korur, yeni işaretlenen satıra tek tık anahtarının kuralıyla o gün yazılır (çek ve kredi kartında boş); işaret kaldırılınca bütün satırlar ödenmemiş olur ve tahsilat tarihi silinir. Ücretsiz işaret önce gelir (0095 R7/2).
- **R7.** Formun hiç göstermediği alanlar güncellenen kayıtta olduğu gibi kalır: teklif bağı (belge ve alt kalem kimliği), oluşturma zamanı, tahsilat tarihi, stok hareketi bağı ve **pano arşiv işareti** (`panoGizli`; bugün kaybediliyor, yani arşivden kaldırılmış bir kargo düzenlenince panoya geri dönüyor, ölçüm 18).
- **R7/2.** Kart komisyonu anlık görüntüsü satır başınadır: güncellenen kaydın komisyonu **kendi kaydından** okunan tabanla yeniden hesaplanır (`kartTabanKaydi(form, kayit)` emsali; bugün taban yalnız formdan okunuyor, `yedekParcaSatis.js:63`). 0079 R13'ün "Kart komisyonunu yeni tabanla hesapla" düğmesi toplu düzenlemede de aynı işi yapar.
- **R8.** Ücretsiz işaretinin bugünkü kuralı aynen kalır (0095 R13, R23): işaret form düzeyindedir, form yalnız partinin bütün satırları ücretsizse işaretli açılır, karışık partide uyarı şeridi çıkar ve kaydedilince form işareti bütün satırlara uygulanır.
- **R9.** Alıcı değiştirilebilir kalır (form bugün de buna izin veriyor) ve değişiklik güncellenen bütün kayıtlara uygulanır.
- **R9/2.** Alıcı bayiye ya da anlaşmasız dış firmaya çevrilirse parti bu makinanın **düzenlenebilir** olaylarından çıkar ve bir daha buradan düzenlenemez (zaman çizelgesi düzenlenebilir yedek parça olayını yalnız alıcı müşteri olan kayıtlar için kurar, `deriveCustomerDetail.js:68`; bayi alımı salt okunur tahsis olayına düşer). Kaydetme bildirimi bunu söyler ve kaydın Stok sekmesinden düzenlenebileceğini yazar. (Triyaj, 2026-10-26.) Ölçüt alıcının açık olan makina olup olmadığıdır: alıcı başka bir müşterinin makinası olursa bildirim satışın o makinaya taşındığını söyler (`topluBildirimi`).

### C. Makina tahsisi

- **R10.** Bir kaydın makina tahsisi **otomatik tam tahsis** ise (tek satır, miktarı kaydın miktarına eşit, müşterisi kaydın alıcısı, seri no ve serbest metin boş) ve miktar ya da alıcı değiştiyse yeni miktarla yeniden damgalanır; alıcı bayi olduysa tahsis boşalır.
- **R10/2.** Tahsisin **tarihi** ölçüte girmez (elle düzeltilmiş tarih tahsisi "elle yapılmış" saymaz) ve yeniden damgalamada tahsisin **kendi** tarihi korunur, satışın güncel tarihiyle ezilmez. `musteriTahsisi` tarihi satışın tarihinden yazar (`yedekParcaSatis.js:132`) ve bunun nedeni makina geçmişinin olay sırasıdır; düzenlemede satış tarihi değişebildiği için tahsisin tarihini onunla ezmek o sırayı bozar.
- **R11.** Başka her hâlde tahsis **olduğu gibi korunur** ve düzenleme ona dokunmaz: birden fazla tahsis satırı, kısmi tahsis, farklı makinaya tahsis, seri no ya da serbest metin dolu olan tahsis. Miktar küçüldüğü için fazla kalan ya da büyüdüğü için eksik kalan tahsis Stok sekmesinin "Tahsisi eksik" iş listesinde görünür (Karar 2).
- **R12.** Miktar ve alıcı değişmediyse tahsise hiç dokunulmaz.

### D. Stok

- **R13.** Stoğa dokunup dokunmamanın ölçütü **net düşümün istenenle birebir aynı olmasıdır**, "parça ve miktar değişti mi" değil: `netDusumAyni(partStockLog, kayitId, "bayi_satis", [rec])` true ise stoğa dokunulmaz (0065 R5, bugünkü tek kayıt kolunun ölçütü, `CustomerDetailModal.jsx:352`). Karşı hareket yazmak log'u gereksiz büyütürdü.
- **R13/2.** Eksik düşülmüş (kırpılmış) kayıtta ölçüt false döner ve **bugünkü davranış aynen sürer**: eski düşüm geri alınır, stok uygunsa eksik kısım tamamlanır (`stokHareketi.js:66-70`'in yazılı kuralı). Parça ve miktar değişmemiş olsa da bu kayıtta stok hareketi yazılır. Ölçüm 8'e göre müşteri alıcılı partili 455 kaydın 435'inde duran net düşüm yok, yani "dokunma" kuralı kayıtların **azınlığında** geçerlidir; bu, 0065'in kararıdır ve bu spec'te değişmez (Karar 5).
- **R14.** Net düşümü istenenden farklı olan kayıtta eski düşüm karşı hareketle geri alınır ve yeni miktar düşülür. Stok eksiye düşmez: yalnız kullanılabilir kadarı düşülür ve kayıt tam miktarla saklanır.
- **R15.** Aynı parçadan partide birden fazla satır varsa kullanılabilir adet **birikimli** hesaplanır: bir satırın düşümü sonraki satırın hesabına girer, geri alınan düşümler kullanılabilir adede eklenir. Bugünkü tek kayıt kolu bunu yapmıyor, çoklu ekleme yolu yapıyor (`stokGorunum` haritası, `yedekParcaSatis.js:166-178`).
- **R15/2.** Birikimli tabanın tanımı: saf fonksiyona verilen **stok anlık görüntüsü** artı bu düzenlemede **geri alınan bütün net düşümler** (çıkarılan satırların ve güncellenen satırların net düşümleri). Satırlar form sırasıyla işlenir ve her düşüm tabandan iner. Taban parça başına tutulur; partide geçmeyen parçanın tabanı hesaplanmaz (Karar 6).
- **R16.** Stok hareketi satırı hiçbir hâlde silinmez; geri alma karşı hareketle yazılır (0065 R6).

### E. Karar, izin ve iz

- **R17.** Düzenleme kararı React'sız **saf bir fonksiyondur**: partinin bugünkü kayıtları ile formun satırları ve ortak alanları girer; güncellenecek kayıtlar, eklenecek kayıtlar, silinecek kayıtlar ve stok işlemleri çıkar. Ekran yalnız uygular, karar yazmaz.
- **R17/2.** Fonksiyon kimlik ve zaman üretmez, **parametre alır**: yeni kaydın kimliği ve oluşturma zamanı ile silme damgası dışarıdan verilir (`{ yeniId, simdi }` deseni; emsalleri `uretimPartisi.partiKapanisUygula(eski, yeni, havuz, simdi)` ve `urunAgaci.maliyetGecmisiYaz(..., { tarih, bugun })`). Bugünkü yol kimliği `uid()` ve damgayı `simdiYerel()` / `new Date().toISOString()` ile içinden üretiyor (`yedekParcaSatis.js:141, :144`, `CustomerDetailModal.jsx:331`), bu da AC-24'ün determinizmini imkânsız kılar (Karar 7).
- **R18.** Satır eklenmeyen ve çıkarılmayan bir düzenleme sunucuda ekleme ya da silme izni istemez. Satır eklenen düzenleme ekleme iznini, satır çıkarılan düzenleme silme iznini bugünkü kurallarla ister.
- **R18/2.** Bunun ölçüldüğü izin kümesi: `customerActions` içinde `cust_yedek_parca_edit` var, `cust_yedek_parca_add` ve `cust_yedek_parca_delete` yok; `stockActions` **boş olmayan** bir dizi (ör. `["stock_makina_add"]`) ve içinde `yedek_parca_add` ile `yedek_parca_delete` yok. Boş `stockActions` ile aynı sonuç alınmaz (bilinen sınır, C8); tanımsız `stockActions` ise ekleme ve silmeyi de serbest bırakır, yani AC-21 o kullanıcıda ölçülemez (Karar 10). **Plan turu (Karar 13):** küme `dealerActions`'ı da **tanımlı** bir dizi olarak sabitler (`[]` ya da `dealer_yedek_parca_add` ve `dealer_delete` içermeyen dizi): tanımsız bayi boyutu tam yetki sayıldığı için `dealer_yedek_parca_add` eklemeyi, `dealer_delete` bölüm kapısını geçirir ve AC-21 ile AC-31 o kullanıcıda ölçülemez.
- **R19.** İşlem Geçmişi yapılan işi yazar: güncellenen kayıt için `duzenlendi`, yeni kayıt için `olusturuldu`, çıkarılan kayıt için `silindi`.
- **R20.** Düzenleme Servis ve Kargo Panosu'na yeni kargo düşürmez: güncellenen kayıt yeni kimlik almadığı için başka bilgisayarlarda alarm ve ses çıkmaz, kartın sırası değişmez.
- **R20/2.** Eklenen satır bunun dışındadır: panoya gönderilmiş bir partiye eklenen satır `kargoDurum`'u ortak alandan alır, yeni bir kargo kaydı olarak panoda **kendi kartıyla** görünür ve bugünkü alarm kuralı aynen işler (ekleyen bilgisayarda `yerelServisEkle` ile bastırılır, `yedekParcaSatis.js:150`; diğerlerinde alarm ve ses çıkar). Bu doğru davranıştır, bastırılmaz (Karar 11).

### F. QA turunda eklenen kurallar (2026-10-26)

- **R21.** Toplu düzenleme kayıt kilidi alır. Bugün hiç almıyor: kilit `useLock("yedek_parca", ypForm?.id ?? null)` ile kuruluyor (`CustomerDetailModal.jsx:114`) ve toplu formda `id` hiç yok, çakışma ekranı da yalnız tek kayıtta çiziliyor (`:1515` `ypLock && ypForm.id`). Kural: toplu düzenleme partinin **birincil kaydının** kimliğiyle `yedek_parca` kilidini alır (dosya bağının kullandığı anahtar) ve çakışmada bugünkü `LockConflict` ekranı çizilir; kayıt anında partinin **bütün** kayıtlarının kilidine `useKilitListesi` ile anlık bakılır (0064 R36'nın ciro emsali) ve başkasının kilidi varsa kayıt bildirimle reddedilir. Kilit alanı ve onu paylaşan dört pencere değişmez (C6).
- **R22.** Kargo durumunu değiştiren toplu düzenleme `stockActions` içinde `yedek_parca_edit` ister. Bu yeni bir denetim değil, var olan alan denetiminin (`serverAuth.cjs:572` `ALAN_IZINLERI.yedekParcaSatislar`) **ilk kez görünür olmasıdır**: alan denetimi yalnız var olan kimlikte çalışıyor (`:773` `if (!e) continue`), bugünkü sil ve yeniden kur yolu her kaydı yeni doğurduğu için denetimi hiç tetiklemiyordu. Denetim kaldırılmaz; panodan sürükleyerek durum değiştirmenin tek sunucu koruması odur. Kargo durumuna dokunmayan düzenleme bu izni istemez (bilinen sınır, ölçüm 15).

---

## Zorunlu kısıtlar

- **C1.** Yeni kalıcı alan, veri bölümü, izin, sunucu kuralı ve göç yok. Satır kimliği form durumundadır.
- **C2.** Kayıt kuruluşunun tek kaynağı `src/lib/yedekParcaSatis.js` kalır; düzenleme kolu `yedekParcaRec` ve `yedekParcaGuncelle`'yi atlamaz. İkisini atlamak 0079 R5/1 ve 0095 R14/2 tuzağına düşer: `{ ...eski, ...rec }` birleştirmesi eski tevkifat ve ücretsiz işaretini silmez, bu yüzden her yazım bu iki fonksiyondan geçer.
- **C3.** Stok düşümünün ve geri almanın tek kaynağı `src/lib/yedekParcaStok.js` kalır; yeni bir düşüm yolu yazılmaz (0065 kaynak taraması).
- **C4.** Tek satırlık satışın düzenlemesi davranış olarak değişmez: Stok sekmesi (`YedekParcaSatisTab.jsx:184`), müşteri detayının tek kayıt kolu (`CustomerDetailModal.jsx:345-363`) ve bayi detayı bugünkü gibi yerinde günceller.
- **C5.** Çoklu ekleme yolu (`yeniYedekParcaSatisCoklu`) ve parti kimliğinin yalnız birden fazla satırda atanması kuralı değişmez.
- **C6.** Kayıt kilidi alanı (`yedek_parca`) ve onu paylaşan dört pencere değişmez (`src/lib/kilitAlanlari.js:15`).
- **C7.** Çöp kutusu simetrisi korunur: gerçekten silinen satır geri alınabilir ve geri alınınca stoğu yeniden düşülür.
- **C8.** `cust_yedek_parca_edit` **yalnız arayüz kapısıdır**, sunucuda hiç tanınmaz: `serverAuth.cjs`'te geçmez, bölüm kapısında (`:490`), `EYLEM_IDLERI`'nde ve `ALAN_IZINLERI`'nde yok. Düzenleme sunucuda bölüm düzeyinde güvenilir ve bu sınır gevşetilmez. Bilinen sınır: `stockActions: []` olan kullanıcı bölüm kapısından 403 alır ve bu partiyi R18'den sonra da kaydedemez; kapıyı gevşetmek 0007 ve 0044'ten beri duran kasıtlı sınırı deler.
- **C9.** Eklenen satır `yeniYedekParcaSatis`'i satır satır çağırır, `yeniYedekParcaSatisCoklu`'yu çağırmaz: o fonksiyon `batchId`'yi her çağrıda yeniden üretiyor (`yedekParcaSatis.js:164` `satirlar.length > 1 ? uid() : null`), yani AC-6'nın "aynı parti kimliğini taşır" şartı o yoldan sağlanamaz. Parti kimliğini form taşır. Ekleme kolunun kendi sessiz satır süzmesi değişmez (R1/3'ten bilinçli sapma) ve `yeniYedekParcaSatisCoklu` ile `yeniYedekParcaSatis` dokunulmaz (C5).
- **C10.** `yedekParcaSatis.js:23`'teki yorum bu işte düzeltilir: "karışık partinin toplu düzenlemesi partiyi yeniden kurar" cümlesi artık doğru değildir; yerine form işaretinin bütün satırlara uygulandığı yazılır. `KARISIK_PARTI_UYARISI` metni ve 0095 AC-48 testi değişmez (R8).

---

## Kapsam dışı

- **X1.** Tek satırlık satışın düzenlemesine satır ekleme yetisi gelmez — *neden:* bugün de yok, bu spec var olan yolu düzeltir, yeni yetenek getirmez; tek kayıt için satır ekleme ayrı bir arayüz kararıdır.
- **X2.** Bayi detayından ve Stok sekmesinden toplu düzenleme yetisi gelmez — *neden:* aynı gerekçe, kapsam kayması olur.
- **X3.** Eski düzenlemelerde kaybolmuş teslim şekli, farklı teslimat adresi ve tahsis verisi geri getirilmez, göç yazılmaz — *neden:* kaybın hangi kayıtta yaşandığı veride yazılı değil; çöpteki eski kayıttan okumak yanlış kayda yazabilir ve otuz günü geçmiş kayıtlar çöpte de yok (Karar 3).
- **X4.** Pano kartının gruplaması, kargo etiketi çıktısı ve dosya bağı kuralı değişmez — *neden:* kimlikler ve parti kimliği korunduğu için bugünkü davranış kendiliğinden doğru çalışır, dokunmak gereksiz risktir.
- **X5.** Tahsisin elle düzenlendiği pencere (`TahsisModal`) değişmez — *neden:* bu spec düzenlemenin tahsise ne yaptığını düzeltir, tahsis arayüzüne dokunmaz.
- **X6.** Extra Kalıp satışının düzenlemesi kapsam dışı — *neden:* ölçtüm, orada aynı kusur yok: Extra Kalıp düzenlemesi tek kaydı kendi kimliğiyle açıyor ve gösterdiği bütün alanları (teslim şekli, farklı adres, kargo) kayıttan okuyor (`CustomerDetailModal.jsx:411-436`).
- **X7.** Çöp Kutusu'nda duran, eski düzenlemelerden kalmış yedek parça satırları temizlenmez — *neden:* kullanıcı onları geri almak isteyebilir; otuz günlük temizlik zaten düşürecek.
- **X8.** Partiye bağlı dosyalar birincil satır çıkarıldığında yeni birincil kayda taşınmaz — *neden:* dosya hedefi partinin ilk kaydının kimliğidir (`CustomerDetailModal.jsx:560-563` `batchGrupla`, `id: g[0].id`; sayım `:590` `dosyaAdet`), yani birincil satır silinince dosyanın `refId`'si silinmiş kayda bakar, etiketi "Yedek Parça (Kargo)"ya düşer (`CustomerFilesSection.jsx:42`) ve kalan partinin dosya sayısı sıfır olur. Taşıma kuralı yeni bir yazma yolu açar ve kapsam kayması olur; bu işten sonra kayıp yalnız "birincil satırı çıkar" hâlinde kalır, bugün ise her düzenlemede yaşanıyor (Karar 12).

---

## Ölçümler (2026-10-26 yedeği)

> **Kaynak notu.** 1-10 arası sayılar analistin yerel yedeğinden (2026-10-26, 13:12) alınmıştır; yedek dosyası depoda ve bu işin çalışma klasöründe tutulmuyor, bu yüzden QA turunda yeniden üretilemedi. Kodla doğrulanabilen ölçümler (3, 9, 11 ve 12'den sonrası) yeniden ölçüldü ve tutuyor. **Hiçbir kabul kriteri bu sayılara bağlı değildir.**

1. **971 yedek parça satışı canlı, çöpte sıfır.** Kullanıcının gördüğü çöp satırı bu yedeğin alındığı 13:12'den sonra oluştu ya da otuz günlük temizlik eski izleri düşürdü.
2. **481 kayıt bir partiye bağlı**, bunların **455'i müşteri alıcılı**. Müşteri alıcılı **153 parti** var ve her birinde en az iki satır: 81 partide 2, 36'sında 3, 19'unda 4, 8'inde 5, 5'inde 6, birinde 7, birinde 10, ikisinde 11 satır.
3. **Tek satırlık satışta parti kimliği yok** (`yedekParcaSatis.js:164`: parti kimliği yalnız birden fazla satırda atanır). Ölçtüm: müşteri alıcılı partilerin hiçbiri tek satırlı değil. Kusur tam olarak "çok parçalı satışı müşteri kartından düzenlemek" durumunda çıkıyor.
4. **Sessiz veri kaybı ölçüldü.** Müşteri alıcılı partili kayıtların **48'i fabrika teslim** (18 partide) ve **8'i farklı teslimat adresi taşıyor** (3 partide). Bu alanlar forma hiç taşınmadığı için düzenleme kaydedilince teslim şekli kargoya döner ve adres boşalır. Kullanıcı formda bu kutuları işaretsiz gördüğü için kaybı fark etmez.
5. **Bugün kaybı olmayan ama yolu açık olan alanlar:** tevkifatlı kayıt 0, teklif bağlı kayıt 0, kart komisyonlu partili kayıt 0, tahsilat tarihi dolu partili kayıt 0. Dördü de forma taşınmıyor, yani ilk kayıt oluştuğunda kayıp başlar.
6. **Ücretsiz işareti bugün korunuyor.** 14 kayıt ücretsiz işaretli ve **karışık parti yok** (bir partinin hem ücretli hem ücretsiz satırı olduğu hâl sıfır), yani 0095 R23'ün koşullu taşıma kuralı bugünkü veride işareti kaybetmiyor.
7. **Tahsis kaybı küçük ama gerçek.** Müşteri alıcılı partili kayıtların birinde tahsis satırında seri no ya da serbest metin dolu, birinde birden fazla tahsis satırı var; hiçbirinde tahsis toplamı miktardan farklı değil. Bugünkü yeniden kurma bu elle yapılmış işi her hâlde siliyor.
8. **Stok tarafı çoğunlukla açık iş (QA turunda çıkarım düzeltildi).** Müşteri alıcılı partili 455 kaydın yalnız **20'sinde** duran net stok düşümü var; kalanında log satırı hiç yok ya da zaten geri alınmış. İlk yazımda bundan "R13'ün dokunma kuralı kayıtların büyük çoğunluğunda geçerli olacak" çıkarımı yapılmıştı ve bu **yanlış**: ölçüt `netDusumAyni` olduğu için (ölçüm 13) net düşümü olmayan **435 kayıtta** ölçüt false döner ve yalnız birim fiyatı değiştiren bir düzenleme bile, stok uygunsa, eksik kısmı tamamlayan yeni bir düşüm yazar. Bu 0065 R5'in kararıdır ve bu spec'te değişmez (R13/2, Karar 5).
9. **Yetki duvarı.** Bugünkü yol aynı yazımda hem ekleme hem silme yapıyor ve sunucu ikisini kayıt düzeyinde ayrı ayrı istiyor (`electron/serverAuth.cjs:726-764`). Yalnız düzenleme izni olan bir kullanıcı (ekleme ve silme izni olmayan) bu partiyi kaydedemez, 403 alır. R18'den sonra satır eklemeyen ve çıkarmayan düzenleme izin istemez.
10. **Pano alarmı.** Partili kayıtların hiçbirinde bugün pano durumu dolu değil (0 kayıt), ama panoya gönderilmiş bir parti düzenlenirse yeni kimlikler "Hazırlanıyor" sütununa yeni kargo gibi düşer; kendi bilgisayarı susturulur, **diğer bilgisayarlarda alarm ve ses çalar**.
11. **Testsiz yol, ama yalnız kayıt kolu (QA turunda daraltıldı).** `batchEdit` ve "Toplu yedek parça satışı güncellendi" dizeleri `tests/` altında hiç geçmiyor, yeniden ölçtüm, doğru. Ama **form açılış kolu testli**: `tests/ui/ucretsiz-yedek-parca-0095.test.jsx:237` zaman çizelgesindeki toplu satış başlığına tıklayıp `openEditYedekParca`'nın toplu dalını çalıştırıyor ve karışık parti uyarısını ölçüyor (ölçüm 20). Testsiz olan yalnız `saveYedekParca`'nın toplu dalıdır. Yedek parça satışının adıyla ayrılmış dört saf testi (`yedek-parca-satis`, `-stok`, `-parti`, `-export`), 0095'in iki saf testi ve satış formunu çizen iki arayüz testi (`ui/yedek-parca-satis`, `ui/yedek-parca-form-teslim`) var.

### QA turu ölçümleri (2026-10-26)

12. **`cust_yedek_parca_edit`'in sunucu ayağı yok.** Kimlik yalnız üç arayüz yerinde: `serverPermissionDefs.js:126` (etiket "Yedek parça satışını düzenle"), `CustomerDetailModal.jsx:292`, `MachineTimeline.jsx:175`. `electron/serverAuth.cjs`'te hiç geçmiyor. Bölüm kapısı (`serverAuth.cjs:490`) `yedekParcaSatislar` için şunu istiyor: `stockActions` boş değil **ya da** dört ekleme izninden biri (`YEDEK_PARCA_EKLE_IZINLERI`) **ya da** iki silme izninden biri **ya da** `cust_delete` / `dealer_delete`. `grupEngelli` yalnız **boş dizide** true, `eylemIzinli` tanımsız boyutu tam erişim sayıyor. Üç hâl çıkıyor: `stockActions: []` → 403 (AC-20 tutmaz), tanımsız `stockActions` → ekleme ve silme de serbest (AC-21 tutmaz), boş olmayıp `yedek_parca_add`/`_delete` içermeyen dizi → ikisi birlikte tutar. `partStock` ve `partStockLog` `EYLEM_IDLERI`'nde olmadığı için bu üçüncü kullanıcıda stok hareketleri de geçer.
13. **Stok ölçütü `netDusumAyni`.** `CustomerDetailModal.jsx:352` tek kayıt kolunda `netDusumAyni(partStockLog, eskiId, "bayi_satis", [rec])` çağırıyor; `stokHareketi.js:71-82` net düşümü istenen kalemlerle karşılaştırıyor ve `:66-70`'in yorumu açıkça yazıyor: "Eksik düşülmüş (kırpılmış) kayıtta false döner; o zaman eski akış çalışır ve stok uygunsa eksik kısım düşülür". `yedekParcaDus` sıfır adette hiç satır yazmıyor (`yedekParcaStok.js:13`), yani stoğu tükenmişken satılan kaydın log'u hiç yok.
14. **Satırı geçersiz kılmanın iki yolu var ve ikisi de kaydı sessizce düşürüyor.** `CustomerDetailModal.jsx:321` satırları `filter(s => s.partId && (parseInt(s.miktar) || 0) > 0)` ile süzüyor. Formda parça çipinin X düğmesi `setSatir(i, "partId", "")` yapıyor (`YedekParcaSatisForm.jsx:214`) ve miktar alanı elle boşaltılabiliyor (`:220`). Satırın kimliği `{ ...s }` yayılmalarıyla korunduğu için (`:50`, `:53`) yerinde güncelleme bu satırı "çıkarılmış" sayar ve kaydı çöpe atar.
15. **Kargo durumu alan denetimi.** `serverAuth.cjs:572` `ALAN_IZINLERI.yedekParcaSatislar = [{ alan: "kargoDurum", group: "stockActions", id: "yedek_parca_edit" }]`. Denetim yalnız eskide ve yenide aynı kimlikli kayıtta çalışıyor (`:773` `if (!e) continue`), yani bugünkü sil ve yeniden kur yolu onu hiç tetiklemiyor. Toplu form `kargoDurum`'u ortak alan olarak taşıyor ve "Servis ve Kargo Panosuna gönder" kutusuyla değiştirilebiliyor.
16. **Toplu düzenleme kilitsiz.** Kilit `useLock("yedek_parca", ypForm?.id ?? null)` (`CustomerDetailModal.jsx:114`); toplu form `id` kurmuyor (`:298-312`), yani `null` geçiyor ve kilit alınmıyor. Çakışma ekranı `:1515`'te `ypLock && ypForm.id` koşuluyla çiziliyor, yani toplu kolda hiç çizilmiyor. Kilit alanı `yedek_parca` dört pencere paylaşıyor (`kilitAlanlari.js:15`).
17. **Birincil kayıt dizi sırasına bağlı ve ortak alanlar ayrışabiliyor.** Zaman çizelgesi partiyi `batchId`'ye göre gruplayıp `const ilk = kayitlar[0]` ile birincilini seçiyor (`deriveCustomerDetail.js:70-77`) ve formu açan `rec` o kayıt. Ayrışabilen alanlar ölçüldü: `odendi` yalnız ücretli satırlara yazılıyor (`CustomerDetailModal.jsx:375` `ypOdemeIdleri`), `panoGizli` yalnız Tamamlandı sütununda korunuyor (`ServisPanosu.jsx:275`), `tahsilEdildi` ve `hesapId` kayıt başına.
18. **`panoGizli` bugün kayboluyor.** Alan kargo kartının arşiv işareti (`ServisPanosu.jsx:249` pano süzgeci, `:256` arşiv listesi, `:282` yazma) ve veritabanında `toBool` ile okunan kendi sütunu (`db.cjs:1467`). `yedekParcaRec` onu hiç yazmıyor, yani sil ve yeniden kur yolunda arşivden kaldırılmış bir kargo düzenlenince panoya geri dönüyor.
19. **Dosya bağı birincil kaydın kimliğine bağlı.** `batchGrupla` partiyi `batchId`'ye göre toplayıp hedefi `id: g[0].id` ile veriyor (`CustomerDetailModal.jsx:560-563`); sayım `dosyaAdet(refType, refId)` o kimliği arıyor (`:590`); etiket çözülemezse "Yedek Parça (Kargo)"ya düşüyor (`CustomerFilesSection.jsx:42`). Yedek parça satışına dosya bağlanabildiğini doğruladım (`refType` değeri `yedekkargo`, `detailYedekKargolar` `:579-585`).
20. **Form açılış kolunun tek testi.** `tests/ui/ucretsiz-yedek-parca-0095.test.jsx:237` ("AC-48 (triyaj): karışık partiyi makina geçmişinden toplu düzenlerken uyarı şeridi çıkar; bütünü ücretsiz partide çıkmaz") zaman çizelgesinde `Yedek Parça (Kargo|Fabrika Teslim) (2 kalem)` başlığına tıklıyor, yani `openEditYedekParca`'nın toplu dalını çalıştırıyor; `karisik-parti-uyarisi` metnini ve bütünü ücretsiz partide kutunun işaretli geldiğini ölçüyor. Kaydetmiyor.
21. **Kimlik ve zaman bugün fonksiyonun içinden.** `yeniYedekParcaSatis` kimliği `uid()` ile (`yedekParcaSatis.js:141`), oluşturma zamanını `simdiYerel()` ile (`:144`) üretiyor; toplu silme damgası `new Date().toISOString()` (`CustomerDetailModal.jsx:331`). Depodaki enjeksiyon emsalleri: `uretimPartisi.partiKapanisUygula(eski, yeni, havuz, simdi)` ve `urunAgaci.maliyetGecmisiYaz(eski, cozulmusK, { tarih, bugun, tarihElle })`.
22. **Birikimli stok yalnız ekleme yolunda var.** `yeniYedekParcaSatisCoklu` parça başına `stokGorunum` haritası tutuyor ve her satırdan sonra düşüyor (`yedekParcaSatis.js:166-178`); tek kayıt kolu tabanı tek kayıt üzerinden kuruyor (`CustomerDetailModal.jsx:355` `totalMiktar(partStock, rec.partId) + eskiDusum`). Aynı fonksiyon `batchId`'yi de yeniden üretiyor (`:164`), yani eklenen satır için kullanılamaz.
23. **Tahsisin tarihi satışın tarihinden.** `musteriTahsisi` beş alanlı satır üretiyor: `{ miktar, customerId, serialNo: "", makinaSerbest: "", tarih: rec.tarih || today() }` (`yedekParcaSatis.js:132`) ve yorumu tarihin satışın tarihi olmasının bilinçli olduğunu, bugünün tarihinin makina geçmişinde olay sırasını bozduğunu yazıyor (`:129-131`).
24. **Son satır silinemiyor.** Satır silme düğmesi `disabled={satirlar.length <= 1}` (`YedekParcaSatisForm.jsx:222`), yani "formdaki bütün satırlar silinirse" yolu düğmeyle erişilemez; bugünkü hata bildirimi ("En az bir yedek parça ekleyin (parça + miktar).") ancak son satırın parçası ya da miktarı boşaltılarak tetiklenir.
25. **Para birimi seçicisi üç değer.** Form `TRY`, `USD`, `EUR` seçeneklerini çiziyor (`YedekParcaSatisForm.jsx:148-152`). Bilinmeyen para birimi ancak içe aktarmadan ya da eski veriden gelir; o hâlde `form.currency` kayıttan gelen değeri taşır ve `yedekParcaRec` onu `form.currency || "TRY"` ile aynen geri yazar (`yedekParcaSatis.js:84`).
26. **Kart komisyonunun tabanı bugün formdan.** `yedekParcaRec` tabanı `kartTabanKaydi(form)` ile seçiyor (`yedekParcaSatis.js:63`); o fonksiyon `form.kartKomisyonu` varsa onun tabanını, `_kartYeniTaban` işaretliyse formun bugünkü tevkifatını kullanıyor (`satisTevkifat.js`). Toplu form `kartKomisyonu`'nu taşımıyor, yalnız `kkYansit` ve `kartTarihi`'ni taşıyor (`CustomerDetailModal.jsx:303`).
27. **Alıcı bayiye çevrilince kayıt bu yoldan çıkıyor.** Zaman çizelgesi düzenlenebilir yedek parça olayını yalnız `aliciTipi === "musteri"` ve bu makinanın kayıtları için kuruyor (`deriveCustomerDetail.js:68`); bayi, anlaşmasız dış firma ve başka müşterinin alımı salt okunur tahsis olayına düşüyor (`:92-108`, `ypTahsisId`) ve düzenleme düğmesi yok. Aynı ölçüm X2'yi de doğruluyor: bayi alıcılı parti bu yoldan hiç açılamıyor, yani dış firma alanlarının kaybı bu kolda erişilemez.
28. **Toplu form taslak taşımıyor.** `YedekParcaSatisForm` çağrısına `draftBar` verilmiyor (`CustomerDetailModal.jsx:1520-1525`; servis ve Extra Kalıp formları `:1499` ve `:1511`'de alıyor), yani form durumu yalnız bellekte duruyor ve bayat bir taslak kaydın kimliğini geri getiremez. R2/2'nin kapsadığı tek yol çakışma ve başka bilgisayarın silmesidir.
29. **Doğrulanan ve kayan satır atıfları.** Doğru: `musteriTahsisi :126-133`, `yeniYedekParcaSatisCoklu :159-180`, form satır yardımcıları `:49-53`, `SettingsTrash :344`, `kilitAlanlari :15`, `serverAuth :726-764`, `YedekParcaSatisTab :184`. Kayanlar düzeltildi: `yedekParcaRec :37-110` (spec `:35-118` diyordu), `yedekParcaGuncelle :113` (`:117`), toplu kayıt kolu `:318-344` (`:317-345`), form açılışı `:291-316` (`:291-315`), tek kayıt kolu `:345-363` (`:348-359`, gövdeyi veriyor ama `if (ypForm.id)` kapısını dışarıda bırakıyordu).
30. **Düzeltilecek yorum.** `yedekParcaSatis.js:23`: "Spec 0095 R23 (triyaj): karışık partinin toplu düzenlemesi partiyi yeniden kurar; ücretsiz satır saklı fiyatıyla ücretli doğar." Bu işten sonra ilk yarısı yanlış olur, ikinci yarısı (R8 gereği) doğru kalır.

---

## Kararlar (Takım Yöneticisi, 2026-10-26)

Takım Yöneticisi 2026-10-26'da **üç kararın hepsini analistin önerisiyle** verdi. Aşağıdaki maddeler verilen kararlardır; gerekçeleri kayda geçirilmiştir.

**Karar 1. Parti tek satıra indiğinde kalan kaydın parti kimliği korunsun mu, boşalsın mı?**
**Karar: korunsun** (R3). Bugünkü yeniden kurma tek satırda parti kimliğini boşaltıyor. Korumak hiçbir şeyi bozmaz: tek üyeli parti bugün de doğru çalışıyor (`satisPartisi` kardeşleri parti kimliğinden bulur, dosya ve etiket gruplaması aynı anahtarı kullanır) ve kimliği değiştirmemek dosya bağını ayakta tutar. Boşaltmanın tek kazancı "tek satır partisiz olmalı" kuralının biçimsel temizliği, bedeli dosya bağının kopması.

**Karar 2. Elle düzenlenmiş tahsis korunsun mu, miktar değişince yeniden mi damgalansın?**
**Karar: korunsun** (R11). Elle bölünmüş tahsis kullanıcının bilerek girdiği bir bilgidir ve miktar değişikliği onu geçersiz kılmaz, yalnız eksik ya da fazla bırakır. Eksiklik Stok sekmesinin "Tahsisi eksik" iş listesinde görünür, yani kullanıcı görür ve düzeltir. Yeniden damgalamak bugünkü sessiz kaybı kural hâline getirir. Bugünkü veride bu durum iki kayıtta var, yani bedeli küçük ve görünür.

**Karar 3. Eski düzenlemelerde kaybolmuş veri için göç yazılsın mı?**
**Karar: yazılmasın** (X3). Hangi kaydın teslim şekli bir düzenlemede kaybolduğu veride yazılı değil; çöpteki eski kayıttan okumaya çalışmak otuz günü geçmiş kayıtlarda zaten mümkün değil ve yanlış kayda yazma riski var. Bugünkü veride 48 fabrika teslim ve 8 farklı adres **duruyor**, yani kayıp henüz yaşanmamış; kuralı şimdi düzeltmek yeterli. Kullanıcı tek tek düzeltmek isterse Stok sekmesinden tek kayıt düzenlemesiyle yapabilir.

### QA turunda verilen kararlar (2026-10-26)

Takım Yöneticisi 2026-10-26'da QA turunun **21 bulgusunun hepsini** analistin önerisiyle onayladı. Aşağıdaki dokuz madde gerekçe isteyen kararlardır; tamamın dökümü "Karar kaydı" tablosundadır.

**Karar 4. Silme ölçütü satırın çıkarılması mı, değerinin geçersizliği mi?**
**Karar: çıkarılması** (R1/2, R1/3). Bu spec'in varlık nedeni "düzenleme kayıt silmesin"; ölçütü satırın değerine bağlamak kusuru kapatıp yerine daha sinsi bir yenisini koyar. Kullanıcı miktarı silip yeniden yazarken ya da parçayı değiştirmek için çipi temizlerken kayıt sessizce çöpe gider ve bu kez stoğu da geri alınır (ölçüm 14). Geçersiz satırın kaydı bütünüyle reddetmesi, ekleme kolunun bugünkü sessiz süzmesinden bilinçli bir sapmadır ve C9'da yazılıdır.

**Karar 5. Stoğa dokunmama ölçütü "parça ve miktar değişmedi" mi, `netDusumAyni` mi?**
**Karar: `netDusumAyni`** (R13, R13/2). Kodda duran ölçüt 0065 R5'in kararıdır ve çapraz testleri var; onu değiştirmek bu spec'in kapsamı değil. Ama spec ilk ifadesiyle uygulayıcıyı yanlış ölçüte yöneltiyordu: o ölçüt seçilirse eksik düşülmüş 435 kaydın stoğu bir daha hiç tamamlanmaz, seçilmezse AC-17 kırmızı kalır. İki yoldan biri de ölçülmüş veride yanlış sonuç üretiyordu, bu yüzden bloklayıcı sayıldı ve ölçüm 8'in çıkarım cümlesi düzeltildi.

**Karar 6. Birikimli stok tabanı nasıl kurulur?**
**Karar: anlık görüntü artı bu düzenlemede geri alınan bütün net düşümler** (R15/2). Dört parçalı bir taban (bugünkü stok, çıkarılan satırların geri alınanı, güncellenen satırların geri alınanı, aynı parçadan önce işlenen satırların yeni düşümü) uygulayıcının kafasında iki farklı biçimde kurulabilir ve ikisi AC-19'da farklı sayı üretir. Tabanı spec'te yazmak AC-19'u ölçülebilir kılar ve C3 ile C5 arasındaki gerilimi kapatır.

**Karar 7. Saf fonksiyon kimliği ve zamanı nereden alır?**
**Karar: parametreden** (R17/2). AC-24 aynı girdide aynı çıktıyı istiyor; `uid()` ve `simdiYerel()` fonksiyonun içinde kalırsa bu imkânsızdır. Depodaki yerleşik desen zaten enjeksiyondur (ölçüm 21). Yazılı olmazsa uygulayıcı kimliği fonksiyonun içinde üretir ve AC-24'ün testi yazılamaz hâle gelir.

**Karar 8. Ortak alan hangi kayıttan okunur ve ayrışan değere ne olur?**
**Karar: birincil kayıttan, ayrışan değer düzleşir; `odendi` ve `panoGizli` hariç** (R6, R6/2, R6/3). R6 bu spec'in ikinci yarısının tamamı ve kaynağı adlandırılmadan ölçülemez. Düzleştirme bugün de sil ve yeniden kur yüzünden yaşanıyor, yani yeni bir kayıp değil; ama `odendi`'yi birincilden bütün satırlara yazmak 0095 R7/2 ile çakışır (ücretsizde ödeme durumu yoktur) ve `panoGizli`'yi yazmak arşivlenmiş kargo kartını geri getirir, bu yüzden o iki alan satır başına korunur.

**Karar 9. Satırın taşıdığı kimlik partide yoksa ne olur?**
**Karar: kayıt bütünüyle reddedilir** (R2/2). Yeni kayıt saymak sessizce yinelenen satır üretir (silinen satır geri doğar, 0077 R35a'nın dirilme dersi); hata vermek kullanıcıya bir kez pencere kapatma maliyeti yükler ve veri doğru kalır. Yazılı olmazsa uygulayıcı "bulunamadı, ekle" kolayına kaçar.

**Karar 10. AC-20 ile AC-21 hangi izin kümesiyle ölçülür?**
**Karar: `stockActions` boş olmayan ama `yedek_parca_add`/`_delete` içermeyen dizi** (R18/2, C8). Ölçüm 12'ye göre en doğal okuma (`stockActions: []`) R18'den sonra da 403 alır, yani uygulayıcı AC-20'yi yeşile çevirmek için bölüm kapısını gevşetmeye kalkar; bu, 0007 ve 0044'ten beri duran kasıtlı bir sınırı deler. Kullanıcı şeklini şimdi sabitlemek o sapmayı önler ve `cust_yedek_parca_edit`'in sunucuda hiç tanınmadığı C8'de yazılı kalır.

**Karar 11. Panolu partiye eklenen satırın alarmı bastırılsın mı?**
**Karar: bastırılmasın** (R20/2). Eklenen satır gerçekten yeni bir kargodur ve diğer bilgisayarların onu duyması doğrudur; ekleyen bilgisayarda bugünkü `yerelServisEkle` bastırması yeter. Yazılı olmazsa uygulayıcı R20'yi geniş okuyup eklenen satırı da bastırır ve gerçekten yeni düşen kargo sessiz kalır. Ölçüm 10 bugün panolu partili kayıt olmadığını söylüyor, yani kuralı yazmanın da bedeli sıfır.

**Karar 12. Birincil satır çıkarılınca partinin dosyaları taşınsın mı?**
**Karar: taşınmasın, sınır yazılsın** (X8). Taşıma kuralı yeni bir yazma yolu açar ve kapsam kayması olur. Bu işten sonra kayıp yalnız "birincil satırı çıkar" hâlinde kalır; bugün ise her toplu düzenlemede bütün parti yeni kimlik aldığı için dosya her seferinde yetim kalıyor, yani yeni durum kötüsünden iyisidir.

### Plan turu (Takım Yöneticisi onayı, 2026-10-26)

**Karar 13. R18/2'nin izin kümesi bayi boyutunu da sabitler.** Uygulamada ölçüldü: `dealerActions` tanımsız bırakılınca `eylemIzinli` boyutu tam yetki sayar; satır eklemek `dealer_yedek_parca_add` üzerinden, `stockActions: []` kullanıcısının bölüm kapısı `dealer_yedek_parca_add`/`dealer_delete` üzerinden geçer. Ölçüm 12 yalnız stok ve müşteri boyutuna bakmıştı. Sunucu kodu değişmez; küme `dealerActions: []` ile ölçülür ve tanımsız hâl ayrı bir testte "neden üç boyut" diye sabitlenir (`server-authz` 0111 bloğu).

**Karar 14. C9'un okunuşu: eklenen kaydı saf fonksiyon kurar.** Saf fonksiyon eklenen satırın kaydını bugünkü kurucuyla (`yedekParcaRec`) ve bugünkü tahsis kuralıyla (`musteriTahsisi`) kurar, kimliği ve oluşturma zamanını parametreden alır; ekran stoğu `yedekParcaDus` ile düşer ve `yerelServisEkle` ile bastırır. `yeniYedekParcaSatis` çağrılmaz (kendi içinde `uid()` ve zaman okur, AC-24/AC-33 yazılamazdı). Ekleme kolunun kayıt şekli birebir aynıdır.

**Karar 15. Zaman parametreleri üç ayrı değer.** `yeniId(i)`, `olusturmaZamani` (yerel biçim, `simdiYerel` emsali) ve `silmeDamgasi` (ISO, bugünkü çöp damgası biçimi).

**Karar 16. Ücretsiz işaret ve ödeme durumu.** Form işareti açıksa 0095 R7/2 gereği `ucretsizUygula` ödeme alanlarını temizler; kapalıysa her kayıt kendi `odendi` ve `tahsilatTarihi` değerini korur (R6/3'ün `odendi` istisnası tahsilat tarihini de kapsar, yoksa ödenmiş satırın tarihi birincilinkiyle ezilirdi).

**Karar 17. AC-7'nin ölçüm yeri.** Satır sırası formda değiştirilemez (sürükleme yok); kimlik eşlemesi saf testte satırlar ters sırada verilerek, arayüzde ortadaki satırın çıkarılmasıyla (sonraki satırın kendi değerini koruması) ölçülür.

**Karar 18. Satır hatası formda.** Saf fonksiyon satır başına neden döner (`satirHatalari`); ekran onu formun geçici `_satirHatalari` alanına yazar, form satırın altında `HataMetni` ile gösterir ve satıra dokunulunca o satırın hatasını düşürür. Alan kayda girmez (ortak alan ayıklaması ve gerçek App gövde testi).

**Karar 19. `aktifKullanici` prop zinciri.** R21'in kayıt anı denetimi `useKilitListesi(aktifKullanici)` ister; App `savedUsername`'i Müşteriler'e, o da detay penceresine geçirir (Kasa, Giderler emsali). Yeni bağlam ya da durum yok.

**Karar 20. Sunucu kanıtı iki katmanda.** `server-authz` (birim, AC-20/21/31/35 ve Karar 13) ve `server-security.cjs` (`topluDuzenleyici` kullanıcısı, uçtan uca 200/403).

**Karar 21. Alarm ölçümü.** AC-23/AC-34 saf testte `yeniKargolar` ile (kimliği değişmeyen kayıt yeni sayılmaz, eklenen sayılır) ve ekranda `yerelServisEkle` çağrısıyla ölçülür.

**Karar 22. Görsel kanıt.** Dört yeni ekran (fabrika teslim ve farklı adres iki ayrı formda, çünkü farklı adres yalnız kargoda çizilir): `musteri-detay-0111-toplu-fabrika`, `-toplu-adres`, `-satir-hatasi`, `kilit-toplu-yedek-parca`. Var olan 52 ekran eski kodla 0 piksel. Beklenmedik fark çıkarsa onay Takım Yöneticisine sorulur.

**Karar 23. Eklenen kayıt dizinin sonuna yazılır.** Birincil kayıt (partinin dizideki ilk canlı kaydı) eklemeyle değişmesin; X8'in dosya bağı ve formun ortak alan kaynağı (R6) birincil satır durdukça yerinde kalır.

---

## Kabul kriterleri

- **AC-1.** İki satırlı bir partide yalnız bir satırın birim fiyatı değiştirilip kaydedilir: iki kaydın kimliği değişmez, ikisi de çöpe düşmez, Çöp Kutusu'nda yedek parça satırı oluşmaz.
- **AC-2.** Aynı düzenlemede kayıtların oluşturma zamanı ve parti kimliği değişmez.
- **AC-3.** Üç satırlı bir partiden bir satır çıkarılıp kaydedilir: o satırın kaydı çöpe düşer, diğer ikisi kimliğiyle durur, çöpteki satır Çöp Kutusu'nda "Yedek Parça Satışı" olarak görünür.
- **AC-4.** AC-3'teki çöpe düşen kaydın düşülmüş stoğu geri alınır; geri alma log satırı silmez, karşı hareket yazar.
- **AC-5.** AC-3'teki kayıt çöpten geri alınırsa stoğu yeniden düşülür ve kayıt yerine döner.
- **AC-6.** İki satırlı partiye formdan üçüncü satır eklenip kaydedilir: var olan iki kayıt kimliğiyle güncellenir, üçüncü kayıt yeni kimlikle doğar ve **aynı parti kimliğini** taşır.
- **AC-7.** Satırların sırası formda değiştirilip kaydedilirse her kayıt kendi satırının değerleriyle güncellenir (eşleme konuma değil kimliğe dayanır).
- **AC-8.** Fabrika teslim işaretli bir parti açılır: form "Fabrika Teslim" seçili gelir; hiçbir alana dokunulmadan kaydedilirse kayıtların teslim şekli fabrika teslim kalır.
- **AC-9.** Farklı teslimat adresi dolu bir parti açılır: form işaret ve altı adres alanı dolu gelir; dokunulmadan kaydedilirse adres kayıtta aynen kalır.
- **AC-10.** Tevkifatlı bir parti açılır: form işaret ve oran seçili gelir; dokunulmadan kaydedilirse tevkifatın üç alanı kayıtta aynen kalır.
- **AC-11.** Teklif bağı olan bir parti düzenlenir: güncellenen kayıtların belge ve alt kalem kimliği aynen kalır.
- **AC-12.** Partinin bütün satırları ücretsizse form işaretli açılır; karışık partide işaretsiz açılır ve uyarı şeridi çizilir (0095 R23 aynen).
- **AC-13.** Miktarı değişmeyen kaydın tahsisine dokunulmaz.
- **AC-14.** Otomatik tam tahsisi olan kaydın miktarı 2'den 5'e çıkarılır: tahsis tek satır kalır ve miktarı 5 olur.
- **AC-15.** Tahsisi elle iki satıra bölünmüş kaydın miktarı değiştirilir: iki tahsis satırı **aynen durur** ve kayıt Stok sekmesinin "Tahsisi eksik" listesinde görünür.
- **AC-16.** Alıcı müşteriden bayiye çevrilirse otomatik tam tahsis boşalır; elle düzenlenmiş tahsis korunur.
- **AC-17.** Net düşümü istenen parça ve miktarla birebir aynı olan kayıt için stok hareketi yazılmaz (log satır sayısı artmaz). Ölçüt `netDusumAyni`'dir, "parça ve miktar değişti mi" değil (R13).
- **AC-18.** Miktarı artan kayıtta eski düşüm karşı hareketle geri alınır ve yeni miktar düşülür; stok eksiye düşmez, kayıt tam miktarla saklanır.
- **AC-19.** Partide aynı parçadan iki satır varken ikisinin miktarı artırılır ve stok ikisine yetmez: düşümler birikimli hesaplanır, toplam düşüm mevcut stoğu aşmaz ve stok eksiye düşmez.
- **AC-20.** R18/2'nin izin kümesiyle (`customerActions: ["cust_yedek_parca_edit"]`, `stockActions` boş olmayan ve `yedek_parca_add`/`_delete` içermeyen dizi) satır eklemeyen ve çıkarmayan bir düzenleme kaydedilir: sunucu 200 döner, stok hareketleri de geçer.
- **AC-21.** Aynı kullanıcı satır eklemeye çalışırsa sunucu `yedek_parca_add` ister ve reddeder; satır çıkarmaya çalışırsa `yedek_parca_delete` ister ve reddeder. `stockActions: []` olan kullanıcı ise bölüm kapısından reddedilir (C8'in bilinen sınırı, AC-31).
- **AC-22.** İşlem Geçmişi güncellenen kayıt için `duzenlendi`, yeni kayıt için `olusturuldu`, çıkarılan kayıt için `silindi` yazar.
- **AC-23.** Pano durumu dolu bir parti **satır eklenmeden ve çıkarılmadan** düzenlenir: kayıtların kimliği değişmediği için panoda yeni kart doğmaz ve kargo alarmı tetiklenmez.
- **AC-24.** Düzenleme kararı saf fonksiyonla alınır: aynı girdiyle **ve aynı kimlik ile zaman parametresiyle** çağrılan fonksiyon aynı güncelleme, ekleme, silme ve stok işlemi listesini döner; ekran bu listeyi uygular. Fonksiyon kendi içinde `uid()` ya da zaman okumaz (R17/2).
- **AC-25.** Boş hata yolu: formda **geçerli satır kalmazsa** (son satırın parçası ya da miktarı boşaltılırsa; satır silme düğmesi son satırda pasiftir, ölçüm 24) kayıt yapılmaz, bugünkü hata bildirimi çıkar ve hiçbir kayıt ne silinir ne güncellenir.
- **AC-26.** Geçersiz satır (parça seçili ama miktar sıfır) olan bir düzenleme kaydedilmez ve hiçbir kayda dokunulmaz (ya hep ya hiç, R1/3); nedeni satırın yanında yazar.
- **AC-27.** Çoklu para birimi: partinin para birimi TL'den USD'ye çevrilir ve güncellenen bütün kayıtlar USD olur.
- **AC-27/2.** Kayıtta duran, seçicide karşılığı olmayan para birimi (ör. içe aktarmadan gelen) kullanıcı dokunmadıkça aynen korunur; form seçicisi üç değer taşıdığı için bu hâl seçiciyle üretilemez, kayıt taşımayla ölçülür (ölçüm 25).
- **AC-28.** Tek satırlık (partisiz) satışın düzenlemesi, Stok sekmesinin düzenlemesi ve bayi detayının satışı bu spec'ten sonra birebir aynı davranır.

### QA turu kriterleri (2026-10-26)

- **AC-29.** Üç satırlı bir partide bir satırın parçası çipin X düğmesiyle temizlenip kaydedilmeye çalışılır: kayıt reddedilir, nedeni satırın yanında yazar, **hiçbir kayıt silinmez** ve stok hareketi yazılmaz. Aynı şey miktarı boşaltılan satır için de geçerlidir.
- **AC-30.** Net düşümü hiç olmayan (satış anında stoğu tükenmiş) bir kaydın yalnız birim fiyatı değiştirilir ve stok bugün uygundur: ölçüt false döndüğü için eksik düşüm tamamlanır, kayıt tam miktarla saklanır ve bu davranış 0065 R5 ile aynıdır.
- **AC-31.** `stockActions: []` olan, `cust_yedek_parca_edit` taşıyan kullanıcı satır eklemeyen ve çıkarmayan bir düzenlemeyi kaydetmeye çalışır: sunucu bölüm düzeyinde reddeder. Bu kabul edilen sınırdır, bölüm kapısı gevşetilmez (C8).
- **AC-32.** Birikimli taban geri alınanları içerir: partide aynı parçadan iki satır varken biri çıkarılır ve diğerinin miktarı artırılır; çıkarılan satırın geri alınan net düşümü kalan satırın kullanılabilir adedine girer ve stok eksiye düşmez.
- **AC-33.** Saf fonksiyon aynı girdi, aynı `yeniId` ve aynı `simdi` ile iki kez çağrılır: dört liste (güncelleme, ekleme, silme, stok işlemi) birebir aynıdır; eklenen kaydın kimliği ve oluşturma zamanı parametreden gelir.
- **AC-34.** Pano durumu dolu bir partiye satır eklenip kaydedilir: yeni kayıt panoda kendi kartıyla görünür, ekleyen bilgisayarda alarm bastırılır ve var olan kartlar yerinde kalır.
- **AC-35.** R18/2'nin izin kümesindeki kullanıcı toplu formda kargo durumunu değiştirip kaydetmeye çalışır: sunucu `yedek_parca_edit` ister ve reddeder. Kargo durumuna dokunmayan aynı düzenleme 200 döner.
- **AC-36.** Toplu düzenleme açılırken partinin birincil kaydının `yedek_parca` kilidi alınır; kilit başkasındaysa form yerine `LockConflict` ekranı çizilir. Kayıt anında partinin başka bir kaydı başkası tarafından kilitliyse kayıt bildirimle reddedilir.
- **AC-37.** Ortak alanı ayrışan bir parti açılır (biri fabrika teslim, diğeri kargo): form birincil kaydın değerini gösterir ve kaydedilince ikisi de o değere düzleşir. `odendi` ve `panoGizli` düzleşmez, her kayıt kendi değerini korur.
- **AC-38.** Form açıkken partinin bir kaydı dışarıdan silinir ve sonra kaydedilir: kayıt reddedilir, kullanıcıya partinin değiştiği söylenir ve hiçbir kayda dokunulmaz.
- **AC-39.** Arşivlenmiş (`panoGizli`) bir kargo partisi düzenlenir: kayıt arşivde kalır, panoya geri dönmez.
- **AC-40.** Birincil satır çıkarılırsa partiye bağlı dosyanın bağı yetim kalır ve bu X8'de yazılı sınırdır; birincil satır durduğu sürece dosya sayısı ve etiketi değişmez.
- **AC-41.** `tests/ui/ucretsiz-yedek-parca-0095.test.jsx`'in **0095 AC-48** triyaj bloğu dokunulmadan yeşil kalır: karışık partide form işaretsiz açılır ve uyarı şeridi çıkar, bütünü ücretsiz partide kutu işaretli gelir ve şerit çıkmaz.
- **AC-42.** Otomatik tam tahsisi olan kaydın miktarı değiştirilir ve satış tarihi de düzeltilir: tahsisin miktarı yenilenir, **tarihi korunur** ve satışın yeni tarihiyle ezilmez.
- **AC-43.** Kart komisyonlu bir partinin bir satırının miktarı değiştirilir: güncellenen kaydın komisyon anlık görüntüsü kendi kaydının tabanıyla hesaplanır ve tevkifat tabanı işareti korunur.
- **AC-44.** Alıcı müşteriden bayiye çevrilip kaydedilir: bildirim kaydın bu makinanın geçmişinden çıktığını ve Stok sekmesinden düzenlenebileceğini söyler.
- **AC-45.** `yedekParcaSatis.js:23` yorumu düzeltilmiştir: "partiyi yeniden kurar" ifadesi kaynakta geçmez (kaynak taraması).
- **AC-46.** (Triyaj.) Formdaki "Ödendi" kutusu işaretlenip ya da kaldırılıp kaydedilince değer ücretli bütün satırlara yazılır; dokunulmazsa satır başına durum korunur (R6/4).
- **AC-47.** (Triyaj.) Form açıkken partiye başka yerden eklenen kayıt çöpe atılmaz, kayıt reddedilir ve hiçbir şey yazılmaz (R2/3).
- **AC-48.** (Triyaj.) Partiye formdan eklenen satırın kimliği ekleyen bilgisayarın yerel bastırma kümesine girer, var olan kayıtlarınki girmez (AC-34'ün ekran yarısı).
- **AC-49.** (Triyaj.) Alıcı başka bir müşterinin makinasına çevrilince bildirim satışın taşındığını söyler (R9/2).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Düzenleme kararı React'sız saf fonksiyonda yazıldı ve kendi testi var; arayüz yalnız uyguluyor.
- [ ] Yeni kalıcı alan, veri bölümü ve izin **eklenmediği** açıkça yazıldı (C1).
- [ ] Soft-delete edilen kayıt için çöp kutusu geri alma ve temizleme simetrisi korundu (AC-4, AC-5).
- [ ] Kullanıcıya görünen bütün metinler Türkçe.
- [ ] Arayüz kriterlerinin görsel kanıtı eklendi (boş ve hata durumları dâhil).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] Yeni kavram ya da mimari karar varsa `CLAUDE.md` güncellendi.
- [ ] Düzenlemenin kayıt silmediği, stoğa dokunmadığı ve izin istemediği hâller gerçek App üzerinde ölçüldü (yalnız izole saf test yeterli değil).
- [ ] Karar kaydı tablosunun her satırı spec'te bir maddeye bağlı.
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

## Karar kaydı (QA turu, 2026-10-26)

| # | Bulgu | Derece | Karar | Spec maddesi |
|---|---|---|---|---|
| B-1 | Silme ölçütü satırın değerine bağlı, parçayı temizlemek kaydı çöpe atıyor | Bloklayıcı | Ölçüt satırın çıkarılması; geçersiz satır kaydı bütünüyle reddeder | R1, R1/2, R1/3, C9, AC-26, AC-29, Karar 4, ölçüm 14 |
| B-2 | Stok ölçütü belirsiz, ölçüm 8'in çıkarımı tersine | Bloklayıcı | Ölçüt `netDusumAyni`; eksik düşülmüş kayıtta 0065 R5 aynen sürer | R13, R13/2, R14, AC-17, AC-30, Karar 5, ölçüm 8, ölçüm 13 |
| B-3 | AC-20 ile AC-21 aynı kullanıcıda sağlanamıyor, `cust_yedek_parca_edit` sunucuda yok | Bloklayıcı | İzin kümesi sabitlendi, sunucu sınırı kısıt olarak yazıldı | R18/2, C8, AC-20, AC-21, AC-31, Karar 10, ölçüm 12 |
| Ö-1 | Birikimli stok tabanı tanımsız | Önemli | Taban anlık görüntü artı geri alınan bütün net düşümler | R15, R15/2, C9, AC-32, Karar 6, ölçüm 22 |
| Ö-2 | AC-24'ün saflığı `uid()` ve `simdiYerel()` ile çelişiyor | Önemli | Kimlik ve zaman parametreden verilir | R17/2, AC-24, AC-33, Karar 7, ölçüm 21 |
| Ö-3 | R20 eklenen satırı kapsamıyor | Önemli | Eklenen satır yeni karttır, alarmı bastırılmaz | R20/2, AC-23, AC-34, Karar 11, ölçüm 10 |
| Ö-4 | `kargoDurum` alan denetimi yerinde güncellemeyle ilk kez devreye giriyor | Önemli | Denetim kalır, bilinen sınır olarak yazıldı | R22, AC-35, ölçüm 15 |
| Ö-5 | Toplu düzenleme hiç kilit almıyor | Önemli | Birincil kaydın kilidi alınır, kayıt anında bütün parti sınanır | R21, C6, AC-36, ölçüm 16 |
| Ö-6 | Ortak alanın kaynağı adlandırılmamış, ayrışma tanımsız | Önemli | Birincil kayıttan okunur, düzleşir; `odendi` ve `panoGizli` hariç | R6, R6/2, R6/3, AC-37, Karar 8, ölçüm 17 |
| Ö-7 | Satırın kimliği partide yoksa ne olur | Önemli | Kayıt bütünüyle reddedilir | R2/2, AC-38, Karar 9, ölçüm 28 |
| K-1 | R7'nin listesi `panoGizli`'yi atlıyor | Küçük | Listeye eklendi, satır başına korunur | R7, R6/3, AC-39, ölçüm 18 |
| K-2 | Dosya bağı birincil kaydın kimliğine bağlı | Küçük | Taşıma yok, sınır yazıldı | X8, AC-40, Karar 12, ölçüm 19 |
| K-3 | Ölçüm 11 yanlış, form açılış kolu testli | Küçük | Ölçüm daraltıldı, test koruma altına alındı | Başlık satırı, AC-41, ölçüm 11, ölçüm 20 |
| K-4 | Otomatik tam tahsis tanımında tarih yok | Küçük | Tarih ölçüte girmez, yeniden damgalamada korunur | R10/2, AC-42, ölçüm 23 |
| K-5 | AC-25 arayüzle çelişiyor, son satır silinemez | Küçük | Kriter "geçerli satır kalmazsa" diye yazıldı | AC-25, ölçüm 24 |
| K-6 | AC-27'nin bilinmeyen para birimi yarısı formla üretilemez | Küçük | Kriter ikiye ayrıldı | AC-27, AC-27/2, ölçüm 25 |
| K-7 | Kart komisyonu anlık görüntüsünün düzenlemedeki davranışı yazılmamış | Küçük | Taban kendi kaydından okunur | R7/2, AC-43, ölçüm 26 |
| K-8 | Dört satır atfı kaymış | Küçük | Düzeltildi ve doğrulananlar kayda geçti | Başlık satırı, C4, ölçüm 29 |
| K-9 | Ölçümlerin dayandığı yedek elde yok | Küçük | Kaynak notu eklendi, kriter sayıya bağlanmadı | Ölçümler kaynak notu |
| K-10 | Alıcı değişiminin sonucu yazılmamış | Küçük | Kayıt bu yoldan çıkar, bildirim söyler | R9/2, AC-44, ölçüm 27 |
| K-11 | `yedekParcaSatis.js:23` yorumu bu işten sonra yanlış olur | Küçük | Yorum bu işte düzeltilir | C10, AC-45, ölçüm 30 |

**Toplam:** 21 bulgu, 3 Bloklayıcı, 7 Önemli, 11 Küçük; hepsi onaylandı ve işlendi.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Uygulama commit** | `50c070f` | Dal `feat/0111-toplu-yedek-parca`, taban `ae2236c`; kapanış ayrı commit |
| **Spec revizyon sayısı** | 3 | QA turu (B-1–B-3, Ö-1–Ö-7, K-1–K-11), plan turu (Karar 13–23; Karar 13 uygulamada ölçülerek bulundu), triyaj (R2/3, R6/4, R9/2, AC-46–49) |
| **Düzeltme turu sayısı** | 1 | Triyaj: beş bulgu (1 orta-yüksek, 1 orta, 1 düşük-orta, 2 düşük): formdaki Ödendi kutusu yok sayılıyordu; form açıkken başka bilgisayarın eklediği satır çöpe gidiyordu; ekleyen bilgisayarda alarm bastırması testsizdi; başka müşteriye taşımada bildirim yanlıştı; ana dizindeki spec kopyası eskiydi |
| **Bulgu gerçek/gürültü oranı** | 5 / 0 | |
| **Regresyon sayısı** | 0 | Tam takım 419 dosya, 5656 test (Electron dahil); lint 0 hata; tip denetimi temiz |
| **Kaçan hata** | 2 | Ödendi kutusu gerilemesi ve eşzamanlı ekleme; ikisi de spec'in R6/3 ve R2/2'sinin kapsamadığı yönlerdi, triyajda yakalandı |

**Görsel kanıt:** 56 ekran × 2 tema; dört yeni ekran (fabrika teslimli ve farklı adresli toplu form, satır hatası, kilit) değişti, var olan 52 ekran eski kodla 0 piksel; taban son kodla 112 görüntü 0 fark.

**Bu spec'ten çıkarılan ders:** "Satır başına korunur" kuralı yazılırken formda o alanın görünür bir denetimi olup olmadığına bakılmalı: görünür kutu kayıtta yok sayılırsa sessiz gerileme olur, doğru kalıp "dokunulduysa yaz" işaretidir (0109 Karar 21). Bir kümeyi "formda yok = çıkarıldı" diye okumak eşzamanlı eklemeyi siler; ret ölçütü iki yönlü yazılmalı (formdaki kimlik partide yok, partideki kimlik açılışta yok). Sunucu izin kümesi ölçülürken bütün boyutlar tanımlı yazılmalı: tanımsız boyut tam yetki sayılır.
