# 0052 Uygulama Planı: Kasa Sekmesinin Kendi İzni

| | |
|---|---|
| **Bağlı spec** | `specs/0052-kasa-sekme-izni.md` (R2, plan onayıyla) |
| **Dal** | `feat/0052-kasa-sekme-izni` (`feat/0050-pencere-boyutu` üstünden) |
| **Onay** | Takım Yöneticisi, 2026-09-30: bütün öneriler (Q1–Q10) kabul; görsel kanıt ve triyaj düzeltmeleri onaylandı (2026-09-30) |

## 1. Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/lib/permissions.js` | `gorunurSekmeler`'deki `\|\| t.id === "kasa"` muafiyeti kaldırıldı; `kasaSuz` önkoşulu aynen (R2). |
| `src/components/settings/serverPermissionDefs.js` | `ALL_TABS`'a `{ id: "kasa", label: "Kasa" }` Giderler'in arkasına (R1). `DEFAULT_USER_TABS` değişmedi (R5). Yeni sabitler `VARSAYILAN_KAPALI_SEKMELER`, `KASA_EYLEM_IDLERI`, `KASA_ETKISIZ_IPUCU`. |
| `src/components/settings/UserManager.jsx` | Kasa kutusu "(varsayılan kapalı)" ibaresiyle (Q7); Gider işlemleri akordeonunda "Kasa ve hesaplar" grubunun altında, düzenlenen listede kasa yoksa tek satırlık ipucu (R11, Q6); sekme açıklama satırı Kasa'nın önkoşulunu söyler. |
| `electron/serverAuth.cjs` | `BOLUM_SEKMELERI.kasaHesaplari` `["kasa"]` (R7.1); `ON_KOSUL_SEKMELERI` `{ kasaHesaplari: ["gider", "finance"] }` ve `sekmeEngelli`'de hepsinin aranması (R7.3, Q4). `GIDER_BOLUMLERI`, `hesapHareketleri` (R8) ve `tahsilatHesabiYalnizMi` / `kasaGorunurMu` (R14) değişmedi. |
| `electron/db.cjs` | `kasaSekmeGocu(conn)`, işaret `meta.kasaSekmeGocu0052`, üç açılış dalında `kasaGocu`'dan sonra (R12, Q1, Q2). Tanımsız, bozuk ve admin izin kaydına dokunmaz (Q3). |
| `src/App.jsx` | `kasaSekmesi` (perdeden bağımsız görünürlük) ve Ayarlar'a `setKasaHesaplari` yalnız onunla: Kasa'sı olmayan kullanıcıda yedek geri yüklemesi hesap tanımlarına dokunmaz (R19). |
| `tests/kasa-sekme-izni.test.js` (yeni) | Görünürlük matrisi, sunucu eşlemesi ve önkoşulu, `GIDER_BOLUMLERI`, 0044 istisnası, kaynak taramaları. |
| `tests/ui/kasa-sekme-izni.test.jsx` (yeni) | İzin ekranı (kutu, kayıt, ipucu, oran) ve gerçek App (menü, Mali İşler, gider formu, tahsilat formu, yedek). |
| `scripts/tests/kasa-sekme-gocu.cjs` (yeni), `tests/db-electron.test.js` | Geri doldurma, Electron altında. |
| `scripts/tests/server-security.cjs` | `kasasiz`, `kasafinsiz` kullanıcıları; `odemeci` artık `["gider", "finance", "kasa"]` (Q9). |
| `tests/ui/kasa-app.test.jsx` | 0024'ün "kendi izin kutusu yok" testi yeni kurala çevrildi (Q9). |
| `scripts/evidence/0009-sayfa.jsx` | `uygulama-menu-kasasiz`, `uygulama-menu-kasali`, `kullanici-izin-kasa`, `kullanici-izin-kasa-ipucu` ekranları ve satırın içindeki öğeye tıklayan `tikla:` adımı (Q10). |

## 2. Kararlar

