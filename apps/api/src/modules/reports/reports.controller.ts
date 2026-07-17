import { Controller, Get, UseGuards, Request, Param, Res, ParseUUIDPipe } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('candidate/attempts')
  @Permissions('take:exams')
  async getCandidateAttempts(@Request() req: any) {
    return this.reportsService.getCandidateAttempts(req.user.id);
  }

  @Get('attempts/:id/certificate')
  @Permissions('take:exams', 'read:questions')
  async getCertificate(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reportsService.generateCertificatePdf(id, req.user.id, req.user.role);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=certificate_${id}.pdf`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Get('admin/attempts/export')
  @Permissions('read:questions')
  async exportAttempts(@Res() res: Response) {
    const csvContent = await this.reportsService.exportAttemptsCsv();
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename=exam_attempts.csv',
      'Content-Length': Buffer.byteLength(csvContent),
    });
    res.end(csvContent);
  }
}
