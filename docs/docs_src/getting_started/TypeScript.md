:::note
This guide is only useful if you are using Dynamoose with [TypeScript](https://typescriptlang.org). If you are using it with JavaScript as opposed to TypeScript, you can skip this page.
:::

## Summary

:::caution
Dynamoose [TypeScript](https://typescriptlang.org) Support is in **beta**.
:::

Dynamoose is built entirely in [TypeScript](https://typescriptlang.org) and ships with TypeScript Typings. This means that when using Dynamoose in TypeScript you will have access to all of the autocomplete and type safety features that TypeScript offers.

## Install Dependency
```bash
# npm
npm install dynamoose-decorator

# Yarn
yarn add dynamoose-decorator
```

Your `tsconfig.json` needs the following flags:
```json
"target": "es6", // or a more recent ecmascript version
"experimentalDecorators": true,
"emitDecoratorMetadata": true
```

## Usage
This defines the schema of dynamoose using classes and decorators. The usage is similar to dynamoose, but let me provide an example!
```typescript
import {
	HashKey,
	Attribute,
	Required,
	Index,
	CreatedAt,
	UpdatedAt,
	Model,
	Storage,
} from 'dynamoose-decorator';
import { Item } from 'dynamoose/dist/Item';

@Model({ throughput: 'ON_DEMAND', waitForActive: false })
class User extends Item {
	@HashKey()
	@Attribute()
	id: string;

	@Index({ name: 'emailIndex' })
	@Required()
	@Attribute()
	email: string;

	@Index({ name: 'nameIndex' })
	@Required()
	@Attribute()
	name: string;

	@Index({ name: 'companyAndScoreIndex', rangeKey: 'score' })
	@Attribute()
	company: string;

	@Attribute()
	score: number;

	@Storage('milliseconds')
	@CreatedAt()
	@Attribute()
	createdAt: Date;

	@Storage('milliseconds')
	@UpdatedAt()
	@Attribute()
	updatedAt: Date;
}

const UserModel = getModel(User)

const user = new UserModel();
user.id = 'bf02318d-4029-4474-a7a0-e957eb176d75';
user.email = 'test@dynamoose.com';
user.name = 'DYNAMOOSE';
user.company = 'Amazon';
user.score = 3;
await user.save();
```

## FAQ

### What does beta mean in terms of TypeScript support?

TypeScript Beta Support means that typings might be wrong or missing. This can include things like incorrect types being used, missing methods/functions/properties, etc.

### Does TypeScript Support being in beta mean I shouldn't use it?

**NO**. We recommend using and testing TypeScript support despite it being in beta. It just means that you should be aware of incorrect or missing typings. If you notice any problems please submit a pull request or issue.

### Should I trust the documentation or TypeScript Typings more?

In the event the documentation and TypeScript typings don't line up or give different information, you should always consider the documentation as the primary source of truth. If you have reason to believe both are incorrect or the TypeScript typings are more accurate than the documentation, please submit a pull request or issue.

### Is there any differences between using Dynamoose with TypeScript and JavaScript?

No. There is no differences between using Dynamoose with TypeScript and JavaScript, except stricter typings with TypeScript. The underlying behavior, API, and functionality of Dynamoose remains the exact same.

### What does TypeScript support mean? What typings are included?

TypeScript support includes support for all functions/methods, and properties of Dynamoose. Additionally, it manages schemas using classes and decorators, providing more readable handling of type checks and index specifications for items. Type checking occurs during TypeScript compile time.

### What should I do if I have additional questions?

- [dynamoose-decorator](https://github.com/p1ayground/dynamoose-decorator/issues)
- [Contact me](https://charlie.fish/contact)
- Join our Slack
- Create an issue on the [Dynamoose repository](https://github.com/dynamoose/dynamoose)
