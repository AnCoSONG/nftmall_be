import { DateAndVersion } from 'src/common/enities';
import { Column, PrimaryGeneratedColumn } from 'typeorm';

export class Notice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  text: string;

  @Column(() => DateAndVersion)
  meta: DateAndVersion;
}
