"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AccountSection() {
  const t = useTranslations("profile");

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleExport = () => {
    window.open("/api/user/export", "_blank");
  };

  const handleDelete = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/user/delete", { method: "POST" });
      if (res.ok) {
        window.location.href = "/";
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card variant="glass" padding="lg" className="border-rose-400/20">
      <h2 className="text-lg font-semibold text-white">{t("account")}</h2>

      <div className="mt-4 space-y-4">
        {/* Data Export */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-white">{t("exportData")}</div>
            <div className="text-xs text-white/50">{t("exportDataDescription")}</div>
          </div>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            {t("export")}
          </Button>
        </div>

        {/* Divider */}
        <div className="border-t border-white/5" />

        {/* Account Deletion */}
        <div className="space-y-3">
          <div>
            <div className="text-sm text-white">{t("deleteAccount")}</div>
            <div className="text-xs text-white/50">{t("deleteAccountDescription")}</div>
          </div>
          <Input
            id="deleteConfirm"
            type="text"
            placeholder={t("typeDelete")}
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
          />
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={deleteConfirm !== "DELETE" || deleting}
          >
            {deleting ? "..." : t("confirmDelete")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
