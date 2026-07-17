import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';

@Injectable()
export class QuestionService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // QUESTION BANK CRUD
  // ==========================================
  async createBank(name: string, description?: string) {
    const existing = await this.prisma.questionBank.findUnique({ where: { name } });
    if (existing) {
      throw new BadRequestException('A question bank with this name already exists.');
    }
    return this.prisma.questionBank.create({
      data: { name, description },
    });
  }

  async findAllBanks() {
    return this.prisma.questionBank.findMany({
      include: {
        _count: { select: { questions: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async deleteBank(id: string) {
    const bank = await this.prisma.questionBank.findUnique({ where: { id } });
    if (!bank) {
      throw new NotFoundException('Question bank not found.');
    }
    return this.prisma.questionBank.delete({ where: { id } });
  }

  // ==========================================
  // QUESTION CATEGORY CRUD
  // ==========================================
  async createCategory(name: string, description?: string) {
    const existing = await this.prisma.questionCategory.findUnique({ where: { name } });
    if (existing) {
      throw new BadRequestException('A category with this name already exists.');
    }
    return this.prisma.questionCategory.create({
      data: { name, description },
    });
  }

  async findAllCategories() {
    return this.prisma.questionCategory.findMany({
      include: {
        _count: { select: { questions: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async deleteCategory(id: string) {
    const cat = await this.prisma.questionCategory.findUnique({ where: { id } });
    if (!cat) {
      throw new NotFoundException('Question category not found.');
    }
    return this.prisma.questionCategory.delete({ where: { id } });
  }

  // ==========================================
  // QUESTION CRUD & BUSINESS VALIDATIONS
  // ==========================================
  validateQuestionOptions(type: string, options: { text: string; isCorrect: boolean }[]) {
    const correctCount = options.filter(opt => opt.isCorrect).length;

    if (type === 'SINGLE_CHOICE' && correctCount !== 1) {
      throw new BadRequestException('Single choice questions must have exactly one correct option.');
    }

    if (type === 'MULTIPLE_CHOICE' && correctCount < 1) {
      throw new BadRequestException('Multiple choice questions must have at least one correct option.');
    }
  }

  async createQuestion(dto: CreateQuestionDto) {
    // 1. Verify existence of target bank and category
    const bank = await this.prisma.questionBank.findUnique({ where: { id: dto.bankId } });
    if (!bank) throw new NotFoundException('Target Question Bank not found.');

    const cat = await this.prisma.questionCategory.findUnique({ where: { id: dto.categoryId } });
    if (!cat) throw new NotFoundException('Target Question Category not found.');

    // 2. Validate options matches type requirements
    this.validateQuestionOptions(dto.type, dto.options);

    // 3. Create question along with options inside a transaction
    return this.prisma.question.create({
      data: {
        bankId: dto.bankId,
        categoryId: dto.categoryId,
        text: dto.text,
        explanation: dto.explanation,
        difficulty: dto.difficulty,
        type: dto.type,
        options: {
          create: dto.options.map(opt => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
          })),
        },
      },
      include: {
        options: true,
      },
    });
  }

  async findAllQuestions(filters: { bankId?: string; categoryId?: string; difficulty?: string; skip?: number; take?: number }) {
    const where: any = {};
    if (filters.bankId) where.bankId = filters.bankId;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.difficulty) where.difficulty = filters.difficulty;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        where,
        skip: filters.skip ?? 0,
        take: filters.take ?? 50,
        include: {
          bank: { select: { name: true } },
          category: { select: { name: true } },
          options: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, items };
  }

  async findOneQuestion(id: string) {
    const q = await this.prisma.question.findUnique({
      where: { id },
      include: { options: true },
    });
    if (!q) throw new NotFoundException('Question not found.');
    return q;
  }

  async updateQuestion(id: string, dto: Partial<CreateQuestionDto>) {
    const existing = await this.findOneQuestion(id);

    const type = dto.type || existing.type;
    const options = dto.options || existing.options;

    // Validate options if type or options lists are being modified
    if (dto.type || dto.options) {
      this.validateQuestionOptions(type, options as any);
    }

    // Perform update inside database transaction
    return this.prisma.$transaction(async (tx) => {
      // If new options are supplied, purge previous options first
      if (dto.options) {
        await tx.questionOption.deleteMany({ where: { questionId: id } });
      }

      return tx.question.update({
        where: { id },
        data: {
          bankId: dto.bankId,
          categoryId: dto.categoryId,
          text: dto.text,
          explanation: dto.explanation,
          difficulty: dto.difficulty,
          type: dto.type,
          options: dto.options ? {
            create: dto.options.map(opt => ({
              text: opt.text,
              isCorrect: opt.isCorrect,
            })),
          } : undefined,
        },
        include: { options: true },
      });
    });
  }

  async deleteQuestion(id: string) {
    await this.findOneQuestion(id);
    return this.prisma.question.delete({ where: { id } });
  }

  // ==========================================
  // ASYNCHRONOUS BULK CSV PARSING
  // ==========================================
  async bulkImportCSV(bankId: string, categoryId: string, csvContent: string) {
    const rows = csvContent.split(/\r?\n/).filter(r => r.trim());
    if (rows.length <= 1) {
      throw new BadRequestException('CSV file must contain a header and at least one question row.');
    }

    const importedQuestions: any[] = [];
    const errors: string[] = [];

    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      try {
        const row = rows[i];
        
        // Match CSV elements (simple split by commas outside double quotes)
        const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
        if (cols.length < 7) {
          throw new Error(`Invalid row column size. Expected at least 7 fields, got ${cols.length}`);
        }

        const text = cols[0];
        const explanation = cols[1];
        const difficulty = cols[2].toUpperCase();
        const type = cols[3].toUpperCase();
        
        // Correct options parse indices (e.g. "0" or "0;2")
        const correctIndices = cols[4].split(';').map(v => parseInt(v.trim(), 10));
        
        // Gather subsequent options columns
        const optionsList = cols.slice(5).filter(opt => opt !== '');
        if (optionsList.length < 2) {
          throw new Error('Questions must contain at least 2 choice options.');
        }

        const options = optionsList.map((optText, index) => ({
          text: optText,
          isCorrect: correctIndices.includes(index),
        }));

        this.validateQuestionOptions(type, options);

        importedQuestions.push({
          bankId,
          categoryId,
          text,
          explanation,
          difficulty,
          type,
          options,
        });
      } catch (err: any) {
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Bulk Import failed. Errors: ${errors.join(', ')}`);
    }

    // Batch inserts inside a transaction
    await this.prisma.$transaction(
      importedQuestions.map(q => 
        this.prisma.question.create({
          data: {
            bankId: q.bankId,
            categoryId: q.categoryId,
            text: q.text,
            explanation: q.explanation,
            difficulty: q.difficulty,
            type: q.type,
            options: {
              create: q.options.map((opt: any) => ({
                text: opt.text,
                isCorrect: opt.isCorrect,
              })),
            },
          },
        })
      )
    );

    return { count: importedQuestions.length };
  }
}
