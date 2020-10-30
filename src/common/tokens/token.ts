/**
 * Used to represent any given token, as well as a base for custom token classes.
 */
export class Token<T = unknown> {
    public constructor(
        public readonly type: TokenType,
        public readonly value?: T,
        public readonly state?: string,
        public readonly row?: number,
        public readonly column?: number
    ) {
    }

    public toString(): string {
        const additional = [];
        if (this.value !== undefined) {
            additional.push(`"${this.value}"`);
        }
        if (this.state !== undefined) {
            additional.push(`@${this.state}`);
        }
        if (this.row !== undefined) {
            additional.push(`row: ${this.row}`);
        }
        if (this.column !== undefined) {
            additional.push(`column: ${this.column}`);
        }

        if (!additional.length) {
            return `${this.type} (${additional.join(' ')})`;
        }
        return `${this.type}`;
    }
}

export type TokenType = string;
