import React, { useState } from "react";
import ReactMarkdown from "react-markdown";

const tabs = [
  { id: "write", label: "Write" },
  { id: "preview", label: "Preview" },
];

const MarkdownReadmeEditor = ({
  value,
  onChange,
  placeholder = "Write your notes in Markdown...",
  rows = 10,
  template,
  templateLabel = "Use care template",
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState("write");

  const handleInsertTemplate = () => {
    if (!template) return;

    const shouldReplace = !value.trim()
      ? true
      : typeof window === "undefined"
        ? true
        : window.confirm(
            "Replace the current content with the default template? You can always edit it afterward.",
          );

    if (shouldReplace) {
      onChange(template);
      setActiveTab("write");
    }
  };

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden bg-white ${className}`}>
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2">
        <div className="inline-flex rounded-md shadow-sm" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 text-sm font-medium focus:outline-none transition first:rounded-l-md last:rounded-r-md border border-gray-300 -ml-px first:ml-0 ${
                activeTab === tab.id
                  ? "bg-white text-green-700 shadow-inner"
                  : "bg-gray-100 text-gray-600 hover:text-gray-800"
              }`}
              aria-pressed={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {template && (
          <button
            type="button"
            onClick={handleInsertTemplate}
            className="inline-flex items-center gap-1 rounded-md border border-green-600 bg-white px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50 transition"
          >
            {templateLabel}
          </button>
        )}
      </div>

      {activeTab === "write" ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full border-none px-3 py-3 text-sm font-mono focus:outline-none focus:ring-0 resize-y"
        />
      ) : (
        <div className="px-3 py-3 text-sm" style={{ minHeight: `${rows * 1.25}rem` }}>
          {value.trim() ? (
            <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-strong:text-green-700 prose-li:marker:text-green-600">
              <ReactMarkdown>{value}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-gray-400 italic">Nothing to preview yet.</p>
          )}
        </div>
      )}

      <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
        Markdown supported. Use headings, bullet lists, tables, and emphasis to structure detailed care guides.
      </div>
    </div>
  );
};

export default MarkdownReadmeEditor;
