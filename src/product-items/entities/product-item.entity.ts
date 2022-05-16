import { Product } from 'src/products/entities/product.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity()
export class ProductItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'smallint' })
  no: number;

  @Column({ type: 'int' })
  product_id: number;

  @ManyToOne(() => Product, (product) => product.items, {
    onDelete: 'CASCADE', //! when product is deleted, the product item of the product is deleted too.
  })
  @JoinColumn({
    name: 'product_id',
  })
  product: Product;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bsn_address: string | null;

  @VersionColumn({ type: 'smallint', unsigned: true })
  version: number;

  @CreateDateColumn({ type: 'timestamp' })
  create_date: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  update_date: Date;

  @DeleteDateColumn({ type: 'timestamp' })
  delete_date: Date;
}
