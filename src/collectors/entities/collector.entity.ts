import { DateAndVersion } from 'src/common/enities';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Collector {
  @PrimaryGeneratedColumn('increment', { type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 10 })
  username: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bsn_address: string | null; // bsn_address is going to be set after create, this should be async

  @Column({ type: 'char', length: 11, unique: true })
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

  @Column(() => DateAndVersion)
  meta: DateAndVersion;
}
