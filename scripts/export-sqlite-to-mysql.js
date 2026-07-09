const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const root = path.join(__dirname, "..");
const dbPath = path.join(root, "data", "x-active.sqlite");
const outputPath = path.join(root, "deploy", "nostradamus-1503.ru", "data-migration.sql");

function sqlString(value) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  return `'${String(value).replaceAll("\\", "\\\\").replaceAll("'", "''")}'`;
}

function sqlNumber(value) {
  return value === null || value === undefined ? "NULL" : String(value);
}

if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(outputPath, "-- Локальная база data/x-active.sqlite не найдена.\n", "utf8");
  console.log(outputPath);
  process.exit(0);
}

const db = new DatabaseSync(dbPath);
const rows = db
  .prepare(
    `SELECT
      id,
      date,
      employee,
      arrival_time,
      arrival_label,
      arrival_latitude,
      arrival_longitude,
      leave_time,
      leave_label,
      leave_latitude,
      leave_longitude
    FROM work_records
    ORDER BY arrival_time`,
  )
  .all();

const lines = [
  "-- Импорт существующих локальных отметок из SQLite в MySQL.",
  "-- Сначала импортируйте database.sql, затем этот файл.",
  "SET NAMES utf8mb4;",
  "",
];

if (!rows.length) {
  lines.push("-- В локальной базе пока нет записей для переноса.");
} else {
  for (const row of rows) {
    lines.push(
      `INSERT INTO work_records (` +
        `id, work_date, employee, arrival_time, arrival_label, arrival_latitude, arrival_longitude, ` +
        `leave_time, leave_label, leave_latitude, leave_longitude` +
        `) VALUES (` +
        [
          sqlString(row.id),
          sqlString(row.date),
          sqlString(row.employee),
          sqlString(row.arrival_time),
          sqlString(row.arrival_label),
          sqlNumber(row.arrival_latitude),
          sqlNumber(row.arrival_longitude),
          sqlString(row.leave_time),
          sqlString(row.leave_label),
          sqlNumber(row.leave_latitude),
          sqlNumber(row.leave_longitude),
        ].join(", ") +
        `) ON DUPLICATE KEY UPDATE ` +
        `work_date = VALUES(work_date), ` +
        `employee = VALUES(employee), ` +
        `arrival_time = VALUES(arrival_time), ` +
        `arrival_label = VALUES(arrival_label), ` +
        `arrival_latitude = VALUES(arrival_latitude), ` +
        `arrival_longitude = VALUES(arrival_longitude), ` +
        `leave_time = VALUES(leave_time), ` +
        `leave_label = VALUES(leave_label), ` +
        `leave_latitude = VALUES(leave_latitude), ` +
        `leave_longitude = VALUES(leave_longitude);`,
    );
  }
}

fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(outputPath);
