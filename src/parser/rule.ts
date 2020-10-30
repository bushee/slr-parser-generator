import {TokenType} from '../common/tokens/token';

export interface Rule {
    id: RuleId
    left: TokenType
    right: TokenType[]
    callback: (values: unknown) => unknown
}

export type RuleId = number;

export interface RuleProvider {
    getStartRule(): Rule

    getRulesForToken(token: TokenType): Rule[]
}
