import { PaymentStatus, SupportPayment } from 'src/common/const';
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
import { ProductItem } from '../../product-items/entities/product-item.entity';

@Entity()
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  trade_no: string;

  @Column({ type: 'int', unsigned: true })
  buyer_id: number; // Collector ID

  @ManyToOne(() => Collector, (collector) => collector.orders)
  @JoinColumn({
    name: 'buyer_id',
  })
  buyer: Collector;

  @Column()
  product_item_id: string;

  @OneToOne(() => ProductItem, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'product_item_id',
  })
  product_item: ProductItem;

  @Column({ type: 'timestamp', width: 6, nullable: true })
  pay_timestamp: Date | null;

  // 支付完成的那个回调里自动设置
  @Column({ type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  gen_credit: string;

  @Column({
    type: 'enum',
    enum: SupportPayment,
    default: SupportPayment.WX,
  })
  pay_method: SupportPayment;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.UNPAID,
  })
  payment_status: PaymentStatus;

  @VersionColumn({ type: 'smallint', unsigned: true })
  version: number;

  @CreateDateColumn({ type: 'timestamp' })
  create_date: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  update_date: Date;

  @DeleteDateColumn({ type: 'timestamp' })
  delete_date: Date;
}
