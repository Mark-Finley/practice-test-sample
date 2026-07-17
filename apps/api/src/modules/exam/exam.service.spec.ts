import { Test, TestingModule } from '@nestjs/testing';
import { ExamService } from './exam.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('ExamService', () => {
  let service: ExamService;
  let prisma: any;

  const mockPrisma = {
    examTemplate: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    question: {
      findMany: jest.fn(),
    },
    examSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    answer: {
      createMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    examAttempt: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    proctorLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ExamService>(ExamService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getTemplates', () => {
    it('should return a list of templates', async () => {
      const mockTemplates = [{ id: 'template-id', name: 'Mock SAA Exam' }];
      prisma.examTemplate.findMany.mockResolvedValue(mockTemplates);

      const result = await service.getTemplates();
      expect(prisma.examTemplate.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockTemplates);
    });
  });

  describe('createSession', () => {
    it('should throw NotFoundException if template does not exist', async () => {
      prisma.examTemplate.findUnique.mockResolvedValue(null);

      await expect(
        service.createSession('user-id', { templateId: 'template-id' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if not enough questions are available in a category', async () => {
      prisma.examTemplate.findUnique.mockResolvedValue({
        id: 'template-id',
        duration: 60,
        categoryWeights: [
          { categoryId: 'cat-1', questionCount: 5, category: { name: 'Cat 1' } },
        ],
      });
      prisma.question.findMany.mockResolvedValue([
        { id: 'q-1' },
      ]); // only 1 question available, but 5 requested

      await expect(
        service.createSession('user-id', { templateId: 'template-id' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should initialize a session and create answer placeholders', async () => {
      const mockTemplate = {
        id: 'template-id',
        duration: 60,
        categoryWeights: [
          { categoryId: 'cat-1', questionCount: 2, category: { name: 'Cat 1' } },
        ],
      };
      const mockQuestions = [
        { id: 'q-1' },
        { id: 'q-2' },
      ];
      const mockSession = {
        id: 'session-id',
        candidateId: 'user-id',
        templateId: 'template-id',
        status: 'ACTIVE',
        timeRemainingSeconds: 3600,
      };
      const mockFullSession = {
        ...mockSession,
        template: { name: 'AWS Exam', duration: 60 },
        answers: [
          {
            id: 'ans-1',
            sortOrder: 1,
            question: { id: 'q-1', options: [{ id: 'opt-1', text: 'Option A' }] },
          },
          {
            id: 'ans-2',
            sortOrder: 2,
            question: { id: 'q-2', options: [{ id: 'opt-2', text: 'Option B' }] },
          },
        ],
      };

      prisma.examTemplate.findUnique.mockResolvedValue(mockTemplate);
      prisma.question.findMany.mockResolvedValue(mockQuestions);
      prisma.examSession.create.mockResolvedValue(mockSession);
      prisma.examSession.findUnique.mockResolvedValue(mockFullSession);

      const result = await service.createSession('user-id', { templateId: 'template-id' });

      expect(prisma.examSession.create).toHaveBeenCalled();
      expect(prisma.answer.createMany).toHaveBeenCalled();
      expect(result).toEqual(mockFullSession);
    });
  });

  describe('getSession', () => {
    it('should throw NotFoundException if session is not found', async () => {
      prisma.examSession.findUnique.mockResolvedValue(null);

      await expect(service.getSession('user-id', 'session-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the session owner', async () => {
      prisma.examSession.findUnique.mockResolvedValue({
        id: 'session-id',
        candidateId: 'different-user-id',
      });

      await expect(service.getSession('user-id', 'session-id')).rejects.toThrow(ForbiddenException);
    });

    it('should auto-submit the exam if the time limit is reached', async () => {
      const startedAt = new Date(Date.now() - 70 * 60 * 1000); // 70 mins ago
      const mockSession = {
        id: 'session-id',
        candidateId: 'user-id',
        status: 'ACTIVE',
        startedAt,
        template: { name: 'AWS', duration: 60, passingScore: 70, categoryWeights: [] },
        answers: [],
      };

      prisma.examSession.findUnique.mockResolvedValue(mockSession);
      prisma.examAttempt.create.mockResolvedValue({ id: 'attempt-id', score: 0 });

      const result = await service.getSession('user-id', 'session-id');

      expect(prisma.examSession.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'session-id' },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }));
    });
  });

  describe('saveAnswer', () => {
    it('should throw BadRequestException if session is not active', async () => {
      prisma.examSession.findUnique.mockResolvedValue({
        id: 'session-id',
        candidateId: 'user-id',
        status: 'COMPLETED',
        template: { duration: 60 },
      });

      await expect(
        service.saveAnswer('user-id', 'session-id', {
          questionId: 'q-1',
          optionIds: [],
          timeSpentSeconds: 10,
          isFlagged: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update answer fields if valid', async () => {
      const mockSession = {
        id: 'session-id',
        candidateId: 'user-id',
        status: 'ACTIVE',
        startedAt: new Date(),
        template: { duration: 60 },
      };
      const mockAnswer = { id: 'ans-1', sessionId: 'session-id', questionId: 'q-1' };

      prisma.examSession.findUnique.mockResolvedValue(mockSession);
      prisma.answer.findFirst.mockResolvedValue(mockAnswer);

      const result = await service.saveAnswer('user-id', 'session-id', {
        questionId: 'q-1',
        optionIds: ['opt-1'],
        timeSpentSeconds: 15,
        isFlagged: true,
      });

      expect(prisma.answer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ans-1' },
          data: { optionIds: ['opt-1'], timeSpentSeconds: 15, isFlagged: true },
        }),
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('submitSession', () => {
    it('should calculate the score and mark session as completed', async () => {
      const mockSession = {
        id: 'session-id',
        candidateId: 'user-id',
        status: 'ACTIVE',
        template: {
          passingScore: 70,
          categoryWeights: [
            { categoryId: 'cat-1', category: { name: 'Cat 1' } },
          ],
        },
        answers: [
          {
            optionIds: ['opt-1'],
            question: {
              categoryId: 'cat-1',
              category: { name: 'Cat 1' },
              options: [
                { id: 'opt-1', isCorrect: true },
                { id: 'opt-2', isCorrect: false },
              ],
            },
          },
        ],
      };

      prisma.examSession.findUnique.mockResolvedValue(mockSession);
      prisma.examAttempt.create.mockImplementation(({ data }) => Promise.resolve({ id: 'attempt-id', ...data }));

      const result: any = await service.submitSession('user-id', 'session-id');

      expect(prisma.examSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-id' },
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
      expect(result.score).toBe(100);
      expect(result.isPassed).toBe(true);
    });
  });

  describe('getAdminSessions', () => {
    it('should return all exam sessions with attempts and counts', async () => {
      const mockSessions = [{ id: 'session-1', candidate: { firstName: 'John' }, _count: { proctorLogs: 2 } }];
      prisma.examSession.findMany.mockResolvedValue(mockSessions);

      const result = await service.getAdminSessions();

      expect(prisma.examSession.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockSessions);
    });
  });

  describe('logProctorEvent', () => {
    it('should throw NotFoundException if session is not found', async () => {
      prisma.examSession.findUnique.mockResolvedValue(null);

      await expect(
        service.logProctorEvent('user-id', 'session-id', { eventType: 'TAB_SWITCH', severity: 'LOW' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not session candidate', async () => {
      prisma.examSession.findUnique.mockResolvedValue({ id: 'session-id', candidateId: 'other-user' });

      await expect(
        service.logProctorEvent('user-id', 'session-id', { eventType: 'TAB_SWITCH', severity: 'LOW' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create and return proctor log if valid', async () => {
      prisma.examSession.findUnique.mockResolvedValue({ id: 'session-id', candidateId: 'user-id' });
      prisma.proctorLog.create.mockResolvedValue({ id: 'log-1', eventType: 'TAB_SWITCH' });

      const result = await service.logProctorEvent('user-id', 'session-id', {
        eventType: 'TAB_SWITCH',
        severity: 'LOW',
        details: { width: 100 },
      });

      expect(prisma.proctorLog.create).toHaveBeenCalledWith({
        data: {
          sessionId: 'session-id',
          eventType: 'TAB_SWITCH',
          severity: 'LOW',
          details: { width: 100 },
        },
      });
      expect(result).toEqual({ id: 'log-1', eventType: 'TAB_SWITCH' });
    });
  });

  describe('getProctorLogs', () => {
    it('should return session info and proctor logs', async () => {
      const mockSession = { id: 'session-id', candidate: { email: 'john@a.com' } };
      const mockLogs = [{ id: 'log-1', eventType: 'TAB_SWITCH' }];

      prisma.examSession.findUnique.mockResolvedValue(mockSession);
      prisma.proctorLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getProctorLogs('session-id');

      expect(prisma.examSession.findUnique).toHaveBeenCalled();
      expect(prisma.proctorLog.findMany).toHaveBeenCalled();
      expect(result).toEqual({
        session: mockSession,
        logs: mockLogs,
      });
    });
  });
});
