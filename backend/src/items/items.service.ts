import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ReportsService } from "../reports/reports.service";
import { StorageService } from "../storage/storage.service";
import { assertItemsEditable } from "../reports/state-machine";
import { ExtractionService } from "../extraction/extraction.service";
import { CreateItemDto } from "./dto/create-item.dto";
import { UpdateItemDto } from "./dto/update-item.dto";

@Injectable()
export class ItemsService {
  constructor(
    private prisma: PrismaService,
    private reportsService: ReportsService,
    private storageService: StorageService,
    private extractionService: ExtractionService,
  ) {}

  private validateReceiptFile(file: { mimetype?: string }) {
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

  private async assertOwnerAndEditable(reportId: string, userId: string) {
    const report = await this.reportsService.findOne(reportId, userId);
    assertItemsEditable(report.status);
    return report;
  }

  async create(reportId: string, userId: string, dto: CreateItemDto) {
    await this.assertOwnerAndEditable(reportId, userId);
    return this.prisma.expenseItem.create({
      data: {
        reportId,
        amount: dto.amount,
        currency: dto.currency ?? "USD",
        category: dto.category,
        merchantName: dto.merchantName,
        transactionDate: new Date(dto.transactionDate),
      },
    });
  }

  async update(itemId: string, userId: string, dto: UpdateItemDto) {
    const item = await this.prisma.expenseItem.findUnique({
      where: { id: itemId },
      include: { report: true },
    });
    if (!item) throw new NotFoundException("Item not found");
    if (item.report.userId !== userId) throw new ForbiddenException();
    assertItemsEditable(item.report.status);

    return this.prisma.expenseItem.update({
      where: { id: itemId },
      data: {
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.merchantName !== undefined && {
          merchantName: dto.merchantName,
        }),
        ...(dto.transactionDate !== undefined && {
          transactionDate: new Date(dto.transactionDate),
        }),
      },
    });
  }

  async delete(itemId: string, userId: string) {
    const item = await this.prisma.expenseItem.findUnique({
      where: { id: itemId },
      include: { report: true },
    });
    if (!item) throw new NotFoundException("Item not found");
    if (item.report.userId !== userId) throw new ForbiddenException();
    assertItemsEditable(item.report.status);
    return this.prisma.expenseItem.delete({ where: { id: itemId } });
  }

  async uploadReceipt(itemId: string, userId: string, file: any) {
    const item = await this.prisma.expenseItem.findUnique({
      where: { id: itemId },
      include: { report: true },
    });
    if (!item) throw new NotFoundException("Item not found");
    if (item.report.userId !== userId) throw new ForbiddenException();
    assertItemsEditable(item.report.status);

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
}
