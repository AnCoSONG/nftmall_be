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
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'smallint' })
  no: number; // 0 - 999 or 0 - 1999

  @Column({ type: 'varchar', length: 255 })
  product_id: string;

  @ManyToOne(() => Product, (product) => product.items, {
    onDelete: 'CASCADE', //! when product is deleted, the product item of the product is deleted too.
    orphanedRowAction: 'delete',
  })
  @JoinColumn({
    name: 'product_id',
  })
  product: Product;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nft_id: string | null; // 链上ID 上链后才有 前端先 根据订单支付时间来判断是否已支付，根据nft_id来判断是否已上链

  @VersionColumn({ type: 'smallint', unsigned: true })
  version: number;

  @CreateDateColumn({ type: 'timestamp' })
  create_date: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  update_date: Date;

  @DeleteDateColumn({ type: 'timestamp' })
  delete_date: Date;
}
