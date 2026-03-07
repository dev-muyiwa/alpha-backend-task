import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('TalentFlow Candidate Service')
    .setDescription(
      `## Candidate Document Intake & Summary Workflow API

This API provides endpoints for managing candidate documents and generating AI-powered summaries.

### Features
- Upload and manage candidate documents (resumes, cover letters, etc.)
- Generate AI-powered candidate summaries using Gemini LLM
- Track summary generation status and results

### Authentication
All endpoints require the following headers:
- \`x-user-id\`: User identifier
- \`x-workspace-id\`: Workspace identifier (for multi-tenant isolation)

### Workflow
1. **Create a candidate** - POST \`/sample/candidates\`
2. **Upload documents** - POST \`/candidates/{id}/documents\` with document text
3. **Generate summary** - POST \`/candidates/{id}/summaries/generate\`
4. **Check status** - GET \`/candidates/{id}/summaries/{summaryId}\`
      `,
    )
    .setVersion('1.0.0')
    .addTag('candidates', 'Candidate document and summary operations')
    .addTag('sample', 'Sample candidate management (starter code)')
    .addTag('health', 'Health check endpoints')
    .addApiKey(
      { type: 'apiKey', name: 'x-user-id', in: 'header', description: 'User ID' },
      'x-user-id',
    )
    .addApiKey(
      { type: 'apiKey', name: 'x-workspace-id', in: 'header', description: 'Workspace ID' },
      'x-workspace-id',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

bootstrap();
