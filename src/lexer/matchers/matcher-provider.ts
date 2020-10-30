import {Matcher} from './matcher';
import {String} from './string';
import {Regex} from './regex';

export class MatcherProvider {
    private registeredMatchers: Record<string, new(pattern: string, ...args: unknown[]) => Matcher> = {};

    public constructor() {
        this.registerMatcher('string', String);
        this.registerMatcher('regex', Regex);
    }

    public registerMatcher(type: string, matcherClass: new(pattern: string, ...args: unknown[]) => Matcher) {
        this.registeredMatchers[type] = matcherClass;
    }

    /**
     * @throws MatcherNotFoundException If unknown matcher was requested
     */
    public getMatcher(type: string, pattern: string, ...additionalArguments: unknown[]): Matcher {
        if (this.registeredMatchers[type]) {
            return new this.registeredMatchers[type](pattern, ...additionalArguments);
        }
        throw new MatcherNotFoundException(type);
    }
}

export class MatcherNotFoundException extends Error {
    public constructor(public readonly type: string) {
        super(`Matcher "${type}" doesn't exist.`);
    }
}
