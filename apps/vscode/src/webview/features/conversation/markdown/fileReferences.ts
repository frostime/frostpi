export interface FileReference {
  path: string;
  line?: number;
  column?: number;
  endLine?: number;
}

const GITHUB_LOCATION_SUFFIX = /#L(\d+)(?:-L(\d+))?$/i;
const LINE_RANGE_SUFFIX = /:(\d+)-(\d+)$/;
const LOCATION_SUFFIX = /:(\d+)(?::(\d+))?$/;
const URI_SCHEME = /^[a-z][a-z\d+.-]*:/i;
const WINDOWS_ABSOLUTE_PATH = /^[a-z]:[\\/]/i;
const ABSOLUTE_PATH = /^(?:[\\/]|[a-z]:[\\/])/i;
const EXPLICIT_RELATIVE_PATH = /^\.{1,2}[\\/]/;
const FILE_NAME = /(?:^|[\\/])(?:\.[^\s./\\]+|[^\s/\\]+\.[a-z][a-z\d._-]*)$/i;

export function parseFileReference(value: string): FileReference | null {
  let path = value.trim();
  if (!path || /[\0\r\n]/.test(path)) return null;

  let line: number | undefined;
  let column: number | undefined;
  let endLine: number | undefined;
  const githubLocation = GITHUB_LOCATION_SUFFIX.exec(path);
  const lineRange = LINE_RANGE_SUFFIX.exec(path);
  const location = LOCATION_SUFFIX.exec(path);
  const suffix = githubLocation ?? lineRange ?? location;
  if (suffix) {
    line = Number(suffix[1]);
    if (suffix === location) column = suffix[2] === undefined ? undefined : Number(suffix[2]);
    else endLine = suffix[2] === undefined ? undefined : Number(suffix[2]);

    if (!Number.isSafeInteger(line) || line < 1) return null;
    if (column !== undefined && (!Number.isSafeInteger(column) || column < 1)) return null;
    if (endLine !== undefined && (!Number.isSafeInteger(endLine) || endLine < line)) return null;
    path = path.slice(0, suffix.index);
  }

  if (!path || /\s/.test(path)) return null;
  if (URI_SCHEME.test(path) && !WINDOWS_ABSOLUTE_PATH.test(path)) return null;
  if (!ABSOLUTE_PATH.test(path) && !EXPLICIT_RELATIVE_PATH.test(path) && !FILE_NAME.test(path)) return null;

  return {
    path,
    ...(line === undefined ? {} : { line }),
    ...(column === undefined ? {} : { column }),
    ...(endLine === undefined ? {} : { endLine }),
  };
}

export function parseFileHref(href: string): FileReference | null {
  try {
    return parseFileReference(decodeURIComponent(href));
  } catch {
    return parseFileReference(href);
  }
}
