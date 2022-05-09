import * as Joi from 'joi';
export const CreateGenreSchema = Joi.object({
  name: Joi.string().required(),
});

export const UpdateGenreSchema = Joi.object({
  name: Joi.string(),
});
