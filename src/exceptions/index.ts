import { HttpException, HttpStatus } from '@nestjs/common';

// useful
export class requestKeyErrorException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}
