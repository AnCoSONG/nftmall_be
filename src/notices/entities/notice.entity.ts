import { DateAndVersion } from 'src/common/enities';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Notice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  text: string;

  @Column(() => DateAndVersion)
  meta: DateAndVersion;
}
