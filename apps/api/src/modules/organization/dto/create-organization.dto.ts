import { IsNotEmpty, IsString, IsOptional, IsUrl } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty({ message: 'Organization name is required.' })
  name!: string;

  @IsUrl({}, { message: 'Logo URL must be a valid URL address.' })
  @IsOptional()
  logoUrl?: string;
}
