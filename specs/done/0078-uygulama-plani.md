# 0078 Uygulama Planı: Kasa ve Gider Kayıtları Çöp Kutusuna

| | |
|---|---|
| **Bağlı spec** | `specs/done/0078-kasa-ve-gider-kayitlari-cop-kutusuna.md` (R2, plan onayıyla) |
| **Dal** | `feat/0078-cop` (`feat/0077-kayit` `12db874` üstünde) |
| **Onay** | Takım Yöneticisi, 2026-10-07: bütün öneriler (S1–S11) kabul |

## 1. Kodda bulunanlar (spec'e ek)

- Sunucuda iki fonksiyon değişir: `hesapTasimaYazimiMi` ve `kapsamGirisiGecersizMi` (S1 → R25, R26, R29, AC-34).
- 0077'nin C maddesi bu bölümleri kendiliğinden kapsamıyordu: `merge.js` `KALICI_SILINEN` onları adıyla dışarıda
  tutuyor (S2 → R30).
- `CekPortfoyu` hareketleri `setHesapHareketleri(() => r.hareketler)` ile geri yazıyor; canlı girdiyle çöpü silerdi
  (S3 → R33).
- Çek işlemlerinin sildiği çekli hareketler çöpe girerse geri alınan ciro hareketi portföydeki çekle çelişir
  (S4 → R34).
- Ödenmiş verilen çek silinebiliyor ve bağlı hareketler canlı kalıyor (S5 → R35).
- Çek tüketicileri R12'de eksik sayılmıştı (S6 → R36); App'in iç hesapları da ham okuyordu (S7 → R37).
- 0056'nın taşıması çöptekileri de taşıyor (S8 → R39); standart gider grup olarak siliniyor (S9 → R38).
- Temizlik çağrısı bugün 21 (S10 → R22, R40).

## 2. Dosyalar

- Veri: `electron/db.cjs` (beş tabloda `deletedAt`, `TABLES_WITH_TRASH` 23), `src/lib/merge.js` (`KALICI_SILINEN`),
  `src/lib/copKutusu.js` (çek koruma yardımcısı; iki sabit silinir).
- App: dört canlı türetme ve iç hesaplar, 27 temizlik çağrısı, null kapısı, silme yardımcısının null koruması.
- Yazım: `formOdemesi.odemeGirisiYaz` (damga), `cek/CekPortfoyu.jsx`, `settings/SettingsGiderTanimlari.jsx`,
  `settings/GiderTurManager.jsx`, `gider/StandartGiderler.jsx`, `Kasa.jsx`, `kasa/HesapSilPenceresi.jsx`.
- Okuma: tür gizleme yerleri, çek tüketicileri, `kapsamDisiTemizle` girdisi.
- Sunucu: `electron/serverAuth.cjs` (iki fonksiyon).
- Çöp Kutusu: `settings/SettingsTrash.jsx` (altı satır, altı boşaltma dalı), kalıcılık metninin sekiz dosyadan
  kaldırılması.
- Testler: yeni `cop-kutusu-0078.test.js`, `ui/cop-kutusu-0078.test.jsx`, `ui/cop-koruma-0078.test.jsx`; ek bloklar;
  ters çevrilen 0068 blokları; 0077'nin `KALICI_SILINEN` testi.
- Kanıt: görüntü aracına çöp kutusu ekranı, `docs/evidence/0078-*`, `kanit-eslemesi.json` (sekiz dosya `degisti`).
- Belgeler: `CLAUDE.md`, 0077'nin X1 metni, sürüm notu.

## 3. Kararlar

S1 → R25, R26, R29, AC-34 · S2 → R30 · S3 → R33 · S4 → R34 · S5 → R35 · S6 → R36, R12 · S7 → R37 · S8 → R39, R13 ·
S9 → R38 · S10 → R22, R40 · S11 → dal.

## 4. Adım sırası

1. Dal, taban (ayrı çalışma ağacı, üç parça).
2. Veritabanı ve roundtrip.
3. `merge.js` (S2).
4. App canlı türetme, null kapısı, iç hesaplar.
5. Yazım yolları (damga, S3, S4, S5).
6. Okuma çözümü (R11–R16, S6).
7. Sunucu (S1).
8. Çöp Kutusu, temizlik çağrıları, çek koruması.
9. Kalıcılık metninin kaldırılması.
10. Tam takım, Electron, lint; görsel kanıt; belgeler.

## 5. Kriter ↔ test

| Kriter | Test |
|---|---|
| AC-1–5, 7, 9, 43–46 | `ui/cop-kutusu-0078` |
| AC-2, 10, 18, 40 | `cop-kutusu-0078` motor blokları + gerçek App |
| AC-6, 46 | `ui/cop-kutusu-0078` |
| AC-8, 44 | `cop-kutusu-0078` (temizlik taraması, `koru`) |
| AC-11, 12, 20, 42 | `cop-kutusu-0078`, `ui/cop-kutusu-0078` |
| AC-13, 14, 37, 39 | `cop-kutusu-0078` kaynak taraması |
| AC-15 | `ui/cop-koruma-0078` |
| AC-16, 38 | `cop-kutusu-0078` (çöpte kira türü), `ui/genel-arama-0026` ek bloğu |
| AC-17 | `cop-kutusu-0078` (`cekleriUygula`) |
| AC-19, 24, 25, 27, 34, 41, 47 | `server-authz`, `server-security.cjs` |
| AC-21, 22, 23 | `ui/cop-kutusu-0078` + mevcut testler |
| AC-26, 45 | `ui/cop-kutusu-0078` |
| AC-28, 29, 49, 50 | `db-roundtrip.cjs`, `db-clean-install.cjs`, `server-authz` |
| AC-30, 31 | `merge.test.js` (0078 bloğu, `buildMergePlan`) |
| AC-32, 35 | belge ve kaynak taraması |
| AC-33 | `cop-kutusu-0078` |
| AC-36 | gerçek App (bölümsüz sunucu) |
| AC-48 | `ui/kasa-sekme-yedek` ek bloğu |

