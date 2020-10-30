/**
 * Main lexer class. Provides stand-alone lexer functionality, however one may use  it to derive any custom lexers.
 */
import {Token, TokenType} from '../common/tokens/token';
import {MatcherProvider} from './matchers/matcher-provider';
import {Matcher} from './matchers/matcher';
import {Unrecognized} from '../common/tokens/unrecognized';

export class Lexer {
    public static readonly ALL_STATE = 'all';
    public static readonly INITIAL_STATE = 'initial';
    public static readonly PREVIOUS_STATE = 'previous';

    private static readonly POSSIBLE_EOLS = ['\r\n', '\n\r', '\r', '\n'];

    protected rules: RuleSet;

    public constructor(
        config: RawRuleSet,
        protected useUnrecognizedToken = true,
        matcherProvider: MatcherProvider = new MatcherProvider()
    ) {
        this.rules = {[Lexer.ALL_STATE]: []};
        Object.keys(config).forEach(state => {
            if (!this.rules[state]) {
                this.rules[state] = [];
            }
            config[state].forEach(rule => {
                const callback = rule.callback || Lexer.defaultCallback;
                this.rules[state].push({
                    matcher: matcherProvider.getMatcher(rule.matcherType, rule.matcherPattern),
                    callback,
                    stateSwitch: rule.stateSwitch
                })
            });
        });
    }

    protected static defaultCallback(): undefined {
        return undefined;
    }

    /**
     * @throws EmptyStateStackException When state stack was empty while return to previous state was requested
     */
    public lex(string: string): LexerResult {
        let offset = 0;
        const length = string.length;
        let currentState: State = Lexer.INITIAL_STATE;
        const stateStack: State[] = [currentState];
        const tokens: Token[] = [];
        const caret: CaretPosition = {row: 1, column: 1};
        let unrecognized = '';

        while (offset < length) {
            const matched = [
                ...this.rules[currentState],
                ...this.rules[Lexer.ALL_STATE]
            ].some(rule => {
                const matchResult = rule.matcher.match(string, offset);
                if (matchResult === false) {
                    return false;
                }
                this.handleUnrecognized(unrecognized, currentState, tokens, caret);
                unrecognized = '';

                offset += matchResult.length;
                const tokenMetadata = rule.callback(matchResult);
                if (tokenMetadata !== undefined) {
                    if (typeof tokenMetadata === 'string') {
                        tokens.push(new Token(tokenMetadata, matchResult, currentState, caret.row, caret.column));
                    } else {
                        tokens.push(new Token(tokenMetadata.type, tokenMetadata.value, currentState, caret.row, caret.column));
                    }
                }

                if (rule.stateSwitch) {
                    if (rule.stateSwitch === Lexer.PREVIOUS_STATE) {
                        if (stateStack.length === 1) {
                            throw new EmptyStateStackException(caret, rule);
                        }
                        stateStack.pop();
                        currentState = stateStack[stateStack.length - 1];
                    } else {
                        currentState = rule.stateSwitch;
                        stateStack.push(currentState);
                    }
                }

                this.updateCaret(caret, matchResult);
                return true;
            });

            if (!matched) {
                unrecognized += string.charAt(offset);
                ++offset;
            }
        }
        this.handleUnrecognized(unrecognized, currentState, tokens, caret);

        return {tokens, rows: caret.row};
    }

    protected updateCaret(caret: CaretPosition, text: string): void {
        let offset = 0;
        let found: boolean;
        do {
            found = Lexer.POSSIBLE_EOLS.some(eol => {
                const pos = text.indexOf(eol, offset);
                if (pos === -1) {
                    return false;
                }
                offset = pos + eol.length;
                ++caret.row;
                caret.column = 1;
                return true;
            });
        } while (found);
        caret.column += text.length - offset;
    }

    /**
     * @throws UnrecognizedTokenException When unrecognized token was detected for lexer that should not register it anyway
     */
    protected handleUnrecognized(unrecognized: string, currentState: string, tokens: Token[], caret: CaretPosition) {
        if (unrecognized) {
            if (this.useUnrecognizedToken) {
                tokens.push(new Unrecognized(unrecognized, currentState, caret.row, caret.column));
                this.updateCaret(caret, unrecognized);
            } else {
                throw new UnrecognizedTokenException(caret, unrecognized);
            }
        }
    }
}

export type RawRuleSet = Record<State, RawRule[]>;
export type RuleSet = Record<State, Rule[]>;

export type State = string;

export interface RawRule {
    matcherType: string
    matcherPattern: string
    callback?: (value: string) => string | undefined
    stateSwitch?: State
}

export interface Rule {
    matcher: Matcher
    callback: <T>(value: string) => string | TokenMetadata<T> | undefined
    stateSwitch?: State
}

export interface TokenMetadata<T> {
    type: TokenType
    value: T
}

interface CaretPosition {
    row: number
    column: number
}

export interface LexerResult {
    tokens: Token[]
    rows: number
}

export class LexerException extends Error {
    public readonly row: number;
    public readonly column: number;

    public constructor(caret: CaretPosition, message: string) {
        super(message);
        this.row = caret.row;
        this.column = caret.column;
    }
}

export class UnrecognizedTokenException extends LexerException {
    public constructor(caret: CaretPosition, public readonly string: string) {
        super(caret, `Unrecognized token: "${string}"`);
    }
}

export class EmptyStateStackException extends LexerException {
    public constructor(caret: CaretPosition, public readonly rule?: Rule) {
        super(caret, `Can't go to previous state anymore - state stack is empty.`);
    }
}
