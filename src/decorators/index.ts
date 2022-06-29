import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { decode } from 'jsonwebtoken';

export const Role = (role: string) => SetMetadata('role', role);

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export const RequestLogger = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    return request.log;
  },
);

export const CollectorId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    const decoded = decode(request.cookies['__xc__']) as { id: string };
    return decoded.id;
  },
);
