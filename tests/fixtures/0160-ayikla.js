// Spec 0160 (AC-36, R4/5): analiz motorunun parça satırına eklenen `partId` alanı spec öncesi altınlardan ayıklanır
// (`parcalar[]` ve aynı nesneyi gösteren `ozet.enCokParca`).
export const partIdAyikla = (p) => (p ? (({ partId: _p, ...x }) => x)(p) : p);
// Spec 0160 R3 (AC-27): Parça Stoğu hücresine eklenen alt satır, ekran metnini karşılaştıran eski kıyaslarda DOM'dan çıkarılır.
export const aramaAltSatirlariniSil = (kok = document) => { kok.querySelectorAll('[data-testid="arama-alt-satir"]').forEach(e => e.remove()); };
