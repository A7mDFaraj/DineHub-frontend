"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Layers,
  Loader2,
  Plus,
  Printer,
  QrCode as QrCodeIcon,
  RotateCcw,
  Search,
  Sparkles,
  Store,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAdminBranch } from "@/lib/admin-branch-context";
import { AdminBranchSelector } from "@/components/admin/admin-branch-selector";
import styles from "./qr-code.module.css";

interface Table {
  id: string;
  number: number;
  branchId: string;
}

export default function QrCodeManagementPage() {
  const {
    branches,
    selectedBranchId,
    selectedBranch,
  } = useAdminBranch();

  const [tables, setTables] = useState<Table[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<Table | null>(null);
  const [activePrintTable, setActivePrintTable] = useState<Table | null>(null);

  // Form states
  const [newTableNumber, setNewTableNumber] = useState("");
  const [batchStart, setBatchStart] = useState("1");
  const [batchCount, setBatchCount] = useState("10");

  // State flags
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedGeneral, setCopiedGeneral] = useState(false);

  // Messages
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const printAreaRef = useRef<HTMLDivElement>(null);

  const fetchTables = async (branchId: string) => {
    if (!branchId) return;
    try {
      setIsLoadingTables(true);
      setErrorMsg("");
      const { data } = await apiClient.get(`/admin/tables/${branchId}`);
      const list = Array.isArray(data) ? data : data?.data || data?.tables || [];
      const sorted = list.slice().sort((a: Table, b: Table) => a.number - b.number);
      setTables(sorted);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("تعذر جلب طاولات هذا الفرع. يرجى المحاولة لاحقاً.");
    } finally {
      setIsLoadingTables(false);
    }
  };

  useEffect(() => {
    if (selectedBranchId) {
      fetchTables(selectedBranchId);
    } else {
      setTables([]);
    }
  }, [selectedBranchId]);

  const getBaseOrigin = () => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "https://dinehub.a7mdfaraj.workers.dev";
  };

  const getBranchMenuUrl = () => {
    if (!selectedBranchId) return "";
    return `${getBaseOrigin()}/menu/${selectedBranch?.publicCode ?? selectedBranchId}`;
  };

  const getTableMenuUrl = (tableNumber: number) => {
    if (!selectedBranchId) return "";
    return `${getBaseOrigin()}/menu/${selectedBranch?.publicCode ?? selectedBranchId}/${tableNumber}`;
  };

  const handleCopy = (text: string, id: string) => {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(text);
    if (id === "general") {
      setCopiedGeneral(true);
      setTimeout(() => setCopiedGeneral(false), 2500);
    } else {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleDownloadQr = (svgId: string, filename: string) => {
    const svgElement = document.getElementById(svgId);
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 600;
      canvas.height = 600;
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 50, 50, 500, 500);
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `${filename}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleAddSingleTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) {
      setErrorMsg("يرجى اختيار فرع أولاً.");
      return;
    }
    const num = parseInt(newTableNumber, 10);
    if (isNaN(num) || num < 1) {
      setErrorMsg("يرجى إدخال رقم طاولة صحيح.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg("");
      await apiClient.post("/admin/tables", {
        number: num,
        branchId: selectedBranchId,
      });
      setSuccessMsg(`تمت إضافة طاولة #${num} بنجاح.`);
      setNewTableNumber("");
      setIsAddModalOpen(false);
      await fetchTables(selectedBranchId);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.response?.data?.message || "تعذر إضافة الطاولة. قد تكون مسجلة مسبقاً.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) return;
    const start = parseInt(batchStart, 10);
    const count = parseInt(batchCount, 10);

    if (isNaN(start) || start < 1 || isNaN(count) || count < 1 || count > 50) {
      setErrorMsg("يرجى إدخال أرقام صحيحة (العدد من 1 إلى 50).");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg("");

      const existingNumbers = new Set(tables.map((t) => t.number));
      const promises: Promise<unknown>[] = [];

      for (let i = 0; i < count; i++) {
        const tableNum = start + i;
        if (!existingNumbers.has(tableNum)) {
          promises.push(
            apiClient.post("/admin/tables", {
              number: tableNum,
              branchId: selectedBranchId,
            })
          );
        }
      }

      if (promises.length === 0) {
        setSuccessMsg("كل أرقام الطاولات المحددة موجودة بالفعل.");
        setIsBatchModalOpen(false);
        return;
      }

      const results = await Promise.allSettled(promises);
      const createdCount = results.filter(
        (result) => result.status === "fulfilled"
      ).length;
      const failedCount = results.length - createdCount;

      if (failedCount > 0) {
        setErrorMsg(
          createdCount > 0
            ? `تم إنشاء ${createdCount} طاولات، وتعذر إنشاء ${failedCount} طاولات. يرجى المحاولة مرة أخرى.`
            : "تعذر إنشاء الطاولات. يرجى المحاولة مرة أخرى."
        );
      } else {
        setSuccessMsg(`تم إنشاء ${createdCount} طاولات بنجاح.`);
        setIsBatchModalOpen(false);
      }
      await fetchTables(selectedBranchId);
      if (failedCount === 0) {
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("حدث خطأ أثناء التوليد التلقائي للطاولات.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!tableToDelete || !selectedBranchId) return;

    try {
      setIsDeleting(true);
      setErrorMsg("");
      await apiClient.delete(`/admin/tables/${tableToDelete.id}`);
      setSuccessMsg(`تم حذف طاولة #${tableToDelete.number} بنجاح.`);
      setIsDeleteModalOpen(false);
      setTableToDelete(null);
      await fetchTables(selectedBranchId);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.response?.data?.message || "تعذر حذف الطاولة.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrint = () => {
    const standMarkup = printAreaRef.current?.innerHTML;
    const printWindow = window.open("", "_blank", "noopener,noreferrer");

    if (!standMarkup || !printWindow) {
      setErrorMsg("تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة ثم المحاولة مرة أخرى.");
      return;
    }

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    };

    printWindow.document.write(`<!doctype html>
      <html dir="rtl">
        <head>
          <title>ستاند طاولة</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Arial, sans-serif; background: #fff; }
            .${styles.tentCardPreview} { width: 330px; padding: 28px; text-align: center; border: 1px solid #e7e1eb; border-radius: 24px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
            @media print { body { min-height: auto; } }
          </style>
        </head>
        <body>${standMarkup}</body>
      </html>`);
    printWindow.document.close();
  };

  const filteredTables = tables.filter((t) =>
    searchQuery === "" ? true : t.number.toString().includes(searchQuery.trim())
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" />
            الإدارة • رموز الطلب
          </p>
          <h1>رموز QR ونقاط طلب الطاولات</h1>
          <p>
            أنشئ رموز استجابة سريعة (QR) مخصصة لكل طاولة، أو شارك الرابط المباشر لقائمتك الرقمية.
          </p>
        </div>

        <div className={styles.headerActions}>
          <AdminBranchSelector />

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => selectedBranchId && fetchTables(selectedBranchId)}
            disabled={isLoadingTables || !selectedBranchId}
            aria-label="تحديث الطاولات"
          >
            <RotateCcw
              size={17}
              className={isLoadingTables ? "animate-spin" : undefined}
            />
            <span>تحديث</span>
          </button>

          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => {
              setErrorMsg("");
              setIsAddModalOpen(true);
            }}
            disabled={!selectedBranchId}
          >
            <Plus size={18} strokeWidth={2.2} />
            <span>إضافة طاولة</span>
          </button>
        </div>
      </header>

      {/* KPI Stats */}
      <section className={styles.kpiGrid} aria-label="ملخص رموز QR">
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="coral">
            <QrCodeIcon size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{tables.length}</span>
            <span className={styles.kpiLabel}>طاولات معرفة بالفرع</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="teal">
            <UtensilsCrossed size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>
              {selectedBranch?.nameAr || selectedBranch?.name || "الفرع المحدد"}
            </span>
            <span className={styles.kpiLabel}>نقطة الخدمة الحالية</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="lilac">
            <Sparkles size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>فوري وتلقائي</span>
            <span className={styles.kpiLabel}>توجيه مباشر لقائمة الطعام</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="plum">
            <Printer size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>طباعة قياسية</span>
            <span className={styles.kpiLabel}>ستاندات الطاولات والتصدير</span>
          </div>
        </div>
      </section>

      {successMsg && (
        <div className={styles.successBanner} role="status">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && !isAddModalOpen && !isBatchModalOpen && !isDeleteModalOpen && (
        <div className={styles.errorBanner} role="alert">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Public Menu Showcase Banner */}
      {selectedBranchId && (
        <section className={styles.showcaseBanner}>
          <div className={styles.showcaseCopy}>
            <span className={styles.showcaseTag}>
              <Store size={14} />
              <span>الرابط العام لقائمة الفرع</span>
            </span>
            <h2>القائمة الرقمية العامة بدون تحديد طاولة</h2>
            <p>
              استخدم هذا الرابط العام أو رمزه في حسابات التواصل الاجتماعي، خرائط جوجل، أو خدمة الاستلام المباشر.
            </p>

            <div className={styles.urlBox}>
              <span className={styles.urlText}>{getBranchMenuUrl()}</span>
              <div className={styles.urlActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => handleCopy(getBranchMenuUrl(), "general")}
                >
                  {copiedGeneral ? <Check size={14} color="#8cd1ca" /> : <Copy size={14} />}
                  <span>{copiedGeneral ? "تم النسخ" : "نسخ الرابط"}</span>
                </button>
                <a
                  href={getBranchMenuUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.secondaryButton}
                >
                  <ExternalLink size={14} />
                  <span>معاينة</span>
                </a>
              </div>
            </div>
          </div>

          <div className={styles.showcaseActions}>
            <div className={styles.showcaseQrCard}>
              <QRCodeSVG
                id="branch-general-qr"
                value={getBranchMenuUrl()}
                size={110}
                level="M"
              />
            </div>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() =>
                handleDownloadQr(
                  "branch-general-qr",
                  `dinehub-menu-${selectedBranch?.name || "branch"}`
                )
              }
              title="تحميل رمز QR بدقة عالية"
            >
              <Download size={16} />
              <span>تحميل الرمز</span>
            </button>
          </div>
        </section>
      )}

      {/* Filter / Action Row */}
      <div className={styles.filterRow}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="ابحث برقم الطاولة (مثال: 1, 5, 12)…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filterActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setIsBatchModalOpen(true)}
            disabled={!selectedBranchId}
          >
            <Layers size={16} />
            <span>توليد مجموعة طاولات</span>
          </button>
        </div>
      </div>

      {/* Table QR Grid */}
      {isLoadingTables && tables.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Loader2 size={28} className="animate-spin" />
          </div>
          <h3>جارٍ تحميل رموز الطاولات…</h3>
        </div>
      ) : !selectedBranchId ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <QrCodeIcon size={28} />
          </div>
          <h3>يرجى اختيار فرع أولاً</h3>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <QrCodeIcon size={28} />
          </div>
          <h3>
            {tables.length === 0
              ? "لا توجد طاولات معرفة في هذا الفرع بعد"
              : "لا توجد طاولة مطابقة للبحث"}
          </h3>
          <p>
            {tables.length === 0
              ? "أضف أرقام طاولات مطعمك لتوليد رموز QR جاهزة للطباعة والطلب."
              : "جرب البحث برقم طاولة آخر."}
          </p>
          {tables.length === 0 && (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => setIsAddModalOpen(true)}
              style={{ marginTop: "10px" }}
            >
              <Plus size={18} />
              <span>إضافة أول طاولة الآن</span>
            </button>
          )}
        </div>
      ) : (
        <div className={styles.tableGrid}>
          {filteredTables.map((table) => {
            const tableUrl = getTableMenuUrl(table.number);
            const isCopied = copiedId === table.id;
            const svgId = `table-qr-${table.id}`;

            return (
              <article key={table.id} className={styles.tableCard}>
                <div className={styles.tableHead}>
                  <span className={styles.tableNumberBadge}>
                    <QrCodeIcon size={16} color="#8cd1ca" />
                    <span>طاولة #{table.number}</span>
                  </span>
                </div>

                <div className={styles.qrContainer}>
                  <QRCodeSVG
                    id={svgId}
                    value={tableUrl}
                    size={140}
                    level="H"
                  />
                </div>

                <div className={styles.tableActions}>
                  <button
                    type="button"
                    className={styles.cardActionBtn}
                    onClick={() => handleCopy(tableUrl, table.id)}
                    title="نسخ الرابط"
                    aria-label={`نسخ رابط طاولة ${table.number}`}
                  >
                    {isCopied ? <Check size={16} color="#8cd1ca" /> : <Copy size={16} />}
                  </button>

                  <a
                    href={tableUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.cardActionBtn}
                    title="معاينة شاشة العميل"
                    aria-label={`معاينة طاولة ${table.number}`}
                  >
                    <ExternalLink size={16} />
                  </a>

                  <button
                    type="button"
                    className={styles.cardActionBtn}
                    onClick={() => {
                      setActivePrintTable(table);
                      setIsPrintModalOpen(true);
                    }}
                    title="طباعة ستاند الطاولة"
                    aria-label={`طباعة ستاند طاولة ${table.number}`}
                  >
                    <Printer size={16} />
                  </button>

                  <button
                    type="button"
                    className={styles.cardActionBtn}
                    data-variant="danger"
                    onClick={() => {
                      setTableToDelete(table);
                      setIsDeleteModalOpen(true);
                    }}
                    title="حذف الطاولة"
                    aria-label={`حذف طاولة ${table.number}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add Single Table Modal */}
      <Dialog.Root open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content className={styles.dialogContent} dir="rtl">
            <div className={styles.dialogHead}>
              <Dialog.Title>إضافة طاولة جديدة</Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className={styles.closeButton}
                  aria-label="إغلاق"
                >
                  <X size={19} />
                </button>
              </Dialog.Close>
            </div>

            {errorMsg && (
              <div
                className={styles.errorBanner}
                style={{ marginBottom: "16px" }}
                role="alert"
              >
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddSingleTable} className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label htmlFor="table-num">رقم الطاولة *</label>
                <input
                  id="table-num"
                  type="number"
                  min="1"
                  required
                  placeholder="مثال: 12"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                />
              </div>

              <div className={styles.dialogActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>جارٍ الحفظ…</span>
                    </>
                  ) : (
                    <span>إنشاء الطاولة</span>
                  )}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Batch Create Tables Modal */}
      <Dialog.Root open={isBatchModalOpen} onOpenChange={setIsBatchModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content className={styles.dialogContent} dir="rtl">
            <div className={styles.dialogHead}>
              <Dialog.Title>توليد مجموعة طاولات تلقائياً</Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className={styles.closeButton}
                  aria-label="إغلاق"
                >
                  <X size={19} />
                </button>
              </Dialog.Close>
            </div>

            {errorMsg && (
              <div
                className={styles.errorBanner}
                style={{ marginBottom: "16px" }}
                role="alert"
              >
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleBatchCreate} className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label htmlFor="batch-start">البدء من رقم الطاولة:</label>
                <input
                  id="batch-start"
                  type="number"
                  min="1"
                  required
                  value={batchStart}
                  onChange={(e) => setBatchStart(e.target.value)}
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="batch-count">عدد الطاولات المراد إنشاؤها (1 إلى 50):</label>
                <input
                  id="batch-count"
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={batchCount}
                  onChange={(e) => setBatchCount(e.target.value)}
                />
              </div>

              <p style={{ color: "#b9aebd", fontSize: "0.82rem", margin: 0 }}>
                سيتم تجاوز أي طاولة موجودة مسبقاً وتوليد الأرقام المتبقية تلقائياً.
              </p>

              <div className={styles.dialogActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setIsBatchModalOpen(false)}
                  disabled={isSubmitting}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>جارٍ التوليد…</span>
                    </>
                  ) : (
                    <span>توليد الطاولات الآن</span>
                  )}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Print Table Stand Modal */}
      <Dialog.Root open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content className={styles.dialogContent} dir="rtl">
            <div className={styles.dialogHead}>
              <Dialog.Title>معاينة وطباعة ستاند الطاولة</Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className={styles.closeButton}
                  aria-label="إغلاق"
                >
                  <X size={19} />
                </button>
              </Dialog.Close>
            </div>

            {activePrintTable && (
              <div ref={printAreaRef} className={styles.tentCardPreview}>
                <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f2644b" }}>
                  DineHub
                </span>
                <span className={styles.tentCardTitle}>
                  {selectedBranch?.nameAr || selectedBranch?.name || "مطعمنا الفاخر"}
                </span>
                <p className={styles.tentCardLead}>
                  امسح الرمز بكاميرا هاتفك لتصفح القائمة والطلب مباشرة
                </p>

                <div style={{ background: "#ffffff", padding: "16px", borderRadius: "16px", margin: "8px 0" }}>
                  <QRCodeSVG
                    id={`print-qr-${activePrintTable.id}`}
                    value={getTableMenuUrl(activePrintTable.number)}
                    size={190}
                    level="H"
                  />
                </div>

                <div
                  style={{
                    background: "#22182a",
                    color: "#fffdf9",
                    padding: "6px 20px",
                    borderRadius: "999px",
                    fontWeight: 800,
                    fontSize: "1.05rem",
                  }}
                >
                  طاولة #{activePrintTable.number}
                </div>
              </div>
            )}

            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() =>
                  activePrintTable &&
                  handleDownloadQr(
                    `print-qr-${activePrintTable.id}`,
                    `table-${activePrintTable.number}-qr`
                  )
                }
              >
                <Download size={16} />
                <span>تحميل كصورة PNG</span>
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handlePrint}
              >
                <Printer size={16} />
                <span>طباعة الستاند</span>
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirmation Modal */}
      <Dialog.Root
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
      >
        <Dialog.Portal>
          <Dialog.Overlay className={styles.dialogOverlay} />
          <Dialog.Content className={styles.dialogContent} dir="rtl">
            <div className={styles.dialogHead}>
              <Dialog.Title>تأكيد حذف الطاولة</Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className={styles.closeButton}
                  aria-label="إغلاق"
                >
                  <X size={19} />
                </button>
              </Dialog.Close>
            </div>

            <p style={{ color: "#cbbfce", fontSize: "0.9rem", lineHeight: 1.7, margin: "0 0 20px" }}>
              هل أنت متأكد من رغبتك في حذف طاولة{" "}
              <strong style={{ color: "#fffdf9" }}>
                "#{tableToDelete?.number}"
              </strong>
              ؟ لن يتمكن العملاء من مسح رمز هذه الطاولة للطلب بعد الحذف.
            </p>

            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                إلغاء
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{ background: "#be4936" }}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>جارٍ الحذف…</span>
                  </>
                ) : (
                  <span>نعم، احذف الطاولة</span>
                )}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
