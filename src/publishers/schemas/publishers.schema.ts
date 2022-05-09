import * as Joi from 'joi';
export const CreatePublisherSchema = Joi.object({
  name: Joi.string().required(),
});

export const UpdatePublisherSchema = Joi.object({
  name: Joi.string(),
});
