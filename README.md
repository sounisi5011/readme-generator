# @sounisi5011/readme-generator

[![License: MIT](https://img.shields.io/static/v1?label=license&message=MIT&color=green)](https://github.com/sounisi5011/readme-generator/tree/master/LICENSE)
![Supported Node.js version: ^10.14.2 || 12.x || 14.x](https://img.shields.io/static/v1?label=node&message=%5E10.14.2%20%7C%7C%2012.x%20%7C%7C%2014.x&color=brightgreen)
[![Tested with Jest](https://img.shields.io/badge/tested_with-jest-99424f.svg)](https://github.com/facebook/jest)
[![Dependencies Status](https://david-dm.org/sounisi5011/readme-generator/status.svg)](https://david-dm.org/sounisi5011/readme-generator)
[![Build Status](https://github.com/sounisi5011/readme-generator/workflows/GitHub%20Actions/badge.svg?branch=master)](https://github.com/sounisi5011/readme-generator/actions?query=workflow%3A%22GitHub%20Actions%22%20branch%3Amaster)
[![Maintainability Status](https://api.codeclimate.com/v1/badges/1aabcc39ecde1caeb45d/maintainability)](https://codeclimate.com/github/sounisi5011/readme-generator/maintainability)

CLI tool to generate `README.md` by using Nunjucks template file.

## Install

```sh
npm install --save-dev github:sounisi5011/readme-generator#semver:0.0.3
```

## Usage

```console
$ readme-generator --help
readme-generator v0.0.3

CLI tool to generate README.md by using Nunjucks template file

Usage:
  $ readme-generator [options]

Options:
  -V, -v, --version  Display version number 
  -h, --help         Display this message 
  --template <file>  Nunjucks template file path (default: readme-template.njk)
  --test             Test if README.md file is overwritten 
```

### Default Defined Variables

* `pkg` - [Source](https://github.com/sounisi5011/readme-generator/tree/master/src/index.ts#L392)

    Object value of `package.json`

* `repo` - [Source](https://github.com/sounisi5011/readme-generator/tree/master/src/index.ts#L448-L456)

    Object value indicating repository data.
    It is generate by reading [the `repository` field] of [`package.json`].

[`package.json`]: https://docs.npmjs.com/files/package.json
[the `repository` field]: https://docs.npmjs.com/files/package.json#repository

* `deps` - [Source](https://github.com/sounisi5011/readme-generator/tree/master/src/index.ts#L519-L530)

    Object value indicating dependencies data.
    It is generate by reading `package-lock.json`.

### Additional Tags

#### `setProp`

[Source](https://github.com/sounisi5011/readme-generator/tree/master/src/template-tags/setProp.ts)

`setProp` lets you create/modify variable properties.

template:

```nunjucks
{% set data = {} %}
{{ data | dump }}
{% setProp data.username = 'joe' %}
{{ data | dump }}
```

output:

```

{}

{"username":"joe"}
```

`setProp` can also create/modify variables.
So you can replace [the `set` tag] with `setProp`.

[the `set` tag]: https://mozilla.github.io/nunjucks/templating.html#set

template:

```nunjucks
username: {{ username }}
{% setProp username = "joe" %}
username: {{ username }}
```

output:

```
username: 

username: joe
```

Like the `set` tag, `setProp` can also capture the contents of a block.

template:

``````nunjucks
{% setProp data.gitignore = {} %}
{% setProp data.gitignore.contents -%}
    {% include '.gitignore' %}
{%- endset %}

**`.gitignore`**
```
{{ data.gitignore.contents }}
```
``````

output:

``````



**`.gitignore`**
```
*.tgz
.envrc
.node-version
coverage/
node_modules/

```
``````

### Additional Filters

#### `omitPackageScope`

[Source](https://github.com/sounisi5011/readme-generator/tree/master/src/index.ts#L108-L113)

template:

```nunjucks
{{ '@foo/bar' | omitPackageScope }}
```

output:

```
bar
```

#### `npmURL`

[Source](https://github.com/sounisi5011/readme-generator/tree/master/src/index.ts#L114-L131)

template:

```nunjucks
- {{ 'foo' | npmURL }}
- {{ 'foo@1.2.3' | npmURL }}
- {{ 'foo@legacy' | npmURL }}
- {{ '@hoge/bar' | npmURL }}
- {{ '@hoge/bar@0.1.1-alpha' | npmURL }}
- {{ '@hoge/bar@dev' | npmURL }}
- {{ pkg.name | npmURL }}
- {{ deps.nunjucks | npmURL }}
- {{ deps['@types/node'] | npmURL }}
```

output:

```
- https://www.npmjs.com/package/foo
- https://www.npmjs.com/package/foo/v/1.2.3
- https://www.npmjs.com/package/foo/v/legacy
- https://www.npmjs.com/package/@hoge/bar
- https://www.npmjs.com/package/@hoge/bar/v/0.1.1-alpha
- https://www.npmjs.com/package/@hoge/bar/v/dev
- https://www.npmjs.com/package/@sounisi5011/readme-generator
- https://www.npmjs.com/package/nunjucks/v/3.2.1
- https://www.npmjs.com/package/@types/node/v/14.0.12
```

#### `execCommand`

[Source](https://github.com/sounisi5011/readme-generator/tree/master/src/index.ts#L132-L159)

template:

```nunjucks
{{ 'tsc --version' | execCommand }}
---
{{ ['eslint', '--version'] | execCommand }}
```

output:

```
Version 3.9.5
---
v7.2.0
```

#### `linesSelectedURL`

[Source](https://github.com/sounisi5011/readme-generator/tree/master/src/index.ts#L160-L313)

template:

```nunjucks
11. {{ '/types.node_modules/npm-path.d.ts' | repoBrowseURL | linesSelectedURL(       r/^export =/ ) }}
21. {{ '/types.node_modules/npm-path.d.ts' | repoBrowseURL | linesSelectedURL( start=r/^export =/ ) }}

12. {{ '/types.node_modules/npm-path.d.ts' | repoBrowseURL | linesSelectedURL(       r/^(declare [^\n]*\n)+/m ) }}
22. {{ '/types.node_modules/npm-path.d.ts' | repoBrowseURL | linesSelectedURL( start=r/^(declare [^\n]*\n)+/m ) }}

13. {{ '/types.node_modules/npm-path.d.ts' | repoBrowseURL | linesSelectedURL(       r/^(declare [^\n]*)(\ndeclare [^\n]*)*/m ) }}
23. {{ '/types.node_modules/npm-path.d.ts' | repoBrowseURL | linesSelectedURL( start=r/^(declare [^\n]*)(\ndeclare [^\n]*)*/m ) }}

34. {{ '/.eslintrc.yaml' | repoBrowseURL | linesSelectedURL( start=r/^parserOptions:$/m, end=r/.\n\S/ ) }}
35. {{ '/.eslintrc.yaml' | repoBrowseURL | linesSelectedURL( start=r/^parserOptions:$/m, end=r/.\n(?=\S)/ ) }}
36. {{ '/.eslintrc.yaml' | repoBrowseURL | linesSelectedURL( start=r/^parserOptions:$/m, end=r/.(?=\n\S)/ ) }}

41. {{ '/.prettierrc.yaml' | repoBrowseURL | linesSelectedURL( start=r/^ /, end=r/^[^\n]*$/ ) }}

{% set repoData = { repoType: 'github',
                    fileFullpath: '.eslintrc.yaml',
                    browseURL: 'http://example.com/path/to' }
-%}
51. {{ repoData | linesSelectedURL(r/(?<!\w)sourceType:/) }}
```

output:

```
11. https://github.com/sounisi5011/readme-generator/tree/master/types.node_modules/npm-path.d.ts#L118
21. https://github.com/sounisi5011/readme-generator/tree/master/types.node_modules/npm-path.d.ts#L118

12. https://github.com/sounisi5011/readme-generator/tree/master/types.node_modules/npm-path.d.ts#L37-L40
22. https://github.com/sounisi5011/readme-generator/tree/master/types.node_modules/npm-path.d.ts#L40

13. https://github.com/sounisi5011/readme-generator/tree/master/types.node_modules/npm-path.d.ts#L37-L39
23. https://github.com/sounisi5011/readme-generator/tree/master/types.node_modules/npm-path.d.ts#L39

34. https://github.com/sounisi5011/readme-generator/tree/master/.eslintrc.yaml#L9-L11
35. https://github.com/sounisi5011/readme-generator/tree/master/.eslintrc.yaml#L9-L11
36. https://github.com/sounisi5011/readme-generator/tree/master/.eslintrc.yaml#L9-L10

41. https://github.com/sounisi5011/readme-generator/tree/master/.prettierrc.yaml#L2-L11

51. http://example.com/path/to#L54
```

#### `repoBrowseURL`

*This filter is only defined if the generator was able to read the remote repository from [the `repository` field] of [`package.json`]*.

[Source](https://github.com/sounisi5011/readme-generator/tree/master/src/index.ts#L469-L494)

template:

```nunjucks
11. {{ '/.template/README.njk' | repoBrowseURL }}
12. {{ '/.template/README.njk' | repoBrowseURL(tag='foo') }}
13. {{ '/.template/README.njk' | repoBrowseURL(branch='gh-pages') }}
14. {{ '/.template/README.njk' | repoBrowseURL(commit='4626dfa') }}
15. {{ '/.template/README.njk' | repoBrowseURL(committish='COMMIT-ISH') }}

21. {{ '.template/README.njk' | repoBrowseURL }}

31. {{ './README.njk' | repoBrowseURL }}

41. {{ '../src/index.ts' | repoBrowseURL }}
```

output:

```
11. https://github.com/sounisi5011/readme-generator/tree/master/.template/README.njk
12. https://github.com/sounisi5011/readme-generator/tree/foo/.template/README.njk
13. https://github.com/sounisi5011/readme-generator/tree/gh-pages/.template/README.njk
14. https://github.com/sounisi5011/readme-generator/tree/4626dfa/.template/README.njk
15. https://github.com/sounisi5011/readme-generator/tree/COMMIT-ISH/.template/README.njk

21. https://github.com/sounisi5011/readme-generator/tree/master/.template/README.njk

31. https://github.com/sounisi5011/readme-generator/tree/master/.template/README.njk

41. https://github.com/sounisi5011/readme-generator/tree/master/src/index.ts
```

## Tests

To run the test suite, first install the dependencies, then run `npm test`:

```sh
npm install
npm test
```

## Contributing

see [CONTRIBUTING.md](https://github.com/sounisi5011/readme-generator/tree/master/CONTRIBUTING.md)
