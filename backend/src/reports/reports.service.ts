import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { ReportStatus } from "../generated/prisma";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { ExtractionService } from "../extraction/extraction.service";
import { CreateReportDto } from "./dto/create-report.dto";
import { UpdateReportDto } from "./dto/update-report.dto";
import { SaveReportDraftDto } from "./dto/save-report-draft.dto";
import { applyTransition } from "./state-machine";
import { assertItemsEditable } from "./state-machine";

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private extractionService: ExtractionService,
  ) {}

  private computeTotalAmount(items: Array<{ amount: unknown }>): string {
    const total = items.reduce((sum, item) => {
      return sum + Number(item.amount);
    }, 0);

    return total.toFixed(2);
  }

  private withComputedTotal<T extends { items: Array<{ amount: unknown }> }>(
    report: T,
  ): T & { total_amount: string } {
    return {
      ...report,
      total_amount: this.computeTotalAmount(report.items),
    };
  }

  private validateReceiptFile(file: {
    mimetype?: string;
    originalname?: string;
  }) {
    const isPdf = file.mimetype === "application/pdf";
    const isImage =
      typeof file.mimetype === "string" && file.mimetype.startsWith("image/");

    if (!isPdf && !isImage) {
      throw new BadRequestException("Only PDF and image files are allowed");
    }
  }

  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  }

  async create(userId: string, dto: CreateReportDto) {
    const report = await this.prisma.expenseReport.create({
      data: { userId, ...dto },
      include: { items: true },
    });

    return this.withComputedTotal(report);
  }

  async findAllForUser(userId: string, status?: ReportStatus) {
    const reports = await this.prisma.expenseReport.findMany({
      where: { userId, ...(status && { status }) },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    return reports.map((report) => this.withComputedTotal(report));
  }

  async findOne(id: string, userId: string) {
    const report = await this.prisma.expenseReport.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!report) throw new NotFoundException("Report not found");
    if (report.userId !== userId) throw new ForbiddenException();
    return this.withComputedTotal(report);
  }

  async update(id: string, userId: string, dto: UpdateReportDto) {
    const report = await this.findOne(id, userId);
    if (
      report.status !== ReportStatus.DRAFT &&
      report.status !== ReportStatus.REJECTED
    ) {
      throw new ForbiddenException(
        "Only DRAFT or REJECTED reports can be edited",
      );
    }
    return this.prisma.expenseReport.update({ where: { id }, data: dto });
  }

  async delete(id: string, userId: string) {
    const report = await this.findOne(id, userId);
    if (report.status !== ReportStatus.DRAFT) {
      throw new ForbiddenException("Only DRAFT reports can be deleted");
    }
    return this.prisma.expenseReport.delete({ where: { id } });
  }

  async submit(id: string, userId: string) {
    const report = await this.findOne(id, userId);
    const nextStatus = applyTransition(report.status, "submit", "user");

    return this.prisma.expenseReport.update({
      where: { id },
      data: {
        status: nextStatus,
        rejectionReason: null,
      },
    });
  }

  async saveDraft(id: string, userId: string, dto: SaveReportDraftDto) {
    const report = await this.findOne(id, userId);
    assertItemsEditable(report.status);

    return this.prisma
      .$transaction(async (tx) => {
        const existingItems = await tx.expenseItem.findMany({
          where: { reportId: id },
          select: { id: true },
        });

        const existingIds = new Set(existingItems.map((item) => item.id));
        const incomingPersistedIds = dto.items
          .map((item) => item.id)
          .filter((itemId): itemId is string => Boolean(itemId));

        for (const itemId of incomingPersistedIds) {
          if (!existingIds.has(itemId)) {
            throw new BadRequestException(
              `Item '${itemId}' does not belong to report '${id}'`,
            );
          }
        }

        await tx.expenseReport.update({
          where: { id },
          data: {
            title: dto.title.trim(),
            description: dto.description?.trim() || "",
          },
        });

        if (incomingPersistedIds.length > 0) {
          await tx.expenseItem.deleteMany({
            where: {
              reportId: id,
              id: { notIn: incomingPersistedIds },
            },
          });
        } else {
          await tx.expenseItem.deleteMany({ where: { reportId: id } });
        }

        for (const item of dto.items) {
          const itemData = {
            amount: item.amount,
            currency: item.currency ?? "USD",
            category: item.category,
            merchantName: item.merchantName,
            transactionDate: new Date(item.transactionDate),
            ...(item.receiptUrl !== undefined && {
              receiptUrl: item.receiptUrl,
            }),
          };

          if (item.id) {
            await tx.expenseItem.update({
              where: { id: item.id },
              data: itemData,
            });
          } else {
            await tx.expenseItem.create({
              data: {
                reportId: id,
                ...itemData,
              },
            });
          }
        }

        return tx.expenseReport.findUniqueOrThrow({
          where: { id },
          include: { items: true },
        });
      })
      .then((report) => this.withComputedTotal(report));
  }

  async uploadDraftReceipt(id: string, userId: string, file: any) {
    const report = await this.findOne(id, userId);
    assertItemsEditable(report.status);

    this.validateReceiptFile(file);

    const safeFilename = this.sanitizeFilename(file.originalname ?? "receipt");
    const key = `receipts/${userId}/${id}/draft/${Date.now()}-${safeFilename}`;
    await this.storageService.upload(key, file.buffer, file.mimetype);
    const receiptPreviewUrl = await this.storageService.getPresignedUrl(key);

    const extracted = await this.extractionService.extractFromReceipt(
      file.buffer,
      file.mimetype,
    );
    return { receiptUrl: key, receiptPreviewUrl, extracted };
  }

  async uploadItemReceipt(
    reportId: string,
    itemId: string,
    userId: string,
    file: any,
  ) {
    const report = await this.findOne(reportId, userId);
    assertItemsEditable(report.status);

    const item = await this.prisma.expenseItem.findUnique({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException("Item not found");
    if (item.reportId !== reportId) {
      throw new BadRequestException("Item does not belong to this report");
    }

    this.validateReceiptFile(file);

    const safeFilename = this.sanitizeFilename(file.originalname ?? "receipt");
    const key = `receipts/${userId}/${itemId}/${Date.now()}-${safeFilename}`;
    await this.storageService.upload(key, file.buffer, file.mimetype);
    await this.prisma.expenseItem.update({
      where: { id: itemId },
      data: { receiptUrl: key },
    });

    const receiptPreviewUrl = await this.storageService.getPresignedUrl(key);
    const extracted = await this.extractionService.extractFromReceipt(
      file.buffer,
      file.mimetype,
    );
    return { receiptUrl: key, receiptPreviewUrl, extracted };
  }

  async getReportFiles(id: string, userId: string) {
    const report = await this.findOne(id, userId);

    const files = await this.storageService.listFiles(
      `receipts/${userId}/${id}/draft/`,
    );

    return {
      files: files.map((file) => ({
        key: file.key,
        name: file.key.split("/").pop() || file.key,
        size: file.size,
        uploadedAt: file.lastModified,
      })),
    };
  }

  async getItemFiles(reportId: string, itemId: string, userId: string) {
    const report = await this.findOne(reportId, userId);
    const item = await this.prisma.expenseItem.findUnique({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException("Item not found");
    if (item.reportId !== reportId) {
      throw new BadRequestException("Item does not belong to this report");
    }

    const files = await this.storageService.listFiles(
      `receipts/${userId}/${itemId}/`,
    );

    return {
      files: files.map((file) => ({
        key: file.key,
        name: file.key.split("/").pop() || file.key,
        size: file.size,
        uploadedAt: file.lastModified,
      })),
    };
  }

  async deleteReportFile(id: string, userId: string, key: string) {
    const report = await this.findOne(id, userId);
    // Allow deleting only files under this report's draft prefix for this user.
    const expectedPrefix = `receipts/${userId}/${id}/draft/`;
    if (!key.startsWith(expectedPrefix)) {
      throw new ForbiddenException("File does not belong to this report");
    }
    await this.storageService.delete(key);
  }

  async deleteItemFile(reportId: string, itemId: string, userId: string, key: string) {
    const report = await this.findOne(reportId, userId);
    const item = await this.prisma.expenseItem.findUnique({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException("Item not found");
    if (item.reportId !== reportId) {
      throw new BadRequestException("Item does not belong to this report");
    }

    const expectedPrefix = `receipts/${userId}/${itemId}/`;
    if (!key.startsWith(expectedPrefix)) {
      throw new ForbiddenException("File does not belong to this item");
    }

    await this.storageService.delete(key);
  }
}
