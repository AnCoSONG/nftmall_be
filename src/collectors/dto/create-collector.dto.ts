export class CreateCollectorDto {
  id: number;
  username: string;
  bsn_address: string;
  phone: string;
  email: string | null;
  avatar: string;
  real_name: string | null;
  real_id: string | null;
  credit: number;
  createdDate: Date;
  updatedDate: Date;
  version: number;
}
