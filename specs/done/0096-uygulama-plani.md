# 0096 Uygulama Planı: hammadde tedarikçisi ve parça maliyetinin tedarikçi kırılımı

| | |
|---|---|
| **Spec** | `specs/done/0096-hammadde-tedarikcisi-ve-parca-maliyet-kirilimi.md` (revizyon 4) |
| **Commit** | uygulama `6826f29`; kapanış (SCORECARD, kanıt, taşıma) ayrı commit |
| **Dal** | `feat/0096-hammadde-kirilimi`, `origin/main` (`d6f5a83`) üstünde, çalışma kopyası `../wt-0096` |
| **Onay** | Takım Yöneticisi, 2026-10-20: plan turunun bütün maddeleri (P1–P8) onaylandı |

## 1. Plan turu kararları (spec revizyon 4'e işlendi)

| # | Bulgu | Karar |
|---|---|---|
| P1 | C11'in kapısı App'te uygulanırsa Ayarlar aynı diziyi yedeğe verdiği için yetkisiz kullanıcının yedeği boş tedarikçi listesi taşır; tam geri yükleme bütün tedarikçileri silerdi | Kapı `Settings.jsx`'te parça paneline giden propta; App'ten giden dizi ham (C11 yeniden yazıldı) |
| P2 | Birleştirmede kimliği yeniden atanan tedarikçinin kırılımdaki bağı kopar, başka tedarikçiyi gösterebilir | `merge.js` yeni parçanın kırılımını taşır (R26, AC-49) |
| P3 | Hangi parçalar korur belirsiz | Canlı + çöpteki parça sayılır, çöpteki ayrıca yazılır; "çöpü boşalt" kalacak parçalardan (R13/5, AC-50) |
| P4 | Kayıt fonksiyonu iki biçim görebilir | Kırılım formda hep form biçiminde (R17/3) |
| P5 | Tedarikçi okumasının `deletedAt: null` davranışı | Değişmez (spec öncesi gövde fikstürü aynı) |
| P6 | İşaret alanının adı | `hammadde` (R25/2) |
| P7 | Kuruş biçimleyici | `urunAgaci.maliyetMetniKurus` (parça paneli makina maliyeti motorunu içe almaz) |
| P8 | Atıflar kaymış | Testler adla arar |

## 2. Değişen dosyalar

| Katman | Dosya | Ne |
|---|---|---|
| Motor | `src/lib/urunAgaci.js` | Tek okuma yolu `parcaMaliyetKurus` / `parcaMaliyetiVar` (`maliyetGirildiMi` onun adı), `kirilimTutarliMi`, `maliyetMetniKurus`, `parcaMaliyetMetni`, `elleMaliyetMetni`, `maliyetKaynagi` ve ibareleri, `hammaddeDogrula` (`ekMaliyetDogrula` emsali), `hammaddeFormu`, `hammaddeTedarikciAdi` (silinmiş / bulunamayan), `hammaddeSecilebilirMi`, metin sabitleri |
| Motor | `src/lib/gider.js` | `kirilimdaGecenTedarikciler` (dört kapının tek yardımcısı), `tedarikciKullanim` dördüncü parametre `parts` (`parca`, `parcaCop`), `KIRILIMDA_TEDARIKCI_NEDENI` |
| Motor | `src/lib/makinaStandartMaliyet.js` | Kit satırının birim maliyeti tek yoldan; satır içi "girildi mi" ölçütü kalktı |
| Motor | `src/lib/parcaAktarma.js` | Dışa aktarmanın maliyet hücresi tek yoldan (kuruştan); içe aktarma kırılımlı parçada maliyeti almaz (R24) |
| Motor | `src/lib/merge.js` | Yeni parçanın kırılımındaki tedarikçi kimliği taşınır (P2) |
| DB | `electron/db.cjs` | `parts.hammaddeler` (JSON, `hammaddeYaz`), `tedarikciler.hammadde` (INTEGER); dört nokta, koşullu okuma |
| Ekran | `src/components/PartManager.jsx` | Hammadde bölümü (`HammaddeAlani`), pasif maliyet alanı ve kaynak ibaresi, liste hücresinin ikinci satırı, tedarikçi süzgeci (`Select`), kayıt fonksiyonu kırılımı her çağrıda ayrıştırır ve `maliyet`'i siler |
| Ekran | `src/components/Settings.jsx` | Parça paneline kapılı tedarikçi listesi ve gider yetkisi (P1) |
| Ekran | `src/components/gider/Tedarikciler.jsx` | Hammadde kutusu, rozet, kullanım hücresi parça sayar, "silinemez" penceresi kullanım türüne göre |
| Ekran | `src/components/Giderler.jsx`, `src/App.jsx` | `parts` hattı; otuz günlük temizliğin `koru`'su |
| Ekran | `src/components/settings/SettingsTrash.jsx` | Kalıcı Sil ve "çöpü boşalt" korunur, satırda neden |
| Belge | `docs/tasarim-sozlugu.md`, `CLAUDE.md` | Süzgeç istisnası (C14); kavram ve kurallar |
| Kanıt | `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/0096-*`, `kanit-eslemesi.json` | Sekiz yeni ekran |

