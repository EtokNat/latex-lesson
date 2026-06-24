export interface SymbolEntry {
  canonicalForm: string;
  aliases: string[];
  meaning: string;
  introducedAtBlock: number;
}

export interface SymbolLedger {
  symbols: Map<string, SymbolEntry>;
  getCanonical(alias: string): string;
  isDefined(form: string): boolean;
}
