export function isValidCSVFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  return fileName.endsWith('.csv');
}

export function isValidCSVFileName(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.csv');
}
