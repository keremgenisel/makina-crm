# 0008: Uygulama Planı, Gider Modülü Yayın Perdesi (geçici)

| | |
|---|---|
| **Bağlı spec** | `specs/done/0008-gider-modulu-yayin-perdesi.md` (R1, plan onayıyla onaylandı) |
| **Durum** | Tamamlandı. 2026-09-24: K1–K9 kullanıcı tarafından onaylandı; spec R1 ile güncellendi; kod commit `ad9c047` (branch `feat/0001-gider`, push ve sürüm yok). SCORECARD dolduruldu, spec ve plan `specs/done/`'a taşındı. |
| **Önkoşul** | 0001, 0002, 0003 (gider modülü, `giderYetki` tek kapısı) |

Bu plan, spec'i karşılamak için hangi dosyaya hangi sırayla dokunulacağını, kodda doğrulanan dayanakları ve spec'in kodla
çeliştiği ya da boş bıraktığı noktaları (bölüm 4, kararlar K1–K9) içerir.

---

## 0. Kodda doğrulanan dayanaklar

| Konu | Bulgu | Yer |
|---|---|---|
| Tek kapı | `giderYetki = visibleTabs.some(t => t.id === "gider")`; bütün türev görünümler buna bakıyor | `App.jsx:149` |
| Sekme izni | `gorunurSekmeler`: yerel mod / sunucu PC / admin hepsi; tabs tanımsız user gider görmez (0001 C6 kural 3) | `permissions.js:33-42` |
| Giderler sekmesi | `activeTab === "gider" && giderYetki && <Giderler …/>` | `App.jsx:1337` |
| Anasayfa | Hatırlatma yalnız `giderYetki` ile hesaplanır; App ayrıca `giderler`/`setGiderler`/`onGoGiderHatirlatma`'yı boş verir | `Dashboard.jsx:23-25`, `App.jsx:1330-1332` |
| Finans | KDV karşılaştırması `!giderYetki` ise `null` | `Finance.jsx:57` |
| Ayarlar | Giderler grubu `GIDER_AYAR_IDLERI` ile süzülüyor; alt ekranlar ayrıca `giderYetki &&` | `Settings.jsx:84, 270-282` |
| Çalışanlar | Maliyet sütunları ve ipucu `giderYetki &&` | `CalisanManager.jsx:129-162` |
| Çöp Kutusu | Gider satırları ve "çöpü boşalt"ın gider kolu `giderYetki` ile | `SettingsTrash.jsx:190, 225` |
| Silme onayları | Müşteri: `giderYetki` prop'u; makina (stok): App `giderler` dizisini boş verir | `Customers.jsx:706`, `App.jsx:1335`, `MakinaStokTab.jsx:220` |
| **Spec listesinde olmayan türevler** | Müşteri formundaki üretim tarihi / satış kuru alanları (0002), müşteri detayındaki makina kârlılığı kutusu, `makinaMaliyet` hesabı. Hepsi aynı `giderYetki`'ye bağlı, perdeyle birlikte kendiliğinden kapanır | `CustomerAddEditForm.jsx:351, 399`, `CustomerDetailModal.jsx:992`, `App.jsx:710` |
| **Yedekleme (kritik)** | Yedek dosyası gider dizilerini **koşulsuz** içeriyor (`buildBackupData`, otomatik yedek de öyle). Ama geri yüklemede "Giderler" paketi yalnız `giderYetki` ile listeye giriyor; paket listede yoksa `sec("gider")` hiç doğru olmaz ve **gider verisi geri yüklenmez** | `SettingsBackup.jsx:49, 134, 192-196`, `App.jsx:1088` |
| Arka plan gider yazımları | `giderYetki`'den bağımsız çalışanlar: model adı değişince gider satırlarındaki model adı taşınır; çalışan silinince açık personel tanımı kapatılır. Bugün gider yetkisi olmayan kullanıcıda da çalışıyorlar (bütünlük işlemi) | `ModelsManager.jsx:58-59`, `CalisanManager.jsx:84-87` |
| Dev / paket ayrımı | Ana süreçte `app.isPackaged` (güncelleyici). Renderer'da bugün hiçbir ayrım kullanılmıyor (`import.meta.env` hiç yok) | `electron/main.cjs:204, 216, 389` |
| Yayın durumu | Gider modülü hiç yayınlanmadı (yalnız `feat/0001-gider` dalında, `main` 3.38.3). Sahada gider verisi yok; veri korunması kuralı yine de uygulanır | `git branch --contains 565b0ff` |
| Test ortamı | vitest'te `import.meta.env.PROD === false`, `DEV === true` | vitest varsayılanı |

