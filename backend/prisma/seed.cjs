/* eslint-disable no-console */
require("dotenv/config");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("../src/generated/prisma");

const DB_HOST = process.env.DB_HOST || "127.0.0.1";
const DB_PORT = process.env.DB_PORT || "5432";
const DB_USER = process.env.DB_USER || "";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "";

const connectionString = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
const pool = new Pool({ connectionString, max: 5 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@expense.local";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin123!";

    if (adminPassword.length < 8) {
        throw new Error("ADMIN_PASSWORD must be at least 8 characters");
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const user = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            role: "admin",
            passwordHash,
        },
        create: {
            email: adminEmail,
            passwordHash,
            role: "admin",
        },
    });

    console.log("Seeded admin user:", user.email);
}

main()
    .catch((error) => {
        console.error("Seed failed:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
