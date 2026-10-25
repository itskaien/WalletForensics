import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import prisma from "../src/config/prismaClient.js";

describe("Wallet Report API", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should reject invalid addresses", async () => {
    const res = await request(app)
      .post("/api/wallet-report")
      .send({ address: "12345" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBeUndefined();
  });

  it("should return data for a valid address", async () => {
    const res = await request(app)
      .post("/api/wallet-report")
      .send({ address: "BGr6P4TmHV5Rpt4zPPCz9znPkqyTMPTouDUSFFzXtXAZ" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.grades).toBeDefined();
  }, 30000);
});
