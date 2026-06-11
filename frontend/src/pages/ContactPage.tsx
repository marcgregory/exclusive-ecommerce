import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Phone } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useSendContactMessageMutation } from '../api/ecommerceApi';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Button } from '../components/Button';
import { FormField } from '../components/FormField';
import { getRtkErrorMessage } from '../lib/rtkErrors';

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().trim().optional().default(''),
  message: z.string().trim().min(1, 'Message is required'),
});

type ContactFormInput = z.input<typeof contactSchema>;
type ContactForm = z.output<typeof contactSchema>;

export function ContactPage() {
  const [status, setStatus] = useState('');
  const [statusIsError, setStatusIsError] = useState(false);
  const [sendContactMessage] = useSendContactMessageMutation();
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<ContactFormInput, unknown, ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', phone: '', message: '' },
  });

  const submit = handleSubmit(async (payload) => {
    try {
      setStatus('');
      setStatusIsError(false);
      await sendContactMessage(payload).unwrap();
      setStatus('Message sent.');
      reset();
    } catch (error) {
      setStatusIsError(true);
      setStatus(getRtkErrorMessage(error));
    }
  });

  return (
    <main className="container page">
      <Breadcrumbs items={['Home', 'Contact']} />
      <div className="contact-layout">
        <aside className="contact-card">
          <div>
            <Phone />
            <h3>Call To Us</h3>
            <p>We are available 24/7, 7 days a week.</p>
            <p>Phone: +8801611112222</p>
          </div>
          <hr />
          <div>
            <Mail />
            <h3>Write To US</h3>
            <p>Fill out our form and we will contact you within 24 hours.</p>
            <p>Emails: customer@exclusive.com</p>
            <p>Emails: support@exclusive.com</p>
          </div>
        </aside>
        <form className="contact-form" onSubmit={submit}>
          <div className="three-col">
            <FormField
              name="name"
              label="Your Name"
              required
              register={register('name')}
              error={errors.name?.message}
            />
            <FormField
              name="email"
              label="Your Email"
              required
              register={register('email')}
              error={errors.email?.message}
            />
            <FormField
              name="phone"
              label="Your Phone"
              register={register('phone')}
              error={errors.phone?.message}
            />
          </div>
          <FormField
            name="message"
            label="Your Message"
            textarea
            required
            register={register('message')}
            error={errors.message?.message}
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </Button>
          {status && (
            <p className={`form-status ${statusIsError ? 'form-status--error' : ''}`}>{status}</p>
          )}
        </form>
      </div>
    </main>
  );
}
