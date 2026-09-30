"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { forgotPasswordAction } from "@/features/auth/actions";
import { getCommerce } from "@/lib/commerce";
import {
  endSession,
  getSessionCustomer,
  getSessionCustomerId,
} from "@/server/auth/cookies";
import { AccountError, deleteAccount } from "@/server/account/service";
import { savedDesignDeps } from "@/server/saved-designs";
import {
  addressSchema,
  DELETE_CONFIRM_WORD,
  fieldErrors,
  profileSchema,
  type FormState,
} from "./schema";

/**
 * Server Actions for the account area (task 21). Public endpoints: the
 * customer always comes from the session cookie, never from the form.
 */
const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");
const SIGNED_OUT: FormState = {
  status: "error",
  message: "You've been signed out. Please sign in again.",
};
const FAILED: FormState = {
  status: "error",
  message: "That didn't save just now. Please try again.",
};

export async function saveAddressAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = await getSessionCustomerId();
  if (!id) return SIGNED_OUT;
  const values = {
    phone: str(formData.get("phone")),
    city: str(formData.get("city")),
    addressLine: str(formData.get("addressLine")),
    landmark: str(formData.get("landmark")),
  };
  const parsed = addressSchema.safeParse(values);
  if (!parsed.success)
    return {
      status: "error",
      fieldErrors: fieldErrors(parsed.error),
      values,
    };
  try {
    await getCommerce().updateCustomerProfile(id, {
      phone: parsed.data.phone,
      city: parsed.data.city,
      addressLine: parsed.data.addressLine,
      ...(parsed.data.landmark ? { landmark: parsed.data.landmark } : {}),
    });
  } catch (err) {
    console.error("[account] saving address failed", err);
    return { ...FAILED, values };
  }
  revalidatePath("/account", "layout");
  return { status: "saved" };
}

export async function saveProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = await getSessionCustomerId();
  if (!id) return SIGNED_OUT;
  const values = {
    firstName: str(formData.get("firstName")),
    lastName: str(formData.get("lastName")),
  };
  const parsed = profileSchema.safeParse({
    ...values,
    marketingOptIn: formData.get("marketingOptIn") === "on",
  });
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrors(parsed.error), values };
  try {
    await getCommerce().updateCustomerAccount(id, parsed.data);
  } catch (err) {
    console.error("[account] saving profile failed", err);
    return { ...FAILED, values };
  }
  revalidatePath("/account", "layout");
  return { status: "saved" };
}

/** Emails a change-password link (the reset flow; works for Google accounts too). */
export async function sendPasswordLinkAction(): Promise<FormState> {
  const customer = await getSessionCustomer();
  if (!customer) return SIGNED_OUT;
  const form = new FormData();
  form.set("email", customer.email);
  const r = await forgotPasswordAction({ status: "idle" }, form);
  return r.status === "sent"
    ? { status: "sent" }
    : {
        status: "error",
        message: "We couldn't send the email. Please try again.",
      };
}

export async function deleteAccountAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = await getSessionCustomerId();
  if (!id) return SIGNED_OUT;
  if (str(formData.get("confirm")).trim().toUpperCase() !== DELETE_CONFIRM_WORD)
    return {
      status: "error",
      fieldErrors: { confirm: `Type ${DELETE_CONFIRM_WORD} to confirm.` },
    };
  try {
    const deps = savedDesignDeps();
    await deleteAccount(id, {
      ...deps,
      commerce: getCommerce(),
    });
  } catch (err) {
    if (err instanceof AccountError)
      return { status: "error", message: err.message };
    console.error("[account] delete failed", err);
    return {
      status: "error",
      message:
        "We couldn't delete your account just now. Please try again, or contact us.",
    };
  }
  await endSession();
  redirect("/account/deleted");
}
