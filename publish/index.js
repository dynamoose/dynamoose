const inquirer = require("inquirer");
const fs = require("fs").promises;
const git = require("simple-git/promise")();
const openurl = require("openurl");
const utils = require("../lib/utils");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const retrieveInformation = require("./information/retrieve");
const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({
	"auth": process.env.GITHUBAUTH
});
const path = require("path");
const ora = require("ora");
const os = require("os");
const npmFetch = require("npm-registry-fetch");
let package = require("../package.json");

(async function main() {
	console.log("Welcome to the Dynamoose Publisher!\n\n\n");
	if (!await checkCleanWorkingDir()) {
		console.error("You must have a clean working directory in order to use this tool.");
		console.error("Exiting.\n");
		process.exit(1);
	}
	if (!process.env.GITHUBAUTH) {
		console.error("You must set `GITHUBAUTH` in order to use this tool.");
		console.error("Exiting.\n");
		process.exit(1);
	}
	const originalBranch = (await git.status()).current;
	let results = await inquirer.prompt([
		{
			"name": "branch",
			"type": "list",
			"message": "What branch would you like to publish?",
			"choices": (await git.branchLocal()).all,
			"default": originalBranch
		}
	]);
	await git.checkout(results.branch);
	package = require("../package.json");
	results = { // eslint-disable-line require-atomic-updates
		...results,
		...await inquirer.prompt([
			{
				"name": "version",
				"type": "input",
				"message": "What version would you like to publish?",
				"default": package.version,
				"validate": (val) => val !== package.version ? true : `${val} is the current version in the package.json. Please pick a new version to publish.`
			},
			{
				"name": "isPrerelease",
				"type": "confirm",
				"message": "Is this version a prerelease version?",
				"default": (res) => retrieveInformation(res.version).isPrerelease
			},
			{
				"name": "confirm",
				"type": "confirm",
				"message": "Does all of the information look correct?",
				"default": false
			}
		])
	};
	process.stdin.resume();
	if (!results.confirm) {
		console.error("No action has been taken.");
		console.error("Exiting.\n");
		process.exit(1);
	}

	// Create new branch
	const branch = `version/${results.version}`;
	const branchSpinner = ora(`Creating branch ${branch}`).start();
	await git.checkoutBranch(branch, results.branch);
	branchSpinner.succeed(`Created branch ${branch}`);
	// Update version in package.json
	const updateVersion = async (file) => {
		const currentPath = path.join(__dirname, "..", file);
		let fileContents = await fs.readFile(currentPath);
		const fileContentsJSON = JSON.parse(fileContents);
		fileContentsJSON.version = results.version;
		fileContents = JSON.stringify(fileContentsJSON, null, 2);
		await fs.writeFile(currentPath, `${fileContents}\n`);
	};
	const packageUpdateVersionsSpinner = ora("Updating versions in package.json & package-lock.json files").start();
	await Promise.all(["package.json", "package-lock.json"].map(updateVersion));
	packageUpdateVersionsSpinner.succeed("Updated versions in package.json & package-lock.json files");
	// Add, Commit & Push files to Git
	const gitCommit = ora("Committing files to Git").start();
	await git.commit(`Bumping version to ${results.version}`, ["package.json", "package-lock.json"].map((file) => path.join(__dirname, "..", file)));
	gitCommit.succeed("Committed files to Git");
	const gitPush = ora("Pushing files to GitHub").start();
	await git.push("origin", branch);
	gitPush.succeed("Pushed files to GitHub");
	// Changelog
	console.log("This tool will now open a web browser with a list of commits since the last verison.\nPlease use this information to fill out a change log.\n");
	console.log("Press any key to proceed.");
	await keypress();
	openurl.open(`https://github.com/dynamoosejs/dynamoose/compare/v${package.version}...${results.branch}`);
	const versionInfo = retrieveInformation(results.version);
	const versionFriendlyTitle = `Version ${[versionInfo.main, utils.capitalize_first_letter(versionInfo.tag || ""), versionInfo.tagNumber].filter((a) => Boolean(a)).join(" ")}`;
	const changelogFilePath = path.join(os.tmpdir(), `${results.version}-changelog.md`);
	const changelogTemplate = `## ${versionFriendlyTitle}\n\n${await fs.readFile(path.join(__dirname, "CHANGELOG_TEMPLATE.md"), "utf8")}`;
	await fs.writeFile(changelogFilePath, changelogTemplate);
	await exec(`code ${changelogFilePath}`);
	const pendingChangelogSpinner = ora("Waiting for user to finish changelog, press enter to continue.").start();
	await keypress();
	pendingChangelogSpinner.succeed("Finished changelog");
	const versionChangelog = (await fs.readFile(changelogFilePath, "utf8")).trim();
	if (!versionInfo.isPrerelease) {
		const existingChangelog = await fs.readFile(path.join(__dirname, "..", "CHANGELOG.md"), "utf8");
		const existingChangelogArray = existingChangelog.split("\n---\n");
		existingChangelogArray.splice(1, 0, `\n${versionChangelog}\n`);
		await fs.writeFile(path.join(__dirname, "..", "CHANGELOG.md"), existingChangelogArray.join("\n---\n"));
		const gitCommit2 = ora("Committing files to Git").start();
		await git.commit(`Adding changelog for ${results.version}`, [path.join(__dirname, "..", "CHANGELOG.md")]);
		gitCommit2.succeed("Committed files to Git");
		const gitPush2 = ora("Pushing files to GitHub").start();
		await git.push("origin", branch);
		gitPush2.succeed("Pushed files to GitHub");
	}
	// Create PR
	const gitPR = ora("Creating PR on GitHub").start();
	const pr = (await octokit.pulls.create({
		"owner": "dynamoosejs",
		"repo": "dynamoose",
		"title": versionFriendlyTitle,
		"body": versionChangelog,
		"labels": ["version"],
		"head": branch,
		"base": results.branch
	})).data;
	gitPR.succeed(`Created PR ${pr.number} on GitHub`);
	openurl.open(`https://github.com/dynamoosejs/dynamoose/pull/${pr.number}`);
	// Poll for PR to be merged
	const gitPRPoll = ora(`Polling GitHub for PR ${pr.number} to be merged`).start();
	await isPRMerged(pr.number);
	gitPRPoll.succeed(`PR ${pr.number} has been merged`);
	// Create release
	const gitRelease = ora("Creating release on GitHub").start();
	await octokit.repos.createRelease({
		"owner": "dynamoosejs",
		"repo": "dynamoose",
		"tag_name": `v${results.version}`,
		"target_commitish": results.branch,
		"name": `v${results.version}`,
		"body": versionChangelog,
		"prerelease": versionInfo.isPrerelease
	});
	gitRelease.succeed("GitHub release created");
	// Poll NPM for release
	const npmPoll = ora("Polling NPM for release").start();
	await isReleaseSubmitted(results.version);
	npmPoll.succeed("Version successfully published to NPM");
	// Restore Git to original state
	const gitCheckoutOriginal = ora(`Checking out ${originalBranch} branch`).start();
	await git.checkout(originalBranch);
	gitCheckoutOriginal.succeed(`Checked out ${originalBranch} branch`);
	const gitDeleteNewBranch = ora(`Deleting ${branch} branch`).start();
	await git.deleteLocalBranch(branch);
	gitDeleteNewBranch.succeed(`Deleted ${branch} branch`);
	// Complete
	process.exit(0);
})();

async function checkCleanWorkingDir() {
	return (await git.status()).isClean();
}
function keypress() {
	process.stdin.resume();
	process.stdin.setRawMode(true);
	return new Promise((resolve) => {
		process.stdin.once("data", () => {
			process.stdin.setRawMode(false);
			resolve();
			process.stdin.pause();
		});
	});
}
async function isPRMerged(pr) {
	let data;
	do {
		data = (await octokit.pulls.get({
			"owner": "dynamoosejs",
			"repo": "dynamoose",
			"pull_number": pr
		})).data;
		await utils.timeout(5000);
	} while (!data.merged);
}
async function isReleaseSubmitted(release) {
	try {
		await npmFetch(`/dynamoose/${release.substring(1)}`);
	} catch (e) {
		await utils.timeout(5000);
		return isReleaseSubmitted(release);
	}
}
