import { Controller, Get, Post, Body, Param, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ExamService } from './exam.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('exams')
export class ExamController {
  constructor(private examService: ExamService) {}

  @Get('templates')
  @Permissions('take:exams')
  async getTemplates() {
    return this.examService.getTemplates();
  }

  @Post('sessions')
  @Permissions('take:exams')
  async createSession(@Request() req: any, @Body() dto: CreateSessionDto) {
    return this.examService.createSession(req.user.id, dto);
  }

  @Get('sessions/:id')
  @Permissions('take:exams')
  async getSession(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.examService.getSession(req.user.id, id);
  }

  @Post('sessions/:id/save-answer')
  @Permissions('take:exams')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async saveAnswer(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveAnswerDto,
  ) {
    return this.examService.saveAnswer(req.user.id, id, dto);
  }

  @Post('sessions/:id/submit')
  @Permissions('take:exams')
  async submitSession(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.examService.submitSession(req.user.id, id);
  }

  @Get('admin/sessions')
  @Permissions('read:questions')
  async getAdminSessions() {
    return this.examService.getAdminSessions();
  }

  @Post('sessions/:id/proctor/log')
  @Permissions('take:exams')
  async logProctorEvent(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { eventType: string; severity: string; details?: any },
  ) {
    return this.examService.logProctorEvent(req.user.id, id, body);
  }

  @Get('sessions/:id/proctor/logs')
  @Permissions('read:questions')
  async getProctorLogs(@Param('id', ParseUUIDPipe) id: string) {
    return this.examService.getProctorLogs(id);
  }
}
