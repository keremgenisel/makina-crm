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

## Sıradaki işler (numara ayrıldı, spec henüz yazılmadı)

Spec, sırası gelince yazılır; numara burada ayrılmıştır ki atıf yapılabilsin.

| No | İş | Neden beklemede |
|---|---|---|
| **0004** | Kasa ve banka hesapları, ödemenin kalemden ayrılması, kısmi ödeme, çalışan avansı ve mahsubu, tedarikçi/çalışan ekstresi | En büyük ve en riskli iş: bakiyesi olan bir kasa, gider tarafının yanı sıra mevcut müşteri tahsilat verisine de dokunmayı gerektirir. Gider verisi bir iki ay gerçek kullanımda girildikten sonra yazılması, dağıtım ve hesap kararlarını isabetli kılar. |
| **0005** | Çalışan mesaisi (mesai ve prim ödemesinin personel maliyetine eklenmesi) | 0001'in personel modeli oturmadan eklenmesi anlamsız; saat takibi değil, elle girilen tutar olarak tasarlanacak. |

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
