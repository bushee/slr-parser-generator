/**
 * This special token represents empty right side of rule.
 *
 * TODO not sure whether epsilon token makes sense at all
 */
import {Token, TokenType} from './token';

export class Epsilon extends Token<undefined> {
    public static readonly TOKEN_NAME: TokenType = 'ε';

    public constructor() {
        super(Epsilon.TOKEN_NAME);
    }
}
