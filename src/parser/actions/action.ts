import {Token} from '../../common/tokens/token';
import {Stack} from '../stack';
import {State} from '../elements/state';

export abstract class Action {

    /**
     * Returns human-readable action type string.
     */
    public abstract type: string;

    /**
     * Performs actual action.
     * This method is passed current parsing stack and input stream, and is allowed to modify them both.
     * Returns a state object, meaning that parser is asked to perform transition to this state; or boolean true, when input string has been accepted and parser should finish its work.
     */
    public abstract execute(stack: Stack, input: Token[]): State | true;

    /**
     * Returns detailed action representation. It is used mostly for SLR table printing purpose.
     */
    public abstract toString(): string;
}

export interface ActionProvider {
    actionFor(state: State, token: Token): Action | undefined
}
