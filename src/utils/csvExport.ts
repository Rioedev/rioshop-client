export type CsvCell = string | number | boolean | null | undefined | Date;

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => CsvCell;
};

const toCsvCell = (value: CsvCell) => {
  if (value === null || value === undefined) {
    return "";
  }

  const text = value instanceof Date ? value.toISOString() : String(value);
  const normalized = text.replace(/\r?\n|\r/g, " ").trim();

  if (/[",;]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
};

export const buildCsv = <T>(columns: CsvColumn<T>[], rows: T[]) => {
  const header = columns.map((column) => toCsvCell(column.header)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => toCsvCell(column.value(row))).join(","),
  );

  return [header, ...body].join("\n");
};

export const downloadCsv = <T>(filename: string, columns: CsvColumn<T>[], rows: T[]) => {
  const csv = buildCsv(columns, rows);
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
};
