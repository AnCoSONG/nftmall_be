import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { CollectorRole } from '../../common/const';
import { Order } from '../../orders/entities/order.entity';
import { ProductItem } from '../../product-items/entities/product-item.entity';

@Entity()
export class Collector {
  @PrimaryGeneratedColumn('increment', { type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  initial_username: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bsn_address: string | null; // bsn_address is going to be set after create, this should be async

  @Column({ type: 'char', length: 11, unique: true })
  phone: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string | null;

  @Column({type: 'varchar', length: 255, nullable: true})
  delivery_address: string | null;

  @Column({ type: 'varchar', length: 255 })
  avatar: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  real_name: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  real_id: string | null;

  @Column({ type: 'int', default: 0 })
  credit: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  wx_openid: string | null;

  @Column({ type: 'enum', enum: CollectorRole, default: CollectorRole.normal })
  role: CollectorRole;

  @OneToMany(() => Order, (order) => order.buyer, {
    cascade: true,
  })
  orders: Order[];

  @OneToMany(() => ProductItem, (product_item) => product_item.owner, {
    cascade: true,
  })
  collections: ProductItem[];

  @VersionColumn({ type: 'smallint', unsigned: true })
  version: number;

  @CreateDateColumn({ type: 'timestamp' })
  create_date: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  update_date: Date;

  @DeleteDateColumn({ type: 'timestamp' })
  delete_date: Date;
}
