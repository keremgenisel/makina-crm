# 0003: Uygulama Planı, Ödeme Hatırlatıcısı

| | |
|---|---|
| **Bağlı spec** | `specs/0003-odeme-hatirlaticisi.md` (R1, plan onayıyla onaylandı) |
| **Durum** | 2026-09-24: H1–H12 önerilerinin tamamı kullanıcı tarafından kabul edildi (H11 gereği spec de onaylandı); uygulama başladı (branch `feat/0001-gider`). |
| **Önkoşul** | 0001 uygulandı (commit `565b0ff`, `7957a1f`). |

Bu plan spec'i karşılamak için hangi dosyaya hangi sırayla dokunulacağını, kodda doğrulanan dayanakları ve
spec'in kodla çeliştiği ya da boş bıraktığı noktaları (bölüm 4, kararlar H1–H12) içerir.

---

## 0. Kodda doğrulanan dayanaklar

| Konu | Bulgu | Yer |
|---|---|---|
| Vade kuralı | `vadesiGectiMi(k, bugun) = !k.odendi && !!k.sonOdemeTarihi && k.sonOdemeTarihi < bugun` (bugün geçmiş sayılmaz) | `gider.js` |
| Ödenecek tutar | `odenecekTutar(k, dav)`: normal tutar + KDV, kira brüt − stopaj + KDV, personel resmi + elden | `gider.js` |
| Borç özeti kapsamı | çöp, ödenmiş, tarihsiz, yürürlük öncesi, **gider tarihi bugünden sonra** ve **ödenecek tutarı 0** olan kalemler atlanır; personel çalışan bazında toplanır | `gider.js` `borcOzeti` |
| Mevcut süzgeç | Kalem listesinde "Ödeme filtresi": Tüm / Ödenmemiş / Ödenmiş / **Vadesi geçmiş**. Süzgeç durumu `KalemListesi` içinde yerel; liste dönem raporunun kalemlerini alır (`rapor.kalemler`), dönem boşsa veya yürürlük öncesiyse liste hiç çizilmez | `gider/DonemRaporu.jsx:180-266`, `Giderler.jsx` |
| Ödendi işareti | `Giderler.odendiDegistir`: `odendi` çevrilir, `odemeTarihi` = bugün / null, audit `odendi` / `odeme_iptal`. Sunucu `giderler.odendi` için `gider_odeme` ister (`ALAN_IZINLERI`) | `Giderler.jsx:103-107`, `serverAuth.cjs` |
| Anasayfa kartları | `StatCard` ızgarası **5 × 2 = 10 kutu**, yorum: "5 üstte, 5 altta (tasarım: revize 2)"; kartlar tek sayı gösterir; liste pencereleri `showDebtors` deseniyle | `Dashboard.jsx:~313-324` |
| Eşik ayarı deseni | `SettingsTakip` (Evrak & Süreçler > Takip Süreleri) yerel state + Kaydet, `teklifTakipGun` 1–90'a **sessizce sıkıştırır** (hata mesajı yok) | `settings/SettingsTakip.jsx` |
| Gider ayarları | `SettingsGider` (Ayarlar > Giderler > Gider Ayarları) yalnız `giderYetki` ile görünür, `gider_tanim` ile düzenlenir, `giderAyarlari` JSON'unu yazar | `settings/SettingsGider.jsx`, `Settings.jsx` |
| **"Bugün" hesabı** | `today()` = `new Date().toISOString().split("T")[0]`, yani **UTC tarihi**. Türkiye'de (UTC+3) 00:00–03:00 arasında dünün tarihini döndürür. Yerel saat yardımcısı `simdiYerel()` var | `utils.js:6, 18` |
| Canlı saat | Anasayfa saniyelik saat gösteriyor; uygulama genelinde "gün döndü" sinyali yok | `Dashboard.jsx` |

---

## 1. Mimari özet

