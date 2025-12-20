export interface LyricLine {
    text: string;
    start: number;
}

export interface LyricData {
    lines: LyricLine[];
}

export const LRC = {
    parse(lrc: string): LyricData {
        const lines: LyricLine[] = [];
        const lyricLines = lrc.split('\n');
        const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

        for (const line of lyricLines) {
            const match = timeReg.exec(line);
            if (match) {
                const min = parseInt(match[1], 10);
                const sec = parseInt(match[2], 10);
                const ms = parseInt(match[3], 10) * (match[3].length === 2 ? 10 : 1);
                const start = min * 60 + sec + ms / 1000;
                const text = line.replace(timeReg, '').trim();
                lines.push({ text, start });
            }
        }

        lines.sort((a, b) => a.start - b.start);
        return { lines };
    },
};
