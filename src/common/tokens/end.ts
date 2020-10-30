/**
 * This special token is always added to the end of input token stream to be consumed by rules recognizing end of stream.
 */
import {Token, TokenType} from './token';

export class End extends Token<undefined> {
    public static readonly TOKEN_NAME: TokenType = 'T_EOF';

    public constructor(row?: number, column?: number) {
        super(End.TOKEN_NAME, undefined, undefined, row, column);
    }
}
