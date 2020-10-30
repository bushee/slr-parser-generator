import {Situation} from './situation';
import {RuleProvider} from '../rule';
import {TokenType} from '../../common/tokens/token';

export class SituationSet {
    protected situationByKey: Record<string, Situation> = {};
    /**
     * Unique key representing data stored in set. May be used to distinquish sets.
     * Once calculated, it is stored here until invalidated; it has to be recalculated then.
     */
    private cachedKey: string | undefined;

    /**
     * Tries to add new situation to set. If situation is already known, no actual
     * action is taken and boolean false is returned; boolean true is returned
     * otherwise.
     */
    public add(situation: Situation): boolean {
        const key = situation.key;
        if (this.situationByKey[key]) {
            return false;
        }
        this.invalidateKey();
        this.situationByKey[key] = situation;
        return true;
    }

    /**
     * Closure is extension of a set that contains also all situations available one
     * step further from any situation in given set.
     */
    public getClosure(ruleProvider: RuleProvider): SituationSet {
        const situations = Object.values(this.situationByKey);
        const set = new SituationSet();

        while (situations.length) {
            const situation = situations.shift()!;
            if (set.add(situation)) {
                const next = situation.next;
                if (next) {
                    ruleProvider.getRulesForToken(next).forEach(
                        rule => situations.push(new Situation(rule))
                    )
                }
            }
        }

        return set;
    }

    /**
     * Returns closure of situation set including only passed situation.
     */
    public static closureOf(situation: Situation, ruleProvider: RuleProvider): SituationSet {
        const set = new SituationSet();
        set.add(situation);
        return set.getClosure(ruleProvider);
    }

    /**
     * Transition set is closure of a set that consists of all situations available one step further form this set after accepting given token.
     */
    public getTransition(token: TokenType, ruleProvider: RuleProvider): SituationSet {
        const set = new SituationSet();

        Object.values(this.situationByKey).forEach(situation => {
            if (situation.next == token) {
                const next = situation.step();
                if (next) {
                    set.add(next);
                }
            }
        });

        return set.getClosure(ruleProvider);
    }

    /**
     * List of tokens that could be accepted from any situation in this situation set.
     */
    public get nextTokens(): TokenType[] {
        const next: Record<TokenType, TokenType> = {};

        Object.values(this.situationByKey).forEach(situation => {
            const token = situation.next;
            if (token) {
                next[token] = token;
            }
        });

        return Object.keys(next);
    }

    /**
     * An unique key that could distinguish one situation set from any other.
     */
    public get key(): string {
        if (this.cachedKey === undefined) {
            const keys: Record<string, string> = {};
            Object.values(this.situationByKey).forEach(situation => {
                const key = situation.key;
                keys[key] = key;
            });
            this.cachedKey = Object.keys(keys).sort().join('|');
        }

        return this.cachedKey;
    }

    public get situations(): Situation[] {
        return Object.values(this.situationByKey);
    }

    public toString(): string {
        return Object.values(this.situationByKey).join('\n');
    }

    private invalidateKey(): void {
        this.cachedKey = undefined;
    }
}
