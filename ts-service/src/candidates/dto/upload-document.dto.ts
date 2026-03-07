import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class UploadDocumentDto {
  @ApiProperty({
    description: 'Type of the document being uploaded',
    enum: ['resume', 'cover_letter', 'portfolio', 'transcript', 'other'],
    example: 'resume',
  })
  @IsString()
  @IsIn(['resume', 'cover_letter', 'portfolio', 'transcript', 'other'])
  documentType!: string;

  @ApiProperty({
    description: 'Original filename of the document',
    example: 'john_doe_resume.pdf',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({
    description: 'Storage key/path where the document is stored (e.g., S3 key)',
    example: 's3://talent-docs/candidates/abc123/resume.pdf',
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  storageKey!: string;

  @ApiProperty({
    description: 'Extracted text content from the document (required for LLM processing)',
    example:
      'John Doe\nSoftware Engineer\n\nExperience:\n- Senior Developer at Tech Corp (2020-2024)\n- Built scalable microservices...',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  rawText!: string;
}
