# Attendance Register

A simple attendance management system with 4 fields: **Roll No, Name, Date, Status**.

- **Backend:** Node.js (built-in modules only — no npm install needed) serving a REST API and storing records in `data.json`.
- **Frontend:** Plain HTML/CSS/JS, served by the same server.

## Run it

Requires Node.js (v14+).

```bash
node server.js
```

Then open **http://localhost:3000** in your browser.

Change the port with `PORT=8080 node server.js` if 3000 is taken.

## API

| Method | Route              | Description                                  |
|--------|---------------------|-----------------------------------------------|
| GET    | `/api/students`     | List records. Optional query params: `date`, `status`, `q` (search name/roll no) |
| POST   | `/api/students`     | Create a record — body: `{ rollNo, name, date, status }` |
| PUT    | `/api/students/:id` | Update a record (partial updates allowed)     |
| DELETE | `/api/students/:id` | Delete a record                               |

`status` must be one of: `Present`, `Absent`, `Late`.

## Data storage

Records live in `data.json` as a flat array. No database setup required — delete the file (or its contents) to reset the register. Back it up like any other file if you need persistence guarantees.

## Notes

- Everything runs on plain Node — no `npm install` step, no external runtime dependencies.
- The frontend calls the API with `fetch`; open the browser console if something looks off.
- To connect this to a real database later (SQLite/Postgres/etc.), swap out `readData()` / `writeData()` in `server.js` — the API routes stay the same.
