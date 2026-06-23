import { createFormHook } from '@tanstack/react-form'
import { fieldContext, formContext } from './form-context'
import {
  CheckboxField,
  EditableListField,
  NumberField,
  SelectField,
  TextField,
  TextareaField,
} from './fields'
import { SubmitButton } from './form-components'

// The app-wide form hook. `useAppForm` returns a form whose `AppField`s expose
// the bound field components below, and whose `AppForm` exposes the form
// components. `withForm` builds reusable, fully-typed sub-sections of a form
// (used by the NPC dialog's panels).
export const { useAppForm, withForm } = createFormHook({
  fieldComponents: {
    TextField,
    NumberField,
    TextareaField,
    SelectField,
    CheckboxField,
    EditableListField,
  },
  formComponents: {
    SubmitButton,
  },
  fieldContext,
  formContext,
})
