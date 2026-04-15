import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ItemsService } from "./items.service";
import { CreateItemDto } from "./dto/create-item.dto";
import { UpdateItemDto } from "./dto/update-item.dto";

@ApiTags("items")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("reports/:reportId/items")
export class ItemsController {
  constructor(private itemsService: ItemsService) {}

  @ApiOperation({ summary: "Add an expense item to a report" })
  @ApiResponse({ status: 201, description: "Item created" })
  @Post()
  create(
    @CurrentUser() user: any,
    @Param("reportId") reportId: string,
    @Body() dto: CreateItemDto,
  ) {
    return this.itemsService.create(reportId, user.id, dto);
  }

  @ApiOperation({ summary: "Update an expense item" })
  @Patch(":itemId")
  update(
    @CurrentUser() user: any,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.itemsService.update(itemId, user.id, dto);
  }

  @ApiOperation({ summary: "Delete an expense item" })
  @Delete(":itemId")
  delete(@CurrentUser() user: any, @Param("itemId") itemId: string) {
    return this.itemsService.delete(itemId, user.id);
  }

  @ApiOperation({ summary: "Upload a receipt image, extract data via AI" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  @Post(":itemId/receipt")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  uploadReceipt(
    @CurrentUser() user: any,
    @Param("itemId") itemId: string,
    @UploadedFile() file: any,
  ) {
    return this.itemsService.uploadReceipt(itemId, user.id, file);
  }
}
