# 0072 — Peşin Ödenen Giderin Aylara Dağıtılması

| | |
|---|---|
| **Durum** | Onaylandı, uygulanıyor (revizyon 2, 2026-10-06) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Gider kalemi (yeni alan), makina maliyeti motoru, Giderler > Makina ve Model, maliyet notları |
| **Bağımlı spec'ler** | 0001 (kova dağılımı) · 0002 (makina maliyeti, ortak gider payı) · 0020 (personel atanabilir, kalem adı) · 0021 (taksit, ters emsal) · 0022 (üretim partisi) · 0062 (sayfalama, rozetin durduğu liste) · 0067 (Dönem Raporu kutu düzeni) |
| **Revizyon** | 2 · 2026-10-06 uygulama planı onayı: S1–S10 işlendi (R13, R14, R16, R17, R19, R20, R25–R30, AC-22, AC-29, AC-35–AC-38); plan `specs/0072-uygulama-plani.md` |
| **Önceki revizyon** | 1 · 2026-10-06 QA turu: B-1..B-7, Ö-8..Ö-20, K-21..K-24 işlendi (Takım Yöneticisi onayı) |

---

## Intent

Müşteri internet aboneliğini **12 ay peşin** ödedi. Bugün bu gider tek bir ayın kalemi: o ayın makina
maliyeti bir yıllık interneti yüklenirken sonraki on bir ayın makinaları hiç internet maliyeti
taşımıyor. Aynı durum yıllık sigorta, yıllık bakım sözleşmesi, yıllık yazılım aboneliği için de
geçerli.

İstenen: **bir kez ödenen giderin aylık payı, o ayın üretimine maliyet olarak yansısın.**

Bunun 0021'in taksitiyle karıştırılmaması gerekiyor ve ikisi tam tersidir:

| | Ne bölünür | Ne bölünmez |
|---|---|---|
| **Taksit (0021)** | Ödeme | Gider; masraf doğduğu ayda tek parça durur |
| **Bu spec** | Maliyet payı | Ödeme; para bir kez, bir günde çıkar |

Başarı şu demek: on iki aylık interneti bir kez girip bir kez ödüyorsunuz, ama her ayın makina
maliyetinde o ayın payı görünüyor.

---

## Requirements

### A. Kalemde dağıtım

- **R1.** Gider kalemine **kaç aya dağıtılacağı** girilebilir. Boş ya da bir ise bugünkü davranış
  sürer (dağıtım yok).