- **Q1.** Geri doldurma `db.cjs`'te, `kasaGocu` deseniyle, üç açılış dalında. Yerel mod için ayrı dal yok: kullanıcı kaydı olmadığından döngü boş geçer, yalnız işaret yazılır (AC-19). Ayrı bir yerel mod bayrağı, sunucuyu sonradan açan yerel kullanıcıda geri doldurmayı hiç çalıştırmama riski doğururdu.
- **Q2.** Temiz kurulumda da işaret yazılır; sonradan açılan kullanıcılar yeni kurala tabidir.
- **Q3.** `permissions` null, JSON değil ya da `tabs` dizi değilse kayda dokunulmaz; admin'e dokunulmaz.
- **Q4.** Önkoşul `sekmeEngelli`'de `ON_KOSUL_SEKMELERI` haritasıyla; `kisitliMi` ve `yazmaYetkisiVar` aynı sonucu görür.
- **Q5.** Admin rolüne geçişte listeye "kasa" yazılması (R18) değişmedi, testle sabitlendi.
- **Q6.** İpucu yalnız düzenlenen listede kasa yokken; önkoşul ayrıntısı izin ekranında gösterilmez.
- **Q7.** Kasa kutusu "(varsayılan kapalı)" ibaresi alır.
- **Q8.** Sürüm notu §6'da; bu işte yayın yok.
- **Q9.** "kasa"ya dayanan mevcut testlere yalnız "kasa" eklendi, beklentiler değişmedi.
- **Q10.** Kanıt: kasasız menü (`degisti`: eskiden Kasa görünüyordu), kasalı menü (`ayni`), izin ekranı (`degisti`: Kasa kutusu ve ipucu). App ve UserManager tasarım sözlüğünü kullanmadığı için `kanit-eslemesi.json`'a kayıt gerekmez; rapor bağımsızdır.
- **Planlamada bulunan (spec R19, R20):** Giderler paketinin geri yüklenmesi `kasaHesaplari`'nı yazdığı için Kasa'sı olmayan kullanıcıda bütün kayıt 403 alırdı; App ayarlayıcıyı yalnız Kasa sekmesiyle verir. Salt okunur modda menü son bilinen izinden hesaplanır (bugünkü davranış); AC-21 fonksiyon düzeyinde kanıtlanır.

## 3. Adım sırası

1. Sunucu ve veri: `serverAuth.cjs` eşleme ve önkoşul, `db.cjs` geri doldurma, Electron testleri.
2. İzin tanımı: `ALL_TABS`.
3. İstemci görünürlüğü: `permissions.js`'teki tek şart.
4. İzin ekranı ipuçları, App'te yedek geri yükleme kapısı.
5. Kırılan mevcut testler, yeni testler.
6. Görsel kanıt, `CLAUDE.md`, TY onayı.

## 4. Kriter ↔ test eşlemesi

