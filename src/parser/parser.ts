import {SlrTable} from './slr-table';
import {Token, TokenType} from '../common/tokens/token';
import {End} from '../common/tokens/end';
import {Stack} from './stack';

export class Parser<T = unknown> {
    public constructor(protected slr: SlrTable) {
    }

    /**
     * rowCount is optional number of original input's rows, used to fill end token's column offset for better error info, should parsing error occur.
     * expectedTokensLimit is max. amount of expected tokens to be included in exception message, should parsing error occur. Pass boolean false to disable limit.
     */
    public parse(tokens: Token[], rowCount?: number | undefined, expectedTokensLimit: number | false = 1): Promise<T> {
        return new Promise((resolve, reject) => {
            tokens = [...tokens, new End(rowCount)];

            let state = this.slr.startState;
            const stack: Stack = [state];

            while (true) {
                const next = tokens[0];
                const action = this.slr.actionFor(state, next);

                if (action) {
                    const result = action.execute(stack, tokens);

                    if (result === true) {
                        resolve((stack[1] as Token<T>).value!);
                        return;
                    }
                    state = result;
                } else {
                    const expectedTokens = this.slr.getExpectedTokensForState(state);
                    if (next instanceof End) {
                        reject(new UnexpectedEndOfInputException(next, expectedTokens));
                        return
                    }
                    reject(new UnexpectedTokenException(next, expectedTokens, expectedTokensLimit));
                    return;
                }
            }
        });
    };
}

export class ParserException extends Error {
    public constructor(public readonly token: Token, public readonly expectedTokens: TokenType[], message = '') {
        super(message);
    }
}

export class UnexpectedEndOfInputException extends ParserException {
    public constructor(token: Token, expectedTokens: TokenType[]) {
        super(token, expectedTokens, `Unexpected end of input on line ${token.row}.`);
    }
}

export class UnexpectedTokenException extends ParserException {
    public constructor(token: Token, expectedTokens: TokenType[], expectedTokensLimit: number | false) {
        let message = `Unexpected ${token.type}`;

        if ((expectedTokensLimit === false) || (expectedTokens.length <= expectedTokensLimit)) {
            message += ', expecting ';
            if (expectedTokens.length === 1) {
                message += expectedTokens[0];
            } else {
                const last = expectedTokens[expectedTokens.length - 1];
                message += `${expectedTokens.slice(0, -1).join(', ')} or ${last}`;
            }
        }

        message += ` on line ${token.row}, column ${token.column}.`;

        super(token, expectedTokens, message);
    }
}