## 6. Uygulama notları

- **Prop sayısı (AC-37):** spec'in 18 canlı / 12 ham sayısı Ayarlar'ın dört geçişini canlı saymıştı; Ayarlar ham dizi
  almak zorunda (Çöp Kutusu, yedek). Ölçülen: 14 canlı, 16 ham (Ayarlar 4, tür 6, çek 6); Ayarlar panellere
  (`SettingsGiderTanimlari`, `CalisanManager` hareketleri, dışa aktarma çekleri) `withoutDeleted` verir. Test bu sayıyı sabitler.
- **İki ek setter tuzağı** (S3'ün kardeşi): `StandartGiderler.uygula` ve `Giderler`'in tekrarlayan üretimi hesaplanmış canlı
  listeyi doğrudan yazıyordu; `utils.copuKoru` ile tam diziye yazılır. `ui/cop-koruma-0078` mutasyonla ölçüldü (S3,
  `copuKoru`, hesap silme geri alınınca üç test düşüyor).
- **`ciroIptal` `silinen` döndürmüyordu**; S3'ün tam dizi yazımı için eklendi (diğer iki motor zaten döndürüyordu).
- **R13 "hesabı silinmiş" hareket için yoktu:** `kasa.hesapsizOdemeler` yalnız `hesapId` boş hareketi alıyordu. İsteğe bağlı
  `hesaplar` parametresi eklendi (parametresiz çağrı aynı; `hesapsizOzeti` geçirir); satırda "· hesabı silinmiş"
  (`hesabiSilinmisMi`). R8'in "motorlar değişmez" ilkesinin tek bilinçli istisnası.
- **Gösterim metinleri:** Kasa'nın hareket silme onayı "kalıcı silinecek" yerine "çöp kutusuna taşınacak"; silme bildirimleri
  "çöp kutusuna taşındı". Bilinen sınır: deneme dönemindeki "hesapsız bırak" çöpteki virmanın tek bacağını da boşaltır
  (çöpteki kayıt sayıma girmez); geri alınırsa tek bacaklı görünür (R20 kabulü).
- **Güncellenen eski testler** (silme artık damga; düzenekler App gibi canlı dizi verir): `hareket-duzenleme-0073` (AC-29,
  AC-34, AC-44), `odeme-girisi` (AC-29), `ui/odeme-girisi` (AC-27/29), `ui/kasa-avans` (AC-17), `ui/gider-taksit`
  (düzenek), `ui/cek-portfoy-0049` (AC-7), `ui/gider-settings` (AC-35, R12 ×2), `ui/kasa` (AC-24), `ui/kasa-deneme-donemi`
  (AC-7/9/19/24), `ui/standart-giderler` (AC-92/96); ters çevrilen `cop-kutusu-0068` ve `ui/cop-kutusu-0068` (AC-16/17).
- **0077 X1 metni** done spec'te güncellendi (AC-32).
- AC-38 testi `ui/genel-arama-0026`'da, AC-48 `ui/kasa-sekme-yedek`'te (saf blok).
- **Triyaj (2026-10-07):** (1) çöpten geri alınan ödeme ve mahsup canlı hareketlerle aynı doğrulayıcılardan geçer
  (`kasa.copHareketGeriAlmaNedeni`; aşımda neden yazılır, geri alınmaz); (2) 0047 raporu da `hesapsizOdemeler`'e
  hesapları verir, ekranla aynı küme; (3) sürüm notuna karışık sürümde eski istemcinin çöpü canlı göstermesi eklendi;
  (4) deneme dönemindeki hesap taşıması çöpteki virmanı kendine virmana çevirmez (yerinde kalır); (5) `merge.test.js`'te
  AC-30/31 davranış testleri, AC-12/21/22/23 adıyla testler; (6) görsel kanıt `0078-piksel-raporu.json` ve
  `0078-taban-piksel-raporu.json`, `kanit-eslemesi.json` kayıtları; ilk turda dört ekranda 37–249 piksel çıktı, iki ağaçta
  aynı turda yeniden çekilince 0 (zamanlama, 0077'deki aynı ekranlar); (7) spec AC-37 14/16'ya çevrildi.

## 7. Sürüm notu

> **Kasa ve gider kayıtları artık çöp kutusuna gidiyor.** Yanlışlıkla silinen ödeme, virman, avans, mahsup, çek,
> tekrarlayan tanım, gider türü, standart gider ve kasa hesabı Ayarlar › Çöp Kutusu'ndan geri alınabilir; geri alınan
> ödemeyle bakiye ve kalemin ödeme durumu eski hâline döner. Çöp kutusundaki kayıtlar 30 gün sonra kalıcı silinir.
> Çeke bağlı hareketi olan çek silinemez (verilen çekte önce iptal edin). **Önce sunucu PC, sonra bütün istemciler
> güncellenmeli:** güncellenmemiş sunucu yeni silme alanını saklamaz ve çöpe atılan kayıt geri gelir. **Bütün istemciler güncellenene kadar eski sürümlerde
> çöpteki ödemeler canlı görünür (ödenmiş sayılır, bakiyeden düşer; çöpteki hesap ve tür seçicilerde görünür); güncelleme
> bitene kadar kasa ve gider kaydı silmeyin.**
