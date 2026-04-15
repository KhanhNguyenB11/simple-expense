import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { StorageModule } from "./storage/storage.module";
import { ExtractionModule } from "./extraction/extraction.module";
import { AuthModule } from "./auth/auth.module";
import { ReportsModule } from "./reports/reports.module";
import { ItemsModule } from "./items/items.module";
import { AdminModule } from "./admin/admin.module";
import configuration from "./config/configuration";

@Module({
  imports: [
    // isGlobal: true makes ConfigService injectable everywhere without re-importing
    ConfigModule.forRoot({ load: [configuration], isGlobal: true }),
    PrismaModule,
    StorageModule,
    ExtractionModule,
    AuthModule,
    ReportsModule,
    ItemsModule,
    AdminModule,
  ],
})
export class AppModule {}
