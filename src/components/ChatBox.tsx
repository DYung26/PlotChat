"use client";

import { AudioLines, Check, Mic, Paperclip, Plus, Send, X } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useRef, useState } from "react";
import Image from "next/image";
import { ChatPromptBoxProps } from "@/types";
// import { FilePreview } from 'reactjs-file-preview';
import dynamic from "next/dynamic";
import { mutationFn } from "@/lib/mutationFn";
import { VoiceAgentDialog } from "./VoiceAgentPopover";
import { useParams } from "next/navigation";

const FilePreview = dynamic(() => import("reactjs-file-preview"), {
  ssr: false,
});

export default function ChatPromptBox({ action }: ChatPromptBoxProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceAgentOpen, setVoiceAgentOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isCancelRef = useRef(false);

  const extensions = [
    "Recommender",
    "PlotGen",
    "Explainer",
  ];

  const { project_id, chat_id } = useParams();
  const isDisabled = !project_id && !chat_id;

  const handleClick = (e: React.MouseEvent, extension: string) => {
    if (isDisabled) {
      e.preventDefault();
      handleSend();
      return;
    }
    toggleItem(extension)
  };

  const toggleItem = (item: string) => {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const startRecording = async () => {
    if (isDisabled) {
      // e.preventDefault();
      handleSend();
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/mp4")
      ? "audio/mp4"
      : "audio/mpeg";
    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];
    isCancelRef.current = false;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach(track => track.stop());
      streamRef.current = null;

      if (isCancelRef.current) {
        audioChunksRef.current = [];
        return;
      }

      const blob = new Blob(
        audioChunksRef.current,
        {
          type: recorder.mimeType
        }
      );
      const file = new File(
        [blob],
        `recording.${recorder.mimeType.includes("mp4") ? "mp4" : "webm"}`,
        {
          type: recorder.mimeType,
        }
      );

      const formData = new FormData();
      formData.append("file", file);

      let buffer = "";
      let remaining = "";

      try {
        await mutationFn({
          url: "/audio/transcribe",
          body: formData,
          isStream: true,
          onChunk: async (raw) => {
            remaining += raw;

            const lineEndRegex = /[,.!?](\s+|$)/g;
            let match: RegExpExecArray | null;
            let matchedSomething = false;

            while ((match = lineEndRegex.exec(remaining)) !== null) {
              matchedSomething = true;
              const endIndex = match.index + match[0].length;
              const completeLine = remaining.slice(0, endIndex);
              buffer += completeLine;
              setMessage(buffer);
              console.log("set message:", buffer);
              await new Promise(r => requestAnimationFrame(r));
              remaining = remaining.slice(endIndex);
            }

            if (!matchedSomething) {
              setMessage(buffer + remaining);
            }
          },
          onDone() {
          },
        });
      } catch (error) {
        console.error("Message sending failed", error);
        // setStreamingMessageId(null);
      }

      setIsRecording(false);
    };

    recorder.start();
    setIsRecording(true);
  };

  const cancelRecording = () => {
    isCancelRef.current = true;
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    const newFiles = Array.from(fileList);

    setFiles(prev => [...prev, ...newFiles]);
  }

  const removeFile = (indexToRemove: number) => {
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSend = async () => {
    // if (!message.trim()) return;
    // message + selected.map(ext => `\n_- Use the ${ext} extension _`).join('');
    action(message, files, selected[0]); // enabling only one extension for now
    setMessage("");
    setFiles([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-0 pb-4 z-10">
      {/*fixed bottom-0 left-0 right-0 ">*/}
      {/*<div className="w-full max-w-3xl fixed bottom-0 left-0 right-0
        mx-auto px-4 pb-4">*/}
      <div className="bg-white border rounded-xl shadow-sm p-2 flex flex-col gap-0">
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2">
            {files.map((file, index) => (
              <div key={index} className="relative w-20 h-20 border rounded-md">
                {file.type.startsWith("image/") ? (
                  <Image
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    fill
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <FilePreview preview={file} />
                  /*<div className="flex items-center justify-center h-full text-xs text-gray-500 px-1 text-center">
                    {file.name.split('.').pop()?.toUpperCase()}
                  </div>*/
                )}

                {/* X Button */}
                <button
                  onClick={() => removeFile(index)}
                  className="absolute -top-2 -right-2 w-4 h-4 flex items-center justify-center bg-white/80 text-red-500 hover:text-red-700 shadow-sm border rounded-full cursor-pointer z-10"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {!isRecording && (
          <Textarea
            placeholder="Type your message to create a new chat in this project..."
            className="resize-none border-0 shadow-none min-h-10 focus-visible:ring-0 focus-visible:ring-offset-0"
            value={message}
            onKeyDown={handleKeyDown}
            onChange={(e) => setMessage(e.target.value)}
          />
        )}

        {isRecording &&
          <canvas
            ref={canvasRef}
            className="w-full h-10 bg-gray-100 rounded-md"
          />
        }

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label
              onClick={(e) => handleClick(e, "")}
              className="inline-flex items-center justify-center gap-1 border px-1.5 py-1 rounded-xl transition-colors cursor-pointer"
            >
              <Paperclip className="w-4 h-4" />
              <span className="text-sm">Attach</span>
              <input
                type="file"
                multiple
                // accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            <div className="flex gap-2">
              {extensions.map((extension) => {
                const isSelected = selected.includes(extension);
                return (
                  <button
                    key={extension}
                    onClick={(e) => handleClick(e, extension)}
                    className={`flex items-center justify-center gap-1 px-1.5 py-1 rounded-full transition cursor-pointer w-full text-left text-gray-500
                      ${
                        isSelected
                          ? "bg-blue-100 border border-blue-500"
                          : "border border-gray-300 hover:bg-gray-100"
                      }`}
                  >
                    {isSelected ? (
                      <Check className="text-blue-600" size={16} />
                    ) : (
                      <Plus className="text-gray-500" size={16} />
                    )}
                    <span
                      className={`${
                        isSelected ? "text-blue-600 font-medium" : "text-gray-800"
                      } text-sm`}
                    >
                      {extension}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 items-center">
            {!isRecording ? (
              <>
                <Button
                  size="icon"
                  onClick={startRecording}
                  className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 cursor-pointer"
                >
                  <Mic className="w-4 h-4" />
                </Button>

                <Button
                  size="icon"
                  onClick={() => {
                    if (isDisabled) {
                      // e.preventDefault();
                      handleSend();
                      return;
                    }
                    setVoiceAgentOpen(true)
                  }}
                  className="p-1 rounded-full bg-gray-200 text-gray-700 cursor-pointer hover:text-gray-900 hover:bg-gray-300"
                >
                  <AudioLines />
                </Button>

                <Button
                  onClick={handleSend}
                  className="p-1 rounded-full bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="icon"
                  onClick={cancelRecording}
                  className="p-2 rounded-full bg-red-200 hover:bg-red-300 text-red-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  onClick={() => mediaRecorderRef.current?.stop()}
                  className="p-2 rounded-full bg-green-200 hover:bg-green-300 text-green-700 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <VoiceAgentDialog
        open={voiceAgentOpen}
        onOpenChange={setVoiceAgentOpen}
      />
    </div>
  );
}

