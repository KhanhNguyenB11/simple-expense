import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IsIn, IsOptional, IsString } from "class-validator";
import { ReportStatus } from "@prisma/client";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { ApiProperty } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { applyTransition } from "../reports/state-machine";
import { PrismaService } from "../prisma/prisma.service";

class AdminActionDto {
  @ApiProperty({ enum: ["approve", "reject"] })
  @IsString()
  @IsIn(["approve", "reject"])
  action: "approve" | "reject";

  @ApiProperty({ example: "Missing receipts", required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
@Controller("admin/reports")
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @ApiOperation({ summary: "List all reports (admin)" })
  @ApiQuery({ name: "status", enum: ReportStatus, required: false })
  @Get()
  findAll(@Query("status") status?: ReportStatus) {
    return this.prisma.expenseReport.findMany({
      where: status ? { status } : undefined,
      include: {
        items: true,
        user: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  @ApiOperation({ summary: "Approve or reject a submitted report" })
  @ApiQuery({ name: "status", enum: ReportStatus, required: false })
  @Patch(":id/action")
  async act(@Param("id") id: string, @Body() dto: AdminActionDto) {
    const report = await this.prisma.expenseReport.findUniqueOrThrow({
      where: { id },
    });
    const nextStatus = applyTransition(report.status, dto.action, "admin");
    return this.prisma.expenseReport.update({
      where: { id },
      data: { status: nextStatus },
    });
  }
}
