import { SupportPayment } from 'src/common/const';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  buyer_id: number; // Collector ID

  @Column()
  product_id: number; // Product ID

  @Column({ nullable: true })
  product_item_id: string | null; // Product Item ID;

  @Column({ type: 'timestamp', width: 6, nullable: true })
  pay_timestamp: Date;

  @Column({ type: 'float', precision: 10, scale: 2 })
  gen_credit: number;

  @Column({
    type: 'enum',
    enum: SupportPayment,
    default: SupportPayment.WX,
  })
  pay_method: SupportPayment;

  @VersionColumn({ type: 'smallint', unsigned: true })
  version: number;

  @CreateDateColumn({ type: 'timestamp' })
  create_date: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  update_date: Date;

  @DeleteDateColumn({ type: 'timestamp' })
  delete_date: Date;
}
