type FormFieldProps = {
  label: string;
  name: string;
  required?: boolean;
  textarea?: boolean;
  defaultValue?: string;
};

export function FormField({ label, name, required = false, textarea = false, defaultValue = "" }: FormFieldProps) {
  return (
    <label className="form-field">
      <span>{label}{required && <b>*</b>}</span>
      {textarea ? (
        <textarea name={name} required={required} defaultValue={defaultValue} />
      ) : (
        <input name={name} required={required} defaultValue={defaultValue} />
      )}
    </label>
  );
}
