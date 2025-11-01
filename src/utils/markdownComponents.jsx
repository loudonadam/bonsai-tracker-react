const alignmentClass = (style) => {
  const align = style?.textAlign;

  switch (align) {
    case "center":
      return "text-center";
    case "right":
      return "text-right";
    default:
      return "text-left";
  }
};

const markdownComponents = {
  table: ({ children }) => (
    <div className="markdown-table-wrapper">
      <table className="markdown-table">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="markdown-table-head">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="markdown-table-body">{children}</tbody>
  ),
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children, style }) => (
    <th className={`markdown-table-header ${alignmentClass(style)}`}>{children}</th>
  ),
  td: ({ children, style }) => (
    <td className={`markdown-table-cell ${alignmentClass(style)}`}>{children}</td>
  ),
};

export default markdownComponents;
