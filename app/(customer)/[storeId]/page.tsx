"use client";

import { useState, use } from "react";
import { Search, ShoppingBag, Plus, Sparkles, Store } from "lucide-react";
import { cn } from "@/lib/utils";

const MOCK_CATEGORIES = ["الكل", "مشروبات ساخنة", "مشروبات باردة", "وجبات خفيفة", "حلويات"];

const MOCK_MENU = [
  { id: 1, name: "فلات وايت كلاسيك", category: "مشروبات ساخنة", description: "إسبريسو فاخر مع حليب مبخر مخملي", price: 18.00, image: "☕" },
  { id: 2, name: "كرواسون باللوز والزبدة", category: "حلويات", description: "كرواسون طازج محشو بكريمة اللوز ومحمص", price: 16.00, image: "🥐" },
  { id: 3, name: "ماتشا لاتيه عضوي", category: "مشروبات ساخنة", description: "ماتشا فاخر مع حليب الشوفان والعسل", price: 22.00, image: "🍵" },
  { id: 4, name: "آيس دريب كولومبي", category: "مشروبات باردة", description: "قهوة مقطرة باردة بإيحاءات الفواكه والمكسرات", price: 20.00, image: "🧊" },
];

export default function CustomerMenu({ params }: { params: Promise<{ storeId: string }> }) {
  const resolvedParams = use(params);
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [search, setSearch] = useState("");

  const filteredMenu = MOCK_MENU
    .filter(item => activeCategory === "الكل" || item.category === activeCategory)
    .filter(item => !search || item.name.includes(search) || item.description.includes(search));

  return (
    <div 
      className="min-h-screen bg-[#0d0812] text-[#fffdf9] pb-24"
      dir="rtl"
      style={{
        fontFamily: "var(--font-thmanyah), var(--font-arabic), sans-serif",
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#160f1e]/85 backdrop-blur-xl border-b border-white/[0.08] px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#f2644b]/15 border border-[#f2644b]/25 text-[#ff9d8c] flex items-center justify-center">
              <Store size={20} />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white">متجر داين هب</h1>
              <p className="text-xs text-zinc-400">معاينة المتجر #{resolvedParams.storeId}</p>
            </div>
          </div>
          <button className="relative p-2.5 bg-white/[0.05] hover:bg-white/[0.1] rounded-2xl border border-white/[0.1] text-zinc-300 transition-colors">
            <ShoppingBag size={18} />
          </button>
        </div>
        
        {/* Search */}
        <div className="mt-3.5 relative">
          <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن طبق أو صنف…" 
            className="w-full bg-black/40 border border-white/[0.08] rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-[#f2644b]/50 transition-colors"
          />
        </div>
      </header>

      {/* Categories */}
      <div className="px-4 py-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-2">
          {MOCK_CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap shrink-0",
                activeCategory === category
                  ? "bg-[#f2644b] text-white border-transparent shadow-md"
                  : "bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:bg-white/[0.08]"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-4 space-y-3 max-w-xl mx-auto">
        {filteredMenu.map(item => (
          <div key={item.id} className="p-3.5 rounded-2xl bg-[#181120]/80 border border-white/[0.08] backdrop-blur-xl flex gap-3.5 items-center">
            <div className="w-18 h-18 rounded-xl bg-white/[0.04] flex items-center justify-center text-3xl shrink-0 border border-white/[0.06]">
              {item.image}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <h3 className="font-bold text-white text-sm truncate">{item.name}</h3>
                <span className="font-mono text-sm font-black text-[#ff9d8c] tabular-nums shrink-0">{item.price.toFixed(2)} ر.س</span>
              </div>
              <p className="text-zinc-400 text-xs line-clamp-1 mt-0.5">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
