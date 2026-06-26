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
  "Türkiye",
  "ABD","Almanya","Arjantin","Arnavutluk","Avustralya","Avusturya","Azerbaycan",
  "BAE","Bahreyn","Belçika","Beyaz Rusya","Bosna Hersek","Brezilya","Bulgaristan",
  "Cezayir","Çek Cumhuriyeti","Çin","Danimarka","Endonezya","Estonya","Etiyopya",
  "Fas","Filipinler","Finlandiya","Fransa","Güney Afrika","Güney Kore","Gürcistan",
  "Hindistan","Hırvatistan","Hollanda","Irak","İngiltere","İran","İrlanda","İspanya",
  "İsrail","İsveç","İsviçre","İtalya","Japonya","Kanada","Karadağ","Katar","Kazakistan",
  "Kenya","Kırgızistan","Kolombiya","Kosova","Kuveyt","Kuzey Makedonya","Libya",
  "Litvanya","Lübnan","Macaristan","Malezya","Meksika","Mısır","Moldova","Nijerya",
  "Norveç","Özbekistan","Pakistan","Polonya","Portekiz","Romanya","Rusya",
  "Sırbistan","Singapur","Slovakya","Slovenya","Suudi Arabistan","Şili","Tacikistan",
  "Tayland","Tunus","Türkmenistan","Ukrayna","Umman","Ürdün","Vietnam","Yeni Zelanda","Yunanistan",
];


// Türkçe ülke adı → API'nin İngilizce adı (şehir sorgusu için)
export const COUNTRY_EN = {
  "Türkiye":"Türkiye","ABD":"United States","Almanya":"Germany","Arjantin":"Argentina","Arnavutluk":"Albania",
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
};
// API'de farklı yazılabilen ülkeler için alternatif isimler
export const COUNTRY_ALT = {
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
export const BACKUP_SCHEMA_VERSION = 1;
export const BACKUP_APP_TAG = "altunmak-crm";

export const SERVICE_TYPES = ["İlk Çalıştırma", "Garanti İçi", "Garanti Dışı", "Periyodik Bakım"];
export const REPAIR_PLACES = ["Yerinde Onarım", "Fabrikada Onarım", "Kargo", "Fabrika Teslim"];

// ── Kapora/Ödeme Yöntemleri ──
export const ODEME_YONTEMLERI = ["Nakit", "Kredi Kartı", "Çek"];

export const APP_VERSION = "1.1.0";

// ── Hata raporu e-postasının gideceği sabit geliştirici adresi ──
export const DEV_REPORT_EMAIL = "keremgenisel@gmail.com";

// ── Çöp Kutusu: soft-delete edilen kayıtların otomatik kalıcı silinme süresi (gün) ──
export const TRASH_RETENTION_DAYS = 30;
