// İstemci TLS sertifika sabitleme (pinning): pinlenen sertifikayla eşleşen sunucuya
// bağlanır, farklı bir self-signed sertifika sunan sunucuyu (ortadaki-adam) reddeder.
// Ayrıca parmak izi (fp) üretimin/TLS peer/istemci tarafında birebir aynı olduğunu doğrular.
// Node ortamında çalışır (undici + tls); serverTls electron yoksa anahtarı düz dosyaya yazar.
import { describe, it, expect } from "vitest";
import os from "os";
import path from "path";
import fs from "fs";
import https from "https";
import { sertifikaUretVeyaYukle, fingerprintOf } from "../electron/serverTls.cjs";
import { pinliDispatcher, sertifikaParmakIziAl, pinliFetch } from "../electron/pinnedFetch.cjs";

function fakeApp() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "pf-"));
  return { getPath: () => d };
}

async function httpsSunucu(key, cert, yanit = "OK") {
  const srv = https.createServer({ key, cert }, (_req, res) => res.end(yanit));
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  return { srv, url: `https://127.0.0.1:${srv.address().port}/` };
}

describe("pinnedFetch (TLS sabitleme)", () => {
  it("fp biçimi doğru ve fingerprintOf(cert) ile tutarlı", async () => {
    const { cert, fp } = await sertifikaUretVeyaYukle(fakeApp());
    expect(fp).toMatch(/^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/); // 32 bayt iki-nokta hex
    expect(fingerprintOf(cert)).toBe(fp);
  });

  it("doğru sertifikayı kabul, farklı self-signed'ı reddeder", async () => {
    const { key, cert, fp } = await sertifikaUretVeyaYukle(fakeApp());
    const { srv, url } = await httpsSunucu(key, cert);
    try {
      // Parmak izini al (login öncesi TOFU adımı) — sunucunun gerçek fp'siyle aynı olmalı
      const got = await sertifikaParmakIziAl(url);
      expect(got.fp).toBe(fp);
      expect(got.pem).toContain("BEGIN CERTIFICATE");

      // Doğru sertifika pinlenmiş → bağlantı kabul
      const okRes = await pinliFetch(url, { dispatcher: pinliDispatcher(cert) });
      expect(okRes.status).toBe(200);
      expect(await okRes.text()).toBe("OK");

      // Başka bir self-signed pinlenmiş → sunucunun sertifikası eşleşmez → RET (MITM engellenir)
      const { cert: baskaCert } = await sertifikaUretVeyaYukle(fakeApp());
      await expect(pinliFetch(url, { dispatcher: pinliDispatcher(baskaCert) })).rejects.toBeTruthy();
    } finally {
      srv.close();
    }
  });
});
