"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface SessionInfo {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expires: string;
}

export function SecuritySection() {
  const t = useTranslations("profile");
  const { user, refreshUser } = useAuth();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // 2FA state
  const [setting2FA, setSetting2FA] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFAError, setTwoFAError] = useState("");
  const [twoFAVerifying, setTwoFAVerifying] = useState(false);
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [disableError, setDisableError] = useState("");

  // Sessions state
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  if (!user) return null;

  const handleChangePassword = async () => {
    setPasswordError("");
    if (newPassword !== confirmPassword) {
      setPasswordError(t("passwordMismatch"));
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setPasswordSuccess(true);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccess(false), 3000);
      } else {
        const data = await res.json();
        setPasswordError(data.error ?? "Failed to update password.");
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSetup2FA = async () => {
    setSetting2FA(true);
    setTwoFAError("");
    const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setQrCode(data.qrCode);
      setSecret(data.secret);
    }
  };

  const handleVerify2FA = async () => {
    setTwoFAError("");
    setTwoFAVerifying(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: twoFACode }),
      });
      if (res.ok) {
        await refreshUser();
        setSetting2FA(false);
        setQrCode("");
        setSecret("");
        setTwoFACode("");
      } else {
        const data = await res.json();
        setTwoFAError(data.error ?? "Invalid code.");
      }
    } finally {
      setTwoFAVerifying(false);
    }
  };

  const handleDisable2FA = async () => {
    setDisableError("");
    setTwoFAVerifying(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode }),
      });
      if (res.ok) {
        await refreshUser();
        setDisabling2FA(false);
        setDisableCode("");
      } else {
        const data = await res.json();
        setDisableError(data.error ?? "Invalid code.");
      }
    } finally {
      setTwoFAVerifying(false);
    }
  };

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch("/api/user/sessions");
      if (res.ok) {
        setSessions(await res.json());
      }
    } finally {
      setSessionsLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    await fetch(`/api/user/sessions?id=${sessionId}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  return (
    <Card variant="glass" padding="lg">
      <h2 className="text-lg font-semibold text-text-primary">{t("security")}</h2>

      <div className="mt-4 space-y-6">
        {/* Password Change */}
        {user.hasPassword ? (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-text-primary">{t("changePassword")}</h3>
            {passwordSuccess && (
              <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                {t("passwordUpdated")}
              </div>
            )}
            <Input
              id="currentPassword"
              type="password"
              label={t("currentPassword")}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
            <Input
              id="newPassword"
              type="password"
              label={t("newPassword")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <Input
              id="confirmPassword"
              type="password"
              label={t("confirmPassword")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            {passwordError && (
              <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {passwordError}
              </div>
            )}
            <Button
              size="sm"
              onClick={handleChangePassword}
              disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
            >
              {passwordSaving ? "..." : t("updatePassword")}
            </Button>
          </div>
        ) : (
          <div>
            <h3 className="text-sm font-medium text-text-primary">{t("changePassword")}</h3>
            <p className="mt-1 text-xs text-text-tertiary">{t("oauthOnly")}</p>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-border-subtle" />

        {/* 2FA Management */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-primary">{t("twoFactorAuth")}</h3>
            <Badge variant={user.twoFactorEnabled ? "accent" : "default"}>
              {user.twoFactorEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>

          {!user.twoFactorEnabled && !setting2FA && (
            <Button size="sm" variant="secondary" onClick={handleSetup2FA}>
              {t("enable2FA")}
            </Button>
          )}

          {setting2FA && qrCode && (
            <div className="space-y-3">
              <p className="text-xs text-text-secondary">{t("scanQRCode")}</p>
              <div className="flex justify-center">
                <img src={qrCode} alt="2FA QR Code" className="h-48 w-48 rounded-lg" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-text-tertiary">{t("manualEntry")}</p>
                <code className="block rounded bg-surface px-2 py-1 text-xs text-emerald-300 break-all">
                  {secret}
                </code>
              </div>
              <Input
                id="twoFACode"
                type="text"
                label={t("enter2FACode")}
                placeholder="000000"
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value)}
                maxLength={6}
              />
              {twoFAError && (
                <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {twoFAError}
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleVerify2FA} disabled={twoFAVerifying || twoFACode.length !== 6}>
                  {twoFAVerifying ? "..." : t("verifyCode")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setSetting2FA(false); setQrCode(""); setSecret(""); setTwoFACode(""); }}>
                  {t("cancelEdit")}
                </Button>
              </div>
            </div>
          )}

          {user.twoFactorEnabled && !disabling2FA && (
            <Button size="sm" variant="danger" onClick={() => setDisabling2FA(true)}>
              {t("disable2FA")}
            </Button>
          )}

          {disabling2FA && (
            <div className="space-y-3">
              <Input
                id="disableCode"
                type="text"
                label={t("enter2FACode")}
                placeholder="000000"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                maxLength={6}
              />
              {disableError && (
                <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {disableError}
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="danger" onClick={handleDisable2FA} disabled={twoFAVerifying || disableCode.length !== 6}>
                  {twoFAVerifying ? "..." : t("disable2FA")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setDisabling2FA(false); setDisableCode(""); }}>
                  {t("cancelEdit")}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-border-subtle" />

        {/* Active Sessions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-primary">{t("activeSessions")}</h3>
            <Button size="sm" variant="ghost" onClick={loadSessions} disabled={sessionsLoading}>
              {sessionsLoading ? "..." : sessions.length > 0 ? "Refresh" : "Load"}
            </Button>
          </div>

          {sessions.length > 0 && (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-xs">
                  <div className="space-y-0.5">
                    <div className="text-text-secondary truncate max-w-[280px]">
                      {s.userAgent ?? "Unknown device"}
                    </div>
                    <div className="text-text-tertiary">
                      {s.ipAddress ?? "Unknown IP"} &middot; {new Date(s.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => revokeSession(s.id)}>
                    {t("revoke")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
