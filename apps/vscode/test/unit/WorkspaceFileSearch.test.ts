import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  buildFdArguments,
  buildFdFuzzyPattern,
  isWorkspacePathExcluded,
  parseFdOutput,
  resolveQueryScope,
} from "../../src/extension/workspace-files/WorkspaceFileSearch.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { force: true, recursive: true });
});

describe("workspace path search", () => {
  it("builds an escaped fuzzy query that matches full paths", () => {
    const pattern = buildFdFuzzyPattern("/workspace", "ss[c]/x");
    expect(pattern).toContain("s.*s.*\\[.*c.*\\].*[\\\\/].*x");
    expect(new RegExp(pattern, "i").test("/workspace/docs/ss[c]/x.ts")).toBe(true);
  });

  it("parses NUL-delimited files and directories across path separators", () => {
    expect(parseFdOutput("src\\app.ts\0src\\features\\\0")).toEqual([
      { path: "src/app.ts", isDirectory: false },
      { path: "src/features", isDirectory: true },
    ]);
  });

  it("scopes continued directory completion to that directory", () => {
    const cwd = mkdtempSync(join(tmpdir(), "frostpi-files-"));
    temporaryDirectories.push(cwd);
    mkdirSync(join(cwd, "src"));

    expect(resolveQueryScope(cwd, "src/com")).toEqual({
      baseDirectory: join(cwd, "src"),
      displayPrefix: "src/",
      query: "com",
    });
  });

  it("honors conditional files.exclude rules only when the sibling exists", () => {
    const cwd = mkdtempSync(join(tmpdir(), "frostpi-exclude-"));
    temporaryDirectories.push(cwd);
    writeFileSync(join(cwd, "app.ts"), "");

    const rules = [{ pattern: "**/*.js", when: "$(basename).ts" }];
    expect(isWorkspacePathExcluded(cwd, "app.js", rules)).toBe(true);
    expect(isWorkspacePathExcluded(cwd, "other.js", rules)).toBe(false);
  });

  it("maps ignore, symlink, and exclude controls to bounded fd arguments", () => {
    const args = buildFdArguments(
      { baseDirectory: "/workspace", displayPrefix: "", query: "src" },
      {
        excludeRules: [{ pattern: "dist/**" }, { pattern: "**/*.js", when: "$(basename).ts" }],
        respectIgnoreFiles: false,
        followSymlinks: true,
      },
    );
    expect(args).toContain("500");
    expect(args).toContain("--no-ignore");
    expect(args).toContain("--follow");
    expect(args).toContain("dist/**");
    expect(args).not.toContain("**/*.js");
  });
});
