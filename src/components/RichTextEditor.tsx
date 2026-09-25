import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  List,
  ListOrdered,
  Type,
  Palette,
  Code,
  Eye,
  Eraser
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export const RichTextEditor = React.memo(function RichTextEditor({
  value,
  onChange,
  placeholder = "",
  minHeight = "200px"
}: RichTextEditorProps) {
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const lastValueRef = useRef(value);

  // Sync value from prop to innerHTML when changed from outside
  useEffect(() => {
    if (editorRef.current && !isHtmlMode) {
      if (value !== lastValueRef.current) {
        editorRef.current.innerHTML = value || "";
        lastValueRef.current = value;
      }
    }
  }, [value, isHtmlMode]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      let finalHtml = html;
      // If editor becomes completely empty, set to empty string
      if (html === "<br>" || html === "<div><br></div>" || html === "") {
        finalHtml = "";
      }
      
      lastValueRef.current = finalHtml;
      onChange(finalHtml);
    }
  }, [onChange]);

  const handleCommand = useCallback((command: string, cmdValue: string = "") => {
    document.execCommand(command, false, cmdValue);
    handleInput();
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, [handleInput]);

  const insertLink = useCallback(() => {
    const url = prompt("Masukkan URL Tautan:", "https://");
    if (url) {
      handleCommand("createLink", url);
    }
  }, [handleCommand]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // Intercept Rich HTML to guarantee all sizes, fonts, and inline styles are preserved exactly 1:1
    const htmlData = clipboardData.getData("text/html");
    if (htmlData) {
      e.preventDefault();
      document.execCommand("insertHTML", false, htmlData);
      handleInput();
    }
  }, [handleInput]);

  const textColors = [
    "#000000", "#333333", "#666666", "#999999", "#cccccc", "#ffffff",
    "#ef4444", "#f97316", "#f59e0b", "#10b981", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899",
    "#003a8f", "#00427a", "#ffc000", "#00204a", "#22c55e", "#ea580c", "#dc2626"
  ];

  const bgColors = [
    "transparent", "#f1f5f9", "#fee2e2", "#ffedd5", "#fef3c7", "#d1fae5", "#dbeafe", "#e0e7ff", "#f3e8ff",
    "#fce7f3", "#ffc000", "#003a8f", "#00204a"
  ];

  return (
    <div className="border border-slate-300 rounded-2xl bg-white overflow-hidden flex flex-col shadow-sm focus-within:ring-4 focus-within:ring-mandiri-blue-100/50 focus-within:border-mandiri-blue-600 transition-all">
      {/* Editor Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2 select-none overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 shrink-0">
          {/* Visual Editing Commands */}
          {!isHtmlMode && (
            <>
              <button
                type="button"
                onClick={() => handleCommand("bold")}
                title="Tebal (Ctrl+B)"
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleCommand("italic")}
                title="Miring (Ctrl+I)"
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleCommand("underline")}
                title="Garis Bawah (Ctrl+U)"
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
              >
                <Underline className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleCommand("strikeThrough")}
                title="Coret"
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
              >
                <Strikethrough className="w-4 h-4" />
              </button>

              <div className="w-[1px] h-5 bg-slate-300 mx-1" />

              {/* Alignments */}
              <button
                type="button"
                onClick={() => handleCommand("justifyLeft")}
                title="Rata Kiri"
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleCommand("justifyCenter")}
                title="Rata Tengah"
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleCommand("justifyRight")}
                title="Rata Kanan"
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
              >
                <AlignRight className="w-4 h-4" />
              </button>

              <div className="w-[1px] h-5 bg-slate-300 mx-1" />

              {/* Lists */}
              <button
                type="button"
                onClick={() => handleCommand("insertUnorderedList")}
                title="Daftar Simbol"
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleCommand("insertOrderedList")}
                title="Daftar Angka"
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
              >
                <ListOrdered className="w-4 h-4" />
              </button>

              <div className="w-[1px] h-5 bg-slate-300 mx-1" />

              {/* Colors Dropdowns */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowColorPicker(!showColorPicker);
                    setShowBgColorPicker(false);
                  }}
                  title="Warna Teks"
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 flex items-center gap-0.5 transition-colors cursor-pointer"
                >
                  <Type className="w-4 h-4" />
                  <span className="text-[9px] font-bold">A</span>
                </button>
                {showColorPicker && (
                  <div className="absolute left-0 top-full mt-1 bg-white p-2 rounded-xl shadow-xl border border-slate-200 grid grid-cols-7 gap-1 z-[100] w-48">
                    {textColors.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          handleCommand("foreColor", color);
                          setShowColorPicker(false);
                        }}
                        style={{ backgroundColor: color }}
                        className="w-5 h-5 rounded-md border border-slate-300 hover:scale-110 transition-transform cursor-pointer"
                        title={color}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowBgColorPicker(!showBgColorPicker);
                    setShowColorPicker(false);
                  }}
                  title="Warna Latar Belakang Teks"
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 flex items-center gap-0.5 transition-colors cursor-pointer"
                >
                  <Palette className="w-4 h-4" />
                </button>
                {showBgColorPicker && (
                  <div className="absolute left-0 top-full mt-1 bg-white p-2 rounded-xl shadow-xl border border-slate-200 grid grid-cols-7 gap-1 z-[100] w-48">
                    {bgColors.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          handleCommand("backColor", color);
                          setShowBgColorPicker(false);
                        }}
                        style={{ backgroundColor: color }}
                        className="w-5 h-5 rounded-md border border-slate-300 hover:scale-110 transition-transform cursor-pointer flex items-center justify-center text-[8px]"
                        title={color}
                      >
                        {color === "transparent" && "❌"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-[1px] h-5 bg-slate-300 mx-1" />

              {/* Insert Link */}
              <button
                type="button"
                onClick={insertLink}
                title="Sisipkan Tautan (Ctrl+K)"
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
              >
                <Link className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleCommand("removeFormat")}
                title="Bersihkan Format"
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer ml-auto"
              >
                <Eraser className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Toggle Mode Button (Visual vs HTML Code) */}
        <button
          type="button"
          onClick={() => {
            setIsHtmlMode(!isHtmlMode);
            setShowColorPicker(false);
            setShowBgColorPicker(false);
          }}
          className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-mandiri-blue-700 hover:text-white hover:bg-mandiri-blue-600 border border-mandiri-blue-200 hover:border-transparent rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ml-auto shrink-0"
          title={isHtmlMode ? "Beralih ke Visual Editor" : "Beralih ke HTML Source Code"}
        >
          {isHtmlMode ? (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Visual Editor</span>
            </>
          ) : (
            <>
              <Code className="w-3.5 h-3.5" />
              <span>HTML Source</span>
            </>
          )}
        </button>
      </div>

      {/* Editor Main Canvas */}
      <div className="relative flex-1 bg-white" style={{ minHeight }}>
        <style>{`
          .editor-content-editable {
            background-color: #f8fafc !important;
          }
          /* Removed aggressive table overrides so pasted email templates maintain their exact layout */
          .editor-content-editable center {
            display: block;
            width: 100%;
          }
          /* Basic typography styles for manual typing, replacing Tailwind 'prose' to avoid conflicts with email tables */
          .editor-content-editable p { margin-bottom: 1em; }
          .editor-content-editable ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1em; }
          .editor-content-editable ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1em; }
          .editor-content-editable h1 { font-size: 1.5em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; }
          .editor-content-editable h2 { font-size: 1.25em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; }
          .editor-content-editable a { color: #2563eb; text-decoration: underline; }
          .editor-content-editable b, .editor-content-editable strong { font-weight: 700; }
          .editor-content-editable i, .editor-content-editable em { font-style: italic; }
        `}</style>
        {isHtmlMode ? (
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full h-full p-4 font-mono text-xs text-slate-800 bg-slate-50 border-0 outline-none resize-none focus:ring-0"
            style={{ minHeight, height: "100%" }}
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onPaste={handlePaste}
            className="editor-content-editable w-full h-full p-4 text-sm text-slate-900 outline-none overflow-auto leading-relaxed focus:outline-none"
            style={{ minHeight }}
          />
        )}
      </div>

      {/* Footer Instructions / Quick Tip */}
      <div className="bg-slate-50 px-4 py-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        <span>Kliping: {isHtmlMode ? "Mode HTML Kode" : "Salin-Tempel dari Gmail Didukung"}</span>
        {!isHtmlMode && <span>Tekan Ctrl+B untuk Tebal</span>}
      </div>
    </div>
  );
});

export default RichTextEditor;
