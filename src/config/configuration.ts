export default () => ({
    redis: {
        host: process.env.REDIS_HOST,
        user: process.env.REDIS_USER,
        password: process.env.REDIS_PASSWORD,
    },
    jwt: {
        secret: process.env.JWT_SECRET,
        accessTokenExpire: process.env.JWT_ACCESS_EXPIRE || '15m',
        refreshTokenExpire: process.env.JWT_REFRESH_EXPIRE || '7d',
    },
    cors: {
        allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || '')
            .split(',')
            .filter(Boolean),
    },
    smtp: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
        from: process.env.SMTP_MAIL,
    },
    supabase: {
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    },
});