import { createFormHookContexts } from '@tanstack/react-form'

// Shared contexts that bind custom field/form components to a form instance.
// Consumed by the field components in `fields.tsx` and the form hook in
// `app-form.ts`. See https://tanstack.com/form — "Form Composition".
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts()
