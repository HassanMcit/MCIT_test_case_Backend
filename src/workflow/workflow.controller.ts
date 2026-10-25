import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import {
  AddCycleItemsDto,
  AssignCycleItemDto,
  CreateCycleDto,
  CreateExecutionDto,
  CreateReleaseDto,
  UpdateCycleDto,
  UpdateReleaseDto,
  WorkflowQueryDto,
} from './workflow.dto';

@ApiTags('Execution workflow')
@ApiBearerAuth('access-token')
@Controller()
export class WorkflowController {
  constructor(private readonly service: WorkflowService) {}
  @Get('projects/:projectId/releases') releases(
    @Param('projectId', ParseIntPipe) id: number,
    @Query() q: WorkflowQueryDto,
    @Request() req: any,
  ) {
    return this.service.releases(id, q, req.user);
  }
  @Post('projects/:projectId/releases') createRelease(
    @Param('projectId', ParseIntPipe) id: number,
    @Body() dto: CreateReleaseDto,
    @Request() req: any,
  ) {
    return this.service.createRelease(id, dto, req.user);
  }
  @Get('projects/:projectId/releases/:id') release(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.service.release(projectId, id, req.user);
  }
  @Patch('projects/:projectId/releases/:id') updateRelease(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReleaseDto,
    @Request() req: any,
  ) {
    return this.service.updateRelease(projectId, id, dto, req.user);
  }
  @Get('test-cycles') cycles(
    @Query() q: WorkflowQueryDto,
    @Request() req: any,
  ) {
    return this.service.cycles(q, req.user);
  }
  @Post('test-cycles') createCycle(
    @Body() dto: CreateCycleDto,
    @Request() req: any,
  ) {
    return this.service.createCycle(dto, req.user);
  }
  @Get('test-cycles/:id') cycle(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.service.cycle(id, req.user);
  }
  @Patch('test-cycles/:id') updateCycle(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCycleDto,
    @Request() req: any,
  ) {
    return this.service.updateCycle(id, dto, req.user);
  }
  @Get('test-cycles/:id/candidates') candidates(
    @Param('id', ParseIntPipe) id: number,
    @Query() q: WorkflowQueryDto,
    @Request() req: any,
  ) {
    return this.service.candidates(id, q, req.user);
  }
  @Post('test-cycles/:id/items') addItems(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddCycleItemsDto,
    @Request() req: any,
  ) {
    return this.service.addItems(id, dto, req.user);
  }
  @Get('test-cycles/:id/items') items(
    @Param('id', ParseIntPipe) id: number,
    @Query() q: WorkflowQueryDto,
    @Request() req: any,
  ) {
    return this.service.items(id, q, req.user);
  }
  @Patch('test-cycles/:id/items/:itemId') assign(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: AssignCycleItemDto,
    @Request() req: any,
  ) {
    return this.service.assign(id, itemId, dto, req.user);
  }
  @Post('test-cycles/:id/items/:itemId/executions') execute(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: CreateExecutionDto,
    @Request() req: any,
  ) {
    return this.service.execute(id, itemId, dto, req.user);
  }
  @Get('test-cases/:id/executions') history(
    @Param('id', ParseIntPipe) id: number,
    @Query() q: WorkflowQueryDto,
    @Request() req: any,
  ) {
    return this.service.history(id, q, req.user);
  }
  @Get('dashboard/executions') metrics(
    @Query() q: WorkflowQueryDto,
    @Request() req: any,
  ) {
    return this.service.metrics(q, req.user);
  }
}
