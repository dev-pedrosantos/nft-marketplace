import { useState } from 'react'
import type { FieldErrors } from './validation'

/** Minimal controlled-form state: values, per-field errors and input bindings. */
export function useForm<T extends { [K in keyof T]: string | boolean }>(initial: T) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<FieldErrors<T>>({})

  const setValue = <K extends keyof T>(field: K, value: T[K]) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
  }

  /** Props for a text control rendered inside `<Field>`. */
  const input = (field: keyof T & string, control: { id: string; invalid: boolean; describedBy?: string }) => ({
    id: control.id,
    name: field,
    value: String(values[field] ?? ''),
    'aria-invalid': control.invalid || undefined,
    'aria-describedby': control.describedBy,
    onChange: (event: { target: { value: string } }) => setValue(field, event.target.value as T[typeof field]),
  })

  return { values, setValues, errors, setErrors, setValue, input }
}

export const hasErrors = (errors: object) => Object.values(errors).some(Boolean)
