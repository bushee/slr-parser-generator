import {Rule, RuleId} from '../rule';
import {TokenType} from '../../common/tokens/token';

/**
 * As a situation one may understand a specific "position" in a rule's right side,
 * meaning that if parser has come to a specific situation, it has already consumed
 * all tokens "to the left" of aforementioned position, and still needs to consume
 * all the tokens "to the right".
 */
export class Situation {
    /**
     * dotPosition - position of "dot" defining the situation:
     * - 0 for left-most position (meaning no rule tokens were consumed yet),
     * - 1 = first token was consumed,
     * - 2 = two tokens and so on,
     * up to [length of rule's right side] meaning that all tokens from rule's right side have already been consumed
     *
     * @throws InvalidSituationException If requested situation is not possible
     */
    public constructor(public readonly rule: Rule, protected readonly dotPosition = 0) {
        if (dotPosition > rule.right.length) {
            throw new InvalidSituationException(rule.right.length, dotPosition);
        }
    }

    /**
     * Returns unique situation ID. It helps distinguish two different situations,
     * however it will be always the same for exactly equal situations.
     */
    public get key(): string {
        return `${this.rule.id}.${this.dotPosition}`;
    }

    public get ruleId(): RuleId {
        return this.rule.id;
    }

    public hasNext(): boolean {
        return this.dotPosition < this.rule.right.length;
    }

    /**
     * Returns token that is to be consumed next in this situation.
     * If this situation has no next token (i.e. the "dot" is positioned after the
     * last possible token), undefined is returned instead.
     */
    public get next(): TokenType | undefined {
        if (!this.hasNext()) {
            return undefined;
        }
        return this.rule.right[this.dotPosition];
    }

    /**
     * Returns situation available one step further from this one, i.e. a situation
     * after consuming next possible token.
     * When called for situation that has no next token to consume (i.e. the "dot" is
     * positioned after the last possible token), undefined is returned instead.
     */
    public step(): Situation | undefined {
        if (!this.hasNext()) {
            return undefined;
        }
        return new Situation(this.rule, this.dotPosition + 1);
    }

    public toString(): string {
        const result = [this.rule.left, '->'];
        for (let i = 0; i < this.rule.right.length; ++i) {
            if (this.dotPosition === i) {
                result.push('*');
            }
            result.push(this.rule.right[i]);
        }
        if (this.dotPosition === this.rule.right.length) {
            result.push('*');
        }

        return result.join(' ');
    }
}

export class InvalidSituationException extends Error {
    public constructor(public readonly ruleLength: number, public readonly dotPosition: number) {
        super(`Dot may be on positions 0-${ruleLength} in ${ruleLength}-token rule; ${dotPosition} given.`);
    }
}
