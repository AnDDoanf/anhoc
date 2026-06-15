import 'dotenv/config';

export function validateEnv() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const databaseUrl = process.env.DATABASE_URL;
  const jwtSecret = process.env.JWT_SECRET;
  const port = process.env.SERVER_PORT || process.env.PORT || '5001';

  const errors: string[] = [];

  if (!databaseUrl) {
    errors.push('DATABASE_URL environment variable is required.');
  }

  if (!jwtSecret) {
    errors.push('JWT_SECRET environment variable is required.');
  } else if (nodeEnv === 'production' && jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters in production environments for proper security.');
  }

  if (port && isNaN(Number(port))) {
    errors.push(`Invalid PORT/SERVER_PORT value: "${port}". Port must be a number.`);
  }

  if (errors.length > 0) {
    console.error('❌ Configuration error: Environment validation failed!');
    errors.forEach((err) => console.error(`   - ${err}`));
    process.exit(1);
  }
}

// Execute immediately when imported
validateEnv();
