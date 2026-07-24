// Servis Panosu uyarı sesi — Web Audio ile üretilir (repoya ses dosyası eklemeden).
// Tarayıcılar kullanıcı etkileşimi olmadan ses çalmayı engeller (autoplay); ilk dokunuşta
// kilidiAc() ile AudioContext uyandırılır. AudioContext yoksa (jsdom/test, eski tarayıcı) tüm
// işlemler sessizce no-op olur — yanıp sönme + bildirim şeridi zaten sesten bağımsız yedektir.

let ctx = null;
function getCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { if (!ctx) ctx = new AC(); } catch { return null; }
  return ctx;
}

// İlk kullanıcı dokunuşunda çağrılır: askıdaki AudioContext'i uyandırır.
export function kilidiAc() {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

// İki tonlu kısa bip (siren hissi).
function bipCal() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  try {
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(620, t + 0.16);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    osc.connect(g).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.36);
  } catch { /* ses çalınamadı → sessiz geç */ }
}

// Alarm denetleyicisi: baslat(sureSn) süresince ~her sn bir bip çalar; durdur() erkenden keser.
export function createAlarm() {
  let timer = null;
  let stopAt = 0;
  const durdur = () => { if (timer) { clearInterval(timer); timer = null; } };
  return {
    baslat(sureSn) {
      durdur();
      if (!getCtx()) return; // ses yok → sessiz (görsel uyarı devrede)
      stopAt = Date.now() + Math.max(1, Number(sureSn) || 1) * 1000;
      bipCal();
      timer = setInterval(() => {
        if (Date.now() >= stopAt) { durdur(); return; }
        bipCal();
      }, 950);
    },
    durdur,
  };
}
