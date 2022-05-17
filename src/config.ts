export default () => {
  return {
    database: {
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT,
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_DB,
      sync: process.env.DATABASE_SYNC == 'true',
    },
    redis: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
    },
    jwt: {
      access_secret: process.env.JWT_ACCESS_SECRET,
      access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
      access_algorithm: process.env.JWT_ACCESS_ALGORITHM,
      refresh_secret: process.env.JWT_REFRESH_SECRET,
      refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,
      refresh_algorithm: process.env.JWT_REFRESH_ALGORITHM,
    },
    smscode: {
      expires_in: process.env.SMSCODE_EXPIRES_IN,
    },
    bsn: {
      api_key: process.env.BSN_API_KEY,
      api_secret: process.env.BSN_API_SECRET,
      api_url: process.env.BSN_API_URL,
    },
    idcheck: {
      api_code: process.env.IDCHECK_API_CODE,
      api_url: process.env.IDCHECK_API_URL,
    },
  };
};
