export class TablePrinter {
    private data: string[][] = [];
    private columnWidths: number[] = [];
    private borders: Record<BorderType, boolean[]> = {
        [BorderType.HORIZONTAL]: [],
        [BorderType.VERTICAL]: []
    };

    public horizontalPadding: number;
    private columnCount: number;
    private rowCount: number;

    public constructor(options: TableOptions = {}) {
        this.horizontalPadding = options.horizontalPadding || 2;
        this.columnCount = options.minimumColumns || 0;
        this.rowCount = options.minimumRows || 0;
    }

    public setCell(x: number, y: number, value: string): void {
        if (!this.data[x]) {
            this.data[x] = [];
        }
        this.data[x][y] = value;

        const width = value.length;
        if (!this.columnWidths[x] || this.columnWidths[x] < width) {
            this.columnWidths[x] = width;
        }

        this.columnCount = Math.max(x + 1, this.columnCount);
        this.rowCount = Math.max(y + 1, this.rowCount);
    }

    /**
     * Adds additional border to table.
     * This border will be added:
     * - on left side of specified column, if vertical border is added
     * - on top side of specified row, if horizontal border is added
     */
    public addBorder(offset: number, type: BorderType): void {
        this.borders[type][offset] = true;
    }

    public removeBorder(offset: number, type: BorderType): void {
        this.borders[type][offset] = false;
    }

    public toString(): string {
        let result = '';

        for (let y = 0; y < this.rowCount; ++y) {
            if (this.borders[BorderType.HORIZONTAL][y]) {
                for (let x = 0; x < this.columnCount; ++x) {
                    if (this.borders[BorderType.VERTICAL][x]) {
                        result += '|';
                    }
                    const columnWidth = this.columnWidths[x] + this.horizontalPadding;
                    result += '|';
                    result += '-'.repeat(columnWidth);
                }
                result += '\n';
            }
            for (let x = 0; x < this.columnCount; ++x) {
                if (this.borders[BorderType.VERTICAL][x]) {
                    result += '|';
                }
                const columnWidth = this.columnWidths[x] + this.horizontalPadding;
                result += '|';
                result += this.padString(this.data[x][y] || '', columnWidth, ' ');
            }
            result += '\n';
        }

        return result;
    }

    private padString(string: string, length: number, char = ' '): string {
        return string.padStart((string.length + length) / 2, char).padEnd(length, char);
    }
}

export enum BorderType {
    VERTICAL,
    HORIZONTAL
}

export interface TableOptions {
    horizontalPadding?: number
    minimumColumns?: number
    minimumRows?: number
}
