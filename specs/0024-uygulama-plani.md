# 0024 Uygulama Planı: Kasa, Banka Hesapları ve Ödemenin Kalemden Ayrılması

| | |
|---|---|
| **Bağlı spec** | `specs/0024-kasa-ve-odeme-ayrimi.md` (R2, plan onayıyla onaylandı) |
| **Durum** | A parçası uygulanıyor. 2026-09-28: Q1–Q10 kullanıcı tarafından onaylandı; spec R2 ile güncellendi. Dal `feat/0024-kasa-a`. B parçası A kapanınca ayrıca planlanır (C11). |
| **Önkoşul** | 0001, 0003, 0008 (perde), 0021 (ödeme hedefleri, taksit), 0023 (dal tabanı) |

---

## 0. Kodda doğrulanan dayanaklar (2026-09-28)

| Konu | Bulgu |
|---|---|
| 0021 zinciri | Taksit satırlarında `odendi`/`odemeTarihi`; kalem alanları `taksitDurumuTuret` ile yazılıyor; sunucu `taksitOdemesiDegistiMi` satır bayrağına bakıyor. |
| Ödeme yolları | Liste anahtarı `odemeDurumuDegistir`, Anasayfa `odendiIsaretle`, 0021 penceresi `taksitIsaretle`, kira anahtarı `hedefDurumuDegistir`, formdaki "Ödeme durumu" düğmesi. |
| Tahsilat | `payments` müşteri detayındaki `PaymentSection`'dan giriliyor; Finans ekranında tahsilat formu yok. |
| Sunucu | `ALAN_IZINLERI.giderler.odendi → gider_odeme` (0001); 0021 satır denetimi; `GIDER_BOLUMLERI`. |
| Göç | `db.cjs` motoru (KDV, stopaj, ek ödeme) çağıramıyor. |
| Perde | Gider modülü üretimde perde arkasında (0008); türevler `giderYetki`'ye bakar. |

## 1. Kararlar (Q1–Q10)

| No | Karar |
|---|---|
| Q1 | 0021'in taksit bayrağı doğruluk kaynağı değil; taksit durumu hareketten. Bayrak testleri istisna olarak yeniden yazılır. |
| Q2 | Durum okuma anında (`odemeleriUygula`, App memosu). Saklı `odendi`/`odemeTarihi` ve satır bayrakları yazılmaz. |
| Q3 | Göç hareketi `tamKapatir` (tutarsız); taksit satırı göçü satır tutarıyla; hesapsız. |
| Q4 | Göçten hemen önce otomatik zaman damgalı veritabanı kopyası. |
| Q5 | Hızlı ödeme penceresi (tutar = kalan, hesap = son kullanılan). |
| Q6 | Tahsilat hesap seçicisi `PaymentSection`'da; perde kalkık + Finans sekmesi. |
| Q7 | Bölümler `giderActions`, `BOLUM_SEKMELERI` `["gider"]`, `GIDER_BOLUMLERI`; eylemler `kasa_hesap`, `gider_odeme`, `virman`. |
| Q8 | Taksitli/kira kalemde ödeme taksite bağlı, taksit kısmen ödenebilir; ödeme almış taksit plan değişiminde korunur. |
| Q9 | "Kasa" üst sekmesi; izin: gider + finans + perde. |
| Q10 | A kendi başına kullanılabilir; spec `done`'a taşınmaz. |

## 2. A parçasının adım sırası

1. Koruma testleri (AC-23; ödeme hareketi yokken borç ve hatırlatıcı bugünkü gibi).
2. Motor: `kasa.js`, `gider.js` (`odemeleriUygula`, `odemeHedefleri` kalanı, `planYenidenBol` korunan satırlar).
3. DB: `kasa_hesaplari`, `hesap_hareketleri`, `payments.hesapId`, göç ve yedek.
4. Sunucu ve birleştirme.
5. Arayüz: ödeme penceresi ve bağlantı yolları, form, Kasa ekranı, tahsilat hesabı, App.
6. Tam koşu, lint; istisna listesi.
7. Görsel kanıt, TY onayı.
8. Belgeler.

## 3. A parçasının kriter ↔ test eşlemesi

| AC | Test |
|---|---|
| AC-1, AC-2, AC-33 | `kasa.test.js` + `ui/kasa` |
| AC-3–AC-7, AC-28 | `kasa.test.js` + `ui/odeme-kayit` |
| AC-8–AC-11, AC-31, AC-32 | `kasa.test.js` + `ui/kasa` |
| AC-12, AC-30 | `kasa.test.js` + `ui/kasa` |
| AC-18, AC-19 | `kasa.test.js` |
| AC-20, AC-36 | `kasa.test.js` + `ui/odeme-kayit` |
| AC-21, AC-22 | `kasa-goc.test.js` (Electron) |
| AC-23 | `kasa.test.js` |
| AC-24 | `kasa.test.js` + `ui/kasa` |
| AC-25, AC-26, AC-35 | `ui/kasa` + `ui/payment-hesap` |
| AC-27 | `server-authz` + `server-security.cjs` |
| AC-29 | `kasa.test.js` + `ui/payment-hesap` |

