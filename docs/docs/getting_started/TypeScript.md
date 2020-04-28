:::note
This guide is only useful if you are using Dynamoose with [TypeScript](https://typescriptlang.org). If you are using it with JavaScript as opposed to TypeScript, you can skip this page.
:::

## Summary

:::caution
Dynamoose [TypeScript](https://typescriptlang.org) Support is in **beta**.
:::

Dynamoose is built entirely in [TypeScript](https://typescriptlang.org) and ships with TypeScript Typings. This means that when using Dynamoose in TypeScript you will have access to all of the autocomplete and type safety features that TypeScript offers.

## Getting Started

In order to get started using Dynamoose in your TypeScript project, simply [install](Install) and [import (using ESModules)](Import) Dynamoose as described in the previous pages.

There is no need to install any additional `@types` package in order to use Dynamoose with TypeScript since the typings are included with the Dynamoose package.

After that, so long as you have TypeScript already setup on your project and text editor you should be ready to start using Dynamoose with TypeScript.

## FAQ

### What does beta mean in terms of TypeScript support?

TypeScript Beta Support means that typings might be wrong or missing. This can include things like incorrect types being used, missing methods/functions/properties, etc.

### Does TypeScript Support being in beta mean I shouldn't use it?

**NO**. We recommend using and testing TypeScript support despite it being in beta. It just means that you should be aware of incorrect or missing typings. If you notice any problems please submit a pull request or issue.

### Should I trust the documentation or TypeScript Typings more?

In the event the documentation and TypeScript typings don't line up or give different information, you should always consider the documentation as the primary source of truth. If you have reason to believe both are incorrrect or the TypeScript typings are more accurate than the documentation, please submit a pull request or issue.

### Is there any differences between using Dynamoose with TypeScript and JavaScript?

No. There is no differences between using Dynamoose with TypeScript and JavaScript, except stricter typings with TypeScript. The underlying behavior, API, and functionality of Dynamoose remains the exact same.

### What does TypeScript support mean? What typings are included?

TypeScript support includes support for all functions/methods, and properties of Dynamoose. It does **not** have typings or contracts between your Schema and Documents you create. All type checks between your Schema and Documents is handled at runtime as part of Dynamoose, and not part of the TypeScript typings.

At some point we hope to explore the potiental of adding typings to ensure your Documents conform to your Schemas. However this raises a lot of questions regarding if it's even possible to have such dynamic typings in TypeScript, as well as edge cases that have not been considered yet.

### What should I do if I have additional questions?

- [Contact me](https://charlie.fish/contact)
- Join our Slack
- Create an issue on the [Dynamoose repository](https://github.com/dynamoose/dynamoose)
