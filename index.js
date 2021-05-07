const archiver = require("archiver");
const { apps } = require("piral-cli");
const { Writable } = require("stream");
const { tmpdir } = require("os");
const { mkdirSync } = require("fs");
const { resolve } = require("path");
const { SourceLanguage } = require("piral-cli/lib/common");

exports.validate = async (input) => {
  return (
    typeof input.name === "string" &&
    /^[A-Za-z0-9\-]+$/.test(input.name) &&
    typeof input.source === "string" &&
    input.source.length > 0 &&
    typeof input.language === "string"
  );
};

exports.generate = async (input) => {
  const dir = tmpdir();
  const targetDir = resolve(dir, input.name);
  mkdirSync(targetDir, { recursive: true });

  await apps.newPilet(targetDir, {
    install: false,
    language:
      input.language === "JavaScript" ? SourceLanguage.js : SourceLanguage.ts,
    variables: {},
    source: input.source,
  });

  return await new Promise((resolve, reject) => {
    const data = [];
    const converter = Writable();
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });
    converter._write = (chunk, _, cb) => {
      data.push(chunk);
      cb();
    };
    converter.on("finish", () => resolve(Buffer.concat(data)));
    converter.on("error", reject);
    archive.pipe(converter);
    archive.glob(`**/*`, { cwd: targetDir, ignore: ['node_modules/**/*', 'package-lock.json'] });
    archive.finalize();
  });
};

exports.steps = [
  {
    name: "name",
    description: "The name of the pilet.",
    value: {
      type: "string",
    },
  },
  {
    name: "source",
    description: "The name of the Piral instance.",
    value: {
      type: "string",
    },
  },
  {
    name: "language",
    description: "The programming language for the pilet.",
    value: {
      type: "enum",
      choices: ["TypeScript", "JavaScript"],
    },
  },
];
