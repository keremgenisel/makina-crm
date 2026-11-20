// Spec 0150 AC-19: sipariş motorunun bu spec'le eklenen alanları (`islemler` dizileri, belge bölümünün işlem toplamı ve sayacı)
// eski kıyas altınlarıyla karşılaştırmadan önce düşer. Başka hiçbir alana dokunmaz; sayısal alanlar aynen kıyaslanır.
const YENI = new Set(["islemler", "islemToplamK", "islemTutarsizSayi", "hataliParcalar", "gizliHatalar"]); // son ikisi triyaj (bulgu 1)
export const ayikla0150 = (x) => JSON.parse(JSON.stringify(x, (k, v) => (YENI.has(k) ? undefined : v)));