- **Saf hesap `src/lib/odemeHatirlatma.js`:** `odemeHatirlatmalari(giderler, {turler, tedarikciler, yururlukAy, esikGun}, bugun)`.
  Kapsamı `borcOzeti` ile aynı kurallarla süzer, "vadesi geçmiş" için **`vadesiGectiMi`'yi çağırır** (C2),
  yalnız "yaklaşan" (bugün ≤ vade ≤ bugün + eşik) kavramını ekler. Çıktı: iki sayı, iki bölümlük sıralı liste
  (personel satırları toplu), ve süzgecin kullanacağı kalem kimlik kümesi.
- **Tek kaynak:** Anasayfa kartı, liste penceresi ve Giderler süzgeci aynı fonksiyonu aynı `bugun` ve eşikle çağırır.
- **Canlı bugün:** `src/hooks/useBugun.js` yerel tarih (UTC değil) döndürür; dakikada bir ve pencere odaklanınca
  kontrol eder, gün değişince yeniden çizer (C3).

---

## 2. Değişecek ve eklenecek dosyalar

### Saf katman
| Dosya | Değişiklik |
|---|---|
| `src/lib/odemeHatirlatma.js` **(yeni)** | `odemeHatirlatmalari`, `gunFarki(a, b)` (metin tarihten gün farkı, saat dilimi bağımsız), `hatirlatmaEsikDogrula(deger)` (0–365 tam sayı), `vadeEtiketi(k)` ("Çek vadesi" / "Son ödeme"), `HATIRLATMA_ESIK_VARSAYILAN = 7` |
| `src/lib/utils.js` | `yerelBugun()`: yerel takvim günü `YYYY-MM-DD` (`simdiYerel` ile aynı yöntem). `today()`'e **dokunulmaz** (H1) |
| `src/lib/gider.js` | `odemeDurumuDegistir(k, bugun)`: `Giderler.odendiDegistir`'in kayıt dönüşümü saf yardımcıya taşınır; Anasayfa ve Giderler aynısını kullanır (H8). Başka değişiklik yok |
| `src/hooks/useBugun.js` **(yeni)** | Canlı yerel gün (C3, AC-22) |

### Kalıcılık
| Dosya | Değişiklik |
|---|---|
| `appSettings.giderAyarlari.hatirlatmaEsikGun` | Yeni sütun yok (C1); mevcut JSON sütunu taşır, sunucu üzerinden paylaşılır |
| `scripts/tests/db-roundtrip.cjs` | `giderAyarlari.hatirlatmaEsikGun` gidiş-dönüş |

### Arayüz
| Dosya | Değişiklik |
|---|---|
| `src/components/gider/OdemeHatirlatma.jsx` **(yeni)** | `OdemeHatirlatmaKarti` (iki sayı) ve `OdemeHatirlatmaListesi` (iki bölüm, personel satırı kapalı, ödendi düğmesi `gider_odeme` ile, boş durum) |
| `src/components/Dashboard.jsx` | Kart (yalnız `giderYetki`), liste penceresi, "Giderlerde Görüntüle" (H2) |
| `src/components/Giderler.jsx` | Ödeme süzgecinin durumu üst bileşene alınır; "Hatırlatma kapsamı" açıkken dönem seçici devre dışı, açıklama yazısı, kapsam listesi dönemden bağımsız (H6); `bugun` → `useBugun` |
| `src/components/gider/DonemRaporu.jsx` | `KalemListesi`: ödeme süzgeci dışarıdan yönetilebilir, "Hatırlatma kapsamı" seçeneği, kapsamdaki satırlar vurgulu (geçmiş kırmızı, yaklaşan amber) |
| `src/components/settings/SettingsGider.jsx` | "Ödeme hatırlatma eşiği (gün)" alanı, 0–365 denetimi ve hata metni (H3) |
| `src/App.jsx` | Dashboard'a `giderYetki`, gider verisi (yetkisizde boş dizi), `setGiderler`, eşik; `onGoGiderHatirlatma` (sekme + süzgeç); Giderler'e başlangıç süzgeci |

