import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(email: string, passwordPlain: string, firstName: string, lastName: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('A user with this email address already exists.');
    }

    // Default registration assigns the CANDIDATE role
    const candidateRole = await this.prisma.role.findUnique({
      where: { name: 'CANDIDATE' },
    });

    if (!candidateRole) {
      throw new Error('CANDIDATE role is not seeded in the database!');
    }

    const passwordHash = await bcrypt.hash(passwordPlain, 10);

    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        roleId: candidateRole.id,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; password?: string; avatarUrl?: string }) {
    const updateData: any = {};
    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.avatarUrl) updateData.avatarUrl = data.avatarUrl;
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: { select: { name: true } },
      },
    });
  }
}
