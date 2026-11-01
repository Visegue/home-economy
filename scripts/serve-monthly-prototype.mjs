// Throwaway local server. The prototype also opens directly as a single HTML file.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const file = new URL(
  "../src/features/dashboard/monthly-overview.prototype.html",
  import.meta.url,
);
const server = createServer(async (request, response) => {
  if (request.url?.split("?")[0] !== "/") {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(await readFile(file));
});
server.listen(4327, "127.0.0.1", () => {
  console.log("Prototyp: http://127.0.0.1:4327");
});
