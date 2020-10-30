/**
 * Used to represent tokens that have not been recognized.
 */
import {Token, TokenType} from './token';

export class Unrecognized extends Token<string> {
    public static readonly TOKEN_NAME: TokenType = 'T_UNRECOGNIZED_TOKEN';

    public constructor(
        value?: string,
        state?: string,
        row?: number,
        column?: number
    ) {
        super(Unrecognized.TOKEN_NAME, value, state, row, column);
    }
}
