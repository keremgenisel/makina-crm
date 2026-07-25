// Uygulama geneli yeni-servis bildirim sesi — Servis ve Kargo Panosu DIŞINDAKİ ekranlarda çalar.
// Panonun sesinden (alarmSes.js: sert, iki tonlu, tekrar eden kare-dalga siren) KASITLI olarak
// farklıdır: burada yükselen üç notalı yumuşak (triangle) tek seferlik bir "çıngırak" çalar, böylece
// kullanıcı sesten hangi bağlamda uyarıldığını ayırt eder. Aynı paylaşılan AudioContext'i kullanır
// (kilidiAc tek dokunuşla ikisini de açar). AudioContext yoksa (jsdom/test) sessizce no-op.
import { sesContext } from "./alarmSes";

// Tek seferlik bildirim çıngırağı: C5 → E5 → G5 (yükselen majör üçlü), yumuşak triangle dalga.
export function bildirimCal() {
  const c = sesContext();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  try {
    const notalar = [523.25, 659.25, 783.99]; // C5, E5, G5
    const t0 = c.currentTime;
    notalar.forEach((f, i) => {
      const t = t0 + i * 0.13;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.connect(g).connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch { /* ses çalınamadı → sessiz geç (görsel bildirim + rozet devrede) */ }
}
