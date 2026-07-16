import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationModule } from './modules/organization/organization.module';

@Module({
  imports: [PrismaModule, UserModule, AuthModule, OrganizationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
