"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  MessageSquare,
  Plus,
  Send,
  Loader2,
  MoreHorizontal,
  Trash2,
  Pencil,
  Bot,
  User,
  Wrench,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import {
  Chat,
  ChatMessage,
  LlmProvider,
  LlmProviderConfig,
} from "@/components/chat/types";
import api from "@/lib/api-sdk";

const ChatPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [providers, setProviders] = useState<LlmProviderConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<LlmProvider>("anthropic");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialMessageHandled = useRef(false);

  // Fetch providers on mount
  useEffect(() => {
    api.getChatModels()
      .then((data) => {
        setProviders(data.providers);
        // Set default model for selected provider
        const defaultProvider = data.providers.find((p) => p.id === "anthropic") || data.providers[0];
        if (defaultProvider) {
          setSelectedProvider(defaultProvider.id as LlmProvider);
          setSelectedModel(defaultProvider.models[0]?.id || "");
        }
      })
      .catch((error) => console.error("Failed to fetch models:", error));
  }, []);

  // Handle initial message from URL (e.g., from dashboard)
  useEffect(() => {
    const initialMessage = searchParams.get("message");
    if (initialMessage && !initialMessageHandled.current && providers.length > 0) {
      initialMessageHandled.current = true;
      // Create a new chat and send the message
      handleCreateChatWithMessage(initialMessage);
      // Clear the URL parameter
      router.replace("/chat");
    }
  }, [searchParams, providers]);

  const handleCreateChatWithMessage = async (message: string) => {
    try {
      const newChat = await api.createChat({
        provider: selectedProvider,
        model: selectedModel,
      });
      setChats((prev) => [newChat, ...prev]);
      setSelectedChatId(newChat.id);

      // Send the initial message
      setIsSending(true);
      const tempUserMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        chatId: newChat.id,
        role: "user",
        content: message,
        toolName: null,
        toolInput: null,
        toolOutput: null,
        tokenUsage: null,
        latencyMs: null,
        error: null,
        createdAt: new Date().toISOString(),
      };
      setMessages([tempUserMessage]);

      const response = await api.sendChatMessage(newChat.id, message);
      setMessages([
        response.userMessage,
        ...response.toolMessages,
        response.assistantMessage,
      ]);
      fetchChats();
    } catch (error) {
      console.error("Failed to create chat with message:", error);
      toast.error("Failed to create chat");
    } finally {
      setIsSending(false);
    }
  };

  // Fetch chats
  const fetchChats = async () => {
    try {
      setIsLoadingChats(true);
      const data = await api.getChats(searchQuery || undefined);
      setChats(data);
    } catch (error) {
      console.error("Failed to fetch chats:", error);
      toast.error("Failed to fetch chats");
    } finally {
      setIsLoadingChats(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchChats();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch messages when chat is selected
  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        setIsLoadingMessages(true);
        const data = await api.getChatMessages(selectedChatId);
        setMessages(data);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        toast.error("Failed to fetch messages");
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadMessages();
  }, [selectedChatId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  const handleCreateChat = async () => {
    try {
      const newChat = await api.createChat({
        provider: selectedProvider,
        model: selectedModel,
      });
      setChats((prev) => [newChat, ...prev]);
      setSelectedChatId(newChat.id);
      toast.success("New chat created");
    } catch (error) {
      console.error("Failed to create chat:", error);
      toast.error("Failed to create chat");
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      await api.archiveChat(chatId);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (selectedChatId === chatId) {
        setSelectedChatId(null);
      }
      toast.success("Chat archived");
    } catch (error) {
      console.error("Failed to archive chat:", error);
      toast.error("Failed to archive chat");
    }
  };

  const handleUpdateChat = async (chatId: string, data: { title?: string; provider?: LlmProvider; model?: string }) => {
    try {
      const updated = await api.updateChat(chatId, data);
      setChats((prev) => prev.map((c) => (c.id === chatId ? updated : c)));
      setEditingChatId(null);
    } catch (error) {
      console.error("Failed to update chat:", error);
      toast.error("Failed to update chat");
    }
  };

  const handleSendMessage = async () => {
    if (!selectedChatId || !messageInput.trim() || isSending) return;

    const content = messageInput.trim();
    setMessageInput("");
    setIsSending(true);

    // Optimistically add user message
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      chatId: selectedChatId,
      role: "user",
      content,
      toolName: null,
      toolInput: null,
      toolOutput: null,
      tokenUsage: null,
      latencyMs: null,
      error: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await api.sendChatMessage(selectedChatId, content);

      // Replace temp message and add response
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempUserMessage.id);
        return [
          ...filtered,
          response.userMessage,
          ...response.toolMessages,
          response.assistantMessage,
        ];
      });

      // Refresh chat list to update timestamps/titles
      fetchChats();
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
      // Remove optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
      setMessageInput(content); // Restore input
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getModelName = (provider: LlmProvider, modelId: string) => {
    const prov = providers.find((p) => p.id === provider);
    const model = prov?.models.find((m) => m.id === modelId);
    return model?.name || modelId;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === "user";
    const isTool = message.role === "tool";
    const isAssistant = message.role === "assistant";

    if (isTool) {
      return (
        <div key={message.id} className="flex justify-center my-2">
          <div className="bg-muted/50 border rounded-lg p-3 max-w-[80%] text-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Wrench className="h-4 w-4" />
              <span className="font-medium">{message.toolName}</span>
            </div>
            {message.error ? (
              <div className="text-destructive">{message.error}</div>
            ) : (
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(message.toolOutput, null, 2)}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        key={message.id}
        className={cn(
          "flex gap-3 my-4",
          isUser ? "justify-end" : "justify-start"
        )}
      >
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
        <div
          className={cn(
            "rounded-lg px-4 py-2 max-w-[70%]",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          )}
        >
          {isAssistant ? (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-2 prose-pre:my-2 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:bg-muted-foreground/20">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}
          <div
            className={cn(
              "text-xs mt-1",
              isUser ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            {formatTime(message.createdAt)}
            {isAssistant && message.latencyMs && (
              <span className="ml-2">({message.latencyMs}ms)</span>
            )}
          </div>
        </div>
        {isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <User className="h-4 w-4" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Chat List Sidebar */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="flex gap-2">
            <Select
              value={selectedProvider}
              onValueChange={(value: LlmProvider) => {
                setSelectedProvider(value);
                const prov = providers.find((p) => p.id === value);
                if (prov?.models[0]) {
                  setSelectedModel(prov.models[0].id);
                }
              }}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedModel}
              onValueChange={setSelectedModel}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                {providers
                  .find((p) => p.id === selectedProvider)
                  ?.models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreateChat} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {isLoadingChats ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : chats.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No chats yet</p>
              <p className="text-sm">Create a new chat to get started</p>
            </div>
          ) : (
            <div className="p-2">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={cn(
                    "group flex items-center gap-2 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                    selectedChatId === chat.id && "bg-muted"
                  )}
                  onClick={() => setSelectedChatId(chat.id)}
                >
                  <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    {editingChatId === chat.id ? (
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => handleUpdateChat(chat.id, { title: editingTitle })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleUpdateChat(chat.id, { title: editingTitle });
                          } else if (e.key === "Escape") {
                            setEditingChatId(null);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="h-6 text-sm"
                      />
                    ) : (
                      <>
                        <div className="text-sm font-medium truncate max-w-[180px]">
                          {chat.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(chat.updatedAt).toLocaleDateString()}
                        </div>
                      </>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingChatId(chat.id);
                          setEditingTitle(chat.title);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChat(chat.id);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="font-semibold truncate max-w-md">{selectedChat.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {getModelName(selectedChat.provider, selectedChat.model)}
                </p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Bot className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">How can I help you?</p>
                  <p className="text-sm">
                    Ask me anything about your market data
                  </p>
                </div>
              ) : (
                <div>
                  {messages.map(renderMessage)}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSending}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || isSending}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
            <h2 className="text-xl font-semibold mb-2">Marketlum Assistant</h2>
            <p className="mb-4">Select a chat or create a new one to get started</p>
            <Button onClick={handleCreateChat}>
              <Plus className="mr-2 h-4 w-4" />
              New Chat
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
