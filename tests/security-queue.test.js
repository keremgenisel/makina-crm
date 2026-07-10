import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { readQueue, enqueue, clearQueue, MAX_QUEUE } from "../electron/securityQueue.cjs";

let qp;
beforeEach(() => { qp = path.join(os.tmpdir(), `secq-${Date.now()}-${Math.random().toString(36).slice(2)}.json`); });
afterEach(() => { try { fs.unlinkSync(qp); } catch { /* yok */ } });

describe("securityQueue", () => {
  it("boş dosya için boş dizi döner", () => {
    expect(readQueue(qp)).toEqual([]);
  });

  it("enqueue eklenen kayıtları sırasıyla saklar", () => {
    enqueue(qp, { ts: "a", action: "uygulama_kilidi_basarili" });
    enqueue(qp, { ts: "b", action: "uygulama_kilidi_basarisiz" });
    const list = readQueue(qp);
    expect(list.map(x => x.ts)).toEqual(["a", "b"]);
  });

  it("clearQueue kuyruğu siler", () => {
    enqueue(qp, { ts: "a", action: "uygulama_kilidi_basarili" });
    clearQueue(qp);
    expect(readQueue(qp)).toEqual([]);
    expect(fs.existsSync(qp)).toBe(false);
  });

  it("MAX_QUEUE sınırını aşınca en eski kayıtlar düşer", () => {
    for (let i = 0; i < MAX_QUEUE + 25; i++) enqueue(qp, { ts: String(i), action: "uygulama_kilidi_basarisiz" });
    const list = readQueue(qp);
    expect(list.length).toBe(MAX_QUEUE);
    // İlk 25 kayıt kırpılmalı → en eski kalan "25"
    expect(list[0].ts).toBe("25");
    expect(list[list.length - 1].ts).toBe(String(MAX_QUEUE + 24));
  });

  it("bozuk JSON'da boş dizi döner (çökmeden)", () => {
    fs.writeFileSync(qp, "{bozuk");
    expect(readQueue(qp)).toEqual([]);
  });
});