## 4. A parçası uygulama notları (2026-09-28)

- **Motor:** `src/lib/kasa.js` (hesap doğrulama, bakiye, hesapsız sayım, ödeme ve virman doğrulama, `tamOdemeHareketleri`), `gider.js` `odemeleriUygula` / `odemeHedefKalaniK` / `hedefOdemeleri`; `giderKalemDogrula` saklı ödeme durumunu ve satır bayraklarını temizler.
- **Durum nerede türer:** `Giderler` ham `giderler` + `hesapHareketleri` alır ve kendi içinde türetir; App `giderlerOdemeli` memosunu Anasayfa ve Kasa'ya verir.
- **Sunucu:** hareket izni türüne göre (`gider_odeme`, `virman`), hesap `kasa_hesap`; var olan hareket ve hesabın düzenlenmesi de aynı izni ister (`KAYIT_DUZENLE_IZINLERI`). `ALAN_IZINLERI.giderler` ve `taksitOdemesiDegistiMi` kaldırıldı: göç öncesi ödenmiş bir kalemi düzenleyen kullanıcı, kayıt bayrakları temizlediği için 403 alırdı.
- **Kasa sekmesi:** `TABS`'ta, izin kutusu yok; `gorunurSekmeler` Giderler + Finans birlikte görünürken verir, App perde inikken çıkarır.
- **Kanıt:** 262 çekim; 226'sı 0 piksel. Değişen 18 çekim (gider formları, taksit listesi ve borç özeti, ödeme planı) ve 18 yeni ekran çekimi (`0024-piksel-raporu.json`, 36 JPEG). TY onayı 2026-09-28; eşlemede `degisti` kayıtları.

### Onaylı istisnalar (Q1, Q5, Q7): eski davranışı sabitleyen ve yeniden yazılan testler

| Test | Eski beklenti | Yeni beklenti |
|---|---|---|
| `gider-taksit.test.js` R13, AC-17, AC-23, bulgu 1, bulgu 2 | satır bayrağıyla ödendi | taksite bağlı hareketle ödendi (`odemeleriUygula`) |
| `gider-ek-odeme.test.js` R12 (P6) | ödenmiş satır bayrağı | hareketle ödenmiş taksit korunur |
| `server-authz.test.js` odendi alan testi + 0021 C5 bloğu (6 test) | `giderler.odendi` / satır bayrağı `gider_odeme` ister | hareket ekle/sil/düzenle `gider_odeme`, virman `virman`, hesap `kasa_hesap`; bayrak değişimi izin istemez |
| `server-security.cjs` iki gider kontrolü | odendi ve taksit bayrağı → 403 | ödeme/virman/hesap hareketi → 403, izinli kullanıcı (`odemeci`) → 200 |
| `ui/gider-form` "ödeme durumu değiştirilemez" | radyo düğmesi pasif | "ödendi olarak kaydet" seçeneği yok; iki yeni R17 testi |
| `ui/gider-taksit` AC-5/25, AC-13, AC-20 | pencerede "Ödendi işaretle" | ödeme penceresi; ek R18/AC-36 ve AC-6 testleri |
| `ui/dashboard-odeme-hatirlatma` AC-6, bulgu 3, AC-8, AC-24, süzgeç | `odendiIsaretle` ile kalem güncellenir | ödeme penceresi hareket yazar; bulgu 3 yerine R17/AC-5 kısmi ödeme testi |
| `ui/giderler` AC-13, `ui/giderler-kdv-memo` | anahtar durumu çevirir | pencereden ödeme kaydı |

### Triyaj düzeltmeleri (2026-09-28)

| Bulgu | Düzeltme | Test |
|---|---|---|
| 1. Eski yedekten geri yüklemede ödeme bilgisi kayboluyor | Göç çekirdeği `electron/kasaGocuSaf.mjs`'e çıktı (db.cjs ve geri yükleme ortak); hareket bölümü olmayan yedekte göç uygulanır; `BACKUP_SCHEMA_VERSION` 3 | `ui/kasa-yedek-goc`, `kasa-goc.cjs` (db yolu aynı çekirdekle) |
| 2. Güncellenmemiş sunucuda ödenmiş kalem ödenmemiş görünüyor | `hesapHareketleri` başlangıcı null, bölüm gelmezse null kalır; eski işaret okunur, ödeme girişi kapalı ve uyarılı, bölüm kayda eklenmez | `ui/kasa-app` (eski sunucu / yeni sunucu) |
| 3. Kullanılmayan eski işaretleyiciler ve `setGiderler` prop'u | Beş yardımcı ve prop kaldırıldı; testleri hareketle yeniden yazıldı | `kasa.test.js` kaynak taraması, `gider-taksit`, `odeme-hatirlatma` |
