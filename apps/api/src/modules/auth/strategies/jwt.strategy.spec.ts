import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: { user: { findUnique: jest.Mock } };

  const activeUser: User = {
    id: 'user-1',
    email: 'mechanic@taller.com',
    passwordHash: 'hash',
    fullName: 'Workshop Mechanic',
    role: UserRole.MECHANIC,
    active: true,
    sessionVersion: 2,
    refreshTokenHash: null,
    refreshTokenExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };

    strategy = new JwtStrategy(
      {
        getOrThrow: jest.fn().mockReturnValue('test-access-secret-min-32-characters!!'),
      } as unknown as ConfigService,
      prisma as unknown as PrismaService,
    );
  });

  it('returns authenticated user when sessionVersion matches', async () => {
    prisma.user.findUnique.mockResolvedValue(activeUser);

    const result = await strategy.validate({
      sub: activeUser.id,
      email: activeUser.email,
      role: UserRole.ADMIN,
      sessionVersion: 2,
    });

    expect(result).toEqual<AuthenticatedUser>({
      userId: activeUser.id,
      email: activeUser.email,
      role: UserRole.MECHANIC,
    });
  });

  it('rejects mismatched sessionVersion', async () => {
    prisma.user.findUnique.mockResolvedValue(activeUser);

    await expect(
      strategy.validate({
        sub: activeUser.id,
        email: activeUser.email,
        role: activeUser.role,
        sessionVersion: 1,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects inactive users', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...activeUser,
      active: false,
    });

    await expect(
      strategy.validate({
        sub: activeUser.id,
        email: activeUser.email,
        role: activeUser.role,
        sessionVersion: 2,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
