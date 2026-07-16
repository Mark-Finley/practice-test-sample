import { Controller, Get, Post, Delete, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('organizations')
export class OrganizationController {
  constructor(private orgService: OrganizationService) {}

  @Post()
  @Permissions('manage:organizations')
  async create(@Body() createDto: CreateOrganizationDto) {
    return this.orgService.create(createDto.name, createDto.logoUrl);
  }

  @Get()
  @Permissions('manage:organizations')
  async findAll() {
    return this.orgService.findAll();
  }

  @Get(':id')
  @Permissions('manage:organizations')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.orgService.findById(id);
  }

  @Delete(':id')
  @Permissions('manage:organizations')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.orgService.remove(id);
  }
}
