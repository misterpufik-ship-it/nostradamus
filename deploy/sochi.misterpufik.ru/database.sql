CREATE TABLE IF NOT EXISTS work_records (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  work_date DATE NOT NULL,
  employee VARCHAR(255) NOT NULL,
  arrival_time VARCHAR(40) NOT NULL,
  arrival_label VARCHAR(500) NOT NULL,
  arrival_latitude DECIMAL(10, 7) NULL,
  arrival_longitude DECIMAL(10, 7) NULL,
  leave_time VARCHAR(40) NULL,
  leave_label VARCHAR(500) NULL,
  leave_latitude DECIMAL(10, 7) NULL,
  leave_longitude DECIMAL(10, 7) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_work_records_date (work_date),
  INDEX idx_work_records_open (employee, work_date, leave_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
