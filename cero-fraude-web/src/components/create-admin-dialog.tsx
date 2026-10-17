"use client";

import { useState } from "react";
import axios from "axios";
import { Eye, EyeOff, LoaderCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Field = "username" | "email" | "password";
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;

const EMPTY_VALUES: Values = { username: "", email: "", password: "" };

// Same rules as the backend RegisterDto. This is only for UX: the backend
// validates everything again.
const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_MAX_LENGTH = 100;
const PASSWORD_MIN_LENGTH = 10;

function validate(values: Values): Errors {
  const errors: Errors = {};
  const username = values.username.trim();
  const email = values.email.trim();

  if (!username) {
    errors.username = "Ingresa un nombre de usuario.";
  } else if (username.length > USERNAME_MAX_LENGTH) {
    errors.username = `Máximo ${USERNAME_MAX_LENGTH} caracteres.`;
  } else if (!USERNAME_PATTERN.test(username)) {
    errors.username = "Usa solo letras, números y guiones bajos.";
  }

  if (!email) {
    errors.email = "Ingresa un correo.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Ingresa un correo válido.";
  }

  if (!values.password) {
    errors.password = "Ingresa una contraseña.";
  } else if (values.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`;
  }

  return errors;
}

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(", ");
  }

  return "No fue posible crear la cuenta.";
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Called after the account was created (also when it was created but
  // couldn't be promoted), so the list can reload.
  onCreated: () => void;
};

export function CreateAdminDialog({
  open,
  onOpenChange,
  onCreated,
}: Readonly<Props>) {
  const [values, setValues] = useState<Values>(EMPTY_VALUES);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  function reset() {
    setValues(EMPTY_VALUES);
    setErrors({});
    setFormError(null);
    setShowPassword(false);
  }

  function changeOpen(next: boolean) {
    if (saving) return;
    if (!next) reset();
    onOpenChange(next);
  }

  function updateField(field: Field) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
      setErrors((current) => ({ ...current, [field]: undefined }));
      setFormError(null);
    };
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setFormError(null);

    const username = values.username.trim();

    try {
      await axios.post("/api/admin/register", {
        username,
        email: values.email.trim(),
        password: values.password,
      });

      toast.success(`${username} ahora es administrador`);
      reset();
      onOpenChange(false);
      onCreated();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 502) {
        // The account exists as a regular user: close and show why.
        toast.error(getErrorMessage(error));
        reset();
        onOpenChange(false);
        onCreated();
      } else {
        setFormError(getErrorMessage(error));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent
        className="sm:max-w-120"
        showCloseButton={!saving}
        onInteractOutside={(event) => {
          if (saving) event.preventDefault();
        }}
      >
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Registrar administrador</DialogTitle>
            <DialogDescription>
              Se creará una cuenta nueva con rol de administrador.
              Podrá moderar publicaciones y gestionar usuarios y
              catálogos.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-username">Usuario</Label>
            <Input
              id="admin-username"
              autoComplete="off"
              value={values.username}
              onChange={updateField("username")}
              disabled={saving}
              maxLength={USERNAME_MAX_LENGTH}
              aria-invalid={Boolean(errors.username)}
              aria-describedby={
                errors.username ? "admin-username-error" : undefined
              }
              placeholder="nombre_apellido"
            />
            {errors.username && (
              <p id="admin-username-error" className="text-xs text-red-700">
                {errors.username}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-email">Correo</Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="off"
              value={values.email}
              onChange={updateField("email")}
              disabled={saving}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? "admin-email-error" : undefined
              }
              placeholder="nombre@correo.com"
            />
            {errors.email && (
              <p id="admin-email-error" className="text-xs text-red-700">
                {errors.email}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-password">Contraseña</Label>
            <div className="relative">
              <Input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={values.password}
                onChange={updateField("password")}
                disabled={saving}
                className="pr-10"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password
                    ? "admin-password-error"
                    : "admin-password-hint"
                }
                placeholder={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-0.5 top-0.5"
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </Button>
            </div>
            {errors.password ? (
              <p id="admin-password-error" className="text-xs text-red-700">
                {errors.password}
              </p>
            ) : (
              <p
                id="admin-password-hint"
                className="text-xs text-muted-foreground"
              >
                Compártela por un medio seguro y pide que la cambie al
                entrar.
              </p>
            )}
          </div>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => changeOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <LoaderCircle className="animate-spin" data-icon="inline-start" />
              ) : (
                <UserPlus data-icon="inline-start" />
              )}
              Registrar administrador
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
