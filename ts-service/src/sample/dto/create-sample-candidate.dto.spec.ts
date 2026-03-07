import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreateSampleCandidateDto } from './create-sample-candidate.dto';

describe('CreateSampleCandidateDto', () => {
  const createDto = (overrides: Partial<CreateSampleCandidateDto> = {}): CreateSampleCandidateDto => {
    return plainToInstance(CreateSampleCandidateDto, {
      fullName: 'John Doe',
      ...overrides,
    });
  };

  describe('fullName', () => {
    it('accepts valid fullName (2-160 chars)', async () => {
      const dto = createDto({ fullName: 'John Doe' });
      const errors = await validate(dto);

      const fullNameErrors = errors.filter((e) => e.property === 'fullName');
      expect(fullNameErrors).toHaveLength(0);
    });

    it('accepts fullName at minimum length (2 chars)', async () => {
      const dto = createDto({ fullName: 'Jo' });
      const errors = await validate(dto);

      const fullNameErrors = errors.filter((e) => e.property === 'fullName');
      expect(fullNameErrors).toHaveLength(0);
    });

    it('accepts fullName at maximum length (160 chars)', async () => {
      const dto = createDto({ fullName: 'A'.repeat(160) });
      const errors = await validate(dto);

      const fullNameErrors = errors.filter((e) => e.property === 'fullName');
      expect(fullNameErrors).toHaveLength(0);
    });

    it('rejects fullName too short (< 2 chars)', async () => {
      const dto = createDto({ fullName: 'J' });
      const errors = await validate(dto);

      const fullNameErrors = errors.filter((e) => e.property === 'fullName');
      expect(fullNameErrors.length).toBeGreaterThan(0);
    });

    it('rejects fullName too long (> 160 chars)', async () => {
      const dto = createDto({ fullName: 'A'.repeat(161) });
      const errors = await validate(dto);

      const fullNameErrors = errors.filter((e) => e.property === 'fullName');
      expect(fullNameErrors.length).toBeGreaterThan(0);
    });

    it('rejects empty fullName', async () => {
      const dto = createDto({ fullName: '' });
      const errors = await validate(dto);

      const fullNameErrors = errors.filter((e) => e.property === 'fullName');
      expect(fullNameErrors.length).toBeGreaterThan(0);
    });
  });

  describe('email', () => {
    it('accepts valid email', async () => {
      const dto = createDto({ email: 'john@example.com' });
      const errors = await validate(dto);

      const emailErrors = errors.filter((e) => e.property === 'email');
      expect(emailErrors).toHaveLength(0);
    });

    it('accepts email being optional (undefined)', async () => {
      const dto = createDto({ email: undefined });
      const errors = await validate(dto);

      const emailErrors = errors.filter((e) => e.property === 'email');
      expect(emailErrors).toHaveLength(0);
    });

    it('rejects invalid email format', async () => {
      const dto = createDto({ email: 'not-an-email' });
      const errors = await validate(dto);

      const emailErrors = errors.filter((e) => e.property === 'email');
      expect(emailErrors.length).toBeGreaterThan(0);
    });

    it('rejects email too long (> 160 chars)', async () => {
      const dto = createDto({ email: 'a'.repeat(150) + '@example.com' });
      const errors = await validate(dto);

      const emailErrors = errors.filter((e) => e.property === 'email');
      expect(emailErrors.length).toBeGreaterThan(0);
    });
  });

  describe('full validation', () => {
    it('passes with all valid fields including email', async () => {
      const dto = createDto({
        fullName: 'Jane Doe',
        email: 'jane@example.com',
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('passes with only required fields', async () => {
      const dto = plainToInstance(CreateSampleCandidateDto, {
        fullName: 'Bob Smith',
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('fails with missing fullName', async () => {
      const dto = plainToInstance(CreateSampleCandidateDto, {
        email: 'test@example.com',
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'fullName')).toBe(true);
    });
  });
});
