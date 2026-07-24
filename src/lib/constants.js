// ── Altunmak Makina Modelleri (altunmak.com'dan alındı) ──────────────────
export const ALTUNMAK_MODELS = [
  { model: "AK100_DS",   sogutma: "Soğutmasız", kapasite: "1000 kg/gün", kalip: "10 cm", kompresör: "Kompresörsüz",
    tanim: "FİYATA 1 ADET KALIP DAHİLDİR.\nTEKNİK ÖZELLİKLERİ:\nGÜNLÜK TEKLİ KALIPTA MAX 31.500 VURUŞ KAPASİTELİDİR.\n1 TURDA 2 DEFA BASKI YAPABİLMEKTEDİR.\nSAATTE 0.75 KW. ENERJİ TÜKETİR.\nMAX. 98x120 mm EBATLARINDAKİ HER ÇEŞİT KÖFTEYİ HIZ AYAR KONTROLÜ SAYESİNDE AYARLANABİLEN TEKLİ KALIPTAMAX. 3600 ADET (60 VURUŞ) YAPMAKTADIR.\nHAZNE KAPASİTESİ 20 LT",
    tanimEN: "" },
  { model: "AK100_DSC",  sogutma: "Soğutmalı",  kapasite: "1000 kg/gün", kalip: "10 cm", kompresör: "Kompresörsüz",
    tanim: "KOMPRESÖRSÜZDE ÇALIŞABİLEN SİSTEM\n(FİYATA 1 ADET KALIP DAHİLDİR.)\nTEKNİK ÖZELLİKLERİ:\nGÜNLÜK TEKLİ KALIPTA MAX. 31.500 VURUŞ KAPASİTELİDİR.\nSAATTE 0,75 KW. ENERJİ TÜKETİR.\nHAZNE KAPASİTESİ TEK SEFERDE: 20 LT",
    tanimEN: "" },
  { model: "AK120_DS",   sogutma: "Soğutmasız", kapasite: "1000 kg/gün", kalip: "12 cm", kompresör: "Kompresörsüz", tanim: "", tanimEN: "" },
  { model: "AK120_DSC",  sogutma: "Soğutmalı",  kapasite: "1000 kg/gün", kalip: "12 cm", kompresör: "Kompresörsüz", tanim: "", tanimEN: "" },
  { model: "AK140_DSC",  sogutma: "Soğutmalı",  kapasite: "2000 kg/gün", kalip: "14 cm", kompresör: "Kompresörsüz", tanim: "", tanimEN: "" },
  { model: "SWP140_DSC", sogutma: "Soğutmalı",  kapasite: "2000 kg/gün", kalip: "14 cm", kompresör: "Kompresörsüz", tanim: "", tanimEN: "" },
];

