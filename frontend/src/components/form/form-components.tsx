import { Button } from '@/components/ui/button'
import { useFormContext } from './form-context'

// Submit button bound to form context: disables itself while the form is
// invalid or submitting. `pending` lets the caller also reflect an external
// async submit (e.g. a React Query mutation) that the form doesn't await.
export function SubmitButton({
  label,
  pendingLabel,
  pending,
  formId,
}: {
  label: string
  pendingLabel: string
  pending?: boolean
  formId?: string
}) {
  const form = useFormContext()
  return (
    <form.Subscribe
      selector={(state) => ({
        canSubmit: state.canSubmit,
        isSubmitting: state.isSubmitting,
      })}
    >
      {({ canSubmit, isSubmitting }) => {
        const busy = pending || isSubmitting
        return (
          <Button type="submit" form={formId} disabled={!canSubmit || busy}>
            {busy ? pendingLabel : label}
          </Button>
        )
      }}
    </form.Subscribe>
  )
}
