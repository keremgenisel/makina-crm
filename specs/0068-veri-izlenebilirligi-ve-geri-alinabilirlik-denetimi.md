# 0068 — Denetim Sonrası Kapatılacaklar: İşlem Geçmişi Etiketi, Çek Dışa Aktarması ve Çöp Kutusuna Girmeyen Veri

| | |
|---|---|
| **Durum** | Onaylandı · uygulamada |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Ayarlar > Sunucu > İşlem Geçmişi, Veri Yönetimi (dışa aktarma, içe aktarma, Çöp Kutusu), tedarikçi ve üretim partisi silme |
| **Bağımlı spec'ler** | 0001 (R13/R22: `tedarikciler` yalnız gider sekmesi) · 0009/0011 (görsel kanıt kuralı) · 0016 (Çöp Kutusu liste birliği) · 0022 (üretim partisi) · 0040 ve 0049 (çek) · 0024 (kasa) · 0056 (hesap taşıma) · 0058 (kapsam dışı) · 0065 (stok hareketi) |
| **Revizyon** | R1 (QA turu, 2026-10-02): geliştirici hazırlığı denetimi, 17 bulgu işlendi, 4'ü bloklayıcıydı. Soft-delete'in **iki yeni veritabanı sütunu** istediği ve dört nokta kuralının hiç anılmadığı bulundu (R8, R9), Çöp Kutusu'ndan geri almanın **403 alacağı** ölçüldü (R15), çek dışa aktarmasının `tedarikciler`i okuması hâlinde **gizlilik kaynak taramasının kırılacağı** görüldü (R5) ve soft-delete'in silme izninin kayıt düzeyi denetimini devre dışı bıraktığı tespit edildi (R16). R15–R22, C6–C8, X7 ve AC-20…AC-36 eklendi.<br>**R2 (2026-10-02, plan onayı):** bütün öneriler kabul (Q1–Q9). Uygulamada iki tespit daha yerinde düzeltildi (R3 sayılır): sunucu çöpe atmayı silme sayıyor (R16, AC-25/26, X7) ve alacaklısı çalışan olan çek çıktıdan tamamen çıkarılır (R27, AC-43; TY kararı). Koda uymayan üç tespit **yerinde düzeltildi**: Çöp Kutusu'ndan geri alma 403 almıyor (satırı gören kullanıcının Giderler sekmesi var), bu yüzden R15 sekme eşlemesini değiştirmez ve 0001'in kararı korunur; kullanımdaki tedarikçi bugün de silinemiyor, tedarikçi gerekçesi buna göre yazıldı (R8, R14, Intent, Context); "Tüm Kayıtlar" adı içe değil dışa aktarma ekranında (R6). Eklenenler R20–R26, AC-37…AC-42. |

---

## Intent

Son bir yılda eklenen gider, kasa ve çek modüllerinden sonra dört altyapının kapsamı denetlendi:
işlem geçmişi, kullanıcı geçmişi, yedekleme ve dışa/içe aktarma, bir de Çöp Kutusu. Sonuç:

**Temiz çıkanlar:** kullanıcı geçmişinin bütün eylemleri etiketli; yedekleme paketlerinde kapsam dışı
kalan hiçbir bölüm yok (33 bölümün hepsi bir pakette); sunucunun her yazıma düştüğü kayıttaki bölüm
adları eksiksiz; içe aktarma yalnız kendi sayfalarının bölümlerini **ekleyerek** yazıyor, taşımadığı
bölümleri silmiyor.

**Kapatılacak üç şey:**

1. **İşlem geçmişinde üretim partisi etiketsiz.** Parti işlemleri listede ham anahtarla
   (`uretim_partisi`) görünüyor; 0022'den beri eksik.
2. **Çek portföyü hiçbir Excel çıktısında yok.** Yirmi bir dışa aktarma raporu var, çek yok. Gider
   gizliliği bunu engellemiyor: çek müşteri tarafı bir alacak belgesi.
3. **Dokuz bölüm çöp kutusuna hiç girmiyor** (kalıcı siliniyor) ve kullanıcı hangi silmenin geri
   alınabildiğini bilemiyor. İkisi gerçekten geri alınabilir olmalı: **tedarikçi** (yanlışlıkla silinen
   iletişim ve vergi bilgisi geri gelmiyor; kullanımdaki tedarikçi zaten silinemiyor) ve **üretim partisi** (makinaların maliyet dağıtımı sessizce
   değişiyor).

Başarı şu demek: her işlem geçmişinde okunur bir adla görünüyor, çek listesi dışa aktarılabiliyor,
geri alınabilir silmeler çöp kutusunda ve kalıcı silmeler onay penceresinde bunu açıkça söylüyor.

---

## Requirements

### A. İşlem geçmişi

