// Kalıcı bilinen-sunucu deposu (SSH known_hosts modeli): bir kez doğrulanan sunucu, config
// sıfırlansa (Yerel Moda Dön) bile tekrar sorulmaz; sertifika değişirse "kimlik değişti" çıkar.
import { describe, it, expect } from "vitest";
import os from "os";
import path from "path";
import fs from "fs";
import { kaydet, hostFp, fpBilinir, guvenKarari } from "../electron/knownServers.cjs";

function fakeApp() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "ks-"));
  return { getPath: () => d };
}
const FP = "AA:BB:CC:DD";
const FP2 = "11:22:33:44";
const HOST = "100.93.92.108:3000";

describe("knownServers — güven kararı (saf)", () => {
  it("hiç bilgi yoksa needTrust (ilk bağlantı)", () => {
    expect(guvenKarari({ certFp: FP, hostFp: null, configFp: null, fpKnown: false })).toBe("needTrust");
  });
  it("bu host için kayıtlı fp eşleşiyorsa sessiz güven", () => {
    expect(guvenKarari({ certFp: FP, hostFp: FP, configFp: null, fpKnown: false })).toBe("trusted");
  });
  it("bu host için kayıtlı fp FARKLIYSA mismatch (sertifika değişti)", () => {
    expect(guvenKarari({ certFp: FP, hostFp: FP2, configFp: null, fpKnown: false })).toBe("mismatch");
  });
  it("force ile mismatch aşılır (yine güven)", () => {
    expect(guvenKarari({ certFp: FP, hostFp: FP2, configFp: null, fpKnown: false, force: true })).toBe("trusted");
  });
  it("mevcut config pini eşleşiyorsa güven (göç)", () => {
    expect(guvenKarari({ certFp: FP, hostFp: null, configFp: FP, fpKnown: false })).toBe("trusted");
  });
  it("fp başka adreste biliniyorsa güven (aynı sertifika, farklı IP)", () => {
    expect(guvenKarari({ certFp: FP, hostFp: null, configFp: null, fpKnown: true })).toBe("trusted");
  });
  it("kullanıcı bu turda onayladıysa (trust) güven", () => {
    expect(guvenKarari({ certFp: FP, hostFp: null, configFp: null, fpKnown: false, trust: true })).toBe("trusted");
  });
});

describe("knownServers — kalıcı depo", () => {
  it("kaydeder, host ve fp ile bulunur, farkı bulmaz", () => {
    const app = fakeApp();
    expect(hostFp(app, HOST)).toBeNull();
    expect(fpBilinir(app, FP)).toBe(false);
    kaydet(app, HOST, FP);
    expect(hostFp(app, HOST)).toBe(FP);
    expect(fpBilinir(app, FP)).toBe(true);
    expect(fpBilinir(app, FP2)).toBe(false);
    expect(fs.existsSync(path.join(app.getPath(), "known-servers.json"))).toBe(true);
  });

  it("config sıfırlansa (temp'te dosya kalır) bilinen sunucu tekrar SORULMAZ", () => {
    const app = fakeApp();
    kaydet(app, HOST, FP); // ilk doğrulama
    // "Yerel Moda Dön" server-config'i siler ama known-servers dosyasına dokunmaz → hâlâ burada.
    const karar = guvenKarari({ certFp: FP, hostFp: hostFp(app, HOST), configFp: null, fpKnown: fpBilinir(app, FP) });
    expect(karar).toBe("trusted"); // needTrust DEĞİL → tekrar sormaz
  });
});
