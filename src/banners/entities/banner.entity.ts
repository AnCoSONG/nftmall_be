import { PrimaryGeneratedColumn } from 'typeorm';

export class Banner {
  @PrimaryGeneratedColumn()
  id: number;
}