- **R1.** Üretim partisi işlemleri işlem geçmişinde **okunur bir adla** görünür; ham anahtar basılmaz.
- **R2.** Etiket haritalarının eksiksizliği **testle sabitlenir**: kaynakta kullanılan her kayıt türü ve
  her eylem için etiket bulunmalıdır. **Test tek yönlüdür** ("kaynakta kullanılan her tür haritada var");
  kullanılmayan bir etiket zararsızdır ve kaldırılması istenmez. Bugün haritada `proforma` var ama kaynakta
  `entity: "proforma"` hiç geçmiyor (belge tipi dinamik atanıyor olabilir); çift yönlü eşitlik istenirse o
  etiket silinmek zorunda kalır ve dinamik atama varsa ekranda ham anahtar görünür. Beklenti **sayıya
  değil kümeye** bağlanır, yoksa her yeni tür eklendiğinde test gereksiz kırılır.

### B. Dışa ve içe aktarma

- **R3.** **Çek portföyü dışa aktarılır:** numara, banka, keşideci, tutar, para birimi, vade, alınma
  tarihi, durum, yön (alınan / verilen) ve **iki ayrı sütun**: "Müşteri / Kimden" (alınan çek) ile
  "Alacaklı" (verilen çek). Tek sütunda birleştirilirse çekin yönü okunamaz hâle gelir ve yön sütunu tek
  başına yetmez.
- **R4.** Çek bilgisi **okuma anındaki tek yolla** çözülür (tahsilata bağlı çekte tutar ve vade
  tahsilattan, bağsız çekte çekin kendi alanlarından); dışa aktarma için ikinci bir çözüm yazılmaz.
