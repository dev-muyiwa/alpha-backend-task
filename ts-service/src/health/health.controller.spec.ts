import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  describe('getHealth', () => {
    it('returns status ok', () => {
      const result = controller.getHealth();

      expect(result).toEqual({ status: 'ok' });
    });
  });
});