Değişmeyenler (taranır): `serverAuth.cjs`, izinler, kilit alanları, Makina Maliyeti › Model Maliyetleri ekranı.

## 3. Adım sırası (uygulandığı gibi)

0. **Taban (kod değişmeden):** `tests/fixtures/0096-govde-once.json` (`scripts/tests/0096-govde-fikstur.cjs`, Electron), `tests/fixtures/0096-kiyas-once.json` (`YAZ_0096=1`: dışa aktarma satırı, "girildi mi" ölçütü, model maliyeti) ve değişecek 16 ekranın taban görüntüleri.
1. Motor (`urunAgaci`, `gider`, motor, aktarma, birleştirme). 2. Veritabanı. 3. Tedarikçi tarafı, parça paneli, Ayarlar ve Çöp Kutusu kapıları, App. 4. Testler, bozma denemeleri, görsel kanıt, sözlük, CLAUDE.md.

## 4. Kriter ↔ test eşlemesi

M = `tests/hammadde-0096.test.js`, U = `tests/ui/hammadde-0096.test.jsx`, A = `tests/ui/hammadde-0096-app.test.jsx`, K = `tests/hammadde-0096-kiyas.test.js`, E = `scripts/tests/db-roundtrip.cjs` / `db-clean-install.cjs`.

| Kriter | Test |
|---|---|
| AC-1, 2 | U (Tedarikciler) |
| AC-3, 4, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 34, 35, 42, 43, 46 | U (gerçek Settings, kayıt sonucu ölçülür) + M (motor yarıları: AC-7–11, 14–16, 42, 43) |
| AC-5, 6, 45 | U (yetkisiz kullanıcı; tedarikçi adları ekranda aranır, kayıt derin eşitlikle) + M (C11 taraması) |
| AC-19, 33 | M (model maliyeti, çapraz ölçüt) + K (kırılımsız veride spec öncesiyle aynı) |
| AC-20, 21, 22, 23, 44 | U (süzgeç, sayfa sıfırlama, boş durum) + M (kanca imzası, sözlük ve kaynak taraması) |
| AC-24, 48, 50 | U (Tedarikciler) + M (`tedarikciKullanim`) + A (App hattı) |
| AC-25, 26, 27, 38, 39 | U (durumlar veriyle kurulur: birleştirme / kısmi geri yükleme yolu) + M (çözücü) |
| AC-28, 29, 36 | E (spec öncesi gövde fikstürü, gidiş dönüş, temiz kurulum) |
| AC-30, 30/2, 40 | M + K |
| AC-31, 32, 41 | M (taramalar) |
| AC-37 | U (Kalıcı Sil, çöpü boşalt) + A (otuz günlük temizlik, gerçek yükleme) |
| AC-47 | `tasarim-kaynak` + `kanit-eslemesi` |
| AC-49 | M (`buildMergePlan`) |

