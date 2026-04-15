import { IsOptional, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateReportDto {
  @ApiProperty({ example: "Q1 Travel Expenses", minLength: 2 })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiProperty({ example: "Business trip to NYC", required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
