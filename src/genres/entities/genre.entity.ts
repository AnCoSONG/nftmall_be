import { DateAndVersion } from 'src/common/enities';
import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';

// 藏品类别：一个藏品有多个类别，一个类别对应多个藏品
@Entity()
export class Genre {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column(() => DateAndVersion)
  genre: DateAndVersion;
}
