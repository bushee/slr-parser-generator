import {Action} from './action';
import {Token} from '../../common/tokens/token';
import {Rule} from '../rule';
import {Stack} from '../stack';
import {State} from '../elements/state';

/**
 * Represents action taken when some grammar rule's conditions have been met and some part of parsing stack should be reduced to a single token.
 */
export class Reduce extends Action {
    public constructor(public readonly rule: Rule) {
        super();
    }

    public get type(): string {
        return 'reduce';
    }

    /**
     * Performs actual action - tries to consume part of current parsing stack and reduce it to a single token.
     * Stack is truncated accordingly, and newly created token - the one that stack's part was reduced to - is prepended to remaining input stream.
     * After successful execution, state that parser should switch to is returned; it is the same state that parser was in when consuming the first of reduced tokens.
     *
     * @throws ParserCompiledWithErrorsException
     */
    public execute(stack: Stack, input: Token[]): State {
        const right: Token[] = [];

        const ruleLength = this.rule.right.length;
        for (let i = ruleLength - 1; i >= 0; --i) {
            while (stack.length) {
                const element = stack.pop();
                if (element instanceof Token) {
                    if (element.type == this.rule.right[i]) {
                        right.unshift(element);
                        break;
                    }

                    throw new ParserCompiledWithErrorsException(
                        `Unexpected ${element} (expected: ${this.rule.right[i]}).`
                    );
                }
            }
        }
        if (!stack.length) {
            throw new ParserCompiledWithErrorsException(
                `Parsing stack contains less tokens than expected (expected: ${ruleLength}, was: ${right.length}).`
            );
        }
        input.unshift(this.prepareReducedToken(right));
        const stackTop = stack[stack.length - 1];
        if (stackTop instanceof Token) {
            throw new ParserCompiledWithErrorsException(
                `There is a token ${stackTop} on top of the stack after reducing rule ${this.rule.id}, while state ID was expected.`
            );
        }
        return stackTop;
    }

    private prepareReducedToken(tokens: Token[]): Token {
        const tokenValues: unknown[] = [];
        let state: string | undefined = undefined;
        let row: number | undefined = undefined;
        let column: number | undefined = undefined;

        if (tokens.length) {
            /* Row and column of result are the same as of first token they are
               available for (because some generic tokens may be created basing on
               empty tokens list, hence not having such information).
               State makes any sense only if all tokens were matched in the same
               lexer state (or they have no state information, which means they
               are created basing on empty tokens list, too). */
            let stateSet = false;
            tokens.forEach(token => {
                tokenValues.push(token.value);
                if (row === undefined) {
                    row = token.row;
                }
                if (column === undefined) {
                    column = token.column;
                }
                if (state === undefined && !stateSet) {
                    state = token.state
                    stateSet = true;
                } else if (state !== token.state) {
                    state = undefined;
                }
            });
        }

        const value = this.rule.callback(tokenValues);

        return new Token(this.rule.left, value, state, row, column);
    }

    public toString(): string {
        return `r${this.rule.id}`;
    }
}

export class ParserCompiledWithErrorsException extends Error {
}
