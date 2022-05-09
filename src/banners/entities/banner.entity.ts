import { DateAndVersion } from 'src/common/enities';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Banner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  src: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  link: string;

  @Column(() => DateAndVersion)
  meta: DateAndVersion;
}
