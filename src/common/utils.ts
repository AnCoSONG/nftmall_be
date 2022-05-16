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
};

// 生成订单token，返回给客户端，支付订单必须携带。
export const getIdepmotentValue = () => {
  return (
    Math.random().toString(36).substr(2, 10) +
    Math.random().toString(36).substr(2, 10)
  );
};
