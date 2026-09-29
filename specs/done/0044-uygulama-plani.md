# 0044 Uygulama Planı: Servis, Extra Kalıp ve Yedek Parça Tahsilatlarının Hesaba Bağlanması

| | |
|---|---|
| **Bağlı spec** | `specs/done/0044-tahsilatlarin-hesaba-baglanmasi.md` (R2, plan onayıyla onaylandı) |
| **Dal** | `feat/0044-tahsilat-hesap` (`feat/0042-personel-hedef` üstünden) |
| **Onay** | Takım Yöneticisi, 2026-09-29: bütün öneriler (Q1–Q13) kabul |

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/satisTahsilat.js` (yeni) | `satisTahsilatKalemleri` (aylık raporun `satisTahsilatlari`'nın taşınmış hâli), `bizeAitTahsilatK`, para birimi uyumu |
| `src/lib/aylikRapor.js` | `satisTahsilatlari` ortak modülü çağırır (rakam değişmez) |
| `src/lib/kasa.js` | `hesapBakiyeleri`/`hesapKullanimi` veri nesnesi imzası; `tahsilatSayilirMi` kart blokajı; satır tarihi `tahsilatTarihiOf`; yeni satır türleri ve firma adı; `hesapsizTahsilatlar`, `sonTahsilatHesabi`; `HESAPSIZ_NOTU` metni |
| `src/lib/yedekParcaSatis.js`, `stock/TahsisModal.jsx` | `aliciAd` taşıması |
| `electron/db.cjs` | üç `hesapId` sütunu (dört nokta) |
| `electron/serverAuth.cjs` | `tahsilatHesabiYalnizMi` istisnası |
| `src/lib/merge.js` | üç `hesapId` remap |
| `src/components/kasa/TahsilatHesapPenceresi.jsx` (yeni) | Hesap penceresi |
| `CustomerDetailModal.jsx`, `ServiceForm.jsx`, `PartSaleForm.jsx`, `YedekParcaSatisForm.jsx`, `stock/YedekParcaSatisTab.jsx`, `Stock.jsx` | Pencere ve form alanı |
| `src/components/Kasa.jsx`, `src/App.jsx` | İki hesapsız satırı, tahsilat listesi ve atama, not; prop bağlantıları |
| Test ve kanıt | yeni `tahsilat-hesap.test.js`, `ui/tahsilat-hesap.test.jsx`; ek bloklar `aylik-rapor`, `merge`, `server-authz`, `server-security.cjs`, `db-roundtrip.cjs`, `db-clean-install.cjs`; `kasa.test`/`cek.test` imza güncellemesi; `0009-sayfa.jsx` |

## 2. Kararlar

| No | Karar |
|---|---|
| Q1 | Kalıp (bayi aracılı dahil) ve parça (anlaşmalı servise satılan dahil) bedeli kasamıza girer; kapsam dışı yalnız anlaşmalı/dış servis işçiliği, ücretsiz kalıp ve sıfır tutar. AC-10 yeniden yazıldı. |
| Q2 | Tutarın tek kaynağı: aylık raporun tahsilat kalemi ortak modüle taşınır |
| Q3 | Kartta satır tarihi `tahsilatTarihiOf` |
| Q4 | Motor `bugun` alır (Kasa `useBugun`) |
| Q5 | Yalnız `hesapId` değiştiren yazım Giderler + Finans sekmeli kullanıcıya açık |
| Q6 | Anahtar pencere açar (kasa yetkisi, bize ait > 0, para birimi uyumlu); geri alma pencere açmaz; formda seçici |
| Q7 | Müşteri detayı ve Stok › Yedek Parça bağlanır; pano ve bayi formları hesapsız |
| Q8 | Ön seçim: kaydın hesabı, yoksa `sonTahsilatHesabi` |
| Q9 | `aliciAd` saf modülde |
| Q10 | Hesapsız liste kapsamı (çek/kart bekleyen dahil, sahipsiz dahil) |
| Q11 | Eski imza desteklenmez |
| Q12 | Makina kartı davranış değişikliği testli, sürüm notunda |
| Q13 | Değişen ekranlar `degisti` + TY onayı |

## 3. Adım sırası

1. `satisTahsilat.js` + aylık rapor bağlantısı (rapor testleri değişmeden geçer); kasa motoru; `aliciAd`; motor testleri.
2. DB, merge, sunucu istisnası; testleri.
3. Hesap penceresi ve form alanları (müşteri detayı, Stok › Yedek Parça).
4. Kasa ekranı.
5. Tam test, lint, görsel kanıt, TY onayı, belgeler.

## 4. Kriter ↔ test eşlemesi

| AC | Test |
|---|---|
| AC-1, AC-2, AC-3, AC-5, AC-6, AC-7 | `ui/tahsilat-hesap` + `tahsilat-hesap.test` |
| AC-4, AC-21 | `tahsilat-hesap.test` |
| AC-8, AC-24 | `tahsilat-hesap.test` + `ui/tahsilat-hesap` |
| AC-9, AC-10, AC-22, AC-23 | `tahsilat-hesap.test` + `ui/tahsilat-hesap` |
| AC-11, AC-12 | `tahsilat-hesap.test` |
| AC-13 | `tahsilat-hesap.test` + `ui/tahsilat-hesap` |
| AC-14, AC-30 | `tahsilat-hesap.test` |
| AC-15, AC-26 | `tahsilat-hesap.test` + `ui/tahsilat-hesap` |
| AC-16 | `ui/tahsilat-hesap` |
| AC-17, AC-18 | mevcut `finans-ozeti-export`, `aylik-rapor` + çapraz test + kaynak taraması |
| AC-19 | `db-roundtrip.cjs`, `db-clean-install.cjs` |
| AC-20, AC-28 | `ui/tahsilat-hesap` |
| AC-25 | `cek.test`, `kasa.test` |
| AC-27 | `tahsilat-hesap.test` + `ui/tahsilat-hesap` |
| AC-29 | `merge.test` |
| Q5 | `server-authz`, `server-security.cjs` |

## 5. Uygulama notları

- Kasa ekranında hesapsız gider ödemelerinin sayısı bilgi şeridinden çıkarıldı ve kendi satırına taşındı ("Hesabı belirtilmemiş ödemeler: n (m tanesi eski kayıtlardan aktarıldı)"). Aksi hâlde aynı sayı iki kez yazıyordu. `ui/kasa` testinin beklenen metni buna göre güncellendi.
- Müşteri detayındaki anahtarda parça para birimi uyuşmayan eski serviste pencere açılmaz; neden bildirim olarak gösterilir (AC-27). Formda bu durum oluşamaz, çünkü kayıt parça para birimini servisinkiyle yazar.
- Toplu yedek parça satışında anahtar bütün gruba uygulanır: pencere grubun toplam tutarını gösterir ve seçilen hesap gruptaki her kayda yazılır.
- `kalipSatisOrtak` ve `yedekParcaRec` `hesapId`'yi yalnız formda alan varken yazar. Evrak'tan üretimde ve kasa yetkisi olmayan kullanıcının düzenlemesinde mevcut hesap korunur.
- Görüntü aracı: `kasa-tahsilat-hareketleri`, `kasa-hesapsiz-tahsilatlar`, `musteri-tahsilat-hesap-penceresi`, `servis-formu-tahsilat-hesap`, `servis-formu-tahsilat-neden`, `kalip-formu-tahsilat-hesap`, `yedek-parca-formu-tahsilat-hesap`. Kasa'nın hesaplar görünümündeki mevcut ekranlar (not ve iki yeni satır) bilerek değişti. Öbür ekranlar 0 piksel.
- Triyaj (2026-09-29): hesabının para birimi uyuşmayan ya da hesabı bulunmayan tahsilat hiçbir bakiyeye girmediği hâlde hesapsız listede de görünmüyordu. `hesapsizTahsilatlar(veri, hesaplar)` bu kayıtları da listeler (`neden`: `paraBirimi` / `hesapYok`, Kasa satırında yazar). Formlarda ve pencerede uyumsuz mevcut hesap artık seçili gelmez ve temizlenir (`uyumluHesapId`). Ayrıca AC-17 (Finans özeti) ve AC-25 (hesapsız ödeme istisnaları) kendi adlarıyla testlendi.

## 6. Sürüm notu (R5, Q12)

"Kasa bakiyesi artık kredi kartıyla alınan tahsilatları (makina tahsilatları dahil) banka blokajı bitip para hesaba geçtiği gün sayar; bu yüzden bazı hesap bakiyeleri önceki sürüme göre düşük görünebilir."
