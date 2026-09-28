# 0043 — Menüde "Mali İşler" Grubu

| | |
|---|---|
| **Durum** | Tamamlandı (2026-09-28; commit `4146280`, dal `feat/0043-mali-isler`; plan `specs/done/0043-uygulama-plani.md`) |
| **Sahip** | Analist (spec) · geliştirme sahibi atanacak |
| **Onaylayan** | Takım Yöneticisi |
| **Etkilenen alanlar** | Kenar çubuğu (`App.jsx`), tasarım sözlüğü |
| **Bağımlı spec'ler** | 0008 (yayın perdesi) · 0009 (tasarım sözlüğü) · 0024 (Kasa sekmesi) |
| **Revizyon** | R1 (2026-09-28, mockup onayı): satır sayısı düzeltildi (kapalıyken 13 → 11, açıkken 14; Intent); grup başlığının ikonu cüzdan, alt satırlar girintili ve sol çizgiyle bağlı, ikon kutusu 26 piksel (R1); R3'ün "açık gelir" kuralı gruptaki bir ekrana geçildiği anda uygulanır, kullanıcı gruptaki bir ekrandayken grubu kapatabilir (R3); durum `localStorage` anahtarı `maliIslerAcik` (R4). |

---

## Intent

Menü on üç satıra çıktı ve kenar çubuğu küçük ekranlarda kaydırılır hale geldi. Uzunluğun kendisi kadar
önemli olan şu: para ile ilgili üç ekran (Finans, Giderler, Kasa) menüde üç ayrı yerde, aralarında Stok
ve Evrak gibi başka konular varken duruyor. Kullanıcı aynı soruyu cevaplayan ekranları menüde birbirinden
uzak görüyor.

Başarı şu demek: bu üç ekran menüde tek bir başlık altında toplanıyor, kapalıyken menü iki satır kısalıyor
(üç ekran satırı gider, bir grup başlığı gelir: on üçten on bire), ve hiçbir ekranın adı, adresi ya da yetkisi
değişmiyor. Grup açıkken menü bugünkünden bir satır uzundur (on dört); bu, başlığın bedelidir.

---

## Requirements

- **R1.** Kenar çubuğunda **"Mali İşler"** adında bir grup olur; altında sırasıyla **Finans**, **Giderler**
  ve **Kasa** bulunur.
  **Uygulama (R1):** başlık satırı öteki satırlarla aynı yükseklikte, cüzdan ikonlu ve sağda aç/kapa oku taşır
  (açıkken aşağı, kapalıyken sağa). Alt satırlar başlığın ikon hizasından girintili, solda ince bir çizgiyle
  gruba bağlı ve biraz küçüktür (ikon kutusu 26 piksel, öteki satırlarda 30).
- **R2.** **Hiçbir sekmenin adı ve kimliği değişmez.** Finans yine "Finans", kimlikler yine `finance`,
  `gider`, `kasa`.
- **R3.** Grup açılıp kapanır. Açık ekran grubun içindeyse grup **açık** gelir.
  **Uygulama (R1):** kural, gruptaki bir ekrana geçildiği anda uygulanır (menüden, Anasayfa kartından ya da
  genel aramadan). Kullanıcı gruptaki bir ekrandayken grubu kapatabilir; o durumda R6 geçerlidir.
- **R4.** Grubun açık ya da kapalı olduğu bu bilgisayarda hatırlanır. Kullanıcı ayarı değildir, sunucuya
  gitmez, yedeğe girmez (kenar çubuğunun dar kipiyle aynı desen). **Uygulama (R1):** `localStorage` anahtarı
  `maliIslerAcik` (`"1"`/`"0"`); hiç yazılmamışsa açık.
- **R5.** Grup satırı bir ekran **açmaz**; yalnız açar kapar.
- **R6.** Grup kapalıyken içindeki ekranlardan biri açıksa grup başlığı da etkin görünür, böylece kullanıcı
  nerede olduğunu kapalı menüde de görür.
