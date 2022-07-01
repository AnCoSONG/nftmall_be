import * as Joi from 'joi';
export const CreateCollectorSchema = Joi.object({
  username: Joi.string()
    .pattern(/^[a-zA-Z0-9\u4e00-\u9fa5]+$/)
    .required(),
  phone: Joi.string().length(11).required(),
  email: Joi.string().allow(null),
  avatar: Joi.string().required(),
});

export const UpdateCollectorSchema = Joi.object({
  username: Joi.string().pattern(/^[a-zA-Z0-9\u4e00-\u9fa5]+$/),
  phone: Joi.string().length(11),
  email: Joi.string().allow(null),
  avatar: Joi.string(),
  real_name: Joi.string(),
  real_id: Joi.string(),
  credit: Joi.number(),
  bsn_address: Joi.string(),
  delivery_address: Joi.string(),
  wx_openid: Joi.string()
});
