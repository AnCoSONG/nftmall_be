import { DateAndVersion } from 'src/common/enities';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// 藏品类别：一个藏品有多个类别，一个类别对应多个藏品
@Entity()
export class Genre {
  @PrimaryGeneratedColumn()
  id: number;

  // automatically unique when create and update
  @Column({ length: 20 })
  name: string;

  @Column(() => DateAndVersion)
  meta: DateAndVersion;
}
