import * as Joi from 'joi';
export const CreateNoticeSchema = Joi.object({
  text: Joi.string().required(),
});

export const UpdateNoticeSchema = Joi.object({
  text: Joi.string(),
});
