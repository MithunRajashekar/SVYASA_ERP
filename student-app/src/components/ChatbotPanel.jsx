import { useState, useRef, useEffect } from "react";

export default function ChatbotPanel({ onClose }) {
  const [messages, setMessages] = useState([
    { text: "Hi! How can I help you?", sender: "bot" },
  ]);
  const [input, setInput] = useState("");

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages([
      ...messages,
      { text: input, sender: "user" },
      { text: "Demo reply 🤖", sender: "bot" },
    ]);
    setInput("");
  };

  return (
    <div className="h-full flex flex-col bg-white border-l">

      {/* Header */}
      <div className="bg-[#8b1e14] text-white p-3 flex justify-between items-center">
        <span className="font-semibold">Chatbot</span>
        <button onClick={onClose}>✖</button>
      </div>

      {/* Messages (SCROLL FIXED) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-2 rounded-lg max-w-[75%] ${
              msg.sender === "user"
                ? "bg-[#8b1e14] text-white ml-auto"
                : "bg-gray-200 text-black"
            }`}
          >
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 border-t flex gap-2 bg-white">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border rounded-lg px-2 py-1 focus:outline-none"
          placeholder="Type a message..."
        />
        <button
          onClick={handleSend}
          className="bg-[#8b1e14] text-white px-3 rounded-lg"
        >
          Send
        </button>
      </div>
    </div>
  );
}