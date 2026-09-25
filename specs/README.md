# specs/

Bu klasör, Altunmak CRM'de yapılacak işlerin **ne olduğunu ve neden istendiğini** sabitler.
Çözüm burada yazmaz; çözüm koddadır.

## Kurallar

1. **Spec'siz iş başlamaz.** `specs/` altında spec'i olmayan bir özelliğe dokunulmaz.
2. **Numara sırayla verilir ve yeniden kullanılmaz.** Biten spec `specs/done/` klasörüne
   taşınır, numarası serbest kalmaz.
3. Dosya adı: `specs/<dört-haneli-no>-<kebab-ad>.md` → `specs/0001-bayi-konsinye-envanteri.md`
4. Branch adı numarayı taşır: `feature/0001-bayi-konsinye-envanteri`
5. **Öneri kuralı:** soru, bulgu veya seçenek önerisiz sunulmaz. Kararı Takım Yöneticisi verir.
6. **Belirsizlikte varsayma.** Doküman ile kod çeliştiğinde kod doğrulanır, çelişki raporlanır.

## Durumlar

| Durum | Anlamı |
|---|---|
| **Taslak** | Analist yazdı, onay bekliyor. Kod yazılmaz. |
| **Onaylandı** | Takım Yöneticisi onayladı. Geliştirme başlayabilir. |
| **Geliştiriliyor** | Branch açıldı, iş sürüyor. |
| **Tamamlandı** | Tüm kabul kriterleri karşılandı, SCORECARD doldu, `done/`e taşındı. |
| **Kapatıldı** | İş yapılmadan kapandı: kapsamı başka spec'ler devraldı ya da ihtiyaç ortadan kalktı. Dosya `done/`e taşınır, başına kapatma gerekçesi ve devralan spec'ler yazılır, numarası serbest kalmaz. |

## Sıradaki işler (numara ayrıldı, spec henüz yazılmadı)

Spec, sırası gelince yazılır; numara burada ayrılmıştır ki atıf yapılabilsin.

| No | İş | Neden beklemede |
|---|---|---|
| **0004** | Kasa ve banka hesapları, ödemenin kalemden ayrılması, kısmi ödeme, çalışan avansı ve mahsubu, tedarikçi/çalışan ekstresi | En büyük ve en riskli iş: bakiyesi olan bir kasa, gider tarafının yanı sıra mevcut müşteri tahsilat verisine de dokunmayı gerektirir. Gider verisi bir iki ay gerçek kullanımda girildikten sonra yazılması, dağıtım ve hesap kararlarını isabetli kılar. |
| **0005** | Çalışan mesaisi (mesai ve prim ödemesinin personel maliyetine eklenmesi) | 0001'in personel modeli oturmadan eklenmesi anlamsız; saat takibi değil, elle girilen tutar olarak tasarlanacak. |
| **0006** | Evrak satır bazlı satış kaydı | **Tamamlandı** (commit 715c237, 4f5422f); `specs/done/` altında. |
| **0007** | Bayi aracılığıyla kalıp satışı ve borç atıfı | **Tamamlandı**, v3.39.0 ile yayınlandı. |
| **0008** | Gider modülü yayın perdesi | **Tamamlandı**, v3.39.0 ile yayınlandı. Geçici perde; kaldırma talimatı `CLAUDE.md`'de. |
| **0009** | Tasarım sözlüğü (paylaşılan arayüz bileşenleri) | **Tamamlandı** (commit 6a5b32f, 5217b19); `src/components/tasarim.jsx` + `docs/tasarim-sozlugu.md`. |
| **0010** | Müşteriler ekranının yeni tasarıma geçmesi | **Kapatıldı**; kapsamı 0014, 0015 ve 0016'ya devredildi (`specs/done/` altında). |
| **0011** | Uyarı şeridine serbest içerik | **Tamamlandı** (commit 907a280, 7ec2d4c); `specs/done/` altında. |
| 0012, 0013 | (boş) | Numaralar kullanılmadı; bir sonraki iş bunlardan devam edebilir. |
| **0014** | Sekme ve süzgeç birliği | **Tamamlandı** (commit 7689c55, 9516134); `specs/done/` altında. |
| **0015** | Form birliği | **Tamamlandı** (commit 44f3911 ve done commit'i); `specs/done/` altında. |
| **0016** | Liste, boş durum ve uyarı birliği | **Aşama 1** commit d749f0a; **Aşama 2** (müşteri detayı) uygulandı, commit bekliyor (dal `feat/0016-liste-bos-durum`). |

## Açık bulgular (spec'i yok, karar bekliyor)

İş sırasında bulunan ama o işin kapsamında olmayan sorunlar. Kural 1 gereği düzeltilmeden önce Takım Yöneticisi karar verir.

| Bulgu | Nerede bulundu | Öneri |
|---|---|---|
| **`tests/makina-odeme.test.js` tarihe bağlı kalıyor (2 test).** Test sabit bir satış tarihi (2026-08-16) ve 40 günlük kredi kartı blokajı kullanıyor, ama sonucu gerçek bugüne göre hesaplanıyor. 40 gün 2026-09-25'te doldu; o günden beri blokajın hesaba geçtiği sayılıyor ve "borçtan düşülmez" beklentisi tutmuyor. Kodda hata yok, test takvime bağlı. Tam paket bu yüzden kırmızı. | 0014 uygulaması (2026-09-25); 0014'ten önceki kodda da kalıyor. | Testte "bugün"ü sabitlemek (`vi.useFakeTimers` + `vi.setSystemTime("2026-08-20")`, `odeme-hatirlatma.test.js`'teki desen). Kodun davranışı değişmez; spec gerektirmeyen tek dosyalık test düzeltmesi olarak yapılmasını öneriyorum. Aynı desenle başka tarih bombası olup olmadığı `tests/` altında da taranmalı. |
| **Teslim ayrıntı kutusu karanlık temada beyaz.** Extra Kalıp (`PartSaleForm.jsx`) ve yedek parça (`YedekParcaSatisForm.jsx`) formlarında Teslim Şekli'nin altındaki kargo ayrıntı kutusu `var(--n050, #f8fafc)` kullanıyor; `n050` `src/lib/theme.js`'te tanımlı değil, karanlık temada aydınlık yedek renge düşüyor (beyaz kutu içinde koyu alanlar). | 0015 kanıt görüntüleri (2026-09-25); 0015'ten önce de aynı. | Token'ı `n100` (ya da temada tanımlı en yakın nötr zemin) ile değiştirmek; tek satırlık görünüm düzeltmesi, iki ekranın kanıtı yeniden çekilir. Aynı taramayla temada tanımsız başka `var(--…)` adı olup olmadığı bakılmalı. |

## Bu projede tek gerçek kaynaklar

Şablondaki atıflar bu projede şu dosyalara karşılık gelir:

| Aranan | Yer |
|---|---|
| Mimari, modül yerleşimi, veri kalıcılığı kuralları, karar defteri, bilinçli kapsam dışı kararlar | `CLAUDE.md` |
| Test stratejisi ve mevcut testler | `tests/`, `tests/ui/`, `scripts/tests/` |
| Sunucu yetki modeli | `electron/serverAuth.cjs`, `src/lib/permissions.js` |
| Görsel kanıt | `docs/evidence/<no>-ac<n>.png` |

Ayrı bir sözlük (`docs/domain.md`) henüz yok. İlk gerçek ihtiyaç doğduğunda açılır;
o ana kadar domain terimleri `CLAUDE.md` ve kod içindeki Türkçe adlandırmadan alınır.