- **R5.** Çek dışa aktarması **gider ve kasa verisi taşımaz**; gizlilik duvarı yerinde kalır, hem çıktı
  temelli test hem **kaynak taraması** bu dosyayı kapsamaya devam eder. **Somut sınır:**
  `tests/gider-gizlilik.test.js`'in `YASAKLI` regex'i **`tedarikciler` dizesini** içeriyor ve
  `SettingsExport.jsx`'i tarıyor; verilen çekin alacaklısını `tedarikciler`den çözmek testi anında kırar.
  Bu yüzden alacaklı adı çekin kendi **`alacakliAd`** alanından okunur (0049 onu kaydediyor) ve
  `tedarikciler` ile `calisanlar` **içe alınmaz**. `SettingsExport`'a eklenecek tek yeni prop `cekler`'dir
  (`payments` zaten var ve R4'ün tek okuma yolu için gerekli).
- **R6.** İçe aktarma şablonunun **hangi bölümleri taşıdığı ekranda yazılı** olur. "Tüm Kayıtlar" adı
  **dışa aktarma** ekranındaki şablon biçimli müşteri çıktısının adıdır (`SettingsExport.jsx`) ve her şeyi
  taşıdığı izlenimi veriyor; içe aktarma ise yalnız müşteri (makina), servis, yedek parça ve parça tipi
  yazıyor. İçe aktarma ekranına bu kapsam satırı, dışa aktarmadaki karta kapsam cümlesi yazılır; sayfa ve
  dosya adları değişmez (R2, Q7).
- **R7.** İçe aktarmanın taşımadığı bölümleri **silmediği** (ekleyerek yazdığı) testle sabitlenir; bu
  bugünkü davranıştır ve korunur.

### C. Çöp kutusuna girmeyen veri

- **R8.** **Tedarikçi silmesi çöp kutusuna taşınır:** silinen tedarikçi geri alınabilir ve geri alınınca
  listede ve ekstre düğmesiyle yeniden görünür. **Kullanımdaki tedarikçi bugün de silinemez** (bir gider
  kaleminde, çöptekiler dahil, ya da tanımda geçiyorsa "silinemez" penceresi; `Tedarikciler.jsx`); yani
  soft-delete yalnız kullanılmayan tedarikçiye uygulanır ve borç/ekstre etkisi yoktur. Değeri yanlışlıkla
  silinen iletişim ve vergi bilgisinin geri alınmasıdır.
- **R9.** **Üretim partisi silmesi çöp kutusuna taşınır:** silinen parti geri alınabilir ve geri
  alınınca makinaların parti bağı yeniden çalışır.
- **R9b.** **İki yeni veritabanı sütunu dört nokta kuralıyla açılır.** Tablolar bugün sütunsuz:
  `db.cjs:290` `tedarikciler` ve `:263` `uretim_partileri`. Her biri için `deletedAt` **dört yere** girer:
  `SCHEMA_SQL`, `applyColumnMigrations`'a bir `ensureColumns` girdisi, INSERT sütun listesi ve parametreleri
  (`:903` ve `:898`), SELECT eşlemesi (`:1438` ve `:1448`). `scripts/tests/db-roundtrip.cjs` ve
  `db-clean-install.cjs` ikisini de kapsar. Yazılmazsa silinen tedarikçi uygulama yeniden açılınca **geri
  gelir**; bu deponun en çok ısırdığı kuraldır.
- **R10.** Çöptekiler **canlı sayılmaz:** borç özeti, tedarikçi kırılımı, ekstre kapsamı ve maliyet
  motoru çöpteki tedarikçiyi/partiyi bugünkü "silinmiş" davranışıyla görür. **Motorlara çöp süzmesi
  EKLENMEZ:** App canlı dizileri verir (C8) ve `borcOzeti`, `hesaplaGiderRaporu`'nun `tedarikciKirilimi`,
  `tedarikciEkstresi` ile `hesaplaMakinaMaliyetleri` bugünkü hâliyle kalır. Parti tarafında 0022'nin
  "parti listede yoksa makina aylık kurala düşer" dalı çöptekine **kendiliğinden** uygulanır; geri alınınca
  eski dağıtım döner. Bu, C2'yi (tutarlar değişmez) de garanti eder.
- **R11.** İkisi de Çöp Kutusu ekranında kendi satır türüyle listelenir, geri alınır ve kalıcı silinir;
  çöpü boşaltma ve otomatik temizlik onları da kapsar. **Beş ayrı yere dokunulur** (Çöp Kutusu elle
  yazılmış bir dizi `items.push` satırıdır, `SettingsTrash.jsx:230-265`): iki `items.push` girdisi
  (`{ key, type, label, deletedAt, restore, purge }`), iki `restore`/`purge` çifti, `emptyTrash` kolu
  (`:191`), App'teki `purgeOldTrash` çağrısı (30 günlük otomatik temizlik) ve Ayarlar'a geçen iki `raw*`
  prop'u.
- **R12.** **Kalıcı silinen bölümler bunu söyler:** onay penceresinde "Bu kayıt çöp kutusuna gitmez,
  kalıcı silinir" ibaresi görünür. Kapsam **onay penceresi olan** kalıcı silmelerdir: tekrarlayan gider
  tanımı, gider türü, standart genel gider, kasa hesabı, çek. **Ödeme hareketi** silmesi ödeme penceresinin
  içindedir ve **kapsam dışı kaydı** silinmez ("kapsama al" ile geri alınır); bu ikisi için R13'ün tek bilgi
  satırı yeterlidir.
- **R13.** Çöp Kutusu ekranında hangi bölümlerin kalıcı silindiğini söyleyen **tek** bir bilgi satırı
  bulunur; ekranlara dağılmış kopya metin yazılmaz. **Metin tek sabitten gelir** (ör.
  `KALICI_SILME_NOTU`): R12'nin beş onay penceresi de aynı sabiti kullanır ve kaynak taraması metnin tek
  yerde olduğunu doğrular.
- **R14.** Var olan silme korumaları **gevşetilmez**: gider türü yalnız aynı davranıştaki bir türe
  taşınarak silinir, hareketli kasa hesabı deneme dönemi dışında silinmez, ciro edilmiş çek silinmez,
  kullanımdaki tedarikçi silinemez (bugünkü "silinemez" penceresi).

### D. QA turunda eklenenler (R1)

- **R15.** **Sekme eşlemesi DEĞİŞMEZ (R2 düzeltmesi).** Sunucu, kullanıcının sekme listesinde bölümün
  sekmelerinden **birinin** olmasına bakar (`serverAuth.cjs` `sekmeEngelli`). Çöp Kutusu'ndaki iki yeni
  satır, gider satırları gibi yalnız gider yetkisiyle görünür; satırı gören kullanıcının Giderler sekmesi
  vardır ve geri alma `tedarikciler: ["gider"]` / `uretimPartileri: ["gider"]` eşlemesiyle **403 almaz**.
  `"settings"` eklemek yalnız Ayarlar sekmeli kullanıcıya bu bölümlere yazma yolu açar ve 0001 R13/R22'nin
  bilinçli kararını geri alırdı; bu yüzden eklenmez ve 0001'e not gerekmez. Ölçü `server-authz` ve
  `server-security`: gider + ayarlar sekmeli kullanıcı geri alır, yalnız ayarlar sekmeli kullanıcı yazamaz.
- **R16.** **Sunucu çöpe atmayı silme sayar (uygulamada ölçüldü, R2 düzeltmesi).** `eylemDenetimi` canlı kimlik
  kümeleriyle çalışır: `deletedAt` damgası kaydı canlı kümeden çıkardığı için **silme izni** aranır
  (`tedarikciler.sil = "tedarikci_delete"`, `uretimPartileri.sil = "gider_tanim"`); yani ilk yazımdaki "soft-delete
  silme denetimini devre dışı bırakır" tespiti yanlıştı, güvence daha güçlüdür. Çöpten **geri alma** ve çöpteki
  kaydın **kalıcı silinmesi** ise bölüm düzeyinde geçer (kayıt zaten canlı kümede değildir); bu `giderler` ile aynı
  kabul edilmiş sınırdır. Arayüz iki düğmeyi de silme izniyle kapılar (R21). Sunucu değişmez.
- **R17.** **AC-19'un ölçüsü:** bir tedarikçi/parti silinip **çöpte** dururken motor çıktıları, o kayıt
  **hiç yokmuş gibi** üretilen bugünkü çıktıyla birebir aynıdır (sil → çöpte → aynı sonuç çapraz testi).
- **R18.** **Context'teki sayılar düzeltilir:** etiket haritasında **28** anahtar, kaynakta **27** tür var
  (eksik `uretim_partisi`, fazla `proforma`). Spec sayı yazmak yerine kümeye atıf yapar (R2).
- **R19.** **Görsel kanıt ekranları adıyla yazılır** ve kayıtları `beklenen: "degisti"` + `onay` alır:
  Çöp Kutusu (yeni satır türü ve yeni bilgi satırı), İşlem Geçmişi (etiketli parti satırı), Dışa Aktar
  (çek seçeneği), İçe Aktar (hangi bölümleri taşıdığı yazısı). Spec `done`'a taşınırken kayıtlar `ayni`ye
  çevrilir (0009/0011 kuralı).

### E. Plan onayında eklenenler (R2)

- **R20.** **Geri almada ad çakışması:** tedarikçi ve parti ad benzersizliği yalnız canlı listeye bakar (çöpteki
  ad yeni kaydı engellemez); geri alınan kayıtla aynı adda canlı bir kayıt varsa geri alma yapılmaz ve nedeni
  bildirimle söylenir.
- **R21.** **Çöp Kutusu'nda kim görür, kim geri alır:** iki satır türü yalnız gider yetkisiyle görünür (gider
  satırlarıyla aynı kapı); geri alma ve kalıcı silme silme izniyle: tedarikçide `tedarikci_delete`, partide
  `gider_tanim` (kalıcı silme sunucuda zaten bu izni ister, R16).
