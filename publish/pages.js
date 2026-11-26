const {existsSync, lstatSync, readdirSync, readFileSync, writeFileSync} = require("node:fs");
const {join} = require("node:path");

const pages = [
	["Version Requirements", "version-requirements"],
	["Maintained Versions", "maintained-versions"]
];

/** Override the route without renaming its Crowdin and sidebar IDs. */
function setSlug (file, slug) {
	const source = readFileSync(file, "utf8").replace(/\r\n/gu, "\n");
	const route = "slug: /other/" + slug;
	if (!source.startsWith("---\n")) {
		writeFileSync(file, "---\n" + route + "\n---\n\n" + source);
		return;
	}
	const end = source.indexOf("\n---\n", 3);
	if (end === -1) {
		throw new Error("Invalid front matter in " + file);
	}
	const frontMatter = source.slice(4, end);
	const slugLine = /^slug:[^\n]*$/mu;
	const updated = slugLine.test(frontMatter) ? frontMatter.replace(slugLine, route) : [route, frontMatter].filter(Boolean).join("\n");
	writeFileSync(file, "---\n" + updated + source.slice(end));
}

function prepare () {
	for (const [title, slug] of pages) {
		const name = title + ".md";
		setSlug(join("docs/docs_src/other", name), slug);
		const translation = join("docs/i18n/es/docusaurus-plugin-content-docs/current/other", name);
		// Docusaurus reads translated front matter independently of the English source.
		if (existsSync(translation)) {
			setSlug(translation, slug);
		}
	}
}

function bundle () {
	const root = "docs/build";
	const redirects = [];
	for (const [title, slug] of pages) {
		for (const locale of ["", "/es"]) {
			const legacy = locale + "/other/" + encodeURIComponent(title);
			const destination = locale + "/other/" + slug + "/";
			if (!lstatSync(join(root, destination, "index.html")).isFile()) {
				throw new Error("Missing redirect destination " + destination);
			}
			redirects.push(legacy + " " + destination + " 301", legacy + "/ " + destination + " 301");
		}
	}
	writeFileSync(join(root, "_redirects"), redirects.join("\n") + "\n");

	let count = 0;
	let bytes = 0;
	function inspect (relative) {
		for (const name of readdirSync(join(root, relative))) {
			if (name.startsWith(".")) {
				continue; // The CLI ignores hidden Docusaurus artifacts.
			}
			const path = relative + name;
			const encoded = Buffer.from(path, "utf8");
			if (path.length > 240 || encoded.length > 1024 || Buffer.byteLength(name) > 255 ||
				path.normalize("NFC") !== path || encoded.some((byte) => byte <= 32 || byte === 127) ||
				/[?#%\\]/u.test(path)) {
				throw new Error("Unsupported Pages path: " + path);
			}
			const entry = lstatSync(join(root, path));
			if (entry.isDirectory()) {
				inspect(path + "/");
			} else if (entry.isFile()) {
				count++;
				bytes += entry.size;
			} else {
				throw new Error("Expected a regular file or directory: " + path);
			}
		}
	}
	if (!lstatSync(join(root, "index.html")).isFile()) {
		throw new Error("Pages requires a root index.html");
	}
	inspect("");
	if (count > 200 || bytes > 8 * 1024 * 1024) {
		throw new Error("Pages bundle exceeds 200 files or 8 MiB");
	}
	process.stdout.write("Pages bundle: " + count + " files, " + bytes + " bytes\n");
}

if (process.argv[2] === "prepare") {
	prepare();
} else if (process.argv[2] === "bundle") {
	bundle();
} else {
	throw new Error("Usage: node pages.js prepare|bundle");
}
