import { Module } from '@nestjs/common';
import { ExamTemplateService } from './exam-template.service';
import { ExamTemplateController } from './exam-template.controller';

@Module({
  providers: [ExamTemplateService],
  controllers: [ExamTemplateController],
  exports: [ExamTemplateService],
})
export class ExamTemplateModule {}
