import { IsDateString, IsDecimal, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateItemDto {
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
}
