import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { ReportStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReportDto } from "./dto/create-report.dto";
import { UpdateReportDto } from "./dto/update-report.dto";
import { applyTransition } from "./state-machine";

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateReportDto) {
    return this.prisma.expenseReport.create({
      data: { userId, ...dto },
    });
  }

  async findAllForUser(userId: string, status?: ReportStatus) {
    return this.prisma.expenseReport.findMany({
      where: { userId, ...(status && { status }) },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, userId: string) {
    const report = await this.prisma.expenseReport.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!report) throw new NotFoundException("Report not found");
    if (report.userId !== userId) throw new ForbiddenException();
    return report;
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
      data: { status: nextStatus },
    });
  }
}
