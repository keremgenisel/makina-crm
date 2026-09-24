// GEÇİCİ: gider modülü yayın perdesi (spec 0008). Gider modülü (0001 gider kaydı, 0002 makina maliyeti ve
// kârlılık, 0003 ödeme hatırlatıcısı) kodda tamam ama kullanıcıya henüz açılmıyor. Kurulu (üretim derlemesi)
// sürümde Giderler sekmesi bir bilgi sayfası gösterir, modülden türeyen bütün görünümler gizlenir; geliştirme
// modunda (npm run dev) ve testlerde modül tam çalışır. Kullanıcı ayarı, izin veya kalıcı alan DEĞİLDİR.
//
// KALDIRMA (tek adım): aşağıdaki GIDER_PERDESI'ni false yapın. Modül perde öncesi davranışına birebir döner.
// İsteğe bağlı temizlik (ayrı iş): bu dosya, components/gider/GiderPerdesi.jsx, App.jsx'teki giderPerdesiIndi
// dalı ve spec 0008 testleri (yayin-perdesi, ui/gider-perdesi, ui/gider-perdesi-yedek) silinebilir;
// SettingsBackup'ın giderVeriYetki prop'u giderYetki ile aynı değere düşer.
export const GIDER_PERDESI = true;

// Perde bu derlemede inik mi? Ölçüt Vite'ın üretim işareti (senkron, derleme anında sabit; spec 0008 K1).
export const giderPerdesiIndi = (ortam = import.meta.env, isaret = GIDER_PERDESI) => !!isaret && !!ortam?.PROD;
