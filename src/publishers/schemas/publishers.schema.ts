import * as Joi from 'joi';
import { CreateProductSchema } from '../../products/schemas/products.schema';
export const CreatePublisherSchema = Joi.object({
  name: Joi.string().required(),
  avatar: Joi.string().required(),
  works: Joi.array().length(0).allow(null),
});

export const UpdatePublisherSchema = Joi.object({
  name: Joi.string(),
  avatar: Joi.string(),
  works: Joi.forbidden(),
});

export const PublishProductSchema = CreateProductSchema.keys({
  publisher: Joi.forbidden(),
  publisher_id: Joi.forbidden(),
});
