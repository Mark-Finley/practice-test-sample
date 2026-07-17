import { Controller, Get, Post, Delete, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ExamTemplateService } from './exam-template.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('exam-templates')
export class ExamTemplateController {
  constructor(private templateService: ExamTemplateService) {}

  @Post()
  @Permissions('create:questions')
  async create(@Body() dto: CreateTemplateDto) {
    return this.templateService.create(dto);
  }

  @Get()
  @Permissions('read:questions')
  async findAll() {
    return this.templateService.findAll();
  }

  @Get(':id')
  @Permissions('read:questions')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.templateService.findOne(id);
  }

  @Delete(':id')
  @Permissions('delete:questions')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.templateService.remove(id);
  }
}
