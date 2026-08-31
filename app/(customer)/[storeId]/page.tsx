"use client";

import { useState, use } from "react";
import { Search, ShoppingBag, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const MOCK_CATEGORIES = ["All", "Starters", "Mains", "Sushi", "Drinks", "Desserts"];

const MOCK_MENU = [
  { id: 1, name: "Truffle Burger", category: "Mains", description: "Wagyu beef, truffle mayo, aged cheddar, brioche bun", price: 18.99, image: "🍔" },
  { id: 2, name: "Spicy Tuna Roll", category: "Sushi", description: "Fresh tuna, spicy mayo, cucumber, sesame seeds", price: 14.50, image: "🍣" },
  { id: 3, name: "Matcha Latte", category: "Drinks", description: "Ceremonial grade matcha, oat milk, honey", price: 5.50, image: "🍵" },
  { id: 4, name: "Wagyu Steak", category: "Mains", description: "8oz A5 Wagyu, roasted garlic, sea salt", price: 45.00, image: "🥩" },
];

export default function CustomerMenu({ params }: { params: Promise<{ storeId: string }> }) {
  const resolvedParams = use(params);
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredMenu = activeCategory === "All" 
    ? MOCK_MENU 
    : MOCK_MENU.filter(item => item.category === activeCategory);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-x-0 border-t-0 rounded-none px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-outfit text-primary-500">DineHub</h1>
            <p className="text-xs text-zinc-400">Store #{resolvedParams.storeId}</p>
          </div>
          <button className="relative p-2 bg-white/5 rounded-full border border-white/10">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 bg-primary-500 text-black text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              0
            </span>
          </button>
        </div>
        
        {/* Search */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text"
            placeholder="Search menu..." 
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-primary-500/50 transition-colors"
          />
        </div>
      </header>

      {/* Categories */}
      <div className="px-4 py-6 overflow-x-auto no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div className="flex gap-3 w-max">
          {MOCK_CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 border",
                activeCategory === category
                  ? "bg-primary-500 text-black border-primary-500 shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                  : "bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-4 space-y-4">
        {filteredMenu.map(item => (
          <div key={item.id} className="glass-panel p-4 rounded-2xl border border-white/5 flex gap-4">
            <div className="w-24 h-24 rounded-xl bg-white/5 flex items-center justify-center text-4xl flex-shrink-0 border border-white/10 shadow-inner">
              {item.image}
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-white text-lg">{item.name}</h3>
                <p className="text-zinc-400 text-sm line-clamp-2 mt-1 leading-relaxed">{item.description}</p>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="font-bold text-primary-400">${item.price.toFixed(2)}</span>
                <button className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors border border-white/10 active:scale-90">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
