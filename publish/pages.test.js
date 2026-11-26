const assert = require("node:assert/strict");
const {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} = require("node:fs");
const {tmpdir} = require("node:os");
const {join} = require("node:path");
const {spawnSync} = require("node:child_process");
const test = require("node:test");

test("Pages builds preserve doc IDs and redirect the URLs containing spaces", (context) => {
	const root = mkdtempSync(join(tmpdir(), "dynamoose-pages-"));
	context.after(() => rmSync(root, {"recursive": true, "force": true}));
	const source = join(root, "docs/docs_src/other");
	const build = join(root, "docs/build");
	const translated = join(root, "docs/i18n/es/docusaurus-plugin-content-docs/current/other");
	mkdirSync(source, {"recursive": true});
	mkdirSync(build);
	mkdirSync(translated, {"recursive": true});
	writeFileSync(join(build, "index.html"), "home");

	function run (command) {
		return spawnSync(process.execPath, [join(__dirname, "pages.js"), command], {"cwd": root, "encoding": "utf8"});
	}

	const pages = [["Version Requirements", "version-requirements"], ["Maintained Versions", "maintained-versions"]];
	for (const [title] of pages) {
		writeFileSync(join(source, title + ".md"), "Page content\n");
	}
	const translatedPage = join(translated, "Version Requirements.md");
	writeFileSync(translatedPage, "---\ntitle: Requisitos de versión\nslug: /other/legacy\n---\n\nContenido\n");
	const prepare = run("prepare");
	assert.equal(prepare.status, 0, prepare.stderr);
	for (const [title, slug] of pages) {
		assert.match(readFileSync(join(source, title + ".md"), "utf8"), new RegExp("slug: /other/" + slug));
	}
	assert.equal(readFileSync(translatedPage, "utf8"), "---\ntitle: Requisitos de versión\nslug: /other/version-requirements\n---\n\nContenido\n");
	assert.notEqual(run("bundle").status, 0, "a missing localized page must fail the build");
	for (const [title, slug] of pages) {
		for (const locale of ["", "/es"]) {
			const destination = locale + "/other/" + slug;
			mkdirSync(join(build, destination), {"recursive": true});
			writeFileSync(join(build, destination, "index.html"), title);
		}
	}
	const bundle = run("bundle");
	assert.equal(bundle.status, 0, bundle.stderr);
	const redirects = readFileSync(join(build, "_redirects"), "utf8").trim().split("\n");
	for (const [title, slug] of pages) {
		for (const locale of ["", "/es"]) {
			for (const suffix of ["", "/"]) {
				assert.ok(redirects.includes(locale + "/other/" + encodeURIComponent(title) + suffix + " " + locale + "/other/" + slug + "/ 301"));
			}
		}
	}

	writeFileSync(join(build, "unsupported path.html"), "invalid");
	assert.match(run("bundle").stderr, /unsupported path\.html/);
	rmSync(join(build, "unsupported path.html"));
	writeFileSync(join(build, "too-large.js"), Buffer.alloc(8 * 1024 * 1024));
	assert.match(run("bundle").stderr, /8 MiB/);
});
