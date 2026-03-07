import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/auth-user.decorator';
import { AuthUser } from '../auth/auth.types';
import { FakeAuthGuard } from '../auth/fake-auth.guard';
import { CreateSampleCandidateDto } from './dto/create-sample-candidate.dto';
import { SampleService } from './sample.service';

@ApiTags('sample')
@ApiSecurity('x-user-id')
@ApiSecurity('x-workspace-id')
@ApiUnauthorizedResponse({ description: 'Missing required headers: x-user-id and x-workspace-id' })
@Controller('sample')
@UseGuards(FakeAuthGuard)
export class SampleController {
  constructor(private readonly sampleService: SampleService) {}

  @Post('candidates')
  @ApiOperation({
    summary: 'Create a new candidate',
    description: 'Create a new candidate in the current workspace. Candidates are scoped to the authenticated workspace.',
  })
  @ApiCreatedResponse({ description: 'Candidate created successfully' })
  async createCandidate(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSampleCandidateDto,
  ) {
    return this.sampleService.createCandidate(user, dto);
  }

  @Get('candidates')
  @ApiOperation({
    summary: 'List all candidates',
    description: 'Retrieve all candidates in the current workspace.',
  })
  @ApiOkResponse({ description: 'List of candidates returned successfully' })
  async listCandidates(@CurrentUser() user: AuthUser) {
    return this.sampleService.listCandidates(user);
  }
}
