"use client";

import { useState } from "react";
import { changePassword } from "@/lib/auth/actions";
import { Field, Label, ErrorMessage, Hint } from "@/components/fieldset";
import { Input } from "@/components/ui/Input";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

type Errors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  form?: string;
  success?: string;
};

export default function SecurityForm() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const next: Errors = {};
    if (!currentPassword) next.currentPassword = "Please enter your current password.";
    if (!newPassword) next.newPassword = "Please enter a new password.";
    if (newPassword.length < 8) next.newPassword = "Minimum 8 characters.";
    if (!confirmPassword) next.confirmPassword = "Please confirm the new password.";
    if (newPassword !== confirmPassword) {
      next.confirmPassword = "New passwords do not match.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) return;

    setLoading(true);

    const res = await changePassword(currentPassword, newPassword);

    if (res.ok) {
      setErrors({ success: "Password updated successfully. Redirecting…" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => router.push("/dashboard/account"), 1500);
    } else {
      setErrors({ form: res.message || "Incorrect current password." });
    }

    setLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="max-w-xl space-y-6 bg-white p-6 rounded-xl shadow-sm border border-[#e0dcd6]"
    >
      <h2 className="text-xl font-semibold mb-2">Change Password 🔐</h2>

      {/* CURRENT PASSWORD */}
      <Field>
        <Label htmlFor="currentPassword" requiredMark>
          Current password
        </Label>
        <div className="relative">
          <Input
            id="currentPassword"
            name="currentPassword"
            type={showCurrent ? "text" : "password"}
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            invalid={!!errors.currentPassword}
            aria-describedby={errors.currentPassword ? "currentPassword-error" : undefined}
            autoComplete="current-password"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-3 flex items-center text-[#777] hover:text-[#111]"
            onClick={() => setShowCurrent((v) => !v)}
            aria-label={showCurrent ? "Hide current password" : "Show current password"}
          >
            {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.currentPassword ? (
          <ErrorMessage id="currentPassword-error">{errors.currentPassword}</ErrorMessage>
        ) : (
          <Hint>We’ll verify your current password first.</Hint>
        )}
      </Field>

      {/* NEW PASSWORD */}
      <Field>
        <Label htmlFor="newPassword" requiredMark>
          New password
        </Label>
        <div className="relative">
          <Input
            id="newPassword"
            name="newPassword"
            type={showNew ? "text" : "password"}
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            invalid={!!errors.newPassword}
            aria-describedby={errors.newPassword ? "newPassword-error" : "newPassword-hint"}
            autoComplete="new-password"
            minLength={8}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-3 flex items-center text-[#777] hover:text-[#111]"
            onClick={() => setShowNew((v) => !v)}
            aria-label={showNew ? "Hide new password" : "Show new password"}
          >
            {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.newPassword ? (
          <ErrorMessage id="newPassword-error">{errors.newPassword}</ErrorMessage>
        ) : (
          <Hint id="newPassword-hint">Minimum 8 characters.</Hint>
        )}
      </Field>

      {/* CONFIRM PASSWORD */}
      <Field>
        <Label htmlFor="confirmPassword" requiredMark>
          Confirm new password
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirm ? "text" : "password"}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
            autoComplete="new-password"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-3 flex items-center text-[#777] hover:text-[#111]"
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? "Hide confirmation password" : "Show confirmation password"}
          >
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {errors.confirmPassword && (
          <ErrorMessage id="confirmPassword-error">
            {errors.confirmPassword}
          </ErrorMessage>
        )}
      </Field>

      {/* Messages */}
      {errors.form && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          ❌ {errors.form}
        </div>
      )}
      {errors.success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          {errors.success}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="mt-2 inline-block px-8 py-3 rounded-full bg-[var(--accent)] text-[var(--background)] font-semibold text-sm hover:bg-[var(--secondary)] transition-all disabled:opacity-50"
      >
        {loading ? "Updating…" : "Update Password"}
      </button>
    </form>
  );
}