---

## 1. Mimari özet

- **Tek işaret, tek dosya:** yeni `src/lib/yayinPerdesi.js`.
  ```js
  // GEÇİCİ (spec 0008): gider modülü yayında kapalı. KALDIRMA: GIDER_PERDESI = false yapın (tek satır).
  export const GIDER_PERDESI = true;
  export const giderPerdesiIndi = (ortam = import.meta.env, isaret = GIDER_PERDESI) => !!isaret && !!ortam?.PROD;
  ```
  Kullanıcı ayarı değil, kalıcı alan değil, izin değil (R3, C2).
- **Tek kapı App.jsx'te:** bugünkü `giderYetki` ikiye ayrılır.
  - `giderSekmesi = visibleTabs.some(t => t.id === "gider")` → izin (sekme menüde görünür mü). **Değişmez** (R10).
  - `giderYetki = giderSekmesi && !giderPerdesiIndi()` → bütün türev görünümler bugünkü gibi buna bakar. Tüketicilere
    **hiç dokunulmaz** (C3); ekran ekran koşul yazılmaz.
- **Giderler sekmesi:** menüde kalır (`visibleTabs` değişmez). İçerik: `giderYetki ? <Giderler/> : <GiderPerdesi/>`
  (`activeTab === "gider"` zaten `giderSekmesi`'ni gerektirir, yani izinsiz kullanıcı bu sayfayı hiç görmez).
- **Yedekleme için ikinci prop (tek bilinçli istisna, bkz. K3):** `SettingsBackup` bugünkü `giderYetki`'yi hem "ibareyi
  göster" hem "veriyi geri yükle" için kullanıyor. Perde ikisini ayırmayı gerektiriyor: `giderYetki` (ibare, perdeli) +
  `giderVeriYetki = giderSekmesi` (içerik, perdesiz). Perde indiğinde paket listede görünmez ama geri yüklemeye katılır.
- **Sunucu, izin tanımları, DB, merge:** dokunulmaz (R7, C2).

---

## 2. Değişecek ve eklenecek dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/yayinPerdesi.js` (yeni) | İşaret + `giderPerdesiIndi(ortam, isaret)`; başında GEÇİCİ etiketi ve kaldırma talimatı (R9) |
| `src/components/gider/GiderPerdesi.jsx` (yeni) | Sekme içi bilgi sayfası (başlık + iki cümle, tarih/süre yok, R8). Inline stil + tema token'ları |
| `src/App.jsx` | `giderSekmesi` + `giderYetki` ayrımı (1 satır → 2 satır); gider sekmesi render'ında perde dalı; `Settings`'e `giderVeriYetki={giderSekmesi}` |
| `src/components/Settings.jsx` | `giderVeriYetki` prop'unu `SettingsBackup`'a geçirir (yalnız aktarma) |
| `src/components/settings/SettingsBackup.jsx` | Paket listesi `giderYetki` ile görünür; geri yükleme `giderVeriYetki` ile. Perdeliyken gizli paket kuralı (K3) |
| `CLAUDE.md` | "Gider modülü yayın perdesi (GEÇİCİ, spec 0008)" bölümü: kapsam, tek işaret, nasıl kaldırılır, yedekleme istisnası (R9) |
| `specs/0008-…md` | Plan onayıyla "Onaylandı" + revizyon satırı (karar gerektiren yerler K1–K9) |
| Testler (yeni) | `tests/yayin-perdesi.test.js`, `tests/ui/gider-perdesi.test.jsx`, `tests/ui/gider-perdesi-yedek.test.jsx` |

Silinen dosya, test veya satır mantığı **yok** (C1, R5). Değişen satırlar yalnız kapı koşulunu genişletir.

---

## 3. Adım sırası

1. **İşaret:** `lib/yayinPerdesi.js` + saf testleri (AC-10, AC-13 çekirdeği).
2. **Kapı:** `App.jsx`'te `giderSekmesi` / `giderYetki` ayrımı. Bu adımdan sonra türev görünümlerin hepsi perdeye bağlı.
3. **Sekme sayfası:** `GiderPerdesi.jsx` + App render dalı.
4. **Yedekleme:** `Settings.jsx` aktarma + `SettingsBackup.jsx` ibare/içerik ayrımı ve gizli paket kuralı.
5. **App düzeyi testler:** perde modülü `vi.mock` ile "inik" yapılarak bütün ekranlar gerçek App üzerinden (tek kapının
   gerçekten her yere ulaştığını kanıtlamak için bileşen düzeyi değil App düzeyi).
6. **Kaynak taraması testi (C3):** işaret yalnız `yayinPerdesi.js` ve `App.jsx`'te geçiyor.
7. `CLAUDE.md`, spec revizyonu, sürüm notu metni (§7).
8. Tam paket: `npm test`, `npm run lint`, `npm run build`. Ek olarak **üretim derlemesinde perdenin gerçekten indiğinin
   kanıtı** (K2): `vite build` çıktısında `giderPerdesiIndi`'nin `PROD=true` ile derlendiğinin kontrolü.

---

## 4. Riskler ve emin olmadığım noktalar (öneri + gerekçe)

**K1. "Perde inik mi?" neye bakacak: Vite `import.meta.env.PROD` mi, Electron `app.isPackaged` mı?**
Spec "kurulu (paketlenmiş) sürüm" diyor ve güncelleyicinin `app.isPackaged` kullandığını hatırlatıyor.
*Öneri:* `import.meta.env.PROD`. *Gerekçe:* renderer'da senkron ve derleme anında sabit; ilk karede modülün görünüp sonra
kaybolması (IPC yanıtını beklerken "yanıp sönme") olmaz; preload/main'e yeni kanal gerekmez; test edilebilir (parametre).
`npm run dev` → DEV (modül tam, R4); kurulu paket → PROD (perde inik, R1). Tek fark: paketlenmemiş üretim derlemesi
(`npm run preview`, `electron .` ile `dist/`) de perdeli olur; bu kullanıcıya gitmeyen, güvenli taraftaki bir fark. Spec'in
"yeni mekanizma icat etme" koşulu da sağlanıyor (Vite'ın kendi ayrımı). Spec Context'inde "otomatik güncelleme bu ayrımı
kullanıyor" cümlesine "renderer tarafında aynı ayrımın Vite karşılığı" notu eklenmesini öneriyorum.

**K2. AC-15 "perde açıkken mevcut testler geçer" nasıl okunmalı?**
Testler DEV ortamında koşar, yani mevcut gider testleri perde kalkıkmış gibi tam modülü görür.
*Öneri:* AC-15 = "işaret kodda `true` iken bütün test paketi yeşil". Ek olarak perdeli davranış yeni testlerde `vi.mock`
ile ayrıca kanıtlanır. *Gerekçe:* mevcut testleri perde inik koşturmak onları anlamsız kılar (gider ekranı hiç çizilmez);
spec'in amacı "perde mevcut testleri kırmasın" olmalı. Üretim derlemesinin gerçekten perdeli çıktığını da §3 adım 8'de
derleme çıktısı üzerinden gösteririm.

**K3. Yedekten geri yükleme (spec'in "yedek sessizliği" tuzağı, kodda gerçek).**
Bugün "Giderler" paketi `giderYetki` false ise listeye hiç girmiyor ve gider verisi **geri yüklenmiyor**. Perde tek kapıdan
indirildiğinde yerel modda bile AC-9 kırılır. İbareyi gizlerken içeriği korumak için `SettingsBackup` iki bayrak almalı.
Perdeliyken gizli "gider" paketi ne zaman geri yüklensin?
*Öneri:* **görünen bütün paketler seçiliyse** (tam geri yükleme) gider verisi de geri yüklenir; kısmi geri yüklemede gider
verisine dokunulmaz. Kullanıcı yetkisi (`giderSekmesi`) yoksa bugünkü gibi hiç geri yüklenmez.
*Gerekçe:* tam geri yükleme "her şeyi yedekteki hâline getir" demektir, gider dahil olmalı (AC-9); kısmi geri yüklemede
kullanıcının göremediği bir veriyi sessizce ezmek (ör. yalnız "Notlar" seçilmişken giderleri değiştirmek) sürpriz olur.
Alternatif "her zaman geri yükle" daha basit ama bu sürprizi yaratır. Bu, C3'ün tek bilinçli istisnası: **ibare** kapıdan,
**içerik** izinden beslenir; spec'in kendi tuzak notu bunu istiyor.

**K4. AC-14 "perde açıkken hiçbir gider kaydı değiştirilmez" ile arka plan bütünlük işlemleri çelişiyor.**
Model adı değişince gider satırlarındaki model adı taşınır; çalışan silinince açık personel tanımı kapatılır. İkisi de bugün
gider yetkisi olmayan kullanıcıda da çalışır.
*Öneri:* ikisi **çalışmaya devam eder**; AC-14 "kullanıcı gider ekranlarından veya perde nedeniyle hiçbir gider kaydı
oluşturmaz, değiştirmez, silmez" olarak okunur ve spec'e bu yönde bir cümle eklenir. *Gerekçe:* durdurulurlarsa perde
kalktığında gider satırları var olmayan bir model adını veya silinmiş bir çalışanın açık tanımını taşır (C6 "birebir
dönüş" kırılır, R6 "veri yerinde" anlamını yitirir); ayrıca X6 "modülde işlevsel değişiklik yok" diyor. Gider modülü hiç
yayınlanmadığı için sahada bu işlemlerin dokunacağı kayıt da yok.

**K5. Spec R2 listesi eksik (kod gereği kendiliğinden kapanıyor).**
Müşteri formundaki üretim tarihi / satış kuru alanları, müşteri detayındaki makina kârlılığı kutusu ve fiyat önerisi de
gider türevi ve aynı kapıya bağlı.
*Öneri:* perdeyle birlikte kapanmaları doğru (Intent: "hiçbir parçasını görmüyor"); testte AC-2 bloğuna eklenir ve spec
R2'ye revizyonla eklenir. *Gerekçe:* spec'in "yarım gizleme" tuzağı; listede olmayan ama görünen bir 0002 alanı aynı sorunu
yaratır. Not: satış kuru alanı gizliyken mevcut değer formda korunur (form alanı çizmemek değeri silmez), bunu testle
gösteririm.

**K6. Kullanıcı yönetimindeki "Giderler" sekme onay kutusu ve "Gider işlemleri" izin grubu.**
Admin ekranında görünmeye devam eder.
*Öneri:* dokunulmaz. *Gerekçe:* R7 izinlerin değişmemesini istiyor; sekme menüde durduğu için (R1) onun izin kutusunun
durması tutarlı; gizlenirse perde kalkınca adminin yeniden yetki vermesi gerekir ya da kaydederken gizli değerlerin
korunması gibi yeni bir risk doğar.

**K7. Perde sayfasının metni (R8, C4, AC-12).**
*Öneri:* başlık "Giderler", metin: "Bu bölüm üzerinde çalışma sürüyor. Hazır olduğunda buradan kullanabileceksiniz." Tarih,
süre, sürüm numarası, "yakında" yok. Mevcut veriye değinmez. *Gerekçe:* sahada gider verisi yok; "kayıtlarınız korunuyor"
cümlesi var olmayan bir veriyi ima eder. Metni analist değiştirmek isterse tek dosyada.

**K8. İşaretin kaldırılması "tek adım" (R9, AC-13).**
*Öneri:* kaldırma = `GIDER_PERDESI = false`. Sonraki temizlik (dosyayı, `GiderPerdesi.jsx`'i, `giderVeriYetki` ayrımını ve
bu testleri silmek) ayrı ve isteğe bağlı iş olarak CLAUDE.md'de yazılı olur. *Gerekçe:* `false` yapmak tek satırdır ve
davranışı birebir geri getirir (AC-13 testle); temizlik yapılmasa da zararsız, yapılırsa da hangi dosyaların silineceği
listelenmiş olur.

**K9. Görsel kanıt (`docs/evidence/0008-*.png`).**
*Öneri:* önceki spec'lerdeki kullanıcı kararı gereği atlanır; yerine App düzeyi testler ve derleme çıktısı kontrolü.

---

## 5. Kabul kriteri ↔ test eşlemesi

Test adları `AC-<n>: <metin>` biçiminde. "Perde inik" testleri `vi.mock("../../src/lib/yayinPerdesi", …)` ile gerçek
`App` üzerinden koşar (tek kapının her ekrana ulaştığının kanıtı).

| AC | Test | Nasıl |
|---|---|---|
| AC-1 | `ui/gider-perdesi.test.jsx` | App, yerel mod, perde inik: menüde "Giderler" var; tıklanınca perde metni; "Dönem Raporu", "Makina ve Model", "Tedarikçiler", "Standart Genel Giderler" yok |
| AC-2 | aynı | Vadesi yaklaşan gider verisiyle Anasayfa: hatırlatma kartı yok. K5 ekleri: müşteri formunda üretim tarihi / satış kuru, müşteri detayında kârlılık kutusu yok |
| AC-3 | aynı | Finans: "KDV Karşılaştırması" yok |
| AC-4 | aynı | Ayarlar menüsü: Giderler grubu ve "Gider Türleri", "Tekrarlayan Giderler", "Gider Ayarları" yok |
| AC-5 | aynı | Ayarlar > Firma Çalışanları: maliyet sütun başlıkları ve ipucu yok |
| AC-6 | aynı | Çöpte bir gider kalemi: Çöp Kutusu'nda görünmez; "çöpü boşalt" sonrası kaydedilen blob'da çöpteki gider kalemi duruyor |
| AC-7 | aynı | Gidere bağlı müşteri ve stok makinası silme onaylarında gider sayısı metni yok |
| AC-8 | `ui/gider-perdesi-yedek.test.jsx` | `SettingsBackup` perde inik: ekranda "Gider" ibaresi yok (yedekleme ve geri yükleme paneli); `crmStorage.backup`'a giden veri `giderler`, `giderTanimlari`, `giderTurleri`, `tedarikciler`, `standartGiderler` içeriyor. App düzeyinde otomatik yedek yükü de aynı |
| AC-9 | aynı | O yedekle tam geri yükleme: beş gider dizisi eksiksiz yerleşir; kısmi geri yüklemede gider dizilerine dokunulmaz (K3); gider izni olmayan kullanıcıda bugünkü gibi yüklenmez |
| AC-10 | `yayin-perdesi.test.js` + `ui/app-gider-sekmesi.test.jsx` (mevcut) | `giderPerdesiIndi({ DEV: true, PROD: false }) === false`; test ortamında (DEV) App modülü tam gösterir |
| AC-11 | `ui/gider-perdesi.test.jsx` | LAN user, tabs tanımsız ve tabs gidersiz: perde inikken de menüde "Giderler" yok, perde sayfası da yok |
| AC-12 | aynı | Perde sayfası metninde rakam, ay adı ve "gün / hafta / ay içinde / yakında / sürüm / tarih" sözcükleri yok |
| AC-13 | `yayin-perdesi.test.js` + `ui/gider-perdesi.test.jsx` | `giderPerdesiIndi({ PROD: true }, false) === false`; App'te mock "kalkık" ile AC-1..7 ekranlarının hepsi bugünkü gider içeriğini gösterir (perde yokkenki metinlerle birebir) |
| AC-14 | `ui/gider-perdesi.test.jsx` | Perde inik: sekmeler arasında gezip çöpü boşalttıktan sonra kaydedilen blob'daki beş gider dizisi yüklenenle `toEqual` (K4 okuması) |
| AC-15 | tam paket | İşaret `true` iken `npm test` yeşil (K2); sayı ve çıktı teslimde |
| C3 / DoD | `yayin-perdesi.test.js` | Kaynak taraması: `GIDER_PERDESI` / `giderPerdesiIndi` yalnız `lib/yayinPerdesi.js` ve `App.jsx`'te geçiyor |
| R9 | `yayin-perdesi.test.js` | `yayinPerdesi.js`'te "GEÇİCİ" ve kaldırma talimatı, CLAUDE.md'de perde bölümü var |

---

## 6. Onay istenen kararlar (özet)

| # | Karar | Öneri |
|---|---|---|
| K1 | Ayrım ölçütü | `import.meta.env.PROD` (renderer, senkron) |
| K2 | AC-15 okuması | İşaret açıkken paket yeşil; perdeli davranış yeni testlerde mock ile |
| K3 | Gizli gider paketi geri yüklemesi | Tam geri yüklemede evet, kısmide hayır; izinsizde hiç |
| K4 | Arka plan bütünlük işlemleri | Çalışmaya devam; AC-14'e açıklayıcı cümle |
| K5 | R2 listesine eklenecekler | Üretim tarihi / satış kuru alanları, kârlılık kutusu, fiyat önerisi |
| K6 | Kullanıcı yönetimindeki gider izinleri | Dokunulmaz |
| K7 | Perde metni | "Bu bölüm üzerinde çalışma sürüyor. Hazır olduğunda buradan kullanabileceksiniz." |
| K8 | Kaldırma | `GIDER_PERDESI = false`; temizlik ayrı ve isteğe bağlı |
| K9 | Görsel kanıt | Atlanır |

---

## 7. Sürüm notu metni (öneri)

"Giderler bölümü bu sürümde henüz kullanıma açılmadı; menüde yeri görünür, üzerinde çalışma sürüyor."

---

## 8. Uygulama notları (2026-09-24)

- **Tek kapı:** `App.jsx`'te `giderSekmesi` (izin) + `giderYetki = giderSekmesi && !giderPerdesiIndi()`. Tüketici bileşenlere
  dokunulmadı; `yayin-perdesi.test.js` kaynak taraması işaretin yalnız `lib/yayinPerdesi.js` ve `App.jsx`'te geçtiğini sabitliyor.
- **Değişen satırlar:** `src/` altında silinen 5 satırın hepsi aynı satırın genişletilmiş hâliyle değişti (kapı, iki prop
  aktarımı, `sec`). Silinen dosya, test veya veri yok (C1, R5).
- **Üretim derlemesi kontrolü (adım 8):** `npm run build` çıktısında `giderPerdesiIndi` `PROD:!0` ve işaret `!0` ile derlenmiş,
  perde metni ve gider modülü kodu pakette duruyor.
- **Testler:** `yayin-perdesi.test.js` (8), `ui/gider-perdesi.test.jsx` (20: AC-1..7 ve K5 perde inik ve kalkık aynı adımlarla,
  AC-11 LAN kullanıcısı, AC-12), `ui/gider-perdesi-yedek.test.jsx` (6: AC-8, AC-9, K3 kısmi, R10 izinsiz, gerçek App uçtan uca).
- **Sonuç:** `npm test` 175 dosya / 1786 test yeşil (Electron testleri dahil), `npm run lint` 0 hata, `npm run build` başarılı.
