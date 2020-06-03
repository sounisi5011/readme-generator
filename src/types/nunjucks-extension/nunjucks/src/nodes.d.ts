// Type definitions for nunjucks 3.2.1
// Project: https://github.com/mozilla/nunjucks
// Definitions by: sounisi5011 <https://github.com/sounisi5011>

import { Extension } from '../../';
import { Obj } from './object';

/* eslint @typescript-eslint/ban-ts-comment: off */

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L15-L51 Source}
 */
export class Node extends Obj {
    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L16-L32 Source}
     */
    constructor(lineno: number, colno: number, ...args: unknown[]);

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L17 Source}
     */
    public readonly lineno: number;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L18 Source}
     */
    public readonly colno: number;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L20 Source}
     */
    public readonly fields: readonly string[];

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L34-L44 Source}
     */
    findAll<TType extends new (...args: unknown[]) => unknown>(
        type: TType,
    ): InstanceType<TType>[];

    findAll<
        TType extends new (...args: unknown[]) => unknown,
        TResultItem extends unknown
    >(
        type: TType,
        results: TResultItem[],
    ): (TResultItem | InstanceType<TType>)[];

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L46-L50 Source}
     */
    iterFields(
        func: (
            // @ts-ignore
            fieldValue: this[this['fields'][number]],
            field: this['fields'][number],
        ) => void,
    ): void;
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L53-L59 Source}
 */
export class Value extends Node {
    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L55 Source}
     */
    get typename(): 'Value';

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L56-L58 Source}
     */
    // @ts-ignore
    get fields(): ['value'];

    public readonly value: unknown;
    constructor(lineno: number, colno: number, value?: Value['value']);
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L61-L73 Source}
 */
export class NodeList extends Node {
    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L63 Source}
     */
    get typename(): 'NodeList';

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L64 Source}
     */
    // @ts-ignore
    get fields(): ['children'];

    public readonly children: unknown[];

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L66-L68 Source}
     */
    constructor(lineno: number, colno: number, nodes?: NodeList['children']);

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L70-L72 Source}
     */
    addChild(node: NodeList['children'][number]): void;
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L75 Source}
 */
export class Root extends NodeList {
    // @ts-ignore
    get typename(): 'Root';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L76 Source}
 */
export class Literal extends Value {
    // @ts-ignore
    get typename(): 'Literal';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L77 Source}
 */
export class Symbol extends Value {
    // @ts-ignore
    get typename(): 'Symbol';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L78 Source}
 */
export class Group extends NodeList {
    // @ts-ignore
    get typename(): 'Group';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L79 Source}
 */
declare class ArrayNode extends NodeList {
    // @ts-ignore
    get typename(): 'Array';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L219 Source}
 */
export { ArrayNode as Array };

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L80 Source}
 */
export class Pair extends Node {
    get typename(): 'Pair';
    public readonly fields: readonly ['key', 'value'];
    public readonly key: unknown;
    public readonly value: unknown;
    constructor(
        lineno: number,
        colno: number,
        key?: Pair['key'],
        value?: Pair['value'],
    );
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L81 Source}
 */
export class Dict extends NodeList {
    // @ts-ignore
    get typename(): 'Dict';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L82 Source}
 */
export class LookupVal extends Node {
    get typename(): 'LookupVal';
    public readonly fields: readonly ['target', 'val'];
    public readonly target: unknown;
    public readonly val: unknown;
    constructor(
        lineno: number,
        colno: number,
        target?: LookupVal['target'],
        val?: LookupVal['val'],
    );
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L83 Source}
 */
export class If extends Node {
    get typename(): 'If';
    public readonly fields: readonly ['cond', 'body', 'else_'];
    public readonly cond: unknown;
    public readonly body: unknown;
    public readonly else_: unknown;
    constructor(
        lineno: number,
        colno: number,
        cond?: If['cond'],
        body?: If['body'],
        else_?: If['else_'],
    );
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L84 Source}
 */
export class IfAsync extends If {
    // @ts-ignore
    get typename(): 'IfAsync';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L85 Source}
 */
export class InlineIf extends Node {
    get typename(): 'InlineIf';
    public readonly fields: readonly ['cond', 'body', 'else_'];
    public readonly cond: unknown;
    public readonly body: unknown;
    public readonly else_: unknown;
    constructor(
        lineno: number,
        colno: number,
        cond?: InlineIf['cond'],
        body?: InlineIf['body'],
        else_?: InlineIf['else_'],
    );
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L86 Source}
 */
export class For extends Node {
    get typename(): 'For';
    public readonly fields: readonly ['arr', 'name', 'body', 'else_'];
    public readonly arr: unknown;
    public readonly name: unknown;
    public readonly body: unknown;
    public readonly else_: unknown;
    constructor(
        lineno: number,
        colno: number,
        arr?: For['arr'],
        name?: For['name'],
        body?: For['body'],
        else_?: For['else_'],
    );
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L87 Source}
 */
