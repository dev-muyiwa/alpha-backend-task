import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { UploadDocumentDto } from './upload-document.dto';

describe('UploadDocumentDto', () => {
  const createDto = (overrides: Partial<UploadDocumentDto> = {}): UploadDocumentDto => {
    return plainToInstance(UploadDocumentDto, {
      documentType: 'resume',
      fileName: 'resume.pdf',
      storageKey: 's3://bucket/resume.pdf',
      rawText: 'This is the resume content.',
      ...overrides,
    });
  };

  describe('documentType', () => {
    it('accepts valid enum values', async () => {
      const validTypes = ['resume', 'cover_letter', 'portfolio', 'transcript', 'other'];

      for (const type of validTypes) {
        const dto = createDto({ documentType: type });
        const errors = await validate(dto);
        const documentTypeErrors = errors.filter((e) => e.property === 'documentType');
        expect(documentTypeErrors).toHaveLength(0);
      }
    });

    it('rejects invalid enum value', async () => {
      const dto = createDto({ documentType: 'invalid_type' });
      const errors = await validate(dto);

      const documentTypeErrors = errors.filter((e) => e.property === 'documentType');
      expect(documentTypeErrors.length).toBeGreaterThan(0);
    });
  });

  describe('fileName', () => {
    it('accepts valid filename (1-255 chars)', async () => {
      const dto = createDto({ fileName: 'valid-file.pdf' });
      const errors = await validate(dto);

      const fileNameErrors = errors.filter((e) => e.property === 'fileName');
      expect(fileNameErrors).toHaveLength(0);
    });

    it('accepts filename at max length (255 chars)', async () => {
      const dto = createDto({ fileName: 'a'.repeat(255) });
      const errors = await validate(dto);

      const fileNameErrors = errors.filter((e) => e.property === 'fileName');
      expect(fileNameErrors).toHaveLength(0);
    });

    it('rejects empty filename', async () => {
      const dto = createDto({ fileName: '' });
      const errors = await validate(dto);

      const fileNameErrors = errors.filter((e) => e.property === 'fileName');
      expect(fileNameErrors.length).toBeGreaterThan(0);
    });

    it('rejects filename too long (> 255 chars)', async () => {
      const dto = createDto({ fileName: 'a'.repeat(256) });
      const errors = await validate(dto);

      const fileNameErrors = errors.filter((e) => e.property === 'fileName');
      expect(fileNameErrors.length).toBeGreaterThan(0);
    });
  });

  describe('storageKey', () => {
    it('accepts valid storageKey (1-500 chars)', async () => {
      const dto = createDto({ storageKey: 's3://bucket/path/to/file.pdf' });
      const errors = await validate(dto);

      const storageKeyErrors = errors.filter((e) => e.property === 'storageKey');
      expect(storageKeyErrors).toHaveLength(0);
    });

    it('accepts storageKey at max length (500 chars)', async () => {
      const dto = createDto({ storageKey: 's3://' + 'a'.repeat(495) });
      const errors = await validate(dto);

      const storageKeyErrors = errors.filter((e) => e.property === 'storageKey');
      expect(storageKeyErrors).toHaveLength(0);
    });

    it('rejects empty storageKey', async () => {
      const dto = createDto({ storageKey: '' });
      const errors = await validate(dto);

      const storageKeyErrors = errors.filter((e) => e.property === 'storageKey');
      expect(storageKeyErrors.length).toBeGreaterThan(0);
    });

    it('rejects storageKey too long (> 500 chars)', async () => {
      const dto = createDto({ storageKey: 'a'.repeat(501) });
      const errors = await validate(dto);

      const storageKeyErrors = errors.filter((e) => e.property === 'storageKey');
      expect(storageKeyErrors.length).toBeGreaterThan(0);
    });
  });

  describe('rawText', () => {
    it('accepts non-empty rawText', async () => {
      const dto = createDto({ rawText: 'Some content' });
      const errors = await validate(dto);

      const rawTextErrors = errors.filter((e) => e.property === 'rawText');
      expect(rawTextErrors).toHaveLength(0);
    });

    it('rejects empty rawText', async () => {
      const dto = createDto({ rawText: '' });
      const errors = await validate(dto);

      const rawTextErrors = errors.filter((e) => e.property === 'rawText');
      expect(rawTextErrors.length).toBeGreaterThan(0);
    });
  });

  describe('full validation', () => {
    it('passes with all valid fields', async () => {
      const dto = createDto();
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('fails with all invalid fields', async () => {
      const dto = createDto({
        documentType: 'invalid',
        fileName: '',
        storageKey: '',
        rawText: '',
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThanOrEqual(4);
    });
  });
});
