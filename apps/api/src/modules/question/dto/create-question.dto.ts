import { IsNotEmpty, IsString, IsOptional, IsEnum, IsUUID, ValidateNested, ArrayMinSize, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class QuestionOptionDto {
  @IsString()
  @IsNotEmpty({ message: 'Option text is required.' })
  text!: string;

  @IsBoolean()
  isCorrect!: boolean;
}

export class CreateQuestionDto {
  @IsUUID('4', { message: 'Valid question bank ID is required.' })
  bankId!: string;

  @IsUUID('4', { message: 'Valid question category ID is required.' })
  categoryId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Question text is required.' })
  text!: string;

  @IsString()
  @IsOptional()
  explanation?: string;

  @IsEnum(['EASY', 'MEDIUM', 'HARD'], { message: 'Difficulty must be EASY, MEDIUM, or HARD.' })
  difficulty!: string;

  @IsEnum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE'], { message: 'Type must be SINGLE_CHOICE or MULTIPLE_CHOICE.' })
  type!: string;

  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  @ArrayMinSize(2, { message: 'A question must have at least 2 options.' })
  options!: QuestionOptionDto[];
}