export class AsyncEach extends For {
    // @ts-ignore
    get typename(): 'AsyncEach';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L88 Source}
 */
export class AsyncAll extends For {
    // @ts-ignore
    get typename(): 'AsyncAll';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L89 Source}
 */
export class Macro extends Node {
    get typename(): 'Macro';
    public readonly fields: readonly ['name', 'args', 'body'];
    public readonly name: unknown;
    public readonly args: unknown;
    public readonly body: unknown;
    constructor(
        lineno: number,
        colno: number,
        name?: Macro['name'],
        args?: Macro['args'],
        body?: Macro['body'],
    );
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L90 Source}
 */
export class Caller extends Macro {
    // @ts-ignore
    get typename(): 'Caller';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L91 Source}
 */
export class Import extends Node {
    get typename(): 'Import';
    public readonly fields: readonly ['template', 'target', 'withContext'];
    public readonly template: unknown;
    public readonly target: unknown;
    public readonly withContext: unknown;
    constructor(
        lineno: number,
        colno: number,
        template?: Import['template'],
        target?: Import['target'],
        withContext?: Import['withContext'],
    );
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L93-L100 Source}
 */
export class FromImport extends Node {
    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L94 Source}
     */
    get typename(): 'FromImport';

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L95 Source}
     */
    // @ts-ignore
    get fields(): ['template', 'names', 'withContext'];

    public readonly template: unknown;
    public readonly names: NodeList;
    public readonly withContext: boolean | null;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L97-L99 Source}
     */
    constructor(
        lineno: number,
        colno: number,
        template?: FromImport['template'],
        names?: FromImport['names'],
        withContext?: FromImport['withContext'],
    );
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L102 Source}
 */
export class FunCall extends Node {
    get typename(): 'FunCall';
    public readonly fields: readonly ['name', 'args'];
    public readonly name: unknown;
    public readonly args: NodeList;
    constructor(
        lineno: number,
        colno: number,
        name?: FunCall['name'],
        args?: FunCall['args'],
    );
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L103 Source}
 */
export class Filter extends FunCall {
    // @ts-ignore
    get typename(): 'Filter';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L104 Source}
 */
export class FilterAsync extends Filter {
    // @ts-ignore
    get typename(): 'FilterAsync';
    // @ts-ignore
    public readonly fields: readonly ['name', 'args', 'symbol'];
    public readonly name: unknown;
    // @ts-ignore
    public readonly args: unknown;
    public readonly symbol: unknown;
    constructor(
        lineno: number,
        colno: number,
        name?: FilterAsync['name'],
        args?: FilterAsync['args'],
        symbol?: FilterAsync['symbol'],
    );
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L105 Source}
 */
export class KeywordArgs extends Dict {
    // @ts-ignore
    get typename(): 'KeywordArgs';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L106 Source}
 */
export class Block extends Node {
    get typename(): 'Block';
    public readonly fields: readonly ['name', 'body'];
    public readonly name: unknown;
    public readonly body: unknown;
    constructor(
        lineno: number,
        colno: number,
        name?: Block['name'],
        body?: Block['body'],
    );
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L107 Source}
 */
export class Super extends Node {
    get typename(): 'Super';
    public readonly fields: readonly ['blockName', 'symbol'];
    public readonly blockName: unknown;
    public readonly symbol: unknown;
    constructor(
        lineno: number,
        colno: number,
        blockName?: Super['blockName'],
        symbol?: Super['symbol'],
    );
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L108 Source}
 */
declare class TemplateRef extends Node {
    get typename(): 'TemplateRef';
    public readonly fields: readonly ['template'];
    public readonly template: unknown;
    constructor(
        lineno: number,
        colno: number,
        template?: TemplateRef['template'],
    );
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L109 Source}
 */
export class Extends extends TemplateRef {
    // @ts-ignore
    get typename(): 'Extends';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L110 Source}
 */
export class Include extends Node {
    get typename(): 'Include';
    public readonly fields: readonly ['template', 'ignoreMissing'];
    public readonly template: unknown;
    public readonly ignoreMissing: boolean;
    constructor(
        lineno: number,
        colno: number,
        template?: Include['template'],
        ignoreMissing?: Include['ignoreMissing'],
    );
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L111 Source}
 */
export class Set extends Node {
    get typename(): 'Set';
    public readonly fields: readonly ['targets', 'value'];
    public readonly targets: unknown;
    public readonly value: unknown;
    constructor(
        lineno: number,
        colno: number,
        targets?: Set['targets'],
        value?: Set['value'],
    );
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L112 Source}
 */
export class Switch extends Node {
    get typename(): 'Switch';
    public readonly fields: readonly ['expr', 'cases', 'default'];
    public readonly expr: unknown;
    public readonly cases: unknown;
    public readonly default: unknown;
    constructor(
        lineno: number,
        colno: number,
        expr?: Switch['expr'],
        cases?: Switch['cases'],
        default_?: Switch['default'],
    );
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L113 Source}
 */
