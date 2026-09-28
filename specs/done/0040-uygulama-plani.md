# 0040 Uygulama Planı: Çek Portföyü ve Ciro

| | |
|---|---|
| **Bağlı spec** | `specs/done/0040-cek-portfoyu-ve-ciro.md` (R2, plan onayıyla onaylandı) |
| **Durum** | Uygulanıyor. 2026-09-28: Q1–Q10 kullanıcı tarafından onaylandı; spec R2 ile güncellendi. Dal `feat/0040-cek` (0024 B'nin üstünde). |
| **Önkoşul** | 0001, 0008 (perde), 0021, 0024 (hareket modeli, Kasa) |

---

## 0. Kodda doğrulanan dayanaklar (2026-09-28)

| Konu | Bulgu |
|---|---|
| Gelir kuralı | `utils.isPaymentReceived` çekte yalnız `tahsilEdildi` bayrağına bakıyor; `sumPayments`, `sumBekleyenCek`, `isCekVadesiGecmis` da. |
| Dağınık kopyalar | `yontem === "Çek" && !tahsilEdildi` Dashboard (204, 208, 212, 219, 270) ve `aylikRapor.js` (287, 540) içinde elle yazılmış. |
| Saklı kalan borç | `customers.kalanBorc` önbellek; Finans toplam alacağı ve dışa aktarma saklı değeri okuyor. |
| Kasa | `kasa.tahsilatSayilirMi` çekte bayrağa bakıyor; ciro buradan ayrı tutulmalı. |
| Sunucu | `payments` müşteri grubunda, `["customers", "settings"]`; `hesapHareketleri` yalnız `["gider"]`. |

## 1. Kararlar (Q1–Q10)

| No | Karar |
|---|---|
| Q1 | "Resmi" hukuki tür; tür düz süzgeç, gizlilik kolu yok (AC-38 kapsam dışı). |
| Q2 | Çek kaydı yalnız kendi alanlarını saklar (`paymentId`, no, banka, keşideci, tür, durum, geçmiş); tutar, para birimi, vade, alınma tarihi, kimden tahsilattan okunur. |
| Q3 | Ciro tahsilata ve müşteriye yazmaz; gelir tarihi ve kalan borç okuma anında (`cekleriUygula`; kalan borç yalnız çekli müşterilerde yeniden hesaplanır). |
| Q4 | Eski çek tahsilatları taşınmaz; bayrakla çalışır; portföyde sayılarıyla not; bağlama tahsilat formundan. |
| Q5 | Portföy Kasa ekranında "Hesaplar / Çek Portföyü" görünümü. |
| Q6 | Sunucu: `cekler` müşteri grubu, `["customers","gider","settings"]`, `GIDER_BOLUMLERI` dışı; ekleme `cust_payment_add`; ciroya giriş/çıkış `gider_odeme`; diğer durumlar `cust_payment_edit`; ciro için grup istisnası. |
| Q7 | Çöpteki tahsilatın çeki gizlenir; kalıcı silmede çek silinir; ciro edilmiş çekin tahsilatı silinemez. |
| Q8 | Ciro alacaklısı: tedarikçi / çalışan / serbest ad (tedarikçisiz kalemler); en eski vadeden dağıtım; en az bir kalem; geçmişe "ciro: ad". |
| Q9 | Ciro hareketi ödeme penceresinde silinemez; iptal bütün ciro için. |
| Q10 | Yaklaşan eşiği `hatirlatmaEsikGun` (varsayılan 7). |

## 2. Adım sırası

1. Motor `src/lib/cek.js` + gelir kuralının tek kaynağa çekilmesi (`utils`, `kasa`, `aylikRapor`, Dashboard); motor testleri.
2. DB (`cekler`, `hesap_hareketleri.cekId`), sunucu, birleştirme; testleri.
3. App bağlantıları, tahsilat formu (çek alanları, sonradan bağlama, salt okunur kutu).
4. Kasa › Çek Portföyü, ciro penceresi, karşılıksız ve ciro iptali, çek geçmişi; ödeme penceresinde ciro satırı.
5. Tam test ve lint; görsel kanıt ve TY onayı; belgeler.

## 3. Kriter ↔ test eşlemesi

Uygulamada UI testleri iki dosyada toplandı: `ui/cek-tahsilat` (gerçek App; tahsilat, perde, görünürlük, okuma anında kalan borç) ve `ui/cek-ciro` (portföy, ciro, durum, geçmiş, finans çaprazı). Plandaki `ui/cek-portfoyu` ve `ui/cek-finans-capraz` adları bu iki dosyaya dağıldı.

| AC | Test |
|---|---|
| AC-1, AC-2, AC-31, AC-32 | `cek.test.js` + `ui/cek-tahsilat` + `db-roundtrip` |
| AC-30 | `cek.test.js` |
| AC-3, AC-4, AC-5 | `cek.test.js` + `ui/cek-ciro` |
| AC-36 | `cek.test.js` (portföy ve bekleyen çek aynı `cekBekliyorMu`) |
| AC-6, AC-7, AC-12, AC-17, AC-29, AC-37 | `cek.test.js` + `ui/cek-ciro` |
| AC-13 | `cek.test.js` + `ui/cek-ciro` + `db-roundtrip` (`cekId`) |
| AC-8, AC-9, AC-11, AC-22, AC-24 | `cek.test.js` |
| AC-10, AC-23 | `cek.test.js` + `ui/cek-tahsilat` |
| AC-14, AC-28 | `cek.test.js` (+ AC-28 `ui/cek-ciro`) |
| AC-15, AC-16, AC-26, AC-35 | `cek.test.js` + `ui/cek-ciro` (+ AC-35 `merge`) |
| AC-27 | `cek.test.js` + `ui/cek-ciro` + `server-authz` + `server-security.cjs` |
| AC-18, AC-19 | `ui/cek-tahsilat` (gerçek App) + AC-18 `server-authz` |
| AC-20, AC-33, AC-34 | `server-authz` + `server-security.cjs` (+ AC-34 `ui/cek-ciro`) |
| AC-21 | `cek.test.js` |
| AC-25 | `ui/cek-tahsilat` |
| AC-38 | Q1 gereği kapsam dışı |

## 4. Uygulama notları

- **Görsel kanıt:** `docs/evidence/0040-piksel-raporu.json` (28 görüntü). Kasa'nın mevcut ekranları üstteki "Hesaplar / Çek Portföyü" sekme çubuğu yüzünden değişti; altı yeni ekran (portföy, tümü, ciro, durum, geçmiş, müşteri tahsilatında çek alanları). TY onayı 2026-09-28; `kanit-eslemesi.json` kayıtları `degisti`, done'a taşınırken `0040-taban` raporuyla `ayni`ye çevrilecek. Görüntü aracına `sec:Etiket=değer` adımı eklendi.
- **`_cek` sızıntısı:** müşteri detayı zenginleştirilmiş `payments`'ı geri yazdığı için `cekleriUygula` her çağrıda eski `_cek`'i siler; kayıt ve yedek `odemeleriAyikla` ile gider. Sunucu karşılaştırması bu yüzden sahte "payments değişti" görmez.
- **Ciro yalnız TL çek için** (hesapsız ödeme hareketi TL kalemi kapatır); TL dışı satırda "Ciro Et" pasif, "yalnız TL çek" yazar.
- **Ciro edilmiş çekte** durum penceresi "Tahsil edildi" düğmesini gösterir ama AC-26 hatasıyla reddeder; geri dönüş yalnız "Ciroyu iptal et" (onaylı) ile.
- **Kalan borç** yalnız çek kaydı olan müşteride okuma anında yeniden hesaplanır (`App.customersGorunen`); kayıttaki `kalanBorc` değişmez, gider yetkili kullanıcının ciro yazımı müşteri bölümüne dokunmaz (Q3).
- **Triyaj (2026-09-28):** (1) ciro edilmiş çekli tahsilatı olan müşteri silinmez; Çöp Kutusu'nda böyle tahsilat, müşterisi ve çek kaydı kalıcı silinmez, "çöpü boşalt" onları bırakır (`cek.ciroluTahsilatIdleri`, `musterininCiroluTahsilatlari`); (2) 30 günlük otomatik temizlik aynı kaydı korur (`purgeOldTrash` `koru` parametresi), yinelenen çek uyarısı `bagliCekler` ile yalnız tahsilatı duran çekleri sayar; (3) sunucu hareketsiz ciroyu reddeder (`gerekli: "ciro_hareketi"`); (4) lint uyarıları 0040 öncesi sayıya döndü. Testler: `ui/customers-delete-cascade`, `ui/settings-trash`, `cek.test`, `ui/cek-tahsilat`, `server-authz`, `server-security.cjs`.
- **Ayrı triyaj (2026-09-28, 0040 öncesinden kalma):** müşteri detayı tahsilat ekleme/düzenleme ve eski çekin "tahsil edildi" işaretinde canlı (çöpsüz) listeyi state'e geri yazıyordu; bütün müşterilerin çöpteki tahsilatları kalıcı siliniyordu. Yazım artık tam dizi üzerinde işlevsel güncelleme (`CustomerDetailModal`). Test: `ui/tahsilat-cop-korunur` (eski kodda üç senaryo da düşüyor). Aynı desen kaynakta başka yerde bulunmadı.
