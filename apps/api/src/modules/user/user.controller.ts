import { Controller, Patch, Post, Body, UseGuards, UseInterceptors, UploadedFile, Request, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../storage/storage.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(
    private userService: UserService,
    private storageService: StorageService,
  ) {}

  @Patch('me')
  async updateProfile(@Request() req: any, @Body() body: any) {
    // Simple verification filtering allowable fields
    const { firstName, lastName, password } = body;
    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (password !== undefined) updateData.password = password;

    return this.userService.updateProfile(req.user.id, updateData);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed.');
    }

    // Save uploaded file and update user's avatar path
    const fileUrl = await this.storageService.saveFile(file);
    return this.userService.updateProfile(req.user.id, { avatarUrl: fileUrl });
  }
}
