import {SituationSet} from './situation-set';
import {TokenType} from '../../common/tokens/token';

/**
 * Represents a single state in SLR table.
 */
export class State {
    /**
     * Global count of State objects; it is used only to assign unique IDs for each
     * subsequent object.
     */
    private static count = 0;

    public readonly id: StateId = State.count++;

    /**
     * Transitions possible in current state.
     * Record keys are tokens that could be consumed to perform transition, and values are states to which parser will switch after doing so.
     */
    public readonly transitions: Record<TokenType, State> = {};

    public constructor(public readonly situationSet: SituationSet) {
    }

    /**
     * @throws TransitionAlreadyExistsException If transition that was meant to be added is already specified for this state
     */
    public addTransition(token: TokenType, state: State): void {
        if (this.transitions[token]) {
            throw new TransitionAlreadyExistsException(token, this);
        }

        this.transitions[token] = state;
    }

    public toString(): string {
        const lines = [
            `state ${this.id}:`,
            this.situationSet,
            'transitions:'
        ];
        Object.entries(this.transitions)
            .forEach(([token, state]) => lines.push(`${token} -> ${state}`));
        lines.push('\n');
        return lines.join('\n');
    }
}

export class TransitionAlreadyExistsException extends Error {
    public constructor(public readonly token: TokenType, public readonly state: State) {
        super(`State ${state.id} already includes a transition for token '${token}'.`);
    }
}

export type StateId = number;

export interface StateProvider {
    startState: State

    getExpectedTokensForState(state: State): TokenType[]
}
