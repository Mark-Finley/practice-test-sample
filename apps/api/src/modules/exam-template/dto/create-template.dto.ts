import { IsNotEmpty, IsString, IsInt, IsUUID, Min, Max, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class CategoryWeightDto {
  @IsUUID('4', { message: 'Valid category ID is required.' })
  categoryId!: string;

  @IsInt({ message: 'Question count must be an integer.' })
  @Min(0, { message: 'Question count cannot be negative.' })
  questionCount!: number;
}

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty({ message: 'Exam template name is required.' })
  name!: string;

  @IsUUID('4', { message: 'Valid question bank ID is required.' })
  bankId!: string;

  @IsInt({ message: 'Total questions must be an integer.' })
  @Min(1, { message: 'An exam must have at least 1 question.' })
  totalQuestions!: number;

  @IsInt({ message: 'Duration must be an integer.' })
  @Min(1, { message: 'Exam duration must be at least 1 minute.' })
  duration!: number;

  @IsInt({ message: 'Passing score must be an integer.' })
  @Min(1, { message: 'Passing score must be at least 1%.' })
  @Max(100, { message: 'Passing score cannot exceed 100%.' })
  passingScore!: number;

  @ValidateNested({ each: true })
  @Type(() => CategoryWeightDto)
  @ArrayMinSize(1, { message: 'At least one category weight allocation is required.' })
  categoryWeights!: CategoryWeightDto[];
}
