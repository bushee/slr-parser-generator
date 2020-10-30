import {Lexer, RawRuleSet} from './src/lexer/lexer';
import {SlrTable, SLRTableConfig} from './src/parser/slr-table';
import {ParserException, Parser} from './src/parser/parser';

// TODO pretty classes for parser config, ruleset and rules
const parserConfig: SLRTableConfig = {
    startToken: 'E',
    rules: {
        'E': [{
            right: ['E', '+', 'E'],
            callback: (values: [number, string, number]) => values[0] + values[2]
        }, {
            right: ['E', 'x', 'E'],
            callback: (values: [number, string, number]) => values[0] * values[2]
        }, {
            right: ['(', 'E', ')'],
            callback: (values: [string, number, string]) => values[1]
        }, {
            right: ['NUM'],
            callback: (values: [number]) => values[0]
        }],
        'NUM': [{
            right: ['NUM', 'digit'],
            callback: (values: [number, string]) => values[0] * 10 + Number(values[1])
        }, {
            right: [], // TODO proper handling of empty rules
            callback: () => ''
        }]
    }
};

// TODO pretty classes for lexer config and rules
// TODO operator precedence routines
const lexerConfig: RawRuleSet = {
    [Lexer.INITIAL_STATE]: [
        {matcherType: 'string', matcherPattern: '+', callback: () => '+'},
        {matcherType: 'string', matcherPattern: '*', callback: () => 'x'},
        {matcherType: 'string', matcherPattern: '(', callback: () => '('},
        {matcherType: 'string', matcherPattern: ')', callback: () => ')'},
        {matcherType: 'regex', matcherPattern: '[0-9]', callback: () => 'digit'}
    ]
};

const string = '3*(5+2)+13*2+1';

const lexer = new Lexer(lexerConfig);
const slr = new SlrTable(parserConfig);
const parser = new Parser<number>(slr);

const lexResult = lexer.lex(string);

parser.parse(lexResult.tokens, lexResult.rows).then(
    result => console.log('result', result),
    (error: ParserException) => console.error('error', error.message)
);
