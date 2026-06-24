"use client";
import { useRef, useEffect, useCallback } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const TOOLBAR = [
  { cmd: "bold",          icon: "B",    title: "Bold",           style: "font-bold" },
  { cmd: "italic",        icon: "I",    title: "Italic",         style: "italic" },
  { cmd: "underline",     icon: "U",    title: "Underline",      style: "underline" },
  { cmd: "separator" },
  { cmd: "insertUnorderedList", icon: "• List",  title: "Bullet List",    style: "" },
  { cmd: "insertOrderedList",   icon: "1. List", title: "Numbered List",  style: "" },
  { cmd: "separator" },
  { cmd: "h2",            icon: "H2",   title: "Heading 2",      style: "font-bold" },
  { cmd: "h3",            icon: "H3",   title: "Heading 3",      style: "font-bold" },
  { cmd: "separator" },
  { cmd: "removeFormat",  icon: "Tx",   title: "Clear Formatting", style: "" },
];

export default function RichTextEditor({ value, onChange, placeholder = "Write product description…", minHeight = 180 }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Set initial content once
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount

  const execCmd = useCallback((cmd: string) => {
    if (cmd === "h2") {
      document.execCommand("formatBlock", false, "h2");
    } else if (cmd === "h3") {
      document.execCommand("formatBlock", false, "h3");
    } else {
      document.execCommand(cmd, false);
    }
    editorRef.current?.focus();
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  function handleInput() {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500 transition-all">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200 flex-wrap">
        {TOOLBAR.map((btn, i) =>
          btn.cmd === "separator" ? (
            <div key={i} className="w-px h-5 bg-gray-300 mx-1" />
          ) : (
            <button
              key={btn.cmd}
              type="button"
              title={btn.title}
              onMouseDown={e => { e.preventDefault(); execCmd(btn.cmd); }}
              className={`px-2 py-1 rounded text-xs hover:bg-gray-200 text-gray-700 min-w-[26px] ${btn.style}`}
            >
              {btn.icon}
            </button>
          )
        )}
      </div>

      {/* Editable area */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          style={{ minHeight }}
          className="px-4 py-3 text-sm text-gray-800 outline-none prose prose-sm max-w-none
            [&>h2]:text-lg [&>h2]:font-bold [&>h2]:mt-2 [&>h2]:mb-1
            [&>h3]:text-base [&>h3]:font-semibold [&>h3]:mt-2 [&>h3]:mb-1
            [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:my-1
            [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:my-1
            [&>p]:my-1 [&>b]:font-bold [&>strong]:font-bold [&>em]:italic"
        />
        {(!value || value === "<br>" || value === "") && (
          <div className="absolute top-3 left-4 text-sm text-gray-400 pointer-events-none select-none">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
