"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function PersonalInfoSection({ emailChanged }: { emailChanged: boolean }) {
  const t = useTranslations("profile");
  const { user, refreshUser } = useAuth();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user?.name ?? "");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);

  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  if (!user) return null;

  const handleSaveName = async () => {
    setNameSaving(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue }),
      });
      if (res.ok) {
        await refreshUser();
        setEditingName(false);
        setNameSuccess(true);
        setTimeout(() => setNameSuccess(false), 3000);
      }
    } finally {
      setNameSaving(false);
    }
  };

  const handleChangeEmail = async () => {
    setEmailError("");
    setEmailSending(true);
    try {
      const res = await fetch("/api/user/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail }),
      });
      if (res.ok) {
        setEmailSent(true);
        setNewEmail("");
      } else {
        const data = await res.json();
        setEmailError(data.error ?? "Failed to send verification email.");
      }
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <Card variant="glass" padding="lg">
      <h2 className="text-lg font-semibold text-white">{t("personalInfo")}</h2>

      {emailChanged && (
        <div className="mt-3 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          {t("emailChanged")}
        </div>
      )}

      {nameSuccess && (
        <div className="mt-3 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          {t("nameUpdated")}
        </div>
      )}

      <div className="mt-4 space-y-4 text-sm">
        {/* Name */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <span className="text-white/60">{t("username")}</span>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-sm text-white outline-none focus:border-emerald-300/70 transition-colors"
              />
              <Button size="sm" onClick={handleSaveName} disabled={nameSaving}>
                {nameSaving ? "..." : t("saveName")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditingName(false); setNameValue(user.name ?? ""); }}>
                {t("cancelEdit")}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-white">{user.name}</span>
              <Button size="sm" variant="ghost" onClick={() => setEditingName(true)}>
                {t("editName")}
              </Button>
            </div>
          )}
        </div>

        {/* Email */}
        <div className="border-b border-white/5 pb-3">
          <div className="flex items-center justify-between">
            <span className="text-white/60">{t("email")}</span>
            <div className="flex items-center gap-2">
              <span className="text-white">{user.email}</span>
              {user.emailVerified && (
                <Badge variant="accent">{t("emailVerified")}</Badge>
              )}
              <Button size="sm" variant="ghost" onClick={() => setShowEmailChange(!showEmailChange)}>
                {t("changeEmail")}
              </Button>
            </div>
          </div>

          {showEmailChange && (
            <div className="mt-3 space-y-3">
              {emailSent ? (
                <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                  {t("emailVerificationSent")}
                </div>
              ) : (
                <>
                  <Input
                    id="newEmail"
                    type="email"
                    placeholder={t("newEmail")}
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                  {emailError && (
                    <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                      {emailError}
                    </div>
                  )}
                  <Button size="sm" onClick={handleChangeEmail} disabled={emailSending || !newEmail}>
                    {emailSending ? "..." : t("sendVerification")}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
