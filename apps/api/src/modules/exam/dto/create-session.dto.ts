import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateSessionDto {
  @IsUUID('4', { message: 'A valid exam template ID is required.' })
  @IsNotEmpty({ message: 'Exam template ID is required.' })
  templateId!: string;
}
