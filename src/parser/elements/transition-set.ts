import {State, StateId} from './state';
import {RuleProvider} from '../rule';
import {Situation} from './situation';
import {SituationSet} from './situation-set';

export class TransitionSet {
    private readonly statesById: Record<StateId, State> = {};
    private readonly statesByKey: Record<string, State> = {}; // TODO this might be converted to constructor's inline variable

    public readonly startState: State;

    public constructor(ruleProvider: RuleProvider) {
        this.startState = this.addState(
            SituationSet.closureOf(new Situation(ruleProvider.getStartRule()), ruleProvider)
        );

        const statesToProcess: State[] = [this.startState];
        const alreadyAdded: Record<StateId, boolean> = {[this.startState.id]: true};

        while (statesToProcess.length) {
            const state = statesToProcess.shift()!;
            state.situationSet.nextTokens.forEach(nextToken => {
                const newState = this.addState(state.situationSet.getTransition(nextToken, ruleProvider));
                state.addTransition(nextToken, newState);
                if (!alreadyAdded[newState.id]) {
                    statesToProcess.push(newState);
                    alreadyAdded[newState.id] = true;
                }
            });
        }
    }

    public get states(): State[] {
        return Object.values(this.statesById);
    }

    /**
     * Tries to add new state for given situation set. If such situation set is already known, no change is done.
     * Either way, added (or already known) state is returned.
     */
    private addState(situationSet: SituationSet): State {
        if (this.statesByKey[situationSet.key]) {
            return this.statesByKey[situationSet.key];
        }
        const state = new State(situationSet);

        this.statesById[state.id] = state;
        this.statesByKey[situationSet.key] = state;
        return state;
    }

    public toString(): string {
        return Object.values(this.statesById).join('\n');
    }
}
