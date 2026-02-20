export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '15m', // 15 minutes default
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // 7 days for refresh
};

export const bcryptConfig = {
  saltRounds: 12,
};