// ── Ülke Listesi (statik) ─────────────────────────────────────────────────
export const COUNTRIES = [
  "Türkiye","Kuzey Kıbrıs Türk Cumhuriyeti","ABD","Afganistan","Almanya","Andorra",
  "Angola","Antigua ve Barbuda","Arjantin","Arnavutluk","Avustralya","Avusturya",
  "Azerbaycan","BAE","Bahamalar","Bahreyn","Bangladeş","Barbados",
  "Belçika","Belize","Benin","Beyaz Rusya","Bolivya","Bosna Hersek",
  "Botsvana","Brezilya","Brunei","Bulgaristan","Burkina Faso","Burundi",
  "Butan","Cabo Verde","Cezayir","Cibuti","Çad","Çek Cumhuriyeti",
  "Çin","Danimarka","Demokratik Kongo Cumhuriyeti","Doğu Timor","Dominik Cumhuriyeti","Dominika",
  "Ekvador","Ekvator Ginesi","El Salvador","Endonezya","Eritre","Ermenistan",
  "Estonya","Esvatini","Etiyopya","Fas","Fiji","Fildişi Sahili",
  "Filipinler","Filistin","Finlandiya","Fransa","Gabon","Gambiya",
  "Gana","Gine","Gine-Bissau","Grenada","Guatemala","Guyana",
  "Güney Afrika","Güney Kıbrıs","Güney Kore","Güney Sudan","Gürcistan","Haiti",
  "Hırvatistan","Hindistan","Hollanda","Honduras","Irak","İngiltere",
  "İran","İrlanda","İspanya","İsrail","İsveç","İsviçre",
  "İtalya","İzlanda","Jamaika","Japonya","Kamboçya","Kamerun",
  "Kanada","Karadağ","Katar","Kazakistan","Kenya","Kırgızistan",
  "Kiribati","Kolombiya","Komorlar","Kongo","Kosova","Kosta Rika",
  "Kuveyt","Kuzey Kore","Kuzey Makedonya","Küba","Laos","Lesotho",
  "Letonya","Liberya","Libya","Liechtenstein","Litvanya","Lübnan",
  "Lüksemburg","Macaristan","Madagaskar","Malavi","Maldivler","Malezya",
  "Mali","Malta","Marshall Adaları","Mauritius","Meksika","Mısır",
  "Mikronezya","Moğolistan","Moldova","Monako","Moritanya","Mozambik",
  "Myanmar","Namibya","Nauru","Nepal","Nijer","Nijerya",
  "Nikaragua","Norveç","Orta Afrika Cumhuriyeti","Özbekistan","Pakistan","Palau",
  "Panama","Papua Yeni Gine","Paraguay","Peru","Polonya","Portekiz",
  "Romanya","Ruanda","Rusya","Saint Kitts ve Nevis","Saint Lucia","Saint Vincent ve Grenadinler",
  "Samoa","San Marino","Sao Tome ve Principe","Senegal","Seyşeller","Sırbistan",
  "Sierra Leone","Singapur","Slovakya","Slovenya","Solomon Adaları","Somali",
  "Sri Lanka","Sudan","Surinam","Suriye","Suudi Arabistan","Şili",
  "Tacikistan","Tanzanya","Tayland","Tayvan","Togo","Tonga",
  "Trinidad ve Tobago","Tunus","Türkmenistan","Uganda","Ukrayna","Umman",
  "Uruguay","Ürdün","Vanuatu","Vatikan","Venezuela","Vietnam",
  "Yemen","Yeni Zelanda","Yunanistan","Zambiya","Zimbabve",
];


