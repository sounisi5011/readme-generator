# @sounisi5011/readme-generator

[![License: MIT](https://img.shields.io/static/v1?label=license&message=MIT&color=green)](https://github.com/sounisi5011/readme-generator/tree/master/LICENSE)
![Supported Node.js version: ^10.14.2 || 12.x || 14.x](https://img.shields.io/static/v1?label=node&message=%5E10.14.2%20%7C%7C%2012.x%20%7C%7C%2014.x&color=brightgreen)
[![Tested with Jest](https://img.shields.io/badge/tested_with-jest-99424f.svg)](https://github.com/facebook/jest)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Deploy with Ship.js](https://img.shields.io/badge/deploy-🛳%20Ship.js-blue?style=flat)](https://github.com/algolia/shipjs)
[![Dependencies Status](https://david-dm.org/sounisi5011/readme-generator/status.svg)](https://david-dm.org/sounisi5011/readme-generator)
[![Build Status](https://github.com/sounisi5011/readme-generator/workflows/GitHub%20Actions/badge.svg?branch=master)](https://github.com/sounisi5011/readme-generator/actions?query=workflow%3A%22GitHub%20Actions%22%20branch%3Amaster)
[![Maintainability Status](https://api.codeclimate.com/v1/badges/1aabcc39ecde1caeb45d/maintainability)](https://codeclimate.com/github/sounisi5011/readme-generator/maintainability)

CLI tool to generate `README.md` by using Nunjucks template file.

## Install

```sh
npm install --save-dev github:sounisi5011/readme-generator
```

## Usage

```console
$ readme-generator --help
readme-generator v0.0.7-rc.1

CLI tool to generate README.md by using Nunjucks template file

Usage:
  $ readme-generator [options]

Options:
  -V, -v, --version  Display version number 
  -h, --help         Display this message 
  --template <file>  Nunjucks template file path (default: readme-template.njk)
  --test             Test if README.md file is overwritten 
```

### Setting API token when using `@sounisi5011/readme-generator` with private repository

`@sounisi5011/readme-generator` reads the repository information (for example, a list of pushed tags). If you want to use it in a private repository, you need to set the API token according to the repository type.

#### GitHub

[Get a GitHub personal access token](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token#creating-a-token) and specify it in the environment variable `GITHUB_TOKEN`.

```console
$ GITHUB_TOKEN="..." readme-generator
```

If you use the `@sounisi5011/readme-generator` with GitHub Actions, you don't need to get a personal access token; you can use [`GITHUB_TOKEN` secret](https://docs.github.com/en/actions/reference/authentication-in-a-workflow#about-the-github_token-secret) in GitHub Actions.

```yaml
steps:
  - run: npx readme-generator
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### GitLab

Currently not supported.

#### Bitbucket

Currently not supported.

### Default Defined Variables

* `pkg` - [Source](https://github.com/sounisi5011/readme-generator/tree/master/src/main.ts#L198-L201) and [Source](https://github.com/sounisi5011/readme-generator/tree/master/src/utils/package-json.ts#L8-L23)

    Object value of `package.json`

* `repo` - [Source](https://github.com/sounisi5011/readme-generator/tree/master/src/main.ts#L40-L48)

    Object value indicating repository data.
    It is generate by reading [the `repository` field] of [`package.json`].

[`package.json`]: https://docs.npmjs.com/files/package.json
[the `repository` field]: https://docs.npmjs.com/files/package.json#repository

* `deps` - [Source](https://github.com/sounisi5011/readme-generator/tree/master/src/main.ts#L214-L215) and [Source](https://github.com/sounisi5011/readme-generator/tree/master/src/utils/installed-dependencies.ts)

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

[Source](https://github.com/sounisi5011/readme-generator/tree/master/src/template-filters/omitPackageScope.ts#L10-L15)

template:

```nunjucks
{{ '@foo/bar' | omitPackageScope }}
```

output:

```
bar
```

#### `npmURL`

[Source](https://github.com/sounisi5011/readme-generator/tree/master/src/template-filters/npmURL.ts#L19-L27)

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
- https://www.npmjs.com/package/nunjucks/v/3.2.2
- https://www.npmjs.com/package/@types/node/v/14.11.2
```

#### `execCommand`

[Source](https://github.com/sounisi5011/readme-generator/tree/master/src/template-filters/execCommand.ts#L21-L39)

template:

```nunjucks
{{ 'tsc --version' | execCommand }}
---
{{ ['eslint', '--version'] | execCommand }}
```

output:

```
Version 4.1.2
---
v7.14.0
```

#### `linesSelectedURL`

[Source](https://github.com/sounisi5011/readme-generator/tree/master/src/template-filters/linesSelectedURL.ts#L241-L267)

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

[Source](https://github.com/sounisi5011/readme-generator/tree/master/src/template-filters/repoBrowseURL.ts#L108-L135)

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

#### `isOlderReleasedVersion`

*This filter is only defined if the generator was able to read the remote repository from [the `repository` field] of [`package.json`]*.

Determines if a version has been released in a remote repository, and if the current commit is more recent than the version's corresponding tag.
The version detection is done using the same algorithm as the `#semver:<semver>` format of [the `npm install` command][npm-install].
There are three types of return values:

[npm-install]: https://docs.npmjs.com/cli/install

* `true` - If the specified version of a git tag exists in a remote repository and the current commit and git tag are different.
* `false`
    * If the specified version of a git tag exists in a remote repository and the current commit and git tag are same.
    * If the specified version of a git tag does not exist in the remote repository.
* `null`
    * If a remote repository does not exist.
    * If can't access a remote repository.
    * If the current directory is not a git repository.
    * Run the `git init` command, then haven't first committed yet.

[Source](https://github.com/sounisi5011/readme-generator/tree/master/src/template-filters/isOlderReleasedVersion.ts#L32-L43)

template:

```nunjucks
0.0.2: {{ '0.0.2' | isOlderReleasedVersion | dump }}
{{pkg.version}}: {{ pkg.version | isOlderReleasedVersion | dump }}
999.90.1: {{ '999.90.1' | isOlderReleasedVersion | dump }}
```

output:

```
0.0.2: true
0.0.7-rc.1: true
999.90.1: false
```

## Tests

To run the test suite, first install the dependencies, then run `npm test`:

```sh
npm install
npm test
```

## Contributing

see [CONTRIBUTING.md](https://github.com/sounisi5011/readme-generator/tree/master/CONTRIBUTING.md)
