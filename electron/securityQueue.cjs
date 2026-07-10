// İstemci PC'de uygulama kilidi (app-lock) denemelerinin yerel kuyruğu.
// App-lock, sunucuya giriş yapılmadan ÖNCE (uygulama açılışında) çalışır; o an
// sunucu token'ı olmadığı için olay anında gönderilemez. Bunun yerine burada
// yerel bir JSON dosyasına biriktirilir ve sunucuya başarılı giriş yapılınca
// (data.cjs server:login) toplu olarak /api/security-log/ingest ile gönderilip
// kuyruk temizlenir. Zaman damgaları korunur, yani gecikmeli de olsa kayıp olmaz.
const fs = require("fs");

const MAX_QUEUE = 500; // taşma koruması: en fazla bu kadar bekleyen kayıt tutulur (en eskiler düşer)

function readQueue(queuePath) {
  try {
    if (!fs.existsSync(queuePath)) return [];
    const arr = JSON.parse(fs.readFileSync(queuePath, "utf-8"));
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function enqueue(queuePath, entry) {
  const list = readQueue(queuePath);
  list.push(entry);
  // Sınırı aşarsa baştan (en eski) kırp
  const trimmed = list.length > MAX_QUEUE ? list.slice(list.length - MAX_QUEUE) : list;
  try { fs.writeFileSync(queuePath, JSON.stringify(trimmed), "utf-8"); return true; }
  catch { return false; }
}

function clearQueue(queuePath) {
  try { if (fs.existsSync(queuePath)) fs.unlinkSync(queuePath); } catch { /* yoksay */ }
}

module.exports = { readQueue, enqueue, clearQueue, MAX_QUEUE };
