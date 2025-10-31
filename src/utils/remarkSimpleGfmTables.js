const splitTableRow = (line) => {
  const trimmed = line.trim();
  const normalized = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  return normalized
    .split("|")
    .map((cell) => cell.trim());
};

const parseAlignment = (cell) => {
  if (!cell) {
    return null;
  }

  const startsWithColon = cell.startsWith(":");
  const endsWithColon = cell.endsWith(":");

  if (startsWithColon && endsWithColon) {
    return "center";
  }

  if (startsWithColon) {
    return "left";
  }

  if (endsWithColon) {
    return "right";
  }

  return null;
};

const isSeparatorRow = (line) => {
  const cleaned = line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "");

  if (!cleaned) {
    return false;
  }

  return cleaned
    .split("|")
    .every((segment) => /^:?[-]+:?$/.test(segment.trim()));
};

const buildTableNode = (lines, position) => {
  if (lines.length < 2) {
    return null;
  }

  const [headerLine, separatorLine, ...bodyLines] = lines;

  if (!isSeparatorRow(separatorLine)) {
    return null;
  }

  const headerCells = splitTableRow(headerLine);
  const alignmentCells = splitTableRow(separatorLine);

  if (alignmentCells.length !== headerCells.length) {
    return null;
  }

  const align = alignmentCells.map(parseAlignment);

  const headerRow = {
    type: "tableRow",
    children: headerCells.map((value) => ({
      type: "tableCell",
      children: value ? [{ type: "text", value }] : [],
    })),
  };

  const bodyRows = bodyLines
    .map((line) => {
      if (!line.trim()) {
        return null;
      }

      const cells = splitTableRow(line);

      if (cells.length === 0) {
        return null;
      }

      return {
        type: "tableRow",
        children: cells.map((value) => ({
          type: "tableCell",
          children: value ? [{ type: "text", value }] : [],
        })),
      };
    })
    .filter(Boolean);

  return {
    type: "table",
    align,
    children: [headerRow, ...bodyRows],
    position,
  };
};

const remarkSimpleGfmTables = () => (tree) => {
  if (!tree?.children) {
    return;
  }

  const nextChildren = [];

  tree.children.forEach((node) => {
    if (
      node.type === "paragraph" &&
      node.children?.length === 1 &&
      node.children[0].type === "text"
    ) {
      const rawValue = node.children[0].value;
      const lines = rawValue.split(/\r?\n/);

      if (
        lines.length >= 2 &&
        lines[0].trim().startsWith("|") &&
        lines[1].includes("-")
      ) {
        const tableNode = buildTableNode(lines, node.position);

        if (tableNode) {
          nextChildren.push(tableNode);
          return;
        }
      }
    }

    nextChildren.push(node);
  });

  tree.children = nextChildren;
};

export default remarkSimpleGfmTables;
