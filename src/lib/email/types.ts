/**
 * Transactional email (password reset). Server-only; used through `getEmail()`.
 * WooCommerce's own order emails are separate (WP Mail SMTP).
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
