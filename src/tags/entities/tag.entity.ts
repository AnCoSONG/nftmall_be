import { DateAndVersion } from 'src/common/enities';
import { Column, PrimaryGeneratedColumn } from 'typeorm';

enum DisplayMode {
  LIGHT = 'light',
  DARK = 'dark',
}
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: number;

  @Column({
    type: 'enum',
    enum: DisplayMode,
    default: DisplayMode.LIGHT,
  })
  mode: DisplayMode;

  @Column(() => DateAndVersion)
  tag: DateAndVersion;
}
