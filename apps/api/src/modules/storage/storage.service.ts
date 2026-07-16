import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private uploadDir = path.join(__dirname, '..', '..', '..', 'uploads');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File): Promise<string> {
    try {
      const fileExt = path.extname(file.originalname);
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const fileName = `${uniqueSuffix}${fileExt}`;
      const filePath = path.join(this.uploadDir, fileName);

      await fs.promises.writeFile(filePath, file.buffer);
      return `/uploads/${fileName}`;
    } catch (error) {
      console.error('Failed to save file:', error);
      throw new InternalServerErrorException('An error occurred while saving the uploaded file.');
    }
  }
}
