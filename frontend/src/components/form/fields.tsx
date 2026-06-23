import { useStore } from '@tanstack/react-form'
import { Checkbox } from '@/components/ui/checkbox'
import { EditableList } from '@/components/editable-list'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useFieldContext } from './form-context'

export interface SelectOption {
  value: string
  label: string
}

// Radix Select items can't use an empty value, so '' (our "none"/"unspecified"
// sentinel) is mapped to this private value at the Radix boundary.
const EMPTY_SELECT_VALUE = '__empty__'

// Renders validation messages for the current field, but only once the user
// has interacted with it so a pristine form isn't shouting errors. Standard
// Schema (Zod) errors arrive as objects with a `message`; plain function
// validators return strings — handle both.
function FieldError() {
  const field = useFieldContext()
  const errors = useStore(field.store, (s) => s.meta.errors)
  const isTouched = useStore(field.store, (s) => s.meta.isTouched)
  if (!isTouched || errors.length === 0) return null

  const messages = errors
    .map((error) =>
      typeof error === 'string' ? error : (error?.message as string | undefined),
    )
    .filter((message): message is string => Boolean(message))
  if (messages.length === 0) return null

  return <p className="text-sm text-destructive">{messages.join(', ')}</p>
}

export function TextField({
  label,
  placeholder,
  required,
  type = 'text',
  autoFocus,
}: {
  label?: string
  placeholder?: string
  required?: boolean
  type?: string
  autoFocus?: boolean
}) {
  const field = useFieldContext<string>()
  return (
    <div className="space-y-2">
      {label && <Label htmlFor={field.name}>{label}</Label>}
      <Input
        id={field.name}
        type={type}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
      <FieldError />
    </div>
  )
}

export function NumberField({
  label,
  min,
  max,
  className,
}: {
  label?: string
  min?: number
  max?: number
  className?: string
}) {
  const field = useFieldContext<number>()
  return (
    <div className="space-y-2">
      {label && <Label htmlFor={field.name}>{label}</Label>}
      <Input
        id={field.name}
        type="number"
        min={min}
        max={max}
        className={className}
        value={field.state.value}
        onChange={(e) =>
          field.handleChange(e.target.value === '' ? 0 : Number(e.target.value))
        }
        onBlur={field.handleBlur}
      />
      <FieldError />
    </div>
  )
}

export function TextareaField({
  label,
  placeholder,
  rows,
}: {
  label?: string
  placeholder?: string
  rows?: number
}) {
  const field = useFieldContext<string>()
  return (
    <div className="space-y-2">
      {label && <Label htmlFor={field.name}>{label}</Label>}
      <Textarea
        id={field.name}
        rows={rows}
        placeholder={placeholder}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
      <FieldError />
    </div>
  )
}

export function SelectField({
  label,
  options,
  placeholder,
  className,
  ariaLabel,
}: {
  label?: string
  options: readonly SelectOption[]
  // When provided, renders an extra item that maps to '' (the empty sentinel).
  placeholder?: string
  className?: string
  ariaLabel?: string
}) {
  const field = useFieldContext<string>()
  const value = field.state.value === '' ? EMPTY_SELECT_VALUE : field.state.value
  return (
    <div className="space-y-2">
      {label && <Label htmlFor={field.name}>{label}</Label>}
      <Select
        value={value}
        onValueChange={(next) =>
          field.handleChange(next === EMPTY_SELECT_VALUE ? '' : next)
        }
      >
        <SelectTrigger id={field.name} className={className} aria-label={ariaLabel}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {placeholder && (
            <SelectItem value={EMPTY_SELECT_VALUE}>{placeholder}</SelectItem>
          )}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError />
    </div>
  )
}

export function CheckboxField({ label }: { label: string }) {
  const field = useFieldContext<boolean>()
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={field.name}
        checked={field.state.value}
        onCheckedChange={(checked) => field.handleChange(checked === true)}
      />
      <Label htmlFor={field.name}>{label}</Label>
    </div>
  )
}

export function EditableListField({
  label,
  placeholder,
}: {
  label: string
  placeholder?: string
}) {
  const field = useFieldContext<string[]>()
  return (
    <EditableList
      id={field.name}
      label={label}
      items={field.state.value}
      onChange={field.handleChange}
      placeholder={placeholder}
    />
  )
}
