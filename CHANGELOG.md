# Change Log

## 2.0.1 (2025-05-08)

### Bug Fixes

- Handle undefined `languageMappings` property in migration.

## 2.0.0 (2025-01-17)

### Breaking Changes

- Removed the `Remove extra spaces` feature because this bug has been fixed in Prettier version 3.4. Reference: [Prettier 3.4: A lot of bug fixes](https://prettier.io/blog/2024/11/26/3.4.0#remove-excessive-spaces-after-line-prefixes-for-unordered-lists-in-markdown-15526httpsgithubcomprettierprettierpull15526-by-tomasludvikhttpsgithubcomtomasludvik)

### Features

- Added the `Code block language mappings` feature to map the language in code blocks from one to another, allowing Prettier to format using the latter's syntax.
