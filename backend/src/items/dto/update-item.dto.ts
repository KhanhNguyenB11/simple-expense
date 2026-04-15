import { IsDateString, IsDecimal, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateItemDto {
  @ApiProperty({ example: "49.99", required: false })
  @IsOptional()
  @IsDecimal()
  amount?: string;

  @ApiProperty({ example: "USD", required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: "Meals", required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: "Acme Corp Diner", required: false })
  @IsOptional()
  @IsString()
  merchantName?: string;

  @ApiProperty({ example: "2026-04-01", required: false })
  @IsOptional()
  @IsDateString()
  transactionDate?: string;
}
