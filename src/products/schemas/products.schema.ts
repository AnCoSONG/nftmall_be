import * as Joi from 'joi';
export const CreateProductSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  preview_img: Joi.string().required(),
  src: Joi.string().required(),
  type: Joi.string()
    .valid('image', 'hybrid', '3d', 'audio', 'video')
    .required(),
  price: Joi.number().required(),
  tags: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        mode: Joi.string().valid('light', 'dark').required(),
      }),
    )
    .required(),
  details: Joi.string().required(),
  publish_count: Joi.number().required(),
  stock_count: Joi.number().required(),
  limit: Joi.number().required(),
  publisher_id: Joi.number().required(),
  genres: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
      }),
    )
    .allow(null),
});
