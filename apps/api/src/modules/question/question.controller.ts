import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, ParseUUIDPipe, ParseIntPipe, DefaultValuePipe, BadRequestException } from '@nestjs/common';
import { QuestionService } from './question.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('questions')
export class QuestionController {
  constructor(private qService: QuestionService) {}

  // ==========================================
  // QUESTION BANKS
  // ==========================================
  @Post('banks')
  @Permissions('create:questions')
  async createBank(@Body() dto: CreateBankDto) {
    return this.qService.createBank(dto.name, dto.description);
  }

  @Get('banks')
  @Permissions('read:questions')
  async findAllBanks() {
    return this.qService.findAllBanks();
  }

  @Delete('banks/:id')
  @Permissions('delete:questions')
  async deleteBank(@Param('id', ParseUUIDPipe) id: string) {
    return this.qService.deleteBank(id);
  }

  // ==========================================
  // QUESTION CATEGORIES
  // ==========================================
  @Post('categories')
  @Permissions('create:questions')
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.qService.createCategory(dto.name, dto.description);
  }

  @Get('categories')
  @Permissions('read:questions')
  async findAllCategories() {
    return this.qService.findAllCategories();
  }

  @Delete('categories/:id')
  @Permissions('delete:questions')
  async deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.qService.deleteCategory(id);
  }

  // ==========================================
  // QUESTIONS CRUD
  // ==========================================
  @Post()
  @Permissions('create:questions')
  async createQuestion(@Body() dto: CreateQuestionDto) {
    return this.qService.createQuestion(dto);
  }

  @Get()
  @Permissions('read:questions')
  async findAllQuestions(
    @Query('bankId') bankId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('difficulty') difficulty?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    const skip = (page - 1) * limit;
    return this.qService.findAllQuestions({
      bankId,
      categoryId,
      difficulty,
      skip,
      take: limit,
    });
  }

  @Get(':id')
  @Permissions('read:questions')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.qService.findOneQuestion(id);
  }

  @Put(':id')
  @Permissions('update:questions')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateQuestionDto>) {
    return this.qService.updateQuestion(id, dto);
  }

  @Delete(':id')
  @Permissions('delete:questions')
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.qService.deleteQuestion(id);
  }

  // ==========================================
  // BULK IMPORT ROUTE
  // ==========================================
  @Post('bulk-import')
  @Permissions('create:questions')
  @UseInterceptors(FileInterceptor('file'))
  async bulkImport(
    @Query('bankId', ParseUUIDPipe) bankId: string,
    @Query('categoryId', ParseUUIDPipe) categoryId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('CSV file upload payload is missing.');
    }
    const csvContent = file.buffer.toString('utf-8');
    return this.qService.bulkImportCSV(bankId, categoryId, csvContent);
  }
}
