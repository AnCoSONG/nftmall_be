import * as Joi from 'joi';
import { DisplayMode } from 'src/common/const';
export const CreateTagSchema = Joi.object({
  name: Joi.string().required(),
  mode: Joi.string()
    .valid(...Object.values(DisplayMode))
    .required(),
});

export const UpdateTagSchema = Joi.object({
  name: Joi.string(),
  mode: Joi.string().valid(...Object.values(DisplayMode)),
});
