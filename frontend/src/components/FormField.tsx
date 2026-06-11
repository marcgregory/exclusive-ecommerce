import type { UseFormRegisterReturn } from 'react-hook-form';

type FormFieldProps = {
  label: string;
  name: string;
  required?: boolean;
  textarea?: boolean;
  defaultValue?: string;
  type?: string;
  register?: UseFormRegisterReturn;
  error?: string;
  disabled?: boolean;
};

export function FormField({
  label,
  name,
  required = false,
  textarea = false,
  defaultValue = '',
  type = 'text',
  register,
  error,
  disabled = false,
}: FormFieldProps) {
  return (
    <label className="form-field">
      <span>
        {label}
        {required && <b>*</b>}
      </span>
      {textarea ? (
        <textarea
          name={name}
          required={required}
          defaultValue={defaultValue}
          disabled={disabled}
          {...register}
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue}
          disabled={disabled}
          {...register}
        />
      )}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
