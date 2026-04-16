import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

/**
 * Integration test: full DRAFT → SUBMITTED → APPROVED lifecycle.
 * Requires a running PostgreSQL instance.
 * Set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME in .env.
 */
describe("Expense Report Happy Path (integration)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let adminToken: string;
  let reportId: string;
  let itemId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = module.get(PrismaService);
    // Clean up before tests
    await prisma.expenseItem.deleteMany();
    await prisma.expenseReport.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it("signs up a regular user", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/auth/signup")
      .send({ email: "testuser@example.com", password: "password123" })
      .expect(201);

    userToken = res.body.accessToken;
    expect(userToken).toBeDefined();
  });

  it("signs up and promotes an admin user", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/signup")
      .send({ email: "admin@example.com", password: "adminpass123" })
      .expect(201);

    await prisma.user.update({
      where: { email: "admin@example.com" },
      data: { role: "admin" },
    });

    const loginRes = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "adminpass123" })
      .expect(200);

    adminToken = loginRes.body.accessToken;
  });

  it("creates a DRAFT report", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/reports")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ title: "Business Trip Q2", description: "NYC expenses" })
      .expect(201);

    reportId = res.body.id;
    expect(res.body.status).toBe("DRAFT");
  });

  it("adds an expense item to the DRAFT report", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/reports/${reportId}/items`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        merchantName: "JFK Airport Taxi",
        amount: "45.00",
        currency: "USD",
        category: "Transport",
        transactionDate: "2026-04-01",
      })
      .expect(201);

    itemId = res.body.id;
    expect(res.body.merchantName).toBe("JFK Airport Taxi");
  });

  it("submits the report (DRAFT → SUBMITTED)", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/reports/${reportId}/submit`)
      .set("Authorization", `Bearer ${userToken}`)
      .expect(200);

    expect(res.body.status).toBe("SUBMITTED");
  });

  it("blocks item additions on a SUBMITTED report", async () => {
    await request(app.getHttpServer())
      .post(`/api/reports/${reportId}/items`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        merchantName: "Hotel",
        amount: "200.00",
        currency: "USD",
        category: "Accommodation",
        transactionDate: "2026-04-01",
      })
      .expect(400);
  });

  it("non-admin cannot access admin endpoints", async () => {
    await request(app.getHttpServer())
      .get("/api/admin/reports")
      .set("Authorization", `Bearer ${userToken}`)
      .expect(403);
  });

  it("admin can reject with a reason and user can see it", async () => {
    const rejectionReason = "Missing taxi receipt and invalid date format";

    const rejectRes = await request(app.getHttpServer())
      .patch(`/api/admin/reports/${reportId}/action`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ action: "reject", reason: rejectionReason })
      .expect(200);

    expect(rejectRes.body.status).toBe("REJECTED");
    expect(rejectRes.body.rejectionReason).toBe(rejectionReason);

    const userViewRes = await request(app.getHttpServer())
      .get(`/api/reports/${reportId}`)
      .set("Authorization", `Bearer ${userToken}`)
      .expect(200);

    expect(userViewRes.body.status).toBe("REJECTED");
    expect(userViewRes.body.rejectionReason).toBe(rejectionReason);
  });

  it("clears rejection reason when user re-submits (REJECTED → SUBMITTED)", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/reports/${reportId}/submit`)
      .set("Authorization", `Bearer ${userToken}`)
      .expect(200);

    expect(res.body.status).toBe("SUBMITTED");
    expect(res.body.rejectionReason).toBeNull();
  });

  it("admin approves the report (SUBMITTED → APPROVED)", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/admin/reports/${reportId}/action`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ action: "approve" })
      .expect(200);

    expect(res.body.status).toBe("APPROVED");
  });

  it("blocks further transitions from APPROVED (terminal state)", async () => {
    await request(app.getHttpServer())
      .patch(`/api/admin/reports/${reportId}/action`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ action: "reject" })
      .expect(400);
  });
});
