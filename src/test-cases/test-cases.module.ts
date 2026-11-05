import { Module } from '@nestjs/common';
import { TestCasesController } from './test-cases.controller';
import { TestCasesService } from './test-cases.service';
import { WorkflowModule } from '../workflow/workflow.module';
import { GarageImportService } from './garage-import.service';

@Module({
  imports: [WorkflowModule],
  controllers: [TestCasesController],
  providers: [TestCasesService, GarageImportService],
})
export class TestCasesModule {}
