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

const extractText = (node) => {
  if (!node) {
    return "";
  }

  if (typeof node === "string") {
    return node;
  }

  if (Array.isArray(node.children)) {
    return node.children.map(extractText).join("");
  }

  if (typeof node.value === "string") {
    return node.value;
  }

  return "";
};

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const createHeading = (Tag, className) => ({ node, children }) => {
  const text = extractText(node);
  const id = slugify(text);

  return (
    <Tag
      id={id || undefined}
      className={`${className} scroll-mt-24 text-gray-900 font-semibold`}
    >
      {children}
    </Tag>
  );
};

const markdownComponents = {
  h1: createHeading("h1", "text-2xl mt-6 mb-3"),
  h2: createHeading("h2", "text-xl mt-6 mb-3 border-b border-gray-200 pb-1"),
  h3: createHeading("h3", "text-lg mt-5 mb-2"),
  h4: createHeading("h4", "text-base mt-4 mb-2"),
  h5: createHeading("h5", "text-sm uppercase tracking-wide mt-4 mb-2 text-gray-700"),
  h6: createHeading("h6", "text-xs uppercase tracking-widest mt-4 mb-2 text-gray-500"),
  p: ({ children }) => <p className="text-gray-700 leading-relaxed">{children}</p>,
  ul: ({ children }) => (
    <ul className="list-disc pl-5 space-y-1 text-gray-700">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 space-y-1 text-gray-700">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-green-500 bg-green-50/70 px-4 py-2 italic text-gray-700">
      {children}
    </blockquote>
  ),
  code: ({ inline, children }) => {
    const rawContent = Array.isArray(children) ? children.join("") : children;
    const content =
      typeof rawContent === "string" ? rawContent.replace(/\n$/, "") : rawContent;

    if (inline) {
      return (
        <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.85em] text-gray-800">
          {content}
        </code>
      );
    }

    return (
      <pre className="overflow-x-auto rounded-lg bg-gray-900 px-4 py-3 text-sm text-gray-100">
        <code>{content}</code>
      </pre>
    );
  },
  hr: () => <hr className="my-6 border-gray-200" />,
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
