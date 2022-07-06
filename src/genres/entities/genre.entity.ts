import { DateAndVersion } from 'src/common/enities';
import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from '../../products/entities/product.entity';

// 藏品类别：一个藏品有多个类别，一个类别对应多个藏品
@Entity()
export class Genre {
  @PrimaryGeneratedColumn()
  id: number;

  // automatically unique when create and update
  @Column({ length: 20, unique: true })
  name: string;

  @ManyToMany(() => Product, (product) => product.genres, {
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  products: Product[];

  @Column(() => DateAndVersion)
  meta: DateAndVersion;
}
