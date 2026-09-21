import { LessonShell, defineLessons } from "@lab/lesson-shell";

import { ControlledUncontrolled } from "./lessons/01_controlled_uncontrolled";
import { ReactHookFormLesson } from "./lessons/02_react_hook_form";
import { ZodValidation } from "./lessons/03_zod_validation";
import { AccessibleErrors } from "./lessons/04_accessible_errors";
import { FieldArrays } from "./lessons/05_field_arrays";
import { FileUpload } from "./lessons/06_file_upload";

const lessons = defineLessons([
  {
    id: "01-controlled-uncontrolled",
    group: "The two shapes",
    title: "Controlled and uncontrolled",
    summary: "Who owns the value decides what the form can do and what it costs.",
    file: "src/lessons/01_controlled_uncontrolled.tsx",
    Component: ControlledUncontrolled,
  },
  {
    id: "02-react-hook-form",
    group: "A library",
    title: "React Hook Form",
    summary: "Uncontrolled with validation attached, and a formState Proxy that decides renders.",
    file: "src/lessons/02_react_hook_form.tsx",
    Component: ReactHookFormLesson,
  },
  {
    id: "03-zod-validation",
    group: "A library",
    title: "One schema, two jobs",
    summary: "The runtime check, the type, and something the server can import, from one file.",
    file: "src/lessons/03_zod_validation.tsx",
    Component: ZodValidation,
  },
  {
    id: "04-accessible-errors",
    group: "Getting it right",
    title: "Errors a screen reader can find",
    summary: "aria-invalid, aria-describedby, a focused summary, and never colour alone.",
    file: "src/lessons/04_accessible_errors.tsx",
    Component: AccessibleErrors,
  },
  {
    id: "05-field-arrays",
    group: "Getting it right",
    title: "Field arrays and async checks",
    summary: "key={field.id}, debounced availability, and why the server still decides.",
    file: "src/lessons/05_field_arrays.tsx",
    Component: FieldArrays,
  },
  {
    id: "06-file-upload",
    group: "Getting it right",
    title: "File upload",
    summary: "An input you cannot control, a FileList that replaces itself, and progress from XHR.",
    file: "src/lessons/06_file_upload.tsx",
    Component: FileUpload,
  },
]);

export function App() {
  return (
    <LessonShell
      title="Forms"
      subtitle="Controlled and uncontrolled, React Hook Form, Zod, accessible errors"
      lessons={lessons}
    />
  );
}
