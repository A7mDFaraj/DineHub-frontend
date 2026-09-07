"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Store, UtensilsCrossed } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface Product {
  id: string;
  name?: string;
  nameAr?: string;
  nameEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  price: number;
  isAvailable?: boolean;
}

interface Category {
  id: string;
  name?: string;
  nameAr?: string;
  nameEn?: string;
  products?: Product[];
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(Number(price) || 0);
}

export default function BranchMenuPage({
  params,
}: {
  params: Promise<{ branchId: string }>;
}) {
  const { branchId } = use(params);
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    const loadMenu = async () => {
      try {
        setIsLoading(true);
        setError("");
        const { data } = await apiClient.get(`/menu/${branchId}`);
        const list = Array.isArray(data) ? data : data?.categories || data?.data || [];
        if (isCurrent) {
          setCategories(list);
          if (data.branch?.publicCode && data.branch.publicCode !== branchId) router.replace(`/menu/${data.branch.publicCode}`);
        }
      } catch (err) {
        console.error("Failed to load branch menu:", err);
        if (isCurrent) {
          setError("تعذر تحميل قائمة الطعام. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.");
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    void loadMenu();
    return () => {
      isCurrent = false;
    };
  }, [branchId, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center gap-3 text-stone-600">
        <LoadingSpinner size={36} />
        <p className="text-xs font-bold">جارٍ تجهيز القائمة…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-sm font-bold text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <header className="rounded-3xl border border-stone-200 bg-white p-5 text-center shadow-sm">
        <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-2xl bg-stone-100 text-stone-700">
          <Store size={21} aria-hidden="true" />
        </span>
        <h1 className="text-xl font-black text-stone-900">القائمة الرقمية</h1>
        <p className="mt-1 text-xs font-medium leading-relaxed text-stone-500">
          تصفح قائمة الطعام، وامسح رمز طاولتك لإرسال الطلب مباشرة إلى الطاقم.
        </p>
      </header>

      {categories.length === 0 ? (
        <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center">
          <UtensilsCrossed size={30} className="mx-auto mb-3 text-stone-400" aria-hidden="true" />
          <p className="font-bold text-stone-800">لا توجد أصناف متاحة حالياً.</p>
        </div>
      ) : (
        categories.map((category) => {
          const products = category.products || [];
          if (products.length === 0) return null;
          const title = category.nameAr || category.name || category.nameEn || "قسم القائمة";

          return (
            <section key={category.id} className="space-y-3">
              <h2 className="px-1 text-base font-black text-stone-900">{title}</h2>
              <div className="space-y-3">
                {products.map((product) => {
                  const name = product.nameAr || product.name || product.nameEn || "صنف";
                  const description = product.descriptionAr || product.descriptionEn;
                  return (
                    <article key={product.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="font-bold text-stone-900">{name}</h3>
                          {description && (
                            <p className="mt-1 text-xs leading-relaxed text-stone-500">{description}</p>
                          )}
                        </div>
                        <span className="shrink-0 font-mono text-sm font-black tabular-nums text-stone-900">
                          {formatPrice(product.price)}
                        </span>
                      </div>
                      {product.isAvailable === false && (
                        <p className="mt-2 text-xs font-bold text-stone-400">غير متوفر حالياً</p>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
