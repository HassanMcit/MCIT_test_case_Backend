import { ProjectDeadlinesService } from './project-deadlines.service';
import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectDeadlinesService],
})
export class ProjectsModule {}
