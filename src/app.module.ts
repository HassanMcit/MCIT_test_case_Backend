import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { DatabaseModule }   from './database/database.module';
import { AuthModule }       from './auth/auth.module';
import { DashboardModule }  from './dashboard/dashboard.module';
import { TestCasesModule }  from './test-cases/test-cases.module';
import { ProjectsModule }   from './projects/projects.module';
import { UsersModule }      from './users/users.module';
import { JwtAuthGuard }     from './auth/jwt-auth.guard';

@Module({
  imports: [
    // Load .env file globally
    ConfigModule.forRoot({ isGlobal: true }),

    // Built-in SQLite Database
    DatabaseModule,

    // Feature modules
    AuthModule,
    DashboardModule,
    TestCasesModule,
    ProjectsModule,
    UsersModule,
  ],
  providers: [
    // Apply JWT guard globally — use @Public() to opt-out per route
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
