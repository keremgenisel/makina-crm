// Bu oturumda BU uygulamadan (yerel) eklenen servis id'leri. Uygulama genelindeki yeni-servis
// bildirimi (App.jsx), kendi eklediğimiz servisi "uzaktan geldi" sanıp bildirim çıkarmasın diye
// bu kümeye bakar. Modül düzeyinde tutulur (React state değil) — ekleme herhangi bir ekranda olabilir.
const yerel = new Set();

export const yerelServisEkle = (id) => { if (id != null) yerel.add(id); };
export const yerelServisMi = (id) => yerel.has(id);
