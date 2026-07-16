import { IsEmail, IsNotEmpty, MinLength, IsString } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @IsNotEmpty({ message: 'Email address is required.' })
  email!: string;

  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required.' })
  firstName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required.' })
  lastName!: string;
}
