import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { requireAdminToken } from "./adminAuth";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as VercelResponse & { statusCode: number; body: unknown };
}

describe("requireAdminToken", () => {
  const original = process.env.DEV_ADMIN_TOKEN;

  beforeEach(() => {
    process.env.DEV_ADMIN_TOKEN = "test-admin-token";
  });

  afterEach(() => {
    process.env.DEV_ADMIN_TOKEN = original;
  });

  it("rejects requests without a token", () => {
    const req = { headers: {} } as VercelRequest;
    const res = mockRes();

    expect(requireAdminToken(req, res)).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it("accepts Bearer token", () => {
    const req = {
      headers: { authorization: "Bearer test-admin-token" },
    } as VercelRequest;
    const res = mockRes();

    expect(requireAdminToken(req, res)).toBe(true);
  });

  it("accepts x-admin-token header", () => {
    const req = {
      headers: { "x-admin-token": "test-admin-token" },
    } as VercelRequest;
    const res = mockRes();

    expect(requireAdminToken(req, res)).toBe(true);
  });

  it("returns 503 when DEV_ADMIN_TOKEN is unset", () => {
    delete process.env.DEV_ADMIN_TOKEN;
    const req = { headers: { authorization: "Bearer anything" } } as VercelRequest;
    const res = mockRes();

    expect(requireAdminToken(req, res)).toBe(false);
    expect(res.statusCode).toBe(503);
  });
});
