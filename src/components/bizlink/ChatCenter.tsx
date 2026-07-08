import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Image, Check, CheckCheck, 
  Search, User, X, Loader2 
} from 'lucide-react';
import { db } from '@/firebase/config';
import { 
  collection, query, where, orderBy, onSnapshot, 
  addDoc, updateDoc, doc, setDoc 
} from 'firebase/firestore';
import { ChatThread, ChatMessage } from './MarketplaceTypes';

interface ChatCenterProps {
  currentUserId: string;
  currentUserName: string;
  isMerchantView?: boolean;
  onClose?: () => void;
  targetShopId?: string;
  targetMerchantId?: string;
  targetShopName?: string;
}

export default function ChatCenter({ 
  currentUserId, 
  currentUserName,
  isMerchantView = false, 
  onClose,
  targetShopId,
  targetMerchantId,
  targetShopName
}: ChatCenterProps) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Chat Threads
  useEffect(() => {
    setLoading(true);
    const threadsRef = collection(db, 'biz_chats');
    const fieldName = isMerchantView ? 'merchantId' : 'customerId';
    
    const q = query(
      threadsRef, 
      where(fieldName, '==', currentUserId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedThreads: ChatThread[] = [];
      snapshot.forEach((doc) => {
        fetchedThreads.push({ id: doc.id, ...doc.data() } as ChatThread);
      });
      // Sort by last message time descending
      fetchedThreads.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      setThreads(fetchedThreads);
      setLoading(false);

      // If we launched with a target merchant/shop, try to find or create the thread
      if (targetMerchantId && targetShopId && !activeThread) {
        const existing = fetchedThreads.find(t => t.merchantId === targetMerchantId && t.customerId === currentUserId);
        if (existing) {
          setActiveThread(existing);
        } else {
          // Create dummy thread state until first message is sent
          const tempThread: ChatThread = {
            id: `${currentUserId}_${targetMerchantId}`,
            customerId: currentUserId,
            customerName: currentUserName,
            merchantId: targetMerchantId,
            merchantName: targetShopName || 'Merchant',
            shopId: targetShopId,
            shopName: targetShopName || 'Shop',
            lastMessageText: 'Negotiate price, delivery, or ask details...',
            lastMessageAt: new Date().toISOString(),
            unreadCountCustomer: 0,
            unreadCountMerchant: 0
          };
          setActiveThread(tempThread);
        }
      }
    }, (error) => {
      console.error("Error loading chat threads:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUserId, isMerchantView, targetMerchantId, targetShopId]);

  // 2. Fetch Messages for Active Thread
  useEffect(() => {
    if (!activeThread) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(db, 'biz_messages');
    const q = query(
      messagesRef,
      where('chatId', '==', activeThread.id),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        fetchedMessages.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(fetchedMessages);

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      // Mark messages as read
      const unreadMessages = fetchedMessages.filter(
        msg => msg.senderId !== currentUserId && !msg.read
      );
      
      if (unreadMessages.length > 0) {
        // Clear unread count on the thread in Firestore
        const threadDocRef = doc(db, 'biz_chats', activeThread.id);
        const updates: any = {};
        if (isMerchantView) {
          updates.unreadCountMerchant = 0;
        } else {
          updates.unreadCountCustomer = 0;
        }
        updateDoc(threadDocRef, updates).catch(err => console.warn(err));

        // Mark individual messages as read
        unreadMessages.forEach((msg) => {
          updateDoc(doc(db, 'biz_messages', msg.id), { read: true }).catch(err => console.warn(err));
        });
      }
    });

    return () => unsubscribe();
  }, [activeThread, currentUserId, isMerchantView]);

  // 3. Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeThread) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const chatDocRef = doc(db, 'biz_chats', activeThread.id);
      
      // Ensure thread exists in Firestore first
      await setDoc(chatDocRef, {
        id: activeThread.id,
        customerId: activeThread.customerId,
        customerName: activeThread.customerName,
        merchantId: activeThread.merchantId,
        merchantName: activeThread.merchantName,
        shopId: activeThread.shopId,
        shopName: activeThread.shopName,
        lastMessageText: messageText,
        lastMessageAt: new Date().toISOString(),
        unreadCountCustomer: isMerchantView ? (activeThread.unreadCountCustomer + 1) : 0,
        unreadCountMerchant: !isMerchantView ? (activeThread.unreadCountMerchant + 1) : 0
      }, { merge: true });

      // Add actual message
      await addDoc(collection(db, 'biz_messages'), {
        chatId: activeThread.id,
        senderId: currentUserId,
        senderName: currentUserName,
        text: messageText,
        createdAt: new Date().toISOString(),
        read: false
      });

    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const filteredThreads = threads.filter(thread => {
    const term = searchQuery.toLowerCase();
    const nameToMatch = isMerchantView ? thread.customerName : thread.shopName;
    return nameToMatch.toLowerCase().includes(term);
  });

  return (
    <div className="flex bg-[#0c0c12] border border-[#222] rounded-2xl overflow-hidden h-[500px] shadow-2xl relative">
      {/* Sidebar - Threads List */}
      <div className={`w-1/3 border-r border-[#1a1a24] flex flex-col bg-[#08080c] ${activeThread ? 'hidden md:flex' : 'w-full md:w-1/3'}`}>
        <div className="p-4 border-b border-[#1a1a24] flex items-center justify-between">
          <h3 className="text-xs font-bold font-mono tracking-wider text-cyan-400 uppercase">
            {isMerchantView ? 'Customer Chats' : 'My Conversations'}
          </h3>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-full md:hidden text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[#1a1a24] relative">
          <Search className="w-3.5 h-3.5 absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder={isMerchantView ? "Search customer..." : "Search shop..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111116] border border-gray-800 rounded-xl py-1.5 pl-9 pr-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#13131a]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-2">
              <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />
              <span className="text-[10px] font-mono text-gray-500">Loading messages...</span>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-6 text-center text-[11px] text-gray-500 font-mono">
              No chat channels open yet.
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const isActive = activeThread?.id === thread.id;
              const hasUnread = isMerchantView ? thread.unreadCountMerchant > 0 : thread.unreadCountCustomer > 0;
              const displayName = isMerchantView ? thread.customerName : thread.shopName;
              
              return (
                <button
                  key={thread.id}
                  onClick={() => setActiveThread(thread)}
                  className={`w-full p-4 text-left flex items-start gap-3 transition-colors ${
                    isActive ? 'bg-cyan-500/10 border-l-2 border-cyan-500' : 'hover:bg-[#111116]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">{displayName}</span>
                      <span className="text-[9px] font-mono text-gray-500">
                        {new Date(thread.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={`text-[10px] truncate mt-0.5 ${hasUnread ? 'text-cyan-400 font-extrabold' : 'text-gray-500'}`}>
                      {thread.lastMessageText}
                    </p>
                  </div>
                  {hasUnread && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 mt-2"></span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Window */}
      <div className={`flex-1 flex flex-col bg-[#0a0a0f] ${!activeThread ? 'hidden md:flex items-center justify-center text-center p-6' : 'flex'}`}>
        {activeThread ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-[#161622] flex items-center justify-between bg-[#0e0e14]">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveThread(null)} 
                  className="md:hidden p-1 bg-[#1a1a24] hover:bg-gray-800 rounded text-gray-400 mr-1"
                >
                  ← Back
                </button>
                <div className="w-9 h-9 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">
                    {isMerchantView ? activeThread.customerName : activeThread.shopName}
                  </h4>
                  <p className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest mt-0.5">
                    {isMerchantView ? 'Customer Access Link' : 'Secure E-commerce Negotiation'}
                  </p>
                </div>
              </div>
              {onClose && (
                <button onClick={onClose} className="p-1.5 bg-[#1a1a24] hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Messages body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 flex flex-col">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 max-w-sm mx-auto space-y-2">
                  <MessageSquare className="w-8 h-8 text-cyan-500/30 animate-bounce" />
                  <p className="text-xs font-bold text-gray-300">Start the Kampala Trade Chat</p>
                  <p className="text-[10px] text-gray-500">
                    Ask for bargains, stock parameters, home delivery locations, or specific merchant information safely.
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isOwn = msg.senderId === currentUserId;
                  return (
                    <div
                      key={msg.id || index}
                      className={`flex flex-col max-w-[75%] ${isOwn ? 'self-end items-end' : 'self-start items-start'}`}
                    >
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        isOwn 
                          ? 'bg-cyan-500 text-black font-medium rounded-tr-none' 
                          : 'bg-[#151522] border border-[#222] text-white rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 px-1">
                        <span className="text-[8px] font-mono text-gray-500">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isOwn && (
                          msg.read ? (
                            <CheckCheck className="w-3 h-3 text-cyan-400" />
                          ) : (
                            <Check className="w-3 h-3 text-gray-500" />
                          )
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-4 bg-[#08080c] border-t border-[#161622] flex gap-2">
              <input
                type="text"
                placeholder="Type your trade message or bid details..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-[#111116] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
              />
              <button
                type="submit"
                className="px-4 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-500/10 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 space-y-4 max-w-sm">
            <MessageSquare className="w-12 h-12 text-gray-800 animate-pulse" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white tracking-widest uppercase">Direct Negotiations</h4>
              <p className="text-[10px] text-gray-500">
                Select a merchant or application channel from the sidebar to establish a secure negotiation connection over BizLink Uganda.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
