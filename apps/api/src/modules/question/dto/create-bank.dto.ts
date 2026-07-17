import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateBankDto {
  @IsString()
  @IsNotEmpty({ message: 'Question bank name is required.' })
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;
}
