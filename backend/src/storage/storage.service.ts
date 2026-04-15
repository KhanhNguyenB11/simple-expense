import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Minio from "minio";

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: Minio.Client;
  private bucket: string;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    this.bucket = this.config.get<string>("minio.bucket")!;
    this.client = new Minio.Client({
      endPoint: this.config.get<string>("minio.endpoint")!,
      port: this.config.get<number>("minio.port")!,
      useSSL: this.config.get<boolean>("minio.useSSL")!,
      accessKey: this.config.get<string>("minio.accessKey")!,
      secretKey: this.config.get<string>("minio.secretKey")!,
    });

    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Created MinIO bucket: ${this.bucket}`);
      } else {
        this.logger.log(`MinIO bucket already exists: ${this.bucket}`);
      }
    } catch (err: any) {
      // BucketAlreadyOwnedByYou is harmless — bucket exists and we own it
      if (err?.code === "BucketAlreadyOwnedByYou") {
        this.logger.log(`MinIO bucket already owned: ${this.bucket}`);
      } else {
        throw err;
      }
    }
  }

  async upload(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      "Content-Type": contentType,
    });
  }

  async getPresignedUrl(key: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySeconds);
  }
}