### Dokunulmayanlar
`serverAuth.cjs` / `server.cjs` (yeni bölüm veya izin yok; `odendi` zaten `gider_odeme` ister), `db.cjs` şeması,
`merge.js`, Servis Panosu alarm ve ses kanalı (R9), `SettingsTakip.jsx`, `today()`.

---

## 3. Adım sırası

1. **Saf katman:** `yerelBugun`, `gunFarki`, `odemeHatirlatmalari`, eşik doğrulama, `odemeDurumuDegistir` + motor testleri.
2. **Canlı gün:** `useBugun` + sahte zamanlayıcılı test.
3. **Giderler:** süzgeci yukarı alma, hatırlatma modu, vurgu; mevcut Giderler testleri kilit.
4. **Anasayfa:** kart, liste penceresi, yönlendirme; App bağlantısı.
5. **Ayar:** eşik alanı, doğrulama, roundtrip.
6. **Doğrulama:** çapraz test (kart sayısı = süzgeç sayısı), tam paket, lint, build, CLAUDE.md.

---

## 4. Riskler ve emin olmadığım noktalar (öneri + gerekçe)

**H1. `today()` UTC tarihi döndürüyor (C3 ile doğrudan çelişki).** Türkiye'de gece 00:00–03:00 arasında `today()` dünü
verir; kiosk gibi açık kalan bir PC'de gece yarısından sonra "bugün ödenecek" kalem üç saat daha "bugün" kalır, AC-22
de o aralıkta geç tetiklenir.
*Öneri:* Hatırlatma ve Giderler'in `bugun` değeri yeni `yerelBugun()`'den gelir. Global `today()` bu işte
**değiştirilmez**: yüzlerce kayıt yolunda tarih damgası üretiyor, değiştirmek ayrı ve riskli bir iş. Ayrı iş olarak
not edilir.

**H2. Anasayfa ızgarası 5 × 2 sabit ve kartlar tek sayı gösteriyor.** Spec "mevcut desen" diyor ama iki ayrı sayı
istiyor (R2) ve on birinci kutu tasarım kararı olan 5 × 2 düzenini bozar.
*Öneri:* Kart, ızgaranın hemen altında kendi satırında, aynı `StatCard` görsel dilinde (sol renkli kenar, başlık,
tıklanınca pencere) ama iki sayıyı yan yana gösteren tek bir kart olarak durur: "Vadesi geçmiş **3** · Yaklaşan
**5** (7 gün)". Gider yetkisi olmayanda satır hiç çizilmez, ızgara değişmez.

**H3. Ayarın yeri.** Spec bağlamı "Takip Süreleri"ni öneriyor, R5 ise yetkiyi `gider_tanim`'e bağlıyor. Takip
Süreleri gider yetkisi olmayana da açık ve `teklifTakipGun` değeri sessizce sıkıştırıyor (AC-23 hata mesajı istiyor).
*Öneri:* Alan **Ayarlar > Giderler > Gider Ayarları**'nda durur: zaten gider yetkisine kapılı, `gider_tanim` ile
düzenlenir ve aynı `giderAyarlari` nesnesini yazar. Tek Kaydet düğmesi korunur; geçersiz eşik tüm kaydı durdurur ve
nedeni yazar.

**H4. Ödenecek tutarı 0 olan kalem.** Borç özeti bunları atlıyor, spec R1 açıkça söylemiyor.
*Öneri:* Aynı kural (atlanır). Gerekçe: R1 "borç özetiyle aynı kurallar" diyor; ayrıca ödenecek şeyi olmayan bir
kalemi hatırlatmak anlamsız.

**H5. Personel satırının yeri.** Personel tek satırda toplanıyor (R3), ama liste iki bölümlü (R4) ve vadeye göre
sıralı (AC-9).
*Öneri:* Her bölümde (vadesi geçmiş, yaklaşan) en fazla bir "Çalışanlar · N kalem · toplam X TL" satırı; satır,
bölümündeki en eski personel vadesinin yerinde sıralanır; açılınca çalışanlar vade sırasıyla, her biri tarih ve
gün farkıyla görünür. Kart ve süzgeç sayıları **kalem** sayar (personel kalemleri tek tek), böylece AC-14 eşitliği
bozulmaz.

