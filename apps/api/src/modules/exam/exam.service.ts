import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

@Injectable()
export class ExamService {
  constructor(private prisma: PrismaService) {}

  async getTemplates() {
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

  async createSession(userId: string, dto: CreateSessionDto) {
    // 1. Fetch template with its weights
    const template = await this.prisma.examTemplate.findUnique({
      where: { id: dto.templateId },
      include: {
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

    // 2. Select questions matching weight allocations
    const questionsToCreate: { questionId: string }[] = [];
    for (const weight of template.categoryWeights) {
      const questionsInCat = await this.prisma.question.findMany({
        where: { categoryId: weight.categoryId },
        select: { id: true },
      });

      if (questionsInCat.length < weight.questionCount) {
        throw new BadRequestException(
          `Not enough questions in category "${weight.category.name}" (requested ${weight.questionCount}, has ${questionsInCat.length}).`
        );
      }

      const selected = shuffleArray(questionsInCat).slice(0, weight.questionCount);
      for (const q of selected) {
        questionsToCreate.push({ questionId: q.id });
      }
    }

    // 3. Shuffle final question list to randomize presentation order
    const shuffledQuestions = shuffleArray(questionsToCreate);

    // 4. Create session and Answer placeholders in a transaction
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.examSession.create({
        data: {
          candidateId: userId,
          templateId: template.id,
          status: 'ACTIVE',
          timeRemainingSeconds: template.duration * 60,
        },
      });

      await tx.answer.createMany({
        data: shuffledQuestions.map((q, idx) => ({
          sessionId: session.id,
          questionId: q.questionId,
          optionIds: [],
          sortOrder: idx + 1,
        })),
      });

      // Retrieve full session with questions to return
      const fullSession = await tx.examSession.findUnique({
        where: { id: session.id },
        include: {
          template: { select: { name: true, duration: true } },
          answers: {
            orderBy: { sortOrder: 'asc' },
            include: {
              question: {
                include: {
                  options: {
                    select: {
                      id: true,
                      text: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return fullSession;
    });
  }

  async getSession(userId: string, sessionId: string) {
    const basicSession = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      select: { status: true, candidateId: true, startedAt: true }
    });

    if (!basicSession) {
      throw new NotFoundException('Exam session not found.');
    }

    if (basicSession.candidateId !== userId) {
      throw new ForbiddenException('You do not have access to this exam session.');
    }

    // Check timer expiration and auto-submit if time has run out
    if (basicSession.status === 'ACTIVE') {
      const sessionForTime = await this.prisma.examSession.findUnique({
        where: { id: sessionId },
        include: { template: { select: { duration: true } } }
      });
      const elapsedSeconds = Math.floor((Date.now() - new Date(sessionForTime!.startedAt).getTime()) / 1000);
      const limitSeconds = sessionForTime!.template.duration * 60;
      if (elapsedSeconds >= limitSeconds) {
        return this.submitSession(userId, sessionId);
      }
    }

    // Return detailed session depending on status
    if (basicSession.status === 'COMPLETED') {
      return this.prisma.examSession.findUnique({
        where: { id: sessionId },
        include: {
          template: { select: { name: true, duration: true, passingScore: true } },
          attempt: true,
          answers: {
            orderBy: { sortOrder: 'asc' },
            include: {
              question: {
                include: {
                  options: true
                }
              }
            }
          }
        }
      });
    }

    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        template: { select: { name: true, duration: true, passingScore: true } },
        answers: {
          orderBy: { sortOrder: 'asc' },
          include: {
            question: {
              include: {
                options: {
                  select: {
                    id: true,
                    text: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Check and update time remaining dynamically
    if (session && session.status === 'ACTIVE') {
      const elapsedSeconds = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
      const limitSeconds = session.template.duration * 60;
      const timeRemainingSeconds = Math.max(0, limitSeconds - elapsedSeconds);
      await this.prisma.examSession.update({
        where: { id: sessionId },
        data: { timeRemainingSeconds },
      });
      session.timeRemainingSeconds = timeRemainingSeconds;
      
      // Strip question explanation for active sessions
      session.answers.forEach(ans => {
        ans.question.explanation = null;
      });
    }

    return session;
  }

  async saveAnswer(userId: string, sessionId: string, dto: SaveAnswerDto) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { template: { select: { duration: true } } },
    });

    if (!session) {
      throw new NotFoundException('Exam session not found.');
    }

    if (session.candidateId !== userId) {
      throw new ForbiddenException('You do not have access to this exam session.');
    }

    if (session.status !== 'ACTIVE') {
      throw new BadRequestException('This exam session is no longer active.');
    }

    // Check dynamic timer expiration
    const elapsedSeconds = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
    const limitSeconds = session.template.duration * 60;
    if (elapsedSeconds >= limitSeconds) {
      await this.submitSession(userId, sessionId);
      throw new BadRequestException('Time limit exceeded. The exam has been automatically submitted.');
    }

    const answer = await this.prisma.answer.findFirst({
      where: { sessionId: session.id, questionId: dto.questionId },
    });

    if (!answer) {
      throw new NotFoundException('Question not associated with this exam session.');
    }

    const timeRemainingSeconds = Math.max(0, limitSeconds - elapsedSeconds);

    return this.prisma.$transaction(async (tx) => {
      await tx.answer.update({
        where: { id: answer.id },
        data: {
          optionIds: dto.optionIds,
          timeSpentSeconds: dto.timeSpentSeconds,
          isFlagged: dto.isFlagged,
        },
      });

      await tx.examSession.update({
        where: { id: sessionId },
        data: { timeRemainingSeconds },
      });

      return { success: true };
    });
  }

  async submitSession(userId: string, sessionId: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        template: {
          include: {
            categoryWeights: {
              include: {
                category: { select: { name: true } },
              },
            },
          },
        },
        answers: {
          include: {
            question: {
              include: {
                options: true,
                category: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Exam session not found.');
    }

    if (session.candidateId !== userId) {
      throw new ForbiddenException('You do not have access to this exam session.');
    }

    if (session.status === 'COMPLETED') {
      // If already completed, just return the existing attempt
      const attempt = await this.prisma.examAttempt.findUnique({
        where: { sessionId: session.id },
      });
      if (attempt) return attempt;
      throw new BadRequestException('Exam session has already been completed.');
    }

    // 1. Calculate score & breakdown per category
    let correctQuestionsCount = 0;
    const categoryStatsMap: Record<string, { categoryId: string; categoryName: string; total: number; correct: number }> = {};

    // Initialize category statistics maps based on template category weights
    for (const cw of session.template.categoryWeights) {
      categoryStatsMap[cw.categoryId] = {
        categoryId: cw.categoryId,
        categoryName: cw.category.name,
        total: 0,
        correct: 0,
      };
    }

    for (const ans of session.answers) {
      const question = ans.question;
      const categoryId = question.categoryId;

      if (!categoryStatsMap[categoryId]) {
        categoryStatsMap[categoryId] = {
          categoryId,
          categoryName: question.category?.name || 'Uncategorized',
          total: 0,
          correct: 0,
        };
      }

      categoryStatsMap[categoryId].total += 1;

      // Check answer correctness
      const correctOptions = question.options.filter((o) => o.isCorrect).map((o) => o.id);
      const isCorrect =
        correctOptions.length === ans.optionIds.length &&
        correctOptions.every((id) => ans.optionIds.includes(id));

      if (isCorrect) {
        correctQuestionsCount += 1;
        categoryStatsMap[categoryId].correct += 1;
      }
    }

    const totalQuestions = session.answers.length;
    const scorePercentage = totalQuestions > 0 ? Math.round((correctQuestionsCount / totalQuestions) * 100) : 0;
    const isPassed = scorePercentage >= session.template.passingScore;

    const categoriesBreakdown = Object.values(categoryStatsMap).map((stat) => ({
      ...stat,
      percentage: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
    }));

    const reportJson = {
      totalQuestions,
      correctAnswers: correctQuestionsCount,
      scorePercentage,
      categories: categoriesBreakdown,
    };

    // 2. Persist completion status and Attempt inside a transaction
    return this.prisma.$transaction(async (tx) => {
      const endedAt = new Date();
      await tx.examSession.update({
        where: { id: session.id },
        data: {
          status: 'COMPLETED',
          endedAt,
          timeRemainingSeconds: 0,
        },
      });

      const attempt = await tx.examAttempt.create({
        data: {
          sessionId: session.id,
          score: scorePercentage,
          isPassed,
          reportJson: reportJson as any,
        },
      });

      return attempt;
    });
  }

  async getAdminSessions() {
    return this.prisma.examSession.findMany({
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        template: {
          select: {
            name: true,
          },
        },
        attempt: {
          select: {
            score: true,
            isPassed: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            proctorLogs: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async logProctorEvent(
    userId: string,
    sessionId: string,
    body: { eventType: string; severity: string; details?: any },
  ) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Exam session not found.');
    }

    if (session.candidateId !== userId) {
      throw new ForbiddenException('You do not have access to this exam session.');
    }

    return this.prisma.proctorLog.create({
      data: {
        sessionId,
        eventType: body.eventType,
        severity: body.severity,
        details: body.details || undefined,
      },
    });
  }

  async getProctorLogs(sessionId: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        candidate: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        template: {
          select: {
            name: true,
          },
        },
        attempt: {
          select: {
            score: true,
            isPassed: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Exam session not found.');
    }

    const logs = await this.prisma.proctorLog.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
    });

    return {
      session,
      logs,
    };
  }
}
