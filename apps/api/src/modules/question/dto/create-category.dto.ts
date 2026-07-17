import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'Category name is required.' })
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;
}
