import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { StorageService } from "../storage/storage.service";

@ApiTags("files")
@Controller("files")
export class FilesController {
  constructor(private storageService: StorageService) {}

  @ApiOperation({ summary: "Get presigned URL for file download" })
  @ApiQuery({ name: "key", type: "string", description: "File key in storage" })
  @ApiResponse({ status: 200, description: "Presigned URL" })
  @Get("presigned-url")
  async getPresignedUrl(@Query("key") key: string) {
    if (!key) {
      throw new BadRequestException("File key is required");
    }

    const presignedUrl = await this.storageService.getPresignedUrl(key);
    return { presignedUrl };
  }
}