export class Case extends Node {
    get typename(): 'Case';
    public readonly fields: readonly ['cond', 'body'];
    public readonly cond: unknown;
    public readonly body: unknown;
    constructor(
        lineno: number,
        colno: number,
        cond?: Case['cond'],
        body?: Case['body'],
    );
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L114 Source}
 */
export class Output extends NodeList {
    // @ts-ignore
    get typename(): 'Output';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L115 Source}
 */
export class Capture extends Node {
    get typename(): 'Capture';
    public readonly fields: readonly ['body'];
    public readonly body: unknown;
    constructor(lineno: number, colno: number, body?: Capture['body']);
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L116 Source}
 */
export class TemplateData extends Literal {
    // @ts-ignore
    get typename(): 'TemplateData';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L117 Source}
 */
declare class UnaryOp extends Node {
    get typename(): 'UnaryOp';
    public readonly fields: readonly ['target'];
    public readonly target: unknown;
    constructor(lineno: number, colno: number, target?: UnaryOp['target']);
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L118 Source}
 */
export class BinOp extends Node {
    get typename(): 'BinOp';
    public readonly fields: readonly ['left', 'right'];
    public readonly left: unknown;
    public readonly right: unknown;
    constructor(
        lineno: number,
        colno: number,
        left?: BinOp['left'],
        right?: BinOp['right'],
    );
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L119 Source}
 */
export class In extends BinOp {
    // @ts-ignore
    get typename(): 'In';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L120 Source}
 */
export class Is extends BinOp {
    // @ts-ignore
    get typename(): 'Is';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L121 Source}
 */
export class Or extends BinOp {
    // @ts-ignore
    get typename(): 'Or';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L122 Source}
 */
export class And extends BinOp {
    // @ts-ignore
    get typename(): 'And';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L123 Source}
 */
export class Not extends UnaryOp {
    // @ts-ignore
    get typename(): 'Not';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L124 Source}
 */
export class Add extends BinOp {
    // @ts-ignore
    get typename(): 'Add';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L125 Source}
 */
export class Concat extends BinOp {
    // @ts-ignore
    get typename(): 'Concat';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L126 Source}
 */
export class Sub extends BinOp {
    // @ts-ignore
    get typename(): 'Sub';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L127 Source}
 */
export class Mul extends BinOp {
    // @ts-ignore
    get typename(): 'Mul';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L128 Source}
 */
export class Div extends BinOp {
    // @ts-ignore
    get typename(): 'Div';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L129 Source}
 */
export class FloorDiv extends BinOp {
    // @ts-ignore
    get typename(): 'FloorDiv';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L130 Source}
 */
export class Mod extends BinOp {
    // @ts-ignore
    get typename(): 'Mod';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L131 Source}
 */
export class Pow extends BinOp {
    // @ts-ignore
    get typename(): 'Pow';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L132 Source}
 */
export class Neg extends UnaryOp {
    // @ts-ignore
    get typename(): 'Neg';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L133 Source}
 */
export class Pos extends UnaryOp {
    // @ts-ignore
    get typename(): 'Pos';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L134 Source}
 */
export class Compare extends Node {
    get typename(): 'Compare';
    public readonly fields: readonly ['expr', 'ops'];
    public readonly expr: unknown;
    public readonly ops: unknown;
    constructor(
        lineno: number,
        colno: number,
        expr?: Compare['expr'],
        ops?: Compare['ops'],
    );
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L135 Source}
 */
export class CompareOperand extends Node {
    get typename(): 'CompareOperand';
    public readonly fields: readonly ['expr', 'type'];
    public readonly expr: unknown;
    public readonly type: unknown;
    constructor(
        lineno: number,
        colno: number,
        expr?: CompareOperand['expr'],
        type?: CompareOperand['type'],
    );
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L136-L146 Source}
 */
export class CallExtension extends Node {
    get typename(): 'CallExtension';

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L137-L144 Source}
     */
    constructor(
        ext: Extension,
        prop: CallExtension['prop'],
        args?: CallExtension['args'],
        contentArgs?: CallExtension['contentArgs'],
    );

    // @ts-ignore
    public readonly lineno: undefined;
    // @ts-ignore
    public readonly colno: undefined;
    public readonly autoescape: unknown;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L145 Source}
     */
    public readonly fields: readonly ['extName', 'prop', 'args', 'contentArgs'];
    public readonly extName: unknown;
    public readonly prop: string;
    public readonly args: unknown;
    public readonly contentArgs: readonly unknown[];
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L147 Source}
 */
export class CallExtensionAsync extends CallExtension {
    // @ts-ignore
    get typename(): 'CallExtensionAsync';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L162-L209 Source}
 */
export function printNodes(
    node: NodeList | CallExtension | Node,
    indent?: number,
): void;