export interface SearchCommand {
  id: string;
  title: string;
  detail: string;
  group: string;
  keywords?: string;
  priority?: number;
  run: () => void;
}

/** Match every word, preferring titles over supporting metadata. */
export function searchCommands(commands: readonly SearchCommand[], query: string): SearchCommand[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return commands.map((command, index) => {
    const title = command.title.toLowerCase();
    const haystack = `${title} ${command.detail} ${command.keywords ?? ""}`.toLowerCase();
    const score = words.reduce((total, word) => total + (title === word ? 100 : title.startsWith(word) ? 50 : title.includes(word) ? 25 : 0), 0);
    return { command, index, score, matches: words.every((word) => haystack.includes(word)) };
  }).filter((result) => result.matches)
    .sort((a, b) => b.score - a.score || (b.command.priority ?? 0) - (a.command.priority ?? 0) || a.index - b.index)
    .map((result) => result.command);
}
