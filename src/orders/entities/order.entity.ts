import { SupportPayment } from 'src/common/const';
import { DateAndVersion } from 'src/common/enities';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  buyer_id: number; // Collector ID

  @Column()
  purchase_id: number; // ProductItem ID

  @Column({ type: 'timestamp', nullable: true })
  pay_date: Date;

  @Column({ type: 'float', precision: 10, scale: 2 })
  gen_credit: number;

  @Column({
    type: 'enum',
    enum: SupportPayment,
    default: SupportPayment.WX,
  })
  pay_method: SupportPayment;

  @Column(() => DateAndVersion)
  meta: DateAndVersion;
}
