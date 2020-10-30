import {Matcher} from './matcher';

export class Regex extends Matcher {
    private regex = new RegExp(this.pattern);

    public match(string: string, offset: number): string | false {
        const matchResult = string.substr(offset).match(this.regex);
        if (matchResult && matchResult.length && matchResult.index === 0) {
            return matchResult[0];
        }
        return false;
    }
}
