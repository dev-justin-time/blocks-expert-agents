// csv-loader.ts - Lightweight CSV parser for built-in knowledge bases
export interface CSVRow {
  [key: string]: string;
}

export function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row: CSVRow = {};
    // Simple CSV parsing - handle quoted fields
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      headers.forEach((h, idx) => row[h] = values[idx] || '');
      rows.push(row);
    }
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function loadCSVFromFile(filePath: string): CSVRow[] {
  try {
    const fs = require('fs');
    const content = fs.readFileSync(filePath, 'utf-8');
    return parseCSV(content);
  } catch (e) {
    console.error(`Failed to load CSV ${filePath}:`, e);
    return [];
  }
}

export function loadCSVFromString(csvContent: string): CSVRow[] {
  return parseCSV(csvContent);
}
