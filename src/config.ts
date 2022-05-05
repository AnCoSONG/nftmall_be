export default () => {
  // console.log(process.env.DATABASE_SYNC);
  return {
    database: {
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT,
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_DB,
      sync: process.env.DATABASE_SYNC == 'true',
    },
  };
};
