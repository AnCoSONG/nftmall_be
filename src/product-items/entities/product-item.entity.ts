import { DateAndVersion } from 'src/common/enities';
import { Product } from 'src/products/entities/product.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ProductItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'smallint' })
  no: number;

  @ManyToOne(() => Product, (product) => product.items, {
    onDelete: 'CASCADE', //! when product is deleted, the product item of the product is deleted too.
  })
  product: Product;

  @Column({ type: 'varchar', length: 100 })
  bsn_address: string;

  @Column(() => DateAndVersion)
  meta: DateAndVersion;
}
