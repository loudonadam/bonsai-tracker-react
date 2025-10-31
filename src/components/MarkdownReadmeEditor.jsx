import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkSimpleGfmTables from "../utils/remarkSimpleGfmTables";

const tabs = [
  { id: "write", label: "Write" },
  { id: "preview", label: "Preview" },
];

const MarkdownReadmeEditor = ({
  value,
  onChange,
  placeholder = "Write your notes in Markdown...",
  rows = 10,
  className = "",
  autoFocus = false,
}) => {
  const [activeTab, setActiveTab] = useState("write");
  const textareaRef = useRef(null);
  const selectionRef = useRef({ start: null, end: null });

  useEffect(() => {
    if (!autoFocus || activeTab !== "write") {
      return;
    }

    const node = textareaRef.current;
    if (!node) {
      return;
    }

    node.focus({ preventScroll: true });

    const { start, end } = selectionRef.current;
    if (start != null && end != null) {
      node.setSelectionRange(start, end);
    } else {
      const length = node.value.length;
      node.setSelectionRange(length, length);
    }
  }, [autoFocus, activeTab, value]);

  const handleChange = (event) => {
    const { selectionStart, selectionEnd, value: nextValue } = event.target;
    selectionRef.current = { start: selectionStart, end: selectionEnd };
    onChange(nextValue);

    if (!autoFocus) {
      return;
    }

    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) {
        return;
      }

      node.focus({ preventScroll: true });

      const { start, end } = selectionRef.current;
      if (start != null && end != null) {
        node.setSelectionRange(start, end);
      } else {
        const length = node.value.length;
        node.setSelectionRange(length, length);
      }
    });
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
      </div>

      {activeTab === "write" ? (
        <textarea
          value={value}
          onChange={handleChange}
          rows={rows}
          placeholder={placeholder}
          ref={textareaRef}
          className="w-full border-none px-3 py-3 text-sm font-mono focus:outline-none focus:ring-0 resize-y"
        />
      ) : (
        <div className="px-3 py-3 text-sm" style={{ minHeight: `${rows * 1.25}rem` }}>
          {value.trim() ? (
            <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-strong:text-green-700 prose-li:marker:text-green-600">
              <ReactMarkdown remarkPlugins={[remarkSimpleGfmTables]}>
                {value}
              </ReactMarkdown>
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
