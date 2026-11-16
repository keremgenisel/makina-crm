// Spec 0148: Malzemeler listesinin eksiklik kuralı için örnek kayıtlar (motor ve ekran testleri birlikte kullanır).
// Fiyatsız: özgül ağırlığı var, ne kilo fiyatı ne bant.
export const FIYATSIZ = { id: 1, ad: "Beyaz derlin", ozgulAgirlik: 1.42 };
export const FIYATSIZ_OZGULSUZ = { id: 2, ad: "Kestamid" };
export const DOVIZ_FIYATSIZ = { id: 3, ad: "Pirinç", ozgulAgirlik: 8.5, paraBirimi: "USD" };
export const BANT_LAMASIZ = { id: 4, ad: "304", ozgulAgirlik: 7.9, bantlar: [{ alt: 0, fiyat: 2.9 }] };
export const KURSUZ = { id: 5, ad: "EUR çelik", ozgulAgirlik: 7.85, kiloFiyati: 5, paraBirimi: "EUR" };
export const GBP = { id: 6, ad: "GBP çelik", ozgulAgirlik: 7.85, paraBirimi: "GBP" };
export const TAM = { id: 7, ad: "8620", ozgulAgirlik: 7.85, kiloFiyati: 95 };
