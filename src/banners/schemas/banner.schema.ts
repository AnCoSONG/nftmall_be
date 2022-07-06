import * as Joi from 'joi';
export const CreateBannerSchema = Joi.object({
  src: Joi.string().required(),
  link: Joi.string().allow(null),
});

export const UpdateBannerSchema = Joi.object({
  src: Joi.string(),
  link: Joi.string().allow(null),
});
