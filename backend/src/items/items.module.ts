import { Module } from "@nestjs/common";
import { ItemsService } from "./items.service";
import { ItemsController } from "./items.controller";
import { ReportsModule } from "../reports/reports.module";

@Module({
  imports: [ReportsModule],
  providers: [ItemsService],
  controllers: [ItemsController],
})
export class ItemsModule {}
