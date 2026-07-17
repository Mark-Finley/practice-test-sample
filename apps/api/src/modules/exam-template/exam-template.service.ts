import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';

@Injectable()
export class ExamTemplateService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTemplateDto) {
    // 1. Verify that the template name is unique
    const existing = await this.prisma.examTemplate.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('An exam template with this name already exists.');
    }

    // 2. Validate that total category weights sum up to totalQuestions exactly
    const sumWeights = dto.categoryWeights.reduce((sum, item) => sum + item.questionCount, 0);
    if (sumWeights !== dto.totalQuestions) {
      throw new BadRequestException(
        `The sum of category weights (${sumWeights}) does not match the total declared questions (${dto.totalQuestions}).`
      );
    }

    // 3. Create the template and associated weights inside a transaction
    return this.prisma.examTemplate.create({
      data: {
        name: dto.name,
        bankId: dto.bankId,
        totalQuestions: dto.totalQuestions,
        duration: dto.duration,
        passingScore: dto.passingScore,
        categoryWeights: {
          create: dto.categoryWeights.map(item => ({
            categoryId: item.categoryId,
            questionCount: item.questionCount,
          })),
        },
      },
      include: {
        categoryWeights: {
          include: {
            category: { select: { name: true } },
          },
        },
        bank: { select: { name: true } },
      },
    });
  }

  async findAll() {
    return this.prisma.examTemplate.findMany({
      include: {
        bank: { select: { name: true } },
        categoryWeights: {
          include: {
            category: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.examTemplate.findUnique({
      where: { id },
      include: {
        bank: { select: { name: true } },
        categoryWeights: {
          include: {
            category: { select: { name: true } },
          },
        },
      },
    });
    if (!template) {
      throw new NotFoundException('Exam template not found.');
    }
    return template;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.examTemplate.delete({
      where: { id },
    });
  }
}
