import { useMemo, useRef } from 'react';
import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';

const HEADING_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: '1', label: 'H1' },
  { value: '2', label: 'H2' },
  { value: '3', label: 'H3' },
];

function ToolbarButton({ active, onClick, title, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      className={`rich-text-toolbar-btn${active ? ' is-active' : ''}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function EditorToolbar({ editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      if (!ed) return null;
      return {
        isBold: ed.isActive('bold'),
        isItalic: ed.isActive('italic'),
        isUnderline: ed.isActive('underline'),
        isBulletList: ed.isActive('bulletList'),
        isOrderedList: ed.isActive('orderedList'),
        isLink: ed.isActive('link'),
        heading: ed.isActive('heading', { level: 1 })
          ? '1'
          : ed.isActive('heading', { level: 2 })
            ? '2'
            : ed.isActive('heading', { level: 3 })
              ? '3'
              : 'normal',
      };
    },
  });

  if (!editor || !state) return null;

  function applyHeading(level) {
    if (level === 'normal') editor.chain().focus().setParagraph().run();
    else editor.chain().focus().setHeading({ level: Number(level) }).run();
  }

  function setLink() {
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('Link-URL eingeben', prev || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  return (
    <div className="rich-text-toolbar">
      <div className="rich-text-heading-buttons" role="group" aria-label="Textformat">
        {HEADING_OPTIONS.map((opt) => (
          <ToolbarButton
            key={opt.value}
            active={state.heading === opt.value}
            onClick={() => applyHeading(opt.value)}
            title={opt.label}
          >
            {opt.label}
          </ToolbarButton>
        ))}
      </div>

      <span className="rich-text-toolbar-divider" aria-hidden="true" />

      <ToolbarButton
        active={state.isBold}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Fett"
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        active={state.isItalic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Kursiv"
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        active={state.isUnderline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Unterstrichen"
      >
        <span className="underline">U</span>
      </ToolbarButton>

      <span className="rich-text-toolbar-divider" aria-hidden="true" />

      <ToolbarButton
        active={state.isBulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Aufzählung"
      >
        •≡
      </ToolbarButton>
      <ToolbarButton
        active={state.isOrderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Nummerierte Liste"
      >
        1.
      </ToolbarButton>

      <span className="rich-text-toolbar-divider" aria-hidden="true" />

      <ToolbarButton
        active={state.isLink}
        onClick={setLink}
        title="Link"
      >
        Link
      </ToolbarButton>
      <ToolbarButton
        active={false}
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        title="Formatierung entfernen"
      >
        ✕
      </ToolbarButton>
    </div>
  );
}

export default function RichTextEditor({ value, onChange, placeholder }) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const initialContentRef = useRef(value || '');

  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        rel: 'noopener noreferrer',
        target: '_blank',
      },
    }),
    Placeholder.configure({
      placeholder: placeholder || '',
    }),
  ], [placeholder]);

  const editor = useEditor({
    extensions,
    content: initialContentRef.current,
    onUpdate: ({ editor: ed }) => {
      onChangeRef.current(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'rich-text-body rich-text-editor-content',
        'data-lenis-prevent': '',
      },
    },
  });

  return (
    <div className="rich-text-editor" data-lenis-prevent>
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
