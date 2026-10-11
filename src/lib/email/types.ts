/**
 * Transactional email (password reset, vendor hand-off). Server-only; used through `getEmail()`.
 * WooCommerce's own order emails are separate (WP Mail SMTP).
 */
export interface EmailAttachment {
  filename: string;
  content: Uint8Array;
  contentType: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Files sent with the email (e.g. print files to a vendor). */
  attachments?: EmailAttachment[];
  /** Where replies go (e.g. the admin address for vendor emails). */
  replyTo?: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
