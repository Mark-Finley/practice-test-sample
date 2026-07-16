import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  async create(name: string, logoUrl?: string) {
    const existing = await this.prisma.organization.findUnique({
      where: { name },
    });
    if (existing) {
      throw new ConflictException('An organization with this name already exists.');
    }
    return this.prisma.organization.create({
      data: { name, logoUrl },
    });
  }

  async findAll() {
    return this.prisma.organization.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: { select: { name: true } },
          },
        },
      },
    });
    if (!org) {
      throw new NotFoundException('Organization not found.');
    }
    return org;
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.organization.delete({
      where: { id },
    });
  }
}