- **R2.** Dağıtım **kalemin gider tarihinin ayından başlar** ve girilen ay sayısı kadar sürer. Hesap
  **ay anahtarlarıyla** yapılır (`YYYY-MM`, motorun `ayOf(k.tarih)`'i, `makinaMaliyeti.js:173`); **gün
  dikkate alınmaz** (K-21), ayın 30'unda ödenen yıllık abonelik o ayın tam payını alır. Oransal gün
  hesabı yoktur (X8).
- **R3.** Aylık pay kuruş hesabıyla eşit bölünür ve bölme **mevcut `esitBol` ile** yapılır, yani artık
  kuruş **son aya** gider (B-7). Uygulamada bugün iki yuvarlama kuralı var (`esitBol` artığı son
  taksite, `gider.js:198-202`; makina payı artığı ilk makinaya, `makinaMaliyeti.js:275`) ve **üçüncü
  bir kural icat edilmez**. Yan fayda: kalemin kendi ayı, yani dönem raporunda görünen ay, yuvarlak payı
  taşır.
- **R4.** Dağıtım tekrarlayan gider tanımında da tanımlanabilir; tanımdan üretilen kalem dağıtımı taşır.
  **Tanım her ay kalem ürettiği için çift sayım riski vardır** (Ö-16): dağıtımlı tanım **engellenmez**,
  tanım formunda "Bu tanım her ay kalem üretir; dağıtım genelde yılda bir girilen kalemler içindir."
  ipucu yazar. Yasaklamak reddedildi, çünkü yıllık sözleşme tanımla da izlenebilir.
- **R5.** Dağıtım ay sayısı **1 ile 60 arasında tam sayıdır** ve doğrulama taksit emsalini birebir
  izler (Ö-9): `taksitSayisiCoz` deseninde `dagitimAySayisiCoz` (`gider.js:360-367`), boş değer 1
  döner, tam sayı olmayan ve aralık dışı değer "Dağıtım ay sayısı 1 ile 60 arasında tam sayı olmalı."
  hatasıyla reddedilir.
- **R25 (S3).** Alan **atama bölümünden bağımsız** bir "Maliyete dağıtım (ay)" satırıdır ve bütün davranışlarda
  (normal, kira, personel) çizilir: kirada atama bölümü yoktur (0020) ama peşin yıllık kira tipik kullanımdır.
  Modele atanmış kalemde ipucu "Yalnız modellere dağıtılmayan kısım aylara bölünür." yazar.
- **R17.** **Doğrudan atanmış kalem (makina kovası) dağıtılamaz** (B-2): motorun kendi yorumu
  "doğrudan atama kalem tarihinden bağımsız olarak makinanın üretim maliyetine girer"
  (`makinaMaliyeti.js:179`, 0002 R19). Form, atama türü makina olduğunda dağıtım alanını çizmez ya da
  pasif eder ve nedenini yazar. Tek bir makinaya atanmış gideri aylara bölmenin anlamı yoktur, makina
  bir kez üretilmiştir. **Revizyon 2 (S3):** "Dağıtılmasın" seçili kalemde de alan pasiftir ve nedeni "Makina
  maliyetine girmeyen kalem aylara dağıtılmaz." yazar (etkisi sıfır olan açık alan yanıltır).
- **R19.** Kalıcı alan **iki tabloda bir sütundur** (Ö-8): `dagitimAy` (INTEGER), `giderler` ve
  `gider_tanimlari` (`db.cjs:221-230` ve `:254-260`), dört nokta kuralıyla (`SCHEMA_SQL`,
  `applyColumnMigrations` içinde `ensureColumns`, INSERT listesi ve parametreleri, SELECT eşlemesi);
  `db-roundtrip.cjs` ve `db-clean-install.cjs` kapsamına girer. **Revizyon 2 (S4):** bir ya da boş değer `null`
  saklanır ve boş değer okumada blob'a yazılmaz (eski kaydın görünümü ve sunucu karşılaştırması değişmez); atama makina
  ya da "dağıtılmasın" olursa doğrulama alanı temizler (sonradan makinaya atanan kalemde sessiz kalıntı kalmaz).

### B. Neyi etkiler, neyi etkilemez

- **R6.** **Yalnız makina maliyetinin ORTAK gider payını etkiler.** Model havuzu payları **dağıtılmaz**
  (B-1): her model satırı `birim = birimMaliyet` ve `kapasite = adet` ile bağımsız bir havuz kurar ve
  kendi tarihinden sonra üretilen makinalara **birer birim** pay verir (`makinaMaliyeti.js:183-216`,
  0002 M13). Havuzun birimi "bir makinaya giren malzeme"dir, ay değil; aylara bölmek makina başına
  malzeme payını birim maliyetin on ikide birine indirir ve malzeme maliyetini bozar.
- **R7.** **Dönem raporu değişmez:** kalem gider tarihinin ayında, tam tutarıyla durur. "Bu ay ne kadar
  gider yaptım" sorusunun cevabı değişmez.
- **R8.** **KDV değişmez:** indirilecek KDV faturanın ayındadır, aylara bölünmez.
- **R9.** **Ödeme değişmez:** borç, vade, hatırlatıcı ve kasa tek seferlik ödemeyi görür.
- **R10.** Kalemin kovası değişmez. **Kova dörttür** (B-3): `makina`, `model`, `dagitma`
  (`ATAMA.DAGITMA`) ve `ortak` (`gider.js:682-697`); dağıtım **yalnız `ortak` kovasına** uygulanır,
  `dagitma` kovasının dağıtımla ilişkisi yoktur (R17 makina kovasını, R6 model kovasını kapsam dışında
  bırakır).
- **R18.** **Standart ortak gider kaynağında dağıtımın etkisi yoktur** (B-4): `makinaMaliyeti.js:260`
  `ortak = kaynak === STANDART ? standart : gercek`, yani standart kaynakta ayın tutarı
  `standartGiderAyi`'ndan gelir, kalemlerden değil. Dağıtım yalnız **gerçek** kaynakta etkilidir ve
  maliyet notu standart kaynakta bunu söyler (R15).
- **R11.** Yürürlük ayından önceki aylara düşen pay hiçbir hesaba girmez. Bu bir **savunma kuralıdır**
  (B-6): bugün kalemler yürürlük eşiğiyle süzülüyor (`makinaMaliyeti.js:165-166`) ve R2 dağıtımı
  kalemin ayından ileriye başlattığı için yürürlük öncesine pay düşemez. Kural, ileride bir başlangıç
  ayı alanı eklenirse (X6) sızıntıyı önlemek için yerinde tutulur.
- **R12.** Dağıtım payları **yalnız içinde bulunulan aya kadar** hesaba eklenir; gelecek aylara düşen
  paylar o ay geldiğinde kendiliğinden girer ve ayrıca bir işlem gerekmez (B-5). Kural saf fonksiyonun
  içindedir, ekranda değil. Aksi hâlde `tumAylar` (`makinaMaliyeti.js:239`) gelecek ayları hemen alır ve
  üretimi olmayan ayda pay `dagitilmamis = ortak` (`:283`) olarak raporlanır, yani 12 aylık bir kalem
  girildiği gün on bir ay boyunca "dağıtılmamış ortak gider" uyarısı üretir ve o uyarı anlamını
  kaybeder.
- **R21.** Ay tablosuna bağlı iki özet dağıtılmış payları **bilinçli olarak** içerir (Ö-13):
  "Kapanmış partilerin aylarında değişen ortak gider" kutusu (0022 R15) dağıtım yüzünden de çıkabilir
  (gerçek bir farktır, ayın ortak gideri gerçekten değişti), ve `ortakGercek − ortakStandart` farkı
  (`makinaMaliyeti.js:412-413`) payları sayar.
- **R22.** Dağıtım sayısı değiştirilince **geçmiş ayların makina maliyeti değişir** ve bu beklenen
  davranıştır (Ö-14): maliyet her zaman bugünkü veriden türer (0002 C10, `BUGUNKU_VERI_NOTU`); 12'den
  6'ya düşürmek altı ayın maliyetini değiştirir.
- **R26 (S10).** Gelecek ay (R12) ve yürürlük öncesi ay (R11) süzgeci dışa verilen **tek saf yardımcıdır** ve
  doğrudan sınanır; motor onu çağırır.
- **R23.** Çöpe atılan dağıtılmış kalemin **bütün ayları** hesaptan çıkar ve geri alınınca döner; tutar
  değişince bütün ayların payı yeniden bölünür (Ö-15). Saklı dağıtım tablosu olmadığı için (C4) ek bir
  işlem gerekmez.

### C. Görünürlük

- **R13.** Dağıtılan kalem listede ayırt edilir ve rozet **dönemden bağımsız** bilgi yazar: "12 aya
  dağıtılmış · AA.YYYY – AA.YYYY" (kapsam aralığı). *(Revizyon 2, S7: rozet kalem listesinin atama hücresindedir,
  atama rozetinin yanında; tutar sütunu tam tutardır.)* **"Kaçıncı ay" yazılmaz** (Ö-10): bugüne göre
  sayılan bir sıra numarası geçmiş dönem raporunda yanıltıcıdır. Kalem listesinde kalemin **tam tutarı**
  kalır (R7).