- **R22.** **Kalıcı silme metni tek sabit:** `KALICI_SILME_NOTU` (`src/lib/copKutusu.js`); beş onay penceresinin
  bugünkü dağınık "çöp kutusuna düşmez / çöpe düşmez" metinleri bu sabitle değiştirilir, pencereye özgü bilgi
  yanında kalır. Kaynak taraması serbest metnin başka yerde geçmediğini sabitler.
- **R23.** **Etiket kapsam testinin kaynağı:** `logAction({…})` ve `server.cjs` `writeAuditEntry` çağrılarının
  `entity:` / `action:` dize sabitleri; `=== "x"` gibi karşılaştırma değerleri ayıklanır; dinamik iki yer
  (`Documents.jsx` belge türü, `SettingsSahipsiz.jsx` `TUR_AUDIT`) değerleriyle eklenir. Kullanıcı geçmişinin
  eylemleri ayrı haritadır ve X5 gereği kapsam dışıdır.
- **R24.** **Çek raporu yalnız kasa yetkisiyle:** verilen çekler ve portföy yalnız Kasa ekranında görünür; App
  `cekler`'i Ayarlar'a yalnız kasa yetkisiyle geçirir ve rapor yalnız o zaman listelenir.
- **R25.** **Kanıt tam önce/sonra çekimiyle belirlenir** (0067'nin dersi); değişen ekranlar
  `0068-piksel-raporu.json`'a `degisti` + TY onayıyla bağlanır. İşlem Geçmişi sözlüğü kullanmadığı için onun
  eşleme kaydı yoktur.
- **R27.** **Alacaklısı çalışan olan çek çıktıya hiç girmez (uygulamada bulundu; TY kararı 2026-10-02: tamamen
  çıkar):** çalışana ciro edilen ya da kendi çekimizle çalışana yapılan ödeme tek kişiye yapılmış ödemedir; 0047
  gizlilik sınırı çalışan adını da kişi bazlı ödemeyi de (tutar, tarih, vade) dışlar. Yalnız adı gizlemek yetmez, satır
  tamamen çıkarılır (toplu satır da tek çalışanlı durumda kişinin ödemesini açardı). Çek Kasa › Çek Portföyü ekranında
  görünmeye devam eder. Tedarikçi ve serbest ad alacaklı adıyla görünür. Ölçü `gider-gizlilik` testinin 0068 bloğu (AC-43).
- **R26.** **Kapanışta Electron testleri de koşulur** (veritabanı ve sunucu yolları değişiyor; 0067'nin dersi).

---

## Constraints

- **C1.** Soft-delete iki bölümde **beşli kuralın** gereğini yapar: kayıt çöpe gider, okuyan her yer
  canlı listeyi süzer, çöp kutusu satırı, kalıcı silme ve boşaltma kolları, birleştirme davranışı.
- **C2.** **Hiçbir tutar değişmez:** borç özeti, ekstre, gider raporu ve makina maliyeti silinmiş
  tedarikçi/parti karşısında bugünkü sonucu üretir.
- **C3.** Yeni izin açılmaz; silme izinleri bugünküler (tedarikçi silme, gider tanımı) ve geri alma
  Çöp Kutusu'nun bugünkü iznine tabidir.
- **C4.** **Sunucu yazma denetimi değişmez** (`serverAuth.cjs` diff'i boş, R15): çöpe atma ve geri alma
  bugünkü bölüm düzeyi izinle, kalıcı silme bugünkü silme izniyle geçer; **yeni izin kimliği eklenmez**.
- **C5.** Kullanıcıya görünen metinler Türkçedir.
- **C6.** **İki yeni kalıcı alan vardır:** `tedarikciler.deletedAt` ve `uretim_partileri.deletedAt`
  (R9b'nin dört nokta kuralı). Başka yeni alan, yeni tablo ve yeni bölüm yoktur.
- **C7.** Çek dışa aktarması `tedarikciler` ve `calisanlar` bölümlerini **içe almaz** (R5); gizlilik
  kaynak taraması gevşetilmez.
- **C8.** **App canlı ve ham diziyi ayırır:** `withoutDeleted` ile `liveTedarikciler` ve
  `liveUretimPartileri` türetilir, Ayarlar ham diziyi alır ve **setter'lar her zaman tam dizi üzerinde
  işlevsel güncelleyiciyle** yazar. Canlı listeyi geri yazmak o bölümdeki bütün çöptekileri kalıcı siler
  (2026-09-28 triyajı, müşteri tahsilatlarında yaşandı).

### KAPSAM DIŞI

- **X1.** Kalan yedi bölümün çöp kutusuna alınması (tekrarlayan gider tanımı, gider türü, standart
  genel gider, kasa hesabı, ödeme hareketi, çek, kapsam dışı kaydı) — *neden:* her birinin kendi
  koruması var ve kalıcı silme bilinçli: gider türü taşınarak silinir, kasa hesabı taşıma penceresiyle,
  ödeme hareketi silinince borç yeniden açılır (geri alınabilir olanı kaydın kendisi değil sonucu),
  kapsam dışı kaydı "kapsama al" ile geri alınır. Gerekirse ayrı iştir. Bu spec yalnız **ibareyi**
  ekler (R12).
- **X2.** Gider ve kasa verisinin dışa aktarılması — *neden:* 0047 X1 ve gizlilik sınırı; o veri yalnız
  Aylık Gider ve Kasa Raporu'na girer.
- **X3.** İçe aktarma şablonunun yeni bölümlerle genişletilmesi — *neden:* taşınabilirliğin yolu
  yedekleme, şablon toplu ilk giriş aracı. R6 yalnız bunu **yazılı** hâle getirir.
- **X4.** Katalog tanımlarının (modeller, kalıplar, parça türleri) dışa aktarılması — *neden:* yedekleme
  kapsıyor, Excel karşılığının değeri yok.
- **X5.** Kullanıcı geçmişi ve yedekleme ekranlarında değişiklik — *neden:* denetimde eksik bulunmadı.
- **X6.** Stok hareketi log'unun silinmesi sorunu — *neden:* 0065'in kapsamında.
- **X7.** Geri alma ve çöpteki kaydın kalıcı silinmesinin sunucuda kayıt düzeyinde (silme/ekleme izniyle)
  denetlenmesi — *neden:* R16; çöpe atma zaten silme iznini istiyor, kalan iki yol `giderler` ile aynı kabul
  edilmiş sınırdır ve sertleştirmek C4'e aykırı. İstenirse bütün soft-delete bölümlerini kapsayan ayrı iştir.

---

## Context

- **Denetim yöntemi.** Kaynaktaki bütün kayıt türü ve eylem adları toplanıp ekranların etiket
  haritalarıyla, bölüm listesi yedek paketleriyle ve dışa aktarma raporlarıyla karşılaştırıldı.
- **Üretim partisi etiketi (doğrulandı).** İşlem geçmişinin kayıt türü haritasında **28** anahtar var,
  kaynakta kullanılan **27** tür var; eksik olan tek tür üretim partisi, fazla olan `proforma` (kaynakta
  `entity: "proforma"` hiç geçmiyor). Eylem adlarında eksik yok. Bu sınıf hata sessiz ilerliyor (ekranda
  ham anahtar görünür, kimse hata almaz), bu yüzden R2 tek yönlü bir kapsam testi istiyor.
- **Yedekleme ve sunucu kaydı temiz (doğrulandı).** Otuz üç bölümün hepsi bir yedek paketine düşüyor ve
  sunucunun her yazıma yazdığı kayıttaki bölüm adlarının hepsi tanımlı. Burada yapılacak bir şey yok;
  denetimin bu sonucu da kayda geçsin diye yazıldı.
- **İçe aktarma (doğrulandı).** Şablon üç sayfa taşıyor ve uygulama yalnız müşteri, servis, parça ve
  parça tipi bölümlerine **ekleyerek** yazıyor; taşımadığı bölümleri silmiyor, yani veri kaybı riski
  yok. Tek sorun adlandırma: "Tüm Kayıtlar" sayfası adı her şeyin taşındığı izlenimi veriyor.
- **Çek dışa aktarmada yok (doğrulandı).** Yirmi bir rapor var: müşteri, bayi, servis, tahsilat, Extra
  Kalıp, parça, parça stoğu ve hareketi, makina stoğu, not, görüşme, teklif, fatura, üretim formu,
  yedek parça satışı, çalışan, Finans Özeti ve e-posta çıktıları. Çek portföyü hiçbirinde yok; oysa çek
  bir alacak belgesi ve banka, vade, durum bilgisiyle dışarıda izlenmesi doğal.
- **Çöp kutusunun kapsamı (doğrulandı).** Yirmi iki kayıt türü çöp kutusunda listeleniyor (müşteri,
  servis, Extra Kalıp, tahsilat, bayi, stok, not, kalıp tanımı, yedek parça tanımı, model, teklif,
  fatura, görüşme, dosya, üretim formu, parça tipi, çalışan, yedek parça satışı, gider ve diğerleri).
  Dışında kalan dokuz bölüm kalıcı siliniyor.
- **Dokuzdan ikisi neden geri alınabilir olmalı.** **Tedarikçi:** kullanımdaki tedarikçi zaten silinemiyor,
  yani silinen tedarikçinin borcu ve ekstresi yoktur; ama yanlışlıkla silinen iletişim ve vergi bilgisi geri
  gelmiyor. Çalışan zaten çöp kutusunda, tedarikçinin dışarıda kalması tutarsız (R2 düzeltmesi: ilk yazımda
  "ekstresi ve borç geçmişiyle yok oluyor" deniyordu, koda uymuyordu). **Üretim partisi:**
  silinince makinaların parti bağı çözülemiyor ve maliyet aylık kurala düşüyor; yani yanlışlıkla
  silinen bir parti **bütün makinaların maliyetini sessizce değiştiriyor**. 0022'nin "parti yoksa aylık
  kurala düş" kuralı bu düşüşü zarif yapıyor, ama geri dönüşü yok. Çöp kutusu ikisini de geri
  getirilebilir yapar ve kural zaten hazır olduğu için parti tarafı ucuz.
- **QA turu: soft-delete üç ayrı altyapıya dokunuyor.** (1) Veritabanı: iki tabloda `deletedAt` yok, dört
  nokta kuralı gerekiyor (R9b). (2) Sunucu: sekme eşlemesi yalnız `["gider"]`; satırı gören kullanıcının Giderler
  sekmesi olduğu için geri alma 403 almaz ve eşleme değişmez (R15, R2 düzeltmesi). (3) İzin: sunucu çöpe atmayı silme sayar ve silme
  iznini ister; geri alma ve çöpteki kaydın kalıcı silinmesi bölüm düzeyindedir (R16, uygulamada ölçülerek düzeltildi). Üçü yazılmazsa iş "ekran çalışıyor ama kayıt
  tutmuyor" sınıfına düşer.
- **QA turu: çek dışa aktarmasının tek gerçek tuzağı `tedarikciler`.** Gizlilik kaynak taraması
  `SettingsExport.jsx`'te o dizeyi yasaklıyor; alacaklı adı çekin kendi alanından okunmalı (R5).
- **Kalan yedi için kalıcı silme bilinçli.** Gider türü yalnız aynı davranıştaki bir türe taşınarak
  silinebiliyor, böyle bir tür yoksa silme engelli; kasa hesabının hareketi varsa silinemiyor, deneme
  döneminde ise taşıma penceresinden geçiyor; ciro edilmiş çek silinemiyor; ödeme hareketi silinince
  borç yeniden açılıyor, yani geri alınacak şey kaydın kendisi değil sonucu. Bu yüzden tek eksik, bunun
  kullanıcıya **söylenmesi** (R12, R13).

---

## Acceptance Criteria

### İşlem geçmişi

- **AC-1.** Üretim partisi işlemi listede okunur adla görünür.
- **AC-2.** Kaynakta kullanılan her kayıt türünün etiketi vardır (tek yönlü kapsam testi; kullanılmayan
  etiket hata sayılmaz).
- **AC-3.** Kaynakta kullanılan her eylemin etiketi vardır (tek yönlü kapsam testi).
- **AC-4.** Etiketi olmayan yeni bir tür eklenirse test kırılır.

### Dışa ve içe aktarma

- **AC-5.** Çek portföyü dışa aktarılır ve satırlar numara, banka, tutar, vade, durum, yön ile iki ayrı
  taraf sütunu ("Müşteri / Kimden", "Alacaklı") taşır.
- **AC-6.** Tahsilata bağlı çekte tutar ve vade tahsilattan, bağsız çekte çekin kendi alanlarından
  okunur.
- **AC-7.** Çek çıktısında hiçbir gider ya da kasa alanı geçmez **ve** `SettingsExport.jsx` kaynak
  taraması yeşil kalır (`tedarikciler` dizesi dosyada geçmez).
- **AC-8.** İçe aktarma ekranında şablonun hangi bölümleri taşıdığı yazılıdır.
- **AC-9.** İçe aktarma, şablonda olmayan bölümleri silmez.

### Çöp kutusu

- **AC-10.** Silinen tedarikçi çöp kutusunda görünür ve geri alınabilir.
- **AC-11.** Geri alınan tedarikçinin ekstresine yeniden erişilir.
- **AC-12.** Çöpteki tedarikçi borç özetinde ve tedarikçi kırılımında canlı sayılmaz.
- **AC-13.** Silinen üretim partisi çöp kutusunda görünür ve geri alınabilir.
- **AC-14.** Çöpteki partinin makinaları aylık kurala düşer; parti geri alınınca eski dağıtım döner.
- **AC-15.** İkisi de kalıcı silinebilir ve çöpü boşaltma onları kapsar.
- **AC-16.** Onay penceresi olan beş kalıcı silmede "çöp kutusuna gitmez" ibaresi görünür ve metin tek
  sabitten gelir.
- **AC-17.** Çöp Kutusu ekranında kalıcı silinen bölümleri söyleyen tek bilgi satırı vardır ve aynı sabiti
  kullanır.
- **AC-18.** Var olan silme korumaları aynen çalışır (tür taşıma zorunluluğu, hareketli hesap, ciro
  edilmiş çek, borçlu tedarikçi uyarısı).
- **AC-19.** Bir tedarikçi/parti **çöpte** dururken borç özeti, ekstre, gider raporu ve makina maliyeti,
  o kayıt hiç yokmuş gibi üretilen bugünkü çıktıyla birebir aynıdır (R17).

### QA turunda eklenenler (R1)

- **AC-20.** `tedarikciler.deletedAt` ve `uretim_partileri.deletedAt` dört yere eklenmiştir ve
  `db-roundtrip` ile `db-clean-install` ikisini de kapsar (R9b).
- **AC-21.** Uygulama kapanıp açıldığında çöpteki tedarikçi ve parti çöpte kalır (sütun kaybı yok).
- **AC-22.** `BOLUM_SEKMELERI.tedarikciler` ve `.uretimPartileri` değişmemiştir; gider + ayarlar sekmeli
  kullanıcı Çöp Kutusu'ndan geri alma yaparken 403 almaz, yalnız ayarlar sekmeli kullanıcı bu bölümlere
  yazamaz (R15).
- **AC-23.** *(R2 ile kalktı.)* 0001'in R13/R22 kararı değişmediği için tarihli not gerekmez (R15).
- **AC-24.** Yeni izin kimliği eklenmemiştir; silme ve geri alma bugünkü izinlerle çalışır (C4).
- **AC-25.** Çöpe atma sunucuda silme iznini ister (tedarikçide `tedarikci_delete`, partide `gider_tanim`) (R16).
- **AC-26.** Geri alma ve çöpteki kaydın kalıcı silinmesi sunucuda bölüm düzeyinde geçer (`giderler` ile aynı kabul
  edilmiş sınır); arayüz iki düğmeyi silme izniyle gösterir (R16, R21).
- **AC-27.** App `liveTedarikciler` ve `liveUretimPartileri` türetir; Ayarlar ham diziyi alır (C8).
- **AC-28.** İki bölüme yazan hiçbir yer canlı listeyi geri yazmaz; setter'lar tam dizi üzerinde işlevsel
  güncelleyiciyle çalışır (C8).
- **AC-29.** Motorlara çöp süzmesi eklenmemiştir; `borcOzeti`, `tedarikciKirilimi`, `tedarikciEkstresi` ve
  `hesaplaMakinaMaliyetleri` dosyaları bu işte değişmemiştir (R10).
- **AC-30.** Çöpteki partinin makinaları 0022'nin aylık kuralına düşer ve parti geri alınınca eski dağıtım
  döner (R10).
- **AC-31.** `SettingsExport`'a eklenen tek yeni prop `cekler`'dir (R5).
- **AC-32.** Ödeme hareketi ve kapsam dışı kaydı için ayrı ibare yazılmamıştır; R13'ün tek satırı
  yeterlidir (R12).
- **AC-33.** Çöp Kutusu'nun iki yeni satır türü `emptyTrash` ve 30 günlük otomatik temizlikte de işlenir
  (R11).
- **AC-34.** Etiket haritası testi sayıya değil kümeye bağlıdır; yeni bir tür eklenince yalnız etiketi
  eksikse kırılır (R2, R18).
- **AC-35.** Etkilenen kanıt kayıtları (Çöp Kutusu, İşlem Geçmişi, Dışa Aktar, İçe Aktar)
  `beklenen: "degisti"` + onay taşır (R19).
- **AC-36.** `ALAN_IZINLERI` bu işte değişmemiştir (X7).

### Plan onayında eklenenler (R2)

- **AC-37.** Çöpteki kayıtla aynı adda canlı kayıt varken geri alma yapılmaz ve neden söylenir; çöpteki ad yeni
  kaydı engellemez (R20).
- **AC-38.** Gider yetkisi olmayan kullanıcı Çöp Kutusu'nda iki satır türünü görmez; silme izni olmayan kullanıcı
  geri alma ve kalıcı silme düğmelerini görmez (R21).
- **AC-39.** `KALICI_SILME_NOTU` dışında "çöp kutusuna düşmez / çöpe düşmez" serbest metni kaynakta yoktur (R22).
- **AC-40.** Etiket kapsam testi karşılaştırma değerlerini sahte eylem saymaz ve dinamik iki yeri kapsar (R23).
- **AC-41.** Kasa yetkisi olmayan kullanıcı çek raporunu görmez (R24).
- **AC-42.** Electron testleri (`db-electron`, `server-security` dahil) kapanışta yeşildir (R26).
- **AC-43.** Alacaklısı çalışan olan çek dışa aktarmada yer almaz; çıktıda çalışanın adı, ödemenin tutarı, tarihi ve
  vadesi geçmez (R27).

---

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [ ] Etiket kapsamı testi **tek yönlü** eklendi ve eksik etikette kırıldığı gösterildi; beklenti kümeye
      bağlı (AC-2, AC-3, AC-4, AC-34).
- [ ] Çek çıktısı hem çıktı temelli gizlilik testine hem kaynak taramasına dahil; `SettingsExport.jsx`'te
      `tedarikciler` dizesi yok (AC-7, AC-31).
- [ ] İki `deletedAt` sütunu **dört yere** eklendi; `db-roundtrip` ve `db-clean-install` kapsıyor ve
      kapanıp açıldığında çöptekiler çöpte kalıyor (R9b, AC-20, AC-21).
- [ ] `serverAuth.cjs` değişmedi; gider + ayarlar sekmeli kullanıcının geri alması ve yalnız ayarlar
      sekmelinin reddi `server-authz` ve `server-security` ile gösterildi (R15, AC-22).
- [ ] Soft-delete'in izin denetimi üzerindeki etkisi kabul edilen sınır olarak yazıldı; `ALAN_IZINLERI`
      dokunulmadı (R16, AC-25, AC-36).
- [ ] App canlı/ham dizi ayrımı yapıldı ve hiçbir yer canlı listeyi geri yazmıyor (C8, AC-27, AC-28).
- [ ] Çöp Kutusu'nun beş dokunma noktası tamamlandı (iki satır, restore/purge, `emptyTrash`,
      `purgeOldTrash`, `raw*` prop'ları) (R11, AC-33).
- [ ] Rakamların değişmediği çapraz testle gösterildi: kayıt **çöpte** dururken çıktı, kayıt hiç yokmuş
      gibi üretilen çıktıyla aynı (AC-19, AC-29, AC-30).
- [ ] Görsel kanıt eklendi (`docs/evidence/0068-*.jpg` + `0068-piksel-raporu.json`, yeni taban): İşlem
      Geçmişi'nde etiketli parti satırı, Dışa Aktar'da çek seçeneği, İçe Aktar'da kapsam yazısı, Çöp
      Kutusu'nda tedarikçi ve parti satırı ile kalıcı silme bilgi satırı; etkilenen kayıtlar
      `beklenen: "degisti"` + onay aldı ve `done`'a taşınırken `ayni`ye çevrilecek (R19, AC-35).
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi: 0001 bölümündeki "`tedarikciler`" ve 0022 bölümündeki
      "`uretimPartileri` … (tablo `uretim_partileri`, **kalıcı silme**)" ifadeleri soft-delete'e göre
      düzeltildi, Çöp Kutusu kapsam listesine iki tür eklendi, kalıcı silinen bölümlerin listesi, sekme
      eşlemesinin bilinçli olarak değişmediği ve etiket kapsamı testinin varlığı yazıldı.
- [ ] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | | Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | | İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | / | Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | | Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | | Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:**