// Türkçe ülke adı → API'nin İngilizce adı (şehir sorgusu için)
export const COUNTRY_EN = {
  "Türkiye":"Türkiye","Kuzey Kıbrıs Türk Cumhuriyeti":"Northern Cyprus","ABD":"United States","Afganistan":"Afghanistan","Almanya":"Germany","Arjantin":"Argentina","Arnavutluk":"Albania",
  "Avustralya":"Australia","Avusturya":"Austria","Azerbaycan":"Azerbaijan","BAE":"United Arab Emirates",
  "Bahreyn":"Bahrain","Belçika":"Belgium","Beyaz Rusya":"Belarus","Bosna Hersek":"Bosnia and Herzegovina",
  "Brezilya":"Brazil","Bulgaristan":"Bulgaria","Cezayir":"Algeria","Çek Cumhuriyeti":"Czech Republic",
  "Çin":"China","Danimarka":"Denmark","Endonezya":"Indonesia","Estonya":"Estonia","Etiyopya":"Ethiopia",
  "Fas":"Morocco","Filipinler":"Philippines","Finlandiya":"Finland","Fransa":"France","Güney Afrika":"South Africa",
  "Güney Kore":"South Korea","Gürcistan":"Georgia","Hindistan":"India","Hırvatistan":"Croatia","Hollanda":"Netherlands",
  "Irak":"Iraq","İngiltere":"United Kingdom","İran":"Iran","İrlanda":"Ireland","İspanya":"Spain","İsrail":"Israel",
  "İsveç":"Sweden","İsviçre":"Switzerland","İtalya":"Italy","Japonya":"Japan","Kanada":"Canada","Karadağ":"Montenegro",
  "Katar":"Qatar","Kazakistan":"Kazakhstan","Kenya":"Kenya","Kırgızistan":"Kyrgyzstan","Kolombiya":"Colombia",
  "Kosova":"Kosovo","Kuveyt":"Kuwait","Kuzey Makedonya":"Macedonia","Libya":"Libya","Litvanya":"Lithuania",
  "Lübnan":"Lebanon","Macaristan":"Hungary","Malezya":"Malaysia","Meksika":"Mexico","Mısır":"Egypt",
  "Moldova":"Moldova","Nijerya":"Nigeria","Norveç":"Norway","Özbekistan":"Uzbekistan","Pakistan":"Pakistan",
  "Polonya":"Poland","Portekiz":"Portugal","Romanya":"Romania","Rusya":"Russia","Sırbistan":"Serbia",
  "Singapur":"Singapore","Slovakya":"Slovakia","Slovenya":"Slovenia","Suudi Arabistan":"Saudi Arabia","Şili":"Chile",
  "Tacikistan":"Tajikistan","Tayland":"Thailand","Tunus":"Tunisia","Türkmenistan":"Turkmenistan","Ukrayna":"Ukraine",
  "Umman":"Oman","Ürdün":"Jordan","Vietnam":"Vietnam","Yeni Zelanda":"New Zealand","Yunanistan":"Greece",
  "Angola":"Angola","Benin":"Benin","Botsvana":"Botswana","Burkina Faso":"Burkina Faso","Burundi":"Burundi","Çad":"Chad","Cibuti":"Djibouti","Demokratik Kongo Cumhuriyeti":"Democratic Republic of the Congo","Ekvator Ginesi":"Equatorial Guinea","Eritre":"Eritrea","Esvatini":"Eswatini","Fildişi Sahili":"Ivory Coast","Gabon":"Gabon","Gambiya":"Gambia","Gana":"Ghana","Gine":"Guinea","Gine-Bissau":"Guinea-Bissau","Güney Sudan":"South Sudan","Kamerun":"Cameroon","Kongo":"Republic of the Congo","Lesotho":"Lesotho","Liberya":"Liberia","Madagaskar":"Madagascar","Malavi":"Malawi","Mali":"Mali","Moritanya":"Mauritania","Mozambik":"Mozambique","Namibya":"Namibia","Nijer":"Niger","Orta Afrika Cumhuriyeti":"Central African Republic","Ruanda":"Rwanda","Senegal":"Senegal","Sierra Leone":"Sierra Leone","Somali":"Somalia","Sudan":"Sudan","Tanzanya":"Tanzania","Togo":"Togo","Uganda":"Uganda","Zambiya":"Zambia","Zimbabve":"Zimbabwe","Cabo Verde":"Cape Verde","Komorlar":"Comoros","Mauritius":"Mauritius","Sao Tome ve Principe":"Sao Tome and Principe","Seyşeller":"Seychelles","Ermenistan":"Armenia","Filistin":"Palestine","Suriye":"Syria","Yemen":"Yemen","Bangladeş":"Bangladesh","Brunei":"Brunei","Butan":"Bhutan","Doğu Timor":"Timor-Leste","Kamboçya":"Cambodia","Kuzey Kore":"North Korea","Laos":"Laos","Maldivler":"Maldives","Moğolistan":"Mongolia","Myanmar":"Myanmar","Nepal":"Nepal","Sri Lanka":"Sri Lanka","Tayvan":"Taiwan","İzlanda":"Iceland","Güney Kıbrıs":"Cyprus","Letonya":"Latvia","Lüksemburg":"Luxembourg","Malta":"Malta","Andorra":"Andorra","Monako":"Monaco","San Marino":"San Marino","Liechtenstein":"Liechtenstein","Vatikan":"Vatican City","Bolivya":"Bolivia","Dominik Cumhuriyeti":"Dominican Republic","Ekvador":"Ecuador","El Salvador":"El Salvador","Guatemala":"Guatemala","Guyana":"Guyana","Haiti":"Haiti","Honduras":"Honduras","Jamaika":"Jamaica","Kosta Rika":"Costa Rica","Küba":"Cuba","Nikaragua":"Nicaragua","Panama":"Panama","Paraguay":"Paraguay","Peru":"Peru","Surinam":"Suriname","Trinidad ve Tobago":"Trinidad and Tobago","Uruguay":"Uruguay","Venezuela":"Venezuela","Belize":"Belize","Bahamalar":"Bahamas","Barbados":"Barbados","Antigua ve Barbuda":"Antigua and Barbuda","Dominika":"Dominica","Grenada":"Grenada","Saint Kitts ve Nevis":"Saint Kitts and Nevis","Saint Lucia":"Saint Lucia","Saint Vincent ve Grenadinler":"Saint Vincent and the Grenadines","Fiji":"Fiji","Kiribati":"Kiribati","Marshall Adaları":"Marshall Islands","Mikronezya":"Micronesia","Nauru":"Nauru","Palau":"Palau","Papua Yeni Gine":"Papua New Guinea","Samoa":"Samoa","Solomon Adaları":"Solomon Islands","Tonga":"Tonga","Vanuatu":"Vanuatu",
};
// API'de farklı yazılabilen ülkeler için alternatif isimler
export const COUNTRY_ALT = {
  "Esvatini":"Swaziland","Kongo":"Congo","Vatikan":"Vatican City State (Holy See)",
  "Kuzey Makedonya":"North Macedonia",
  "ABD":"United States of America",
  "İngiltere":"United Kingdom of Great Britain and Northern Ireland",
  "Rusya":"Russian Federation",
  "Güney Kore":"Korea, Republic of",
  "İran":"Iran (Islamic Republic of)",
  "Moldova":"Moldova, Republic of",
  "Tanzanya":"Tanzania, United Republic of",
  "Vietnam":"Viet Nam",
};

