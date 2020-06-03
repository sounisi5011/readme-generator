# Change Log

## [Unreleased]

* Drop support for Node.js v13

### Supported Node version

`^10.14.2 || 12.x || 13.x || 14.x` -> `^10.14.2 || 12.x || 14.x`

* [#21] - Drop support for Node.js v13

### Added Dependencies

#### devDependencies

* [#23] - `check-peer-deps@1.1.3`
* [#23] - `patch-package@6.2.2`

### Removed Dependencies

#### devDependencies

* [#23] - `@sounisi5011/check-peer-deps`

### Others

* [#19] - Fix GitHub Actions trigger
* [#20] - Update linter rules and package settings
* [#22] - Report completion of all jobs in GitHub Actions with status check
* [#23] - Migrate from @sounisi5011/check-peer-deps to check-peer-deps

[Unreleased]: https://github.com/sounisi5011/readme-generator/compare/v0.0.2...master
[#19]: https://github.com/sounisi5011/readme-generator/pull/19
[#21]: https://github.com/sounisi5011/readme-generator/pull/21
[#20]: https://github.com/sounisi5011/readme-generator/pull/20
[#22]: https://github.com/sounisi5011/readme-generator/pull/22
[#23]: https://github.com/sounisi5011/readme-generator/pull/23

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