- **R14.** Makina maliyeti detayında dağıtılmış kalemin satırı, o makinaya düşen payın **aylık paydan**
  geldiğini söyler. **Revizyon 2 (S6):** detayda ortak pay tek satırdır (kalem listesi yok); "Ortak gider payı"
  satırının altında makinanın üretim ayında (partili makinada partinin aylarında) payı olan dağıtılmış kalemler
  yazılır: "İnternet aboneliği · 12 aya dağıtılmış, aylık 1.000,00 ₺". Makinaya düşen kuruş ayrıca hesaplanmaz
  (motorda yeni bir dağıtım hesabı açardı, C2).
- **R15.** Maliyet notlarına, **yalnız hesapta dağıtılmış kalem varsa** görünen bir satır eklenir
  (Ö-12; bugün `MaliyetNotlari` dört satır yazıyor: malzeme hariç, ortak gider kaynağı, koşullu yaklaşık
  kur, bugünkü veri, `MakinaMaliyetDetay.jsx:15-22`). Metin sabittir ve standart kaynakta dağıtımın
  etkisiz olduğunu söyleyen ayrı bir cümledir (R18).
- **R16.** Giderler > Makina ve Model görünümünde ayın ortak gider **toplamı** dağıtılmış payları içerir
  ve kutuda "dağıtılmış kalemlerin bu aya düşen payı dahildir" ibaresi yazar; **ham kalem listesi**
  kalemin **tam tutarını** gösterir (R7 ile tutarlı) ve rozetle dağıtıldığını söyler (Ö-11). İki rakamın
  farkı ibare olmadan "toplam kalemleri tutmuyor" hatası olarak açılır. **Revizyon 2 (S2):** görünümün dört kova
  kartı dönem raporunun kovalarıdır (maliyet motorunun değil) ve "dört kovanın toplamı = dönem toplamı" cümlesi taşır;
  bu kartlar **değişmez** (AC-12). Ayrıca ortak kalemlerin bir ham listesi yoktur. R16 bu yüzden **yeni bir kutuyla**
  karşılanır: "Bu dönemde makina maliyetine giren ortak gider", yalnız dönemin bir ayına payı düşen dağıtılmış kalem
  varsa çizilir; toplam maliyet motorunun ay tablosundan (dönemin ay anahtarları), ibare ve dağıtılmış kalemlerin tam
  tutarlı listesi rozetiyle. Standart kaynakta kutu yerine etkisizlik cümlesi yazılır (R18).
