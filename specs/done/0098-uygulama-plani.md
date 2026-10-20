# 0098 Uygulama Planı: tahsilat hesabı seçimi Kasa sekmesinden ayrılır

| | |
|---|---|
| **Spec** | `specs/done/0098-tahsilat-hesabi-kendi-izni.md` (revizyon 4) |
| **Commit** | uygulama `4477d2c`; kapanış (SCORECARD, taşıma) ayrı commit |
| **Dal** | `feat/0098-tahsilat-hesap-izni`, `main` (`b53d94d`) üstünde, çalışma kopyası `../wt-0098` |
| **Onay** | Takım Yöneticisi, 2026-10-20: planın on önerisi (P1–P10) kabul edildi |

## 1. Plan turu kararları (spec revizyon 3'e işlendi)

| # | Konu | Karar | Spec |
|---|---|---|---|
| P1 | Kapının yeri | Saf yardımcı `tahsilatHesapKapisi` ve `TAHSILAT_HESAP_ID` `serverPermissionDefs.js`'te; App tek çağrı | R12/3 |
| P2 | Prop biçimleri | Kapalıyken Müşteriler `[]`, Bayiler ve Stok `null` | R8/3 |
| P3 | Kiosk (AC-44) | Mevcut kiosk düzeneği; elverişsizse tarama + bileşen testi | — |
| P4 | Bakiye (AC-8) | Gövdeden `hesapBakiyeleri` + Kasa'lı kullanıcıda ekran | — |
| P5 | Rakamlar (AC-37) | Motor taraması + mevcut altınlar, yeni fikstür yok | — |
| P6 | Sunucu PC (AC-20) | `null` dalı birim testi + yerel mod gerçek App | — |
| P7 | Görsel kanıt | İzin ekranının üç ekranı değişti, üç yeni ekran, tahsilat formları 0 piksel | — |
| P8 | Sunucu (AC-39) | `server-authz` bloğu | — |
| P9 | Kimliği sayan testler | Sayı farkı notla güncellenir, anlam farkı sorulur | — |
| P10 | Gerileme (R7/2) | Yedek dal yok; AC-56 ve sürüm notu | R7/2 |

## 2. Değişen dosyalar

| Katman | Dosya | Ne |
|---|---|---|
| İzin | `src/components/settings/serverPermissionDefs.js` | "Tahsilat hesabı" grubu (`notu`), `TAHSILAT_HESAP_ID`, `TAHSILAT_HESAP_IPUCU`, `KASA_EYLEM_IDLERI`'ne yeni kimlik, `KASA_ETKISIZ_IDLERI` + `kasaEtkisizGrupMu`, `tahsilatHesapKapisi` |
| İzin ekranı | `src/components/settings/UserManager.jsx` | Etkisizlik ipucusu yalnız etkisiz gruplara; not satırı `tahsilat-hesap-ipucu` |
| Kapı | `src/App.jsx` | `tahsilatHesapYetki`; Müşteriler/Bayiler/Stok tahsilat prop'ları ve iki pano çağrısı |
| Zincir | `src/components/Customers.jsx`, `src/components/customers/CustomerDetailModal.jsx` | Boolean prop adı `tahsilatHesapYetki` |
| Pano | `src/components/ServisPanosu.jsx`, `src/components/ServisPencere.jsx` | İki prop formlara iletilir; ayrı pencerede bilinçli yok (yorum) |
| Kanıt | `scripts/evidence/0009-sayfa.jsx`, `docs/evidence/0098-*` | Yeni prop adı, üç yeni ekran |
| Belge | `CLAUDE.md` | Bölüm |

## 3. Adım sırası

0. Taban: 43 ekranın görüntüleri spec öncesi kodla. 1. İzin tanımları. 2. İzin ekranı. 3. App kapısı ve dağıtım. 4. Pano. 5. Testler ve ters çevirmeler. 6. Kanıt, belgeler.

## 4. Kriter ↔ test eşlemesi

**T** `tests/tahsilat-hesap-izni-0098.test.js`, **U** `tests/ui/tahsilat-hesap-izni-0098.test.jsx`, **A** `tests/ui/tahsilat-hesap-izni-0098-app.test.jsx`.

