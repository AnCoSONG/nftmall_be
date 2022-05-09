import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DisplayMode } from '../../common/const';
import { DateAndVersion } from '../../common/enities';

@Entity()
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  name: string;

  @Column({
    type: 'enum',
    enum: DisplayMode,
    default: DisplayMode.LIGHT,
  })
  mode: DisplayMode;

  @Column(() => DateAndVersion)
  meta: DateAndVersion;
}
