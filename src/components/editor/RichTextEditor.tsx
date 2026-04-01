import { useEffect, useRef, useState } from "react";
import { Button, Space, message } from "antd";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { getErrorMessage } from "../../utils/errorMessage";

type RichTextEditorProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  onUploadImage?: (file: File) => Promise<string>;
};

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Nhập nội dung...",
  onUploadImage,
}: RichTextEditorProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
      Image,
    ],
    content: value || "",
    onUpdate: ({ editor: currentEditor }) => onChange?.(currentEditor.getHTML()),
    editorProps: {
      attributes: {
        class: "rte-content",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || "";
    if (current !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, value]);

  const openImagePicker = () => fileInputRef.current?.click();

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor || !onUploadImage) return;

    try {
      setUploading(true);
      const imageUrl = await onUploadImage(file);
      editor.chain().focus().setImage({ src: imageUrl }).run();
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Không thể tải ảnh lên"));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  if (!editor) return null;

  return (
    <div className="rte-shell">
      {contextHolder}
      <Space size={6} wrap className="rte-toolbar">
        <Button
          size="small"
          onClick={() => editor.chain().focus().toggleBold().run()}
          type={editor.isActive("bold") ? "primary" : "default"}
        >
          B
        </Button>
        <Button
          size="small"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          type={editor.isActive("italic") ? "primary" : "default"}
        >
          <i>I</i>
        </Button>
        <Button
          size="small"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          type={editor.isActive("underline") ? "primary" : "default"}
        >
          <u>U</u>
        </Button>
        <Button
          size="small"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          type={editor.isActive("bulletList") ? "primary" : "default"}
        >
          • List
        </Button>
        <Button
          size="small"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          type={editor.isActive("orderedList") ? "primary" : "default"}
        >
          1. List
        </Button>
        <Button size="small" onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          Trái
        </Button>
        <Button size="small" onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          Giữa
        </Button>
        <Button size="small" onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          Phải
        </Button>
        <Button
          size="small"
          onClick={() => {
            const url = window.prompt("Nhập link");
            if (!url) return;
            editor.chain().focus().setLink({ href: url }).run();
          }}
        >
          Link
        </Button>
        <Button size="small" loading={uploading} onClick={openImagePicker}>
          Ảnh
        </Button>
      </Space>
      <EditorContent editor={editor} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleImageSelect}
      />
    </div>
  );
}