- **R24.** Dağıtım rozeti ve maliyet detayındaki aylık pay satırı kalem adını **`kalemGorunenAd`**'dan
  okur (Ö-20): personel davranışında ad her zaman "Personel gideri"dir (0020 R6). Yazdırma ve dışa
  aktarma dağıtımı hiç okumaz ve `gider-gizlilik.test.js`'in `MALIYET` taraması gevşetilmez.
- **R20.** Aylık pay **tek saf fonksiyondan** gelir (Ö-18): `src/lib/gider.js`'e
  `dagitimPaylari(k, davranis, { canliModeller })` → `[{ay, payK}]` (yalnız `ortak` kovası, kuruş,
  `esitBol` ile); `makinaMaliyeti.js` onu çağırır, ekranlar da aynı fonksiyonu kullanır. **Revizyon 2 (S5):** imza
  `dagitimPaylari(k, davranis, { makinaCoz, canliModeller })`: çözücüsüz çağrı makinaya atanmış kalemi ortak sayardı
  (`kalemKovalariKurus`) ve motorla ekran ayrışırdı. Ortak kovası sıfır olan kalemde (çözülen makina ataması, "dağıtılmasın")
  boş liste döner; makina ve "dağıtılmasın" atamasında ay sayısı her zaman 1 sayılır (R17 savunması, `dagitimAyOf`), böylece
  makinası silinmiş (düşen) atamanın ortak gideri bugünkü gibi kendi ayında kalır. Dağıtımsız kalemde tek giriş döner
  (`[{ay: kalemin ayı, payK: ortak}]`), böylece motorun tek yolu vardır. Bu, 0002'nin
  "kova bölmesi 0001'den okunur, yeniden türetilmez" kuralının birebir devamıdır.

### D. Plan onayıyla gelenler (revizyon 2)

