import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { ReportStatus } from "../generated/prisma";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ReportsService } from "./reports.service";
import { CreateReportDto } from "./dto/create-report.dto";
import { UpdateReportDto } from "./dto/update-report.dto";
import { SaveReportDraftDto } from "./dto/save-report-draft.dto";
import { StorageService } from "../storage/storage.service";

@ApiTags("reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("reports")
export class ReportsController {
  constructor(
    private reportsService: ReportsService,
    private storageService: StorageService,
  ) {}

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

  @ApiOperation({
    summary: "Save report and all items in one draft transaction",
  })
  @Patch(":id/draft")
  saveDraft(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Body() dto: SaveReportDraftDto,
  ) {
    return this.reportsService.saveDraft(id, user.id, dto);
  }

  @ApiOperation({ summary: "Upload receipt for a new draft item" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
      required: ["file"],
    },
  })
  @Post(":id/receipt")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  uploadDraftReceipt(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException("Receipt file is required");
    }
    return this.reportsService.uploadDraftReceipt(id, user.id, file);
  }

  @ApiOperation({ summary: "Upload receipt for an existing item" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  @Post(":id/items/:itemId/receipt")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  uploadItemReceipt(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException("Receipt file is required");
    }
    return this.reportsService.uploadItemReceipt(id, itemId, user.id, file);
  }

  @ApiOperation({ summary: "Get attached files for a report or item" })
  @Get(":id/files")
  getReportFiles(@CurrentUser() user: any, @Param("id") id: string) {
    return this.reportsService.getReportFiles(id, user.id);
  }

  @ApiOperation({ summary: "Get attached files for an item" })
  @Get(":id/items/:itemId/files")
  getItemFiles(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
  ) {
    return this.reportsService.getItemFiles(id, itemId, user.id);
  }

  @ApiOperation({ summary: "Delete a file attached to a report draft" })
  @ApiQuery({
    name: "key",
    type: "string",
    description: "Storage key of the file to delete",
  })
  @Delete(":id/files")
  deleteReportFile(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Query("key") key: string,
  ) {
    if (!key) {
      throw new BadRequestException("File key is required");
    }
    return this.reportsService.deleteReportFile(id, user.id, key);
  }

  @ApiOperation({ summary: "Delete a file attached to an item" })
  @ApiQuery({
    name: "key",
    type: "string",
    description: "Storage key of the file to delete",
  })
  @Delete(":id/items/:itemId/files")
  deleteItemFile(
    @CurrentUser() user: any,
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Query("key") key: string,
  ) {
    if (!key) {
      throw new BadRequestException("File key is required");
    }
    return this.reportsService.deleteItemFile(id, itemId, user.id, key);
  }
}
