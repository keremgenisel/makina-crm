# 0117 — Tamir edilen kalıbın sevki: kargo alanları, etiketin yeri ve çıktı adı

| | |
|---|---|
| **Durum** | Tamamlandı (revizyon 2: QA turu ve plan turu Karar 39–50, uygulamada Karar 51–52, 2026-10-29; uygulama commit `ad28cce`; plan `specs/done/0117-uygulama-plani.md`) |
| **Sahip** | Analist |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | **Kaynak:** servis formunun kalıp bölümü (`KalipAtolyeAlani`) ve ona `calisanlar`'ı geçiren `ServiceForm`; iki kurucu (`CustomerDetailModal.saveService`, `ServisPanosu.kaydet`); `lib/kalipTamiri.js` (tek yazıcı, liste başlığı sabiti); `electron/db.cjs` (beş sütun, dört nokta); Servis ve Kargo Panosu'nun servis kartı; Kalıp Üretim Formu'nun satır eylemleri; `printTemplates.js` (servis formu satırı, çeviri varsayılanları, tamir etiketi adaptörü); Çeviriler ekranı; Makina Geçmişi servis satırı. **Kanıt ve test:** `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/kanit-eslemesi.json`, `tests/kalip-tamiri-0115.test.js`, `tests/kalip-tamiri-0115-cikti.test.js`, `tests/ui/kalip-tamiri-0115*.test.jsx`, `tests/ceviri-kapsam.test.js`, `tests/server-authz.test.js`, `scripts/tests/db-roundtrip.cjs`, `scripts/tests/db-clean-install.cjs`. **Belge:** `CLAUDE.md`, `specs/README.md`. Hesap, para ve izin tarafı dokunulmaz (Ö-9'un dosya listesi). |
| **Bağımlı spec'ler** | 0115 (tamir zincirini kuran spec). 0116 ve 0118 ile ortak dosyası yoktur. |
| **Ters çevrilen kriterler** | 0115 AC-65 (tamamen; `UretimFormu.jsx`'i arayan kaynak taraması ve `ServisPanosu.jsx`'i yasaklayan satır dahil), AC-40 ile AC-97'nin etiket düğmesi yarısı, AC-59 ve AC-99'un başlık metni, **AC-60'ın olumsuz başlık iddiası** (Ö-3), AC-57'nin Makina Geçmişi satır metni, **AC-96'nın sabit teslim şekli ve tarihi** (`tests/kalip-tamiri-0115-cikti.test.js:50-52`; `tests/kargo-etiketi.test.js` tamir durumunu yalnız başlık kümesinde kullanır ve **dokunulmaz**, Ö-4), `tests/ceviri-kapsam.test.js`'in 0115 satırları. 0015 AC-7 ile AC-9 **etkilenmez** (ölçüldü, ölçüm 12). |

---

## Intent

Tamir edilen kalıp müşteriye makina gibi geri gönderiliyor ama uygulama bu dönüşün hiçbir şeyini tutmuyor: kalıp kargoyla mı gidiyor yoksa müşteri fabrikadan mı alıyor, hangi kargo firmasıyla, hangi takip numarasıyla, hangi gün ve kimin eliyle. Bugün tek sevk belgesi basılı etiket ve o da yanlış yerde duruyor: atölyenin üretim formunda, yani kalıbı kutulayan kişinin önünde değil. Takım Yöneticisi üç şeyi birden istiyor. Servis formunda kalıp kutusu işaretlendiğinde yedek parça satışındakinin aynısı bir sevk bölümü açılsın; kargo etiketi düğmesi üretim formundan kalkıp Servis ve Kargo Panosu'ndaki servis kartına geçsin, çünkü kalıbın gönderildiği an orada kapanıyor; ve servis formu çıktısındaki satır "Atölyeye alınan kalıplar" yerine "Servis gören kalıplar" desin, çünkü müşteriye giden belgede fabrikanın iç dili değil işin adı yazmalı. Bu iş bittiğinde kalıbın dönüşü kayıtta yazılı olur, etiket kalıbı gönderen kişinin ekranında çıkar ve etiket "Kargo" yazdığını artık varsaymaz, kayıttan okur.

---

## Requirements

### A. Servis formunun sevk bölümü

- **R1.** Servis formunda "Kalıp atölyeye girecek" kutusu işaretliyken, kalıp listesinin altında kalıbın dönüşünü soran bir sevk bölümü çizilir. Kutu kapalıyken bölüm hiç çizilmez.
- **R1/2.** Bölüm kutunun açtığı **amber kutunun içinde**, kalıp listesinden ve boş liste hatasından sonra çizilir (`KalipAtolyeAlani.jsx:52-106` arasındaki kabın sonu). Çizim ölçütü kutudur, listenin doluluğu değil: kalıplar seçilmeden sevk bilgisi girilebilir (Ö-2).
- **R2.** Bölümde teslim şekli iki seçeneklidir: Fabrika Teslim ve Kargo.
- **R2/2.** Değer **boolean** `kalipFabrikaTeslim`'dir ve seçici yedek parçadaki `Segment`'in aynısıdır (`kip="dugme"`, değerler `true`/`false`, etiketler "🏭 Fabrika Teslim" ve "📦 Kargo"; `Segment` `tasarim.jsx`'ten gelir ve bölüm onu bugün içe almıyor). Dize alan açılmaz: aynı soruyu iki tabloda iki tipte tutmak iki etiket adaptörünü ayırırdı (B-2, ölçüm 16).
- **R3.** Teslim şekli boşken Kargo kabul edilir; bugünkü davranış (etiketin "Kargo" basması) böylece hiç değişmeden korunur.
- **R3/2.** Alan yalnız `true` iken yazılır; `false` ve yokluk ikisi de Kargo demektir ve gövdeye hiç girmez. Okuma `toBool` ile yapılmaz, koşullu eklemeyle yapılır (0114 `ihracOku` ve 0115 kalıp listesi emsali): `toBool(null)` her serviste `false` anahtarı üretip C3'ü çiğner ve güncellenmemiş istemcide bölüm kısıtlı kullanıcıya 403 verirdi (B-2).
- **R4.** Kargo seçiliyken kargo firması, takip numarası ve kargo tarihi girilebilir.
- **R5.** Kargoyu veren kişi firma çalışanları listesinden seçilir ya da serbest yazılır; yedek parça satışındaki alanın aynısıdır.
- **R5/2.** Öneri listesi için `KalipAtolyeAlani` yeni bir `calisanlar = []` prop'u alır ve `ServiceForm` kendi prop'unu geçirir; üç bağlamın üçü de ServiceForm'a `calisanlar` veriyor, yeni zincir gerekmez. Datalist kimliği `kalip-sevk-kisi-listesi` olur (yedek parçanın `yedek-parca-kargoci-listesi` kimliğiyle çakışmasın) (Ö-1, ölçüm 21).
- **R6.** Fabrika Teslim seçilince kargo firması ve takip numarası temizlenir ve çizilmez; tarih alanı teslim tarihi olarak kalır.
- **R6/2.** Tarih ve kişi alanlarının etiketi teslim şekline göre değişir ve emsalin dört metnini kullanır: "Kargo Tarihi" ile "Teslim Tarihi", "Kargoyu Veren Kişi" ile "Teslim Eden Kişi" (`YedekParcaSatisForm.jsx:357`, `:361`) (Ö-9).
- **R7.** Hiçbir alan zorunlu değildir; hepsi boş bırakılan servis bugünkü gibi kaydedilir ve hiçbir uyarı çıkmaz.
- **R7/2.** Hiçbir sevk alanı **doğrulanmaz**: tarih sırası sınanmaz (kargo tarihi servis tarihinden önce olabilir), takip numarasına uzunluk ya da biçim sınırı konmaz, boş değer hata vermez. Tek kural R6'nın temizliğidir. Yedek parça emsalinde de bu beş alanın doğrulaması yoktur (Ö-10).
- **R8.** Sevk alanları servis kaydının tamamına aittir, kalıp başına değil: bir serviste birden çok kalıp olsa da sevkiyat tektir.
- **R9.** Kutu kapatılırsa sevk alanları da kayda yazılmaz; kalıp listesiyle birlikte düşerler.
- **R10.** Bölüm servis formunun iki kurucusunda da aynıdır: müşteri detayından açılan form ve Servis ve Kargo Panosu'ndan açılan form birbirinin aynısını çizer.

### B. Kargo etiketinin yeri

- **R11.** Kargo Etiketi düğmesi Kalıp Üretim Formu'nun tamir satırından kaldırılır.
- **R12.** Servis ve Kargo Panosu'ndaki servis kartının eylem satırına "Etiket" düğmesi eklenir; teknisyen seçicisinin hemen sağında durur, "Yazdır" düğmesi varsa onun solunda.
- **R12/2.** Düğme **durum kapısı taşımaz**: üç sütunda da (Bekliyor, Yapılıyor, Tamamlandı) çizilir. "Yazdır" yalnız Tamamlandı kartında çizildiği için (`ServisPanosu.jsx:707`) "solunda" tarifi tek başına yetmez; kalıp kutulanırken kart genellikle Yapılıyor'dadır ve durum kapısı düğmeyi tam gerektiği anda gizlerdi (B-3, ölçüm 17). Metin ve başlık Makina Geçmişi'ndekiyle birebir aynıdır ("Etiket", `title="Kargo Etiketi Yazdır"`).
- **R13.** Düğme yalnız kalıp listesi dolu serviste çizilir; kalıpsız serviste hiç çizilmez. Ölçüt `kalipAtolyedeMi(sv)`'dir (K-8).
- **R14.** Düğme yalnız müşterisi çözülebilen serviste çizilir; çözülemiyorsa çizilmez. Ölçüt panonun kendi `custMap[Number(sv.customerId)]` haritasıdır; kart müşterisi çözülmeyen serviste de çizilir ve "(müşteri yok)" yazar (`ServisPanosu.jsx:678`), bu yüzden kapı boşa çalışmaz (K-8).
- **R15.** Makina Geçmişi'ndeki servis satırının etiket düğmesi aynen kalır (`MachineTimeline.jsx:146-148`); orada R14 kapısı **yoktur**, çünkü müşteri her zaman çözülür (K-8).
- **R16.** Düğme panonun üç bağlamında da çalışır: sekme, kiosk ve ayrı pencere.

### C. Etiketin içeriği

- **R17.** Etiketin TESLİM ŞEKLİ hücresi kayıttaki teslim şeklini basar; kayıtta değer yoksa "Kargo" basar.
- **R18.** Etiketin TARİH hücresi kargo tarihi doluysa onu, boşsa servis tarihini basar.
- **R18/2.** Yedek **ham değerde** seçilir, biçimleme sonra gelir: `fmtTR(sevkTarihi || servis.date)`. Biçimlenmiş değerle yazılan yedek çalışmaz, çünkü `fmtTR("")` `"—"` döndürür ve o da truthy'dir; bozuk değer de olduğu gibi geri gelir (`utils.js:8-12`) (Ö-6, ölçüm 25).
- **R19.** Etiket şablonu, altı başlığı ve alt bandındaki iki hücre değişmez; kargo firması ve takip numarası etikete basılmaz.
- **R19/2.** `tamirEtiketVerisi`'nin `opts` nesnesi **yalnız** `teslimSekli` ve `tarih` anahtarlarını taşır; kargo firması ve takip numarası adaptöre de girmez. Kardeş adaptörler şablon basmasa da bu iki anahtarı `opts`'a koyuyor (`printTemplates.js:775-776`); tutarlılık için benzetilirse 0115 AC-96'nın `toEqual` iddiası kırılır (Ö-5).
- **R20.** Alıcı bugünkü gibi müşterinin kayıtlı adresidir; içerik bugünkü gibi servisin bütün kalıp listesidir.

### D. Listenin adı

- **R21.** Servis Formu çıktısındaki satır başlığı Türkçe "SERVİS GÖREN KALIPLAR" olur.
- **R22.** Aynı başlığın İngilizcesi "SERVICED MOLDS" olur.
- **R23.** Çeviriler ekranında bu anahtarın görünen adı da yeni adla eşleşir.
- **R23/2.** Çeviri **anahtarının adı değişmez** (`atolyeKaliplariLabel`), yalnız varsayılan değerleri değişir. Kullanıcının düzenlemesi `appSettings.translations.servis` içinde bu anahtarla saklanıyor ve birleştirme sırası `DEFAULT < flat < ns` olduğu için anahtar yeniden adlandırılırsa eski değer hiç okunmaz; göç de yoktur (R28). `kalipTamiri.js`'teki sabitin **adı** `SERVIS_KALIPLARI_ETIKETI` olur (kalıcı değil: tek tanım ve tek içe aktarma), `gecmis-atolye-kaliplari` testid'i bugünkü adıyla kalır (kullanıcıya görünmez, kabul edilen adlandırma borcu) (B-5, ölçüm 19).
- **R24.** Makina Geçmişi'ndeki servis satırının liste başlığı "Servis gören kalıplar" olur.
- **R24/2.** Başlığın iki ayrı okuma yolu vardır ve birleştirilmez: Makina Geçmişi `kalipTamiri.js`'teki sabitten okur, **çıktı çeviri anahtarından** okur (kullanıcı onu Ayarlar > Çeviriler'de değiştirebilir). Dört dize (TR varsayılanı, EN varsayılanı, Çeviriler ekranının görünen adı, kod sabiti) aynı turda güncellenir; biçimleri bugünkü gibi farklı kalır (tümü büyük, cümle, başlık) (B-4, C10, ölçüm 18).
- **R25.** Servis formundaki kutunun etiketi ("Kalıp atölyeye girecek") ve pano rozeti ("KALIP ATÖLYEDE") değişmez; biri eylemi, öteki durumu anlatır.

