import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DateAndVersion } from '../../common/enities';
import { Product } from '../../products/entities/product.entity';

@Entity()
export class Publisher {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @OneToMany(() => Product, (product) => product.publisher, {
    cascade: true, // 在oneToMany开启级联，添加Product时会自动向Product表里添加记录
  })
  works: Product[];

  @Column(() => DateAndVersion)
  meta: DateAndVersion;
}