// Türkiye illeri — API erişilemese bile şehir listesi her zaman dolu olsun
export const CITIES_TR = [
  "Adana","Adıyaman","Afyonkarahisar","Ağrı","Aksaray","Amasya","Ankara","Antalya","Ardahan","Artvin",
  "Aydın","Balıkesir","Bartın","Batman","Bayburt","Bilecik","Bingöl","Bitlis","Bolu","Burdur",
  "Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Düzce","Edirne","Elazığ","Erzincan",
  "Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Iğdır","Isparta","İstanbul",
  "İzmir","Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu","Kayseri","Kırıkkale","Kırklareli","Kırşehir",
  "Kilis","Kocaeli","Konya","Kütahya","Malatya","Manisa","Mardin","Mersin","Muğla","Muş",
  "Nevşehir","Niğde","Ordu","Osmaniye","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas",
  "Şanlıurfa","Şırnak","Tekirdağ","Tokat","Trabzon","Tunceli","Uşak","Van","Yalova","Yozgat","Zonguldak",
];

// KKTC ilçeleri — API'de bulunmadığı için statik liste (Türkiye gibi her zaman dolu).
export const CITIES_KKTC = ["Lefkoşa","Gazimağusa","Girne","Güzelyurt","İskele","Lefke"];

// API'den şehir gelmeyen ülkeler için statik şehir listesi (Türkiye ve KKTC).
export const staticCities = (country) =>
  country === "Türkiye" ? CITIES_TR
  : country === "Kuzey Kıbrıs Türk Cumhuriyeti" ? CITIES_KKTC
  : [];

// ── Seed Data ──────────────────────────────────────────────────────────────
export const INIT_CUSTOMERS = [];

export const INIT_DEALERS = [];

export const INIT_KALIPLAR = [
  { id: 7001, ad: "Adana Köfte" },
  { id: 7002, ad: "Hamburger" },
  { id: 7003, ad: "Kasap Köfte" },
  { id: 7004, ad: "Kadınbudu Köfte" },
  { id: 7005, ad: "Izgara Köfte" },
  { id: 7006, ad: "Baklava Köfte" },
  { id: 7007, ad: "Kare Kaşarlı Köfte" },
];

