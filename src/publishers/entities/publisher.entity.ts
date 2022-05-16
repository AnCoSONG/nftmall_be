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
import { Product } from '../../products/entities/product.entity';

@Entity()
export class Publisher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  avatar: string;

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

  @OneToMany(() => Product, (product) => product.publisher, {
    cascade: true, // 在oneToMany开启级联，添加Product时会自动向Product表里添加记录
  })
  works: Product[];
}