- **R7.** İzinler süzüldükten sonra grupta **tek** ekran kalıyorsa grup çizilmez, o ekran bugünkü gibi düz
  satır olur. Hiç ekran kalmıyorsa grup hiç çizilmez.
- **R8.** **Dar kipte (66 piksel, yalnız ikon) grup çizilmez:** üç ekran bugünkü gibi düz ikon olarak
  listelenir. Dar kip yer sorununu genişlikte çözüyor; oraya yeni bir açılır kutu deseni sokulmaz.
- **R9.** Grup başlığı klavyeyle kullanılabilir ve açık/kapalı durumunu erişilebilirlik bilgisi olarak
  taşır.
- **R10.** Notlar ekranındaki kaydedilmemiş taslak koruması bozulmaz: gruptan bir ekrana geçerken de aynı
  onay çalışır.
- **R11.** Grup kuralı `docs/tasarim-sozlugu.md`'ye yazılır: **menüde grup, aynı soruyu cevaplayan en az üç
  ekran biriktiğinde açılır.** Bu iş o kuralın ilk uygulamasıdır.

---

## Constraints

- **C1.** Sekme kimlikleri sabit kalır. Kimlikler kullanıcıların izin kayıtlarında, `DEFAULT_USER_TABS`'ta,
  sunucunun `BOLUM_SEKMELERI` eşlemesinde ve kiosk kontrolünde geçiyor; değişmeleri veri göçü demek.
- **C2.** Yeni izin tanımlanmaz. Grubun görünürlüğü çocuklarından türer; grup için ayrı bir yetki kutusu
  yoktur.
- **C3.** Yayın perdesi (0008) davranışı korunur: perde inikken Kasa menüden süzülür, Giderler bilgi
  sayfasıyla kalır.
- **C4.** Navigasyon modeli değişmez: tek `tab` durumu, yönlendirici yok, grup yalnız çizim katmanında.
- **C5.** Kiosk kipi etkilenmez (tek görünür sekmesi Servis olan kullanıcı kenar çubuğunu hiç görmez).
- **C6.** Grubun açık/kapalı durumu makineye özeldir; birden çok kullanıcı aynı bilgisayarı paylaşırsa
  durum paylaşılır, bu kabul edilir.
- **C7.** Kullanıcıya görünen metinler Türkçedir.

### KAPSAM DIŞI

- **X1.** Sekme adlarının değiştirilmesi (Finans → Gelirler gibi) — *neden:* Takım Yöneticisi kararı; ad
  değişmeden gruplama tercih edildi, böylece kimlik göçü, test güncellemesi ve Finans ekranındaki KDV
  Karşılaştırması kartının adla çelişmesi sorunu hiç doğmuyor.
- **X2.** Menünün geri kalanının gruplanması (Analiz ile Faaliyet Haritası) — *neden:* R11'deki kural üç
  ekran diyor; iki maddelik grup bir satır kazandırır ve zorlama durur.
- **X3.** Dar kipte yan açılır liste (flyout) — *neden:* R8; uygulamada bu desenin başka örneği yok, tek
  yer için yeni etkileşim deseni açmak tutarlılığı bozar.
- **X4.** Menü sırasının ya da grupların kullanıcı tarafından özelleştirilmesi — *neden:* ayrı bir ürün
  kararı; bugün kimse istemedi.
- **X5.** Grup satırının tıklanınca ilk ekranı açması — *neden:* R5; hem açıp kapanan hem de gezinen bir
  satır iki işi karıştırır.
- **X6.** Kenar çubuğundaki çıplak sabit renklerin temizliği — *neden:* 0025'in alanı; bu iş yalnız
  yerleşimi değiştirir.
- **X7.** Menünün ekrana sığmadığı durumlar için ayrı bir çözüm (arama, sık kullanılanlar) — *neden:* bu iş
  üç satır kısaltıyor; yetmezse ayrı karar.

---

## Context

