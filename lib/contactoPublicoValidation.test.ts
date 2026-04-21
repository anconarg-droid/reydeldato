import { describe, it, expect } from "vitest";
import {
  fixWwwConcatenatedTypo,
  validateOptionalInstagram,
  validateOptionalWebsite,
} from "./contactoPublicoValidation";

describe("validateOptionalInstagram", () => {
  it("normaliza mayúsculas y @ al handle", () => {
    const r = validateOptionalInstagram("@ElMecanico_12");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.normalized).toBe("elmecanico_12");
  });

  it("rechaza espacios y enlaces de post", () => {
    expect(validateOptionalInstagram("el mecanico").ok).toBe(false);
    expect(validateOptionalInstagram("https://instagram.com/p/abc/").ok).toBe(false);
  });
});

describe("fixWwwConcatenatedTypo", () => {
  it("inserta el punto faltante tras www", () => {
    expect(fixWwwConcatenatedTypo("wwwmopnvent.com")).toBe("www.mopnvent.com");
    expect(fixWwwConcatenatedTypo("WWWmopnvent.com")).toBe("www.mopnvent.com");
  });

  it("no altera hosts ya correctos", () => {
    expect(fixWwwConcatenatedTypo("www.mopnvent.com")).toBe("www.mopnvent.com");
    expect(fixWwwConcatenatedTypo("mopnvent.com")).toBe("mopnvent.com");
  });
});

describe("validateOptionalWebsite", () => {
  it("normaliza www pegado al subdominio (typo sin punto)", () => {
    const r = validateOptionalWebsite("https://wwwmopnvent.com/path");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.normalized).toContain("www.mopnvent.com");
  });

  it("rechaza dominio solo .co (confusión con .com)", () => {
    expect(validateOptionalWebsite("elmecanico.co").ok).toBe(false);
    expect(validateOptionalWebsite("www.elmecanico.co").ok).toBe(false);
    expect(validateOptionalWebsite("https://www.elmecanico.co").ok).toBe(false);
  });

  it("acepta .com.co y otros segundos niveles colombianos", () => {
    const r = validateOptionalWebsite("empresa.com.co");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.normalized).toMatch(/^https:\/\//);
  });

  it("acepta .cl y .com", () => {
    expect(validateOptionalWebsite("elmecanico.cl").ok).toBe(true);
    expect(validateOptionalWebsite("elmecanico.com").ok).toBe(true);
  });
});
