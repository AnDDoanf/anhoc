export function validateEnv() {
  const configuredBackendUrl =
    process.env.BACKEND_URL?.trim() ||
    process.env.INTERNAL_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();

  const errors: string[] = [];

  if (!configuredBackendUrl) {
    errors.push(
      'At least one backend URL configuration (BACKEND_URL, INTERNAL_API_URL, or NEXT_PUBLIC_API_URL) is required for frontend-backend communication.'
    );
  }

  if (errors.length > 0) {
    console.error('❌ Configuration error: Frontend environment validation failed!');
    errors.forEach((err) => console.error(`   - ${err}`));
    
    // In production node server startup or build, we exit the process to fail early
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

validateEnv();