- **Bugünkü menü.** `App.jsx` içindeki `TABS` dizisi on üç satır: Anasayfa, Müşteriler, Bayiler, Stok,
  Finans, Giderler, Kasa, Evrak Yönetimi, Notlar, Servis ve Kargo Panosu, Faaliyet Haritası, Analiz,
  Ayarlar. Kenar çubuğu bu diziyi düz map ile çiziyor (`visibleTabs.map` → `nav-btn`); grup, başlık ya da
  ayraç kavramı hiç yok.
- **Görünürlük zaten süzülüyor.** `visibleTabs = gorunurSekmeler(TABS, serverMode, serverPermissions)` ve
  üstüne Kasa için perde süzgeci var. Grup bu süzülmüş listenin üstünde çizim kararıdır; yetki mantığına
  dokunmaz. R7'nin "tek çocuk kalırsa grup olmasın" kuralı doğrudan bu süzmenin sonucudur.
- **Kasa'nın kendi izin kutusu yok.** 0024'te karar verildi: Kasa, Giderler ile Finans birlikte görünüyorsa
  ve perde kalkıksa görünür. Yani grup çoğu kullanıcıda üç, gider yetkisi olmayanda tek çocukla
  (Finans) kalacak; o durumda R7 devreye girer ve kullanıcı bugünküyle aynı menüyü görür.
- **Dar kip.** Kenar çubuğunun 66 piksellik yalnız-ikon kipi var (`sidebarDar`, `localStorage`'da
  saklanıyor). Grup durumunun aynı yerde saklanması R4'ün gerekçesidir: ikisi de makine yereli görünüm
  tercihi.
- **Neden "Mali İşler".** Grup adı bir alan adıdır ve içindeki ekrandan (Finans) daha geniş olmalıdır,
  yoksa hiyerarşi ters döner. "Muhasebe" elendi, çünkü uygulama bilinçli olarak çift kayıt muhasebe
  sistemi kurmuyor (0024 C2) ve bu ad kullanıcıya mizan, bilanço gibi şeyler vaat eder. "Ön Muhasebe"
  elendi, çünkü Türkçe yazılım dilinde cari, stok ve faturayı birlikte çağrıştırıyor; Stok ve Evrak ise
  menüde ayrı duruyor. "Nakit Akışı" elendi, çünkü uygulamada olmayan bir raporu adıyla vaat ediyor
  (0024 X5).
- **Görsel kanıt bedeli.** Kenar çubuğu her ekran görüntüsünde var. Bu iş bilinçli bir görünüm
  değişikliğidir, dolayısıyla kanıt kayıtları 0 piksel fark bekleyemez; `docs/evidence/kanit-eslemesi.json`
  kuralı gereği ilgili kayıtlar `beklenen: "degisti"` ve Takım Yöneticisi onayıyla işaretlenir.
- **Test bedeli.** Arayüz testleri sekmelere adıyla tıklıyor. Adlar değişmediği için testlerin çoğu aynen
  çalışır; yalnız grubun kapalı geldiği durumda çocuğa tıklamadan önce grubun açılması gerekebilir.
  Testlerin kırılganlığını azaltmak için grup, ilk açılışta **açık** gelmelidir.

---

## Acceptance Criteria

