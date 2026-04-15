import { IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateReportDto {
  @ApiProperty({ example: "Q1 Travel Expenses", required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: "Business trip to NYC", required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
