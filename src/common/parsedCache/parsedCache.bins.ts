import { bin } from '@prisma/client';
import { readFileSync } from 'fs';
import * as path from 'path';

const dir = path.join(__dirname, '/../../../cache/bins.json');
const binsStr = readFileSync(dir, 'utf8');
export type binsType = Record<string, bin>;
export const bins: binsType = JSON.parse(binsStr);
export const BINS_SYMBOL = Symbol('BINS');
