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
import { Collector } from '../../collectors/entities/collector.entity';
import { onChainStatus } from '../../common/const';

@Entity()
export class ProductItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
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

  @Column({ type: 'int', unsigned: true, nullable: true, default: null })
  owner_id: number | null;

  @ManyToOne(() => Collector, (collector) => collector.collections, {
    onDelete: 'NO ACTION',
  })
  @JoinColumn({
    name: 'owner_id',
  })
  owner: Collector;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nft_id: string | null; // 链上ID 上链后才有 前端先 根据订单支付时间来判断是否已支付，根据nft_id来判断是否已上链

  @Column({ type: 'varchar', length: 255, nullable: true })
  nft_class_id: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  operation_id: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true }) //交易哈希
  tx_hash: string | null;

  @Column({ type: 'enum', enum: onChainStatus, default: onChainStatus.PENDING })
  on_chain_status: onChainStatus;

  @Column({ type: 'timestamp', width: 6, nullable: true })
  on_chain_timestamp: Date | null;

  @VersionColumn({ type: 'smallint', unsigned: true })
  version: number;

  @CreateDateColumn({ type: 'timestamp' })
  create_date: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  update_date: Date;

  @DeleteDateColumn({ type: 'timestamp' })
  delete_date: Date;
}
