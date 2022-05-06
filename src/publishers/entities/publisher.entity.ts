import { DateAndVersion } from 'src/common/enities';
import { Product } from 'src/products/entities/product.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Publisher {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => Product, (product) => product.publisher, {
    cascade: true, // 在oneToMany开启级联，添加Product时会自动向Product表里添加记录
  })
  works: Product[];

  @Column(() => DateAndVersion)
  pub: DateAndVersion;
}
