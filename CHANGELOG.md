# Change Log

## [Unreleased]

* Remove `isReleasedVersion` filter
* Support diff view with `--test` option
* Fixed the template's error location

### Features

* [#50] - Support diff view with `--test` option

### Removed Features

* [#43] - Remove `isReleasedVersion` filter

### Bug Fixes

* [#51] - The number of lines in the error position must contain the frontmatter

### Updated Dependencies

#### devDependencies

* `@types/bent`
    * [#42] - `7.0.2` -> `7.3.0`
* `@typescript-eslint/eslint-plugin`
    * [#38] - `3.2.0` -> `3.10.1`
* `@typescript-eslint/parser`
    * [#38] - `3.2.0` -> `3.10.1`
* `eslint`
    * [#38] - `7.2.0` -> `7.7.0`
* `eslint-plugin-dprint`
    * [#38] - `0.2.3` -> `0.3.0`
* `eslint-plugin-import`
    * [#38] - `2.21.2` -> `2.22.0`
* `eslint-plugin-jest`
    * [#38] - `23.13.2` -> `23.20.0`
* `lint-staged`
    * [#39] - `10.2.10` -> `10.2.13`
* `prettier`
    * [#39] - `2.0.5` -> `2.1.0`

### Added Dependencies

#### dependencies

* ~~[#50] - `@types/diff@^4.0.2`~~
    *moved to `devDependencies` by [#55]*
* [#50] - `chalk@^4.1.0`
* [#50] - `diff@^4.0.2`

#### devDependencies

* [#50], [#55] - `@types/diff@4.0.2`
* [#45] - `@types/semver@7.3.1`
* [#45] - `expect@26.1.0`
* [#46] - `jest-extended@0.11.5`
* [#50] - `omit.js@2.0.2`
* [#45] - `semver@7.3.2`
* [#50] - `strip-ansi@6.0.0`

### Internal API

* [#45] - Use `fs.promises` API instead of `fs` API

### Tests

* [#46] - Introduce jest-extended

### Others

* [#54] - Add `.vscode/extensions.json`
* [#56] - Add the packages added to devDependencies to the Renovate Bot group

[Unreleased]: https://github.com/sounisi5011/readme-generator/compare/v0.0.4...master
[#43]: https://github.com/sounisi5011/readme-generator/pull/43
[#45]: https://github.com/sounisi5011/readme-generator/pull/45
[#42]: https://github.com/sounisi5011/readme-generator/pull/42
[#46]: https://github.com/sounisi5011/readme-generator/pull/46
[#50]: https://github.com/sounisi5011/readme-generator/pull/50
[#51]: https://github.com/sounisi5011/readme-generator/pull/51
[#54]: https://github.com/sounisi5011/readme-generator/pull/54
[#55]: https://github.com/sounisi5011/readme-generator/pull/55
[#38]: https://github.com/sounisi5011/readme-generator/pull/38
[#39]: https://github.com/sounisi5011/readme-generator/pull/39
[#56]: https://github.com/sounisi5011/readme-generator/pull/56

## [0.0.4] - 2020-06-13 UTC

* If the version has already been released, use a URL to the master branch.
* Add `isReleasedVersion` and `isOlderReleasedVersion` filters
* Add Dependencies

### Features

* [#31], [#36] - Change the version tag of the repository URL to the master branch
* [#31] - <del>Add `repo.isReleasedVersion(version: string): boolean | null` function</del>
* [#36] - Add `isReleasedVersion` filter
* [#31] - <del>Add `repo.isOlderReleasedVersion(version: string): boolean | null` function</del>
* [#36] - Add `isOlderReleasedVersion` filter

### Updated Dependencies

#### devDependencies

* `@types/jest`
    * [#29] - `25.2.3` -> `26.0.0`
* `eslint-plugin-import`
    * [#30] - `2.21.1` -> `2.21.2`
* `lint-staged`
    * [#35] - `10.2.9` -> `10.2.10`

### Added Dependencies

#### dependencies

* [#31] - `@npmcli/git@2.0.2`
* [#36] - `bent@7.3.2`

#### devDependencies

* [#36] - `@types/bent@7.0.2`
* [#31] - `@types/promise-retry@1.1.3`
* [#34] - `eslint-config-standard-with-typescript@18.0.2`

### Removed Dependencies

#### devDependencies

* [#34] - `eslint-plugin-simple-import-sort@5.0.3`

### Tests

* [#28] - Test timeout on Jest change to 15 seconds

### Others

* [#34] - Update ESLint rules
* [#36] - Fetching Remote Repository Tags with the API

[0.0.4]: https://github.com/sounisi5011/readme-generator/compare/v0.0.3...v0.0.4
[#28]: https://github.com/sounisi5011/readme-generator/pull/28
[#31]: https://github.com/sounisi5011/readme-generator/pull/31
[#34]: https://github.com/sounisi5011/readme-generator/pull/34
[#36]: https://github.com/sounisi5011/readme-generator/pull/36
[#35]: https://github.com/sounisi5011/readme-generator/pull/35
[#29]: https://github.com/sounisi5011/readme-generator/pull/29
[#30]: https://github.com/sounisi5011/readme-generator/pull/30

## [0.0.3] - 2020-06-09 UTC

* Add `setProp` tag
* Drop support for Node.js v13
* Update code style

### Features

* [#24] - Add `setProp` tag in Nunjucks template

### Supported Node version

`^10.14.2 || 12.x || 13.x || 14.x` -> `^10.14.2 || 12.x || 14.x`

* [#21] - Drop support for Node.js v13

### Updated Dependencies

#### devDependencies

* `@typescript-eslint/eslint-plugin`
    * [#17] - `3.0.2` -> `3.2.0`
* `@typescript-eslint/parser`
    * [#17] - `3.0.2` -> `3.2.0`
* `eslint`
    * [#2] - `6.8.0` -> `7.2.0`
* `eslint-plugin-import`
    * [#17] - `2.20.2` -> `2.21.1`
* `lint-staged`
    * [#15] - `10.2.6` -> `10.2.9`
* `package-version-git-tag`
    * [#18] - `2.1.0` -> `3.0.0`
* `ts-jest`
    * [#16] - `26.0.0` -> `26.1.0`
* `ts-node`
    * [#14] - `8.10.1` -> `8.10.2`
* `type-fest`
    * [#16] - `0.15.0` -> `0.15.1`
* `typescript`
    * [#25] - `3.9.3` -> `3.9.5`

### Added Dependencies

#### devDependencies

* [#26] - `@dprint/core@0.9.0`
* [#23] - `check-peer-deps@1.1.3`
* [#26] - `dprint-plugin-typescript@0.20.4`
* [#26] - `eslint-plugin-dprint@0.2.3`
* [#23] - `patch-package@6.2.2`

### Removed Dependencies

#### devDependencies

* [#23] - `@sounisi5011/check-peer-deps`
* [#26] - `eslint-config-prettier@6.11.0`
* [#26] - `eslint-plugin-prettier@3.1.3`

### Others

* [#19] - Fix GitHub Actions trigger
* [#20] - Update linter rules and package settings
* [#22] - Report completion of all jobs in GitHub Actions with status check
* [#23] - Migrate from @sounisi5011/check-peer-deps to check-peer-deps
* [#26] - Introduce dprint

[0.0.3]: https://github.com/sounisi5011/readme-generator/compare/v0.0.2...v0.0.3
[#19]: https://github.com/sounisi5011/readme-generator/pull/19
[#21]: https://github.com/sounisi5011/readme-generator/pull/21
[#20]: https://github.com/sounisi5011/readme-generator/pull/20
[#22]: https://github.com/sounisi5011/readme-generator/pull/22
[#23]: https://github.com/sounisi5011/readme-generator/pull/23
[#24]: https://github.com/sounisi5011/readme-generator/pull/24
[#26]: https://github.com/sounisi5011/readme-generator/pull/26
[#17]: https://github.com/sounisi5011/readme-generator/pull/17
[#2]:  https://github.com/sounisi5011/readme-generator/pull/2
[#25]: https://github.com/sounisi5011/readme-generator/pull/25
[#15]: https://github.com/sounisi5011/readme-generator/pull/15
[#14]: https://github.com/sounisi5011/readme-generator/pull/14
[#16]: https://github.com/sounisi5011/readme-generator/pull/16
[#18]: https://github.com/sounisi5011/readme-generator/pull/18

## [0.0.2] - 2020-05-28 UTC

### Bug Fixes

* [#12] - Fails if README.md file does not exist when "--test" option is specified ([9bf11cb])
* [#12] - Fix error message ([a833b62])

### Supported Node version

`10.x || 12.x || 13.x || 14.x` -> `^10.14.2 || 12.x || 13.x || 14.x`

* [#12] - Introduce unit test for Jest

### Documentation

* [#5] - Update markdown syntax

### Updated Dependencies

#### devDependencies

* `@typescript-eslint/eslint-plugin`
    * [#4] - `3.0.0` -> `3.0.2`
* `@typescript-eslint/parser`
    * [#4] - `3.0.0` -> `3.0.2`
* `sort-package-json`
    * [#11] - `1.42.2` -> `1.44.0`
* `typescript`
    * [#1] - `3.7.5` -> `3.9.3`

### Tests

* [#6] - Introduce CI for GitHub Actions
* [#7] - Add GitHub Actions badge
* [#12] - Introduce unit test for Jest

### Others

* [#8] - Rename Renovate configuration file to dot file
* [#9] - Include .js files in ESLint target
* [#10] - Introduce Code Climate

[0.0.2]: https://github.com/sounisi5011/readme-generator/compare/v0.0.1...v0.0.2
[#5]: https://github.com/sounisi5011/readme-generator/pull/5
[#6]: https://github.com/sounisi5011/readme-generator/pull/6
[#7]: https://github.com/sounisi5011/readme-generator/pull/7
[#8]: https://github.com/sounisi5011/readme-generator/pull/8
[#9]: https://github.com/sounisi5011/readme-generator/pull/9
[#10]: https://github.com/sounisi5011/readme-generator/pull/10
[#4]:  https://github.com/sounisi5011/readme-generator/pull/4
[#1]:  https://github.com/sounisi5011/readme-generator/pull/1
[#11]: https://github.com/sounisi5011/readme-generator/pull/11
[#12]: https://github.com/sounisi5011/readme-generator/pull/12
[9bf11cb]: https://github.com/sounisi5011/readme-generator/pull/12/commits/9bf11cbd5b414b2cd95f82db53a929464ae1a8e6
[a833b62]: https://github.com/sounisi5011/readme-generator/pull/12/commits/a833b62b1f323b876dbb79c59b082dc2c90e57ee

## [0.0.1] - 2020-05-24 UTC

[0.0.1]: https://github.com/sounisi5011/readme-generator/tree/v0.0.1
