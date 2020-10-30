import {Action} from './action';
import {Stack} from '../stack';
import {Token} from '../../common/tokens/token';
import {State} from '../elements/state';

/**
 * Represents action taken when some non-terminal token is being shifted, leading to parser state change.
 * In fact, this class is identical (except for type and prefix, which have no actual impact on parser's work) to Shift, with only exception that transition may occur only upon reaching some non-terminal token, while shift - only upon reaching terminal token.
 */
export class Transition extends Action {
    public constructor(public readonly newState: State) {
        super();
    }

    public get type(): string {
        return 'transition';
    }

    /**
     * Performs actual action - shifts first non-terminal token from input stream and pops it to parsing stack.
     * After that, state to which parser should switch is both popped to parsing stack and returned.
     */
    public execute(stack: Stack, input: Token[]): State {
        stack.push(input.shift()!);
        stack.push(this.newState);
        return this.newState;
    }

    public toString(): string {
        return `${this.newState.id}`;
    }
}
