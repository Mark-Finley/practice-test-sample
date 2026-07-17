import { IsNotEmpty, IsUUID, IsArray, IsInt, Min, IsBoolean } from 'class-validator';

export class SaveAnswerDto {
  @IsUUID('4', { message: 'A valid question ID is required.' })
  @IsNotEmpty({ message: 'Question ID is required.' })
  questionId!: string;

  @IsArray({ message: 'Option IDs must be an array.' })
  @IsUUID('4', { each: true, message: 'Each option ID must be a valid UUID.' })
  optionIds!: string[];

  @IsInt({ message: 'Time spent must be an integer.' })
  @Min(0, { message: 'Time spent cannot be negative.' })
  timeSpentSeconds!: number;

  @IsBoolean({ message: 'Flag status must be a boolean.' })
  isFlagged!: boolean;
}