### E. Veri

- **R26.** Kalıbın dönüşüne ait beş değer servis kaydında saklanır: teslim şekli, kargo firması, takip numarası, kargo tarihi, kargoyu veren kişi.
- **R26/2.** Adları: **`kalipFabrikaTeslim`** (INTEGER boolean), **`kalipKargoFirma`**, **`kalipKargoTakipNo`**, **`kalipKargoTarih`**, **`kalipKargoSorumlusu`** (dördü TEXT). Form anahtarları da aynı adları taşır. Emsalin tarih anahtarı `kargoTarih`'tir, `kargoTarihi` değil; iki yazım karışırsa okuma boş döner (B-1, K-4, ölçüm 15).
- **R27.** Boş kalan sevk değeri kaydın gövdesine yazılmaz.
- **R27/2.** Beş sütun okuma eşlemesinde `...rest`'ten **ayıklanır** ve yalnız dolu değer geri yazılır; aksi hâlde servis okuması her kayda beş `null` anahtar koyar (`db.cjs:1438-1443` düz metin sütunlarını kendiliğinden taşır). Boolean alan için ayıklama `toBool` değil koşullu eklemedir (R3/2) (ölçüm 10).
- **R28.** Göç yok; bugünkü kayıtlar hiç dokunulmadan aynen okunur ve aynen yazılır.

### F. Kaynak, kanıt ve belge (QA turu, 2026-10-29)

- **R29.** Sevk değerlerinin **tek yazıcısı** `kalipTamiri.js`'teki `tamirYaz`'ın üçüncü adımıdır (`tamirYaz(kayit, liste, sevk)`); iki kurucu da bugünkü `tamirYaz(recTevkifat, tamirListesiKur(...))` çağrısını bu üçüncü argümanla genişletir. Yeni bir dosya açılmaz: 0115'in yazıcı taraması kayda yazan dosyaların tam listesini sabitliyor (`tests/kalip-tamiri-0115.test.js:198`). Bölümün `data-testid`'leri `kalip-sevk`, `kalip-sevk-firma`, `kalip-sevk-takip`, `kalip-sevk-tarih`, `kalip-sevk-kisi`; teslim şekli seçicisinin erişilebilir adı "Kalıp Teslim Şekli" (B-1).
- **R30.** Düğme üretim formundan kalkınca üç parça birlikte silinir: `tamirEtiketYazdir` içe aktarması (`UretimFormu.jsx:16`), `tamirEtiketi` yardımcısı (`:320-324`) ve düğme (`:490-495`). `factory` prop'u yerinde kalır, çıktı başlığında kullanılıyor (`:173`). Kural taramadır, çünkü `no-unused-vars` `src` tarafında uyarı seviyesindedir (Ö-7, ölçüm 26).
- **R31.** C4'ün bekçisi yazılır: 0115'in sunucu taraması (`tests/kalip-tamiri-0115.test.js:235`) beş yeni alan adıyla genişletilir ve `serverAuth.cjs` onları hiç anmaz; `ALAN_IZINLERI.services` yalnız `durum`u izlemeye devam eder. AC-36'nın ölçüm yolu `tests/server-authz.test.js`'in 0117 bloğudur (yalnız sevk alanı değişen düzenleme `cust_service_edit` ile geçer); `server-security.cjs`'e blok eklenmez, yeni izin yok (Ö-8, K-10).
- **R32.** Görsel kanıt aracının kaldırılan başlığı hedefleyen adımı düzeltilir: `scripts/evidence/0009-sayfa.jsx:1453` (`servis-formu-yazdir-0115`) `kaydir:SERVİS GÖREN KALIPLAR` olur. Bilinçli değişen ekranlar: `KalipAtolyeAlani.jsx`'in kutu açık dört kaydı (`servis-formu-0115-acik`, `-kayitli`, `-bos-hata`, `-ad-hata`), üç üretim formu ekranı (`uretim-formu-0115-tamir`, `-bekleyen`, `-kopuk`), servis formu çıktısı ve pano kartı. **Karar 47 ile ölçüldü:** üretim formu ekranlarından yalnız `uretim-formu-0115-tamir` değişti, `-bekleyen` ve `-kopuk` 0 piksel (`ayni`); `musteri-detay-0115` de değişti. `ServisPanosu.jsx` eşlemede kayıt istemez, `tasarim.jsx` kullanmıyor (ölçüldü) (B-6, ölçüm 20, K-11).
- **R33.** Yeni sevk metinleri emsaldeki gibi **satır içi** yazılır (yedek parça formu "Kargo firması", "Takip no" literalleriyle çalışıyor); yalnız bölümün başlığı `kalipTamiri.js`'in `KAYIT_BOLUMU` emsaline eklenir. 0115'in AC-66 taraması yalnız kendi sabitlerinin düz metnini yasaklar, bu yüzden yeni literaller onu kırmaz (K-6).

---

## Zorunlu kısıtlar

