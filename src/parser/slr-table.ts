import {Rule, RuleId, RuleProvider} from './rule';
import {TransitionSet} from './elements/transition-set';
import {Token, TokenType} from '../common/tokens/token';
import {Action, ActionProvider} from './actions/action';
import {State, StateId, StateProvider} from './elements/state';
import {End} from '../common/tokens/end';
import {Epsilon} from '../common/tokens/epsilon';
import {Shift} from './actions/shift';
import {Transition} from './actions/transition';
import {Accept} from './actions/accept';
import {Reduce} from './actions/reduce';
import {BorderType, TablePrinter} from '../common/table-printer';

export class SlrTable implements RuleProvider, ActionProvider, StateProvider {
    private static readonly START_META_NONTERMINAL_NAME: TokenType = '<start>';

    private readonly startToken: TokenType;
    private readonly rulesByLefts: Record<TokenType, Rule[]> = {};
    private readonly rulesByRights: Record<TokenType, Rule[]> = {};
    private readonly rulesById: Record<RuleId, Rule> = [];
    private readonly canonicalSituationSetFamily: TransitionSet;
    private readonly tokenTerminalTypes: Record<TokenType, TokenTerminalType>;
    private readonly firstSet: Record<TokenType, Record<TokenType, boolean>> = {};
    private readonly followSet: Record<TokenType, Record<TokenType, boolean>> = {};
    private readonly slrTable: Record<StateId, Record<TokenType, Action>>;
    private readonly conflicts: Record<StateId, Record<TokenType, Action[]>> = {};

    public constructor(config: SLRTableConfig) {
        this.startToken = config.startToken;

        this.addRule(this.createStartRule());
        const tokens = this.addRules(config.rules);

        this.tokenTerminalTypes = this.calculateTokenTerminalTypes(tokens, this.rulesByLefts);

        this.canonicalSituationSetFamily = new TransitionSet(this);

        this.slrTable = this.calculateSlrTable();
    }

    public actionFor(state: State, token: Token): Action | undefined {
        return this.slrTable[state.id][token.type];
    }

    public get startState(): State {
        return this.canonicalSituationSetFamily.startState;
    }

    public getExpectedTokensForState(state: State): TokenType[] {
        return Object.keys(this.slrTable[state.id]);
    }

    public getStartRule(): Rule {
        return this.rulesById[0];
    }

    public getRulesForToken(token: TokenType): Rule[] {
        return this.rulesByLefts[token] || [];
    }

    public toString(showConflicts: boolean = true): string {
        const table = new TablePrinter();

        const offsetsX: Record<TokenType, number> = {};
        const offsetsY: Record<StateId, number> = {};

        // top header
        let x = 1;
        table.addBorder(1, BorderType.HORIZONTAL);
        table.addBorder(x, BorderType.VERTICAL);
        Object.entries(this.tokenTerminalTypes)
            .filter(([_, terminalType]) => terminalType === TokenTerminalType.TERMINAL)
            .forEach(([token]) => {
                // TODO not sure whether epsilon token makes sense at all
                if (token !== Epsilon.TOKEN_NAME) {
                    table.setCell(x, 0, token);
                    offsetsX[token] = x;
                    ++x;
                }
            });
        table.addBorder(x, BorderType.VERTICAL);
        Object.entries(this.tokenTerminalTypes)
            .filter(([_, terminalType]) => terminalType === TokenTerminalType.NONTERMINAL)
            .forEach(([token]) => {
                if (token !== SlrTable.START_META_NONTERMINAL_NAME) {
                    table.setCell(x, 0, token);
                    offsetsX[token] = x;
                    ++x;
                }
            });

        // left header
        let y = 1;
        this.canonicalSituationSetFamily.states.forEach(state => {
            table.setCell(0, y, state.id.toString());
            offsetsY[state.id] = y;
            ++y;
        });

        // data
        Object.entries(this.slrTable).forEach(([state, row]) => {
            Object.entries(row).forEach(([token, action]) => {
                let text: string;
                if (showConflicts
                    && this.conflicts[Number(state)]
                    && this.conflicts[Number(state)][token]
                ) {
                    text = this.conflicts[Number(state)][token].join('/');
                } else {
                    text = action.toString();
                }
                table.setCell(offsetsX[token], offsetsY[Number(state)], text);
            });
        });

        return table.toString();
    }

    private static defaultCallback(tokens: unknown[]): unknown {
        return tokens[0];
    }

    private createStartRule(): Rule {
        return {
            id: 0,
            left: SlrTable.START_META_NONTERMINAL_NAME,
            right: [this.startToken],
            callback: SlrTable.defaultCallback
        };
    }

