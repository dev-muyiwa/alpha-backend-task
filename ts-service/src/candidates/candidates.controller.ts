import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/auth-user.decorator';
import { AuthUser } from '../auth/auth.types';
import { FakeAuthGuard } from '../auth/fake-auth.guard';
import { CandidatesService } from './candidates.service';
import { UploadDocumentDto } from './dto';

@ApiTags('candidates')
@ApiSecurity('x-user-id')
@ApiSecurity('x-workspace-id')
@ApiUnauthorizedResponse({ description: 'Missing required headers: x-user-id and x-workspace-id' })
@Controller('candidates')
@UseGuards(FakeAuthGuard)
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Post(':candidateId/documents')
  @ApiOperation({
    summary: 'Upload a document for a candidate',
    description: `Upload a document with its extracted text content for a candidate.

The rawText field is required and will be used by the LLM to generate candidate summaries.
Documents are scoped to the authenticated workspace.`,
  })
  @ApiParam({
    name: 'candidateId',
    description: 'UUID of the candidate',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({ description: 'Document uploaded successfully' })
  @ApiNotFoundResponse({ description: 'Candidate not found in this workspace' })
  async uploadDocument(
    @CurrentUser() user: AuthUser,
    @Param('candidateId') candidateId: string,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.candidatesService.uploadDocument(user, candidateId, dto);
  }

  @Get(':candidateId/documents')
  @ApiOperation({
    summary: 'List all documents for a candidate',
    description: 'Retrieve all documents uploaded for a candidate in the current workspace.',
  })
  @ApiParam({
    name: 'candidateId',
    description: 'UUID of the candidate',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({ description: 'List of documents returned successfully' })
  @ApiNotFoundResponse({ description: 'Candidate not found in this workspace' })
  async listDocuments(
    @CurrentUser() user: AuthUser,
    @Param('candidateId') candidateId: string,
  ) {
    return this.candidatesService.listDocuments(user, candidateId);
  }

  @Post(':candidateId/summaries/generate')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Generate an AI summary for a candidate',
    description: `Trigger AI-powered summary generation for a candidate based on their uploaded documents.

The summary is generated asynchronously. This endpoint returns immediately with a pending summary record.
Poll the summary status using GET /candidates/{id}/summaries/{summaryId} to check completion.

**LLM Provider:** Uses Gemini 2.5 Flash (or fake provider if GEMINI_API_KEY not configured)`,
  })
  @ApiParam({
    name: 'candidateId',
    description: 'UUID of the candidate',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiAcceptedResponse({
    description: 'Summary generation started. Returns pending summary record.',
  })
  @ApiNotFoundResponse({ description: 'Candidate not found in this workspace' })
  async generateSummary(
    @CurrentUser() user: AuthUser,
    @Param('candidateId') candidateId: string,
  ) {
    return this.candidatesService.generateSummary(user, candidateId);
  }

  @Get(':candidateId/summaries')
  @ApiOperation({
    summary: 'List all summaries for a candidate',
    description: 'Retrieve all AI-generated summaries for a candidate, ordered by creation date.',
  })
  @ApiParam({
    name: 'candidateId',
    description: 'UUID of the candidate',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({ description: 'List of summaries returned successfully' })
  @ApiNotFoundResponse({ description: 'Candidate not found in this workspace' })
  async listSummaries(
    @CurrentUser() user: AuthUser,
    @Param('candidateId') candidateId: string,
  ) {
    return this.candidatesService.listSummaries(user, candidateId);
  }

  @Get(':candidateId/summaries/:summaryId')
  @ApiOperation({
    summary: 'Get a specific summary',
    description: `Retrieve a specific summary by ID. Use this to poll for summary completion.

**Status values:**
- \`pending\`: Summary is being generated
- \`completed\`: Summary generation finished successfully
- \`failed\`: Summary generation failed (check errorMessage)`,
  })
  @ApiParam({
    name: 'candidateId',
    description: 'UUID of the candidate',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiParam({
    name: 'summaryId',
    description: 'UUID of the summary',
    example: '660e8400-e29b-41d4-a716-446655440001',
  })
  @ApiOkResponse({ description: 'Summary returned successfully' })
  @ApiNotFoundResponse({ description: 'Candidate or summary not found in this workspace' })
  async getSummary(
    @CurrentUser() user: AuthUser,
    @Param('candidateId') candidateId: string,
    @Param('summaryId') summaryId: string,
  ) {
    return this.candidatesService.getSummary(user, candidateId, summaryId);
  }
}
