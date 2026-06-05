import { type FormEvent, useState } from "react";
import { Mail, Phone } from "lucide-react";
import { api } from "../api/client";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Button } from "../components/Button";
import { FormField } from "../components/FormField";
import { getErrorMessage } from "../lib/errors";

export function ContactPage() {
  const [status, setStatus] = useState("");
  const [statusIsError, setStatusIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      setSubmitting(true);
      setStatus("");
      setStatusIsError(false);
      await api("/api/contact", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
      setStatus("Message sent.");
      form.reset();
    } catch (error) {
      setStatusIsError(true);
      setStatus(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="container page">
      <Breadcrumbs items={["Home", "Contact"]} />
      <div className="contact-layout">
        <aside className="contact-card"><div><Phone /><h3>Call To Us</h3><p>We are available 24/7, 7 days a week.</p><p>Phone: +8801611112222</p></div><hr /><div><Mail /><h3>Write To US</h3><p>Fill out our form and we will contact you within 24 hours.</p><p>Emails: customer@exclusive.com</p><p>Emails: support@exclusive.com</p></div></aside>
        <form className="contact-form" onSubmit={submit}><div className="three-col"><FormField name="name" label="Your Name" required /><FormField name="email" label="Your Email" required /><FormField name="phone" label="Your Phone" /></div><FormField name="message" label="Your Message" textarea required /><Button type="submit" disabled={submitting}>{submitting ? "Sending..." : "Send Message"}</Button>{status && <p className={`form-status ${statusIsError ? "form-status--error" : ""}`}>{status}</p>}</form>
      </div>
    </main>
  );
}
