import {
  AdminBootstrapError,
  DevSeedError,
  assertNotProductionSeed,
  assertTestDatabaseName,
  assertUserTableEmpty,
  shouldRunAdminBootstrap,
  validateAdminBootstrapEnv,
} from './admin-bootstrap';

describe('admin-bootstrap', () => {
  const validEnv = {
    enableAdminBootstrap: 'true',
    email: 'admin@taller.com',
    password: 'SecurePass123',
    fullName: 'Workshop Admin',
  };

  describe('shouldRunAdminBootstrap', () => {
    it('should return true only when flag is exactly true', () => {
      expect(shouldRunAdminBootstrap('true')).toBe(true);
      expect(shouldRunAdminBootstrap('false')).toBe(false);
      expect(shouldRunAdminBootstrap(undefined)).toBe(false);
    });
  });

  describe('validateAdminBootstrapEnv', () => {
    it('should return normalized credentials when valid', () => {
      expect(validateAdminBootstrapEnv(validEnv)).toEqual({
        email: 'admin@taller.com',
        password: 'SecurePass123',
        fullName: 'Workshop Admin',
      });
    });

    it('should normalize email to lowercase', () => {
      expect(
        validateAdminBootstrapEnv({
          ...validEnv,
          email: 'Admin@Taller.COM',
        }).email,
      ).toBe('admin@taller.com');
    });

    it('should reject when bootstrap is not enabled', () => {
      expect(() =>
        validateAdminBootstrapEnv({
          ...validEnv,
          enableAdminBootstrap: undefined,
        }),
      ).toThrow(/ENABLE_ADMIN_BOOTSTRAP=true/);
    });

    it('should reject missing email', () => {
      expect(() =>
        validateAdminBootstrapEnv({
          ...validEnv,
          email: '  ',
        }),
      ).toThrow(/BOOTSTRAP_ADMIN_EMAIL/);
    });

    it('should reject short password without echoing it', () => {
      expect(() =>
        validateAdminBootstrapEnv({
          ...validEnv,
          password: 'short',
        }),
      ).toThrow(AdminBootstrapError);

      try {
        validateAdminBootstrapEnv({
          ...validEnv,
          password: 'short',
        });
      } catch (error) {
        expect((error as Error).message).not.toContain('short');
      }
    });

    it('should reject missing full name', () => {
      expect(() =>
        validateAdminBootstrapEnv({
          ...validEnv,
          fullName: '',
        }),
      ).toThrow(/BOOTSTRAP_ADMIN_NAME/);
    });
  });

  describe('assertUserTableEmpty', () => {
    it('should allow empty user table', () => {
      expect(() => assertUserTableEmpty(0)).not.toThrow();
    });

    it('should reject non-empty user table', () => {
      expect(() => assertUserTableEmpty(1)).toThrow(/not empty/);
    });
  });

  describe('assertNotProductionSeed', () => {
    it('should allow development seed', () => {
      expect(() => assertNotProductionSeed('development')).not.toThrow();
    });

    it('should reject production seed', () => {
      expect(() => assertNotProductionSeed('production')).toThrow(DevSeedError);
      expect(() => assertNotProductionSeed('production')).toThrow(
        /not allowed when NODE_ENV=production/,
      );
    });
  });

  describe('assertTestDatabaseName', () => {
    it('should allow a database name that contains test', () => {
      expect(() =>
        assertTestDatabaseName(
          'postgresql://user:secret@localhost:5435/mecatrack_test',
        ),
      ).not.toThrow();
    });

    it('should reject a database name that is not a test database', () => {
      expect(() =>
        assertTestDatabaseName(
          'postgresql://user:secret@localhost:5435/mecatrack_dev',
        ),
      ).toThrow(/database name containing "test"/);
    });

    it('should reject a missing database url without connecting', () => {
      expect(() => assertTestDatabaseName(undefined)).toThrow(
        /DATABASE_URL is required/,
      );
    });
  });
});
