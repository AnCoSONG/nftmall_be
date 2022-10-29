import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Collector } from '../../collectors/entities/collector.entity';
import { transferLaunchType, transferStatus } from '../../common/const';
import { ProductItem } from '../../product-items/entities/product-item.entity';

@Entity()
export class ProductItemTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  out_trade_id: string | null;

  @Column({ type: 'enum', enum: transferLaunchType, default: transferLaunchType.USER })
  launch_type: transferLaunchType;

  @Column({ type: 'int', unsigned: true })
  sender_id: number;

  @ManyToOne(() => Collector, (collector) => collector.send_transfers)
  @JoinColumn({
    name: 'sender_id'
  })
  sender: Collector;

  @Column({ type: 'int', unsigned: true })
  receiver_id: number;

  @ManyToOne(() => Collector, (collector) => collector.receive_transfers)
  @JoinColumn({
    name: 'receiver_id'
  })
  receiver: Collector;

  @Column({ type: 'varchar', length: 255 })
  nft_id: string;

  @Column({ type: 'varchar', length: 255 })
  nft_class_id: string;

  @Column()
  original_product_item_id: string;

  @OneToOne(() => ProductItem)
  @JoinColumn({
    name: 'original_product_item_id'
  })
  original_product_item: string;

  @Column({ nullable: true })
  target_product_item_id: string | null;

  @OneToOne(() => ProductItem)
  @JoinColumn({
    name: 'target_product_item_id'
  })
  target_product_item: ProductItem;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  operation_id: string | null;

  @Column({ type: 'enum', enum: transferStatus, default: transferStatus.PENDING })
  status: transferStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  tx_hash: string | null;

  @Column({ type: 'timestamp', nullable: true })
  tx_success_time: Date | null;

  @VersionColumn({ type: 'smallint', unsigned: true })
  version: number;

  @CreateDateColumn({ type: 'timestamp' })
  create_date: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  update_date: Date;

  @DeleteDateColumn({ type: 'timestamp' })
  delete_date: Date;
}