| AC | Test |
|---|---|
| AC-1 | `ui/kasa-sekme-izni` "AC-1 / AC-8" |
| AC-2 | `kasa-sekme-izni.test.js` "AC-2"; `ui/kasa-sekme-izni` "AC-2 / AC-14" (gerçek App) |
| AC-3, AC-4 | `kasa-sekme-izni.test.js` "AC-3", "AC-4" |
| AC-5 | `kasa-sekme-izni.test.js` "AC-5"; `ui/kasa-sekme-izni` "AC-5"; `server-security.cjs` "spec 0052 AC-5 (sunucu)" |
| AC-6 | `kasa-sekme-gocu.cjs` "AC-6"; `kasa-sekme-izni.test.js` "AC-6" |
| AC-7 | `ui/kasa-sekme-izni` "AC-7"; `kasa-sekme-gocu.cjs` "AC-7 / AC-17" |
| AC-8 | `kasa-sekme-izni.test.js` "AC-8"; `ui/kasa-sekme-izni` "AC-1 / AC-8" |
| AC-9 | `kasa-sekme-izni.test.js` "AC-9" |
| AC-10 | `kasa-sekme-izni.test.js` iki "AC-10" testi; `server-security.cjs` iki "spec 0052 AC-10" kontrolü |
| AC-11 | `kasa-sekme-izni.test.js` "AC-11"; `server-security.cjs` "spec 0052 AC-11" |
| AC-12 | `ui/kasa-sekme-izni` "AC-12 / AC-13" (gider formu, kayıt hesapsız) ve "AC-12" (tahsilat formu) |
| AC-13 | `ui/kasa-sekme-izni` "AC-12 / AC-13" ve karşıt "AC-13 (karşıt)" |
| AC-14 | `ui/kasa-sekme-izni` "AC-2 / AC-14" |
| AC-15 | `ui/kasa-sekme-izni` "AC-15" |
| AC-16 | `kasa-sekme-izni.test.js` "AC-16" (motorlar izin okumaz); `kasa-sekme-gocu.cjs` "AC-16" (kullanıcı tablosu dışında veri aynı) |
| AC-17 | `kasa-sekme-gocu.cjs` "AC-17", "AC-7 / AC-17" |
| AC-18 | `kasa-sekme-gocu.cjs` "AC-18" |
| AC-19 | `kasa-sekme-gocu.cjs` iki "AC-19" kontrolü |
| AC-20 | `kasa-sekme-izni.test.js` "AC-20" |
| AC-21 | `kasa-sekme-izni.test.js` "AC-21" |
| AC-22 | `kasa-sekme-izni.test.js` "AC-22" |
| AC-23 | `kasa-sekme-izni.test.js` "AC-23"; `server-security.cjs` 0044 Q5 kontrolü (`cirocu`, Kasa'sız) |
| AC-24 | `ui/kasa-sekme-izni` iki "AC-24" testi |
| AC-25 | `server-security.cjs` "spec 0052 AC-25" |
| AC-26 | `ui/kasa-sekme-izni` "AC-26"; `kasa-sekme-izni.test.js` "AC-26 (sunucu yanı)" |
| DoD tek kural / yokluk kuralı yok | `kasa-sekme-izni.test.js` "R2", "R3 / X5", "DoD" |
| R19 | `ui/kasa-sekme-izni` "R7 (yedek)" |

## 5. Uygulama notları

- Muafiyet geçici olarak geri konunca yeni testlerden 6'sı kırılıyor (koruma doğrulandı).
- Mevcut takımda yalnız `ui/kasa-app`'in 0024 görünürlük testi kırıldı; yeni kurala çevrildi. `server-security.cjs`'te `odemeci` hesap açtığı için Kasa sekmesi aldı.

## 5a. Görsel kanıt

`docs/evidence/0052-piksel-raporu.json` (400 görüntü, 200 ekran × iki tema). Değişenler: `uygulama-menu-kasasiz` (76.525 / 77.243 piksel; Kasa satırı kalktı, Mali İşler grubu Finans + Giderler ile kaldı), `kullanici-izin-kasa` (1.282.971 / 1.285.941; Kasa kutusu "(varsayılan kapalı)" ile, oran "n / 13", açıklama satırı), `kullanici-izin-kasa-ipucu` (481.693 / 488.069; "Kasa ve hesaplar" altında ipucu). `uygulama-menu-kasali` 0 piksel. Geri kalan farklar bilinen metin kutusu köşesi gürültüsü (evrak, bayi, makina stok formu 83; servis formu 249). `musteri-tahsilat-hesap-penceresi` karanlık "önce" görüntüsü ilk çekimde boş kaldı, yalnız o ekran yeniden çekildi; önce ve sonra bayt bayt aynı (0). App ve UserManager tasarım sözlüğünü kullanmadığı için `kanit-eslemesi.json` kaydı yok.

## 5b. Triyaj (2026-09-30)

- **Bulgu 1:** `serverAuth.cjs` `KASA_SEKMELI_KAYITLAR` (virman/avans hareketi, `yon: "verilen"` çek) ve `kasaKaydiDegistiMi`; `eylemDenetimi` eylem izni denetimlerinden sonra, bu kayıtlardan biri eklenmiş, silinmiş ya da değişmişse Kasa sekmesi + önkoşul ister (`gerekli: "kasa_sekmesi"`). Geri yükleme aynı kayıtları korur (`src/lib/yedekKasa.js`, `SettingsBackup` `kasaVeriYetki`). Testler: `server-authz` spec 0052 bloğu, `server-security.cjs` üç triyaj kontrolü + AC-23'ün `kasasiz` ile kanıtı, `ui/kasa-sekme-yedek.test.jsx`. `server-authz`'ın 0024/0049 bloklarındaki olumlu virman/avans/kendi çek testlerine ve `cirocu`/`odemeci`'ye `"kasa"` eklendi.
- **Bulgu 2:** sınır spec R19'a yazıldı.

## 6. Sürüm notu

Kullanıcı izinlerinde Kasa için ayrı bir sekme kutusu var: yönetici Kasa'yı bir kullanıcıya verebilir ya da alabilir. Kasa yalnız Giderler ve Finans ile birlikte çalışır. Giderler ve Finans'ı olan mevcut kullanıcılar Kasa'yı görmeye devam eder (ilk açılışta izinlerine eklenir). Güncellenmemiş bilgisayarlarda kaldırılan Kasa ekranda görünmeye devam edebilir, ama hesap tanımları, virman, avans ve kendi çekle ilgili değişiklikler sunucuda reddedilir.
