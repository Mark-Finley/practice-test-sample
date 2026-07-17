import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import PDFDocument from 'pdfkit';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getCandidateAttempts(userId: string) {
    return this.prisma.examAttempt.findMany({
      where: {
        session: {
          candidateId: userId,
        },
      },
      include: {
        session: {
          select: {
            id: true,
            template: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async exportAttemptsCsv() {
    const attempts = await this.prisma.examAttempt.findMany({
      include: {
        session: {
          include: {
            candidate: true,
            template: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const headers = ['Attempt ID', 'Candidate Name', 'Candidate Email', 'Exam Blueprint', 'Score', 'Status', 'Created At'];
    const rows = attempts.map((att) => [
      att.id,
      `${att.session.candidate.firstName} ${att.session.candidate.lastName}`,
      att.session.candidate.email,
      att.session.template.name,
      `${att.score}%`,
      att.isPassed ? 'PASS' : 'FAIL',
      att.createdAt.toISOString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  async generateCertificatePdf(attemptId: string, userId: string, userRole: string): Promise<Buffer> {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        session: {
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
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Exam attempt not found.');
    }

    // Auth check: candidate themselves or admins
    if (attempt.session.candidateId !== userId && userRole !== 'SYSTEM_ADMIN' && userRole !== 'ORG_ADMIN') {
      throw new ForbiddenException('You do not have permission to access this certificate.');
    }

    if (!attempt.isPassed) {
      throw new BadRequestException('You can only generate certificates for passed exam attempts.');
    }

    const candidateName = `${attempt.session.candidate.firstName} ${attempt.session.candidate.lastName}`;
    const examName = attempt.session.template.name;
    const completionDate = new Date(attempt.createdAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const scoreText = `Score: ${attempt.score}%`;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 40 });
        const buffers: Buffer[] = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          resolve(Buffer.concat(buffers));
        });

        // 1. Draw elegant border
        doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
           .lineWidth(3)
           .stroke('#6366f1'); // Indigo border
           
        doc.rect(26, 26, doc.page.width - 52, doc.page.height - 52)
           .lineWidth(1)
           .stroke('#8b5cf6'); // Violet inner border

        // 2. Draw certificate header
        doc.y = 80;
        doc.fillColor('#1e293b')
           .fontSize(32)
           .font('Helvetica-Bold')
           .text('CERTIFICATE OF COMPLETION', { align: 'center' });

        doc.moveDown(1.5);
        doc.fillColor('#64748b')
           .fontSize(14)
           .font('Helvetica')
           .text('This is proudly presented to', { align: 'center' });

        // 3. Draw candidate name
        doc.moveDown(1);
        doc.fillColor('#4f46e5') // Indigo-600
           .fontSize(28)
           .font('Helvetica-Bold')
           .text(candidateName, { align: 'center' });

        // 4. Draw statement
        doc.moveDown(1.2);
        doc.fillColor('#64748b')
           .fontSize(14)
           .font('Helvetica')
           .text('for successfully passing the simulated practice exam', { align: 'center' });

        // 5. Draw Exam Name
        doc.moveDown(0.8);
        doc.fillColor('#1e293b')
           .fontSize(20)
           .font('Helvetica-Bold')
           .text(examName, { align: 'center' });

        // 6. Draw Score & Date
        doc.moveDown(1.2);
        doc.fillColor('#0f766e') // Teal-700
           .fontSize(15)
           .font('Helvetica-Bold')
           .text(`${scoreText}   |   Completed on ${completionDate}`, { align: 'center' });

        // 7. Draw decorative stamp and signature lines
        // Left Signature: Registrar
        doc.moveTo(150, 480).lineTo(300, 480).lineWidth(1).stroke('#94a3b8');
        doc.fillColor('#475569').fontSize(10).font('Helvetica').text('Registrar Authority', 150, 490, { width: 150, align: 'center' });

        // Right Signature: Verification Signature
        doc.moveTo(doc.page.width - 300, 480).lineTo(doc.page.width - 150, 480).lineWidth(1).stroke('#94a3b8');
        doc.fillColor('#475569').fontSize(10).font('Helvetica').text('Antigravity Proctoring Seal', doc.page.width - 300, 490, { width: 150, align: 'center' });

        // Draw visual stamp
        doc.circle(doc.page.width / 2, 470, 25).lineWidth(2).stroke('#6366f1');
        doc.fillColor('#6366f1').fontSize(9).font('Helvetica-Bold').text('PASSED', (doc.page.width / 2) - 25, 466, { width: 50, align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
