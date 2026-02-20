import { execFile as execFileCb } from "child_process";
import path from "path";
import { z } from "zod";

function execFileAsync(cmd: string, args: string[], opts: { timeout: number }): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFileCb(cmd, args, opts, (error, stdout, stderr) => {
      if (error) return reject(error);
      resolve({ stdout: stdout as string, stderr: stderr as string });
    });
  });
}
const SCRIPT_PATH = path.join(process.cwd(), "scripts", "yfinance-fetch.py");

const priceSchema = z.record(z.string(), z.object({
  price: z.number(),
  change: z.number(),
  changePercent: z.number(),
  volume: z.number(),
}));

const historySchema = z.record(z.string(), z.array(z.object({
  date: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
})));

export async function fetchCurrentPrices(symbols: string[]): Promise<z.infer<typeof priceSchema>> {
  const { stdout } = await execFileAsync("python3", [
    SCRIPT_PATH,
    "prices",
    ...symbols,
  ], { timeout: 30000 });

  return priceSchema.parse(JSON.parse(stdout));
}

export async function fetchPriceHistory(
  symbols: string[],
  period: string = "1y"
): Promise<z.infer<typeof historySchema>> {
  const { stdout } = await execFileAsync("python3", [
    SCRIPT_PATH,
    "history",
    period,
    ...symbols,
  ], { timeout: 60000 });

  return historySchema.parse(JSON.parse(stdout));
}