| AC | Test |
|---|---|
| 1–12, 13–17, 49, 50, 56, 57 | A |
| 18–22, 52 | T (+ A perde, yerel mod, admin) |
| 23–30, 53, 54 | U + T |
| 31, 32, 33, 38 | A (adlı testler, triyaj bulgu 2) |
| 34–36, 41 | Mevcut 0044 / 0063 / Kasa testleri yeşil |
| 37, 40, 45, 55, 58 | T |
| 39 | `tests/server-authz.test.js` |
| 42–44, 46–48, 51 | A (pano sekmesi, kiosk ve bayi detayı gerçek App'te) |

## 5. Ölçümler

- **Kiosk (P3):** gerçek App'te yalnız `servis` sekmeli istemciyle ölçüldü (yedek yola gerek kalmadı); panonun sekme hâli ve yedek parça formu da gerçek App'te.
- **P9, kimliği sayan testler (yalnız sayı farkı):** `cop-kutusu-0078` AC-37 (canlı hesap dizisi geçişi 12 → 14: üç tahsilat geçişinin koşulu değişti, iki pano geçişi eklendi) ve `kasa-izin-akordeonu-0066` AC-5b (Kasa akordeonunda işaretli kutu 3 → 4). İkisi "spec 0098 ile" notuyla güncellendi; anlam farkı çıkmadı.
- **Bozma denemeleri:** on denemenin onu da yakalandı (eski kapı, perde unutulması, ipucu kümesinin ayrılmaması, not satırı, pano servis formu, kiosk, ilk ödemede `[]` truthy tuzağı, Ödendi penceresi kapısı, izin okunmaması, Stok'un eski kapıda kalması).
- **Görsel kanıt** (`0098-piksel-raporu.json`, spec öncesi ↔ uygulama, 47 ekran × 2 tema): izin ekranının `kullanici-izin-kasa-ipucu` ve `-0066` ekranları bilinçli değişti; `kullanici-izin-kasa` 0 fark (o ekranda Kasa akordeonu kapalı çizilir, DoD'nin "üç ekran" beklentisinden sapma). Tahsilat formlarının ve panonun mevcut bütün kanıt ekranları 0 piksel. Yeni ekranlar: `kullanici-izin-0098-kasali`, `-kasasiz`, `servis-pano-0098-hesap`, `-hesapsiz`. **Ölçüm notu:** ilk taban çekimi dokuz form ekranında textarea boyutlandırma tutamacının farklı çizildiği bir oturumdu (83/249 piksel); spec öncesi kod da aynı farkı verdi, taban spec öncesi kodla yeniden çekildi ve fark kayboldu.

## 6. Triyaj (2026-10-20)

| # | Bulgu | Düzeltme | Test |
|---|---|---|---|
| 1 | AC-49 yalnız ekleme kipini, AC-48 yalnız yedek parça kaydını, AC-16 yalnız geri alma yolunu ölçüyor | AC-49'a ekleme kaydı ve düzenleme kipi (alan yok, hesap korunur), AC-48'e kalıp kaydı, AC-16'ya servis formundan düzenle-kaydet | A (iki bozmayla ölçüldü: düzenleme kipinin kapısı, kayıt dalı) |
| 2 | AC-31, AC-32, AC-38'in adlı testi yok | Yeni yetkili kullanıcı düzeneğinde üç adlı test (liste içeriği, ön seçim ve boşaltılan değer, Kasa'dan hesap atama ve kapsam dışı yolu) | A |
| 3 | Dört yorum eski kapıyı anlatıyor | App, Customers, CustomerDetailModal (iki yer) "tahsilat hesabı yetkisiyle (spec 0098)" | T taraması |
| 4 | İpucu metni Kasa'yı görmeyen kullanıcıya Kasa'yı anıyor | Bilinen sınır (spec C12/2, kodda yorum); metin C8 gereği aynen | T |

## 7. Sürüm notu

> Tahsilatın girdiği hesap artık Kasa sekmesi olmayan kullanıcılara da sorulabiliyor: Kullanıcı Yönetimi › Kasa işlemleri ›
> "Tahsilat hesabı". İşlem izinleri hiç özelleştirilmemiş kullanıcılarda yetki kendiliğinden açık. İzinleri daha önce
> özelleştirilmiş kullanıcılarda (Kasa sekmesi olanlar dahil) kutu işaretlenene kadar alan görünmez; bu kullanıcılar hesabı Kasa
> ekranından atamayı sürdürebilir. Servis Panosu'nun ayrı penceresinde alan yok; sekmedeki pano ve kiosk alanı gösterir.
