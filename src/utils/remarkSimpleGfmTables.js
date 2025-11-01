const splitTableRow = (line) => {
  if (!line) {
    return [];
  }

  const trimmed = line.trim();
  const normalized = trimmed
    .replace(/^\|/, "")
    .replace(/\|$/, "");

  return normalized.split("|").map((cell) => cell.trim());
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

const isSeparatorRow = (line, expectedCellCount) => {
  const cells = splitTableRow(line);

  if (!cells.length) {
    return false;
  }

  if (expectedCellCount && cells.length !== expectedCellCount) {
    return false;
  }

  return cells.every((segment) => /^:?[-]+:?$/.test(segment.trim()));
};

const buildTableNode = (lines, position) => {
  if (lines.length < 2) {
    return null;
  }

  const [headerLine, separatorLine, ...bodyLines] = lines;

  const headerCells = splitTableRow(headerLine);

  if (!headerCells.length) {
    return null;
  }

  if (!isSeparatorRow(separatorLine, headerCells.length)) {
    return null;
  }

  const alignmentCells = splitTableRow(separatorLine);
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
    if (node.type === "paragraph" && Array.isArray(node.children)) {
      let rawValue = "";
      let isPlainText = true;

      node.children.forEach((child, index) => {
        if (child.type === "text") {
          rawValue += child.value;
        } else if (child.type === "break") {
          rawValue += "\n";
        } else {
          isPlainText = false;
        }

        if (index < node.children.length - 1) {
          // Preserve hard line breaks that the markdown parser kept as separate nodes
          const nextChild = node.children[index + 1];
          if (child.type === "text" && nextChild?.type === "text") {
            // Raw newlines are preserved inside the text nodes themselves, so no action here
          }
        }
      });

      if (isPlainText && rawValue.includes("|")) {
        const lines = rawValue
          .split(/\r?\n/)
          .map((line) => line.trimEnd())
          .filter((line, index, array) => {
            if (!line.trim()) {
              // Keep blank lines between rows so the parser can bail out gracefully
              // but drop leading/trailing blanks that would invalidate the table structure
              const isFirst = index === 0;
              const isLast = index === array.length - 1;
              return !(isFirst || isLast);
            }
            return true;
          });

        if (lines.length >= 2) {
          const tableNode = buildTableNode(lines, node.position);

          if (tableNode) {
            nextChildren.push(tableNode);
            return;
          }
        }
      }
    }

    nextChildren.push(node);
  });

  tree.children = nextChildren;
};

export default remarkSimpleGfmTables;