**H6. Giderler'de hatırlatma modu.** Bugün süzgeç, dönem raporunun kalemlerinin üzerinde çalışıyor; dönem boşsa veya
yürürlük öncesiyse liste hiç çizilmiyor. R8 "dönem filtresi devre dışı, tüm zamanlar" istiyor.
*Öneri:* "Hatırlatma kapsamı" seçilince Dönem Raporu görünümü dönem kartlarını gizler, dönem seçici pasifleşir ve
"Hatırlatma kapsamı dönemden bağımsızdır; tüm zamanlardaki kalemler gösteriliyor" yazısı çıkar; liste
`odemeHatirlatmalari`'nın kalemlerini gösterir (dönem kalemlerini değil). Süzgeçten çıkınca her şey eski hâline döner.
Dönem kartlarını gizlememizin nedeni: pasif dönemin kartlarıyla dönemsiz bir listenin yan yana durması okunur değil.

**H7. Gider tarihi gelecekte.** R1 ve AC-21 bu kalemleri dışlıyor; "gelecek" canlı `bugun`'e göre. Gün dönünce kalem
kendiliğinden kapsama girer (AC-22 ile aynı mekanizma). Ek karar gerekmiyor, testle sabitlenir.

**H8. Ödendi işareti iki yerden.** Anasayfa penceresinden işaretleme, Giderler'deki ile aynı kaydı ve aynı audit
satırını üretmeli. *Öneri:* Kayıt dönüşümü `gider.js odemeDurumuDegistir`'e taşınır; iki ekran da onu ve aynı
`logAction` çağrısını kullanır. Pencerede yalnız "Ödendi" yönü vardır (ödenen kalem listeden düştüğü için geri alma
düğmesi Giderler'de kalır).

**H9. Canlı günün sıklığı.** C3 "en az saatte bir" diyor. *Öneri:* Dakikada bir yalnız tarih metnini karşılaştıran
ucuz bir kontrol + `focus` ve `visibilitychange`; yeniden çizim yalnız gün değişince olur. Saatte birde gece yarısından
sonra 59 dakikaya kadar gecikme kalır, dakikalık kontrol bunu kapatır ve maliyeti ihmal edilebilir.

**H10. Gün farkı metni.** *Öneri:* "3 gün geçti" / "bugün" / "3 gün kaldı"; hesap `Date.UTC` ile iki metin tarihin gün
numarası farkı (saat dilimi ve yaz saatinden bağımsız). Satırda tarih etiketi ödeme yöntemi Çek ise "Çek vadesi",
değilse "Son ödeme".

**H11. Spec durumu "Taslak".** DoD "Takım Yöneticisi onayladı" istiyor. *Öneri:* Bu planın onayı spec onayı da sayılır
ve spec başlığı "Onaylandı" olarak güncellenir; aksi hâlde kodlamadan önce spec onayını bekleriz.

**H12. Görsel kanıt.** 0001 ve 0002'de sizin kararınızla alınmadı. *Öneri:* Burada da alınmasın, DoD'dan düşülsün.

**Genel riskler**
- *Giderler süzgecini yukarı almak:* `KalemListesi` bugün kendi süzgecini tutuyor; kontrollü/kontrolsüz iki kullanımı
  desteklemek yerine süzgeç durumu tamamen üst bileşene alınır. Mevcut Giderler ve tedarikçi testleri (AC-13, AC-46…)
  bu değişikliği kilitler.
- *Sayı eşitliği (AC-14):* kart, pencere ve süzgeç aynı fonksiyonu aynı `bugun` ve eşikle çağırmazsa sayı ayrışır;
  çapraz test ikisini aynı veriyle çizip karşılaştırır.
- *Yetkisiz veri sızıntısı:* App, yetkisiz kullanıcıda Anasayfa'ya boş gider dizisi verir (kart çizilmese bile sayılar
  hesaplanamasın).

