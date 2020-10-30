import {Action} from './action';

/**
 * Represents action taken at the end of parsing process, meaning that input stream has been accepted.
 */
export class Accept extends Action {
    public get type(): string {
        return 'accept';
    }

    public execute(): true {
        return true;
    }

    public toString(): string {
        return 'ACC';
    }
}
