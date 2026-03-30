# [1.2.0](https://github.com/jwill824/tilde/compare/v1.1.0...v1.2.0) (2026-03-30)


### Bug Fixes

* **ci:** switch to wrangler-action@v3 for Pages deploy (recommended approach) ([0671768](https://github.com/jwill824/tilde/commit/0671768147dd1d3f5bfd00756bce723a0d0e86c2))
* correct required_linear_history typo in branch protection ([c1fcc95](https://github.com/jwill824/tilde/commit/c1fcc950d9811a7a7d5aef98b0666209ae3475a5))
* rename prod environment to production; exclude terraform from CI ([ce0e616](https://github.com/jwill824/tilde/commit/ce0e61652a23df5311e4c6600e3d01baef12e4cd))
* **site:** apply post-analysis remediation (G2, I1, G1) ([7b9b257](https://github.com/jwill824/tilde/commit/7b9b257ce6547ce4dc4d4a545868db3ae9aa793e))
* **terraform:** lower required_version to >= 1.5 for TFC compatibility ([401fcbd](https://github.com/jwill824/tilde/commit/401fcbdc04b6a72591c381c1fc6a66c928a91b50))
* **terraform:** rename cloudflare_record to cloudflare_dns_record ([503a835](https://github.com/jwill824/tilde/commit/503a8354a24d20ec2c79d065d8f6cf7627f9b303))


### Features

* **site:** implement get.tilde.sh landing + docs.tilde.sh scaffold ([91a08b7](https://github.com/jwill824/tilde/commit/91a08b7255000ca286e208bafb17e42a4432061b))
* **terraform:** add IaC for Cloudflare Pages and GitHub repo ([16bb867](https://github.com/jwill824/tilde/commit/16bb86781fe8a4d5ab2c1973aae62c0315ec194b))
* **terraform:** manage prod GitHub environment and secrets via IaC ([0568f4f](https://github.com/jwill824/tilde/commit/0568f4f6f242f12fd7414d2b939d57770b773f7a))
* UI/UX and branding consolidation ([#29](https://github.com/jwill824/tilde/issues/29)) ([26255f7](https://github.com/jwill824/tilde/commit/26255f777f0065ca006f1edfd3ad8f1292e6cb69)), closes [#22](https://github.com/jwill824/tilde/issues/22) [#20](https://github.com/jwill824/tilde/issues/20) [#21](https://github.com/jwill824/tilde/issues/21) [#22](https://github.com/jwill824/tilde/issues/22) [#23](https://github.com/jwill824/tilde/issues/23) [#24](https://github.com/jwill824/tilde/issues/24) [#24](https://github.com/jwill824/tilde/issues/24) [#26](https://github.com/jwill824/tilde/issues/26) [#28](https://github.com/jwill824/tilde/issues/28)

# [1.1.0](https://github.com/jwill824/tilde/compare/v1.0.1...v1.1.0) (2026-03-28)


### Bug Fixes

* **002:** address speckit.analyze findings (I1-I4, C1-C3, A1) ([df255e4](https://github.com/jwill824/tilde/commit/df255e49b2a5bf9aa42e25626eeecaf559c9c273))
* **lint:** resolve no-undef NodeJS and no-useless-escape in regex ([585ed87](https://github.com/jwill824/tilde/commit/585ed879778cd2dd35804fc092c4b90e1199e8d5))
* **release:** add repository, homepage, and bugs fields to package.json ([232edfd](https://github.com/jwill824/tilde/commit/232edfd3e49adab5ef3df6ba67c70ebf6dabad23))


### Features

* **002:** dynamic splash, --reconfigure flag, config schema versioning ([1ab000f](https://github.com/jwill824/tilde/commit/1ab000fdd3fd3cbaaeb60610afb07b291fa85cc1))

## [1.0.1](https://github.com/jwill824/tilde/compare/v1.0.0...v1.0.1) (2026-03-28)


### Bug Fixes

* remove leading ./ from bin path (npm pkg fix) ([b1a3906](https://github.com/jwill824/tilde/commit/b1a390698c759edc85d88d2d17ed64925fad4912))

# 1.0.0 (2026-03-28)


### Bug Fixes

* address critical/high analysis findings (C1-C3, H1-H5) ([b5b095e](https://github.com/jwill824/tilde/commit/b5b095e70ad0865909f86f066e3991a841df7a1e))
* align vitest and @vitest/coverage-v8 to v4 to fix CI npm ci failure ([5ea4be4](https://github.com/jwill824/tilde/commit/5ea4be4d0995eec9b4a204026d17fd03b44f88b1))
* auto-detect tilde.config.json in cwd for config-first mode ([da9ed1a](https://github.com/jwill824/tilde/commit/da9ed1a8e6866ac8ab05255db795f52946c64582)), closes [#2](https://github.com/jwill824/tilde/issues/2)
* bump CI to Node 22 for semantic-release compatibility; sync lock file ([f33d5f2](https://github.com/jwill824/tilde/commit/f33d5f2f954118e08a816cc98f4f20962fa1ba67))
* remove eslint-plugin-react-hooks (incompatible with eslint v10) ([5ab5527](https://github.com/jwill824/tilde/commit/5ab55271240c0bf75187e08c14b48da19b10916e))
* rename npm package to @jwill824/tilde; add publishConfig ([1facad7](https://github.com/jwill824/tilde/commit/1facad785890cf661e45c15d517bebd6e6cc0403))
* resolve all CI lint failures and align integration test to vfox-only list ([e727267](https://github.com/jwill824/tilde/commit/e7272678f7f7f75a7d48b98f3e161d9f6eb3ed61))
* use npm ci --legacy-peer-deps in CI to match lock file resolution ([7031588](https://github.com/jwill824/tilde/commit/703158899e0c6aa7579e346c05739deba54bbc06))


### Features

* **001:** implement Phases 1-3 (T001-T051) — MVP macOS bootstrap wizard ([d5456f7](https://github.com/jwill824/tilde/commit/d5456f796e8363a15fdf156cb6a2e8f6af2ba87e))
* add GitHub Actions CI, semantic-release versioning, and npm publish ([046837a](https://github.com/jwill824/tilde/commit/046837af9400b73ab3a14839ef05b32a87565e5e))
* add startup splash screen with ASCII art logo and version ([4d8d86f](https://github.com/jwill824/tilde/commit/4d8d86fb73db8faa686484b9eb96dd7a335797be))
* Phase 4 - environment capture (T052-T060) ([4f41a1c](https://github.com/jwill824/tilde/commit/4f41a1cf80611c8b03f9eafacf9752e0a99df716))
* Phase 5 - config-first restore mode (T061-T068) ([051b3e9](https://github.com/jwill824/tilde/commit/051b3e9239a800798151804d8c611e4fa9de182e))
* Phase 6 - context-aware environment switching (T069-T075) ([bed3b37](https://github.com/jwill824/tilde/commit/bed3b370e9ea12f51ace6616b2afbd49c0a94112))
* Phase 7 - polish, CLI subcommands, security audit (T076-T090) ([f57983c](https://github.com/jwill824/tilde/commit/f57983cc23d2faeeeb09481cdcfe54b1735a7105)), closes [#cli](https://github.com/jwill824/tilde/issues/cli)
* wave-animated splash screen with Copilot CLI scroll-up effect ([d482c70](https://github.com/jwill824/tilde/commit/d482c705545c17df9901241247558e135699de02))
