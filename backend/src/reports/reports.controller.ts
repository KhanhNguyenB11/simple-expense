import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ReportStatus } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ReportsService } from "./reports.service";
import { CreateReportDto } from "./dto/create-report.dto";
import { UpdateReportDto } from "./dto/update-report.dto";

@ApiTags("reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("reports")
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @ApiOperation({ summary: "Create a new expense report" })
  @ApiResponse({ status: 201, description: "Report created" })
  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateReportDto) {
    return this.reportsService.create(user.id, dto);
  }

  @ApiOperation({ summary: "List all reports for the current user" })
  @ApiQuery({ name: "status", enum: ReportStatus, required: false })
  @Get()
  findAll(@CurrentUser() user: any, @Query("status") status?: ReportStatus) {
    return this.reportsService.findAllForUser(user.id, status);
  }

  @ApiOperation({ summary: "Get a single report by ID" })
  @ApiResponse({ status: 404, description: "Report not found" })
  @Get(":id")
  findOne(@CurrentUser() user: any, @Param("id") id: string) {
    return this.reportsService.findOne(id, user.id);
  }

  @ApiOperation({
    summary: "Update title/description of a DRAFT or REJECTED report",
  })
  @Patch(":id")
  update(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body() dto: UpdateReportDto,
  ) {
    return this.reportsService.update(id, user.id, dto);
  }

  @ApiOperation({ summary: "Delete a DRAFT report" })
  @Delete(":id")
  delete(@CurrentUser() user: any, @Param("id") id: string) {
    return this.reportsService.delete(id, user.id);
  }

  @ApiOperation({ summary: "Submit a report for approval" })
  @Post(":id/submit")
  submit(@CurrentUser() user: any, @Param("id") id: string) {
    return this.reportsService.submit(id, user.id);
  }
}
