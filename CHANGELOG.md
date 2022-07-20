# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.2] - 2022-07-20
### Updated
- Disable crypto-browserify fallback and remove crypto warnings

## [1.2.1] - 2022-07-19
### Updated
- Added sjcl.js to noParse to remove extra dependencies
- Fixed an issue where node util was used instead of window.TextDecoder in browser env

## [1.2.0] - 2022-06-16
### Updated
- Added Webpack and Babel to build the package.
- Included node polyfills to support Webpack v5.
- Update tests to be run with Jest.

## [1.1.0] - 2022-05-06
### Updated
- Added option to set the macaroon version.

## [1.0.0] - 2021-03-06
### Updated
- Updated to handle v2 macaroons.

## [0.2.1] - 2018-10-15
### Updated
- Updated macaroon dependency to 3.0.3.

## [0.2.0] - 2018-06-28
### Added
- Initial release.
- Ported over all related code from the JAAS Lib repository (https://github.com/juju/jaaslibjs).