- **C1.** **Ad tuzağı:** servis kaydında onarım yeri alanının değerlerinden biri zaten "Fabrika Teslim"dir ve makinanın nerede onarıldığını söyler. Kalıbın dönüşü ayrı bir kavramdır ve alanları ayrı adla açılır (kalıp öneki taşır), bugünkü onarım yeri alanına hiçbir şey yazılmaz ve ondan hiçbir şey okunmaz. Gerekçe 0023 R10'un "mesai" dersiyle aynı sınıftır; kaynak taraması iki kavramın karışmadığını sabitler.
- **C2.** Dört nokta kuralı: beş sütun şemaya, göç listesine, INSERT listesine ve okuma eşlemesine birlikte yazılır ve `db-roundtrip` testine eklenir.
- **C3.** Okuma ayıklamalıdır: boş sevk değeri gövdeye hiç yazılmaz (0115'in kalıp listesiyle aynı desen). Gerekçe ölçülmüştür: 883 canlı servisin tamamı bu alanları boş taşıyacak ve beş boş anahtar her serviste yer tutardı.
- **C4.** Yeni veri bölümü, yeni eylem izni, yeni sunucu kuralı ve yeni birleştirme kuralı yok. Sunucunun alan denetimi yalnız servis durumunu izliyor; yeni alanlar bölüm düzeyinde güvenilir (ölçüldü).
- **C5.** Etiket yazdırma salt okunur bir iştir ve bugünkü iki girişinde olduğu gibi izne bağlanmaz.
- **C6.** 0115'in iki temel kısıtı aynen durur: kalıbın kendi kaydına, kalıp durumuna ve müşteri formuna hiçbir şey yazılmaz; üretim formunun satır anahtarı değişmez ve tamir satırı kalıp durumu haritasına girmez.
- **C7.** Panoya yeni kart türü eklenmez. Kalıp tamiri servis kartında yaşar; kargo kartı açılmaz.
- **C8.** Kargo Etiketi tek şablondur (0115 C10). Altıncı durumun verisi değişir, şablonu değişmez.
- **C9.** Para yok: bu işte hiçbir tutar, para birimi ve KDV okunmaz ya da yazılmaz.
- **C10.** Liste başlığının **iki okuma yolu vardır ve birleştirilmez** (R24/2): Makina Geçmişi `kalipTamiri.js`'in sabitinden, çıktı çeviri anahtarından okur. Çıktıyı koda sabitlemek Ayarlar > Çeviriler'deki düzenlemeyi işlevsiz bırakır, EN çıktıyı bozar ve `ceviri-kapsam`'ın iki yönlü kapsam kuralını kırar. Güvence tek sabit değil, dört dizenin aynı turda güncellendiğini ölçen iki testtir.
- **C11.** Çeviri anahtarının kimliği kalıcıdır: `atolyeKaliplariLabel` adı değişmez, yalnız değeri değişir (R23/2). Anahtar adını değiştirmek kullanıcının kayıtlı çevirisini sessizce düşürür ve bu bir göç işidir; bu spec'te göç yok.
- **C12.** Ad tuzağı ekrana da uzanır (C1'in devamı): servis kartı onarım yerini düz metin basıyor ve değerlerinden biri "Fabrika Teslim"dir (`ServisPanosu.jsx:658`, `constants.js:200`). Kalıbın teslim şekli aynı kartta basılmaz; iki "Fabrika Teslim" ibaresi yan yana durmaz (Ö-11, X11).

---

## Kapsam dışı

- **X1.** Kalıbın kargo durumu (Hazırlanıyor, Kargoya Verildi, Teslim Edildi) ve panoda ayrı kargo kartı — *neden:* servis zaten kendi kartıyla panoda ve üç sütunu kullanıyor; ikinci bir durum makinesi aynı kaydı iki kez izler.
- **X2.** Farklı teslimat adresi — *neden:* Takım Yöneticisi kapsamı dar tuttu; kalıp bugüne kadar hep müşterinin kayıtlı adresine döndü, altı alan daha açmak ihtiyaç görülmeden maliyet olur.
- **X3.** Kargo ücreti, navlun ve bedel — *neden:* servis kaydının ücret alanları işçilik ve parçayı anlatıyor; kargo bedeli ayrı bir kavram ve istenmedi.
- **X4.** Kalıp başına ayrı sevk bilgisi — *neden:* R8; bir servisin kalıpları tek kolide gidiyor.
- **X5.** Kargo firmasının ve takip numarasının etikete basılması — *neden:* şablonun alt bandında iki hücre var ve altı başlık test sabitiyle kilitli (0115 ölçüm 14); üçüncü hücre bütün etiket düzenini değiştirir.
- **X6.** Kalıbın tamir geçmişi ve müşteri satırında tamir pili — *neden:* ikisi de tamirin kalıbın kendi kaydına bağlanmasını gerektiriyor; 0115 X1 ve X2 olarak açık bulguda duruyor.
- **X7.** "Kalıp atölyeye girecek" kutusunun ve pano rozetinin adının değişmesi — *neden:* R25; ikisi liste başlığı değil, biri eylem biri durum.
- **X8.** Yedek parça satışının kargo alanlarına dokunulması — *neden:* orada çalışan bir bölüm var; bu iş onu örnek alır, değiştirmez.
- **X9.** Kargo tarihi girilince servisin durumunun kendiliğinden değişmesi — *neden:* durum sürükle bırakla yönetiliyor ve 0115 otomatik yazma yerine bilinçli olarak tek tıkla teklifi seçti.
- **X10.** Arşiv kartına eylem satırı açılması — *neden:* arşiv kartı bugün yalnız "Panoya Geri Al" taşıyor ve eylem satırı hiç çizilmiyor (`ServisPanosu.jsx:686-693`); arşivlenmiş servisin etiketini yeniden basmak R15'in Makina Geçmişi girişinden yapılır (B-3).
- **X11.** Kalıbın teslim şeklinin pano kartında gösterilmesi — *neden:* C12; kart onarım yerini zaten basıyor ve değerlerinden biri "Fabrika Teslim", iki ibare yan yana aynı karışıklığı üretir (Ö-11).

---

## Ölçümler (2026-10-27 yedeği, bugünkü kod)

1. `services` tablosunda bugün hiçbir kargo alanı yok (şema okundu); beşi de yeni sütun.
2. 883 canlı servisin **sıfırında** kalıp listesi var. Spec 0115 yeni yayınlandı; yani sevk alanları boş doğacak, göç gerekmiyor ve geriye dönük hiçbir kayıt değişmiyor.
3. Panoda yalnız **2 servis** var (durumu dolu olan): biri Yapılıyor, biri Tamamlandı. Yani yeni düğme küçük bir yüzeye biniyor.
4. Etiket düğmesi bugün iki yerde: `stock/UretimFormu.jsx:491` (kaldırılacak) ve `customers/detail/MachineTimeline.jsx:146-148` (kalacak; kapı `:146`, düğme `:147`). İkincisinin metni zaten "Etiket", başlığı "Kargo Etiketi Yazdır"; panodaki düğme onunla birebir aynı olur (K-1 ile düzeltildi).
5. Etiket adaptörü teslim şeklini **sabit** "Kargo" yazıyor ve tarihi servis tarihinden alıyor (`printTemplates.js:781-787`). R17 ve R18 bu iki sabiti kayda bağlar, varsayılanları bugünküyle aynı tutar.
6. Etiketin alt bandında iki hücre var (TESLİM ŞEKLİ, TARİH); kargo firması ve takip numarası şablonda hiç basılmıyor.
7. Pano üç bağlamın üçünde de müşteri listesini ve firma bilgisini alıyor: sekme (`App.jsx:1738`), kiosk (`App.jsx:1424`), ayrı pencere (`ServisPencere.jsx:86`). Yeni prop gerekmiyor.
8. Ayrı pencerenin köprüsü yazdırmayı taşıyor: `electron/preload-servis.cjs` renderer'a `appPrint`'i açıyor (kanal pencereden bağımsız), `ServisPencere.jsx:86` da `customers` ile `factory`'yi geçiriyor. Düğme orada da çalışır (K-5 ile adı yazıldı).
9. Sunucunun alan denetimi yalnız `services.durum`, `partSales.kargoDurum` ve `yedekParcaSatislar.kargoDurum` alanlarını izliyor (`serverAuth.cjs:569-573`); yeni beş alan bölüm düzeyinde güvenilir ve sunucu kuralı değişmiyor.
10. Servis okuması düz metin sütunlarını kendiliğinden taşıyor (`db.cjs:1438-1443`), ama C3 gereği ayıklama yazılır.
11. Yedek parçada aynı alanlar gerçekten kullanılıyor: 992 canlı satışın 142'si fabrika teslim, 30'unda kargo firması, **273'ünde** kargoyu veren kişi dolu. Yani kopyalanan desen ölü değil.
12. **0015 etkilenmiyor:** servis formunun onay kutusu ve açılır liste sayısı (`{kutu: 3, liste: 6}`) kapalı kutuyla ölçülüyor ve sevk bölümü yalnız kutu açıkken çiziliyor; ayrıca bölüm yeni onay kutusu eklemiyor (farklı adres X2 ile dışarıda). Etiket toplayan 0015 AC-9 de kapalı formu okuyor.
13. Çeviri anahtarı dört yerde yazılı: TR varsayılanı (`printTemplates.js:88`), EN varsayılanı (`:136`), Çeviriler ekranının grup listesi (`SettingsTranslations.jsx:108`) ve kod sabiti (`kalipTamiri.js:32`). İddiası ise **iki test dosyasında** ayrı ayrı sabitlenmiş: `tests/ceviri-kapsam.test.js:46-48` ve `tests/kalip-tamiri-0115-cikti.test.js:28-30`. Ad değişiminde dört yazım yeri ve iki test birlikte güncellenir (K-2 ile düzeltildi).
14. Liste başlığı sabitinin **tek okuyucusu** var ve takma adla geliyor: `MachineTimeline.jsx:16` (`ATOLYE_KALIPLARI_ETIKETI as KAYIT_ETIKETI`); çıktı çeviri anahtarından okuyor. Sabitin yeniden adlandırılması (R23/2) o satırı da değiştirir (K-3 ile düzeltildi; eski metin "iki yerden okunuyor" diyordu).

### QA turu ölçümleri (2026-10-29)

15. Beş alanın yazma ve okuma yolu yedi yere dokunuyor: `db.cjs` şeması (`:147-160`), göç listesi (`:441` emsali), INSERT (`:703-733`), okuma eşlemesi (`:1438-1443`), tek yazıcı (`kalipTamiri.js` `tamirYaz`), form anahtarları (`KalipAtolyeAlani.jsx`) ve etiket adaptörü (`printTemplates.js:781`). Spec hiçbirinin adını vermiyordu; C1 ise önek zorunluluğu getiriyor (B-1, R26/2, R29).
16. Kopyalanan emsal **boolean**'dır: `YedekParcaSatisForm.jsx:347-349` `Segment`'i `value={fabrikaTeslim}` ile `true`/`false` taşıyor, `kalipEtiketVerisi` `!!s.fabrikaTeslim` okuyor (`printTemplates.js:771`). Servis okuması `...rest` ile geldiği için boolean sütun `toBool` ile okunursa `toBool(null)` **her serviste** `false` anahtarı üretir (B-2, R2/2, R3/2).
17. Pano kartının eylem satırı iki kapılıdır: satır yalnız `!arsiv` çizilir (`ServisPanosu.jsx:686-712`), "Yazdır" yalnız `tamamlandi &&` ile (`:707`), "Kaldır" `tamamlandi && izin` ile (`:711`). Yani Bekliyor ve Yapılıyor kartlarında "Yazdır" yok ve "solunda" tarifi tanımsız; arşiv kartında eylem satırı hiç yok (B-3, R12/2, X10).
18. Liste başlığı üç ayrı mekanizmadan geliyor ve bugün üç ayrı biçimde yazılı: çıktı `L.atolyeKaliplariLabel` (`printTemplates.js:324`, varsayılanlar `:88` ve `:136`) "ATÖLYEYE ALINAN KALIPLAR"; Makina Geçmişi `ATOLYE_KALIPLARI_ETIKETI` (`kalipTamiri.js:32`) "Atölyeye alınan kalıplar"; Çeviriler ekranının görünen adı (`SettingsTranslations.jsx:108`) "Atölyeye Alınan Kalıplar". **Sonuç:** üçünü tek sabite bağlamak çıktının çevrilebilirliğini kırar (B-4, C10, R24/2).
19. Çeviri anahtarı kullanıcı verisidir: düzenlemeler `appSettings.translations.servis` içinde `atolyeKaliplariLabel` anahtarıyla saklanıyor ve `buildPrintHtml`'in birleştirme sırası `DEFAULT < flat < ns`. Anahtar yeniden adlandırılırsa eski değer hiç okunmaz ve göç yoktur (B-5, C11, R23/2).
20. Kanıt aracının bir adımı kaldırılan başlığı hedefliyor: `scripts/evidence/0009-sayfa.jsx:1453` (`servis-formu-yazdir-0115`) `kaydir:ATÖLYEYE ALINAN KALIPLAR`. Araç bulunamayan adımı **yalnız uyarıyla** geçer (CLAUDE.md'de yazılı bilinen borç; 0089'da `giderler-0068-parti-sil`, 0116'da iki adım aynı sınıfa düştü). Eşlemede `KalipAtolyeAlani.jsx`'in beş kaydı `ayni` durumda, `UretimFormu.jsx`'in üç kaydı var, `ServisPanosu.jsx`'in kaydı **yok** çünkü `tasarim.jsx` kullanmıyor (B-6, R32).
21. `calisanlar` kalıp bölümüne hiç gelmiyor: `ServiceForm.jsx:478` bölüme yalnız `form, setForm, musteri, parts, partTypeDefs` geçiyor; liste ServiceForm'da var (`:18`, `:22`). Yedek parçada öneri `calisanlar.map(c => c.ad)` (`YedekParcaSatisForm.jsx:22`) ve datalist kimliği `yedek-parca-kargoci-listesi` (`:364`) (Ö-1, R5/2).
22. Kutu açıkken çizilen amber kap `KalipAtolyeAlani.jsx:52-106`; içinde üç kaynak bölümü (`:54-84`), liste (`:85-103`) ve boş liste hatası (`:104`) var. Bölümün bu kabın içinde mi dışında mı durduğu ve liste boşken çizilip çizilmediği yazılı değildi (Ö-2, R1/2).
23. 0115 AC-60 (`tests/kalip-tamiri-0115-cikti.test.js:23-25`) `not.toContain("ATÖLYEYE ALINAN KALIPLAR")` diyor; başlık yeni ada dönünce bu iddia her veride doğru olur ve "kalıpsız serviste satır basılmaz" kuralını artık korumaz (Ö-3).
24. Tamir etiketinin sabit teslim şekli ve tarihi **`tests/kalip-tamiri-0115-cikti.test.js:50-52`**'de (0115 AC-96) `expect(v.opts).toEqual({ teslimSekli: "Kargo", tarih: "12/10/2026" })` ile kilitli; `tests/kargo-etiketi.test.js` tamir durumunu yalnız başlık kümesi testinde kullanıyor (`:25`, `:30`) ve teslim şekline hiç bakmıyor. `toEqual` olduğu için `opts`'a üçüncü bir anahtar eklemek testi kırar (Ö-4, Ö-5, R19/2).
25. `fmtTR("")` → `"—"`, `fmtTR("abc")` → `"abc"` (`utils.js:8-12`). Yani biçimlenmiş değerle yazılan yedek (`fmtTR(a) || fmtTR(b)`) hiçbir zaman devreye girmez (Ö-6, R18/2).
26. Düğme kalkınca üç parça ölü kalır: `UretimFormu.jsx:16` içe aktarma, `:320-324` `tamirEtiketi`, `:490-495` düğme; `factory` prop'u `:173`'te çıktı başlığı için kullanıldığı için kalır. `eslint.config.mjs:29` `no-unused-vars`'ı `src` için **warn** veriyor, yani AC-37'nin "lint hata sayısı sıfır" ölçütü artığı geçirir (Ö-7, R30).
27. Sunucu tarafı iki yerden ölçüldü: `ALAN_IZINLERI.services` yalnız `durum` izliyor (`serverAuth.cjs:569-573`) ve 0115'in taraması `serverAuth.cjs`'in `atolyeKaliplari|kalipIsi|servis_tamir` içermediğini sabitliyor (`tests/kalip-tamiri-0115.test.js:235`). Beş yeni alan için aynı bekçi yoktu (Ö-8, R31).
28. Yedek parçada iki alanın etiketi teslim şekline göre değişiyor: "Kargo Tarihi" / "Teslim Tarihi" (`YedekParcaSatisForm.jsx:357`) ve "Kargoyu Veren Kişi" / "Teslim Eden Kişi" (`:361`). Emsalin bu yarısı spec'te yazılı değildi (Ö-9, R6/2).
29. Servis kartı onarım yerini düz metin basıyor (`ServisPanosu.jsx:658`) ve `REPAIR_PLACES`'in üçüncü değeri **"Fabrika Teslim"** (`constants.js:200`). Kalıbın sevk şekli aynı iki kelimeyi taşıyacak (Ö-11, C12, X11).
30. **Yeniden doğrulanamayan ölçümler:** 2, 3 ve 11 canlı veriye bakıyor ve QA turunda 2026-10-27 yedeği oturumda olmadığı için satır satır doğrulanamadı; koda bakan on bir ölçümün (1, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14) hepsi doğrulandı ve sapmaları yukarıda düzeltildi.

---

## Kararlar (Takım Yöneticisi, 2026-10-29)

1. **Sevk bölümü yedek parçadaki bölümün aynısıdır, farklı adres kutusu hariç** (analistin önerisi). Gerekçe: aynı iş için ikinci bir düzen öğrenilmez; farklı adres bugüne kadar kalıpta hiç gerekmedi.
2. **Alanlar servis başına tektir, kalıp başına değil** (analistin önerisi). Bir servisin kalıpları tek kolide gider.
3. **Alanlar kalıp öneki taşır** (analistin önerisi, Karar 1'in ardından ölçülen tuzak). Servis kaydında zaten "Fabrika Teslim" değerli bir onarım yeri alanı var; aynı kayda öneksiz bir "fabrika teslim" işareti koymak iki kavramı bir ay içinde karıştırır.
4. **Teslim şekli boşken Kargo sayılır** (analistin önerisi). Bugünkü etiket zaten "Kargo" basıyor; varsayılanı böyle seçmek hem eski kayıtları hem boş bırakılan yeni kayıtları değiştirmeden bırakır.
5. **Etiket düğmesi üretim formundan panoya taşınır** (Takım Yöneticisi'nin isteği). Analistin notu: 0115'te düğme üretim formuna konmuştu çünkü kalıp atölyeden çıkarken basılacağı varsayılmıştı; kullanımda kalıbı kutulayan ve gönderen kişi panoda çalışıyor. Makina Geçmişi'ndeki ikinci giriş (ofis) kalır.
6. **Etiket panoda yalnız kalıp taşıyan serviste çizilir** (analistin önerisi). Kalıpsız servisin etiketi boş içerikle basılırdı; aynı kural Makina Geçmişi'nde 0115 triyajında konmuştu.
7. **Çıktıdaki ad "SERVİS GÖREN KALIPLAR" olur** (Takım Yöneticisi'nin isteği). Analistin önerisi: aynı ad Makina Geçmişi satırında da kullanılır ve tek sabitten okunur, yoksa aynı liste iki ekranda iki adla anılır.
8. **Kutunun etiketi ve pano rozeti değişmez** (analistin önerisi). "Kalıp atölyeye girecek" bir eylemi, "KALIP ATÖLYEDE" bir durumu söylüyor; ikisi de liste başlığı değil.
9. **Kargo durumu ve kargo kartı açılmaz** (analistin önerisi). Servis panoda kendi kartıyla zaten izleniyor; ikinci durum makinesi aynı kaydı iki kez izlerdi.

### QA turunda verilen kararlar (2026-10-29)

Analist yirmi dokuz boşluk çıkardı (6 bloklayıcı, 11 önemli, 12 küçük); Takım Yöneticisi hepsini analistin önerdiği gibi onayladı.

10. **Beş alan, yazıcı ve testid'ler adlandırıldı** (R26/2, R29, AC-38). Gerekçe: 0115'in B-1'iyle aynı sınıf; ad verilmeyen beş alan iki kurucuda, bir okuma ayıklamasında ve bir adaptörde farklı yazılır (ölçüm 15). Emsalin `kargoTarih` yazımı da `kargoTarihi` sanılabilecek bir tuzaktı.
11. **Teslim şekli boolean `kalipFabrikaTeslim`'dir, yalnız `true` yazılır** (R2/2, R3/2, AC-39). Gerekçe: kopyalanan emsal boolean ve iki etiket adaptörü onu öyle okuyor; `toBool` ile yazılan `false` hem C3'ü çiğner hem güncellenmemiş istemcide 403 üretir (ölçüm 16).
12. **Panodaki düğme durum kapısı taşımaz, arşiv kartına eylem satırı açılmaz** (R12/2, X10, AC-40, AC-41). Gerekçe: "Yazdır" yalnız Tamamlandı kartında var, yani "solunda" tarifi tek başına yetmiyor; kalıp kutulanırken kart genellikle Yapılıyor'da (ölçüm 17). Arşivlenmiş servisin etiketi Makina Geçmişi'nden basılır.
13. **Liste başlığının iki okuma yolu birleştirilmez** (C10, R24/2, AC-42). Gerekçe: çıktı başlığı kullanıcının Ayarlar > Çeviriler'de düzenleyebildiği bir değerdir; koda sabitlemek o düzenlemeyi işlevsiz bırakır, EN çıktıyı bozar ve kapsam testinin iki yönlü kuralını kırar (ölçüm 18). Güvence tek sabit değil, dört dizenin birlikte güncellendiğini ölçen iki testtir.
14. **Çeviri anahtarının adı değişmez, yalnız değeri değişir** (C11, R23/2, AC-43). Gerekçe: anahtar kullanıcı verisinin kimliğidir; değiştirmek başlığı kendi diliyle düzeltmiş kullanıcının çevirisini sessizce düşürür ve bu bir göç işidir (ölçüm 19). Kod sabitinin adı değişir, çünkü o kalıcı değil.
15. **Kanıt adımı düzeltilir, değişen ekranlar adıyla sayılır** (R32, AC-44). Gerekçe: adımın hedefi kaldırılan başlık; araç bulunamayan adımı yalnız uyarıyla geçtiği için "0 piksel" yanlış ekranın kanıtı olur (ölçüm 20). Aynı sınıf bulgu 0089 ve 0116'da da çıktı.
16. **`calisanlar` bölüme prop olarak geçer, datalist kimliği ayrı olur** (R5/2, AC-45). Gerekçe: prop yazılmazsa öneri listesi sessizce boş kalır ve R5'in yarısı düşer; aynı DOM kimliği kullanılırsa tarayıcı ilk datalist'i okur (ölçüm 21).
17. **Bölüm amber kutunun içinde, listenin altında çizilir ve ölçüt kutudur** (R1/2, AC-46). Gerekçe: kutunun dışına konursa kutu kapatıldığında ekranda kalır ve R9 ile çelişir; kullanıcı kalıpları seçmeden sevk bilgisini girebilir (ölçüm 22).
18. **0115 AC-60 yeni başlıkla güncellenir** (AC-47). Gerekçe: adı değişen metnin olumsuz iddiası sessizce bekçi olmaktan çıkar (ölçüm 23); 0116'da da bu sınıf bulgu çıktı.
19. **Ters çevrilenler satırı doğru dosyayı gösterir** (başlık tablosu, AC-48). Gerekçe: sabit teslim şekli iddiası `kalip-tamiri-0115-cikti.test.js`'te (AC-96); yanlış dosya adı geliştiriciyi dokunulmaması gereken `kargo-etiketi.test.js`'i düzenlemeye götürürdü (ölçüm 24).
20. **`tamirEtiketVerisi`'nin `opts`'u iki anahtarla kalır** (R19/2, AC-49). Gerekçe: AC-96 nesnenin tamamını `toEqual` ile kilitliyor; kardeş adaptörlere benzetip kargo anahtarlarını eklemek testi kırar ve X5'in yasağını adaptör düzeyinde belirsiz bırakır (ölçüm 24).
21. **Tarih yedeği ham değerde seçilir, biçimleme sonra gelir** (R18/2, AC-50). Gerekçe: `fmtTR("")` `"—"` döndürüyor ve o da truthy; biçimlenmiş değerle yazılan yedek hiç devreye girmez (ölçüm 25).
22. **Üretim formundaki üç ölü parça taramayla yasaklanır** (R30, AC-51). Gerekçe: `no-unused-vars` `src` tarafında uyarı seviyesinde, yani lint hata sayısı artığı geçirir (ölçüm 26); 0116'nın Ö-1'iyle aynı sınıf.
23. **C4'ün bekçisi yazılır** (R31, AC-52). Gerekçe: "yeni sunucu kuralı yok" iddiasının taraması yoksa bir sonraki iş alanı yanlışlıkla `ALAN_IZINLERI`'ne ekler (ölçüm 27). AC-36'nın ölçüm yolu da böylece adlandı.
24. **Tarih ve kişi alanlarının etiketi teslim şekline göre değişir** (R6/2, AC-53). Gerekçe: emsal "aynısı" denince etiket değişimi de emsalin parçasıdır; yazılmazsa Fabrika Teslim kipinde "Kargo Tarihi" yazan bir alan kalır (ölçüm 28).
25. **Sevk alanları doğrulanmaz** (R7/2, AC-54). Gerekçe: tanımsız hata durumu sınıfı; biri "kargo tarihi servis tarihinden önce olamaz" kuralını kendi başına ekleyip R7'yi çiğneyebilir. Emsalde de bu beş alanın doğrulaması yok.
26. **Kart kalıbın teslim şeklini göstermez** (C12, X11, AC-55). Gerekçe: C1 veriyi ayırıyor ama kart onarım yerini zaten basıyor ve değerlerinden biri "Fabrika Teslim"; iki ibare yan yana aynı karışıklığı üretir (ölçüm 29).
27. **Ölçüm 4'ün atfı `:146-148` olur.** Gerekçe: kapı `:146`, düğme `:147`; blok kapanışıyla birlikte aralık doğru yazılır.
28. **Ölçüm 13 iki test dosyasını da sayar.** Gerekçe: anahtarın iddiası `ceviri-kapsam.test.js` ve `kalip-tamiri-0115-cikti.test.js`'te ayrı ayrı sabitlenmiş; biri güncellenip öteki atlanırsa tur yarım kalır.
29. **Ölçüm 14 "tek okuyucu, takma adla" olur.** Gerekçe: sabitin tek okuyucusu var (`MachineTimeline.jsx:16`, `as KAYIT_ETIKETI`) ve yeniden adlandırma o satırı da değiştirir.
30. **Emsalin `kargoTarih` yazımı ölçüm olarak kaydedilir.** Gerekçe: spec'in "kargo tarihi" ifadesi `kargoTarihi` sanılabilir; iki yazım karışırsa okuma boş döner.
31. **Ölçüm 8 köprünün adını yazar** (`preload-servis.cjs`, `appPrint`). Gerekçe: "köprü yazdırmayı taşıyor" iddiası adı olmadan ölçülemez görünür.
32. **Yeni sevk metinleri satır içi yazılır, yalnız bölüm başlığı sabite girer** (R33). Gerekçe: emsal satır içi literal kullanıyor ve 0115'in AC-66 taraması yalnız kendi sabitlerini yasaklıyor; her etiketi sabite taşımak gereksiz dolaylılık olur.
33. **`Segment`'in içe aktarılacağı ölçüme yazıldı** (R2/2). Gerekçe: bölüm bugün `Segment`'i almıyor; `tasarim.jsx`'ten gelir ve sözlüğün "form içi segment `kip=\"dugme\"`" kuralına uyar.
34. **R13 ile R14'ün ölçütleri fonksiyon adıyla yazıldı.** Gerekçe: Makina Geçmişi'nde R14 kapısı yok (müşteri her zaman çözülür) ve bu fark yazılmazsa iki giriş birbirine benzetilir.
35. **AC-13'ün ölçüm yolu kıyas testidir** (AC-56). Gerekçe: `ui/kalip-tamiri-0115-kiyas.test.jsx:78` anahtar yokluğunu zaten ölçüyor; beş yeni alanla genişletmek yeni bir altın dosya gerektirmez.
36. **Sunucu testi `server-authz.test.js`'tir, `server-security.cjs` genişletilmez** (R31, DoD). Gerekçe: yeni izin ve yeni sekme eşlemesi yok; uçtan uca senaryo eklemek maliyet olur.
37. **Kanıt maddesi değişen ekranları adıyla sayar** (R32, DoD). Gerekçe: liste yazılmazsa `degisti` kayıtları eksik yazılır ve kapanışta `ayni`ye çevirme adımı kaçar.
38. **0117'nin kapanış bekçisi yazılır** (AC-57, DoD). Gerekçe: son on iki spec'te bu bekçi vardı ve taşımanın unutulmadığının tek kanıtı o.

### Plan turunda verilen kararlar (2026-10-29)

Takım Yöneticisi uygulama planındaki on iki önerinin hepsini onayladı (`specs/done/0117-uygulama-plani.md`).

39. **R18/2 ile AC-50'nin çelişkisi: sevk tarihi yalnız takvimde geçerli `YYYY-AA-GG` ise kullanılır, değilse servis tarihi** (`kalipTamiri.sevkTarihi`). Gerekçe: `"abc"` truthy olduğu için `fmtTR(sevk || date)` bozuk değeri basardı; bu bir okuma kuralıdır, kayıt doğrulanmaz (R7/2 aynen).
40. **Sevk değerlerini saf `tamirSevkKur(form)` kurar, `tamirYaz` beş anahtarı her çağrıda siler ve yalnız liste doluyken yazar.** Gerekçe: kurucular formu yayarak kayıt kurduğu için anahtarlar kutu kapalıyken de kayda taşınırdı (R9); `tamirListesiKur` deseni.
41. **Değerler kırpılır, boş kalan gövdeye girmez.** Gerekçe: C3; `tamirListesiKur` da kırpıyor. Doğrulama değildir, kayıt reddedilmez.
42. **Fabrika Teslim seçilince firma ve takip seçim anında `""` olur (emsal), yazıcı da Fabrika Teslim'de bu ikisini atar.** Kargo'ya dönüşte silinen değer geri gelmez (emsal).
43. **Pano düğmesi "Yazdır" düğmesinin stilini ve `print` simgesini taşır**; eylem satırının tıklama ve sürükleme kuralları aynen.
44. **CLAUDE.md'de 0117 bölümü 0116'nın önünde; bekçinin dilimi `(spec 0117, plan` ile `(spec 0116, plan` arasıdır.** 0115 bölümündeki güncellemeler `specs/0115-` dizesini içermez (0115 bekçisi). Gerekçe: 0116 Karar 30 emsali.
45. **Beş yeni ad için paralel yazıcı taraması:** anahtar yazan yalnız `kalipTamiri.js` ve formu düzenleyen `KalipAtolyeAlani.jsx`; 0115'in `atolyeKaliplari:` taraması aynen.
46. **C1 ad tuzağı taraması dört iddiadır:** kalıp dosyaları `repairPlace`'i ve öneksiz `fabrikaTeslim`'i anmaz, pano `kalipFabrikaTeslim`'i okumaz, `tamirEtiketVerisi` `repairPlace` okumaz, `services` INSERT'i öneksiz `fabrikaTeslim` yazmaz.
47. **Kanıt kayıtları ölçülerek seçilir; `degisti` kayıtları `KalipAtolyeAlani.jsx`, `UretimFormu.jsx` ve `MachineTimeline.jsx` anahtarlarına yazılır, pano ve çıktı ekranları yalnız raporda durur** (`ServisPanosu.jsx` ve çıktı kabı `tasarim.jsx` kullanmıyor; ölçüm 20'nin "UretimFormu'nun üç kaydı var" cümlesi 0115 raporu için doğru değildi). Rapor adları `0117-piksel-raporu.json` ve `0117-taban-piksel-raporu.json` (0116 Karar 31); onay "Takım Yöneticisi · 2026-10-29 · spec 0117 Karar 5" (Makina Geçmişi ekranı Karar 7).
48. **Ayrı pencere sahte köprüyle ölçülür** (düğmeye basılır, yazdırma çağrılır); pencerenin yazılabilir bölümleri değişmez.
49. **AC-43 kullanıcı çevirisi taşıyan ayarla ölçülür** (çıktı kullanıcının metnini basar, ayar yokken yeni varsayılanı).
50. **`db-roundtrip.cjs` dört durumu ölçer:** dolu beş alan, Fabrika Teslim `1` ve Kargo `NULL`, alansız serviste anahtar yok, `atolyeKaliplari` aynen; `db-clean-install.cjs` sütunları yazar.

### Uygulamada verilen kararlar (2026-10-29)

51. **Kanıt aracı sayfanın uyarılarını rapora yazar ve `kaydirgenis:` adımı eklenir.** Uygulamada bulundu: sayfa bulunamayan adımı `console.warn` ile geçiyordu ama uyarı ana sürece hiç gelmiyordu, yani AC-44'ün (ve 0116 AC-29'un) "bulunamayan adım yok" iddiası ölçülemiyordu. Araç artık uyarıları satıra `adimUyarilari` olarak yazar (Electron'un güvenlik uyarısı ayıklanır). Bununla 0115'in üç ekranının adımının zaten bulunamadığı çıktı: `servis-formu-0115-acik` var olmayan metne, `uretim-formu-0115-bekleyen` düğmeye, `servis-formu-yazdir-0115` tablo başlığına gidiyordu (`kaydir:` td, th ve düğme içinde aramaz). İlki var olan bölüm başlığına çevrildi, öteki ikisi td, th ve düğmeyi de arayan yeni `kaydirgenis:` adımını kullanır; `kaydir:` değişmedi (başka ekranın hedefi kaymasın). `musteri-detay-0115` adımı da Makina Geçmişi'nin yeni başlığına çevrildi. Eski kodla taban çekiminde 27 ekranda uyarı yok, yeni kodla iki çekimde de yok. 0116'nın iki adımı da bu araçla ölçüldü: hedeflerini buluyor.
52. **Sevk bölümünde firma ve takip alanları da `Field` etiketi taşır** ("Kargo Firması", "Takip No"). Gerekçe: emsalde yalnız yer tutucu var ama aynı satırdaki tarih alanı etiketli olduğu için ızgara iki kutuyu uzatıyor ve hizayı bozuyordu (görsel kanıtta görüldü); üç alan aynı yapıda hizalanır. Emsal değişmedi (X8).

### Karar kaydı

| Bulgu | Derece | Karar | İşlendiği yer |
|---|---|---|---|
| B-1 Alan, yazıcı ve testid adları yok | Bloklayıcı | Karar 10 | R26/2, R29, AC-38, ölçüm 15 |
| B-2 Teslim şekli boolean mı dize mi | Bloklayıcı | Karar 11 | R2/2, R3/2, R27/2, AC-39, ölçüm 16 |
| B-3 Panodaki düğmenin yeri tanımsız | Bloklayıcı | Karar 12 | R12/2, X10, AC-40, AC-41, ölçüm 17 |
| B-4 C10'un tek sabiti imkânsız | Bloklayıcı | Karar 13 | C10, R24/2, AC-42, ölçüm 18 |
| B-5 Çeviri anahtarının adı | Bloklayıcı | Karar 14 | C11, R23/2, AC-43, ölçüm 19 |
| B-6 Kanıt adımı kaldırılan başlıkta | Bloklayıcı | Karar 15 | R32, AC-44, ölçüm 20 |
| Ö-1 `calisanlar` bölüme gelmiyor | Önemli | Karar 16 | R5/2, AC-45, ölçüm 21 |
| Ö-2 Bölümün yeri ve boş liste hâli | Önemli | Karar 17 | R1/2, AC-46, ölçüm 22 |
| Ö-3 0115 AC-60 boşa düşüyor | Önemli | Karar 18 | Başlık tablosu, AC-47, ölçüm 23 |
| Ö-4 Ters çevrilen iddia yanlış dosyada | Önemli | Karar 19 | Başlık tablosu, AC-48, ölçüm 24 |
| Ö-5 Adaptörün `opts` şekli | Önemli | Karar 20 | R19/2, AC-49, ölçüm 24 |
| Ö-6 Tarih yedeğinin sırası | Önemli | Karar 21 | R18/2, AC-50, ölçüm 25 |
| Ö-7 Üretim formunda ölü kod | Önemli | Karar 22 | R30, AC-51, ölçüm 26 |
| Ö-8 Sunucu taramasının kapsamı | Önemli | Karar 23 | R31, AC-52, ölçüm 27 |
| Ö-9 Fabrika Teslim'de etiket metinleri | Önemli | Karar 24 | R6/2, AC-53, ölçüm 28 |
| Ö-10 Doğrulama yok kuralı yazılı değil | Önemli | Karar 25 | R7/2, AC-54 |
| Ö-11 Kartta iki "Fabrika Teslim" | Önemli | Karar 26 | C12, X11, AC-55, ölçüm 29 |
| K-1 Ölçüm 4'ün satır atfı | Küçük | Karar 27 | Ölçüm 4 |
| K-2 Ölçüm 13 iki testi saymıyor | Küçük | Karar 28 | Ölçüm 13 |
| K-3 Ölçüm 14'ün okuyucu sayısı | Küçük | Karar 29 | Ölçüm 14 |
| K-4 `kargoTarih` yazımı | Küçük | Karar 30 | R26/2, ölçüm 15 |
| K-5 Ölçüm 8'in köprü adı | Küçük | Karar 31 | Ölçüm 8 |
| K-6 Yeni metinler sabit mi literal mi | Küçük | Karar 32 | R33 |
| K-7 `Segment` içe aktarması | Küçük | Karar 33 | R2/2, ölçüm 16 |
| K-8 R13 ile R14'ün ölçütleri | Küçük | Karar 34 | R13, R14, R15 |
| K-9 AC-13'ün ölçüm yolu | Küçük | Karar 35 | AC-13, AC-56 |
| K-10 Hangi sunucu testi | Küçük | Karar 36 | R31, DoD |
| K-11 Kanıt ekranlarının listesi | Küçük | Karar 37 | R32, DoD |
| K-12 Kapanış bekçisi | Küçük | Karar 38 | AC-57, DoD |
| P-1 R18/2 ile AC-50 çelişkisi | Önemli | Karar 39 | R18/2, AC-50 |
| P-2 Sevkin kurulduğu yer | Önemli | Karar 40 | R9, R29 |
| P-3 Boşluklu değer | Küçük | Karar 41 | C3 |
| P-4 Fabrika Teslim temizliği | Küçük | Karar 42 | R6, AC-6 |
| P-5 Düğmenin görünümü | Küçük | Karar 43 | R12 |
| P-6 CLAUDE.md bölümünün yeri | Küçük | Karar 44 | AC-57 |
| P-7 Yazıcı taraması | Küçük | Karar 45 | AC-38 |
| P-8 Ad tuzağı taraması | Küçük | Karar 46 | C1, C12 |
| P-9 Kanıt kayıtları | Önemli | Karar 47 | R32, AC-44 |
| P-10 Ayrı pencere ölçümü | Küçük | Karar 48 | R16 |
| P-11 AC-43 ölçümü | Küçük | Karar 49 | AC-43 |
| P-12 Veritabanı testi | Küçük | Karar 50 | C2, AC-39 |
| U-1 Kanıt aracı adım uyarılarını göstermiyordu | Önemli | Karar 51 | AC-44 |
| U-2 Sevk satırının hizası | Küçük | Karar 52 | R4 |

---

## Kabul kriterleri

### A. Sevk bölümü

- **AC-1.** Servis formunda kalıp kutusu kapalıyken sevk bölümü hiç çizilmez.
- **AC-2.** Kutu işaretlenince sevk bölümü kutunun amber kabının **içinde**, kalıp listesinin ve boş liste hatasının altında çizilir; kalıp listesi boşken de çizilir (ölçüt kutudur).
- **AC-3.** Bölümde teslim şekli iki seçenek sunar (`Segment`, `kip="dugme"`) ve değer boşken Kargo seçili görünür.
- **AC-4.** Kargo seçiliyken kargo firması, takip numarası ve kargo tarihi alanları çizilir.
- **AC-5.** Fabrika Teslim seçilince kargo firması ve takip numarası alanları çizilmez; tarih alanının etiketi "Teslim Tarihi", kişi alanının etiketi "Teslim Eden Kişi" olur.
- **AC-6.** Fabrika Teslim seçilince daha önce girilmiş kargo firması ve takip numarası değeri temizlenir.
- **AC-7.** Kargoyu veren kişi alanı firma çalışanlarını önerir ve listede olmayan bir ad da yazılabilir.
- **AC-8.** Bütün sevk alanları boş bırakılan servis hatasız kaydedilir.
- **AC-9.** Doldurulan beş değer kaydedilir ve form yeniden açıldığında aynen görünür.
- **AC-10.** Kutu işaretlenip sonra kaldırılırsa kaydedilen gövdede sevk alanı yoktur.
- **AC-11.** Boş bırakılan sevk alanı kaydın gövdesine hiç yazılmaz (anahtar yoktur, null da değildir).
- **AC-12.** Aynı bölüm müşteri detayından ve panodan açılan serviste birebir aynı alanlarla çizilir.
- **AC-13.** Sevk alanı taşımayan bir servis kaydedildiğinde gövdesi spec öncesiyle birebir aynıdır: `tests/ui/kalip-tamiri-0115-kiyas.test.jsx`'in anahtar yokluğu iddiası beş yeni alanla genişletilir (AC-56).

### B. Etiket düğmesi

- **AC-14.** Kalıp Üretim Formu'nun tamir satırında Kargo Etiketi düğmesi yoktur.
- **AC-15.** Panodaki servis kartında kalıp listesi doluysa "Etiket" düğmesi çizilir.
- **AC-16.** Kalıp listesi boş serviste panoda etiket düğmesi çizilmez.
- **AC-17.** Müşterisi çözülemeyen serviste panoda etiket düğmesi çizilmez.
- **AC-18.** Panodaki düğmeye basılınca etiket basılır ve içeriği servisin kalıp listesidir.
- **AC-19.** Makina Geçmişi'ndeki etiket düğmesi bugünkü yerinde ve metniyle durur.
- **AC-20.** Düğme kiosk kipinde de çizilir ve çalışır.

### C. Etiketin içeriği

- **AC-21.** Teslim şekli Fabrika Teslim olan serviste etiketin TESLİM ŞEKLİ hücresi "Fabrika Teslim" basar.
- **AC-22.** Teslim şekli boş olan serviste aynı hücre "Kargo" basar.
- **AC-23.** Kargo tarihi dolu serviste etiketin TARİH hücresi kargo tarihini basar.
- **AC-24.** Kargo tarihi boş serviste (boş dize ve alanın hiç olmadığı kayıt) aynı hücre servis tarihini basar; yedek ham değerde seçildiği için biçimlenmiş `"—"` hücreye hiç girmez.
- **AC-25.** Etiketin altı başlığı ve iki hücreli alt bandı değişmez.
- **AC-26.** Kargo firması ve takip numarası dolu olsa da etikette geçmez.

### D. Ad

- **AC-27.** Servis Formu çıktısında kalıp satırının başlığı "SERVİS GÖREN KALIPLAR" basar ve `tests/kalip-tamiri-0115-cikti.test.js`'in AC-59 satırı yeni metinle güncellenir.
- **AC-28.** Aynı çıktının İngilizcesinde başlık "SERVICED MOLDS" basar.
- **AC-29.** Kalıp listesi boş serviste satır hiç basılmaz (bugünkü kural); 0115 AC-60'ın olumsuz iddiası **yeni başlıkla** güncellenir, yoksa her veride doğru olup hiçbir şeyi korumaz (AC-47).
- **AC-30.** Makina Geçmişi'ndeki servis satırının liste başlığı "Servis gören kalıplar" yazar ve değeri `kalipTamiri.js`'in sabitinden okunur.
- **AC-31.** Çeviriler ekranında anahtarın görünen adı yeni adla eşleşir, anahtar kapsam testinde kalır ve iki test dosyasının (`ceviri-kapsam.test.js`, `kalip-tamiri-0115-cikti.test.js`) dört dizesi birlikte güncellenir.
- **AC-32.** Servis formundaki kutunun etiketi ve pano rozetinin metni değişmemiştir.

### E. Dokunulmayanlar

- **AC-33.** Üretim formunun ekran ve çıktı sütunları, tamir satırının zemini ve kaynak satırı değişmez.
- **AC-34.** Tamir satırı kalıp durumu haritasına girmez; 0106, 0108 ve 0110'un testleri dokunulmadan geçer.
- **AC-35.** Kalıbın kendi kaydına, kalıp durumuna ve müşteri formuna hiçbir şey yazılmaz.
- **AC-36.** Sunucu yazma yetkisi kuralları değişmez; yalnız sevk alanı değiştiren bir servis düzenlemesi bugünkü servis düzenleme izniyle (`cust_service_edit`) geçer. Ölçüm yolu `tests/server-authz.test.js`'in 0117 bloğudur.
- **AC-37.** Tam `npm test` yeşil (Electron dosyaları dahil, `VITEST_ELECTRON` ile daraltılmadan), `npm run lint` hata sayısı sıfır.

### QA turu kriterleri (2026-10-29)

- **AC-38.** Beş alan `kalipFabrikaTeslim`, `kalipKargoFirma`, `kalipKargoTakipNo`, `kalipKargoTarih`, `kalipKargoSorumlusu` adlarıyla yazılır; kayda yazan tek yer `kalipTamiri.js` olur (0115'in yazıcı taraması dosya listesini aynen sabitler) ve bölümün beş `data-testid`'i ile seçicinin erişilebilir adı spec'teki adlarıdır.
- **AC-39.** Teslim şekli boolean'dır: Fabrika Teslim seçilen kaydın gövdesinde `kalipFabrikaTeslim: true` vardır; Kargo seçilen ve hiç dokunulmayan kayıtların gövdesinde **anahtar hiç yoktur** (`false` da değildir) ve veritabanı satırı `NULL` taşır.
- **AC-40.** Panodaki "Etiket" düğmesi teknisyen seçicisinin hemen sağında çizilir, Bekliyor, Yapılıyor ve Tamamlandı kartlarının üçünde de görünür ve Tamamlandı kartında "Yazdır" düğmesinin solunda durur.
- **AC-41.** Arşivlenmiş (panodan kaldırılmış) kartta eylem satırı ve dolayısıyla etiket düğmesi yoktur; aynı servisin etiketi Makina Geçmişi satırından basılır.
- **AC-42.** Çıktı başlığı çeviri anahtarından okunur: kullanıcının `appSettings.translations.servis.atolyeKaliplariLabel` değeri doluysa çıktı onu basar, boşsa yeni varsayılanı basar; Makina Geçmişi aynı kayıtta kod sabitini basar.
- **AC-43.** Çeviri anahtarının adı `atolyeKaliplariLabel` olarak kalır; spec öncesinde bu anahtarı kendi metniyle düzenlemiş bir ayar gövdesi yüklendiğinde çıktı kullanıcının metnini basmaya devam eder.
- **AC-44.** Kanıt aracında hiçbir adım bulunamamış olarak geçmez; `servis-formu-yazdir-0115` yeni başlığa kaydırır ve değişen ekranların kaydı `beklenen: "degisti"` ile AC-11b biçimli onay satırını taşır, değişmeyenler 0 pikseldir.
- **AC-45.** Sevk bölümünün kişi alanı firma çalışanlarını önerir (prop zinciri `ServiceForm` → `KalipAtolyeAlani`) ve datalist kimliği yedek parça formunun kimliğinden farklıdır.
- **AC-46.** Kutu açıkken kalıp listesi boş olsa da sevk bölümü çizilir; kutu kapatılınca bölüm ekrandan kalkar.
- **AC-47.** `tests/kalip-tamiri-0115-cikti.test.js`'in AC-60 bloğu yeni başlıkla günceldir ve "spec 0117 ile" notunu taşır.
- **AC-48.** `tests/kargo-etiketi.test.js` dokunulmadan yeşildir; sabit teslim şekli ve tarih iddiası yalnız `tests/kalip-tamiri-0115-cikti.test.js`'in AC-96 bloğunda güncellenir.
- **AC-49.** `tamirEtiketVerisi`'nin döndürdüğü `opts` nesnesi yalnız `teslimSekli` ve `tarih` anahtarlarını taşır (tam nesne karşılaştırması).
- **AC-50.** Sevk tarihi bozuk ya da tanınmayan bir dize taşıyan kayıtta etiket servis tarihini basar (yedek ham değerde seçilir).
- **AC-51.** `UretimFormu.jsx` `tamirEtiketYazdir`'ı içe almaz, `tamirEtiketi` yardımcısı dosyada yoktur ve satırda etiket düğmesi çizilmez (tarama); `factory` prop'u çıktı başlığı için yerinde durur.
- **AC-52.** `electron/serverAuth.cjs` beş yeni alan adını hiç anmaz (tarama genişletildi) ve `ALAN_IZINLERI.services` yalnız `durum`u izler.
- **AC-53.** Kargo seçiliyken alan etiketleri "Kargo Tarihi" ve "Kargoyu Veren Kişi", Fabrika Teslim seçiliyken "Teslim Tarihi" ve "Teslim Eden Kişi" yazar.
- **AC-54.** Servis tarihinden önceki bir kargo tarihi, çok uzun bir takip numarası ve tamamen boş sevk alanları hatasız kaydedilir; hiçbir sevk alanı için uyarı çıkmaz.
- **AC-55.** Pano kartı kalıbın teslim şeklini basmaz; kartta yalnız bugünkü onarım yeri metni durur.
- **AC-56.** Kıyas testi beş yeni alanın da sevk bilgisi taşımayan serviste gövdeye girmediğini ölçer.
- **AC-57.** 0117'nin kapanış bekçisi vardır: plan `specs/done`'a taşınınca `CLAUDE.md`'nin 0117 bölümü "Tamamlandı: commit" satırını taşır, `tests/spec-atiflari.test.js`'in `TASINACAK` listesinde 0117 yoktur, `specs/0117-*.md` kopyası kalmaz ve `specs/README.md`'nin 0117 satırı "(Tamamlandı)" yazar.

---

## Definition of Done

- [ ] Bütün kabul kriterleri karşılandı; kriter ile test eşlemesi tabloyla gösterildi.
- [ ] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor. **İstisna:** davranışın değişmediğini söyleyen kriterler (AC-33 – AC-36, AC-48) için var olan testin dosya ve blok adıyla gösterilmesi yeterlidir.
- [ ] Beş yeni alan için dört nokta kuralı uygulandı ve `db-roundtrip` ile `db-clean-install` testlerine eklendi.
- [ ] Ayıklama okuması sabitlendi: spec öncesi gövde fikstürüyle karşılaştırıldı, boş alan gövdeye girmiyor.
- [ ] Yeni veri bölümü, yeni eylem izni ve yeni sunucu kuralı **eklenmediği** açıkça yazıldı; `tests/server-authz.test.js`'e 0117 bloğu eklendi ve `scripts/tests/server-security.cjs` genişletilmedi (yeni izin yok, Karar 36).
- [ ] `serverAuth.cjs` taraması beş yeni alan adıyla genişletildi (R31).
- [ ] Ad tuzağı taraması yazıldı: kalıbın sevk alanlarıyla onarım yeri alanı hiçbir yerde karışmıyor.
- [ ] Başlığın dört yazım yeri (TR varsayılanı, EN varsayılanı, Çeviriler ekranının görünen adı, kod sabiti) ve iki test dosyası (`ceviri-kapsam.test.js`, `kalip-tamiri-0115-cikti.test.js`) birlikte güncellendi; **çeviri anahtarının adı değişmedi** (C11).
- [ ] Kod sabitinin adı `SERVIS_KALIPLARI_ETIKETI` oldu ve tek içe aktarması güncellendi (R23/2).
- [ ] 0115'in ters çevrilen kriterleri "spec 0117 ile" notuyla güncellendi (AC-65, AC-59, AC-60, AC-96, AC-99, AC-57, AC-40, AC-97); kaynak taramasının üretim formunu arayan ve panoyu yasaklayan iki satırı kaldırıldı.
- [ ] `UretimFormu.jsx`'in üç ölü parçası (içe aktarma, `tamirEtiketi`, düğme) silindi ve tarama onları yasaklıyor (R30).
- [ ] Kanıt aracının `servis-formu-yazdir-0115` adımı yeni başlığa çevrildi; hiçbir ekran bulunamayan adımla çekilmedi (R32).
- [ ] Görsel kanıt alındı; değişen ekranlar (`servis-formu-0115-acik`, `-kayitli`, `-bos-hata`, `-ad-hata`, `uretim-formu-0115-tamir`, `-bekleyen`, `-kopuk`, `servis-formu-yazdir-0115`, pano kartı; **Karar 47 ile ölçüldü:** `-bekleyen` ve `-kopuk` 0 piksel ve `ayni`, `musteri-detay-0115` değişti) `beklenen: "degisti"` ve onay satırıyla kayıtlı, değişmeyenler 0 piksel; kapanışta kayıtlar `ayni`ye çevrildi (AC-11c).
- [ ] Tam `npm test` yeşil (çıktısıyla, Electron dosyaları dahil), `npm run lint` hata sayısı sıfır.
- [ ] `CLAUDE.md`'nin 0115 bölümü güncellendi: etiket düğmesinin yeri, beş sevk alanı ve liste başlığının yeni adı.
- [ ] 0117'nin kapanış bekçisi yazıldı ve yeşil (AC-57).
- [ ] Takım Yöneticisi onayladı. **Commit ve sürüm yayını yalnız açık talimatla yapılır.**
- [ ] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Uygulama commit** | `ad28cce` | Dal `feat/0117-kalip-sevki`, taban `5aa988a`; kapanış ayrı commit |
| **Spec revizyon sayısı** | 2 | QA turu (B-1–B-6, Ö-1–Ö-11, K-1–K-12, Karar 10–38), plan turu (Karar 39–50); uygulamada Karar 51–52 |
| **Düzeltme turu sayısı** | 1 | Triyaj: iki küçük belge bulgusu: sürüm notu güncellenmemiş istemcinin sevki sildiğini söylüyordu (yanlış: 0115'in yazıcısı öteki anahtarları geri yazar, risk yalnız eski sunucuda); R32 ve DoD'nin ekran listesi Karar 47'nin ölçümünü anmıyordu. İkisine test eklendi |
| **Bulgu gerçek/gürültü oranı** | 2 / 0 | |
| **Regresyon sayısı** | 0 | Tam takım 440 dosya, 5985 test (Electron dahil, boş makinada); lint 0 hata, uyarı 62 |
| **Kaçan hata** | 0 | |

**Uygulamada bulunanlar:** kanıt aracı sayfanın adım uyarılarını hiç aktarmıyordu, "bulunamayan adım yok" iddiası ölçülemiyordu (Karar 51); aktarım eklenince 0115'in üç ekranının adımının en baştan bozuk olduğu çıktı ve düzeltildi, 0116'nın iki adımı sonradan doğrulandı. R18/2 ile AC-50 çelişiyordu (Karar 39). Sevk satırında tek etiketli alan ızgarayı uzatıyordu (Karar 52). Düğme kalkınca `tamirKaynagi` içe aktarması da ölü kaldı.

**Görsel kanıt:** 29 ekran × 2 tema; 10 ekran bilinçli değişti, 2 yeni ekran, 17 ekran 0 piksel; taban son kodla 0 fark; hiçbir çekimde adım uyarısı yok.

**Bu spec'ten çıkarılan ders:** Bir kanıt aracının sessizce geçtiği hata, onun ölçtüğü her iddiayı geçersiz kılar: "uyarı yok" demeden önce uyarının çıktıya gerçekten ulaşabildiği bir kez bozuk adımla sınanmalı. Sürüm notu yazarken "güncellenmemiş istemci veriyi siler" cümlesi, eski sürümün yazıcısı okunarak doğrulanmalı; yayarak geri yazan bir yazıcı bilmediği alanı korur.