Ters çevrilen mevcut test ("spec 0096 ile" notlu): `tests/cop-kutusu-0068.test.js` (otuz günlük temizlik satırı artık `koru` taşıyor).

## 5. Ölçümler

- **Bozma denemeleri** (her biri yedek kopyayla geri alındı): tek yolun kırılımı yok sayması (19 test kırıldı), `maliyet`'in silinmemesi (2), boşaltmanın eskiyi geri getirmesi (2), motorun eski ölçüte dönmesi (4), Kalıcı Sil kapısı (1), "çöpü boşalt" kapısı (1), otuz günlük temizlik (1), silme düğmesinin parçayı saymaması (2), birleştirmede kimlik taşınmaması (1), Ayarlar'daki yetki kapısı (2), içe aktarma kapısı (1), süzgeçte sayfa sıfırlaması (2), DB okumasının koşulsuz yazımı (Electron: 3 kontrol).
- **Görsel kanıt** (`0096-piksel-raporu.json`: spec öncesi ↔ uygulama; `0096-taban-piksel-raporu.json`: kapanışta son kod ↔ uygulama, 48 görüntü 0 fark, kanıt eşlemesi buna `ayni` bakar): 16 mevcut ekran × 2 tema; değişen parça listesi (süzgeç), parça kartı (yeni bölüm) ve tedarikçi formu (yeni kutu). Tedarikçiler listesi (işaretsiz veride), Çöp Kutusu, Dışa/İçe Aktar ve ekstre 0 piksel. Yeni ekranlar: `katalog-parca-0096-kirilim`, `-tutarsiz`, `-bos`, `-hata`, `ayarlar-yedekparca-0096-suzgec`, `-yetkisiz`, `giderler-0096-tedarikciler`, `giderler-0096-tedarikci-sil`.
- Uygulamada görülen ve düzeltilen: kırılımla birlikte eski elle maliyet taşıyan kayıtta pasif alan eski değeri gösteriyordu ve "kırılımdan geliyor" satırıyla çelişiyordu; pasifken alan boş çizilir (kayıtta R7 gereği silinir).

- **Triyaj (üç düşük bulgu, düzeltildi):** dışa aktarılan dosya aynen geri yüklenince kırılımlı parça bildirim üretmez, yalnız farklı rakamda üretir; parça içe aktarma özeti bildirimleri "uyarı" diye sayar ("satır atlandı" değil); gider yetkisi olmayan kullanıcıda kart da tedarikçi sayısını yazmaz (`KAYNAK_KIRILIM_YETKISIZ`, listeyle aynı karar); tedarikçi listesi kırılım haritasını bir kez kurar (`tedarikciKullanim` beşinci parametre).

## 6. Sürüm notu

- Giderler › Tedarikler ve Ekstre'de bir tedarikçi "Hammadde tedarikçisi" olarak işaretlenebilir.
- Ayarlar › Katalog › Parça/Yedek Parça'da her parçaya hammadde tedarikçileri ve parça başına tutar yazılabilir; tutar girilen satırların toplamı parçanın alış maliyeti olur ve makina maliyeti hesabı bunu okur. Bir kırılım kaydedilince parçanın elle girilmiş maliyeti silinir.
- Parça listesi hammadde tedarikçisine göre süzülebilir.
- Parça kırılımında geçen tedarikçi silinemez; Çöp Kutusu'ndaki koruma da aynıdır.
- Excel'den içe aktarmada kırılımı olan parçanın maliyet hücresi alınmaz.
- Önce sunucu PC, sonra istemciler güncellenir. Güncellenmemiş sunucu yeni alanları kaydetmez (sessizce düşer); güncelleme bitene kadar işaret konmaz ve kırılım girilmez.
