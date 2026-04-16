import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsDateString,
  IsDecimal,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class SaveReportItemDto {
  @ApiProperty({
    required: false,
    example: "1a2b3c4d-1111-2222-3333-444455556666",
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ example: "49.99", description: "Amount as decimal string" })
  @IsDecimal()
  amount: string;

  @ApiProperty({ example: "USD", required: false, default: "USD" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: "Meals" })
  @IsString()
  category: string;

  @ApiProperty({ example: "Acme Corp Diner" })
  @IsString()
  merchantName: string;

  @ApiProperty({ example: "2026-04-01" })
  @IsDateString()
  transactionDate: string;

  @ApiProperty({ required: false, example: "receipts/user/item/file.png" })
  @IsOptional()
  @IsString()
  receiptUrl?: string | null;
}

export class SaveReportDraftDto {
  @ApiProperty({ example: "Q1 Travel Expenses" })
  @IsString()
  title: string;

  @ApiProperty({ example: "Business trip to NYC", required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [SaveReportItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveReportItemDto)
  items: SaveReportItemDto[];
}