- **AC-1.** Kenar çubuğunda "Mali İşler" grubu görünür ve altında Finans, Giderler, Kasa bu sırayla durur.
- **AC-2.** Sekmelerin adları değişmemiştir (Finans yine "Finans").
- **AC-3.** Grup kapatıldığında üç satır menüden gizlenir, açıldığında geri gelir.
- **AC-4.** Giderler açıkken menü yeniden çizildiğinde grup açık gelir.
- **AC-5.** Grup kapalıyken içindeki bir ekran açıksa grup başlığı etkin görünür.
- **AC-6.** Grup satırına tıklamak hiçbir ekranı açmaz, yalnız grubu açar kapar.
- **AC-7.** Grubun açık/kapalı durumu uygulama kapanıp açıldığında korunur.
- **AC-8.** Gider yetkisi olmayan kullanıcıda grup çizilmez; Finans bugünkü gibi düz satır olarak görünür.
- **AC-9.** Yayın perdesi inikken Kasa grupta görünmez.
- **AC-10.** Dar kipte grup başlığı çizilmez; üç ekran düz ikon olarak listelenir.
- **AC-11.** Grup başlığı klavyeyle açılıp kapanır ve açık/kapalı bilgisini taşır.
- **AC-12.** Notlar'da kaydedilmemiş taslak varken gruptaki bir ekrana geçmek onay ister.
- **AC-13.** Kiosk kullanıcısının ekranı değişmez.
- **AC-14.** Menüdeki diğer sekmelerin sırası ve davranışı değişmez.
- **AC-15.** Sekme kimlikleri değişmediği için mevcut kullanıcıların izinleri aynı ekranları açar.

---

## Definition of Done

- [x] Tüm kabul kriterleri karşılandı; kriter → test eşlemesi tabloyla gösterildi.
- [x] Her kriterin testi var ve test adı `AC-<n>: <metin>` taşıyor.
- [x] Sekme kimlikleri, izin tanımları ve sunucu eşlemeleri değişmedi (C1, AC-15).
- [x] `docs/tasarim-sozlugu.md` menü grubu kuralıyla güncellendi (R11).
- [x] Görsel kanıt eklendi (`docs/evidence/0043-*.jpg`): grup açık, grup kapalı, dar kip, tek çocuklu
      kullanıcı; aydınlık ve karanlık tema.
- [x] Kanıt eşlemesindeki ilgili kayıtlar `beklenen: "degisti"` ve Takım Yöneticisi onayıyla işaretlendi. (İlgili kayıt çıkmadı:
      kenar çubuğu `tasarim.jsx` kullanmıyor ve mevcut ekranların hiçbiri App kabuğunu çizmiyor; plan §4.)
- [x] `npm test` yeşil (çıktısıyla), `npm run lint` hata sayısı sıfır.
- [x] `CLAUDE.md` güncellendi: menüde grup kavramı, adların değişmediği ve grup kuralı yazıldı.
- [x] Takım Yöneticisi onayladı. Commit ve sürüm yayını yalnız açık talimatla.
- [x] SCORECARD dolduruldu ve spec `specs/done/` klasörüne taşındı.

---

## SCORECARD

| Ölçüt | Değer | Not |
|---|---|---|
| **Spec revizyon sayısı** | 0 | R1 mockup onayı anında işlendi (satır sayısı düzeltmesi ve uygulama notları); onaydan sonra değişiklik yok. Onaylandıktan sonra Requirements, Constraints veya Acceptance Criteria kaç kez değişti? |
| **Düzeltme turu sayısı** | 0 | İş kaç kez geri döndü? |
| **Bulgu gerçek/gürültü oranı** | 0 / 0 | Triyaj turu olmadı. Gözden geçirmede çıkan bulgulardan kaçı gerçek sorundu? |
| **Regresyon sayısı** | 0 | Tam paket (234 dosya) ve 284 mevcut görüntü değişmedi. Bu iş yüzünden bozulan, daha önce çalışan davranış sayısı. |
| **Kaçan hata** | 0 | Kapanış anında bilinen yok. Gerçek uygulamada sonradan bulunan hata sayısı. |

**Bu spec'ten çıkarılan ders:** Mockup'ı spec onayından önce göstermek, metindeki bir sayı hatasını (grup başlığının kendisinin de satır olduğu) kod yazılmadan yakaladı; yerleşim işlerinde mockup onayın parçası olmalı. İkinci ders: spec'in kanıt varsayımı ("kenar çubuğu her görüntüde var") araç okunmadan yazılmıştı; görsel kanıt bedeli yazılırken görüntü aracının neyi çizdiğine bakılmalı.
