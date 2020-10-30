/**
 * Abstract matcher class. Used for deriving any custom lexer matchers.
 */
export abstract class Matcher {
    public constructor(protected pattern: string) {
    }

    /**
     * Performs matching operation.
     * Implementation of this method is responsible for matching incoming string against matcher's pattern or any custom rules.
     * Please note that input string may contain any amount of extra data both on left and right side of the string that should be tried to be matched;
     * this method is expected to try to fit only some portion of string indicated by given starting point (offset), leaving the rest intact.
     *
     * @param string An arbitrary string to be compared against matcher
     * @param offset Offset of the actual portion of string to be matched
     *
     * @return string|bool Matched string on success, or bool false on failure
     */
    public abstract match(string: string, offset: number): string | false;
}
