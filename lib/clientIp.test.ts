import { describe, expect, it } from "vitest";
import { clientIpFromHeaders } from "./clientIp";

const h = (entries: Record<string, string>) => new Headers(entries);

describe("clientIpFromHeaders", () => {
  it("takes the first hop from x-forwarded-for", () => {
    expect(
      clientIpFromHeaders(h({ "x-forwarded-for": "203.0.113.5, 70.41.3.18" }))
    ).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIpFromHeaders(h({ "x-real-ip": "198.51.100.2" }))).toBe(
      "198.51.100.2"
    );
  });

  it("returns null when no IP header is present", () => {
    expect(clientIpFromHeaders(h({}))).toBeNull();
  });

  it("falls through to x-real-ip when x-forwarded-for is empty", () => {
    expect(
      clientIpFromHeaders(h({ "x-forwarded-for": "", "x-real-ip": "198.51.100.2" }))
    ).toBe("198.51.100.2");
  });
});
