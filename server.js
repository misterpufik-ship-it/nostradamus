const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const port = Number(process.env.PORT) || 8001;
const root = __dirname;
const dataDir = path.join(root, "data");
const dbPath = path.join(dataDir, "x-active.sqlite");

fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS work_records (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    employee TEXT NOT NULL,
    arrival_time TEXT NOT NULL,
    arrival_label TEXT NOT NULL,
    arrival_latitude REAL,
    arrival_longitude REAL,
    leave_time TEXT,
    leave_label TEXT,
    leave_latitude REAL,
    leave_longitude REAL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1_000_000) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function mapRecord(row) {
  return {
    id: row.id,
    date: row.date,
    employee: row.employee,
    arrivalTime: row.arrival_time,
    arrivalGeo: {
      label: row.arrival_label,
      latitude: row.arrival_latitude,
      longitude: row.arrival_longitude,
    },
    leaveTime: row.leave_time,
    leaveGeo: row.leave_time
      ? {
          label: row.leave_label,
          latitude: row.leave_latitude,
          longitude: row.leave_longitude,
        }
      : null,
  };
}

function getRecords(date) {
  const query = date
    ? db.prepare("SELECT * FROM work_records WHERE date = ? ORDER BY arrival_time")
    : db.prepare("SELECT * FROM work_records ORDER BY arrival_time DESC");
  const rows = date ? query.all(date) : query.all();
  return rows.map(mapRecord);
}

function findOpenRecord(employee, date) {
  return db
    .prepare(
      "SELECT * FROM work_records WHERE employee = ? AND date = ? AND leave_time IS NULL ORDER BY arrival_time DESC LIMIT 1",
    )
    .get(employee, date);
}

async function handleApi(req, res, requestedUrl) {
  try {
    if (req.method === "GET" && requestedUrl.pathname === "/api/records") {
      sendJson(res, 200, { records: getRecords(requestedUrl.searchParams.get("date")) });
      return true;
    }

    if (req.method === "POST" && requestedUrl.pathname === "/api/arrival") {
      const payload = await readJson(req);

      if (findOpenRecord(payload.employee, payload.date)) {
        sendJson(res, 409, { error: "Приход уже отмечен. Сначала отметьте уход." });
        return true;
      }

      db.prepare(
        `INSERT INTO work_records (
          id, date, employee, arrival_time, arrival_label, arrival_latitude, arrival_longitude
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        payload.id,
        payload.date,
        payload.employee,
        payload.arrivalTime,
        payload.arrivalGeo.label,
        payload.arrivalGeo.latitude,
        payload.arrivalGeo.longitude,
      );

      sendJson(res, 201, { records: getRecords(payload.date) });
      return true;
    }

    if (req.method === "POST" && requestedUrl.pathname === "/api/leave") {
      const payload = await readJson(req);
      const record = findOpenRecord(payload.employee, payload.date);

      if (!record) {
        sendJson(res, 404, { error: "Нет открытого прихода за сегодня для этого сотрудника." });
        return true;
      }

      db.prepare(
        `UPDATE work_records
          SET leave_time = ?, leave_label = ?, leave_latitude = ?, leave_longitude = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
      ).run(
        payload.leaveTime,
        payload.leaveGeo.label,
        payload.leaveGeo.latitude,
        payload.leaveGeo.longitude,
        record.id,
      );

      sendJson(res, 200, { records: getRecords(payload.date) });
      return true;
    }

    if (req.method === "DELETE" && requestedUrl.pathname === "/api/records") {
      const date = requestedUrl.searchParams.get("date");

      if (!date) {
        sendJson(res, 400, { error: "Дата не указана." });
        return true;
      }

      db.prepare("DELETE FROM work_records WHERE date = ?").run(date);
      sendJson(res, 200, { records: [] });
      return true;
    }
  } catch (error) {
    sendJson(res, 500, { error: "Ошибка базы данных.", details: error.message });
    return true;
  }

  return false;
}

const server = http.createServer((req, res) => {
  const requestedUrl = new URL(req.url, `http://${req.headers.host || `localhost:${port}`}`);

  if (requestedUrl.pathname.startsWith("/api/")) {
    handleApi(req, res, requestedUrl);
    return;
  }

  const pathname = requestedUrl.pathname === "/" ? "/index.html" : requestedUrl.pathname;
  const filePath = path.join(root, decodeURIComponent(pathname));

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
});

function getLocalUrls() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((item) => item && item.family === "IPv4" && !item.internal)
    .map((item) => `http://${item.address}:${port}/`);
}

server.listen(port, "0.0.0.0", () => {
  console.log(`X-Active site: http://localhost:${port}/`);
  getLocalUrls().forEach((url) => console.log(`Network site: ${url}`));
  console.log(`Database: ${dbPath}`);
});
