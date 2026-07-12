// İstemci tarafı TLS sertifika sabitleme (pinning).
// Sunucu self-signed sertifika kullandığı için halka açık CA doğrulaması yapılamaz; bunun
// yerine istemci, ilk bağlantıda gördüğü sertifikayı (SSH tarzı TOFU) sabitler ve sonraki
// bağlantılarda YALNIZ o sertifikayı kabul eder.
//
// pinliDispatcher(pem): undici Agent — ca = pinlenen PEM olduğundan zincir yalnız o
// sertifikayla geçerli; checkServerIdentity boş döner, böylece hostname/IP eşleşmesi
// atlanır (aynı sunucuya farklı IP'den — DHCP/Tailscale — bağlanınca da pin çalışır).
// rejectUnauthorized varsayılan true kalır: sertifika pinlenenle eşleşmezse el sıkışma reddedilir.
const tls = require("tls");
const net = require("net");
const crypto = require("crypto");
// ÖNEMLI: pinli isteklerde undici'nin KENDİ fetch'i kullanılır. Node/Electron'un global
// fetch'i farklı sürüm bir undici ile geldiğinden, dışarıdan verilen dispatcher'ı reddeder
// ("invalid onRequestStart method"). fetch + Agent aynı undici'den gelmeli.
const { Agent, fetch: pinliFetch } = require("undici");

function pinliDispatcher(certPem) {
  return new Agent({
    connect: {
      ca: [certPem],
      checkServerIdentity: () => undefined, // yalnız fp/zincir önemli, hostname değil
    },
  });
}

// Bir https adresinden peer sertifikasını (doğrulamadan) al. { fp, pem } döndürür.
// İlk bağlantıda kullanıcıya parmak izini göstermek ve pinlemek için kullanılır.
// Sunucu TLS desteklemiyorsa (eski/http-only) TLS el sıkışması başarısız olur ve reddeder.
function sertifikaParmakIziAl(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(url); } catch (e) { reject(e); return; }
    const port = u.port ? Number(u.port) : 443;
    // SNI (servername) yalnız DNS adı için gönderilir; IP adresinde RFC 6066 ihlali olur.
    const servername = net.isIP(u.hostname) ? undefined : u.hostname;
    const socket = tls.connect(
      { host: u.hostname, port, servername, rejectUnauthorized: false, timeout: timeoutMs },
      () => {
        try {
          const peer = socket.getPeerCertificate(true);
          if (!peer || !peer.raw) { socket.destroy(); reject(new Error("Sertifika alınamadı")); return; }
          const x = new crypto.X509Certificate(peer.raw);
          const out = { fp: x.fingerprint256, pem: x.toString() };
          socket.end();
          resolve(out);
        } catch (e) { try { socket.destroy(); } catch { /* zaten kapalı */ } reject(e); }
      }
    );
    socket.on("error", (e) => reject(e));
    socket.on("timeout", () => { try { socket.destroy(); } catch { /* zaten kapalı */ } reject(new Error("Zaman aşımı")); });
  });
}

module.exports = { pinliDispatcher, sertifikaParmakIziAl, pinliFetch };
