import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { FakeAuthGuard } from './fake-auth.guard';

describe('FakeAuthGuard', () => {
  let guard: FakeAuthGuard;

  beforeEach(() => {
    guard = new FakeAuthGuard();
  });

  const createMockContext = (headers: Record<string, string | undefined>): ExecutionContext => {
    const request = {
      header: (name: string) => headers[name],
      user: undefined as unknown,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  it('returns true and attaches user when both headers present', () => {
    const context = createMockContext({
      'x-user-id': 'user-123',
      'x-workspace-id': 'workspace-456',
    });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    const request = context.switchToHttp().getRequest();
    expect(request.user).toEqual({
      userId: 'user-123',
      workspaceId: 'workspace-456',
    });
  });

  it('throws UnauthorizedException when x-user-id missing', () => {
    const context = createMockContext({
      'x-workspace-id': 'workspace-456',
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow(
      'Missing required headers: x-user-id and x-workspace-id',
    );
  });

  it('throws UnauthorizedException when x-workspace-id missing', () => {
    const context = createMockContext({
      'x-user-id': 'user-123',
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow(
      'Missing required headers: x-user-id and x-workspace-id',
    );
  });

  it('throws UnauthorizedException when both headers missing', () => {
    const context = createMockContext({});

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow(
      'Missing required headers: x-user-id and x-workspace-id',
    );
  });
});
