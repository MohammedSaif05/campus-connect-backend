import { parse } from 'csv-parse/sync';

export interface CsvValidationError {
  row: number;
  field: string;
  message: string;
}

export interface CsvParseResult<T> {
  data: T[];
  errors: CsvValidationError[];
}

/**
 * Parses a CSV buffer into an array of records.
 * Returns parsed data and any validation errors found.
 *
 * @param buffer - The file buffer (from multer)
 * @param requiredFields - Fields that must be present and non-empty
 */
export function parseCsv<T>(
  buffer: Buffer,
  requiredFields: string[],
): CsvParseResult<T> {
  const records = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as T[];

  const errors: CsvValidationError[] = [];

  records.forEach((record, index) => {
    const rowNumber = index + 2; // +2 for header row + 1-indexed

    for (const field of requiredFields) {
      const value = (record as any)[field];
      if (value === undefined || value === null || String(value).trim() === '') {
        errors.push({
          row: rowNumber,
          field,
          message: `Missing required field "${field}"`,
        });
      }
    }
  });

  return { data: records, errors };
}

/**
 * Checks for duplicate values within a column of parsed CSV data.
 */
export function findDuplicates<T>(
  data: T[],
  field: string,
): CsvValidationError[] {
  const errors: CsvValidationError[] = [];
  const seen = new Set<string>();

  data.forEach((record, index) => {
    const rawValue = (record as any)[field];
    const value = rawValue ? String(rawValue).toLowerCase() : undefined;
    if (value && seen.has(value)) {
      errors.push({
        row: index + 2,
        field,
        message: `Duplicate value "${String((record as any)[field])}" for field "${field}"`,
      });
    }
    if (value) {
      seen.add(value);
    }
  });

  return errors;
}