- **R27 (S1).** İş `feat/0073-hareket-duzenleme` (`ef4f18a`) üstünde `feat/0072-gider-dagitim` dalında yapılır
  (0071, 0070 ve 0073 henüz main'de değil).
- **R28 (S8).** **Karışık sürüm:** güncellenmemiş sunucu `dagitimAy`'ı düşürür, güncellenmemiş istemci okumaz ve iki
  bilgisayar farklı makina maliyeti gösterir. Planın §7'sinde sürüm notu: önce sunucu PC, sonra bütün istemciler;
  güncelleme bitene kadar dağıtım girilmez.
- **R29 (S9).** 0002 C9 süre testi dokunulmaz; yeni dosyada aynı veri ve aynı eşikle, kalemlerin bir kısmı 60 aya
  dağıtılmış bir süre testi eklenir.
- **R30.** `MakinaMaliyetDetay.jsx` tasarım sözlüğünü kullanmaz ve kanıt eşlemesinde kaydı yoktur; notların değişikliği
  `MakinaKarliligi.jsx` kaydıyla görünür. DoD'nin kanıt listesi buna göre okunur.

## Constraints

- **C1.** Hesaplar kuruş tamsayısıyla; on iki aya bölünen tutarın payları toplamı tam tutara eşittir.
  Bölme **mevcut `esitBol`** ile yapılır ve artık kuruş son aya gider (R3); yeni bir yuvarlama kuralı
  yazılmaz.
- **C2.** **Tek hesap:** aylık pay tek bir saf fonksiyondan gelir (`gider.dagitimPaylari`, R20); maliyet
  motoru, ekran ve rapor aynı fonksiyonu çağırır ve hiçbiri bölmeyi yeniden yapmaz (kaynak taraması).
- **C3.** **Dağıtımsız kalemde motor çıktısı birebir bugünküdür** ve ölçütü **mevcut testin
  değişmemesidir** (Ö-17): `tests/makina-maliyeti.test.js` dokunulmadan yeşil kalır. Ayrıca 0002 C9'un
  süre ölçümü testi aynı eşikte kalır; dağıtım döngüsü kalem başına en çok 60 adım ekler.
- **C4.** Yeni kalıcı alan **iki tabloda bir sütundur** (`dagitimAy`, R19). Dağıtım tablosu saklanmaz,
  okuma anında türetilir; bu yüzden çöp, tutar ve ay sayısı değişiklikleri ek işlem gerektirmez (R23).
- **C5.** Yeni izin ve yeni sunucu denetimi yoktur; sunucuda `BOLUM_SEKMELERI`, `EYLEM_IDLERI`,
  `ALAN_IZINLERI` ve `MERGE_KEYS` değişmez (K-23). Yeni sütunlar bölüm düzeyinde `gider_edit` ve
  `gider_tanim` izinleriyle yazılır.
- **C6.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** Dönem raporunun ve KDV'nin de aylara bölünmesi (tam dönemsellik) — *neden:* R7, R8. Bu,
  tahakkuk esasını baştan değiştirir, geçmiş ayların raporlarını oynatır ve muhasebeyle çakışır.
  İstenen, maliyetin doğru dağılmasıydı. Gerekirse ayrı ve çok daha büyük iştir.
- **X2.** Ödemenin aylara bölünmesi — *neden:* R9; o zaten taksit ve bu kalemde ödeme tek seferlik.
- **X3.** Geçmişte peşin ödenmiş kalemlerin toplu dönüştürülmesi — *neden:* kullanıcı istediği kalemi
  düzenleyip ay sayısını girer; toplu dönüşüm için veri yok.
- **X4.** Gelir tarafının dönemselleştirilmesi (peşin alınan bedelin aylara yayılması) — *neden:* bu
  spec gider tarafıdır.
- **X5.** Amortisman — *neden:* makina ve demirbaş amortismanı ayrı bir kavram ve ayrı bir iştir;
  burada konu, hizmet bedelinin peşin ödenmesi.
- **X6.** **Dağıtımın başlangıç ayının ayrıca girilmesi** (geriye dönük sözleşme) — *neden:* R2 dağıtımı
  kalemin ayından ileriye başlatır; geriye dönük bir sözleşme için ayrı bir başlangıç ayı alanı
  gerekir ve o zaman R11'in yürürlük sınırı gerçek bir kural olur. Bu spec forward-only kalır.
- **X7.** **Model havuzu ve doğrudan atanmış kalemin dağıtılması** — *neden:* R6 ve R17; model havuzunun
  birimi aylık bir tutar değil (bir makinaya giren malzeme), doğrudan atama ise kalem tarihinden
  bağımsız (0002 R19). İkisini bölmek o iki kararı geçersiz kılar.
- **X8.** **Gün oranlı dağıtım** (ayın 20'sinde başlayan sözleşmede ilk ayın payını kısmi almak) —
  *neden:* R2; motor ay anahtarlarıyla çalışıyor ve gün hesabı yeni bir boyut açar.

## Context

- **Bugün ne oluyor.** Makina maliyeti üç parçadan oluşuyor: doğrudan atanmış gider, model havuzu
  payları ve **üretim ayının ortak gider payı**. Ortak gider payı o ayın ortak kalemlerinin toplamından
  geliyor. On iki aylık internet tek ayın ortak kalemi olduğu için o ayın makinaları on iki aylık
  bedeli paylaşıyor, sonraki aylar sıfır taşıyor. Az makina üretilen bir ayda bu, makina başına ciddi
  bir sapma demek.
- **Zaten var olan bir emsal: standart gider kaynağı, ama onunla birlikte bir sınır.** Uygulama bugün de
  "ortak giderin aylık tutarı" ile "o ay fiilen girilmiş kalemler" arasında ayrım yapabiliyor: ortak
  gider kaynağı **standart** seçildiğinde maliyet, ayın gerçek kalemleri yerine aylık bütçeyi okuyor
  (`makinaMaliyeti.js:260`). Yani **maliyetin ayı ile kalemin ayının farklı olabileceği** fikri motorda
  kabul edilmiş durumda ve bu spec aynı fikri kalem düzeyine indiriyor. Ama aynı satır bir sınır da
  koyuyor: **standart kaynakta dağıtımın hiçbir etkisi olmaz**, çünkü ay tutarı kalemlerden değil
  standart tablodan gelir (R18). Bu ekranda söylenmeli, yoksa "dağıttım ama değişmedi" hata sanılır.
- **Kovaların hangisi dağıtılabilir (ölçüldü).** Kova dörttür: `makina`, `model`, `dagitma`, `ortak`
  (`gider.js:682-697`). Dağıtım yalnız `ortak` kovasına uygulanabilir. `makina` kovası doğrudan
  atamadır ve motorun kendi yorumu "kalem tarihinden bağımsız olarak makinanın üretim maliyetine girer"
  diyor (`makinaMaliyeti.js:179`, 0002 R19). `model` kovası aylık bir tutar değil: her satır
  `birim × kapasite` boyutunda bir havuz kurup kendi tarihinden sonra üretilen makinalara **birer
  birim** veriyor (`:183-216`, 0002 M13); onu aylara bölmek makina başına malzeme payını birim
  maliyetin on ikide birine indirir. R6, R10 ve R17 bu üç ayrımı yazılı tutuyor.
- **Neden yalnız maliyet, rapor değil.** Dönem raporu tahakkuk esaslıdır ve muhasebenin gördüğü
  rakamdır; KDV de faturanın ayında indirilir. İkisini aylara bölmek hem geçmiş ayların raporunu
  oynatır hem de kullanıcıyı muhasebeciyle çelişen bir tabloyla bırakır. Müşterinin istediği de bu
  değil: "o ayki üretime maliyet olarak katılsın" dedi. Dar kapsam hem doğru hem ucuz (R6–R9).
- **Üretim partisiyle ilişkisi.** Parti açıkken o partinin makinaları kapsadığı ayların ortak
  paylarını topluyor. Dağıtılmış kalemin payları da ay ay dağıldığı için partiye doğal olarak doğru
  yansır; ek bir kural gerekmiyor. Açık partide maliyetin "geçici" olması bu işle daha da anlamlı
  hâle gelir, çünkü gelecek ayların payları henüz girmemiştir.
- **Yürürlük ayı sınırı bugün zaten ulaşılamaz (ölçüldü).** Kalemler yürürlük eşiğiyle süzülüyor
  (`makinaMaliyeti.js:165-166`, `k.tarih >= esik`) ve R2 dağıtımı kalemin ayından **ileriye**
  başlatıyor; yani yürürlük öncesine pay düşemez. R11 bu yüzden bir **savunma kuralı** olarak duruyor:
  ileride bir başlangıç ayı alanı eklenirse (X6) sızıntıyı önler. Geriye dönük sözleşme senaryosu bu
  spec'in kapsamı dışındadır.
- **Gelecek aylar ay tablosuna hemen giriyor ve bu bir tuzak.** `tumAylar` (`:239`)
  `ortakGercek.keys()`'i içeriyor; üretimi olmayan bir ayda sahip yoksa pay `dagitilmamis = ortak`
  (`:283`) olarak raporlanıyor. Dağıtım bu yolu sistematik hâle getirir: 12 aylık bir kalem girildiği
  gün on bir ay boyunca "dağıtılmamış ortak gider" üretir ve o uyarı anlamını kaybeder. R12 bu yüzden
  payları yalnız içinde bulunulan aya kadar ekliyor.
- **Kuruş artığı için üçüncü bir kural yazılmıyor.** Uygulamada bugün iki kural var: `esitBol` artığı
  **son** taksite yazıyor (`gider.js:198-202`), makina payı artığı **ilk** makinaya yazıyor
  (`makinaMaliyeti.js:275`). Aylık pay mevcut `esitBol` ile hesaplanır, yani artık son aya gider (R3).
  Bu hem C2'nin tek hesap şartına uyar hem de kalemin kendi ayının (dönem raporunda görünen ay)
  yuvarlak payı taşımasını sağlar.
- **Maliyet bugünkü veriden türer, bu yüzden dağıtım geriye de işler.** Ay sayısını 12'den 6'ya düşürmek
  altı ayın makina maliyetini değiştirir (R22); 0002 C10 rakamı dondurmuyor ve `BUGUNKU_VERI_NOTU` bunu
  zaten söylüyor. Aynı nedenle çöpe atılan kalemin bütün ayları hesaptan çıkar ve geri alınınca döner
  (R23).

---

## Acceptance Criteria

### Dağıtım

- **AC-1.** Gider kalemine dağıtım ay sayısı girilebilir; boş ya da bir ise davranış değişmez.
- **AC-2.** Dağıtım kalemin gider tarihinin ayından başlar; ayın 30'unda ödenen kalem o ayın **tam**
  payını alır (gün oranı yok).
- **AC-3.** Aylık payların toplamı kalemin tutarına kuruşu kuruşuna eşittir.
- **AC-4.** Artık kuruş **son aya** yazılır ve bölme `esitBol` ile yapılır (yeni yuvarlama kuralı yok).
- **AC-5.** Tekrarlayan tanımda dağıtım tanımlanabilir ve üretilen kalem onu taşır.
- **AC-21.** Dağıtımlı tanım kaydedilebilir ve formda "Bu tanım her ay kalem üretir" ipucu görünür.
- **AC-6.** 60'ın üstünde, sıfır, negatif ve tam sayı olmayan ay sayısı tek hata metniyle reddedilir.
- **AC-22.** Atama türü makina olan kalemde dağıtım alanı çizilmez ya da pasiftir ve nedeni yazılıdır.
  *(Revizyon 2, S3: "dağıtılmasın" kalemde de pasif ve nedenli.)*
- **AC-35.** *(S3)* Kira ve personel kaleminde dağıtım alanı vardır; modele atanmış kalemde ipucu görünür.
- **AC-36.** *(S4)* Bir ya da boş değer `null` saklanır; atama makina ya da "dağıtılmasın" olunca alan temizlenir.
- **AC-23.** `dagitimAy` sütunu `giderler` ve `gider_tanimlari` tablolarında roundtrip eder ve temiz
  kurulumda da vardır.

### Etki alanı

- **AC-7.** On iki aya dağıtılmış kalemde, üretim ayı dağıtımın ikinci ayı olan bir makinanın
  maliyetinde kalemin aylık payı görünür, tamamı değil.
- **AC-8.** Dağıtımın kapsamadığı bir ayda üretilen makina bu kalemden pay almaz.
- **AC-24.** Dağıtım **yalnız `ortak` kovasına** uygulanır: model satırlı bir kalemin model havuzu
  payları ve doğrudan atanmış kalemin makina payı bu işten önce ve sonra aynıdır.
- **AC-25.** Ortak gider kaynağı **standart** iken dağıtımın hiçbir etkisi yoktur; ay tutarı standart
  tablodan gelir ve maliyet notu bunu söyler.
- **AC-26.** Dağıtımın gelecek aylarına düşen paylar **bugün hesaba girmez** ve o aylar ay tablosuna
  eklenmez; "dağıtılmamış ortak gider" bu yüzden şişmez.
- **AC-9.** Dönem raporunda kalem, gider tarihinin ayında tam tutarıyla durur.
- **AC-10.** İndirilecek KDV faturanın ayındadır ve bölünmez.
- **AC-11.** Borç, vade, hatırlatıcı ve kasa tek seferlik ödemeyi görür.
- **AC-12.** Kalemin kovası değişmez (dört kovanın tutarları aynı).
- **AC-13.** Yürürlük ayından önceye düşen paylar hiçbir hesaba girmez (savunma kuralı, bugünkü veride
  erişilemez olduğu da ölçülür).
- **AC-27.** Dağıtım sayısı 12'den 6'ya düşürülünce altı ayın makina maliyeti değişir (beklenen
  davranış).
- **AC-28.** Dağıtılmış kalem çöpe atılınca bütün ayları hesaptan çıkar, geri alınınca döner; tutar
  değişince bütün ayların payı yeniden bölünür.
- **AC-14.** Dağıtımsız kalemlerden oluşan bir veri kümesinde motor çıktısı bu işten önce ve sonra
  birebir aynıdır; ölçüt `tests/makina-maliyeti.test.js`'in **dokunulmadan** yeşil kalmasıdır.
- **AC-29.** 0002 C9'un süre ölçümü testi aynı eşikte kalır. *(Revizyon 2, S9: ayrıca dağıtımlı veriyle aynı
  eşikte yeni bir süre testi.)*
- **AC-37.** *(S5, S10)* `dagitimPaylari` ortak kovası sıfır olan kalemde (çözülen makina ataması) boş, dağıtımsız kalemde tek giriş döner; gelecek ay ve
  yürürlük süzgeci tek saf yardımcıdır.

### Görünürlük

- **AC-15.** Kalem listesinde dağıtılmış kalem rozetle ayırt edilir, rozet kapsam aralığını yazar
  ("12 aya dağıtılmış · AA.YYYY – AA.YYYY") ve "kaçıncı ay" yazmaz; satırdaki tutar kalemin tam
  tutarıdır.
- **AC-16.** Makina maliyeti detayında payın aylık paydan geldiği yazılıdır.
- **AC-17.** Maliyet notlarındaki dağıtım satırı **yalnız** hesapta dağıtılmış kalem varsa görünür;
  standart kaynakta etkisizliği söyleyen cümle yazılır.
- **AC-18.** Makina ve Model görünümünde ayın ortak gider toplamı dağıtılmış payları içerir ve kutuda
  payın dahil olduğunu söyleyen ibare vardır.
- **AC-30.** Aynı görünümdeki ham kalem listesi kalemin **tam tutarını** gösterir ve rozetle
  dağıtıldığını söyler.
- **AC-38.** *(S2)* Makina ve Model'in dört kova kartı ve "dört kovanın toplamı" cümlesi değişmez; yeni kutu yalnız
  dönemde dağıtılmış kalem varken çizilir, standart kaynakta etkisizlik cümlesi yazar.
- **AC-31.** Personel davranışlı dağıtılmış kalemin rozeti ve maliyet satırı adı "Personel gideri"
  yazar; çalışan adı geçmez.
- **AC-32.** Yazdırma ve dışa aktarma dosyaları dağıtım alanını hiç okumaz ve `MALIYET` taraması
  gevşetilmemiştir.
- **AC-33.** "Kapanmış partilerin aylarında değişen ortak gider" kutusu dağıtım yüzünden de çıkabilir
  ve bu bilinçlidir.

### Tek hesap

- **AC-19.** Aylık pay tek fonksiyondan (`gider.dagitimPaylari`) gelir; ekran ve motor aynı fonksiyonu
  çağırır ve ikinci bir bölme yoktur (kaynak taraması).
- **AC-20.** Yeni izin ve sunucu denetimi eklenmemiştir; `BOLUM_SEKMELERI`, `EYLEM_IDLERI`,
  `ALAN_IZINLERI` ve `MERGE_KEYS` değişmemiştir.
- **AC-34.** `esitBol`, `kalemKovalariKurus` ve `kiraHesapla` imzaları ve çıktıları değişmemiştir.

## Definition of Done

- [ ] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor. Dosyalar: motor
      `tests/gider-dagitim-0072.test.js` (paylar, yuvarlama, yalnız ortak kova, standart kaynak
      etkisizliği, gelecek ay sınırı, yürürlük savunması), bileşen
      `tests/ui/gider-dagitim-0072.test.jsx` (form alanı ve pasif durumu, rozet, maliyet detay satırı,
      not, Makina ve Model kutusu); ek bloklar `makina-maliyeti.test.js` (dokunulmadan yeşil, AC-14),
      `gider.test.js` (doğrulama, AC-6), `gider-gizlilik.test.js` (AC-31, AC-32), `db-roundtrip.cjs` ve
      `db-clean-install.cjs` (AC-23); `merge` ile `server-authz` dokunulmaz.
- [ ] Dağıtımsız veride motor çıktısının değişmediği, mevcut testin dokunulmadan yeşil kalmasıyla
      gösterildi (AC-14) ve süre eşiği korundu (AC-29).
- [ ] Payların toplamının tutara eşit olduğu ve artığın son aya gittiği testle sabitlendi (AC-3, AC-4).
- [ ] Dağıtımın yalnız `ortak` kovasına uygulandığı testle sabitlendi (AC-24) ve standart kaynakta
      etkisiz olduğu gösterildi (AC-25).
- [ ] Gelecek ay sınırının "dağıtılmamış ortak gider"i şişirmediği testle gösterildi (AC-26).
- [ ] Dönem raporu ve KDV'nin etkilenmediği testle gösterildi (AC-9, AC-10).
- [ ] Görsel kanıt: `docs/evidence/0072-taban-piksel-raporu.json` ve `0072-piksel-raporu.json`;
      ekranlar gider formunun dağıtım alanı (etkin ve pasif), kalem listesi rozeti, maliyet detayındaki
      aylık pay satırı, maliyet notları, Makina ve Model kutusu. `GiderForm`, `DonemRaporu`,
      `MakinaMaliyetDetay` ve `MakinaModelGorunumu` tasarım sözlüğünü kullandığı için
      `docs/evidence/kanit-eslemesi.json` kayıtları `beklenen: "degisti"` artı onay satırı taşır; spec
      `done`'a taşınırken `ayni`ye çevrilir.
- [ ] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md` güncellendi: dağıtımın yalnız makina maliyetinin **ortak** payını etkilediği (model
      havuzu ve doğrudan atama kapsam dışı), standart kaynakta etkisiz olduğu, gelecek ayların o ay
      gelince girdiği, raporun ve KDV'nin faturanın ayında kaldığı, artığın son aya gittiği ve taksitle
      farkı.
- [ ] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | | Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | | İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | / | Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | | Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | | Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:**
