import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: any;

  const mockPrisma = {
    examAttempt: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCandidateAttempts', () => {
    it('should return historical attempts for candidate', async () => {
      const mockAttempts = [
        {
          id: 'attempt-1',
          score: 85,
          isPassed: true,
          createdAt: new Date(),
          session: {
            id: 'session-1',
            template: { name: 'AWS' },
          },
        },
      ];

      prisma.examAttempt.findMany.mockResolvedValue(mockAttempts);

      const result = await service.getCandidateAttempts('user-1');

      expect(prisma.examAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            session: {
              candidateId: 'user-1',
            },
          },
        }),
      );
      expect(result).toEqual(mockAttempts);
    });
  });

  describe('exportAttemptsCsv', () => {
    it('should compile list into csv output string', async () => {
      const mockAttempts = [
        {
          id: 'attempt-1',
          score: 90,
          isPassed: true,
          createdAt: new Date('2026-01-01T12:00:00.000Z'),
          session: {
            candidate: { firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com' },
            template: { name: 'SAA-C03' },
          },
        },
      ];

      prisma.examAttempt.findMany.mockResolvedValue(mockAttempts);

      const csv = await service.exportAttemptsCsv();

      expect(csv).toContain('Attempt ID,Candidate Name,Candidate Email,Exam Blueprint,Score,Status,Created At');
      expect(csv).toContain('attempt-1');
      expect(csv).toContain('Alice Smith');
      expect(csv).toContain('90%');
      expect(csv).toContain('PASS');
    });
  });

  describe('generateCertificatePdf', () => {
    it('should throw NotFoundException if attempt is missing', async () => {
      prisma.examAttempt.findUnique.mockResolvedValue(null);

      await expect(
        service.generateCertificatePdf('attempt-1', 'user-1', 'CANDIDATE'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not candidate and not admin', async () => {
      const mockAttempt = {
        id: 'attempt-1',
        session: { candidateId: 'user-2', candidate: {}, template: {} },
      };
      prisma.examAttempt.findUnique.mockResolvedValue(mockAttempt);

      await expect(
        service.generateCertificatePdf('attempt-1', 'user-1', 'CANDIDATE'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if attempt is failed', async () => {
      const mockAttempt = {
        id: 'attempt-1',
        isPassed: false,
        session: { candidateId: 'user-1', candidate: {}, template: {} },
      };
      prisma.examAttempt.findUnique.mockResolvedValue(mockAttempt);

      await expect(
        service.generateCertificatePdf('attempt-1', 'user-1', 'CANDIDATE'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should generate PDF buffer for passed attempts', async () => {
      const mockAttempt = {
        id: 'attempt-1',
        isPassed: true,
        score: 95,
        createdAt: new Date(),
        session: {
          candidateId: 'user-1',
          candidate: { firstName: 'Alice', lastName: 'Smith' },
          template: { name: 'SAA-C03' },
        },
      };
      prisma.examAttempt.findUnique.mockResolvedValue(mockAttempt);

      const buffer = await service.generateCertificatePdf('attempt-1', 'user-1', 'CANDIDATE');

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
