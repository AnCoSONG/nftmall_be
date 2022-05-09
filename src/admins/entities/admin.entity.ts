import { Column, PrimaryGeneratedColumn } from 'typeorm';
import { DateAndVersion } from '../../common/enities';

export enum Role {
  ADMIN = 'admin',
  ANALYZER = 'analyzer',
}
export class Admin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  password: string;

  @Column({ length: 255 })
  avatar: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.ADMIN,
  })
  role: Role;

  @Column(() => DateAndVersion)
  meta: DateAndVersion;
}
