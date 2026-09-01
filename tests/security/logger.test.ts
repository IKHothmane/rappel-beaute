import { describe, expect, it } from "vitest";
import { logger, maskPhone } from "@/lib/logger";

describe("Logger — sanitization", () => {
  it("masque les champs sensibles", () => {
    const logs: string[] = [];
    const orig = console.log;
    console.log = (msg: string) => logs.push(msg);
    try {
      logger.info("test", {
        userId: "u1",
        password: "secret123",
        token: "jwt-abc",
        DATABASE_URL: "postgresql://user:pass@host/db",
      });
      const parsed = JSON.parse(logs[0]!);
      expect(parsed.password).toBe("[REDACTED]");
      expect(parsed.token).toBe("[REDACTED]");
      expect(parsed.DATABASE_URL).toBe("[REDACTED]");
      expect(parsed.userId).toBe("u1");
    } finally {
      console.log = orig;
    }
  });

  it("maskPhone masque le numéro", () => {
    expect(maskPhone("0612345678")).toBe("***5678");
  });
});