// Parça tipleri (kullanıcı-tanımlı). Sistem tipleri (sistem:true) kilitlidir: adı
// değişmez, silinmez, davranış kutucukları seed değerinde sabittir. Kullanıcının
// eklediği tipler tamamen serbesttir. Davranış bayrakları:
//   makinaSecici → makina ekle/düzenle formunda bu tip için parça seçici çıkar
//   stokDus      → seçilen parça makina atanınca stoktan 1 düşer (makinaSecici şart)
//   raporGoster  → makina yazdırma raporunda bu tipin seçimi listelenir
// rol: sistem tiplerinin stabil işlev anahtarı (migration ve tipSecimleri anahtarı id'dir).
// "Standart" davranışsız varsayılan tiptir. renk, PART_TYPE_PALETTE anahtarıdır.
export const INIT_PART_TYPES = [
  { id: "standart", ad: "Standart",     renk: "slate", makinaSecici: false, stokDus: false, raporGoster: false, sistem: true },
  { id: "konveyor", ad: "Konveyör Saç", renk: "blu",   makinaSecici: true,  stokDus: true,  raporGoster: false, sistem: true, rol: "konveyor" },
  { id: "bant",     ad: "Bant",         renk: "grn",   makinaSecici: true,  stokDus: true,  raporGoster: true,  sistem: true, rol: "bant" },
];

// Parça tipi rozet renk paleti (tema token'ları, dark-mode uyumlu). Tip.renk bu anahtarları kullanır.
export const PART_TYPE_PALETTE = {
  slate: { bg: "var(--n150, #f1f5f9)", color: "var(--n500, #64748b)", border: "var(--n200, #e2e8f0)" },
  blu:   { bg: "var(--bluBg, #eff6ff)", color: "var(--blu700, #1d4ed8)", border: "var(--bluBr, #bfdbfe)" },
  grn:   { bg: "var(--grnBg, #f0fdf4)", color: "var(--grn700, #15803d)", border: "var(--grnBr, #bbf7d0)" },
  amb:   { bg: "var(--ambBg, #fffbeb)", color: "var(--amb700, #b45309)", border: "var(--ambBr, #fde68a)" },
  pur:   { bg: "var(--purBg, #f5f3ff)", color: "var(--purTx, #7c3aed)", border: "var(--bluBr, #bfdbfe)" },
  teal:  { bg: "var(--grnBg, #f0fdf4)", color: "var(--teal, #0d9488)", border: "var(--grnBr, #bbf7d0)" },
  red:   { bg: "var(--redBg, #fef2f2)", color: "var(--red700, #b91c1c)", border: "var(--redBr, #fecaca)" },
};
// Yeni tip eklenirken sıradaki rengi otomatik atamak için (slate hariç, o Standart'a ait).
export const PART_TYPE_PALETTE_KEYS = ["blu", "grn", "amb", "pur", "teal", "red"];

// Bir parça tipi adına (part.tip) karşılık gelen rozet rengini döndürür. Tanımsız/
// bilinmeyen tip Standart (slate) rengine düşer.
export const tipRenk = (tipAd, partTypeDefs = []) => {
  const def = (partTypeDefs || []).find(t => t.ad === tipAd);
  return PART_TYPE_PALETTE[def?.renk] || PART_TYPE_PALETTE.slate;
};

export const INIT_STOCK = [];

export const INIT_SERVICES = [];

// Para birimleri
export const CURRENCIES = ["TRY", "USD", "EUR"];
export const CUR_SYM = { TRY: "₺", USD: "$", EUR: "€" };

// ── Satış Tipleri ──
export const SALE_TYPES = ["Faturalı Yurtiçi", "Faturalı Yurtdışı", "Faturasız Yurtiçi", "Faturasız Yurtdışı"];
export const DEFAULT_KDV_RATE = 20; // son çare fallback (dizi tamamen boş/geçersizse)
// KDV oranı zaman içinde değişti (Türkiye: 2023-07-10'a kadar %18, sonrasında %20) — Ayarlar'dan
// dönem eklenip/düzenlenebilir. Her kayıt kendi tarihine göre doğru dönemin oranını kullanır.
export const DEFAULT_KDV_RATES = [
  { from: "2008-01-01", rate: 18 },
  { from: "2023-07-10", rate: 20 },
];