    private addRule(rule: Rule): void {
        if (!this.rulesByLefts[rule.left]) {
            this.rulesByLefts[rule.left] = [];
        }
        this.rulesByLefts[rule.left][rule.id] = rule;
        this.rulesById[rule.id] = rule;

        rule.right.forEach(token => {
            if (!this.rulesByRights[token]) {
                this.rulesByRights[token] = [];
            }
            this.rulesByRights[token][rule.id] = rule;
        });
    }

    private addRules(rules: RawRuleSet): TokenType[] {
        const tokens: Record<TokenType, TokenType> = {};

        let id: RuleId = 0;
        Object.entries(rules).forEach(([left, tokenRules]) => {
            tokenRules.forEach(rawRule => {
                ++id;
                if (!rawRule.right.length) {
                    // TODO not sure whether epsilon token makes sense at all
                    // right = [Epsilon.TOKEN_NAME];
                }

                const rule: Rule = {
                    id,
                    left,
                    right: [...rawRule.right],
                    callback: rawRule.callback || SlrTable.defaultCallback
                };

                this.addRule(rule);
                rule.right.forEach(token => tokens[token] = token);
            });
        });

        return Object.keys(tokens);
    }

    private calculateTokenTerminalTypes(tokens: TokenType[], rulesByLefts: Record<TokenType, Rule[]>): Record<TokenType, TokenTerminalType> {
        const result: Record<TokenType, TokenTerminalType> = {
            [SlrTable.START_META_NONTERMINAL_NAME]: TokenTerminalType.NONTERMINAL,
            [End.TOKEN_NAME]: TokenTerminalType.TERMINAL,
            [Epsilon.TOKEN_NAME]: TokenTerminalType.TERMINAL
        };

        tokens.forEach(token => {
            result[token] = rulesByLefts[token]
                ? TokenTerminalType.NONTERMINAL
                : TokenTerminalType.TERMINAL;
        });

        return result;
    }

    /**
     * Returns FIRST(x) set for given token.
     * This method always returns complete FIRST(x) set for given token, however
     * methods of doing so may differ. First, it tries to get it from cache; if
     * there is no cache hit, it calculates it from scratch, basing on possibly
     * cached values for other x'es. If, on any level of recursion, it finds a token,
     * for which FIRST(x) depends only on tokens already cached (so that it is
     * ensured that their FIRST(x) sets are complete), it caches it too, so that
     * further calls are optimised.
     */
    // TODO extract to separate class
    private getFirstSet(token: TokenType, visited: Record<TokenType, boolean> = {}): Record<TokenType, boolean> {
        if (this.firstSet[token]) {
            return this.firstSet[token];
        }

        if (this.tokenTerminalTypes[token] === TokenTerminalType.TERMINAL) {
            const first = {[token]: true}
            this.firstSet[token] = first;
            return first;
        }

        // copy visited, including current token - we don't want to modify original hash when stepping back a recursion level
        visited = {...visited, [token]: true};
        let first: Record<TokenType, boolean> = {};
        let isIncomplete = false;

        this.rulesByLefts[token].forEach(rule => {
            if (rule.right.length === 1 && rule.right[0] === Epsilon.TOKEN_NAME) {
                // if X . epsilon, then epsilon is in first(X)
                first[Epsilon.TOKEN_NAME] = true;
            } else {
                let epsilonCounter = 0;
                for (let i = 0; i < rule.right.length; ++ i) {
                    const rightToken = rule.right[i];
                    // avoid cycles
                    if (visited[rightToken]) {
                        // FIXME make sure this whole if-block is implemented properly
                        if (rightToken !== token) {
                            // if first(X) for current X depends on any other
                            // tokens, don't save it - it may be incomplete
                            isIncomplete = true;
                        }
                        continue;
                    }

                    const rightFirst = this.getFirstSet(rightToken, visited);

                    // first(Yi)\{epsilon} is in first(X)
                    first = {...first, ...rightFirst};
                    if (rightFirst[Epsilon.TOKEN_NAME]) {
                        ++epsilonCounter;
                    } else {
                        break;
                    }
                }

                // epsilon is in first(X) only if epsilon is in first(Yi) for all i
                if (epsilonCounter === rule.right.length) {
                    delete first[Epsilon.TOKEN_NAME];
                }
            }

            if (!isIncomplete) {
                this.firstSet[token] = first;
            }
        });

        return first;
    }

