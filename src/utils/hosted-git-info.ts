export interface CommitIshKeywordArguments {
    committish?: string;
    commit?: string;
    branch?: string;
    tag?: string;
}

export function getCommittish(kwargs: CommitIshKeywordArguments): string | undefined {
    for (const prop of ['committish', 'commit', 'branch', 'tag'] as const) {
        if (typeof kwargs[prop] === 'string' && kwargs[prop]) {
            return kwargs[prop];
        }
    }
    return undefined;
}

export type GetCommittishFn = typeof getCommittish;
