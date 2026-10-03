import { createServer } from "node:http";
import next from "next";

class SpreadsheetSiteServer {
  private readonly port: number;
  private readonly app: ReturnType<typeof next>;

  constructor() {
    this.port = Number.parseInt(process.env.PORT ?? "3000", 10);
    this.app = next({ dev: true, dir: "site" });
  }

  async start(): Promise<void> {
    await this.app.prepare();
    const handle = this.app.getRequestHandler();
    createServer(async (request, response) => {
      await handle(request, response);
    }).listen(this.port, () => {
      process.stdout.write(`Spreadsheet.AI ready on http://localhost:${this.port}\n`);
    });
  }
}

await new SpreadsheetSiteServer().start();