// ── Yedek dosyası şeması ──────────────────────────────────────────────
export const BACKUP_SCHEMA_VERSION = 2;
export const BACKUP_APP_TAG = "altunmak-crm";
// Şifreli yedek zarfının işareti (electron/backupCrypto.cjs MARKER ile aynı olmalı) —
// renderer, bir yedek dosyasının şifreli mi düz mü olduğunu bu alanla ayırt eder.
export const BACKUP_ENC_MARKER = "altunmak-crm-encrypted";

export const SERVICE_TYPES = ["İlk Çalıştırma", "Garanti İçi", "Garanti Dışı", "Periyodik Bakım"];
export const REPAIR_PLACES = ["Yerinde Onarım", "Fabrikada Onarım", "Kargo", "Fabrika Teslim"];

// ── Firma çalışma saatleri (Ayarlar > Firma) ──
// Servis işçilik süresi (bakım başlangıcı → bitiş) yalnız bu mesai pencerelerine denk gelen
// dakikalardan sayılır (gece/hafta sonu/mola hariç); bkz. mesaiDk. gunler: getDay() değerleri
// (0=Paz,1=Pzt..6=Cmt). molalar: [{baslangic,bitis}] — boş dizi = mola yok. Config yoksa bu
// varsayılan uygulanır. appSettings.calismaSaatleri içinde saklanır.
export const CALISMA_SAATLERI_VARSAYILAN = {
  baslangic: "08:30", bitis: "19:00", gunler: [1, 2, 3, 4, 5],
  molalar: [{ baslangic: "12:30", bitis: "13:30" }],
};
export const HAFTA_GUNLERI = [
  { deger: 1, kisa: "Pzt" }, { deger: 2, kisa: "Sal" }, { deger: 3, kisa: "Çar" },
  { deger: 4, kisa: "Per" }, { deger: 5, kisa: "Cum" }, { deger: 6, kisa: "Cmt" }, { deger: 0, kisa: "Paz" },
];

// ── Servis Panosu yeni-servis alarmı (Ayarlar > Uygulama > Servis Panosu) ──
// Uzaktan (sunucudan) eklenen yeni "Bekliyor" servis geldiğinde pano kartı yanıp söner + sesli
// uyarı çalar + üstte bildirim şeridi çıkar. Kullanıcı bu ayar sayfasından açıp kapatır ve süreleri
// belirler (appSettings.servisAlarm — sunucu izin sistemine bağlı değil). acik: alarm açık mı;
// sesSn: ses kaç sn öter; yanipSn: kart kaç sn yanıp söner. Varsayılan kapalı (açan devreye alır).
export const SERVIS_ALARM_VARSAYILAN = { acik: false, sesSn: 25, yanipSn: 40 };

// ── Kapora/Ödeme Yöntemleri ──
export const ODEME_YONTEMLERI = ["Nakit", "Kredi Kartı", "Çek"];

export const APP_VERSION = "3.10.0";

// ── Hata raporu e-postasının gideceği sabit geliştirici adresi ──
export const DEV_REPORT_EMAIL = "keremgenisel@gmail.com";

// ── Çöp Kutusu: soft-delete edilen kayıtların otomatik kalıcı silinme süresi (gün) ──
export const TRASH_RETENTION_DAYS = 30;

export const SALE_TYPE_STYLE = {
  "Faturalı Yurtiçi":  { bg: "#d1fae5", fg: "#065f46" },
  "Faturalı Yurtdışı": { bg: "#dbeafe", fg: "#1d4ed8" },
  "Faturasız Yurtiçi": { bg: "#fef3c7", fg: "#92400e" },
  "Faturasız Yurtdışı":{ bg: "#fde68a", fg: "#7c2d12" },
};