    /**
     * Returns FOLLOW(x) set for given token.
     * This method always returns complete FOLLOW(x) set for given token, however
     * methods of doing so may differ. First, it tries to get it from cache; if
     * there is no cache hit, it calculates it from scratch, basing on possibly
     * cached values for other x'es. If, on any level of recursion, it finds a token,
     * for which FOLLOW(x) depends only on tokens already cached (so that it is
     * ensured that their FOLLOW(x) sets are complete), it caches it too, so that
     * further calls are optimised.
     */
    // TODO extract to separate class
    private getFollowSet(token: TokenType, visited: Record<TokenType, boolean> = {}): Record<TokenType, boolean> {
        if (this.followSet[token]) {
            return this.followSet[token];
        }

        if (token === SlrTable.START_META_NONTERMINAL_NAME) {
            const follow = {[End.TOKEN_NAME]: true};
            this.followSet[SlrTable.START_META_NONTERMINAL_NAME] = follow;
            return follow;
        }

        // copy visited, including current token - we don't want to modify original hash when stepping back a recursion level
        visited = {...visited, [token]: true};

        let follow: Record<TokenType, boolean> = {};
        let isIncomplete = false;

        this.rulesByRights[token].forEach(rule => {
            const ruleRightLength = rule.right.length;
            for (let i = 0; i < ruleRightLength; ++i) {
                if (rule.right[i] === token) {
                    const isLastRightSideToken = i + 1 >= ruleRightLength;
                    let shouldIncludeFollowSetOfLeftSide = isLastRightSideToken;
                    if (!isLastRightSideToken) {
                        const nextTokenFirstSet = this.getFirstSet(rule.right[i + 1]);
                        shouldIncludeFollowSetOfLeftSide = nextTokenFirstSet[Epsilon.TOKEN_NAME];
                        follow = {...follow, ...nextTokenFirstSet};
                        // FOLLOW set may not include Epsilon, contrary to FIRST set
                        delete nextTokenFirstSet[Epsilon.TOKEN_NAME];
                    }
                    if (shouldIncludeFollowSetOfLeftSide) {
                        // avoid cycles
                        if (!visited[rule.left]) {
                            follow = {...follow, ...this.getFollowSet(rule.left, visited)};
                        } else if (token !== rule.left) {
                            // FIXME make sure this else-if-block is implemented properly
                            // if FOLLOW(X) for current X depends on any other
                            // tokens, don't save it - it may be incomplete
                            isIncomplete = true;
                        }
                    }
                }
            }
        });

        if (!isIncomplete) {
            this.followSet[token] = follow;
        }

        return follow;
    }

    private calculateSlrTable(): Record<StateId, Record<TokenType, Action>> {
        const table: Record<StateId, Record<TokenType, Action>> = {};

        this.canonicalSituationSetFamily.states.forEach(state => {
            const row: Record<TokenType, Action> = {};

            Object.entries(state.transitions).forEach(([token, nextState]) => {
                if (this.tokenTerminalTypes[token] === TokenTerminalType.TERMINAL) {
                    row[token] = new Shift(nextState);
                } else {
                    row[token] = new Transition(nextState);
                }
            });

            state.situationSet.situations
                .filter(situation => !situation.hasNext())
                .forEach(situation => {
                    const action = situation.rule.left === SlrTable.START_META_NONTERMINAL_NAME
                        ? new Accept()
                        : new Reduce(situation.rule);

                    Object.keys(this.getFollowSet(situation.rule.left)).forEach(token => {
                        const alreadySelectedAction = row[token];
                        if (!alreadySelectedAction) {
                            row[token] = action;
                            return
                        }
                        // there is conflict otherwise

                        // 1. store info about it
                        if (!this.conflicts[state.id]) {
                            this.conflicts[state.id] = {};
                        }
                        if (!this.conflicts[state.id][token]) {
                            this.conflicts[state.id][token] = [alreadySelectedAction];
                        }
                        this.conflicts[state.id][token].push(action);

                        // TODO apply some configurable conflict resolving routines, maybe?
                        // 2. resolve it by default rule
                        // TODO exception should probably be thrown instead of any default resolutions
                        if (alreadySelectedAction instanceof Shift) {
                            // do nothing - shift remains
                        } else if (
                            alreadySelectedAction instanceof Reduce
                            && action instanceof Reduce
                            // select rule with lesser id
                            && action.rule.id < alreadySelectedAction.rule.id
                        ) {
                            row[token] = action;
                        }
                    });
                });

            table[state.id] = row;
        });

        // TODO notice conflicts somehow?
        return table;
    }
}

export interface SLRTableConfig {
    startToken: TokenType
    rules: RawRuleSet
}

export type RawRuleSet = Record<TokenType, RawRule[]>

export interface RawRule {
    right: TokenType[],
    callback?: (values: unknown[]) => unknown
}

enum TokenTerminalType {
    TERMINAL,
    NONTERMINAL
}
