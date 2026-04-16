/**
 * Typed application configuration factory.
 * Loaded by ConfigModule so every value is validated and defaulted in one place.
 * Inject ConfigService and use config.get<T>('key') throughout the app.
 */
export default () => ({
  port: parseInt(process.env.PORT ?? "8001", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  // Comma-separated list of allowed origins, e.g.
  // FRONTEND_URL=http://localhost:3000,https://myapp.vercel.app
  allowedOrigins: (process.env.FRONTEND_URL ?? "http://localhost:3000")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean),

  database: {
    host: process.env.DB_HOST ?? "localhost",
    port: parseInt(process.env.DB_PORT ?? "5432", 10),
    user: process.env.DB_USER ?? "",
    password: process.env.DB_PASSWORD ?? "",
    name: process.env.DB_NAME ?? "",
    // Constructed URL consumed by PrismaService and prisma.config.ts
    get url() {
      return `postgresql://${this.user}:${this.password}@${this.host}:${this.port}/${this.name}`;
    },
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? "fallback-secret",
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  },

  minio: {
    endpoint: process.env.MINIO_ENDPOINT ?? "localhost",
    port: parseInt(process.env.MINIO_PORT ?? "9000", 10),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
    bucket: process.env.MINIO_BUCKET ?? "receipts",
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? "",
    // Allow overriding model; default is a good multimodal model for receipts.
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite",
  },
});
