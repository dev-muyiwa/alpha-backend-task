import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { FakeSummarizationProvider } from './fake-summarization.provider';
import { GeminiSummarizationProvider } from './gemini-summarization.provider';
import { SUMMARIZATION_PROVIDER } from './summarization-provider.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    FakeSummarizationProvider,
    GeminiSummarizationProvider,
    {
      provide: SUMMARIZATION_PROVIDER,
      useFactory: (
        configService: ConfigService,
        gemini: GeminiSummarizationProvider,
        fake: FakeSummarizationProvider,
      ) => {
        const apiKey = configService.get<string>('GEMINI_API_KEY');
        return apiKey?.trim() ? gemini : fake;
      },
      inject: [ConfigService, GeminiSummarizationProvider, FakeSummarizationProvider],
    },
  ],
  exports: [SUMMARIZATION_PROVIDER, FakeSummarizationProvider, GeminiSummarizationProvider],
})
export class LlmModule {}
