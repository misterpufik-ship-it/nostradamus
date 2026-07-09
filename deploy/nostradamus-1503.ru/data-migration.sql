-- Импорт существующих локальных отметок из SQLite в MySQL.
-- Сначала импортируйте database.sql, затем этот файл.
SET NAMES utf8mb4;

INSERT INTO work_records (id, work_date, employee, arrival_time, arrival_label, arrival_latitude, arrival_longitude, leave_time, leave_label, leave_latitude, leave_longitude) VALUES ('646465b5-68e1-4198-8001-9cd04dbea173', '2026-05-28', 'Анастасия', '2026-05-28T10:31:43.722Z', 'Петровский проспект, 22 к2 с1', 59.960292, 30.263176, '2026-05-28T10:32:07.256Z', 'Петровский проспект, 22 к2 с1', 59.960292, 30.263176) ON DUPLICATE KEY UPDATE work_date = VALUES(work_date), employee = VALUES(employee), arrival_time = VALUES(arrival_time), arrival_label = VALUES(arrival_label), arrival_latitude = VALUES(arrival_latitude), arrival_longitude = VALUES(arrival_longitude), leave_time = VALUES(leave_time), leave_label = VALUES(leave_label), leave_latitude = VALUES(leave_latitude), leave_longitude = VALUES(leave_longitude);
