# Cydon Stylelint Config

## Usage
Within your [stylelint config object](https://stylelint.io/user-guide/configuration/#extends) You can extend this configuration. This will serve as a base for your config, then you can make overrides in your own config object:
```json
{
  "extends": ["@cydon/stylelint-config"],
  "rules": { }
}
```

## Documentation
Cydon Stylelint Config extends [stylelint-stylus/standard](https://stylus.github.io/stylelint-stylus) and [stylelint-config-recess-order](https://github.com/stormwarning/stylelint-config-recess-order) configurations