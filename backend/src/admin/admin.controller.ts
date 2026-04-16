import {
  Body,
  Controller,
  Get,
  BadRequestException,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IsIn, IsOptional, IsString } from "class-validator";
import { ReportStatus } from "../generated/prisma";
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

  private computeTotalAmount(items: Array<{ amount: unknown }>): string {
    const total = items.reduce((sum, item) => sum + Number(item.amount), 0);
    return total.toFixed(2);
  }

  @ApiOperation({ summary: "List all reports (admin)" })
  @ApiQuery({ name: "status", enum: ReportStatus, required: false })
  @Get()
  async findAll(@Query("status") status?: ReportStatus) {
    const reports = await this.prisma.expenseReport.findMany({
      where: status ? { status } : undefined,
      include: {
        items: true,
        user: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return reports.map((report) => ({
      ...report,
      total_amount: this.computeTotalAmount(report.items),
    }));
  }

  @ApiOperation({ summary: "Get report details (admin)" })
  @Get(":id")
  async findOne(@Param("id") id: string) {
    const report = await this.prisma.expenseReport.findUniqueOrThrow({
      where: { id },
      include: {
        items: true,
        user: { select: { id: true, email: true } },
      },
    });

    return {
      ...report,
      total_amount: this.computeTotalAmount(report.items),
    };
  }

  @ApiOperation({ summary: "Approve or reject a submitted report" })
  @ApiQuery({ name: "status", enum: ReportStatus, required: false })
  @Patch(":id/action")
  async act(@Param("id") id: string, @Body() dto: AdminActionDto) {
    const report = await this.prisma.expenseReport.findUniqueOrThrow({
      where: { id },
    });
    const nextStatus = applyTransition(report.status, dto.action, "admin");
    const reason = dto.reason?.trim();
    if (dto.action === "reject" && !reason) {
      throw new BadRequestException("Rejection reason is required");
    }

    return this.prisma.expenseReport.update({
      where: { id },
      data: {
        status: nextStatus,
        rejectionReason: dto.action === "reject" ? reason : null,
      },
    });
  }
}
