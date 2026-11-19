import { Transform } from 'class-transformer';
import {
  IsByteLength,
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

function wellFormedString(value: unknown) {
  // Reject lone UTF-16 surrogates before validator.js tries to encode them.
  if (
    typeof value === 'string' &&
    Buffer.from(value, 'utf8').toString('utf8') === value
  ) {
    return value;
  }
}

export class CredentialsDto {
  @Transform(({ value }: { value: unknown }) =>
    wellFormedString(value)?.trim().toLowerCase(),
  )
  @IsEmail()
  @MaxLength(254)
  email: string;

  @Transform(({ value }: { value: unknown }) => wellFormedString(value))
  @IsString()
  @MinLength(6)
  // bcrypt truncates inputs beyond 72 UTF-8 bytes.
  @IsByteLength(6, 72)
  password: string;
}
