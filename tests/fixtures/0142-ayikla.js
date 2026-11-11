// Spec 0142 C2: motorun tek eklentisi parça satırının `olculer` alanı ve tedarikçi bölümlerinin `belge` alanı, triyajda pencere satırının `belgeYeri` ibaresi. Spec öncesi altınla
// karşılaştıran eski kıyaslar bu iki alanı karşılaştırmadan önce siler; başka hiçbir alan silinmez.
export const ayikla0142 = (x) => JSON.parse(JSON.stringify(x, (k, v) => (k === "olculer" || k === "belge" || k === "belgeYeri" ? undefined : v)));
