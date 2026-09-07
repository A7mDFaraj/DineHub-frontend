"use client";

import { apiErrorMessage } from "@/lib/api-error";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { useLocale, useTranslations } from "next-intl";
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
  const t = useTranslations("AdminQrCode");
  const tCommon = useTranslations("AdminCommon");
  const locale = useLocale();
  const isRtl = locale !== "en";

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

  const fetchTables = useCallback(async (branchId: string) => {
    if (!branchId) return;
    try {
      setIsLoadingTables(true);
      setErrorMsg("");
      const { data } = await apiClient.get(`/admin/tables/${branchId}`);
      const list = Array.isArray(data) ? data : data?.data || data?.tables || [];
      const sorted = list.slice().sort((a: Table, b: Table) => a.number - b.number);
      setTables(sorted);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(t("errorFetch"));
    } finally {
      setIsLoadingTables(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = setTimeout(() => {
    if (selectedBranchId) {
      fetchTables(selectedBranchId);
    } else {
      setTables([]);
    }
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedBranchId, fetchTables]);

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
      setErrorMsg(t("selectBranchFirst"));
      return;
    }
    const num = parseInt(newTableNumber, 10);
    if (isNaN(num) || num < 1) {
      setErrorMsg(t("tableNumberHelp"));
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg("");
      await apiClient.post("/admin/tables", {
        number: num,
        branchId: selectedBranchId,
      });
      setSuccessMsg(isRtl ? `تمت إضافة طاولة #${num} بنجاح.` : `Table #${num} added successfully.`);
      setNewTableNumber("");
      setIsAddModalOpen(false);
      await fetchTables(selectedBranchId);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(apiErrorMessage(err) || (isRtl ? "تعذر إضافة الطاولة. قد تكون مسجلة مسبقاً." : "Failed to add table. It may already exist."));
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
      setErrorMsg(isRtl ? "يرجى إدخال أرقام صحيحة (العدد من 1 إلى 50)." : "Please enter valid numbers (count between 1 and 50).");
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
        setSuccessMsg(isRtl ? "كل أرقام الطاولات المحددة موجودة بالفعل." : "All specified table numbers already exist.");
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
            ? (isRtl ? `تم إنشاء ${createdCount} طاولات، وتعذر إنشاء ${failedCount} طاولات.` : `Created ${createdCount} tables; failed to create ${failedCount}.`)
            : (isRtl ? "تعذر إنشاء الطاولات. يرجى المحاولة مرة أخرى." : "Failed to create tables. Please retry.")
        );
      } else {
        setSuccessMsg(isRtl ? `تم إنشاء ${createdCount} طاولات بنجاح.` : `${createdCount} tables created successfully.`);
        setIsBatchModalOpen(false);
      }
      await fetchTables(selectedBranchId);
      if (failedCount === 0) {
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(isRtl ? "حدث خطأ أثناء التوليد التلقائي للطاولات." : "Error occurred while generating tables.");
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
      setSuccessMsg(isRtl ? `تم حذف طاولة #${tableToDelete.number} بنجاح.` : `Table #${tableToDelete.number} deleted successfully.`);
      setIsDeleteModalOpen(false);
      setTableToDelete(null);
      await fetchTables(selectedBranchId);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(apiErrorMessage(err) || (isRtl ? "تعذر حذف الطاولة." : "Failed to delete table."));
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrint = () => {
    const standMarkup = printAreaRef.current?.innerHTML;
    const printWindow = window.open("", "_blank", "noopener,noreferrer");

    if (!standMarkup || !printWindow) {
      setErrorMsg(t("errorPrint"));
      return;
    }

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    };

    printWindow.document.write(`<!doctype html>
      <html dir="${isRtl ? "rtl" : "ltr"}">
        <head>
          <title>${t("tentCardTitle")}</title>
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

  const branchDisplayName = isRtl
    ? (selectedBranch?.nameAr || selectedBranch?.name || selectedBranch?.nameEn || t("kpiDefaultBranch"))
    : (selectedBranch?.nameEn || selectedBranch?.name || selectedBranch?.nameAr || t("kpiDefaultBranch"));

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" />
            {t("eyebrow")}
          </p>
          <h1>{t("pageTitle")}</h1>
          <p>
            {t("pageDesc")}
          </p>
        </div>

        <div className={styles.headerActions}>
          <AdminBranchSelector />

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => selectedBranchId && fetchTables(selectedBranchId)}
            disabled={isLoadingTables || !selectedBranchId}
            title={tCommon("retry")}
          >
            <RotateCcw
              size={17}
              className={isLoadingTables ? "animate-spin" : undefined}
            />
            <span>{isLoadingTables ? tCommon("loading") : tCommon("retry")}</span>
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
            <span>{t("addTable")}</span>
          </button>
        </div>
      </header>

      {/* KPI Stats */}
      <section className={styles.kpiGrid} aria-label={t("kpiSummaryAria")}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="coral">
            <QrCodeIcon size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{tables.length}</span>
            <span className={styles.kpiLabel}>{t("kpiTables")}</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="teal">
            <UtensilsCrossed size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>
              {branchDisplayName}
            </span>
            <span className={styles.kpiLabel}>{t("kpiCurrentBranch")}</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="lilac">
            <Sparkles size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{t("kpiInstant")}</span>
            <span className={styles.kpiLabel}>{t("kpiInstantDesc")}</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} data-tone="plum">
            <Printer size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{t("kpiPrint")}</span>
            <span className={styles.kpiLabel}>{t("kpiPrintDesc")}</span>
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
              <span>{t("showcaseTag")}</span>
            </span>
            <h2>{t("showcaseTitle")}</h2>
            <p>
              {t("showcaseDesc")}
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
                  <span>{copiedGeneral ? t("copied") : t("copyUrl")}</span>
                </button>
                <a
                  href={getBranchMenuUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.secondaryButton}
                >
                  <ExternalLink size={14} />
                  <span>{t("preview")}</span>
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
              title={t("downloadQrTitle")}
            >
              <Download size={16} />
              <span>{t("downloadQr")}</span>
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
            placeholder={t("searchPlaceholder")}
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
            <span>{t("batchGenerate")}</span>
          </button>
        </div>
      </div>

      {/* Table QR Grid */}
      {isLoadingTables && tables.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Loader2 size={28} className="animate-spin" />
          </div>
          <h3>{t("loadingTables")}</h3>
        </div>
      ) : !selectedBranchId ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <QrCodeIcon size={28} />
          </div>
          <h3>{t("selectBranchFirst")}</h3>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <QrCodeIcon size={28} />
          </div>
          <h3>
            {tables.length === 0
              ? t("emptyTablesTitle")
              : t("emptyTablesSearchTitle")}
          </h3>
          <p>
            {tables.length === 0
              ? t("emptyTablesDesc")
              : t("emptyTablesSearchDesc")}
          </p>
          {tables.length === 0 && (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => setIsAddModalOpen(true)}
              style={{ marginTop: "10px" }}
            >
              <Plus size={18} />
              <span>{t("addFirstTable")}</span>
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
                    <span>{t("tableLabel")} #{table.number}</span>
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
                    title={t("copyTableUrl")}
                    aria-label={`${t("copyTableUrl")} #${table.number}`}
                  >
                    {isCopied ? <Check size={16} color="#8cd1ca" /> : <Copy size={16} />}
                  </button>

                  <a
                    href={tableUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.cardActionBtn}
                    title={t("preview")}
                    aria-label={`${t("preview")} #${table.number}`}
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
                    title={t("printStand")}
                    aria-label={`${t("printStand")} #${table.number}`}
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
                    title={tCommon("delete")}
                    aria-label={`${t("deleteTableAria")} #${table.number}`}
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
          <Dialog.Content className={styles.dialogContent} dir={isRtl ? "rtl" : "ltr"}>
            <div className={styles.dialogHead}>
              <Dialog.Title>{t("modalAddTitle")}</Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className={styles.closeButton}
                  aria-label={tCommon("cancel")}
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
                <label htmlFor="table-num">{t("tableNumberLabel")} *</label>
                <input
                  id="table-num"
                  type="number"
                  min="1"
                  required
                  placeholder={t("tableNumberPlaceholder")}
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
                  {tCommon("cancel")}
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{t("adding")}</span>
                    </>
                  ) : (
                    <span>{t("addTable")}</span>
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
          <Dialog.Content className={styles.dialogContent} dir={isRtl ? "rtl" : "ltr"}>
            <div className={styles.dialogHead}>
              <Dialog.Title>{t("modalBatchTitle")}</Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className={styles.closeButton}
                  aria-label={tCommon("cancel")}
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
                <label htmlFor="batch-start">{t("batchStartLabel")}</label>
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
                <label htmlFor="batch-count">{t("batchCountLabel")} (1-50):</label>
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
                {t("batchPreview", {
                  start: batchStart,
                  end: Math.max(1, (parseInt(batchStart, 10) || 1) + (parseInt(batchCount, 10) || 1) - 1),
                  count: batchCount,
                })}
              </p>

              <div className={styles.dialogActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setIsBatchModalOpen(false)}
                  disabled={isSubmitting}
                >
                  {tCommon("cancel")}
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{t("generating")}</span>
                    </>
                  ) : (
                    <span>{t("batchGenerate")}</span>
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
          <Dialog.Content className={styles.dialogContent} dir={isRtl ? "rtl" : "ltr"}>
            <div className={styles.dialogHead}>
              <Dialog.Title>{t("modalPrintTitle")}</Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className={styles.closeButton}
                  aria-label={tCommon("cancel")}
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
                <span className={styles.tentCardTitle}>{branchDisplayName}</span>
                <p className={styles.tentCardLead}>
                  {t("scanInstructions")}
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
                  {t("tableLabel")} #{activePrintTable.number}
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
                <span>{t("downloadPng")}</span>
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handlePrint}
              >
                <Printer size={16} />
                <span>{t("printStand")}</span>
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
          <Dialog.Content className={styles.dialogContent} dir={isRtl ? "rtl" : "ltr"}>
            <div className={styles.dialogHead}>
              <Dialog.Title>{t("modalDeleteTitle")}</Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className={styles.closeButton}
                  aria-label={tCommon("cancel")}
                >
                  <X size={19} />
                </button>
              </Dialog.Close>
            </div>

            <p style={{ color: "#cbbfce", fontSize: "0.9rem", lineHeight: 1.7, margin: "0 0 20px" }}>
              {t("modalDeleteDesc", { number: tableToDelete?.number ?? 0 })}{" "}
              {t("modalDeleteWarning")}
            </p>

            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                {tCommon("cancel")}
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
                    <span>{t("deleting")}</span>
                  </>
                ) : (
                  <span>{tCommon("delete")}</span>
                )}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
