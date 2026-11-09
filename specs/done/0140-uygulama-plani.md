# 0140 Uygulama planı: tedarikçi odaklı, düzenlenebilir sipariş listesi

| | |
|---|---|
| **Spec** | `specs/done/0140-tedarikci-odakli-siparis-listesi.md` (Tamamlandı, 2026-11-09) |
| **Dal** | `feat/0140-siparis-listesi` (worktree `../wt0140`, `main` `fcb57633` üstünde) |
| **Durum** | **Tamamlandı** (2026-11-09, commit `f7812271`); onay: Takım Yöneticisi 2026-11-09, on beş önerinin hepsi; spec revizyon 2, kararlar 33–47 |

---

## 0. Ölçülen başlangıç durumu

- Motor `src/lib/siparisIhtiyaci.js` (334 satır): set döngüsü (`k.siparis` → `patlatmaHam`), sonra bileşen siparişi, sonra
  kesit geçişi `if (!k.malzemeli || k.siparis <= 0) continue;`, kesit anahtarı `[m.id, yontem, bicim, ...kesit].join("|")`.
  Düzenleme bu sıranın içine girdi olarak sokulabilir (D-R4/2'nin altı adımı motorun bugünkü sırasıyla örtüşüyor).
- Ekran `src/components/maliyet/SiparisIhtiyaci.jsx` (154 satır), belge `src/lib/siparisRaporu.js` (33), düğme
  `src/components/rapor/SiparisRaporuDugmesi.jsx` (13). Model listesi `uretimdekiAdlar(modelSatirlari)` ile, yani Makina Maliyeti
  zincirinden geliyor (Ölçüm A).
- Ekrana bağlı testler: `siparis-0134` (saf ve UI), `ui/siparis-0134-app`, `maliyet-yerlesim` (Electron, `scripts/tests/layout/
  maliyet.jsx`), `ui/makina-maliyeti-0088`, `donan-maliyet-0136` (saf ve UI: dosya listesi ve "siparis" görünümü),
  `ui/maliyet-kalemleri-0135-app` (ekranın `MALZEME_KALEMI_YOK_METNI`'sini ve test kimliklerini okuyor), `uretimdeki-modeller-0091`
  ve `plan-adetler-0093` (`izinli` kümesi), `kilit-alanlari`, kanıt aracı (`maliyet-siparis*` beş ekran) ve eşleme.
- Stok'a bugün tedarikçi dizisi, `standardModels`/`customModels` ayrı ayrı ve `appSettings` gidiyor mu: Stok `models={allModels}`,
  `appSettings`, `uretimPartileri`, `malzemeler`, `factory`, `giderYetki` alıyor; `tedarikciler` almıyor (Ölçüm E).
- `PartManager` tedarikçi süzgeci yalnız `kalemTedarikciIdleri`'ni okuyor (satır 358-387).

---

## 1. Değişecek ve eklenecek dosyalar

### Kaynak

| Dosya | Değişiklik |
|---|---|
| `src/lib/siparisIhtiyaci.js` | `siparisIhtiyaci(veri, secenek)` ikinci parametre (opt-in, C-R11): `{ tedarikciOdakli, duzenleme: { parca: { [partId]: { adet, kapali } }, kesit: { [anahtar]: { deger, kapali } } }, secilenTedarikciler }`. Düzenleme D-R4/2 sırasıyla uygulanır (set adedi → patlatma → bileşen siparişi → parça adedi → kesitler son adetlerden). Kesit geçişi bir yardımcıya alınır ve iki kez koşar: öneri adetleriyle (D-R5/2'nin "bütün parçaları kapatılan kesit" satırını kurmak için) ve son adetlerle. Elle kilo/boy: `siparisKg` (boyda `boyAdedi`) değer olur, asgari farkı uygulanmaz ama altındaysa `asgariUyari`, boy adedi ve artan `null` + nedeni, tutar değer × fiyat × kur (kuruş). Yeni alan `tedarikciBolumleri` yalnız `tedarikciOdakli` ile: `[{ tedarikciId, ad, silinmis, yok, hazirParcalar:[…], malzemeler:[…kesit], tutarTLK }]` + `belirtilmemis { parcalar, kesitler }` + `satirsizSecilen`. Parça satırına (yalnız düzenleme ya da opt-in verilince) `oneri`, `duzenlendi`, `kapali`, `tutarK` (yalnız malzemesiz parçada, C-R5/2), `tutarNeden`. Bugünkü beş alan, `TEDARIKCISIZ` ve dönüşün öteki anahtarları dokunulmaz (C2). Yeni metin sabitleri: `TEDARIKCI_BELIRTILMEMIS` (C-R7/2), üç boş durum nedeni (C-R12), `CIFT_SAYIM_DEGIL` (C-R8), `HAMMADDE_SUZGEC_NEDENI` (C-R3), `GECICI_DUZENLEME` (D-R6), doğrulayıcılar `siparisAdediDogrula` (0–1.000.000 tam sayı, boş = 0) ve `elleKiloDogrula` (belirsiz sayı reddi), `tedarikciSecenekleri(veri)` (hammadde ya da Ana tedarikçi, canlı), `duzenlemeSayilari` (D-R8/2). Hesap ve aritmetik burada; ekran yazmaz (C1). |
| `src/lib/siparisRaporu.js` | Belge tedarikçi bölümlerinden: tek belge, başlık bandı bir kez, ilk bölüm hariç `page-break-before` (`belgeAcilis`'in `ekStil`'i), bölüm başında tedarikçi adı ve girdi özeti, MODELLER kutusu, iki tablo (sütunlar tek sabit `BELGE_SUTUNLARI`, para sütunları `paraGoster` ile), elle düzenlenmiş satır işareti, PARÇA İHTİYACI tablosu çıkar, belirtilmemiş bölüm girmez, kapalı satır ve sıfır adet girmez. Kaçış `raporSunumu`'nun bugünkü yoluyla. |
| `src/components/stock/SiparisPenceresi.jsx` **(yeni, tek dosya)** | `Modal wide`. Bugünkü ekranın girdi kısmı (parti seçici yalnız canlı partilerle, model satırları), model listesi `uretimdeSuzulmusModeller(appSettings, katalogModelleri, { korunan })` (B-R7), tedarikçi seçici (çoklu seçim listesi), düzenleme durumu (`useState`, pencere kapanınca kaybolur), "Önerilere dön", başlıkta iki sayı, tedarikçi bölümleri (iki alt bölüm, öneri ve düzenlenebilir iki sütun, kapatma anahtarı, satır hatası), "tedarikçisi belirtilmemiş" katlanmış bölüm, "Parça ihtiyacı" katlanabilir tam tablo (C-R10). Para sütunları yalnız `giderYetki` ile. Motor `useMemo` ile tek çağrı. Yazmaz, kilit almaz. |
| `src/components/CokluSecimListesi.jsx` **(yeni)** ya da `tasarim.jsx`'e `CokluSecim` | C-R2/2: arama kutulu onay kutusu listesi, "Tümünü seç", "Temizle", seçilenler pil olarak. Öneri R10'da. |
| `src/components/rapor/SiparisRaporuDugmesi.jsx` | Yeni belge girdisi, pasiflik nedeni (E-R7, AC-40). |
| `src/components/maliyet/SiparisIhtiyaci.jsx` | **Silinir** (B-R2). Ekranın metin sabitleri (`MALZEME_KALEMI_YOK_METNI` vb.) motora ya da pencereye taşınır. |
| `src/components/MakinaMaliyeti.jsx` | `GORUNUMLER`'den "siparis" çıkar (dört görünüm), `SiparisIhtiyaci` çağrısı kalkar. |
| `src/components/PartManager.jsx` | Başlıkta "Sipariş Listesi" düğmesi (`canDo("stock_siparis_listesi")`), pencereyi açar. Parça kartında Ana tedarikçi alanı (yalnız `giderYetki`; malzeme kartının seçicisinin ikizi, hammadde işaretliler başta), kayıt fonksiyonu `tedarikciId`'yi her çağrıda siler ve yalnız doluyken yazar; yetkisizde eski değer korunur. Tedarikçi süzgeci `kalemTedarikciIdleri(p)` ∪ `p.tedarikciId` (A-R6). |
| `src/components/Settings.jsx` | `yedekparca` paneline pencerenin prop'ları: ham tedarikçi dizisi **kapısız** (B-R4/2; bugünkü `giderYetki ? tedarikciler : []` yalnız Ana tedarikçi alanının listesi için kalır), `uretimPartileri`, `partStock`, `appSettings`, `factory`, `standardModels`/`customModels`, `serverPermissions`. |
| `src/components/Stock.jsx`, `src/components/stock/PartStokTab.jsx` | "Parça/Yedek Parça Stoğu" başlığında aynı düğme ve pencere (B-R6). Yeni prop'lar: `tedarikciler`, `rawTedarikciler`, `standardModels`, `customModels`. |
| `src/App.jsx` | Stok'a `tedarikciler={liveTedarikciler}`, `rawTedarikciler={tedarikciler}`, `standardModels`, `customModels` (kapısız); Ayarlar'a zaten giden diziler. |
| `src/components/settings/serverPermissionDefs.js` | `STOCK_ACTION_GROUPS`'a yeni kimlik `stock_siparis_listesi` ("Sipariş listesini aç"); `UserManager` grupları buradan çizdiği için ayrı ekran değişikliği gerekmez (ölçülecek). |
| `src/lib/gider.js` | `kalemdeGecenTedarikciler(parts, disIslem yok, malzemeler)` değer şekline `ana`, `anaCop`, `malzeme` sayıları (A-R5, A-R5/2); `tedarikciKullanim` (çöpe atma penceresini besleyen) Ana ve malzeme bağını **saymaz** (AC-57). Ad listesi yardımcısı `tedarikciParcaAdlari(tid, parts)` (en çok üç ad + "ve n parça daha", çöpte "(silinmiş parça)"; 0123 `adListesi` emsali). Neden metinleri öneri R6'da. |
| `src/components/gider/Tedarikciler.jsx` | Kullanım hücresinde Ana tedarikçi sayısı ve çöpteki sayı (AC-58); "silinemez" penceresinde ad listesi (AC-61). App'ten `malzemeler` prop'u. |
| `src/components/settings/SettingsTrash.jsx` | Kalıcı Sil, çöpü boşalt: `kalemdeGecenTedarikciler(rawParts, …, rawMalzemeler)`; satır nedeni ad listesiyle (AC-61). |
| `src/App.jsx` (temizlik) | Otuz günlük temizliğin `koru`'su aynı haritadan (Ana ve malzeme dahil, AC-9). |
| `electron/db.cjs` | `parts.tedarikciId INTEGER` (dört nokta; `PARTS_TEDARIKCI_COLUMN`; okumada boşsa anahtar yok, C6). |
| `src/lib/merge.js` | Yeni parçanın `tedarikciId`'si yeniden atanan tedarikçi kimliğini izler (hammadde kırılımının eşlemesinin yanında, C7). |
| `src/lib/kilitAlanlari.js` | `KILITSIZ_DOSYALAR`: `maliyet/SiparisIhtiyaci.jsx` kaydı `stock/SiparisPenceresi.jsx`'e taşınır (gerekçe: salt okunur, yazmaz). |
| `src/lib/uretimdekiModeller.js` | `URETIM_ISARETI_IPUCU` yeni yeri sayar (sipariş listesi). |
| `docs/tasarim-sozlugu.md` | "Çoklu seçim listesi" maddesi (C-R2/2). |
| `CLAUDE.md` | 0134 bölümü ekranın yeni yeriyle güncellenir, yeni 0140 bölümü. |

### Testler

| Dosya | Kapsam |
|---|---|
| `tests/siparis-0140.test.js` **(yeni)** | Motor: opt-in alan, tedarikçi bölümleri, hazır parça satırı ve tutarı, belirtilmemiş, çöpteki tedarikçi, seçici seçenekleri, düzenleme (adet, kapatma, set sırası, elle kilo, kapanan kesitin elle kilosu), doğrulayıcılar, sayılar, boş durum nedenleri, taramalar (ekran aritmetik yazmaz, pencere maliyet motorunu çağırmaz, yazdırma API'si yalnız `rapor/`'da, metinler motorda). |
| `tests/siparis-0140-kiyas.test.js` **(yeni)** | AC-51, AC-52, AC-93, AC-94: parametresiz ve opt-in çağrıda bugünkü alanlar spec öncesi altınla birebir (`tests/fixtures/0140-once.json`, `YAZ_0140=1` ile `main`'den). |
| `tests/siparis-raporu-0140.test.js` **(yeni)** | Belge: AC-16, AC-42–AC-50, AC-80, AC-90–AC-92 (sayfa sonu, sütunlar, işaret, kaçış, para sütunu yokluğu). |
| `tests/ui/siparis-0140.test.jsx` **(yeni)** | Pencere (gerçek `PartManager` ve `PartStokTab` içinden): AC-11, AC-15, AC-19–AC-28 (ekran), AC-29–AC-41, AC-64, AC-65, AC-67, AC-68, AC-73–AC-79, AC-81–AC-89. |
| `tests/ui/siparis-0140-app.test.jsx` **(yeni)** | Gerçek App: AC-12, AC-13, AC-14, AC-17, AC-37, AC-53, AC-54, AC-55, AC-71, AC-72 (iki giriş, izin, kaydedilen gövde, tedarikçi adı yetkisizde, canlı parti). |
| `tests/ana-tedarikci-0140.test.js` **(yeni)** | Saf: AC-6, AC-10 (`buildMergePlan`), AC-56, koruma haritası ve ad listesi, `tedarikciKullanim` bağı saymaz. |
| `tests/ui/ana-tedarikci-0140.test.jsx` **(yeni)** | Parça kartı AC-1–AC-3, süzgeç AC-62/63, Tedarikler AC-57/58/61, Çöp Kutusu AC-7/8/60/61, malzeme bağı AC-59, gerçek App'te otuz günlük temizlik AC-9. |
| `scripts/tests/db-roundtrip.cjs`, `db-clean-install.cjs` | AC-4, AC-5. |
| Güncellenen ("spec 0140 ile") | `siparis-0134.test.js` (AC-61, AC-88 dosya yolu taramaları), `ui/siparis-0134.test.jsx` ve `ui/siparis-0134-app.test.jsx` (ekran yeni pencerede; ters çevrilen 0134 kriterleri §4'te), `maliyet-yerlesim.test.js` + `scripts/tests/layout/maliyet.jsx` (dört sekme), `ui/makina-maliyeti-0088` (dört etiket), `donan-maliyet-0136` (dosya listesi), `ui/donan-maliyet-0136` ("siparis" görünümü), `ui/maliyet-kalemleri-0135-app` (sabitin yeni yeri, pencere), `uretimdeki-modeller-0091` ve `plan-adetler-0093` (`izinli` kümesine pencere, `MakinaMaliyeti.jsx` kalır), `kilit-alanlari`, `gider-gizlilik` (0088 X4 eşiği). |

---

## 2. Adım sırası

1. **Worktree, altın, taban.** `../wt0140`. `main` kodundan motorun altını (parametresiz çağrı, 0134 ve 0135 fikstürlerinin verisiyle;
   `0140-once.json`) ve görüntü tabanı (`maliyet-siparis*`, Parça/Yedek Parça ve Parça Stoğu ekranları, Tedarikler, Çöp Kutusu).
2. **Veri:** `parts.tedarikciId` dört nokta, birleştirme eşlemesi, Electron testleri.
3. **Motor:** opt-in seçenek, düzenleme sırası, iki kesit geçişi, tedarikçi bölümleri, doğrulayıcılar, metinler; saf testler ve kıyas.
4. **Belge:** `siparisRaporu.js` yeni biçim, düğme; belge testleri.
5. **Koruma:** `gider.kalemdeGecenTedarikciler` genişlemesi, Tedarikler, Çöp Kutusu, App temizliği; testler.
6. **Parça kartı:** Ana tedarikçi alanı, süzgeç; testler.
7. **Pencere ve çoklu seçim:** `SiparisPenceresi.jsx`, `CokluSecimListesi`, sözlük maddesi.
8. **Giriş noktaları ve kaldırma:** PartManager ve PartStokTab düğmeleri, izin kimliği, prop zinciri (App, Settings, Stock),
   Makina Maliyeti'nden görünümün kalkması, eski ekran dosyasının silinmesi; 0134/0135/0136/0088/0091/0093 bekçilerinin güncellenmesi.
9. **Gerçek App testleri**, mutasyon ölçümü (düzenleme sırası, set kapatma, tutar çift sayımı, para gizliliği, koruma kapıları).
10. **Kanıt:** yeni ekranlar (pencere: iki alt bölüm, belirtilmemiş, düzenlenmiş satır, boş durum, hata, yetkisiz), değişen ekranlar
    (Makina Maliyeti çubuğu, parça kartı, Tedarikler, Çöp Kutusu), eşleme anahtarının yeni dosyaya taşınması.
11. **Kapanış hazırlığı:** lint, `npm test` (Electron dahil), CLAUDE.md, sözlük, sürüm notu.

---

## 3. Riskler ve emin olmadığım noktalar (her birinde öneri ve gerekçe)

**R1. Ana tedarikçisi olmayan malzemeli parça "tedarikçisi belirtilmemiş" bölümüne girer mi?**
C-R7 "Ana tedarikçisi girilmemiş parçalar" diyor, C-R7/2 ilk gün üç yüz satırı (0139'un doksan bir parçasının hepsi malzemeli)
bu yüzden kapalı başlatıyor. Ama malzemeli parçanın satın alınacak şeyi malzemesidir ve o, malzemenin tedarikçisi altında zaten
çıkıyor; parça atölyede işleniyorsa ona tedarikçi girilmesi beklenmez. *Önerim:* belirtilmemiş bölümü yalnız **malzemesiz** (hazır)
parçaları ve tedarikçisi girilmemiş **malzemeleri** listeler; Ana tedarikçisi olmayan malzemeli parçalar satır açmaz, bölümün
başlığının altında tek cümleyle sayılır ("n malzemeli parça Ana tedarikçisiz; malzemesi kendi tedarikçisinde"). *Gerekçe:* kullanıcı
eksik bilgiyi tamamlamak için bu bölüme bakar; malzemeli parçalar orada gürültüdür ve gerçek eksiği (Ana tedarikçisiz hazır parça)
gömer. Spec'ten sapma, onayınızı istiyor. Alternatif: spec'teki gibi hepsi (bölüm kapalı başlar).

**R2. Set satırları hangi bölüme düşer?** Patlatılan set satın alınmaz (bileşenleri alınır); içeriği boş ya da bileşeni canlı olmayan
set (`setNeden`) patlatılmaz. *Önerim:* patlatılan set tedarikçi bölümünde satır açmaz, bileşenleri açar; patlatılmayan set kendi
Ana tedarikçisiyle hazır parça gibi davranır. Setin adedi ve kapatma anahtarı (AC-86, AC-87) "Parça ihtiyacı" tablosunun **yalnız set
satırlarında** düzenlenebilir. *Gerekçe:* D-R4/2 setin adedini düzenlenebilir istiyor ama set bir tedarikçiye sipariş edilmiyor,
yani tedarikçi bölümünde yeri yok; düzenleme yeri setin zaten durduğu tam tablodur. Bu, C-R10'un "düzenlenemez" ibaresinden yalnız
set satırları için sapmadır, onayınızı istiyor. Alternatif: set satırı hazır parça bölümünde (Ana tedarikçisi yoksa belirtilmemişte);
önermiyorum, çünkü setin tedarikçisi yok ve satır yanlış bölümde görünür.

**R3. Elle kilo yazılan kesitte boy yöntemi.** D-R3 boy yönteminde "boy adedi" düzenlenebilir diyor. *Önerim:* kesit düzenlemesinin
tek alanı `deger`; kilo yolunda kilo, boy yolunda boy adedi (tam sayı, `siparisAdediDogrula` kuralıyla); tutar boy yolunda
`deger × boyFiyati × kur`. Belirsiz sayı kuralı yalnız kilo alanında (AC-39). *Gerekçe:* aynı satır iki birim taşımaz.

**R4. Kapanan kesitin elle kilosu için ikinci geçiş.** Bütün parçaları kapatılan kesit son adetlerden doğmaz. *Önerim:* kesit geçişi
yardımcıya alınır ve öneri adetleriyle de bir kez koşar; elle değeri olup son geçişte bulunmayan anahtar öneri geçişindeki tanımla
`parcalarKapali: true` satırı olarak eklenir. *Gerekçe:* malzemenin, biçimin ve kesitin bilgisi başka yerde yok; ikinci geçiş
bugünkü hesabın kendisi (C1).

**R5. `tedarikciBolumleri`'nin tutar kuralı.** Hazır parça tutarı `parcaMaliyetKurus(p, undefined, setKat, malzemeKat) × adet`
(bugünkü maliyet, X7); maliyeti yoksa `null` ve hücre "—" ("maliyet girilmedi"). Malzemeli parçanın tutarı her zaman `null`,
nedeni "malzemesi aşağıda" (C-R5/2). Tedarikçi toplamı = hazır tutarları + kesit tutarları, kapalı satırlar hariç. *Öneri* budur;
toplam `null` olur mu: hiçbir tutar çözülmezse "—" (bugünkü `tutarsiz` kuralı).

**R6. Koruma ret metni ve neden satırı.** A-R5/3 `KALEMDE_TEDARIKCI_NEDENI`'nin dokunulmamasını istiyor ("Bir parçanın maliyet
kaleminde geçiyor…"), ama Ana tedarikçi ya da malzeme bağı yüzünden korunan tedarikçide bu cümle yanlış olur. *Önerim:* iki yeni sabit
(`ANA_TEDARIKCI_NEDENI`: "Bir parçanın Ana tedarikçisi; kalıcı silinemez.", `MALZEME_TEDARIKCI_NEDENI`: "Bir malzemenin Ana
tedarikçisi; kalıcı silinemez.") ve seçici `tedarikciKorumaNedeni(deger)`: kalem bağı varsa bugünkü sabit (AC-60 birebir), yoksa
Ana, yoksa malzeme. Ad listesi cümlenin arkasına eklenir (Çöp satırı) ve "silinemez" penceresinde. Ret **bildirimi** (Kalıcı Sil'e
basınca) bugünkü sabit cümle ya da yeni iki cümleden biri, ad yok (AC-60). *Gerekçe:* doğru cümle; spec'in "sabit kalır" amacı ad
yazılmaması.

**R7. "Silinemez" penceresinde hangi adlar.** Pencere yalnız maliyet kalemi bağıyla açılır (AC-57). *Önerim:* pencerede kalem bağı
olan parçaların adları (en çok üç). Çöp satırının nedeninde bütün koruyan parçaların adları (kalem + Ana), malzeme bağında malzeme
adları ayrı cümlede. *Gerekçe:* pencere neden açıldıysa onu açıklar.

**R8. Eylem kimliğinin adı ve grubu.** *Önerim:* `stock_siparis_listesi`, etiket "Sipariş listesini aç", `STOCK_ACTION_GROUPS`'ta
parça stoğu grubunun içinde. Sunucu tarafında bölüm kuralı yok (salt okunur); kimlik `serverPermissionDefs.js`'te (paylaşılan tanım)
ve `server-permission-defs` testinde. *Gerekçe:* B-R3; mevcut stok eylemlerinin yanı.

**R9. Pencerenin model kataloğu ve parti listesi kaynağı.** Ayarlar `standardModels`/`customModels` ayrı, Stok `models={allModels}`
alıyor. *Önerim:* pencere `standardModels` + `customModels` alır ve çöptekileri kendisi süzer; App Stok'a ikisini ayrıca verir.
Parti listesi pencerede `withoutDeleted` ile süzülür (iki giriş aynı yerden, AC-72). *Gerekçe:* tek yerde kural.

**R10. Çoklu seçim bileşeninin yeri.** *Önerim:* `src/components/tasarim.jsx`'e `CokluSecim` (sözlüğün yapı taşı; sözlük maddesi
oradan beslenir, `tasarim-kaynak` dosya:satır doğruluğunu sınar). *Gerekçe:* sözlük deseni "tek tanım, ekranda yerel kopya yok".
Alternatif ayrı dosya; o zaman sözlük atfı o dosyaya.

**R11. Belgede yetkisiz kullanıcının para sütunu.** Belgeyi kuran `siparisRaporu` `paraGoster` parametresiyle; düğme `giderYetki`
geçirir. *Ölçüm:* yetkisiz belgede "₺", "$", "€" ve tutar biçimi hiç geçmez (AC-16).

**R12. Düzenleme durumunun ömrü.** Pencere kapanınca kaybolur (D-R6): durum pencere bileşeninde, pencere kapanınca bileşen sökülür.
Parti ya da model satırları değişince düzenleme **korunur mu?** *Önerim:* korunur (anahtarlar parça kimliği ve kesit anahtarı,
adede bağlı değil); artık var olmayan anahtarların düzenlemesi sessizce etkisiz kalır ve sayılmaz (D-R8 sayısı yalnız görünen
satırlardan). *Gerekçe:* satın almacı partiyi değiştirip yeniden kontrol ederken yazdıklarını kaybetmesin; "Önerilere dön" var.

**R13. Görünüm kalkınca derin bağ.** X8 bilinen sınır; `gecerliGorunum` bilinmeyen "siparis"i Model Maliyetleri'ne düşürüyor (test
eklenir: `baslangicGorunum="siparis"` Model Maliyetleri açar).

**R14. 0134'ün ters çevrilen kriterleri.** Ekranın yerine bağlı olanlar (0134 AC-1, AC-61, AC-88, AC-89, AC-100 ve "Sipariş
İhtiyacı görünümü" ekran testleri) yeni pencereye taşınır; hesap kriterleri olduğu gibi kalır. Liste uygulamada çıkarılıp plana
eklenir ve testlere "spec 0140 ile" notu düşülür.

**R15. Para gizliliği ölçümü.** C5 kaynak taraması değil, yetkisiz ekran ve belge ister. *Önerim:* gerçek App, gider sekmesi olmayan
kullanıcı, tedarikçili ve fiyatlı veri: pencerede para biçimli hiçbir metin yok, tedarikçi adı var; belgede de.

---

## 4. Kabul kriteri ↔ test eşlemesi

Kısaltmalar: **S** `siparis-0140.test.js`, **K** `siparis-0140-kiyas.test.js`, **B** `siparis-raporu-0140.test.js`,
**P** `ui/siparis-0140.test.jsx`, **PA** `ui/siparis-0140-app.test.jsx`, **T** `ana-tedarikci-0140.test.js`,
**TU** `ui/ana-tedarikci-0140.test.jsx`, **DB** `db-roundtrip.cjs` / `db-clean-install.cjs`, **E** `maliyet-yerlesim` (Electron).

| AC | Test |
|---|---|
| 1, 2, 3 | TU (parça kartı, iki yetki) |
| 4, 5 | DB |
| 6 | T (maliyet ve satış fiyatı alanla ve alansız aynı) |
| 7, 8, 60, 61 | TU (Çöp Kutusu, Tedarikler) + T (neden seçici) |
| 9 | TU (gerçek App temizliği) + T |
| 10 | T (`buildMergePlan`) |
| 11 | P |
| 12 | PA + `ui/makina-maliyeti-0088` + E (dört sekme) |
| 13, 14, 55 | PA (iki girişte) |
| 15 | P + PA (yetkisiz ekran) |
| 16 | B + PA (yetkisiz belge) |
| 17, 37 | PA (kaydedilen gövde) |
| 18 | S + P |
| 19, 20, 75 | S + P |
| 21, 76 | S (`tedarikciSecenekleri`) + P |
| 22, 23, 24, 25, 26, 27 | S + P |
| 28, 81 | S (sabitler) + P (taramayla ekranda cümle yok) |
| 29, 30, 31 | S + B |
| 32, 33, 86, 87 | S (düzenleme sırası) + P |
| 34, 88 | S + P |
| 35, 36 | P (pencere kapatılıp açılır) |
| 38, 39, 82 | S (doğrulayıcılar) + P (hata satırın altında) |
| 40, 49 | P (düğme pasif, neden) |
| 41, 89 | S (`duzenlemeSayilari`) + P |
| 42, 43, 44, 45, 46, 47, 48, 50, 80, 90, 91, 92 | B |
| 51, 52, 93, 94 | K |
| 53, 54 | PA (Stok'tan açılır, `ayar:yedekparca` kilidi alınmaz; aynı anda Ayarlar paneli açılır) |
| 56 | T + DB |
| 57, 58, 59 | TU |
| 62, 63 | TU (süzgeç) |
| 64 | P (iki giriş aynı bileşen) + S (tarama: tek dosya) |
| 65 | P (`wide`) + `kilit-alanlari` |
| 66 | S (tarama: pencerede yazdırma API'si yok; düğme `rapor/`'da) + `gider-gizlilik` 0088 X4 |
| 67, 68 | P |
| 69 | S (tarama: pencere `makinaStandartMaliyet`'i içe almaz) + PA (prop yok) |
| 70 | `uretimdeki-modeller-0091` + `plan-adetler-0093` |
| 71 | PA (yetkisiz kullanıcıda tedarikçi adı) |
| 72 | P + PA |
| 73, 74 | S |
| 77 | P |
| 78 | S + P + B |
| 79 | P |
| 83, 84, 85 | S + P |

DoD taramaları: ekran aritmetik yazmaz (S: pencere dosyasında `*`, `+=` ile adet/kilo hesabı ve `yukari(` yok), tek dosya ve
`KILITSIZ_DOSYALAR` (S, `kilit-alanlari`), sunucuda yeni bölüm kuralı yok (S: `serverAuth.cjs` kimliği bilmez).

---

## 5. Sürüm notu taslağı

- Sipariş listesi Makina Maliyeti'nden Ayarlar › Katalog › Parça/Yedek Parça ve Stok › Parça/Yedek Parça Stoğu başlığına taşındı;
  tedarikçi seçilerek açılır, adetler değiştirilebilir, satırlar kapatılabilir, tedarikçi başına belge basılır. Düzenlemeler kaydedilmez.
- Parça kartında Ana tedarikçi alanı (gider yetkisiyle). Hazır parçaların (rulman, motor) siparişi ancak bu alan girilince bir
  firmaya düşer; liste "Ana tedarikçi girilmemiş" parçaları ayrıca gösterir.
- Gider yetkisi olmayan kullanıcı listede fiyat ve tutar görmez.
- Önce sunucu PC, sonra istemciler (yeni `parts.tedarikciId` sütunu).

## 6. Uygulama notları

- **Planla aynı kalanlar:** motor opt-in (`tedarikciBolumleri`), seçeneksiz çıktı 0134 ile birebir (`tests/fixtures/0140-once.json`, spec öncesi koddan); düzenleme sırası D-R4/2; para gizliliği yalnız çizimde; tedarikçi dizileri pencereye kapısız.
- **Ad değişiklikleri:** önerilen `tedarikciKorumaNedeni` adı 0138'in kimlik taraması yasakladığı için `tedarikciKorumaCumlesi`; satır metni `tedarikciKorumaSatiri`, ad listesi `korumaAdListesi` (planın `tedarikciParcaAdlari`'nın yerine; malzeme adlarını da yazar). `BELGE_HATALI` metni 0099 taramasındaki "Hatalı satır var" ifadesini kullanmadan yazıldı.
- **Plana eklenen küçük kararlar:** katalog süzgecinin "girilmemiş" seçeneğinin etiketi "İşlem kaleminde tedarikçi girilmemiş" iken ölçüt Ana tedarikçiyi de kapsadığı için `SUZGEC_GIRILMEMIS_ETIKETI` "Tedarikçi girilmemiş" oldu (0096, 0121, 0135 testleri "spec 0140 ile"). `EMNIYET_PAYI_IPUCU` yeni yeri yazar (eski metin kalkan görünümü gösteriyordu). Pencerenin malzeme sütunu en az 260 piksel (uzun boy uyarısı dar sütunda dikine uzuyordu). Parça kartının Ana tedarikçi alanı 500 piksel ile sınırlı.
- **Kalıcı silme bildirimi (AC-60):** Çöp Kutusu'nda korunan satırda Kalıcı Sil düğmesi çizilmez (0096 deseni), yani bildirim kullanıcı yolundan ulaşılmaz; cümle seçici saf testte ölçüldü.
- **Kanıt:** taban main `fcb57633` (1112 görüntü, sekiz parça), bu dal 1132 görüntü. `0140-piksel-raporu.json` bilinçli değişen ve yeni 125 ekranı taşır (250 görüntü): Makina Maliyeti'nin bütün ekranları (çubukta bir sekme eksik), katalog parça, malzeme, parça stoğu ve Makina Modelleri'nin "Üretimde" ipucusu (metin değişti), yeni `siparis-0140-*`, `katalog-parca-0140-ana`, `ayarlar-yedekparca-0140-suzgec`, `giderler-tedarikciler-0140`, `ayarlar-trash-0140`. `0140-taban-piksel-raporu.json` aynı ekranları son kodla yeniden çeker: 250 görüntü, 0 fark (JPEG yalnız eşlemedeki ekranlar için). Öteki 43 farklı ekran gürültüdür: main kodunun iki çekimi de kendi arasında aynı yerlerde (select okları, Giderler başlığı) farklıydı. Eski `maliyet-siparis*` ekranları 0134/0135 raporlarında kalır, eşlemedeki anahtarı silindi. Eşlemede `MakinaMaliyeti.jsx` ve `ModelsManager.jsx` için "degisti" kayıtları var (spec done'a taşınırken "ayni"ye çevrilir).
- **Mutasyonla ölçülenler:** otuz günlük temizlikte malzeme bağı, birleştirme remap'i, kayıtta Ana tedarikçi yazımı, pencerenin para gizliliği (Stok girişi), Çöp Kutusu'nda malzeme bağı, motorda parça kapatma ve kapalı satırın tutar toplamına girmemesi; her biri en az bir testi kırdı.
- **Triyaj (2026-11-09):**
  - Bulgu 2: D-R5/2 ile AC-86 çarpışıyordu. D-R5/2 öncelikli tutuldu: öneri geçişi setlerin düzenlenmemiş adediyle patlatır, kapatılan setin malzemeli bileşeninin kesitine yazılan elle değer "parçaları kapatıldı" satırı olarak kalır. Elle değer yoksa AC-86 aynen geçerli, kesit düşer. Karar Takım Yöneticisi onayına açıktır.
  - Bulgu 3: belgeyi kilitleyen hata yalnız görünen satırlardan sayılır (`duzen.gorunenHata`). "Önerilere dön" hatalı değeri de geri alır.
  - Bulgu 4: üç ondalıkta öneriye eşit kilo ya da eşit boy adedi düzenleme sayılmaz. Parçaları kapatılmış satırda yazılan değer her zaman elle sayılır.
  - Bulgu 5: çöpteki ya da bulunamayan Ana tedarikçi seçicide ibaresiyle görünür.

## 7. Kapanış

Spec ve plan `specs/done/`'a taşındı, SCORECARD dolduruldu, README'ye satır eklendi, CLAUDE.md plan yolu güncellendi. Kanıt eşlemesinin üç `degisti` kaydı (`MakinaMaliyeti.jsx` iki, `ModelsManager.jsx` bir) kaldırıldı; aynı ekranların `0140-taban-piksel-raporu.json`'daki `ayni` kayıtları (son kodla 0 fark) yerinde. `tests/spec-atiflari.test.js` bekleme listesi boşaltıldı. Triyaj bulgu 2'nin kararı (D-R5/2 öncelikli) uygulandığı hâliyle kapandı.
