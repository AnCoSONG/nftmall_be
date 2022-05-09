import { RedisException, SqlException } from '../exceptions';
// wrapper every sql
export const sqlExceptionCatcher = async (cb: Promise<any>) => {
  // catch except or return original value
  try {
    return await cb;
  } catch (e) {
    throw new SqlException(e.message);
  }
};

export const redisExceptionCatcher = async (cb: Promise<any>) => {
  // catch except or return original value
  try {
    return await cb;
  } catch (e) {
    throw new RedisException(e.message);
  }
}
