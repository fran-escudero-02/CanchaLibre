import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "../api/client";

function mockFetch(status, body) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(body ? JSON.stringify(body) : ""),
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("api client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("envía el Bearer token cuando hay sesión", async () => {
    const fetchMock = mockFetch(200, { ok: true });
    localStorage.setItem("cl_token", "mi-jwt");

    await api("/bookings/mis-reservas");

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer mi-jwt");
  });

  it("no envía Authorization sin sesión", async () => {
    const fetchMock = mockFetch(200, []);

    await api("/complexes");

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("propaga el mensaje de error del backend como ApiError", async () => {
    mockFetch(409, { error: "El turno no esta disponible" });

    const err = await api("/bookings/initiate", { method: "POST", body: { slotId: 1 } })
      .catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(409);
    expect(err.message).toBe("El turno no esta disponible");
  });
});
