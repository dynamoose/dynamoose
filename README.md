<p align="center">
	<img src="internal/banner/Banner.png" width="400" max-width="90%" alt="Dynamoose" />
</p>

<p align="center">
	<a href="https://www.npmjs.com/package/dynamoose">
		<img src="https://img.shields.io/npm/v/dynamoose" alt="npm">
	</a>
	<a href="https://github.com/dynamoose/dynamoose/blob/main/LICENSE">
		<img src="https://img.shields.io/github/license/dynamoose/dynamoose" alt="License">
	</a>
	<a href="https://www.npmjs.com/package/dynamoose">
		<img src="https://img.shields.io/npm/dw/dynamoose" alt="npm Downloads">
	</a>
	<a href="https://github.com/dynamoose/dynamoose/blob/main/SPONSOR.md">
		<img src="https://img.shields.io/badge/sponsor-Dynamoose-brightgreen" alt="Sponsor Dynamoose">
	</a>
	<a href="https://github.com/dynamoose/dynamoose/actions">
		<img src="https://github.com/dynamoose/dynamoose/workflows/CI/badge.svg" alt="CI">
	</a>
	<a href="https://coveralls.io/github/dynamoose/dynamoose?branch=main">
		<img src="https://coveralls.io/repos/github/dynamoose/dynamoose/badge.svg?branch=main" alt="Coverage Status">
	</a>
	<a href="https://crowdin.com/project/dynamoosejscom">
		<img src="https://badges.crowdin.net/dynamoosejscom/localized.svg" alt="Crowdin Translation Status">
	</a>
	<a href="https://join.slack.com/t/dynamoose/shared_invite/enQtODM4OTI0MTc1NDc3LWI3MmNhMThmNmJmZDk5MmUxOTZmMGEwNGQzNTRkMjhjZGJlNGM5M2JmZjMzMzlkODRhMGY3MTQ5YjQ2Nzg3YTY">
		<img src="https://img.shields.io/badge/chat-on%20slack-informational.svg" alt="Slack Chat">
	</a>
	<a href="https://charlie.fish/contact">
		<img src="https://img.shields.io/badge/contact-me-blue" alt="Contact">
	</a>
	<a rel="me" href="https://mastodon.social/@dynamoose">
		<img alt="Mastodon Follow" src="https://img.shields.io/mastodon/follow/110203918766866705?style=social">
	</a>
	<a href="https://twitter.com/DynamooseJS">
		<img src="https://img.shields.io/twitter/follow/dynamoosejs?style=social" alt="Twitter">
	</a>
</p>

---

Dynamoose is a modeling tool for Amazon's DynamoDB (inspired by [Mongoose](https://mongoosejs.com/)).

### Dynamoose is Sponsored by Dynobase

Dynobase helps you accelerate your DynamoDB workflow with code generation, faster data exploration, bookmarks and more: [https://dynobase.dev/](https://dynobase.dev/?ref=dynamoose)

### Getting Started

<!-- start-block:a1507dd3-6aff-4885-a9fd-14d46a4b7743 -->
#### Description

Dynamoose is a modeling tool for Amazon's DynamoDB. Dynamoose is heavily inspired by [Mongoose](https://mongoosejs.com/), which means if you are coming from Mongoose the syntax will be very familiar.

#### Key Features

- Type safety
- High level API
- Easy to use syntax
- DynamoDB Single Table Design Support
- Ability to transform data before saving or retrieving items
- Strict data modeling (validation, required attributes, and more)
- Support for DynamoDB Transactions
- Powerful Conditional/Filtering Support
- Callback & Promise support
- AWS Multi-region support
<!-- end-block:a1507dd3-6aff-4885-a9fd-14d46a4b7743 -->

<!-- start-block:1baa7441-d01a-40e2-80d7-71ce05674ec9 -->
#### Example

```ts
import * as dynamoose from "dynamoose";
import * as crypto from "crypto";

// Create a new Dynamoose model
const Book = dynamoose.model("Book", {
	"id": {
		"type": String,
		"hashKey": true,
		"default": () => crypto.randomUUID()
	},
	"title": {
		"type": String,
		"required": true
	},
	"author": {
		"type": String,
		"required": true
	},
	"publishedDate": {
		"type": Date,
		"required": true
	},
	"genre": {
		"type": String,
		"required": true,
		"enum": [
			"fantasy",
			"sci-fi",
			"mystery",
			"thriller",
			"romance",
			"non-fiction",
			"horror",
			"biography",
			"autobiography",
			"poetry",
			"children's",
			"young-adult",
			"other"
		]
	},
	"summary": String,
	"pageCount": Number
});

// Add a new item to the Book table
const newBook = new Book({
	"title": "Harry Potter and the Philosopher's Stone",
	"author": "J.K. Rowling",
	"publishedDate": new Date("1997-06-26"),
	"genre": "fantasy",
	"summary": "The story of a young wizard who discovers he is a wizard and attends a magical school.",
	"pageCount": 223
});
await newBook.save();

// Retrieve all items from the Book table
const allBooks = await Book.scan().exec();
console.log(allBooks);
```
<!-- end-block:1baa7441-d01a-40e2-80d7-71ce05674ec9 -->

### Resources

#### General

- [Website](https://dynamoosejs.com)
- [Sponsor](SPONSOR.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Changelog](CHANGELOG.md)
- [License](LICENSE)

#### Social

- [Slack](https://join.slack.com/t/dynamoose/shared_invite/enQtODM4OTI0MTc1NDc3LWI3MmNhMThmNmJmZDk5MmUxOTZmMGEwNGQzNTRkMjhjZGJlNGM5M2JmZjMzMzlkODRhMGY3MTQ5YjQ2Nzg3YTY)
- <a rel="me" href="https://mastodon.social/@dynamoose">Mastodon</a>
- [Twitter](https://twitter.com/DynamooseJS)

### Branch Strategy

Below you will find the current branch strategy for the project. Work taking place on the branches listed below might be further ahead than the versions on NPM. All documentation links found below will also be reflective of the published version on NPM. If you would like to live dangerously and run non-released versions, you can run `npm install dynamoose/dynamoose#BRANCH` (replacing `BRANCH` with the branch listed below). You will also find the most up-to-date documentation in the `docs` folder of the branch.

| Branch | Version | NPM Tag | Links |
| --- | --- | --- | --- |
| [`main`](https://github.com/dynamoose/dynamoose/tree/main) | 4.x.x |   | - [Documentation](https://dynamoose.pages.dev) |
| [`v3`](https://github.com/dynamoose/dynamoose/tree/v3) | 3.3.x |   | - [Documentation](https://v3.dynamoose.pages.dev) |
| [`v3.3.0` (tag)](https://github.com/dynamoose/dynamoose/tree/v3.3.0) | 3.3.0 | latest-3 | - [Documentation](https://v3.dynamoosejs.com) |
| [`v2`](https://github.com/dynamoose/dynamoose/tree/v2) | 2.8.x |   | - [Documentation](https://v2.dynamoose.pages.dev) |
| [`v2.8.8` (tag)](https://github.com/dynamoose/dynamoose/tree/v2.8.8) | 2.8.8 | latest-2 | - [Documentation](https://v2.dynamoosejs.com)