---

## 5. Kabul kriteri ↔ test eşlemesi

`M` = `tests/odeme-hatirlatma.test.js` (saf hesap), `D` = `tests/ui/dashboard-odeme-hatirlatma.test.jsx`,
`G` = aynı dosyadaki "AC-14: Giderler süzgeci ile Anasayfa kartı aynı sayıyı verir" bloğu, `B` = aynı dosyadaki AC-22 ve
"pencere odaklanınca" testleri (`useBugun` gerçek Anasayfa üzerinden sınanır), `S` = `tests/ui/gider-settings.test.jsx` (genişletme).

| Kriter | Test | Kanıt |
|---|---|---|
| AC-1, AC-2 | M | eşik 7: +3 gün dahil, +10 gün hariç |
| AC-3, AC-4, AC-26 | M + D | dün → geçmiş, ayrı bölüm ve kırmızı; bugün → yaklaşan, "bugün" etiketi, geçmiş değil |
| AC-5, AC-7 | M | ödendi (vadesi geçmiş bile) ve vadesiz kalem kapsam dışı |
| AC-6 | D | pencerede Ödendi → kart sayısı bir azalır, satır düşer, `odemeTarihi` yazılır |
| AC-8 | M + D | Çek + vade +3 gün → kapsamda, etiket "Çek vadesi" |
| AC-9 | M | vade artan, eşitse ödenecek tutar azalan, eşitse kimlik; iki çalıştırma aynı sıra |
| AC-10 | D | satırda taraf, ödenecek tutar (sütun başlığı "Ödenecek tutar"), vade, gün farkı |
| AC-11 | M + S | eşik 15'te +10 gün dahil; ayar 15 kaydedilir |
| AC-12 | M | eşik 0: yalnız geçmiş ve bugün |
| AC-13 | D | kapsam boş → kart 0 · 0, pencerede boş durum mesajı |
| AC-14 | G + çapraz (D ile aynı veri) | süzgeç "Hatırlatma kapsamı" → vurgulu satırlar, dönem seçici pasif ve açıklama, kalem sayısı = kartın iki sayısının toplamı |
| AC-15 | D | `Audio`, `Notification`, `window.open` çağrılmaz; açılışta pencere açılmaz |
| AC-16 | D | `giderYetki` yoksa kart ve sayılar DOM'da yok |
| AC-17 | M + D | personel tek satır (adet + toplam), adlar yalnız açınca |
| AC-18 | M + D | 10.000 + %20 → 12.000 |
| AC-19 | M | çöpteki kalem yok, geri alınınca var |
| AC-20 | M | yürürlük öncesi tarihli, vadesi geçmiş kalem yok |
| AC-21 | M | gider tarihi gelecekte → yok; gün gelince var (H7) |
| AC-22 | B + D | sahte saatle gece yarısı geçilince kart güncellenir: "bugün" → "geçmiş" |
| AC-23 | S + M | −1, 366, "abc" reddedilir, neden yazılır, ayar değişmez |
| AC-24 | D | `gider_odeme` yoksa liste var, Ödendi düğmesi yok |
| AC-25 | D | kartta iki ayrı sayı |
| DoD: C2 sarmalama | M | geçmiş kümesi = `vadesiGectiMi` true olan kapsam kalemleri (rastgele veriyle) |
| DoD: gün sınırı / saat dilimi | M | `process.env.TZ = "Europe/Istanbul"` altında 00:30 yerel saatte `yerelBugun` o günü verir; `gunFarki` yaz saati/ay sonu sınırlarında doğru |
| DoD: C1 | `scripts/tests/db-roundtrip.cjs` | `giderAyarlari.hatirlatmaEsikGun` (ve 0002'nin `ortakGiderKaynagi`) gidiş-dönüş |
| DoD: yeni izin yok | D + `tests/server-authz.test.js` (mevcut) | görünürlük `giderYetki`; ödendi yolu mevcut `gider_odeme` alan denetimi |

---

## 6. Onay istenen kararlar (özet)

| # | Karar | Öneri |
|---|---|---|
| H1 | "Bugün" | Hatırlatma ve Giderler yerel tarih (`yerelBugun`); global `today()` ayrı iş |
| H2 | Anasayfa yerleşimi | 5 × 2 ızgaranın altında, iki sayılı tek kart |
| H3 | Eşik ayarının yeri | Ayarlar › Giderler › Gider Ayarları (gider yetkisine kapılı) |
| H4 | Ödenecek tutarı 0 kalem | Borç özeti gibi atlanır |
| H5 | Personel satırı | Bölüm başına bir toplu satır; sayılar kalem sayar |
| H6 | Giderler hatırlatma modu | Dönem kartları gizli, seçici pasif, açıklama, kapsam listesi |
| H7 | Gelecek tarihli gider | Canlı `bugun`'e göre dışlanır |
| H8 | Ödendi işareti | Ortak saf yardımcı + aynı audit; pencerede yalnız "Ödendi" |
| H9 | Canlı gün sıklığı | Dakikada bir + odak/görünürlük |
| H10 | Gün farkı ve etiket | "N gün geçti / bugün / N gün kaldı"; Çek'te "Çek vadesi" |
| H11 | Spec durumu | Plan onayı spec onayı sayılır |
| H12 | Görsel kanıt | Alınmaz |

---

## 7. Uygulama notları (2026-09-24)

- Plandan sapma yok. `KalemListesi` ödeme süzgeci isteğe bağlı olarak dışarıdan yönetiliyor (`odemeFiltre`/`onOdemeFiltre`);
  verilmezse eski yerel davranış sürer. "Hatırlatma kapsamı" seçeneği yalnız hatırlatma sonucu verildiğinde çizilir.
- Kapsamdaki satırlar dönem görünümünde de vurgulu (geçmiş kırmızı, yaklaşan amber, `data-hatirlatma`).
- Anasayfa'dan gelişte App `giderOdemeFiltresi` durumunu tutar, Giderler sekmesinden çıkınca sıfırlanır.
- Giderler'in `bugun` değeri artık `useBugun` (yerel tarih); dönem varsayılanı gece 00:00–03:00 arasında artık doğru ayı açar.
- Global `today()` UTC sorunu ayrı iş olarak açık (H1).

## 8. Triyaj düzeltmeleri (2026-09-24)

| # | Bulgu | Düzeltme | Test |
|---|---|---|---|
| 1 | Seçili ay boşken (her ayın başı) veya yürürlük öncesiyken liste çizilmediği için Giderler'den "Hatırlatma kapsamı"na ulaşılamıyordu (§7'deki "bilinen sınır") | Dönem seçicinin yanında "Hatırlatma kapsamı (N)" düğmesi; liste içindeki seçenek de kaldı | `ui/dashboard-odeme-hatirlatma.test.jsx` (boş ay, yürürlük öncesi) |
| 2 | Saat dilimi testi TZ sabitlemiyordu; CI (UTC) `today()`'e geri dönüşü yakalamazdı | Test bloğu `TZ=Europe/Istanbul` kurar, ön koşulu doğrular, 00:30'da `today()` ≠ `yerelBugun()` olduğunu ve hatırlatıcının yerel güne baktığını sabitler; `TZ=UTC` altında geri dönüşün yakalandığı denendi | `odeme-hatirlatma.test.js` |
| 3 | Anasayfa "Ödendi" düğmesi durumu çeviriyordu; satır eskiyken kalem başka yoldan ödenmişse ödemeyi geri alırdı | Yeni `gider.odendiIsaretle` durumu ayarlar, mevcut ödeme tarihini korur; Giderler'deki çevirme aynen kaldı | `ui/dashboard-odeme-hatirlatma.test.jsx` |
| 4 | Personel satırında okunmayan `odenecekK: Infinity`; bölüm sıralamasının kararlı sıralamaya dayandığı belli değildi | Alan kaldırıldı, yorum eklendi | `odeme-hatirlatma.test.js` |
