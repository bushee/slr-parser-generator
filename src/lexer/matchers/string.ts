import {Matcher} from './matcher';

export class String extends Matcher {
    public match(string: string, offset: number): string | false {
        if (string.substr(offset, this.pattern.length) === this.pattern) {
            return this.pattern;
        }
        return false;
    }
}
