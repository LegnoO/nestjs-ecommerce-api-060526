import { TransformFnParams } from 'class-transformer/types/interfaces';

export function lowerCaseTransformer(params: TransformFnParams) {
  const value = params.value as unknown;

  if (typeof value === 'string') return value.toLowerCase().trim();

  return value;
}

export function upperCaseTransformer(params: TransformFnParams) {
  const value = params.value as unknown;

  if (typeof value === 'string') return value.toUpperCase().trim();

  return value;
}

export function trimTransformer(params: TransformFnParams) {
  const value = params.value as unknown;

  if (typeof value === 'string') return value.trim();

  return value;
}

export function emptyToUndefinedTransformer({ value }: { value: unknown }) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}
