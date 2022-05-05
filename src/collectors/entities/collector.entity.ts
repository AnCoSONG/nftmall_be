import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity()
export class Collector {
  @PrimaryGeneratedColumn('increment', { type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 10 })
  username: string;

  @Column({ type: 'varchar', length: 100 })
  bsn_address: string;

  @Column({ type: 'char', length: 11 })
  phone: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 255 })
  avatar: string;

  @Column({ type: 'varchar', length: 12, nullable: true })
  real_name: string | null;

  @Column({ type: 'varchar', length: 18, nullable: true })
  real_id: string | null;

  @Column({ type: 'float', default: 0.0, precision: 10, scale: 2 })
  credit: number;

  @CreateDateColumn()
  created_date: Date;

  @UpdateDateColumn()
  updated_date: Date;

  @VersionColumn()
  version: number;
}
